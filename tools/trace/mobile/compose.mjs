// tools/trace/mobile/compose.mjs — QA-ONLY analyzer for the mobile probes
// beside it. Adopted 2026-08-24 (PHONE-01) with the probes; see
// posefield.mjs's header for why this instrument set is kept.
// probe4-compose.mjs — PHONE-01 instrument 4 (new; sibling of probe1).
// Answers "does the equal eye+target truck DELIVER THE SAME PHONE FRAMING the
// target-only pitch-up was authored for?" — the question the fix must not
// lose. Projects the Connect scene's own hub anchors (chapters.connect
// .nodeWorld) plus a ground fan to screen space under three camera variants
// built from the SAME base pose (the 621-wide ablation = phone portrait field
// with the phone-only blocks off):
//   ablate  base pose, no phone Connect offset at all
//   pitch   base.target.y += K            (upstream 1fa145f — target only)
//   truck   base.pos.y += K; base.target.y += K   (the fix — forward.y intact)
// Screen space is the real phone frame: 430x932 CSS px, camera aspect from
// the live renderer, fov from the pose.
// Usage: node probe4-compose.mjs [out.json]
import { createRequire } from 'node:module';
const pw = createRequire(import.meta.url)('playwright-core');
const { chromium } = pw;
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] || new URL((process.env.PHONE_SCRATCH ? process.env.PHONE_SCRATCH + '/' : './out/') + 'compose.json', import.meta.url).pathname;
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal'] });
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
await page.goto(`${BASE}/?steady=1`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled, null, { timeout: 90000, polling: 500 });
await page.waitForTimeout(1500);

const data = await page.evaluate(async () => {
  // These three resolve in the PAGE (importmap + the served tree), not in
  // node. Computed specifiers, like render-report-lib.mjs's, so the static
  // dependency analyser does not try to resolve them from this file and
  // report a cycle-analysis hole for a browser-side import.
  const imp = (spec) => import(spec);
  const T = await imp('three');
  const D = await imp('/journey/director.js');
  const R = await imp('/journey/route.js');
  const J = window.journey;
  const W = innerWidth, H = innerHeight, ASPECT = W / H;
  const K = 0.45 * (() => { const x = Math.min(1, Math.max(0, (430 - 320) / 70)); return x * x * (3 - 2 * x); })();

  // Anchors: the three hubs the owner's chips hang off, plus a ground fan in
  // front of the camera to read the ground band the reveal is about.
  const hubs = ['ados', 'hivemind', 'discord'];
  const anchors = [];
  for (const id of hubs) {
    const v = J.chapters.connect.nodeWorld(id);
    if (v) anchors.push({ name: id, x: v.x, y: v.y, z: v.z });
  }

  const cam = new T.PerspectiveCamera(38, ASPECT, 0.1, 4000);
  const out = { pos: new T.Vector3(), target: new T.Vector3(), fov: 38 };
  const proj = (a) => {
    const v = new T.Vector3(a.x, a.y, a.z).project(cam);
    return { x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H };
  };

  const sample = (p) => {
    // base = the 621-wide ablation: identical portrait field, phone-only
    // blocks off (both of them; Final's is exactly 0 at Connect p anyway).
    D.poseAt(p, out, undefined, ASPECT, 621);
    const base = { px: out.pos.x, py: out.pos.y, pz: out.pos.z, tx: out.target.x, ty: out.target.y, tz: out.target.z, fov: out.fov };
    const variants = {
      ablate: { dPos: 0, dTgt: 0 },
      pitch: { dPos: 0, dTgt: K },
      truck: { dPos: K, dTgt: K },
    };
    const res = {};
    for (const [name, d] of Object.entries(variants)) {
      cam.position.set(base.px, base.py + d.dPos, base.pz);
      cam.fov = base.fov;
      cam.aspect = ASPECT;
      cam.up.set(0, 1, 0);
      cam.lookAt(base.tx, base.ty + d.dTgt, base.tz);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);
      const fwd = new T.Vector3();
      cam.getWorldDirection(fwd);
      // ground horizon: where the camera axis meets y=0, in screen px
      const groundHit = fwd.y < -1e-6
        ? proj({ x: cam.position.x + fwd.x * (-cam.position.y / fwd.y), y: 0, z: cam.position.z + fwd.z * (-cam.position.y / fwd.y) })
        : null;
      res[name] = {
        fwdY: fwd.y,
        gazeDeg: Math.asin(Math.max(-1, Math.min(1, fwd.y))) * 180 / Math.PI,
        camY: cam.position.y,
        anchors: anchors.map((a) => ({ name: a.name, ...proj(a) })),
        groundHit,
      };
    }
    return { p, base, res };
  };

  const rest = R.restProgress('connect');
  const pts = [rest, R.startOf('connect'), 0.43, 0.47, 0.50];
  return { W, H, ASPECT, K, rest, samples: pts.map(sample), anchors };
});

writeFileSync(OUT, JSON.stringify(data, null, 1));
console.log(`compose probe @ ${data.W}x${data.H} aspect=${data.ASPECT.toFixed(4)} K=${data.K.toFixed(4)}`);
for (const s of data.samples) {
  console.log(`\n p=${s.p.toFixed(4)}${s.p === data.rest ? '  (CONNECT REST)' : ''}`);
  for (const v of ['ablate', 'pitch', 'truck']) {
    const r = s.res[v];
    const an = r.anchors.map((a) => `${a.name}=(${a.x.toFixed(0)},${a.y.toFixed(0)})`).join(' ');
    console.log(`   ${v.padEnd(7)} gaze=${r.gazeDeg.toFixed(3)}deg camY=${r.camY.toFixed(3)} horizonY=${r.groundHit ? r.groundHit.y.toFixed(0) : 'n/a'}  ${an}`);
  }
  const p = s.res.pitch, t = s.res.truck, a = s.res.ablate;
  const dy = (u, w) => u.anchors.map((x, i) => (x.y - w.anchors[i].y).toFixed(1)).join('/');
  const dx = (u, w) => u.anchors.map((x, i) => (x.x - w.anchors[i].x).toFixed(1)).join('/');
  console.log(`   framing shift vs ablate (px):  pitch dy=${dy(p, a)} dx=${dx(p, a)}   truck dy=${dy(t, a)} dx=${dx(t, a)}`);
  console.log(`   truck vs pitch (px):           dy=${dy(t, p)} dx=${dx(t, p)}   gaze ${p.gazeDeg.toFixed(3)} -> ${t.gazeDeg.toFixed(3)} deg`);
}
await browser.close();
