/* ==================================================================== *
 * tools/trace/copy-fit.mjs — THE FITTED-COPY GATE.
 *
 *   PORT=8177 node tools/trace/copy-fit.mjs [--prove-failure] [--json <f>]
 *
 * Nearly every chapter sub in content/content.js was chosen against a PIXEL
 * MEASURE and its line count promised in prose ("renders 2 / 2 / 2", "two
 * lines, not three"), held by named blocks in journey/site.css that those
 * comments cross-reference. Nothing checked either side, and on 2026-08-19 a
 * `deploy` commit replaced two subs with their comments left describing the
 * retired strings.
 *
 * BUDGETS ARE RECOVERED, NOT INVENTED — each row quotes the comment that
 * recorded it. They are DECLARED because they cannot be derived: the site
 * keeps no uniform headroom discipline (shipped slots run 1.02x to 1.89x of
 * what they need), so no measure-relative rule both passes today and catches
 * anything. `headroom` is measured and printed for that reason — the early
 * warning a line count is not. It is REPORTED, not gated: Final's sub is
 * already outside the ~+20% its own CSS block promises, and gating it would
 * red HEAD. A LINE BUDGET IS A PROMISE ABOUT ONE WIDTH, so all three widths
 * the comments measured at are covered; 430x932, tablet and the 480-900px
 * band are not. Exit read from the invocation (D118).
 * ==================================================================== */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright-core';

/* slot -> max lines at [1440x900, 1280x800, 375x812]. mission.heading is
   measured but ungated: locked string, no line promise, animated spans. */
const BUDGET = {
  'mission.sub':     [2, 2, 2], // content.js: "renders 2 / 2 / 2 … at ALL THREE sizes"
  'inspire.heading': [1, 1, 2], // content.js: "Line count is unmoved: 1 / 1 / 2"
  'inspire.sub':     [2, 2, 3], // content.js: "Rendered 4 / 4 / 6 lines -> 2 / 2 / 3"
  'connect.heading': [1, 1, 2], // content.js + CONNECT MEASURE: "has always set one line"
  'connect.sub':     [2, 2, 4], // content.js: "two lines, not three"; SUB MEASURE: "four … at phone"
  'owned.heading':   [1, 1, 2], // content.js: "Rendered 2 / 1 / 2 lines -> 1 / 1 / 2"
  'owned.sub':       [4, 4, 5], // content.js: "Rendered 3 / 3 / 5 -> 4 / 4 / 5" (recorded, not asked for)
  'final.heading':   [2, 2, 4], // FINAL HEADING MEASURE + "four balanced lines" below 480px
  'final.sub':       [2, 2, 4], // content.js: "needs 448px of column to break in two"; four at phone
};
const VIEWPORTS = [['1440x900', 1440, 900, 2], ['1280x800', 1280, 800, 2], ['375x812', 375, 812, 3]];
const MUTANT = { id: 'inspire.sub', add: ' and to build the tools that movement needs.' };

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const prove = args.includes('--prove-failure');

/* Runs in the page. Per slot: rendered line count, the column its own CSS
   gives it, and `needs` — the narrowest column still rendering that many
   lines, by bisection. headroom = avail / needs. */
function inPage(mutate) {
  const ids = ['inspire', 'connect', 'owned', 'final'];
  const slots = [['mission.heading', document.querySelector('.ui .hero h1')],
    ['mission.sub', document.querySelector('.ui .hero .sub')]];
  [...document.querySelectorAll('.j-block')].forEach((b, i) => slots.push(
    [`${ids[i]}.heading`, b.querySelector('.j-h')], [`${ids[i]}.sub`, b.querySelector('.j-sub')]));
  const count = (el) => {
    const r = document.createRange(); r.selectNodeContents(el); const tops = [];
    for (const q of r.getClientRects()) if (q.width > 0.5 && !tops.some(t => Math.abs(t - q.top) < 2)) tops.push(q.top);
    return tops.length;
  };
  const out = {};
  for (const [id, el] of slots) {
    if (!el) { out[id] = { error: 'slot not in DOM' }; continue; }
    if (mutate && mutate.id === id) el.textContent += mutate.add;
    /* The column, not the rendered box: a `.j-block` is shrink-to-fit under
       its max-width, so an over-wide spacer is what reveals the cap. */
    const host = el.closest('.j-block') || el.parentElement;
    const spacer = host.appendChild(document.createElement('div'));
    spacer.style.cssText = 'height:0;width:100000px';
    const hs = getComputedStyle(host);
    const col = host.clientWidth - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight);
    spacer.remove();
    const cs = getComputedStyle(el);
    const own = parseFloat(cs.maxWidth);
    const avail = Math.min(col, Number.isFinite(own) ? own : Infinity);
    const lines = count(el);
    const keep = [el.style.width, el.style.maxWidth];
    let lo = 1, hi = Math.round(avail);
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      el.style.width = el.style.maxWidth = `${mid}px`;
      if (count(el) <= lines) hi = mid; else lo = mid + 1;
    }
    [el.style.width, el.style.maxWidth] = keep;
    out[id] = { lines, avail: +avail.toFixed(1), needs: hi, headroom: +(avail / hi).toFixed(3),
      balance: cs.textWrap === 'balance', chars: el.textContent.trim().length };
  }
  return out;
}

const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => existsSync(p));
if (!chrome) { console.error('copy-fit: no Chrome/Chromium executable found'); process.exit(2); }

const base = `http://127.0.0.1:${Number(process.env.PORT || 8177)}`;
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal'] });
const results = {};
try {
  for (const [name, width, height, deviceScaleFactor] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor,
      ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    await page.goto(`${base}/?capture=connect&steady=1&photos=0`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(() => window.journey, null, { timeout: 120_000 });
    await page.waitForTimeout(900);
    results[name] = await page.evaluate(inPage, null);
    if (prove) results[`${name} MUTANT`] = await page.evaluate(inPage, MUTANT);
    await context.close();
  }
} finally { await browser.close(); }

/* One report, two verdicts: the shipped run must be clean, the mutant must not. */
const verdict = (label, run, i) => Object.entries(run).flatMap(([id, r]) => {
  const max = BUDGET[id]?.[i];
  const over = max !== undefined && (r.error || r.lines > max);
  console.log(`  ${id.padEnd(16)} ${r.error ? 'ERROR' : `${over ? 'OVER ' : 'ok   '} lines=${r.lines}/${max ?? '-'}`
    + ` avail=${r.avail} needs=${r.needs} headroom=${r.headroom}${r.balance ? ' balance' : ''} chars=${r.chars}`}`);
  return over ? [`${id} @${label}: budget ${max} lines, measured ${r.error || r.lines}`] : [];
});
let shipped = [], mutant = [];
VIEWPORTS.forEach(([name], i) => {
  console.log(`== ${name} ==`);
  shipped = shipped.concat(verdict(name, results[name], i));
  if (!prove) return;
  console.log(`== ${name} MUTANT (${MUTANT.id} lengthened) ==`);
  mutant = mutant.concat(verdict(name, results[`${name} MUTANT`], i));
});
for (const f of shipped) console.log(`FAIL ${f}`);
const killed = mutant.filter(f => f.startsWith(MUTANT.id));
if (prove && !killed.length) {
  shipped.push('mutant');
  console.log(`FAIL --prove-failure: lengthening ${MUTANT.id} did not breach any budget`);
} else if (prove) console.log(`PROVEN the gate can red: ${killed.join(' | ')}`);
if (jsonOut) { mkdirSync(dirname(jsonOut), { recursive: true }); writeFileSync(jsonOut, JSON.stringify(results, null, 2)); }
console.log(shipped.length ? `copy-fit: ${shipped.length} FAIL` : 'copy-fit: PASS');
process.exit(shipped.length ? 1 : 0);
