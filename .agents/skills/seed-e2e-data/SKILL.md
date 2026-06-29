---
name: seed-e2e-data
description: Creates minimal dummy DB and fixture data for E2E tests — seed script, stable IDs manifest, Playwright globalSetup wiring, auth notes. Use when setting up E2E seed data, before running setup-e2e or run-e2e, or when user says seed e2e, dummy data for e2e, or /seed-e2e-data.
---

# Seed E2E Data

Minimal persisted state so E2E specs can run. Announce: `Using seed-e2e-data on <repo>.`

**Sub-agents:** every `Task` prompt MUST require [ponytail](REFERENCE.md#sub-agent-constraints) + [caveman](REFERENCE.md#sub-agent-constraints). Code = ponytail minimal; prose = caveman.

Companion to **setup-e2e** (after step 3) and prerequisite for **run-e2e** when specs hit real DB.

## Step 0 — already seeded?

Check for:

- `scripts/seed-e2e.*` or `tests/e2e/global-setup.*`
- `tests/e2e/fixtures/manifest.json` (or equivalent)
- `package.json` script `seed:e2e`

| Outcome | Route |
|---------|-------|
| Seed + manifest cover all `tests/e2e/**/*.spec.*` entity refs | Jump to **step 6** |
| Partial | Resume at earliest gap |
| None | **step 1** |

## Step 1 — domain + schema

Read before writing data:

1. `CONTEXT.md` — use domain terms (Scheduler, Calendar, Member, Meeting, …)
2. `docs/CODEMAP.md` — database section, auth, env vars
3. `lib/db/schema.ts` (or ORM equivalent) — FK order for inserts
4. Existing seeds: `**/test-db.ts`, `seed*` helpers in unit tests, SQL migrations

Record insert order (parents → children). Note `USE_STUBS`, auth, external APIs.

## Step 2 — infer requirements

From `tests/e2e/**/*.spec.*` (if missing, from setup-e2e branch list or CODEMAP routes):

- Entities each spec needs (scheduler, calendar slug, member emails, meeting tokens, …)
- Auth: guest-only vs signed-in Scheduler
- Time-sensitive data: fixed ISO timestamps, frozen clock in config?

Dispatch **parallel** `Task` explore agents — one per spec file or branch. Prompt: [REFERENCE § requirements](REFERENCE.md#requirements-agent-prompt).

Merge into one **requirements table** (entity → count → stable key → used-by specs).

## Step 3 — pick strategy

Climb ponytail ladder — stop at first rung that works:

1. Reuse existing seed script / factory?
2. Extend unit-test `seed*` fns with a thin CLI wrapper?
3. One TS/SQL seed script + npm `seed:e2e`?
4. Playwright `globalSetup` only (API calls) — only if no simpler script path

Default this repo pattern: **`scripts/seed-e2e.ts`** + drizzle inserts + **`tests/e2e/fixtures/manifest.json`** with stable UUIDs/slugs.

Do not duplicate runners or add ORM deps already present.

## Step 4 — implement seed

Deliverables (ponytail — fewest files):

| Artifact | Purpose |
|----------|---------|
| `scripts/seed-e2e.ts` | Idempotent insert (upsert or truncate+seed) |
| `tests/e2e/fixtures/manifest.json` | Stable IDs, slugs, URLs, tokens for specs |
| `tests/e2e/fixtures/index.ts` | Optional typed export for specs |
| `package.json` → `seed:e2e` | `tsx`/`node` entry |

Rules:

- **Stable keys** — fixed UUIDs/slugs so specs don't grep DB
- **Minimal graph** — one Scheduler, one Calendar, few Members; add entities only requirements table demands
- **FK order** — schedulers → calendars → members → teams → links → meetings → tokens
- **External deps** — document `USE_STUBS=1` (or project equivalent) for Google/SF/email; don't seed what stubs cover
- **Auth** — seed Scheduler row matching Playwright storage-state email; document one-time `playwright codegen --save-storage=…` if OAuth required ([REFERENCE § auth](REFERENCE.md#auth))
- Mark shortcuts: `// ponytail: …`

## Step 5 — wire E2E runner

In Playwright/Cypress config:

- `globalSetup` / `before:run` calls `npm run seed:e2e` when `SEED_E2E=1` (default on CI)
- Document env in config comment: `DATABASE_URL`, `USE_STUBS=1`, `SEED_E2E=1`
- Link manifest from specs: `import { e2e } from './fixtures'`

Update **setup-e2e** boilerplate if step 3 didn't add globalSetup yet.

## Step 6 — verify

```bash
npm run seed:e2e   # or project equivalent
```

Confirm manifest entities exist (one drizzle select or script `--check`). Fail loudly on missing FK targets.

## Step 7 — document

Add **`E2E_SEED.md`** at repo root ([template](REFERENCE.md#e2e_seed-template)):

- Command to seed / reset
- Env vars
- Manifest keys table
- Auth setup steps
- Which specs consume which fixture keys

Summarize in chat (caveman).

---

## Related skills

| Skill | When |
|-------|------|
| setup-e2e | Generates specs first; call seed-e2e-data after step 3 |
| run-e2e | Run after seed verified |
| ponytail / caveman | All agents |
| find-skills | Optional: `npx skills find seed data testing` |

Details: [REFERENCE.md](REFERENCE.md)
