import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Exercise the real page: the settled branch predictor must agree with the
// circles that rail.js actually paints, including its phone label clearance.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.evaluate(async () => window.journey.scrollTo((await import('/journey/route.js')).restProgress('final')));
  await page.waitForTimeout(2200);
  for (const [width, height] of [[375,667], [375,548], [390,844], [430,932], [667,375], [375,667]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(600);
    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      const block = document.querySelector('.j-block[data-chapter="final"]');
      const rect = r => ({ left:r.left, right:r.right, top:r.top, bottom:r.bottom });
      const circles = [...document.querySelectorAll('.j-rail .j-rail-mark')].flatMap(mark => {
        const r = mark.getBoundingClientRect(), d = parseFloat(getComputedStyle(mark, '::after').width);
        if (!r.width || !Number.isFinite(d)) return [];
        const scale = r.width / parseFloat(getComputedStyle(mark).width), radius = d * scale / 2;
        return [{ left:r.left+r.width/2-radius, right:r.left+r.width/2+radius,
          top:r.top+r.height/2-radius, bottom:r.top+r.height/2+radius }];
      });
      const labels = [...document.querySelectorAll('.j-rail-purpose-child .j-rail-name')].map(e => rect(e.getBoundingClientRect()));
      const ink = [...block.querySelectorAll('.j-h, .j-sub')].flatMap(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return [...range.getClientRects()].map(rect);
      });
      const overlaps = ink.filter(a => [...circles,...labels].some(b => a.right>b.left && a.left<b.right && a.bottom>b.top && a.top<b.bottom));
      const branch = document.querySelector('.j-rail-purpose-manifesto .j-rail-mark').getBoundingClientRect();
      const subRange = document.createRange(); subRange.selectNodeContents(block.querySelector('.j-sub'));
      const subLines = [...subRange.getClientRects()].map(rect);
      const { settledPurposeRowMarks } = await import('/journey/layout/rail-geometry.js');
      const predicted = settledPurposeRowMarks(innerWidth, innerHeight).find(m => m.chapter==='manifesto');
      return { overlaps, circles:circles.length, heading:rect(block.querySelector('.j-h').getBoundingClientRect()),
        sub:rect(block.querySelector('.j-sub').getBoundingClientRect()), subLines, branch:rect(branch),
        predictionError:Math.abs(predicted.x-(branch.left+branch.width/2)),
        measure:block.style.getPropertyValue('--purpose-copy-measure') };
    });
    assert.equal(state.circles, 7);
    assert.ok(state.heading.top > 80 && state.sub.bottom < height, 'copy remains within viewport');
    if (height > width) {
      assert.deepEqual(state.overlaps, [], `${width}x${height}: copy clears painted circles and labels`);
      assert.ok(state.predictionError < 1, 'settled branch predictor matches the actual phone branch');
      assert.ok(state.sub.bottom > state.branch.top, 'explanation shares the branch height');
      assert.equal(state.subLines.length, 4, 'secondary text forms four readable lines');
      assert.ok(state.subLines.filter(line => line.bottom > state.branch.top).every(line => line.right <= state.branch.left - 10), 'the lines beside the branch leave a clear pocket');
    } else {
      assert.equal(state.measure, '', 'portrait pocket resets in landscape');
      const reset = await page.evaluate(() => {
        const block = document.querySelector('.j-block[data-chapter="final"]');
        const rect = () => { const r = block.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; };
        const before = rect();
        block.style.removeProperty('--purpose-copy-measure');
        return { before, baseline:rect() };
      });
      assert.deepEqual(reset.before, reset.baseline, 'landscape retains its ordinary layout after portrait fitting');
    }
    await page.screenshot({ path: `/tmp/purpose-mobile-${width}x${height}-final.png` });
    console.log(`${width}x${height}`, { lines:state.subLines.length, overlaps:state.overlaps.length,
      headingTop:state.heading.top, subtitleBottom:state.sub.bottom, predictionError:state.predictionError });
  }
  console.log('PASS portrait Purpose copy: four lines beside branch, clear circles/labels; landscape resets its ordinary layout.');
} finally { await browser.close(); }
