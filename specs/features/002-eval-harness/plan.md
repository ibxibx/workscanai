# 002 · Evaluation harness + labelled task set: plan

Draft; finalised once the open questions in `requirements.md` are answered.

## 1. Dataset and guide

- [ ] 1.1 `evals/LABELING.md`: rubric (same four dimensions as the prompt),
      band definitions, decision-layer definitions, 3 worked examples.
- [ ] 1.2 `evals/schema.py` + `python -m evals.check_data`: validates records
      and prints coverage counts.
- [ ] 1.3 Task texts (~50) written to `evals/data/tasks_v1.jsonl` with empty labels.
- [ ] 1.4 Labels filled per Q1 decision; check_data passes.

## 2. Metrics (tests first)

- [ ] 2.1 `backend/tests/test_eval_metrics.py` with hand-computed fixtures.
- [ ] 2.2 `evals/metrics.py`: band accuracy, distance MAE, Spearman (ties),
      confusion matrix, silent-failure detection, rule violations, stability,
      confidence buckets.

## 3. Runner

- [ ] 3.1 `evals/run.py`: loads dataset, batches, calls `AIAnalyzer` with a
      usage-capturing client wrapper, writes run JSONL.
- [ ] 3.2 `--replay` path; report writer `evals/report.py` (Markdown).
- [ ] 3.3 Tests for replay determinism using a tiny recorded fixture.

## 4. Baseline

- [ ] 4.1 Live run `--repeats 3`; commit run file + `evals/reports/<date>-baseline.md`.
- [ ] 4.2 Short findings section in the report (what the numbers say).

## 5. Docs

- [ ] 5.1 Roadmap `[x]`, CHANGELOG, README "Evaluation" section with headline numbers.
