import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1&pose=connect`);
  await page.waitForFunction(() => !!window.journey);
  const resets = await page.evaluate(async () => {
    const points = window.journey.hero.spores.sporePts, camera = window.journey.hero.camera;
    const positions = points.geometry.attributes.position.array;
    const fades = points.geometry.attributes.aSporeFade.array;
    const previous = positions.slice(), previousFades = fades.slice();
    const resets = [], start = performance.now();
    await new Promise(resolve => {
      const sample = () => {
        for (let i = 0; i < fades.length; i++) {
          const j = i * 3;
          if (Math.hypot(positions[j] - previous[j], positions[j + 1] - previous[j + 1],
            positions[j + 2] - previous[j + 2]) <= 1) continue;
          const v = camera.position.clone().set(previous[j], previous[j + 1], previous[j + 2]).project(camera);
          if (Math.abs(v.x) < .9 && Math.abs(v.y) < .9 && v.z < 1) {
            resets.push({ previous: previousFades[i], current: fades[i] });
          }
        }
        previous.set(positions); previousFades.set(fades);
        if (performance.now() - start >= 12000) resolve();
        else requestAnimationFrame(sample);
      };
      sample();
    });
    return resets;
  });
  assert.ok(resets.length > 5, 'exercise actual visible Connect recycling');
  for (const reset of resets) {
    assert.ok(reset.previous < .001, 'spore is already imperceptible before its position resets');
    assert.equal(reset.current, 0, 'replacement is born dark');
  }
  assert.deepEqual(errors, [], 'no scene/runtime errors');
  console.log(`Connect: ${resets.length} visible-position resets, all dark before and after recycling`);
} finally { await browser.close(); }
