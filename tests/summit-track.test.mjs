import assert from 'node:assert/strict';
import test from 'node:test';
import { configureCar } from '../src/cars.js';
import { CFG, MAPS, VEHICLES } from '../src/config.js';
import { startingGrid, state, track } from '../src/state.js';
import {
  configureTrack,
  nearest,
  nearestDriving,
  pointOnTrack,
  sampleCurve,
  timingGateHalfWidth,
  widthAt,
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

  const chicane = sampleCurve(map.points).slice(16 * 40, 21 * 40);
  const turnDirections = [];
  for (let i = 0; i < chicane.length; i++) {
    const previous = chicane[(i + chicane.length - 1) % chicane.length];
    const current = chicane[i];
    const next = chicane[(i + 1) % chicane.length];
    const cross =
      (current.x - previous.x) * (next.y - current.y) -
      (current.y - previous.y) * (next.x - current.x);
    if (Math.abs(cross) < 1e-5) continue;
    const direction = Math.sign(cross);
    if (turnDirections.at(-1) !== direction) turnDirections.push(direction);
  }
  assert.ok(
    turnDirections.length >= 4,
    'the infield chicane links several direction changes',
  );

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

// Rails are painted at the wall offset from the centerline; on tight bends or
// where two parts of the circuit run close together that offset can fold back
// across the asphalt. Every rail point must sit on the collision boundary.
test('barrier rails follow the road edge without crossing the circuit', () => {
  const originalTrack = state.activeMap.id;
  for (const id of Object.keys(MAPS)) {
    assert.equal(configureTrack(id), true);
    for (const side of [-1, 1])
      for (let i = 0; i < track.length; i++) {
        const p = track[i],
          wall = widthAt('wall', i / track.length),
          x = p.x + p.nx * wall * side,
          y = p.y + p.ny * wall * side,
          n = nearest(x, y);
        assert.ok(
          n.distance > wall - 3,
          `${id} rail ${side} at sample ${i} lies ${Math.round(wall - n.distance)}px inside the corridor`,
        );
        assert.ok(n.distance > widthAt('runoff', n.progress));
      }
  }
  configureTrack(originalTrack);
});
