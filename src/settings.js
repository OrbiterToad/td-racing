import {
  setSoundEnabled,
  setMasterVolume,
  syncSoundButtons,
  toggleSound,
} from './audio.js';
import { loadSettings, saveSettings } from './settings-preferences.js';
import { setPaused } from './ui.js';
import { particles, state } from './state.js';

const $ = (id) => document.getElementById(id);
let activeTrigger = null;
let pausedBeforeSettings = true;
let initialized = false;
let motionMedia;

export function applyMotionPreference(enabled) {
  state.settings.reducedMotion = enabled;
  document.documentElement.dataset.reducedMotion = String(enabled);
  if (enabled) particles.length = 0;
}

function persistSettings() {
  saveSettings({
    ...state.settings,
    soundEnabled: state.soundEnabled,
    reducedMotionSaved: state.settings.reducedMotionSaved,
  });
}

function updateSettingsUI() {
  $('settings-volume').value = String(Math.round(state.settings.volume * 100));
  $('settings-volume-value').textContent =
    Math.round(state.settings.volume * 100) + '%';
  $('settings-sensitivity').value = String(
    Math.round(state.settings.steeringSensitivity * 100),
  );
  $('settings-sensitivity-value').textContent =
    Math.round(state.settings.steeringSensitivity * 100) + '%';
  $('settings-motion').setAttribute(
    'aria-checked',
    String(state.settings.reducedMotion),
  );
  $('settings-motion').textContent = state.settings.reducedMotion
    ? 'ON'
    : 'OFF';
  $('settings-motion-value').textContent = state.settings.reducedMotion
    ? 'Reduced motion on'
    : 'Reduced motion off';
  $('settings-motion-description').textContent = state.settings
    .reducedMotionSaved
    ? 'Uses your saved preference instead of the device setting.'
    : 'Follows your device preference until you choose a setting.';
  syncSoundButtons();
}

export function openSettings(trigger = document.activeElement) {
  const dialog = $('settings-dialog');
  if (dialog.open) return;
  activeTrigger = trigger;
  pausedBeforeSettings = state.paused;
  setPaused(true);
  updateSettingsUI();
  dialog.showModal();
  $('settings-volume').focus();
}

export function closeSettings() {
  const dialog = $('settings-dialog');
  if (!dialog.open) return;
  dialog.close();
  setPaused(pausedBeforeSettings);
  if (activeTrigger?.isConnected) activeTrigger.focus();
  activeTrigger = null;
}

export function initSettings() {
  if (initialized) return;
  initialized = true;
  const preferences = loadSettings();
  Object.assign(state.settings, {
    volume: preferences.volume,
    steeringSensitivity: preferences.steeringSensitivity,
    reducedMotion: preferences.reducedMotion,
    reducedMotionSaved: preferences.reducedMotionSaved,
  });
  state.soundEnabled = preferences.soundEnabled;
  applyMotionPreference(preferences.reducedMotion);
  updateSettingsUI();

  for (const id of ['settings-setup', 'settings-session', 'settings-pause']) {
    $(id).addEventListener('click', (event) =>
      openSettings(event.currentTarget),
    );
  }
  $('settings-close').addEventListener('click', closeSettings);
  $('settings-done').addEventListener('click', closeSettings);
  $('settings-sound').addEventListener('click', toggleSound);
  $('settings-dialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    closeSettings();
  });
  $('settings-dialog').addEventListener('click', (event) => {
    if (event.target === $('settings-dialog')) closeSettings();
  });
  document.addEventListener(
    'keydown',
    (event) => {
      if (!$('settings-dialog').open) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSettings();
      }
    },
    { capture: true },
  );
  $('settings-volume').addEventListener('input', (event) => {
    state.settings.volume = Number(event.currentTarget.value) / 100;
    setMasterVolume(state.settings.volume);
    $('settings-volume-value').textContent =
      Math.round(state.settings.volume * 100) + '%';
    persistSettings();
  });
  $('settings-sensitivity').addEventListener('input', (event) => {
    state.settings.steeringSensitivity =
      Number(event.currentTarget.value) / 100;
    $('settings-sensitivity-value').textContent =
      Math.round(state.settings.steeringSensitivity * 100) + '%';
    persistSettings();
  });
  $('settings-motion').addEventListener('click', () => {
    state.settings.reducedMotionSaved = true;
    applyMotionPreference(!state.settings.reducedMotion);
    $('settings-motion').setAttribute(
      'aria-checked',
      String(state.settings.reducedMotion),
    );
    $('settings-motion').textContent = state.settings.reducedMotion
      ? 'ON'
      : 'OFF';
    $('settings-motion-value').textContent = state.settings.reducedMotion
      ? 'Reduced motion on'
      : 'Reduced motion off';
    $('settings-motion-description').textContent =
      'Uses your saved preference instead of the device setting.';
    persistSettings();
  });
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotionChange = (event) => {
    if (state.settings.reducedMotionSaved) return;
    applyMotionPreference(event.matches);
    updateSettingsUI();
  };
  if (motionMedia.addEventListener)
    motionMedia.addEventListener('change', onMotionChange);
  else motionMedia.addListener?.(onMotionChange);

  // Build Web Audio only on the first browser gesture; autoplay policies allow it then.
  const activateAudio = () => {
    if (state.soundEnabled) setSoundEnabled(true, { persist: false });
  };
  document.addEventListener('pointerdown', activateAudio, { capture: true });
  document.addEventListener('keydown', activateAudio, { capture: true });
}
