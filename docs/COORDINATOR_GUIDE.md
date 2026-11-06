# Coordinator guide

This guide documents issue size labels, task prioritization, and standard
communication between the coordinator and agents. It is the public
repository-facing counterpart to the coordinator's private operating notes
in `CORDINATOR_AGENT.md`; the policies described here must match that file.

`AGENTS.md` and `CORDINATOR_AGENT.md` are synced verbatim from the shared
[agent-coordinator template](https://github.com/OrbiterToad/agent-coordinator-template)
and are not edited in this repository. Project-specific agent rules — the
default branch, required checks, commands, and the push policy — live in
[`AGENTS.project.md`](../AGENTS.project.md), which also documents the sync
workflow and its drift check.

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

## Status reports

Agent status reports pair every percentage with a color marker and a ten-cell
text progress bar: one `█` per completed 10%, rounded down, padded to ten
cells with `░` — for example `🟢 ████████░░ 80%` or `✅ ██████████ 100%`. Markers are
🔴 0–24%, 🟠 25–49%, 🟡 50–74%, 🟢 75–99%, and ✅ only after a merge.
Percentages follow concrete milestones (implementation, local checks, PR
opened, required checks and review, merge); an open PR or passing local tests
alone is not 100%.

Repository work, including resolving a queued PR's conflicts, is always
delegated to an agent in its own branch or worktree. The coordinator owning
conflict resolution means it gets the conflicts resolved and verifies the
result, not that it edits agent branches itself.

## Status updates stay consistent with labels

Agent status updates report each task's size consistent with its issue's
current `Mini`/`Big` label. If the coordinator relabels an issue because its
true scope became clear only after investigation, the same status update
reflects the new label.

A parked implementation with an unmerged PR stays open in an unnumbered
`Waiting for PR` chat. A blocked assignment may be retained in an unnumbered
`Paused` chat. The issue keeps its size label while the released agent number
is available for a separate active assignment.

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
name. If the coordinator releases the number and keeps the task chat open as
`Waiting for PR` or `Paused`, use the former number in that task's handoffs;
the issue field distinguishes it from a new assignment using that slot.
Choose a state from `assignment`, `preflight complete`, `progress`,
`blocked`, `merge request`, `decision`, `changes requested`, `merged`, or
`ready for new task`. State meanings and copyable lifecycle templates are in
[the message templates](#message-templates).

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

### Message templates

Replace angle-bracket fields before sending. Remove optional fields that do
not apply; retain required evidence for the milestone. Use full commit SHAs
in actual handoffs. Keep one issue per message and one short paragraph of
details where possible. Supporting lines may carry check results when needed.

Assignment — coordinator names the owner and verifiable outcome:

```text
[Coordinator] [#<issue> <short task>] [assignment]
Further info: Agent <number>, implement <scope>; acceptance: <criteria>; out of scope: <exclusions>. Issue: <URL>; dependencies/ownership: <scan result>; required checks: <names>. Next: complete preflight in an isolated ai/ branch and report the base SHA.
```

Preflight and acknowledgment — agent confirms scope and the check plan:

```text
[Agent <number>] [#<issue> <short task>] [preflight complete]
Further info: Scope confirmed: <scope>. Base origin/master: <SHA>; ownership/PR/worktree scan: <findings>; dependencies/conflicts: <findings>; branch: <name>; worktree: <path>; required checks: <names>. Next: I will <first implementation step>.
```

Meaningful progress — either speaker reports a concrete change:

```text
[Agent <number>] [#<issue> <short task>] [progress]
Further info: <milestone achieved>; validation: <command/result and tested SHA>; pushed: <branch/commit or PR URL>; dependencies/conflicts: <new finding, if any>. Next: I will <next step>.
```

For a coordinator sync checkpoint, use `progress` and name the verified
`master` SHA, affected branch, and owner of the next action:

```text
[Coordinator] [#<issue> <short task>] [progress]
Further info: PR #<number> merged; current master: <SHA>. Agent <number>, sync <branch> to this checkpoint and report the tested head when ready.
```

Blocker or decision needed — agent identifies the impact and safe next step:

```text
[Agent <number>] [#<issue> <short task>] [blocked]
Further info: <blocker and evidence> prevents <dependent action>. Decision needed from coordinator: <specific question/options>; recommendation: <proposal and reason>. Next: I will await direction on <blocked action>; I can continue <independent work, if available>.
```

Merge readiness — the exact request phrase remains in the details:

```text
[Agent <number>] [#<issue> <short task>] [merge request]
Further info: I want to merge PR #<number>: <URL>. Tested head: <SHA>; current base origin/master: <SHA>; local validation: <results>; required CI checks: <each result or pending/unknown>; review: <approvals/requests/blocking feedback>; freshness/mergeability: <verified state or unknown>; dependencies/conflicts: <findings>. Next: coordinator to review readiness and set merge order.
```

If GitHub access prevents PR creation or updates, use `blocked` instead,
with the pushed branch, exact head/base SHAs, local check results, access
error, and a request for coordinator action. Do not invent a PR or CI result.

Coordinator merge decision — keep ownership explicit:

```text
[Coordinator] [#<issue> <short task>] [decision]
Further info: PR #<number> is <queued/held> for <reason or merge order>. Head: <SHA>; base: <SHA>; required checks: <state>; review: <state>; dependencies/conflicts: <findings>. Next: I will <refresh/resolve/merge when protection permits>; Agent <number> should <continue work or a specific sync/push-pause instruction>.
```

A specific merge delegation must explicitly name the authorized agent, PR,
and head; the agent must refresh base, protection, checks, reviews, and
mergeability before merging. A queue position or readiness report alone is
not permission to merge or bypass protection.

Coordinator changes requested — state the correction and verification:

```text
[Coordinator] [#<issue> <short task>] [changes requested]
Further info: PR #<number> needs <specific correction and reason/evidence>. Next: Agent <number> to <change>, run <relevant/required checks>, and send a new merge request with the tested head/base and refreshed check/review state.
```

Merge confirmation — sent by whoever actually performed the merge:

```text
[Coordinator] [#<issue> <short task>] [merged]
Further info: I have merged PR #<number>: <URL>. Resulting master: <SHA>. Next: Agent <number> to <required follow-up or confirm completion>.
```

For an agent performing an explicitly delegated merge, use
`[Agent <number>]`, preserve “I have merged PR #X” with the actual PR number,
and send the confirmation directly to `Cordinator` with the resulting
`master` SHA.

Completion and availability — only after merge and required follow-up:

```text
[Agent <number>] [#<issue> <short task>] [ready for new task]
Further info: PR #<number>: <URL> is merged; resulting master: <SHA>; required follow-up: <completed outcome or none>. Task complete. I am ready for a new task.
```

Agent 1 remains idle/reserved for instruction maintenance; availability does
not authorize reassignment to feature work or archiving its reserved chat.

### Illustrative exchange

The issues, PR, paths, results, and full SHAs below are fictional examples,
not current repository status. They show relevant fields without implying
that pending checks or an unknown merge state have passed.

```text
[Coordinator] [#120 Pause restart] [assignment]
Further info: Agent 3, add Restart to the pause menu; acceptance: restarting resets the race and closes the menu; out of scope: menu redesign. Issue: https://github.com/OrbiterToad/td-racing/issues/120; ownership: no duplicate assignment found; required checks: Formatting, Lint, Simulation tests, Dependency audit, Build and browser tests. Next: report preflight and base SHA.
```

```text
[Agent 3] [#120 Pause restart] [preflight complete]
Further info: Scope confirmed. Base origin/master: 1111111111111111111111111111111111111111; issue/PR/branch/worktree scan: no duplicate owner or dependency found. Branch: ai/pause-restart; worktree: /tmp/td-pause-restart. Required checks: Formatting, Lint, Simulation tests, Dependency audit, Build and browser tests. Next: I will connect Restart to the existing race reset.
```

```text
[Agent 3] [#120 Pause restart] [progress]
Further info: Restart resets the race and closes the pause menu. Targeted pause test passed at 2222222222222222222222222222222222222222, pushed to ai/pause-restart. Next: I will run the required suite.
```

```text
[Agent 3] [#120 Pause restart] [blocked]
Further info: The race reset retains the selected camera; the issue does not define whether Restart should reset it. Decision needed: retain the camera or reset it? I recommend retaining it to match current reset behavior. Next: I will await direction on camera behavior and continue the independent formatting and lint checks.
```

```text
[Coordinator] [#120 Pause restart] [decision]
Further info: Retain the selected camera, matching current reset behavior. Next: Agent 3 to verify the pause restart preserves it and complete the required suite.
```

```text
[Agent 3] [#120 Pause restart] [merge request]
Further info: I want to merge PR #121: https://github.com/OrbiterToad/td-racing/pull/121. Tested head: 3333333333333333333333333333333333333333; current base origin/master: 1111111111111111111111111111111111111111. Local required suite passed; CI: Formatting, Lint, Simulation tests and Dependency audit passed, Build and browser tests pending. Review: no approvals required, none submitted, no blocking feedback found. Mergeability: unknown until CI finishes; base is unchanged; dependencies/conflicts: none found. Next: coordinator to assess queue position after CI completes.
```

```text
[Coordinator] [#120 Pause restart] [changes requested]
Further info: PR #121 lacks coverage that the selected camera survives a pause restart. Next: Agent 3 to add that behavioral assertion, rerun the required checks, and report the new tested head/base and CI/review state.
```

```text
[Agent 3] [#120 Pause restart] [merge request]
Further info: I want to merge PR #121: https://github.com/OrbiterToad/td-racing/pull/121. Tested head: 4444444444444444444444444444444444444444; current base origin/master: 1111111111111111111111111111111111111111. Camera assertion added; local suite passed. Required CI: Formatting, Lint, Simulation tests, Dependency audit, Build and browser tests all passed. Review: no approvals required, none submitted; requested correction resolved, no blocking feedback. Freshness/mergeability: current and mergeable; dependencies/conflicts: none found. Next: coordinator to refresh protection and decide the merge.
```

```text
[Coordinator] [#120 Pause restart] [decision]
Further info: PR #121 is first in the merge pass. Head: 4444444444444444444444444444444444444444; base: 1111111111111111111111111111111111111111; required checks passed; no required approvals or unresolved feedback; no conflicts found. Next: I will refresh protection and merge if it remains satisfied. Agent 3 should pause pushes during integration.
```

```text
[Coordinator] [#120 Pause restart] [merged]
Further info: I have merged PR #121: https://github.com/OrbiterToad/td-racing/pull/121. Resulting master: 5555555555555555555555555555555555555555. Next: Agent 3 to confirm completion; no additional validation is required for this assignment.
```

```text
[Agent 3] [#120 Pause restart] [ready for new task]
Further info: PR #121 is merged at master 5555555555555555555555555555555555555555; required follow-up: none. Task complete. I am ready for a new task.
```
