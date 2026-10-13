import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = `${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`;
try {
 const page = await browser.newPage({ viewport: { width: 1043, height: 644 } });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(url);
 await page.waitForFunction(() => window.journey);
 await page.evaluate(() => window.journey.flyTo('manifesto'));
 await page.waitForSelector('.j-manifesto.is-open');
 await page.waitForFunction(() => !document.querySelector('.j-manifesto').classList.contains('is-font-pending'));
 const state = () => page.evaluate(() => {
  const root = document.querySelector('.j-manifesto'), box = root.querySelector('.j-manifesto-lines');
  const all = [...box.children], first = all[0], last = all.at(-1);
  const text = box.getBoundingClientRect();
  const circles = [...document.querySelectorAll('.j-rail-purpose-tree .j-rail-mark')].map(mark => {
   const rect = mark.getBoundingClientRect(), style = getComputedStyle(mark);
   const radius = parseFloat(getComputedStyle(mark, '::after').width) * rect.width / parseFloat(style.width) / 2;
   return { left: rect.left + rect.width / 2 - radius, right: rect.left + rect.width / 2 + radius,
    top: rect.top + rect.height / 2 - radius };
  }).filter(circle => circle.right >= text.left && circle.left <= text.right);
  return { font: parseFloat(getComputedStyle(first).fontSize), scroll: root.classList.contains('is-scroll-reading'),
   overflow: box.scrollHeight - box.clientHeight, lifted: box.classList.contains('is-lifted'),
   full: all.every(p => !p.hidden), revealed: all.every(p => p.classList.contains('shown')),
   end: last.getBoundingClientRect().bottom, bottom: text.bottom, navTop: Math.min(...circles.map(circle => circle.top)) };
 });
 const assertFit = (s, viewport) => {
  assert.ok(s.full && !s.scroll && !s.lifted && s.overflow <= 1 && s.end <= s.bottom + 1, JSON.stringify({viewport,...s}));
  assert.ok(s.end < s.navTop, `text clears navigation: ${JSON.stringify({viewport,...s})}`);
  assert.ok(s.font <= 22);
 };
 const initial = await state();
 for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(500);
  const s = await state(); assertFit(s, '1043x644 reveal');
  assert.equal(s.font, initial.font, 'gathering rail cannot shrink already-revealing text');
 }
 await page.waitForFunction(() => [...document.querySelectorAll('.j-manifesto-line')].every(p => p.classList.contains('shown')), { timeout: 45000 });
 await page.waitForTimeout(3500);
 const late = await state(); assertFit(late, '1043x644 fully revealed');
 assert.equal(late.font, initial.font, 'late paragraphs do not change the complete-manuscript fit');
 await page.screenshot({path:'/tmp/manifesto-fit-1043x644.png'});
 for (const [width, height] of [[1440,900],[1280,720],[1440,500],[1440,1100],[1024,768],[800,600],[1280,500],[1920,1080]]) {
  await page.setViewportSize({width,height}); await page.waitForTimeout(150);
  const s = await state(); assertFit(s, `${width}x${height}`);
  console.log('FIT',width,height,s.font,'navigation clearance',s.navTop-s.end);
  if ((width===1440&&height===900)||(width===1280&&height===720)||(width===1440&&height===500)) {
   await page.screenshot({path:`/tmp/manifesto-fit-${width}x${height}.png`});
  }
 }
 const before = await state();
 await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
 await page.waitForTimeout(100); assert.equal((await state()).font,before.font,'font-ready recomputation is stable');
 await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(150);
 const mobile = await state(); assert.ok(mobile.scroll && mobile.font>=16 && mobile.font<=18,'mobile retains native scroll/font');
 const mobileReserve = await page.evaluate(() => {
  const root=document.querySelector('.j-manifesto'), rect=root.querySelector('.j-manifesto-panel').getBoundingClientRect();
  return {bottom:rect.bottom, reserve:parseFloat(getComputedStyle(root).paddingBottom)};
 });
 assert.ok(Math.abs(mobileReserve.bottom-(844-mobileReserve.reserve))<1,'mobile reserve remains its own layout');
 await page.setViewportSize({width:1440,height:900}); await page.waitForTimeout(150);
 assertFit(await state(), 'restored desktop');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(() => window.journey.flyTo('final')); await page.waitForTimeout(4000);
 await page.evaluate(() => window.journey.flyTo('manifesto')); await page.waitForTimeout(150);
 assertFit(await state(), 'reduced motion');
 assert.deepEqual(errors,[]);
 await page.close();

 // Delay the heavier manuscript font beyond entry: no fallback paragraphs may
 // ink and then rewrap when the requested font finally arrives.
 const delayed = await browser.newPage({viewport:{width:1043,height:644}, reducedMotion:'reduce'});
 let releaseFont;
 const fontGate = new Promise(resolve => {releaseFont=resolve;});
 await delayed.route('**/assets/fonts/mycelial/dm-sans-medium.ttf', async route => {await fontGate; await route.continue();});
 await delayed.goto(url, {waitUntil:'domcontentloaded'});
 await delayed.waitForFunction(() => window.journey);
 await delayed.evaluate(() => window.journey.flyTo('manifesto'));
 await delayed.waitForSelector('.j-manifesto.is-open');
 await delayed.waitForTimeout(500);
 assert.equal(await delayed.locator('.j-manifesto-lines').evaluate(e=>getComputedStyle(e).visibility),'hidden','pending manuscript font cannot show fallback ink');
 releaseFont();
 await delayed.waitForFunction(() => !document.querySelector('.j-manifesto').classList.contains('is-font-pending'));
 const readyFont = await delayed.locator('.j-manifesto-line').first().evaluate(e=>getComputedStyle(e).fontSize);
 await delayed.waitForTimeout(500);
 assert.equal(await delayed.locator('.j-manifesto-line').first().evaluate(e=>getComputedStyle(e).fontSize),readyFont);
 assert.equal(await delayed.locator('.j-manifesto-lines').evaluate(e=>getComputedStyle(e).visibility),'visible');
 console.log('PASS complete desktop fit, moving navigation, late reveal, resize, mobile, delayed font and reduced motion');
} finally {await browser.close();}
