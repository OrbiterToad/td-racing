import { setup, windowResized } from './src/runtime.js';
import { draw } from './src/renderer.js';
import { initSettings } from './src/settings.js';

initSettings();
import { initTutorial } from './src/tutorial.js';

// p5's global mode discovers these callbacks on window.
Object.assign(window, { setup, draw, windowResized });
initTutorial();
