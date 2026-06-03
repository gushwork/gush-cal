---
name: to-sub-plans
description: Decompose a plan or spec into parallel, independently executable sub-plans with explicit integration contracts so agent-built slices merge without glue work. Use when user wants to split a plan for parallel agents, spawnable workstreams, sub-plans, integration seams, or a dependency flowchart before building.
argument-hint: "Path to plan, spec, PRD, or issue (optional)"
---

# To Sub-Plans

Break a plan into **sub-plans** that independent agents can execute in parallel and merge into a coherent whole—without a final "wire it together" pass.

**Not** `to-issues`: sub-plans are execution briefs (contracts + scope), not tracker tickets. Execution (`run-sub-plans`, `handoff`, fresh agents, `to-issues`) is a **separate user invocation**—this skill does not offer or ask about it.

## Principles

<integrability-rules>
- **Contract before code**: shared types, API shapes, and file ownership live in `contracts.md` or a foundation sub-plan before parallel work starts.
- **Complete at the seam**: each sub-plan ships with tests passing against agreed stubs for sibling dependencies.
- **Disjoint ownership**: two sub-plans must not edit the same files unless one is foundation and merges first.
- **Explicit consumption**: every cross sub-plan dependency names the symbol/route and the stub path until merge.
</integrability-rules>

## Process

### 1. Gather context

Use conversation context; read any passed plan, spec, PRD, or issue in full. Align vocabulary with `CONTEXT.md` and relevant `docs/adr/`.

### 2. Find integration seams

Boundaries: shared kernel (foundation first), one-way module imports, external adapters behind interfaces, disjoint path ownership. Prefer parallel breadth when contracts stay stable; use vertical slices only if each slice still exposes a complete contract surface.

### 3. Draft sub-plans

Assign ids `SP-01`, `SP-02`, … Classify each:

| Type | When |
|------|------|
| **Foundation** | Merges first; pins contracts for dependents |
| **Parallel** | Starts after foundation (or immediately if contracts pre-written) |
| **Integration** | Rare; only cross-cutting wiring after parallels land |

Fill fields from [REFERENCE.md](REFERENCE.md): Goal, Owns, Provides, Consumes, Done when, Agent spawn brief.

### 4. Dependency graph

Always output Mermaid `flowchart`/`graph` with sub-plan nodes and **blocked-by** edges only—shape can be arbitrary (fan-out, diamond, merge node).

### 5. Quiz the user

Show: diagram, table (id, title, type, blocked by, owns), provides/consumes one-liners. Ask **only** integrability questions: contracts enough for silent parallel agents? shared files? stub gaps? granularity?

Do **not** ask whether to implement, run `run-sub-plans`, spawn agents, or create issues—that is out of scope for this skill.

Iterate until approved.

### 6. Publish artifacts (then stop)

After approval, write `docs/plans/<slug>/`:

- `README.md` — outcome, diagram, merge order, sub-plan table
- `contracts.md` — single source of truth for shared API/types
- `SP-NN-<name>.md` — one file per sub-plan

**Stop here.** Do not implement code. Do not end with a question or menu about next steps (implementation, `run-sub-plans`, handoff, agent spawn). Close by pointing at the published pack path and merge order; the user chooses execution separately.

## Quiz table (copy for review)

| Id | Title | Type | Blocked by | Owns (summary) |
|----|-------|------|------------|----------------|
| SP-01 | … | Foundation | — | `src/...` |

## Quick start

User: "Split for three parallel agents."

1. Write `contracts.md` from the plan
2. One foundation (if needed) + parallel sub-plans with disjoint **Owns**
3. Mermaid + table → quiz (integrability only) → write `docs/plans/<slug>/` → stop

Templates and example graph: [REFERENCE.md](REFERENCE.md).
