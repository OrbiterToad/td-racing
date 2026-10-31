const { defineConfig } = require('@playwright/test');
const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}/td-racing/`;

module.exports = defineConfig({
  testDir: './tests',
  // Each scenario has its own page; shard individual tests evenly in CI.
  fullyParallel: true,
  // Node simulation tests use .test.mjs; browser tests use .spec.cjs.
  testMatch: '**/*.spec.cjs',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: ['chromium', 'firefox', 'webkit'].map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tools/serve-site.cjs',
    url: baseURL,
    reuseExistingServer: false,
  },
});
