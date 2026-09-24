"""Unit tests for evals/metrics.py (roadmap item 002). No API key, no network.

Expected values are computed by hand in the comments.
"""
import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from evals import metrics as m  # noqa: E402


def _result(score, r=80, d=80, e=60, i=60, **kw):
    base = {"ai_readiness_score": score, "score_repeatability": r, "score_data_availability": d,
            "score_error_tolerance": e, "score_integration": i, "countdown_window": "12-24",
            "risk_level": "safe", "decision_layer": "partial", "score_confidence": "medium"}
    base.update(kw)
    return base


def _label(lo, hi, band, decision="partial", sensitive=False):
    return {"score_min": lo, "score_max": hi, "band": band, "decision_layer": decision,
            "sensitive": sensitive}


class TestDistance:
    def test_inside_range_is_zero(self):
        assert m.distance_to_range(85, 80, 95) == 0

    def test_below_and_above(self):
        assert m.distance_to_range(70, 80, 95) == 10
        assert m.distance_to_range(99, 80, 95) == 4

    def test_signed_error_direction(self):
        assert m.signed_error(70, 80, 95) == -10   # model under-scores
        assert m.signed_error(99, 80, 95) == 4     # model over-scores
        assert m.signed_error(90, 80, 95) == 0


class TestSpearman:
    def test_perfect_and_inverse(self):
        assert m.spearman([1, 2, 3, 4], [10, 20, 30, 40]) == pytest.approx(1.0)
        assert m.spearman([1, 2, 3, 4], [40, 30, 20, 10]) == pytest.approx(-1.0)

    def test_ties_use_average_ranks(self):
        # x ranks [1, 2.5, 2.5, 4], y ranks [1, 2, 3, 4]
        # cov = 4.5, var_x = 4.5, var_y = 5  ->  4.5 / sqrt(22.5) = 0.948683
        assert m.spearman([1, 2, 2, 3], [1, 2, 3, 4]) == pytest.approx(0.948683, abs=1e-6)

    def test_undefined_cases_return_none(self):
        assert m.spearman([1], [1]) is None
        assert m.spearman([5, 5, 5], [1, 2, 3]) is None


class TestSilentFailure:
    def test_missing_sub_score_means_defaults_were_used(self):
        assert m.is_silent_failure(_result(50.0, r=None, d=None, e=None, i=None))
        assert m.is_silent_failure(_result(50.0, r=None))

    def test_complete_result_is_not_silent(self):
        assert not m.is_silent_failure(_result(74.0))


class TestRuleViolations:
    def test_clean_result(self):
        # 0.3*80 + 0.3*80 + 0.2*60 + 0.2*60 = 72
        assert m.rule_violations(_result(72.0), _label(60, 80, "high")) == []

    def test_composite_mismatch_beyond_tolerance(self):
        # recomputed 72, reported 80 -> mismatch; 72.8 is within +-1
        assert "composite_mismatch" in m.rule_violations(_result(80.0), _label(60, 80, "high"))
        assert m.rule_violations(_result(72.8), _label(60, 80, "high")) == []

    def test_now_requires_75(self):
        res = _result(72.0, countdown_window="now")
        assert "now_below_75" in m.rule_violations(res, _label(60, 80, "high"))

    def test_warning_only_for_sensitive_tasks(self):
        res = _result(72.0, risk_level="warning")
        assert "warning_not_sensitive" in m.rule_violations(res, _label(60, 80, "high", sensitive=False))
        assert m.rule_violations(res, _label(60, 80, "high", sensitive=True)) == []

    def test_out_of_range_score(self):
        res = _result(72.0, e=130)
        assert "out_of_range" in m.rule_violations(res, _label(60, 80, "high"))


class TestConfusion:
    def test_counts(self):
        pairs = [("none", "none"), ("full", "partial"), ("full", "full"), ("partial", "partial")]
        cm = m.confusion(pairs, ["none", "partial", "full"])
        assert cm["full"]["partial"] == 1
        assert cm["full"]["full"] == 1
        assert cm["none"]["none"] == 1
        assert sum(sum(row.values()) for row in cm.values()) == 4


class TestSummarize:
    def test_end_to_end_numbers(self):
        records = [
            {"id": "a", "label": _label(80, 95, "high", decision="none")},
            {"id": "b", "label": _label(10, 30, "low", decision="full")},
            {"id": "c", "label": _label(40, 60, "mid", decision="partial")},
        ]
        results = {
            # a: scores 72 and 78 -> mean 75 (band high: correct; distance 5 below range)
            "a": [_result(72.0, decision_layer="none"),
                  _result(78.0, r=90, d=90, e=60, i=60, decision_layer="none")],
            # b: one real score 40 (band mid: wrong; distance +10), one silent failure
            "b": [_result(40.0, r=40, d=40, e=40, i=40, decision_layer="partial"),
                  _result(50.0, r=None, d=None, e=None, i=None)],
            # c: 50 and 50 -> inside range
            "c": [_result(50.0, r=50, d=50, e=50, i=50), _result(50.0, r=50, d=50, e=50, i=50)],
        }
        s = m.summarize(records, results)
        assert s["n_tasks"] == 3
        assert s["n_results"] == 6
        assert s["silent_failure_rate"] == pytest.approx(1 / 6)
        assert s["band_accuracy"] == pytest.approx(2 / 3)       # a, c right; b wrong
        assert s["in_range_rate"] == pytest.approx(1 / 3)       # only c
        assert s["mae_distance"] == pytest.approx((5 + 10 + 0) / 3)
        assert s["mean_signed_error"] == pytest.approx((-5 + 10 + 0) / 3)
        # task means 75, 40, 50 vs label midpoints 87.5, 20, 50 -> same order -> 1.0
        assert s["spearman"] == pytest.approx(1.0)
        assert s["decision_accuracy"] == pytest.approx(2 / 3)   # b predicted partial, label full
        # stability: a = pstdev(72, 78) = 3; b has one valid score -> excluded; c = 0
        assert s["stability_mean_sd"] == pytest.approx(1.5)
        assert s["stability_max_sd"] == pytest.approx(3.0)
        # violations on valid results only: a/72 fine (72 recomputed), a/78:
        # 0.3*90+0.3*90+0.2*60+0.2*60 = 78 fine; b/40 fine; c fine -> 0
        assert s["violation_rate"] == 0
        assert not math.isnan(s["band_accuracy"])

    def test_all_silent_task_counts_as_wrong(self):
        records = [{"id": "x", "label": _label(80, 95, "high")}]
        results = {"x": [_result(50.0, r=None, d=None, e=None, i=None)]}
        s = m.summarize(records, results)
        assert s["band_accuracy"] == 0
        assert s["tasks_without_valid_result"] == ["x"]
