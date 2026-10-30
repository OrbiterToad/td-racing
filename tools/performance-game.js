import { coastShoreFrame } from '../src/coast.js';
import { CFG } from '../src/config.js';
import { amazonRiverFrame } from '../src/jungle.js';
import { seededRandom } from '../src/math.js';
import { drawMinimap } from '../src/minimap.js';
import { simulate } from '../src/physics.js';
import { draw } from '../src/renderer.js';
import {
  camera,
  car,
  cityTraffic,
  feedback,
  keys,
  particles,
  pitLane,
  race,
  skidmarks,
  state,
  track,
} from '../src/state.js';
import { configureTrack, nearestDriving } from '../src/tracks.js';
import { buildWorld } from '../src/world.js';

async function runPerformanceCheck() {
  for (let i = 0; i < 200 && !state.worldCanvas; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!state.worldCanvas) throw new Error('The game did not initialize');
  window.noLoop();
  state.paused = true;
  await new Promise((resolve) => setTimeout(resolve, 300));

  function median(values) {
    return values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  }
  function measure(fn, count, flush) {
    fn(0);
    fn(1);
    const times = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      const start = performance.now();
      for (let i = 0; i < count; i++) fn(i);
      if (flush) flush();
      times.push((performance.now() - start) / count);
    }
    return median(times);
  }
  const results = [];
  keys.clear();
  particles.length = 0;
  for (const id of ['juniper', 'amazonas', 'coast', 'city']) {
    const start = performance.now();
    configureTrack(id);
    const geometryMs = performance.now() - start,
      worldStart = performance.now();
    buildWorld();
    const worldMs = performance.now() - worldStart;
    const rand = seededRandom(720),
      queries = Array.from({ length: 3000 }, (_, i) => {
        const p =
            i % 5 === 0
              ? pitLane.points[Math.floor(rand() * pitLane.points.length)]
              : track[Math.floor(rand() * track.length)],
          offset = (rand() - 0.5) * CFG.road;
        return { x: p.x + p.nx * offset, y: p.y + p.ny * offset };
      });
    const lookupMs = measure((i) => {
      const p = queries[i % queries.length];
      nearestDriving(p.x, p.y);
    }, queries.length);
    const minimapMs = measure(
      () => drawMinimap(),
      120,
      () => state.mapCtx.getImageData(0, 0, 1, 1),
    );
    const geographicMs =
      id === 'amazonas'
        ? measure((i) => {
            const p = queries[i % queries.length];
            amazonRiverFrame(p.x, p.y);
          }, 3000)
        : id === 'coast'
          ? measure((i) => {
              const p = queries[i % queries.length];
              coastShoreFrame(p.x, p.y);
            }, 3000)
          : null;
    skidmarks.length = 0;
    for (let i = 0; i < 4200; i++) {
      const p = track[i % track.length];
      skidmarks.push({
        x: p.x,
        y: p.y,
        px: p.x - 4,
        py: p.y - 2,
        life: 1000,
        alpha: 0.4,
        loose: false,
      });
    }
    race.started = false;
    race.invalid = true;
    race.countdown = 0;
    race.goTime = 0;
    cityTraffic.cars.length = 0;
    cityTraffic.wait = 1e9;
    const simulationMs = measure((i) => {
      const p = track[i % track.length];
      Object.assign(car, {
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        angle: Math.atan2(p.ty, p.tx),
        yaw: 0,
      });
      simulate(CFG.step);
    }, 1200);
    const center = track[Math.floor(track.length * 0.4)];
    Object.assign(car, { x: center.x, y: center.y, vx: 0, vy: 0 });
    camera.x = car.x;
    camera.y = car.y;
    camera.zoom = 0.9;
    state.paused = true;
    window.deltaTime = 0;
    state.accumulator = 0;
    feedback.impact = 0;
    const frameMs = measure(
      () => draw(),
      45,
      () => state.ctx.getImageData(0, 0, 1, 1),
    );
    results.push({
      map: id,
      geometryMs,
      worldMs,
      lookupMs,
      minimapMs,
      geographicMs,
      simulationMs,
      frameMs,
      worldPixels: state.worldCanvas.width * state.worldCanvas.height,
    });
  }
  return results;
}

try {
  const benchmark = await runPerformanceCheck();
  parent.postMessage(
    {
      type: 'apex-performance',
      ok: true,
      benchmark,
      userAgent: navigator.userAgent,
    },
    parent.location.origin,
  );
} catch (error) {
  parent.postMessage(
    { type: 'apex-performance', ok: false, error: error.stack },
    parent.location.origin,
  );
}
