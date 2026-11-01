const { test, expect } = require('@playwright/test');

async function installAudio(page) {
  await page.addInitScript(() => {
    const param = (value = 0) => ({
      value,
      setTargetAtTime(next) {
        this.value = next;
      },
      setValueAtTime(next) {
        this.value = next;
      },
      exponentialRampToValueAtTime(next) {
        this.value = next;
      },
    });
    class FakeNode {
      constructor() {
        this.gain = param(1);
        this.frequency = param();
        this.Q = param();
      }
      connect(node) {
        this.destination = node;
        return node;
      }
      disconnect() {}
      start() {}
      stop() {}
    }
    class FakeAudioContext {
      constructor() {
        this.currentTime = 1;
        this.sampleRate = 64;
        this.destination = new FakeNode();
        this.state = 'suspended';
      }
      createGain() {
        return new FakeNode();
      }
      createOscillator() {
        return new FakeNode();
      }
      createBiquadFilter() {
        return new FakeNode();
      }
      createBufferSource() {
        return new FakeNode();
      }
      createBuffer(_channels, length) {
        const samples = new Float32Array(length);
        return { getChannelData: () => samples };
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
    }
    window.AudioContext = FakeAudioContext;
  });
}

async function openSetup(page, prefersReducedMotion = 'no-preference') {
  await page.emulateMedia({ reducedMotion: prefersReducedMotion });
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
}

async function startSession(page) {
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await page.locator('#picker-apply').click();
  await expect(page.locator('#selection-dialog')).not.toBeVisible();
  if (await page.locator('#tutorial-dialog').isVisible())
    await page.locator('#tutorial-skip').click();
}

test('fresh preferences keep sound on, activate on a gesture, and save mute and volume', async ({
  page,
}) => {
  await installAudio(page);
  await openSetup(page, 'reduce');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        sound: state.soundEnabled,
        volume: state.settings.volume,
        sensitivity: state.settings.steeringSensitivity,
        reducedMotion: state.settings.reducedMotion,
        reducedMotionSaved: state.settings.reducedMotionSaved,
        stored: localStorage.getItem('apex-settings-v1'),
      };
    }),
  ).toEqual({
    sound: true,
    volume: 0.7,
    sensitivity: 1,
    reducedMotion: true,
    reducedMotionSaved: false,
    stored: null,
  });
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        audioInitialized: Boolean(state.audioCtx),
        worldBuilt: !!state.worldCanvas,
      };
    }),
  ).toEqual({ audioInitialized: false, worldBuilt: false });

  await page
    .getByRole('button', { name: 'Choose Drift Spec', exact: true })
    .click();

  await page.locator('#settings-setup').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await expect(page.locator('#settings-volume-value')).toHaveText('70%');
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        contextStarted: state.audioCtx?.state === 'running',
        masterVolume: state.audioMasterGain?.gain.value,
        engineVolume: state.engineGain?.gain.value,
      };
    }),
  ).toEqual({ contextStarted: true, masterVolume: 0.7, engineVolume: 0 });

  await page.locator('#settings-volume').evaluate((input) => {
    input.value = '45';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#settings-volume-value')).toHaveText('45%');
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return state.audioMasterGain.gain.value;
    }),
  ).toBe(0.45);
  await page.locator('#settings-volume').evaluate((input) => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#settings-volume-value')).toHaveText('0%');
  await page.locator('#settings-sound').click();
  await expect(page.locator('#settings-sound')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(
    await page.evaluate(() => ({
      settings: JSON.parse(localStorage.getItem('apex-settings-v1')),
    })),
  ).toMatchObject({
    settings: { soundEnabled: false, volume: 0, steeringSensitivity: 1 },
  });
  expect(
    await page.evaluate(() =>
      Object.hasOwn(
        JSON.parse(localStorage.getItem('apex-settings-v1')),
        'reducedMotion',
      ),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return state.engineGain.gain.value;
    }),
  ).toBe(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-dialog')).not.toBeVisible();
  await expect(page.locator('#settings-setup')).toBeFocused();
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await expect(page.locator('[data-choice="drift"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        worldBuilt: Boolean(state.worldCanvas),
        activeCar: state.activeCar.id,
        pendingCar: state.pendingCar,
        paused: state.paused,
      };
    }),
  ).toEqual({
    worldBuilt: false,
    activeCar: 'clubsport',
    pendingCar: 'drift',
    paused: true,
  });
  await page.reload();
  await expect(page.locator('#picker-title')).toHaveText('Choose your ride.');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#settings-setup').click();
  await expect(page.locator('#settings-volume-value')).toHaveText('0%');
  await expect(page.locator('#settings-sound')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('steering sensitivity changes player input while AI pacing and race progress stay intact', async ({
  page,
}) => {
  await openSetup(page);
  await startSession(page);
  await page.evaluate(async () => {
    const { toggleOpponentRace } = await import('./src/opponents.js');
    toggleOpponentRace();
  });
  const initial = await page.evaluate(async () => {
    const { opponentRace, race } = await import('./src/state.js');
    race.countdown = 0;
    return {
      position: [opponentRace.cars[0].x, opponentRace.cars[0].y],
      profile: [...opponentRace.profile],
    };
  });

  const steeringAt = (sensitivity) =>
    page.evaluate(async (value) => {
      const { car, keys, state } = await import('./src/state.js');
      const { simulate } = await import('./src/physics.js');
      car.steer = 0;
      keys.clear();
      keys.add('KeyD');
      state.settings.steeringSensitivity = value;
      simulate(1 / 120);
      return car.steer;
    }, sensitivity);
  const low = await steeringAt(0.6);
  const high = await steeringAt(1.4);
  expect(high).toBeGreaterThan(low);
  expect(low).toBeGreaterThan(0);
  const after = await page.evaluate(async () => {
    const { opponentRace } = await import('./src/state.js');
    return {
      position: [opponentRace.cars[0].x, opponentRace.cars[0].y],
      profile: [...opponentRace.profile],
    };
  });
  expect(after.profile).toEqual(initial.profile);
  expect(after.position).not.toEqual(initial.position);
});

test('settings suppress nonessential effects and remember an explicit motion choice', async ({
  page,
}) => {
  await openSetup(page, 'reduce');
  await page.locator('#settings-setup').click();
  await expect(page.locator('#settings-motion')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.locator('#settings-motion').click();
  await expect(page.locator('#settings-motion')).toHaveAttribute(
    'aria-checked',
    'false',
  );
  expect(
    await page.evaluate(async () => {
      const { particles, state } = await import('./src/state.js');
      const { burst } = await import('./src/physics.js');
      state.settings.reducedMotion = false;
      burst(0, 0, 'spark', 3);
      const motionEffects = particles.length;
      particles.length = 0;
      state.settings.reducedMotion = true;
      burst(0, 0, 'spark', 3);
      state.settings.reducedMotion = false;
      return { motionEffects, reducedMotionEffects: particles.length };
    }),
  ).toEqual({ motionEffects: 3, reducedMotionEffects: 0 });
  await page.locator('#settings-volume').evaluate((input) => {
    input.value = '60';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('apex-settings-v1')),
    ),
  ).toMatchObject({
    soundEnabled: true,
    volume: 0.6,
    steeringSensitivity: 1,
    reducedMotion: false,
  });
  await page.locator('#settings-done').click();
  await expect(page.locator('#settings-setup')).toBeFocused();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'false',
  );
});

test('settings open from play and pause preserve the in-progress lap', async ({
  page,
}) => {
  await openSetup(page);
  await startSession(page);
  await page.evaluate(async () => {
    const { car, race } = await import('./src/state.js');
    race.started = true;
    race.crossedStart = true;
    race.countdown = 0;
    race.time = 42;
    car.x += 13;
  });
  const original = await page.evaluate(async () => {
    const { car, race } = await import('./src/state.js');
    return { x: car.x, y: car.y, time: race.time, lap: race.lap };
  });
  await page.locator('#settings-session').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  const held = await page.evaluate(async () => {
    const { car, race } = await import('./src/state.js');
    return { x: car.x, y: car.y, time: race.time, lap: race.lap };
  });
  expect(held.time).toBeGreaterThanOrEqual(original.time);
  expect(held.lap).toBe(original.lap);
  await page.locator('#settings-sensitivity').evaluate((input) => {
    input.value = '125';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-session')).toBeFocused();
  await expect(page.locator('#pause-screen')).not.toHaveClass('open');
  expect(
    await page.evaluate(async () => {
      const { car, race, state } = await import('./src/state.js');
      return {
        x: car.x,
        y: car.y,
        time: race.time,
        lap: race.lap,
        paused: state.paused,
        sensitivity: state.settings.steeringSensitivity,
      };
    }),
  ).toMatchObject({ ...held, paused: false, sensitivity: 1.25 });

  await page.locator('#pause').click();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  await page.locator('#settings-pause').click();
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#settings-done').click();
  await expect(page.locator('#settings-pause')).toBeFocused();
  await expect(page.locator('#pause-screen')).toHaveClass('open');
  expect(
    await page.evaluate(async () => {
      const { race } = await import('./src/state.js');
      return race.time;
    }),
  ).toBeCloseTo(42, 0);
});

test('out-of-range saved values use safe defaults while valid mute persists', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'apex-settings-v1',
      JSON.stringify({
        soundEnabled: false,
        volume: 1.5,
        steeringSensitivity: 8,
        reducedMotion: 'yes',
      }),
    );
  });
  await openSetup(page);
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#settings-setup').click();
  await expect(page.locator('#settings-volume-value')).toHaveText('70%');
  await expect(page.locator('#settings-sensitivity-value')).toHaveText('100%');
  expect(
    await page.evaluate(async () => {
      const { state } = await import('./src/state.js');
      return {
        soundEnabled: state.soundEnabled,
        volume: state.settings.volume,
        sensitivity: state.settings.steeringSensitivity,
        reducedMotion: state.settings.reducedMotion,
        reducedMotionSaved: state.settings.reducedMotionSaved,
      };
    }),
  ).toEqual({
    soundEnabled: false,
    volume: 0.7,
    sensitivity: 1,
    reducedMotion: false,
    reducedMotionSaved: false,
  });
});

for (const storageMode of ['malformed', 'unavailable', 'quota']) {
  test(`settings use safe defaults and remain usable with ${storageMode} storage`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (storageMode === 'malformed') {
      await page.addInitScript(() =>
        localStorage.setItem('apex-settings-v1', '{broken'),
      );
    } else {
      await page.addInitScript((mode) => {
        if (mode === 'unavailable')
          Storage.prototype.getItem = () => {
            throw new DOMException('Storage blocked', 'SecurityError');
          };
        Storage.prototype.setItem = () => {
          throw new DOMException(
            'Storage blocked',
            mode === 'quota' ? 'QuotaExceededError' : 'SecurityError',
          );
        };
      }, storageMode);
    }
    await openSetup(page);
    await expect(page.locator('#sound')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.locator('#settings-setup').click();
    await expect(page.locator('#settings-volume-value')).toHaveText('70%');
    await expect(page.locator('#settings-sensitivity-value')).toHaveText(
      '100%',
    );
    await page.locator('#settings-volume').evaluate((input) => {
      input.value = '25';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#settings-sensitivity').evaluate((input) => {
      input.value = '130';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('#settings-motion').click();
    await page.locator('#settings-done').click();
    await expect(page.locator('#settings-setup')).toBeFocused();
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(async () => {
        const { state } = await import('./src/state.js');
        return {
          soundEnabled: state.soundEnabled,
          volume: state.settings.volume,
          sensitivity: state.settings.steeringSensitivity,
          motionPreferenceSaved: state.settings.reducedMotionSaved,
        };
      }),
    ).toEqual({
      soundEnabled: true,
      volume: 0.25,
      sensitivity: 1.3,
      motionPreferenceSaved: true,
    });
  });
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 800, height: 600 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
]) {
  test(`settings fit without scrolling at ${viewport.width} × ${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openSetup(page);
    await page.locator('#settings-setup').click();
    const dimensions = await page
      .locator('#settings-dialog')
      .evaluate((dialog) => {
        const panel = dialog
          .querySelector('.settings-panel')
          .getBoundingClientRect();
        const done = dialog
          .querySelector('#settings-done')
          .getBoundingClientRect();
        return {
          overflowing: dialog.scrollHeight > dialog.clientHeight + 1,
          contained:
            panel.top >= 0 &&
            panel.bottom <= innerHeight &&
            done.bottom <= innerHeight,
          rowsVisible: [...dialog.querySelectorAll('.setting-row')].every(
            (row) => {
              const rect = row.getBoundingClientRect();
              return rect.height >= 50 && rect.bottom <= innerHeight;
            },
          ),
        };
      });
    expect(dimensions).toEqual({
      overflowing: false,
      contained: true,
      rowsVisible: true,
    });
  });
}
