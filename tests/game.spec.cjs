const { test, expect } = require('@playwright/test');

test('packaged game loads, changes tracks and cars, and remembers selections', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith('http://127.0.0.1:4173/')) errors.push(request.url());
  });

  // Keep CI independent of third-party services and verify bundled p5 works.
  await page.route('https://**/*', route => route.abort());
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  await expect(page.locator('#start-countdown')).toHaveText(/^[123]$|^GO!$/);

  const tracks = [
    'Desert Canyon', 'Alpine Pass', 'Ridgeway Rallycross', 'Amazonas',
    'Costa Azul', 'Juniper Raceway', 'City Streets',
  ];
  for (const track of tracks) {
    await page.locator('#open-tracks').click();
    await page.getByRole('button', { name: `Choose ${track}`, exact: true }).click();
    await page.locator('#picker-apply').click();
    await expect(page.locator('#selection-dialog')).not.toBeVisible();
    await expect(page.locator('#track-title')).toHaveText(track);
  }

  for (const car of ['Clubsport R', 'Sprint GT', 'Offroad', 'Drift Spec', 'Iron V8', 'Formula X']) {
    await page.locator('#open-garage').click();
    await expect(page.locator('.car-platform img')).toHaveCount(6);
    await expect.poll(() => page.locator('.car-platform img').evaluateAll(
      images => images.every(image => image.complete && image.naturalWidth > 0),
    )).toBe(true);
    await page.getByRole('button', { name: `Choose ${car}`, exact: true }).click();
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
