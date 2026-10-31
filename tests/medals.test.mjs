import assert from 'node:assert/strict';
import test from 'node:test';
import { MAPS, VEHICLES } from '../src/config.js';
import {
  awardMedal,
  earnedMedalFor,
  MEDAL_KEY,
  MEDAL_TARGETS,
  medalForTime,
  medalTargetsFor,
  readMedals,
} from '../src/medals.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }
}

test('every playable track and car has configurable, ordered medal targets', () => {
  assert.deepEqual(Object.keys(MEDAL_TARGETS), Object.keys(MAPS));
  for (const trackId of Object.keys(MAPS)) {
    assert.deepEqual(
      Object.keys(MEDAL_TARGETS[trackId]),
      Object.keys(VEHICLES),
    );
    for (const carId of Object.keys(VEHICLES)) {
      const targets = medalTargetsFor(trackId, carId);
      assert.ok(targets.bronze > targets.silver);
      assert.ok(targets.silver > targets.gold);
    }
  }
});

test('lap time boundaries award the highest medal whose target is met', () => {
  const targets = medalTargetsFor('juniper', 'clubsport');
  assert.equal(medalForTime(targets.gold, targets), 'gold');
  assert.equal(medalForTime(targets.silver, targets), 'silver');
  assert.equal(medalForTime(targets.bronze, targets), 'bronze');
  assert.equal(medalForTime(targets.gold + 0.001, targets), 'silver');
  assert.equal(medalForTime(targets.bronze + 0.001, targets), null);
  assert.equal(medalForTime(0, targets), null);
  assert.equal(medalForTime(Number.NaN, targets), null);
});

test('invalid laps and non-time-trial laps never award or persist medals', () => {
  const storage = new MemoryStorage();
  const targets = medalTargetsFor('juniper', 'clubsport');
  assert.equal(
    awardMedal('juniper', 'clubsport', targets.gold, {
      valid: false,
      timeTrial: true,
      storage,
    }),
    null,
  );
  assert.equal(
    awardMedal('juniper', 'clubsport', targets.gold, {
      valid: true,
      timeTrial: false,
      storage,
    }),
    null,
  );
  assert.equal(storage.getItem(MEDAL_KEY), null);
});

test('earned medals persist, improve monotonically, and stay isolated by pairing', () => {
  const storage = new MemoryStorage();
  const clubTargets = medalTargetsFor('juniper', 'clubsport');
  const formulaTargets = medalTargetsFor('juniper', 'formula');
  assert.deepEqual(
    awardMedal('juniper', 'clubsport', clubTargets.bronze, {
      valid: true,
      timeTrial: true,
      storage,
    }),
    { medal: 'bronze', previous: null, improved: true },
  );
  assert.equal(earnedMedalFor('juniper', 'clubsport', storage), 'bronze');
  assert.equal(earnedMedalFor('juniper', 'formula', storage), null);

  awardMedal('juniper', 'formula', formulaTargets.gold, {
    valid: true,
    timeTrial: true,
    storage,
  });
  awardMedal('juniper', 'clubsport', clubTargets.gold, {
    valid: true,
    timeTrial: true,
    storage,
  });
  awardMedal('juniper', 'clubsport', clubTargets.bronze, {
    valid: true,
    timeTrial: true,
    storage,
  });

  const reloaded = new MemoryStorage();
  reloaded.setItem(MEDAL_KEY, storage.getItem(MEDAL_KEY));
  assert.equal(earnedMedalFor('juniper', 'clubsport', reloaded), 'gold');
  assert.equal(earnedMedalFor('juniper', 'formula', reloaded), 'gold');
  assert.equal(readMedals(reloaded)['juniper:rally'], undefined);
});

test('malformed and unknown saved pairings are ignored', () => {
  const storage = new MemoryStorage();
  storage.setItem(
    MEDAL_KEY,
    JSON.stringify({
      'juniper:clubsport': 'gold',
      'unknown:clubsport': 'gold',
      'juniper:missing': 'silver',
      'juniper:sprint': 'platinum',
    }),
  );
  assert.deepEqual(readMedals(storage), { 'juniper:clubsport': 'gold' });
});
