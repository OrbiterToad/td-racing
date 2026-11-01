const FORMAT = 'td-racing-lap-ghost';
const VERSION = 1;
const MIN_FRAMES = 20;
const MAX_FRAMES = 18000;

/** Encode a best-lap ghost as a portable JSON document. */
export function serializeLapGhost(ghost) {
  const validated = validateLapGhost(ghost);
  if (!validated) throw new TypeError('Invalid lap ghost');

  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    ghost: validated,
  });
}

/** Parse and validate a portable ghost document without changing game state. */
export function parseLapGhost(document) {
  let data;
  try {
    data = JSON.parse(document);
  } catch (_) {
    return null;
  }
  if (!data || data.format !== FORMAT || data.version !== VERSION) return null;
  return validateLapGhost(data.ghost);
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
