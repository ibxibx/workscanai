# 002 · Evaluation harness + labelled task set: plan

## 1. Dataset and guide

- [x] 1.1 `evals/LABELING.md`: rubric (same four dimensions as the prompt),
      bands, decision-layer definitions, evidence classes (MGI 2017 Exhibit E3),
      worked examples, provenance of v1.
- [x] 1.2 `evals/schema.py` + `python -m evals.check_data`: validates records,
      checks workflows share context/industry, prints coverage counts.
- [x] 1.3 50 tasks in 8 workflows written to `evals/data/tasks_v1.jsonl`.
- [x] 1.4 Labels written blind (before any analyzer run); check_data passes.

## 2. Metrics (tests first)

- [x] 2.1 `backend/tests/test_eval_metrics.py` with hand-computed fixtures (red first).
- [x] 2.2 `evals/metrics.py`: band accuracy, distance MAE, signed error, Spearman
      (ties), confusion matrix, silent failures, rule violations, stability,
      confidence buckets, per-band breakdown.

## 3. Runner

- [x] 3.1 `evals/backends.py`: recording client in place of the Anthropic client;
      CLI backend (subscription, API key stripped) and API backend.
- [x] 3.2 `evals/run.py`: one batch per workflow, repeats, parallel jobs, run
      JSONL; results always re-derived from the run file with the production parser.
- [x] 3.3 `evals/report.py`: deterministic Markdown report; `--replay`.
- [x] 3.4 `backend/tests/test_eval_runner.py`: fake backend, error + missing-block
      handling, labels never in the prompt, replay byte-identical.

## 4. Baseline

- [x] 4.1 Smoke run (1 workflow, 1 repeat) on the laptop via the CLI backend.
- [x] 4.2 Full run `--name baseline` (3 repeats); commit run file + report.
- [x] 4.3 Findings written into `evals/README.md` ("Baseline results").

- [x] 4.4 Smoke run exposed default extended thinking in the CLI; disabled it and
      added max_tokens emulation before the baseline (commit db72a1b).

## 5. Docs

- [x] 5.1 Roadmap `[x]`, CHANGELOG, README "Evaluation" pointer with headline numbers.
