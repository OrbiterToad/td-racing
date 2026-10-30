import { playImpact } from './audio.js';
import { coast } from './coast.js';
import { recordGhostFrame } from './ghost.js';
import { amazonRiverFrame, updateJungle } from './jungle.js';
import { clamp, lerpTo } from './math.js';
import { beginLap, recover, updateRace } from './race.js';
import {
  car,
  feedback,
  keys,
  lapGhost,
  particles,
  race,
  skidmarks,
  state,
  timing,
  track,
} from './state.js';
import { nearestDriving, surfaceAt, widthAt } from './tracks.js';
import { resolveCityTraffic, updateCityTraffic } from './traffic.js';
import { $ } from './ui.js';

export function simulate(dt) {
  lapGhost.previous = [car.x, car.y, car.angle];
  updateJungle(dt);
  if (state.activeMap.id === 'coast') coast.time += dt;
  if (race.countdown > 0) {
    race.countdown = Math.max(0, race.countdown - dt);
    car.vx = 0;
    car.vy = 0;
    car.yaw = 0;
    car.throttle = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0;
    if (race.countdown === 0) race.goTime = 0.8;
    return;
  }
  race.goTime = Math.max(0, race.goTime - dt);
  updateCityTraffic(dt);
  feedback.impact *= Math.exp(-7 * dt);
  feedback.impactCooldown = Math.max(0, feedback.impactCooldown - dt);
  timing.flashTime = Math.max(0, timing.flashTime - dt);
  const n = nearestDriving(car.x, car.y),
    surface = surfaceAt(n, car.x, car.y);
  car.surface = surface;
  car.slickTime = surface === 'OIL' ? 1.15 : Math.max(0, car.slickTime - dt);
  const fx = Math.cos(car.angle),
    fy = Math.sin(car.angle),
    rx = -fy,
    ry = fx;
  let forward = car.vx * fx + car.vy * fy,
    lateral = car.vx * rx + car.vy * ry;
  const speed = Math.hypot(car.vx, car.vy),
    gas = keys.has('KeyW') || keys.has('ArrowUp'),
    braking = keys.has('KeyS') || keys.has('ArrowDown'),
    hand = keys.has('Space');
  const steering =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  car.steer = lerpTo(
    car.steer,
    steering,
    1 - Math.exp(-(state.activeCar.steerResponse || 9) * dt),
  );
  car.throttle = gas ? 1 : 0;
  car.brake = braking || hand ? 1 : 0;
  const offroad = ['GRASS', 'GRAVEL', 'SAND', 'SAND PATCH', 'SNOW'].includes(
    surface,
  );
  const baseGrip =
    surface === 'FORD'
      ? 0.55
      : surface === 'DIRT'
        ? 0.62
        : surface === 'ICE'
          ? 0.13
          : surface === 'OIL'
            ? 0.12
            : surface === 'SAND PATCH'
              ? 0.48
              : surface === 'SAND'
                ? 0.32
                : surface === 'SNOW'
                  ? 0.4
                  : surface === 'GRASS'
                    ? 0.58
                    : surface === 'GRAVEL'
                      ? 0.43
                      : surface === 'RUNOFF'
                        ? 0.9
                        : state.activeMap.id === 'canyon'
                          ? 0.92
                          : state.activeMap.id === 'alpine'
                            ? 0.95
                            : 1;
  const loose = offroad || surface === 'DIRT';
  const oilGrip = 1 - 0.8 * clamp(car.slickTime / 1.15, 0, 1),
    aeroSurface =
      surface === 'ASPHALT' || surface === 'PIT LANE' || surface === 'RUNOFF',
    aeroGrip =
      1 +
      (aeroSurface
        ? (state.activeCar.downforce || 0) * clamp(speed / 730, 0, 1) ** 2
        : 0),
    powerSlide =
      1 -
      (state.activeCar.powerSlide || 0) *
        (gas ? 1 : 0) *
        clamp(Math.abs(forward) / 160, 0, 1) *
        clamp(Math.abs(car.steer) * 2, 0, 1),
    grip =
      baseGrip *
      state.activeCar.grip *
      oilGrip *
      aeroGrip *
      powerSlide *
      (car.coconutSlip > 0 ? 0.45 : 1);
  let acceleration = 0;
  if (gas)
    acceleration +=
      forward < -8
        ? state.activeCar.brakes
        : state.activeCar.power *
          (1 - clamp(forward / state.activeCar.ceiling, 0, 0.93));
  if (braking)
    acceleration +=
      forward > 8
        ? -state.activeCar.brakes
        : -95 * (1 - clamp(-forward / 115, 0, 1));
  if (hand && Math.abs(forward) > 2) acceleration -= Math.sign(forward) * 105;
  if (surface === 'ICE') acceleration *= 0.3;
  if (surface === 'OIL') acceleration *= 0.55;
  // Aerodynamic drag plus surface-dependent rolling resistance.
  acceleration -=
    forward * 0.12 + forward * Math.abs(forward) * state.activeCar.drag;
  if (offroad)
    acceleration -=
      forward *
      (surface === 'SAND'
        ? 1.4
        : surface === 'SAND PATCH'
          ? 0.85
          : surface === 'SNOW'
            ? 0.85
            : surface === 'GRAVEL'
              ? 1.15
              : 0.58) *
      state.activeCar.offroad;
  if (surface === 'DIRT')
    acceleration -= forward * 0.23 * state.activeCar.offroad;
  if (surface === 'FORD') {
    acceleration -= forward * 0.85 * state.activeCar.offroad;
    if (speed > 30 && Math.random() < dt * 28)
      burst(car.x - fx * 18, car.y - fy * 18, 'water', 2);
  }
  if (!gas && !braking && Math.abs(forward) < 3) forward = 0;
  forward += acceleration * dt;
  const steeringAngle =
    car.steer *
    (0.52 / (1 + Math.abs(forward) / 190)) *
    state.activeCar.steering;
  const targetYaw =
    (forward / state.activeCar.wheelbase) *
    Math.tan(steeringAngle) *
    (hand ? 1.42 : 1);
  car.yaw = lerpTo(
    car.yaw,
    targetYaw,
    1 - Math.exp(-(hand ? 5.2 : state.activeCar.yawResponse || 8) * dt),
  );
  // Friction has a finite lateral acceleration budget, so excessive speed breaks traction.
  const availableGrip = (hand ? 105 : 420) * grip * (braking ? 0.83 : 1);
  const correction =
    clamp(-lateral * (hand ? 2.1 : 9.5) * grip, -availableGrip, availableGrip) *
    dt;
  lateral += correction;
  car.vx = fx * forward + rx * lateral;
  car.vy = fy * forward + ry * lateral;
  if (surface === 'FORD') {
    const flow = amazonRiverFrame(car.x, car.y);
    car.vx += flow.tx * 9 * dt;
    car.vy += flow.ty * 9 * dt;
  }
  car.angle += car.yaw * dt;
  const prevX = car.x,
    prevY = car.y;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  // Resolve the car's oriented box against both continuous hard boundaries.
  const after = nearestDriving(car.x, car.y),
    ax = Math.cos(car.angle),
    ay = Math.sin(car.angle);
  const support =
    (Math.abs(ax * after.nx + ay * after.ny) * state.activeCar.length) / 2 +
    (Math.abs(-ay * after.nx + ax * after.ny) * state.activeCar.width) / 2;
  const limit = after.wall - 6 - support;
  if (after.distance > limit) {
    const nx = after.nx * after.side,
      ny = after.ny * after.side;
    car.x = after.x + nx * limit;
    car.y = after.y + ny * limit;
    const impact = car.vx * nx + car.vy * ny;
    if (impact > 0) {
      car.vx -= nx * impact * 1.26;
      car.vy -= ny * impact * 1.26;
      car.vx *= 0.84;
      car.vy *= 0.84;
      car.yaw *= 0.4;
      if (impact > 65) {
        burst(car.x + nx * 17, car.y + ny * 17, 'spark', 7);
        triggerImpact(impact);
      }
    }
  }
  resolveCityTraffic();
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
