export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const lerpTo = (a, b, t) => a + (b - a) * t;

export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
