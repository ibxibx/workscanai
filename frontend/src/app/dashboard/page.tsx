import Link from 'next/link'
import { Sparkles, Clock, Plus } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        {/* Header */}
        <div className="mb-[48px]">
          <div className="relative inline-block">
            <div className="absolute inset-0 -inset-x-[160px] bg-gradient-to-r from-transparent via-[#0071e3]/25 to-transparent blur-[100px]"></div>
            <h1 className="relative text-[48px] leading-[1.08] font-semibold tracking-tight mb-[12px] px-[32px]">
              Dashboard
            </h1>
          </div>
          <p className="text-[19px] text-[#6e6e73]">
            Manage and review your workflow analyses.
          </p>
        </div>

        {/* Quick Action - New Analysis */}
        <Link 
          href="/dashboard/analyze"
          className="block group mb-[32px]"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-[18px] p-[40px] hover:border-blue-300 transition-all">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-[8px] mb-[12px]">
                  <Sparkles className="h-[20px] w-[20px] text-[#0071e3]" />
                  <span className="text-[12px] font-semibold text-[#0071e3] tracking-wide uppercase">
                    Start New
                  </span>
                </div>
                <h2 className="text-[28px] font-semibold tracking-tight mb-[8px]">
                  Analyze Workflow
                </h2>
                <p className="text-[15px] text-[#6e6e73] max-w-[600px]">
                  Upload a document or enter tasks manually to discover automation opportunities and calculate ROI
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center w-[56px] h-[56px] rounded-full bg-white/60 group-hover:bg-white transition-all">
                <Plus className="h-[24px] w-[24px] text-[#1d1d1f]" />
              </div>
            </div>
          </div>
        </Link>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-[16px] mb-[32px]">
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Total Analyses
            </div>
            <div className="text-[40px] font-semibold tracking-tight mb-[4px]">0</div>
            <div className="text-[13px] text-[#86868b]">
              Get started with your first workflow
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Potential Savings
            </div>
            <div className="text-[40px] font-semibold tracking-tight mb-[4px]">
              <span className="text-green-600">0</span>
              <span className="text-[24px] text-[#86868b]"> hrs</span>
            </div>
            <div className="text-[13px] text-[#86868b]">
              Annual time saved across workflows
            </div>
          </div>

          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[32px]">
            <div className="text-[12px] font-semibold text-[#86868b] tracking-wide uppercase mb-[12px]">
              Avg Score
            </div>
            <div className="text-[40px] font-semibold tracking-tight mb-[4px]">
              <span className="text-purple-600">—</span>
              <span className="text-[24px] text-[#86868b]">/100</span>
            </div>
            <div className="text-[13px] text-[#86868b]">
              Average automation readiness
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div>
          <div className="flex items-center justify-between mb-[24px]">
            <h2 className="text-[28px] font-semibold tracking-tight">
              Recent Analyses
            </h2>
          </div>
          
          <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[48px] text-center">
            <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-white border border-[#d2d2d7] mb-[20px]">
              <Clock className="h-[28px] w-[28px] text-[#86868b]" />
            </div>
            <h3 className="text-[19px] font-semibold mb-[8px]">
              No analyses yet
            </h3>
            <p className="text-[15px] text-[#6e6e73] mb-[24px] max-w-[400px] mx-auto">
              Create your first workflow analysis to unlock automation insights and ROI calculations
            </p>
            <Link
              href="/dashboard/analyze"
              className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
            >
              <Plus className="h-[16px] w-[16px]" />
              Create analysis
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
