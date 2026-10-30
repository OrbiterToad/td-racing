import { clamp } from './math.js';
import { car, feedback, state } from './state.js';
import { $, notify } from './ui.js';

export function playImpact(strength) {
  if (!state.soundEnabled || !state.audioCtx || !state.audioLayers) return;
  const source = state.audioCtx.createBufferSource(),
    gain = state.audioCtx.createGain(),
    filter = state.audioCtx.createBiquadFilter();
  source.buffer = state.audioLayers.buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  gain.gain.setValueAtTime(
    Math.min(0.12, strength * 0.1),
    state.audioCtx.currentTime,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    state.audioCtx.currentTime + 0.13,
  );
  source.connect(filter);
  filter.connect(gain);
  gain.connect(state.audioCtx.destination);
  source.start();
  source.stop(state.audioCtx.currentTime + 0.14);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

export function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled && !state.audioCtx) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      state.soundEnabled = false;
      notify('Audio is unavailable in this browser');
      return;
    }
    state.audioCtx = new Audio();
    state.engine = state.audioCtx.createOscillator();
    state.engine.type = 'sawtooth';
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    state.engineGain = state.audioCtx.createGain();
    state.engineGain.gain.value = 0.025;
    state.engine.connect(filter);
    filter.connect(state.engineGain);
    state.engineGain.connect(state.audioCtx.destination);
    state.engine.start();
  }
  if (state.audioCtx && !state.audioLayers) createFeedbackAudio();
  if (state.audioCtx && state.soundEnabled) state.audioCtx.resume();
  $('sound').textContent = state.soundEnabled ? '♪ Sound on' : '♪ Sound off';
  $('sound').classList.toggle('sound-on', state.soundEnabled);
  $('sound').setAttribute('aria-pressed', String(state.soundEnabled));
  updateAudio();
}

export function createFeedbackAudio() {
  const buffer = state.audioCtx.createBuffer(
      1,
      state.audioCtx.sampleRate,
      state.audioCtx.sampleRate,
    ),
    samples = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = (previous + (Math.random() * 2 - 1) * 0.11) / 1.04;
    samples[i] = previous * 3;
  }
  const source = state.audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const tireFilter = state.audioCtx.createBiquadFilter(),
    looseFilter = state.audioCtx.createBiquadFilter(),
    tireGain = state.audioCtx.createGain(),
    looseGain = state.audioCtx.createGain(),
    rumbleGain = state.audioCtx.createGain(),
    rumble = state.audioCtx.createOscillator();
  tireFilter.type = 'bandpass';
  tireFilter.frequency.value = 1600;
  tireFilter.Q.value = 0.7;
  looseFilter.type = 'lowpass';
  looseFilter.frequency.value = 550;
  for (const gain of [tireGain, looseGain, rumbleGain]) {
    gain.gain.value = 0;
    gain.connect(state.audioCtx.destination);
  }
  source.connect(tireFilter);
  source.connect(looseFilter);
  tireFilter.connect(tireGain);
  looseFilter.connect(looseGain);
  rumble.type = 'triangle';
  rumble.frequency.value = 65;
  rumble.connect(rumbleGain);
  source.start();
  rumble.start();
  state.audioLayers = {
    buffer,
    tireGain,
    looseGain,
    rumbleGain,
    looseFilter,
    tireFilter,
  };
}

export function updateAudio() {
  if (!state.engine) return;
  const speed = Math.hypot(car.vx, car.vy),
    enabled = state.soundEnabled && !state.paused,
    t = state.audioCtx.currentTime;
  state.engine.frequency.setTargetAtTime(
    35 + speed * 0.26 + car.throttle * 13,
    t,
    0.08,
  );
  state.engineGain.gain.setTargetAtTime(
    enabled ? 0.018 + car.throttle * 0.014 : 0,
    t,
    0.08,
  );
  if (!state.audioLayers) return;
  const loose = [
      'DIRT',
      'GRAVEL',
      'SAND',
      'SAND PATCH',
      'GRASS',
      'SNOW',
      'ICE',
    ].includes(car.surface),
    velocity = clamp(speed / 230, 0, 1),
    slide = clamp((car.slip - 17) / 95, 0, 1);
  state.audioLayers.tireGain.gain.setTargetAtTime(
    enabled && !loose ? slide * velocity * 0.065 : 0,
    t,
    0.07,
  );
  state.audioLayers.looseGain.gain.setTargetAtTime(
    enabled && loose ? velocity * (car.surface === 'ICE' ? 0.018 : 0.055) : 0,
    t,
    0.07,
  );
  state.audioLayers.rumbleGain.gain.setTargetAtTime(
    enabled ? feedback.rumble * 0.025 : 0,
    t,
    0.04,
  );
  state.audioLayers.looseFilter.frequency.setTargetAtTime(
    car.surface === 'ICE'
      ? 1800
      : car.surface === 'GRAVEL' || car.surface === 'DIRT'
        ? 950
        : 420,
    t,
    0.1,
  );
  state.audioLayers.tireFilter.frequency.setTargetAtTime(
    1000 + slide * 1300,
    t,
    0.1,
  );
}
