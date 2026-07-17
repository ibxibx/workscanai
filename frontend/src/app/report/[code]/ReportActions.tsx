'use client'

import { useState, useEffect } from 'react'
import { Download, Share2, Check, FileText, FileJson, Loader2, Linkedin, FileSignature } from 'lucide-react'
import { trackReportShared, trackReportExported, trackWorkflowDownloaded, trackResultViewed, trackReportSharedLinkedin } from '@/lib/analytics'
import { useT, useLocale } from '@/i18n/client'

interface ReportActionsProps {
  workflowId: number
  workflowName: string
  shareUrl: string
  shareCode: string
  isJobScan: boolean
  n8nWorkflowJson?: string
  automationScore: number
  annualSavings: number
  hoursSaved: number
  topTaskResults: Array<{
    taskName: string
    score: number
    recommendation?: string
  }>
}

export default function ReportActions({
  workflowId,
  workflowName,
  shareUrl,
  shareCode,
  isJobScan,
  n8nWorkflowJson,
  automationScore,
  annualSavings,
  hoursSaved,
  topTaskResults,
}: ReportActionsProps) {
  const [copied, setCopied] = useState(false)
  const [liShared, setLiShared] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  // #32 Automation Audit — optional client-ready framing (prepared for / by)
  const [showAudit, setShowAudit] = useState(false)
  const [preparedFor, setPreparedFor] = useState('')
  const [preparedBy, setPreparedBy] = useState('')
  const t = useT('report')
  const locale = useLocale()

  // result_viewed — fires once when a finished public report renders.
  useEffect(() => {
    trackResultViewed({ share_code: shareCode, workflow_id: workflowId, is_job_scan: isJobScan, surface: 'public_report' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleShare = async () => {
    trackReportShared({ share_code: shareCode, workflow_id: workflowId })
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      prompt(t('copyLinkPrompt'), shareUrl)
    }
  }

  // Pre-written caption for the LinkedIn post. The OG image renders automatically
  // from shareUrl in LinkedIn's composer; we copy this text so the user pastes a
  // ready-to-go caption rather than writing one from scratch.
  const buildLinkedinCaption = (): string => {
    const savings = annualSavings.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')
    const topLine = isJobScan ? t('liCapJobscan') : t('liCapWorkflow', { name: workflowName })
    return [
      topLine,
      ``,
      t('liCapResults'),
      `\u2022 ${t('liCapPotential', { score: automationScore })}`,
      `\u2022 ${t('liCapSavings', { savings })}`,
      `\u2022 ${t('liCapHours', { hours: hoursSaved })}`,
      ``,
      t('liCapBreakdown'),
      ``,
      t('liCapCta'),
      shareUrl,
      ``,
      `#automation #AI #productivity #futureofwork`,
    ].join('\n')
  }

  const handleLinkedinShare = async () => {
    trackReportSharedLinkedin({ share_code: shareCode, workflow_id: workflowId })
    const caption = buildLinkedinCaption()
    // Copy the caption first so it's on the clipboard when the composer opens.
    try {
      await navigator.clipboard.writeText(caption)
      setLiShared(true)
      setTimeout(() => setLiShared(false), 4000)
    } catch {
      // Clipboard may be blocked; the composer still opens with the OG preview.
    }
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(liUrl, '_blank', 'noopener,noreferrer,width=600,height=640')
  }

  const downloadReport = async (fmt: 'docx' | 'pdf') => {
    trackReportExported({ format: fmt, share_code: shareCode, workflow_id: workflowId })
    setDownloading(fmt)
    try {
      const params = new URLSearchParams()
      if (preparedFor.trim()) params.set('prepared_for', preparedFor.trim())
      if (preparedBy.trim()) params.set('prepared_by', preparedBy.trim())
      const qs = params.toString()
      const response = await fetch(`/api/reports/${workflowId}/${fmt}${qs ? `?${qs}` : ''}`)
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stem = (preparedFor.trim() || preparedBy.trim())
        ? 'WorkScanAI-Automation-Audit'
        : 'WorkScanAI'
      a.href = url
      a.download = `${stem}-${workflowName.replace(/\s+/g, '-')}.${fmt}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {
      alert(t('genFail', { fmt: fmt.toUpperCase() }))
    } finally {
      setDownloading(null)
    }
  }

  const downloadN8n = async () => {
    trackWorkflowDownloaded({
      share_code: shareCode,
      workflow_id: workflowId,
      source: 'job_scan_canvas',
      format: 'json',
      has_generated_json: !!n8nWorkflowJson,
    })
    setDownloading('n8n')
    // Small delay so the loading state renders before the sync blob work
    await new Promise(r => setTimeout(r, 80))
    try {
      let workflowObj: object
      if (n8nWorkflowJson) {
        try { workflowObj = JSON.parse(n8nWorkflowJson) }
        catch { workflowObj = buildSkeleton() }
      } else {
        workflowObj = buildSkeleton()
      }
      const blob = new Blob([JSON.stringify(workflowObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowName.replace(/[\s/\\:*?"<>|]/g, '_')}_n8n_canvas.json`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {
      alert(t('n8nFail'))
    } finally {
      setDownloading(null)
    }
  }

  function buildSkeleton(): object {
    const nodes = [
      {
        id: 'node_trigger', name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1,
        position: [240, 300],
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } },
      },
      ...topTaskResults.slice(0, 3).map((r, i) => ({
        id: `node_task_${i}`, name: r.taskName,
        type: 'n8n-nodes-base.httpRequest', typeVersion: 3,
        position: [460 + i * 220, 300],
        parameters: { method: 'POST', url: 'https://example.com/webhook' },
      })),
    ]
    return {
      name: `${workflowName} \u2014 WorkScanAI Automation`,
      nodes, connections: {}, active: false,
      settings: { executionOrder: 'v1' },
      id: `workscanai-${workflowId}`,
      meta: { generatedBy: 'WorkScanAI', reportUrl: shareUrl },
    }
  }

  const isAnyDownloading = downloading !== null

  return (
    <div className="mt-[40px] sm:mt-[56px] mb-[48px] sm:mb-[64px]">
      <div className="border-t border-[#e8e8ed] mb-[32px] sm:mb-[40px]" />

      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-[16px] sm:mb-[20px]">
        {t('exportShare')}
      </p>

      {/* #32 Automation Audit — optional client-ready framing for the PDF/DOCX cover */}
      <div className="mb-[18px]">
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="inline-flex items-center gap-[6px] text-[13px] font-medium text-[#0071e3] hover:text-[#0077ed]"
        >
          <FileSignature className="h-[14px] w-[14px] shrink-0" />
          {showAudit ? t('auditHide') : t('auditShow')}
        </button>
        {showAudit && (
          <div className="mt-[12px] grid grid-cols-1 sm:grid-cols-2 gap-[12px] max-w-[560px]">
            <label className="flex flex-col gap-[4px]">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">{t('preparedFor')}</span>
              <input
                type="text"
                value={preparedFor}
                onChange={(e) => setPreparedFor(e.target.value)}
                placeholder={t('preparedForPh')}
                maxLength={120}
                className="px-[12px] py-[9px] rounded-[10px] border border-[#d2d2d7] focus:border-[#0071e3] focus:outline-none text-[14px] text-[#1d1d1f]"
              />
            </label>
            <label className="flex flex-col gap-[4px]">
              <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">{t('preparedBy')}</span>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder={t('preparedByPh')}
                maxLength={120}
                className="px-[12px] py-[9px] rounded-[10px] border border-[#d2d2d7] focus:border-[#0071e3] focus:outline-none text-[14px] text-[#1d1d1f]"
              />
            </label>
            <p className="sm:col-span-2 text-[12px] text-[#86868b] leading-[1.5]">
              {t('auditDesc')}
            </p>
          </div>
        )}
      </div>

      {/* Downloading hint — appears while any download is in progress */}
      {isAnyDownloading && (
        <div className="flex items-center gap-[10px] mb-[18px] px-[16px] py-[12px] bg-[#f0f7ff] border border-[#b8d9ff] rounded-[12px] text-[13px] text-[#0071e3]">
          <Loader2 className="h-[15px] w-[15px] animate-spin shrink-0" />
          <span>
            {downloading === 'docx' && t('genDocx')}
            {downloading === 'pdf'  && t('genPdf')}
            {downloading === 'n8n'  && t('genN8n')}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-[12px]">

        {/* DOCX */}
        <button
          onClick={() => downloadReport('docx')}
          disabled={isAnyDownloading}
          className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bbf] disabled:opacity-60 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md min-w-[180px]"
        >
          {downloading === 'docx'
            ? <><Loader2 className="h-[15px] w-[15px] animate-spin shrink-0" />{t('genDocxBtn')}</>
            : <><FileText className="h-[15px] w-[15px] shrink-0" />{t('dlDocx')}</>
          }
        </button>

        {/* PDF */}
        <button
          onClick={() => downloadReport('pdf')}
          disabled={isAnyDownloading}
          className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bbf] disabled:opacity-60 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md min-w-[180px]"
        >
          {downloading === 'pdf'
            ? <><Loader2 className="h-[15px] w-[15px] animate-spin shrink-0" />{t('genPdfBtn')}</>
            : <><Download className="h-[15px] w-[15px] shrink-0" />{t('dlPdf')}</>
          }
        </button>

        {/* n8n */}
        {isJobScan && (
          <button
            onClick={downloadN8n}
            disabled={isAnyDownloading}
            className="inline-flex items-center justify-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3a3a3c] active:bg-[#000] disabled:opacity-60 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md min-w-[200px]"
          >
            {downloading === 'n8n'
              ? <><Loader2 className="h-[15px] w-[15px] animate-spin shrink-0" />{t('preparing')}</>
              : <><FileJson className="h-[15px] w-[15px] shrink-0" />{t('n8nBtn')}</>
            }
          </button>
        )}

        {/* LinkedIn one-click share — copies a ready caption + opens the composer */}
        <button
          onClick={handleLinkedinShare}
          disabled={isAnyDownloading}
          title={t('liTitle')}
          className="inline-flex items-center justify-center gap-[8px] bg-[#0a66c2] hover:bg-[#0958a8] active:bg-[#074a8f] disabled:opacity-60 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md w-full sm:w-auto sm:min-w-[200px]"
        >
          {liShared
            ? <><Check className="h-[15px] w-[15px] shrink-0" /><span>{t('liCopied')}</span></>
            : <><Linkedin className="h-[15px] w-[15px] shrink-0" /><span>{t('liShare')}</span></>
          }
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={isAnyDownloading}
          className="inline-flex items-center justify-center gap-[8px] border border-[#d2d2d7] hover:border-[#0071e3] hover:bg-[#f0f7ff] active:bg-[#e5f0ff] disabled:opacity-60 disabled:cursor-not-allowed px-[24px] py-[13px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all"
        >
          {copied
            ? <><Check className="h-[15px] w-[15px] text-green-600 shrink-0" /><span className="text-green-600">{t('linkCopied')}</span></>
            : <><Share2 className="h-[15px] w-[15px] shrink-0" /><span>{t('shareReport')}</span></>
          }
        </button>

      </div>
    </div>
  )
}
