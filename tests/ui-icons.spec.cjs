const { expect, test } = require('@playwright/test');

let renderUiIcon, UI_ICON_NAMES;

test.beforeAll(async () => {
  ({ renderUiIcon, UI_ICON_NAMES } = await import('../src/ui-icons.js'));
});

test('the icon set uses consistent inline outline SVGs', async ({ page }) => {
  expect(UI_ICON_NAMES).toEqual(
    expect.arrayContaining([
      'restart',
      'pause',
      'play',
      'soundOn',
      'soundOff',
      'back',
      'forward',
      'previous',
      'steerLeft',
      'steerRight',
      'check',
      'chevronDown',
      'garage',
    ]),
  );

  for (const name of UI_ICON_NAMES) {
    await page.setContent(renderUiIcon(name));
    const svg = page.locator('svg');
    await expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    await expect(svg).toHaveAttribute('stroke-width', '1.8');
    await expect(svg).toHaveAttribute('stroke-linecap', 'round');
    await expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    await expect(svg).toHaveAttribute('focusable', 'false');
    expect(await svg.evaluate((element) => element.namespaceURI)).toBe(
      'http://www.w3.org/2000/svg',
    );
    expect(await svg.locator('path').count()).toBeGreaterThan(0);
  }
});

test('decorative icons stay hidden while labelled icons expose a safe name', async ({
  page,
}) => {
  await page.setContent(
    renderUiIcon('garage', { label: 'Garage & <circuits>' }),
  );
  const svg = page.locator('svg');
  await expect(svg).toHaveAttribute('role', 'img');
  await expect(svg).toHaveAttribute('aria-label', 'Garage & <circuits>');
  await expect(svg).not.toHaveAttribute('aria-hidden');
  await expect(svg).toHaveAttribute('focusable', 'false');
});

test('size and palette options are constrained', async ({ page }) => {
  await page.setContent(renderUiIcon('pause', { size: 24, tone: 'accent' }));
  const svg = page.locator('svg');
  await expect(svg).toHaveAttribute('width', '24');
  await expect(svg).toHaveAttribute('height', '24');
  await expect(svg).toHaveCSS('color', 'rgb(213, 245, 120)');

  expect(() => renderUiIcon('pause', { size: 11 })).toThrow(RangeError);
  expect(() => renderUiIcon('pause', { tone: 'lime-ish' })).toThrow(RangeError);
  expect(() => renderUiIcon('missing')).toThrow(RangeError);
  expect(() => renderUiIcon('pause', { label: ' ' })).toThrow(TypeError);
});
