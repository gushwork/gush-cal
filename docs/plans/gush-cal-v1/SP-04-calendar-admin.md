# SP-04: Calendar admin CRUD

## Type
Parallel

## Blocked by
- SP-01 (DB, auth, types)

## Goal
Let a signed-in Scheduler create and manage Calendars and Members: name, slug/public link display, durations, caps, default working hours, booking window, and per-Member overrides.

## Owns
- `app/api/calendars/route.ts`
- `app/api/calendars/[id]/route.ts`
- `app/api/calendars/[id]/members/route.ts`
- `app/api/calendars/[id]/members/[memberId]/route.ts`
- `app/(admin)/layout.tsx`
- `app/(admin)/calendars/page.tsx`
- `app/(admin)/calendars/new/page.tsx`
- `app/(admin)/calendars/[id]/page.tsx`
- `app/(admin)/calendars/[id]/members/[memberId]/page.tsx`
- `components/calendar-admin/` (forms, member list, copy-link button)
- `pnpm test:sp-04` script (single line in `package.json`)

## Provides
- All Calendar/Member CRUD endpoints in `contracts.md`
- Admin UI: list, create, edit Calendar; add/edit/remove Members
- `GET /api/calendars/:id` returns full `CalendarBundle`
- Public link shown as `{APP_URL}/book/{slug}`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | DB repos, `getSession()`, domain types | — |
| SP-01 | Auth middleware | login redirect |

## Out of scope
- Slot listing, booking, Meetings (SP-06)
- Availability grid (SP-05) — may add nav link placeholder to `/calendars/[id]/availability` (dead link OK until SP-05)
- Google API calls
- `app/book/` public pages

## Implementation notes
- All routes require Scheduler session; 401 if missing.
- Validate `durations` ⊆ `ALLOWED_DURATIONS`.
- Member cap overrides: reject if less than Calendar default (400).
- Member email must match `@GOOGLE_WORKSPACE_DOMAIN` (configurable).
- Delete Calendar cascades Members + Meetings (or soft-delete — pick cascade delete for v1).
- UI: minimal functional forms; no design polish required.
- API route tests with test DB or mocked repos.

## Done when
- [ ] CRUD endpoints match `contracts.md` request/response shapes
- [ ] Scheduler can create Calendar, add Members, edit overrides via UI
- [ ] `pnpm test:sp-04` passes
- [ ] No edits outside **Owns** (except package.json test script)

## Agent spawn brief
Implement **SP-04 Calendar admin CRUD**. Read `contracts.md` HTTP table for `/api/calendars` and members routes. Build admin UI under `app/(admin)/calendars/` and `components/calendar-admin/`. Use SP-01 DB and auth only — no Google, no slots. Validate durations and cap overrides. Done when routes + UI work and `pnpm test:sp-04` passes. Own only paths in SP-04 **Owns**.
