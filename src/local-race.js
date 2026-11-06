import { GamepadInput } from './gamepad.js';
import { VEHICLES } from './config.js';
import {
  driveVehicle,
  resolveVehicleBarrier,
  resolveVehicleCollision,
} from './vehicle-physics.js';
import { nearestDriving } from './tracks.js';
import { startingGrid, state } from './state.js';

const blankCar = (slot) => ({
  x: slot.x,
  y: slot.y,
  vx: 0,
  vy: 0,
  angle: Math.atan2(slot.ty, slot.tx),
  yaw: 0,
  steer: 0,
  throttle: 0,
  brake: 0,
  slickTime: 0,
  lap: 1,
  elapsed: 0,
  progress: 0,
  finishedAt: null,
});

export function createLocalRace(
  playerOneCar = state.activeCar,
  playerTwoCar = VEHICLES[state.playerTwoCar],
  playerOnePaint = state.paint,
  playerTwoPaint = state.playerTwoPaint,
) {
  const first = blankCar(startingGrid[0]);
  const second = blankCar(startingGrid[1]);
  return {
    players: [first, second],
    pad: new GamepadInput(),
    countdown: 3,
    finished: false,
    order: [],
    laps: 3,
    carSpecs: [playerOneCar, playerTwoCar],
    paints: [playerOnePaint, playerTwoPaint],
  };
}

export function pollSecondPlayer(race, gamepads, now) {
  // The first connected controller belongs to Player 1; reserve a distinct pad.
  const input = race.pad;
  if (input.padIndex === null && now >= input.nextScan) {
    const candidate = Array.from(gamepads || []).find(
      (pad) => pad?.connected && pad.index !== state.gamepadInput?.padIndex,
    );
    if (candidate) input.padIndex = candidate.index;
  }
  return input.update(gamepads, now).controls;
}

export function updateLocalRace(race, dt, controls, primary) {
  if (race.finished) return;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    return;
  }
  if (primary && race.players[0].finishedAt === null) {
    const first = race.players[0],
      n = nearestDriving(primary.x, primary.y);
    let delta = n.progress - first.progress;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    first.progress = n.progress;
    first.elapsed += dt;
    if (delta > 0 && n.progress < 0.08 && first.elapsed > 5) {
      first.lap++;
      if (first.lap > race.laps) {
        first.finishedAt = first.elapsed;
        race.order.push(0);
        if (race.order.length === 2) race.finished = true;
      }
    }
  }
  const index = 1;
  if (race.players[index].finishedAt === null) {
    const player = race.players[index];
    const n = nearestDriving(player.x, player.y);
    let delta = n.progress - player.progress;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    player.progress = n.progress;
    player.elapsed += dt;
    driveVehicle(player, controls[index], dt, race.carSpecs[index]);
    if (delta > 0 && n.progress < 0.08 && player.elapsed > 5) {
      player.lap++;
      if (player.lap > race.laps) {
        player.finishedAt = player.elapsed;
        race.order.push(index);
        if (race.order.length === 2) race.finished = true;
      }
    }
  }
  if (primary) resolveLocalCollision(race, primary);
}

// Player cars use the same contact model as the car vs. AI opponents.
export function resolveLocalCollision(race, primary) {
  const second = race.players[1],
    [specA, specB] = race.carSpecs;
  const overlap = resolveVehicleCollision(primary, second, specA, specB);
  if (overlap > 0) {
    resolveVehicleBarrier(primary, specA);
    resolveVehicleBarrier(second, specB);
  }
  return overlap;
}

export function localViewport(player, worldBounds, viewW, viewH) {
  const zoom = Math.min(viewW / 760, viewH / 540, 0.85);
  const sourceW = viewW / zoom,
    sourceH = viewH / zoom;
  return {
    zoom,
    sourceW,
    sourceH,
    sx: Math.max(
      0,
      Math.min(
        player.x - sourceW / 2 - worldBounds.x,
        worldBounds.width - sourceW,
      ),
    ),
    sy: Math.max(
      0,
      Math.min(
        player.y - sourceH / 2 - worldBounds.y,
        worldBounds.height - sourceH,
      ),
    ),
  };
}

export function localRaceResults(race) {
  return race.order.map((player, place) => {
    const time = race.players[player].finishedAt;
    return `${place + 1}. PLAYER ${player + 1} · ${time.toFixed(2)}s`;
  });
}

// In split screen the left car owns WASD and the right car owns the arrows.
export function localPlayerOneKeys(keys, split) {
  const arrows = !split;
  return {
    up: keys.has('KeyW') || (arrows && keys.has('ArrowUp')),
    down: keys.has('KeyS') || (arrows && keys.has('ArrowDown')),
    left: keys.has('KeyA') || (arrows && keys.has('ArrowLeft')),
    right: keys.has('KeyD') || (arrows && keys.has('ArrowRight')),
  };
}

export function localPlayerTwoControls(keys, gamepad = {}) {
  return {
    steer:
      (keys.has('ArrowRight') ? 1 : 0) -
      (keys.has('ArrowLeft') ? 1 : 0) +
      (gamepad.steer || 0),
    throttle: keys.has('ArrowUp') ? 1 : gamepad.throttle || 0,
    brake: keys.has('ArrowDown') ? 1 : gamepad.brake || 0,
    handbrake: keys.has('ShiftRight') || (gamepad.handbrake || 0) > 0 ? 1 : 0,
  };
}
