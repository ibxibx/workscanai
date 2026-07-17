'use client'

import { useLocale, useSetLocale } from '@/i18n/client'
import { LOCALES, type Locale } from '@/i18n/config'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const base = 'px-[8px] py-[3px] text-[11px] font-semibold transition-colors'
  return (
    <div
      role="group"
      aria-label="Language / Sprache"
      className={`inline-flex items-center rounded-full border border-[#d2d2d7] overflow-hidden ${className}`}
    >
      {(LOCALES as readonly Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`${base} ${locale === l ? 'bg-[#0071e3] text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
