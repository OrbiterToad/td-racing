import assert from 'node:assert/strict';
import test from 'node:test';
import { driveVehicle } from '../src/vehicle-physics.js';
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

// These are the alternating apex sections on both dockside banks. The spline
// is sampled at 40 points per control link by the production track builder.
const driftSections = [2, 3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 19];

test('Neon dockside sections have rounded low-radius corners and clear runoff', () => {
  configureTrack('drift');
  for (const section of driftSections) {
    const i = section * 40;
    const a = track[i - 1];
    const b = track[i + 1];
    const turn = Math.atan2(
      a.tx * b.ty - a.ty * b.tx,
      a.tx * b.tx + a.ty * b.ty,
    );
    const radius = Math.hypot(b.x - a.x, b.y - a.y) / Math.abs(turn);
    assert.ok(
      radius > CFG.wall + 25 && radius < 480,
      `section ${section}: radius ${radius}`,
    );
  }
  for (let i = 0; i < track.length; i++) {
    const a = track[i];
    const b = track[(i + 1) % track.length];
    const turn = Math.abs(
      Math.atan2(a.tx * b.ty - a.ty * b.tx, a.tx * b.tx + a.ty * b.ty),
    );
    assert.ok(turn < 0.07, 'adjacent route tangents remain smooth');
    for (let j = i + 1; j < track.length; j++) {
      const b = track[j];
      const along = Math.min(b.s - a.s, track.totalLength - (b.s - a.s));
      if (along < CFG.wall * 3) continue;
      assert.ok(
        Math.hypot(b.x - a.x, b.y - a.y) > CFG.wall * 2 + 30,
        'distant route sections keep separate runoff corridors',
      );
    }
  }
});

test('the drift coupe connects every rounded section in a moving full lap', () => {
  configureTrack('drift');
  configureCar('drift');
  const start = pointOnTrack(1);
  const body = {
    x: start.x,
    y: start.y,
    angle: Math.atan2(start.ty, start.tx),
    vx: start.tx * 260,
    vy: start.ty * 260,
    yaw: 0,
  };
  const visited = new Set();
  const sliding = new Set();
  let travelled = 1;
  let previous = 1;
  for (let step = 0; step < 120 * 75 && travelled < track.totalLength; step++) {
    const nearest = nearestDriving(body.x, body.y);
    const a = track[nearest.i];
    const b = track[(nearest.i + 1) % track.length];
    const distance = a.s + nearest.t * Math.hypot(b.x - a.x, b.y - a.y);
    let delta = distance - previous;
    if (delta < -track.totalLength / 2) delta += track.totalLength;
    travelled += delta;
    previous = distance;
    const target = pointOnTrack(distance + 130);
    const heading =
      Math.atan2(target.y - body.y, target.x - body.x) - body.angle;
    const error = Math.atan2(Math.sin(heading), Math.cos(heading));
    const speed = Math.hypot(body.vx, body.vy);
    const drive = driveVehicle(
      body,
      {
        steer: error * 2.8,
        throttle: speed < 290 ? 1 : 0,
        brake: speed > 310 ? 1 : 0,
        handbrake: 0,
      },
      CFG.step,
      VEHICLES.drift,
    );
    assert.ok(speed > 220, 'linked sections never require a stop or crawl');
    assert.equal(drive.impact, 0, 'full lap avoids barrier impacts');
    assert.ok(
      nearest.distance < CFG.road - VEHICLES.drift.width,
      'slides retain road clearance',
    );
    const section = Math.round(nearest.i / 40);
    visited.add(section);
    if (Math.abs(drive.lateral) > 25) sliding.add(section);
  }
  assert.ok(
    travelled >= track.totalLength,
    'complete the lap within 75 seconds',
  );
  for (const section of driftSections)
    assert.ok(visited.has(section), `drive section ${section}`);
  for (const section of [3, 4, 5, 6, 14, 15, 16, 17])
    assert.ok(
      sliding.has(section),
      `hold powered slides through linked section ${section}`,
    );
});
