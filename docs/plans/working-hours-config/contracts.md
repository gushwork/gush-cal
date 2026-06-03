# Contracts: Configurable Working Hours + Timezones

## Version

`v1.1.0` — extends gush-cal v1 with `timezone` fields and editor contracts.

## Schema changes

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| `calendars` | `timezone` | `text NOT NULL` | IANA, e.g. `America/New_York` |
| `calendar_members` | `timezone` | `text NULL` | Required when `working_hours_override` is non-empty |

Migration owner: **SP-01**.

## Domain type updates (`lib/types/index.ts`)

```typescript
type Calendar = {
  // ...existing fields
  timezone: IanaTimezone;
};

type CalendarMember = {
  // ...existing fields
  timezone: IanaTimezone | null;
};
```

## API body updates

```typescript
type CreateCalendarBody = {
  // ...existing
  timezone: IanaTimezone;
  defaultWorkingHours: WorkingHours;
};

type UpdateCalendarBody = Partial<CreateCalendarBody> & { name?: string };

type CreateMemberBody = {
  // ...existing
  workingHoursOverride?: WorkingHours | null; // null = use calendar default
  timezone?: IanaTimezone | null;
};

type UpdateMemberBody = Partial<CreateMemberBody>;
```

### Validation rules (shared `lib/working-hours/validate.ts`)

| Rule | Error |
|------|-------|
| `timezone` must be valid IANA | `Invalid timezone` |
| Custom hours: ≥1 day with ≥1 block | `At least one availability window required` |
| Each block: `0 <= start < end <= 1440` | `Invalid time range` |
| No overlapping blocks same `day` | `Overlapping hours on {day}` |
| Member: override non-empty ⇒ `timezone` required | `Member timezone required when using custom hours` |
| Member: override empty/null ⇒ `timezone` must be null | (API clears both) |

## Slot engine contract

```typescript
/** SP-01 provides */
function effectiveTimezone(
  member: CalendarMember,
  calendar: Calendar,
): IanaTimezone;

/** SP-06 consumes — eligibility MUST use this, NOT viewerTimezone */
function isWithinWorkingHours(
  startsAt: Date,
  durationMinutes: number,
  hours: WorkingHours,
  timezone: IanaTimezone,
): boolean;
```

`viewerTimezone` remains for **booking UI labels** and slot range display only.

## UI component contracts

### `WorkingHoursEditor` (SP-02)

```typescript
type WorkingHoursEditorProps = {
  value: WorkingHours;
  onChange: (hours: WorkingHours) => void;
  disabled?: boolean;
};
```

Emits flat `WorkingHours[]` (multiple blocks per day allowed).

### `TimezoneSelect` (SP-02)

```typescript
type TimezoneSelectProps = {
  value: IanaTimezone;
  onChange: (tz: IanaTimezone) => void;
  label?: string;
  disabled?: boolean;
};
```

Uses `Intl.supportedValuesOf("timeZone")` when available; fallback list otherwise.

### `MemberForm` hours toggle (SP-05)

- `useCalendarDefaultHours: boolean` (default true when no override)
- When false: render `WorkingHoursEditor` + `TimezoneSelect` (member TZ required)
- When true: omit `workingHoursOverride` and `timezone` from PATCH/POST

### `CalendarForm` (SP-04)

- Stateful `defaultWorkingHours` + `timezone`
- Create mode: init TZ from `Intl.DateTimeFormat().resolvedOptions().timeZone`

## HTTP routes (delta owners)

| Method | Path | Change | Owner |
|--------|------|--------|-------|
| POST | `/api/calendars` | Accept `timezone` | SP-03 |
| PATCH | `/api/calendars/:id` | Accept `timezone` | SP-03 |
| POST | `/api/calendars/:id/members` | Validate hours + TZ rules | SP-03 |
| PATCH | `/api/calendars/:id/members/:memberId` | Same | SP-03 |

## File ownership

| Path | Owner |
|------|-------|
| `drizzle/*` (new migration) | SP-01 |
| `lib/db/schema.ts`, `lib/db/mappers.ts` | SP-01 |
| `lib/types/**` | SP-01 |
| `lib/working-hours/**` | SP-01 |
| `lib/slots/working-hours.ts` (`effectiveTimezone` only) | SP-01 |
| `components/calendar-admin/working-hours-editor.tsx` | SP-02 |
| `components/calendar-admin/timezone-select.tsx` | SP-02 |
| `components/calendar-admin/working-hours-editor.test.ts` | SP-02 |
| `lib/working-hours/*.test.ts` | SP-02 |
| `app/api/calendars/**` | SP-03 |
| `components/calendar-admin/calendar-form.tsx` | SP-04 |
| `app/(admin)/calendars/new/**` | SP-04 |
| `app/(admin)/calendars/[id]/page.tsx` | SP-04 (settings tab only) |
| `components/calendar-admin/member-form.tsx` | SP-05 |
| `app/(admin)/calendars/[id]/members/**` | SP-05 |
| `lib/slots/eligibility.ts` | SP-06 |
| `lib/slots/*.test.ts` (TZ eligibility cases) | SP-06 |
| `CONTEXT.md` (timezone semantics) | SP-06 |

## Test commands

```bash
npm run test:wh-01   # SP-01 foundation
npm run test:wh-02   # SP-02 editor
npm run test:wh-03   # SP-03 API
npm run test:wh-04   # SP-04 calendar form
npm run test:wh-05   # SP-05 member form
npm run test:wh-06   # SP-06 slot engine
npm test             # full suite after all merges
```

SP-01 adds script aliases to `package.json`.

## Stubs for parallel agents

Until SP-02 merges, SP-04/SP-05 may import a **placeholder** `WorkingHoursEditor` from `lib/stubs/working-hours-editor-stub.tsx` (SP-01) that renders read-only JSON — replaced when SP-02 lands.

Until SP-01 merges, SP-06 keeps current `viewerTimezone` behavior in tests with `it.skip` for new TZ cases.
