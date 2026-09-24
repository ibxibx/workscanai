"""Run the production analyzer over the labelled dataset and write a report.

    python -m evals.run                         # Claude subscription via Claude Code CLI
    python -m evals.run --backend api           # Anthropic API (costs API credit)
    python -m evals.run --repeats 1 --workflows mkt,hr   # quick smoke run
    python -m evals.run --replay evals/runs/<file>.jsonl  # rebuild a report, no model calls

Every model call is written to evals/runs/<name>-<timestamp>.jsonl. The report is
always built from that file, so a live run and its replay produce the same report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from evals import metrics
from evals.backends import RecordingClient, analyzer_source_path, make_backend
from evals.report import render_report
from evals.schema import DEFAULT_DATASET, EVALS_DIR, REPO_ROOT, load_dataset, to_analyzer_task, workflows

RUNS_DIR = EVALS_DIR / "runs"
ANALYZER_MODEL = "claude-haiku-4-5-20251001"   # only used for the backend pre-flight check
REPORTS_DIR = EVALS_DIR / "reports"


def _rel(path: Path) -> str:
    """Repo-relative POSIX path when possible (stable across machines), else absolute."""
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def _git_commit() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT,
                             capture_output=True, text=True, encoding="utf-8")
        return out.stdout.strip() or "unknown"
    except OSError:
        return "unknown"


def _analyzer_class():
    backend_dir = str(REPO_ROOT / "backend")
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from app.services.ai_analyzer import AIAnalyzer
    return AIAnalyzer


def _bare_analyzer(client: Any = None):
    """AIAnalyzer without its __init__ (which requires ANTHROPIC_API_KEY)."""
    cls = _analyzer_class()
    analyzer = cls.__new__(cls)
    analyzer.client = client
    return analyzer


# ---------------------------------------------------------------------------
# live run
# ---------------------------------------------------------------------------

def live_run(dataset: Path, backend_name: str, repeats: int, only: set[str] | None,
             jobs: int, name: str) -> Path:
    records = load_dataset(dataset)
    groups = [g for g in workflows(records) if not only or g[0]["workflow_id"] in only]
    backend = make_backend(backend_name)
    if hasattr(backend, "check"):
        backend.check(ANALYZER_MODEL)
    client = RecordingClient(backend)
    analyzer = _bare_analyzer(client)

    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_path = RUNS_DIR / f"{name}-{stamp}.jsonl"
    meta = {"type": "meta", "name": name, "started_at": stamp, "backend": backend_name,
            "dataset": _rel(dataset), "dataset_sha": _sha256(dataset),
            "analyzer_sha": _sha256(analyzer_source_path()), "git_commit": _git_commit(),
            "repeats": repeats, "workflows": [g[0]["workflow_id"] for g in groups]}

    jobs_list = [(rep, g) for rep in range(1, repeats + 1) for g in groups]

    def one(job):
        rep, group = job
        client.set_context(repeat=rep, workflow_id=group[0]["workflow_id"],
                           task_ids=[r["id"] for r in group])
        analyzer.analyze_tasks_batch([to_analyzer_task(r) for r in group])
        rec = client.last_record or {"repeat": rep, "workflow_id": group[0]["workflow_id"],
                                     "task_ids": [r["id"] for r in group], "raw_text": None,
                                     "error": "no model call recorded"}
        status = "ERROR " + rec["error"] if rec.get("error") else f"{rec.get('latency_ms')} ms"
        print(f"  repeat {rep} | {rec["workflow_id"]:8} | {len(group)} tasks | {status}", flush=True)
        return {"type": "call", **rec}

    print(f"{len(jobs_list)} calls via backend '{backend_name}' ({jobs} in parallel)")
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as pool:
        calls = list(pool.map(one, jobs_list))

    with open(run_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(meta, ensure_ascii=False) + "\n")
        for c in sorted(calls, key=lambda c: (c["repeat"], meta["workflows"].index(c["workflow_id"]))):
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    return run_path


# ---------------------------------------------------------------------------
# run file -> results -> report
# ---------------------------------------------------------------------------

def read_run(run_path: Path) -> tuple[dict, list[dict]]:
    lines = [json.loads(line) for line in run_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    meta = next(line for line in lines if line["type"] == "meta")
    return meta, [line for line in lines if line["type"] == "call"]


def results_from_calls(calls: list[dict]) -> dict[str, list[dict]]:
    """Re-parse each recorded response with the production parser.

    Mirrors analyze_tasks_batch: an errored call yields _defaults() for every task.
    """
    analyzer = _bare_analyzer()
    results: dict[str, list[dict]] = {}
    for call in calls:
        ids = call["task_ids"]
        if call.get("error") or call.get("raw_text") is None:
            parsed = [analyzer._defaults() for _ in ids]
        else:
            parsed = analyzer._parse_batch_response(call["raw_text"], len(ids))
        for tid, res in zip(ids, parsed):
            results.setdefault(tid, []).append(res)
    return results


def build_report(run_path: Path, dataset_path: Path | None = None) -> str:
    meta, calls = read_run(run_path)
    dataset = dataset_path or (REPO_ROOT / meta["dataset"])
    records = [r for r in load_dataset(dataset) if r["workflow_id"] in meta["workflows"]]
    if _sha256(dataset) != meta["dataset_sha"]:
        print(f"warning: dataset changed since the run ({_sha256(dataset)} != {meta['dataset_sha']})")
    summary = metrics.summarize(records, results_from_calls(calls))
    return render_report(meta, calls, records, summary, _rel(run_path))


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m evals.run", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--backend", choices=["cli", "api"], default="cli")
    p.add_argument("--repeats", type=int, default=3)
    p.add_argument("--workflows", help="comma-separated workflow ids (default: all)")
    p.add_argument("--jobs", type=int, default=2, help="parallel model calls")
    p.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    p.add_argument("--name", default="run", help="prefix for run and report files")
    p.add_argument("--replay", type=Path, help="rebuild the report from a run file, no model calls")
    p.add_argument("--out", type=Path, help="report path (default evals/reports/<run file stem>.md)")
    a = p.parse_args(argv)

    try:
        run_path = a.replay.resolve() if a.replay else live_run(
            a.dataset.resolve(), a.backend, a.repeats,
            set(a.workflows.split(",")) if a.workflows else None, a.jobs, a.name)
    except RuntimeError as e:
        print(f"error: {e}")
        return 2
    report = build_report(run_path)
    out = a.out or (REPORTS_DIR / f"{run_path.stem}.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8", newline="\n")
    print(f"run file: {_rel(run_path)}")
    print(f"report:   {_rel(out)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
