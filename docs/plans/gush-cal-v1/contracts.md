# Contracts: Panel Scheduling v1

## Version

`v1.0.0` — bump on breaking changes; dependents pin until updated.

## Domain types

All exported from `lib/types/index.ts` (owner: **SP-01**).

```typescript
/** ISO 8601 UTC instant */
type UtcInstant = string;

/** IANA timezone, e.g. "America/New_York" */
type IanaTimezone = string;

/** Minutes from midnight, 0–1439 */
type MinutesOfDay = number;

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0

type WorkingHoursBlock = {
  day: DayOfWeek;
  start: MinutesOfDay;
  end: MinutesOfDay;
};

type WorkingHours = WorkingHoursBlock[];

type Scheduler = {
  id: string;
  email: string;
  name: string;
  googleSub: string;
  createdAt: UtcInstant;
};

type Calendar = {
  id: string;
  schedulerId: string;
  name: string;
  slug: string;
  bookingWindowDays: number;
  minNoticeHours: number;
  defaultMaxPerDay: number;
  defaultMaxPerWeek: number;
  defaultWorkingHours: WorkingHours;
  /** Subset of [15, 30, 45, 60, 90] */
  durations: number[];
  createdAt: UtcInstant;
};

type CalendarMember = {
  id: string;
  calendarId: string;
  email: string;
  displayName: string | null;
  maxPerDayOverride: number | null;
  maxPerWeekOverride: number | null;
  workingHoursOverride: WorkingHours | null;
  sortOrder: number;
};

type BookedBy = "scheduler" | "guest";

type Meeting = {
  id: string;
  calendarId: string;
  assignedMemberId: string;
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  invitees: string[];
  googleEventId: string;
  meetLink: string | null;
  bookedBy: BookedBy;
  guestEmail: string | null;
  createdAt: UtcInstant;
};

/** Calendar + members loaded for slot/assignment */
type CalendarBundle = Calendar & {
  members: CalendarMember[];
  scheduler: Pick<Scheduler, "id" | "email" | "name">;
};

type Slot = {
  startsAt: UtcInstant;
  durationMinutes: number;
  /** At least one eligible member exists */
  eligibleMemberCount: number;
};

type MemberAvailabilityStatus = "accessible" | "inaccessible";

type MemberBusyBlock = {
  memberId: string;
  email: string;
  status: MemberAvailabilityStatus;
  busy: Array<{ start: UtcInstant; end: UtcInstant }>;
};

type AssignmentResult =
  | { ok: true; member: CalendarMember; meeting: Meeting }
  | { ok: false; code: "SLOT_UNAVAILABLE" | "GOOGLE_ERROR" };
```

## Ports (interfaces)

Defined in `lib/ports/google-calendar.ts` and `lib/ports/slot-engine.ts` (owner: **SP-01** stubs; **SP-02** / **SP-03** implement).

### `GoogleCalendarPort`

```typescript
type FreeBusyRequest = {
  memberEmails: string[];
  timeMin: UtcInstant;
  timeMax: UtcInstant;
};

type FreeBusyResult = {
  byEmail: Record<
    string,
    { status: "ok"; busy: Array<{ start: UtcInstant; end: UtcInstant }> }
      | { status: "error"; code: string }
  >;
};

type CreateMeetingEventRequest = {
  organizerEmail: string;
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  attendeeEmails: string[];
  requestMeet: true;
};

type CreateMeetingEventResult =
  | { ok: true; googleEventId: string; meetLink: string }
  | { ok: false; code: string };

interface GoogleCalendarPort {
  queryFreeBusy(req: FreeBusyRequest): Promise<FreeBusyResult>;
  createMeetingEvent(req: CreateMeetingEventRequest): Promise<CreateMeetingEventResult>;
  deleteEvent(organizerEmail: string, googleEventId: string): Promise<void>;
}
```

Stub: `lib/stubs/google-calendar-stub.ts` (**SP-01**).  
Implementation: `lib/google/` (**SP-02**).  
Factory: `lib/google/index.ts` exports `createGoogleCalendarPort(): GoogleCalendarPort`.

### `AppDeps` (central factory — SP-01)

```typescript
type AppDeps = {
  google: GoogleCalendarPort;
  slots: SlotEnginePort;
  db: DbMeetingCounter;
};

/** SP-01 owns. Real impls when env set; stubs otherwise. */
function createAppDeps(): AppDeps;
```

- `lib/deps.ts` — **SP-01** creates; **SP-02** registers real Google via env `GOOGLE_SERVICE_ACCOUNT_JSON`; **SP-03** registers real slots when Google is real.
- Route handlers and `lib/booking/` import `createAppDeps()` only — never import stubs or `lib/google/` directly.
- Env: `USE_STUBS=1` forces stubs even if credentials present (for CI unit tests).

### `SlotEnginePort`

```typescript
type GetSlotsRequest = {
  bundle: CalendarBundle;
  durationMinutes: number;
  rangeStart: UtcInstant;
  rangeEnd: UtcInstant;
  viewerTimezone: IanaTimezone;
};

type AssignMemberRequest = {
  bundle: CalendarBundle;
  startsAt: UtcInstant;
  durationMinutes: number;
};

interface SlotEnginePort {
  getAvailableSlots(req: GetSlotsRequest): Promise<Slot[]>;
  assignMember(req: AssignMemberRequest): Promise<
    | { ok: true; member: CalendarMember }
    | { ok: false; code: "SLOT_UNAVAILABLE" }
  >;
}
```

Stub: `lib/stubs/slot-engine-stub.ts` (**SP-01**).  
Implementation: `lib/slots/` (**SP-03**).  
Factory: `lib/slots/index.ts` exports `createSlotEnginePort(deps: { google: GoogleCalendarPort; db: DbMeetingCounter }): SlotEnginePort`.

### `DbMeetingCounter`

```typescript
interface DbMeetingCounter {
  countMeetingsForMember(
    memberId: string,
    windowStart: UtcInstant,
    windowEnd: UtcInstant
  ): Promise<number>;
  countMeetingsForMemberOnDay(
    memberId: string,
    dayStart: UtcInstant,
    dayEnd: UtcInstant
  ): Promise<number>;
}
```

Implementation: `lib/db/meeting-counter.ts` (**SP-01**).

## HTTP API

| Method | Path | Auth | Request | Response | Owner |
|--------|------|------|---------|----------|-------|
| GET | `/api/calendars` | Scheduler | — | `{ calendars: Calendar[] }` | SP-04 |
| POST | `/api/calendars` | Scheduler | `CreateCalendarBody` | `{ calendar: Calendar }` | SP-04 |
| GET | `/api/calendars/:id` | Scheduler | — | `{ calendar: CalendarBundle }` | SP-04 |
| PATCH | `/api/calendars/:id` | Scheduler | `UpdateCalendarBody` | `{ calendar: Calendar }` | SP-04 |
| DELETE | `/api/calendars/:id` | Scheduler | — | `204` | SP-04 |
| POST | `/api/calendars/:id/members` | Scheduler | `CreateMemberBody` | `{ member: CalendarMember }` | SP-04 |
| PATCH | `/api/calendars/:id/members/:memberId` | Scheduler | `UpdateMemberBody` | `{ member: CalendarMember }` | SP-04 |
| DELETE | `/api/calendars/:id/members/:memberId` | Scheduler | — | `204` | SP-04 |
| GET | `/api/calendars/:id/slots` | Scheduler | `?duration=&from=&to=&tz=` | `{ slots: Slot[] }` | SP-06 |
| GET | `/api/calendars/:id/availability` | Scheduler | `?from=&to=` | `{ members: MemberBusyBlock[] }` | SP-05 |
| GET | `/api/book/:slug` | Public | — | `{ calendar: PublicCalendar }` | SP-06 |
| GET | `/api/book/:slug/slots` | Public | `?duration=&from=&to=&tz=` | `{ slots: Slot[] }` | SP-06 |
| POST | `/api/book/:slug/confirm` | Public | `ConfirmBookingBody` | `{ meeting: PublicMeeting }` \| `409 SLOT_UNAVAILABLE` | SP-06 |
| POST | `/api/calendars/:id/book` | Scheduler | `ConfirmBookingBody` | `{ meeting: Meeting }` \| `409` | SP-06 |
| GET | `/api/calendars/:id/meetings` | Scheduler | `?from=&to=` | `{ meetings: Meeting[] }` | SP-06 |
| DELETE | `/api/meetings/:id` | Scheduler | — | `204` | SP-06 |

### Request/response bodies

```typescript
type CreateCalendarBody = {
  name: string;
  bookingWindowDays: number;
  minNoticeHours: number;
  defaultMaxPerDay: number;
  defaultMaxPerWeek: number;
  defaultWorkingHours: WorkingHours;
  durations: number[];
};

type UpdateCalendarBody = Partial<CreateCalendarBody> & { name?: string };

type CreateMemberBody = {
  email: string;
  displayName?: string;
  maxPerDayOverride?: number;
  maxPerWeekOverride?: number;
  workingHoursOverride?: WorkingHours;
};

type UpdateMemberBody = Partial<CreateMemberBody>;

type ConfirmBookingBody = {
  startsAt: UtcInstant;
  durationMinutes: number;
  subject: string;
  body: string;
  invitees: string[];
  guestEmail?: string;
  viewerTimezone: IanaTimezone;
};

type PublicCalendar = Pick<
  Calendar,
  "name" | "slug" | "durations" | "bookingWindowDays" | "minNoticeHours"
>;

type PublicMeeting = Pick<
  Meeting,
  "startsAt" | "durationMinutes" | "subject" | "meetLink"
>;
```

## Constants

| Name | Value | Owner |
|------|-------|-------|
| `SLOT_INCREMENT_MINUTES` | `15` | SP-03 |
| `ALLOWED_DURATIONS` | `[15, 30, 45, 60, 90]` | SP-01 |
| `FREEBUSY_CACHE_TTL_MS` | `30_000` | SP-06 |

## File ownership

| Path prefix | Owner |
|-------------|-------|
| `lib/types/` | SP-01 |
| `lib/db/` | SP-01 |
| `lib/auth/` | SP-01 |
| `lib/stubs/` | SP-01 |
| `lib/deps.ts` | SP-01 (SP-02/SP-03 register real impls via side-effect imports or lazy getters — no edits to deps.ts after SP-01 except SP-01 patch) |
| `lib/ports/` | SP-01 |
| `middleware.ts` | SP-01 |
| `app/api/auth/` | SP-01 |
| `app/(auth)/` | SP-01 |
| `lib/google/` | SP-02 |
| `docs/adr/001-google-dwd.md` | SP-02 |
| `lib/slots/` | SP-03 |
| `app/api/calendars/` | SP-04 |
| `app/(admin)/calendars/` (except `*/availability`, `*/book`, `*/meetings`) | SP-04 |
| `components/calendar-admin/` | SP-04 |
| `app/api/calendars/:id/availability/` | SP-05 |
| `app/(admin)/calendars/[id]/availability/` | SP-05 |
| `components/availability-grid/` | SP-05 |
| `lib/booking/` | SP-06 |
| `app/api/book/` | SP-06 |
| `app/api/meetings/` | SP-06 |
| `app/api/calendars/[id]/slots/` | SP-06 |
| `app/api/calendars/[id]/book/` | SP-06 |
| `app/api/calendars/[id]/meetings/` | SP-06 |
| `app/book/` | SP-06 |
| `app/(admin)/calendars/[id]/book/` | SP-06 |
| `app/(admin)/calendars/[id]/meetings/` | SP-06 |
| `components/booking/` | SP-06 |
| `fly.toml`, `Dockerfile`, `.env.example` | SP-07 |
| `docs/plans/gush-cal-v1/` | this plan |

## Test commands

```bash
pnpm test              # all unit/integration
pnpm test:sp-02        # lib/google/**
pnpm test:sp-03        # lib/slots/**
pnpm test:sp-04        # calendar API routes
pnpm test:sp-05        # availability
pnpm test:sp-06        # booking
```

Each sub-plan adds its script alias in `package.json` (SP-01 adds root scripts; others only extend their alias).
