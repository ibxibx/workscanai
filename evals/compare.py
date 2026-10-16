"""Compare two runs with paired-bootstrap confidence intervals (roadmap item 011).

    python -m evals.compare <base run> <new run> [--split dev|holdout|all] [--iters 1000] [--out file.md]

Tasks are the unit of variation: each resample draws tasks with replacement and
recomputes every metric for both runs on the same draw. A change is flagged only
when its 95% interval excludes 0. Differences inside the interval are noise.
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path
from typing import Any

from evals import metrics
from evals import run as runner
from evals.schema import REPO_ROOT, load_dataset
from evals.splits import filter_records

# metric -> (extractor, higher is better)
METRICS: dict[str, tuple[Any, bool]] = {
    "band_accuracy":     (lambda s: s["band_accuracy"], True),
    "in_range_rate":     (lambda s: s["in_range_rate"], True),
    "mae_distance":      (lambda s: s["mae_distance"] or 0.0, False),
    "spearman":          (lambda s: s["spearman"] if s["spearman"] is not None else 0.0, True),
    "decision_accuracy": (lambda s: s["decision_accuracy"], True),
    "incomplete_rate":   (lambda s: s["silent_failure_rate"], False),
    "malformed_rate":    (lambda s: s["malformed_rate"], False),
    "violation_rate":    (lambda s: s["violation_rate"], False),
}
SEED = 20261016


def _values(records, results) -> dict[str, float]:
    s = metrics.summarize(records, results)
    return {name: fn(s) for name, (fn, _) in METRICS.items()}


def compare_results(records: list[dict], base: dict, new: dict, iters: int = 1000) -> list[dict[str, Any]]:
    """Paired bootstrap over the tasks present in both result sets."""
    common = [r for r in records if r["id"] in base and r["id"] in new]
    b0, n0 = _values(common, base), _values(common, new)
    rng = random.Random(SEED)
    deltas: dict[str, list[float]] = {m: [] for m in METRICS}
    for _ in range(iters):
        sample = [common[rng.randrange(len(common))] for _ in common]
        bv, nv = _values(sample, base), _values(sample, new)
        for m in METRICS:
            deltas[m].append(nv[m] - bv[m])
    rows = []
    for m, (_, higher_better) in METRICS.items():
        d = sorted(deltas[m])
        lo, hi = d[int(0.025 * (iters - 1))], d[int(0.975 * (iters - 1))]
        delta = n0[m] - b0[m]
        significant = (lo > 0 or hi < 0) and abs(delta) > 1e-12
        rows.append({"metric": m, "base": b0[m], "new": n0[m], "delta": delta, "ci_low": lo, "ci_high": hi,
                     "significant": significant,
                     "verdict": ("better" if (delta > 0) == higher_better else "worse") if significant else "no clear change",
                     "n_tasks": len(common)})
    return rows


def render(rows: list[dict], base_name: str, new_name: str, split: str) -> str:
    n = rows[0]["n_tasks"] if rows else 0
    out = [f"# Compare: `{new_name}` vs `{base_name}`", "",
           f"Split: **{split}** · {n} tasks · 95% paired-bootstrap intervals over tasks.", "",
           "| Metric | Base | New | Δ | 95% interval of Δ | Verdict |", "|---|---|---|---|---|---|"]
    for r in rows:
        out.append(f"| {r['metric']} | {r['base']:.3f} | {r['new']:.3f} | {r['delta']:+.3f} | "
                   f"[{r['ci_low']:+.3f}, {r['ci_high']:+.3f}] | {r['verdict']} |")
    return "\n".join(out) + "\n"


def _load(run_path: Path, split: str) -> tuple[list[dict], dict]:
    meta, calls = runner.read_run(run_path)
    records = [r for r in load_dataset(REPO_ROOT / meta["dataset"]) if r["workflow_id"] in meta["workflows"]]
    return filter_records(records, split), runner.results_from_calls(calls)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m evals.compare", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("base", type=Path)
    p.add_argument("new", type=Path)
    p.add_argument("--split", default="all", choices=["dev", "holdout", "all"])
    p.add_argument("--iters", type=int, default=1000)
    p.add_argument("--out", type=Path)
    a = p.parse_args(argv)
    base_recs, base_res = _load(a.base, a.split)
    new_recs, new_res = _load(a.new, a.split)
    ids = {r["id"] for r in new_recs}
    records = [r for r in base_recs if r["id"] in ids]
    md = render(compare_results(records, base_res, new_res, a.iters), a.base.name, a.new.name, a.split)
    if a.out:
        a.out.write_text(md, encoding="utf-8", newline="\n")
    print(md)
    return 0


if __name__ == "__main__":
    sys.exit(main())
