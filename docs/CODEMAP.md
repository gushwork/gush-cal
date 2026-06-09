# Code Map

Agent-facing guide to find code quickly. Read `CONTEXT.md` first for domain language.

## Fast Lookup

| Need | Start here |
|------|------------|
| Database schema | `lib/db/schema.ts` |
| DB connection | `lib/db/client.ts` |
| DB row to domain mapping | `lib/db/mappers.ts` |
| Calendar + Members + Scheduler bundle | `lib/db/assemble-calendar-bundle.ts`, `components/calendar-admin/load-calendar-bundle.ts` |
| Migrations | `drizzle/*.sql`, `drizzle/meta/*.json` |
| Public booking by slug | `app/book/[slug]/page.tsx`, `app/api/book/[slug]/route.ts` |
| Admin Calendar pages | `app/(admin)/calendars/**/page.tsx` |
| Calendar CRUD API | `app/api/calendars/route.ts`, `app/api/calendars/[id]/route.ts` |
| Member CRUD API | `app/api/calendars/[id]/members/**/route.ts` |
| Slot generation and assignment | `lib/slots/` |
| Booking confirm/cancel/list | `lib/booking/`, `app/api/calendars/[id]/book/route.ts`, `app/api/book/[slug]/confirm/route.ts`, `app/api/meetings/[id]/route.ts` |
| Availability grid | `components/availability-grid/`, `app/api/calendars/[id]/availability/route.ts` |
| Google Calendar DWD | `lib/google/`, `lib/ports/google-calendar.ts`, `docs/adr/001-google-dwd.md` |
| Auth and domains | `lib/auth/`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` |
| UI primitives | `components/ui/`, `components/layout/`, `components/brand/` |
| Brand config | `lib/brand/`, `components/brand/brand-styles.tsx` |
| Tests and scripts | `package.json`, colocated `*.test.ts(x)` |

## Database Model

`lib/db/schema.ts` defines the persisted tables:

- `schedulers`: signed-in recruiters/operators keyed by Google OAuth subject.
- `calendars`: app scheduling configuration owned by a Scheduler. Includes slug, durations, caps, working hours, booking window, minimum notice, and timezone.
- `calendarMembers`: Members on a Calendar. Includes email, display name, optional cap overrides, optional working-hours override, optional timezone, and sort order.
- `meetings`: booked occurrences. Includes assigned Member, startsAt, duration, invitees, Google event id, Meet link, bookedBy, and guestEmail.

When changing schema:

- Update `lib/db/schema.ts`.
- Generate/add a migration under `drizzle/`.
- Update row/domain mapping in `lib/db/mappers.ts`.
- Update domain/API types in `lib/types/`.
- Update this code map if the data flow or file locations change.

## App Routes

Admin pages live under `app/(admin)/`:

- `app/(admin)/calendars/page.tsx`: Calendar list.
- `app/(admin)/calendars/new/page.tsx`: create Calendar.
- `app/(admin)/calendars/[id]/page.tsx`: Calendar detail/settings.
- `app/(admin)/calendars/[id]/availability/page.tsx`: availability grid.
- `app/(admin)/calendars/[id]/book/page.tsx`: Scheduler booking flow.
- `app/(admin)/calendars/[id]/meetings/page.tsx`: Meeting list.
- `app/(admin)/calendars/[id]/members/**/page.tsx`: Member create/edit.

Public booking pages:

- `app/book/[slug]/page.tsx`: public booking flow.
- `app/book/not-found.tsx`: public not-found CTA.

API routes:

- `app/api/calendars/route.ts`: list/create Calendars.
- `app/api/calendars/[id]/route.ts`: get/update/delete Calendar.
- `app/api/calendars/[id]/members/**/route.ts`: Member CRUD.
- `app/api/calendars/[id]/slots/route.ts`: Scheduler/admin slots.
- `app/api/calendars/[id]/availability/route.ts`: FreeBusy member columns.
- `app/api/calendars/[id]/book/route.ts`: Scheduler booking confirm.
- `app/api/calendars/[id]/meetings/route.ts`: Meeting list.
- `app/api/book/[slug]/route.ts`: public Calendar metadata.
- `app/api/book/[slug]/slots/route.ts`: public slots.
- `app/api/book/[slug]/confirm/route.ts`: public booking confirm.
- `app/api/meetings/[id]/route.ts`: cancel Meeting.
- `app/api/health/route.ts`: deploy health check.

## Core Flows

### Calendar Admin

- Forms/components: `components/calendar-admin/`.
- Validation: `components/calendar-admin/validation.ts`, `lib/working-hours/validate.ts`, `lib/calendar/validate-min-notice-hours.ts`.
- Loading a Calendar bundle: `components/calendar-admin/load-calendar-bundle.ts` -> `lib/db/assemble-calendar-bundle.ts`.
- Slugs: `lib/db/slug.ts`.

### Slot Engine

Main files in `lib/slots/`:

- `generate-slots.ts`: computes visible slots.
- `assign-member.ts`: re-checks exact slot and picks a Member.
- `eligibility.ts`: working hours, FreeBusy, caps, and accessibility checks.
- `cap-limits.ts`: effective daily/weekly caps.
- `working-hours.ts`: effective working hours/timezone and local-time checks.
- `time.ts`: booking window and minimum notice bounds.
- `fetch-bookable-slots-batch.ts`: availability-grid slot batching.

Policies:

- `guest`: public booking; enforces booking window and minimum notice.
- `admin`: Scheduler/admin booking; skips minimum notice but filters past slots.
- `none`: tests/low-level paths only.

### Booking

- Client flow: `components/booking/booking-flow.tsx`.
- Deep links from availability grid: `components/booking/parse-booking-deep-link.ts`, `components/availability-grid/bookable-overlay.tsx`.
- Slot query parsing/caching: `lib/booking/parse-slots-query.ts`, `lib/booking/slots-cache.ts`, `lib/booking/get-slots.ts`.
- Confirm: `lib/booking/confirm-booking.ts`.
- Cancel: `lib/booking/cancel-meeting.ts`.
- List/shape meetings: `lib/booking/list-meetings.ts`, `lib/booking/to-public-meeting.ts`.

Booking confirm flow:

1. Route loads Calendar bundle.
2. `confirmBooking()` validates minimum notice for guests.
3. Slot engine `assignMember()` checks eligibility.
4. Google event is created with Scheduler as organizer.
5. Meeting row is inserted.

### Availability View

- UI: `components/availability-grid/availability-grid.tsx`.
- Date navigation: toolbar popover (`availability-date-picker.tsx`); optional URL `?date=YYYY-MM-DD&view=day|week` after first navigation (`availability-url.ts`).
- Member busy columns: `app/api/calendars/[id]/availability/route.ts` + `build-member-busy-blocks.ts`; these show Google FreeBusy/access only.
- Bookable column: `components/availability-grid/fetch-bookable-slots.ts` -> slot engine with `bookingPolicy: "admin"`; this respects caps, working hours, FreeBusy, and existing Meetings.
- Grid helpers: `components/availability-grid/time-utils.ts`, `grid-hour-lines.tsx`, `member-column.tsx`, `bookable-overlay.tsx`.

## Google Calendar And DWD

- Port interface: `lib/ports/google-calendar.ts`.
- Real implementation: `lib/google/`.
- Stubs for tests/dev fallback: `lib/stubs/google-calendar-stub.ts`.
- Dependency wiring: `lib/deps.ts`.
- ADR/setup: `docs/adr/001-google-dwd.md`.

Important invariant: Scheduler OAuth is identity only. Calendar API reads/writes use the DWD service account. Event create/delete impersonates the Scheduler; FreeBusy uses `GOOGLE_DWD_SUBJECT_EMAIL` when set.

## Auth

- Auth exports: `auth.ts`, `lib/auth/index.ts`.
- Domain/base URL helpers: `lib/auth/domain.ts`, `lib/auth/base-url.ts`.
- Route protection: `middleware.ts`.
- Server auth guard helpers: `components/calendar-admin/require-scheduler.ts`.

## UI, Brand, Layout

- UI primitives: `components/ui/`.
- Page/layout helpers: `components/layout/`.
- Admin/public shell and brand: `components/brand/`, `lib/brand/`, `app/layout.tsx`, `app/(admin)/layout.tsx`, `app/book/layout.tsx`.
- Global tokens/styles: `app/globals.css`.
- Toasts: `components/ui/toast.ts`, `components/ui/toaster.tsx`.

## Tests And Commands

Commands from `package.json`:

- `npm test`: full Vitest suite with `USE_STUBS=1`.
- `npm run build`: Next.js production build.
- `npm run lint`: ESLint.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:push`: Drizzle workflows.
- `npm run test:visual`: Playwright visual audit script.

Testing pattern:

- Unit/source tests are colocated as `*.test.ts` or `*.test.tsx`.
- Most integration-style tests rely on stubs through `USE_STUBS=1`.
- When changing a module, run the closest test first, then broader suites as needed.

## Documentation Maintenance

Update this file when you add, move, rename, or significantly change:

- Database tables/columns, migrations, or mapping.
- App/API routes.
- Core booking, slot, availability, auth, Google, or deployment flows.
- Shared UI/brand structure that agents need to find.
