import { seededRandom } from './math.js';
import { inWorldView, path, roundedRect } from './renderer.js';
import { drawSceneryAsset } from './scenery.js';
import { sceneryAssetState, state } from './state.js';
import {
  makePathSegments,
  nearestSegmentFrame,
  sampleCurve,
} from './tracks.js';

// A continuous shoreline keeps the sea outside the road and pit barriers.
export const coast = {
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

export const coastSegments = makePathSegments(coast.shore, true);

export function coastShoreFrame(x, y) {
  const best = nearestSegmentFrame(coastSegments, x, y),
    segment = coastSegments[best.index];
  best.distance = Math.sqrt(best.d2);
  best.tx = segment.tx;
  best.ty = segment.ty;
  return best;
}

export function coastOnLand(x, y) {
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

export function coastLandDistance(x, y) {
  const distance = coastShoreFrame(x, y).distance;
  return coastOnLand(x, y) ? distance : -distance;
}

export function paintCoastGround(c, bounds, detail = true) {
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

export function paintCoastBuilding(c, x, y, w, h, angle, roof = '#c77d58') {
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

export function paintCoastPalm(c, x, y, size, rand) {
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

export function paintCoastBoat(c, x, y, angle, color) {
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

export function paintCoastLandmarks(c) {
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
  const harbor = coastShoreFrame(state.paddock.x, state.paddock.y),
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

export function drawCoastWaves(c) {
  if (state.activeMap.id !== 'coast') return;
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
