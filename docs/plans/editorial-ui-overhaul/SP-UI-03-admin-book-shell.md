# SP-UI-03: Admin book page shell

## Type
Parallel

## Blocked by
- SP-UI-01 (PageHeader, Card)
- SP-UI-02 (updated BookingFlow)

## Goal
Restyle the Scheduler internal booking page (`/calendars/[id]/book`) with editorial warm chrome wrapping the new wizard — without modifying booking logic.

## Owns
- `app/(admin)/calendars/[id]/book/page.tsx`

## Provides
- Editorial admin book page: PageHeader, Card wrapper, links to calendar and meetings list
- Passes `showPanelistCount={true}` (or omit; default admin) to `BookingFlow`
- Passes `minNoticeHours` from calendar bundle if SP-UI-02 supports it

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | `PageHeader`, `Card` | plain divs |
| SP-UI-02 | `BookingFlow` | old BookingFlow until merged |
| SP-04 (prior) | `loadCalendarBundle` | existing import |

## Out of scope
- `BookingFlow` internals (SP-UI-02)
- Public book pages (SP-UI-04)
- Admin layout (SP-UI-05)

## Implementation notes
- Use terracotta primary accents sparingly; cream Card background.
- Back link: "← Back to {calendar name}".
- Footer link to meetings list styled as ghost/text link.
- Page max-width ~`max-w-2xl` or `max-w-3xl` for calendar readability.

## Done when
- [ ] Page renders with editorial styling and new BookingFlow
- [ ] No edits outside **Owns**
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-03 Admin book page shell**. Only edit `app/(admin)/calendars/[id]/book/page.tsx`. Wrap `BookingFlow` with `PageHeader` and `Card` from `@/components/ui`. Pass calendar bundle fields (durations, bookingWindowDays, minNoticeHours, API paths). Scheduler booking — panelist counts visible. Do not edit BookingFlow source. Done when page builds.
