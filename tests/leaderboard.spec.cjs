const { test, expect } = require('@playwright/test');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function startTimeTrial(page) {
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  const picker = page.locator('#selection-dialog');
  if (await picker.evaluate((el) => el.open)) {
    for (let i = 0; i < 3; i++) {
      if ((await picker.getAttribute('data-mode')) === 'modes') break;
      await page.locator('#picker-apply').click();
    }
    await page.locator('[data-choice="trial"]').click();
    await page.locator('#picker-apply').click();
  }
}

async function injectBestTime(page, lapTime = 65.5) {
  await page.evaluate((t) => {
    // Directly set race.best so the leaderboard shows a submittable time.
    const raceState = window._testRace;
    if (raceState) raceState.best = t;
  }, lapTime);
  // Fallback: set via the module system if available
  await page.evaluate(async (t) => {
    try {
      const { race } = await import('./src/state.js');
      race.best = t;
    } catch (_) {}
  }, lapTime);
}

async function openPause(page) {
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-screen.open')).toBeVisible();
}

async function closePause(page) {
  await page.locator('#resume').click();
}

// ---------------------------------------------------------------------------
// Leaderboard button visibility
// ---------------------------------------------------------------------------

test('leaderboard button is hidden before the game starts', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  const btn = page.locator('#pause-leaderboard');
  // The button exists in the DOM but should be hidden (hidden attribute).
  await expect(btn).toBeHidden();
});

test('leaderboard button is visible in the pause screen during time trial', async ({
  page,
}) => {
  await startTimeTrial(page);
  await openPause(page);
  await expect(page.locator('#pause-leaderboard')).toBeVisible();
});

test('leaderboard button is hidden during a club race', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#game canvas.p5Canvas')).toBeVisible();
  const picker = page.locator('#selection-dialog');
  if (await picker.evaluate((el) => el.open)) {
    for (let i = 0; i < 3; i++) {
      if ((await picker.getAttribute('data-mode')) === 'modes') break;
      await page.locator('#picker-apply').click();
    }
    await page.locator('[data-choice="race"]').click();
    await page.locator('#picker-apply').click();
  }
  await openPause(page);
  await expect(page.locator('#pause-leaderboard')).toBeHidden();
});

// ---------------------------------------------------------------------------
// Leaderboard dialog
// ---------------------------------------------------------------------------

test('clicking the leaderboard button opens the leaderboard dialog', async ({
  page,
}) => {
  await startTimeTrial(page);
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await expect(page.locator('#leaderboard-dialog')).toBeVisible();
});

test('leaderboard dialog shows the current track and car pairing', async ({
  page,
}) => {
  await startTimeTrial(page);
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  const pairing = page.locator('#leaderboard-pairing');
  await expect(pairing).toBeVisible();
  const text = await pairing.textContent();
  // Should mention the track name (Juniper is the default).
  expect(text).toMatch(/Juniper/i);
});

test('leaderboard dialog close button dismisses it', async ({ page }) => {
  await startTimeTrial(page);
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await expect(page.locator('#leaderboard-dialog')).toBeVisible();
  await page.locator('#leaderboard-close').click();
  await expect(page.locator('#leaderboard-dialog')).toBeHidden();
});

test('leaderboard list shows "no times" message when empty', async ({
  page,
}) => {
  await startTimeTrial(page);
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  // Wait for async fetch to complete (local fallback is synchronous but the
  // async wrapper still yields).
  await expect(page.locator('#leaderboard-list')).not.toContainText('Loading');
  await expect(page.locator('#leaderboard-list')).toContainText(
    'No times recorded',
  );
});

// ---------------------------------------------------------------------------
// Submit form state
// ---------------------------------------------------------------------------

test('submit button is disabled when no best time exists', async ({ page }) => {
  await startTimeTrial(page);
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await expect(page.locator('#leaderboard-submit-btn')).toBeDisabled();
});

test('submit button is disabled when name is empty even with a best time', async ({
  page,
}) => {
  await startTimeTrial(page);
  // Inject a best time directly into module state.
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 65.5;
  });
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  // Clear any pre-filled name.
  await page.locator('#leaderboard-name').fill('');
  await expect(page.locator('#leaderboard-submit-btn')).toBeDisabled();
});

test('submit button is enabled when a valid name is entered and a best time exists', async ({
  page,
}) => {
  await startTimeTrial(page);
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 65.5;
  });
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await page.locator('#leaderboard-name').fill('Felix');
  await expect(page.locator('#leaderboard-submit-btn')).toBeEnabled();
});

// ---------------------------------------------------------------------------
// Submit flow
// ---------------------------------------------------------------------------

test('submitting a valid time adds it to the leaderboard list', async ({
  page,
}) => {
  await startTimeTrial(page);
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 65.5;
  });
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await page.locator('#leaderboard-name').fill('TestDriver');
  await page.locator('#leaderboard-submit-btn').click();
  // Status should confirm submission.
  await expect(page.locator('#leaderboard-submit-status')).toContainText(
    'Submitted',
  );
  // The leaderboard list should now show the entry.
  await expect(page.locator('#leaderboard-list')).toContainText('TestDriver');
  await expect(page.locator('#leaderboard-list')).toContainText('1:05');
});

test('submitting saves the display name for the next session', async ({
  page,
}) => {
  await startTimeTrial(page);
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 65.5;
  });
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await page.locator('#leaderboard-name').fill('ReturnDriver');
  await page.locator('#leaderboard-submit-btn').click();
  await expect(page.locator('#leaderboard-submit-status')).toContainText(
    'Submitted',
  );
  // Close and re-open: the name input should be pre-filled.
  await page.locator('#leaderboard-close').click();
  await page.locator('#pause-leaderboard').click();
  await expect(page.locator('#leaderboard-name')).toHaveValue('ReturnDriver');
});

test('submitting a second faster time ranks it above the first', async ({
  page,
}) => {
  await startTimeTrial(page);
  // Submit a slow time.
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 70.0;
  });
  await openPause(page);
  await page.locator('#pause-leaderboard').click();
  await page.locator('#leaderboard-name').fill('SlowDriver');
  await page.locator('#leaderboard-submit-btn').click();
  await expect(page.locator('#leaderboard-submit-status')).toContainText(
    'Submitted',
  );
  await page.locator('#leaderboard-close').click();

  // Submit a faster time under a different name.
  await page.evaluate(async () => {
    const { race } = await import('./src/state.js');
    race.best = 60.0;
  });
  await page.locator('#pause-leaderboard').click();
  await page.locator('#leaderboard-name').fill('FastDriver');
  await page.locator('#leaderboard-submit-btn').click();
  await expect(page.locator('#leaderboard-submit-status')).toContainText(
    'Submitted',
  );

  // The rankings list: FastDriver (#1) should appear before SlowDriver (#2).
  const rows = page.locator('.leaderboard-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('FastDriver');
  await expect(rows.last()).toContainText('SlowDriver');
});
