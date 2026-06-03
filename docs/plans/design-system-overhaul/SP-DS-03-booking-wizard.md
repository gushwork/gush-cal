# SP-DS-03: Booking wizard + book pages

## Type
Parallel

## Blocked by
- SP-DS-01 (`PageContainer`, `Stepper`, `DurationChip`, tokens)
- SP-DS-02 (`BookingCalendar`, redesigned `SlotPicker`)

## Goal
Refactor the booking wizard into a compact two-column layout with sticky stepper, toolbar timezone pill, sticky footer navigation, **signature success panel**, and updated admin/public book pages — integrating `BookingCalendar` from SP-DS-02.

## Owns
- `components/booking/booking-flow.tsx`
- `components/booking/booking-stepper.tsx`
- `components/booking/booking-success.tsx` (new)
- `components/booking/timezone-selector.tsx`
- `components/booking/invitee-form.tsx`
- `components/booking/types.ts`
- `components/booking/booking-flow.test.tsx` (create or extend)
- `app/(admin)/calendars/[id]/book/page.tsx`
- `app/book/[slug]/page.tsx`

## Provides
- Two-column wizard layout (`md+`: stepper left, content right)
- Compact timezone pill in step toolbar
- Sticky footer: Back + Continue per step
- `BookingSuccessPanel` — Meet link, Google Calendar link, celebratory motion
- `DurationChipGroup` on duration step (replaces plain Buttons)
- Book pages using `PageContainer variant="booking"` — no outer Card wrapper

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | `PageContainer`, `DurationChipGroup`, `Stepper` + `onStepClick` | Inline layout divs; Button for duration |
| SP-DS-02 | `BookingCalendar`, `SlotPicker` | Keep `DatePickerMonth` until SP-DS-02 merges, then swap in one commit |
| SP-DS-04 | `app/book/layout.tsx` shell | Page renders without layout assumptions beyond `PageContainer` |

## Out of scope
- `app/book/layout.tsx` (SP-DS-04)
- Calendar / slot API logic
- `group-slots-by-date.ts` (SP-DS-02 tests only)
- Admin calendar pages

## Implementation notes
- **Signature moment:** success state is full-width panel, not nested Card; `bg-success-soft` or `bg-primary-soft` per contracts.
- Stepper: wire `onStepClick` to jump back to completed steps only.
- Timezone: collapsible on mobile; globe icon; match `Input` select styling.
- Invitee form: clearer public labels (guest email vs invitees); optional body char count.
- Public book page: single title surface; trust line under Confirm button.
- Migrate all `terracotta` references in **Owns** files to semantic tokens.
- Preserve existing booking logic (cache, 409 conflict handling, timezone bug fix).

## Done when
- [ ] `BookingCalendar` integrated; no import of deleted `DatePickerMonth`
- [ ] Success panel matches `BookingSuccessPanel` contract
- [ ] Admin + public book pages use `PageContainer variant="booking"`
- [ ] Above-fold: on 1280×800, date step calendar visible without page scroll (manual check note in PR)
- [ ] `npm run test:ds-03` passes
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
You are implementing **SP-DS-03 Booking wizard** for the design system overhaul. Read [contracts.md](./contracts.md). Block until SP-DS-02 merges. You own `booking-flow.tsx`, stepper/timezone/invitee components, new `booking-success.tsx`, and admin/public **book page.tsx** files. Build two-column compact wizard with sticky stepper + footer nav. Integrate `BookingCalendar` and chip `SlotPicker`. Create signature success panel with Meet link. Use `PageContainer variant="booking"`. Migrate terracotta → primary in your files. Do not edit book layout or calendar admin. Done when `npm run test:ds-03` and `npm run build` pass.
