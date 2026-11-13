import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AI_DIFFICULTIES, aiDifficulty } from '../src/ai-racecraft.js';
import { configureCar } from '../src/cars.js';
import { CFG, MAPS, VEHICLES } from '../src/config.js';
import {
  resetOpponentRace,
  positionOpponent,
  updateOpponents,
  resolveOpponentCollisions,
} from '../src/opponents.js';
import { car, opponentRace, race, state, track } from '../src/state.js';
import { configureTrack, nearestDriving, pointOnTrack } from '../src/tracks.js';

test('difficulty defaults and tuning leave player specifications untouched', () => {
  const before = JSON.stringify(VEHICLES);
  assert.equal(opponentRace.difficulty, 'normal');
  assert.equal(aiDifficulty('invalid'), AI_DIFFICULTIES.normal);
  assert.deepEqual(Object.keys(AI_DIFFICULTIES), ['easy', 'normal', 'hard']);
  assert(AI_DIFFICULTIES.easy.pace < AI_DIFFICULTIES.normal.pace);
  assert(AI_DIFFICULTIES.normal.pace < AI_DIFFICULTIES.hard.pace);
  assert.equal(JSON.stringify(VEHICLES), before);
});

function setup(map, vehicle, difficulty = 'normal') {
  configureCar(vehicle, 'red');
  configureTrack(map);
  Object.assign(opponentRace, { enabled: true, difficulty });
  resetOpponentRace();
  race.countdown = 0;
  Object.assign(car, { x: 1e6, y: 1e6, vx: 0, vy: 0 });
}

test('difficulty changes measured progress with repeatable starts and unchanged player state', () => {
  const progress = [];
  for (const difficulty of Object.keys(AI_DIFFICULTIES)) {
    const runs = [];
    for (let run = 0; run < 2; run++) {
      setup('juniper', 'clubsport', difficulty);
      const player = JSON.stringify(car),
        spec = state.activeCar;
      for (let i = 0; i < 600; i++) updateOpponents(1 / 60);
      runs.push(
        opponentRace.cars.map((rival) => [rival.s, rival.vx, rival.vy]),
      );
      assert.equal(JSON.stringify(car), player);
      assert.equal(state.activeCar, spec);
    }
    assert.deepEqual(runs[0], runs[1]);
    progress.push(runs[0][0][0]);
  }
  assert(progress[0] < progress[1] && progress[1] < progress[2]);
});

for (const difficulty of Object.keys(AI_DIFFICULTIES)) {
  for (const map of Object.keys(MAPS)) {
    test(`full AI vehicle roster completes three laps on ${map} at ${difficulty}`, () => {
      // Run each supported spec against the actual controller, track surfaces and barriers.
      for (const vehicle of Object.keys(VEHICLES)) {
        setup(map, vehicle, difficulty);
        assert.equal(opponentRace.enabled, true);
        assert.equal(opponentRace.cars[0].vehicleId, vehicle);
        const rival = opponentRace.cars[0];
        opponentRace.cars = [rival];
        let checkpoint = rival.s;
        for (
          let step = 0;
          step < 2700 / CFG.step && rival.finish === null;
          step++
        ) {
          updateOpponents(CFG.step);
          assert(
            Number.isFinite(rival.x + rival.y + rival.speed),
            `${map}/${vehicle}: finite`,
          );
          if (step % Math.round(1 / CFG.step) === Math.round(1 / CFG.step) - 1)
            assert(
              nearestDriving(rival.x, rival.y).distance <
                MAPS[map].road - VEHICLES[vehicle].width / 2,
              `${map}/${vehicle}: on route`,
            );
          if (
            step % Math.round(30 / CFG.step) ===
            Math.round(30 / CFG.step) - 1
          ) {
            assert(
              rival.s > checkpoint + 50,
              `${map}/${vehicle}: progress at ${rival.s}`,
            );
            checkpoint = rival.s;
          }
        }
        assert(
          rival.finish > 0,
          `${map}/${vehicle}: completed at ${rival.s / track.totalLength} laps`,
        );
        assert.equal(rival.s, track.totalLength * 3);
      }
    });
  }
}

test('mixed roster cycles specs and collision dispatch uses each footprint', () => {
  setup('juniper', 'formula');
  opponentRace.grid = 'mixed';
  resetOpponentRace();
  assert.deepEqual(
    opponentRace.cars.map((r) => r.vehicleId),
    ['formula', 'clubsport', 'sprint'],
  );
  const p = pointOnTrack(500);
  const [a, b] = opponentRace.cars;
  opponentRace.cars = [a, b];
  for (const r of [a, b])
    Object.assign(r, {
      x: p.x,
      y: p.y,
      angle: Math.atan2(p.ty, p.tx),
      vx: 0,
      vy: 0,
    });
  b.x += p.tx * 42;
  b.y += p.ty * 42;
  resolveOpponentCollisions();
  const gap = (b.x - a.x) * p.tx + (b.y - a.y) * p.ty;
  assert(
    gap >= (VEHICLES.formula.length + VEHICLES.clubsport.length) / 2 - 1e-6,
  );
  assert.equal(a.vx + a.vy + b.vx + b.vy, 0);
  opponentRace.grid = 'matched';
});

test('AI progress follows physical distance on unevenly spaced track segments', () => {
  for (const map of Object.keys(MAPS)) {
    setup(map, 'clubsport');
    const rival = opponentRace.cars[0];
    opponentRace.cars = [rival];
    for (const fraction of [0.2, 0.5, 0.8]) {
      const distance = fraction * track.totalLength;
      Object.assign(rival, {
        s: distance,
        trackS: distance,
        vx: 0,
        vy: 0,
        speed: 0,
        yaw: 0,
        steer: 0,
      });
      positionOpponent(rival);
      const before = { x: rival.x, y: rival.y };
      updateOpponents(1 / 60);
      assert(Math.abs(rival.s - distance) < 1, `${map}: no progress jump`);
      assert(
        Math.hypot(rival.x - before.x, rival.y - before.y) < 1,
        `${map}: no physical jump`,
      );
    }
  }
});
