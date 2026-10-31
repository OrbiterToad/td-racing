export const SETTINGS_KEY = 'apex-settings-v1';

export const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: true,
  volume: 0.7,
  steeringSensitivity: 1,
  reducedMotion: false,
});

function matchReducedMotion(media) {
  if (media !== undefined) return Boolean(media);
  try {
    return Boolean(
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    );
  } catch (_) {
    return false;
  }
}

function getStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch (_) {
    return undefined;
  }
}

export function loadSettings(storage, prefersReducedMotion) {
  let saved = null;
  try {
    const raw = getStorage(storage)?.getItem(SETTINGS_KEY);
    if (raw) {
      const value = JSON.parse(raw);
      if (value && typeof value === 'object' && !Array.isArray(value))
        saved = value;
    }
  } catch (_) {}

  const reducedMotionSaved = typeof saved?.reducedMotion === 'boolean';
  return {
    soundEnabled:
      typeof saved?.soundEnabled === 'boolean'
        ? saved.soundEnabled
        : DEFAULT_SETTINGS.soundEnabled,
    volume:
      typeof saved?.volume === 'number' &&
      Number.isFinite(saved.volume) &&
      saved.volume >= 0 &&
      saved.volume <= 1
        ? saved.volume
        : DEFAULT_SETTINGS.volume,
    steeringSensitivity:
      typeof saved?.steeringSensitivity === 'number' &&
      Number.isFinite(saved.steeringSensitivity) &&
      saved.steeringSensitivity >= 0.6 &&
      saved.steeringSensitivity <= 1.4
        ? saved.steeringSensitivity
        : DEFAULT_SETTINGS.steeringSensitivity,
    reducedMotion: reducedMotionSaved
      ? saved.reducedMotion
      : matchReducedMotion(prefersReducedMotion),
    reducedMotionSaved,
  };
}

export function saveSettings(settings, storage) {
  const destination = getStorage(storage);
  if (!destination) return false;
  const value = {
    soundEnabled: Boolean(settings.soundEnabled),
    volume: settings.volume,
    steeringSensitivity: settings.steeringSensitivity,
  };
  if (settings.reducedMotionSaved)
    value.reducedMotion = Boolean(settings.reducedMotion);
  try {
    destination.setItem(SETTINGS_KEY, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}
