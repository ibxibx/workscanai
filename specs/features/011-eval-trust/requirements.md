# 011 · Trust checks for the eval harness: requirements

- **Roadmap item:** `specs/roadmap.md` → Phase 1, item 011 (agreed with the owner on 2026-10-16 as the step before 003)
- **Branch:** `feat/011-eval-trust` (stacked on 010 until PR #6 merges)
- **Status:** implemented (label review itself pending: owner fills the sheet)

## Problem

The harness produces numbers, but four things are unproven before we use it to
judge pipeline changes (003+):

1. **Labels:** written by Claude and scored by Claude. No human has checked them,
   so we do not know how much of the "error" is the model and how much the labels.
2. **Sensitivity:** nobody has shown the harness turns red when the analyzer is
   broken. An eval that cannot fail proves nothing.
3. **Noise:** two runs of the same code differ by ~2–4 points (measured in 010).
   Without confidence intervals, a change from 74% to 77% looks like progress.
4. **Overfitting:** if the prompt is tuned while looking at all 100 tasks, the
   final numbers measure fit to these labels, not quality.

## Goal

Before changing the analyzer, the harness can (a) take a blind human review of
labels and report agreement, (b) prove it detects known breakage, (c) compare
two runs with confidence intervals, and (d) keep a held-out half for final numbers.

## In scope

1. **Blind label review** `python -m evals.review export|import`
   - Export 30 tasks to `evals/review/review_v2.xlsx`: 20 drawn at random
     (seeded, stratified by band) and 10 targeted (largest model–label gaps in
     the v2 baseline, always including the prompt-injection task). The sheet
     shows task text only: no labels, no model scores, no task ids.
   - Import the filled sheet: validate it, save `evals/review/review_v2_<reviewer>.json`
     and write `evals/reports/label-review-v2.md` with reviewer-vs-labels and
     reviewer-vs-model agreement (band, decision layer, midpoint gap, range
     overlap), reported separately for the random 20 and the targeted 10.
2. **Canary check** `python -m evals.canary <run file>`: applies known-bad
   mutations to recorded responses (no model calls) and asserts each moves the
   right metric the right way: drop a block → incomplete ↑; wrong composite →
   violations ↑; inverted scores → Spearman ↓; all decisions "none" → decision
   accuracy ↓; misnamed field → malformed ↑. Exit code 1 if any check fails.
3. **Compare** `python -m evals.compare <base run> <new run>`: per-metric base,
   new, delta and a 95% paired-bootstrap interval over tasks; a delta is flagged
   only when its interval excludes 0.
4. **Dev / holdout split**: `evals/data/splits_v2.json`, 50/50, every workflow in
   both halves, stratified by band, seeded and committed. `--split dev|holdout|all`
   on `run --replay` and `compare`.

## Out of scope

- Changing labels (that is the review's output → `tasks_v3`, next step).
- CI wiring (006). Any analyzer change (003).

## Decisions

| Decision | Chosen | Why |
|---|---|---|
| Review format | `.xlsx` with dropdowns (openpyxl, already in `backend/requirements.txt`) | Opens in Excel without CSV delimiter/encoding trouble on a German-locale Windows machine. |
| Sample | 20 random + 10 targeted | Random gives an unbiased agreement estimate; targeted spends review time where labels most likely need fixing. |
| Blindness | Sheet has no labels, scores or ids; mapping kept in `selection_v2.json` | Anchoring on existing labels would make agreement meaningless. |
| Bootstrap | Paired over tasks, 1,000 resamples, seeded, stdlib only | Tasks are the unit of variation; no new dependency. |
| Split | Per task within each workflow | Batches stay whole (production behaviour); only metrics are filtered. |

## Rules this adds to the process

- Prompt or pipeline work is judged on **dev**; the PR reports **holdout**.
- A metric counts as improved only if the `compare` interval excludes 0.
- `canary` must pass before a baseline is trusted (and later in CI, 006).
