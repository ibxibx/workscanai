# 002 · Evaluation harness + labelled task set: validation

Merge when every box is ticked with evidence pasted below.

## Acceptance checks

- [ ] A1 `evals/data/tasks_v1.jsonl` has ≥ 45 tasks, validates against the
      schema (script check), and meets the coverage targets in requirements
      (script prints counts per band / category / context / edge case).
- [ ] A2 Every label has `labeled_by`, `labeled_at` and a one-line rationale.
- [ ] A3 Metric functions have unit tests with hand-computed expected values
      (band accuracy, distance MAE, Spearman incl. ties, confusion matrix,
      silent-failure and violation detection). No API key needed.
- [ ] A4 A live run completes: `python -m evals.run --repeats 3` writes a run
      file and a report; API key never appears in output or files
      (secret scan clean).
- [ ] A5 `python -m evals.run --replay <baseline run>` reproduces the committed
      baseline report byte-for-byte (except the timestamp line).
- [ ] A6 Baseline report committed with every metric listed in requirements
      and the 10 worst tasks.
- [ ] A7 `ai_analyzer.py` unchanged in the diff.

## Quality gates

- [ ] Backend tests green (existing + new metric tests)
- [ ] `py_compile` on new modules
- [ ] Frontend: not touched

## Review

- [ ] Review pass done; findings fixed or recorded

## Evidence

<!-- paste here -->
