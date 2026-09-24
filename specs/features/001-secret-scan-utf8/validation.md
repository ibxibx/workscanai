# 001 · Secret scanner reads staged files as UTF-8: validation

## Acceptance checks

- [x] A1 A staged file containing `€`, curly quotes and a fake Anthropic key
      makes the scanner exit 1 and name `anthropic_key`, under a non-UTF-8
      locale, on Windows and Linux.
- [x] A2 The same file without the key exits 0.
- [x] A3 The new test fails on the old scanner (red) and passes on the fixed one.
- [x] A4 Committing this branch (whose spec files contain `€` and `”`) runs the
      hook without `UnicodeDecodeError` output.

## Quality gates

- [x] Backend tests: full suite green
- [x] `py_compile scripts/secret_scan_precommit.py`
- [ ] Frontend: not touched
- [ ] Eval: not applicable (no scoring change)

## Review

- [x] Diff reviewed against requirements: two `subprocess.run` calls changed,
      nothing else in the scanner.
- Follow-up (not in scope): `staged_blob` still returns `""` when `git show`
  fails, which skips the file. Consider failing closed.

## Evidence

A3, red on the old code (Windows, laptop):

```
> python -m pytest backend/tests/test_secret_scan_precommit.py -q
E   AssertionError: Exception in thread Thread-3 (_readerthread):
E     UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 23
FAILED backend/tests/test_secret_scan_precommit.py::test_blocks_secret_in_file_with_non_ascii_text
1 failed, 1 passed in 1.99s
```

A3, red on the old code (Linux, `LC_ALL=C`): the hook crashes instead of
reporting (`UnicodeDecodeError: 'ascii' codec can't decode byte 0xe2`), so
the `"anthropic_key" in output` assertion fails. After the fix it prints
`[COMMIT BLOCKED] possible secret(s) in staged changes`.

A1, A2, A3 green after the fix + full suite:

```
> python -m pytest backend/tests/test_secret_scan_precommit.py -q
2 passed in 1.31s
> python -m pytest backend/tests -q
67 passed in 5.74s
> python -m py_compile scripts/secret_scan_precommit.py
py_compile exit=0
```

A4: see commit output in the PR description.
