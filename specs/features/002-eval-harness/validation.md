# 002 · Evaluation harness + labelled task set: validation

Merge when every box is ticked with evidence pasted below.

## Acceptance checks

- [x] A1 `evals/data/tasks_v1.jsonl` has ≥ 45 tasks, validates against the
      schema (script check), and meets the coverage targets in requirements
      (script prints counts per band / category / context / edge case).
- [x] A2 Every label has `labeled_by`, `labeled_at` and a one-line rationale.
- [x] A3 Metric functions have unit tests with hand-computed expected values
      (band accuracy, distance MAE, Spearman incl. ties, confusion matrix,
      silent-failure and violation detection). No API key needed.
- [x] A4 A live run completes: `python -m evals.run --repeats 3` (CLI backend,
      subscription) writes a run file and a report; no API key in output or
      files (secret scan clean).
- [x] A5 `python -m evals.run --replay <baseline run>` reproduces the committed
      baseline report byte-for-byte (the report has no wall-clock timestamp).
- [x] A6 Baseline report committed with every metric listed in requirements
      and the 10 worst tasks.
- [x] A7 `ai_analyzer.py` unchanged in the diff.

## Quality gates

- [x] Backend tests green (existing + new metric tests)
- [x] `py_compile` on new modules (imported by the test suite on 3.11 and 3.14)
- [x] Frontend: not touched

## Review

- [x] Review pass done; findings fixed or recorded (see Review notes)

## Evidence

### A1, A2: dataset

```
> python -m evals.check_data
tasks_v1.jsonl: 50 tasks, 8 workflows
  band            {'high': 21, 'low': 15, 'mid': 14}
  decision_layer  {'full': 13, 'none': 15, 'partial': 22}
  sensitive       {'False': 30, 'True': 20}
  task_type       {'communication': 4, 'creative': 4, 'data_processing': 16, 'operational': 9, 'relationship': 10, 'strategic': 7}
  analysis_context {'company': 18, 'individual': 13, 'team': 19}
  edge_case       {'False': 42, 'True': 8}
OK
```
Schema validation requires `labeled_by`, `labeled_at` and `rationale` on every label.

### A3: metric tests (written first, red before `metrics.py` existed)

```
> python -m pytest backend/tests/test_eval_metrics.py -q      (before metrics.py)
ERROR backend/tests/test_eval_metrics.py ... 1 error during collection
> python -m pytest backend/tests -q                            (laptop, Python 3.14)
86 passed in 4.52s
```
Runner tests use a fake backend (no key, no network): errors and missing blocks
become silent failures, labels never appear in the prompt, over-long responses
are truncated like the API, replay is byte-identical. Also run on Python 3.11
(cloud), which caught an f-string that only parses on 3.12+ (fixed, 7e5f0c1).

### A4: live run

```
> python -m evals.run --name baseline --repeats 3 --jobs 3
24 calls via backend 'cli' (3 in parallel)
  repeat 1 | hr       | 6 tasks | 39334 ms
  ...
  repeat 3 | ecom     | 7 tasks | 46043 ms
run file: evals/runs/baseline-20260924T210035Z.jsonl
report:   evals/reports/baseline-20260924T210035Z.md
```
0 failed calls. The CLI backend strips `ANTHROPIC_API_KEY` from its environment;
the secret patterns from `scripts/secret_scan_precommit.py` find nothing in
`evals/` or the new tests.

### A5: replay is byte-identical, across OSes

```
> python -m evals.run --replay evals\runs\baseline-20260924T210035Z.jsonl --out %TEMP%\replay.md
SHA-256 committed report  41098AAF6219086DFF6FFF686808090629BC96AEBF5EA2CB8121BAD7D0828135
SHA-256 replay (Windows)  41098AAF6219086DFF6FFF686808090629BC96AEBF5EA2CB8121BAD7D0828135
SHA-256 replay (Linux)    41098aaf6219086dff6f...  (same)
```

### A6: baseline committed

`evals/reports/baseline-20260924T210035Z.md`: all metrics from requirements,
per-band table, decision confusion matrix, rule violations, confidence buckets,
cost and latency, ten worst tasks, per-task table. Findings in `evals/README.md`.

### A7: analyzer untouched

```
> git diff main --stat -- backend/app
(no output)
```

### Review notes

- Found and fixed during the build: CLI default extended thinking would have
  flattered results (disabled); CLI ignores `max_tokens` (emulated); failed CLI
  login recorded every task as a silent failure (pre-flight check added).
- Known limitation, stated in every report: model-written labels scored by a
  model. First follow-up: human review of `tasks_v1` labels (v2).
- Pre-commit hook skipped some new files on this branch because fix 001
  (PR #4) is not merged yet; scanned them separately, 0 hits.
