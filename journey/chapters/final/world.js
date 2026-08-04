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
  const u = (-camX - 8.0) / 6.0;
  return u < 0 ? 0 : u > 1 ? 1 : u;
}
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

export function makeUniforms() {
  return {
    uAmount:  { value: 0 },     // chapter fade (T4 arm/retire)
    uPull:    { value: 0 },     // camera-derived reveal driver
    uFront:   { value: -1 },    // growth-front pulse phase along arc
    uFrontOn: { value: 0 },
    uCta:     { value: -1 },    // CTA wave phase along arc
    uCtaOn:   { value: 0 },
    uTime:    { value: 0 },
    uFogNear: { value: 7 },
    uFogFar:  { value: 20 },
    // ---- pointer response (interact.js + clones.js's easeHover) ----
    // A batched member has no material of its own to brighten, so the two
    // pointer channels are carried as an ID compare instead: aHot names the
    // member a vertex belongs to, and exactly one member at a time can be
    // the hovered one and one the tapped one. Two channels, not one, so a
    // tap's one-shot pulse keeps decaying on the body you tapped after the
    // pointer has moved on to another. Idle IDs are -1; aHot is -1 for
    // everything that is not a fruiting body, and a geometry with no aHot
    // attribute at all reads the WebGL generic default 0.0 — which is why
    // member IDs start at 1 and never at 0.
    uHotId:   { value: -1 },
    uHotAmt:  { value: 0 },
    uTapId:   { value: -1 },
    uTapAmt:  { value: 0 },
  };
}

// The ID compare, shared by both shaders so the two batches answer a pointer
// identically. `1.0 - step(0.5, |a - b|)` is an equality test on IDs that are
// whole numbers, branch-free.
const HOT_GLSL = /* glsl */ `
  attribute float aHot;
  uniform float uHotId, uHotAmt, uTapId, uTapAmt;
  float hotAt() {
    return uHotAmt * (1.0 - step(0.5, abs(aHot - uHotId)))
         + uTapAmt * (1.0 - step(0.5, abs(aHot - uTapId)));
  }
`;

const STRAND_VERT = /* glsl */ `
  attribute float aArc, aReveal, aTw, aBoost, aWave;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
  ${HOT_GLSL}
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
    // pointer response — the hero's §11 breathing glow, one member at a time
    b *= 1.0 + hotAt();
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
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
  ${HOT_GLSL}
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
    b *= 1.0 + hotAt();
    vB = b;
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
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
  const hot = [];
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
        hot.push(meta.hot ?? -1);
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
      hot.push(meta.hot ?? -1);
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
      // pointer-response member ID (-1 = not a fruiting body). Costs 4 bytes
      // a vertex and no draws: the alternative was splitting the batch.
      g.setAttribute('aHot', new THREE.Float32BufferAttribute(hot, 1));
      if (withSize) g.setAttribute('psize', new THREE.Float32BufferAttribute(size, 1));
      return g;
    },
    get segCount() { return pos.length / 6; },
    get ptCount() { return size.length; },
  };
}
