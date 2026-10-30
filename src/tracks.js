import { bestKeyFor } from './cars.js';
import { coast, coastLandDistance } from './coast.js';
import { CFG, MAPS } from './config.js';
import { resetGhostRecording } from './ghost.js';
import {
  amazonRiverDistance,
  amazonRiverFrame,
  amazonRiverScale,
} from './jungle.js';
import { clamp, lerpTo } from './math.js';
import { buildStartingGrid } from './race.js';
import { buildSceneryDetails } from './scenery.js';
import {
  car,
  jungle,
  lapGhost,
  pitLane,
  race,
  spatial,
  state,
  track,
} from './state.js';
import { resetCityTraffic } from './traffic.js';

export function narrowFactor(progress) {
  if (state.activeMap.id !== 'canyon') return 1;
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

export function widthAt(kind, progress) {
  return CFG[kind] * narrowFactor(progress);
}

export function timingGateHalfWidth(progress) {
  return widthAt('wall', progress) - 6;
}

export function configureTrack(id) {
  if (!Object.hasOwn(MAPS, id)) return false;
  state.activeMap = MAPS[id];
  state.controlPoints = state.activeMap.points;
  state.BEST_KEY = bestKeyFor();
  for (const key of ['road', 'runoff', 'wall']) CFG[key] = state.activeMap[key];
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

export function sampleMap(map, steps = 40) {
  return map.id === 'city'
    ? sampleCityCurve(map.points, steps)
    : sampleCurve(map.points, steps);
}

export function sampleCityCurve(points, steps = 40) {
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

export function sampleCurve(points, steps = 40) {
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

export function makeTrack() {
  track.length = 0;
  track.push(...sampleMap(state.activeMap));
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
  state.trackBounds = {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
  const margin = state.activeMap.id === 'coast' ? 850 : 600;
  state.worldBounds = {
    x: Math.floor(state.trackBounds.left - margin),
    y: Math.floor(state.trackBounds.top - margin),
    width: Math.ceil(
      state.trackBounds.right - state.trackBounds.left + margin * 2,
    ),
    height: Math.ceil(
      state.trackBounds.bottom - state.trackBounds.top + margin * 2,
    ),
  };
  state.paddock = findPaddockPlacement();
  buildPitLane();
  buildSceneryDetails();
  state.minimapLayer = null;
  state.minimapLayout = null;
}

export function pointOnTrack(distance) {
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

export function buildPitLane() {
  const entry = pointOnTrack(-650),
    exit = pointOnTrack(700),
    side = state.paddock.side;
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
    { x: a.x - state.paddock.tx * 180, y: a.y - state.paddock.ty * 180 },
    a,
  );
  for (let i = 0; i < 60; i++)
    points.push({ x: lerpTo(a.x, b.x, i / 60), y: lerpTo(a.y, b.y, i / 60) });
  curve(
    b,
    { x: b.x + state.paddock.tx * 180, y: b.y + state.paddock.ty * 180 },
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
    left: Math.min(state.trackBounds.left, ...points.map((p) => p.x)),
    right: Math.max(state.trackBounds.right, ...points.map((p) => p.x)),
    top: Math.min(state.trackBounds.top, ...points.map((p) => p.y)),
    bottom: Math.max(state.trackBounds.bottom, ...points.map((p) => p.y)),
  };
}

// Segment data is immutable until the route changes. Queries allocate one
// result instead of repeatedly rebuilding candidates while scanning a path.
export function makePathSegments(points, closed = false) {
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

export function nearestSegmentFrame(segments, x, y) {
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

export function boundsDistanceSquared(bounds, x, y) {
  const dx = Math.max(bounds.left - x, 0, x - bounds.right),
    dy = Math.max(bounds.top - y, 0, y - bounds.bottom);
  return dx * dx + dy * dy;
}

export function withinPitDistance(x, y, distance) {
  return (
    distance > 0 &&
    boundsDistanceSquared(pitLane.corridorBounds, x, y) < distance * distance &&
    nearestPit(x, y).distance < distance
  );
}

export function nearestPit(x, y) {
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

export function nearestDriving(x, y) {
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

export function paddockPoint(x, y, placement = state.paddock) {
  return {
    x: placement.x + placement.tx * x - placement.ty * y,
    y: placement.y + placement.ty * x + placement.tx * y,
  };
}

export function findPaddockPlacement() {
  const start = track[0];
  let best = null,
    bestClearance = -Infinity;
  // Check the whole apron, including room around its edges, against every
  // nearby track section. A fixed screen offset can land on the next bend.
  for (const offset of [300, 380, 460, 560, 680])
    for (const side of state.activeMap.id === 'coast' ? [-1, 1] : [1, -1])
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
              p.x - state.worldBounds.x - 20,
              state.worldBounds.x + state.worldBounds.width - p.x - 20,
              p.y - state.worldBounds.y - 20,
              state.worldBounds.y + state.worldBounds.height - p.y - 20,
            );
            if (state.activeMap.id === 'coast')
              clearance = Math.min(clearance, coastLandDistance(p.x, p.y) - 70);
            if (state.activeMap.id === 'amazonas')
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

export function buildSpatialIndex() {
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

export function nearest(x, y) {
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

export function surfaceAt(n, x = n.x, y = n.y) {
  if (state.activeMap.id === 'amazonas' && n.distance <= CFG.wall + 7) {
    const river = amazonRiverFrame(x, y);
    if (river.distance < 83 * amazonRiverScale(river.t)) return 'FORD';
  }
  if (n.pit) return n.distance <= n.road + 5 ? 'PIT LANE' : 'RUNOFF';
  if (n.distance <= widthAt('road', n.progress) + 7) {
    for (const patch of state.activeMap.patches) {
      if (inPatch(n, patch)) return patch.type;
    }
    return rallySurface(n.progress);
  }
  if (n.distance < widthAt('runoff', n.progress)) return 'RUNOFF';
  if (state.activeMap.id === 'canyon') return 'SAND';
  if (state.activeMap.id === 'alpine') return 'SNOW';
  if (state.activeMap.id === 'coast') return 'SAND';
  // Gravel at the outer edge of fast turns; grass covers the remaining verge.
  return (n.progress > 0.12 && n.progress < 0.38) ||
    (n.progress > 0.51 && n.progress < 0.77)
    ? 'GRAVEL'
    : 'GRASS';
}

export function dirtProgress(progress) {
  return (
    (progress >= 0.14 && progress < 0.36) ||
    (progress >= 0.57 && progress < 0.79)
  );
}

export function rallySurface(progress) {
  return state.activeMap.id === 'rallycross' && dirtProgress(progress)
    ? 'DIRT'
    : 'ASPHALT';
}

export function patchFrame(patch) {
  const p = track[Math.floor(patch.progress * track.length) % track.length];
  return {
    x: p.x + p.nx * patch.lateral,
    y: p.y + p.ny * patch.lateral,
    tx: p.tx,
    ty: p.ty,
  };
}

export function inPatch(n, patch) {
  const p = patchFrame(patch),
    x = n.x + n.nx * n.distance * n.side - p.x,
    y = n.y + n.ny * n.distance * n.side - p.y;
  const u = (x * p.tx + y * p.ty) / patch.length,
    v = (-x * p.ty + y * p.tx) / patch.width;
  return Math.hypot(u, v) <= patchRadius(patch, Math.atan2(v, u));
}

export function patchRadius(patch, angle) {
  return (
    1 +
    0.065 * Math.sin(angle * 3 + patch.progress * 31) +
    0.045 * Math.sin(angle * 7 + patch.progress * 19)
  );
}
