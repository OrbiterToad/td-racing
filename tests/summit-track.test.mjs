import assert from 'node:assert/strict';
import test from 'node:test';
import { configureCar } from '../src/cars.js';
import { CFG, MAPS, VEHICLES } from '../src/config.js';
import { startingGrid, state, track } from '../src/state.js';
import {
  configureTrack,
  nearestDriving,
  pointOnTrack,
  timingGateHalfWidth,
} from '../src/tracks.js';

test('Summit Grand Prix builds a wide, complete route for every car', () => {
  const originalTrack = state.activeMap.id;
  const originalCar = state.activeCar.id;
  assert.equal(configureTrack('summit'), true);

  const map = MAPS.summit;
  const longestStraight = Math.max(
    ...map.points.map((point, i) => {
      const next = map.points[(i + 1) % map.points.length];
      return Math.hypot(next[0] - point[0], next[1] - point[1]);
    }),
  );
  assert.ok(
    longestStraight >= 800,
    'the route includes a long full-throttle straight',
  );
  assert.ok(track.totalLength > 8000, 'the circuit has a full Grand Prix lap');
  assert.ok(CFG.road < CFG.runoff && CFG.runoff < CFG.wall);
  assert.equal(startingGrid.length, 6);
  assert.ok(timingGateHalfWidth(0) > CFG.runoff);

  for (const carId of Object.keys(VEHICLES)) {
    assert.equal(configureCar(carId), true);
    for (const progress of [0, 0.25, 0.5, 0.75]) {
      const gate = pointOnTrack(track.totalLength * progress);
      const nearest = nearestDriving(gate.x, gate.y);
      assert.ok(Number.isFinite(nearest.progress));
      assert.ok(nearest.distance < 2);
      assert.ok(nearest.wall > VEHICLES[carId].width);
    }
  }

  configureCar(originalCar);
  configureTrack(originalTrack);
});
