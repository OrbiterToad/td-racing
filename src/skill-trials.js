import { car, race, skillTrial, state, track } from './state.js';
import { nearestDriving, widthAt } from './tracks.js';
import { $, setPaused } from './ui.js';
import { startCountdown } from './race.js';

export const SKILL_TRIALS = {
  braking: {
    id: 'braking',
    name: 'Braking Point',
    tag: 'BRAKING / STOP ACCURACY',
    description:
      'Build speed, then brake hard and stop as close as you can to the next braking marker. Shorter stopping distance scores higher.',
    objective: 'Accelerate past 120 km/h, then brake to a complete stop.',
  },
  slalom: {
    id: 'slalom',
    name: 'Slalom Gates',
    tag: 'STEERING / PRECISION',
    description:
      'Thread five alternating gates in sequence. Stay near each marker and keep the car moving.',
    objective: 'Pass all five alternating gates without leaving the road.',
  },
  handbrake: {
    id: 'handbrake',
    name: 'Handbrake Turn',
    tag: 'ROTATION / CONTROL',
    description:
      'Carry speed into the marked corner, use the handbrake to rotate, and hold a controlled slide through the exit.',
    objective:
      'Build a controlled slide through the corner. More sustained drift earns a higher score.',
  },
  cornering: {
    id: 'cornering',
    name: 'Clean Cornering',
    tag: 'RACING LINE / DISCIPLINE',
    description:
      'Link the marked corners without touching grass, gravel, or barriers. Smooth, clean driving earns the best score.',
    objective: 'Complete the corner sequence on pavement without a collision.',
  },
};

const STORAGE_KEY = 'apex-skill-trials-v1';
const BRAKING_TARGET_KMH = 120;
const SPEED_TO_KMH = 0.46;
const BRAKING_TARGET_SPEED = BRAKING_TARGET_KMH / SPEED_TO_KMH;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function readSkillProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return value && typeof value === 'object' ? value : {};
  } catch (_) {
    return {};
  }
}

function saveResult(id, score, complete) {
  const progress = readSkillProgress();
  const previous = progress[id] || { attempts: 0, completions: 0, best: null };
  progress[id] = {
    attempts: previous.attempts + 1,
    completions: previous.completions + (complete ? 1 : 0),
    best: previous.best === null ? score : Math.max(previous.best, score),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (_) {}
  return progress[id];
}

function dialog() {
  let node = document.getElementById('skill-trial-dialog');
  if (node) return node;
  node = document.createElement('dialog');
  node.id = 'skill-trial-dialog';
  node.style.cssText =
    'width:min(620px,calc(100vw - 28px));padding:0;border:1px solid #ffffff26;border-radius:8px;background:#182123;color:#edf0e8;box-shadow:0 28px 90px #000a';
  node.setAttribute('aria-labelledby', 'skill-trial-title');
  node.innerHTML = `<style>#skill-trial-dialog::backdrop{background:#091011c9;backdrop-filter:blur(5px)}.skill-panel{padding:32px}.skill-panel h2{font:700 42px 'Barlow Condensed',Impact,sans-serif;margin:8px 0}.skill-panel p{color:#c2cec6;line-height:1.6}.skill-panel #skill-trial-stats{border-top:1px solid #ffffff20;padding-top:16px;margin:20px 0;color:#d5f578;font-size:12px;letter-spacing:1px}.skill-actions{display:flex;justify-content:space-between;gap:12px}.skill-actions button{min-height:46px;padding:10px 16px}</style><div class="skill-panel"><span class="eyebrow" id="skill-trial-kicker">APEX / SKILL TRIAL</span><h2 id="skill-trial-title"></h2><p id="skill-trial-copy"></p><div id="skill-trial-stats"></div><div class="skill-actions"><button id="skill-trial-secondary" class="picker-close">BACK</button><button id="skill-trial-primary" class="primary">START TRIAL →</button></div></div>`;
  node.addEventListener('cancel', (event) => {
    event.preventDefault();
    node.querySelector('#skill-trial-secondary').click();
  });
  document.body.append(node);
  return node;
}

function showIntro() {
  const trial = SKILL_TRIALS[skillTrial.id],
    node = dialog(),
    progress = readSkillProgress()[skillTrial.id];
  node.dataset.phase = 'intro';
  node.querySelector('#skill-trial-kicker').textContent =
    `${trial.tag} / SKILL TRIAL`;
  node.querySelector('#skill-trial-title').textContent = trial.name;
  node.querySelector('#skill-trial-copy').textContent =
    `${trial.objective} Use W/↑ to accelerate, S/↓ to brake, A/D or ←/→ to steer, and Space to handbrake. ${progress ? `BEST ${progress.best}% · ${progress.completions} COMPLETED` : 'NO ATTEMPTS YET'}`;
  node.querySelector('#skill-trial-stats').textContent =
    'START / grid countdown · FINISH / objective complete';
  node.querySelector('#skill-trial-secondary').textContent =
    'BACK TO MODE SELECT';
  node.querySelector('#skill-trial-secondary').onclick = () => {
    node.close();
    setPaused(true, false);
    state.selectingSession = true;
    state.pickerMode = 'modes';
    document.body.classList.add('starting');
    document.getElementById('selection-dialog').showModal();
  };
  node.querySelector('#skill-trial-primary').textContent = 'START TRIAL →';
  node.querySelector('#skill-trial-primary').onclick = () => {
    node.close();
    resetAttempt();
    setPaused(false, false);
    startCountdown();
  };
  node.showModal();
}

function showResult(complete, message) {
  skillTrial.active = false;
  const record = saveResult(skillTrial.id, skillTrial.score, complete),
    trial = SKILL_TRIALS[skillTrial.id],
    node = dialog();
  node.dataset.phase = 'result';
  node.querySelector('#skill-trial-kicker').textContent = complete
    ? 'TRIAL COMPLETE'
    : 'ATTEMPT ENDED';
  node.querySelector('#skill-trial-title').textContent = trial.name;
  node.querySelector('#skill-trial-copy').textContent =
    `${message} SCORE ${Math.round(skillTrial.score)} / 100 · BEST ${record.best}% · ${record.completions} COMPLETED`;
  node.querySelector('#skill-trial-stats').textContent =
    `ATTEMPTS ${record.attempts} · PROGRESS SAVED ON THIS DEVICE`;
  node.querySelector('#skill-trial-secondary').textContent = 'CHOOSE ANOTHER';
  node.querySelector('#skill-trial-secondary').onclick = () => {
    node.close();
    setPaused(true, false);
    state.selectingSession = true;
    state.pickerMode = 'modes';
    document.body.classList.add('starting');
    document.getElementById('selection-dialog').showModal();
  };
  node.querySelector('#skill-trial-primary').textContent = 'RETRY NOW ↻';
  node.querySelector('#skill-trial-primary').onclick = () => {
    node.close();
    resetAttempt();
    setPaused(false, false);
    startCountdown();
  };
  node.showModal();
  setPaused(true, false);
}

function resetAttempt() {
  Object.assign(skillTrial, {
    active: true,
    started: false,
    elapsed: 0,
    startProgress: 0,
    previousProgress: 0,
    score: 0,
    gates: 0,
    gateIndex: 0,
    clean: true,
    bestDrift: 0,
    startSpeed: 0,
    brakingDistance: 0,
  });
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
}

export function beginSkillTrial(id) {
  skillTrial.id = SKILL_TRIALS[id] ? id : 'braking';
  resetAttempt();
  setPaused(true, false);
  showIntro();
}

export function drawSkillTrialMarkers(ctx) {
  if (!skillTrial.active || skillTrial.id !== 'slalom' || !track.length) return;
  const base = skillTrial.started
    ? skillTrial.startProgress
    : nearestDriving(car.x, car.y).progress;
  for (let gate = 0; gate < 5; gate++) {
    const progress = (base + (gate + 1) * 0.022) % 1;
    const p = track[Math.floor(progress * track.length) % track.length];
    const half = widthAt('road', progress) * 0.68;
    const target = (gate % 2 ? -1 : 1) * widthAt('road', progress) * 0.42;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.ty, p.tx));
    ctx.strokeStyle = '#d5f578b0';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f4f2d8';
    ctx.beginPath();
    ctx.arc(-half, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(half, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d5f578';
    ctx.beginPath();
    ctx.arc(target, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#182123';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(gate + 1), target, 3);
    ctx.restore();
  }
}

export function updateSkillTrial(dt, drive) {
  if (!skillTrial.active) return;
  const n = drive.after,
    speed = Math.hypot(car.vx, car.vy);
  skillTrial.elapsed += dt;
  if (!skillTrial.started) {
    if (speed < 8) return;
    skillTrial.started = true;
    race.started = true;
    skillTrial.startProgress = n.progress;
    skillTrial.previousProgress = n.progress;
    skillTrial.startSpeed = speed;
  }
  const previous = skillTrial.previousProgress;
  let progress = n.progress;
  if (progress < previous - 0.5) progress += 1;
  let distance = progress - skillTrial.startProgress;
  if (distance < 0) distance += 1;
  skillTrial.previousProgress = n.progress;
  if (skillTrial.id === 'braking') {
    if (speed >= BRAKING_TARGET_SPEED)
      skillTrial.startSpeed = Math.max(skillTrial.startSpeed, speed);
    if (skillTrial.startSpeed >= BRAKING_TARGET_SPEED && drive.braking)
      skillTrial.brakingDistance += speed * dt;
    if (
      skillTrial.startSpeed >= BRAKING_TARGET_SPEED &&
      drive.braking &&
      speed < 12
    ) {
      skillTrial.score = clamp(100 - skillTrial.brakingDistance / 22, 0, 100);
      showResult(
        true,
        `Stopped after ${Math.round(skillTrial.brakingDistance)} m.`,
      );
      return;
    }
  }
  if (skillTrial.id === 'slalom') {
    const gateProgress = (skillTrial.gateIndex + 1) * 0.022;
    let previousDistance = previous - skillTrial.startProgress;
    if (previousDistance < 0) previousDistance += 1;
    if (
      distance >= gateProgress &&
      previousDistance < gateProgress &&
      skillTrial.gateIndex < 5
    ) {
      const offset = n.distance * n.side,
        expected = skillTrial.gateIndex % 2 ? -1 : 1;
      if (
        Math.abs(offset - expected * widthAt('road', n.progress) * 0.42) <
        widthAt('road', n.progress) * 0.48
      )
        skillTrial.gates++;
      else skillTrial.clean = false;
      skillTrial.gateIndex++;
    }
    if (distance >= 0.15) {
      skillTrial.score = Math.round((skillTrial.gates / 5) * 100);
      showResult(
        skillTrial.gates === 5,
        `${skillTrial.gates} of 5 gates cleared.`,
      );
      return;
    }
  }
  if (skillTrial.id === 'handbrake') {
    if (drive.hand && speed > 85 && Math.abs(drive.lateral) > 28)
      skillTrial.bestDrift += dt;
    if (distance >= 0.16) {
      skillTrial.score = clamp(skillTrial.bestDrift * 45, 0, 100);
      showResult(
        skillTrial.bestDrift >= 0.8,
        `${skillTrial.bestDrift.toFixed(1)} seconds of controlled slide.`,
      );
      return;
    }
  }
  if (skillTrial.id === 'cornering') {
    if (drive.offroad || drive.impact > 20) skillTrial.clean = false;
    if (distance >= 0.18) {
      skillTrial.score = skillTrial.clean ? 100 : 35;
      showResult(
        skillTrial.clean,
        skillTrial.clean
          ? 'Clean run. No runoff or barrier contact.'
          : 'Run complete, with a runoff or barrier penalty.',
      );
      return;
    }
  }
  if (skillTrial.elapsed > 75) showResult(false, 'Time limit reached.');
}
