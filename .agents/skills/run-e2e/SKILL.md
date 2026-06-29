---
name: run-e2e
description: Runs the existing E2E test suite, captures results, and generates a structured pass/fail report with failures, coverage gaps, and recommendations. Use when user says run e2e, run E2E tests, execute end-to-end tests, or wants setup-e2e step 8 only.
---

# Run E2E

Execute E2E suite + report. No boilerplate, no test generation. Announce: `Using run-e2e on <repo>.`

If E2E not set up → stop. Point user to `setup-e2e` skill.

## 1 — discover trigger

Find run command without asking user unless ambiguous:

1. `package.json` scripts (`test:e2e`, `e2e`, `cy:run`, …)
2. `playwright.config.*`, `cypress.config.*`, CI workflows
3. `tests/e2e/`, `e2e/`, `cypress/` dirs

Record: **command**, **config path**, **runner** (Playwright/Cypress/…).

See [trigger discovery](REFERENCE.md#trigger-discovery) if nothing obvious.

## 2 — prerequisites

Before running:

- [ ] Runner installed (`npx playwright --version`, etc.)
- [ ] At least one E2E spec exists
- [ ] Env vars documented in config/comments (`.env.test`, `USE_STUBS`, auth storage)
- [ ] Seed data present — `npm run seed:e2e` or see `E2E_SEED.md`; if missing → **seed-e2e-data** skill

If server required → [start server](REFERENCE.md#server-startup). Reuse existing scripts (`scripts/visual-audit.sh` pattern: build + start + wait).

Install browsers if Playwright: `npx playwright install chromium` (or project default).

## 3 — run

Execute discovered command. Capture:

- Exit code
- stdout/stderr (save to `test-results/e2e-run-<timestamp>.log` if verbose)
- JUnit/JSON report if runner supports it (`--reporter=json`, `--reporter=junit`)

Do **not** claim pass/fail without running. Follow **verification-before-completion**.

```bash
# examples — use whatever step 1 found
npm run test:e2e
npx playwright test --config=playwright.config.ts
npx cypress run
```

## 4 — report

Produce in chat + optional `E2E_REPORT.md` at repo root when user wants a saved artifact.

```markdown
# E2E Report — <ISO date>

## Summary
- **Runner:** Playwright | Cypress | …
- **Command:** `<exact command>`
- **Result:** N passed · N failed · N skipped · N flaky
- **Duration:** Xm Ys
- **Exit code:** 0 | non-zero

## Failures

| Test | Error | Likely cause |
|------|-------|--------------|
| … | … | … |

## Flaky (retries passed)

| Test | Attempts | Notes |

## Coverage gaps

Untested routes/flows visible from `tests/e2e/` vs app routes (quick diff — no full audit).

## Recommendations

Top 3 next fixes or tests, ordered by impact.

## Raw output

<path to log or "inline below">
```

Report rules: [REFERENCE § report notes](REFERENCE.md#report-notes).

## 5 — on failure

| Situation | Action |
|-----------|--------|
| No E2E setup | → `setup-e2e` |
| Missing server | Start per REFERENCE; retry once |
| Auth required | Document blocker; suggest storage-state setup |
| All pass | Short summary only — skip failure table |

## Related skills

| Skill | When |
|-------|------|
| setup-e2e | Full setup + test generation (steps 0–7) |
| seed-e2e-data | Dummy DB + manifest before/at run time |
| verification-before-completion | Before claiming results |
| diagnose | Deep-dive on persistent failures |

Details: [REFERENCE.md](REFERENCE.md)
