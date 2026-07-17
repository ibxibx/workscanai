'use client'

// Shared "Recommended n8n Workflows" section — client component (has download
// buttons), used by BOTH the dashboard results page and the public /report page
// so they stay in sync. Renders nothing when there are no templates.

import { Download, ArrowRight, FileText } from 'lucide-react'
import { trackWorkflowDownloaded, trackWorkflowSetupGuideDownloaded } from '@/lib/analytics'
import { buildN8nSetupGuide, downloadMarkdown } from '@/lib/n8nSetupGuide'

export interface N8nTemplate {
  id: number
  name: string
  description?: string
  url?: string
  relevance_reason?: string
  node_count?: number
  nodes_preview?: string[]
  workflow_json: Record<string, unknown>
  task_name?: string
}

export default function N8nWorkflowsSection({
  templates,
  workflowName,
  workflowId,
  shareCode,
}: {
  templates: N8nTemplate[]
  workflowName: string
  workflowId?: number
  shareCode?: string
}) {
  if (!templates || templates.length === 0) return null

  const downloadTemplate = (tpl: N8nTemplate) => {
    // #54 — this per-template download was previously untracked.
    trackWorkflowDownloaded({
      source: 'recommended_template',
      template_id: tpl.id,
      task_name: tpl.task_name,
      node_count: tpl.node_count,
      format: 'json',
      workflow_id: workflowId,
      share_code: shareCode,
    })
    try {
      const blob = new Blob([JSON.stringify(tpl.workflow_json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowName.replace(/\s+/g, '_')}_n8n_${tpl.id}.json`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  // #37 — auto-written Markdown setup guide for this workflow (additive; the
  // JSON export above is unchanged).
  const downloadGuide = (tpl: N8nTemplate) => {
    trackWorkflowSetupGuideDownloaded({
      source: 'recommended_template',
      template_id: tpl.id,
      task_name: tpl.task_name,
      node_count: tpl.node_count,
      workflow_id: workflowId,
      share_code: shareCode,
    })
    try {
      const md = buildN8nSetupGuide({
        workflowName,
        templateName: tpl.name,
        taskName: tpl.task_name,
        url: tpl.url,
        relevanceReason: tpl.relevance_reason,
        nodeCount: tpl.node_count,
        workflowJson: tpl.workflow_json,
      })
      downloadMarkdown(`${workflowName.replace(/\s+/g, '_')}_n8n_${tpl.id}_SETUP.md`, md)
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
      <div className="flex items-center gap-[10px] mb-[6px]">
        <div className="w-[36px] h-[36px] rounded-full bg-[#0071e3] flex items-center justify-center">
          <Download className="h-[18px] w-[18px] text-white" />
        </div>
        <h2 className="text-[22px] font-semibold italic tracking-tight">Recommended n8n Workflows</h2>
      </div>
      <p className="text-[13px] text-[#86868b] mb-[20px]">
        Real community-tested automations for this role. Import directly into n8n.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
        {templates.map(tpl => (
          <div key={tpl.id} className="border border-[#e8e8ed] rounded-[14px] p-[18px] bg-[#fafafa] flex flex-col gap-[10px]">
            {tpl.task_name && (
              <div className="text-[10px] font-bold text-[#86868b] uppercase tracking-widest border-b border-[#e8e8ed] pb-[8px]">
                Task: {tpl.task_name}
              </div>
            )}
            <div className="flex items-start justify-between gap-[8px]">
              <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug">{tpl.name}</p>
              {tpl.url && (
                <a href={tpl.url} target="_blank" rel="noopener noreferrer"
                  className="text-[#0071e3] hover:text-[#0077ed] shrink-0 mt-[1px]"
                  title="View on n8n.io">
                  <ArrowRight className="h-[14px] w-[14px]" />
                </a>
              )}
            </div>
            {tpl.relevance_reason && (
              <p className="text-[12px] text-[#6e6e73]">{tpl.relevance_reason}</p>
            )}
            {tpl.nodes_preview && tpl.nodes_preview.length > 0 && (
              <div className="flex flex-wrap gap-[6px]">
                {tpl.nodes_preview.slice(0, 5).map((n, i) => (
                  <span key={i} className="text-[10px] font-semibold px-[8px] py-[3px] rounded-full bg-[#f0f7ff] text-[#0071e3] border border-[#cce0ff]">
                    {n.replace('n8n-nodes-base.', '')}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-auto flex gap-[8px]">
              <button
                onClick={() => downloadTemplate(tpl)}
                className="flex-1 flex items-center justify-center gap-[6px] bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[12px] font-semibold px-[12px] py-[8px] rounded-[8px] transition border border-[#d2d2d7]"
              >
                <Download className="h-[13px] w-[13px]" /> Import into n8n
              </button>
              <button
                onClick={() => downloadGuide(tpl)}
                title="Download a short Markdown setup guide for this workflow"
                className="shrink-0 flex items-center justify-center gap-[6px] bg-white hover:bg-[#f0f7ff] text-[#0071e3] text-[12px] font-semibold px-[12px] py-[8px] rounded-[8px] transition border border-[#cce0ff]"
              >
                <FileText className="h-[13px] w-[13px]" /> Setup guide
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
