// organism/spores.js — THE spore system: the 4,200-particle shed, its
// integrator, and the driver seat (merge doc §3). Split out of the
// createScene closure at merge step M2 with zero behaviour change; all
// formerly-closure state arrives through `ctx` (built in organism.js).
import * as THREE from 'three';
import { TKDBG } from '../flags.js';

// =====================================================================
// 10. SPORE CLOUD — shed from the gill surface across the cap's back side
// =====================================================================
// A real agaric releases spores from the whole hymenium: basidia carpet every
// gill face, the spores drop clear of the margin, and only then does the air
// take them. So each particle is a permanent emitter parked at its own spot on
// the back-side gills, and BREEZE_DIR carries it out from there — the plume is
// a consequence of the wind, not a shape we drew.
export function createSpores(ctx) {
  const { rand, gauss, pushC, makePoints, capUnderPt, tiltX, leanZ, scene } = ctx;
  // cap form language for the driven modes (split/braid paths are authored
  // against the organism's own rim, not a mirror)
  const { rimRad, rimYoff } = ctx;

  // The one wind. The driven braid modes below rise along THIS vector's own
  // ratios (D17 locus law: organization happens IN PLACE, inside the drift's
  // diagonal envelope) — so the axis is derived here, from the raw components,
  // and can never diverge from the drift that carries the ambient shed.
  const BZX = 1.0, BZY = 0.62, BZZ = 0.17;
  const BREEZE_DIR = new THREE.Vector3(BZX, BZY, BZZ).normalize();
  const DRIFT_RX = BZX / BZY;   // braid-rise x advance per unit of rise (y)
  const DRIFT_RZ = BZZ / BZY;   // braid-rise z advance per unit of rise (y)
  let sporePts, sporeVel = [], sporeOrigin, sporeAge;
  {
    const pp = [], pc = [], ps = [], org = [];
    const N = 4200;
    // the cap's own transform, so gill points land in world space
    const capXf = new THREE.Euler(tiltX, 0, leanZ);
    const capOff = new THREE.Vector3(0, 0, -tiltX * 3.2);
    for (let k = 0; k < N; k++) {
      // back half of the gill skirt (sin(a) < 0 faces away from camera), weighted
      // toward the downwind quarter so the shed curtain clears the margin into
      // open air; the outer gills carry the most surface, so bias u outward too
      const a = Math.PI * (1.0 + 0.98 * Math.pow(rand(), 0.45));
      const u = 0.55 + Math.pow(rand(), 0.6) * 0.45;
      const e = capUnderPt(u, a).applyEuler(capXf).add(capOff);
      e.x += gauss() * 0.06;
      e.z += gauss() * 0.06;
      e.y -= 0.06 + Math.pow(rand(), 1.5) * 0.62; // they fall clear of the gills first
      org.push(e.x, e.y, e.z);

      // scatter the cloud along the wind path by age: dense at the gills,
      // thinning and spreading as it travels downwind
      const age = Math.pow(rand(), 1.3);
      const travel = age * 5.2;
      const spread = 0.07 + age * 0.8;
      pp.push(e.x + BREEZE_DIR.x * travel + gauss() * spread,
              e.y + BREEZE_DIR.y * travel + gauss() * spread * 0.72,
              e.z + BREEZE_DIR.z * travel + gauss() * spread * 0.6);
      pushC(pc, 0.64 + Math.pow(rand(), 1.4) * 0.36);
      ps.push(Math.pow(rand(), 1.8) * 0.072 + 0.019);
      const sp = 0.028 + rand() * 0.055;
      sporeVel.push(BREEZE_DIR.x * sp,
                    BREEZE_DIR.y * sp + rand() * 0.012,
                    BREEZE_DIR.z * sp + gauss() * 0.008);
    }
    sporeOrigin = new Float32Array(org); // each spore recycles to its own gill spot
    // release progress, 0 = just shed and still dropping, 1 = fully carried
    sporeAge = new Float32Array(N).fill(1);
    sporePts = makePoints(pp, pc, ps, 2.4);
    scene.add(sporePts);
  }

  // a rap on the cap shakes a fresh shed of spores off the gills: a few
  // particles restart their fall from their own release points
  // (called by the tap handler in organism.js §10c)
  function shedSpores(n) {
    const pos = sporePts.geometry.attributes.position, arr = pos.array;
    for (let k = 0; k < n; k++) {
      const i = (rand() * sporeAge.length) | 0, i3 = i * 3;
      arr[i3]     = sporeOrigin[i3] * ctx.swayCos - sporeOrigin[i3 + 1] * ctx.swaySin;
      arr[i3 + 1] = sporeOrigin[i3] * ctx.swaySin + sporeOrigin[i3 + 1] * ctx.swayCos;
      arr[i3 + 2] = sporeOrigin[i3 + 2];
      sporeAge[i] = 0;
    }
    pos.needsUpdate = true;
  }

  // ---- mouse wind + the drift integrator ----
  // Called by organism.js at the exact position the inline block held in
  // mushroom-scene.js. ORDERING CONSTRAINT (load-bearing): 'spore-drift'
  // must be registered AFTER 'breeze' (it reads ctx.swayCos/swaySin written
  // by 'breeze' earlier in the same frame) and BEFORE any journey-layer
  // animator — the seated driver's steering (seat.drive, called from the
  // chapter's own animator later in the same frame) applies on top of the
  // freshly-integrated positions, before render. Drift writes, steering
  // blends, render sees the sum: that order is proven load-bearing.
  function registerDrift() {
    const { breeze, camera, addAnimator } = ctx;

    // ---- mouse wind: the cursor drags a whisper of air with it ----
    // The pointer's screen motion becomes a faint breeze along its view ray:
    // spores within about a unit of the ray feel a push matching the cursor's
    // sweep, mapped to each spore's own depth so near and far plume deflect by
    // the same VISUAL amount. A resting cursor keeps only a barely-there
    // outward drift — enough to sense the hover, never to scatter the cloud.
    // The smoothed velocity makes the stirred air trail the cursor a beat.
    // Mouse only: touch drags are orbit gestures, and this is a hover thing.
    const mw = { x: 9, y: 9, px: 9, py: 9, svx: 0, svy: 0, on: false };
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.buttons !== 0) { mw.on = false; return; } // dragging = orbiting, not hovering
      mw.x = (e.clientX / innerWidth) * 2 - 1;
      mw.y = -(e.clientY / innerHeight) * 2 + 1;
      mw.on = true;
    });
    document.addEventListener('mouseleave', () => { mw.on = false; });
    const _mwDir = new THREE.Vector3(), _mwRight = new THREE.Vector3(), _mwUp = new THREE.Vector3();

    addAnimator('spore-drift', (t, dt) => {
      // Seat watchdog (restore discipline is structural, not promised): if a
      // claimed driver stopped calling drive() — chapter torn down, journey
      // frame error — the system itself hands every steered dot back and
      // restores the colors byte-exact within one frame. The primary release
      // path is still drive() easing its channels to zero.
      frameNo++;
      if (lastDriveFrame >= 0 && lastDriveFrame < frameNo - 1) releaseSeat();
      // sway state for this frame, written by 'breeze' earlier in the frame
      const swayCos = ctx.swayCos, swaySin = ctx.swaySin;
      const gust = 0.72 + 0.28 * breeze(t);   // gusts surge the drift as the body leans
      const k = Math.min(dt, 0.033) * 60;     // advance per 60fps-equivalent frame
      // cursor wind for this frame (see the mouse-wind comment above)
      let windOn = false, wdx = 0, wdy = 0, wdz = 0,
          rox = 0, roy = 0, roz = 0, rdx = 0, rdy = 0, rdz = 0, steady = 0;
      {
        const a = 1 - Math.exp(-dt * 7); // the stirred air trails the cursor a bit
        const ivx = dt > 0 ? (mw.x - mw.px) / dt : 0;
        const ivy = dt > 0 ? (mw.y - mw.py) / dt : 0;
        mw.px = mw.x; mw.py = mw.y;
        mw.svx += (Math.max(-3, Math.min(3, ivx)) - mw.svx) * a;
        mw.svy += (Math.max(-3, Math.min(3, ivy)) - mw.svy) * a;
        if (mw.on) {
          windOn = true;
          _mwDir.set(mw.x, mw.y, 0.5).unproject(camera).sub(camera.position).normalize();
          rox = camera.position.x; roy = camera.position.y; roz = camera.position.z;
          rdx = _mwDir.x; rdy = _mwDir.y; rdz = _mwDir.z;
          // screen velocity -> world velocity per unit of depth along the ray
          const tanH = Math.tan(camera.fov * Math.PI / 360);
          _mwRight.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mw.svx * tanH * camera.aspect);
          _mwUp.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(mw.svy * tanH);
          wdx = (_mwRight.x + _mwUp.x) * 0.03;
          wdy = (_mwRight.y + _mwUp.y) * 0.03;
          wdz = (_mwRight.z + _mwUp.z) * 0.03;
          steady = 0.018; // the resting-cursor drift, in units/s at the ray
        }
      }
      const dts = Math.min(dt, 0.033); // seconds, matching k's frame clamp
      const pos = sporePts.geometry.attributes.position;
      const arr = pos.array; // raw typed array: the getter/setter API costs real
                             // time at 4200 spores x 60fps in the hottest JS loop
      // THE DRIFT INTEGRATES THE DOT'S OWN AMBIENT STATE, NEVER THE STEERED
      // BUFFER (2026-08-07, Hannah's fourth spore report — the systemic half).
      //
      // While the seat holds a dot, `arr` is not that dot's drift position: it
      // is heroP blended toward a braid path, and at the shipped taste value
      // (T = 0.85) the braid is 85% of it. Integrating THAT and handing the
      // difference back to heroP works only for the parts of this loop that
      // are position-independent. The recycle test below is not: it asks
      // whether the dot has left the volume, and asked of a braid position it
      // fires on dots whose ambient selves never went anywhere near a bound.
      // Measured at the Inspire rest, the shed fully converted, spores
      // recycled per 1.6 s ran 5 (hero-only, at the Mission rest) -> ~130 —
      // a ~25x false recycle rate, every one of which teleported that dot's
      // heroP to its gill origin (steer accepts a jump past TELEPORT2 as the
      // dot's new hero home) and reset its sporeAge. The ambient population
      // was therefore being quietly rewritten by the act of driving the
      // chapter: after one round trip through Inspire, 10.6% of the shed sat
      // in a different cell of an 8^3 spatial histogram than a page that had
      // never left the Connect rest, against 2.3% for simply waiting the same
      // wall time there. And because heroP is 15% of a converted dot's
      // rendered position, that rewrite is not bookkeeping — it is on screen.
      //
      // So a dot the seat is holding has its ambient state carried in heroP
      // and `arr` is left alone (steer overwrites it later this same frame
      // anyway); every other dot integrates `arr` exactly as it always did.
      // steer()'s hero-shadow differencing needs no change and degenerates
      // correctly: for a held dot `arr` is untouched here, so its delta is
      // exactly zero and the shadow it maintains is the one written above.
      // Handover is continuous in both directions — the frame a dot converts,
      // writ is still 0 here and heroP == arr; the frame it ceases, steer
      // adopts the buffer position as the dot's ambient home (retire in
      // place, 2026-08-09) and clears writ, so heroP == arr again.
      const held = inited ? writ : null;
      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3;
        // the gills that release this spore are swaying, so its origin swings too
        const gx = sporeOrigin[i3] * swayCos - sporeOrigin[i3 + 1] * swaySin;
        const gy = sporeOrigin[i3] * swaySin + sporeOrigin[i3 + 1] * swayCos;
        const own = held !== null && held[i] === 1; // the seat holds this dot
        const src = own ? heroP : arr;
        let x = src[i3], y = src[i3 + 1], z = src[i3 + 2];
        // Under the cap the air is still, so a fresh spore drops clear of the gills
        // before the wind takes hold. That handover is measured in TIME, not in
        // distance travelled: the drift is slow enough (~0.06 units/s) that a
        // distance gate would keep a spore falling for a quarter of a minute.
        let w = sporeAge[i];
        if (w < 1) w = sporeAge[i] = Math.min(1, w + (k / 60) / 1.6);
        // The cursor's slipstream: find how deep this spore sits in it BEFORE
        // the ambient drift is applied. Inside the slipstream the air belongs
        // to the cursor, so the breeze's carry YIELDS to it instead of adding
        // to it — a purely additive push against the wind just cancelled a
        // comparable drift and read as nothing; displacing the ambient flow is
        // what lets an against-the-wind sweep visibly stall and turn the plume.
        let fall = 0, spx = 0, spy = 0, spz = 0, sd2 = 0, tp = 0;
        if (windOn) {
          const ox = x - rox, oy = y - roy, oz = z - roz;
          tp = ox * rdx + oy * rdy + oz * rdz; // depth of this spore along the ray
          if (tp > 1 && tp < 16) {
            spx = ox - tp * rdx; spy = oy - tp * rdy; spz = oz - tp * rdz;
            sd2 = spx * spx + spy * spy + spz * spz;
            if (sd2 < 7.3) fall = Math.exp(-sd2 / 0.81); // beyond ~3 radii: nothing
          }
        }
        const carry = gust * (0.45 + 0.55 * w) * k * (1 - 0.6 * fall);
        // gentle turbulence layered over the drift
        x += sporeVel[i3]     * 0.016 * carry + Math.sin(t * 0.7 + i * 0.37) * 0.0018 * k * w;
        y += sporeVel[i3 + 1] * 0.016 * carry - 0.0026 * (1 - w) * k;
        z += sporeVel[i3 + 2] * 0.016 * carry + Math.cos(t * 0.5 + i * 0.53) * 0.0013 * k * w;
        if (fall > 0) {
          const g = fall * dts;
          const inv = steady / Math.sqrt(sd2 + 1e-4) * g;
          x += wdx * tp * g + spx * inv;
          y += wdy * tp * g + spy * inv;
          z += wdz * tp * g + spz * inv;
        }
        // spent — release again from its own gill spot. The bounds are closed on
        // every side so nothing can wander off and never come back.
        if (x > 6.8 || y > 7.6 || y < 0.2 || x < gx - 2.5) {
          x = gx; y = gy; z = sporeOrigin[i3 + 2]; sporeAge[i] = 0;
        }
        src[i3] = x; src[i3 + 1] = y; src[i3 + 2] = z;
      }
      pos.needsUpdate = true;
    });
  }

  // =====================================================================
  // 10d. DRIVER SEAT — the journey's steering and dimming, as modes of
  // THESE dots (merge doc §3): one spore population, whatever it is doing.
  // =====================================================================
  // The seam rule: SPORE BEHAVIOUR lives here; the chapter keeps its anatomy
  // and intent. A driver claims the seat once with the static exit geometry
  // (setDriver({ exits }) -> seat handle) and then, every frame, passes
  // intent through seat.drive({...}) — reveal scalars, dim regions, the
  // TRANSFORM taste value. The chapter never touches position/color buffers;
  // conservation and reversibility are properties of THIS system:
  //
  //   drift (ambient)  — the integrator above; byte-identical when the seat
  //                      is quiet. It ALWAYS runs: steering is a per-frame
  //                      blend applied on top of the fresh drift positions.
  //   split / braid    — steer(): each dot slides from its own drift onto a
  //                      staged path (born between gills -> lateral -> rim
  //                      walk / curl -> braided rise along the drift's own
  //                      lean, DRIFT_RX/RZ — D17). Pure in (eff, time, T);
  //                      scrub-safe, nothing time-integrated.
  //   detail           — the same dots decorated: knot-pearl cadence and
  //                      core-cohort brightness ride the dimmer's per-dot
  //                      feed (cv/pw). No second population exists.
  //
  // RESTORE DISCIPLINE (structural): positions restore by ceasing IN PLACE
  // (2026-08-09, Hannah's fifth spore report — "they MOVE POSITION to work
  // for the next section"). A per-dot shadow of the dot's ambient home
  // (heroP) absorbs what the drift integrator adds each frame; while the
  // dot's conversion RISES it travels from that home onto its path (the
  // arrival gather, approved), but when its conversion FALLS the lost
  // displacement is absorbed INTO the home instead of travelled back — the
  // rendered dot does not move for the fall, and a dot whose conversion
  // reaches zero is handed to the drift wherever performing left it. The
  // ambient positions are not sacred (the braid lives inside the drift's
  // own envelope by the D17 locus law, and measured at the full rest only
  // 7 of 4,200 braid positions sit outside the drift bounds); what IS
  // sacred is that a falling reveal changes LIGHTING, never position — the
  // one-population invariant. Colors restore byte-exact from the one base
  // copy captured before the first dim. Both run from ONE release path
  // (releaseSeat), reached three ways: every channel easing to ~0 inside
  // drive(), the driver releasing the seat (setDriver(null)), or the
  // watchdog in 'spore-drift' noticing a claimed driver went silent.

  // -- deterministic streams for the per-dot path assignments. Same LCG
  // family as the hero's own rand (organism.js §1); own seeds, so they can
  // never consume the hero's stream. Seeds preserve the Hannah-approved
  // assignments byte-for-byte (first stream 9127; the core cohort was added
  // after those assignments were approved, hence its own stream 3187).
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const gaussOf = (r) => (r() + r() + r() + r() - 2) / 2;

  const TAU = Math.PI * 2, PI = Math.PI;
  const ss = (a, b, x) => {
    x = (x - a) / (b - a);
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  };
  // rim underside height at azimuth a — mirrors capUnderPt(1, a).y without
  // allocating a Vector3 in the hot loop
  const { LEAN_DIR, CAP_Y } = ctx;
  function rimYof(a) {
    return CAP_Y + 0.03 + rimYoff(a) - (0.11 + 0.05 * Math.cos(a - LEAN_DIR)) - 0.11;
  }

  const N_GILL_CHANNELS = 230;            // the organism's gill count (§5)
  const CHANNEL = TAU / N_GILL_CHANNELS;
  // Exit weighting, delta order: the one visible stream feeds the source
  // exit first and hardest (0.50), then the second (0.28), then the third.
  const W_EXIT0 = 0.50, W_EXIT1 = 0.78; // cumulative: <0.50 -> 0, <0.78 -> 1, else 2
  // How much brighter a fully-performing dot reads than its base shed color.
  const PLUME_GAIN = 1.35;
  // Taste-dial pearl floor: the knot-pearl richness never scales below this
  // share, so a faint sparkle keeps the labels' anchors alive even near T = 0.
  const PEARL_FLOOR = 0.18;
  // ---- ARRIVAL SPREAD (2026-08-07, Hannah's "they just flash up" report) ----
  // A stream's light must arrive as growth, not as a switch. Both of the
  // ramps that carry a dot's brightness are therefore spread across as much
  // of that exit's reveal as their choreography allows, both riding the SAME
  // per-dot hash (stagW, the reveal-warped stagger built in initSteer) — the
  // spread is what makes a cohort read as arriving rather than appearing.
  // Every one of these is exact at reveal 1, which is what keeps the Inspire
  // rest and p = 0 bit-identical.
  //   CONV_*  — the conversion ramp: RAMP is one dot's own span, STAG the
  //             span of starts across the cohort. RAMP + STAG = the reveal at
  //             which the last dot completes (resident 1.00; the migrants must
  //             be done when their walk front lands, so 0.55).
  //   RG_*    — the migrant draw-on gate's opening. OPEN is the reveal at
  //             which the LAST dot's gate starts to travel, STAG how far
  //             earlier the first one's does. All reach 1 at reveal 1.
  //   GATE_*  — the gate's own window in u3: TOP scales the sweep, WIDE is the
  //             soft edge. TOP - WIDE must stay >= 1 or the rest stops being
  //             an identity (u3 <= 1 has to clamp the smoothstep to zero).
  const CONV_RAMP_RES = 0.26, CONV_STAG_RES = 0.74;
  const CONV_RAMP_MIG = 0.22, CONV_STAG_MIG = 0.33;
  const RG_OPEN = 0.55, RG_STAG = 0.42;
  const GATE_TOP = 1.30, GATE_WIDE = 0.25;
  // A hero recycle (or any teleport) moves a dot far more than one drift frame.
  const TELEPORT2 = 0.09; // (0.3 units)^2
  // Overlapping dim regions never fully erase a spore.
  const MAX_TOTAL_DIM = 0.85;

  // seat bookkeeping (watchdog contract with 'spore-drift' above)
  let frameNo = 0, lastDriveFrame = -1;
  let exits = null;                       // claim: static exit geometry/anchors

  // ---- steer state (split/braid modes) ----
  const randT = makeRng(9127);
  const gaussT = () => gaussOf(randT);
  const randC = makeRng(3187);            // core cohort — own stream (see above)
  let N = 0, inited = false, wasActive = false;
  // per-dot STATIC assignment (filled at initSteer)
  let exIdx, stag, stagW, oR, oAz, oY, az0, azS2, rimRi, rimYi, rimRs, rimYs,
      offR, offY, spanA, s1a, s2a, s3a, riseA, leanA, curlA, spA,
      perA, ph0A, h1A, h2A, sdA, dropA, knotA, coreA;
  // per-dot DYNAMIC state
  let heroP, lastW, writ, lastCv;
  // the dimmer feed: cv = conversion, pw = plume brightness term
  const feed = { cv: null, pw: null, any: false };

  // ---- dim state (color mode) ----
  let colorBase = null, dimActive = false;
  // scratch: per-region scalars, rebuilt each drive (regions.length ~9; flat
  // parallel arrays so the 4,200-dot loop touches no objects)
  const ax = [], ay = [], az = [], bx = [], by = [], bz = [], ab2 = [],
        r0 = [], r1 = [], kk = [];

  // ?tkdbg=1 — perf + animator-order probe hooks (QA)
  // (parsed once, in ../flags.js — THE flag registry)
  const dbg = TKDBG;
  let perfAcc = 0, perfN = 0;

  function initSteer() {
    if (!exits || exits.length < 3) return false;
    N = sporePts.geometry.attributes.position.count;
    exIdx = new Uint8Array(N); dropA = new Uint8Array(N);
    stag = new Float32Array(N); stagW = new Float32Array(N);
    oR = new Float32Array(N); oAz = new Float32Array(N); oY = new Float32Array(N);
    az0 = new Float32Array(N); azS2 = new Float32Array(N);
    rimRi = new Float32Array(N); rimYi = new Float32Array(N);
    rimRs = new Float32Array(N); rimYs = new Float32Array(N);
    offR = new Float32Array(N); offY = new Float32Array(N);
    spanA = new Float32Array(N);
    s1a = new Float32Array(N); s2a = new Float32Array(N); s3a = new Float32Array(N);
    riseA = new Float32Array(N); leanA = new Float32Array(N);
    curlA = new Float32Array(N); spA = new Float32Array(N);
    perA = new Float32Array(N); ph0A = new Float32Array(N);
    h1A = new Float32Array(N); h2A = new Float32Array(N); sdA = new Float32Array(N);
    knotA = new Float32Array(N); coreA = new Float32Array(N);
    heroP = new Float32Array(N * 3); lastW = new Float32Array(N * 3);
    writ = new Uint8Array(N);
    lastCv = new Float32Array(N);   // last frame's cvT — the retire-in-place edge detector
    feed.cv = new Float32Array(N);
    feed.pw = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      // destination exit, weighted toward the source stream's own plume
      const wr = randT();
      const e = wr < W_EXIT0 ? 0 : wr < W_EXIT1 ? 1 : 2;
      const spec = exits[e];
      exIdx[i] = e;
      stag[i] = randT();
      // ARRIVAL SPREAD, second half: a stagger that is uniform in REVEAL is
      // not uniform on SCREEN, because the chapter drives each exit's reveal
      // as a smoothstep of progress — the reveal crawls at both ends and
      // sprints through the middle, so a flat stagger piles most of the
      // cohort's crossings into the middle third of the scroll. Pre-warping
      // the hash through the same smoothstep puts proportionally more dots
      // where the reveal is slow, which is what makes the arrival even in the
      // thing the visitor actually experiences: time. stag itself is left
      // alone — every other assignment that reads it keeps its approved value.
      stagW[i] = stag[i] * stag[i] * (3 - 2 * stag[i]);

      // destination lane, snapped between real gill channels
      const lane = Math.round((gaussT() * 0.34) / CHANNEL) * CHANNEL
                 + (randT() - 0.5) * CHANNEL * 0.4;
      const a = spec.az + lane;
      az0[i] = a;

      // birth point — ALWAYS in the source wedge (the delta rule): exit 0's
      // own lane IS the source sector; migrants get their own source lane
      const srcLane = Math.round((gaussT() * 0.34) / CHANNEL) * CHANNEL
                    + (randT() - 0.5) * CHANNEL * 0.4;
      const aBirth = e === 0 ? a : exits[0].az + srcLane;
      const u0 = 0.48 + Math.pow(randT(), 0.8) * 0.34;
      const o = capUnderPt(u0, aBirth);
      o.y -= 0.015 + randT() * 0.05;
      oR[i] = Math.hypot(o.x, o.z);
      oAz[i] = Math.atan2(o.z, o.x);
      oY[i] = o.y;

      rimRi[i] = rimRad(a) + 0.03 + randT() * 0.10;
      rimYi[i] = rimYof(a) - 0.02 + randT() * 0.06;
      rimRs[i] = rimRad(aBirth) + 0.05;
      rimYs[i] = rimYof(aBirth);
      offR[i] = rimRi[i] - rimRad(a);
      offY[i] = rimYi[i] - rimYof(a);

      const isDrop = randT() < 0.15;
      dropA[i] = isDrop ? 1 : 0;
      riseA[i] = isDrop ? (0.5 + randT() * 1.1)
                        : spec.riseMin + randT() * (spec.riseMax - spec.riseMin);
      // D17: every plume rises along the breeze axis at ~full strength (the
      // organized column must OVERLAY the drift envelope) — per-dot jitter
      // only. The rand draw is KEPT and remapped (0.8..1.25 -> 0.94..1.06)
      // so every later assignment in this stream stays byte-identical.
      leanA[i] = 0.94 + ((0.8 + randT() * 0.45) - 0.8) * 0.2667;
      const strand = i % 9 < 3 ? 0 : (i % 9 < 6 ? 1 : 2);
      curlA[i] = (strand - 1) * 0.30 + gaussT() * 0.09;
      spA[i] = strand * 2.094 + gaussT() * 0.3;

      perA[i] = 7.0 + randT() * 8.5;
      ph0A[i] = randT();
      h1A[i] = randT(); h2A[i] = randT(); sdA[i] = randT() * 1000;
      knotA[i] = spec.knot;
      // core cohort: ~32% of dots ride TIGHT on their winding strand and
      // carry the knot cadence hottest, so each braid resolves as a defined
      // sinuous core at rest.
      const coreR = randC();
      coreA[i] = coreR < 0.32 ? 0.55 + randC() * 0.45 : 0.0;

      // stage boundaries (coh = 0 — steering carries no hover coherence)
      const migF = e > 0;
      azS2[i] = aBirth + (h1A[i] - 0.5) * 0.05;
      spanA[i] = (a + curlA[i]) - azS2[i];
      s1a[i] = migF ? 0.10 : 0.16;
      s2a[i] = migF ? 0.24 : 0.40;
      s3a[i] = migF
        ? s2a[i] + 0.12 + 0.10 * Math.abs(spanA[i]) + (h2A[i] - 0.5) * 0.06
        : Math.min(0.86, s2a[i] + 0.10 + h2A[i] * 0.22);
    }
    inited = true;
    return true;
  }

  // ---- ARRIVE NEARBY (2026-08-09, D24 — Hannah's sixth spore report:
  // "it particularly happens when I scroll BACK to the Inspire section
  // from the Connect"). ----------------------------------------------------
  //
  // Retire-in-place (D23) made the FALLING half of the reveal lighting-only,
  // and its residual named this half: a rising conversion must move dots or
  // the braid never forms, so a fresh page entering Inspire from the Connect
  // side gathered the whole shed from the diffuse cloud across the exit
  // leg's ~Δp 0.04 reveal window — measured 12.6 u/s deliberate / 46 u/s
  // brisk at direction coherence 0.38, net 2.18 u per dot, 3,513 of 4,200
  // dots over a unit, in open view. The same mass migration D23 removed,
  // mirrored.
  //
  // Some travel is inherent: the dot must END on its braid path or the three
  // streams never read (c6bbbab), and it is inherent in AGGREGATE too — the
  // braid at any instant is a concentrated filament set inside a volumetric
  // cloud, so ANY dot-to-slot bijection has a transport floor (measured:
  // nearest-free-slot matching cuts mean travel 2.18 -> 1.79 u, not to
  // zero). The fix is therefore two halves that compose:
  //   1. ARRIVE NEARBY (here): the dot-to-slot pairing was frozen at
  //      initSteer from an RNG stream — pure convention, never geometry.
  //      At every seat ENGAGE (the !wasActive prime, the frame conversion
  //      begins from quiet), each still-unconverted dot is re-paired with
  //      the nearest free slot of its own exit, so the assignment absorbs
  //      the local share of the travel.
  //   2. THE GATHER DRIVE (chapter-side, passed into steer below): the
  //      transport share that remains is paced over ~2.3x the scroll, which
  //      lands the inbound gather at the approved Mission-side arrival
  //      gesture's own measured rate (see the D24 doc for the table).
  //
  // Why this is safe, stated as invariants rather than hopes:
  //   · A swap between two dots with conv = 0 is INVISIBLE at the swap
  //     frame by construction: the steer loop's cease branch renders
  //     nothing from the slot tuple while conv <= 0. Converted dots are
  //     never touched (eligibility is conv <= 0, computed exactly as the
  //     loop below computes it), so no rendered position changes on the
  //     refit frame — bit-identical, not approximately.
  //   · cv purity (the D22 forward/reverse gate) holds by construction:
  //     conv reads ONLY exIdx + stagW + eff, and those stay with the DOT.
  //     Only the slot GEOMETRY moves (path, stage clock, cohort dressing).
  //     Swaps are exit-local, so exIdx is untouched and the 50/28/22 exit
  //     weighting, the delta rule and the sequential cascade are exact.
  //   · The braid at any reveal is the same SET of slot paths as before —
  //     the pairing is the only thing that changes — so the three streams'
  //     structure (density profile, core cohort, knot cadence) is
  //     unchanged; only which dot carries which strand differs.
  //   · Landing frames are byte-identical: a ?capture=/?p= deep link at the
  //     rest engages at reveal 1, where every dot's conv is already 1 —
  //     zero eligible dots, refit is a no-op, the inspire golden does not
  //     move. At p = 0 the seat never engages at all (mission untouched).
  //
  // The path evaluator below is a POSITION-ONLY, WOBBLE-FREE mirror of the
  // staged path in steer() — a matching heuristic, not a render path. If
  // steer()'s choreography moves, this only needs to stay roughly true:
  // divergence costs matching quality (a slightly longer settle), never
  // correctness. See journey-v6-plan/07-chapter-inspire.md, D24.
  function slotPoint(i, mig, tNow, leanScale, mEl, out) {
    const migF = exIdx[i] > 0;
    const h1 = h1A[i], h2 = h2A[i];
    const s1 = s1a[i], s2 = s2a[i], s3 = s3a[i];
    const rimR = rimRi[i], rimY = rimYi[i], a0 = az0[i], curl = curlA[i];
    let t = tNow / perA[i] + ph0A[i]; t -= Math.floor(t);
    let r, y, azP, xLean = 0, zLean = 0;
    if (t < s1) {
      r = oR[i]; y = oY[i]; azP = oAz[i];
    } else if (t < s2) {
      const u1s = (t - s1) / (s2 - s1);
      const u1 = u1s * u1s * (3 - 2 * u1s);
      const rT = migF ? rimRs[i] : rimR;
      const yT = migF ? rimYs[i] + (rimY - rimYof(a0)) : rimY;
      r = oR[i] + (rT - oR[i]) * u1;
      y = (oY[i] - 0.05) + (yT - (oY[i] - 0.05)) * u1;
      azP = migF ? oAz[i] + (azS2[i] - oAz[i]) * u1 : oAz[i];
    } else if (t < s3) {
      const u2 = (t - s2) / (s3 - s2);
      if (migF) {
        const wSm = u2 * u2 * (3 - 2 * u2);
        const w = u2 + (wSm - u2) * 0.35;
        let wFront = mig * 1.12 - h1 * 0.10;
        wFront = wFront < 0 ? 0 : wFront > 1 ? 1 : wFront;
        const we = w < wFront ? w : wFront;
        azP = azS2[i] + spanA[i] * we;
        r = rimRad(azP) + 0.05 + offR[i] * we;
        y = rimYof(azP) + offY[i] + 0.10 * ss(0.72, 1, we);
      } else {
        azP = a0 + curl * u2;
        r = rimR + 0.05;
        y = rimY + 0.10 * u2;
      }
    } else {
      const u3 = (t - s3) / (1 - s3);
      if (dropA[i]) {
        y = rimY + 0.10 - u3 * u3 * riseA[i];
        azP = a0 + curl + (h1 - 0.5) * 0.3 * u3;
        r = rimR + 0.05 + u3 * (0.3 + h2 * 0.4);
      } else {
        const h = Math.pow(u3, 0.6 + h1 * 0.5);
        y = rimY + 0.10 + h * riseA[i];
        azP = a0 + curl;
        r = rimR + 0.05 + h * 0.14;
        xLean = leanScale * leanA[i] * h * riseA[i] * DRIFT_RX;
        zLean = leanScale * leanA[i] * h * riseA[i] * DRIFT_RZ;
      }
    }
    const lx = Math.cos(azP) * r + xLean, ly = y, lz = Math.sin(azP) * r + zLean;
    out[0] = mEl[0] * lx + mEl[4] * ly + mEl[8] * lz + mEl[12];
    out[1] = mEl[1] * lx + mEl[5] * ly + mEl[9] * lz + mEl[13];
    out[2] = mEl[2] * lx + mEl[6] * ly + mEl[10] * lz + mEl[14];
  }

  // D25: the refit is a BUDGETED, RESUMABLE JOB — queued at engage, advanced
  // a bounded slice per frame, applied atomically per exit — because even
  // optimized matching is real work (the one-shot version measured 360 ms at
  // a Connect-side engage before the D25 rewrites, and a single engage-frame
  // spike is exactly the hitch class this pass exists to remove). Three
  // properties make the slicing safe:
  //   · it only runs while EVERY reveal is exactly 0 (the floor's quiet
  //     runway), so no dot's eligibility can change under a pending job and
  //     no partially-applied pairing can ever pop a converting dot;
  //   · a still-unrefit dot at conv 0 renders nothing from its slot tuple,
  //     so the stagger is invisible by the same argument as the refit;
  //   · if light begins before the queue drains (only possible at a hard
  //     brisk scrub), the remaining slices are ABANDONED un-applied and
  //     those cohorts keep their RNG pairing — the same graceful tail D24
  //     already shipped for dots whose conv had begun at engage.
  let refitQueue = null;   // exits still to job, source first
  let refitJob = null;     // the in-flight exit job

  function refitBuild(e, tNow, leanScale, mEl) {
    // eligible = conv <= 0 under a zero reveal — i.e. the whole cohort;
    // computed with the same expression the steer loop uses, so the two can
    // never disagree about who is convertible.
    const p3 = [0, 0, 0];
    const idx = [];
    for (let i = 0; i < N; i++) {
      if (exIdx[i] !== e) continue;
      const conv = e === 0
        ? ss(0, CONV_RAMP_RES, 0 - stagW[i] * CONV_STAG_RES)
        : ss(0, CONV_RAMP_MIG, 0 - stagW[i] * CONV_STAG_MIG);
      if (conv <= 0) idx.push(i);
    }
    const n = idx.length;
    if (n < 2) return null;
    // slot world points (of each member's CURRENT slot, at reveal 0 — the
    // walk fronts are parked at the source, which is where an unlit slot
    // genuinely sits) + a dense linked-cell grid over the slot cloud's own
    // bbox, integer arithmetic only: head[cell] -> first slot, next[slot]
    // -> chain; consumed slots stay in their chain and are skipped by
    // `used` (cells are short — a lazy skip beats restructuring).
    const sx = new Float32Array(n), sy = new Float32Array(n), sz = new Float32Array(n);
    let mnx = Infinity, mny = Infinity, mnz = Infinity,
        mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
    for (let k = 0; k < n; k++) {
      slotPoint(idx[k], 0, tNow, leanScale, mEl, p3);
      sx[k] = p3[0]; sy[k] = p3[1]; sz[k] = p3[2];
      if (p3[0] < mnx) mnx = p3[0]; if (p3[0] > mxx) mxx = p3[0];
      if (p3[1] < mny) mny = p3[1]; if (p3[1] > mxy) mxy = p3[1];
      if (p3[2] < mnz) mnz = p3[2]; if (p3[2] > mxz) mxz = p3[2];
    }
    const gx0 = Math.floor(mnx), gy0 = Math.floor(mny), gz0 = Math.floor(mnz);
    const nx = Math.floor(mxx) - gx0 + 1,
          ny = Math.floor(mxy) - gy0 + 1,
          nz = Math.floor(mxz) - gz0 + 1;
    const head = new Int32Array(nx * ny * nz).fill(-1);
    const next = new Int32Array(n);
    for (let k = 0; k < n; k++) {
      const c = (Math.floor(sx[k]) - gx0)
              + (Math.floor(sy[k]) - gy0) * nx
              + (Math.floor(sz[k]) - gz0) * nx * ny;
      next[k] = head[c]; head[c] = k;
    }
    const freeList = new Int32Array(n), freePos = new Int32Array(n);
    for (let k = 0; k < n; k++) { freeList[k] = k; freePos[k] = k; }
    return {
      e, n, k: 0, idx, sx, sy, sz,
      gx0, gy0, gz0, nx, ny, nz, head, next,
      used: new Uint8Array(n), freeList, freePos, freeN: n,
      srcOf: new Int32Array(n),
    };
  }

  // greedy nearest-free-slot match, dot order fixed (deterministic), up to
  // `budget` dots per call. Ring limit 2: once the near field is consumed
  // most dots have no free slot within reach anyway, so deeper rings were
  // ~1,225 cube probes per dot of wasted work before the fallback ran
  // regardless; the free-list fallback is exact and scans only what is
  // actually still free.
  function refitMatch(job, budget) {
    const { n, idx, sx, sy, sz, gx0, gy0, gz0, nx, ny, nz, head, next,
            used, freeList, freePos, srcOf } = job;
    const kEnd = Math.min(n, job.k + budget);
    let freeN = job.freeN;
    for (let k = job.k; k < kEnd; k++) {
      const i3 = idx[k] * 3;
      const hx = heroP[i3], hy = heroP[i3 + 1], hz = heroP[i3 + 2];
      const cx = Math.floor(hx) - gx0, cy = Math.floor(hy) - gy0, cz = Math.floor(hz) - gz0;
      let best = -1, bd = Infinity;
      let foundAt = -1;
      for (let ring = 0; ring <= 2; ring++) {
        if (foundAt >= 0 && ring > foundAt + 1) break;  // one guard ring past first hit
        for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring) continue;
          const px2 = cx + dx, py2 = cy + dy, pz2 = cz + dz;
          if (px2 < 0 || px2 >= nx || py2 < 0 || py2 >= ny || pz2 < 0 || pz2 >= nz) continue;
          for (let j = head[px2 + py2 * nx + pz2 * nx * ny]; j >= 0; j = next[j]) {
            if (used[j]) continue;
            const ddx = sx[j] - hx, ddy = sy[j] - hy, ddz = sz[j] - hz;
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 < bd) { bd = d2; best = j; }
          }
        }
        if (best >= 0 && foundAt < 0) foundAt = ring;
      }
      if (best < 0) {
        // sparse tail: scan only what is actually still free
        for (let fi = 0; fi < freeN; fi++) {
          const j = freeList[fi];
          const ddx = sx[j] - hx, ddy = sy[j] - hy, ddz = sz[j] - hz;
          const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 < bd) { bd = d2; best = j; }
        }
      }
      used[best] = 1;
      const fp = freePos[best], lastF = freeList[freeN - 1];
      freeList[fp] = lastF; freePos[lastF] = fp; freeN--;
      srcOf[k] = best;
    }
    job.freeN = freeN;
    job.k = kEnd;
    return job.k >= n;
  }

  function refitApply(job) {
    const { e, n, idx, sx, sy, sz, srcOf } = job;
    if (dbg) {
      // ?tkdbg=1 — matching quality probe (QA only)
      let pre = 0, post = 0, far = 0;
      for (let k = 0; k < n; k++) {
        const i3 = idx[k] * 3;
        const hx = heroP[i3], hy = heroP[i3 + 1], hz = heroP[i3 + 2];
        let d = Math.hypot(sx[k] - hx, sy[k] - hy, sz[k] - hz);
        pre += d;
        const j = srcOf[k];
        d = Math.hypot(sx[j] - hx, sy[j] - hy, sz[j] - hz);
        post += d; if (d > 1) far++;
      }
      (window.__refit = window.__refit || []).push(
        { e, n, pre: +(pre / n).toFixed(3), post: +(post / n).toFixed(3), far });
    }
    // apply the permutation to the slot tuple — the dot keeps its identity
    // (exIdx, stag, stagW, writ, lastCv); the slot geometry moves.
    const tuple = [az0, azS2, spanA, oR, oAz, oY, rimRi, rimYi, rimRs, rimYs,
                   offR, offY, s1a, s2a, s3a, riseA, leanA, curlA, spA,
                   perA, ph0A, h1A, h2A, sdA, dropA, knotA, coreA];
    const tmp = new Array(n);
    for (const A of tuple) {
      for (let k = 0; k < n; k++) tmp[k] = A[idx[k]];
      for (let k = 0; k < n; k++) A[idx[k]] = tmp[srcOf[k]];
    }
    // RENDER-INVARIANT APPLY (D25). Under the standing floor a conv-0 dot is
    // no longer parked on heroP — it renders at heroP + (slot − heroP)·fl —
    // so a bare tuple swap would jump it by fl·(newSlot − oldSlot) in one
    // frame: measured 5.8 u/s of unlit convulsion in the runway before this
    // rebase existed. Same algebra as retire-in-place: choose heroP' so the
    // rendered position is unchanged by the swap,
    //     heroP' = heroP + (oldPt − newPt) · fl / (1 − fl),
    // where oldPt/newPt are the dot's slot points before/after the
    // permutation (from the job's own table; a few frames stale, which
    // bounds the residual at fl · the slot's drift over those frames —
    // orders below perception). fl ≤ FLOOR_B·T ≈ 0.30, so the division is
    // tame; at fl = 0 this is exactly a no-op, byte for byte.
    const fl = job.fl || 0;
    if (fl > 1e-5) {
      const g = fl / (1 - fl);
      for (let k = 0; k < n; k++) {
        const i3 = idx[k] * 3;
        const j = srcOf[k];
        heroP[i3]     += (sx[k] - sx[j]) * g;
        heroP[i3 + 1] += (sy[k] - sy[j]) * g;
        heroP[i3 + 2] += (sz[k] - sz[j]) * g;
      }
    }
  }

  const REFIT_BUDGET = 1100;  // dots matched per frame — a few ms worst case

  function refitStep(eff, tNow, leanScale, mEl, fl) {
    if (!refitQueue && !refitJob) return;
    if (eff[0] > 0 || eff[1] > 0 || eff[2] > 0) {
      // light has begun: abandon what has not been APPLIED — eligibility is
      // frozen-by-zero-reveal no longer, and a tuple swap under a converting
      // dot would pop it. Whole exits already applied stay applied.
      refitQueue = null; refitJob = null;
      return;
    }
    const tR0 = dbg ? performance.now() : 0;
    // one work unit per frame: build THEN a first match slice in the same
    // call, apply the moment a job completes — the whole queue drains in
    // five frames (2 + 2 + 1), which fits inside even the MAX_SCRUB_RATE
    // backward runway (engage -> first light ~6.5 frames), so the migrant
    // cohorts are no longer abandoned at a brisk entry.
    if (!refitJob) {
      const e = refitQueue.shift();
      if (!refitQueue.length) refitQueue = null;
      refitJob = refitBuild(e, tNow, leanScale, mEl);
    }
    if (refitJob && refitMatch(refitJob, REFIT_BUDGET)) {
      refitJob.fl = fl;                                 // render-invariant rebase
      refitApply(refitJob);                             // atomic apply
      refitJob = null;
    }
    if (dbg) {
      window.__tkRefitMs = +((window.__tkRefitMs || 0)
        + (performance.now() - tR0)).toFixed(2);
    }
  }

  /** split/braid steering — runs inside drive(), i.e. from the driver's own
   *  animator, AFTER 'spore-drift' has integrated the buffer this frame.
   *  eff: per-exit effective reveals; mw: the mushroom's matrixWorld;
   *  leanScale: the live lean damp; T: the TRANSFORM taste value (0..1 —
   *  1 = full reorganization; conv, not conv*T, stays the choreography /
   *  cease gate, so restore discipline is identical at every T).
   *
   *  floor: THE STANDING ROUTE-RIDE (2026-08-09, Hannah's seventh report:
   *  "a completely different stream of spores ... appears when I enter the
   *  Inspire section"). Six rounds of fixes each made the boundary
   *  transform smaller, and none could remove it, because the model itself
   *  held two unrelated arrangements — a free drift and a designed braid —
   *  and asked a reveal to swap between them at a section edge. The floor
   *  retires that dualism: inside the chapter's reach (a pure-in-p window
   *  the driver passes, ramped in across the QUIET approach runways on
   *  both sides, zero at every rest that has a golden) the shed's dots are
   *  ALWAYS partly on their routes — position drawn `floor` of the way to
   *  their slot paths, and therefore already carrying the routes' living
   *  motion — before, during and after anything lights. Entering Inspire
   *  no longer builds the braid out of a foreign cloud; it tightens and
   *  lights routes the dots were already travelling. The blend composes as
   *  a LERP, cvP = fl·(1−conv·gather) + T·(conv·gather), so conv = 1 gives
   *  exactly T (the rest golden is bit-identical by arithmetic, not by
   *  tolerance) and conv = 0 gives exactly fl. Lighting still rides conv
   *  alone — a floored dot at conv 0 renders at its full ambient colour —
   *  so the floor is position/motion only and can never self-ignite. */
  function steer(eff, tNow, mw, leanScale, transform, gather, floor) {
    const fl0 = floor === undefined ? 0 : floor < 0 ? 0 : floor > 1 ? 1 : floor;
    const drive = eff[0] > 1e-4 || eff[1] > 1e-4 || eff[2] > 1e-4 || fl0 > 1e-4;
    if (!drive && !wasActive) { feed.any = false; return; }
    if (!inited && !initSteer()) { feed.any = false; return; }
    const T = transform < 0 ? 0 : transform > 1 ? 1 : transform;
    // The floor is part of the reorganization, so it rides the taste dial
    // too: at T = 0 the shed never leaves its free drift, at any floor.
    const fl = fl0 * T;
    // THE GATHER DRIVE (D24): the POSITION blend's own schedule, 1 at every
    // rest and landing frame, riding a much wider scroll window than the
    // reveal on the chapter's exit side. Lighting stays on eff exactly as
    // shipped; only how far a dot has PHYSICALLY travelled onto its slot
    // rides conv * T * gather. Forward (gather falling) this is invisible —
    // a falling position blend is absorbed in place (D23) — so its entire
    // visible effect is to spread the INBOUND gather over ~2.3x the scroll.
    const gT = gather === undefined ? 1 : gather < 0 ? 0 : gather > 1 ? 1 : gather;
    const pearlScale = PEARL_FLOOR + (1 - PEARL_FLOOR) * T;

    const t0 = dbg ? performance.now() : 0;
    const attr = sporePts.geometry.attributes.position;
    const arr = attr.array;

    if (!wasActive) {
      // first live frame: the buffer is pure hero state — prime the shadow,
      // then queue the re-pairing of every still-unconverted dot with the
      // nearest free slot of its own exit (ARRIVE NEARBY, D24; budgeted and
      // sliced across the floor's quiet runway, D25 — see refitStep above.
      // The queue only ever RUNS while every reveal is 0, so at a landing
      // frame — where the reveal is already 1 — it is dropped whole on the
      // first step and the goldens see the RNG pairing they were shot with).
      heroP.set(arr); lastW.set(arr); lastCv.fill(0);
      if (dbg) window.__tkRefitMs = 0;
      refitQueue = [0, 1, 2];
      refitJob = null;
    }
    refitStep(eff, tNow, leanScale, mw.elements, fl);

    // per-exit gates
    const mE = mw.elements;
    const cv = feed.cv, pw = feed.pw;
    let anyConv = false, wroteAny = false;
    const rev0 = eff[0], rev1 = eff[1], rev2 = eff[2];
    const mig1 = ss(0, 0.55, rev1), mig2 = ss(0, 0.55, rev2);

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      // ---- hero shadow: absorb what spore-drift added since our last write.
      // A teleport (the drift recycling a spent spore to its gill origin) is
      // accepted as the dot's new hero home.
      let bx2 = arr[i3], by2 = arr[i3 + 1], bz2 = arr[i3 + 2];
      let dx = bx2 - lastW[i3], dy = by2 - lastW[i3 + 1], dz = bz2 - lastW[i3 + 2];
      if (dx * dx + dy * dy + dz * dz > TELEPORT2) {
        heroP[i3] = bx2; heroP[i3 + 1] = by2; heroP[i3 + 2] = bz2;
      } else {
        heroP[i3] += dx; heroP[i3 + 1] += dy; heroP[i3 + 2] += dz;
      }

      const e = exIdx[i];
      const rev = e === 0 ? rev0 : e === 1 ? rev1 : rev2;
      // conversion: hash-staggered pure function of the exit's reveal, and
      // the ramp the dot's brightness rides (pw = GAIN * env * conv). The
      // stagger is therefore the population's arrival spread, not a detail:
      // a dot's own crossing is invisible, a cohort crossing together is the
      // flash. Both spans are pushed to the limit their choreography allows
      // — the resident to the full reveal, the migrants to the walk front's
      // arrival at rev 0.55 — so the crossings are as spread as the
      // choreography can carry. Both still complete exactly at their stated
      // reveal for every dot, so nothing about the rest frame moves.
      const sw = stagW[i];
      const conv = e === 0
        ? ss(0, CONV_RAMP_RES, rev - sw * CONV_STAG_RES)
        : ss(0, CONV_RAMP_MIG, rev - sw * CONV_STAG_MIG);
      // taste dial: cvL is the LIGHTING conversion (the dimmer's ambient
      // mix — pure in (eff, hash), the D22 gate); cvP is the POSITION
      // conversion — how far the dot has actually left its drift — which
      // additionally rides the gather schedule (D24) and never falls below
      // the standing route-ride floor (D25). The lerp form makes conv = 1
      // exactly T and conv = 0 exactly fl — see the steer() doc. conv
      // keeps the choreography/cease gate; a dot releases to the drift
      // only where BOTH its conversion and the floor are zero.
      const cvL = conv * T;
      const cg = conv * gT;
      const cvP = fl * (1 - cg) + T * cg;
      cv[i] = cvL;
      if (conv <= 0 && fl <= 1e-4) {
        pw[i] = 0;
        if (writ[i]) {
          // steered last frame, conversion just reached zero: hand the dot
          // back IN PLACE — the buffer already holds where performing left
          // it, so ceasing is adopting that position as the dot's ambient
          // home and letting the drift re-own it from there. Nothing is
          // written and nothing moves. This is also the discrete-jump-safe
          // face of the absorb below: however much conversion a fast scrub
          // dropped in one frame, the dot stays put. (RETIRE IN PLACE,
          // 2026-08-09 — Hannah's fifth spore report.)
          writ[i] = 0;
          lastCv[i] = 0;
          heroP[i3] = bx2; heroP[i3 + 1] = by2; heroP[i3 + 2] = bz2;
          lastW[i3] = bx2; lastW[i3 + 1] = by2; lastW[i3 + 2] = bz2;
        } else {
          // hero-owned: track exactly (no float accumulation drift)
          heroP[i3] = bx2; heroP[i3 + 1] = by2; heroP[i3 + 2] = bz2;
          lastW[i3] = bx2; lastW[i3 + 1] = by2; lastW[i3 + 2] = bz2;
        }
        continue;
      }
      if (conv > 0) anyConv = true;   // the lighting feed's gate: floored-
                                      // but-unconverted dots carry no light
      writ[i] = 1;

      // ---- staged path: born between gills -> lateral -> rim walk / curl
      // -> braided rise along the drift axis (split/braid modes)
      const migF = e > 0;
      const mig = e === 1 ? mig1 : mig2;
      // per-dot draw-on progress (the gate below). The resident's is the
      // literal 1 at every reveal; a migrant dot opens its gate on its OWN
      // share of the reveal, RG_STAG earlier at sw = 1 than at sw = 0.
      const rg = e === 0 ? 1 : ss(RG_OPEN - sw * RG_STAG, 1, rev);
      const h1 = h1A[i], h2 = h2A[i], sd = sdA[i], sp = spA[i];
      const s1 = s1a[i], s2 = s2a[i], s3 = s3a[i];
      const rimR = rimRi[i], rimY = rimYi[i], a0 = az0[i], curl = curlA[i];
      let t = tNow / perA[i] + ph0A[i]; t -= Math.floor(t);

      let r, y, azP, env;
      let xLean = 0, zLean = 0;
      if (t < s1) {
        // born between the gills, shimmering in place
        const u0 = t / s1;
        r = oR[i] + Math.sin(tNow * 0.5 + sd) * 0.03;
        y = oY[i] - 0.05 * u0 + Math.sin(tNow * 0.6 + sd * 1.3) * 0.015;
        azP = oAz[i] + Math.sin(tNow * 0.35 + sd * 2.1) * 0.012;
        env = ss(0, 0.45, u0) * 0.85 * (migF ? 0.72 : 1) * T;
      } else if (t < s2) {
        // lateral travel between the lamellae toward the margin
        const u1s = (t - s1) / (s2 - s1);
        const u1 = u1s * u1s * (3 - 2 * u1s);
        const rT = migF ? rimRs[i] : rimR;
        const yT = migF ? rimYs[i] + (rimY - rimYof(a0)) : rimY;
        r = oR[i] + (rT - oR[i]) * u1;
        const yA = oY[i] - 0.05;
        y = yA + (yT - yA) * u1 - 0.10 * Math.sin(u1 * PI);
        const azA = oAz[i] + (h1 - 0.5) * 0.05 * u1;
        azP = migF ? azA + (azS2[i] - azA) * u1 : azA;
        env = 0.95 * (migF ? 0.72 : 1) * T;
      } else if (t < s3) {
        const u2 = (t - s2) / (s3 - s2);
        if (migF) {
          // rim migration — the delta current walking the real rim, clamped
          // at the reveal's advancing front (split mode)
          const wSm = u2 * u2 * (3 - 2 * u2);
          const w = u2 + (wSm - u2) * 0.35;
          let wFront = mig * 1.12 - h1 * 0.10;
          wFront = wFront < 0 ? 0 : wFront > 1 ? 1 : wFront;
          const we = w < wFront ? w : wFront;
          azP = azS2[i] + spanA[i] * we;
          const bobE = Math.sin(PI * we);
          r = rimRad(azP) + 0.05 + offR[i] * we
            + Math.sin(we * 9 + sp) * 0.07 * bobE;
          y = rimYof(azP) + offY[i] + 0.10 * ss(0.72, 1, we)
            + Math.sin(we * 12 + sp * 1.3 + tNow * 0.4) * 0.05 * bobE;
          const pl = 0.5 + 0.5 * Math.sin(we * 7 - tNow * 0.9 + sp);
          env = (0.55 + 0.45 * pl * pl) * (1 - ss(0, 0.10, w - wFront)) * T;
        } else {
          // resident plume: curl around the rim margin
          azP = a0 + curl * u2;
          const loops = 1 + h2 * 1.2;
          r = rimR + 0.05 + Math.sin(u2 * PI * loops + sp) * 0.10;
          y = rimY + Math.sin(u2 * PI * loops * 0.7 + 1 + sp) * 0.08 + 0.10 * u2;
          env = T;
        }
      } else {
        // braided rise (or sinking drop)
        const u3 = (t - s3) / (1 - s3);
        const eu = ss(0, 0.10, u3);
        if (dropA[i]) {
          y = rimY + 0.10 - u3 * u3 * riseA[i];
          azP = a0 + curl + (h1 - 0.5) * 0.3 * u3;
          r = rimR + 0.05 + u3 * (0.3 + h2 * 0.4);
          env = eu * (1 - ss(0.45, 0.95, u3)) * 0.5 * T;
        } else {
          const h = Math.pow(u3, 0.6 + h1 * 0.5);
          y = rimY + 0.10 + h * riseA[i];
          // core-cohort dots damp their scatter (tight) so each braid
          // resolves as a defined sinuous line inside the loose sheath the
          // majority carries; tightening is part of the reorganization, so
          // it scales with T
          const core = coreA[i];
          const tight = 1 - 0.70 * core * T;
          azP = a0 + curl
             + 0.13 * Math.sin(h * 5.1 + sp)
             + 0.07 * Math.sin(h * 9.7 + sp * 2.3 + tNow * 0.21)
             + 0.03 * Math.sin(tNow * 0.13 + sd * 3.7) * u3 * tight * 0.72;
          r = rimR + 0.05
            + 0.10 * Math.sin(h * 4.3 + sp * 1.7)
            + 0.05 * Math.sin(tNow * 0.17 + sd * 2.3)
            + (h1 - 0.5) * 0.09 * (0.4 + h) * tight * 0.72
            + h * 0.14;
          // D17: LINEAR in h along the drift's own ratios — a straight
          // diagonal matching the carry, never standing the column upright
          xLean = leanScale * leanA[i] * h * riseA[i] * DRIFT_RX;
          zLean = leanScale * leanA[i] * h * riseA[i] * DRIFT_RZ;
          // knot cadence (detail mode): hot dots travelling UP the core with
          // the flow, per-exit gain, hottest on the core cohort — brightness
          // modulation only, reversible, pure in (eff, time).
          const kn0 = 0.5 + 0.5 * Math.sin(h * 7.3 + sp * 1.9 - tNow * 0.55);
          const kn = kn0 * kn0 * kn0 * kn0;
          const knotV = knotA[i] * kn * (0.30 + 0.70 * core);
          // at T = 1 this is exactly (1 + 0.28*core + 1.15*knotV); toward
          // T = 0 the body term dies with T while the pearl richness keeps
          // the PEARL_FLOOR share — the faint sparkle that stays.
          env = eu * (1 - ss(0.62, 1, u3))
              * (T + (0.28 * core + 1.15 * knotV) * pearlScale);
        }
        // migrant rise draw-on gate (rl inert for the resident and at rev 1),
        // WITH A CONSERVATION FLOOR (2026-08-06, Hannah's third spore report).
        //
        // The gate may never take away more light than the dot has already
        // ceded. dim() runs `f = f * (1 - cv) + pw`, so a dot surrenders cvT
        // of its ambient shed colour as it converts — complete by rev ~0.30.
        // But rg only STARTS granting plume light near rev 0.55, and a dot's
        // stage is a free-running per-dot clock (t = tNow/perA + ph0A),
        // wholly independent of the reveal — so ~60% of a migrant cohort sits
        // in this branch at ANY reveal, not just after its walk front lands.
        // Ungated, every one of them rendered BLACK through that window:
        // 1,193 converted-and-dark dots at p 0.385 against a resting baseline
        // of 240, a -25.3% hole in the shed. Light leaving the volume and
        // coming back IS what "they become different spores" describes.
        //
        // Floored, a dot keeps at least the share of its plume light matching
        // the ambient it gave up, so the exchange is conservative per dot at
        // every reveal — the same law dim()'s own `f * (1 - cv) + pw` states.
        // The draw-on choreography survives on the unconverted share: at low
        // rev, conv (and so cvT) is ~0, the floor is ~0 and the gate is as it
        // was, which is what keeps arming invisible.
        //
        // SPREAD, NOT LOCKSTEP (2026-08-07). rg used to be one number per
        // exit per frame, so the window [g0, rl] swept every dot's clock
        // together: near the steep part of the sweep the whole cohort crossed
        // inside ~0.027 of reveal — a wipe, which is what a switch looks like.
        // rg is now per-dot (RG_STAG above), and the window's soft edge is
        // GATE_WIDE rather than 0.10, so a dot's own crossing is gentler and
        // the cohort's are spread. It still draws ON, it just draws.
        //
        // IDENTITY AT rev 1: rg = 1 -> rl = GATE_TOP = 1.30, g0 = 1.05, and
        // u3 <= 1, so ss() clamps to exactly 0 and drawOn is exactly 1 — the
        // expression collapses to `env *= 1`. The Inspire rest and p = 0 are
        // therefore untouched bit-for-bit, not merely approximately. Same for
        // the resident exit, whose rg is the literal 1 at every reveal. This
        // is why GATE_TOP - GATE_WIDE must stay >= 1.
        // See journey-v6-plan/07-chapter-inspire.md, 2026-08-06 and 08-07.
        const rl = rg * GATE_TOP;
        const g0 = rl - GATE_WIDE > 0 ? rl - GATE_WIDE : 0;
        const drawOn = 1 - ss(g0, rl + 0.001, u3);
        env *= drawOn + (1 - drawOn) * cvL;
      }

      // cap-local -> world through the live mushroom matrix
      const lx = Math.cos(azP) * r + xLean, ly = y, lz = Math.sin(azP) * r + zLean;
      const wx = mE[0] * lx + mE[4] * ly + mE[8] * lz + mE[12];
      const wy = mE[1] * lx + mE[5] * ly + mE[9] * lz + mE[13];
      const wz = mE[2] * lx + mE[6] * ly + mE[10] * lz + mE[14];

      // ---- RETIRE IN PLACE (2026-08-09, Hannah's fifth spore report:
      // "the spores still shift weirdly, like they MOVE POSITION to work
      // for the next section"). The blend below renders the dot at
      // heroP + (path - heroP) * cvP, so a FALLING position blend used to
      // march every
      // converted dot physically back toward its old drift position —
      // measured riding Inspire -> Connect, the whole population moved at
      // up to 19 u/s deliberate / 38 u/s brisk (the braid's own living
      // motion is ~1.3 u/s, ambient drift ~0.09 u/s) at direction
      // coherence 0.40, in open view, over the Δp ≈ 0.04 the exit leg
      // collapses the reveal in. That return trip IS the rearrangement
      // she keeps reporting, and no retiming can hide it: the shed never
      // leaves the frame on this leg, and D18's own rule bans a ramp
      // running backward in view.
      //
      // So the fall is absorbed instead: when cvP drops, the ambient home
      // moves toward the path by exactly the share the blend is about to
      // give back — solve heroP' from
      //     heroP' + (path - heroP') * cvP  ==  heroP + (path - heroP) * c0
      // (same path point), i.e. heroP' = path + (heroP - path) * f with
      // f = (1 - c0) / (1 - cvP) — and the rendered position does not move
      // for the fall AT ALL: frame-over-frame it carries only its drift
      // share and its live path share, exactly what a dot at constant
      // conversion shows. A RISING cvP is untouched — the arrival gather
      // stays the approved gesture, paced by the gather drive (D24) — so
      // at every landing frame (rest, ?p=, ?capture=) lastCv rises
      // monotonically from the prime's 0 and this branch never runs: the
      // rest frames are bit-identical. cv (the lighting feed) stays a pure
      // function of (reveal, hash) — the D22 forward/reverse agreement
      // gate is untouched.
      const c0 = lastCv[i];
      if (cvP < c0) {
        const f = (1 - c0) / (1 - cvP);
        heroP[i3]     = wx + (heroP[i3]     - wx) * f;
        heroP[i3 + 1] = wy + (heroP[i3 + 1] - wy) * f;
        heroP[i3 + 2] = wz + (heroP[i3 + 2] - wz) * f;
      }
      lastCv[i] = cvP;

      // the SAME dot slides from its own drift onto the path — by cvP, the
      // taste-dialled, gather-paced blend: at low T it bows toward the braid
      // and keeps most of its natural drift; at T = 1 it converts fully
      const px = heroP[i3] + (wx - heroP[i3]) * cvP;
      const py = heroP[i3 + 1] + (wy - heroP[i3 + 1]) * cvP;
      const pz = heroP[i3 + 2] + (wz - heroP[i3 + 2]) * cvP;
      arr[i3] = px; arr[i3 + 1] = py; arr[i3 + 2] = pz;
      lastW[i3] = px; lastW[i3 + 1] = py; lastW[i3 + 2] = pz;
      wroteAny = true;

      // brightness feed: plume term (the ambient term is (1 - cvT), applied
      // by the dim pass). Deliberately conv (not cvT): env already carries T
      // for the body brightness, and near T = 0 the pearl floor must still
      // ride the conversion stagger.
      pw[i] = PLUME_GAIN * env * conv;
    }

    if (wroteAny) attr.needsUpdate = true;
    feed.any = anyConv;
    wasActive = drive || anyConv;

    if (dbg) {
      perfAcc += performance.now() - t0; perfN++;
      if (perfN >= 60) {
        window.__tkPerf = +(perfAcc / perfN).toFixed(3);
        perfAcc = 0; perfN = 0;
      }
      window.__tkLast0 = arr[0]; // animator-order probe: must survive to render
    }
  }

  // ---- color mode: per-region dim + per-dot handover, byte-exact restore ----
  function restoreColors() {
    const attr = sporePts.geometry.attributes.color;
    attr.array.set(colorBase);                          // verbatim
    attr.needsUpdate = true;
    dimActive = false;
  }

  /** regions: [{ a, b, r0, r1, k }] — world-space capsule from a to b, full
   *  dim inside r0, feathered to untouched at r1, strength k (0..1, already
   *  scaled by the driver's reveal x taste). globalK: whole-shed hand-over.
   *  grad: { sx,sy,sz, d0,d1, k } distance-graded history dissolve. The
   *  per-dot exchange rides the steer feed:  F = f * (1 - cv[i]) + pw[i]
   *  — a converting dot swaps its ambient look for its plume look; the dim
   *  channels apply to the unconverted share only. All channels ~0 restores
   *  the base colors byte-exact. */
  function dim(regions, globalK, grad) {
    const tk = feed;
    let n = 0;
    if (regions) for (const rg of regions) {
      if (rg.k <= 0.004) continue;
      ax[n] = rg.a.x; ay[n] = rg.a.y; az[n] = rg.a.z;
      const dx = rg.b.x - rg.a.x, dy = rg.b.y - rg.a.y, dz = rg.b.z - rg.a.z;
      bx[n] = dx; by[n] = dy; bz[n] = dz;
      ab2[n] = Math.max(dx * dx + dy * dy + dz * dz, 1e-6);
      r0[n] = rg.r0; r1[n] = rg.r1; kk[n] = rg.k;
      n++;
    }
    const gradOn = grad && grad.k > 0.004;
    const tkOn = tk && tk.any && tk.cv;
    if (n === 0 && globalK <= 0.004 && !gradOn && !tkOn) { if (dimActive) restoreColors(); return; }
    if (!colorBase) colorBase = sporePts.geometry.attributes.color.array.slice(); // the ONE base copy
    dimActive = true;
    const attr = sporePts.geometry.attributes.color;
    const col = attr.array;
    const pos = sporePts.geometry.attributes.position.array;
    const tcv = tkOn ? tk.cv : null, tpw = tkOn ? tk.pw : null;
    let pi = 0;
    for (let i = 0; i < col.length; i += 3, pi++) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      let dimV = 0;
      for (let j = 0; j < n; j++) {
        const px = x - ax[j], py = y - ay[j], pz = z - az[j];
        let t = (px * bx[j] + py * by[j] + pz * bz[j]) / ab2[j];
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - bx[j] * t, dy = py - by[j] * t, dz = pz - bz[j] * t;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < r1[j]) {
          let s = d <= r0[j] ? 1 : 1 - (d - r0[j]) / (r1[j] - r0[j]);
          s = s * s * (3 - 2 * s);
          const v = kk[j] * s;
          if (v > dimV) dimV = v;   // max, not sum: overlaps must not over-darken
        }
      }
      if (dimV > MAX_TOTAL_DIM) dimV = MAX_TOTAL_DIM;
      // the global hand-over may exceed the capsule cap: at full reveal the
      // old curtain is gone (0.97) — the organized braid IS the shed now
      let g = globalK * 0.97;
      if (gradOn) {
        const hx = x - grad.sx, hy = y - grad.sy, hz = z - grad.sz;
        const hd = Math.sqrt(hx * hx + hy * hy + hz * hz);
        let hf = (hd - grad.d0) / (grad.d1 - grad.d0);
        hf = hf < 0 ? 0 : hf > 1 ? 1 : hf;
        hf = hf * hf * (3 - 2 * hf);
        const gh = grad.k * hf * 0.97;   // history dissolves; source survives
        if (gh > g) g = gh;
      }
      let f = 1 - (g > dimV ? g : dimV);
      // per-dot exchange: a converting dot swaps its ambient look for its
      // plume look; near T = 0 cv is ~0 but the pearl FLOOR still sparkles
      // through pw — so pw alone can open the branch.
      if (tkOn) {
        const c = tcv[pi];
        const w = tpw[pi];
        if (c > 0.0005 || w > 0.0005) f = f * (1 - c) + w;
      }
      col[i] = colorBase[i] * f;
      col[i + 1] = colorBase[i + 1] * f;
      col[i + 2] = colorBase[i + 2] * f;
    }
    attr.needsUpdate = true;
  }

  // ---- the ONE release path (see the header note) ----
  function releaseSeat() {
    lastDriveFrame = -1;
    refitQueue = null;   // a released seat abandons any un-run refit slices
    refitJob = null;
    if (inited && wasActive) {
      // RETIRE IN PLACE (2026-08-09): a released dot is handed to the drift
      // wherever it stands — the buffer is not touched, its position becomes
      // the dot's ambient home. (This path used to write arr = heroP, which
      // teleported every still-converted dot by cvT of its displacement in
      // one frame if the watchdog or a driver swap fired mid-reveal.)
      const arr = sporePts.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        if (!writ[i]) continue;
        const i3 = i * 3;
        writ[i] = 0;
        lastCv[i] = 0;
        heroP[i3] = arr[i3]; heroP[i3 + 1] = arr[i3 + 1]; heroP[i3 + 2] = arr[i3 + 2];
        lastW[i3] = arr[i3]; lastW[i3 + 1] = arr[i3 + 1]; lastW[i3 + 2] = arr[i3 + 2];
      }
    }
    wasActive = false;
    feed.any = false;
    if (dimActive) restoreColors();
  }

  /** The driver's per-frame hand on the seat. Called from the driver's own
   *  animator — i.e. AFTER 'spore-drift' integrated this frame (the journey's
   *  animators register after the organism's; see the ordering comment on
   *  registerDrift). Position steering runs first, then the color pass reads
   *  its per-dot feed — same frame, one call. */
  const seat = {
    drive({ eff, time, matrixWorld, leanScale = 1, transform = 1, gather = 1,
            floor = 0, regions = null, globalK = 0, grad = null }) {
      if (!system.driver) return;   // released seat: the handle is inert
      lastDriveFrame = frameNo;
      if (eff) steer(eff, time, matrixWorld, leanScale, transform, gather, floor);
      dim(regions, globalK, grad);
    },
    /** Warm-up (D25): allocate and assign the per-dot steering state at
     *  page load instead of on the first mid-scroll frame that needs it —
     *  initSteer() used to run inside the crossing itself and its cost
     *  landed as a hitch at the exact seam Hannah kept reporting. Pure
     *  allocation + the same deterministic RNG draws; a no-op if already
     *  initialized. */
    prime() { if (!inited) initSteer(); },
    /** QA: the per-dot conversion/brightness feed (?tkdbg adds perf probes). */
    feed,
    get active() { return wasActive; },
    get n() { return N; },
  };

  const system = {
    sporePts, sporeOrigin, sporeAge, sporeVel, BREEZE_DIR,
    shedSpores, registerDrift,
    // ---- driver seat (merge doc §3) ----
    // ONE driver at a time claims the seat with its static exit geometry and
    // gets the seat handle back; releasing (setDriver(null)) — like going
    // quiet, or silent — hands the dots to ambient drift IN PLACE, colors
    // byte-exact. Unclaimed, the seat does nothing by construction.
    driver: null,
    setDriver(d) {
      if (system.driver && system.driver !== d) releaseSeat();
      system.driver = d || null;
      if (!d) { releaseSeat(); return null; }
      // static claim: exit geometry/anchors ({ az, riseMin, riseMax, knot }
      // per exit) — the chapter's anatomy, passed as intent, never imported.
      exits = d.exits;
      return seat;
    },
  };
  return system;
}
