const { test, expect } = require('@playwright/test');

test.describe('touch driving controls', () => {
  test.use({ isMobile: true, hasTouch: true });

  async function startSession(page, viewport) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    for (const title of [
      'Choose your ride.',
      'Choose your circuit.',
      'Choose your mode.',
    ]) {
      await expect(page.locator('#picker-title')).toHaveText(title);
      await page.locator('#picker-apply').click();
    }
    await expect(page.locator('#selection-dialog')).not.toBeVisible();
    if (await page.locator('#tutorial-dialog').isVisible())
      await page.locator('#tutorial-skip').click();
  }

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
  ]) {
    test(`controls and essential HUD fit at ${viewport.width} × ${viewport.height}`, async ({
      page,
    }) => {
      await startSession(page, viewport);
      await expect(page.locator('#touch-controls')).toBeVisible();
      for (const control of [
        'Steer left',
        'Steer right',
        'Throttle',
        'Brake',
        'Handbrake',
        'Pause',
      ]) {
        const locator = page.getByRole('button', {
          name: control,
          exact: true,
        });
        await expect(locator).toBeVisible();
        const rect = await locator.boundingBox();
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
      }
      await expect(page.locator('#clock')).toBeVisible();
      await expect(page.locator('#speed')).toBeVisible();
      await expect(page.locator('#lap')).toBeVisible();
    });
  }

  test('multi-touch controls stay held independently and clear on release or cancellation', async ({
    page,
  }) => {
    await startSession(page, { width: 844, height: 390 });
    const heldKeys = async () =>
      page.evaluate(async () => {
        const { keys } = await import('./src/state.js');
        return ['KeyA', 'KeyW', 'KeyD'].map((key) => keys.has(key));
      });
    await page.getByRole('button', { name: 'Throttle' }).evaluate((button) => {
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
        }),
      );
    });
    await page
      .getByRole('button', { name: 'Steer left' })
      .evaluate((button) => {
        button.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            pointerId: 2,
            pointerType: 'touch',
            isPrimary: false,
          }),
        );
      });
    expect(await heldKeys()).toEqual([true, true, false]);
    expect(
      await page.evaluate(() => {
        const event = new Event('touchmove', { cancelable: true });
        document.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(true);
    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch' }),
      );
    });
    expect(await heldKeys()).toEqual([true, false, false]);
    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 2,
          pointerType: 'touch',
        }),
      );
    });
    expect(await heldKeys()).toEqual([false, false, false]);
    expect(await page.locator('body').getAttribute('class')).not.toContain(
      'touch-active',
    );
  });

  test('orientation change clears held controls and pause remains reachable', async ({
    page,
  }) => {
    await startSession(page, { width: 390, height: 844 });
    await page.getByRole('button', { name: 'Throttle' }).evaluate((button) => {
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 4,
          pointerType: 'touch',
        }),
      );
    });
    await page.evaluate(() =>
      window.dispatchEvent(new Event('orientationchange')),
    );
    const throttleHeld = await page.evaluate(async () => {
      const { keys } = await import('./src/state.js');
      return keys.has('KeyW');
    });
    expect(throttleHeld).toBe(false);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.locator('#pause-screen')).toHaveClass('open');
  });
});
