import { MAPS, VEHICLES } from './config.js';

import {
  LEGACY_MEDAL_KEY,
  loadProgression,
  saveMedal,
  progressionStorage,
} from './progression.js';

export const MEDAL_KEY = LEGACY_MEDAL_KEY;
export const MEDALS = ['bronze', 'silver', 'gold'];

// Bronze lap targets (seconds) are tuned per circuit. Car adjustments reflect
// each vehicle's overall pace; the complete matrix below is generated once so
// every track/car pairing has independently addressable target data.
const TRACK_BRONZE = {
  juniper: 78,
  canyon: 80,
  alpine: 105,
  amazonas: 88,
  coast: 76,
  city: 72,
  rallycross: 74,
  drift: 92,
  summit: 70,
};

const CAR_PACE = {
  clubsport: 1,
  sprint: 0.97,
  rally: 1.04,
  drift: 1.06,
  muscle: 1.03,
  formula: 0.84,
};

const MEDAL_FACTORS = { bronze: 1, silver: 0.93, gold: 0.86 };

export const MEDAL_TARGETS = Object.freeze(
  Object.fromEntries(
    Object.keys(MAPS).map((trackId) => [
      trackId,
      Object.freeze(
        Object.fromEntries(
          Object.keys(VEHICLES).map((carId) => [
            carId,
            Object.freeze(
              Object.fromEntries(
                MEDALS.map((medal) => [
                  medal,
                  Number(
                    (
                      TRACK_BRONZE[trackId] *
                      CAR_PACE[carId] *
                      MEDAL_FACTORS[medal]
                    ).toFixed(3),
                  ),
                ]),
              ),
            ),
          ]),
        ),
      ),
    ]),
  ),
);

export function medalTargetsFor(trackId, carId) {
  return MEDAL_TARGETS[trackId]?.[carId] ?? null;
}

export function medalForTime(time, targets) {
  if (!Number.isFinite(time) || time <= 0 || !targets) return null;
  for (let i = MEDALS.length - 1; i >= 0; i--) {
    const medal = MEDALS[i];
    if (Number.isFinite(targets[medal]) && time <= targets[medal]) return medal;
  }
  return null;
}

export function readMedals(storage) {
  return loadProgression(storage).progress.medals;
}

export function earnedMedalFor(trackId, carId, storage) {
  if (!medalTargetsFor(trackId, carId)) return null;
  return readMedals(storage)[`${trackId}:${carId}`] ?? null;
}

export function awardMedal(trackId, carId, lapTime, options = {}) {
  const { valid = false, timeTrial = false } = options;
  const storage = progressionStorage(options.storage);
  const targets = medalTargetsFor(trackId, carId);
  if (!targets || !valid || !timeTrial) return null;
  const achieved = medalForTime(lapTime, targets);
  if (!achieved) return null;

  const key = `${trackId}:${carId}`;
  const saved = readMedals(storage);
  const previous = saved[key] ?? null;
  if (MEDALS.indexOf(achieved) > MEDALS.indexOf(previous)) {
    saveMedal(trackId, carId, achieved, storage);
    return { medal: achieved, previous, improved: true };
  }
  return { medal: previous, previous, improved: false };
}
