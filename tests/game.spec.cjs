const { test, expect } = require('@playwright/test');

test('packaged game loads, changes tracks and cars, and remembers selections', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL).origin + '/';
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(origin)) errors.push(request.url());
  });

  // Keep CI independent of third-party services and verify bundled p5 works.
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);

  const tracks = [
    'Desert Canyon',
    'Alpine Pass',
    'Ridgeway Rallycross',
    'Amazonas',
    'Costa Azul',
    'Juniper Raceway',
    'City Streets',
  ];
  for (const track of tracks) {
    await page.locator('#open-tracks').click();
    await page
      .getByRole('button', { name: `Choose ${track}`, exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#selection-dialog')).not.toBeVisible();
    await expect(page.locator('#track-title')).toHaveText(track);
  }

  for (const car of [
    'Clubsport R',
    'Sprint GT',
    'Offroad',
    'Drift Spec',
    'Iron V8',
    'Formula X',
  ]) {
    await page.locator('#open-garage').click();
    await expect(page.locator('.car-platform img')).toHaveCount(6);
    await expect
      .poll(() =>
        page
          .locator('.car-platform img')
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
      )
      .toBe(true);
    await page
      .getByRole('button', { name: `Choose ${car}`, exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#car-name')).toHaveText(car.toUpperCase());
  }

  await page.reload();
  await expect(page.locator('#car-name')).toHaveText('FORMULA X');
  await expect(page.locator('#track-title')).toHaveText('City Streets');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();

  await page.locator('#pause').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  await page.locator('#resume').click();
  await expect(page.locator('#pause-screen')).not.toHaveClass('open');
  expect(errors).toEqual([]);
});

test('module callbacks keep driving, resize, pause, and restart working', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);
  await page.keyboard.down('KeyW');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { car } = await import('./src/state.js');
        return Math.hypot(car.vx, car.vy);
      }),
    )
    .toBeGreaterThan(10);
  await page.keyboard.up('KeyW');

  await page.locator('#pause').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  const before = await page.evaluate(async () => {
    const { car } = await import('./src/state.js');
    return { x: car.x, y: car.y };
  });
  // Pause must hold across several rendered frames.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const tick = () =>
          ++frames === 5 ? resolve() : requestAnimationFrame(tick);
        requestAnimationFrame(tick);
      }),
  );
  expect(
    await page.evaluate(async () => {
      const { car } = await import('./src/state.js');
      return { x: car.x, y: car.y };
    }),
  ).toEqual(before);

  const canvas = page.locator('#game canvas.p5Canvas');
  const initial = await canvas.boundingBox();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect
    .poll(async () => (await canvas.boundingBox()).width)
    .not.toBe(initial.width);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const host = document.getElementById('game');
        return (
          window.width === host.clientWidth &&
          window.height === host.clientHeight
        );
      }),
    )
    .toBe(true);

  await page.locator('#resume').click();
  await page.locator('#restart').click();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);
  expect(
    await page.evaluate(async () => {
      const { car } = await import('./src/state.js');
      return Math.hypot(car.vx, car.vy);
    }),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test('club race starts, pauses, restarts, finishes, and returns to time trial', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  await page.locator('#race-mode').click();
  await expect(page.locator('#race-panel')).toBeVisible();
  await expect(page.locator('#track-title')).toHaveText('Juniper Raceway');
  await expect(page.locator('#car-name')).toHaveText('CLUBSPORT R');
  await expect(page.locator('#race-standings')).toHaveText(
    /Alex[\s\S]*Blair[\s\S]*Casey/,
  );
  await expect(page.locator('#session-mode')).toHaveText('CLUB RACE');
  await expect(page.locator('#lap')).toHaveText('1 / 3');
  const readRace = () =>
    page.evaluate(async () => {
      const { opponentRace } = await import('./src/state.js');
      return {
        elapsed: opponentRace.elapsed,
        positions: opponentRace.cars.map((c) => c.s),
      };
    });
  await expect.poll(async () => (await readRace()).elapsed).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { opponentArt } = await import('./src/opponents.js');
        return Object.values(opponentArt).every(
          (art) => art.complete && art.naturalWidth > 0,
        );
      }),
    )
    .toBe(true);
  await page.screenshot({ path: testInfo.outputPath('club-race.png') });
  await page.locator('#pause').click();
  const pausedState = await readRace();
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        function frame() {
          if (++frames === 12) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  expect(await readRace()).toEqual(pausedState);
  await page.locator('#resume').click();
  await page.keyboard.press('n');
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  expect((await readRace()).elapsed).toBe(0);
  await page.evaluate(async () => {
    const { chooseStartingSlot } = await import('./src/race.js');
    chooseStartingSlot(3);
  });
  expect((await readRace()).positions).not.toContain(-330);

  // Exercise the production timing gates without steering for several minutes.
  await page.evaluate(async () => {
    const { race, opponentRace } = await import('./src/state.js');
    const { updateRace } = await import('./src/race.js');
    const { updateHUD } = await import('./src/ui.js');
    race.countdown = 0;
    race.started = true;
    race.crossedStart = true;
    opponentRace.elapsed = 240;
    for (let lap = 0; lap < 3; lap++) {
      race.next = 1;
      for (const gate of [0.25, 0.5, 0.75]) {
        race.previous = gate - 0.001;
        updateRace(0.02, { progress: gate + 0.001, distance: 0 });
      }
      race.travel = 0.999;
      race.previous = 0.999;
      updateRace(0.02, { progress: 0.001, distance: 0 });
    }
    updateHUD();
  });
  await expect(page.locator('#race-position')).toHaveText('FINISHED · P1 / 4');
  await expect(page.locator('#race-help')).toContainText(
    'Restart to race again',
  );
  await page.locator('#restart').click();
  await expect(page.locator('#race-position')).toContainText('POSITION');
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  await page.locator('#race-mode').click();
  await expect(page.locator('#race-panel')).not.toBeVisible();
  await expect(page.locator('#session-mode')).toHaveText('FREE PRACTICE');
  expect((await readRace()).positions).toEqual([]);
  expect(errors).toEqual([]);
});
