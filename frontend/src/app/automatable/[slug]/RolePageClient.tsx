'use client'

// Client body for /automatable/[slug]. The server page keeps English metadata
// + FAQ/Article JSON-LD for crawlers and LLMs (canonical/SEO surface). This
// component renders the visible page and toggles to German when the wsai_locale
// cookie is set (default EN worldwide). Role content comes from roles.ts (…De
// fields) via the locale-aware r*() getters.

import Link from 'next/link'
import { ROLES, roleHref, rTitle, rSummary, rAutoTasks, rHumanTasks, type Role } from '../roles'
import { useT, useLocale } from '@/i18n/client'

export default function RolePageClient({ role }: { role: Role }) {
  const t = useT('roles')
  const locale = useLocale()

  const roleName = rTitle(role, locale)
  const summary = rSummary(role, locale)
  const autoTasks = rAutoTasks(role, locale)
  const humanTasks = rHumanTasks(role, locale)
  // Keep the English title in the scan URL param — stable for analytics + backend.
  const scanHref = `/scan?aud=${role.audience}&role=${encodeURIComponent(role.title)}&utm_source=seo&utm_medium=role_page&utm_campaign=${role.slug}`

  const faqs = [
    { q: t('faqQ1', { role: roleName }), a: summary },
    { q: t('faqQ2', { role: roleName }), a: t('faqA2', { tasks: autoTasks.join('; ') }) },
    { q: t('faqQ3', { role: roleName }), a: t('faqA3', { tasks: humanTasks.join('; ') }) },
    { q: t('faqQ4', { role: roleName }), a: t('faqA4', { role: roleName, score: role.typicalScore }) },
  ]

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ marginTop: '44px', background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ea 100%)' }}
      >
        <div className="max-w-[820px] mx-auto px-6 py-[56px] sm:py-[80px]">
          <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-[16px]">
            {t('eyebrow')}
          </p>
          <h1 className="text-[30px] sm:text-[46px] leading-[1.08] font-semibold italic tracking-tight mb-[20px] text-[#1d1d1f]">
            {t('roleH1', { role: roleName })}
          </h1>
          <div className="bg-white border border-[#e8e8ed] rounded-[16px] p-[22px] sm:p-[26px] shadow-sm">
            <p className="text-[16px] sm:text-[18px] leading-[1.55] text-[#1d1d1f]">
              <span className="font-semibold">{t('inShort')}</span> {summary}
            </p>
          </div>
          <div className="mt-[24px] flex gap-[12px] flex-wrap">
            <Link href={scanHref} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[24px] py-[12px] rounded-full transition-all">
              {t('scanRoleCta', { role: roleName })}
            </Link>
            {role.sampleCode && (
              <Link href={`/report/${role.sampleCode}?utm_source=seo&utm_medium=role_page&utm_campaign=${role.slug}`} className="inline-flex items-center text-[15px] text-[#0071e3] hover:text-[#0077ed] font-medium px-[16px] py-[12px]">
                {t('sampleReport')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Task split */}
      <section className="border-t border-[#d2d2d7] bg-white">
        <div className="max-w-[820px] mx-auto px-6 py-[48px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#f5fbf6] border border-[#cdeccf] rounded-[16px] p-[24px]">
              <h2 className="text-[17px] font-semibold mb-[14px] text-[#1d1d1f]">
                {t('autoHeading')}
              </h2>
              <ul className="space-y-[10px]">
                {autoTasks.map((task) => (
                  <li key={task} className="flex gap-[10px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                    <span className="text-green-600 shrink-0">✓</span>{task}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#fbf7f5] border border-[#eed9cd] rounded-[16px] p-[24px]">
              <h2 className="text-[17px] font-semibold mb-[14px] text-[#1d1d1f]">
                {t('humanHeading')}
              </h2>
              <ul className="space-y-[10px]">
                {humanTasks.map((task) => (
                  <li key={task} className="flex gap-[10px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                    <span className="text-[#c1791f] shrink-0">●</span>{task}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-[24px] text-[13px] leading-[1.6] text-[#6e6e73]">
            {t('benchmark', { role: roleName })}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[820px] mx-auto px-6 py-[48px]">
          <h2 className="text-[22px] font-semibold italic tracking-tight mb-[24px] text-[#1d1d1f]">
            {t('faqHeading')}
          </h2>
          <div className="space-y-[18px]">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white border border-[#e8e8ed] rounded-[14px] p-[20px]">
                <h3 className="text-[15px] font-semibold mb-[8px] text-[#1d1d1f]">{f.q}</h3>
                <p className="text-[14px] leading-[1.55] text-[#424245]">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-[32px] text-center">
            <Link href={scanHref} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[26px] py-[13px] rounded-full transition-all">
              {t('faqScoreCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Related roles */}
      <section className="border-t border-[#d2d2d7] bg-white">
        <div className="max-w-[820px] mx-auto px-6 py-[40px]">
          <h2 className="text-[15px] font-semibold text-[#6e6e73] uppercase tracking-wide mb-[16px]">
            {t('otherRoles')}
          </h2>
          <div className="flex flex-wrap gap-[10px]">
            {ROLES.filter((r) => r.slug !== role.slug).map((r) => (
              <Link key={r.slug} href={roleHref(r)} className="text-[13px] text-[#0071e3] hover:text-[#0077ed] border border-[#d2d2d7] rounded-full px-[14px] py-[7px] hover:border-[#0071e3]/40 transition-colors">
                {rTitle(r, locale)}
              </Link>
            ))}
            <Link href="/templates" className="text-[13px] text-[#0071e3] hover:text-[#0077ed] border border-[#d2d2d7] rounded-full px-[14px] py-[7px] hover:border-[#0071e3]/40 transition-colors">
              {t('sampleByIndustry')}
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
