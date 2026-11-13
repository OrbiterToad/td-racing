const { test, expect } = require('@playwright/test');

async function openSettings(page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#selection-dialog')).toBeVisible();
  const skip = page.locator('#tutorial-skip');
  if (await skip.isVisible()) await skip.click();
  await page.locator('#settings-setup').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-career').click();
}

test('migrated progress restores and reset requires confirmation while retaining other data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('test-seeded')) return;
    localStorage.setItem('test-seeded', 'true');
    localStorage.setItem('apex-tutorial-v1', 'done');
    localStorage.setItem(
      'apex-medals-v1',
      JSON.stringify({ 'juniper:clubsport': 'silver' }),
    );
    localStorage.setItem(
      'apex-skill-trials-v1',
      JSON.stringify({ braking: { attempts: 3, completions: 2, best: 85 } }),
    );
    localStorage.setItem('personal-best-test', '60');
    localStorage.setItem('leaderboard-test', 'unchanged');
  });
  await openSettings(page);
  await expect(page.locator('#progression-status')).toContainText(
    '1 medals · 0 club events · 2 skill trials',
  );
  await page.evaluate(async () => {
    const career = await import('./src/progression.js');
    career.saveMedal('juniper', 'clubsport', 'gold');
    career.completeCareerEvent('juniper', 'clubsport', {
      valid: true,
      time: 180,
    });
  });
  await page.reload();
  await expect(page.locator('#selection-dialog')).toBeVisible();
  await page.locator('#settings-setup').click();
  await page.locator('#settings-career').click();
  await expect(page.locator('#progression-status')).toContainText(
    '1 medals · 1 club events · 2 skill trials',
  );
  const before = await page.evaluate(() => localStorage.getItem('apex-career'));
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('#progression-reset').click();
  expect(await page.evaluate(() => localStorage.getItem('apex-career'))).toBe(
    before,
  );
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('This cannot be undone');
    await dialog.accept();
  });
  await page.locator('#progression-reset').click();
  await expect(page.locator('#progression-status')).toContainText(
    '0 medals · 0 club events · 0 skill trials',
  );
  await page.reload();
  const saved = await page.evaluate(() => ({
    career: JSON.parse(localStorage.getItem('apex-career')),
    best: localStorage.getItem('personal-best-test'),
    leaderboard: localStorage.getItem('leaderboard-test'),
  }));
  expect(saved.career.medals).toEqual({});
  expect(saved.career.skills).toEqual({});
  expect(saved.career.events).toEqual({});
  expect(saved.career.unlocked.cars).toHaveLength(6);
  expect(saved.best).toBe('60');
  expect(saved.leaderboard).toBe('unchanged');
});

test('unsupported saves stay intact and display a recovery message', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'apex-career',
      '{"version":999,"medals":{"juniper:clubsport":"gold"}}',
    ),
  );
  await openSettings(page);
  await expect(page.locator('#progression-status')).toContainText(
    'preserved until you deliberately reset',
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('apex-career')).version,
    ),
  ).toBe(999);
});

test('real finish gates persist medals and only completed valid club events', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  const result = await page.evaluate(async () => {
    const { race, state, opponentRace } = await import('./src/state.js');
    const { updateRace } = await import('./src/race.js');
    const { loadProgression, resetProgression } =
      await import('./src/progression.js');
    state.paused = true;
    resetProgression('RESET PROGRESSION');
    const lap = (invalid = false) => {
      Object.assign(race, {
        started: true,
        crossedStart: true,
        countdown: 0,
        invalid,
        next: 1,
        time: 50,
      });
      for (const gate of [0.25, 0.5, 0.75]) {
        race.previous = gate - 0.001;
        updateRace(0.02, { progress: gate + 0.001, distance: 0 });
      }
      race.travel = 0.999;
      race.previous = 0.999;
      updateRace(0.02, { progress: 0.001, distance: 0 });
    };
    state.rewindUsed = true;
    opponentRace.enabled = false;
    lap();
    const practice = loadProgression().progress;
    state.rewindUsed = false;
    lap();
    const trial = loadProgression().progress;
    Object.assign(opponentRace, {
      enabled: true,
      laps: 3,
      elapsed: 300,
      finished: false,
      playerFinish: null,
    });
    race.lap = 1;
    lap(true);
    const invalid = loadProgression().progress;
    lap();
    lap();
    const incomplete = loadProgression().progress;
    lap();
    return {
      practice,
      trial,
      invalid,
      incomplete,
      complete: loadProgression().progress,
    };
  });
  expect(result.practice.medals).toEqual({});
  expect(result.trial.medals['juniper:clubsport']).toBe('gold');
  expect(result.invalid.events).toEqual({});
  expect(result.incomplete.events).toEqual({});
  expect(result.complete.events).toEqual({ 'juniper:clubsport': true });
});
