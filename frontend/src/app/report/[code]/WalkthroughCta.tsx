'use client'

import { CalendarClock, ArrowRight } from 'lucide-react'
import { trackWalkthroughCtaClicked } from '@/lib/analytics'
import { useT } from '@/i18n/client'
import type { ReportContext } from '@/components/report/reportContext'

// Single source of truth for the booking link. Swap this constant to change
// the destination (e.g. a 15-min event) without touching markup.
const CALENDLY_BASE = 'https://calendly.com/ian-ianworks/30min'

interface WalkthroughCtaProps {
  shareCode: string
  workflowId: number
  isJobScan: boolean
  context: ReportContext
}

// #64/C6.3 — for a team/company submission, reframe this as the literal
// Mittelstand dialogue-opener ("Automation Readiness Assessment") instead of
// the generic individual-context "walkthrough" copy. Solo/individual reports
// keep the original framing unchanged.
export default function WalkthroughCta({ shareCode, workflowId, isJobScan, context }: WalkthroughCtaProps) {
  const t = useT('report')
  const isBiz = context !== 'individual'
  // Separate utm_campaign + PostHog context so the two CTA variants can be
  // measured independently.
  const bookingUrl =
    `${CALENDLY_BASE}?utm_source=workscanai&utm_medium=report&utm_campaign=${isBiz ? 'readiness_assessment' : 'walkthrough'}&utm_content=${encodeURIComponent(shareCode)}`

  const handleClick = () => {
    trackWalkthroughCtaClicked({ share_code: shareCode, workflow_id: workflowId, is_job_scan: isJobScan, context })
    // Let the default anchor navigation (new tab) proceed.
  }

  return (
    <div className="mb-[32px] sm:mb-[48px]">
      <div className="bg-gradient-to-br from-[#0071e3] to-[#0a4fa8] rounded-[18px] p-[24px] sm:p-[32px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[18px] sm:gap-[24px]">
        <div className="flex items-start gap-[14px] min-w-0">
          <div className="shrink-0 mt-[2px] bg-white/15 rounded-[12px] p-[10px]">
            <CalendarClock className="h-[22px] w-[22px] text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[17px] sm:text-[20px] font-semibold text-white leading-snug mb-[4px]">
              {isBiz ? t('walkTitleCompany') : t('walkTitle')}
            </h3>
            <p className="text-[13px] sm:text-[14px] text-white/80 leading-relaxed">
              {isBiz ? t('walkDescCompany') : t('walkDesc')}
            </p>
          </div>
        </div>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="shrink-0 inline-flex items-center justify-center gap-[8px] bg-white text-[#0071e3] hover:bg-[#f0f7ff] active:bg-[#e5f0ff] px-[24px] py-[13px] rounded-full font-semibold text-[14px] transition-all shadow-sm hover:shadow-md w-full sm:w-auto"
        >
          {isBiz ? t('walkBtnCompany') : t('walkBtn')}
          <ArrowRight className="h-[15px] w-[15px] shrink-0" />
        </a>
      </div>
    </div>
  )
}
