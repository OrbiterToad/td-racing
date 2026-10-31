const { test, expect } = require('@playwright/test');

async function openGame(page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  // Canvas creation precedes asynchronous scenery loading and event binding.
  await expect(page.locator('#race-mode')).toBeEnabled();
}

async function renderedFrames(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        function frame() {
          if (++frames === 8) resolve();
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
}

for (const picker of ['tracks', 'garage']) {
  for (const paused of [false, true]) {
    test(`canceling ${picker} preserves selections and restores ${paused ? 'paused' : 'running'} state`, async ({
      page,
    }) => {
      await openGame(page);
      if (paused) await page.locator('#pause').click();
      const saved = await page.evaluate(() => ({ ...localStorage }));
      await page.locator(`#open-${picker}`).click();
      await expect(page.locator('#selection-dialog')).toBeVisible();
      await expect(page.locator('#pause-screen')).toHaveClass('open');
      const before = await page.evaluate(async () => {
        const { car, race } = await import('./src/state.js');
        return {
          x: car.x,
          y: car.y,
          time: race.time,
          countdown: race.countdown,
        };
      });
      if (picker === 'tracks') {
        await page
          .getByRole('button', { name: 'Choose Alpine Pass', exact: true })
          .click();
      } else {
        await page
          .getByRole('button', { name: 'Choose Formula X', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Paint Ocean', exact: true })
          .click();
      }
      await renderedFrames(page);
      expect(
        await page.evaluate(async () => {
          const { car, race } = await import('./src/state.js');
          return {
            x: car.x,
            y: car.y,
            time: race.time,
            countdown: race.countdown,
          };
        }),
      ).toEqual(before);
      if (paused) await page.locator('#picker-close').click();
      else await page.keyboard.press('Escape');
      await expect(page.locator('#selection-dialog')).not.toBeVisible();
      await expect(page.locator('#track-title')).toHaveText('Juniper Raceway');
      await expect(page.locator('#car-name')).toHaveText('CLUBSPORT R');
      expect(
        await page.evaluate(async () => {
          const { state } = await import('./src/state.js');
          return { paused: state.paused, paint: state.paint };
        }),
      ).toEqual({ paused, paint: 'red' });
      expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(saved);
      // Reopening must discard the canceled draft, including its paint.
      await page.locator(`#open-${picker}`).click();
      await expect(
        page.locator(
          picker === 'tracks'
            ? '[data-track="juniper"]'
            : '[data-car="clubsport"]',
        ),
      ).toHaveAttribute('aria-pressed', 'true');
      if (picker === 'garage')
        await expect(
          page.getByRole('button', { name: 'Paint Ember', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
    });
  }
}

test('paint changes preserve an active club race and persist after reload', async ({
  page,
}) => {
  await openGame(page);
  await page.locator('#race-mode').click();
  await page.locator('#pause').click();
  // Seed a mid-race state to distinguish cosmetic changes from a fresh run.
  await page.evaluate(async () => {
    const { race, opponentRace, state } = await import('./src/state.js');
    Object.assign(race, {
      started: true,
      crossedStart: true,
      countdown: 0,
      lap: 2,
      next: 3,
      time: 42,
      invalid: true,
    });
    opponentRace.elapsed = 100;
    state.selectedStart = 3;
  });
  await page.locator('#open-garage').click();
  await page.getByRole('button', { name: 'Paint Ocean', exact: true }).click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#race-panel')).toBeVisible();
  await expect(page.locator('#lap')).toHaveText('2 / 3');
  const session = await page.evaluate(async () => {
    const { race, opponentRace, state } = await import('./src/state.js');
    return {
      enabled: opponentRace.enabled,
      elapsed: opponentRace.elapsed,
      time: race.time,
      lap: race.lap,
      next: race.next,
      invalid: race.invalid,
      slot: state.selectedStart,
      paint: state.paint,
    };
  });
  expect(session).toMatchObject({
    enabled: true,
    lap: 2,
    next: 3,
    invalid: true,
    slot: 3,
    paint: 'blue',
  });
  expect(session.time).toBeGreaterThanOrEqual(42);
  expect(session.elapsed).toBeGreaterThanOrEqual(100);
  await page.reload();
  await expect(page.locator('#race-mode')).toBeEnabled();
  await page.locator('#open-garage').click();
  await expect(
    page.getByRole('button', { name: 'Paint Ocean', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('losing focus clears held controls and freezes the whole club race', async ({
  page,
}) => {
  await openGame(page);
  await page.locator('#race-mode').click();
  await page.keyboard.down('KeyW');
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { car } = await import('./src/state.js');
        return Math.hypot(car.vx, car.vy);
      }),
    )
    .toBeGreaterThan(10);
  // Dispatch the browser event directly: headless window-manager focus varies.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  const read = () =>
    page.evaluate(async () => {
      const { car, race, opponentRace, keys } = await import('./src/state.js');
      return {
        x: car.x,
        y: car.y,
        time: race.time,
        elapsed: opponentRace.elapsed,
        opponents: opponentRace.cars.map((rival) => rival.s),
        keys: [...keys],
      };
    });
  const frozen = await read();
  expect(frozen.keys).toEqual([]);
  await renderedFrames(page);
  expect(await read()).toEqual(frozen);
  await page.locator('#resume').click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { opponentRace } = await import('./src/state.js');
        return opponentRace.elapsed;
      }),
    )
    .toBeGreaterThan(frozen.elapsed);
  expect(
    await page.evaluate(async () => {
      const { car, keys } = await import('./src/state.js');
      return { throttle: car.throttle, held: keys.has('KeyW') };
    }),
  ).toEqual({ throttle: 0, held: false });
  await page.keyboard.up('KeyW');
});

for (const failure of ['malformed', 'unavailable', 'quota']) {
  test(`game remains playable with ${failure} browser storage`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      if (mode === 'malformed') {
        localStorage.setItem('apex-garage', '{broken');
        localStorage.setItem('apex-selected-track', 'missing-track');
        localStorage.setItem('apex-juniper-corner-oil-v6', '{broken');
        localStorage.setItem('apex-juniper-corner-oil-v6-ghost-v1', '{broken');
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException(
            'Storage disabled by test',
            mode === 'quota' ? 'QuotaExceededError' : 'SecurityError',
          );
        };
        if (mode === 'unavailable')
          Storage.prototype.getItem = () => {
            throw new DOMException('Storage disabled by test', 'SecurityError');
          };
      }
    }, failure);
    await openGame(page);
    await expect(page.locator('#track-title')).toHaveText('Juniper Raceway');
    await expect(page.locator('#car-name')).toHaveText('CLUBSPORT R');
    await page.locator('#open-tracks').click();
    await page
      .getByRole('button', { name: 'Choose Alpine Pass', exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#track-title')).toHaveText('Alpine Pass');
    await page.locator('#open-garage').click();
    await page
      .getByRole('button', { name: 'Choose Offroad', exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#car-name')).toHaveText('OFFROAD');
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
    expect(errors).toEqual([]);
  });
}
