'use client'

// Client body for the /automatable hub. The server page (page.tsx) keeps the
// English metadata for crawlers; this component renders the visible directory
// and swaps to German when the wsai_locale cookie is set (default EN worldwide).

import Link from 'next/link'
import { ROLES, roleHref, rTitle } from './roles'
import { useT, useLocale } from '@/i18n/client'

export default function AutomatableHubClient() {
  const t = useT('roles')
  const locale = useLocale()

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      <section
        className="relative overflow-hidden"
        style={{ marginTop: '44px', background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ea 100%)' }}
      >
        <div className="max-w-[820px] mx-auto px-6 py-[56px] sm:py-[80px] text-center">
          <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-[16px]">
            {t('hubEyebrow')}
          </p>
          <h1 className="text-[30px] sm:text-[46px] leading-[1.08] font-semibold italic tracking-tight mb-[18px] text-[#1d1d1f]">
            {t('hubTitle')}
          </h1>
          <p className="text-[15px] sm:text-[18px] text-[#6e6e73] max-w-[560px] mx-auto leading-[1.5]">
            {t('hubSub')}
          </p>
        </div>
      </section>

      <section className="border-t border-[#d2d2d7] bg-white">
        <div className="max-w-[900px] mx-auto px-6 py-[48px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            {ROLES.map((r) => (
              <Link
                key={r.slug}
                href={roleHref(r)}
                className="group flex items-center justify-between bg-white border border-[#e8e8ed] rounded-[14px] px-[20px] py-[16px] hover:border-[#0071e3]/40 hover:shadow-[0_6px_18px_rgba(0,0,0,0.06)] transition-all"
              >
                <div>
                  <div className="text-[16px] font-semibold text-[#1d1d1f]">{t('hubCardQuestion', { role: rTitle(r, locale) })}</div>
                  <div className="text-[13px] text-[#6e6e73] mt-[2px]">{t('hubCardScore', { score: r.typicalScore })}</div>
                </div>
                <span className="text-[#86868b] group-hover:text-[#0071e3] group-hover:translate-x-[2px] transition-all">→</span>
              </Link>
            ))}
          </div>

          <div className="mt-[32px] text-center">
            <Link href="/scan" className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[26px] py-[13px] rounded-full transition-all">
              {t('hubCta')}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[820px] mx-auto px-6 py-[28px]">
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
