"""Runner tests for evals/ (roadmap item 002) with a fake backend: no API key, no network.

Checks that a live run records every call, that silent failures and API errors are
counted, that labels never reach the analyzer, and that --replay rebuilds the exact
same report from the run file.
"""
import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from evals import run as runner  # noqa: E402
from evals.schema import DEFAULT_DATASET, load_dataset  # noqa: E402


class FakeBackend:
    """Answers in the production ---TASK_N--- format. Drops the last block of every
    batch (a silent failure) and errors on the second call of repeat 2."""
    name = "fake"

    def __init__(self):
        self.prompts = []

    def complete(self, model, max_tokens, prompt, timeout):
        self.prompts.append(prompt)
        n = len(re.findall(r"^TASK_\d+:", prompt, flags=re.MULTILINE))
        if "FAIL_NEXT" in getattr(self, "flag", "") and len(self.prompts) == 4:
            raise RuntimeError("simulated overload")
        blocks = []
        for i in range(1, n):          # block n is deliberately missing
            r, d, e, it = 80, 80, 60, 60   # composite 72
            blocks.append(
                f"---TASK_{i}---\nSCORE_REPEATABILITY: {r}\nSCORE_DATA: {d}\nSCORE_ERROR: {e}\n"
                f"SCORE_INTEGRATION: {it}\nCOMPOSITE_SCORE: 72\nTIME_SAVED: 50\nDIFFICULTY: easy\n"
                f"RISK_LEVEL: safe\nRISK_FLAG: ok\nRECOMMENDATION: Use a tool.\nDECISION_LAYER: partial\n"
                f"AGENT_PHASE: 1\nAGENT_LABEL: Phase 1\nAGENT_MILESTONE: pilot\nORCHESTRATION: none\n"
                f"COUNTDOWN_WINDOW: 12-24\nHUMAN_EDGE_SCORE: 40\n")
        return "".join(blocks), {"input_tokens": 1000, "output_tokens": 200, "cost_usd": 0.001}


@pytest.fixture
def fake(monkeypatch, tmp_path):
    backend = FakeBackend()
    backend.flag = "FAIL_NEXT"
    monkeypatch.setattr(runner, "make_backend", lambda name: backend)
    monkeypatch.setattr(runner, "RUNS_DIR", tmp_path / "runs")
    return backend


def test_live_run_records_and_replay_matches(fake, tmp_path):
    run_path = runner.live_run(DEFAULT_DATASET, "fake", repeats=2, only={"mkt", "pm"},
                               jobs=1, name="test")
    lines = [json.loads(x) for x in run_path.read_text(encoding="utf-8").splitlines()]
    meta, calls = lines[0], lines[1:]
    assert meta["type"] == "meta" and meta["workflows"] == ["mkt", "pm"]
    assert len(calls) == 4                                   # 2 workflows x 2 repeats
    assert sum(1 for c in calls if c["error"]) == 1          # the simulated overload
    assert all(c["model"] == "claude-haiku-4-5-20251001" for c in calls)

    records = [r for r in load_dataset(DEFAULT_DATASET) if r["workflow_id"] in {"mkt", "pm"}]
    results = runner.results_from_calls(calls)
    assert set(results) == {r["id"] for r in records}
    assert all(len(v) == 2 for v in results.values())

    report_live = runner.build_report(run_path)
    report_replay = runner.build_report(run_path)
    assert report_live == report_replay
    # 13 tasks x 2 repeats = 26 results. Silent failures: the missing last block in
    # 3 successful calls (3) + every task of the failed call (6 or 7).
    assert "| Silent-failure rate |" in report_live
    assert "Backend | `fake`" in report_live


def test_labels_never_reach_the_prompt(fake):
    runner.live_run(DEFAULT_DATASET, "fake", repeats=1, only={"acct"}, jobs=1, name="test")
    prompt = fake.prompts[0]
    for rec in load_dataset(DEFAULT_DATASET):
        if rec["workflow_id"] == "acct":
            assert rec["name"] in prompt
            assert rec["label"]["rationale"] not in prompt


def test_replay_cli_writes_identical_report(fake, tmp_path):
    run_path = runner.live_run(DEFAULT_DATASET, "fake", repeats=1, only={"hr"}, jobs=1, name="t")
    out1, out2 = tmp_path / "a.md", tmp_path / "b.md"
    assert runner.main(["--replay", str(run_path), "--out", str(out1)]) == 0
    assert runner.main(["--replay", str(run_path), "--out", str(out2)]) == 0
    assert out1.read_bytes() == out2.read_bytes()


def test_over_long_response_is_truncated_like_the_api():
    # 3 blocks, 1000 recorded tokens, cap 500 -> keep the first half of the text,
    # so block 3 is lost and becomes a silent failure, as it would in production.
    block = "---TASK_{n}---\nSCORE_REPEATABILITY: 80\nSCORE_DATA: 80\nSCORE_ERROR: 60\nSCORE_INTEGRATION: 60\n"
    text = "".join(block.format(n=n) for n in (1, 2, 3))
    call = {"type": "call", "task_ids": ["a", "b", "c"], "raw_text": text, "error": None,
            "output_tokens": 1000, "max_tokens": 500}
    assert runner.exceeds_max_tokens(call)
    visible = runner.production_visible_text(call)
    assert len(visible) == len(text) // 2
    results = runner.results_from_calls([call])
    assert results["a"][0]["score_repeatability"] == 80
    assert results["c"][0]["score_repeatability"] is None


def test_response_within_cap_is_untouched():
    call = {"raw_text": "abc", "output_tokens": 10, "max_tokens": 500}
    assert not runner.exceeds_max_tokens(call)
    assert runner.production_visible_text(call) == "abc"
