const { test, expect } = require('@playwright/test');

test('track selection shows targets and earned medals for the selected car pairing', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem(
      'apex-medals-v1',
      JSON.stringify({ 'juniper:clubsport': 'silver' }),
    );
  });
  await page.goto('./');
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await expect(page.locator('.medal-target')).toHaveCount(3);
  await expect(page.locator('.medal-earned')).toHaveText('EARNED / SILVER');
  const clubsportGold = await page
    .locator('[data-medal="gold"] time')
    .textContent();

  await page.locator('#picker-close').click();
  await page
    .getByRole('button', { name: 'Choose Formula X', exact: true })
    .click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-title')).toHaveText(
    'Choose your circuit.',
  );
  await expect(page.locator('.medal-earned')).toHaveText('EARNED / NONE');
  await expect(page.locator('.medal-target')).toHaveCount(3);
  await expect(page.locator('[data-medal="gold"] time')).not.toHaveText(
    clubsportGold,
  );
});
