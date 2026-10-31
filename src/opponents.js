import { carImagePath, configureCar, loadCarArt } from './cars.js';
import { CFG, PAINTS } from './config.js';
import { clamp, lerpTo } from './math.js';
import { inWorldView, roundedRect } from './renderer.js';
import { changeTrack } from './runtime.js';
import {
  car,
  opponentRace,
  race,
  startingGrid,
  state,
  track,
} from './state.js';
import { nearestDriving, pointOnTrack } from './tracks.js';
import { $, formatTime, notify, syncCarHUD } from './ui.js';

export { opponentRace };
export const opponentArt = {};

export function toggleOpponentRace() {
  opponentRace.enabled = !opponentRace.enabled;
  if (opponentRace.enabled) {
    configureCar('clubsport', state.paint);
    loadCarArt();
    syncCarHUD();
    changeTrack('juniper', false);
    notify('CLUB RACE · Three laps · Non-contact opponents');
  } else {
    changeTrack(state.activeMap.id, false);
    notify('TIME TRIAL · Find your next personal best');
  }
}

export function resetOpponentRace() {
  Object.assign(opponentRace, {
    elapsed: 0,
    finished: false,
    playerFinish: null,
    cars: [],
    profile: [],
  });
  if (!opponentRace.enabled) return;
  const count = Math.ceil(track.totalLength / 80);
  opponentRace.spacing = track.totalLength / count;
  // A speed plan based on curvature and oil, with a braking envelope so the
  // drivers slow before a corner. No speed changes depend on player position.
  for (let i = 0; i < count; i++) {
    const s = i * opponentRace.spacing,
      p = pointOnTrack(s),
      before = pointOnTrack(s - 40),
      ahead = pointOnTrack(s + 40),
      turn = Math.abs(
        Math.atan2(
          before.tx * ahead.ty - before.ty * ahead.tx,
          before.tx * ahead.tx + before.ty * ahead.ty,
        ),
      ),
      oily = state.activeMap.patches.some((patch) => {
        const gap = Math.abs(p.progress - patch.progress);
        return Math.min(gap, 1 - gap) * track.totalLength < patch.length + 100;
      });
    opponentRace.profile.push(
      Math.min(
        335,
        Math.sqrt(300 / Math.max(turn / 80, 0.0001)),
        oily ? 155 : Infinity,
      ),
    );
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = count - 1; i >= 0; i--) {
      const next = opponentRace.profile[(i + 1) % count];
      opponentRace.profile[i] = Math.min(
        opponentRace.profile[i],
        Math.sqrt(next * next + 2 * 220 * opponentRace.spacing),
      );
    }
  }
  const slots = startingGrid
    .map((_, i) => i)
    .filter((i) => i !== state.selectedStart);
  const colors = ['blue', 'yellow', 'green', 'black', 'red'].filter(
    (c) => c !== state.paint,
  );
  for (let i = 0; i < 3; i++) {
    const slot = slots[i],
      color = colors[i];
    if (!opponentArt[color] && typeof Image !== 'undefined') {
      const art = new Image();
      art.src = carImagePath('clubsport', color);
      opponentArt[color] = art;
    }
    const rival = {
      name: ['Alex', 'Blair', 'Casey'][i],
      paint: color,
      s: -90 - slot * 80,
      speed: 0,
      pace: [0.98, 0.91, 0.84][i],
      lane: [-26, 26, 0][i],
      offset: CFG.road * 0.4 * (slot % 2 ? 1 : -1),
      brake: false,
      finish: null,
    };
    positionOpponent(rival);
    opponentRace.cars.push(rival);
  }
}

export function positionOpponent(rival) {
  const p = pointOnTrack(rival.s),
    before = pointOnTrack(rival.s - 12),
    ahead = pointOnTrack(rival.s + 12);
  rival.x = p.x - p.ty * rival.offset;
  rival.y = p.y + p.tx * rival.offset;
  rival.angle = Math.atan2(ahead.y - before.y, ahead.x - before.x);
}

export function updateOpponents(dt) {
  if (!opponentRace.enabled || opponentRace.finished || race.countdown > 0)
    return;
  opponentRace.elapsed += dt;
  const length = track.totalLength,
    finish = length * opponentRace.laps;
  for (const rival of opponentRace.cars) {
    if (rival.finish !== null) continue;
    const s = ((rival.s % length) + length) % length,
      index = Math.floor(s / opponentRace.spacing),
      target = opponentRace.profile[index] * rival.pace,
      previous = rival.s;
    rival.brake = rival.speed > target + 5;
    rival.speed += clamp(target - rival.speed, -250 * dt, 150 * dt);
    rival.offset = lerpTo(rival.offset, rival.lane, 1 - Math.exp(-dt));
    rival.s += rival.speed * dt;
    if (rival.s >= finish) {
      rival.finish =
        opponentRace.elapsed -
        dt +
        (dt * (finish - previous)) / (rival.s - previous);
      rival.s = finish;
      rival.speed = 0;
      rival.brake = false;
    }
    positionOpponent(rival);
  }
}

export function opponentStandings() {
  const n = nearestDriving(car.x, car.y),
    index = Math.min(track.length - 1, Math.floor(n.progress * track.length)),
    a = track[index],
    b = track[(index + 1) % track.length],
    s =
      a.s +
      (n.progress * track.length - index) * Math.hypot(b.x - a.x, b.y - a.y),
    player = {
      name: 'You',
      player: true,
      paint: state.paint,
      finish: opponentRace.playerFinish,
      s: race.crossedStart
        ? (race.lap - 1) * track.totalLength + s
        : s - track.totalLength,
    };
  return [player, ...opponentRace.cars].sort((a, b) => {
    if (a.finish !== null || b.finish !== null) {
      if (a.finish === null) return 1;
      if (b.finish === null) return -1;
      return a.finish - b.finish;
    }
    return b.s - a.s;
  });
}

export function updateOpponentHUD() {
  const enabled = opponentRace.enabled;
  $('race-mode').textContent = enabled ? 'Time trial' : 'Race AI · Juniper';
  $('race-mode').setAttribute('aria-pressed', String(enabled));
  $('race-panel').hidden = !enabled;
  $('session-mode').textContent = enabled ? 'CLUB RACE' : 'FREE PRACTICE';
  $('session-drivers').textContent = enabled
    ? '04 DRIVERS · 03 LAPS'
    : '01 DRIVER · NO LIMITS';
  if (!enabled) return;
  const standings = opponentStandings(),
    place = standings.findIndex((entry) => entry.player) + 1;
  $('race-position').textContent = opponentRace.finished
    ? 'FINISHED · P' + place + ' / 4'
    : 'POSITION ' + place + ' / 4';
  $('race-elapsed').textContent = formatTime(
    opponentRace.playerFinish ?? opponentRace.elapsed,
  );
  $('race-standings').textContent = standings
    .map(
      (entry, index) =>
        index +
        1 +
        '. ' +
        entry.name +
        (entry.finish !== null ? ' · ' + formatTime(entry.finish) : ''),
    )
    .join('\n');
  $('race-help').textContent = opponentRace.finished
    ? 'N / Restart to race again · Time trial to leave'
    : 'Non-contact · Pass every sector · R invalidates the lap';
}

export function drawOpponents(c) {
  for (const rival of opponentRace.cars) {
    if (!inWorldView(rival.x, rival.y, 80)) continue;
    c.save();
    c.translate(rival.x, rival.y);
    c.rotate(rival.angle);
    c.globalAlpha = 0.8;
    const art = opponentArt[rival.paint];
    if (art && art.complete && art.naturalWidth) {
      c.save();
      c.rotate(Math.PI / 2);
      c.drawImage(art, -12, -22, 24, 44);
      c.restore();
    } else {
      c.fillStyle = PAINTS[rival.paint].hex;
      roundedRect(c, -22, -12, 44, 24, 4);
      c.fill();
    }
    if (rival.brake) {
      c.fillStyle = '#ff6a4f';
      c.fillRect(-22, -10, 3, 5);
      c.fillRect(-22, 5, 3, 5);
    }
    c.restore();
    c.save();
    c.font = 'bold 10px Arial';
    c.textAlign = 'center';
    c.lineWidth = 3;
    c.strokeStyle = '#13231f';
    c.fillStyle = PAINTS[rival.paint].hex;
    c.strokeText(rival.name + ' · AI', rival.x, rival.y - 30);
    c.fillText(rival.name + ' · AI', rival.x, rival.y - 30);
    c.restore();
  }
}
