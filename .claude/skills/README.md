# Claude Code skills for WorkScanAI

Skills are loaded automatically by Claude Code from this folder. Each one is a
repeatable procedure the agent follows; they carry no project context on their
own, so the project rules live in the spec/constitution docs, not here.

## Vendored third-party skills

Copied verbatim (no edits) from pinned commits, selected from
[awesome-claude-skills](https://github.com/BehiSecc/awesome-claude-skills).
Markdown-only except `webapp-testing`, whose helper scripts are Anthropic's own.
Each folder keeps its upstream license file.

| Skill | Why it is here | Source @ commit | License |
|---|---|---|---|
| `test-driven-development` | Red-green-refactor for scoring/parsing logic and eval harness | [obra/superpowers](https://github.com/obra/superpowers) @ `5bf4e78` | MIT |
| `systematic-debugging` | Root-cause first (cold starts, LLM parse failures) | obra/superpowers @ `5bf4e78` | MIT |
| `verification-before-completion` | No "done" without fresh command output | obra/superpowers @ `5bf4e78` | MIT |
| `requesting-code-review` | Reviewer subagent before merging a feature branch | obra/superpowers @ `5bf4e78` | MIT |
| `finishing-a-development-branch` | Merge / PR / keep menu at end of a feature branch; never force-pushes | obra/superpowers @ `5bf4e78` | MIT |
| `webapp-testing` | Playwright checks against `localhost:3000` before merge | [anthropics/skills](https://github.com/anthropics/skills) @ `34040c9` | Apache-2.0 |
| `owasp-security` | OWASP Top 10:2025, **LLM Top 10** (prompt injection, output handling, unbounded consumption) | [agamm/claude-code-owasp](https://github.com/agamm/claude-code-owasp) @ `bfaf257` | MIT |

Not taken, on purpose: skills that start servers or run shell scripts from
unknown authors, spec-driven "plugin" bundles that would impose their own folder
layout over this repo's `specs/`, and anything needing extra API keys.

## Project gates the skills must use

When a skill says "run the tests / build", in this repo that means:

- Frontend: `npx tsc --noEmit` and `npx eslint "<path>"` in `frontend/` — both exit 0
- Backend: `backend/venv/Scripts/python.exe -m pytest backend/tests -q`
- Secrets: pre-commit hook `.githooks/pre-commit` (`git config core.hooksPath .githooks`)

## Updating

Re-vendor by bumping the commit SHA in this table, diff the upstream change,
and review it like any other dependency. Never edit a vendored `SKILL.md` in
place; write a project skill next to it instead.
