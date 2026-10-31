const { test, expect } = require('@playwright/test');

async function tabTo(page, target, key = 'Tab') {
  for (let step = 0; step < 35; step++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

async function openSetup(page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(
    page.getByRole('dialog', { name: 'Choose your ride.' }),
  ).toBeVisible();
  await expect(page.locator('#picker-apply')).toBeFocused();
}

async function startTrial(page) {
  await openSetup(page);
  for (let step = 0; step < 3; step++) await page.keyboard.press('Enter');
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();
  await expect(page.locator('#game')).toBeFocused();
}

test('setup supports keyboard selection, paint, Back, disabled modes and contained visible focus', async ({
  page,
}) => {
  await openSetup(page);
  await page.keyboard.press('w');
  await page.keyboard.press('n');
  await page.keyboard.press('r');
  expect(
    await page.evaluate(async () => {
      const { keys, state, race } = await import('./src/state.js');
      return { keys: [...keys], paused: state.paused, started: race.started };
    }),
  ).toEqual({ keys: [], paused: true, started: false });
  // Native modal navigation must keep both directions inside the wizard.
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let step = 0; step < 20; step++) {
      await page.keyboard.press(key);
      expect(
        await page
          .locator('#selection-dialog')
          .evaluate((dialog) => dialog.contains(document.activeElement)),
      ).toBe(true);
      expect(
        await page.evaluate(() => {
          const style = getComputedStyle(document.activeElement);
          return (
            style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
          );
        }),
      ).toBe(true);
    }
  }
  const car = page.getByRole('button', {
    name: 'Choose Formula X',
    exact: true,
  });
  await tabTo(page, car);
  await page.keyboard.press('Space');
  await expect(car).toHaveAttribute('aria-pressed', 'true');
  await expect(car).toBeFocused();
  const paint = page.getByRole('button', { name: 'Paint Ocean', exact: true });
  await tabTo(page, paint);
  await page.keyboard.press('Space');
  await expect(paint).toHaveAttribute('aria-pressed', 'true');
  await expect(paint).toBeFocused();
  await tabTo(page, page.locator('#picker-apply'));
  await page.keyboard.press('Enter');
  await expect(page.locator('#step-track')).toHaveAttribute(
    'aria-current',
    'step',
  );
  await page.keyboard.press('ArrowRight');
  await expect(
    page.locator('.choice-rail [aria-pressed="true"]'),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(car).toHaveAttribute('aria-pressed', 'true');
  await expect(paint).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#picker-apply')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  const race = page.getByRole('button', {
    name: 'Choose Club race',
    exact: true,
  });
  await expect(race).toBeDisabled();
  await expect(race).toHaveAccessibleDescription(
    'Requires Juniper + Clubsport R',
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-choice="trial"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
});

for (const picker of ['garage', 'tracks']) {
  test(`${picker} restores its keyboard opener on cancel and apply`, async ({
    page,
  }) => {
    await startTrial(page);
    const opener = page.locator(`#open-${picker}`);
    // The header precedes the driving region in document order. Navigate
    // backwards rather than relying on browser chrome to wrap page focus.
    await tabTo(page, opener, 'Shift+Tab');
    await page.keyboard.press('Space');
    await expect(page.locator('#picker-apply')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await tabTo(page, page.locator('#picker-apply'));
    await page.keyboard.press('Space');
    await expect(page.locator('#selection-dialog')).not.toBeVisible();
    await expect(opener).toBeFocused();
  });
}

test('pause accepts Space, focuses Resume, ignores driving and restart inputs, and restores focus', async ({
  page,
}) => {
  await startTrial(page);
  const pause = page.locator('#pause');
  await tabTo(page, pause);
  await page.keyboard.press('Space');
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  await expect(page.locator('#resume')).toBeFocused();
  const read = () =>
    page.evaluate(async () => {
      const { car, race, keys, state } = await import('./src/state.js');
      return {
        x: car.x,
        y: car.y,
        countdown: race.countdown,
        time: race.time,
        keys: [...keys],
        paused: state.paused,
      };
    });
  const frozen = await read();
  await page.keyboard.down('w');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('n');
  await page.keyboard.press('r');
  await page.keyboard.up('w');
  expect(await read()).toEqual(frozen);
  await page.keyboard.press('Space');
  await expect(page.locator('#pause-screen')).not.toHaveClass('open');
  await expect(pause).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#resume')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pause).toBeFocused();
});

test('starting a session hands focus to driving so Space remains a handbrake', async ({
  page,
}) => {
  await startTrial(page);
  await page.keyboard.down('Space');
  expect(
    await page.evaluate(async () => {
      const { keys } = await import('./src/state.js');
      return keys.has('Space');
    }),
  ).toBe(true);
  await page.keyboard.up('Space');
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
});
