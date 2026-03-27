'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase, Search, Download, Loader2, Zap, CheckCircle,
  ChevronRight, ExternalLink, Workflow, Package,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

const API_BASE   = process.env.NEXT_PUBLIC_API_URL || ''
const RENDER_URL = process.env.NEXT_PUBLIC_RENDER_URL || 'https://workscanai.onrender.com'

const INDUSTRIES = [
  '', 'Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales',
  'Operations', 'HR & Recruiting', 'Legal', 'Education', 'Consulting',
  'E-commerce', 'Real Estate', 'Media & Publishing',
]

const CONTEXTS = [
  { value: 'individual', label: 'Individual / Career' },
  { value: 'team',       label: 'Team / Startup'      },
  { value: 'company',    label: 'Company / Department' },
]

// ── Node-type badge colour map ───────────────────────────────────────────────
const NODE_COLOURS: Record<string, string> = {
  gmail:              'bg-[#fde8e8] text-[#c0392b]',
  gmailTrigger:       'bg-[#fde8e8] text-[#c0392b]',
  slack:              'bg-[#f0eaff] text-[#6b21a8]',
  googleSheets:       'bg-[#e8f5e9] text-[#2e7d32]',
  googleCalendar:     'bg-[#e3f2fd] text-[#1565c0]',
  jira:               'bg-[#e8eaf6] text-[#3949ab]',
  rssFeedRead:        'bg-[#fff8e1] text-[#f57f17]',
  scheduleTrigger:    'bg-[#f3f4f6] text-[#374151]',
  set:                'bg-[#f3f4f6] text-[#374151]',
  if:                 'bg-[#f3f4f6] text-[#374151]',
  httpRequest:        'bg-[#e0f7fa] text-[#00695c]',
  webhook:            'bg-[#e0f7fa] text-[#00695c]',
  openAi:             'bg-[#f0fdf4] text-[#166534]',
  microsoftOutlook:   'bg-[#e3f2fd] text-[#1565c0]',
  notion:             'bg-[#f3f4f6] text-[#374151]',
  airtable:           'bg-[#fce4ec] text-[#880e4f]',
  telegram:           'bg-[#e3f2fd] text-[#1565c0]',
}
function nodeColour(type: string) {
  const key = type.replace('n8n-nodes-base.', '')
  return NODE_COLOURS[key] || 'bg-[#f3f4f6] text-[#374151]'
}
function nodeName(type: string) {
  return type.replace('n8n-nodes-base.', '').replace(/([A-Z])/g, ' $1').trim()
}

// ── Types ────────────────────────────────────────────────────────────────────
interface TaskItem {
  name: string
  description?: string
  frequency?: string
  time_per_task?: number
  category?: string
  complexity?: string
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
}

interface AnalyzeResult {
  workflow_id: number
  share_code: string
  job_title: string
  tasks_found: number
  n8n_workflow: Record<string, unknown>
  suggested_templates: SuggestedTemplate[]
  message: string
}

type Step = 'idle' | 'researching' | 'analyzing' | 'done'

// ── Download helper ──────────────────────────────────────────────────────────
function downloadJson(data: Record<string, unknown>, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ tpl, jobTitle }: { tpl: SuggestedTemplate; jobTitle: string }) {
  return (
    <div className="bg-white rounded-[16px] border border-[#d2d2d7] p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-[#f0f7ff] rounded-[8px] p-1.5 shrink-0">
            <Workflow className="h-4 w-4 text-[#0071e3]" />
          </div>
          <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug line-clamp-2">{tpl.name}</p>
        </div>
        <a
          href={tpl.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[#0071e3] hover:text-[#0077ed] mt-0.5"
          title="View on n8n.io"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Relevance reason */}
      {tpl.relevance_reason && (
        <p className="text-[12px] text-[#6e6e73] leading-relaxed">
          {tpl.relevance_reason}
        </p>
      )}

      {/* Node badges */}
      {tpl.nodes_preview.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tpl.nodes_preview.slice(0, 5).map((n, i) => (
            <span
              key={i}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${nodeColour(n)}`}
            >
              {nodeName(n)}
            </span>
          ))}
          {tpl.nodes_preview.length > 5 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#6e6e73]">
              +{tpl.nodes_preview.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Download */}
      <button
        onClick={() => downloadJson(
          tpl.workflow_json,
          `${jobTitle.replace(/\s+/g, '_')}_n8n_template_${tpl.id}.json`
        )}
        className="mt-auto flex items-center justify-center gap-1.5 w-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[12px] font-semibold px-3 py-2 rounded-[8px] transition border border-[#d2d2d7]"
      >
        <Download className="h-3.5 w-3.5" />
        Import into n8n
      </button>
    </div>
  )
}

// ── Page component ───────────────────────────────────────────────────────────
export default function JobScannerPage() {
  const router   = useRouter()
  const { email: userEmail } = useAuth()

  const [jobTitle,    setJobTitle]    = useState('')
  const [industry,    setIndustry]    = useState('')
  const [context,     setContext]     = useState('individual')
  const [hourlyRate,  setHourlyRate]  = useState(75)
  const [step,        setStep]        = useState<Step>('idle')
  const [error,       setError]       = useState('')
  const [tasks,       setTasks]       = useState<TaskItem[]>([])
  const [result,      setResult]      = useState<AnalyzeResult | null>(null)

  const headers = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    ...(userEmail ? { 'x-user-email': userEmail } : {}),
    ...extra,
  })

  const handleScan = async () => {
    if (!jobTitle.trim()) return
    setError(''); setResult(null); setTasks([])

    // Step 1 — Research
    setStep('researching')
    let researchedTasks: TaskItem[] = []
    try {
      const r1 = await fetch(`${API_BASE}/api/job-scan/research`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ job_title: jobTitle.trim(), industry: industry || undefined, analysis_context: context }),
      })
      if (!r1.ok) { const e = await r1.json().catch(() => ({})); throw new Error(e.detail || `Research failed (${r1.status})`) }
      const d1 = await r1.json()
      researchedTasks = d1.tasks || []
      setTasks(researchedTasks)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Research step failed'); setStep('idle'); return }

    // Step 2 — Analyze (direct to Render, bypasses Vercel 60 s limit)
    setStep('analyzing')
    try {
      const r2 = await fetch(`${RENDER_URL}/api/job-scan/analyze`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          job_title: jobTitle.trim(), industry: industry || undefined,
          analysis_context: context, hourly_rate: hourlyRate, tasks: researchedTasks,
        }),
      })
      if (!r2.ok) { const e = await r2.json().catch(() => ({})); throw new Error(e.detail || `Analysis failed (${r2.status})`) }
      const d2 = await r2.json()
      setResult(d2)
      setStep('done')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Analysis step failed'); setStep('idle') }
  }

  const loading = step === 'researching' || step === 'analyzing'

  return (
    <div className="pt-[80px] pb-20 min-h-screen bg-[#f5f5f7]">
      <div className="max-w-[720px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4">
            <Zap className="h-3 w-3" /> New Feature
          </div>
          <h1 className="text-[40px] font-bold tracking-tight text-[#1d1d1f] leading-[1.1]">Job Scanner</h1>
          <p className="mt-3 text-[17px] text-[#6e6e73]">
            Enter any job title. We research the role, extract real tasks,<br />
            run a full AI analysis, and surface ready-to-import n8n workflows.
          </p>
        </div>

        {/* Progress stepper */}
        {loading && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[{ id: 'researching', label: 'Researching role' }, { id: 'analyzing', label: 'Analysing + fetching workflows' }].map((s, i) => {
              const isActive = step === s.id
              const isDone   = step === 'analyzing' && s.id === 'researching'
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${isActive ? 'bg-[#1d1d1f] text-white' : isDone ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#f5f5f7] text-[#a1a1a6]'}`}>
                    {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isDone   && <CheckCircle className="h-3 w-3" />}
                    {s.label}
                  </div>
                  {i === 0 && <ChevronRight className="h-3 w-3 text-[#a1a1a6]" />}
                </div>
              )
            })}
          </div>
        )}

        {/* Tasks preview during analysis */}
        {tasks.length > 0 && step === 'analyzing' && (
          <div className="bg-white rounded-[16px] border border-[#d2d2d7] p-5 mb-6">
            <p className="text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-3">
              {tasks.length} tasks found — analysing + finding n8n workflows…
            </p>
            <div className="space-y-1.5">
              {tasks.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shrink-0" />
                  {t.name}
                </div>
              ))}
              {tasks.length > 6 && <div className="text-[12px] text-[#a1a1a6] pl-3.5">+{tasks.length - 6} more…</div>}
            </div>
          </div>
        )}

        {/* Input form — hidden once done */}
        {step !== 'done' && (
          <div className="bg-white rounded-[20px] border border-[#d2d2d7] p-8 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Job Title <span className="text-[#e8342a]">*</span></label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6e6e73]" />
                  <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !loading && handleScan()}
                    placeholder="e.g. Marketing Manager, Data Analyst, Customer Success Manager"
                    className="w-full pl-10 pr-4 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Industry</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} disabled={loading}
                    className="w-full px-3 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition">
                    <option value="">Any industry</option>
                    {INDUSTRIES.filter(i => i).map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Context</label>
                  <select value={context} onChange={e => setContext(e.target.value)} disabled={loading}
                    className="w-full px-3 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition">
                    {CONTEXTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Hourly Rate (€) — for ROI calculation</label>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                  min={10} max={500} disabled={loading}
                  className="w-full px-4 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                />
              </div>
              {error && (
                <div className="bg-[#fff2f2] border border-[#ffd0d0] rounded-[10px] px-4 py-3 text-[13px] text-[#e8342a]">{error}</div>
              )}
              <button onClick={handleScan} disabled={loading || !jobTitle.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#3a3a3c] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{step === 'researching' ? 'Researching role online…' : 'Running AI analysis + fetching n8n workflows…'}</> : <><Search className="h-4 w-4" />Scan This Job</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {result && step === 'done' && (
          <div className="space-y-6">

            {/* Success banner */}
            <div className="bg-white rounded-[20px] border border-[#d2d2d7] p-6 shadow-sm flex items-center gap-3">
              <div className="bg-[#e8f5e9] rounded-full p-2 shrink-0">
                <CheckCircle className="h-5 w-5 text-[#2e7d32]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">{result.job_title} — Scan Complete</p>
                <p className="text-[13px] text-[#6e6e73]">{result.tasks_found} tasks extracted and fully analysed</p>
              </div>
            </div>

            {/* ── Suggested community templates ─────────────────────────── */}
            {result.suggested_templates && result.suggested_templates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-[#0071e3]" />
                  <h2 className="text-[15px] font-bold text-[#1d1d1f]">Recommended n8n Community Workflows</h2>
                </div>
                <p className="text-[13px] text-[#6e6e73] mb-4">
                  Real, community-tested automations curated for this role. Click <strong>Import into n8n</strong> to download, then import the JSON in your n8n instance.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.suggested_templates.map(tpl => (
                    <TemplateCard key={tpl.id} tpl={tpl} jobTitle={result.job_title} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Assembled fallback workflow ────────────────────────────── */}
            <div className="bg-[#f8f8f8] rounded-[16px] border border-[#d2d2d7] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5">
                    Combined Automation Workflow
                  </p>
                  <p className="text-[12px] text-[#6e6e73]">
                    A single workflow assembled from the top task categories for this role. Good starting point for customisation.
                  </p>
                </div>
                <button
                  onClick={() => downloadJson(result.n8n_workflow, `${result.job_title.replace(/\s+/g, '_')}_combined_workflow.json`)}
                  className="flex items-center gap-1.5 bg-[#1d1d1f] text-white text-[12px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-[#3a3a3c] transition shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .json
                </button>
              </div>
            </div>

            {/* CTA + reset */}
            <button onClick={() => router.push(`/dashboard/results/${result.workflow_id}`)}
              className="w-full bg-[#0071e3] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#0077ed] transition">
              View Full Analysis Dashboard →
            </button>
            <button onClick={() => { setResult(null); setStep('idle'); setJobTitle(''); setTasks([]) }}
              className="w-full text-[#0071e3] text-[13px] font-medium py-2 hover:underline">
              Scan another job title
            </button>
          </div>
        )}

        {/* How it works */}
        {step === 'idle' && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Web Research',       desc: 'Searches job boards for real tasks this role performs' },
              { n: '2', title: 'AI Analysis',        desc: 'Scores each task on automation potential, ROI, and risk' },
              { n: '3', title: 'n8n Workflows',      desc: 'Surfaces real community automations you can import instantly' },
            ].map(item => (
              <div key={item.n} className="bg-white rounded-[14px] border border-[#d2d2d7] p-4 text-center">
                <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider mb-2">Step {item.n}</div>
                <div className="text-[13px] font-semibold text-[#1d1d1f] mb-1">{item.title}</div>
                <div className="text-[12px] text-[#6e6e73]">{item.desc}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
