'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Search, Download, Loader2, Zap, CheckCircle } from 'lucide-react'
import { jobScanAPI, JobScanResponse } from '@/lib/api'
import { useAuth } from '@/lib/auth'

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

export default function JobScannerPage() {
  const router = useRouter()
  const { email: userEmail } = useAuth()

  const [jobTitle, setJobTitle] = useState('')
  const [industry, setIndustry] = useState('')
  const [context, setContext] = useState('individual')
  const [hourlyRate, setHourlyRate] = useState(75)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<JobScanResponse | null>(null)
  const [step, setStep] = useState<'idle' | 'searching' | 'analyzing' | 'done'>('idle')

  const handleScan = async () => {
    if (!jobTitle.trim()) return
    setError('')
    setLoading(true)
    setStep('searching')

    // Fake step progression for UX
    const t1 = setTimeout(() => setStep('analyzing'), 2500)

    try {
      const data = await jobScanAPI.scan(
        { job_title: jobTitle.trim(), industry: industry || undefined, analysis_context: context, hourly_rate: hourlyRate },
        userEmail || undefined,
      )
      clearTimeout(t1)
      setResult(data)
      setStep('done')
    } catch (e: unknown) {
      clearTimeout(t1)
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('idle')
    } finally {
      setLoading(false)
    }
  }

  const downloadN8n = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result.n8n_workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.job_title.replace(/\s+/g, '_')}_n8n_workflow.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const goToResults = () => {
    if (!result) return
    router.push(`/dashboard/results/${result.workflow_id}`)
  }


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

        {/* Form card */}
        <div className="bg-white rounded-[20px] border border-[#d2d2d7] p-8 shadow-sm">
          <div className="space-y-5">

            {/* Job title */}
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

            {/* Industry + Context row */}
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
                  {INDUSTRIES.filter(i => i).map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5">Analysis Context</label>
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

            {/* Hourly rate */}
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

            {/* Error */}
            {error && (
              <div className="bg-[#fff2f2] border border-[#ffd0d0] rounded-[10px] px-4 py-3 text-[13px] text-[#e8342a]">
                {error}
              </div>
            )}

            {/* Scan button */}
            <button
              onClick={handleScan}
              disabled={loading || !jobTitle.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#3a3a3c] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step === 'searching' ? 'Researching role online…' : 'Running AI analysis…'}
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


        {/* Results card */}
        {result && step === 'done' && (
          <div className="mt-6 bg-white rounded-[20px] border border-[#d2d2d7] p-8 shadow-sm space-y-6">

            {/* Success header */}
            <div className="flex items-center gap-3">
              <div className="bg-[#e8f5e9] rounded-full p-2">
                <CheckCircle className="h-5 w-5 text-[#2e7d32]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#1d1d1f]">
                  {result.job_title} — Scan Complete
                </p>
                <p className="text-[13px] text-[#6e6e73]">
                  {result.tasks_found} tasks extracted · {result.search_used ? 'Web research used' : 'Training knowledge used'}
                </p>
              </div>
            </div>

            {/* n8n download card */}
            <div className="bg-[#f5f5f7] rounded-[14px] p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5">
                  n8n Automation Workflow
                </p>
                <p className="text-[12px] text-[#6e6e73]">
                  Import this JSON directly into your n8n instance to deploy automations for this role.
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

            {/* CTA to full dashboard */}
            <button
              onClick={goToResults}
              className="w-full bg-[#1d1d1f] text-white font-semibold text-[15px] py-3.5 rounded-[12px] hover:bg-[#3a3a3c] transition"
            >
              View Full Analysis Dashboard →
            </button>

            {/* Scan another */}
            <button
              onClick={() => { setResult(null); setStep('idle'); setJobTitle('') }}
              className="w-full text-[#0071e3] text-[13px] font-medium py-2 hover:underline transition"
            >
              Scan another job title
            </button>
          </div>
        )}

        {/* How it works */}
        {step === 'idle' && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Web Research', desc: 'Searches job boards and real postings for this role' },
              { step: '2', title: 'AI Analysis', desc: 'Scores each task on automation potential, ROI, and risk' },
              { step: '3', title: 'n8n Workflow', desc: 'Generates a ready-to-import workflow JSON for your top tasks' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-[14px] border border-[#d2d2d7] p-4 text-center">
                <div className="text-[11px] font-bold text-[#0071e3] uppercase tracking-wider mb-2">Step {item.step}</div>
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
