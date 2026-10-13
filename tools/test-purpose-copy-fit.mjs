// Real DOM/font layout without booting the WebGL scene.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  const base = process.env.TEST_URL || 'http://localhost:8137';
  await page.route('**/__purpose-fit', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
    <link rel="stylesheet" href="/hero.css"><link rel="stylesheet" href="/journey/site.css">
    <link rel="stylesheet" href="/mycelial.css"><div class="j-copy"><div class="j-block pos-bottomleft" data-chapter="final"
    style="opacity:1;visibility:visible"><h2 class="j-h"></h2><p class="j-sub"></p></div></div>` }));
  await page.goto(`${base}/__purpose-fit`);
  await page.evaluate(async () => {
    const { CONTENT } = await import('/content/content.js');
    const { createPurposeCopyFit } = await import('/journey/layout/purpose-copy-fit.js');
    const { settledPurposeRowMarks } = await import('/journey/layout/rail-geometry.js');
    const block = document.querySelector('.j-block');
    block.querySelector('.j-h').textContent = CONTENT.chapters.final.heading;
    block.querySelector('.j-sub').textContent = CONTENT.chapters.final.sub;
    await document.fonts.ready;
    window.fit = createPurposeCopyFit(block);
    window.readFit = () => {
      const marks = settledPurposeRowMarks(innerWidth, innerHeight);
      let gap = Infinity;
      for (const element of block.children) {
        const range = document.createRange(); range.selectNodeContents(element);
        for (const rect of range.getClientRects()) for (const mark of marks) {
          if (rect.right >= mark.x - mark.radius - 12 && rect.left <= mark.x + mark.radius + 12) {
            gap = Math.min(gap, mark.y - mark.radius - rect.bottom);
          }
        }
      }
      return { gap, top: block.getBoundingClientRect().top,
        headingTop: block.querySelector('.j-h').getBoundingClientRect().top,
        font: getComputedStyle(block.querySelector('.j-h')).fontSize,
        lift: block.style.getPropertyValue('--purpose-copy-lift'),
        bottom: block.getBoundingClientRect().bottom };
    };
  });
  for (const [width, height] of [[1310,914], [1205,750], [1279,750], [1280,750], [1280,720], [1440,500], [1920,1080], [1024,768], [390,844], [768,1024], [1310,914]]) {
    await page.setViewportSize({ width, height });
    const result = await page.evaluate(() => {
      document.querySelector('.j-block').style.removeProperty('--purpose-copy-lift');
      const before = window.readFit(); window.fit();
      const after = window.readFit(); window.fit();
      return { before, after, stable: window.readFit() };
    });
    assert.equal(result.after.font, result.before.font, 'keep authored type scale');
    assert.deepEqual(result.stable, result.after, 'stable fit without feedback drift');
    if (width > 900) {
      assert.ok(result.after.gap >= 29.9, JSON.stringify({ width, height, ...result }));
      assert.ok(result.after.top >= 0, 'copy remains inside short viewport');
    } else {
      assert.equal(result.after.lift, '', 'mobile/tablet retain existing composition');
      assert.equal(result.after.bottom, result.before.bottom);
    }
    console.log(`${width}x${height}: lift ${result.after.lift || 'none'}, gap ${result.after.gap.toFixed(1)}, top ${result.after.top.toFixed(1)}`);
    if (width === 1205) assert.ok(result.after.headingTop > 400, 'Purpose stays in its lower reading area');
    if (width === 1310 || width === 1205) await page.screenshot({ path: `/tmp/purpose-copy-fit-${width}x${height}.png` });
  }
  console.log('PASS Purpose ink clears settled rail; type, mobile seats and repeated fit preserved.');
} finally { await browser.close(); }
