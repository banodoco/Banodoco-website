// tools/scrollprobe.js — QA-ONLY scroll-feel probe. NOT shipped: nothing
// imports it; you load it by hand from the console against the dev server.
//
//   const s = document.createElement('script');
//   s.src = '/tools/scrollprobe.js'; document.head.appendChild(s);
//   await __probe.run({ at: 0.30, peak: 70, driveMs: 180, tailMs: 500 });
//
// It exists because three separate scroll fixes were each measured as a real
// improvement and none of them moved the complaint. Two reasons, both of which
// this file is built to remove:
//
//   1. THE WRONG QUANTITY. Progress p is not what the eye sees. Screen gain
//      along this route runs from ~15 to ~16400 px per unit p — a factor of a
//      thousand — so a flat p-rate can read as anything from frozen to a blur.
//      This probe measures SCREEN speed: per frame it unprojects a grid of
//      points at the camera's own look distance, re-projects them with the
//      next frame's camera, and takes the median pixel displacement. That is
//      optical flow — literally what moves in the viewport.
//
//   2. THE WRONG INPUT. A gesture that stops at full strength does not exist
//      on a trackpad: every real one ends in a momentum tail whose deltas
//      decay to nothing, and the model behaves completely differently for the
//      two. `stream()` below generates the tail. Events are dispatched on
//      window through the REAL capture listeners, on setTimeout rather than
//      rAF (batching deltas per frame skews engage timing by a frame), and
//      every actual dispatch time is recorded rather than assumed.

(function () {
  const J = window.journey, S = window.sceneApi;
  const scroll = J.scroll, state = J.journey;
  const cam = S.camera, ctl = S.controls;

  // NDC grid we track. Points are unprojected fresh each frame at the
  // camera's own look distance, so the metric follows the composition's
  // scale instead of a fixed world size.
  const GRID = [];
  for (const gx of [-0.7, -0.35, 0, 0.35, 0.7])
    for (const gy of [-0.7, -0.35, 0, 0.35, 0.7]) GRID.push([gx, gy]);

  function camBasis() {
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements;
    return {
      // columns of R
      rx: [e[0], e[1], e[2]], ry: [e[4], e[5], e[6]], rz: [e[8], e[9], e[10]],
      t: [e[12], e[13], e[14]],
      tan: Math.tan((cam.fov * Math.PI / 180) / 2),
      aspect: cam.aspect,
    };
  }
  function localToWorld(b, v) {
    return [
      b.t[0] + b.rx[0] * v[0] + b.ry[0] * v[1] + b.rz[0] * v[2],
      b.t[1] + b.rx[1] * v[0] + b.ry[1] * v[1] + b.rz[1] * v[2],
      b.t[2] + b.rx[2] * v[0] + b.ry[2] * v[1] + b.rz[2] * v[2],
    ];
  }
  function worldToLocal(b, w) {
    const d = [w[0] - b.t[0], w[1] - b.t[1], w[2] - b.t[2]];
    return [
      b.rx[0] * d[0] + b.rx[1] * d[1] + b.rx[2] * d[2],
      b.ry[0] * d[0] + b.ry[1] * d[1] + b.ry[2] * d[2],
      b.rz[0] * d[0] + b.rz[1] * d[1] + b.rz[2] * d[2],
    ];
  }

  let prev = null;       // { pts:[world], basis } from last frame
  let samples = [];
  let recording = false;

  function frame(t, dt) {
    const b = camBasis();
    const W = window.innerWidth, H = window.innerHeight;
    // look distance: camera -> orbit target (the composition's own scale)
    const tg = ctl && ctl.target ? [ctl.target.x, ctl.target.y, ctl.target.z] : [0, 0, 0];
    const D = Math.max(0.05, Math.hypot(b.t[0] - tg[0], b.t[1] - tg[1], b.t[2] - tg[2]));

    let flow = 0;
    if (prev) {
      const disp = [];
      for (let i = 0; i < prev.pts.length; i++) {
        const l = worldToLocal(b, prev.pts[i]);
        const z = -l[2];
        if (z <= 0.01) continue;
        const nx = l[0] / (z * b.tan * b.aspect), ny = l[1] / (z * b.tan);
        const sx = nx * W / 2, sy = ny * H / 2;
        const px = prev.ndc[i][0] * W / 2, py = prev.ndc[i][1] * H / 2;
        disp.push(Math.hypot(sx - px, sy - py));
      }
      if (disp.length) { disp.sort((a, c) => a - c); flow = disp[disp.length >> 1]; }
    }
    // fresh world points for the next pair
    const pts = GRID.map(([gx, gy]) =>
      localToWorld(b, [gx * b.tan * b.aspect * D, gy * b.tan * D, -D]));
    prev = { pts, ndc: GRID, basis: b };

    if (recording && dt > 0) {
      samples.push({
        t: +performance.now().toFixed(2), dt: +(dt * 1000).toFixed(2),
        px: +(flow / dt).toFixed(1),          // SCREEN speed, px/s
        surf: +scroll.surface.toFixed(6),      // pAt(v) — the virtual surface
        raw: +state.raw.toFixed(6),            // state rawP
        shown: +state.progress.toFixed(6),     // the displayed p
        gl: scroll.resolving ? 1 : 0,
        gv: +scroll.rate.toFixed(4),
        gc: +(scroll.resolveCruise || 0).toFixed(4),
        pv: +scroll.rate.toFixed(4),
        pvh: +scroll.gesturePeak.toFixed(4),
        st: scroll.streaming ? 1 : 0,
        si: +scroll.sinceInput.toFixed(0),
        dir: scroll.lastDir,
      });
    }
  }
  S.addAnimator('__probe', frame);

  /* ---- real-event driver -------------------------------------------- */
  // Dispatches on window so the capture listeners in scroll.js see it,
  // scheduled off rAF (setTimeout) so deltas land BETWEEN frames the way
  // real input does. Actual dispatch times are recorded, not assumed.
  const fired = [];
  function wheelAt(dueMs, dy) {
    const t0 = performance.now();
    return new Promise(res => {
      const tick = () => {
        const left = dueMs - (performance.now() - t0);
        if (left > 1.5) { setTimeout(tick, Math.max(0, left - 1.2)); return; }
        window.dispatchEvent(new WheelEvent('wheel', {
          deltaY: dy, deltaMode: 0, cancelable: true, bubbles: true,
        }));
        fired.push({ t: +performance.now().toFixed(2), dy });
        res();
      };
      tick();
    });
  }

  // A realistic trackpad gesture: a driven phase (finger on glass) followed
  // by a macOS momentum tail whose deltas decay exponentially to nothing.
  function stream({ peak = 60, driveMs = 200, tailMs = 0, tailTau = 110, gap = 16, dir = 1 }) {
    const ev = [];
    let t = 0;
    const nDrive = Math.max(1, Math.round(driveMs / gap));
    for (let i = 0; i < nDrive; i++) {
      // finger phase: ramp up over the first ~4 events, then hold
      const ramp = Math.min(1, (i + 1) / 4);
      ev.push([t, dir * peak * ramp]);
      t += gap;
    }
    if (tailMs > 0) {
      for (let s = 0; s < tailMs; s += gap) {
        const a = peak * Math.exp(-s / tailTau);
        if (a < 0.6) break;
        ev.push([t, dir * a]);
        t += gap;
      }
    }
    return ev;
  }

  async function run({ at = 0.30, aspectW = null, settleMs = 700, holdMs = 2600, ...gest }) {
    // place, let everything settle, then record
    J.scrollTo(at);
    await new Promise(r => setTimeout(r, settleMs));
    samples = []; fired.length = 0; recording = true;
    const ev = stream(gest);
    const t0 = performance.now();
    for (const [d, dy] of ev) await wheelAt(d - (performance.now() - t0), dy);
    const endT = performance.now();
    await new Promise(r => setTimeout(r, holdMs));
    recording = false;
    return { endT, t0, samples: samples.slice(), fired: fired.slice() };
  }

  /** Condense a run into the numbers the acceptance bar is stated in.
   *
   *  The headline metric is DRAWDOWN-THEN-RECOVERY on the SCREEN trace after
   *  the last input event: scan forward holding a running minimum, and take
   *  the largest subsequent rise above it. Any trough-then-rise anywhere in
   *  the move shows up here and nowhere else — a plain min/max pair cannot
   *  see it, because the landing brake legitimately ends at zero.
   *
   *  The same statistic is computed on the p-RATE trace so a screen dip caused
   *  by the composition's own gain profile (which swings 15..16000 px per unit
   *  p) can be told apart from one caused by the scroll controller. */
  function digest(r, label) {
    const last = r.fired[r.fired.length - 1].t;
    const s = r.samples;
    const pre = s.filter(x => x.t <= last);
    const post = s.filter(x => x.t > last);
    const pEnd = s[s.length - 1].shown;
    // Cruise the resolution latched (p/s) — the transition's terminal speed.
    const cruise = Math.max(...post.map(x => x.gc), 0);
    // THE ACCEPTANCE WINDOW: from the last input event until the landing brake
    // takes over. The brake begins about cruise / SNAP_K before the anchor, and
    // decelerating inside it is the correct motion, so it is excluded.
    const SNAP_K = 3.4;
    const brakeAt = cruise > 0 ? cruise / SNAP_K : 0;
    const win = post.filter(x => Math.abs(pEnd - x.shown) > brakeAt);
    const rate = [];
    for (let i = 1; i < win.length; i++) {
      rate.push(1000 * Math.abs(win[i].shown - win[i - 1].shown) / (win[i].dt / 1000));
    }
    // Drawdown-then-recovery: scan forward holding a running minimum and take
    // the largest subsequent rise above it. This is the ONLY statistic that
    // sees a trough-then-rise; a plain min/max pair cannot.
    const drawdown = (arr) => {
      let mn = Infinity, best = 0, back = 0, from = 0;
      for (const x of arr) {
        if (x < mn) mn = x;
        if (x - mn > best) { best = x - mn; back = x; from = mn; }
      }
      return { rise: +best.toFixed(1), trough: +(mn === Infinity ? 0 : from).toFixed(1), back: +back.toFixed(1) };
    };
    const px = win.map(x => x.px);
    const dPx = drawdown(px);
    const dRate = drawdown(rate);
    const rel = pre.length ? pre[pre.length - 1].px : 0;
    const minPx = px.length ? Math.min(...px) : 0;
    return {
      label,
      peak: +Math.max(...pre.map(x => x.px)).toFixed(1),
      release: +rel.toFixed(1),
      cruise: +cruise.toFixed(3),
      // screen speed, over the acceptance window only
      minPx: +minPx.toFixed(1),
      minPctOfRelease: rel > 0 ? +(100 * minPx / rel).toFixed(0) : null,
      pxTrough: dPx.trough, pxBackUpTo: dPx.back, pxRise: dPx.rise,
      // the same, on the p-RATE, so a screen swing caused by the composition's
      // own gain profile (15..16000 px per unit p) is not blamed on the model
      rateTrough: dRate.trough, rateRise: dRate.rise,
      relRate: rate.length ? +rate[0].toFixed(1) : 0,
      peakRate: Math.round(1000 * Math.max(...pre.map(x => Math.abs(x.pv)))),
      heldRate: Math.round(1000 * Math.abs(pre[pre.length - 1].pvh)),
      stream: pre.some(x => x.st) ? 1 : 0,
      nWin: win.length,
      pRelease: +pre[pre.length - 1].shown.toFixed(4),
      pEnd: +pEnd.toFixed(4),
      pxTrace: win.filter((_, i) => i % 2 === 0).map(x => Math.round(x.px)),
      rateTrace: rate.filter((_, i) => i % 2 === 0).map(x => Math.round(x)),
    };
  }

  window.__probe = { run, stream, digest, get samples() { return samples; }, wheelAt,
    set rec(v) { recording = v; if (v) samples = []; },
    get out() { return samples; } };
  console.log('[probe] ready');
})();

/* Full acceptance matrix: 3 strengths x 2 directions x 3 points on the route. */
window.__runMatrix = async function (tag) {
  const P = window.__probe, res = [];
  const G = {
    weak:   { peak: 26,  driveMs: 130, tailMs: 420 },
    mod:    { peak: 70,  driveMs: 180, tailMs: 500 },
    strong: { peak: 160, driveMs: 220, tailMs: 600 },
  };
  const pts = [['A', 0.30, 0.45], ['B', 0.55, 0.68], ['C', 0.78, 0.90]];
  window.__mx = null; window.__mxErr = null;
  try {
    for (const [pn, fwdAt, backAt] of pts)
      for (const gn of ['weak', 'mod', 'strong'])
        for (const dir of [1, -1]) {
          const r = await P.run({ at: dir > 0 ? fwdAt : backAt, holdMs: 3400, dir, ...G[gn] });
          res.push(P.digest(r, `${tag} ${pn} ${gn} ${dir > 0 ? 'fwd ' : 'back'}`));
        }
  } catch (e) { window.__mxErr = String(e.stack || e); }
  window.__mx = res;
};
