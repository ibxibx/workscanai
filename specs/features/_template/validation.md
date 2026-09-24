# NNN · Feature name: validation

The feature can be merged when every box is ticked **with evidence pasted
below it** (command and the relevant output lines, or a screenshot path).

## Acceptance checks

- [ ] A1 

## Quality gates (from `tech-stack.md`)

- [ ] Backend tests: `backend/venv/Scripts/python.exe -m pytest backend/tests -q`
- [ ] Frontend (if touched): `npx tsc --noEmit` and `npx eslint "<paths>"`
- [ ] Eval (from 002 on, if scoring touched): `python -m evals.run` not below baseline
- [ ] UI (if touched): checked on `localhost:3000`

## Review

- [ ] Review pass done; findings fixed or noted as follow-ups

## Evidence

<!-- paste here -->
