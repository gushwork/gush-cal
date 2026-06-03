# Panel Scheduling

A web app for recruiters (**Schedulers**) to schedule panel interviews by pooling **Member** availability from Google Workspace calendars.

## Language

**Scheduler**:
The signed-in operator (typically a Recruiter). Owns Calendars, appears as the organizer on booked Google Calendar events, and manages Meetings.
_Avoid_: User, account, Viewer

**Calendar**:
A named, saved pool of Members plus booking configuration (durations, caps, working hours, booking window) and a public booking link slug. Not a Google Calendar — our configuration entity.
_Avoid_: Preset, pool, team

**Member**:
A panelist listed in a Calendar whose availability is pooled for scheduling. Has optional cap overrides (higher than Calendar defaults) and working-hour overrides.
_Avoid_: Teammate, participant, panelist (use Member in code)

**Meeting**:
A concrete scheduled occurrence: a time slot, assigned Member, invitees, subject, body, and linked Google Calendar event.
_Avoid_: Booking, appointment, session

**Effective timezone**:
When evaluating whether a slot falls within working hours, the engine uses each Member's **effective timezone** — the Member's own timezone when they have custom hours, otherwise the Calendar timezone. The guest's viewer timezone is used only for UI labels and booking-window display, not for eligibility.

**Accessible Member**:
A Member whose Google Calendar the app can read via domain-wide delegation. Availability displays normally.
_Avoid_: Shared member, visible member

**Inaccessible Member**:
A Member whose calendar cannot be read (wrong email, DWD failure, API error). Shown as an empty column with a no-access indicator — never hidden, never faked as busy.
_Avoid_: Blocked user, missing calendar

## Working hours and timezones

**Calendar timezone**:
IANA zone for the Calendar’s default working hours. Used for Members without a custom-hours override.

**Member timezone**:
Required when a Member sets custom working hours; slot eligibility evaluates that Member’s hours in this zone (via `effectiveTimezone`), not the guest’s `viewerTimezone`.

**viewerTimezone** (guest/booking UI):
Used for booking-window bounds and slot labels in the picker only. Does not change whether a Member is eligible for a slot.

## Legacy terms (superseded)

The following terms from the original read-only viewer spec are **retired** in favor of Scheduler / Calendar above:

- **Preset** → **Calendar**
- **Viewer** → **Scheduler**
