# 011 · Trust checks for the eval harness: plan

## 1. Tests first
- [x] 1.1 `test_eval_splits.py`: deterministic, 50/50, every workflow in both, bands balanced.
- [x] 1.2 `test_eval_compare.py`: identical runs → delta 0, interval contains 0;
      clearly worse run → flagged; paired on common tasks.
- [x] 1.3 `test_eval_canary.py`: every mutation moves its metric the right way on the v2 baseline run.
- [x] 1.4 `test_eval_review.py`: export is blind (no label/score/id strings), 30 rows,
      20 random + 10 targeted incl. injection task; import round-trip computes agreement.

## 2. Implementation
- [x] 2.1 `evals/splits.py` + committed `evals/data/splits_v2.json`; `--split` in run/replay.
- [x] 2.2 `evals/compare.py` (paired bootstrap).
- [x] 2.3 `evals/canary.py`.
- [x] 2.4 `evals/review.py` export/import + agreement report.

## 3. Evidence and docs
- [x] 3.1 Run canary on both baselines; compare v1-subset re-run vs v1 baseline (expect no flagged change).
- [x] 3.2 Holdout numbers for the v2 baseline in `evals/README.md`; process rules in `specs/README.md`.
- [x] 3.3 Export the review sheet for the owner.
- [ ] 3.4 Owner fills the sheet → `evals.review import` → label-review report (next session).
