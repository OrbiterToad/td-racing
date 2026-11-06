const { test, expect } = require('@playwright/test');
const { readFile } = require('node:fs/promises');

function sampleGhost(time = 2, offset = 1000) {
  return {
    version: 1,
    time,
    frames: Array.from({ length: 41 }, (_, index) => [
      (time * index) / 40,
      offset + index * 3,
      400 - index * 2,
      index * 0.01,
    ]),
    sectors: [time / 4, time / 4, time / 4, time / 4],
  };
}

function ghostDocument(pairing, ghost) {
  return JSON.stringify({
    format: 'td-racing-lap-ghost',
    version: 1,
    pairing,
    ghost,
  });
}

async function seedRecords(page) {
  await page.addInitScript(
    ({ record, document }) => {
      localStorage.setItem('apex-juniper-corner-oil-v6', '75.25');
      localStorage.setItem(
        'apex-juniper-corner-oil-v6-sectors-v1',
        JSON.stringify({
          version: 1,
          time: 75.25,
          sectors: [18, 19, 19, 19.25],
        }),
      );
      localStorage.setItem(
        'apex-juniper-corner-oil-v6-ghost-v1',
        JSON.stringify(record),
      );
      window.seededPB = {
        time: localStorage.getItem('apex-juniper-corner-oil-v6'),
        sectors: localStorage.getItem('apex-juniper-corner-oil-v6-sectors-v1'),
        ghost: localStorage.getItem('apex-juniper-corner-oil-v6-ghost-v1'),
      };
      window.importedFixture = document;
    },
    {
      record: {
        ...sampleGhost(75.25, 1000),
        sectors: [18, 19, 19, 19.25],
      },
      document: ghostDocument(
        { track: 'juniper', car: 'clubsport' },
        sampleGhost(71.5, 2000),
      ),
    },
  );
}

async function openDriveSettings(page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  for (let step = 0; step < 3; step++)
    await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  const guide = page.locator('#tutorial-dialog');
  if (await guide.isVisible()) await page.locator('#tutorial-skip').click();
  await page.locator('#settings-session').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-ghost-tools').click();
  await expect(page.locator('#ghost-transfer-panel')).toBeVisible();
}

test('compatible rival import is selectable and leaves all personal-best records unchanged', async ({
  page,
}) => {
  await seedRecords(page);
  await openDriveSettings(page);

  await page.locator('#ghost-file').setInputFiles({
    name: 'juniper-rival.json',
    mimeType: 'application/json',
    buffer: Buffer.from(await page.evaluate(() => window.importedFixture)),
  });
  await expect(page.locator('#ghost-transfer-status')).toContainText(
    'Rival ghost imported',
  );
  await expect(page.locator('#ghost-reference')).toHaveValue('imported');

  const state = await page.evaluate(async () => {
    const { ghostLibrary, lapGhost, state } = await import('./src/state.js');
    const { currentReferenceGhost } = await import('./src/ghost.js');
    return {
      pairing: ghostLibrary.imported.pairing,
      selectedReference: ghostLibrary.reference,
      displayedReferenceTime: currentReferenceGhost().time,
      personalGhostTime: lapGhost.best.time,
      bestTime: localStorage.getItem(state.BEST_KEY),
      sectors: localStorage.getItem(state.BEST_KEY + '-sectors-v1'),
      ghost: localStorage.getItem(state.BEST_KEY + '-ghost-v1'),
      imported: localStorage.getItem('apex-imported-ghost-v1'),
    };
  });
  expect(state).toMatchObject({
    pairing: { track: 'juniper', car: 'clubsport' },
    selectedReference: 'imported',
    displayedReferenceTime: 71.5,
    personalGhostTime: 75.25,
    bestTime: '75.25',
  });
  expect(state.sectors).toContain('75.25');
  expect(JSON.parse(state.ghost).time).toBe(75.25);
  expect(JSON.parse(state.imported).ghost.time).toBe(71.5);

  await page.locator('#ghost-reference').selectOption('best');
  const switched = await page.evaluate(async () => {
    const { ghostLibrary } = await import('./src/state.js');
    const { currentReferenceGhost } = await import('./src/ghost.js');
    return [ghostLibrary.reference, currentReferenceGhost().time];
  });
  expect(switched).toEqual(['best', 75.25]);
});

test('pair mismatches are rejected and export includes pairing and replay data', async ({
  page,
}) => {
  await seedRecords(page);
  await page.addInitScript(() => {
    window.mismatchFixture = JSON.stringify({
      format: 'td-racing-lap-ghost',
      version: 1,
      pairing: { track: 'canyon', car: 'clubsport' },
      ghost: {
        version: 1,
        time: 71.5,
        frames: Array.from({ length: 41 }, (_, index) => [
          (71.5 * index) / 40,
          2000 + index * 3,
          400 - index * 2,
          index * 0.01,
        ]),
        sectors: [17.875, 17.875, 17.875, 17.875],
      },
    });
  });
  await openDriveSettings(page);

  await page.locator('#ghost-file').setInputFiles({
    name: 'wrong-pair.json',
    mimeType: 'application/json',
    buffer: Buffer.from(await page.evaluate(() => window.mismatchFixture)),
  });
  await expect(page.locator('#ghost-transfer-status')).toContainText(
    'This ghost is for Desert Canyon',
  );
  expect(
    await page.evaluate(() => localStorage.getItem('apex-imported-ghost-v1')),
  ).toBeNull();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#ghost-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'apex-juniper-clubsport-ghost.json',
  );
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported).toMatchObject({
    format: 'td-racing-lap-ghost',
    version: 1,
    pairing: { track: 'juniper', car: 'clubsport' },
    ghost: { time: 75.25, sectors: [18, 19, 19, 19.25] },
  });
  expect(exported.ghost.frames).toHaveLength(41);
  expect(exported.ghost.frames.at(-1)[0]).toBe(75.25);
});
