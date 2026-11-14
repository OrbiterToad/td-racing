/** Local durable storage; this module never contacts GitHub or dispatches work. */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const transitions = {
  assigned: ['working', 'blocked', 'cancelled'],
  working: ['waiting', 'blocked', 'cancelled'],
  waiting: ['working', 'blocked', 'merge-ready', 'merged', 'cancelled'],
  blocked: ['assigned', 'working', 'waiting', 'cancelled'],
  'merge-ready': ['waiting', 'working', 'blocked', 'merged', 'cancelled'],
  merged: ['completed'],
  completed: [],
  cancelled: [],
};

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function fields(value, names) {
  requireValue(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join() === names.split(' ').sort().join(),
    `Expected only fields: ${names}`,
  );
}

function text(value) {
  requireValue(
    typeof value === 'string' && value.trim().length > 0,
    'Expected nonempty text',
  );
}

function timestamp(value) {
  requireValue(
    typeof value === 'string' &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    'Expected UTC ISO timestamp',
  );
}

function chat(value) {
  fields(value, 'chatId hostId');
  text(value.chatId);
  text(value.hostId);
}

/** Schema versions fail closed. Free text must be sanitized by the coordinator. */
export function validateRegistry(registry) {
  fields(
    registry,
    'schemaVersion revision repository coordinator updatedAt assignments',
  );
  requireValue(registry.schemaVersion === 1, 'Unsupported registry schema');
  requireValue(
    Number.isSafeInteger(registry.revision) && registry.revision >= 0,
    'Invalid revision',
  );
  requireValue(
    /^[\w.-]+\/[\w.-]+$/.test(registry.repository),
    'Expected owner/repository',
  );
  chat(registry.coordinator);
  timestamp(registry.updatedAt);
  requireValue(
    Array.isArray(registry.assignments),
    'Expected assignments array',
  );
  const ids = new Set();
  const slots = new Set();
  const chats = new Set();
  for (const record of registry.assignments) {
    fields(
      record,
      'assignmentId issue owner chat executionSlot executionState branch worktree pr state blocker nextAction createdAt updatedAt verified',
    );
    text(record.assignmentId);
    requireValue(!ids.has(record.assignmentId), 'Duplicate assignment ID');
    ids.add(record.assignmentId);
    requireValue(
      Number.isSafeInteger(record.issue) && record.issue > 0,
      'Invalid issue',
    );
    text(record.owner);
    if (record.chat !== null) {
      chat(record.chat);
      const key = JSON.stringify([record.chat.hostId, record.chat.chatId]);
      requireValue(!chats.has(key), 'Each assignment needs a distinct chat');
      chats.add(key);
    }
    if (record.executionSlot !== null) {
      requireValue(
        Number.isInteger(record.executionSlot) &&
          record.executionSlot >= 1 &&
          record.executionSlot <= 8,
        'Execution slot must be 1–8',
      );
      requireValue(
        !slots.has(record.executionSlot),
        'Execution slot already occupied',
      );
      slots.add(record.executionSlot);
    }
    requireValue(
      ['running', 'stopped', 'unknown'].includes(record.executionState),
      'Invalid execution state',
    );
    requireValue(
      record.executionState !== 'running' || record.executionSlot !== null,
      'Running assignment needs execution lease',
    );
    requireValue(
      record.executionState !== 'stopped' || record.executionSlot === null,
      'Stopped assignment must release lease',
    );
    for (const name of ['branch', 'worktree', 'blocker']) {
      if (record[name] !== null) text(record[name]);
    }
    requireValue(
      record.pr === null || (Number.isSafeInteger(record.pr) && record.pr > 0),
      'Invalid PR',
    );
    requireValue(
      Object.hasOwn(transitions, record.state),
      'Invalid assignment state',
    );
    requireValue(
      record.state !== 'blocked' || record.blocker !== null,
      'Blocked assignment needs reason',
    );
    requireValue(
      !['merge-ready', 'merged'].includes(record.state) || record.pr !== null,
      'PR required for merge state',
    );
    requireValue(
      !['completed', 'cancelled'].includes(record.state) ||
        record.executionState === 'stopped',
      'Terminal assignment must stop execution',
    );
    text(record.nextAction);
    timestamp(record.createdAt);
    timestamp(record.updatedAt);
    requireValue(
      record.createdAt <= record.updatedAt &&
        record.updatedAt <= registry.updatedAt,
      'Invalid timestamp order',
    );
    fields(record.verified, 'github chat worktree');
    for (const source of ['github', 'chat', 'worktree']) {
      const observation = record.verified[source];
      fields(observation, 'status checkedAt head base');
      requireValue(
        ['unknown', 'verified', 'unavailable', 'missing'].includes(
          observation.status,
        ),
        'Invalid observation status',
      );
      if (observation.checkedAt !== null) timestamp(observation.checkedAt);
      requireValue(
        observation.status === 'unknown' || observation.checkedAt !== null,
        'Observation needs timestamp',
      );
      for (const name of ['head', 'base']) {
        requireValue(
          observation[name] === null ||
            /^[a-f0-9]{40}$/.test(observation[name]),
          'Invalid Git revision',
        );
      }
    }
  }
  return registry;
}

export function registryPath(cwd = process.cwd()) {
  const common = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd, encoding: 'utf8' },
  ).trim();
  return join(common, 'coordinator', 'registry.json');
}

export async function readRegistry(path) {
  return validateRegistry(JSON.parse(await readFile(path, 'utf8')));
}

/**
 * Sole-writer coordinator convention, plus a filesystem lock and optimistic revision.
 * expectedRevision=null only initializes a missing file; never resets an existing one.
 */
export async function writeRegistry(path, proposed, expectedRevision) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const lock = await open(`${path}.lock`, 'wx', 0o600);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    let previous = null;
    try {
      previous = await readRegistry(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    requireValue(
      (previous?.revision ?? null) === expectedRevision,
      'Stale registry revision; read and reconcile again',
    );
    const next = structuredClone(proposed);
    next.revision = previous ? previous.revision + 1 : 0;
    next.updatedAt = new Date().toISOString();
    validateRegistry({ ...next, updatedAt: proposed.updatedAt });
    if (previous) {
      requireValue(
        next.repository === previous.repository,
        'Cannot change repository',
      );
      for (const old of previous.assignments) {
        const current = next.assignments.find(
          (item) => item.assignmentId === old.assignmentId,
        );
        requireValue(
          current &&
            current.issue === old.issue &&
            current.createdAt === old.createdAt,
          'Assignment identity/history must be preserved',
        );
        requireValue(
          old.pr === null || current.pr === old.pr,
          'Existing PR binding must be preserved',
        );
        requireValue(
          current.state === old.state ||
            transitions[old.state].includes(current.state),
          'Invalid assignment transition',
        );
        requireValue(
          current.updatedAt >= old.updatedAt,
          'Assignment timestamp cannot move backwards',
        );
      }
    }
    for (const record of next.assignments) {
      const old = previous?.assignments.find(
        (item) => item.assignmentId === record.assignmentId,
      );
      if (!old) record.createdAt = next.updatedAt;
      if (!old || JSON.stringify(old) !== JSON.stringify(record))
        record.updatedAt = next.updatedAt;
    }
    validateRegistry(next);
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(`${JSON.stringify(next, null, 2)}\n`);
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, path);
    const directory = await open(dirname(path), 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    return next;
  } finally {
    await rm(temporary, { force: true });
    await lock.close();
    await rm(`${path}.lock`);
  }
}

/** Stable IDs win over titles; title fallback is discovery, never silent rebinding. */
export function discoverCoordinator(binding, chats, inventoryAvailable = true) {
  if (!inventoryAvailable) return { status: 'unavailable', candidate: null };
  const stable = chats.find(
    (item) => item.chatId === binding.chatId && item.hostId === binding.hostId,
  );
  if (stable) return { status: 'bound', candidate: stable };
  const candidates = chats.filter((item) => item.title === 'Cordinator');
  return {
    status:
      candidates.length === 1
        ? 'confirmation-required'
        : candidates.length
          ? 'ambiguous'
          : 'missing',
    candidate: candidates.length === 1 ? candidates[0] : null,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const path = registryPath();
    let result;
    if (command === 'show' && args.length === 0) {
      result = await readRegistry(path);
    } else if (command === 'init' && args.length === 3) {
      const [repository, chatId, hostId] = args;
      result = await writeRegistry(
        path,
        {
          schemaVersion: 1,
          revision: 0,
          repository,
          coordinator: { chatId, hostId },
          updatedAt: new Date().toISOString(),
          assignments: [],
        },
        null,
      );
    } else if (
      command === 'update' &&
      args.length === 2 &&
      /^\d+$/.test(args[1])
    ) {
      result = await writeRegistry(
        path,
        JSON.parse(await readFile(args[0], 'utf8')),
        Number(args[1]),
      );
    } else {
      throw new Error(
        'Usage: assignment-registry.mjs show | init owner/repo chatId hostId | update candidate.json expectedRevision',
      );
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    // JSON parse errors can quote input. Never echo candidate data on a failure.
    console.error(
      error instanceof SyntaxError ? 'Invalid registry JSON' : error.message,
    );
    process.exitCode = 1;
  }
}
