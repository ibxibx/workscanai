import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ROLES, roleHref } from '../roles'

// Programmatic role page (#49 / GEO). SERVER-rendered on purpose: crawlers and
// LLMs read the HTML directly, no client fetch. Pre-rendered for every role at
// build time (generateStaticParams). Structured for citation:
//   - summary-first quotable answer (definition-first pattern lifts AI citation)
//   - explicit automatable/human task split (extractable lists)
//   - FAQPage + Article JSON-LD (schema helps AI + rich results)
//   - sourced benchmark line (external citations lift GEO visibility)
// Each page carries UNIQUE role data (roles.ts) so it's a real data product,
// not a thin doorway page.

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
  const scanHref = `/scan?aud=${role.audience}&role=${encodeURIComponent(role.title)}&utm_source=seo&utm_medium=role_page&utm_campaign=${role.slug}`

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
    <div className="min-h-screen text-[#1d1d1f]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ marginTop: '44px', background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ea 100%)' }}
      >
        <div className="max-w-[820px] mx-auto px-6 py-[56px] sm:py-[80px]">
          <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-[16px]">
            Automation potential
          </p>
          <h1 className="text-[30px] sm:text-[46px] leading-[1.08] font-semibold italic tracking-tight mb-[20px] text-[#1d1d1f]">
            Is a {role.title} job automatable?
          </h1>
          {/* Quotable, summary-first answer — the block LLMs are most likely to cite */}
          <div className="bg-white border border-[#e8e8ed] rounded-[16px] p-[22px] sm:p-[26px] shadow-sm">
            <p className="text-[16px] sm:text-[18px] leading-[1.55] text-[#1d1d1f]">
              <span className="font-semibold">In short:</span> {role.summary}
            </p>
          </div>
          <div className="mt-[24px] flex gap-[12px] flex-wrap">
            <Link href={scanHref} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[24px] py-[12px] rounded-full transition-all">
              Scan a {role.title.toLowerCase()} role — free
            </Link>
            {role.sampleCode && (
              <Link href={`/report/${role.sampleCode}?utm_source=seo&utm_medium=role_page&utm_campaign=${role.slug}`} className="inline-flex items-center text-[15px] text-[#0071e3] hover:text-[#0077ed] font-medium px-[16px] py-[12px]">
                See a real sample report
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Task split */}
      <section className="border-t border-[#d2d2d7] bg-white">
        <div className="max-w-[820px] mx-auto px-6 py-[48px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="bg-[#f5fbf6] border border-[#cdeccf] rounded-[16px] p-[24px]">
              <h2 className="text-[17px] font-semibold mb-[14px] text-[#1d1d1f]">
                What AI can automate today
              </h2>
              <ul className="space-y-[10px]">
                {role.automatableTasks.map((t) => (
                  <li key={t} className="flex gap-[10px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                    <span className="text-green-600 shrink-0">✓</span>{t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#fbf7f5] border border-[#eed9cd] rounded-[16px] p-[24px]">
              <h2 className="text-[17px] font-semibold mb-[14px] text-[#1d1d1f]">
                What stays human-led
              </h2>
              <ul className="space-y-[10px]">
                {role.humanTasks.map((t) => (
                  <li key={t} className="flex gap-[10px] text-[14px] leading-[1.5] text-[#1d1d1f]">
                    <span className="text-[#c1791f] shrink-0">●</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sourced benchmark — external citation lifts GEO visibility */}
          <p className="mt-[24px] text-[13px] leading-[1.6] text-[#6e6e73]">
            For context, McKinsey&rsquo;s 2025 work-automation research estimates that about 57% of
            current work activities are technically automatable with today&rsquo;s AI, and that most
            knowledge roles will see a large share of individual tasks — not whole jobs — automated
            first. The task-level split above reflects that pattern for a {role.title.toLowerCase()}.
            The figures here are typical estimates; run a free scan for your own role to get real numbers.
          </p>
        </div>
      </section>

      {/* FAQ — question/answer format is highly extractable by AI */}
      <section className="border-t border-[#d2d2d7] bg-[#f5f5f7]">
        <div className="max-w-[820px] mx-auto px-6 py-[48px]">
          <h2 className="text-[22px] font-semibold italic tracking-tight mb-[24px] text-[#1d1d1f]">
            Frequently asked
          </h2>
          <div className="space-y-[18px]">
            {faqs.map((f) => (
              <div key={f.q} className="bg-white border border-[#e8e8ed] rounded-[14px] p-[20px]">
                <h3 className="text-[15px] font-semibold mb-[8px] text-[#1d1d1f]">{f.q}</h3>
                <p className="text-[14px] leading-[1.55] text-[#424245]">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-[32px] text-center">
            <Link href={scanHref} className="inline-flex items-center gap-[8px] bg-[#0071e3] hover:bg-[#0077ed] text-white text-[15px] font-medium px-[26px] py-[13px] rounded-full transition-all">
              Get your real automation score
            </Link>
          </div>
        </div>
      </section>

      {/* Related roles — internal linking (SEO + GEO both reward it) */}
      <section className="border-t border-[#d2d2d7] bg-white">
        <div className="max-w-[820px] mx-auto px-6 py-[40px]">
          <h2 className="text-[15px] font-semibold text-[#6e6e73] uppercase tracking-wide mb-[16px]">
            Other roles
          </h2>
          <div className="flex flex-wrap gap-[10px]">
            {ROLES.filter((r) => r.slug !== role.slug).map((r) => (
              <Link key={r.slug} href={roleHref(r)} className="text-[13px] text-[#0071e3] hover:text-[#0077ed] border border-[#d2d2d7] rounded-full px-[14px] py-[7px] hover:border-[#0071e3]/40 transition-colors">
                {r.title}
              </Link>
            ))}
            <Link href="/templates" className="text-[13px] text-[#0071e3] hover:text-[#0077ed] border border-[#d2d2d7] rounded-full px-[14px] py-[7px] hover:border-[#0071e3]/40 transition-colors">
              Sample reports by industry →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d2d2d7]">
        <div className="max-w-[820px] mx-auto px-6 py-[28px]">
          <div className="flex justify-between items-center text-[12px] text-[#86868b]">
            <div>© 2026 WorkScanAI</div>
            <div className="flex gap-[24px]">
              <a href="https://ianworks.dev" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">Ian Baumeister</a>
              <a href="https://github.com/ibxibx/workscanai" target="_blank" rel="noopener noreferrer" className="hover:text-[#1d1d1f] transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
