// Ownership's downward-looking camera is underground. It must not spend the
// ground-network welcome until it rises back into the visible surface world.
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
  await page.evaluate(() => window.journey.flyTo('owned'));
  await page.waitForTimeout(6500);
  const result = await page.evaluate(async () => {
    const j = window.journey, camera = window.sceneApi.camera, connect = j.chapters.connect;
    const start = performance.now(), events = [];
    const initial = { y: camera.position.y, ready: connect.entryReady() };
    let above = false, ready = false, lit = false;
    const record = type => events.push({ type, at: performance.now() - start, y: camera.position.y });
    j.flyTo('connect');
    while (performance.now() - start < 6500) {
      if (!above && camera.position.y > 0) { above = true; record('above'); }
      if (!ready && connect.entryReady()) { ready = true; record('ready'); }
      if (!lit && connect.debugAdosAlignment().visualAmount > .05) { lit = true; record('lit'); }
      await new Promise(requestAnimationFrame);
    }
    return { initial, events, visible: j.ui.hotspots.filter(h => h.chapter === 'connect' && h.a > .95).length };
  });
  assert.ok(result.initial.y < 0 && !result.initial.ready, 'Ownership cannot start a surface welcome');
  assert.deepEqual(result.events.map(e => e.type), ['above', 'ready', 'lit']);
  assert.ok(result.events.every(e => e.y > 0), 'arrival clock and network lighting stay above ground');
  assert.equal(result.visible, 3, 'all three destinations finish their existing welcome');
  assert.deepEqual(errors, []);
  console.log('PASS Ownership → Connect visible welcome', result);
} finally { await browser.close(); }
