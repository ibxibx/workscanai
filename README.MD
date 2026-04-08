<div align="center">

<img src="pics/WorkScanAILogo.png" alt="WorkScanAI Logo" width="270" />

# WorkScanAI

**AI-Powered Workflow Analysis for the Age of Automation**

[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Claude AI](https://img.shields.io/badge/Claude-Anthropic-cc785c)](https://www.anthropic.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

*Submit your team's workflow → get a ranked automation plan with real ROI numbers in under 5 minutes.*

🌐 **Live:** [workscanai.vercel.app](https://workscanai.vercel.app) &nbsp;·&nbsp; **Repo:** [github.com/ibxibx/workscanai](https://github.com/ibxibx/workscanai)

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

An Oxford-educated mathematician who built AI models downloaded by 300 million people says: within 900 days, any job you can do on a screen will be automatable for €1,000/year.

Companies face a critical question:

> *Which of our tasks can be automated today, and what is the actual ROI?*

Most organisations have no systematic way to answer this. WorkScanAI answers it in minutes, not months — and tells you exactly where each task sits on the automation countdown.

---

## The Solution

Submit your team's tasks via **voice recording**, **document upload**, or **manual entry**.
Receive a scored automation assessment, concrete ROI projection, phased implementation roadmap, and a decision-layer breakdown distinguishing what AI can automate from what requires irreplaceable human judgment — then export it as a polished DOCX or PDF report.

---

## Key Features

| Feature | Description |
|---|---|
| 🎙️ **Voice Input** | Record tasks verbally — Web Speech API transcribes in real time |
| 📄 **Document Upload** | Parse PDFs, Word, Excel, PowerPoint, images (20+ formats) via Claude Vision OCR |
| ✍️ **Manual Entry** | Type tasks directly with dynamic add/remove controls |
| 🔍 **Job Scanner** | Enter a job title — Tavily web-searches the role, Claude extracts tasks and context automatically |
| ⚙️ **n8n Workflow Download** | Every Job Scanner result includes a ready-to-import n8n canvas — one column per task, real trigger→process→output chains, downloadable as JSON |
| 👤 **3 Analysis Contexts** | Individual (career survival), Team/Startup (velocity), Company/Dept (strategic ROI) |
| 🤖 **AI-Readiness Scoring** | 0–100% composite score per task: Repeatability, Data Access, Error Tolerance, Integration |
| 🧩 **Decision Layer Analysis** | Explicitly flags tasks requiring human judgment vs fully automatable — no oversimplification |
| ⚡ **900-Day Countdown Clock** | Per-task urgency: Automate NOW / 12–24 mo / 24–48 mo / Safe 48+ months |
| 🧠 **Human Edge Score** | Per-task irreplaceability score — what AI cannot replace |
| 💰 **ROI Calculator** | Annual savings (€), hours reclaimed/yr, FTE equivalent, payback period |
| 🗺️ **Implementation Roadmap** | Phased plan: quick wins → medium-term → strategic (3 phases with milestones) |
| 🤖 **Agentification Roadmap** | Phase 1: Human-in-Loop → Phase 2: Supervised → Phase 3: Full Delegation per task |
| ⚙️ **Orchestration Blueprint** | Multi-agent pipeline description per automatable task |
| 🛡️ **Risk & Compliance Flags** | Flags tasks with PII, financial, legal, or compliance concerns |
| 🎯 **Career Pivot Plan** | Skills to develop + adjacent lower-risk roles (Individual context) |
| 🚀 **90-Day Sprint Plan** | Highest-ROI quick wins prioritised for first sprint (Team context) |
| 📊 **Board-Ready Summary** | Copy-paste executive memo with savings, FTE, and 90-day recommendation (Company context) |
| 🏆 **Industry Benchmark** | Your score vs sector average (58%) vs AI-first top 10% (81%) |
| 🏢 **AI-First Competitor Gap** | Cost of inaction — what a competitor gains if they move first |
| 👥 **Headcount Signal** | FTE equivalent freed, redeployment recommendation |
| 📥 **Export Reports** | Full PDF + DOCX with all sections — complete parity with the web dashboard |
| 🔗 **Shareable Reports** | Public `/report/{code}` URL with auto-generated OG image for LinkedIn sharing |
| 📊 **Visual Dashboard** | All analyses with aggregate stats, euro savings, combined report download |
| 🔐 **Magic Link Auth** | Email OTP authentication via 4-digit code — no passwords |
| ⚡ **Rate Limiting** | 5 analyses per 24 hours per email (configurable) |
| 🛠️ **Admin Dashboard** | `/admin` — usage stats, all submissions, result links, user table |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | App Router, SSR, client components |
| **Backend** | Python 3.11, FastAPI | REST API, AI orchestration |
| **AI / LLM** | Anthropic Claude — `claude-haiku-4-5` (analysis), `claude-sonnet-4` (extraction) | Batched task scoring, structured extraction, Vision OCR |
| **Database** | Turso (libSQL cloud SQLite) | Persistent cloud SQLite — survives Render redeploys, free forever |
| **Auth** | Resend (transactional email) + custom OTP | Magic link / 4-digit OTP email flow |
| **Reports** | ReportLab (PDF), python-docx (DOCX) | Full-featured export with all analysis sections |
| **Deployment** | Vercel (Next.js frontend) + Render (FastAPI backend) | Frontend on Vercel, long-running backend on Render |
| **OG Images** | Next.js `ImageResponse` (edge runtime) | Auto-generated share cards per report |

### Architecture

```
Browser
  │
  ├── /api/*  →  Next.js proxy route  →  Render FastAPI backend
  │                                        (workscanai.onrender.com)
  │
  ├── /dashboard, /report/*  →  Next.js (Vercel)
  │
  └── Long-running calls (>10s) bypass Vercel proxy entirely:
       POST /api/analyze       →  direct to Render (25–31s)
       POST /api/parse-tasks   →  direct to Render (15–27s)
       POST /api/extract-tasks →  direct to Render (variable)
```

**Why this split:** Vercel serverless functions have a 10-second hard limit on the Hobby tier. The AI analysis endpoint takes 25–31 seconds for 6+ tasks. Those three routes call Render directly from the browser to bypass the Vercel timeout — all other endpoints go through the Next.js proxy as normal.

---

## Analysis Intelligence

### Scoring System (F1)
Each task is scored across four dimensions, combined into a composite score:

| Sub-score | Weight | What it measures |
|---|---|---|
| **Repeatability** | 30% | How rule-based and consistent the task is |
| **Data Availability** | 30% | Whether inputs are structured and accessible |
| **Error Tolerance** | 20% | Cost of AI mistakes — **deliberately low (25–55) for strategic tasks** |
| **Integration** | 20% | How easily automation plugs into existing tools |

### Decision Layer Analysis
Inspired by feedback from a product manager at n8n, the analysis explicitly separates:

- **`none`** — Fully automatable. AI handles it end-to-end.
- **`partial`** — AI handles data prep and surfaces options; human makes the final call.
- **`full`** — Human judgment required throughout. Implicit org knowledge, trade-offs, stakeholder politics.

Strategic tasks (backlog prioritisation, stakeholder alignment, product strategy) are scored honestly — they should rarely exceed 70% composite score. The recommendation for these tasks explicitly states *"AI surfaces [X], human decides [Y] given [constraints]"* rather than just listing tools.

### Context-Aware Output
The same task list produces completely different output depending on the analysis context:

| Context | Unique Sections |
|---|---|
| **Individual** | Automation Countdown Clock, Human Edge Score per task, Career Pivot Plan (skills + roles + 90-day plan) |
| **Team / Startup** | Team Velocity Impact, FTE equivalent, Rollout Timeline, 90-Day Sprint Plan |
| **Company / Dept** | AI-First Competitor Gap, Headcount Signal, Industry Benchmark, Board-Ready Executive Summary |

All contexts also receive: Task Breakdown (F1 sub-scores), Risk Flags (F3), AI Readiness Assessment (F4), Agentification Roadmap (F9), Orchestration Blueprint (F13).

### Agentification Phases (F9)
Every task is mapped to an automation maturity phase:

- **Phase 1 — Human-in-Loop:** AI drafts, human reviews and approves
- **Phase 2 — Supervised:** AI handles with periodic human validation
- **Phase 3 — Full Delegation:** Zero manual intervention, fully automated pipeline

---

## Authentication

WorkScanAI uses a **magic link / OTP email flow** — no passwords:

1. User enters their email address
2. A 4-digit OTP is sent via **Resend** transactional email
3. User enters the code in a 4-box OTP input (paste, auto-advance, backspace, auto-submit)
4. Session stored in `localStorage` — persists across tabs and page refreshes

**Rate limiting:** 5 analyses per 24 hours per email. IP-based rate limiting is also available (currently disabled for testing — re-enable in `workflows.py`).

---

## Database: Turso (libSQL)

Production uses **Turso** — a cloud-hosted libSQL (SQLite-compatible) service that:
- Survives Render redeploys (unlike SQLite on-disk which gets wiped)
- Is free forever on the Turso free tier
- Is accessed via a custom Python DBAPI shim (`backend/app/core/turso_dbapi.py`)

The shim translates SQLAlchemy queries into Turso's HTTP pipeline API, handling:
- Transaction buffering (`BEGIN`/`COMMIT` → atomic pipeline batch)
- Float serialisation (must be JSON number, not string)
- Connection pooling and retry logic

**Local development** falls back to SQLite automatically when `DATABASE_URL` starts with `sqlite://`.

---

## Input Modes

### Document Upload (20+ formats)
Supported via `backend/app/api/routes/extraction.py`:

| Category | Formats |
|---|---|
| Text | `.txt`, `.md`, `.rst`, `.rtf`, `.csv`, `.tsv`, `.json`, `.xml`, `.html`, `.yaml`, `.log` |
| Documents | `.pdf`, `.docx`, `.doc`, `.odt` |
| Spreadsheets | `.xlsx`, `.xls`, `.xlsm`, `.ods` |
| Presentations | `.pptx`, `.ppt` |
| Images (OCR) | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tiff`, `.heic`, `.svg`, `.ico` |

Images are processed via Claude Vision API (OCR). All other formats use native Python libraries.

### Job Scanner (Tavily + Claude Pipeline)
Enter any job title and optionally an industry. The two-step pipeline (split to stay within Vercel's 60s limit):

**Step 1 — Research** (`POST /job-scan/research`, ~15–20s):
1. **Tavily Search API** fetches real job posting content for the role from across the web
2. **Claude Haiku** extracts: responsibilities list, required tools/skills, and infers the most likely analysis context (Individual / Team / Company)
3. Returns a structured task list — pre-fills the analysis form, editable before submission

**Step 2 — Analyze + Save** (`POST /job-scan/analyze`, ~30–40s):
1. Runs the full batch AI analysis (same pipeline as the standard workflow analyzer)
2. Generates and persists an **n8n automation canvas** (see below)
3. Saves the workflow to DB, returns `workflow_id` + `share_code` for redirect

Both endpoints share the same 5/24h rate limit (IP + email) as the standard analyzer. Both are called directly from the browser to Render (bypass Vercel proxy — they exceed the 10s serverless limit).

### n8n Workflow Generation

Every Job Scanner result includes a **downloadable n8n workflow JSON** — a single importable canvas covering all extracted tasks.

**Architecture:**
- `N8nTemplateClient` (`backend/app/services/n8n_template_client.py`) builds the canvas from **purpose-built workflow patterns** per task category — not the n8n community search API (confirmed broken: returns the same 10 templates for every query regardless of search terms)
- **40+ task categories** mapped from task descriptions: `reporting`, `scheduling`, `communication`, `data_entry`, `research`, `analysis`, `customer_support`, `sales`, `marketing`, `hr`, `finance`, `devops`, `legal`, `content`, `product`, `seo`, `social_media`, `ecommerce`, `logistics`, `procurement`, `security`, `healthcare_admin`, `investor_relations`, and more
- Claude Haiku curates which patterns are most relevant for the specific job title before building

**Canvas format:**
- One merged `.json` file per scan — directly importable into any n8n instance via **File → Import**
- Full-width header sticky note (colour 7) with job title and generation timestamp
- One column per task (1000px horizontal spacing)
- Per-task coloured sticky note above each column
- Real trigger → process → output node chains (not placeholders)
- Correct n8n node types and `typeVersion` numbers — validated against n8n's schema
- Valid `connections` dict format

**Download:** available as a button on the Job Scanner results page — returns the JSON directly, browser saves as `{job_title}_n8n_workflows.json`.

### LinkedIn Import
Paste a LinkedIn profile or company page URL. Claude Haiku infers the role context from the URL slug + any pasted text. If the user pastes their headline and current position description, the extraction is highly accurate. Without pasted text, a generic professional context is generated with a prompt to add more detail.

---

## Shareable Reports

Every analysis generates a unique 6-character share code (e.g. `/report/4m5gd9`):

- **Public page** — no auth required, full task breakdown visible
- **OG image** — auto-generated 1200×630 PNG at `/report/{code}/opengraph-image` with:
  - Score-coloured background glow (green/amber/red based on automation score)
  - Large automation percentage, annual savings, hours/yr, quick wins count
  - Context badge (Personal / Team / Company)
  - Countdown urgency label ("⚡ Act now — within 12 months")
  - Blue CTA card with `workscanai.vercel.app`
- When pasted to LinkedIn, Twitter, or Slack — the card auto-renders as a rich preview

---

## Export Reports (PDF + DOCX)

Both PDF and DOCX reports have **full parity with the web dashboard**. Every section that appears on the results page also appears in the download.

### PDF Report Structure
1. **Cover** — branding, context label, workflow name, source text, hero KPIs (score, savings, hours, tasks), HIGH/MEDIUM/LOW task counts
2. **AI Readiness Assessment** — overall score + Data Quality, Process Clarity, Tool Maturity, Error Tolerance
3. **Detailed Task Analysis** — all tasks sorted by score, each with: description, frequency, time/task, category, difficulty, annual savings, F1 sub-scores, recommendation (Option 1 + Option 2), risk flag, agentification phase + milestone + pipeline
4. **Implementation Roadmap** — Phase 1/2/3 with task lists and hours saved
5. **Context-specific sections** (Individual / Team / Company — see above)
6. **Conclusion** with 5 actionable next steps

### Task Numbering Fix
Task numbers 10–27 previously rendered vertically ("1" on top of "0"). Fixed by widening the number column to 20mm with font-size 18 — all multi-digit numbers now render correctly on one line.

### Career Pivot Section (Individual)
Always rendered — falls back to sensible default skills (AI prompt engineering, strategic planning, etc.) if the AI didn't return pivot data for a specific analysis.

---

## Admin Dashboard

Available at `/admin` (password-protected via `x-admin-secret` header):

- **Stats** — total users, workflows, analyses, tasks, average automation score
- **Context breakdown** — analyses by Individual / Team / Company
- **Input mode breakdown** — manual / voice / document / LinkedIn
- **User table** — all registered emails with workflow counts
- **All submissions** — every workflow with expandable task names, source text, and direct links:
  - `results ↗` → `/dashboard/results/{id}` (full authenticated results page)
  - `share ↗` → `/report/{share_code}` (public shareable link)

---

## Project Structure

```
workscanai/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── workflows.py      # POST /workflows, POST /analyze, GET /results/{id}
│   │   │   │                     # GET /share/{code}, rate limiting, auth
│   │   │   ├── extraction.py     # POST /parse-tasks, POST /extract-tasks (Job Scanner),
│   │   │                     # POST /extract-linkedin
│   │   └── job_scan.py       # POST /job-scan/research, POST /job-scan/analyze
│   │                         # GET /quota, POST /job-scan/n8n-templates
│   │   │   ├── reports.py        # GET /reports/{id}/pdf, GET /reports/{id}/docx
│   │   │   │                     # POST /reports/combined/{format}
│   │   │   ├── auth.py           # POST /auth/request, POST /auth/verify (OTP flow)
│   │   │   └── admin.py          # GET /admin/stats (password-protected)
│   │   ├── core/
│   │   │   ├── database.py       # SQLAlchemy engine — Turso (prod) or SQLite (dev)
│   │   │   ├── turso_dbapi.py    # Custom Python DBAPI shim for Turso HTTP API
│   │   │   └── security.py       # Rate limiting, reCAPTCHA verification
│   │   ├── models/
│   │   │   └── workflow.py       # ORM: User, MagicToken, Workflow, Task,
│   │   │                         # Analysis, AnalysisResult (inc. decision_layer)
│   │   ├── schemas/
│   │   │   └── workflow.py       # Pydantic schemas — all fields inc. decision_layer
│   │   ├── services/
│   │   │   ├── ai_analyzer.py    # Batched Claude API call — all tasks in ONE request
│   │   │   │                     # Decision-layer scoring rules, strategic task calibration
│   │   │   ├── n8n_template_client.py # Purpose-built n8n canvas per task category
│   │   │   │                          # 40+ categories, merged importable JSON, correct typeVersions
│   │   │   ├── job_scanner.py    # JobScanner service — Tavily search + Claude task extraction
│   │   │   └── report_generator.py # PDF (ReportLab) + DOCX (python-docx) — full parity
│   │   └── main.py               # FastAPI app, CORS (hardcoded Vercel origins), routes
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                        # Landing page + workflow input form
│       │   ├── dashboard/
│       │   │   ├── page.tsx                    # Dashboard — analyses, aggregate stats
│       │   │   └── results/[id]/
│       │   │       ├── page.tsx                # Results — all sections, badges, exports
│       │   │       └── roadmap/page.tsx        # Phased implementation roadmap
│       │   ├── report/[code]/
│       │   │   ├── page.tsx                    # Public share page (no auth)
│       │   │   └── opengraph-image.tsx         # Auto-generated OG card (edge runtime)
│       │   ├── auth/page.tsx                   # Email + 4-digit OTP login
│       │   ├── admin/page.tsx                  # Admin dashboard
│       │   └── api/[...path]/route.ts          # Catch-all Vercel proxy → Render
│       ├── components/
│       │   └── WorkflowForm.tsx                # All input modes + context selector
│       │                                       # Job Scanner tab: URL input → Tavily fetch → Claude extract
│       └── lib/
│           └── auth.ts                         # useAuth hook — email from localStorage
│
├── vercel.json                  # Cron: keep-alive ping to Render every 5 days
├── render.yaml                  # Render deployment config
└── docker-compose.yml           # Local full-stack dev
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Resend API key](https://resend.com/) for email OTP
- A [Turso](https://turso.tech/) database (free tier) — or skip and use local SQLite

### Backend Setup

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
RESEND_API_KEY=re_...
ADMIN_SECRET=your-admin-password

# Production (Turso):
DATABASE_URL=libsql://your-db.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=eyJ...

# Local dev (SQLite — falls back automatically):
DATABASE_URL=sqlite:///C:/absolute/path/outside/project/workscan.db
# ⚠️ Path must be OUTSIDE the project directory — SQLite inside triggers
#    Next.js/Turbopack infinite rebuild loops on every DB write.

CORS_ORIGINS=http://localhost:3000,https://yourapp.vercel.app
```

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
# On Vercel, set this to: https://workscanai.onrender.com
```

```bash
npm run dev   # http://localhost:3000
```

---

## Deployment

### Render (Backend)
The FastAPI backend runs as a **web service** on Render:

1. Connect the GitHub repo, root directory `backend`
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment variables** — set via the Render dashboard or API:
```
ANTHROPIC_API_KEY, RESEND_API_KEY, ADMIN_SECRET,
DATABASE_URL, TURSO_AUTH_TOKEN, CORS_ORIGINS
```

> ⚠️ Never use the Render dashboard's "Environment" editor to save vars — it replaces ALL vars on each save. Use the Render REST API (`PUT /v1/services/{id}/env-vars`) instead.

**Free tier keep-alive:** `vercel.json` includes a cron job that pings `GET /api/keep-alive` every 5 days at 9am UTC to prevent Render from spinning down the service.

### Vercel (Frontend)

1. Import the GitHub repo
2. **Root directory:** leave blank (not `frontend`) so `vercel.json` is respected
3. **Build command:** `cd frontend && npm install && npm run build`
4. **Output directory:** `frontend/.next`

**Environment variables on Vercel:**
```
NEXT_PUBLIC_BACKEND_URL=https://your-render-service.onrender.com
```

### Long-Running Endpoint Workaround
Three endpoints bypass the Vercel proxy because they exceed the 10s serverless limit:

| Endpoint | Typical duration | Strategy |
|---|---|---|
| `POST /api/analyze` | 25–31s | Called directly from browser to Render |
| `POST /api/parse-tasks` | 15–27s | Called directly from browser to Render |
| `POST /api/job-scan/research` | 15–20s | Called directly from browser to Render |
| `POST /api/job-scan/analyze` | 30–40s | Called directly from browser to Render |
| `POST /api/extract-tasks` | variable (doc upload) | Called directly from browser to Render |

This is handled in `WorkflowForm.tsx` using `NEXT_PUBLIC_BACKEND_URL`.

---

## Key Engineering Lessons

Hard-won insights from building this project.

| Problem | Root Cause | Fix |
|---|---|---|
| Infinite Turbopack rebuild loops | SQLite DB inside the project dir — every DB write triggers Next.js file watcher | Move DB to an absolute path outside the project |
| `Unexpected token 'I', "Internal S"...` — JSON crash | Frontend called `.json()` on plain-text error responses | `safeJson()` helper reads as text first, tries JSON.parse, falls back to `{detail: rawText}` |
| POST requests returning 503 `TypeError: fetch failed` | Vercel proxy forwarded original `content-length` header which didn't match re-buffered body | Strip `content-length` / `accept-encoding` from forwarded headers; recompute from actual buffer |
| Turso `400 Bad Request` on INSERT | SQLAlchemy wraps writes in `BEGIN…COMMIT`; old shim sent bare `COMMIT` → Turso 400 | Full transaction buffering in `turso_dbapi.py` — queue statements, flush as atomic pipeline batch |
| Turso float serialisation error | `_to_args()` encoded floats as `{"type":"float","value":"73.9"}` — Turso requires JSON number | `"value": float(v)` not `str(v)` |
| 504 on `/api/analyze` | Vercel Hobby tier hard-kills at 10s regardless of `maxDuration` — analysis takes 25–31s | Call Render directly from browser, bypass Vercel proxy entirely |
| CORS 405 on OPTIONS preflight | FastAPI CORS middleware wasn't handling OPTIONS before routing | Explicit `@app.options("/{rest_of_path:path}")` handler + hardcode Vercel origins |
| Task numbers 10–27 display vertically in PDF | Number column was 14mm wide — too narrow for two digits at font-size 22 | Widen number column to 20mm, reduce font to 18 |
| Career Pivot section missing from PDF | Section was wrapped in `if pivot_tasks:` — silently skipped when AI returned no pivot data | Always render section with fallback default skills |
| React StrictMode double API calls | StrictMode double-mounts components in dev, resetting `useRef` guards | Disable StrictMode in `next.config.ts` during development |
| Render env vars silently wiped | Render dashboard "Save" replaces ALL vars atomically | Use Render REST API (`PUT /v1/services/{id}/env-vars`) for any env var changes |
| Vercel `vercel.json` ignored | Root directory was set to `frontend` in Vercel dashboard | Clear root directory; set explicit build commands |

---

## What's Built — Feature Inventory

### Analysis Engine
- **Batched Claude API call** — all tasks analyzed in ONE API request (was N sequential calls, caused timeouts on Render free tier)
- **McKinsey-grade scoring** — 4 sub-scores weighted into composite, with explicit calibration rules for strategic vs data-processing tasks
- **Decision Layer field** (`none` / `partial` / `full`) — distinguishes fully automatable from human-judgment-required tasks
- **900-day countdown** per task — based on Mostaque's prediction framework
- **Human Edge Score** per task — irreplaceability as a percentage
- **Career Pivot Plan** — skills to develop + adjacent roles with automation risk scores (Individual context)
- **Agentification phases** — Phase 1/2/3 per task with concrete milestones
- **Orchestration blueprints** — multi-agent pipeline descriptions for automatable tasks
- **Risk flags** — PII, financial, legal, compliance concerns per task
- **AI Readiness Assessment** — org-level readiness across 4 dimensions
- **n8n canvas generation** — `N8nTemplateClient` builds one merged importable canvas per Job Scanner result: purpose-built workflow JSON for 40+ task categories (no broken community API dependency), one column per task, real trigger→process→output chains, correct node `typeVersion` numbers, downloadable as `.json`

### Frontend
- **Apple-inspired design** — clean white cards, `#0071e3` blue accent, hover lifts, stat animations
- **3-context selector** — Individual / Team / Startup / Company with context-specific result sections
- **4-digit OTP login** — paste, auto-advance, backspace hold-to-erase, auto-submit
- **Job Scanner tab** — URL input with Tavily + Claude pipeline; profile selector hidden in scan mode; context auto-set from extraction; pre-fills task list ready to analyse or edit
- **Mobile-responsive** — all stat grids use responsive font sizes (`text-[22px] sm:text-[36px]`) and `grid-cols-1 sm:grid-cols-3` to prevent overflow on small screens
- **Decision Layer badge** — `🧩 Human Required` (violet) or `🔀 AI + Human` (sky blue) per task card
- **Recommendation renderer** — splits on "Option 2" AND "Decision layer:" patterns, renders decision content in violet

### Infrastructure
- **Turso custom DBAPI shim** — full SQLAlchemy compatibility via libSQL HTTP API
- **Magic link / OTP auth** — Resend email provider, 4-char code, 5-analyses/24h rate limit
- **Keep-alive cron** — Vercel cron pings Render every 5 days to prevent free-tier spin-down
- **Admin dashboard** — stats, all users, all submissions, direct result + share URLs

---

## Example Output

**Input:** n8n Product Manager (27 daily tasks, Company context)

**Result:** 62% automation score · €23,855/yr saved · 795 hours reclaimed · 0.4 FTE equivalent

**Per-task highlights:**
- *Triage Slack messages* — 89% AI Ready, ⚡ Automate NOW, Phase 2: Supervised
- *Prioritise product backlog* — 56% AI Ready, Decision Layer: partial — "AI scores items by data signals, PM decides given strategic context"
- *Write PRDs* — 63% AI Ready, 🧩 Decision Layer: full — "AI drafts structure, PM provides strategic intent and domain expertise"
- *Attend engineering standup* — 35% AI Ready, 48+ months, not automatable (synchronous human attendance)

**Board-ready summary auto-generated**, industry benchmark (62% vs 58% sector average vs 81% AI-first), competitor gap (€23,855/yr advantage if you act now vs €33,397 disadvantage if competitor moves first).

---

## Contributing

Contributions welcome — open an issue first to discuss.

**Enhancement ideas:**
- Recharts visualisations — donut score chart, effort/impact priority matrix
- Streaming analysis with live progress updates (Server-Sent Events)
- Integration with Jira / Asana — import tasks directly from project management tools
- Real-time collaboration via WebSockets — teams analyse workflows together
- Industry-specific workflow templates — pre-filled starting points
- Playwright E2E tests — automated coverage of critical user journeys
- React Native mobile app — share components with the web version
- Chrome extension — capture repetitive tasks directly from any web app
- Multi-language support (Next.js i18n)
- Fine-tuning on company-specific workflow data

### Planned & Tested — Not Currently Active

These features were fully built and tested but pulled from the live product pending further refinement:

| Feature | Status | Notes |
|---|---|---|
| 🔗 **LinkedIn Import** | Built & tested | Paste a LinkedIn profile URL or raw text — Claude extracts role, tasks, and context automatically. Removed from active input modes; code preserved in `WorkflowForm.tsx`. Planned for re-activation with a dedicated scraping/proxy layer. |
| 🔍 **Job Scanner** | ✅ Live | Paste any job posting URL — Tavily fetches the page, Claude Haiku extracts tasks and sets context. Available as a tab in `WorkflowForm`. Rate-limit pre-flight check fires before any background work begins. |

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [Ian Baumeister](https://ianworks.dev) &nbsp;·&nbsp; [LinkedIn](https://linkedin.com/in/avoiann) &nbsp;·&nbsp; [GitHub](https://github.com/ibxibx)

**⭐ Star this repo if you find it useful!**

</div>
