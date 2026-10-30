const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['assets/**', 'dist/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['main.js'],
    languageOptions: {
      globals: Object.fromEntries([
        'createCanvas', 'resizeCanvas', 'pixelDensity', 'drawingContext',
        'width', 'height', 'deltaTime', 'frameCount', 'millis', 'noLoop', 'loop',
      ].map(name => [name, 'readonly'])),
    },
    rules: {
      // p5 invokes callbacks by name; the simulation harness also uses helpers.
      // Existing game code contains unused locals, so defer this cleanup.
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['verify.cjs'],
    // Keep existing simulation assertions intact while adding lint coverage.
    rules: { 'no-unused-vars': 'off' },
  },
];
