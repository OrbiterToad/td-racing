import { MAPS, VEHICLES } from './config.js';

export const PROGRESSION_KEY = 'apex-career';
export const PROGRESSION_VERSION = 1;
export const LEGACY_MEDAL_KEY = 'apex-medals-v1';
export const LEGACY_SKILL_KEY = 'apex-skill-trials-v1';
const medals = ['bronze', 'silver', 'gold'];
const skills = ['braking', 'slalom', 'handbrake', 'cornering'];
const object = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);
const known = (catalog, id) =>
  typeof id === 'string' && Object.hasOwn(catalog, id);
const pair = (key) => {
  const ids = key.split(':');
  return ids.length === 2 && known(MAPS, ids[0]) && known(VEHICLES, ids[1]);
};
const count = (value) => Number.isSafeInteger(value) && value >= 0;

export function progressionStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch (_) {
    return undefined;
  }
}

// All shipped content was available before career saves existed. Keep that
// entitlement for new and existing players; this feature introduces no locks.
export function initialProgression() {
  return {
    version: PROGRESSION_VERSION,
    unlocked: { cars: Object.keys(VEHICLES), tracks: Object.keys(MAPS) },
    medals: {},
    skills: {},
    events: {},
  };
}

function sanitize(value) {
  const result = initialProgression();
  for (const [kind, catalog] of [
    ['cars', VEHICLES],
    ['tracks', MAPS],
  ]) {
    if (Array.isArray(value.unlocked?.[kind]))
      result.unlocked[kind] = [
        ...new Set(value.unlocked[kind].filter((id) => known(catalog, id))),
      ];
  }
  if (object(value.medals))
    result.medals = Object.fromEntries(
      Object.entries(value.medals).filter(
        ([key, medal]) => pair(key) && medals.includes(medal),
      ),
    );
  if (object(value.skills))
    result.skills = Object.fromEntries(
      Object.entries(value.skills)
        .filter(
          ([id, record]) =>
            skills.includes(id) &&
            object(record) &&
            count(record.attempts) &&
            count(record.completions) &&
            record.completions <= record.attempts &&
            Number.isFinite(record.best) &&
            record.best >= 0 &&
            record.best <= 100,
        )
        .map(([id, record]) => [
          id,
          {
            attempts: record.attempts,
            completions: record.completions,
            best: record.best,
          },
        ]),
    );
  if (object(value.events))
    result.events = Object.fromEntries(
      Object.entries(value.events).filter(
        ([key, complete]) => pair(key) && complete === true,
      ),
    );
  return result;
}

function write(storage, progress) {
  try {
    if (!storage) return false;
    storage.setItem(PROGRESSION_KEY, JSON.stringify(progress));
    return true;
  } catch (_) {
    return false;
  }
}

export function loadProgression(storage) {
  storage = progressionStorage(storage);
  try {
    const raw = storage?.getItem(PROGRESSION_KEY);
    if (raw !== null && raw !== undefined) {
      const value = JSON.parse(raw);
      if (!object(value) || ![0, PROGRESSION_VERSION].includes(value.version))
        return {
          progress: initialProgression(),
          status: 'unsupported',
          writable: false,
        };
      const progress = sanitize(value);
      if (value.version === 0) write(storage, progress);
      return {
        progress,
        status: value.version === 0 ? 'migrated' : 'loaded',
        writable: true,
      };
    }
    // Import only recognized legacy fields. Leave source keys and personal
    // records intact; once a career exists, never import legacy keys again.
    const legacy = (key) => {
      try {
        return JSON.parse(storage?.getItem(key) ?? '{}');
      } catch (_) {
        return {};
      }
    };
    const progress = sanitize({
      medals: legacy(LEGACY_MEDAL_KEY),
      skills: legacy(LEGACY_SKILL_KEY),
    });
    const saved = write(storage, progress);
    return {
      progress,
      status: saved ? 'migrated' : 'unavailable',
      writable: true,
    };
  } catch (_) {
    return {
      progress: initialProgression(),
      status: 'invalid',
      writable: false,
    };
  }
}

function update(storage, change) {
  storage = progressionStorage(storage);
  const loaded = loadProgression(storage);
  if (!loaded.writable || !change(loaded.progress)) return false;
  return write(storage, loaded.progress);
}

export function unlockContent(kind, id, storage) {
  const catalog = kind === 'cars' ? VEHICLES : kind === 'tracks' ? MAPS : null;
  if (!catalog || !known(catalog, id)) return false;
  return update(storage, (progress) => {
    if (progress.unlocked[kind].includes(id)) return false;
    progress.unlocked[kind].push(id);
    return true;
  });
}

export function saveMedal(trackId, carId, medal, storage) {
  const key = `${trackId}:${carId}`;
  if (!pair(key) || !medals.includes(medal)) return false;
  return update(storage, (progress) => {
    if (medals.indexOf(medal) <= medals.indexOf(progress.medals[key]))
      return false;
    progress.medals[key] = medal;
    return true;
  });
}

export function saveSkillResult(id, score, complete, storage) {
  if (
    !skills.includes(id) ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100 ||
    typeof complete !== 'boolean'
  )
    return null;
  let record = null;
  const saved = update(storage, (progress) => {
    const previous = progress.skills[id] ?? {
      attempts: 0,
      completions: 0,
      best: 0,
    };
    if (previous.attempts === Number.MAX_SAFE_INTEGER) return false;
    record = {
      attempts: previous.attempts + 1,
      completions: previous.completions + (complete ? 1 : 0),
      best: Math.max(previous.best, score),
    };
    progress.skills[id] = record;
    return true;
  });
  return record ? { ...record, saved } : null;
}

export function completeCareerEvent(
  trackId,
  carId,
  { valid = false, time } = {},
  storage,
) {
  const key = `${trackId}:${carId}`;
  if (!pair(key) || !valid || !Number.isFinite(time) || time <= 0) return false;
  return update(storage, (progress) => {
    if (progress.events[key]) return false;
    progress.events[key] = true;
    return true;
  });
}

export function resetProgression(confirmation, storage) {
  if (confirmation !== 'RESET PROGRESSION') return false;
  // A canonical empty save also prevents legacy data from being reimported.
  return write(progressionStorage(storage), initialProgression());
}
