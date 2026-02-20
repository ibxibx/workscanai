'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Upload, FileText, Plus, Trash2, Loader2, ChevronDown, CheckCircle2, Circle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Task {
  name: string
  description: string
  frequency: string
  time_per_task: number
  category: string
  complexity: string
}

interface WorkflowFormProps {
  onAnalysisComplete: (workflowId: number) => void
  onError: (error: string) => void
}

// ── Progress steps shown during analysis ──────────────────────────────────────
const STEPS = [
  { id: 'saving',    label: 'Saving workflow',          detail: 'Storing your tasks…' },
  { id: 'captcha',   label: 'Verifying request',        detail: 'Running security check…' },
  { id: 'analyzing', label: 'AI analysis running',      detail: 'Claude is evaluating each task…' },
  { id: 'roi',       label: 'Calculating ROI',          detail: 'Estimating time & cost savings…' },
  { id: 'done',      label: 'Analysis complete',        detail: 'Redirecting to results…' },
]

// ── reCAPTCHA v3 helper ───────────────────────────────────────────────────────
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''

function loadRecaptchaScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve()
  if (document.getElementById('recaptcha-script')) return Promise.resolve()
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.id = 'recaptcha-script'
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

async function getRecaptchaToken(action: string): Promise<string> {
  if (!SITE_KEY) return ''
  await loadRecaptchaScript()
  return new Promise((resolve) => {
    ;(window as any).grecaptcha.ready(() => {
      ;(window as any).grecaptcha.execute(SITE_KEY, { action }).then(resolve)
    })
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkflowForm({ onAnalysisComplete, onError }: WorkflowFormProps) {
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([{
    name: '', description: '', frequency: 'weekly',
    time_per_task: 30, category: 'general', complexity: 'medium'
  }])
  const [inputMode, setInputMode] = useState<'manual' | 'voice' | 'document'>('manual')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hourlyRate, setHourlyRate] = useState(50)
  const [transcript, setTranscript] = useState('')

  // Progress state
  const [activeStep, setActiveStep] = useState<number>(-1)   // -1 = not started
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepError, setStepError] = useState<string | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const isAnalyzing = activeStep >= 0 && activeStep < STEPS.length - 1

  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Preload reCAPTCHA script on mount
  useEffect(() => { loadRecaptchaScript() }, [])

  // ── Progress helpers ─────────────────────────────────────────────────────
  const advanceTo = (step: number) => {
    setActiveStep(step)
    setCompletedSteps(prev => {
      const next = new Set(prev)
      for (let i = 0; i < step; i++) next.add(i)
      return next
    })
  }

  const resetProgress = () => {
    setActiveStep(-1)
    setCompletedSteps(new Set())
    setStepError(null)
    setRateLimitMessage(null)
  }

  // ── Task helpers ──────────────────────────────────────────────────────────
  const addTask = () => setTasks(t => [...t, {
    name: '', description: '', frequency: 'weekly',
    time_per_task: 30, category: 'general', complexity: 'medium'
  }])

  const removeTask = (i: number) => {
    if (tasks.length > 1) setTasks(t => t.filter((_, idx) => idx !== i))
  }

  const updateTask = (i: number, field: keyof Task, value: string | number) => {
    setTasks(t => { const n = [...t]; n[i] = { ...n[i], [field]: value }; return n })
  }

  // ── Voice / document ───────────────────────────────────────────────────────
  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      onError('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    let finalTranscript = ''
    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' '
        else interim += event.results[i][0].transcript
      }
      setTranscript(finalTranscript + interim)
    }
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') recognition.stop()
    }
    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
      if (finalTranscript.trim()) extractTasksFromText(finalTranscript.trim())
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsRecording(false)
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/extract-tasks`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error()
      const d = await r.json()
      await extractTasksFromText(d.text)
    } catch { onError('Failed to process document. Please try again.') }
    finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const extractTasksFromText = async (text: string) => {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/parse-tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      if (d.tasks?.length > 0) {
        setTasks(d.tasks)
        if (d.workflow_name) setWorkflowName(d.workflow_name)
        if (d.workflow_description) setWorkflowDescription(d.workflow_description)
      }
    } catch { onError('Failed to extract tasks. Please try manual input.') }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!workflowName.trim()) { onError('Please provide a workflow name'); return }
    if (!tasks.some(t => t.name.trim())) { onError('Please add at least one task'); return }
    onError('')
    setStepError(null)

    try {
      // Step 0 — save workflow
      advanceTo(0)
      const wfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName, description: workflowDescription,
          tasks: tasks.filter(t => t.name.trim()).map(t => ({
            name: t.name, description: t.description || t.name,
            frequency: t.frequency, time_per_task: t.time_per_task,
            category: t.category, complexity: t.complexity,
          })),
        }),
      })
      if (!wfRes.ok) {
        const err = await wfRes.json()
        throw new Error(err.detail || 'Failed to create workflow')
      }
      const workflow = await wfRes.json()

      // Step 1 — reCAPTCHA
      advanceTo(1)
      const recaptchaToken = await getRecaptchaToken('analyze_workflow')

      // Step 2 — AI analysis (longest step — show estimated task count)
      advanceTo(2)
      const analysisRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: workflow.id,
          hourly_rate: hourlyRate,
          recaptcha_token: recaptchaToken,
        }),
      })
      if (!analysisRes.ok) {
        const err = await analysisRes.json()
        if (analysisRes.status === 429) {
          // Show the friendly rate-limit card inside the overlay — don't dismiss it
          const msg = err.detail?.message || 'You have reached the daily analysis limit.'
          setRateLimitMessage(msg)
          return  // keep overlay open showing the rate-limit card
        }
        if (analysisRes.status === 403) {
          throw new Error(err.detail?.message || 'Security check failed. Please refresh and try again.')
        }
        throw new Error(err.detail || 'Failed to analyze workflow')
      }

      // Step 3 — ROI (already done server-side, just show the step briefly)
      advanceTo(3)
      await new Promise(r => setTimeout(r, 600))

      // Step 4 — done
      advanceTo(4)
      await new Promise(r => setTimeout(r, 700))

      onAnalysisComplete(workflow.id)
    } catch (err: any) {
      setStepError(err.message || 'Something went wrong. Please try again.')
      onError(err.message || 'Failed to analyze workflow.')
      resetProgress()
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputClass = "w-full px-[14px] py-[10px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
  const selectClass = `${inputClass} appearance-none cursor-pointer`
  const labelClass = "block text-[13px] font-medium text-[#6e6e73] mb-[6px] uppercase tracking-wide"

  // ── Progress overlay ──────────────────────────────────────────────────────
  const taskCount = tasks.filter(t => t.name.trim()).length
  const showProgress = activeStep >= 0 || rateLimitMessage !== null

  return (
    <>
      {/* ── Analysis progress overlay ─────────────────────────────────────── */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="bg-white border border-[#d2d2d7] rounded-[24px] shadow-2xl p-[48px] w-full max-w-[480px] mx-4">

            {/* ── Rate limit card ──────────────────────────────────────────── */}
            {rateLimitMessage ? (
              <div className="text-center">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-amber-50 border border-amber-200 mb-[24px]">
                  <span className="text-[32px]">☕</span>
                </div>

                <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-[16px]">
                  Daily limit reached
                </h2>

                {/* Multi-line message — backend sends \n\n paragraphs */}
                <div className="text-left bg-[#f5f5f7] border border-[#d2d2d7] rounded-[14px] px-[24px] py-[20px] mb-[28px] space-y-[12px]">
                  {rateLimitMessage.split('\n\n').map((para, i) => (
                    <p key={i} className={`text-[15px] leading-relaxed ${i === 0 ? 'font-medium text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                      {para}
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={resetProgress}
                  className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3d3d3f] text-white px-[28px] py-[14px] rounded-full font-semibold text-[15px] transition-all"
                >
                  Got it, close
                </button>
              </div>
            ) : (
              /* ── Normal progress stepper ─────────────────────────────────── */
              <>
                <div className="text-center mb-[40px]">
                  <div className="text-[24px] font-semibold text-[#1d1d1f] mb-[6px]">
                    {activeStep < STEPS.length - 1 ? 'Analyzing your workflow…' : 'All done!'}
                  </div>
                  {activeStep === 2 && taskCount > 1 && (
                    <p className="text-[14px] text-[#6e6e73]">
                      Running AI analysis on {taskCount} tasks — this takes {taskCount * 3}–{taskCount * 6}s
                    </p>
                  )}
                </div>

                {/* Step list */}
                <div className="space-y-[20px]">
                  {STEPS.map((step, i) => {
                    const isDone = completedSteps.has(i)
                    const isActive = activeStep === i

                    return (
                      <div key={step.id} className="flex items-center gap-[16px]">
                        <div className="shrink-0 w-[36px] h-[36px] flex items-center justify-center">
                          {isDone ? (
                            <CheckCircle2 className="h-[28px] w-[28px] text-green-500" />
                          ) : isActive ? (
                            <Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin" />
                          ) : (
                            <Circle className="h-[28px] w-[28px] text-[#d2d2d7]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-[15px] font-semibold transition-colors ${
                            isDone ? 'text-green-600' : isActive ? 'text-[#1d1d1f]' : 'text-[#86868b]'
                          }`}>
                            {step.label}
                          </div>
                          {isActive && (
                            <div className="text-[13px] text-[#6e6e73] mt-[2px]">{step.detail}</div>
                          )}
                        </div>
                        {isDone && (
                          <span className="text-[12px] font-medium text-green-600 bg-green-50 border border-green-200 px-[10px] py-[3px] rounded-full">
                            Done
                          </span>
                        )}
                        {isActive && activeStep < STEPS.length - 1 && (
                          <span className="text-[12px] font-medium text-[#0071e3] bg-blue-50 border border-blue-200 px-[10px] py-[3px] rounded-full">
                            Running
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-[36px]">
                  <div className="flex justify-between text-[12px] text-[#86868b] mb-[8px]">
                    <span>Progress</span>
                    <span>{Math.round((completedSteps.size / STEPS.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-[4px] bg-[#e8e8ed] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0071e3] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(completedSteps.size / STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>

                {SITE_KEY && (
                  <p className="text-[11px] text-[#86868b] text-center mt-[20px]">
                    Protected by reCAPTCHA ·{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline">Privacy</a>
                    {' · '}
                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener" className="underline">Terms</a>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-[24px]">

        {/* Input Mode Tabs */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[6px] flex gap-[4px]">
          {([
            { mode: 'manual',   icon: FileText, label: 'Manual Entry' },
            { mode: 'voice',    icon: Mic,      label: 'Voice Input' },
            { mode: 'document', icon: Upload,   label: 'Upload Document' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setInputMode(mode)}
              className={`flex-1 flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[12px] text-[15px] font-medium transition-all ${
                inputMode === mode
                  ? 'bg-white text-[#1d1d1f] shadow-sm border border-[#d2d2d7]'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
            >
              <Icon className="h-[16px] w-[16px]" />
              {label}
            </button>
          ))}
        </div>

        {/* Voice */}
        {inputMode === 'voice' && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <div className="mb-[20px]">
              <div className={`inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border mb-[16px] ${isRecording ? 'border-red-300' : 'border-[#d2d2d7]'}`}>
                <Mic className={`h-[28px] w-[28px] ${isRecording ? 'text-red-500' : 'text-[#6e6e73]'}`} />
              </div>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Voice Recording</h3>
              <p className="text-[15px] text-[#6e6e73] max-w-[420px] mx-auto">
                Describe your workflow and tasks verbally. Tasks will populate automatically when you stop.
              </p>
            </div>
            {!isRecording && (
              <button type="button" onClick={startVoiceRecording}
                className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">
                <Mic className="h-[18px] w-[18px]" /> Start Recording
              </button>
            )}
            {isRecording && (
              <div className="space-y-[16px]">
                <div className="flex items-center justify-center gap-[10px]">
                  <div className="w-[10px] h-[10px] bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[17px] font-medium text-red-600">Recording… speak now</span>
                </div>
                {transcript && (
                  <div className="bg-white border border-[#d2d2d7] rounded-[12px] p-[16px] text-left text-[14px] text-[#1d1d1f] max-h-[120px] overflow-y-auto">
                    {transcript}
                  </div>
                )}
                <button type="button" onClick={stopVoiceRecording}
                  className="inline-flex items-center gap-[8px] bg-red-500 hover:bg-red-600 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">
                  Stop &amp; Extract Tasks
                </button>
              </div>
            )}
            {isUploading && (
              <div className="flex items-center justify-center gap-[10px] text-[#6e6e73] mt-[16px]">
                <Loader2 className="animate-spin h-[20px] w-[20px]" />
                <span className="text-[15px]">Extracting tasks…</span>
              </div>
            )}
          </div>
        )}

        {/* Document Upload */}
        {inputMode === 'document' && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <input type="file" ref={fileInputRef} onChange={handleDocumentUpload}
              accept=".txt,.doc,.docx,.pdf,.png,.jpg,.jpeg" className="hidden" />
            <div className="mb-[20px]">
              <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]">
                <Upload className="h-[28px] w-[28px] text-[#6e6e73]" />
              </div>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Upload Document</h3>
              <p className="text-[15px] text-[#6e6e73] max-w-[420px] mx-auto">
                Upload a file with your workflow description. Supports PDF, Word, text, and images.
              </p>
            </div>
            {!isUploading ? (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">
                <Upload className="h-[18px] w-[18px]" /> Choose File
              </button>
            ) : (
              <div className="flex items-center justify-center gap-[10px] text-[#6e6e73]">
                <Loader2 className="animate-spin h-[20px] w-[20px]" />
                <span className="text-[15px]">Processing document…</span>
              </div>
            )}
            <p className="text-[13px] text-[#86868b] mt-[16px]">.txt · .doc · .docx · .pdf · .png · .jpg</p>
          </div>
        )}

        {/* Workflow Details */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
          <h2 className="text-[21px] font-semibold text-[#1d1d1f] mb-[28px]">Workflow Details</h2>
          <div className="space-y-[20px]">
            <div>
              <label className={labelClass}>Workflow Name <span className="text-red-500">*</span></label>
              <input type="text" value={workflowName} onChange={e => setWorkflowName(e.target.value)}
                placeholder="e.g., Marketing Team Workflow" className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
              <textarea value={workflowDescription} onChange={e => setWorkflowDescription(e.target.value)}
                placeholder="Describe your workflow or team…" rows={3} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Hourly Rate (€) — for ROI calculation</label>
              <div className="relative">
                <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]">€</span>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))}
                  min="1" className={`${inputClass} pl-[28px]`} />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks — manual mode and after voice populates */}
        {(inputMode === 'manual' || inputMode === 'voice') && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
            <div className="flex items-center justify-between mb-[28px]">
              <h2 className="text-[21px] font-semibold text-[#1d1d1f]">Tasks</h2>
              <button type="button" onClick={addTask}
                className="inline-flex items-center gap-[6px] border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] px-[16px] py-[8px] rounded-full text-[14px] font-medium transition-all">
                <Plus className="h-[14px] w-[14px]" /> Add Task
              </button>
            </div>
            <div className="space-y-[20px]">
              {tasks.map((task, idx) => (
                <div key={idx} className="bg-white border border-[#d2d2d7] rounded-[14px] p-[28px]">
                  <div className="flex items-center justify-between mb-[20px]">
                    <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">Task {idx + 1}</span>
                    {tasks.length > 1 && (
                      <button type="button" onClick={() => removeTask(idx)}
                        className="flex items-center gap-[4px] text-[13px] text-[#86868b] hover:text-red-500 transition-colors">
                        <Trash2 className="h-[14px] w-[14px]" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Task Name <span className="text-red-500">*</span></label>
                      <input type="text" value={task.name} onChange={e => updateTask(idx, 'name', e.target.value)}
                        placeholder="e.g., Write social media posts" className={inputClass} required />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
                      <input type="text" value={task.description} onChange={e => updateTask(idx, 'description', e.target.value)}
                        placeholder="Additional context or details…" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Frequency</label>
                      <div className="relative">
                        <select value={task.frequency} onChange={e => updateTask(idx, 'frequency', e.target.value)} className={selectClass}>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Time per Task (minutes)</label>
                      <input type="number" value={task.time_per_task} onChange={e => updateTask(idx, 'time_per_task', Number(e.target.value))}
                        min="1" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <div className="relative">
                        <select value={task.category} onChange={e => updateTask(idx, 'category', e.target.value)} className={selectClass}>
                          <option value="general">General</option>
                          <option value="data_entry">Data Entry</option>
                          <option value="communication">Communication</option>
                          <option value="analysis">Analysis</option>
                          <option value="creative">Creative</option>
                          <option value="administrative">Administrative</option>
                        </select>
                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Complexity</label>
                      <div className="relative">
                        <select value={task.complexity} onChange={e => updateTask(idx, 'complexity', e.target.value)} className={selectClass}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col items-end gap-[10px] pt-[8px]">
          {taskCount > 0 && (
            <p className="text-[13px] text-[#86868b]">
              Analyzing {taskCount} task{taskCount !== 1 ? 's' : ''} — estimated {taskCount * 3}–{taskCount * 6}s
            </p>
          )}
          <button
            type="submit"
            disabled={isAnalyzing || isUploading}
            className="inline-flex items-center gap-[10px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[36px] py-[16px] rounded-full font-semibold text-[17px] transition-all"
          >
            {isAnalyzing ? (
              <><Loader2 className="animate-spin h-[18px] w-[18px]" /> Running Analysis…</>
            ) : (
              'Analyze Workflow'
            )}
          </button>
        </div>

      </form>
    </>
  )
}
