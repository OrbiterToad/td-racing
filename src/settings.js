import {
  setSoundEnabled,
  setMasterVolume,
  syncSoundButtons,
  toggleSound,
} from './audio.js';
import { MAPS, VEHICLES } from './config.js';
import { ghostStatus, selectGhostReference } from './ghost.js';
import {
  ghostMatchesPair,
  MAX_GHOST_DOCUMENT_LENGTH,
  parseLapGhost,
  serializeLapGhost,
} from './ghost-transfer.js';
import { loadSettings, saveSettings } from './settings-preferences.js';
import { setPaused, updateHUD } from './ui.js';
import { ghostLibrary, lapGhost, particles, state } from './state.js';

const $ = (id) => document.getElementById(id);
const IMPORTED_GHOST_KEY = 'apex-imported-ghost-v1';
const GHOST_REFERENCE_KEY = 'apex-ghost-reference-v1';
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
  for (const [id, key, on, off] of [
    [
      'settings-steering-assist',
      'steeringAssist',
      'Steering assist on',
      'Steering assist off',
    ],
    [
      'settings-auto-accelerate',
      'autoAccelerate',
      'Auto-accelerate on',
      'Auto-accelerate off',
    ],
  ]) {
    const enabled = Boolean(state.settings[key]);
    $(id).setAttribute('aria-checked', String(enabled));
    $(id).textContent = enabled ? 'ON' : 'OFF';
    $(id + '-value').textContent = enabled ? on : off;
  }
  syncSoundButtons();
}

function isKnownPairing(bundle) {
  return (
    !!bundle &&
    Object.hasOwn(MAPS, bundle.pairing?.track) &&
    Object.hasOwn(VEHICLES, bundle.pairing?.car)
  );
}

function syncGhostTransferUI() {
  const track = state.activeMap,
    vehicle = state.activeCar,
    importedMatches = ghostMatchesPair(
      ghostLibrary.imported,
      track.id,
      vehicle.id,
    ),
    importedOption = $('ghost-reference').querySelector(
      'option[value="imported"]',
    );
  if (importedMatches) {
    try {
      if (localStorage.getItem(GHOST_REFERENCE_KEY) === 'imported')
        selectGhostReference('imported');
    } catch (_) {}
  }
  $('ghost-transfer-pairing').textContent = track.name + ' · ' + vehicle.name;
  importedOption.disabled = !importedMatches;
  $('ghost-reference').value =
    importedMatches && ghostLibrary.reference === 'imported'
      ? 'imported'
      : 'best';
  $('ghost-export').disabled = !lapGhost.best;
}

function setGhostTransferMessage(message) {
  $('ghost-transfer-status').textContent = message;
}

function importLapGhostFile(file) {
  if (!file) return;
  if (file.size > MAX_GHOST_DOCUMENT_LENGTH) {
    setGhostTransferMessage('File is too large to import.');
    return;
  }
  file
    .text()
    .then((contents) => {
      const bundle = parseLapGhost(contents);
      if (!bundle) {
        setGhostTransferMessage(
          'This file is malformed, unsupported, or contains invalid lap data.',
        );
        return;
      }
      if (!isKnownPairing(bundle)) {
        setGhostTransferMessage(
          'This file uses an unsupported car or circuit.',
        );
        return;
      }
      if (!ghostMatchesPair(bundle, state.activeMap.id, state.activeCar.id)) {
        setGhostTransferMessage(
          `This ghost is for ${MAPS[bundle.pairing.track].name} · ${VEHICLES[bundle.pairing.car].name}. Select that pairing before importing.`,
        );
        return;
      }

      ghostLibrary.imported = bundle;
      selectGhostReference('imported');
      let saved = true;
      try {
        localStorage.setItem(IMPORTED_GHOST_KEY, contents);
        localStorage.setItem(GHOST_REFERENCE_KEY, 'imported');
      } catch (_) {
        saved = false;
      }
      syncGhostTransferUI();
      setGhostTransferMessage(
        saved
          ? `Rival ghost imported · ${bundle.ghost.time.toFixed(3)} seconds. Your personal best is unchanged.`
          : 'Rival ghost loaded for this session. Browser storage is unavailable; your personal best is unchanged.',
      );
      updateHUD();
    })
    .catch(() => {
      setGhostTransferMessage('The selected file could not be read.');
    });
}

function exportLapGhostFile() {
  if (!lapGhost.best) {
    setGhostTransferMessage('Complete a clean lap before exporting a ghost.');
    return;
  }
  try {
    const document = serializeLapGhost(lapGhost.best, {
      track: state.activeMap.id,
      car: state.activeCar.id,
    });
    const url = URL.createObjectURL(
      new Blob([document], { type: 'application/json' }),
    );
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `apex-${state.activeMap.id}-${state.activeCar.id}-ghost.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setGhostTransferMessage('Personal-best ghost exported.');
  } catch (_) {
    setGhostTransferMessage('This ghost could not be exported.');
  }
}

export function openSettings(trigger = document.activeElement) {
  const dialog = $('settings-dialog');
  if (dialog.open) return;
  activeTrigger = trigger;
  pausedBeforeSettings = state.paused;
  setPaused(true);
  $('settings-list').hidden = false;
  $('ghost-transfer-panel').hidden = true;
  $('settings-ghost-tools').textContent = 'LAP GHOSTS';
  updateSettingsUI();
  syncGhostTransferUI();
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
    steeringAssist: preferences.steeringAssist,
    autoAccelerate: preferences.autoAccelerate,
    reducedMotion: preferences.reducedMotion,
    reducedMotionSaved: preferences.reducedMotionSaved,
  });
  state.soundEnabled = preferences.soundEnabled;
  try {
    const savedGhost = localStorage.getItem(IMPORTED_GHOST_KEY),
      imported = parseLapGhost(savedGhost);
    if (imported && isKnownPairing(imported)) ghostLibrary.imported = imported;
    if (
      localStorage.getItem(GHOST_REFERENCE_KEY) === 'imported' &&
      ghostMatchesPair(
        ghostLibrary.imported,
        state.activeMap.id,
        state.activeCar.id,
      )
    )
      selectGhostReference('imported');
  } catch (_) {}
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
  $('settings-ghost-tools').addEventListener('click', (event) => {
    const showingGhostTools = $('ghost-transfer-panel').hidden;
    $('settings-list').hidden = showingGhostTools;
    $('ghost-transfer-panel').hidden = !showingGhostTools;
    event.currentTarget.textContent = showingGhostTools
      ? 'LAP GHOSTS'
      : 'SETTINGS';
    if (showingGhostTools) $('settings-ghost-tools').focus();
    else {
      syncGhostTransferUI();
      $('ghost-reference').focus();
    }
  });
  $('ghost-reference').addEventListener('change', (event) => {
    if (selectGhostReference(event.currentTarget.value)) {
      try {
        localStorage.setItem(GHOST_REFERENCE_KEY, event.currentTarget.value);
      } catch (_) {}
      $('ghost-status').textContent = ghostStatus();
      updateHUD();
    }
  });
  $('ghost-export').addEventListener('click', exportLapGhostFile);
  $('ghost-import').addEventListener('click', () => $('ghost-file').click());
  $('ghost-file').addEventListener('change', (event) => {
    importLapGhostFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = '';
  });
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
  for (const [id, key] of [
    ['settings-steering-assist', 'steeringAssist'],
    ['settings-auto-accelerate', 'autoAccelerate'],
  ])
    $(id).addEventListener('click', () => {
      state.settings[key] = !state.settings[key];
      persistSettings();
      updateSettingsUI();
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
