# Spec-driven development in WorkScanAI

This folder is the project **constitution**: the source of truth the code is
built from. Humans and coding agents read it before changing anything.

```
specs/
├── mission.md          why the product exists, principles, success
├── tech-stack.md       what we build with, quality gates, conventions
├── roadmap.md          ordered list of features; the next one is at the top
└── features/
    ├── _template/      copy this for every new feature
    └── NNN-slug/
        ├── requirements.md   scope, decisions, context
        ├── plan.md           numbered task groups
        └── validation.md     how we know it is done and mergeable (+ evidence)
```

## The rules

1. **Constitution first.** `mission.md`, `tech-stack.md` and `roadmap.md` win
   over anything said in a chat. If they are wrong, fix them first.
2. **One roadmap item = one branch = one PR.** Branch from up-to-date `main`,
   named as in `tech-stack.md`.
3. **Spec before code.** Create `specs/features/NNN-slug/` from `_template/`.
   `requirements.md` and `validation.md` are agreed before implementation starts.
4. **Reviewable means:** the diff can be read in one sitting and checked line
   by line against `requirements.md`; every item in `validation.md` has pasted
   evidence (command + output). If it is too big to review, split the feature.
5. **Test first where it can be tested** (skill: `test-driven-development`).
6. **Validate before merge:** quality gates from `tech-stack.md`, a manual or
   Playwright check on `localhost:3000` for UI changes (skill: `webapp-testing`),
   and a review pass (skill: `requesting-code-review`). No "done" without fresh
   evidence (skill: `verification-before-completion`).
7. **Merge through a PR**, then tick the item in `roadmap.md` and add an entry to
   `CHANGELOG.md` in the same PR.
8. **Replanning** (new stack choice, reordered roadmap, changed principle) happens
   on its own `replan/*` branch that edits only the constitution files.
9. **Fresh context per feature.** Start a new agent session (or `/clear`) when
   picking up the next item, so the specs, not old chat, carry the context.
10. **Periodic sweep.** After each phase: full test + eval run, refactor pass on
    what the phase touched, results committed.

The project skill `.claude/skills/sdd-feature` walks an agent through this loop.
