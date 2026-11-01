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

## Coordinator handoffs

Send concise progress and handoff messages in the coordinator chat at these
points:

- A message in your own task chat, a final answer, or an updated chat title is
  not a coordinator handoff. Use the chat messaging tool to send the message
  directly to the coordinator chat titled `Cordinator`.

- After task preflight, report the issue, scope, base SHA, ownership/conflict
  scan, and required checks.
- Report blockers or ambiguity promptly, state what is blocked, and wait for
  coordinator direction before taking dependent action.
- When implementation is ready for merge review, say “I want to merge PR #X”
  and include its link, tested head SHA, current base SHA, required check and
  review state, and any freshness or conflict blocker. This is a request for
  the coordinator's merge decision; do not merge on your own unless explicitly
  delegated.
- If you cannot open or update a PR because GitHub access is unavailable, send
  the coordinator the pushed branch, exact head and base SHAs, local check
  results, and the access blocker. Do not rely on the coordinator finding the
  details in your task chat; the coordinator can open the PR if appropriate.
- After an explicitly authorized merge, say “I have merged PR #X” and include
  the resulting `master` SHA.
- After the task is complete, report completion and that you are ready for a
  new task. Keep the task open while its PR or required follow-up is pending.
