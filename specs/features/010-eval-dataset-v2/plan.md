# 010 · Labelled task set v2 (100 tasks): plan

## 1. Schema and guide (tests first)

- [x] 1.1 Test: `unpredictable_physical` accepted as evidence; v2 file passes
      `load_dataset`; v1 records inside v2 are byte-identical to `tasks_v1.jsonl`.
- [x] 1.2 Add the evidence class to `schema.py` and `LABELING.md`; document v2
      provenance and the injection/German/terse/compound rules.

## 2. Dataset

- [x] 2.1 Write 50 new tasks in 8 workflows, labels blind (no model output seen).
- [x] 2.2 `tasks_v2.jsonl` = v1 lines + new lines; `check_data` passes and
      prints coverage; new-task coverage targets met (scripted check).

## 3. Report

- [x] 3.1 Test: report has an Edge cases section with every edge task.
- [x] 3.2 Implement in `report.py`; `DEFAULT_DATASET` → v2.

## 4. Baseline v2

- [ ] 4.1 Full run `--name baseline-v2` (3 repeats); commit run file + report.
- [ ] 4.2 Findings in `evals/README.md`, incl. v1 subset vs v1 baseline.

## 5. Docs

- [ ] 5.1 Roadmap `[x]`, CHANGELOG, root README numbers.
