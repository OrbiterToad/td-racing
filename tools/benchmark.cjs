/* global requestAnimationFrame, window, document */
// Optional local benchmark; deliberately excluded from required CI timing gates.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const maps = [
  'juniper',
  'canyon',
  'alpine',
  'rallycross',
  'amazonas',
  'coast',
  'city',
];

async function main() {
  const frames = Number(process.env.BENCHMARK_FRAMES || 240);
  const repeats = Number(process.env.BENCHMARK_REPEATS || 3);
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 10)
    throw new Error('BENCHMARK_REPEATS must be an integer from 1 to 10');
  if (!Number.isInteger(frames) || frames < 60 || frames > 3600)
    throw new Error('BENCHMARK_FRAMES must be an integer from 60 to 3600');
  const output = path.resolve(
    process.env.BENCHMARK_OUTPUT ||
      path.join(root, 'test-results/performance/report.json'),
  );
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = path.resolve(
        root,
        '.' +
          decodeURIComponent(
            url.pathname === '/' ? '/index.html' : url.pathname,
          ),
      );
      if (
        !file.startsWith(root + path.sep) ||
        /(?:^|\/)\.|GITHUB_TOKEN/.test(path.relative(root, file))
      )
        throw new Error('Outside public source');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    // A distinct OS-assigned loopback port avoids other agents' test servers.
    server.listen(0, '127.0.0.1', resolve);
  });
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const contextOptions = {
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    };
    const report = {
      revision: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      dirty: !!execFileSync('git', ['status', '--porcelain'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      capturedAt: new Date().toISOString(),
      launch: { headless: true, extraFlags: [] },
      machine: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpu: os.cpus()[0].model,
        logicalCpus: os.cpus().length,
        memoryGiB: os.totalmem() / 2 ** 30,
        loadAverage: os.loadavg(),
      },
      node: process.version,
      browser: browser.version(),
      playwright: require('playwright/package.json').version,
      context: contextOptions,
      startup: [],
      runs: [],
      profiles: [],
    };
    const origin = `http://127.0.0.1:${server.address().port}`;
    const metadataPage = await browser.newPage();
    report.graphics = await metadataPage.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        userAgent: navigator.userAgent,
        renderer: info
          ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
          : 'unavailable',
      };
    });
    await metadataPage.close();
    const errors = [];
    async function newContext() {
      const context = await browser.newContext(contextOptions);
      await context.route('https://**/*', (route) => route.abort());
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'info') console.log(message.text());
      });
      page.on('response', (response) => {
        if (response.url().startsWith(origin) && response.status() >= 400)
          errors.push(`${response.status()} ${response.url()}`);
      });
      return { context, page };
    }
    for (let repeat = 0; repeat < repeats; repeat++) {
      for (const map of maps) {
        const { context, page } = await newContext();
        await context.addInitScript(
          (id) => localStorage.setItem('apex-selected-track', id),
          map,
        );
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
        const ready = await page.evaluate(async () => {
          const { state } = await import('/src/state.js');
          const deadline = performance.now() + 30_000;
          while (!state.mapCtx) {
            if (performance.now() > deadline)
              throw new Error('Startup timed out');
            await new Promise(requestAnimationFrame);
          }
          const menuReadyMs = performance.now();
          const start = performance.now();
          // Exercise the actual Car → Circuit → Mode → Start handlers.
          for (let step = 0; state.selectingSession && step < 3; step++)
            document.getElementById('picker-apply').click();
          if (!state.worldCanvas)
            throw new Error('Start did not build a circuit');
          await new Promise(requestAnimationFrame);
          state.ctx.getImageData(0, 0, 1, 1);
          return {
            readyMs: performance.now(),
            menuReadyMs,
            startToFrameMs: performance.now() - start,
            map: state.activeMap.id,
            resources: performance.getEntriesByType('resource').length,
          };
        });
        if (ready.map !== map)
          throw new Error(`Startup selected ${ready.map}, expected ${map}`);
        report.startup.push({ repeat, ...ready });
        await context.close();
      }
      const { context, page } = await newContext();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
      await page.goto(`${origin}/tools/performance.html?frames=${frames}`);
      await page.waitForFunction(() => window.performanceResult, null, {
        timeout: 300_000,
      });
      const result = await page.evaluate(() => window.performanceResult);
      if (!result.ok) throw new Error(result.error);
      if (result.benchmark.results.length !== maps.length * 2 + 1)
        throw new Error('Missing benchmark scenarios');
      report.runs.push(result.benchmark);
      const { profile } = await cdp.send('Profiler.stop');
      const nodes = new Map(
        profile.nodes.map((node) => [node.id, node.callFrame]),
      );
      const samples = new Map();
      profile.samples.forEach((id, i) => {
        const frame = nodes.get(id);
        const key = `${frame.functionName || '(anonymous)'} ${frame.url.replace(origin, '')}`;
        samples.set(
          key,
          (samples.get(key) || 0) + profile.timeDeltas[i] / 1000,
        );
      });
      report.profiles.push(
        [...samples]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 25)
          .map(([frame, selfMs]) => ({ frame, selfMs })),
      );
      await page
        .frameLocator('#game')
        .locator('#game canvas.p5Canvas')
        .screenshot({
          path: output.replace(/\.json$/, '') + `-run${repeat + 1}.png`,
        });
      await context.close();
      console.log(`Completed repeat ${repeat + 1}/${repeats}`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    report.finalLoadAverage = os.loadavg();
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Performance report: ${output}`);
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
