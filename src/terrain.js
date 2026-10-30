import { CFG, MAPS } from './config.js';
import { seededRandom } from './math.js';
import { path, roundedRect } from './renderer.js';
import { drawSceneryAsset, sceneryClear } from './scenery.js';
import { pitLane, sceneryAssetState, state, track } from './state.js';
import {
  dirtProgress,
  nearest,
  patchFrame,
  patchRadius,
  widthAt,
  withinPitDistance,
} from './tracks.js';

export function pitAsphalt() {
  return state.activeMap.id === 'canyon'
    ? '#4f5150'
    : state.activeMap.id === 'alpine'
      ? '#46555c'
      : '#424d50';
}

export function patchOutline(c, patch, scale = 1) {
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

export function paintCityGround(c, bounds) {
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

export function paintCityBuilding(c, x, y, w, h, rand, residential = false) {
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

export function paintCityTree(c, x, y, size, rand) {
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

export function paintCityRoadMarkings(c) {
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

export function paintRallyRoad(c, rand) {
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

export function paintSurfacePatches(c) {
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
  state.activeMap.patches.forEach((patch, index) => {
    const p = patchFrame(patch);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    paintPatch(c, patch, index);
    c.restore();
  });
  c.restore();
}

export function paintPatch(c, patch, index = 0) {
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

export function paintAlpineRidges(c, rand, w, h) {
  for (let i = 0; i < 100; i++) {
    const x = state.worldBounds.x + rand() * w,
      y = state.worldBounds.y + rand() * h,
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

export function paintAlpineProp(c, x, y, size, rand) {
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

export function paintCanyonMesas(c, rand, w, h) {
  for (let i = 0; i < 190; i++) {
    const x = state.worldBounds.x + rand() * w,
      y = state.worldBounds.y + rand() * h,
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

export function paintDesertProp(c, x, y, size, rand) {
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
