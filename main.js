import { setup, windowResized } from './src/runtime.js';
import { draw } from './src/renderer.js';

// p5's global mode discovers these callbacks on window.
Object.assign(window, { setup, draw, windowResized });
