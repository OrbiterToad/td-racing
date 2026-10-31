# Coordinator guide: issue size labels

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
