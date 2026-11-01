const ICON_PATHS = Object.freeze({
  back: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.2 4.1L19 7"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  forward: '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
  garage:
    '<path d="M3.5 10 12 4l8.5 6v10h-17V10Z"/><path d="M7.5 20v-7h9v7m-9-4.5h9"/>',
  pause: '<path d="M8 6v12m8-12v12"/>',
  play: '<path d="m9 6 9 6-9 6V6Z"/>',
  previous: '<path d="M7 6v12m10-12-7 6 7 6"/>',
  restart:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7.5 7.5 0 0 1 18 6.5L20 12M4 12l2 5.5A7.5 7.5 0 0 0 18.5 15"/>',
  soundOff: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
  soundOn:
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11"/>',
  steerLeft: '<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>',
  steerRight: '<path d="M5 12h14m0 0-6-6m6 6-6 6"/>',
});

const TONES = Object.freeze({
  accent: '#d5f578',
  ink: '#edf0e8',
});

export const UI_ICON_NAMES = Object.freeze(Object.keys(ICON_PATHS));

function escapeAttribute(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

/**
 * Return one inline outline icon. Without a label, the SVG is decorative and
 * hidden from assistive technology; a labelled standalone icon exposes an
 * image name. Icon-only controls still need an accessible name on the control.
 */
export function renderUiIcon(name, { label, size = 20, tone } = {}) {
  if (!Object.hasOwn(ICON_PATHS, name))
    throw new RangeError(`Unknown UI icon: ${name}`);
  if (!Number.isInteger(size) || size < 12 || size > 48)
    throw new RangeError('UI icon size must be an integer from 12 to 48');
  if (label !== undefined && (typeof label !== 'string' || !label.trim()))
    throw new TypeError('A labelled UI icon needs a non-empty string label');
  if (tone !== undefined && !Object.hasOwn(TONES, tone))
    throw new RangeError(`Unknown UI icon tone: ${tone}`);

  const accessible =
    label === undefined
      ? ' aria-hidden="true"'
      : ` role="img" aria-label="${escapeAttribute(label.trim())}"`;
  const color = tone === undefined ? '' : ` style="color:${TONES[tone]}"`;

  return `<svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"${accessible}${color}>${ICON_PATHS[name]}</svg>`;
}
