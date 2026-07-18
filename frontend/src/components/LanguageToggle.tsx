'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useSetLocale } from '@/i18n/client'
import type { Locale } from '@/i18n/config'

// Union Jack (2:1) — canonical construction with counter-changed diagonals.
function UnionJack() {
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="none" className="h-full w-full block" aria-hidden="true">
      <clipPath id="uj-t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uj-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}

// German tricolor — black / red / gold, top to bottom.
function GermanFlag() {
  return (
    <svg viewBox="0 0 5 3" preserveAspectRatio="none" className="h-full w-full block" aria-hidden="true">
      <rect width="5" height="3" fill="#FFCE00" />
      <rect width="5" height="2" fill="#DD0000" />
      <rect width="5" height="1" fill="#000000" />
    </svg>
  )
}

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const router = useRouter()
  const isDE = locale === 'de'

  const choose = (l: Locale) => {
    if (l === locale) return
    setLocale(l)
    router.refresh()
  }

  const labelBase = 'text-[11px] font-bold tracking-wide leading-none transition-colors'

  return (
    <div
      role="group"
      aria-label="Language / Sprache"
      className={`inline-flex items-center gap-[5px] select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => choose('en')}
        aria-pressed={!isDE}
        className={`${labelBase} ${!isDE ? 'text-[#1d1d1f]' : 'text-[#b8b8c0] hover:text-[#6e6e73]'}`}
      >
        EN
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={isDE}
        aria-label={isDE ? 'Switch to English / Auf Englisch umschalten' : 'Switch to German / Auf Deutsch umschalten'}
        onClick={() => choose(isDE ? 'en' : 'de')}
        className="relative h-[22px] w-[44px] shrink-0 rounded-full overflow-hidden cursor-pointer
                   border border-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.2)]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/50"
      >
        {/* Flag layers — crossfade on switch */}
        <span
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{ opacity: isDE ? 0 : 1 }}
        >
          <UnionJack />
        </span>
        <span
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{ opacity: isDE ? 1 : 0 }}
        >
          <GermanFlag />
        </span>

        {/* Inset shadow for recessed-track depth */}
        <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.38)]" />

        {/* Raised 3D knob — slides left (EN) / right (DE) */}
        <span
          className="absolute top-[3px] left-[3px] h-[16px] w-[16px] rounded-full
                     bg-gradient-to-b from-white to-[#e7e7ea]
                     shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_0.5px_rgba(0,0,0,0.08)]
                     transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ transform: isDE ? 'translateX(22px)' : 'translateX(0)' }}
        />
      </button>

      <button
        type="button"
        onClick={() => choose('de')}
        aria-pressed={isDE}
        className={`${labelBase} ${isDE ? 'text-[#1d1d1f]' : 'text-[#b8b8c0] hover:text-[#6e6e73]'}`}
      >
        DE
      </button>
    </div>
  )
}
