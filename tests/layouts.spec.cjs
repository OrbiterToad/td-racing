const { test, expect } = require('@playwright/test');

test('every circuit layout can be selected, launched and restored', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await page.locator('#picker-apply').click();
  const circuits = await page.locator('[data-choice]').evaluateAll((tiles) =>
    tiles.map((tile) => ({
      id: tile.dataset.choice,
      name: tile.querySelector('strong').textContent,
    })),
  );
  expect(circuits).toHaveLength(9);
  for (const { id, name } of circuits) {
    for (const variant of ['forward', 'reverse', 'mirrored']) {
      await page.locator(`[data-choice="${id}"]`).click();
      await page
        .getByLabel('Circuit layout', { exact: true })
        .selectOption(variant);
      await expect(
        page.getByLabel('Circuit layout', { exact: true }),
      ).toHaveValue(variant);
      // Changing the native selector must not move to a different circuit.
      await expect(page.locator(`[data-choice="${id}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.locator('#picker-apply').click();
      if (await page.locator('#selection-dialog').isVisible())
        await page.locator('#picker-apply').click();
      if (await page.locator('#tutorial-dialog').isVisible())
        await page.locator('#tutorial-skip').click();
      const layoutId = variant === 'forward' ? id : `${id}:${variant}`;
      await expect(page.locator('#track-title')).toHaveText(
        variant === 'forward'
          ? name
          : `${name} · ${variant === 'reverse' ? 'Reverse' : 'Mirrored'}`,
      );
      expect(
        await page.evaluate(async () => {
          const { state, car } = await import('./src/state.js');
          const { nearestDriving } = await import('./src/tracks.js');
          return {
            id: state.activeMap.id,
            spawnDistance: nearestDriving(car.x, car.y).distance,
            saved: localStorage.getItem('apex-selected-track'),
          };
        }),
      ).toEqual({
        id: layoutId,
        spawnDistance: expect.any(Number),
        saved: layoutId,
      });
      await page.locator('#open-tracks').click();
      await expect(
        page.getByLabel('Circuit layout', { exact: true }),
      ).toHaveValue(variant);
    }
  }
});
