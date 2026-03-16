'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Upload, FileText, Plus, Trash2, Loader2, ChevronDown,
         CheckCircle2, Circle, Mail, ArrowRight, X, RefreshCw } from 'lucide-react'
import { saveMyWorkflowId } from '@/app/dashboard/page'
import { useAuth } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────
export type AnalysisContext = 'individual' | 'team' | 'company'

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
  { id: 'saving',    label: 'Saving workflow',     detail: 'Storing your tasks…' },
  { id: 'captcha',   label: 'Verifying request',   detail: 'Running security check…' },
  { id: 'analyzing', label: 'AI analysis running', detail: 'Claude is evaluating each task…' },
  { id: 'roi',       label: 'Calculating ROI',     detail: 'Estimating time & cost savings…' },
  { id: 'done',      label: 'Analysis complete',   detail: 'Redirecting to results…' },
]

// ── Auth modal steps ──────────────────────────────────────────────────────────
type AuthStep = 'email' | 'code' | 'success'

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
  const { email: sessionEmail, isLoaded: authLoaded } = useAuth()

  // ── Form state ──────────────────────────────────────────────────────────────
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([{
    name: '', description: '', frequency: 'weekly',
    time_per_task: 30, category: 'general', complexity: 'medium'
  }])
  const [inputMode, setInputMode] = useState<'manual' | 'voice' | 'document'>('manual')
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext>('individual')
  const [teamSize, setTeamSize] = useState<string>('')
  const [industry, setIndustry] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)      // 0-100 simulated %
  const [uploadStage, setUploadStage] = useState('')            // stage label
  const [hourlyRate, setHourlyRate] = useState(50)
  const [transcript, setTranscript] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [isExtractingTasks, setIsExtractingTasks] = useState(false)
  const [extractStatus, setExtractStatus] = useState<'idle' | 'extracting' | 'done'>('idle')

  // ── Analysis progress state ─────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<number>(-1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepError, setStepError] = useState<string | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const isAnalyzing = activeStep >= 0 && activeStep < STEPS.length - 1

  // ── Inline auth modal state ─────────────────────────────────────────────────
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('email')
  const [authEmail, setAuthEmailState] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  // Pending workflow data saved before showing the modal
  const pendingSubmitRef = useRef(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Preload reCAPTCHA script on mount
  useEffect(() => { loadRecaptchaScript() }, [])

  // After successful auth inside modal, auto-trigger the analysis
  useEffect(() => {
    if (authLoaded && sessionEmail && pendingSubmitRef.current) {
      pendingSubmitRef.current = false
      setShowAuthModal(false)
      runAnalysis(sessionEmail)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEmail, authLoaded])

  // Focus code input when we reach the code step
  useEffect(() => {
    if (authStep === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 100)
    }
  }, [authStep])


  // ── Progress helpers ──────────────────────────────────────────────────────
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

  // ── Auth modal helpers ────────────────────────────────────────────────────
  const sendAuthCode = async () => {
    if (!authEmail.trim() || !authEmail.includes('@')) {
      setAuthError('Please enter a valid email address.')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Failed to send code')
      }
      setAuthStep('code')
    } catch (e: any) {
      setAuthError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const verifyAuthCode = async () => {
    if (authCode.length !== 4) {
      setAuthError('Please enter the 4-digit code from your email.')
      return
    }
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim(), code: authCode.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.detail || 'Invalid code')
      // Persist session
      localStorage.setItem('wsai_email', d.email)
      // Dispatch storage event so AuthProvider picks it up in same tab
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'wsai_email', newValue: d.email
      }))
      setAuthStep('success')
      // Short pause to show success, then trigger analysis
      setTimeout(() => {
        pendingSubmitRef.current = false
        setShowAuthModal(false)
        runAnalysis(d.email)
      }, 1000)
    } catch (e: any) {
      setAuthError(e.message || 'Incorrect code. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const openAuthModal = () => {
    setShowAuthModal(true)
    setAuthStep('email')
    setAuthEmailState('')
    setAuthCode('')
    setAuthError('')
    pendingSubmitRef.current = true
  }


  // ── Voice / document ──────────────────────────────────────────────────────
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
      if (finalTranscript.trim()) {
        setSourceText(finalTranscript.trim())
        extractTasksFromText(finalTranscript.trim())
      }
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
    setUploadProgress(0)
    setUploadStage('Reading file…')
    onError('')

    // Simulated progress ticker — advances up to 90% while real work runs
    let fakeProgress = 0
    const STAGES = [
      { at: 5,  label: 'Reading file…' },
      { at: 20, label: 'Extracting text…' },
      { at: 45, label: 'Parsing document structure…' },
      { at: 65, label: 'Running AI analysis…' },
      { at: 82, label: 'Populating tasks…' },
      { at: 91, label: 'Almost done…' },
    ]
    const ticker = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + (Math.random() * 3 + 1), 91)
      setUploadProgress(Math.round(fakeProgress))
      const stage = [...STAGES].reverse().find(s => fakeProgress >= s.at)
      if (stage) setUploadStage(stage.label)
    }, 350)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`/api/extract-tasks`, { method: 'POST', body: fd })
      if (!r.ok) throw new Error('upload')
      const d = await r.json()
      setSourceText(d.text || '')
      setUploadProgress(93)
      setUploadStage('Extracting tasks with AI…')
      try {
        await extractTasksFromText(d.text)
      } catch {
        // extraction failed — user can fill manually, no error shown
      }
      setUploadProgress(100)
      setUploadStage('Done!')
    } catch (err: any) {
      if (err?.message === 'upload') {
        onError('Could not read this file. Please try a PDF, Word doc, or text file.')
      }
    } finally {
      clearInterval(ticker)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setUploadStage('')
      }, 900)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const extractTasksFromText = async (text: string) => {
    setIsExtractingTasks(true)
    setExtractStatus('extracting')
    try {
      const r = await fetch(`/api/parse-tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!r.ok) throw new Error()
      const d = await r.json()
      if (d.tasks?.length > 0) {
        setTasks(d.tasks)
        if (d.workflow_name) setWorkflowName(d.workflow_name)
        if (d.workflow_description) setWorkflowDescription(d.workflow_description)
        setExtractStatus('done')
        setTimeout(() => {
          setIsExtractingTasks(false)
          setExtractStatus('idle')
        }, 2000)
      } else {
        setIsExtractingTasks(false)
        setExtractStatus('idle')
      }
    } catch {
      setIsExtractingTasks(false)
      setExtractStatus('idle')
      // Don't surface extraction errors — tasks may be partially populated
      // and the user can fill in or edit manually
    }
  }


  // ── Core analysis runner (separated so it can be called after auth) ───────
  const runAnalysis = async (userEmail: string) => {
    // Validation already done in handleSubmit before modal opens
    onError('')
    setStepError(null)

    const effectiveSourceText = sourceText.trim() ||
      (inputMode === 'manual' && workflowDescription.trim() ? workflowDescription.trim() : '')

    try {
      advanceTo(0)
      const wfRes = await fetch(`/api/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          name: workflowName, description: workflowDescription,
          source_text: effectiveSourceText || undefined,
          input_mode: inputMode,
          analysis_context: analysisContext,
          team_size: teamSize || undefined,
          industry: industry || undefined,
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
      saveMyWorkflowId(workflow.id)

      advanceTo(1)
      const recaptchaToken = await getRecaptchaToken('analyze_workflow')

      advanceTo(2)
      const analysisRes = await fetch(`/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          workflow_id: workflow.id,
          hourly_rate: hourlyRate,
          recaptcha_token: recaptchaToken,
        }),
      })
      if (!analysisRes.ok) {
        const err = await analysisRes.json()
        if (analysisRes.status === 429) {
          const msg = err.detail?.message || 'You have reached the daily analysis limit.'
          setRateLimitMessage(msg)
          return
        }
        if (analysisRes.status === 403) {
          throw new Error(err.detail?.message || 'Security check failed. Please refresh and try again.')
        }
        throw new Error(err.detail || 'Failed to analyze workflow')
      }

      advanceTo(3)
      await new Promise(r => setTimeout(r, 600))

      advanceTo(4)
      await new Promise(r => setTimeout(r, 700))

      onAnalysisComplete(workflow.id)
    } catch (err: any) {
      setStepError(err.message || 'Something went wrong. Please try again.')
      onError(err.message || 'Failed to analyze workflow.')
      resetProgress()
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!workflowName.trim()) { onError('Please provide a workflow name'); return }
    if (!tasks.some(t => t.name.trim())) { onError('Please add at least one task'); return }

    if (!sessionEmail) {
      // Not signed in — show inline auth modal, preserve all form state
      openAuthModal()
      return
    }
    await runAnalysis(sessionEmail)
  }


  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputClass = "w-full px-[14px] py-[10px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
  const selectClass = `${inputClass} appearance-none cursor-pointer`
  const labelClass = "block text-[13px] font-medium text-[#6e6e73] mb-[6px] uppercase tracking-wide"

  const taskCount = tasks.filter(t => t.name.trim()).length
  const showProgress = activeStep >= 0 || rateLimitMessage !== null

  // ── Auth modal ─────────────────────────────────────────────────────────────
  const AuthModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-[#d2d2d7] rounded-[24px] shadow-2xl w-full max-w-[420px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-[32px] pt-[28px] pb-[20px] border-b border-[#f0f0f5]">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
              {authStep === 'success' ? 'You\'re signed in!' : 'Sign in to run analysis'}
            </h2>
            <p className="text-[13px] text-[#6e6e73] mt-[3px]">
              {authStep === 'email' && 'Your workflow is ready — just sign in first.'}
              {authStep === 'code'  && `We sent a 6-digit code to ${authEmail}`}
              {authStep === 'success' && 'Starting your analysis now…'}
            </p>
          </div>
          {authStep !== 'success' && (
            <button
              onClick={() => { setShowAuthModal(false); pendingSubmitRef.current = false }}
              className="ml-[16px] shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-[#f5f5f7] transition-colors text-[#86868b] hover:text-[#1d1d1f]"
            >
              <X className="w-[16px] h-[16px]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-[32px] py-[28px] space-y-[16px]">

          {/* ── Success state ── */}
          {authStep === 'success' && (
            <div className="text-center py-[8px]">
              <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-green-50 border border-green-200 mb-[16px]">
                <CheckCircle2 className="w-[32px] h-[32px] text-green-500" />
              </div>
              <p className="text-[15px] text-[#6e6e73]">Analysis is starting…</p>
            </div>
          )}

          {/* ── Email entry step ── */}
          {authStep === 'email' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-[8px]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#86868b]" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={e => { setAuthEmailState(e.target.value); setAuthError('') }}
                    onKeyDown={e => e.key === 'Enter' && sendAuthCode()}
                    placeholder="you@company.com"
                    autoFocus
                    className="w-full pl-[42px] pr-[14px] py-[12px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                  />
                </div>
              </div>
              {authError && <p className="text-[13px] text-red-500">{authError}</p>}
              <button
                onClick={sendAuthCode}
                disabled={authLoading || !authEmail.includes('@')}
                className="w-full flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed text-white py-[13px] rounded-[12px] text-[15px] font-semibold transition-all"
              >
                {authLoading
                  ? <><Loader2 className="animate-spin w-[16px] h-[16px]" /> Sending…</>
                  : <> Send login code <ArrowRight className="w-[16px] h-[16px]" /></>
                }
              </button>
              <p className="text-[12px] text-[#86868b] text-center">
                No password needed · Free tier: 5 analyses / 24 h
              </p>
            </>
          )}


          {/* ── Code entry step ── */}
          {authStep === 'code' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-[8px]">
                  Enter 4-digit code
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={authCode}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    setAuthCode(v)
                    setAuthError('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && authCode.length === 4 && verifyAuthCode()}
                  placeholder="0000"
                  className="w-full text-center text-[40px] font-bold tracking-[18px] py-[16px] bg-white border border-[#d2d2d7] rounded-[12px] text-[#1d1d1f] placeholder-[#d2d2d7] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
                />
                <p className="text-[12px] text-[#86868b] mt-[8px] text-center">
                  Check your inbox — code expires in 15 minutes
                </p>
              </div>
              {authError && <p className="text-[13px] text-red-500 text-center">{authError}</p>}
              <button
                onClick={verifyAuthCode}
                disabled={authLoading || authCode.length !== 4}
                className="w-full flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed text-white py-[13px] rounded-[12px] text-[15px] font-semibold transition-all"
              >
                {authLoading
                  ? <><Loader2 className="animate-spin w-[16px] h-[16px]" /> Verifying…</>
                  : <><CheckCircle2 className="w-[16px] h-[16px]" /> Verify &amp; Analyze</>
                }
              </button>
              <div className="flex items-center justify-between text-[13px]">
                <button
                  onClick={() => { setAuthStep('email'); setAuthCode(''); setAuthError('') }}
                  className="text-[#6e6e73] hover:text-[#1d1d1f] flex items-center gap-[4px] transition-colors"
                >
                  ← Change email
                </button>
                <button
                  onClick={sendAuthCode}
                  disabled={authLoading}
                  className="text-[#0071e3] hover:underline flex items-center gap-[4px] disabled:opacity-50"
                >
                  <RefreshCw className="w-[12px] h-[12px]" /> Resend code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )


  return (
    <>
      {/* ── Inline auth modal ──────────────────────────────────────────────── */}
      {showAuthModal && <AuthModal />}

      {/* ── Analysis progress overlay ─────────────────────────────────────── */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="bg-white border border-[#d2d2d7] rounded-[24px] shadow-2xl p-[48px] w-full max-w-[480px] mx-4">

            {/* Rate limit card */}
            {rateLimitMessage ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-amber-50 border border-amber-200 mb-[24px]">
                  <span className="text-[32px]">☕</span>
                </div>
                <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-[16px]">Daily limit reached</h2>
                <div className="text-left bg-[#f5f5f7] border border-[#d2d2d7] rounded-[14px] px-[24px] py-[20px] mb-[28px] space-y-[12px]">
                  {rateLimitMessage.split('\n\n').map((para, i) => (
                    <p key={i} className={`text-[15px] leading-relaxed ${i === 0 ? 'font-medium text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                      {para}
                    </p>
                  ))}
                </div>
                <button type="button" onClick={resetProgress}
                  className="inline-flex items-center gap-[8px] bg-[#1d1d1f] hover:bg-[#3d3d3f] text-white px-[28px] py-[14px] rounded-full font-semibold text-[15px] transition-all">
                  Got it, close
                </button>
              </div>
            ) : (
              /* Normal progress stepper */
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
                <div className="space-y-[20px]">
                  {STEPS.map((step, i) => {
                    const isDone = completedSteps.has(i)
                    const isActive = activeStep === i
                    return (
                      <div key={step.id} className="flex items-center gap-[16px]">
                        <div className="shrink-0 w-[36px] h-[36px] flex items-center justify-center">
                          {isDone ? <CheckCircle2 className="h-[28px] w-[28px] text-green-500" />
                            : isActive ? <Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin" />
                            : <Circle className="h-[28px] w-[28px] text-[#d2d2d7]" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-[15px] font-semibold transition-colors ${
                            isDone ? 'text-green-600' : isActive ? 'text-[#1d1d1f]' : 'text-[#86868b]'}`}>
                            {step.label}
                          </div>
                          {isActive && <div className="text-[13px] text-[#6e6e73] mt-[2px]">{step.detail}</div>}
                        </div>
                        {isDone && <span className="text-[12px] font-medium text-green-600 bg-green-50 border border-green-200 px-[10px] py-[3px] rounded-full">Done</span>}
                        {isActive && activeStep < STEPS.length - 1 && <span className="text-[12px] font-medium text-[#0071e3] bg-blue-50 border border-blue-200 px-[10px] py-[3px] rounded-full">Running</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-[36px]">
                  <div className="flex justify-between text-[12px] text-[#86868b] mb-[8px]">
                    <span>Progress</span>
                    <span>{Math.round((completedSteps.size / STEPS.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-[4px] bg-[#e8e8ed] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0071e3] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(completedSteps.size / STEPS.length) * 100}%` }} />
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


      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-[24px]">

        {/* Input Mode Tabs */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[6px] flex flex-wrap gap-[4px]">
          {([
            { mode: 'manual',   icon: FileText, label: 'Manual Entry' },
            { mode: 'voice',    icon: Mic,      label: 'Voice Input' },
            { mode: 'document', icon: Upload,   label: 'Upload Document' },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button key={mode} type="button" onClick={() => setInputMode(mode)}
              className={`flex-1 flex items-center justify-center gap-[8px] px-[16px] py-[12px] rounded-[12px] text-[15px] font-medium transition-all ${
                inputMode === mode
                  ? 'bg-white text-[#1d1d1f] shadow-sm border border-[#d2d2d7]'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}>
              <Icon className="h-[16px] w-[16px]" />{label}
            </button>
          ))}
        </div>

        {/* Voice */}
        {inputMode === 'voice' && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <div className="mb-[20px]">
              <button type="button" onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={`inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border mb-[16px] transition-all hover:scale-105 active:scale-95 ${isRecording ? 'border-red-300 hover:border-red-400' : 'border-[#d2d2d7] hover:border-[#0071e3]'}`}>
                <Mic className={`h-[28px] w-[28px] ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#6e6e73]'}`} />
              </button>
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
                  <div className="bg-white border border-[#d2d2d7] rounded-[12px] p-[16px] text-left text-[14px] text-[#1d1d1f] max-h-[120px] overflow-y-auto">{transcript}</div>
                )}
                <button type="button" onClick={stopVoiceRecording}
                  className="inline-flex items-center gap-[8px] bg-red-500 hover:bg-red-600 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">
                  Stop &amp; Extract Tasks
                </button>
              </div>
            )}
            {!isRecording && isExtractingTasks && (
              <div className={`mt-[20px] inline-flex items-center gap-[10px] px-[20px] py-[12px] rounded-full text-[15px] font-medium transition-all ${
                extractStatus === 'done' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-[#0071e3]'}`}>
                {extractStatus === 'done'
                  ? <><CheckCircle2 className="h-[18px] w-[18px]" /> Tasks populated — scroll down to review</>
                  : <><Loader2 className="animate-spin h-[18px] w-[18px]" /> Extracting and populating tasks…</>}
              </div>
            )}
          </div>
        )}

        {/* Document Upload */}
        {inputMode === 'document' && (
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <input type="file" ref={fileInputRef} onChange={handleDocumentUpload}
              accept=".txt,.md,.rst,.rtf,.csv,.tsv,.json,.xml,.html,.yaml,.yml,.log,.pdf,.doc,.docx,.odt,.xls,.xlsx,.xlsm,.xlsb,.ods,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.avif,.ico,.svg"
              className="hidden" />

            {!isUploading ? (
              <>
                <div className="mb-[20px]">
                  <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]">
                    <Upload className="h-[28px] w-[28px] text-[#6e6e73]" />
                  </div>
                  <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Upload Document</h3>
                  <p className="text-[15px] text-[#6e6e73] max-w-[440px] mx-auto">
                    Upload any business document — AI extracts and structures your workflow tasks automatically.
                  </p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all mb-[20px]">
                  <Upload className="h-[18px] w-[18px]" /> Choose File
                </button>
                <div className="text-[12px] text-[#86868b] space-y-[4px]">
                  <p>📄 Documents · PDF · Word (.doc/.docx) · ODT · RTF · TXT · Markdown</p>
                  <p>📊 Spreadsheets · Excel (.xlsx/.xls/.xlsm) · ODS · CSV · TSV</p>
                  <p>📑 Presentations · PowerPoint (.pptx/.ppt)</p>
                  <p>🖼 Images · PNG · JPG · WebP · GIF · BMP · TIFF · HEIC · SVG · ICO</p>
                  <p>🗂 Data · JSON · XML · YAML · HTML · LOG</p>
                </div>
              </>
            ) : (
              /* ── Rich upload progress ── */
              <div className="py-[8px]">
                <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white border border-[#d2d2d7] mb-[20px]">
                  {uploadProgress < 100
                    ? <Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin" />
                    : <CheckCircle2 className="h-[28px] w-[28px] text-green-500" />
                  }
                </div>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-[6px]">
                  {uploadProgress < 100 ? 'Analysing your document…' : 'Tasks extracted!'}
                </h3>
                <p className="text-[14px] text-[#6e6e73] mb-[24px]">{uploadStage}</p>

                {/* Progress bar */}
                <div className="w-full max-w-[360px] mx-auto mb-[12px]">
                  <div className="flex justify-between text-[12px] text-[#86868b] mb-[6px]">
                    <span>Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-[6px] bg-[#e8e8ed] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${uploadProgress}%`,
                        background: uploadProgress === 100
                          ? '#22c55e'
                          : 'linear-gradient(90deg, #0071e3, #34aadc)',
                      }}
                    />
                  </div>
                </div>

                {/* Stage pills */}
                <div className="flex flex-wrap justify-center gap-[6px] max-w-[400px] mx-auto">
                  {['Reading file', 'Extracting text', 'AI parsing', 'Populating tasks'].map((s, i) => {
                    const thresholds = [5, 25, 55, 90]
                    const done = uploadProgress >= thresholds[i]
                    const active = uploadProgress >= thresholds[i] && (i === 3 ? uploadProgress < 100 : uploadProgress < thresholds[i + 1])
                    return (
                      <span key={s} className={`text-[11px] px-[10px] py-[4px] rounded-full border font-medium transition-all ${
                        uploadProgress >= 100 ? 'bg-green-50 border-green-200 text-green-700'
                        : done ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]'
                        : 'bg-white border-[#e8e8ed] text-[#86868b]'
                      }`}>
                        {done && uploadProgress < 100 ? '✓ ' : ''}{s}
                      </span>
                    )
                  })}
                </div>

                <p className="text-[12px] text-[#86868b] mt-[20px]">
                  This can take 15–30 seconds for large documents — hang tight
                </p>
              </div>
            )}
          </div>
        )}


        {/* ── Analysis Context Selector ─────────────────────────────── */}
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-[6px]">Who is this analysis for?</h2>
          <p className="text-[13px] text-[#86868b] mb-[20px]">
            WorkScanAI adapts its scoring, framing, and recommendations based on whether you're analysing tasks for yourself, a team, or a company.
          </p>
          <div className="grid grid-cols-3 gap-[10px] mb-[20px]">
            {([
              {
                value: 'individual',
                label: 'Solo / Individual',
                desc: 'Your own tasks or role',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] mb-[8px]">
                    {/* Head */}
                    <circle cx="12" cy="7" r="3.5" />
                    {/* Neural connection dots inside head */}
                    <circle cx="11" cy="6.5" r="0.4" fill="currentColor" stroke="none" />
                    <circle cx="13" cy="6.5" r="0.4" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="8" r="0.4" fill="currentColor" stroke="none" />
                    {/* Body / shoulders */}
                    <path d="M5.5 21c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" />
                    {/* Small circuit line on shoulder */}
                    <line x1="8.5" y1="16.5" x2="7.5" y2="18" />
                    <line x1="15.5" y1="16.5" x2="16.5" y2="18" />
                  </svg>
                ),
              },
              {
                value: 'team',
                label: 'Team / Startup',
                desc: '2–50 people',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] mb-[8px]">
                    {/* Left person */}
                    <circle cx="8" cy="7" r="2.8" />
                    <path d="M2.5 20.5c0-3 2.2-5 5.5-5" />
                    {/* Right person */}
                    <circle cx="16" cy="7" r="2.8" />
                    <path d="M21.5 20.5c0-3-2.2-5-5.5-5" />
                    {/* Center person (slightly larger) */}
                    <circle cx="12" cy="5.5" r="3" />
                    <path d="M7 20.5c0-3.2 2.3-5.5 5-5.5s5 2.3 5 5.5" />
                    {/* Connection node between the three */}
                    <circle cx="12" cy="12.5" r="0.5" fill="currentColor" stroke="none" />
                    <line x1="8" y1="9.8" x2="11.5" y2="12.2" strokeWidth="1" />
                    <line x1="16" y1="9.8" x2="12.5" y2="12.2" strokeWidth="1" />
                  </svg>
                ),
              },
              {
                value: 'company',
                label: 'Company / Dept.',
                desc: '50+ people or a full department',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[28px] h-[28px] mb-[8px]">
                    {/* Building outline */}
                    <rect x="3" y="4" width="18" height="17" rx="1.5" />
                    {/* Roof line */}
                    <line x1="3" y1="8" x2="21" y2="8" />
                    {/* Windows row 1 */}
                    <rect x="6" y="10.5" width="3" height="2.5" rx="0.5" />
                    <rect x="10.5" y="10.5" width="3" height="2.5" rx="0.5" />
                    <rect x="15" y="10.5" width="3" height="2.5" rx="0.5" />
                    {/* Windows row 2 */}
                    <rect x="6" y="15" width="3" height="2.5" rx="0.5" />
                    <rect x="15" y="15" width="3" height="2.5" rx="0.5" />
                    {/* Door */}
                    <rect x="10" y="15.5" width="4" height="5.5" rx="0.5" />
                    {/* Antenna / signal on top */}
                    <line x1="12" y1="4" x2="12" y2="2" />
                    <circle cx="12" cy="1.5" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                ),
              },
            ] as const).map(({ value, label, desc, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAnalysisContext(value)}
                className={`flex flex-col items-center text-center px-[12px] py-[16px] rounded-[14px] border-2 transition-all ${
                  analysisContext === value
                    ? 'border-[#0071e3] bg-blue-50 text-[#0071e3]'
                    : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#0071e3]/40'
                }`}
              >
                {icon}
                <span className="text-[13px] font-semibold leading-tight">{label}</span>
                <span className="text-[11px] text-[#86868b] mt-[3px] leading-tight">{desc}</span>
              </button>
            ))}
          </div>

          {/* Extra fields for team/company */}
          {(analysisContext === 'team' || analysisContext === 'company') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] pt-[4px]">
              <div>
                <label className={labelClass}>Team / Company Size</label>
                <div className="relative">
                  <select
                    value={teamSize}
                    onChange={e => setTeamSize(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select size…</option>
                    <option value="2-10">2–10 people</option>
                    <option value="11-50">11–50 people</option>
                    <option value="51-200">51–200 people</option>
                    <option value="201-1000">201–1,000 people</option>
                    <option value="1000+">1,000+ people</option>
                  </select>
                  <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Industry / Department</label>
                <div className="relative">
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select industry…</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance & Accounting</option>
                    <option value="hr">HR & Recruiting</option>
                    <option value="operations">Operations & Logistics</option>
                    <option value="legal">Legal & Compliance</option>
                    <option value="engineering">Engineering & Product</option>
                    <option value="customer_support">Customer Support</option>
                    <option value="consulting">Consulting & Advisory</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

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

        {/* Tasks */}
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
                      <textarea value={task.name} onChange={e => updateTask(idx, 'name', e.target.value)}
                        placeholder="e.g., Write social media posts" rows={2}
                        className={`${inputClass} resize-none leading-snug`} required />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
                      <textarea value={task.description} onChange={e => updateTask(idx, 'description', e.target.value)}
                        placeholder="Additional context or details…" rows={3}
                        className={`${inputClass} resize-none leading-snug`} />
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
              Analysing {taskCount} task{taskCount !== 1 ? 's' : ''} for{' '}
              {analysisContext === 'individual' ? 'your role' : analysisContext === 'team' ? 'your team' : 'your company'}
              {' '}— estimated {taskCount * 3}–{taskCount * 6}s
            </p>
          )}
          <button
            type="submit"
            disabled={isAnalyzing || isUploading || isExtractingTasks}
            className="inline-flex items-center gap-[10px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[36px] py-[16px] rounded-full font-semibold text-[17px] transition-all"
          >
            {isAnalyzing ? (
              <><Loader2 className="animate-spin h-[18px] w-[18px]" /> Running Analysis…</>
            ) : isExtractingTasks ? (
              <><Loader2 className="animate-spin h-[18px] w-[18px]" /> Extracting tasks…</>
            ) : (
              'Analyze Workflow →'
            )}
          </button>
          {!sessionEmail && !isAnalyzing && (
            <p className="text-[13px] text-[#86868b]">
              You'll be asked to sign in — your input won't be lost.
            </p>
          )}
        </div>

      </form>
    </>
  )
}
