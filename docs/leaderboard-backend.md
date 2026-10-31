# Time trial leaderboard backend decision

Issue [#32](https://github.com/OrbiterToad/td-racing/issues/32) cannot be
implemented safely against the current production hosting setup without adding
a trusted backend.

## Current constraint

The game is built as static files in `dist/` and deployed to GitHub Pages by
`.github/workflows/ci.yml`. The workflow grants Pages deployment permissions
only to the deploy job on `master`; pull requests receive read-only repository
permissions. GitHub Pages does not run application code or provide a database,
request validation, rate limiting, or a private secret store to the game.

The browser therefore cannot safely write records to a shared store. A GitHub
token or database credential shipped in the page would be public, and a direct
client write would let callers choose arbitrary names, times, tracks, and cars.
There is no existing API service, serverless function host, or database
configuration in this repository.

## Smallest viable implementation path

Keep GitHub Pages for the game and add a separately deployed Cloudflare Worker
API with a D1 database. This adds one trusted request boundary without moving
the static game. Before implementation, the project owner needs to create the
Cloudflare Worker and D1 resources and configure their identifiers and any
Turnstile secret as encrypted deployment secrets; none are present in this
repository today.

The API should expose a read-only leaderboard query and an explicit record
submission endpoint. It should:

1. Accept only track and car IDs from the server-owned game catalog, and scope
   every query and stored record to both IDs.
2. Normalize and bound display names and reject malformed payloads, non-finite
   or out-of-range lap times, oversized requests, and unknown fields.
3. Require a one-use run ticket issued by the API and validate a completed,
   clean lap before storing a record. The browser currently owns the simulation,
   so receiving a lap duration alone cannot prove that a valid lap occurred.
   To make that proof meaningful, submission must include a compact run replay
   that the service checks against an authoritative, deterministic simulation
   (or an equivalent server-verifiable proof). A client-provided `valid` flag
   or signed duration computed by the client is not proof.
4. Apply edge rate limits and a bot challenge to submissions, limit submissions
   per run ticket, and escape names when rendering them. Keep the API credential
   and challenge secret exclusively in Worker secrets.
5. Return records ordered by lap time ascending, with a stable tie-breaker, for
   exactly the selected track-and-car pair.

The game can then add a display-name setting, an explicit submit action for a
finished eligible lap, and a pairing selector for the global records. All API
calls should be optional: show a clear unavailable/submission status and keep
local time trials playable if requests fail. The API can be developed and
tested locally with the Worker runtime before its URL is configured in the
static build.

## Decision

This repository change deliberately does not add client-side leaderboard writes
or present local records as global. Implementing those UI paths before a
verifiable service and storage layer exists would falsely imply that submissions
are validated and shared. The next implementation can start once the Worker,
D1 database, and deployment secrets are available, with API validation and
pairing tests as the first deliverable.
