import assert from 'node:assert/strict';
import test from 'node:test';
import { configureTrack } from '../src/tracks.js';
import { track, state } from '../src/state.js';
import { GamepadInput } from '../src/gamepad.js';
import {
  createLocalRace,
  localRaceResults,
  localPlayerTwoControls,
  localViewport,
  pollSecondPlayer,
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

test('second controller is reserved for Player 2 and viewports track each car', () => {
  state.gamepadInput = new GamepadInput();
  state.gamepadInput.padIndex = 0;
  const race = createLocalRace();
  const first = { index: 0, connected: true, axes: [0, 0], buttons: [] };
  const second = {
    index: 1,
    connected: true,
    axes: [-0.8, 0],
    buttons: Array.from({ length: 8 }, (_, i) => ({ value: i === 7 ? 1 : 0 })),
  };
  const controls = pollSecondPlayer(race, [first, second], 300);
  assert.equal(race.pad.padIndex, 1);
  assert.ok(controls.steer < -0.5);
  assert.equal(controls.throttle, 1);

  const bounds = { x: 0, y: 0, width: 4000, height: 3000 };
  const view1 = localViewport({ x: 700, y: 800 }, bounds, 600, 800);
  const view2 = localViewport({ x: 2500, y: 1700 }, bounds, 600, 800);
  assert.notEqual(view1.sx, view2.sx);
  assert.notEqual(view1.sy, view2.sy);
});

test('three-lap finish order records both finish times and reset creates a fresh grid', () => {
  configureTrack('juniper');
  const race = createLocalRace();
  race.countdown = 0;
  const linePoint = track[5];
  const p1 = race.players[0],
    p2 = race.players[1];
  Object.assign(p1, {
    x: linePoint.x,
    y: linePoint.y,
    progress: 0.99,
    elapsed: 20,
    lap: 3,
  });
  Object.assign(p2, {
    x: linePoint.x,
    y: linePoint.y,
    progress: 0.99,
    elapsed: 22,
    lap: 3,
  });
  updateLocalRace(race, 1 / 60, [{}, {}], p1);
  assert.deepEqual(race.order, [0, 1]);
  assert.equal(race.finished, true);
  assert.ok(p1.finishedAt > 20);
  assert.ok(p2.finishedAt > p1.finishedAt);
  assert.deepEqual(localRaceResults(race), [
    `1. PLAYER 1 · ${p1.finishedAt.toFixed(2)}s`,
    `2. PLAYER 2 · ${p2.finishedAt.toFixed(2)}s`,
  ]);
  const fresh = createLocalRace();
  assert.equal(fresh.countdown, 3);
  assert.deepEqual(fresh.order, []);
  assert.equal(fresh.players[1].vx, 0);
});
