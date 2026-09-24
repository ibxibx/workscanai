"""Model backends for the eval runner, plus a recording client.

The production analyzer calls `self.client.messages.create(model=..., max_tokens=...,
messages=[...], timeout=...)` and reads `message.content[0].text`. RecordingClient
offers exactly that surface, so the analyzer runs unchanged while every call's raw
text, token usage, latency and error are recorded.

Backends:
- "cli": the Claude Code CLI (`claude -p`) on this machine, authenticated with the
  user's Claude subscription. ANTHROPIC_API_KEY is removed from its environment so
  it never falls back to API billing.
- "api": the Anthropic API with ANTHROPIC_API_KEY from backend/.env, i.e. exactly
  what production does. Costs API credit.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Protocol

from evals.schema import REPO_ROOT

# Minimal system prompt for the CLI backend. The production API call sends no
# system prompt; the CLI always has one, so we replace Claude Code's default with
# the most neutral instruction possible. Reported as a known difference.
CLI_SYSTEM_PROMPT = ("You are a text-completion function. Follow the user's formatting "
                     "instructions exactly and output nothing else.")


class Backend(Protocol):
    name: str

    def complete(self, model: str, max_tokens: int, prompt: str, timeout: float) -> tuple[str, dict]:
        """Return (text, usage) or raise."""


class ClaudeCliBackend:
    name = "cli"

    def __init__(self, executable: str | None = None):
        self.executable = executable or shutil.which("claude")
        if not self.executable:
            raise RuntimeError("Claude Code CLI not found on PATH (install it or use --backend api)")
        self.env = {k: v for k, v in os.environ.items()
                    if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")}

    def check(self, model: str) -> None:
        """Fail fast with a clear message if the CLI cannot answer (e.g. not logged in)."""
        try:
            self.complete(model, 16, "Reply with exactly: OK", 60)
        except Exception as e:
            raise RuntimeError(f"{e}\nThe Claude Code CLI could not answer. Run `claude` in a "
                               "terminal, use /login, then retry.") from None

    def complete(self, model, max_tokens, prompt, timeout):
        cmd = [self.executable, "-p", "--model", model, "--system-prompt", CLI_SYSTEM_PROMPT,
               "--tools", "", "--no-session-persistence", "--output-format", "json",
               "--setting-sources", "", "--strict-mcp-config"]
        proc = subprocess.run(cmd, input=prompt, capture_output=True, env=self.env,
                              encoding="utf-8", errors="replace", timeout=max(timeout, 240))
        try:
            data = json.loads(proc.stdout)
        except json.JSONDecodeError:
            raise RuntimeError(f"claude CLI exit {proc.returncode}: {proc.stderr.strip()[:300]}")
        if data.get("is_error") or proc.returncode != 0:
            raise RuntimeError(f"claude CLI error: {str(data.get('result'))[:300]}")
        u = data.get("usage") or {}
        usage = {
            "input_tokens": (u.get("input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0)
                            + (u.get("cache_creation_input_tokens") or 0),
            "output_tokens": u.get("output_tokens") or 0,
            "cost_usd": data.get("total_cost_usd"),   # API-equivalent; billed to the subscription
        }
        return data.get("result") or "", usage


class AnthropicApiBackend:
    name = "api"

    def __init__(self):
        from dotenv import load_dotenv   # backend dependency
        from anthropic import Anthropic
        load_dotenv(REPO_ROOT / "backend" / ".env")
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY not set (backend/.env)")
        self.client = Anthropic(api_key=key)

    def check(self, model: str) -> None:
        pass

    def complete(self, model, max_tokens, prompt, timeout):
        msg = self.client.messages.create(model=model, max_tokens=max_tokens,
                                          messages=[{"role": "user", "content": prompt}],
                                          timeout=timeout)
        usage = {"input_tokens": msg.usage.input_tokens, "output_tokens": msg.usage.output_tokens,
                 "cost_usd": None}
        return msg.content[0].text, usage


class RecordingClient:
    """Stands in for `anthropic.Anthropic` inside AIAnalyzer and records every call."""

    def __init__(self, backend: Backend):
        self.backend = backend
        self.messages = self
        self._local = threading.local()

    def set_context(self, **ctx: Any) -> None:
        self._local.ctx = ctx
        self._local.record = None

    @property
    def last_record(self) -> dict | None:
        return getattr(self._local, "record", None)

    def create(self, model: str, max_tokens: int, messages: list, timeout: float = 90.0, **_: Any):
        prompt = messages[0]["content"]
        rec = {**getattr(self._local, "ctx", {}), "model": model, "max_tokens": max_tokens,
               "raw_text": None, "error": None, "input_tokens": None, "output_tokens": None,
               "cost_usd": None}
        t0 = time.perf_counter()
        try:
            text, usage = self.backend.complete(model, max_tokens, prompt, timeout)
            rec.update(raw_text=text, **usage)
            return SimpleNamespace(content=[SimpleNamespace(text=text)])
        except Exception as e:  # recorded, then re-raised so the analyzer behaves as in prod
            rec["error"] = f"{type(e).__name__}: {e}"[:500]
            raise
        finally:
            rec["latency_ms"] = round((time.perf_counter() - t0) * 1000)
            self._local.record = rec


def make_backend(name: str) -> Backend:
    if name == "cli":
        return ClaudeCliBackend()
    if name == "api":
        return AnthropicApiBackend()
    raise ValueError(f"unknown backend {name!r}")


def analyzer_source_path() -> Path:
    return REPO_ROOT / "backend" / "app" / "services" / "ai_analyzer.py"
