import assert from 'node:assert/strict';
import test from 'node:test';
import { configureCar } from '../src/cars.js';
import { CFG, MAPS, VEHICLES } from '../src/config.js';
import { state, track } from '../src/state.js';
import { configureTrack, nearestDriving, pointOnTrack } from '../src/tracks.js';

test('Neon Harbor has flowing links and a safe linked chicane for every car', () => {
  const originalTrack = state.activeMap.id;
  const originalCar = state.activeCar.id;
  assert.equal(configureTrack('drift'), true);

  const map = MAPS.drift;
  const longestControlLink = Math.max(
    ...map.points.map((point, i) => {
      const next = map.points[(i + 1) % map.points.length];
      return Math.hypot(next[0] - point[0], next[1] - point[1]);
    }),
  );
  assert.ok(longestControlLink >= 900, 'the route needs a flowing section');
  assert.ok(track.totalLength > 9500, 'the route must fill a complete lap');
  assert.ok(CFG.road < CFG.runoff && CFG.runoff < CFG.wall);

  const turns = map.points.map((point, i) => {
    const previous =
      map.points[(i + map.points.length - 1) % map.points.length];
    const next = map.points[(i + 1) % map.points.length];
    return Math.sign(
      (point[0] - previous[0]) * (next[1] - point[1]) -
        (point[1] - previous[1]) * (next[0] - point[0]),
    );
  });
  let alternating = 1;
  let longestAlternating = 1;
  for (let i = 1; i < turns.length; i++) {
    alternating = turns[i] !== turns[i - 1] ? alternating + 1 : 1;
    longestAlternating = Math.max(longestAlternating, alternating);
  }
  assert.ok(
    longestAlternating >= 4,
    'the route needs a linked alternating chicane section',
  );

  for (const carId of Object.keys(VEHICLES)) {
    assert.equal(configureCar(carId), true);
    for (const progress of [0, 0.2, 0.4, 0.6, 0.8]) {
      const point = pointOnTrack(track.totalLength * progress);
      const nearest = nearestDriving(point.x, point.y);
      assert.ok(
        nearest.distance < 2,
        'the route must be continuously drivable',
      );
      assert.ok(
        nearest.wall > VEHICLES[carId].width,
        'runoff must fit every supported car',
      );
    }
  }

  configureCar(originalCar);
  configureTrack(originalTrack);
});
