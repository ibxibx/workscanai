'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, Sparkles } from 'lucide-react'
import WorkflowForm from '@/components/WorkflowForm'
import posthog from 'posthog-js'
import { getFeatureFlag, registerExperimentVariant, isPostHogReady } from '@/lib/analytics'
import LanguageToggle from '@/components/LanguageToggle'
import { useT } from '@/i18n/client'

// Canonical pre-generated sample report (real AI analysis of a marketing-team
// workflow). Lets visitors see a credible result instantly — value before input,
// zero wait, no quota slot. Swap the code here to point at a different sample.
const SAMPLE_REPORT_CODE = 'e07429'

export default function LandingPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 })
  const [spotlightVisible, setSpotlightVisible] = useState(false)
  // onboarding-style A/B: 'control' (blank form) vs 'sample_first' (lead with a
  // real sample report). Defaults to control until the flag resolves so SSR +
  // no-PostHog visitors get the current experience.
  const [onboardingVariant, setOnboardingVariant] = useState<'control' | 'sample_first'>('control')
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const analyzeRef = useRef<HTMLElement>(null)
  const t = useT('home')

  // Read ?ref={code} — the share_code of a report a viewer came from. Persist in
  // sessionStorage so it survives even if the param is stripped on later navs.
  // Powers the viewer→creator (k-factor) attribution in admin stats.
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('ref')
      const stored = sessionStorage.getItem('wsai_ref')
      const ref = (param || stored || '').trim().slice(0, 16)
      if (ref) {
        setReferredBy(ref)
        if (param) sessionStorage.setItem('wsai_ref', ref)
      }
    } catch { /* ignore */ }
  }, [])

  // Pre-warm Render backend on landing — by the time the user fills
  // the form (typically 30s+), the dyno is awake. Best-effort, fail silent.
  useEffect(() => {
    import('@/lib/wake-ping').then(({ wakeBackend }) => {
      wakeBackend().catch(() => {})
    })
  }, [])

  // Resolve the onboarding-style A/B variant. PostHog loads flags async, so we
  // subscribe via onFeatureFlags and also try an immediate read. Once resolved,
  // register the arm as a super property so the whole funnel splits by variant.
  useEffect(() => {
    if (!isPostHogReady()) return
    const apply = () => {
      const v = getFeatureFlag('onboarding-style')
      const variant = v === 'sample_first' ? 'sample_first' : 'control'
      setOnboardingVariant(variant)
      registerExperimentVariant('onboarding-style', variant)
    }
    apply()
    let unsub: (() => void) | undefined
    try { unsub = posthog.onFeatureFlags(() => apply()) } catch { /* ignore */ }
    return () => { try { unsub?.() } catch { /* ignore */ } }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSpotlightPos({ x, y })
  }, [])

  const handleAnalysisComplete = (workflowId: number, shareCode?: string) => {
    // Job Scanner returns a share_code — go to the public report URL directly
    // Other modes only have a workflow ID — use the dashboard results route
    window.location.href = shareCode
      ? `/report/${shareCode}`
      : `/dashboard/results/${workflowId}`
  }

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-[44px] gap-2">
            <Link href="/" className="flex items-center gap-[6px] sm:gap-[8px] text-[18px] sm:text-[21px] font-semibold tracking-tight text-[#1d1d1f] shrink-0">
              <Brain className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex gap-[12px] md:gap-[32px] text-[11px] md:text-[12px] shrink-0">
              <LanguageToggle />
              <Link
                href="/scan"
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap"
              >
                <span className="hidden md:inline">{t('navScanLong')}</span>
                <span className="md:hidden">{t('navScanShort')}</span>
              </Link>
              <Link
                href="/templates"
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap"
              >
                <span className="hidden md:inline">{t('navTemplates')}</span>
                <span className="md:hidden">{t('navTemplates')}</span>
              </Link>
              <Link
                href="/dashboard"
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap"
              >
                <span className="hidden md:inline">{t('navPastLong')}</span>
                <span className="md:hidden">{t('navHistoryShort')}</span>
              </Link>
              <a
                href="#analyze"
                className="text-[#0071e3] hover:text-[#0077ed] font-medium transition-colors whitespace-nowrap"
              >
                <span className="hidden md:inline">{t('navNewLong')}</span>
                <span className="md:hidden">{t('navAnalyzeShort')}</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — sits flush under the fixed nav, no gap */}
      <section className="relative min-h-[580px]" style={{marginTop: '44px', marginBottom: 0}}>
        {/* Image covers the full section */}
        <img
          src="/Banner1.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />

        {/* Content sits above image */}
        <div className="relative z-20 flex items-center min-h-[580px]">
          <div className="w-full max-w-[980px] mx-auto px-4 sm:px-6 py-[48px] sm:py-[64px] text-center overflow-hidden">

          {/* Headline */}
          <h1 className="text-[28px] sm:text-[40px] md:text-[52px] leading-[1.07] font-semibold italic tracking-tight text-white mb-[16px] drop-shadow-lg px-2">
            {t('heroLine1')}
            <br />
            {t('heroLine2')}
            <br />
            {t('heroLine3')}
          </h1>

          {/* One-line product descriptor — instant clarity on what WorkScanAI is */}
          <p className="max-w-[600px] mx-auto mt-[8px] text-[15px] sm:text-[19px] leading-[1.4] font-normal text-white/85 drop-shadow px-3">
            {t('heroDescriptor')}
          </p>

          {/* Value Proposition Block */}
          <div className="max-w-[680px] mx-auto mt-[24px] sm:mt-[40px]">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[18px] p-[20px] sm:p-[32px]">
              <p className="text-[16px] sm:text-[21px] leading-[1.381] font-normal text-white/90 mb-[20px] sm:mb-[28px]">
                {t('heroValue1')}<em>{t('heroValueEm')}</em>{t('heroValue2')}
              </p>
              <div className="flex gap-[16px] justify-center items-center flex-wrap">
                <a
                  href="#analyze"
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all group shadow-lg hover-pop"
                >
                  <span>{t('ctaAnalyzeNow')}</span>
                  <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
                </a>
                <a
                  href={`/report/${SAMPLE_REPORT_CODE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-white text-[17px] leading-[1.17] font-normal transition-colors underline underline-offset-4 decoration-white/40"
                >
                  {t('ctaSeeHow')}
                </a>
                <Link
                  href="/templates"
                  className="text-white/80 hover:text-white text-[17px] leading-[1.17] font-normal transition-colors underline underline-offset-4 decoration-white/40"
                >
                  {t('ctaBrowse')}
                </Link>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-[8px] sm:gap-[48px] justify-center mt-[24px] sm:mt-[48px] w-full max-w-[560px] mx-auto px-2">
            <div className="text-center min-w-0">
              <div className="text-[18px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight whitespace-nowrap">&lt;5 min</div>
              <div className="text-[9px] sm:text-[13px] text-white/60 mt-[4px] whitespace-nowrap">{t('statAnalyzeLabel')}</div>
            </div>
            <div className="text-center border-x border-white/20 px-[8px] sm:px-0 min-w-0">
              <div className="text-[18px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight whitespace-nowrap">0–100%</div>
              <div className="text-[9px] sm:text-[13px] text-white/60 mt-[4px] whitespace-nowrap">{t('statScoreLabel')}</div>
            </div>
            <div className="text-center min-w-0">
              <div className="text-[18px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight whitespace-nowrap">€28K+</div>
              <div className="text-[9px] sm:text-[13px] text-white/60 mt-[4px] whitespace-nowrap">{t('statSavingsLabel')}</div>
            </div>
          </div>

          </div>{/* end inner max-w div */}
        </div>{/* end relative z-20 flex div */}
      </section>

      {/* Features */}
      <section className="py-[60px] border-y border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[20px]">
            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full hover-lift hover-glow hover-float-icon cursor-default">
              <div className="icon-circle w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-[20px] w-[20px] text-white" />
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f] hover-shimmer">{t('featAiTitle')}</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                {t('featAiDesc')}
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full hover-lift hover-glow hover-float-icon cursor-default">
              <div className="icon-circle w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f]">{t('featRoiTitle')}</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                {t('featRoiDesc')}
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full hover-lift hover-glow hover-float-icon cursor-default">
              <div className="icon-circle w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f]">{t('featN8nTitle')}</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                {t('featN8nDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* —€—€ Analyze Form Section —€—€ */}
      <section
        id="analyze"
        ref={analyzeRef}
        className="relative py-[80px] border-t border-[#d2d2d7] overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #e8e8ea 0%, #d8d8da 100%)' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setSpotlightVisible(true)}
        onMouseLeave={() => setSpotlightVisible(false)}
      >
        {/* Faded light-blue mouse spotlight */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: spotlightVisible ? 1 : 0,
            background: `radial-gradient(500px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(220,235,255,0.45) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 max-w-[980px] mx-auto px-6">
          {/* sample_first arm: lead with a real report so visitors see value
              before any input. control arm keeps the subtle inline link below. */}
          {onboardingVariant === 'sample_first' && (
            <a
              href={`/report/${SAMPLE_REPORT_CODE}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { try { posthog.capture('sample_report_clicked', { placement: 'sample_first_card' }) } catch {} }}
              className="group block max-w-[680px] mx-auto mb-[40px] bg-white border border-[#e8e8ed] rounded-[20px] p-[24px] sm:p-[32px] shadow-sm hover:shadow-md hover:border-[#0071e3]/40 transition-all"
            >
              <div className="flex items-center gap-[8px] mb-[12px]">
                <Sparkles className="h-[16px] w-[16px] text-[#0071e3]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">{t('sampleKicker')}</span>
              </div>
              <h3 className="text-[20px] sm:text-[26px] font-semibold italic tracking-tight text-[#1d1d1f] mb-[8px]">
                {t('sampleTitle')}
              </h3>
              <p className="text-[14px] sm:text-[16px] text-[#6e6e73] leading-[1.5] mb-[16px]">
                {t('sampleDesc')}
              </p>
              <span className="inline-flex items-center gap-[6px] text-[14px] font-medium text-[#0071e3] group-hover:gap-[10px] transition-all">
                {t('sampleCta')} <ArrowRight className="h-[15px] w-[15px]" />
              </span>
            </a>
          )}
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/15 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[22px] sm:text-[40px] leading-[1.1] font-semibold italic tracking-tight mb-[10px] text-[#1d1d1f] px-[16px] sm:px-[32px]">
                {t('analyzeTitle')}
              </h2>
            </div>
            <p className="text-[14px] sm:text-[19px] text-[#6e6e73] px-4">
              {t('analyzeSubtitle')}
            </p>
            {/* Value before input — let visitors see a real report instantly */}
            {/* control arm only — sample_first shows the prominent card above */}
            {onboardingVariant === 'control' && (
            <p className="text-[13px] sm:text-[15px] text-[#86868b] mt-[14px] px-4">
              {t('notSure')}{' '}
              <a
                href={`/report/${SAMPLE_REPORT_CODE}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { try { posthog.capture('sample_report_clicked', { placement: 'control_inline_link' }) } catch {} }}
                className="text-[#0071e3] hover:text-[#0077ed] font-medium underline underline-offset-4 decoration-[#0071e3]/40 transition-colors"
              >
                {t('seeSample')}
              </a>{' '}
              {t('sampleTail')}
            </p>
            )}
          </div>

          {/* Error banner */}
          {formError && (
            <div className="max-w-[800px] mx-auto mb-[24px] bg-red-50 border border-red-200 rounded-[14px] px-[20px] py-[16px]">
              <p className="text-[15px] text-red-700">{formError}</p>
            </div>
          )}

          <WorkflowForm
            onAnalysisComplete={handleAnalysisComplete}
            onError={(e) => setFormError(e || null)}
            referredByCode={referredBy}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">
                Ian Baumeister
              </a>
              <a href="https://github.com/ibxibx/workscanai" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
