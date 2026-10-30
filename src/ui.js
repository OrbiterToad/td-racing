import { bestKeyFor, carImagePath, configureCar, loadCarArt } from './cars.js';
import { coast, paintCoastGround } from './coast.js';
import { MAPS, PAINTS, VEHICLES } from './config.js';
import { ghostStatus, liveGhostDelta } from './ghost.js';
import { paintAmazonRiver } from './jungle.js';
import { seededRandom } from './math.js';
import { ribbon } from './renderer.js';
import { changeTrack } from './runtime.js';
import { car, keys, race, state, timing } from './state.js';
import { paintCityGround } from './terrain.js';
import { dirtProgress, sampleMap } from './tracks.js';

export const $ = (id) => document.getElementById(id);

export function initPicker() {
  $('open-tracks').onclick = () => openPicker('tracks');
  $('open-garage').onclick = () => openPicker('garage');
  $('picker-close').onclick = () => closePicker();
  $('picker-apply').onclick = applyPicker;
  $('selection-dialog').addEventListener('cancel', (e) => {
    e.preventDefault();
    closePicker();
  });
  $('selection-dialog').addEventListener('click', (e) => {
    if (e.target === $('selection-dialog')) closePicker();
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

export function openPicker(mode) {
  state.pickerMode = mode;
  state.pendingTrack = state.activeMap.id;
  state.pendingCar = state.activeCar.id;
  state.pendingPaint = state.paint;
  state.pickerWasPaused = state.paused;
  setPaused(true);
  document.body.classList.add('choosing');
  renderPicker();
  $('selection-dialog').showModal();
}

export function closePicker(resume = false) {
  $('selection-dialog').close();
  document.body.classList.remove('choosing');
  setPaused(resume ? false : state.pickerWasPaused);
}

export function renderPicker() {
  const tracks = state.pickerMode === 'tracks';
  $('picker-title').textContent = tracks
    ? 'Find your next apex.'
    : 'Make it yours.';
  $('picker-eyebrow').textContent = tracks
    ? 'THE CIRCUIT COLLECTION'
    : 'THE CLUB GARAGE';
  $('picker-description').textContent = tracks
    ? Object.keys(MAPS).length +
      ' landscapes. A different challenge on every circuit. Records for ' +
      state.activeCar.name +
      '.'
    : 'Choose your handling, then your paint. Changing cars starts a fresh run.';
  $('picker-apply').textContent = tracks
    ? state.pendingTrack === state.activeMap.id
      ? 'CONTINUE ON TRACK →'
      : 'DRIVE ' + MAPS[state.pendingTrack].name.toUpperCase() + ' →'
    : 'APPLY & DRIVE →';
  $('picker-footnote').textContent = tracks
    ? 'Each track and car has its own saved personal best.'
    : 'Paint is cosmetic. Your car and color are remembered.';
  if (tracks) {
    $('picker-content').innerHTML =
      '<div class="choice-grid">' +
      Object.values(MAPS)
        .map((map, i) => {
          let best = null;
          try {
            const value = JSON.parse(
              localStorage.getItem(bestKeyFor(map, state.activeCar)),
            );
            if (
              typeof value === 'number' &&
              value > 0 &&
              Number.isFinite(value)
            )
              best = value;
          } catch (_) {}
          const selected = map.id === state.pendingTrack;
          return (
            '<button class="track-choice ' +
            (selected ? 'selected' : '') +
            '" data-track="' +
            map.id +
            '" aria-label="Choose ' +
            map.name +
            '" aria-pressed="' +
            selected +
            '" style="--card-accent:' +
            map.accent +
            '"><span class="choice-number">0' +
            (i + 1) +
            ' / ' +
            (map.id === 'city'
              ? 'CITY'
              : map.id === 'coast'
                ? 'COAST'
                : map.id === 'amazonas'
                  ? 'JUNGLE'
                  : map.id === 'juniper'
                    ? 'WOODLAND'
                    : map.id === 'canyon'
                      ? 'DESERT'
                      : map.id === 'rallycross'
                        ? 'RALLYCROSS'
                        : 'ALPINE') +
            '</span><span class="choice-check">' +
            (selected ? '✓' : '↗') +
            '</span><canvas id="preview-' +
            map.id +
            '" width="480" height="270" aria-label="' +
            map.name +
            ' track layout"></canvas><span class="choice-body"><span class="choice-tag">' +
            map.label +
            '</span><strong>' +
            map.name +
            '</strong><span class="choice-description">' +
            map.description +
            '</span><span class="choice-details"><span>' +
            map.temperature +
            ' · ' +
            (map.id === 'city'
              ? 'LIGHT TRAFFIC'
              : map.id === 'coast'
                ? '2 SAND DRIFTS'
                : map.id === 'amazonas'
                  ? '2 FORDS + COCONUTS'
                  : map.id === 'canyon'
                    ? 'NARROW PASSES'
                    : map.id === 'alpine'
                      ? '3 ICE PATCHES'
                      : map.id === 'rallycross'
                        ? 'ASPHALT + DIRT'
                        : '3 OIL SLICKS') +
            '</span><span class="choice-best">BEST ' +
            formatTime(best) +
            '</span></span></span></button>'
          );
        })
        .join('') +
      '</div>';
    for (const map of Object.values(MAPS)) {
      drawTrackPreview($('preview-' + map.id), map);
      document.querySelector('[data-track="' + map.id + '"]').onclick = () => {
        state.pendingTrack = map.id;
        renderPicker();
        document.querySelector('[data-track="' + map.id + '"]').focus();
      };
    }
  } else {
    $('picker-content').innerHTML =
      '<div class="choice-grid garage-grid">' +
      Object.values(VEHICLES)
        .map((vehicle) => {
          const selected = vehicle.id === state.pendingCar;
          return (
            '<button class="car-choice ' +
            (selected ? 'selected' : '') +
            '" data-car="' +
            vehicle.id +
            '" aria-label="Choose ' +
            vehicle.name +
            '" aria-pressed="' +
            selected +
            '"><span class="choice-check">' +
            (selected ? '✓' : '↗') +
            '</span><span class="car-platform"><img src="' +
            carImagePath(vehicle.id, state.pendingPaint) +
            '" alt="' +
            vehicle.name +
            ' in ' +
            PAINTS[state.pendingPaint].name +
            ' paint"></span><span class="choice-body"><span class="choice-tag">' +
            vehicle.tag +
            '</span><strong>' +
            vehicle.name +
            '</strong><span class="choice-description">' +
            vehicle.description +
            '</span><span class="car-stats">' +
            ['PACE', 'HANDLING', 'OFF ROAD']
              .map(
                (label, i) =>
                  '<span>' +
                  label +
                  '<i><b style="width:' +
                  vehicle.bars[i] * 100 +
                  '%"></b></i></span>',
              )
              .join('') +
            '</span></span></button>'
          );
        })
        .join('') +
      '</div><div class="paint-row"><span>PAINT / <b>' +
      PAINTS[state.pendingPaint].name +
      '</b></span><div class="swatches">' +
      Object.entries(PAINTS)
        .map(
          ([id, color]) =>
            '<button class="swatch ' +
            (id === state.pendingPaint ? 'selected' : '') +
            '" data-paint="' +
            id +
            '" aria-label="Paint ' +
            color.name +
            '" aria-pressed="' +
            (id === state.pendingPaint) +
            '" style="--paint:' +
            color.hex +
            '">' +
            (id === state.pendingPaint ? '✓' : '') +
            '</button>',
        )
        .join('') +
      '</div></div>';
    for (const vehicle of Object.values(VEHICLES))
      document.querySelector('[data-car="' + vehicle.id + '"]').onclick =
        () => {
          state.pendingCar = vehicle.id;
          renderPicker();
          document.querySelector('[data-car="' + vehicle.id + '"]').focus();
        };
    for (const id of Object.keys(PAINTS))
      document.querySelector('[data-paint="' + id + '"]').onclick = () => {
        state.pendingPaint = id;
        renderPicker();
        document.querySelector('[data-paint="' + id + '"]').focus();
      };
  }
}

export function applyPicker() {
  if (state.pickerMode === 'tracks') {
    if (state.pendingTrack !== state.activeMap.id)
      changeTrack(state.pendingTrack, false);
  } else {
    const changed = state.pendingCar !== state.activeCar.id;
    configureCar(state.pendingCar, state.pendingPaint);
    loadCarArt();
    try {
      localStorage.setItem(
        'apex-garage',
        JSON.stringify({ car: state.activeCar.id, paint: state.paint }),
      );
    } catch (_) {}
    if (changed) changeTrack(state.activeMap.id, false);
    syncCarHUD();
  }
  closePicker(true);
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

export function setPaused(value) {
  state.paused = value;
  keys.clear();
  state.accumulator = 0;
  $('pause-screen').classList.toggle('open', state.paused);
  $('pause').textContent = state.paused ? '▶ Resume' : 'Ⅱ Pause';
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
  $('lap').textContent = String(race.lap).padStart(2, '0');
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
  $('ghost-status').textContent = ghostStatus();
  const ghostDelta = liveGhostDelta();
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
