# ADR 001: Google Workspace Domain-Wide Delegation

## Status

Accepted

## Context

The app reads Member availability (FreeBusy) and creates Google Calendar events with Meet links on the Scheduler's calendar. Schedulers authenticate via Google OAuth for identity only; calendar API access uses a service account with domain-wide delegation (DWD).

## Decision

1. **Service account + DWD** impersonates Workspace users for Calendar API calls.
2. **Scope:** `https://www.googleapis.com/auth/calendar` (read + write events).
3. **FreeBusy:** single batch `freebusy.query` impersonating `GOOGLE_DWD_SUBJECT_EMAIL` (fallback: first Member email). Per-email errors map to inaccessible — never treated as busy.
4. **Event create/delete:** impersonate the Scheduler (`organizerEmail` from request).
5. **Meet:** `conferenceDataVersion: 1` with `hangoutsMeet` on event insert.

## Setup (Workspace admin)

1. Create a GCP project; enable **Google Calendar API**.
2. Create a **service account**; enable **Domain-wide delegation**.
3. Note the service account **Client ID**.
4. In Google Admin → Security → API controls → Domain-wide delegation, add the Client ID with scope:
   `https://www.googleapis.com/auth/calendar`
5. Copy the service account JSON key into `GOOGLE_SERVICE_ACCOUNT_JSON` (single-line env var).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes (prod) | Full service account key JSON |
| `GOOGLE_WORKSPACE_DOMAIN` | Yes | e.g. `acme.com` — used for Member email validation |
| `GOOGLE_DWD_SUBJECT_EMAIL` | Recommended | User to impersonate for FreeBusy batch queries (e.g. shared admin or Scheduler) |

## Security

- Store JSON in Fly.io secrets / local `.env.local` — never commit.
- DWD grants broad access within the domain; restrict service account to Calendar scope only.
- Scheduler OAuth remains separate; only `@ALLOWED_DOMAIN` emails can sign in.

## Consequences

- Workspace admin must complete one-time DWD setup.
- FreeBusy accuracy depends on impersonated user having free/busy visibility to Member calendars (default in many Workspace configs).
- Integration tests optional via `GOOGLE_INTEGRATION=1` with real credentials.
