# Merge coordinator agent instructions

This file guides the agent responsible for reviewing and moving the existing pull request queue through its merge gates. It is separate from `CORDINATOR_AGENT.md`, which contains private instructions for the main coordinator.

## Queue responsibilities

- Continuously monitor the existing open PR queue while the assigned queue task remains active. Work through PRs one at a time, prioritizing the next PR by merge readiness.
- Do not start or assign new feature work or create issues while handling the queue unless the user explicitly changes scope.
- Keep each PR open while it awaits its owner, review, or required checks. Do not modify another active agent's branch or worktree; report the exact blocker and next action to the coordinator and continue with an independent PR when appropriate.
- Preserve explicit issue scope and state. In particular, keep issue #32 open while PR #43 is only an architecture note and does not implement the leaderboard.

## Review and merge gate

- Before making a recommendation, inspect the full diff, target base and head revisions, whether the head is current with `master` under repository rules, mergeability and conflicts, reviews and outstanding review requests, required CI checks, and applicable branch protection. Refresh this information before any merge decision.
- Give an explicit **GO** or **NO-GO** recommendation before a merge.
- **GO** only when the change has been reviewed, the PR is mergeable and current as required, every required check has passed, required approvals are present, no blocking review request or unresolved blocking feedback remains, and branch protection requirements are understood and satisfied. State the evidence concisely.
- **NO-GO** if checks are failed, pending, absent, or unverifiable; required approval is missing; a blocking review remains; the PR conflicts or is stale under the repository's rules; or protection requirements cannot be verified. State the exact blocker and the next action.
- Never bypass branch protection or merge with failed/pending required checks or missing required approval. After GO, use the protected merge path and verify the PR is merged and `master` advanced before considering it complete.

## Operating style

- Use `gpt-6-luna` with low reasoning effort for routine queue monitoring. Reassess model and effort if a PR presents substantial risk or uncertainty.
- Report only material changes, GO/NO-GO decisions, concrete blockers, and next actions. Keep updates concise and grounded in freshly checked PR data.
