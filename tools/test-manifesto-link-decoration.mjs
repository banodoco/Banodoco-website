// DOM/CSS-only check: static markup shares the animated journey's decoration.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/static/#manifesto`);
  const links = page.locator('.manifesto-chapter-link');
  await links.first().scrollIntoViewIfNeeded();
  await page.mouse.move(1199, 899);
  const state = () => links.evaluateAll(items => items.map(link => {
    const style = getComputedStyle(link);
    return { decoration: style.textDecorationColor, style: style.textDecorationStyle,
      color: style.color, opacity: style.opacity, text: link.textContent };
  }));
  const alpha = color => color === 'rgba(0, 0, 0, 0)' ? 0 : Number(color.match(/\/\s*([\d.]+)\)/)?.[1] ?? 1);
  const initial = await state();
  assert.ok(initial.every(s => alpha(s.decoration) === .4 && s.style === 'dotted'));
  assert.deepEqual(initial.map(s => s.text), ['seeding', 'nourishing', 'connecting'], 'punctuation and trailing spaces stay outside the native decoration');
  const paragraph = page.locator('[data-src="manifesto.body"] p').last();
  await links.evaluateAll(items => items.forEach(link => { link.style.textDecorationColor = 'currentColor'; }));
  await page.waitForTimeout(900);
  await paragraph.screenshot({ path: '/tmp/manifesto-links-decoration-before.png' });
  await links.evaluateAll(items => items.forEach(link => {
    link.style.removeProperty('text-decoration-color');
    link.setAttribute('aria-disabled', 'true');
  }));
  await page.waitForTimeout(900);
  assert.ok((await state()).every(s => alpha(s.decoration) === 0), 'unrevealed links have no dotted ink');
  await links.evaluateAll(items => items.forEach(link => link.setAttribute('aria-disabled', 'false')));
  await page.waitForTimeout(220);
  const rising = await state();
  assert.ok(rising.every(s => alpha(s.decoration) > 0 && alpha(s.decoration) < .4), 'dots pass through a genuinely intermediate opacity');
  await page.waitForTimeout(700);
  const settled = await state();
  assert.ok(settled.every((s, i) => alpha(s.decoration) === .4 && s.color === initial[i].color && s.opacity === initial[i].opacity), 'only decoration changes; text color/opacity retain their original owner');
  await paragraph.screenshot({ path: '/tmp/manifesto-links-decoration-after.png' });
  await links.first().hover();
  await page.waitForTimeout(900);
  assert.equal(alpha((await state())[0].decoration), .7, 'hover has a restrained stronger cue');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await links.first().evaluate(link => getComputedStyle(link).transitionDuration), '0s');
  console.log('PASS subtle native decoration: transparent → intermediate →40%, hover70%, unchanged text, clean boundaries, reduced motion.');
} finally { await browser.close(); }
