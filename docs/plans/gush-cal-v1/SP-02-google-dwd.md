# SP-02: Google DWD adapter

## Type
Parallel

## Blocked by
- SP-01 (port interfaces, env var names, test harness)

## Goal
Implement the real `GoogleCalendarPort` using a Google Workspace service account with domain-wide delegation: batch FreeBusy reads for Members and event create/delete on the Scheduler's calendar with auto Google Meet.

## Owns
- `lib/google/calendar-client.ts` (JWT + impersonation)
- `lib/google/freebusy.ts`
- `lib/google/create-event.ts`
- `lib/google/delete-event.ts`
- `lib/google/index.ts` (`createGoogleCalendarPort()`)
- `lib/google/__tests__/`
- `docs/adr/001-google-dwd.md`
- `pnpm test:sp-02` script in `package.json` (single line addition only)

## Provides
- `createGoogleCalendarPort(): GoogleCalendarPort` — drop-in replacement for stub
- `queryFreeBusy` — batch `freebusy.query` impersonating each Member email
- `createMeetingEvent` — `events.insert` with `conferenceData` for Meet, impersonating organizer
- `deleteEvent` — for Meeting cancel flow (SP-06 consumes)
- ADR documenting GCP setup, scopes, impersonation model, security notes

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `GoogleCalendarPort`, `FreeBusyRequest`, `CreateMeetingEventRequest` | `lib/stubs/google-calendar-stub.ts` for local dev without credentials |

## Out of scope
- Slot filtering / assignment (SP-03)
- HTTP routes (SP-06)
- OAuth for Scheduler identity (SP-01 auth is separate from DWD)
- Availability UI (SP-05)

## Implementation notes
- Env: `GOOGLE_SERVICE_ACCOUNT_JSON` (JSON string), `GOOGLE_WORKSPACE_DOMAIN`.
- When merged, `lib/deps.ts` (SP-01) auto-detects this module and uses real port when env set — no edit to `lib/deps.ts` required.
- Impersonation: pass `subject` = target user email on JWT client.
- Scopes: `https://www.googleapis.com/auth/calendar` (covers read + events).
- FreeBusy: one API call with all Member emails in `items`.
- Map Google errors to `{ status: "error", code }` per email — never treat inaccessible as busy (align with Inaccessible Member rule).
- Meet: use `conferenceDataVersion: 1` + `createRequest` with `hangoutsMeet`.
- Unit tests mock `googleapis`; optional integration test gated by `GOOGLE_INTEGRATION=1` env.
- Fail fast with actionable error if service account JSON missing.

## Done when
- [ ] `createGoogleCalendarPort()` satisfies `GoogleCalendarPort` interface
- [ ] Unit tests pass with mocked googleapis (`pnpm test:sp-02`)
- [ ] Swapping stub → real in a one-line smoke test passes when credentials present
- [ ] `docs/adr/001-google-dwd.md` complete with admin setup steps
- [ ] No edits outside **Owns** (except `package.json` test script line)

## Agent spawn brief
Implement **SP-02 Google DWD adapter**. Read `docs/plans/gush-cal-v1/contracts.md` section `GoogleCalendarPort`. Build `lib/google/` implementing `createGoogleCalendarPort()` with domain-wide delegation: batch FreeBusy for Member emails, create events on Scheduler calendar with Google Meet, delete events. Write `docs/adr/001-google-dwd.md`. Test with mocked googleapis (`pnpm test:sp-02`). Do not touch slots, routes, UI, or DB schema. Owns only `lib/google/**` and the ADR.
