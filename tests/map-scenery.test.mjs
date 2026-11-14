import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAPS,
  MAP_SCENERY_ASSETS,
  SCENERY_ASSETS,
  mapBaseId,
} from '../src/config.js';
import { sceneryAccess, sceneryDetails, sceneryScene } from '../src/state.js';
import {
  buildSceneryDetails,
  sceneryAccessDistance,
  sceneryClear,
} from '../src/scenery.js';
import { configureTrack, nearest, widthAt } from '../src/tracks.js';

test('every map generates its own deterministic landmarks outside racing space', () => {
  assert.deepEqual(
    Object.keys(MAP_SCENERY_ASSETS),
    Object.keys(MAPS).filter((id) => mapBaseId(MAPS[id]) === id),
  );
  const allCustomAssets = Object.values(MAP_SCENERY_ASSETS).flat();
  assert.equal(new Set(allCustomAssets).size, allCustomAssets.length);

  for (const [mapId, map] of Object.entries(MAPS)) {
    const required = MAP_SCENERY_ASSETS[mapBaseId(map)];
    assert.equal(required.length, 2, `${map.name} should define two landmarks`);
    assert(
      required.every((asset) => SCENERY_ASSETS.includes(asset)),
      `${map.name} landmarks must be registered for loading`,
    );

    assert.equal(configureTrack(mapId), true);
    const landmarks = sceneryDetails.filter(({ kind }) =>
      required.includes(kind),
    );
    for (const asset of required) {
      assert(
        landmarks.some(({ kind }) => kind === asset),
        `${map.name} should generate ${asset}`,
      );
    }
    assert(
      sceneryDetails.every(
        ({ kind }) =>
          !allCustomAssets.includes(kind) || required.includes(kind),
      ),
      `${map.name} must not generate another map's landmarks`,
    );

    for (const landmark of landmarks) {
      const { x, y, radius } = landmark;
      assert.equal(sceneryClear(x, y, radius), true);
      const road = nearest(x, y);
      assert(
        road.distance >= widthAt('wall', road.progress) + radius + 24,
        `${landmark.kind} overlaps the track clearance on ${map.name}`,
      );
      assert(
        sceneryAccess.every(
          (access) =>
            sceneryAccessDistance(access, x, y) >=
            radius + access.width / 2 + 8,
        ),
        `${landmark.kind} blocks a service path on ${map.name}`,
      );
      assert(
        sceneryScene.every(
          (other) =>
            other === landmark ||
            Math.hypot(other.x - x, other.y - y) >= other.radius + radius + 8,
        ),
        `${landmark.kind} overlaps other scenery on ${map.name}`,
      );
    }

    const firstLayout = landmarks.map(({ kind, x, y, angle }) => [
      kind,
      x,
      y,
      angle,
    ]);
    buildSceneryDetails();
    const secondLayout = sceneryDetails
      .filter(({ kind }) => required.includes(kind))
      .map(({ kind, x, y, angle }) => [kind, x, y, angle]);
    assert.deepEqual(secondLayout, firstLayout, `${map.name} layout is stable`);
  }
});
