import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

interface WorkflowTask {
  id: number
  name: string
  description: string
}

interface TaskResult {
  task_id: number
  task?: WorkflowTask
  ai_readiness_score: number
  time_saved_percentage: number
  recommendation: string
  difficulty: string
  estimated_hours_saved: number
  risk_level?: string
  risk_flag?: string
  agent_phase?: number
  agent_label?: string
  agent_milestone?: string
}

interface AnalysisData {
  id: number
  workflow_id: number
  workflow: { id: number; name: string; description: string; tasks: WorkflowTask[] }
  automation_score: number
  hours_saved: number
  annual_savings: number
  readiness_score?: number
  results: TaskResult[]
}

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAnalysis(id: string): Promise<AnalysisData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/results/${id}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const taskMap: Record<number, WorkflowTask> = {}
    if (data.workflow?.tasks) {
      for (const t of data.workflow.tasks) taskMap[t.id] = t
    }
    data.results = (data.results || []).map((r: TaskResult) => ({
      ...r,
      task: taskMap[r.task_id] || { id: r.task_id, name: `Task ${r.task_id}`, description: '' }
    }))
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const data = await getAnalysis(params.id)
  if (!data) return { title: 'WorkScanAI Report' }
  const score = Math.round(data.automation_score)
  const savings = Math.round(data.annual_savings).toLocaleString()
  return {
    title: `${data.workflow.name} — WorkScanAI Analysis`,
    description: `Automation score: ${score}%. Potential annual savings: €${savings}. Powered by WorkScanAI.`,
    openGraph: {
      title: `${data.workflow.name} — WorkScanAI`,
      description: `${score}% automation potential · €${savings} annual savings`,
      url: `https://workscanai.vercel.app/report/${params.id}`,
      siteName: 'WorkScanAI',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.workflow.name} — WorkScanAI`,
      description: `${score}% automation potential · €${savings} annual savings`,
    },
  }
}

export default async function PublicReportPage({ params }: { params: { id: string } }) {
  const data = await getAnalysis(params.id)
  if (!data) notFound()

  const totalTasks = data.results.length
  const automationReady = data.results.filter(r => r.ai_readiness_score >= 70).length
  const quickWins = data.results.filter(r => r.difficulty === 'easy').length
  const shareUrl = `https://workscanai.vercel.app/report/${params.id}`

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Top banner — "shared via WorkScanAI" */}
      <div className="bg-[#0071e3] text-white text-center py-[10px] px-4 text-[13px]">
        <span className="opacity-80">This report was shared via </span>
        <a href="https://workscanai.vercel.app" className="font-semibold underline underline-offset-2">
          WorkScanAI
        </a>
        <span className="opacity-80"> — AI-Powered Workflow Analysis</span>
      </div>

      <div className="max-w-[980px] mx-auto px-6 pt-[48px] pb-[80px]">

        {/* Header */}
        <div className="mb-[48px]">
          <div className="inline-flex items-center gap-[8px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-full px-[14px] py-[6px] text-[12px] text-[#86868b] font-medium mb-[20px]">
            <span className="w-[6px] h-[6px] rounded-full bg-green-500 inline-block"></span>
            AI Automation Analysis Report
          </div>
          <h1 className="text-[48px] leading-[1.08] font-semibold italic tracking-tight mb-[8px]">
            {data.workflow.name}
          </h1>
          <p className="text-[17px] text-[#6e6e73]">{data.workflow.description}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">Automation Score</div>
            <div className="text-[48px] font-semibold tracking-tight text-[#0071e3] mb-[4px]">{Math.round(data.automation_score)}%</div>
            <div className="text-[13px] text-[#86868b]">{automationReady} of {totalTasks} tasks ready</div>
          </div>
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">Annual Savings</div>
            <div className="text-[48px] font-semibold tracking-tight text-green-600 mb-[4px]">€{Math.round(data.annual_savings).toLocaleString()}</div>
            <div className="text-[13px] text-[#86868b]">{Math.round(data.hours_saved)} hours per year</div>
          </div>
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">Quick Wins</div>
            <div className="text-[48px] font-semibold tracking-tight text-purple-600 mb-[4px]">{quickWins}</div>
            <div className="text-[13px] text-[#86868b]">Tasks you can automate today</div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] mb-[32px]">
          <h2 className="text-[28px] font-semibold italic tracking-tight mb-[32px]">Task Breakdown</h2>
          <div className="space-y-[16px]">
            {data.results.map((result, index) => {
              const taskName = result.task?.name || `Task ${index + 1}`
              const riskColor = result.risk_level === 'warning'
                ? 'bg-red-50 border-red-200 text-red-700'
                : result.risk_level === 'caution'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                : 'bg-green-50 border-green-200 text-green-700'
              const RiskIcon = result.risk_level === 'warning' ? ShieldX
                : result.risk_level === 'caution' ? ShieldAlert : ShieldCheck
              return (
                <div key={index} className="border border-[#d2d2d7] rounded-[12px] p-[24px] bg-white">
                  <div className="flex justify-between items-start mb-[12px]">
                    <h3 className="text-[19px] font-semibold italic text-[#1d1d1f]">{taskName}</h3>
                    <span className={`px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${
                      result.ai_readiness_score >= 80 ? 'bg-green-100 text-green-700'
                      : result.ai_readiness_score >= 60 ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                    }`}>{Math.round(result.ai_readiness_score)}% Ready</span>
                  </div>
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
                  <div className="p-[14px] bg-blue-50 border border-blue-200 rounded-[8px]">
                    <div className="text-[13px] font-bold text-[#0071e3] mb-[6px]">💡 Recommendation</div>
                    <p className="text-[13px] text-[#1d1d1f]">{result.recommendation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA — try WorkScanAI */}
        <div className="bg-[#1d1d1f] rounded-[24px] p-[48px] text-center">
          <h2 className="text-[32px] font-semibold italic tracking-tight text-white mb-[12px]">
            Analyse your own workflows
          </h2>
          <p className="text-[17px] text-[#86868b] mb-[32px] max-w-[480px] mx-auto">
            WorkScanAI identifies automation opportunities and calculates ROI in minutes — not months.
          </p>
          <div className="flex flex-col sm:flex-row gap-[12px] justify-center">
            <a
              href="https://workscanai.vercel.app"
              className="inline-flex items-center justify-center bg-[#0071e3] hover:bg-[#0077ed] text-white px-[32px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
            >
              Try WorkScanAI free →
            </a>
            <button
              onClick={undefined}
              className="inline-flex items-center justify-center border border-[#424245] hover:border-[#636366] text-white px-[32px] py-[14px] rounded-full font-medium text-[17px] transition-all cursor-default"
              aria-label="Share URL"
            >
              📋 {shareUrl}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-[48px] text-center text-[13px] text-[#86868b]">
          <p>Generated by <a href="https://workscanai.vercel.app" className="text-[#0071e3] hover:underline">WorkScanAI</a> · AI-Powered Workflow Analysis</p>
        </div>

      </div>
    </div>
  )
}
