const STORAGE_KEY = 'apex-tutorial-v1';

const steps = [
  {
    title: 'Get moving',
    copy: 'Hold W or ↑ to accelerate. Use A / D or ← / → to steer. Release the throttle to coast.',
    keys: ['W / ↑', 'A / ←', 'D / →'],
  },
  {
    title: 'Brake before the turn',
    copy: 'Hold S or ↓ to brake. SPACE applies the handbrake for a tighter, looser slide. Let go to regain grip.',
    keys: ['S / ↓ BRAKE', 'SPACE HANDBRAKE'],
  },
  {
    title: 'Read the surface',
    copy: 'The surface label shows what is under your car. Oil, ice, sand and gravel reduce grip, so slow down and steer smoothly.',
    keys: ['CHECK THE SURFACE CHIP'],
  },
  {
    title: 'Make a clean lap',
    copy: 'Pass each checkpoint in order and cross the start line to finish the lap. Cutting a corner or crossing a checkpoint out of order invalidates the lap.',
    keys: ['CHECKPOINTS IN ORDER', 'CLEAN LAP = VALID TIME'],
  },
  {
    title: 'Recover and restart',
    copy: 'Press R to recover your car to the circuit. Recovery invalidates the current lap; cross the start line again to begin a clean one. N restarts from your grid spot.',
    keys: ['R RECOVER', 'N RESTART'],
  },
  {
    title: 'Pause any time',
    copy: 'Press ESC to pause and open the pits screen. Choose Back on Track to resume. You can open this guide again from Help there.',
    keys: ['ESC PAUSE'],
  },
  {
    title: 'Chase your ghost',
    copy: 'A clean personal best saves a ghost lap. On your next time trial, the ghost shows your best line so you can compare pace corner by corner.',
    keys: ['CLEAN PERSONAL BEST', 'GHOST ON THE NEXT LAP'],
  },
];

let status = null;
let decided = false;
let currentStep = 0;
let returnFocus = null;

export function initTutorial() {
  const dialog = document.getElementById('tutorial-dialog'),
    back = document.getElementById('tutorial-back'),
    next = document.getElementById('tutorial-next'),
    skip = document.getElementById('tutorial-skip'),
    finish = document.getElementById('tutorial-finish');
  if (!dialog || dialog.dataset.initialized) return;
  dialog.dataset.initialized = 'true';
  status = readStatus();
  decided = status !== null;

  const help = document.getElementById('tutorial-help');
  help.addEventListener('click', () => openTutorial(help));
  document.getElementById('selection-dialog').addEventListener('close', () => {
    if (!decided && !dialog.open) openTutorial(document.getElementById('game'));
  });
  back.addEventListener('click', () => renderStep(currentStep - 1));
  next.addEventListener('click', () => renderStep(currentStep + 1));
  skip.addEventListener('click', () => closeTutorial('dismissed'));
  finish.addEventListener('click', () => closeTutorial('completed'));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTutorial('dismissed');
  });
  renderStep(0);
}

function readStatus() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'completed' || saved === 'dismissed' ? saved : null;
  } catch (_) {
    return null;
  }
}

function saveStatus(nextStatus) {
  if (status !== 'completed' || nextStatus === 'completed') status = nextStatus;
  decided = true;
  try {
    localStorage.setItem(STORAGE_KEY, status);
  } catch (_) {}
}

function openTutorial(focusAfterClose = document.activeElement) {
  currentStep = 0;
  returnFocus = focusAfterClose;
  renderStep(currentStep);
  const dialog = document.getElementById('tutorial-dialog');
  if (!dialog.open) dialog.showModal();
  document.getElementById('tutorial-skip').focus();
}

function closeTutorial(outcome) {
  saveStatus(outcome);
  const dialog = document.getElementById('tutorial-dialog');
  if (dialog.open) dialog.close();
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}

function renderStep(index) {
  currentStep = Math.max(0, Math.min(steps.length - 1, index));
  const step = steps[currentStep],
    last = currentStep === steps.length - 1;
  document.getElementById('tutorial-step').textContent =
    `GUIDE / ${String(currentStep + 1).padStart(2, '0')} OF ${String(steps.length).padStart(2, '0')}`;
  document.getElementById('tutorial-progress').value = currentStep + 1;
  document.getElementById('tutorial-heading').textContent = step.title;
  document.getElementById('tutorial-copy').textContent = step.copy;
  const keys = document.getElementById('tutorial-keys');
  keys.replaceChildren(
    ...step.keys.map((label) => {
      const key = document.createElement('kbd');
      key.textContent = label;
      return key;
    }),
  );
  const back = document.getElementById('tutorial-back'),
    next = document.getElementById('tutorial-next'),
    finish = document.getElementById('tutorial-finish');
  back.disabled = currentStep === 0;
  next.hidden = last;
  finish.hidden = !last;
}
