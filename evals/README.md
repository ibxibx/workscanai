# Evaluation harness

Measures WorkScanAI's scoring (the production `AIAnalyzer`, unchanged) against a
labelled task set, so prompt and pipeline changes are judged by numbers.
Spec: `specs/features/002-eval-harness/`.

```
evals/
├── LABELING.md           how labels are written (rubric, evidence classes, provenance)
├── data/tasks_v1.jsonl   50 labelled tasks in 8 realistic workflows
├── schema.py             dataset schema + validation
├── check_data.py         python -m evals.check_data  → coverage counts
├── metrics.py            pure metric functions (unit-tested)
├── backends.py           Claude Code CLI (subscription) or Anthropic API
├── run.py                python -m evals.run  → run file + report
├── report.py             Markdown report
├── runs/                 raw model responses (baseline committed)
└── reports/              generated reports
```

## Run it (Windows, from the repo root)

```powershell
# 1. Check the dataset
backend\venv\Scripts\python.exe -m evals.check_data

# 2. Quick smoke run: one workflow, one repeat
backend\venv\Scripts\python.exe -m evals.run --repeats 1 --workflows mkt --name smoke

# 3. Full run (8 workflows x 3 repeats = 24 model calls)
backend\venv\Scripts\python.exe -m evals.run --name baseline

# 4. Rebuild a report from a run file without any model calls
backend\venv\Scripts\python.exe -m evals.run --replay evals\runs\<file>.jsonl
```

**Backends.** The default `--backend cli` sends the production prompt through the
Claude Code CLI (`claude -p`), billed to your Claude subscription. The runner
removes `ANTHROPIC_API_KEY` from the CLI's environment, so it cannot fall back to
API billing. If the CLI says it is not logged in, run `claude` once and use
`/login`. `--backend api` uses `backend/.env` and costs API credit.

## What gets measured

| Metric | Question it answers |
|---|---|
| Band accuracy, in-range rate, distance MAE, signed error | Are the scores right, and biased which way? |
| Spearman ρ | Are tasks ranked in the right order? |
| Decision-layer accuracy + confusion matrix | Does it separate "automate" from "a human decides"? |
| Silent-failure rate | How often do users see default 50s that look like real results? |
| Rule-violation rate | Does the model follow the prompt's own rules (composite formula, `now` ≥ 75, `warning` only for sensitive data)? |
| Run-to-run SD | Does the same task get the same score twice? |
| Confidence buckets | Does `score_confidence: high` actually miss less? |

## Baseline results (2026-09-24)

Full report: [`reports/baseline-20260924T210035Z.md`](reports/baseline-20260924T210035Z.md).
50 tasks × 3 repeats, `claude-haiku-4-5` through the production prompt and parser,
CLI backend with thinking disabled. 24 calls, 0 failed, API-equivalent cost $0.48.

| Metric | Baseline |
|---|---|
| Spearman ρ (ranking vs labels) | **0.934** |
| Band accuracy | 72.0% (high 90.5%, mid 50.0%, low 66.7%) |
| In labelled range / distance MAE | 62.0% / 2.0 pts |
| Decision-layer accuracy | 86.0% |
| Silent-failure rate | 0.0% |
| Rule-violation rate | **36.0%** of results |
| Run-to-run SD (mean / max) | 2.1 / 5.9 pts |

What the numbers say:

1. **Ranking is strong, absolute calibration is weaker at the bottom.** No task
   labelled *low* scored under 22; judgement-heavy tasks (negotiation, litigation,
   performance reviews) land at 30–46 against labels of 5–25, a +5.0 mean bias for
   the low band. Either the weighted formula has a practical floor (data and
   integration sub-scores stay moderate for any task) or the v1 labels are too
   low. A human label review (v2) has to settle which, before tuning the prompt.
2. **The model breaks its own prompt's rules in about 1 of 3 results.**
   - `warning` risk on 26 results of 9 tasks with no personal, financial, legal
     or medical data, all strategic or relationship tasks. The model uses
     `warning` to mean "a human must decide", which the prompt reserves for
     sensitive data. Users see a red badge that means something else.
   - `COMPOSITE_SCORE` differs from the stated formula by more than 1 point in
     32 results (mean 1.6, max 3.5). Small, but a code-side recompute removes it.
   - `now` countdown on 2 results scoring under 75.
3. **`score_confidence` carries no signal.** 139 of 150 results are `high`, and
   `high` and `medium` miss the labels by the same amount (2.2 vs 2.1 points).
4. **Decision layer mostly right, and errs conservative:** 5 of 22 *partial*
   tasks were called *full*; nothing labelled *full* was called *none*.
5. **Stable enough to measure against:** mean SD 2.1 points across repeats,
   so changes of more than ~3 points in later runs are signal, not noise.
6. **Measurement gotcha found on the way:** Claude Code enables extended thinking
   by default (14.6k output tokens and 165 s for one 6-task batch). Left on, the
   harness would have measured a stronger system than production. It is now off
   (`MAX_THINKING_TOKENS=0`), and responses longer than production's `max_tokens`
   would be truncated like the API does (none were in this run).

These feed the roadmap directly: 003 (validated output: recompute the composite,
enforce `warning` and `now` rules), 007 (replace the confidence heuristic), and a
v2 label review before any prompt tuning.

## Honest limitations

- `tasks_v1` labels were written by a Claude model from `LABELING.md`, not by a
  human domain expert, and the scorer is also a Claude model. A human review of
  the labels is the first planned improvement.
- The CLI backend adds a one-line neutral system prompt and ignores `max_tokens`;
  use `--backend api` for a production-identical run.
- 50 tasks is a small set: treat differences of a few points as noise.
