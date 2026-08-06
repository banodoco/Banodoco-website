// journey-v6 — FINAL epilogue, shared world model (W4-D production build).
//
// One source of truth for the fairy ring, the cutaway line, and the reveal /
// pulse shader language, shared by final-ring.js / final-terrain.js /
// final-sky.js. Everything here is deterministic and pure in world
// coordinates, so the three modules agree without talking to each other.
//
// CREATIVE DIRECTION (Hannah, W4-D): the HERO ORGANISM IS PART OF THE RING.
// The ring is centred at RING_C so the hero (world origin) sits ON its arc —
// one mature body among the others, never the centre and never the parent.
// The reveal is an "undarken": the other fruiting bodies were always there,
// unlit; as the camera pulls back they kindle in sequence around the arc.
//
// The reveal driver is the CAMERA, not journey progress: uPull is derived
// from camera.position.x, which is strictly monotonic along the re-keyed
// Final leg (x -3.3 -> -17.0). That keeps the reveal a pure function of the
// pose — ?p= sampling, reverse scrubbing and nav flights all agree — without
// this module ever reading journey state.

import * as THREE from 'three';
import { makeRng, gaussOf, heat, groundY } from '../../anatomy.js';
import { CAP_R_OVER_H } from './species.js';

export const TAU = Math.PI * 2;
export { makeRng, gaussOf, heat, groundY };

/* ------------------------------------------------------------------ */
/* The ring                                                            */
/* ------------------------------------------------------------------ */
// Ring centre in plan. Hero at origin: az ~7.6 deg about C, r ~6.05 — on the
// inner edge of the irregular band (fairy rings are never true circles).
export const RING_C = { x: -6.0, z: -0.8 };
export const HERO_AZ = Math.atan2(0.0 - RING_C.z, 0.0 - RING_C.x); // ~0.1326

/** Arc coordinate about RING_C: 0 at the hero, increasing CCW, wrapped 0..1.
 *  This is the coordinate the reveal order, the growth-front pulse and the
 *  CTA wave all travel along. */
export function arcOf(x, z) {
  let a = Math.atan2(z - RING_C.z, x - RING_C.x) - HERO_AZ;
  a = ((a % TAU) + TAU) % TAU;
  return a / TAU;
}

// The eleven built members (the hero is the twelfth body). Authored, not
// random: azimuths leave a gap at az ~130-200 where the arc passes the
// camera/cutaway side ("the ring continues" reading), r pinched there.
// dRev = single-direction (CCW) arc distance from the hero -> the reveal
// travels ONE way around the ring and closes beside the hero, so no two
// members ever brighten simultaneously.
//   az (deg about C), r, h (height), m (maturity 0..1)
// The az ~140-275 sector is deliberately empty: the cutaway SLICES THROUGH
// THE RING — that arc is below the soil-line, its colony exposed in section,
// and the ring visibly continues beyond the lip (m9/m10 stand right on it).
const MEMBER_SPEC = [
  // m1 raised with the near pair (declutter round): at h 1.6 the rest
  // camera looked down onto it and it read as a floating rim ellipse
  { az: 38,  r: 7.2, h: 2.0, m: 0.55 },
  { az: 62,  r: 8.2, h: 2.8, m: 1.00 },   // mature
  { az: 84,  r: 7.8, h: 2.1, m: 0.75 },
  // The two near members (declutter round): raised so the rest camera
  // (y 2.73) sees them side-on like every other body, not down into an
  // open bowl — Hannah's "the first mushroom looks different" was partly
  // these two reading as lit cups from above.
  { az: 104, r: 7.3, h: 2.0, m: 0.55 },
  { az: 123, r: 7.9, h: 1.85, m: 0.40 },  // near-right, on the lip
  { az: 279, r: 8.3, h: 2.5, m: 0.95 },   // mature — stands on the far lip
  // az 291 -> 297 (17-final-field.md): from the rest camera the 291 body sat
  // on the SAME ray as the 279 one (plan angles −44.3 vs −44.7 deg) — two
  // mature caps in one screen column summed into a single over-wide white
  // "pancake", the worst of the lamp reads. Six degrees along the arc
  // separates the silhouettes into a staggered pair; the ring stays a ring.
  { az: 297, r: 8.6, h: 2.6, m: 0.90 },   // mature
  { az: 303, r: 7.4, h: 2.2, m: 0.80 },
  { az: 327, r: 6.6, h: 1.3, m: 0.35 },   // young, closes the ring by the hero
];

/* ------------------------------------------------------------------ */
/* The cutaway                                                         */
/* ------------------------------------------------------------------ */
// An IRREGULAR cut line in plan (never a clean diagram edge): base line
// n.(x,z) = d, wobbled along its tangent. kept side (soil + surface survive)
// is cutVal > 0; the Final camera leg lives on the removed side.
//
// The line is authored OBLIQUE to the rest gaze (derived from lip-distance =
// 6 - 0.9 * screen-right in camera coords at the rest pose), so in frame the
// soil-line enters at mid-height on the LEFT edge and falls diagonally to
// below the bottom-right corner — FN-1.1's diagonal, with the cut face and
// the exposed colony filling the lower-left wedge. The hero, the ring
// centre and the az 279-123 arc all sit on the kept side; the near-left arc
// is sliced away with the soil.
export const CUT_N = { x: 0.944, z: 0.331 }; // ~unit, toward the kept side
const CUT_D = -7.82;
function wob(s) { return 0.9 * Math.sin(s * 0.30 + 1.2) + 0.55 * Math.sin(s * 0.12 + 4.0); }

export function cutVal(x, z) {
  const s = -CUT_N.z * x + CUT_N.x * z;
  return (CUT_N.x * x + CUT_N.z * z) - CUT_D + wob(s);
}

/** Point on the cut edge at tangent parameter s (world units along the lip). */
export function cutEdgePoint(s) {
  const off = CUT_D - wob(s);
  return {
    x: CUT_N.x * off - CUT_N.z * s,
    z: CUT_N.z * off + CUT_N.x * s,
  };
}
// Tangent span of the lip that can appear in frame from the Final leg.
export const CUT_S_MIN = -14;
export const CUT_S_MAX = 10;

/* ------------------------------------------------------------------ */
/* Members, resolved                                                   */
/* ------------------------------------------------------------------ */
// Build-time nudge: any member that lands off the kept side (the wobble is
// authored, but authored blind) walks inward until it stands on soil with a
// real margin; a member that cannot keep ring radius >= 4.6 is dropped (it
// belongs to the sliced-away arc). Deterministic — same result every boot.
export const MEMBERS = MEMBER_SPEC.flatMap((s, i) => {
  const a = (s.az * Math.PI) / 180;
  let r = s.r;
  let x = RING_C.x + Math.cos(a) * r;
  let z = RING_C.z + Math.sin(a) * r;
  let guard = 0;
  while (cutVal(x, z) < 0.35 && r > 4.6 && guard++ < 30) {
    r -= 0.15;
    x = RING_C.x + Math.cos(a) * r;
    z = RING_C.z + Math.sin(a) * r;
  }
  if (cutVal(x, z) < 0.35) return [];
  const arc = arcOf(x, z);
  // Per-member spore-shed strength (D14 axis): mature bodies shed, each with
  // its own seeded intensity; immature bodies not at all. Deterministic —
  // seeded from the member index, no shared-stream order dependence.
  const shed = s.m >= 0.55 ? 0.35 + 0.65 * makeRng(0x5eed + i * 7919)() : 0;
  return [{
    i, x, z, r, az: a,
    gy: groundY(x, z),
    h: s.h,
    // Rim radius. 18-one-species.md: this was `h * (0.40 + 0.10 * maturity)`
    // — an independent cap-width law that made every member's cap up to 26%
    // too narrow for its height (the hero's own ratio is CAP_R / apex height
    // = 0.5378) and made maturity a SHAPE axis. It is now the species' one
    // cap-width law. Read by sky.js (spore emission disc) and by anything
    // that needs a body's plan footprint; the bodies themselves get their
    // rim from the form functions, never from this.
    capR: s.h * CAP_R_OVER_H,
    m: s.m,
    shed,
    arc,
    // reveal threshold on uPull: single-direction CCW sweep from the hero
    reveal: 0.08 + 0.80 * arc,
  }];
});

// Members that shed spores (mature bodies only — and NEVER the hero: the hero
// keeps its own ambient shed, and no stream may read as hero -> others).
// Weighted by per-member shed strength via repetition: the sky's uniform
// source pick then samples strong shedders more often, with no sky changes.
export const SPORE_SOURCES = MEMBERS.filter(m => m.shed > 0)
  .flatMap(m => Array(1 + Math.round(m.shed * 2)).fill(m));

/* ------------------------------------------------------------------ */
/* Reveal driver                                                       */
/* ------------------------------------------------------------------ */
/** Camera-x -> pull in [0,1]. 0 while underground / at the crest, ~0.98 at
 *  the Final rest (x -13.9), 1 by the recede. Monotone along the leg. */
export function pullOf(camX) {
  const u = pullRawOf(camX);
  return u < 0 ? 0 : u > 1 ? 1 : u;
}
/** The same map, UNCLAMPED. Negative while the camera is still below the
 *  surface pierce (x > −8). The clones' entry draw runs on THIS rather than on
 *  the clamped value so the front can never be flattened by the clamp — see
 *  clones.js DRAW_W. */
export function pullRawOf(camX) { return (-camX - 8.0) / 6.0; }
export const REVEAL_W = 0.16;   // smoothstep width used by every shader

/* ------------------------------------------------------------------ */
/* Shared shader language                                              */
/* ------------------------------------------------------------------ */
// Every lit element carries the same five per-vertex channels:
//   aArc    arc coordinate (or along-cord coordinate for aWave pieces)
//   aReveal reveal threshold on uPull; < 0 = always lit
//   aTw     twinkle phase
//   aBoost  how strongly the growth-front pulse + CTA wave light this vertex
//   aWave   cord-wave participation (slow outward traveling wave)
// and every material shares one uniform set, ticked once per frame by the
// orchestrator. Fog fades to BLACK (additive), tracking the director's
// re-parameterised scene fog by manual copy — robust against hidden-tab
// capture bursts and any renderer fog-flag quirks.

/** The hero's OWN tap-pulse uniform objects, harvested out of its live
 *  materials (organism/organism.js §"tap pulse" shares one `pulseC`/`pulseT`/
 *  `pulseP` trio across every glowing material it builds). organism/* is
 *  read-only and does not export the trio, so we reach it the same way
 *  clones.js does: off a material that already carries it.
 *
 *  Sharing the OBJECTS rather than copying the values is the whole point —
 *  one write plants a wave that the hero, the clones, the batched species
 *  bodies, the colony floor and the horizon all answer in the same tick, and
 *  organism's own `tap-pulse` animator does the per-frame `uPulseT += dt` for
 *  all of them. If the hero's shaders ever drift out from under this, the
 *  fallback is an inert local trio parked at uPulseT = 1e3, where pulseAt()
 *  is exactly 1.0 — the batch simply stops answering taps rather than
 *  throwing. */
export function heroPulse(sceneApi) {
  let found = null;
  const sway = sceneApi && sceneApi.groups && sceneApi.groups.sway;
  if (sway) {
    sway.traverse((o) => {
      const u = o.material && o.material.uniforms;
      if (!found && u && u.uPulseC && u.uPulseT && u.uPulseP) found = u;
    });
  }
  return found
    ? { uPulseC: found.uPulseC, uPulseT: found.uPulseT, uPulseP: found.uPulseP }
    : {
        uPulseC: { value: new THREE.Vector3() },
        uPulseT: { value: 1e3 },
        uPulseP: { value: new THREE.Vector3(2.6, 0.33, 1.4) },
      };
}

// Idle value for the WOBBLE slot IDs. NOT -1: `aBody` defaults to -1 for every
// vertex that is not a fruiting body (terrain, trees, root stubs, the ground
// glows), so an idle slot parked at -1 would MATCH all of them — and a wobble
// slot carries a ROTATION, so one stale radian on the terrain is a whole floor
// sliding sideways. That bug was found and fixed once; the discipline outlived
// the pointer glow that used to share the channel and is now the ONLY reason
// this constant exists. No member ID is ever -999.
export const WOB_IDLE = -999;

export function makeUniforms(sceneApi) {
  return {
    // the hero's own tap-pulse trio, shared by object — see heroPulse()
    ...heroPulse(sceneApi),
    uAmount:  { value: 0 },     // chapter fade (T4 arm/retire)
    uPull:    { value: 0 },     // camera-derived reveal driver
    // The same driver UNCLAMPED below 0, for the clone entry-draw front only
    // (clones.js, part B). Never reaches a shader — the draw is a CPU-side
    // per-body uniform write — but it lives here because it is the same
    // camera-pure quantity and belongs beside the one it is derived from.
    uPullRaw: { value: 0 },
    uFront:   { value: -1 },    // growth-front pulse phase along arc
    uFrontOn: { value: 0 },
    uCta:     { value: -1 },    // CTA wave phase along arc
    uCtaOn:   { value: 0 },
    uTime:    { value: 0 },
    uFogNear: { value: 7 },
    uFogFar:  { value: 20 },
    // ---- the poke, for batched bodies (ring.js §POKE) ----
    // A clone owns a scene-graph node and gets organism §10c's cantilever
    // ring-down applied to its own sway pivot. A batched species body has no
    // node — it is a few hundred vertices inside a shared draw — so its body
    // rotation has to happen in the vertex shader, per tapped member, against
    // the aBody ID its vertices carry. A geometry with no aBody attribute at
    // all reads the WebGL generic default 0.0, which is why member IDs start
    // at 1 and never at 0.
    //
    // TWO SLOTS, not one. A stolen wobble snaps a body back to rest
    // mid-ring-down, which reads as a glitch. Two slots cover poking a second
    // body while the first still rings (the ring-down runs ~3 s), and ring.js
    // always steals the QUIETER slot, so a third poke inside three seconds
    // cuts off the wobble that had least left to say.
    uWobId:   { value: new THREE.Vector2(WOB_IDLE, WOB_IDLE) },
    uWobA:    { value: new THREE.Vector3() },   // slot 0 pivot (world, at the soil)
    uWobB:    { value: new THREE.Vector3() },   // slot 1 pivot (world, at the soil)
    uWobR:    { value: new THREE.Vector4() },   // (rx0, rz0, rx1, rz1) radians
  };
}

// organism/organism.js's PULSE_GLSL, VERBATIM. A tap plants uPulseC at the
// touched point and rewinds uPulseT to 0; every glowing vertex answers by
// distance — an expanding ring that BROADENS and dims as it travels, with a
// range falloff so only the tapped neighbourhood responds. uPulseP shapes the
// wave per tap: (2.6, 0.33, 1.4) is the floor ping's far-carrying swell,
// (1.4, 1.5, 1.2) is a body poke's slow, short-range, gentle shiver.
//
// Parked at uPulseT = 1e3 the ring has long since died: exp(-1.15 * 1e3)
// underflows to 0, so pulseAt() returns EXACTLY 1.0 and the rest frame is
// untouched. That is what keeps this addition golden-safe.
const PULSE_GLSL = /* glsl */ `
  uniform vec3 uPulseC;
  uniform float uPulseT;
  uniform vec3 uPulseP; // x: wave speed, y: range falloff, z: amplitude
  float pulseAt(vec3 wp) {
    float d = distance(wp, uPulseC);
    float w = uPulseP.x * (0.15 + 0.21 * uPulseT);
    float ring = exp(-pow((d - uPulseP.x * uPulseT) / w, 2.0));
    return 1.0 + uPulseP.z * ring * exp(-1.15 * uPulseT) * exp(-d * uPulseP.y);
  }
`;

// The batched body's cantilever ring-down (see uWobId in makeUniforms).
// organism §10c rotates the whole stalk about its root by (tap.x, tap.z) — a
// small-angle rotation vector w = (rx, 0, rz) applied to the offset from the
// base, so the displacement is the cross product w x r:
//     (-rz*r.y,  rz*r.x - rx*r.z,  rx*r.y)
// At the amplitudes this ring-down reaches (the saturating clamp's own
// ceiling is |tap| ~ 0.039 rad) the small-angle form is accurate to under a
// thousandth of a world unit, which at these distances is a ten-thousandth of
// a pixel. Two unrolled slots, branch-free: `1.0 - step(0.5, |a - b|)` is an
// equality test on IDs that are whole numbers. An idle slot costs one step()
// and a multiply by zero.
//
// aBody is declared HERE because the wobble is the only thing left that reads
// it. It used to be shared with a pointer-hover glow; that glow is gone (see
// this file's makeBatch note and 18-one-species.md, 2026-08-05).
const WOBBLE_GLSL = /* glsl */ `
  attribute float aBody;
  uniform vec2 uWobId;
  uniform vec3 uWobA, uWobB;
  uniform vec4 uWobR;
  vec3 wobbled(vec3 wp) {
    vec3 d = vec3(0.0);
    float m0 = 1.0 - step(0.5, abs(aBody - uWobId.x));
    vec3 r0 = wp - uWobA;
    d += m0 * vec3(-uWobR.y * r0.y, uWobR.y * r0.x - uWobR.x * r0.z, uWobR.x * r0.y);
    float m1 = 1.0 - step(0.5, abs(aBody - uWobId.y));
    vec3 r1 = wp - uWobB;
    d += m1 * vec3(-uWobR.w * r1.y, uWobR.w * r1.x - uWobR.z * r1.z, uWobR.z * r1.y);
    return wp + d;
  }
`;

// WHY modelMatrix AND viewMatrix INSTEAD OF modelViewMatrix
// ---------------------------------------------------------
// Both halves of the poke are WORLD-space: the ripple measures distance from
// a world point, and the wobble rotates about a world pivot. So the world
// position has to exist before the view transform, and the view transform
// then consumes the wobbled one. Every batch this shader serves hangs at
// IDENTITY (the chapter group, the ring/terrain/sky groups and the meshes
// inside them are never positioned), so modelMatrix is the identity matrix
// and `viewMatrix * (I * p)` is bit-for-bit `modelViewMatrix * p` — the
// goldens cannot move on this change alone.
const STRAND_VERT = /* glsl */ `
  attribute float aArc, aReveal, aTw, aBoost, aWave;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
  ${PULSE_GLSL}
  ${WOBBLE_GLSL}
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  void main() {
    float reveal = aReveal < -0.5 ? 1.0
                 : smoothstep(aReveal, aReveal + ${'0.16'}, uPull);
    // unlit bodies keep a 7% ember whisper — "they were always there"
    float b = mix(0.07, 1.0, reveal);
    // the growth-front pulse travelling the arc (narrow: ~one member wide)
    float df = aArc - uFront;
    b += aBoost * uFrontOn * exp(-df * df * 260.0) * (0.30 + 0.60 * reveal);
    // CTA wave: hero -> part of the ring
    float dc = aArc - uCta;
    b += aBoost * uCtaOn * exp(-dc * dc * 200.0) * 1.1;
    // rhizomorph cords: slow outward waves
    b += aWave * (0.28 + 0.28 * sin(aArc * 12.6 - uTime * 0.42 + aTw)) * reveal;
    // slow twinkle, phase-scattered
    b *= 0.88 + 0.12 * sin(uTime * 0.9 + aTw);
    vColor = color;
    // the poke, both halves: the body swings about its own root (wobbled),
    // and the light ripples out from under the fingertip (pulseAt) — the
    // hero's own two answers, in the hero's own maths.
    vec3 wp = wobbled((modelMatrix * vec4(position, 1.0)).xyz);
    b *= pulseAt(wp);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    // near-camera fade: the lens travels through clean air (Spike A G2a) —
    // strokes brushing the camera during the rise soften instead of flaring
    b *= smoothstep(1.2, 2.8, length(mv.xyz));
    vB = b;
    vFog = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const STRAND_FRAG = /* glsl */ `
  uniform float uOpacity, uAmount, uFogNear, uFogFar;
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  void main() {
    float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
    gl_FragColor = vec4(vColor * vB * uOpacity * uAmount * fogF, 1.0);
  }
`;

export function makeStrandMat(uniforms, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uOpacity: { value: opacity } }, uniforms),
    vertexShader: STRAND_VERT,
    fragmentShader: STRAND_FRAG,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

const POINT_VERT = /* glsl */ `
  #define MIN_PT 1.7
  attribute float aArc, aReveal, aTw, aBoost, aWave, psize;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
  ${PULSE_GLSL}
  ${WOBBLE_GLSL}
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  varying float vShrink;
  void main() {
    float reveal = aReveal < -0.5 ? 1.0
                 : smoothstep(aReveal, aReveal + 0.16, uPull);
    float b = mix(0.05, 1.0, reveal);
    float df = aArc - uFront;
    b += aBoost * uFrontOn * exp(-df * df * 260.0) * (0.30 + 0.60 * reveal);
    float dc = aArc - uCta;
    b += aBoost * uCtaOn * exp(-dc * dc * 200.0) * 1.1;
    b *= 0.86 + 0.14 * sin(uTime * 1.3 + aTw);
    vColor = color;
    vec3 wp = wobbled((modelMatrix * vec4(position, 1.0)).xyz);
    b *= pulseAt(wp);
    vB = b;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vFog = -mv.z;
    float sz = psize * (0.4 + 0.6 * reveal) * (300.0 / -mv.z);
    vShrink = 1.0;
    if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
    gl_PointSize = sz;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity, uAmount, uFogNear, uFogFar;
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  varying float vShrink;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
    gl_FragColor = vec4(vColor * t.a * vB * uOpacity * uAmount * fogF * vShrink, 1.0);
  }
`;

export function makePointsMat(uniforms, opacity, map) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uOpacity: { value: opacity }, uMap: { value: map } }, uniforms),
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/* ------------------------------------------------------------------ */
/* Batched-geometry builder                                            */
/* ------------------------------------------------------------------ */
/** Accumulates line segments / points with the five shared channels and
 *  emits one BufferGeometry — one draw call per batch, however many
 *  mushrooms/strands/trees it holds.
 *  meta.mul (default 1) is a build-time color multiplier: it scales the
 *  heat-ramp RGB after lookup, which under additive blending is exactly a
 *  per-segment material opacity. It lets one merged batch carry several of
 *  the hero's per-system opacities (cap lattice 0.28 vs rim 0.55, etc. —
 *  D15) without splitting into more draw calls. Callers that omit it are
 *  unchanged. */
export function makeBatch() {
  const pos = [], col = [], arc = [], rev = [], tw = [], boost = [], wave = [], size = [];
  const body = [];
  const c = new THREE.Color();
  return {
    seg(ax, ay, az, bx, by, bz, ta, tb, meta) {
      const mul = meta.mul ?? 1;
      pos.push(ax, ay, az, bx, by, bz);
      heat(ta, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      heat(tb, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      for (let k = 0; k < 2; k++) {
        arc.push(meta.arc ?? 0);
        rev.push(meta.reveal ?? -1);
        tw.push(meta.tw ?? 0);
        boost.push(meta.boost ?? 0);
        wave.push(meta.wave ?? 0);
        body.push(meta.body ?? -1);
      }
    },
    pt(x, y, z, tone, psize, meta) {
      const mul = meta.mul ?? 1;
      pos.push(x, y, z);
      heat(tone, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      arc.push(meta.arc ?? 0);
      rev.push(meta.reveal ?? -1);
      tw.push(meta.tw ?? 0);
      boost.push(meta.boost ?? 0);
      wave.push(meta.wave ?? 0);
      body.push(meta.body ?? -1);
      size.push(psize);
    },
    geo(withSize = false) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('aArc', new THREE.Float32BufferAttribute(arc, 1));
      g.setAttribute('aReveal', new THREE.Float32BufferAttribute(rev, 1));
      g.setAttribute('aTw', new THREE.Float32BufferAttribute(tw, 1));
      g.setAttribute('aBoost', new THREE.Float32BufferAttribute(boost, 1));
      g.setAttribute('aWave', new THREE.Float32BufferAttribute(wave, 1));
      // Per-member body ID (-1 = not a fruiting body), read by the poke's
      // wobble slots and nothing else. Costs 4 bytes a vertex and no draws:
      // the alternative was splitting the batch.
      g.setAttribute('aBody', new THREE.Float32BufferAttribute(body, 1));
      if (withSize) g.setAttribute('psize', new THREE.Float32BufferAttribute(size, 1));
      return g;
    },
    get segCount() { return pos.length / 6; },
    get ptCount() { return size.length; },
  };
}
