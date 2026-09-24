# Changelog

All notable changes to this project. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Every merged roadmap
item adds a line under **Unreleased** in the same PR.

## [Unreleased]

### Added
- Project constitution in `specs/` (mission, tech stack, roadmap, process,
  feature templates), `CLAUDE.md` for coding agents and the `sdd-feature`
  project skill.
- Seven vetted Claude Code skills in `.claude/skills/` (TDD, debugging,
  verification, code review, branch finishing, Playwright testing, OWASP incl.
  LLM Top 10). (#2)
- Evaluation harness `evals/`: 50 labelled tasks, metrics, subscription-backed
  runner with replayable reports, and a committed baseline (Spearman 0.93,
  band accuracy 72%, 36% prompt-rule violations). (002, #5)

### Fixed
- Pre-commit secret scanner decodes staged files as UTF-8. On Windows it used
  cp1252, failed on some UTF-8 characters and skipped those files without
  blocking the commit. Regression tests added. (001, #4)
