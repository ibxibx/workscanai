'use client'

import { Loader2 } from 'lucide-react'

// Shared cold-start toast. Rendered by any surface that talks to the Render
// free-tier backend (dashboard, results page, public report, forms) so the
// "waking the server" experience is identical everywhere a user can land on a
// cold box. Pass `show` from fetchWithWake's onWarming callback.
export default function BackendWarming({
  show,
  message = 'Waking the analysis server…',
  sub = 'Free tier — first request takes 20–40s. After that it\u2019s instant.',
}: {
  show: boolean
  message?: string
  sub?: string
}) {
  if (!show) return null
  return (
    <div className="fixed bottom-[32px] left-1/2 -translate-x-1/2 z-[70] flex items-center gap-[14px] bg-[#1d1d1f] text-white px-[24px] py-[16px] rounded-[16px] shadow-2xl max-w-[440px] w-[calc(100%-32px)] animate-in slide-in-from-bottom-4 duration-300">
      <div className="shrink-0 w-[36px] h-[36px] rounded-full bg-white/10 flex items-center justify-center">
        <Loader2 className="w-[18px] h-[18px] animate-spin text-[#34aadc]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold leading-tight">{message}</p>
        <p className="text-[12px] text-white/60 mt-[2px]">{sub}</p>
      </div>
      <div className="shrink-0 flex gap-[4px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-[6px] h-[6px] rounded-full bg-[#34aadc]"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}
