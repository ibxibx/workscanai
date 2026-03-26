'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, notFound } from 'next/navigation'
import { Download, Share2, Map, Check, ShieldCheck, ShieldAlert, ShieldX,
         Clock, Target, TrendingUp, Users, Building2, User, ArrowRight,
         Zap, AlertTriangle, BarChart3, Briefcase, Globe2, Search } from 'lucide-react'
import Link from 'next/link'

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
  countdown_window?: string   // 'now'|'12-24'|'24-48'|'48+'
  human_edge_score?: number   // 0-100
  pivot_skills?: string       // JSON
  pivot_roles?: string        // JSON
  decision_layer?: string     // 'none'|'partial'|'full'
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
  }
  automation_score: number; hours_saved: number; annual_savings: number
  readiness_score?: number; readiness_data_quality?: number
  readiness_process_docs?: number; readiness_tool_maturity?: number
  readiness_team_skills?: number
  results: TaskResult[]
}

// ── Recommendation renderer — splits on Option 1/2/3 and Decision layer ─────
function RecommendationBlocks({ text }: { text: string }) {
  if (!text) return null
  // Split on every "Option N" or "Decision layer" boundary
  const segments = text.split(/(Option\s+\d+\s*[—–\-:]\s*|Decision\s+layer\s*[—–:\-]\s*)/i)
  // Odd indices are the delimiters (labels), even indices are the content chunks
  const blocks: { label: string; body: string; isDecision: boolean }[] = []
  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      const body = segments[i].trim()
      if (body) blocks.push({ label: '', body, isDecision: false })
    } else {
      const label = segments[i].trim().replace(/[—–\-:]\s*$/, '').trim()
      const body = (segments[i + 1] || '').trim()
      const isDecision = /Decision\s+layer/i.test(label)
      if (body) blocks.push({ label, body, isDecision })
      i++ // skip the already-consumed content segment
    }
  }
  if (blocks.length <= 1) return <p className="text-[13px] text-[#1d1d1f] leading-relaxed">{text}</p>
  return (
    <div className="space-y-0">
      {blocks.map((block, i) => (
        <div key={i} className={`text-[13px] leading-relaxed ${i > 0 ? 'border-t border-blue-200 pt-[10px] mt-[10px]' : ''} ${block.isDecision ? 'text-violet-800' : 'text-[#1d1d1f]'}`}>
          {block.label && (
            <span className={`font-bold mr-[6px] ${block.isDecision ? 'text-violet-700' : 'text-[#0071e3]'}`}>
              {block.label}
              {!/[—–\-:]$/.test(block.label) ? ' —' : ''}
            </span>
          )}
          {block.body}
        </div>
      ))}
    </div>
  )
}

// ── Countdown badge ───────────────────────────────────────────────────────────
function CountdownBadge({ window: w }: { window?: string }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    'now':   { label: '⚡ Automatable NOW',    color: 'bg-red-50 border-red-200 text-red-700',    dot: 'bg-red-500' },
    '12-24': { label: '🟠 12–24 months',       color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-400' },
    '24-48': { label: '🟡 24–48 months',       color: 'bg-yellow-50 border-yellow-200 text-yellow-700', dot: 'bg-yellow-400' },
    '48+':   { label: '🟢 Safe 48+ months',    color: 'bg-green-50 border-green-200 text-green-700',  dot: 'bg-green-500' },
  }
  const m = map[w || '24-48'] || map['24-48']
  return (
    <span className={`inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full border text-[11px] font-bold ${m.color}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const shareCode = analysisData?.workflow?.share_code || id
    const shareUrl = `${window.location.origin}/report/${shareCode}`
    try {
      if (navigator.share) {
        await navigator.share({ title: analysisData ? `WorkScanAI — ${analysisData.workflow.name}` : 'WorkScanAI Analysis', text: 'Check out this automation analysis from WorkScanAI', url: shareUrl })
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
        const response = await fetch(`/api/results/${id}`, { signal: controller.signal, headers })
        if (response.status === 404) notFound()
        if (!response.ok) throw new Error('Failed to fetch analysis results')
        const data = await response.json()
        const taskMap: Record<number, WorkflowTask> = {}
        if (data.workflow?.tasks) { for (const t of data.workflow.tasks) taskMap[t.id] = t }
        data.results = (data.results || []).map((r: TaskResult) => ({
          ...r, task: taskMap[r.task_id] || { id: r.task_id, name: `Task ${r.task_id}`, description: '' }
        }))
        setAnalysisData(data)
        // Silently rewrite the address bar to the public share URL so copying
        // it is enough to share — does NOT navigate, just updates the URL shown
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

  if (loading) return <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]"><div className="max-w-[980px] mx-auto px-6 text-center"><div className="text-[24px] text-[#86868b]">Loading analysis...</div></div></div>
  if (error || !analysisData) return <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]"><div className="max-w-[980px] mx-auto px-6 text-center"><div className="text-[24px] text-red-600 mb-4">{error || 'No analysis data found'}</div><a href="/" className="text-[#0071e3] hover:underline">Go back to home</a></div></div>

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

  const downloadN8nWorkflow = () => {
    // Build a basic n8n workflow JSON from the top automatable tasks
    const topTasks = [...analysisData.results]
      .sort((a, b) => b.ai_readiness_score - a.ai_readiness_score)
      .slice(0, 3)
    const nodes = [
      {
        id: 'node_trigger', name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1,
        position: [240, 300],
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } },
      },
      ...topTasks.map((r, i) => ({
        id: `node_task_${i}`,
        name: r.task?.name || `Task ${i + 1}`,
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 3,
        position: [460 + i * 220, 300],
        parameters: { method: 'POST', url: 'https://example.com/webhook', jsonParameters: true },
        notes: r.recommendation?.slice(0, 200) || '',
      })),
    ]
    const connections: Record<string, unknown> = {}
    connections['Schedule Trigger'] = {
      main: [[{ node: topTasks[0]?.task?.name || 'Task 1', type: 'main', index: 0 }]],
    }
    const workflow = {
      name: `${analysisData.workflow.name} — WorkScanAI Automation`,
      nodes,
      connections,
      active: false,
      settings: { executionOrder: 'v1' },
      id: `workscanai-${analysisData.workflow_id}`,
      meta: { generatedBy: 'WorkScanAI', reportUrl: window.location.href },
    }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${analysisData.workflow.name.replace(/\s+/g, '_')}_n8n_workflow.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1d1d1f] pt-[88px] pb-[80px]">
      <div className="max-w-[980px] mx-auto px-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
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
          <p className="text-[14px] text-[#86868b]">Analysis ID: {id} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* ── Hero KPI Cards ──────────────────────────────────────────── */}
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

        {/* ── Section padding — reduce on mobile throughout ── */}
        {/* SECTION A — TASK BREAKDOWN */}
        <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
          <div className="flex items-center gap-[10px] mb-[8px]">
            <BarChart3 className="h-[20px] w-[20px] text-[#0071e3]" />
            <h2 className="text-[24px] font-semibold italic tracking-tight">Task-by-Task Breakdown</h2>
          </div>
          <p className="text-[14px] text-[#86868b] mb-[32px]">
            Each task scored across repeatability, data access, error tolerance, and integration ease.
          </p>

          <div className="space-y-[16px]">
            {analysisData.results.map((result, index) => {
              const taskName = result.task?.name || `Task ${index + 1}`
              const riskColor = result.risk_level === 'warning' ? 'bg-red-50 border-red-200 text-red-700' : result.risk_level === 'caution' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-green-50 border-green-200 text-green-700'
              const RiskIcon = result.risk_level === 'warning' ? ShieldX : result.risk_level === 'caution' ? ShieldAlert : ShieldCheck

              return (
                <div key={index} className="border border-[#e8e8ed] rounded-[14px] p-[28px] bg-[#fafafa]">

                  {/* Task header */}
                  <div className="flex flex-wrap items-start justify-between gap-[12px] mb-[20px]">
                    <div>
                      <h3 className="text-[18px] font-semibold italic text-[#1d1d1f] mb-[8px]">{taskName}</h3>
                      <div className="flex flex-wrap gap-[8px]">
                        <CountdownBadge window={result.countdown_window} />
                        <span className={`text-[11px] font-bold px-[10px] py-[4px] rounded-full border ${
                          result.ai_readiness_score >= 80 ? 'bg-green-100 text-green-700 border-green-200' :
                          result.ai_readiness_score >= 60 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-red-100 text-red-700 border-red-200'}`}>
                          {Math.round(result.ai_readiness_score)}% AI Ready
                        </span>
                        {result.human_edge_score != null && (
                          <span className="text-[11px] font-bold px-[10px] py-[4px] rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            🧠 {Math.round(result.human_edge_score)}% Human Edge
                          </span>
                        )}
                        {result.decision_layer && result.decision_layer !== 'none' && (
                          <span className={`text-[11px] font-bold px-[10px] py-[4px] rounded-full border ${
                            result.decision_layer === 'full'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            {result.decision_layer === 'full' ? '🧩 Decision Layer: Human Required' : '🔀 Decision Layer: AI + Human'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub-scores */}
                  {result.score_repeatability != null && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px] mb-[16px]">
                      {[
                        { label: 'Repeatability', val: result.score_repeatability },
                        { label: 'Data Access', val: result.score_data_availability },
                        { label: 'Error Tolerance', val: result.score_error_tolerance },
                        { label: 'Integration', val: result.score_integration },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-white border border-[#e8e8ed] rounded-[10px] p-[12px] text-center">
                          <div className={`text-[20px] font-bold mb-[2px] ${
                            val == null ? 'text-[#86868b]' : val >= 70 ? 'text-green-600' : val >= 45 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {val != null ? Math.round(val) : '—'}
                          </div>
                          <div className="text-[10px] text-[#86868b] font-medium uppercase tracking-wide">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-[12px] text-[13px] mb-[16px]">
                    <div className="bg-white border border-[#e8e8ed] rounded-[8px] px-[12px] py-[8px]">
                      <span className="text-[#86868b] block text-[10px] uppercase tracking-wide mb-[2px]">Time Saved</span>
                      <span className="font-semibold">{Math.round(result.time_saved_percentage)}%</span>
                    </div>
                    <div className="bg-white border border-[#e8e8ed] rounded-[8px] px-[12px] py-[8px]">
                      <span className="text-[#86868b] block text-[10px] uppercase tracking-wide mb-[2px]">Difficulty</span>
                      <span className="font-semibold capitalize">{result.difficulty}</span>
                    </div>
                    <div className="bg-white border border-[#e8e8ed] rounded-[8px] px-[12px] py-[8px]">
                      <span className="text-[#86868b] block text-[10px] uppercase tracking-wide mb-[2px]">Hours/yr</span>
                      <span className="font-semibold">{Math.round(result.estimated_hours_saved)}h</span>
                    </div>
                  </div>

                  {/* Risk */}
                  {result.risk_flag && (
                    <div className={`flex items-start gap-[8px] px-[14px] py-[10px] rounded-[8px] border mb-[12px] text-[13px] ${riskColor}`}>
                      <RiskIcon className="w-4 h-4 mt-[1px] shrink-0" />
                      <span>{result.risk_flag}</span>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="p-[16px] bg-blue-50 border border-blue-100 rounded-[10px] mb-[12px]">
                    <div className="text-[12px] font-bold text-[#0071e3] uppercase tracking-wide mb-[8px]">💡 Recommendation</div>
                    <RecommendationBlocks text={result.recommendation} />
                  </div>

                  {/* Agent phase */}
                  {result.agent_phase != null && (
                    <div className={`p-[14px] rounded-[10px] border mb-[12px] ${result.agent_phase === 3 ? 'bg-purple-50 border-purple-100' : result.agent_phase === 2 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-center gap-[8px] mb-[4px]">
                        <span className={`text-[10px] font-bold px-[8px] py-[3px] rounded-full ${result.agent_phase === 3 ? 'bg-purple-100 text-purple-700' : result.agent_phase === 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          PHASE {result.agent_phase}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1d1d1f]">{result.agent_label}</span>
                      </div>
                      {result.agent_milestone && <p className="text-[12px] text-[#6e6e73]">🎯 {result.agent_milestone}</p>}
                    </div>
                  )}

                  {/* Orchestration */}
                  {result.orchestration && (
                    <div className="p-[12px] sm:p-[14px] bg-[#1d1d1f] rounded-[10px] overflow-x-auto">
                      <div className="text-[10px] font-bold text-[#86868b] tracking-widest uppercase mb-[6px]">⚙ Orchestration Blueprint</div>
                      <p className="text-[11px] sm:text-[12px] text-[#e8e8ed] font-mono leading-relaxed break-words">{result.orchestration}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION B — INDIVIDUAL: Countdown Clock + Job Survival + Career Pivot
        ═══════════════════════════════════════════════════════════════ */}
        {context === 'individual' && (
          <>
            {/* B1 — Automation Countdown Clock */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <Clock className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Your Automation Countdown</h2>
                  <p className="text-[12px] text-[#86868b]">Based on Mostaque's 900-day window — when AI replaces each function</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-[2px] mt-[28px] rounded-[14px] overflow-hidden border border-[#e8e8ed]">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_60px] gap-0 bg-[#f5f5f7] px-[16px] py-[12px]">
                  <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest">Task</div>
                  <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest px-[8px]">Window</div>
                  <div className="text-[11px] font-bold text-[#86868b] uppercase tracking-widest text-right">Score</div>
                </div>
                {analysisData.results.map((r, i) => {
                  const windowMap: Record<string, { label: string; bar: string; bg: string }> = {
                    'now':   { label: '⚡ Now',        bar: 'bg-red-500',    bg: 'bg-red-50' },
                    '12-24': { label: '🟠 12–24 mo',   bar: 'bg-orange-400', bg: '' },
                    '24-48': { label: '🟡 24–48 mo',   bar: 'bg-yellow-400', bg: '' },
                    '48+':   { label: '🟢 48+ mo',     bar: 'bg-green-400',  bg: 'bg-green-50' },
                  }
                  const wm = windowMap[r.countdown_window || '24-48']
                  return (
                    <div key={i} className={`grid grid-cols-[1fr_auto_60px] gap-0 px-[16px] py-[12px] border-t border-[#e8e8ed] ${wm.bg}`}>
                      <div className="text-[13px] font-medium text-[#1d1d1f] truncate pr-[8px]">{r.task?.name || `Task ${i+1}`}</div>
                      <div className="px-[8px]">
                        <span className="text-[11px] font-semibold whitespace-nowrap">{wm.label}</span>
                        <div className="w-[60px] h-[4px] bg-[#e8e8ed] rounded-full mt-[4px] overflow-hidden">
                          <div className={`h-full rounded-full ${wm.bar}`} style={{ width: `${r.ai_readiness_score}%` }} />
                        </div>
                      </div>
                      <div className="text-[13px] font-bold text-right text-[#1d1d1f]">{Math.round(r.ai_readiness_score)}%</div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-[20px] p-[16px] bg-[#f5f5f7] border border-[#e8e8ed] rounded-[12px]">
                <p className="text-[13px] text-[#6e6e73] leading-relaxed">
                  <span className="font-semibold text-[#1d1d1f]">The 900-Day Window:</span> Emad Mostaque (founder of Stability AI) warns that within 900 days, any job done on a screen can be replaced by AI for under €1,000/year. Your tasks in the red zone are at immediate risk as agentic AI tools arrive in 2025–2026.
                </p>
              </div>
            </div>

            {/* B2 — Job Survival Score */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                  <Target className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Your Human Edge</h2>
                  <p className="text-[12px] text-[#86868b]">What makes you irreplaceable vs what AI can take over</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-[20px] mt-[28px]">
                {/* Gauge comparison */}
                <div className="bg-[#fafafa] border border-[#e8e8ed] rounded-[14px] p-[24px]">
                  <div className="space-y-[20px]">
                    <div>
                      <div className="flex justify-between mb-[6px]">
                        <span className="text-[13px] font-semibold text-red-700">AI Replacement Risk</span>
                        <span className="text-[20px] font-bold text-red-600">{Math.round(analysisData.automation_score)}%</span>
                      </div>
                      <div className="h-[10px] bg-[#f0f0f5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-600 transition-all" style={{ width: `${analysisData.automation_score}%` }} />
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-[4px]">Tasks AI will handle better within 900 days</p>
                    </div>
                    <div>
                      <div className="flex justify-between mb-[6px]">
                        <span className="text-[13px] font-semibold text-amber-700">Human Irreplaceability</span>
                        <span className="text-[20px] font-bold text-amber-600">{Math.round(avgHumanEdge)}%</span>
                      </div>
                      <div className="h-[10px] bg-[#f0f0f5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all" style={{ width: `${avgHumanEdge}%` }} />
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-[4px]">Creativity, empathy, ethics, relationships, judgement</p>
                    </div>
                  </div>
                </div>

                {/* Per-task human edge */}
                <div className="space-y-[8px]">
                  <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-widest mb-[12px]">Human Edge per Task</p>
                  {analysisData.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-[12px]">
                      <div className="text-[12px] text-[#1d1d1f] flex-1 truncate">{r.task?.name || `Task ${i+1}`}</div>
                      <div className="w-[80px] h-[6px] bg-[#f0f0f5] rounded-full overflow-hidden shrink-0">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${r.human_edge_score || 50}%` }} />
                      </div>
                      <div className="text-[12px] font-bold text-amber-600 w-[32px] text-right shrink-0">{Math.round(r.human_edge_score || 50)}%</div>
                    </div>
                  ))}
                  <div className="pt-[12px] border-t border-[#e8e8ed]">
                    <p className="text-[12px] text-[#6e6e73]">
                      <span className="font-semibold text-[#1d1d1f]">Insight: </span>
                      {avgHumanEdge >= 60 ? 'Your role has strong human-essential components. Focus on amplifying these while letting AI handle the rest.' : 'Your role is highly automatable. Now is the time to pivot to higher human-edge functions.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* B3 — Safe Career Pivot */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <ArrowRight className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Your Career Pivot Plan</h2>
                  <p className="text-[12px] text-[#86868b]">Skills to build and roles to target before AI arrives</p>
                </div>
              </div>

              <div className="mt-[28px] grid md:grid-cols-2 gap-[20px]">
                {/* Skills to build */}
                <div>
                  <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-widest mb-[14px]">🔧 Skills to Develop Now</p>
                  <div className="space-y-[10px]">
                    {(() => {
                      const allSkills: string[] = []
                      analysisData.results.forEach(r => {
                        if (r.pivot_skills) {
                          try {
                            const skills = JSON.parse(r.pivot_skills)
                            if (Array.isArray(skills)) skills.forEach((s: unknown) => {
                              const label = typeof s === 'string' ? s : (s as any)?.skill ?? String(s)
                              if (label && !allSkills.includes(label) && allSkills.length < 12) allSkills.push(label)
                            })
                          } catch { }
                        }
                      })
                      if (allSkills.length === 0) allSkills.push('AI prompt engineering', 'Strategic planning', 'Client relationship management', 'Data interpretation', 'Creative direction', 'Change management')
                      const unique = [...new Set(allSkills)].slice(0, 6)
                      return unique.map((skill, i) => (
                        <div key={i} className="flex items-center gap-[10px] bg-blue-50 border border-blue-100 rounded-[10px] px-[14px] py-[10px]">
                          <div className="w-[22px] h-[22px] rounded-full bg-[#0071e3] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                          <span className="text-[13px] font-medium text-[#1d1d1f]">{skill}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Adjacent roles */}
                <div>
                  <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-widest mb-[14px]">🎯 Adjacent Roles (Lower AI Risk)</p>
                  <div className="space-y-[10px]">
                    {(() => {
                      const seen = new Set<string>()
                      const allRoles: Array<{ role: string; risk: string; pivot_distance: string; automation_score_pct?: number }> = []
                      analysisData.results.forEach(r => {
                        if (r.pivot_roles) {
                          try {
                            const roles = JSON.parse(r.pivot_roles)
                            if (Array.isArray(roles)) roles.forEach((role: any) => {
                              if (role.role && !seen.has(role.role) && allRoles.length < 8) {
                                seen.add(role.role)
                                allRoles.push(role)
                              }
                            })
                          } catch { }
                        }
                      })
                      const displayRoles = allRoles.slice(0, 4)
                      if (displayRoles.length === 0) return <p className="text-[13px] text-[#86868b]">Run a full analysis to get personalised role recommendations.</p>
                      return displayRoles.map((role, i) => {
                        const score = role.automation_score_pct
                        const scoreColor = score == null ? 'text-[#86868b]' : score <= 40 ? 'text-green-600' : score <= 65 ? 'text-yellow-600' : 'text-red-500'
                        const scoreBg = score == null ? 'bg-[#f5f5f7] border-[#e8e8ed]' : score <= 40 ? 'bg-green-50 border-green-200' : score <= 65 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                        return (
                          <div key={i} className="bg-[#fafafa] border border-[#e8e8ed] rounded-[10px] px-[14px] py-[12px]">
                            <div className="flex items-center justify-between gap-[8px]">
                              <span className="text-[14px] font-semibold text-[#1d1d1f]">{role.role}</span>
                              <div className="flex items-center gap-[6px] shrink-0">
                                {score != null && (
                                  <span className={`text-[11px] font-bold px-[8px] py-[3px] rounded-full border ${scoreBg} ${scoreColor}`}>
                                    {score}% auto risk
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-[8px] py-[3px] rounded-full border ${role.risk === 'low' ? 'bg-green-50 border-green-200 text-green-700' : role.risk === 'medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                  {role.risk} risk
                                </span>
                                <span className="text-[10px] font-bold px-[8px] py-[3px] rounded-full border bg-blue-50 border-blue-200 text-blue-700">
                                  {role.pivot_distance} pivot
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-[24px] p-[16px] bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-[12px]">
                <p className="text-[13px] text-[#1d1d1f] leading-relaxed">
                  <span className="font-semibold">90-Day Action Plan: </span>
                  Identify the top 2 skills from the list above. Spend 1 hour/day practising with AI tools (Replit, Perplexity, Claude). Build one public project or portfolio piece. This is how you move from a replacement target to an AI-empowered operator.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION C — TEAM: Velocity Impact + Sprint Plan
        ═══════════════════════════════════════════════════════════════ */}
        {context === 'team' && (
          <>
            {/* C1 — Team Velocity Impact */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <TrendingUp className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Team Velocity Impact</h2>
                  <p className="text-[12px] text-[#86868b]">What automation does for your startup's speed and competitive edge</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mt-[28px] mb-[24px]">
                {[
                  { label: 'Hours freed / yr', value: `${Math.round(analysisData.hours_saved)}h`, color: 'text-[#0071e3]', sub: 'Available for product & growth' },
                  { label: 'FTE equivalent', value: `${(analysisData.hours_saved / 1800).toFixed(1)}`, color: 'text-emerald-600', sub: 'Roles redeployable to strategic work' },
                  { label: 'Cost saved / yr', value: `€${Math.round(analysisData.annual_savings).toLocaleString()}`, color: 'text-green-600', sub: 'At your team\'s hourly rate' },
                ].map(card => (
                  <div key={card.label} className="bg-emerald-50 border border-emerald-100 rounded-[14px] p-[16px] sm:p-[20px] text-center min-w-0">
                    <div className={`text-[24px] sm:text-[32px] font-bold mb-[4px] ${card.color} truncate`}>{card.value}</div>
                    <div className="text-[12px] font-semibold text-[#1d1d1f] mb-[2px]">{card.label}</div>
                    <div className="text-[11px] text-[#86868b]">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Automation wave timeline */}
              <div className="space-y-[10px]">
                <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-widest mb-[14px]">Automation Rollout Timeline</p>
                {[
                  { phase: 'Phase 1 — Quick Wins (0–3 months)', filter: (r: TaskResult) => r.difficulty === 'easy', color: 'bg-green-500', bg: 'bg-green-50 border-green-100' },
                  { phase: 'Phase 2 — Medium-term (3–12 months)', filter: (r: TaskResult) => r.difficulty === 'medium', color: 'bg-yellow-400', bg: 'bg-yellow-50 border-yellow-100' },
                  { phase: 'Phase 3 — Strategic (12–36 months)', filter: (r: TaskResult) => r.difficulty === 'hard', color: 'bg-orange-400', bg: 'bg-orange-50 border-orange-100' },
                ].map(({ phase, filter, color, bg }) => {
                  const matched = analysisData.results.filter(filter)
                  const hrs = matched.reduce((s, r) => s + r.estimated_hours_saved, 0)
                  return (
                    <div key={phase} className={`flex items-center justify-between rounded-[12px] border px-[18px] py-[14px] ${bg}`}>
                      <div className="flex items-center gap-[10px]">
                        <div className={`w-[10px] h-[10px] rounded-full ${color}`} />
                        <span className="text-[13px] font-semibold text-[#1d1d1f]">{phase}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[16px] font-bold text-[#1d1d1f]">{Math.round(hrs)}h/yr</div>
                        <div className="text-[11px] text-[#86868b]">{matched.length} tasks</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* C2 — 90-Day Sprint Plan */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Zap className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">90-Day Sprint Plan</h2>
                  <p className="text-[12px] text-[#86868b]">Highest-ROI automations to ship in your first sprint</p>
                </div>
              </div>

              <div className="mt-[28px] space-y-[12px]">
                {analysisData.results
                  .filter(r => r.difficulty === 'easy')
                  .sort((a, b) => b.ai_readiness_score - a.ai_readiness_score)
                  .slice(0, 5)
                  .map((r, i) => (
                    <div key={i} className="flex items-start gap-[14px] bg-[#fafafa] border border-[#e8e8ed] rounded-[12px] p-[18px]">
                      <div className="w-[28px] h-[28px] rounded-full bg-emerald-600 text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-[1px]">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-[8px]">
                          <div>
                            <div className="text-[14px] font-semibold text-[#1d1d1f]">{r.task?.name}</div>
                            <div className="text-[12px] text-[#86868b] mt-[2px]">{Math.round(r.ai_readiness_score)}% ready · {Math.round(r.estimated_hours_saved)}h/yr · {r.difficulty}</div>
                          </div>
                          <CountdownBadge window={r.countdown_window} />
                        </div>
                        {r.orchestration && <p className="text-[12px] text-[#0071e3] mt-[6px] font-mono">→ {r.orchestration.split('—')[0]?.trim()}</p>}
                      </div>
                    </div>
                  ))}
                {analysisData.results.filter(r => r.difficulty === 'easy').length === 0 && (
                  <div className="text-center py-[20px] text-[#86868b] text-[14px]">No easy-difficulty tasks — focus on medium-term automations from Phase 2.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION D — COMPANY: Competitor Gap + Board Summary + Benchmark
        ═══════════════════════════════════════════════════════════════ */}
        {context === 'company' && (
          <>
            {/* D1 — AI-First Competitor Gap */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <AlertTriangle className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">AI-First Competitor Gap</h2>
                  <p className="text-[12px] text-[#86868b]">The cost of inaction — what a fully AI-first competitor gains over you</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mt-[28px] mb-[24px]">
                {[
                  { label: 'If you automate now', value: `€${Math.round(analysisData.annual_savings).toLocaleString()}/yr`, sub: 'Your annual advantage', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                  { label: 'If you wait 12 months', value: `€${Math.round(analysisData.annual_savings * 0.35).toLocaleString()}/yr`, sub: '65% of advantage lost to delayed adoption', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                  { label: 'AI-first competitor edge', value: `€${Math.round(analysisData.annual_savings * 1.4).toLocaleString()}/yr`, sub: 'Over you if they move first', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
                ].map(card => (
                  <div key={card.label} className={`rounded-[14px] border p-[16px] sm:p-[20px] min-w-0 ${card.bg}`}>
                    <div className={`text-[20px] sm:text-[26px] font-bold mb-[4px] ${card.color} truncate`}>{card.value}</div>
                    <div className="text-[12px] font-semibold text-[#1d1d1f] mb-[2px]">{card.label}</div>
                    <div className="text-[11px] text-[#86868b]">{card.sub}</div>
                  </div>
                ))}
              </div>

              <div className="p-[16px] bg-[#1d1d1f] rounded-[12px]">
                <p className="text-[13px] text-[#e8e8ed] leading-relaxed">
                  <span className="font-bold text-white">Strategic Warning: </span>
                  Mostaque's analysis shows AI-first companies won't make as many mistakes and will scale without proportional headcount growth. In markets where your workflow is highly automatable, a competitor who acts in the next 90 days builds a structural cost advantage that is very difficult to reverse.
                </p>
              </div>
            </div>

            {/* D2 — Headcount Signal */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Users className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Headcount Signal</h2>
                  <p className="text-[12px] text-[#86868b]">FTE equivalent freed — talent to redeploy to higher-value work</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px] mt-[28px]">
                {[
                  { label: 'Hours freed / yr', value: `${Math.round(analysisData.hours_saved)}h`, note: 'Total across all tasks', color: 'text-[#0071e3]' },
                  { label: 'FTE equivalent', value: `${(analysisData.hours_saved / 1800).toFixed(1)}`, note: 'At 1,800 working hrs/yr', color: 'text-purple-600' },
                  { label: 'Saved per FTE', value: `€${Math.round(analysisData.annual_savings / Math.max(analysisData.hours_saved / 1800, 0.1)).toLocaleString()}`, note: 'Annual cost per role', color: 'text-green-600' },
                ].map(item => (
                  <div key={item.label} className="bg-[#fafafa] border border-[#e8e8ed] rounded-[14px] p-[16px] sm:p-[20px] text-center min-w-0">
                    <div className={`text-[24px] sm:text-[36px] font-bold mb-[6px] ${item.color} truncate`}>{item.value}</div>
                    <div className="text-[12px] sm:text-[13px] font-semibold text-[#1d1d1f]">{item.label}</div>
                    <div className="text-[11px] text-[#86868b] mt-[2px]">{item.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-[#6e6e73] mt-[16px] text-center">
                Recommended: redeploy freed capacity to AI oversight, customer relationships, and strategic growth — not headcount reduction.
              </p>
            </div>

            {/* D3 — Industry Benchmark */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-[#0071e3] flex items-center justify-center">
                  <Globe2 className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Industry Benchmark</h2>
                  <p className="text-[12px] text-[#86868b]">Where you stand vs sector averages and AI-first leaders</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-[10px] mt-[28px]">
                {[
                  { label: 'Your score', val: `${Math.round(analysisData.automation_score)}%`, note: 'This workflow', color: 'text-[#0071e3]', bg: 'bg-blue-50 border-blue-100' },
                  { label: 'Sector average', val: '58%', note: 'Cognitive workflows', color: 'text-[#6e6e73]', bg: 'bg-[#f5f5f7] border-[#e8e8ed]' },
                  { label: 'Top 10% orgs', val: '81%', note: 'AI-first companies', color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
                  { label: 'Gap to close', val: `${Math.max(0, 81 - Math.round(analysisData.automation_score))}%`, note: 'To reach top 10%', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
                ].map(item => (
                  <div key={item.label} className={`rounded-[14px] border p-[14px] sm:p-[18px] text-center min-w-0 ${item.bg}`}>
                    <div className={`text-[22px] sm:text-[30px] font-bold mb-[4px] ${item.color}`}>{item.val}</div>
                    <div className="text-[11px] sm:text-[12px] font-semibold text-[#1d1d1f] leading-snug">{item.label}</div>
                    <div className="text-[10px] text-[#86868b] mt-[2px] leading-snug">{item.note}</div>
                  </div>
                ))}
              </div>

              <div className="mt-[20px] p-[16px] bg-[#f5f5f7] border border-[#e8e8ed] rounded-[12px]">
                <p className="text-[13px] text-[#6e6e73]">
                  <span className="font-semibold text-[#1d1d1f]">Insight: </span>
                  {Math.round(analysisData.automation_score) >= 70
                    ? 'Your workflow automation potential is above the sector average. You are positioned to gain a significant competitive edge by acting within the next 90 days.'
                    : 'Your workflow has significant untapped automation potential below the sector average. Companies that automate first in your sector typically reduce operational costs by 30–45% within 18 months.'}
                </p>
              </div>
            </div>

            {/* D4 — Board Summary */}
            <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
              <div className="flex items-center gap-[10px] mb-[8px]">
                <div className="w-[36px] h-[36px] rounded-full bg-[#1d1d1f] flex items-center justify-center">
                  <Briefcase className="h-[18px] w-[18px] text-white" />
                </div>
                <div>
                  <h2 className="text-[22px] font-semibold italic tracking-tight">Board-Ready Executive Summary</h2>
                  <p className="text-[12px] text-[#86868b]">Copy directly into your strategy deck or board memo</p>
                </div>
              </div>

              <div className="mt-[28px] bg-[#1d1d1f] rounded-[14px] p-[16px] sm:p-[28px] font-mono text-[11px] sm:text-[13px] text-[#e8e8ed] leading-[1.8] select-all overflow-x-auto">
                <div className="text-[10px] text-[#86868b] uppercase tracking-widest mb-[16px] border-b border-[#3a3a3c] pb-[10px]">
                  WorkScanAI — Executive Summary · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </div>
                <div><span className="text-[#86868b]">Workflow:</span> <span className="text-white font-bold">{analysisData.workflow.name}</span></div>
                {analysisData.workflow.industry && <div><span className="text-[#86868b]">Industry:</span> <span className="text-white">{analysisData.workflow.industry}</span></div>}
                <div><span className="text-[#86868b]">Automation potential:</span> <span className="text-[#0071e3] font-bold">{Math.round(analysisData.automation_score)}%</span> of workflow tasks</div>
                <div><span className="text-[#86868b]">Annual savings:</span> <span className="text-green-400 font-bold">€{Math.round(analysisData.annual_savings).toLocaleString()}</span></div>
                <div><span className="text-[#86868b]">Hours reclaimed:</span> <span className="text-purple-400 font-bold">{Math.round(analysisData.hours_saved)}h/yr</span></div>
                <div><span className="text-[#86868b]">FTE equivalent:</span> <span className="text-amber-400 font-bold">{(analysisData.hours_saved / 1800).toFixed(1)} roles</span></div>
                <div><span className="text-[#86868b]">Quick wins available:</span> <span className="text-white font-bold">{quickWins} tasks</span> (implementable within 90 days)</div>
                <div><span className="text-[#86868b]">Risk flags:</span> <span className="text-white font-bold">{analysisData.results.filter(r => r.risk_level !== 'safe').length} tasks</span> require compliance review</div>
                <div className="mt-[12px] pt-[12px] border-t border-[#3a3a3c]">
                  <span className="text-[#86868b]">Recommendation:</span> <span className="text-white">Begin 90-day automation sprint. Prioritise quick wins. Redeploy freed capacity to strategic functions.</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SECTION E — AI Readiness Score (all contexts)
        ═══════════════════════════════════════════════════════════════ */}
        {analysisData.readiness_score != null && (
          <div className="bg-white border border-[#e8e8ed] rounded-[20px] p-[20px] sm:p-[40px] mb-[24px] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-[16px] mb-[24px]">
              <div>
                <h2 className="text-[22px] font-semibold italic tracking-tight">
                  {context === 'individual' ? 'Your' : context === 'team' ? 'Team' : 'Organisation'} AI Readiness
                </h2>
                <p className="text-[13px] text-[#86868b] mt-[4px]">How ready are you to adopt and scale AI automation</p>
              </div>
              <div className="text-left sm:text-center shrink-0">
                <div className="text-[40px] sm:text-[52px] font-bold tracking-tight text-[#0071e3] leading-none">{Math.round(analysisData.readiness_score)}%</div>
                <div className="text-[12px] text-[#86868b]">Overall Readiness</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
              {[
                { label: 'Data Quality', val: analysisData.readiness_data_quality, desc: 'How structured & accessible your data is' },
                { label: 'Process Clarity', val: analysisData.readiness_process_docs, desc: 'How rule-based & repeatable your workflows are' },
                { label: 'Tool Maturity', val: analysisData.readiness_tool_maturity, desc: 'How easily tools integrate with your stack' },
                { label: 'Error Tolerance', val: analysisData.readiness_team_skills, desc: 'How tolerant processes are to AI errors' },
              ].map(({ label, val, desc }) => (
                <div key={label} className="bg-[#fafafa] border border-[#e8e8ed] rounded-[14px] p-[16px]">
                  <div className={`text-[28px] font-bold mb-[4px] ${val == null ? 'text-[#86868b]' : val >= 70 ? 'text-green-600' : val >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {val != null ? Math.round(val) : '—'}
                  </div>
                  <div className="text-[12px] font-semibold text-[#1d1d1f]">{label}</div>
                  <div className="text-[10px] text-[#86868b] mt-[2px]">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ACTIONS
        ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap gap-[10px] pt-[8px]">
          <button onClick={() => downloadReport('docx')} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all">
            <Download className="h-[15px] w-[15px]" /> Download DOCX
          </button>
          <button onClick={() => downloadReport('pdf')} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all">
            <Download className="h-[15px] w-[15px]" /> Download PDF
          </button>
          <button onClick={downloadN8nWorkflow} className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white px-[20px] py-[11px] rounded-full font-semibold text-[14px] transition-all">
            <Download className="h-[15px] w-[15px]" /> n8n Workflow .json
          </button>
          <button onClick={handleShare} className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[20px] py-[11px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all">
            {copied ? <><Check className="h-[15px] w-[15px] text-green-600" /><span className="text-green-600">Copied!</span></> : <><Share2 className="h-[15px] w-[15px]" />Share Report</>}
          </button>
          <Link href={`/dashboard/results/${id}/roadmap`} className="inline-flex items-center gap-[8px] border border-[#d2d2d7] hover:border-[#b8b8bd] hover:bg-[#f5f5f7] px-[20px] py-[11px] rounded-full font-medium text-[14px] text-[#1d1d1f] transition-all">
            <Map className="h-[15px] w-[15px]" /> View Roadmap
          </Link>
        </div>

      </div>
    </div>
  )
}
