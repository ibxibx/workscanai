"""Tests for the eval trust checks (roadmap item 011): splits, compare, canary, review.
No API key, no network. Uses the committed v2 baseline run file as real data."""
import json
import sys
from collections import Counter
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from evals import canary, compare, review, splits  # noqa: E402
from evals import run as runner  # noqa: E402
from evals.schema import DEFAULT_DATASET, EVALS_DIR, load_dataset  # noqa: E402

BASELINE_V2 = EVALS_DIR / "runs" / "baseline-v2-20261002T090155Z.jsonl"


# ---------------------------------------------------------------- splits
class TestSplits:
    def test_deterministic_and_committed(self):
        recs = load_dataset(DEFAULT_DATASET)
        assert splits.assign_splits(recs) == splits.assign_splits(recs)
        committed = json.loads((EVALS_DIR / "data" / "splits_v2.json").read_text(encoding="utf-8"))
        assert committed["assignment"] == splits.assign_splits(recs)

    def test_half_and_half_every_workflow_both_sides(self):
        recs = load_dataset(DEFAULT_DATASET)
        a = splits.assign_splits(recs)
        assert Counter(a.values()) == {"dev": 50, "holdout": 50}
        for wf in {r["workflow_id"] for r in recs}:
            sides = {a[r["id"]] for r in recs if r["workflow_id"] == wf}
            assert sides == {"dev", "holdout"}, wf

    def test_bands_roughly_balanced(self):
        recs = load_dataset(DEFAULT_DATASET)
        a = splits.assign_splits(recs)
        for band in ("low", "mid", "high"):
            n = Counter(a[r["id"]] for r in recs if r["label"]["band"] == band)
            assert abs(n["dev"] - n["holdout"]) <= 4, (band, n)

    def test_filter(self):
        recs = load_dataset(DEFAULT_DATASET)
        dev = splits.filter_records(recs, "dev")
        assert len(dev) == 50 and len(splits.filter_records(recs, "all")) == 100


# ---------------------------------------------------------------- compare
def _calls():
    return runner.read_run(BASELINE_V2)[1]


class TestCompare:
    def test_identical_runs_show_no_change(self):
        res = runner.results_from_calls(_calls())
        rows = compare.compare_results(load_dataset(DEFAULT_DATASET), res, res, iters=200)
        for row in rows:
            assert row["delta"] == pytest.approx(0)
            assert not row["significant"], row["metric"]

    def test_clearly_worse_run_is_flagged(self):
        base = runner.results_from_calls(_calls())
        worse_calls = canary.mutate_calls(_calls(), "decision_none")
        worse = runner.results_from_calls(worse_calls)
        rows = {r["metric"]: r for r in compare.compare_results(load_dataset(DEFAULT_DATASET), base, worse, iters=300)}
        d = rows["decision_accuracy"]
        assert d["delta"] < -0.3 and d["significant"]
        assert d["ci_low"] <= d["delta"] <= d["ci_high"]

    def test_markdown_lists_every_metric(self):
        res = runner.results_from_calls(_calls())
        md = compare.render(compare.compare_results(load_dataset(DEFAULT_DATASET), res, res, iters=50),
                            "a.jsonl", "b.jsonl", "all")
        for name in compare.METRICS:
            assert name in md


# ---------------------------------------------------------------- canary
def test_every_canary_mutation_is_detected():
    results = canary.run_checks(BASELINE_V2)
    assert {r["mutation"] for r in results} == set(canary.MUTATIONS)
    failed = [r for r in results if not r["passed"]]
    assert not failed, failed


def test_canary_detects_a_harness_that_ignores_breakage(monkeypatch):
    # If the metric under test stops reacting, the canary must fail.
    real = canary.METRIC_FUNCS["incomplete_rate"]
    monkeypatch.setitem(canary.METRIC_FUNCS, "incomplete_rate", lambda s: 0.0)
    try:
        results = canary.run_checks(BASELINE_V2)
        assert any(not r["passed"] and r["mutation"] == "drop_last_block" for r in results)
    finally:
        canary.METRIC_FUNCS["incomplete_rate"] = real


# ---------------------------------------------------------------- review
class TestReview:
    def test_selection_is_20_random_plus_10_targeted(self):
        sel = review.select_tasks(load_dataset(DEFAULT_DATASET), BASELINE_V2)
        assert len(sel) == 30 and len({s["task_id"] for s in sel}) == 30
        assert Counter(s["reason"] for s in sel) == {"random": 20, "targeted": 10}
        assert "studio-04" in {s["task_id"] for s in sel}
        assert sel == review.select_tasks(load_dataset(DEFAULT_DATASET), BASELINE_V2)  # seeded

    def test_export_is_blind(self, tmp_path):
        recs = load_dataset(DEFAULT_DATASET)
        sel = review.select_tasks(recs, BASELINE_V2)
        xlsx = tmp_path / "r.xlsx"
        review.export_sheet(recs, sel, xlsx)
        text = review.sheet_text(xlsx)
        by_id = {r["id"]: r for r in recs}
        for s in sel:
            rec = by_id[s["task_id"]]
            assert rec["description"] in text
            assert s["task_id"] not in text
            assert rec["label"]["rationale"] not in text
        assert "score_min" not in text and "labeled_by" not in text

    def test_import_round_trip_and_agreement(self, tmp_path):
        recs = load_dataset(DEFAULT_DATASET)
        sel = review.select_tasks(recs, BASELINE_V2)
        xlsx = tmp_path / "r.xlsx"
        review.export_sheet(recs, sel, xlsx)
        by_id = {r["id"]: r for r in recs}
        # A reviewer who copies the labels exactly must agree 100%.
        answers = {s["review_id"]: (by_id[s["task_id"]]["label"]["score_min"],
                                    by_id[s["task_id"]]["label"]["score_max"],
                                    by_id[s["task_id"]]["label"]["decision_layer"]) for s in sel}
        review.fill_sheet_for_test(xlsx, answers)
        rows = review.read_sheet(xlsx, sel)
        assert len(rows) == 30
        agg = review.agreement(rows, recs, BASELINE_V2)
        assert agg["random"]["vs_labels"]["band_agreement"] == pytest.approx(1.0)
        assert agg["random"]["vs_labels"]["decision_agreement"] == pytest.approx(1.0)
        assert agg["random"]["vs_labels"]["mean_midpoint_gap"] == pytest.approx(0.0)
        assert 0 <= agg["random"]["vs_model"]["band_agreement"] <= 1

    def test_import_rejects_incomplete_sheet(self, tmp_path):
        recs = load_dataset(DEFAULT_DATASET)
        sel = review.select_tasks(recs, BASELINE_V2)
        xlsx = tmp_path / "r.xlsx"
        review.export_sheet(recs, sel, xlsx)
        with pytest.raises(ValueError, match="R01"):
            review.read_sheet(xlsx, sel)


def test_replay_can_report_on_holdout_only(tmp_path):
    out = tmp_path / "h.md"
    assert runner.main(["--replay", str(BASELINE_V2), "--split", "holdout", "--out", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert "**holdout** only" in text
    assert "| Tasks × repeats | 50 × 3 = 150 results" in text
