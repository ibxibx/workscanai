'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Brain } from 'lucide-react'
import WorkflowForm from '@/components/WorkflowForm'

// Niche-aware "is my job automatable?" landing. Each niche campaign URL can pass
// ?aud=<segment> (sets PostHog audience super-prop via lib/audience.ts) and an
// optional ?role=<job title> that deep-links straight into the Job Scanner with
// the role pre-filled. The headline + subcopy adapt to the niche so the page
// reads as purpose-built for whoever clicked, not a generic homepage.

interface NicheCopy {
  eyebrow: string
  headline: string
  sub: string
}

// Keyed by the same audience segments lib/audience.ts resolves. 'default' covers
// direct / unknown traffic. Copy speaks to each niche's actual motivation.
const NICHE_COPY: Record<string, NicheCopy> = {
  automation_builder: {
    eyebrow: 'For automation builders',
    headline: 'Which tasks are worth automating first?',
    sub: 'Enter a role — get a ranked, scored task list and real n8n community workflows you can import today.',
  },
  ops_manager: {
    eyebrow: 'For operations leaders',
    headline: 'See where your team\u2019s hours actually go.',
    sub: 'Scan any role to surface repetitive, automatable work — with hours reclaimed and annual savings, ready for a stakeholder deck.',
  },
  founder: {
    eyebrow: 'For founders',
    headline: 'Do more before you hire more.',
    sub: 'Find the work you can automate now instead of headcount — scored by ROI, with tools and payback for each task.',
  },
  developer: {
    eyebrow: 'For developers',
    headline: 'Is this role automatable? Get the breakdown.',
    sub: 'Atomic task decomposition, automation scores, and importable n8n workflows — the analysis, not the hype.',
  },
  ai_curious: {
    eyebrow: 'Curious where AI fits?',
    headline: 'Is your job automatable? Find out in a minute.',
    sub: 'Enter your job title. AI researches the role, scores each task, and shows what can be automated today.',
  },
  default: {
    eyebrow: 'Job Scanner',
    headline: 'Is your job automatable?',
    sub: 'Enter any job title. AI researches the role, extracts real tasks, scores automation potential, and surfaces n8n workflows you can import.',
  },
}

function ScanContent() {
  const [formError, setFormError] = useState<string | null>(null)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [copy, setCopy] = useState<NicheCopy>(NICHE_COPY.default)
  const [role, setRole] = useState<string>('')
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 })
  const [spotlightVisible, setSpotlightVisible] = useState(false)
  const analyzeRef = useRef<HTMLElement>(null)

  // Resolve niche copy + pre-filled role from URL params on mount. The audience
  // super-property itself is registered globally by PostHogProvider; here we only
  // mirror it to pick copy + (optionally) a deep-linked role.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const aud = (params.get('aud') || '').toLowerCase()
      if (aud && NICHE_COPY[aud]) setCopy(NICHE_COPY[aud])
      const r = (params.get('role') || params.get('job') || '').trim().slice(0, 80)
      if (r) setRole(r)
      // ?ref={code} viewer->creator attribution, same contract as the homepage.
      const param = (params.get('ref') || '').trim().slice(0, 16)
      const stored = sessionStorage.getItem('wsai_ref')
      const ref = param || stored || ''
      if (ref) {
        setReferredBy(ref)
        if (param) sessionStorage.setItem('wsai_ref', ref)
      }
    } catch { /* ignore */ }
  }, [])

  // Pre-warm Render backend on landing so the dyno is awake by submit time.
  useEffect(() => {
    import('@/lib/wake-ping').then(({ wakeBackend }) => {
      wakeBackend().catch(() => {})
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSpotlightPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const handleAnalysisComplete = (workflowId: number, shareCode?: string) => {
    window.location.href = shareCode ? `/report/${shareCode}` : `/dashboard/results/${workflowId}`
  }

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      {/* Navigation — mirrors the homepage for brand continuity */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-[44px] gap-2">
            <Link href="/" className="flex items-center gap-[6px] sm:gap-[8px] text-[18px] sm:text-[21px] font-semibold tracking-tight text-[#1d1d1f] shrink-0">
              <Brain className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex gap-[12px] md:gap-[32px] text-[11px] md:text-[12px] shrink-0">
              <Link href="/" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap">Home</Link>
              <a href="#scan" className="text-[#0071e3] hover:text-[#0077ed] font-medium transition-colors whitespace-nowrap">Scan a role</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — niche-aware headline is the signature element */}
      <section
        className="relative overflow-hidden"
        style={{ marginTop: '44px', background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ea 100%)' }}
      >
        <div className="max-w-[820px] mx-auto px-6 py-[72px] sm:py-[110px] text-center">
          <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-[18px]">
            {copy.eyebrow}
          </p>
          <h1 className="text-[32px] sm:text-[56px] leading-[1.05] font-semibold italic tracking-tight mb-[20px] text-[#1d1d1f]">
            {copy.headline}
          </h1>
          <p className="text-[15px] sm:text-[20px] text-[#6e6e73] max-w-[560px] mx-auto leading-[1.5]">
            {copy.sub}
          </p>
          <a
            href="#scan"
            className="inline-flex items-center gap-[8px] mt-[32px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[26px] py-[13px] rounded-full transition-all"
          >
            Scan a role — free
          </a>
          <p className="text-[12px] text-[#86868b] mt-[14px]">No signup · result in about a minute</p>
        </div>
      </section>

      {/* Scanner section — Job Scanner pre-selected, role pre-filled from ?role= */}
      <section
        id="scan"
        ref={analyzeRef}
        className="relative py-[64px] sm:py-[80px] border-t border-[#d2d2d7] overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #e8e8ea 0%, #d8d8da 100%)' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setSpotlightVisible(true)}
        onMouseLeave={() => setSpotlightVisible(false)}
      >
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: spotlightVisible ? 1 : 0,
            background: `radial-gradient(500px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(220,235,255,0.45) 0%, transparent 70%)`,
          }}
        />
        <div className="relative z-10 max-w-[980px] mx-auto px-6">
          {formError && (
            <div className="max-w-[800px] mx-auto mb-[24px] bg-red-50 border border-red-200 rounded-[14px] px-[20px] py-[16px]">
              <p className="text-[15px] text-red-700">{formError}</p>
            </div>
          )}
          <WorkflowForm
            onAnalysisComplete={handleAnalysisComplete}
            onError={(e) => setFormError(e || null)}
            referredByCode={referredBy}
            initialMode="jobscan"
            initialJobTitle={role}
          />
        </div>
      </section>

      {/* Footer — mirrors homepage */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">Ian Baumeister</a>
              <a href="https://github.com/ibxibx/workscanai" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f5f7]" />}>
      <ScanContent />
    </Suspense>
  )
}
