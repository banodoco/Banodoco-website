// tools/trace/ipad-nudge-sweep.mjs — QA-ONLY. Nothing imports it.
//
// IPAD-NUDGE (2026-08-25). "The mushroom should be maybe 30 px to the right on
// iPad Mini horizontal" — converted from screen pixels into the field's own
// units, and MEASURED rather than assumed.
//
// The instrument that owns a horizontal Mission shift is MISSION_RIGHT_PX in
// journey/boot/hero-mode.js: a per-mode SCREEN-PIXEL truck that viewFor()
// converts through the active projection
//
//     worldPerPixel = 2 * camZ * tan(fov/2) / innerHeight
//     v.panX -= missionShiftPx * worldPerPixel
//
// panX moves camera x and target x together, so it is a TRUCK — the frame
// slides, parallax is preserved, gaze direction is unchanged. (A `tgtRight`-
// style target-only re-aim would be a yaw: it rotates the world past the
// subject and changes the composition's geometry, not its framing. For "the
// subject should sit further right", the truck is the honest one.)
//
// This probe does NOT edit hero-mode.js. It reproduces that exact arithmetic
// on the LIVE per-mode heroPose the director captured, so the conversion it
// reports is the projection the page is actually running — the two things the
// brief asks be kept apart, pixels and world units, measured at the same time.
//
// It sweeps p as well as the rest, because a Mission-boundary truck is a
// boundary condition the whole arrival leg departs from: a candidate that
// moves the landing and warps the approach is not the same as one that
// decays cleanly into the analytic Inspire rest.
//
// D118: this file IS the invocation. Read its exit code from the process you
// spawned, never from a backgrounded wrapper.
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] || (process.env.IPAD_SCRATCH
  ? `${process.env.IPAD_SCRATCH}/ipad-nudge-sweep.json`
  : new URL('./out/ipad-nudge-sweep.json', import.meta.url).pathname);
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const CANDIDATES = [0, 20, 30, 40, 60, 80];

const VIEWS = [
  { id: 'ipadmini5', w: 1024, h: 768 },
  { id: 'ipadmini5safari', w: 1024, h: 704 },
  { id: 'ipadmini6', w: 1133, h: 744 },
  { id: 'ipadair', w: 1180, h: 820 },
  // The getMode() cliff pair: one pixel of viewport height apart, on opposite
  // sides of the aspect-1.55 deskNarrow/desktop boundary. Both are reachable
  // on the SAME iPad Mini 6 — full-bleed is 1133x744 (1.523, deskNarrow) and
  // Safari with its toolbars is ~1133x680 (1.666, desktop).
  { id: 'cliff-below', w: 1133, h: 731 },
  { id: 'cliff-above', w: 1133, h: 730 },
  { id: 'desktop1440', w: 1440, h: 900 },
];

const browser = await chromium.launch({
  executablePath: CHROME, headless: true, args: ['--use-angle=metal'],
});

const all = [];
for (const V of VIEWS) {
  const page = await browser.newPage({ viewport: { width: V.w, height: V.h } });
  await page.goto(`${BASE}/?steady=1&nointro=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.journey && window.journey.director,
    null, { timeout: 90000, polling: 250 });
  await page.waitForTimeout(1200);

  const row = await page.evaluate(async (CANDS) => {
    // Computed specifiers, like posefield.mjs's — see ipad-cliff.mjs.
    const imp = (s) => import(s);
    const T = await imp('three');
    const D = await imp('/journey/director.js');
    const A = await imp('/journey/anatomy.js');
    const R = await imp('/journey/route.js');
    const VW = innerWidth, VH = innerHeight, ASPECT = VW / VH;
    const HALFW = VW / 2;
    const live = window.journey.director.heroPose;

    // hero-mode.js's own conversion, on the live composition.
    const camZ = Math.hypot(Math.sin(live.az) * live.r - live.target.x,
      Math.cos(live.az) * live.r - live.target.z);
    const worldPerPixel = 2 * camZ * Math.tan(live.fov * Math.PI / 360) / VH;

    // The truck: panX -= px * wpp moves camera x AND target x by the same
    // amount, so a POSITIVE px pushes the subject RIGHT on screen.
    function heroTrucked(px) {
      const d = -px * worldPerPixel;
      const cx = Math.sin(live.az) * live.r + d;
      const cz = Math.cos(live.az) * live.r;
      return {
        az: Math.atan2(cx, cz), r: Math.hypot(cx, cz), y: live.y, fov: live.fov,
        target: new T.Vector3(live.target.x + d, live.target.y, live.target.z),
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
    const pose = { pos: new T.Vector3(), target: new T.Vector3(), fov: 38 };

    function frame(p, hero) {
      D.poseAt(p, pose, hero, ASPECT, VW);
      const f = { x: pose.target.x - pose.pos.x, y: pose.target.y - pose.pos.y, z: pose.target.z - pose.pos.z };
      const fl = Math.hypot(f.x, f.y, f.z); f.x /= fl; f.y /= fl; f.z /= fl;
      const rt = { x: -f.z, y: 0, z: f.x };
      const rl = Math.hypot(rt.x, rt.z) || 1; rt.x /= rl; rt.z /= rl;
      const TAN = Math.tan(0.5 * pose.fov * Math.PI / 180);
      let cx0 = Infinity, cx1 = -Infinity, ox0 = Infinity, ox1 = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const q = asXYZ(pts[i]);
        const rel = { x: q.x - pose.pos.x, y: q.y - pose.pos.y, z: q.z - pose.pos.z };
        const zz = rel.x * f.x + rel.y * f.y + rel.z * f.z;
        if (zz <= 0.001) continue;
        const xr = rel.x * rt.x + rel.y * rt.y + rel.z * rt.z;
        const sx = HALFW + (xr / (zz * TAN * ASPECT)) * HALFW;
        if (i < capN) { if (sx < cx0) cx0 = sx; if (sx > cx1) cx1 = sx; }
        if (sx < ox0) ox0 = sx; if (sx > ox1) ox1 = sx;
      }
      return { capMid: (cx0 + cx1) / 2, orgLo: ox0, orgHi: ox1 };
    }

    // headline ink (union of text-node client rects; the <h1> box is the wrap
    // column, not the glyphs)
    let inkR = -Infinity;
    {
      const el = document.querySelector('h1');
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const b of rg.getClientRects()) if (b.width && b.right > inkR) inkR = b.right;
      }
    }

    const PS = [0, 0.01, 0.02, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24, R.restProgress('inspire')];
    const base = PS.map((p) => frame(p, live));
    const cands = CANDS.map((px) => {
      const h = heroTrucked(px);
      const s = PS.map((p) => frame(p, h));
      return {
        px,
        world: +(px * worldPerPixel).toFixed(5),
        deltaAtMission: +(s[0].capMid - base[0].capMid).toFixed(2),
        capMid: +s[0].capMid.toFixed(1),
        capMidFrac: +(s[0].capMid / VW).toFixed(4),
        orgLo: +s[0].orgLo.toFixed(1),
        inkClearance: +(s[0].orgLo - inkR).toFixed(1),
        alongLeg: s.map((v, i) => +(v.capMid - base[i].capMid).toFixed(2)),
      };
    });

    return {
      VW, VH, aspect: +ASPECT.toFixed(4),
      mode: [...document.body.classList].filter((c) => c.startsWith('mode-'))[0],
      camZ: +camZ.toFixed(4), fov: live.fov,
      worldPerPixel: +worldPerPixel.toFixed(6),
      pxPerWorld: +(1 / worldPerPixel).toFixed(3),
      inkR: +inkR.toFixed(1),
      ps: PS.map((p) => +p.toFixed(4)),
      cands,
    };
  }, CANDIDATES);

  row.id = V.id;
  all.push(row);
  console.log(`\n=== ${V.id}  ${V.w}x${V.h}  a=${row.aspect}  ${row.mode}  camZ ${row.camZ}  fov ${row.fov}`);
  console.log(`    1 world unit = ${row.pxPerWorld} px   |   1 px = ${row.worldPerPixel} u   |   headline ink ends x=${row.inkR}`);
  console.log('    ask_px   world_u   actual_dx_px   capMid    %frame   org_left   ink_clearance   dx at p=[' + row.ps.join(' ') + ']');
  for (const c of row.cands) {
    console.log(
      `    ${String(c.px).padStart(6)} ${String(c.world).padStart(9)} ${String(c.deltaAtMission).padStart(14)} ` +
      `${String(c.capMid).padStart(8)} ${(c.capMidFrac * 100).toFixed(1).padStart(8)}% ${String(c.orgLo).padStart(10)} ` +
      `${String(c.inkClearance).padStart(15)}   [${c.alongLeg.join(' ')}]`,
    );
  }
  await page.close();
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(all, null, 1));
console.log(`\nwrote ${OUT}`);
await browser.close();
