import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { copyContentBounds } from '../journey/ui/hotspot-frame.js';

assert.deepEqual(copyContentBounds({ left: 0, right: 390, top: 380.875, bottom: 544 },
  { paddingLeft: '20px', paddingRight: '20px', paddingTop: '24px', paddingBottom: '24px' }),
{ left: 20, right: 370, top: 404.875, bottom: 520 });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => !!window.journey, null, { timeout: 60000 });
  await page.waitForTimeout(4000);
  for (const [id, ms] of [['equip', 6500], ['manifesto', 11000], ['equip', 9000]]) {
    await page.evaluate(id => window.journey.flyTo(id), id);
    await page.waitForTimeout(ms);
    if (id !== 'equip') continue;
    const markers = await page.evaluate(() => {
      const block = document.querySelector('.j-block[data-chapter="equip"]');
      const textTop = block.querySelector('.j-h').getBoundingClientRect().top;
      return window.journey.ui.hotspots.filter(h => h.chapter === 'equip').map(h => ({
        id: h.id, a: h.a, suppressed: h.sup, reveal: h.reveal(),
        bottom: h.btn.getBoundingClientRect().bottom, textTop,
      }));
    });
    for (const marker of markers) {
      assert.equal(marker.reveal, 1, `${marker.id} chapter reveal finished`);
      assert.equal(marker.suppressed, false, `${marker.id} clears copy after real navigation`);
      assert.ok(marker.a > .99, `${marker.id} remains visible`);
      assert.ok(marker.bottom < marker.textTop, `${marker.id} does not overlap readable copy`);
    }
    console.log('390×664: both Equip markers visible and clear of text', markers);
  }
  // Real ink remains protected: this is a smaller exclusion rectangle, not
  // a bypass for Equip. Move a QA anchor into the heading, then restore it.
  await page.evaluate(() => {
    const h = window.journey.ui.hotspots.find(h => h.id === 'quark');
    const r = document.querySelector('.j-block[data-chapter="equip"] .j-h').getBoundingClientRect();
    const point = h.world().set(((r.left + r.right) / innerWidth) - 1,
      1 - ((r.top + r.bottom) / innerHeight), 0).unproject(window.journey.hero.camera);
    window.restoreQuarkWorld = h.world;
    h.world = () => point.clone();
  });
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => window.journey.ui.hotspots.find(h => h.id === 'quark').sup), true,
    'an anchor inside actual heading text is still suppressed');
  await page.evaluate(() => {
    window.journey.ui.hotspots.find(h => h.id === 'quark').world = window.restoreQuarkWorld;
    delete window.restoreQuarkWorld;
  });
  await page.waitForTimeout(900);
  assert.ok(await page.evaluate(() => window.journey.ui.hotspots.find(h => h.id === 'quark').a > .99),
    'clear stalk recovers even after genuine content suppression');
  // Browser chrome expanding/collapsing changes the same live composition;
  // suppression must recover when content and the stalk have room again.
  for (const height of [640, 740, 664, 844]) {
    await page.setViewportSize({ width: 390, height });
    await page.waitForTimeout(900);
    if (height === 640) continue;
    assert.ok(await page.evaluate(() => window.journey.ui.hotspots
      .filter(h => h.chapter === 'equip').every(h => h.a > .99 && !h.sup)),
    `both markers recover at height ${height}`);
  }
} finally { await browser.close(); }
