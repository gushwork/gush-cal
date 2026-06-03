---
name: run-sub-plans
description: Executes a to-sub-plans pack in one continuous session on a single workspace—parallel Task agents per wave, lean Done-when gates, final verification once. Use after /to-sub-plans, or when user says run-sub-plans, execute sub-plans, or run the plan in one go.
argument-hint: "Path to docs/plans/<slug> (optional)"
---

# Run Sub-Plans

Orchestrate a **`to-sub-plans`** pack in **one continuous run**: same workspace, all waves to completion, parallel `Task` implementers where **Owns** are disjoint.

**Upstream:** `docs/plans/<slug>/` (README, `contracts.md`, `SP-*.md`) + user approval. Missing pack → `to-sub-plans` first.

Do not stop for `handoff`, per-wave code review subagents, or git worktrees unless the user interrupts.

Announce: `Using run-sub-plans on <slug> — single workspace, one run.`

## Rules

- **Single workspace** — all agents edit the same tree; parallel waves rely on disjoint **Owns** only.
- **Contracts are law** — every implementer gets `contracts.md` + **Consumes** stubs.
- **One run** — load → every wave → final check; fix in-place and re-dispatch, do not defer waves to another session.
- **Lean gates** — only **Done when** items and test commands listed on the SP (no extra lint/build/E2E unless the sub-plan requires it).
- **Stubs at seams** — dependents use stubs until provider wave passes; no final glue pass.

## Workflow

1. **Load** — README, contracts, all `SP-*.md`; build waves ([REFERENCE § algorithm](REFERENCE.md#wave-algorithm)); `TodoWrite` per `SP-NN`.
2. **Per wave** — dispatch implementers ([prompt](REFERENCE.md#implementer-prompt)); `run_in_background: true` if |wave| > 1; wait for all.
3. **Gate** — **Done when** + SP-listed tests + disjoint **Owns** ([checklist](REFERENCE.md#gate-checklist)); fix-agent on failure; continue same run.
4. **Stub swap** — README **Suggested execution** smoke only when the plan calls for it.
5. **Final** — last **Done when** / README outcome check + **verification-before-completion** once at the end.

## Red flags

Overlapping **Owns** in one wave; ending the run after wave 1; worktrees for parallel agents; mandatory lint/E2E not in **Done when**; per-wave reviewer subagents.

## Related skills

| Skill | Role |
|-------|------|
| `to-sub-plans` | Creates the pack |
| `dispatching-parallel-agents` | Parallel dispatch pattern |
| `verification-before-completion` | Final pass/fail claims |

Details: [REFERENCE.md](REFERENCE.md).
