import test from 'node:test';
import assert from 'node:assert/strict';
import { lapCoachingDelta } from '../src/lap-coaching.js';
import { bestKeyFor } from '../src/cars.js';
import { MAPS, VEHICLES } from '../src/config.js';

const best = [18, 19, 20, 21];

test('lap delta accumulates completed sectors against the paired best sectors', () => {
  assert.ok(Math.abs(lapCoachingDelta([], best, 8.75, 0.125) + 0.25) < 1e-9);
  assert.ok(Math.abs(lapCoachingDelta([18.1], best, 27.1, 0.375) + 0.4) < 1e-9);
  assert.ok(Math.abs(lapCoachingDelta([18, 19, 20], best, 67.5, 0.875)) < 1e-9);
});

test('lap delta has no comparison until a valid reference sector is completed', () => {
  assert.equal(lapCoachingDelta([], best, 0, 0), null);
  assert.equal(lapCoachingDelta([18], [], 18, 0.25), null);
  assert.equal(lapCoachingDelta([18], [18, 19, 20], 20, 0.3), null);
  assert.equal(lapCoachingDelta([0], best, 1, 0.25), null);
  assert.equal(lapCoachingDelta([18, NaN], best, 20, 0.3), null);
});

test('best reference keys stay paired to the selected track and car', () => {
  const reference = bestKeyFor(MAPS.juniper, VEHICLES.clubsport);
  assert.equal(reference, bestKeyFor(MAPS.juniper, VEHICLES.clubsport));
  assert.notEqual(reference, bestKeyFor(MAPS.canyon, VEHICLES.clubsport));
  assert.notEqual(reference, bestKeyFor(MAPS.juniper, VEHICLES.formula));
});
