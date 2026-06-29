'use client'

import { useState } from 'react'
import { Mail, ArrowRight, Check, Loader2 } from 'lucide-react'
import { trackReportEmailRequested, trackReportEmailCaptured } from '@/lib/analytics'
import { resolveAcquisition } from '@/lib/audience'

// Email the full report direct-to-Render (PDF generation + Resend can exceed
// Vercel's 10s serverless timeout, so we bypass the Next proxy here).
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://workscanai.onrender.com'

interface EmailGateCardProps {
  shareCode: string
  workflowId: number
}

type Status = 'idle' | 'sending' | 'done' | 'error'

export default function EmailGateCard({ shareCode, workflowId }: EmailGateCardProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const submit = async () => {
    const value = email.trim()
    if (!value || !value.includes('@') || !value.split('@')[1]?.includes('.')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    let audience: string | undefined
    try { audience = resolveAcquisition().audience } catch { audience = undefined }

    setStatus('sending')
    setMessage('')
    trackReportEmailRequested({ share_code: shareCode, workflow_id: workflowId, audience })

    try {
      const res = await fetch(`${BACKEND_BASE}/api/reports/${shareCode}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, audience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.detail || 'Something went wrong. Please try again in a moment.')
        return
      }
      trackReportEmailCaptured({
        share_code: shareCode, workflow_id: workflowId, audience,
        email_sent: data?.email_sent === true,
      })
      setStatus('done')
      setMessage(data?.message || 'Sent — check your inbox.')
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again in a moment.')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="mb-[32px] sm:mb-[48px]">
      <div className="bg-[#f5f5f7] border border-[#d2d2d7] rounded-[18px] p-[24px] sm:p-[32px]">
        {status === 'done' ? (
          <div className="flex items-start gap-[14px]">
            <div className="shrink-0 mt-[2px] bg-green-100 rounded-[12px] p-[10px]">
              <Check className="h-[22px] w-[22px] text-green-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[17px] sm:text-[20px] font-semibold text-[#1d1d1f] leading-snug mb-[4px]">
                You&apos;re all set
              </h3>
              <p className="text-[13px] sm:text-[14px] text-[#6e6e73] leading-relaxed">{message}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[18px] sm:gap-[24px]">
            <div className="flex items-start gap-[14px] min-w-0">
              <div className="shrink-0 mt-[2px] bg-[#0071e3]/10 rounded-[12px] p-[10px]">
                <Mail className="h-[22px] w-[22px] text-[#0071e3]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[17px] sm:text-[20px] font-semibold text-[#1d1d1f] leading-snug mb-[4px]">
                  Get the full report + n8n files by email
                </h3>
                <p className="text-[13px] sm:text-[14px] text-[#6e6e73] leading-relaxed">
                  We&apos;ll send the complete PDF and a link to your importable n8n workflows &mdash; keep it, or forward it to your team.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-[8px]">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                  onKeyDown={onKeyDown}
                  disabled={status === 'sending'}
                  className="w-full sm:w-[220px] bg-white border border-[#d2d2d7] rounded-full px-[16px] py-[11px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] disabled:opacity-60"
                />
                <button
                  onClick={submit}
                  disabled={status === 'sending'}
                  className="shrink-0 inline-flex items-center justify-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] active:bg-[#006edb] text-white px-[22px] py-[11px] rounded-full font-semibold text-[14px] transition-all disabled:opacity-60 w-full sm:w-auto"
                >
                  {status === 'sending'
                    ? <><Loader2 className="h-[15px] w-[15px] animate-spin" />Sending&hellip;</>
                    : <>Email it to me<ArrowRight className="h-[15px] w-[15px] shrink-0" /></>}
                </button>
              </div>
              {status === 'error' && (
                <p className="text-[12px] text-red-600 mt-[8px] sm:text-right">{message}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
