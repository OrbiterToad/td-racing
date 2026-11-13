import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addLocalEntry,
  fetchLeaderboard,
  LEADERBOARD_NAME_KEY,
  LOCAL_LEADERBOARD_KEY,
  loadDisplayName,
  MAX_ENTRIES,
  MAX_NAME_LENGTH,
  readLocalLeaderboard,
  saveDisplayName,
  submitEntry,
  validateDisplayName,
} from '../src/leaderboard.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class MemoryStorage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
}

// ---------------------------------------------------------------------------
// validateDisplayName
// ---------------------------------------------------------------------------

test('validateDisplayName accepts a single character', () => {
  assert.ok(validateDisplayName('A'));
});

test('validateDisplayName accepts a name at the maximum length', () => {
  assert.ok(validateDisplayName('A'.repeat(MAX_NAME_LENGTH)));
});

test('validateDisplayName rejects an empty string', () => {
  assert.ok(!validateDisplayName(''));
});

test('validateDisplayName rejects a name that exceeds the maximum length', () => {
  assert.ok(!validateDisplayName('A'.repeat(MAX_NAME_LENGTH + 1)));
});

test('validateDisplayName rejects a whitespace-only string', () => {
  assert.ok(!validateDisplayName('   '));
});

test('validateDisplayName rejects non-string input', () => {
  assert.ok(!validateDisplayName(null));
  assert.ok(!validateDisplayName(42));
  assert.ok(!validateDisplayName(undefined));
});

// ---------------------------------------------------------------------------
// loadDisplayName / saveDisplayName
// ---------------------------------------------------------------------------

test('loadDisplayName returns empty string when storage has no entry', () => {
  assert.equal(loadDisplayName(new MemoryStorage()), '');
});

test('saveDisplayName persists and loadDisplayName retrieves the name', () => {
  const storage = new MemoryStorage();
  assert.ok(saveDisplayName('Felix', storage));
  assert.equal(loadDisplayName(storage), 'Felix');
});

test('saveDisplayName trims whitespace from the saved name', () => {
  const storage = new MemoryStorage();
  saveDisplayName('  Max  ', storage);
  assert.equal(loadDisplayName(storage), 'Max');
});

test('saveDisplayName returns false and does not save an invalid name', () => {
  const storage = new MemoryStorage();
  assert.ok(!saveDisplayName('', storage));
  assert.equal(storage.getItem(LEADERBOARD_NAME_KEY), null);
});

test('loadDisplayName rejects a saved name that exceeds the maximum length', () => {
  const storage = new MemoryStorage();
  storage.setItem(LEADERBOARD_NAME_KEY, 'A'.repeat(MAX_NAME_LENGTH + 1));
  assert.equal(loadDisplayName(storage), '');
});

// ---------------------------------------------------------------------------
// readLocalLeaderboard
// ---------------------------------------------------------------------------

test('readLocalLeaderboard returns an empty array for a pairing with no entries', () => {
  assert.deepEqual(
    readLocalLeaderboard('juniper', 'clubsport', new MemoryStorage()),
    [],
  );
});

test('readLocalLeaderboard returns an empty array for an unknown track', () => {
  assert.deepEqual(
    readLocalLeaderboard('unknown', 'clubsport', new MemoryStorage()),
    [],
  );
});

test('readLocalLeaderboard returns an empty array for an unknown car', () => {
  assert.deepEqual(
    readLocalLeaderboard('juniper', 'unknown', new MemoryStorage()),
    [],
  );
});

test('readLocalLeaderboard filters out corrupted entries', () => {
  const storage = new MemoryStorage();
  storage.setItem(
    LOCAL_LEADERBOARD_KEY,
    JSON.stringify({
      'juniper:clubsport': [
        { name: 'Alice', time: 65.0 },
        { name: null, time: 70.0 },
        { name: 'Bob', time: -1 },
        { name: 'Carol', time: NaN },
      ],
    }),
  );
  const entries = readLocalLeaderboard('juniper', 'clubsport', storage);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Alice');
});

// ---------------------------------------------------------------------------
// addLocalEntry
// ---------------------------------------------------------------------------

test('addLocalEntry returns null for an unknown track', () => {
  assert.equal(
    addLocalEntry('unknown', 'clubsport', 65.0, 'Felix', {
      storage: new MemoryStorage(),
    }),
    null,
  );
});

test('addLocalEntry returns null for an unknown car', () => {
  assert.equal(
    addLocalEntry('juniper', 'unknown', 65.0, 'Felix', {
      storage: new MemoryStorage(),
    }),
    null,
  );
});

test('addLocalEntry returns null for a non-positive lap time', () => {
  const storage = new MemoryStorage();
  assert.equal(
    addLocalEntry('juniper', 'clubsport', 0, 'Felix', { storage }),
    null,
  );
  assert.equal(
    addLocalEntry('juniper', 'clubsport', -5, 'Felix', { storage }),
    null,
  );
  assert.equal(
    addLocalEntry('juniper', 'clubsport', NaN, 'Felix', { storage }),
    null,
  );
});

test('addLocalEntry returns null for an invalid display name', () => {
  assert.equal(
    addLocalEntry('juniper', 'clubsport', 65.0, '', {
      storage: new MemoryStorage(),
    }),
    null,
  );
});

test('addLocalEntry adds an entry and returns rank 1 when the leaderboard is empty', () => {
  const storage = new MemoryStorage();
  const result = addLocalEntry('juniper', 'clubsport', 65.0, 'Felix', {
    storage,
  });
  assert.ok(result !== null);
  assert.equal(result.rank, 1);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].name, 'Felix');
  assert.equal(result.entries[0].time, 65.0);
});

test('addLocalEntry keeps entries sorted fastest-first', () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 70.0, 'Bob', { storage });
  addLocalEntry('juniper', 'clubsport', 60.0, 'Alice', { storage });
  const result = addLocalEntry('juniper', 'clubsport', 65.0, 'Felix', {
    storage,
  });
  assert.equal(result.entries[0].name, 'Alice');
  assert.equal(result.entries[1].name, 'Felix');
  assert.equal(result.entries[2].name, 'Bob');
});

test('addLocalEntry caps the leaderboard at MAX_ENTRIES', () => {
  const storage = new MemoryStorage();
  for (let i = 0; i < MAX_ENTRIES + 2; i++) {
    addLocalEntry('juniper', 'clubsport', 60 + i, `Driver${i}`, { storage });
  }
  const entries = readLocalLeaderboard('juniper', 'clubsport', storage);
  assert.equal(entries.length, MAX_ENTRIES);
});

test('addLocalEntry isolates entries by track/car pairing', () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 65.0, 'Felix', { storage });
  addLocalEntry('canyon', 'clubsport', 72.0, 'Felix', { storage });
  addLocalEntry('juniper', 'sprint', 61.0, 'Felix', { storage });

  assert.equal(readLocalLeaderboard('juniper', 'clubsport', storage).length, 1);
  assert.equal(readLocalLeaderboard('canyon', 'clubsport', storage).length, 1);
  assert.equal(readLocalLeaderboard('juniper', 'sprint', storage).length, 1);
});

test('addLocalEntry correctly ranks a new fastest entry as rank 1', () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 70.0, 'Bob', { storage });
  const result = addLocalEntry('juniper', 'clubsport', 60.0, 'Alice', {
    storage,
  });
  assert.equal(result.rank, 1);
});

test('addLocalEntry correctly ranks a new slowest entry last', () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 60.0, 'Alice', { storage });
  const result = addLocalEntry('juniper', 'clubsport', 70.0, 'Bob', {
    storage,
  });
  assert.equal(result.rank, 2);
});

// ---------------------------------------------------------------------------
// submitEntry (local-only: no apiUrl)
// ---------------------------------------------------------------------------

test('submitEntry resolves ok:true with rank and local:true when no apiUrl is configured', async () => {
  const storage = new MemoryStorage();
  const result = await submitEntry('juniper', 'clubsport', 65.0, 'Felix', {
    storage,
    apiUrl: '',
  });
  assert.ok(result.ok);
  assert.equal(result.rank, 1);
  assert.ok(result.local);
});

test('submitEntry resolves ok:false for an invalid pairing', async () => {
  const result = await submitEntry('unknown', 'clubsport', 65.0, 'Felix', {
    apiUrl: '',
    storage: new MemoryStorage(),
  });
  assert.ok(!result.ok);
  assert.equal(result.error, 'invalid pairing');
});

test('submitEntry resolves ok:false for an invalid lap time', async () => {
  const result = await submitEntry('juniper', 'clubsport', -1, 'Felix', {
    apiUrl: '',
    storage: new MemoryStorage(),
  });
  assert.ok(!result.ok);
  assert.equal(result.error, 'invalid time');
});

test('submitEntry resolves ok:false for an invalid display name', async () => {
  const result = await submitEntry('juniper', 'clubsport', 65.0, '', {
    apiUrl: '',
    storage: new MemoryStorage(),
  });
  assert.ok(!result.ok);
  assert.equal(result.error, 'invalid name');
});

test('submitEntry falls back to local storage when the network request fails', async () => {
  const storage = new MemoryStorage();
  const result = await submitEntry('juniper', 'clubsport', 65.0, 'Felix', {
    apiUrl: 'http://localhost:19999',
    storage,
  });
  assert.ok(result.ok);
  assert.ok(result.local);
  assert.equal(result.rank, 1);
});

// ---------------------------------------------------------------------------
// fetchLeaderboard (local-only: no apiUrl)
// ---------------------------------------------------------------------------

test('fetchLeaderboard returns ok:true with an empty list for an empty pairing', async () => {
  const storage = new MemoryStorage();
  const result = await fetchLeaderboard('juniper', 'clubsport', {
    apiUrl: '',
    storage,
  });
  assert.ok(result.ok);
  assert.ok(result.local);
  assert.deepEqual(result.entries, []);
});

test('fetchLeaderboard returns previously submitted entries', async () => {
  const storage = new MemoryStorage();
  await submitEntry('juniper', 'clubsport', 65.0, 'Felix', {
    apiUrl: '',
    storage,
  });
  const result = await fetchLeaderboard('juniper', 'clubsport', {
    apiUrl: '',
    storage,
  });
  assert.ok(result.ok);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].name, 'Felix');
});

test('fetchLeaderboard returns ok:false for an invalid pairing', async () => {
  const result = await fetchLeaderboard('unknown', 'clubsport', {
    apiUrl: '',
    storage: new MemoryStorage(),
  });
  assert.ok(!result.ok);
});

test('fetchLeaderboard falls back to local storage when the network request fails', async () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 65.0, 'Felix', { storage });
  const result = await fetchLeaderboard('juniper', 'clubsport', {
    apiUrl: 'http://localhost:19999',
    storage,
  });
  assert.ok(result.ok);
  assert.ok(result.local);
  assert.equal(result.entries.length, 1);
});

test('fetchLeaderboard returns entries sorted fastest-first', async () => {
  const storage = new MemoryStorage();
  addLocalEntry('juniper', 'clubsport', 70.0, 'Bob', { storage });
  addLocalEntry('juniper', 'clubsport', 60.0, 'Alice', { storage });
  const result = await fetchLeaderboard('juniper', 'clubsport', {
    apiUrl: '',
    storage,
  });
  assert.equal(result.entries[0].name, 'Alice');
  assert.equal(result.entries[1].name, 'Bob');
});
