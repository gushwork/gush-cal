# Setup E2E — Reference

## Sub-agent constraints

Every `Task` prompt MUST include verbatim:

```
Before any work, read and follow these skills from the target repo:
- .agents/skills/ponytail/SKILL.md
- .agents/skills/caveman/SKILL.md

Code: ponytail ladder — minimal diff, reuse existing patterns, mark shortcuts with // ponytail:
Prose output: caveman terse — no filler, fragments OK, technical terms exact.
```

If repo lacks ponytail/caveman under `.agents/skills/`, inline the core rules from this repo's copies or fall back to `~/.cursor/skills/`.

---

## Step 0 readiness checklist

Jump to **step 6** only when **every** item passes. Otherwise resume at the **first failing** step.

| # | Check | Pass criteria | Fail → step |
|---|-------|---------------|-------------|
| 0.1 | Stack documented | Language + framework + runner identified in chat or prior run | 1 |
| 0.2 | Runner installed | `@playwright/test`, `cypress`, etc. in manifest | 3 |
| 0.3 | E2E config | Dedicated config (`playwright.config.ts`, not visual-only) OR clearly scoped e2e project in monorepo config | 3 |
| 0.4 | Run script | `test:e2e` or equivalent in `package.json` / Makefile / CI | 3 |
| 0.5 | Flow tests | `tests/e2e/` (or stack convention) has specs beyond smoke — auth, CRUD, or domain flows | 4 |
| 0.6 | Wave 1 done | Tests cover ≥2 disjoint branches OR single-branch app fully mapped | 4 |
| 0.7 | Overlap waves done | Wave 2 executed; wave 3 executed if wave 2 found new overlaps | 5 |
| 0.8 | Prior review | `E2E_ISSUES.md` exists at repo root from a previous step 6 | 6 |
| 0.9 | User gate cleared | User explicitly replied after step 7 in this or a prior session | 7 |

**Partial E2E note:** visual-only Playwright (e.g. `playwright.visual.config.ts` + screenshot tests) fails **0.5** — treat as not ready; continue from step 3 and extend, don't replace visual suite.

**Trigger discovery (for step 8):** grep `package.json` scripts, CI workflows, and config comments for `playwright test`, `cypress run`, etc.

---

## Framework detection

| Signals | Language | Framework | Default runner |
|---------|----------|-----------|----------------|
| `next`, `react`, `vue`, `@angular/core` in package.json | TS/JS | Next/React/Vue/Angular | Playwright (if none installed) |
| `playwright.config.*` or `@playwright/test` | TS/JS | — | Playwright |
| `cypress` in deps | TS/JS | — | Cypress |
| `django`, `flask`, `fastapi` in requirements | Python | Django/Flask/FastAPI | Playwright |
| `rspec` + `capybara` | Ruby | Rails | System specs / Playwright |
| `go test` + `chromedp` / `playwright-go` | Go | — | Playwright |

Prefer installed runner over default. Monorepo: detect per-package.

---

## find-skills queries (by step)

### Step 2 — setup boilerplate

```bash
npx skills find e2e
npx skills find <runner>          # playwright | cypress
npx skills find <framework> e2e   # nextjs | rails | django
```

**Known high-install options (verify before recommending):**

| Skill | Installs | Use when |
|-------|----------|----------|
| `wshobson/agents@e2e-testing-patterns` | ~19K | Generic E2E patterns |
| `currents-dev/playwright-best-practices-skill@playwright-best-practices` | ~55K | Playwright projects |
| `microsoft/playwright-cli@playwright-cli` | ~68K | Playwright CLI workflows |
| `github/awesome-copilot@playwright-generate-test` | ~14K | Generating Playwright tests |
| `cypress-io/ai-toolkit@cypress-author` | ~2K | Cypress projects |
| `bmad-labs/skills@typescript-e2e-testing` | ~2K | TypeScript stacks |

### Step 6 — review antipatterns

```bash
npx skills find "e2e testing"
npx skills find "playwright best practices"
npx skills find "testing best practices"
npx skills find "frontend testing"
```

**Known review skills:**

| Skill | Installs |
|-------|----------|
| `currents-dev/playwright-best-practices-skill@playwright-best-practices` | ~55K |
| `wshobson/agents@e2e-testing-patterns` | ~19K |
| `sergiodxa/agent-skills@frontend-testing-best-practices` | ~2K |

Install with `npx skills add <pkg> -g -y`. Read skill content before applying review.

---

## Wave 1 branch exploration prompt

```
Full Repository Path: <abs path>

Read ponytail + caveman skills first (see setup-e2e REFERENCE).

Branch: <name> — <one-line scope>
Entry points: <routes, pages, API paths>

Tasks:
1. Map all control-flow paths: happy, validation errors, auth failures, empty states, concurrency edges.
2. Cross-check CONTEXT.md / CODEMAP.md if present.
3. Write tests/e2e/<branch>.spec.<ext> — ponytail minimal, one describe per flow, no duplicate coverage.
4. List overlap candidates: flows that touch other branches (handoff points, shared DB entities, tokens).

Do not run tests. Return: flow map summary, test file paths, overlap list.
```

Dispatch with `subagent_type: explore`, `run_in_background: true`. Max practical parallelism: one agent per disjoint branch (typically 3–8).

---

## Overlap exploration prompt

```
Full Repository Path: <abs path>

Read ponytail + caveman skills first.

Overlap cluster: <slug>
Branches involved: <A + B + …>
Handoff: <what crosses branch boundary — e.g. guest booking → admin cancel via token>

Tasks:
1. Trace code paths for this intersection only.
2. Write tests/e2e/overlap-<slug>.spec.<ext> covering edge cases at the boundary (stale token, wrong role, race, partial state).
3. List NEW overlaps discovered (for next wave).

Do not run tests. Return: test file paths, new overlap list (empty if none).
```

Wave 3 uses the same prompt with overlaps from wave 2. Skip wave 3 when new overlap list is empty.

---

## E2E_ISSUES.md template

```markdown
# E2E Issues

Generated: <ISO date>
Reviewer: setup-e2e step 6
Skills used: <installed review skills>

## Summary

- 🔴 Critical: N
- 🟡 Warning: N
- 🟢 Suggestion: N

## Issues

### E2E-001 — <title>

- **Severity:** 🔴 | 🟡 | 🟢
- **File:** `tests/e2e/...`
- **Dimension:** UX | API | DB | Best practice
- **Problem:** <what's wrong>
- **Fix:** <concrete recommendation>

---

## Fixed (user session)

<!-- User/agent marks fixed issues here -->

| ID | Fixed in | Notes |
|----|----------|-------|
```

---

## Step 8 report notes

- Capture exit code, junit/json report if runner supports it
- Flag flaky retries separately from hard failures
- Map failures back to branch/overlap from steps 4–5
- If server required: document `PORT`, auth storage state, seed data deps
