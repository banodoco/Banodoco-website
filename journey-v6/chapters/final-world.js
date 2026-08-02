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
import { makeRng, gaussOf, heat, groundY } from '../core/anatomy.js';

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
const MEMBER_SPEC = [
  { az: 38,  r: 7.2, h: 1.6, m: 0.45 },
  { az: 62,  r: 8.2, h: 2.8, m: 1.00 },   // mature
  { az: 84,  r: 7.8, h: 2.1, m: 0.75 },
  { az: 104, r: 7.3, h: 1.7, m: 0.55 },
  { az: 123, r: 7.9, h: 1.5, m: 0.40 },   // near-right foreground, kept small
  { az: 200, r: 5.3, h: 1.4, m: 0.40 },   // on the cut lip, frame-left
  { az: 227, r: 6.3, h: 2.0, m: 0.70 },
  { az: 252, r: 7.7, h: 2.7, m: 1.00 },   // mature
  { az: 279, r: 8.3, h: 2.5, m: 0.95 },   // mature
  { az: 303, r: 7.4, h: 2.2, m: 0.80 },
  { az: 327, r: 6.6, h: 1.3, m: 0.35 },   // young, closes the ring by the hero
];

/* ------------------------------------------------------------------ */
/* The cutaway                                                         */
/* ------------------------------------------------------------------ */
// An IRREGULAR cut line in plan (never a clean diagram edge): base line
// n.(x,z) = d, wobbled along its tangent. kept side (soil + surface survive)
// is cutVal > 0; the Final camera leg lives on the removed side, so the cut
// face is always between the lens and the ring. The wobble lets the two
// lip members stand on a promontory while the edge bows toward the camera
// elsewhere.
const CUT_N = { x: 0.98, z: 0.20 };          // ~unit, toward the kept side
const CUT_D = -10.6;
function wob(s) { return 1.35 * Math.sin(s * 0.32 + 1.2) + 0.8 * Math.sin(s * 0.13 + 4.0); }

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
export const CUT_S_MIN = -16;
export const CUT_S_MAX = 13;

/* ------------------------------------------------------------------ */
/* Members, resolved                                                   */
/* ------------------------------------------------------------------ */
// Build-time nudge: any member that lands off the kept side (the wobble is
// authored, but authored blind) walks inward until it stands on soil with a
// real margin. Deterministic — same result every boot.
export const MEMBERS = MEMBER_SPEC.map((s, i) => {
  const a = (s.az * Math.PI) / 180;
  let r = s.r;
  let x = RING_C.x + Math.cos(a) * r;
  let z = RING_C.z + Math.sin(a) * r;
  let guard = 0;
  while (cutVal(x, z) < 0.35 && guard++ < 30) {
    r -= 0.15;
    x = RING_C.x + Math.cos(a) * r;
    z = RING_C.z + Math.sin(a) * r;
  }
  const arc = arcOf(x, z);
  return {
    i, x, z, r, az: a,
    gy: groundY(x, z),
    h: s.h,
    capR: s.h * (0.40 + 0.10 * s.m),
    m: s.m,
    arc,
    // reveal threshold on uPull: single-direction CCW sweep from the hero
    reveal: 0.08 + 0.80 * arc,
  };
});

// Members that shed spores (mature bodies only — and NEVER the hero: the hero
// keeps its own ambient shed, and no stream may read as hero -> others).
export const SPORE_SOURCES = MEMBERS.filter(m => m.m >= 0.55);

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
  };
}

const STRAND_VERT = /* glsl */ `
  attribute float aArc, aReveal, aTw, aBoost, aWave;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
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
    vB = b;
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
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
 *  mushrooms/strands/trees it holds. */
export function makeBatch() {
  const pos = [], col = [], arc = [], rev = [], tw = [], boost = [], wave = [], size = [];
  const c = new THREE.Color();
  return {
    seg(ax, ay, az, bx, by, bz, ta, tb, meta) {
      pos.push(ax, ay, az, bx, by, bz);
      heat(ta, c); col.push(c.r, c.g, c.b);
      heat(tb, c); col.push(c.r, c.g, c.b);
      for (let k = 0; k < 2; k++) {
        arc.push(meta.arc ?? 0);
        rev.push(meta.reveal ?? -1);
        tw.push(meta.tw ?? 0);
        boost.push(meta.boost ?? 0);
        wave.push(meta.wave ?? 0);
      }
    },
    pt(x, y, z, tone, psize, meta) {
      pos.push(x, y, z);
      heat(tone, c); col.push(c.r, c.g, c.b);
      arc.push(meta.arc ?? 0);
      rev.push(meta.reveal ?? -1);
      tw.push(meta.tw ?? 0);
      boost.push(meta.boost ?? 0);
      wave.push(meta.wave ?? 0);
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
      if (withSize) g.setAttribute('psize', new THREE.Float32BufferAttribute(size, 1));
      return g;
    },
    get segCount() { return pos.length / 6; },
    get ptCount() { return size.length; },
  };
}
