import { MAPS, VEHICLES } from './config.js';
import { seededRandom } from './math.js';

// Values that can be replaced live on state; shared objects below retain their identity.
export const state = {
  BEST_KEY: 'apex-juniper-corner-oil-v6',
  activeCar: VEHICLES.clubsport,
  paint: 'red',
  pickerMode: 'tracks',
  pendingTrack: 'juniper',
  pendingCar: 'clubsport',
  pendingPaint: 'red',
  pickerWasPaused: false,
  activeMap: MAPS.juniper,
  controlPoints: MAPS.juniper.points,
  skidClock: 0,
  lastSkid: [null, null],
  selectedStart: 0,
  audioLayers: null,
  accumulator: 0,
  paused: false,
  toastTimer: 0,
  movingTime: 0,
  worldCanvas: undefined,
  worldCtx: undefined,
  ctx: undefined,
  lastHUD: 0,
  carArt: undefined,
  audioCtx: undefined,
  engine: undefined,
  engineGain: undefined,
  soundEnabled: false,
  mapCtx: undefined,
  trackBounds: undefined,
  worldBounds: undefined,
  paddock: undefined,
  minimapLayer: null,
  minimapLayout: null,
};

export const track = [];

export const keys = new Set();

export const skidmarks = [];

export const particles = [];

export const spatial = {
  size: 240,
  cells: new Map(),
  visited: new Uint32Array(0),
  stamp: 0,
};

export const skidBatches = Array.from({ length: 12 }, () => []);

export const car = {
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

export const jungle = { cooldown: 0, throwTime: 0, flowTime: 0, coconuts: [] };

export const lapGhost = { best: null, frames: [], cursor: 0, previous: null };

export const startingGrid = [];

export const camera = { x: 0, y: 0, zoom: 1 };

export const race = {
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

export const timing = {
  splits: [],
  best: [],
  last: [],
  sectorStart: 0,
  delta: null,
  flashTime: 0,
  flashLabel: '',
  flashDelta: null,
};

export const feedback = { impact: 0, impactCooldown: 0, rumble: 0 };

export const cityTraffic = { cars: [], wait: 4, random: seededRandom(927) };

export const trafficArt = {};

export const pitLane = {
  points: [],
  road: 36,
  runoff: 44,
  wall: 52,
  entry: 0,
  exit: 0,
  totalLength: 0,
};

export const sceneryArt = Object.create(null);

export const sceneryAssetState = { ready: false, failed: [], promise: null };

export const sceneryDetails = [];

export const sceneryBuildings = [];

export const sceneryTrees = [];

export const sceneryScene = [];
