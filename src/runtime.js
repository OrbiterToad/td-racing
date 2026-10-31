import { initModalKeyboard } from './accessibility.js';
import { toggleOpponentRace } from './opponents.js';
import { toggleSound } from './audio.js';
import { configureCar, loadCarArt, readBest } from './cars.js';
import { MAPS } from './config.js';
import { drawMinimap } from './minimap.js';
import {
  beginLap,
  chooseStartingSlot,
  recover,
  restartRun,
  startCountdown,
} from './race.js';
import { desiredZoom, startGamepadPolling } from './renderer.js';
import { loadSceneryAssets } from './scenery.js';
import {
  camera,
  car,
  feedback,
  keys,
  particles,
  race,
  skidmarks,
  startingGrid,
  state,
  timing,
} from './state.js';
import { configureTrack } from './tracks.js';
import { GamepadInput } from './gamepad.js';
import { loadTrafficArt } from './traffic.js';
import {
  $,
  initPicker,
  notify,
  openSessionSetup,
  setPaused,
  updateHUD,
} from './ui.js';
import { buildWorld } from './world.js';
import { initTouchControls } from './touch-controls.js';
import { prepareRewindSession, rewind } from './rewind.js';

export function changeTrack(id, announce = true) {
  if (!configureTrack(id)) return;
  prepareRewindSession(id, state.activeCar.id);
  keys.clear();
  skidmarks.length = 0;
  particles.length = 0;
  state.skidClock = 0;
  state.lastSkid = [null, null];
  state.accumulator = 0;
  state.movingTime = 0;
  state.lastHUD = 0;
  Object.assign(race, {
    started: false,
    time: 0,
    last: null,
    lap: 1,
    next: 1,
    previous: 0,
    invalid: false,
    travel: 0,
    stuck: 0,
  });
  timing.last = [];
  timing.flashTime = 0;
  feedback.impact = 0;
  beginLap();
  readBest();
  Object.assign(car, {
    surface: 'ASPHALT',
    throttle: 0,
    brake: 0,
    slickTime: 0,
  });
  recover(false);
  if (id === 'city') loadTrafficArt();
  buildWorld();
  camera.x = car.x;
  camera.y = car.y;
  camera.zoom = desiredZoom();
  $('open-tracks').textContent = state.activeMap.name + ' ▾';
  $('track-label').textContent = state.activeMap.label;
  $('track-title').textContent = state.activeMap.name;
  $('track-subtitle').textContent = state.activeMap.subtitle;
  $('temperature').textContent = state.activeMap.temperature;
  $('grip-label').textContent = state.activeMap.gripLabel;
  document.documentElement.style.setProperty('--lime', state.activeMap.accent);
  $('game').style.background =
    state.activeMap.id === 'canyon'
      ? '#d5a36d'
      : state.activeMap.id === 'alpine'
        ? '#dbe6e3'
        : state.activeMap.id === 'amazonas'
          ? '#28523b'
          : state.activeMap.id === 'coast'
            ? '#288f9c'
            : state.activeMap.id === 'city'
              ? '#929b98'
              : '#8ba274';
  $('hint').style.opacity = '1';
  $('hint').textContent =
    state.activeMap.id === 'city'
      ? 'W to drive · Real streets, light traffic. Brake for downtown corners; flow through the suburbs.'
      : state.activeMap.id === 'coast'
        ? 'W to drive · Short coastal curves. Avoid the two beach sand drifts.'
        : state.activeMap.id === 'amazonas'
          ? 'W to drive · Two shallow river crossings. Slow for the water; watch for coconuts.'
          : state.activeMap.id === 'canyon'
            ? 'W to drive · Brake early. Avoid the sand drifts. Mind the narrow passes.'
            : state.activeMap.id === 'alpine'
              ? 'W to drive · Three ice patches. Ease off and keep steering smooth.'
              : state.activeMap.id === 'rallycross'
                ? 'W to drive · Dirt needs a slide. Asphalt needs a clean exit.'
                : 'W to drive · Find your apex. Avoid the dark oil slicks.';
  try {
    localStorage.setItem('apex-selected-track', id);
  } catch (_) {}
  startCountdown();
  setPaused(false);
  updateHUD();
  drawMinimap();
  if (announce)
    notify(
      state.activeMap.name.toUpperCase() +
        ' · ' +
        (id === 'canyon' ? 'EXPERT CIRCUIT' : 'FLOW CIRCUIT'),
    );
}

export function setup() {
  const host = $('game'),
    canvas = createCanvas(host.clientWidth, host.clientHeight);
  canvas.parent(host);
  canvas.elt.addEventListener('click', selectStartingGrid);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  state.ctx = drawingContext;
  try {
    const saved = JSON.parse(localStorage.getItem('apex-garage'));
    if (saved) configureCar(saved.car, saved.paint);
  } catch (_) {}
  loadCarArt();
  noLoop();
  state.gamepadInput = new GamepadInput();
  startGamepadPolling();
  document.body.classList.add('starting');
  loadSceneryAssets().then(initializeGame);
}

export function initializeGame() {
  state.mapCtx = $('minimap').getContext('2d');
  let initial = 'juniper';
  try {
    const saved = localStorage.getItem('apex-selected-track');
    if (Object.hasOwn(MAPS, saved)) initial = saved;
  } catch (_) {}
  initModalKeyboard();
  initPicker();
  initTouchControls();
  openSessionSetup();
  state.pendingTrack = initial;
  $('pause').onclick = () => setPaused(!state.paused);
  $('resume').onclick = () => setPaused(false);
  $('sound').onclick = toggleSound;
  $('restart').onclick = restartRun;
  $('race-mode').onclick = toggleOpponentRace;
  $('race-mode').disabled = false;
  state.gamepadReady = true;
  window.addEventListener('gamepadconnected', () => {
    $('gamepad-status').textContent = 'Controller connected';
  });
  window.addEventListener('gamepaddisconnected', () => {
    $('gamepad-status').textContent = 'No controller detected';
    state.gamepadControls = state.gamepadInput.disconnect(performance.now());
  });
  window.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) setPaused(!state.paused);
      e.preventDefault();
      return;
    }
    // Leave native activation intact, including Space on Resume and menus.
    if (
      e.code === 'Space' &&
      e.target.closest('button, a, input, select, textarea')
    )
      return;
    if (state.paused) return;
    if (
      [
        'Backspace',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      restartRun();
    }
    if (e.code === 'KeyR') recover(true);
    if (e.code === 'KeyB' || e.code === 'Backspace') rewind();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    setPaused(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keys.clear();
      setPaused(true);
    }
  });
  updateHUD();
  if (document.hidden) setPaused(true);
  loop();
}

export function selectStartingGrid(event) {
  if (state.paused || race.started || $('selection-dialog').open) return;
  const rect = event.currentTarget.getBoundingClientRect(),
    x =
      (((event.clientX - rect.left) * width) / rect.width - width / 2) /
        camera.zoom +
      camera.x,
    y =
      (((event.clientY - rect.top) * height) / rect.height - height * 0.54) /
        camera.zoom +
      camera.y;
  const index = startingGrid.findIndex((p) => {
    const dx = x - p.x,
      dy = y - p.y;
    return (
      Math.abs(dx * p.tx + dy * p.ty) <= 32 &&
      Math.abs(-dx * p.ty + dy * p.tx) <= 22
    );
  });
  if (index >= 0) chooseStartingSlot(index);
}

export function windowResized() {
  const h = $('game');
  resizeCanvas(h.clientWidth, h.clientHeight);
}
