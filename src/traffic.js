import { lerpTo, seededRandom } from './math.js';
import { burst, triggerImpact } from './physics.js';
import { roundedRect } from './renderer.js';
import { car, cityTraffic, state, track, trafficArt } from './state.js';
import { nearest, nearestDriving, pointOnTrack } from './tracks.js';
import { notify } from './ui.js';

export function resetCityTraffic() {
  cityTraffic.cars.length = 0;
  cityTraffic.wait = 4;
  cityTraffic.random = seededRandom(927);
}

export function loadTrafficArt() {
  for (const color of ['blue', 'black', 'yellow', 'red'])
    if (!trafficArt[color]) {
      const art = new Image();
      art.src = 'assets/kenney/PNG/Cars/car_' + color + '_2.png';
      trafficArt[color] = art;
    }
}

export function updateTrafficPose(vehicle) {
  const p = pointOnTrack(vehicle.s),
    offset = vehicle.direction * 26;
  vehicle.x = p.x - p.ty * offset;
  vehicle.y = p.y + p.tx * offset;
  vehicle.angle =
    Math.atan2(p.ty, p.tx) + (vehicle.direction < 0 ? Math.PI : 0);
  vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
  vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
}

export function spawnCityTraffic() {
  if (state.activeMap.id !== 'city' || cityTraffic.cars.length >= 2)
    return false;
  const rand = cityTraffic.random,
    near = nearest(car.x, car.y),
    point = track[near.i];
  let s = point.s + 850 + rand() * 500;
  for (let i = 0; i < 12; i++) {
    const p = pointOnTrack(s);
    if (
      Math.hypot(p.x - car.x, p.y - car.y) > 620 &&
      cityTraffic.cars.every(
        (other) => Math.hypot(p.x - other.x, p.y - other.y) > 150,
      )
    )
      break;
    s += 240;
  }
  const vehicle = {
    s: ((s % track.totalLength) + track.totalLength) % track.totalLength,
    direction: rand() < 0.6 ? -1 : 1,
    cruise: 90 + rand() * 50,
    speed: 0,
    brake: 0,
    cooldown: 0,
    age: 0,
    life: 28 + rand() * 14,
    color: ['blue', 'black', 'yellow', 'red'][Math.floor(rand() * 4)],
    length: 42,
    width: 22,
  };
  vehicle.speed = vehicle.cruise;
  updateTrafficPose(vehicle);
  cityTraffic.cars.push(vehicle);
  return true;
}

export function updateCityTraffic(dt) {
  if (state.activeMap.id !== 'city') return;
  cityTraffic.wait -= dt;
  if (cityTraffic.wait <= 0) {
    if (spawnCityTraffic()) cityTraffic.wait = 14 + cityTraffic.random() * 9;
    else cityTraffic.wait = 2;
  }
  for (let i = cityTraffic.cars.length - 1; i >= 0; i--) {
    const vehicle = cityTraffic.cars[i];
    vehicle.age += dt;
    vehicle.brake = Math.max(0, vehicle.brake - dt);
    vehicle.cooldown = Math.max(0, vehicle.cooldown - dt);
    let target = vehicle.brake > 0 ? 0 : vehicle.cruise;
    for (const other of cityTraffic.cars) {
      if (other === vehicle || other.direction !== vehicle.direction) continue;
      const gap =
        ((other.s - vehicle.s) * vehicle.direction + track.totalLength) %
        track.totalLength;
      if (gap < 130)
        target = Math.min(target, Math.max(0, (other.speed * (gap - 50)) / 80));
    }
    vehicle.speed = lerpTo(vehicle.speed, target, Math.min(1, dt * 3));
    vehicle.s =
      (vehicle.s + vehicle.direction * vehicle.speed * dt + track.totalLength) %
      track.totalLength;
    updateTrafficPose(vehicle);
    if (
      vehicle.age > vehicle.life &&
      Math.hypot(vehicle.x - car.x, vehicle.y - car.y) > 900
    )
      cityTraffic.cars.splice(i, 1);
  }
}

export function resolveCityTraffic() {
  if (state.activeMap.id !== 'city') return;
  for (const vehicle of cityTraffic.cars) {
    const dx = car.x - vehicle.x,
      dy = car.y - vehicle.y;
    if (dx * dx + dy * dy > 75 * 75) continue;
    const axes = [
      [Math.cos(car.angle), Math.sin(car.angle)],
      [Math.cos(car.angle + Math.PI / 2), Math.sin(car.angle + Math.PI / 2)],
      [Math.cos(vehicle.angle), Math.sin(vehicle.angle)],
      [
        Math.cos(vehicle.angle + Math.PI / 2),
        Math.sin(vehicle.angle + Math.PI / 2),
      ],
    ];
    let depth = Infinity,
      nx = 0,
      ny = 0,
      separate = false;
    for (const [ax, ay] of axes) {
      const player =
          (Math.abs(ax * Math.cos(car.angle) + ay * Math.sin(car.angle)) *
            state.activeCar.length) /
            2 +
          (Math.abs(-ax * Math.sin(car.angle) + ay * Math.cos(car.angle)) *
            state.activeCar.width) /
            2,
        other =
          (Math.abs(
            ax * Math.cos(vehicle.angle) + ay * Math.sin(vehicle.angle),
          ) *
            vehicle.length) /
            2 +
          (Math.abs(
            -ax * Math.sin(vehicle.angle) + ay * Math.cos(vehicle.angle),
          ) *
            vehicle.width) /
            2,
        projection = dx * ax + dy * ay,
        overlap = player + other - Math.abs(projection);
      if (overlap <= 0) {
        separate = true;
        break;
      }
      if (overlap < depth) {
        depth = overlap;
        const side = projection >= 0 ? 1 : -1;
        nx = ax * side;
        ny = ay * side;
      }
    }
    if (separate) continue;
    car.x += nx * (depth + 1);
    car.y += ny * (depth + 1);
    const impact = (car.vx - vehicle.vx) * nx + (car.vy - vehicle.vy) * ny;
    if (impact < 0) {
      car.vx -= nx * impact;
      car.vy -= ny * impact;
    }
    car.vx *= 0.72;
    car.vy *= 0.72;
    vehicle.brake = 1;
    if (vehicle.cooldown === 0) {
      vehicle.cooldown = 2;
      burst(car.x, car.y, 'spark', 5);
      triggerImpact(Math.abs(impact));
      notify('TRAFFIC · Give other drivers room');
    }
    const n = nearestDriving(car.x, car.y),
      support =
        (Math.abs(Math.cos(car.angle) * n.nx + Math.sin(car.angle) * n.ny) *
          state.activeCar.length) /
          2 +
        (Math.abs(-Math.sin(car.angle) * n.nx + Math.cos(car.angle) * n.ny) *
          state.activeCar.width) /
          2,
      limit = n.wall - 6 - support;
    if (n.distance > limit) {
      car.x = n.x + n.nx * n.side * limit;
      car.y = n.y + n.ny * n.side * limit;
    }
  }
}

export function drawCityTraffic(c) {
  if (state.activeMap.id !== 'city') return;
  const colors = {
    blue: '#7fa6b2',
    black: '#687778',
    yellow: '#c8b37a',
    red: '#b77f69',
  };
  for (const vehicle of cityTraffic.cars) {
    c.save();
    c.translate(vehicle.x, vehicle.y);
    c.rotate(vehicle.angle);
    c.globalAlpha = Math.min(1, vehicle.age * 2);
    c.fillStyle = '#253d3430';
    roundedRect(c, -20 + 3, -11 + 4, 42, 22, 4);
    c.fill();
    const art = trafficArt[vehicle.color];
    if (art && art.complete && art.naturalWidth) {
      c.save();
      c.rotate(Math.PI / 2);
      c.drawImage(
        art,
        -vehicle.width / 2,
        -vehicle.length / 2,
        vehicle.width,
        vehicle.length,
      );
      c.restore();
    } else {
      c.fillStyle = colors[vehicle.color];
      roundedRect(c, -21, -11, 42, 22, 4);
      c.fill();
      c.fillStyle = '#c4d9d4';
      c.fillRect(5, -8, 8, 16);
    }
    if (vehicle.brake > 0) {
      c.fillStyle = '#f49475';
      c.fillRect(-21, -9, 3, 5);
      c.fillRect(-21, 4, 3, 5);
    }
    c.restore();
  }
}
