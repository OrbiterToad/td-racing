const { test, expect } = require('@playwright/test');

for (const condition of ['clear', 'rain', 'snow']) {
  test(`${condition} selection survives setup navigation and drives the race presentation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.route('https://**/*', (route) => route.abort());
    await page.goto('./');
    await page.locator('#picker-apply').click();
    await page.locator('#picker-apply').click();
    await page.locator('#race-condition').selectOption(condition);
    await page.locator('[data-choice="race"]').click();
    await expect(page.locator('#race-condition')).toHaveValue(condition);
    await page.locator('#wizard-back').click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#race-condition')).toHaveValue(condition);
    await page.locator('#picker-apply').click();
    if (await page.locator('#tutorial-dialog').isVisible())
      await page.locator('#tutorial-skip').click();
    await expect(page.locator('#weather-status')).toHaveText(
      condition.toUpperCase(),
    );
    await expect(page.locator('#grip-status')).toBeVisible();
    await expect(page.locator('#grip-status')).toContainText(
      condition.toUpperCase(),
    );
    const state = await page.evaluate(async () => {
      const { state, opponentRace } = await import('./src/state.js');
      return { condition: state.condition, count: opponentRace.cars.length };
    });
    expect(state).toEqual({ condition, count: 3 });
  });
}
