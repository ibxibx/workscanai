'use client'

import { useState } from 'react'
import { Download, Share2, Check, FileText, FileJson } from 'lucide-react'

interface ReportActionsProps {
  workflowId: number
  workflowName: string
  shareUrl: string
  shareCode: string
  isJobScan: boolean
  n8nWorkflowJson?: string
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
  isJobScan,
  n8nWorkflowJson,
  topTaskResults,
}: ReportActionsProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      prompt('Copy this link:', shareUrl)
    }
  }

  const downloadReport = async (fmt: 'docx' | 'pdf') => {
    setDownloading(fmt)
    try {
      const response = await fetch(`/api/reports/${workflowId}/${fmt}`)
      if (!response.ok) throw new Error('Failed to generate report')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI-${workflowName.replace(/\s+/g, '-')}.${fmt}`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch {
      alert(`Failed to generate ${fmt.toUpperCase()} report.`)
    } finally {
      setDownloading(null)
    }
  }

  const downloadN8n = () => {
    let workflowObj: object

    if (n8nWorkflowJson) {
      try {
        workflowObj = JSON.parse(n8nWorkflowJson)
      } catch {
        // JSON parse failed — fall through to skeleton
        workflowObj = buildSkeleton()
      }
    } else {
      workflowObj = buildSkeleton()
    }

    try {
      const blob = new Blob([JSON.stringify(workflowObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowName.replace(/[\s/\\:*?"<>|]/g, '_')}_n8n_canvas.json`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to generate n8n workflow file. Please try again.')
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
      nodes,
      connections: {},
      active: false,
      settings: { executionOrder: 'v1' },
      id: `workscanai-${workflowId}`,
      meta: { generatedBy: 'WorkScanAI', reportUrl: shareUrl },
    }
  }

  return (
    <div className="mt-[40px] sm:mt-[56px] mb-[48px] sm:mb-[64px]">
      {/* Divider */}
      <div className="border-t border-[#e8e8ed] mb-[32px] sm:mb-[40px]" />

      {/* Label */}
      <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-[16px] sm:mb-[20px]">
        Export &amp; Share
      </p>

      {/* Button row — wraps cleanly on mobile, each button full-width on xs */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-[12px]">

        <button
          onClick={() => downloadReport('docx')}
          disabled={downloading === 'docx'}
          className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bbf] disabled:opacity-50 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md"
        >
          <FileText className="h-[15px] w-[15px] shrink-0" />
          {downloading === 'docx' ? 'Generating…' : 'Download DOCX'}
        </button>

        <button
          onClick={() => downloadReport('pdf')}
          disabled={downloading === 'pdf'}
          className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#005bbf] disabled:opacity-50 disabled:cursor-not-allowed text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md"
        >
          <Download className="h-[15px] w-[15px] shrink-0" />
          {downloading === 'pdf' ? 'Generating…' : 'Download PDF'}
        </button>

        {isJobScan && (
          <button
            onClick={downloadN8n}
            className="inline-flex items-center justify-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3a3a3c] active:bg-[#000] text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md"
          >
            <FileJson className="h-[15px] w-[15px] shrink-0" />
            n8n Workflow .json
          </button>
        )}

        <button
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-[8px] border border-[#d2d2d7] hover:border-[#0071e3] hover:bg-[#f0f7ff] active:bg-[#e5f0ff] px-[24px] py-[13px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all"
        >
          {copied
            ? <><Check className="h-[15px] w-[15px] text-green-600 shrink-0" /><span className="text-green-600">Link copied!</span></>
            : <><Share2 className="h-[15px] w-[15px] shrink-0" /><span>Share Report</span></>
          }
        </button>

      </div>
    </div>
  )
}
