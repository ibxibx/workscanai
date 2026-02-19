'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Zap, Clock, TrendingUp, Wrench,
  CheckCircle2, Circle, ArrowRight
} from 'lucide-react'

interface TaskResult {
  task: { name: string; description: string; frequency: string; time_per_task: number; category: string }
  ai_readiness_score: number
  time_saved_percentage: number
  recommendation: string
  difficulty: string
  estimated_hours_saved: number
}

interface AnalysisData {
  workflow: { name: string; description: string }
  automation_score: number
  hours_saved: number
  annual_savings: number
  results: TaskResult[]
}

const PHASE_CONFIG = {
  quick: {
    label: 'Phase 1 — Quick Wins',
    subtitle: 'Start here · 0–4 weeks',
    description: 'Easy automations with high ROI. No-code tools, immediate impact.',
    icon: Zap,
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700 border-green-200',
    iconColor: 'text-green-600',
  },
  medium: {
    label: 'Phase 2 — Medium-Term',
    subtitle: 'After phase 1 · 1–3 months',
    description: 'More complex automations requiring some setup or light coding.',
    icon: TrendingUp,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-[#0071e3]',
  },
  hard: {
    label: 'Phase 3 — Long-Term',
    subtitle: 'Strategic · 3–6 months',
    description: 'Custom development or AI model integrations for maximum efficiency.',
    icon: Wrench,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    iconColor: 'text-purple-600',
  },
}

const KNOWN_TOOLS: Record<string, string[]> = {
  zapier: ['bg-orange-100', 'text-orange-700'],
  make: ['bg-purple-100', 'text-purple-700'],
  buffer: ['bg-teal-100', 'text-teal-700'],
  hootsuite: ['bg-teal-100', 'text-teal-700'],
  calendly: ['bg-blue-100', 'text-blue-700'],
  python: ['bg-yellow-100', 'text-yellow-700'],
  chatgpt: ['bg-green-100', 'text-green-700'],
  claude: ['bg-orange-100', 'text-orange-700'],
  zendesk: ['bg-green-100', 'text-green-700'],
  intercom: ['bg-blue-100', 'text-blue-700'],
  tableau: ['bg-blue-100', 'text-blue-700'],
  notion: ['bg-gray-100', 'text-gray-700'],
  slack: ['bg-purple-100', 'text-purple-700'],
  asana: ['bg-pink-100', 'text-pink-700'],
}

function ToolTag({ name }: { name: string }) {
  const [bg, text] = KNOWN_TOOLS[name] ?? ['bg-gray-100', 'text-gray-600']
  return (
    <span className={`inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-medium ${bg} ${text}`}>
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </span>
  )
}

export default function RoadmapPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/results/${id}`)
        if (!r.ok) throw new Error()
        const d = await r.json()
        const wr = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${d.workflow_id}`)
        d.workflow = wr.ok ? await wr.json() : { name: 'Workflow', description: '' }
        setData(d)
      } catch {
        setError('Failed to load roadmap. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const toggleCheck = (key: string) => setChecked(c => ({ ...c, [key]: !c[key] }))

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-[88px] flex items-center justify-center">
        <div className="text-[17px] text-[#86868b]">Loading roadmap…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white pt-[88px] flex flex-col items-center justify-center gap-[16px]">
        <div className="text-[17px] text-red-600">{error}</div>
        <Link href={`/dashboard/results/${id}`} className="text-[#0071e3] hover:underline text-[15px]">
          Back to results
        </Link>
      </div>
    )
  }

  const byPhase = {
    quick: data.results.filter(r => r.difficulty === 'easy').sort((a, b) => b.ai_readiness_score - a.ai_readiness_score),
    medium: data.results.filter(r => r.difficulty === 'medium').sort((a, b) => b.ai_readiness_score - a.ai_readiness_score),
    hard: data.results.filter(r => r.difficulty === 'hard').sort((a, b) => b.ai_readiness_score - a.ai_readiness_score),
  }

  const totalChecked = Object.values(checked).filter(Boolean).length
  const totalTasks = data.results.length

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[80px]">
      <div className="max-w-[860px] mx-auto px-6">

        <Link href={`/dashboard/results/${id}`}
          className="inline-flex items-center gap-[6px] text-[14px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors mb-[40px]"
        >
          <ArrowLeft className="h-[14px] w-[14px]" /> Back to Results
        </Link>

        {/* Header */}
        <div className="mb-[48px]">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/20 to-transparent blur-[100px]" />
            <h1 className="relative text-[48px] leading-[1.08] font-semibold tracking-tight mb-[8px] px-[32px]">
              Implementation Roadmap
            </h1>
          </div>
          <p className="text-[19px] text-[#6e6e73]">{data.workflow.name}</p>
        </div>

        {/* Progress */}
        {totalTasks > 0 && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px] mb-[48px]">
            <div className="flex items-center justify-between mb-[16px]">
              <div>
                <div className="text-[17px] font-semibold mb-[2px]">Your Progress</div>
                <div className="text-[14px] text-[#6e6e73]">{totalChecked} of {totalTasks} automations marked complete</div>
              </div>
              <div className="text-[28px] font-semibold text-[#0071e3]">
                {Math.round((totalChecked / totalTasks) * 100)}%
              </div>
            </div>
            <div className="w-full h-[6px] bg-[#e8e8ed] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                style={{ width: `${(totalChecked / totalTasks) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Phase summary strip */}
        <div className="grid grid-cols-3 gap-[12px] mb-[56px]">
          {(Object.entries(byPhase) as [keyof typeof byPhase, TaskResult[]][]).map(([key, tasks]) => {
            const cfg = PHASE_CONFIG[key]
            const Icon = cfg.icon
            return (
              <div key={key} className={`${cfg.bg} ${cfg.border} border rounded-[14px] p-[20px] text-center`}>
                <Icon className={`h-[20px] w-[20px] ${cfg.iconColor} mx-auto mb-[8px]`} />
                <div className="text-[28px] font-semibold text-[#1d1d1f]">{tasks.length}</div>
                <div className="text-[13px] text-[#6e6e73]">
                  {key === 'quick' ? 'Quick wins' : key === 'medium' ? 'Medium-term' : 'Long-term'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Phases */}
        <div className="space-y-[48px]">
          {(Object.entries(byPhase) as [keyof typeof byPhase, TaskResult[]][]).map(([key, tasks]) => {
            if (tasks.length === 0) return null
            const cfg = PHASE_CONFIG[key]
            const Icon = cfg.icon
            const doneCount = tasks.filter((_, i) => checked[`${key}-${i}`]).length

            return (
              <div key={key}>
                {/* Phase header */}
                <div className={`${cfg.bg} ${cfg.border} border rounded-[18px] p-[32px] mb-[20px]`}>
                  <div className="flex items-start gap-[16px]">
                    <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-full bg-white border ${cfg.border} shrink-0`}>
                      <Icon className={`h-[22px] w-[22px] ${cfg.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-[10px] mb-[4px]">
                        <h2 className="text-[21px] font-semibold">{cfg.label}</h2>
                        <span className={`px-[10px] py-[3px] rounded-full text-[12px] font-semibold border ${cfg.badge}`}>
                          {doneCount}/{tasks.length} done
                        </span>
                      </div>
                      <p className="text-[14px] font-medium text-[#6e6e73] mb-[4px]">{cfg.subtitle}</p>
                      <p className="text-[14px] text-[#6e6e73]">{cfg.description}</p>
                    </div>
                  </div>
                </div>

                {/* Task cards */}
                <div className="space-y-[12px]">
                  {tasks.map((result, i) => {
                    const key_ = `${key}-${i}`
                    const isDone = !!checked[key_]
                    const tools = Object.keys(KNOWN_TOOLS).filter(t =>
                      result.recommendation.toLowerCase().includes(t)
                    )

                    return (
                      <div key={i} className={`border rounded-[14px] p-[28px] transition-all ${
                        isDone ? 'bg-[#f5f5f7] border-[#d2d2d7] opacity-60' : 'bg-white border-[#d2d2d7] hover:border-[#b8b8bd] hover:shadow-sm'
                      }`}>
                        <div className="flex items-start gap-[16px]">
                          <button type="button" onClick={() => toggleCheck(key_)} className="mt-[2px] shrink-0">
                            {isDone
                              ? <CheckCircle2 className="h-[22px] w-[22px] text-green-500" />
                              : <Circle className="h-[22px] w-[22px] text-[#d2d2d7] hover:text-[#86868b] transition-colors" />
                            }
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-[12px] mb-[12px]">
                              <h3 className={`text-[17px] font-semibold ${isDone ? 'line-through text-[#86868b]' : ''}`}>
                                {result.task.name}
                              </h3>
                              <div className="shrink-0 text-right">
                                <div className="text-[15px] font-semibold">{Math.round(result.ai_readiness_score)}%</div>
                                <div className="text-[11px] text-[#86868b]">AI ready</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-[16px] text-[13px] text-[#86868b] mb-[14px]">
                              <span className="flex items-center gap-[4px]">
                                <Clock className="h-[12px] w-[12px]" />
                                {Math.round(result.time_saved_percentage)}% time saved
                              </span>
                              <span className="flex items-center gap-[4px]">
                                <TrendingUp className="h-[12px] w-[12px]" />
                                {Math.round(result.estimated_hours_saved)} hrs/yr
                              </span>
                              {result.task.frequency && (
                                <span className="capitalize">{result.task.frequency}</span>
                              )}
                            </div>

                            <div className="bg-[#f5f5f7] rounded-[10px] px-[16px] py-[12px] text-[14px] text-[#1d1d1f] mb-[14px]">
                              <span className="font-semibold text-[#0071e3]">→ </span>
                              {result.recommendation}
                            </div>

                            {tools.length > 0 && (
                              <div className="flex flex-wrap gap-[6px]">
                                {tools.map(tool => <ToolTag key={tool} name={tool} />)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-[56px] pt-[40px] border-t border-[#d2d2d7] flex flex-col sm:flex-row items-center justify-between gap-[16px]">
          <div>
            <p className="text-[17px] font-semibold mb-[4px]">Ready to get started?</p>
            <p className="text-[14px] text-[#6e6e73]">Begin with Phase 1 quick wins for the fastest ROI.</p>
          </div>
          <Link href={`/dashboard/results/${id}`}
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all whitespace-nowrap"
          >
            View Full Analysis <ArrowRight className="h-[16px] w-[16px]" />
          </Link>
        </div>

      </div>
    </div>
  )
}
