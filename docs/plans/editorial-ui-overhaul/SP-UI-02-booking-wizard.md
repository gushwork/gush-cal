# SP-UI-02: Booking wizard core

## Type
Parallel

## Blocked by
- SP-UI-01 (UI primitives, tokens, Stepper, Badge, Button)

## Goal
Replace the flat slot grid with a 4-step wizard: Duration → Date (month calendar with slot-count badges) → Time → Details, with prominent timezone selector and month-slot caching — shared by admin and public flows.

## Owns
- `components/booking/types.ts`
- `components/booking/group-slots-by-date.ts`
- `components/booking/group-slots-by-date.test.ts`
- `components/booking/booking-stepper.tsx`
- `components/booking/timezone-selector.tsx`
- `components/booking/date-picker-month.tsx`
- `components/booking/date-picker-month.test.tsx`
- `components/booking/slot-picker.tsx`
- `components/booking/booking-flow.tsx`
- `components/booking/invitee-form.tsx`
- `package.json` — add `test:ui-02` script only

## Provides
- `BookingFlow` with steps `duration | date | time | details | done`
- `groupSlotsByDate()`, `countSlotsByDate()`
- `DatePickerMonth`, `TimezoneSelector`, `BookingStepper` (wraps UI Stepper)
- Refactored `SlotPicker` with `showPanelistCount` prop
- Unit tests for date grouping and step logic

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | `Button`, `Card`, `Badge`, `Stepper`, `Input`, `Textarea`, `Label` | inline HTML stubs in tests |
| SP-01 (prior) | `Slot`, `ConfirmBookingBody`, slot API query params | existing types in `lib/types` |

## Out of scope
- `app/(admin)/calendars/[id]/book/page.tsx` (SP-UI-03)
- `app/book/` pages and layout (SP-UI-04)
- `meetings-list.tsx`, `meetings-table.tsx` (SP-UI-08)
- Backend API changes
- Availability grid

## Implementation notes
- Always show duration step (even single duration).
- `viewerTimezone` editable; changing TZ clears cache and refetches month slots.
- Date step: fetch `from`/`to` = visible month ∩ booking window; group slots; show count badge via `Badge variant="count"`.
- Time step: filter cached slots to `selectedDate` (YYYY-MM-DD in viewer TZ).
- `showPanelistCount` defaults to `!isPublic`.
- Success card: use `--success-soft` / `--success-ink` tokens.
- CSS-only step transitions via `.animate-step-in`.
- Keep existing confirm POST logic; handle 409 as today.
- Add `minNoticeHours` prop if needed for window start (read from calendar bundle via pages).

## Done when
- [ ] Wizard navigates duration → date → time → details → done
- [ ] Month calendar shows slot counts; empty days disabled
- [ ] Timezone change refetches and regroups
- [ ] `npm run test:ui-02` passes
- [ ] `npm test` still green (update existing booking tests if any)
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-UI-02 Booking wizard core**. Read `docs/plans/editorial-ui-overhaul/contracts.md`. Own booking components listed in SP-UI-02 **Owns** only. Refactor `BookingFlow` to duration→date→time→details with month calendar (slot count badges), timezone selector, and slot grouping helpers. Import UI from `@/components/ui`. Admin shows panelist count on slots; public does not. Tests for `group-slots-by-date` and date picker. Do not edit app routes or meetings components. Done when `npm run test:ui-02` passes.
