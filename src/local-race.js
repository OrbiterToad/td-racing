import { applyDrivingAssists } from './assists.js';
import { GamepadInput } from './gamepad.js';
import { PAINTS, VEHICLES } from './config.js';
import { driveVehicle, resolveVehicleContacts } from './vehicle-physics.js';
import { nearestDriving, timingGateHalfWidth } from './tracks.js';
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
  progress: nearestDriving(slot.x, slot.y).progress,
  next: 1,
  travel: 0,
  crossedStart: false,
  lapStart: 0,
  bestLap: null,
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
  if (primary) updateLocalProgress(race, 0, primary, dt);
  if (race.players[1].finishedAt === null) {
    const player = race.players[1];
    driveVehicle(
      player,
      applyDrivingAssists(controls[1], player, state.settings),
      dt,
      race.carSpecs[1],
    );
    updateLocalProgress(race, 1, player, dt);
  }
  if (primary) resolveLocalCollision(race, primary);
}

// A lap requires every quarter gate, enough forward travel, and an actual
// wrap across the line. The first grid-to-line crossing only starts lap one.
function updateLocalProgress(race, index, car, dt) {
  const player = race.players[index];
  if (player.finishedAt !== null) return;
  const n = nearestDriving(car.x, car.y);
  const previous = player.progress;
  let delta = n.progress - previous;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  player.elapsed += dt;
  if (Math.abs(delta) < 0.035) player.travel += delta;
  const gate = player.next * 0.25;
  if (
    player.crossedStart &&
    player.next <= 3 &&
    previous < gate &&
    n.progress >= gate &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(gate)
  )
    player.next++;
  if (
    previous > 0.93 &&
    n.progress < 0.07 &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(0)
  ) {
    if (player.crossedStart && player.next === 4 && player.travel > 0.85) {
      const lapTime = player.elapsed - player.lapStart;
      player.bestLap = Math.min(player.bestLap ?? Infinity, lapTime);
      player.lap++;
      if (player.lap > race.laps) {
        player.finishedAt = player.elapsed;
        race.order.push(index);
        race.finished = race.players.every((p) =>
          Number.isFinite(p.finishedAt),
        );
      }
    }
    player.crossedStart = true;
    player.lapStart = player.elapsed;
    player.next = 1;
    player.travel = 0;
  }
  player.progress = n.progress;
}

export function localRaceComplete(race) {
  return Boolean(
    race?.finished && race.players.every((p) => Number.isFinite(p.finishedAt)),
  );
}

export function localResultsSnapshot(race) {
  return {
    local: true,
    finished: localRaceComplete(race),
    totalTime: Math.max(...race.players.map((p) => p.finishedAt ?? 0)),
    standings: race.order.map((index) => ({
      name: `Player ${index + 1}`,
      player: true,
      paint: PAINTS[race.paints[index]].hex,
      finish: race.players[index].finishedAt,
      bestLap: race.players[index].bestLap,
    })),
  };
}

// Player cars use the same contact model as the car vs. AI opponents.
export function resolveLocalCollision(race, primary) {
  const second = race.players[1],
    [specA, specB] = race.carSpecs;
  return resolveVehicleContacts([
    { vehicle: primary, spec: specA },
    { vehicle: second, spec: specB },
  ]);
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
