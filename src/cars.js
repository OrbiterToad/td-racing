import { PAINTS, VEHICLES } from './config.js';
import { loadLapGhost } from './ghost.js';
import { race, state, timing } from './state.js';

export function bestKeyFor(map = state.activeMap, vehicle = state.activeCar) {
  return map.bestKey + (vehicle.id === 'clubsport' ? '' : '-' + vehicle.id);
}

export function configureCar(id, color = state.paint) {
  if (!Object.hasOwn(VEHICLES, id) || !Object.hasOwn(PAINTS, color))
    return false;
  state.activeCar = VEHICLES[id];
  state.paint = color;
  state.BEST_KEY = bestKeyFor();
  return true;
}

export function carImagePath(id = state.activeCar.id, color = state.paint) {
  const vehicle = VEHICLES[id];
  return vehicle.art
    ? 'assets/cars/' + vehicle.art + '-' + color + '.svg'
    : 'assets/kenney/PNG/Cars/car_' + color + '_' + vehicle.sprite + '.png';
}

export function loadCarArt() {
  state.carArt = new Image();
  state.carArt.src = carImagePath();
}

export function readBest() {
  race.best = null;
  timing.best = [];
  try {
    const saved = JSON.parse(localStorage.getItem(state.BEST_KEY));
    if (typeof saved === 'number' && saved > 0 && Number.isFinite(saved))
      race.best = saved;
    const session = JSON.parse(
      localStorage.getItem(state.BEST_KEY + '-sectors-v1'),
    );
    if (validSession(session, race.best)) timing.best = session.sectors.slice();
  } catch (_) {}
  loadLapGhost();
}

export function validSession(session, best) {
  return (
    !!session &&
    session.version === 1 &&
    Number.isFinite(best) &&
    Number.isFinite(session.time) &&
    Math.abs(session.time - best) < 0.02 &&
    Array.isArray(session.sectors) &&
    session.sectors.length === 4 &&
    session.sectors.every((t) => Number.isFinite(t) && t > 0) &&
    Math.abs(session.sectors.reduce((a, b) => a + b, 0) - best) < 0.03
  );
}
