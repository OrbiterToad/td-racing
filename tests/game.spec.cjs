const { test, expect } = require('@playwright/test');

async function startSession(page) {
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText('Choose your mode.');
  await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();
}

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
  await startSession(page);
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);

  const tracks = [
    'Desert Canyon',
    'Alpine Pass',
    'Ridgeway Rallycross',
    'Amazonas',
    'Costa Azul',
    'Juniper Raceway',
    'Summit Grand Prix',
    'City Streets',
    'Neon Harbor Drift Park',
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
    await expect(page.locator('.choice-tile img')).toHaveCount(6);
    await expect
      .poll(() =>
        page
          .locator('.choice-tile img')
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
  await expect(page.locator('[data-choice="formula"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await startSession(page);
  await expect(page.locator('#car-name')).toHaveText('FORMULA X');
  await expect(page.locator('#track-title')).toHaveText(
    'Neon Harbor Drift Park',
  );
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();

  await page.locator('#pause').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  await page.locator('#resume').click();
  await expect(page.locator('#pause-screen')).not.toHaveClass('open');
  expect(errors).toEqual([]);
});

test('gamepad can navigate and confirm the session setup wizard', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.fakePad = {
      connected: true,
      index: 0,
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [window.fakePad],
    });
  });
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#gamepad-status')).toHaveText(
    'Controller connected',
  );

  const press = async (button) => {
    await page.evaluate((index) => {
      window.fakePad.buttons[index].pressed = true;
    }, button);
    await page.waitForTimeout(100);
    await page.evaluate((index) => {
      window.fakePad.buttons[index].pressed = false;
    }, button);
    await page.waitForTimeout(100);
  };
  await press(0);
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await press(0);
  await expect(page.locator('#picker-title')).toHaveText('Choose your mode.');
  await press(0);
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  await expect(page.locator('#tutorial-dialog')).toBeVisible();
  await press(0);
  await expect(page.locator('#tutorial-heading')).toHaveText(
    'Brake before the turn',
  );
  await page.locator('#tutorial-skip').click();
  await expect(page.locator('#tutorial-dialog')).not.toBeVisible();
  await page.locator('#pause').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  await press(9);
  await expect(page.locator('#pause-screen')).not.toHaveClass('open');
  await press(3);
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);
});

test('module callbacks keep driving, resize, pause, and restart working', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await startSession(page);
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
  await startSession(page);
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
  await page.locator('[data-action="again"]').click();
  await expect(page.locator('#race-position')).toContainText('POSITION');
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  await page.locator('#race-mode').click();
  await expect(page.locator('#race-panel')).not.toBeVisible();
  await expect(page.locator('#session-mode')).toHaveText('FREE PRACTICE');
  expect((await readRace()).positions).toEqual([]);
  expect(errors).toEqual([]);
});

test('local split screen selects two cars, drives separate viewports, pauses and resets', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#step-player-two')).toBeHidden();
  await page.locator('[data-choice="local"]').click();
  await expect(page.locator('#step-player-two')).toBeVisible();
  await expect(page.locator('#picker-apply')).toContainText(
    'NEXT / PLAYER 2 CAR',
  );
  await expect(page.locator('#selection-dialog')).toContainText(
    'arrow keys or a second gamepad',
  );
  await page.locator('#picker-apply').click();

  // Player 2 gets the full car roster and every paint, like Player 1.
  await expect(page.locator('#selection-dialog')).toHaveAttribute(
    'data-mode',
    'playerTwo',
  );
  await expect(page.locator('#picker-title')).toHaveText('Player 2 ride.');
  const { VEHICLES, PAINTS } = await page.evaluate(async () => {
    const config = await import('./src/config.js');
    return {
      VEHICLES: Object.keys(config.VEHICLES),
      PAINTS: Object.keys(config.PAINTS),
    };
  });
  await expect(page.locator('[data-choice]')).toHaveCount(VEHICLES.length);
  await expect(page.locator('[data-paint]')).toHaveCount(PAINTS.length);
  await page.locator('[data-choice="formula"]').click();
  await page.locator('[data-paint="yellow"]').click();
  await expect(page.locator('#picker-footnote')).toContainText(
    'PLAYER 2 / FORMULA',
  );
  await expect(page.locator('.feature-art img')).toHaveAttribute(
    'src',
    /formula.*yellow|yellow.*formula/,
  );
  // Going back keeps the choice and shows it on the mode step.
  await page.locator('#wizard-back').click();
  await expect(page.locator('.player-two-summary')).toContainText('Sunburst');
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="formula"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();
  await expect(page.locator('#split-hint')).toBeVisible();
  await expect(page.locator('#drive-hint')).toBeHidden();

  const initial = await page.evaluate(async () => {
    const { state, car } = await import('./src/state.js');
    return {
      cars: state.localRace.carSpecs.map((spec) => spec.id),
      paints: state.localRace.paints,
      saved: JSON.parse(localStorage.getItem('apex-player-two')),
      p1: { x: car.x, y: car.y },
      p2: { x: state.localRace.players[1].x, y: state.localRace.players[1].y },
      countdown: state.localRace.countdown,
    };
  });
  expect(initial.cars).toEqual(['clubsport', 'formula']);
  expect(initial.paints[1]).toBe('yellow');
  expect(initial.saved).toEqual({ car: 'formula', paint: 'yellow' });
  expect(initial.countdown).toBeGreaterThan(0);

  // WASD drives only the left car, the arrow keys only the right car.
  const drive = (codes) =>
    page.evaluate(async (codes) => {
      const { state, car, race, keys } = await import('./src/state.js');
      const { simulate } = await import('./src/physics.js');
      race.countdown = 0;
      state.localRace.countdown = 0;
      for (const p of [car, state.localRace.players[1]])
        Object.assign(p, { vx: 0, vy: 0, yaw: 0 });
      const before = [
        { x: car.x, y: car.y },
        { x: state.localRace.players[1].x, y: state.localRace.players[1].y },
      ];
      for (const code of codes) keys.add(code);
      for (let i = 0; i < 60; i++) simulate(1 / 60);
      keys.clear();
      const after = [car, state.localRace.players[1]];
      return after.map((p, i) =>
        Math.hypot(p.x - before[i].x, p.y - before[i].y),
      );
    }, codes);
  const arrows = await drive(['ArrowUp']);
  expect(arrows[0]).toBeLessThan(1);
  expect(arrows[1]).toBeGreaterThan(10);
  const wasd = await drive(['KeyW']);
  expect(wasd[0]).toBeGreaterThan(10);
  expect(wasd[1]).toBeLessThan(1);
  const ijkl = await drive(['KeyI']);
  expect(ijkl[1]).toBeLessThan(1);

  // Each half follows its own car with its own camera.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const tick = () =>
          ++frames === 6 ? resolve() : requestAnimationFrame(tick);
        requestAnimationFrame(tick);
      }),
  );
  const cameras = await page.evaluate(async () => {
    const { state } = await import('./src/state.js');
    return state.localRace.cameras.map(({ x, y }) => ({ x, y }));
  });
  expect(cameras).toHaveLength(2);
  expect(cameras[0]).not.toEqual(cameras[1]);

  await page.locator('#pause').click();
  const frozen = await page.evaluate(async () => {
    const { state, car } = await import('./src/state.js');
    return {
      paused: state.paused,
      p1: { x: car.x, y: car.y },
      p2: { x: state.localRace.players[1].x, y: state.localRace.players[1].y },
    };
  });
  expect(frozen.paused).toBe(true);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const tick = () =>
          ++frames === 12 ? resolve() : requestAnimationFrame(tick);
        requestAnimationFrame(tick);
      }),
  );
  expect(
    await page.evaluate(async () => {
      const { state, car } = await import('./src/state.js');
      return {
        p1: { x: car.x, y: car.y },
        p2: {
          x: state.localRace.players[1].x,
          y: state.localRace.players[1].y,
        },
      };
    }),
  ).toEqual({ p1: frozen.p1, p2: frozen.p2 });
  await page.locator('#resume').click();
  await page.locator('#restart').click();
  const reset = await page.evaluate(async () => {
    const { state } = await import('./src/state.js');
    return {
      countdown: state.localRace.countdown,
      secondPlayer: state.localRace.players[1],
      selectedCar: state.localRace.carSpecs[1].id,
    };
  });
  expect(reset.countdown).toBeGreaterThan(2.5);
  expect(reset.selectedCar).toBe('formula');
  expect(reset.secondPlayer.vx).toBe(0);
  expect(errors).toEqual([]);
});

test('wizard waits for car, circuit and mode, preserves choices when going back, and supports keys', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#selection-dialog')).toBeVisible();
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  const readStartup = () =>
    page.evaluate(async () => {
      const { state, race } = await import('./src/state.js');
      return {
        worldBuilt: !!state.worldCanvas,
        countdown: race.countdown,
        paused: state.paused,
      };
    });
  expect(await readStartup()).toEqual({
    worldBuilt: false,
    countdown: 0,
    paused: true,
  });
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#selection-dialog')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-choice="sprint"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Paint Ocean', exact: true }).click();
  await page.locator('#picker-apply').click();
  await page
    .getByRole('button', { name: 'Choose Costa Azul', exact: true })
    .click();
  await page.locator('#wizard-back').click();
  await expect(page.locator('#selection-dialog')).toBeVisible();
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await expect(guide).not.toBeVisible();
  await expect(page.locator('[data-choice="sprint"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Paint Ocean', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="coast"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await readStartup()).worldBuilt).toBe(false);
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText('Choose your mode.');
  await expect(
    page.getByRole('button', { name: 'Choose Club race', exact: true }),
  ).toBeEnabled();
  expect((await readStartup()).worldBuilt).toBe(false);
  await page
    .getByRole('button', { name: 'Back to circuit selection', exact: true })
    .click();
  await expect(page.locator('[data-choice="coast"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#track-title')).toHaveText('Costa Azul');
  await expect(page.locator('#car-name')).toHaveText('SPRINT GT');
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  expect((await readStartup()).worldBuilt).toBe(true);
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();

  // Canceling an in-session picker keeps the selected car and lap intact.
  await page.locator('#pause').click();
  await page.locator('#open-garage').click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('#car-name')).toHaveText('SPRINT GT');
  await expect(page.locator('#pause-screen')).toHaveClass('open');
});

for (const pixelRatio of [1, 2]) {
  test(`track preview uses device scale ${pixelRatio} and redraws on resize`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: pixelRatio,
    });
    const page = await context.newPage();
    await page.route('https://**/*', (route) => route.abort());
    await page.goto(
      `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || 4173}/td-racing/`,
    );
    await page.locator('#picker-apply').click();
    const preview = page.locator('#selected-preview');
    const assertResolution = async () => {
      await page.waitForTimeout(50);
      const dimensions = await preview.evaluate((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return {
          width: canvas.width,
          height: canvas.height,
          expectedWidth: Math.round(rect.width * devicePixelRatio),
          expectedHeight: Math.round(rect.height * devicePixelRatio),
        };
      });
      expect(dimensions.width).toBe(dimensions.expectedWidth);
      expect(dimensions.height).toBe(dimensions.expectedHeight);
    };
    await assertResolution();
    await page.setViewportSize({ width: 1200, height: 900 });
    await assertResolution();
    await context.close();
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 800, height: 600 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
]) {
  test(`selection menus keep navigation visible and choices reachable at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route('https://**/*', (route) => route.abort());
    await page.goto('./');
    await expect(page.locator('#selection-dialog')).toBeVisible();
    for (const mode of ['garage', 'tracks', 'modes']) {
      await expect(page.locator('#selection-dialog')).toHaveAttribute(
        'data-mode',
        mode,
      );
      for (
        let choice = 0;
        choice < (mode === 'garage' ? 6 : mode === 'tracks' ? 9 : 1);
        choice++
      ) {
        const dimensions = await page
          .locator('#selection-dialog')
          .evaluate((dialog) => {
            const feature = dialog
              .querySelector('.selection-feature')
              .getBoundingClientRect();
            const art = dialog
              .querySelector('.feature-art')
              .getBoundingClientRect();
            const button = dialog
              .querySelector('#picker-apply')
              .getBoundingClientRect();
            return {
              overflowing: [
                '#selection-dialog',
                '.selection-feature',
                ...(innerWidth > 650 ? ['.picker-content'] : []),
                // Detail and choice panels intentionally scroll instead of shrinking text.
                '.paint-row',
                '.picker-navigation',
                '.picker-bottom',
              ].filter((selector) => {
                const el =
                  selector === '#selection-dialog'
                    ? dialog
                    : dialog.querySelector(selector);
                return (
                  el &&
                  el.clientHeight &&
                  (el.scrollHeight > el.clientHeight + 2 ||
                    el.scrollWidth > el.clientWidth + 2)
                );
              }),
              buttonVisible:
                button.bottom <= innerHeight && button.right <= innerWidth,
              previewVisible: art.height > 40 && feature.height > 100,
              horizontalOverflow: dialog.scrollWidth > dialog.clientWidth + 2,
            };
          });
        expect(dimensions).toEqual({
          overflowing: [],
          buttonVisible: true,
          previewVisible: true,
          horizontalOverflow: false,
        });
        await page.keyboard.press('ArrowRight');
      }
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#picker-count')).toHaveText(
        mode === 'garage'
          ? '02 / 06'
          : mode === 'tracks'
            ? '02 / 09'
            : '03 / 07',
      );
      await page.locator('#picker-apply').click();
    }
  });
}

test('wizard step buttons and Back/Next navigate directly while preserving choices', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');

  await expect(page.locator('#wizard-back')).toBeDisabled();
  await page.locator('[data-choice="clubsport"]').click();
  await page.getByRole('button', { name: 'Paint Ocean', exact: true }).click();
  await page.locator('#step-mode').click();
  await expect(page.locator('#picker-title')).toHaveText('Choose your mode.');
  await expect(page.locator('#picker-apply')).toHaveText('START DRIVING');
  await expect(page.locator('#step-mode')).toHaveAttribute(
    'aria-current',
    'step',
  );

  await page.locator('#wizard-back').click();
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await page.locator('[data-choice="juniper"]').click();
  await page.locator('#wizard-back').click();
  await expect(page.locator('[data-choice="clubsport"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Paint Ocean', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="juniper"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#step-mode').click();
  await page
    .getByRole('button', { name: 'Choose Club race', exact: true })
    .click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#race-panel')).toBeVisible();
  await expect(page.locator('#car-name')).toHaveText('CLUBSPORT R');
  await expect(page.locator('#track-title')).toHaveText('Juniper Raceway');
});

test('club race can be selected on the final wizard page and survives back navigation', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText('Choose your mode.');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-choice="race"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="race"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#race-panel')).toBeVisible();
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();
  await expect(page.locator('#race-standings')).toHaveText(
    /Alex[\s\S]*Blair[\s\S]*Casey/,
  );
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  await expect(page.locator('#track-title')).toHaveText('Juniper Raceway');
  await expect(page.locator('#car-name')).toHaveText('CLUBSPORT R');

  // The results screen can reuse this entry point without reloading the page.
  await page.evaluate(async () => {
    const { openSessionSetup } = await import('./src/ui.js');
    openSessionSetup();
  });
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await expect(page.locator('[data-choice="clubsport"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="juniper"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('[data-choice="race"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#race-panel')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
});

test('skill trials explain the selected event and start outside time-trial records', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await page.locator('[data-choice="slalom"]').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#skill-trial-dialog')).toBeVisible();
  await expect(page.locator('#skill-trial-copy')).toContainText(
    'Pass all five alternating gates',
  );
  await page.locator('#skill-trial-primary').click();
  const session = await page.evaluate(async () => {
    const { skillTrial, state } = await import('./src/state.js');
    return {
      active: skillTrial.active,
      id: skillTrial.id,
      ordinaryBest: localStorage.getItem(state.BEST_KEY),
      skillBest: localStorage.getItem('apex-skill-trials-v1'),
    };
  });
  expect(session).toEqual({
    active: true,
    id: 'slalom',
    ordinaryBest: null,
    skillBest: null,
  });
});

test('braking trial requires its advertised 120 km/h target and supports quick retry', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await page.locator('[data-choice="braking"]').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#skill-trial-dialog')).toBeVisible();
  await page.locator('#skill-trial-primary').click();

  const tooSlowResult = await page.evaluate(async () => {
    const [{ car, race, skillTrial }, { updateSkillTrial }, { setPaused }] =
      await Promise.all([
        import('./src/state.js'),
        import('./src/skill-trials.js'),
        import('./src/ui.js'),
      ]);
    setPaused(true, false);
    race.countdown = 0;
    Object.assign(skillTrial, {
      id: 'braking',
      active: true,
      started: false,
      elapsed: 0,
      startProgress: 0,
      previousProgress: 0,
      startSpeed: 0,
      brakingDistance: 0,
    });
    car.vx = 250;
    car.vy = 0;
    updateSkillTrial(1 / 60, { after: { progress: 0 }, braking: true });
    car.vx = 0;
    updateSkillTrial(1 / 60, { after: { progress: 0 }, braking: true });
    return document.querySelector('#skill-trial-dialog').dataset.phase;
  });
  expect(tooSlowResult).not.toBe('result');

  await page.evaluate(async () => {
    const [{ car }, { updateSkillTrial }] = await Promise.all([
      import('./src/state.js'),
      import('./src/skill-trials.js'),
    ]);
    car.vx = 270;
    updateSkillTrial(1 / 60, { after: { progress: 0 }, braking: true });
    car.vx = 0;
    updateSkillTrial(1 / 60, { after: { progress: 0 }, braking: true });
  });
  await expect(page.locator('#skill-trial-dialog')).toBeVisible();
  await expect(page.locator('#skill-trial-copy')).toContainText(
    'Stopped after',
  );
  await expect(page.locator('#skill-trial-stats')).toContainText('ATTEMPTS 1');
  await page.locator('#skill-trial-primary').click();
  const retry = await page.evaluate(async () => {
    const { skillTrial } = await import('./src/state.js');
    return {
      active: skillTrial.active,
      id: skillTrial.id,
      progress: JSON.parse(localStorage.getItem('apex-skill-trials-v1')),
    };
  });
  expect(retry.active).toBe(true);
  expect(retry.id).toBe('braking');
  expect(retry.progress.braking).toMatchObject({ attempts: 1, completions: 1 });
});
