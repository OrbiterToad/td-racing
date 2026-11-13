const { test, expect } = require('@playwright/test');

async function startSession(page) {
  await expect(page.locator('#selection-dialog')).toBeVisible();
  for (let step = 0; step < 3; step++)
    await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
}

test('first-run guide can be skipped and dismissal persists after reload', async ({
  page,
}) => {
  await page.goto('./');
  await startSession(page);

  const guide = page.locator('#tutorial-dialog');
  await expect(guide).toBeVisible();
  await expect(page.locator('#tutorial-heading')).toHaveText('Get moving');
  await page.locator('#tutorial-next').click();
  await expect(page.locator('#tutorial-heading')).toHaveText(
    'Brake before the turn',
  );
  await page.locator('#tutorial-skip').click();
  await expect(guide).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('apex-tutorial-v1')))
    .toBe('dismissed');

  await page.reload();
  await startSession(page);
  await expect(guide).not.toBeVisible();
});

test('completed guide persists and can be replayed from Help', async ({
  page,
}) => {
  await page.goto('./');
  await startSession(page);
  await expect(page.locator('#tutorial-heading')).toHaveText('Get moving');

  for (let step = 0; step < 6; step++)
    await page.locator('#tutorial-next').click();
  await expect(page.locator('#tutorial-heading')).toHaveText(
    'Chase your ghost',
  );
  await page.locator('#tutorial-finish').click();
  await expect(page.locator('#tutorial-dialog')).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('apex-tutorial-v1')))
    .toBe('completed');

  await page.locator('#pause').click();
  await page.locator('#tutorial-help').click();
  await expect(page.locator('#tutorial-heading')).toHaveText('Get moving');
  await page.keyboard.press('Escape');
  await expect(page.locator('#tutorial-dialog')).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('apex-tutorial-v1')))
    .toBe('completed');
});

test('guide works on a small screen and with keyboard controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('./');
  await startSession(page);

  const guide = page.locator('#tutorial-dialog');
  await expect(guide).toBeVisible();
  const box = await guide.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  await expect(page.locator('#tutorial-skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(guide).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('apex-tutorial-v1')))
    .toBe('dismissed');
});

test('pause actions align on small screens and controls remain in the guide', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 520 });
  await page.goto('./');
  await startSession(page);
  await page.locator('#tutorial-skip').click();
  await page.locator('#pause').click();

  const panel = page.locator('.pause-box');
  await expect(panel).toContainText('Your race is paused.');
  await expect(panel).not.toContainText('W / S');
  await expect(panel).not.toContainText('Left stick');
  await expect(panel).not.toContainText('Split screen');

  const buttons = page.locator(
    '#settings-pause, #pause-restart, #resume, #tutorial-help',
  );
  const dimensions = await buttons.evaluateAll((items) =>
    items.map((item) => {
      const { width, height } = item.getBoundingClientRect();
      return { width, height };
    }),
  );
  expect(dimensions).toHaveLength(4);
  for (const size of dimensions) {
    expect(size.width).toBeCloseTo(dimensions[0].width, 0);
    expect(size.height).toBeCloseTo(dimensions[0].height, 0);
    expect(size.height).toBeGreaterThanOrEqual(52);
  }

  await page.locator('#tutorial-help').click();
  await expect(page.locator('#tutorial-heading')).toHaveText('Get moving');
  await expect(page.locator('#tutorial-dialog')).toContainText('accelerate');
});

test('unavailable local storage does not block the guide', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage is unavailable', 'SecurityError');
      },
    });
  });
  await page.goto('./');
  await startSession(page);
  await expect(page.locator('#tutorial-dialog')).toBeVisible();
  await page.locator('#tutorial-skip').click();
  await expect(page.locator('#tutorial-dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
});
