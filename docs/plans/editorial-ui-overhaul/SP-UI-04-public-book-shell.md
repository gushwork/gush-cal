# SP-UI-04: Public book shell

## Type
Parallel

## Blocked by
- SP-UI-01 (PageHeader, tokens)
- SP-UI-02 (updated BookingFlow)

## Goal
Deliver a warm, candidate-friendly public booking experience at `/book/[slug]` with dedicated layout chrome — distinct from admin but cohesive with editorial warm aesthetic.

## Owns
- `app/book/layout.tsx` (new)
- `app/book/[slug]/page.tsx`

## Provides
- Public layout: cream paper background, subtle branding strip, no admin nav
- Restyled public book page with calendar name and welcoming subtitle
- `BookingFlow` with `isPublic` and `showPanelistCount={false}`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | tokens, `PageHeader`, `Card` | plain markup |
| SP-UI-02 | `BookingFlow` | stub until merged |
| SP-06 (prior) | `loadCalendarBundleBySlug`, `toPublicCalendar` | existing |

## Out of scope
- Admin book page (SP-UI-03)
- BookingFlow internals (SP-UI-02)
- Middleware (SP-UI-01)

## Implementation notes
- Layout applies `bg-paper min-h-full` and optional centered logo/wordmark ("Panel Scheduling" or calendar name only).
- Mobile-friendly padding; no admin header.
- Timezone selector lives inside BookingFlow (SP-UI-02), not duplicated in layout.
- Trust line optional: "You'll receive a calendar invite with Google Meet."

## Done when
- [ ] `/book/[slug]` renders with new layout + BookingFlow
- [ ] No panelist count visible on public slots
- [ ] No edits outside **Owns**
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-04 Public book shell**. Create `app/book/layout.tsx` and restyle `app/book/[slug]/page.tsx` only. Editorial warm public chrome using `@/components/ui`. Render `BookingFlow` with `isPublic` and hidden panelist counts. Do not edit BookingFlow or admin files. Done when build passes.
