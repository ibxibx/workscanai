'use client'

import Link from 'next/link'
import { Sparkles, Clock, Plus, TrendingUp, DollarSign, Zap, Download, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useT, useLocale } from '@/i18n/client'
import { wakeBackend, fetchWithWake } from '@/lib/wake-ping'
import BackendWarming from '@/components/BackendWarming'

// ── Local storage key — kept as a fallback cache for speed ───────────────────
const MY_WORKFLOWS_KEY = 'workscan_my_workflow_ids'

export function saveMyWorkflowId(id: number) {
  try {
    const existing: number[] = JSON.parse(localStorage.getItem(MY_WORKFLOWS_KEY) || '[]')
    if (!existing.includes(id)) {
      existing.push(id)
      localStorage.setItem(MY_WORKFLOWS_KEY, JSON.stringify(existing))
    }
  } catch {}
}

function getLocalWorkflowIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(MY_WORKFLOWS_KEY) || '[]')
  } catch { return [] }
}

// analysisState distinguishes the three cases that used to all show "No analysis":
//   'ready'      — analysis exists and its score loaded (green badge, clickable)
//   'none'       — backend confirmed no analysis exists (404 / 200 with null score)
//   'unreachable'— score fetch failed or was blocked (network/5xx/403); the
//                  analysis likely EXISTS but we couldn't load it here → offer refresh
interface WorkflowSummary {
  id: number
  name: string
  description: string | null
  created_at: string
  automation_score: number | null
  hours_saved: number | null
  annual_savings: number | null
  task_count: number
  analysisState: 'ready' | 'none' | 'unreachable'
  // When the private results endpoint is forbidden (workflow owned by another
  // account) but a public share code exists, we render via /report/{shareCode}.
  shareCode: string | null
  // Where the card should navigate when opened (private results page normally,
  // public report page when recovered via share code). null = not openable.
  href: string | null
}

// Load one workflow's summary and classify its analysis state. Shared by the
// initial dashboard fan-out and the per-card "refresh" action so both agree on
// what "no analysis" actually means.
async function enrichWorkflow(
  id: number,
  email: string | null,
  onWarming?: (w: boolean) => void,
): Promise<WorkflowSummary | null> {
  const resultHeaders: Record<string, string> = {}
  if (email) resultHeaders['x-user-email'] = email

  try {
    const aRes = await fetchWithWake(`/api/results/${id}`, { headers: resultHeaders, onWarming })

    if (aRes.ok) {
      const aData = await aRes.json()
      const hasScore = aData.automation_score !== null && aData.automation_score !== undefined
      return {
        id,
        name: aData.workflow?.name ?? `Workflow ${id}`,
        description: aData.workflow?.description ?? null,
        created_at: aData.workflow?.created_at ?? new Date().toISOString(),
        automation_score: hasScore ? aData.automation_score : null,
        hours_saved: aData.hours_saved ?? null,
        annual_savings: aData.annual_savings ?? null,
        task_count: aData.workflow?.tasks?.length ?? 0,
        // 200 with a score → ready; 200 with null score → genuinely un-analyzed
        analysisState: hasScore ? 'ready' : 'none',
        shareCode: aData.workflow?.share_code ?? null,
        href: hasScore ? `/dashboard/results/${id}` : null,
      }
    }

    // 404 → the analysis truly doesn't exist. Anything else (403 ownership,
    // 5xx, etc.) means it likely DOES exist but we couldn't load it here.
    const trulyMissing = aRes.status === 404

    // Fetch the workflow's own metadata (public) for name + share code.
    const wfRes = await fetchWithWake(`/api/workflows/${id}`, { onWarming })
    const wf = wfRes.ok ? await wfRes.json() : null
    const shareCode: string | null = wf?.share_code ?? null

    // Recovery path: a 403 means the private results endpoint is owned by
    // another account, but the analysis is usually still public via its share
    // code. Pull the real score from the public share endpoint and present it
    // as a normal, fully-working card that opens the public report.
    if (!trulyMissing && shareCode) {
      try {
        const sRes = await fetchWithWake(`/api/share/${shareCode}`, { onWarming })
        if (sRes.ok) {
          const sData = await sRes.json()
          const hasScore = sData.automation_score !== null && sData.automation_score !== undefined
          if (hasScore) {
            return {
              id,
              name: sData.workflow?.name ?? wf?.name ?? `Workflow ${id}`,
              description: sData.workflow?.description ?? wf?.description ?? null,
              created_at: sData.workflow?.created_at ?? wf?.created_at ?? new Date().toISOString(),
              automation_score: sData.automation_score,
              hours_saved: sData.hours_saved ?? null,
              annual_savings: sData.annual_savings ?? null,
              task_count: sData.workflow?.tasks?.length ?? wf?.tasks?.length ?? 0,
              analysisState: 'ready',
              shareCode,
              href: `/report/${shareCode}`,
            }
          }
        }
      } catch { /* fall through to unreachable */ }
    }

    // Have metadata but couldn't recover a score → refreshable card.
    if (wf) {
      return {
        id,
        name: wf.name ?? `Workflow ${id}`,
        description: wf.description ?? null,
        created_at: wf.created_at ?? new Date().toISOString(),
        automation_score: null,
        hours_saved: null,
        annual_savings: null,
        task_count: wf.tasks?.length ?? 0,
        analysisState: trulyMissing ? 'none' : 'unreachable',
        shareCode,
        href: trulyMissing
          ? null
          : (shareCode ? `/report/${shareCode}` : `/dashboard/results/${id}`),
      }
    }

    // Couldn't load metadata either. Still surface the card so the user isn't
    // left thinking the analysis vanished — mark it refreshable.
    return {
      id,
      name: `Workflow ${id}`,
      description: null,
      created_at: new Date().toISOString(),
      automation_score: null,
      hours_saved: null,
      annual_savings: null,
      task_count: 0,
      analysisState: trulyMissing ? 'none' : 'unreachable',
      shareCode,
      href: trulyMissing
        ? null
        : (shareCode ? `/report/${shareCode}` : `/dashboard/results/${id}`),
    }
  } catch {
    // Network error / retries exhausted → unreachable, not "no analysis".
    return {
      id,
      name: `Workflow ${id}`,
      description: null,
      created_at: new Date().toISOString(),
      automation_score: null,
      hours_saved: null,
      annual_savings: null,
      task_count: 0,
      analysisState: 'unreachable',
      shareCode: null,
      href: `/dashboard/results/${id}`,
    }
  }
}

export default function DashboardPage() {
  const { email, isLoaded } = useAuth()
  const t = useT('dashboard')
  const locale = useLocale()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [warming, setWarming] = useState(false)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [downloadingCombined, setDownloadingCombined] = useState<'docx' | 'pdf' | null>(null)

  useEffect(() => {
    if (!isLoaded) return  // wait for auth to hydrate from localStorage

    const fetchWorkflows = async () => {
      try {
        // Pre-warm the Render free-tier box before firing the fan-out of
        // per-workflow requests. Without this, a cold backend makes every
        // enrichment call fail and each workflow falsely renders "No analysis".
        await wakeBackend().catch(() => {})

        let ids: number[] = []

        if (email) {
          // ── Primary: fetch all workflows from the account via email ──────
          const accountRes = await fetchWithWake('/api/workflows', {
            headers: { 'x-user-email': email },
            onWarming: setWarming,
          })
          if (accountRes.ok) {
            try {
              const accountWorkflows: Array<{ id: number }> = await accountRes.json()
              ids = accountWorkflows.map(w => w.id)
              // Sync back to localStorage so it stays up to date
              ids.forEach(id => saveMyWorkflowId(id))
            } catch { /* non-JSON response — skip */ }
          }
        }

        // ── Fallback / merge: also include any IDs in localStorage ─────────
        // (covers analyses submitted before sign-in on this device)
        const localIds = getLocalWorkflowIds()
        const mergedIds = Array.from(new Set([...ids, ...localIds]))

        if (mergedIds.length === 0) {
          setWorkflows([])
          setLoading(false)
          return
        }

        // Enrich each ID with analysis data (shared classifier)
        const enriched: WorkflowSummary[] = (
          await Promise.all(mergedIds.map((id) => enrichWorkflow(id, email, setWarming)))
        ).filter(Boolean) as WorkflowSummary[]

        enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setWorkflows(enriched)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()
  }, [email, isLoaded])

  // Re-fetch a single card that couldn't load its analysis (cold backend,
  // ownership blip, transient 5xx). Wakes the box first, then re-classifies.
  const refreshCard = async (id: number) => {
    if (refreshingId !== null) return
    setRefreshingId(id)
    try {
      await wakeBackend().catch(() => {})
      const fresh = await enrichWorkflow(id, email, setWarming)
      if (fresh) {
        setWorkflows(prev => {
          const next = prev.map(w => (w.id === id ? fresh : w))
          next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          return next
        })
      }
    } finally {
      setRefreshingId(null)
    }
  }

  const analyzed = workflows.filter(w => w.analysisState === 'ready')
  const pendingCount = workflows.filter(w => w.analysisState === 'none').length
  const unreachableCount = workflows.filter(w => w.analysisState === 'unreachable').length
  const totalHours = analyzed.reduce((sum, w) => sum + (w.hours_saved ?? 0), 0)
  const avgScore =
    analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, w) => sum + (w.automation_score ?? 0), 0) / analyzed.length)
      : null
  const totalSavings = analyzed.reduce((sum, w) => sum + (w.annual_savings ?? 0), 0)

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-500'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 75) return 'bg-green-100 text-green-700 border-green-200'
    if (score >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const downloadCombined = async (format: 'docx' | 'pdf') => {
    const ids = analyzed.map(w => w.id)
    if (ids.length < 2) return
    setDownloadingCombined(format)
    try {
      const res = await fetch(`/api/reports/combined/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_ids: ids }),
      })
      if (!res.ok) throw new Error('Failed to generate report')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI_Combined_Report.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(t('alertCombinedFail'))
    } finally {
      setDownloadingCombined(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <BackendWarming show={warming} />
      <div className="max-w-[980px] mx-auto px-6">

        {/* Header */}
        <div className="mb-[48px]">
          <h1 className="text-[32px] sm:text-[48px] leading-[1.08] font-semibold italic tracking-tight mb-[8px]">
            Dashboard
          </h1>
          <p className="text-[15px] sm:text-[19px] italic text-[#6e6e73]">
            <span className="hidden sm:inline">{t('subtitle')}</span>
            <span className="sm:hidden">{t('subtitleShort')}</span>
          </p>
        </div>

        {/* Sign-in banner — shown when not logged in */}
        {isLoaded && !email && (
          <div className="bg-amber-50 border border-amber-200 rounded-[18px] p-[20px] sm:p-[24px] mb-[32px] flex items-center justify-between gap-[16px]">
            <div className="min-w-0">
              <div className="text-[13px] sm:text-[14px] font-semibold text-amber-800 mb-[2px]">{t('signInTitle')}</div>
              <div className="text-[13px] text-amber-700 hidden sm:block">{t('signInDesc')}</div>
              <div className="text-[12px] text-amber-700 sm:hidden">{t('signInDescShort')}</div>
            </div>
            <Link href="/auth" className="shrink-0 inline-flex items-center gap-[8px] bg-amber-600 hover:bg-amber-700 text-white px-[16px] sm:px-[20px] py-[10px] rounded-full text-[13px] sm:text-[14px] font-semibold transition-all">
              {t('signIn')}
            </Link>
          </div>
        )}

        {/* New Analysis CTA */}
        <Link href="/#analyze" className="block group mb-[32px]">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-[18px] p-[40px] hover-lift hover-glow transition-all">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-[8px] mb-[12px]">
                  <Sparkles className="h-[20px] w-[20px] text-[#0071e3]" />
                  <span className="text-[12px] font-semibold text-[#0071e3] tracking-wide uppercase">
                    {t('startNew')}
                  </span>
                </div>
                <h2 className="text-[20px] sm:text-[28px] font-semibold italic tracking-tight mb-[8px]">
                  {t('analyzeWorkflow')}
                </h2>
                <p className="text-[13px] sm:text-[15px] text-[#6e6e73] max-w-[600px]">
                  {t('analyzeWorkflowDesc')}
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-[56px] h-[56px] rounded-full bg-white/60 group-hover:bg-white transition-all border border-blue-100">
                <Plus className="h-[24px] w-[24px] text-[#1d1d1f]" />
              </div>
            </div>
          </div>
        </Link>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px] hover-lift hover-stat cursor-default">
            <div className="flex items-center gap-[8px] mb-[12px]">
              <TrendingUp className="h-[16px] w-[16px] text-[#86868b]" />
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase">
                {t('totalAnalyses')}
              </div>
            </div>
            {loading ? (
              <div className="h-[48px] w-[60px] bg-[#e8e8ed] rounded-[8px] animate-pulse mb-[4px]" />
            ) : (
              <div className="stat-number text-[32px] sm:text-[40px] font-semibold tracking-tight mb-[4px]">{analyzed.length}</div>
            )}
            <div className="text-[13px] text-[#86868b]">
              {unreachableCount > 0
                ? t('toReload', { n: unreachableCount })
                : pendingCount > 0
                  ? t('pendingAnalysis', { n: pendingCount })
                  : t('allAnalyzed')}
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px] hover-lift hover-stat cursor-default">
            <div className="flex items-center gap-[8px] mb-[12px]">
              <Clock className="h-[16px] w-[16px] text-[#86868b]" />
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase">
                {t('timeSaved')}
              </div>
            </div>
            {loading ? (
              <div className="h-[48px] w-[80px] bg-[#e8e8ed] rounded-[8px] animate-pulse mb-[4px]" />
            ) : (
              <div className="stat-number text-[32px] sm:text-[40px] font-semibold tracking-tight mb-[4px]">
                <span className="text-green-600">{Math.round(totalHours)}</span>
                <span className="text-[20px] sm:text-[24px] text-[#86868b]"> {t('hrs')}</span>
              </div>
            )}
            <div className="text-[13px] text-[#86868b]">{t('hrsSubtitle')}</div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px] hover-lift hover-stat cursor-default">
            <div className="flex items-center gap-[8px] mb-[12px]">
              <Zap className="h-[16px] w-[16px] text-[#86868b]" />
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase">
                {t('avgScore')}
              </div>
            </div>
            {loading ? (
              <div className="h-[48px] w-[80px] bg-[#e8e8ed] rounded-[8px] animate-pulse mb-[4px]" />
            ) : (
              <div className="stat-number text-[32px] sm:text-[40px] font-semibold tracking-tight mb-[4px]">
                {avgScore !== null ? (
                  <span className={getScoreColor(avgScore)}>{avgScore}%</span>
                ) : (
                  <span className="text-[#86868b]">—</span>
                )}
              </div>
            )}
            <div className="text-[13px] text-[#86868b]">{t('avgSubtitle')}</div>
          </div>
        </div>

        {/* Annual Savings Banner — only show if there's data */}
        {!loading && totalSavings > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-[18px] p-[32px] mb-[48px] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-[8px] mb-[6px]">
                <DollarSign className="h-[18px] w-[18px] text-green-600" />
                <span className="text-[13px] font-semibold text-green-700 uppercase tracking-wide">{t('totalSavings')}</span>
              </div>
              <div className="text-[36px] font-semibold text-green-700 tracking-tight">
                €{Math.round(totalSavings).toLocaleString()}
              </div>
            </div>
            <div className="text-[13px] text-green-600 text-right max-w-[200px]">
              {t('savingsSubtitle')}
            </div>
          </div>
        )}

        {/* Combined report download — only show when 2+ analyses exist */}
        {!loading && analyzed.length >= 2 && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[28px] mb-[48px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
              <div>
                <div className="text-[15px] font-semibold text-[#1d1d1f] mb-[4px]">
                  {t('combinedTitle', { n: analyzed.length })}
                </div>
                <div className="text-[13px] text-[#6e6e73]">
                  {t('combinedDesc')}
                </div>
              </div>
              <div className="flex gap-[10px] shrink-0">
                <button
                  onClick={() => downloadCombined('docx')}
                  disabled={downloadingCombined !== null}
                  className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3d3d3f] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[20px] py-[10px] rounded-full text-[14px] font-medium transition-all"
                >
                  {downloadingCombined === 'docx'
                    ? <><Loader2 className="h-[14px] w-[14px] animate-spin" /> {t('generating')}</>
                    : <><Download className="h-[14px] w-[14px]" /> DOCX</>}
                </button>
                <button
                  onClick={() => downloadCombined('pdf')}
                  disabled={downloadingCombined !== null}
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[20px] py-[10px] rounded-full text-[14px] font-medium transition-all"
                >
                  {downloadingCombined === 'pdf'
                    ? <><Loader2 className="h-[14px] w-[14px] animate-spin" /> {t('generating')}</>
                    : <><Download className="h-[14px] w-[14px]" /> PDF</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        <div>
          <div className="flex items-center justify-between mb-[24px]">
            <h2 className="text-[22px] sm:text-[28px] font-semibold italic tracking-tight">{t('recentAnalyses')}</h2>
          </div>

          {loading ? (
            <div className="space-y-[16px]">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] animate-pulse">
                  <div className="h-[22px] w-[200px] bg-[#e8e8ed] rounded mb-[12px]" />
                  <div className="h-[16px] w-[300px] bg-[#e8e8ed] rounded" />
                </div>
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[48px] text-center">
              <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white border border-[#d2d2d7] mb-[20px]">
                <Clock className="h-[28px] w-[28px] text-[#86868b]" />
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px]">{t('noAnalysesYet')}</h3>
              <p className="text-[15px] text-[#6e6e73] mb-[24px] max-w-[400px] mx-auto">
                {email ? t('noAnalysesEmail') : t('noAnalysesGuest')}
              </p>
              <div className="flex flex-wrap justify-center gap-[12px]">
                <Link
                  href="/#analyze"
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
                >
                  <Plus className="h-[16px] w-[16px]" />
                  {t('createAnalysis')}
                </Link>
                {!email && (
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] text-[#1d1d1f] px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
                  >
                    {t('signIn')}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-[16px]">
              {workflows.map((wf) => {
                // A card is openable if its analysis is ready OR merely
                // unreachable-from-here (it likely exists; the results page has
                // its own cold-start retry, so let the user through).
                const openable = wf.analysisState === 'ready' || wf.analysisState === 'unreachable'
                const isRefreshing = refreshingId === wf.id

                const cardInner = (
                  <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] hover-lift hover-glow transition-all">
                    <div className="flex items-start justify-between gap-[16px]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[12px] mb-[8px]">
                          <h3 className={`text-[19px] font-semibold italic text-[#1d1d1f] truncate transition-colors ${openable ? 'group-hover:text-[#0071e3]' : ''}`}>
                            {wf.name}
                          </h3>
                          {wf.analysisState === 'none' && (
                            <span className="shrink-0 px-[10px] py-[4px] bg-[#e8e8ed] text-[#86868b] text-[12px] font-semibold rounded-full border border-[#d2d2d7]">
                              {t('cardNoAnalysis')}
                            </span>
                          )}
                          {wf.analysisState === 'unreachable' && (
                            <span className="shrink-0 inline-flex items-center gap-[5px] px-[10px] py-[4px] bg-amber-50 text-amber-700 text-[12px] font-semibold rounded-full border border-amber-200">
                              <RefreshCw className={`h-[11px] w-[11px] ${isRefreshing ? 'animate-spin' : ''}`} />
                              {isRefreshing ? t('cardLoading') : t('cardTapOpen')}
                            </span>
                          )}
                        </div>
                        {wf.description && (
                          <p className="text-[14px] text-[#6e6e73] mb-[12px] truncate">{wf.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-[16px] text-[13px] text-[#86868b]">
                          <span>{wf.task_count === 1 ? t('taskOne', { n: wf.task_count }) : t('tasksMany', { n: wf.task_count })}</span>
                          <span>·</span>
                          <span>{new Date(wf.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {wf.hours_saved !== null && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">{t('hrsSaved', { n: Math.round(wf.hours_saved) })}</span>
                            </>
                          )}
                          {wf.annual_savings !== null && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">{t('savedAmount', { amount: Math.round(wf.annual_savings).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US') })}</span>
                            </>
                          )}
                        </div>

                        {/* Refresh affordance for cards we couldn't classify */}
                        {wf.analysisState === 'unreachable' && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); refreshCard(wf.id) }}
                            disabled={isRefreshing}
                            className="mt-[14px] inline-flex items-center gap-[7px] text-[13px] font-semibold text-[#0071e3] hover:text-[#0077ed] disabled:text-[#86868b] transition-colors"
                          >
                            <RefreshCw className={`h-[13px] w-[13px] ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? t('checkingServer') : t('clickRefresh')}
                          </button>
                        )}
                      </div>

                      {wf.analysisState === 'ready' && wf.automation_score !== null && (
                        <div className="shrink-0 text-right">
                          <div className={`inline-flex items-center px-[14px] py-[8px] rounded-full border text-[15px] font-semibold ${getScoreBadge(wf.automation_score)}`}>
                            {Math.round(wf.automation_score)}%
                          </div>
                          <div className="text-[11px] text-[#86868b] mt-[4px]">{t('automationReady')}</div>
                        </div>
                      )}

                      {wf.analysisState === 'unreachable' && (
                        <div className="shrink-0 text-right">
                          <div className="inline-flex items-center px-[14px] py-[8px] rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-[13px] font-semibold">
                            {t('viewArrow')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )

                return openable && wf.href ? (
                  <Link
                    key={wf.id}
                    href={wf.href}
                    className="block group cursor-pointer"
                  >
                    {cardInner}
                  </Link>
                ) : (
                  <div key={wf.id} className="block cursor-default">
                    {cardInner}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
