# SP-UI-01: Design system + middleware

## Type
Foundation

## Blocked by
None

## Goal
Establish the editorial warm design foundation — CSS tokens, typography, shared UI primitives, and the public `/api/book` middleware fix — so all parallel UI sub-plans import consistent components without overlapping file edits.

## Owns
- `app/globals.css`
- `app/layout.tsx` (fonts + body classes only)
- `lib/ui/cn.ts`
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/label.tsx`
- `components/ui/badge.tsx`
- `components/ui/stepper.tsx`
- `components/ui/page-header.tsx`
- `components/ui/index.ts`
- `components/ui/ui.test.tsx` (smoke render tests)
- `middleware.ts` (add `/api/book` to public paths)
- `docs/plans/editorial-ui-overhaul/contracts.md` (authoritative v1.0.0)
- `package.json` — add `test:ui-01` script only

## Provides
- CSS tokens per `contracts.md` (`--paper`, `--terracotta`, etc.) wired into `@theme`
- Fraunces + Source Sans 3 via `next/font/google`
- Paper grain overlay on `body`
- `Button`, `Card`, `Input`, `Textarea`, `Label`, `Badge`, `Stepper`, `PageHeader`
- `cn()` helper
- `.animate-step-in` utility class
- Public middleware path for `/api/book/*`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| — | — | — |

## Out of scope
- Booking wizard logic (SP-UI-02)
- Any `app/(admin)/`, `app/book/`, feature page restyles
- `components/booking/`, `components/calendar-admin/`, `components/availability-grid/`
- Dark mode theme
- New npm dependencies (prefer zero-dep `cn`)

## Implementation notes
- Remove conflicting `prefers-color-scheme` dark flip and Arial override in `globals.css`.
- Primary button uses terracotta; focus rings accessible (`ring-terracotta/40`).
- `Stepper` accepts `BookingStepId` steps from contracts — horizontal layout, completed/active/disabled states.
- Middleware one-line addition: `pathname.startsWith("/api/book")`.
- Do not change Geist removal entirely if other pages break — replace with Source Sans 3 as body font.

## Done when
- [ ] All tokens in `contracts.md` exist in `globals.css`
- [ ] UI primitives match prop types in `contracts.md`
- [ ] `npm run test:ui-01` passes
- [ ] Unauthenticated fetch to `/api/book/test/slots` returns JSON (not 302 login)
- [ ] No edits outside **Owns**

## Agent spawn brief
Implement **SP-UI-01 Design system + middleware** for the editorial UI overhaul. Read `docs/plans/editorial-ui-overhaul/contracts.md` fully. Own `app/globals.css`, `app/layout.tsx` (fonts), `lib/ui/cn.ts`, all of `components/ui/`, and add `/api/book` to public paths in `middleware.ts`. Build editorial warm tokens (cream paper, terracotta accent), Fraunces + Source Sans 3, and primitives: Button, Card, Input, Textarea, Label, Badge, Stepper, PageHeader. Add `npm run test:ui-01`. Do not touch booking, admin pages, or calendar components. Done when tests pass and `/api/book` is public.
