// Browser regression: a hidden Purpose field must reveal its early growth,
// including after the longer ordinary camera flights release their hold.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
    await page.waitForFunction(() => !!window.journey, null, { timeout: 60000 });
    for (const from of ['inspire', 'equip', 'connect', 'owned', 'mission']) {
      await page.evaluate(id => window.journey.flyTo(id), from);
      await page.waitForFunction(() => window.journey.transitionSeconds === 0, null, { timeout: 20000 });
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const final = window.journey.chapters.final;
        let uniforms;
        final.group.traverse(o => {
          if (!uniforms && o.material?.uniforms?.uPull) uniforms = o.material.uniforms;
        });
        window.purposeArrivalProbe = { frames: [], uniforms, final, started: performance.now(), done: false };
        function frame() {
          const probe = window.purposeArrivalProbe;
          if (probe.done) return;
          probe.frames.push({ t: performance.now() - probe.started,
            visible: final.group.visible, pull: uniforms.uPull.value,
            amount: uniforms.uAmount.value });
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      // Exercise the same clickable navigation surface visitors use.
      await page.locator('.j-rail a[data-chapter="final"]:visible').first().click();
      await page.waitForTimeout(8500);
      const result = await page.evaluate(() => {
        const p = window.purposeArrivalProbe;
        p.done = true;
        return { frames: p.frames, firstBodyFull: p.final.pacing[0].reveal + p.final.pacing[0].drawW };
      });
      const shown = result.frames.filter(f => f.visible && f.amount > 0.003);
      assert.ok(shown.length, `${from}: field appears`);
      assert.ok(shown[0].pull < result.firstBodyFull,
        `${viewport.width} ${from}: first visible field must precede its first fully grown mushroom, got ${shown[0].pull}`);
      const early = shown.find(f => f.pull >= 0.2);
      const late = shown.find(f => f.pull >= 0.9);
      assert.ok(early && late && late.t - early.t > 1000,
        `${from}: field grows visibly through the ladder instead of popping`);
      assert.ok(shown.at(-1).pull > 1.1, `${from}: growth completes`);
      console.log(`${viewport.width} ${from}: first pull ${shown[0].pull.toFixed(3)}, visible growth ${(late.t - early.t).toFixed(0)}ms`);
    }
    // Explicit placements still resolve the full field without a travel clock.
    await page.evaluate(() => window.journey.scrollTo(1));
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => window.purposeArrivalProbe.uniforms.uPull.value > 1.1),
      'placement remains fully grown');
    await page.close();
  }
} finally { await browser.close(); }
