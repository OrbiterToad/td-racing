let dialog;
let dismissedFinish = null;
let actions = { raceAgain() {}, backToSetup() {} };

export function configureRaceResultsActions(nextActions) {
  actions = { ...actions, ...nextActions };
}

export function buildRaceResultsModel({ standings, totalTime, bestLap }) {
  const rows = standings.map((entry, index) => {
    const finished = Number.isFinite(entry.finish);
    return {
      position: index + 1,
      name: entry.player ? 'You' : entry.name,
      player: Boolean(entry.player),
      paint: entry.paint,
      finished,
      time: finished ? entry.finish : null,
      status: finished ? 'FINISHED' : 'STILL RACING',
    };
  });
  return {
    position: rows.find((row) => row.player)?.position ?? null,
    totalTime,
    bestLap,
    rows,
  };
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.floor(seconds / 60),
    remainder = (seconds % 60).toFixed(3).padStart(6, '0');
  return String(minutes).padStart(2, '0') + ':' + remainder;
}

function ensureDialog() {
  if (dialog) return dialog;
  const style = document.createElement('style');
  style.id = 'race-results-style';
  style.textContent = `
    #race-results {
      width: min(920px, calc(100vw - 32px));
      max-width: none;
      max-height: calc(100dvh - 28px);
      padding: 0;
      overflow: hidden;
      border: 1px solid #ffffff2e;
      border-radius: 14px;
      background: #111a1ceF;
      color: var(--ink, #edf0e8);
      box-shadow: 0 28px 100px #000b;
      font-family: Barlow, Arial, sans-serif;
    }
    #race-results::backdrop { background: #091011c9; backdrop-filter: blur(5px); }
    #race-results .rr-frame {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto;
      gap: 18px;
      max-height: calc(100dvh - 30px);
      padding: 30px 34px 28px;
    }
    #race-results .rr-heading {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 20px;
      border-bottom: 1px solid #ffffff22;
      padding-bottom: 15px;
    }
    #race-results .rr-kicker,
    #race-results .rr-label {
      color: #9eafa7;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    #race-results .rr-heading h1 {
      margin: 4px 0 0;
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 800;
      letter-spacing: .015em;
      line-height: .98;
      text-transform: uppercase;
    }
    #race-results .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    #race-results .rr-flag { color: var(--lime, #d5f578); font-size: 12px; letter-spacing: 2px; }
    #race-results .rr-summary {
      display: grid;
      grid-template-columns: 1.05fr 1fr 1fr;
      gap: 10px;
    }
    #race-results .rr-stat {
      min-width: 0;
      padding: 14px 16px 12px;
      border: 1px solid #ffffff1a;
      border-radius: 6px;
      background: #1b2729ad;
    }
    #race-results .rr-stat:first-child { border-color: #d5f57863; }
    #race-results .rr-value {
      display: block;
      margin-top: 5px;
      color: var(--lime, #d5f578);
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-size: clamp(26px, 4vw, 38px);
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    #race-results .rr-stat:not(:first-child) .rr-value { color: #edf0e8; }
    #race-results .rr-standings { min-height: 0; }
    #race-results .rr-table-head,
    #race-results .rr-row {
      display: grid;
      grid-template-columns: 54px minmax(100px, 1fr) minmax(105px, .55fr);
      align-items: center;
      gap: 12px;
    }
    #race-results .rr-table-head {
      padding: 0 13px 8px;
      color: #859790;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1.6px;
      text-transform: uppercase;
    }
    #race-results .rr-table-head span:last-child { text-align: right; }
    #race-results .rr-list { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
    #race-results .rr-row {
      min-height: 46px;
      padding: 6px 13px;
      border: 1px solid #ffffff12;
      border-radius: 5px;
      background: #ffffff08;
    }
    #race-results .rr-row[data-player='true'] {
      border-color: #d5f57877;
      background: #d5f57812;
    }
    #race-results .rr-place {
      color: #a5b4ae;
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-size: 20px;
      font-weight: 700;
    }
    #race-results .rr-name { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; }
    #race-results .rr-swatch { width: 8px; height: 8px; border-radius: 50%; background: var(--rr-paint, #d5f578); box-shadow: 0 0 9px color-mix(in srgb, var(--rr-paint, #d5f578) 45%, transparent); }
    #race-results .rr-status { color: #cbd4cf; font-size: 10px; font-weight: 700; letter-spacing: 1.1px; text-align: right; }
    #race-results .rr-row[data-finished='true'] .rr-status { color: var(--lime, #d5f578); font-variant-numeric: tabular-nums; }
    #race-results .rr-row[data-finished='false'] .rr-status { color: #edaa8e; }
    #race-results .rr-actions { display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; }
    #race-results .rr-button {
      min-height: 54px;
      padding: 12px 18px;
      border: 1px solid #ffffff38;
      border-radius: 5px;
      background: #202d30;
      color: #edf0e8;
      font-family: 'Barlow Condensed', Impact, sans-serif;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 1.3px;
      text-transform: uppercase;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
    }
    #race-results .rr-button:hover { transform: translateY(-1px); border-color: #d5f5788a; }
    #race-results .rr-button:focus-visible { outline: 2px solid var(--lime, #d5f578); outline-offset: 3px; }
    #race-results .rr-button-primary { border-color: var(--lime, #d5f578); background: var(--lime, #d5f578); color: #172022; }
    #race-results .rr-button-primary:hover { background: #e2ff9a; }
    @media (max-height: 720px) {
      #race-results .rr-frame { gap: 12px; padding: 20px 26px 18px; }
      #race-results .rr-heading { padding-bottom: 10px; }
      #race-results .rr-stat { padding: 10px 12px; }
      #race-results .rr-row { min-height: 40px; }
      #race-results .rr-button { min-height: 48px; }
    }
    @media (max-height: 450px) {
      #race-results { max-height: calc(100dvh - 12px); }
      #race-results .rr-frame { max-height: calc(100dvh - 14px); gap: 6px; padding: 8px 14px; }
      #race-results .rr-heading { padding-bottom: 4px; }
      #race-results .rr-heading h1 { font-size: 28px; }
      #race-results .rr-kicker { font-size: 8px; }
      #race-results .rr-flag { font-size: 9px; }
      #race-results .rr-summary { gap: 5px; }
      #race-results .rr-stat { padding: 5px 8px; }
      #race-results .rr-label { font-size: 8px; letter-spacing: 1px; }
      #race-results .rr-value { margin-top: 2px; font-size: 22px; }
      #race-results .rr-table-head { padding-bottom: 3px; }
      #race-results .rr-list { gap: 2px; }
      #race-results .rr-row { min-height: 24px; padding: 3px 8px; }
      #race-results .rr-name { font-size: 12px; }
      #race-results .rr-status { font-size: 9px; }
      #race-results .rr-button { min-height: 32px; padding: 6px 12px; font-size: 14px; }
    }
    @media (max-width: 600px) {
      #race-results { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); }
      #race-results .rr-frame { gap: 10px; padding: 16px; }
      #race-results .rr-summary { gap: 6px; }
      #race-results .rr-stat { padding: 9px 8px; }
      #race-results .rr-label { font-size: 8px; letter-spacing: 1px; }
      #race-results .rr-flag { display: none; }
      #race-results .rr-table-head,
      #race-results .rr-row { grid-template-columns: 32px minmax(80px, 1fr) minmax(90px, .7fr); gap: 6px; }
      #race-results .rr-row { min-height: 38px; padding: 5px 8px; }
      #race-results .rr-name { font-size: 12px; }
      #race-results .rr-status { font-size: 9px; letter-spacing: .6px; }
      #race-results .rr-actions { grid-template-columns: 1.2fr 1fr; }
      #race-results .rr-button { min-height: 44px; font-size: 16px; }
    }
  `;
  document.head.append(style);
  dialog = document.createElement('dialog');
  dialog.id = 'race-results';
  dialog.setAttribute('aria-labelledby', 'race-results-title');
  dialog.setAttribute('aria-describedby', 'race-results-description');
  dialog.innerHTML = `
    <div class="rr-frame">
      <header class="rr-heading">
        <div><span class="rr-kicker">APEX / CLUB RACE</span><h1 id="race-results-title">Finish line.</h1></div>
        <span class="rr-flag" aria-hidden="true">▦ &nbsp; RACE COMPLETE</span>
      </header>
      <p id="race-results-description" class="sr-only">Final race position and driver standings.</p>
      <section class="rr-summary" aria-label="Your race result">
        <div class="rr-stat"><span class="rr-label">Finishing position</span><strong class="rr-value" data-result="position"></strong></div>
        <div class="rr-stat"><span class="rr-label">Total race time</span><strong class="rr-value" data-result="time"></strong></div>
        <div class="rr-stat"><span class="rr-label">Best lap</span><strong class="rr-value" data-result="best-lap"></strong></div>
      </section>
      <section class="rr-standings" aria-label="Final standings">
        <div class="rr-table-head" aria-hidden="true"><span>Place</span><span>Driver</span><span>Finish / status</span></div>
        <ol class="rr-list" data-result="standings"></ol>
      </section>
      <footer class="rr-actions">
        <button type="button" class="rr-button rr-button-primary" data-action="again">Race again <span aria-hidden="true">→</span></button>
        <button type="button" class="rr-button" data-action="setup">Back to setup</button>
      </footer>
    </div>`;
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  dialog.addEventListener('keydown', (event) => {
    const buttons = [...dialog.querySelectorAll('[data-action]')],
      index = buttons.indexOf(document.activeElement);
    if (
      ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      buttons[
        (index +
          (['ArrowLeft', 'ArrowUp'].includes(event.key)
            ? buttons.length - 1
            : 1)) %
          buttons.length
      ].focus();
    } else if (event.key === 'Tab') {
      if (!event.shiftKey && index === buttons.length - 1) {
        event.preventDefault();
        buttons[0].focus();
      } else if (event.shiftKey && index <= 0) {
        event.preventDefault();
        buttons[buttons.length - 1].focus();
      }
    }
  });
  dialog
    .querySelector('[data-action="again"]')
    .addEventListener('click', () => {
      dismiss();
      actions.raceAgain();
    });
  dialog
    .querySelector('[data-action="setup"]')
    .addEventListener('click', () => {
      dismiss();
      actions.backToSetup();
    });
  document.body.append(dialog);
  return dialog;
}

function dismiss() {
  const finish = dialog?.dataset.finish;
  if (dialog?.open) dialog.close();
  dismissedFinish = finish ?? dismissedFinish;
}

export function syncRaceResults({ finished, totalTime, bestLap, standings }) {
  if (!finished || !Number.isFinite(totalTime)) {
    if (!finished) dismissedFinish = null;
    if (dialog?.open) dialog.close();
    return;
  }
  const setupDialog = document.getElementById('selection-dialog');
  if (setupDialog?.open) return;
  const finishKey = String(totalTime);
  if (dismissedFinish === finishKey) return;

  const model = buildRaceResultsModel({ standings, totalTime, bestLap });
  if (!model.position) return;
  const view = ensureDialog();
  view.dataset.finish = finishKey;
  view.querySelector('[data-result="position"]').textContent =
    'P' + model.position + ' / ' + model.rows.length;
  view.querySelector('[data-result="time"]').textContent = formatTime(
    model.totalTime,
  );
  view.querySelector('[data-result="best-lap"]').textContent = Number.isFinite(
    model.bestLap,
  )
    ? formatTime(model.bestLap)
    : 'NO CLEAN LAP';
  const list = view.querySelector('[data-result="standings"]');
  list.replaceChildren(
    ...model.rows.map((row) => {
      const item = document.createElement('li');
      item.className = 'rr-row';
      item.dataset.finished = String(row.finished);
      item.dataset.player = String(row.player);
      const place = document.createElement('span');
      place.className = 'rr-place';
      place.textContent = String(row.position).padStart(2, '0');
      const name = document.createElement('span');
      name.className = 'rr-name';
      const swatch = document.createElement('i');
      swatch.className = 'rr-swatch';
      if (row.paint) swatch.style.setProperty('--rr-paint', row.paint);
      const label = document.createElement('span');
      label.textContent = row.name;
      name.append(swatch, label);
      const status = document.createElement('span');
      status.className = 'rr-status';
      status.textContent = row.finished ? formatTime(row.time) : row.status;
      item.append(place, name, status);
      return item;
    }),
  );
  if (!view.open) {
    view.showModal();
    view.querySelector('[data-action="again"]').focus();
  }
}
