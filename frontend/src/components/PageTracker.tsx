'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const BACKEND = 'https://workscanai.onrender.com'

/**
 * First-party page-view tracker for the growth dashboard.
 * Fires a fire-and-forget POST /api/track on each route change.
 * Country is resolved server-side from the client IP. Never blocks the UI;
 * any failure is silently ignored. Skips the /admin route itself so the
 * owner's own dashboard visits don't pollute traffic numbers.
 */
export default function PageTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/admin')) return
    if (lastTracked.current === pathname) return
    lastTracked.current = pathname

    const referrer = typeof document !== 'undefined' ? document.referrer : ''
    fetch(`${BACKEND}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer }),
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
