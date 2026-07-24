'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { isPostHogReady } from '@/lib/analytics'
import { resolveAcquisition } from '@/lib/audience'
import { CONSENT_EVENT, getConsent, type ConsentValue } from '@/lib/consent'

/**
 * Initializes PostHog (client-side) and fires SPA $pageview events on every
 * App-Router route change. Dormant unless NEXT_PUBLIC_POSTHOG_KEY is set AND
 * the visitor has granted cookie consent — GDPR/TTDSG require opt-in before
 * any non-essential tracking cookie or session recording is set. Gated via
 * lib/consent.ts + the CookieConsent banner; if consent is later revoked we
 * opt out and reset local PostHog state immediately.
 *
 * The /admin route is excluded from capture so the owner's own dashboard
 * sessions don't pollute funnels (mirrors PageTracker's behaviour).
 */
export default function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialized = useRef(false)
  const lastPath = useRef<string | null>(null)

  const initPostHog = () => {
    if (initialized.current) return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
    if (!key) return // no key → stay dormant, never init
    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false,      // we send $pageview manually for SPA routing
      capture_pageleave: true,
      autocapture: true,            // clicks, inputs, etc.
      disable_session_recording: false, // session replay ON
      session_recording: {
        maskAllInputs: true,        // privacy: never record typed input values
      },
      loaded: () => { initialized.current = true },
    })

    // Niche attribution: register acquisition context as super properties so
    // every event (pageview → activation) carries audience + channel + utm.
    // This is what lets the conversion funnel be segmented by niche.
    try {
      const acq = resolveAcquisition()
      posthog.register({
        audience: acq.audience,
        acq_channel: acq.acq_channel,
        utm_source: acq.utm_source,
        utm_medium: acq.utm_medium,
        utm_campaign: acq.utm_campaign,
        acq_referring_domain: acq.referring_domain,
      })
      // Persist audience as a person property too (survives identification),
      // set once so the FIRST-touch niche isn't overwritten by later visits.
      posthog.setPersonPropertiesForFlags?.({ audience: acq.audience })
      posthog.people?.set_once?.({
        initial_audience: acq.audience,
        initial_acq_channel: acq.acq_channel,
      })
    } catch { /* never break init on attribution */ }

    initialized.current = true

    // Fire the pageview PostHog missed while it was waiting for consent
    // (e.g. consent granted mid-session, same URL, no route-change effect).
    const url = window.location.pathname + window.location.search
    if (!pathname?.startsWith('/admin')) {
      posthog.capture('$pageview', { $current_url: window.location.href })
      lastPath.current = url
    }
  }

  // React to consent: init on grant; opt out + wipe local state on denial
  // or revocation (footer "Cookie settings" → reset → re-decide).
  useEffect(() => {
    const apply = (value: ConsentValue) => {
      if (value === 'granted') {
        initPostHog()
      } else if (value === 'denied' && initialized.current) {
        try {
          posthog.opt_out_capturing()
          posthog.reset()
        } catch { /* never throw from analytics */ }
      }
    }
    apply(getConsent())
    const onChange = (e: Event) => apply((e as CustomEvent<ConsentValue>).detail)
    window.addEventListener(CONSENT_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_EVENT, onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // SPA pageview on route change (App Router doesn't fire native pageviews)
  useEffect(() => {
    if (!isPostHogReady()) return
    if (!pathname) return
    if (pathname.startsWith('/admin')) return
    const qs = searchParams?.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (lastPath.current === url) return
    lastPath.current = url
    posthog.capture('$pageview', { $current_url: window.location.origin + url })
  }, [pathname, searchParams])

  return null
}
