"""Canary check: prove the harness detects known breakage (roadmap item 011).

Applies deliberately bad mutations to the *recorded* responses of a run (no
model calls) and checks that each one moves the metric it should, in the right
direction. If a mutation goes unnoticed, the harness has a blind spot.

    python -m evals.canary evals/runs/<run>.jsonl     # exit 1 if any check fails
"""
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path
from typing import Any, Callable

from evals import metrics
from evals import run as runner
from evals.schema import REPO_ROOT, load_dataset

BLOCK = re.compile(r"-{2,}\s*TASK_\d+\s*-{2,}")


def _drop_last_block(text: str) -> str:
    starts = [m.start() for m in BLOCK.finditer(text)]
    return text[:starts[-1]] if starts else text


def _corrupt_composite(text: str) -> str:
    return re.sub(r"(COMPOSITE_SCORE:\s*)(\d+(?:\.\d+)?)",
                  lambda m: f"{m.group(1)}{min(100.0, float(m.group(2)) + 15):.1f}", text)


def _invert_scores(text: str) -> str:
    keys = r"SCORE_REPEATABILITY|SCORE_DATA|SCORE_ERROR|SCORE_INTEGRATION|COMPOSITE_SCORE"
    return re.sub(rf"({keys})(:\s*)(\d+(?:\.\d+)?)",
                  lambda m: f"{m.group(1)}{m.group(2)}{100 - float(m.group(3)):.1f}", text)


def _decision_none(text: str) -> str:
    return re.sub(r"(DECISION_LAYER:\s*)\S+", r"\1none", text)


def _misname_field(text: str) -> str:
    return text.replace("SCORE_INTEGRATION:", "RISK_INTEGRATION:")


# mutation -> (transform, metric that must react, expected direction)
MUTATIONS: dict[str, tuple[Callable[[str], str], str, str]] = {
    "drop_last_block":   (_drop_last_block, "incomplete_rate", "up"),
    "corrupt_composite": (_corrupt_composite, "violation_rate", "up"),
    "invert_scores":     (_invert_scores, "spearman", "down"),
    "decision_none":     (_decision_none, "decision_accuracy", "down"),
    "misname_field":     (_misname_field, "malformed_rate", "up"),
}

METRIC_FUNCS: dict[str, Callable[[dict], float]] = {
    "incomplete_rate": lambda s: s["silent_failure_rate"],
    "violation_rate": lambda s: s["violation_rate"],
    "spearman": lambda s: s["spearman"] if s["spearman"] is not None else 0.0,
    "decision_accuracy": lambda s: s["decision_accuracy"],
    "malformed_rate": lambda s: s["malformed_rate"],
}
MIN_EFFECT = 0.05   # a mutation must move its metric by at least this much


def mutate_calls(calls: list[dict[str, Any]], mutation: str) -> list[dict[str, Any]]:
    fn = MUTATIONS[mutation][0]
    out = copy.deepcopy(calls)
    for c in out:
        if c.get("raw_text") and not c.get("error"):
            c["raw_text"] = fn(c["raw_text"])
    return out


def run_checks(run_path: Path) -> list[dict[str, Any]]:
    meta, calls = runner.read_run(run_path)
    records = [r for r in load_dataset(REPO_ROOT / meta["dataset"]) if r["workflow_id"] in meta["workflows"]]
    base = metrics.summarize(records, runner.results_from_calls(calls))
    rows = []
    for name, (_, metric, direction) in MUTATIONS.items():
        bad = metrics.summarize(records, runner.results_from_calls(mutate_calls(calls, name)))
        b, m = METRIC_FUNCS[metric](base), METRIC_FUNCS[metric](bad)
        moved = (m - b) if direction == "up" else (b - m)
        rows.append({"mutation": name, "metric": metric, "direction": direction,
                     "base": b, "mutated": m, "passed": moved >= MIN_EFFECT})
    return rows


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    rows = run_checks(Path(argv[0]))
    print(f"canary on {argv[0]}")
    print(f"{'mutation':18} {'metric':18} {'expect':6} {'base':>8} {'mutated':>8}  result")
    for r in rows:
        print(f"{r['mutation']:18} {r['metric']:18} {r['direction']:6} {r['base']:8.3f} {r['mutated']:8.3f}  "
              f"{'PASS' if r['passed'] else 'FAIL'}")
    failed = [r for r in rows if not r["passed"]]
    print("all mutations detected" if not failed else f"{len(failed)} mutation(s) NOT detected")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
