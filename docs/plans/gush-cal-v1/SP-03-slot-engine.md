# SP-03: Slot engine

## Type
Parallel

## Blocked by
- SP-01 (types, `DbMeetingCounter`, stub `GoogleCalendarPort`)

## Goal
Implement slot generation and load-balanced Member assignment: filter by working hours, caps, FreeBusy, booking window, and minimum notice; assign the eligible Member with fewest Meetings in a rolling 7-day window.

## Owns
- `lib/slots/generate-slots.ts`
- `lib/slots/assign-member.ts`
- `lib/slots/working-hours.ts`
- `lib/slots/cap-limits.ts`
- `lib/slots/eligibility.ts`
- `lib/slots/index.ts` (`createSlotEnginePort()`)
- `lib/slots/__tests__/`
- `pnpm test:sp-03` script in `package.json` (single line only)

## Provides
- `createSlotEnginePort({ google, db }): SlotEnginePort`
- `getAvailableSlots()` — 15-min increment; guest-local TZ for display range; UTC storage
- `assignMember()` — re-check eligibility at exact slot; load-balance tie-break: weekly count → daily count → `sortOrder`
- Pure helpers exported for SP-05 availability overlay reuse: `isWithinWorkingHours()`, `effectiveCaps()`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `CalendarBundle`, `Slot`, `SlotEnginePort`, `DbMeetingCounter` | types + `lib/stubs/google-calendar-stub.ts` |
| SP-02 | `GoogleCalendarPort` (real) | stub until SP-02 merges; tests use stub |

## Out of scope
- HTTP routes (SP-06 calls slot engine)
- Google API client implementation (SP-02)
- Calendar CRUD (SP-04)
- UI (SP-05, SP-06)
- Persisting Meeting rows (SP-06 `lib/booking/`)

## Implementation notes
- Caps: Calendar defaults; Member override applies only when **greater** than default.
- Working hours: Member override ?? Calendar `defaultWorkingHours`; evaluate in Member's timezone (default UTC if unknown — document in code).
- Booking window: `now + minNoticeHours` to `now + bookingWindowDays`.
- Slot shown only if ≥1 eligible Member after all filters.
- Assignment does not create Google events — returns chosen Member only; SP-06 orchestrates persist + Google.
- Heavy unit test coverage with stubbed FreeBusy and in-memory meeting counts.
- Cache FreeBusy results within a single `getAvailableSlots` call (not cross-request — SP-06 handles HTTP cache).

## Done when
- [ ] `createSlotEnginePort()` satisfies `SlotEnginePort`
- [ ] Tests cover: busy exclusion, cap exclusion, hours exclusion, load-balance tie-break, empty slot list
- [ ] `pnpm test:sp-03` passes using stub Google port
- [ ] Public helpers documented in `contracts.md` if exported (optional patch note in PR)
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-03 Slot engine** per `docs/plans/gush-cal-v1/contracts.md` `SlotEnginePort`. Own `lib/slots/` only. Implement `getAvailableSlots` and `assignMember` with working-hours, cap, FreeBusy, booking-window filtering and load-balanced assignment. Depend on `GoogleCalendarPort` via injection — use SP-01 stub in tests. Do not create routes, UI, Google client, or Meeting persistence. Done when `pnpm test:sp-03` passes.
