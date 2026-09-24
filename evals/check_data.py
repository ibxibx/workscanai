"""Validate the labelled dataset and print coverage counts.

    python -m evals.check_data [path]

Exit code 1 if the dataset is invalid or misses a coverage target.
"""
from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from evals.schema import DEFAULT_DATASET, load_dataset

# Coverage targets from specs/features/002-eval-harness/requirements.md
MIN_TASKS = 45
MIN_PER_BAND = 12
MIN_EDGE_CASES = 5
REQUIRED_TASK_TYPES = {"data_processing", "communication", "creative", "relationship", "strategic"}
REQUIRED_CONTEXTS = {"individual", "team", "company"}


def coverage_problems(records: list[dict]) -> list[str]:
    problems = []
    bands = Counter(r["label"]["band"] for r in records)
    if len(records) < MIN_TASKS:
        problems.append(f"only {len(records)} tasks (need >= {MIN_TASKS})")
    for band in ("low", "mid", "high"):
        if bands[band] < MIN_PER_BAND:
            problems.append(f"band {band}: {bands[band]} tasks (need >= {MIN_PER_BAND})")
    missing_types = REQUIRED_TASK_TYPES - {r["task_type"] for r in records}
    if missing_types:
        problems.append(f"missing task types: {sorted(missing_types)}")
    missing_ctx = REQUIRED_CONTEXTS - {r["analysis_context"] for r in records}
    if missing_ctx:
        problems.append(f"missing contexts: {sorted(missing_ctx)}")
    edges = sum(r["edge_case"] for r in records)
    if edges < MIN_EDGE_CASES:
        problems.append(f"only {edges} edge cases (need >= {MIN_EDGE_CASES})")
    return problems


def main(argv: list[str]) -> int:
    path = Path(argv[0]) if argv else DEFAULT_DATASET
    try:
        records = load_dataset(path)
    except ValueError as e:
        print(e)
        return 1
    print(f"{path.name}: {len(records)} tasks, {len({r['workflow_id'] for r in records})} workflows")
    for field in ("band", "decision_layer", "difficulty", "sensitive"):
        print(f"  {field:15}", dict(sorted(Counter(str(r['label'][field]) for r in records).items())))
    for field in ("task_type", "analysis_context", "category", "edge_case"):
        print(f"  {field:15}", dict(sorted(Counter(str(r[field]) for r in records).items())))
    problems = coverage_problems(records)
    for p in problems:
        print("COVERAGE:", p)
    print("OK" if not problems else "FAILED")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
