# SP-01: Foundation + contracts

## Type
Foundation

## Blocked by
None

## Goal
Scaffold the Next.js 16 app, Postgres schema, Scheduler auth, shared domain types, port interfaces, and test stubs so parallel agents can build against stable contracts without touching each other's files.

## Owns
- `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`
- `drizzle.config.ts`, `drizzle/` (migrations)
- `lib/types/`
- `lib/db/` (schema, client, repositories, `meeting-counter.ts`)
- `lib/auth/`
- `lib/ports/`
- `lib/stubs/` (`google-calendar-stub.ts`, `slot-engine-stub.ts`)
- `lib/deps.ts` (`createAppDeps()` — stub ports by default; `USE_STUBS=1` forces stubs)
- `middleware.ts`
- `app/layout.tsx`, `app/page.tsx` (redirect to login or calendars)
- `app/api/auth/[...nextauth]/route.ts`
- `app/(auth)/login/page.tsx`
- `CONTEXT.md` (update glossary: Scheduler, Calendar, Member, Meeting)
- `docs/plans/gush-cal-v1/contracts.md` (authoritative v1.0.0)
- Root test scripts in `package.json`

## Provides
- All types in `contracts.md` → `lib/types/index.ts`
- `GoogleCalendarPort`, `SlotEnginePort`, `DbMeetingCounter` interfaces → `lib/ports/`
- Working stubs → `lib/stubs/`
- Drizzle schema for `schedulers`, `calendars`, `calendar_members`, `meetings`
- Auth.js Google OAuth restricted to `GOOGLE_WORKSPACE_DOMAIN`
- `getSession()` helper for API routes
- `createAppDeps()` in `lib/deps.ts` — returns stub `GoogleCalendarPort` + stub `SlotEnginePort` + real `DbMeetingCounter`; respects `USE_STUBS=1`
- `pnpm test` green with stub-only integration smoke test

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| — | — | — |

## Out of scope
- Real Google DWD client (SP-02)
- Slot generation / assignment logic (SP-03)
- Calendar CRUD routes and admin UI (SP-04)
- Availability grid (SP-05)
- Booking routes and pages (SP-06)
- Fly.io / Docker (SP-07)

## Implementation notes
- Use Drizzle ORM + `postgres` driver; migrations via `drizzle-kit`.
- Auth.js v5 (NextAuth) with Google provider; reject sign-in if email domain ≠ `ALLOWED_DOMAIN`.
- On first sign-in, upsert `schedulers` row keyed by `google_sub`.
- Calendar `slug`: crypto-random URL-safe string (≥16 chars); unique index.
- `default_working_hours` and overrides stored as JSONB matching `WorkingHours` type.
- Port stubs return deterministic data for tests (document in stub file comments).
- `lib/deps.ts` pattern: lazy singleton; SP-02 adds `lib/google/register.ts` imported by deps when `GOOGLE_SERVICE_ACCOUNT_JSON` set; SP-03 adds `lib/slots/register.ts` similarly. SP-01 deps file uses dynamic imports or conditional requires documented in contracts.md — SP-02/SP-03 must not edit `lib/deps.ts` after foundation merge (registration via `lib/deps/registry.ts` owned by SP-01, register functions called from SP-02/SP-03 `index.ts` on first import — or simpler: SP-01 deps checks env and imports from `lib/google` / `lib/slots` if modules exist).

**Recommended pattern:** SP-01 `lib/deps.ts` tries `import { createGoogleCalendarPort } from '@/lib/google'` in try/catch; falls back to stub. SP-02 landing adds `lib/google/` and deps auto-picks real when env present. No cross-SP edits to deps.ts.
- Add `lib/db/seed-dev.ts` optional script for local dev (not required for done).

## Done when
- [ ] `pnpm dev` starts; login page renders
- [ ] Scheduler can sign in with Workspace Google account (domain gate works)
- [ ] All four DB tables exist via migration; `pnpm db:migrate` documented
- [ ] `lib/types`, `lib/ports`, `lib/stubs` match `contracts.md`
- [ ] `pnpm test` passes (auth helper tests + stub smoke)
- [ ] `CONTEXT.md` updated with Scheduler / Calendar / Meeting glossary
- [ ] No files created outside **Owns**

## Agent spawn brief
You are implementing **SP-01 Foundation** for the panel scheduling app. Read `docs/plans/gush-cal-v1/contracts.md` in full — you own that file and must implement every type, port interface, and DB table listed there. Scaffold Next.js 16 + Drizzle + Postgres + Auth.js (Google OAuth, Workspace domain only). Create stub implementations for `GoogleCalendarPort` and `SlotEnginePort` in `lib/stubs/`. Update `CONTEXT.md` with the new domain glossary (Scheduler, Calendar, Member, Meeting). Do not implement Google DWD, slot logic, CRUD UI, booking, or deploy config. Done when `pnpm test` passes and a Scheduler can sign in. Touch only paths listed under **Owns** in SP-01.
