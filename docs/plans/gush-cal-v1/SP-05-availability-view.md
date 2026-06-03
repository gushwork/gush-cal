# SP-05: Availability view

## Type
Parallel

## Blocked by
- SP-01 (types, auth)
- SP-03 (slot helpers / `SlotEnginePort` for bookable overlay)
- SP-04 (`CalendarBundle` via API, admin layout nav)

## Goal
Deliver the read-only day/week availability view: one column per Member showing busy blocks, inaccessible state, and a pooled "bookable slot" overlay for the Scheduler configuring a panel.

## Owns
- `app/api/calendars/[id]/availability/route.ts`
- `app/(admin)/calendars/[id]/availability/page.tsx`
- `components/availability-grid/` (day/week toggle, member columns, bookable overlay)
- `pnpm test:sp-05` script (single line in `package.json`)

## Provides
- `GET /api/calendars/:id/availability?from=&to=` → `{ members: MemberBusyBlock[] }`
- Day/week grid UI at `/calendars/[id]/availability`
- Inaccessible Member: empty column + indicator (never fake busy)

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `MemberBusyBlock`, auth | — |
| SP-02 | `GoogleCalendarPort.queryFreeBusy` | stub returning fixed busy blocks |
| SP-03 | `getAvailableSlots` or eligibility helpers | stub slot engine returning fixed slots |
| SP-04 | `GET /api/calendars/:id` | mock fetch in tests |

## Out of scope
- Booking actions (SP-06)
- Calendar CRUD forms (SP-04)
- Public booking page
- Slot API routes used by booking (`/api/book/`, `/api/calendars/:id/slots` — SP-06)

## Implementation notes
- Availability API fetches FreeBusy for date range via injected `GoogleCalendarPort` (wire real factory when SP-02 merged).
- Overlay: call slot engine for default duration (first in Calendar.durations) or let user pick duration in UI toggle.
- Timezone: Scheduler browser TZ for grid labels.
- Week view: 7 columns of time rows or horizontal day columns — pick one pattern, document in component.
- Component tests with stub data; API route tests with mocked google port.

## Done when
- [ ] Availability API returns per-Member busy + inaccessible status
- [ ] Grid renders day/week with bookable overlay
- [ ] Inaccessible Member UX matches CONTEXT.md rules
- [ ] `pnpm test:sp-05` passes with stubs
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-05 Availability view**. Build `GET /api/calendars/:id/availability` and admin page `/calendars/[id]/availability` with `components/availability-grid/`. Show each Member's busy blocks via `GoogleCalendarPort` (stub OK) and bookable slots via slot engine (stub OK). Inaccessible members get empty column + indicator. Do not implement booking or calendar CRUD. Done when `pnpm test:sp-05` passes. Own only SP-05 paths.
