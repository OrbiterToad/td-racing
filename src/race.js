import { CFG } from './config.js';
import {
  ghostCrossingFrame,
  resetGhostRecording,
  saveLapGhost,
} from './ghost.js';
import { clamp, lerpTo } from './math.js';
import { changeTrack } from './runtime.js';
import {
  camera,
  car,
  keys,
  lapGhost,
  race,
  startingGrid,
  state,
  timing,
  track,
} from './state.js';
import { nearest, nearestDriving, timingGateHalfWidth } from './tracks.js';
import { formatSector, formatTime, notify } from './ui.js';

export function beginLap(start) {
  timing.splits = [];
  timing.sectorStart = 0;
  resetGhostRecording(start);
}

export function recover(showMessage = true) {
  const n = track.length ? nearest(car.x, car.y) : null;
  const p = showMessage
    ? nearestDriving(car.x, car.y)
    : startingGrid[state.selectedStart];
  Object.assign(car, {
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    angle: Math.atan2(p.ty, p.tx),
    yaw: 0,
    steer: 0,
    slip: 0,
    slickTime: 0,
    coconutSlip: 0,
  });
  race.stuck = 0;
  state.lastSkid = [null, null];
  state.skidClock = 0;
  if (showMessage) {
    race.invalid = true;
    timing.delta = null;
    notify('CAR RECOVERED · Cross the line to start a fresh lap');
  }
  race.previous = nearestDriving(car.x, car.y).progress;
}

export function buildStartingGrid() {
  startingGrid.length = 0;
  state.selectedStart = 0;
  for (let i = 0; i < 6; i++) {
    const distance = track.totalLength - 90 - i * 80;
    let index = track.findIndex((p) => p.s > distance) - 1;
    if (index < 0) index = track.length - 1;
    const p = track[index],
      q = track[(index + 1) % track.length],
      length = Math.hypot(q.x - p.x, q.y - p.y),
      t = (distance - p.s) / length,
      offset = CFG.road * 0.4 * (i % 2 ? 1 : -1);
    startingGrid.push({
      x: lerpTo(p.x, q.x, t) + p.nx * offset,
      y: lerpTo(p.y, q.y, t) + p.ny * offset,
      tx: p.tx,
      ty: p.ty,
    });
  }
}

export function chooseStartingSlot(index) {
  if (
    race.started ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= startingGrid.length
  )
    return false;
  state.selectedStart = index;
  keys.clear();
  recover(false);
  startCountdown();
  notify('START POSITION ' + (index + 1) + ' · Ready to drive');
  return true;
}

export function startCountdown() {
  race.countdown = 3;
  race.goTime = 0;
  car.vx = 0;
  car.vy = 0;
  car.yaw = 0;
}

export function restartRun() {
  const slot = state.selectedStart;
  changeTrack(state.activeMap.id, false);
  state.selectedStart = slot;
  recover(false);
  resetGhostRecording();
  camera.x = car.x;
  camera.y = car.y;
  notify('FRESH RUN · GRID ' + (slot + 1));
}

export function updateRace(dt, n) {
  const beforeTime = race.time;
  race.time += dt;
  const previous = race.previous,
    progress = n.progress;
  let delta = progress - previous;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  // Gates span the full corridor between the barriers, including runoff.
  if (Math.abs(delta) < 0.035) race.travel += delta;
  const gate = race.next * 0.25;
  if (
    race.next <= 3 &&
    previous < gate &&
    progress >= gate &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(gate)
  ) {
    const crossingTime =
      beforeTime + dt * clamp((gate - previous) / delta, 0, 1);
    finishSector(crossingTime, race.next - 1);
    race.next++;
  }
  if (
    previous > 0.93 &&
    progress < 0.07 &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(0)
  ) {
    const fraction = clamp((1 - previous) / delta, 0, 1),
      crossingTime = beforeTime + dt * fraction,
      remainder = race.time - crossingTime,
      crossingFrame = ghostCrossingFrame(fraction);
    if (race.next === 4 && race.travel > 0.85 && !race.invalid) {
      finishSector(crossingTime, 3);
      race.last = crossingTime;
      race.lap++;
      timing.last = timing.splits.slice();
      const firstGhost = !lapGhost.best,
        ghostSaved = saveLapGhost(race.last, crossingFrame);
      if (race.best === null || race.last < race.best) {
        race.best = race.last;
        timing.best = timing.splits.slice();
        const session = {
          version: 1,
          time: race.best,
          sectors: timing.best.slice(),
        };
        try {
          localStorage.setItem(state.BEST_KEY, JSON.stringify(race.best));
          localStorage.setItem(
            state.BEST_KEY + '-sectors-v1',
            JSON.stringify(session),
          );
        } catch (_) {
          /* Timing remains available for this session. */
        }
        notify('PERSONAL BEST · ' + formatTime(race.best));
      } else
        notify(
          (firstGhost && ghostSaved ? 'GHOST READY · ' : 'LAP COMPLETE · ') +
            formatTime(race.last),
        );
    } else if (race.invalid) notify('FRESH LAP · Make it a clean one');
    else if (race.time > 8)
      notify('LAP NOT COUNTED · Pass every sector on the track');
    race.crossedStart = true;
    race.time = remainder;
    race.next = 1;
    race.travel = 0;
    race.invalid = false;
    beginLap(crossingFrame);
  }
  race.previous = progress;
}

export function finishSector(time, index) {
  const elapsed = time - timing.sectorStart;
  timing.splits[index] = elapsed;
  timing.sectorStart = time;
  timing.flashLabel = 'SECTOR ' + (index + 1) + ' · ' + formatSector(elapsed);
  timing.flashDelta =
    timing.best[index] !== undefined ? elapsed - timing.best[index] : null;
  timing.flashTime = 3.5;
}
