// Standing stranger checks, ported from edges/tools-src/stress.mjs (A–L).
// Uses the worktree's existing playwright-core; no extra packages or helper files.
// JSON goes to stdout, progress to stderr. Exit: 0 pass, 1 failure, 2 bad arguments.
import { chromium, webkit, devices } from 'playwright-core';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const skipWebkit = args.includes('--skip-webkit');
const positional = args.filter(a => !a.startsWith('--'));
const [base = 'http://127.0.0.1:8181/deck/index.html', size = '1440x900'] = positional;
const [width, height] = size.split('x').map(Number);
let url;
try { url = new URL(base); } catch { /* Report usage below. */ }
if (!url || !['http:', 'https:'].includes(url.protocol) || !/^\d+x\d+$/.test(size) ||
    !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
    positional.length > 2 || args.some(a => a.startsWith('--') && a !== '--skip-webkit')) {
  console.error('Usage: node tools/deck/check-stress.mjs [base-url] [widthxheight] [--skip-webkit]');
  process.exit(2);
}
url.hash = '1';
const results = { started: new Date().toISOString(), base, viewport: size, scenarios: {}, errors: [], failures: [] };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function deadline(promise, label, ms = 30000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}
const hash = (page, n) => page.evaluate(k => { location.hash = `#${k}`; }, n);
const burst = async (page, key, count = 10, interval = 150) => {
  for (let k = 0; k < count; k++) { await page.keyboard.press(key); await sleep(interval); }
};

// Check the narrative column that dot-transitions.js gathers and unmasks, not
// intentionally hidden picture tooltips/cards (notably slide 6's idle labels).
async function snapshot(page) {
  return page.evaluate(() => {
    const slides = [...document.querySelectorAll('.slide')];
    const ons = slides.filter(s => s.classList.contains('on'));
    const active = ons[0];
    const column = active?.querySelector(':scope > .split > :first-child');
    const textProblems = [];
    let textNodes = 0;
    if (column) {
      const walk = document.createTreeWalker(column, NodeFilter.SHOW_TEXT);
      for (let node; (node = walk.nextNode());) {
        if (!node.textContent.trim()) continue;
        // Version F deliberately replaces these legacy body paragraphs with
        // its pictures. Explicit exemptions, never a blanket skip-hidden rule:
        // a hidden headline or gathered column must still fail the check.
        if (node.parentElement.closest('.as-host .body, .st-host .body, .pa-host .body, .fl-host .body, .fw-host .body, .pa-host .e-note, .fw-host .e-note, .fw-host .cap')) continue;
        textNodes++;
        const label = node.textContent.trim().slice(0, 70);
        let opacity = 1;
        for (let el = node.parentElement; el; el = el.parentElement) {
          const s = getComputedStyle(el);
          opacity *= Number(s.opacity);
          if (s.display === 'none' || s.visibility !== 'visible' || s.contentVisibility === 'hidden') {
            textProblems.push(`${label}: hidden by ${el.tagName}.${el.className}`);
            break;
          }
          if ((s.maskImage && s.maskImage !== 'none') ||
              (s.webkitMaskImage && s.webkitMaskImage !== 'none') || s.clipPath !== 'none') {
            textProblems.push(`${label}: masked/clipped by ${el.tagName}.${el.className}`);
            break;
          }
        }
        if (opacity < 0.01) textProblems.push(`${label}: transparent`);
        const range = document.createRange();
        range.selectNodeContents(node);
        const visibleRects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0 &&
          r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight);
        if (!visibleRects.length) textProblems.push(`${label}: no text in viewport`);
      }
    }
    const knownFlights = ['gp-flight', 'as-flight'];
    const flights = [...document.querySelectorAll('canvas[class*="flight" i],canvas[data-flight-canvas]')];
    const flightProblems = [];
    const flightCanvases = flights.map(c => {
      const name = knownFlights.find(n => c.classList.contains(n));
      if (!name || flights.filter(other => other.classList.contains(name)).length !== 1) {
        flightProblems.push(`unknown or duplicate flight canvas: ${c.className}`);
      }
      let painted = false, readError = null;
      // Both persistent overlays are cleared on completion, even when hidden.
      try {
        if (c.width && c.height) {
          const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) { painted = true; break; }
        }
      } catch (e) { readError = e.message; }
      if (painted || readError) flightProblems.push(`${c.className}: ${readError || 'leftover flight pixels'}`);
      return { className: c.className, painted, readError };
    });
    // The only body-level canvases are the shared network/mark and these two
    // persistent flight overlays. Catch leaked unlabelled temporary canvases too.
    for (const c of document.querySelectorAll('body > canvas')) {
      if (!['dt-net', 'dt-mark', ...knownFlights].some(n => c.classList.contains(n))) {
        flightProblems.push(`unexpected body canvas: ${c.className || '(unlabelled)'}`);
      }
    }
    const rect = active?.getBoundingClientRect();
    return { hash: location.hash, slideCount: slides.length, onCount: ons.length,
      onIndex: ons.length === 1 ? slides.indexOf(active) + 1 : null,
      visible: !!rect && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 &&
        rect.left < innerWidth && rect.top < innerHeight && !active.inert,
      heading: column?.querySelector('h1')?.textContent.trim() || '',
      textNodes, textProblems: [...new Set(textProblems)], flightCanvases, flightProblems,
      introActive: document.documentElement.classList.contains('dt-intro'),
      overviewOpen: document.querySelector('#overview')?.classList.contains('on') || false };
  });
}
function problems(s, expected) {
  const failures = [];
  if (s.slideCount !== 11) failures.push(`expected 11 slides, found ${s.slideCount}`);
  if (s.onCount !== 1) failures.push(`expected one .slide.on, found ${s.onCount}`);
  if (s.onIndex !== expected || s.hash !== `#${expected}`) failures.push(`expected #${expected}, got ${s.hash} / active ${s.onIndex}`);
  if (!s.visible || !s.textNodes || !s.heading) failures.push('blank or hidden narrative');
  if (s.introActive || s.overviewOpen) failures.push('intro or overview still covering the deck');
  return [...failures, ...s.textProblems, ...s.flightProblems];
}
async function run(browser, id, description, action, options = {}) {
  console.error(`${id}: ${description}`);
  const rec = results.scenarios[id] = { description, checks: [], errors: [], failures: [] };
  let context;
  try {
    context = await browser.newContext({ viewport: { width, height }, ...options });
    const page = await deadline(context.newPage(), 'Create browser page');
    page.setDefaultTimeout(30000);
    page.on('crash', () => rec.errors.push('page: renderer crashed'));
    page.on('pageerror', e => rec.errors.push(`page: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') rec.errors.push(`console: ${m.text()}`); });
    const check = async (label, expected) => {
      // Allow the approved 4–5 s choreography to finish, then check twice so
      // a late callback cannot silently re-mask the landing after its first pass.
      await sleep(5000);
      const first = await deadline(snapshot(page), 'Inspect first landing');
      await sleep(250);
      const state = await deadline(snapshot(page), 'Inspect stable landing');
      const failures = [...new Set([...problems(first, expected), ...problems(state, expected), ...rec.errors])];
      rec.checks.push({ label, expected, state, failures });
      rec.failures.push(...failures.map(f => `${label}: ${f}`));
      console.error(`  ${label}: ${failures.length ? failures.join('; ') : 'PASS'}`);
    };
    await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => !document.documentElement.classList.contains('dt-intro'), null, { timeout: 30000 });
    await check('opening', 1);
    await action({ page, check, rec });
  } catch (e) {
    rec.failures.push(e.stack || String(e));
  } finally {
    if (context) await context.close();
    rec.failures.push(...rec.errors.filter(e => !rec.failures.some(f => f.includes(e))));
    rec.passed = rec.failures.length === 0;
    results.errors.push(...rec.errors.map(e => `${id}: ${e}`));
    results.failures.push(...rec.failures.map(f => `${id}: ${f}`));
  }
}

// Playwright has no WebKit touchscreen.swipe. Dispatch the same touch events as
// the original iPhone check, using constructors when supported and its fallback
// otherwise. This exercises handlers, not native OS gesture recognition.
async function swipe(page, start, end) {
  return page.evaluate(({ start, end }) => {
    let kind = 'TouchEvent';
    for (const [type, xy] of [['touchstart', start], ['touchmove', [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]], ['touchend', end]]) {
      const props = { identifier: 1, target: document.body, clientX: xy[0], clientY: xy[1], pageX: xy[0], pageY: xy[1], screenX: xy[0], screenY: xy[1] };
      let touch;
      try { touch = new Touch(props); } catch { touch = props; }
      const init = { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [touch], targetTouches: type === 'touchend' ? [] : [touch], changedTouches: [touch] };
      let event;
      try { event = new TouchEvent(type, init); } catch {
        kind = 'Event with touch properties';
        event = new Event(type, { bubbles: true, cancelable: true });
        for (const key of ['touches', 'targetTouches', 'changedTouches']) Object.defineProperty(event, key, { value: init[key] });
      }
      document.body.dispatchEvent(event);
    }
    return kind;
  }, { start, end });
}
async function desktop(browser) {
  await run(browser, 'A', 'Fast forward: ten ArrowRight presses at 150 ms', async ({ page, check }) => {
    await burst(page, 'ArrowRight'); await check('final', 11);
  });
  await run(browser, 'B', 'Fast forward then back: 150 ms per key', async ({ page, check }) => {
    await burst(page, 'ArrowRight'); await burst(page, 'ArrowLeft'); await check('final', 1);
  });
  await run(browser, 'C', 'Reverse 300 ms into every adjacent forward transition', async ({ page, check }) => {
    for (let n = 1; n <= 10; n++) {
      await hash(page, n); await check(`start ${n}`, n);
      await page.keyboard.press('ArrowRight'); await sleep(300);
      await page.keyboard.press('ArrowLeft'); await check(`${n}→${n + 1}→${n}`, n);
    }
  });
  await run(browser, 'D', 'Hash jumps through 7, 2, 10, 4 at 400 ms', async ({ page, check }) => {
    for (const n of [7, 2, 10, 4]) { await hash(page, n); await sleep(400); }
    await check('final', 4);
  });
  await run(browser, 'E', 'Overview O, click title 9, reopen and click title 3', async ({ page, check }) => {
    for (const n of [9, 3]) {
      await page.keyboard.press('O'); await sleep(600);
      await page.locator(`#list li:nth-child(${n})`).click({ timeout: 5000 }); await sleep(600);
    }
    await check('final', 3);
  });
  await run(browser, 'F', 'Resize during 3→4, then restore requested viewport', async ({ page, check }) => {
    await page.keyboard.press('ArrowRight'); await check('slide 2', 2);
    await page.keyboard.press('ArrowRight'); await check('slide 3', 3);
    await page.keyboard.press('ArrowRight'); await sleep(200);
    await page.setViewportSize({ width: width === 800 ? 600 : 800, height }); await sleep(300);
    await page.setViewportSize({ width, height }); await check('final', 4);
  });
  await run(browser, 'G', 'Thirty repeated ArrowRight keydowns at 30 ms', async ({ page, check }) => {
    await page.evaluate(async () => {
      for (let n = 0; n < 30; n++) {
        dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true, cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    });
    await check('final', 11);
  });
  await run(browser, 'H', 'Browser Back and Forward restore the last landing', async ({ page, check, rec }) => {
    await burst(page, 'ArrowRight', 3, 1500); await check('before Back', 4);
    // Seed an explicit hash entry so Back has a deterministic in-deck target
    // on both the baseline's replaceState and the newer pushState navigation.
    await hash(page, 7); await sleep(600);
    await page.goBack({ timeout: 15000 }); rec.backURL = page.url();
    await check('after Back', 4);
    await page.goForward({ waitUntil: 'load', timeout: 60000 });
    await check('after Forward', 7);
  });
  await run(browser, 'I', 'Click narrative headings on slides 2, 5 and 9', async ({ page, check, rec }) => {
    rec.clicks = [];
    for (const n of [2, 5, 9]) {
      await hash(page, n); await check(`start ${n}`, n);
      const point = await page.locator('.slide.on h1').evaluate(h => {
        const r = h.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return { x, y, direction: x < innerWidth / 3 ? -1 : 1, hit: document.elementFromPoint(x, y)?.tagName };
      });
      rec.clicks.push({ slide: n, ...point });
      await page.mouse.click(point.x, point.y); await check(`click ${n}`, n + point.direction);
    }
  });
  await run(browser, 'L', 'Reduced motion: visit all eleven slides using arrow keys', async ({ page, check }) => {
    if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) throw new Error('Reduced motion emulation inactive');
    for (let n = 2; n <= 11; n++) { await page.keyboard.press('ArrowRight'); await check(`slide ${n}`, n); }
  }, { reducedMotion: 'reduce' });
}
async function touch(browser) {
  const phone = devices['iPhone 13'];
  results.webkit = { skipped: false, device: 'iPhone 13', viewport: phone.viewport, syntheticTouch: true };
  await run(browser, 'J', 'iPhone WebKit: ten rapid horizontal swipes, then swipe back', async ({ page, check, rec }) => {
    for (let n = 0; n < 10; n++) { rec.dispatchKind = await swipe(page, [300, 400], [150, 410]); await sleep(150); }
    await check('forward', 11);
    await swipe(page, [100, 400], [260, 405]); await check('back', 10);
  }, phone);
  await run(browser, 'K', 'iPhone WebKit: vertical gestures with 45 px horizontal drift', async ({ page, check, rec }) => {
    // Swipes need horizontal intent (E-N4): a mostly vertical gesture with
    // 45 px of sideways drift is a scroll attempt and stays on its slide.
    rec.behavior = 'a mostly vertical gesture with 45 px drift stays put';
    for (const n of [2, 9]) {
      await hash(page, n); await check(`start ${n}`, n);
      await swipe(page, [200, 600], [245, 300]); await check(`vertical drift ${n}`, n);
    }
  }, phone);
}

async function withBrowser(type, options, action) {
  let browser;
  try { browser = await type.launch(options); await action(browser); }
  catch (e) { results.failures.push(`${type.name()}: ${e.stack || e}`); }
  finally { if (browser) await browser.close(); }
}
try {
  await withBrowser(chromium, { channel: 'chrome' }, desktop);
  if (skipWebkit || !existsSync(webkit.executablePath())) {
    results.webkit = { skipped: true, reason: skipWebkit ? '--skip-webkit' : 'Playwright WebKit executable is not installed' };
  } else await withBrowser(webkit, {}, touch);
} catch (e) { results.failures.push(e.stack || String(e)); }
results.finished = new Date().toISOString();
results.checks = Object.values(results.scenarios).reduce((sum, rec) => sum + rec.checks.length, 0);
results.passed = results.failures.length === 0;
console.log(JSON.stringify(results, null, 2));
if (!results.passed) process.exitCode = 1;
