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
        const box = await choice.boundingBox();
        // Tiles shrink to fit the screen but stay comfortable touch targets.
        expect(box.width).toBeGreaterThanOrEqual(96);
        expect(box.height).toBeGreaterThanOrEqual(56);
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
          await expect(choice.locator('svg.mode-icon')).toHaveAttribute(
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
      // The selected detail is visible next to the action bar without scrolling.
      await expect(page.locator('.feature-copy h3')).toBeInViewport();
      await expect(page.locator('#picker-apply')).toBeInViewport();
      if (step !== 'modes') await page.locator('#picker-apply').click();
    }
    const glyphs = await page
      .locator('.mode-icon')
      .evaluateAll((icons) => icons.map((icon) => icon.innerHTML));
    expect(new Set(glyphs).size).toBe(7);
  });
}

// The selection flow never scrolls: every card, the detail panel, the pager
// and the footer actions share one screen (#140, #141).
async function measureSelectionLayout(page) {
  return page.locator('#selection-dialog').evaluate((dialog) => {
    const style = getComputedStyle(dialog);
    const content = {
      left: parseFloat(style.paddingLeft),
      top: parseFloat(style.paddingTop),
      right: innerWidth - parseFloat(style.paddingRight),
      bottom: innerHeight - parseFloat(style.paddingBottom),
    };
    const outside = (el) => {
      const box = el.getBoundingClientRect();
      return (
        box.left < content.left - 1 ||
        box.top < content.top - 1 ||
        box.right > content.right + 1 ||
        box.bottom > content.bottom + 1
      );
    };
    const visible = (el) => el.getBoundingClientRect().width > 0;
    const scrolling = [
      dialog,
      ...dialog.querySelectorAll(
        '.picker-head, .picker-content, .choice-rail, .selection-feature, .feature-copy, .paint-row, .picker-bottom',
      ),
    ]
      .filter(
        (el) =>
          el.clientHeight &&
          (el.scrollHeight > el.clientHeight + 2 ||
            el.scrollWidth > el.clientWidth + 2),
      )
      .map((el) => el.className || el.id);
    const edge = (selector) =>
      Math.round(dialog.querySelector(selector).getBoundingClientRect().right);
    return {
      pageScrolls:
        document.scrollingElement.scrollHeight > innerHeight ||
        document.scrollingElement.scrollWidth > innerWidth,
      scrolling,
      outside: [
        ...dialog.querySelectorAll('button, .selection-feature, .choice-rail'),
      ]
        .filter((el) => visible(el) && outside(el))
        .map((el) => el.id || el.dataset.choice || el.className),
      rightEdges: {
        settings: edge('#settings-setup'),
        feature: edge('.selection-feature'),
        primary: edge('#picker-apply'),
        content: Math.round(content.right),
      },
    };
  });
}

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1850, height: 965 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 800, height: 600 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
]) {
  test(`selection steps fit without scrolling at ${viewport.width} × ${viewport.height}`, async ({
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
      // The last choice is the one most likely to fall below the fold, and
      // split screen has the tallest detail (its Player 2 car select).
      const checked = [page.locator('[data-choice]').last()];
      if (step === 'modes') checked.push(page.locator('[data-choice="local"]'));
      for (const choice of checked) {
        await choice.click();
        const layout = await measureSelectionLayout(page);
        expect(layout.pageScrolls).toBe(false);
        expect(layout.scrolling).toEqual([]);
        expect(layout.outside).toEqual([]);
        const { settings, feature, primary, content } = layout.rightEdges;
        // Settings, the detail panel and the primary action share the grid edge.
        expect(Math.abs(settings - content)).toBeLessThanOrEqual(1);
        expect(Math.abs(primary - content)).toBeLessThanOrEqual(1);
        if (viewport.width > 650)
          expect(Math.abs(feature - content)).toBeLessThanOrEqual(1);
      }
      // One back and one forward action; the header Back stays hidden in setup.
      await expect(page.locator('#picker-close')).toBeHidden();
      await expect(page.locator('#wizard-back')).toBeVisible();
      await expect(page.locator('.picker-actions button:visible')).toHaveCount(
        2,
      );
      if (viewport.width > 650)
        for (const id of ['#picker-prev', '#picker-next'])
          await expect(page.locator(id)).toBeVisible();
      if (step !== 'modes') await page.locator('#picker-apply').click();
    }
  });
}

test.describe('touch selection', () => {
  test.use({
    isMobile: true,
    hasTouch: true,
    viewport: { width: 375, height: 667 },
  });
  test('car, paint, circuit and mode can be selected by touch before launch', async ({
    page,
  }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.goto('./');
    await page.locator('[data-choice="formula"]').tap();
    await page.locator('[data-paint="blue"]').tap();
    await expect(page.locator('[data-choice="formula"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('[data-paint="blue"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('#picker-apply').tap();
    await page
      .getByRole('button', { name: 'Choose Summit Grand Prix', exact: true })
      .tap();
    await page.locator('#picker-apply').tap();
    await expect(page.locator('[data-choice="race"]')).toBeDisabled();
    await page.locator('[data-choice="slalom"]').tap();
    await expect(page.locator('[data-choice="slalom"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('#picker-apply').tap();
    await expect(page.locator('#selection-dialog')).not.toBeVisible();
    await expect(page.locator('#skill-trial-dialog')).toBeVisible();
    await expect(page.locator('#car-name')).toHaveText('FORMULA X');
    await expect(page.locator('#track-title')).toHaveText('Summit Grand Prix');
  });
});
