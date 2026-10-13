import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
 await page.waitForFunction(() => window.journey);
 await page.waitForTimeout(2000);
 await page.evaluate(() => window.journey.flyTo('manifesto'));
 await page.waitForSelector('.j-manifesto.is-open');
 const state = () => page.evaluate(() => {
  const root = document.querySelector('.j-manifesto'), box = root.querySelector('.j-manifesto-lines');
  const all = [...box.children], first = all[0], last = all.at(-1);
  return { font: parseFloat(getComputedStyle(first).fontSize), scroll: root.classList.contains('is-scroll-reading'),
   overflow: box.scrollHeight - box.clientHeight, lifted: box.classList.contains('is-lifted'),
   full: all.every(p => !p.hidden), end: last.getBoundingClientRect().bottom, bottom: box.getBoundingClientRect().bottom };
 });
 for (const [width, height] of [[1440,900],[1440,500],[1440,1100],[1024,768],[800,600],[1280,500],[1920,1080]]) {
  await page.setViewportSize({width,height}); await page.waitForTimeout(100);
  const s=await state(); assert.ok(s.full && !s.scroll && !s.lifted && s.overflow<=1 && s.end<=s.bottom+1, JSON.stringify({width,height,...s}));
  assert.ok(s.font<=22); console.log('FIT',width,height,s.font);
 }
 const before=await state();
 await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
 await page.waitForTimeout(100); assert.equal((await state()).font,before.font,'font-ready recomputation is stable');
 await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(150);
 const mobile=await state(); assert.ok(mobile.scroll && mobile.font>=16 && mobile.font<=18,'mobile retains native scroll/font');
 await page.setViewportSize({width:1440,height:900}); await page.waitForTimeout(150);
 assert.ok(!(await state()).scroll && (await state()).full, 'resize back restores whole desktop manuscript');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(() => { window.journey.flyTo('final'); }); await page.waitForTimeout(4000);
 await page.evaluate(() => window.journey.flyTo('manifesto')); await page.waitForTimeout(100);
 assert.ok(!(await state()).scroll && (await state()).overflow<=1,'reduced-motion desktop also never scrolls');
 await page.screenshot({path:'/tmp/manifesto-desktop-fit.png'});
 assert.deepEqual(errors,[]); console.log('PASS desktop fit, breakpoint resize, font-ready, reduced motion');
} finally {await browser.close();}
