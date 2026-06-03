# SP-04: Calendar form

## Type
Parallel

## Blocked by
- SP-01 (types, timezone on Calendar)
- SP-02 (`WorkingHoursEditor`, `TimezoneSelect`)

## Goal
Calendar create/edit forms let Schedulers set timezone and editable default working hours.

## Owns
- `components/calendar-admin/calendar-form.tsx`
- `app/(admin)/calendars/new/page.tsx`
- `app/(admin)/calendars/[id]/page.tsx` — **settings tab section only** (lines rendering `CalendarForm`)

## Provides
- Stateful `defaultWorkingHours` + `timezone` on save
- Create flow: browser TZ pre-fill
- Settings tab shows timezone label near hours

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-02 | `WorkingHoursEditor`, `TimezoneSelect` | SP-01 stub editor |
| SP-03 | API accepts new fields | may 400 until SP-03 merged |

## Out of scope
- Member form (SP-05)
- API route implementation (SP-03)
- Overview/members tabs on `[id]/page.tsx` (do not modify)

## Implementation notes
- Replace read-only `workingHours` constant with `useState(initial?.defaultWorkingHours ?? DEFAULT_WORKING_HOURS)`.
- Add `TimezoneSelect` above working hours section.
- Include both fields in POST/PATCH payload.
- Optional: show read-only summary on overview tab — out of scope unless trivial.

## Done when
- [ ] Create/edit calendar persists TZ + hours through API
- [ ] `npm run test:wh-04` passes (component test or smoke)
- [ ] Only settings-tab lines changed in `[id]/page.tsx`
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-04 Calendar form**. Wire `WorkingHoursEditor` and `TimezoneSelect` into `calendar-form.tsx`. Init timezone from browser on create. Update settings tab on calendar detail page. Do not touch member form or API route files. Use SP-01 stub editor until SP-02 merges. Done when form submits TZ + hours correctly.
