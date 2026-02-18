'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-white pt-[88px] pb-[60px]">
      <div className="max-w-[980px] mx-auto px-6">
        <div className="bg-red-50 border border-red-200 rounded-[18px] p-[48px] text-center">
          <div className="inline-flex items-center justify-center w-[64px] h-[64px] rounded-full bg-red-100 border border-red-200 mb-[20px]">
            <AlertCircle className="h-[28px] w-[28px] text-red-600" />
          </div>
          <h2 className="text-[21px] font-semibold text-[#1d1d1f] mb-[8px]">Something went wrong</h2>
          <p className="text-[15px] text-[#6e6e73] mb-[28px] max-w-[400px] mx-auto">
            {error.message || 'Failed to load the dashboard. Please try again.'}
          </p>
          <div className="flex items-center justify-center gap-[12px]">
            <button
              onClick={reset}
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white px-[24px] py-[12px] rounded-full text-[15px] font-medium transition-all"
            >
              Try again
            </button>
            <Link
              href="/"
              className="border border-[#d2d2d7] hover:bg-[#f5f5f7] px-[24px] py-[12px] rounded-full text-[15px] font-medium text-[#1d1d1f] transition-all"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
