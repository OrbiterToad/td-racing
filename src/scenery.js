import { coast, coastLandDistance, paintCoastBuilding } from './coast.js';
import { MAPS, SCENERY_ASSETS, SCENERY_LAYERS } from './config.js';
import { amazonRiverDistance, monkeyPosition } from './jungle.js';
import { seededRandom } from './math.js';
import { roundedRect } from './renderer.js';
import {
  pitLane,
  sceneryArt,
  sceneryAssetState,
  sceneryBuildings,
  sceneryDetails,
  sceneryScene,
  sceneryTrees,
  state,
  track,
} from './state.js';
import {
  paintAlpineProp,
  paintCityBuilding,
  paintCityTree,
  paintDesertProp,
} from './terrain.js';
import { nearest, widthAt, withinPitDistance } from './tracks.js';

export function loadSceneryAssets() {
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

export function drawSceneryAsset(c, key, x, y, w, h, angle = 0) {
  const art = sceneryArt[key];
  if (!art) return false;
  c.save();
  c.translate(x, y);
  if (angle) c.rotate(angle);
  c.drawImage(art, -w / 2, -h / 2, w, h);
  c.restore();
  return true;
}

export function paddockAssetLayout() {
  const theme = {
      juniper: 'cream',
      canyon: 'cream',
      alpine: 'alpine',
      amazonas: 'jungle',
      coast: 'coastal',
      city: 'city',
      rallycross: 'industrial',
    }[state.activeMap.id],
    front = state.paddock.side === 1 ? -1 : 1,
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
    key: state.activeMap.id === 'alpine' ? 'control-room-snow' : 'control-room',
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

export function paintPaddock(c) {
  const theme = {
    juniper: '#9ba88c',
    canyon: '#c5ad86',
    alpine: '#b9c7bf',
    amazonas: '#9ba688',
    coast: '#d0c09b',
    city: '#a8b1a5',
    rallycross: '#b4ad8e',
  }[state.activeMap.id];
  c.save();
  c.translate(state.paddock.x, state.paddock.y);
  c.rotate(Math.atan2(state.paddock.ty, state.paddock.tx));
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
      const labelY = prop.y + (state.paddock.side === 1 ? -26 : 26);
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

export function reserveScenery(prop, target) {
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

export function cityParkClear(x, y, radius) {
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

export function sceneryClear(x, y, radius) {
  const n = nearest(x, y);
  if (
    n.distance < widthAt('wall', n.progress) + radius + 24 ||
    withinPitDistance(x, y, pitLane.wall + radius + 24)
  )
    return false;
  const dx = x - state.paddock.x,
    dy = y - state.paddock.y,
    px = dx * state.paddock.tx + dy * state.paddock.ty,
    py = -dx * state.paddock.ty + dy * state.paddock.tx;
  if (
    px > -265 - radius &&
    px < 305 + radius &&
    py > -75 - radius &&
    py < 125 + radius
  )
    return false;
  if (state.activeMap.id === 'amazonas') {
    const m = monkeyPosition();
    if (
      amazonRiverDistance(x, y) < 125 + radius ||
      Math.hypot(x - m.x, y - (m.y - 20)) < 100 + radius
    )
      return false;
  }
  if (state.activeMap.id === 'city' && !cityParkClear(x, y, radius))
    return false;
  if (
    state.activeMap.id === 'coast' &&
    (coastLandDistance(x, y) < 90 + radius ||
      Math.hypot(x - coast.lighthouse.x, y - coast.lighthouse.y) < 130 + radius)
  )
    return false;
  return true;
}

export function buildSceneryBuildings() {
  if (state.activeMap.id === 'coast') {
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
  if (state.activeMap.id === 'city') {
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

export function sceneryDetailLayer(kind) {
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

export function buildSceneryDetails() {
  sceneryDetails.length = 0;
  sceneryBuildings.length = 0;
  sceneryTrees.length = 0;
  sceneryScene.length = 0;
  buildSceneryBuildings();
  const rand = seededRandom(
      5600 + Object.keys(MAPS).indexOf(state.activeMap.id) * 271,
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
    }[state.activeMap.id];
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
        ? state.activeMap.id === 'city'
          ? 0
          : Math.atan2(p.ty, p.tx) + (side === 1 ? Math.PI : 0)
        : rotation;
    // Buildings belong outside the central park; paths and the fountain stay open.
    if (
      state.activeMap.id === 'city' &&
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

export function buildSceneryTrees() {
  const id = state.activeMap.id,
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
    const x = rand() * state.worldBounds.width + state.worldBounds.x,
      y = rand() * state.worldBounds.height + state.worldBounds.y,
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

export function paintSceneryGround(c) {
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

export function paintSceneryScene(c) {
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

export function paintSceneryRock(c, size, rand) {
  const desert = state.activeMap.id === 'canyon',
    snow = state.activeMap.id === 'alpine';
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

export function paintSceneryDetails(c, props = sceneryDetails) {
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
            ? state.activeMap.id === 'alpine'
              ? 'cottage-snow'
              : 'cottage-wood'
            : kind === 'hut'
              ? state.activeMap.id === 'amazonas'
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
