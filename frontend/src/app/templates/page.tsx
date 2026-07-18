'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Brain, ArrowRight, Sparkles } from 'lucide-react'
import { VERTICALS, verticalHref, vLabel, vBlurb, type Vertical } from './verticals'
import LanguageToggle from '@/components/LanguageToggle'
import { useT, useLocale } from '@/i18n/client'

// #31 Vertical templates — the picker ("cards"). One click loads a real,
// pre-generated industry report (value before input, zero cold-start, no quota
// slot). Each card is a separately-attributed niche wedge (see verticals.ts).
//
// Kept intentionally native to the app: same nav/footer/spotlight vocabulary as
// /scan and the homepage, Apple-style tokens. The single bold element is the
// featured "Automation agency" card — our S1 wedge.

const money = (n: number, locale: string) => '\u20AC' + n.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')

function StatRow({ v, readyLabel, perYrLabel, locale }: { v: Vertical; readyLabel: string; perYrLabel: string; locale: string }) {
  return (
    <div className="flex items-center gap-[16px] text-[12px] text-[#6e6e73]">
      <span><span className="font-semibold text-[#1d1d1f]">{v.score}%</span> {readyLabel}</span>
      <span className="text-[#d2d2d7]">·</span>
      <span><span className="font-semibold text-[#1d1d1f]">{money(v.annualSavings, locale)}</span>{perYrLabel}</span>
      <span className="text-[#d2d2d7]">·</span>
      <span><span className="font-semibold text-[#1d1d1f]">{v.hoursSaved}h</span></span>
    </div>
  )
}

export default function TemplatesPage() {
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 })
  const [spotlightVisible, setSpotlightVisible] = useState(false)
  const t = useT('templates')
  const locale = useLocale()

  // Pre-warm the Render backend on landing, so if a visitor jumps from a sample
  // straight into their own analysis the dyno is already awake.
  useEffect(() => {
    import('@/lib/wake-ping').then(({ wakeBackend }) => {
      wakeBackend().catch(() => {})
    }).catch(() => {})
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSpotlightPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  const featured = VERTICALS.find((v) => v.featured)
  const rest = VERTICALS.filter((v) => !v.featured)

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      {/* Navigation — mirrors homepage / scan for brand continuity */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-[44px] gap-2">
            <Link href="/" className="flex items-center gap-[6px] sm:gap-[8px] text-[18px] sm:text-[21px] font-semibold tracking-tight text-[#1d1d1f] shrink-0">
              <Brain className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px]" />
              WorkScanAI
            </Link>
            <div className="flex items-center gap-[12px] md:gap-[32px] text-[11px] md:text-[12px] shrink-0">
              <Link href="/" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap">{t('navHome')}</Link>
              <Link href="/scan" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors whitespace-nowrap">{t('navScanRole')}</Link>
              <Link href="/#analyze" className="text-[#0071e3] hover:text-[#0077ed] font-medium transition-colors whitespace-nowrap">{t('navAnalyzeYours')}</Link>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ marginTop: '44px', background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ea 100%)' }}
      >
        <div className="max-w-[820px] mx-auto px-6 py-[64px] sm:py-[96px] text-center">
          <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-[18px]">
            {t('eyebrow')}
          </p>
          <h1 className="text-[32px] sm:text-[52px] leading-[1.05] font-semibold italic tracking-tight mb-[20px] text-[#1d1d1f]">
            {t('heroTitle')}
          </h1>
          <p className="text-[15px] sm:text-[20px] text-[#6e6e73] max-w-[560px] mx-auto leading-[1.5]">
{t('heroSub')}
          </p>
        </div>
      </section>

      {/* Cards */}
      <section
        className="relative py-[56px] sm:py-[72px] border-t border-[#d2d2d7] overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #e8e8ea 0%, #d8d8da 100%)' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setSpotlightVisible(true)}
        onMouseLeave={() => setSpotlightVisible(false)}
      >
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: spotlightVisible ? 1 : 0,
            background: `radial-gradient(600px circle at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(220,235,255,0.45) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 max-w-[980px] mx-auto px-6">
          {/* Featured — the S1 wedge card, given prominence */}
          {featured && (
            <Link
              href={verticalHref(featured)}
              className="group block mb-[20px] rounded-[20px] border border-[#0071e3]/30 bg-gradient-to-br from-[#0a1a2f] to-[#0d3b66] p-[28px] sm:p-[36px] shadow-[0_8px_30px_rgba(0,60,120,0.18)] hover:shadow-[0_12px_40px_rgba(0,60,120,0.28)] transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7fb8ff] mb-[12px]">
                    <Sparkles className="h-[13px] w-[13px]" />
                    {t('featuredEyebrow')}
                  </div>
                  <h2 className="text-[24px] sm:text-[30px] font-semibold italic tracking-tight text-white mb-[8px]">
                    {vLabel(featured, locale)}
                  </h2>
                  <p className="text-[14px] sm:text-[15px] text-white/70 leading-[1.5] max-w-[520px]">
                    {vBlurb(featured, locale)}{t('featuredBlurbSuffix')}
                  </p>
                </div>
                <ArrowRight className="h-[22px] w-[22px] text-white/60 shrink-0 mt-[6px] group-hover:translate-x-[3px] transition-transform" />
              </div>
              <div className="mt-[22px] flex flex-wrap items-center gap-[16px] text-[13px] text-white/60">
                <span><span className="font-semibold text-white">{featured.score}%</span> {t('automatableLabel')}</span>
                <span className="text-white/25">·</span>
                <span><span className="font-semibold text-white">{money(featured.annualSavings, locale)}</span> {t('perYr')}</span>
                <span className="text-white/25">·</span>
                <span><span className="font-semibold text-white">{featured.hoursSaved}h</span> {t('reclaimedLabel')}</span>
                <span className="text-white/25">·</span>
                <span>{featured.tasks} {t('tasksLabel')}</span>
              </div>
            </Link>
          )}

          {/* The five function cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
            {rest.map((v) => (
              <Link
                key={v.key}
                href={verticalHref(v)}
                className="group flex flex-col justify-between bg-white/90 backdrop-blur border border-[#e8e8ed] rounded-[18px] p-[22px] hover:border-[#0071e3]/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[2px] transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-[10px]">
                    <h3 className="text-[18px] font-semibold italic tracking-tight text-[#1d1d1f]">{vLabel(v, locale)}</h3>
                    <ArrowRight className="h-[16px] w-[16px] text-[#86868b] group-hover:text-[#0071e3] group-hover:translate-x-[2px] transition-all" />
                  </div>
                  <p className="text-[13px] text-[#6e6e73] leading-[1.45] mb-[18px]">{vBlurb(v, locale)}</p>
                </div>
                <StatRow v={v} readyLabel={t('readyLabel')} perYrLabel={t('perYr')} locale={locale} />
              </Link>
            ))}
          </div>

          {/* Escape hatch — analyze your own instead of a sample */}
          <div className="mt-[36px] text-center">
            <p className="text-[13px] text-[#6e6e73] mb-[12px]">
              {t('noneMatch')}
            </p>
            <Link
              href="/#analyze"
              className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[24px] py-[12px] rounded-full transition-all"
            >
              {t('analyzeOwn')}
              <ArrowRight className="h-[16px] w-[16px]" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — mirrors homepage / scan */}
      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[980px] mx-auto px-6 py-[32px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">Ian Baumeister</a>
              <a href="https://github.com/ibxibx/workscanai" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
