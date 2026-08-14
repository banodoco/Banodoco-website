// tools/fieldpace.js — QA-ONLY. The Final field's arrival, measured in the two
// units Hannah actually talks about: how long ONE body takes to light, and how
// long between one body starting and the next.
//
// NOT shipped: nothing imports it. Load it by hand and call
// `await __fieldPace({...})`; the result also lands in `window.__fp`.
//
// WHY IT EXISTS
// -------------
// Five passes have been asked for this and each one re-derived the numbers a
// different way, so the passes are not comparable to each other. This file
// fixes the method:
//
//   1. THE REAL WHEEL PATH, ALWAYS. `journey.wrap()`, `flyTo()` and
//      `scrollTo()` bypass the wheel path entirely; two passes on this
//      codebase reported motion no visitor could see by driving through them.
//      They are used HERE for placement only, never across a measured move.
//      The move itself is rAF-timed WheelEvents (~18.6 ms apart, against the
//      45 ms continuity threshold that CDP's Input.dispatchMouseEvent cannot
//      hold on this machine), followed by a real release so the commit glide
//      runs — the glide is where `a0a89f8`'s limiter lives, so a measurement
//      that stops at the release is measuring the wrong half of the gesture.
//
//   2. THE LADDER COMES FROM THE BUILD (`journey.chapters.final.pacing`), not
//      from constants copied into the probe. A probe that restates `drawWOf`
//      is a second copy of the math in the one place doc 18 §13.4 names as a
//      standing hazard, and it silently lies the moment either file moves.
//
//   3. EVERY TIMING IS INTERPOLATED ON THE TRACED DRIVER, never binned by
//      frame. Binning reports the ladder up to a whole rung out (revealgates
//      G3 records that failure). A body's light is exactly
//      `s = (pullRaw − reveal) / drawW` over 0..1, so its start and end are
//      the instants the traced driver crosses two known values, and linear
//      interpolation between the two straddling frames is exact to the
//      driver's own curvature over ~18 ms.
//
// WHAT IT REPORTS
//   kindle   per body, seconds: the time its own light takes to go 0 -> 1.
//   gap      seconds between one body STARTING and the next starting.
//   sweep    two ways — the 5%..95% of PULL_MAX band (comparable with
//            26-scroll-loop.md §37.5) and first-start -> last-finish.
//   order    the bodies in arrival order with their tier, so "the ring's four
//            open alone, then the field" can be read off directly.
window.__fp = null; window.__fpErr = null;

window.__fieldPace = async function (opts) {
  opts = Object.assign({
    dir: 'fwd',          // 'fwd' | 'rev'
    speed: 2400,         // px/s of wheel, the "firm read" of doc 18 §13
    from: 'owned',       // rest to start at
    to: 'final',
    settleMs: 6000,      // recording tail after the release, for the glide/blend
    maxDriveMs: 9000,
    wrapDriveMs: 700,   // enough gesture to trip the lap, then let go
  }, opts || {});

  try {
    const J = window.journey, S = J.scroll;
    const { pullOf, pullRawOf, PULL_MAX } = await import('/journey/chapters/final/world.js');
    const { restProgress } = await import('/journey/route.js');
    const nf = () => new Promise(r => requestAnimationFrame(r));
    const sleep = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) await nf(); };
    const camx = () => window.sceneApi.camera.position.x;

    // ---- the chapter's shared uniform block, via a material it owns --------
    let U = null;
    window.sceneApi.scene.traverse(o => {
      if (U) return;
      const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const m of ms) if (m && m.uniforms && m.uniforms.uPull && m.uniforms.uPullRaw) { U = m.uniforms; return; }
    });
    if (!U) throw new Error('the Final uniform block is not in the scene yet');
    const G = J.chapters.final.group;

    // ---- the ladder, from the build ---------------------------------------
    const pacing = J.chapters.final.pacing;
    if (!pacing || !pacing.length) throw new Error('chapters.final.pacing is empty');

    // ---- the tracer -------------------------------------------------------
    // Registered now, i.e. AFTER the journey's own animator, so each sample is
    // the value the frame was presented with rather than one frame early.
    let trace = null;
    const loop = () => {
      if (trace) trace.push([performance.now(), camx(), U.uPull.value,
        U.uPullRaw.value, pullOf(camx()), J.p, S.gliding ? 1 : 0, G.visible ? 1 : 0]);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // ---- placement (QA hook, no measurement crosses it) --------------------
    // 'wrapDown' leaves the end-hold forward and laps to Mission; 'wrapUp'
    // leaves Mission backward and laps to the end. Both are CAMERA BLENDS, and
    // both have to be driven by a real gesture: `journey.wrap()` is the QA hook
    // and journey.js's own notes record two passes lost to measuring the wrap
    // through it.
    const restP = (id) => restProgress(id);
    const WRAP = opts.dir === 'wrapDown' || opts.dir === 'wrapUp';
    const startP = WRAP ? (opts.dir === 'wrapDown' ? 1 : 0)
      : restP(opts.dir === 'fwd' ? opts.from : opts.to);
    const endP = WRAP ? (opts.dir === 'wrapDown' ? 1.5 : -0.5)
      : restP(opts.dir === 'fwd' ? opts.to : opts.from);
    // A placement is a BLEND, and a blend arms the limiter. Starting the trace
    // before it has fully converged puts the placement's own driver motion into
    // the measurement — the first build of this probe did exactly that and
    // reported a 0.024 s sweep, i.e. the whole ladder crossed inside a
    // placement frame. So the placement is asserted settled on all three of
    // p, the scroll model and the reveal driver's convergence back to
    // camera-pure (limiter gate G6) before anything is recorded.
    J.scrollTo(startP);
    let settled = false;
    for (let i = 0; i < 900; i++) {
      await nf();
      if (!S.resolving && Math.abs(S.rate) < 1e-6
        && Math.abs(J.p - startP) < 1e-4
        // The driver only has to have converged if the chapter is actually
        // DRAWN. Retired, its uniforms hold their last value — a uniform read
        // on an undrawn group is stale, and `group.visible` is the only honest
        // test (26-scroll-loop.md §37.6 records a false positive from exactly
        // this). At p = 0 the Final group is not visible and requiring
        // convergence there hangs the placement forever.
        && (!G.visible
          || Math.abs(U.uPullRaw.value - pullRawOf(camx())) < 1e-6)) { settled = true; break; }
    }
    await sleep(600);
    if (!settled || Math.abs(J.p - startP) > 1e-4)
      throw new Error(`placement did not settle at ${startP} (p=${J.p})`);

    // ---- the gesture: rAF-timed wheel, then a real release ----------------
    const sign = (endP > startP) ? 1 : -1;
    const fire = (dy) => window.dispatchEvent(new WheelEvent('wheel', {
      deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true,
    }));
    trace = [];
    const t0 = performance.now();
    let last = t0;
    // Drive until the journey is most of the way there, then let go: a visitor
    // scrolls and releases, and the release is what arms the commit glide.
    while (performance.now() - t0 < opts.maxDriveMs) {
      await nf();
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      fire(sign * opts.speed * dt);
      if (WRAP) { if (performance.now() - t0 > opts.wrapDriveMs) break; continue; }
      const done = sign > 0 ? (J.p >= startP + (endP - startP) * 0.72)
        : (J.p <= startP + (endP - startP) * 0.72);
      if (done) break;
    }
    const releasedAt = performance.now();
    await sleep(opts.settleMs);
    const T = trace; trace = null;

    // ---- frame health -----------------------------------------------------
    // `dt` is clamped at 50 ms upstream, so a frame gap above that advances the
    // sim by LESS than wall-clock and every second reported here is inflated by
    // the difference. simRatio is that difference, named: 1.000 means the trace
    // is wall-clock. Anything below ~0.99 and the run is not trustworthy.
    let maxGap = 0, clamped = 0, wall = 0, sim = 0;
    for (let i = 1; i < T.length; i++) {
      const g = T[i][0] - T[i - 1][0];
      maxGap = Math.max(maxGap, g);
      if (g > 50) clamped++;
      wall += g; sim += Math.min(g, 50);
    }
    const spanS = (T[T.length - 1][0] - T[0][0]) / 1000;
    const fps = (T.length - 1) / spanS;
    const simRatio = wall > 0 ? sim / wall : 1;

    // ---- interpolate the instant the driver crosses a value ---------------
    // Column 3 is uPullRaw — the driver the BODIES read (clones.js §update:
    // s = (pullRaw − reveal)/drawW). uPull is the clamped one the batches read.
    const crossAt = (val, rising) => {
      for (let i = 1; i < T.length; i++) {
        const a = T[i - 1][3], b = T[i][3];
        if (rising ? (a < val && b >= val) : (a > val && b <= val)) {
          const f = (b === a) ? 0 : (val - a) / (b - a);
          return { t: T[i - 1][0] + f * (T[i][0] - T[i - 1][0]), i };
        }
      }
      return null;
    };
    const crossT = (val, rising) => { const c = crossAt(val, rising); return c && c.t; };
    /** Is the reveal driver being METERED BY THE VISITOR or PACED BY THE
     *  MACHINE at this instant? `a0a89f8`'s limiter is armed only while a
     *  blend or a commit glide is carrying the picture; on a live gesture the
     *  driver is `pullOf(camera.x)` bit for bit (revealgates G1). So which of
     *  the two knobs can reach a given rung depends entirely on this flag, and
     *  a pass that tunes the limiter without knowing it is guessing. */
    const stateAt = (val, rising) => {
      const c = crossAt(val, rising);
      if (!c) return null;
      const r = T[c.i];
      return { gliding: !!r[6], lag: +(r[2] - r[4]).toFixed(4) };
    };
    // The wheel direction and the DRIVER's direction are not the same thing on
    // a lap: wrapping DOWN off the end-hold drives the wheel forward while the
    // field retires (pullRaw falls), and wrapping UP off Mission drives it
    // backward while the field arrives (pullRaw rises).
    const rising = WRAP ? (opts.dir === 'wrapUp') : (sign > 0);

    const bodies = pacing.map((b, i) => {
      const ts = crossT(b.reveal, rising);
      const te = crossT(b.reveal + b.drawW, rising);
      return {
        i, tier: b.tier, reveal: +b.reveal.toFixed(4), drawW: +b.drawW.toFixed(4),
        tStart: ts, tEnd: te,
        kindleS: (ts != null && te != null) ? Math.abs(te - ts) / 1000 : null,
      };
    });
    // In reverse the ladder is walked top-down, so arrival order is the order
    // the driver actually reaches them — sort by the observed instant, never
    // by the authored threshold. This is what makes forward and reverse
    // comparable rather than mirror-images of a table.
    const seen = bodies.filter(b => b.tStart != null).sort((a, b) => a.tStart - b.tStart);
    const gaps = [];
    for (let i = 1; i < seen.length; i++) gaps.push((seen[i].tStart - seen[i - 1].tStart) / 1000);

    const kin = bodies.filter(b => b.kindleS != null).map(b => b.kindleS);
    const stat = (a) => a.length ? {
      min: +Math.min(...a).toFixed(4), max: +Math.max(...a).toFixed(4),
      mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(4),
      median: +a.slice().sort((x, y) => x - y)[a.length >> 1].toFixed(4),
    } : null;

    // sweep, the 5%..95% of PULL_MAX band (26-scroll-loop.md §37.5's number)
    const lo = crossT(0.05 * PULL_MAX, rising), hi = crossT(0.95 * PULL_MAX, rising);
    const ends = bodies.filter(b => b.tEnd != null).map(b => b.tEnd);
    const starts = seen.map(b => b.tStart);

    const out = {
      dir: opts.dir, speed: opts.speed,
      frames: T.length, fps: +fps.toFixed(1), maxFrameGapMs: +maxGap.toFixed(1),
      clampedFrames: clamped, simRatio: +simRatio.toFixed(4),
      driveMs: +(releasedAt - t0).toFixed(0),
      landedP: +J.p.toFixed(5), targetP: +endP.toFixed(5),
      landedOnAnchor: WRAP ? null : Math.abs(J.p - endP) < 2e-3,
      bodiesTimed: seen.length, ofBodies: pacing.length,
      unfinished: bodies.filter(b => b.kindleS == null).length,
      kindleS: stat(kin),
      gapS: stat(gaps),
      sweepBandS: (lo != null && hi != null) ? +(Math.abs(hi - lo) / 1000).toFixed(4) : null,
      // first thing to START -> last thing to FINISH, in observed time. Taking
      // max(ends) − min(starts) is only right going forward; in reverse the
      // ladder is walked the other way and that expression mixes the two ends.
      sweepFullS: (starts.length && ends.length)
        ? +((Math.max(...starts.concat(ends)) - Math.min(...starts.concat(ends))) / 1000).toFixed(4) : null,
      order: seen.map(b => {
        const st = stateAt(b.reveal, rising) || {};
        return { tier: b.tier, rev: b.reveal, t: +((b.tStart - seen[0].tStart) / 1000).toFixed(3),
          k: b.kindleS == null ? null : +b.kindleS.toFixed(3),
          glide: st.gliding ? 1 : 0, lag: st.lag };
      }),
      gaps: gaps.map(g => +g.toFixed(3)),
      kindles: bodies.map(b => b.kindleS == null ? null : +b.kindleS.toFixed(3)),
      /* THE STRIP — what a shutter would catch. A body's light is a pure
         function of its own clock s = (t - tStart)/kindle, and clones.js §14
         puts the visible LIGHTING — the "take", the committed move from ember
         to full — at s 0.58..0.88. So "are they lighting one at a time or in
         clumps" is answerable exactly: at each of 12 shutters evenly spaced
         across the arrival, how many bodies are mid-take at once, and how many
         newly START between one shutter and the next. A clump is several of
         both in one frame; a town is one or two. */
      strip: (() => {
        const b = seen.filter(x => x.kindleS != null);
        if (b.length < 2) return null;
        const t0 = Math.min(...b.map(x => x.tStart));
        const t1 = Math.max(...b.map(x => x.tStart + x.kindleS * 1000));
        // A FIXED 200 ms shutter, not a fixed number of shutters. A strip
        // whose shutter scales with the sweep cannot compare a slow arrival
        // with a fast one — it reports the same picture for both by
        // construction, which is exactly the mistake four passes' worth of
        // "it looks more spread out" was open to.
        const SH = 200;
        const N = Math.min(40, Math.max(12, Math.ceil((t1 - t0) / SH) + 1)), out = [];
        for (let i = 0; i < N; i++) {
          const t = t0 + i * SH;
          const tp = t - SH;
          let taking = 0, mid = 0, started = 0;
          for (const x of b) {
            const sv = (t - x.tStart) / (x.kindleS * 1000);
            if (sv > 0 && sv < 1) mid++;
            if (sv >= 0.58 && sv <= 0.88) taking++;
            if (i > 0 && x.tStart > tp && x.tStart <= t) started++;
          }
          out.push({ ms: +(t - t0).toFixed(0), taking, mid, started });
        }
        return { shutterMs: SH, shutters: N, sweepMs: +(t1 - t0).toFixed(0), rows: out,
          maxTaking: Math.max(...out.map(r => r.taking)),
          maxStartedPerShutter: Math.max(...out.map(r => r.started)) };
      })(),
      glidingFrames: T.filter(r => r[6]).length,
      // THE WINDOW THE SWEEP ACTUALLY HAS. On a lap the chapter's own `rise`
      // opens and closes it, and a sweep longer than the window finishes
      // off-screen. For an ARRIVAL that is a fault you can see (bodies still
      // dark when you land); for a RETIRE it is covered by the same fade that
      // is removing the chapter anyway. `group.visible` is the draw gate and
      // the only honest test — the uniforms read stale outside it.
      visibleS: +((T.filter(r => r[7]).length / Math.max(1, T.length)) * spanS).toFixed(3),
      sweepOnScreen: (() => {
        const vis = T.filter(r => r[7]);
        if (!vis.length || !starts.length) return null;
        const v0 = vis[0][0], v1 = vis[vis.length - 1][0];
        const all = starts.concat(ends);
        const inside = all.filter(t => t >= v0 && t <= v1).length;
        return { of: all.length, inside, firstVisMs: +(v0 - T[0][0]).toFixed(0), lastVisMs: +(v1 - T[0][0]).toFixed(0) };
      })(),
    };
    window.__fp = out;
    return out;
  } catch (e) {
    window.__fpErr = String(e && e.stack || e);
    throw e;
  }
};
