'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/i18n/client'
import { CONSENT_EVENT, getConsent, setConsent, type ConsentValue } from '@/lib/consent'

// Stylish, low-intrusion consent banner — a small floating card, not a
// full-width/full-screen blocker. Renders only once (until a decision is
// made or reset via footer "Cookie settings"), and only after mount so SSR
// never flashes it. Gates PostHog entirely (see PostHogProvider.tsx).
export default function CookieConsent() {
  const t = useT('consent')
  const [consent, setConsentState] = useState<ConsentValue>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Adopt the real (localStorage) consent value after mount — mirrors the
    // SSR-safe "start at default, adopt after mount" pattern used for locale
    // in i18n/client.tsx, so the server-rendered null never mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsentState(getConsent())
    setMounted(true)
    const onChange = (e: Event) => setConsentState((e as CustomEvent<ConsentValue>).detail)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
  }, [])

  if (!mounted || consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label={t('message')}
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none"
    >
      <div className="mx-auto max-w-[640px] pointer-events-auto rounded-[16px] border border-[#d2d2d7] bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] p-[16px] sm:p-[18px] flex flex-col sm:flex-row sm:items-center gap-[12px] sm:gap-[16px]">
        <p className="text-[12.5px] leading-relaxed text-[#4a4a4f] flex-1">
          {t('message')}{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[#1d1d1f]">
            {t('learnMore')}
          </Link>
        </p>
        <div className="flex gap-[8px] shrink-0">
          <button
            type="button"
            onClick={() => setConsent('denied')}
            className="px-[16px] py-[9px] rounded-full text-[12.5px] font-medium text-[#3a3a3f] border border-[#d2d2d7] hover:bg-[#f5f5f7] transition-colors whitespace-nowrap"
          >
            {t('necessaryOnly')}
          </button>
          <button
            type="button"
            onClick={() => setConsent('granted')}
            className="px-[18px] py-[9px] rounded-full text-[12.5px] font-semibold text-white bg-[#0071e3] hover:bg-[#0077ed] transition-colors whitespace-nowrap"
          >
            {t('acceptAll')}
          </button>
        </div>
      </div>
    </div>
  )
}
