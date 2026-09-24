"""Pure metric functions for the evaluation harness. No I/O, no API calls.

Terminology:
- result: one analyzer output dict for one task in one repeat.
- valid result: a result where all four sub-scores are present. Missing
  sub-scores mean the analyzer fell back to its defaults (API error or a
  missing ---TASK_N--- block): a *silent failure*.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from statistics import mean, pstdev
from typing import Any, Iterable

from evals.schema import band_of

SUB_SCORES = ("score_repeatability", "score_data_availability",
              "score_error_tolerance", "score_integration")
WEIGHTS = (0.3, 0.3, 0.2, 0.2)          # composite rule stated in the production prompt
COMPOSITE_TOLERANCE = 1.0               # allow rounding in the model's arithmetic
NOW_MIN_SCORE = 75                      # prompt: 'now' only if score >= 75
DECISION_LAYERS = ["none", "partial", "full"]


def distance_to_range(score: float, lo: float, hi: float) -> float:
    """0 inside [lo, hi], otherwise the distance to the nearest bound."""
    return max(0.0, lo - score, score - hi)


def signed_error(score: float, lo: float, hi: float) -> float:
    """Like distance_to_range, but negative when the score is below the range."""
    if score < lo:
        return score - lo
    if score > hi:
        return score - hi
    return 0.0


def _ranks(values: list[float]) -> list[float]:
    """1-based ranks, ties get the average of the ranks they span."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(xs: list[float], ys: list[float]) -> float | None:
    """Spearman rank correlation (Pearson on average ranks). None if undefined."""
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    rx, ry = _ranks(list(xs)), _ranks(list(ys))
    mx, my = mean(rx), mean(ry)
    cov = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    vx = sum((a - mx) ** 2 for a in rx)
    vy = sum((b - my) ** 2 for b in ry)
    if vx == 0 or vy == 0:
        return None
    return cov / (vx * vy) ** 0.5


def is_silent_failure(result: dict[str, Any]) -> bool:
    return any(result.get(k) is None for k in SUB_SCORES)


def recomputed_composite(result: dict[str, Any]) -> float:
    return sum(w * result[k] for w, k in zip(WEIGHTS, SUB_SCORES))


def rule_violations(result: dict[str, Any], label: dict[str, Any]) -> list[str]:
    """Checks the production prompt's own rules against one valid result."""
    out = []
    score = result["ai_readiness_score"]
    values = [score] + [result[k] for k in SUB_SCORES]
    if any(v < 0 or v > 100 for v in values):
        out.append("out_of_range")
    if abs(score - recomputed_composite(result)) > COMPOSITE_TOLERANCE:
        out.append("composite_mismatch")
    if result.get("countdown_window") == "now" and score < NOW_MIN_SCORE:
        out.append("now_below_75")
    if result.get("risk_level") == "warning" and not label.get("sensitive", False):
        out.append("warning_not_sensitive")
    return out


def confusion(pairs: Iterable[tuple[str, str]], classes: list[str]) -> dict[str, dict[str, int]]:
    """confusion[true][predicted] -> count."""
    cm = {t: {p: 0 for p in classes} for t in classes}
    for true, pred in pairs:
        if true in cm and pred in cm[true]:
            cm[true][pred] += 1
    return cm


def _mode(values: list[str]) -> str:
    counts = Counter(values)
    best = max(counts.values())
    return next(v for v in values if counts[v] == best)   # first most common, stable


def summarize(records: list[dict[str, Any]], results: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """All headline metrics. `results` maps task id -> list of results (one per repeat)."""
    n_results = sum(len(results.get(r["id"], [])) for r in records)
    per_task, violations, conf_rows = [], Counter(), []
    n_valid = n_valid_with_violation = 0

    for rec in records:
        label = rec["label"]
        lo, hi = label["score_min"], label["score_max"]
        valid = [x for x in results.get(rec["id"], []) if not is_silent_failure(x)]
        n_valid += len(valid)
        for x in valid:
            v = rule_violations(x, label)
            violations.update(v)
            n_valid_with_violation += bool(v)
            conf_rows.append((x.get("score_confidence", "medium"),
                              distance_to_range(x["ai_readiness_score"], lo, hi)))
        row = {"id": rec["id"], "label": label, "n_valid": len(valid)}
        if valid:
            scores = [x["ai_readiness_score"] for x in valid]
            s = mean(scores)
            row.update(score=s, band=band_of(s), in_range=lo <= s <= hi,
                       distance=distance_to_range(s, lo, hi), signed=signed_error(s, lo, hi),
                       sd=pstdev(scores) if len(scores) > 1 else None,
                       decision=_mode([x.get("decision_layer", "partial") for x in valid]),
                       scores=scores)
        per_task.append(row)

    scored = [t for t in per_task if t["n_valid"]]
    n = len(records)
    sds = [t["sd"] for t in scored if t["sd"] is not None]
    by_conf: dict[str, list[float]] = defaultdict(list)
    for conf, dist in conf_rows:
        by_conf[conf].append(dist)
    by_band: dict[str, dict[str, Any]] = {}
    for band in ("low", "mid", "high"):
        rows = [t for t in per_task if t["label"]["band"] == band]
        got = [t for t in rows if t["n_valid"]]
        by_band[band] = {
            "n": len(rows),
            "band_accuracy": (sum(t["band"] == band for t in got) / len(rows)) if rows else None,
            "mean_signed_error": mean(t["signed"] for t in got) if got else None,
            "mean_score": mean(t["score"] for t in got) if got else None,
        }

    return {
        "n_tasks": n,
        "n_results": n_results,
        "silent_failure_rate": (n_results - n_valid) / n_results if n_results else 0.0,
        "tasks_without_valid_result": [t["id"] for t in per_task if not t["n_valid"]],
        "band_accuracy": sum(t.get("band") == t["label"]["band"] for t in per_task) / n if n else 0.0,
        "in_range_rate": sum(bool(t.get("in_range")) for t in per_task) / n if n else 0.0,
        "mae_distance": mean(t["distance"] for t in scored) if scored else None,
        "mean_signed_error": mean(t["signed"] for t in scored) if scored else None,
        "spearman": spearman([t["score"] for t in scored],
                             [(t["label"]["score_min"] + t["label"]["score_max"]) / 2 for t in scored]),
        "decision_accuracy": (sum(t.get("decision") == t["label"]["decision_layer"] for t in per_task) / n
                              if n else 0.0),
        "decision_confusion": confusion([(t["label"]["decision_layer"], t["decision"]) for t in scored],
                                        DECISION_LAYERS),
        "violation_rate": n_valid_with_violation / n_valid if n_valid else 0.0,
        "violations_by_rule": dict(sorted(violations.items())),
        "stability_mean_sd": mean(sds) if sds else None,
        "stability_max_sd": max(sds) if sds else None,
        "confidence_buckets": {c: {"n": len(v), "mean_distance": mean(v)}
                               for c, v in sorted(by_conf.items())},
        "by_band": by_band,
        "per_task": per_task,
    }
