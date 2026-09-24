---
name: sdd-feature
description: Use when starting, continuing or finishing a roadmap item in WorkScanAI - runs the spec-driven loop (branch, spec folder, tests first, implement, validate with evidence, PR, changelog).
---

# Spec-driven feature loop (WorkScanAI)

The constitution lives in `specs/`. Read `specs/README.md` for the rules; this
skill is the checklist for applying them to one roadmap item.

## 1. Pick the item

- Open `specs/roadmap.md`, take the first `[ ]` item (or the one the user named).
- Confirm with the user if the item is ambiguous or blocked. Do not start two.

## 2. Branch and spec

- `git switch main && git pull --ff-only`, then `git switch -c <branch from roadmap>`.
- Copy `specs/features/_template/` to `specs/features/NNN-slug/`.
- Fill `requirements.md` (problem with evidence, scope, decisions) and
  `validation.md` (acceptance checks). Mark the roadmap item `[~]`.
- **Stop and get the user's agreement on requirements and validation** before
  writing production code. Commit the spec as the first commit on the branch.

## 3. Plan and build

- Fill `plan.md` with numbered task groups. Tests first
  (`test-driven-development`), then code, one group at a time.
- After each group: run the quality gates from `specs/tech-stack.md`, commit.
- Bugs along the way: `systematic-debugging`. Security-relevant code or anything
  touching LLM input/output: check against `owasp-security` (LLM Top 10).

## 4. Validate

- Tick every item in `validation.md` and paste fresh evidence (command + output)
  under it (`verification-before-completion`). UI changes: check
  `localhost:3000` (`webapp-testing`).
- Review pass (`requesting-code-review`); fix or record findings.

## 5. Ship

- In the same branch: roadmap item → `[x]`, add a line to `CHANGELOG.md`
  under Unreleased, set requirements status to `implemented`.
- Push, open a PR linking the spec folder with the validation evidence in the
  body. Merge only on the user's go-ahead (`finishing-a-development-branch`).
- After merge: requirements status → `merged` (next PR is fine), suggest a fresh
  session for the next item.

## Repo-specific gotchas

- Windows: commit via `_commitmsg.txt` + `git commit -F`, delete the temp file
  with Python `os.remove`. Never `Set-Content` on TSX files.
- Backend Python: `backend/venv/Scripts/python.exe`.
- Author: `git -c user.name="Ian Baumeister" -c user.email="164527551+ibxibx@users.noreply.github.com"`.
