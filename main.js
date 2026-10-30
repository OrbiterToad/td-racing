'use strict';

// World units are centimetre-like art units. Simulation always runs at 120 Hz.
const CFG = { road: 86, runoff: 122, wall: 160, radius: 22, step: 1 / 120 };
let BEST_KEY = 'apex-juniper-corner-oil-v6';
// Short breathing spaces connect bottom esses, the infield hairpin, upper
// chicanes, and a sequence of alternating left-side corners.
const juniperPoints = [
  [-850, 1100],
  [-350, 1600],
  [250, 650],
  [850, 1600],
  [1400, 1100],
  [1550, 800],
  [1350, 500],
  [1500, 200],
  [1450, -50],
  [1150, -200],
  [700, 100],
  [300, 90],
  [150, -190],
  [450, -475],
  [750, -650],
  [1050, -550],
  [1250, -900],
  [1050, -1250],
  [650, -1650],
  [100, -850],
  [-450, -1650],
  [-950, -1150],
  [-1500, -700],
  [-1200, -350],
  [-1510, 0],
  [-1250, 300],
  [-1330, 650],
  [-1050, 800],
];
const MAPS = {
  juniper: {
    id: 'juniper',
    name: 'Juniper Raceway',
    label: 'WOODLAND / TECHNICAL',
    subtitle: 'Commit to the esses. Watch for oil.',
    description:
      'Deep esses, green woodland, and three oil slicks before demanding corners.',
    temperature: '24°C',
    gripLabel: 'OIL HAZARDS',
    bestKey: 'apex-juniper-corner-oil-v6',
    accent: '#d5f578',
    road: 86,
    runoff: 122,
    wall: 160,
    points: juniperPoints,
    patches: [
      {
        progress: 72 / 1120,
        corner: 2,
        lateral: -20,
        length: 65,
        width: 42,
        type: 'OIL',
      },
      {
        progress: 460 / 1120,
        corner: 12,
        lateral: -22,
        length: 70,
        width: 40,
        type: 'OIL',
      },
      {
        progress: 751 / 1120,
        corner: 19,
        lateral: -18,
        length: 58,
        width: 43,
        type: 'OIL',
      },
    ],
  },
  canyon: {
    id: 'canyon',
    name: 'Desert Canyon',
    label: 'DESERT / EXPERT',
    subtitle: 'Read the rock. Earn the exit.',
    description:
      'Tight sandstone passes, sharper bends, and four sand drifts across the asphalt.',
    temperature: '38°C',
    gripLabel: 'DUSTY',
    bestKey: 'apex-desert-canyon-sand-v2',
    accent: '#ffc185',
    road: 70,
    runoff: 96,
    wall: 126,
    patches: [
      {
        progress: 0.1,
        lateral: -14,
        length: 68,
        width: 40,
        type: 'SAND PATCH',
      },
      {
        progress: 0.34,
        lateral: 15,
        length: 70,
        width: 41,
        type: 'SAND PATCH',
      },
      {
        progress: 0.66,
        lateral: -12,
        length: 75,
        width: 42,
        type: 'SAND PATCH',
      },
      {
        progress: 0.85,
        lateral: 16,
        length: 65,
        width: 38,
        type: 'SAND PATCH',
      },
    ],
    points: [
      [-850, 1150],
      [-300, 1450],
      [200, 700],
      [700, 1400],
      [1200, 1000],
      [1450, 550],
      [1100, 150],
      [650, 500],
      [200, 300],
      [50, -100],
      [500, -400],
      [1050, -100],
      [1450, -500],
      [1200, -1050],
      [650, -1300],
      [150, -650],
      [-350, -1350],
      [-950, -1100],
      [-1350, -600],
      [-850, -150],
      [-1400, 350],
      [-1050, 850],
    ].map((p) => p.map((v) => v * 0.86)),
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine Pass',
    label: 'ALPINE / SWITCHBACKS',
    subtitle: 'Climb the hairpins. Respect the ice.',
    description:
      'Linked mountain hairpins, winding ledge roads, and just three isolated ice patches.',
    temperature: '−4°C',
    gripLabel: 'COLD / ICE',
    bestKey: 'apex-alpine-switchbacks-v2',
    accent: '#a9d8f4',
    road: 78,
    runoff: 110,
    wall: 145,
    patches: [
      { progress: 0.14, lateral: -16, length: 75, width: 44, type: 'ICE' },
      { progress: 0.48, lateral: 16, length: 80, width: 46, type: 'ICE' },
      { progress: 0.78, lateral: -14, length: 70, width: 44, type: 'ICE' },
    ],
    points: [
      [-1400, 1450],
      [-850, 1750],
      [-300, 950],
      [250, 1750],
      [800, 950],
      [1300, 1325],
      [1550, 1050],
      [1450, 650],
      [950, 400],
      [450, 1000],
      [-50, 200],
      [-550, 1000],
      [-1050, 350],
      [-1400, 450],
      [-1650, 50],
      [-1450, -350],
      [-950, -600],
      [-450, 100],
      [50, -700],
      [550, 100],
      [1050, -600],
      [1450, -500],
      [1650, -950],
      [1350, -1400],
      [850, -1600],
      [350, -900],
      [-150, -1700],
      [-650, -950],
      [-1150, -1600],
      [-1650, -1400],
      [-2150, -1000],
      [-1800, -500],
      [-2550, 100],
      [-1800, 700],
      [-2500, 1300],
      [-1900, 1800],
    ],
  },
  amazonas: {
    id: 'amazonas',
    name: 'Amazonas',
    label: 'JUNGLE / TIGHT & TWISTY',
    subtitle: 'Follow the river. Dodge the coconuts.',
    description:
      'Tight jungle bends and two shallow river fords. Dodge the monkey’s coconuts.',
    temperature: '31°C',
    gripLabel: 'RIVER FORDS / COCONUTS',
    bestKey: 'apex-amazonas-fords-coconuts-v2',
    accent: '#79e6b0',
    road: 64,
    runoff: 86,
    wall: 110,
    patches: [],
    points: [
      [-1500, -1100],
      [-1000, -1550],
      [-500, -950],
      [-100, -1300],
      [350, -850],
      [50, -450],
      [850, -500],
      [1200, 0],
      [650, 350],
      [1450, 550],
      [1350, 1200],
      [900, 1000],
      [1000, 1700],
      [400, 1900],
      [50, 1300],
      [-550, 1500],
      [-850, 1000],
      [-450, 550],
      [-1200, 450],
      [-1500, 0],
      [-1000, -350],
      [-1700, -550],
    ].map((p, i, points) =>
      p.map(
        (v, k) =>
          v * 0.8 +
          (points[(i + points.length - 1) % points.length][k] +
            points[(i + 1) % points.length][k]) *
            0.1,
      ),
    ),
  },
  coast: {
    id: 'coast',
    name: 'Costa Azul',
    label: 'COAST / SEASIDE RHYTHM',
    subtitle: 'Chase the waves. Link the curves.',
    description:
      'Lighthouse bends, village hairpins and beachside esses. Two small sand drifts; a marina pit lane.',
    temperature: '27°C',
    gripLabel: 'DRY / BEACH SAND',
    bestKey: 'apex-costa-azul-v1',
    accent: '#88e4ee',
    road: 68,
    runoff: 94,
    wall: 122,
    patches: [
      {
        progress: 0.73,
        lateral: -24,
        length: 58,
        width: 30,
        type: 'SAND PATCH',
      },
      {
        progress: 0.84,
        lateral: 23,
        length: 62,
        width: 30,
        type: 'SAND PATCH',
      },
    ],
    points: [
      [-1500, 1050],
      [-1000, 450],
      [-1900, 300],
      [-2000, -300],
      [-1300, -450],
      [-1500, -950],
      [-950, -1300],
      [-600, -900],
      [-300, -1500],
      [200, -1650],
      [400, -1100],
      [950, -1250],
      [1500, -950],
      [1450, -450],
      [950, -250],
      [1300, 200],
      [1050, 650],
      [1500, 1000],
      [1200, 1450],
      [800, 1050],
      [400, 1600],
      [100, 1100],
      [-350, 1500],
      [-650, 850],
      [-1100, 1450],
    ].map((p, i, points) =>
      p.map(
        (v, k) =>
          v * 0.8 +
          (points[(i + points.length - 1) % points.length][k] +
            points[(i + 1) % points.length][k]) *
            0.1,
      ),
    ),
  },
  city: {
    id: 'city',
    name: 'City Streets',
    label: 'CITY / DOWNTOWN + SUBURBS',
    subtitle: 'Square up downtown. Watch for traffic.',
    description:
      'Existing city streets: tight downtown turns, wavy suburbs and occasional everyday traffic.',
    temperature: '22°C',
    gripLabel: 'STREETS / LIGHT TRAFFIC',
    bestKey: 'apex-city-circuit-v1',
    accent: '#ffc987',
    road: 60,
    runoff: 76,
    wall: 92,
    patches: [],
    points: [
      [-1600, 900],
      [-1600, -1400],
      [-600, -1400],
      [-600, -600],
      [300, -600],
      [300, -1400],
      [1200, -1400],
      [1200, -500],
      [1650, 0],
      [1050, 500],
      [1650, 1050],
      [1100, 1650],
      [500, 1150],
      [0, 1750],
      [-500, 1200],
      [-1050, 1700],
      [-1600, 1200],
    ],
  },
  rallycross: {
    id: 'rallycross',
    name: 'Ridgeway Rallycross',
    label: 'RALLYCROSS / MIXED SURFACE',
    subtitle: 'Grip, slide, grip. Find the rhythm.',
    description:
      'Packed dirt, fast asphalt, and a technical infield. Built for the Offroad.',
    temperature: '19°C',
    gripLabel: 'ASPHALT / DIRT',
    bestKey: 'apex-ridgeway-rallycross-v1',
    accent: '#efce89',
    road: 82,
    runoff: 108,
    wall: 132,
    patches: [],
    points: [
      [-650, 650],
      [50, 650],
      [650, 400],
      [850, -100],
      [500, -450],
      [50, -300],
      [-150, -600],
      [200, -950],
      [700, -1000],
      [900, -1400],
      [400, -1650],
      [-150, -1250],
      [-600, -1550],
      [-1100, -1200],
      [-900, -700],
      [-1300, -250],
      [-1050, 300],
    ].map((p) => p.map((v) => v * 0.9)),
  },
};
const VEHICLES = {
  clubsport: {
    id: 'clubsport',
    name: 'Clubsport R',
    tag: 'BALANCED / RWD',
    description: 'The original. Progressive slides and a predictable balance.',
    sprite: 1,
    art: 'clubsport',
    power: 242,
    ceiling: 620,
    drag: 0.00056,
    grip: 1,
    steering: 1,
    wheelbase: 46,
    brakes: 330,
    offroad: 1,
    length: 44,
    width: 24,
    bars: [0.47, 0.75, 0.75],
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint GT',
    tag: 'FAST / RWD',
    description: 'More power and speed. Brake early and manage the rear.',
    sprite: 5,
    art: 'sprint',
    power: 275,
    ceiling: 700,
    drag: 0.00052,
    grip: 0.94,
    steering: 0.92,
    wheelbase: 49,
    brakes: 350,
    offroad: 1.08,
    length: 48,
    width: 25,
    bars: [0.53, 0.66, 0.58],
  },
  rally: {
    id: 'rally',
    name: 'Offroad',
    tag: 'GRIPPY / AWD',
    description:
      'Nimble steering, more grip, and better recovery off the road.',
    sprite: 4,
    art: 'rally',
    power: 232,
    ceiling: 585,
    drag: 0.0006,
    grip: 1.1,
    steering: 1.1,
    wheelbase: 43,
    brakes: 335,
    offroad: 0.7,
    length: 44,
    width: 25,
    bars: [0.45, 0.93, 0.96],
  },
  drift: {
    id: 'drift',
    name: 'Drift Spec',
    tag: 'DRIFT / RWD',
    description:
      'Slide-focused rear-drive coupe with an angle kit. Lift and countersteer to catch the slide.',
    art: 'drift',
    power: 310,
    ceiling: 740,
    drag: 0.00054,
    grip: 0.72,
    steering: 1.26,
    wheelbase: 43,
    brakes: 365,
    offroad: 1.12,
    length: 49,
    width: 27,
    powerSlide: 0.28,
    bars: [0.56, 0.52, 0.43],
  },
  muscle: {
    id: 'muscle',
    name: 'Iron V8',
    tag: 'MUSCLE / RWD',
    description:
      'Heavy rear-drive coupe with big torque and broad power slides. Plan your braking and let the V8 pull.',
    art: 'muscle',
    power: 430,
    ceiling: 860,
    drag: 0.00062,
    grip: 0.87,
    steering: 0.9,
    wheelbase: 53,
    brakes: 360,
    offroad: 1.35,
    length: 54,
    width: 29,
    powerSlide: 0.16,
    steerResponse: 6,
    yawResponse: 5.8,
    bars: [0.65, 0.58, 0.35],
  },
  formula: {
    id: 'formula',
    name: 'Formula X',
    tag: 'OPEN WHEEL / RWD',
    description:
      'Very high grip, strong downforce and serious speed. Light open-wheel chassis; strongest on asphalt.',
    art: 'formula',
    power: 760,
    ceiling: 1250,
    drag: 0.00042,
    grip: 3.8,
    steering: 1.18,
    wheelbase: 47,
    brakes: 920,
    offroad: 1.6,
    length: 56,
    width: 30,
    downforce: 0.65,
    bars: [1, 1, 0.18],
  },
};
const PAINTS = {
  red: { name: 'Ember', hex: '#eb782d' },
  blue: { name: 'Ocean', hex: '#3299cb' },
  green: { name: 'Forest', hex: '#36bb72' },
  yellow: { name: 'Sunburst', hex: '#edc34b' },
  black: { name: 'Graphite', hex: '#66666a' },
};
let activeCar = VEHICLES.clubsport,
  paint = 'red',
  pickerMode = 'tracks',
  pendingTrack = 'juniper',
  pendingCar = 'clubsport',
  pendingPaint = 'red',
  pickerWasPaused = false;
let activeMap = MAPS.juniper,
  controlPoints = activeMap.points;
const track = [],
  keys = new Set(),
  skidmarks = [],
  particles = [];
const spatial = {
  size: 240,
  cells: new Map(),
  visited: new Uint32Array(0),
  stamp: 0,
};
const skidBatches = Array.from({ length: 12 }, () => []);
let skidClock = 0,
  lastSkid = [null, null];
const car = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  yaw: 0,
  steer: 0,
  surface: 'ASPHALT',
  slip: 0,
  throttle: 0,
  brake: 0,
  slickTime: 0,
};
const jungle = { cooldown: 0, throwTime: 0, flowTime: 0, coconuts: [] };
const lapGhost = { best: null, frames: [], cursor: 0, previous: null };
const startingGrid = [];
let selectedStart = 0;
const camera = { x: 0, y: 0, zoom: 1 };
const race = {
  started: false,
  crossedStart: false,
  countdown: 0,
  goTime: 0,
  time: 0,
  last: null,
  best: null,
  lap: 1,
  next: 1,
  previous: 0,
  invalid: false,
  travel: 0,
  stuck: 0,
};
const timing = {
  splits: [],
  best: [],
  last: [],
  sectorStart: 0,
  delta: null,
  flashTime: 0,
  flashLabel: '',
  flashDelta: null,
};
const feedback = { impact: 0, impactCooldown: 0, rumble: 0 };
let audioLayers = null;
let accumulator = 0,
  paused = false,
  toastTimer = 0,
  movingTime = 0,
  worldCanvas,
  worldCtx,
  ctx,
  lastHUD = 0;
let carArt,
  audioCtx,
  engine,
  engineGain,
  soundEnabled = false,
  mapCtx;
let trackBounds, worldBounds, paddock;
let minimapLayer = null,
  minimapLayout = null;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerpTo = (a, b, t) => a + (b - a) * t;
function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function narrowFactor(progress) {
  if (activeMap.id !== 'canyon') return 1;
  let squeeze = 0;
  for (const [start, end] of [
    [0.15, 0.26],
    [0.52, 0.64],
  ]) {
    const t =
      clamp((progress - start) / 0.025, 0, 1) *
      clamp((end - progress) / 0.025, 0, 1);
    squeeze = Math.max(squeeze, t * t * (3 - 2 * t));
  }
  return 1 - 0.14 * squeeze;
}
function widthAt(kind, progress) {
  return CFG[kind] * narrowFactor(progress);
}
function timingGateHalfWidth(progress) {
  return widthAt('wall', progress) - 6;
}
function bestKeyFor(map = activeMap, vehicle = activeCar) {
  return map.bestKey + (vehicle.id === 'clubsport' ? '' : '-' + vehicle.id);
}
function configureCar(id, color = paint) {
  if (!Object.hasOwn(VEHICLES, id) || !Object.hasOwn(PAINTS, color))
    return false;
  activeCar = VEHICLES[id];
  paint = color;
  BEST_KEY = bestKeyFor();
  return true;
}
function carImagePath(id = activeCar.id, color = paint) {
  const vehicle = VEHICLES[id];
  return vehicle.art
    ? 'assets/cars/' + vehicle.art + '-' + color + '.svg'
    : 'assets/kenney/PNG/Cars/car_' + color + '_' + vehicle.sprite + '.png';
}
function loadCarArt() {
  carArt = new Image();
  carArt.src = carImagePath();
}
function readBest() {
  race.best = null;
  timing.best = [];
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY));
    if (typeof saved === 'number' && saved > 0 && Number.isFinite(saved))
      race.best = saved;
    const session = JSON.parse(localStorage.getItem(BEST_KEY + '-sectors-v1'));
    if (validSession(session, race.best)) timing.best = session.sectors.slice();
  } catch (_) {}
  loadLapGhost();
}
function validSession(session, best) {
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
function beginLap(start) {
  timing.splits = [];
  timing.sectorStart = 0;
  resetGhostRecording(start);
}
function configureTrack(id) {
  if (!Object.hasOwn(MAPS, id)) return false;
  activeMap = MAPS[id];
  controlPoints = activeMap.points;
  BEST_KEY = bestKeyFor();
  for (const key of ['road', 'runoff', 'wall']) CFG[key] = activeMap[key];
  resetCityTraffic();
  race.crossedStart = false;
  race.countdown = 0;
  race.goTime = 0;
  coast.time = 0;
  makeTrack();
  lapGhost.best = null;
  resetGhostRecording();
  jungle.cooldown = 0;
  jungle.throwTime = 0;
  jungle.flowTime = 0;
  jungle.coconuts.length = 0;
  car.coconutSlip = 0;
  return true;
}
function changeTrack(id, announce = true) {
  if (!configureTrack(id)) return;
  keys.clear();
  skidmarks.length = 0;
  particles.length = 0;
  skidClock = 0;
  lastSkid = [null, null];
  accumulator = 0;
  movingTime = 0;
  lastHUD = 0;
  Object.assign(race, {
    started: false,
    time: 0,
    last: null,
    lap: 1,
    next: 1,
    previous: 0,
    invalid: false,
    travel: 0,
    stuck: 0,
  });
  timing.last = [];
  timing.flashTime = 0;
  feedback.impact = 0;
  beginLap();
  readBest();
  Object.assign(car, {
    surface: 'ASPHALT',
    throttle: 0,
    brake: 0,
    slickTime: 0,
  });
  recover(false);
  if (id === 'city') loadTrafficArt();
  buildWorld();
  camera.x = car.x;
  camera.y = car.y;
  camera.zoom = desiredZoom();
  $('open-tracks').textContent = activeMap.name + ' ▾';
  $('track-label').textContent = activeMap.label;
  $('track-title').textContent = activeMap.name;
  $('track-subtitle').textContent = activeMap.subtitle;
  $('temperature').textContent = activeMap.temperature;
  $('grip-label').textContent = activeMap.gripLabel;
  document.documentElement.style.setProperty('--lime', activeMap.accent);
  $('game').style.background =
    activeMap.id === 'canyon'
      ? '#d5a36d'
      : activeMap.id === 'alpine'
        ? '#dbe6e3'
        : activeMap.id === 'amazonas'
          ? '#28523b'
          : activeMap.id === 'coast'
            ? '#288f9c'
            : activeMap.id === 'city'
              ? '#929b98'
              : '#8ba274';
  $('hint').style.opacity = '1';
  $('hint').textContent =
    activeMap.id === 'city'
      ? 'W to drive · Real streets, light traffic. Brake for downtown corners; flow through the suburbs.'
      : activeMap.id === 'coast'
        ? 'W to drive · Short coastal curves. Avoid the two beach sand drifts.'
        : activeMap.id === 'amazonas'
          ? 'W to drive · Two shallow river crossings. Slow for the water; watch for coconuts.'
          : activeMap.id === 'canyon'
            ? 'W to drive · Brake early. Avoid the sand drifts. Mind the narrow passes.'
            : activeMap.id === 'alpine'
              ? 'W to drive · Three ice patches. Ease off and keep steering smooth.'
              : activeMap.id === 'rallycross'
                ? 'W to drive · Dirt needs a slide. Asphalt needs a clean exit.'
                : 'W to drive · Find your apex. Avoid the dark oil slicks.';
  try {
    localStorage.setItem('apex-selected-track', id);
  } catch (_) {}
  startCountdown();
  setPaused(false);
  updateHUD();
  drawMinimap();
  if (announce)
    notify(
      activeMap.name.toUpperCase() +
        ' · ' +
        (id === 'canyon' ? 'EXPERT CIRCUIT' : 'FLOW CIRCUIT'),
    );
}

const cityTraffic = { cars: [], wait: 4, random: seededRandom(927) };
const trafficArt = {};
function resetCityTraffic() {
  cityTraffic.cars.length = 0;
  cityTraffic.wait = 4;
  cityTraffic.random = seededRandom(927);
}
function loadTrafficArt() {
  for (const color of ['blue', 'black', 'yellow', 'red'])
    if (!trafficArt[color]) {
      const art = new Image();
      art.src = 'assets/kenney/PNG/Cars/car_' + color + '_2.png';
      trafficArt[color] = art;
    }
}
function updateTrafficPose(vehicle) {
  const p = pointOnTrack(vehicle.s),
    offset = vehicle.direction * 26;
  vehicle.x = p.x - p.ty * offset;
  vehicle.y = p.y + p.tx * offset;
  vehicle.angle =
    Math.atan2(p.ty, p.tx) + (vehicle.direction < 0 ? Math.PI : 0);
  vehicle.vx = Math.cos(vehicle.angle) * vehicle.speed;
  vehicle.vy = Math.sin(vehicle.angle) * vehicle.speed;
}
function spawnCityTraffic() {
  if (activeMap.id !== 'city' || cityTraffic.cars.length >= 2) return false;
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
function updateCityTraffic(dt) {
  if (activeMap.id !== 'city') return;
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
function resolveCityTraffic() {
  if (activeMap.id !== 'city') return;
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
            activeCar.length) /
            2 +
          (Math.abs(-ax * Math.sin(car.angle) + ay * Math.cos(car.angle)) *
            activeCar.width) /
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
          activeCar.length) /
          2 +
        (Math.abs(-Math.sin(car.angle) * n.nx + Math.cos(car.angle) * n.ny) *
          activeCar.width) /
          2,
      limit = n.wall - 6 - support;
    if (n.distance > limit) {
      car.x = n.x + n.nx * n.side * limit;
      car.y = n.y + n.ny * n.side * limit;
    }
  }
}
function drawCityTraffic(c) {
  if (activeMap.id !== 'city') return;
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

function sampleMap(map, steps = 40) {
  return map.id === 'city'
    ? sampleCityCurve(map.points, steps)
    : sampleCurve(map.points, steps);
}
function sampleCityCurve(points, steps = 40) {
  const corners = points.map((p, i) => {
    const a = points[(i + points.length - 1) % points.length],
      b = points[(i + 1) % points.length],
      l1 = Math.hypot(a[0] - p[0], a[1] - p[1]),
      l2 = Math.hypot(b[0] - p[0], b[1] - p[1]),
      ux = (a[0] - p[0]) / l1,
      uy = (a[1] - p[1]) / l1,
      vx = (b[0] - p[0]) / l2,
      vy = (b[1] - p[1]) / l2,
      angle = Math.acos(clamp(ux * vx + uy * vy, -1, 1));
    if (Math.abs(Math.PI - angle) < 0.001)
      return {
        start: { x: p[0], y: p[1] },
        end: { x: p[0], y: p[1] },
        radius: 0,
      };
    const trim = Math.min(
        (i >= 1 && i <= 6 ? 128 : 245) / Math.tan(angle / 2),
        Math.min(l1, l2) * 0.42,
      ),
      radius = trim * Math.tan(angle / 2),
      length = Math.hypot(ux + vx, uy + vy),
      offset = radius / Math.sin(angle / 2),
      center = {
        x: p[0] + ((ux + vx) / length) * offset,
        y: p[1] + ((uy + vy) / length) * offset,
      },
      start = { x: p[0] + ux * trim, y: p[1] + uy * trim },
      end = { x: p[0] + vx * trim, y: p[1] + vy * trim },
      first = Math.atan2(start.y - center.y, start.x - center.x),
      last = Math.atan2(end.y - center.y, end.x - center.x);
    return {
      start,
      end,
      center,
      radius,
      first,
      turn: Math.atan2(Math.sin(last - first), Math.cos(last - first)),
    };
  });
  const result = [],
    spacing = 480 / steps;
  for (let i = 0; i < corners.length; i++) {
    const corner = corners[i],
      next = corners[(i + 1) % corners.length];
    if (corner.radius) {
      const count = Math.max(
        4,
        Math.ceil((Math.abs(corner.turn) * corner.radius) / spacing),
      );
      for (let j = 0; j < count; j++) {
        const a = corner.first + (corner.turn * j) / count;
        result.push({
          x: corner.center.x + Math.cos(a) * corner.radius,
          y: corner.center.y + Math.sin(a) * corner.radius,
          s: 0,
        });
      }
    }
    const distance = Math.hypot(
        next.start.x - corner.end.x,
        next.start.y - corner.end.y,
      ),
      count = Math.max(1, Math.ceil(distance / spacing));
    for (let j = 0; j < count; j++)
      result.push({
        x: lerpTo(corner.end.x, next.start.x, j / count),
        y: lerpTo(corner.end.y, next.start.y, j / count),
        s: 0,
      });
  }
  return result;
}

function sampleCurve(points, steps = 40) {
  const samples = [];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i + points.length - 1) % points.length],
      p1 = points[i],
      p2 = points[(i + 1) % points.length],
      p3 = points[(i + 2) % points.length];
    for (let j = 0; j < steps; j++) {
      const t = j / steps,
        t2 = t * t,
        t3 = t2 * t;
      // Uniform cubic B-splines keep curvature continuous through the linked bends.
      const spline = (k) =>
        (p0[k] * (1 - t) ** 3 +
          p1[k] * (3 * t3 - 6 * t2 + 4) +
          p2[k] * (-3 * t3 + 3 * t2 + 3 * t + 1) +
          p3[k] * t3) /
        6;
      samples.push({ x: spline(0), y: spline(1), s: 0 });
    }
  }
  return samples;
}
function makeTrack() {
  track.length = 0;
  track.push(...sampleMap(activeMap));
  let distance = 0;
  for (let i = 0; i < track.length; i++) {
    const p = track[i],
      q = track[(i + 1) % track.length];
    const dx = q.x - p.x,
      dy = q.y - p.y,
      len = Math.hypot(dx, dy);
    p.tx = dx / len;
    p.ty = dy / len;
    p.nx = -p.ty;
    p.ny = p.tx;
    p.s = distance;
    distance += len;
  }
  track.totalLength = distance;
  buildSpatialIndex();
  buildStartingGrid();
  const xs = track.map((p) => p.x),
    ys = track.map((p) => p.y);
  trackBounds = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  const margin = activeMap.id === 'coast' ? 850 : 600;
  worldBounds = {
    x: Math.floor(trackBounds.left - margin),
    y: Math.floor(trackBounds.top - margin),
    width: Math.ceil(trackBounds.right - trackBounds.left + margin * 2),
    height: Math.ceil(trackBounds.bottom - trackBounds.top + margin * 2),
  };
  paddock = findPaddockPlacement();
  buildPitLane();
  buildSceneryDetails();
  minimapLayer = null;
  minimapLayout = null;
}

const pitLane = {
  points: [],
  road: 36,
  runoff: 44,
  wall: 52,
  entry: 0,
  exit: 0,
  totalLength: 0,
};
function pointOnTrack(distance) {
  distance =
    ((distance % track.totalLength) + track.totalLength) % track.totalLength;
  let i = track.findIndex((p) => p.s > distance) - 1;
  if (i < 0) i = track.length - 1;
  const p = track[i],
    q = track[(i + 1) % track.length],
    t = (distance - p.s) / Math.hypot(q.x - p.x, q.y - p.y);
  return {
    x: lerpTo(p.x, q.x, t),
    y: lerpTo(p.y, q.y, t),
    tx: p.tx,
    ty: p.ty,
    progress: (i + t) / track.length,
  };
}
function buildPitLane() {
  const entry = pointOnTrack(-650),
    exit = pointOnTrack(700),
    side = paddock.side;
  const a = paddockPoint(-200, side === 1 ? -145 : 180),
    b = paddockPoint(220, side === 1 ? -145 : 180),
    points = [];
  function curve(p, c1, c2, q) {
    for (let i = 0; i < 60; i++) {
      const t = i / 60,
        u = 1 - t;
      points.push({
        x:
          u * u * u * p.x +
          3 * u * u * t * c1.x +
          3 * u * t * t * c2.x +
          t * t * t * q.x,
        y:
          u * u * u * p.y +
          3 * u * u * t * c1.y +
          3 * u * t * t * c2.y +
          t * t * t * q.y,
      });
    }
  }
  curve(
    entry,
    { x: entry.x + entry.tx * 180, y: entry.y + entry.ty * 180 },
    { x: a.x - paddock.tx * 180, y: a.y - paddock.ty * 180 },
    a,
  );
  for (let i = 0; i < 60; i++)
    points.push({ x: lerpTo(a.x, b.x, i / 60), y: lerpTo(a.y, b.y, i / 60) });
  curve(
    b,
    { x: b.x + paddock.tx * 180, y: b.y + paddock.ty * 180 },
    { x: exit.x - exit.tx * 180, y: exit.y - exit.ty * 180 },
    exit,
  );
  points.push({ x: exit.x, y: exit.y });
  let length = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[Math.min(i + 1, points.length - 1)],
      prev = points[Math.max(0, i - 1)],
      dx = q.x - prev.x,
      dy = q.y - prev.y,
      d = Math.hypot(dx, dy);
    p.tx = dx / d;
    p.ty = dy / d;
    p.nx = -p.ty;
    p.ny = p.tx;
    p.s = length;
    length += Math.hypot(q.x - p.x, q.y - p.y);
  }
  pitLane.points = points;
  pitLane.totalLength = length;
  pitLane.entry = entry.progress;
  pitLane.exit = exit.progress;
  pitLane.segments = makePathSegments(points);
  pitLane.corridorBounds = {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    bottom: Math.max(...points.map((p) => p.y)),
  };
  pitLane.bounds = {
    left: Math.min(trackBounds.left, ...points.map((p) => p.x)),
    right: Math.max(trackBounds.right, ...points.map((p) => p.x)),
    top: Math.min(trackBounds.top, ...points.map((p) => p.y)),
    bottom: Math.max(trackBounds.bottom, ...points.map((p) => p.y)),
  };
}
// Segment data is immutable until the route changes. Queries allocate one
// result instead of repeatedly rebuilding candidates while scanning a path.
function makePathSegments(points, closed = false) {
  const segments = [];
  for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
    const p = points[i],
      q = points[(i + 1) % points.length],
      dx = q.x - p.x,
      dy = q.y - p.y,
      length = Math.hypot(dx, dy);
    segments.push({
      p,
      dx,
      dy,
      length,
      invLength2: 1 / (dx * dx + dy * dy),
      tx: dx / length,
      ty: dy / length,
    });
  }
  return segments;
}
function nearestSegmentFrame(segments, x, y) {
  let d2 = Infinity,
    index = -1,
    fraction = 0,
    px = 0,
    py = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i],
      t = clamp(
        ((x - seg.p.x) * seg.dx + (y - seg.p.y) * seg.dy) * seg.invLength2,
        0,
        1,
      ),
      sx = seg.p.x + t * seg.dx,
      sy = seg.p.y + t * seg.dy,
      dx = x - sx,
      dy = y - sy,
      d = dx * dx + dy * dy;
    if (d < d2) {
      d2 = d;
      index = i;
      fraction = t;
      px = sx;
      py = sy;
    }
  }
  return index < 0 ? null : { x: px, y: py, d2, index, t: fraction };
}
function boundsDistanceSquared(bounds, x, y) {
  const dx = Math.max(bounds.left - x, 0, x - bounds.right),
    dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
  return dx * dx + dy * dy;
}
function withinPitDistance(x, y, distance) {
  return (
    distance > 0 &&
    boundsDistanceSquared(pitLane.corridorBounds, x, y) < distance * distance &&
    nearestPit(x, y).distance < distance
  );
}
function nearestPit(x, y) {
  const best = nearestSegmentFrame(pitLane.segments, x, y);
  if (!best) return null;
  const segment = pitLane.segments[best.index],
    p = segment.p;
  best.i = best.index;
  best.tx = p.tx;
  best.ty = p.ty;
  best.nx = p.nx;
  best.ny = p.ny;
  best.distance = Math.sqrt(best.d2);
  best.side = (x - best.x) * p.nx + (y - best.y) * p.ny >= 0 ? 1 : -1;
  best.s = p.s + best.t * segment.length;
  best.progress =
    (pitLane.entry +
      ((1 - pitLane.entry + pitLane.exit) * best.s) / pitLane.totalLength) %
    1;
  best.pit = true;
  best.road = pitLane.road;
  best.runoff = pitLane.runoff;
  best.wall = pitLane.wall;
  return best;
}
function nearestDriving(x, y) {
  const main = nearest(x, y);
  main.road = widthAt('road', main.progress);
  main.runoff = widthAt('runoff', main.progress);
  main.wall = widthAt('wall', main.progress);
  // A pit candidate can win only if its distance is less than this margin.
  const margin = main.distance - main.wall + pitLane.wall;
  if (
    margin <= 0 ||
    boundsDistanceSquared(pitLane.corridorBounds, x, y) >= margin * margin
  )
    return main;
  const pit = nearestPit(x, y);
  return pit && pit.distance - pit.wall < main.distance - main.wall
    ? pit
    : main;
}
function pitAsphalt() {
  return activeMap.id === 'canyon'
    ? '#4f5150'
    : activeMap.id === 'alpine'
      ? '#46555c'
      : '#424d50';
}
function paintPitRoad(c) {
  const points = pitLane.points;
  for (const [color, width] of [
    ['#6f8066', pitLane.wall * 2 + 14],
    ['#8c9582', pitLane.runoff * 2 + 5],
    ['#dce3cd', pitLane.road * 2 + 4],
    [pitAsphalt(), pitLane.road * 2],
  ]) {
    path(c, points, 0, false);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }
  c.save();
  path(c, points, 0, false);
  c.strokeStyle = '#e3e6cc70';
  c.lineWidth = 2;
  c.setLineDash([12, 16]);
  c.stroke();
  c.restore();
}
function paintPitConnections(c) {
  path(c, pitLane.points, 0, false);
  c.strokeStyle = pitAsphalt();
  c.lineWidth = pitLane.road * 2;
  c.lineCap = 'butt';
  c.stroke();
  // Shoulder paint ends where the pit lane joins the main asphalt.
  for (const side of [-1, 1]) {
    c.beginPath();
    let drawing = false;
    for (const p of pitLane.points) {
      const x = p.x + p.nx * (pitLane.road + 1) * side,
        y = p.y + p.ny * (pitLane.road + 1) * side,
        n = nearest(x, y);
      if (n.distance <= widthAt('road', n.progress) + 4) {
        drawing = false;
        continue;
      }
      if (drawing) c.lineTo(x, y);
      else c.moveTo(x, y);
      drawing = true;
    }
    c.strokeStyle = '#dce3cd';
    c.lineWidth = 2;
    c.stroke();
  }
}
function paintPitRails(c) {
  const street = activeMap.id === 'city';
  for (const side of [-1, 1])
    for (let i = 0; i < pitLane.points.length - 1; i++) {
      const p = pitLane.points[i],
        q = pitLane.points[i + 1],
        x = p.x + p.nx * pitLane.wall * side,
        y = p.y + p.ny * pitLane.wall * side,
        n = nearest(x, y);
      if (n.distance < widthAt('wall', n.progress) + 12) continue;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(
        q.x + q.nx * pitLane.wall * side,
        q.y + q.ny * pitLane.wall * side,
      );
      c.strokeStyle = street ? '#7e8b83' : '#394d43';
      c.lineWidth = 8;
      c.stroke();
      c.strokeStyle = street ? '#d1d6c8' : '#c5ccba';
      c.lineWidth = 4;
      c.stroke();
    }
  for (const [p, label] of [
    [pitLane.points[18], street ? 'SERVICE ENTRY' : 'PIT ENTRY'],
    [
      pitLane.points[pitLane.points.length - 19],
      street ? 'RETURN' : 'PIT EXIT',
    ],
  ]) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.fillStyle = '#e5ebd8';
    c.font = 'bold 12px Arial';
    c.textAlign = 'center';
    c.fillText(label, 0, -pitLane.road - 12);
    c.restore();
  }
  // The alternate route also crosses the timing line, so a pit lap counts.
  const index = pitLane.points.findIndex(
      (p) =>
        p.s / pitLane.totalLength >=
        (1 - pitLane.entry) / (1 - pitLane.entry + pitLane.exit),
    ),
    p = pitLane.points[index];
  if (p && !street) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 8; col++) {
        c.fillStyle = (row + col) % 2 ? '#e9eddb' : '#26383b';
        c.fillRect(
          row * 6 - 6,
          -pitLane.road + (col * pitLane.road) / 4,
          6,
          pitLane.road / 4,
        );
      }
    c.restore();
  }
}
function paintMainRail(c, side, color, width) {
  c.beginPath();
  let drawing = false;
  for (let i = 0; i <= track.length; i++) {
    const p = track[i % track.length],
      d = widthAt('wall', (i % track.length) / track.length) * side,
      x = p.x + p.nx * d,
      y = p.y + p.ny * d;
    if (withinPitDistance(x, y, pitLane.wall + 12)) {
      drawing = false;
      continue;
    }
    if (drawing) c.lineTo(x, y);
    else c.moveTo(x, y);
    drawing = true;
  }
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function paddockPoint(x, y, placement = paddock) {
  return {
    x: placement.x + placement.tx * x - placement.ty * y,
    y: placement.y + placement.ty * x + placement.tx * y,
  };
}
function findPaddockPlacement() {
  const start = track[0];
  let best = null,
    bestClearance = -Infinity;
  // Check the whole apron, including room around its edges, against every
  // nearby track section. A fixed screen offset can land on the next bend.
  for (const offset of [300, 380, 460, 560, 680])
    for (const side of activeMap.id === 'coast' ? [-1, 1] : [1, -1])
      for (const along of [0, 180, -180, 360, -360, 540, -540]) {
        const placement = {
          side,
          x: start.x + start.nx * side * offset + start.tx * along,
          y: start.y + start.ny * side * offset + start.ty * along,
          tx: start.tx,
          ty: start.ty,
        };
        let clearance = Infinity;
        for (let x = -390; x <= 410; x += 25)
          for (
            let y = side === 1 ? -210 : -75;
            y <= (side === 1 ? 125 : 245);
            y += 25
          ) {
            const p = paddockPoint(x, y, placement),
              n = nearest(p.x, p.y);
            clearance = Math.min(
              clearance,
              n.distance - widthAt('wall', n.progress) - 30,
              p.x - worldBounds.x - 20,
              worldBounds.x + worldBounds.width - p.x - 20,
              p.y - worldBounds.y - 20,
              worldBounds.y + worldBounds.height - p.y - 20,
            );
            if (activeMap.id === 'coast')
              clearance = Math.min(clearance, coastLandDistance(p.x, p.y) - 70);
            if (activeMap.id === 'amazonas')
              clearance = Math.min(
                clearance,
                amazonRiverDistance(p.x, p.y) - 145,
              );
          }
        if (clearance >= 0) return placement;
        if (clearance > bestClearance) {
          bestClearance = clearance;
          best = placement;
        }
      }
  return best;
}

function buildSpatialIndex() {
  spatial.cells.clear();
  spatial.visited = new Uint32Array(track.length);
  spatial.stamp = 0;
  const size = spatial.size;
  for (let i = 0; i < track.length; i++) {
    const a = track[i],
      b = track[(i + 1) % track.length];
    for (
      let x = Math.floor(Math.min(a.x, b.x) / size);
      x <= Math.floor(Math.max(a.x, b.x) / size);
      x++
    )
      for (
        let y = Math.floor(Math.min(a.y, b.y) / size);
        y <= Math.floor(Math.max(a.y, b.y) / size);
        y++
      ) {
        const key = x + ',' + y;
        if (!spatial.cells.has(key)) spatial.cells.set(key, []);
        spatial.cells.get(key).push(i);
      }
  }
}
function nearest(x, y) {
  let bestD2 = Infinity,
    bestI = 0,
    bestT = 0,
    bestX = 0,
    bestY = 0;
  if (++spatial.stamp >= 4294967295) {
    spatial.visited.fill(0);
    spatial.stamp = 1;
  }
  const stamp = spatial.stamp,
    size = spatial.size,
    cx = Math.floor(x / size),
    cy = Math.floor(y / size);
  function check(i) {
    if (spatial.visited[i] === stamp) return;
    spatial.visited[i] = stamp;
    const a = track[i],
      b = track[(i + 1) % track.length],
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy), 0, 1),
      px = a.x + t * dx,
      py = a.y + t * dy,
      d2 = (x - px) ** 2 + (y - py) ** 2;
    if (d2 < bestD2 || (d2 === bestD2 && i < bestI)) {
      bestD2 = d2;
      bestI = i;
      bestT = t;
      bestX = px;
      bestY = py;
    }
  }
  function cell(gx, gy) {
    const indices = spatial.cells.get(gx + ',' + gy);
    if (indices) for (const i of indices) check(i);
  }
  for (let radius = 0; radius <= 8; radius++) {
    if (radius === 0) cell(cx, cy);
    else {
      for (let dx = -radius; dx <= radius; dx++) {
        cell(cx + dx, cy - radius);
        cell(cx + dx, cy + radius);
      }
      for (let dy = 1 - radius; dy < radius; dy++) {
        cell(cx - radius, cy + dy);
        cell(cx + radius, cy + dy);
      }
    }
    // Unvisited segments lie outside this square, so this is an exact lower bound.
    const bound = Math.min(
      x - (cx - radius) * size,
      (cx + radius + 1) * size - x,
      y - (cy - radius) * size,
      (cy + radius + 1) * size - y,
    );
    if (bestD2 <= bound * bound) break;
    if (radius === 8) for (let i = 0; i < track.length; i++) check(i);
  }
  const a = track[bestI],
    distance = Math.sqrt(bestD2),
    side = (x - bestX) * a.nx + (y - bestY) * a.ny >= 0 ? 1 : -1;
  return {
    d2: bestD2,
    x: bestX,
    y: bestY,
    i: bestI,
    t: bestT,
    tx: a.tx,
    ty: a.ty,
    nx: a.nx,
    ny: a.ny,
    progress: (bestI + bestT) / track.length,
    distance,
    side,
  };
}

function surfaceAt(n, x = n.x, y = n.y) {
  if (activeMap.id === 'amazonas' && n.distance <= CFG.wall + 7) {
    const river = amazonRiverFrame(x, y);
    if (river.distance < 83 * amazonRiverScale(river.t)) return 'FORD';
  }
  if (n.pit) return n.distance <= n.road + 5 ? 'PIT LANE' : 'RUNOFF';
  if (n.distance <= widthAt('road', n.progress) + 7) {
    for (const patch of activeMap.patches) {
      if (inPatch(n, patch)) return patch.type;
    }
    return rallySurface(n.progress);
  }
  if (n.distance < widthAt('runoff', n.progress)) return 'RUNOFF';
  if (activeMap.id === 'canyon') return 'SAND';
  if (activeMap.id === 'alpine') return 'SNOW';
  if (activeMap.id === 'coast') return 'SAND';
  // Gravel at the outer edge of fast turns; grass covers the remaining verge.
  return (n.progress > 0.12 && n.progress < 0.38) ||
    (n.progress > 0.51 && n.progress < 0.77)
    ? 'GRAVEL'
    : 'GRASS';
}
function dirtProgress(progress) {
  return (
    (progress >= 0.14 && progress < 0.36) ||
    (progress >= 0.57 && progress < 0.79)
  );
}
function rallySurface(progress) {
  return activeMap.id === 'rallycross' && dirtProgress(progress)
    ? 'DIRT'
    : 'ASPHALT';
}
function patchFrame(patch) {
  const p = track[Math.floor(patch.progress * track.length) % track.length];
  return {
    x: p.x + p.nx * patch.lateral,
    y: p.y + p.ny * patch.lateral,
    tx: p.tx,
    ty: p.ty,
  };
}
function inPatch(n, patch) {
  const p = patchFrame(patch),
    x = n.x + n.nx * n.distance * n.side - p.x,
    y = n.y + n.ny * n.distance * n.side - p.y;
  const u = (x * p.tx + y * p.ty) / patch.length,
    v = (-x * p.ty + y * p.tx) / patch.width;
  return Math.hypot(u, v) <= patchRadius(patch, Math.atan2(v, u));
}
function patchRadius(patch, angle) {
  return (
    1 +
    0.065 * Math.sin(angle * 3 + patch.progress * 31) +
    0.045 * Math.sin(angle * 7 + patch.progress * 19)
  );
}
function patchOutline(c, patch, scale = 1) {
  c.beginPath();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2,
      r = patchRadius(patch, a) * scale,
      x = Math.cos(a) * patch.length * r,
      y = Math.sin(a) * patch.width * r;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
}

function initPicker() {
  $('open-tracks').onclick = () => openPicker('tracks');
  $('open-garage').onclick = () => openPicker('garage');
  $('picker-close').onclick = () => closePicker();
  $('picker-apply').onclick = applyPicker;
  $('selection-dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    closePicker();
  });
  $('selection-dialog').addEventListener('click', (e) => {
    if (e.target === $('selection-dialog')) closePicker();
  });
  syncCarHUD();
}
function syncCarHUD() {
  $('car-name').textContent = activeCar.name.toUpperCase();
  $('car-drive').textContent = activeCar.id === 'rally' ? 'AWD' : 'RWD';
  $('open-tracks').setAttribute('aria-label', 'Tracks: ' + activeMap.name);
}
function openPicker(mode) {
  pickerMode = mode;
  pendingTrack = activeMap.id;
  pendingCar = activeCar.id;
  pendingPaint = paint;
  pickerWasPaused = paused;
  setPaused(true);
  document.body.classList.add('choosing');
  renderPicker();
  $('selection-dialog').showModal();
}
function closePicker(resume = false) {
  $('selection-dialog').close();
  document.body.classList.remove('choosing');
  setPaused(resume ? false : pickerWasPaused);
}
function renderPicker() {
  const tracks = pickerMode === 'tracks';
  $('picker-title').textContent = tracks
    ? 'Find your next apex.'
    : 'Make it yours.';
  $('picker-eyebrow').textContent = tracks
    ? 'THE CIRCUIT COLLECTION'
    : 'THE CLUB GARAGE';
  $('picker-description').textContent = tracks
    ? Object.keys(MAPS).length +
      ' landscapes. A different challenge on every circuit. Records for ' +
      activeCar.name +
      '.'
    : 'Choose your handling, then your paint. Changing cars starts a fresh run.';
  $('picker-apply').textContent = tracks
    ? pendingTrack === activeMap.id
      ? 'CONTINUE ON TRACK →'
      : 'DRIVE ' + MAPS[pendingTrack].name.toUpperCase() + ' →'
    : 'APPLY & DRIVE →';
  $('picker-footnote').textContent = tracks
    ? 'Each track and car has its own saved personal best.'
    : 'Paint is cosmetic. Your car and color are remembered.';
  if (tracks) {
    $('picker-content').innerHTML =
      '<div class="choice-grid">' +
      Object.values(MAPS)
        .map((map, i) => {
          let best = null;
          try {
            const value = JSON.parse(
              localStorage.getItem(bestKeyFor(map, activeCar)),
            );
            if (
              typeof value === 'number' &&
              value > 0 &&
              Number.isFinite(value)
            )
              best = value;
          } catch (_) {}
          const selected = map.id === pendingTrack;
          return (
            '<button class="track-choice ' +
            (selected ? 'selected' : '') +
            '" data-track="' +
            map.id +
            '" aria-label="Choose ' +
            map.name +
            '" aria-pressed="' +
            selected +
            '" style="--card-accent:' +
            map.accent +
            '"><span class="choice-number">0' +
            (i + 1) +
            ' / ' +
            (map.id === 'city'
              ? 'CITY'
              : map.id === 'coast'
                ? 'COAST'
                : map.id === 'amazonas'
                  ? 'JUNGLE'
                  : map.id === 'juniper'
                    ? 'WOODLAND'
                    : map.id === 'canyon'
                      ? 'DESERT'
                      : map.id === 'rallycross'
                        ? 'RALLYCROSS'
                        : 'ALPINE') +
            '</span><span class="choice-check">' +
            (selected ? '✓' : '↗') +
            '</span><canvas id="preview-' +
            map.id +
            '" width="480" height="270" aria-label="' +
            map.name +
            ' track layout"></canvas><span class="choice-body"><span class="choice-tag">' +
            map.label +
            '</span><strong>' +
            map.name +
            '</strong><span class="choice-description">' +
            map.description +
            '</span><span class="choice-details"><span>' +
            map.temperature +
            ' · ' +
            (map.id === 'city'
              ? 'LIGHT TRAFFIC'
              : map.id === 'coast'
                ? '2 SAND DRIFTS'
                : map.id === 'amazonas'
                  ? '2 FORDS + COCONUTS'
                  : map.id === 'canyon'
                    ? 'NARROW PASSES'
                    : map.id === 'alpine'
                      ? '3 ICE PATCHES'
                      : map.id === 'rallycross'
                        ? 'ASPHALT + DIRT'
                        : '3 OIL SLICKS') +
            '</span><span class="choice-best">BEST ' +
            formatTime(best) +
            '</span></span></span></button>'
          );
        })
        .join('') +
      '</div>';
    for (const map of Object.values(MAPS)) {
      drawTrackPreview($('preview-' + map.id), map);
      document.querySelector('[data-track="' + map.id + '"]').onclick = () => {
        pendingTrack = map.id;
        renderPicker();
        document.querySelector('[data-track="' + map.id + '"]').focus();
      };
    }
  } else {
    $('picker-content').innerHTML =
      '<div class="choice-grid garage-grid">' +
      Object.values(VEHICLES)
        .map((vehicle) => {
          const selected = vehicle.id === pendingCar;
          return (
            '<button class="car-choice ' +
            (selected ? 'selected' : '') +
            '" data-car="' +
            vehicle.id +
            '" aria-label="Choose ' +
            vehicle.name +
            '" aria-pressed="' +
            selected +
            '"><span class="choice-check">' +
            (selected ? '✓' : '↗') +
            '</span><span class="car-platform"><img src="' +
            carImagePath(vehicle.id, pendingPaint) +
            '" alt="' +
            vehicle.name +
            ' in ' +
            PAINTS[pendingPaint].name +
            ' paint"></span><span class="choice-body"><span class="choice-tag">' +
            vehicle.tag +
            '</span><strong>' +
            vehicle.name +
            '</strong><span class="choice-description">' +
            vehicle.description +
            '</span><span class="car-stats">' +
            ['PACE', 'HANDLING', 'OFF ROAD']
              .map(
                (label, i) =>
                  '<span>' +
                  label +
                  '<i><b style="width:' +
                  vehicle.bars[i] * 100 +
                  '%"></b></i></span>',
              )
              .join('') +
            '</span></span></button>'
          );
        })
        .join('') +
      '</div><div class="paint-row"><span>PAINT / <b>' +
      PAINTS[pendingPaint].name +
      '</b></span><div class="swatches">' +
      Object.entries(PAINTS)
        .map(
          ([id, color]) =>
            '<button class="swatch ' +
            (id === pendingPaint ? 'selected' : '') +
            '" data-paint="' +
            id +
            '" aria-label="Paint ' +
            color.name +
            '" aria-pressed="' +
            (id === pendingPaint) +
            '" style="--paint:' +
            color.hex +
            '">' +
            (id === pendingPaint ? '✓' : '') +
            '</button>',
        )
        .join('') +
      '</div></div>';
    for (const vehicle of Object.values(VEHICLES))
      document.querySelector('[data-car="' + vehicle.id + '"]').onclick =
        () => {
          pendingCar = vehicle.id;
          renderPicker();
          document.querySelector('[data-car="' + vehicle.id + '"]').focus();
        };
    for (const id of Object.keys(PAINTS))
      document.querySelector('[data-paint="' + id + '"]').onclick = () => {
        pendingPaint = id;
        renderPicker();
        document.querySelector('[data-paint="' + id + '"]').focus();
      };
  }
}
function applyPicker() {
  if (pickerMode === 'tracks') {
    if (pendingTrack !== activeMap.id) changeTrack(pendingTrack, false);
  } else {
    const changed = pendingCar !== activeCar.id;
    configureCar(pendingCar, pendingPaint);
    loadCarArt();
    try {
      localStorage.setItem(
        'apex-garage',
        JSON.stringify({ car: activeCar.id, paint }),
      );
    } catch (_) {}
    if (changed) changeTrack(activeMap.id, false);
    syncCarHUD();
  }
  closePicker(true);
  syncCarHUD();
  notify(activeMap.name.toUpperCase() + ' · ' + activeCar.name.toUpperCase());
}
function drawTrackPreview(canvas, map) {
  const c = canvas.getContext('2d'),
    points = sampleMap(map, 16),
    xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys),
    scale = Math.min(380 / (right - left), 205 / (bottom - top));
  c.fillStyle =
    map.id === 'city'
      ? '#687d75'
      : map.id === 'coast'
        ? '#287f92'
        : map.id === 'amazonas'
          ? '#214735'
          : map.id === 'canyon'
            ? '#694a37'
            : map.id === 'alpine'
              ? '#52686e'
              : map.id === 'rallycross'
                ? '#5b5b3e'
                : '#354b3d';
  c.fillRect(0, 0, 480, 270);
  const rand = seededRandom(
    map.id === 'canyon' ? 513 : map.id === 'alpine' ? 719 : 318,
  );
  for (let i = 0; i < 24; i++) {
    c.fillStyle =
      map.id === 'canyon'
        ? '#bf80572b'
        : map.id === 'alpine'
          ? '#d6ebe324'
          : '#a5c78516';
    c.beginPath();
    c.ellipse(
      rand() * 480,
      rand() * 270,
      10 + rand() * 45,
      8 + rand() * 30,
      rand() * 6.28,
      0,
      6.28,
    );
    c.fill();
  }
  c.save();
  c.translate(240, 135);
  c.scale(scale, scale);
  c.translate(-(left + right) / 2, -(top + bottom) / 2);
  if (map.id === 'city')
    paintCityGround(c, {
      x: left - 600,
      y: top - 600,
      width: right - left + 1200,
      height: bottom - top + 1200,
    });
  if (map.id === 'coast') {
    paintCoastGround(
      c,
      {
        x: left - 600,
        y: top - 600,
        width: right - left + 1200,
        height: bottom - top + 1200,
      },
      false,
    );
    c.fillStyle = '#f4e6ce';
    c.beginPath();
    c.arc(coast.lighthouse.x, coast.lighthouse.y, 38, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d47f61';
    c.beginPath();
    c.arc(coast.lighthouse.x, coast.lighthouse.y, 20, 0, Math.PI * 2);
    c.fill();
  }
  if (map.id === 'amazonas') paintAmazonRiver(c, false);
  ribbon(c, '#12202166', 20 / scale, points);
  ribbon(c, map.accent, 9 / scale, points);
  ribbon(c, '#243435', 5 / scale, points);
  if (map.id === 'amazonas') {
    c.save();
    c.globalAlpha = 0.8;
    paintAmazonRiver(c, false);
    c.restore();
  }
  if (map.id === 'rallycross') {
    c.strokeStyle = '#d1a873';
    c.lineWidth = 5 / scale;
    for (let i = 0; i < points.length; i++) {
      if (!dirtProgress(i / points.length)) continue;
      const p = points[i],
        q = points[(i + 1) % points.length];
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
      c.stroke();
    }
  }
  for (const patch of map.patches) {
    const p = points[Math.floor(patch.progress * points.length)];
    c.fillStyle =
      patch.type === 'ICE'
        ? '#c7f6ff'
        : patch.type === 'OIL'
          ? '#b8a4f9'
          : '#efb571';
    c.beginPath();
    c.arc(p.x, p.y, 3.2 / scale, 0, 6.28);
    c.fill();
  }
  c.fillStyle = '#fff5dc';
  const start = points[0];
  c.beginPath();
  c.arc(start.x, start.y, 4 / scale, 0, 6.28);
  c.fill();
  c.restore();
}

const SCENERY_ASSETS = [
  'cafe-terrace',
  'control-room',
  'control-room-snow',
  'cottage-snow',
  'cottage-wood',
  'fuel-store',
  'garage-alpine',
  'garage-city',
  'garage-coastal',
  'garage-cream',
  'garage-industrial',
  'garage-jungle',
  'garden-bed',
  'greenhouse',
  'house-bungalow',
  'house-modern',
  'house-row',
  'house-sandstone',
  'house-slate',
  'house-terracotta',
  'hut-jungle',
  'office-courtyard',
  'office-lowrise',
  'park-bench',
  'picnic-table',
  'rock-moss',
  'service-tent-blue',
  'service-tent-red',
  'service-tent-sand',
  'service-transporter',
  'shed-garden',
  'spectator-stand',
  'tool-trolley',
  'tree-acacia',
  'tree-birch',
  'tree-cactus',
  'tree-elm',
  'tree-fan-palm',
  'tree-jungle',
  'tree-oak',
  'tree-palm',
  'tree-pine',
  'tree-pine-snow',
  'tree-willow',
  'tyre-rack',
  'warehouse',
  'water-tank',
  'wood-crates',
];
const sceneryArt = Object.create(null);
const sceneryAssetState = { ready: false, failed: [], promise: null };
function loadSceneryAssets() {
  if (sceneryAssetState.promise) return sceneryAssetState.promise;
  sceneryAssetState.promise = Promise.all(
    SCENERY_ASSETS.map(
      (key) =>
        new Promise((resolve) => {
          const art = new Image();
          art.decoding = 'async';
          art.onload = () => {
            try {
              const raster = document.createElement('canvas');
              raster.width = Math.min(512, art.naturalWidth * 2);
              raster.height = Math.min(512, art.naturalHeight * 2);
              raster
                .getContext('2d')
                .drawImage(art, 0, 0, raster.width, raster.height);
              sceneryArt[key] = raster;
            } catch (_) {
              sceneryAssetState.failed.push(key);
            }
            resolve();
          };
          art.onerror = () => {
            sceneryAssetState.failed.push(key);
            resolve();
          };
          art.src = 'assets/scenery/' + key + '.svg';
        }),
    ),
  ).then(() => {
    sceneryAssetState.ready = true;
  });
  return sceneryAssetState.promise;
}
function drawSceneryAsset(c, key, x, y, w, h, angle = 0) {
  const art = sceneryArt[key];
  if (!art) return false;
  c.save();
  c.translate(x, y);
  if (angle) c.rotate(angle);
  c.drawImage(art, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}
function paddockAssetLayout() {
  const theme = {
      juniper: 'cream',
      canyon: 'cream',
      alpine: 'alpine',
      amazonas: 'jungle',
      coast: 'coastal',
      city: 'city',
      rallycross: 'industrial',
    }[activeMap.id],
    front = paddock.side === 1 ? -1 : 1,
    y = front < 0 ? 18 : -5,
    angle = front < 0 ? Math.PI : 0,
    props = [];
  for (let i = 0; i < 5; i++)
    props.push({
      key: 'garage-' + theme,
      x: -181 + i * 79,
      y,
      w: 68,
      h: 80,
      angle,
      bay: i + 1,
    });
  props.push({
    key: activeMap.id === 'alpine' ? 'control-room-snow' : 'control-room',
    x: 214,
    y,
    w: 64,
    h: 86,
    angle,
  });
  props.push(
    { key: 'tyre-rack', x: -227, y: 12, w: 20, h: 32, angle: 0 },
    { key: 'fuel-store', x: 263, y: 12, w: 24, h: 36, angle: 0 },
  );
  const forecourt = front < 0 ? -37 : 63;
  props.push(
    {
      key: 'service-tent-blue',
      x: -102,
      y: forecourt,
      w: 44,
      h: front < 0 ? 18 : 24,
      angle: 0,
    },
    {
      key: 'service-tent-red',
      x: 56,
      y: forecourt,
      w: 44,
      h: front < 0 ? 18 : 24,
      angle: 0,
    },
    { key: 'wood-crates', x: 135, y: forecourt, w: 17, h: 17, angle: 0 },
    { key: 'tool-trolley', x: -23, y: forecourt, w: 17, h: 20, angle: 0 },
    { key: 'water-tank', x: -227, y: forecourt, w: 18, h: 18, angle: 0 },
  );
  return props;
}
function paintPaddock(c) {
  const theme = {
    juniper: '#9ba88c',
    canyon: '#c5ad86',
    alpine: '#b9c7bf',
    amazonas: '#9ba688',
    coast: '#d0c09b',
    city: '#a8b1a5',
    rallycross: '#b4ad8e',
  }[activeMap.id];
  c.save();
  c.translate(paddock.x, paddock.y);
  c.rotate(Math.atan2(paddock.ty, paddock.tx));
  c.fillStyle = theme;
  roundedRect(c, -240, -50, 520, 135, 7);
  c.fill();
  c.strokeStyle = '#e8e3c03d';
  c.lineWidth = 1;
  for (let x = -230; x < 275; x += 26) {
    c.beginPath();
    c.moveTo(x, -44);
    c.lineTo(x, 79);
    c.stroke();
  }
  for (let y = -43; y < 80; y += 26) {
    c.beginPath();
    c.moveTo(-234, y);
    c.lineTo(274, y);
    c.stroke();
  }
  for (const prop of paddockAssetLayout()) {
    if (
      !drawSceneryAsset(c, prop.key, prop.x, prop.y, prop.w, prop.h, prop.angle)
    ) {
      c.fillStyle = '#d1c9a9';
      roundedRect(
        c,
        prop.x - prop.w / 2,
        prop.y - prop.h / 2,
        prop.w,
        prop.h,
        3,
      );
      c.fill();
      c.strokeStyle = '#8fa38c';
      c.lineWidth = 2;
      c.stroke();
    }
    if (prop.bay) {
      const labelY = prop.y + (paddock.side === 1 ? -26 : 26);
      c.fillStyle = '#293c36';
      roundedRect(c, prop.x - 9, labelY - 6, 18, 12, 3);
      c.fill();
      c.fillStyle = '#f3efd8';
      c.font = 'bold 9px Arial';
      c.textAlign = 'center';
      c.fillText(String(prop.bay).padStart(2, '0'), prop.x, labelY + 3);
    }
  }
  c.restore();
}

function setup() {
  const host = $('game'),
    canvas = createCanvas(host.clientWidth, host.clientHeight);
  canvas.parent(host);
  canvas.elt.addEventListener('click', selectStartingGrid);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  ctx = drawingContext;
  try {
    const saved = JSON.parse(localStorage.getItem('apex-garage'));
    if (saved) configureCar(saved.car, saved.paint);
  } catch (_) {}
  loadCarArt();
  noLoop();
  $('hint').textContent = 'Loading the circuit…';
  loadSceneryAssets().then(initializeGame);
}
function initializeGame() {
  mapCtx = $('minimap').getContext('2d');
  let initial = 'juniper';
  try {
    const saved = localStorage.getItem('apex-selected-track');
    if (Object.hasOwn(MAPS, saved)) initial = saved;
  } catch (_) {}
  changeTrack(initial, false);
  initPicker();
  $('pause').onclick = () => setPaused(!paused);
  $('resume').onclick = () => setPaused(false);
  $('sound').onclick = toggleSound;
  $('restart').onclick = restartRun;
  window.addEventListener('keydown', (e) => {
    if ($('selection-dialog').open) return;
    if (
      [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      restartRun();
    }
    if (e.code === 'KeyR') recover(true);
    if (e.code === 'Escape' || e.code === 'KeyP') setPaused(!paused);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    setPaused(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keys.clear();
      setPaused(true);
    }
  });
  updateHUD();
  if (document.hidden) setPaused(true);
  loop();
}

function setPaused(value) {
  paused = value;
  keys.clear();
  accumulator = 0;
  $('pause-screen').classList.toggle('open', paused);
  $('pause').textContent = paused ? '▶ Resume' : 'Ⅱ Pause';
  if (engineGain)
    engineGain.gain.setTargetAtTime(
      paused ? 0 : 0.025,
      audioCtx.currentTime,
      0.05,
    );
}
function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastTimer = 3.5;
}
function recover(showMessage = true) {
  const n = track.length ? nearest(car.x, car.y) : null;
  const p = showMessage
    ? nearestDriving(car.x, car.y)
    : startingGrid[selectedStart];
  Object.assign(car, {
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    angle: Math.atan2(p.ty, p.tx),
    yaw: 0,
    steer: 0,
    slip: 0,
    slickTime: 0,
    coconutSlip: 0,
  });
  race.stuck = 0;
  lastSkid = [null, null];
  skidClock = 0;
  if (showMessage) {
    race.invalid = true;
    timing.delta = null;
    notify('CAR RECOVERED · Cross the line to start a fresh lap');
  }
  race.previous = nearestDriving(car.x, car.y).progress;
}

function buildStartingGrid() {
  startingGrid.length = 0;
  selectedStart = 0;
  for (let i = 0; i < 6; i++) {
    const distance = track.totalLength - 90 - i * 80;
    let index = track.findIndex((p) => p.s > distance) - 1;
    if (index < 0) index = track.length - 1;
    const p = track[index],
      q = track[(index + 1) % track.length],
      length = Math.hypot(q.x - p.x, q.y - p.y),
      t = (distance - p.s) / length,
      offset = CFG.road * 0.4 * (i % 2 ? 1 : -1);
    startingGrid.push({
      x: lerpTo(p.x, q.x, t) + p.nx * offset,
      y: lerpTo(p.y, q.y, t) + p.ny * offset,
      tx: p.tx,
      ty: p.ty,
    });
  }
}
function chooseStartingSlot(index) {
  if (
    race.started ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= startingGrid.length
  )
    return false;
  selectedStart = index;
  keys.clear();
  recover(false);
  startCountdown();
  notify('START POSITION ' + (index + 1) + ' · Ready to drive');
  return true;
}
function selectStartingGrid(event) {
  if (paused || race.started || $('selection-dialog').open) return;
  const rect = event.currentTarget.getBoundingClientRect(),
    x =
      (((event.clientX - rect.left) * width) / rect.width - width / 2) /
        camera.zoom +
      camera.x,
    y =
      (((event.clientY - rect.top) * height) / rect.height - height * 0.54) /
        camera.zoom +
      camera.y;
  const index = startingGrid.findIndex((p) => {
    const dx = x - p.x,
      dy = y - p.y;
    return (
      Math.abs(dx * p.tx + dy * p.ty) <= 32 &&
      Math.abs(-dx * p.ty + dy * p.tx) <= 22
    );
  });
  if (index >= 0) chooseStartingSlot(index);
}
function drawStartingGridSelection(c) {
  if (race.started) return;
  for (let i = 0; i < startingGrid.length; i++) {
    const p = startingGrid[i];
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.fillStyle = i === selectedStart ? activeMap.accent + '28' : '#d7e9d509';
    roundedRect(c, -26, -14, 52, 28, 4);
    c.fill();
    c.strokeStyle = i === selectedStart ? activeMap.accent : '#dfebd980';
    c.lineWidth = i === selectedStart ? 2 : 1.5;
    c.stroke();
    c.restore();
  }
}

function startCountdown() {
  race.countdown = 3;
  race.goTime = 0;
  car.vx = 0;
  car.vy = 0;
  car.yaw = 0;
}
function restartRun() {
  const slot = selectedStart;
  changeTrack(activeMap.id, false);
  selectedStart = slot;
  recover(false);
  resetGhostRecording();
  camera.x = car.x;
  camera.y = car.y;
  notify('FRESH RUN · GRID ' + (slot + 1));
}
function liveGhostDelta() {
  const ghost = lapGhost.best;
  if (
    !ghost ||
    !race.started ||
    !race.crossedStart ||
    race.invalid ||
    race.countdown > 0
  )
    return null;
  const sector = Math.min(3, Math.max(0, race.next - 1)),
    sectors = ghost.sectors;
  const timed =
    Array.isArray(sectors) &&
    sectors.length === 4 &&
    sectors.every((t) => Number.isFinite(t) && t > 0) &&
    Math.abs(sectors.reduce((a, b) => a + b, 0) - ghost.time) < 0.03;
  const start = timed
      ? sectors.slice(0, sector).reduce((a, b) => a + b, 0)
      : sector === 3
        ? ghost.time * 0.5
        : 0,
    end = timed
      ? start + sectors[sector]
      : sector === 0
        ? ghost.time * 0.5
        : ghost.time;
  let distance = Infinity,
    reference = null;
  for (let i = 0; i < ghost.frames.length - 1; i++) {
    const a = ghost.frames[i],
      b = ghost.frames[i + 1];
    if (b[0] < start - 0.15 || a[0] > end + 0.15) continue;
    const dx = b[1] - a[1],
      dy = b[2] - a[2],
      length = dx * dx + dy * dy,
      t = length
        ? clamp(((car.x - a[1]) * dx + (car.y - a[2]) * dy) / length, 0, 1)
        : 0,
      d = (car.x - a[1] - t * dx) ** 2 + (car.y - a[2] - t * dy) ** 2;
    if (d < distance) {
      distance = d;
      reference = lerpTo(a[0], b[0], t);
    }
  }
  return reference === null || distance > 150 * 150
    ? null
    : race.time - reference;
}

function resetGhostRecording(start = [car.x, car.y, car.angle]) {
  lapGhost.frames = [[0, ...start]];
  lapGhost.cursor = 0;
  lapGhost.previous = start.slice();
}
function loadLapGhost() {
  lapGhost.best = null;
  lapGhost.cursor = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(BEST_KEY + '-ghost-v1'));
    if (
      !saved ||
      saved.version !== 1 ||
      !Number.isFinite(saved.time) ||
      saved.time <= 0 ||
      !Array.isArray(saved.frames) ||
      saved.frames.length < 20 ||
      saved.frames.length > 18000
    )
      return;
    let previous = -1;
    for (const frame of saved.frames) {
      if (
        !Array.isArray(frame) ||
        frame.length !== 4 ||
        !frame.every(Number.isFinite) ||
        frame[0] <= previous ||
        frame[0] < 0 ||
        frame[0] > saved.time + 0.02
      )
        return;
      previous = frame[0];
    }
    if (
      saved.frames[0][0] !== 0 ||
      Math.abs(saved.frames.at(-1)[0] - saved.time) > 0.02
    )
      return;
    lapGhost.best = saved;
  } catch (_) {
    /* A clean lap records a ghost if the saved path is missing. */
  }
}
function recordGhostFrame() {
  if (!race.started || race.invalid || lapGhost.frames.length >= 18000) return;
  const last = lapGhost.frames.at(-1);
  if (last && race.time - last[0] < 0.05) return;
  lapGhost.frames.push([race.time, car.x, car.y, car.angle]);
}
function ghostCrossingFrame(fraction) {
  const p = lapGhost.previous || [car.x, car.y, car.angle],
    angle = Math.atan2(Math.sin(car.angle - p[2]), Math.cos(car.angle - p[2]));
  return [
    lerpTo(p[0], car.x, fraction),
    lerpTo(p[1], car.y, fraction),
    p[2] + angle * fraction,
  ];
}
function saveLapGhost(time, last) {
  if (
    (lapGhost.best && time >= lapGhost.best.time) ||
    lapGhost.frames.length < 20 ||
    lapGhost.frames.at(-1)[0] < time - 0.2
  )
    return false;
  const frames = lapGhost.frames.filter((f) => f[0] < time);
  frames.push([time, ...last]);
  // Compact coordinates keep several circuits' recordings within browser storage.
  const compact = frames
    .map((f) => [
      Math.round(f[0] * 10000) / 10000,
      Math.round(f[1] * 10) / 10,
      Math.round(f[2] * 10) / 10,
      Math.round(Math.atan2(Math.sin(f[3]), Math.cos(f[3])) * 10000) / 10000,
    ])
    .filter((f, i, all) => i === all.length - 1 || f[0] < all[i + 1][0]);
  const saved = {
    version: 1,
    time,
    frames: compact,
    sectors: timing.splits.slice(),
  };
  lapGhost.best = saved;
  lapGhost.cursor = 0;
  try {
    localStorage.setItem(BEST_KEY + '-ghost-v1', JSON.stringify(saved));
  } catch (_) {
    /* The ghost still works for this session if storage is full. */
  }
  return true;
}
function ghostPose(time) {
  const best = lapGhost.best;
  if (!best || time < 0 || time > best.time) return null;
  const frames = best.frames;
  let i = lapGhost.cursor;
  if (i >= frames.length - 1 || frames[i][0] > time) i = 0;
  while (i < frames.length - 2 && frames[i + 1][0] < time) i++;
  lapGhost.cursor = i;
  const a = frames[i],
    b = frames[i + 1],
    t = clamp((time - a[0]) / (b[0] - a[0]), 0, 1),
    angle = Math.atan2(Math.sin(b[3] - a[3]), Math.cos(b[3] - a[3]));
  return {
    x: lerpTo(a[1], b[1], t),
    y: lerpTo(a[2], b[2], t),
    angle: a[3] + angle * t,
  };
}
function ghostStatus() {
  if (!lapGhost.best)
    return race.invalid
      ? 'GHOST · Cross the finish, then drive a clean lap'
      : 'GHOST · Complete a clean lap to record';
  if (!race.crossedStart) return 'GHOST READY · Cross the start line';
  return (
    'GHOST ' +
    (!race.started
      ? 'READY'
      : race.time > lapGhost.best.time
        ? 'FINISHED'
        : 'RACING') +
    ' · ' +
    formatTime(lapGhost.best.time)
  );
}
function visibleGhostPose() {
  return race.crossedStart ? ghostPose(race.time) : null;
}
function drawLapGhost(c) {
  const pose = visibleGhostPose();
  if (!pose) return;
  c.save();
  c.translate(pose.x, pose.y);
  c.rotate(pose.angle);
  c.fillStyle = '#8bdefa';
  c.strokeStyle = '#c4f3ff';
  c.lineWidth = 2.2;
  c.globalAlpha = 0.26;
  roundedRect(
    c,
    -activeCar.length / 2 - 2,
    -activeCar.width / 2 - 2,
    activeCar.length + 4,
    activeCar.width + 4,
    6,
  );
  c.fill();
  c.globalAlpha = 0.92;
  c.shadowColor = '#74ddff';
  c.shadowBlur = 7;
  c.stroke();
  c.shadowBlur = 0;
  c.restore();
  // Draw the label upright and above the player, even when both cars overlap.
  c.save();
  c.translate(pose.x, pose.y - 36);
  c.fillStyle = '#13333ddd';
  roundedRect(c, -24, -9, 48, 17, 4);
  c.fill();
  c.fillStyle = '#b9f1ff';
  c.font = 'bold 9px Arial';
  c.textAlign = 'center';
  c.fillText('GHOST', 0, 3);
  c.restore();
}

function desiredZoom() {
  return clamp(Math.min(width / 1050, height / 760), 0.55, 1.12);
}
function windowResized() {
  const h = $('game');
  resizeCanvas(h.clientWidth, h.clientHeight);
}

function simulate(dt) {
  lapGhost.previous = [car.x, car.y, car.angle];
  updateJungle(dt);
  if (activeMap.id === 'coast') coast.time += dt;
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
    1 - Math.exp(-(activeCar.steerResponse || 9) * dt),
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
                        : activeMap.id === 'canyon'
                          ? 0.92
                          : activeMap.id === 'alpine'
                            ? 0.95
                            : 1;
  const loose = offroad || surface === 'DIRT';
  const oilGrip = 1 - 0.8 * clamp(car.slickTime / 1.15, 0, 1),
    aeroSurface =
      surface === 'ASPHALT' || surface === 'PIT LANE' || surface === 'RUNOFF',
    aeroGrip =
      1 +
      (aeroSurface
        ? (activeCar.downforce || 0) * clamp(speed / 730, 0, 1) ** 2
        : 0),
    powerSlide =
      1 -
      (activeCar.powerSlide || 0) *
        (gas ? 1 : 0) *
        clamp(Math.abs(forward) / 160, 0, 1) *
        clamp(Math.abs(car.steer) * 2, 0, 1),
    grip =
      baseGrip *
      activeCar.grip *
      oilGrip *
      aeroGrip *
      powerSlide *
      (car.coconutSlip > 0 ? 0.45 : 1);
  let acceleration = 0;
  if (gas)
    acceleration +=
      forward < -8
        ? activeCar.brakes
        : activeCar.power * (1 - clamp(forward / activeCar.ceiling, 0, 0.93));
  if (braking)
    acceleration +=
      forward > 8 ? -activeCar.brakes : -95 * (1 - clamp(-forward / 115, 0, 1));
  if (hand && Math.abs(forward) > 2) acceleration -= Math.sign(forward) * 105;
  if (surface === 'ICE') acceleration *= 0.3;
  if (surface === 'OIL') acceleration *= 0.55;
  // Aerodynamic drag plus surface-dependent rolling resistance.
  acceleration -= forward * 0.12 + forward * Math.abs(forward) * activeCar.drag;
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
      activeCar.offroad;
  if (surface === 'DIRT') acceleration -= forward * 0.23 * activeCar.offroad;
  if (surface === 'FORD') {
    acceleration -= forward * 0.85 * activeCar.offroad;
    if (speed > 30 && Math.random() < dt * 28)
      burst(car.x - fx * 18, car.y - fy * 18, 'water', 2);
  }
  if (!gas && !braking && Math.abs(forward) < 3) forward = 0;
  forward += acceleration * dt;
  const steeringAngle =
    car.steer * (0.52 / (1 + Math.abs(forward) / 190)) * activeCar.steering;
  const targetYaw =
    (forward / activeCar.wheelbase) *
    Math.tan(steeringAngle) *
    (hand ? 1.42 : 1);
  car.yaw = lerpTo(
    car.yaw,
    targetYaw,
    1 - Math.exp(-(hand ? 5.2 : activeCar.yawResponse || 8) * dt),
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
    (Math.abs(ax * after.nx + ay * after.ny) * activeCar.length) / 2 +
    (Math.abs(-ay * after.nx + ax * after.ny) * activeCar.width) / 2;
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
    skidClock += dt;
    if (skidClock >= 1 / 45) {
      skidClock %= 1 / 45;
      for (const side of [-1, 1]) {
        const index = side === -1 ? 0 : 1,
          x = car.x - ax * 13 - ay * side * 9,
          y = car.y - ay * 13 + ax * side * 9,
          previous = lastSkid[index];
        skidmarks.push({
          x,
          y,
          px: previous ? previous.x : x - (car.x - prevX),
          py: previous ? previous.y : y - (car.y - prevY),
          life: 26,
          alpha: clamp(Math.abs(lateral) / 100, 0.15, 0.65),
          loose,
        });
        lastSkid[index] = { x, y };
      }
    }
    if (Math.random() < dt * 17)
      burst(car.x - ax * 19, car.y - ay * 19, loose ? 'dust' : 'smoke', 1);
  } else {
    skidClock = 0;
    lastSkid = [null, null];
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
    movingTime += dt;
    if (movingTime > 3) $('hint').style.opacity = '0';
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

function updateRace(dt, n) {
  const beforeTime = race.time;
  race.time += dt;
  const previous = race.previous,
    progress = n.progress;
  let delta = progress - previous;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  // Gates span the full corridor between the barriers, including runoff.
  if (Math.abs(delta) < 0.035) race.travel += delta;
  const gate = race.next * 0.25;
  if (
    race.next <= 3 &&
    previous < gate &&
    progress >= gate &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(gate)
  ) {
    const crossingTime =
      beforeTime + dt * clamp((gate - previous) / delta, 0, 1);
    finishSector(crossingTime, race.next - 1);
    race.next++;
  }
  if (
    previous > 0.93 &&
    progress < 0.07 &&
    delta > 0 &&
    n.distance <= timingGateHalfWidth(0)
  ) {
    const fraction = clamp((1 - previous) / delta, 0, 1),
      crossingTime = beforeTime + dt * fraction,
      remainder = race.time - crossingTime,
      crossingFrame = ghostCrossingFrame(fraction);
    if (race.next === 4 && race.travel > 0.85 && !race.invalid) {
      finishSector(crossingTime, 3);
      race.last = crossingTime;
      race.lap++;
      timing.last = timing.splits.slice();
      const firstGhost = !lapGhost.best,
        ghostSaved = saveLapGhost(race.last, crossingFrame);
      if (race.best === null || race.last < race.best) {
        race.best = race.last;
        timing.best = timing.splits.slice();
        const session = {
          version: 1,
          time: race.best,
          sectors: timing.best.slice(),
        };
        try {
          localStorage.setItem(BEST_KEY, JSON.stringify(race.best));
          localStorage.setItem(
            BEST_KEY + '-sectors-v1',
            JSON.stringify(session),
          );
        } catch (_) {
          /* Timing remains available for this session. */
        }
        notify('PERSONAL BEST · ' + formatTime(race.best));
      } else
        notify(
          (firstGhost && ghostSaved ? 'GHOST READY · ' : 'LAP COMPLETE · ') +
            formatTime(race.last),
        );
    } else if (race.invalid) notify('FRESH LAP · Make it a clean one');
    else if (race.time > 8)
      notify('LAP NOT COUNTED · Pass every sector on the track');
    race.crossedStart = true;
    race.time = remainder;
    race.next = 1;
    race.travel = 0;
    race.invalid = false;
    beginLap(crossingFrame);
  }
  race.previous = progress;
}
function finishSector(time, index) {
  const elapsed = time - timing.sectorStart;
  timing.splits[index] = elapsed;
  timing.sectorStart = time;
  timing.flashLabel = 'SECTOR ' + (index + 1) + ' · ' + formatSector(elapsed);
  timing.flashDelta =
    timing.best[index] !== undefined ? elapsed - timing.best[index] : null;
  timing.flashTime = 3.5;
}
function triggerImpact(speed) {
  feedback.impact = Math.max(feedback.impact, clamp(speed / 250, 0.15, 1));
  if (feedback.impactCooldown === 0) {
    playImpact(feedback.impact);
    feedback.impactCooldown = 0.15;
  }
}

function burst(x, y, type, count) {
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
function drawSkidmarks(c) {
  for (const batch of skidBatches) batch.length = 0;
  const halfW = width / (camera.zoom * 2) + 100,
    halfH = height / (camera.zoom * 2) + 100;
  for (const s of skidmarks) {
    if (Math.abs(s.x - camera.x) > halfW || Math.abs(s.y - camera.y) > halfH)
      continue;
    const alpha = s.alpha * Math.min(s.life / 6, 1),
      level = clamp(Math.ceil(alpha / 0.12) - 1, 0, 5);
    skidBatches[(s.loose ? 6 : 0) + level].push(s);
  }
  c.lineCap = 'round';
  c.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const batch = skidBatches[i];
    if (!batch.length) continue;
    c.strokeStyle =
      i >= 6
        ? 'rgba(103,73,44,' + ((i % 6) + 1) * 0.12 + ')'
        : 'rgba(22,27,26,' + ((i % 6) + 1) * 0.12 + ')';
    c.beginPath();
    for (const s of batch) {
      c.moveTo(s.px, s.py);
      c.lineTo(s.x, s.y);
    }
    c.stroke();
  }
}

function inWorldView(x, y, radius = 0) {
  const zoom = camera.zoom;
  return (
    Math.abs(x - camera.x) <= width / (2 * zoom) + radius &&
    y >= camera.y - (height * 0.54) / zoom - radius &&
    y <= camera.y + (height * 0.46) / zoom + radius
  );
}
function drawWorldViewport(c) {
  const zoom = camera.zoom,
    left = camera.x - width / (2 * zoom) - worldBounds.x,
    top = camera.y - (height * 0.54) / zoom - worldBounds.y,
    x = Math.max(0, Math.floor(left) - 2),
    y = Math.max(0, Math.floor(top) - 2),
    right = Math.min(worldCanvas.width, Math.ceil(left + width / zoom) + 2),
    bottom = Math.min(worldCanvas.height, Math.ceil(top + height / zoom) + 2);
  if (right > x && bottom > y)
    c.drawImage(
      worldCanvas,
      x,
      y,
      right - x,
      bottom - y,
      worldBounds.x + x,
      worldBounds.y + y,
      right - x,
      bottom - y,
    );
}

function draw() {
  if (!worldCanvas) return;
  const elapsed = Math.min(deltaTime / 1000, 0.08);
  if (!paused) {
    accumulator += elapsed;
    while (accumulator >= CFG.step) {
      simulate(CFG.step);
      accumulator -= CFG.step;
    }
  }
  const smoothing = 1 - Math.exp(-4.5 * elapsed);
  camera.x = lerpTo(camera.x, car.x + car.vx * 0.42, smoothing);
  camera.y = lerpTo(camera.y, car.y + car.vy * 0.42, smoothing);
  camera.zoom = lerpTo(
    camera.zoom,
    desiredZoom() * (1 - clamp(Math.hypot(car.vx, car.vy) / 1700, 0, 0.19)),
    smoothing,
  );
  ctx.save();
  ctx.setTransform(pixelDensity(), 0, 0, pixelDensity(), 0, 0);
  ctx.fillStyle =
    activeMap.id === 'canyon'
      ? '#d5a36d'
      : activeMap.id === 'alpine'
        ? '#dbe6e3'
        : activeMap.id === 'amazonas'
          ? '#28523b'
          : activeMap.id === 'coast'
            ? '#288f9c'
            : activeMap.id === 'city'
              ? '#929b98'
              : '#8ba274';
  ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height * 0.54);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorldViewport(ctx);
  drawCoastWaves(ctx);
  drawRiverCurrent(ctx);
  drawSkidmarks(ctx);
  drawStartingGridSelection(ctx);
  for (const p of particles) {
    ctx.globalAlpha = (p.life / p.max) * 0.35;
    ctx.fillStyle =
      p.type === 'water'
        ? '#b7f3ee'
        : p.type === 'dust'
          ? '#dfca9b'
          : p.type === 'spark'
            ? '#ffdf85'
            : '#f0e9da';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawPatchHighlights(ctx, millis() / 1000);
  drawCityTraffic(ctx);
  drawCar(ctx);
  drawLapGhost(ctx);
  drawJungle(ctx);
  ctx.restore();
  if (feedback.impact > 0.03) {
    ctx.save();
    ctx.fillStyle = 'rgba(247,130,92,' + feedback.impact * 0.065 + ')';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  if (toastTimer > 0 && !paused) {
    toastTimer -= elapsed;
    if (toastTimer <= 0) $('toast').classList.remove('visible');
  }
  if (millis() - lastHUD > 70) {
    updateHUD();
    drawMinimap();
    lastHUD = millis();
  }
  updateAudio();
}

function drawCar(c) {
  c.save();
  c.translate(car.x, car.y);
  c.rotate(car.angle);
  c.fillStyle = '#10201b40';
  roundedRect(
    c,
    -activeCar.length / 2 + 3,
    -activeCar.width / 2 + 4,
    activeCar.length,
    activeCar.width,
    5,
  );
  c.fill();
  // Front tires visibly steer independently from the body.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(12, side * 11);
    c.rotate(car.steer * 0.35);
    c.fillStyle = '#182124';
    c.fillRect(-5, -3, 10, 6);
    c.restore();
    c.fillStyle = '#182124';
    c.fillRect(-17, side * 11 - 3, 10, 6);
  }
  if (carArt.complete && carArt.naturalWidth) {
    c.save();
    c.rotate(Math.PI / 2);
    c.drawImage(
      carArt,
      -activeCar.width / 2,
      -activeCar.length / 2,
      activeCar.width,
      activeCar.length,
    );
    c.restore();
  } else {
    c.fillStyle = PAINTS[paint].hex;
    roundedRect(
      c,
      -activeCar.length / 2,
      -activeCar.width / 2,
      activeCar.length,
      activeCar.width,
      5,
    );
    c.fill();
    c.fillStyle = '#b9dedb';
    c.fillRect(4, -8, 7, 16);
    c.fillStyle = '#293c3f';
    c.fillRect(-9, -8, 6, 16);
  }
  if (activeCar.id === 'formula') {
    for (const [x, steers] of [
      [activeCar.length * 0.22, true],
      [-activeCar.length * 0.28, false],
    ])
      for (const side of [-1, 1]) {
        c.save();
        c.translate(x, side * activeCar.width * 0.38);
        if (steers) c.rotate(car.steer * 0.35);
        c.fillStyle = '#25312d';
        roundedRect(c, -5, -3.2, 10, 6.4, 1.2);
        c.fill();
        c.restore();
      }
  }
  c.save();
  if (car.brake) {
    c.shadowColor = '#ff4b35';
    c.shadowBlur = 7;
  }
  c.fillStyle = car.brake ? '#ff6a4f' : '#942d27';
  c.fillRect(-activeCar.length / 2, -9, 2, 5);
  c.fillRect(-activeCar.length / 2, 4, 2, 5);
  c.restore();
  c.restore();
}

function roundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
function path(c, points, offset = 0, close = true) {
  c.beginPath();
  points.forEach((p, i) => {
    const d = typeof offset === 'function' ? offset(i / points.length) : offset,
      x = p.x + (p.nx || 0) * d,
      y = p.y + (p.ny || 0) * d;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  if (close) c.closePath();
}
function ribbon(c, color, width, points = track) {
  c.strokeStyle = color;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  if (typeof width !== 'function') {
    path(c, points);
    c.lineWidth = width;
    c.stroke();
    return;
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[(i + 1) % points.length];
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(q.x, q.y);
    c.lineWidth =
      (width(i / points.length) +
        width(((i + 1) % points.length) / points.length)) /
      2;
    c.stroke();
  }
}

// The river crosses the circuit twice as shallow, drivable fords.
const amazonRiver = Array.from({ length: 129 }, (_, i) => {
  const t = i / 128;
  return {
    x: -1650 + 3200 * t + 70 * Math.sin(t * Math.PI * 5),
    y: -2400 + 5000 * t,
  };
});
const amazonSegments = makePathSegments(amazonRiver);
function amazonRiverScale(t) {
  return 0.78 + 0.22 * Math.sin(t * Math.PI) + 0.08 * Math.sin(t * Math.PI * 7);
}
function amazonRiverFrame(x, y) {
  const best = nearestSegmentFrame(amazonSegments, x, y),
    segment = amazonSegments[best.index];
  best.distance = Math.sqrt(best.d2);
  best.t = (best.index + best.t) / amazonSegments.length;
  best.tx = segment.tx;
  best.ty = segment.ty;
  return best;
}
function amazonRiverDistance(x, y) {
  return amazonRiverFrame(x, y).distance;
}
function paintAmazonFords(c) {
  // One union mask prevents overlapping main/pit fords from doubling the
  // water opacity or leaving triangular seams at the merge.
  const layer = document.createElement('canvas');
  layer.width = worldBounds.width;
  layer.height = worldBounds.height;
  const water = layer.getContext('2d');
  water.translate(-worldBounds.x, -worldBounds.y);
  path(water, track);
  water.strokeStyle = '#fff';
  water.lineWidth = (CFG.wall + 12) * 2;
  water.lineJoin = 'round';
  water.stroke();
  path(water, pitLane.points, 0, false);
  water.lineWidth = (pitLane.wall + 12) * 2;
  water.lineCap = 'round';
  water.stroke();
  water.globalCompositeOperation = 'source-in';
  paintFordWater(water);
  c.drawImage(layer, worldBounds.x, worldBounds.y);
  // Mark both approaches on the dry verge; water itself remains unobstructed.
  for (let i = 0; i < track.length; i++) {
    const p = track[i],
      prev = track[(i + track.length - 1) % track.length];
    if (
      amazonRiverDistance(p.x, p.y) < 140 &&
      amazonRiverDistance(prev.x, prev.y) >= 140
    ) {
      for (const side of [-1, 1]) {
        c.save();
        c.translate(
          p.x + p.nx * side * (CFG.road + 22),
          p.y + p.ny * side * (CFG.road + 22),
        );
        c.rotate(Math.atan2(p.ty, p.tx));
        c.fillStyle = '#f3d37b';
        c.fillRect(-23, -11, 46, 22);
        c.fillStyle = '#294c46';
        c.textAlign = 'center';
        c.font = 'bold 11px Arial';
        c.fillText('FORD', 0, 4);
        c.restore();
      }
    }
  }
}
function drawRiverCurrent(c) {
  if (activeMap.id !== 'amazonas') return;
  c.save();
  c.lineCap = 'round';
  c.lineWidth = 1.7;
  for (let i = 0; i < 72; i++) {
    const progress = (i / 72 + jungle.flowTime * 0.004) % 1,
      index = progress * (amazonRiver.length - 1),
      p = amazonRiver[Math.floor(index)],
      q = amazonRiver[Math.min(amazonRiver.length - 1, Math.floor(index) + 1)],
      t = index % 1,
      dx = q.x - p.x,
      dy = q.y - p.y,
      length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const tx = dx / length,
      ty = dy / length,
      offset = ((i % 3) - 1) * 34 * amazonRiverScale(progress),
      x = lerpTo(p.x, q.x, t) - ty * offset,
      y = lerpTo(p.y, q.y, t) + tx * offset;
    if (!inWorldView(x, y, 25)) continue;
    c.strokeStyle = i % 4 ? '#bcead55e' : '#e0f7cf80';
    c.beginPath();
    c.moveTo(x - tx * 9, y - ty * 9);
    c.quadraticCurveTo(x - ty * 3, y + tx * 3, x + tx * 10, y + ty * 10);
    c.stroke();
    if (i % 9 === 0) {
      c.save();
      c.translate(x, y);
      c.rotate(Math.atan2(ty, tx));
      c.fillStyle = '#b5cb75a0';
      c.beginPath();
      c.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
  c.restore();
}
function paintFordWater(c) {
  c.beginPath();
  for (const side of [-1, 1]) {
    const points = side === 1 ? amazonRiver : amazonRiver.slice().reverse();
    points.forEach((p, i) => {
      const index = side === 1 ? i : amazonRiver.length - 1 - i,
        a = amazonRiver[Math.max(0, index - 1)],
        b = amazonRiver[Math.min(amazonRiver.length - 1, index + 1)],
        length = Math.hypot(b.x - a.x, b.y - a.y),
        d = 83 * amazonRiverScale(index / (amazonRiver.length - 1)) * side,
        x = p.x - ((b.y - a.y) / length) * d,
        y = p.y + ((b.x - a.x) / length) * d;
      side === -1 && i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
    });
  }
  c.closePath();
  c.fillStyle = '#82dfce99';
  c.fill();
}
function paintAmazonRiver(c, detail = true) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const [color, width] of [
    ['#4b6641', 225],
    ['#9b885b', 190],
    ['#205c5a', 166],
    ['#338b83', 135],
    ['#4aa397', 84],
  ]) {
    c.strokeStyle = color;
    for (let i = 0; i < amazonRiver.length - 1; i++) {
      const p = amazonRiver[i],
        q = amazonRiver[i + 1],
        t = (i + 0.5) / (amazonRiver.length - 1);
      c.lineWidth = width * amazonRiverScale(t);
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
      c.stroke();
    }
  }
  if (detail) {
    const rand = seededRandom(925);
    for (let i = 0; i < 180; i++) {
      const p = amazonRiver[2 + Math.floor(rand() * (amazonRiver.length - 4))],
        d = (rand() - 0.5) * 110;
      c.strokeStyle = i % 3 ? '#b0e5c43b' : '#153e4530';
      c.lineWidth = 1 + rand() * 2;
      c.beginPath();
      c.moveTo(p.x + d - 6, p.y - d - 10);
      c.quadraticCurveTo(p.x + d + 5, p.y - d, p.x + d + 9, p.y - d + 15);
      c.stroke();
    }
    for (let i = 0; i < amazonRiver.length; i += 2) {
      const p = amazonRiver[i];
      for (const side of [-1, 1]) {
        const x = p.x + side * 86,
          y = p.y - side * 54;
        c.strokeStyle = '#8baf60';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + side * 12, y - 8);
        c.moveTo(x, y);
        c.lineTo(x - 4, y - 15);
        c.stroke();
      }
    }
  }
  c.restore();
}
function paintJungleTree(c, x, y, size, rand) {
  if (
    sceneryAssetState.ready &&
    drawSceneryAsset(
      c,
      rand() < 0.35 ? 'tree-fan-palm' : 'tree-jungle',
      x,
      y,
      size * 1.1,
      size * 1.1,
      rand() * Math.PI * 2,
    )
  )
    return;
  c.save();
  c.translate(x, y);
  c.rotate(rand() * Math.PI * 2);
  c.fillStyle = '#102c2455';
  c.beginPath();
  c.ellipse(8, 10, size * 0.55, size * 0.45, 0, 0, Math.PI * 2);
  c.fill();
  if (rand() < 0.4) {
    // Feathered palm fronds spread radially in a true overhead view.
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * Math.PI) / 4);
      c.fillStyle = i % 2 ? '#4d9860' : '#397f4c';
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(size * 0.23, -size * 0.25, size * 0.6, -size * 0.07);
      c.quadraticCurveTo(size * 0.28, size * 0.11, 0, 0);
      c.fill();
      c.strokeStyle = '#8cb97588';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(size * 0.53, -size * 0.06);
      c.stroke();
      c.restore();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7;
      c.fillStyle = ['#275f3c', '#36784a', '#408650'][i % 3];
      c.beginPath();
      c.ellipse(
        Math.cos(a) * size * 0.23,
        Math.sin(a) * size * 0.22,
        size * 0.3,
        size * 0.25,
        a,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.fillStyle = '#599458';
    c.beginPath();
    c.ellipse(
      -size * 0.08,
      -size * 0.08,
      size * 0.23,
      size * 0.19,
      -0.4,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.restore();
}
function monkeyPosition() {
  const p = track[Math.floor(track.length * 0.32)],
    offset = CFG.wall + 40;
  return {
    x: p.x + p.nx * offset,
    y: p.y + p.ny * offset,
    angle: Math.atan2(-p.ny, -p.nx),
  };
}
function updateJungle(dt) {
  car.coconutSlip = Math.max(0, (car.coconutSlip || 0) - dt);
  if (activeMap.id !== 'amazonas') return;
  jungle.flowTime += dt;
  jungle.cooldown = Math.max(0, jungle.cooldown - dt);
  jungle.throwTime = Math.max(0, jungle.throwTime - dt);
  const m = monkeyPosition(),
    distance = Math.hypot(car.x - m.x, car.y - m.y);
  if (
    distance < 420 &&
    Math.hypot(car.vx, car.vy) > 35 &&
    jungle.cooldown === 0
  ) {
    const duration = 0.8;
    jungle.coconuts.push({
      sx: m.x,
      sy: m.y,
      x: m.x,
      y: m.y,
      tx: car.x + car.vx * duration * 0.75,
      ty: car.y + car.vy * duration * 0.75,
      age: 0,
      duration,
      hit: false,
    });
    jungle.cooldown = 4;
    jungle.throwTime = 0.65;
  }
  for (let i = jungle.coconuts.length - 1; i >= 0; i--) {
    const nut = jungle.coconuts[i];
    nut.age += dt;
    const t = Math.min(1, nut.age / nut.duration);
    nut.x = lerpTo(nut.sx, nut.tx, t);
    nut.y = lerpTo(nut.sy, nut.ty, t);
    if (
      !nut.hit &&
      t >= 0.85 &&
      Math.hypot(car.x - nut.x, car.y - nut.y) < activeCar.length * 0.5 + 10
    ) {
      nut.hit = true;
      car.coconutSlip = 0.75;
      car.vx *= 0.86;
      car.vy *= 0.86;
      car.yaw += 0.55;
      burst(nut.x, nut.y, 'dust', 7);
      notify('COCONUT! · Hold your line');
    }
    if (nut.age > nut.duration + 1.6) jungle.coconuts.splice(i, 1);
  }
}
function drawJungle(c) {
  if (activeMap.id !== 'amazonas') return;
  const m = monkeyPosition();
  if (inWorldView(m.x, m.y, 140)) {
    c.save();
    c.translate(m.x, m.y);
    // A small palm and a warning board make the thrower easy to spot on approach.
    const rand = seededRandom(46);
    paintJungleTree(c, 0, -36, 100, rand);
    c.fillStyle = '#d9c27e';
    roundedRect(c, -39, 31, 78, 23, 3);
    c.fill();
    c.fillStyle = '#384b2c';
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillText('COCONUTS!', 0, 47);
    c.rotate(m.angle);
    c.strokeStyle = '#80502f';
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-14, 1);
    c.bezierCurveTo(-53, 25, -53, -27, -30, -15);
    c.stroke();
    c.fillStyle = '#4c3024';
    c.beginPath();
    c.ellipse(-4, 3, 21, 17, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#98603b';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(jungle.throwTime > 0 ? 30 : 11, jungle.throwTime > 0 ? -23 : -25);
    c.moveTo(0, 13);
    c.lineTo(20, 20);
    c.stroke();
    for (const side of [-1, 1]) {
      c.fillStyle = '#8c5735';
      c.beginPath();
      c.arc(13, side * 14, 8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d4a477';
      c.beginPath();
      c.arc(14, side * 14, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#9c6845';
    c.beginPath();
    c.ellipse(15, 0, 17, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e1b887';
    c.beginPath();
    c.ellipse(23, 0, 10, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#241e18';
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(24, side * 6, 2.3, 0, Math.PI * 2);
      c.fill();
    }
    c.beginPath();
    c.arc(30, 0, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  for (const nut of jungle.coconuts) {
    if (nut.hit) continue;
    const t = Math.min(1, nut.age / nut.duration),
      lift = Math.sin(t * Math.PI) * 65;
    c.save();
    c.globalAlpha =
      nut.age > nut.duration
        ? Math.max(0, 1 - (nut.age - nut.duration) / 1.6)
        : 1;
    c.fillStyle = '#10251c55';
    c.beginPath();
    c.ellipse(nut.x + 4, nut.y + 4, 9, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#80532f';
    c.strokeStyle = '#cfab70';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(nut.x, nut.y - lift, 8, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#432e20';
    c.beginPath();
    c.arc(nut.x - 2, nut.y - lift - 2, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// A continuous shoreline keeps the sea outside the road and pit barriers.
const coast = {
  time: 0,
  shore: sampleCurve(
    [
      [-5000, -1400],
      [-2350, -1500],
      [-1750, -1700],
      [-1150, -1700],
      [-800, -1850],
      [-550, -1750],
      [-350, -2100],
      [200, -2250],
      [650, -2000],
      [800, -1650],
      [1450, -1600],
      [1850, -1200],
      [1850, -750],
      [1750, -350],
      [1900, 150],
      [1650, 600],
      [1900, 1050],
      [1700, 1600],
      [1100, 1850],
      [750, 1770],
      [300, 2030],
      [-200, 1830],
      [-800, 1820],
      [-1300, 1700],
      [-1900, 1500],
      [-5000, 1700],
    ],
    12,
  ),
  lighthouse: { x: 100, y: -1780 },
};
const coastSegments = makePathSegments(coast.shore, true);
function coastShoreFrame(x, y) {
  const best = nearestSegmentFrame(coastSegments, x, y),
    segment = coastSegments[best.index];
  best.distance = Math.sqrt(best.d2);
  best.tx = segment.tx;
  best.ty = segment.ty;
  return best;
}
function coastOnLand(x, y) {
  let inside = false;
  const points = coast.shore;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const p = points[i],
      q = points[j];
    if (
      p.y > y !== q.y > y &&
      x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x
    )
      inside = !inside;
  }
  return inside;
}
function coastLandDistance(x, y) {
  const distance = coastShoreFrame(x, y).distance;
  return coastOnLand(x, y) ? distance : -distance;
}
function paintCoastGround(c, bounds, detail = true) {
  const rand = seededRandom(6845),
    { x, y, width, height } = bounds,
    sea = c.createLinearGradient(x, y, x + width, y + height);
  sea.addColorStop(0, '#246f8d');
  sea.addColorStop(0.55, '#288f9c');
  sea.addColorStop(1, '#2a8999');
  c.fillStyle = sea;
  c.fillRect(x, y, width, height);
  path(c, coast.shore);
  c.fillStyle = '#a8b88a';
  c.fill();
  // Shore bands are clipped to the sea, so shallows never spill onto the road.
  c.save();
  c.beginPath();
  c.rect(x, y, width, height);
  coast.shore.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.closePath();
  c.clip('evenodd');
  for (const [color, width] of [
    ['#42aeb0', 310],
    ['#68c8be', 200],
    ['#91d8c5', 120],
    ['#e7d6a7', 48],
  ]) {
    path(c, coast.shore);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.stroke();
  }
  c.restore();
  c.save();
  path(c, coast.shore);
  c.clip();
  path(c, coast.shore);
  c.strokeStyle = '#ead5a3';
  c.lineWidth = 125;
  c.stroke();
  if (detail) {
    for (let i = 0; i < 170; i++) {
      const px = x + rand() * width,
        py = y + rand() * height;
      c.fillStyle = i % 2 ? '#b6c49155' : '#8ba27755';
      c.beginPath();
      c.ellipse(
        px,
        py,
        40 + rand() * 100,
        30 + rand() * 70,
        rand() * 6.28,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    for (let i = 0; i < 18000; i++) {
      c.fillStyle = i % 2 ? '#657b4c20' : '#e4d6a52a';
      c.fillRect(x + rand() * width, y + rand() * height, 1.5, 1.5);
    }
  }
  c.restore();
}
function paintCoastBuilding(c, x, y, w, h, angle, roof = '#c77d58') {
  const variant = Math.abs(Math.floor(x * 13 + y * 7)) % 3,
    key =
      variant === 0
        ? 'house-terracotta'
        : variant === 1
          ? 'house-sandstone'
          : 'house-modern';
  if (drawSceneryAsset(c, key, x, y, w + 8, h + 8, angle)) return;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#56644a30';
  roundedRect(c, -w / 2 + 4, -h / 2 + 5, w, h, 4);
  c.fill();
  c.fillStyle = '#f4e4c5';
  roundedRect(c, -w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 3);
  c.fill();
  c.fillStyle = roof;
  roundedRect(c, -w / 2, -h / 2, w, h, 2);
  c.fill();
  c.strokeStyle = '#f2c09270';
  c.lineWidth = 2;
  for (let i = -h / 2 + 6; i < h / 2; i += 8) {
    c.beginPath();
    c.moveTo(-w / 2 + 2, i);
    c.lineTo(w / 2 - 2, i);
    c.stroke();
  }
  c.strokeStyle = '#9d5c43';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, -h / 2);
  c.lineTo(0, h / 2);
  c.stroke();
  c.fillStyle = '#e6ceac';
  c.fillRect(w * 0.2, -h * 0.3, 9, 11);
  c.restore();
}
function paintCoastPalm(c, x, y, size, rand) {
  if (
    sceneryAssetState.ready &&
    drawSceneryAsset(
      c,
      rand() < 0.55 ? 'tree-palm' : 'tree-fan-palm',
      x,
      y,
      size * 1.15,
      size * 1.15,
      rand() * Math.PI * 2,
    )
  )
    return;
  c.save();
  c.translate(x, y);
  c.rotate(rand() * 6.28);
  c.fillStyle = '#566b4330';
  c.beginPath();
  c.ellipse(5, 6, size * 0.48, size * 0.4, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 7; i++) {
    c.save();
    c.rotate((i * Math.PI * 2) / 7);
    c.fillStyle = i % 2 ? '#688e55' : '#457d50';
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(size * 0.2, -size * 0.22, size * 0.55, -size * 0.06);
    c.quadraticCurveTo(size * 0.2, size * 0.1, 0, 0);
    c.fill();
    c.strokeStyle = '#a3b86b99';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(size * 0.47, -size * 0.05);
    c.stroke();
    c.restore();
  }
  c.restore();
}
function paintCoastBoat(c, x, y, angle, color) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#15516a44';
  c.beginPath();
  c.ellipse(3, 4, 31, 11, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#edf0db';
  c.beginPath();
  c.moveTo(33, 0);
  c.quadraticCurveTo(10, -15, -24, -10);
  c.lineTo(-24, 10);
  c.quadraticCurveTo(10, 15, 33, 0);
  c.fill();
  c.fillStyle = color;
  roundedRect(c, -18, -7, 35, 14, 3);
  c.fill();
  c.fillStyle = '#bdd8d9';
  c.fillRect(-4, -6, 11, 12);
  c.strokeStyle = '#eee4c5';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(9, 0);
  c.lineTo(25, 0);
  c.stroke();
  c.restore();
}
function paintCoastLandmarks(c) {
  const l = coast.lighthouse;
  c.save();
  c.translate(l.x, l.y);
  c.fillStyle = '#dbd5b4';
  c.beginPath();
  c.arc(0, 0, 86, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#f7efd4';
  c.lineWidth = 5;
  c.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    c.strokeStyle = '#aaa889';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * 53, Math.sin(a) * 53);
    c.lineTo(Math.cos(a) * 83, Math.sin(a) * 83);
    c.stroke();
  }
  c.fillStyle = '#70806e40';
  c.beginPath();
  c.arc(6, 7, 43, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#fff1d7';
  c.beginPath();
  c.arc(0, 0, 43, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#c46e55';
  c.lineWidth = 9;
  c.stroke();
  c.fillStyle = '#d97858';
  c.beginPath();
  c.arc(0, 0, 29, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#a8dfe0';
  c.beginPath();
  c.arc(0, 0, 16, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#f7e7bd';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#f4ebc9';
  c.font = '600 13px Arial';
  c.textAlign = 'center';
  c.fillText('FAROL', 0, 112);
  c.restore();
  const harbor = coastShoreFrame(paddock.x, paddock.y),
    nx = harbor.ty,
    ny = -harbor.tx;
  c.save();
  c.translate(harbor.x, harbor.y);
  c.rotate(Math.atan2(ny, nx));
  c.fillStyle = '#c5b691';
  roundedRect(c, -45, -145, 65, 290, 5);
  c.fill();
  for (let i = -1; i <= 1; i++) {
    c.fillStyle = '#b69d72';
    roundedRect(c, -15, i * 96 - 8, 235, 16, 3);
    c.fill();
    c.strokeStyle = '#7f7759';
    c.lineWidth = 1;
    for (let k = 0; k < 225; k += 12) {
      c.beginPath();
      c.moveTo(k, i * 96 - 7);
      c.lineTo(k, i * 96 + 7);
      c.stroke();
    }
    for (const side of [-1, 1])
      paintCoastBoat(
        c,
        105 + (i % 2) * 30,
        i * 96 + side * 29,
        0,
        side === 1 ? '#5a9da8' : '#c98262',
      );
  }
  c.restore();
  c.save();
  c.translate(harbor.x - nx * 85, harbor.y - ny * 85);
  c.fillStyle = '#f3ecd4';
  c.font = 'bold 18px Arial';
  c.textAlign = 'center';
  c.fillText('MARINA AZUL', 0, 0);
  c.restore();
  paintCoastBoat(c, 2050, -450, 0.7, '#c98262');
  paintCoastBoat(c, 2110, 850, -0.4, '#5a9da8');
}
function drawCoastWaves(c) {
  if (activeMap.id !== 'coast') return;
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < coast.shore.length; i += 3) {
    const p = coast.shore[i],
      q = coast.shore[(i + 1) % coast.shore.length],
      length = Math.hypot(q.x - p.x, q.y - p.y),
      tx = (q.x - p.x) / length,
      ty = (q.y - p.y) / length,
      offset = 135 - ((coast.time * 13 + i * 11) % 100),
      x = p.x + ty * offset,
      y = p.y - tx * offset;
    if (!inWorldView(x, y, 25)) continue;
    c.globalAlpha = Math.sin(((offset - 35) / 100) * Math.PI) * 0.48;
    c.strokeStyle = '#e5f7e4';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(x - tx * 15, y - ty * 15);
    c.quadraticCurveTo(x + ty * 4, y - tx * 4, x + tx * 15, y + ty * 15);
    c.stroke();
  }
  c.restore();
}

// Place large sites first, then details, then trees. Every object reserves its
// complete rotated sprite footprint, including the shadow, before anything draws.
const SCENERY_LAYERS = { ground: 0, props: 1, structures: 2, canopy: 3 };
const sceneryDetails = [],
  sceneryBuildings = [],
  sceneryTrees = [],
  sceneryScene = [];
function reserveScenery(prop, target) {
  if (!sceneryClear(prop.x, prop.y, prop.radius)) return false;
  if (
    sceneryScene.some(
      (other) =>
        (prop.x - other.x) ** 2 + (prop.y - other.y) ** 2 <
        (prop.radius + other.radius + 8) ** 2,
    )
  )
    return false;
  target.push(prop);
  sceneryScene.push(prop);
  return true;
}
function cityParkClear(x, y, radius) {
  const dx = x - 190,
    dy = y - 390;
  if (Math.hypot(dx, dy) < 66 + radius) return false;
  if (Math.abs(Math.hypot(dx / 380, dy / 285) - 1) * 285 < radius + 14)
    return false;
  if (Math.hypot(x - Math.max(-170, Math.min(550, x)), dy) < radius + 12)
    return false;
  if (Math.hypot(dx, y - Math.max(120, Math.min(660, y))) < radius + 12)
    return false;
  return Math.hypot(x - 190, y - 775) > radius + 95;
}
function sceneryClear(x, y, radius) {
  const n = nearest(x, y);
  if (
    n.distance < widthAt('wall', n.progress) + radius + 24 ||
    withinPitDistance(x, y, pitLane.wall + radius + 24)
  )
    return false;
  const dx = x - paddock.x,
    dy = y - paddock.y,
    px = dx * paddock.tx + dy * paddock.ty,
    py = -dx * paddock.ty + dy * paddock.tx;
  if (
    px > -265 - radius &&
    px < 305 + radius &&
    py > -75 - radius &&
    py < 125 + radius
  )
    return false;
  if (activeMap.id === 'amazonas') {
    const m = monkeyPosition();
    if (
      amazonRiverDistance(x, y) < 125 + radius ||
      Math.hypot(x - m.x, y - (m.y - 20)) < 100 + radius
    )
      return false;
  }
  if (activeMap.id === 'city' && !cityParkClear(x, y, radius)) return false;
  if (
    activeMap.id === 'coast' &&
    (coastLandDistance(x, y) < 90 + radius ||
      Math.hypot(x - coast.lighthouse.x, y - coast.lighthouse.y) < 130 + radius)
  )
    return false;
  return true;
}
function buildSceneryBuildings() {
  if (activeMap.id === 'coast') {
    const rand = seededRandom(891);
    for (let i = 0; i < 64; i++) {
      const x = -2200 + rand() * 1200,
        y = -900 + rand() * 1450,
        w = 45 + rand() * 45,
        h = 42 + rand() * 35,
        angle = rand() * 0.6 - 0.3;
      reserveScenery(
        {
          type: 'building',
          kind: 'coast',
          x,
          y,
          w,
          h,
          angle,
          radius: Math.hypot(w + 8, h + 8) / 2,
          seed: i,
          layer: SCENERY_LAYERS.structures,
        },
        sceneryBuildings,
      );
    }
  }
  if (activeMap.id === 'city') {
    const rand = seededRandom(4209);
    for (let x = -2320; x < 1700; x += 235)
      for (let y = -2000; y < -240; y += 245) {
        const w = 125 + rand() * 45,
          h = 135 + rand() * 45,
          px = x + (rand() - 0.5) * 25,
          py = y + (rand() - 0.5) * 25;
        reserveScenery(
          {
            type: 'building',
            kind: 'office',
            x: px,
            y: py,
            w,
            h,
            angle: 0,
            radius: Math.hypot(w * 1.4, h * 1.4) / 2 + 2,
            seed: Math.floor(rand() * 100000),
            layer: SCENERY_LAYERS.structures,
          },
          sceneryBuildings,
        );
      }
    for (let x = -1100; x < 2100; x += 245)
      for (let y = 30; y < 2150; y += 245) {
        const px = x + (rand() - 0.5) * 45,
          py = y + (rand() - 0.5) * 45;
        if (px > -380 && px < 760 && py < 850) continue;
        reserveScenery(
          {
            type: 'building',
            kind: 'home',
            x: px,
            y: py,
            w: 78 + rand() * 15,
            h: 62 + rand() * 15,
            angle: 0,
            radius: Math.hypot(192, 184) / 2 + 2,
            seed: Math.floor(rand() * 100000),
            layer: SCENERY_LAYERS.structures,
          },
          sceneryBuildings,
        );
      }
  }
}
function sceneryDetailLayer(kind) {
  if (
    [
      'fern',
      'flowers',
      'drygrass',
      'snowdrift',
      'parking',
      'garden-bed',
    ].includes(kind)
  )
    return SCENERY_LAYERS.ground;
  if (
    [
      'cabin',
      'hut',
      'villa',
      'citybuilding',
      'greenhouse',
      'shed-garden',
      'cafe-terrace',
      'spectator-stand',
      'canopy',
      'water-tank',
    ].includes(kind)
  )
    return SCENERY_LAYERS.structures;
  if (['pine', 'cactus'].includes(kind)) return SCENERY_LAYERS.canopy;
  return SCENERY_LAYERS.props;
}
function buildSceneryDetails() {
  sceneryDetails.length = 0;
  sceneryBuildings.length = 0;
  sceneryTrees.length = 0;
  sceneryScene.length = 0;
  buildSceneryBuildings();
  const rand = seededRandom(
      5600 + Object.keys(MAPS).indexOf(activeMap.id) * 271,
    ),
    kinds = {
      juniper: [
        'rock-moss',
        'log',
        'fern',
        'flowers',
        'cabin',
        'picnic',
        'shed-garden',
        'greenhouse',
        'spectator-stand',
      ],
      canyon: [
        'rock',
        'cactus',
        'drygrass',
        'hut',
        'water-tank',
        'service-transporter',
      ],
      alpine: [
        'rock',
        'pine',
        'snowdrift',
        'cabin',
        'shed-garden',
        'spectator-stand',
      ],
      amazonas: ['fern', 'flowers', 'log', 'rock-moss', 'hut', 'picnic'],
      rallycross: [
        'tires',
        'canopy',
        'service-transporter',
        'rock',
        'tool-trolley',
        'spectator-stand',
      ],
      coast: [
        'umbrella',
        'flowers',
        'rock',
        'villa',
        'bench',
        'cafe-terrace',
        'garden-bed',
      ],
      city: [
        'citybuilding',
        'streetlamp',
        'parking',
        'flowers',
        'bench',
        'garden-bed',
        'greenhouse',
        'cafe-terrace',
      ],
    }[activeMap.id];
  for (let i = 0; i < 360; i++) {
    const p = track[Math.floor(rand() * track.length)],
      size = 22 + rand() * 32,
      radius = size * 1.3 + 8,
      side = rand() < 0.5 ? -1 : 1,
      d = widthAt('wall', p.s / track.totalLength) + radius + 60 + rand() * 240,
      x = p.x + p.nx * d * side,
      y = p.y + p.ny * d * side,
      kind = kinds[Math.floor(rand() * kinds.length)],
      seed = Math.floor(rand() * 100000),
      rotation = rand() * Math.PI * 2;
    const layer = sceneryDetailLayer(kind),
      aligned =
        layer === SCENERY_LAYERS.structures ||
        ['service-transporter', 'bench', 'picnic'].includes(kind),
      angle = aligned
        ? activeMap.id === 'city'
          ? 0
          : Math.atan2(p.ty, p.tx) + (side === 1 ? Math.PI : 0)
        : rotation;
    // Buildings belong outside the central park; paths and the fountain stay open.
    if (
      activeMap.id === 'city' &&
      ['citybuilding', 'greenhouse', 'cafe-terrace'].includes(kind) &&
      x > -400 - radius &&
      x < 780 + radius &&
      y > -110 - radius &&
      y < 870 + radius
    )
      continue;
    reserveScenery(
      { type: 'detail', x, y, size, radius, angle, kind, seed, layer },
      sceneryDetails,
    );
  }
  buildSceneryTrees();
  sceneryScene.sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
}
function buildSceneryTrees() {
  const id = activeMap.id,
    rand = seededRandom(7300 + Object.keys(MAPS).indexOf(id) * 113),
    keys = {
      juniper: [
        'tree-oak',
        'tree-birch',
        'tree-elm',
        'tree-pine',
        'tree-willow',
      ],
      canyon: ['tree-cactus', 'tree-acacia'],
      alpine: ['tree-pine-snow', 'tree-pine-snow', 'tree-pine'],
      amazonas: ['tree-jungle', 'tree-jungle', 'tree-fan-palm'],
      coast: ['tree-palm', 'tree-fan-palm'],
      city: ['tree-birch', 'tree-elm', 'tree-willow'],
      rallycross: ['tree-oak', 'tree-birch', 'tree-pine'],
    }[id];
  for (let i = 0; i < (id === 'amazonas' ? 2800 : 1100); i++) {
    const x = rand() * worldBounds.width + worldBounds.x,
      y = rand() * worldBounds.height + worldBounds.y,
      size = id === 'amazonas' ? 65 + rand() * 65 : 35 + rand() * 48,
      key = keys[Math.floor(rand() * keys.length)],
      angle = rand() * Math.PI * 2;
    if (id === 'city' && y < -100) continue;
    if (id === 'amazonas' && Math.abs(x + 500) < 180 && Math.abs(y + 220) < 110)
      continue;
    reserveScenery(
      {
        type: 'tree',
        kind: key,
        key,
        x,
        y,
        size,
        radius: size * 0.85,
        angle,
        layer: SCENERY_LAYERS.canopy,
      },
      sceneryTrees,
    );
  }
}
function paintSceneryGround(c) {
  for (const site of sceneryBuildings) {
    const { x, y, w, h, kind } = site;
    if (kind === 'home') {
      c.fillStyle = site.seed % 2 ? '#b4bd91' : '#98ae81';
      roundedRect(c, x - 96, y - 92, 192, 184, 7);
      c.fill();
      c.strokeStyle = '#d9ddbf';
      c.lineWidth = 3;
      c.stroke();
    } else if (kind === 'office') {
      c.fillStyle = '#b5bcb03d';
      roundedRect(c, x - w * 0.7, y - h * 0.7, w * 1.4, h * 1.4, 8);
      c.fill();
    }
  }
}
function paintSceneryScene(c) {
  // The sorted list is also the actual draw order: ground, props, roofs, crowns.
  for (const prop of sceneryScene) {
    const rand = seededRandom(prop.seed || 0);
    if (prop.type === 'building') {
      if (prop.kind === 'coast')
        paintCoastBuilding(
          c,
          prop.x,
          prop.y,
          prop.w,
          prop.h,
          prop.angle,
          prop.seed % 3 ? '#c7835d' : '#dba575',
        );
      else if (prop.kind === 'home')
        paintCityBuilding(
          c,
          prop.x - 18,
          prop.y - 18,
          prop.w,
          prop.h,
          rand,
          true,
        );
      else paintCityBuilding(c, prop.x, prop.y, prop.w, prop.h, rand);
    } else if (prop.type === 'tree') {
      if (
        !drawSceneryAsset(
          c,
          prop.key,
          prop.x,
          prop.y,
          prop.size * 1.18,
          prop.size * 1.18,
          prop.angle,
        )
      )
        paintCityTree(c, prop.x, prop.y, prop.size, rand);
    } else paintSceneryDetails(c, [prop]);
  }
  // Garden trees share their home's reserved plot, but still draw as canopies.
  for (const site of sceneryBuildings)
    if (site.kind === 'home')
      paintCityTree(c, site.x + 60, site.y + 55, 36, seededRandom(site.seed));
}

function paintSceneryRock(c, size, rand) {
  const desert = activeMap.id === 'canyon',
    snow = activeMap.id === 'alpine';
  c.fillStyle = '#203b2c25';
  c.beginPath();
  c.ellipse(5, 6, size * 0.7, size * 0.47, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7,
      r = size * (0.43 + rand() * 0.17);
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r * 0.75;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  }
  c.closePath();
  c.fillStyle = desert ? '#ba8662' : snow ? '#a0b6b7' : '#9b9d83';
  c.fill();
  c.fillStyle = desert ? '#dfb48a' : snow ? '#e7f0e8' : '#bcc0a3';
  c.beginPath();
  c.moveTo(-size * 0.42, -size * 0.1);
  c.lineTo(-size * 0.1, -size * 0.35);
  c.lineTo(size * 0.28, -size * 0.19);
  c.lineTo(size * 0.1, size * 0.04);
  c.closePath();
  c.fill();
}
function paintSceneryDetails(c, props = sceneryDetails) {
  for (const prop of props) {
    const { x, y, size, angle, kind } = prop,
      rand = seededRandom(prop.seed);
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    const asset = [
      'greenhouse',
      'shed-garden',
      'cafe-terrace',
      'service-transporter',
      'tool-trolley',
      'water-tank',
      'spectator-stand',
      'garden-bed',
      'rock-moss',
    ].includes(kind)
      ? kind
      : kind === 'canopy'
        ? ['service-tent-red', 'service-tent-blue', 'service-tent-sand'][
            prop.seed % 3
          ]
        : kind === 'tires'
          ? 'tyre-rack'
          : kind === 'cabin'
            ? activeMap.id === 'alpine'
              ? 'cottage-snow'
              : 'cottage-wood'
            : kind === 'hut'
              ? activeMap.id === 'amazonas'
                ? 'hut-jungle'
                : 'house-sandstone'
              : kind === 'picnic'
                ? 'picnic-table'
                : kind === 'bench'
                  ? 'park-bench'
                  : null;
    if (asset && drawSceneryAsset(c, asset, 0, 0, size * 1.6, size * 1.4)) {
      c.restore();
      continue;
    }
    if (kind === 'rock') paintSceneryRock(c, size, rand);
    else if (kind === 'log') {
      c.strokeStyle = '#394b302b';
      c.lineWidth = size * 0.35;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-size * 0.55, 5);
      c.lineTo(size * 0.55, 5);
      c.stroke();
      c.strokeStyle = '#836344';
      c.lineWidth = size * 0.28;
      c.beginPath();
      c.moveTo(-size * 0.6, 0);
      c.lineTo(size * 0.6, 0);
      c.stroke();
      c.strokeStyle = '#bea67a';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-size * 0.48, -size * 0.04);
      c.lineTo(size * 0.48, -size * 0.04);
      c.stroke();
      for (const side of [-1, 1]) {
        c.fillStyle = '#d4be8d';
        c.beginPath();
        c.ellipse(
          side * size * 0.6,
          0,
          size * 0.06,
          size * 0.13,
          0,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    } else if (kind === 'fern' || kind === 'flowers') {
      for (let i = 0; i < 9; i++) {
        c.save();
        c.rotate((i * Math.PI * 2) / 9);
        c.fillStyle = kind === 'fern' ? '#4c8b55' : '#729055';
        c.beginPath();
        c.ellipse(
          size * 0.21,
          0,
          size * 0.27,
          size * 0.06,
          0.1,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.restore();
      }
      if (kind === 'flowers')
        for (let i = 0; i < 8; i++) {
          c.fillStyle = ['#f1d990', '#e7af9e', '#d5d49b'][i % 3];
          c.beginPath();
          c.arc(
            (rand() - 0.5) * size,
            (rand() - 0.5) * size,
            2.2,
            0,
            Math.PI * 2,
          );
          c.fill();
        }
    } else if (kind === 'cactus') paintDesertProp(c, 0, 0, size, rand);
    else if (kind === 'pine') paintAlpineProp(c, 0, 0, size * 1.2, rand);
    else if (kind === 'snowdrift') {
      c.fillStyle = '#edf4ed';
      c.beginPath();
      c.ellipse(0, 0, size * 0.75, size * 0.25, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#bdcfce88';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(2, 5, size * 0.65, size * 0.17, 0, 0, Math.PI);
      c.stroke();
    } else if (kind === 'drygrass') {
      c.strokeStyle = '#bd995f';
      c.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = rand() * 6.28;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * size * 0.42, Math.sin(a) * size * 0.42);
        c.stroke();
      }
    } else if (kind === 'tires') {
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++) {
          c.fillStyle = '#263532';
          c.beginPath();
          c.arc((i - 1) * 12, (j - 0.5) * 12, 7, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#758175';
          c.lineWidth = 2;
          c.beginPath();
          c.arc((i - 1) * 12, (j - 0.5) * 12, 3, 0, Math.PI * 2);
          c.stroke();
        }
    } else if (kind === 'canopy') {
      c.fillStyle = '#253f3025';
      c.fillRect(-size * 0.65 + 5, -size * 0.45 + 5, size * 1.3, size * 0.9);
      c.fillStyle = prop.seed % 2 ? '#d5c08b' : '#b8765a';
      roundedRect(c, -size * 0.65, -size * 0.45, size * 1.3, size * 0.9, 3);
      c.fill();
      c.strokeStyle = '#f0e4bd';
      c.lineWidth = 2;
      c.stroke();
      c.beginPath();
      c.moveTo(-size * 0.65, -size * 0.45);
      c.lineTo(size * 0.65, size * 0.45);
      c.moveTo(-size * 0.65, size * 0.45);
      c.lineTo(size * 0.65, -size * 0.45);
      c.stroke();
    } else if (kind === 'servicecar') {
      c.fillStyle = '#d6d8bf';
      roundedRect(c, -23, -12, 46, 24, 4);
      c.fill();
      c.fillStyle = '#607d7c';
      c.fillRect(6, -9, 8, 18);
      c.fillStyle = '#9b987b';
      c.fillRect(-19, -8, 20, 16);
      c.fillStyle = '#283c36';
      for (const side of [-1, 1]) {
        c.fillRect(-17, side * 11 - 2, 8, 4);
        c.fillRect(10, side * 11 - 2, 8, 4);
      }
    } else if (kind === 'umbrella') {
      c.fillStyle = '#d9c59c';
      c.fillRect(-size * 0.35, size * 0.35, size * 0.7, size * 0.28);
      c.fillStyle = '#f4e6c8';
      c.fillRect(-size * 0.32, size * 0.35, size * 0.64, size * 0.1);
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? '#eee6c6' : prop.seed % 2 ? '#77b3b8' : '#d48c6c';
        c.beginPath();
        c.moveTo(0, 0);
        c.arc(0, 0, size * 0.42, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
        c.closePath();
        c.fill();
      }
      c.fillStyle = '#e7d8ad';
      c.beginPath();
      c.arc(0, 0, 3, 0, Math.PI * 2);
      c.fill();
    } else if (kind === 'citybuilding')
      paintCityBuilding(c, 0, 0, size * 1.5, size * 1.2, rand, y > 0);
    else if (kind === 'streetlamp') {
      c.fillStyle = '#56665b';
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#d1d6bd';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(15, 0);
      c.stroke();
      c.fillStyle = '#eee6bf';
      c.beginPath();
      c.ellipse(16, 0, 7, 3, 0, 0, Math.PI * 2);
      c.fill();
    } else if (kind === 'parking') {
      c.fillStyle = '#8a9690';
      c.fillRect(-size * 0.65, -size * 0.45, size * 1.3, size * 0.9);
      c.strokeStyle = '#d4ddc5';
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const x = -size * 0.6 + i * size * 0.3;
        c.strokeRect(x, -size * 0.4, size * 0.26, size * 0.8);
        if (i % 2 === 0) {
          c.fillStyle = i ? '#bb8b68' : '#708e9b';
          roundedRect(c, x + 2, -size * 0.29, size * 0.18, size * 0.55, 2);
          c.fill();
        }
      }
    } else if (kind === 'villa')
      paintCoastBuilding(
        c,
        0,
        0,
        size * 1.2,
        size * 0.9,
        0,
        prop.seed % 2 ? '#cb865e' : '#d89d77',
      );
    c.restore();
  }
}

function paintCityGround(c, bounds) {
  const { x, y, width, height } = bounds;
  c.fillStyle = '#929b98';
  c.fillRect(x, y, width, height);
  c.strokeStyle = '#cbd0c127';
  c.lineWidth = 1;
  for (let px = x; px < x + width; px += 95) {
    c.beginPath();
    c.moveTo(px, y);
    c.lineTo(px, y + height);
    c.stroke();
  }
  for (let py = y; py < y + height; py += 95) {
    c.beginPath();
    c.moveTo(x, py);
    c.lineTo(x + width, py);
    c.stroke();
  }
  c.fillStyle = '#a2b28b';
  c.beginPath();
  c.moveTo(-1500, 160);
  c.lineTo(-850, -130);
  c.lineTo(x + width, -130);
  c.lineTo(x + width, y + height);
  c.lineTo(-1500, y + height);
  c.closePath();
  c.fill();
  // A small central park is well inside the circuit, beyond the barriers.
  c.fillStyle = '#8da67c';
  roundedRect(c, -330, -40, 1040, 860, 90);
  c.fill();
  c.strokeStyle = '#d7cfb0';
  c.lineWidth = 12;
  c.beginPath();
  c.ellipse(190, 390, 380, 285, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(-170, 390);
  c.lineTo(550, 390);
  c.moveTo(190, 120);
  c.lineTo(190, 660);
  c.stroke();
  c.fillStyle = '#d9d9c4';
  c.beginPath();
  c.arc(190, 390, 57, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#85bcb8';
  c.beginPath();
  c.arc(190, 390, 43, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#dae5d7';
  c.beginPath();
  c.arc(190, 390, 12, 0, Math.PI * 2);
  c.fill();
}
function paintCityBuilding(c, x, y, w, h, rand, residential = false) {
  if (sceneryAssetState.ready) {
    const variants = residential
      ? [
          'house-slate',
          'house-modern',
          'house-terracotta',
          'house-bungalow',
          'house-row',
        ]
      : ['office-lowrise', 'office-courtyard', 'warehouse'];
    if (
      drawSceneryAsset(
        c,
        variants[Math.floor(rand() * variants.length)],
        x,
        y,
        w + 12,
        h + 12,
      )
    )
      return;
  }
  c.save();
  c.translate(x, y);
  c.fillStyle = '#23383225';
  roundedRect(c, -w / 2 + 7, -h / 2 + 8, w, h, 4);
  c.fill();
  c.fillStyle = residential ? '#e5d9bd' : '#d6dbd1';
  roundedRect(c, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 3);
  c.fill();
  if (residential) {
    c.fillStyle = rand() < 0.5 ? '#b98262' : '#bba878';
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = '#8a715b';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-w / 2, 0);
    c.lineTo(w / 2, 0);
    c.stroke();
    c.fillStyle = '#e5d6b2';
    c.fillRect(w * 0.2, -h * 0.3, w * 0.13, h * 0.2);
  } else {
    c.fillStyle = ['#687778', '#7a8582', '#566b70'][Math.floor(rand() * 3)];
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = '#a4b5ad';
    c.lineWidth = 3;
    c.strokeRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);
    for (let i = 0; i < 3; i++) {
      const px = -w * 0.3 + i * w * 0.27;
      c.fillStyle = '#c3cec3';
      c.fillRect(px, -h * 0.27, w * 0.18, h * 0.2);
      c.fillStyle = '#758884';
      c.beginPath();
      c.arc(px + w * 0.09, -h * 0.17, Math.min(w, h) * 0.055, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#93aaa7';
    c.fillRect(-w * 0.23, h * 0.05, w * 0.4, h * 0.19);
    c.strokeStyle = '#445f64';
    c.lineWidth = 2;
    c.strokeRect(-w * 0.23, h * 0.05, w * 0.4, h * 0.19);
  }
  c.restore();
}
function paintCityTree(c, x, y, size, rand) {
  if (
    sceneryAssetState.ready &&
    drawSceneryAsset(
      c,
      rand() < 0.5 ? 'tree-birch' : 'tree-elm',
      x,
      y,
      size * 1.15,
      size * 1.15,
      rand() * Math.PI * 2,
    )
  )
    return;
  c.save();
  c.translate(x, y);
  c.fillStyle = '#344b3526';
  c.beginPath();
  c.ellipse(6, 7, size * 0.45, size * 0.38, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    c.fillStyle = i % 2 ? '#6e9364' : '#5b8357';
    c.beginPath();
    c.arc(
      Math.cos(a) * size * 0.15,
      Math.sin(a) * size * 0.15,
      size * 0.27,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.fillStyle = '#87a775';
  c.beginPath();
  c.arc(-size * 0.07, -size * 0.07, size * 0.22, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function paintCityRoadMarkings(c) {
  c.save();
  path(c, track);
  c.strokeStyle = '#ded2a06b';
  c.lineWidth = 2;
  c.setLineDash([18, 20]);
  c.stroke();
  c.restore();
  for (let corner = 1; corner <= 6; corner++) {
    const vertex = MAPS.city.points[corner],
      near = nearest(vertex[0], vertex[1]),
      index = (near.i - 17 + track.length) % track.length,
      p = track[index];
    if (withinPitDistance(p.x, p.y, pitLane.road + 20)) continue;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.fillStyle = '#e4e6d2bb';
    for (let i = -5; i <= 5; i++) c.fillRect(-15, i * 10 - 3, 30, 6);
    c.restore();
    for (const side of [-1, 1]) {
      const x = p.x + p.nx * (CFG.wall + 34) * side,
        y = p.y + p.ny * (CFG.wall + 34) * side;
      if (!sceneryClear(x, y, 8)) continue;
      c.save();
      c.translate(x, y);
      c.rotate(Math.atan2(p.ty, p.tx));
      c.fillStyle = '#4b5853';
      roundedRect(c, -5, -12, 10, 24, 3);
      c.fill();
      for (let lamp = 0; lamp < 3; lamp++) {
        c.fillStyle = ['#ba7966', '#d3b36c', '#8eaa7b'][lamp];
        c.beginPath();
        c.arc(0, -7 + lamp * 7, 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }
}

function buildWorld() {
  worldCanvas = document.createElement('canvas');
  worldCanvas.width = worldBounds.width;
  worldCanvas.height = worldBounds.height;
  worldCtx = worldCanvas.getContext('2d');
  const desert = activeMap.id === 'canyon',
    alpine = activeMap.id === 'alpine',
    amazon = activeMap.id === 'amazonas',
    seaside = activeMap.id === 'coast',
    urban = activeMap.id === 'city',
    c = worldCtx,
    rand = seededRandom(
      desert
        ? 4081
        : alpine
          ? 6327
          : amazon
            ? 9241
            : seaside
              ? 6845
              : urban
                ? 4209
                : 879,
    ),
    w = worldBounds.width,
    h = worldBounds.height;
  c.fillStyle = desert
    ? '#d5a36d'
    : alpine
      ? '#dbe6e3'
      : amazon
        ? '#28523b'
        : '#8ba274';
  c.fillRect(0, 0, w, h);
  c.translate(-worldBounds.x, -worldBounds.y);
  // All scenery is orthographic: tree crowns, roof planes, and flat ground markings.
  for (let i = 0; i < 140; i++) {
    c.fillStyle = desert
      ? i % 2
        ? '#dfb780'
        : '#c59160'
      : alpine
        ? i % 2
          ? '#eff5ee'
          : '#c7d5d3'
        : amazon
          ? i % 2
            ? '#315e40'
            : '#204832'
          : i % 2
            ? '#91a97c'
            : '#849d6e';
    c.beginPath();
    c.ellipse(
      rand() * w + worldBounds.x,
      rand() * h + worldBounds.y,
      70 + rand() * 200,
      60 + rand() * 150,
      rand() * 6.28,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  for (let i = 0; i < 32000; i++) {
    c.fillStyle = desert
      ? i % 2
        ? '#84543825'
        : '#ffe2ab40'
      : alpine
        ? i % 2
          ? '#90aeb326'
          : '#ffffff5a'
        : i % 2
          ? '#6f8a5b30'
          : '#b4c28d35';
    const x = rand() * w + worldBounds.x,
      y = rand() * h + worldBounds.y;
    c.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
  }
  if (seaside) paintCoastGround(c, worldBounds);
  if (urban) paintCityGround(c, worldBounds);
  if (amazon) paintAmazonRiver(c);
  if (desert) paintCanyonMesas(c, rand, w, h);
  if (alpine) paintAlpineRidges(c, rand, w, h);
  paintSceneryGround(c);
  if (urban) {
    c.fillStyle = '#e5e8d2';
    c.font = '600 18px Arial';
    c.textAlign = 'center';
    c.fillText('CENTRAL PARK', 190, 780);
  }
  paintPitRoad(c);
  ribbon(
    c,
    desert
      ? '#a96549'
      : alpine
        ? '#b7c9cb'
        : seaside
          ? '#bead85'
          : urban
            ? '#727f7b'
            : '#71895e',
    (p) => widthAt('wall', p) * 2 + 25,
  );
  ribbon(
    c,
    desert
      ? '#ddb27b'
      : alpine
        ? '#edf2e9'
        : seaside
          ? '#e1cf9f'
          : urban
            ? '#b2bab0'
            : '#a3ac87',
    (p) => widthAt('wall', p) * 2,
  );
  for (const [from, to] of [
    [0.12, 0.38],
    [0.51, 0.77],
  ]) {
    const section = track.slice(
      Math.floor(from * track.length),
      Math.ceil(to * track.length),
    );
    if (!desert && !alpine && !seaside && !urban) {
      c.beginPath();
      section.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.strokeStyle = '#cbb88f';
      c.lineWidth = (CFG.wall - 4) * 2;
      c.lineCap = 'butt';
      c.stroke();
    }
  }
  // Scatter actual gravel grains on the trap areas, outside the paved runoff.
  for (let i = 0; i < 17000; i++) {
    if (alpine || seaside || urban) break;
    const index = Math.floor(rand() * track.length),
      p = track[index],
      progress = index / track.length;
    const side = rand() < 0.5 ? -1 : 1,
      offset =
        (widthAt('runoff', progress) +
          1 +
          rand() *
            (widthAt('wall', progress) - widthAt('runoff', progress) - 5)) *
        side;
    if (
      !desert &&
      !(
        (progress > 0.12 && progress < 0.38) ||
        (progress > 0.51 && progress < 0.77)
      )
    )
      continue;
    c.fillStyle = desert
      ? i % 2
        ? '#915b3b55'
        : '#ffe4aa6c'
      : i % 2
        ? '#ae9c793f'
        : '#e2d3b55c';
    c.fillRect(p.x + p.nx * offset, p.y + p.ny * offset, 1.5, 1.5);
  }
  ribbon(
    c,
    desert ? '#a28c74' : alpine ? '#95a8ae' : urban ? '#abb4aa' : '#757e76',
    (p) => widthAt('runoff', p) * 2,
  );
  ribbon(
    c,
    desert ? '#8c8170' : alpine ? '#81969c' : '#6a746e',
    (p) => widthAt('road', p) * 2 + 24,
  );
  ribbon(
    c,
    desert ? '#f5d5a0' : alpine ? '#eaf4ef' : '#e4e5ca',
    (p) => widthAt('road', p) * 2 + 5,
  );
  ribbon(
    c,
    desert ? '#4f5150' : alpine ? '#46555c' : '#424d50',
    (p) => widthAt('road', p) * 2,
  );
  // Seeded asphalt grain avoids photographic perspective and repeats cleanly.
  c.save();
  path(c, track);
  c.lineWidth = CFG.road * 2;
  c.strokeStyle = '#424d50';
  for (let i = 0; i < 18000; i++) {
    const index = Math.floor(rand() * track.length),
      p = track[index],
      offset = (rand() - 0.5) * widthAt('road', index / track.length) * 1.96;
    c.fillStyle = i % 2 ? '#9ba8a017' : '#1823291c';
    c.fillRect(p.x + p.nx * offset, p.y + p.ny * offset, 1.2, 1.2);
  }
  c.restore();
  if (activeMap.id === 'rallycross') paintRallyRoad(c, rand);
  // Continue the pit asphalt across the main circuit's verge at both merges.
  paintPitConnections(c);
  if (urban) paintCityRoadMarkings(c);
  // Narrow edge dashes on the apron.
  for (const side of [-1, 1]) {
    path(c, track, (p) => (widthAt('runoff', p) - 10) * side);
    c.strokeStyle = '#d7d6b474';
    c.lineWidth = 2;
    c.setLineDash([12, 15]);
    c.stroke();
    c.setLineDash([]);
  }
  // Apex curbs only appear on the inside of meaningful bends.
  for (let i = 0; i < track.length; i++) {
    const p = track[i],
      q = track[(i + 1) % track.length],
      prev = track[(i - 5 + track.length) % track.length],
      next = track[(i + 5) % track.length];
    const turn = prev.tx * next.ty - prev.ty * next.tx;
    if (Math.abs(turn) < 0.12) continue;
    const side = turn > 0 ? 1 : -1;
    const wp = widthAt('road', i / track.length) + 4,
      wq = widthAt('road', ((i + 1) % track.length) / track.length) + 4;
    if (
      withinPitDistance(
        p.x + p.nx * wp * side,
        p.y + p.ny * wp * side,
        pitLane.road + 10,
      )
    )
      continue;
    c.beginPath();
    c.moveTo(p.x + p.nx * wp * side, p.y + p.ny * wp * side);
    c.lineTo(q.x + q.nx * wq * side, q.y + q.ny * wq * side);
    c.strokeStyle = urban
      ? '#d7dccb'
      : Math.floor(i / 2) % 2
        ? desert
          ? '#f9ddb0'
          : '#e3dfcd'
        : desert
          ? '#d98449'
          : alpine
            ? '#759fb3'
            : seaside
              ? '#54a7b9'
              : urban
                ? '#d8bd78'
                : '#d86f58';
    c.lineWidth = 14;
    c.lineCap = 'butt';
    c.stroke();
  }
  // Continuous rail follows the exact boundary used by collision detection.
  for (const side of [-1, 1]) {
    paintMainRail(
      c,
      side,
      urban ? '#7f8c82' : desert ? '#6e4235' : '#394d43',
      urban ? 9 : desert ? 15 : 11,
    );
    paintMainRail(
      c,
      side,
      urban ? '#d4d9cc' : desert ? '#b77750' : '#c5ccba',
      urban ? 5 : desert ? 9 : 6,
    );
    paintMainRail(c, side, desert ? '#f1ba80' : '#eceddb', 2);
    for (let i = 0; i < track.length; i += 4) {
      if (urban) break;
      const p = track[i],
        offset = widthAt('wall', i / track.length);
      if (
        withinPitDistance(
          p.x + p.nx * offset * side,
          p.y + p.ny * offset * side,
          pitLane.wall + 12,
        )
      )
        continue;
      c.fillStyle = desert ? '#84513a' : '#4b5b50';
      c.beginPath();
      c.arc(
        p.x + p.nx * offset * side,
        p.y + p.ny * offset * side,
        3,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
  }
  paintPitRails(c);
  if (amazon) paintAmazonFords(c);
  // Start/finish strip and grid boxes are painted on the road surface.
  const start = track[0],
    finishHalf = timingGateHalfWidth(0);
  c.save();
  c.translate(start.x, start.y);
  c.rotate(Math.atan2(start.ty, start.tx));
  if (urban) {
    c.strokeStyle = '#e7e7ce99';
    c.lineWidth = 3;
    c.setLineDash([10, 8]);
    c.beginPath();
    c.moveTo(0, -finishHalf);
    c.lineTo(0, finishHalf);
    c.stroke();
    c.setLineDash([]);
  } else
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 16; col++) {
        c.fillStyle = (row + col) % 2 ? '#eceddc' : '#253438';
        c.fillRect(
          row * 8 - 8,
          -finishHalf + col * (finishHalf / 8),
          8,
          finishHalf / 8,
        );
      }
  c.fillStyle = '#e5e9d2';
  c.font = '700 27px Barlow, sans-serif';
  c.textAlign = 'center';
  c.fillText(urban ? 'START' : 'START / FINISH', 0, -finishHalf - 24);
  c.restore();
  for (const slot of startingGrid) {
    c.save();
    c.translate(slot.x, slot.y);
    c.rotate(Math.atan2(slot.ty, slot.tx));
    c.strokeStyle = '#d8e4d278';
    c.lineWidth = 1.5;
    roundedRect(c, -26, -14, 52, 28, 4);
    c.stroke();
    c.restore();
  }
  paintPaddock(c);
  // Circuit lettering is on the grass, read from directly overhead.
  if (!urban) {
    c.save();
    c.translate(alpine ? -350 : -500, alpine ? 840 : -220);
    c.fillStyle = desert ? '#ffe0a77a' : alpine ? '#829ea77a' : '#d1ddba70';
    c.font = 'italic 900 92px Barlow Condensed, Impact, sans-serif';
    c.textAlign = 'center';
    c.fillText('APEX /', 0, 0);
    c.font = '600 14px Barlow, sans-serif';
    c.fillText(
      urban
        ? 'C I T Y   C I R C U I T'
        : seaside
          ? 'C O S T A   A Z U L'
          : desert
            ? 'D E S E R T   C A N Y O N'
            : alpine
              ? 'A L P I N E   P A S S'
              : amazon
                ? 'A M A Z O N A S'
                : activeMap.id === 'rallycross'
                  ? 'R I D G E W A Y   R X'
                  : 'J U N I P E R   R A C E W A Y',
      0,
      30,
    );
    c.restore();
  }
  if (seaside) paintCoastLandmarks(c);
  paintSceneryScene(c);
  // Direction arrows and numbered apex boards are flat markings.
  for (let i = 30; i < track.length; i += 65) {
    const p = track[i];
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.strokeStyle = '#e4e7ca25';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-13, -9);
    c.lineTo(0, 0);
    c.lineTo(-13, 9);
    c.stroke();
    c.restore();
  }
  // Braking references sit on the apron before the infield hairpin.
  const markers = desert
    ? [
        [275, '150'],
        [290, '100'],
        [305, '50'],
      ]
    : [
        [403, '150'],
        [418, '100'],
        [433, '50'],
      ];
  for (const [index, label] of markers) {
    const p = track[index];
    c.save();
    c.translate(
      p.x + p.nx * (widthAt('road', index / track.length) + 25),
      p.y + p.ny * (widthAt('road', index / track.length) + 25),
    );
    c.rotate(Math.atan2(p.ty, p.tx));
    c.fillStyle = '#e4e7cf';
    c.fillRect(-13, -9, 26, 18);
    c.fillStyle = '#263737';
    c.font = 'bold 11px Arial';
    c.textAlign = 'center';
    c.fillText(label, 0, 4);
    c.restore();
  }
  if (desert)
    for (const progress of [0.15, 0.52]) {
      const p = track[Math.floor(progress * track.length)];
      c.save();
      c.translate(p.x, p.y);
      c.rotate(Math.atan2(p.ty, p.tx));
      for (const side of [-1, 1]) {
        c.fillStyle = '#f5c472';
        c.fillRect(-18, side * (CFG.road + 27) - 9, 36, 18);
        c.fillStyle = '#5d4030';
        c.font = 'bold 10px Arial';
        c.textAlign = 'center';
        c.fillText('NARROW', 0, side * (CFG.road + 27) + 3);
      }
      c.restore();
    }
  if (alpine)
    for (const [index, label] of [
      [240, '01'],
      [560, '02'],
      [880, '03'],
    ]) {
      const p = track[index];
      c.save();
      c.translate(p.x + p.nx * (CFG.road + 23), p.y + p.ny * (CFG.road + 23));
      c.rotate(Math.atan2(p.ty, p.tx));
      c.fillStyle = '#dceff4';
      c.fillRect(-14, -10, 28, 20);
      c.fillStyle = '#355c72';
      c.font = 'bold 12px Arial';
      c.textAlign = 'center';
      c.fillText(label, 0, 4);
      c.restore();
    }
  for (let gate = 1; gate <= 3; gate++) {
    const p = track[Math.floor((track.length * gate) / 4)],
      half = timingGateHalfWidth(gate / 4);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.strokeStyle = activeMap.accent + '77';
    c.lineWidth = 2;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.moveTo(0, -half);
    c.lineTo(0, half);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = activeMap.accent;
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillText('S' + gate, 0, -half - 15);
    c.restore();
  }
  paintSurfacePatches(c);
}
function paintRallyRoad(c, rand) {
  c.lineCap = 'round';
  c.strokeStyle = '#a78660';
  c.lineWidth = CFG.road * 2 - 5;
  for (let i = 0; i < track.length; i++) {
    if (!dirtProgress(i / track.length)) continue;
    const p = track[i],
      q = track[(i + 1) % track.length];
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(q.x, q.y);
    c.stroke();
  }
  for (let i = 0; i < 16000; i++) {
    const index = Math.floor(rand() * track.length),
      p = track[index];
    if (!dirtProgress(index / track.length)) continue;
    const d = (rand() - 0.5) * (CFG.road * 2 - 9);
    c.fillStyle = i % 3 ? '#6e51353b' : '#e1bb8299';
    c.fillRect(p.x + p.nx * d, p.y + p.ny * d, 1 + rand() * 2, 1 + rand() * 2);
  }
  for (const offset of [-24, 24]) {
    c.strokeStyle = '#72553c45';
    c.lineWidth = 3;
    for (let i = 0; i < track.length; i++) {
      if (!dirtProgress(i / track.length)) continue;
      const p = track[i],
        q = track[(i + 1) % track.length];
      c.beginPath();
      c.moveTo(p.x + p.nx * offset, p.y + p.ny * offset);
      c.lineTo(q.x + q.nx * offset, q.y + q.ny * offset);
      c.stroke();
    }
  }
  for (const progress of [0.14, 0.36, 0.57, 0.79]) {
    const index = Math.floor(progress * track.length);
    for (let i = -5; i <= 5; i++) {
      const p = track[(index + i + track.length) % track.length];
      for (let j = 0; j < 55; j++) {
        const d = (rand() - 0.5) * (CFG.road * 2 - 8);
        c.fillStyle = '#bc986c70';
        c.fillRect(
          p.x + p.nx * d + (rand() - 0.5) * 12,
          p.y + p.ny * d + (rand() - 0.5) * 12,
          2,
          2,
        );
      }
    }
  }
}

function paintSurfacePatches(c) {
  c.save();
  c.beginPath();
  for (const side of [-1, 1]) {
    track.forEach((p, i) => {
      const d = widthAt('road', i / track.length) * side,
        x = p.x + p.nx * d,
        y = p.y + p.ny * d;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.closePath();
  }
  c.clip('evenodd');
  activeMap.patches.forEach((patch, index) => {
    const p = patchFrame(patch);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    paintPatch(c, patch, index);
    c.restore();
  });
  c.restore();
}
function paintPatch(c, patch, index = 0) {
  const rand = seededRandom(771 + index * 91),
    ice = patch.type === 'ICE',
    oil = patch.type === 'OIL',
    L = patch.length,
    W = patch.width;
  c.save();
  patchOutline(c, patch);
  c.clip();
  const gradient = c.createLinearGradient(-L, -W, L, W);
  gradient.addColorStop(0, ice ? '#94c9dfd9' : oil ? '#0b131bf5' : '#9f754bdf');
  gradient.addColorStop(
    0.45,
    ice ? '#d8f2f3ed' : oil ? '#161e29f5' : '#e6bf86f2',
  );
  gradient.addColorStop(1, ice ? '#69a4c6dc' : oil ? '#0e1720fa' : '#bb905edb');
  c.fillStyle = gradient;
  c.fillRect(-L * 1.15, -W * 1.15, L * 2.3, W * 2.3);
  if (oil) {
    const colors = [
      '#64b5ba55',
      '#8b88c966',
      '#c292bf55',
      '#bda76a48',
      '#6488be5f',
    ];
    c.globalCompositeOperation = 'screen';
    for (let k = 0; k < 10; k++) {
      const y = (k - 5) * W * 0.17;
      c.strokeStyle = colors[k % colors.length];
      c.lineWidth = 1.3 + (k % 3) * 0.65;
      c.beginPath();
      c.moveTo(-L, y);
      c.bezierCurveTo(
        -L * 0.4,
        y - W * 0.65,
        L * 0.05,
        y + W * 0.75,
        L * 0.6,
        y - W * 0.2,
      );
      c.bezierCurveTo(
        L * 0.9,
        y - W * 0.3,
        L * 0.75,
        y + W * 0.05,
        L,
        y + W * 0.2,
      );
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#c5e1f367';
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(-L * 0.7, -W * 0.32);
    c.bezierCurveTo(
      -L * 0.25,
      -W * 0.7,
      L * 0.05,
      -W * 0.1,
      L * 0.32,
      -W * 0.45,
    );
    c.stroke();
    for (let k = 0; k < 30; k++) {
      c.fillStyle = k % 3 ? '#e4efff12' : '#060f1f4a';
      c.beginPath();
      c.ellipse(
        (rand() - 0.5) * L * 1.8,
        (rand() - 0.5) * W * 1.8,
        rand() * 3 + 0.5,
        rand() * 1.5 + 0.5,
        rand() * 6.28,
        0,
        6.28,
      );
      c.fill();
    }
  } else if (ice) {
    for (let k = 0; k < 24; k++) {
      const x = (rand() - 0.5) * L * 2,
        y = (rand() - 0.5) * W * 2;
      c.fillStyle = k % 2 ? '#f5ffff35' : '#2d77a423';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rand() - 0.3) * 40, y + (rand() - 0.7) * 30);
      c.lineTo(x + (rand() - 0.6) * 35, y + (rand() - 0.4) * 30);
      c.closePath();
      c.fill();
    }
    for (let k = 0; k < 11; k++) {
      const x = (rand() - 0.5) * L * 1.8,
        y = (rand() - 0.5) * W * 1.6;
      c.strokeStyle = k % 3 ? '#f6ffffa0' : '#32749c65';
      c.lineWidth = k % 3 ? 0.75 : 1.3;
      c.beginPath();
      c.moveTo(x - 20, y - 9);
      c.lineTo(x - 6, y - 3);
      c.lineTo(x, y + 7);
      c.lineTo(x + 15, y + 2);
      c.lineTo(x + 28, y + 9);
      c.moveTo(x, y + 7);
      c.lineTo(x + 2, y + 18);
      c.lineTo(x - 8, y + 24);
      c.stroke();
    }
    c.fillStyle = '#fffefeb0';
    for (let k = 0; k < 90; k++) {
      const a = rand() * 6.28,
        r = 0.78 + rand() * 0.26;
      c.beginPath();
      c.arc(
        Math.cos(a) * L * r,
        Math.sin(a) * W * r,
        0.4 + rand() * 1.3,
        0,
        6.28,
      );
      c.fill();
    }
  } else {
    for (let k = 0; k < 1050; k++) {
      const size = 0.4 + rand() * 1.5;
      c.fillStyle = k % 3 ? '#79502e55' : '#ffe7b9aa';
      c.fillRect(
        (rand() - 0.5) * L * 2.2,
        (rand() - 0.5) * W * 2.2,
        size,
        size,
      );
    }
    for (let k = -6; k <= 6; k++) {
      const y = k * W * 0.15;
      c.lineWidth = 1.2;
      c.strokeStyle = '#805b3747';
      c.beginPath();
      c.moveTo(-L, y);
      c.bezierCurveTo(-L * 0.5, y - 8, L * 0.3, y + 10, L, y - 5);
      c.stroke();
      c.strokeStyle = '#ffe6b985';
      c.beginPath();
      c.moveTo(-L, y + 2);
      c.bezierCurveTo(-L * 0.5, y - 6, L * 0.3, y + 12, L, y - 3);
      c.stroke();
    }
    for (const y of [-11, 11]) {
      c.strokeStyle = '#8c633c55';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(-L, y);
      c.bezierCurveTo(-L * 0.3, y - 4, L * 0.3, y + 4, L, y);
      c.stroke();
      c.strokeStyle = '#e7c39170';
      c.lineWidth = 1;
      c.stroke();
    }
    for (let k = 0; k < 18; k++) {
      const x = (rand() - 0.5) * L * 1.8,
        y = (rand() - 0.5) * W * 1.7;
      c.fillStyle = '#8e6543';
      c.beginPath();
      c.ellipse(x, y, 1.1 + rand() * 1.5, 0.7 + rand(), rand() * 6.28, 0, 6.28);
      c.fill();
    }
  }
  c.restore();
  patchOutline(c, patch);
  c.strokeStyle = ice ? '#e9ffffa0' : oil ? '#91a3bd3b' : '#e9cc9855';
  c.lineWidth = ice ? 1.4 : 1;
  c.stroke();
}
function paintAlpineRidges(c, rand, w, h) {
  for (let i = 0; i < 100; i++) {
    const x = worldBounds.x + rand() * w,
      y = worldBounds.y + rand() * h,
      r = 65 + rand() * 165;
    if (nearest(x, y).distance < CFG.wall + r + 40) continue;
    c.save();
    c.translate(x, y);
    c.rotate(rand() * 6.28);
    for (const [scale, color] of [
      [1, '#a4b6b8'],
      [0.88, '#c1cfcf'],
      [0.67, '#edf3ed'],
      [0.43, '#d5e2df'],
    ]) {
      c.fillStyle = color;
      c.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * 6.28,
          radius = r * (j % 2 ? 0.76 : 1) * scale;
        j
          ? c.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
          : c.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  // Continuous overhead ridge contours sit between successive road traverses.
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const y of [830, 35, -800])
    for (const [width, color] of [
      [180, '#9dafb2'],
      [148, '#bccdcd'],
      [110, '#e7eeea'],
      [60, '#d4e1de'],
    ]) {
      c.beginPath();
      c.moveTo(-850, y);
      c.bezierCurveTo(-380, y - 110, 310, y + 120, 860, y - 30);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke();
    }
}
function paintAlpineProp(c, x, y, size, rand) {
  if (
    sceneryAssetState.ready &&
    drawSceneryAsset(
      c,
      rand() < 0.87 ? 'tree-pine-snow' : 'tree-pine',
      x,
      y,
      size * 1.1,
      size * 1.1,
      rand() * Math.PI * 2,
    )
  )
    return;
  c.save();
  c.translate(x, y);
  c.rotate(rand() * 6.28);
  c.fillStyle = '#829da833';
  c.beginPath();
  c.arc(3, 4, size * 0.45, 0, 6.28);
  c.fill();
  if (rand() < 0.8) {
    for (const [scale, color] of [
      [1, '#486e62'],
      [0.78, '#dcebe0'],
      [0.5, '#fafbf2'],
    ]) {
      c.fillStyle = color;
      c.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 6.28,
          r = size * (k % 2 ? 0.24 : 0.48) * scale;
        k
          ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    }
  } else {
    c.fillStyle = '#879da1';
    c.beginPath();
    c.ellipse(0, 0, size * 0.4, size * 0.28, 0.2, 0, 6.28);
    c.fill();
    c.fillStyle = '#f1f5ed';
    c.beginPath();
    c.ellipse(-3, -3, size * 0.3, size * 0.2, 0.2, 0, 6.28);
    c.fill();
  }
  c.restore();
}

function paintCanyonMesas(c, rand, w, h) {
  for (let i = 0; i < 190; i++) {
    const x = worldBounds.x + rand() * w,
      y = worldBounds.y + rand() * h,
      r = 70 + rand() * 175;
    if (nearest(x, y).distance < CFG.wall + r + 35) continue;
    const vertices = Array.from({ length: 9 }, (_, j) => {
      const angle = (j / 9) * Math.PI * 2;
      return {
        x: Math.cos(angle) * r * (0.8 + rand() * 0.25),
        y: Math.sin(angle) * r * (0.7 + rand() * 0.3),
      };
    });
    c.save();
    c.translate(x, y);
    c.rotate(rand() * 6.28);
    for (const [scale, color] of [
      [1.08, '#86503b2b'],
      [1, '#a46148'],
      [0.9, '#d39062'],
      [0.76, '#b97250'],
      [0.69, '#e1a16d'],
      [0.52, '#c48057'],
    ]) {
      c.beginPath();
      vertices.forEach((p, j) =>
        j
          ? c.lineTo(p.x * scale, p.y * scale)
          : c.moveTo(p.x * scale, p.y * scale),
      );
      c.closePath();
      c.fillStyle = color;
      c.fill();
    }
    c.strokeStyle = '#9f62443f';
    c.lineWidth = 2;
    for (let j = 0; j < 4; j++) {
      c.beginPath();
      c.moveTo(-r * 0.25, -r * 0.25 + j * r * 0.15);
      c.bezierCurveTo(
        0,
        -r * 0.4 + j * r * 0.15,
        r * 0.2,
        -r * 0.15 + j * r * 0.15,
        r * 0.32,
        -r * 0.22 + j * r * 0.15,
      );
      c.stroke();
    }
    c.restore();
  }
}
function paintDesertProp(c, x, y, size, rand) {
  if (
    sceneryAssetState.ready &&
    rand() < 0.46 &&
    drawSceneryAsset(
      c,
      rand() < 0.65 ? 'tree-cactus' : 'tree-acacia',
      x,
      y,
      size * 1.1,
      size * 1.1,
      rand() * Math.PI * 2,
    )
  )
    return;
  c.save();
  c.translate(x, y);
  c.rotate(rand() * 6.28);
  if (rand() < 0.6) {
    c.fillStyle = '#754f3728';
    c.beginPath();
    c.ellipse(3, 4, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#a66349';
    c.beginPath();
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * 6.28,
        r = size * (0.28 + rand() * 0.1);
      j
        ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.strokeStyle = '#e7ad77';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#c68558';
    c.beginPath();
    c.ellipse(-2, -2, size * 0.22, size * 0.15, 0.4, 0, 6.28);
    c.fill();
  } else {
    // Cactus seen from above: radial crowns and ribs, with no side-view trunk.
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * 6.28,
        px = Math.cos(a) * size * 0.15,
        py = Math.sin(a) * size * 0.15;
      c.fillStyle = '#526b48';
      c.beginPath();
      c.arc(px, py, size * 0.16, 0, 6.28);
      c.fill();
      c.strokeStyle = '#8ca26a';
      c.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const b = (k / 5) * 6.28;
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(
          px + Math.cos(b) * size * 0.12,
          py + Math.sin(b) * size * 0.12,
        );
        c.stroke();
      }
    }
  }
  c.restore();
}

function formatTime(t) {
  if (t === null) return '— — : — —';
  const ms = Math.floor(t * 1000),
    minutes = Math.floor(ms / 60000),
    seconds = Math.floor(ms / 1000) % 60;
  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(ms % 1000).padStart(3, '0')
  );
}
function formatSector(t) {
  return Number.isFinite(t) ? t.toFixed(3) + 's' : '—';
}
function formatDelta(t) {
  return Number.isFinite(t)
    ? (t < 0 ? '−' : '+') + Math.abs(t).toFixed(3) + 's'
    : '—';
}
function drawPatchHighlights(c, time) {
  for (const patch of activeMap.patches) {
    if (patch.type !== 'ICE' && patch.type !== 'OIL') continue;
    const p = patchFrame(patch);
    if (
      Math.abs(p.x - camera.x) > width / camera.zoom ||
      Math.abs(p.y - camera.y) > height / camera.zoom
    )
      continue;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.globalAlpha = 0.12 + 0.08 * Math.sin(time * 1.2 + patch.progress * 30);
    c.strokeStyle = patch.type === 'ICE' ? '#ffffff' : '#b3dff5';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = patch.length * (i - 0.9) * 0.4,
        y = Math.sin(i * 4 + patch.progress * 10) * patch.width * 0.35;
      c.beginPath();
      c.moveTo(x - 3, y);
      c.lineTo(x + 3, y);
      c.moveTo(x, y - 3);
      c.lineTo(x, y + 3);
      c.stroke();
    }
    c.restore();
  }
}
function playImpact(strength) {
  if (!soundEnabled || !audioCtx || !audioLayers) return;
  const source = audioCtx.createBufferSource(),
    gain = audioCtx.createGain(),
    filter = audioCtx.createBiquadFilter();
  source.buffer = audioLayers.buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  gain.gain.setValueAtTime(
    Math.min(0.12, strength * 0.1),
    audioCtx.currentTime,
  );
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.13);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start();
  source.stop(audioCtx.currentTime + 0.14);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}
function updateHUD() {
  const speed = Math.hypot(car.vx, car.vy),
    signed = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle),
    kmh = Math.round(speed * 0.46);
  $('speed').textContent = kmh;
  $('gear').textContent =
    speed < 5
      ? 'N'
      : signed < 0
        ? 'R'
        : Math.min(
            activeCar.id === 'formula' ? 8 : 5,
            1 + Math.floor(kmh / (activeCar.id === 'formula' ? 42 : 36)),
          );
  $('rpm').style.width =
    Math.min(
      100,
      (kmh /
        (activeCar.id === 'formula'
          ? 340
          : activeCar.id === 'drift'
            ? 190
            : activeCar.id === 'muscle'
              ? 220
              : 170)) *
        100,
    ) + '%';
  $('throttle').style.width = car.throttle * 100 + '%';
  $('brake').style.width = car.brake * 100 + '%';
  $('clock').textContent = formatTime(race.time);
  $('best').textContent = formatTime(race.best);
  $('last').textContent = formatTime(race.last);
  $('lap').textContent = String(race.lap).padStart(2, '0');
  const surfaceLabel =
    car.slickTime > 0 && car.surface !== 'OIL'
      ? 'OILY TIRES'
      : car.slip > 35 && car.surface === 'ASPHALT'
        ? 'SLIDING'
        : car.surface;
  $('surface').textContent = '●  ' + surfaceLabel;
  $('surface').style.color =
    car.surface === 'ICE'
      ? '#c0f0ff'
      : car.slickTime > 0
        ? '#c8b7ed'
        : car.surface.startsWith('SAND')
          ? '#ffd49a'
          : car.surface === 'SNOW'
            ? '#e0f4ff'
            : car.surface === 'GRAVEL'
              ? '#e9c795'
              : car.surface === 'GRASS'
                ? '#b5d686'
                : activeMap.accent;
  $('clock').style.color = race.invalid ? '#e7a083' : '';
  [...$('sector').children].forEach((el, i) =>
    el.classList.toggle('passed', i < race.next - 1),
  );
  const status =
    car.surface === 'PIT LANE'
      ? activeMap.id === 'city'
        ? 'SERVICE ROAD'
        : 'PIT LANE · PADDOCK ACCESS'
      : car.surface === 'FORD'
        ? 'RIVER FORD · SHALLOW WATER'
        : car.coconutSlip > 0
          ? 'COCONUT HIT · HOLD YOUR LINE'
          : car.surface === 'ICE'
            ? 'ICE · LOW GRIP'
            : car.slickTime > 0
              ? 'OIL · GRIP RECOVERING'
              : car.surface === 'DIRT'
                ? 'DIRT · LOOSE SURFACE'
                : car.surface.startsWith('SAND')
                  ? 'SAND · LOSING SPEED'
                  : car.slip > 35
                    ? 'SLIDING · COUNTERSTEER'
                    : car.brake && speed > 40
                      ? 'BRAKING'
                      : car.surface +
                        ' · ' +
                        (race.started ? 'ON TRACK' : 'READY');
  $('grip-status').textContent = status;
  $('grip-status').style.color = $('surface').style.color;
  const delta =
    race.invalid || timing.flashTime <= 0 ? null : timing.flashDelta;
  $('lap-delta').textContent = race.invalid
    ? 'INVALID LAP'
    : formatDelta(delta);
  $('lap-delta').style.color =
    delta === null ? '#9eb0a4' : delta <= 0 ? '#d5f578' : '#f0a28a';
  for (let i = 0; i < 4; i++) {
    const running = race.started && i === race.next - 1,
      value =
        timing.splits[i] ??
        (running
          ? Math.max(0, race.time - timing.sectorStart)
          : (timing.best[i] ?? timing.last[i] ?? null)),
      difference =
        timing.splits[i] !== undefined && timing.best[i] !== undefined
          ? timing.splits[i] - timing.best[i]
          : null;
    $('sector-time-' + i).textContent =
      value === null ? '—' : formatSector(value);
    $('sector-time-' + i).style.color = running ? activeMap.accent : '#e5ede2';
    $('sector-diff-' + i).textContent =
      difference !== null
        ? formatDelta(difference)
        : running
          ? 'RUNNING'
          : timing.best[i] !== undefined
            ? 'PERSONAL BEST'
            : '';
    $('sector-diff-' + i).style.color =
      difference === null ? '#8fa697' : difference <= 0 ? '#d5f578' : '#efa18b';
  }
  $('split-flash').textContent =
    timing.flashTime > 0
      ? timing.flashLabel +
        (timing.flashDelta !== null
          ? ' / ' + formatDelta(timing.flashDelta)
          : '')
      : '';
  $('ghost-status').textContent = ghostStatus();
  const ghostDelta = liveGhostDelta();
  $('ghost-delta').textContent = formatDelta(ghostDelta);
  $('ghost-delta').style.color =
    ghostDelta === null ? '#9eb0a4' : ghostDelta <= 0 ? '#d5f578' : '#f0a28a';
  $('start-countdown').textContent =
    race.countdown > 0
      ? String(Math.ceil(race.countdown))
      : race.goTime > 0
        ? 'GO!'
        : '';
  $('sector-status').textContent = timing.best.length
    ? 'Comparing with your best lap sectors.'
    : 'Complete a clean lap to set sector references.';
}

function buildMinimapLayer() {
  const layer = document.createElement('canvas');
  layer.width = 320;
  layer.height = 266;
  const c = layer.getContext('2d'),
    b = pitLane.bounds,
    scale = Math.min(280 / (b.right - b.left), 225 / (b.bottom - b.top));
  c.save();
  c.translate(160, 132);
  c.scale(scale, scale);
  c.translate(-(b.left + b.right) / 2, -(b.top + b.bottom) / 2);
  if (activeMap.id === 'coast') {
    c.save();
    c.globalAlpha = 0.3;
    path(c, coast.shore);
    c.fillStyle = '#c8c99c';
    c.fill();
    c.restore();
  }
  if (activeMap.id === 'amazonas') paintAmazonRiver(c, false);
  path(c, pitLane.points, 0, false);
  c.strokeStyle = '#c2b98c';
  c.lineWidth = 2 / scale;
  c.stroke();
  ribbon(c, '#536258', 9 / scale);
  ribbon(c, '#abbca2', 3 / scale);
  if (activeMap.id === 'amazonas') {
    c.save();
    c.globalAlpha = 0.75;
    paintAmazonRiver(c, false);
    c.restore();
  }
  const p = track[0];
  c.save();
  c.translate(p.x, p.y);
  c.rotate(Math.atan2(p.ty, p.tx));
  c.fillStyle = activeMap.accent;
  c.fillRect(-1 / scale, -5 / scale, 2 / scale, 10 / scale);
  c.restore();
  c.restore();
  minimapLayer = layer;
  minimapLayout = {
    scale,
    x: (b.left + b.right) / 2,
    y: (b.top + b.bottom) / 2,
  };
}
function drawMinimap() {
  if (!mapCtx) return;
  if (!minimapLayer) buildMinimapLayer();
  const c = mapCtx,
    { scale, x, y } = minimapLayout;
  c.clearRect(0, 0, 320, 266);
  c.drawImage(minimapLayer, 0, 0);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.translate(160, 132);
  c.scale(scale, scale);
  c.translate(-x, -y);
  const ghost = visibleGhostPose();
  if (ghost) {
    c.save();
    c.translate(ghost.x, ghost.y);
    c.fillStyle = '#91e1ff';
    c.strokeStyle = '#e4faff';
    c.lineWidth = 1 / scale;
    c.beginPath();
    c.arc(0, 0, 4 / scale, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(car.x, car.y);
  c.rotate(car.angle);
  c.scale(1 / scale, 1 / scale);
  c.fillStyle = activeMap.accent;
  c.beginPath();
  c.moveTo(5, 0);
  c.lineTo(-3.5, -3.5);
  c.lineTo(-2, 0);
  c.lineTo(-3.5, 3.5);
  c.closePath();
  c.fill();
  c.restore();
  c.restore();
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  if (soundEnabled && !audioCtx) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      soundEnabled = false;
      notify('Audio is unavailable in this browser');
      return;
    }
    audioCtx = new Audio();
    engine = audioCtx.createOscillator();
    engine.type = 'sawtooth';
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    engineGain = audioCtx.createGain();
    engineGain.gain.value = 0.025;
    engine.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engine.start();
  }
  if (audioCtx && !audioLayers) createFeedbackAudio();
  if (audioCtx && soundEnabled) audioCtx.resume();
  $('sound').textContent = soundEnabled ? '♪ Sound on' : '♪ Sound off';
  $('sound').classList.toggle('sound-on', soundEnabled);
  $('sound').setAttribute('aria-pressed', String(soundEnabled));
  updateAudio();
}
function createFeedbackAudio() {
  const buffer = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate,
      audioCtx.sampleRate,
    ),
    samples = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = (previous + (Math.random() * 2 - 1) * 0.11) / 1.04;
    samples[i] = previous * 3;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const tireFilter = audioCtx.createBiquadFilter(),
    looseFilter = audioCtx.createBiquadFilter(),
    tireGain = audioCtx.createGain(),
    looseGain = audioCtx.createGain(),
    rumbleGain = audioCtx.createGain(),
    rumble = audioCtx.createOscillator();
  tireFilter.type = 'bandpass';
  tireFilter.frequency.value = 1600;
  tireFilter.Q.value = 0.7;
  looseFilter.type = 'lowpass';
  looseFilter.frequency.value = 550;
  for (const gain of [tireGain, looseGain, rumbleGain]) {
    gain.gain.value = 0;
    gain.connect(audioCtx.destination);
  }
  source.connect(tireFilter);
  source.connect(looseFilter);
  tireFilter.connect(tireGain);
  looseFilter.connect(looseGain);
  rumble.type = 'triangle';
  rumble.frequency.value = 65;
  rumble.connect(rumbleGain);
  source.start();
  rumble.start();
  audioLayers = {
    buffer,
    tireGain,
    looseGain,
    rumbleGain,
    looseFilter,
    tireFilter,
  };
}
function updateAudio() {
  if (!engine) return;
  const speed = Math.hypot(car.vx, car.vy),
    enabled = soundEnabled && !paused,
    t = audioCtx.currentTime;
  engine.frequency.setTargetAtTime(
    35 + speed * 0.26 + car.throttle * 13,
    t,
    0.08,
  );
  engineGain.gain.setTargetAtTime(
    enabled ? 0.018 + car.throttle * 0.014 : 0,
    t,
    0.08,
  );
  if (!audioLayers) return;
  const loose = [
      'DIRT',
      'GRAVEL',
      'SAND',
      'SAND PATCH',
      'GRASS',
      'SNOW',
      'ICE',
    ].includes(car.surface),
    velocity = clamp(speed / 230, 0, 1),
    slide = clamp((car.slip - 17) / 95, 0, 1);
  audioLayers.tireGain.gain.setTargetAtTime(
    enabled && !loose ? slide * velocity * 0.065 : 0,
    t,
    0.07,
  );
  audioLayers.looseGain.gain.setTargetAtTime(
    enabled && loose ? velocity * (car.surface === 'ICE' ? 0.018 : 0.055) : 0,
    t,
    0.07,
  );
  audioLayers.rumbleGain.gain.setTargetAtTime(
    enabled ? feedback.rumble * 0.025 : 0,
    t,
    0.04,
  );
  audioLayers.looseFilter.frequency.setTargetAtTime(
    car.surface === 'ICE'
      ? 1800
      : car.surface === 'GRAVEL' || car.surface === 'DIRT'
        ? 950
        : 420,
    t,
    0.1,
  );
  audioLayers.tireFilter.frequency.setTargetAtTime(1000 + slide * 1300, t, 0.1);
}
