# Contracts: Design System Overhaul

## Version

`v1.0.0` — bump on breaking changes; dependents pin until updated.

Supersedes editorial token names in [../editorial-ui-overhaul/contracts.md](../editorial-ui-overhaul/contracts.md) for **new work only**. This plan performs a **breaking rename**: `terracotta*` Tailwind utilities are removed; use semantic tokens below.

## Brand config

Owner: **SP-DS-01**. Server-only.

```typescript
// lib/brand/config.ts
type BrandConfig = {
  appName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;   // hex, e.g. #0066FF
  accentColor: string;    // hex
  fontDisplay: string | null; // Google Font family name or null → Fraunces
};

function getBrandConfig(): BrandConfig;
```

### Environment variables

| Variable | Required | Default (Gushwork preset) |
|----------|----------|---------------------------|
| `BRAND_APP_NAME` | no | `Gushwork Scheduling` |
| `BRAND_LOGO_URL` | no | `https://www.gushwork.ai/logo.svg` |
| `BRAND_FAVICON_URL` | no | `/favicon.ico` |
| `BRAND_PRIMARY_COLOR` | no | `#0066FF` |
| `BRAND_ACCENT_COLOR` | no | `#0047AB` |
| `BRAND_FONT_DISPLAY` | no | `null` (Fraunces) |

`BrandStyles` server component injects runtime CSS:

```css
:root {
  --primary: <BRAND_PRIMARY_COLOR>;
  --accent: <BRAND_ACCENT_COLOR>;
  /* plus derived soft variants computed in gushwork-preset.ts */
}
```

## Design tokens (CSS variables)

Owner: **SP-DS-01** in `app/globals.css`. **No hardcoded hex** in feature components.

| Token | Role | Tailwind |
|-------|------|----------|
| `--paper` | Page background | `bg-paper` |
| `--ink` | Primary text | `text-ink` |
| `--ink-muted` | Secondary text | `text-ink-muted` |
| `--primary` | Brand primary | `bg-primary`, `text-primary` |
| `--primary-soft` | Primary tint | `bg-primary-soft` |
| `--accent` | Brand accent | `text-accent` |
| `--destructive` | Delete / error | `text-destructive`, `bg-destructive` |
| `--destructive-soft` | Error surface | `bg-destructive-soft` |
| `--border` | Borders | `border-border` |
| `--surface` | Cards, panels | `bg-surface` |
| `--success-soft` | Success panel bg | `bg-success-soft` |
| `--success-ink` | Success text | `text-success-ink` |

### Spacing (compact layout)

| Token | Default |
|-------|---------|
| `--page-py` | `1.5rem` |
| `--page-px` | `1.25rem` |
| `--section-gap` | `1rem` |

### Motion

- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) — **no** `ease`, `ease-out`, `linear`
- `.animate-step-in` — step transitions; disabled under `prefers-reduced-motion: reduce`
- `.interactive` — `cursor-pointer` + transition-colors

### Selection

```css
::selection { background: var(--primary-soft); color: var(--ink); }
```

### Typography

- Display: Fraunces or `BRAND_FONT_DISPLAY` via `next/font/google`
- Body: Source Sans 3
- Utilities (SP-DS-01): `.text-display`, `.text-title`, `.text-body`

## Layout primitives

Owner: **SP-DS-01**.

### `PageContainer`

```typescript
type PageContainerVariant = "default" | "narrow" | "booking" | "grid";

type PageContainerProps = {
  variant?: PageContainerVariant;
  children: React.ReactNode;
  className?: string;
};
```

| Variant | Purpose |
|---------|---------|
| `default` | Calendars list, detail, meetings |
| `narrow` | Login, forms |
| `booking` | Admin + public booking (above-fold target 1280×800) |
| `grid` | Availability — `h-[calc(100dvh-3.5rem)]`, internal scroll |

### `AppShell`

```typescript
type AppShellProps = {
  variant: "admin" | "public" | "auth-minimal";
  children: React.ReactNode;
  /** admin only */
  userEmail?: string;
  /** public: omit app name text; logo only */
};
```

### `Breadcrumbs`

```typescript
type BreadcrumbItem = { label: string; href?: string };
type BreadcrumbsProps = { items: BreadcrumbItem[] };
```

## UI primitives (`components/ui/`)

Owner: **SP-DS-01** (base + extensions). Feature sub-plans **import only**.

### `Button` (extended)

```typescript
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};
```

All buttons include `cursor-pointer`.

### `DurationChip`

```typescript
type DurationChipProps = {
  value: number;
  selected: boolean;
  onSelect: (value: number) => void;
  disabled?: boolean;
};

type DurationChipGroupProps = {
  values: number[];
  selected: number | number[]; // single or multi-select
  onChange: (selected: number | number[]) => void;
  mode?: "single" | "multi";
};
```

### `Stepper` (extended)

```typescript
type BookingStepId = "duration" | "date" | "time" | "details";

type StepperProps = {
  steps: { id: BookingStepId; label: string }[];
  currentStep: BookingStepId;
  completedSteps?: BookingStepId[];
  onStepClick?: (step: BookingStepId) => void; // only completed steps clickable
};
```

### `Dialog`

Radix Dialog wrapper — `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `onConfirm`, `variant?: "default" | "destructive"`.

### `EmptyState`

```typescript
type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};
```

### `Skeleton`

```typescript
type SkeletonProps = { className?: string };
```

## Booking calendar (replaces `DatePickerMonth`)

Owner: **SP-DS-02**.

### `BookingCalendar`

```typescript
type BookingCalendarProps = {
  visibleMonth: { year: number; month: number };
  onMonthChange: (year: number, month: number) => void;
  slotCountsByDate: Map<DateKey, number>;
  selectedDate: DateKey | null;
  onSelectDate: (date: DateKey) => void;
  minDate: Date;
  maxDate: Date;
  loading?: boolean;
  viewerTimezone: IanaTimezone;
};
```

Uses shadcn `Calendar` (`react-day-picker` v9) + `CalendarDayOverlay` for slot-count badges and disabled states.

### `SlotPicker` (redesigned)

Time **chips** — compact pills, `aria-pressed`, `grid-cols-3 sm:grid-cols-4`.

Props unchanged from editorial contracts except styling contract: uses `primary` / `primary-soft` tokens only.

## Booking wizard

Owner: **SP-DS-03**.

### `BookingFlow` props

Unchanged from editorial [contracts](../editorial-ui-overhaul/contracts.md#bookingflow-props-stable-public-api).

### `BookingSuccessPanel` (new)

```typescript
type BookingSuccessPanelProps = {
  meeting: PublicMeeting;
  viewerTimezone: IanaTimezone;
  calendarName?: string;
};
```

Signature moment: primary-soft background, Meet link, optional Google Calendar deep link, subtle `animate-step-in`.

### Wizard layout contract

- Two-column on `md+`: sticky stepper left, step content right
- Timezone: compact pill in toolbar (not full-width top bar)
- Sticky footer: Back + Continue on each step
- `BookingCalendar` replaces `DatePickerMonth` — **delete** `date-picker-month.tsx` in SP-DS-02

## Calendar admin components

Owner: **SP-DS-05**.

### `CalendarActionBar`

```typescript
type CalendarActionBarProps = {
  calendarId: string;
  publicSlug: string;
  appOrigin: string; // for copy link
};
```

Actions: Copy link (primary), Book, Availability, Meetings.

### `CalendarStats`

```typescript
type CalendarStatsProps = {
  memberCount: number;
  upcomingMeetingCount: number;
};
```

### Calendar detail tabs

URL: `/calendars/[id]?tab=overview|members|settings` (default `overview`).

## HTTP / backend

**No API changes.** All sub-plans are UI-only.

## File ownership

| Path prefix | Owner |
|-------------|-------|
| `lib/brand/` | SP-DS-01 |
| `components/brand/` | SP-DS-01 |
| `components/layout/` | SP-DS-01 |
| `app/globals.css` | SP-DS-01 |
| `app/layout.tsx` | SP-DS-01 |
| `components/ui/` | SP-DS-01 |
| `lib/ui/cn.ts` | SP-DS-01 |
| `.env.example` (brand vars) | SP-DS-01 |
| `public/brand/` | SP-DS-01 |
| `components/ui/calendar.tsx` | SP-DS-02 |
| `components/booking/booking-calendar.tsx` | SP-DS-02 |
| `components/booking/calendar-day-overlay.tsx` | SP-DS-02 |
| `components/booking/slot-picker.tsx` | SP-DS-02 |
| `components/booking/group-slots-by-date.ts` | SP-DS-02 (tests only; no logic change) |
| `components/booking/booking-flow.tsx` | SP-DS-03 |
| `components/booking/booking-stepper.tsx` | SP-DS-03 |
| `components/booking/booking-success.tsx` | SP-DS-03 |
| `components/booking/timezone-selector.tsx` | SP-DS-03 |
| `components/booking/invitee-form.tsx` | SP-DS-03 |
| `components/booking/types.ts` | SP-DS-03 |
| `app/(admin)/calendars/[id]/book/` | SP-DS-03 |
| `app/book/[slug]/page.tsx` | SP-DS-03 |
| `app/(admin)/layout.tsx` | SP-DS-04 |
| `app/(auth)/login/` | SP-DS-04 |
| `app/not-found.tsx` | SP-DS-04 |
| `app/book/layout.tsx` | SP-DS-04 |
| `app/book/not-found.tsx` | SP-DS-04 |
| `app/(admin)/calendars/` (except book, availability, meetings) | SP-DS-05 |
| `components/calendar-admin/` | SP-DS-05 |
| `components/availability-grid/` | SP-DS-06 |
| `app/(admin)/calendars/[id]/availability/` | SP-DS-06 |
| `components/booking/meeting-card.tsx` | SP-DS-07 |
| `components/booking/meetings-list.tsx` | SP-DS-07 |
| `components/booking/meetings-table.tsx` | SP-DS-07 |
| `app/(admin)/calendars/[id]/meetings/` | SP-DS-07 |
| `docs/plans/design-system-overhaul/` | this plan |
| `README.md` (brand env section) | SP-DS-01 |

## Stubs for parallel agents

Until **SP-DS-01** merges, dependents use:

| Symbol | Stub path |
|--------|-----------|
| `getBrandConfig()` | Return hardcoded Gushwork preset object inline in test |
| `PageContainer` | `<div className="mx-auto max-w-5xl px-5 py-6">{children}</div>` |
| `AppShell` | `{children}` passthrough |
| `DurationChipGroup` | Map to existing `Button` variants |
| `EmptyState` | `<div>{title}</div>` |
| `Dialog` | Native `confirm()` in delete button until SP-DS-01 merges |
| `BookingCalendar` | Re-export `DatePickerMonth` with adapter props until SP-DS-02 merges |

Until **SP-DS-02** merges, **SP-DS-03** keeps `DatePickerMonth` and swaps in one PR after SP-DS-02 lands.

## Test commands

```bash
npm test                    # all — must pass after each merge
npm run test:ds-01          # SP-DS-01: components/ui, lib/ui, lib/brand
npm run test:ds-02          # SP-DS-02: booking calendar, slot-picker
npm run test:ds-03          # SP-DS-03: booking-flow, booking-success
npm run test:ds-05          # SP-DS-05: calendar-admin (if tests added)
npm run test:ui-07          # SP-DS-06: availability-grid (existing alias)
npm run test:sp-06          # SP-DS-03/07: booking API smoke
npm run build               # required before marking plan complete
```

SP-DS-01 adds `test:ds-01`, `test:ds-02`, `test:ds-03` script lines in `package.json`.
