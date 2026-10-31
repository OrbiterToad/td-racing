export const REWIND_SECONDS = 5;

export function selectRewindFrame(history, now, seconds = REWIND_SECONDS) {
  if (!history.length) return null;
  const target = Math.max(0, now - seconds);
  return history.find((frame) => frame.at >= target) || history[0];
}

export function canRewind({ competitive, paused, selecting, active, frames }) {
  return !competitive && !paused && !selecting && active && frames >= 2;
}

export function resultEligible(rewindUsed) {
  return !rewindUsed;
}

export function restoreRewindFrame(frame, targets) {
  for (const key of ['car', 'race', 'timing', 'jungle'])
    Object.assign(targets[key], structuredClone(frame[key]));
  targets.setCoastTime(frame.coastTime);
  targets.lapGhost.frames = structuredClone(frame.lapGhost.frames);
  targets.lapGhost.cursor = frame.lapGhost.cursor;
  targets.lapGhost.previous = structuredClone(frame.lapGhost.previous);
  targets.traffic.cars = structuredClone(frame.traffic.cars);
  targets.traffic.wait = frame.traffic.wait;
}
