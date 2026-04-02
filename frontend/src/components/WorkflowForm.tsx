'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Upload, FileText, Plus, Trash2, Loader2, ChevronDown,
         CheckCircle2, Circle, X, RefreshCw, Linkedin, Building2, User, Search,
         Mail, ArrowRight } from 'lucide-react'
import { saveMyWorkflowId } from '@/app/dashboard/page'
import { persistSession } from '@/lib/auth'

// ── Types ─────────────────────────────────────────────────────────────────────
export type AnalysisContext = 'individual' | 'team' | 'company'

interface Task {
  name: string; description: string; frequency: string
  time_per_task: number; category: string; complexity: string
}

interface WorkflowFormProps {
  onAnalysisComplete: (workflowId: number, shareCode?: string) => void
  onError: (error: string) => void
}

const STEPS = [
  { id: 'saving',    label: 'Saving workflow',     detail: 'Storing your tasks…' },
  { id: 'captcha',   label: 'Verifying request',   detail: 'Running security check…' },
  { id: 'analyzing', label: 'AI analysis running', detail: 'Claude is evaluating each task…' },
  { id: 'roi',       label: 'Calculating ROI',     detail: 'Estimating time & cost savings…' },
  { id: 'done',      label: 'Analysis complete',   detail: 'Redirecting to results…' },
]

type AuthStep = 'email' | 'code' | 'success'

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''

// Direct Render URL — used for all calls that may exceed Vercel's 60s proxy limit
// (auth/request involves DB + Resend email; analyze involves AI; parse-tasks involves AI)
const BACKEND_DIRECT = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://workscanai.onrender.com').replace(/\/$/, '')

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

// ── Context options with gradient-circle icons (matching feature card style) ──
const CONTEXT_OPTIONS = [
  {
    value: 'individual' as AnalysisContext,
    label: 'Solo / Individual',
    desc: 'Your own role',
    gradient: 'from-blue-500 to-purple-600',
    ring: 'ring-blue-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
        <circle cx="12" cy="8" r="3.5"/>
        <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
        <circle cx="11.2" cy="7.2" r="0.45" fill="white" stroke="none"/>
        <circle cx="12.8" cy="7.2" r="0.45" fill="white" stroke="none"/>
        <circle cx="12" cy="9" r="0.45" fill="white" stroke="none"/>
      </svg>
    ),
  },
  {
    value: 'team' as AnalysisContext,
    label: 'Team / Startup',
    desc: '2–50 people',
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
        <circle cx="9" cy="7.5" r="2.8"/>
        <path d="M3 20c0-2.8 2.2-4.8 6-4.8"/>
        <circle cx="15" cy="7.5" r="2.8"/>
        <path d="M21 20c0-2.8-2.2-4.8-6-4.8"/>
        <path d="M9 20c0-2.5 1.3-4.2 3-4.8 1.7.6 3 2.3 3 4.8"/>
        <circle cx="12" cy="13" r="0.55" fill="white" stroke="none"/>
        <line x1="9" y1="10.3" x2="11.4" y2="12.5" strokeWidth="1.2"/>
        <line x1="15" y1="10.3" x2="12.6" y2="12.5" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    value: 'company' as AnalysisContext,
    label: 'Company / Dept.',
    desc: '50+ people',
    gradient: 'from-orange-500 to-red-600',
    ring: 'ring-orange-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px]">
        <rect x="3" y="5" width="18" height="16" rx="1.5"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <rect x="6.5" y="11.5" width="3" height="2.5" rx="0.5"/>
        <rect x="10.5" y="11.5" width="3" height="2.5" rx="0.5"/>
        <rect x="14.5" y="11.5" width="3" height="2.5" rx="0.5"/>
        <rect x="6.5" y="16" width="3" height="2.5" rx="0.5"/>
        <rect x="14.5" y="16" width="3" height="2.5" rx="0.5"/>
        <rect x="10" y="16.5" width="4" height="4.5" rx="0.5"/>
        <line x1="12" y1="5" x2="12" y2="2.5"/>
        <circle cx="12" cy="2" r="0.55" fill="white" stroke="none"/>
      </svg>
    ),
  },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkflowForm({ onAnalysisComplete, onError }: WorkflowFormProps) {
  // Guest session: stable anonymous ID stored in localStorage for workflow ownership
  const getGuestId = (): string => {
    let id = localStorage.getItem('wsai_guest_id')
    if (!id) {
      id = 'guest_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36)
      localStorage.setItem('wsai_guest_id', id)
    }
    return id
  }

  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [tasks, setTasks] = useState<Task[]>([{
    name: '', description: '', frequency: 'weekly',
    time_per_task: 30, category: 'general', complexity: 'medium'
  }])
  const [inputMode, setInputMode] = useState<'manual' | 'voice' | 'document' | 'jobscan'>('manual')
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null)
  const [contextError, setContextError] = useState(false)
  const [teamSize, setTeamSize] = useState<string>('')
  const [industry, setIndustry] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('')
  const [hourlyRate, setHourlyRate] = useState(50)
  const [transcript, setTranscript] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinPastedText, setLinkedinPastedText] = useState('')
  // Job Scanner state
  const [jobTitle, setJobTitle] = useState('')
  const [jobScanStep, setJobScanStep] = useState<'idle' | 'researching' | 'analyzing' | 'done'>('idle')
  const [jobScanError, setJobScanError] = useState('')
  const [jobScanTasks, setJobScanTasks] = useState<Array<{name:string;description?:string;frequency?:string;time_per_task?:number;category?:string;complexity?:string}>>([])

  const [linkedinStatus, setLinkedinStatus] = useState<'idle' | 'fetching' | 'done' | 'error' | 'waiting_popup'>('idle')
  const [linkedinProfile, setLinkedinProfile] = useState<{ name: string; title_or_tagline: string; profile_type: string; linkedin_url: string } | null>(null)
  const [linkedinError, setLinkedinError] = useState('')
  const linkedinPopupRef = useRef<Window | null>(null)
  const [isExtractingTasks, setIsExtractingTasks] = useState(false)
  const [extractStatus, setExtractStatus] = useState<'idle' | 'extracting' | 'done'>('idle')
  const [activeStep, setActiveStep] = useState<number>(-1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [stepError, setStepError] = useState<string | null>(null)
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null)
  const isAnalyzing = activeStep >= 0 && activeStep < STEPS.length - 1
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('email')
  const [authEmail, setAuthEmailState] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const pendingSubmitRef = useRef<(() => void) | null>(null)
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { loadRecaptchaScript() }, [])

  // Listen for postMessage from the linkedin-receiver popup
  useEffect(() => {
    const handleLinkedInMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'workscanai_linkedin_data') return
      const d = event.data
      // Close popup if still open
      try { linkedinPopupRef.current?.close() } catch {}
      linkedinPopupRef.current = null

      // Build rich pasted text from what the bookmarklet extracted
      const parts: string[] = []
      if (d.headline) parts.push(`Headline: ${d.headline}`)
      if (d.about) parts.push(`\nAbout:\n${d.about}`)
      if (d.experience) parts.push(`\nExperience:\n${d.experience}`)
      if (d.skills) parts.push(`\nSkills: ${d.skills}`)
      const richText = parts.join('\n').trim()

      setLinkedinPastedText(richText)
      setLinkedinUrl(d.url || '')
      setLinkedinStatus('fetching')
      setLinkedinError('')

      try {
        const r = await fetch('/api/extract-linkedin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: d.url || 'https://www.linkedin.com', pasted_text: richText }),
        })
        if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Extraction failed') }
        const res = await r.json()
        setLinkedinProfile({ name: res.name || d.name, title_or_tagline: d.headline || '', profile_type: res.profile_type, linkedin_url: d.url })
        setSourceText(res.text)
        if ((res.name || d.name) && !workflowName) setWorkflowName((res.name || d.name) + ' — Workflow Analysis')
        if (res.profile_type === 'company') setAnalysisContext('company')
        else setAnalysisContext('individual')
        setContextError(false)
        setLinkedinStatus('done')
        await extractTasksFromText(res.text)
      } catch (e: any) {
        setLinkedinStatus('error')
        setLinkedinError(e.message || 'Extraction failed')
      }
    }
    window.addEventListener('message', handleLinkedInMessage)
    return () => window.removeEventListener('message', handleLinkedInMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowName])

  const advanceTo = (step: number) => {
    setActiveStep(step)
    setCompletedSteps(prev => { const n = new Set(prev); for (let i=0;i<step;i++) n.add(i); return n })
  }
  const resetProgress = () => { setActiveStep(-1); setCompletedSteps(new Set()); setStepError(null); setRateLimitMessage(null) }
  const addTask = () => setTasks(t => [...t, { name:'', description:'', frequency:'weekly', time_per_task:30, category:'general', complexity:'medium' }])
  const removeTask = (i: number) => { if (tasks.length > 1) setTasks(t => t.filter((_,idx) => idx !== i)) }
  const updateTask = (i: number, field: keyof Task, value: string | number) => {
    setTasks(t => { const n=[...t]; n[i]={...n[i],[field]:value}; return n })
  }

  const sendAuthCode = async () => {
    if (!authEmail.trim() || !authEmail.includes('@')) { setAuthError('Please enter a valid email address.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      // Direct to Render — bypasses Vercel proxy which can 504 on cold starts
      const res = await fetch(`${BACKEND_DIRECT}/api/auth/request`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:authEmail.trim()}) })
      if (!res.ok) { const d = await safeJson(res); throw new Error(d.detail || 'Failed to send code') }
      setAuthStep('code')
    } catch (e: any) { setAuthError(e.message || 'Something went wrong.') }
    finally { setAuthLoading(false) }
  }

  const verifyAuthCode = async () => {
    if (authCode.length !== 4) { setAuthError('Please enter the 4-digit code from your email.'); return }
    setAuthLoading(true); setAuthError('')
    try {
      // Direct to Render — bypasses Vercel proxy which can 504 on cold starts
      const res = await fetch(`${BACKEND_DIRECT}/api/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:authEmail.trim(),code:authCode.trim()}) })
      const d = await safeJson(res)
      if (!res.ok) throw new Error(d.detail || 'Invalid code')
      persistSession(d.email)
      window.dispatchEvent(new StorageEvent('storage', { key:'wsai_email', newValue:d.email }))
      setAuthStep('success')
      setTimeout(() => { pendingSubmitRef.current = null; setShowAuthModal(false); runAnalysis(d.email) }, 1000)
    } catch (e: any) { setAuthError(e.message || 'Incorrect code. Please try again.') }
    finally { setAuthLoading(false) }
  }

  const openAuthModal = () => { setShowAuthModal(true); setAuthStep('email'); setAuthEmailState(''); setAuthCode(''); setAuthError(''); pendingSubmitRef.current = null }

  const startVoiceRecording = async () => {
    if (await checkQuota()) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { onError('Speech recognition is not supported. Please use Chrome or Edge.'); return }
    const recognition = new SR()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US'
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
    recognition.onerror = (event: any) => { if (event.error !== 'no-speech') recognition.stop() }
    recognition.onend = () => {
      setIsRecording(false); recognitionRef.current = null
      if (finalTranscript.trim()) { setSourceText(finalTranscript.trim()); extractTasksFromText(finalTranscript.trim()) }
    }
    recognitionRef.current = recognition; recognition.start()
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
    setIsRecording(false)
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (await checkQuota()) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setIsUploading(true); setUploadProgress(0); setUploadStage('Reading file…'); onError('')
    let fakeProgress = 0
    const STAGES = [{at:5,label:'Reading file…'},{at:20,label:'Extracting text…'},{at:45,label:'Parsing document structure…'},{at:65,label:'Running AI analysis…'},{at:82,label:'Populating tasks…'},{at:91,label:'Almost done…'}]
    const ticker = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + (Math.random()*3+1), 91)
      setUploadProgress(Math.round(fakeProgress))
      const stage = [...STAGES].reverse().find(s => fakeProgress >= s.at)
      if (stage) setUploadStage(stage.label)
    }, 350)
    try {
      // extract-tasks uses AI (Claude Vision for images) and can be slow — call Render directly
      const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://workscanai.onrender.com').replace(/\/$/, '')
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch(`${BACKEND}/api/extract-tasks`, { method:'POST', body:fd })
      if (!r.ok) throw new Error('upload')
      const d = await r.json(); setSourceText(d.text||''); setUploadProgress(93); setUploadStage('Extracting tasks with AI…')
      try { await extractTasksFromText(d.text) } catch { }
      setUploadProgress(100); setUploadStage('Done!')
    } catch (err: any) {
      if (err?.message==='upload') onError('Could not read this file. Please try a PDF, Word doc, or text file.')
    } finally {
      clearInterval(ticker)
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); setUploadStage('') }, 900)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openLinkedInPopup = () => {
    setLinkedinStatus('waiting_popup')
    setLinkedinError('')
    setLinkedinProfile(null)
    const popup = window.open(
      'https://workscanai.vercel.app/linkedin-receiver',
      'workscanai_receiver',
      'width=420,height=320,scrollbars=no,resizable=no'
    )
    linkedinPopupRef.current = popup
    // If popup gets closed without data, reset
    const checker = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checker)
        setLinkedinStatus(s => s === 'waiting_popup' ? 'idle' : s)
      }
    }, 500)
  }

  const extractFromLinkedIn = async () => {
    let url = linkedinUrl.trim().replace(/^\/+/, '')
    if (!url) { setLinkedinError('Please paste a LinkedIn URL first.'); return }

    // Normalise partial inputs before sending to backend:
    //   /in/foo  or  in/foo  → https://www.linkedin.com/in/foo
    //   /company/foo         → https://www.linkedin.com/company/foo
    //   linkedin.com/...     → https://www.linkedin.com/...
    if (/^(in|company|school)\//.test(url) || url.startsWith('/in/') || url.startsWith('/company/')) {
      url = 'https://www.linkedin.com/' + url.replace(/^\//, '')
    } else if (/^(www\.)?linkedin\.com/i.test(url)) {
      url = 'https://' + url
    } else if (!url.startsWith('http')) {
      url = 'https://' + url
    }

    if (!url.includes('linkedin.com')) { setLinkedinError('URL must be a linkedin.com link — e.g. linkedin.com/in/yourname'); return }
    setLinkedinStatus('fetching'); setLinkedinError(''); setLinkedinProfile(null)
    try {
      const r = await fetch('/api/extract-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, pasted_text: linkedinPastedText || undefined }),
      })
      if (!r.ok) {
        const d = await r.json()
        throw new Error(d.detail || 'Could not extract LinkedIn data')
      }
      const d = await r.json()
      setLinkedinProfile({ name: d.name, title_or_tagline: d.title_or_tagline, profile_type: d.profile_type, linkedin_url: d.linkedin_url })
      setSourceText(d.text)
      if (d.name && !workflowName) setWorkflowName(d.name + ' — Workflow Analysis')
      // Auto-select the matching analysis context
      if (d.profile_type === 'company') setAnalysisContext('company')
      else setAnalysisContext('individual')
      setContextError(false)
      setLinkedinStatus('done')
      await extractTasksFromText(d.text)
    } catch (e: any) {
      setLinkedinStatus('error')
      setLinkedinError(e.message || 'Failed to extract. Check the URL and try again.')
    }
  }

  const extractTasksFromText = async (text: string) => {
    setIsExtractingTasks(true); setExtractStatus('extracting')
    // parse-tasks uses Claude Sonnet and can take 15–30s — call Render directly
    const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://workscanai.onrender.com').replace(/\/$/, '')
    try {
      const r = await fetch(`${BACKEND}/api/parse-tasks`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({text}) })
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
          document.getElementById('context-selector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 2000)
      } else { setIsExtractingTasks(false); setExtractStatus('idle') }
    } catch { setIsExtractingTasks(false); setExtractStatus('idle') }
  }

  // Safe JSON parser — never throws on non-JSON responses (e.g. "Internal Server Error")
  const safeJson = async (res: Response): Promise<any> => {
    const text = await res.text()
    try { return JSON.parse(text) } catch { return { detail: text || `HTTP ${res.status}` } }
  }

  // Pre-flight quota check v2 — called immediately on every button press before any work.
  // Returns true if the user is over the limit (modal is shown), false if they can proceed.
  const checkQuota = async (): Promise<boolean> => {
    try {
      const r = await fetch('/api/quota')
      if (!r.ok) return false // on error, let the server enforce
      const d = await r.json()
      if (d.exceeded) {
        setRateLimitMessage(
          `You've used all ${d.limit} free analyses in the last 24 hours. The limit resets on a rolling 24-hour basis — try again tomorrow!`
        )
        return true
      }
      return false
    } catch {
      return false // network error — let the server enforce
    }
  }

  const runAnalysis = async (userEmail: string) => {
    onError(''); setStepError(null)

    // BACKEND_DIRECT is a module-level constant — direct Render calls bypass
    // Vercel's serverless timeout for long-running AI + auth operations.

    const effectiveSourceText = sourceText.trim() || (inputMode==='manual' && workflowDescription.trim() ? workflowDescription.trim() : '')
    try {
      advanceTo(0)
      const wfRes = await fetch('/api/workflows', {
        method:'POST', headers:{'Content-Type':'application/json','x-user-email':userEmail},
        body: JSON.stringify({ name:workflowName, description:workflowDescription, source_text:effectiveSourceText||undefined, input_mode:inputMode, analysis_context:analysisContext||'individual', team_size:teamSize||undefined, industry:industry||undefined,
          tasks: tasks.filter(t=>t.name.trim()).map(t=>({ name:t.name, description:t.description||t.name, frequency:t.frequency, time_per_task:t.time_per_task, category:t.category, complexity:t.complexity }))
        })
      })
      if (!wfRes.ok) { const err=await safeJson(wfRes); throw new Error(err.detail||'Failed to create workflow') }
      const workflow = await safeJson(wfRes); saveMyWorkflowId(workflow.id)
      advanceTo(1)
      const recaptchaToken = await getRecaptchaToken('analyze_workflow')
      advanceTo(2)
      // ⚡ Direct-to-Render: bypasses Vercel's 10s serverless timeout entirely
      const analysisRes = await fetch(`${BACKEND_DIRECT}/api/analyze`, {
        method:'POST', headers:{'Content-Type':'application/json','x-user-email':userEmail},
        body: JSON.stringify({ workflow_id:workflow.id, hourly_rate:hourlyRate, recaptcha_token:recaptchaToken })
      })
      if (!analysisRes.ok) {
        const err = await safeJson(analysisRes)
        if (analysisRes.status===429) { setRateLimitMessage(err.detail?.message||err.detail||'You have reached the daily analysis limit.'); return }
        if (analysisRes.status===403) throw new Error(err.detail?.message||err.detail||'Security check failed.')
        throw new Error(err.detail||`Analysis failed (HTTP ${analysisRes.status}) — please try again.`)
      }
      advanceTo(3); await new Promise(r=>setTimeout(r,600))
      advanceTo(4); await new Promise(r=>setTimeout(r,700))
      onAnalysisComplete(workflow.id)
    } catch (err: any) { setStepError(err.message||'Something went wrong.'); onError(err.message||'Failed to analyze workflow.'); resetProgress() }
  }

  // ── Job Scanner handler ──────────────────────────────────────────────────
  const handleJobScan = async () => {
    if (!jobTitle.trim()) return
    if (await checkQuota()) return
    setJobScanError(''); setJobScanTasks([]); setJobScanStep('researching')
    try {
      // Step 1: research via Vercel proxy (~15s)
      const r1 = await fetch('/api/job-scan/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: jobTitle.trim(), analysis_context: analysisContext || 'individual', industry: industry || undefined }),
      })
      if (r1.status === 429) {
        const e = await r1.json().catch(()=>({}))
        setRateLimitMessage(e.detail?.message || e.detail || 'You have reached the daily analysis limit.')
        setJobScanStep('idle')
        return
      }
      if (!r1.ok) { const e = await r1.json().catch(()=>({})); throw new Error(e.detail || `Research failed (${r1.status})`) }
      const d1 = await r1.json()
      setJobScanTasks(d1.tasks || [])
      setJobScanStep('analyzing')
      // Step 2: analyze direct to Render (~45s, bypasses Vercel 60s limit)
      const r2 = await fetch(`${BACKEND_DIRECT}/api/job-scan/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_title: jobTitle.trim(), tasks: d1.tasks, analysis_context: analysisContext || 'individual', industry: industry || undefined, hourly_rate: hourlyRate }),
      })
      if (r2.status === 429) {
        const e = await r2.json().catch(()=>({}))
        setRateLimitMessage(e.detail?.message || e.detail || 'You have reached the daily analysis limit.')
        setJobScanStep('idle')
        return
      }
      if (!r2.ok) { const e = await r2.json().catch(()=>({})); throw new Error(e.detail || `Analysis failed (${r2.status})`) }
      const d2 = await r2.json()
      setJobScanStep('done')
      onAnalysisComplete(d2.workflow_id, d2.share_code)
    } catch (err: any) {
      setJobScanError(err.message || 'Job scan failed. Please try again.')
      setJobScanStep('idle')
    }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!workflowName.trim()) { onError('Please provide a workflow name'); return }
    if (!tasks.some(t=>t.name.trim())) { onError('Please add at least one task'); return }
    if (!analysisContext) {
      setContextError(true)
      document.getElementById('context-selector')?.scrollIntoView({ behavior:'smooth', block:'center' })
      return
    }
    if (await checkQuota()) return
    const guestId = getGuestId()
    await runAnalysis(guestId)
  }

  const inputClass = "w-full px-[14px] py-[10px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"
  const selectClass = `${inputClass} appearance-none cursor-pointer`
  const labelClass = "block text-[13px] font-medium text-[#6e6e73] mb-[6px] uppercase tracking-wide"
  const taskCount = tasks.filter(t=>t.name.trim()).length
  const showProgress = activeStep >= 0 && rateLimitMessage === null

  // ── Rate Limit Modal ────────────────────────────────────────────────────────
  const RateLimitModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)'}}>
      {/* Animated glow backdrop */}
      <div className="relative w-full max-w-[440px]">
        {/* Glow ring */}
        <div className="absolute -inset-[2px] rounded-[28px] opacity-60" style={{background:'linear-gradient(135deg,#f59e0b,#f97316,#ef4444)',filter:'blur(16px)'}}/>
        {/* Card */}
        <div className="relative bg-white rounded-[26px] shadow-2xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-[5px] w-full" style={{background:'linear-gradient(90deg,#f59e0b,#f97316,#ef4444)'}}/>

          <div className="px-[40px] pt-[36px] pb-[40px]">
            {/* Icon */}
            <div className="flex justify-center mb-[24px]">
              <div className="relative">
                <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#fef3c7,#fde68a)'}}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="0.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* Small rocket */}
                <div className="absolute -bottom-[4px] -right-[4px] w-[28px] h-[28px] bg-white rounded-full shadow-md flex items-center justify-center">
                  <span style={{fontSize:'15px',lineHeight:1}}>🚀</span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <h2 className="text-center text-[22px] font-bold text-[#1d1d1f] mb-[8px] tracking-tight">
              Thank you for using WorkScanAI!
            </h2>

            {/* Subheading */}
            <p className="text-center text-[15px] text-[#6e6e73] mb-[28px] leading-relaxed">
              You&apos;ve used all <span className="font-semibold text-[#f97316]">5 free daily analyses</span>.<br/>
              Your limit resets in&nbsp;24 hours.
            </p>

            {/* Info card */}
            <div className="rounded-[16px] px-[24px] py-[20px] mb-[28px]" style={{background:'linear-gradient(135deg,#fffbeb,#fff7ed)'}}>
              <div className="space-y-[12px]">
                {[
                  { icon:'⏰', text:'Free tier: 5 analyses per 24 hours' },
                  { icon:'🔒', text:'Your results are saved — come back anytime' },
                  { icon:'☀️', text:'New analyses available tomorrow' },
                ].map(({icon,text})=>(
                  <div key={text} className="flex items-center gap-[12px]">
                    <span className="shrink-0 w-[32px] h-[32px] rounded-full bg-white shadow-sm flex items-center justify-center text-[15px]">{icon}</span>
                    <span className="text-[14px] text-[#374151] font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OK button */}
            <button
              type="button"
              onClick={resetProgress}
              className="w-full py-[15px] rounded-[14px] text-white text-[16px] font-bold tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}
            >
              Got it — see you tomorrow! 👋
            </button>

            {/* Fine print */}
            <p className="text-center text-[12px] text-[#9ca3af] mt-[14px]">
              Want unlimited analyses?{' '}
              <a href="mailto:hello@workscanai.com" className="text-[#f97316] font-medium hover:underline">
                Contact us about Pro
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const AuthModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-[#d2d2d7] rounded-[24px] shadow-2xl w-full max-w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-[32px] pt-[28px] pb-[20px] border-b border-[#f0f0f5]">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f]">{authStep==='success'?'You\'re signed in!':'Sign in to run analysis'}</h2>
            <p className="text-[13px] text-[#6e6e73] mt-[3px]">
              {authStep==='email'&&'Your workflow is ready — just sign in first.'}
              {authStep==='code'&&`We sent a 4-digit code to ${authEmail}`}
              {authStep==='success'&&'Starting your analysis now…'}
            </p>
          </div>
          {authStep!=='success'&&<button onClick={()=>{setShowAuthModal(false);pendingSubmitRef.current=null}} className="ml-[16px] shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-[#f5f5f7] transition-colors text-[#86868b] hover:text-[#1d1d1f]"><X className="w-[16px] h-[16px]"/></button>}
        </div>
        <div className="px-[32px] py-[28px] space-y-[16px]">
          {authStep==='success'&&<div className="text-center py-[8px]"><div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-green-50 border border-green-200 mb-[16px]"><CheckCircle2 className="w-[32px] h-[32px] text-green-500"/></div><p className="text-[15px] text-[#6e6e73]">Analysis is starting…</p></div>}
          {authStep==='email'&&<>
            <div><label className="block text-[13px] font-medium text-[#1d1d1f] mb-[8px]">Email address</label>
            <div className="relative"><Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-[#86868b]"/>
            <input type="email" value={authEmail} onChange={e=>{setAuthEmailState(e.target.value);setAuthError('')}} onKeyDown={e=>e.key==='Enter'&&sendAuthCode()} placeholder="you@company.com" autoFocus className="w-full pl-[42px] pr-[14px] py-[12px] bg-white border border-[#d2d2d7] rounded-[10px] text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] transition-all"/></div></div>
            {authError&&<p className="text-[13px] text-red-500">{authError}</p>}
            <button onClick={sendAuthCode} disabled={authLoading||!authEmail.includes('@')} className="w-full flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed text-white py-[13px] rounded-[12px] text-[15px] font-semibold transition-all">
              {authLoading?<><Loader2 className="animate-spin w-[16px] h-[16px]"/>Sending…</>:<>Send login code<ArrowRight className="w-[16px] h-[16px]"/></>}
            </button>
            <p className="text-[12px] text-[#86868b] text-center">No password needed · Free tier: 5 analyses / 24 h</p>
          </>}
          {authStep==='code'&&<>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-[12px]">Enter 4-digit code</label>
              <div className="flex gap-[10px] justify-center">
                {[0,1,2,3].map(i => (
                  <input
                    key={i}
                    ref={el => { codeInputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={authCode[i] || ''}
                    onChange={e => {
                      // Handle normal typing
                      const digit = e.target.value.replace(/\D/g, '').slice(-1)
                      const arr = authCode.split('')
                      arr[i] = digit
                      const next = arr.join('').slice(0, 4)
                      setAuthCode(next)
                      setAuthError('')
                      if (digit && i < 3) codeInputRefs.current[i + 1]?.focus()
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace') {
                        e.preventDefault()
                        const arr = authCode.split('')
                        if (arr[i]) {
                          arr[i] = ''
                          setAuthCode(arr.join(''))
                        } else if (i > 0) {
                          arr[i - 1] = ''
                          setAuthCode(arr.join(''))
                          codeInputRefs.current[i - 1]?.focus()
                        }
                      } else if (e.key === 'ArrowLeft' && i > 0) {
                        e.preventDefault()
                        codeInputRefs.current[i - 1]?.focus()
                      } else if (e.key === 'ArrowRight' && i < 3) {
                        e.preventDefault()
                        codeInputRefs.current[i + 1]?.focus()
                      } else if (e.key === 'Enter' && authCode.length === 4) {
                        verifyAuthCode()
                      }
                    }}
                    onPaste={e => {
                      // Paste support — grab up to 4 digits from clipboard
                      e.preventDefault()
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                      if (pasted) {
                        setAuthCode(pasted)
                        setAuthError('')
                        // Focus last filled box or box 3
                        const focusIdx = Math.min(pasted.length, 3)
                        setTimeout(() => codeInputRefs.current[focusIdx]?.focus(), 0)
                        // Auto-submit if all 4 digits pasted
                        if (pasted.length === 4) setTimeout(() => verifyAuthCode(), 100)
                      }
                    }}
                    onFocus={e => e.target.select()}
                    className={`w-[64px] h-[72px] text-center text-[32px] font-bold bg-white border-2 rounded-[14px] text-[#1d1d1f] focus:outline-none transition-all cursor-text
                      ${authCode[i] ? 'border-[#0071e3] bg-blue-50/30' : 'border-[#d2d2d7]'}
                      focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20`}
                  />
                ))}
              </div>
              <p className="text-[12px] text-[#86868b] mt-[12px] text-center">Check your inbox — code expires in 15 minutes</p>
            </div>
            {authError&&<p className="text-[13px] text-red-500 text-center">{authError}</p>}
            <button onClick={verifyAuthCode} disabled={authLoading||authCode.length!==4} className="w-full flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed text-white py-[13px] rounded-[12px] text-[15px] font-semibold transition-all">
              {authLoading?<><Loader2 className="animate-spin w-[16px] h-[16px]"/>Verifying…</>:<><CheckCircle2 className="w-[16px] h-[16px]"/>Verify &amp; Analyze</>}
            </button>
            <div className="flex items-center justify-between text-[13px]">
              <button onClick={()=>{setAuthStep('email');setAuthCode('');setAuthError('')}} className="text-[#6e6e73] hover:text-[#1d1d1f] flex items-center gap-[4px] transition-colors">← Change email</button>
              <button onClick={sendAuthCode} disabled={authLoading} className="text-[#0071e3] hover:underline flex items-center gap-[4px] disabled:opacity-50"><RefreshCw className="w-[12px] h-[12px]"/>Resend code</button>
            </div>
          </>}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {rateLimitMessage && <RateLimitModal/>}

      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="bg-white border border-[#d2d2d7] rounded-[24px] shadow-2xl p-[48px] w-full max-w-[480px] mx-4">
                <div className="text-center mb-[40px]">
                  <div className="text-[24px] font-semibold text-[#1d1d1f] mb-[6px]">{activeStep<STEPS.length-1?'Analyzing your workflow…':'All done!'}</div>
                  {activeStep===2&&taskCount>1&&<p className="text-[14px] text-[#6e6e73]">Running AI analysis on {taskCount} tasks — this takes {taskCount*3}–{taskCount*6}s</p>}
                </div>
                <div className="space-y-[20px]">
                  {STEPS.map((step,i)=>{
                    const isDone=completedSteps.has(i); const isActive=activeStep===i
                    return (
                      <div key={step.id} className="flex items-center gap-[16px]">
                        <div className="shrink-0 w-[36px] h-[36px] flex items-center justify-center">
                          {isDone?<CheckCircle2 className="h-[28px] w-[28px] text-green-500"/>:isActive?<Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin"/>:<Circle className="h-[28px] w-[28px] text-[#d2d2d7]"/>}
                        </div>
                        <div className="flex-1">
                          <div className={`text-[15px] font-semibold transition-colors ${isDone?'text-green-600':isActive?'text-[#1d1d1f]':'text-[#86868b]'}`}>{step.label}</div>
                          {isActive&&<div className="text-[13px] text-[#6e6e73] mt-[2px]">{step.detail}</div>}
                        </div>
                        {isDone&&<span className="text-[12px] font-medium text-green-600 bg-green-50 border border-green-200 px-[10px] py-[3px] rounded-full">Done</span>}
                        {isActive&&activeStep<STEPS.length-1&&<span className="text-[12px] font-medium text-[#0071e3] bg-blue-50 border border-blue-200 px-[10px] py-[3px] rounded-full">Running</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-[36px]">
                  <div className="flex justify-between text-[12px] text-[#86868b] mb-[8px]"><span>Progress</span><span>{Math.round((completedSteps.size/STEPS.length)*100)}%</span></div>
                  <div className="w-full h-[4px] bg-[#e8e8ed] rounded-full overflow-hidden"><div className="h-full bg-[#0071e3] rounded-full transition-all duration-700 ease-out" style={{width:`${(completedSteps.size/STEPS.length)*100}%`}}/></div>
                </div>
                {SITE_KEY&&<p className="text-[11px] text-[#86868b] text-center mt-[20px]">Protected by reCAPTCHA · <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline">Privacy</a> · <a href="https://policies.google.com/terms" target="_blank" rel="noopener" className="underline">Terms</a></p>}
          </div>
        </div>
      )}


      {/* ── FORM ── */}
      <form onSubmit={handleSubmit} className="space-y-[24px]">

        {/* Input Mode — dark bold tabs */}
        <div className="bg-[#1d1d1f] border border-[#3a3a3c] rounded-[20px] p-[8px] flex flex-wrap gap-[6px] shadow-lg">
          {([
            { mode:'manual' as const,    icon:FileText, label:'Manual Entry',     sublabel:'Type tasks directly' },
            { mode:'voice' as const,     icon:Mic,      label:'Voice Input',      sublabel:'Speak your workflow' },
            { mode:'document' as const,  icon:Upload,   label:'Upload Document',  sublabel:'PDF, Word, CV, Excel…' },
            { mode:'jobscan' as const,   icon:Search,   label:'Job Scanner',      sublabel:'Auto-scan any job title' },
          ]).map(({mode,icon:Icon,label,sublabel}) => (
            <button key={mode} type="button" onClick={()=>{
                setInputMode(mode)
                // Auto-select Solo when Job Scanner is clicked (user can change before submitting)
                if (mode === 'jobscan' && !analysisContext) setAnalysisContext('individual')
              }}
              className={`flex-1 flex items-center justify-center gap-[10px] px-[16px] py-[14px] rounded-[14px] font-semibold transition-all ${inputMode===mode?'bg-white text-[#1d1d1f] shadow-md':'text-white/60 hover:text-white hover:bg-white/10'}`}>
              <Icon className="h-[18px] w-[18px] shrink-0"/>
              <div className="text-left hidden sm:block">
                <div className="text-[15px] leading-tight">{label}</div>
                <div className={`text-[11px] font-normal leading-tight mt-[1px] ${inputMode===mode?'text-[#6e6e73]':'text-white/40'}`}>{sublabel}</div>
              </div>
              <span className="sm:hidden text-[14px]">{label}</span>
            </button>
          ))}
        </div>

        {/* LinkedIn panel — removed (inputMode no longer includes 'linkedin') */}
        {false&&(
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
            <div className="text-center mb-[32px]">
              <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-[#0077B5]/10 border border-[#0077B5]/30 mb-[16px]">
                <Linkedin className="h-[32px] w-[32px] text-[#0077B5]"/>
              </div>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Import from LinkedIn</h3>
              <p className="text-[15px] text-[#6e6e73] max-w-[460px] mx-auto">
                Install the one-click bookmarklet. Then visit any LinkedIn profile and click it — WorkScanAI automatically reads the headline, current role, and responsibilities.
              </p>
            </div>

            <div className="max-w-[560px] mx-auto space-y-[16px]">

              {/* Step 1 — Install bookmarklet */}
              {linkedinStatus==='idle'&&(
                <div className="bg-white border border-[#d2d2d7] rounded-[16px] p-[24px]">
                  <div className="flex items-center gap-[10px] mb-[16px]">
                    <div className="w-[24px] h-[24px] rounded-full bg-[#0077B5] flex items-center justify-center text-white text-[12px] font-bold shrink-0">1</div>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Install the bookmarklet <span className="text-[#86868b] font-normal">(one time only)</span></p>
                  </div>
                  <p className="text-[13px] text-[#6e6e73] mb-[16px] leading-relaxed">
                    Show your bookmarks bar (<kbd className="bg-[#f5f5f7] border border-[#d2d2d7] px-[6px] py-[2px] rounded text-[11px]">Ctrl+Shift+B</kbd> / <kbd className="bg-[#f5f5f7] border border-[#d2d2d7] px-[6px] py-[2px] rounded text-[11px]">⌘+Shift+B</kbd>), then drag this button to it:
                  </p>
                  <div className="flex items-center gap-[12px]">
                    {/* The actual draggable bookmarklet link */}
                    <a
                      href={`javascript:(function(){if(!window.location.hostname.includes('linkedin.com')){alert('Please go to a LinkedIn profile first, then click this bookmark.');return;}var text=document.body.innerText;var url=window.location.href;var isCompany=url.includes('/company/')||url.includes('/school/');var name=((document.querySelector('h1')||{}).innerText||'').trim();var headline='';var divs=document.querySelectorAll('div');for(var i=0;i<divs.length;i++){var d=divs[i];if(typeof d.className==='string'&&d.className.includes('text-body-medium')){var t=(d.innerText||'').trim();if(t.length>20&&t.length<500){headline=t;break;}}}function sec(label,ends){var marker=label+'\\n'+label+'\\n';var idx=text.indexOf(marker);if(idx===-1){marker='\\n'+label+'\\n';idx=text.indexOf(marker);}if(idx===-1)return'';var start=idx+marker.length;var end=start+2500;for(var j=0;j<ends.length;j++){var m2=ends[j]+'\\n'+ends[j]+'\\n';var ei=text.indexOf(m2,start+50);if(ei>start&&ei<end)end=ei;}return text.slice(start,end).trim().slice(0,1800);}var about=sec('About',['Experience','Skills','Education','Certifications']);var experience=sec('Experience',['Skills','Education','Certifications','Recommendations']);var skills=sec('Skills',['Education','Certifications','Recommendations','Interests']);var payload=JSON.stringify({type:'workscanai_linkedin_data',name:name,headline:headline.slice(0,300),about:about.slice(0,800),experience:experience.slice(0,1500),skills:skills.slice(0,400),url:url,profile_type:isCompany?'company':'personal'});var receiverUrl='https://workscanai.vercel.app/linkedin-receiver';var popup=window.open(receiverUrl,'workscanai_receiver','width=420,height=320,scrollbars=no');if(!popup){window.open(receiverUrl+'%23'+encodeURIComponent(payload),'workscanai_receiver','width=420,height=320');return;}var attempts=0;var iv=setInterval(function(){attempts++;try{popup.postMessage(JSON.parse(payload),'*');clearInterval(iv);}catch(e){if(attempts>30)clearInterval(iv);}},200);})();`}
                      onClick={e => e.preventDefault()}
                      draggable
                      className="inline-flex items-center gap-[8px] bg-[#0077B5] hover:bg-[#006097] text-white px-[18px] py-[10px] rounded-[10px] text-[14px] font-semibold cursor-grab active:cursor-grabbing select-none transition-colors"
                      title="Drag this to your bookmarks bar"
                    >
                      <Linkedin className="h-[15px] w-[15px]"/>
                      WorkScanAI — Import LinkedIn
                    </a>
                    <span className="text-[12px] text-[#86868b]">← drag to bookmarks bar</span>
                  </div>
                </div>
              )}

              {/* Step 2 — Open receiver then go to LinkedIn */}
              {linkedinStatus==='idle'&&(
                <div className="bg-white border border-[#d2d2d7] rounded-[16px] p-[24px]">
                  <div className="flex items-center gap-[10px] mb-[12px]">
                    <div className="w-[24px] h-[24px] rounded-full bg-[#0077B5] flex items-center justify-center text-white text-[12px] font-bold shrink-0">2</div>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Click to start import</p>
                  </div>
                  <p className="text-[13px] text-[#6e6e73] mb-[16px] leading-relaxed">
                    Click the button below, then go to any LinkedIn profile and click your new bookmark. WorkScanAI will receive the profile data automatically.
                  </p>
                  <button
                    type="button"
                    onClick={openLinkedInPopup}
                    className="w-full flex items-center justify-center gap-[10px] bg-[#0077B5] hover:bg-[#006097] text-white py-[13px] rounded-[12px] font-semibold text-[15px] transition-all"
                  >
                    <Linkedin className="h-[18px] w-[18px]"/>
                    Open import window
                  </button>
                </div>
              )}

              {/* Waiting for popup */}
              {linkedinStatus==='waiting_popup'&&(
                <div className="bg-white border border-[#0077B5]/30 rounded-[16px] p-[28px] text-center">
                  <div className="flex items-center justify-center gap-[10px] mb-[12px]">
                    <div className="w-[10px] h-[10px] bg-[#0077B5] rounded-full animate-pulse"/>
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">Import window is open</p>
                  </div>
                  <p className="text-[13px] text-[#6e6e73] mb-[16px] leading-relaxed">
                    Now go to your LinkedIn profile and click the <strong>WorkScanAI — Import LinkedIn</strong> bookmark in your bookmarks bar.
                  </p>
                  <div className="bg-[#f5f5f7] rounded-[10px] p-[12px] text-left text-[12px] text-[#6e6e73] space-y-[4px]">
                    <p>1. Navigate to <strong>linkedin.com/in/yourname</strong></p>
                    <p>2. Click <strong>WorkScanAI — Import LinkedIn</strong> in your bookmarks bar</p>
                    <p>3. This page will update automatically ✓</p>
                  </div>
                  <button type="button" onClick={()=>{linkedinPopupRef.current?.close();setLinkedinStatus('idle')}} className="mt-[16px] text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors">Cancel</button>
                </div>
              )}

              {/* Fetching/processing */}
              {linkedinStatus==='fetching'&&(
                <div className="bg-white border border-[#d2d2d7] rounded-[16px] p-[28px] text-center">
                  <Loader2 className="h-[32px] w-[32px] text-[#0077B5] animate-spin mx-auto mb-[12px]"/>
                  <p className="text-[15px] font-semibold text-[#1d1d1f] mb-[6px]">Analysing profile…</p>
                  <p className="text-[13px] text-[#6e6e73]">Building task list from your LinkedIn data</p>
                </div>
              )}

              {/* Success */}
              {linkedinStatus==='done'&&linkedinProfile!=null&&(
                <div className="space-y-[12px]">
                  <div className="bg-white border border-green-200 rounded-[16px] px-[20px] py-[16px] flex items-center gap-[14px]">
                    <div className="shrink-0 w-[44px] h-[44px] rounded-full bg-[#0077B5] flex items-center justify-center">
                      {linkedinProfile?.profile_type==='company'?<Building2 className="h-[20px] w-[20px] text-white"/>:<User className="h-[20px] w-[20px] text-white"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">{linkedinProfile?.name}</p>
                      {linkedinProfile?.title_or_tagline&&<p className="text-[12px] text-[#6e6e73] mt-[2px] line-clamp-2">{linkedinProfile?.title_or_tagline}</p>}
                    </div>
                    <CheckCircle2 className="h-[22px] w-[22px] text-green-500 shrink-0"/>
                  </div>
                  {isExtractingTasks&&(
                    <div className={`flex items-center gap-[10px] px-[16px] py-[10px] rounded-full text-[13px] font-medium ${extractStatus==='done'?'bg-green-50 border border-green-200 text-green-700':'bg-blue-50 border border-blue-200 text-[#0071e3]'}`}>
                      {extractStatus==='done'?<><CheckCircle2 className="h-[15px] w-[15px]"/>Tasks populated — scroll down to review</>:<><Loader2 className="animate-spin h-[15px] w-[15px]"/>Generating tasks from profile…</>}
                    </div>
                  )}
                  <button type="button" onClick={()=>{setLinkedinStatus('idle');setLinkedinProfile(null);setLinkedinUrl('');setLinkedinPastedText('');setLinkedinError('')}} className="w-full flex items-center justify-center gap-[8px] border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] text-[#6e6e73] py-[10px] rounded-[12px] font-medium text-[13px] transition-all">
                    <RefreshCw className="h-[13px] w-[13px]"/>Import a different profile
                  </button>
                </div>
              )}

              {/* Error */}
              {linkedinStatus==='error'&&(
                <div className="space-y-[12px]">
                  <div className="flex items-start gap-[10px] bg-red-50 border border-red-200 rounded-[12px] px-[16px] py-[12px]">
                    <span className="text-red-500 mt-[1px]">⚠</span>
                    <div>
                      <p className="text-[14px] font-medium text-red-700">{linkedinError}</p>
                      <p className="text-[12px] text-red-500 mt-[4px]">Try again, or use Manual Entry / Document Upload instead.</p>
                    </div>
                  </div>
                  <button type="button" onClick={()=>{setLinkedinStatus('idle');setLinkedinError('')}} className="w-full flex items-center justify-center gap-[8px] border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] text-[#6e6e73] py-[10px] rounded-[12px] font-medium text-[13px] transition-all"><RefreshCw className="h-[13px] w-[13px]"/>Try again</button>
                </div>
              )}

              <p className="text-[11px] text-[#86868b] text-center leading-relaxed pt-[4px]">
                The bookmarklet runs entirely in your browser — no LinkedIn credentials are sent to WorkScanAI. Works on any public profile you can view.
              </p>
            </div>
          </div>
        )}

        {/* Voice panel */}
        {inputMode==='voice'&&(
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <div className="mb-[20px]">
              <button type="button" onClick={isRecording?stopVoiceRecording:startVoiceRecording} className={`inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border mb-[16px] transition-all hover:scale-105 active:scale-95 ${isRecording?'border-red-300':'border-[#d2d2d7] hover:border-[#0071e3]'}`}>
                <Mic className={`h-[28px] w-[28px] ${isRecording?'text-red-500 animate-pulse':'text-[#6e6e73]'}`}/>
              </button>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Voice Recording</h3>
              <p className="text-[15px] text-[#6e6e73] max-w-[420px] mx-auto">Describe your workflow and tasks verbally. Tasks will populate automatically when you stop.</p>
            </div>
            {!isRecording&&<button type="button" onClick={startVoiceRecording} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all"><Mic className="h-[18px] w-[18px]"/>Start Recording</button>}
            {isRecording&&(
              <div className="space-y-[16px]">
                <div className="flex items-center justify-center gap-[10px]"><div className="w-[10px] h-[10px] bg-red-500 rounded-full animate-pulse"/><span className="text-[17px] font-medium text-red-600">Recording… speak now</span></div>
                {transcript&&<div className="bg-white border border-[#d2d2d7] rounded-[12px] p-[16px] text-left text-[14px] text-[#1d1d1f] max-h-[120px] overflow-y-auto">{transcript}</div>}
                <button type="button" onClick={stopVoiceRecording} className="inline-flex items-center gap-[8px] bg-red-500 hover:bg-red-600 text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all">Stop &amp; Extract Tasks</button>
              </div>
            )}
            {!isRecording&&isExtractingTasks&&(
              <div className={`mt-[20px] inline-flex items-center gap-[10px] px-[20px] py-[12px] rounded-full text-[15px] font-medium transition-all ${extractStatus==='done'?'bg-green-50 border border-green-200 text-green-700':'bg-blue-50 border border-blue-200 text-[#0071e3]'}`}>
                {extractStatus==='done'?<><CheckCircle2 className="h-[18px] w-[18px]"/>Tasks populated — scroll down to review</>:<><Loader2 className="animate-spin h-[18px] w-[18px]"/>Extracting and populating tasks…</>}
              </div>
            )}
          </div>
        )}

        {/* Document Upload panel */}
        {inputMode==='document'&&(
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px] text-center">
            <input type="file" ref={fileInputRef} onChange={handleDocumentUpload} accept=".txt,.md,.rst,.rtf,.csv,.tsv,.json,.xml,.html,.yaml,.yml,.log,.pdf,.doc,.docx,.odt,.xls,.xlsx,.xlsm,.xlsb,.ods,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff,.tif,.heic,.heif,.avif,.ico,.svg" className="hidden"/>
            {!isUploading?(
              <>
                <div className="mb-[20px]">
                  <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]"><Upload className="h-[28px] w-[28px] text-[#6e6e73]"/></div>
                  <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Upload Document</h3>
                  <p className="text-[15px] text-[#6e6e73] max-w-[440px] mx-auto">Upload any business document — AI extracts and structures your workflow tasks automatically.</p>
                </div>
                <button type="button" onClick={()=>fileInputRef.current?.click()} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full font-semibold text-[17px] transition-all mb-[20px]"><Upload className="h-[18px] w-[18px]"/>Choose File</button>
                <div className="text-[12px] text-[#86868b] space-y-[4px]">
                  <p>📄 Documents · PDF · Word (.doc/.docx) · ODT · RTF · TXT · Markdown</p>
                  <p>📊 Spreadsheets · Excel (.xlsx/.xls/.xlsm) · ODS · CSV · TSV</p>
                  <p>📑 Presentations · PowerPoint (.pptx/.ppt)</p>
                  <p>🖼 Images · PNG · JPG · WebP · GIF · BMP · TIFF · HEIC · SVG · ICO</p>
                  <p>🗂 Data · JSON · XML · YAML · HTML · LOG</p>
                </div>
              </>
            ):(
              <div className="py-[8px]">
                <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white border border-[#d2d2d7] mb-[20px]">
                  {uploadProgress<100?<Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin"/>:<CheckCircle2 className="h-[28px] w-[28px] text-green-500"/>}
                </div>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] mb-[6px]">{uploadProgress<100?'Analysing your document…':'Tasks extracted!'}</h3>
                <p className="text-[14px] text-[#6e6e73] mb-[24px]">{uploadStage}</p>
                <div className="w-full max-w-[360px] mx-auto mb-[12px]">
                  <div className="flex justify-between text-[12px] text-[#86868b] mb-[6px]"><span>Progress</span><span>{uploadProgress}%</span></div>
                  <div className="w-full h-[6px] bg-[#e8e8ed] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{width:`${uploadProgress}%`,background:uploadProgress===100?'#22c55e':'linear-gradient(90deg,#0071e3,#34aadc)'}}/></div>
                </div>
                <div className="flex flex-wrap justify-center gap-[6px] max-w-[400px] mx-auto">
                  {['Reading file','Extracting text','AI parsing','Populating tasks'].map((s,i)=>{
                    const thresholds=[5,25,55,90]; const done=uploadProgress>=thresholds[i]
                    return <span key={s} className={`text-[11px] px-[10px] py-[4px] rounded-full border font-medium transition-all ${uploadProgress>=100?'bg-green-50 border-green-200 text-green-700':done?'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]':'bg-white border-[#e8e8ed] text-[#86868b]'}`}>{done&&uploadProgress<100?'✓ ':''}{s}</span>
                  })}
                </div>
                <p className="text-[12px] text-[#86868b] mt-[20px]">This can take 15–30 seconds for large documents — hang tight</p>
              </div>
            )}
          </div>
        )}

        {/* ── Context Selector — gradient circle icons + validation ── */}
        {/* ── Job Scanner panel ── */}
        {inputMode==='jobscan'&&(
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
            <div className="text-center mb-[28px]">
              <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white border border-[#d2d2d7] mb-[16px]">
                <Search className="h-[28px] w-[28px] text-[#0071e3]"/>
              </div>
              <h3 className="text-[19px] font-semibold text-[#1d1d1f] mb-[8px]">Job Scanner</h3>
              <p className="text-[15px] text-[#6e6e73] max-w-[440px] mx-auto">
                Enter any job title — AI researches the role online, extracts real tasks, scores automation potential, and surfaces real n8n community workflows you can import instantly.
              </p>
            </div>
            {jobScanStep==='idle'&&(
              <div className="max-w-[480px] mx-auto space-y-[16px]">
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-[6px]">Job Title <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={jobTitle}
                    onChange={e=>setJobTitle(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleJobScan()}}}
                    placeholder="e.g. Marketing Manager, Data Analyst, Software Engineer"
                    className="w-full px-[16px] py-[14px] rounded-[12px] border border-[#d2d2d7] bg-white text-[15px] text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition"
                  />
                </div>
                {jobScanError&&<div className="bg-red-50 border border-red-200 rounded-[10px] px-[14px] py-[10px] text-[13px] text-red-600">{jobScanError}</div>}

                {/* Inline context selector — auto-set to Solo, user can change */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-[10px]">Analysing as</label>
                  <div className="grid grid-cols-3 gap-[8px]">
                    {CONTEXT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setAnalysisContext(opt.value); setContextError(false) }}
                        className={`flex flex-col items-center gap-[6px] px-[10px] py-[12px] rounded-[12px] border-2 transition-all ${
                          analysisContext === opt.value
                            ? 'border-[#0071e3] bg-blue-50'
                            : 'border-[#e8e8ed] bg-white hover:border-[#b8b8bd]'
                        }`}
                      >
                        <div className={`w-[36px] h-[36px] rounded-full bg-gradient-to-br ${opt.gradient} flex items-center justify-center shrink-0`}>
                          {opt.icon}
                        </div>
                        <div className="text-center">
                          <div className="text-[12px] font-semibold text-[#1d1d1f] leading-tight">{opt.label}</div>
                          <div className="text-[10px] text-[#86868b]">{opt.desc}</div>
                        </div>
                        {analysisContext === opt.value && (
                          <CheckCircle2 className="h-[14px] w-[14px] text-[#0071e3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={handleJobScan} disabled={!jobTitle.trim()}
                  className="w-full flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[17px] py-[14px] rounded-full transition-all">
                  <Search className="h-[18px] w-[18px]"/>Scan This Job
                </button>
              </div>
            )}
            {(jobScanStep==='researching'||jobScanStep==='analyzing')&&(
              <div className="max-w-[400px] mx-auto text-center py-[8px] space-y-[24px]">
                <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white border border-[#d2d2d7]">
                  <Loader2 className="h-[28px] w-[28px] text-[#0071e3] animate-spin"/>
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-[#1d1d1f] mb-[4px]">
                    {jobScanStep==='researching'?'Researching role online…':'Running AI analysis…'}
                  </p>
                  <p className="text-[13px] text-[#6e6e73]">
                    {jobScanStep==='researching'?'Searching job boards for real task data':`Scoring ${jobScanTasks.length} tasks for automation potential`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-[10px]">
                  {[{id:'researching',label:'Research'},{id:'analyzing',label:'Analysis'}].map((s,i)=>{
                    const isActive=jobScanStep===s.id; const isDone=jobScanStep==='analyzing'&&s.id==='researching'
                    return (
                      <div key={s.id} className="flex items-center gap-[8px]">
                        <div className={`flex items-center gap-[5px] px-[12px] py-[5px] rounded-full text-[12px] font-semibold transition-all ${isActive?'bg-[#0071e3] text-white':isDone?'bg-green-100 text-green-700':'bg-white border border-[#d2d2d7] text-[#86868b]'}`}>
                          {isActive&&<Loader2 className="h-[10px] w-[10px] animate-spin"/>}
                          {isDone&&<CheckCircle2 className="h-[10px] w-[10px]"/>}
                          {s.label}
                        </div>
                        {i===0&&<div className="w-[12px] h-[1px] bg-[#d2d2d7]"/>}
                      </div>
                    )
                  })}
                </div>
                {jobScanStep==='analyzing'&&jobScanTasks.length>0&&(
                  <div className="bg-white border border-[#e8e8ed] rounded-[14px] p-[16px] text-left">
                    <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-[10px]">{jobScanTasks.length} tasks found</p>
                    <div className="space-y-[6px]">
                      {jobScanTasks.slice(0,5).map((t,i)=>(
                        <div key={i} className="flex items-center gap-[8px] text-[13px] text-[#1d1d1f]">
                          <div className="w-[5px] h-[5px] rounded-full bg-[#0071e3] shrink-0"/>{t.name}
                        </div>
                      ))}
                      {jobScanTasks.length>5&&<div className="text-[11px] text-[#a1a1a6] pl-[13px]">+{jobScanTasks.length-5} more…</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div id="context-selector" className={`rounded-[18px] p-[32px] border-2 transition-all duration-300 ${contextError?'border-red-400 bg-red-50/60':'border-[#d2d2d7] bg-[#f5f5f7]'}`}>
          <div className="flex items-start justify-between gap-[12px] mb-[6px]">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Who is this analysis for? <span className="text-red-500">*</span></h2>
            {contextError&&(
              <span className="flex items-center gap-[6px] text-[12px] font-semibold text-red-600 bg-red-100 border border-red-300 px-[12px] py-[5px] rounded-full shrink-0 animate-pulse">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-[13px] h-[13px]"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                Please select one
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#86868b] mb-[24px]">WorkScanAI adapts its scoring, framing, and recommendations based on the context of your submission.</p>

          <div className="grid grid-cols-3 gap-[12px] mb-[20px]">
            {CONTEXT_OPTIONS.map(({value,label,desc,gradient,ring,icon})=>(
              <button key={value} type="button"
                onClick={()=>{setAnalysisContext(value);setContextError(false)}}
                className={`flex flex-col items-center text-center px-[12px] py-[22px] rounded-[18px] border-2 transition-all duration-200 ${
                  analysisContext===value
                    ? `border-transparent bg-white shadow-lg ring-2 ${ring} ring-offset-2`
                    : `border-[#d2d2d7] bg-white hover:border-[#b8b8bd] hover:shadow-md ${contextError?'border-red-200':''}`
                }`}
              >
                {/* Gradient filled circle — matches feature card icons */}
                <div className={`w-[58px] h-[58px] rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mb-[14px] shadow-md transition-all duration-200 ${analysisContext===value?'scale-110 shadow-lg':''}`}>
                  {icon}
                </div>
                <span className="text-[14px] font-semibold text-[#1d1d1f] leading-tight">{label}</span>
                <span className="text-[11px] text-[#86868b] mt-[4px]">{desc}</span>
              </button>
            ))}
          </div>

          {/* Team/company extra fields */}
          {(analysisContext==='team'||analysisContext==='company')&&(
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] pt-[4px]">
              <div>
                <label className={labelClass}>Team / Company Size</label>
                <div className="relative">
                  <select value={teamSize} onChange={e=>setTeamSize(e.target.value)} className={selectClass}>
                    <option value="">Select size…</option>
                    <option value="2-10">2–10 people</option><option value="11-50">11–50 people</option>
                    <option value="51-200">51–200 people</option><option value="201-1000">201–1,000 people</option>
                    <option value="1000+">1,000+ people</option>
                  </select>
                  <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none"/>
                </div>
              </div>
              <div>
                <label className={labelClass}>Industry / Department</label>
                <div className="relative">
                  <select value={industry} onChange={e=>setIndustry(e.target.value)} className={selectClass}>
                    <option value="">Select industry…</option>
                    <option value="marketing">Marketing</option><option value="sales">Sales</option>
                    <option value="finance">Finance & Accounting</option><option value="hr">HR & Recruiting</option>
                    <option value="operations">Operations & Logistics</option><option value="legal">Legal & Compliance</option>
                    <option value="engineering">Engineering & Product</option><option value="customer_support">Customer Support</option>
                    <option value="consulting">Consulting & Advisory</option><option value="healthcare">Healthcare</option>
                    <option value="education">Education</option><option value="other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none"/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Details — hidden in jobscan mode */}
        {inputMode!=='jobscan'&&(
        <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
          <h2 className="text-[21px] font-semibold text-[#1d1d1f] mb-[6px]">Workflow Details</h2>
          {taskCount > 0 && (
            <p className="text-[15px] font-bold text-[#1d1d1f] mb-[28px]">
              Analysing{' '}
              <span className="text-[#0071e3]">{taskCount}</span>{' '}
              task{taskCount !== 1 ? 's' : ''} for your role — estimated{' '}
              <span className="text-[#0071e3]">{taskCount * 3}–{taskCount * 6}s</span>
            </p>
          )}
          <div className="space-y-[20px]">
            <div><label className={labelClass}>Workflow Name <span className="text-red-500">*</span></label>
              <input type="text" value={workflowName} onChange={e=>setWorkflowName(e.target.value)} placeholder="e.g., Marketing Team Workflow" className={inputClass} required/></div>
            <div><label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
              <textarea value={workflowDescription} onChange={e=>setWorkflowDescription(e.target.value)} placeholder="Describe your workflow or team…" rows={3} className={`${inputClass} resize-none`}/></div>
            <div><label className={labelClass}>Hourly Rate (€) — for ROI calculation</label>
              <div className="relative"><span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[15px] text-[#86868b]">€</span>
              <input type="number" value={hourlyRate} onChange={e=>setHourlyRate(Number(e.target.value))} min="1" className={`${inputClass} pl-[28px]`}/></div></div>
          </div>
        </div>
        )}

        {/* Tasks */}
        {(inputMode==='manual'||inputMode==='voice')&&(
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[40px]">
            <div className="flex items-center justify-between mb-[28px]">
              <h2 className="text-[21px] font-semibold text-[#1d1d1f]">Tasks</h2>
              <button type="button" onClick={addTask} className="inline-flex items-center gap-[6px] border border-[#d2d2d7] bg-white hover:bg-[#f5f5f7] px-[16px] py-[8px] rounded-full text-[14px] font-medium transition-all"><Plus className="h-[14px] w-[14px]"/>Add Task</button>
            </div>
            <div className="space-y-[20px]">
              {tasks.map((task,idx)=>(
                <div key={idx} className="bg-white border border-[#d2d2d7] rounded-[14px] p-[28px]">
                  <div className="flex items-center justify-between mb-[20px]">
                    <span className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">Task {idx+1}</span>
                    {tasks.length>1&&<button type="button" onClick={()=>removeTask(idx)} className="flex items-center gap-[4px] text-[13px] text-[#86868b] hover:text-red-500 transition-colors"><Trash2 className="h-[14px] w-[14px]"/>Remove</button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <div className="md:col-span-2"><label className={labelClass}>Task Name <span className="text-red-500">*</span></label>
                      <textarea value={task.name} onChange={e=>updateTask(idx,'name',e.target.value)} placeholder="e.g., Write social media posts" rows={2} className={`${inputClass} resize-none leading-snug`} required/></div>
                    <div className="md:col-span-2"><label className={labelClass}>Description <span className="text-[#86868b] normal-case font-normal">(optional)</span></label>
                      <textarea value={task.description} onChange={e=>updateTask(idx,'description',e.target.value)} placeholder="Additional context or details…" rows={3} className={`${inputClass} resize-none leading-snug`}/></div>
                    <div><label className={labelClass}>Frequency</label>
                      <div className="relative"><select value={task.frequency} onChange={e=>updateTask(idx,'frequency',e.target.value)} className={selectClass}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none"/></div></div>
                    <div><label className={labelClass}>Time per Task (minutes)</label>
                      <input type="number" value={task.time_per_task} onChange={e=>updateTask(idx,'time_per_task',Number(e.target.value))} min="1" className={inputClass}/></div>
                    <div><label className={labelClass}>Category</label>
                      <div className="relative"><select value={task.category} onChange={e=>updateTask(idx,'category',e.target.value)} className={selectClass}><option value="general">General</option><option value="data_entry">Data Entry</option><option value="communication">Communication</option><option value="analysis">Analysis</option><option value="creative">Creative</option><option value="administrative">Administrative</option></select><ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none"/></div></div>
                    <div><label className={labelClass}>Complexity</label>
                      <div className="relative"><select value={task.complexity} onChange={e=>updateTask(idx,'complexity',e.target.value)} className={selectClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b] pointer-events-none"/></div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit — hidden in jobscan mode (scan button handles it) */}
        {inputMode!=='jobscan'&&(
        <div className="flex flex-col items-end gap-[10px] pt-[8px]">
          {taskCount>0&&<p className="text-[13px] text-[#86868b]">Analysing {taskCount} task{taskCount!==1?'s':''} for {analysisContext==='individual'?'your role':analysisContext==='team'?'your team':analysisContext==='company'?'your company':'…'} — estimated {taskCount*3}–{taskCount*6}s</p>}
          <button type="submit" disabled={isAnalyzing||isUploading||isExtractingTasks} className="inline-flex items-center gap-[10px] bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#86868b] disabled:cursor-not-allowed text-white px-[36px] py-[16px] rounded-full font-semibold text-[17px] transition-all">
            {isAnalyzing?<><Loader2 className="animate-spin h-[18px] w-[18px]"/>Running Analysis…</>:isExtractingTasks?<><Loader2 className="animate-spin h-[18px] w-[18px]"/>Extracting tasks…</>:'Analyse Workflow/s →'}
          </button>
          {!isAnalyzing&&<p className="text-[13px] text-[#86868b]">Free tier · 5 analyses per 24 hours · No account needed.</p>}
        </div>
        )}

      </form>
    </>
  )
}
