import { chromium } from 'playwright-core';

const [base = 'http://127.0.0.1:8181/deck/index.html', size = '1440x900'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
if (!/^https?:\/\//.test(base) || !width || !height) {
  console.error('Usage: node tools/deck/check-firstload.mjs <base-url> <width>x<height>');
  process.exit(2);
}
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const errors = [];
const started = Date.now();
page.on('pageerror', e => errors.push(`page: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
try {
  await page.goto(base + '#1', { waitUntil: 'load', timeout: 60000 });
  const milestones = await page.waitForFunction(() => {
    const slide = document.querySelector('.slide.on');
    const h1 = slide?.querySelector('h1');
    const visible = h1 && parseFloat(getComputedStyle(h1).opacity) >= 0.99 && getComputedStyle(h1).visibility !== 'hidden';
    const introDone = !document.documentElement.classList.contains('dt-intro');
    if (introDone && visible) return { introDone, visible, slideCount: document.querySelectorAll('.slide').length,
      onCount: document.querySelectorAll('.slide.on').length, title: h1.textContent.trim(), h1Opacity: getComputedStyle(h1).opacity };
    return false;
  }, { timeout: 30000 }).then(h => h.jsonValue());
  const result = { base, viewport: `${width}x${height}`, firstWordsMs: Date.now() - started, milestones, errors };
  const failures = [];
  if (milestones.slideCount !== 11) failures.push(`expected 11 slides, found ${milestones.slideCount}`);
  if (milestones.onCount !== 1) failures.push(`expected one active slide, found ${milestones.onCount}`);
  if (!milestones.title || !milestones.title.trim()) failures.push('first slide heading is blank');
  if (errors.length) failures.push(...errors);
  result.failures = failures;
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
