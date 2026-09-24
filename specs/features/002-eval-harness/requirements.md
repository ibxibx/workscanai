# 002 · Evaluation harness + labelled task set: requirements

- **Roadmap item:** `specs/roadmap.md` → Phase 1, item 002
- **Branch:** `feat/002-eval-harness`
- **Status:** draft (waiting for agreement on open questions)

## Problem

WorkScanAI turns free-text task descriptions into automation scores, but there
is no way to tell whether the scores are right, stable or getting better:

- No labelled data: nothing to compare the model's scores against.
- Silent failures are invisible: on any API error `analyze_tasks_batch` returns
  `_defaults()` for every task (score 50, "Safe to automate fully."), and a
  missing `---TASK_N---` block gets the same defaults (`ai_analyzer.py` ~L140,
  L165). Nobody knows how often this happens.
- The final score is taken from the model's own `COMPOSITE_SCORE` arithmetic
  and never recomputed; the prompt's rules (e.g. `now` only if score ≥ 75) are
  never checked.
- No temperature is set (API default), so run-to-run variation is unknown.
- `score_confidence` is a heuristic (spread of the four sub-scores) that has
  never been checked against outcomes.

Every later roadmap item (003–008) changes the pipeline; without a baseline we
cannot show any of them helped.

## Goal

A committed, repeatable measurement of the **current** analyzer against
human labels, so every later change is judged by numbers.

## In scope

1. **Labelled dataset** `evals/data/tasks_v1.jsonl`, ~50 tasks:
   - Fields: `id`, `name`, `description`, `frequency`, `time_per_task`,
     `category`, `complexity`, `industry`, `analysis_context`, `source`, and
     `label` = `{score_min, score_max, band, decision_layer, difficulty,
     rationale, labeled_by, labeled_at}`.
   - Bands: `low` 0–39, `mid` 40–69, `high` 70–100; `score_min/max` is the
     labeller's acceptable range inside or across a band.
   - Coverage: ≥ 12 tasks per band; data-processing, communication, creative,
     relationship and strategic/decision tasks; all three contexts
     (individual / team / company); ≥ 5 edge cases (PII, legal, medical,
     ambiguous wording).
   - Labelling guide `evals/LABELING.md`: same four dimensions as the prompt,
     worked examples, and the rule that labels are written **before** seeing
     any model output.
2. **Runner** `python -m evals.run` that calls the production
   `AIAnalyzer.analyze_tasks_batch` unchanged, in fixed batches (default 8,
   fixed order), `--repeats N` (default 3), and records every raw response,
   token usage and latency to `evals/runs/<timestamp>.jsonl`.
3. **Metrics** (pure functions, unit-tested with fixtures):
   - Band accuracy; distance-to-range MAE (0 when inside the labelled range);
     Spearman rank correlation vs label midpoints.
   - Decision-layer accuracy + 3×3 confusion matrix.
   - Silent-failure rate: tasks whose sub-scores are missing (= defaults used).
   - Rule-violation rate: composite ≠ recomputed (±1), `now` with score < 75,
     `warning` risk on tasks not labelled sensitive, out-of-range values.
   - Stability: per-task standard deviation of the score across repeats.
   - Confidence check: error by `score_confidence` bucket (does "high" miss less?).
   - Cost and latency per task (from recorded usage).
4. **Report** `evals/reports/<date>-baseline.md` (committed) with all metrics,
   the worst 10 tasks and their rationale vs model recommendation.
5. **Replay mode** `--replay <run file>` recomputes the report from recorded
   responses with no API calls (used by CI in 006).

## Out of scope

- Any change to `ai_analyzer.py` or the prompt (that is 003+).
- CI wiring (006). Extraction quality (009).

## Decisions

| Decision | Chosen | Why / alternatives rejected |
|---|---|---|
| Ground truth | Human labels as ranges + band | A single "correct" number is false precision; ranges are what a reviewer can defend. |
| Test through production code | Call `AIAnalyzer` as-is; wrap the Anthropic client only to capture usage/latency | Measures what users get; a copy of the prompt would drift. |
| Rank metric | Spearman, implemented in stdlib | Ordering tasks correctly matters more than exact numbers; no new dependency. |
| Dataset format | JSONL, one task per line | Diff-friendly, reviewable in PRs, easy to append. |
| Raw responses | Committed for the baseline run only | Makes replay and later comparisons reproducible; later runs stay local. |
| Privacy | Invented or public-source task text only (e.g. O*NET task statements, own sample tasks); no real user submissions | No PII in the repo. |

## Context and constraints

- Mission principles 2 (traceable) and 3 (measured, not assumed).
- API spend: Haiku, batched; ~50 tasks × 3 repeats ≈ 20 calls per full run.
  Report shows actual tokens.
- Must run on the Windows laptop with `backend/venv`; reads
  `ANTHROPIC_API_KEY` from `backend/.env` (as `app/core/config.py` does),
  never printed or logged.

## Open questions (need Ian)

- [ ] Q1 **Who labels?** (a) Ian writes the task texts and labels them;
      (b) Claude drafts the ~50 task texts to hit the coverage targets, Ian
      labels them blind from the guide (recommended: fast, and the labels are
      real human ground truth); (c) Claude drafts labels too, Ian corrects:
      fastest, but the labels inherit a model's opinion, which weakens the
      eval story.
- [ ] Q2 **Second labeller for 15 tasks?** Lets us report inter-rater
      agreement, i.e. how good a human gets. Optional.
- [ ] Q3 **OK to spend API credit** on ~3 full runs while building (cents to
      low single-digit euros on Haiku)?
