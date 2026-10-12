import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 664 },
    deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  // The production main-thread prelude exposes the live field, allowing a
  // pixel check at a known point of its fall. It shares the worker's drawing
  // core and shaders; the ordinary page, copy and navigation scrim stay put.
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?prelude=main`);
  await page.evaluate(async () => {
    window.sporeProbe = (await import('/organism/hero-spores.js')).heroSpores;
  });
  await page.waitForFunction(() => {
    const f = window.sporeProbe.field, l = f?.landings[0];
    return l?.aimed && l.state === 1 && (f.t - l.t0) / l.dur > .12;
  }, null, { timeout: 30000 });
  const point = await page.evaluate(() => {
    const f = window.sporeProbe.field, l = f.landings[0], i = l.hi * 3;
    return { x: (f.frame[i] / (f.frame[i + 2] * f.tanHalfFov * f.aspect) + 1) * innerWidth / 2,
      y: (1 - f.frame[i + 1] / (f.frame[i + 2] * f.tanHalfFov)) * innerHeight / 2 };
  });
  const screenshot = await page.screenshot();
  const pixels = await page.evaluate(async ({ png, point }) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const scale = image.width / innerWidth, radius = 15 * scale;
    const data = ctx.getImageData(Math.round(point.x * scale - radius),
      Math.round(point.y * scale - radius), radius * 2, radius * 2).data;
    let peak = 0, bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      peak = Math.max(peak, data[i]);
      if (data[i] > 100 && data[i + 1] > 70) bright++;
    }
    return { peak, bright };
  }, { png: screenshot.toString('base64'), point });
  assert.ok(pixels.peak > 110, `landing must visibly exceed the dark background: ${JSON.stringify(pixels)}`);
  assert.ok(pixels.bright >= 20, 'landing needs a readable core on a dense mobile screen');
  console.log('Mobile landing remains visible through the actual page/scrim at DPR 3:', pixels);
} finally { await browser.close(); }
