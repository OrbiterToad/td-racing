import assert from 'node:assert/strict';
import test from 'node:test';
import { MAPS, VEHICLES } from '../src/config.js';
import {
  PROGRESSION_KEY,
  LEGACY_MEDAL_KEY,
  LEGACY_SKILL_KEY,
  initialProgression,
  loadProgression,
  unlockContent,
  saveMedal,
  saveSkillResult,
  completeCareerEvent,
  resetProgression,
} from '../src/progression.js';

class Storage {
  values = new Map();
  getItem(key) {
    return this.values.get(key) ?? null;
  }
  setItem(key, value) {
    this.values.set(key, value);
  }
}
const store = (value) => {
  const storage = new Storage();
  storage.setItem(PROGRESSION_KEY, JSON.stringify(value));
  return storage;
};

test('initial save preserves every available car and track, without earned progress', () => {
  const storage = new Storage();
  const { progress } = loadProgression(storage);
  assert.deepEqual(progress.unlocked.cars, Object.keys(VEHICLES));
  assert.deepEqual(progress.unlocked.tracks, Object.keys(MAPS));
  assert.deepEqual(progress.medals, {});
  assert.deepEqual(progress.events, {});
  assert.deepEqual(loadProgression(storage).progress, progress);
});

test('recognized unlocks, medal improvements, skill results and completed events survive reload', () => {
  const progress = initialProgression();
  progress.unlocked = { cars: ['clubsport'], tracks: ['juniper'] };
  const storage = store(progress);
  assert.equal(unlockContent('cars', 'formula', storage), true);
  assert.equal(unlockContent('tracks', 'canyon', storage), true);
  assert.equal(unlockContent('cars', 'formula', storage), false);
  assert.equal(unlockContent('cars', 'missing', storage), false);
  assert.equal(unlockContent('unknown', 'juniper', storage), false);
  assert.equal(saveMedal('juniper', 'formula', 'silver', storage), true);
  assert.equal(saveMedal('juniper', 'formula', 'bronze', storage), false);
  saveSkillResult('slalom', 80, false, storage);
  saveSkillResult('slalom', 70, true, storage);
  assert.equal(
    completeCareerEvent(
      'juniper',
      'formula',
      { valid: true, time: 180 },
      storage,
    ),
    true,
  );
  assert.equal(
    completeCareerEvent(
      'juniper',
      'formula',
      { valid: true, time: 180 },
      storage,
    ),
    false,
  );
  const reloaded = store(JSON.parse(storage.getItem(PROGRESSION_KEY)));
  const restored = loadProgression(reloaded).progress;
  assert.deepEqual(restored.unlocked, {
    cars: ['clubsport', 'formula'],
    tracks: ['juniper', 'canyon'],
  });
  assert.deepEqual(restored.medals, { 'juniper:formula': 'silver' });
  assert.deepEqual(restored.skills.slalom, {
    attempts: 2,
    completions: 1,
    best: 80,
  });
  assert.deepEqual(restored.events, { 'juniper:formula': true });
});

test('invalid results cannot award progress', () => {
  const storage = new Storage();
  assert.equal(saveMedal('missing', 'formula', 'gold', storage), false);
  assert.equal(saveMedal('juniper', 'formula', 'platinum', storage), false);
  for (const score of [NaN, Infinity, -1, 101, '100'])
    assert.equal(saveSkillResult('slalom', score, true, storage), null);
  assert.equal(saveSkillResult('unknown', 100, true, storage), null);
  for (const options of [
    { time: 100 },
    { valid: true, time: 0 },
    { valid: true, time: NaN },
  ])
    assert.equal(
      completeCareerEvent('juniper', 'formula', options, storage),
      false,
    );
  assert.equal(storage.getItem(PROGRESSION_KEY), null);
});

test('legacy migration filters malformed entries, preserves source data, and runs once', () => {
  const storage = new Storage();
  storage.setItem('personal-best', '60');
  storage.setItem(
    LEGACY_MEDAL_KEY,
    JSON.stringify({
      'juniper:clubsport': 'gold',
      'missing:clubsport': 'gold',
    }),
  );
  storage.setItem(
    LEGACY_SKILL_KEY,
    JSON.stringify({
      braking: { attempts: 2, completions: 1, best: 90 },
      slalom: { attempts: '2', completions: 9, best: 101 },
    }),
  );
  const loaded = loadProgression(storage);
  assert.equal(loaded.status, 'migrated');
  assert.deepEqual(loaded.progress.medals, { 'juniper:clubsport': 'gold' });
  assert.deepEqual(loaded.progress.skills, {
    braking: { attempts: 2, completions: 1, best: 90 },
  });
  assert.equal(storage.getItem('personal-best'), '60');
  assert.ok(storage.getItem(LEGACY_MEDAL_KEY));
  storage.setItem(LEGACY_MEDAL_KEY, '{"juniper:formula":"gold"}');
  assert.deepEqual(
    loadProgression(storage).progress.medals,
    loaded.progress.medals,
  );
});

test('version zero migrates deterministically and sanitizes unknown or invalid fields', () => {
  const storage = store({
    version: 0,
    unlocked: {
      cars: ['formula', 'formula', 'unknown'],
      tracks: ['juniper', '__proto__'],
    },
    medals: { 'juniper:formula': 'silver', '__proto__:formula': 'gold' },
    events: { 'juniper:formula': true, 'canyon:formula': 'true' },
    skills: [],
  });
  const loaded = loadProgression(storage);
  assert.equal(loaded.status, 'migrated');
  assert.equal(loaded.progress.version, 1);
  assert.deepEqual(loaded.progress.unlocked, {
    cars: ['formula'],
    tracks: ['juniper'],
  });
  assert.deepEqual(loaded.progress.events, { 'juniper:formula': true });
  assert.deepEqual(
    JSON.parse(storage.getItem(PROGRESSION_KEY)),
    loaded.progress,
  );
});

test('corrupt and unsupported canonical saves never reimport legacy awards or get overwritten', () => {
  for (const raw of [
    '{broken',
    'null',
    '[]',
    '{"version":99}',
    '{"version":-1}',
    '{}',
  ]) {
    const storage = new Storage();
    storage.setItem(PROGRESSION_KEY, raw);
    storage.setItem(LEGACY_MEDAL_KEY, '{"juniper:formula":"gold"}');
    const loaded = loadProgression(storage);
    assert.equal(loaded.writable, false);
    assert.deepEqual(loaded.progress.medals, {});
    assert.equal(saveMedal('juniper', 'formula', 'gold', storage), false);
    assert.equal(storage.getItem(PROGRESSION_KEY), raw);
  }
});

test('only confirmed reset clears career progress and cannot resurrect legacy awards', () => {
  const storage = new Storage();
  storage.setItem(LEGACY_MEDAL_KEY, '{"juniper:formula":"gold"}');
  loadProgression(storage);
  for (const [key, value] of [
    ['apex-settings-v1', 'settings'],
    ['leaderboard', 'leaderboard'],
    ['personal-best', '60'],
    ['ghost', 'frames'],
  ])
    storage.setItem(key, value);
  const before = new Map(storage.values);
  assert.equal(resetProgression(true, storage), false);
  assert.deepEqual(storage.values, before);
  assert.equal(resetProgression('RESET PROGRESSION', storage), true);
  assert.deepEqual(loadProgression(storage).progress, initialProgression());
  for (const [key, value] of before)
    if (key !== PROGRESSION_KEY) assert.equal(storage.getItem(key), value);
});

test('denied reads, quota failures and absent storage are handled without throwing', () => {
  const denied = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  assert.equal(loadProgression(denied).writable, false);
  assert.equal(resetProgression('RESET PROGRESSION', denied), false);
  const quota = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.equal(loadProgression(quota).status, 'unavailable');
  assert.equal(saveMedal('juniper', 'formula', 'gold', quota), false);
  assert.equal(loadProgression(null).status, 'unavailable');
});
