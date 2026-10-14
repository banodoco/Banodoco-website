import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// A cold real page exercises the preboot/live DOM swap and GPU readiness.
// Toggling is-loading on an isolated element missed the inline handoff
// transition:none that overrode the authored readiness fade.
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [width, height, reducedMotion] of [[1280,800,'no-preference'], [390,844,'no-preference'], [390,844,'reduce']]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
    await page.addInitScript(() => {
      window.navReadinessTrace = [];
      const sample = () => {
        const rail = document.querySelector('.j-rail:not(.j-rail-preboot)');
        if (rail) {
          const style = getComputedStyle(rail);
          const controls = [...rail.querySelectorAll('a, button')];
          window.navReadinessTrace.push({ t: performance.now(), busy: rail.getAttribute('aria-busy') === 'true',
            readiness: Number(style.getPropertyValue('--nav-readiness')), opacity: Number(style.opacity),
            transition: style.transitionProperty, trackingHero: rail.style.getPropertyValue('--rail-opacity-duration') === '0s',
            disabled: controls.every(c => c.getAttribute('aria-disabled') === 'true' && c.tabIndex === -1) });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(process.env.TEST_URL || 'http://localhost:8137/');
    await page.waitForFunction(() => document.querySelector('.j-rail:not(.j-rail-preboot)[aria-busy="false"]'), null, { timeout: 90000 });
    await page.waitForTimeout(reducedMotion === 'reduce' ? 100 : 1900);
    const rows = await page.evaluate(() => window.navReadinessTrace);
    const ready = rows.find(r => !r.busy);
    assert.ok(ready, 'actual navigation becomes ready');
    assert.ok(rows.filter(r => r.busy).every(r => r.disabled), 'controls stay disabled until actual readiness');
    if (reducedMotion === 'reduce') {
      assert.equal(ready.readiness, 1, 'reduced motion has no readiness fade');
    } else {
      const intermediate = rows.filter(r => !r.busy && r.readiness > .02 && r.readiness < .98);
      assert.ok(intermediate.length > 10, 'real readiness contains multiple visible fade frames');
      assert.ok(intermediate.at(-1).t - intermediate[0].t > 1100, 'readiness visibly progresses for more than a second');
      assert.ok(rows.filter(r => r.trackingHero).every(r => r.transition.includes('--nav-readiness')),
        'hero opacity tracking cannot disable the readiness transition');
      assert.ok(intermediate.every(r => !r.disabled), 'visual easing does not postpone enabled navigation');
      assert.equal(rows.at(-1).readiness, 1);
      console.log(`${width}x${height}: ready ${ready.t.toFixed(0)}ms, readiness .02→.98 ${(intermediate.at(-1).t - intermediate[0].t).toFixed(0)}ms`);
    }
    await page.close();
  }
  console.log('PASS cold-page navigation readiness: independent gradual fade, unchanged interaction gate, reduced motion immediate.');
} finally { await browser.close(); }
