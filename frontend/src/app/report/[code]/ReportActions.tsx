'use client'

import { useState } from 'react'
import { Download, Share2, Check } from 'lucide-react'

interface ReportActionsProps {
  workflowId: number
  workflowName: string
  shareUrl: string
  shareCode: string
  isJobScan: boolean
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
  topTaskResults,
}: ReportActionsProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert(`Failed to generate ${fmt.toUpperCase()} report.`)
    } finally {
      setDownloading(null)
    }
  }

  const downloadN8n = () => {
    const nodes = [
      {
        id: 'node_trigger', name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1,
        position: [240, 300],
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } },
      },
      ...topTaskResults.slice(0, 3).map((r, i) => ({
        id: `node_task_${i}`,
        name: r.taskName,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [460 + i * 220, 300],
        parameters: { method: 'POST', url: 'https://example.com/webhook' },
        notes: r.recommendation?.slice(0, 200) || '',
      })),
    ]
    const workflow = {
      name: `${workflowName} — WorkScanAI Automation`,
      nodes,
      connections: {
        'Schedule Trigger': {
          main: [[{ node: topTaskResults[0]?.taskName || 'Task 1', type: 'main', index: 0 }]],
        },
      },
      active: false,
      settings: { executionOrder: 'v1' },
      id: `workscanai-${workflowId}`,
      meta: { generatedBy: 'WorkScanAI', reportUrl: shareUrl },
    }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflowName.replace(/\s+/g, '_')}_n8n_workflow.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-[10px] mt-[24px] sm:mt-[32px]">
      <button
        onClick={() => downloadReport('docx')}
        disabled={downloading === 'docx'}
        className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all"
      >
        <Download className="h-[15px] w-[15px]" />
        {downloading === 'docx' ? 'Generating…' : 'Download DOCX'}
      </button>

      <button
        onClick={() => downloadReport('pdf')}
        disabled={downloading === 'pdf'}
        className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all"
      >
        <Download className="h-[15px] w-[15px]" />
        {downloading === 'pdf' ? 'Generating…' : 'Download PDF'}
      </button>

      {isJobScan && (
        <button
          onClick={downloadN8n}
          className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all"
        >
          <Download className="h-[15px] w-[15px]" />
          n8n Workflow .json
        </button>
      )}

      <button
        onClick={handleShare}
        className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[20px] py-[11px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all"
      >
        {copied
          ? <><Check className="h-[15px] w-[15px] text-green-600" /><span className="text-green-600">Copied!</span></>
          : <><Share2 className="h-[15px] w-[15px]" />Share Report</>
        }
      </button>
    </div>
  )
}
