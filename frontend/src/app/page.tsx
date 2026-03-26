'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, Sparkles } from 'lucide-react'
import WorkflowForm from '@/components/WorkflowForm'

export default function LandingPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 })
  const [spotlightVisible, setSpotlightVisible] = useState(false)
  const analyzeRef = useRef<HTMLElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setSpotlightPos({ x, y })
  }, [])

  const handleAnalysisComplete = (workflowId: number) => {
    // Use hard navigation so the overlay stays visible during the transition
    window.location.href = `/dashboard/results/${workflowId}`
  }

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="flex items-center gap-[6px] sm:gap-[8px] text-[18px] sm:text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
              <Brain className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex gap-[16px] sm:gap-[32px] text-[12px]">
              <Link
                href="/dashboard"
                className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap"
              >
                Past Analyses
              </Link>
              <a
                href="#analyze"
                className="text-[#0071e3] hover:text-[#0077ed] font-medium transition-colors whitespace-nowrap"
              >
                New Analysis
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section â€” sits flush under the fixed nav, no gap */}
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
            The future of work
            <br />
            starts with knowing
            <br />
            what to automate.
          </h1>

          {/* Value Proposition Block */}
          <div className="max-w-[680px] mx-auto mt-[24px] sm:mt-[40px]">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[18px] p-[20px] sm:p-[32px]">
              <p className="text-[16px] sm:text-[21px] leading-[1.381] font-normal text-white/90 mb-[20px] sm:mb-[28px]">
                Find out which of your tasks AI can automate <em>right now</em> and how â€” save your time and money.
              </p>
              <div className="flex gap-[16px] justify-center items-center flex-wrap">
                <a
                  href="#analyze"
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all group shadow-lg hover-pop"
                >
                  <span>Analyze now</span>
                  <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
                </a>
                <a
                  href="#analyze"
                  className="text-white/80 hover:text-white text-[17px] leading-[1.17] font-normal transition-colors underline underline-offset-4 decoration-white/40"
                >
                  See how it works
                </a>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-[8px] sm:gap-[48px] justify-center mt-[24px] sm:mt-[48px] w-full max-w-[560px] mx-auto px-2">
            <div className="text-center min-w-0">
              <div className="text-[20px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight">&lt;5 min</div>
              <div className="text-[10px] sm:text-[13px] text-white/60 mt-[4px]">to analyze</div>
            </div>
            <div className="text-center border-x border-white/20 px-[8px] sm:px-0 min-w-0">
              <div className="text-[20px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight">0â€“100%</div>
              <div className="text-[10px] sm:text-[13px] text-white/60 mt-[4px]">automation score</div>
            </div>
            <div className="text-center min-w-0">
              <div className="text-[20px] sm:text-[34px] font-semibold tracking-tight text-white drop-shadow leading-tight">â‚¬28K+</div>
              <div className="text-[10px] sm:text-[13px] text-white/60 mt-[4px]">avg. savings</div>
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
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f] hover-shimmer">AI Analysis</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Evaluates every task for automation readiness
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full hover-lift hover-glow hover-float-icon cursor-default">
              <div className="icon-circle w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f]">ROI Calculator</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Calculates time and cost savings instantly
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full hover-lift hover-glow hover-float-icon cursor-default">
              <div className="icon-circle w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold italic mb-[8px] tracking-tight text-[#1d1d1f]">Action Roadmap</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Prioritized plan from quick wins to long-term
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Analyze Form Section â”€â”€ */}
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
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/15 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold italic tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                Start your analysis now.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Enter a job title, upload a document, use voice, or type tasks manually.
            </p>
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
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>Â© 2026 WorkScanAI</div>
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
