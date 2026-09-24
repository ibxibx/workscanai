# 001 · Secret scanner reads staged files as UTF-8: requirements

- **Roadmap item:** `specs/roadmap.md` → Phase 0, item 001
- **Branch:** `fix/001-secret-scan-utf8`
- **Status:** implemented

## Problem

`scripts/secret_scan_precommit.py` reads staged content with
`subprocess.run(..., text=True)` and no `encoding`, so Python decodes git's
output with the OS locale codec: `cp1252` on the Windows dev machine.

UTF-8 text containing bytes that `cp1252` cannot map (for example the right
curly quote `”` (U+201D), bytes `E2 80 9D`) raises `UnicodeDecodeError` in the
subprocess reader thread. `stdout` comes back empty, `staged_blob()` returns
`""`, `main()` treats the file as empty and **skips it**, and the commit goes
through.

Evidence: committing PR #2 printed five `UnicodeDecodeError: 'charmap' codec
can't decode byte 0x9d` tracebacks from the hook, and the commit still succeeded.
This repo uses `€`, arrows and curly quotes throughout, so the scanner silently
skipped a real share of files. That is a fail-open security control.

On POSIX with a non-UTF-8 locale (e.g. `LC_ALL=C`, typical in minimal CI
images) the same bug shows differently: the decode error is raised in the main
thread, the hook crashes and blocks every commit that touches non-ASCII text.

## Goal

The scanner decodes staged content as UTF-8 on every OS and locale, so a secret
next to non-ASCII text blocks the commit.

## In scope

- Explicit `encoding="utf-8", errors="replace"` on both `git` subprocess calls.
- Regression tests that run the real script against a real temporary git repo.

## Out of scope

- New secret patterns or a different scanning tool.
- Failing closed when `git show` itself errors (separate, smaller risk; noted as
  a follow-up in validation).

## Decisions

| Decision | Chosen | Why / alternatives rejected |
|---|---|---|
| Decode errors | `errors="replace"` | A secret is ASCII; replacing undecodable bytes (binary files) keeps scanning the rest. `strict` would crash the hook on binaries. |
| Test style | Subprocess run of the real script in a temp repo, forced to a non-UTF-8 locale | Reproduces the bug on Linux CI as well as Windows; no mocking of `subprocess`. |
| Test fixture secret | Built by string concatenation | The test file itself must not contain a matching literal, or the hook blocks its own commit. |

## Context and constraints

Principle "fail visibly" (`mission.md`); OWASP A10 "Mishandling of Exceptional
Conditions → fail closed" (`owasp-security` skill).
