import { clamp } from './math.js';

// Normal retains the original corner speed and driver pace multipliers.
export const AI_DIFFICULTIES = {
  easy: { name: 'Easy', pace: 0.8, brakeMargin: 2, lineRate: 12 },
  normal: { name: 'Normal', pace: 1, brakeMargin: 5, lineRate: 18 },
  hard: { name: 'Hard', pace: 1.12, brakeMargin: 8, lineRate: 24 },
};

export function aiDifficulty(id) {
  return AI_DIFFICULTIES[id] || AI_DIFFICULTIES.normal;
}

// Inputs are expressed in the local track frame; no random or wall-clock state.
export function chooseRaceLine({ lane, halfRoad, width, curvature, traffic }) {
  const safe = { lane, action: 'hold' };
  const limit = halfRoad - width / 2 - 12;
  if (limit < width || Math.abs(curvature) > 0.12) return safe;
  const clear = (candidate) =>
    Math.abs(candidate) <= limit &&
    traffic.every(
      (other) =>
        Math.abs(other.gap) > 100 ||
        Math.abs(other.lane - candidate) > (width + other.width) / 2 + 8,
    );
  const front = traffic.find(
    (other) => other.gap > 0 && other.gap < 160 && other.closing > 8,
  );
  if (front) {
    for (const side of [1, -1]) {
      const candidate = front.lane + side * ((width + front.width) / 2 + 16);
      if (clear(candidate)) return { lane: candidate, action: 'pass' };
    }
    return safe;
  }
  const rear = traffic.find(
    (other) => other.gap < -65 && other.gap > -180 && other.closing < -8,
  );
  if (rear) {
    const candidate = clamp(curvature >= 0 ? 22 : -22, -limit, limit);
    if (clear(candidate)) return { lane: candidate, action: 'defend' };
  }
  return safe;
}
