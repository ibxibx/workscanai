import type { MetadataRoute } from 'next'

// Robots policy. Explicitly welcomes both classic search crawlers AND the AI
// crawlers that power LLM answers (GEO): GPTBot/OAI-SearchBot (ChatGPT),
// ClaudeBot/Claude-Web (Claude), PerplexityBot, Google-Extended (Gemini/AI
// Overviews training), CCBot (Common Crawl, feeds many models). A common,
// self-inflicted GEO failure is silently blocking these — we opt in on purpose.
// /admin and Next internals are disallowed everywhere.
const BASE = 'https://workscanai.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/auth', '/api/', '/dashboard/results/'],
      },
      // Named AI crawlers — same allowances, listed explicitly so the intent is
      // unambiguous and easy to audit in server logs.
      { userAgent: 'GPTBot', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'Claude-Web', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/admin', '/auth'] },
      { userAgent: 'CCBot', allow: '/', disallow: ['/admin', '/auth'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
