# Mission

> Part of the project constitution (`specs/`). Source of truth for *why* WorkScanAI
> exists and what "good" means. Change it only on a `replan/*` branch.

## Why

Teams and individuals cannot say which of their tasks AI can take over today,
which need a human decision on top, and what that is worth in euros and hours.
WorkScanAI answers that in minutes: describe your work (text, voice, document or
just a job title) and get a scored, per-task automation assessment, ROI,
a phased roadmap and ready-to-import n8n workflows.

## Who it is for

- **Individuals** checking how exposed their role is and where to grow.
- **Teams / startups** looking for velocity without hiring.
- **Companies / departments** sizing ROI and risk before an automation programme.

## Product principles

1. **Honest over impressive.** A strategic task is not "90% automatable" because
   the model said so. Scores separate the *data layer* (AI can do it) from the
   *decision layer* (a human must decide) and say so.
2. **Every number is traceable.** Scores come from a stated rubric and are
   checked in code; benchmarks cite their source; no magic constants.
3. **Measured, not assumed.** Changes to prompts, models or scoring are judged
   against a labelled evaluation set, not by eyeballing one report.
4. **Fail visibly.** If the AI step fails or its output breaks the rules, the
   user sees "degraded / needs review", never a default that looks like a result.
5. **Private by default.** No IP-based identity, PII stays out of logs and
   analytics, analytics can never break the analysis flow.
6. **Works on a free tier.** Cold starts, timeouts and token budgets are product
   constraints, designed for rather than apologised for.

## What success looks like

- A user reaches a credible, shareable report in one session.
- Scores agree with human judgement on the evaluation set, and we can show the
  numbers (see `roadmap.md`, Phase 1).
- Any reviewer can open a feature folder in `specs/features/` and see what was
  asked, how it was built and how it was verified.

## Out of scope

- Executing automations on the user's behalf (we generate n8n workflows; the
  user imports and runs them).
- Replacing a consultant's judgement: the report supports a decision, it does
  not make it.
