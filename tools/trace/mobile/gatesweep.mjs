// tools/trace/mobile/gatesweep.mjs — QA-ONLY. Nothing imports it; run it by hand.
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
// probe2-gatesweep.mjs — MOBILE-OBSERVE instrument 2.
// LIVE page, emulated phone (430x932, DPR3, touch, mobile UA) vs desktop
// control. Sweeps p via the QA placement hook (journey.scrollTo -> placeAt,
// dt=0 snap: the PURE schedule, no pace floor, no gesture) and records, at
// each p, the whole icon chain:
//   camera fwd.y (live camera)                 -> the resolve's input
//   chapters.connect.nodeReveal(id) x3         -> the chip gate (scene truth)
//   per-chip DOM: .vis, --j-hot-label-in, --j-hot-icon-in, opacity
//   connect copy block opacity
// Usage: node probe2-gatesweep.mjs phone|desktop [out.json]
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const MODE = process.argv[2] || 'phone';
const OUT = process.argv[3] || (process.env.PHONE_SCRATCH
  ? `${process.env.PHONE_SCRATCH}/gatesweep-${MODE}.json`
  : new URL('./out/gatesweep-${MODE}.json', import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal'] });
const ctx = await browser.newContext(MODE === 'phone' ? {
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
} : { viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[page-err]', m.text()); });
await page.goto(`${BASE}/?steady=1`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled, null, { timeout: 90000, polling: 500 });
await page.waitForTimeout(1500);

const data = await page.evaluate(async () => {
  const J = window.journey;
  const S = window.sceneApi;
  const ids = ['ados', 'hivemind', 'discord'];
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const rows = [];
  const chip = {};
  for (const id of ids) chip[id] = document.querySelector(`.j-hot[data-node="${id}"]`);
  const copyBlock = document.querySelector('.j-copy [data-chapter="connect"], [data-chapter="connect"].j-copy-block')
    || [...document.querySelectorAll('[data-chapter="connect"]')].find((n) => !n.classList.contains('j-hot'));
  const _f = S.camera.position.clone(); // Vector3 scratch
  for (let p = 0.30; p <= 0.585 + 1e-9; p += 0.001) {
    J.journey ? null : null;
    window.journey.scrollTo(p);
    await raf(); await raf();
    S.camera.getWorldDirection(_f);
    const row = {
      p: +p.toFixed(4),
      fwdY: _f.y,
      reveal: ids.map((id) => J.chapters.connect.nodeReveal(id)),
      chips: ids.map((id) => {
        const b = chip[id];
        if (!b) return null;
        const cs = getComputedStyle(b);
        return {
          vis: b.classList.contains('vis'),
          labelIn: parseFloat(b.style.getPropertyValue('--j-hot-label-in') || '-1'),
          iconIn: parseFloat(b.style.getPropertyValue('--j-hot-icon-in') || '-1'),
          icoS: parseFloat(b.style.getPropertyValue('--j-hot-ico-s') || '-1'),
          op: parseFloat(cs.opacity),
        };
      }),
      copyOp: copyBlock ? parseFloat(getComputedStyle(copyBlock).opacity) : null,
      copyVis: copyBlock ? getComputedStyle(copyBlock).visibility : null,
    };
    rows.push(row);
  }
  return { ua: navigator.userAgent, vw: innerWidth, vh: innerHeight,
    aspect: innerWidth / innerHeight,
    scrollTotal: J.scroll.total,
    px: { inspireRest: J.scroll.scrollFor(0.26), connectStart: J.scroll.scrollFor(0.38), connectRest: J.scroll.scrollFor(0.523) },
    rows };
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
console.log('wrote', OUT, 'rows:', data.rows.length, 'vw:', data.vw, 'total px:', data.scrollTotal.toFixed(0),
  'leg px:', (data.px.connectRest - data.px.inspireRest).toFixed(0));
await browser.close();
