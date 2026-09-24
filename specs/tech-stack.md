# Tech stack

> Part of the project constitution (`specs/`). What we build with, and the rules
> for changing it. Updated on `replan/*` branches, or in the same PR as a
> feature that adds/removes a dependency. Deployment detail: `ARCHITECTURE.md`.

## Runtime

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4 | Deployed on Vercel (Hobby). `reactStrictMode: false`. |
| Backend | Python 3.11+, FastAPI 0.115, Uvicorn, Pydantic 2 | Deployed on Render free tier: sleeps after ~15 min, 30–50 s cold start. |
| Database | Turso / libSQL via `app/core/turso_dbapi.py` (PEP-249 shim over HTTP), SQLAlchemy 2 | Local dev: SQLite file outside the project dir. |
| LLM | Anthropic Claude, `claude-haiku-4-5` for extraction and scoring | Batched: one call per analysis (`---TASK_N---` blocks today). |
| Research | Tavily (job scanner) | |
| Email | Resend (magic-link OTP, report email, digest) | |
| Analytics | PostHog EU (client + server capture) | Every capture wrapped; analytics must never break analysis. |
| Reports | ReportLab (PDF), python-docx (DOCX) | |
| Automation output | n8n workflow JSON built from patterns (`n8n_template_client.py`) | |

## Quality gates (must pass before every merge)

| Area | Command (from repo root unless noted) |
|---|---|
| Frontend types | `cd frontend && npx tsc --noEmit` → exit 0 |
| Frontend lint | `cd frontend && npx eslint "<changed paths>"` → exit 0 (flat config, not `next lint`) |
| Backend compile | `backend/venv/Scripts/python.exe -m py_compile <changed files>` |
| Backend tests | `backend/venv/Scripts/python.exe -m pytest backend/tests -q` → 0 failures |
| Secrets | pre-commit hook `.githooks/pre-commit` (`git config core.hooksPath .githooks`) |
| Evaluation (from Phase 1) | `python -m evals.run` → no metric below its committed baseline |

## Conventions

- **Branches:** `feat/NNN-slug`, `fix/NNN-slug`, `docs/…`, `chore/…`, `replan/…`.
  One roadmap item per branch. No force-push, ever; fast-forward or merge commits.
- **Commits:** atomic, imperative subject, body says *why*. Message via
  `_commitmsg.txt` + `git commit -F` on Windows (avoids PowerShell quoting).
- **PRs:** every feature merges through a PR that links its spec folder and
  pastes the evidence from its `validation.md`.
- **Config:** secrets only in env vars (`.env` locally, Render/Vercel dashboards
  or API in prod). Typed access through `app/core/config.py` `Settings`.
- **LLM output is untrusted input.** Validate it (schema + business rules)
  before it is stored, rendered or used to build anything (OWASP LLM05).
- **Named constants over magic numbers** (e.g. `ANNUAL_PRODUCTIVE_HOURS`).
- **Windows dev machine:** edit TSX with UTF-8-safe tools (never `Set-Content`),
  run complex shell via temp `.py`/`.cmd` files.

## Planned additions (see roadmap)

| Addition | For | Phase |
|---|---|---|
| `evals/` package: labelled dataset (JSONL) + runner, stdlib only (no new dependency) | Measuring scoring quality | 1 |
| Claude tool use / JSON schema output + Pydantic models for task scores | Validated structured output | 2 |
| Per-analysis trace fields (prompt version, model, retries, tokens, validation result) | Observability | 2 |
| GitHub Actions: backend tests + eval smoke on PRs | Automated gates | 2 |

## Deliberately not used

- LangChain: listed in `requirements.txt` but not imported anywhere in
  `backend/app` (candidate for removal). The analyzer calls the Anthropic SDK directly so every step is explicit
  and testable. Revisit only with an eval showing a benefit.
- Vercel serverless Python: 10 s limit on Hobby kills analysis calls.
