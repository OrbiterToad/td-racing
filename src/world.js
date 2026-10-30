import { paintCoastGround, paintCoastLandmarks } from './coast.js';
import { CFG } from './config.js';
import { paintAmazonFords, paintAmazonRiver } from './jungle.js';
import { seededRandom } from './math.js';
import {
  paintMainRail,
  paintPitConnections,
  paintPitRails,
  paintPitRoad,
  path,
  ribbon,
  roundedRect,
} from './renderer.js';
import {
  paintPaddock,
  paintSceneryGround,
  paintSceneryScene,
} from './scenery.js';
import { pitLane, startingGrid, state, track } from './state.js';
import {
  paintAlpineRidges,
  paintCanyonMesas,
  paintCityGround,
  paintCityRoadMarkings,
  paintRallyRoad,
  paintSurfacePatches,
} from './terrain.js';
import { timingGateHalfWidth, widthAt, withinPitDistance } from './tracks.js';

export function buildWorld() {
  state.worldCanvas = document.createElement('canvas');
  state.worldCanvas.width = state.worldBounds.width;
  state.worldCanvas.height = state.worldBounds.height;
  state.worldCtx = state.worldCanvas.getContext('2d');
  const desert = state.activeMap.id === 'canyon',
    alpine = state.activeMap.id === 'alpine',
    amazon = state.activeMap.id === 'amazonas',
    seaside = state.activeMap.id === 'coast',
    urban = state.activeMap.id === 'city',
    c = state.worldCtx,
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
    w = state.worldBounds.width,
    h = state.worldBounds.height;
  c.fillStyle = desert
    ? '#d5a36d'
    : alpine
      ? '#dbe6e3'
      : amazon
        ? '#28523b'
        : '#8ba274';
  c.fillRect(0, 0, w, h);
  c.translate(-state.worldBounds.x, -state.worldBounds.y);
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
      rand() * w + state.worldBounds.x,
      rand() * h + state.worldBounds.y,
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
    const x = rand() * w + state.worldBounds.x,
      y = rand() * h + state.worldBounds.y;
    c.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
  }
  if (seaside) paintCoastGround(c, state.worldBounds);
  if (urban) paintCityGround(c, state.worldBounds);
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
  if (state.activeMap.id === 'rallycross') paintRallyRoad(c, rand);
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
                : state.activeMap.id === 'rallycross'
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
    c.strokeStyle = state.activeMap.accent + '77';
    c.lineWidth = 2;
    c.setLineDash([8, 8]);
    c.beginPath();
    c.moveTo(0, -half);
    c.lineTo(0, half);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = state.activeMap.accent;
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.fillText('S' + gate, 0, -half - 15);
    c.restore();
  }
  paintSurfacePatches(c);
}
