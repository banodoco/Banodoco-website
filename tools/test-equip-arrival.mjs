// Actual navigation timing: readiness must introduce Equip before the camera
// finishes its final settle, while every pulse still follows its own icon.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  for (const source of ['mission', 'inspire', 'final', 'owned']) {
    if (source !== 'mission') {
      await page.evaluate(id => window.journey.flyTo(id), source);
      await page.waitForTimeout(6500);
    }
    const timing = await page.evaluate(async () => {
      const j = window.journey, api = window.sceneApi, equip = j.chapters.equip;
      const start = performance.now(), pulses = [];
      let ready = null, visible = null;
      const original = api.welcomeFrom;
      api.welcomeFrom = (...args) => {
        pulses.push({ at: performance.now() - start, slot: args[2], delay: args[3], cameraY: api.camera.position.y });
        return original(...args);
      };
      try {
        j.flyTo('equip');
        while (performance.now() - start < 7500) {
          if (ready === null && equip.entryReady()) ready = performance.now() - start;
          if (visible === null && j.ui.hotspots.some(h => h.chapter === 'equip' && h.a > .05)) visible = performance.now() - start;
          await new Promise(requestAnimationFrame);
        }
        return { ready, visible, pulses };
      } finally { api.welcomeFrom = original; }
    });
    assert.deepEqual(timing.pulses.map(p => p.slot), [0, 1], `${source}: one welcome per icon`);
    const lead = timing.pulses[0].at - timing.ready;
    assert.ok(lead >= 100 && lead < 600, `${source}: camera-safe arrival without a second long wait: ${JSON.stringify(timing)}`);
    assert.ok(timing.visible >= timing.ready && timing.visible < timing.pulses[0].at + 220,
      `${source}: icon becomes visible before its pulse starts: ${JSON.stringify(timing)}`);
    assert.ok(timing.pulses.every(p => p.cameraY > 0), `${source}: welcomes cannot spend underground`);
    assert.ok(timing.pulses.every(p => p.delay === .22), 'retain the requested icon-before-pulse offset');
    assert.ok(timing.pulses[1].at - timing.pulses[0].at >= 790, 'retain the readable two-beat cadence');
    console.log(`PASS ${source} → Equip`, timing);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
