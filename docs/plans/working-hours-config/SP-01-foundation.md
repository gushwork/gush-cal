# SP-01: Foundation + schema

## Type
Foundation

## Blocked by
None

## Goal
Add `timezone` columns, update domain types/mappers, and ship pure `lib/working-hours` helpers (`format`, `validate`, `effectiveTimezone`) so parallel agents share stable contracts.

## Owns
- `drizzle/` (new migration `0001_working_hours_timezone.sql` + journal)
- `lib/db/schema.ts`
- `lib/db/mappers.ts`
- `lib/types/index.ts`
- `lib/types/api.ts`
- `lib/working-hours/format.ts`
- `lib/working-hours/validate.ts`
- `lib/working-hours/effective-timezone.ts`
- `lib/working-hours/index.ts`
- `lib/working-hours/__tests__/`
- `lib/slots/working-hours.ts` — add `effectiveTimezone()` export only (do not change eligibility yet)
- `lib/stubs/working-hours-editor-stub.tsx` (minimal placeholder for SP-04/05 until SP-02)
- `docs/plans/working-hours-config/contracts.md` (authoritative)
- `package.json` — add `test:wh-01` … `test:wh-06` scripts

## Provides
- `Calendar.timezone`, `CalendarMember.timezone` types
- `validateWorkingHours(hours): string | null`
- `validateTimezone(tz): string | null`
- `effectiveTimezone(member, calendar): IanaTimezone`
- `minutesToLocaleTime` / `localeTimeToMinutes` (locale-aware via `Intl`)
- DB migration runnable via `npm run db:migrate`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| — | — | — |

## Out of scope
- UI components (SP-02)
- API route changes (SP-03)
- Form wiring (SP-04, SP-05)
- Eligibility behavior change (SP-06)

## Implementation notes
- Existing rows: backfill `calendars.timezone` to `'UTC'` in migration.
- `effectiveWorkingHours` stays in `lib/slots/working-hours.ts`; `effectiveTimezone` lives in `lib/working-hours/effective-timezone.ts`.
- Stub editor: renders "WorkingHoursEditor pending SP-02" and passes through `value` unchanged.

## Done when
- [ ] Migration applies cleanly
- [ ] `npm run test:wh-01` passes
- [ ] Types compile; mappers include `timezone`
- [ ] `contracts.md` matches implementation
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-01 Foundation** for working-hours config. Read `docs/plans/working-hours-config/contracts.md`. Add `timezone` to calendars and calendar_members (migration + Drizzle + types + mappers). Create `lib/working-hours/` with format, validate, effectiveTimezone helpers and tests. Export `effectiveTimezone` for SP-06. Add stub `WorkingHoursEditor` placeholder. Add npm test:wh-* scripts. Do not touch API routes, forms, or eligibility filtering yet.
