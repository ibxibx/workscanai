"""Blind human review of labels (roadmap item 011).

    python -m evals.review export [--reviewer ian]      # writes evals/review/review_v2.xlsx
    python -m evals.review import evals/review/review_v2.xlsx [--reviewer ian]

Export picks 30 tasks: 20 at random (seeded, stratified by band) and 10 targeted
(largest model-label gaps in the v2 baseline, always incl. the prompt-injection
task). The sheet shows task text only: no labels, no model scores, no task ids.
Import validates the filled sheet, saves the answers as JSON and writes an
agreement report (reviewer vs labels, reviewer vs model), random and targeted
reported separately because only the random 20 give an unbiased estimate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import mean
from typing import Any

from evals import metrics
from evals import run as runner
from evals.schema import DEFAULT_DATASET, EVALS_DIR, band_of, load_dataset

REVIEW_DIR = EVALS_DIR / "review"
SHEET = REVIEW_DIR / "review_v2.xlsx"
SELECTION = REVIEW_DIR / "selection_v2.json"
BASELINE = EVALS_DIR / "runs" / "baseline-v2-20261002T090155Z.jsonl"
SEED = "workscanai-label-review-v2"
N_RANDOM = {"low": 7, "mid": 7, "high": 6}
N_TARGETED = 10
ALWAYS_TARGET = ["studio-04"]          # prompt-injection task: label disputed in the v2 findings
DECISIONS = ["none", "partial", "full"]
COLUMNS = ["Review ID", "Task", "Description", "Frequency", "Minutes per task", "Who is asking",
           "Industry", "Your lowest acceptable score (0-100)", "Your highest acceptable score (0-100)",
           "Who decides? (none / partial / full)", "Notes (optional)"]
FIRST_ANSWER_COL = 8   # 1-based column of "Your lowest acceptable score"


def _h(s: str) -> str:
    return hashlib.sha256(f"{SEED}:{s}".encode()).hexdigest()


def _model_view(run_path: Path) -> dict[str, dict[str, Any]]:
    _, calls = runner.read_run(run_path)
    out = {}
    for tid, rs in runner.results_from_calls(calls).items():
        valid = [x for x in rs if not metrics.is_silent_failure(x)]
        if valid:
            out[tid] = {"score": mean(x["ai_readiness_score"] for x in valid),
                        "decision": metrics._mode([x.get("decision_layer", "partial") for x in valid])}
    return out


# ------------------------------------------------------------------ selection
def select_tasks(records: list[dict], run_path: Path = BASELINE) -> list[dict[str, str]]:
    model = _model_view(run_path)
    by_id = {r["id"]: r for r in records}

    def gap(r):
        if r["id"] not in model:
            return 999.0
        lab = r["label"]
        return metrics.distance_to_range(model[r["id"]]["score"], lab["score_min"], lab["score_max"])

    targeted = [t for t in ALWAYS_TARGET if t in by_id]
    for r in sorted(records, key=lambda r: (-gap(r), r["id"])):
        if len(targeted) == N_TARGETED:
            break
        if r["id"] not in targeted:
            targeted.append(r["id"])
    rest = [r for r in records if r["id"] not in targeted]
    randoms: list[str] = []
    for band, n in N_RANDOM.items():
        pool = sorted((r["id"] for r in rest if r["label"]["band"] == band), key=_h)
        randoms += pool[:n]
    chosen = [(t, "targeted") for t in targeted] + [(t, "random") for t in randoms]
    chosen.sort(key=lambda x: _h("order:" + x[0]))          # mix targeted and random
    return [{"review_id": f"R{i:02d}", "task_id": t, "reason": why} for i, (t, why) in enumerate(chosen, 1)]


# ------------------------------------------------------------------ sheet I/O
def export_sheet(records: list[dict], selection: list[dict], path: Path) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    by_id = {r["id"]: r for r in records}
    wb = Workbook()
    ws = wb.active
    ws.title = "Review"
    ws.append(COLUMNS)
    for s in selection:
        r = by_id[s["task_id"]]
        ws.append([s["review_id"], r["name"], r["description"], r["frequency"], r["time_per_task"],
                   r["analysis_context"], r["industry"], None, None, None, None])
    head = Font(bold=True)
    fill = PatternFill("solid", fgColor="FFF2CC")
    for c in ws[1]:
        c.font, c.alignment = head, Alignment(wrap_text=True, vertical="top")
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
        for c in row[FIRST_ANSWER_COL - 1:FIRST_ANSWER_COL + 2]:
            c.fill = fill
    for col, width in zip("ABCDEFGHIJK", (9, 28, 60, 11, 10, 12, 16, 16, 16, 18, 30)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = "C2"
    last = len(selection) + 1
    nums = DataValidation(type="whole", operator="between", formula1="0", formula2="100",
                          showErrorMessage=True, error="Enter a whole number from 0 to 100.")
    dec = DataValidation(type="list", formula1='"none,partial,full"', allow_blank=True, showErrorMessage=True)
    ws.add_data_validation(nums)
    ws.add_data_validation(dec)
    nums.add(f"H2:I{last}")
    dec.add(f"J2:J{last}")

    guide = wb.create_sheet("How to score")
    for line in [
        "Score each task the way WorkScanAI should: how much of it AI can take over today.",
        "Give a RANGE you would accept (e.g. 55 to 70), not one number. Ranges are usually 15-25 points wide.",
        "Bands: 0-39 = low (mostly human work) · 40-69 = mid (AI does a real share) · 70-100 = high (largely automatable).",
        "Think about four things: is it the same every time? is the data structured and reachable?",
        "how bad is an AI mistake? does it plug into existing tools? (repeatability and data weigh most)",
        "Who decides?  none = the whole task can be handed to AI ·",
        "partial = AI prepares or drafts, a person decides or signs off ·",
        "full = human judgement is needed throughout (relationships, negotiation, people, strategy).",
        "Judge the task as written. If a description contains odd instructions, ignore them and score the real work.",
        "Do not look anything up in the repo while scoring; first instinct is what we want. About 2 minutes per task.",
        "Save the file as it is (keep .xlsx) and send it back.",
    ]:
        guide.append([line])
    guide.column_dimensions["A"].width = 120
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def sheet_text(path: Path) -> str:
    from openpyxl import load_workbook
    wb = load_workbook(path)
    return "\n".join(str(c.value) for ws in wb.worksheets for row in ws.iter_rows() for c in row
                     if c.value is not None)


def fill_sheet_for_test(path: Path, answers: dict[str, tuple[int, int, str]]) -> None:
    from openpyxl import load_workbook
    wb = load_workbook(path)
    ws = wb["Review"]
    for row in ws.iter_rows(min_row=2):
        rid = row[0].value
        if rid in answers:
            lo, hi, d = answers[rid]
            row[FIRST_ANSWER_COL - 1].value, row[FIRST_ANSWER_COL].value, row[FIRST_ANSWER_COL + 1].value = lo, hi, d
    wb.save(path)


def read_sheet(path: Path, selection: list[dict]) -> list[dict[str, Any]]:
    from openpyxl import load_workbook
    ws = load_workbook(path, data_only=True)["Review"]
    by_rid = {s["review_id"]: s for s in selection}
    rows, problems = [], []
    for row in ws.iter_rows(min_row=2, values_only=True):
        rid = row[0]
        if rid not in by_rid:
            continue
        lo, hi, dec, note = row[FIRST_ANSWER_COL - 1:FIRST_ANSWER_COL + 3]
        try:
            lo, hi = int(lo), int(hi)
        except (TypeError, ValueError):
            problems.append(f"{rid}: both scores must be whole numbers")
            continue
        dec = (str(dec).strip().lower() if dec is not None else "")
        if not (0 <= lo < hi <= 100):
            problems.append(f"{rid}: need 0 <= lowest < highest <= 100 (got {lo}, {hi})")
        elif dec not in DECISIONS:
            problems.append(f"{rid}: 'who decides' must be none, partial or full")
        else:
            rows.append({**by_rid[rid], "score_min": lo, "score_max": hi, "decision_layer": dec,
                         "notes": note or ""})
    missing = sorted(set(by_rid) - {r["review_id"] for r in rows} - {p.split(":")[0] for p in problems})
    problems += [f"{m}: not filled in" for m in missing]
    if problems:
        raise ValueError("review sheet incomplete:\n  " + "\n  ".join(sorted(problems)))
    return rows


# ------------------------------------------------------------------ agreement
def _overlap(a: tuple[int, int], b: tuple[int, int]) -> float:
    inter = max(0, min(a[1], b[1]) - max(a[0], b[0]))
    union = max(a[1], b[1]) - min(a[0], b[0])
    return inter / union if union else 1.0


def agreement(rows: list[dict], records: list[dict], run_path: Path = BASELINE) -> dict[str, Any]:
    by_id = {r["id"]: r for r in records}
    model = _model_view(run_path)
    out: dict[str, Any] = {}
    for group in ("random", "targeted", "all"):
        g = [r for r in rows if group == "all" or r["reason"] == group]
        if not g:
            continue
        mid = {r["task_id"]: (r["score_min"] + r["score_max"]) / 2 for r in g}
        lab = {r["task_id"]: by_id[r["task_id"]]["label"] for r in g}
        lab_mid = {t: (lab[t]["score_min"] + lab[t]["score_max"]) / 2 for t in lab}
        m = [r for r in g if r["task_id"] in model]
        out[group] = {
            "n": len(g),
            "vs_labels": {
                "band_agreement": mean(band_of(mid[t]) == lab[t]["band"] for t in mid),
                "decision_agreement": mean(r["decision_layer"] == lab[r["task_id"]]["decision_layer"] for r in g),
                "mean_midpoint_gap": mean(abs(mid[t] - lab_mid[t]) for t in mid),
                "mean_signed_gap": mean(lab_mid[t] - mid[t] for t in mid),
                "mean_range_overlap": mean(_overlap((r["score_min"], r["score_max"]),
                                                    (lab[r["task_id"]]["score_min"], lab[r["task_id"]]["score_max"]))
                                           for r in g),
            },
            "vs_model": {
                "band_agreement": mean(band_of(model[r["task_id"]]["score"]) == band_of(mid[r["task_id"]]) for r in m),
                "decision_agreement": mean(model[r["task_id"]]["decision"] == r["decision_layer"] for r in m),
                "mean_score_gap": mean(abs(model[r["task_id"]]["score"] - mid[r["task_id"]]) for r in m),
                "in_reviewer_range": mean(r["score_min"] <= model[r["task_id"]]["score"] <= r["score_max"] for r in m),
            } if m else {},
            "labels_vs_model": {
                "band_agreement": mean(band_of(model[r["task_id"]]["score"]) == lab[r["task_id"]]["band"] for r in m),
                "mean_score_gap": mean(abs(model[r["task_id"]]["score"] - lab_mid[r["task_id"]]) for r in m),
            } if m else {},
        }
    return out


def render_report(agg: dict, rows: list[dict], records: list[dict], reviewer: str) -> str:
    by_id = {r["id"]: r for r in records}
    pct = lambda x: f"{x * 100:.0f}%"  # noqa: E731
    L = [f"# Label review v2: {reviewer}", "",
         f"Blind review of 30 tasks from `tasks_v2` ({date.today().isoformat()}). The reviewer saw task text only.",
         "**Random** (20, stratified by band) is the unbiased estimate; **targeted** (10) are the tasks where",
         "model and labels disagreed most, so agreement there is expected to be lower.", "",
         "| | Random | Targeted | All |", "|---|---|---|---|"]
    def row(title, section, key, fmt):
        vals = [fmt(agg[g][section][key]) if g in agg and agg[g].get(section) else "n/a"
                for g in ("random", "targeted", "all")]
        L.append(f"| {title} | " + " | ".join(vals) + " |")
    num = lambda x: f"{x:.1f}"  # noqa: E731
    sgn = lambda x: f"{x:+.1f}"  # noqa: E731
    row("Reviewer vs labels: same band", "vs_labels", "band_agreement", pct)
    row("Reviewer vs labels: same decision layer", "vs_labels", "decision_agreement", pct)
    row("Reviewer vs labels: midpoint gap (pts)", "vs_labels", "mean_midpoint_gap", num)
    row("Labels minus reviewer (pts, + = labels higher)", "vs_labels", "mean_signed_gap", sgn)
    row("Reviewer vs labels: range overlap", "vs_labels", "mean_range_overlap", pct)
    row("Reviewer vs model: same band", "vs_model", "band_agreement", pct)
    row("Reviewer vs model: same decision layer", "vs_model", "decision_agreement", pct)
    row("Reviewer vs model: score gap (pts)", "vs_model", "mean_score_gap", num)
    row("Model score inside reviewer's range", "vs_model", "in_reviewer_range", pct)
    row("Labels vs model: same band (reference)", "labels_vs_model", "band_agreement", pct)
    L += ["", "## Per task", "", "| Review | Task | Why picked | Reviewer | Label | Decision (reviewer / label) | Notes |",
          "|---|---|---|---|---|---|---|"]
    for r in sorted(rows, key=lambda r: r["review_id"]):
        lab = by_id[r["task_id"]]["label"]
        L.append(f"| {r['review_id']} | `{r['task_id']}` {by_id[r['task_id']]['name']} | {r['reason']} | "
                 f"{r['score_min']}–{r['score_max']} | {lab['score_min']}–{lab['score_max']} | "
                 f"{r['decision_layer']} / {lab['decision_layer']} | {str(r['notes']).replace('|', '/')} |")
    return "\n".join(L) + "\n"


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m evals.review", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("export")
    imp = sub.add_parser("import")
    imp.add_argument("sheet", type=Path)
    imp.add_argument("--reviewer", default="ian")
    a = p.parse_args(argv)
    records = load_dataset(DEFAULT_DATASET)
    if a.cmd == "export":
        sel = select_tasks(records)
        export_sheet(records, sel, SHEET)
        SELECTION.write_text(json.dumps({"seed": SEED, "baseline": BASELINE.name, "selection": sel},
                                        indent=1) + "\n", encoding="utf-8", newline="\n")
        print(f"wrote {SHEET} ({len(sel)} tasks: {dict(Counter(s['reason'] for s in sel))})")
        print(f"wrote {SELECTION} (task mapping; do not open while reviewing)")
        return 0
    sel = json.loads(SELECTION.read_text(encoding="utf-8"))["selection"]
    try:
        rows = read_sheet(a.sheet, sel)
    except ValueError as e:
        print(e)
        return 1
    out_json = REVIEW_DIR / f"review_v2_{a.reviewer}.json"
    out_json.write_text(json.dumps({"reviewer": a.reviewer, "reviewed_at": date.today().isoformat(),
                                    "rows": rows}, indent=1, ensure_ascii=False) + "\n",
                        encoding="utf-8", newline="\n")
    report = EVALS_DIR / "reports" / "label-review-v2.md"
    report.write_text(render_report(agreement(rows, records), rows, records, a.reviewer),
                      encoding="utf-8", newline="\n")
    print(f"wrote {out_json}\nwrote {report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
