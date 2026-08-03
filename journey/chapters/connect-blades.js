// journey-v6 — CONNECT production (W4-B): the gill colonnade.
//
// FIRM BLADE-TISSUE, NOT DRAPED FABRIC (taste-owner note, binding).
// The grey-box proxy read as hanging curtains because of three choices this
// file reverses:
//   1. its free-edge depth profile was a sine swag — shallow, deep, LIFTING
//      again at the margin (a scalloped valance). Here depth rises from the
//      stem, holds through the body, and tapers only slightly at the margin,
//      so the free edge tracks the cap's own fall and SWEEPS DOWN toward the
//      rim — a decisive blade silhouette, never a swag;
//   2. its edges billowed with low-frequency sine offsets (cloth flutter).
//      Here each blade is a stiff, near-planar radial sheet: constant bend,
//      a single mid-sheet bow (edges stay straight, like curled cartilage),
//      and a fine high-frequency scallop on the edge (crisp serration reads
//      as firm tissue; low-frequency swoop reads as fabric);
//   3. its cross-veins sagged like threads. connect.js builds them TAUT.
//
// LIGHT BUDGET (donor lesson, journey/chapters/connect.js): from inside the
// chamber a view ray crosses 10-20 blades, so faces are near-invisible haze
// suppressed hard at grazing angles; essentially all light lives in the free
// EDGE hairline, which lands on distinct screen rows. Structure over glow.
//
// GEOMETRY: three InstancedBufferGeometry batches (primaries, lamellulae,
// tertiary short blades) — one draw call each. All placement happens in the
// vertex shader against a GLSL PORT of the hero cap form language
// (core/anatomy.js capUnderPt/rimRad/rimYoff/marginDroop, themselves mirrored
// byte-faithfully from mushroom-scene.js §4). The JS mirrors below
// (bladeAz/bladeDepth/bladeEdgePt) MUST stay formula-identical to the GLSL —
// veins, beads, spores, strand attachments and hotspot anchors are placed
// with them, and any drift would detach tissue from tissue.
import * as THREE from 'three';
import {
  makeRng, gaussOf, heat, capUnderPt, rimRad, makeGlowTexture,
} from '../anatomy.js';

export const TAU = Math.PI * 2;
const tmpC = new THREE.Color();

/* ================================================================
   Form language — ONE definition, mirrored in GLSL below.
   ================================================================ */
export function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
function sm(a, b, x) { return smooth01((x - a) / (b - a)); }

/** Free-edge depth below the attachment, before per-blade scale.
 *  Rises from the stem, holds, tapers ONLY slightly into the margin: the cap
 *  under-surface falls faster than the depth shrinks, so the edge descends
 *  monotonically toward the rim (firm), never lifting into a swag. */
export function bladeDepth(u) {
  const g = sm(0.04, 0.42, u);
  const m = 1 - 0.28 * sm(0.84, 1.0, u);
  return (0.16 + 0.84 * g) * m;
}
/** Stiff in-plane wobble of the blade plane — one low bow, no flutter. */
export function bladeWobble(u, seed) { return 0.010 * Math.sin(u * 7.0 + seed * 37.0); }
/** High-frequency edge serration (multiplies depth): crispness, not drape. */
export function bladeScallop(u, seed) { return Math.sin(u * 41.0 + seed * 40.0) * sm(0.15, 0.5, u); }

export function bladeAz(spec, u) {
  return spec.az0 + spec.bend * (u - spec.uStart) + bladeWobble(u, spec.seed);
}
/** A point on the blade, v = 0 free edge .. 1 attachment (mushroom-local). */
export function bladePt(spec, u, v) {
  const az = bladeAz(spec, u);
  const p = capUnderPt(u, az);
  p.y -= 0.005;
  const d = bladeDepth(u) * spec.depthScale * (1 + spec.scallopAmp * bladeScallop(u, spec.seed));
  p.y -= d * (1 - v);
  const nx = -Math.sin(az), nz = Math.cos(az);
  const off = spec.lean * (1 - v) + spec.bowAmp * Math.sin(Math.PI * v);
  p.x += nx * off; p.z += nz * off;
  return p;
}
export function bladeEdgePt(spec, u) { return bladePt(spec, u, 0); }

/* ================================================================
   GLSL — cap form port + blade placement (keep in sync with the JS above
   and with core/anatomy.js; checked by the veins landing ON the edges).
   ================================================================ */
export const CAP_GLSL = /* glsl */`
  float rimRadG(float a){
    float lean = cos(a - 3.6);
    return 2.35 * (1.0 + 0.09*lean + 0.045*cos(2.0*a - 1.1) + 0.018*sin(3.0*a + 4.1));
  }
  float rimYoffG(float a){
    float lean = cos(a - 3.6);
    float w = a - 5.3; w = atan(sin(w), cos(w)); w /= 0.35;
    return -0.16*lean + 0.05*cos(2.0*a + 0.7) - 0.13*exp(-w*w);
  }
  float marginDroopG(float u, float a){
    float m = max(0.0, (u - 0.78) / 0.22);
    return -(0.11 + 0.05*cos(a - 3.6)) * m * m;
  }
  // pow() bases clamped strictly positive (>= 1e-5): pow with a zero or
  // interpolation-negative base is undefined/NaN on this ANGLE Metal path,
  // and one NaN fragment blacks the entire frame through the bloom mips.
  // The clamp changes y by < 1e-9 — invisible, and identical in the JS
  // mirror's smooth ranges.
  vec3 capUnderG(float u, float a){
    float r = max(u * rimRadG(a), 0.2);
    float edge = max(0.0, (u - 0.8) / 0.2); edge *= edge;
    float y = 3.15 + 0.5*pow(max(1.0 - u, 1e-5), 1.8) + 0.03
            + rimYoffG(a)*pow(max(u, 1e-5), 1.6) + marginDroopG(u, a) - 0.11*edge;
    float x = cos(a)*r - 0.075*(1.0 - u*u);
    return vec3(x, y, sin(a)*r);
  }
  float depthOfG(float u){
    float g = smoothstep(0.04, 0.42, u);
    float m = 1.0 - 0.28*smoothstep(0.84, 1.0, u);
    return (0.16 + 0.84*g) * m;
  }
`;

/* ================================================================
   Blade material — instanced sheets, edge-lit.

   FRAGMENT COST NOTE (hard-won): the chamber is 70+ double-sided sheets
   stacking across the whole frame — worst-case overdraw is enormous. An
   early version of this material evaluated the regional glows, community /
   ADOS / exit terms, twinkle, glints and striation PER FRAGMENT; under that
   load the Metal command buffer intermittently aborted mid-pass and left a
   rectangular tile region of the composer's HalfFloat target as garbage
   (NaN bit patterns) — which the hero's temporal accumulation then blended
   forward FOREVER (mix(x, NaN, 0.0) is still NaN), blacking most of the
   frame a couple of seconds after the chamber armed. Everything smooth
   along the blade is therefore evaluated ONCE PER VERTEX and shipped down
   as three premultiplied colour varyings; the fragment shader is four
   exp() calls that only shape light across v. Do not move work back into
   the fragment shader without re-soaking the chamber (see W4-B in
   BUDGETS.md, "TAA NaN soak").
   ================================================================ */
function makeBladeMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount, uFlex: U.uFlex,
      uComm: U.uComm, uAmbC: U.uAmbC, uAmbA: U.uAmbA, uAmbW: U.uAmbW,
      uAdos: U.uAdos, uExit: U.uExit,
      // Light budget — tuned live against the Connect rest. uBase scales the
      // near-invisible face haze; uEdge the free-edge hairline (where the
      // chamber's light lives); uHot the semantic reveals.
      uBase: { value: 0.26 },
      // the sheet's edge strip is only an UNDER-GLOW: the crisp light lives
      // in the free-edge polylines (makeEdgeMat)
      uEdge: { value: 0.26 },
      uHot: { value: 0.75 },
      uNear: { value: 0.62 },
      uFog: { value: 0.34 },
      uColGold: { value: heat(0.52, new THREE.Color()).clone() },
      uColEdge: { value: heat(0.78, new THREE.Color()).clone() },
      uColHot: { value: heat(0.93, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec4 iA;   // az0, uStart, depthScale, bend
      attribute vec4 iB;   // seed, bright, region, order
      attribute vec4 iC;   // lean, scallopAmp, bowAmp, patch
      uniform float uTime, uFlex, uAmount, uBase, uEdge, uHot, uNear, uFog;
      uniform vec3 uColGold, uColEdge, uColHot;
      uniform vec2 uComm;                 // community amt, seq
      uniform vec3 uAmbC, uAmbA, uAmbW;   // regional ambient exchanges
      uniform vec3 uAdos;                 // afterglow amt, ring pos, knot az
      uniform vec2 uExit;                 // exit pulse amt, head (u, rim->stem)
      varying vec2 vV;                    // v, faceMask
      varying vec3 vColFace;              // premultiplied face colour
      varying vec3 vColEdge;              // premultiplied edge colour
      varying vec3 vColHot;               // premultiplied reveal colour
      ${CAP_GLSL}
      float regionGlow(float az, float c, float a, float w){
        float d = az - c; d = atan(sin(d), cos(d));
        return a * exp(-d*d/(w*w));
      }
      // gaussian band — NEVER pow() with a base that can go negative (donor rule)
      float band(float x, float c, float w){ float d = (x - c) / w; return exp(-d*d); }
      void main() {
        float t = position.x, v = position.y;
        float u = mix(iA.y, 1.0, t);
        float seed = iB.x, bright = iB.y, region = iB.z, order = iB.w;
        // stiff plane: constant bend + one low wobble + near-imperceptible
        // time flex at the free edge only (CN-4.2 micro-flex)
        float az = iA.x + iA.w*(u - iA.y) + 0.010*sin(u*7.0 + seed*37.0)
                 + uFlex * 0.006 * sin(uTime*0.23 + seed*6.2831 + u*2.2) * (1.0 - v);
        vec3 top = capUnderG(u, az);
        top.y -= 0.005;
        float scal = 1.0 + iC.y * sin(u*41.0 + seed*40.0) * smoothstep(0.15, 0.5, u);
        float d = depthOfG(u) * iA.z * scal;
        // sheet cropped to the lit band near the free edge (see file note:
        // the invisible upper body still costs raster; cropping halves the
        // chamber's worst-case overdraw)
        float vv = v * 0.55;
        vec3 p = top;
        p.y -= d * (1.0 - vv);
        vec2 n2 = vec2(-sin(az), cos(az));
        float off = iC.x * (1.0 - vv) + iC.z * sin(3.14159 * vv);
        p.x += n2.x * off; p.z += n2.y * off;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = length(mv.xyz);
        // grazing sheets stack many-deep: suppress them (donor light budget)
        vec3 nv = normalize((modelViewMatrix * vec4(n2.x, 0.0, n2.y, 0.0)).xyz);
        float facing = abs(dot(nv, -mv.xyz / max(dist, 1e-4)));
        float faceMask = mix(0.018, 1.0, facing * facing);

        /* ---- everything smooth along the blade, once per vertex ---- */
        float ends = smoothstep(0.0, 0.10, t) * (1.0 - 0.45*smoothstep(0.86, 1.0, u));
        float nearFade = smoothstep(uNear*0.3, uNear, dist);
        float fogK = exp(-uFog*uFog*dist*dist);
        float gate = ends * nearFade * fogK * uAmount;
        float tw = 0.5 + 0.5*sin(uTime*(0.16 + fract(seed*7.31)*0.30) + seed*41.0);
        // moisture: sparse wet glints riding the free edge
        float wet = smoothstep(0.985, 1.0, sin(u*57.0 + seed*91.0)) * (0.35 + 0.65*tw);
        // cavity shading along the edge: warm inner, dimmer body, bright rim
        float eProf = 0.62 + 0.38*u*u - 0.30*band(u, 0.45, 0.24);
        float amb = regionGlow(az, uAmbC.x, uAmbA.x, uAmbW.x)
                  + regionGlow(az, uAmbC.y, uAmbA.y, uAmbW.y)
                  + regionGlow(az, uAmbC.z, uAmbA.z, uAmbW.z);
        // COMMUNITY (CN-3.1): the tagged region ignites in sequence and holds
        float lit = region > 0.5
          ? uComm.x * smoothstep(order - 0.12, order + 0.05, uComm.y)
          : 0.0;
        // ADOS afterglow (CN-3.2): a ring spreading azimuthally from the knot
        // through the blades' inner (apex) ends
        float dAz = abs(atan(sin(az - uAdos.z), cos(az - uAdos.z)));
        float ring = uAdos.x * band(dAz, uAdos.y, 0.30) * band(u, 0.18, 0.26);
        // EXIT (CN-5.1): one inward wave toward the stipe-cap junction
        float ex = uExit.x * band(u, uExit.y, 0.10);

        // near-range hand-over: up close the 1-px edge polyline carries the
        // light; the sheet's world-space strip fades back so it can never
        // smear into ribbons at chamber range
        float nearDamp = clamp(dist / 2.0, 0.22, 1.0);
        vColFace = uColGold * (uBase * bright * iC.w * (0.80 + 0.20*tw) * faceMask * gate * clamp(dist / 1.6, 0.3, 1.0));
        vColEdge = uColEdge * (uEdge * bright * iC.w * eProf * (0.85 + 0.7*wet) * gate * nearDamp);
        // ambient exchanges ride the hot channel (its shape includes the wide
        // edge band), tinted gold rather than near-white
        vColHot  = uColHot * ((lit + ring + ex*0.55) * uHot * gate)
                 + uColGold * (amb * 0.34 * gate);
        vV = vec2(vv, faceMask);
        gl_Position = projectionMatrix * mv;
      }`,
    // Only the across-blade (v) shaping happens per fragment — four exp()s.
    // See the cost note above: keep it this lean.
    //
    // THE CLAMPS ARE LOAD-BEARING. On this ANGLE Metal path, rare frames
    // deliver garbage varying values into instanced draws; exp(-v*46) turns a
    // negative-garbage v into +Inf, one Inf pixel becomes NaN in the bloom /
    // TAA chain, and the hero's temporal accumulation then holds that NaN
    // FOREVER (mix(x, NaN, 0.0) is NaN) — most of the frame goes black a
    // second or two after the chamber arms. Clamping v to its true [0,1]
    // domain and capping the output makes the worst possible bad frame a
    // finite one-frame shimmer that TAA absorbs. Verified by a 20 s NaN soak
    // of the composer targets (W4-B in BUDGETS.md).
    fragmentShader: /* glsl */`
      varying vec2 vV;
      varying vec3 vColFace;
      varying vec3 vColEdge;
      varying vec3 vColHot;
      void main() {
        float v = clamp(vV.x, 0.0, 1.0);
        float faceMask = clamp(vV.y, 0.0, 1.0);
        float edge  = exp(-v*58.0);         // hairline free edge
        float edgeW = exp(-v*12.0);         // narrow skirt, reveals only
        float face = (0.0011 + 0.0056*exp(-v*5.2)) * smoothstep(0.56, 0.40, v);
        // subtle thickness: a dim counter-lip just above the bright edge
        float dLip = (v - 0.045) / 0.022;
        float lip = exp(-dLip*dLip) * 0.12;
        float hotShape = 0.014*faceMask + 0.07*edgeW + 0.95*edge;
        vec3 col = vColFace * face
                 + vColEdge * (edge + lip)
                 + vColHot * hotShape;
        gl_FragColor = vec4(min(max(col, vec3(0.0)), vec3(48.0)), 1.0);
      }`,
  });
}

/* ================================================================
   Free-edge lines — THE light carrier of the colonnade.

   The sheets alone read as silk: their shader "hairline" is a WORLD-space
   strip, so up close it smears into a glowing ribbon under bloom. The
   hero's own gills stay crisp under the same bloom because they are 1-px
   LINES. So the blade's free edge is drawn twice: this 1-px polyline
   carries the crisp light (exactly the spike-a/G2a read), and the sheet
   keeps only a faint warm under-glow plus the serrated silhouette. The
   polyline is placed with the same JS mirror (bladeEdgePt) the veins and
   beads use, and applies the SAME micro-flex term as the sheet's vertex
   shader, so line and tissue move as one.
   ================================================================ */
function makeEdgeMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount, uFlex: U.uFlex,
      uComm: U.uComm, uAmbC: U.uAmbC, uAmbA: U.uAmbA, uAmbW: U.uAmbW,
      uAdos: U.uAdos, uExit: U.uExit,
      uBright: { value: 0.72 },
      uHot: { value: 0.85 },
      uNear: { value: 0.55 },
      uFog: { value: 0.26 },
      uColEdge: { value: heat(0.76, new THREE.Color()).clone() },
      uColHot: { value: heat(0.93, new THREE.Color()).clone() },
      uColGold: { value: heat(0.58, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aE;    // u, seed, bright, region
      attribute float aOrder;
      uniform float uTime, uFlex, uAmount, uBright, uHot, uNear, uFog;
      uniform vec3 uColEdge, uColHot, uColGold;
      uniform vec2 uComm;
      uniform vec3 uAmbC, uAmbA, uAmbW;
      uniform vec3 uAdos;
      uniform vec2 uExit;
      varying vec3 vCol;
      float regionGlow(float az, float c, float a, float w){
        float d = az - c; d = atan(sin(d), cos(d));
        return a * exp(-d*d/(w*w));
      }
      float band(float x, float c, float w){ float d = (x - c) / w; return exp(-d*d); }
      void main() {
        float u = aE.x, seed = aE.y, bright = aE.z, region = aE.w;
        float az = atan(position.z, position.x);
        // same micro-flex as the sheet edge (v = 0), small-angle rotation
        float dAzF = uFlex * 0.006 * sin(uTime*0.23 + seed*6.2831 + u*2.2);
        vec3 p = vec3(position.x - position.z*dAzF, position.y, position.z + position.x*dAzF);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = length(mv.xyz);
        float tw = 0.5 + 0.5*sin(uTime*(0.16 + fract(seed*7.31)*0.30) + seed*41.0);
        float wet = smoothstep(0.985, 1.0, sin(u*57.0 + seed*91.0)) * (0.35 + 0.65*tw);
        float eProf = 0.62 + 0.38*u*u - 0.30*band(u, 0.45, 0.24);
        float amb = regionGlow(az, uAmbC.x, uAmbA.x, uAmbW.x)
                  + regionGlow(az, uAmbC.y, uAmbA.y, uAmbW.y)
                  + regionGlow(az, uAmbC.z, uAmbA.z, uAmbW.z);
        float lit = region > 0.5
          ? uComm.x * smoothstep(aOrder - 0.12, aOrder + 0.05, uComm.y)
          : 0.0;
        float dAz = abs(atan(sin(az - uAdos.z), cos(az - uAdos.z)));
        float ring = uAdos.x * band(dAz, uAdos.y, 0.30) * band(u, 0.18, 0.26);
        float ex = uExit.x * band(u, uExit.y, 0.10);
        float gate = smoothstep(uNear*0.3, uNear, dist)
                   * exp(-uFog*uFog*dist*dist) * uAmount
                   * clamp(dist / 1.3, 0.5, 1.0);
        vCol = (uColEdge * (uBright * bright * eProf * (0.80 + 0.20*tw + 0.8*wet))
              + uColGold * (amb * 0.45)
              + uColHot * ((lit + ring + ex*0.6) * uHot)) * gate;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      void main() {
        gl_FragColor = vec4(min(max(vCol, vec3(0.0)), vec3(48.0)), 1.0);
      }`,
  });
}

/* ================================================================
   Vein material — taut anastomosing threads
   ================================================================ */
function makeVeinMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uComm: U.uComm, uAmbC: U.uAmbC, uAmbA: U.uAmbA, uAmbW: U.uAmbW,
      uBase: { value: 0.34 },
      uNear: { value: 0.55 },
      uFog: { value: 0.15 },
      uColDeep: { value: heat(0.42, new THREE.Color()).clone() },
      uColGold: { value: heat(0.60, new THREE.Color()).clone() },
      uColHot: { value: heat(0.93, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aStrand;
      attribute float aRegion;
      attribute float aOrder;
      attribute float aTone;
      varying vec4 vA;   // strand, region, order, tone
      varying vec2 vB;   // az, dist
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec4(aStrand, aRegion, aOrder, aTone);
        vB = vec2(atan(position.z, position.x), length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmount, uBase, uNear, uFog;
      uniform vec3 uColDeep, uColGold, uColHot;
      uniform vec2 uComm;
      uniform vec3 uAmbC, uAmbA, uAmbW;
      varying vec4 vA;
      varying vec2 vB;
      float regionGlow(float az, float c, float a, float w){
        float d = az - c; d = atan(sin(d), cos(d));
        return a * exp(-d*d/(w*w));
      }
      void main() {
        float s = vA.x, region = vA.y, order = vA.z, tone = vA.w;
        float az = vB.x, dist = vB.y;
        float tw = 0.5 + 0.5*sin(uTime*(0.42 + fract(s*9.7)*1.2) + s*57.0);
        float amb = regionGlow(az, uAmbC.x, uAmbA.x, uAmbW.x)
                  + regionGlow(az, uAmbC.y, uAmbA.y, uAmbW.y)
                  + regionGlow(az, uAmbC.z, uAmbA.z, uAmbW.z);
        // community stage three: the cross-links complete the region
        float lit = region > 0.5
          ? uComm.x * smoothstep(order - 0.10, order + 0.04, uComm.y)
          : 0.0;
        vec3 col = uColDeep * (uBase * tone * (0.45 + 0.55*tw))
                 + uColGold * (amb * 0.20)
                 + uColHot * (lit * 0.80);
        col *= smoothstep(uNear*0.3, uNear, dist);
        col *= exp(-uFog*uFog*dist*dist);
        gl_FragColor = vec4(col * uAmount, 1.0);
      }`,
  });
}

/* ================================================================
   Spores — drifting between lamellae, migrating to the rim (CN-4.2),
   feeding Inspire's release story backward. All motion in-shader.
   ================================================================ */
function makeSporeMat(U, tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uMap: { value: tex },
      uSize: { value: 26.0 },
      uCol: { value: heat(0.72, new THREE.Color()).clone() },
      uCol2: { value: heat(0.55, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSpore;   // az, u0, seed, hang
      uniform float uTime, uSize;
      varying vec2 vA;         // alpha, seed
      ${CAP_GLSL}
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        float az0 = aSpore.x, u0 = aSpore.y, seed = aSpore.z, hang = aSpore.w;
        float ph = fract(uTime * (0.012 + h(seed)*0.014) + seed);
        // slow migration toward the cap margin, weaving slightly, falling a touch
        float u = mix(u0, 1.05, ph);
        float az = az0 + sin(uTime*0.05 + seed*6.0)*0.02 + ph*(h(seed*2.3)-0.5)*0.05;
        vec3 cp = capUnderG(min(u, 1.0), az);
        float y = cp.y - 0.10 - hang * depthOfG(min(u, 1.0)) - ph*0.14
                + sin(uTime*0.14 + seed*11.0)*0.05;
        vec3 p = vec3(cp.x, y, cp.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = length(mv.xyz);
        float a = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.66, 1.0, ph))
                * smoothstep(0.30, 0.70, dist)
                * (0.25 + 0.5*h(seed*4.1));
        float sz = uSize * (1.0 / max(dist, 0.4)) * (0.5 + h(seed*5.7)*0.8);
        // hero min-size shrink trick: clamp px size, pay in alpha
        float px = max(sz, 1.5);
        a *= (sz / px) * (sz / px);
        vA = vec2(a, seed);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = px;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uCol, uCol2;
      uniform float uAmount;
      varying vec2 vA;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(uCol, uCol2, h(vA.y * 9.3) * 0.7);
        gl_FragColor = vec4(col, tex.a * vA.x * uAmount);
      }`,
  });
}

/* ================================================================
   The build
   ================================================================ */
function gridGeo(nu, nv) {
  const nVert = (nu + 1) * (nv + 1);
  const pos = new Float32Array(nVert * 3);
  const idx = new Uint16Array(nu * nv * 6);
  let k = 0;
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      pos[k * 3] = i / nu; pos[k * 3 + 1] = j / nv;
      k++;
    }
  }
  let o = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      idx[o++] = a; idx[o++] = b; idx[o++] = d;
      idx[o++] = a; idx[o++] = d; idx[o++] = c;
    }
  }
  return { pos, idx };
}

function makeBatchGeo(specs, nu, nv) {
  const g = new THREE.InstancedBufferGeometry();
  const base = gridGeo(nu, nv);
  g.setAttribute('position', new THREE.BufferAttribute(base.pos, 3));
  g.setIndex(new THREE.BufferAttribute(base.idx, 1));
  const n = specs.length;
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4), C = new Float32Array(n * 4);
  specs.forEach((s, i) => {
    A[i * 4] = s.az0; A[i * 4 + 1] = s.uStart; A[i * 4 + 2] = s.depthScale; A[i * 4 + 3] = s.bend;
    B[i * 4] = s.seed; B[i * 4 + 1] = s.bright; B[i * 4 + 2] = s.region; B[i * 4 + 3] = s.order;
    C[i * 4] = s.lean; C[i * 4 + 1] = s.scallopAmp; C[i * 4 + 2] = s.bowAmp; C[i * 4 + 3] = s.patch;
  });
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 4));
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 4));
  g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 4));
  g.instanceCount = n;
  return g;
}

const N_PRIMARY = 28;
// The Community sector: front-left wall of the chamber as framed from the
// Connect rest (az window centred where the rest gaze lands it centre-frame,
// clear of the left copy block — see connect.js composition note).
export const COMM_AZ = 2.95;
export const COMM_W = 0.36;

function wrapPi(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }

export function buildColonnade(group, U) {
  const rand = makeRng(31418);
  const gauss = () => gaussOf(rand);
  const counts = { blades: 0, tris: 0, veinSegs: 0, beads: 0, spores: 0, sprites: 0 };
  const fadeMats = [];   // {m, base} — non-shader materials scaled by amount

  // sector luminosity patches — whole sectors stay dimmer (organic asymmetry)
  const patchOf = (az) => {
    const p = 0.5 + 0.5 * (0.6 * Math.sin(az * 1.7 + 0.8) + 0.4 * Math.sin(az * 3.3 + 2.9));
    // one deliberately dark sector: the wall that sits behind the left copy
    // block at the rest pose (az ~1.95 from the rest camera) stays quiet, so
    // the heading floats on darkness — reads as organic patchiness, doubles
    // as copy legibility
    const d = Math.atan2(Math.sin(az - 1.95), Math.cos(az - 1.95));
    const copyShadow = 1 - 0.62 * Math.exp(-(d * d) / (0.55 * 0.55));
    return (0.45 + 0.65 * p) * copyShadow;
  };

  function spec(tier, az0, uStart, depthScale, brightMul) {
    const azn = ((az0 % TAU) + TAU) % TAU;
    const dC = Math.abs(wrapPi(azn - COMM_AZ));
    let region = 0, order = 0;
    if (dC < COMM_W && tier < 2) {
      region = 1;
      order = tier === 0 ? 0.02 + 0.33 * (dC / COMM_W)
                         : 0.36 + 0.26 * (dC / COMM_W);
    }
    return {
      az0, uStart, depthScale,
      bend: (rand() - 0.5) * 0.14,
      seed: rand(),
      bright: (0.55 + rand() * 0.45) * brightMul,
      region, order,
      lean: (rand() - 0.5) * 0.05,
      scallopAmp: 0.008 + rand() * 0.012,
      bowAmp: (rand() - 0.5) * 0.06,
      patch: patchOf(azn),
    };
  }

  const step = TAU / N_PRIMARY;
  const primaries = [], secondaries = [], tertiaries = [];
  for (let i = 0; i < N_PRIMARY; i++) {
    primaries.push(spec(0,
      i * step + (rand() - 0.5) * step * 0.34,
      0.09 + rand() * 0.05,
      0.92 + rand() * 0.22,
      1.0 + (rand() < 0.12 ? 0.3 : 0)));
    secondaries.push(spec(1,
      (i + 0.5) * step + (rand() - 0.5) * step * 0.26,
      0.40 + rand() * 0.12,
      0.68 + rand() * 0.14,
      0.55 + rand() * 0.25));
    if (rand() < 0.62) {
      tertiaries.push(spec(2,
        (i + (rand() < 0.5 ? 0.25 : 0.75)) * step + (rand() - 0.5) * step * 0.16,
        0.64 + rand() * 0.12,
        0.46 + rand() * 0.12,
        0.38 + rand() * 0.20));
    }
  }

  const bladeMat = makeBladeMat(U);
  const RES = { primary: [40, 3], secondary: [26, 3], tertiary: [16, 2] };
  for (const [specs, res] of [[primaries, RES.primary], [secondaries, RES.secondary], [tertiaries, RES.tertiary]]) {
    const mesh = new THREE.Mesh(makeBatchGeo(specs, res[0], res[1]), bladeMat);
    mesh.frustumCulled = false;
    group.add(mesh);
    counts.blades += specs.length;
    counts.tris += specs.length * res[0] * res[1] * 2;
  }

  /* ---- crisp free-edge polylines (see makeEdgeMat note) ---- */
  {
    const ep = [], eA = [], eOrd = [];
    const pushEdge = (specs, SEG) => {
      for (const s of specs) {
        let prev = null;
        for (let k = 0; k <= SEG; k++) {
          const t = k / SEG;
          const u = s.uStart + t * (1 - s.uStart);
          const P = bladeEdgePt(s, u);
          // same taper as the sheet: fade in off the stem, dim into the margin
          const endsK = smooth01(t / 0.10) * (1 - 0.45 * smooth01((u - 0.86) / 0.14));
          const node = { P, u, b: s.bright * s.patch * endsK };
          if (prev) {
            ep.push(prev.P.x, prev.P.y, prev.P.z, P.x, P.y, P.z);
            for (const n of [prev, node]) {
              eA.push(n.u, s.seed, n.b, s.region);
              eOrd.push(s.order);
            }
            counts.edgeSegs++;
          }
          prev = node;
        }
      }
    };
    counts.edgeSegs = 0;
    pushEdge(primaries, 40);
    pushEdge(secondaries, 26);
    pushEdge(tertiaries, 16);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
    g.setAttribute('aE', new THREE.Float32BufferAttribute(eA, 4));
    g.setAttribute('aOrder', new THREE.Float32BufferAttribute(eOrd, 1));
    const lines = new THREE.LineSegments(g, makeEdgeMat(U));
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- cross-veins: taut, patchy, densified through the Community sector ---- */
  const vp = [], vstr = [], vreg = [], vord = [], vton = [];
  const bp = [], bc = [], beadPush = (P, h) => {
    bp.push(P.x, P.y, P.z);
    heat(h, tmpC); bc.push(tmpC.r, tmpC.g, tmpC.b);
    counts.beads++;
  };
  const N_VEIN_TRY = 150;
  const commIdx = primaries
    .map((s, i) => ({ i, d: Math.abs(wrapPi(s.az0 - COMM_AZ)) }))
    .filter(e => e.d < COMM_W).map(e => e.i);
  for (let v = 0; v < N_VEIN_TRY; v++) {
    const inComm = v % 4 === 0 && commIdx.length > 1;
    const i = inComm
      ? commIdx[Math.floor(rand() * commIdx.length)]
      : Math.floor(rand() * N_PRIMARY);
    // patchy: whole sectors stay unveined — real dark gaps survive
    if (!inComm && Math.sin(i * 1.7 + 0.8) < -0.25 && rand() < 0.65) continue;
    const A = primaries[i], B = primaries[(i + 1) % N_PRIMARY];
    const u0 = 0.30 + rand() * 0.55;
    const u1 = Math.max(0.22, Math.min(0.92, u0 + gauss() * 0.05));
    const P0 = bladeEdgePt(A, u0); P0.y += 0.03 + rand() * 0.05;
    const P1 = bladeEdgePt(B, u1); P1.y += 0.03 + rand() * 0.05;
    const strand = rand();
    const tone = 0.5 + rand() * 0.5;
    const region = (A.region && B.region) ? 1 : 0;
    const order = 0.62 + rand() * 0.36;
    // TAUT: a slight bow only — membrane tissue, never a hanging thread
    const sag = 0.012 + rand() * 0.028;
    const SEG = 5;
    let prev = null;
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const p = new THREE.Vector3().lerpVectors(P0, P1, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      p.x += gauss() * 0.006; p.z += gauss() * 0.006;
      if (prev) {
        vp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        for (let q = 0; q < 2; q++) { vstr.push(strand); vreg.push(region); vord.push(order); vton.push(tone); }
        counts.veinSegs++;
      }
      prev = p;
    }
    if (rand() < 0.4) beadPush(P0, 0.72 + rand() * 0.2);
  }
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
    g.setAttribute('aStrand', new THREE.Float32BufferAttribute(vstr, 1));
    g.setAttribute('aRegion', new THREE.Float32BufferAttribute(vreg, 1));
    g.setAttribute('aOrder', new THREE.Float32BufferAttribute(vord, 1));
    g.setAttribute('aTone', new THREE.Float32BufferAttribute(vton, 1));
    const lines = new THREE.LineSegments(g, makeVeinMat(U));
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- moisture beads along the free edges ---- */
  for (const s of primaries) {
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      beadPush(bladeEdgePt(s, 0.30 + rand() * 0.66), 0.68 + rand() * 0.3);
    }
  }
  const glowTex = makeGlowTexture();
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    const m = new THREE.PointsMaterial({
      map: glowTex, vertexColors: true, size: 0.028, sizeAttenuation: true,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    group.add(pts);
    fadeMats.push({ m, base: 0.55 });
  }

  /* ---- spores drifting between the lamellae toward the rim ---- */
  {
    const N = 380;
    const arr = new Float32Array(N * 4);
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const gi = Math.floor(rand() * N_PRIMARY);
      const az = gi * step + step * (0.25 + rand() * 0.5);
      const u0 = 0.22 + Math.pow(rand(), 0.85) * 0.55;
      arr[i * 4] = az; arr[i * 4 + 1] = u0; arr[i * 4 + 2] = rand();
      arr[i * 4 + 3] = 0.15 + rand() * 0.6;
      const p0 = capUnderPt(u0, az);
      pos[i * 3] = p0.x; pos[i * 3 + 1] = p0.y - 0.3; pos[i * 3 + 2] = p0.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSpore', new THREE.BufferAttribute(arr, 4));
    const pts = new THREE.Points(g, makeSporeMat(U, glowTex));
    pts.frustumCulled = false;
    group.add(pts);
    counts.spores = N;
  }

  /* ---- warm haze deep in the chamber: distance dissolves into ember, not black ---- */
  for (let i = 0; i < 7; i++) {
    // far (front-left) arc only, as seen from the Connect rest camera at
    // az ~5.6: a near-side haze sprite becomes a frame-filling blob
    const a = 1.7 + i * 0.32 + gauss() * 0.12;
    const r = 1.1 + rand() * 0.9;
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: heat(0.42 + rand() * 0.1, tmpC).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    const p = capUnderPt(Math.min(1, r / rimRad(a)), a);
    s.position.set(p.x, p.y - 0.35 - rand() * 0.3, p.z);
    s.scale.set(1.6 + rand() * 1.4, 1.1 + rand() * 0.8, 1);
    group.add(s);
    fadeMats.push({ m: mat, base: 0.026 + rand() * 0.02 });
    counts.sprites++;
  }

  return { counts, fadeMats, primaries, secondaries, glowTex };
}
