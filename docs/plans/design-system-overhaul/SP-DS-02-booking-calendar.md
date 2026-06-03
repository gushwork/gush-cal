# SP-DS-02: Booking calendar + slot chips

## Type
Parallel

## Blocked by
- SP-DS-01 (semantic tokens, `cn()` with tailwind-merge, `DurationChip` optional for tests)

## Goal
Replace the custom `DatePickerMonth` grid with shadcn **Calendar** + slot-count day overlay, and redesign **SlotPicker** as compact time chips — without touching `booking-flow.tsx` integration (SP-DS-03 wires it in).

## Owns
- `components/ui/calendar.tsx`
- `components/booking/booking-calendar.tsx`
- `components/booking/calendar-day-overlay.tsx`
- `components/booking/slot-picker.tsx`
- `components/booking/slot-picker.test.tsx` (create if missing)
- `components/booking/booking-calendar.test.tsx`
- `components/booking/date-picker-month.tsx` (**delete**)
- `components/booking/date-picker-month.test.ts` (**delete** or migrate to booking-calendar tests)
- `package.json` — only if SP-DS-01 did not add `react-day-picker` (otherwise no edit)

## Provides
- `Calendar` — shadcn DayPicker wrapper styled with `primary` tokens
- `BookingCalendar` — props per `contracts.md`; slot count badges; disabled/no-slot/out-of-window states; `cursor-pointer` on clickable days
- Redesigned `SlotPicker` — time chip grid, `aria-pressed`, primary/primary-soft selection

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | Semantic tokens (`primary`, `primary-soft`, `border`, `surface`) | Hardcode `#0066FF` in test-only snapshots; use stub tokens in component classes matching contracts |
| SP-DS-01 | `cn()` from `lib/ui/cn.ts` | Local merge |
| SP-DS-01 | `Button` ghost variant for month nav | Existing Button |

## Out of scope
- `booking-flow.tsx` (SP-DS-03)
- Wizard layout, stepper, success panel
- `DurationChip` (SP-DS-01) — booking duration step unchanged here
- Backend / slot API changes

## Implementation notes
- Day overlay states: available (soft ring + count badge), selected (primary fill), no slots (muted, not-allowed), out of window (DayPicker `disabled` matcher).
- Month navigation via DayPicker chevrons with aria-labels.
- Keep pure slot grouping in `group-slots-by-date.ts` — do not move or rewrite.
- Tests: render `BookingCalendar` with mock `slotCountsByDate`; assert disabled/selected classes; slot picker selection toggles.
- Export `BookingCalendar` from a stable path for SP-DS-03 import.

## Done when
- [ ] `date-picker-month.tsx` removed; `BookingCalendar` matches `contracts.md` props
- [ ] `SlotPicker` uses chip layout with semantic tokens only
- [ ] `npm run test:ds-02` passes (add script if missing)
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**
- [ ] SP-DS-03 can import `BookingCalendar` and drop-in replace `DatePickerMonth`

## Agent spawn brief
You are implementing **SP-DS-02 Booking calendar** for the design system overhaul. Read [contracts.md](./contracts.md). You own shadcn `Calendar`, `BookingCalendar`, `CalendarDayOverlay`, and redesigned `SlotPicker`. **Delete** `date-picker-month.tsx`. Use `react-day-picker` v9 and semantic `primary` tokens from SP-DS-01 — no terracotta. Do **not** edit `booking-flow.tsx`. Write tests for calendar day states and slot chip selection. Done when `npm run test:ds-02` and `npm run build` pass.
