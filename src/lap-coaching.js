export function lapCoachingDelta(splits, reference, elapsed, progress) {
  if (
    !Array.isArray(splits) ||
    !Array.isArray(reference) ||
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1 ||
    reference.length !== 4 ||
    !reference.every((value) => Number.isFinite(value) && value > 0)
  )
    return null;
  let completed = 0,
    delta = 0;
  for (let i = 0; i < 4; i++) {
    const split = splits[i];
    if (split === undefined) break;
    if (!Number.isFinite(split) || split <= 0) return null;
    delta += split - reference[i];
    completed++;
  }
  if (completed >= 4) return null;
  const fraction = Math.max(0, Math.min(1, progress * 4 - completed));
  if (fraction === 0 && completed === 0) return null;
  const elapsedInSector =
    elapsed - splits.slice(0, completed).reduce((a, b) => a + b, 0);
  return delta + elapsedInSector - reference[completed] * fraction;
}
