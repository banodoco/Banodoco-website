// tools/trace/mobile/ride.mjs — QA-ONLY. Nothing imports it; run it by hand.
//
// ADOPTED 2026-08-24 (PHONE-01) from the MOBILE-OBSERVE harness, which was
// staged outside the tree and had no write-authorised home. Kept because this
// repository had NO instrument that could see a phone at all before it: three
// separate orders in one week found phone-only faults that every desktop
// capture, suite and golden agreed was fine (15-vs-16 contributor faces, three
// rail glyphs 2 px low, and the Connect resolve defect PHONE-01 fixed).
//
// Changes on adoption, and only these: the hardcoded absolute playwright path
// is now resolved from this file, the port comes from $PORT (default 8177),
// the output path defaults under $PHONE_SCRATCH (never os.tmpdir(), D97/D127),
// and five dead locals eslint flagged are gone. Every line that DECIDES A
// NUMBER is byte-preserved from the harness that took every number in
// docs/code-health/evidence/2026-08-21-elegance-run-01/mobile-observe/ and
// .../phone-01/ — that is the whole point of keeping it.
//
// D118: this file IS the invocation. Read its exit code from the process you
// spawned, never from a backgrounded wrapper, and never via `timeout` (which
// does not exist on macOS and returns 127).
//
// probe3b-ride.mjs — MOBILE-OBSERVE instrument 3 (rev B).
// Touch gestures are dispatched IN-PAGE as synthetic TouchEvents timed by the
// page's own rAF — the same discipline tools/fieldpace.js uses for wheel,
// after measuring that CDP input dispatch cannot hold the 45 ms stream
// threshold on this machine (fieldpace.js header; re-confirmed here: CDP
// touchmove gaps ran 0.6-1.3 s under load, which the model rightly reads as
// notch input, not a stream). The site registers no isTrusted checks
// (grepped), and transport.js reads only touches[0].clientY, so a synthetic
// stream exercises the identical path.
//
// Scenarios:
//   flick1   inspire rest -> one firm flick (~520 px, 130 ms), release, 12 s
//   flick2   inspire rest -> flick, then second flick 700 ms later (mid
//            flight), 14 s — the DEF-SKIP roll-past probe on touch
//   flickchain  three flicks 500 ms apart, 16 s
//   subflick inspire rest -> a soft short swipe (240 px, 200 ms) that should
//            NOT commit -> watch the return behaviour for oscillation
//   drag     slow deliberate crawl (2.2 s x ~700 px, 350 ms gaps) to past rest
//   nav      flyTo('connect') reference
// Usage: node probe3b-ride.mjs <scenario> [arrivalPreset]
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCEN = process.argv[2] || 'flick1';
const PRESET = process.argv[3] || '';
const OUT = (process.env.PHONE_SCRATCH
  ? `${process.env.PHONE_SCRATCH}/ride-${SCEN}${PRESET ? '-' + PRESET : ''}.json`
  : new URL(`./out/ride-${SCEN}${PRESET ? '-' + PRESET : ''}.json`, import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal'] });
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const url = `${BASE}/?steady=1` + (PRESET ? `&arrival=${PRESET}` : '');
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled, null, { timeout: 90000, polling: 500 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const J = window.journey, S = window.sceneApi;
  const ids = ['ados', 'hivemind', 'discord'];
  const chips = ids.map((id) => document.querySelector(`.j-hot[data-node="${id}"]`));
  const copyBlock = [...document.querySelectorAll('[data-chapter="connect"]')].find((n) => !n.classList.contains('j-hot'));
  const f = S.camera.position.clone();
  window.__rec = [];
  window.__recOn = false;
  window.__gest = [];   // [t, phase] markers
  let last = performance.now();
  const loop = (now) => {
    if (window.__recOn) {
      S.camera.getWorldDirection(f);
      window.__rec.push({
        t: now, dt: now - last,
        p: J.p, tp: J.travelP,
        fy: f.y, fov: S.camera.fov,
        camY: S.camera.position.y,
        g: ids.map((id) => J.chapters.connect.nodeReveal(id)),
        li: chips.map((b) => (b ? parseFloat(b.style.getPropertyValue('--j-hot-label-in') || '-1') : -1)),
        vis: chips.map((b) => (b ? (b.classList.contains('vis') ? 1 : 0) : -1)),
        cop: copyBlock ? parseFloat(getComputedStyle(copyBlock).opacity) : -1,
        rt: J.scroll.resolveTarget, rc: J.scroll.resolveCruise, aw: J.scroll.answeredAt,
      });
    }
    last = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const target = document.querySelector('canvas') || document.body;
  const mkTouch = (y) => new Touch({ identifier: 7, target, clientX: 215, clientY: y, pageX: 215, pageY: y });
  const fire = (type, y) => {
    const list = type === 'touchend' ? [] : [mkTouch(y)];
    target.dispatchEvent(new TouchEvent(type, {
      touches: list, changedTouches: [mkTouch(y)], targetTouches: list,
      bubbles: true, cancelable: true, composed: true,
    }));
  };
  // One contact: y0 -> y1 over ms, shape 'flick' (constant fast) or 'ease'.
  window.__touchDrag = (y0, y1, ms, shape = 'flick') => new Promise((res) => {
    const t0 = performance.now();
    window.__gest.push([t0, `start ${y0}->${y1}/${ms}ms`]);
    fire('touchstart', y0);
    const step = (now) => {
      const u = Math.min(1, Math.max(0.04, (now - t0) / ms)); // clamp: never a backward first delta
      const e = shape === 'ease' ? u * u * (3 - 2 * u) : u;
      fire('touchmove', y0 + (y1 - y0) * e);
      if (u >= 1) {
        fire('touchend', y1);
        window.__gest.push([performance.now(), 'end']);
        res();
      } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
});

const sleep = (ms) => page.waitForTimeout(ms);
async function place(p) {
  await page.evaluate((pp) => { window.journey.scrollTo(pp); }, p);
  await sleep(700);
}
const drag = (y0, y1, ms, shape) => page.evaluate(
  ({ y0, y1, ms, shape }) => window.__touchDrag(y0, y1, ms, shape),
  { y0, y1, ms, shape });

await page.evaluate(() => { window.__recOn = true; });

if (SCEN === 'flick1') {
  await place(0.26);
  await drag(780, 260, 130, 'flick');
  await sleep(12000);
} else if (SCEN === 'flick2') {
  await place(0.26);
  await drag(780, 260, 130, 'flick');
  await sleep(700);
  await drag(780, 260, 130, 'flick');
  await sleep(14000);
} else if (SCEN === 'flickchain') {
  await place(0.26);
  for (let i = 0; i < 3; i++) { await drag(780, 260, 130, 'flick'); await sleep(500); }
  await sleep(16000);
} else if (SCEN === 'subflick') {
  await place(0.26);
  await drag(700, 460, 200, 'flick');
  await sleep(9000);
} else if (SCEN === 'jitterflick2') {
  /* THREE FLICKS, AND THE THIRD IS THE POINT (re-anchored 2026-08-26 under
     docs/code-health/2026-08-26-a7-ruling.md Ruling 1).

     Flick 1 departs the Inspire rest. Flick 2 lands 700 ms later — INSIDE the
     live transit — carrying 2 px of backward finger-settle jitter before its
     forward stream, the physically common case a real finger produces. By the
     amended law it buys NOTHING: a gesture born in flight feeds the flight it
     was born into and is spent at that flight's landing. The 14 s that follow
     are the assertion, not padding — the ride must stand at the Connect rest
     with nobody touching it (owner report #26: "So you didn't fix it? This is
     when scrolling through").

     Flick 3 is delivered AFTER that landing has come to rest, and it must buy
     its section. Without it this scenario would only prove the gate had
     stopped asking; with it the gate is two-sided in the TIME dimension
     inside one scenario — mid-flight refused, post-landing honoured. */
  await place(0.26);
  await drag(780, 260, 130, 'flick');
  await sleep(700);
  await page.evaluate(() => new Promise((res) => {
    const target = document.querySelector('canvas') || document.body;
    const mk = (y) => new Touch({ identifier: 9, target, clientX: 215, clientY: y, pageX: 215, pageY: y });
    const fire = (type, y) => {
      const list = type === 'touchend' ? [] : [mk(y)];
      target.dispatchEvent(new TouchEvent(type, { touches: list, changedTouches: [mk(y)], targetTouches: list, bubbles: true, cancelable: true, composed: true }));
    };
    const t0 = performance.now();
    window.__gest.push([t0, 'jitter-start (mid-flight — buys nothing)']);
    fire('touchstart', 780);
    let jittered = false;
    const step = (now) => {
      if (!jittered) { fire('touchmove', 782); jittered = true; requestAnimationFrame(step); return; }
      const u = Math.min(1, Math.max(0.04, (now - t0) / 130));
      fire('touchmove', 782 + (260 - 782) * u);
      if (u >= 1) { fire('touchend', 260); res(); } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  /* The unattended tail. analyze-ride.mjs asserts the ride does not depart the
     Connect rest across any of it — the whole of owner report #26's side. */
  await sleep(14000);
  /* THE RECOVERY. `flick3-start` is the marker analyze-ride.mjs splits the
     trace on: everything before it is the mid-flight experiment, everything
     after it is the post-landing one. */
  await page.evaluate(() => { window.__gest.push([performance.now(), 'flick3-start (post-landing — must buy its section)']); });
  await drag(780, 260, 130, 'flick');
  await sleep(12000);
} else if (SCEN === 'lateflick') {
  await place(0.26);
  await drag(780, 260, 130, 'flick');
  // wait until the ride is in its landing brake near the rest, then flick again
  await page.waitForFunction(() => window.journey.p > 0.505, null, { timeout: 15000, polling: 50 });
  await drag(780, 260, 130, 'flick');
  await sleep(14000);
} else if (SCEN === 'drag') {
  await place(0.26);
  for (let n = 0; n < 14; n++) {
    await drag(820, 120, 2200, 'ease');
    await sleep(350);
    const p = await page.evaluate(() => window.journey.p);
    if (p > 0.545) break;
  }
  await sleep(4000);
} else if (SCEN === 'nav') {
  await place(0.0);
  await page.evaluate(() => { window.journey.flyTo('connect'); });
  await sleep(10000);
}

const out = await page.evaluate(() => { window.__recOn = false; return { rec: window.__rec, gest: window.__gest }; });
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ scen: SCEN, preset: PRESET || 'default(paced)', ...out }));
const rec = out.rec;
console.log('wrote', OUT, 'frames:', rec.length, 'pEnd:', rec[rec.length - 1].p.toFixed(4),
  'pMax:', Math.max(...rec.map((r) => r.p)).toFixed(4));
await browser.close();
