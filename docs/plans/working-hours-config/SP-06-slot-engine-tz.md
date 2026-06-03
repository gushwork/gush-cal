# SP-06: Slot engine timezone

## Type
Parallel

## Blocked by
- SP-01 (`effectiveTimezone`, updated types)

## Goal
Slot generation and assignment evaluate member working hours in each Member's effective timezone (calendar TZ or member TZ when overriding), not the guest's viewer timezone.

## Owns
- `lib/slots/eligibility.ts`
- `lib/slots/working-hours.ts` — update `isWithinWorkingHours` call sites only if needed
- `lib/slots/generate-slots.ts` (if passes viewerTimezone to eligibility)
- `lib/slots/assign-member.ts`
- `lib/slots/slots.test.ts`
- `lib/slots/availability-slots.test.ts`
- `lib/booking/booking.test.ts` (fixture `timezone` fields only)
- `CONTEXT.md` — short note on effective timezone semantics

## Provides
- Correct eligibility when guest TZ ≠ member TZ
- Regression tests for Tokyo member / US guest scenario

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-01 | `effectiveTimezone` | local copy until merged |

## Out of scope
- UI forms (SP-04, SP-05)
- API routes (SP-03)
- Editor (SP-02)

## Implementation notes
- In `getEligibleMembers` / `isMemberEligible`, replace `viewerTimezone` with `effectiveTimezone(member, bundle)` for `isWithinWorkingHours` only.
- Keep `viewerTimezone` in `GetSlotsRequest` for range display boundaries in `generate-slots.ts` if used for window labels — document in comment.
- Update all test bundles with `timezone: "UTC"` on calendar; add case: calendar `America/New_York`, guest `Asia/Tokyo`, slot at edge.

## Done when
- [ ] New TZ regression test passes
- [ ] `npm run test:wh-06` passes
- [ ] `npm test` full suite passes
- [ ] CONTEXT.md updated
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-06 Slot engine timezone**. Use `effectiveTimezone` from `lib/working-hours` in eligibility checks instead of guest `viewerTimezone`. Update slot and booking tests with timezone fixtures. Add regression test for mismatched TZ. Update CONTEXT.md. Do not touch forms or API routes. Done when `npm run test:wh-06` passes.
