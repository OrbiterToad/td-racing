import assert from 'node:assert/strict';
import test from 'node:test';
import { CONDITIONS, conditionFor, drawWeather } from '../src/weather.js';
import { configureTrack, pointOnTrack } from '../src/tracks.js';
import { MAPS } from '../src/config.js';
import { configureCar } from '../src/cars.js';
import { driveVehicle } from '../src/vehicle-physics.js';
import { resetOpponentRace, updateOpponents } from '../src/opponents.js';
import { car, opponentRace, race, state } from '../src/state.js';

function setup(condition) {
  state.condition = condition;
  configureCar('clubsport');
  configureTrack('juniper');
}
function vehicle() {
  const p = pointOnTrack(400);
  return {
    x: p.x,
    y: p.y,
    angle: Math.atan2(p.ty, p.tx),
    vx: p.tx * 100 - p.ty * 30,
    vy: p.ty * 100 + p.tx * 30,
    yaw: 0,
    steer: 0,
  };
}

test('fixed condition selection is validated and clear preserves baseline', () => {
  assert.deepEqual(Object.keys(CONDITIONS), ['clear', 'rain', 'snow']);
  assert.equal(conditionFor('invalid'), CONDITIONS.clear);
  assert.equal(conditionFor('__proto__'), CONDITIONS.clear);
  setup('clear');
  const a = vehicle();
  const clear = driveVehicle(a, { throttle: 1 }, 1 / 60);
  setup(undefined);
  const b = vehicle();
  driveVehicle(b, { throttle: 1 }, 1 / 60);
  assert.deepEqual(a, b);
  assert.equal(clear.grip, state.activeCar.grip);
});

test('rain and snow reduce measured lateral grip, acceleration and braking in order', () => {
  const runs = Object.keys(CONDITIONS).map((condition) => {
    setup(condition);
    const a = vehicle();
    const lateral = driveVehicle(a, {}, 1 / 60);
    const accelerating = driveVehicle(vehicle(), { throttle: 1 }, 1 / 60);
    const braking = driveVehicle(vehicle(), { brake: 1 }, 1 / 60);
    return { lateral, accelerating, braking };
  });
  for (let i = 1; i < runs.length; i++) {
    assert(runs[i].lateral.grip < runs[i - 1].lateral.grip);
    assert(runs[i].lateral.lateral > runs[i - 1].lateral.lateral);
    assert(runs[i].accelerating.forward < runs[i - 1].accelerating.forward);
    assert(runs[i].braking.forward > runs[i - 1].braking.forward);
  }
});

for (const condition of Object.keys(CONDITIONS)) {
  test(`${condition}: AI uses exactly the player force model and remains deterministic`, () => {
    const runs = [];
    for (let run = 0; run < 2; run++) {
      setup(condition);
      opponentRace.enabled = true;
      resetOpponentRace();
      race.countdown = 0;
      car.x = car.y = 1e6;
      const rival = opponentRace.cars[0];
      opponentRace.cars = [rival];
      const player = { ...rival };
      updateOpponents(1 / 60);
      const steer =
        rival.steer /
        (1 - Math.exp(-(state.activeCar.steerResponse || 9) / 60));
      driveVehicle(
        player,
        { steer, throttle: rival.throttle, brake: rival.brake },
        1 / 60,
      );
      for (const key of ['x', 'y', 'vx', 'vy', 'angle', 'yaw'])
        assert(Math.abs(player[key] - rival[key]) < 1e-10, key);
      for (let frame = 0; frame < 1200; frame++) updateOpponents(1 / 60);
      assert(rival.s > 100, 'AI makes progress');
      assert(Number.isFinite(rival.x + rival.y + rival.speed));
      runs.push([rival.x, rival.y, rival.s, rival.speed]);
    }
    assert.deepEqual(runs[0], runs[1]);
  });
}

test('weather visuals differ, clear draws nothing, and reduced motion freezes precipitation', () => {
  const commands = (condition, time, reduced) => {
    const result = [];
    const c = new Proxy(
      {},
      {
        set(target, key, value) {
          result.push([key, value]);
          target[key] = value;
          return true;
        },
        get(target, key) {
          return target[key] || ((...args) => result.push([key, ...args]));
        },
      },
    );
    drawWeather(
      c,
      condition,
      { x: 0, y: 0, width: 300, height: 200 },
      time,
      reduced,
    );
    return result;
  };
  assert.deepEqual(commands('clear', 0, false), []);
  assert.notDeepEqual(commands('rain', 0, false), commands('snow', 0, false));
  assert.notDeepEqual(commands('rain', 0, false), commands('rain', 1, false));
  assert.deepEqual(commands('snow', 0, true), commands('snow', 1, true));
});

for (const condition of ['rain', 'snow']) {
  for (const map of Object.keys(MAPS)) {
    test(`${condition}: AI completes a lap on ${map}`, () => {
      setup(condition);
      configureTrack(map);
      Object.assign(opponentRace, { enabled: true, laps: 1 });
      resetOpponentRace();
      race.countdown = 0;
      car.x = car.y = 1e6;
      const rival = opponentRace.cars[0];
      opponentRace.cars = [rival];
      for (let frame = 0; frame < 60 * 1800 && rival.finish === null; frame++)
        updateOpponents(1 / 60);
      assert(
        rival.finish > 0,
        'completed a full lap using shared weather physics',
      );
    });
  }
}
