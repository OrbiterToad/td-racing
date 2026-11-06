import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseRaceLine } from '../src/ai-racecraft.js';

const line = { lane: 0, halfRoad: 82, width: 24, curvature: 0.02, traffic: [] };
test('deterministic passing, defensive lines, and safe fallbacks', () => {
  const slower = { gap: 70, lane: 0, width: 24, closing: 30 };
  assert.deepEqual(chooseRaceLine({ ...line, traffic: [slower] }), {
    lane: 40,
    action: 'pass',
  });
  assert.deepEqual(
    chooseRaceLine({
      ...line,
      traffic: [{ ...slower, gap: -130, closing: -30 }],
    }),
    { lane: 22, action: 'defend' },
  );
  for (const context of [
    line,
    { ...line, halfRoad: 35, traffic: [slower] },
    { ...line, curvature: 0.3, traffic: [slower] },
    {
      ...line,
      traffic: [
        slower,
        { ...slower, gap: 0, lane: 40 },
        { ...slower, gap: 0, lane: -40 },
      ],
    },
    { ...line, traffic: [{ ...slower, gap: -20, closing: -30 }] },
  ])
    assert.deepEqual(chooseRaceLine(context), { lane: 0, action: 'hold' });
});
