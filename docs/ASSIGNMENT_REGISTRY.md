# Durable assignment registry

The coordinator keeps one durable record per assignment, including every
unfinished PR. Chat titles are presentation, not storage. This contract
implements #108; the execution-capacity policy is owned by #107 and the
startup workflow by #106. Their merge status must be checked separately;
the presence of this document does not complete those dependencies.

The coordinator has decided to retain a distinct chat per assignment. At
most eight reusable numbered execution slots may be leased concurrently;
retained chats and pending PRs are not limited to eight. Parking work removes
the number from its title but preserves its assignment, owner, chat, branch,
worktree, PR, and follow-up. A former agent number is provenance, not an owner
identity or a current capacity claim.

## Storage and ownership

The store is `coordinator/registry.json` inside the absolute Git common
directory returned by `git rev-parse --path-format=absolute --git-common-dir`.
Every worktree of the same clone uses this one file. It is outside tracked
files and persists across process/chat restart, branch switches, and task
worktree removal. It does not survive deletion of the owning clone or disk;
back up the file privately with the clone metadata. Separate clones/hosts
must use one designated coordinator store, not independently dispatch from
copies. Cross-host replication is not implemented.

Only the coordinator writes the store. Agents send observations and proposed
updates through authorized coordinator handoffs. This is a workflow ownership
rule, not authentication: filesystem access remains controlled by the host.
The store is created with mode `0600`, its directory with `0700`. Never store
tokens, environment dumps, credential-bearing URLs, chat transcripts, raw
API responses, or secret file contents. Issue and PR numbers are scoped to
the repository slug. Free-text blocker/next-action fields must be sanitized;
the validator rejects unknown fields but cannot detect every secret in prose.

`tools/assignment-registry.mjs` provides `init`, `show`, and whole-document
`update` commands, plus importable validation/storage helpers. From any
worktree, with Node 24+:

```sh
# First discover and verify the coordinator's actual chat/host IDs.
node tools/assignment-registry.mjs init OrbiterToad/td-racing CHAT_ID HOST_ID
node tools/assignment-registry.mjs show
# Prepare a private candidate copy; pass the revision you originally read.
node tools/assignment-registry.mjs update /private/path/candidate.json 0
```

Do not run `init` during every startup. Missing storage requires reconstruction
from live sources and a duplicate-ownership scan before dispatch; initialization
does not prove no assignments exist. `init` refuses to replace an existing
store. Keep candidate copies private and outside the checkout.

Each update acquires an exclusive `.lock` file, checks the expected revision,
validates the complete document, writes and syncs a temporary file beside the
store, atomically renames it, and syncs the directory. Successful writes
increment `revision` and stamp `updatedAt`; changed/new assignments get new
timestamps. Stale writers must read and reconcile again, never force a write.
Assignment IDs, issue bindings, and creation timestamps cannot be repurposed;
old records cannot be deleted. Ownership transfer updates the same record,
with a coordinator decision recorded in its chat before resumption.

A crash may leave a `.lock` or `.tmp` file. Do not steal a lock based only on
age. The coordinator verifies that no writer remains, preserves the files for
diagnosis, reads the last valid registry, and only then removes the orphan
lock and retries with its current revision. A failure after rename may already
have committed: read back before retrying. Corrupt JSON, unsupported schema,
and unreadable storage stop updates and dispatch; preserve the bytes and
restore a verified private backup or reconstruct explicitly. Never interpret
an error as an empty roster. Atomic durability assumes a local filesystem
supporting rename/fsync; shared/network filesystems require separate validation.

## Version 1 records

The root contains `schemaVersion: 1`, a monotonic `revision`, repository slug,
`coordinator: {chatId, hostId}`, UTC ISO `updatedAt`, and `assignments`.
Unknown keys or versions fail closed. Changes to the format require an
explicit versioned migration and preserved backup, not silent coercion.

| Assignment field         | Meaning                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignmentId`           | Immutable opaque ID allocated once (prefer a UUID); never a slot number. A new attempt gets a new ID; resumed PR work keeps its ID.                                                          |
| `issue`                  | Positive GitHub issue number within the root repository.                                                                                                                                     |
| `owner`                  | Stable accountable worker identity, independent of current slot/title. Remains assigned while its PR waits.                                                                                  |
| `chat`                   | `{chatId, hostId}` for this assignment's distinct chat; `null` only before creation or during explicit recovery.                                                                             |
| `executionSlot`          | Exclusive lease `1`–`8`, or `null`. Agent 1 remains reserved for instruction maintenance as an owner, not a permanent lease; idle reservation consumes no execution capacity.                |
| `executionState`         | `running`, `stopped`, or `unknown`; distinct from assignment/PR state. Running requires a lease; stopped requires `null`. Unknown retains a prior lease until execution is verified stopped. |
| `branch`, `worktree`     | Branch name and absolute path, or `null` until created. Preserve historical paths when resources disappear.                                                                                  |
| `pr`                     | Positive PR number, or `null` before opening. One record per assignment/PR; follow-up assignments use new IDs.                                                                               |
| `state`                  | Assignment lifecycle from the transition table below; not a message-header state or chat title.                                                                                              |
| `blocker`                | Sanitized reason or `null`; required for `blocked`. Unavailability must identify the affected source.                                                                                        |
| `nextAction`             | Concrete action and accountable actor; required even when waiting.                                                                                                                           |
| `createdAt`, `updatedAt` | UTC ISO timestamps written by the store; creation is immutable.                                                                                                                              |
| `verified`               | Separate `github`, `chat`, and `worktree` observations, each shaped as below.                                                                                                                |

Each observation has exactly `status`, `checkedAt`, `head`, and `base`.
Status is `unknown` (not observed), `verified` (successful observation),
`unavailable` (query failed), or `missing` (successful complete lookup found
no matching resource). `checkedAt` is the actual observation time, not merely
the time a message arrived; it is `null` only when unknown. `head` and `base`
are full 40-character Git SHAs, or `null` when inapplicable/unverified. For
GitHub they record PR head/current default-branch SHA; for worktrees they
record local HEAD/fetched default-branch SHA; chat observations use null SHAs.
After a failed query, preserve previous SHAs as historical context but change
status to `unavailable`. A past SHA with non-verified status proves nothing.

## Lifecycle and capacity

| From                     | Allowed next states                                        | Required evidence/action                                                                                                            |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `assigned`               | `working`, `blocked`, `cancelled`                          | Record ownership before dispatch; verify issue and preflight.                                                                       |
| `working`                | `waiting`, `blocked`, `cancelled`                          | Commit/push work and name the next actor before parking.                                                                            |
| `waiting`                | `working`, `blocked`, `merge-ready`, `merged`, `cancelled` | Resume only after capacity acquisition; readiness requires exact-head checks and review gates; merged requires GitHub confirmation. |
| `blocked`                | `assigned`, `working`, `waiting`, `cancelled`              | Record the resolving decision and clear/update blocker.                                                                             |
| `merge-ready`            | `waiting`, `working`, `blocked`, `merged`, `cancelled`     | Invalidate on new head/base/check/review information; no merge authority is conferred.                                              |
| `merged`                 | `completed`                                                | Confirm merge revision and required follow-up.                                                                                      |
| `completed`, `cancelled` | none                                                       | Retain historical record; new scope needs a new assignment. Cancellation requires explicit disposition of any open PR.              |

The tool validates shapes, lease uniqueness/range, and allowed transitions.
The coordinator verifies transition evidence; the tool does not authenticate
GitHub facts, enforce the reserved owner's scope, send messages, or merge. Creating a
reconstructed record in an advanced state requires live evidence, not an
assumption that omitted intermediate events happened.

Acquire an available slot and persist the lease before dispatch/resumption;
release it only after verifying execution stopped. If delivery fails, record
the failure and reconcile before retrying. Waiting for CI/review consumes no
execution capacity, but unfinished PRs retain owner and next action. An
unknown prior execution lease is conservatively occupied until checked. If
live execution is found without a lease, stop new dispatch, reconcile the
missing lease/conflict, and report it; never silently count that work as idle.
Resumed fixes need a slot even when the same assignment previously held one.

## Coordinator identity and discovery

Persist the coordinator's stable `{chatId, hostId}` after discovery in this
project's chat inventory. Address subsequent authorized handoffs by that ID,
even if its title changes. The title `Cordinator` is only a discovery fallback.
The `discoverCoordinator` helper takes a complete, project-scoped inventory:

1. Read the stored ID directly and verify host/project identity. A verified
   match wins over any title matches.
2. If that ID is absent after a successful complete lookup, enumerate the
   project's chats (including relevant history/archived inventory). Exactly
   one exact-title `Cordinator` match is a **candidate**, not an automatic
   replacement. Verify its coordinator role/authorized succession, then
   explicitly update the binding. Do not send sensitive task context to an
   unverified title match.
3. Zero matches means `missing`; multiple means `ambiguous`. An unavailable
   host, permission failure, partial/paginated inventory, or failing tool
   means `unavailable`, never absence. Preserve the binding and retry or
   escalate through an already authorized route. No new assignment/merge
   is authorized by fallback failure.

If direct messaging is unavailable, keep the handoff pending and report the
intended handoff in the task chat; never claim it was delivered. A title,
summary, or registry record cannot supply messaging authority.

## Reconciliation on startup and before consequential actions

Reconciliation is a coordinator workflow, not a background service. Read the
store before dispatch; refresh live evidence before assignment, lease reuse,
resume, merge decision, and completion. No fixed age makes cached readiness
safe: changes in head/base or reviews invalidate it immediately.

1. Verify coordinator binding and exclusive update ownership. Load all
   unfinished records, not just numbered/active chats. Unknown or unavailable
   evidence holds dependent actions while independent work may continue.
2. Query GitHub issue state, linked/open PRs, branch tips, PR head, current
   default-branch SHA, checks, reviews, conversation resolution, and merge
   state. GitHub wins over chat/registry claims about issue/PR/check/merge
   status. A closed issue alone does not prove a PR merged. A closed unmerged
   PR requires explicit cancellation/replacement disposition.
3. Query live chat IDs/status and assignment messages, registered worktrees,
   local HEAD, branch, dirty state, and fetched remote refs. Titles and lack
   of recent messages do not prove execution stopped. Missing chats/worktrees
   do not release ownership, discard commits, or authorize recreation.
4. Compare each assignment against those sources and scan for unrecorded
   PRs/branches/worktrees/owners. Duplicate issue ownership, lease collisions,
   wrong repository, or conflicting chat ownership block dispatch for the
   affected work; ask the coordinator to reconcile, preserving every record.
5. Record each source's observation timestamp/status and verified SHAs. If a
   ready PR's head or default branch changed, move `merge-ready` to `waiting`,
   clear readiness claims in the handoff, and require checks/review on the
   new head plus freshness verification. A failed source marks uncertainty;
   it does not overwrite a prior merge fact with an invented open state.
6. Confirm stopped execution before releasing leases; reacquire capacity
   before asking a parked owner to fix CI, conflicts, or feedback. Verify
   merged state directly before `merged`, then complete required follow-up
   before `completed`. Persist the reconciled snapshot with the expected
   revision, then send the appropriate authorized handoff.

The registry is an index of ownership and last observations, not a replacement
for GitHub branch protection or the existing exact-SHA merge handoff. Keep
the full check/review evidence in the linked PR and coordinator handoff.

## Verification and recovery walkthroughs

`node --test tests/assignment-registry.test.mjs` exercises actual disk I/O and
a fresh Node process. It verifies two waiting PRs survive restart alongside
one executing assignment; twelve retained assignments coexist with eight
leases; duplicate/ninth leases fail; all worktrees resolve the same store;
stale/concurrent writes, corruption, orphan locks, identity erasure, unknown
fields, and coordinator-title ambiguity fail safely.

These live-source scenarios require a coordinator walkthrough (not claimed
as automated integration tests):

- **Restart:** read two waiting records A/B and one executing C. Re-query all
  three; retain A/B ownership without leases. Verify C's execution before
  changing its lease. Do not infer capacity from the number of chats.
- **Stale readiness:** saved ready head H1/base B1; GitHub returns H2/B2.
  Persist `waiting`, current observations, and the owner's retest action.
  Previous green checks are not evidence for H2. No merge is performed.
- **Partial outage:** GitHub is reachable but the chat host is unavailable.
  Update GitHub facts, mark chat unavailable, preserve unknown occupied
  leases and ownership. Retry discovery; do not create duplicate chats.
- **Lost registry:** preserve any damaged bytes, enumerate live PRs/chats/
  branches/worktrees, reconstruct each owner with evidence, resolve conflicts,
  then initialize a verified snapshot. Empty storage never proves free slots.
- **Coordinator rename/replacement:** a rename retains the stable binding.
  A missing ID with one title match requires verified succession; ambiguity
  or unavailable inventory leaves the original binding intact.
