# 011 · Trust checks for the eval harness: validation

## Acceptance checks

- [x] A1 Review export: 30 tasks, 20 random (7 low / 7 mid / 6 high) + 10 targeted
      incl. `studio-04`; seeded (same selection twice); sheet contains no labels,
      scores, task ids or label field names (tests).
- [x] A2 Review import: a reviewer who copies the labels gets 100% band and
      decision agreement and 0 midpoint gap; an unfilled sheet is rejected naming
      the row (tests).
- [x] A3 Canary: all 5 mutations detected on both committed baselines; a harness
      whose metric stops reacting makes the canary fail (test).
- [x] A4 Compare: identical runs → every Δ = 0 and nothing flagged; an
      all-"none" decision run is flagged worse on decision accuracy (tests).
      v1 re-run vs v1 baseline flags nothing.
- [x] A5 Split: 50/50, every workflow on both sides, bands within ±1, deterministic
      and equal to the committed file (tests). `--split holdout` replay reports 50 tasks.
- [x] A6 Both committed baseline reports replay byte-identically (no format change for `--split all`).
- [x] A7 `backend/app` and dataset files unchanged.
- [ ] A8 Owner's filled review imported and agreement report committed (follow-up, needs the owner).

## Quality gates

- [x] Backend tests green
- [x] Frontend: not touched

## Evidence

```
> python -m pytest backend/tests/test_eval_trust.py -q         (before evals/splits|canary|compare|review existed)
1 error during collection
> python -m pytest backend/tests -q                             (laptop, after)
see PR description

> python -m evals.canary evals/runs/baseline-v2-20261002T090155Z.jsonl
mutation           metric             expect     base  mutated  result
drop_last_block    incomplete_rate    up        0.010    0.163  PASS
corrupt_composite  violation_rate     up        0.374    1.000  PASS
invert_scores      spearman           down      0.926   -0.926  PASS
decision_none      decision_accuracy  down      0.770    0.250  PASS
misname_field      malformed_rate     up        0.010    1.000  PASS
all mutations detected
(v1 baseline: all mutations detected)

> python -m evals.compare evals/runs/baseline-20260924T210035Z.jsonl evals/runs/baseline-v2-20261002T090155Z.jsonl
Split: all · 50 tasks · 95% paired-bootstrap intervals over tasks.
| band_accuracy     | 0.720 | 0.740 | +0.020 | [-0.040, +0.100] | no clear change |
| spearman          | 0.934 | 0.950 | +0.016 | [-0.004, +0.052] | no clear change |
| decision_accuracy | 0.860 | 0.880 | +0.020 | [-0.040, +0.100] | no clear change |
| violation_rate    | 0.360 | 0.320 | -0.040 | [-0.120, +0.027] | no clear change |
(all 8 metrics: no clear change)

> python -m evals.splits
wrote splits_v2.json: {'holdout': 50, 'dev': 50}
  low   {'holdout': 13, 'dev': 14}
  mid   {'holdout': 17, 'dev': 16}
  high  {'holdout': 20, 'dev': 20}

> python -m evals.review export
wrote evals/review/review_v2.xlsx (30 tasks: {'targeted': 10, 'random': 20})
```

## Review notes

- The review sheet is blind by construction and by test; the row→task mapping
  lives in `review/selection_v2.json`, which the reviewer should not open.
- Holdout numbers are published as the baseline to beat; from 003 on, prompt
  work looks only at dev.
