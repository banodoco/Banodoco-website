import { chromium } from 'playwright-core';

const [base = 'http://127.0.0.1:8181/deck/index.html', size = '1440x900'] = process.argv.slice(2);
const [width, height] = size.split('x').map(Number);
if (!/^https?:\/\//.test(base) || !width || !height) {
  console.error('Usage: node tools/deck/check-stress.mjs <base-url> <width>x<height>');
  process.exit(2);
}
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(`page: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const states = [];
try {
  await page.goto(base + '#1', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => !document.documentElement.classList.contains('dt-intro'), { timeout: 30000 });
  for (const n of [1,2,3,4,5,6,7,8,9,10,11,10,9,5,4,1,6,2,11]) {
    await page.evaluate(k => { location.hash = `#${k}`; }, n);
    await sleep(5000);
    const state = await page.evaluate(() => {
      const slides = [...document.querySelectorAll('.slide')];
      const ons = slides.filter(s => s.classList.contains('on'));
      const visible = ons[0] && getComputedStyle(ons[0]).display !== 'none' && ons[0].getBoundingClientRect().width > 0;
      const flightCanvases = [...document.querySelectorAll('canvas[class*="flight" i],[data-flight-canvas]')];
      const known = ['gp-flight', 'as-flight'];
      const counts = Object.fromEntries(known.map(name => [name, document.querySelectorAll(`canvas.${name}`).length]));
      const strayFlightCanvases = flightCanvases.filter(c => {
        const names = typeof c.className === 'string' ? c.className.split(/\s+/) : [];
        return !names.some(name => known.includes(name)) || names.some(name => counts[name] > 1);
      });
      return { hash: location.hash, slideCount: slides.length, onCount: ons.length, onIndex: ons.length === 1 ? slides.indexOf(ons[0]) + 1 : null,
        visible, flightCanvases: strayFlightCanvases.length, canvasClasses: strayFlightCanvases.map(c => c.className.baseVal || c.className), knownFlightCanvases: counts };
    });
    states.push(state);
  }
  const failures = [];
  for (const s of states) {
    if (s.slideCount !== 11) failures.push(`expected 11 slides, found ${s.slideCount}`);
    if (s.onCount !== 1) failures.push(`${s.hash}: .slide.on count ${s.onCount}`);
    if (!s.visible) failures.push(`${s.hash}: active slide is blank or hidden`);
    if (s.flightCanvases !== 0) failures.push(`${s.hash}: ${s.flightCanvases} stray flight canvas(es)`);
    if (s.hash !== `#${s.onIndex}`) failures.push(`${s.hash}: active slide index ${s.onIndex}`);
  }
  if (errors.length) failures.push(...errors);
  console.log(JSON.stringify({ base, viewport: `${width}x${height}`, checks: states.length, states, errors, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
