'use client'

/**
 * Minimal cookie-consent layer gating non-essential tracking (PostHog)
 * behind explicit opt-in, per GDPR Art. 6(1)(a) / German TTDSG §25 — no
 * analytics cookie or session recording may be set before the visitor
 * consents. Stored in localStorage (client-only; no SSR need, unlike the
 * wsai_locale cookie). A window CustomEvent lets any mounted listener
 * (PostHogProvider, the banner itself) react immediately to a decision,
 * including a reset triggered from the footer "Cookie settings" link.
 */

export const CONSENT_KEY = 'wsai_consent'
export const CONSENT_EVENT = 'wsai-consent-change'

export type ConsentValue = 'granted' | 'denied' | null

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function setConsent(value: 'granted' | 'denied') {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CONSENT_KEY, value)
  } catch { /* storage blocked — banner just reappears next visit, safe default */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }))
}

// Clears the stored decision so the banner reappears — used by the footer
// "Cookie settings" link so visitors can change their mind at any time.
export function resetConsent() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CONSENT_KEY)
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }))
}
