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
    await expect(svg).toHaveAttribute('data-icon', name);
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

test('game controls use decorative icons and keep their accessible names', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#selection-dialog')).toHaveJSProperty(
    'open',
    true,
  );

  for (const selector of [
    '#open-tracks',
    '#open-garage',
    '#touch-controls [data-key="KeyA"]',
    '#touch-controls [data-key="KeyD"]',
    '#touch-pause',
    '#restart',
    '#sound',
    '#settings-sound',
    '#pause',
    '#picker-prev',
    '#picker-next',
  ]) {
    const icon = page.locator(`${selector} svg.ui-icon`);
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(icon).toHaveAttribute('focusable', 'false');
  }
  await expect(page.locator('#open-tracks')).toHaveAttribute(
    'aria-label',
    'Tracks: Juniper Raceway',
  );
  await expect(page.locator('#open-garage')).toHaveText('Garage');
  await expect(page.locator('#open-garage svg')).toHaveAttribute(
    'data-icon',
    'garage',
  );
  await expect(
    page.locator('#touch-controls [data-key="KeyA"]'),
  ).toHaveAttribute('aria-label', 'Steer left');
  await expect(page.locator('#picker-prev')).toHaveAccessibleName(
    'Previous selection',
  );
  await expect(page.locator('#picker-next')).toHaveAccessibleName(
    'Next selection',
  );
  await expect(page.locator('.tile-check svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('.tile-check svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'check',
  );
  await expect(page.locator('.swatch.selected svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('.swatch.selected svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'check',
  );

  await page.locator('#picker-apply').click();
  await expect(page.locator('#picker-close svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('#picker-close')).toHaveAccessibleName(
    'Back to car selection',
  );
  await expect(page.locator('#picker-apply svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('#picker-apply')).toContainText(
    'NEXT / SELECT GAME MODE',
  );
  await expect(page.locator('#picker-apply')).not.toContainText(/[←→↻♪✓Ⅱ◀▶▾◇]/);

  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).toHaveJSProperty(
    'open',
    false,
  );
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();

  await page.evaluate(async () => {
    const [{ state }, { syncSoundButtons }] = await Promise.all([
      import('./src/state.js'),
      import('./src/audio.js'),
    ]);
    state.soundEnabled = true;
    syncSoundButtons();
  });
  await expect(page.locator('#sound')).toHaveText('Sound on');
  await expect(page.locator('#sound svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('#sound svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'soundOn',
  );
  await page.locator('#pause').click();
  await expect(page.locator('#pause')).toHaveText('Resume');
  await expect(page.locator('#pause')).toHaveAccessibleName('Resume game');
  await expect(page.locator('#pause svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'play',
  );
  await expect(page.locator('#resume svg.ui-icon')).toHaveCount(1);
  await expect(page.locator('#resume svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'forward',
  );
  await expect(page.locator('#resume')).toHaveText('BACK ON TRACK');
  await page.locator('#resume').click();
  await expect(page.locator('#pause')).toHaveText('Pause');
  await expect(page.locator('#pause')).toHaveAccessibleName('Pause game');
  await expect(page.locator('#pause svg.ui-icon')).toHaveAttribute(
    'data-icon',
    'pause',
  );
});

test('race-again action uses the same decorative SVG system', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#selection-dialog')).toHaveJSProperty(
    'open',
    true,
  );
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await page.locator('[data-choice="race"]').click();
  await page.locator('#picker-apply').click();
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();
  await page.evaluate(async () => {
    const [{ opponentRace, race }, { updateHUD }] = await Promise.all([
      import('./src/state.js'),
      import('./src/ui.js'),
    ]);
    Object.assign(opponentRace, {
      enabled: true,
      finished: true,
      elapsed: 98.42,
      playerFinish: 98.42,
      bestLap: 32.7,
      cars: [
        { name: 'Alex', paint: 'blue', finish: 101.6, s: 100 },
        { name: 'Blair', paint: 'yellow', finish: null, s: 200 },
        { name: 'Casey', paint: 'green', finish: null, s: 300 },
      ],
    });
    race.lap = opponentRace.laps + 1;
    race.crossedStart = true;
    race.time = 0;
    updateHUD();
  });
  await expect(page.locator('#race-results')).toBeVisible();
  await expect(page.locator('#race-results [data-action="again"]')).toHaveText(
    'Race again',
  );
  await expect(
    page.locator('#race-results [data-action="again"] svg.ui-icon'),
  ).toHaveAttribute('aria-hidden', 'true');
  await expect(
    page.locator('#race-results [data-action="again"] svg.ui-icon'),
  ).toHaveAttribute('data-icon', 'forward');
});
