# SP-DS-06: Availability grid

## Type
Parallel

## Blocked by
- SP-DS-01 (`PageContainer`, semantic tokens)

## Goal
Make the availability view viewport-contained with internal scroll, compact toolbar, and grid legend — fixing the 780px horizontal page scroll problem.

## Owns
- `components/availability-grid/availability-grid.tsx`
- `components/availability-grid/member-column.tsx`
- `components/availability-grid/bookable-overlay.tsx`
- `components/availability-grid/grid-legend.tsx` (new)
- `app/(admin)/calendars/[id]/availability/page.tsx`
- `components/availability-grid/*.test.ts` (existing tests — update selectors if class names change)

## Provides
- `PageContainer variant="grid"` on availability page
- Toolbar: `← date →` | Day/Week toggle | Duration selector (single compact row)
- Grid fills container height; columns scroll internally
- `GridLegend`: busy / free / bookable / inaccessible key
- Stronger inaccessible member badge

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | `PageContainer variant="grid"` | `div` with fixed height calc |
| SP-DS-01 | Semantic tokens | Migrate terracotta in Owns files |
| SP-DS-05 | `Breadcrumbs` optional in page | PageHeader back link only |

## Out of scope
- "Book this slot" deep-link to admin book (v1.1)
- Slot engine / API changes
- Booking wizard
- Calendar detail page

## Implementation notes
- Remove duplicate title: inline calendar name in grid toolbar instead of full PageHeader + grid title.
- Member column height = parent flex container, not fixed 780px viewport assumptions.
- Sticky time labels within scroll container if already partially implemented — verify with internal scroll.
- Migrate all terracotta references in **Owns** files.
- Preserve existing fetch logic and bookable overlay behavior.

## Done when
- [ ] No full-page horizontal scroll on laptop for typical member counts
- [ ] Legend visible; toolbar compact
- [ ] `npm run test:ui-07` passes
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
You are implementing **SP-DS-06 Availability grid** for the design system overhaul. Read [contracts.md](./contracts.md). You own `components/availability-grid/` and the availability page. Use PageContainer grid variant for viewport-height internal scroll. Add compact toolbar and GridLegend. Strengthen inaccessible badges. Migrate terracotta to semantic tokens. Do not change APIs or booking flow. Done when `npm run test:ui-07` and `npm run build` pass.
