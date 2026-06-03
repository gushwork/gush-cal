# Contracts: Editorial UI Overhaul

## Version

`v1.0.0` — bump on breaking changes; dependents pin until updated.

## Design tokens (CSS variables)

Defined in `app/globals.css` (owner: **SP-UI-01**). All sub-plans use these Tailwind `@theme` aliases or arbitrary values — no hardcoded hex in feature components.

| Token | Value | Tailwind usage |
|-------|-------|----------------|
| `--paper` | `#FAF7F2` | `bg-paper` |
| `--ink` | `#1C1917` | `text-ink` |
| `--ink-muted` | `#78716C` | `text-ink-muted` |
| `--terracotta` | `#C4653A` | `bg-terracotta`, `text-terracotta` |
| `--terracotta-soft` | `#F3E8E1` | `bg-terracotta-soft` |
| `--border` | `#E7E0D8` | `border-border` |
| `--surface` | `#FFFFFF` | `bg-surface` |
| `--success-soft` | `#E8F0E8` | success cards |
| `--success-ink` | `#2D5016` | success text |

Typography (owner **SP-UI-01** via `next/font/google`):

- `--font-display` → Fraunces (headings)
- `--font-body` → Source Sans 3 (body, UI)

## UI primitives (`components/ui/`)

Owner: **SP-UI-01**. Feature sub-plans import only; do not duplicate.

### `Button`

```typescript
type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};
```

### `Card`

```typescript
type CardProps = { children: React.ReactNode; className?: string; padding?: "sm" | "md" | "lg" };
```

### `Input`, `Textarea`, `Label`

Standard form props + `className`; error state via `error?: string`.

### `Badge`

```typescript
type BadgeProps = { children: React.ReactNode; variant?: "default" | "count" | "muted" };
```

### `Stepper`

```typescript
type BookingStepId = "duration" | "date" | "time" | "details";

type StepperStep = {
  id: BookingStepId;
  label: string;
};

type StepperProps = {
  steps: StepperStep[];
  currentStep: BookingStepId;
  completedSteps?: BookingStepId[];
};
```

### `PageHeader`

```typescript
type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};
```

### `cn()` helper

`lib/ui/cn.ts` — `clsx`-free minimal class merge (or `tailwind-merge` if already in deps; prefer zero-dep).

## Booking domain types

Owner: **SP-UI-02** exports from `components/booking/types.ts` (re-exported in contracts).

```typescript
type BookingWizardStep = "duration" | "date" | "time" | "details" | "done";

type DateKey = string; // YYYY-MM-DD in viewer timezone

type MonthSlotsCacheKey = `${number}-${number}-${number}|${number}|${string}`;
// year-month|durationMinutes|ianaTimezone

type GroupedSlots = Map<DateKey, Slot[]>;
```

### `groupSlotsByDate`

```typescript
function groupSlotsByDate(
  slots: Slot[],
  timezone: IanaTimezone,
): GroupedSlots;

function countSlotsByDate(grouped: GroupedSlots): Map<DateKey, number>;
```

Pure functions in `components/booking/group-slots-by-date.ts` (**SP-UI-02**).

### `BookingFlow` props (stable public API)

```typescript
type BookingFlowProps = {
  calendarName: string;
  durations: number[];
  bookingWindowDays: number;
  minNoticeHours?: number; // default 0 if omitted
  slotsApiPath: string;
  confirmApiPath: string;
  isPublic?: boolean;
  showPanelistCount?: boolean; // default !isPublic
  onConfirmed?: (meeting: PublicMeeting) => void;
};
```

Wizard steps: **duration → date → time → details → done**. Always show duration step.

### `DatePickerMonth` props

```typescript
type DatePickerMonthProps = {
  visibleMonth: { year: number; month: number }; // 1-12
  onMonthChange: (year: number, month: number) => void;
  slotCountsByDate: Map<DateKey, number>;
  selectedDate: DateKey | null;
  onSelectDate: (date: DateKey) => void;
  minDate: Date; // booking window start
  maxDate: Date; // booking window end
  loading?: boolean;
};
```

### `TimezoneSelector` props

```typescript
type TimezoneSelectorProps = {
  value: IanaTimezone;
  onChange: (tz: IanaTimezone) => void;
};
```

### `SlotPicker` props

```typescript
type SlotPickerProps = {
  slots: Slot[];
  selectedStartsAt: string | null;
  onSelect: (startsAt: string) => void;
  loading?: boolean;
  viewerTimezone: IanaTimezone;
  showPanelistCount?: boolean;
};
```

## HTTP (unchanged — no backend changes)

Existing slot APIs used by booking wizard:

| Method | Path | Owner (prior plan) |
|--------|------|-------------------|
| GET | `/api/calendars/:id/slots?duration&from&to&tz` | SP-06 booking |
| GET | `/api/book/:slug/slots?duration&from&to&tz` | SP-06 booking |

Month fetch: client computes `from`/`to` as visible month bounds ∩ booking window.

## Middleware

**SP-UI-01** adds public path:

```typescript
pathname.startsWith("/api/book")
```

## Motion (CSS-only)

Shared animation classes in `app/globals.css` (owner **SP-UI-01**):

- `.animate-step-in` — fade + translateY for wizard step transitions
- `.animate-stepper-fill` — stepper progress (optional)

## File ownership

| Path prefix | Owner |
|-------------|-------|
| `app/globals.css` | SP-UI-01 |
| `app/layout.tsx` | SP-UI-01 |
| `lib/ui/` | SP-UI-01 |
| `components/ui/` | SP-UI-01 |
| `middleware.ts` | SP-UI-01 |
| `components/booking/group-slots-by-date.ts` | SP-UI-02 |
| `components/booking/booking-stepper.tsx` | SP-UI-02 |
| `components/booking/timezone-selector.tsx` | SP-UI-02 |
| `components/booking/date-picker-month.tsx` | SP-UI-02 |
| `components/booking/slot-picker.tsx` | SP-UI-02 |
| `components/booking/booking-flow.tsx` | SP-UI-02 |
| `components/booking/invitee-form.tsx` | SP-UI-02 |
| `components/booking/types.ts` | SP-UI-02 |
| `components/booking/*.test.ts` (except meetings) | SP-UI-02 |
| `app/(admin)/calendars/[id]/book/` | SP-UI-03 |
| `app/book/` | SP-UI-04 |
| `app/(admin)/layout.tsx` | SP-UI-05 |
| `app/(auth)/login/` | SP-UI-05 |
| `app/page.tsx` | SP-UI-05 |
| `app/(admin)/calendars/` (except `[id]/book`, `[id]/availability`, `[id]/meetings`) | SP-UI-06 |
| `components/calendar-admin/` | SP-UI-06 |
| `components/availability-grid/` | SP-UI-07 |
| `app/(admin)/calendars/[id]/availability/` | SP-UI-07 |
| `components/booking/meetings-list.tsx` | SP-UI-08 |
| `components/booking/meetings-table.tsx` | SP-UI-08 |
| `app/(admin)/calendars/[id]/meetings/` | SP-UI-08 |
| `docs/plans/editorial-ui-overhaul/` | this plan |

## Test commands

```bash
npm test                           # all
npm run test:ui-01                 # components/ui, lib/ui
npm run test:ui-02                 # booking wizard (excl. meetings)
npm run test:ui-07                 # availability-grid tests
```

SP-UI-01 adds root script aliases; others only extend their alias line in `package.json` if missing.
