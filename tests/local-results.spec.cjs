const { test, expect } = require('@playwright/test');

async function startLocal(page) {
  await page.addInitScript(() =>
    localStorage.setItem('apex-tutorial-v1', 'done'),
  );
  await page.goto('./');
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await page.locator('[data-choice="local"]').click();
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();
  await page.evaluate(() => window.noLoop());
}

test('local countdown has exactly two canvas displays and no shared HUD countdown', async ({
  page,
}) => {
  await startLocal(page);
  const counts = await page.evaluate(async () => {
    const { state, race } = await import('./src/state.js');
    const { draw } = await import('./src/renderer.js');
    const { updateHUD } = await import('./src/ui.js');
    const { simulate } = await import('./src/physics.js');
    const { startCountdown } = await import('./src/race.js');
    const ctx = state.ctx;
    const original = ctx.fillText;
    const counts = [];
    try {
      for (const value of [3, 2, 1, 0]) {
        race.countdown = state.localRace.countdown = value;
        const labels = [];
        ctx.fillText = function (text, ...args) {
          if (/^[123]$/.test(String(text))) labels.push(String(text));
          return original.call(this, text, ...args);
        };
        updateHUD();
        draw();
        counts.push(labels);
      }
      race.countdown = state.localRace.countdown = 3;
      for (let i = 0; i < 360; i++) simulate(1 / 120);
      counts.push([race.countdown, state.localRace.countdown]);
      startCountdown();
      counts.push([race.countdown, state.localRace.countdown]);
    } finally {
      ctx.fillText = original;
    }
    return counts;
  });
  expect(counts.slice(0, 4)).toEqual([['3', '3'], ['2', '2'], ['1', '1'], []]);
  expect(counts[4][0]).toBeCloseTo(0, 8);
  expect(counts[4][1]).toBeCloseTo(0, 8);
  expect(counts[5]).toEqual([3, 3]);
  await expect(page.locator('#start-countdown')).toBeHidden();
  await page.evaluate(async () => {
    const { state, race } = await import('./src/state.js');
    const { updateHUD } = await import('./src/ui.js');
    state.localRace = null;
    race.countdown = 2;
    updateHUD();
  });
  await expect(page.locator('#start-countdown')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText('2');
});

for (const first of [0, 1]) {
  test(`local results wait for the second finisher and show both players, Player ${first + 1} wins`, async ({
    page,
  }, testInfo) => {
    await startLocal(page);
    const finish = async (index) =>
      page.evaluate(async (index) => {
        const { state, track } = await import('./src/state.js');
        const { updateLocalRace } = await import('./src/local-race.js');
        const { updateHUD } = await import('./src/ui.js');
        const race = state.localRace;
        race.countdown = 0;
        const idle = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
        const move = (point) => {
          const p = race.players[index];
          Object.assign(p, { x: point.x, y: point.y, vx: 0, vy: 0 });
          updateLocalRace(race, 1 / 60, [idle, idle], index === 0 ? p : null);
        };
        move(track[0]);
        for (let lap = 0; lap < race.laps; lap++) {
          for (const point of track) move(point);
          move(track[0]);
        }
        updateHUD();
      }, index);
    await finish(first);
    await expect(page.locator('#race-results')).not.toBeVisible();
    await finish(1 - first);
    await expect(page.locator('#race-results')).toBeVisible();
    const cards = page.locator('.rr-local-summary article');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(first)).toContainText('P1 / 2');
    await expect(cards.nth(1 - first)).toContainText('P2 / 2');
    await expect(cards.nth(0)).toContainText('Player 1');
    await expect(cards.nth(1)).toContainText('Player 2');
    await expect(cards.nth(0)).toContainText(/Finish · \d{2}:\d{2}\.\d{3}/);
    await expect(cards.nth(1)).toContainText(/Best lap · \d{2}:\d{2}\.\d{3}/);
    await expect(page.locator('.rr-row').first()).toContainText(
      `Player ${first + 1}`,
    );
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 844, height: 390 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const fits = await page.locator('#race-results').evaluate((dialog) => {
        const r = dialog.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= innerWidth &&
          r.bottom <= innerHeight &&
          dialog.scrollHeight <= dialog.clientHeight + 1 &&
          [...dialog.querySelectorAll('.rr-row')].every((row) => {
            const bounds = row.getBoundingClientRect();
            const footer = dialog
              .querySelector('.rr-actions')
              .getBoundingClientRect();
            return bounds.top >= r.top && bounds.bottom <= footer.top;
          })
        );
      });
      expect(fits).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath('local-results.png') });
    await page.locator('[data-action="again"]').click();
    await expect(page.locator('#race-results')).not.toBeVisible();
    const reset = await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        finished: state.localRace.finished,
        times: state.localRace.players.map((p) => p.finishedAt),
        countdown: state.localRace.countdown,
      };
    });
    expect(reset).toEqual({
      finished: false,
      times: [null, null],
      countdown: 3,
    });
  });
}
