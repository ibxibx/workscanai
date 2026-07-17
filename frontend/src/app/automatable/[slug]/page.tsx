import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ROLES } from '../roles'
import RolePageClient from './RolePageClient'

// Programmatic role page (#49 / GEO). SERVER-rendered on purpose: crawlers and
// LLMs read the HTML directly, no client fetch. Pre-rendered for every role at
// build time (generateStaticParams). Structured for citation:
//   - summary-first quotable answer (definition-first pattern lifts AI citation)
//   - explicit automatable/human task split (extractable lists)
//   - FAQPage + Article JSON-LD (schema helps AI + rich results)
//   - sourced benchmark line (external citations lift GEO visibility)
// Each page carries UNIQUE role data (roles.ts) so it's a real data product,
// not a thin doorway page.
//
// i18n: metadata + JSON-LD stay ENGLISH (canonical/SEO surface — crawlers get
// EN by default). The visible body renders via RolePageClient, which toggles to
// German when the wsai_locale cookie is set (default EN worldwide).

const BASE = 'https://workscanai.vercel.app'

export function generateStaticParams() {
  return ROLES.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const role = ROLES.find((r) => r.slug === slug)
  if (!role) return {}
  const title = `Is a ${role.title} job automatable? — WorkScanAI`
  const description = role.summary
  const url = `${BASE}/automatable/${role.slug}`
  return {
    title,
    description,
    keywords: [`is a ${role.title.toLowerCase()} automatable`, `${role.title.toLowerCase()} automation`, `will AI replace ${role.title.toLowerCase()}`, ...(role.aka || [])],
    openGraph: { title, description, type: 'article', url },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  }
}

// English FAQ used only for the JSON-LD (crawler/LLM surface). The visible,
// locale-aware FAQ is built inside RolePageClient.
function faqFor(role: (typeof ROLES)[number]) {
  return [
    {
      q: `Is a ${role.title.toLowerCase()} job automatable?`,
      a: role.summary,
    },
    {
      q: `Which ${role.title.toLowerCase()} tasks can AI automate?`,
      a: `The most automatable tasks are: ${role.automatableTasks.join('; ')}. These are repeatable, rule-based and data-rich, which is exactly what current AI handles well.`,
    },
    {
      q: `What parts of a ${role.title.toLowerCase()} role stay human?`,
      a: `Tasks that need judgement, relationships or accountability stay human-led: ${role.humanTasks.join('; ')}.`,
    },
    {
      q: `Will AI replace ${role.title.toLowerCase()}s?`,
      a: `Not wholesale. A ${role.title.toLowerCase()} role is roughly ${role.typicalScore}% automatable by task, which typically means AI absorbs repetitive work and the role shifts toward the higher-judgement tasks rather than disappearing.`,
    },
  ]
}

export default async function RoledPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const role = ROLES.find((r) => r.slug === slug)
  if (!role) notFound()

  const faqs = faqFor(role)

  // JSON-LD: FAQPage (AI + rich results) + Article (authorship/freshness signals).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Article',
        headline: `Is a ${role.title} job automatable?`,
        description: role.summary,
        about: role.title,
        author: { '@type': 'Organization', name: 'WorkScanAI' },
        publisher: { '@type': 'Organization', name: 'WorkScanAI' },
        mainEntityOfPage: `${BASE}/automatable/${role.slug}`,
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RolePageClient role={role} />
    </>
  )
}
