# SP-DS-05: Calendar admin UI

## Type
Parallel

## Blocked by
- SP-DS-01 (`PageContainer`, `DurationChip`, `Dialog`, `EmptyState`, `Breadcrumbs`, tokens)

## Goal
Restructure calendar detail into tabbed Overview / Members / Settings, add hero action bar and stats, polish list/forms/members, and wire copy-link feedback + delete confirm dialog.

## Owns
- `app/(admin)/calendars/page.tsx`
- `app/(admin)/calendars/new/page.tsx`
- `app/(admin)/calendars/[id]/page.tsx`
- `app/(admin)/calendars/[id]/members/new/page.tsx`
- `app/(admin)/calendars/[id]/members/[memberId]/page.tsx`
- `components/calendar-admin/calendar-action-bar.tsx` (new)
- `components/calendar-admin/calendar-stats.tsx` (new)
- `components/calendar-admin/calendar-form.tsx`
- `components/calendar-admin/member-form.tsx`
- `components/calendar-admin/copy-link-button.tsx`
- `components/calendar-admin/delete-member-button.tsx`
- `components/calendar-admin/member-list.tsx` (if exists, else inline in page)
- `components/calendar-admin/*.test.tsx` (optional smoke)

## Provides
- Tabbed calendar detail: `?tab=overview|members|settings` (default overview)
- `CalendarActionBar`: Copy link, Book, Availability, Meetings
- `CalendarStats`: member count, upcoming meetings count
- Calendars list: enriched rows, chevron affordance, `EmptyState` with CTA
- Forms: `DurationChipGroup` multi-select, min notice field, helper text
- Member rows: avatar initial, cap badges, delete on hover
- Copy link: inline "Copied!" feedback 2s
- Delete member: `Dialog` confirm (not `window.confirm`)

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | `PageContainer`, `DurationChipGroup`, `Dialog`, `EmptyState`, `Button`, `Breadcrumbs` | Button + native confirm stub |
| SP-DS-01 | Semantic tokens | Migrate terracotta in Owns files |

## Out of scope
- `app/(admin)/calendars/[id]/book/` (SP-DS-03)
- `app/(admin)/calendars/[id]/availability/` (SP-DS-06)
- `app/(admin)/calendars/[id]/meetings/` (SP-DS-07)
- `app/(admin)/layout.tsx` (SP-DS-04)
- Backend API changes
- Working-hours full editor — v1: preset select (Mon–Fri 9–5) if quick; else document TODO in PR

## Implementation notes
- Replace inline `<a className="bg-terracotta...">` with `<Button>` on calendars list.
- List rows: `interactive` class, pointer cursor, meta badges `{n} members`.
- Calendar detail default tab shows stats + action bar; settings form only on settings tab.
- Member form pages: sticky footer Cancel + Save; `PageContainer variant="narrow"`.
- Fetch upcoming meeting count via existing meetings API or server component data — reuse patterns from meetings page.
- All **Owns** files: terracotta → primary/destructive.

## Done when
- [ ] Calendar detail tabs + action bar functional
- [ ] Copy link shows feedback; delete uses Dialog
- [ ] Calendars list empty state with CTA
- [ ] Forms use DurationChipGroup
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
You are implementing **SP-DS-05 Calendar admin UI** for the design system overhaul. Read [contracts.md](./contracts.md). You own all calendar CRUD pages except book, availability, and meetings routes, plus all `components/calendar-admin/`. Add tabbed calendar detail, CalendarActionBar, CalendarStats, list polish, DurationChip on forms, Dialog delete confirm, and copy-link feedback. Use PageContainer variants. Migrate terracotta to semantic tokens. Do not touch booking, availability grid, or admin layout. Done when `npm run build` passes.
