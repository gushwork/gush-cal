# SP-DS-07: Meetings UI

## Type
Parallel

## Blocked by
- SP-DS-01 (`PageContainer`, `EmptyState`, `Skeleton`, `Button`, tokens)

## Goal
Responsive meetings list with mobile card layout, loading skeletons, and token-consistent styling.

## Owns
- `components/booking/meeting-card.tsx` (new)
- `components/booking/meetings-list.tsx`
- `components/booking/meetings-table.tsx`
- `app/(admin)/calendars/[id]/meetings/page.tsx`
- `components/booking/meetings-list.test.tsx` (optional)

## Provides
- `MeetingCard` — mobile-friendly meeting row (subject, time, panelist, cancel)
- Desktop: existing table; below `md`: card stack
- Loading: `Skeleton` rows while fetching
- Empty / error states via `EmptyState` + error banner
- Meetings page: `<Button>` for actions; `PageContainer variant="default"`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | `PageContainer`, `EmptyState`, `Skeleton`, `Button` | Plain divs + Button |
| SP-DS-01 | Semantic tokens | Migrate terracotta in Owns files |

## Out of scope
- `booking-flow.tsx`, `booking-success.tsx` (SP-DS-03)
- Meetings API / cancel logic changes
- Calendar admin pages

## Implementation notes
- Preserve cancel meeting behavior and optimistic UI if present.
- Table: hide on `md` down; cards show same actions.
- Skeleton: 3–5 placeholder rows matching card/table layout.
- Migrate inline primary button classes to `<Button variant="primary">`.
- Terracotta → semantic tokens in **Owns** files.

## Done when
- [ ] Mobile card layout works below md breakpoint
- [ ] Loading skeleton shown during fetch
- [ ] Empty state uses EmptyState component
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
You are implementing **SP-DS-07 Meetings UI** for the design system overhaul. Read [contracts.md](./contracts.md). You own meetings-list, meetings-table, new meeting-card, and meetings page. Add responsive card layout for mobile, Skeleton loading, EmptyState for empty meetings, and Button for CTAs. Migrate terracotta to semantic tokens. Do not change cancel API logic or booking wizard. Done when `npm run build` passes.
