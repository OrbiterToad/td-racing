---
name: github-api
description: Inspect GitHub issues, pull requests, checks, reviews, and branch rules, or perform authorized updates through GitHub CLI and API calls. Use for API workflows needing exact refs, pagination, or fields unavailable in higher-level tools.
---

# GitHub API

Use an available GitHub connector when it supports the requested operation.
Prefer `gh issue`, `gh pr`, and `gh run` for ordinary supported workflows;
use `gh api` for precise REST/GraphQL fields, pagination, or missing CLI
capabilities. Use direct HTTP only when neither is available. Do not install
plugins or change account permissions as part of using this skill.

Read [references/examples.md](references/examples.md) for executable read
examples and authorized update patterns. Verify endpoint details against the
linked official documentation when adapting examples.

## Authentication and scope

- Resolve the intended host and `OWNER/REPO` explicitly; do not rely on the
  current directory, especially in worktrees or cross-repository tasks.
- Reuse an authenticated connector or `gh` session. If necessary, use an
  existing `GH_TOKEN` or `GITHUB_TOKEN` through the process environment.
  A repository-root `GITHUB_TOKEN` file is usable only when repository/user
  instructions permit it and Git ignores it. Read it from the actual
  repository root; linked worktrees may not contain that file. Never track or
  copy it into a worktree.
- Never print, log, commit, paste, or put credentials in command arguments,
  URLs, examples, or reports. Avoid shell tracing, `gh auth token`, verbose
  HTTP/debug logging, and dumping environment variables or credential files.
  Supply credentials to direct HTTP through a secret-aware client, not a
  literal token in a shell command.
- If access is missing, report the endpoint, HTTP status, and needed access
  without exposing request headers or secrets. Do not broaden token scopes,
  change permissions, or attempt an authentication workaround unasked.

## Read accurately

1. Discover the remote default branch; fetch it and record its full SHA.
   Keep repository, branch names, PR numbers, head/base SHAs, and check
   timestamps together. URL-encode branch/ref path components containing
   `/` or other reserved characters, or use an immutable SHA where supported.
2. Follow every REST `Link` next page (`gh api --paginate`) or GraphQL
   `pageInfo.hasNextPage/endCursor`. A default page, search result limit, or
   first page of reviews is not a complete result. Paginate nested GraphQL
   connections separately when needed. If a page fails, treat the result as
   incomplete and report the last successful page and the failure.
3. Read PR checks and commit statuses for the exact head SHA. Also inspect
   reviews, draft state, mergeability, and the base branch's protection and
   applicable rulesets. A successful workflow is not proof that every
   required context or approval passed. Treat a null/pending mergeability
   result as unknown; refetch after a bounded wait.
4. Before a consequential update or merge-readiness report, refetch PR
   head/base, checks, reviews, and applicable rules. In strict protection,
   confirm base freshness as well. New commits invalidate earlier evidence;
   report what was tested locally separately from current CI state.

## Mutations and failures

- Read operations need no new approval. For writes, use the user's existing
  task authorization and repository/coordinator policy. Prepare concrete
  content first; ask only if the actual action lacks authorization. A skill
  invocation alone does not authorize comments, issue edits, PR creation,
  review submission, branch deletion, or merges.
- Limit a write to requested fields and the exact repository/object/ref.
  Use a JSON file or CLI `--body-file` for multiline text; do not interpolate
  untrusted issue text into shell code. Refetch first to preserve concurrent
  edits, then read back the result and record its URL/ID and new state.
- Never bypass protection, dismiss reviews, force-push protected branches,
  alter required checks, or use administrative merge flags. Merge only when
  explicitly authorized for the specific PR/head and all required checks
  and reviews pass. Follow coordinator ownership of merges.
- For 401, check authentication without revealing it. For 403, distinguish
  permission/rules denial from rate limiting using sanitized response
  metadata. For 404, verify host/repository/ref and access; it does not by
  itself prove an object or protection rule is absent. Inspect applicable
  rulesets too. For 409/422, refresh state and fix the conflict/validation
  error; do not blindly retry.
- For 429 or rate-limited 403, respect `Retry-After` or rate-limit reset;
  use bounded backoff for transient 5xx. Stop after a small bounded number
  of attempts and report the next useful action. After a write timeout,
  read back state before retrying to avoid duplicate comments or PRs.

## Distribution

The canonical skill lives in `agent-coordinator-template/skills/github-api/`.
The td-racing copy uses the same files without repository-specific rules;
read each target repository's agent instructions separately. Keep both copies
aligned when changing this skill. The agent-instruction sync manifest does
not automatically distribute this optional skill.
