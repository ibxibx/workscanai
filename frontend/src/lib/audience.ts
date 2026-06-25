/**
 * Niche / audience attribution for WorkScanAI growth analytics.
 *
 * Resolves an arriving visitor into a coarse "audience" segment plus the raw
 * acquisition signals (utm params + referrer). Registered as PostHog super
 * properties at init time so EVERY event (pageview through activation) carries
 * them — no per-call-site plumbing. This is what lets the conversion funnel be
 * broken down by niche to find which audiences actually convert.
 *
 * Pure + framework-free so it can be unit-reasoned and reused server-side later.
 */

export type Audience =
  | 'automation_builder' // n8n / Zapier / Make / RPA crowd
  | 'ops_manager'        // process / operations / efficiency
  | 'founder'            // startup / founder / indie hacker
  | 'developer'          // dev / engineering / technical
  | 'ai_curious'         // general "AI tools" discovery
  | 'unknown'

export interface AcquisitionContext {
  audience: Audience
  acq_channel: string          // e.g. 'linkedin', 'google', 'reddit', 'direct'
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  referring_domain?: string
}

/** Explicit campaign override: ?aud=automation_builder always wins. */
const VALID_AUDIENCES: ReadonlySet<string> = new Set([
  'automation_builder', 'ops_manager', 'founder', 'developer', 'ai_curious',
])

/** Referrer-domain → coarse channel. Kept small + obvious on purpose. */
function channelFromDomain(domain: string): string {
  const d = domain.toLowerCase()
  if (d.includes('linkedin')) return 'linkedin'
  if (d.includes('google')) return 'google'
  if (d.includes('reddit')) return 'reddit'
  if (d.includes('news.ycombinator') || d.includes('ycombinator')) return 'hackernews'
  if (d.includes('twitter') || d.includes('t.co') || d === 'x.com') return 'twitter'
  if (d.includes('youtube')) return 'youtube'
  if (d.includes('github')) return 'github'
  if (d.includes('producthunt')) return 'producthunt'
  if (d.includes('bing')) return 'bing'
  if (d.includes('duckduckgo')) return 'duckduckgo'
  return d || 'direct'
}

/** Keyword buckets for inferring audience from utm/campaign/referrer text. */
const KEYWORD_RULES: ReadonlyArray<[Audience, readonly string[]]> = [
  ['automation_builder', ['n8n', 'zapier', 'make.com', 'automation', 'workflow', 'rpa', 'nocode', 'no-code']],
  ['developer',          ['github', 'dev', 'engineer', 'api', 'python', 'fastapi', 'stack']],
  ['founder',            ['founder', 'startup', 'indie', 'saas', 'producthunt', 'yc', 'ycombinator', 'hackernews']],
  ['ops_manager',        ['ops', 'operations', 'process', 'efficiency', 'productivity', 'manager']],
  ['ai_curious',         ['ai', 'gpt', 'llm', 'chatgpt', 'claude']],
]

function audienceFromText(...parts: Array<string | undefined>): Audience {
  const hay = parts.filter(Boolean).join(' ').toLowerCase()
  if (!hay) return 'unknown'
  for (const [aud, keys] of KEYWORD_RULES) {
    if (keys.some((k) => hay.includes(k))) return aud
  }
  return 'unknown'
}

/**
 * Resolve acquisition context from the current browser location + referrer.
 * Safe to call client-side only; returns a sensible default if window is absent.
 */
export function resolveAcquisition(): AcquisitionContext {
  if (typeof window === 'undefined') {
    return { audience: 'unknown', acq_channel: 'direct' }
  }

  const params = new URLSearchParams(window.location.search)
  const utm_source = params.get('utm_source') || undefined
  const utm_medium = params.get('utm_medium') || undefined
  const utm_campaign = params.get('utm_campaign') || undefined
  const audParam = (params.get('aud') || '').toLowerCase()

  let referring_domain: string | undefined
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname
      // ignore self-referrals (internal navigation)
      if (host && host !== window.location.hostname) referring_domain = host
    }
  } catch { /* malformed referrer — ignore */ }

  const acq_channel = utm_source
    ? utm_source.toLowerCase()
    : channelFromDomain(referring_domain || 'direct')

  // Precedence: explicit ?aud= → utm text → referrer channel keywords → unknown
  let audience: Audience = 'unknown'
  if (VALID_AUDIENCES.has(audParam)) {
    audience = audParam as Audience
  } else {
    audience = audienceFromText(utm_source, utm_medium, utm_campaign, referring_domain)
  }

  return { audience, acq_channel, utm_source, utm_medium, utm_campaign, referring_domain }
}
