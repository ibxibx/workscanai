'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, notFound } from 'next/navigation'
import { Download, Share2, Map, Check, ShieldCheck, ShieldAlert, ShieldX,
         TrendingUp, Clock, Target, Zap, Users, BarChart3, AlertTriangle, Briefcase, Globe2, Building2 } from 'lucide-react'
import Link from 'next/link'

interface WorkflowTask {
  id: number
  name: string
  description: string
}

interface TaskResult {
  task_id: number
  task?: WorkflowTask
  ai_readiness_score: number
  score_repeatability?: number
  score_data_availability?: number
  score_error_tolerance?: number
  score_integration?: number
  time_saved_percentage: number
  recommendation: string
  difficulty: string
  estimated_hours_saved: number
  risk_level?: string
  risk_flag?: string
  // F9 agentification
  agent_phase?: number
  agent_label?: string
  agent_milestone?: string
  // F13 orchestration
  orchestration?: string
}

interface AnalysisData {
  id: number
  workflow_id: number
  workflow: {
    id: number
    name: string
    description: string
    tasks: WorkflowTask[]
  }
  automation_score: number
  hours_saved: number
  annual_savings: number
  readiness_score?: number
  readiness_data_quality?: number
  readiness_process_docs?: number
  readiness_tool_maturity?: number
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

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/report/${id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: analysisData ? `WorkScanAI — ${analysisData.workflow.name}` : 'WorkScanAI Analysis',
          text: 'Check out this automation analysis from WorkScanAI',
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share or clipboard failed — silently ignore
    }
  }, [analysisData, id])

  useEffect(() => {
    const controller = new AbortController()

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(
          `/api/results/${id}`,
          { signal: controller.signal }
        )

        if (response.status === 404) notFound()
        if (!response.ok) throw new Error('Failed to fetch analysis results')

        const data = await response.json()

        // Build a task lookup map from the embedded workflow tasks
        const taskMap: Record<number, WorkflowTask> = {}
        if (data.workflow?.tasks) {
          for (const t of data.workflow.tasks) {
            taskMap[t.id] = t
          }
        }

        // Enrich each result with its task object
        data.results = (data.results || []).map((r: TaskResult) => ({
          ...r,
          task: taskMap[r.task_id] || { id: r.task_id, name: `Task ${r.task_id}`, description: '' }
        }))

        setAnalysisData(data)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Error fetching analysis:', err)
        setError('Failed to load analysis results. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
    return () => controller.abort()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[24px] text-[#86868b]">Loading analysis...</div>
        </div>
      </div>
    )
  }

  if (error || !analysisData) {
    return (
      <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="text-[24px] text-red-600 mb-4">{error || 'No analysis data found'}</div>
          <a href="/" className="text-[#0071e3] hover:underline">Go back to home</a>
        </div>
      </div>
    )
  }

  const totalTasks = analysisData.results.length
  const automationReady = analysisData.results.filter(r => r.ai_readiness_score >= 70).length

  const downloadAsDocx = async () => {
    try {
      const response = await fetch(`/api/reports/${id}/docx`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI-Analysis-${analysisData.workflow.name.replace(/\s+/g, '-')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading DOCX:', error)
      alert('Failed to generate DOCX report. Please try again.')
    }
  }

  const downloadAsPdf = async () => {
    try {
      const response = await fetch(`/api/reports/${id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate report')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WorkScanAI-Analysis-${analysisData.workflow.name.replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to generate PDF report. Please try again.')
    }
  }

  const generateReportContent = () => {
    return `
WORKSCANAI AUTOMATION ANALYSIS REPORT
=====================================

Workflow: ${analysisData.workflow.name}
Analysis Date: ${new Date().toLocaleDateString()}
Analysis ID: ${id}

EXECUTIVE SUMMARY
-----------------
Automation Score: ${Math.round(analysisData.automation_score)}%
Total Tasks Analyzed: ${totalTasks}
Tasks Ready for Automation: ${automationReady}
Annual Savings Potential: €${Math.round(analysisData.annual_savings).toLocaleString()}
Time Saved Per Year: ${Math.round(analysisData.hours_saved)} hours

DETAILED TASK ANALYSIS
----------------------

${analysisData.results.map((result, index) => `
${index + 1}. ${result.task?.name || `Task ${result.task_id}`}
   Automation Readiness: ${Math.round(result.ai_readiness_score)}%
   Time Savings Potential: ${Math.round(result.time_saved_percentage)}%
   Implementation Difficulty: ${result.difficulty}
   Recommendation: ${result.recommendation}
   Estimated Hours Saved: ${Math.round(result.estimated_hours_saved)} hours/year
`).join('\n')}

RECOMMENDATIONS
---------------
Quick Wins (Implement First):
${analysisData.results.filter(r => r.difficulty === 'easy').map(r => `• ${r.task?.name || `Task ${r.task_id}`}`).join('\n')}

Medium-Term Goals:
${analysisData.results.filter(r => r.difficulty === 'medium').map(r => `• ${r.task?.name || `Task ${r.task_id}`}`).join('\n')}

NEXT STEPS
----------
1. Start with the highest-scoring, easiest-to-implement tasks
2. Set up automation tools recommended above
3. Test automations with small batches before full rollout
4. Monitor and iterate based on results

---
Report generated by WorkScanAI
Visit: https://workscanai.com
    `.trim()
  }

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header */}
        <div className="mb-[48px]">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
            <h1 className="relative text-[48px] leading-[1.08] font-semibold italic tracking-tight mb-[8px] px-[32px]">
              {analysisData.workflow.name}
            </h1>
          </div>
          <p className="text-[14px] text-[#86868b]">Analysis ID: {id}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[48px]">
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Automation Score
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-[#0071e3] mb-[4px]">
              {Math.round(analysisData.automation_score)}%
            </div>
            <div className="text-[13px] text-[#86868b]">
              {automationReady} of {totalTasks} tasks ready
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Annual Savings
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-green-600 mb-[4px]">
              €{Math.round(analysisData.annual_savings).toLocaleString()}
            </div>
            <div className="text-[13px] text-[#86868b]">
              {Math.round(analysisData.hours_saved)} hours per year
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Quick Wins
            </div>
            <div className="text-[48px] font-semibold tracking-tight text-purple-600 mb-[4px]">
              {analysisData.results.filter(r => r.difficulty === 'easy').length}
            </div>
            <div className="text-[13px] text-[#86868b]">
              Tasks you can automate today
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] mb-[32px]">
          <h2 className="text-[28px] font-semibold italic tracking-tight mb-[32px]">Task Breakdown</h2>
          <div className="space-y-[16px]">
            {analysisData.results.map((result, index) => {
              const taskName = result.task?.name || `Task ${index + 1}`
              const hasSubScores = result.score_repeatability != null
              const riskColor = result.risk_level === 'warning' ? 'bg-red-50 border-red-200 text-red-700' :
                                result.risk_level === 'caution' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                'bg-green-50 border-green-200 text-green-700'
              const RiskIcon = result.risk_level === 'warning' ? ShieldX :
                               result.risk_level === 'caution' ? ShieldAlert : ShieldCheck

              return (
                <div key={index} className="border border-[#d2d2d7] rounded-[12px] p-[24px] bg-white">
                  {/* Header row */}
                  <div className="flex justify-between items-start mb-[16px]">
                    <h3 className="text-[19px] font-semibold italic text-[#1d1d1f]">{taskName}</h3>
                    <span className={`px-[12px] py-[6px] rounded-full text-[13px] font-semibold ${
                      result.ai_readiness_score >= 80 ? 'bg-green-100 text-green-700' :
                      result.ai_readiness_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(result.ai_readiness_score)}% Ready
                    </span>
                  </div>

                  {/* F1 — Sub-scores */}
                  {hasSubScores && (
                    <div className="grid grid-cols-4 gap-[8px] mb-[16px]">
                      {[
                        {label: 'Repeatability', val: result.score_repeatability},
                        {label: 'Data Access', val: result.score_data_availability},
                        {label: 'Error Tolerance', val: result.score_error_tolerance},
                        {label: 'Integration', val: result.score_integration},
                      ].map(({label, val}) => (
                        <div key={label} className="bg-[#f5f5f7] rounded-[8px] p-[10px] text-center">
                          <div className="text-[18px] font-semibold text-[#1d1d1f]">{val != null ? Math.round(val) : '—'}</div>
                          <div className="text-[10px] text-[#86868b] mt-[2px]">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-[16px] text-[14px] mb-[16px]">
                    <div><span className="text-[#86868b]">Time Saved: </span><span className="font-medium">{Math.round(result.time_saved_percentage)}%</span></div>
                    <div><span className="text-[#86868b]">Difficulty: </span><span className="font-medium capitalize">{result.difficulty}</span></div>
                    <div><span className="text-[#86868b]">Hours saved/yr: </span><span className="font-medium">{Math.round(result.estimated_hours_saved)} hrs</span></div>
                  </div>

                  {/* F3 — Risk badge */}
                  {result.risk_flag && (
                    <div className={`flex items-start gap-[8px] px-[14px] py-[10px] rounded-[8px] border mb-[12px] text-[13px] ${riskColor}`}>
                      <RiskIcon className="w-4 h-4 mt-[1px] shrink-0" />
                      <span>{result.risk_flag}</span>
                    </div>
                  )}

                  {/* F2 — Priced recommendations */}
                  <div className="p-[16px] bg-blue-50 border border-blue-200 rounded-[8px] mb-[12px]">
                    <div className="text-[14px] font-bold text-[#0071e3] mb-[10px]">💡 Recommendation</div>
                    {result.recommendation && (() => {
                      const text = result.recommendation
                      const opt1Match = text.match(/(Option\s+1\s*[—–-])/)
                      const opt2Match = text.match(/(Option\s+2\s*[—–-])/)
                      if (opt1Match && opt2Match && opt2Match.index) {
                        const part1 = text.slice(opt1Match.index!, opt2Match.index).trim()
                        const part2 = text.slice(opt2Match.index).trim()
                        return (
                          <div className="flex flex-col gap-[8px]">
                            <div className="text-[13px] text-[#1d1d1f]">{part1}</div>
                            <div className="text-[13px] text-[#1d1d1f] border-t border-blue-200 pt-[8px]">{part2}</div>
                          </div>
                        )
                      }
                      return <p className="text-[13px] text-[#1d1d1f]">{text}</p>
                    })()}
                  </div>

                  {/* F9 — Agentification roadmap phase */}
                  {result.agent_phase != null && (
                    <div className={`p-[16px] rounded-[8px] border mb-[12px] ${
                      result.agent_phase === 3 ? 'bg-purple-50 border-purple-200' :
                      result.agent_phase === 2 ? 'bg-indigo-50 border-indigo-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-[8px] mb-[6px]">
                        <span className={`text-[11px] font-bold px-[8px] py-[3px] rounded-full ${
                          result.agent_phase === 3 ? 'bg-purple-100 text-purple-700' :
                          result.agent_phase === 2 ? 'bg-indigo-100 text-indigo-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          PHASE {result.agent_phase}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1d1d1f]">
                          {result.agent_label || 'Agentification Roadmap'}
                        </span>
                      </div>
                      {result.agent_milestone && (
                        <p className="text-[13px] text-[#6e6e73]">🎯 {result.agent_milestone}</p>
                      )}
                    </div>
                  )}

                  {/* F13 — Multi-agent orchestration */}
                  {result.orchestration && (
                    <div className="p-[16px] bg-[#1d1d1f] rounded-[8px]">
                      <div className="text-[12px] font-bold text-[#86868b] tracking-wide uppercase mb-[6px]">⚙ Orchestration Blueprint</div>
                      <p className="text-[13px] text-[#e8e8ed] leading-relaxed font-mono">{result.orchestration}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* F4 — Company AI Readiness Score */}
        {analysisData.readiness_score != null && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] mb-[32px]">
            <div className="flex items-start justify-between mb-[24px]">
              <div>
                <h2 className="text-[28px] font-semibold italic tracking-tight">Company AI Readiness</h2>
                <p className="text-[14px] text-[#86868b] mt-[4px]">How ready is your organisation to adopt AI automation</p>
              </div>
              <div className="text-center">
                <div className="text-[56px] font-semibold tracking-tight text-[#0071e3]">{Math.round(analysisData.readiness_score)}%</div>
                <div className="text-[13px] text-[#86868b]">Overall Readiness</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
              {[
                {label: 'Data Quality', val: analysisData.readiness_data_quality, desc: 'How structured & accessible your data is'},
                {label: 'Process Documentation', val: analysisData.readiness_process_docs, desc: 'How rule-based & repeatable your workflows are'},
                {label: 'Tool Maturity', val: analysisData.readiness_tool_maturity, desc: 'How easily tools integrate with your stack'},
                {label: 'Error Tolerance', val: analysisData.readiness_team_skills, desc: 'How tolerant processes are to AI mistakes'},
              ].map(({label, val, desc}) => (
                <div key={label} className="bg-white rounded-[12px] p-[16px] border border-[#d2d2d7]">
                  <div className={`text-[28px] font-semibold mb-[4px] ${
                    val == null ? 'text-[#86868b]' :
                    val >= 70 ? 'text-green-600' :
                    val >= 50 ? 'text-yellow-600' : 'text-red-500'
                  }`}>{val != null ? Math.round(val) : '—'}</div>
                  <div className="text-[13px] font-medium text-[#1d1d1f]">{label}</div>
                  <div className="text-[11px] text-[#86868b] mt-[2px]">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── B2B Company Intelligence Panel ─────────────────────────── */}
        <div className="mb-[32px]">
          <div className="flex items-center gap-[10px] mb-[20px]">
            <Building2 className="h-[20px] w-[20px] text-[#0071e3]" />
            <h2 className="text-[22px] font-semibold italic tracking-tight">Company Automation Intelligence</h2>
            <span className="text-[11px] font-bold text-[#0071e3] bg-blue-50 border border-blue-200 px-[10px] py-[3px] rounded-full tracking-wide uppercase">For Business</span>
          </div>
          <p className="text-[14px] text-[#86868b] mb-[24px]">
            Ten strategic signals extracted from your workflow — designed for leadership, operations, and strategy teams.
          </p>

          <div className="grid md:grid-cols-2 gap-[16px]">

            {/* Feature 1 — Automation ROI Timeline */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-[18px] w-[18px] text-[#0071e3]" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F1 — ROI Timeline</div>
                  <div className="text-[11px] text-[#86868b]">Payback period per automation wave</div>
                </div>
              </div>
              <div className="space-y-[10px]">
                {['Quick wins (0–3 months)', 'Medium-term (3–12 months)', 'Strategic (12–36 months)'].map((phase, i) => {
                  const phaseResults = analysisData.results.filter(r =>
                    i === 0 ? r.difficulty === 'easy' :
                    i === 1 ? r.difficulty === 'medium' : r.difficulty === 'hard'
                  )
                  const phaseSavings = phaseResults.reduce((s, r) => s + r.estimated_hours_saved, 0)
                  const colors = ['text-green-600', 'text-yellow-600', 'text-orange-600']
                  const bgs = ['bg-green-50 border-green-100', 'bg-yellow-50 border-yellow-100', 'bg-orange-50 border-orange-100']
                  return (
                    <div key={phase} className={`flex items-center justify-between rounded-[10px] border px-[14px] py-[10px] ${bgs[i]}`}>
                      <span className="text-[13px] font-medium text-[#1d1d1f]">{phase}</span>
                      <div className="text-right">
                        <div className={`text-[16px] font-bold ${colors[i]}`}>{Math.round(phaseSavings)} hrs/yr</div>
                        <div className="text-[10px] text-[#86868b]">{phaseResults.length} tasks</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feature 2 — Automation Countdown per Task */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-red-50 border border-red-100 flex items-center justify-center">
                  <Clock className="h-[18px] w-[18px] text-red-500" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F2 — Risk Countdown</div>
                  <div className="text-[11px] text-[#86868b]">When each role function is at risk</div>
                </div>
              </div>
              <div className="space-y-[8px]">
                {analysisData.results.slice(0, 4).map((r, i) => {
                  const score = r.ai_readiness_score
                  const window = score >= 80 ? '⚡ Now' : score >= 65 ? '🟠 12–24 mo' : score >= 45 ? '🟡 24–48 mo' : '🟢 48+ mo'
                  const barColor = score >= 80 ? 'bg-red-400' : score >= 65 ? 'bg-orange-400' : score >= 45 ? 'bg-yellow-400' : 'bg-green-400'
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[12px] mb-[3px]">
                        <span className="text-[#1d1d1f] font-medium truncate max-w-[180px]">{r.task?.name || `Task ${i+1}`}</span>
                        <span className="text-[#86868b] shrink-0 ml-2">{window}</span>
                      </div>
                      <div className="h-[5px] bg-[#f0f0f5] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{width: `${score}%`}} />
                      </div>
                    </div>
                  )
                })}
                {analysisData.results.length > 4 && (
                  <p className="text-[11px] text-[#86868b] pt-[4px]">+ {analysisData.results.length - 4} more tasks in full breakdown above</p>
                )}
              </div>
            </div>

            {/* Feature 3 — Competitor Gap Warning */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Target className="h-[18px] w-[18px] text-purple-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F3 — Competitor Gap</div>
                  <div className="text-[11px] text-[#86868b]">Cost of waiting 12 more months</div>
                </div>
              </div>
              <div className="space-y-[12px]">
                {[
                  { label: 'If you automate now', savings: Math.round(analysisData.annual_savings), color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                  { label: 'If you wait 12 months', savings: Math.round(analysisData.annual_savings * 0.35), note: '65% advantage lost', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                  { label: 'AI-first competitor today', savings: Math.round(analysisData.annual_savings * 1.4), note: 'Estimated edge over you', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                ].map(item => (
                  <div key={item.label} className={`rounded-[10px] border px-[14px] py-[10px] ${item.bg}`}>
                    <div className="text-[11px] text-[#86868b] mb-[2px]">{item.label}</div>
                    <div className={`text-[20px] font-bold ${item.color}`}>€{item.savings.toLocaleString()}/yr</div>
                    {item.note && <div className="text-[10px] text-[#86868b] mt-[1px]">{item.note}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 4 — Quick Win Sprint Plan */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-green-50 border border-green-100 flex items-center justify-center">
                  <Zap className="h-[18px] w-[18px] text-green-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F4 — 90-Day Sprint Plan</div>
                  <div className="text-[11px] text-[#86868b]">Highest-impact tasks to act on first</div>
                </div>
              </div>
              <div className="space-y-[8px]">
                {analysisData.results
                  .filter(r => r.difficulty === 'easy')
                  .sort((a, b) => b.ai_readiness_score - a.ai_readiness_score)
                  .slice(0, 4)
                  .map((r, i) => (
                    <div key={i} className="flex items-start gap-[10px] bg-green-50 border border-green-100 rounded-[10px] px-[12px] py-[10px]">
                      <span className="shrink-0 w-[20px] h-[20px] rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center mt-[1px]">{i+1}</span>
                      <div>
                        <div className="text-[13px] font-semibold text-[#1d1d1f]">{r.task?.name || `Task ${i+1}`}</div>
                        <div className="text-[11px] text-[#86868b]">{Math.round(r.ai_readiness_score)}% ready · {Math.round(r.estimated_hours_saved)} hrs/yr</div>
                      </div>
                    </div>
                  ))}
                {analysisData.results.filter(r => r.difficulty === 'easy').length === 0 && (
                  <p className="text-[13px] text-[#86868b]">No easy-difficulty tasks found — check medium-term opportunities above.</p>
                )}
              </div>
            </div>

            {/* Feature 5 — Hiring Impact Analysis */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Users className="h-[18px] w-[18px] text-indigo-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F5 — Headcount Signal</div>
                  <div className="text-[11px] text-[#86868b]">FTE equivalent released by automation</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-[10px]">
                {[
                  { label: 'Hours freed/yr', val: `${Math.round(analysisData.hours_saved)}h`, color: 'text-[#0071e3]' },
                  { label: 'FTE equivalent', val: `${(analysisData.hours_saved / 1800).toFixed(1)}`, color: 'text-purple-600', note: 'at 1,800 hrs/yr' },
                  { label: 'Cost of 1 FTE', val: `€${Math.round(analysisData.annual_savings / Math.max((analysisData.hours_saved / 1800), 0.1)).toLocaleString()}`, color: 'text-green-600', note: 'saved per role' },
                ].map(item => (
                  <div key={item.label} className="bg-[#f5f5f7] border border-[#e8e8ed] rounded-[12px] p-[14px] text-center">
                    <div className={`text-[22px] font-bold mb-[4px] ${item.color}`}>{item.val}</div>
                    <div className="text-[11px] font-medium text-[#1d1d1f]">{item.label}</div>
                    {item.note && <div className="text-[10px] text-[#86868b] mt-[1px]">{item.note}</div>}
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#86868b] mt-[14px]">
                These hours can be redeployed to higher-value work rather than requiring headcount reduction.
              </p>
            </div>

            {/* Feature 6 — Effort vs Impact Matrix */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <BarChart3 className="h-[18px] w-[18px] text-amber-600" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F6 — Effort vs Impact Matrix</div>
                  <div className="text-[11px] text-[#86868b]">Where to focus your automation budget</div>
                </div>
              </div>
              <div className="space-y-[8px]">
                {[
                  { q: '🎯 High impact, Low effort', filter: (r: TaskResult) => r.ai_readiness_score >= 70 && r.difficulty === 'easy', color: 'bg-green-50 border-green-200 text-green-800' },
                  { q: '📈 High impact, High effort', filter: (r: TaskResult) => r.ai_readiness_score >= 70 && r.difficulty !== 'easy', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                  { q: '🔧 Low impact, Low effort', filter: (r: TaskResult) => r.ai_readiness_score < 70 && r.difficulty === 'easy', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                  { q: '⏸ Low impact, High effort', filter: (r: TaskResult) => r.ai_readiness_score < 70 && r.difficulty !== 'easy', color: 'bg-gray-50 border-gray-200 text-gray-600' },
                ].map(({ q, filter, color }) => {
                  const count = analysisData.results.filter(filter).length
                  return (
                    <div key={q} className={`flex justify-between items-center rounded-[10px] border px-[14px] py-[10px] ${color}`}>
                      <span className="text-[12px] font-medium">{q}</span>
                      <span className="text-[16px] font-bold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feature 7 — Compliance & Risk Summary */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-red-50 border border-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-[18px] w-[18px] text-red-500" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F7 — Risk & Compliance Flags</div>
                  <div className="text-[11px] text-[#86868b]">Tasks requiring human oversight</div>
                </div>
              </div>
              {analysisData.results.filter(r => r.risk_flag).length === 0 ? (
                <div className="flex items-center gap-[10px] bg-green-50 border border-green-200 rounded-[12px] px-[16px] py-[14px]">
                  <ShieldCheck className="h-[20px] w-[20px] text-green-600 shrink-0" />
                  <p className="text-[13px] text-green-800 font-medium">No compliance or risk flags identified in this workflow.</p>
                </div>
              ) : (
                <div className="space-y-[8px]">
                  {analysisData.results.filter(r => r.risk_flag).map((r, i) => (
                    <div key={i} className={`flex items-start gap-[8px] rounded-[10px] border px-[12px] py-[10px] text-[12px] ${
                      r.risk_level === 'warning' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                      {r.risk_level === 'warning' ? <ShieldX className="h-[14px] w-[14px] shrink-0 mt-[1px]" /> : <ShieldAlert className="h-[14px] w-[14px] shrink-0 mt-[1px]" />}
                      <div>
                        <div className="font-semibold mb-[1px]">{r.task?.name}</div>
                        <div>{r.risk_flag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feature 8 — Board-Ready Executive Summary */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px]">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-[#1d1d1f] flex items-center justify-center">
                  <Briefcase className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F8 — Board Summary</div>
                  <div className="text-[11px] text-[#86868b]">Ready to paste into your deck</div>
                </div>
              </div>
              <div className="bg-[#1d1d1f] rounded-[12px] p-[16px] text-[#e8e8ed] font-mono text-[12px] leading-relaxed space-y-[6px]">
                <div className="text-[#86868b] text-[10px] uppercase tracking-widest mb-[8px]">Executive Summary — {new Date().toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</div>
                <div>Workflow: <span className="text-white font-bold">{analysisData.workflow.name}</span></div>
                <div>Automation score: <span className="text-[#0071e3] font-bold">{Math.round(analysisData.automation_score)}%</span></div>
                <div>Annual savings potential: <span className="text-green-400 font-bold">€{Math.round(analysisData.annual_savings).toLocaleString()}</span></div>
                <div>Hours reclaimed: <span className="text-purple-400 font-bold">{Math.round(analysisData.hours_saved)}h/yr</span></div>
                <div>FTE equivalent: <span className="text-amber-400 font-bold">{(analysisData.hours_saved / 1800).toFixed(1)} roles</span></div>
                <div>Quick wins available: <span className="text-white font-bold">{analysisData.results.filter(r => r.difficulty === 'easy').length} tasks</span></div>
                <div>Recommended action: <span className="text-white font-bold">Begin 90-day sprint</span></div>
              </div>
            </div>

            {/* Feature 9 — Industry Benchmark */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[28px] md:col-span-2">
              <div className="flex items-center gap-[10px] mb-[14px]">
                <div className="w-[36px] h-[36px] rounded-[10px] bg-[#0071e3] flex items-center justify-center">
                  <Globe2 className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#1d1d1f]">F9 — Industry Benchmark</div>
                  <div className="text-[11px] text-[#86868b]">How this workflow compares to sector averages</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
                {[
                  { label: 'Your score', val: `${Math.round(analysisData.automation_score)}%`, note: 'This workflow', color: 'text-[#0071e3]', bg: 'bg-blue-50 border-blue-100' },
                  { label: 'Sector average', val: '58%', note: 'Cognitive workflows', color: 'text-[#6e6e73]', bg: 'bg-[#f5f5f7] border-[#e8e8ed]' },
                  { label: 'Top 10% orgs', val: '81%', note: 'AI-first companies', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                  { label: 'Gap to close', val: `${Math.max(0, 81 - Math.round(analysisData.automation_score))}%`, note: 'To reach top 10%', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                ].map(item => (
                  <div key={item.label} className={`rounded-[14px] border p-[16px] text-center ${item.bg}`}>
                    <div className={`text-[28px] font-bold mb-[4px] ${item.color}`}>{item.val}</div>
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">{item.label}</div>
                    <div className="text-[10px] text-[#86868b] mt-[2px]">{item.note}</div>
                  </div>
                ))}
              </div>
              <div className="mt-[16px] p-[14px] bg-[#f5f5f7] border border-[#e8e8ed] rounded-[12px]">
                <p className="text-[13px] text-[#6e6e73]">
                  <span className="font-semibold text-[#1d1d1f]">Insight: </span>
                  {Math.round(analysisData.automation_score) >= 70
                    ? `Your workflow automation potential is above the sector average. You are positioned to gain a competitive edge by acting within the next 90 days.`
                    : `Your workflow has significant untapped automation potential. Companies in your sector that automate first typically reduce operational costs by 30–45% within 18 months.`
                  }
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-[16px]">
          <button 
            onClick={downloadAsDocx}
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
          >
            <Download className="h-[18px] w-[18px]" />
            Download as DOCX
          </button>
          <button 
            onClick={downloadAsPdf}
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"
          >
            <Download className="h-[18px] w-[18px]" />
            Download as PDF
          </button>
          <button 
            onClick={handleShare}
            className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[28px] py-[14px] rounded-full font-medium text-[17px] text-[#1d1d1f] transition-all"
          >
            {copied ? (
              <>
                <Check className="h-[18px] w-[18px] text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-[18px] w-[18px]" />
                Share Results
              </>
            )}
          </button>
          <Link
            href={`/dashboard/results/${id}/roadmap`}
            className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[28px] py-[14px] rounded-full font-medium text-[17px] text-[#1d1d1f] transition-all"
          >
            <Map className="h-[18px] w-[18px]" />
            View Roadmap
          </Link>
        </div>
      </div>
    </div>
  )
}
