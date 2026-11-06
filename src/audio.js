import { clamp } from './math.js';
import { car, feedback, state } from './state.js';
import { $, notify } from './ui.js';
import { saveSettings } from './settings-preferences.js';

export function playImpact(strength) {
  if (!state.soundEnabled || !state.audioCtx || !state.audioLayers) return;
  const source = state.audioCtx.createBufferSource(),
    gain = state.audioCtx.createGain(),
    highpass = state.audioCtx.createBiquadFilter(),
    filter = state.audioCtx.createBiquadFilter();
  source.buffer = state.audioLayers.buffer;
  highpass.type = 'highpass';
  highpass.frequency.value = 90;
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  gain.gain.setValueAtTime(
    Math.min(0.105, strength * 0.085),
    state.audioCtx.currentTime,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    state.audioCtx.currentTime + 0.13,
  );
  source.connect(highpass);
  highpass.connect(filter);
  filter.connect(gain);
  gain.connect(state.audioMasterGain);
  source.start();
  source.stop(state.audioCtx.currentTime + 0.14);
  source.onended = () => {
    source.disconnect();
    highpass.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

export function ensureAudio() {
  if (!state.soundEnabled) return false;
  if (state.audioCtx) {
    const resumed = state.audioCtx.resume();
    resumed?.catch?.(() => {});
    updateAudio();
    return true;
  }
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) {
      state.soundEnabled = false;
      syncSoundButtons();
      notify('Audio is unavailable in this browser');
      return false;
    }
    state.audioCtx = new Audio();
    state.audioMasterGain = state.audioCtx.createGain();
    state.audioMasterGain.gain.value = state.settings.volume;
    state.audioMasterGain.connect(state.audioCtx.destination);
    state.engine = state.audioCtx.createOscillator();
    state.engine.type = 'sawtooth';
    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    state.engineFilter = filter;
    state.engineGain = state.audioCtx.createGain();
    state.engineGain.gain.value = 0.018;
    state.engine.connect(filter);
    filter.connect(state.engineGain);
    state.engineGain.connect(state.audioMasterGain);
    state.engine.start();
    if (!state.audioLayers) createFeedbackAudio();
    const resumed = state.audioCtx.resume();
    resumed?.catch?.(() => {});
    updateAudio();
    return true;
  } catch (_) {
    state.audioCtx = undefined;
    state.audioMasterGain = undefined;
    state.engine = undefined;
    state.engineGain = undefined;
    state.engineFilter = undefined;
    state.audioLayers = null;
    state.soundEnabled = false;
    syncSoundButtons();
    notify('Audio is unavailable in this browser');
    return false;
  }
}

export function syncSoundButtons() {
  for (const button of [$('sound'), $('settings-sound')]) {
    if (!button) continue;
    button.textContent = state.soundEnabled ? '♪ Sound on' : '♪ Sound off';
    button.classList.toggle('sound-on', state.soundEnabled);
    button.setAttribute('aria-pressed', String(state.soundEnabled));
  }
}

export function setMasterVolume(volume) {
  if (!state.audioMasterGain || !state.audioCtx) return;
  state.audioMasterGain.gain.setTargetAtTime(
    volume,
    state.audioCtx.currentTime,
    0.04,
  );
}

export function setSoundEnabled(enabled, { persist = true } = {}) {
  state.soundEnabled = enabled;
  if (enabled) ensureAudio();
  syncSoundButtons();
  updateAudio();
  if (persist)
    saveSettings({
      ...state.settings,
      soundEnabled: state.soundEnabled,
    });
}

export function toggleSound() {
  setSoundEnabled(!state.soundEnabled);
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
    previous = (previous + (Math.random() * 2 - 1) * 0.18) / 1.08;
    samples[i] = previous * 2.3;
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
  tireFilter.frequency.value = 1900;
  tireFilter.Q.value = 1.1;
  looseFilter.type = 'lowpass';
  looseFilter.frequency.value = 720;
  for (const gain of [tireGain, looseGain, rumbleGain]) {
    gain.gain.value = 0;
    gain.connect(state.audioMasterGain);
  }
  source.connect(tireFilter);
  source.connect(looseFilter);
  tireFilter.connect(tireGain);
  looseFilter.connect(looseGain);
  rumble.type = 'triangle';
  rumble.frequency.value = 58;
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
  state.engineFilter?.frequency.setTargetAtTime(
    280 + speed * 2.2 + car.throttle * 260,
    t,
    0.1,
  );
  state.engineGain.gain.setTargetAtTime(
    enabled ? 0.014 + car.throttle * 0.018 : 0,
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
    enabled && !loose ? slide * velocity * 0.052 : 0,
    t,
    0.07,
  );
  state.audioLayers.looseGain.gain.setTargetAtTime(
    enabled && loose ? velocity * (car.surface === 'ICE' ? 0.014 : 0.044) : 0,
    t,
    0.07,
  );
  state.audioLayers.rumbleGain.gain.setTargetAtTime(
    enabled ? feedback.rumble * 0.018 : 0,
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
