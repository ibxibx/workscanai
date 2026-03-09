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
    <div className="min-h-screen bg-white text-[#1d1d1f]">
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

      {/* Hero Section — real img so the overlay is structurally confined to the image */}
      <section className="relative mt-[44px]">
        {/* The image sets the natural height of the section; min-height ensures enough room on mobile */}
        <img
          src="/Banner1.jpg"
          alt=""
          aria-hidden="true"
          className="block w-full h-auto min-h-[520px] object-cover"
        />
        {/* Overlay sits on top of the image only — can never escape the section */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Content is centred over the image */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-[980px] mx-auto px-4 sm:px-6 py-[48px] sm:py-[90px] text-center">

          {/* Headline */}
          <h1 className="text-[32px] sm:text-[44px] md:text-[56px] leading-[1.07] font-semibold italic tracking-tight text-white mb-[16px] drop-shadow-lg">
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
                Find out which of your tasks AI can automate <em>right now</em> and how — save your time and money.
              </p>
              <div className="flex gap-[16px] justify-center items-center flex-wrap">
                <a
                  href="#analyze"
                  className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all group shadow-lg"
                >
                  <span>Analyze now</span>
                  <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
                </a>
                <a
                  href="#example"
                  className="text-white/80 hover:text-white text-[17px] leading-[1.17] font-normal transition-colors underline underline-offset-4 decoration-white/40"
                >
                  See how it works
                </a>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-[12px] sm:gap-[48px] justify-center mt-[32px] sm:mt-[48px] max-w-[600px] mx-auto">
            <div className="text-center">
              <div className="text-[24px] sm:text-[36px] font-semibold tracking-tight text-white drop-shadow">&lt;5 min</div>
              <div className="text-[11px] sm:text-[13px] text-white/60 mt-[4px]">to analyze</div>
            </div>
            <div className="text-center border-x border-white/20 px-[12px] sm:px-0">
              <div className="text-[24px] sm:text-[36px] font-semibold tracking-tight text-white drop-shadow">0–100%</div>
              <div className="text-[11px] sm:text-[13px] text-white/60 mt-[4px]">automation score</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] sm:text-[36px] font-semibold tracking-tight text-white drop-shadow">€28K+</div>
              <div className="text-[11px] sm:text-[13px] text-white/60 mt-[4px]">avg. savings</div>
            </div>
          </div>

          </div>{/* end inner max-w div */}
        </div>{/* end absolute inset-0 flex div */}
      </section>

      {/* Features */}
      <section className="py-[60px] border-y border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[20px]">
            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-[20px] w-[20px] text-white" />
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">AI Analysis</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Evaluates every task for automation readiness
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">ROI Calculator</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Calculates time and cost savings instantly
              </p>
            </div>

            <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">Action Roadmap</h3>
              <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                Prioritized plan from quick wins to long-term
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="example" className="py-[80px]">
        <div className="max-w-[980px] mx-auto px-6">

          {/* Heading */}
          <div className="text-center mb-[56px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                See exactly what you get.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              A real marketing team workflow — analyzed end to end.
            </p>
          </div>

          {/* Step flow: Input → Analysis → Roadmap */}
          <div className="space-y-[16px]">

            {/* ── Row 1: Input + Overall Score ── */}
            <div className="grid md:grid-cols-2 gap-[16px]">

              {/* Input */}
              <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
                <div className="text-[11px] font-semibold text-[#86868b] tracking-widest uppercase mb-[20px]">① Input — 5 Tasks Entered</div>
                <div className="space-y-[10px]">
                  {[
                    { name: 'Write social media posts',      freq: 'Daily',   time: '30 min' },
                    { name: 'Schedule posts across platforms', freq: 'Daily',   time: '15 min' },
                    { name: 'Respond to comments',           freq: 'Daily',   time: '45 min' },
                    { name: 'Generate performance reports',  freq: 'Weekly',  time: '2 hrs'  },
                    { name: 'Research trending topics',      freq: 'Daily',   time: '1 hr'   },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-[#e8e8ed] rounded-[10px] px-[14px] py-[10px]">
                      <span className="text-[13px] font-medium text-[#1d1d1f]">{t.name}</span>
                      <div className="flex gap-[8px] shrink-0 ml-[12px]">
                        <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-[8px] py-[3px] rounded-full">{t.freq}</span>
                        <span className="text-[11px] text-[#86868b] bg-[#f5f5f7] px-[8px] py-[3px] rounded-full">{t.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Score */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-[18px] p-[32px] flex flex-col justify-between">
                <div className="text-[11px] font-semibold text-[#0071e3] tracking-widest uppercase mb-[20px]">② Analysis — Summary</div>
                <div className="flex items-center gap-[24px] mb-[24px]">
                  <div>
                    <div className="text-[64px] leading-none font-semibold tracking-tight text-[#0071e3]">72%</div>
                    <div className="text-[15px] text-[#6e6e73]">Automation Score</div>
                  </div>
                  <div className="h-[64px] w-[1px] bg-blue-200"></div>
                  <div className="space-y-[12px]">
                    <div>
                      <div className="text-[28px] font-semibold tracking-tight text-green-600">€28,000</div>
                      <div className="text-[12px] text-[#6e6e73]">Annual cost savings</div>
                    </div>
                    <div>
                      <div className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">436 hrs</div>
                      <div className="text-[12px] text-[#6e6e73]">Reclaimed per year</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-[8px]">
                  <div className="bg-green-100 border border-green-200 rounded-[10px] p-[10px] text-center">
                    <div className="text-[18px] font-semibold text-green-700">2</div>
                    <div className="text-[10px] text-green-600 font-medium">High potential</div>
                  </div>
                  <div className="bg-yellow-100 border border-yellow-200 rounded-[10px] p-[10px] text-center">
                    <div className="text-[18px] font-semibold text-yellow-700">2</div>
                    <div className="text-[10px] text-yellow-600 font-medium">Medium potential</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-[10px] p-[10px] text-center">
                    <div className="text-[18px] font-semibold text-red-500">1</div>
                    <div className="text-[10px] text-red-500 font-medium">Needs human</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Per-task breakdown ── */}
            <div className="bg-white border border-[#d2d2d7] rounded-[18px] p-[32px]">
              <div className="text-[11px] font-semibold text-[#86868b] tracking-widest uppercase mb-[20px]">② Analysis — Task Breakdown</div>
              <div className="space-y-[10px]">
                {[
                  { name: 'Schedule posts across platforms', score: 92, difficulty: 'Easy',   saving: '109 hrs/yr', badge: 'green',  rec: 'Use Buffer or Zapier — fully automatable today.' },
                  { name: 'Generate performance reports',    score: 88, difficulty: 'Easy',   saving: '96 hrs/yr',  badge: 'green',  rec: 'Python script or Looker Studio — 95% automated.' },
                  { name: 'Write social media posts',        score: 65, difficulty: 'Medium', saving: '87 hrs/yr',  badge: 'yellow', rec: 'AI drafts posts, human reviews tone and brand.' },
                  { name: 'Research trending topics',        score: 58, difficulty: 'Medium', saving: '102 hrs/yr', badge: 'yellow', rec: 'AI aggregates signals, human curates final picks.' },
                  { name: 'Respond to comments',             score: 34, difficulty: 'Hard',   saving: '42 hrs/yr',  badge: 'red',    rec: 'AI drafts replies — human approval required.' },
                ].map((t, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-[10px] border border-[#e8e8ed] rounded-[12px] px-[16px] py-[12px]">
                    <div className="flex items-center gap-[12px] flex-1 min-w-0">
                      <span className={`shrink-0 text-[12px] font-bold px-[10px] py-[4px] rounded-full border ${
                        t.badge === 'green'  ? 'bg-green-100 text-green-700 border-green-200' :
                        t.badge === 'yellow' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-500 border-red-200'
                      }`}>{t.score}%</span>
                      <span className="text-[13px] font-medium text-[#1d1d1f] truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-[16px] shrink-0 text-[12px] text-[#6e6e73]">
                      <span className="hidden sm:block">{t.difficulty}</span>
                      <span className="text-green-600 font-medium">{t.saving}</span>
                    </div>
                    <div className="text-[12px] text-[#0071e3] sm:max-w-[260px]">💡 {t.rec}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Row 3: Roadmap ── */}
            <div className="grid sm:grid-cols-3 gap-[16px]">
              <div className="bg-green-50 border border-green-200 rounded-[18px] p-[24px]">
                <div className="text-[11px] font-semibold text-green-700 tracking-widest uppercase mb-[4px]">③ Roadmap — Phase 1</div>
                <div className="text-[13px] text-green-600 mb-[16px]">Quick Wins · 0–3 months</div>
                <div className="space-y-[8px]">
                  <div className="bg-white border border-green-100 rounded-[8px] px-[12px] py-[8px]">
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">Schedule posts</div>
                    <div className="text-[11px] text-[#6e6e73]">Buffer / Zapier · 92%</div>
                  </div>
                  <div className="bg-white border border-green-100 rounded-[8px] px-[12px] py-[8px]">
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">Performance reports</div>
                    <div className="text-[11px] text-[#6e6e73]">Looker Studio / Python · 88%</div>
                  </div>
                </div>
                <div className="mt-[14px] text-[12px] font-medium text-green-700">→ 205 hrs/yr · €11,800 saved</div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-[18px] p-[24px]">
                <div className="text-[11px] font-semibold text-yellow-700 tracking-widest uppercase mb-[4px]">③ Roadmap — Phase 2</div>
                <div className="text-[13px] text-yellow-600 mb-[16px]">Medium-term · 3–6 months</div>
                <div className="space-y-[8px]">
                  <div className="bg-white border border-yellow-100 rounded-[8px] px-[12px] py-[8px]">
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">Social post drafting</div>
                    <div className="text-[11px] text-[#6e6e73]">GPT-4 + brand guidelines · 65%</div>
                  </div>
                  <div className="bg-white border border-yellow-100 rounded-[8px] px-[12px] py-[8px]">
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">Topic research</div>
                    <div className="text-[11px] text-[#6e6e73]">Perplexity / Claude · 58%</div>
                  </div>
                </div>
                <div className="mt-[14px] text-[12px] font-medium text-yellow-700">→ 189 hrs/yr · €10,900 saved</div>
              </div>

              <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px]">
                <div className="text-[11px] font-semibold text-[#86868b] tracking-widest uppercase mb-[4px]">③ Roadmap — Phase 3</div>
                <div className="text-[13px] text-[#6e6e73] mb-[16px]">Human-in-loop · 6–12 months</div>
                <div className="space-y-[8px]">
                  <div className="bg-white border border-[#e8e8ed] rounded-[8px] px-[12px] py-[8px]">
                    <div className="text-[12px] font-semibold text-[#1d1d1f]">Comment responses</div>
                    <div className="text-[11px] text-[#6e6e73]">AI drafts · human approves · 34%</div>
                  </div>
                </div>
                <div className="mt-[14px] text-[12px] font-medium text-[#6e6e73]">→ 42 hrs/yr · €2,400 saved</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Analyze Form Section ── */}
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
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                Start your analysis now.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Upload a document, use voice input, or enter tasks manually.
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
