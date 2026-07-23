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
//
// i18n: English is the canonical/SEO surface (crawlers get EN; server metadata
// + JSON-LD stay EN). German fields (…De) power the client-side language toggle
// for human DE users. Pick a field with the r*() helpers below by locale.

import type { Locale } from '@/i18n/config'

export interface Role {
  slug: string
  title: string
  titleDe: string
  aka?: string[]
  audience: string
  summary: string        // definition-first, quotable 40-60 word answer (GEO)
  summaryDe: string
  typicalScore: number   // representative automation potential (%), illustrative
  automatableTasks: string[]
  automatableTasksDe: string[]
  humanTasks: string[]
  humanTasksDe: string[]
  sampleCode?: string    // optional pre-generated real report for this role
}

export const ROLES: Role[] = [
  {
    slug: 'marketing-manager',
    title: 'Marketing Manager',
    titleDe: 'Marketing Manager',
    aka: ['marketing lead', 'growth marketer'],
    audience: 'ops_manager',
    summary:
      'A marketing manager role is roughly 60-70% automatable with today’s AI. Content drafting, post scheduling, performance reporting and first-pass community replies can be largely automated, while brand strategy, creative judgement and stakeholder relationships stay firmly human-led.',
    summaryDe:
      'Die Rolle des Marketing Managers ist mit heutiger KI etwa zu 60–70 % automatisierbar. Das Erstellen von Content-Entwürfen, das Planen von Beiträgen, das Performance-Reporting und erste Antworten in der Community lassen sich weitgehend automatisieren, während Markenstrategie, kreatives Urteilsvermögen und Beziehungen zu Stakeholdern klar in menschlicher Hand bleiben.',
    typicalScore: 65,
    automatableTasks: ['Drafting and scheduling social posts', 'Compiling performance reports', 'First-pass replies to comments and DMs', 'Repurposing content across channels', 'Researching trending topics'],
    automatableTasksDe: ['Social-Media-Beiträge entwerfen und planen', 'Performance-Berichte zusammenstellen', 'Erste Antworten auf Kommentare und DMs', 'Content für mehrere Kanäle aufbereiten', 'Trendthemen recherchieren'],
    humanTasks: ['Brand and campaign strategy', 'Creative direction and taste', 'Executive and partner relationships'],
    humanTasksDe: ['Marken- und Kampagnenstrategie', 'Kreative Leitung und Gespür', 'Beziehungen zu Führung und Partnern'],
    sampleCode: 'e07429',
  },
  {
    slug: 'bookkeeper',
    title: 'Bookkeeper',
    titleDe: 'Buchhalter',
    aka: ['accounts clerk', 'accounting assistant'],
    audience: 'ops_manager',
    summary:
      'Bookkeeping is one of the most automatable knowledge roles — often 70-80%. Invoice coding, bank reconciliation, receipt matching and routine reporting are highly rule-based and data-rich. What stays human is judgement on unusual transactions, advisory conversations and final sign-off.',
    summaryDe:
      'Die Buchhaltung gehört zu den am stärksten automatisierbaren Wissensberufen – oft 70–80 %. Rechnungskontierung, Bankabstimmung, Belegzuordnung und Routine-Reporting sind stark regelbasiert und datenreich. In menschlicher Hand bleiben das Urteil bei ungewöhnlichen Vorgängen, Beratungsgespräche und die endgültige Freigabe.',
    typicalScore: 75,
    automatableTasks: ['Coding and entering invoices', 'Reconciling bank transactions', 'Matching receipts to expenses', 'Generating routine financial reports', 'Chasing overdue payments'],
    automatableTasksDe: ['Rechnungen kontieren und erfassen', 'Bankbewegungen abstimmen', 'Belege den Ausgaben zuordnen', 'Routine-Finanzberichte erstellen', 'Überfällige Zahlungen nachverfolgen'],
    humanTasks: ['Judgement on unusual or disputed items', 'Advisory conversations with owners', 'Final review and sign-off'],
    humanTasksDe: ['Urteil bei ungewöhnlichen oder strittigen Posten', 'Beratungsgespräche mit Inhabern', 'Endkontrolle und Freigabe'],
    sampleCode: '0c6c25',
  },
  {
    slug: 'recruiter',
    title: 'Recruiter',
    titleDe: 'Recruiter',
    aka: ['talent acquisition', 'hiring coordinator'],
    audience: 'ops_manager',
    summary:
      'A recruiter role is around 65-80% automatable today. Application screening against criteria, interview scheduling, candidate status emails and funnel reporting are highly repeatable. Assessing culture fit, closing candidates and hiring decisions remain human judgement calls.',
    summaryDe:
      'Die Rolle des Recruiters ist heute etwa zu 65–80 % automatisierbar. Das Sichten von Bewerbungen anhand von Kriterien, die Terminplanung für Interviews, Status-E-Mails an Kandidaten und das Funnel-Reporting sind stark wiederholbar. Die Einschätzung des Cultural Fit, das Gewinnen von Kandidaten und Einstellungsentscheidungen bleiben menschliche Ermessensfragen.',
    typicalScore: 72,
    automatableTasks: ['Screening applications against criteria', 'Scheduling interviews across calendars', 'Sending candidate status and rejection emails', 'Compiling hiring-funnel reports', 'Drafting sourcing outreach'],
    automatableTasksDe: ['Bewerbungen anhand von Kriterien sichten', 'Interviews über Kalender hinweg planen', 'Status- und Absage-E-Mails versenden', 'Recruiting-Funnel-Berichte erstellen', 'Ansprache zur Kandidatensuche entwerfen'],
    humanTasks: ['Assessing culture and team fit', 'Closing and negotiating with candidates', 'Final hiring decisions'],
    humanTasksDe: ['Kultur- und Team-Fit einschätzen', 'Kandidaten gewinnen und verhandeln', 'Endgültige Einstellungsentscheidungen'],
    sampleCode: 'fa6d5d',
  },
  {
    slug: 'customer-support-agent',
    title: 'Customer Support Agent',
    titleDe: 'Kundensupport-Mitarbeiter',
    aka: ['support rep', 'helpdesk agent'],
    audience: 'ops_manager',
    summary:
      'Customer support is roughly 70-80% automatable for common workloads. Ticket triage, macro-based replies to repeat questions, and CSAT reporting are highly automatable, and AI now drafts most first responses. Complex, emotional or high-stakes cases still need a human in the loop.',
    summaryDe:
      'Der Kundensupport ist für gängige Aufgaben etwa zu 70–80 % automatisierbar. Ticket-Triage, makrobasierte Antworten auf wiederkehrende Fragen und CSAT-Reporting sind stark automatisierbar, und KI entwirft heute die meisten Erstantworten. Komplexe, emotionale oder heikle Fälle brauchen weiterhin einen Menschen im Prozess.',
    typicalScore: 75,
    automatableTasks: ['Triaging and tagging tickets', 'Replying to common questions with macros', 'Drafting first responses', 'Updating help-center articles', 'Compiling CSAT and volume reports'],
    automatableTasksDe: ['Tickets triagieren und verschlagworten', 'Häufige Fragen per Makro beantworten', 'Erstantworten entwerfen', 'Hilfe-Center-Artikel aktualisieren', 'CSAT- und Volumenberichte erstellen'],
    humanTasks: ['Complex or high-stakes escalations', 'Emotional or sensitive conversations', 'Judgement on exceptions and refunds'],
    humanTasksDe: ['Komplexe oder heikle Eskalationen', 'Emotionale oder sensible Gespräche', 'Urteil bei Ausnahmen und Erstattungen'],
    sampleCode: 'ceaefa',
  },
  {
    slug: 'sales-development-rep',
    title: 'Sales Development Rep',
    titleDe: 'Sales Development Rep',
    aka: ['SDR', 'BDR', 'sales ops'],
    audience: 'ops_manager',
    summary:
      'An SDR role is about 65-80% automatable. Lead enrichment and routing, follow-up sequences, CRM hygiene and pipeline reporting are highly repeatable and data-driven. Discovery conversations, objection handling and relationship building stay human-led.',
    summaryDe:
      'Die Rolle des Sales Development Rep ist etwa zu 65–80 % automatisierbar. Lead-Anreicherung und -Verteilung, Follow-up-Sequenzen, CRM-Pflege und Pipeline-Reporting sind stark wiederholbar und datengetrieben. Discovery-Gespräche, Einwandbehandlung und Beziehungsaufbau bleiben in menschlicher Hand.',
    typicalScore: 76,
    automatableTasks: ['Enriching and routing inbound leads', 'Sending personalized follow-up sequences', 'Keeping CRM records current', 'Generating quotes from a price book', 'Building pipeline and forecast reports'],
    automatableTasksDe: ['Eingehende Leads anreichern und verteilen', 'Personalisierte Follow-up-Sequenzen versenden', 'CRM-Daten aktuell halten', 'Angebote aus einer Preisliste erstellen', 'Pipeline- und Forecast-Berichte erstellen'],
    humanTasks: ['Discovery and qualification calls', 'Objection handling and negotiation', 'Building prospect relationships'],
    humanTasksDe: ['Discovery- und Qualifizierungsgespräche', 'Einwandbehandlung und Verhandlung', 'Beziehungen zu Interessenten aufbauen'],
    sampleCode: '4696b7',
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    titleDe: 'Datenanalyst',
    aka: ['business analyst', 'BI analyst'],
    audience: 'developer',
    summary:
      'A data analyst role is roughly 55-70% automatable. Data cleaning, routine dashboard refreshes, standard reporting and first-pass exploratory analysis can be automated. Framing the right questions, interpreting results in business context and influencing decisions remain human strengths.',
    summaryDe:
      'Die Rolle des Datenanalysten ist etwa zu 55–70 % automatisierbar. Datenbereinigung, Routine-Aktualisierungen von Dashboards, Standard-Reporting und erste explorative Analysen lassen sich automatisieren. Die richtigen Fragen zu formulieren, Ergebnisse im Geschäftskontext zu deuten und Entscheidungen zu beeinflussen bleiben menschliche Stärken.',
    typicalScore: 62,
    automatableTasks: ['Cleaning and preparing datasets', 'Refreshing routine dashboards', 'Generating standard reports', 'First-pass exploratory analysis', 'Writing recurring SQL queries'],
    automatableTasksDe: ['Datensätze bereinigen und aufbereiten', 'Routine-Dashboards aktualisieren', 'Standardberichte erstellen', 'Erste explorative Analysen', 'Wiederkehrende SQL-Abfragen schreiben'],
    humanTasks: ['Framing the right business questions', 'Interpreting results in context', 'Influencing decisions with stakeholders'],
    humanTasksDe: ['Die richtigen geschäftlichen Fragen formulieren', 'Ergebnisse im Kontext interpretieren', 'Entscheidungen mit Stakeholdern beeinflussen'],
    sampleCode: '0234ac',
  },
  {
    slug: 'executive-assistant',
    title: 'Executive Assistant',
    titleDe: 'Assistenz der Geschäftsführung',
    aka: ['personal assistant', 'admin assistant'],
    audience: 'ops_manager',
    summary:
      'An executive assistant role is around 55-70% automatable. Calendar scheduling, inbox triage, travel booking and meeting-note summaries are increasingly automatable with AI agents. Discretion, relationship management and judgement on shifting priorities keep a human essential.',
    summaryDe:
      'Die Rolle der Assistenz der Geschäftsführung ist etwa zu 55–70 % automatisierbar. Terminplanung, Postfach-Triage, Reisebuchungen und Zusammenfassungen von Besprechungsnotizen lassen sich mit KI-Agenten zunehmend automatisieren. Diskretion, Beziehungspflege und das Urteil bei wechselnden Prioritäten machen einen Menschen weiterhin unverzichtbar.',
    typicalScore: 60,
    automatableTasks: ['Scheduling and rescheduling meetings', 'Triaging and drafting email replies', 'Booking travel and logistics', 'Summarizing meeting notes and actions', 'Preparing routine documents'],
    automatableTasksDe: ['Termine planen und verschieben', 'E-Mail-Antworten triagieren und entwerfen', 'Reisen und Logistik buchen', 'Besprechungsnotizen und Aufgaben zusammenfassen', 'Routine-Dokumente vorbereiten'],
    humanTasks: ['Discretion on sensitive matters', 'Managing relationships and gatekeeping', 'Judgement on shifting priorities'],
    humanTasksDe: ['Diskretion bei sensiblen Themen', 'Beziehungen pflegen und den Zugang steuern', 'Urteil bei wechselnden Prioritäten'],
  },
  {
    slug: 'content-writer',
    title: 'Content Writer',
    titleDe: 'Content-Autor',
    aka: ['copywriter', 'content marketer'],
    audience: 'founder',
    summary:
      'A content writer role is roughly 50-65% automatable. AI drafts, outlines, repurposes and optimizes copy at speed, and handles SEO briefs well. Original angles, brand voice, fact-checking and editorial judgement are where human writers now add the most value.',
    summaryDe:
      'Die Rolle des Content-Autors ist etwa zu 50–65 % automatisierbar. KI entwirft, gliedert, verwertet und optimiert Texte in hohem Tempo und bewältigt SEO-Briefings gut. Originelle Blickwinkel, Markenstimme, Faktenprüfung und redaktionelles Urteil sind heute die Bereiche, in denen menschliche Autoren den größten Mehrwert schaffen.',
    typicalScore: 58,
    automatableTasks: ['Drafting first-pass copy and outlines', 'Repurposing content across formats', 'Writing SEO briefs and meta copy', 'Editing for grammar and consistency', 'Generating variations for testing'],
    automatableTasksDe: ['Erste Textentwürfe und Gliederungen erstellen', 'Content für verschiedene Formate aufbereiten', 'SEO-Briefings und Meta-Texte schreiben', 'Auf Grammatik und Konsistenz redigieren', 'Varianten zum Testen erstellen'],
    humanTasks: ['Original angles and narrative', 'Brand voice and editorial taste', 'Fact-checking and accountability'],
    humanTasksDe: ['Originelle Blickwinkel und Erzählweise', 'Markenstimme und redaktionelles Gespür', 'Faktenprüfung und Verantwortung'],
    sampleCode: 'e07429',
  },
  {
    slug: 'operations-manager',
    title: 'Operations Manager',
    titleDe: 'Operations Manager',
    aka: ['ops manager', 'head of operations'],
    audience: 'ops_manager',
    summary:
      'An operations manager role is around 45-60% automatable. Reporting, scheduling, process documentation and routine vendor coordination can be automated, while cross-team decisions, exception handling and people leadership remain firmly human.',
    summaryDe:
      'Die Rolle des Operations Managers ist etwa zu 45–60 % automatisierbar. Reporting, Planung, Prozessdokumentation und die routinemäßige Abstimmung mit Lieferanten lassen sich automatisieren, während teamübergreifende Entscheidungen, das Handhaben von Ausnahmen und Mitarbeiterführung klar in menschlicher Hand bleiben.',
    typicalScore: 52,
    automatableTasks: ['Compiling operational reports', 'Scheduling and resource coordination', 'Documenting and mapping processes', 'Routine vendor and supplier comms', 'Tracking KPIs and flagging anomalies'],
    automatableTasksDe: ['Betriebsberichte zusammenstellen', 'Planung und Ressourcenkoordination', 'Prozesse dokumentieren und abbilden', 'Routinekommunikation mit Lieferanten', 'KPIs verfolgen und Auffälligkeiten melden'],
    humanTasks: ['Cross-team prioritization and trade-offs', 'Exception and crisis handling', 'Leading and developing people'],
    humanTasksDe: ['Teamübergreifende Priorisierung und Abwägungen', 'Ausnahmen und Krisen bewältigen', 'Menschen führen und entwickeln'],
    sampleCode: 'bf3dcd',
  },
  {
    slug: 'paralegal',
    title: 'Paralegal',
    titleDe: 'Rechtsassistent',
    aka: ['legal assistant'],
    audience: 'ops_manager',
    summary:
      'A paralegal role is roughly 50-65% automatable. Document review, contract data extraction, legal research and standard drafting are increasingly AI-assisted. Legal judgement, client interaction and anything requiring accountability stay with qualified humans.',
    summaryDe:
      'Die Rolle des Rechtsassistenten ist etwa zu 50–65 % automatisierbar. Dokumentenprüfung, die Extraktion von Vertragsdaten, juristische Recherche und Standardentwürfe werden zunehmend KI-gestützt. Juristisches Urteil, der Kontakt mit Mandanten und alles, was Verantwortung erfordert, bleiben bei qualifizierten Menschen.',
    typicalScore: 58,
    automatableTasks: ['Reviewing and summarizing documents', 'Extracting data from contracts', 'First-pass legal research', 'Drafting standard clauses and letters', 'Organizing case files and deadlines'],
    automatableTasksDe: ['Dokumente prüfen und zusammenfassen', 'Daten aus Verträgen extrahieren', 'Erste juristische Recherche', 'Standardklauseln und -schreiben entwerfen', 'Akten und Fristen organisieren'],
    humanTasks: ['Legal judgement and interpretation', 'Client interaction and advice', 'Accountability and sign-off'],
    humanTasksDe: ['Juristisches Urteil und Auslegung', 'Mandantenkontakt und Beratung', 'Verantwortung und Freigabe'],
    sampleCode: '358522',
  },
]

export function roleHref(r: Role): string {
  return `/automatable/${r.slug}`
}

// Locale-aware getters — English is the default/SEO surface; German powers the
// client toggle. Server render + metadata + JSON-LD always use the EN fields.
export const rTitle = (r: Role, l: Locale): string => (l === 'de' ? r.titleDe : r.title)
export const rSummary = (r: Role, l: Locale): string => (l === 'de' ? r.summaryDe : r.summary)
export const rAutoTasks = (r: Role, l: Locale): string[] => (l === 'de' ? r.automatableTasksDe : r.automatableTasks)
export const rHumanTasks = (r: Role, l: Locale): string[] => (l === 'de' ? r.humanTasksDe : r.humanTasks)
