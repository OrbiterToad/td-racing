import { CFG } from './config.js';
import { lerpTo, seededRandom } from './math.js';
import { burst } from './physics.js';
import { inWorldView, path, roundedRect } from './renderer.js';
import { drawSceneryAsset } from './scenery.js';
import {
  car,
  jungle,
  pitLane,
  sceneryAssetState,
  state,
  track,
} from './state.js';
import { makePathSegments, nearestSegmentFrame } from './tracks.js';
import { notify } from './ui.js';

// The river crosses the circuit twice as shallow, drivable fords.
export const amazonRiver = Array.from({ length: 129 }, (_, i) => {
  const t = i / 128;
  return {
    x: -1650 + 3200 * t + 70 * Math.sin(t * Math.PI * 5),
    y: -2400 + 5000 * t,
  };
});

export const amazonSegments = makePathSegments(amazonRiver);

export function amazonRiverScale(t) {
  return 0.78 + 0.22 * Math.sin(t * Math.PI) + 0.08 * Math.sin(t * Math.PI * 7);
}

export function amazonRiverFrame(x, y) {
  const best = nearestSegmentFrame(amazonSegments, x, y),
    segment = amazonSegments[best.index];
  best.distance = Math.sqrt(best.d2);
  best.t = (best.index + best.t) / amazonSegments.length;
  best.tx = segment.tx;
  best.ty = segment.ty;
  return best;
}

export function amazonRiverDistance(x, y) {
  return amazonRiverFrame(x, y).distance;
}

export function paintAmazonFords(c) {
  // One union mask prevents overlapping main/pit fords from doubling the
  // water opacity or leaving triangular seams at the merge.
  const layer = document.createElement('canvas');
  layer.width = state.worldBounds.width;
  layer.height = state.worldBounds.height;
  const water = layer.getContext('2d');
  water.translate(-state.worldBounds.x, -state.worldBounds.y);
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
  c.drawImage(layer, state.worldBounds.x, state.worldBounds.y);
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

export function drawRiverCurrent(c) {
  if (state.activeMap.id !== 'amazonas') return;
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

export function paintFordWater(c) {
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

export function paintAmazonRiver(c, detail = true) {
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

export function paintJungleTree(c, x, y, size, rand) {
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

export function monkeyPosition() {
  const p = track[Math.floor(track.length * 0.32)],
    offset = CFG.wall + 40;
  return {
    x: p.x + p.nx * offset,
    y: p.y + p.ny * offset,
    angle: Math.atan2(-p.ny, -p.nx),
  };
}

export function updateJungle(dt) {
  car.coconutSlip = Math.max(0, (car.coconutSlip || 0) - dt);
  if (state.activeMap.id !== 'amazonas') return;
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
      Math.hypot(car.x - nut.x, car.y - nut.y) <
        state.activeCar.length * 0.5 + 10
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

export function drawJungle(c) {
  if (state.activeMap.id !== 'amazonas') return;
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
