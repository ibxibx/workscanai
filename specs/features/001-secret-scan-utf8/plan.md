# 001 · Secret scanner reads staged files as UTF-8: plan

## 1. Tests first

- [x] 1.1 `backend/tests/test_secret_scan_precommit.py`: temp git repo, stage a
      UTF-8 file with a curly quote plus a fake Anthropic key, run the script
      under a non-UTF-8 locale, expect exit 1 and `anthropic_key` in output.
- [x] 1.2 Control test: clean UTF-8 file → exit 0.
- [x] 1.3 Run against current code: 1.1 must fail (red).

## 2. Implementation

- [x] 2.1 Add `encoding="utf-8", errors="replace"` to both `subprocess.run` calls.
- [x] 2.2 Re-run: both tests green; full backend suite green.

## 3. Docs and wiring

- [x] 3.1 Roadmap item 001 → `[x]`, CHANGELOG "Fixed" entry.
