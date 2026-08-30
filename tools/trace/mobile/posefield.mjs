// tools/trace/mobile/posefield.mjs — QA-ONLY. Nothing imports it; run it by hand.
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
// probe1-posefield.mjs — MOBILE-OBSERVE instrument 1.
// Samples the PURE camera pose function poseAt(p, out, hero, aspect, width)
// straight from the shipped module (no scrolling, no clock), for four
// compositions, across the Inspire->Connect leg and its shoulders.
//
// Configs:
//   desktop      aspect 1.6      width 1440   (landscape reference)
//   phone430     aspect 430/932  width 430    (the goldens' phone, WITH the
//                                              1fa145f phone-only Connect pitch-up)
//   phone375     aspect 375/812  width 375
//   p430-nopitch aspect 430/932  width 621    (ablation: same portrait field,
//                                              the `viewportWidth <= 620` blocks
//                                              in portrait.js do not apply)
//
// Output: JSON rows {p, pos, target, fov, fwdY, gazeDeg, resolve} per config,
// plus route landmarks. Derivatives are computed downstream (analyze1).
//
// GAZE_HI/GAZE_LO restated from journey/chapters/connect/index.js:408-409
// (module-local consts, not exported); cited, not invented.
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT = process.argv[2] || (process.env.PHONE_SCRATCH
  ? `${process.env.PHONE_SCRATCH}/posefield.json`
  : new URL('./out/posefield.json', import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// ?capture freezes the clock; we only need the module graph + importmap.
await page.goto(`${BASE}/?capture=0.26&steady=1`, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(4000); // let boot settle; poseAt is pure regardless

const data = await page.evaluate(async () => {
  // These three resolve in the PAGE (importmap + the served tree), not in
  // node. Computed specifiers, like render-report-lib.mjs's, so the static
  // dependency analyser does not try to resolve them from this file and
  // report a cycle-analysis hole for a browser-side import.
  const imp = (spec) => import(spec);
  const T = await imp('three');
  const D = await imp('/journey/director.js');
  const R = await imp('/journey/route.js');
  const GAZE_HI = -0.0209, GAZE_LO = -0.1253; // connect/index.js:408
  const s01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const configs = {
    desktop: { aspect: 1.6, width: 1440 },
    phone430: { aspect: 430 / 932, width: 430 },
    phone375: { aspect: 375 / 812, width: 375 },
    'p430-nopitch': { aspect: 430 / 932, width: 621 },
  };
  const P0 = 0.20, P1 = 0.64, DP = 0.0004;
  const out = { pos: new T.Vector3(), target: new T.Vector3(), fov: 38 };
  const rows = {};
  for (const [name, c] of Object.entries(configs)) {
    const list = [];
    for (let p = P0; p <= P1 + 1e-9; p += DP) {
      D.poseAt(p, out, undefined, c.aspect, c.width);
      const fx = out.target.x - out.pos.x, fy = out.target.y - out.pos.y, fz = out.target.z - out.pos.z;
      const fl = Math.hypot(fx, fy, fz);
      const fwdY = fy / fl;
      list.push({
        p: +p.toFixed(6),
        pos: [out.pos.x, out.pos.y, out.pos.z],
        tgt: [out.target.x, out.target.y, out.target.z],
        fov: out.fov,
        fwdY,
        gazeDeg: Math.asin(Math.max(-1, Math.min(1, fwdY))) * 180 / Math.PI,
        resolve: s01((fwdY - GAZE_HI) / (GAZE_LO - GAZE_HI)),
      });
    }
    rows[name] = list;
  }
  return {
    landmarks: {
      inspireRest: R.restProgress('inspire'),
      connectStart: R.startOf('connect'),
      connectRest: R.restProgress('connect'),
      connectEnd: R.endOf('connect'),
      ownedStart: R.startOf('owned'),
      midLegKey: R.restProgress('inspire') + 0.652 * (R.restProgress('connect') - R.restProgress('inspire')),
    },
    rows,
  };
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data));
console.log('wrote', OUT, 'configs:', Object.keys(data.rows).join(','),
  'samples/config:', data.rows.desktop.length);
await browser.close();
// D118 discipline: this file IS the invocation; exit code comes from node itself.
void spawnSync;
