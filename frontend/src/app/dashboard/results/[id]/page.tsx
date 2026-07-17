'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, notFound } from 'next/navigation'
import { Download, Share2, Map, Check, Users, Building2, User, Search } from 'lucide-react'
import Link from 'next/link'
import { TaskBreakdown, ContextSections, resolveContext, type SharedTaskResult } from '@/components/report/ReportSections'
import N8nWorkflowsSection from '@/components/report/N8nWorkflowsSection'
import { fetchWithWake } from '@/lib/wake-ping'
import BackendWarming from '@/components/BackendWarming'

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
 // New context-aware fields
 countdown_window?: string // 'now'|'12-24'|'24-48'|'48+'
 human_edge_score?: number // 0-100
 pivot_skills?: string // JSON
 pivot_roles?: string // JSON
 decision_layer?: string // 'none'|'partial'|'full'
}

interface SuggestedTemplate {
 id: number
 name: string
 description: string
 url: string
 relevance_reason: string
 node_count: number
 nodes_preview: string[]
 workflow_json: Record<string, unknown>
 task_name?: string
}

interface AnalysisData {
 id: number; workflow_id: number
 workflow: {
 id: number; name: string; description: string
 tasks: WorkflowTask[]
 share_code?: string
 analysis_context?: string
 team_size?: string; industry?: string
 input_mode?: string
 n8n_workflow_json?: string
 }
 automation_score: number; hours_saved: number; annual_savings: number
 readiness_score?: number; readiness_data_quality?: number
 readiness_process_docs?: number; readiness_tool_maturity?: number
 readiness_team_skills?: number
 results: TaskResult[]
}

export default function ResultsPage() {
 const params = useParams()
 const id = params.id as string
 const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [copied, setCopied] = useState(false)
 const [warming, setWarming] = useState(false)
 const [suggestedTemplates, setSuggestedTemplates] = useState<SuggestedTemplate[]>([])

 const handleShare = useCallback(async () => {
 const shareCode = analysisData?.workflow?.share_code || id
 const shareUrl = `${window.location.origin}/report/${shareCode}`
 try {
 if (navigator.share) {
 await navigator.share({ title: analysisData ? `WorkScanAI -- ${analysisData.workflow.name}` : 'WorkScanAI Analysis', text: 'Check out this automation analysis from WorkScanAI', url: shareUrl })
 } else {
 await navigator.clipboard.writeText(shareUrl)
 setCopied(true); setTimeout(() => setCopied(false), 2000)
 }
 } catch { }
 }, [analysisData, id])

 useEffect(() => {
 const controller = new AbortController()
 const fetchAnalysis = async () => {
 try {
 // Send guest ID so the backend ownership check can match anonymous workflows
 const guestId = typeof window !== 'undefined' ? (localStorage.getItem('wsai_guest_id') || '') : ''
 const headers: Record<string, string> = {}
 if (guestId) headers['x-user-email'] = guestId
 const response = await fetchWithWake(`/api/results/${id}`, { signal: controller.signal, headers, onWarming: setWarming })
 if (response.status === 404) notFound()
 if (!response.ok) throw new Error('Failed to fetch analysis results')
 const data = await response.json()
 const taskMap: Record<number, WorkflowTask> = {}
 if (data.workflow?.tasks) { for (const t of data.workflow.tasks) taskMap[t.id] = t }
 data.results = (data.results || []).map((r: TaskResult) => ({
 ...r, task: taskMap[r.task_id] || { id: r.task_id, name: `Task ${r.task_id}`, description: '' }
 }))
 setAnalysisData(data)
 // Load n8n templates for ALL analysis types (not just job scan)
 if (data.workflow?.n8n_workflow_json && !data.workflow?.input_mode?.includes('job_scan')) {
   try {
     const parsed = JSON.parse(data.workflow.n8n_workflow_json)
     setSuggestedTemplates([{
       id: data.workflow.id,
       name: parsed.name || data.workflow.name || 'Automation Workflow',
       description: `n8n workflow generated for: ${data.workflow.name}`,
       workflow_json: parsed,
       url: '',
       relevance_reason: 'Generated from your workflow analysis',
       node_count: parsed.nodes?.length || 0,
       nodes_preview: [],
     }])
   } catch { }
 }
 // Silently rewrite the address bar to the public share URL so copying
 // it is enough to share -- does NOT navigate, just updates the URL shown
 if (data.workflow?.share_code) {
 window.history.replaceState(null, '', `/report/${data.workflow.share_code}`)
 }
 } catch (err: unknown) {
 if (err instanceof Error && err.name === 'AbortError') return
 setError('Failed to load analysis results. Make sure the backend is running.')
 } finally { setLoading(false) }
 }
 fetchAnalysis()
 return () => controller.abort()
 }, [id])

 if (loading) return (
  <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
    <BackendWarming show={warming} />
    <div className="max-w-[980px] mx-auto px-6 text-center pt-[80px]">
      <div className="w-[48px] h-[48px] rounded-full border-[3px] border-[#e8e8ed] border-t-[#0071e3] animate-spin mx-auto mb-[24px]" />
      <div className="text-[20px] font-semibold text-[#1d1d1f] mb-[8px]">Loading your analysis…</div>
      <div className="text-[14px] text-[#86868b]">
        {warming
          ? 'The server is waking up from sleep — this can take 20–40 seconds on the free tier.'
          : 'This may take a few seconds if the server is warming up.'}
      </div>
    </div>
  </div>
 )
 if (error || !analysisData) return (
   <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
     <div className="max-w-[980px] mx-auto px-6 text-center pt-[40px]">
       <div className="text-[24px] text-red-600 mb-3">{error || 'No analysis data found'}</div>
       <p className="text-[14px] text-[#86868b] mb-6 max-w-[460px] mx-auto">
         The analysis server may still be waking up. Reloading usually resolves this once it&apos;s ready.
       </p>
       <div className="flex flex-wrap justify-center gap-[12px]">
         <button
           onClick={() => window.location.reload()}
           className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
         >
           Try again
         </button>
         <Link href="/dashboard" className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] text-[#1d1d1f] px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all">
           Back to dashboard
         </Link>
       </div>
     </div>
   </div>
 )

 const context = analysisData.workflow.analysis_context || 'individual'
 const totalTasks = analysisData.results.length
 const automationReady = analysisData.results.filter(r => r.ai_readiness_score >= 70).length
 const quickWins = analysisData.results.filter(r => r.difficulty === 'easy').length
 const avgHumanEdge = analysisData.results.reduce((s, r) => s + (r.human_edge_score || 50), 0) / Math.max(totalTasks, 1)

 const contextIcon = context === 'company' ? <Building2 className="h-[16px] w-[16px]" /> : context === 'team' ? <Users className="h-[16px] w-[16px]" /> : <User className="h-[16px] w-[16px]" />
 const contextLabel = context === 'company' ? 'Company Analysis' : context === 'team' ? 'Team Analysis' : 'Personal Analysis'
 const contextGradient = context === 'company' ? 'from-orange-500 to-red-600' : context === 'team' ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-purple-600'
 const isJobScan = analysisData.workflow.input_mode === 'job_scan'

 const downloadReport = async (fmt: 'docx' | 'pdf') => {
 try {
 const response = await fetch(`/api/reports/${id}/${fmt}`)
 if (!response.ok) throw new Error('Failed to generate report')
 const blob = await response.blob()
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url; a.download = `WorkScanAI-${analysisData.workflow.name.replace(/\s+/g, '-')}.${fmt}`
 document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
 } catch { alert(`Failed to generate ${fmt.toUpperCase()} report.`) }
 }

 const downloadN8nWorkflow = async () => {
 const jobTitle = analysisData!.workflow.name.replace(/\s*[-\u2014]+\s*Job Scanner/i, '').trim()
 const fileName = `${jobTitle.replace(/\s+/g, '_')}_n8n_canvas.json`

 // 1. Best: use stored merged canvas from DB
 if (analysisData!.workflow.n8n_workflow_json) {
 try {
 const parsed = JSON.parse(analysisData!.workflow.n8n_workflow_json)
 const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a'); a.href = url; a.download = fileName
 document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
 return
 } catch { /* fall through */ }
 }

 // 2. Fallback: fetch fresh per-task templates and build merged canvas on the fly
 try {
 const taskDicts = analysisData!.results.map(r => ({
 name: r.task?.name || '',
 category: 'general',
 frequency: 'weekly',
 }))
 const res = await fetch('/api/job-scan/n8n-templates', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ job_title: jobTitle, tasks: taskDicts }),
 })
 if (res.ok) {
 const data = await res.json()
 const templates: SuggestedTemplate[] = data.suggested_templates || []
 if (templates.length > 0) {
 setSuggestedTemplates(templates)
 // Download top template as fallback
 const tpl = templates[0]
 const blob = new Blob([JSON.stringify(tpl.workflow_json, null, 2)], { type: 'application/json' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a'); a.href = url
 a.download = `${jobTitle.replace(/\s+/g, '_')}_n8n_${tpl.id}.json`
 document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
 return
 }
 }
 } catch { /* fall through */ }
 console.warn('No n8n workflow available for download')
 }

 return (
 <div className="min-h-screen bg-[#fafafa] text-[#1d1d1f] pt-[88px] pb-[80px]">
 <div className="max-w-[980px] mx-auto px-4 sm:px-6">

 {/* -- Header -- */}
 <div className="mb-[40px]">
 <div className="flex items-center gap-[10px] mb-[16px]">
 <div className={`w-[32px] h-[32px] rounded-full bg-gradient-to-br ${contextGradient} flex items-center justify-center text-white`}>
 {contextIcon}
 </div>
 <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-widest">{contextLabel}</span>
 {analysisData.workflow.industry && (
 <span className="text-[12px] text-[#86868b] bg-[#f5f5f7] border border-[#e8e8ed] px-[10px] py-[3px] rounded-full">
 {analysisData.workflow.industry}
 </span>
 )}
 </div>
 <h1 className="text-[28px] sm:text-[44px] leading-[1.08] font-semibold italic tracking-tight mb-[6px] break-words">
 {analysisData.workflow.name}
 </h1>
 {isJobScan && (
 <div className="inline-flex items-center gap-[6px] bg-[#0071e3]/10 border border-[#0071e3]/30 text-[#0071e3] text-[12px] font-semibold px-[12px] py-[4px] rounded-full mb-[6px]">
 <Search className="h-[11px] w-[11px]" />
 Auto-generated by Job Scanner
 </div>
 )}
 <p className="text-[14px] text-[#86868b]">Analysis ID: {id} - {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
 </div>

 {/* -- Hero KPI Cards -- */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px] mb-[40px]">
 {[
 { label: 'Automation Score', value: `${Math.round(analysisData.automation_score)}%`, color: 'text-[#0071e3]', sub: `${automationReady} of ${totalTasks} tasks ready` },
 { label: 'Annual Savings', value: `€${Math.round(analysisData.annual_savings).toLocaleString()}`, color: 'text-green-600', sub: `${Math.round(analysisData.hours_saved)} hours/yr` },
 { label: 'Quick Wins', value: `${quickWins}`, color: 'text-purple-600', sub: 'Automatable today' },
 { label: 'Human Edge', value: `${Math.round(avgHumanEdge)}%`, color: 'text-amber-600', sub: 'Irreplaceable value' },
 ].map(card => (
 <div key={card.label} className="bg-white border border-[#e8e8ed] rounded-[18px] p-[16px] sm:p-[24px] shadow-sm hover-lift hover-stat cursor-default min-w-0">
 <div className="text-[10px] sm:text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-[8px] sm:mb-[10px]">{card.label}</div>
 <div className={`text-[22px] sm:text-[36px] font-semibold tracking-tight ${card.color} mb-[4px] leading-tight truncate`}>{card.value}</div>
 <div className="text-[11px] sm:text-[12px] text-[#86868b] leading-snug">{card.sub}</div>
 </div>
 ))}
 </div>

        {/* Task Breakdown + context-aware sections (shared with public report) */}
        <TaskBreakdown results={analysisData.results as unknown as SharedTaskResult[]} />
        <ContextSections
          data={{
            automation_score: analysisData.automation_score,
            hours_saved: analysisData.hours_saved,
            annual_savings: analysisData.annual_savings,
            readiness_score: analysisData.readiness_score,
            readiness_data_quality: analysisData.readiness_data_quality,
            readiness_process_docs: analysisData.readiness_process_docs,
            readiness_tool_maturity: analysisData.readiness_tool_maturity,
            readiness_team_skills: analysisData.readiness_team_skills,
            results: analysisData.results as unknown as SharedTaskResult[],
            industry: analysisData.workflow.industry,
          }}
          context={resolveContext(analysisData.workflow.analysis_context)}
          workflowName={analysisData.workflow.name}
        />



		{/* Recommended n8n Workflows (shared with public report) */}
		<N8nWorkflowsSection templates={suggestedTemplates} workflowName={analysisData.workflow.name} workflowId={analysisData.workflow.id} />

 {/* Actions */}
 <div className="mt-[40px] sm:mt-[56px] pb-[8px]">
 <div className="border-t border-[#e8e8ed] mb-[28px] sm:mb-[36px]" />
 <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-widest mb-[16px]">Export &amp; Share</p>
 <div className="flex flex-col sm:flex-row flex-wrap gap-[12px]">
 <button onClick={() => downloadReport('docx')} className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm">
 <Download className="h-[15px] w-[15px] shrink-0" /> Download DOCX
 </button>
 <button onClick={() => downloadReport('pdf')} className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm">
 <Download className="h-[15px] w-[15px] shrink-0" /> Download PDF
 </button>
 <button onClick={downloadN8nWorkflow} className="inline-flex items-center justify-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm">
 <Download className="h-[15px] w-[15px] shrink-0" /> n8n Canvas .json
 </button>
 <button onClick={handleShare} className="inline-flex items-center justify-center gap-[8px] border border-[#d2d2d7] hover:border-[#0071e3] hover:bg-[#f0f7ff] px-[24px] py-[13px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all">
 {copied ? <><Check className="h-[15px] w-[15px] text-green-600 shrink-0" /><span className="text-green-600">Link copied!</span></> : <><Share2 className="h-[15px] w-[15px] shrink-0" /><span>Share Report</span></>}
 </button>
 <Link href={`/dashboard/results/${id}/roadmap`} className="inline-flex items-center justify-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[24px] py-[13px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all">
 <Map className="h-[15px] w-[15px] shrink-0" /> View Roadmap
 </Link>
 </div>
 </div>

 {/* Legal / accuracy disclaimer — very bottom of the report */}
 <p className="mt-[24px] text-[11px] leading-[1.5] text-[#86868b] text-center max-w-[560px] mx-auto">
 WorkScanAI estimates are for general guidance only and do not constitute
 investment, employment, financial, legal, or business advice &mdash; verify
 independently before acting.
 </p>
 </div>
 </div>
 )
}
