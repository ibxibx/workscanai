import type { Metadata } from 'next'
import AutomatableHubClient from './AutomatableHubClient'

// Hub / index for the programmatic role pages. Gives crawlers a single page that
// links to every /automatable/{role}, and gives humans a "which jobs are
// automatable?" directory. The metadata below stays English (canonical/SEO
// surface); the visible body renders via a client component that toggles to
// German when the wsai_locale cookie is set.

const BASE = 'https://workscanai.vercel.app'

export const metadata: Metadata = {
  title: 'Which jobs are automatable? Role-by-role AI analysis — WorkScanAI',
  description:
    'See how automatable different roles are with today\u2019s AI — marketing manager, bookkeeper, recruiter, support agent, SDR and more. Per-task breakdown, what stays human, and a free scan for your own role.',
  openGraph: {
    title: 'Which jobs are automatable? Role-by-role AI analysis',
    description: 'Per-role automation potential with a task-by-task breakdown and a free scan for your own role.',
    type: 'website',
    url: `${BASE}/automatable`,
  },
  twitter: { card: 'summary_large_image', title: 'Which jobs are automatable?', description: 'Per-role automation potential, task by task.' },
  alternates: { canonical: `${BASE}/automatable` },
}

export default function AutomatableHub() {
  return <AutomatableHubClient />
}
