// journey-v6 — CONNECT restage (doc 16): the ground network.
//
// The chapter's stage moved from the under-cap gill chamber to the open
// ground (16-connect-ground-restage.md): luminous surface tendrils grow out
// of the stipe base and run across the terrain to three glowing hubs —
// ADOS (near), Hivemind (mid), Discord (far) — with strands continuing past
// the hubs and past the frame edges. This file owns ALL geometry + shaders;
// connect/index.js stays the orchestrator (arming, drivers, hover, drive(p),
// node anchors).
//
// TERRAIN LAW (doc §3): every vertex sits at groundY(x, z) + lift, lift
// 0.015–0.06 — the same law the hero's own ground web obeys (organism.js §8,
// mirrored in ../../anatomy.js). Nothing floats, nothing sinks. The whole
// group parents to a NON-sway node (sceneApi.scene): the network is rooted
// terrain; it must not sway with the cap.
//
// NETWORK ANATOMY (runners + neural + fibre-optic; never tree roots /
// lightning / circuit-board):
//   · 3 primary routes, one per hub, leaving the stipe base at distinct
//     azimuths, meandering (low-frequency wander + secondary curvature; no
//     straight runs, no right angles). Each is a loose braid of 2–3 strands
//     (the Hivemind-braid precedent) so primaries read thicker BY STRUCTURE.
//   · Secondary branches forking at oblique angles, thinning, some
//     reconnecting (anastomosis — fungal, not dendritic).
//   · Hairline fill knitting the sector together, PATCHY (whole pockets stay
//     dark — the patchOf precedent; organic asymmetry is the house look).
//   · Junction glints where strands meet (bead points, existing glow tex).
//   · Hubs: 9–13 short strands converging to a bright core (glow sprite +
//     tight ground-knot, ADOS-knot precedent), with 2–3 strands continuing
//     PAST each hub toward and beyond the frame edge.
//   · A few long strands exit frame left/right at low brightness.
//
// SHADER LAWS (doc §7 — hard-won; violations have blacked whole frames):
// vertex-heavy / fragment-cheap (everything smooth along a strand is
// computed per vertex and shipped premultiplied; fragments are clamps and a
// couple of mixes), every varying clamped to its domain, pow() bases
// strictly positive, output capped at 48, additive blending, depthWrite
// false, frustumCulled false. Budget: segments well under the chamber's old
// ~5k, points ≤ 500.
//
// THE PATHS PRE-EXIST; ARRIVING LIGHTS THEM UP (2026-08-05, Hannah: "make it
// so the stuff that appears on the ground when you enter the section actually
// moves along the lines that are already there rather than creating new lines
// ... currently it feels weird that they just appear"). The network is no
// longer GROWN as geometry keyed to leg progress. Two gates now stack:
//
//   uAmount   arm x the CAMERA-PURE resolve (index.js computes the resolve
//             from the camera's own gaze — no timeline, no p — and folds it
//             into this one uniform). It is what brings the QUIET,
//             un-highlighted paths out of the ground as the eye drops onto
//             it, exactly the way real ground detail resolves as you come
//             down to it, and dissolves them back on the way out. It is
//             EXACTLY ZERO at the hero pose and at the Inspire rest, which is
//             what keeps those protected frames untouched.
//   uLit      the travelling LIGHT (pure in p, so reverse scrubs mirror): a
//             soft front sweeps outward along aAlong (0 at the stipe base,
//             1 at the farthest strand tip) lifting each strand from its
//             quiet level to its full one, with a brighter head at the front
//             (uHead). Nothing appears; the light simply arrives.
//
// ONE ROUTE AT A TIME (2026-08-06, Hannah: "make them happen ONE AT A TIME and
// A LOT SLOWER ... it should feel like an ecosystem growing"). uLit/uHead are
// now vec3 — ONE FRONT PER ROUTE — and every vertex carries the id of the
// route whose front owns it (aB.w, the LIT ROUTE) alongside aA.z (which keeps
// owning hover amp and pulses, and is 3 for the hairline fill). The hairline
// inherits the lit route of the primary it was scattered around, so the fill
// near a hub lights with that hub rather than as one flat sheet. uLitMax is
// the along-distance each front must cover to saturate its own route's
// farthest tip (measured at build, plus the front's own ramp width), so a
// route's uLit runs a clean 0..1 no matter how long the route is, and
// index.js can key the hub kindle off the same number.

//
// So a strand's brightness is mix(uQuiet, 1.0, litMask) * uAmount, and the
// tier contrast is compressed in the quiet state (uQuietTier) so the resting
// network reads as ONE ambient web — the hero's own ground web (organism.js
// §8) organised into three routes — rather than as three bright highways
// waiting to be switched on. At the arm boundaries uResolve is 0: armed but
// invisible, the Final chapter's "dark at arm" law, now camera-keyed.
import * as THREE from 'three';
import { makeRng, gaussOf, heat, groundY, makeGlowTexture } from '../../anatomy.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const tmpC = new THREE.Color();

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
export const FRONT_SOFT = 0.32;
export const FRONT_TIP = 0.032;

function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
const sm = (a, b, x) => smooth01((x - a) / (b - a));

/* ================================================================
   The three hubs — world positions authored against the live rest
   frame (doc §3: "the frame is the spec"). ADOS nearest the base
   (lower-centre-left of frame), Hivemind mid-frame upper-network,
   Discord far right. y is derived from the terrain law at build.
   ================================================================ */
// ADOS moved LEFT of the mushroom (Hannah's mockup, 2026-08-04): the hub now
// sits in the lower-left ground field — world (+x, +z) is the camera-left
// foreground at the rest pose — with its own primary route running out of
// the stipe base and past the LEFT of the stem. Chip lands clearly left of
// the stem silhouette and fully clear of the centred copy block at 1280×800
// and 1440×900 (the previous centre-frame spot put it under the headline).
// Departure azimuth re-aimed to match (0.20 → 0.86); the braid/meander
// language and the route id are unchanged. Hivemind/Discord keep their
// audit-pass positions (1.65 → 1.38 −x nudge etc. — see git history).
// Core scales ~1.35× (with the resting-opacity lift in index.js) so each
// hub reads as a destination-beacon at rest — controlled halo, not
// lens-flare.
//
// TOP-LEFT / TOP-RIGHT RESTAGE (Hannah, 2026-08-04): with the mushroom in the
// frame's upper-left and the copy block in the upper-right, all three hubs are
// re-placed to fan through the open diagonal band between them — the ground
// that owns the lower two-thirds of the new rest frame. Authored against the
// live frame (doc §3: "the frame is the spec") and checked at 1440x900,
// 1280x800 and 375x812. Departure azimuths fan 37 / -27 / -8 deg out of the
// stipe base so the three primaries leave in genuinely different directions
// and never run as a bundle; the hubs land at world radius 4.3 / 5.6 / 8.0 —
// near / mid / far, exactly the narrative order (ADOS the flagship nearest the
// base, Discord the far everyday door).
export const HUBS = {
  ados:     { pos: new V3(3.40, 0, 2.60), az: 0.65, spokes: 13, coreScale: 0.46 },
  hivemind: { pos: new V3(5.00, 0, -2.60), az: -0.48, spokes: 11, coreScale: 0.40 },
  discord:  { pos: new V3(7.80, 0, -1.80), az: -0.15, spokes: 9,  coreScale: 0.36 },
};
export const HUB_IDS = ['ados', 'hivemind', 'discord'];

// Stipe footprint: routes leave the base at the stem's visible edge.
const BASE_R = 0.52;
const LIFT_LO = 0.015, LIFT_HI = 0.06;

const gy = (x, z, lift) => groundY(x, z) + lift;

/* ================================================================
   Materials
   ================================================================ */
function makeStrandMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uLit: U.uLit, uHead: U.uHead,   // vec3: one travelling front per route
      uLitMax: U.uLitMax,         // vec3: along-distance each front covers at uLit = 1
      uQuiet: U.uQuiet,           // brightness of a path BEFORE the light reaches it
      uQuietTier: U.uQuietTier,   // how far the quiet state flattens the tier contrast
      uRouteAmp: U.uRouteAmp,     // vec3: per-route brightness (hover lift / unrelated dim)
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
      uniform float uTime, uAmount, uQuiet, uQuietTier, uBase, uNear, uFar, uHairAmp, uSoft, uTipW;
      uniform vec3 uLit, uHead, uLitMax;
      uniform vec3 uRouteAmp, uPulseHead, uPulseAmp;
      uniform float uExit;
      uniform vec4 uWell;
      uniform vec3 uColDeep, uColGold, uColHot;
      varying vec3 vCol;
      void main() {
        float along = aA.x, rAlong = aA.y, route = aA.z, tier = aA.w;
        float seed = aB.x, bright = aB.y, pat = aB.z, litRoute = aB.w;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
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
        // Pulses live on the route proper: primaries, spokes, knots (tier 0)
        // and the fork-spill on secondaries (tier 1).
        if (tier > 2.5) pulse = 0.0;

        /* ---- exit convergence: energy drains home into the root ---- */
        float nearBase = exp(-along * 5.5);
        float exit = uExit * (1.9 * nearBase - 0.55 * smoothstep(0.25, 0.7, along));

        /* ---- the copy brightness well (in-world calm zone, no overlays) ---- */
        vec2 dw = position.xz - uWell.xy;
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
function makePointMat(U, tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount, uLit: U.uLit, uQuiet: U.uQuiet,
      uLitMax: U.uLitMax,
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
      uniform float uTime, uQuiet, uSize, uPartAmp, uSoft;
      uniform vec3 uLit, uLitMax;
      varying vec2 vA;        // alpha, seed
      void main() {
        float along = aP.x, seed = aP.y, kind = aP.z, baseA = aP.w;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
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

/* ================================================================
   Route centre-lines
   ================================================================ */
/** Catmull-Rom through 4 points, plus organic wander. */
function sampleRoute(base, hub, rnd, bowSign) {
  const dir = hub.clone().sub(base);
  const len = dir.length();
  const perp = new V3(-dir.z, 0, dir.x).normalize();
  const bow1 = bowSign * (0.55 + rnd() * 0.5) * len * 0.22;
  const bow2 = -bowSign * (0.3 + rnd() * 0.45) * len * 0.16;
  const c1 = base.clone().lerp(hub, 0.33).addScaledVector(perp, bow1);
  const c2 = base.clone().lerp(hub, 0.7).addScaledVector(perp, bow2);
  const pts = [base, c1, c2, hub];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.6);
  const N = 56;
  const out = [];
  const w1 = 2.2 + rnd() * 1.6, w2 = 5.0 + rnd() * 2.6;
  const p1 = rnd() * TAU, p2 = rnd() * TAU;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    // secondary curvature: two incommensurate perpendicular sines, zero at
    // both ends so departure and arrival stay exact
    const env = Math.sin(Math.PI * t);
    const wob = (Math.sin(t * w1 * 2 + p1) * 0.10 + Math.sin(t * w2 * 2 + p2) * 0.045) * env;
    p.addScaledVector(perp, wob);
    out.push(p);
  }
  return out;
}

/** Cumulative arc length per sample. */
function arcLengths(poly) {
  const acc = [0];
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + poly[i].distanceTo(poly[i - 1]));
  return acc;
}

/** Point at arc-fraction t of a polyline (with its arc table). */
function polyAt(poly, arcs, t) {
  const target = t * arcs[arcs.length - 1];
  let i = 1;
  while (i < arcs.length - 1 && arcs[i] < target) i++;
  const seg = arcs[i] - arcs[i - 1] || 1e-6;
  const f = (target - arcs[i - 1]) / seg;
  return poly[i - 1].clone().lerp(poly[i], f);
}

/* ================================================================
   The build
   ================================================================ */
export function buildTendrils(group, U) {
  const rnd = makeRng(160817);
  const gauss = () => gaussOf(rnd);
  const counts = { primarySegs: 0, secondarySegs: 0, hairSegs: 0, hubSegs: 0, contSegs: 0, glints: 0, particles: 0 };

  // patchy sector luminosity — whole pockets stay dark (organic asymmetry)
  const patchOf = (x, z) => {
    const p = 0.5 + 0.5 * (0.6 * Math.sin(x * 0.9 + z * 0.7 + 1.4) + 0.4 * Math.sin(x * 1.7 - z * 1.1 + 4.0));
    return 0.42 + 0.66 * p;
  };

  // How far each route's own light front has to travel to saturate its own
  // farthest vertex — measured here rather than assumed, because
  // continuations and frame-exit strands run past the hub by different
  // amounts on each route. index.js keys the hub kindle off the same numbers.
  const routeReach = [0, 0, 0];

  // strand buffers
  const sp = [], sA = [], sB = [];
  // `lr` is the LIT ROUTE — which front lights this segment. It equals `route`
  // everywhere except the hairline fill, whose route id is 3 (that id owns the
  // hover amp) but which lights with the primary it was scattered around.
  function pushSeg(P0, P1, a0, a1, ra0, ra1, route, tier, seed, b0, b1, lr = route) {
    sp.push(P0.x, P0.y, P0.z, P1.x, P1.y, P1.z);
    sA.push(a0, ra0, route, tier, a1, ra1, route, tier);
    const pa = patchOf(P0.x, P0.z), pb = patchOf(P1.x, P1.z);
    sB.push(seed, b0, pa, lr, seed, b1, pb, lr);
    const far = a0 > a1 ? a0 : a1;
    if (far > routeReach[lr]) routeReach[lr] = far;
  }

  // glint/particle buffers
  const gp = [], gP = [], gR = [];
  function pushGlint(P, along, alpha, lr) {
    gp.push(P.x, P.y + 0.012, P.z);
    gP.push(along, rnd(), 0, alpha);
    gR.push(lr);
    counts.glints++;
  }

  /* ---- ground the hub positions ---- */
  for (const id of HUB_IDS) {
    const h = HUBS[id];
    h.pos.y = gy(h.pos.x, h.pos.z, 0.03);
  }

  /* ---- primary routes: base -> hub, braided ---- */
  const routes = [];   // { id, poly, arcs, len }
  const bows = { ados: 1, hivemind: -1, discord: 1 };
  let maxAlong = 0;

  HUB_IDS.forEach((id, ri) => {
    const h = HUBS[id];
    const base = new V3(Math.cos(h.az) * BASE_R + 0.05, 0, Math.sin(h.az) * BASE_R + 0.02);
    base.y = gy(base.x, base.z, 0.03);
    const poly = sampleRoute(base, h.pos.clone(), rnd, bows[id]);
    // terrain law on the centre-line itself
    for (const p of poly) p.y = gy(p.x, p.z, 0.03);
    const arcs = arcLengths(poly);
    routes.push({ id, poly, arcs, len: arcs[arcs.length - 1], base });
    maxAlong = Math.max(maxAlong, arcs[arcs.length - 1] + 3.2);   // + room for continuations
  });

  const AL = (worldArc) => worldArc / maxAlong;    // world arc length -> global along

  routes.forEach((R, ri) => {
    const nStrands = R.id === 'discord' ? 2 : 3;
    for (let k = 0; k < nStrands; k++) {
      const ph0 = (k / nStrands) * TAU + rnd() * 0.8;
      const twist = 3.6 + rnd() * 2.2;
      const br = 0.030 + rnd() * 0.022;
      const seed = rnd();
      const bright = 0.8 + rnd() * 0.25;
      let prev = null;
      for (let i = 0; i < R.poly.length; i++) {
        const t = i / (R.poly.length - 1);
        const p = R.poly[i];
        const nxt = R.poly[Math.min(i + 1, R.poly.length - 1)];
        const dir = nxt.clone().sub(R.poly[Math.max(i - 1, 0)]);
        const perp = new V3(-dir.z, 0, dir.x).normalize();
        const ph = ph0 + t * twist * TAU;
        // braid tightens into the base and into the hub
        const tight = (0.35 + 0.65 * Math.sin(Math.PI * Math.min(t * 1.15, 1)) ** 0.7);
        const q = p.clone().addScaledVector(perp, Math.cos(ph) * br * tight);
        const lift = 0.028 + 0.020 * Math.sin(ph * 0.7 + seed * 9.0) * tight;   // stays in [0.008..0.048]
        q.y = gy(q.x, q.z, Math.max(LIFT_LO, Math.min(LIFT_HI, lift)));
        const node = { q, a: AL(R.arcs[i]), ra: t };
        if (prev) {
          pushSeg(prev.q, q, prev.a, node.a, prev.ra, t, ri, 0, seed, bright, bright);
          counts.primarySegs++;
        }
        prev = node;
      }
    }
  });

  /* ---- secondary branches (forks, oblique, thinning, some anastomosing) ---- */
  routes.forEach((R, ri) => {
    const nSec = 5 + Math.floor(rnd() * 2);
    for (let s = 0; s < nSec; s++) {
      const t0 = 0.18 + rnd() * 0.6;
      const P0 = polyAt(R.poly, R.arcs, t0);
      const dirAt = polyAt(R.poly, R.arcs, Math.min(t0 + 0.03, 1)).sub(polyAt(R.poly, R.arcs, Math.max(t0 - 0.03, 0))).normalize();
      const side = rnd() < 0.5 ? 1 : -1;
      const ang = side * (0.5 + rnd() * 0.55);           // oblique, never right-angle
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const bd = new V3(dirAt.x * cosA - dirAt.z * sinA, 0, dirAt.x * sinA + dirAt.z * cosA);
      const anastomose = rnd() < 0.35;
      const len = anastomose ? 0 : 0.7 + rnd() * 1.5;
      let end;
      if (anastomose) {
        // reconnect further along the same route (fungal cross-link)
        const t1 = Math.min(t0 + 0.14 + rnd() * 0.2, 0.96);
        end = polyAt(R.poly, R.arcs, t1);
      } else {
        end = P0.clone().addScaledVector(bd, len);
      }
      const perp = new V3(-(end.z - P0.z), 0, end.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 0.5;
      const SEG = 14;
      const seed = rnd();
      let prev = null;
      let arc = t0 * R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 7 + seed * 20) * 0.03 * Math.sin(Math.PI * t));
        p.y = gy(p.x, p.z, 0.02 + 0.015 * Math.sin(t * 5 + seed * 11));
        const node = { p, arc };
        if (prev) {
          arc += p.distanceTo(prev.p);
          const b0 = (1 - 0.6 * ((i - 1) / SEG)), b1 = (1 - 0.6 * (i / SEG));   // thinning
          pushSeg(prev.p, p, AL(prev.arc), AL(arc), t0, t0, ri, 1, seed, b0 * 0.9, b1 * 0.9);
          counts.secondarySegs++;
        }
        prev = { p, arc };
      }
      if (rnd() < 0.7) pushGlint(P0, AL(t0 * R.len), 0.5 + rnd() * 0.4, ri);
      if (anastomose && rnd() < 0.7) pushGlint(end, AL(arc), 0.4 + rnd() * 0.4, ri);
    }
  });

  /* ---- hairline fill: sparse web knitting the sector, patchy ---- */
  {
    const N_TRY = 240;
    for (let i = 0; i < N_TRY; i++) {
      // the fill lights with the primary it belongs to, so the web around a
      // hub kindles with that hub instead of as one flat sheet
      const rIdx = Math.floor(rnd() * routes.length);
      const R = routes[rIdx];
      const t0 = 0.1 + rnd() * 0.85;
      const A = polyAt(R.poly, R.arcs, t0);
      // scatter around the route corridor
      const off = 0.25 + Math.pow(rnd(), 1.4) * 1.1;
      const oa = rnd() * TAU;
      const P0 = new V3(A.x + Math.cos(oa) * off, 0, A.z + Math.sin(oa) * off);
      // dark pockets survive: patchy acceptance
      if (patchOf(P0.x, P0.z) < 0.62 && rnd() < 0.72) continue;
      const len = 0.3 + rnd() * 0.75;
      const da = rnd() * TAU;
      const P1 = new V3(P0.x + Math.cos(da) * len, 0, P0.z + Math.sin(da) * len);
      const seed = rnd();
      const SEG = 5;
      const along0 = AL(t0 * R.len + off);
      const perp = new V3(-(P1.z - P0.z), 0, P1.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 0.16;
      let prev = null, arc = t0 * R.len + off;
      for (let sgi = 0; sgi <= SEG; sgi++) {
        const t = sgi / SEG;
        const p = P0.clone().lerp(P1, t).addScaledVector(perp, Math.sin(Math.PI * t) * bow);
        p.y = gy(p.x, p.z, LIFT_LO + rnd() * 0.012);
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, along0, AL(arc), 0.5, 0.5, 3, 2, seed, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, rIdx);
          counts.hairSegs++;
        }
        prev = p;
      }
      if (rnd() < 0.16) pushGlint(P0, along0, 0.3 + rnd() * 0.3, rIdx);
    }
  }

  /* ---- hubs: radial convergence + ground-knot + continuations ---- */
  const hubMeta = [];   // { id, pos, along, portAnchor } — index.js drives ignition
  routes.forEach((R, ri) => {
    const h = HUBS[R.id];
    const hubAlong = AL(R.len);
    // Portrait label anchor (the hiveAnchorLand/Port precedent, doc §3): the
    // narrow portrait frustum cannot always hold the hub itself, so a chip
    // may ride its route's in-frame stretch instead. The network is one
    // world-space build; only the ANCHOR is per-orientation.
    // TOP-LEFT/TOP-RIGHT RESTAGE (2026-08-04): only DISCORD still needs one.
    // At 375x812 all three hub cores are inside the frame, but Discord's sits
    // 10 px from the right edge, so its pill (99 px, drawn to the right of the
    // dot) would run off. Its chip rides route-t 0.25 instead — the stretch of
    // Discord's own run that sits in the open lower-middle band, 24 px clear
    // of the ADOS chip and 66 px clear of Hivemind's. ADOS and Hivemind anchor
    // on their hubs in BOTH orientations now (t 1.00 = the route's hub end).
    const PORT_T = { ados: 1.00, hivemind: 1.00, discord: 0.25 };
    const portAnchor = polyAt(R.poly, R.arcs, PORT_T[R.id]);
    portAnchor.y = gy(portAnchor.x, portAnchor.z, 0.04);
    hubMeta.push({ id: R.id, pos: h.pos.clone(), along: hubAlong, route: ri, portAnchor });

    // radial convergence spokes
    for (let s = 0; s < h.spokes; s++) {
      const a = (s / h.spokes) * TAU + rnd() * 0.5;
      const rr = 0.45 + rnd() * 0.5;
      const P0 = new V3(h.pos.x + Math.cos(a) * rr, 0, h.pos.z + Math.sin(a) * rr);
      const seed = rnd();
      const SEG = 7;
      let prev = null;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(h.pos, t);
        p.x += gauss() * 0.02 * (1 - t);
        p.z += gauss() * 0.02 * (1 - t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * (1 - t) + 0.012 * t);
        if (prev) {
          // spokes carry the hub's along so they ignite as the front arrives;
          // rAlong 1.0 = the hub end of the route (pulses land here).
          // 1.1 → 1.5 (audit taste pass): the radial-spoke convergence is the
          // hub's resting signature — it must read against the ambient web.
          // tier -1 = hub convergence: identical to tier 0 once lit (same
          // tierBase, same pulse rights), far quieter before (see the shader).
          pushSeg(prev, p, hubAlong + 0.012 * (1 - t), hubAlong + 0.012 * (1 - t), 1.0, 1.0, ri, -1, seed,
            (0.5 + 0.5 * t) * 1.5, (0.5 + 0.5 * Math.min(t + 1 / SEG, 1)) * 1.5);
          counts.hubSegs++;
        }
        prev = p;
      }
    }

    // tight ground-knot at the core (ADOS-knot precedent, flattened to terrain)
    {
      const N = 7;
      for (let k = 0; k < N; k++) {
        const a0 = rnd() * TAU, span = 1.5 + rnd() * 2.4;
        const Rk = 0.05 + rnd() * 0.09;
        const seed = rnd();
        const SEG = 6;
        let prev = null;
        for (let j = 0; j <= SEG; j++) {
          const t = j / SEG;
          const a = a0 + t * span;
          const rr = Rk * (1 - 0.3 * t);
          const p = new V3(h.pos.x + Math.cos(a) * rr, 0, h.pos.z + Math.sin(a) * rr);
          p.y = gy(p.x, p.z, 0.02 + 0.018 * Math.sin(a * 2 + seed * 7));
          if (prev) {
            // 1.35 → 1.6 (audit taste pass): the tight core knot anchors the
            // starburst's centre of gravity at rest.
            pushSeg(prev, p, hubAlong, hubAlong, 1.0, 1.0, ri, -1, seed, 1.6, 1.6);
            counts.hubSegs++;
          }
          prev = p;
        }
      }
    }

    // continuations PAST the hub: outward, thinning to nothing off-stage
    const nCont = R.id === 'ados' ? 2 : 3;
    for (let c = 0; c < nCont; c++) {
      const away = h.pos.clone().sub(R.base).normalize();
      const spread = (c - (nCont - 1) / 2) * (0.5 + rnd() * 0.25) + gauss() * 0.1;
      const ca = Math.atan2(away.z, away.x) + spread;
      const clen = 2.4 + rnd() * 2.2;
      const end = new V3(h.pos.x + Math.cos(ca) * clen, 0, h.pos.z + Math.sin(ca) * clen);
      const perp = new V3(-(end.z - h.pos.z), 0, end.x - h.pos.x).normalize();
      const bow = (rnd() - 0.5) * 0.9;
      const seed = rnd();
      const SEG = 16;
      let prev = null, arc = R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = h.pos.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 6 + seed * 25) * 0.05 * t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * rnd());
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, AL(Math.min(arc, maxAlong * 0.995)), AL(Math.min(arc, maxAlong * 0.995)),
            t, Math.min(t + 1 / SEG, 1), ri, 3, seed, 0.9, 0.9);
          counts.contSegs++;
        }
        prev = p;
      }
    }
  });

  /* ---- long frame-exit strands (the larger, living ecosystem) ---- */
  {
    const exits = [
      { from: 0.55, route: 0, dir: 1.9, len: 4.6 },    // off toward frame-left past the mushroom
      { from: 0.45, route: 1, dir: -2.5, len: 4.2 },   // low frame-left/near
      { from: 0.7, route: 2, dir: -0.15, len: 4.4 },   // far frame-right
      { from: 0.75, route: 0, dir: 0.62, len: 4.8 },   // near-field: crosses the right foreground and exits
    ];
    for (const ex of exits) {
      const R = routes[ex.route];
      const P0 = polyAt(R.poly, R.arcs, ex.from);
      const end = new V3(P0.x + Math.cos(ex.dir) * ex.len, 0, P0.z + Math.sin(ex.dir) * ex.len);
      const perp = new V3(-(end.z - P0.z), 0, end.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 1.2;
      const seed = rnd();
      const SEG = 15;
      let prev = null, arc = ex.from * R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 5 + seed * 30) * 0.06 * t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * rnd());
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, AL(Math.min(arc, maxAlong * 0.995)), AL(Math.min(arc, maxAlong * 0.995)),
            t, Math.min(t + 1 / SEG, 1), ex.route, 3, seed, 0.7, 0.7);
          counts.contSegs++;
        }
        prev = p;
      }
    }
  }

  /* ---- build the strand mesh ---- */
  const strandMat = makeStrandMat(U);
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    g.setAttribute('aA', new THREE.Float32BufferAttribute(sA, 4));
    g.setAttribute('aB', new THREE.Float32BufferAttribute(sB, 4));
    const lines = new THREE.LineSegments(g, strandMat);
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- glow texture, hub cores ---- */
  const glowTex = makeGlowTexture();
  const cores = [];
  for (const hm of hubMeta) {
    const h = HUBS[hm.id];
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: heat(0.82, tmpC).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(h.pos).add(new V3(0, 0.05, 0));
    s.scale.setScalar(h.coreScale);
    group.add(s);
    cores.push({ id: hm.id, sprite: s, mat, baseScale: h.coreScale });
  }

  /* ---- particles: sparse, slow, drifting along the primaries ---- */
  const N_PART = 108;
  const partData = [];
  {
    for (let i = 0; i < N_PART; i++) {
      const ri = Math.floor(rnd() * routes.length);
      partData.push({
        route: ri,
        phase: rnd(),
        speed: 0.010 + rnd() * 0.020,     // route-fractions per second — slow
        seed: rnd(),
      });
      gp.push(0, -10, 0);                  // parked; positioned by updateParticles
      gP.push(0, partData[i].seed, 1, 0.5 + rnd() * 0.4);
      gR.push(ri);                         // a particle drifts on its own route
    }
    counts.particles = N_PART;
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  pointGeo.setAttribute('aP', new THREE.Float32BufferAttribute(gP, 4));
  pointGeo.setAttribute('aR', new THREE.Float32BufferAttribute(gR, 1));
  const lifeArr = new Float32Array(gp.length / 3).fill(1);
  pointGeo.setAttribute('aLife', new THREE.BufferAttribute(lifeArr, 1));
  const pointMat = makePointMat(U, glowTex);
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  group.add(points);

  const nGlints = counts.glints;
  const posAttr = pointGeo.attributes.position;
  const pAttr = pointGeo.attributes.aP;
  const lifeAttr = pointGeo.attributes.aLife;

  /** Particle drift — pure in t (frozen-capture safe: t held => positions held). */
  function updateParticles(t) {
    for (let i = 0; i < N_PART; i++) {
      const d = partData[i];
      const R = routes[d.route];
      const f = (d.phase + t * d.speed) % 1;
      const p = polyAt(R.poly, R.arcs, f);
      const k = (nGlints + i) * 3;
      posAttr.array[k] = p.x;
      posAttr.array[k + 1] = gy(p.x, p.z, 0.045) + 0.01;
      posAttr.array[k + 2] = p.z;
      // life window: fade near path ends; occasional — deep sine gaps
      const wnd = smooth01(f / 0.08) * (1 - smooth01((f - 0.9) / 0.1));
      const occ = 0.5 + 0.5 * Math.sin(t * (0.05 + d.seed * 0.06) + d.seed * 40);
      lifeAttr.array[nGlints + i] = wnd * smooth01((occ - 0.35) / 0.4);
      // along for the growth gate: current route fraction of the global along
      pAttr.array[(nGlints + i) * 4] = f * (R.len / maxAlong);
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    pAttr.needsUpdate = true;
  }

  const totalSegs = counts.primarySegs + counts.secondarySegs + counts.hairSegs + counts.hubSegs + counts.contSegs;

  /* ---- publish each front's reach ----
     A route's front must cover its farthest vertex PLUS the ramp's own width
     before that vertex is fully lit (litMask needs `along <= head - uSoft`),
     so the lead is the ramp, not a magic 1.06. With this in the uniform, every
     route's uLit is a clean 0..1 whatever its length, and the hub kindle in
     index.js can be keyed off `uLit * uLitMax` — the head's own position —
     which is what makes the kindle land exactly as its trail's light arrives. */
  U.uLitMax.value.set(
    routeReach[0] + FRONT_SOFT + 0.01,
    routeReach[1] + FRONT_SOFT + 0.01,
    routeReach[2] + FRONT_SOFT + 0.01,
  );

  return {
    counts: { ...counts, totalSegs, points: counts.glints + counts.particles },
    strandMat, pointMat,
    routes, hubMeta, cores,
    updateParticles,
  };
}
