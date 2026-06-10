# WorkScanAI — Architecture

How the project is structured, deployed, and how a request flows end-to-end.

## Live deployment topology

```mermaid
flowchart TB
    user([User / Browser])

    subgraph vercel["Vercel — Frontend (Next.js 14, App Router)"]
        direction TB
        pages["Pages &amp; Components<br/>landing · dashboard · analyze<br/>results · roadmap · admin · /report/[code]"]
        nextapi["Next.js Route Handlers<br/>(keep-alive, OG images)"]
    end

    subgraph render["Render — Backend (FastAPI + Uvicorn)"]
        direction TB
        api["REST API<br/>/api/parse-tasks · /api/workflows<br/>/api/analyze · /api/results<br/>/api/reports (PDF/DOCX) · /api/share<br/>/api/quota · /api/admin · /api/job-scan"]
        services["Services<br/>ai_analyzer · roi_calculator<br/>tool_recommender · n8n template client<br/>job scanner · security / rate-limit"]
        dbapi["turso_dbapi.py<br/>(PEP-249 DBAPI shim over HTTP)"]
    end

    subgraph data["Data &amp; External Services"]
        direction TB
        turso[("Turso / libSQL<br/>persistent cloud SQLite")]
        anthropic["Anthropic Claude API<br/>(Haiku: extract/curate · larger: analyze)"]
        tavily["Tavily<br/>(job research)"]
        resend["Resend<br/>(magic-link email)"]
        n8n["n8n.io Templates API"]
    end

    user -->|HTTPS| pages
    pages -->|"direct HTTPS (bypasses 60s proxy cap)"| api
    nextapi -.->|warm-up ping| api
    api --> services
    services --> dbapi
    dbapi -->|HTTP| turso
    services -->|LLM calls| anthropic
    services --> tavily
    services --> resend
    services --> n8n

    keepalive["External cron<br/>(UptimeRobot / cron-job.org)"] -.->|ping /api/health every ~14 min| api
```

## Request lifecycle (analyze flow)

```mermaid
sequenceDiagram
    participant U as Browser
    participant F as Vercel (Next.js)
    participant B as Render (FastAPI)
    participant AI as Claude API
    participant DB as Turso

    U->>F: Load app, enter tasks / job title
    F->>B: POST /api/parse-tasks (direct HTTPS)
    B->>AI: Decompose into atomic tasks
    AI-->>B: Structured tasks
    B-->>F: Parsed tasks
    F->>B: POST /api/workflows then /api/analyze
    B->>AI: Score automation, ROI, risk, n8n
    AI-->>B: Analysis
    B->>DB: Persist workflow + results
    DB-->>B: share_code
    B-->>F: Analysis + share_code
    F-->>U: Results dashboard, PDF/DOCX export, /report/[code]
```

## Why this shape

- **Frontend and backend are separate deployments.** The browser calls Render
  **directly** over HTTPS for any operation that may exceed Vercel's ~60s proxy
  limit (AI analysis, document extraction, email auth). Vercel serves only the
  Next.js app — there is no Python serverless function in production.
- **Render free tier sleeps after ~15 min idle** (≈30–50s cold start), so the UI
  shows progress feedback and an external cron pings the backend to keep it warm.
- **Turso/libSQL** gives persistent cloud SQLite that survives Render redeploys,
  accessed through a small custom DBAPI shim so all SQLAlchemy ORM code is unchanged.

## Repository layout

```
workscanai/
├── frontend/          Next.js 14 app (App Router) — deployed to Vercel
│   ├── src/app/       Routes: landing, dashboard, results, roadmap, admin, report
│   ├── src/components/ Shared UI (WorkflowForm, charts, badges, modals)
│   ├── src/lib/       API client + helpers
│   ├── Dockerfile     Image for optional local Docker stack
│   └── vercel.json    Vercel config (intentionally minimal)
├── backend/           FastAPI service — deployed to Render
│   ├── app/
│   │   ├── api/       Route handlers (workflows, analysis, reports, job-scan, admin)
│   │   ├── core/      config, database, turso_dbapi shim, security
│   │   ├── models/    SQLAlchemy models
│   │   └── services/  AI analyzer, ROI, tool recommender, n8n client
│   ├── scripts/       Backend maintenance utilities (seed, backfills, checks)
│   ├── tests/         Pytest suite (unit/integration)
│   └── Dockerfile     Image for optional local Docker stack
├── scripts/           Local dev convenience scripts (Windows setup/start helpers)
├── docker/            Optional offline full-stack dev (compose + local Postgres)
├── tests/             Deployed-system E2E probes + secret scans (whole-stack)
├── pics/              Logo, banner, screenshots
├── tasks/             Sample task inputs
├── render.yaml        Render service definition
└── README.MD          Project overview
```
