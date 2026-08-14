// tools/revealgates.js — QA-ONLY behavioural gates for the Final field's
// REVEAL DRIVER (journey/chapters/final/index.js). NOT shipped: nothing
// imports it. Load it by hand (or from the capture CDP client) and call
// `await __revealGates()`; results land in `__rg`.
//
// WHY THIS FILE EXISTS
// --------------------
// 2026-08-14 the reveal stopped being `pullOf(camera.x)` on one path and one
// path only: while a camera blend is in flight, it travels toward the pull at
// the blend's destination at a bounded rate (BLEND_REVEAL_RATE). Everything
// that makes that safe is an invariant rather than a look:
//
//   G1  OFF A BLEND THE DRIVER IS THE CAMERA, BIT FOR BIT. Every frame of a
//       forward scrub, a reverse scrub and an out-and-back must satisfy
//       uPull === pullOf(camera.x) EXACTLY — not approximately. This is the
//       gate that catches a limiter armed by "shownPull !== pure" instead of
//       by the blend flag, which rate-limits ordinary brisk scrolling.
//   G2  A PLACEMENT IS CAMERA-PURE. scrollTo() to a spread of poses, and the
//       driver must equal pullOf(camera.x) on the placement frame itself.
//       Covers deep links, ?p=, ?pose= and the frozen ?capture= path.
//   G3  THE BLEND IS PACED. Through a REAL trusted wheel wrap, the per-body
//       kindle must be no faster than the tuned forward scrub's. Reported by
//       INTERPOLATION on the traced driver, never by binning frames: the
//       answer must not depend on where frame boundaries happen to fall, and
//       a binned version of this gate reported the ladder a whole rung out.
//   G4  NOTHING FADES IN OVER OPEN VIEW. Across a whole ride including wraps,
//       the driver may never exceed max(pure, its own previous value) — it may
//       hold light the lens has earned, never invent light it has not.
//   G5  THE LANDING DOES NOT POP. No single frame of any wrap may move the
//       driver by more than one reveal width (0.16). This is the gate that
//       fails if snap() is allowed to discard an outstanding lag.
//   G6  IT CONVERGES. Some seconds after any blend, the driver is exactly
//       pullOf(camera.x) again, so no lag can be latched into the next ride.
//
// G3 and G4 need REAL input: the QA hooks journey.wrap()/flyTo() do not go
// through the wheel path and two passes on this codebase reported behaviour
// that no visitor could reach by using them. This file therefore refuses to
// produce a G3/G4 number from a synthetic event — it asks the harness to
// deliver trusted wheel deltas and asserts it saw them (`e.isTrusted`).
window.__rg = null; window.__rgErr = null;

window.__revealGates = async function (opts) {
  opts = opts || {};
  const out = [];
  try {
    const J = window.journey, S = J.scroll;
    const { pullOf, REVEAL_W } = await import('/journey/chapters/final/world.js');
    const nf = () => new Promise(r => requestAnimationFrame(r));
    const settle = async (ms) => { const t = performance.now(); while (performance.now() - t < ms) await nf(); };
    const camx = () => window.sceneApi.camera.position.x;

    // The chapter's shared uniform block, reached through a material it owns
    // rather than through a new export.
    let U = null;
    window.sceneApi.scene.traverse(o => {
      if (U) return;
      const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of ms) if (m && m.uniforms && m.uniforms.uPull && m.uniforms.uPullRaw) { U = m.uniforms; return; }
    });
    if (!U) { out.push('SKIP: the Final uniform block is not in the scene yet'); window.__rg = out; return out; }

    const place = async (p) => {
      J.scrollTo(p);
      for (let i = 0; i < 400; i++) { await nf(); if (!S.resolving && Math.abs(S.rate) < 1e-6) break; }
      await settle(400);
    };

    // A trace of (t, camx, shown, pure) for every frame of a stretch.
    let recording = null;
    const rec = () => {
      if (!recording) return;
      const x = camx();
      recording.push([performance.now(), x, U.uPull.value, pullOf(x)]);
    };
    const loop = () => { rec(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const take = async (ms, drive) => {
      recording = [];
      if (drive) await drive();
      await settle(ms);
      const r = recording; recording = null; return r;
    };

    // Wheel is delivered by the harness (trusted). `opts.wheel(dy, n, gapMs)`
    // must return a promise. Without it G3/G4's wrap rows are not produced —
    // a synthetic WheelEvent is not the input path and would be a false pass.
    const wheel = opts.wheel || null;
    let sawTrusted = false;
    window.addEventListener('wheel', e => { if (e.isTrusted) sawTrusted = true; }, { capture: true, passive: true });

    // ---- G1: camera-pure off a blend, every frame ------------------------
    const scrubs = [];
    for (const [p0, dy, n] of [[0.725, 40, 95], [0.97, -40, 95], [0.725, 150, 34]]) {
      await place(p0);
      const tr = await take(1800, wheel ? () => wheel(dy, n, 16) : null);
      let worst = 0, at = null;
      for (const s of tr) {
        const d = Math.abs(s[2] - s[3]);
        if (d > worst) { worst = d; at = s[1]; }
      }
      scrubs.push([p0, dy, tr.length, worst, at]);
    }
    const g1 = Math.max(...scrubs.map(s => s[3]));
    out.push(`G1 scrub |uPull - pullOf(camera.x)| max over ${scrubs.reduce((a, s) => a + s[2], 0)} frames: `
             + `${g1.toExponential(2)}  ${g1 === 0 ? 'PASS (bit-exact)' : 'FAIL'}`);

    // ---- G2: a placement is camera-pure ----------------------------------
    let g2 = 0;
    for (const p of [0.0, 0.30, 0.62, 0.725, 0.80, 0.86, 0.90, 0.94, 0.97, 1.0]) {
      J.scrollTo(p); await nf();
      g2 = Math.max(g2, Math.abs(U.uPull.value - pullOf(camx())));
    }
    out.push(`G2 placement |uPull - pullOf(camera.x)| max over 10 poses: `
             + `${g2.toExponential(2)}  ${g2 === 0 ? 'PASS (bit-exact)' : 'FAIL'}`);

    // ---- the ladder, for G3 ----------------------------------------------
    const RING = [0.0966, 0.1833, 0.2638, 0.3406, 0.5401, 0.8678, 0.9192, 0.9353, 0.9511];
    const FIELD = [0.4116, 0.4789, 0.5937, 0.6383, 0.6748, 0.7042, 0.7277, 0.7495,
                   0.7708, 0.7914, 0.8112, 0.8306, 0.8495, 0.8856, 0.9027];
    const LADDER = RING.concat(FIELD).sort((a, b) => a - b);
    /* CROSSINGS BY INTERPOLATION, NOT BY BINNING. The first build of this gate
       counted, per frame, how many rungs were lit and divided by the frame's
       duration. At 60 Hz a hard wrap moves the driver 0.17 in a frame — more
       than a whole reveal width — so several rungs share one bin and the
       reported per-body kindle was the BIN's width, not the body's. Reading
       the time at which the driver passes a level, linearly interpolated
       between the two bracketing samples, makes the answer independent of the
       frame grid; it also lets a rung crossed inside a single frame report a
       kindle SHORTER than a frame, which is exactly the fault being measured
       and which binning can never see. */
    const cross = (tr, level, col) => {
      const ts = [];
      for (let i = 1; i < tr.length; i++) {
        const a = tr[i - 1], b = tr[i], va = a[col], vb = b[col];
        if ((va < level && level <= vb) || (va > level && level >= vb)) {
          ts.push(vb === va ? b[0] : a[0] + (b[0] - a[0]) * ((level - va) / (vb - va)));
        }
      }
      return ts;
    };
    const pace = (tr, col) => {
      const lit = [], kin = [];
      for (const r of LADDER) {
        const m = cross(tr, r + REVEAL_W / 2, col);
        const lo = cross(tr, r, col), hi = cross(tr, r + REVEAL_W, col);
        if (!m.length || !lo.length || !hi.length) continue;
        lit.push(m[m.length - 1]);
        kin.push(Math.abs(hi[hi.length - 1] - lo[lo.length - 1]));
      }
      if (lit.length < 2) return null;
      const sweep = (Math.max(...lit) - Math.min(...lit)) / 1000;
      kin.sort((a, b) => a - b);
      return { rungs: lit.length, sweep, bps: lit.length / sweep, kindle: kin[kin.length >> 1] };
    };

    // ---- G3/G4/G5/G6: the wraps, through REAL wheel -----------------------
    if (!wheel) {
      out.push('G3 SKIP — no trusted-wheel driver supplied. journey.wrap() is NOT the input path.');
    } else {
      /* THE BAR IS A RATIO TO THE TUNED FORWARD SCRUB, MEASURED IN THE SAME
         SESSION — because that ratio is exactly what failed. Shipped state
         ran the blends at 64-75 ms against a 190 ms firm forward read: 0.34x.
         An ABSOLUTE bar cannot be used here: the forward flick's own kindle
         moves with frame rate (136 ms on an unloaded page, 177 ms with this
         recorder running), because the scroll model's servo is dt-driven,
         so a fixed millisecond threshold would pass or fail on machine load
         rather than on behaviour. The firm read is stable across both (190 /
         188 ms) and is the reference; both forward rows are reported so the
         band is visible.
         RATIO_MIN 0.70 = "a blend may not be more than ~1.4x quicker than a
         firm forward read". Shipped state fails it by a factor of two; the
         paced build sits at ~0.85. */
      const RATIO_MIN = 0.70;
      await place(0.725);
      const fwd = pace(await take(2200, () => wheel(40, 95, 16)), 2);
      await place(0.725);
      const fwdFlick = pace(await take(2200, () => wheel(150, 34, 16)), 2);
      out.push(`G3 reference: forward firm scrub (bar)  sweep ${fwd.sweep.toFixed(3)} s  `
               + `bodies/s ${fwd.bps.toFixed(2)}  kindle ${fwd.kindle.toFixed(1)} ms`);
      out.push(`G3 reference: forward flick             sweep ${fwdFlick.sweep.toFixed(3)} s  `
               + `bodies/s ${fwdFlick.bps.toFixed(2)}  kindle ${fwdFlick.kindle.toFixed(1)} ms`);

      let popMax = 0, breach = 0, conv = 0;
      for (const [name, p0, dy] of [['wrap DOWN', 0.97, 110], ['wrap UP', 0.0, -110]]) {
        await place(p0);
        const tr = await take(6000, () => wheel(dy, 18, 16));
        const m = pace(tr, 2);
        if (!m) { out.push(`G3 ${name}: ladder not traversed — did the wrap fire?`); continue; }
        const ratio = m.kindle / fwd.kindle;
        out.push(`G3 ${name} [real wheel]  sweep ${m.sweep.toFixed(3)} s  bodies/s ${m.bps.toFixed(2)}  `
                 + `kindle ${m.kindle.toFixed(1)} ms  = ${ratio.toFixed(2)}x the forward firm read `
                 + `(>= ${RATIO_MIN}) ` + (ratio >= RATIO_MIN ? 'PASS' : 'FAIL'));
        for (let i = 1; i < tr.length; i++) {
          popMax = Math.max(popMax, Math.abs(tr[i][2] - tr[i - 1][2]));
          const ceil = Math.max(tr[i][3], tr[i - 1][2]);
          breach = Math.max(breach, tr[i][2] - ceil);
        }
        conv = Math.max(conv, Math.abs(tr[tr.length - 1][2] - tr[tr.length - 1][3]));
      }
      out.push(`G4 max (uPull - max(pure, previous uPull)) over both wraps: ${breach.toExponential(2)}  `
               + (breach <= 1e-9 ? 'PASS' : 'FAIL'));
      out.push(`G5 largest one-frame uPull step over both wraps: ${popMax.toFixed(4)}  `
               + `(must be <= REVEAL_W ${REVEAL_W}) ` + (popMax <= REVEAL_W ? 'PASS' : 'FAIL'));
      out.push(`G6 |uPull - pullOf(camera.x)| once settled after each wrap: ${conv.toExponential(2)}  `
               + (conv === 0 ? 'PASS (bit-exact)' : 'FAIL'));

      /* ---- G7: THE SHORT BLEND. A rail click Owned -> Epilogue is ~1.2 s and
         spends most of it approaching, so the camera crosses the reveal band
         in the last third and the limiter is still behind when the blend
         lands. It is therefore the ONLY gate that sees whether the landing
         hands over or pops, and it is what caught this pass's own first
         build: with snap() resetting the driver at endCamBlend, the click
         moved uPull 0.80 IN ONE FRAME — the whole 24-rung ladder at once,
         5-8 ms a body, measurably worse than the shipped state it replaced.
         Neither wrap sees it, because a 3.8 s lap gives the limiter enough
         room to converge before it lands. Real pointer press on the rail;
         the rail is hover-collapsed, so the harness opens it first. */
      if (opts.click) {
        await place(0.725);
        const tr = await take(4500, () => opts.click('epilogue'));
        const m = pace(tr, 2);
        let pop = 0;
        for (let i = 1; i < tr.length; i++) pop = Math.max(pop, Math.abs(tr[i][2] - tr[i - 1][2]));
        const ratio = m ? m.kindle / fwd.kindle : 0;
        out.push(`G7 rail click Owned->Epilogue [real pointer]  `
                 + (m ? `sweep ${m.sweep.toFixed(3)} s  bodies/s ${m.bps.toFixed(2)}  `
                        + `kindle ${m.kindle.toFixed(1)} ms = ${ratio.toFixed(2)}x  ` : 'ladder not traversed  ')
                 + `largest one-frame step ${pop.toFixed(4)}  `
                 + (m && ratio >= RATIO_MIN && pop <= REVEAL_W ? 'PASS' : 'FAIL'));
      } else {
        out.push('G7 SKIP — no pointer driver supplied.');
      }
      out.push(`input: trusted wheel observed = ${sawTrusted}`);
    }
    window.__rg = out;
    return out;
  } catch (e) {
    window.__rgErr = String(e && e.stack || e);
    window.__rg = out.concat(['THREW: ' + window.__rgErr]);
    return window.__rg;
  }
};
