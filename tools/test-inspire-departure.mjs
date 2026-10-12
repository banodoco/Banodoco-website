// Live regression: a departing Inspire plume must not reset its emphasis
// while the camera is still at the source pose. Run with the local server up.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${process.env.TEST_URL || 'http://localhost:8137/'}?nointro=1`);
    await page.waitForFunction(() => window.journey, { timeout: 60000 });
    await page.waitForTimeout(4500);
    for (const destination of ['equip', 'connect', 'final', 'mission']) {
      await page.evaluate(() => journey.flyTo('inspire'));
      await page.waitForTimeout(6500);
      const result = await page.evaluate(async (destination) => {
        const points = sceneApi.spores.sporePts;
        const attribute = points.geometry.attributes.color;
        const colors = Array.from(attribute.array);
        const pose = sceneApi.camera.position.clone();
        journey.flyTo(destination);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        let difference = 0, energy = 0;
        for (let i = 0; i < colors.length; i++) {
          difference += Math.abs(colors[i] - attribute.array[i]);
          energy += Math.abs(colors[i]);
        }
        return { relativeColorChange: difference / energy,
          cameraTravel: pose.distanceTo(sceneApi.camera.position),
          armed: journey.chapters.inspire.armed };
      }, destination);
      assert.ok(result.cameraTravel < 0.1, `sample must be near click: ${JSON.stringify(result)}`);
      assert.ok(result.armed, `Inspire must retain its stream while departing toward ${destination}`);
      assert.ok(result.relativeColorChange < 0.08,
        `${viewport.width} → ${destination} reset plume colors: ${JSON.stringify(result)}`);
      console.log(`PASS ${viewport.width} Inspire → ${destination}: ${JSON.stringify(result)}`);
      await page.waitForTimeout(6000);
    }
    await page.close();
  }
} finally { await browser.close(); }
