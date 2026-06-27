'use client'

import posthog from 'posthog-js'

/**
 * Thin, safe wrapper around PostHog event capture for WorkScanAI's funnel.
 * Every helper no-ops if PostHog wasn't initialized (no key in env), so call
 * sites never need to guard. Keep event names stable — they back the funnels
 * in the PostHog UI.
 *
 * Funnel: land → input_started → analysis_submitted → result_viewed →
 *         report_shared / report_exported / workflow_downloaded
 */

export function isPostHogReady(): boolean {
  try {
    return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY && posthog.__loaded === true
  } catch {
    return false
  }
}

function capture(event: string, props?: Record<string, unknown>) {
  if (!isPostHogReady()) return
  try { posthog.capture(event, props) } catch { /* never throw from analytics */ }
}

/**
 * Read a multivariate/boolean feature flag value. Returns undefined if PostHog
 * isn't ready (no key / not loaded) so callers can fall back to a default.
 * Used for the onboarding-style A/B test (control vs sample_first).
 */
export function getFeatureFlag(key: string): string | boolean | undefined {
  if (!isPostHogReady()) return undefined
  try { return posthog.getFeatureFlag(key) } catch { return undefined }
}

/**
 * Register the resolved A/B variant as a super property so EVERY subsequent
 * event carries it — lets the funnel be broken down by experiment arm. Also
 * fires PostHog's $feature_flag_called so the flag shows usage. No-ops safely.
 */
export function registerExperimentVariant(flagKey: string, variant: string) {
  if (!isPostHogReady()) return
  try {
    posthog.register({ [`exp_${flagKey.replace(/-/g, '_')}`]: variant })
  } catch { /* never throw from analytics */ }
}

// 1) First meaningful interaction with the analyze form
export const trackInputStarted = (props?: Record<string, unknown>) =>
  capture('input_started', props)

// 2) Analysis request submitted (workflow created + analyze fired)
export const trackAnalysisSubmitted = (props?: Record<string, unknown>) =>
  capture('analysis_submitted', props)

// 3) A finished report/results page was viewed
export const trackResultViewed = (props?: Record<string, unknown>) =>
  capture('result_viewed', props)

// 4) Share link copied
export const trackReportShared = (props?: Record<string, unknown>) =>
  capture('report_shared', props)

// 5) Report exported (PDF / DOCX)
export const trackReportExported = (props?: Record<string, unknown>) =>
  capture('report_exported', props)

// 6) n8n workflow JSON downloaded
export const trackWorkflowDownloaded = (props?: Record<string, unknown>) =>
  capture('workflow_downloaded', props)
