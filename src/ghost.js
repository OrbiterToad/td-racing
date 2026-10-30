import { clamp, lerpTo } from './math.js';
import { car, lapGhost, race, state, timing } from './state.js';
import { formatTime } from './ui.js';

export function liveGhostDelta() {
  const ghost = lapGhost.best;
  if (
    !ghost ||
    !race.started ||
    !race.crossedStart ||
    race.invalid ||
    race.countdown > 0
  )
    return null;
  const sector = Math.min(3, Math.max(0, race.next - 1)),
    sectors = ghost.sectors;
  const timed =
    Array.isArray(sectors) &&
    sectors.length === 4 &&
    sectors.every((t) => Number.isFinite(t) && t > 0) &&
    Math.abs(sectors.reduce((a, b) => a + b, 0) - ghost.time) < 0.03;
  const start = timed
      ? sectors.slice(0, sector).reduce((a, b) => a + b, 0)
      : sector === 3
        ? ghost.time * 0.5
        : 0,
    end = timed
      ? start + sectors[sector]
      : sector === 0
        ? ghost.time * 0.5
        : ghost.time;
  let distance = Infinity,
    reference = null;
  for (let i = 0; i < ghost.frames.length - 1; i++) {
    const a = ghost.frames[i],
      b = ghost.frames[i + 1];
    if (b[0] < start - 0.15 || a[0] > end + 0.15) continue;
    const dx = b[1] - a[1],
      dy = b[2] - a[2],
      length = dx * dx + dy * dy,
      t = length
        ? clamp(((car.x - a[1]) * dx + (car.y - a[2]) * dy) / length, 0, 1)
        : 0,
      d = (car.x - a[1] - t * dx) ** 2 + (car.y - a[2] - t * dy) ** 2;
    if (d < distance) {
      distance = d;
      reference = lerpTo(a[0], b[0], t);
    }
  }
  return reference === null || distance > 150 * 150
    ? null
    : race.time - reference;
}

export function resetGhostRecording(start = [car.x, car.y, car.angle]) {
  lapGhost.frames = [[0, ...start]];
  lapGhost.cursor = 0;
  lapGhost.previous = start.slice();
}

export function loadLapGhost() {
  lapGhost.best = null;
  lapGhost.cursor = 0;
  try {
    const saved = JSON.parse(
      localStorage.getItem(state.BEST_KEY + '-ghost-v1'),
    );
    if (
      !saved ||
      saved.version !== 1 ||
      !Number.isFinite(saved.time) ||
      saved.time <= 0 ||
      !Array.isArray(saved.frames) ||
      saved.frames.length < 20 ||
      saved.frames.length > 18000
    )
      return;
    let previous = -1;
    for (const frame of saved.frames) {
      if (
        !Array.isArray(frame) ||
        frame.length !== 4 ||
        !frame.every(Number.isFinite) ||
        frame[0] <= previous ||
        frame[0] < 0 ||
        frame[0] > saved.time + 0.02
      )
        return;
      previous = frame[0];
    }
    if (
      saved.frames[0][0] !== 0 ||
      Math.abs(saved.frames.at(-1)[0] - saved.time) > 0.02
    )
      return;
    lapGhost.best = saved;
  } catch (_) {
    /* A clean lap records a ghost if the saved path is missing. */
  }
}

export function recordGhostFrame() {
  if (!race.started || race.invalid || lapGhost.frames.length >= 18000) return;
  const last = lapGhost.frames.at(-1);
  if (last && race.time - last[0] < 0.05) return;
  lapGhost.frames.push([race.time, car.x, car.y, car.angle]);
}

export function ghostCrossingFrame(fraction) {
  const p = lapGhost.previous || [car.x, car.y, car.angle],
    angle = Math.atan2(Math.sin(car.angle - p[2]), Math.cos(car.angle - p[2]));
  return [
    lerpTo(p[0], car.x, fraction),
    lerpTo(p[1], car.y, fraction),
    p[2] + angle * fraction,
  ];
}

export function saveLapGhost(time, last) {
  if (
    (lapGhost.best && time >= lapGhost.best.time) ||
    lapGhost.frames.length < 20 ||
    lapGhost.frames.at(-1)[0] < time - 0.2
  )
    return false;
  const frames = lapGhost.frames.filter((f) => f[0] < time);
  frames.push([time, ...last]);
  // Compact coordinates keep several circuits' recordings within browser storage.
  const compact = frames
    .map((f) => [
      Math.round(f[0] * 10000) / 10000,
      Math.round(f[1] * 10) / 10,
      Math.round(f[2] * 10) / 10,
      Math.round(Math.atan2(Math.sin(f[3]), Math.cos(f[3])) * 10000) / 10000,
    ])
    .filter((f, i, all) => i === all.length - 1 || f[0] < all[i + 1][0]);
  const saved = {
    version: 1,
    time,
    frames: compact,
    sectors: timing.splits.slice(),
  };
  lapGhost.best = saved;
  lapGhost.cursor = 0;
  try {
    localStorage.setItem(state.BEST_KEY + '-ghost-v1', JSON.stringify(saved));
  } catch (_) {
    /* The ghost still works for this session if storage is full. */
  }
  return true;
}

export function ghostPose(time) {
  const best = lapGhost.best;
  if (!best || time < 0 || time > best.time) return null;
  const frames = best.frames;
  let i = lapGhost.cursor;
  if (i >= frames.length - 1 || frames[i][0] > time) i = 0;
  while (i < frames.length - 2 && frames[i + 1][0] < time) i++;
  lapGhost.cursor = i;
  const a = frames[i],
    b = frames[i + 1],
    t = clamp((time - a[0]) / (b[0] - a[0]), 0, 1),
    angle = Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3]));
  return {
    x: lerpTo(a[1], b[1], t),
    y: lerpTo(a[2], b[2], t),
    angle: a[3] + angle * t,
  };
}

export function ghostStatus() {
  if (!lapGhost.best)
    return race.invalid
      ? 'GHOST · Cross the finish, then drive a clean lap'
      : 'GHOST · Complete a clean lap to record';
  if (!race.crossedStart) return 'GHOST READY · Cross the start line';
  return (
    'GHOST ' +
    (!race.started
      ? 'READY'
      : race.time > lapGhost.best.time
        ? 'FINISHED'
        : 'RACING') +
    ' · ' +
    formatTime(lapGhost.best.time)
  );
}

export function visibleGhostPose() {
  return race.crossedStart ? ghostPose(race.time) : null;
}
