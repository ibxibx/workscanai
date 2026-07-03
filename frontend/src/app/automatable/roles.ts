// Programmatic role pages (#49 / GEO) — single source of truth.
//
// Each entry becomes an indexable /automatable/{slug} page targeting the
// long-tail, high-intent query "is a {role} automatable?" — the exact phrasing
// people type into Google AND ChatGPT/Perplexity/Claude. Consumed by:
//   - app/automatable/[slug]/page.tsx  (the rendered page)
//   - app/automatable/page.tsx         (the hub / index)
//   - app/sitemap.ts                   (lists every role URL)
//
// Anti-thin-content rule (Google 2026 scaled-content-abuse policy): each page
// must carry UNIQUE, role-specific data — not a templated shell. So every role
// declares its own quotable summary, automatable/human task splits, and a
// representative automation %. These are editorial estimates grounded in the
// same task-level model the product uses; the live scan gives the user their
// real numbers. We label them as typical/illustrative, never as measured fact.

export interface Role {
  slug: string
  title: string
  aka?: string[]
  audience: string
  summary: string        // definition-first, quotable 40-60 word answer (GEO)
  typicalScore: number   // representative automation potential (%), illustrative
  automatableTasks: string[]
  humanTasks: string[]
  sampleCode?: string    // optional pre-generated real report for this role
}

export const ROLES: Role[] = [
  {
    slug: 'marketing-manager',
    title: 'Marketing Manager',
    aka: ['marketing lead', 'growth marketer'],
    audience: 'ops_manager',
    summary:
      'A marketing manager role is roughly 60-70% automatable with today\u2019s AI. Content drafting, post scheduling, performance reporting and first-pass community replies can be largely automated, while brand strategy, creative judgement and stakeholder relationships stay firmly human-led.',
    typicalScore: 65,
    automatableTasks: ['Drafting and scheduling social posts', 'Compiling performance reports', 'First-pass replies to comments and DMs', 'Repurposing content across channels', 'Researching trending topics'],
    humanTasks: ['Brand and campaign strategy', 'Creative direction and taste', 'Executive and partner relationships'],
    sampleCode: 'e07429',
  },
  {
    slug: 'bookkeeper',
    title: 'Bookkeeper',
    aka: ['accounts clerk', 'accounting assistant'],
    audience: 'ops_manager',
    summary:
      'Bookkeeping is one of the most automatable knowledge roles \u2014 often 70-80%. Invoice coding, bank reconciliation, receipt matching and routine reporting are highly rule-based and data-rich. What stays human is judgement on unusual transactions, advisory conversations and final sign-off.',
    typicalScore: 75,
    automatableTasks: ['Coding and entering invoices', 'Reconciling bank transactions', 'Matching receipts to expenses', 'Generating routine financial reports', 'Chasing overdue payments'],
    humanTasks: ['Judgement on unusual or disputed items', 'Advisory conversations with owners', 'Final review and sign-off'],
    sampleCode: '0c6c25',
  },
  {
    slug: 'recruiter',
    title: 'Recruiter',
    aka: ['talent acquisition', 'hiring coordinator'],
    audience: 'ops_manager',
    summary:
      'A recruiter role is around 65-80% automatable today. Application screening against criteria, interview scheduling, candidate status emails and funnel reporting are highly repeatable. Assessing culture fit, closing candidates and hiring decisions remain human judgement calls.',
    typicalScore: 72,
    automatableTasks: ['Screening applications against criteria', 'Scheduling interviews across calendars', 'Sending candidate status and rejection emails', 'Compiling hiring-funnel reports', 'Drafting sourcing outreach'],
    humanTasks: ['Assessing culture and team fit', 'Closing and negotiating with candidates', 'Final hiring decisions'],
    sampleCode: 'fa6d5d',
  },
  {
    slug: 'customer-support-agent',
    title: 'Customer Support Agent',
    aka: ['support rep', 'helpdesk agent'],
    audience: 'ops_manager',
    summary:
      'Customer support is roughly 70-80% automatable for common workloads. Ticket triage, macro-based replies to repeat questions, and CSAT reporting are highly automatable, and AI now drafts most first responses. Complex, emotional or high-stakes cases still need a human in the loop.',
    typicalScore: 75,
    automatableTasks: ['Triaging and tagging tickets', 'Replying to common questions with macros', 'Drafting first responses', 'Updating help-center articles', 'Compiling CSAT and volume reports'],
    humanTasks: ['Complex or high-stakes escalations', 'Emotional or sensitive conversations', 'Judgement on exceptions and refunds'],
    sampleCode: 'ceaefa',
  },
  {
    slug: 'sales-development-rep',
    title: 'Sales Development Rep',
    aka: ['SDR', 'BDR', 'sales ops'],
    audience: 'ops_manager',
    summary:
      'An SDR role is about 65-80% automatable. Lead enrichment and routing, follow-up sequences, CRM hygiene and pipeline reporting are highly repeatable and data-driven. Discovery conversations, objection handling and relationship building stay human-led.',
    typicalScore: 76,
    automatableTasks: ['Enriching and routing inbound leads', 'Sending personalized follow-up sequences', 'Keeping CRM records current', 'Generating quotes from a price book', 'Building pipeline and forecast reports'],
    humanTasks: ['Discovery and qualification calls', 'Objection handling and negotiation', 'Building prospect relationships'],
    sampleCode: '4696b7',
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    aka: ['business analyst', 'BI analyst'],
    audience: 'developer',
    summary:
      'A data analyst role is roughly 55-70% automatable. Data cleaning, routine dashboard refreshes, standard reporting and first-pass exploratory analysis can be automated. Framing the right questions, interpreting results in business context and influencing decisions remain human strengths.',
    typicalScore: 62,
    automatableTasks: ['Cleaning and preparing datasets', 'Refreshing routine dashboards', 'Generating standard reports', 'First-pass exploratory analysis', 'Writing recurring SQL queries'],
    humanTasks: ['Framing the right business questions', 'Interpreting results in context', 'Influencing decisions with stakeholders'],
  },
  {
    slug: 'executive-assistant',
    title: 'Executive Assistant',
    aka: ['personal assistant', 'admin assistant'],
    audience: 'ops_manager',
    summary:
      'An executive assistant role is around 55-70% automatable. Calendar scheduling, inbox triage, travel booking and meeting-note summaries are increasingly automatable with AI agents. Discretion, relationship management and judgement on shifting priorities keep a human essential.',
    typicalScore: 60,
    automatableTasks: ['Scheduling and rescheduling meetings', 'Triaging and drafting email replies', 'Booking travel and logistics', 'Summarizing meeting notes and actions', 'Preparing routine documents'],
    humanTasks: ['Discretion on sensitive matters', 'Managing relationships and gatekeeping', 'Judgement on shifting priorities'],
  },
  {
    slug: 'content-writer',
    title: 'Content Writer',
    aka: ['copywriter', 'content marketer'],
    audience: 'founder',
    summary:
      'A content writer role is roughly 50-65% automatable. AI drafts, outlines, repurposes and optimizes copy at speed, and handles SEO briefs well. Original angles, brand voice, fact-checking and editorial judgement are where human writers now add the most value.',
    typicalScore: 58,
    automatableTasks: ['Drafting first-pass copy and outlines', 'Repurposing content across formats', 'Writing SEO briefs and meta copy', 'Editing for grammar and consistency', 'Generating variations for testing'],
    humanTasks: ['Original angles and narrative', 'Brand voice and editorial taste', 'Fact-checking and accountability'],
  },
  {
    slug: 'operations-manager',
    title: 'Operations Manager',
    aka: ['ops manager', 'head of operations'],
    audience: 'ops_manager',
    summary:
      'An operations manager role is around 45-60% automatable. Reporting, scheduling, process documentation and routine vendor coordination can be automated, while cross-team decisions, exception handling and people leadership remain firmly human.',
    typicalScore: 52,
    automatableTasks: ['Compiling operational reports', 'Scheduling and resource coordination', 'Documenting and mapping processes', 'Routine vendor and supplier comms', 'Tracking KPIs and flagging anomalies'],
    humanTasks: ['Cross-team prioritization and trade-offs', 'Exception and crisis handling', 'Leading and developing people'],
  },
  {
    slug: 'paralegal',
    title: 'Paralegal',
    aka: ['legal assistant'],
    audience: 'ops_manager',
    summary:
      'A paralegal role is roughly 50-65% automatable. Document review, contract data extraction, legal research and standard drafting are increasingly AI-assisted. Legal judgement, client interaction and anything requiring accountability stay with qualified humans.',
    typicalScore: 58,
    automatableTasks: ['Reviewing and summarizing documents', 'Extracting data from contracts', 'First-pass legal research', 'Drafting standard clauses and letters', 'Organizing case files and deadlines'],
    humanTasks: ['Legal judgement and interpretation', 'Client interaction and advice', 'Accountability and sign-off'],
  },
]

export function roleHref(r: Role): string {
  return `/automatable/${r.slug}`
}
