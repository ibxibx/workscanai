'use client'

import Link from 'next/link'
import { Sparkles, Clock, Plus, TrendingUp, DollarSign, Zap, Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

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

interface WorkflowSummary {
  id: number
  name: string
  description: string | null
  created_at: string
  automation_score: number | null
  hours_saved: number | null
  annual_savings: number | null
  task_count: number
}

export default function DashboardPage() {
  const { email, isLoaded } = useAuth()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingCombined, setDownloadingCombined] = useState<'docx' | 'pdf' | null>(null)

  useEffect(() => {
    if (!isLoaded) return  // wait for auth to hydrate from localStorage

    const fetchWorkflows = async () => {
      try {
        let ids: number[] = []

        if (email) {
          // ── Primary: fetch all workflows from the account via email ──────
          const accountRes = await fetch('/api/workflows', {
            headers: { 'x-user-email': email },
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

        // Enrich each ID with analysis data
        const enriched: WorkflowSummary[] = (
          await Promise.all(
            mergedIds.map(async (id) => {
              try {
                const aRes = await fetch(`/api/results/${id}`)
                if (aRes.ok) {
                  const aData = await aRes.json()
                  return {
                    id,
                    name: aData.workflow?.name ?? `Workflow ${id}`,
                    description: aData.workflow?.description ?? null,
                    created_at: aData.workflow?.created_at ?? new Date().toISOString(),
                    automation_score: aData.automation_score,
                    hours_saved: aData.hours_saved,
                    annual_savings: aData.annual_savings,
                    task_count: aData.workflow?.tasks?.length ?? 0,
                  }
                }
                const wfRes = await fetch(`/api/workflows/${id}`)
                if (wfRes.ok) {
                  const wf = await wfRes.json()
                  return {
                    id,
                    name: wf.name,
                    description: wf.description ?? null,
                    created_at: wf.created_at,
                    automation_score: null,
                    hours_saved: null,
                    annual_savings: null,
                    task_count: wf.tasks?.length ?? 0,
                  }
                }
              } catch {}
              return null
            })
          )
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

  const analyzed = workflows.filter(w => w.automation_score !== null)
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
      alert('Failed to generate combined report. Please try again.')
    } finally {
      setDownloadingCombined(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">

        {/* Header */}
        <div className="mb-[48px]">
          <h1 className="text-[32px] sm:text-[48px] leading-[1.08] font-semibold italic tracking-tight mb-[8px]">
            Dashboard
          </h1>
          <p className="text-[15px] sm:text-[19px] italic text-[#6e6e73]">
            Your workflow analyses and automation insights.
          </p>
        </div>

        {/* Sign-in banner — shown when not logged in */}
        {isLoaded && !email && (
          <div className="bg-amber-50 border border-amber-200 rounded-[18px] p-[24px] mb-[32px] flex items-center justify-between gap-[16px]">
            <div>
              <div className="text-[14px] font-semibold text-amber-800 mb-[2px]">Sign in to see all your analyses</div>
              <div className="text-[13px] text-amber-700">Analyses are tied to your account — sign in to access them on any device.</div>
            </div>
            <Link href="/auth" className="shrink-0 inline-flex items-center gap-[8px] bg-amber-600 hover:bg-amber-700 text-white px-[20px] py-[10px] rounded-full text-[14px] font-semibold transition-all">
              Sign in
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
                    Start New
                  </span>
                </div>
                <h2 className="text-[20px] sm:text-[28px] font-semibold italic tracking-tight mb-[8px]">
                  Analyze a Workflow
                </h2>
                <p className="text-[13px] sm:text-[15px] text-[#6e6e73] max-w-[600px]">
                  Upload a document, record your voice, or enter tasks manually to discover automation opportunities and calculate ROI.
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
                Total Analyses
              </div>
            </div>
            {loading ? (
              <div className="h-[48px] w-[60px] bg-[#e8e8ed] rounded-[8px] animate-pulse mb-[4px]" />
            ) : (
              <div className="stat-number text-[32px] sm:text-[40px] font-semibold tracking-tight mb-[4px]">{analyzed.length}</div>
            )}
            <div className="text-[13px] text-[#86868b]">
              {workflows.length - analyzed.length > 0
                ? `${workflows.length - analyzed.length} pending analysis`
                : 'All workflows analyzed'}
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px] hover-lift hover-stat cursor-default">
            <div className="flex items-center gap-[8px] mb-[12px]">
              <Clock className="h-[16px] w-[16px] text-[#86868b]" />
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase">
                Time Saved
              </div>
            </div>
            {loading ? (
              <div className="h-[48px] w-[80px] bg-[#e8e8ed] rounded-[8px] animate-pulse mb-[4px]" />
            ) : (
              <div className="stat-number text-[32px] sm:text-[40px] font-semibold tracking-tight mb-[4px]">
                <span className="text-green-600">{Math.round(totalHours)}</span>
                <span className="text-[20px] sm:text-[24px] text-[#86868b]"> hrs</span>
              </div>
            )}
            <div className="text-[13px] text-[#86868b]">Annual hours saved across workflows</div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px] hover-lift hover-stat cursor-default">
            <div className="flex items-center gap-[8px] mb-[12px]">
              <Zap className="h-[16px] w-[16px] text-[#86868b]" />
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase">
                Avg Score
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
            <div className="text-[13px] text-[#86868b]">Average automation readiness</div>
          </div>
        </div>

        {/* Annual Savings Banner — only show if there's data */}
        {!loading && totalSavings > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-[18px] p-[32px] mb-[48px] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-[8px] mb-[6px]">
                <DollarSign className="h-[18px] w-[18px] text-green-600" />
                <span className="text-[13px] font-semibold text-green-700 uppercase tracking-wide">Total Potential Savings</span>
              </div>
              <div className="text-[36px] font-semibold text-green-700 tracking-tight">
                €{Math.round(totalSavings).toLocaleString()}
              </div>
            </div>
            <div className="text-[13px] text-green-600 text-right max-w-[200px]">
              Annual cost reduction across your analyzed workflows
            </div>
          </div>
        )}

        {/* Combined report download — only show when 2+ analyses exist */}
        {!loading && analyzed.length >= 2 && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[28px] mb-[48px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
              <div>
                <div className="text-[15px] font-semibold text-[#1d1d1f] mb-[4px]">
                  Download all {analyzed.length} analyses as one report
                </div>
                <div className="text-[13px] text-[#6e6e73]">
                  Combined document with every workflow, task breakdown, and roadmap in one file.
                </div>
              </div>
              <div className="flex gap-[10px] shrink-0">
                <button
                  onClick={() => downloadCombined('docx')}
                  disabled={downloadingCombined !== null}
                  className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3d3d3f] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[20px] py-[10px] rounded-full text-[14px] font-medium transition-all"
                >
                  {downloadingCombined === 'docx'
                    ? <><Loader2 className="h-[14px] w-[14px] animate-spin" /> Generating…</>
                    : <><Download className="h-[14px] w-[14px]" /> DOCX</>}
                </button>
                <button
                  onClick={() => downloadCombined('pdf')}
                  disabled={downloadingCombined !== null}
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[20px] py-[10px] rounded-full text-[14px] font-medium transition-all"
                >
                  {downloadingCombined === 'pdf'
                    ? <><Loader2 className="h-[14px] w-[14px] animate-spin" /> Generating…</>
                    : <><Download className="h-[14px] w-[14px]" /> PDF</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        <div>
          <div className="flex items-center justify-between mb-[24px]">
            <h2 className="text-[22px] sm:text-[28px] font-semibold italic tracking-tight">Recent Analyses</h2>
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
              <h3 className="text-[19px] font-semibold italic mb-[8px]">No analyses yet</h3>
              <p className="text-[15px] text-[#6e6e73] mb-[24px] max-w-[400px] mx-auto">
                {email
                  ? 'Create your first workflow analysis to unlock automation insights and ROI calculations.'
                  : 'Sign in to see all your analyses across devices, or create a new one below.'}
              </p>
              <div className="flex flex-wrap justify-center gap-[12px]">
                <Link
                  href="/#analyze"
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
                >
                  <Plus className="h-[16px] w-[16px]" />
                  Create analysis
                </Link>
                {!email && (
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] text-[#1d1d1f] px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-[16px]">
              {workflows.map((wf) => (
                <Link
                  key={wf.id}
                  href={wf.automation_score !== null ? `/dashboard/results/${wf.id}` : '#'}
                  className={`block group ${wf.automation_score !== null ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] hover-lift hover-glow transition-all">
                    <div className="flex items-start justify-between gap-[16px]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[12px] mb-[8px]">
                          <h3 className="text-[19px] font-semibold italic text-[#1d1d1f] truncate group-hover:text-[#0071e3] transition-colors">
                            {wf.name}
                          </h3>
                          {wf.automation_score === null && (
                            <span className="shrink-0 px-[10px] py-[4px] bg-[#e8e8ed] text-[#86868b] text-[12px] font-semibold rounded-full border border-[#d2d2d7]">
                              No analysis
                            </span>
                          )}
                        </div>
                        {wf.description && (
                          <p className="text-[14px] text-[#6e6e73] mb-[12px] truncate">{wf.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-[16px] text-[13px] text-[#86868b]">
                          <span>{wf.task_count} task{wf.task_count !== 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span>{new Date(wf.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {wf.hours_saved !== null && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">{Math.round(wf.hours_saved)} hrs/yr saved</span>
                            </>
                          )}
                          {wf.annual_savings !== null && (
                            <>
                              <span>·</span>
                              <span className="text-green-600 font-medium">€{Math.round(wf.annual_savings).toLocaleString()} saved</span>
                            </>
                          )}
                        </div>
                      </div>

                      {wf.automation_score !== null && (
                        <div className="shrink-0 text-right">
                          <div className={`inline-flex items-center px-[14px] py-[8px] rounded-full border text-[15px] font-semibold ${getScoreBadge(wf.automation_score)}`}>
                            {Math.round(wf.automation_score)}%
                          </div>
                          <div className="text-[11px] text-[#86868b] mt-[4px]">automation ready</div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
