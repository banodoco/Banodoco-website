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
// nodeIds / setArmed / setHot / nodeWorld) and the growth-front exit gesture
// (OW-5). The three ownership pods and their claim pulses (OW-3) are retired
// (Ride-through #2). Parented to `scene`, a sibling of groundGroup, per
// adr-d3: soil does not sway, and a swaying substrate would shear the descent.
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
import { PHOTOS } from '../../../flags.js';
import * as H from '../../lib/helpers.js';
import { isBaked, geometry, registerGeometry, registerPayload, bakeDumpDone } from '../../lib/baked.js';

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
// into featureless orbs under UnrealBloom. The shipped 0.50 is the level
// that keeps faces reading as faces without competing with the crown.)
const EXPOSURE_PLANES = 0.50;

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
    // The opt-out is also a startup/perf contract: do not fetch or bake photo
    // atlases that this field is explicitly required never to display.
    photosEnabled: PHOTOS,
  });
  group.add(portraits.group);
  // Report C: hand the substrate each face's real attachment points so the
  // mesh can work out which of its filaments belong to whom. Build-time, once
  // — see substrate.assignOwners for how ownership is derived.
  substrate.assignOwners(portraits.nodes.map(n => ({ pos: n.pos, anchors: n.anchors })));
  // SHIP STATE (2026-08-16, revised the same day): the field ships PHOTOS —
  // each contributor's own avatar, as published by Banodoco on its own front
  // page (assets/contributor-portraits/manifest.js has the provenance).
  //
  // This promotion was conditional for exactly one reason: the only images in
  // the repo were stock faces, and showing them would have presented strangers
  // as contributors. Real pictures of the real people retire that objection, so
  // the promotion is unconditional again — `?photos=0` now holds the field on
  // the procedural busts, rather than `?photos=1` releasing it.
  //
  // Still async and still failure-tolerant: until the set resolves the field
  // renders procedural, and if every image fails it stays that way. Nothing
  // here blocks the chapter's build.
  if (PHOTOS) {
    portraits.photosReady.then((ok) => { if (ok) portraits.setMode('photo'); });
  }

  // (The colony centre constant that used to live here was the epicentre of
  // the crown's entry pulse. That pulse was removed 2026-08-16 — see setHot —
  // and the one remaining wave takes its epicentre from remix() instead, so
  // nothing read this any more.)

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
  let frontGeo = null;
  // Baked read path (2026-08-17): the growth front's strands are baked under
  // 'owned/front' like every other geometry the chapter renders. One try/catch
  // — any missing key or shape mismatch falls back to the live strandLines
  // below, never a half-baked mix. frontMat/frontP/the noise3 animator stay
  // live either way; only the geometry math is skipped.
  if (isBaked('owned')) {
    try {
      frontGeo = geometry('owned/front', [['position', 3], ['aAlong', 1], ['aStrand', 1]]);
    } catch (e) {
      frontGeo = null;
    }
  }
  if (!frontGeo) {
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
    frontGeo = res.geometry;
  }
  const frontLines = new THREE.LineSegments(frontGeo, frontMat);
  frontLines.frustumCulled = false;
  group.add(frontLines);

  // ---- bake recording site (2026-08-17) ------------------------------
  // Substrate and portraits are baked ATOMICALLY. assignOwners wrote the
  // web's aOwner attribute (substrate.geometries.web) AFTER buildPortraitField
  // returned and after this call, so this is the one place every geometry is
  // final. Under ?bakedump=1 each registerGeometry records a COPY of the
  // live-built attributes into window.__bake; on the shipped path these are
  // no-ops. The read path (substrate.js / portraits.js) rebuilds from
  // static/geom bytes and skips the math — see journey/lib/baked.js, and
  // tools/bake-geom.py for the harvest.
  for (const [site, geo] of Object.entries(substrate.geometries)) {
    registerGeometry(`owned/${site}`, geo);
  }
  for (const [site, geo] of Object.entries(portraits.geometries)) {
    registerGeometry(`owned/${site}`, geo);
  }
  registerGeometry('owned/front', frontGeo);
  registerPayload('owned', { substrate: substrate.bakePayload, ...portraits.bakePayload });
  bakeDumpDone('owned');

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
  // The contributor faces' own depth window — see the Final-surface mask in
  // the animator for the derivation and the measurement. FACE_D1 is SINK_D,
  // deliberately not a second number.
  const FACE_D0 = 0.38, FACE_D1 = SINK_D;

  /* THE GROWTH FRONT'S OWN WINDOW, ON THE SAME AXIS `keep` ALREADY USES
     (2026-08-14 — Hannah: "when I jump from underground using the side toggle
     to jump to the epilogue, these little light sticks appear in the distance
     as soon as the transition starts, which don't appear when I scroll between
     those two sections. It looks like they're deep on the ground in the
     distance.")

     The sticks are THIS chapter's exit-corridor growth front — the fan of
     strands that grows up out of the deep field toward the soil (see the
     animator, and substrate.js's `uGrow` feathered-tip term). Isolated by
     rendering the same frame twice, once with uGrow forced to 0, so scene
     noise cancels exactly: on the click frame of an Owned -> Final navigator
     jump it is worth 9,880 lit pixels rising to 13,352 by 66 ms, peaks +161/255
     — with the camera still standing at x 1.730, the Owned rest. On the scroll
     it is worth ZERO at every matched point until the lens has travelled to
     x -1.371, and it only reaches full at x -6.016.

     The cause is the fault this chapter has now been through four times: the
     window was `smooth01((p - 0.775) / 0.035)`, justified — like the shipped
     `keep`, like `783729b`'s `faceVis` before it — by "p and the camera are a
     bijection on the leg". True on the leg; false the instant a jump snaps p
     while the camera has not moved. The comment on `faceVis` calls itself "THE
     LAST TERM IN THIS CHAPTER THAT WAS STILL KEYED TO p" and it was wrong by
     exactly these three lines.

     Restated on `-cp.x`, which is the axis `keep` already means "far enough
     along the leg" on, and which is what the p-window was a proxy for: the
     shipped window p 0.775 -> 0.810 IS camera x -0.40 -> -4.33, measured at
     1e-3 steps along the leg. FRONT_X0/XW are fitted to that map and reproduce
     the shipped growth to within 0.0133 over the whole ramp — under the
     feathered tip's own width, and bit-identical at both ends, which is what
     keeps `owned@1440x900`, `owned@430x932` and both Final goldens untouched.
     Depth cannot do this job: through this stretch the lens travels almost
     horizontally and `depth` moves only 1.231 -> 1.073, so it carries no
     window at all — this is the one mask here that is about travel, not about
     the soil.

     It also fixes the mirror, which nobody had reported: at the Final rest the
     fan is fully grown (it is part of the section the cutaway exposes), and on
     the DOWN-wrap p snaps 0.97 -> 0 while `keep` still holds the chapter open
     at the Final rest — so the fan blinked OUT on a frame the camera had not
     left. One statement, both directions, and it mirrors on a reverse scrub by
     construction. */
  const FRONT_X0 = 0.40, FRONT_XW = 3.93;
  // The OW-5 exit pulse is the same three lines' other half and moves with
  // them: it fired ON THE CLICK for the same reason (measured across an
  // Owned -> Final jump: uSurge 0 -> 0.964, uWaveAmt 0 -> 0.750, camera
  // unmoved). The shipped triggers p > 0.795 / re-arm p < 0.765 are camera
  // x -2.634 / +0.235 on the same measured map.
  const FRONT_FIRE_X = 2.634, FRONT_ARM_X = -0.235;   // both on -cp.x

  // ...AND `keep` NEEDS THE OTHER HALF OF ITS OWN PREMISE (2026-08-14 —
  // Hannah: "a visual glitch sometimes when I scroll up to the end — a little
  // bit below the main mushroom, something kind of flashes up."
  // 17-final-field.md, the 2026-08-14 section.)
  //
  // `keep` is written above as a half-space in camera x, and its stated
  // justification is the parenthesis: onset x -4.6, "0 at every other
  // chapter's rest AND ALONG EVERY JUMP ARC BETWEEN THEM, MEASURED x >= -2.25".
  // That premise was true when it was measured and e4df4b0 made it false. The
  // loop's wrap stopped being a one-frame teleport and became a real 3.8 s LAP
  // — bow 3.2, rise 1.9 — which runs the camera out to x +15 and brings it
  // back to the Final rest ABOVE GROUND, at y ~4.0-4.4 and z ~-15. It
  // therefore crosses the whole of `keep` at poses the ride never occupies.
  //
  // WHAT IS EXPOSED is a window this chapter shares with Final, and naming it
  // is the point: `keep` opens over 0.8 units of camera x (x -4.6 -> -5.4)
  // while the epilogue's own `rise` — the mask that brings in the soil slab
  // and terrain standing in front of these roots — takes 2.8 units (x -4.6 ->
  // -7.4). So across ~2 units of x the colony is up and the thing that
  // occludes it is not yet there. On the RIDE that window is passed
  // UNDERGROUND (measured camera depth 0 .. 1.05 through it), so the soil lid
  // hides it and nothing is wrong. On the LAP it is passed four units in the
  // air with the crater open below.
  //   Reproduced through a real trusted-wheel wrap UP (18 x -110 px at 60 Hz;
  // journey.wrap() is not the input path and was not used), 1440x900: at
  // camera x -3.26 the colony is off; ONE FRAME LATER at x -5.29 `keep` is
  // 0.945 against Final's `rise` of 0.156, and the hero's root crown is drawn
  // as a bright fan under the stem in mid-air; by x -8.32 the epilogue's slab
  // has arrived and covers it. Two frames, ~85 ms — "something flashes up".
  // Suppressing this chapter's group removes it and changes nothing else.
  //
  // The half-space that closes it is z, and z is not a taste call — it is the
  // one axis on which the ride and the lap do not overlap. MEASURED over
  // p 0.60-1.0 at 0.002 steps [placement sweep] on all three shipped
  // viewports, the camera's z wherever `keep` is non-zero (x <= -4.6):
  //
  //     1440x900   z 2.695 .. 3.099        430x932   z 3.066 .. 3.475
  //     375x812    z 3.066 .. 3.475
  //
  // against the lap, which is at z ~-15 as it crosses the exposure window and
  // returns to z > 0 only over the last half second as it draws into the rest.
  // So [-2.0, 0.0] is exactly 1 on every sampled ride pose at every aspect
  // (2.695 of margin at the tightest) and exactly 0 across the whole flash
  // (13 of margin), and it opens over the lap's final approach — the colony
  // arrives ON THE MOVE as the lap lands, 6f23d90's rule, rather than cut in.
  //
  // NOT HEIGHT, which is the obvious guess and is wrong by more than it looks:
  // the portrait Final rest stands at y 4.242 and the lap's flyover peaks at
  // y 4.396, so the two overlap to within 0.15 and any y threshold that killed
  // the flash would also have emptied the epilogue on mobile. Depth below soil
  // fails for the same reason — both are above ground.
  //
  // It cannot touch a golden, and the reason is that sweep rather than an
  // argument about `sink`: the factor evaluates to exactly 1.000000 at every
  // ride pose where `keep` is live, at all three aspects, so `keep` — and
  // therefore max(sink, keep) — is bit-identical on every path a reference is
  // shot through.
  const KEEP_Z0 = -2.0, KEEP_ZW = 2.0;
  // ...AND A BLEND NEEDS A TIGHTER ONE THAN THE RIDE (2026-08-16 — Hannah,
  // the SAME flash one window later: "the root of the main mushroom shows
  // when I scroll from the top section backwards into the first one"). The
  // half-space above closed the exposure where it was measured — mid-lap,
  // z ~-15 — and left the LANDING open: the lap's last half second runs
  // z -1.6 -> +2.70, and from those poses the cutaway lip does not yet stand
  // between the lens and the colony's crown. Screencast through a
  // wheel-driven wrap (every composited frame, none skipped): the hero's
  // root crown flares as a bright fan under the stem while `keep` fades up
  // across the approach, and vanishes only as the pose closes on the rest —
  // the settled frame is clean, which is why both Final goldens never caught
  // it. Same A/B as the first fix: with this chapter's group suppressed the
  // landing is flat (lower-frame luminance 29-33 against 41 with it on).
  //
  // A single window cannot hold both truths: the exposure persists ALL THE
  // WAY TO THE REST (measured live by Hannah after a first cut opened a
  // tight window across z 2.55 -> 2.68: "still pops up for a moment before
  // it settles" — at 60 fps even the last 0.1 of z shows the fan fading up
  // over a still-open sightline). No camera threshold separates the exposed
  // poses from the rest pose, because the rest pose is their limit. So the
  // colony does not arrive DURING a blend at all — it arrives AFTER the
  // landing, which is the arrival law this codebase already has: "an
  // ARRIVAL has no window... a town you are walking into may go on lighting
  // while you stand still" (final/index.js §41). The construction is a
  // ONE-SIDED LATCH plus a settle ease:
  //   · while a blend is in flight, `keepGate` may only FALL — it latches
  //     min(itself, the tight window's read of the pose). A DEPARTURE from
  //     the Final rest therefore keeps its colony on the unmoved frame
  //     (tight window = 1 there) and retires it over the bow's first beat,
  //     riding the move — while an ARRIVAL (whose blend began where keep
  //     is 0) holds the colony dark through every exposed landing pose, at
  //     any frame rate, by construction rather than by threshold.
  //   · off a blend, `keepGate` eases back to 1 at the chapter's own 6.0/s
  //     — the underground glow warms up through the cutaway over the first
  //     ~half second AFTER the camera has settled, at the one pose whose
  //     lip actually occludes the crown. The reveal law allows exactly
  //     this: the limiter may HOLD light the lens has earned, never create
  //     light it has not.
  //   · scrubs, deep links, `?p=`, the frozen `?capture=` path and both
  //     goldens never blend, so `keepGate` never leaves 1 and `keep` is
  //     bit-identical to the shipped term. snap() deliberately leaves the
  //     gate alone — see its declaration for the endCamBlend pop it avoids.
  const KEEP_Z0_BLEND = 2.55, KEEP_ZW_BLEND = 0.13;

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
  // The Final-cutaway hold's blend latch (see KEEP_Z0_BLEND): 1 everywhere a
  // blend has not touched; may only fall while one is in flight; eases home
  // after the landing. DELIBERATELY NOT reset by either lifecycle snap: a
  // reset would pop the colony on the landing frame — the exact shownPull
  // trap final/index.js's snap comment records. Every placement path that
  // needs exactness (boot, ?capture=, deep links) starts from the initial 1;
  // after a blend the ease below brings it home.
  let keepGate = 1;

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
    // AND THE JOURNEY'S PROGRESS IS NOT READ IN THIS ANIMATOR AT ALL. It was
    // `const pNow = window.journey.p`, and it survived fc1e151, 873246f and
    // 783729b — each of which retired one more p-keyed mask and each of which
    // left the growth front behind. With the front and its exit pulse on the
    // camera too (FRONT_X0), nothing here has any term but the pose, which is
    // the only claim that makes "a nav jump reveals exactly what a scrub does"
    // checkable rather than hopeful: if this line ever comes back, the reason
    // it comes back is the bug.
    // arrival mask (see SINK_D above): everything the chapter draws is scaled
    // by amount * arrival, and arrival is a pure function of the CAMERA — the
    // soil murk on the way under, the Final cutaway's territory above — so
    // the on-screen reveal is the geometry occluding, whatever path the lens
    // takes: scrub, reverse scrub, or a nav jump's blend. The camera is final
    // for this frame by the spine-first animator order (journey.js).
    const cp = sceneApi.camera.position;
    const depth = leg.groundY(cp.x, cp.z) - cp.y;
    const sink = smooth01(depth / SINK_D);
    // Both halves of the Final-cutaway hold: far enough along the leg AND on
    // the side of the ring the epilogue's section is read from (see KEEP_Z0).
    // `keepGate` is the blend latch (KEEP_Z0_BLEND's comment has the
    // measurement and the law): during a blend it may only fall — a
    // departure keeps its colony and retires it on the move, an arrival
    // holds it dark through every exposed landing pose — and after the
    // landing it eases home at the chapter's own rate, so the underground
    // glow warms up through the cutaway once the camera has settled.
    const xHalf = smooth01((-cp.x - KEEP_X0) / KEEP_XW);
    if (blending) {
      keepGate = Math.min(keepGate,
        xHalf * smooth01((cp.z - KEEP_Z0_BLEND) / KEEP_ZW_BLEND));
    } else {
      keepGate += (1 - keepGate) * Math.min(1, dt * 6.0);
      if (keepGate > 0.996) keepGate = 1;
    }
    const keep = xHalf * smooth01((cp.z - KEEP_Z0) / KEEP_ZW) * keepGate;
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
    // only the portrait field retires.
    //
    // THE LAST TERM IN THIS CHAPTER THAT WAS STILL KEYED TO p (2026-08-14 —
    // Hannah: "when I'm starting the loop from the last to the first the
    // ownership orbs are visible in that. They shouldn't become visible when
    // I'm above ground"). It was written as `1 - smooth01((p - 0.815)/0.030)`
    // and justified exactly as the shipped `keep` was: "p and the camera are a
    // bijection on the leg". True on the leg; false the moment a jump snaps p
    // while the camera has not moved. fc1e151 retired that premise for the
    // whole rest of this chapter and 873246f retired it for `keep`; this one
    // term was left behind, and the wrap is where it shows.
    //   Measured through a real wheel-driven DOWN-wrap (in-page rAF-timed
    // deltas; journey.wrap() is not the input path), 1440x900: at the Final
    // rest the mask is 0 and the orbs are dark — which is why the golden and
    // the epilogue are clean and why this was only ever visible on the loop.
    // One frame later p has snapped 0.97 -> 0, the camera has NOT moved
    // (x -14.72, depth -2.68 both frames), and the mask STEPS 0 -> 1: the
    // whole contributor field ignites at full strength over an open
    // above-ground view and stays there for 36 frames / 778 ms, until `keep`'s
    // z term happens to close at z ~ -0.8. The up-wrap showed nothing, because
    // its destination p is 0.97 where the mask is 0 — the two directions were
    // not mirrors, and the one that broke is the one Hannah named.
    //
    // Restated in the camera's own terms, which is what the rest of the
    // chapter already speaks: the faces are full while the lens is properly
    // under the soil and out before it pierces. FACE_D1 is SINK_D itself —
    // the depth at which this chapter already declares the colony fully
    // arrived — so the faces are full exactly when the colony is, and both
    // rests clear it (landscape depth 1.207, portrait 0.987, measured), which
    // is what keeps `owned@1440x900` and `owned@430x932` bit-identical.
    // FACE_D0 0.38 is the shipped window's own completion depth, measured on
    // the leg at the reference aspect (p 0.845 -> depth 0.3849), so the fade
    // still finishes while the lens is climbing through the colony's dark
    // upper reaches and still COMPLETES BEFORE the pierce (p 0.8555).
    //   It is also a fix on mobile, where the p-window was never right: at
    // aspect 0.461 the leg pierces at p 0.834, so the shipped window was still
    // fading the faces out at p 0.845 with the camera already 0.379 units
    // ABOVE ground. Depth cannot make that mistake at any aspect.
    // Reverse rides restore the faces through the same corridor, exactly, for
    // the same reason every other mask here mirrors: it is a pure function of
    // the camera.
    const faceVis = smooth01((depth - FACE_D0) / (FACE_D1 - FACE_D0));
    portraits.setFade(eff * faceVis);
    substrate.update(dt, t);
    portraits.update(dt, t);
    // The mesh answers the SAME node the portrait field is answering, at the
    // same eased strength — hovering a face lights that face's own filaments
    // and nothing else in the network. `faceVis` rides along so the epilogue
    // retires the local lighting with the faces it belongs to.
    substrate.setActiveNode(portraits.activeIdx, portraits.activeAmt * faceVis);

    // growth front: slow upward travelling wave, uneven, never a loop you
    // can count — plus the OW-5 exit pulse when the rise commits. The fan
    // sits straight down the rest gaze (the exit corridor IS the gaze), so it
    // is gated on how far the lens has TRAVELLED out along that corridor:
    // absent at the rest, arriving through the drift as the camera commits to
    // the rise. Pure in the camera — reverse scrubbing restores the rest frame
    // exactly, and a nav jump can no longer grow it over a pose the lens has
    // not left (see FRONT_X0). M5 ignition audit (D16): the arrival is a
    // DRAW-ON, not a fade — uGrow extends each strand from its aAlong=0 root
    // in the lit deep field up toward the soil, so the fan is visibly grown
    // out of the colony instead of igniting in view.
    const fg = smooth01((-cp.x - FRONT_X0) / FRONT_XW);
    frontMat.uniforms.uFade.value = eff;
    frontMat.uniforms.uGrow.value = fg * 1.15;
    frontMat.uniforms.uTime.value = t;
    frontP += dt * (0.075 + 0.05 * (0.5 + 0.5 * H.noise3(t * 0.06, 3.3, 0)));
    if (frontP > 1.35) frontP = -0.2;
    frontMat.uniforms.uPulse.value = frontP;
    frontMat.uniforms.uPulseOn.value = 0.45;

    // ...and the exit pulse commits on the same axis, for the same reason
    // (FRONT_FIRE_X). It used to fire the instant p snapped, which on a jump
    // out of Owned rolled the wave across a frame the lens had not left.
    const out = -cp.x;
    if (risePulseArmed && out > FRONT_FIRE_X) {
      risePulseArmed = false;
      frontP = -0.05;                       // the front fires...
      portraits.wavePulse(exitC, { speed: 5.0, width: 2.4, maxR: 13, amp: 0.75 });
      substrate.surge();                    // ...and the colony answers behind it
    } else if (!risePulseArmed && out < FRONT_ARM_X) {
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
    // the routable contributor set — this fixes the grey-box reachability gap
    // where only 4 of 16 contributors were registered.
    nodeIds: [...routableIds],

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
    // Navigation landing settles only the seam fade. portraits.snap() is the
    // stronger placement/capture contract and must not truncate visible entry.
    snapLanding() { amount = amountTarget; },
    dispose() { portraits.dispose(); },

    setHot(id, on) {
      // THE CROWN — the one hover that answers with the WHOLE root system
      // (Hannah, 2026-08-06, report C). This response used to hang off the
      // chapter's prose sub line, a 416x77 box in the middle of the frame
      // that a pointer travelling down to the faces crosses by accident: the
      // entire network flashed at what felt like random moments. It belongs
      // to the structure it describes. Every root leaves the crown, so a wave
      // launched there is the only one that legitimately reaches everyone.
      if (id === CROWN_ZONE_ID) {
        // THE CROWN NO LONGER PULSES ON ENTRY (Hannah, 2026-08-16: "there's
        // still a weird double pulse, and the profile switches immediately,
        // there should be a delay so it happens when the light hits").
        //
        // It used to launch a full colony wave here, the instant the pointer
        // arrived — and then the commit 340 ms later launched a SECOND wave,
        // the one that actually carries the re-deal. Two waves from one
        // gesture is the double pulse; and because the first wave was the one
        // the eye read as "the light", the faces appeared to turn over on
        // their own afterwards, unrelated to it.
        //
        // Now there is exactly one wave, launched at the commit by
        // trigger('remixPortraits'), and the swap is phase-locked to it — its
        // speed is derived from the swap's own duration so each face crosses
        // over as the front reaches it (see remix() in portraits.js). The
        // light and the switch are the same event, which is what she is
        // describing, and the dwell before it is the delay.
        //
        // Hovering therefore has no immediate scene response, deliberately.
        // The answer to the hover is the wave that follows it.
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
     *  (uSelIdx / uSelAmt).
     *
     *  Selection deliberately fires NO claim pulse: the colony-wide wave is an
     *  ARRIVAL gesture and stays in setHot.
     *  A card that is open for a minute must not sit on a pulsing colony. */
    trigger(name) {
      if (name === 'remixPortraits') {
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
        // amp 0.62. THIS IS NOW THE ONLY WAVE the crown produces — the
        // entry pulse it used to be measured against was removed 2026-08-16
        // (see setHot) — but the 0.62 is KEPT, because the reason for it never
        // had anything to do with that pulse: this wave lands on the same
        // pixels as the per-node swap flare, and at 375x812 the two together
        // at 1.0 washed the near faces out. Those two still co-occur, so the
        // measurement still holds. If the single light now reads too faint on
        // a big screen, this is the number to raise — and 375x812 is the shot
        // that has to be re-checked when it moves.
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
      const idx = portraits.indexOf(id);
      if (idx < 0) return;
      // Guarded release, exactly like setHot: a stale close arriving after a
      // retarget must not blank the newly selected portrait.
      if (on) portraits.setSelected(idx);
      else if (portraits.selIdx === idx) portraits.setSelected(-1);
    },

    /** LABEL POLICY (core/ui.js registration contract).
     *
     *  The ownership pods are retired (Ride-through #2): no in-scene pod chip
     *  remains, and nothing here returns a resting label for them.
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
      if (!c) return null;                 // anything else: default
      const text = [c.name, c.role].filter(Boolean).join(' · ');
      /* `chip: 'none'` — 2026-08-14, Hannah: "there are now two things that
         show on the orbs upon hover, can you please delete the smaller ones,
         we should only keep the black one above."
         The two were this chip (a dark pill with a gold dot and
         "CONTRIBUTOR · RESEARCHER") and the contributor card, which since
         b3dc34b opens on hover instead of on click. The pill is the smaller,
         and everything it said the card already says — `name` is the card's
         heading and `role` is its first line, from these same two fields. So
         it is deleted rather than duplicated.
         `label` STAYS, and is the whole point of keeping this policy: ui.js
         writes it to the button's `aria-label`, so the accessible name is
         "Contributor · Researcher" exactly as before. Nothing was drawn for a
         screen reader in the first place, and nothing is taken from one now.
         `labelOnHover` is still declared, and still true — there is no resting
         label — because the collision dodge and the arrival stagger both read
         it, and a chip that paints nothing at all is the strongest possible
         case of "nothing to stage". */
      return { labelOnHover: true, chip: 'none', label: text || id };
    },

    nodeWorld(id) {
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
