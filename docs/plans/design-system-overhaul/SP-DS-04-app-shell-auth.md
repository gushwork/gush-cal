# SP-DS-04: App shell, login, system pages

## Type
Parallel

## Blocked by
- SP-DS-01 (`AppShell`, `PageContainer`, `EmptyState`, brand config)

## Goal
Wire branded shells into admin and public routes, redesign login as a branded panel, and add designed 404 pages — without touching booking wizard logic or calendar CRUD.

## Owns
- `app/(admin)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/not-found.tsx`
- `app/book/layout.tsx`
- `app/book/not-found.tsx`

## Provides
- Admin layout with `AppShell variant="admin"`: logo, pathname-based active nav, user email + sign out
- Public book layout with `AppShell variant="public"`: logo only (no duplicate app name)
- Login: branded split panel (logo + tagline desktop, form right); Google G SVG on OAuth button; `PageContainer variant="narrow"`
- Global 404 and book-specific invalid-slug 404 using brand tokens + `EmptyState`

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| SP-DS-01 | `AppShell`, `PageContainer`, `EmptyState`, `getBrandConfig()` | Passthrough `{children}` layout; hardcoded Gushwork name |
| SP-DS-01 | `Button`, destructive-soft for auth errors | Existing Button |

## Out of scope
- `app/book/[slug]/page.tsx` (SP-DS-03)
- Calendar admin pages
- Booking flow components
- Middleware / auth config changes

## Implementation notes
- Admin nav: `usePathname()` — active only on exact `/calendars` or prefix match as appropriate; fix "always active Calendars" bug.
- Login error state: `bg-destructive-soft` + `text-destructive`, not primary-soft.
- Public layout: remove hardcoded "Panel Scheduling" text.
- 404 pages: helpful copy + link home; book 404: "This booking link is invalid or expired."
- Migrate terracotta → semantic tokens in **Owns** files only.
- Optional breadcrumb slot on admin layout for SP-DS-05 to pass via parallel route — **not required v1**; SP-DS-05 uses `Breadcrumbs` in page content.

## Done when
- [ ] Admin + public layouts use `AppShell`
- [ ] Login shows logo, Google icon, branded panel
- [ ] Both 404 pages render with brand styling
- [ ] `npm run build` passes
- [ ] No edits outside **Owns**

## Agent spawn brief
You are implementing **SP-DS-04 App shell and auth** for the design system overhaul. Read [contracts.md](./contracts.md). You own admin layout, login page, global not-found, public book layout, and book not-found. Integrate `AppShell` and fix pathname-based nav active states. Redesign login with logo and Google OAuth button icon. Remove hardcoded "Panel Scheduling" from public header. Add branded 404 pages. Do not touch booking-flow or calendar pages. Done when `npm run build` passes.
