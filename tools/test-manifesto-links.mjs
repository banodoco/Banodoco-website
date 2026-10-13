import assert from 'node:assert/strict';
import { CONTENT } from '../content/content.js';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = process.env.TEST_URL || 'http://localhost:8137';
const settled = process.argv.includes('--settled');
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: settled ? 'reduce' : 'no-preference' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${url}/?nointro=1`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.evaluate(() => window.journey.flyTo('manifesto'));
  assert.deepEqual(await page.locator('.j-manifesto-line').evaluateAll(lines => lines.map(line => line.textContent.trim().replace(/\s+/g, ' '))), CONTENT.manifesto.lines);

  const tools = page.locator('.j-manifesto .manifesto-chapter-link').filter({ hasText: /^nourishing,/ });
  if (!settled) {
    await page.waitForTimeout(1200);
    assert.equal(await tools.getAttribute('aria-disabled'), 'true');
    assert.equal(await tools.evaluate(a => a.tabIndex), -1, 'unrevealed words do not create keyboard stops');
    await tools.evaluate(a => a.focus());
    assert.equal(await page.locator('.manifesto-link-tooltip:not([hidden])').count(), 0, 'future words cannot show a tooltip');
  }
  await page.waitForFunction(() => document.querySelector('.j-manifesto .manifesto-chapter-link[href="#/equip"]').getAttribute('aria-disabled') === 'false', null, { timeout: 35000 });
  await tools.hover();
  assert.equal(await page.locator('.manifesto-link-tooltip:not([hidden])').textContent(), 'Jump to the Equip section');
  assert.equal(await tools.locator('.manifesto-link-ink').evaluate(a => getComputedStyle(a).textDecorationStyle), 'dotted');
  await page.screenshot({ path: '/tmp/manifesto-links-desktop.png' });
  await tools.click();
  await page.waitForFunction(() => window.journey.chapter === 'equip' && document.querySelector('.j-manifesto').hidden, null, { timeout: 12000 });
  assert.equal(await page.locator('.manifesto-link-tooltip:not([hidden])').count(), 0, 'tooltip closes on navigation');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.journey.flyTo('manifesto'));
  const inspiration = page.locator('.j-manifesto .manifesto-chapter-link').filter({ hasText: /^seeding,/ });
  await page.waitForFunction(() => document.querySelector('.j-manifesto .manifesto-chapter-link[href="#/equip"]').getAttribute('aria-disabled') === 'false');
  await inspiration.focus();
  assert.equal(await page.locator('.manifesto-link-tooltip:not([hidden])').textContent(), 'Jump to the Inspire section');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.journey.chapter === 'inspire' && document.querySelector('.j-manifesto').hidden);
  await page.close();

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  phone.on('pageerror', e => errors.push(e.message));
  await phone.goto(`${url}/?nointro=1`);
  await phone.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await phone.waitForTimeout(3500);
  await phone.evaluate(() => window.journey.flyTo('manifesto'));
  await phone.waitForTimeout(1200);
  const community = phone.locator('.j-manifesto .manifesto-chapter-link').filter({ hasText: /^holding together/ });
  await phone.waitForFunction(() => document.querySelector('.j-manifesto .manifesto-chapter-link[href="#/equip"]').getAttribute('aria-disabled') === 'false');
  const beats = await community.locator('.j-manifesto-word').evaluateAll(words => words.map(word => Number(word.style.getPropertyValue('--w'))));
  assert.equal(beats.length, 2, 'holding together is one link with two separately revealed words');
  assert.equal(beats[1], beats[0] + 1, 'the second linked word retains its own reveal beat');
  await community.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: '/tmp/manifesto-links-mobile.png' });
  await community.tap();
  await phone.waitForFunction(() => window.journey.chapter === 'connect' && document.querySelector('.j-manifesto').hidden);
  assert.equal(await phone.locator('.manifesto-link-tooltip:not([hidden])').count(), 0, 'first touch navigates without a pinned tooltip');
  await phone.close();

  const fallback = await browser.newPage({ javaScriptEnabled: false });
  await fallback.goto(`${url}/static/`);
  const links = await fallback.locator('.manifesto-chapter-link').evaluateAll(anchors => anchors.map(a => ({ word: a.textContent, href: a.getAttribute('href'), target: !!document.getElementById(a.getAttribute('href').slice(1)) })));
  assert.deepEqual(links.map(a => [a.word, a.href]), [['seeding', '#/inspire'], ['nourishing', '#/equip'], ['holding together', '#/connect']]);
  assert.ok(links.every(a => a.target), 'native fallback links reach real section anchors with JavaScript disabled');
  assert.deepEqual(errors, []);
  console.log(`PASS manifesto ${settled ? 'settled links' : 'delayed-link reveal'}, desktop hover and Enter, mobile first-tap navigation, and no-JS fallback.`);
} finally { await browser.close(); }
