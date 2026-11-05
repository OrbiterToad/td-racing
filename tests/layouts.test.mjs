import assert from 'node:assert/strict';
import test from 'node:test';

import { bestKeyFor } from '../src/cars.js';
import { MAPS, VEHICLES, mapBaseId } from '../src/config.js';
import { sampleMap } from '../src/tracks.js';

const baseIds = Object.keys(MAPS).filter((id) => !id.includes(':'));

test('every circuit exposes forward, reverse, and mirrored layouts', () => {
  assert.equal(baseIds.length, 7);
  for (const id of baseIds) {
    const base = MAPS[id];
    const reverse = MAPS[`${id}:reverse`];
    const mirrored = MAPS[`${id}:mirrored`];
    assert.equal(base.variant, 'forward');
    assert.equal(mapBaseId(reverse), id);
    assert.equal(mapBaseId(mirrored), id);
    assert.match(reverse.name, /Reverse/);
    assert.match(mirrored.name, /Mirrored/);
    assert.notEqual(reverse.bestKey, base.bestKey);
    assert.notEqual(mirrored.bestKey, base.bestKey);
  }
});

test('alternate layouts keep traversable geometry and transform hazards', () => {
  for (const id of baseIds) {
    const base = MAPS[id];
    for (const variant of ['reverse', 'mirrored']) {
      const map = MAPS[`${id}:${variant}`];
      const samples = sampleMap(map, 8);
      assert.equal(samples.length > 0, true);
      assert.equal(
        samples.every((point) => [point.x, point.y].every(Number.isFinite)),
        true,
      );
      assert.equal(map.points.length, base.points.length);
      assert.equal(map.patches.length, base.patches.length);
      for (const patch of map.patches)
        assert.equal(patch.progress >= 0 && patch.progress <= 1, true);
    }
    if (base.points.length) {
      assert.deepEqual(MAPS[`${id}:reverse`].points[0], base.points.at(-1));
      assert.deepEqual(MAPS[`${id}:mirrored`].points[0], [
        -base.points[0][0],
        base.points[0][1],
      ]);
    }
  }
});

test('layout records stay isolated for each car and variant', () => {
  for (const id of baseIds) {
    const keys = [id, `${id}:reverse`, `${id}:mirrored`].flatMap((layout) =>
      Object.values(VEHICLES).map((vehicle) =>
        bestKeyFor(MAPS[layout], vehicle),
      ),
    );
    assert.equal(new Set(keys).size, keys.length);
  }
});
