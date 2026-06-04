# Agent Instructions

These instructions are mandatory for all agents and harnesses working in this repository.

## Required Reading

- Read `CONTEXT.md` for domain language before changing product behavior, data model, booking logic, availability logic, or user-facing terminology.
- Read `docs/CODEMAP.md` before searching for database code, route handlers, core booking logic, availability behavior, Google Calendar integration, or shared UI structure.
- When you need to find anything database-related, start with the Database sections in `docs/CODEMAP.md`.

## Documentation Maintenance Rule

Whenever an agent changes app structure, database schema, routes, domain language, architecture, cross-cutting behavior, or important file locations, update the relevant documentation in the same change:

- `CONTEXT.md` for domain language and invariants.
- `docs/CODEMAP.md` for code navigation, database locations, route maps, and core flows.
- `AGENTS.md` for agent-wide process rules.

Keep documentation concise, factual, and aligned with the code as it exists after the change.

## Project Conventions

- Use domain terms consistently: Scheduler, Calendar, Member, Meeting.
- A Calendar is this app's scheduling configuration, not a Google Calendar.
- Scheduler OAuth is identity only; Google Calendar API access uses domain-wide delegation.
- Public booking uses guest policy; Scheduler/admin booking uses admin policy.
- Slot display and assignment must respect the slot engine invariants documented in `CONTEXT.md`.

## Verification

- Documentation-only changes do not require app tests unless they include executable examples or code changes.
- Code changes should run the closest relevant tests first, then broader suites when risk warrants it.
