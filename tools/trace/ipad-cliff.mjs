// tools/trace/ipad-cliff.mjs — QA-ONLY. Nothing imports it; run it by hand.
//
// IPAD-NUDGE (2026-08-25), companion to ipad-land.mjs. Two questions that
// probe could not answer:
//
//  1. THE COPY COLLISION. Where does the headline's ink actually sit relative
//     to the organism's silhouette at each viewport? A box rect is not the
//     answer — an <h1> box carries the wrap column, not the glyphs. This
//     walks the text nodes with a Range and takes the union of the client
//     rects, which is the ink.
//  2. THE MODE CLIFF. journey/boot/hero-mode.js's getMode() switches
//     `deskNarrow` -> `desktop` at aspect 1.55, and viewFor() interpolates
//     panX/camZ only INSIDE deskNarrow. Nothing makes the two meet at the
//     boundary. This resizes one live page across the boundary and reads the
//     shipped composition on both sides.
//
// EVERY SIZE GETS A FRESH DOCUMENT, and that is not caution — the first draft
// resized one live page and its deskNarrow rows were wrong by 41-121 px.
// Why: main.js's resize handler calls sceneApi.setView(), and while the
// journey is UN-OWNED that reaches rawSetView, which eases the real camera
// but never calls director.captureHero(). So `director.heroPose` — the pure
// pose function's viewport-dependent input — stays at the mode the page
// BOOTED in. Production is unaffected (setOwned(true) captures from the live
// camera on the first scroll, director.js:397), but a probe that reads
// heroPose after a resize is reading the previous viewport's composition.
//
// D118: this file IS the invocation. Read its exit code from the process you
// spawned, never from a backgrounded wrapper.
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] || (process.env.IPAD_SCRATCH
  ? `${process.env.IPAD_SCRATCH}/ipad-cliff.json`
  : new URL('./out/ipad-cliff.json', import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const browser = await chromium.launch({
  executablePath: CHROME, headless: true, args: ['--use-angle=metal'],
});

async function open(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${BASE}/?steady=1&nointro=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(
    () => window.journey && window.journey.director, null, { timeout: 90000, polling: 250 },
  );
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    // Computed specifiers, like posefield.mjs's: these resolve in the PAGE
    // (importmap + the served tree), and spelling them as literals makes the
    // static dependency analyser try to resolve them FROM THIS FILE and
    // report four cycle-analysis holes (measured — it did).
    const imp = (s) => import(s);
    const T = await imp('three');
    const D = await imp('/journey/director.js');
    const A = await imp('/journey/anatomy.js');
    window.__ipad = { T, D, A };
  });
  return page;
}

async function sample(page) {
  return page.evaluate(() => {
    const { T, D, A } = window.__ipad;
    const VW = innerWidth, VH = innerHeight, ASPECT = VW / VH;
    const HALFW = VW / 2, HALFH = VH / 2;
    const hero = window.journey.director.heroPose;
    const pose = { pos: new T.Vector3(), target: new T.Vector3(), fov: 38 };
    D.poseAt(0, pose, hero, ASPECT, VW);

    const f = { x: pose.target.x - pose.pos.x, y: pose.target.y - pose.pos.y, z: pose.target.z - pose.pos.z };
    const fl = Math.hypot(f.x, f.y, f.z); f.x /= fl; f.y /= fl; f.z /= fl;
    const rt = { x: -f.z, y: 0, z: f.x };
    const rl = Math.hypot(rt.x, rt.z) || 1; rt.x /= rl; rt.z /= rl;
    const up = {
      x: rt.y * f.z - rt.z * f.y, y: rt.z * f.x - rt.x * f.z, z: rt.x * f.y - rt.y * f.x,
    };
    const TAN = Math.tan(0.5 * pose.fov * Math.PI / 180);
    // screen px, ORIGIN TOP-LEFT — the same frame getBoundingClientRect uses,
    // so organism and ink are directly comparable without a mental flip.
    function proj(pt) {
      const rel = { x: pt.x - pose.pos.x, y: pt.y - pose.pos.y, z: pt.z - pose.pos.z };
      const zz = rel.x * f.x + rel.y * f.y + rel.z * f.z;
      if (zz <= 0.001) return null;
      const xr = rel.x * rt.x + rel.y * rt.y + rel.z * rt.z;
      const yr = rel.x * up.x + rel.y * up.y + rel.z * up.z;
      return {
        x: HALFW + (xr / (zz * TAN * ASPECT)) * HALFW,
        y: HALFH - (yr / (zz * TAN)) * HALFH,
      };
    }
    const pts = [];
    for (let ai = 0; ai < 96; ai++) {
      const a = (ai / 96) * Math.PI * 2;
      for (const u of [0, 0.25, 0.5, 0.75, 0.9, 1]) { pts.push(A.capTopPt(u, a)); pts.push(A.capUnderPt(u, a)); }
    }
    const capN = pts.length;
    for (let i = 0; i <= 40; i++) {
      const y = (i / 40) * A.STEM_TOP;
      const [sx, sz] = A.stemAxis(y); const r = A.stemRadius(y);
      for (let ai = 0; ai < 24; ai++) {
        const a = (ai / 24) * Math.PI * 2;
        pts.push({ x: sx + Math.cos(a) * r, y, z: sz + Math.sin(a) * r });
      }
    }
    const asXYZ = (q) => (Array.isArray(q) ? { x: q[0], y: q[1], z: q[2] } : q);
    const box = (from, to) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = from; i < to; i++) {
        const s = proj(asXYZ(pts[i])); if (!s) continue;
        if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x;
        if (s.y < y0) y0 = s.y; if (s.y > y1) y1 = s.y;
      }
      return { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1) };
    };
    const cap = box(0, capN), org = box(0, pts.length);

    // headline INK, not the wrap column
    function ink(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, any = false;
      let n;
      while ((n = w.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const b of r.getClientRects()) {
          if (b.width === 0 || b.height === 0) continue;
          any = true;
          if (b.left < x0) x0 = b.left; if (b.right > x1) x1 = b.right;
          if (b.top < y0) y0 = b.top; if (b.bottom > y1) y1 = b.bottom;
        }
      }
      return any ? { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1) } : null;
    }
    const h1 = ink('h1');
    const sub = ink('h1 + p') || ink('.hero-sub') || ink('header p');

    const overlap = (a, b) => {
      if (!a || !b) return null;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      return { x: +ox.toFixed(1), y: +oy.toFixed(1), collides: ox > 0 && oy > 0 };
    };

    // Is the pure pose at p=0 the pose actually on screen? If these disagree
    // the row is measuring a stale heroPose, not the shipped composition.
    const live = window.sceneApi && window.sceneApi.camera;
    const heroDrift = live
      ? +Math.hypot(live.position.x - pose.pos.x, live.position.y - pose.pos.y,
        live.position.z - pose.pos.z).toFixed(4)
      : null;

    return {
      VW, VH, aspect: +ASPECT.toFixed(4),
      heroDrift,
      mode: [...document.body.classList].filter((c) => c.startsWith('mode-'))[0],
      panXish: +pose.target.x.toFixed(4), camZ: +Math.hypot(pose.pos.x - pose.target.x, pose.pos.z - pose.target.z).toFixed(4),
      fov: pose.fov,
      cap, org,
      capMidX: +((cap.x0 + cap.x1) / 2).toFixed(1),
      capMidFrac: +(((cap.x0 + cap.x1) / 2) / VW).toFixed(4),
      orgMidFrac: +(((org.x0 + org.x1) / 2) / VW).toFixed(4),
      leftGap: +org.x0.toFixed(1), rightGap: +(VW - org.x1).toFixed(1),
      h1, sub,
      h1VsOrg: overlap(h1, org), h1VsCap: overlap(h1, cap),
      subVsOrg: overlap(sub, org),
    };
  });
}

const rows = [];
const SIZES = [
  [1440, 900], [1280, 800], [1180, 820], [1133, 744], [1024, 768], [1024, 704],
  // walk the getMode() cliff at aspect 1.55, width held at 1133
  [1133, 736], [1133, 732], [1133, 731], [1133, 730], [1133, 728], [1133, 720], [1133, 680],
  // walk the OTHER deskNarrow edge at aspect 1.25
  [1024, 830], [1024, 820], [1024, 819], [1024, 818], [1024, 810],
];
for (const [w, h] of SIZES) {
  const page = await open(w, h);
  const r = await sample(page);
  await page.close();
  rows.push(r);
  console.log(
    `${String(w).padStart(4)}x${String(h).padEnd(4)} a=${r.aspect.toFixed(4)} ${String(r.mode).padEnd(14)} drift ${String(r.heroDrift).padStart(6)} ` +
    `capMid ${String(r.capMidX).padStart(7)} (${(r.capMidFrac * 100).toFixed(1)}% of frame)  ` +
    `org ${String(r.org.x0).padStart(7)}..${String(r.org.x1).padEnd(7)}  ` +
    `h1ink ..${String(r.h1 ? r.h1.x1 : '-').padStart(6)}  ` +
    `h1/org overlap x=${r.h1VsOrg ? r.h1VsOrg.x : '-'} y=${r.h1VsOrg ? r.h1VsOrg.y : '-'} ${r.h1VsOrg && r.h1VsOrg.collides ? 'COLLIDES' : ''}`,
  );
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(rows, null, 1));
console.log(`\nwrote ${OUT}`);
await browser.close();
