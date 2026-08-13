// journey-v6 — OWNED chapter, PRODUCTION (W4-C).
//
// The grey-box proxy is replaced by the APPROVED Spike B portrait-field
// treatment ("feels really nice" — motion review), ported against the
// journey's REAL camera leg:
//
//   owned-leg.js        samples the director's pure poseAt over the leg —
//                       every placement rule measures the actual polyline
//   owned-substrate.js  volumetric mycelial field (cords with travelling
//                       waves, asynchronous hyphae, authored voids, haze,
//                       soil-underside lid for both crossings)
//   owned-portraits.js  48-node contributor field: spike photo treatment,
//                       ember rims, strand termination, frame-cell
//                       stratification, 3.0-unit camera-path clearance
//
// This file owns the chapter contract the grey-box established (group /
// nodeIds / setArmed / setHot / nodeWorld), the three ownership pods and
// their claim-pulse behaviours (OW-3), and the growth-front exit gesture
// (OW-5). Parented to `scene`, a sibling of groundGroup, per adr-d3: soil
// does not sway, and a swaying substrate would shear the descent.
//
// COLOUR-PIPELINE NOTE for the grade-unification pass: Spike B calibrated
// its additive opacities with NO OutputPass (raw display-space sum). The
// journey renders through the hero composer — UnrealBloom(0.62/0.45/0.1) ->
// TAA -> OutputPass with ACES filmic (exposure 0.95) + sRGB encode — where
// dim linear values come out 2-4x brighter on screen. EXPOSURE_* below are
// the compensation the port applies so the field sits at the approved
// still's darkness UNDER the hero pipeline; they are the numbers the
// unification pass needs to reconcile, recorded in BUDGETS.md (W4-C).
import * as THREE from 'three';
import { buildLeg } from './leg.js';
import { buildSubstrate, makeFadePulseMat } from './substrate.js';
import { buildPortraitField } from './portraits.js';
import * as H from '../../lib/helpers.js';

const PAL = {
  gold: 0xd9a441,
  goldBright: 0xf0c877,
  ember: 0xffb36b,
  deepGold: 0x8a6426,
  warmBlack: 0x0a0805,
};

// Display-space (spike) -> linear-under-ACES compensation. Additive line /
// glow layers need the strongest cut; textured portrait planes are closest
// to a straight image and need the least.
const EXPOSURE_LINES = 0.30;
// ROOT-NETWORK RESTAGE: 0.42 -> 0.76. Under the old composition the faces sat
// against a lit ceiling band and 0.42 was as much as they could take before
// they read as lanterns. Under the new one they sit against near-black soil
// with the crown as the frame's brightest point, and at 0.42 the photo
// treatment's edge-burn left them as dark discs with a rim — "bubbles", not
// the reference's warm-lit faces. This is the level at which a face reads as
// a face at every one of the three review sizes and still never competes with
// the crown. (0.76 was measurably too far: the three nearest faces bloomed
// into featureless orbs under UnrealBloom. 0.56 keeps the features.)
const EXPOSURE_PLANES = 0.50;

// W4-E: how far a pod's nexus lifts while its card is OPEN, as a fraction of
// the full hover emphasis. Deliberately short of 1 — selection is a held
// "you are reading this one", not the hover's arrival gesture, and the pod
// has to sit under a card without competing with it.
const POD_SEL_LEVEL = 0.55;

// The crown hover zone (report C). Its world radius is small because the
// crown is NEAR — 1.85 units from the lens at the rest — so 0.25 units
// subtends about 110 px at 1440x900, which is the bright convergence knot and
// its collar and nothing else. Larger reaches the headline; smaller stops
// reading as "the root thing at the top".
const CROWN_ZONE_ID = 'root-crown';
const CROWN_ZONE_R = 0.25;

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

export function createOwned(sceneApi, content) {
  const group = new THREE.Group();
  group.name = 'journey-owned';
  group.visible = false;
  sceneApi.scene.add(group);

  /* ---- the real leg, sampled from the director ---- */
  const leg = buildLeg();

  /* ---- substrate + portrait field ---- */
  const substrate = buildSubstrate({ leg, palette: PAL, exposure: EXPOSURE_LINES });
  group.add(substrate.group);

  const contributors = (content && content.contributors) || [];
  // ROOT-NETWORK RESTAGE: sixteen, not forty-eight. The reference asks for
  // "roughly 14-16 PORTRAIT FACES ... with clear dark breathing room between
  // them", and every one of the sixteen is a routable contributor, so the
  // ambient filler nodes that used to pad the glide are gone with them — the
  // glide is populated by the root network itself now, which is what it is
  // for. See portraits.js REST_SITES for the authored arc.
  const portraits = buildPortraitField({
    leg, contributors, substrate, palette: PAL,
    nodeCount: contributors.length, exposure: EXPOSURE_PLANES,
  });
  group.add(portraits.group);
  // Report C: hand the substrate each face's real attachment points so the
  // mesh can work out which of its filaments belong to whom. Build-time, once
  // — see substrate.assignOwners for how ownership is derived.
  substrate.assignOwners(portraits.nodes.map(n => ({ pos: n.pos, anchors: n.anchors })));
  // photos are the default read once the look-dev set lands (never blocks
  // boot; a failed load leaves the procedural busts, and anonymous stays one
  // call away — setPortraitMode('anonymous'))
  portraits.photosReady.then((ok) => { if (ok) portraits.setMode('photo'); });

  /* ================================================================
     Ownership pods (OW-3): three mycelial nexuses carrying the locked
     claims. Authored in the REST frame — primary below the top-centre
     copy block's suppression zone, secondaries lower/outer — then
     clearance-pushed off the polyline so no pod swallows a travel frame.
     ================================================================ */
  const rf = leg.restFrame;
  const TANV = Math.tan(0.5 * rf.fov * Math.PI / 180);
  function restPlace(cx, cy, depth) {
    const p = rf.pos.clone()
      .addScaledVector(rf.fwd, depth)
      .addScaledVector(rf.right, cx * TANV * 1.55 * depth)
      .addScaledVector(rf.up, cy * TANV * depth);
    leg.clampUnder(p, 0.8);
    for (let it = 0; it < 4; it++) {
      const cd = leg.camDist(p.x, p.y, p.z);
      if (cd >= 2.6) break;
      const nearest = leg.nearestCamPt(p);
      const away = p.clone().sub(nearest);
      if (away.lengthSq() < 0.001) away.set(0, -1, 0);
      away.normalize();
      if (away.y > 0) away.y *= 0.3;
      p.addScaledVector(away.normalize(), 2.65 - cd);
      leg.clampUnder(p, 0.8);
    }
    return p;
  }
  // Visual hierarchy per the approved still: 100% shared clearly primary
  // (centre of the colony, largest, nearest) but not overwhelming the
  // network; secondaries smaller/lower, legible.
  // Ride-through #2 (Hannah): the claims live ONCE, as page copy under the
  // "Owned by the ecosystem" heading — the in-scene pod nexuses ("bulbs") and
  // their chips are removed. POD_SPEC is intentionally empty: no geometry, no
  // hotspots, no chips; the claim pulses survive via trigger() below, fired
  // from the DOM claim blocks on hover.
  const POD_SPEC = [];
  // Claim-pulse epicentres, re-aimed onto the new composition: the primary
  // claim answers from the CROWN (the wave then runs out along the roots, so
  // "100% shared" reads as light leaving the root and reaching everyone),
  // and the two secondaries answer locally, low-left and low-right, inside
  // the portrait arc.
  const CLAIM_CENTRES = {
    primary: leg.CROWN.clone(),
    monthly: restPlace(-0.58, -0.52, 6.6),
    split: restPlace(0.56, -0.50, 6.4),
  };
  const glowTex = H.glowSprite(PAL.ember, 64);
  const coreTex = H.softDisc(64);
  const pods = POD_SPEC.map((spec, pi) => {
    const rand = H.rng((9500 + pi * 311) >>> 0);
    // nexus: converging strand bundle — a knot the network thickens into,
    // not a UI badge. One pulse-mat per pod so hover state is per-pod.
    const mat = makeFadePulseMat(spec.primary ? PAL.goldBright : PAL.gold, {
      baseOpacity: (spec.primary ? 0.30 : 0.24) * EXPOSURE_LINES,
      pulseColor: PAL.goldBright, pulseWidth: 0.14, twinkle: 0.30, fogDensity: 0.014,
    });
    const R = spec.scale;
    const res = H.strandLines({
      count: spec.primary ? 30 : 22, seed: 9700 + pi * 77,
      generator: (i, rnd) => {
        const a = rnd() * Math.PI * 2;
        const b = (rnd() - 0.5) * Math.PI * 0.9;
        const rr = R * (2.2 + rnd() * 2.4);
        const start = new THREE.Vector3(
          spec.pos.x + Math.cos(a) * Math.cos(b) * rr,
          spec.pos.y + Math.sin(b) * rr * 0.7,
          spec.pos.z + Math.sin(a) * Math.cos(b) * rr,
        );
        leg.clampUnder(start, 0.25);
        const end = spec.pos.clone().add(new THREE.Vector3(
          (rnd() - 0.5) * R * 0.5, (rnd() - 0.5) * R * 0.4, (rnd() - 0.5) * R * 0.5));
        const pts = [];
        for (let j = 0; j <= 4; j++) {
          const t = j / 4;
          const e = H.easings.smooth(t);
          const p = start.clone().lerp(end, e);
          const hump = Math.sin(Math.PI * t);
          p.x += H.fbm3(i * 1.3, t * 2.8 + pi, 0.6, 2) * 0.5 * hump;
          p.y += H.fbm3(2.2, i * 0.9, t * 2.5 + pi, 2) * 0.4 * hump;
          p.z += H.fbm3(t * 2.6 + pi, 1.1, i * 1.7, 2) * 0.5 * hump;
          leg.clampUnder(p, 0.2);
          pts.push(p);
        }
        return pts;
      },
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    group.add(lines);
    // warm heart of the knot
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex, color: new THREE.Color(spec.primary ? PAL.goldBright : PAL.ember),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const core = new THREE.Sprite(coreMat);
    core.position.copy(spec.pos);
    core.scale.setScalar(spec.scale * 0.9);
    group.add(core);
    const haloMat = new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(PAL.ember),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(spec.pos);
    halo.scale.setScalar(spec.scale * 3.2);
    group.add(halo);
    return {
      ...spec, mat, coreMat, haloMat, core, halo,
      // `target` is the HOVER channel, `sel` the SELECTION channel (W4-E).
      // They are held apart so a pointer leaving a pod whose card is open
      // cannot drop the held emphasis — see the emphasis blend in the
      // animator and setSelected below.
      hot: 0, target: 0, sel: 0, pulseP: rand(),
      baseCore: (spec.primary ? 0.34 : 0.26) * EXPOSURE_LINES,
      baseHalo: (spec.primary ? 0.16 : 0.11) * EXPOSURE_LINES,
    };
  });
  // The colony's centre of gravity IS the crown now — every root leaves it,
  // so a wave launched there is the one wave that reaches the whole field.
  const colonyCentre = leg.CROWN.clone();

  /* ================================================================
     Growth front (OW-5): the live rising edge the Final exit follows —
     a fan of climbing strands around the rise corridor, carrying its own
     slow upward waves. The exit pulse fires as the camera commits to the
     rise and the lens follows it out through the soil.
     ================================================================ */
  const exitC = leg.exitPt.clone();
  const frontMat = makeFadePulseMat(PAL.goldBright, {
    baseOpacity: 0.16 * EXPOSURE_LINES, pulseColor: PAL.goldBright,
    pulseWidth: 0.16, twinkle: 0.34, fogDensity: 0.026,
    growGate: true,   // M5 (D16): the fan draws on from its roots, see below
  });
  {
    const res = H.strandLines({
      count: 40, seed: 8811,
      generator: (i, rnd) => {
        // a fan BEYOND the exit crossing, spread across the corridor the
        // camera rises through. It sits far enough out (and fogged enough)
        // to be a faint suggestion from the rest pose — parallel verticals
        // straight down the rest gaze read as "rain" — and resolves into
        // the live growth edge as the rise closes on it.
        const a = (i / 40) * Math.PI * 1.1 + rnd() * 0.1 - 0.55;
        const rr = 2.4 + rnd() * 3.6;
        const x0 = exitC.x - 2.6 - Math.abs(Math.cos(a)) * rr;
        const z0 = exitC.z + Math.sin(a) * rr * 1.2;
        const y0 = -2.6 - rnd() * 1.4;
        if (leg.camDist(x0, (y0 - 0.4) * 0.5, z0) < 3.4) return null;
        const yTop = leg.groundY(x0, z0) - 0.14 - rnd() * 0.3;
        const pts = [];
        for (let j = 0; j <= 4; j++) {
          const t = j / 4;
          const p = new THREE.Vector3(
            x0 + H.fbm3(i * 0.7, t * 2.9, 1.1, 2) * 1.3 * t,
            y0 + (yTop - y0) * t,
            z0 + H.fbm3(1.9, i * 0.9, t * 2.6, 2) * 1.3 * t,
          );
          pts.push(p);
        }
        return pts;
      },
    });
    const lines = new THREE.LineSegments(res.geometry, frontMat);
    lines.frustumCulled = false;
    group.add(lines);
  }
  let frontP = 0;
  let risePulseArmed = true;

  // THE SOIL IS THE REVEAL — CAMERA-PURE (2026-08-11, Hannah: "make it so
  // that they're always there, but are only visible when I go below the
  // surface"). The root world EXISTS for the whole armed window; what shows
  // it is the LENS being under the soil, not the chapter being reached.
  //
  // This replaces the M5-era p-window (ARRIVAL_LO 0.692, width 0.020). That
  // window was calibrated to the soil-crossing murk ON THE LEG — p and the
  // camera are a bijection there, so scrubbing was already honest — but a
  // nav jump snaps p to the destination while the camera is still most of a
  // second away, and for that whole blend the window read "arrived": the
  // colony faded up over the OPEN above-ground view (jump into Owned), and a
  // jump toward Final lit it through solid terrain with Final's slab not yet
  // drawn. Same class of fault Connect retired in f9e8317 ("the paths were
  // always there; arriving lights them") and Final in a8d4518's rise mask:
  // the cure is composing on the CAMERA alone, so no setBlending hook is
  // needed — the reveal self-corrects on the first blend frame.
  //
  // Two camera-pure terms, max()ed:
  //
  //   sink   how deep the lens is below the soil line, completing at 0.94
  //          units under. 0.94 is measured equivalence, not a new choice:
  //          the shipped p-window 0.692–0.712 spans camera depth 0 → 0.942
  //          on the leg (p→depth is linear there to ~3%), so on every scrub
  //          this term reproduces the approved murk reveal and every golden
  //          (all rests sit at depth ≥ 1.2, sink = 1). Off the leg it is
  //          the honest statement: the lid material occludes until you are
  //          through it, whatever path the camera took.
  //   keep   the Final-cutaway hold: above ground the colony may only be
  //          seen through the epilogue's own cutaway, so this term rides
  //          the SAME camera-x family as Final's riseOf (onset x −4.6 — 0
  //          at every other chapter's rest and along every jump arc between
  //          them, measured x ≥ −2.25). It must saturate by x −5.4: the
  //          rise's sink starts easing at depth 0.94 (p 0.821, x −5.47),
  //          and keep reaching 1 first is what keeps max() pinned at 1
  //          through the whole surfacing — measured min 0.9993 across
  //          p 0.78–0.87 at 1e-3 steps. Reverse rides re-enter through the
  //          same two terms in mirror, and a jump away from Owned retires
  //          the colony up through the murk instead of on the click.
  const SINK_D = 0.94;
  const KEEP_X0 = 4.6, KEEP_XW = 0.8;

  // THE SOIL HORIZON'S TWO CAMERA-PURE TERMS (2026-08-11 — Hannah, on the
  // Connect -> Owned crossing: "the ground should be RICHER as we're going
  // into it"). Both are functions of camera DEPTH BELOW SOIL alone, exactly
  // like `sink` above, so fc1e151's law is carried, not bent: what shows the
  // earth is the lens being in it. Full derivation and the measurement that
  // motivates them: substrate.js, the ceiling's own note.
  //
  //   LID_D    the lid goes solid 0.14 units under, not over SINK_D's 0.94.
  //            A metre of soil is opaque the moment your eye is beneath it;
  //            the shipped tree left it 90% TRANSPARENT at depth 0.2, which
  //            is what let the above-ground world graze through the crossing
  //            and then vanish in one step. 0.14 spans p 0.6927 -> 0.6957 on
  //            the dive — three frames at scroll speed, i.e. a threshold.
  //   PASS_*   the horizon layers are lit while the lens is INSIDE them:
  //            up by depth 0.06, held to 0.60, back to 0 by 0.90. PASS_ON is
  //            DELIBERATELY SHORTER THAN LID_D: the soil the lens has entered
  //            reads before the lid above it finishes closing, so the crossing
  //            is a hand-off with an overlap rather than a gap. At 0.16 (the
  //            first build) the two completed together and the frame still
  //            stepped 33 -> 22 in 0.002 of p.
  //
  //            PASS_HI IS SET BY THE SHALLOWEST REST, NOT THE LANDSCAPE ONE.
  //            The Owned rest is a different pose per aspect — portrait.js
  //            re-composes it — and MEASURED at the three shipped viewports
  //            the rest depth is 1.207 (1440x900) but only 0.987 (430x932 and
  //            375x812, fov 64, pitch -15.4). The first build used 1.15,
  //            which left the horizon 47% LIT at the portrait rest and moved
  //            owned@430x932 by MAE 0.73 (1.9% px>8, all of it in the top four
  //            tenths of the frame). 0.90 clears the shallower rest by 0.087,
  //            so PASS_HI < every rest depth is the frozen-composition
  //            guarantee on EVERY aspect: no rest can contain one felt strand
  //            or one grain, and both owned goldens are untouched (measured
  //            0.00 / 0.00 after).
  //
  //            It also lands the choreography where it belongs. Depth 0.60 ->
  //            0.90 is p 0.7035 -> 0.7107 on the dive, and SINK_D puts the
  //            colony at 70% -> 97% across exactly that stretch: the horizon
  //            hands over to the root world as the root world arrives, so the
  //            soil owns the murk window (0.692-0.712) and nothing else does.
  const LID_D = 0.14;
  const PASS_ON = 0.06, PASS_HOLD = 0.60, PASS_HI = 0.90;
  // REACH: how far the ceiling's near-earth structure resolves, keyed on the
  // lens's distance from the CROWN (substrate.js setLid has the reasoning).
  // Measured: 1.85 at the landscape Owned rest and 2.06 at the portrait one,
  // both under REACH_R0, so both frozen compositions see reach = 0 exactly;
  // along the Owned -> Final traverse it runs 3.5 -> 10 and saturates.
  const REACH_R0 = 2.40, REACH_RW = 1.60;
  const PASS_HOLD_FAR = 1.30, PASS_HI_FAR = 1.75;

  /* ================================================================
     Chapter state + per-frame
     ================================================================ */
  let amount = 0, amountTarget = 0;
  // set by journey.js for the length of a nav jump's camera blend — the
  // window in which the journey's state has already arrived and the camera
  // has not (see setBlending there, and the ease-hold in the animator below)
  let blending = false;
  const _w = new THREE.Vector3();

  sceneApi.addAnimator('journey-owned', (t, dt) => {
    // The remix swap advances AHEAD of the visibility gate below (see
    // portraits.tickSwap): a visitor who presses Remix and immediately scrubs
    // away must not come back to a field stopped half-way between two
    // arrangements. It writes one uniform and does nothing at all when no swap
    // is running, so it costs the resting frame nothing.
    portraits.tickSwap(dt);
    // Arm ease at 6.0, not the old 2.6. With the reveal camera-pure (below),
    // the only place this ease can be SEEN at all is inside a nav jump's
    // blend: the T3/p-window arming edges all sit where sink and keep are
    // both 0 (measured — the earliest sink>0 on the leg is p 0.6924, 0.06 of
    // p after the arm at 0.63), so scrubbing never shows it at any speed. At
    // 2.6 a jump into Owned pierced the murk with amount ~0.87 and the
    // landing snap stepped the settled colony up ~6% in one frame; at 6.0
    // amount is ≥0.99 by the earliest pierce a jump blend can make
    // (0.85 s dur), and the landing step is sub-1% — under the frame's own
    // twinkle amplitude.
    //   ...and it HOLDS while the state and the camera disagree (2026-08-13 —
    // the loop's seam). The paragraph above is right that a scrub never shows
    // this ease and that a jump INTO Owned is covered by its speed. What it
    // does not cover is a jump AWAY from a chapter this one is still visible
    // through: the forward wrap disarms Owned on the frame p snaps 0.97 -> 0,
    // and at 6.0/s the colony under the Final cutaway was gone 0.87 s later —
    // measured at camera x -15.01, r 15.42, i.e. with the camera still
    // standing at the Final rest, 0.3 units into a 68-unit move. The colony
    // dimmed to nothing on a frame that had not moved. That is the cut.
    //   Backward the same chapter behaves correctly, because there `arrival`
    // (camera-pure) is the binding term and it opens at x -4.86 as the lap
    // comes round. Freezing the ease makes the two directions the same
    // statement — the reveal is the camera's, in both — and `snap()` at
    // endCamBlend lands the state exactly where placeAt always meant it to.
    const k = blending ? 0 : Math.min(1, dt * 6.0);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    // Inside a blend the chapter may trust only its camera-pure terms
    // (journey.js setBlending) — so PRESENCE is the arm, not the ease, and
    // every mask below is the camera's alone. Identical to `amount`
    // everywhere else, because outside a blend the ease IS the arm settled.
    const amt = blending ? ((amountTarget > 0 || amount > 0.003) ? 1 : 0) : amount;
    const pNow = window.journey ? window.journey.p : 0;
    // arrival mask (see SINK_D above): everything the chapter draws is scaled
    // by amount * arrival, and arrival is a pure function of the CAMERA — the
    // soil murk on the way under, the Final cutaway's territory above — so
    // the on-screen reveal is the geometry occluding, whatever path the lens
    // takes: scrub, reverse scrub, or a nav jump's blend. The camera is final
    // for this frame by the spine-first animator order (journey.js).
    const cp = sceneApi.camera.position;
    const depth = leg.groundY(cp.x, cp.z) - cp.y;
    const sink = smooth01(depth / SINK_D);
    const keep = smooth01((-cp.x - KEEP_X0) / KEEP_XW);
    const arrival = Math.max(sink, keep);
    const eff = amt * arrival;
    // The soil horizon rides its own two depth terms (see LID_D / PASS_* ),
    // both 0 above ground, so they can only ADD inside the crossing.
    const lidA = amt * smooth01(depth / LID_D);
    // REACH also widens the PASSAGE BAND, for the same reason and with the
    // same guarantee. Near the crown the band must close under the rest depth
    // (0.987 portrait / 1.207 landscape) or it shows in a frozen composition;
    // out along the Owned -> Final traverse there is no rest to protect, the
    // lens runs at depth 1.15-1.23 for 0.08 of p, and closing at 0.90 left
    // the soil horizon DARK across exactly the stretch Hannah called an
    // awkward state. reach is 0 at both rests by measurement (1.85 / 2.06
    // against REACH_R0 2.40), so the band there is bit-identical to the
    // narrow one and both goldens are untouched.
    const reach = smooth01((cp.distanceTo(leg.CROWN) - REACH_R0) / REACH_RW);
    const passHold = PASS_HOLD + (PASS_HOLD_FAR - PASS_HOLD) * reach;
    const passHi = PASS_HI + (PASS_HI_FAR - PASS_HI) * reach;
    const passA = amt * smooth01(depth / PASS_ON)
                * (1 - smooth01((depth - passHold) / (passHi - passHold)));
    group.visible = Math.max(eff, lidA, passA) > 0.003;
    if (!group.visible) {
      substrate.setFade(0);
      substrate.setLid(0, 0);
      substrate.setPassage(0);
      portraits.setFade(0);
      frontMat.uniforms.uFade.value = 0;
      for (const pd of pods) { pd.mat.uniforms.uFade.value = 0; }
      return;
    }

    substrate.setFade(eff);
    substrate.setLid(lidA, reach);
    substrate.setPassage(passA);
    // Final-surface mask (17-final-field.md, Hannah): the colony stays armed
    // through the whole epilogue (OWNED_HOLD_HI past-the-end), and the Final
    // cutaway deliberately exposes it in section — but the contributor FACES
    // must not read inside the epilogue frame (they were surfacing as bright
    // portrait blobs in the wedge corner). The substrate keeps its glow (the
    // network below the lip is the composition's designed underground light);
    // only the portrait field retires. Pure in p — p and the camera are a
    // bijection on the leg, so this is a camera-keyed fade, not a timed one:
    // it runs 0.815→0.845 and COMPLETES BEFORE the surface pierce (~0.850),
    // i.e. while the lens is still climbing through the colony's dark upper
    // reaches — measured: at 0.845 the old window still showed readable
    // faces bottom-right of the surfacing frame. Reverse rides restore the
    // faces through the same corridor as the camera re-enters the colony.
    // Zero effect at the Owned rest (p 0.725 → mask 1) and on its golden.
    const faceVis = 1 - smooth01((pNow - 0.815) / 0.030);
    portraits.setFade(eff * faceVis);
    substrate.update(dt, t);
    portraits.update(dt, t);
    // The mesh answers the SAME node the portrait field is answering, at the
    // same eased strength — hovering a face lights that face's own filaments
    // and nothing else in the network. `faceVis` rides along so the epilogue
    // retires the local lighting with the faces it belongs to.
    substrate.setActiveNode(portraits.activeIdx, portraits.activeAmt * faceVis);

    // pods: hover ease + per-pod inward pulse when hot. Hover and selection
    // are separate channels blended by max(), so an open card holds the nexus
    // at POD_SEL_LEVEL no matter where the pointer goes, and hovering the
    // selected pod still takes it all the way to 1.
    for (const pd of pods) {
      const want = Math.max(pd.target, pd.sel * POD_SEL_LEVEL);
      pd.hot += (want - pd.hot) * Math.min(1, dt * 6);
      pd.mat.uniforms.uFade.value = eff;
      pd.mat.uniforms.uTime.value = t;
      pd.pulseP += dt * (0.10 + pd.hot * 0.55);
      if (pd.pulseP > 1.3) pd.pulseP = -0.25;
      pd.mat.uniforms.uPulse.value = pd.pulseP;
      pd.mat.uniforms.uPulseOn.value = 0.30 + pd.hot * 0.9;
      pd.coreMat.opacity = eff * pd.baseCore * (1 + 1.4 * pd.hot)
        * (0.9 + 0.1 * Math.sin(t * 0.7 + pd.pos.x));
      pd.haloMat.opacity = eff * pd.baseHalo * (1 + 1.6 * pd.hot);
      const sc = pd.scale * 0.9 * (1 + 0.22 * pd.hot);
      pd.core.scale.setScalar(sc);
      pd.halo.scale.setScalar(pd.scale * 3.2 * (1 + 0.30 * pd.hot));
    }

    // growth front: slow upward travelling wave, uneven, never a loop you
    // can count — plus the OW-5 exit pulse when the rise commits. The fan
    // sits straight down the rest gaze (the exit corridor IS the gaze), so
    // it is gated on p: invisible at the rest, arriving through the drift
    // (0.775-0.81) as the camera commits to the rise. Pure in p — reverse
    // scrubbing restores the rest frame exactly. M5 ignition audit (D16):
    // the arrival is a DRAW-ON, not a fade — uGrow extends each strand from
    // its aAlong=0 root in the lit deep field up toward the soil, so the fan
    // is visibly grown out of the colony instead of igniting in view.
    const fg = smooth01((pNow - 0.775) / 0.035);
    frontMat.uniforms.uFade.value = eff;
    frontMat.uniforms.uGrow.value = fg * 1.15;
    frontMat.uniforms.uTime.value = t;
    frontP += dt * (0.075 + 0.05 * (0.5 + 0.5 * H.noise3(t * 0.06, 3.3, 0)));
    if (frontP > 1.35) frontP = -0.2;
    frontMat.uniforms.uPulse.value = frontP;
    frontMat.uniforms.uPulseOn.value = 0.45;

    const p = pNow;
    if (risePulseArmed && p > 0.795) {
      risePulseArmed = false;
      frontP = -0.05;                       // the front fires...
      portraits.wavePulse(exitC, { speed: 5.0, width: 2.4, maxR: 13, amp: 0.75 });
      substrate.surge();                    // ...and the colony answers behind it
    } else if (!risePulseArmed && p < 0.765) {
      risePulseArmed = true;                // re-arm on the way back
    }
  });

  /* ================================================================
     Chapter contract (grey-box interface, kept)
     ================================================================ */
  const routableIds = portraits.nodes.filter(n => n.routable).map(n => n.id);

  return {
    group,
    substrate, portraits, leg,          // QA / debug access
    counts: { substrate: substrate.counts, portraits: portraits.counts },
    // pods first (the claims are the chapter's message), then the full
    // routable contributor set — this fixes the grey-box reachability gap
    // where only 4 of 16 contributors were registered.
    nodeIds: [...POD_SPEC.map(s => s.id), ...routableIds],

    /** T3 streaming seam. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },

    /** journey.js: the journey's state and the camera currently DISAGREE.
     *  This chapter owns the distinction because it is visible from the leg
     *  AFTER its own — the colony reads through the Final cutaway — so the
     *  frame a jump leaves Final is a frame in which Owned is still fully on
     *  screen. See the ease-hold in the animator. */
    setBlending(on) { blending = !!on; },

    /** Jump the eased seam state to its target (journey.js placeAt calls this
     *  on every chapter that has it: deep links and hidden-tab / frozen
     *  capture, both of which run the dt = 0 path).
     *
     *  This chapter did not have one, and the omission was invisible until
     *  the root-network restage went looking for it: `amount` only ever
     *  approaches `amountTarget` by an eased step scaled by dt, so under
     *  freezeTime(0) it stayed at 0 forever and the ENTIRE chapter drew
     *  nothing. The pre-restage owned golden proves it — the only light in
     *  that frame is CONNECT's surface network seen from underneath. Deep
     *  links were merely lucky: live dt closes the ease in ~0.4 s, so the
     *  section faded up a beat after the landing instead of being there.
     *
     *  Same one-liner Final uses; Inspire's and Connect's do more because
     *  they carry more eased state. Pure state assignment — no reveal is
     *  skipped, because the on-screen reveal is the camera-pure `arrival`
     *  mask in the animator (sink/keep), not this. */
    snap() { amount = amountTarget; portraits.snap(); },

    setHot(id, on) {
      // THE CROWN — the one hover that answers with the WHOLE root system
      // (Hannah, 2026-08-06, report C). This response used to hang off the
      // chapter's prose sub line, a 416x77 box in the middle of the frame
      // that a pointer travelling down to the faces crosses by accident: the
      // entire network flashed at what felt like random moments. It belongs
      // to the structure it describes. Every root leaves the crown, so a wave
      // launched there is the only one that legitimately reaches everyone.
      if (id === CROWN_ZONE_ID) {
        if (on) {
          portraits.wavePulse(colonyCentre, { speed: 3.4, width: 3.2, maxR: 30, amp: 1.0 });
          substrate.surge();
        }
        return;
      }
      const pd = pods.find(p => p.id === id);
      if (pd) {
        pd.target = on ? 1 : 0;
        if (on) {
          if (pd.primary) {
            // one broad, slow pulse through the FULL colony
            portraits.wavePulse(colonyCentre, { speed: 3.4, width: 3.2, maxR: 30, amp: 1.0 });
            substrate.surge();
          } else {
            // smaller, localized response
            portraits.wavePulse(pd.pos, { speed: 3.2, width: 2.0, maxR: 6.5, amp: 0.85 });
          }
        }
        return;
      }
      const idx = portraits.indexOf(id);
      if (idx < 0) return;
      if (on) portraits.setHover(idx);
      else if (portraits.hoverIdx === idx) portraits.setHover(-1);
    },

    /** SELECTION channel (W4-E) — the symmetric half of setHot, called by
     *  core/ui.js's notifySelect for every open/close path (click, key, deep
     *  link, inbound route, Escape, scroll-intent close). Its existence
     *  retires ui.js's temporary `mod.portraits.setSelected(index)` bridge:
     *  notifySelect prefers this method and never reaches the bridge branch.
     *
     *  Contributors take the same route the bridge took — indexOf(id) into
     *  the portrait field's index-based selection, which drives the ember rim
     *  (uSelIdx / uSelAmt). Pods hold their nexus at POD_SEL_LEVEL.
     *
     *  Selection deliberately fires NO claim pulse: the colony-wide wave and
     *  the localized secondary wave are ARRIVAL gestures and stay in setHot.
     *  A card that is open for a minute must not sit on a pulsing colony. */
    /** Claim pulses (handoff OW-3 behaviour, re-hosted on the DOM claim blocks
     *  after the in-scene pods were removed): 'claimPrimary' = one broad slow
     *  wave through the full colony; 'claimMonthly' / 'claimSplit' = smaller
     *  localized responses at their old nexus centres. */
    trigger(name) {
      if (name === 'claimPrimary') {
        portraits.wavePulse(colonyCentre, { speed: 3.4, width: 3.2, maxR: 30, amp: 1.0 });
        substrate.surge();
      } else if (name === 'claimMonthly') {
        portraits.wavePulse(CLAIM_CENTRES.monthly, { speed: 3.2, width: 2.0, maxR: 6.5, amp: 0.85 });
      } else if (name === 'claimSplit') {
        portraits.wavePulse(CLAIM_CENTRES.split, { speed: 3.2, width: 2.0, maxR: 6.5, amp: 0.85 });
      } else if (name === 'remixPortraits') {
        /* REMIX (Hannah, 2026-08-07) — the copy block's second button.
           The field re-deals its faces (portraits.remix()) and the COLONY
           answers along with it: a wave launched from the same epicentre the
           swap is ordered by, at the speed the swap travels, so each face's
           strands, ember rim and halo light as that face turns over. The
           substrate surges underneath it, exactly as it does for the crown.
           One gesture, one wave, sixteen faces changing inside it — not
           sixteen simultaneous cuts and not a page-wide flash.

           The return value is the trigger contract journey/ui.js reads:
           `announce` for the polite live region (nothing moves focus, so this
           is the only way the change is not silent) and `busyMs` to hold the
           button lit and unpressable for exactly as long as the field is
           actually turning over. */
        const r = portraits.remix();
        if (!r) return null;               // a swap is already running
        // amp 0.62, not the crown hover's 1.0. That gesture is the wave ALONE;
        // this one lands on the same pixels as the per-node swap flare, and
        // shot at 375x812 the two together washed the near faces out. The
        // crown's own response is unchanged — this is the remix's dose.
        portraits.wavePulse(r.epicentre, {
          speed: r.speed, width: 3.0, maxR: r.maxR + 4, amp: 0.62,
        });
        substrate.surge();
        return {
          announce: `Contributor portraits remixed — arrangement ${r.arrangement}.`,
          busyMs: r.ms,
        };
      }
      return null;
    },

    setSelected(id, on) {
      const pd = pods.find(p => p.id === id);
      if (pd) { pd.sel = on ? 1 : 0; return; }
      const idx = portraits.indexOf(id);
      if (idx < 0) return;
      // Guarded release, exactly like setHot: a stale close arriving after a
      // retarget must not blank the newly selected portrait.
      if (on) portraits.setSelected(idx);
      else if (portraits.selIdx === idx) portraits.setSelected(-1);
    },

    /** LABEL POLICY (core/ui.js registration contract).
     *
     *  The three ownership pods keep the default chip: their claims are the
     *  chapter's message and belong to the resting composition — page
     *  furniture, always readable. Returning nothing for them leaves them
     *  exactly as they were.
     *
     *  The sixteen contributors do not. Sixteen role tags standing over
     *  sixteen faces reads as a tag cloud and buries the thing the chapter
     *  is actually about — the faces, the ember rims, the strands between
     *  them. So each contributor asks for `labelOnHover`: no chip at rest,
     *  and the chip appears (hover, keyboard focus or the first tap of the
     *  touch model — ui.js treats all three as the same `hot` state) naming
     *  the person AND what they contributed, which is the question pointing
     *  at a face asks. Names are placeholders until the consent pipeline
     *  lands (CO-1.4 / OW-4.4); the shape is already right.
     *
     *  The accessible name carries the same string whether or not the chip
     *  is drawn, so this costs an AT user nothing (ui.js sets aria-label).
     */
    labelPolicy(id) {
      const c = contributors.find(x => x.id === id);
      if (!c) return null;                 // pods (and anything else): default
      const text = [c.name, c.role].filter(Boolean).join(' · ');
      return { labelOnHover: true, label: text || id };
    },

    nodeWorld(id) {
      const pd = pods.find(p => p.id === id);
      if (pd) return _w.copy(pd.pos).clone();
      if (id === CROWN_ZONE_ID) return leg.CROWN.clone();
      return portraits.worldOf(id);
    },

    /** HIT RADIUS (core/ui.js hotspot contract, 2026-08-06 — report A).
     *
     *  World-space radius of the thing this node DRAWS. ui.js projects it and
     *  gives the chip a round hit pad that size, centred exactly on the node.
     *
     *  Before this the chip's hit surface was the pill itself: a 23 px-tall
     *  bar running 200-306 px to one side of the node, and for these
     *  hover-only chips it was INVISIBLE at rest. So the region that answered
     *  the pointer had almost nothing to do with the region that showed a
     *  face — measured 116 px of mean offset between the two centres, and
     *  only 74 of 208 sample points taken across the drawn faces landed on
     *  the right chip at 1440x900. The worst were the near/edge faces, whose
     *  discs are biggest (up to 50 px radius against a 11 px half-height of
     *  pill): 2 of 13 points. Hannah: "it feels like it is in a different
     *  point to where they actually show."
     *
     *  A chapter that does not implement this keeps the pill-only hit model
     *  exactly as it was. */
    nodeRadius(id) {
      if (id === CROWN_ZONE_ID) return CROWN_ZONE_R;
      return portraits.radiusOf(id);
    },

    /** HOVER ZONES (core/ui.js, 2026-08-06 — report C; given the remix
     *  2026-08-13).
     *
     *  A zone is a target with no chip, no label and no card: a piece of the
     *  SCENE that answers the visitor directly. The crown is the only one —
     *  "the top root thing", in Hannah's words — and it is the only thing
     *  entitled to light the whole network.
     *
     *  It is still not a hotspot: a hotspot is a named node with a card
     *  behind it, and the crown is not a contributor and has no content.
     *
     *  THE CROWN NOW CARRIES THE RE-DEAL (Hannah, 2026-08-13): "remove the
     *  visible Remix button ... that existing [light-flash] interaction
     *  should take over the Remix behaviour ... integrated into the scene
     *  rather than exposed as a separate UI control." So the zone declares
     *  the same chapter-contract trigger the retired pill declared, and
     *  core/ui.js gives it the commit model (dwell, press, tap, Enter/Space)
     *  and the announce/busy contract. The LIGHT is unchanged and still fires
     *  on the bare hover — see setHot above; the re-deal is the commit.
     *
     *  Because it now DOES something it is also a real control: ui.js builds
     *  it as a <button> with this accessible name, so the crown is finally
     *  reachable from a keyboard. That retires residual 1 of the 2026-08-06
     *  pass ("the crown is the one part of the composition that answers a
     *  mouse and not a keyboard") — it took on information, so it took on the
     *  obligations that come with information. It sits in the tab order
     *  exactly where the Remix pill sat: after the chapter copy, ahead of the
     *  sixteen people. */
    hoverZones() {
      return [{
        id: CROWN_ZONE_ID,
        world: () => leg.CROWN.clone(),
        radius: CROWN_ZONE_R,
        // Chapter-contract trigger name — the same one the pill pulled.
        action: 'remixPortraits',
        // The accessible name of the crown as a CONTROL. It says what the
        // press does, not what the thing is: the light response is the
        // pointer's own answer and carries no information, so there is
        // nothing else here for a screen reader to be told about.
        label: 'Re-deal the contributor portraits',
        // Fallback live-region text. trigger() returns its own sentence (it
        // knows which arrangement it landed on); this is only used if it
        // returns nothing.
        announce: 'Contributor portraits remixed.',
      }];
    },

    /** 'procedural' | 'photo' | 'anonymous' — anonymous is one call away. */
    setPortraitMode(m) { portraits.setMode(m); },
    get portraitMode() { return portraits.mode; },
    /** OW-4.4: consent-gated rendering (per-node, in code). */
    setConsentEnforced(on) { portraits.setConsentEnforced(on); },
    /** QA: which routable nodes frame at the rest pose. */
    restVisible() { return portraits.restVisible(); },
  };
}
