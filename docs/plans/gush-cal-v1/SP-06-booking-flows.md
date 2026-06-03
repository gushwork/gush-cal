# SP-06: Booking flows

## Type
Parallel

## Blocked by
- SP-01 (DB, types, auth)
- SP-02 (`GoogleCalendarPort` create/delete)
- SP-03 (`SlotEnginePort`)
- SP-04 (Calendar bundle fetch, slug lookup)

## Goal
Complete booking at the seams: Scheduler internal book flow, public candidate self-serve at `/book/{slug}`, Meeting persistence, Google event creation with Meet, and Scheduler cancel — first-wins on slot conflicts.

## Owns
- `lib/booking/confirm-booking.ts` (orchestrate assign → Google → DB)
- `lib/booking/cancel-meeting.ts`
- `app/api/calendars/[id]/slots/route.ts`
- `app/api/calendars/[id]/book/route.ts`
- `app/api/calendars/[id]/meetings/route.ts`
- `app/api/book/[slug]/route.ts`
- `app/api/book/[slug]/slots/route.ts`
- `app/api/book/[slug]/confirm/route.ts`
- `app/api/meetings/[id]/route.ts` (DELETE)
- `app/book/[slug]/page.tsx` (public: duration → slots → form → confirm)
- `app/(admin)/calendars/[id]/book/page.tsx`
- `app/(admin)/calendars/[id]/meetings/page.tsx`
- `components/booking/` (slot picker, invitee form, meetings table)
- `pnpm test:sp-06` script (single line in `package.json`)

## Provides
- All booking-related endpoints in `contracts.md`
- `confirmBooking()` — assignMember → createMeetingEvent → insert Meeting row (transaction)
- Public and admin booking UIs
- Meetings list + cancel (delete Google event + DB row)
- 409 `SLOT_UNAVAILABLE` when assignment fails (race)

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `Meeting`, `ConfirmBookingBody`, DB | — |
| SP-02 | `createGoogleCalendarPort()` | stub |
| SP-03 | `createSlotEnginePort()` | stub |
| SP-04 | Calendar by id/slug | direct DB read OK (read-only, no edits to SP-04 files) |

## Out of scope
- Calendar/Member CRUD UI (SP-04)
- Availability grid (SP-05)
- Google client internals (SP-02)
- Slot algorithm changes (SP-03)
- Guest cancel/reschedule (v1 out of scope)

## Implementation notes
- Import `createAppDeps()` from `lib/deps.ts` only — do not wire ports directly.
- Attendees: assigned Member email + all `invitees` from form; organizer = Scheduler email via DWD.
- `bookedBy`: `"scheduler"` for admin route; `"guest"` for public confirm (set `guestEmail` from first invitee or dedicated field).
- Public routes: no auth; slug is secret capability URL.
- Optional 30s in-memory cache for `GET .../slots` (`FREEBUSY_CACHE_TTL_MS`).
- DB transaction: insert Meeting only after Google event succeeds; rollback not possible on Google — log orphan event id on DB failure.
- Form fields: Invitees (email list), Subject, Body.

## Done when
- [ ] Scheduler can book via admin flow end-to-end (with stubs or real ports)
- [ ] Public `/book/{slug}` flow works
- [ ] Meetings list shows upcoming/past; cancel removes Google event + DB row
- [ ] 409 returned when slot taken
- [ ] `pnpm test:sp-06` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-06 Booking flows** per `contracts.md` booking endpoints. Own `lib/booking/`, `app/api/book/`, `app/api/meetings/`, booking-related calendar API routes, `app/book/`, and admin book/meetings pages. Orchestrate: slot engine assign → Google create event with Meet → persist Meeting. First-wins on conflicts (409). Public candidate flow: duration → slots → invitees/subject/body → confirm. Do not edit calendar CRUD or availability grid files. Tests with port stubs (`pnpm test:sp-06`).
