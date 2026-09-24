# Labelling guide: WorkScanAI task set

How the ground-truth labels in `data/tasks_v1.jsonl` are written. A label says
what a careful analyst applying **WorkScanAI's own rubric** should conclude
about a task. It is not a guess at what the model will output.

## Rules

1. **Blind.** Labels are written before any model output for that task is
   seen, and are not changed after looking at a run. Correcting a genuine
   labelling mistake is allowed only in a new dataset version (`tasks_v2`),
   with the reason recorded in its `label.rationale`.
2. **Ranges, not points.** `score_min`–`score_max` is the range a reviewer
   would accept (typically 15–25 points wide). The `band` must contain the
   range midpoint.
3. **Evidence first.** Each label names one or more work-activity evidence
   classes (below) and the rationale says why the task sits where it does.
4. **Record who.** `labeled_by` and `labeled_at` on every label.

## The rubric (same as the production prompt)

The analyzer scores four dimensions 0–100 and combines them:

`composite = 0.3 × Repeatability + 0.3 × Data availability + 0.2 × Error tolerance + 0.2 × Integration`

| Dimension | High (80–100) | Low (20–50) |
|---|---|---|
| Repeatability | identical steps every time | varies by context / stakeholder |
| Data availability | structured data, APIs, databases | qualitative, political, relationship-based |
| Error tolerance | mistakes are caught easily, low stakes | mistakes cause real damage (strategy, trade-offs, PII, legal, medical) |
| Integration | plugs into existing tools | needs custom work or org change |

Bands: **low** 0–39 · **mid** 40–69 · **high** 70–100.

**Decision layer.** `none`: the whole task can be delegated. `partial`: AI
gathers or drafts, a human decides or signs off. `full`: human judgement is
needed throughout (relationships, negotiation, people decisions, strategy).

**Difficulty.** `easy`: tools exist today, setup under a week. `medium`:
integration work or human-in-the-loop checks. `hard`: strategic judgement,
custom development or organisational change.

**Sensitive.** `true` when the task handles personal, financial, legal or
medical data. The prompt reserves risk level `warning` for these tasks only.

## Evidence classes

Anchored in McKinsey Global Institute, *A Future That Works* (2017),
Exhibit E3: share of time in each activity type that is technically
automatable with demonstrated technology (US). Generative AI raises the
ceiling for writing and information work (Eloundou et al., *GPTs are GPTs*,
2023), so drafting tasks sit higher than the 2017 numbers alone would suggest,
while judgement-heavy work stays low.

| Class | MGI 2017 | Typical label range | Examples |
|---|---|---|---|
| `predictable_ops` | predictable physical 81% (digital analogue: fixed routines) | 70–95 | scheduled exports, reminders, file routing |
| `process_data` | processing data 69% | 65–95 | reconciliation, formatting, report assembly |
| `collect_data` | collecting data 64% | 60–90 | pulling metrics, gathering documents |
| `creative_judgement` | not in MGI; GenAI-exposed drafting | 40–70 | copy drafts, campaign concepts |
| `stakeholder_interaction` | 16% | 20–55 | client calls, negotiations, escalations |
| `apply_expertise` | 12% | 20–60 | legal judgement, diagnosis-adjacent calls, prioritisation |
| `manage_people` | 7% | 5–35 | coaching, hiring decisions, conflict resolution |

Then adjust for the task's stakes: sensitive data or costly errors pull the
Error-tolerance score, and so the composite, down.

## Worked examples

- **"Export last week's ad spend from Google Ads and Meta into the reporting
  sheet"**: `process_data`, `collect_data`. Identical steps, APIs exist,
  errors are visible. → 80–95, high, decision layer `none`, easy.
- **"Draft three subject-line variants for the monthly newsletter"**:
  `creative_judgement`. AI drafts well, a human picks. → 55–75 would straddle
  bands, so pick the honest range: 50–68, mid, `partial`, easy.
- **"Decide which two roadmap items to cut this quarter"**: `apply_expertise`,
  `stakeholder_interaction`. Trade-offs and implicit org context; the prompt
  itself says strategic tasks rarely exceed 70. → 20–40, low, `full`, hard.

## Provenance of v1

`tasks_v1` task texts and labels were written by Claude (Opus, via Claude Code)
on 2026-09-24 at the owner's request, following this guide and before any run
of the analyzer on these tasks. Because the scorer is also a Claude model,
agreement may be flattered by shared model habits. That limitation is stated in
every report, and a human review of the labels (`reviewed_by`) is the first
planned improvement.
