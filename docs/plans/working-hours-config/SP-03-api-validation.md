# SP-03: API validation

## Type
Parallel

## Blocked by
- SP-01 (`validateWorkingHours`, `validateTimezone`, types)

## Goal
Calendar and Member API routes accept, validate, and persist `timezone` and working hours per contracts.

## Owns
- `app/api/calendars/route.ts`
- `app/api/calendars/[id]/route.ts`
- `app/api/calendars/[id]/members/route.ts`
- `app/api/calendars/[id]/members/[memberId]/route.ts`
- `app/api/calendars/calendars-api.test.ts` (new or extend)

## Provides
- POST/PATCH calendars persist `timezone` + `defaultWorkingHours` (validated)
- POST/PATCH members enforce override/TZ rules
- 400 with clear error messages on invalid hours/TZ

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | validators + types | inline validation copies until SP-01 merged |

## Out of scope
- UI forms (SP-04, SP-05)
- Slot engine (SP-06)
- Editor components (SP-02)

## Implementation notes
- Create: require `timezone`; default hours from body or `DEFAULT_WORKING_HOURS`.
- Member create/update: if `workingHoursOverride` is non-empty array → require `timezone`; if null/empty override → set `timezone` null.
- Do not allow member `timezone` when using calendar defaults.
- Update test fixtures to include `timezone: "UTC"`.

## Done when
- [ ] API tests cover valid/invalid hours and TZ pairing
- [ ] `npm run test:wh-03` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-03 API validation** for working hours config. Update all four calendar/member API routes to accept and validate `timezone` and working hours using `lib/working-hours/validate`. Add API route tests. Do not touch React forms or slot engine. Done when `npm run test:wh-03` passes.
