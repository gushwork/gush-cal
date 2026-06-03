# SP-UI-07: Availability grid

## Type
Parallel

## Blocked by
- SP-UI-01 (tokens, Badge, Button)

## Goal
Apply editorial warm styling to the day/week availability view — member columns, busy blocks, bookable overlay — matching the rest of the app.

## Owns
- `components/availability-grid/availability-grid.tsx`
- `components/availability-grid/member-column.tsx`
- `components/availability-grid/bookable-overlay.tsx`
- `app/(admin)/calendars/[id]/availability/page.tsx`
- `package.json` — add `test:ui-07` script if missing (point at availability tests)

## Provides
- Restyled availability grid and admin page shell
- Existing tests still pass

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | tokens, `Button`, `Badge`, `PageHeader`, `Card` | zinc styles |
| SP-05 (prior) | availability API, fetch-bookable-slots | unchanged logic |

## Out of scope
- `build-member-busy-blocks.ts`, `time-utils.ts`, API route (logic unchanged unless test breaks)
- Booking wizard (SP-UI-02)
- Do not edit `*.test.ts` unless snapshot/class assertions break due to class name changes — then update owned tests only

## Implementation notes
- Busy blocks: terracotta-soft fill with ink border.
- Inaccessible column: muted pattern + label per CONTEXT.md.
- Bookable overlay: terracotta accent outline.
- Page uses PageHeader with back link to calendar detail.

## Done when
- [ ] Availability page matches editorial aesthetic
- [ ] `npm run test:ui-07` (or existing availability tests) pass
- [ ] No edits outside **Owns** (except test fixes for class strings in owned components)
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-07 Availability grid**. Restyle owned availability components and page using editorial tokens and `@/components/ui`. Keep data fetching logic intact. Update component tests if class names change. Do not edit booking or calendar CRUD. Done when tests and build pass.
