import type { Metadata } from 'next'

// SEO + social metadata for the vertical-templates gallery (#31). Each vertical
// card links out to an indexable /report/{code}, but this gallery page itself is
// the "sample reports by industry" hub — a permanent, shareable entry point that
// pairs with the public sample gallery (#50). OG/Twitter reuse the app default.
export const metadata: Metadata = {
  title: 'Automation sample reports by industry — WorkScanAI',
  description:
    'See a real, per-task automation analysis for support, finance, HR, marketing, sales or an automation agency. Full report, hours reclaimed and importable n8n workflows — no typing, no signup.',
  openGraph: {
    title: 'Automation sample reports by industry',
    description:
      'Pick your function and open a full WorkScanAI report instantly — scored tasks, annual savings, and importable n8n workflows. Free, no signup.',
    type: 'website',
    url: 'https://workscanai.vercel.app/templates',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Automation sample reports by industry',
    description:
      'Pick your function — open a full per-task automation report instantly, with importable n8n workflows.',
  },
  alternates: { canonical: 'https://workscanai.vercel.app/templates' },
}

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children
}
