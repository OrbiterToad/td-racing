import { conditionFor } from './weather.js';
import { clamp, lerpTo } from './math.js';
import { amazonRiverFrame } from './jungle.js';
import { state } from './state.js';
import { nearestDriving, surfaceAt } from './tracks.js';

// Per-step motion stays outside persistent car/rewind state.
const motion = new WeakMap();

const OFFROAD = ['GRASS', 'GRAVEL', 'SAND', 'SAND PATCH', 'SNOW'];

// Player and race opponents use this same force, grip, steering, and wall model.
export function driveVehicle(vehicle, controls, dt, spec = state.activeCar) {
  motion.set(vehicle, { x: vehicle.x, y: vehicle.y });
  const n = nearestDriving(vehicle.x, vehicle.y),
    surface = surfaceAt(n, vehicle.x, vehicle.y),
    gas = controls.throttle > 0,
    braking = controls.brake > 0,
    hand = controls.handbrake > 0;
  vehicle.surface = surface;
  vehicle.slickTime =
    surface === 'OIL' ? 1.15 : Math.max(0, (vehicle.slickTime || 0) - dt);
  const fx = Math.cos(vehicle.angle),
    fy = Math.sin(vehicle.angle),
    rx = -fy,
    ry = fx;
  let forward = vehicle.vx * fx + vehicle.vy * fy,
    lateral = vehicle.vx * rx + vehicle.vy * ry;
  const speed = Math.hypot(vehicle.vx, vehicle.vy);
  vehicle.steer = lerpTo(
    vehicle.steer || 0,
    clamp(controls.steer || 0, -1, 1),
    1 - Math.exp(-(spec.steerResponse || 9) * dt),
  );
  vehicle.throttle = gas ? 1 : 0;
  vehicle.brake = braking || hand ? 1 : 0;
  const offroad = OFFROAD.includes(surface),
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
                          : state.activeMap.id === 'canyon'
                            ? 0.92
                            : state.activeMap.id === 'alpine'
                              ? 0.95
                              : 1,
    loose = offroad || surface === 'DIRT',
    oilGrip = 1 - 0.8 * clamp(vehicle.slickTime / 1.15, 0, 1),
    aeroSurface =
      surface === 'ASPHALT' || surface === 'PIT LANE' || surface === 'RUNOFF',
    aeroGrip =
      1 +
      (aeroSurface ? (spec.downforce || 0) * clamp(speed / 730, 0, 1) ** 2 : 0),
    powerSlide =
      1 -
      (spec.powerSlide || 0) *
        (gas ? 1 : 0) *
        clamp(Math.abs(forward) / 160, 0, 1) *
        clamp(Math.abs(vehicle.steer) * 2, 0, 1),
    grip =
      conditionFor(state.condition).grip *
      baseGrip *
      spec.grip *
      oilGrip *
      aeroGrip *
      powerSlide *
      ((vehicle.coconutSlip || 0) > 0 ? 0.45 : 1);
  let acceleration = 0;
  if (gas)
    acceleration +=
      forward < -8
        ? spec.brakes
        : spec.power * (1 - clamp(forward / spec.ceiling, 0, 0.93));
  if (braking)
    acceleration +=
      forward > 8 ? -spec.brakes : -95 * (1 - clamp(-forward / 115, 0, 1));
  if (hand && Math.abs(forward) > 2) acceleration -= Math.sign(forward) * 105;
  acceleration *= conditionFor(state.condition).grip;
  if (surface === 'ICE') acceleration *= 0.3;
  if (surface === 'OIL') acceleration *= 0.55;
  acceleration -= forward * 0.12 + forward * Math.abs(forward) * spec.drag;
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
      spec.offroad;
  if (surface === 'DIRT') acceleration -= forward * 0.23 * spec.offroad;
  if (surface === 'FORD') acceleration -= forward * 0.85 * spec.offroad;
  if (!gas && !braking && Math.abs(forward) < 3) forward = 0;
  forward += acceleration * dt;
  const steeringAngle =
      vehicle.steer * (0.52 / (1 + Math.abs(forward) / 190)) * spec.steering,
    targetYaw =
      (forward / spec.wheelbase) * Math.tan(steeringAngle) * (hand ? 1.42 : 1);
  vehicle.yaw = lerpTo(
    vehicle.yaw || 0,
    targetYaw,
    1 - Math.exp(-(hand ? 5.2 : spec.yawResponse || 8) * dt),
  );
  const availableGrip = (hand ? 105 : 420) * grip * (braking ? 0.83 : 1),
    correction =
      clamp(
        -lateral * (hand ? 2.1 : 9.5) * grip,
        -availableGrip,
        availableGrip,
      ) * dt;
  lateral += correction;
  vehicle.vx = fx * forward + rx * lateral;
  vehicle.vy = fy * forward + ry * lateral;
  if (surface === 'FORD') {
    const flow = amazonRiverFrame(vehicle.x, vehicle.y);
    vehicle.vx += flow.tx * 9 * dt;
    vehicle.vy += flow.ty * 9 * dt;
  }
  vehicle.angle += vehicle.yaw * dt;
  const prevX = vehicle.x,
    prevY = vehicle.y;
  vehicle.x += vehicle.vx * dt;
  vehicle.y += vehicle.vy * dt;

  const barrier = resolveVehicleBarrier(vehicle, spec);
  return {
    ...barrier,
    braking,
    grip,
    forward,
    hand,
    loose,
    offroad,
    lateral,
    prevX,
    prevY,
    speed,
    surface,
  };
}

export function resolveVehicleBarrier(vehicle, spec = state.activeCar) {
  const after = nearestDriving(vehicle.x, vehicle.y),
    ax = Math.cos(vehicle.angle),
    ay = Math.sin(vehicle.angle),
    support =
      (Math.abs(ax * after.nx + ay * after.ny) * spec.length) / 2 +
      (Math.abs(-ay * after.nx + ax * after.ny) * spec.width) / 2,
    limit = after.wall - 6 - support;
  let impact = 0;
  if (after.distance > limit) {
    const nx = after.nx * after.side,
      ny = after.ny * after.side;
    vehicle.x = after.x + nx * limit;
    vehicle.y = after.y + ny * limit;
    impact = vehicle.vx * nx + vehicle.vy * ny;
    if (impact > 0) {
      vehicle.vx -= nx * impact * 1.26;
      vehicle.vy -= ny * impact * 1.26;
      vehicle.vx *= 0.84;
      vehicle.vy *= 0.84;
      vehicle.yaw *= 0.4;
    } else impact = 0;
  }
  return { after, ax, ay, impact };
}

// Sweep the relative translation through the same oriented-box separating axes
// used for overlap. Steering changes heading only slightly per fixed step; use
// the current footprint, without adding collision torque to the steering model.
function sweptContact(a, b, specA, specB, startA, startB, axes) {
  if (!startA || !startB) return null;
  const dx = startB.x - startA.x,
    dy = startB.y - startA.y;
  const mx = b.x - a.x - dx,
    my = b.y - a.y - dy;
  let enter = -Infinity,
    exit = Infinity,
    nx = 0,
    ny = 0;
  for (const [x, y] of axes) {
    const radius = support(a, specA, x, y) + support(b, specB, x, y);
    const distance = dx * x + dy * y,
      travel = mx * x + my * y;
    if (Math.abs(travel) < 1e-10) {
      if (Math.abs(distance) >= radius) return null;
      continue;
    }
    const t1 = (-radius - distance) / travel;
    const t2 = (radius - distance) / travel;
    const near = Math.min(t1, t2),
      far = Math.max(t1, t2);
    if (near > enter) {
      enter = near;
      nx = x * (travel < 0 ? 1 : -1);
      ny = y * (travel < 0 ? 1 : -1);
    }
    exit = Math.min(exit, far);
    if (enter >= exit) return null;
  }
  // An initial overlap belongs to the positional solver, not the sweep.
  if (enter < 0 || enter > 1 || exit < 0) return null;
  return { nx, ny, depth: Math.max(0, -(mx * nx + my * ny) * (1 - enter)) };
}

function support(vehicle, spec, x, y) {
  return (
    (Math.abs(x * Math.cos(vehicle.angle) + y * Math.sin(vehicle.angle)) *
      spec.length) /
      2 +
    (Math.abs(-x * Math.sin(vehicle.angle) + y * Math.cos(vehicle.angle)) *
      spec.width) /
      2
  );
}

export function resolveVehicleCollision(a, b, specA, specB, startA, startB) {
  const axes = [
    [Math.cos(a.angle), Math.sin(a.angle)],
    [-Math.sin(a.angle), Math.cos(a.angle)],
    [Math.cos(b.angle), Math.sin(b.angle)],
    [-Math.sin(b.angle), Math.cos(b.angle)],
  ];
  let smallest = Infinity,
    normalX = 0,
    normalY = 0;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const swept = sweptContact(a, b, specA, specB, startA, startB, axes);
  if (swept) {
    smallest = swept.depth;
    normalX = swept.nx;
    normalY = swept.ny;
  } else
    for (const [axisX, axisY] of axes) {
      const overlap =
        support(a, specA, axisX, axisY) +
        support(b, specB, axisX, axisY) -
        Math.abs(dx * axisX + dy * axisY);
      if (overlap <= 1e-9) return 0;
      if (overlap < smallest) {
        smallest = overlap;
        const sign = dx * axisX + dy * axisY < 0 ? -1 : 1;
        normalX = axisX * sign;
        normalY = axisY * sign;
      }
    }
  a.x -= normalX * (smallest / 2);
  a.y -= normalY * (smallest / 2);
  b.x += normalX * (smallest / 2);
  b.y += normalY * (smallest / 2);
  const relativeSpeed = (b.vx - a.vx) * normalX + (b.vy - a.vy) * normalY;
  if (relativeSpeed < 0) {
    // Low-speed rubbing should settle, rather than bounce at every step.
    const restitution = relativeSpeed < -20 ? 0.12 : 0;
    const impulse = (-(1 + restitution) * relativeSpeed) / 2;
    a.vx -= impulse * normalX;
    a.vy -= impulse * normalY;
    b.vx += impulse * normalX;
    b.vy += impulse * normalY;
    a.yaw *= 0.82;
    b.yaw *= 0.82;
  }
  return smallest;
}

// Revisit every contact after neighboring cars and rails move it. The fixed
// iteration budget and alternating traversal are deterministic, including piles
// against a rail. Equal effective masses preserve the existing arcade handling.
export function resolveVehicleContacts(vehicles) {
  const starts = new Map(
    vehicles.map(({ vehicle }) => [
      vehicle,
      motion.get(vehicle) || { x: vehicle.x, y: vehicle.y },
    ]),
  );
  let maximum = 0;
  for (let pass = 0; pass < 64; pass++) {
    let overlap = 0;
    const ordered = pass % 2 ? [...vehicles].reverse() : vehicles;
    for (let i = 0; i < ordered.length; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const a = ordered[i],
          b = ordered[j];
        overlap = Math.max(
          overlap,
          resolveVehicleCollision(
            a.vehicle,
            b.vehicle,
            a.spec,
            b.spec,
            pass === 0 ? starts.get(a.vehicle) : null,
            pass === 0 ? starts.get(b.vehicle) : null,
          ),
        );
      }
    }
    let barrier = 0;
    for (const { vehicle, spec } of vehicles) {
      const x = vehicle.x,
        y = vehicle.y;
      resolveVehicleBarrier(vehicle, spec);
      barrier = Math.max(barrier, Math.hypot(vehicle.x - x, vehicle.y - y));
    }
    maximum = Math.max(maximum, overlap);
    if (overlap < 1e-7 && barrier < 1e-7) break;
  }
  for (const { vehicle } of vehicles) motion.delete(vehicle);
  return maximum;
}
