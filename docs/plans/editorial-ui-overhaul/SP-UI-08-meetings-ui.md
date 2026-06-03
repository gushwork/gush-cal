# SP-UI-08: Meetings UI

## Type
Parallel

## Blocked by
- SP-UI-01 (UI primitives)

## Goal
Restyle the meetings list and cancel flow for Schedulers — table/cards, empty states, cancel button — with editorial warm styling.

## Owns
- `components/booking/meetings-list.tsx`
- `components/booking/meetings-table.tsx`
- `app/(admin)/calendars/[id]/meetings/page.tsx`

## Provides
- Editorial meetings list page with cancel actions
- Empty/upcoming/past sections if present

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | `Button`, `Card`, `PageHeader`, `Badge` | zinc styles |
| SP-06 (prior) | meetings API, cancel flow | unchanged |

## Out of scope
- `BookingFlow`, slot picker, invitee form (SP-UI-02)
- Book page (SP-UI-03)
- Backend routes

## Implementation notes
- Cancel: ghost/danger secondary button variant or terracotta-outline — document choice in PR.
- Meet links: terracotta underline.
- Table: soft borders, paper background rows.

## Done when
- [ ] Meetings page renders editorial style; cancel still works
- [ ] No edits outside **Owns**
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-08 Meetings UI**. Restyle `meetings-list.tsx`, `meetings-table.tsx`, and meetings page only using `@/components/ui`. Keep fetch/cancel logic. Do not edit BookingFlow. Done when build passes.
