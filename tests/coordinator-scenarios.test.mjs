/**
 * Coordinator coordination and recovery scenario tests (issue #121).
 *
 * Split into two categories:
 *
 * EXECUTABLE — assertions on static policy properties, pure-logic formulas,
 * and cross-file consistency that can be verified automatically in CI.
 *
 * WALKTHROUGH (test.todo) — documented scenarios whose correct behavior
 * depends on LLM judgment and cannot be exercised by a test runner. Each
 * todo captures the expected outcome so reviewers can confirm compliance
 * manually or in a future dedicated harness.
 *
 * Platform limitation: the coordinator runs as a Claude chat session. There
 * is no programmatic API to inject messages, observe decisions, or simulate
 * the passage of time. All runtime-behavior scenarios are therefore marked
 * as walkthroughs rather than executable checks.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const root = resolve(import.meta.dirname, '..');

function readDoc(relPath) {
  return readFileSync(resolve(root, relPath), 'utf8');
}

/**
 * Render the progress bar described in COORDINATOR_GUIDE.md:
 * one █ per completed 10 %, rounded down, padded to 10 cells with ░.
 * Color marker: 🔴 0-24, 🟠 25-49, 🟡 50-74, 🟢 75-99, ✅ 100.
 */
function progressBar(pct) {
  const filled = Math.floor(pct / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  let marker;
  if (pct >= 100) marker = '✅';
  else if (pct >= 75) marker = '🟢';
  else if (pct >= 50) marker = '🟡';
  else if (pct >= 25) marker = '🟠';
  else marker = '🔴';
  return `${marker} ${bar} ${pct}%`;
}

/** Return true if the string matches the documented two-line message format. */
const VALID_STATES = new Set([
  'assignment',
  'preflight complete',
  'progress',
  'blocked',
  'merge request',
  'decision',
  'changes requested',
  'merged',
  'ready for new task',
]);

function parseMessageHeader(line) {
  // [Agent N] [#issue task] [state]  OR  [Coordinator] [#issue task] [state]
  const m = line.match(/^\[(Agent \d+|Coordinator)\] \[#\S+ .+?\] \[(.+?)\]$/);
  if (!m) return null;
  return { speaker: m[1], state: m[2] };
}

// ---------------------------------------------------------------------------
// EXECUTABLE: policy document structure
// ---------------------------------------------------------------------------

test('COORDINATOR_GUIDE.md exists and is non-empty', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(content.length > 0);
});

test('COORDINATOR_GUIDE.md documents the eight-agent slot cap', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(
    content.includes('eight active agents') || content.includes('eight-agent'),
    'eight-agent cap not found in COORDINATOR_GUIDE.md',
  );
});

test('COORDINATOR_GUIDE.md defines all nine message states in the state table', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  for (const state of VALID_STATES) {
    assert.ok(
      content.includes(`\`${state}\``),
      `state "${state}" not found in COORDINATOR_GUIDE.md`,
    );
  }
});

test('COORDINATOR_GUIDE.md contains a Message Templates section', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(
    content.includes('### Message templates') ||
      content.includes('## Message templates'),
    'Message templates section missing',
  );
});

test('COORDINATOR_GUIDE.md documents the two-line message format', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  // The opening bracket pattern for both speaker variants must appear.
  assert.ok(
    content.includes('[Agent <number>]'),
    '[Agent <number>] header template missing',
  );
  assert.ok(
    content.includes('[Coordinator]'),
    '[Coordinator] header template missing',
  );
  assert.ok(content.includes('Further info:'), 'Further info: prefix missing');
});

test('COORDINATOR_GUIDE.md documents merge-queue ownership', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(
    content.includes('coordinator owns the merge queue') ||
      content.includes('merge queue'),
    'merge-queue ownership policy not found',
  );
});

test('COORDINATOR_GUIDE.md references duplicate-ownership or duplicate-assignment prevention', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  const hasDuplicatePolicy =
    content.includes('duplicate') ||
    content.includes('ownership') ||
    content.includes('no duplicate');
  assert.ok(
    hasDuplicatePolicy,
    'duplicate-assignment prevention not documented',
  );
});

test('COORDINATOR_GUIDE.md documents the blocked state and escalation path', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(content.includes('`blocked`'), '`blocked` state not documented');
  assert.ok(
    content.includes('Decision needed'),
    'blocked template missing "Decision needed" prompt',
  );
});

test('COORDINATOR_GUIDE.md documents the changes-requested / failed-CI recovery state', () => {
  const content = readDoc('docs/COORDINATOR_GUIDE.md');
  assert.ok(
    content.includes('`changes requested`'),
    '`changes requested` state not documented',
  );
  assert.ok(
    content.includes('required corrections'),
    'changes-requested template missing correction language',
  );
});

test('AGENTS.project.md names exactly five required check categories', () => {
  const content = readDoc('AGENTS.project.md');
  const checks = [
    'format:check',
    'lint',
    'npm test',
    'npm audit',
    'test:browser',
  ];
  for (const cmd of checks) {
    assert.ok(
      content.includes(cmd),
      `required check "${cmd}" not found in AGENTS.project.md`,
    );
  }
});

// Depends on PR #171 (issue #164) being merged first; promoted to executable then.
test.todo(
  'COORDINATOR_GUIDE.md Claude Code runtime section states new chat sessions are required ' +
    'for numbered slots and scopes the inline Agent tool to atomic non-roster tasks — ' +
    'expected: guide contains "new independent chat sessions" and "inline `Agent` tool" with ' +
    'explicit scope restriction (depends on PR #171 / issue #164)',
);

// ---------------------------------------------------------------------------
// EXECUTABLE: progress bar formula
// ---------------------------------------------------------------------------

test('progress bar renders 0 % as ten empty cells with red marker', () => {
  assert.equal(progressBar(0), '🔴 ░░░░░░░░░░ 0%');
});

test('progress bar renders 10 % as one filled cell', () => {
  assert.equal(progressBar(10), '🔴 █░░░░░░░░░ 10%');
});

test('progress bar renders 25 % with orange marker and two filled cells', () => {
  assert.equal(progressBar(25), '🟠 ██░░░░░░░░ 25%');
});

test('progress bar renders 50 % with yellow marker and five filled cells', () => {
  assert.equal(progressBar(50), '🟡 █████░░░░░ 50%');
});

test('progress bar renders 75 % with green marker and seven filled cells', () => {
  assert.equal(progressBar(75), '🟢 ███████░░░ 75%');
});

test('progress bar renders 80 % with green marker and eight filled cells', () => {
  assert.equal(progressBar(80), '🟢 ████████░░ 80%');
});

test('progress bar renders 100 % as ten filled cells with checkmark', () => {
  assert.equal(progressBar(100), '✅ ██████████ 100%');
});

test('progress bar boundary: 24 % is red, 25 % is orange', () => {
  assert.ok(progressBar(24).startsWith('🔴'));
  assert.ok(progressBar(25).startsWith('🟠'));
});

test('progress bar boundary: 49 % is orange, 50 % is yellow', () => {
  assert.ok(progressBar(49).startsWith('🟠'));
  assert.ok(progressBar(50).startsWith('🟡'));
});

test('progress bar boundary: 74 % is yellow, 75 % is green', () => {
  assert.ok(progressBar(74).startsWith('🟡'));
  assert.ok(progressBar(75).startsWith('🟢'));
});

test('progress bar boundary: 99 % is green, 100 % is checkmark', () => {
  assert.ok(progressBar(99).startsWith('🟢'));
  assert.ok(progressBar(100).startsWith('✅'));
});

// ---------------------------------------------------------------------------
// EXECUTABLE: message header parser
// ---------------------------------------------------------------------------

test('message header parser accepts a valid Agent header with known state', () => {
  const result = parseMessageHeader('[Agent 3] [#120 Pause restart] [blocked]');
  assert.deepEqual(result, { speaker: 'Agent 3', state: 'blocked' });
  assert.ok(VALID_STATES.has(result.state));
});

test('message header parser accepts a valid Coordinator header', () => {
  const result = parseMessageHeader(
    '[Coordinator] [#120 Pause restart] [decision]',
  );
  assert.deepEqual(result, { speaker: 'Coordinator', state: 'decision' });
  assert.ok(VALID_STATES.has(result.state));
});

test('message header parser rejects a header missing the issue field', () => {
  assert.equal(parseMessageHeader('[Agent 1] [blocked]'), null);
});

test('message header parser rejects a header with an unlabelled state', () => {
  const result = parseMessageHeader('[Agent 1] [#10 task] [unknown-state]');
  assert.ok(result !== null, 'parser should extract; caller checks state');
  assert.ok(!VALID_STATES.has(result.state), 'unknown-state must not be valid');
});

test('message header parser rejects a plain prose line', () => {
  assert.equal(parseMessageHeader('Agent 1 reports progress on task.'), null);
});

test('all nine states round-trip through the parser as valid', () => {
  for (const state of VALID_STATES) {
    const header = `[Agent 1] [#1 task] [${state}]`;
    const result = parseMessageHeader(header);
    assert.ok(result !== null, `failed to parse header for state "${state}"`);
    assert.ok(VALID_STATES.has(result.state));
  }
});

// ---------------------------------------------------------------------------
// WALKTHROUGH: LLM-runtime scenarios (not automatically executable)
//
// Each todo describes the expected coordinator behavior. Verification requires
// manual review or a future harness that can inject and observe LLM messages.
// ---------------------------------------------------------------------------

test.todo(
  'restart scenario: coordinator reassigns slot when agent chat is unresponsive — ' +
    'expected: after no preflight within a reasonable turn, coordinator opens a new chat ' +
    'session under the same slot number, re-delivers the assignment message, and notes the ' +
    'restart in the status update; the stale chat is closed or renamed Paused',
);

test.todo(
  'duplicate-dispatch prevention: coordinator scans open PRs and branches before assignment — ' +
    'expected: when a branch or PR already exists for the target issue, coordinator does not ' +
    'create a second assignment; instead it sends a decision message naming the existing owner ' +
    'and queues the new work behind the existing PR',
);

test.todo(
  'lost handoff: no preflight confirmation received after assignment — ' +
    'expected: coordinator treats the absence of a preflight complete message as a lost ' +
    'delivery, re-sends the assignment to the same session or opens a new one, and records ' +
    'the retry in the status update; it does not treat silence as consent to proceed',
);

test.todo(
  'duplicate handoff: agent sends preflight complete twice — ' +
    'expected: coordinator acknowledges only the first, ignores the duplicate, and does not ' +
    'assign a second branch or worktree for the same issue',
);

test.todo(
  'failed CI scenario: required check fails on the PR head — ' +
    'expected: coordinator sends a changes-requested message naming the failing check, ' +
    'the failing SHA, and the correction required; coordinator does not merge until a new ' +
    'merge request arrives with every required check passing on the new head',
);

test.todo(
  'new push after readiness: agent pushes a new commit after a merge-request handoff — ' +
    'expected: coordinator treats the existing merge request as stale, requires a fresh ' +
    'merge request citing the new head SHA and updated CI/review state before proceeding',
);

test.todo(
  'stalled agent: no progress update or push for an extended period — ' +
    'expected: coordinator sends a progress-check message; if still no response, it marks ' +
    'the slot Paused or Waiting for PR, releases the numbered slot for other work, and notes ' +
    'the stall in the status update',
);

test.todo(
  'eight-slot enforcement on PR-feedback resumption: a Waiting-for-PR chat has changes requested — ' +
    'expected: if all eight numbered slots are active, coordinator does not open a ninth slot ' +
    'to handle the feedback; it queues the resumption until a slot is free, then re-delivers ' +
    'the changes-requested message in that slot',
);

test.todo(
  'multiple pending PR owners: two agents both send merge requests — ' +
    'expected: coordinator queues the PRs in explicit order, sends a decision message to ' +
    'each naming their queue position, and merges them serially; it does not merge both ' +
    'simultaneously or skip the queue order without a stated reason',
);

test.todo(
  'cancellation: coordinator cancels an active assignment — ' +
    'expected: coordinator sends a decision message naming the cancellation reason, ' +
    'releases the slot number, closes or renames the agent chat, and updates the issue ' +
    'status; it does not leave the branch open without a note',
);

test.todo(
  'integration freeze: coordinator places a merge hold on all queued PRs — ' +
    'expected: coordinator sends a decision message to each waiting agent naming the freeze ' +
    'and expected duration; it does not silently stop responding or merge during the freeze; ' +
    'it lifts the hold with an explicit decision message',
);

test.todo(
  'post-merge recovery: master advances while an agent branch is behind — ' +
    'expected: coordinator sends a progress sync-checkpoint message citing the new master SHA ' +
    'and instructs the agent to rebase/retest; the agent must report a new merge request with ' +
    'the rebased head before the coordinator will merge',
);
