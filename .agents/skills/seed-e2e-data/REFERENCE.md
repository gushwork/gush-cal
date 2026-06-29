# Seed E2E Data — Reference

## Sub-agent constraints

Every `Task` prompt MUST include:

```
Read and follow before any work:
- .agents/skills/ponytail/SKILL.md
- .agents/skills/caveman/SKILL.md

Code: ponytail — minimal seed graph, reuse lib/**/test-db.ts patterns, stable IDs, // ponytail: comments.
Prose: caveman terse.
```

---

## Requirements agent prompt

```
Full Repository Path: <abs path>

Read ponytail + caveman first.

Target: <spec file path or branch name>

Tasks:
1. List every persisted entity this spec needs (table/entity, count, fields tests assert on).
2. List auth role: guest | scheduler | api-key | none.
3. List env/stub deps (USE_STUBS, external APIs).
4. Propose stable manifest keys (e.g. calendar.slug = "e2e-demo").

Return requirements table only. No seed implementation yet.
```

Dispatch parallel (`subagent_type: explore`, `run_in_background: true`) — one agent per spec file or branch.

---

## Insert order (this repo)

Use when seeding Postgres via drizzle. Adjust per project schema.

```
schedulers
  → calendars → calendar_settings
  → calendar_members
  → teams → team_members
  → booking_links
  → meetings → meeting_manage_tokens
  → email_sequences → email_sequence_steps
  → webhook_endpoints, api_keys, salesforce_* (only if specs need them)
```

Reuse patterns from `lib/email/test-db.ts`, `lib/teams/test-db.ts`, unit `seed*` fns — don't re-invent row shapes.

---

## Auth

| Pattern | When |
|---------|------|
| **Storage state** | Real NextAuth/OAuth — one-time manual login, save JSON, set `PLAYWRIGHT_STORAGE_STATE` |
| **Seeded Scheduler row** | DB row email must match Google account used in storage state |
| **Guest-only specs** | No auth file; public booking/manage-token URLs only |
| **API key specs** | Seed `api_keys` row; manifest holds raw key once (gitignore `.e2e-secrets.json`) |

Visual audit precedent in this repo:

```bash
npx playwright codegen --save-storage=tests/e2e/.auth/scheduler.json http://localhost:4000/calendars
PLAYWRIGHT_STORAGE_STATE=tests/e2e/.auth/scheduler.json npm run test:e2e
```

Add `tests/e2e/.auth/` to `.gitignore`. Document in `E2E_SEED.md`.

Do not build OAuth bypass unless repo already has test auth hook.

---

## manifest.json template

```json
{
  "scheduler": { "id": "00000000-0000-4000-8000-000000000001", "email": "e2e-scheduler@example.com" },
  "calendar": { "id": "00000000-0000-4000-8000-000000000010", "slug": "e2e-demo" },
  "members": {
    "alice": { "id": "…", "email": "alice@example.com" },
    "bob": { "id": "…", "email": "bob@example.com" }
  },
  "team": { "id": "…", "slug": "panel-a" },
  "bookingLink": { "slug": "book-panel-a" },
  "meeting": {
    "upcoming": { "id": "…", "manageToken": "…" },
    "cancelled": { "id": "…" }
  },
  "urls": {
    "publicBook": "/book/e2e-demo",
    "adminCalendar": "/calendars/00000000-0000-4000-8000-000000000010"
  }
}
```

Specs import manifest — never hardcode IDs in multiple files.

---

## E2E_SEED.md template

```markdown
# E2E Seed Data

Generated: <ISO date>

## Commands

\`\`\`bash
DATABASE_URL=… USE_STUBS=1 npm run seed:e2e
SEED_E2E=1 npm run test:e2e
\`\`\`

## Environment

| Var | Required | Purpose |
|-----|----------|---------|
| DATABASE_URL | yes | Postgres |
| USE_STUBS | yes | Stub Google/SF/email ports |
| SEED_E2E | CI | Run globalSetup seed |
| PLAYWRIGHT_STORAGE_STATE | admin specs | Auth JSON path |

## Manifest keys

| Key | Entity | Used by |
|-----|--------|---------|
| calendar.slug | Calendar | booking.spec.ts |

## Auth setup

<one-time storage state steps>

## Reset

<truncate vs upsert strategy>
```

---

## Idempotency strategies

| Strategy | Use when |
|----------|----------|
| **Upsert on stable IDs** | Default — safe re-run |
| **Truncate e2e schema subset** | Dedicated test DB only |
| **Transaction rollback** | Unsupported for E2E server — avoid |

Never truncate production. Fail if `DATABASE_URL` looks like prod (optional guard: require `E2E_DATABASE_URL`).

---

## setup-e2e integration

Call **seed-e2e-data** after setup-e2e **step 3** (boilerplate exists, before step 4 exploration) when specs will use real DB.

If setup-e2e step 4 agents write specs first, re-run seed-e2e-data **step 2** after wave 1 to align manifest with new specs, then step 4–6.

---

## find-skills (optional)

```bash
npx skills find seed data
npx skills find playwright fixtures
npx skills find factory testing
```

Prefer repo patterns over new skills unless installs >1K and stack-specific.
