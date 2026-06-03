# SP-DS-01: Brand foundation + layout primitives

## Type
Foundation

## Blocked by
None

## Goal
Pin the white-label brand system (Gushwork defaults), semantic CSS tokens (breaking removal of `terracotta*`), shared layout primitives, and extended UI components so parallel agents import stable contracts without touching `globals.css` or `components/ui/` base files.

## Owns
- `lib/brand/config.ts`
- `lib/brand/gushwork-preset.ts`
- `lib/brand/config.test.ts`
- `components/brand/app-shell.tsx`
- `components/brand/brand-styles.tsx`
- `components/layout/page-container.tsx`
- `components/layout/breadcrumbs.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `lib/ui/cn.ts` (add `clsx` + `tailwind-merge`)
- `components/ui/button.tsx`
- `components/ui/stepper.tsx`
- `components/ui/page-header.tsx`
- `components/ui/dialog.tsx`
- `components/ui/empty-state.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/duration-chip.tsx`
- `components/ui/index.ts`
- `components/ui/ui.test.tsx`
- `.env.example` (brand vars section)
- `public/brand/gushwork-logo.svg` (local fallback)
- `README.md` (brand env documentation section only)
- `package.json` — add deps: `react-day-picker`, `@radix-ui/react-dialog`, `clsx`, `tailwind-merge`; scripts: `test:ds-01`, `test:ds-02`, `test:ds-03`
- `docs/plans/design-system-overhaul/contracts.md` (authoritative v1.0.0)

## Provides
- `getBrandConfig(): BrandConfig`
- `BrandStyles` — injects `--primary`, `--accent` from env
- Semantic tokens per `contracts.md` (**no** `terracotta` Tailwind aliases)
- `PageContainer`, `AppShell`, `Breadcrumbs`
- Extended `Button` (size, destructive, cursor-pointer)
- Extended `Stepper` (`onStepClick` for completed steps)
- `Dialog`, `EmptyState`, `Skeleton`, `DurationChip` / `DurationChipGroup`
- Typography utilities: `.text-display`, `.text-title`, `.text-body`
- Motion: expo easing, `.interactive`, `::selection`, reduced-motion guard
- Dynamic metadata title + favicon from brand config

## Consumes
| From | Contract | Until merged, use |
|------|----------|-------------------|
| — | — | — |

## Out of scope
- Booking calendar / wizard (SP-DS-02, SP-DS-03)
- Feature page restyles (`app/(admin)/calendars/*` except layout consumption)
- `components/booking/` except shared types untouched
- `components/calendar-admin/`, `components/availability-grid/`
- Custom cursor (not requested)
- Lenis / smooth scroll (app dashboard, not marketing site)

## Implementation notes
- **Breaking rename:** remove `--terracotta`, `--terracotta-soft` and all `terracotta` `@theme` entries; migrate references in **Owns files only**. Parallel agents migrate their own paths.
- Gushwork preset: Resolution Blue `#0066FF`, accent `#0047AB`, paper `#FAF7F2` (keep warm paper).
- `AppShell` variants: `admin` (logo, nav, user sign-out), `public` (logo only header), `auth-minimal` (centered logo for login).
- `PageHeader`: add `compact` prop (`mb-4`); support `text-title` scale for admin.
- `Dialog`: minimal Radix wrapper; destructive variant for delete confirms (consumer: SP-DS-05).
- Preload critical display font; `font-display: swap`.
- Update `components/ui/ui.test.tsx` for new Button variants and DurationChip render.

## Done when
- [ ] All tokens in `contracts.md` exist; no `terracotta` in `globals.css` or **Owns** UI files
- [ ] `getBrandConfig()` tested with env overrides
- [ ] `npm run test:ds-01` passes
- [ ] `npm run build` passes
- [ ] README documents all `BRAND_*` env vars
- [ ] Sibling agents can import from `@/components/ui` and `@/components/layout` without conflicts

## Agent spawn brief
You are implementing **SP-DS-01 Brand foundation** for the design system overhaul. Read [contracts.md](./contracts.md) first. You own `lib/brand/`, `components/brand/`, `components/layout/`, `app/globals.css`, `app/layout.tsx`, and extensions to `components/ui/` (Button, Stepper, Dialog, EmptyState, Skeleton, DurationChip, PageHeader). Perform a **breaking semantic token migration** — remove all `terracotta*` utilities; use `--primary`, `--destructive`, etc. Wire Gushwork defaults via env. Add `PageContainer` and `AppShell`. Install `clsx`, `tailwind-merge`, `@radix-ui/react-dialog`, `react-day-picker` (for SP-DS-02). Do not touch booking, calendar-admin, or availability files. Done when `npm run test:ds-01` and `npm run build` pass.
