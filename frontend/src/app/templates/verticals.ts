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

import type { Locale } from '@/i18n/config'

export interface Vertical {
  key: string
  label: string
  labelDe: string
  audience: string
  blurb: string
  blurbDe: string
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
    labelDe: 'Automatisierungs-Agentur',
    audience: 'automation_builder',
    blurb: 'What an n8n / Make agency can automate in its own client delivery.',
    blurbDe: 'Was eine n8n-/Make-Agentur in der eigenen Kundenauslieferung automatisieren kann.',
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
    labelDe: 'Kundensupport',
    audience: 'ops_manager',
    blurb: 'Ticket triage, macro replies, escalations and CSAT reporting.',
    blurbDe: 'Ticket-Triage, Makro-Antworten, Eskalationen und CSAT-Reporting.',
    shareCode: 'ceaefa',
    score: 74,
    annualSavings: 8098,
    hoursSaved: 162,
    tasks: 5,
  },
  {
    key: 'finance',
    label: 'Finance & accounting',
    labelDe: 'Finanzen & Buchhaltung',
    audience: 'ops_manager',
    blurb: 'Invoice coding, reconciliation, AR chasing and month-end reporting.',
    blurbDe: 'Rechnungskontierung, Abstimmung, Forderungsmanagement und Monatsabschluss-Reporting.',
    shareCode: '0c6c25',
    score: 75,
    annualSavings: 7579,
    hoursSaved: 152,
    tasks: 5,
  },
  {
    key: 'hr',
    label: 'HR & recruiting',
    labelDe: 'HR & Recruiting',
    audience: 'ops_manager',
    blurb: 'Application screening, interview scheduling, onboarding and funnel reports.',
    blurbDe: 'Bewerbungsvorauswahl, Terminplanung für Interviews, Onboarding und Funnel-Reports.',
    shareCode: 'fa6d5d',
    score: 82,
    annualSavings: 7426,
    hoursSaved: 149,
    tasks: 5,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    labelDe: 'Marketing',
    audience: 'founder',
    blurb: 'Content, scheduling, community replies, reporting and topic research.',
    blurbDe: 'Content, Planung, Community-Antworten, Reporting und Themenrecherche.',
    shareCode: 'e07429',
    score: 61,
    annualSavings: 19159,
    hoursSaved: 383,
    tasks: 5,
  },
  {
    key: 'sales',
    label: 'Sales operations',
    labelDe: 'Vertriebssteuerung',
    audience: 'ops_manager',
    blurb: 'Lead routing, follow-ups, CRM hygiene, quoting and pipeline forecasts.',
    blurbDe: 'Lead-Routing, Nachfassaktionen, CRM-Pflege, Angebotserstellung und Pipeline-Prognosen.',
    shareCode: '4696b7',
    score: 76,
    annualSavings: 8945,
    hoursSaved: 179,
    tasks: 5,
  },
  {
    key: 'operations',
    label: 'Operations & logistics',
    labelDe: 'Operations & Logistik',
    audience: 'ops_manager',
    blurb: 'Order processing, shipment tracking, inventory and vendor coordination.',
    blurbDe: 'Auftragsabwicklung, Sendungsverfolgung, Bestandsführung und Lieferantenkoordination.',
    shareCode: 'bf3dcd',
    score: 73,
    annualSavings: 9062,
    hoursSaved: 181,
    tasks: 5,
  },
  {
    key: 'engineering',
    label: 'IT & software engineering',
    labelDe: 'IT & Softwareentwicklung',
    audience: 'founder',
    blurb: 'Bug triage, PR reviews, CI/CD deploys and internal IT requests.',
    blurbDe: 'Bug-Triage, PR-Reviews, CI/CD-Deployments und interne IT-Anfragen.',
    shareCode: '0234ac',
    score: 81,
    annualSavings: 10513,
    hoursSaved: 210,
    tasks: 5,
  },
  {
    key: 'legal',
    label: 'Legal & compliance',
    labelDe: 'Recht & Compliance',
    audience: 'ops_manager',
    blurb: 'Contract review, compliance deadlines, legal queries and document management.',
    blurbDe: 'Vertragsprüfung, Compliance-Fristen, Rechtsfragen und Dokumentenverwaltung.',
    shareCode: '358522',
    score: 79,
    annualSavings: 10540,
    hoursSaved: 210,
    tasks: 5,
  },
  {
    key: 'ecommerce',
    label: 'E-commerce operations',
    labelDe: 'E-Commerce-Betrieb',
    audience: 'founder',
    blurb: 'Order fulfilment, listings, customer inquiries and payout reconciliation.',
    blurbDe: 'Auftragsabwicklung, Produktlistings, Kundenanfragen und Auszahlungsabgleich.',
    shareCode: '373f0f',
    score: 79,
    annualSavings: 8992,
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

export function vLabel(v: Vertical, locale: Locale): string {
  return locale === 'de' ? v.labelDe : v.label
}

export function vBlurb(v: Vertical, locale: Locale): string {
  return locale === 'de' ? v.blurbDe : v.blurb
}
