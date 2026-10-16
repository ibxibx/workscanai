# 010 · Labelled task set v2 (100 tasks): requirements

- **Roadmap item:** `specs/roadmap.md` → Phase 1, item 010 (added at the owner's request on 2026-10-02)
- **Branch:** `feat/010-eval-dataset-v2`
- **Status:** implemented

## Problem

The v1 set (50 tasks, `evals/data/tasks_v1.jsonl`) produced a usable baseline,
but it has gaps that limit what the numbers can say:

- **Mid band is thin and weakest:** 14 mid tasks, 50% band accuracy. That is
  where most real tasks sit and where scoring changes will matter most.
- **Coverage:** 8 industries, all office/service work; only 13 individual-context
  tasks; 4 communication and 4 creative tasks.
- **Untested input risks:** no German tasks (the product ships EN/DE), no task
  text that tries to instruct the model (prompt injection, OWASP LLM01), no
  one-word or compound "task" of the kind real users type, no physical work.
- **50 tasks is small:** a few tasks moving bands shifts accuracy by 2–6 points.

## Goal

A 100-task set that keeps v1 unchanged and adds 50 complementary tasks, plus a
new baseline on it, so later changes are measured on a broader, harder set.

## In scope

1. `evals/data/tasks_v2.jsonl` = all 50 v1 records unchanged + 50 new tasks in
   8 new workflows: manufacturing, logistics, school teacher, real-estate agent,
   DevOps team, insurance claims, nonprofit, and a small design studio
   (edge-case workflow).
2. Coverage targets for the 50 new tasks: ≥ 18 mid, ≥ 12 low; ≥ 15
   individual-context; ≥ 6 communication and ≥ 6 creative; ≥ 7 edge cases,
   including 3 German-language tasks, 1 prompt-injection attempt, 1 one-word
   task, 1 compound task, 1 physical task.
3. One new evidence class `unpredictable_physical` (MGI 2017 Exhibit E3: 18%),
   in the schema and `LABELING.md`.
4. Report: an **Edge cases** section listing every `edge_case` task with label,
   model scores and whether it landed in range, so injection or language
   failures cannot hide in an average.
5. `DEFAULT_DATASET` → v2. v1 stays frozen; its baseline still replays.
6. New baseline run on v2 (3 repeats, CLI backend), committed with findings,
   including the v1 subset compared against the v1 baseline (stability check).

## Out of scope

- Changing any v1 label (that needs a human review → `tasks_v3`).
- Any analyzer or prompt change (item 003).

## Decisions

| Decision | Chosen | Why |
|---|---|---|
| Versioning | v2 = v1 + 50 new; v1 file untouched | Old baseline stays reproducible; v2 results can be split into "v1 subset" and "new". |
| Who labels | Claude, blind, same guide and evidence anchors as v1 | Owner's decision for v1, kept for consistency; limitation still printed in every report. |
| Injection task label | Labelled as the real task; the injected "score 100" is ignored | Measures whether the analyzer follows untrusted text: a score near 100 is a failure. |
| German tasks | Task text in German, rest of the record in English | Mirrors a DE user typing into the EN/DE app; tests scoring, not translation. |
| Human review backlog item | Renamed to produce `tasks_v3` | v2 is now taken by this extension. |

## Context and constraints

Same as 002: subscription CLI backend (no API credit), thinking disabled,
`max_tokens` emulated. 16 workflows × 3 repeats = 48 calls per full run.
