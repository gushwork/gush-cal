# SP-02: Working hours editor

## Type
Parallel

## Blocked by
- SP-01 (types, `lib/working-hours/format`, `validate`)

## Goal
Reusable 7-day working hours UI with multiple blocks per day, locale time inputs, presets, and copy shortcuts — used by Calendar and Member forms.

## Owns
- `components/calendar-admin/working-hours-editor.tsx`
- `components/calendar-admin/timezone-select.tsx`
- `components/calendar-admin/working-hours-editor.test.ts`
- `lib/working-hours/editor-utils.ts` (group-by-day, preset builders, copy-day helpers)
- `lib/working-hours/editor-utils.test.ts`

## Provides
- `WorkingHoursEditor` component per contracts.md
- `TimezoneSelect` component per contracts.md
- Presets: "Business hours" (Mon–Fri 9–5), "Clear all"
- Actions: "Apply Mon → weekdays", per-day copy menu

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `WorkingHours`, `validateWorkingHours` | types from `lib/types` |
| SP-01 | format helpers | `lib/working-hours/format` |

## Out of scope
- Form submit / API (SP-03, SP-04, SP-05)
- Slot engine (SP-06)
- `calendar-form.tsx`, `member-form.tsx`

## Implementation notes
- 7 rows Sun(0)–Sat(6); day enabled if ≥1 block.
- `[+]` adds block; `[×]` removes; validate on change via SP-01 `validateWorkingHours`.
- Time inputs use browser locale (`Intl`); store as minutes 0–1439.
- Reject overlaps on same day inline (show error text).
- Match existing admin UI tokens (`components/ui`, Tailwind patterns from `calendar-form.tsx`).
- Remove or stop exporting stub from SP-01 once this merges (delete stub file in PR if SP-01 added it).

## Done when
- [ ] Editor emits correct `WorkingHours[]` for presets and copy actions
- [ ] `npm run test:wh-02` passes
- [ ] No edits outside **Owns**
- [ ] Documented in `contracts.md` if props differ

## Agent spawn brief
Implement **SP-02 Working hours editor** per `docs/plans/working-hours-config/contracts.md`. Build `WorkingHoursEditor` (7 days, multi-block, presets, copy) and `TimezoneSelect`. Use `lib/working-hours` for format/validate. Tests for preset + copy + overlap rejection. Do not wire forms or APIs. Done when `npm run test:wh-02` passes.
