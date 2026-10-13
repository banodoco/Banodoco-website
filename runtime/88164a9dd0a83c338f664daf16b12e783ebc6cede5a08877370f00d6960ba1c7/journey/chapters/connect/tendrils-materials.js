// journey-v6 — CONNECT restage: the ground network's two shader materials.
//
// Extracted from `tendrils.js` by elegance order H02 (2026-08-21). This module
// is the chapter's RESOURCE leg: it holds both `ShaderMaterial`s, all four GLSL
// templates, and the two authored constants that set `uSoft`/`uTipW`. It
// constructs no geometry, draws no random numbers, and reads nothing the build
// produces — its whole input is `U`, the orchestrator's uniform bundle, and one
// texture handle.
//
// `U`'s uniform objects are passed through BY REFERENCE and must stay that way:
// `connect/index.js`'s `debugAdosAlignment()` asserts
// `strandMat.uniforms.uAdosShift === U.uAdosShift`, and the whole point of that
// identity is that ADOS never splits into a moved label and an old light.
//
// FRONT_SOFT / FRONT_TIP live here rather than in `tendrils.js` because they
// exist to parameterise these shaders — their rationale below is entirely about
// how `litMask`'s ramp reads on screen. `tendrils.js` re-exports them, so the
// chapter's export surface is unchanged; `connect/index.js` still reads
// `FRONT_SOFT` from `./tendrils.js` to key the hub kindle to this same width.
import * as THREE from 'three';
import { heat } from '../../anatomy.js';

// THE SHAPE OF THE FRONT (in global-along units, so it is the same physical
// softness on every route however long). FRONT_SOFT is the length of the
// quiet->lit ramp trailing the head: it is what makes the arrival read as a
// TRAIL kindling rather than a switch closing, and it was widened 0.05 -> 0.11
// with the one-route-at-a-time re-time (2026-08-06) — a slower front wants a
// longer gradient or it reads as a hard edge crawling across the ground.
//
// 0.11 -> 0.32 (2026-08-07, Hannah's THIRD report on this timing: "the way the
// ground lights up, that should happen a lot more gradually"). This is the one
// lever with real headroom left. The total p-window is very nearly pinned —
// the Connect rest at p 0.490 is a frozen reference still that must be fully
// lit, and the earliest the light may start is bounded by the camera-pure
// resolve, which does not draw the network at all before p 0.3500 — so the
// whole schedule can only be stretched ~1.17x. But how long a GIVEN PATCH OF
// GROUND takes to come up from quiet to lit is set by this ramp against the
// head's speed, and that is what "gradually" actually names. At 0.11 a strand
// lifted over 0.0040 of p — about a tenth of a second at a deliberate scroll,
// which is a wipe, not a growth. At 0.32 it lifts over 0.0110, near 0.30 s.
//
// It is bounded above, and not by taste: `hubIgnite` in index.js opens the
// core over this same width (the kindle must land with its own trail), and
// ADOS's hub sits only 0.42 along-units from the base, so a ramp wider than
// that would have the nearest hub already kindling as its front departs. The
// kindle therefore carries a floor of its own (see index.js) and this value is
// kept comfortably under ADOS's run.
//
// FRONT_TIP is the half-width of the brighter head riding at the very front,
// and is deliberately left near its shipped 0.028: the head runs hot enough to
// blow white where it crosses a braid (it does so on the shipped build too),
// and the slower front already holds it on screen longer, so widening it as
// well turned an accent into a cold streak. The trail is the SOFT ramp's job;
// the tip is only the glint that says where the light is right now.
// 0.32 -> 0.23 (2026-08-14, Hannah's SIXTH report, and the first one that names
// the CHARACTER rather than the speed: "make them feel like roots growing out,
// not lights turning on").
//
// The model was never the problem — the reveal is already a growth front, not a
// brightness envelope: `litMask = 1 - smoothstep(head - uSoft, head + 0.004,
// along)` is a tip travelling along aAlong over paths that already exist at
// uQuiet, which is a root advancing and not a lamp being switched. What made it
// read as a lamp was that at 1.70 s for the whole network (the measured shipped
// arrival — see constants.js COMMIT_GLIDE_PX) nothing had time to read as
// travel at all.
//
// With the road bought back, this ramp is re-narrowed, and the direction is the
// opposite of the last four passes' instinct for a reason. 0.32 was chosen when
// the front was FAST, where a wide ramp is the only way to avoid a hard edge
// crawling across the ground. A wide ramp on a SLOW front is the other failure:
// a third of the route swelling together reads as a region brightening — a lamp
// — instead of a tip with a trail behind it. Narrowing sharpens the tip while
// the per-patch lift still gets much longer in wall-clock, because the head is
// now so much slower. Measured, quiet->lit for ONE patch of ground (this ramp
// against each route's own head speed, at the released-gesture glide):
//
//     route      shipped   here     |  the ramp narrowed 0.72x on all three
//     Hivemind    0.14 s   0.20 s   |  and the lift still got longer, because
//     Discord     0.15 s   0.39 s   |  the head slowed by more than that
//     ADOS        0.23 s   0.60 s   |
//
// Hivemind gains least (1.4x) because it is the opener and this pass
// deliberately spends the least road there — see route.js `shape`. Still
// comfortably under ADOS's 0.42 along-unit run, so the kindle floor in index.js
// binds on exactly the route it was written for and nothing else changed.
export const FRONT_SOFT = 0.23;
export const FRONT_TIP = 0.032;

/* ================================================================
   Materials
   ================================================================ */
export function makeStrandMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uLit: U.uLit, uHead: U.uHead,   // vec3: one travelling front per route
      uLitMax: U.uLitMax,         // vec3: along-distance each front covers at uLit = 1
      uQuiet: U.uQuiet,           // brightness of a path BEFORE the light reaches it
      uQuietTier: U.uQuietTier,   // how far the quiet state flattens the tier contrast
      uRouteAmp: U.uRouteAmp,     // vec3: per-route brightness (hover lift / unrelated dim)
      uAdosShift: U.uAdosShift,   // responsive ground-plane dodge for ADOS + its authored rays
      uHairAmp: U.uHairAmp,       // hairline fill brightness (mild dim while any hub is hot)
      uPulseHead: U.uPulseHead,   // vec3: travelling pulse head per route (route-along 0..1; -2 parked)
      uPulseAmp: U.uPulseAmp,     // vec3: pulse strengths
      uExit: U.uExit,             // x: exit convergence amount (camera-driven)
      uWell: U.uWell,             // xy: world-xz centre of the copy brightness well, z: strength, w: radius
      uBase: { value: 1.05 },
      uNear: { value: 0.9 },
      uFar: { value: 0.055 },     // soft distance dim (own, gentler than scene fog)
      uColDeep: { value: heat(0.46, new THREE.Color()).clone() },
      uColGold: { value: heat(0.64, new THREE.Color()).clone() },
      uColHot: { value: heat(0.92, new THREE.Color()).clone() },
      uSoft: { value: FRONT_SOFT },
      uTipW: { value: FRONT_TIP },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aA;   // along (global 0..1), routeAlong (0..1), route (0,1,2; 3 hairline; 4 continuation), tier (-1 hub convergence, 0 primary, 1 secondary, 2 hairline, 3 faded continuation)
      attribute vec4 aB;   // seed, bright, patch, litRoute (0,1,2 — WHICH FRONT lights this vertex; hairline inherits its parent primary's)
      attribute float aAdosShiftW;
      uniform float uTime, uAmount, uQuiet, uQuietTier, uBase, uNear, uFar, uHairAmp, uSoft, uTipW;
      uniform vec3 uLit, uHead, uLitMax;
      uniform vec3 uRouteAmp, uPulseHead, uPulseAmp, uAdosShift;
      uniform float uExit;
      uniform vec4 uWell;
      uniform vec3 uColDeep, uColGold, uColHot;
      varying vec3 vCol;
      void main() {
        float along = aA.x, rAlong = aA.y, route = aA.z, tier = aA.w;
        float seed = aB.x, bright = aB.y, pat = aB.z, litRoute = aB.w;
        vec3 placed = position;
        // ADOS is the near, lower-left destination. Move its route as a
        // coherent bend: only primary/secondary route geometry feathers from
        // the planted stipe-side root. Hub/knot/continuation/hair/far-field
        // geometry translates as one authored ADOS lighting field, matching
        // its glints, particles and core rather than leaving a second origin.
        if (litRoute < 0.5) {
          placed += uAdosShift * aAdosShiftW;
        }
        vec4 mv = modelViewMatrix * vec4(placed, 1.0);
        float dist = length(mv.xyz);

        /* ---- the travelling light (the arrival) ----
           ONE FRONT PER ROUTE (2026-08-06): each route has its own uLit /
           uHead / uLitMax, so the three light in sequence rather than as one
           radial wave. Selected by if/else, never by dynamic vector index —
           the house idiom (see the pulse block below), and the only form that
           is safe on GLSL ES 1.0.
           litMask is 1 where the light has already passed and 0 ahead of it.
           It does not gate EXISTENCE — the path is there either way — it only
           lifts the strand from its quiet level to its lit one. ---- */
        float lit, headAmp, litMax;
        if (litRoute < 0.5)      { lit = uLit.x; headAmp = uHead.x; litMax = uLitMax.x; }
        else if (litRoute < 1.5) { lit = uLit.y; headAmp = uHead.y; litMax = uLitMax.y; }
        else                     { lit = uLit.z; headAmp = uHead.z; litMax = uLitMax.z; }
        // uLitMax already carries the ramp's own width as lead, so lit = 1
        // saturates this route's farthest tip exactly (buildTendrils measures it).
        float head = lit * litMax;
        float litMask = 1.0 - smoothstep(head - uSoft, head + 0.004, along);
        // the arriving head glows a touch brighter, fading once the light lands
        float dTip = (along - head) / uTipW;
        float tip = exp(-dTip * dTip) * headAmp;

        /* ---- ambient shimmer (tw idiom, slow: 0.1–0.4 Hz) ---- */
        float tw = 0.5 + 0.5 * sin(uTime * (0.63 + fract(seed * 7.31) * 1.88) + seed * 41.0);

        /* ---- travelling pulse along this route (base -> hub) ----
           gaussian via d*d products only — NEVER pow() with a base that can
           go negative (blades.js NaN law: one NaN fragment blacks the frame
           through the bloom mips and TAA holds it forever). ---- */
        float routeAmp = uHairAmp;
        float pulse = 0.0;
        if (route < 0.5)      { routeAmp = uRouteAmp.x; float d = (rAlong - uPulseHead.x) * 9.0; pulse = uPulseAmp.x * exp(-d * d); }
        else if (route < 1.5) { routeAmp = uRouteAmp.y; float d = (rAlong - uPulseHead.y) * 9.0; pulse = uPulseAmp.y * exp(-d * d); }
        else if (route < 2.5) { routeAmp = uRouteAmp.z; float d = (rAlong - uPulseHead.z) * 9.0; pulse = uPulseAmp.z * exp(-d * d); }
        // Ghost-pulse fix (audit 2026-08-04): continuations/frame-exits carry
        // their route's id (so hover lift reaches them) but restart rAlong at
        // 0 past the hub — without this gate a base-departing pulse lit them
        // simultaneously at the FAR side of the stage (and the pulse term is
        // deliberately not tierBase-scaled, so it showed at full brightness).
        // Pulses live on the route proper: primaries (tier 0) and the
        // fork-spill on secondaries (tier 1).
        // ...AND NOT ON THE HUB CONVERGENCE (2026-08-17, Hannah: "weird white
        // flash in the right bg sometimes"). Every spoke and knot segment
        // carries rAlong = 1.0 exactly, so a landing pulse lit the WHOLE
        // starburst simultaneously — dozens of overlapping additive segments
        // at the hubs' raised brightness (1.5/1.6) through near-white uColHot,
        // clamping and blooming into a white flash at the hub (measured at the
        // Connect rest: right-bg px>200 count 307 -> 815 on the frame the
        // Discord pulse landed). It is also the other half of the 2026-08-11
        // "destinations hold STABLE" law: that pass held the core sprite
        // still; the starburst now holds still with it. The travelling light
        // on the strand remains the life, and it still visibly reaches the
        // hub — the primaries' own braid runs to rAlong 1.0.
        if (tier > 2.5 || tier < -0.5) pulse = 0.0;

        /* ---- exit convergence: energy drains home into the root ---- */
        float nearBase = exp(-along * 5.5);
        float exit = uExit * (1.9 * nearBase - 0.55 * smoothstep(0.25, 0.7, along));

        /* ---- the copy brightness well (in-world calm zone, no overlays) ---- */
        vec2 dw = placed.xz - uWell.xy;
        float well = 1.0 - uWell.z * exp(-dot(dw, dw) / (uWell.w * uWell.w));

        /* ---- distance shaping: near fade (lens through clean air) + far calm ---- */
        float distK = smoothstep(uNear * 0.35, uNear, dist) * exp(-uFar * uFar * dist * dist);

        float tierBase = tier < 0.5 ? 1.0 : (tier < 1.5 ? 0.46 : (tier < 2.5 ? 0.20 : 0.26));
        // continuations thin toward their tips (they leave the stage, not end on it)
        if (tier > 2.5) tierBase *= 1.0 - 0.85 * smoothstep(0.55, 1.0, rAlong);
        // UNLIT the tiers converge: a quiet path is just web, not a highway.
        // LIT they separate again and the primaries read thicker by structure.
        float tierNow = mix(mix(tierBase, 0.42, uQuietTier), tierBase, litMask);

        // Hub convergence (tier -1: the radial spokes and the core knot).
        // Numerically it is tier 0 everywhere else in this shader — the
        // tierBase ladder and the tier > 2.5 gates both read it as primary —
        // but it goes MUCH quieter than the rest of the web before its light
        // lands, because a resting starburst at the ambient level would read
        // as a hub already lit, and the whole point is that the hubs KINDLE
        // as the light reaches them.
        float quietHere = uQuiet * (tier < -0.5 ? 0.22 : 1.0);

        // uAmount already carries the camera-pure resolve (index.js), so a
        // path that has not resolved contributes exactly nothing.
        float gate = uAmount * distK * pat * well;
        float level = mix(quietHere, 1.0, litMask);
        float b = uBase * bright * tierNow * routeAmp * (0.72 + 0.28 * tw) * (1.0 + exit) * level;
        vCol = uColDeep * (b * 0.5)
             + uColGold * (b * 0.62)
             // NOT litMask-scaled: tip IS the arriving head and lives exactly
             // where litMask is crossing zero (scaling it here erases it), and
             // pulse/exit only ever fire on already-lit paths.
             + uColHot * ((tip * 1.4 + pulse + max(exit, 0.0) * 0.22 * nearBase) * bright * pat);
        vCol *= gate;
        gl_Position = projectionMatrix * mv;
      }`,
    // THE CLAMPS ARE LOAD-BEARING (blades.js lesson, kept): rare garbage
    // varyings on this ANGLE Metal path must come out finite — one NaN/Inf
    // pixel becomes NaN through bloom, and TAA holds it forever.
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      void main() {
        gl_FragColor = vec4(min(max(vCol, vec3(0.0)), vec3(48.0)), 1.0);
      }`,
  });
}

/** Points — junction glints + drifting particles share one material.
 *  aP = (along, seed, kind 0 glint / 1 particle, baseAlpha); aR is the LIT
 *  ROUTE (which front lights this point — same law as the strands' aB.w);
 *  aLife is a CPU-written per-frame window for the particles (1.0 for glints). */
export function makePointMat(U, tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount, uLit: U.uLit, uQuiet: U.uQuiet,
      uLitMax: U.uLitMax,
      uAdosShift: U.uAdosShift,
      uAdosHubAlong: U.uAdosHubAlong,
      uSoft: { value: FRONT_SOFT },
      uPartAmp: U.uPartAmp,      // particle visibility gate (fully lit only)
      uMap: { value: tex },
      uSize: { value: 30.0 },
      uCol: { value: heat(0.78, new THREE.Color()).clone() },
      uCol2: { value: heat(0.60, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aP;      // along, seed, kind, baseAlpha
      attribute float aR;     // lit route (0,1,2) — which front lights this point
      attribute float aLife;
      attribute float aAdosShiftW;
      uniform float uTime, uQuiet, uSize, uPartAmp, uSoft, uAdosHubAlong;
      uniform vec3 uLit, uLitMax, uAdosShift;
      varying vec2 vA;        // alpha, seed
      void main() {
        float along = aP.x, seed = aP.y, kind = aP.z, baseA = aP.w;
        vec3 placed = position;
        if (aR < 0.5) {
          // Drifting particles carry a live along coordinate; static glints
          // carry a CPU-resolved field/route weight. Both therefore match the
          // strand underneath on every animation frame, not only at rest.
          float shiftW = kind > 0.5
            ? smoothstep(0.12, 0.82, along / max(uAdosHubAlong, 0.0001))
            : aAdosShiftW;
          placed += uAdosShift * shiftW;
        }
        vec4 mv = modelViewMatrix * vec4(placed, 1.0);
        float dist = length(mv.xyz);
        // junction glints follow the strands: quiet until their OWN route's
        // light passes, then full. (Particles ride uPartAmp, which only opens
        // once every route has landed.)
        float lit, litMax;
        if (aR < 0.5)      { lit = uLit.x; litMax = uLitMax.x; }
        else if (aR < 1.5) { lit = uLit.y; litMax = uLitMax.y; }
        else               { lit = uLit.z; litMax = uLitMax.z; }
        float head = lit * litMax;
        float litMask = 1.0 - smoothstep(head - uSoft, head + 0.004, along);
        float tw = 0.5 + 0.5 * sin(uTime * (0.7 + fract(seed * 9.13) * 1.6) + seed * 57.0);
        float a = baseA * mix(uQuiet, 1.0, litMask) * (0.45 + 0.55 * tw) * aLife;
        a *= mix(1.0, uPartAmp, step(0.5, kind));
        a *= smoothstep(0.5, 1.1, dist);
        float sz = uSize * (0.6 + fract(seed * 5.7) * 0.8) / max(dist, 0.5);
        // hero min-px-clamp trick: clamp px size, pay in alpha
        float px = max(sz, 1.6);
        a *= (sz / px) * (sz / px);
        vA = vec2(a, seed);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = px;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uAmount;
      uniform vec3 uCol, uCol2;
      varying vec2 vA;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = clamp(vA.x, 0.0, 1.0) * clamp(uAmount, 0.0, 1.0);
        vec3 col = mix(uCol, uCol2, fract(vA.y * 9.3) * 0.7);
        gl_FragColor = vec4(col, tex.a * a);
      }`,
  });
}
