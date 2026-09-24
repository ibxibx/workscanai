"""Regression tests for scripts/secret_scan_precommit.py (roadmap item 001).

The scanner must decode staged content as UTF-8 regardless of the OS locale.
Each test builds a throwaway git repo, stages a file, and runs the real script
in it under a non-UTF-8 locale (cp1252 on Windows, ASCII/C on POSIX).
"""
import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "secret_scan_precommit.py"

# Built by concatenation so this test file never contains a matching literal
# (otherwise the pre-commit hook would block committing the test itself).
FAKE_ANTHROPIC_KEY = "sk-" + "ant-" + "a1B2c3D4e5" * 3


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.email", "test@example.com")
    _git(tmp_path, "config", "user.name", "test")
    return tmp_path


def _stage(repo: Path, name: str, text: str) -> None:
    (repo / name).write_bytes(text.encode("utf-8"))
    _git(repo, "add", name)


def _run_scanner(repo: Path) -> subprocess.CompletedProcess:
    env = dict(os.environ, LC_ALL="C", LANG="C", PYTHONUTF8="0", PYTHONCOERCECLOCALE="0")
    return subprocess.run(
        [sys.executable, "-X", "utf8=0", str(SCRIPT)],
        cwd=repo, env=env, capture_output=True,
    )


def test_blocks_secret_in_file_with_non_ascii_text(repo: Path) -> None:
    # U+201D (right curly quote) is E2 80 9D in UTF-8; 0x9D is undefined in cp1252.
    _stage(repo, "notes.md", f"Price €50 “quoted” → key={FAKE_ANTHROPIC_KEY}\n")

    result = _run_scanner(repo)

    out = result.stdout.decode("utf-8", "replace")
    assert result.returncode == 1, out + result.stderr.decode("utf-8", "replace")
    assert "anthropic_key" in out


def test_allows_clean_file_with_non_ascii_text(repo: Path) -> None:
    _stage(repo, "notes.md", "Price €50 “quoted” → nothing secret here\n")

    result = _run_scanner(repo)

    assert result.returncode == 0, result.stdout.decode("utf-8", "replace")
