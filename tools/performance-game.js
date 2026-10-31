// Profiling only: no hooks or controls are installed in the shipped game.
import { CFG, MAPS } from '../src/config.js';
import { seededRandom } from '../src/math.js';
import { resetOpponentRace } from '../src/opponents.js';
import { simulate } from '../src/physics.js';
import { draw } from '../src/renderer.js';
import { changeTrack } from '../src/runtime.js';
import {
  camera,
  car,
  keys,
  opponentRace,
  particles,
  race,
  skidmarks,
  state,
  track,
} from '../src/state.js';
import { nearestDriving, pointOnTrack } from '../src/tracks.js';

export function distribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction) =>
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ];
  return {
    samples: values.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted.at(-1),
  };
}

const nextFrame = () => new Promise(requestAnimationFrame);

export async function runPerformanceCheck({ frames = 240, warmup = 30 } = {}) {
  if (!Number.isInteger(frames) || frames < 60 || frames > 3600)
    throw new Error('frames must be an integer from 60 to 3600');
  if (!Number.isInteger(warmup) || warmup < 0 || warmup > 600)
    throw new Error('warmup must be an integer from 0 to 600');
  const deadline = performance.now() + 30_000;
  while (!state.mapCtx) {
    if (performance.now() > deadline)
      throw new Error('Game initialization timed out');
    await nextFrame();
  }
  window.noLoop();
  // Menu versions may have an open dialog; the tool owns this disposable page.
  for (const dialog of document.querySelectorAll('dialog[open]'))
    dialog.close();
  keys.clear();
  const results = [];
  for (const map of Object.keys(MAPS)) {
    for (const scenario of [
      'route',
      'skids',
      ...(map === 'juniper' ? ['ai'] : []),
    ]) {
      console.info(`Benchmark: ${map}/${scenario}`);
      opponentRace.enabled = scenario === 'ai';
      Math.random = seededRandom(720);
      const loadStart = performance.now();
      changeTrack(map, false);
      window.noLoop();
      // Include completion of queued world raster work, not just canvas submission.
      state.worldCtx.getImageData(0, 0, 1, 1);
      const loadMs = performance.now() - loadStart;
      resetOpponentRace();
      state.paused = false;
      race.countdown = 0;
      race.goTime = 0;
      particles.length = 0;
      skidmarks.length = 0;
      if (scenario === 'skids') {
        for (let i = 0; i < 4200; i++) {
          const p = pointOnTrack((i / 4200) * track.totalLength);
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
      }
      const random = seededRandom(720);
      const queries = Array.from({ length: 3000 }, () => {
        const p = pointOnTrack(random() * track.totalLength);
        return { x: p.x + p.nx * (random() - 0.5) * CFG.road, y: p.y };
      });
      const lookupStart = performance.now();
      for (const p of queries) nearestDriving(p.x, p.y);
      const lookupMs = (performance.now() - lookupStart) / queries.length;
      const simulation = [],
        render = [],
        intervals = [];
      let previous;
      const aiStart = opponentRace.elapsed;
      keys.add('KeyW');
      for (let frame = -warmup; frame < frames; frame++) {
        const timestamp = await nextFrame();
        // Sweep the complete route deterministically. This is a coverage workload,
        // not an autonomous clean lap: physics runs normally between placements.
        const p = pointOnTrack(
          ((frame + warmup) / (frames + warmup)) * track.totalLength,
        );
        Object.assign(car, {
          x: p.x,
          y: p.y,
          vx: p.tx * 220,
          vy: p.ty * 220,
          angle: Math.atan2(p.ty, p.tx),
          yaw: 0,
        });
        Object.assign(camera, { x: p.x, y: p.y, zoom: 0.9 });
        const start = performance.now();
        simulate(CFG.step);
        simulate(CFG.step);
        const simulated = performance.now();
        window.deltaTime = 0;
        state.accumulator = 0;
        draw();
        const rendered = performance.now();
        if (frame >= 0) {
          simulation.push(simulated - start);
          render.push(rendered - simulated);
          if (previous !== undefined) intervals.push(timestamp - previous);
        }
        previous = timestamp;
        if (![car.x, car.y, car.vx, car.vy].every(Number.isFinite))
          throw new Error(`${map}/${scenario}: non-finite physics state`);
      }
      keys.clear();
      const aiElapsed = opponentRace.elapsed - aiStart;
      if (
        scenario === 'ai' &&
        (opponentRace.cars.length !== 3 || aiElapsed <= 0)
      )
        throw new Error('AI workload did not advance three opponents');
      results.push({
        map,
        scenario,
        loadMs,
        lookupMs,
        physicsTwoStepsMs: distribution(simulation),
        renderSubmitMs: distribution(render),
        rafIntervalMs: distribution(intervals),
        physicsSteps: (frames + warmup) * 2,
        opponents: opponentRace.cars.length,
        aiElapsed,
        worldPixels: state.worldCanvas.width * state.worldCanvas.height,
        canvas: {
          width: window.width,
          height: window.height,
          density: window.pixelDensity(),
        },
      });
    }
  }
  state.paused = true;
  return { frames, warmup, step: CFG.step, results };
}
