const FORMAT = 'td-racing-lap-ghost';
const VERSION = 1;
const MIN_FRAMES = 20;
const MAX_FRAMES = 18000;
export const MAX_GHOST_DOCUMENT_LENGTH = 4 * 1024 * 1024;

/** Encode a best-lap ghost as a portable JSON document. */
export function serializeLapGhost(ghost, pairing) {
  const validated = validateLapGhost(ghost);
  if (
    !validated ||
    !pairing ||
    typeof pairing.track !== 'string' ||
    typeof pairing.car !== 'string'
  )
    throw new TypeError('Invalid lap ghost or pairing');

  const document = JSON.stringify({
    format: FORMAT,
    version: VERSION,
    pairing: { track: pairing.track, car: pairing.car },
    ghost: validated,
  });
  if (document.length > MAX_GHOST_DOCUMENT_LENGTH)
    throw new TypeError('Lap ghost document is too large');
  return document;
}

/** Parse and validate a portable ghost document without changing game state. */
export function parseLapGhost(document) {
  if (
    typeof document !== 'string' ||
    document.length > MAX_GHOST_DOCUMENT_LENGTH
  )
    return null;
  let data;
  try {
    data = JSON.parse(document);
  } catch (_) {
    return null;
  }
  if (
    !data ||
    data.format !== FORMAT ||
    data.version !== VERSION ||
    !data.pairing ||
    typeof data.pairing.track !== 'string' ||
    typeof data.pairing.car !== 'string' ||
    !data.pairing.track ||
    !data.pairing.car
  )
    return null;
  const ghost = validateLapGhost(data.ghost);
  return ghost ? { pairing: { ...data.pairing }, ghost } : null;
}

export function ghostMatchesPair(bundle, track, car) {
  return (
    !!bundle && bundle.pairing?.track === track && bundle.pairing?.car === car
  );
}

function validateLapGhost(ghost) {
  if (
    !ghost ||
    ghost.version !== 1 ||
    !Number.isFinite(ghost.time) ||
    ghost.time <= 0 ||
    !Array.isArray(ghost.frames) ||
    ghost.frames.length < MIN_FRAMES ||
    ghost.frames.length > MAX_FRAMES
  )
    return null;

  let previous = -1;
  for (const frame of ghost.frames) {
    if (
      !Array.isArray(frame) ||
      frame.length !== 4 ||
      !frame.every(Number.isFinite) ||
      frame[0] <= previous ||
      frame[0] < 0 ||
      frame[0] > ghost.time + 0.02
    )
      return null;
    previous = frame[0];
  }
  if (
    ghost.frames[0][0] !== 0 ||
    Math.abs(ghost.frames.at(-1)[0] - ghost.time) > 0.02
  )
    return null;

  let sectors;
  if (ghost.sectors !== undefined) {
    if (
      !Array.isArray(ghost.sectors) ||
      ghost.sectors.length !== 4 ||
      !ghost.sectors.every((sector) => Number.isFinite(sector) && sector > 0) ||
      Math.abs(
        ghost.sectors.reduce((sum, sector) => sum + sector, 0) - ghost.time,
      ) >= 0.03
    )
      return null;
    sectors = ghost.sectors.slice();
  }

  return {
    version: 1,
    time: ghost.time,
    frames: ghost.frames.map((frame) => frame.slice()),
    ...(sectors ? { sectors } : {}),
  };
}
