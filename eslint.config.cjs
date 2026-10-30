const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'assets/**',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: Object.fromEntries(
        [
          'createCanvas',
          'resizeCanvas',
          'pixelDensity',
          'drawingContext',
          'width',
          'height',
          'deltaTime',
          'frameCount',
          'millis',
          'noLoop',
          'loop',
        ].map((name) => [name, 'readonly']),
      ),
    },
    rules: {
      // Preserve the existing simulation/rendering locals during extraction.
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['tests/**/*.cjs'],
    // Playwright evaluates browser callbacks inside these Node test files.
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['verify.mjs'],
    languageOptions: { globals: globals.node },
    // Keep existing simulation assertions intact while adding lint coverage.
    rules: { 'no-unused-vars': 'off' },
  },
  prettier,
];
