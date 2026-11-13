/**
 * Global time-trial leaderboard module.
 *
 * Operates in two modes determined by LEADERBOARD_API_URL:
 *
 *   Local-only (default, empty URL): all data is kept in localStorage.
 *     Records are private to the device.
 *
 *   Network mode (non-empty URL): submissions and fetches go to the
 *     configured backend. On any network or server error the module falls
 *     back to local storage so local play is never interrupted.
 *
 * Required server contract when LEADERBOARD_API_URL is set:
 *
 *   POST <url>/submit
 *     Request body (JSON): { trackId, carId, lapTime, displayName }
 *     Response 200: { ok: true, rank: number }
 *     Response 400: { ok: false, error: string }
 *
 *   GET <url>/rankings?trackId=&carId=
 *     Response 200: { entries: [{ name: string, time: number }, …] }
 *       ordered fastest-first, up to MAX_ENTRIES items.
 *
 *   Server-side validation must reject:
 *     - unknown trackId or carId values
 *     - lapTime ≤ 0, non-finite, or outside plausible per-pairing bounds
 *     - displayName longer than MAX_NAME_LENGTH or empty after trimming
 *   Implementations should also apply rate-limiting and abuse controls.
 */

import { MAPS, VEHICLES } from './config.js';

export const LEADERBOARD_NAME_KEY = 'apex-leaderboard-name-v1';
export const LOCAL_LEADERBOARD_KEY = 'apex-leaderboard-local-v1';
export const MAX_NAME_LENGTH = 24;
export const MAX_ENTRIES = 10;

/**
 * Backend API base URL. Set to a deployed endpoint to enable network
 * submissions. When empty the leaderboard operates in local-only mode.
 */
export const LEADERBOARD_API_URL = '';

export function validateDisplayName(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch (_) {
    return undefined;
  }
}

export function loadDisplayName(storage) {
  storage = resolveStorage(storage);
  try {
    const saved = storage?.getItem(LEADERBOARD_NAME_KEY);
    if (typeof saved === 'string' && validateDisplayName(saved)) return saved;
  } catch (_) {}
  return '';
}

export function saveDisplayName(name, storage) {
  if (!validateDisplayName(name)) return false;
  storage = resolveStorage(storage);
  try {
    storage?.setItem(LEADERBOARD_NAME_KEY, name.trim());
    return true;
  } catch (_) {
    return false;
  }
}

function readLocalStore(storage) {
  storage = resolveStorage(storage);
  try {
    const saved = JSON.parse(storage?.getItem(LOCAL_LEADERBOARD_KEY) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return saved;
  } catch (_) {
    return {};
  }
}

function writeLocalStore(data, storage) {
  storage = resolveStorage(storage);
  try {
    storage?.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(data));
    return true;
  } catch (_) {
    return false;
  }
}

function isValidEntry(e) {
  return (
    e !== null &&
    typeof e === 'object' &&
    typeof e.name === 'string' &&
    Number.isFinite(e.time) &&
    e.time > 0
  );
}

export function readLocalLeaderboard(trackId, carId, storage) {
  if (!MAPS[trackId] || !VEHICLES[carId]) return [];
  const store = readLocalStore(storage);
  const key = `${trackId}:${carId}`;
  const entries = store[key];
  if (!Array.isArray(entries)) return [];
  return entries.filter(isValidEntry);
}

export function addLocalEntry(
  trackId,
  carId,
  lapTime,
  displayName,
  options = {},
) {
  if (!MAPS[trackId] || !VEHICLES[carId]) return null;
  if (!Number.isFinite(lapTime) || lapTime <= 0) return null;
  if (!validateDisplayName(displayName)) return null;
  const storage = options.storage;
  const store = readLocalStore(storage);
  const key = `${trackId}:${carId}`;
  const existing = Array.isArray(store[key])
    ? store[key].filter(isValidEntry)
    : [];
  const newEntry = { name: displayName.trim(), time: lapTime };
  const merged = [...existing, newEntry]
    .sort((a, b) => a.time - b.time)
    .slice(0, MAX_ENTRIES);
  store[key] = merged;
  writeLocalStore(store, storage);
  const rank =
    merged.findIndex(
      (e) => e.name === newEntry.name && e.time === newEntry.time,
    ) + 1;
  return { rank, entries: merged };
}

export async function submitEntry(
  trackId,
  carId,
  lapTime,
  displayName,
  options = {},
) {
  if (!MAPS[trackId] || !VEHICLES[carId])
    return { ok: false, error: 'invalid pairing', local: true };
  if (!Number.isFinite(lapTime) || lapTime <= 0)
    return { ok: false, error: 'invalid time', local: true };
  if (!validateDisplayName(displayName))
    return { ok: false, error: 'invalid name', local: true };

  const apiUrl = options.apiUrl ?? LEADERBOARD_API_URL;
  if (apiUrl) {
    try {
      const signal =
        options.signal ??
        (typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(5000)
          : undefined);
      const res = await fetch(`${apiUrl}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId,
          carId,
          lapTime,
          displayName: displayName.trim(),
        }),
        signal,
      });
      const data = await res.json();
      if (res.ok && data.ok) return { ok: true, rank: data.rank, local: false };
      return { ok: false, error: data.error ?? 'server error', local: false };
    } catch (_) {
      /* Network failure: fall through to local. */
    }
  }

  const result = addLocalEntry(trackId, carId, lapTime, displayName, options);
  if (!result) return { ok: false, error: 'storage error', local: true };
  return { ok: true, rank: result.rank, entries: result.entries, local: true };
}

export async function fetchLeaderboard(trackId, carId, options = {}) {
  if (!MAPS[trackId] || !VEHICLES[carId])
    return { ok: false, error: 'invalid pairing', entries: [] };

  const apiUrl = options.apiUrl ?? LEADERBOARD_API_URL;
  if (apiUrl) {
    try {
      const signal =
        options.signal ??
        (typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(5000)
          : undefined);
      const url = `${apiUrl}/rankings?trackId=${encodeURIComponent(trackId)}&carId=${encodeURIComponent(carId)}`;
      const res = await fetch(url, { signal });
      const data = await res.json();
      if (res.ok && Array.isArray(data.entries))
        return { ok: true, entries: data.entries, local: false };
      return {
        ok: false,
        error: data.error ?? 'server error',
        entries: [],
        local: false,
      };
    } catch (_) {
      /* Network failure: fall through to local. */
    }
  }

  const entries = readLocalLeaderboard(trackId, carId, options.storage);
  return { ok: true, entries, local: true };
}
