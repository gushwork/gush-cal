# Panel Scheduling Context

Recruiter-focused scheduling app for pooling Google Workspace calendar availability and booking panel interviews.

For code navigation, database locations, route maps, and test entry points, start with `docs/CODEMAP.md`.

## Domain Language

**Scheduler**: signed-in recruiter/operator. Owns Calendars, manages Meetings, and is the organizer on booked Google Calendar events.
Avoid: User, account, Viewer.

**Calendar**: app-owned scheduling configuration: name, slug, Members, durations, working hours, booking window, caps, and public booking link. This is not a Google Calendar.
Avoid: Preset, pool, team.

**Member**: panel interviewer listed on a Calendar. Availability is pooled for scheduling. Members can have cap overrides, working-hour overrides, and a timezone for custom hours.
Avoid: Teammate, participant, panelist in code.

**Team**: named subset of Members on a Calendar; round robin runs within a Team.
Avoid: sub-pool, group in user-facing copy (use Team).

**BookingLink**: published URL target for team pool, single Member, or default Calendar entry.

**Meeting**: concrete scheduled occurrence with assigned Member, time, duration, invitees, subject/body, Google event id, Meet link, and booked-by source.
Avoid: Booking, appointment, session in persisted/domain code.

Show/no-show attendance and showup-weighted round robin are **out of scope** for the platform expansion.

## Time And Availability Invariants

**Calendar timezone**: IANA timezone for default Calendar working hours. Used for Members without custom working hours.

**Member timezone**: required when a Member has custom working hours. Slot eligibility evaluates the Member's hours in their effective timezone.

**Effective timezone**: `Member.timezone` when custom hours exist; otherwise the Calendar timezone. Used for working-hours eligibility.

**viewerTimezone**: guest/admin UI timezone for labels, date grouping, booking-window display, and minimum-notice bounds. It does not decide Member working-hours eligibility.

**Accessible Member**: Google Calendar can be read via domain-wide delegation. Show FreeBusy normally.

**Inaccessible Member**: Google Calendar cannot be read. Keep the Member visible with a no-access indicator; never hide them or fake them as busy.

## Booking Invariants

- Public booking uses `bookingPolicy: "guest"` and enforces minimum notice.
- Scheduler/admin booking uses `bookingPolicy: "admin"` and can book sooner than minimum notice.
- Slot display and assignment must both go through the slot engine eligibility rules: working hours, FreeBusy, caps, and existing Meetings.
- Google Calendar access is via domain-wide delegation; Scheduler OAuth is identity only.
- A Member cannot hold two active Meetings at the same instant: a partial unique index enforces this and `confirmBooking` surfaces the conflict as `SLOT_UNAVAILABLE`. Cancelled Meetings (`cancelledAt` set) free the slot and are excluded from "upcoming" counts.
- A Calendar API key authorizes only its own Calendar; meeting operations must verify the target Meeting belongs to that Calendar (no cross-Calendar access).

## Legacy Terms

- **Preset** → **Calendar**
- **Viewer** → **Scheduler**
