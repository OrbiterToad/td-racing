import { carImagePath, configureCar, loadCarArt } from './cars.js';
import { CFG, PAINTS, VEHICLES } from './config.js';
import { clamp, lerpTo } from './math.js';
import { inWorldView, roundedRect } from './renderer.js';
import { changeTrack } from './runtime.js';
import {
  car,
  opponentRace,
  race,
  startingGrid,
  state,
  track,
} from './state.js';
import { nearestDriving, pointOnTrack, surfaceAt } from './tracks.js';
import { $, formatTime, notify, syncCarHUD } from './ui.js';

export { opponentRace };
export const opponentArt = {};

export function toggleOpponentRace() {
  opponentRace.enabled = !opponentRace.enabled;
  if (opponentRace.enabled) {
    configureCar('clubsport', state.paint);
    loadCarArt();
    syncCarHUD();
    changeTrack('juniper', false);
    notify('CLUB RACE · Three laps · Contact racing');
  } else {
    changeTrack(state.activeMap.id, false);
    notify('TIME TRIAL · Find your next personal best');
  }
}

export function resetOpponentRace() {
  Object.assign(opponentRace, {
    elapsed: 0,
    finished: false,
    playerFinish: null,
    cars: [],
    profile: [],
  });
  if (!opponentRace.enabled) return;
  const count = Math.ceil(track.totalLength / 80);
  opponentRace.spacing = track.totalLength / count;
  // A speed plan based on curvature and oil, with a braking envelope so the
  // drivers slow before a corner. No speed changes depend on player position.
  for (let i = 0; i < count; i++) {
    const s = i * opponentRace.spacing,
      p = pointOnTrack(s),
      before = pointOnTrack(s - 40),
      ahead = pointOnTrack(s + 40),
      turn = Math.abs(
        Math.atan2(
          before.tx * ahead.ty - before.ty * ahead.tx,
          before.tx * ahead.tx + before.ty * ahead.ty,
        ),
      ),
      oily = state.activeMap.patches.some((patch) => {
        const gap = Math.abs(p.progress - patch.progress);
        return Math.min(gap, 1 - gap) * track.totalLength < patch.length + 100;
      });
    opponentRace.profile.push(
      Math.min(
        335,
        Math.sqrt(300 / Math.max(turn / 80, 0.0001)),
        oily ? 155 : Infinity,
      ),
    );
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = count - 1; i >= 0; i--) {
      const next = opponentRace.profile[(i + 1) % count];
      opponentRace.profile[i] = Math.min(
        opponentRace.profile[i],
        Math.sqrt(next * next + 2 * 220 * opponentRace.spacing),
      );
    }
  }
  const slots = startingGrid
    .map((_, i) => i)
    .filter((i) => i !== state.selectedStart);
  const colors = ['blue', 'yellow', 'green', 'black', 'red'].filter(
    (c) => c !== state.paint,
  );
  for (let i = 0; i < 3; i++) {
    const slot = slots[i],
      color = colors[i];
    if (!opponentArt[color] && typeof Image !== 'undefined') {
      const art = new Image();
      art.src = carImagePath('clubsport', color);
      opponentArt[color] = art;
    }
    const rival = {
      name: ['Alex', 'Blair', 'Casey'][i],
      paint: color,
      s: -90 - slot * 80,
      speed: 0,
      vx: 0,
      vy: 0,
      yaw: 0,
      steer: 0,
      slickTime: 0,
      pace: [0.98, 0.91, 0.84][i],
      lane: [-26, 26, 0][i],
      offset: CFG.road * 0.4 * (slot % 2 ? 1 : -1),
      brake: false,
      finish: null,
    };
    opponentRace.cars.push(rival);
  }
}

export function positionOpponent(rival) {
  const p = pointOnTrack(rival.s),
    before = pointOnTrack(rival.s - 12),
    ahead = pointOnTrack(rival.s + 12);
  rival.x = p.x - p.ty * rival.offset;
  rival.y = p.y + p.tx * rival.offset;
  rival.angle = Math.atan2(ahead.y - before.y, ahead.x - before.x);
}

export function updateOpponents(dt) {
  if (!opponentRace.enabled || opponentRace.finished || race.countdown > 0)
    return;
  opponentRace.elapsed += dt;
  const length = track.totalLength,
    finish = length * opponentRace.laps;
  for (const rival of opponentRace.cars) {
    if (rival.finish !== null) continue;
    const s = ((rival.s % length) + length) % length,
      index = Math.floor(s / opponentRace.spacing),
      target = opponentRace.profile[index] * rival.pace,
      previous = rival.s;
    const aim = pointOnTrack(rival.s + 75),
      aimX = aim.x - aim.ty * rival.lane,
      aimY = aim.y + aim.tx * rival.lane,
      desired = Math.atan2(aimY - rival.y, aimX - rival.x),
      error = Math.atan2(
        Math.sin(desired - rival.angle),
        Math.cos(desired - rival.angle),
      ),
      steering = clamp(error * 2.8, -1, 1),
      config = VEHICLES.clubsport;
    const nearest = nearestDriving(rival.x, rival.y),
      surface = surfaceAt(nearest, rival.x, rival.y);
    rival.slickTime =
      surface === 'OIL' ? 1.15 : Math.max(0, rival.slickTime - dt);
    rival.steer = lerpTo(rival.steer, steering, 1 - Math.exp(-9 * dt));
    const fx = Math.cos(rival.angle),
      fy = Math.sin(rival.angle),
      rx = -fy,
      ry = fx;
    let forward = rival.vx * fx + rival.vy * fy,
      lateral = rival.vx * rx + rival.vy * ry;
    const speed = Math.hypot(rival.vx, rival.vy),
      gas = forward < target - 5,
      braking = forward > target + 5,
      offroad = ['GRASS', 'GRAVEL', 'SAND', 'SAND PATCH', 'SNOW'].includes(
        surface,
      ),
      baseGrip =
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
                            : 1,
      oilGrip = 1 - 0.8 * clamp(rival.slickTime / 1.15, 0, 1),
      aeroSurface = ['ASPHALT', 'PIT LANE', 'RUNOFF'].includes(surface),
      aeroGrip =
        1 +
        (aeroSurface
          ? (config.downforce || 0) * clamp(speed / 730, 0, 1) ** 2
          : 0),
      powerSlide =
        1 -
        (config.powerSlide || 0) *
          (gas ? 1 : 0) *
          clamp(Math.abs(forward) / 160, 0, 1) *
          clamp(Math.abs(rival.steer) * 2, 0, 1),
      grip = baseGrip * config.grip * oilGrip * aeroGrip * powerSlide;
    let acceleration = 0;
    if (gas)
      acceleration +=
        forward < -8
          ? config.brakes
          : config.power * (1 - clamp(forward / config.ceiling, 0, 0.93));
    if (braking)
      acceleration +=
        forward > 8 ? -config.brakes : -95 * (1 - clamp(-forward / 115, 0, 1));
    if (surface === 'ICE') acceleration *= 0.3;
    if (surface === 'OIL') acceleration *= 0.55;
    acceleration -= forward * 0.12 + forward * Math.abs(forward) * config.drag;
    if (offroad)
      acceleration -=
        forward *
        (surface === 'SAND'
          ? 1.4
          : surface === 'SAND PATCH' || surface === 'SNOW'
            ? 0.85
            : surface === 'GRAVEL'
              ? 1.15
              : 0.58) *
        config.offroad;
    if (surface === 'DIRT') acceleration -= forward * 0.23 * config.offroad;
    if (!gas && !braking && Math.abs(forward) < 3) forward = 0;
    forward += acceleration * dt;
    const steeringAngle =
        rival.steer * (0.52 / (1 + Math.abs(forward) / 190)) * config.steering,
      targetYaw = (forward / config.wheelbase) * Math.tan(steeringAngle);
    rival.yaw = lerpTo(
      rival.yaw,
      targetYaw,
      1 - Math.exp(-(config.yawResponse || 8) * dt),
    );
    const availableGrip = 420 * grip * (braking ? 0.83 : 1);
    lateral += clamp(-lateral * 9.5 * grip, -availableGrip, availableGrip) * dt;
    rival.vx = fx * forward + rx * lateral;
    rival.vy = fy * forward + ry * lateral;
    rival.angle += rival.yaw * dt;
    rival.x += rival.vx * dt;
    rival.y += rival.vy * dt;
    const wall = nearestDriving(rival.x, rival.y),
      axisX = Math.cos(rival.angle),
      axisY = Math.sin(rival.angle),
      support =
        (Math.abs(axisX * wall.nx + axisY * wall.ny) * config.length) / 2 +
        (Math.abs(-axisY * wall.nx + axisX * wall.ny) * config.width) / 2,
      limit = wall.wall - 6 - support;
    if (wall.distance > limit) {
      const nx = wall.nx * wall.side,
        ny = wall.ny * wall.side;
      rival.x = wall.x + nx * limit;
      rival.y = wall.y + ny * limit;
      const impact = rival.vx * nx + rival.vy * ny;
      if (impact > 0) {
        rival.vx -= nx * impact * 1.26;
        rival.vy -= ny * impact * 1.26;
        rival.vx *= 0.84;
        rival.vy *= 0.84;
        rival.yaw *= 0.4;
      }
    }
    rival.speed = Math.hypot(rival.vx, rival.vy);
    rival.brake = braking;
    rival.offset = lerpTo(rival.offset, rival.lane, 1 - Math.exp(-dt));
    const progress = nearestDriving(rival.x, rival.y).progress;
    rival.s = Math.floor(previous / length) * length + progress * length;
    while (rival.s < previous - length / 2) rival.s += length;
    if (rival.s >= finish) {
      rival.finish =
        opponentRace.elapsed -
        dt +
        (dt * (finish - previous)) / (rival.s - previous);
      rival.s = finish;
      rival.speed = 0;
      rival.brake = false;
    }
  }
  resolveOpponentCollisions();
}

export function resolveOpponentCollisions() {
  const vehicles = [
    { car, config: VEHICLES.clubsport, player: true },
    ...opponentRace.cars
      .filter((rival) => rival.finish === null)
      .map((rival) => ({ car: rival, config: VEHICLES.clubsport })),
  ];
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i],
        b = vehicles[j],
        dx = b.car.x - a.car.x,
        dy = b.car.y - a.car.y;
      if (dx * dx + dy * dy > 75 * 75) continue;
      let depth = Infinity,
        nx = 0,
        ny = 0,
        separated = false;
      for (const angle of [
        a.car.angle,
        a.car.angle + Math.PI / 2,
        b.car.angle,
        b.car.angle + Math.PI / 2,
      ]) {
        const ax = Math.cos(angle),
          ay = Math.sin(angle),
          extent = (vehicle, axis) =>
            (Math.abs(
              Math.cos(vehicle.car.angle) * axis[0] +
                Math.sin(vehicle.car.angle) * axis[1],
            ) *
              vehicle.config.length) /
              2 +
            (Math.abs(
              -Math.sin(vehicle.car.angle) * axis[0] +
                Math.cos(vehicle.car.angle) * axis[1],
            ) *
              vehicle.config.width) /
              2,
          overlap =
            extent(a, [ax, ay]) +
            extent(b, [ax, ay]) -
            Math.abs(dx * ax + dy * ay);
        if (overlap <= 0) {
          separated = true;
          break;
        }
        if (overlap < depth) {
          depth = overlap;
          const sign = dx * ax + dy * ay >= 0 ? 1 : -1;
          nx = ax * sign;
          ny = ay * sign;
        }
      }
      if (separated) continue;
      a.car.x -= nx * (depth / 2 + 0.5);
      a.car.y -= ny * (depth / 2 + 0.5);
      b.car.x += nx * (depth / 2 + 0.5);
      b.car.y += ny * (depth / 2 + 0.5);
      const impact = (b.car.vx - a.car.vx) * nx + (b.car.vy - a.car.vy) * ny;
      if (impact < 0) {
        a.car.vx += nx * impact * 0.65;
        a.car.vy += ny * impact * 0.65;
        b.car.vx -= nx * impact * 0.65;
        b.car.vy -= ny * impact * 0.65;
      }
      a.car.vx *= 0.88;
      a.car.vy *= 0.88;
      b.car.vx *= 0.88;
      b.car.vy *= 0.88;
    }
  }
}

export function opponentStandings() {
  const n = nearestDriving(car.x, car.y),
    index = Math.min(track.length - 1, Math.floor(n.progress * track.length)),
    a = track[index],
    b = track[(index + 1) % track.length],
    s =
      a.s +
      (n.progress * track.length - index) * Math.hypot(b.x - a.x, b.y - a.y),
    player = {
      name: 'You',
      player: true,
      paint: state.paint,
      finish: opponentRace.playerFinish,
      s: race.crossedStart
        ? (race.lap - 1) * track.totalLength + s
        : s - track.totalLength,
    };
  return [player, ...opponentRace.cars].sort((a, b) => {
    if (a.finish !== null || b.finish !== null) {
      if (a.finish === null) return 1;
      if (b.finish === null) return -1;
      return a.finish - b.finish;
    }
    return b.s - a.s;
  });
}

export function updateOpponentHUD() {
  const enabled = opponentRace.enabled;
  $('race-mode').textContent = enabled ? 'Time trial' : 'Race AI · Juniper';
  $('race-mode').setAttribute('aria-pressed', String(enabled));
  $('race-panel').hidden = !enabled;
  $('session-mode').textContent = enabled ? 'CLUB RACE' : 'FREE PRACTICE';
  $('session-drivers').textContent = enabled
    ? '04 DRIVERS · 03 LAPS'
    : '01 DRIVER · NO LIMITS';
  if (!enabled) return;
  const standings = opponentStandings(),
    place = standings.findIndex((entry) => entry.player) + 1;
  $('race-position').textContent = opponentRace.finished
    ? 'FINISHED · P' + place + ' / 4'
    : 'POSITION ' + place + ' / 4';
  $('race-elapsed').textContent = formatTime(
    opponentRace.playerFinish ?? opponentRace.elapsed,
  );
  $('race-standings').textContent = standings
    .map(
      (entry, index) =>
        index +
        1 +
        '. ' +
        entry.name +
        (entry.finish !== null ? ' · ' + formatTime(entry.finish) : ''),
    )
    .join('\n');
  $('race-help').textContent = opponentRace.finished
    ? 'N / Restart to race again · Time trial to leave'
    : 'Non-contact · Pass every sector · R invalidates the lap';
}

export function drawOpponents(c) {
  for (const rival of opponentRace.cars) {
    if (!inWorldView(rival.x, rival.y, 80)) continue;
    c.save();
    c.translate(rival.x, rival.y);
    c.rotate(rival.angle);
    c.globalAlpha = 0.8;
    const art = opponentArt[rival.paint];
    if (art && art.complete && art.naturalWidth) {
      c.save();
      c.rotate(Math.PI / 2);
      c.drawImage(art, -12, -22, 24, 44);
      c.restore();
    } else {
      c.fillStyle = PAINTS[rival.paint].hex;
      roundedRect(c, -22, -12, 44, 24, 4);
      c.fill();
    }
    if (rival.brake) {
      c.fillStyle = '#ff6a4f';
      c.fillRect(-22, -10, 3, 5);
      c.fillRect(-22, 5, 3, 5);
    }
    c.restore();
    c.save();
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.lineWidth = 3;
    c.strokeStyle = '#13231f';
    c.fillStyle = PAINTS[rival.paint].hex;
    c.strokeText(rival.name + ' · AI', rival.x, rival.y - 30);
    c.fillText(rival.name + ' · AI', rival.x, rival.y - 30);
    c.restore();
  }
}
