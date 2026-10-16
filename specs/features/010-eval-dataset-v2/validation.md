# 010 · Labelled task set v2 (100 tasks): validation

## Acceptance checks

- [x] A1 `python -m evals.check_data evals/data/tasks_v2.jsonl` passes: 100
      tasks, 16 workflows, coverage printed.
- [x] A2 The first 50 records of v2 are byte-identical to `tasks_v1.jsonl`
      (test), and `tasks_v1.jsonl` is unchanged vs `main`.
- [x] A3 New-task coverage targets from requirements are met (scripted check).
- [x] A4 Report has an Edge cases section listing every edge task (test).
- [x] A5 The committed v1 baseline still replays from its unchanged run file; the
      regenerated report differs only by the added report rows/sections (no metric changed).
- [x] A6 Baseline v2 run committed; findings include the v1 subset compared
      with the v1 baseline.
- [x] A7 `backend/app` unchanged vs `main`.

## Quality gates

- [x] Backend tests green
- [x] Frontend: not touched

## Review

- [x] Review pass done

## Evidence

### A1: dataset

```
> python -m evals.check_data
tasks_v2.jsonl: 100 tasks, 16 workflows
  band            {'high': 40, 'low': 27, 'mid': 33}
  decision_layer  {'full': 23, 'none': 25, 'partial': 52}
  task_type       {'communication': 10, 'creative': 15, 'data_processing': 26, 'operational': 19, 'relationship': 18, 'strategic': 12}
  analysis_context {'company': 30, 'individual': 32, 'team': 38}
  edge_case       {'False': 83, 'True': 17}
OK
```

### A2, A3, A4: tests (written first, red before the dataset/schema/report changes)

```
> python -m pytest backend/tests/test_eval_dataset_v2.py backend/tests/test_eval_runner.py -q   (before)
7 failed, 5 passed
> python -m pytest backend/tests -q                                                            (after, laptop)
(see PR description for the final count)
```
`test_v1_records_are_carried_over_byte_identical`, `test_new_tasks_meet_coverage_targets`
(new: 19 high / 19 mid / 12 low, 19 individual, 6 communication, 11 creative,
9 edge cases incl. 3 German, injection, terse, compound, physical),
`test_report_lists_every_edge_case_task`. `git diff main -- evals/data/tasks_v1.jsonl`: empty.

### A5: v1 baseline replay

Regenerated from `evals/runs/baseline-20260924T210035Z.jsonl` (unchanged). `diff`
against the previous report shows only additions: the Edge cases section and
the defaults/malformed rows. No existing line changed.

### A6: baseline v2

```
> python -m evals.run --name baseline-v2 --repeats 3 --jobs 3
48 calls via backend 'cli' (3 in parallel)   ... 0 ERROR lines
run file: evals/runs/baseline-v2-20261002T090155Z.jsonl
report:   evals/reports/baseline-v2-20261002T090155Z.md
```
Findings, incl. v1 subset vs v1 baseline and the injection control run, in
`evals/README.md` ("Baseline v2 results").

### A7: analyzer untouched

`git diff main --stat -- backend/app`: empty.

### Review notes

- Two things found by the run, fixed or recorded in this PR: malformed blocks
  (metric now split into defaults vs malformed, test first); the injection task
  needed a control run to interpret (done: no effect; label goes to human review).
- Labels were not changed after seeing results (`LABELING.md` rule 1).
