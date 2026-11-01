import { resolveOpponentCollisions, updateOpponents } from './opponents.js';
import { playImpact } from './audio.js';
import { coast } from './coast.js';
import { recordGhostFrame } from './ghost.js';
import { updateJungle } from './jungle.js';
import { clamp } from './math.js';
import { beginLap, recover, updateRace } from './race.js';
import {
  car,
  feedback,
  keys,
  lapGhost,
  particles,
  race,
  opponentRace,
  skidmarks,
  state,
  timing,
  track,
} from './state.js';
import { nearestDriving, widthAt } from './tracks.js';
import { driveVehicle } from './vehicle-physics.js';
import { resolveCityTraffic, updateCityTraffic } from './traffic.js';
import { $ } from './ui.js';

export function simulate(dt) {
  if (opponentRace.enabled && opponentRace.finished) return;
  lapGhost.previous = [car.x, car.y, car.angle];
  updateJungle(dt);
  if (state.activeMap.id === 'coast') coast.time += dt;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    car.vx = 0;
    car.vy = 0;
    car.yaw = 0;
    car.throttle =
      keys.has('KeyW') || keys.has('ArrowUp')
        ? 1
        : state.gamepadControls.throttle;
    if (race.countdown === 0) race.goTime = 0.8;
    return;
  }
  race.goTime = Math.max(0, race.goTime - dt);
  updateOpponents(dt);
  updateCityTraffic(dt);
  feedback.impact *= Math.exp(-7 * dt);
  feedback.impactCooldown = Math.max(0, feedback.impactCooldown - dt);
  timing.flashTime = Math.max(0, timing.flashTime - dt);
  const gamepad = state.gamepadControls,
    gas = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : gamepad.throttle,
    braking = keys.has('KeyS') || keys.has('ArrowDown') ? 1 : gamepad.brake,
    hand = keys.has('Space') || gamepad.handbrake > 0,
    steering = Math.max(
      -1,
      Math.min(
        1,
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
          (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) +
          gamepad.steer,
      ),
    ),
    drive = driveVehicle(
      car,
      {
        steer: steering * state.settings.steeringSensitivity,
        throttle: gas,
        brake: braking,
        handbrake: hand,
      },
      dt,
    ),
    {
      after,
      ax,
      ay,
      forward,
      lateral,
      loose,
      offroad,
      prevX,
      prevY,
      speed,
      surface,
    } = drive;
  if (drive.impact > 65) {
    burst(
      car.x + after.nx * after.side * 17,
      car.y + after.ny * after.side * 17,
      'spark',
      7,
    );
    triggerImpact(drive.impact);
  }
  resolveCityTraffic();
  resolveOpponentCollisions();
  car.slip = Math.abs(lateral);
  const leavingMarks =
    surface !== 'FORD' &&
    speed > 45 &&
    (Math.abs(lateral) > 23 || hand || (braking && forward > 110));
  if (leavingMarks) {
    state.skidClock += dt;
    if (state.skidClock >= 1 / 45) {
      state.skidClock %= 1 / 45;
      for (const side of [-1, 1]) {
        const index = side === -1 ? 0 : 1,
          x = car.x - ax * 13 - ay * side * 9,
          y = car.y - ay * 13 + ax * side * 9,
          previous = state.lastSkid[index];
        skidmarks.push({
          x,
          y,
          px: previous ? previous.x : x - (car.x - prevX),
          py: previous ? previous.y : y - (car.y - prevY),
          life: 26,
          alpha: clamp(Math.abs(lateral) / 100, 0.15, 0.65),
          loose,
        });
        state.lastSkid[index] = { x, y };
      }
    }
    if (Math.random() < dt * 17)
      burst(car.x - ax * 19, car.y - ay * 19, loose ? 'dust' : 'smoke', 1);
  } else {
    state.skidClock = 0;
    state.lastSkid = [null, null];
    if (loose && speed > 35 && Math.random() < dt * 25)
      burst(car.x - ax * 18, car.y - ay * 18, 'dust', 1);
  }
  const before = track[(after.i - 5 + track.length) % track.length],
    ahead = track[(after.i + 5) % track.length],
    turn = before.tx * ahead.ty - before.ty * ahead.tx;
  feedback.rumble =
    !after.pit &&
    speed > 60 &&
    Math.abs(turn) > 0.12 &&
    after.side === Math.sign(turn) &&
    after.distance > widthAt('road', after.progress) - 3 &&
    after.distance < widthAt('road', after.progress) + 12
      ? clamp(speed / 250, 0, 1)
      : 0;
  if (skidmarks.length > 4200) skidmarks.splice(0, skidmarks.length - 4200);
  if (speed > 4) {
    state.movingTime += dt;
    if (state.movingTime > 3) $('hint').style.opacity = '0';
  }
  if (!race.started && speed > 8) {
    race.started = true;
    race.time = 0;
    race.previous = after.progress;
    beginLap();
  }
  if (race.started) updateRace(dt, after);
  recordGhostFrame();
  if (offroad && speed < 7 && gas) {
    race.stuck += dt;
    if (race.stuck > 5) recover(true);
  } else race.stuck = 0;
  for (let i = skidmarks.length - 1; i >= 0; i--) {
    skidmarks[i].life -= dt;
    if (skidmarks[i].life <= 0) skidmarks.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += dt * 7;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function triggerImpact(speed) {
  feedback.impact = Math.max(feedback.impact, clamp(speed / 250, 0.15, 1));
  if (feedback.impactCooldown === 0) {
    playImpact(feedback.impact);
    feedback.impactCooldown = 0.15;
  }
}

export function burst(x, y, type, count) {
  if (state.settings.reducedMotion) return;
  for (let i = 0; i < count; i++)
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 35,
      vy: (Math.random() - 0.5) * 35,
      r: type === 'spark' ? 1.5 : 3,
      life: type === 'spark' ? 0.35 : 1,
      max: type === 'spark' ? 0.35 : 1,
      type,
    });
  if (particles.length > 128) particles.splice(0, particles.length - 128);
}
