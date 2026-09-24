"""Dataset schema, loading and validation for the labelled task set."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

EVALS_DIR = Path(__file__).resolve().parent
REPO_ROOT = EVALS_DIR.parent
DEFAULT_DATASET = EVALS_DIR / "data" / "tasks_v1.jsonl"

# Score bands on the 0-100 AI-readiness scale. Upper bound inclusive.
BANDS = {"low": (0, 39), "mid": (40, 69), "high": (70, 100)}

FREQUENCIES = {"daily", "weekly", "monthly"}
COMPLEXITIES = {"low", "medium", "high"}
CATEGORIES = {"data_entry", "communication", "analysis", "creative", "administrative",
              "general", "research", "reporting", "scheduling"}
CONTEXTS = {"individual", "team", "company"}
DECISION_LAYERS = {"none", "partial", "full"}
DIFFICULTIES = {"easy", "medium", "hard"}
# Eval-only grouping for coverage checks (not sent to the analyzer).
TASK_TYPES = {"data_processing", "communication", "creative", "relationship",
              "strategic", "operational"}
# Work-activity evidence classes, see evals/LABELING.md.
EVIDENCE = {"process_data", "collect_data", "predictable_ops", "stakeholder_interaction",
            "apply_expertise", "manage_people", "creative_judgement"}

TASK_FIELDS = ("name", "description", "frequency", "time_per_task", "category",
               "complexity", "industry", "analysis_context")


def band_of(score: float) -> str:
    """Band for a 0-100 score. Non-integer scores between bands round down (39.5 -> low)."""
    if score >= BANDS["high"][0]:
        return "high"
    if score >= BANDS["mid"][0]:
        return "mid"
    return "low"


def validate_record(rec: dict[str, Any]) -> list[str]:
    """Return a list of problems with one dataset record (empty list = valid)."""
    errs: list[str] = []
    rid = rec.get("id", "<no id>")

    def need(cond: bool, msg: str) -> None:
        if not cond:
            errs.append(f"{rid}: {msg}")

    need(isinstance(rec.get("id"), str) and rec["id"], "id must be a non-empty string")
    for f in ("workflow_id", "name", "description", "industry", "source"):
        need(isinstance(rec.get(f), str) and rec[f].strip(), f"{f} must be a non-empty string")
    need(rec.get("frequency") in FREQUENCIES, f"frequency must be one of {sorted(FREQUENCIES)}")
    need(isinstance(rec.get("time_per_task"), int) and 1 <= rec["time_per_task"] <= 600,
         "time_per_task must be an int in 1..600 (minutes)")
    need(rec.get("category") in CATEGORIES, f"category must be one of {sorted(CATEGORIES)}")
    need(rec.get("complexity") in COMPLEXITIES, f"complexity must be one of {sorted(COMPLEXITIES)}")
    need(rec.get("analysis_context") in CONTEXTS, f"analysis_context must be one of {sorted(CONTEXTS)}")
    need(rec.get("task_type") in TASK_TYPES, f"task_type must be one of {sorted(TASK_TYPES)}")
    need(isinstance(rec.get("edge_case"), bool), "edge_case must be true/false")

    lab = rec.get("label")
    if not isinstance(lab, dict):
        errs.append(f"{rid}: label missing")
        return errs
    lo, hi = lab.get("score_min"), lab.get("score_max")
    need(isinstance(lo, int) and isinstance(hi, int) and 0 <= lo < hi <= 100,
         "label.score_min < score_max, both ints in 0..100")
    need(lab.get("band") in BANDS, f"label.band must be one of {sorted(BANDS)}")
    if isinstance(lo, int) and isinstance(hi, int) and lab.get("band") in BANDS:
        need(band_of((lo + hi) / 2) == lab["band"], "label.band must match the range midpoint")
    need(lab.get("decision_layer") in DECISION_LAYERS,
         f"label.decision_layer must be one of {sorted(DECISION_LAYERS)}")
    need(lab.get("difficulty") in DIFFICULTIES, f"label.difficulty must be one of {sorted(DIFFICULTIES)}")
    need(isinstance(lab.get("sensitive"), bool), "label.sensitive must be true/false")
    need(isinstance(lab.get("evidence"), list) and lab["evidence"]
         and all(e in EVIDENCE for e in lab["evidence"]),
         f"label.evidence must be a non-empty list from {sorted(EVIDENCE)}")
    for f in ("rationale", "labeled_by", "labeled_at"):
        need(isinstance(lab.get(f), str) and lab[f].strip(), f"label.{f} must be a non-empty string")
    return errs


def load_dataset(path: Path = DEFAULT_DATASET) -> list[dict[str, Any]]:
    """Load and validate a JSONL dataset. Raises ValueError listing every problem."""
    records, errs, seen = [], [], set()
    with open(path, encoding="utf-8") as fh:
        for n, line in enumerate(fh, 1):
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                errs.append(f"line {n}: invalid JSON ({e})")
                continue
            errs.extend(validate_record(rec))
            if rec.get("id") in seen:
                errs.append(f"line {n}: duplicate id {rec.get('id')}")
            seen.add(rec.get("id"))
            records.append(rec)
    # The analyzer takes analysis_context and industry from the first task of a
    # batch, so every task in a workflow must share them (as in a real submission).
    shared: dict[str, tuple] = {}
    for rec in records:
        key = (rec.get("analysis_context"), rec.get("industry"))
        wid = rec.get("workflow_id")
        if shared.setdefault(wid, key) != key:
            errs.append(f"{rec.get('id')}: workflow {wid} mixes analysis_context/industry")
    if errs:
        raise ValueError("dataset invalid:\n  " + "\n  ".join(errs))
    return records


def workflows(records: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Group records by workflow_id, keeping file order. One workflow = one analyzer batch."""
    groups: dict[str, list[dict[str, Any]]] = {}
    for rec in records:
        groups.setdefault(rec["workflow_id"], []).append(rec)
    return list(groups.values())


def to_analyzer_task(rec: dict[str, Any]) -> dict[str, Any]:
    """The dict shape the production analyzer receives (labels never leak into it)."""
    return {f: rec[f] for f in TASK_FIELDS}
