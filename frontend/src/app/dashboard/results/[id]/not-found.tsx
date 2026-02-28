import Link from 'next/link'
import { ArrowLeft, BarChart2 } from 'lucide-react'

export default function AnalysisNotFound() {
  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] flex items-center justify-center px-6">
      <div className="text-center max-w-[480px]">
        <div className="relative inline-block mb-[40px]">
          <div className="absolute inset-0 -inset-x-[120px] bg-gradient-to-r from-transparent via-[#0071e3]/20 to-transparent blur-[80px]" />
          <div className="relative text-[120px] font-semibold tracking-tight leading-none text-[#e8e8ed]">
            404
          </div>
        </div>

        <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-[#f5f5f7] border border-[#d2d2d7] mb-[24px]">
          <BarChart2 className="h-[28px] w-[28px] text-[#86868b]" />
        </div>

        <h1 className="text-[28px] font-semibold tracking-tight mb-[12px]">
          Analysis not found
        </h1>
        <p className="text-[17px] text-[#6e6e73] mb-[40px] leading-[1.5]">
          This analysis doesn&apos;t exist or may have been deleted. Head back to the dashboard to view your analyses.
        </p>

        <div className="flex flex-col sm:flex-row gap-[12px] justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white px-[28px] py-[14px] rounded-full text-[15px] font-medium transition-all"
          >
            <ArrowLeft className="h-[16px] w-[16px]" />
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-[8px] bg-[#f5f5f7] hover:bg-[#ebebef] text-[#1d1d1f] px-[28px] py-[14px] rounded-full text-[15px] font-medium border border-[#d2d2d7] transition-all"
          >
            New Analysis
          </Link>
        </div>
      </div>
    </div>
  )
}
