import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../src/settings-preferences.js';

function storage(value = null) {
  return {
    value,
    getItem() {
      return this.value;
    },
    setItem(_key, next) {
      this.value = next;
    },
  };
}

test('driving assists default to off and are independently persisted', () => {
  const target = storage();
  assert.equal(DEFAULT_SETTINGS.steeringAssist, false);
  assert.equal(DEFAULT_SETTINGS.autoAccelerate, false);
  assert.deepEqual(loadSettings(target), {
    ...DEFAULT_SETTINGS,
    reducedMotionSaved: false,
  });

  saveSettings(
    {
      ...DEFAULT_SETTINGS,
      steeringAssist: true,
      autoAccelerate: false,
    },
    target,
  );
  assert.deepEqual(loadSettings(target), {
    ...DEFAULT_SETTINGS,
    steeringAssist: true,
    reducedMotionSaved: false,
  });
});

test('invalid assist preference values fall back to off', () => {
  const target = storage(
    JSON.stringify({ steeringAssist: 'yes', autoAccelerate: 1 }),
  );
  const settings = loadSettings(target);
  assert.equal(settings.steeringAssist, false);
  assert.equal(settings.autoAccelerate, false);
});
