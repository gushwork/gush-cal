# Agent Instructions

These instructions are mandatory for all agents and harnesses working in this repository.

## Required Reading

- Read `CONTEXT.md` for domain language before changing product behavior, data model, booking logic, availability logic, or user-facing terminology.
- Read `docs/CODEMAP.md` before searching for database code, route handlers, core booking logic, availability behavior, Google Calendar integration, or shared UI structure.
- When you need to find anything database-related, start with the Database sections in `docs/CODEMAP.md`.

## Code Navigation With graphify

This repo is indexed with [graphify](https://github.com/safishamsi/graphify), a knowledge graph of the codebase. Use it to find code and trace relationships before falling back to broad grep/glob searches.

- Setup (once per machine): `uv tool install graphifyy` (or `pipx install graphifyy`; Python 3.10+), then `graphify claude install --project` for Claude Code or `graphify codex install` / `graphify cursor install` for other agents. Optionally `graphify hook install` to rebuild the graph on commit and branch checkout.
- `graphify-out/` is gitignored and local to each checkout. If `graphify-out/graph.json` is missing, build it with `/graphify .`; after pulling or switching branches, refresh with `graphify update .`. Code-only builds run offline and need no API key.
- Query before searching:
  - `graphify query "<question>"`: scoped subgraph for a plain-language question (e.g. "where is slot eligibility decided?").
  - `graphify path "<A>" "<B>"`: how two symbols or modules connect.
  - `graphify explain "<concept>"`: explain one node and its neighbours.
  - `graphify-out/GRAPH_REPORT.md`: highlights and community overview.
- The graph complements, not replaces, `CONTEXT.md` (domain language) and `docs/CODEMAP.md` (curated map). Verify graph answers against the source before editing, and if the graph looks stale, refresh it.

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
