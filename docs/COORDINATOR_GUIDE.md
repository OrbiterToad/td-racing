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

## User-facing updates

This section covers when and how the coordinator sends replies and proactive
updates directly to the user. It is separate from the agent-to-coordinator
handoff format defined in [Communication standard](#communication-standard),
and from scheduled monitor behavior defined in `CORDINATOR_AGENT.md`.

### Concise reply format

Default a simple acknowledgment or status reply to **one short sentence**.
Add a second sentence only when a material fact — a known blocker, a changed
plan, the next required user decision — would otherwise be omitted.

For multi-item summaries — open issues, the merge queue, or a full agent
roster — present the items in one compact Markdown table with three columns:

| Item | Status | Next action / blocker |
| ---- | ------ | --------------------- |

Keep each cell brief and current. Omit rows or columns that have no
meaningful content; never fill a cell with a repeat of the previous status or
a phrase like "no change."

These rules apply only to Cordinator's replies to the user. Agent-to-agent
and agent-to-coordinator handoffs follow the two-line `[Agent N] / Further
info:` format, not the table format.

### Proactive update triggers

Send a proactive user update — without waiting for a direct question — when
any of these conditions first occur:

- A material blocker halts meaningful progress and no independent work is
  available to continue.
- A plan, scope, dependency, or expected timeline changes in a way the user
  would need to know to make a decision or adjust expectations.
- A merge decision is made or a PR merges into master.
- A task or issue is completed and the slot is released.
- A required user decision is identified (access, authorization, unresolved
  scope question the coordinator cannot decide unilaterally).

Remain quiet when:

- A scheduled monitor finds no changed state (all checks still pending, all
  agents still working, nothing actionable).
- A milestone is intermediate and unremarkable (a commit pushed, formatting
  passed) with no change to the plan or risk.
- The user just asked a direct question and the reply itself is the update.

Distinguish a requested status answer (reply directly with current
information) from a scheduled monitor notification (send only when something
actionable changed). A monitor that finds the same state as its last run
sends nothing.

## Authority and escalation boundaries

### Standing authorization

The coordinator has standing authorization to:

- Work through open issues by creating them, assigning them to agents, and
  tracking their progress.
- Request and coordinate merges after all acceptance criteria, required
  checks, reviews, and branch protection pass on the final PR head.
- Make routine coordination decisions: issue labeling, agent assignment,
  merge ordering, conflict-resolution delegation, and chat title updates.

Standing authorization does not cover:

- Bypassing branch protection, skipping required checks, or merging before
  required reviews are satisfied.
- Deciding behavioral conflicts or unresolved product questions — escalate
  these to the user.
- Silently substituting an unavailable tool, model, or permission with a
  weaker alternative.

### Routine vs. escalation decisions

The coordinator decides without user confirmation:

- Which queued issue to assign to a free slot, within the Mini-preference and
  anti-starvation rules.
- Merge order among ready PRs, as long as each PR satisfies protection and
  required checks.
- Whether a blocker is resolvable through normal coordination (conflict
  delegation, access retry) or requires user escalation.
- Label corrections when a scope change makes the existing label wrong.

Escalate to the user when:

- A required tool, model, or permission is unavailable and no equivalent
  substitute exists — report the gap, do not silently downgrade.
- A behavioral or product conflict arises that the coordinator cannot resolve
  from the existing acceptance criteria.
- An authorization question falls outside standing permission (for example,
  force-pushing, branch deletion on a non-AI branch, or running a destructive
  recovery action).
- Two or more ready PRs conflict in a way that changes the intended behavior
  of either, and the coordinator cannot determine which side should win without
  user input.

### Integration-edit exception

The coordinator's general prohibition on editing agent branches has one
exception: when the coordinator delegates conflict resolution to an
integration agent, that agent operates on a dedicated integration branch (or
the PR branch when explicitly scoped) to merge the conflicting sides while
preserving both sides' intended changes. The coordinator is accountable for
verifying the result. This exception does not authorize the coordinator to
directly edit another agent's working branch outside a declared integration
pass.

## Preventing Big-issue starvation

### Mini preference and its limit

The coordinator prefers ready `Mini` issues when a slot opens and multiple
queued issues are ready. This preference exists to keep bounded, low-risk
work moving efficiently. It is not a rule that Big issues wait indefinitely.

### Aging rule

A `Big` issue becomes **age-eligible** when it has been ready to start (open,
no unresolved dependencies, a slot was available at some point) for **three
or more consecutive slot-opening events** in which a Mini issue was chosen
instead. An age-eligible `Big` issue is treated as equal priority to any
ready `Mini` issue at the next slot opening and must be assigned unless a
concrete blocking dependency or explicit urgency justification prevents it.

Record the slot-opening count for each queued `Big` issue in the coordinator
status notes. Reset the count when the issue is assigned. If two `Big` issues
are both age-eligible at the same slot opening, prefer the one with the
higher issue number (older creation date) first.

### Exceptions and visibility

An age-eligible `Big` issue is passed over only when:

- It has an unresolved dependency on another open issue or PR.
- The user has explicitly deprioritized it.
- A concrete urgency or time constraint makes a different issue the right
  next pick — state the reason in the status update.

Blocked or paused issues do not consume execution capacity and are kept
visible in the queue without occupying a numbered slot. They remain eligible
once their blocker clears.

**Example walkthrough:** Suppose four Mini issues and one Big issue are
queued, and slots open one at a time. Mini issues are assigned at openings 1,
2, and 3; the Big issue's age count reaches 3. At opening 4, the Big issue is
age-eligible and treated as equal to any ready Mini. If a Mini is chosen
again, record the reason; the Big issue remains age-eligible and is assigned
at the next available opening unless a concrete exception applies.

## Continuing work while blocked

When a blocker prevents a dependent action, the agent pauses **only that
dependent action** — not the entire assignment. It identifies and continues
any authorized work that does not depend on the blocked step, and reports the
blocker to the coordinator promptly.

### Blocker report requirements

A blocker report must include:

- The specific action that is blocked and why (with evidence: error text,
  missing dependency, ambiguous acceptance criterion).
- What was already attempted to resolve it, if anything.
- A concrete recommendation or proposed resolution.
- The independent work that can continue while awaiting direction.

The coordinator resolves blockers by providing a decision, delegating
access/dependency resolution, or escalating to the user. Agents do not
silently stall, expand scope, start competing branches, or contact the user
directly about coordination.

### Escalation path

The escalation order is:

1. Agent reports to the coordinator with evidence and a recommendation.
2. Coordinator resolves the blocker (decision, access fix, or delegation) or
   escalates to the user when the blocker exceeds coordinator authority.
3. User provides authorization or a product decision.
4. Coordinator relays the decision to the agent.

An agent that cannot reach the coordinator through the normal messaging tool
says so explicitly in its own task chat and includes the full intended handoff
message so the coordinator can act on it when available.

## Handoff acknowledgment and delivery

A message sent is not a message received. Handoffs for assignment,
merge-readiness, and blockers require explicit acknowledgment before the
sender can consider them delivered.

### What counts as delivery

A coordinator-to-agent message is delivered when the agent replies with the
matching handoff (for example, `preflight complete` for an `assignment`).

An agent-to-coordinator message is delivered when the coordinator replies
with an acknowledgment referencing the same issue and state (for example, a
`decision` or `changes requested` reply to a `merge request`).

An answer posted in an agent's own task chat, a PR comment, or a chat title
update is **not** a coordinator handoff. The two-line format sent through the
chat messaging tool to `Cordinator` is required.

### Retries and duplicate handling

If no acknowledgment arrives within a reasonable time (a monitor cycle or
the next natural check-in), the sender may resend the message once more,
prefixed with `[Retry]`. On a second failure, escalate: the agent reports the
messaging failure in its task chat; the coordinator escalates to the user.

If a duplicate message is received (same issue, same state, same content),
acknowledge it once and discard the duplicate; do not create a second
assignment or second merge action.

### Unavailable messaging

When the chat messaging tool is not available:

- The agent includes the intended handoff verbatim in its task chat final
  answer, clearly labeled "Intended coordinator handoff."
- The agent does not claim the coordinator was notified.
- The coordinator, when it next reads the agent's chat, treats the labeled
  handoff as the trigger for the appropriate response.

## Integration ownership and push freezes

### Coordinator integration authority

The coordinator is accountable for getting merge conflicts resolved and
verifying the result. It delegates conflict resolution to an agent in the PR
branch or a dedicated integration branch, provides the preserved intent of
both sides, and verifies the final commit before allowing the PR to proceed.
The coordinator does not directly edit agent branches except through a
declared integration delegation.

After an integration agent pushes the resolved head, the coordinator must
confirm that required checks pass on that new head and that reviews are still
satisfied (or re-requested) before merging. Coordinator integration edits
trigger the same re-check and review requirements as any other head change.

### Push freezes

A push freeze applies to a single named branch and a single named integration
pass. It is never broader than that.

**Initiating a freeze:** The coordinator sends the affected agent a `decision`
message naming the branch, the frozen head SHA, the reason (active
integration pass), and the expected duration. The agent acknowledges the
freeze before the coordinator begins integration work.

**During a freeze:** The frozen agent may continue implementation on the same
branch as long as it does not push to `origin`. It may also sync its own
branch from `origin/master` by rebasing or merging the default branch into
its own branch, but it must not push the result until the freeze is lifted.
It may not alter another agent's worktree or branch.

**Lifting a freeze:** The coordinator sends a `decision` message naming the
integration result (commit SHA) and the lifted freeze. The agent may then
push accumulated local commits.

**Interrupted freeze:** If the integration pass fails or the coordinator
cancels it, the coordinator lifts the freeze, states the reason, and provides
the current default-branch SHA so the affected agent can sync cleanly.

### File overlap is not a blocker

Agents work concurrently on the same files in isolated branches. A likely
merge conflict is noted for integration planning and merge ordering; it does
not delay or block an assignment. The coordinator manages sequencing at merge
time, not at assignment time.

After a pass merges, the coordinator tells all affected active agents the
resulting `master` SHA and identifies branches that need updating. Agents
then sync their own branches from that checkpoint and report the refreshed
head when ready.

## Task completion and non-merge paths

Not every task ends with a PR merge. The coordinator uses explicit terminal
states to close out assignments correctly.

### Terminal states

| State                  | When to use                                                               | PR / branch                                                          | Issue                                                  | Slot                           |
| ---------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| **Merged**             | PR merged into master through the protected path.                         | Closed by merge.                                                     | Close with the PR closing reference.                   | Release.                       |
| **Canceled**           | User or coordinator explicitly cancels the assignment.                    | Close the PR; retain branch unless explicitly instructed to delete.  | Leave open or close per the user's instruction.        | Release after preserving work. |
| **Superseded**         | Another PR or change already delivers the same outcome.                   | Close the PR with a note naming the superseding work; retain branch. | Close with a note linking the superseding issue/PR.    | Release.                       |
| **Duplicate**          | The issue is a duplicate of an existing tracked issue.                    | Close the PR if one was opened; retain branch.                       | Close as duplicate with a link to the canonical issue. | Release.                       |
| **Investigation only** | The task was scoped to research or analysis with no code change required. | No PR needed; push any reference notes to a branch if useful.        | Close when the investigation outcome is documented.    | Release.                       |

### Branch retention

By default, retain AI branches after PR closure or cancellation — do not
delete them. This is a recommendation, not a confirmed policy: if the user
explicitly authorizes deletion for a specific branch or class of branch,
follow that instruction for those branches only. Never infer deletion
authorization from a general cleanup request or from closing the PR.

### Stop-work and slot release

Stop-work, PR closure, branch retention or deletion, and slot release are
separate actions:

1. **Stop work** first: the agent commits any in-progress changes and stops
   pushing new commits to the branch.
2. **Close the PR** (if one exists) with an appropriate note.
3. **Retain the branch** unless explicitly authorized to delete it.
4. **Release the slot** only after steps 1–3 are confirmed and preserved work
   is not at risk.

Preserve all work that belongs to other tasks. Never delete branches, commits,
or worktrees owned by a different assignment, even during a cancellation.

## Post-merge incident response

### Detection

A post-merge regression is detected when any of these occur after a PR merges
into `master`:

- A required CI check fails on the new `master` head.
- An agent or the user reports broken behavior reproducible from that head.
- A subsequent PR that depends on the merged work fails checks for a reason
  traceable to the merge.

### Triage

When a potential regression is detected, the coordinator:

1. Identifies the merge commit and verifies that `master` is at the expected
   SHA.
2. Determines whether the failure is caused by the merged change or is a
   pre-existing or unrelated failure (check baseline from before the merge).
3. If caused by the merge: pauses the merge queue — no further PRs merge
   until the incident is resolved or explicitly overridden by the user.

### Revert authorization

The coordinator may delegate a revert PR to an agent under these conditions:

- The regression is confirmed and attributable to a specific merge commit.
- Reverting does not create a data-loss or state-corruption risk (for
  example, a migration that has already been applied to data outside the
  repository).
- The revert PR will go through the full protected path (required checks,
  branch protection, reviews if required) — a revert does not bypass
  protection.
- The user has not explicitly directed a different recovery path.

If any of these conditions is not met, the coordinator escalates to the user
before acting. Standing merge authorization does not authorize unbounded
destructive recovery.

### Communication

When a regression is confirmed and the queue is paused, the coordinator
notifies the user in one message stating:

- The merge commit and PR that introduced the regression.
- The observed failure (check name or described behavior) and evidence.
- The proposed recovery action (revert or targeted fix) and who owns it.
- The queue pause status and which PRs are affected.

Affected agent owners are told to pause pushes until the incident is
resolved and the queue is released.

### Follow-up and queue resumption

After the revert or fix merges:

1. The coordinator records the resulting `master` SHA and verifies the
   required checks pass on that head.
2. Dependent queued PRs that were rebased on the regressed `master` are
   flagged for a sync to the new checkpoint.
3. Affected agents are told the new `master` SHA and asked to sync and
   re-run required checks before the next merge pass.
4. The merge queue resumes with the updated state.

**Example walkthrough:** PR #200 merges. CI then reports a failing simulation
test on `master`. The coordinator verifies the failure is new (baseline before
#200 was green), pauses the queue, and notifies the user. The coordinator
delegates a revert PR (#201) to Agent 2, which goes through required checks
and protection normally. After #201 merges, the coordinator records the new
`master` SHA, tells all agents to sync, and resumes the queue starting with
the next ready PR.

## Workflow checklists

Step-by-step references for recurring coordinator and agent operations. Run
each step in order; do not skip a step because an earlier run seemed fine.
Policy details for each step are in the sections above.

---

### Checklist: assigning a new task (coordinator)

**Before creating or reusing an issue:**

- [ ] Confirm the request calls for repository work, not just an answer.
- [ ] Search open issues for an existing match; reuse it if the scope fits.
- [ ] If no match: create an issue with scope, acceptance criteria, and
      out-of-scope items. Apply exactly one size label (`Mini` or `Big`).

**Before picking a slot:**

- [ ] Count active agents (must be ≤ 8 before assigning).
- [ ] Check the age count on queued `Big` issues; if any are age-eligible
      (≥ 3 consecutive Mini picks), treat them as equal priority to ready Minis.
- [ ] Pick the free slot with the lowest number (Agent 1 reserved for
      instruction maintenance; Agent 2 reserved for integration).
- [ ] Choose a model appropriate for the size: lighter model for `Mini`,
      capable model for `Big` or high-uncertainty work.

**Before sending the assignment:**

- [ ] Scan open PRs, remote branches, local worktrees, and the current agent
      roster for duplicate ownership of this issue.
- [ ] Identify likely file overlaps with active branches (note for merge
      sequencing — do not use as a reason to delay).
- [ ] Confirm the issue's dependencies are resolved or note them explicitly.

**Send the assignment message:**

- [ ] Use the `[Coordinator] [#N task] [assignment]` format.
- [ ] Include: scope, acceptance criteria, out-of-scope items, issue URL,
      dependency/ownership scan result, required checks, and the instruction to
      complete preflight in an isolated `ai/` branch.

**After sending:**

- [ ] Update the agent chat title to `Agent N (Mini/Big) · Working · <task>`.
- [ ] Wait for the agent's `preflight complete` message before marking the
      assignment delivered.
- [ ] If no `preflight complete` arrives after one monitor cycle, retry once
      (`[Retry]` prefix); escalate to the user if the second attempt also fails.
- [ ] Increment the age count for every queued `Big` issue that was passed
      over in this slot opening.

---

### Checklist: agent preflight (agent)

- [ ] Confirm the assigned issue is open; read its scope, acceptance criteria,
      and exclusions in full.
- [ ] `git fetch origin master && git rev-parse origin/master` — record the
      exact SHA.
- [ ] Read `AGENTS.md` and `AGENTS.project.md` for required checks and
      project rules.
- [ ] Scan open PRs, remote branches, and local worktrees for duplicate
      ownership of this issue or likely file conflicts.
- [ ] Identify all required checks from CI workflow, branch protection, and
      `AGENTS.project.md`.
- [ ] Create an isolated worktree:
      `git worktree add <path> -b ai/<description> origin/master`.
- [ ] Send `preflight complete` to the coordinator with: confirmed scope, base
      SHA, ownership/conflict scan findings, branch name, worktree path, and
      required checks list.
- [ ] Update the chat title to `Agent N (Mini/Big) · Working · <task>` if
      possible.

---

### Checklist: reporting a blocker (agent)

- [ ] Identify the exact action that is blocked (not the whole task).
- [ ] Collect evidence: error text, missing dependency, ambiguous criterion.
- [ ] Attempt a fix if one is safe and within scope; note what was tried.
- [ ] Identify all independent work that can continue while waiting.
- [ ] Update the chat title to `Agent N (Mini/Big) · Blocked · <task>`.
- [ ] Send a `blocked` message to the coordinator with: blocked action,
      evidence, what was attempted, recommendation, and the independent work
      available.
- [ ] Continue the independent work immediately; do not wait passively.
- [ ] Do not expand scope, start competing branches, or contact the user
      directly about coordination.

**Coordinator response:**

- [ ] Acknowledge the `blocked` message with a `decision` or escalation reply.
- [ ] If resolvable: provide the decision or delegate access/dependency fix.
- [ ] If not resolvable without user input: escalate to the user; relay the
      decision back to the agent once received.
- [ ] Update the agent chat title to `Blocked` if not already done.
- [ ] Once the blocker clears: send a `decision` message and restore the
      agent's title to `Working`.

---

### Checklist: merge pass (coordinator)

**Before each merge in the pass:**

- [ ] Refresh the PR's exact head SHA — do not rely on a previous status
      report.
- [ ] Verify required CI checks have all passed on that exact head (not on an
      earlier commit).
- [ ] Verify required reviews are satisfied and there is no blocking feedback
      or unresolved conversation.
- [ ] Verify the branch meets the freshness rule (no protection-required
      rebase needed).
- [ ] Verify mergeability (no conflicts against current `master`).
- [ ] Confirm no new blocking review or push has arrived since the last check.

**Merge or delegate:**

- [ ] Merge directly, or send a `decision` message to the integration agent
      explicitly naming the PR number, the authorized head SHA, and the agent.
- [ ] Ask the affected agent to pause pushes to the branch during integration.

**After each merge:**

- [ ] Confirm the PR shows as merged; record the resulting `master` SHA.
- [ ] Send a `merged` confirmation with the resulting `master` SHA.
- [ ] Update affected agent chat titles.
- [ ] Close the associated issue (or confirm the closing reference is in the
      PR body).
- [ ] Tell all active agents the new `master` SHA and which of their branches
      need a sync.
- [ ] Refresh the next PR in the pass against the new `master` before
      deciding whether to continue the pass.

---

### Checklist: push freeze (coordinator)

**Initiating:**

- [ ] Name the exact branch to freeze and the frozen head SHA.
- [ ] Send a `decision` message to the owner with: branch name, frozen head
      SHA, reason, and expected duration.
- [ ] Wait for the agent's acknowledgment before beginning integration work.

**During the freeze:**

- [ ] The frozen agent may work locally but must not push to `origin` on the
      frozen branch.
- [ ] The frozen agent may sync its own branch from `origin/master` locally
      but must not push until the freeze lifts.
- [ ] No other agent touches the frozen branch or its worktree.

**Lifting:**

- [ ] Send a `decision` message with the integration result SHA and an
      explicit statement that the freeze is lifted.
- [ ] The agent may then push accumulated local commits.

**If the integration pass fails or is canceled:**

- [ ] Lift the freeze immediately.
- [ ] Provide the current `master` SHA so the agent can sync cleanly.
- [ ] Record why the pass was interrupted.

---

### Checklist: canceling or closing without merge (coordinator)

- [ ] Determine the terminal state:
      `Canceled` / `Superseded` / `Duplicate` / `Investigation only`.
- [ ] Tell the agent to stop pushing new commits and commit any in-progress
      changes locally.
- [ ] Wait for confirmation that the agent has stopped work.
- [ ] Close the PR (if one exists) with an appropriate note naming the reason
      and, for Superseded/Duplicate, linking the canonical or superseding work.
- [ ] Retain the branch unless the user has explicitly authorized deletion for
      this branch.
- [ ] Update the issue:
  - Canceled: leave open or close per the user's instruction.
  - Superseded/Duplicate: close with a link to the canonical/superseding item.
  - Investigation only: close when the investigation outcome is documented.
- [ ] Release the agent's numbered slot only after the above steps are
      confirmed.
- [ ] Archive the agent's chat (Canceled/Superseded/Duplicate) or leave it
      open for follow-up (Investigation only where the outcome is not yet
      documented).
- [ ] Assign a suitable queued issue to the released slot if one is ready.

---

### Checklist: post-merge incident response (coordinator)

**Detection and triage:**

- [ ] Record the `master` SHA at which the failure was first observed.
- [ ] Identify the most recent merge commit and the PR that introduced it.
- [ ] Check the baseline: were the same checks passing on `master` before
      that merge?
- [ ] If the failure pre-dates the merge: treat as a pre-existing failure;
      do not pause the queue.
- [ ] If caused by the merge: pause the merge queue immediately.

**Communication:**

- [ ] Notify the user with: the merge commit/PR, the observed failure and
      evidence, the proposed recovery action (revert or targeted fix), the owner,
      and which queued PRs are affected by the pause.
- [ ] Tell all affected agents to pause pushes until the incident is resolved.

**Revert or fix — before delegating:**

- [ ] Confirm the regression is attributable to a specific merge commit.
- [ ] Confirm reverting does not create data-loss or state-corruption risk.
- [ ] Confirm the user has not directed a different recovery path.
- [ ] If any condition above is not met: escalate to the user before acting.

**Delegating the revert PR:**

- [ ] Assign a revert PR to Agent 2 (integration slot) or the next available
      slot.
- [ ] Require the revert to go through the full protected path (required
      checks, branch protection, reviews if required).

**After the revert or fix merges:**

- [ ] Record the resulting `master` SHA; verify required checks pass on it.
- [ ] Identify queued PRs that were based on the regressed `master` and flag
      them for a sync.
- [ ] Tell all active agents the new `master` SHA; ask them to sync and
      re-run required checks.
- [ ] Resume the merge queue starting from the updated state.
- [ ] Release the queue-pause status explicitly in a user-facing update.
