---
name: setup-e2e
description: Detects stack, bootstraps E2E boilerplate, explores app flows in parallel waves to generate tests, reviews antipatterns, waits for user fixes, then runs tests with a report. Use when user asks to set up E2E testing, add end-to-end tests, bootstrap Playwright/Cypress E2E, or run /setup-e2e.
---

# Setup E2E

Orchestrate E2E setup end-to-end. Announce: `Using setup-e2e on <repo>.`

**Sub-agents:** every `Task` prompt MUST require reading and following the target repo's [ponytail](REFERENCE.md#sub-agent-constraints) and [caveman](REFERENCE.md#sub-agent-constraints) skills. Output from sub-agents = caveman terse; code = ponytail minimal.

## Step 0 — readiness audit

Run the [readiness checklist](REFERENCE.md#step-0-readiness-checklist). Record pass/fail per item.

| Outcome | Route |
|---------|-------|
| **All items pass** | Jump to **step 6** (re-review; skip boilerplate + exploration) |
| **Partial** | Resume at earliest failing step |
| **None** | Start at **step 1** |

If E2E runner exists, also record how to trigger it (`npm run …`, `npx playwright test …`) for step 8.

## Step 1 — detect stack

Inspect repo (do not ask user unless ambiguous):

1. `package.json`, lockfiles, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`
2. Config files: `playwright*.config.*`, `cypress.config.*`, `wdio.conf.*`
3. Existing test dirs: `tests/`, `e2e/`, `cypress/`, `spec/`

Record: **language**, **framework** (Next.js, Rails, …), **recommended E2E runner** (prefer what's already installed).

See [framework detection table](REFERENCE.md#framework-detection).

## Step 2 — find setup skills

Follow the **find-skills** workflow:

```bash
npx skills find <framework> e2e
npx skills find <runner> e2e
npx skills find e2e
```

Pick highest-install skill matching stack (1K+ installs; prefer official sources). Present choice in chat. Install for this session if user hasn't blocked installs:

```bash
npx skills add <owner/repo@skill> -g -y
```

Read installed skill before step 3. Log chosen skill + install count in chat.

## Step 3 — boilerplate

Skip if step 0 shows boilerplate already present.

Minimal ponytail setup:

- One config file (or extend existing — do not duplicate runners)
- `tests/e2e/` (or stack convention) with one smoke spec
- `package.json` script: `test:e2e`
- `.gitignore` entries for artifacts (`test-results/`, `playwright-report/`, etc.)
- Reuse existing dev server script/port; document env vars in a one-line comment

Do **not** add deps the repo already has. Mark shortcuts with `// ponytail:` comments.

### 3b — seed dummy data

If specs need persisted DB state (most apps do), run **seed-e2e-data** before step 4. Re-run seed step 2–4 after wave 1 if new specs introduce entities.

## Step 4 — wave 1: branch exploration

Partition app into **disjoint flow branches** (auth, public booking, admin, API, webhooks, …). Use `docs/CODEMAP.md`, `CONTEXT.md`, routes, and API handlers.

Dispatch **parallel** `Task` agents (`subagent_type: explore`, `run_in_background: true`) — one per branch. Prompt template: [REFERENCE § wave 1](REFERENCE.md#wave-1-branch-exploration-prompt).

Each agent deliverables:

- Flow map (entry → exit, decision points, error paths)
- `tests/e2e/<branch>.spec.*` with cases for happy path + edge cases
- List of **overlap candidates** (flows touching other branches)

Wait for all agents. Merge test files; dedupe identical cases.

## Step 5 — waves 2 & 3: overlap exploration

**Wave 2:** From wave-1 overlap lists, dispatch parallel explore agents — one per overlap cluster (e.g. "guest books → admin reassigns"). Prompt: [REFERENCE § overlap](REFERENCE.md#overlap-exploration-prompt).

**Wave 3:** Repeat wave 2 on **new** overlaps surfaced in wave 2. Skip wave 3 if wave 2 found zero new overlaps.

Each agent adds tests to `tests/e2e/overlap-<slug>.spec.*`. Merge and dedupe.

## Step 6 — antipattern review

### 6a — install review skills

```bash
npx skills find "e2e testing"
npx skills find "playwright best practices"   # or cypress equivalent
npx skills find "testing best practices"
```

Install top matches (prioritize `currents-dev/playwright-best-practices-skill`, `wshobson/agents@e2e-testing-patterns`, runner-specific skills). Read before reviewing.

### 6b — review dimensions

Audit **all** generated specs for:

| Dimension | Check |
|-----------|-------|
| **UX flows** | Real user paths, stable selectors, no implementation-detail asserts |
| **API flows** | Correct HTTP methods, auth headers, idempotency, error status codes |
| **DB flows** | Test isolation, no order-dependent state, cleanup strategy |
| **Best practices** | No hard sleeps, no flaky patterns, parallel-safe, meaningful assertions |

### 6c — write `E2E_ISSUES.md`

Create/update **`E2E_ISSUES.md` at repo root** using [template](REFERENCE.md#e2e_issues-template). Also summarize top issues in chat (caveman).

Severity: 🔴 critical (must fix before merge) · 🟡 warning · 🟢 suggestion.

## Step 7 — user gate (**mandatory stop**)

**Stop. Do not run step 8.**

Tell user:

1. Read `E2E_ISSUES.md`
2. Reply with issues to fix (paste sections or say "fix all 🔴")
3. Say "run e2e" when ready to execute

If user requests fixes → apply following installed best-practice skills + ponytail. Re-run step 6 on changed specs. Stop again at step 7.

## Step 8 — run & report

Hand off to **`run-e2e`** skill — same report format, no re-setup.

---

## Related skills

| Skill | When |
|-------|------|
| find-skills | Steps 2, 6 |
| seed-e2e-data | Step 3b — dummy DB/fixtures |
| run-e2e | Step 8 only |
| ponytail | All code + sub-agents |
| caveman | Chat output + sub-agent prose |
| verification-before-completion | Before claiming step 8 pass |

Details: [REFERENCE.md](REFERENCE.md)
