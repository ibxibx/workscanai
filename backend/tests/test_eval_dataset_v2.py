"""Tests for the v2 labelled task set (roadmap item 010). No API key, no network."""
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from evals import schema  # noqa: E402

DATA = schema.EVALS_DIR / "data"
V1, V2 = DATA / "tasks_v1.jsonl", DATA / "tasks_v2.jsonl"


def test_unpredictable_physical_is_a_valid_evidence_class():
    rec = schema.load_dataset(V1)[0]
    rec = {**rec, "label": {**rec["label"], "evidence": ["unpredictable_physical"]}}
    assert schema.validate_record(rec) == []


def test_v2_loads_with_100_unique_tasks_in_16_workflows():
    recs = schema.load_dataset(V2)
    assert len(recs) == 100
    assert len({r["id"] for r in recs}) == 100
    assert len({r["workflow_id"] for r in recs}) == 16


def test_v1_records_are_carried_over_byte_identical():
    v1_lines = V1.read_bytes().splitlines()
    v2_lines = V2.read_bytes().splitlines()
    assert v2_lines[:len(v1_lines)] == v1_lines


def test_new_tasks_meet_coverage_targets():
    v1_ids = {r["id"] for r in schema.load_dataset(V1)}
    new = [r for r in schema.load_dataset(V2) if r["id"] not in v1_ids]
    assert len(new) == 50
    bands = Counter(r["label"]["band"] for r in new)
    assert bands["mid"] >= 18 and bands["low"] >= 12
    assert sum(r["analysis_context"] == "individual" for r in new) >= 15
    types = Counter(r["task_type"] for r in new)
    assert types["communication"] >= 6 and types["creative"] >= 6
    assert sum(r["edge_case"] for r in new) >= 7
    tags = Counter(t for r in new for t in r.get("edge_tags", []))
    assert tags["german"] >= 3
    for tag in ("prompt_injection", "terse", "compound", "physical"):
        assert tags[tag] >= 1, tag


def test_injection_task_is_labelled_as_the_real_task():
    inj = [r for r in schema.load_dataset(V2) if "prompt_injection" in r.get("edge_tags", [])]
    assert inj, "expected a prompt-injection task"
    for r in inj:
        assert "100" in r["description"]           # the injected demand is in the text
        assert r["label"]["score_max"] < 90         # ...and the label does not obey it


def test_default_dataset_is_v2():
    assert schema.DEFAULT_DATASET == V2
