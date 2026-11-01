import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDeadzone, GamepadInput, mapGamepad } from '../src/gamepad.js';

function pad({ axes = [0, 0], pressed = [], values = [] } = {}) {
  return {
    connected: true,
    index: 0,
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({
      pressed: pressed.includes(index),
      value: values[index] || (pressed.includes(index) ? 1 : 0),
    })),
  };
}

test('gamepad mapping applies a rescaled stick dead zone and maps driving controls', () => {
  assert.equal(applyDeadzone(0.1), 0);
  assert.equal(applyDeadzone(-1), -1);
  const controls = mapGamepad(
    pad({ axes: [0.58, 0.8], values: { 7: 0.65, 6: 0.3 }, pressed: [4] }),
  );
  assert.ok(Math.abs(controls.steer - 0.5) < 1e-9);
  assert.ok(Math.abs(controls.brake - (0.8 - 0.16) / 0.84) < 1e-9);
  assert.equal(controls.throttle, 0.65);
  assert.equal(controls.handbrake, 1);
});

test('button and directional actions fire once per press and again after release', () => {
  const input = new GamepadInput();
  const held = pad({ pressed: [0, 9, 15] });
  assert.deepEqual(input.update([held], 300).actions, [
    'confirm',
    'pause',
    'next',
  ]);
  assert.deepEqual(input.update([held], 320).actions, []);
  input.update([pad()], 340);
  assert.deepEqual(input.update([held], 360).actions, [
    'confirm',
    'pause',
    'next',
  ]);
});

test('disconnect clears drive controls and reconnect begins with fresh button edges', () => {
  const input = new GamepadInput();
  input.update([pad({ axes: [0.8, -1], pressed: [0] })], 300);
  const disconnected = { ...pad(), connected: false };
  assert.deepEqual(input.update([disconnected], 600), {
    connected: false,
    actions: [],
    controls: { steer: 0, throttle: 0, brake: 0, handbrake: 0 },
  });
  assert.deepEqual(input.update([pad({ pressed: [0] })], 900).actions, [
    'confirm',
  ]);
});
