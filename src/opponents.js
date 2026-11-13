import { conditionFor } from './weather.js';
import { localResultsSnapshot } from './local-race.js';
import { aiDifficulty, chooseRaceLine } from './ai-racecraft.js';
import { carImagePath } from './cars.js';
import { CFG, PAINTS, VEHICLES } from './config.js';
import { clamp } from './math.js';
import { inWorldView, roundedRect } from './renderer.js';
import { syncRaceResults } from './results.js';
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
import { driveVehicle, resolveVehicleContacts } from './vehicle-physics.js';
import { $, formatTime, notify } from './ui.js';

export { opponentRace };
export const opponentArt = {};
const VEHICLE_PACE = { clubsport: 0.85, sprint: 0.75, rally: 0.9, drift: 0.85 };

export function toggleOpponentRace() {
  opponentRace.enabled = !opponentRace.enabled;
  if (opponentRace.enabled) {
    changeTrack(state.activeMap.id, false);
    notify('CLUB RACE · Three laps · Full contact');
  } else {
    changeTrack(state.activeMap.id, false);
    notify('TIME TRIAL · PERSONAL BEST AVAILABLE');
  }
}

export function resetOpponentRace() {
  Object.assign(opponentRace, {
    elapsed: 0,
    finished: false,
    playerFinish: null,
    bestLap: null,
    cars: [],
    profile: [],
  });
  if (!opponentRace.enabled) return;
  const sampleRadius = state.activeMap.id === 'summit' ? 10 : 40;
  const count = Math.ceil(track.totalLength / (sampleRadius * 2));
  opponentRace.spacing = track.totalLength / count;
  // Set safe target speeds for each corner, then let the shared car physics
  // decide how the AI reaches those speeds.
  for (let i = 0; i < count; i++) {
    const s = i * opponentRace.spacing,
      p = pointOnTrack(s),
      before = pointOnTrack(s - sampleRadius),
      ahead = pointOnTrack(s + sampleRadius),
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
        Math.sqrt(40 / Math.max(turn / (sampleRadius * 2), 0.0001)),
        oily ? 125 : Infinity,
      ),
    );
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let i = count - 1; i >= 0; i--) {
      const next = opponentRace.profile[(i + 1) % count];
      opponentRace.profile[i] = Math.min(
        opponentRace.profile[i],
        Math.sqrt(next * next + 2 * 10 * opponentRace.spacing),
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
    const vehicleIds = Object.keys(VEHICLES),
      vehicleId =
        vehicleIds[
          (vehicleIds.indexOf(state.activeCar.id) +
            (opponentRace.grid === 'mixed' ? i : 0)) %
            vehicleIds.length
        ],
      artKey = vehicleId + '-' + color;
    if (!opponentArt[artKey] && typeof Image !== 'undefined') {
      const art = new Image();
      art.src = carImagePath(vehicleId, color);
      opponentArt[artKey] = art;
    }
    const rival = {
      vehicleId,
      name: ['Alex', 'Blair', 'Casey'][i],
      paint: color,
      s: -90 - slot * 80,
      speed: 0,
      pace: [0.98, 0.91, 0.84][i],
      lane: [-8, 8, 0][i],
      offset: [-8, 8, 0][i],
      vx: 0,
      vy: 0,
      yaw: 0,
      steer: 0,
      slickTime: 0,
      brake: false,
      finish: null,
    };
    positionOpponent(rival);
    rival.trackS =
      ((rival.s % track.totalLength) + track.totalLength) % track.totalLength;
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

// Track progress is a segment index fraction, not an arc-length fraction.
// Unequal control-point spacing (especially tight chicanes) makes the distinction
// significant for steering previews, speed profiles and traffic gaps.
function distanceAtProgress(progress) {
  const scaled = progress * track.length,
    index = Math.min(track.length - 1, Math.floor(scaled)),
    a = track[index],
    b = track[(index + 1) % track.length];
  return a.s + (scaled - index) * Math.hypot(b.x - a.x, b.y - a.y);
}

export function updateOpponents(dt) {
  if (!opponentRace.enabled || opponentRace.finished || race.countdown > 0)
    return;
  opponentRace.elapsed += dt;
  const length = track.totalLength,
    finish = length * opponentRace.laps,
    tuning = aiDifficulty(opponentRace.difficulty);
  for (const rival of opponentRace.cars) {
    if (rival.finish !== null) continue;
    const vehicle = VEHICLES[rival.vehicleId] || state.activeCar;
    const current = nearestDriving(rival.x, rival.y),
      currentS = distanceAtProgress(current.progress),
      s = ((rival.s % length) + length) % length,
      index = Math.floor(s / opponentRace.spacing),
      target = Math.max(
        12,
        opponentRace.profile[index] *
          Math.sqrt(conditionFor(state.condition).grip) *
          rival.pace *
          0.7 *
          tuning.pace *
          Math.min(1, Math.sqrt(vehicle.grip)) *
          (state.activeMap.id === 'summit' ? 0.6 : 1) *
          (VEHICLE_PACE[vehicle.id] || 1) *
          (vehicle.yawResponse ? 0.45 : 1) *
          (state.activeMap.id === 'city'
            ? vehicle.yawResponse
              ? 0.9
              : 0.6
            : 1),
      ),
      lookAhead =
        state.activeMap.id === 'summit'
          ? clamp(70 + rival.speed * 0.2, 70, 110)
          : clamp(70 + rival.speed * 0.12, 70, 130),
      ahead = pointOnTrack(currentS + lookAhead),
      currentAngle = Math.atan2(current.ty, current.tx),
      aheadAngle = Math.atan2(ahead.ty, ahead.tx),
      turnAhead = Math.atan2(
        Math.sin(aheadAngle - currentAngle),
        Math.cos(aheadAngle - currentAngle),
      ),
      traffic = [car, ...opponentRace.cars]
        .filter(
          (other) =>
            other !== rival &&
            other.finish == null &&
            Math.hypot(other.x - rival.x, other.y - rival.y) < 350,
        )
        .map((other) => {
          const p = nearestDriving(other.x, other.y);
          let gap = distanceAtProgress(p.progress) - currentS;
          if (gap > length / 2) gap -= length;
          if (gap < -length / 2) gap += length;
          return {
            gap,
            lane: p.side * p.distance,
            width: (VEHICLES[other.vehicleId] || state.activeCar).width,
            closing: rival.speed - Math.hypot(other.vx, other.vy),
          };
        }),
      decision = chooseRaceLine({
        lane: rival.offset ?? 0,
        halfRoad: Math.min(current.road || CFG.road, CFG.road - 16),
        width: vehicle.width,
        curvature:
          rival.slickTime > 0 || target < 140 || current.distance > 20
            ? 1
            : turnAhead,
        traffic,
      });
    rival.action = decision.action;
    rival.lane += clamp(
      decision.lane - rival.lane,
      -tuning.lineRate * dt,
      tuning.lineRate * dt,
    );
    const headingError = Math.atan2(
        Math.sin(currentAngle - rival.angle),
        Math.cos(currentAngle - rival.angle),
      ),
      lateralError = current.side * current.distance - rival.lane,
      steeringRange =
        (0.52 / (1 + Math.max(0, rival.speed) / 190)) * vehicle.steering,
      lineAngle = Math.atan2(
        ahead.y + ahead.tx * rival.lane - rival.y,
        ahead.x - ahead.ty * rival.lane - rival.x,
      ),
      goalError = Math.atan2(
        Math.sin(lineAngle - rival.angle),
        Math.cos(lineAngle - rival.angle),
      ),
      desiredAngle = ['summit', 'city', 'drift'].includes(state.activeMap.id)
        ? Math.atan2(
            2 * vehicle.wheelbase * Math.sin(goalError),
            Math.max(
              25,
              Math.hypot(
                ahead.x - ahead.ty * rival.lane - rival.x,
                ahead.y + ahead.tx * rival.lane - rival.y,
              ),
            ),
          )
        : Math.atan((vehicle.wheelbase * turnAhead) / lookAhead) +
          headingError -
          Math.atan2(
            (vehicle.yawResponse ? 1.5 : 4) * lateralError,
            rival.speed + 15,
          ),
      steer = clamp(desiredAngle / steeringRange, -1, 1);
    rival.brake =
      rival.speed > target + tuning.brakeMargin ||
      (!vehicle.yawResponse &&
        (Math.abs(turnAhead) > 0.04 || rival.slickTime > 0) &&
        rival.speed > Math.max(15, target - 3));
    driveVehicle(
      rival,
      { steer, throttle: rival.speed < target - 4, brake: rival.brake },
      dt,
      vehicle,
    );
    const previous = rival.s,
      progress = distanceAtProgress(nearestDriving(rival.x, rival.y).progress);
    let distance = progress - rival.trackS;
    if (distance < -length / 2) distance += length;
    else if (distance > length / 2) distance -= length;
    rival.s += distance;
    rival.trackS = progress;
    rival.speed = Math.hypot(rival.vx, rival.vy);
    if (rival.s >= finish) {
      rival.finish =
        opponentRace.elapsed -
        dt +
        (dt * (finish - previous)) / (rival.s - previous);
      rival.s = finish;
      rival.speed = 0;
      rival.brake = false;
    }
  }
}

export function resolveOpponentCollisions() {
  if (!opponentRace.enabled) return;
  const vehicles = [
    { vehicle: car, spec: state.activeCar },
    ...opponentRace.cars.map((vehicle) => ({
      vehicle,
      spec: VEHICLES[vehicle.vehicleId] || state.activeCar,
    })),
  ];
  resolveVehicleContacts(vehicles);
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
  $('race-mode').textContent = enabled ? 'Time trial' : 'Race AI';
  $('race-mode').setAttribute('aria-pressed', String(enabled));
  $('race-panel').hidden = !enabled;
  $('session-mode').textContent = enabled ? 'CLUB RACE' : 'FREE PRACTICE';
  $('session-drivers').textContent = enabled
    ? '04 DRIVERS · 03 LAPS'
    : '01 DRIVER · NO LIMITS';
  if (state.localRace) {
    $('session-mode').textContent = 'LOCAL SPLIT-SCREEN';
    $('session-drivers').textContent = '02 DRIVERS · 03 LAPS';
    syncRaceResults(localResultsSnapshot(state.localRace));
    return;
  }
  if (!enabled) {
    syncRaceResults({ finished: false });
    return;
  }
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
    : 'Full contact · Pass every sector · R invalidates the lap';
  syncRaceResults({
    finished: opponentRace.finished,
    totalTime: opponentRace.playerFinish,
    bestLap: opponentRace.bestLap,
    standings,
  });
}

export function drawOpponents(c) {
  for (const rival of opponentRace.cars) {
    if (!inWorldView(rival.x, rival.y, 80)) continue;
    const spec = VEHICLES[rival.vehicleId] || state.activeCar;
    c.save();
    c.translate(rival.x, rival.y);
    c.rotate(rival.angle);
    c.globalAlpha = 0.8;
    const art = opponentArt[rival.vehicleId + '-' + rival.paint];
    if (art && art.complete && art.naturalWidth) {
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
      c.fillStyle = PAINTS[rival.paint].hex;
      roundedRect(
        c,
        -spec.length / 2,
        -spec.width / 2,
        spec.length,
        spec.width,
        4,
      );
      c.fill();
    }
    if (rival.brake) {
      c.fillStyle = '#ff6a4f';
      c.fillRect(-spec.length / 2, -spec.width / 2 + 2, 3, 5);
      c.fillRect(-spec.length / 2, spec.width / 2 - 7, 3, 5);
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
