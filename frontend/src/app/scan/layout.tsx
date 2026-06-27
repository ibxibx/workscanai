import type { Metadata } from 'next'

// SEO + social metadata for the Job Scanner acquisition wedge. The headline
// targets the high-intent "is my job automatable?" query. OG/Twitter tags make
// shared /scan links render a rich card (reuses the app's default OG image).
export const metadata: Metadata = {
  title: 'Is your job automatable? — WorkScanAI Job Scanner',
  description:
    'Enter any job title. AI researches the role, extracts real tasks, scores automation potential, and surfaces n8n workflows you can import. Free, no signup.',
  openGraph: {
    title: 'Is your job automatable?',
    description:
      'Enter a job title — get a scored, ranked breakdown of which tasks AI can automate today, plus importable n8n workflows.',
    type: 'website',
    url: 'https://workscanai.vercel.app/scan',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is your job automatable?',
    description:
      'Enter a job title — get a scored breakdown of which tasks AI can automate today, plus importable n8n workflows.',
  },
  alternates: { canonical: 'https://workscanai.vercel.app/scan' },
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children
}
