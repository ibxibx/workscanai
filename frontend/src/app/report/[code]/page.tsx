import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Brain, Search } from 'lucide-react'
import ReportActions from './ReportActions'
import WalkthroughCta from './WalkthroughCta'
import { TaskBreakdown, ContextSections, resolveContext, type SharedTaskResult } from '@/components/report/ReportSections'
import N8nWorkflowsSection, { type N8nTemplate } from '@/components/report/N8nWorkflowsSection'

interface WorkflowTask { id: number; name: string; description: string }

interface TaskResult {
  task_id: number; task?: WorkflowTask
  ai_readiness_score: number
  score_repeatability?: number; score_data_availability?: number
  score_error_tolerance?: number; score_integration?: number
  time_saved_percentage: number; recommendation: string
  difficulty: string; estimated_hours_saved: number
  risk_level?: string; risk_flag?: string
  agent_phase?: number; agent_label?: string; agent_milestone?: string
  orchestration?: string
  countdown_window?: string; human_edge_score?: number
  pivot_skills?: string; pivot_roles?: string; decision_layer?: string
}

interface AnalysisData {
  id: number; workflow_id: number
  workflow: { id: number; share_code?: string; name: string; description: string; tasks: WorkflowTask[]; input_mode?: string; n8n_workflow_json?: string; analysis_context?: string; industry?: string; team_size?: string }
  automation_score: number; hours_saved: number; annual_savings: number
  readiness_score?: number
  readiness_data_quality?: number; readiness_process_docs?: number
  readiness_tool_maturity?: number; readiness_team_skills?: number
  results: TaskResult[]
}

const BACKEND_BASE = process.env.API_URL || 'https://workscanai.onrender.com'

async function getAnalysisByCode(code: string): Promise<AnalysisData | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/share/${code}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const taskMap: Record<number, WorkflowTask> = {}
    if (data.workflow?.tasks) { for (const t of data.workflow.tasks) taskMap[t.id] = t }
    data.results = (data.results || []).map((r: TaskResult) => ({
      ...r, task: taskMap[r.task_id] || { id: r.task_id, name: `Task ${r.task_id}`, description: '' }
    }))
    return data
  } catch { return null }
}

// Resolve the n8n workflow cards for a report, server-side, with two paths:
//  1. Stored merged canvas (workflow.n8n_workflow_json) -> one card.
//  2. Fallback: live-fetch curated per-task community templates from the
//     backend, mirroring the dashboard's client fallback but on the server so
//     the public report shows them even when no canvas was persisted.
async function getN8nTemplates(data: AnalysisData): Promise<N8nTemplate[]> {
  // Path 1 — stored merged canvas
  if (data.workflow.n8n_workflow_json) {
    try {
      const parsed = JSON.parse(data.workflow.n8n_workflow_json)
      return [{
        id: data.workflow.id,
        name: parsed.name || data.workflow.name || 'Automation Workflow',
        description: `n8n workflow generated for: ${data.workflow.name}`,
        workflow_json: parsed,
        url: '',
        relevance_reason: 'Generated from your workflow analysis',
        node_count: Array.isArray(parsed.nodes) ? parsed.nodes.length : 0,
        nodes_preview: Array.isArray(parsed.nodes)
          ? parsed.nodes.map((n: { type?: string }) => n?.type || '').filter(Boolean).slice(0, 5)
          : [],
      }]
    } catch { /* fall through to live fetch */ }
  }

  // Path 2 — live curated templates (server-side fetch; closes the gap where
  // no canvas was stored). Strip any "— Job Scanner" suffix from the title.
  const jobTitle = data.workflow.name.replace(/\s*[-\u2014]+\s*Job Scanner/i, '').trim()
  const taskDicts = data.results.map(r => ({
    name: r.task?.name || '', category: 'general', frequency: 'weekly',
  })).filter(t => t.name)
  if (taskDicts.length === 0) return []
  try {
    const res = await fetch(`${BACKEND_BASE}/api/job-scan/n8n-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_title: jobTitle, tasks: taskDicts }),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const payload = await res.json()
    const templates = (payload?.suggested_templates || []) as N8nTemplate[]
    return Array.isArray(templates) ? templates : []
  } catch { return [] }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const data = await getAnalysisByCode(code)
  if (!data) return { title: 'WorkScanAI Report' }
  const score = Math.round(data.automation_score)
  const savings = Math.round(data.annual_savings).toLocaleString()
  const shareUrl = `https://workscanai.vercel.app/report/${code}`
  return {
    title: `${data.workflow.name} \u2014 WorkScanAI Analysis`,
    description: `Automation score: ${score}%. Potential annual savings: \u20ac${savings}. Powered by WorkScanAI.`,
    openGraph: {
      title: `${data.workflow.name} \u2014 WorkScanAI`,
      description: `${score}% automation potential \u00b7 \u20ac${savings} annual savings`,
      url: shareUrl, siteName: 'WorkScanAI', type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.workflow.name} \u2014 WorkScanAI`,
      description: `${score}% automation potential \u00b7 \u20ac${savings} annual savings`,
    },
  }
}

export default async function PublicReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const data = await getAnalysisByCode(code)
  if (!data) notFound()

  const totalTasks = data.results.length
  const automationReady = data.results.filter(r => r.ai_readiness_score >= 70).length
  const quickWins = data.results.filter(r => r.difficulty === 'easy').length
  const shareUrl = `https://workscanai.vercel.app/report/${code}`

  // n8n workflow cards: stored canvas first, else server-side live fetch.
  const n8nTemplates = await getN8nTemplates(data)

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Top banner */}
      <div className="bg-[#0071e3] text-white px-4 py-[10px]">
        <div className="max-w-[980px] mx-auto flex items-center justify-between gap-[8px] min-w-0">
          <a href="https://workscanai.vercel.app" className="flex items-center gap-[6px] font-semibold text-[14px] hover:opacity-90 transition-opacity shrink-0">
            <Brain className="h-[16px] w-[16px] shrink-0" />
            WorkScanAI
          </a>
          <span className="text-[12px] opacity-80 hidden sm:inline truncate">AI-Powered Workflow Analysis</span>
          <a href={`https://workscanai.vercel.app/?ref=${code}#analyze`} className="hidden sm:inline-flex items-center gap-[5px] text-[12px] font-semibold bg-white/20 hover:bg-white/30 px-[12px] py-[4px] rounded-full transition-all whitespace-nowrap shrink-0">
            Analyse your workflow &rarr;
          </a>
          <span className="text-[11px] opacity-50 font-mono truncate max-w-[80px] sm:max-w-none">#{code}</span>
        </div>
      </div>

      <div className="max-w-[980px] mx-auto px-4 sm:px-6 pt-[32px] sm:pt-[48px] pb-[60px] sm:pb-[80px]">
        {/* Header */}
        <div className="mb-[32px] sm:mb-[48px]">
          <div className="inline-flex items-center gap-[8px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-full px-[14px] py-[6px] text-[12px] text-[#86868b] font-medium mb-[16px] sm:mb-[20px]">
            <span className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block"></span>
            AI Automation Analysis Report
          </div>
          <h1 className="text-[28px] sm:text-[40px] leading-[1.1] font-semibold italic tracking-tight mb-[8px] break-words">{data.workflow.name}</h1>
          {data.workflow.input_mode === 'job_scan' && (
            <div className="inline-flex items-center gap-[6px] bg-[#0071e3]/10 border border-[#0071e3]/30 text-[#0071e3] text-[12px] font-semibold px-[12px] py-[4px] rounded-full mb-[8px]">
              <Search className="h-[11px] w-[11px]" />
              Auto-generated by Job Scanner
            </div>
          )}
          {data.workflow.description && <p className="text-[14px] sm:text-[17px] text-[#6e6e73]">{data.workflow.description}</p>}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] sm:gap-[16px] mb-[32px] sm:mb-[48px]">
          {[
            { label: 'Automation Score', value: `${Math.round(data.automation_score)}%`, color: 'text-[#0071e3]', sub: `${automationReady} of ${totalTasks} tasks ready` },
            { label: 'Annual Savings', value: `\u20ac${Math.round(data.annual_savings).toLocaleString()}`, color: 'text-green-600', sub: `${Math.round(data.hours_saved)} hours per year` },
            { label: 'Quick Wins', value: `${quickWins}`, color: 'text-purple-600', sub: 'Tasks you can automate today' },
          ].map(card => (
            <div key={card.label} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[20px] sm:p-[32px] overflow-hidden">
              <div className="text-[11px] font-semibold text-[#86868b] tracking-wide uppercase mb-[10px]">{card.label}</div>
              <div className={`text-[36px] sm:text-[48px] font-semibold tracking-tight mb-[4px] ${card.color} truncate`}>{card.value}</div>
              <div className="text-[12px] sm:text-[13px] text-[#86868b]">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Walkthrough CTA — rides the dopamine of the summary numbers */}
        <WalkthroughCta
          shareCode={code}
          workflowId={data.workflow_id}
          isJobScan={data.workflow.input_mode === 'job_scan'}
        />

        {/* Task Breakdown + full context-aware sections (shared with dashboard) */}
        <TaskBreakdown results={data.results as SharedTaskResult[]} />
        <ContextSections
          data={{
            automation_score: data.automation_score,
            hours_saved: data.hours_saved,
            annual_savings: data.annual_savings,
            readiness_score: data.readiness_score,
            readiness_data_quality: data.readiness_data_quality,
            readiness_process_docs: data.readiness_process_docs,
            readiness_tool_maturity: data.readiness_tool_maturity,
            readiness_team_skills: data.readiness_team_skills,
            results: data.results as SharedTaskResult[],
            industry: data.workflow.industry,
          }}
          context={resolveContext(data.workflow.analysis_context)}
          workflowName={data.workflow.name}
        />

        {/* Recommended n8n Workflows (shared with dashboard) */}
        <N8nWorkflowsSection templates={n8nTemplates} workflowName={data.workflow.name} />

        {/* Download + Share actions */}
        <ReportActions
          workflowId={data.workflow_id}
          workflowName={data.workflow.name}
          shareUrl={shareUrl}
          shareCode={code}
          isJobScan={data.workflow.input_mode === 'job_scan'}
          n8nWorkflowJson={data.workflow.n8n_workflow_json}
          automationScore={Math.round(data.automation_score)}
          annualSavings={Math.round(data.annual_savings)}
          hoursSaved={Math.round(data.hours_saved)}
          topTaskResults={[...data.results]
            .sort((a, b) => b.ai_readiness_score - a.ai_readiness_score)
            .slice(0, 3)
            .map(r => ({
              taskName: r.task?.name || 'Task',
              score: Math.round(r.ai_readiness_score),
              recommendation: r.recommendation,
            }))}
        />

        {/* CTA */}
        <div className="bg-[#1d1d1f] rounded-[24px] p-[32px] sm:p-[56px] text-center">
          <h2 className="text-[22px] sm:text-[32px] font-semibold italic tracking-tight text-white mb-[12px]">Analyse your own workflows</h2>
          <p className="text-[14px] sm:text-[17px] text-[#86868b] mb-[28px] sm:mb-[36px] max-w-[480px] mx-auto leading-relaxed">
            WorkScanAI identifies automation opportunities and calculates ROI in minutes &mdash; not months.
          </p>
          <div className="flex flex-col sm:flex-row gap-[12px] justify-center items-center">
            <a href={`https://workscanai.vercel.app/?ref=${code}#analyze`} className="inline-flex items-center justify-center bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[15px] transition-all w-full sm:w-auto shadow-md">
              Analyse your workflow free &rarr;
            </a>
            <div className="inline-flex items-center justify-center border border-[#424245] text-[#86868b] px-[16px] py-[13px] rounded-full text-[11px] font-mono w-full sm:w-auto overflow-hidden max-w-[280px]">
              <span className="truncate">{shareUrl}</span>
            </div>
          </div>
        </div>

        <div className="mt-[40px] sm:mt-[48px] text-center text-[13px] text-[#86868b]">
          <p>Generated by <a href="https://workscanai.vercel.app" className="text-[#0071e3] hover:underline">WorkScanAI</a> &mdash; Report <span className="font-mono">#{code}</span></p>
        </div>
      </div>
    </div>
  )
}
