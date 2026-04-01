import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Brain, ShieldCheck, ShieldAlert, ShieldX, Search } from 'lucide-react'
import ReportActions from './ReportActions'

// Recommendation renderer — splits on Option 1/2/3 and Decision layer
function RecommendationBlocks({ text }: { text: string }) {
  if (!text) return null
  const segments = text.split(/(Option\s+\d+\s*[-:]\s*|Decision\s+layer\s*[:\-]\s*)/i)
  const blocks: { label: string; body: string; isDecision: boolean }[] = []
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      const body = segments[i].trim()
      if (body) blocks.push({ label: '', body, isDecision: false })
    } else {
      const label = segments[i].trim().replace(/[-:]\s*$/, '').trim()
      const body = (segments[i + 1] || '').trim()
      const isDecision = /Decision\s+layer/i.test(label)
      if (body) blocks.push({ label, body, isDecision })
      i++
    }
  }
  if (blocks.length <= 1) return <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{text}</p>
  return (
    <div className="space-y-0">
      {blocks.map((block, i) => (
        <div key={i} className={`text-[13px] leading-relaxed ${i > 0 ? 'border-t border-blue-200 pt-[10px] mt-[10px]' : ''} ${block.isDecision ? 'text-violet-800' : 'text-[#1d1d1f]'}`}>
          {block.label && (
            <span className={`font-bold mr-[6px] ${block.isDecision ? 'text-violet-700' : 'text-[#0071e3]'}`}>
              {block.label}{!/[-:]$/.test(block.label) ? ' \u2014' : ''}
            </span>
          )}
          {block.body}
        </div>
      ))}
    </div>
  )
}

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
}

interface AnalysisData {
  id: number; workflow_id: number
  workflow: { id: number; share_code?: string; name: string; description: string; tasks: WorkflowTask[]; input_mode?: string; n8n_workflow_json?: string }
  automation_score: number; hours_saved: number; annual_savings: number
  readiness_score?: number
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
  const countdownMap: Record<string, string> = {
    'now': '\u26a1 Automate NOW',
    '12-24': '\ud83d\udfe0 12\u201324 months',
    '24-48': '\ud83d\udfe1 24\u201348 months',
    '48+': '\ud83d\udd52 48+ months',
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Top banner */}
      <div className="bg-[#0071e3] text-white px-4 py-[10px]">
        <div className="max-w-[980px] mx-auto flex items-center justify-between gap-[8px]">
          <a href="https://workscanai.vercel.app" className="flex items-center gap-[6px] font-semibold text-[14px] hover:opacity-90 transition-opacity">
            <Brain className="h-[16px] w-[16px] shrink-0" />
            WorkScanAI
          </a>
          <span className="text-[12px] opacity-80 hidden sm:inline">AI-Powered Workflow Analysis</span>
          <a href="https://workscanai.vercel.app/#analyze" className="hidden sm:inline-flex items-center gap-[5px] text-[12px] font-semibold bg-white/20 hover:bg-white/30 px-[12px] py-[4px] rounded-full transition-all">
            Analyse your workflow &rarr;
          </a>
          <span className="text-[11px] opacity-50 font-mono">#{code}</span>
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
            <div key={card.label} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[20px] sm:p-[32px]">
              <div className="text-[11px] font-semibold text-[#86868b] tracking-wide uppercase mb-[10px]">{card.label}</div>
              <div className={`text-[36px] sm:text-[48px] font-semibold tracking-tight mb-[4px] ${card.color} truncate`}>{card.value}</div>
              <div className="text-[12px] sm:text-[13px] text-[#86868b]">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Task Breakdown */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[20px] sm:p-[40px] mb-[24px] sm:mb-[32px]">
          <h2 className="text-[20px] sm:text-[28px] font-semibold italic tracking-tight mb-[24px] sm:mb-[32px]">Task Breakdown</h2>
          <div className="space-y-[16px]">
            {data.results.map((result, index) => {
              const taskName = result.task?.name || `Task ${index + 1}`
              const riskColor = result.risk_level === 'warning' ? 'bg-red-50 border-red-200 text-red-700'
                : result.risk_level === 'caution' ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : 'bg-green-50 border-green-200 text-green-700'
              const RiskIcon = result.risk_level === 'warning' ? ShieldX : result.risk_level === 'caution' ? ShieldAlert : ShieldCheck
              return (
                <div key={index} className="border border-[#d2d2d7] rounded-[12px] p-[16px] sm:p-[24px] bg-white">
                  <div className="flex flex-wrap justify-between items-start gap-[8px] mb-[12px]">
                    <h3 className="text-[15px] sm:text-[19px] font-semibold italic text-[#1d1d1f] break-words">{taskName}</h3>
                    <div className="flex flex-wrap gap-[8px] items-center">
                      {result.countdown_window && (
                        <span className="text-[11px] font-bold px-[10px] py-[4px] rounded-full border bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f]">
                          {countdownMap[result.countdown_window] || result.countdown_window}
                        </span>
                      )}
                      <span className={`px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${
                        result.ai_readiness_score >= 80 ? 'bg-green-100 text-green-700'
                        : result.ai_readiness_score >= 60 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'}`}>
                        {Math.round(result.ai_readiness_score)}% Ready
                      </span>
                    </div>
                  </div>

                  {result.score_repeatability != null && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[6px] mb-[12px]">
                      {[
                        { label: 'Repeatability', val: result.score_repeatability },
                        { label: 'Data Access', val: result.score_data_availability },
                        { label: 'Error Tolerance', val: result.score_error_tolerance },
                        { label: 'Integration', val: result.score_integration },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[8px] p-[10px] text-center">
                          <div className={`text-[18px] font-bold mb-[2px] ${val == null ? 'text-[#86868b]' : val >= 70 ? 'text-green-600' : val >= 45 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {val != null ? Math.round(val) : '\u2014'}
                          </div>
                          <div className="text-[10px] text-[#86868b] font-medium uppercase tracking-wide">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-[16px] text-[14px] mb-[12px]">
                    <div><span className="text-[#86868b]">Time Saved: </span><span className="font-medium">{Math.round(result.time_saved_percentage)}%</span></div>
                    <div><span className="text-[#86868b]">Difficulty: </span><span className="font-medium capitalize">{result.difficulty}</span></div>
                    <div><span className="text-[#86868b]">Hours/yr: </span><span className="font-medium">{Math.round(result.estimated_hours_saved)} hrs</span></div>
                  </div>

                  {result.risk_flag && (
                    <div className={`flex items-start gap-[8px] px-[14px] py-[10px] rounded-[8px] border mb-[12px] text-[13px] ${riskColor}`}>
                      <RiskIcon className="w-4 h-4 mt-[1px] shrink-0" />
                      <span>{result.risk_flag}</span>
                    </div>
                  )}

                  <div className="p-[14px] bg-blue-50 border border-blue-200 rounded-[8px] mb-[8px]">
                    <div className="text-[13px] font-bold text-[#0071e3] mb-[6px]">&#128161; Recommendation</div>
                    <RecommendationBlocks text={result.recommendation} />
                  </div>

                  {result.agent_label && (
                    <div className={`p-[12px] rounded-[8px] border text-[13px] ${result.agent_phase === 3 ? 'bg-purple-50 border-purple-100' : result.agent_phase === 2 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full mr-[8px] ${result.agent_phase === 3 ? 'bg-purple-100 text-purple-700' : result.agent_phase === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        PHASE {result.agent_phase}
                      </span>
                      <span className="font-semibold text-[#1d1d1f]">{result.agent_label}</span>
                      {result.agent_milestone && <p className="text-[12px] text-[#6e6e73] mt-[4px]">&#127919; {result.agent_milestone}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Download + Share actions */}
        <ReportActions
          workflowId={data.workflow_id}
          workflowName={data.workflow.name}
          shareUrl={shareUrl}
          shareCode={code}
          isJobScan={data.workflow.input_mode === 'job_scan'}
          n8nWorkflowJson={data.workflow.n8n_workflow_json}
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
            <a href="https://workscanai.vercel.app/#analyze" className="inline-flex items-center justify-center bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[15px] transition-all w-full sm:w-auto shadow-md">
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
