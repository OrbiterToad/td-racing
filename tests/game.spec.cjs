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
  await expect(page.locator('#track-title')).toHaveText('City Streets');
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

test('wizard waits for car, circuit and mode, preserves choices when going back, and supports keys', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
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
  await page.keyboard.press('Escape');
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
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
  ).toBeDisabled();
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

  // Canceling an in-session picker keeps the selected car and lap intact.
  await page.locator('#pause').click();
  await page.locator('#open-garage').click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('#car-name')).toHaveText('SPRINT GT');
  await expect(page.locator('#pause-screen')).toHaveClass('open');
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
  { width: 800, height: 600 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
]) {
  test(`selection menus fit without scrolling at ${viewport.width} × ${viewport.height}`, async ({
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
        choice < (mode === 'garage' ? 6 : mode === 'tracks' ? 7 : 1);
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
                '.picker-content',
                '.feature-copy',
                '.choice-rail',
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
            };
          });
        expect(dimensions).toEqual({
          overflowing: [],
          buttonVisible: true,
          previewVisible: true,
        });
        await page.keyboard.press('ArrowRight');
      }
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#picker-count')).toHaveText(
        mode === 'garage'
          ? '02 / 06'
          : mode === 'tracks'
            ? '02 / 07'
            : '01 / 02',
      );
      await page.locator('#picker-apply').click();
    }
  });
}

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
