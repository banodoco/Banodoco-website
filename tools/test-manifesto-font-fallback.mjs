import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({channel:'chrome', headless:true});
let releaseFont;
const fontGate = new Promise(resolve => { releaseFont = resolve; });
try {
 const page = await browser.newPage({viewport:{width:1043,height:644}, reducedMotion:'reduce'});
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 await page.addInitScript(() => {
  window.manifestoFontWait = {};
  new MutationObserver(() => {
   const root = document.querySelector('.j-manifesto');
   if (!root) return;
   const pending = root.classList.contains('is-font-pending');
   if (pending && window.manifestoFontWait.start === undefined) window.manifestoFontWait.start = performance.now();
   if (!pending && window.manifestoFontWait.start !== undefined && window.manifestoFontWait.end === undefined) {
    window.manifestoFontWait.end = performance.now();
   }
  }).observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
 });
 let blockedFont = false;
 await page.route('**/assets/fonts/mycelial/dm-sans-medium.ttf', async route => {
  blockedFont = true;
  await fontGate;
  await route.continue().catch(() => {});
 });
 await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`, {waitUntil:'domcontentloaded'});
 await page.waitForFunction(() => window.journey);
 await page.evaluate(() => window.journey.flyTo('manifesto'));
 await page.waitForSelector('.j-manifesto.is-open');
 await page.waitForFunction(() => window.manifestoFontWait.end !== undefined, null, {timeout:4000});
 assert.ok(blockedFont, 'font request is held without resolving');
 const state = await page.evaluate(() => {
  const root = document.querySelector('.j-manifesto');
  const lines = root.querySelector('.j-manifesto-lines');
  const paragraphs = [...lines.children];
  const mark = document.querySelector('.j-rail-purpose-manifesto .j-rail-mark');
  const rect = mark.getBoundingClientRect();
  const radius = parseFloat(getComputedStyle(mark,'::after').width) * rect.width / parseFloat(getComputedStyle(mark).width) / 2;
  return {wait:window.manifestoFontWait.end-window.manifestoFontWait.start,
   visibility:getComputedStyle(lines).visibility, revealed:paragraphs.every(p=>p.classList.contains('shown')),
   scroll:root.classList.contains('is-scroll-reading'), lifted:lines.classList.contains('is-lifted'),
   overflow:lines.scrollHeight-lines.clientHeight, bottom:paragraphs.at(-1).getBoundingClientRect().bottom,
   navTop:rect.top+rect.height/2-radius};
 });
 assert.ok(state.wait >= 2400 && state.wait < 3500, `font wait is bounded: ${JSON.stringify(state)}`);
 assert.equal(state.visibility,'visible','stalled font cannot leave the complete manifesto invisible');
 assert.ok(state.revealed && !state.scroll && !state.lifted && state.overflow<=1 && state.bottom<state.navTop,
  `fallback manuscript fits without scrolling or navigation overlap: ${JSON.stringify(state)}`);
 // The ordinary loadingdone path still refits when the delayed font arrives.
 releaseFont();
 await page.evaluate(() => document.fonts.load('600 17px "DM Sans"'));
 await page.waitForTimeout(150);
 assert.equal(await page.locator('.j-manifesto-lines').evaluate(e=>getComputedStyle(e).visibility),'visible');
 assert.ok(await page.locator('.j-manifesto-lines').evaluate(e=>e.scrollHeight-e.clientHeight<=1));
 assert.deepEqual(errors,[]);
 console.log('PASS stalled font reveals a fitting desktop manuscript after', Math.round(state.wait), 'ms; eventual font remains fitted');
} finally { releaseFont(); await browser.close(); }
