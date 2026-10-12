import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => !!window.journey, null, { timeout: 60000 });
  for (const [from, to] of [['inspire', 'equip'], ['equip', 'connect']]) {
    await page.evaluate(async id => {
      const { restProgress } = await import('/journey/route.js');
      window.journey.scrollTo(restProgress(id));
    }, from);
    await page.waitForTimeout(700);
    await page.evaluate(({ from, to }) => {
      window.markerMotion = { frames: [], active: true };
      const sample = () => {
        const probe = window.markerMotion;
        if (!probe.active) return;
        probe.frames.push(window.journey.ui.hotspots.filter(h => h.chapter === from).map(h => ({
          id: h.id, opacity: h.a, x: h.sx, y: h.sy,
          offset: h.pendX - h.sx, dodge: h.dodgeY,
        })));
        requestAnimationFrame(sample);
      };
      sample();
      window.journey.flyTo(to);
    }, { from, to });
    await page.waitForFunction(() => window.journey.transitionSeconds === 0, null, { timeout: 20000 });
    const frames = await page.evaluate(() => { window.markerMotion.active = false; return window.markerMotion.frames; });
    let checked = 0, worldMovement = 0;
    for (let i = 1; i < frames.length; i++) {
      for (let j = 0; j < frames[i].length; j++) {
        const before = frames[i - 1][j], after = frames[i][j];
        if (Math.min(before.opacity, after.opacity) < 0.06) continue;
        const layoutShift = Math.hypot(after.offset - before.offset, after.dodge - before.dodge);
        assert.ok(layoutShift < 0.01, `${from}>${to} ${after.id}: fading layout jumped ${layoutShift}px`);
        worldMovement += Math.hypot(after.x - before.x, after.y - before.y);
        checked++;
      }
    }
    assert.ok(checked > 20, 'exercise visible markers throughout their fade');
    assert.ok(worldMovement > 20, 'markers continue following their moving world anchors');
    console.log(`${from}>${to}: ${checked} visible samples; no layout jumps, ${worldMovement.toFixed(0)}px total world tracking`);
  }
} finally { await browser.close(); }
