import assert from 'node:assert/strict';
import { before, beforeEach, test } from 'node:test';
import { configureCar } from '../src/cars.js';
import { CFG, VEHICLES } from '../src/config.js';
import {
  resolveOpponentCollisions,
  updateOpponents,
} from '../src/opponents.js';
import { simulate } from '../src/physics.js';
import { recover } from '../src/race.js';
import { car, keys, opponentRace, race, track } from '../src/state.js';
import { configureTrack, nearestDriving, pointOnTrack } from '../src/tracks.js';
import {
  driveVehicle,
  resolveVehicleCollision,
  resolveVehicleContacts,
} from '../src/vehicle-physics.js';

const spec = VEHICLES.clubsport;
const dt = CFG.step;
const idle = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };

function vehicle(x = 0, y = 0, angle = 0, vx = 0, vy = 0) {
  return {
    x,
    y,
    angle,
    vx,
    vy,
    yaw: 0,
    steer: 0,
    slickTime: 0,
    coconutSlip: 0,
    slip: 0,
  };
}

function speed(body) {
  return Math.hypot(body.vx, body.vy);
}

function energy(bodies) {
  return bodies.reduce((sum, body) => sum + body.vx ** 2 + body.vy ** 2, 0);
}

function finite(body) {
  for (const field of ['x', 'y', 'angle', 'vx', 'vy', 'yaw'])
    assert(Number.isFinite(body[field]), `${field} must remain finite`);
}

function near(actual, expected, message) {
  assert(
    Math.abs(actual - expected) < 1e-7,
    `${message}: ${actual} vs ${expected}`,
  );
}

function onTrack(distance, offset = 0, forward = 0, sideways = 0) {
  const p = pointOnTrack(distance);
  return vehicle(
    p.x - p.ty * offset,
    p.y + p.tx * offset,
    Math.atan2(p.ty, p.tx),
    p.tx * forward - p.ty * sideways,
    p.ty * forward + p.tx * sideways,
  );
}

function withinBarriers(body) {
  const p = nearestDriving(body.x, body.y);
  const cos = Math.cos(body.angle),
    sin = Math.sin(body.angle);
  // Project the four actual corners onto the local rail normal. Checking the
  // center alone would miss a bumper or side pushed through the barrier.
  for (const forward of [-spec.length / 2, spec.length / 2]) {
    for (const side of [-spec.width / 2, spec.width / 2]) {
      const x = body.x + cos * forward - sin * side;
      const y = body.y + sin * forward + cos * side;
      const lateral = Math.abs((x - p.x) * p.nx + (y - p.y) * p.ny);
      assert(
        lateral <= p.wall - 6 + 1e-6,
        `The full vehicle footprint must remain inside the track barrier (penetration: ${lateral - (p.wall - 6)})`,
      );
    }
  }
}

before(() => {
  // Only recovery notifications and simulation hints need DOM nodes here.
  const nodes = new Map();
  globalThis.document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { style: {}, classList: { add() {} } });
      return nodes.get(id);
    },
  };
  configureCar('clubsport', 'red');
  configureTrack('juniper');
});

beforeEach(() => {
  keys.clear();
  Object.assign(opponentRace, {
    enabled: false,
    finished: false,
    elapsed: 0,
    cars: [],
  });
  Object.assign(race, {
    countdown: 0,
    goTime: 0,
    started: false,
    crossedStart: false,
    time: 0,
    lap: 1,
    next: 1,
    invalid: false,
    travel: 0,
    stuck: 0,
  });
  Object.assign(car, onTrack(500));
});

for (const angle of [0, Math.PI / 3, Math.PI / 2]) {
  test(`rear-end impact transfers forward momentum at heading ${angle}`, () => {
    const fx = Math.cos(angle),
      fy = Math.sin(angle);
    const rear = vehicle(0, 0, angle, fx * 140, fy * 140);
    const front = vehicle(
      fx * (spec.length - 3),
      fy * (spec.length - 3),
      angle,
      fx * 20,
      fy * 20,
    );
    const initialEnergy = energy([rear, front]);
    resolveVehicleCollision(rear, front, spec, spec);
    assert(speed(rear) < 140, 'The striking car must slow');
    assert(speed(front) > 20, 'The struck car must receive momentum');
    near(rear.vx + front.vx, fx * 160, 'Horizontal momentum is conserved');
    near(rear.vy + front.vy, fy * 160, 'Vertical momentum is conserved');
    assert(
      energy([rear, front]) <= initialEnergy + 1e-7,
      'Contact must not create kinetic energy',
    );
    assert(
      (front.x - rear.x) * fx + (front.y - rear.y) * fy >= spec.length - 1e-7,
      'Overlapping bumpers must separate',
    );
  });

  test(`side impact transfers lateral momentum without changing forward motion at heading ${angle}`, () => {
    const fx = Math.cos(angle),
      fy = Math.sin(angle),
      nx = -fy,
      ny = fx;
    const a = vehicle(0, 0, angle, fx * 80 + nx * 100, fy * 80 + ny * 100);
    const b = vehicle(
      nx * (spec.width - 3),
      ny * (spec.width - 3),
      angle,
      fx * 80,
      fy * 80,
    );
    const initialEnergy = energy([a, b]);
    resolveVehicleCollision(a, b, spec, spec);
    assert(
      a.vx * nx + a.vy * ny < 100,
      'The striking car must lose lateral speed',
    );
    assert(
      b.vx * nx + b.vy * ny > 0,
      'The struck car must move away from the impact',
    );
    for (const body of [a, b])
      near(
        body.vx * fx + body.vy * fy,
        80,
        'Forward motion is unaffected by a purely lateral impulse',
      );
    assert(energy([a, b]) <= initialEnergy + 1e-7);
    assert(
      (b.x - a.x) * nx + (b.y - a.y) * ny >= spec.width - 1e-7,
      'Overlapping sides must separate',
    );
  });
}

for (const offset of [0, spec.width / 2]) {
  test(`stationary overlap at offset ${offset} separates without inventing motion`, () => {
    const a = vehicle(),
      b = vehicle(0, offset);
    resolveVehicleCollision(a, b, spec, spec);
    assert(Math.hypot(b.x - a.x, b.y - a.y) >= spec.width - 1e-7);
    assert.equal(speed(a) + speed(b), 0);
    const separated = globalThis.structuredClone([a, b]);
    for (let i = 0; i < 120; i++) resolveVehicleCollision(a, b, spec, spec);
    assert.deepEqual(
      [a, b],
      separated,
      'Resolved stationary contact must not drift or jitter',
    );
  });
}

test('already separating cars are unblocked without being pulled back together', () => {
  const a = vehicle(0, 0, 0, -30),
    b = vehicle(spec.length - 2, 0, 0, 50);
  resolveVehicleCollision(a, b, spec, spec);
  assert.equal(a.vx, -30);
  assert.equal(b.vx, 50);
  assert(b.x - a.x >= spec.length - 1e-7);
});

test('non-overlapping cars are completely unaffected, including close passes and rotated cars', () => {
  for (const b of [
    vehicle(spec.length + 0.1, 0),
    vehicle(0, spec.width + 0.1),
    vehicle(80, 80, Math.PI / 4),
    vehicle(0, 80, Math.PI / 2),
    vehicle(44, 30, Math.PI / 4),
  ]) {
    const a = vehicle(0, 0, 0, 120, 15);
    const before = globalThis.structuredClone([a, b]);
    resolveVehicleCollision(a, b, spec, spec);
    assert.deepEqual([a, b], before);
  }
});

test('a T-bone impact transfers momentum into the side of a perpendicular car', () => {
  const a = vehicle(0, 0, 0, 100);
  const b = vehicle((spec.length + spec.width) / 2 - 4, 0, Math.PI / 2);
  const initialEnergy = energy([a, b]);
  resolveVehicleCollision(a, b, spec, spec);
  assert(
    a.vx < 100 && b.vx > 0,
    'A perpendicular car must receive lateral momentum',
  );
  near(
    a.vx + b.vx,
    100,
    'Momentum is conserved across different vehicle headings',
  );
  assert(energy([a, b]) <= initialEnergy + 1e-7);
  assert(
    b.x - a.x >= (spec.length + spec.width) / 2 - 1e-7,
    'Perpendicular bodies must separate',
  );
});

test('repeated contacts remain finite and cannot amplify unpowered motion', () => {
  const bodies = [
    vehicle(-40, 0, 0, 150),
    vehicle(0, 0, 0, 50),
    vehicle(40, 0, 0, -100),
  ];
  const maximumEnergy = energy(bodies);
  let contacts = 0;
  for (let step = 0; step < 2400; step++) {
    for (const body of bodies) {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        if (resolveVehicleCollision(bodies[i], bodies[j], spec, spec) > 0)
          contacts++;
      }
    bodies.forEach(finite);
    assert(
      energy(bodies) <= maximumEnergy + 1e-7,
      'Repeated contact cannot add energy',
    );
  }
  assert(contacts > 2, 'The fixture must exercise repeated contact');
});

for (const participants of ['player and AI', 'two AI cars']) {
  test(`race collision dispatch resolves ${participants}`, () => {
    opponentRace.enabled = true;
    const rear = onTrack(500, 0, 140),
      front = onTrack(500 + spec.length - 3, 0, 20);
    if (participants === 'player and AI') {
      Object.assign(car, rear);
      opponentRace.cars = [front];
    } else {
      Object.assign(car, onTrack(1500));
      opponentRace.cars = [rear, front];
    }
    const striker = participants === 'player and AI' ? car : rear;
    resolveOpponentCollisions();
    assert(speed(striker) < 140);
    assert(speed(front) > 20);
    finite(striker);
    finite(front);
  });
}

test('time trial does not apply collisions from inactive race opponents', () => {
  const rival = { ...car };
  opponentRace.cars = [rival];
  const before = globalThis.structuredClone([car, rival]);
  resolveOpponentCollisions();
  assert.deepEqual([car, rival], before);
});

test('player controls and direct shared dynamics produce the same motion', () => {
  const reference = { ...car };
  keys.add('KeyW');
  keys.add('KeyD');
  for (let step = 0; step < 120; step++) {
    simulate(dt);
    driveVehicle(reference, { ...idle, throttle: 1, steer: 1 }, dt, spec);
    for (const field of ['x', 'y', 'vx', 'vy', 'angle', 'yaw', 'steer'])
      near(car[field], reference[field], `Shared ${field} dynamics`);
  }
});

test('AI wall impacts use the shared barrier response rather than following through walls', () => {
  opponentRace.enabled = true;
  const p = nearestDriving(car.x, car.y);
  const rival = {
    ...onTrack(500, p.wall - spec.width / 2 - 7, 0, 150),
    s: 500,
    trackS: 500,
    speed: 150,
    lane: 0,
    pace: 1,
    finish: null,
  };
  opponentRace.cars = [rival];
  opponentRace.spacing = 80;
  opponentRace.profile = Array(Math.ceil(track.totalLength / 80)).fill(150);
  for (let i = 0; i < 120; i++) {
    updateOpponents(dt);
    finite(rival);
    withinBarriers(rival);
  }
});

test('car-to-car contact cannot push either vehicle through a track barrier', () => {
  opponentRace.enabled = true;
  const p = nearestDriving(car.x, car.y),
    outside = p.wall - 6 - spec.width / 2 - 0.5;
  Object.assign(car, onTrack(500, outside - spec.width + 8, 0, 80));
  const rival = {
    ...onTrack(500, outside),
    s: 500,
    trackS: 500,
    speed: 0,
    lane: 0,
    pace: 1,
    finish: null,
  };
  opponentRace.cars = [rival];
  opponentRace.spacing = 80;
  opponentRace.profile = Array(Math.ceil(track.totalLength / 80)).fill(150);
  for (const body of [car, rival]) {
    finite(body);
    withinBarriers(body);
  }
  for (let step = 0; step < 120; step++) {
    simulate(dt);
    for (const body of [car, rival]) {
      finite(body);
      withinBarriers(body);
    }
  }
});

test('recovery after an impact stops the player, clears transient slip, and permits driving again', () => {
  const rival = onTrack(500 + spec.length - 3, 0, 20);
  Object.assign(car, onTrack(500, 0, 140));
  resolveVehicleCollision(car, rival, spec, spec);
  assert(speed(car) < 140);
  car.slickTime = 1;
  car.coconutSlip = 1;
  car.yaw = 1;
  recover(true);
  assert.equal(speed(car), 0);
  assert.equal(car.slickTime + car.coconutSlip + car.yaw, 0);
  assert.equal(race.invalid, true);
  withinBarriers(car);
  keys.add('KeyW');
  for (let i = 0; i < 120; i++) simulate(dt);
  assert(speed(car) > 10, 'Recovery must leave the controls usable');
  finite(car);
});

// Check penetration independently of the solver, using all four SAT axes.
function penetration(a, b, specA, specB) {
  let depth = Infinity;
  for (const angle of [
    a.angle,
    a.angle + Math.PI / 2,
    b.angle,
    b.angle + Math.PI / 2,
  ]) {
    const x = Math.cos(angle),
      y = Math.sin(angle);
    const radius = (body, spec) =>
      (Math.abs(Math.cos(body.angle - angle)) * spec.length) / 2 +
      (Math.abs(Math.sin(body.angle - angle)) * spec.width) / 2;
    depth = Math.min(
      depth,
      radius(a, specA) +
        radius(b, specB) -
        Math.abs((b.x - a.x) * x + (b.y - a.y) * y),
    );
  }
  return Math.max(0, depth);
}

for (const specA of Object.values(VEHICLES)) {
  for (const velocity of [5, 180, 1250]) {
    for (const heading of [0, Math.PI / 6, Math.PI / 2]) {
      test(`${specA.id} contact at speed ${velocity}, angle ${heading} stays bounded`, () => {
        const specB = VEHICLES.formula;
        const a = vehicle(0, 0, 0, velocity, velocity / 5);
        const b = vehicle((specA.length + specB.width) / 2 - 2, 0, heading);
        const initial = energy([a, b]);
        resolveVehicleCollision(a, b, specA, specB);
        assert(b.vx > 0 && a.vx < velocity, 'Contact must transfer momentum');
        assert(penetration(a, b, specA, specB) < 1e-7);
        assert(energy([a, b]) <= initial + 1e-7);
        near(a.vx + b.vx, velocity, 'Horizontal momentum');
        near(a.vy + b.vy, velocity / 5, 'Vertical momentum');
        assert.equal(a.yaw + b.yaw, 0, 'Contact cannot create spin');
        [a, b].forEach(finite);
      });
    }
  }
}

for (const heading of [0, Math.PI / 4, Math.PI / 2]) {
  test(`swept boxes catch a complete crossing at angle ${heading}`, () => {
    const specA = VEHICLES.clubsport,
      specB = VEHICLES.formula;
    const startA = { x: -90, y: 0 },
      startB = { x: 0, y: 0 };
    const a = vehicle(90, 0, 0, 1250),
      b = vehicle(0, 0, heading);
    const initial = energy([a, b]);
    assert.equal(
      penetration(a, b, specA, specB),
      0,
      'Endpoints alone miss this contact',
    );
    resolveVehicleCollision(a, b, specA, specB, startA, startB);
    assert(a.x < b.x, 'Cars must retain their pre-impact order');
    assert(penetration(a, b, specA, specB) < 1e-7);
    assert(a.vx < 1250 && b.vx > 0);
    assert(energy([a, b]) <= initial + 1e-7);
  });
}

test('swept glancing close pass does not collide with a car outside its path', () => {
  const a = vehicle(90, spec.width + 1, 0, 1250),
    b = vehicle();
  const initial = globalThis.structuredClone([a, b]);
  resolveVehicleCollision(a, b, spec, spec, { x: -90, y: a.y }, { x: 0, y: 0 });
  assert.deepEqual([a, b], initial);
});

test('shared race solver consumes drive motion to prevent tunneling into an unmoved car', () => {
  const a = onTrack(500, 0, 1250),
    b = onTrack(570);
  const start = globalThis.structuredClone(a);
  driveVehicle(a, idle, 0.12, VEHICLES.formula);
  const axis = { x: Math.cos(start.angle), y: Math.sin(start.angle) };
  assert(
    (a.x - b.x) * axis.x + (a.y - b.y) * axis.y > 0,
    'Fixture crosses the other car',
  );
  resolveVehicleContacts([
    { vehicle: a, spec: VEHICLES.formula },
    { vehicle: b, spec },
  ]);
  assert((b.x - a.x) * axis.x + (b.y - a.y) * axis.y > 0);
  assert(speed(b) > 0);
  const resolved = globalThis.structuredClone([a, b]);
  resolveVehicleContacts([
    { vehicle: a, spec: VEHICLES.formula },
    { vehicle: b, spec },
  ]);
  assert.deepEqual([a, b], resolved, 'Old sweeps must not replay');
});

test('simultaneous mixed-size pile-up separates deterministically and can drive away', () => {
  function run() {
    const specs = [
      VEHICLES.clubsport,
      VEHICLES.muscle,
      VEHICLES.formula,
      VEHICLES.rally,
    ];
    const bodies = specs.map((_, i) => onTrack(500 + i * 35, 0, (3 - i) * 180));
    const entries = bodies.map((vehicle, i) => ({ vehicle, spec: specs[i] }));
    const initial = energy(bodies);
    resolveVehicleContacts(entries);
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++)
        assert(penetration(bodies[i], bodies[j], specs[i], specs[j]) < 1e-5);
    assert(energy(bodies) <= initial + 1e-7);
    const front = bodies.at(-1),
      start = { x: front.x, y: front.y };
    for (let step = 0; step < 120; step++) {
      entries.forEach(({ vehicle, spec }) =>
        driveVehicle(vehicle, { ...idle, throttle: 1 }, dt, spec),
      );
      resolveVehicleContacts(entries);
      bodies.forEach(finite);
    }
    assert(
      Math.hypot(front.x - start.x, front.y - start.y) > 40,
      'Cars can continue driving',
    );
    return bodies;
  }
  assert.deepEqual(run(), run(), 'Repeated simulations must match exactly');
});

test('three stationary cars squeezed against a rail separate without jitter or spin', () => {
  const p = nearestDriving(car.x, car.y);
  const outside = p.wall - 6 - spec.width / 2;
  const bodies = [0, 1, 2].map((i) =>
    onTrack(500, outside - i * (spec.width - 5)),
  );
  const entries = bodies.map((vehicle) => ({ vehicle, spec }));
  resolveVehicleContacts(entries);
  for (let i = 0; i < bodies.length; i++) {
    withinBarriers(bodies[i]);
    assert.equal(speed(bodies[i]) + bodies[i].yaw, 0);
    for (let j = i + 1; j < bodies.length; j++)
      assert(penetration(bodies[i], bodies[j], spec, spec) < 1e-5);
  }
  const settled = globalThis.structuredClone(bodies);
  for (let i = 0; i < 120; i++) resolveVehicleContacts(entries);
  bodies.forEach((body, i) => {
    assert(Math.hypot(body.x - settled[i].x, body.y - settled[i].y) < 1e-5);
    withinBarriers(body);
  });
});

test('low-speed bumper contact settles without rebound', () => {
  const a = vehicle(0, 0, 0, 5),
    b = vehicle(spec.length - 1);
  resolveVehicleCollision(a, b, spec, spec);
  near(a.vx, 2.5, 'Striker settles to shared speed');
  near(b.vx, 2.5, 'Struck car settles to shared speed');
});

test('opposing high-speed cars cannot swap sides during a swept head-on impact', () => {
  const a = vehicle(70, 0, 0, 1250),
    b = vehicle(-70, 0, Math.PI, -1250);
  const initial = energy([a, b]);
  resolveVehicleCollision(
    a,
    b,
    VEHICLES.formula,
    spec,
    { x: -70, y: 0 },
    { x: 70, y: 0 },
  );
  assert(b.x - a.x >= (VEHICLES.formula.length + spec.length) / 2 - 1e-7);
  assert(energy([a, b]) <= initial);
  near(a.vx + b.vx, 0, 'Head-on impact conserves momentum');
});
