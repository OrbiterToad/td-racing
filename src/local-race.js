import { GamepadInput } from './gamepad.js';
import { driveVehicle } from './vehicle-physics.js';
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
  lap: 0,
  elapsed: 0,
  progress: 0,
  finishedAt: null,
});

export function createLocalRace() {
  const first = blankCar(startingGrid[0]);
  const second = blankCar(startingGrid[1]);
  return {
    players: [first, second],
    pad: new GamepadInput(),
    countdown: 3,
    finished: false,
    order: [],
    laps: 3,
  };
}

export function pollSecondPlayer(race, gamepads, now) {
  // The first connected controller belongs to Player 1; reserve a distinct pad.
  const input = race.pad;
  if (input.padIndex === null && now >= input.nextScan) {
    const candidate = Array.from(gamepads || []).find(
      (pad) =>
        pad?.connected &&
        pad.index !== state.gamepadInput?.padIndex &&
        pad.index !== 0,
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
  {
    const player = race.players[index];
    if (player.finishedAt !== null) return;
    const n = nearestDriving(player.x, player.y);
    let delta = n.progress - player.progress;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;
    player.progress = n.progress;
    player.elapsed += dt;
    driveVehicle(player, controls[index], dt, state.activeCar);
    if (delta > 0 && n.progress < 0.08 && player.elapsed > 5) {
      player.lap++;
      if (player.lap > race.laps) {
        player.finishedAt = player.elapsed;
        race.order.push(index);
        if (race.order.length === 2) race.finished = true;
      }
    }
  }
}

export function localPlayerTwoControls(keys, gamepad = {}) {
  return {
    steer:
      (keys.has('KeyL') ? 1 : 0) -
      (keys.has('KeyJ') ? 1 : 0) +
      (gamepad.steer || 0),
    throttle: keys.has('KeyI') ? 1 : gamepad.throttle || 0,
    brake: keys.has('KeyK') ? 1 : gamepad.brake || 0,
    handbrake: keys.has('ShiftRight') || (gamepad.handbrake || 0) > 0 ? 1 : 0,
  };
}
