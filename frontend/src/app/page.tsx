import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="text-[21px] font-semibold tracking-tight">
              WorkScanAI
            </Link>
            <Link 
              href="/dashboard"
              className="text-[12px] text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <h1 className="text-[56px] leading-[1.07] font-semibold tracking-tight mb-[6px] bg-gradient-to-br from-white via-white to-gray-500 bg-clip-text text-transparent">
            The future of work
            <br />
            starts with knowing
            <br />
            what to automate.
          </h1>
          
          <p className="text-[21px] leading-[1.381] font-normal text-gray-400 mb-[30px] max-w-[700px] mx-auto mt-[18px]">
            AI-powered analysis reveals which tasks are ready for automation — and exactly how much you'll save.
          </p>
          
          <div className="flex gap-[16px] justify-center items-center">
            <Link 
              href="/dashboard/analyze"
              className="group inline-flex items-center gap-[8px] bg-blue-600 hover:bg-blue-500 text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all"
            >
              <span>Analyze now</span>
              <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
            </Link>
            
            <Link 
              href="#example"
              className="text-blue-500 hover:text-blue-400 text-[17px] leading-[1.17] font-normal transition-colors"
            >
              See how it works
            </Link>
          </div>

          {/* Stats - Minimalist */}
          <div className="flex gap-[40px] justify-center mt-[60px] text-[14px]">
            <div>
              <div className="text-[32px] font-semibold tracking-tight mb-[4px]">&lt;5 min</div>
              <div className="text-gray-500">to analyze</div>
            </div>
            <div>
              <div className="text-[32px] font-semibold tracking-tight mb-[4px]">0–100</div>
              <div className="text-gray-500">automation score</div>
            </div>
            <div>
              <div className="text-[32px] font-semibold tracking-tight mb-[4px]">$28K+</div>
              <div className="text-gray-500">avg. savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Ultra Compact */}
      <section className="py-[60px] border-y border-gray-900">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-[40px]">
            <div className="text-center">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-[20px] w-[20px]" />
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight">AI Analysis</h3>
              <p className="text-[14px] text-gray-400 leading-[1.4]">
                Evaluates every task for automation readiness
              </p>
            </div>

            <div className="text-center">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight">ROI Calculator</h3>
              <p className="text-[14px] text-gray-400 leading-[1.4]">
                Calculates time and cost savings instantly
              </p>
            </div>

            <div className="text-center">
              <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <svg className="h-[20px] w-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight">Action Roadmap</h3>
              <p className="text-[14px] text-gray-400 leading-[1.4]">
                Prioritized plan from quick wins to long-term
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Example - Sleek */}
      <section id="example" className="py-[80px]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-[48px]">
            <h2 className="text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px]">
              From chaos to clarity.
            </h2>
            <p className="text-[19px] text-gray-400">
              Marketing team workflow analyzed in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-[24px]">
            {/* Input */}
            <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-gray-500 tracking-wide uppercase mb-[20px]">
                Input
              </div>
              <div className="space-y-[12px] text-[14px] leading-[1.5] text-gray-300">
                <div>• Social posts (30 min/day)</div>
                <div>• Schedule platforms (15 min/day)</div>
                <div>• Comment responses (45 min/day)</div>
                <div>• Weekly reports (2 hrs/week)</div>
                <div>• Topic research (1 hr/day)</div>
              </div>
            </div>

            {/* Output */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur border border-blue-800/50 rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-blue-400 tracking-wide uppercase mb-[20px]">
                Analysis
              </div>
              <div className="space-y-[16px]">
                <div>
                  <div className="text-[32px] font-semibold tracking-tight">72/100</div>
                  <div className="text-[12px] text-gray-400">Automation Score</div>
                </div>
                <div>
                  <div className="text-[24px] font-semibold tracking-tight">$28,000</div>
                  <div className="text-[12px] text-gray-400">Annual Savings • 436 hours</div>
                </div>
                <div className="pt-[8px] border-t border-gray-700">
                  <div className="text-[12px] text-green-400 mb-[4px]">✓ Quick Wins</div>
                  <div className="text-[13px] text-gray-400">Scheduling, Reports (90%+)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Powerful & Simple */}
      <section className="py-[80px]">
        <div className="max-w-[700px] mx-auto px-6 text-center">
          <h2 className="text-[48px] leading-[1.08] font-semibold tracking-tight mb-[16px]">
            Ready to see what AI can do for you?
          </h2>
          <p className="text-[19px] text-gray-400 mb-[32px]">
            Free analysis. Instant results.
          </p>
          <Link 
            href="/dashboard/analyze"
            className="inline-flex items-center gap-[8px] bg-white hover:bg-gray-100 text-black text-[17px] font-semibold px-[28px] py-[14px] rounded-full transition-all"
          >
            <span>Start now</span>
            <ArrowRight className="h-[16px] w-[16px]" />
          </Link>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-gray-900">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-gray-500">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" className="hover:text-gray-300 transition-colors">
                Ian Baumeister
              </a>
              <a href="https://github.com/ibxibx/workscanai" className="hover:text-gray-300 transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
