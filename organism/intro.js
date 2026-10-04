// organism/intro.js — the entry growth choreography: draw-window keying,
// occluder-shell fades, and the 'intro-draw' animator. Split out of the
// createScene closure at merge step M2 with zero behaviour change; shared
// state arrives through `ctx` (built in organism.js). Runs unconditionally:
// even with intro=0 it sets every object's draw window and the stem clamp,
// exactly as the inline block did.
import * as THREE from 'three';
import { INTROAT } from '../flags.js';
import { createIntroClock } from './intro-clock.js';

/* ---- THE GROWTH'S ONE TIMELINE (2026-10-04) ------------------------------
   Fractions of the intro (main.js INTRO_S, 5.4 s). Hannah, of the growth:
   "there's like half a second before the head starts to grow, which makes
   it feel like two processes"; the ground "feels like it explodes out, as
   opposed to an organic growth"; and the order she asked for — the stalk
   grows up, the underside grows out, "a ring around the edge of the head,
   and then the top should grow from that" — "like a techno mushroom ...
   it feels organic, but isn't necessarily adhering to the principles".

   So it is ONE front, handed on rather than restarted:
     ground  creeps out from the landing in ragged fingers for most of the
             growth — under the stalk, not before it (creepDraw below).
     stem    one ring of light climbing the stipe, keyed to the CAP LINE,
             so the front reaches the throat exactly as its window ends.
             (Keyed to the buried top, it arrived early and then sat
             unseen behind the lid — the pause.)
     gills   open outward from the throat the moment the front arrives:
             they start a beat early, under the stipe's own radius.
     rim     closes the ring round the edge as the gills reach it.
     dome    rises inward from that ring to the crown.
     spores  the shed begins as the dome does, and settles last.
   organism.js reads the cap's windows from here for the opaque bodies that
   grow with them, and for which cap strokes open outward or close inward. */
export const GROWTH = Object.freeze({
  ground: [0.000, 0.640],
  stem: [0.050, 0.400],
  gills: [0.370, 0.560],
  rim: [0.530, 0.650],
  dome: [0.610, 0.820],
  spores: [0.650, 1.000],
});

export function setupIntro(ctx) {
  const { scene, renderer, mushroom, stemGroup, groundGroup,
          drawU, drawWin, animators, addAnimator, intro, deferIntro, stemJoinY = 3.65 } = ctx;

  // ---- entry draw: the specimen inks itself in, stroke by stroke ----
  // One master progress sweeps 0..1 over `intro` seconds; every drawable object
  // claims a window of it (below) and strokes itself in during that slice, in
  // buffer order — thread by thread across the ground, fibre by fibre up the
  // stipe, then the cap surfaces, the gills, the rim as the closing flourish,
  // and the spore plume last. Windows overlap so several pens are on the paper
  // at once, but the big arcs stay legible: ground -> stalk -> cap -> spores.
  // The black occluder shells are a wrinkle: near-black against the warm
  // background, a full-size mushroom SILHOUETTE would loom over the blank page
  // from the first frame. So they hide until the stipe is being drawn and fade
  // in just ahead of the cap surfaces — by the time gills ink in behind the
  // cap, the shells are back on occlusion duty.
  const _capShells = mushroom.children.filter(o => o.isMesh && !o.material.userData.uWin);
  const _stemShells = stemGroup.children.filter(o => o.isMesh && !o.material.userData.uWin);
  // The stem occluder's geometry runs up INSIDE the cap, like the fibres do.
  // The ink stops at the cap line (uClampY), so during the intro the shell
  // must be sliced there too — otherwise its naked top stands as a black slab
  // against the sky where nothing has been drawn yet. The plane is lifted at
  // park, once the cap's own shells hide the joint.
  renderer.localClippingEnabled = true;
  const _stemClip = [new THREE.Plane(new THREE.Vector3(0, -1, 0), stemJoinY)];
  function _shellFade(shells, k, clip) {
    for (const m of shells) {
      m.material.transparent = k < 1;
      m.material.opacity = k;
      m.material.clippingPlanes = clip;
      m.visible = k > 0;
    }
  }
  function shellsAt(p) {
    // solidity follows the ink: each shell fades in WHILE its region is being
    // stroked, so the body fills in under the accumulating lines. The stem
    // shell's clip plane also RISES with wave 1's climbing front (capped at
    // the cap line), so no dark body ever stands above the drawn strands.
    /* THE CLAMP IS NOT A SANITISER, and this is the one place on the page
       where that distinction is a crash rather than a wrong pixel.
       Math.max(0.02, NaN) is NaN and Math.min(3.65, NaN) is NaN, so a NaN
       progress passes through both bounds and lands in a clip plane's
       constant. three then uploads it into `uniform vec4 clippingPlanes[N]`,
       whose array setter runs WebGLUniforms' flatten() — and flatten decides
       "number or object?" with `firstElem <= 0 || firstElem > 0`, a test NaN
       fails. It concludes the NaN is an object, calls `.toArray()` on it, and
       throws `firstElem.toArray is not a function` inside RenderPass on EVERY
       frame from then on: the whole scene goes to the static door, which is
       exactly the Round 7 regression. This layer is the only site code that
       reaches an array uniform at all (nothing else declares a vecN[]/mat[]),
       so hardening it here closes the entire class at its only door. A
       non-finite progress parks the shell at the base rather than crashing
       the page — the shells are an occlusion detail, not the picture. */
    const _clipP = Number.isFinite(p) ? p : 0;
    const [s0, s1] = GROWTH.stem;
    // a hair ahead of the ink's front, so the body never pokes above it
    _stemClip[0].constant = Math.min(stemJoinY,
      Math.max(0.02, ((_clipP - s0) / (s1 - s0)) * stemJoinY * 0.98));
    _shellFade(_stemShells, Math.min(1, Math.max(0, (p - s0) / (s1 - s0 + 0.02))), _stemClip);
    // the cap's body is solid by the time the rim closes over it
    const g0 = GROWTH.gills[0];
    _shellFade(_capShells, Math.min(1, Math.max(0, (p - g0) / 0.12)), null);
  }
  function shellsRestore() {
    _shellFade(_stemShells, 1, null);
    _shellFade(_capShells, 1, null);
  }
  {
    const filt = list => list.filter(o => o.material &&
      ((o.material.uniforms && o.material.uniforms.uWin) || o.material.userData.uWin));
    const [web, myc, mossPts, pools, roots, ribbon, beads] = filt(groundGroup.children);
    const [stemVerts, stemMesh, stemPts] = filt(stemGroup.children);
    const [capMesh, overlay, overlayPts, gills, gillCore, rim, rimPts, capBeads] =
      filt(mushroom.children);
    const [motes, spores] = filt(scene.children);
    // The ground does not scatter in at random — and it does not BURST.
    // It used to be keyed by plain distance over the web's whole 19.7-unit
    // reach, but the hero frame only ever shows the inner ~9 of it: half of
    // everything visible had inked in 0.3 s, one perfect circle, which is an
    // explosion. Now each vertex is keyed by an EFFECTIVE distance — its
    // radius pushed out or pulled in by a few slow angular waves that twist
    // as they go out (fingers that lead and lag, curling a little like
    // hyphae) — and the visible reach, not the whole web, spans the window.
    // The front starts as a slow creep at the base and gathers pace; past
    // the edge of the frame the remainder finishes quietly in the last
    // tenth. Every tip carries the stroke's ember, so the growing edge is a
    // fringe of bright points: organic in shape, exact in its light.
    const VISIBLE_R = 9.5;
    function creepDraw(obj, reach = VISIBLE_R) {
      const pos = obj.geometry.attributes.position;
      const a = obj.geometry.attributes.aDraw;
      let rMax = 0;
      for (let i = 0; i < pos.count; i++) rMax = Math.max(rMax, Math.hypot(pos.getX(i), pos.getZ(i)));
      const far = Math.max(reach * 1.01, rMax * 1.25);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const r = Math.hypot(x, z), th = Math.atan2(z, x);
        const finger = 0.5 * Math.sin(3 * th + 0.9 + 0.35 * r)
          + 0.3 * Math.sin(5 * th + 2.1 - 0.22 * r)
          + 0.2 * Math.sin(11 * th + 4.0 + 0.6 * r);
        const re = r * (1 + 0.22 * finger);
        const key = re < reach
          ? 0.9 * Math.pow(re / reach, 0.8)
          : 0.9 + 0.085 * Math.min(1, (re - reach) / (far - reach));
        a.setX(i, key);
      }
      a.needsUpdate = true;
    }
    for (const o of [web, myc, mossPts, pools, ribbon, beads]) creepDraw(o);
    // the roots are the flare at the stalk's foot (r < 5): they grow out as
    // the stalk climbs, over their own short reach
    creepDraw(roots, 5.0);
    // The stalk rises as one wave: draw order re-keyed by HEIGHT, so every
    // strand climbs together (a ring of ember light riding up the stem)
    // instead of strand-by-strand around the circumference. Keyed to the
    // CAP LINE: the part buried inside the cap is held at the end of the
    // window (it is lidded while drawing anyway, uClampY below), so the
    // visible front reaches the throat exactly as the window closes and the
    // gills take it from there.
    function riseDraw(obj) {
      const pos = obj.geometry.attributes.position;
      const a = obj.geometry.attributes.aDraw;
      let yMin = Infinity;
      for (let i = 0; i < pos.count; i++) yMin = Math.min(yMin, pos.getY(i));
      const span = (stemJoinY - yMin) || 1;
      for (let i = 0; i < pos.count; i++) {
        a.setX(i, Math.min(0.985, (pos.getY(i) - yMin) / span));
      }
      a.needsUpdate = true;
    }
    for (const o of [stemVerts, stemMesh, stemPts]) riseDraw(o);
    const G = GROWTH;
    const WINDOWS = [
      // the ground: threads lead, dust trails a beat behind them
      [web, G.ground[0], G.ground[1]], [myc, 0.015, G.ground[1]],
      [ribbon, 0.015, G.ground[1]], [roots, 0.000, 0.420],
      [mossPts, 0.040, 0.680], [beads, 0.040, 0.680], [pools, 0.070, 0.680],
      // the stalk: strands, then their lattice and sparks just behind the
      // same front — trailing it, not following after it
      [stemVerts, G.stem[0], G.stem[1]], [stemMesh, 0.120, 0.420], [stemPts, 0.160, 0.440],
      // under the cap, outward from the throat; the ring round the edge;
      // then the dome, inward from that ring to the crown
      [gills, G.gills[0], G.gills[1]], [gillCore, 0.390, 0.580],
      [rim, G.rim[0], G.rim[1]], [rimPts, 0.550, 0.670],
      [capMesh, G.dome[0], G.dome[1]], [overlay, 0.635, 0.845], [overlayPts, 0.655, 0.860],
      [capBeads, 0.625, 0.850],
      // the air: motes while it grows, then the shed — the longest single
      // window, still settling as everything else finishes
      [motes, 0.200, 0.550], [spores, G.spores[0], G.spores[1]],
    ];
    for (const [obj, a, b] of WINDOWS) drawWin(obj).value.set(a, b);
    // which cap strokes open outward (with the gills) and which close inward
    // (with the dome) — organism.js re-keys them by radius after this runs
    for (const o of [gills, gillCore]) o.userData.capGrowth = 'out';
    for (const o of [capMesh, overlay, overlayPts, capBeads]) o.userData.capGrowth = 'in';
    // The stem's top quarter is built to run up INSIDE the cap (the joint is
    // buried). Left alone it would ink in against open sky and then get
    // swallowed as the cap's body fades in — drawn, then un-drawn. So the
    // stipe strokes stop at the cap line instead; the buried joint never
    // draws, and the lid lifts invisibly behind the shells once parked.
    for (const o of [stemVerts, stemMesh, stemPts]) o.material.uniforms.uClampY.value = stemJoinY;
  }

  // ?introat=P (0..1) freezes the drawing at that progress for frame inspection
  // (parsed once, in ../flags.js — THE flag registry)
  const _introAt = INTROAT;
  // This clock is local to the draw choreography. Its acceleration never
  // leaks into scroll, readiness, seam, tooling, or other scene clocks.
  let accelerationRaf = null;
  const introClock = createIntroClock({
    requestFrame(callback) {
      accelerationRaf = requestAnimationFrame(() => {
        accelerationRaf = null;
        callback();
      });
      return accelerationRaf;
    },
  });
  let completed = false;

  function start() {
    /* `!(intro > 0)` rather than `intro <= 0`, and the asymmetry is the point:
       every comparison against NaN is false, so `intro <= 0` WAVES A NaN
       THROUGH — and a NaN duration makes every `lived / intro` below NaN, for
       the life of the page. Same family as the two guards repaired alongside
       this one (the clamp in shellsAt, the `remaining < 200` in
       intro-clock.js): a bound that reads as protective and is not. `intro` is
       a literal today, so this is latent rather than live; it is closed here
       because the class is what bites, not the instance. */
    if (_introAt !== null || !(intro > 0) || introClock.started || completed) return false;
    // Wall clock, not accumulated rAF dt: the page's CSS choreography runs on
    // the wall clock, and rAF stops entirely in a hidden tab — accumulating dt
    // would let the text finish while the specimen was still being drawn.
    introClock.start();
    addAnimator('intro-draw', () => {
      const lived = introClock.elapsedMs() / 1000;
      if (lived >= intro) {
        // Don't snap to the parked value: glide uProg from 1 to 2 over 0.7s
        // so the stem's buried joint fades in behind the cap.
        const over = (lived - intro) / 0.7;
        if (over >= 1) {
          drawU.value = 2;
          shellsRestore();
          completed = true;
          animators.delete('intro-draw');
          return;
        }
        drawU.value = 1 + over;
        shellsAt(1);
        return;
      }
      drawU.value = lived / intro;
      shellsAt(lived / intro);
    });
    return true;
  }

  function finish() {
    if (_introAt !== null) return false;
    animators.delete('intro-draw');
    drawU.value = 2;
    shellsRestore();
    completed = true;
    return true;
  }

  if (_introAt !== null) {
    const p = Math.min(1, Math.max(0, parseFloat(_introAt) || 0));
    drawU.value = p;
    shellsAt(p);
  } else if (intro > 0) {
    drawU.value = 0; // blank page before the first frame renders
    shellsAt(0);
    if (!deferIntro) start();
  }

  /* ---- accelerate(): the intro fast-forward (ride-through #4) -----------
     Scrolling during the entry choreography must never be a locked door.
     The grow-in above runs on an intro-owned transform of wall time, so the
     ramp fast-forwards the ENTIRE draw through its own real math — growth,
     ember release, shell restore — in ~0.5 s. The browser's performance
     clock and every unrelated consumer continue to observe native time. The
     page merely wires the trigger events and its CSS half (the
     body.intro-fast compression classes ride with the hero stylesheet).

     `totalMs` is the PAGE's total choreography length (scene grow-in plus
     the callout boots plus the caller's settle margin) — the page knows
     that number; the intro only knows its own seconds, hence the argument.
     Returns true when the skew engaged; false when there is nothing to
     accelerate (intro skipped/frozen/finished, or < 200 ms left — "intro
     basically done anyway"), in which case the caller must not compress
     its CSS half either. */
  function accelerate({ totalMs = intro * 1000, rampMs = 480 } = {}) {
    return introClock.accelerate({ totalMs, rampMs });
  }

  /** Retire the draw animator and the intro-local acceleration ramp.
   *  Idempotent, including when the intro never started or accelerated. */
  function teardown() {
    let undid = animators.delete('intro-draw');
    if (accelerationRaf !== null) {
      cancelAnimationFrame(accelerationRaf);
      accelerationRaf = null;
      undid = true;
    }
    return undid;
  }

  /* THE SHELL STATES THE GROWTH WILL DRAW, for a warm-up to compile
     (2026-10-04 — "an occasional frame or two of lag at the beginning").
     The occluder shells are HIDDEN while journey preparation compiles the
     scene, and compileAsync only visits visible objects; worse, each fade
     puts them into program variants nothing else uses — transparent with
     the stem's clip plane, opaque with it, transparent without it — and
     three keys a program on both. So the first frames of the stem fade
     (0.54 s into the growth) and of the cap fade each linked a program on
     the spot: 117 ms + 13 ms of main thread measured on a cold load, a
     visible hitch in the middle of the stalk's climb. `fn` is called once
     per state the growth passes through (stem fading under its clip; stem
     solid under its clip with the cap fading; both restored), and the
     shells are then put back exactly as they were, clip constant included,
     so no frame ever draws a state the choreography did not ask for. */
  function eachShellVariant(fn) {
    const all = [..._stemShells, ..._capShells];
    const saved = all.map(m => [m, m.visible, m.material.transparent,
      m.material.opacity, m.material.clippingPlanes]);
    const clipWas = _stemClip[0].constant;
    try {
      shellsAt(0.25);
      fn();
      shellsAt(GROWTH.gills[0] + 0.06);
      fn();
      shellsRestore();
      fn();
    } finally {
      for (const [m, visible, transparent, opacity, clip] of saved) {
        m.visible = visible;
        m.material.transparent = transparent;
        m.material.opacity = opacity;
        m.material.clippingPlanes = clip;
      }
      _stemClip[0].constant = clipWas;
    }
  }

  return {
    start,
    finish,
    accelerate,
    teardown,
    eachShellVariant,
    get started() { return introClock.started; },
    get complete() { return completed; },
  };
}
