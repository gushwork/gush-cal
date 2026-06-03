# Run Sub-Plans — Reference

## Wave algorithm

1. Parse each `SP-NN` **Blocked by** (or README table if consistent).
2. Build directed edges: blocker → dependent.
3. Repeatedly take all nodes whose blockers are **completed** — that set is one **wave**.
4. If no ready node but nodes remain → cycle or missing blocker; stop and fix the pack.

Example (gush-cal-v1):

| Wave | Sub-plans |
|------|-----------|
| 1 | SP-01 |
| 2 | SP-02, SP-03, SP-04, SP-07 |
| 3 | SP-05, SP-06 |

## Wave table (copy for session)

| Wave | Ids | Parallel? | Gate command (default) |
|------|-----|-----------|-------------------------|
| 1 | SP-01 | no | from SP-01 **Done when** |
| 2 | … | yes | per-SP tests + owns check |

Fill **Gate command** only from each SP's **Done when** / **Implementation notes** — no extra project-wide checks per wave.

## Implementer prompt

```markdown
You are implementing **{SP_ID}: {TITLE}** for plan `{SLUG}`.

## Read first
- `docs/plans/{SLUG}/contracts.md` (authoritative)
- `docs/plans/{SLUG}/{SP_FILE}` (your sub-plan)

## You own (only these paths)
{OWNS_BULLET_LIST}

## You must not edit
Any path outside **Owns**. Other sub-plans own the rest.

## Consumes (until siblings merge)
{CONSUMES_TABLE}

Use the stub/mock paths listed — do not import sibling implementations early.

## Provides (must match contracts)
{PROVIDES_LIST}

If you add a backward-compatible contract surface, document it and note a patch bump in your summary.

## Done when
{DONE_WHEN_CHECKLIST}

## Verification before you report DONE
1. Run: `{TEST_COMMAND}`
2. Self-check: no files outside **Owns**
3. Return status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

## Return format
- Status
- Files touched (paths)
- Commands run + pass/fail counts
- Provides implemented (symbols/routes)
- Blockers or concerns
```

Replace placeholders from the `SP-*.md` file. Paste the full **Agent spawn brief** when present — it overrides generic sections.

## Fix-agent prompt (after gate failure)

```markdown
Gate failed for **{SP_ID}** on plan `{SLUG}`.

## Evidence
{GATE_FAILURE_OUTPUT}

## Scope
Fix only paths in **Owns** for {SP_ID}. Do not start sibling sub-plans.

## Sub-plan
[Paste Agent spawn brief + Done when]

Re-run `{TEST_COMMAND}` and return DONE only with fresh output attached.
```

## Gate checklist

Lean gate per SP after each wave — only what **Done when** requires. Any failure: fix-agent, re-gate, **same run**.

### Owns boundary (single workspace)

```bash
git diff --name-only HEAD
```

Changed paths must fall under that SP's **Owns** (plus `contracts.md` only if that SP owns it).

Parallel wave: combined diff must show **no overlap** between agents' **Owns**. Overlap → re-run those SPs **sequentially** in the same workspace, same run — not worktrees.

### Done when

Orchestrator verifies each checkbox from `SP-*.md` with evidence (command output, etc.).

### Tests

Run only commands named in **Done when** or **Implementation notes** for that SP. Do not add lint, build, or E2E unless listed there.

Orchestrator runs commands — do not cite subagent logs as proof.

### Parallel wave merge

After per-SP gates: confirm disjoint **Owns** on combined diff. Run README **Suggested execution** smoke only when that step is written in the plan.

## Single-run orchestration

- Stay in one parent session from wave 1 through final verification.
- Do not dispatch spec/code-quality reviewer subagents between waves.
- Do not suggest `handoff` until the pack finishes or is **BLOCKED** on the user.
- Parallel agents share one workspace; coordinate via disjoint **Owns** and sequential retry on path conflicts.

## Task dispatch (Cursor)

One parent message per wave with N `Task` tool calls:

```
Task(description="SP-02 Google DWD", prompt=<implementer prompt>, run_in_background=true)
Task(description="SP-03 Slot engine", prompt=<implementer prompt>, run_in_background=true)
...
```

Wait for all background completions before gate.

**Do not** pass parent chat history to implementers — only the constructed prompt.

## Status handling

| Implementer status | Orchestrator action |
|--------------------|---------------------|
| DONE | Run gate |
| DONE_WITH_CONCERNS | Read concerns; gate or re-dispatch |
| NEEDS_CONTEXT | Answer; re-dispatch same SP |
| BLOCKED | Provide context, smaller scope, or escalate to user / `to-sub-plans` |

## Final integration prompt (optional last wave)

For **Integration** type sub-plans only — wiring, not feature logic:

```markdown
Implement **{SP_ID}** (Integration). All parallel siblings merged.
Wire real implementations per contracts.md; remove stub imports where **Consumes** now satisfied.
Owns: {OWNS}. Done when: {DONE_WHEN}.
```

## Example orchestrator narration

```
Using run-sub-plans on gush-cal-v1 — single workspace, one run.

Wave 1/3: SP-01 → gate (SP-01 Done when only) ✓
Wave 2/3: SP-02, SP-03, SP-04, SP-07 parallel → per-SP Done when ✓ → owns disjoint ✓
Wave 3/3: SP-05, SP-06 parallel → Done when ✓
Final: README outcome + verification once — complete.
```
