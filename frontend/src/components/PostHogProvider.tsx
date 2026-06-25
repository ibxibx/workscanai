'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { isPostHogReady } from '@/lib/analytics'
import { resolveAcquisition } from '@/lib/audience'

/**
 * Initializes PostHog (client-side) and fires SPA $pageview events on every
 * App-Router route change. Dormant unless NEXT_PUBLIC_POSTHOG_KEY is set, so
 * the build ships safely with no key and starts collecting once the key is
 * added in Vercel env. Session replay + autocapture are enabled here.
 *
 * The /admin route is excluded from capture so the owner's own dashboard
 * sessions don't pollute funnels (mirrors PageTracker's behaviour).
 */
export default function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialized = useRef(false)
  const lastPath = useRef<string | null>(null)

  // One-time init
  useEffect(() => {
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
