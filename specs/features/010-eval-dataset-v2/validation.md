# 010 · Labelled task set v2 (100 tasks): validation

## Acceptance checks

- [ ] A1 `python -m evals.check_data evals/data/tasks_v2.jsonl` passes: 100
      tasks, 16 workflows, coverage printed.
- [ ] A2 The first 50 records of v2 are byte-identical to `tasks_v1.jsonl`
      (test), and `tasks_v1.jsonl` is unchanged vs `main`.
- [ ] A3 New-task coverage targets from requirements are met (scripted check).
- [ ] A4 Report has an Edge cases section listing every edge task (test).
- [ ] A5 The committed v1 baseline still replays byte-identically.
- [ ] A6 Baseline v2 run committed; findings include the v1 subset compared
      with the v1 baseline.
- [ ] A7 `backend/app` unchanged vs `main`.

## Quality gates

- [ ] Backend tests green
- [ ] Frontend: not touched

## Review

- [ ] Review pass done

## Evidence

<!-- paste here -->
