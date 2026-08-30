/* ==================================================================== *
 * tools/trace/rail-recycle.mjs — THE RETIRED-GEOMETRY RESIDUE GATE.
 *
 *   PORT=8177 node tools/trace/rail-recycle.mjs [--assert] [--prove-failure]
 *                                               [--json <file>]
 *
 * WHAT IT MEASURES, AND WHY NOTHING ELSE COULD. `journey/rail.js`
 * followCoordinate() writes `--rail-recycle-y` and toggles `.j-rail-recycle`
 * on EXACTLY ONE slot on EVERY scrolled frame, at EVERY breakpoint — the mark
 * furthest round the ring from the visitor's position (`recycle` = clamp of
 * (|d| - 2) / 0.5, so with five chapters only the diametrically opposite one
 * can qualify). It is a saw-tooth: 0 -> +24px, a sign flip at the ring's
 * discontinuity, -24px -> 0, once per chapter of travel.
 *
 * It is the RETIRED HALF MOON's own choreography — one off-edge symbol
 * dropping as it fades round the hidden back of the circle. Both surviving
 * geometries are supposed to swallow it:
 *
 *   · the desktop strip kills it outright (site.css, THE RETIRED HALF-MOON
 *     RECYCLED..., inside `@media (min-width: 901px) and (hover: hover) and
 *     (pointer: fine)`) — with a comment recording the exact symptom, "a
 *     single icon visibly drop and wrap while the other four stayed put";
 *   · the phone file re-states `.j-sym`'s transform in the MOBILE FIXED FILE
 *     block, whose header promises "polar custom-property motion is
 *     neutralised".
 *
 * NEITHER COVERED THE OVERLAP, which is where the owner found it: a viewport
 * that is narrow enough for the mobile file (`(pointer: coarse),
 * (max-width: 900px)`) and ALSO reports `(hover: hover)`. There the half
 * moon's own rule — `@media (hover: hover)`, no width bound, seven classes of
 * specificity — outranks the phone file's four-class `.j-sym` rule and
 * replaces the optical translate with `translateY(var(--rail-recycle-y))`.
 * Measured before the fix: -21.5px of painted drop, cycling, on the epilogue
 * mark alone.
 *
 * NO INSTRUMENT COULD HAVE SEEN THIS. tools/capture.py hides `.j-rail` before
 * every shutter, so the rail is in none of the ten goldens; rail-centre.mjs,
 * the one tool that measures the rail at all, runs a coarse phone and a fine
 * desktop and the fault lives at NEITHER — it needs hover AND narrow at once.
 * That third context is the reason this file exists beside rail-centre rather
 * than inside it.
 *
 * THE TWO PROPERTIES.
 *
 *   R1  THE OFFSET PAINTS NOWHERE. Forced to ±24px on every slot, in every
 *       context, the painted glyph does not move. The recycle offset belongs
 *       to a geometry no breakpoint draws any more.
 *   R2  AND THE OPTICAL PASS SURVIVES THE STATE. The computed transform under
 *       the recycle state is byte-identical to the one without it. R2 is not
 *       a restatement of R1: the tempting one-line fix — pinning
 *       `--rail-recycle-y: 0px !important`, which is what the reduced-motion
 *       block does — passes R1 while leaving `translateY(0px)` standing in
 *       place of the file's own `translate3d(--glyph-optical-x/y)`, silently
 *       undoing the per-symbol centring rail-centre.mjs asserts. R2 is what
 *       makes that fix fail here instead of two orders from now.
 *
 * `--prove-failure` re-measures with the pre-fix rule injected (the null
 * mutant of the neutraliser) and requires R1 to red in the `narrow-hover`
 * context. A check that cannot fail proves nothing.
 *
 * Exit code read from the invocation itself (D118). Never `timeout` — it does
 * not exist on this machine and returns 127.
 * ==================================================================== */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 8177);
const BASE = `http://${HOST}:${PORT}`;

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const doAssert = args.includes('--assert');
const prove = args.includes('--prove-failure');

/* The offset the rail actually writes: followCoordinate()'s `recycle * 24`,
   at both signs, because the saw-tooth visits both on every wrap. */
const FORCE_PX = 24;
/* Sub-pixel: the property is "does not move", not "moves a little". The
   shipped-and-fixed tree measures exactly 0.00 in all three contexts. */
const EPS = 0.01;

/* THE MUTANT is the pre-fix rule, restated verbatim from the `@media
   (hover: hover)` block it lives in, with `!important` so it beats the
   neutraliser under test. Injected into every context; only the one whose
   media environment lets the mobile file and the half moon overlap can
   actually move, which is itself part of what the proof shows. */
const MUTANT_CSS = `
.j-rail:not(.j-rail-column).j-rail-following
  .j-rail-slot.j-rail-recycle .j-rail-mark > .j-sym {
  transform: translateY(var(--rail-recycle-y, 0px)) !important;
}`;

/* Three contexts. The first two are the SAME 430x932 viewport and both get
   the mobile file; they differ only in what the browser reports for
   `(hover)`, which is the entire question. isMobile+hasTouch is what makes
   Chrome answer (hover:none)(pointer:coarse). */
const CONTEXTS = [
  { name: 'phone-coarse', w: 430, h: 932, dsf: 3, mobile: true },
  { name: 'narrow-hover', w: 430, h: 932, dsf: 3, mobile: false },
  { name: 'desktop', w: 1440, h: 900, dsf: 2, mobile: false },
];

function executablePath() {
  return [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean).find(c => existsSync(c));
}

/* Runs in the page. Forces the three states the fault needs — revealed, open
   (both open classes, so the answer does not depend on which one this
   breakpoint's selector reads) and progress-following — then asks each slot
   what it paints with the recycle offset off, at -24px and at +24px. */
async function measure(page) {
  return page.evaluate(({ force }) => {
    const rail = document.querySelector('.j-rail');
    if (!rail) return { error: 'no .j-rail' };
    rail.classList.add('on', 'j-rail-open', 'j-rail-hot', 'j-rail-following');
    const slots = [...rail.querySelectorAll('.j-rail-slot')];
    if (!slots.length) return { error: 'no .j-rail-slot' };

    const marks = slots.map((li) => {
      const sym = li.querySelector('.j-sym');
      const id = (li.dataset.chapter || '?');
      if (!sym) return { id, error: 'no .j-sym' };
      const at = () => {
        void rail.offsetWidth;                 // settle the cascade, then read
        const b = sym.getBoundingClientRect();
        return { top: b.top, tf: getComputedStyle(sym).transform };
      };
      const set = (on, px) => {
        li.classList.toggle('j-rail-recycle', on);
        li.style.setProperty('--rail-recycle-y', `${px}px`);
      };
      set(false, 0);
      const base = at();
      set(true, -force);
      const neg = at();
      set(true, force);
      const pos = at();
      set(false, 0);                            // leave the page as we found it
      return {
        id,
        dyNeg: +(neg.top - base.top).toFixed(3),
        dyPos: +(pos.top - base.top).toFixed(3),
        tfBase: base.tf, tfNeg: neg.tf, tfPos: pos.tf,
        opticalHeld: neg.tf === base.tf && pos.tf === base.tf,
      };
    });

    return {
      railClasses: rail.className,
      media: {
        hoverHover: matchMedia('(hover: hover)').matches,
        coarse: matchMedia('(pointer: coarse)').matches,
        mobileFile: matchMedia('(pointer: coarse), (max-width: 900px)').matches,
        w: innerWidth, h: innerHeight,
      },
      marks,
    };
  }, { force: FORCE_PX });
}

async function runContext(browser, cx, css) {
  const context = await browser.newContext({
    viewport: { width: cx.w, height: cx.h },
    deviceScaleFactor: cx.dsf,
    ...(cx.mobile ? {
      isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    } : {}),
  });
  const page = await context.newPage();
  // A mid-journey chapter: the rail is revealed away from the Mission pose.
  await page.goto(`${BASE}/?capture=connect&steady=1&photos=0`,
    { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => window.journey, null, { timeout: 120_000 });
  await page.waitForTimeout(700);
  const shipped = await measure(page);
  let mutant = null;
  if (css) {
    await page.addStyleTag({ content: css });
    await page.waitForTimeout(150);
    mutant = await measure(page);
  }
  await context.close();
  return { shipped, mutant };
}

function report(name, m) {
  if (!m || m.error) { console.log(`  (${name}: ${m && m.error})`); return; }
  console.log(`  [${name}] media=${JSON.stringify(m.media)}`);
  for (const r of m.marks) {
    console.log(`    ${String(r.id).padEnd(9)} dy(-${FORCE_PX}px)=${String(r.dyNeg).padStart(7)}  `
      + `dy(+${FORCE_PX}px)=${String(r.dyPos).padStart(7)}  optical ${r.opticalHeld ? 'held' : 'LOST'}  ${r.tfNeg}`);
  }
}

const chrome = executablePath();
if (!chrome) {
  console.error('rail-recycle: no Chrome/Chromium executable found');
  process.exit(2);
}
const browser = await chromium.launch({
  executablePath: chrome, headless: true, args: ['--use-angle=metal'],
});
const results = {};
try {
  for (const cx of CONTEXTS) {
    let r;
    try {
      r = await runContext(browser, cx, prove ? MUTANT_CSS : null);
    } catch (firstError) {
      /* One retry per context, on rail-centre.mjs's own reasoning: the live
         journey's WebGL boot under a shared dev server flakes past its wait
         roughly one run in eight. A second consecutive failure is a real red. */
      console.error(`${cx.name}: first attempt failed (${firstError.message}); retrying once`);
      r = await runContext(browser, cx, prove ? MUTANT_CSS : null);
    }
    results[cx.name] = r;
    console.log(`== ${cx.name} ==`);
    report('shipped', r.shipped);
    if (r.mutant) report('MUTANT (pre-fix rule injected)', r.mutant);
  }
} finally {
  await browser.close();
}

if (jsonOut) {
  mkdirSync(dirname(jsonOut), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify(results, null, 2));
  console.log(`written: ${jsonOut}`);
}

let failed = false;
/* Both assertions are read off `shipped`, so `--prove-failure` never weakens
   the real verdict: the mutant is an EXTRA requirement, not a substitute. */
function verdict(state) {
  const rows = [];
  for (const cx of CONTEXTS) {
    const m = results[cx.name]?.[state];
    if (!m || m.error || !m.marks) { rows.push([false, `${cx.name}/present`, m && m.error]); continue; }
    for (const r of m.marks) {
      rows.push([Math.abs(r.dyNeg) <= EPS && Math.abs(r.dyPos) <= EPS,
        `R1 ${cx.name}/${r.id}`, `dy ${r.dyNeg} / ${r.dyPos} within ${EPS}`]);
      rows.push([r.opticalHeld === true,
        `R2 ${cx.name}/${r.id}`, `transform under recycle === ${r.tfBase}`]);
    }
  }
  return rows;
}

if (doAssert) {
  let bad = 0, n = 0;
  for (const [ok, tag, shown] of verdict('shipped')) {
    n++; if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${tag}: ${shown}`);
  }
  console.log(`rail-recycle: ${n - bad}/${n} pass`);
  if (bad) failed = true;
}

if (prove) {
  /* The mutant must kill R1 where the two geometries overlap. Requiring the
     kill in a NAMED context is the point: a mutant that reds everywhere, or
     only somewhere else, would not be evidence about this fault. */
  const killed = verdict('mutant')
    .filter(([ok, tag]) => !ok && tag.startsWith('R1 narrow-hover'));
  if (killed.length) {
    console.log(`PROVEN the gate can red: ${killed.map(([, tag, shown]) => `${tag} (${shown})`).join(' | ')}`);
  } else {
    console.log('FAIL --prove-failure: the pre-fix rule did not move any mark at narrow-hover');
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
