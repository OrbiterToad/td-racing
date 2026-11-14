import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import {
  discoverCoordinator,
  readRegistry,
  registryPath,
  validateRegistry,
  writeRegistry,
} from '../tools/assignment-registry.mjs';

const epoch = '2026-01-01T00:00:00.000Z';

function assignment(index, executionSlot = null) {
  const unknown = {
    status: 'unknown',
    checkedAt: null,
    head: null,
    base: null,
  };
  return {
    assignmentId: `assignment-${index}`,
    issue: index,
    owner: 'worker-alex',
    chat: { chatId: `chat-${index}`, hostId: 'local' },
    executionSlot,
    executionState: executionSlot === null ? 'stopped' : 'running',
    branch: `ai/issue-${index}`,
    worktree: `/example/worktrees/issue-${index}`,
    pr: index + 100,
    state: executionSlot === null ? 'waiting' : 'working',
    blocker: null,
    nextAction: 'Coordinator to refresh GitHub state',
    createdAt: epoch,
    updatedAt: epoch,
    verified: {
      github: { ...unknown },
      chat: { ...unknown },
      worktree: { ...unknown },
    },
  };
}

function registry() {
  return {
    schemaVersion: 1,
    revision: 0,
    repository: 'example/racing',
    coordinator: { chatId: 'coordinator-original', hostId: 'local' },
    updatedAt: epoch,
    assignments: [assignment(1), assignment(2), assignment(3, 2)],
  };
}

async function storage(t) {
  const directory = await mkdtemp(join(tmpdir(), 'assignment-registry-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return join(directory, 'registry.json');
}

test('registry survives a fresh process with two pending PRs and one occupied slot', async (t) => {
  const path = await storage(t);
  const saved = await writeRegistry(path, registry(), null);
  const module = new URL('../tools/assignment-registry.mjs', import.meta.url)
    .href;
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { readRegistry } from ${JSON.stringify(module)};
     console.log(JSON.stringify(await readRegistry(process.argv[1])));`,
      path,
    ],
    { encoding: 'utf8' },
  );
  const restored = JSON.parse(output);
  assert.deepEqual(restored, saved);
  assert.equal(
    restored.assignments.filter((item) => item.executionSlot !== null).length,
    1,
  );
  assert.equal(
    restored.assignments.filter((item) => item.state === 'waiting').length,
    2,
  );
  assert.equal((await stat(path)).mode & 0o777, 0o600);
});

test('all worktrees resolve one store outside tracked files', async (t) => {
  const path = await storage(t);
  const main = join(path, 'main');
  const secondary = join(path, 'secondary');
  execFileSync('git', ['init', main], { stdio: 'ignore' });
  execFileSync(
    'git',
    [
      '-C',
      main,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '--allow-empty',
      '-m',
      'initial',
    ],
    { stdio: 'ignore' },
  );
  execFileSync('git', ['-C', main, 'worktree', 'add', '--detach', secondary], {
    stdio: 'ignore',
  });
  assert.equal(registryPath(main), registryPath(secondary));
  assert.equal(
    registryPath(main),
    resolve(main, '.git/coordinator/registry.json'),
  );
});

test('stale writes, duplicate initialization and concurrent writers cannot overwrite history', async (t) => {
  const path = await storage(t);
  const initial = await writeRegistry(path, registry(), null);
  await assert.rejects(writeRegistry(path, registry(), null), /Stale registry/);
  const results = await Promise.allSettled([
    writeRegistry(path, initial, 0),
    writeRegistry(path, initial, 0),
  ]);
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1);
  assert.equal((await readRegistry(path)).revision, 1);
  await assert.rejects(writeRegistry(path, initial, 0), /Stale registry/);
});

test('corrupt or future stores are preserved and never initialized over', async (t) => {
  const path = await storage(t);
  for (const content of [
    '{truncated',
    JSON.stringify({ ...registry(), schemaVersion: 99 }),
  ]) {
    await writeFile(path, content);
    await assert.rejects(writeRegistry(path, registry(), null));
    assert.equal(await readFile(path, 'utf8'), content);
  }
});

test('orphan lock requires operator recovery, not automatic theft', async (t) => {
  const path = await storage(t);
  await writeFile(`${path}.lock`, '');
  await assert.rejects(writeRegistry(path, registry(), null), {
    code: 'EEXIST',
  });
});

test('assignment identity and prior records cannot be erased by a replacement', async (t) => {
  const path = await storage(t);
  const initial = await writeRegistry(path, registry(), null);
  for (const mutate of [
    (value) => value.assignments.pop(),
    (value) => {
      value.assignments[0].issue = 50;
    },
    (value) => {
      value.assignments[0].assignmentId = 'reused';
    },
  ]) {
    const changed = globalThis.structuredClone(initial);
    mutate(changed);
    await assert.rejects(writeRegistry(path, changed, 0), /identity\/history/);
    assert.deepEqual(await readRegistry(path), initial);
  }
});

test('multiple retained PRs do not limit eight execution slots, but duplicate/ninth slots fail', () => {
  const value = registry();
  value.assignments = Array.from({ length: 12 }, (_, i) =>
    assignment(i + 1, i < 8 ? i + 1 : null),
  );
  validateRegistry(value);
  value.assignments[8].executionSlot = 9;
  assert.throws(() => validateRegistry(value), /1–8/);
  value.assignments[8].executionSlot = 2;
  assert.throws(() => validateRegistry(value), /already occupied/);
});

test('unknown credential fields, duplicate identities, shared chats, and invalid revisions fail', () => {
  for (const mutate of [
    (value) => {
      value.token = 'synthetic-test-marker';
    },
    (value) => {
      value.assignments[0].credentials = {};
    },
    (value) => {
      value.assignments[1].assignmentId = value.assignments[0].assignmentId;
    },
    (value) => {
      value.assignments[1].chat = value.assignments[0].chat;
    },
    (value) => {
      value.assignments[0].verified.github.head = 'short-sha';
    },
  ]) {
    const value = registry();
    mutate(value);
    assert.throws(() => validateRegistry(value));
  }
});

test('coordinator identity survives rename; fallback requires confirmation and fails closed', () => {
  const binding = registry().coordinator;
  const renamed = { ...binding, title: 'Coordinator renamed' };
  const fallback = {
    chatId: 'replacement',
    hostId: 'local',
    title: 'Cordinator',
  };
  assert.equal(
    discoverCoordinator(binding, [renamed, fallback]).status,
    'bound',
  );
  assert.equal(
    discoverCoordinator(binding, [fallback]).status,
    'confirmation-required',
  );
  assert.equal(
    discoverCoordinator(binding, [fallback, { ...fallback, hostId: 'remote' }])
      .status,
    'ambiguous',
  );
  assert.equal(discoverCoordinator(binding, []).status, 'missing');
  assert.equal(
    discoverCoordinator(binding, [fallback], false).status,
    'unavailable',
  );
});

test('queued PR fix acquires a released lease without changing owner, chat, or assignment', async (t) => {
  const path = await storage(t);
  const initial = registry();
  initial.assignments = Array.from({ length: 10 }, (_, i) =>
    assignment(i + 1, i < 8 ? i + 1 : null),
  );
  let saved = await writeRegistry(path, initial, null);
  const waiting = globalThis.structuredClone(saved.assignments[8]);
  const overCapacity = globalThis.structuredClone(saved);
  overCapacity.assignments[8].executionSlot = 8;
  overCapacity.assignments[8].executionState = 'running';
  await assert.rejects(
    writeRegistry(path, overCapacity, 0),
    /already occupied/,
  );
  assert.deepEqual(await readRegistry(path), saved);
  saved.assignments[7].state = 'waiting';
  saved.assignments[7].executionSlot = null;
  saved.assignments[7].executionState = 'stopped';
  saved = await writeRegistry(path, saved, 0);
  saved.assignments[8].state = 'working';
  saved.assignments[8].executionSlot = 8;
  saved.assignments[8].executionState = 'running';
  saved = await writeRegistry(path, saved, 1);
  for (const key of ['assignmentId', 'owner', 'chat', 'pr']) {
    assert.deepEqual(saved.assignments[8][key], waiting[key]);
  }
  assert.equal(
    saved.assignments.filter((item) => item.executionSlot !== null).length,
    8,
  );
});

test('uncertain execution keeps its lease; idle reserved owner does not consume one', () => {
  const value = registry();
  value.assignments[0].owner = 'reserved-maintainer';
  value.assignments[2].executionState = 'unknown';
  validateRegistry(value);
  value.assignments[0].executionState = 'running';
  assert.throws(() => validateRegistry(value), /needs execution lease/);
  value.assignments[0].executionSlot = 2;
  assert.throws(() => validateRegistry(value), /already occupied/);
});

test('state transitions preserve pending work and terminal history', async (t) => {
  const path = await storage(t);
  let saved = await writeRegistry(path, registry(), null);
  const invalid = globalThis.structuredClone(saved);
  invalid.assignments[0].state = 'completed';
  await assert.rejects(
    writeRegistry(path, invalid, 0),
    /Invalid assignment transition/,
  );
  saved.assignments[0].state = 'merged';
  saved = await writeRegistry(path, saved, 0);
  saved.assignments[0].state = 'completed';
  saved = await writeRegistry(path, saved, 1);
  saved.assignments[0].state = 'working';
  await assert.rejects(
    writeRegistry(path, saved, 2),
    /Invalid assignment transition/,
  );
});

test('CLI initializes, updates with CAS, and reads from a separate process', async (t) => {
  const path = await storage(t);
  const cwd = join(path, 'repo');
  execFileSync('git', ['init', cwd], { stdio: 'ignore' });
  const tool = fileURLToPath(
    new URL('../tools/assignment-registry.mjs', import.meta.url),
  );
  const run = (...args) =>
    execFileSync(process.execPath, [tool, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const initial = JSON.parse(
    run('init', 'example/racing', 'coordinator-original', 'local'),
  );
  initial.assignments.push(assignment(10));
  const candidate = join(path, 'candidate.json');
  await writeFile(candidate, JSON.stringify(initial), { mode: 0o600 });
  const updated = JSON.parse(run('update', candidate, '0'));
  assert.equal(updated.revision, 1);
  assert.deepEqual(JSON.parse(run('show')), updated);
  assert.throws(() => run('update', candidate, '0'), /Stale registry revision/);
  await writeFile(candidate, '{invalid-synthetic-private-content');
  try {
    run('update', candidate, '1');
    assert.fail('Malformed JSON must fail');
  } catch (error) {
    assert.equal(error.stderr.trim(), 'Invalid registry JSON');
    assert.ok(!error.stderr.includes('synthetic-private-content'));
  }
});

test('unavailable source keeps prior revisions without claiming current verification', async (t) => {
  const path = await storage(t);
  const initial = registry();
  initial.assignments[0].verified.github = {
    status: 'verified',
    checkedAt: epoch,
    head: 'a'.repeat(40),
    base: 'b'.repeat(40),
  };
  let saved = await writeRegistry(path, initial, null);
  saved.assignments[0].verified.github.status = 'unavailable';
  saved.assignments[0].verified.github.checkedAt = new Date().toISOString();
  saved = await writeRegistry(path, saved, 0);
  const observation = (await readRegistry(path)).assignments[0].verified.github;
  assert.equal(observation.status, 'unavailable');
  assert.equal(observation.head, 'a'.repeat(40));
  assert.equal(observation.base, 'b'.repeat(40));
  saved.assignments[0].verified.github.checkedAt = '9999-01-01T00:00:00.000Z';
  await assert.rejects(writeRegistry(path, saved, 1), /future/);
});
