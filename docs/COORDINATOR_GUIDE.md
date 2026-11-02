# Coordinator guide

This guide documents how the coordinator classifies and labels actionable
GitHub issues by size, and how that classification affects which issue gets
picked up next. It is the public, repository-facing counterpart to the
coordinator's private operating notes in `CORDINATOR_AGENT.md`; the policy
described here must match what that file says.

## Labeling issues by size

Every actionable task issue (a tracked feature request, bug report, or
cleanup item — not a question or status update) must carry exactly one of
two GitHub issue labels, in addition to any other labels such as type or
area:

- **`Mini`** — bounded work: documentation, tests, audits, or a focused
  fix/cleanup with a narrow, well-understood scope.
- **`Big`** — broad or high-complexity work: new features, systems, or
  changes that touch multiple areas or carry real design/implementation
  uncertainty.

The coordinator applies the matching label when creating an issue, and
corrects it on a reused issue if the scope turns out to be different than
first thought. An issue should never end up with both labels or neither; if
both are present, the one that no longer fits is removed.

### How this relates to agent-chat sizing

Separately from issue labels, the coordinator also names each agent chat
with a `(Mini)` or `(Big)` size tag (for example, `Agent 5 (Big) · Gamepad
support`), based on the difficulty of that specific assignment. The two
`Mini`/`Big` concepts share the same names and the same bounded-vs-broad
meaning, but they label different things:

- The **issue label** sizes the underlying _task_.
- The **agent-chat label** sizes the _agent assignment_ currently carrying
  out that task.

In the normal case they match: a `Mini` issue is handed to an agent chat
titled `(Mini)`, and a `Big` issue to one titled `(Big)`. They diverge only
when the actual effort for that specific assignment clearly differs from the
issue's label (for example, a nominally `Big` issue reduced to a small
follow-up slice) — in that case the coordinator notes the reason rather than
silently relabeling the issue to match the chat, or the chat to match the
issue.

## Prioritizing Mini work

The coordinator never runs more than eight active agents at once. When a
slot opens and more than one queued issue is ready to start, the coordinator
prefers a ready issue labeled `Mini` first. It passes over a ready Mini
issue only for a concrete reason — a dependency (the Mini issue is blocked
on other work), urgency (a time-sensitive or higher-priority blocker), or
similar — and states that reason in the next status update.

This preference is strictly about ordering work within the existing
eight-agent limit. It never justifies starting a ninth agent or otherwise
exceeding the cap to get a Mini issue moving sooner.

## Status updates stay consistent with labels

Agent status updates report each task's size consistent with its issue's
current `Mini`/`Big` label. If the coordinator relabels an issue because its
true scope became clear only after investigation, the same status update
reflects the new label.

## Communication standard

Use these two-line structures for every direct coordination message:

```text
[Agent <number>] [#<issue> <short task>] [<state>]
Further info: <outcome or request; relevant evidence; next action and owner>
```

```text
[Coordinator] [#<issue> <short task>] [<state>]
Further info: <decision or instruction; relevant evidence; next action and owner>
```

Use the assigned agent number and tracked issue, with a short, stable task
name. Choose a state from `assignment`, `preflight complete`, `progress`,
`blocked`, `merge request`, `decision`, `changes requested`, `merged`, or
`ready for new task`. State meanings and copyable lifecycle templates are in
[the state definitions](#state-meanings).

Lead with the result, request, or decision. Use neutral, direct sentences and
name who acts next when action is needed. Report progress only when a
milestone, evidence, risk, or next action changes; avoid repeated status,
filler, invented percentages, or unsupported claims. Include only relevant
fields. Use `pending` for work awaiting completion and `unknown` for facts
not yet verified, with the next verification step. Distinguish local results
from CI results, and implementation readiness from merge completion.

The format does not grant messaging or merge authority. Send required
handoffs directly to `Cordinator` using the chat messaging tool, within user
authorization. The coordinator owns the merge queue and merges unless it
explicitly delegates a specific merge. Keep the assignment open until its
PR is merged and required follow-up is complete.

### State meanings

| State                | Speaker       | Use when                                                                             |
| -------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `assignment`         | Coordinator   | Assigning scope, ownership, checks, and acceptance criteria.                         |
| `preflight complete` | Agent         | Acknowledging scope after checking the base, ownership, and dependencies.            |
| `progress`           | Either        | Reporting a meaningful milestone or a sync checkpoint and next action.               |
| `blocked`            | Agent         | A blocker or decision prevents dependent work; identify what can continue.           |
| `merge request`      | Agent         | Requesting the coordinator's merge decision with current evidence.                   |
| `decision`           | Coordinator   | Resolving a request, setting merge order, or explicitly delegating a specific merge. |
| `changes requested`  | Coordinator   | Naming required corrections and validation before another handoff.                   |
| `merged`             | Actual merger | Confirming the merge with the resulting `master` SHA.                                |
| `ready for new task` | Agent         | The PR is merged and required follow-up is complete.                                 |

Message states describe the communication event; they do not replace chat
lifecycle titles or issue size labels. Use `progress` for sync checkpoints.
A `decision` is not evidence of a completed merge. An agent only says
“I have merged PR #X” after performing that specific, explicitly authorized
merge; when the coordinator merges, the coordinator sends the confirmation.
The agent can then acknowledge the verified merge in its completion report.

