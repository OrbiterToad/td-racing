import { keys } from './state.js';
import { rewind } from './rewind.js';

const pressedPointers = new Map();
const counts = new Map();
let initialized = false;

function press(pointerId, code, button) {
  if (pressedPointers.has(pointerId)) return;
  pressedPointers.set(pointerId, { code, button });
  button.setAttribute('aria-pressed', 'true');
  const count = (counts.get(code) || 0) + 1;
  counts.set(code, count);
  keys.add(code);
  document.body.classList.add('touch-active');
}

function release(pointerId) {
  const pressed = pressedPointers.get(pointerId);
  if (!pressed) return;
  const { code, button } = pressed;
  pressedPointers.delete(pointerId);
  if (![...pressedPointers.values()].some((item) => item.button === button))
    button.setAttribute('aria-pressed', 'false');
  const count = (counts.get(code) || 1) - 1;
  if (count > 0) counts.set(code, count);
  else {
    counts.delete(code);
    keys.delete(code);
  }
  if (!pressedPointers.size) document.body.classList.remove('touch-active');
}

export function clearTouchControls() {
  for (const pointerId of pressedPointers.keys()) release(pointerId);
  counts.clear();
  for (const code of ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'])
    keys.delete(code);
  document.body.classList.remove('touch-active');
}

export function initTouchControls() {
  if (initialized) return;
  initialized = true;
  const controls = document.querySelector('#touch-controls');
  if (!controls) return;

  controls.querySelectorAll('[data-key]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      press(event.pointerId, button.dataset.key, button);
      try {
        button.setPointerCapture(event.pointerId);
      } catch (_) {}
    });
    for (const eventName of [
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ])
      button.addEventListener(eventName, (event) => {
        event.preventDefault();
        release(event.pointerId);
      });
  });

  window.addEventListener(
    'pointerup',
    (event) => release(event.pointerId),
    true,
  );
  window.addEventListener(
    'pointercancel',
    (event) => release(event.pointerId),
    true,
  );
  document.addEventListener(
    'touchmove',
    (event) => {
      if (pressedPointers.size) event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener('blur', clearTouchControls);
  window.addEventListener('pagehide', clearTouchControls);
  window.addEventListener('orientationchange', clearTouchControls);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTouchControls();
  });
  controls.querySelector('#touch-pause')?.addEventListener('click', () => {
    document.querySelector('#pause')?.click();
  });
  controls.querySelector('#touch-rewind')?.addEventListener('click', rewind);
}
