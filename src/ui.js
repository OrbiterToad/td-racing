import { updateOpponentHUD } from './opponents.js';
import { bestKeyFor, carImagePath, configureCar, loadCarArt } from './cars.js';
import { coast, paintCoastGround } from './coast.js';
import { MAPS, PAINTS, VEHICLES } from './config.js';
import { ghostStatus, liveGhostDelta } from './ghost.js';
import { lapCoachingDelta } from './lap-coaching.js';
import { earnedMedalFor, medalTargetsFor } from './medals.js';
import { paintAmazonRiver } from './jungle.js';
import { seededRandom } from './math.js';
import { ribbon } from './renderer.js';
import { changeTrack } from './runtime.js';
import { car, keys, opponentRace, race, state, timing } from './state.js';
import { paintCityGround } from './terrain.js';
import { dirtProgress, sampleMap } from './tracks.js';
import {
  beginSkillTrial,
  readSkillProgress,
  SKILL_TRIALS,
} from './skill-trials.js';
import { renderUiIcon } from './ui-icons.js';

export const $ = (id) => document.getElementById(id);

let pickerOpener;
let pauseOpener;
let previewCanvas = null;
let previewMap = null;
let previewObserver = null;

function setButtonContent(
  id,
  icon,
  label,
  { placement = 'start', size = 16 } = {},
) {
  const button = $(id),
    svg = renderUiIcon(icon, { size });
  button.innerHTML =
    placement === 'end' ? `${label} ${svg}` : `${svg} ${label}`;
}

function initializeActionIcons() {
  setButtonContent('open-garage', 'garage', 'Garage', {
    placement: 'end',
    size: 16,
  });
  setButtonContent('restart', 'restart', 'Restart', { size: 14 });
  setButtonContent('resume', 'forward', 'BACK ON TRACK', {
    placement: 'end',
    size: 16,
  });
  setButtonContent('pause-restart', 'restart', 'RESTART RUN', { size: 16 });
  setButtonContent('touch-pause', 'pause', 'Pause', { size: 16 });
  setButtonContent('wizard-back', 'back', 'BACK', { size: 14 });
  setButtonContent('wizard-forward', 'forward', 'NEXT', {
    placement: 'end',
    size: 14,
  });
  for (const [selector, name] of [
    ['#touch-controls [data-key="KeyA"]', 'steerLeft'],
    ['#touch-controls [data-key="KeyD"]', 'steerRight'],
  ])
    document.querySelector(selector).innerHTML = renderUiIcon(name, {
      size: 20,
    });
  $('picker-prev').innerHTML = renderUiIcon('previous', { size: 20 });
  $('picker-next').innerHTML = renderUiIcon('forward', { size: 20 });
  document.querySelector('.navigation-hint').innerHTML =
    `${renderUiIcon('steerLeft', { size: 14 })} ${renderUiIcon('steerRight', { size: 14 })} / SELECT &nbsp; · &nbsp; ENTER / CONFIRM`;
  syncTrackChoiceButton();
}

export function syncTrackChoiceButton() {
  const button = $('open-tracks');
  button.innerHTML = `${state.activeMap.name} ${renderUiIcon('chevronDown', { size: 14 })}`;
  button.setAttribute('aria-label', 'Tracks: ' + state.activeMap.name);
}

function redrawTrackPreview() {
  if (previewCanvas && previewMap) paintTrackPreview(previewCanvas, previewMap);
}

if (typeof window !== 'undefined')
  window.addEventListener('resize', redrawTrackPreview);

const GAME_MODES = {
  trial: {
    id: 'trial',
    name: 'Time trial',
    tag: 'SOLO / PERSONAL BEST',
    description:
      'An open track with unlimited laps, personal-best timing, and a lap ghost.',
  },
  race: {
    id: 'race',
    name: 'Club race',
    tag: '4 DRIVERS / 3 LAPS',
    description:
      'Line up against Alex, Blair and Casey. Three laps, fixed opponent pace, and full vehicle contact.',
  },
  local: {
    id: 'local',
    name: 'Local split screen',
    tag: 'TWO DRIVERS / THREE LAPS',
    description:
      'Two players on one circuit and one screen, three laps. Player 1 uses WASD; Player 2 uses IJKL or a second gamepad.',
  },
  ...SKILL_TRIALS,
};

// Small, decorative mode glyphs keep the text label as the accessible name.
const MODE_ICON_PATHS = {
  trial:
    '<circle cx="16" cy="17" r="10"/><path d="M16 11v6l4 3M12 3h8M16 3v4"/>',
  race: '<path d="M7 29V4m0 1h18v13H7m6-13v13m6-13v13M7 11h18"/>',
  local:
    '<rect x="3" y="6" width="26" height="20" rx="2"/><path d="M16 6v20M8 19l2-6 2 6m8 0 2-6 2 6"/>',
  braking: '<path d="M8 5h16l5 11-5 11H8L3 16zM12 10v12m8-12v12"/>',
  slalom: '<path d="M6 5v6m20 2v6M6 23v6M13 4c15 4-9 9 2 14s6 7 4 11"/>',
  handbrake: '<path d="M7 26V15a9 9 0 0 1 18 0v4m-5-5 5 5 5-5M4 26h6"/>',
  cornering:
    '<path d="M5 28V16A11 11 0 0 1 16 5h12M12 28V16a4 4 0 0 1 4-4h12M19 19l7-7-7-7"/>',
};

function modeIcon(id) {
  return `<svg class="mode-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${MODE_ICON_PATHS[id]}</svg>`;
}

function clubRaceAvailable() {
  return state.pendingTrack === 'juniper' && state.pendingCar === 'clubsport';
}

function pickerChoices() {
  return state.pickerMode === 'modes'
    ? GAME_MODES
    : state.pickerMode === 'tracks'
      ? MAPS
      : VEHICLES;
}

const WIZARD_STEPS = ['garage', 'tracks', 'modes'];

function navigateWizardStep(mode) {
  if (!state.selectingSession || !WIZARD_STEPS.includes(mode)) return;
  if (mode === 'modes' && !clubRaceAvailable()) state.pendingGameMode = 'trial';
  state.pickerMode = mode;
  renderPicker();
  $('picker-apply').focus();
}

function moveWizardStep(direction) {
  if (!state.selectingSession) return;
  const index = WIZARD_STEPS.indexOf(state.pickerMode);
  const nextIndex = Math.max(
    0,
    Math.min(WIZARD_STEPS.length - 1, index + direction),
  );
  navigateWizardStep(WIZARD_STEPS[nextIndex]);
  (direction < 0 ? $('wizard-back') : $('wizard-forward')).focus();
}

function pendingChoiceKey() {
  return state.pickerMode === 'modes'
    ? 'pendingGameMode'
    : state.pickerMode === 'tracks'
      ? 'pendingTrack'
      : 'pendingCar';
}

export function initPicker() {
  initializeActionIcons();
  $('open-tracks').onclick = () => openPicker('tracks');
  $('open-garage').onclick = () => openPicker('garage');
  $('picker-close').onclick = () => closePicker();
  $('picker-apply').onclick = applyPicker;
  $('wizard-back').onclick = () => moveWizardStep(-1);
  $('wizard-forward').onclick = () => moveWizardStep(1);
  for (const button of document.querySelectorAll('.picker-step'))
    button.onclick = () => navigateWizardStep(button.dataset.step);
  $('picker-prev').onclick = () => stepSelection(-1);
  $('picker-next').onclick = () => stepSelection(1);
  $('selection-dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    closePicker();
  });
  $('selection-dialog').addEventListener('keydown', (e) => {
    if (e.target.closest('.swatches')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      stepSelection(['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1);
    }
    if (e.key === 'Enter' && e.target.closest('.choice-rail')) {
      e.preventDefault();
      applyPicker();
    }
  });
  syncCarHUD();
}

export function syncCarHUD() {
  $('car-name').textContent = state.activeCar.name.toUpperCase();
  $('car-drive').textContent = state.activeCar.id === 'rally' ? 'AWD' : 'RWD';
  syncTrackChoiceButton();
}

// Shared entry point for startup and returning to setup after a session.
export function openSessionSetup() {
  state.selectingSession = true;
  state.pendingGameMode = state.localMultiplayer
    ? 'local'
    : opponentRace.enabled
      ? 'race'
      : 'trial';
  document.body.classList.add('starting');
  openPicker('garage');
}

export function openPicker(mode) {
  pickerOpener = document.activeElement;
  state.pickerMode = mode;
  state.pendingTrack = state.activeMap.id;
  state.pendingCar = state.activeCar.id;
  state.pendingPaint = state.paint;
  state.pendingPlayerTwoCar = state.playerTwoCar;
  state.pendingPaint = state.paint;
  state.pickerWasPaused = state.paused;
  setPaused(true, false);
  document.body.classList.add('choosing');
  $('selection-dialog').showModal();
  renderPicker();
  $('picker-apply').focus();
}

export function closePicker(resume = false) {
  if (state.selectingSession) {
    if (state.pickerMode !== 'garage') {
      state.pickerMode = state.pickerMode === 'modes' ? 'tracks' : 'garage';
      renderPicker();
      $('picker-apply').focus();
    }
    return;
  }
  $('selection-dialog').close();
  document.body.classList.remove('choosing');
  setPaused(resume ? false : state.pickerWasPaused, false);
  if (pickerOpener?.isConnected && pickerOpener !== document.body)
    pickerOpener.focus();
  else $('open-garage').focus();
}

function selectChoice(id) {
  if (state.pickerMode === 'modes' && id === 'race' && !clubRaceAvailable())
    return;
  state[pendingChoiceKey()] = id;
  renderPicker();
}

export function stepSelection(direction) {
  const ids = Object.keys(pickerChoices()).filter(
    (id) =>
      state.pickerMode !== 'modes' || id !== 'race' || clubRaceAvailable(),
  );
  const current = ids.indexOf(state[pendingChoiceKey()]);
  const focused = document.activeElement.id;
  selectChoice(ids[(current + direction + ids.length) % ids.length]);
  if (focused === 'picker-prev' || focused === 'picker-next')
    $(focused).focus();
  else document.querySelector('.choice-rail .selected').focus();
}

export function renderPicker() {
  const tracks = state.pickerMode === 'tracks';
  const modes = state.pickerMode === 'modes';
  if (modes && state.pendingGameMode === 'race' && !clubRaceAvailable())
    state.pendingGameMode = 'trial';
  const choices = Object.values(pickerChoices());
  const selectedId = state[pendingChoiceKey()];
  const selected = pickerChoices()[selectedId];
  const vehicle = VEHICLES[state.pendingCar];
  $('selection-dialog').dataset.mode = state.pickerMode;
  $('selection-dialog').dataset.track = tracks ? selectedId : '';
  $('picker-title').textContent = modes
    ? 'Choose your mode.'
    : tracks
      ? 'Choose your circuit.'
      : 'Choose your ride.';
  $('picker-eyebrow').textContent = 'APEX / THE DRIVING CLUB';
  $('picker-description').textContent = modes
    ? 'Choose a driving mode.'
    : tracks
      ? vehicle.name + ' · ' + PAINTS[state.pendingPaint].name
      : 'Choose a car and paint.';
  document.querySelector('.picker-steps').hidden = !state.selectingSession;
  document.querySelector('.wizard-nav-actions').hidden =
    !state.selectingSession;
  $('wizard-back').disabled =
    !state.selectingSession || state.pickerMode === 'garage';
  $('wizard-forward').disabled = !state.selectingSession || modes;
  for (const [id, mode] of [
    ['step-car', 'garage'],
    ['step-track', 'tracks'],
    ['step-mode', 'modes'],
  ]) {
    $(id).classList.toggle('active', state.pickerMode === mode);
    $(id).disabled = !state.selectingSession;
    if (state.pickerMode === mode) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
  $('picker-close').hidden =
    state.selectingSession && state.pickerMode === 'garage';
  const closeLabel = state.selectingSession ? 'BACK' : 'ESC / BACK';
  $('picker-close').innerHTML =
    `${renderUiIcon('back', { size: 14 })} ${closeLabel}`;
  $('picker-close').setAttribute(
    'aria-label',
    state.selectingSession
      ? modes
        ? 'Back to circuit selection'
        : 'Back to car selection'
      : 'Close selection',
  );
  const applyLabel = state.selectingSession
    ? modes
      ? 'START DRIVING'
      : tracks
        ? 'NEXT / SELECT GAME MODE'
        : 'NEXT / SELECT CIRCUIT'
    : tracks
      ? 'DRIVE THIS CIRCUIT'
      : 'APPLY & DRIVE';
  $('picker-apply').innerHTML =
    `${applyLabel} ${renderUiIcon('forward', { size: 16 })}`;
  $('picker-footnote').textContent = modes
    ? vehicle.name.toUpperCase() +
      ' / ' +
      MAPS[state.pendingTrack].name.toUpperCase() +
      ' / ' +
      selected.name.toUpperCase()
    : tracks
      ? 'YOUR SESSION / ' +
        vehicle.name.toUpperCase() +
        ' / ' +
        selected.name.toUpperCase()
      : 'SELECTED CAR / ' +
        selected.name.toUpperCase() +
        ' / ' +
        PAINTS[state.pendingPaint].name.toUpperCase();
  $('picker-count').textContent =
    String(choices.findIndex((item) => item.id === selectedId) + 1).padStart(
      2,
      '0',
    ) +
    ' / ' +
    String(choices.length).padStart(2, '0');

  let best = null;
  let medalDetails = '';
  if (tracks) {
    try {
      const value = JSON.parse(
        localStorage.getItem(bestKeyFor(selected, vehicle)),
      );
      if (typeof value === 'number' && value > 0 && Number.isFinite(value))
        best = value;
    } catch (_) {}
    const targets = medalTargetsFor(selected.id, vehicle.id);
    const earned = earnedMedalFor(selected.id, vehicle.id);
    medalDetails = `<div class="medal-progress" aria-label="Medal progress for ${selected.name} and ${vehicle.name}"><span class="medal-earned">EARNED / <b>${earned ? earned.toUpperCase() : 'NONE'}</b></span><div class="medal-targets" aria-label="Medal target times">${['bronze', 'silver', 'gold'].map((medal) => `<span class="medal-target ${medal}" data-medal="${medal}"><b>${medal.toUpperCase()}</b><time>${formatTime(targets[medal])}</time></span>`).join('')}</div></div>`;
  }
  const art = modes
    ? `<canvas id="selected-preview" width="480" height="270" aria-label="${MAPS[state.pendingTrack].name} track layout"></canvas><span class="mode-banner">${selectedId === 'race' ? '4 DRIVERS / 3 LAPS' : selectedId === 'local' ? '2 DRIVERS / SPLIT SCREEN' : SKILL_TRIALS[selectedId] ? 'SHORT DRIVING CHALLENGE' : 'TIME TRIAL'}</span>`
    : tracks
      ? `<canvas id="selected-preview" width="480" height="270" aria-label="${selected.name} track layout"></canvas>`
      : `<img src="${carImagePath(selectedId, state.pendingPaint)}" alt="${selected.name} in ${PAINTS[state.pendingPaint].name} paint">`;
  const details = modes
    ? SKILL_TRIALS[selectedId]
      ? `<div class="mode-summary"><span>${vehicle.name} / ${MAPS[state.pendingTrack].name}</span><span>LOCAL SKILL PROGRESS / ${readSkillProgress()[selectedId]?.completions || 0} COMPLETED · BEST ${readSkillProgress()[selectedId]?.best ?? '—'}%</span></div>`
      : `<div class="mode-summary"><span>CAR / <b>${vehicle.name}</b></span><span>CIRCUIT / <b>${MAPS[state.pendingTrack].name}</b></span><span>${selectedId === 'race' ? 'THREE LAPS · FULL CONTACT' : selectedId === 'local' ? 'THREE LAPS · TWO LOCAL DRIVERS' : 'UNLIMITED LAPS · SAVED BEST TIMES & GHOSTS'}</span>${
          selectedId === 'local'
            ? `<label class="player-two-car" for="player-two-car">PLAYER 2 CAR <select id="player-two-car">${Object.values(
                VEHICLES,
              )
                .map(
                  (car) =>
                    `<option value="${car.id}" ${car.id === state.pendingPlayerTwoCar ? 'selected' : ''}>${car.name}</option>`,
                )
                .join('')}</select></label>`
            : ''
        }</div>`
    : tracks
      ? `<div class="feature-record"><span>PERSONAL BEST / ${vehicle.name.toUpperCase()}</span><strong>${formatTime(best)}</strong></div>${medalDetails}<span class="feature-condition">${selected.temperature} / ${selected.gripLabel}</span>`
      : `<div class="car-stats">${['PACE', 'HANDLING', 'OFF ROAD'].map((label, i) => `<span>${label}<i><b style="width:${selected.bars[i] * 100}%"></b></i></span>`).join('')}</div>`;
  $('picker-content').innerHTML = `
    <div class="selection-feature" style="--card-accent:${tracks ? selected.accent : '#d5f578'}">
      <div class="feature-art ${tracks || modes ? 'track-art' : 'car-platform'}">${art}<span class="feature-watermark" aria-hidden="true">${modes ? 'RACE DAY' : tracks ? 'CIRCUIT' : 'GARAGE'}</span></div>
      <div class="feature-copy" aria-live="polite" aria-atomic="true">
        <span class="choice-tag">${tracks ? selected.label : selected.tag}</span>
        <h3>${selected.name}</h3>
        <p>${selected.description}</p>${details}
      </div>
    </div>
    <div class="choice-rail" aria-label="${modes ? 'Game modes' : tracks ? 'Circuits' : 'Cars'}" style="--choice-count:${choices.length}">
      ${choices.map((item, i) => `<button class="choice-tile ${item.id === selectedId ? 'selected' : ''} ${modes ? 'mode-tile' : ''}" data-choice="${item.id}" aria-label="Choose ${item.name}" aria-pressed="${item.id === selectedId}" ${modes ? `aria-describedby="mode-note-${item.id}"` : ''} ${modes && item.id === 'race' && !clubRaceAvailable() ? 'disabled' : ''}><span class="tile-number">${String(i + 1).padStart(2, '0')}</span>${modes ? modeIcon(item.id) : tracks ? `<span class="tile-biome" style="--card-accent:${item.accent}">●</span>` : `<img src="${carImagePath(item.id, state.pendingPaint)}" alt="">`}<strong>${item.name}</strong>${modes ? `<span class="mode-note" id="mode-note-${item.id}">${item.id === 'trial' ? 'Solo / any car & circuit' : item.id === 'race' ? (clubRaceAvailable() ? 'Alex, Blair & Casey / 3 laps' : 'Requires Juniper + Clubsport R') : item.id === 'local' ? '2 players / split screen' : `${item.tag} / ${readSkillProgress()[item.id]?.completions || 0} complete`}</span>` : ''}<span class="tile-check" aria-hidden="true">${item.id === selectedId ? renderUiIcon('check', { size: 15 }) : ''}</span></button>`).join('')}

    </div>
    ${
      tracks || modes
        ? ''
        : `<div class="paint-row"><span>PAINT / <b>${PAINTS[state.pendingPaint].name}</b></span><div class="swatches">${Object.entries(
            PAINTS,
          )
            .map(
              ([id, color]) =>
                `<button class="swatch ${id === state.pendingPaint ? 'selected' : ''}" data-paint="${id}" aria-label="Paint ${color.name}" aria-pressed="${id === state.pendingPaint}" style="--paint:${color.hex}">${id === state.pendingPaint ? renderUiIcon('check', { size: 14 }) : ''}</button>`,
            )
            .join('')}</div></div>`
    }`;
  if (tracks || modes)
    drawTrackPreview(
      $('selected-preview'),
      modes ? MAPS[state.pendingTrack] : selected,
    );
  for (const button of document.querySelectorAll('[data-choice]')) {
    button.onclick = () => {
      selectChoice(button.dataset.choice);
      document.querySelector('.choice-rail .selected').focus();
    };
  }
  for (const button of document.querySelectorAll('[data-paint]')) {
    button.onclick = () => {
      state.pendingPaint = button.dataset.paint;
      renderPicker();
      document.querySelector(`[data-paint="${state.pendingPaint}"]`).focus();
    };
  }
  const playerTwoCar = $('player-two-car');
  if (playerTwoCar)
    playerTwoCar.onchange = () => {
      state.pendingPlayerTwoCar = playerTwoCar.value;
      renderPicker();
    };
}

export function applyPicker() {
  const startingSession = state.selectingSession;
  const selectedSkill = startingSession ? state.pendingGameMode : null;
  if (state.selectingSession && state.pickerMode !== 'modes') {
    state.pickerMode = state.pickerMode === 'garage' ? 'tracks' : 'modes';
    renderPicker();
    $('picker-apply').focus();
    return;
  }
  if (state.selectingSession || state.pickerMode === 'garage') {
    const changed = state.pendingCar !== state.activeCar.id;
    configureCar(state.pendingCar, state.pendingPaint);
    loadCarArt();
    try {
      localStorage.setItem(
        'apex-garage',
        JSON.stringify({ car: state.activeCar.id, paint: state.paint }),
      );
    } catch (_) {}
    if (changed && !state.selectingSession)
      changeTrack(state.activeMap.id, false);
    syncCarHUD();
  }
  state.localMultiplayer = state.pendingGameMode === 'local';
  if (state.localMultiplayer) state.playerTwoCar = state.pendingPlayerTwoCar;
  if (
    state.selectingSession ||
    (state.pickerMode === 'tracks' && state.pendingTrack !== state.activeMap.id)
  ) {
    if (state.selectingSession)
      opponentRace.enabled =
        state.pendingGameMode === 'race' && clubRaceAvailable();
    if (state.selectingSession)
      state.localMultiplayer = state.pendingGameMode === 'local';
    changeTrack(state.pendingTrack, false);
  }
  if (startingSession && SKILL_TRIALS[state.pendingGameMode])
    opponentRace.enabled = false;
  state.selectingSession = false;
  document.body.classList.remove('starting');
  closePicker(true);
  if (SKILL_TRIALS[selectedSkill]) beginSkillTrial(selectedSkill);
  if (startingSession) $('game').focus();
  syncCarHUD();
  notify(
    state.activeMap.name.toUpperCase() +
      ' · ' +
      state.activeCar.name.toUpperCase(),
  );
}

export function drawTrackPreview(canvas, map) {
  previewCanvas = canvas;
  previewMap = map;
  if (typeof ResizeObserver !== 'undefined') {
    if (!previewObserver) {
      previewObserver = new ResizeObserver(redrawTrackPreview);
    }
    previewObserver.disconnect();
    previewObserver.observe(canvas);
  }
  paintTrackPreview(canvas, map);
}

function paintTrackPreview(canvas, map) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const pixelRatio = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(rect.width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const c = canvas.getContext('2d'),
    scaleToFit = Math.min(canvas.width / 480, canvas.height / 270),
    offsetX = (canvas.width - 480 * scaleToFit) / 2,
    offsetY = (canvas.height - 270 * scaleToFit) / 2,
    points = sampleMap(map, 16),
    xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys),
    scale = Math.min(380 / (right - left), 205 / (bottom - top));
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle =
    map.previewColor ||
    (map.id === 'city'
      ? '#687d75'
      : map.id === 'coast'
        ? '#287f92'
        : map.id === 'amazonas'
          ? '#214735'
          : map.id === 'canyon'
            ? '#694a37'
            : map.id === 'alpine'
              ? '#52686e'
              : map.id === 'rallycross'
                ? '#5b5b3e'
                : map.id === 'drift'
                  ? '#1b4654'
                  : '#354b3d');
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.translate(offsetX, offsetY);
  c.scale(scaleToFit, scaleToFit);
  const rand = seededRandom(
    map.id === 'canyon'
      ? 513
      : map.id === 'alpine'
        ? 719
        : map.id === 'drift'
          ? 774
          : map.id === 'summit'
            ? 941
            : 318,
  );
  for (let i = 0; i < 24; i++) {
    c.fillStyle =
      map.id === 'canyon'
        ? '#bf80572b'
        : map.id === 'alpine'
          ? '#d6ebe324'
          : map.id === 'summit'
            ? '#f4d4a21b'
            : '#a5c78516';
    c.beginPath();
    c.ellipse(
      rand() * 480,
      rand() * 270,
      10 + rand() * 45,
      8 + rand() * 30,
      rand() * 6.28,
      0,
      6.28,
    );
    c.fill();
  }
  c.save();
  c.translate(240, 135);
  c.scale(scale, scale);
  c.translate(-(left + right) / 2, -(top + bottom) / 2);
  if (map.id === 'city')
    paintCityGround(c, {
      x: left - 600,
      y: top - 600,
      width: right - left + 1200,
      height: bottom - top + 1200,
    });
  if (map.id === 'coast') {
    paintCoastGround(
      c,
      {
        x: left - 600,
        y: top - 600,
        width: right - left + 1200,
        height: bottom - top + 1200,
      },
      false,
    );
    c.fillStyle = '#f4e6ce';
    c.beginPath();
    c.arc(coast.lighthouse.x, coast.lighthouse.y, 38, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d47f61';
    c.beginPath();
    c.arc(coast.lighthouse.x, coast.lighthouse.y, 20, 0, Math.PI * 2);
    c.fill();
  }
  if (map.id === 'amazonas') paintAmazonRiver(c, false);
  ribbon(c, '#12202166', 20 / scale, points);
  ribbon(c, map.accent, 9 / scale, points);
  ribbon(c, '#243435', 5 / scale, points);
  if (map.id === 'amazonas') {
    c.save();
    c.globalAlpha = 0.8;
    paintAmazonRiver(c, false);
    c.restore();
  }
  if (map.id === 'rallycross') {
    c.strokeStyle = '#d1a873';
    c.lineWidth = 5 / scale;
    for (let i = 0; i < points.length; i++) {
      if (!dirtProgress(i / points.length)) continue;
      const p = points[i],
        q = points[(i + 1) % points.length];
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(q.x, q.y);
      c.stroke();
    }
  }
  for (const patch of map.patches) {
    const p = points[Math.floor(patch.progress * points.length)];
    c.fillStyle =
      patch.type === 'ICE'
        ? '#c7f6ff'
        : patch.type === 'OIL'
          ? '#b8a4f9'
          : '#efb571';
    c.beginPath();
    c.arc(p.x, p.y, 3.2 / scale, 0, 6.28);
    c.fill();
  }
  c.fillStyle = '#fff5dc';
  const start = points[0];
  c.beginPath();
  c.arc(start.x, start.y, 4 / scale, 0, 6.28);
  c.fill();
  c.restore();
  c.restore();
}

export function setPaused(value, moveFocus = true) {
  const changed = state.paused !== value;
  state.paused = value;
  keys.clear();
  state.accumulator = 0;
  $('pause-screen').classList.toggle('open', state.paused);
  setButtonContent(
    'pause',
    state.paused ? 'play' : 'pause',
    state.paused ? 'Resume' : 'Pause',
    {
      size: 14,
    },
  );
  $('pause').setAttribute(
    'aria-label',
    state.paused ? 'Resume game' : 'Pause game',
  );
  $('pause').setAttribute('aria-pressed', String(state.paused));
  if (changed && moveFocus && !document.querySelector('dialog[open]')) {
    if (state.paused) {
      pauseOpener = document.activeElement;
      $('resume').focus();
    } else if (pauseOpener?.isConnected && pauseOpener !== document.body) {
      pauseOpener.focus();
    } else $('pause').focus();
  }
  if (state.engineGain)
    state.engineGain.gain.setTargetAtTime(
      !state.paused && state.soundEnabled ? 0.014 + car.throttle * 0.018 : 0,
      state.audioCtx.currentTime,
      0.05,
    );
}

export function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  state.toastTimer = 3.5;
}

export function formatTime(t) {
  if (t === null) return '— — : — —';
  const ms = Math.floor(t * 1000),
    minutes = Math.floor(ms / 60000),
    seconds = Math.floor(ms / 1000) % 60;
  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0') +
    '.' +
    String(ms % 1000).padStart(3, '0')
  );
}

export function formatSector(t) {
  return Number.isFinite(t) ? t.toFixed(3) + 's' : '—';
}

export function formatDelta(t) {
  return Number.isFinite(t)
    ? (t < 0 ? '−' : '+') + Math.abs(t).toFixed(3) + 's'
    : '—';
}

function coachingLabel(delta) {
  if (!Number.isFinite(delta)) return '—';
  const ahead = delta <= 0;
  return `${ahead ? '▼ AHEAD' : '▲ BEHIND'} ${formatDelta(delta)}`;
}

export function updateHUD() {
  updateOpponentHUD();
  $('touch-rewind').hidden = opponentRace.enabled;
  const speed = Math.hypot(car.vx, car.vy),
    signed = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle),
    kmh = Math.round(speed * 0.46);
  $('speed').textContent = kmh;
  $('gear').textContent =
    speed < 5
      ? 'N'
      : signed < 0
        ? 'R'
        : Math.min(
            state.activeCar.id === 'formula' ? 8 : 5,
            1 + Math.floor(kmh / (state.activeCar.id === 'formula' ? 42 : 36)),
          );
  $('rpm').style.width =
    Math.min(
      100,
      (kmh /
        (state.activeCar.id === 'formula'
          ? 340
          : state.activeCar.id === 'drift'
            ? 190
            : state.activeCar.id === 'muscle'
              ? 220
              : 170)) *
        100,
    ) + '%';
  $('throttle').style.width = car.throttle * 100 + '%';
  $('brake').style.width = car.brake * 100 + '%';
  $('clock').textContent = formatTime(race.time);
  $('best').textContent = formatTime(race.best);
  $('last').textContent = formatTime(race.last);
  $('lap').textContent = opponentRace.enabled
    ? Math.min(race.lap, opponentRace.laps) + ' / ' + opponentRace.laps
    : String(race.lap).padStart(2, '0');
  const surfaceLabel =
    car.slickTime > 0 && car.surface !== 'OIL'
      ? 'OILY TIRES'
      : car.slip > 35 && car.surface === 'ASPHALT'
        ? 'SLIDING'
        : car.surface;
  $('surface').textContent = '●  ' + surfaceLabel;
  $('surface').style.color =
    car.surface === 'ICE'
      ? '#c0f0ff'
      : car.slickTime > 0
        ? '#c8b7ed'
        : car.surface.startsWith('SAND')
          ? '#ffd49a'
          : car.surface === 'SNOW'
            ? '#e0f4ff'
            : car.surface === 'GRAVEL'
              ? '#e9c795'
              : car.surface === 'GRASS'
                ? '#b5d686'
                : state.activeMap.accent;
  $('clock').style.color = race.invalid ? '#e7a083' : '';
  $('lap-coaching').hidden = !state.settings.showLapCoaching;
  $('lap-coaching-sectors').hidden = !state.settings.showLapCoaching;
  [...$('sector').children].forEach((el, i) =>
    el.classList.toggle('passed', i < race.next - 1),
  );
  const status =
    car.surface === 'PIT LANE'
      ? state.activeMap.id === 'city'
        ? 'SERVICE ROAD'
        : 'PIT LANE · PADDOCK ACCESS'
      : car.surface === 'FORD'
        ? 'RIVER FORD · SHALLOW WATER'
        : car.coconutSlip > 0
          ? 'COCONUT HIT · HOLD YOUR LINE'
          : car.surface === 'ICE'
            ? 'ICE · LOW GRIP'
            : car.slickTime > 0
              ? 'OIL · GRIP RECOVERING'
              : car.surface === 'DIRT'
                ? 'DIRT · LOOSE SURFACE'
                : car.surface.startsWith('SAND')
                  ? 'SAND · LOSING SPEED'
                  : car.slip > 35
                    ? 'SLIDING · COUNTERSTEER'
                    : car.brake && speed > 40
                      ? 'BRAKING'
                      : car.surface +
                        ' · ' +
                        (race.started ? 'ON TRACK' : 'READY');
  $('grip-status').textContent = status;
  $('grip-status').style.color = $('surface').style.color;
  const delta = race.invalid
    ? null
    : race.started && race.crossedStart
      ? lapCoachingDelta(timing.splits, timing.best, race.time, race.previous)
      : null;
  $('lap-delta').textContent = race.invalid
    ? 'INVALID LAP'
    : coachingLabel(delta);
  $('lap-delta').style.color =
    delta === null ? '#9eb0a4' : delta <= 0 ? '#d5f578' : '#f0a28a';
  for (let i = 0; i < 4; i++) {
    const running = race.started && i === race.next - 1,
      value =
        timing.splits[i] ??
        (running
          ? Math.max(0, race.time - timing.sectorStart)
          : (timing.best[i] ?? timing.last[i] ?? null)),
      difference =
        timing.splits[i] !== undefined && timing.best[i] !== undefined
          ? timing.splits[i] - timing.best[i]
          : null;
    $('sector-time-' + i).textContent =
      value === null ? '—' : formatSector(value);
    $('sector-time-' + i).style.color = running
      ? state.activeMap.accent
      : '#e5ede2';
    $('sector-diff-' + i).textContent =
      difference !== null
        ? coachingLabel(difference)
        : running
          ? 'RUNNING'
          : timing.best[i] !== undefined
            ? 'PERSONAL BEST'
            : '';
    $('sector-diff-' + i).style.color =
      difference === null ? '#8fa697' : difference <= 0 ? '#d5f578' : '#efa18b';
  }
  $('split-flash').textContent =
    timing.flashTime > 0
      ? timing.flashLabel +
        (timing.flashDelta !== null
          ? ' / ' + formatDelta(timing.flashDelta)
          : '')
      : '';
  $('ghost-status').textContent = opponentRace.enabled
    ? 'GHOST · Hidden during club races'
    : ghostStatus();
  const ghostDelta = opponentRace.enabled ? null : liveGhostDelta();
  $('ghost-delta').textContent = formatDelta(ghostDelta);
  $('ghost-delta').style.color =
    ghostDelta === null ? '#9eb0a4' : ghostDelta <= 0 ? '#d5f578' : '#f0a28a';
  $('start-countdown').textContent =
    race.countdown > 0
      ? String(Math.ceil(race.countdown))
      : race.goTime > 0
        ? 'GO!'
        : '';
  $('sector-status').textContent = timing.best.length
    ? 'Comparing with your best lap sectors.'
    : 'Complete a clean lap to set sector references.';
}
