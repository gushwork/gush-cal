# SP-UI-06: Calendar admin UI

## Type
Parallel

## Blocked by
- SP-UI-01 (UI primitives)

## Goal
Restyle Calendar and Member CRUD — list, create, edit, member forms — to use the editorial design system consistently.

## Owns
- `app/(admin)/calendars/page.tsx`
- `app/(admin)/calendars/new/page.tsx`
- `app/(admin)/calendars/[id]/page.tsx`
- `app/(admin)/calendars/[id]/members/new/page.tsx`
- `app/(admin)/calendars/[id]/members/[memberId]/page.tsx`
- `components/calendar-admin/calendar-form.tsx`
- `components/calendar-admin/member-form.tsx`
- `components/calendar-admin/copy-link-button.tsx`

## Provides
- Editorial-styled calendar list, detail, forms
- Copy public link button using UI Button
- Validation logic unchanged (`validation.ts` not owned — read-only)

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | `Button`, `Card`, `Input`, `Textarea`, `Label`, `PageHeader`, `Badge` | zinc inline classes |

## Out of scope
- `app/(admin)/calendars/[id]/book/` (SP-UI-03)
- `app/(admin)/calendars/[id]/availability/` (SP-UI-07)
- `app/(admin)/calendars/[id]/meetings/` (SP-UI-08)
- `components/calendar-admin/validation.ts`, `load-calendar-bundle.ts`, `require-scheduler.ts` (no visual changes required)
- API routes

## Implementation notes
- Calendar list: Card rows or editorial list with hover.
- Detail page: two-column layout on lg; public link prominent with CopyLinkButton.
- Forms: replace raw inputs with UI primitives.
- Keep all fetch/API logic identical.

## Done when
- [ ] All owned pages render with editorial styling
- [ ] CRUD flows still work
- [ ] No edits outside **Owns**
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-06 Calendar admin UI**. Restyle owned calendar pages and `calendar-form`, `member-form`, `copy-link-button` using `@/components/ui`. Do not edit book, availability, meetings routes or validation.ts. Done when build passes.
