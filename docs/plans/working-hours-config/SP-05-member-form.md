# SP-05: Member form

## Type
Parallel

## Blocked by
- SP-01 (types, validation rules)
- SP-02 (`WorkingHoursEditor`, `TimezoneSelect`)

## Goal
Member add/edit forms support "Use calendar default hours" toggle, custom hours editor, and member timezone when overriding.

## Owns
- `components/calendar-admin/member-form.tsx`
- `app/(admin)/calendars/[id]/members/new/page.tsx`
- `app/(admin)/calendars/[id]/members/[memberId]/page.tsx`

## Provides
- Toggle default hours (on when `workingHoursOverride` null/empty)
- Custom hours + member TZ when toggle off
- Pages pass `calendar.defaultWorkingHours`, `calendar.timezone` into form

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-02 | Editor + TZ select | SP-01 stub |
| SP-03 | Member API validation | — |
| SP-04 | — | load bundle on member pages (existing) |

## Out of scope
- `calendar-form.tsx`, `[id]/page.tsx` (SP-04)
- API routes (SP-03)
- Slot engine (SP-06)

## Implementation notes
- Toggle on → POST/PATCH without `workingHoursOverride` or `timezone` (null).
- Toggle off → require member TZ; seed editor from calendar defaults if no override yet.
- Show helper text: "Hours interpreted in member timezone."

## Done when
- [ ] Add/edit member saves override + TZ correctly
- [ ] Toggle clears override on save when enabled
- [ ] `npm run test:wh-05` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-05 Member form**. Add use-default-hours toggle, `WorkingHoursEditor`, and `TimezoneSelect` to `member-form.tsx`. Update member new/edit pages to pass calendar defaults. Do not touch calendar form or API files. Done when member override flow works end-to-end against API.
