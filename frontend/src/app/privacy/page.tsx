'use client'

// Privacy Policy — stub content, bilingual via the same i18n system used
// everywhere else. Placeholder fields ([Full name / registered business
// name], [Street address...], [email address]) must be filled in with real
// legal/contact details before this is relied on for real customers — see
// the `legal` namespace in i18n/messages/{en,de}.ts.

import Link from 'next/link'
import { Brain } from 'lucide-react'
import LanguageToggle from '@/components/LanguageToggle'
import { useT } from '@/i18n/client'
import { resetConsent } from '@/lib/consent'

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mb-[28px]">
      <h2 className="text-[16px] font-semibold text-[#1d1d1f] mb-[8px]">{heading}</h2>
      <p className="text-[14px] leading-[1.65] text-[#424245] whitespace-pre-line">{body}</p>
    </div>
  )
}

export default function PrivacyPage() {
  const t = useT('legal')
  const tc = useT('common')

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]">
        <div className="max-w-[820px] mx-auto px-6">
          <div className="flex justify-between items-center h-[44px]">
            <Link href="/" className="flex items-center gap-[8px] text-[19px] font-semibold tracking-tight text-[#1d1d1f]">
              <Brain className="h-[19px] w-[19px]" />
              WorkScanAI
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <section className="pt-[100px] pb-[64px]">
        <div className="max-w-[720px] mx-auto px-6">
          <h1 className="text-[28px] sm:text-[36px] font-semibold italic tracking-tight mb-[6px] text-[#1d1d1f]">
            {t('privacyTitle')}
          </h1>
          <p className="text-[13px] text-[#86868b] mb-[36px]">{t('privacyUpdated')}</p>
          <p className="text-[14px] leading-[1.65] text-[#424245] mb-[36px]">{t('privacyIntro')}</p>

          <Section heading={t('privacyControllerHeading')} body={t('privacyControllerBody')} />
          <Section heading={t('privacyWhatHeading')} body={t('privacyWhatBody')} />
          <Section heading={t('privacyLegalBasisHeading')} body={t('privacyLegalBasisBody')} />
          <Section heading={t('privacyCookiesHeading')} body={t('privacyCookiesBody')} />
          <Section heading={t('privacyThirdPartyHeading')} body={t('privacyThirdPartyBody')} />
          <Section heading={t('privacyRightsHeading')} body={t('privacyRightsBody')} />
          <Section heading={t('privacyWithdrawHeading')} body={t('privacyWithdrawBody')} />
          <Section heading={t('privacyContactHeading')} body={t('privacyContactBody')} />
        </div>
      </section>

      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[820px] mx-auto px-6 py-[28px]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-[12px] text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex flex-wrap justify-center gap-[24px]">
              <a href="https://ianworks.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">Ian Baumeister</a>
              <a href="https://github.com/ibxibx/workscanai" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">GitHub</a>
              <Link href="/privacy" className="hover:text-[#1d1d1f] transition-colors">{tc('privacyLink')}</Link>
              <Link href="/impressum" className="hover:text-[#1d1d1f] transition-colors">{tc('impressumLink')}</Link>
              <button type="button" onClick={() => resetConsent()} className="hover:text-[#1d1d1f] transition-colors">{tc('cookieSettingsLink')}</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
