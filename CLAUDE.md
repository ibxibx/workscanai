# Instructions for coding agents

This repo is built spec-first. Before changing code:

1. Read `specs/README.md` (the process), then `specs/mission.md`,
   `specs/tech-stack.md` and `specs/roadmap.md`.
2. Work on exactly one roadmap item, on its own branch, with its spec folder in
   `specs/features/NNN-slug/`. The `sdd-feature` skill has the step-by-step loop.
3. Merge only through a PR whose `validation.md` has fresh evidence.

## Hard rules

- Never force-push. Never commit secrets; the pre-commit hook must stay enabled.
- Treat LLM output as untrusted: validate before storing, rendering or acting on it.
- Analytics calls must never be able to break the analysis flow.
- No IP-based identity. No PII in logs or analytics.
- Security or auth architecture changes: propose and wait for a decision.
- Do not edit vendored skills in `.claude/skills/` (see its README).

## Where things are

- Backend: `backend/app/` (routes in `api/routes/`, LLM logic in `services/ai_analyzer.py`)
- Frontend: `frontend/src/` (main form `components/WorkflowForm.tsx`)
- Backend tests: `backend/tests/`; whole-stack probes: `tests/`
- Architecture and deployment: `ARCHITECTURE.md`
