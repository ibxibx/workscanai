import type { MetadataRoute } from 'next'
import { ROLES } from './automatable/roles'
import { VERTICALS } from './templates/verticals'

// XML sitemap — lists every indexable URL for Google/Bing (Bing's index feeds
// ChatGPT/Copilot, so this helps GEO too). Static routes + programmatic role
// pages + the public vertical sample reports. /admin, /auth, /dashboard are
// intentionally excluded (private / non-indexable).
const BASE = 'https://workscanai.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/scan`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/templates`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/automatable`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ]

  const rolePages: MetadataRoute.Sitemap = ROLES.map((r) => ({
    url: `${BASE}/automatable/${r.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const sampleReports: MetadataRoute.Sitemap = VERTICALS.map((v) => ({
    url: `${BASE}/report/${v.shareCode}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...rolePages, ...sampleReports]
}
