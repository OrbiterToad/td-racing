import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDrivingAssists } from '../src/assists.js';
import { configureTrack, nearestDriving } from '../src/tracks.js';
import { track, state } from '../src/state.js';
import { GamepadInput } from '../src/gamepad.js';
import {
  createLocalRace,
  localRaceResults,
  localPlayerOneKeys,
  localPlayerTwoControls,
  pollSecondPlayer,
  resolveLocalCollision,
  updateLocalRace,
} from '../src/local-race.js';
import { resolveVehicleCollision } from '../src/vehicle-physics.js';

test('local race gives Player 2 independent keyboard and gamepad controls', () => {
  configureTrack('juniper');
  const race = createLocalRace();
  race.countdown = 0;
  const p1 = { ...race.players[0] };
  const keys = new Set(['ArrowUp', 'ArrowRight']);
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

test('second controller is reserved for Player 2', () => {
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

test('Player 2 shares the Player 1 driving assists and loses them when off', () => {
  configureTrack('juniper');
  const saved = { ...state.settings };
  const idle = localPlayerTwoControls(new Set());
  const run = (assists) => {
    Object.assign(state.settings, assists);
    const race = createLocalRace();
    race.countdown = 0;
    // Nudge Player 2 off the racing line so steering assist has work to do.
    const p2 = race.players[1];
    const frame = nearestDriving(p2.x, p2.y);
    p2.x += frame.nx * frame.road * 0.5;
    p2.y += frame.ny * frame.road * 0.5;
    const start = { x: p2.x, y: p2.y };
    const expected = applyDrivingAssists(idle, p2, state.settings);
    updateLocalRace(race, 1 / 60, [null, idle]);
    return { race, p2, start, expected };
  };
  try {
    const on = run({ autoAccelerate: true, steeringAssist: true });
    // Same helper Player 1 uses in physics `simulate`.
    assert.equal(on.expected.throttle, 1);
    assert.ok(on.expected.steer !== 0);
    assert.equal(on.p2.throttle > 0, true);
    for (let frame = 0; frame < 120; frame++)
      updateLocalRace(on.race, 1 / 60, [null, idle]);
    assert.ok(Math.hypot(on.p2.x - on.start.x, on.p2.y - on.start.y) > 20);
    const after = nearestDriving(on.p2.x, on.p2.y);
    const offset =
      (on.p2.x - after.x) * after.nx + (on.p2.y - after.y) * after.ny;
    const startFrame = nearestDriving(on.start.x, on.start.y);
    const startOffset =
      (on.start.x - startFrame.x) * startFrame.nx +
      (on.start.y - startFrame.y) * startFrame.ny;
    assert.ok(Math.abs(offset) < Math.abs(startOffset));

    const off = run({ autoAccelerate: false, steeringAssist: false });
    assert.deepEqual(
      { steer: off.expected.steer, throttle: off.expected.throttle },
      { steer: 0, throttle: 0 },
    );
    for (let frame = 0; frame < 120; frame++)
      updateLocalRace(off.race, 1 / 60, [null, idle]);
    assert.ok(Math.hypot(off.p2.x - off.start.x, off.p2.y - off.start.y) < 1);
  } finally {
    Object.assign(state.settings, saved);
  }
});

test('split screen gives WASD to Player 1 and the arrow keys to Player 2 only', () => {
  const arrows = new Set(['ArrowUp', 'ArrowLeft', 'ArrowDown']);
  const wasd = new Set(['KeyW', 'KeyA', 'KeyS']);
  assert.deepEqual(localPlayerOneKeys(arrows, true), {
    up: false,
    down: false,
    left: false,
    right: false,
  });
  assert.deepEqual(localPlayerOneKeys(wasd, true), {
    up: true,
    down: true,
    left: true,
    right: false,
  });
  // Single-player keeps both key sets.
  assert.deepEqual(localPlayerOneKeys(arrows, false), {
    up: true,
    down: true,
    left: true,
    right: false,
  });
  assert.deepEqual(localPlayerTwoControls(wasd), {
    steer: 0,
    throttle: 0,
    brake: 0,
    handbrake: 0,
  });
  assert.deepEqual(localPlayerTwoControls(new Set(['KeyI', 'KeyJ', 'KeyK'])), {
    steer: 0,
    throttle: 0,
    brake: 0,
    handbrake: 0,
  });
  assert.deepEqual(localPlayerTwoControls(arrows), {
    steer: -1,
    throttle: 1,
    brake: 1,
    handbrake: 0,
  });
});

test('Player 2 can use any car and paint', () => {
  const race = createLocalRace(
    state.activeCar,
    { ...state.activeCar, id: 'formula' },
    'red',
    'yellow',
  );
  assert.equal(race.carSpecs[1].id, 'formula');
  assert.deepEqual(race.paints, ['red', 'yellow']);
});

test('the two player cars collide instead of driving through each other', () => {
  configureTrack('juniper');
  const race = createLocalRace();
  race.countdown = 0;
  const p2 = race.players[1];
  const frame = nearestDriving(p2.x, p2.y);
  const heading = Math.atan2(frame.ty, frame.tx);
  // Player 1 sits stationary a few metres ahead of Player 2 in the same lane.
  const primary = {
    ...race.players[0],
    x: p2.x + Math.cos(heading) * 60,
    y: p2.y + Math.sin(heading) * 60,
    angle: heading,
    vx: 0,
    vy: 0,
  };
  Object.assign(p2, { angle: heading, vx: 0, vy: 0 });
  const full = { steer: 0, throttle: 1, brake: 0, handbrake: 0 };
  let contact = false;
  for (let i = 0; i < 180; i++) {
    updateLocalRace(race, 1 / 60, [null, full], primary);
    // After each step the shared resolver leaves no overlap behind.
    assert.equal(
      resolveVehicleCollision(
        { ...primary },
        { ...p2 },
        race.carSpecs[0],
        race.carSpecs[1],
      ) < 0.5,
      true,
    );
    if (Math.hypot(primary.vx, primary.vy) > 1) contact = true;
  }
  // Player 2 pushed Player 1 forward rather than passing through it.
  assert.ok(contact);
  const along = (car) =>
    (car.x - p2.x) * Math.cos(heading) + (car.y - p2.y) * Math.sin(heading);
  assert.ok(along(primary) > 0);

  // The resolver separates two cars placed on top of each other.
  const a = { ...primary, vx: 0, vy: 0 };
  const b = { ...primary, x: primary.x + 5, vx: -50, vy: 0 };
  const overlap = resolveLocalCollision(
    { players: [null, b], carSpecs: race.carSpecs },
    a,
  );
  assert.ok(overlap > 0);
  assert.ok(Math.hypot(b.x - a.x, b.y - a.y) > 5);
});
