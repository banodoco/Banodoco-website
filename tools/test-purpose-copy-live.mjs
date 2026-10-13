import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Test the actual painted navigator independently of the layout predictor.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 940, height: 934 } });
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.evaluate(async () => window.journey.scrollTo((await import('/journey/route.js')).restProgress('final')));
  await page.waitForTimeout(2000);
  for (const [width, height] of [[940,934], [901,934], [1205,750], [1310,914]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      const block = document.querySelector('.j-block[data-chapter="final"]');
      const marks = [...document.querySelectorAll('.j-rail .j-rail-mark')].flatMap(mark => {
        const r = mark.getBoundingClientRect(), d = parseFloat(getComputedStyle(mark, '::after').width);
        if (!r.width || !Number.isFinite(d)) return [];
        const scale = r.width / parseFloat(getComputedStyle(mark).width), radius = d * scale / 2;
        return [{ left: r.left + r.width / 2 - radius, right: r.left + r.width / 2 + radius,
          top: r.top + r.height / 2 - radius }];
      });
      const labels = [...document.querySelectorAll('.j-rail-purpose-child .j-rail-name')]
        .map(label => label.getBoundingClientRect());
      let gap = Infinity;
      for (const element of block.querySelectorAll('.j-h, .j-sub')) {
        const range = document.createRange(); range.selectNodeContents(element);
        for (const rect of range.getClientRects()) for (const footprint of [...marks, ...labels]) {
          if (rect.right >= footprint.left && rect.left <= footprint.right) gap = Math.min(gap, footprint.top - rect.bottom);
        }
      }
      const { settledPurposeRowMarks } = await import('/journey/layout/rail-geometry.js');
      return { gap, circles: marks.length, labels: labels.length,
        predictedCircles: settledPurposeRowMarks(innerWidth, innerHeight).length,
        lift: block.style.getPropertyValue('--purpose-copy-lift') };
    });
    assert.equal(state.circles, 7, 'five main circles plus both branch circles');
    assert.equal(state.predictedCircles, state.circles, 'predictor cannot omit a child');
    assert.equal(state.labels, 2);
    assert.ok(state.gap >= 29, JSON.stringify({ width, height, ...state }));
    await page.screenshot({ path: `/tmp/purpose-world-${width}x${height}-fixed.png` });
    console.log(`${width}x${height}`, state);
  }
  console.log('PASS actual Purpose text clears all seven circles and both branch labels.');
} finally { await browser.close(); }
