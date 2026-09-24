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

## Honest limitations

- `tasks_v1` labels were written by a Claude model from `LABELING.md`, not by a
  human domain expert, and the scorer is also a Claude model. A human review of
  the labels is the first planned improvement.
- The CLI backend adds a one-line neutral system prompt and ignores `max_tokens`;
  use `--backend api` for a production-identical run.
- 50 tasks is a small set: treat differences of a few points as noise.
