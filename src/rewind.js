import { coast } from './coast.js';
import {
  car,
  cityTraffic,
  jungle,
  lapGhost,
  opponentRace,
  particles,
  race,
  skidmarks,
  state,
  timing,
} from './state.js';
import { notify } from './ui.js';
import {
  canRewind,
  restoreRewindFrame,
  selectRewindFrame,
  REWIND_SECONDS,
} from './rewind-core.js';

const HISTORY_SECONDS = REWIND_SECONDS + 0.25;

export function eligibleForRewind() {
  return canRewind({
    competitive: opponentRace.enabled,
    selecting: state.selectingSession,
    paused: state.paused,
    active: race.started,
    frames: 2,
  });
}

function copy(value) {
  return structuredClone(value);
}

function snapshot() {
  return {
    at: state.rewindClock,
    car: copy(car),
    race: copy(race),
    timing: copy(timing),
    jungle: copy(jungle),
    coastTime: coast.time,
    lapGhost: {
      frames: copy(lapGhost.frames),
      cursor: lapGhost.cursor,
      previous: copy(lapGhost.previous),
    },
    traffic: { cars: copy(cityTraffic.cars), wait: cityTraffic.wait },
  };
}

export function recordRewindFrame(dt) {
  if (!eligibleForRewind()) {
    state.rewindHistory.length = 0;
    return;
  }
  state.rewindClock += dt;
  state.rewindHistory.push(snapshot());
  const cutoff = state.rewindClock - HISTORY_SECONDS;
  while (state.rewindHistory.length > 1 && state.rewindHistory[1].at < cutoff)
    state.rewindHistory.shift();
}

export function rewind() {
  if (!eligibleForRewind() || state.rewindHistory.length < 2) return false;
  const frame = selectRewindFrame(state.rewindHistory, state.rewindClock);
  restoreRewindFrame(frame, {
    car,
    race,
    timing,
    jungle,
    setCoastTime: (time) => (coast.time = time),
    lapGhost,
    traffic: cityTraffic,
  });
  state.rewindClock = frame.at;
  state.rewindHistory = state.rewindHistory.filter(
    (item) => item.at <= frame.at,
  );
  skidmarks.length = 0;
  particles.length = 0;
  state.lastSkid = [null, null];
  state.skidClock = 0;
  state.rewindUsed = true;
  try {
    localStorage.setItem(state.rewindKey, '1');
  } catch (_) {}
  notify('FLASHBACK · RUN IS NOW PRACTICE ONLY');
  return true;
}

export function prepareRewindSession(trackId, carId) {
  const previousKey = state.rewindKey,
    mode = opponentRace.enabled ? 'race' : 'trial',
    nextKey = `apex-rewind-used-v1-${mode}-${trackId}-${carId}`;
  state.rewindKey = nextKey;
  try {
    const activeKey = localStorage.getItem('apex-rewind-active-session-v1');
    if (activeKey && activeKey !== nextKey) localStorage.removeItem(activeKey);
    localStorage.setItem('apex-rewind-active-session-v1', nextKey);
    if (previousKey && previousKey !== nextKey)
      localStorage.removeItem(previousKey);
    state.rewindUsed = localStorage.getItem(state.rewindKey) === '1';
  } catch (_) {
    state.rewindUsed = false;
  }
  state.rewindHistory = [];
  state.rewindClock = 0;
}
