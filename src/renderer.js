import { drawOpponents } from './opponents.js';
import { updateAudio } from './audio.js';
import { drawCoastWaves } from './coast.js';
import { carImagePath } from './cars.js';
import { CFG, PAINTS, mapBaseId } from './config.js';
import { visibleGhostPose } from './ghost.js';
import { drawJungle, drawRiverCurrent } from './jungle.js';
import { clamp, lerpTo } from './math.js';
import { drawMinimap } from './minimap.js';
import { simulate } from './physics.js';
import {
  camera,
  car,
  feedback,
  particles,
  pitLane,
  race,
  skidBatches,
  skidmarks,
  startingGrid,
  state,
  track,
} from './state.js';
import { pitAsphalt } from './terrain.js';
import { nearest, patchFrame, widthAt, withinPitDistance } from './tracks.js';
import { drawCityTraffic } from './traffic.js';
import { restartRun } from './race.js';
import { rewind } from './rewind.js';
import { localRaceResults, pollSecondPlayer } from './local-race.js';
import { handleGamepadAction } from './tutorial.js';
import { drawSkillTrialMarkers } from './skill-trials.js';
import {
  $,
  applyPicker,
  closePicker,
  setPaused,
  stepSelection,
  updateHUD,
} from './ui.js';

export function paintPitRoad(c) {
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

export function paintPitConnections(c) {
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

export function paintPitRails(c) {
  const street = mapBaseId(state.activeMap) === 'city';
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

export function paintMainRail(c, side, color, width) {
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

export function drawStartingGridSelection(c) {
  if (race.started) return;
  for (let i = 0; i < startingGrid.length; i++) {
    const p = startingGrid[i];
    c.save();
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.ty, p.tx));
    c.fillStyle =
      i === state.selectedStart ? state.activeMap.accent + '28' : '#d7e9d509';
    roundedRect(c, -26, -14, 52, 28, 4);
    c.fill();
    c.strokeStyle =
      i === state.selectedStart ? state.activeMap.accent : '#dfebd980';
    c.lineWidth = i === state.selectedStart ? 2 : 1.5;
    c.stroke();
    c.restore();
  }
}

export function drawLapGhost(c) {
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
    -state.activeCar.length / 2 - 2,
    -state.activeCar.width / 2 - 2,
    state.activeCar.length + 4,
    state.activeCar.width + 4,
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

// The area the world pass draws into; split screen narrows it to one half.
const view = { width: 0, height: 0, anchor: 0.54 };

export function desiredZoom() {
  return clamp(Math.min(width / 1050, height / 760), 0.55, 1.12);
}

export function drawSkidmarks(c) {
  for (const batch of skidBatches) batch.length = 0;
  const halfW = view.width / (camera.zoom * 2) + 100,
    halfH = view.height / (camera.zoom * 2) + 100;
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

export function inWorldView(x, y, radius = 0) {
  const zoom = camera.zoom;
  return (
    Math.abs(x - camera.x) <= view.width / (2 * zoom) + radius &&
    y >= camera.y - (view.height * view.anchor) / zoom - radius &&
    y <= camera.y + (view.height * (1 - view.anchor)) / zoom + radius
  );
}

export function drawWorldViewport(c) {
  const zoom = camera.zoom,
    left = camera.x - view.width / (2 * zoom) - state.worldBounds.x,
    top = camera.y - (view.height * view.anchor) / zoom - state.worldBounds.y,
    x = Math.max(0, Math.floor(left) - 2),
    y = Math.max(0, Math.floor(top) - 2),
    right = Math.min(
      state.worldCanvas.width,
      Math.ceil(left + view.width / zoom) + 2,
    ),
    bottom = Math.min(
      state.worldCanvas.height,
      Math.ceil(top + view.height / zoom) + 2,
    );
  if (right > x && bottom > y)
    c.drawImage(
      state.worldCanvas,
      x,
      y,
      right - x,
      bottom - y,
      state.worldBounds.x + x,
      state.worldBounds.y + y,
      right - x,
      bottom - y,
    );
}

export function draw() {
  if (!state.worldCanvas) return;
  const elapsed = Math.min(deltaTime / 1000, 0.08);
  if (!state.paused) {
    state.accumulator += elapsed;
    while (state.accumulator >= CFG.step) {
      simulate(CFG.step);
      state.accumulator -= CFG.step;
    }
  }
  const smoothing = 1 - Math.exp(-4.5 * elapsed);
  camera.x = lerpTo(camera.x, car.x + car.vx * 0.42, smoothing);
  camera.y = lerpTo(camera.y, car.y + car.vy * 0.42, smoothing);
  const targetZoom = state.settings.reducedMotion
    ? desiredZoom()
    : desiredZoom() * (1 - clamp(Math.hypot(car.vx, car.vy) / 1700, 0, 0.19));
  camera.zoom = state.settings.reducedMotion
    ? targetZoom
    : lerpTo(camera.zoom, targetZoom, smoothing);
  view.width = width;
  view.height = height;
  view.anchor = 0.54;
  state.ctx.save();
  state.ctx.setTransform(pixelDensity(), 0, 0, pixelDensity(), 0, 0);
  const ground =
    state.activeMap.groundColor ||
    (mapBaseId(state.activeMap) === 'canyon'
      ? '#d5a36d'
      : mapBaseId(state.activeMap) === 'alpine'
        ? '#dbe6e3'
        : mapBaseId(state.activeMap) === 'amazonas'
          ? '#28523b'
          : mapBaseId(state.activeMap) === 'coast'
            ? '#288f9c'
            : mapBaseId(state.activeMap) === 'city'
              ? '#929b98'
              : mapBaseId(state.activeMap) === 'drift'
                ? '#152e3a'
                : '#8ba274');
  state.ctx.fillStyle = ground;
  state.ctx.fillRect(0, 0, width, height);
  if (state.localRace) drawLocalViews(state.ctx, elapsed);
  else {
    state.ctx.translate(width / 2, height * 0.54);
    state.ctx.scale(camera.zoom, camera.zoom);
    state.ctx.translate(-camera.x, -camera.y);
    drawWorldPass(state.ctx);
  }
  state.ctx.restore();
  if (state.localRace) drawLocalSplitScreen(state.ctx);
  if (!state.settings.reducedMotion && feedback.impact > 0.03) {
    state.ctx.save();
    state.ctx.fillStyle = 'rgba(247,130,92,' + feedback.impact * 0.065 + ')';
    state.ctx.fillRect(0, 0, width, height);
    state.ctx.restore();
  }
  if (state.toastTimer > 0 && !state.paused) {
    state.toastTimer -= elapsed;
    if (state.toastTimer <= 0) $('toast').classList.remove('visible');
  }
  if (millis() - state.lastHUD > 70) {
    updateHUD();
    drawMinimap();
    state.lastHUD = millis();
  }
  updateAudio();
}

// Everything drawn in world coordinates, for whichever camera is active.
function drawWorldPass(c) {
  drawWorldViewport(c);
  if (!state.settings.reducedMotion) {
    drawCoastWaves(c);
    drawRiverCurrent(c);
  }
  drawSkidmarks(c);
  drawStartingGridSelection(c);
  drawSkillTrialMarkers(c);
  for (const p of particles) {
    c.globalAlpha = (p.life / p.max) * 0.35;
    c.fillStyle =
      p.type === 'water'
        ? '#b7f3ee'
        : p.type === 'dust'
          ? '#dfca9b'
          : p.type === 'spark'
            ? '#ffdf85'
            : '#f0e9da';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  if (!state.settings.reducedMotion) drawPatchHighlights(c, millis() / 1000);
  drawCityTraffic(c);
  drawOpponents(c);
  drawCar(c);
  drawLocalRival(c);
  drawLapGhost(c);
  drawJungle(c);
}

const localArt = new Map();

function localCarArt(spec, paint) {
  const src = carImagePath(spec.id, paint);
  if (!localArt.has(src) && typeof Image !== 'undefined') {
    const image = new Image();
    image.src = src;
    localArt.set(src, image);
  }
  return localArt.get(src);
}

// Player 2 also appears in Player 1's view (and Player 1 in Player 2's).
function drawLocalRival(c) {
  const race = state.localRace;
  if (!race) return;
  const spec = race.carSpecs[1],
    paint = race.paints[1];
  drawVehicle(c, race.players[1], spec, localCarArt(spec, paint), paint);
}

export function localViewZoom(viewW, viewH, speed = 0) {
  const base = clamp(Math.min(viewW / 820, viewH / 760), 0.55, 1.12);
  return state.settings.reducedMotion
    ? base
    : base * (1 - clamp(speed / 1700, 0, 0.19));
}

// Left half follows Player 1, right half follows Player 2, edge to edge.
function drawLocalViews(c, elapsed) {
  const race = state.localRace;
  const viewW = width / 2,
    smoothing = 1 - Math.exp(-4.5 * elapsed),
    saved = { x: camera.x, y: camera.y, zoom: camera.zoom };
  race.cameras ??= [null, null];
  for (let index = 0; index < 2; index++) {
    const player = index === 0 ? car : race.players[1],
      speed = Math.hypot(player.vx, player.vy),
      targetZoom = localViewZoom(viewW, height, speed),
      targetX = player.x + player.vx * 0.3,
      targetY = player.y + player.vy * 0.3;
    const target = (race.cameras[index] ??= {
      x: targetX,
      y: targetY,
      zoom: targetZoom,
    });
    target.x = lerpTo(target.x, targetX, smoothing);
    target.y = lerpTo(target.y, targetY, smoothing);
    target.zoom = state.settings.reducedMotion
      ? targetZoom
      : lerpTo(target.zoom, targetZoom, smoothing);
    Object.assign(camera, target);
    view.width = viewW;
    view.height = height;
    view.anchor = 0.5;
    c.save();
    c.beginPath();
    c.rect(index * viewW, 0, viewW, height);
    c.clip();
    c.translate(index * viewW + viewW / 2, height / 2);
    c.scale(camera.zoom, camera.zoom);
    c.translate(-camera.x, -camera.y);
    drawWorldPass(c);
    c.restore();
  }
  Object.assign(camera, saved);
  view.width = width;
  view.height = height;
  view.anchor = 0.54;
}

// Labels, divider, countdown and results drawn over both halves.
function drawLocalSplitScreen(c) {
  const race = state.localRace;
  if (!race) return;
  const viewW = width / 2;
  c.save();
  c.fillStyle = '#10201b';
  c.fillRect(viewW - 1, 0, 2, height);
  for (let index = 0; index < 2; index++) {
    const player = index === 0 ? car : race.players[1],
      lap = Math.min(race.players[index].lap, race.laps),
      spec = race.carSpecs[index],
      title = `PLAYER ${index + 1} · ${spec.name.toUpperCase()}`,
      detail = `${index === 0 ? 'WASD / PAD 1' : 'ARROWS / PAD 2'}   LAP ${lap}/${race.laps}   ${Math.round(Math.hypot(player.vx, player.vy) * 0.46)} km/h`;
    c.font = 'bold 14px Arial';
    const titleW = c.measureText(title).width;
    c.font = '12px Arial';
    const boxW = Math.max(titleW, c.measureText(detail).width) + 34,
      // Labels sit at the top, against the divider, clear of the HUD panels.
      x = index === 0 ? viewW - 12 - boxW : viewW + 12;
    c.fillStyle = '#10201bcc';
    roundedRect(c, x, 10, boxW, 46, 4);
    c.fill();
    c.fillStyle = PAINTS[race.paints[index]].hex;
    c.fillRect(x + 10, 20, 4, 26);
    c.fillStyle = '#f4f1e8';
    c.font = 'bold 14px Arial';
    c.fillText(title, x + 22, 30);
    c.font = '12px Arial';
    c.fillText(detail, x + 22, 48);
  }
  c.textAlign = 'center';
  if (race.countdown > 0)
    for (let index = 0; index < 2; index++) {
      const cx = index * viewW + viewW / 2;
      c.fillStyle = '#08120ddd';
      roundedRect(c, cx - 42, height / 2 - 42, 84, 84, 6);
      c.fill();
      c.fillStyle = '#f4f1e8';
      c.font = 'bold 48px Arial';
      c.fillText(String(Math.ceil(race.countdown)), cx, height / 2 + 16);
    }
  if (race.finished) {
    c.fillStyle = '#08120dee';
    c.fillRect(width / 2 - 170, height / 2 - 54, 340, 108);
    c.fillStyle = '#f4f1e8';
    c.font = 'bold 20px Arial';
    c.fillText('RACE RESULTS', width / 2, height / 2 - 14);
    c.font = '15px Arial';
    c.fillText(
      localRaceResults(race).join('     '),
      width / 2,
      height / 2 + 20,
    );
  }
  c.restore();
}

let gamepadPolling = false;

export function startGamepadPolling() {
  if (gamepadPolling) return;
  gamepadPolling = true;
  const frame = () => {
    pollGamepad();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function pollGamepad() {
  const input = state.gamepadInput;
  if (!input || !navigator.getGamepads) return;
  const now = performance.now();
  if (input.padIndex === null && now < input.nextScan) return;
  const frame = input.update(navigator.getGamepads(), now);
  if (state.localRace)
    state.playerTwo = pollSecondPlayer(
      state.localRace,
      navigator.getGamepads(),
      now,
    );
  $('gamepad-status').textContent = frame.connected
    ? 'Controller connected'
    : 'No controller detected';
  if (!state.gamepadReady) {
    state.gamepadControls = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
    return;
  }
  const pickerOpen = $('selection-dialog').open;
  const tutorialOpen = $('tutorial-dialog').open;
  if (tutorialOpen) {
    for (const action of frame.actions) handleGamepadAction(action);
  } else if (pickerOpen) {
    for (const action of frame.actions) {
      if (action === 'previous') stepSelection(-1);
      if (action === 'next') stepSelection(1);
      if (action === 'confirm') applyPicker();
      if (action === 'back') closePicker();
    }
  } else {
    for (const action of frame.actions) {
      if (action === 'pause') setPaused(!state.paused);
      if (action === 'back' && state.paused) setPaused(false);
      if (action === 'restart') restartRun();
      if (action === 'rewind') rewind();
    }
  }
  const modalOpen = Boolean(document.querySelector('dialog[open]'));
  const blocked = state.paused || modalOpen;
  if (blocked) state.gamepadNeedsNeutral = true;
  const neutral = Object.values(frame.controls).every((value) => !value);
  if (state.gamepadNeedsNeutral && neutral) state.gamepadNeedsNeutral = false;
  state.gamepadControls =
    blocked || state.gamepadNeedsNeutral
      ? { steer: 0, throttle: 0, brake: 0, handbrake: 0 }
      : frame.controls;
}

export function drawCar(c) {
  drawVehicle(c, car, state.activeCar, state.carArt, state.paint);
}

export function drawVehicle(c, vehicle, spec, art, paint) {
  c.save();
  c.translate(vehicle.x, vehicle.y);
  c.rotate(vehicle.angle);
  c.fillStyle = '#10201b40';
  roundedRect(
    c,
    -spec.length / 2 + 3,
    -spec.width / 2 + 4,
    spec.length,
    spec.width,
    5,
  );
  c.fill();
  // Front tires visibly steer independently from the body.
  for (const side of [-1, 1]) {
    c.save();
    c.translate(12, side * 11);
    c.rotate(vehicle.steer * 0.35);
    c.fillStyle = '#182124';
    c.fillRect(-5, -3, 10, 6);
    c.restore();
    c.fillStyle = '#182124';
    c.fillRect(-17, side * 11 - 3, 10, 6);
  }
  if (art?.complete && art.naturalWidth) {
    c.save();
    c.rotate(Math.PI / 2);
    c.drawImage(
      art,
      -spec.width / 2,
      -spec.length / 2,
      spec.width,
      spec.length,
    );
    c.restore();
  } else {
    c.fillStyle = PAINTS[paint].hex;
    roundedRect(
      c,
      -spec.length / 2,
      -spec.width / 2,
      spec.length,
      spec.width,
      5,
    );
    c.fill();
    c.fillStyle = '#b9dedb';
    c.fillRect(4, -8, 7, 16);
    c.fillStyle = '#293c3f';
    c.fillRect(-9, -8, 6, 16);
  }
  if (spec.id === 'formula') {
    for (const [x, steers] of [
      [spec.length * 0.22, true],
      [-spec.length * 0.28, false],
    ])
      for (const side of [-1, 1]) {
        c.save();
        c.translate(x, side * spec.width * 0.38);
        if (steers) c.rotate(vehicle.steer * 0.35);
        c.fillStyle = '#25312d';
        roundedRect(c, -5, -3.2, 10, 6.4, 1.2);
        c.fill();
        c.restore();
      }
  }
  c.save();
  if (vehicle.brake) {
    c.shadowColor = '#ff4b35';
    c.shadowBlur = 7;
  }
  c.fillStyle = vehicle.brake ? '#ff6a4f' : '#942d27';
  c.fillRect(-spec.length / 2, -9, 2, 5);
  c.fillRect(-spec.length / 2, 4, 2, 5);
  c.restore();
  c.restore();
}

export function roundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

export function path(c, points, offset = 0, close = true) {
  c.beginPath();
  points.forEach((p, i) => {
    const d = typeof offset === 'function' ? offset(i / points.length) : offset,
      x = p.x + (p.nx || 0) * d,
      y = p.y + (p.ny || 0) * d;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  if (close) c.closePath();
}

export function ribbon(c, color, width, points = track) {
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

export function drawPatchHighlights(c, time) {
  for (const patch of state.activeMap.patches) {
    if (patch.type !== 'ICE' && patch.type !== 'OIL') continue;
    const p = patchFrame(patch);
    if (
      Math.abs(p.x - camera.x) > view.width / camera.zoom ||
      Math.abs(p.y - camera.y) > view.height / camera.zoom
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
    if (state.settings.colorblindCues) {
      c.globalAlpha = 0.72;
      c.strokeStyle = '#edf0e8';
      c.lineWidth = 2;
      c.setLineDash(patch.type === 'ICE' ? [7, 5] : [2, 5]);
      c.strokeRect(
        -patch.length * 0.5,
        -patch.width * 0.5,
        patch.length,
        patch.width,
      );
      c.setLineDash([]);
    }
    c.restore();
  }
}
