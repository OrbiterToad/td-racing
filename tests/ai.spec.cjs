const { test, expect } = require('@playwright/test');

for (const difficulty of ['easy', 'normal', 'hard']) {
  test(`club race starts on another track with mixed cars at ${difficulty}`, async ({
    page,
  }) => {
    if (difficulty === 'normal')
      await page.setViewportSize({ width: 800, height: 600 });
    await page.route('https://**/*', (route) => route.abort());
    await page.goto('./');
    await expect(page.locator('#race-mode')).toBeEnabled();
    await page
      .getByRole('button', { name: 'Choose Iron V8', exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await page
      .getByRole('button', { name: 'Choose Alpine Pass', exact: true })
      .click();
    await page.locator('#picker-apply').click();
    await page
      .getByRole('button', { name: 'Choose Club race', exact: true })
      .click();
    await expect(page.locator('#ai-difficulty')).toHaveValue('normal');
    await expect(page.locator('#ai-grid')).toHaveValue('matched');
    await page
      .getByLabel('AI difficulty', { exact: true })
      .selectOption(difficulty);
    await page
      .getByLabel('Opponent cars', { exact: true })
      .selectOption('mixed');
    // Native selector arrow keys must not navigate away from Club race.
    await page.locator('#ai-difficulty').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-choice="race"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('#ai-difficulty').selectOption(difficulty);
    await page.locator('#picker-apply').click();
    if (await page.locator('#tutorial-dialog').isVisible())
      await page.locator('#tutorial-skip').click();
    await expect(page.locator('#race-panel')).toBeVisible();
    const read = () =>
      page.evaluate(async () => {
        const { state, opponentRace } = await import('./src/state.js');
        return {
          map: state.activeMap.id,
          player: state.activeCar.id,
          difficulty: opponentRace.difficulty,
          grid: opponentRace.grid,
          rivals: opponentRace.cars.map((r) => r.vehicleId),
          enabled: opponentRace.enabled,
        };
      });
    const expected = {
      map: 'alpine',
      player: 'muscle',
      difficulty,
      grid: 'mixed',
      rivals: ['muscle', 'formula', 'clubsport'],
      enabled: true,
    };
    expect(await read()).toEqual(expected);
    await page.locator('#pause').click();
    await page.locator('#pause-restart').click();
    expect(await read()).toEqual(expected);
  });
}
