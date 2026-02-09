import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
              WorkScanAI
            </Link>
            <Link 
              href="/dashboard"
              className="text-[12px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-[88px] pb-[60px]">
        <div className="max-w-[980px] mx-auto px-6 text-center">
          <div className="relative inline-block mb-[40px]">
            <div className="absolute inset-0 -inset-x-[200px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[120px]"></div>
            <h1 className="relative text-[56px] leading-[1.07] font-semibold tracking-tight text-[#1d1d1f] px-[40px]">
              The future of work
              <br />
              starts with knowing
              <br />
              what to automate.
            </h1>
          </div>
          
          {/* Value Proposition Block */}
          <div className="max-w-[800px] mx-auto mt-[40px] mb-[40px] group">
            <div className="bg-[#fbfbfd] border border-[#e8e8ed] rounded-[18px] p-[32px] transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <p className="text-[21px] leading-[1.381] font-normal text-[#6e6e73] mb-[24px]">
                AI-powered analysis reveals which tasks are ready for automation — and exactly how much you'll save.
              </p>
              
              <div className="flex gap-[16px] justify-center items-center">
                <Link 
                  href="#analyze"
                  className="group inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] leading-[1.17] font-normal px-[22px] py-[12px] rounded-full transition-all"
                >
                  <span>Analyze now</span>
                  <ArrowRight className="h-[16px] w-[16px] group-hover:translate-x-[2px] transition-transform" />
                </Link>
                
                <Link 
                  href="#example"
                  className="text-[#0071e3] hover:text-[#0077ed] text-[17px] leading-[1.17] font-normal transition-colors"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Block */}
          <div className="max-w-[700px] mx-auto group">
            <div className="bg-[#fbfbfd] border border-[#e8e8ed] rounded-[18px] p-[40px] transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
              <div className="flex gap-[40px] justify-center text-[14px]">
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">&lt;5 min</div>
                  <div className="text-[#86868b]">to analyze</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">0–100</div>
                  <div className="text-[#86868b]">automation score</div>
                </div>
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f] mb-[4px]">€28K+</div>
                  <div className="text-[#86868b]">avg. savings</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Ultra Compact */}
      <section className="py-[60px] border-y border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-[20px]">
            <div className="group">
              <div className="text-center bg-white border border-[#e8e8ed] rounded-[18px] p-[32px] h-full transition-all duration-300 hover:border-[#0071e3] hover:shadow-lg">
                <div className="w-[48px] h-[48px] mx-auto mb-[16px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-[20px] w-[20px] text-white" />
                </div>
                <h3 className="text-[19px] font-semibold mb-[8px] tracking-tight text-[#1d1d1f]">AI Analysis</h3>
                <p className="text-[14px] text-[#6e6e73] leading-[1.4]">
                  Evaluates every task for automation readiness
                </p>
              </div>
            </div>

            <div className="group">
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
            </div>

            <div className="group">
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
        </div>
      </section>

      {/* Example - Sleek */}
      <section id="example" className="py-[80px]">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                From chaos to clarity.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Marketing team workflow analyzed in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-[24px]">
            {/* Input */}
            <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[20px]">
                Input
              </div>
              <div className="space-y-[12px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                <div>• Social posts (30 min/day)</div>
                <div>• Schedule platforms (15 min/day)</div>
                <div>• Comment responses (45 min/day)</div>
                <div>• Weekly reports (2 hrs/week)</div>
                <div>• Topic research (1 hr/day)</div>
              </div>
            </div>

            {/* Output */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-[18px] p-[32px]">
              <div className="text-[12px] font-semibold text-[#0071e3] tracking-wide uppercase mb-[20px]">
                Analysis
              </div>
              <div className="space-y-[16px]">
                <div>
                  <div className="text-[32px] font-semibold tracking-tight text-[#1d1d1f]">72/100</div>
                  <div className="text-[12px] text-[#6e6e73]">Automation Score</div>
                </div>
                <div>
                  <div className="text-[24px] font-semibold tracking-tight text-[#1d1d1f]">€28,000</div>
                  <div className="text-[12px] text-[#6e6e73]">Annual Savings • 436 hours</div>
                </div>
                <div className="pt-[8px] border-t border-[#d2d2d7]">
                  <div className="text-[12px] text-green-600 mb-[4px]">✓ Quick Wins</div>
                  <div className="text-[13px] text-[#6e6e73]">Scheduling, Reports (90%+)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analyze Form Section - Integrated */}
      <section id="analyze" className="py-[80px] bg-white">
        <div className="max-w-[980px] mx-auto px-6">
          <div className="text-center mb-[48px]">
            <div className="relative inline-block">
              <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
              <h2 className="relative text-[40px] leading-[1.1] font-semibold tracking-tight mb-[12px] text-[#1d1d1f] px-[32px]">
                Start your analysis now.
              </h2>
            </div>
            <p className="text-[19px] text-[#6e6e73]">
              Upload a document or enter your tasks manually.
            </p>
          </div>

          {/* Quick Form */}
          <div className="max-w-[800px] mx-auto">
            {/* Workflow Name */}
            <div className="mb-[24px]">
              <label className="block text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
                Workflow Name
              </label>
              <input
                type="text"
                placeholder="Marketing Team Daily Tasks"
                className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[17px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
            </div>

            {/* File Upload */}
            <div className="mb-[24px] group">
              <div className="bg-[#f5f5f7] border-2 border-dashed border-[#d2d2d7] rounded-[18px] p-[40px] text-center transition-all hover:border-[#0071e3] hover:bg-blue-50">
                <div className="inline-flex items-center justify-center w-[56px] h-[56px] rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-[16px]">
                  <svg className="h-[24px] w-[24px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-[17px] font-medium mb-[8px] text-[#1d1d1f]">
                  Drop your file here
                </div>
                <div className="text-[14px] text-[#6e6e73] mb-[16px]">
                  JPG, PNG, PDF, DOCX, or TXT • Max 10MB
                </div>
                <button className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] px-[20px] py-[10px] rounded-full transition-all">
                  Browse files
                </button>
              </div>
              <div className="text-[12px] text-[#86868b] mt-[12px] text-center">
                AI will extract and analyze tasks from your document automatically
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-[16px] my-[32px]">
              <div className="flex-1 h-[1px] bg-[#d2d2d7]"></div>
              <div className="text-[12px] text-[#86868b] font-semibold tracking-wide uppercase">
                Or enter manually
              </div>
              <div className="flex-1 h-[1px] bg-[#d2d2d7]"></div>
            </div>

            {/* Task Inputs */}
            <div className="space-y-[12px] mb-[32px]">
              <input
                type="text"
                placeholder="Task 1: Write social media posts (30 min/day)"
                className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[15px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
              <input
                type="text"
                placeholder="Task 2: Schedule posts across platforms (15 min/day)"
                className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[15px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
              <input
                type="text"
                placeholder="Task 3: Respond to comments (45 min/day)"
                className="w-full px-[16px] py-[14px] bg-[#f5f5f7] border border-[#d2d2d7] rounded-[12px] text-[15px] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition-all"
              />
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Link
                href="/dashboard/analyze"
                className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold px-[32px] py-[16px] rounded-full transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Analyze workflow</span>
              </Link>
              <p className="mt-[16px] text-[12px] text-[#86868b]">
                Analysis typically completes in under 5 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Powerful & Simple */}
      <section className="py-[80px] bg-[#f5f5f7]">
        <div className="max-w-[700px] mx-auto px-6 text-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
            <h2 className="relative text-[48px] leading-[1.08] font-semibold tracking-tight mb-[16px] text-[#1d1d1f] px-[32px]">
              Ready to see what AI can do for you?
            </h2>
          </div>
          <p className="text-[19px] text-[#6e6e73] mb-[32px]">
            Free analysis. Instant results.
          </p>
          <Link 
            href="/dashboard/analyze"
            className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[17px] font-semibold px-[28px] py-[14px] rounded-full transition-all"
          >
            <span>Start now</span>
            <ArrowRight className="h-[16px] w-[16px]" />
          </Link>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" className="hover:text-[#1d1d1f] transition-colors">
                Ian Baumeister
              </a>
              <a href="https://github.com/ibxibx/workscanai" className="hover:text-[#1d1d1f] transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
