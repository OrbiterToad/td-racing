import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRewind,
  resultEligible,
  restoreRewindFrame,
  selectRewindFrame,
} from '../src/rewind-core.js';

test('rewind selects a frame within the five second history bound', () => {
  const frames = Array.from({ length: 701 }, (_, index) => ({
    at: index / 100,
  }));
  assert.equal(selectRewindFrame(frames, 7).at, 2);
  assert.equal(selectRewindFrame(frames.slice(0, 251), 2.5).at, 0);
  assert.equal(selectRewindFrame([], 7), null);
});

test('rewind restores vehicle, lap, ghost, obstacle and traffic state', () => {
  const frame = {
    car: { x: 4, vx: 20 },
    race: { time: 3, next: 2 },
    timing: { splits: [1, 2] },
    jungle: { cooldown: 8, coconuts: [{ x: 9 }] },
    coastTime: 14,
    lapGhost: { frames: [{ x: 4 }], cursor: 1, previous: [4, 5, 0.2] },
    traffic: { cars: [{ x: 12 }], wait: 2 },
  };
  const targets = {
    car: {},
    race: {},
    timing: {},
    jungle: {},
    lapGhost: {},
    traffic: {},
    setCoastTime(time) {
      this.coastTime = time;
    },
  };
  restoreRewindFrame(frame, targets);
  assert.deepEqual(targets.car, frame.car);
  assert.deepEqual(targets.race, frame.race);
  assert.deepEqual(targets.timing, frame.timing);
  assert.deepEqual(targets.jungle, frame.jungle);
  assert.deepEqual(targets.lapGhost, frame.lapGhost);
  assert.deepEqual(targets.traffic, frame.traffic);
  assert.equal(targets.coastTime, 14);
  targets.car.x = 100;
  assert.equal(frame.car.x, 4);
});

test('flashback is limited to active solo practice and permanently taints results', () => {
  assert.equal(
    canRewind({
      competitive: false,
      paused: false,
      selecting: false,
      active: true,
      frames: 2,
    }),
    true,
  );
  assert.equal(
    canRewind({
      competitive: true,
      paused: false,
      selecting: false,
      active: true,
      frames: 2,
    }),
    false,
  );
  assert.equal(
    canRewind({
      competitive: false,
      paused: true,
      selecting: false,
      active: true,
      frames: 2,
    }),
    false,
  );
  assert.equal(
    canRewind({
      competitive: false,
      paused: false,
      selecting: true,
      active: true,
      frames: 2,
    }),
    false,
  );
  assert.equal(
    canRewind({
      competitive: false,
      paused: false,
      selecting: false,
      active: false,
      frames: 2,
    }),
    false,
  );
  assert.equal(resultEligible(false), true);
  assert.equal(resultEligible(true), false);
});
