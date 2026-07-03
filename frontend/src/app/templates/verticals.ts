// Vertical templates (#31) — the "cards" picker config.
//
// Each vertical is a REAL, pre-generated WorkScanAI analysis living in prod Turso
// (share codes created via scripts/gen_vertical_samples.py). Clicking a card opens
// that industry's actual report instantly — value before input, zero cold-start,
// no quota slot. The numbers below are the real analysis outputs, NOT hardcoded
// marketing figures (anti-fabrication rule): they mirror what /report/{code} shows.
//
// Attribution: each card links to /report/{code}?ref={code}&aud=<segment>&utm_...
//  - ?ref lets a visitor who then runs their own analysis be attributed to this
//    vertical as the "referrer" (same viewer->creator k-factor loop as shares).
//  - ?aud sets the PostHog audience super-prop (via lib/audience.ts) so the funnel
//    can be segmented by which vertical converts.
//  - utm_* attributes the entry channel.
// This turns one generic sample into six separately-attributable niche wedges.

export interface Vertical {
  key: string
  label: string
  audience: string
  blurb: string
  shareCode: string
  score: number
  annualSavings: number
  hoursSaved: number
  tasks: number
  featured?: boolean
}

export const VERTICALS: Vertical[] = [
  {
    key: 'agency',
    label: 'Automation agency',
    audience: 'automation_builder',
    blurb: 'What an n8n / Make agency can automate in its own client delivery.',
    shareCode: '06c952',
    score: 68,
    annualSavings: 25495,
    hoursSaved: 510,
    tasks: 5,
    featured: true,
  },
  {
    key: 'support',
    label: 'Customer support',
    audience: 'ops_manager',
    blurb: 'Ticket triage, macro replies, escalations and CSAT reporting.',
    shareCode: 'ceaefa',
    score: 74,
    annualSavings: 8098,
    hoursSaved: 162,
    tasks: 5,
  },
  {
    key: 'finance',
    label: 'Finance & accounting',
    audience: 'ops_manager',
    blurb: 'Invoice coding, reconciliation, AR chasing and month-end reporting.',
    shareCode: '0c6c25',
    score: 75,
    annualSavings: 7579,
    hoursSaved: 152,
    tasks: 5,
  },
  {
    key: 'hr',
    label: 'HR & recruiting',
    audience: 'ops_manager',
    blurb: 'Application screening, interview scheduling, onboarding and funnel reports.',
    shareCode: 'fa6d5d',
    score: 82,
    annualSavings: 7426,
    hoursSaved: 149,
    tasks: 5,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    audience: 'founder',
    blurb: 'Content, scheduling, community replies, reporting and topic research.',
    shareCode: 'e07429',
    score: 61,
    annualSavings: 19159,
    hoursSaved: 383,
    tasks: 5,
  },
  {
    key: 'sales',
    label: 'Sales operations',
    audience: 'ops_manager',
    blurb: 'Lead routing, follow-ups, CRM hygiene, quoting and pipeline forecasts.',
    shareCode: '4696b7',
    score: 76,
    annualSavings: 8945,
    hoursSaved: 179,
    tasks: 5,
  },
]

export function verticalHref(v: Vertical): string {
  const params = new URLSearchParams({
    ref: v.shareCode,
    aud: v.audience,
    utm_source: 'templates',
    utm_medium: 'gallery',
    utm_campaign: `vertical_${v.key}`,
  })
  return `/report/${v.shareCode}?${params.toString()}`
}
