import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTrack } from '../src/tracks.js';
import {
  createLocalRace,
  localPlayerTwoControls,
  updateLocalRace,
} from '../src/local-race.js';

test('local race gives Player 2 independent keyboard and gamepad controls', () => {
  configureTrack('juniper');
  const race = createLocalRace();
  race.countdown = 0;
  const p1 = { ...race.players[0] };
  const keys = new Set(['KeyI', 'KeyL']);
  const keyboard = localPlayerTwoControls(keys);
  assert.deepEqual(keyboard, {
    steer: 1,
    throttle: 1,
    brake: 0,
    handbrake: 0,
  });
  const gamepad = localPlayerTwoControls(new Set(), {
    steer: -0.5,
    throttle: 0.8,
    brake: 0.2,
    handbrake: 1,
  });
  assert.deepEqual(gamepad, {
    steer: -0.5,
    throttle: 0.8,
    brake: 0.2,
    handbrake: 1,
  });
  for (let frame = 0; frame < 60; frame++)
    updateLocalRace(race, 1 / 60, [null, keyboard]);
  assert.notEqual(race.players[1].x, race.players[0].x);
  assert.notEqual(race.players[1].y, race.players[0].y);
  assert.equal(race.players[0].x, p1.x);
  assert.equal(race.players[0].y, p1.y);
});
