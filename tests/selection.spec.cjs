const { test, expect } = require('@playwright/test');

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 800, height: 600 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
]) {
  test(`selection choices remain readable and reachable at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route('https://**/*', (route) => route.abort());
    await page.goto('./');
    for (const step of ['garage', 'tracks', 'modes']) {
      await expect(page.locator('#selection-dialog')).toHaveAttribute(
        'data-mode',
        step,
      );
      const choices = page.locator('[data-choice]');
      for (let index = 0; index < (await choices.count()); index++) {
        const choice = choices.nth(index);
        await choice.scrollIntoViewIfNeeded();
        const box = await choice.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(130);
        expect(box.height).toBeGreaterThanOrEqual(90);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        const textFits = await choice
          .locator('strong')
          .evaluate(
            (el) =>
              el.scrollWidth <= el.clientWidth + 1 &&
              el.scrollHeight <= el.clientHeight + 1,
          );
        expect(textFits).toBe(true);
        if (step === 'modes') {
          await expect(choice.locator('svg.mode-icon')).toHaveCount(1);
          await expect(choice.locator('svg')).toHaveAttribute(
            'aria-hidden',
            'true',
          );
        }
        if (await choice.isEnabled()) {
          await choice.click();
          await expect(choice).toHaveAttribute('aria-pressed', 'true');
          await expect(choice).toBeFocused();
        }
      }
      // The selected detail remains available without moving the action bar.
      await page.locator('.feature-copy h3').scrollIntoViewIfNeeded();
      await expect(page.locator('.feature-copy h3')).toBeInViewport();
      await expect(page.locator('#picker-apply')).toBeInViewport();
      if (step !== 'modes') await page.locator('#picker-apply').click();
    }
    const glyphs = await page
      .locator('.mode-icon')
      .evaluateAll((icons) => icons.map((icon) => icon.innerHTML));
    expect(new Set(glyphs).size).toBe(6);
  });
}
