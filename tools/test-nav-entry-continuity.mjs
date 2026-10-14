import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [width,height] of [[1280,800],[390,844]]) {
    const page = await browser.newPage({ viewport:{width,height} });
    await page.addInitScript(() => {
      window.entryTrace = [];
      const sample = () => {
        const rail = document.querySelector('.j-rail:not(.j-rail-preboot)');
        const hero = document.querySelector('h1 .hl');
        if (rail && hero) {
          const animation = rail.getAnimations().find(a => a.id === 'rail-entry-handoff');
          const source = hero.getAnimations().find(a => a.animationName === 'fade-on');
          window.entryTrace.push({ t:performance.now(), opacity:Number(getComputedStyle(rail).opacity),
            heroOpacity:Number(getComputedStyle(hero).opacity), animation:!!animation,
            start:animation?.startTime, heroStart:source?.startTime,
            readinessTransition:getComputedStyle(rail).transitionProperty.includes('--nav-readiness') });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    for (const mode of ['cold','warm']) {
      if (mode === 'cold') await page.goto(process.env.TEST_URL || 'http://localhost:8137/');
      else await page.reload();
      await page.waitForFunction(() => document.querySelector('.j-rail:not(.j-rail-preboot)[aria-busy="false"]'), null, {timeout:90000});
      await page.waitForTimeout(2200);
      const rows = await page.evaluate(() => window.entryTrace);
      const entry = rows.filter(r => r.heroOpacity > .01 && r.heroOpacity < .99);
      assert.ok(entry.length > 3, 'real startup sampled the visible preboot/live handoff');
      assert.ok(entry.every(r => r.animation), 'a browser animation owns the entire remaining fade, including startup stalls');
      const error = Math.max(...entry.map(r => Math.abs(r.opacity-r.heroOpacity)));
      assert.ok(error < .006, `rail and hero share the painted opacity rather than catching up after a stall: ${error}`);
      assert.ok(entry.every(r => Math.abs(r.start-r.heroStart)<1), 'handoff preserves the shared animation start time');
      assert.ok(entry.every(r => r.readinessTransition), 'entry never disables the independent readiness fade');
      assert.equal(rows.at(-1).animation, false, 'entry animation retires after its original deadline');
      assert.equal(rows.at(-1).opacity, 1);
      console.log(`${width} ${mode}: ${entry.length} entry frames, max hero/rail opacity difference ${error.toFixed(6)}`);
    }
    await page.close();
  }
  console.log('PASS real cold/warm nav entry: shared compositor timeline, no opacity catch-up, readiness independent.');
} finally { await browser.close(); }
