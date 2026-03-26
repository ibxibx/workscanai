'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Search, Download, Loader2, Zap, CheckCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

const INDUSTRIES = [
  '', 'Technology', 'Finance', 'Healthcare', 'Marketing', 'Sales',
  'Operations', 'HR & Recruiting', 'Legal', 'Education', 'Consulting',
  'E-commerce', 'Real Estate', 'Media & Publishing',
]

const CONTEXTS = [
  { value: 'individual', label: 'Individual / Career' },
  { value: 'team', label: 'Team / Startup' },
  { value: 'company', label: 'Company / Department' },
]

interface TaskItem {
  name: string
  description?: string
  frequency?: string
  time_per_task?: number
  category?: string
  complexity?: string
}

interface AnalyzeResult {
  workflow_id: number
  share_code: string
  job_title: string
  tasks_found: number
  n8n_workflow: Record<string, unknown>
  message: string
}

type Step = 'idle' | 'researching' | 'analyzing' | 'done'

export default function JobScannerPage() {
  const router = useRouter()
  const { email: userEmail } = useAuth()

  const [jobTitle, setJobTitle] = useState('')
  const [industry, setIndustry] = useState('')
  const [context, setContext] = useState('individual')
  const [hourlyRate, setHourlyRate] = useState(75)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [result, setResult] = useState<AnalyzeResult | null>(null)

  const headers = (extra?: Record<string, string>) => ({
    'Content-Type': 'application/json',
    ...(userEmail ? { 'x-user-email': userEmail } : {}),
    ...extra,
  })

  const handleScan = async () => {
    if (!jobTitle.trim()) return
    setError('')
    setResult(null)
    setTasks([])

    // ── Step 1: Research ──────────────────────────────────────────
    setStep('researching')
    let researchedTasks: TaskItem[] = []
    try {
      const r1 = await fetch(`${API_BASE}/api/job-scan/research`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          industry: industry || undefined,
          analysis_context: context,
        }),
      })
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({}))
        throw new Error(e.detail || `Research failed (${r1.status})`)
      }
      const data = await r1.json()
      researchedTasks = data.tasks || []
      setTasks(researchedTasks)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Research step failed')
      setStep('idle')
      return
    }

    // ── Step 2: Analyze ───────────────────────────────────────────
    setStep('analyzing')
    try {
      const r2 = await fetch(`${API_BASE}/api/job-scan/analyze`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          industry: industry || undefined,
          analysis_context: context,
          hourly_rate: hourlyRate,
          tasks: researchedTasks,
        }),
      })
      if (!r2.ok) {
        const e = await r2.json().catch(() => ({}))
        throw new Error(e.detail || `Analysis failed (${r2.status})`)
      }
      const data = await r2.json()
      setResult(data)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis step failed')
      setStep('idle')
    }
  }

  const downloadN8n = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result.n8n_workflow, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.job_title.replace(/\s+/g, '_')}_n8n_workflow.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loading = step === 'researching' || step === 'analyzing'


  return (
    <div className="pt-[80px] pb-20 min-h-screen bg-[#f5f5f7]">
      <div className="max-w-[680px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-[11px] font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4">
            <Zap className="h-3 w-3" /> New Feature
          </div>
          <h1 className="text-[40px] font-bold tracking-tight text-[#1d1d1f] leading-[1.1]">
            Job Scanner
          </h1>
          <p className="mt-3 text-[17px] text-[#6e6e73]">
            Enter any job title. We research the role, extract real tasks,<br />
            run a full AI analysis, and generate a ready-to-import n8n workflow.
          </p>
        </div>

        {/* Progress stepper — visible during loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 mb-8">
            {[
              { id: 'researching', label: 'Researching role' },
              { id: 'analyzing',   label: 'Analysing tasks'  },
            ].map((s, i) => {
              const isActive = step === s.id
              const isDone   = step === 'analyzing' && s.id === 'researching'
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    isActive ? 'bg-[#1d1d1f] text-white' :
                    isDone   ? 'bg-[#e8f5e9] text-[#2e7d32]' :
                               'bg-[#f5f5f7] text-[#a1a1a6]'
                  }`}>
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

        {/* Tasks preview — shown after research completes */}
        {tasks.length > 0 && step === 'analyzing' && (
          <div className="bg-white rounded-[16px] border border-[#d2d2d7] p-5 mb-6">
            <p className="text-[12px] font-semibold text-[#6e6e73] uppercase tracking-wider mb-3">
              {tasks.length} tasks found — now analysing…
            </p>
            <div className="space-y-1.5">
              {tasks.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shrink-0" />
                  {t.name}
                </div>
              ))}
              {tasks.length > 6 && (
                <div className="text-[12px] text-[#a1a1a6] pl-3.5">
                  +{tasks.length - 6} more…
                </div>
              )}
            </div>
          </div>
        )}


        {/* Input form — hidden once done */}
        {step !== 'done' && (
          <div className="bg-white rounded-[20px] border border-[#d2d2d7] p-8 shadow-sm">
            <div className="space-y-5">

              <div>
                <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">
                  Job Title <span className="text-[#e8342a]">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6e6e73]" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
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
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                    disabled={loading}
                  >
                    <option value="">Any industry</option>
                    {INDUSTRIES.filter(i => i).map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Context</label>
                  <select
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    className="w-full px-3 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                    disabled={loading}
                  >
                    {CONTEXTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">
                  Hourly Rate (€) — for ROI calculation
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(Number(e.target.value))}
                  min={10} max={500}
                  className="w-full px-4 py-3 rounded-[10px] border border-[#d2d2d7] text-[15px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-[#fff2f2] border border-[#ffd0d0] rounded-[10px] px-4 py-3 text-[13px] text-[#e8342a]">
                  {error}
                </div>
              )}

              <button
                onClick={handleScan}
                disabled={loading || !jobTitle.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#3a3a3c] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {step === 'researching' ? 'Researching role online…' : 'Running AI analysis…'}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Scan This Job
                  </>
                )}
              </button>
            </div>
          </div>
        )}


        {/* Results card */}
        {result && step === 'done' && (
          <div className="bg-white rounded-[20px] border border-[#d2d2d7] p-8 shadow-sm space-y-6">

            <div className="flex items-center gap-3">
              <div className="bg-[#e8f5e9] rounded-full p-2">
                <CheckCircle className="h-5 w-5 text-[#2e7d32]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">
                  {result.job_title} — Scan Complete
                </p>
                <p className="text-[13px] text-[#6e6e73]">
                  {result.tasks_found} tasks extracted and fully analysed
                </p>
              </div>
            </div>

            {/* n8n download */}
            <div className="bg-[#f0f7ff] rounded-[14px] border border-[#cce0ff] p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5">
                  n8n Automation Workflow
                </p>
                <p className="text-[12px] text-[#6e6e73]">
                  Import this JSON directly into n8n to deploy automations for this role.
                </p>
              </div>
              <button
                onClick={downloadN8n}
                className="flex items-center gap-1.5 bg-[#0071e3] text-white text-[13px] font-semibold px-4 py-2.5 rounded-[10px] hover:bg-[#0077ed] transition shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download .json
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={() => router.push(`/dashboard/results/${result.workflow_id}`)}
              className="w-full bg-[#1d1d1f] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#3a3a3c] transition"
            >
              View Full Analysis Dashboard →
            </button>

            <button
              onClick={() => { setResult(null); setStep('idle'); setJobTitle(''); setTasks([]) }}
              className="w-full text-[#0071e3] text-[13px] font-medium py-2 hover:underline"
            >
              Scan another job title
            </button>
          </div>
        )}

        {/* How it works — only on idle */}
        {step === 'idle' && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: '1', title: 'Web Research',   desc: 'Searches job boards for real tasks this role performs' },
              { n: '2', title: 'AI Analysis',    desc: 'Scores each task on automation potential, ROI, and risk' },
              { n: '3', title: 'n8n Workflow',   desc: 'Generates a ready-to-import workflow JSON for your n8n' },
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
