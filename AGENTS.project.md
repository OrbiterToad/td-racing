# Project-specific agent rules (td-racing)

`AGENTS.md` and `CORDINATOR_AGENT.md` are synced from the shared
[agent-coordinator template](https://github.com/OrbiterToad/agent-coordinator-template)
and must not be edited here — change the template, then let the sync carry it
over (see "Staying in sync with the template" below). This file holds
everything specific to td-racing and wins where it is more specific than
`AGENTS.md`.

## Repository facts

- Default branch: `master`. It is protected; merge only through a pull
  request after all required checks pass.
- Coordinator chat title: `Cordinator` (spelled as-is).
- Public coordination policies live in
  [docs/COORDINATOR_GUIDE.md](docs/COORDINATOR_GUIDE.md), including state
  meanings and copyable message templates.
- Node.js 24 or newer. Install dependencies with `npm ci`.

## Required checks

Branch protection requires these CI contexts, all defined in
[.github/workflows/ci.yml](.github/workflows/ci.yml):

| Check                   | Local command                           |
| ----------------------- | --------------------------------------- |
| Formatting              | `npm run format:check`                  |
| Lint                    | `npm run lint`                          |
| Simulation tests        | `npm test`                              |
| Dependency audit        | `npm audit --audit-level=high`          |
| Build and browser tests | `npm run build && npm run test:browser` |

`npm run check` runs all of them in order.

## Push and validation policy

The fast checks are `npm run format:check`, `npm run lint`, `npm test` and
`npm run build`. You may push after those plus the Playwright specs that
target your change, and let CI run the full browser suite on the pushed head.
Do not request a merge until every required CI check has passed on the final
head.

For browser tests, pick a free port with `PLAYWRIGHT_PORT` (default `4173`),
keep the same command session, and poll it to completion. Never stop a
preview server owned by another worktree.

Merge readiness is bound to an exact commit SHA. If the branch is rebased,
amended, or otherwise updated after a merge request is submitted, that
request's tested head is stale. Re-run the required checks on the new head
and send a new merge request with the updated SHA; a prior passing status does
not carry forward to a different head.

## Staying in sync with the template

- `.agent-template.json` lists the synced files and the template ref.
- `npm run sync:agents` writes the template's current files into this
  repository; `npm run sync:agents:check` reports drift and exits non-zero.
- [.github/workflows/sync-agent-instructions.yml](.github/workflows/sync-agent-instructions.yml)
  runs the drift check weekly and on `workflow_dispatch`, and opens or
  updates a pull request on branch `ai/sync-agent-instructions` when the
  files differ.
- The workflow needs the repository secret `AGENT_TEMPLATE_TOKEN`: a token
  that can read the private template repository and open pull requests here.
  The workflow's default `GITHUB_TOKEN` cannot read another private
  repository. No token value belongs in this repository; keep local
  `GITHUB_TOKEN` files ignored by Git.
