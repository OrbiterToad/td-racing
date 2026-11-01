import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLapGhost, serializeLapGhost } from '../src/ghost-transfer.js';

function sampleGhost() {
  return {
    version: 1,
    time: 2,
    frames: Array.from({ length: 41 }, (_, index) => [
      index * 0.05,
      index * 3,
      index === 0 ? 0 : index * -2,
      index * 0.01,
    ]),
    sectors: [0.5, 0.5, 0.5, 0.5],
  };
}

test('portable ghost round-trips without sharing mutable frame data', () => {
  const original = sampleGhost();
  const encoded = serializeLapGhost(original);
  const decoded = parseLapGhost(encoded);

  assert.deepEqual(decoded, original);
  assert.notEqual(decoded, original);
  assert.notEqual(decoded.frames, original.frames);
  assert.notEqual(decoded.frames[0], original.frames[0]);
});

test('portable ghost parser rejects malformed documents and unsupported versions', () => {
  assert.equal(parseLapGhost('{broken'), null);
  assert.equal(
    parseLapGhost(JSON.stringify({ format: 'other', version: 1 })),
    null,
  );
  assert.equal(
    parseLapGhost(
      JSON.stringify({
        format: 'td-racing-lap-ghost',
        version: 2,
        ghost: sampleGhost(),
      }),
    ),
    null,
  );
});

test('portable ghost parser rejects invalid timing, frame sequences, and sectors', () => {
  const valid = sampleGhost();
  const invalidGhosts = [
    { ...valid, time: 0 },
    { ...valid, frames: valid.frames.slice(0, 19) },
    {
      ...valid,
      frames: [[0, 0, 0, 0], ...valid.frames.slice(1, -1), [1.9, 1, 1, 1]],
    },
    {
      ...valid,
      frames: valid.frames.map((frame, index) =>
        index === 10 ? valid.frames[9] : frame,
      ),
    },
    { ...valid, sectors: [1, 1, 1, 1] },
  ];

  for (const ghost of invalidGhosts) {
    const document = JSON.stringify({
      format: 'td-racing-lap-ghost',
      version: 1,
      ghost,
    });
    assert.equal(parseLapGhost(document), null);
  }
});

test('serializer refuses invalid lap ghosts', () => {
  assert.throws(() => serializeLapGhost(null), TypeError);
});
