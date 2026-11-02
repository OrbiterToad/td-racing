Commit every change you make locally and push your commits to `origin`.
Commit and push regular, incremental milestones during implementation rather
than accumulating the entire task in an uncommitted working tree. Each commit
should be a coherent, reviewable increment that is not knowingly broken and
does not include secrets or generated noise; keep using the required commit
message format and run relevant checks before handoff.
Keep the task open while its pull request is pending. Follow up on review and
required checks, and address failures. When the PR is ready, request merge
readiness in the coordinator chat with the PR link, head and base SHAs, and
required check and review state. The coordinator owns the merge queue and
performs merges unless the coordinator explicitly delegates a specific merge.
After an authorized merge, confirm it in the coordinator chat. Consider the
task complete only after the merge and report that you are ready for a new task.

Use the following commit message format:

`<type>(<scope>): <description>`

Example: `add(track): add jungle track`

Branches created by AI must use the format `ai/<description>`.

Example: `ai/add-jungle-track`

When working on a branch, use a temporary directory or Git worktree outside
the primary repository checkout. Do not switch the primary checkout to the
working branch; create and work in an isolated temporary checkout instead.

You may use an available GitHub token from the `GITHUB_TOKEN` or `GH_TOKEN`
environment variable, or the repository-root `GITHUB_TOKEN` file, for GitHub
operations needed to complete the task. Never print token values or include
them in logs, messages, or commits. Keep local token files ignored by Git.
Respect branch protection: use pull requests and merge only after all required
checks pass.

## Parallel work and integration

- Work in your own isolated branch or worktree. You may implement changes to
  files another agent is also changing on a separate branch; shared-file
  overlap alone is not a reason to stop or wait. Check existing assignments
  to avoid duplicating the same issue, and tell the coordinator about likely
  integration conflicts when you report progress.
- Do not edit another agent's branch or worktree, and do not merge or rebase
  another agent's changes. Keep your own changes scoped and commit/push
  reviewable milestones regularly.
- When your PR is ready, tell the coordinator “I want to merge PR #X” and
  provide the tested head and base SHAs, required check/review state, and any
  conflict notes. The coordinator owns merge ordering and conflict resolution.
  Pause pushes only when asked while your branch is being integrated.
- A shared-file conflict is handled during integration; it is not a reason to
  leave an assigned task idle. Escalate actual blockers such as missing
  requirements, unavailable dependencies, or failing checks that you cannot
  resolve, and state the next useful step you can take.

When implementation is complete but a PR remains in the merge queue, the
coordinator renames this task chat `Waiting for PR · <short task>` without an
agent number and reuse the numbered slot for a new assignment. A blocked task
may similarly become `Paused · <short task>`. Keep this chat, branch and PR
open for review, checks and follow-up until the assignment is complete; a
released slot does not mean the PR merged.

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
[the coordinator guide](docs/COORDINATOR_GUIDE.md#communication-standard).

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

## Coordinator handoffs

Send concise progress and handoff messages in the coordinator chat at these
points:

- Start every agent-to-coordinator message with
  `[Agent <number>] [#<issue> <short task>] [<current state>]`. Start every
  coordinator-to-agent message with
  `[Coordinator] [#<issue> <short task>] [<current state>]`. Use the current
  issue/task and a concise state such as `preflight complete`, `progress`,
  `blocked`, `merge request`, `merged`, or `ready for new task`.
- Put details on the next line, beginning exactly with `Further info:`. Keep
  any following lines as supporting detail for that same message.

- A message in your own task chat, a final answer, or an updated chat title is
  not a coordinator handoff. Use the chat messaging tool to send the message
  directly to the coordinator chat titled `Cordinator`.

- Report meaningful progress with evidence and the next action.
- After task preflight, report the issue, scope, base SHA, ownership/conflict
  scan, and required checks.
- Report blockers or ambiguity promptly, state what is blocked, and wait for
  coordinator direction before taking dependent action.
- When implementation is ready for merge review, use the `merge request`
  state and say “I want to merge PR #<number>” in the `Further info:` line.
  Include its link, tested head SHA, current base SHA, required check and
  review state, and any freshness or conflict blocker. This is a request for
  the coordinator's merge decision; do not merge on your own unless explicitly
  delegated. For example:

  ```text
  [Agent <number>] [#<issue> <short task>] [merge request]
  Further info: I want to merge PR #<number>. Head `<sha>`, base `<sha>`; checks: <results>; review: <state>; mergeability: <state>.
  ```

- If you cannot open or update a PR because GitHub access is unavailable, send
  the coordinator the pushed branch, exact head and base SHAs, local check
  results, and the access blocker. Do not rely on the coordinator finding the
  details in your task chat; the coordinator can open the PR if appropriate.
- After performing an explicitly authorized merge, say “I have merged PR #X” and include
  the resulting `master` SHA.
- After the task is complete, report completion and that you are ready for a
  new task. Keep the task open while its PR or required follow-up is pending.

Coordinator replies use the same two-line structure, with `[Coordinator]` in
the first field. For example:

```text
[Coordinator] [#<issue> <short task>] [progress]
Further info: PR #<number> merged; current default-branch SHA is `<sha>`. Resume the queued work from that base.
```
