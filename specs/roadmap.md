# Roadmap

> Part of the project constitution (`specs/`). Ordered list of what gets built
> next. Take the top open item, create its branch and spec folder
> (`specs/features/NNN-slug/`), implement, validate, merge, tick it here and in
> `CHANGELOG.md`. Reorder or add items only on a `replan/*` branch.
>
> Growth/marketing work is tracked privately in `GROWTH_PLAN.md`; this file is
> the engineering track.

Status: `[ ]` todo · `[~]` in progress · `[x]` done

## Theme for this cycle

Turn the analyzer from *"one LLM call whose output we trust"* into a system that
**checks its own output** and whose **scores are measured against human
labels**. Order matters: measure first, then change the pipeline, so every change
shows up as a number.

---

## Phase 0: Foundation

- [x] **Claude Code skills vendored** (`.claude/skills/`, PR #2)
- [x] **Project constitution**: `specs/` (mission, tech stack, roadmap, process),
      `CHANGELOG.md`, `CLAUDE.md`, project skill `sdd-feature` (PR #3)
- [ ] **001 Secret scanner reads staged files as UTF-8** (`fix/001-secret-scan-utf8`)
      The pre-commit scanner decodes with Windows cp1252; files with some UTF-8
      characters fail to decode and are skipped without blocking the commit.
      Done when: a test that stages a secret next to UTF-8 text fails on the old
      code and passes on the new.

## Phase 1: Measure (unstructured text → scores, with proper evaluation)

- [x] **002 Evaluation harness + labelled task set** (`feat/002-eval-harness`,
      spec: `specs/features/002-eval-harness/`)
      `evals/` with ~50 human-labelled tasks (expected score band, decision
      layer, difficulty, short rationale) and a runner that scores them with the
      production analyzer and reports: band accuracy, MAE to band midpoint,
      Spearman rank correlation, decision-layer accuracy + confusion matrix,
      parse-failure rate, rule-violation rate, run-to-run spread, cost, latency,
      and whether "high confidence" tasks really miss less.
      Done when: baseline report for the current prompt is committed.
      Baseline: Spearman 0.93, band accuracy 72%, decision layer 86%,
      rule violations 36%, confidence carries no signal (`evals/README.md`).

## Phase 2: Self-checking pipeline

- [ ] **003 Validated structured output + targeted repair** (`feat/003-validated-scoring`)
      Structured (schema) output instead of regex-parsed text; composite score
      recomputed in code; prompt rules enforced as checks (e.g. `now` needs
      score ≥ 75, `warning` only for PII/financial/legal/medical); failing
      tasks re-asked with the violations (max 2 rounds); anything still invalid
      is marked `degraded` and shown as "needs review", never as a default 50.
      Done when: eval parse/violation rates drop vs 002 baseline, accuracy not worse.
- [ ] **004 Verifier pass** (`feat/004-verifier`)
      A second, cheaper call audits each task's scores against the rubric and
      the task text; strong disagreement triggers one re-score or lowers
      confidence with the reason shown. Hard token/latency budget for Render.
      Done when: eval shows accuracy gain worth the added cost, or the feature
      ships off-by-default with the numbers explaining why.
- [ ] **005 Analysis traces** (`feat/005-traces`)
      Store prompt version, model, validation outcome, retries, tokens and
      latency per analysis; send the same (no PII) to PostHog LLM analytics;
      admin view of violation and degraded rates over time.
- [ ] **006 CI gates** (`chore/006-ci`)
      GitHub Actions on PRs: backend tests, frontend `tsc` + `eslint`, secret
      scan, and an eval smoke run on a small fixed subset (recorded responses,
      no API spend).

## Phase 3: Better signals

- [ ] **007 Self-consistency confidence** (`feat/007-self-consistency`)
      For tasks flagged uncertain, sample the score k times; confidence from
      the observed spread. Replace the current sub-score-spread heuristic only
      if the 002 calibration check says it is better.
- [ ] **008 Environmental factors from free text** (`feat/008-env-factors`)
      Extract legacy systems, integration landscape and team maturity (with
      quoted evidence) from the user's description or uploaded document, and
      adjust scores. Ship with an ablation: eval with vs without.
      (Product feedback from an n8n PM.)
- [ ] **009 Task-extraction evaluation** (`feat/009-extraction-eval`)
      Measure document/text → task list extraction (`/api/parse-tasks`) against
      hand-annotated samples: precision, recall, duplicate rate.

## Backlog (hygiene, pick up between features)

- [ ] Human review of `evals/data/tasks_v1.jsonl` labels → `tasks_v2` (settles
      whether the low-band gap is the model or the labels).

- [ ] Remove unused `langchain*` from `backend/requirements.txt`.
- [ ] Delete dead `AIAnalyzer._parse_block_unused`.
- [ ] Stop committing generated files in `tests/out/` (keep one small fixture).
- [ ] Fix Pydantic v2 `class Config` deprecation warnings (`job_scan.py`).
- [ ] Review one-off scripts in `backend/scripts/` (keep, document or delete).
