"""Dev / holdout split of the labelled task set (roadmap item 011).

Tune prompts and pipeline changes on `dev`; report final numbers on `holdout`.
The split is per task inside each workflow (batches stay whole, as in production),
stratified by band, deterministic, and committed in data/splits_v2.json.

    python -m evals.splits            # (re)write data/splits_v2.json and print counts
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from typing import Any

from evals.schema import DEFAULT_DATASET, EVALS_DIR, load_dataset

SEED = "workscanai-eval-split-v2"
SPLITS_FILE = EVALS_DIR / "data" / "splits_v2.json"
SPLITS = ("dev", "holdout", "all")


def _key(task_id: str) -> str:
    return hashlib.sha256(f"{SEED}:{task_id}".encode()).hexdigest()


def assign_splits(records: list[dict[str, Any]]) -> dict[str, str]:
    """task id -> 'dev' | 'holdout'.

    Per band, tasks are ordered by (workflow, seeded hash) and alternate
    dev/holdout, so each band splits evenly and each workflow lands on both sides.
    """
    out: dict[str, str] = {}
    for band in ("low", "mid", "high"):
        ids = sorted((r for r in records if r["label"]["band"] == band),
                     key=lambda r: (r["workflow_id"], _key(r["id"])))
        start = len(out) % 2          # keep the running total balanced across bands
        for i, r in enumerate(ids):
            out[r["id"]] = ("dev", "holdout")[(i + start) % 2]
    # Guarantee every workflow appears on both sides (tiny workflows could miss one).
    for wf in {r["workflow_id"] for r in records}:
        ids = sorted((r["id"] for r in records if r["workflow_id"] == wf), key=_key)
        sides = Counter(out[i] for i in ids)
        if len(sides) == 1:
            out[ids[0]] = "holdout" if "dev" in sides else "dev"
    return {tid: out[tid] for tid in sorted(out)}


def load_assignment() -> dict[str, str]:
    return json.loads(SPLITS_FILE.read_text(encoding="utf-8"))["assignment"]


def filter_records(records: list[dict[str, Any]], split: str) -> list[dict[str, Any]]:
    if split not in SPLITS:
        raise ValueError(f"split must be one of {SPLITS}")
    if split == "all":
        return records
    assignment = load_assignment()
    return [r for r in records if assignment.get(r["id"]) == split]


def main() -> int:
    recs = load_dataset(DEFAULT_DATASET)
    assignment = assign_splits(recs)
    SPLITS_FILE.write_text(json.dumps({
        "dataset": "evals/data/tasks_v2.jsonl", "seed": SEED,
        "rule": "per band, ordered by (workflow, seeded hash), alternating dev/holdout",
        "assignment": assignment}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    by = Counter(assignment.values())
    print(f"wrote {SPLITS_FILE.name}: {dict(by)}")
    for band in ("low", "mid", "high"):
        print(f"  {band:5}", dict(Counter(assignment[r['id']] for r in recs if r['label']['band'] == band)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
