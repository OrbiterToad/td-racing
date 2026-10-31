import { updateOpponentHUD } from './opponents.js';
import { bestKeyFor, carImagePath, configureCar, loadCarArt } from './cars.js';
import { coast, paintCoastGround } from './coast.js';
import { MAPS, PAINTS, VEHICLES } from './config.js';
import { ghostStatus, liveGhostDelta } from './ghost.js';
import { paintAmazonRiver } from './jungle.js';
import { seededRandom } from './math.js';
import { ribbon } from './renderer.js';
import { changeTrack } from './runtime.js';
import { car, keys, opponentRace, race, state, timing } from './state.js';
import { paintCityGround } from './terrain.js';
import { dirtProgress, sampleMap } from './tracks.js';

export const $ = (id) => document.getElementById(id);

let pickerOpener;
let pauseOpener;

const GAME_MODES = {
  trial: {
    id: 'trial',
    name: 'Time trial',
    tag: 'SOLO / CHASE YOUR PERSONAL BEST',
    description:
      'An open track. Unlimited laps. Find your rhythm, set a clean lap and chase your best-lap ghost.',
  },
  race: {
    id: 'race',
    name: 'Club race',
    tag: '4 DRIVERS / 3 LAPS',
    description:
      'Line up against Alex, Blair and Casey. Three laps, fixed opponent pace and a race to the finish. Non-contact racing.',
  },
};

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

function pendingChoiceKey() {
  return state.pickerMode === 'modes'
    ? 'pendingGameMode'
    : state.pickerMode === 'tracks'
      ? 'pendingTrack'
      : 'pendingCar';
}

export function initPicker() {
  $('open-tracks').onclick = () => openPicker('tracks');
  $('open-garage').onclick = () => openPicker('garage');
  $('picker-close').onclick = () => closePicker();
  $('picker-apply').onclick = applyPicker;
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
  $('open-tracks').setAttribute(
    'aria-label',
    'Tracks: ' + state.activeMap.name,
  );
}

// Shared entry point for startup and returning to setup after a session.
export function openSessionSetup() {
  state.selectingSession = true;
  state.pendingGameMode = opponentRace.enabled ? 'race' : 'trial';
  document.body.classList.add('starting');
  openPicker('garage');
}

export function openPicker(mode) {
  pickerOpener = document.activeElement;
  state.pickerMode = mode;
  state.pendingTrack = state.activeMap.id;
  state.pendingCar = state.activeCar.id;
  state.pendingPaint = state.paint;
  state.pickerWasPaused = state.paused;
  setPaused(true, false);
  document.body.classList.add('choosing');
  renderPicker();
  $('selection-dialog').showModal();
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

function stepSelection(direction) {
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
  if (modes && !clubRaceAvailable()) state.pendingGameMode = 'trial';
  const choices = Object.values(pickerChoices());
  const selectedId = state[pendingChoiceKey()];
  const selected = pickerChoices()[selectedId];
  const vehicle = VEHICLES[state.pendingCar];
  $('selection-dialog').dataset.mode = state.pickerMode;
  $('picker-title').textContent = modes
    ? 'Choose your mode.'
    : tracks
      ? 'Choose your circuit.'
      : 'Choose your ride.';
  $('picker-eyebrow').textContent = 'APEX / THE DRIVING CLUB';
  $('picker-description').textContent = modes
    ? 'One last choice. How do you want to drive?'
    : tracks
      ? vehicle.name +
        ' · ' +
        PAINTS[state.pendingPaint].name +
        ' / Find your next apex.'
      : 'Six machines. Five colors. Make the grid your own.';
  document.querySelector('.picker-steps').hidden = !state.selectingSession;
  for (const [id, mode] of [
    ['step-car', 'garage'],
    ['step-track', 'tracks'],
    ['step-mode', 'modes'],
  ]) {
    $(id).classList.toggle('active', state.pickerMode === mode);
    if (state.pickerMode === mode) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
  $('picker-close').hidden =
    state.selectingSession && state.pickerMode === 'garage';
  $('picker-close').textContent = state.selectingSession
    ? '← BACK'
    : 'ESC / BACK';
  $('picker-close').setAttribute(
    'aria-label',
    state.selectingSession
      ? modes
        ? 'Back to circuit selection'
        : 'Back to car selection'
      : 'Close selection',
  );
  $('picker-apply').textContent = state.selectingSession
    ? modes
      ? 'START DRIVING →'
      : tracks
        ? 'NEXT / SELECT GAME MODE →'
        : 'NEXT / SELECT CIRCUIT →'
    : tracks
      ? 'DRIVE THIS CIRCUIT →'
      : 'APPLY & DRIVE →';
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
      : 'YOUR RIDE / ' +
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
  if (tracks) {
    try {
      const value = JSON.parse(
        localStorage.getItem(bestKeyFor(selected, vehicle)),
      );
      if (typeof value === 'number' && value > 0 && Number.isFinite(value))
        best = value;
    } catch (_) {}
  }
  const art = modes
    ? `<canvas id="selected-preview" width="480" height="270" aria-label="${MAPS[state.pendingTrack].name} track layout"></canvas><span class="mode-banner">${selectedId === 'race' ? '4 DRIVERS / 3 LAPS' : 'YOUR TRACK. YOUR PACE.'}</span>`
    : tracks
      ? `<canvas id="selected-preview" width="480" height="270" aria-label="${selected.name} track layout"></canvas>`
      : `<img src="${carImagePath(selectedId, state.pendingPaint)}" alt="${selected.name} in ${PAINTS[state.pendingPaint].name} paint">`;
  const details = modes
    ? `<div class="mode-summary"><span>CAR / <b>${vehicle.name}</b></span><span>CIRCUIT / <b>${MAPS[state.pendingTrack].name}</b></span><span>${selectedId === 'race' ? 'THREE LAPS · NON-CONTACT OPPONENTS' : 'UNLIMITED LAPS · SAVED BEST TIMES & GHOSTS'}</span></div>`
    : tracks
      ? `<div class="feature-record"><span>PERSONAL BEST / ${vehicle.name.toUpperCase()}</span><strong>${formatTime(best)}</strong></div><span class="feature-condition">${selected.temperature} / ${selected.gripLabel}</span>`
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
      ${choices.map((item, i) => `<button class="choice-tile ${item.id === selectedId ? 'selected' : ''} ${modes ? 'mode-tile' : ''}" data-choice="${item.id}" aria-label="Choose ${item.name}" aria-pressed="${item.id === selectedId}" ${modes ? `aria-describedby="mode-note-${item.id}"` : ''} ${modes && item.id === 'race' && !clubRaceAvailable() ? 'disabled' : ''}><span class="tile-number">${String(i + 1).padStart(2, '0')}</span>${modes ? '' : tracks ? `<span class="tile-biome" style="--card-accent:${item.accent}">●</span>` : `<img src="${carImagePath(item.id, state.pendingPaint)}" alt="">`}<strong>${item.name}</strong>${modes ? `<span class="mode-note" id="mode-note-${item.id}">${item.id === 'trial' ? 'Solo / any car & circuit' : clubRaceAvailable() ? 'Alex, Blair & Casey / 3 laps' : 'Requires Juniper + Clubsport R'}</span>` : ''}<span class="tile-check" aria-hidden="true">${item.id === selectedId ? '✓' : ''}</span></button>`).join('')}

    </div>
    ${
      tracks || modes
        ? ''
        : `<div class="paint-row"><span>PAINT / <b>${PAINTS[state.pendingPaint].name}</b></span><div class="swatches">${Object.entries(
            PAINTS,
          )
            .map(
              ([id, color]) =>
                `<button class="swatch ${id === state.pendingPaint ? 'selected' : ''}" data-paint="${id}" aria-label="Paint ${color.name}" aria-pressed="${id === state.pendingPaint}" style="--paint:${color.hex}">${id === state.pendingPaint ? '✓' : ''}</button>`,
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
}

export function applyPicker() {
  const startingSession = state.selectingSession;
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
  if (
    state.selectingSession ||
    (state.pickerMode === 'tracks' && state.pendingTrack !== state.activeMap.id)
  ) {
    if (state.selectingSession)
      opponentRace.enabled =
        state.pendingGameMode === 'race' && clubRaceAvailable();
    changeTrack(state.pendingTrack, false);
  }
  state.selectingSession = false;
  document.body.classList.remove('starting');
  closePicker(true);
  if (startingSession) $('game').focus();
  syncCarHUD();
  notify(
    state.activeMap.name.toUpperCase() +
      ' · ' +
      state.activeCar.name.toUpperCase(),
  );
}

export function drawTrackPreview(canvas, map) {
  const c = canvas.getContext('2d'),
    points = sampleMap(map, 16),
    xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys),
    scale = Math.min(380 / (right - left), 205 / (bottom - top));
  c.fillStyle =
    map.id === 'city'
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
                : '#354b3d';
  c.fillRect(0, 0, 480, 270);
  const rand = seededRandom(
    map.id === 'canyon' ? 513 : map.id === 'alpine' ? 719 : 318,
  );
  for (let i = 0; i < 24; i++) {
    c.fillStyle =
      map.id === 'canyon'
        ? '#bf80572b'
        : map.id === 'alpine'
          ? '#d6ebe324'
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
}

export function setPaused(value, moveFocus = true) {
  const changed = state.paused !== value;
  state.paused = value;
  keys.clear();
  state.accumulator = 0;
  $('pause-screen').classList.toggle('open', state.paused);
  $('pause').textContent = state.paused ? '▶ Resume' : 'Ⅱ Pause';
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
      state.paused ? 0 : 0.025,
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

export function updateHUD() {
  updateOpponentHUD();
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
  const delta =
    race.invalid || timing.flashTime <= 0 ? null : timing.flashDelta;
  $('lap-delta').textContent = race.invalid
    ? 'INVALID LAP'
    : formatDelta(delta);
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
        ? formatDelta(difference)
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
