<div align="center">

<img src="pics/WorkScanAILogo.png" alt="WorkScanAI Logo" width="270" />

# WorkScanAI

**AI-Powered Workflow Analysis for the Age of Automation**

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Claude AI](https://img.shields.io/badge/Claude-Anthropic-cc785c)](https://www.anthropic.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

*Submit your team's workflow → get a ranked automation plan with real ROI numbers in under 5 minutes.*

</div>

---

## Screenshots

| Landing Page | Workflow Input (Text, Voice, Document) |
|:---:|:---:|
| ![Landing Page](pics/Screenshot1.jpg) | ![Input Methods](pics/Screenshot2.jpg) |
| **Analysis Results & ROI** | **Implementation Roadmap** |
| ![Analysis Results](pics/Screenshot3.jpg) | ![Roadmap](pics/Screenshot4.jpg) |

---

## The Problem

Companies are racing to adopt AI but most have no systematic way to answer the most important question:

> *Which of our tasks can be automated today, and what is the actual ROI?*

WorkScanAI answers that in minutes, not months.

---

## The Solution

Submit your team's tasks via **voice recording**, **document upload**, or **manual entry**.  
Receive a scored automation assessment, a concrete ROI projection, and a phased implementation roadmap — then export it as a polished DOCX or PDF report.


### Key Features

| Feature | Description |
|---|---|
| 🎙️ **Voice Input** | Record tasks verbally — Web Speech API transcribes in real time, AI structures the results |
| 📄 **Document Upload** | Parse PDFs, Word docs, and text files to extract task lists automatically |
| ✍️ **Manual Entry** | Type tasks directly with dynamic add/remove controls |
| 🤖 **AI-Readiness Scoring** | 0–100% score per task based on automation potential |
| 💰 **ROI Calculator** | Annual savings (€), hours reclaimed per year, and payback period |
| 🗺️ **Implementation Roadmap** | Phased plan: quick wins (0–3 mo) → medium-term (3–6 mo) → long-term (6–12 mo) |
| 📊 **Visual Dashboard** | All your analyses in one place with aggregate stats and shareable links |
| 📥 **Export Reports** | Download full Apple-style reports as DOCX or PDF with 2-option recommendations per task |
| 🔗 **Share Results** | Native share sheet (mobile) with clipboard fallback |
| 🌐 **Deployed** | Live on Vercel (frontend + Python serverless) + Supabase (managed PostgreSQL) |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | App Router, SSR, client components |
| **Backend** | Python 3.11, FastAPI, Mangum | REST API, serverless adapter for Vercel |
| **AI / LLM** | Claude API — `claude-sonnet-4-20250514` | Task extraction, scoring, 2-option recommendations |
| **Database** | SQLite (local dev) → PostgreSQL via Supabase (production) | Workflow and results persistence |
| **Reports** | ReportLab (PDF), python-docx (DOCX) | Apple-style formatted export reports |
| **Deployment** | Vercel (frontend + Python functions) + Supabase | Zero-cold-start serverless; managed DB |
| **Local Dev** | Docker, Docker Compose | Multi-service local stack (frontend + backend + PostgreSQL) |

### Architecture Notes

- **Unified Vercel deployment** — `vercel.json` routes `/api/*` to the Python serverless function (FastAPI via Mangum adapter); everything else goes to Next.js. No separate backend host needed.
- **`NEXT_PUBLIC_API_URL` set to empty string** on Vercel so all frontend API calls use relative paths on the same domain.
- **SQLite must live outside the project directory** in local dev — storing it inside triggers Next.js / Turbopack file-watcher rebuilds on every DB write, causing infinite rebuild loops. Fixed by using an absolute path (`sqlite:///C:/Users/.../workscan.db`).
- **React StrictMode disabled in dev** (`next.config.ts`) — double-mounting in StrictMode resets `useRef` guards and causes duplicate API calls / blinking UI.
- **Voice input uses Web Speech API** (not MediaRecorder + `/api/transcribe`) — browser-native, no server round-trip needed.


---

## Development Roadmap

### ✅ Phase 1 — Foundation (Complete)
- FastAPI backend with SQLite (dev) and full REST API (`/api/workflows`, `/api/analyze`, `/api/results`, `/api/reports`)
- AI analysis engine: task scoring (0–100%), ROI calculation, difficulty estimation, 2-option tool recommendations
- Document upload and parsing (PDF, DOCX, TXT, images via Claude Vision OCR)
- Voice-to-text task extraction via Web Speech API with real-time transcription feedback
- Next.js 14 frontend with App Router, TypeScript, Tailwind CSS
- Dashboard, analyze/landing page, results `[id]` page, roadmap page
- DB schema: `workflows`, `tasks`, `analysis_results` tables with `source_text` and `input_mode` columns

### ✅ Phase 2 — Frontend Polish (Complete)
- Apple-inspired design system throughout (clean cards, blue accent `#0071e3`, smooth hover states)
- Landing page hero banner with real `<img>` tag + 30% dark overlay, gradient Analyze section, mouse-tracking radial spotlight effect
- Voice mic button — proper `<button>` element with click handler, pulse animation while recording
- Navigation: "Past Analyses" and "New Analysis" links; analysis form lives only on the landing page
- Automation scores displayed as percentages (`72%`) consistently across all pages, dashboard stats, and reports
- Export to DOCX and PDF — Apple-style multi-page reports with cover page, task breakdown, roadmap, conclusion
- Report recommendation section: "Recommendation" label on its own line (bold blue), Option 1 and Option 2 each on separate lines
- All monetary values display as `€` (euro sign) throughout UI and both report formats
- Share Results button — native Web Share API with clipboard fallback
- Global 404 page + analysis-specific `not-found.tsx`
- Demo seed data (3 pre-analysed industry workflows): Marketing, Customer Support, Finance & Accounting
- Favicon, app icons (iOS + Android), Open Graph metadata

### ✅ Phase 3 — Docker & Production (Complete)
- Multi-service Docker Compose: Next.js frontend + FastAPI backend + PostgreSQL
- Migrated from SQLite to PostgreSQL (production via Supabase, local via Docker)
- DB migration for `source_text` (TEXT) and `input_mode` (VARCHAR 50) columns added to `workflows` table
- Deployed to **Vercel** (frontend + Python serverless via Mangum) + **Supabase** (managed PostgreSQL)
- `vercel.json` routes: `/api/*` → Python function, everything else → Next.js
- CI/CD: GitHub Actions pipeline

### 📅 Phase 4 — Intelligence Layer (Planned)
- LangChain chains for multi-step agentic analysis
- Tool recommendation engine (Zapier, Make.com, UiPath, n8n) with a structured database
- Industry benchmarking — compare against sector averages
- Risk assessment for compliance-sensitive tasks
- Streaming analysis with live progress bar
- Recharts visualisations: donut score chart, effort/impact priority matrix
- User authentication — persistent accounts per user


---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An Anthropic API key — [get one here](https://console.anthropic.com/)
- Docker Desktop *(for local full-stack dev)*

### Manual Setup (Recommended for Development)

**1. Clone**
```bash
git clone https://github.com/ibxibx/workscanai.git
cd workscanai
```

**2. Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

Create `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///C:/absolute/path/to/workscan.db
# ⚠️  Use an absolute path OUTSIDE the project directory to avoid
#     triggering Next.js file-watcher rebuilds on every DB write.
```

```bash
uvicorn app.main:app --reload --port 8000
```

**3. Frontend**
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev   # runs on http://localhost:3001 if 3000 is taken
```

**4. Open**
- App: http://localhost:3000 (or 3001)
- API docs: http://localhost:8000/docs

### Load Demo Data

Seed 3 pre-analyzed industry workflows so the dashboard isn't empty:

```bash
cd backend
python seed_demo.py
```

Creates and fully analyses: **Marketing Operations**, **Customer Support**, **Finance & Accounting**.

---

## Docker (Local Full-Stack)

Run the complete stack — Next.js, FastAPI, PostgreSQL — with one command:

```bash
docker compose up --build
```

Three containers spin up and network automatically. No manual environment setup.

> **Note:** Changes to `next.config.ts` require a full container rebuild (no hot-reload for config). Backend-only Python file changes can be hot-patched with `docker cp` + `docker restart workscanai-backend`.

### Useful Docker commands

```bash
# View logs
docker logs workscanai-backend --tail 30
docker logs workscanai-frontend --tail 30

# Hot-patch a backend file without full rebuild
docker cp backend/app/services/report_generator.py workscanai-backend:/app/app/services/report_generator.py
docker restart workscanai-backend

# Rebuild only frontend
docker compose build frontend && docker compose up -d frontend
```

---

## Vercel + Supabase Deployment

The production app runs as a **unified Vercel deployment** — no separate backend server.

```
vercel.json routing:
  /api/*   →  Python serverless function (FastAPI + Mangum adapter)
  /*       →  Next.js (App Router)
```

### Environment variables (set in Vercel dashboard)

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
NEXT_PUBLIC_API_URL=          # intentionally empty — uses relative paths on same domain
```

### Deploy

```bash
vercel --prod
```


---

## Example Output

**Input:** Marketing team — social posts, scheduling, engagement, reports, research

| Task | AI Score | Time Saved | Difficulty |
|---|---|---|---|
| Schedule posts | 92% | 90% | Easy |
| Generate reports | 88% | 85% | Easy |
| Write posts | 72% | 60% | Medium |
| Research topics | 65% | 50% | Medium |
| Respond to comments | 55% | 40% | Medium |

**Quick wins:** Schedule posts → Zapier/Buffer (90% automated) · Reports → Python script (95% automated)  
**Human-in-loop:** Comment responses → AI draft + human review (50% time saved) · Research → AI suggestions + human curation (40% saved)

**Result → Automation score 74% · €28,000/yr saved · 436 hours reclaimed**

Each task recommendation now includes **two distinct approaches**, for example:

> **Option 1 — Buffer or Hootsuite:** Connect all social accounts and batch-schedule a full week of posts in one 15-minute session, eliminating daily manual posting.  
> **Option 2 — Zapier + Google Sheets:** Build a no-code workflow that reads from a shared content calendar and auto-publishes at set times, ideal for teams already using Sheets.

---

## Project Structure

```
workscanai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/          # workflows.py, analysis.py, results.py, reports.py
│   │   ├── core/                # config.py, database.py
│   │   ├── models/              # SQLAlchemy ORM (workflow, task, analysis_result)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/
│   │       ├── ai_analyzer.py   # Claude API calls, 2-option recommendation prompt
│   │       ├── roi_calculator.py
│   │       └── report_generator.py  # ReportLab PDF + python-docx DOCX generation
│   ├── seed_demo.py             # Seeds 3 demo workflows with full AI analysis
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx         # Dashboard — all analyses, aggregate stats
│   │   │   └── results/[id]/
│   │   │       ├── page.tsx     # Results detail — scores, ROI, recommendations
│   │   │       └── roadmap/
│   │   │           └── page.tsx # Implementation roadmap — phased plan
│   │   ├── not-found.tsx        # Global 404 page
│   │   ├── favicon.ico
│   │   ├── icon.png             # 192×192 PWA icon
│   │   ├── apple-icon.png       # 180×180 iOS icon
│   │   └── page.tsx             # Landing page + workflow input form
│   ├── src/components/
│   │   └── WorkflowForm.tsx     # Voice recording, document upload, manual entry
│   ├── next.config.ts           # StrictMode disabled, standalone output
│   └── Dockerfile
├── api/
│   └── index.py                 # Mangum adapter — FastAPI as Vercel serverless function
├── pics/                        # Screenshots and logo for README
├── vercel.json                  # Routing: /api/* → Python, /* → Next.js
├── render.yaml                  # Render.com deployment config (alternative)
└── docker-compose.yml           # Local full-stack: frontend + backend + PostgreSQL
```


---

## Key Engineering Lessons

Hard-won insights from building this project — useful for anyone tackling a similar stack.

| Problem | Root Cause | Fix |
|---|---|---|
| Infinite Turbopack rebuild loops | SQLite DB inside the project dir — every DB write triggers Next.js file watcher | Move DB to an absolute path outside the project |
| Duplicate API calls / blinking UI | React StrictMode double-mounts components in dev, resetting `useRef` guards | Disable StrictMode in `next.config.ts` during development |
| Voice mic button not clickable | Icon wrapped in `<div>` instead of `<button>` — no keyboard/pointer events | Replace `div` with `<button onClick={...}>` |
| DOCX download crash | `add_section_heading()` called with unexpected kwargs (`size`, `color`) | Remove kwargs from that call; use `add_run` directly |
| "Recommendation" word wrapping in PDF | Label column too narrow (32 mm) for a 14-character word at 11 pt | Widen label column to 42 mm |
| DB missing columns on first run | `source_text` and `input_mode` added to the ORM model but never migrated | Run `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS ...` |
| Frontend can't reach backend on Vercel | `NEXT_PUBLIC_API_URL` pointed to `localhost` | Set to empty string; use relative `/api/...` paths |

---

## What You Learn Building This

| Skill | Where it appears |
|---|---|
| **Next.js 14 App Router** | File-based routing, layouts, dynamic `[id]` routes, `not-found.tsx` |
| **Server vs Client Components** | Dashboard (server fetch) vs WorkflowForm (client state + Web Speech API) |
| **Server Actions** | Form submissions and mutations without separate API routes |
| **Route Handlers** | `/api/workflows/route.ts` proxying requests to FastAPI |
| **Loading & Error States** | `loading.tsx` skeleton screens, `error.tsx` boundaries |
| **TypeScript** | Interfaces, generics, strict typing across the full stack |
| **FastAPI + SQLAlchemy** | REST API design, ORM models, relationship loading |
| **Claude API / Prompt Engineering** | Structured output, multi-option recommendations, vision OCR |
| **ReportLab + python-docx** | Programmatic PDF and DOCX generation with Apple-style layouts |
| **Docker + Compose** | Multi-service containerisation, networking, env vars, volumes |
| **Vercel Serverless** | Deploying FastAPI as a Python serverless function via Mangum |
| **Supabase / PostgreSQL** | Managed DB, connection pooling, production migrations |
| **GitHub Actions CI/CD** | Automated lint, test, build and deploy on every push |
| **Web Speech API** | Browser-native voice transcription without a server |

### Next.js Learning Resources

- **Official Docs:** https://nextjs.org/docs
- **App Router Tutorial:** https://nextjs.org/learn
- **Server Actions Guide:** https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- **Deployment:** https://nextjs.org/docs/app/building-your-application/deploying

---

## Contributing

Contributions welcome — open an issue first to discuss.

**Enhancement ideas:**
- Recharts visualisations — donut score chart, effort/impact priority matrix
- User authentication — accounts so analyses persist per user
- Industry benchmark data — compare workflows against sector averages
- LangChain multi-step chains replacing single-prompt analysis
- Streaming analysis with live progress updates (Server-Sent Events)
- Integration with Jira / Asana — import tasks directly from project management tools
- Real-time collaboration via WebSockets — teams analyse workflows together
- React Native mobile app — share components with the web version
- Chrome extension — capture repetitive tasks directly from any web app
- Industry-specific workflow templates — pre-filled starting points
- Playwright E2E tests — automated coverage of critical user journeys

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [Ian Baumeister](https://ianworks.dev) &nbsp;·&nbsp; [LinkedIn](https://linkedin.com/in/avoiann) &nbsp;·&nbsp; [GitHub](https://github.com/ibxibx)

**⭐ Star this repo if you find it useful!**

</div>
