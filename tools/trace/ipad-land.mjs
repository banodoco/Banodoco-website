// tools/trace/ipad-land.mjs — QA-ONLY. Nothing imports it; run it by hand.
//
// IPAD-NUDGE (2026-08-25). The first instrument in this repository that looks
// at LANDSCAPE TABLET. Everything measured before it was 1440x900 / 1280x800
// desktop, 430x932 / 375x812 / 412x915 phones, 768x1024 tablet PORTRAIT, and
// the 620x1000 / 600x700 band edges. iPad-class landscape (aspect 1.25-1.55,
// journey/boot/hero-mode.js's `deskNarrow` mode) had never been sampled.
//
// It samples the SHIPPED composition — the live `heroPose` the director
// captured for the viewport's own mode, fed back through the pure
// `poseAt(p, out, hero, aspect, width)` — and projects the hero organism's
// silhouette to screen space. No scrolling, no clock: poseAt is pure, and the
// hero capture is the only viewport-dependent input, which is exactly the
// thing desktop-only probes get wrong at deskNarrow (they use the authored
// desktop HERO and so cannot see the mode at all).
//
// Projection is the one sweep2.mjs used (a5b evidence), restated rather than
// re-derived: x_px = (rel.right) / (rel.fwd * tan(fov/2) * aspect) * (W/2).
// Note the identity that falls out of it — with a VERTICAL fov, screen-x in
// pixels depends on viewport HEIGHT, not on aspect. Cross-checked in-page
// against three.js's own project() at p=0; the check is printed.
//
// D118: this file IS the invocation. Read its exit code from the process you
// spawned, never from a backgrounded wrapper, and never via `timeout` (which
// does not exist on macOS and returns 127).
//
// Usage: node tools/trace/ipad-land.mjs [outfile]
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] || (process.env.IPAD_SCRATCH
  ? `${process.env.IPAD_SCRATCH}/ipad-land.json`
  : new URL('./out/ipad-land.json', import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

// Viewport classes. The four iPad rows are the ask; the desktop and phone and
// tablet-portrait rows are the leakage controls.
const VIEWS = [
  { id: 'desktop1440', w: 1440, h: 900, note: 'golden desktop' },
  { id: 'desktop1280', w: 1280, h: 800, note: 'second desktop' },
  { id: 'ipadmini5', w: 1024, h: 768, note: 'iPad Mini 1-5 landscape, full-bleed' },
  { id: 'ipadmini5safari', w: 1024, h: 704, note: 'iPad Mini 1-5 landscape, Safari chrome' },
  { id: 'ipadmini6', w: 1133, h: 744, note: 'iPad Mini 6/7 landscape, full-bleed' },
  { id: 'ipadmini6safari', w: 1133, h: 680, note: 'iPad Mini 6/7 landscape, Safari chrome' },
  { id: 'ipadair', w: 1180, h: 820, note: 'iPad Air 11 landscape' },
  { id: 'tabletport', w: 768, h: 1024, note: 'tablet portrait' },
  { id: 'phone430', w: 430, h: 932, note: 'golden phone' },
];

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal'],
});

const results = [];
for (const V of VIEWS) {
  const page = await browser.newPage({ viewport: { width: V.w, height: V.h } });
  await page.goto(`${BASE}/?steady=1&nointro=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(
    () => window.journey && window.journey.director && window.journey.scroll,
    null, { timeout: 90000, polling: 250 },
  );
  await page.waitForTimeout(1200);

  const row = await page.evaluate(async () => {
    const imp = (s) => import(s);
    const T = await imp('three');
    const D = await imp('/journey/director.js');
    const A = await imp('/journey/anatomy.js');
    const R = await imp('/journey/route.js');

    const VW = innerWidth, VH = innerHeight;
    const ASPECT = VW / VH, HALFW = VW / 2;
    const hero = window.journey.director.heroPose;

    // --- the hero organism's silhouette, as world points ---------------
    const pts = [];
    for (let ai = 0; ai < 96; ai++) {
      const a = (ai / 96) * Math.PI * 2;
      for (const u of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
        pts.push(A.capTopPt(u, a));
        pts.push(A.capUnderPt(u, a));
      }
    }
    const capPts = pts.slice();
    const stemPts = [];
    for (let i = 0; i <= 40; i++) {
      const y = (i / 40) * A.STEM_TOP;
      const [sx, sz] = A.stemAxis(y);
      const r = A.stemRadius(y);
      for (let ai = 0; ai < 24; ai++) {
        const a = (ai / 24) * Math.PI * 2;
        stemPts.push({ x: sx + Math.cos(a) * r, y, z: sz + Math.sin(a) * r });
      }
    }
    const asXYZ = (q) => (Array.isArray(q) ? { x: q[0], y: q[1], z: q[2] } : q);

    const pose = { pos: new T.Vector3(), target: new T.Vector3(), fov: 38 };
    function project(pt, ps) {
      const f = { x: ps.target.x - ps.pos.x, y: ps.target.y - ps.pos.y, z: ps.target.z - ps.pos.z };
      const fl = Math.hypot(f.x, f.y, f.z); f.x /= fl; f.y /= fl; f.z /= fl;
      const rt = { x: -f.z, y: 0, z: f.x };
      const rl = Math.hypot(rt.x, rt.z) || 1; rt.x /= rl; rt.z /= rl;
      const rel = { x: pt.x - ps.pos.x, y: pt.y - ps.pos.y, z: pt.z - ps.pos.z };
      const zz = rel.x * f.x + rel.y * f.y + rel.z * f.z;
      if (zz <= 0.001) return null;
      const xr = rel.x * rt.x + rel.y * rt.y + rel.z * rt.z;
      return (xr / (zz * Math.tan(0.5 * ps.fov * Math.PI / 180) * ASPECT)) * HALFW;
    }
    function extent(list, ps) {
      let lo = Infinity, hi = -Infinity;
      for (const q of list) {
        const x = project(asXYZ(q), ps);
        if (x === null) continue;
        if (x < lo) lo = x; if (x > hi) hi = x;
      }
      return { lo, hi, mid: (lo + hi) / 2 };
    }

    // --- sample the route ----------------------------------------------
    const SAMPLES = [];
    const named = { mission: 0, inspire: R.restProgress('inspire'), connect: R.restProgress('connect') };
    for (let i = 0; i <= 120; i++) SAMPLES.push(i / 120 * 0.5230);
    for (const v of Object.values(named)) SAMPLES.push(v);
    SAMPLES.sort((a, b) => a - b);

    const series = [];
    for (const p of SAMPLES) {
      D.poseAt(p, pose, hero, ASPECT, VW);
      const cap = extent(capPts, pose);
      const org = extent(capPts.concat(stemPts), pose);
      series.push({
        p: +p.toFixed(5), fov: +pose.fov.toFixed(4),
        capMid: +cap.mid.toFixed(2), capLo: +cap.lo.toFixed(2), capHi: +cap.hi.toFixed(2),
        orgMid: +org.mid.toFixed(2), orgLo: +org.lo.toFixed(2), orgHi: +org.hi.toFixed(2),
      });
    }

    // --- three.js cross-check at p = 0 ----------------------------------
    D.poseAt(0, pose, hero, ASPECT, VW);
    const cam = new T.PerspectiveCamera(pose.fov, ASPECT, 0.1, 100);
    cam.position.copy(pose.pos); cam.up.set(0, 1, 0); cam.lookAt(pose.target);
    cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    const probe = new T.Vector3(A.CAP_THROAT.x, A.CAP_THROAT.y, A.CAP_THROAT.z);
    const three = probe.clone().project(cam).x * HALFW;
    const mine = project(A.CAP_THROAT, pose);

    // --- what the DOM is doing at this size -----------------------------
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    };
    const dom = {
      mode: [...document.body.classList].filter((c) => c.startsWith('mode-')),
      heroCopy: rect('.hero-copy') || rect('#hero-copy') || rect('header .copy'),
      h1: rect('h1'),
      nav: rect('nav'),
      callouts: ['co-inspire', 'co-equip', 'co-connect'].map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          id, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
          opacity: cs.opacity, display: cs.display, visibility: cs.visibility,
        };
      }),
      cta: rect('.hero-cta') || rect('.cta'),
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };

    return {
      VW, VH, aspect: +ASPECT.toFixed(4),
      hero: {
        az: +hero.az.toFixed(5), r: +hero.r.toFixed(4), y: +hero.y.toFixed(4),
        target: [+hero.target.x.toFixed(4), +hero.target.y.toFixed(4), +hero.target.z.toFixed(4)],
        fov: hero.fov,
      },
      crosscheck: { three: +three.toFixed(4), mine: +mine.toFixed(4), delta: +(three - mine).toFixed(6) },
      named: Object.fromEntries(Object.entries(named).map(([k, v]) => [k, +v.toFixed(5)])),
      dom, series,
    };
  });

  row.id = V.id; row.note = V.note;
  results.push(row);
  const at = (p) => row.series.reduce((b, s) => (Math.abs(s.p - p) < Math.abs(b.p - p) ? s : b));
  const m = at(0), i = at(row.named.inspire);
  console.log(
    `${V.id.padEnd(16)} ${String(V.w).padStart(4)}x${String(V.h).padEnd(4)} ` +
    `a=${row.aspect.toFixed(3)} ${row.dom.mode.join(',').padEnd(14)} ` +
    `mission capMid ${m.capMid.toFixed(1).padStart(8)} px  org ${m.orgLo.toFixed(0).padStart(6)}..${m.orgHi.toFixed(0).padStart(6)}  ` +
    `| inspire capMid ${i.capMid.toFixed(1).padStart(8)}  xchk ${row.crosscheck.delta}`,
  );
  await page.close();
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(`\nwrote ${OUT}`);
await browser.close();
