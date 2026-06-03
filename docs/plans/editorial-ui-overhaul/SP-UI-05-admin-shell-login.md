# SP-UI-05: Admin shell + login

## Type
Parallel

## Blocked by
- SP-UI-01 (UI primitives, tokens)

## Goal
Restyle the authenticated app shell and login page with editorial warm branding — cream header, terracotta active states, Fraunces headings — so admin surfaces feel cohesive before feature pages are updated.

## Owns
- `app/(admin)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/page.tsx`

## Provides
- Editorial admin header/nav (Calendars link, user email, sign out)
- Restyled Google sign-in login card
- Home redirect to `/calendars` unchanged

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-UI-01 | `Button`, tokens, fonts | existing zinc styles until merged |

## Out of scope
- Calendar CRUD pages (SP-UI-06)
- Booking pages (SP-UI-03, SP-UI-04)
- Availability, meetings pages
- `components/calendar-admin/`

## Implementation notes
- Admin header: white/cream surface, border-border, max-w-5xl.
- Active nav item: terracotta underline or text.
- Login: centered Card, Fraunces title, terracotta primary CTA.
- Keep existing auth server actions unchanged.

## Done when
- [ ] Admin layout and login match editorial tokens
- [ ] Sign in / sign out still work
- [ ] No edits outside **Owns**
- [ ] `npm run build` passes

## Agent spawn brief
Implement **SP-UI-05 Admin shell + login**. Edit only `app/(admin)/layout.tsx`, `app/(auth)/login/page.tsx`, and `app/page.tsx`. Apply editorial warm design using `@/components/ui` and CSS tokens. Do not touch calendar or booking feature files. Done when build passes.
