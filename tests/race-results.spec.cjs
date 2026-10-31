const { test, expect } = require('@playwright/test');

async function startClubRace(page) {
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  const picker = page.locator('#selection-dialog');
  if (await picker.evaluate((element) => element.open)) {
    for (let i = 0; i < 3; i++) {
      if ((await picker.getAttribute('data-mode')) === 'modes') break;
      await page.locator('#picker-apply').click();
    }
    await page.locator('[data-choice="race"]').click();
    await page.locator('#picker-apply').click();
  } else {
    await page.locator('#race-mode').click();
  }
  await expect(page.locator('#race-panel')).toBeVisible();
}

async function showResults(page, { totalTime, bestLap, rivals }) {
  await page.evaluate(
    async ({ totalTime, bestLap, rivals }) => {
      const { opponentRace, race } = await import('./src/state.js');
      const { updateHUD } = await import('./src/ui.js');
      opponentRace.enabled = true;
      opponentRace.finished = true;
      opponentRace.elapsed = totalTime;
      opponentRace.playerFinish = totalTime;
      opponentRace.bestLap = bestLap;
      opponentRace.cars = rivals.map((rival, index) => ({
        name: rival.name,
        paint: ['blue', 'yellow', 'green'][index],
        finish: rival.finish,
        s: rival.s ?? index * 100,
      }));
      race.lap = opponentRace.laps + 1;
      race.crossedStart = true;
      race.time = 0;
      updateHUD();
    },
    { totalTime, bestLap, rivals },
  );
  await expect(page.locator('#race-results')).toBeVisible();
}

test('race results show the winner, clean lap, and unfinished opponents without invented times', async ({
  page,
}) => {
  await startClubRace(page);
  await showResults(page, {
    totalTime: 98.42,
    bestLap: 32.7,
    rivals: [
      { name: 'Alex', finish: 101.6 },
      { name: 'Blair', finish: null },
      { name: 'Casey', finish: null },
    ],
  });

  await expect(page.locator('[data-result="position"]')).toHaveText('P1 / 4');
  await expect(page.locator('[data-result="time"]')).toHaveText('01:38.420');
  await expect(page.locator('[data-result="best-lap"]')).toHaveText(
    '00:32.700',
  );
  const blair = page.locator('.rr-row').filter({ hasText: 'Blair' });
  await expect(blair).toContainText('STILL RACING');
  await expect(blair).not.toContainText(/\d{2}:\d{2}\.\d{3}/);
  await expect(page.locator('.rr-row')).toHaveCount(4);
});

test('race results rank a later player behind finished opponents', async ({
  page,
}) => {
  await startClubRace(page);
  await showResults(page, {
    totalTime: 105.1,
    bestLap: 34.2,
    rivals: [
      { name: 'Alex', finish: 98.4 },
      { name: 'Blair', finish: null },
      { name: 'Casey', finish: 108.2 },
    ],
  });

  await expect(page.locator('[data-result="position"]')).toHaveText('P2 / 4');
  const order = await page.locator('.rr-row .rr-name').allTextContents();
  expect(order[0]).toContain('Alex');
  expect(order[1]).toContain('You');
  expect(order[2]).toContain('Casey');
  expect(order[3]).toContain('Blair');
  await expect(
    page.locator('.rr-row').filter({ hasText: 'Blair' }),
  ).toContainText('STILL RACING');
});

test('race results fit supported landscape and portrait screens without scrolling', async ({
  page,
}) => {
  await startClubRace(page);
  await showResults(page, {
    totalTime: 98.42,
    bestLap: 32.7,
    rivals: [
      { name: 'Alex', finish: 101.6 },
      { name: 'Blair', finish: null },
      { name: 'Casey', finish: null },
    ],
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 800, height: 600 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const dimensions = await page
      .locator('#race-results')
      .evaluate((dialog) => {
        const frame = dialog.querySelector('.rr-frame');
        const bounds = dialog.getBoundingClientRect();
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          viewport: window.innerHeight,
          dialog: [dialog.scrollHeight, dialog.clientHeight],
          frame: [frame.scrollHeight, frame.clientHeight],
        };
      });
    expect(
      dimensions.top >= 0 &&
        dimensions.bottom <= dimensions.viewport &&
        dimensions.dialog[0] <= dimensions.dialog[1] &&
        dimensions.frame[0] <= dimensions.frame[1],
      `${viewport.width} × ${viewport.height}: ${JSON.stringify(dimensions)}`,
    ).toBe(true);
  }
});

test('Race again resets the race; Back to setup opens the session picker by keyboard', async ({
  page,
}) => {
  await startClubRace(page);
  await showResults(page, {
    totalTime: 98.42,
    bestLap: 32.7,
    rivals: [
      { name: 'Alex', finish: 101.6 },
      { name: 'Blair', finish: null },
      { name: 'Casey', finish: null },
    ],
  });

  await page.locator('[data-action="again"]').click();
  await expect(page.locator('#race-results')).not.toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$/);
  const reset = await page.evaluate(async () => {
    const { opponentRace, race } = await import('./src/state.js');
    return {
      enabled: opponentRace.enabled,
      finished: opponentRace.finished,
      elapsed: opponentRace.elapsed,
      playerFinish: opponentRace.playerFinish,
      bestLap: opponentRace.bestLap,
      lap: race.lap,
    };
  });
  expect(reset).toMatchObject({
    enabled: true,
    finished: false,
    elapsed: 0,
    playerFinish: null,
    bestLap: null,
    lap: 1,
  });

  await showResults(page, {
    totalTime: 98.42,
    bestLap: 32.7,
    rivals: [
      { name: 'Alex', finish: 101.6 },
      { name: 'Blair', finish: null },
      { name: 'Casey', finish: null },
    ],
  });
  const setupButton = page.locator('[data-action="setup"]');
  await page.keyboard.press('ArrowRight');
  await expect(setupButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#race-results')).not.toBeVisible();
  await expect(page.locator('#selection-dialog')).toBeVisible();
  await expect(page.locator('#selection-dialog')).toHaveAttribute(
    'data-mode',
    'garage',
  );
  await expect(page.locator('#step-car')).toHaveAttribute(
    'aria-current',
    'step',
  );
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        selectingSession: state.selectingSession,
        pendingGameMode: state.pendingGameMode,
      };
    }),
  ).toEqual({ selectingSession: true, pendingGameMode: 'race' });
  await page.locator('#picker-apply').click();
  await expect(page.locator('#step-track')).toHaveAttribute(
    'aria-current',
    'step',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#step-mode')).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.locator('[data-choice="race"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  await expect(page.locator('#race-panel')).toBeVisible();
});
