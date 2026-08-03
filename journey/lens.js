// journey-v6 — the journey's lens. Adapted from spike-a/lens.js (approved at
// G2a), extended by the W5 GRADE-UNIFICATION pass: the same finishing
// language now covers the FULL journey (p 0..1), with per-leg parameter
// curves where the chapters' BUDGETS notes demand them. The G2a-approved
// Mission/Inspire look is the fixed identity: at p <= 0.38 every parameter is
// byte-identical to what G2a reviewed, and the curves only move OFF that
// identity where a chapter's documented compensation notes require it.
//
// Harvested from journey/core/optics.js (GradePass) and ADAPTED, not reused:
// the donor ran its grade in display space after its own OutputPass, on its
// own composer. Here the hero's approved composer is the platform —
// RenderPass -> UnrealBloom(0.62/0.45/0.1) -> TAA -> OutputPass — and the
// grade is inserted as ONE extra pass between TAA and OutputPass, so:
//   - there is no second composer and no double bloom (ADR AR-1),
//   - grain lands AFTER temporal accumulation (TAA would average it away),
//   - the shader operates in LINEAR HDR, so every display-space constant
//     from the donor (lift 0.04, grain 0.055, halation knee 0.6) has been
//     re-derived for pre-ACES values.
// The raw-vs-finished toggle [g] simply disables the pass — everything else
// in the chain is the untouched hero, so "raw" IS the approved hero look
// (post-bloom, pre-grade) at every p.
//
// Per-leg curve rationale (each anchored to a chapter's BUDGETS note):
//   Mission/Inspire  the G2a identity, untouched.
//   Connect          halation restrained (the 1-px free-edge polylines are
//                    the brightest element in frame — full-strength halation
//                    smears the crisp light carrier the chapter is built on);
//                    near-black lift kept at identity so the uBase/uEdge
//                    silk-vs-blade balance survives un-retuned.
//   Owned            underground: the near-black warms and lifts slightly
//                    (soil reads as amber-dark, not void-black) and grain
//                    densifies a touch — film in a dark interior.
//   Final            the raw render is deliberately less dense/luminous than
//                    the approved still — "that's the grade's job" (W4-D):
//                    gentle exposure gain, warmer lift, halation up on the
//                    ring highlights, vignette eased open for the sky.
//   T2/T3 seam dips  the fog-dip crossings read RICHER under the grade
//                    (W3-B's prediction): grain + lift-warmth + vignette
//                    momentarily deepen on the same pure-in-p bells the
//                    director uses, so the effect is perfectly reversible
//                    and zero at every rest.
//
// Also owned here (W5):
//   - TAA history sanitise (Connect's W4-B discovery): on this ANGLE/Metal
//     stack a single NaN fragment poisons the TAA history FOREVER
//     (mix(x, NaN, 0) is NaN, and the blend re-poisons its own feedback
//     loop every frame). The hero's TemporalAccumulatePass is core-owned by
//     the composer platform, so the lens patches its blend shader at boot:
//     non-finite history pixels are replaced by the current frame, and a
//     non-finite blend result flushes to black for that one frame. The worst
//     any future chapter NaN can do is a one-frame shimmer that heals.
//   - prefers-reduced-motion: grain FREEZES to a static frame (handoff,
//     VISUAL FINISHING) — the anti-banding texture stays, the motion goes.
//   - setTier(2): grade identity first (LUT/lift/roll-off + grain + vignette
//     kept), aberration and halation dropped (streak-class effects are
//     Tier-1 only, per the donor tier model and the LA-7 proposal).
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SEAM_FOG_DIPS } from './constants.js';

const GradeShader = {
  name: 'SpikeGradePass',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: null },
    uGrainSeed: { value: 0 },
    uGrainAmt: { value: 0.030 },     // linear-space grain amplitude
    uLift: { value: new THREE.Vector3(0.0060, 0.0037, 0.0017) }, // warm near-black
    uGain: { value: 1.0 },           // pre-tonemap exposure gain (Final leg)
    uHalation: { value: 1.0 },       // continuous strength, 0 disables
    uAberration: { value: 1.0 },
    uVignette: { value: 0.34 },
    uFocusOn: { value: 0.0 },
    uFocusUv: { value: null },
    uAmount: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uGrainSeed;
    uniform float uGrainAmt;
    uniform vec3 uLift;
    uniform float uGain;
    uniform float uHalation;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uFocusOn;
    uniform vec2 uFocusUv;
    uniform float uAmount;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float dist2 = dot(centered, centered);

      // --- restrained edge-weighted RGB aberration: zero in the central ~45% ---
      vec3 base;
      {
        float amt = uAberration * smoothstep(0.16, 0.55, dist2) * 1.4;
        vec2 dir = (dist2 > 1e-7) ? normalize(centered) : vec2(0.0);
        vec2 off = dir * amt / max(uResolution.y, 1.0);
        base = vec3(
          texture2D(tDiffuse, uv + off).r,
          texture2D(tDiffuse, uv).g,
          texture2D(tDiffuse, uv - off).b);
      }

      // --- selective warm halation: red-orange bleed around hot cores only,
      //     with a slight +x asymmetry (a lens artifact, not a bloom) ---
      vec3 halation = vec3(0.0);
      if (uHalation > 0.01) {
        vec2 px = 1.0 / uResolution;
        vec2 bias = vec2(3.0, 0.0) * px;
        vec3 acc = vec3(0.0);
        acc += texture2D(tDiffuse, uv + vec2( 9.0,  0.0) * px + bias).rgb;
        acc += texture2D(tDiffuse, uv + vec2(-7.0,  4.0) * px + bias).rgb;
        acc += texture2D(tDiffuse, uv + vec2( 0.0,  9.0) * px + bias).rgb;
        acc += texture2D(tDiffuse, uv + vec2( 0.0, -9.0) * px + bias).rgb;
        acc += texture2D(tDiffuse, uv + vec2( 6.5,  6.5) * px + bias).rgb;
        acc += texture2D(tDiffuse, uv + vec2(-6.5, -6.5) * px + bias).rgb;
        acc /= 6.0;
        // linear-HDR knee: only genuinely hot cores (post-bloom) contribute
        float excess = max(luma(acc) - 0.55, 0.0);
        float focusBoost = 1.0;
        if (uFocusOn > 0.5) {
          focusBoost += smoothstep(0.35, 0.0, distance(uv, uFocusUv)) * 0.7;
        }
        halation = excess * vec3(1.0, 0.42, 0.15) * 0.55 * uHalation * focusBoost;
      }

      vec3 color = base + halation;

      // --- grade: lifted warm near-black, warm gain in the lows ---
      color = uLift + color * (1.0 - uLift.r);
      float lum = luma(color);
      vec3 gain = vec3(1.055, 1.015, 0.945); // amber-led, restrained cool
      color *= mix(vec3(1.0), gain, 1.0 - clamp(lum * 1.6, 0.0, 1.0));

      // --- per-leg exposure gain (1.0 everywhere except the Final leg,
      //     where the grade supplies the still's missing luminosity) ---
      color *= uGain;

      // --- highlight roll-off toward ember (never clip to white) ---
      // In linear HDR, pull very hot values toward the ember axis BEFORE the
      // OutputPass tonemap, so ACES receives colour, not white.
      {
        vec3 ember = vec3(1.0, 0.72, 0.42);
        float roll = smoothstep(0.85, 3.2, lum);
        vec3 emberised = ember * lum;
        color = mix(color, emberised, roll * 0.42);
      }

      // --- luminance-weighted fine animated grain (post-TAA, pre-tonemap) ---
      {
        float gl = clamp(luma(color) * 2.2, 0.0, 1.0);
        float n = hash(uv * uResolution + vec2(uGrainSeed, uGrainSeed * 1.7)) - 0.5;
        // strongest in shadow/midtone, suppressed in the hot cores
        float weight = mix(1.0, 0.12, smoothstep(0.35, 0.85, gl));
        color += n * uGrainAmt * weight * (0.25 + luma(color));
      }

      // --- soft vignette, clean centre ---
      {
        float vd = length(centered);
        float vig = smoothstep(0.42, 0.95, vd);
        color *= (1.0 - vig * uVignette);
      }

      // master crossfade back to the untouched hero frame
      vec3 raw = texture2D(tDiffuse, vUv).rgb;
      color = mix(raw, color, clamp(uAmount, 0.0, 1.0));

      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }
  `,
};

/* ================================================================
   Per-leg look curve
   ================================================================
   `lift` scales the near-black lift; `warm` blends the lift vector toward a
   redder/deeper-amber ratio (underground soil-glow); `hal` scales halation;
   `gain` is the pre-tonemap exposure multiply; `grain`/`vig` as named.
   Keys are interpolated with smoothstep in p. p <= 0.38 is EXACTLY the G2a
   identity — the approved family at the hero pose and across the whole
   Mission/Inspire leg.                                                    */
const LOOK_BASE = { gain: 1.0, lift: 1.0, warm: 0.0, hal: 1.0, vig: 0.34, grain: 0.030 };
const LOOK_KEYS = [
  { p: 0.00, ...LOOK_BASE },                                    // Mission (G2a)
  { p: 0.38, ...LOOK_BASE },                                    // Inspire leg end (G2a)
  // Connect: halation restrained — the free-edge polylines are the
  // brightest element (W4-B note a); everything else stays at identity so
  // the uBase/uEdge balance tuned against ACES holds (note b).
  { p: 0.44, gain: 1.0, lift: 1.0, warm: 0.10, hal: 0.62, vig: 0.35, grain: 0.031 },
  { p: 0.60, gain: 1.0, lift: 1.0, warm: 0.10, hal: 0.62, vig: 0.35, grain: 0.031 },
  // Owned: warm the near-black slightly underground; denser grain.
  { p: 0.68, gain: 1.02, lift: 1.35, warm: 0.55, hal: 0.85, vig: 0.36, grain: 0.035 },
  { p: 0.85, gain: 1.02, lift: 1.35, warm: 0.55, hal: 0.85, vig: 0.36, grain: 0.035 },
  // Final: the grade ADDS the approved still's density/luminosity (W4-D).
  { p: 0.93, gain: 1.14, lift: 1.18, warm: 0.30, hal: 1.25, vig: 0.29, grain: 0.030 },
  { p: 1.00, gain: 1.14, lift: 1.18, warm: 0.30, hal: 1.25, vig: 0.29, grain: 0.030 },
];
const LIFT_BASE = new THREE.Vector3(0.0060, 0.0037, 0.0017);
const LIFT_WARM = new THREE.Vector3(0.0068, 0.0034, 0.0009); // same order of magnitude, redder ratio

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

function lookAt(p, out) {
  let a = LOOK_KEYS[0], b = LOOK_KEYS[LOOK_KEYS.length - 1];
  for (let i = 0; i < LOOK_KEYS.length - 1; i++) {
    if (p >= LOOK_KEYS[i].p && p <= LOOK_KEYS[i + 1].p) { a = LOOK_KEYS[i]; b = LOOK_KEYS[i + 1]; break; }
  }
  const t = smooth01((p - a.p) / Math.max(b.p - a.p, 1e-6));
  for (const k of ['gain', 'lift', 'warm', 'hal', 'vig', 'grain']) out[k] = a[k] + (b[k] - a[k]) * t;
  // T2/T3 crossings: the same pure-in-p bells the director's fog dips use.
  // Richer, not darker-only: grain + lift warmth + vignette deepen briefly.
  for (const d of SEAM_FOG_DIPS) {
    const bell = smooth01(1 - Math.abs(p - d.c) / d.w);
    if (bell > 0) {
      out.grain += 0.014 * bell;
      out.lift *= 1 + 0.55 * bell;
      out.warm = Math.min(1, out.warm + 0.40 * bell);
      out.vig += 0.045 * bell;
      out.hal *= 1 - 0.30 * bell;   // sources are fogged; do not smear them
    }
  }
  return out;
}

/* ================================================================
   TAA history sanitise (W4-B stability finding, implemented core-side)
   ================================================================
   The hero's TemporalAccumulatePass lives in mushroom-scene.js (frozen);
   the lens is the composer's core-side tenant, so the hardening is applied
   here as a boot-time patch of the blend material. GLSL is compiled as
   ES 3.00 under WebGL2, so isnan()/isinf() are real builtins. */
function hardenTAA(composer) {
  const taa = composer.passes.find((ps) => ps && ps.history && ps.blendMat);
  if (!taa) {
    console.warn('[journey-lens] TAA pass not found — history sanitise NOT installed');
    return false;
  }
  if (/sanitise/.test(taa.blendMat.fragmentShader)) return true;   // idempotent
  taa.blendMat.fragmentShader = /* glsl */`
    uniform sampler2D tDiffuse; uniform sampler2D tHistory; uniform float uW;
    varying vec2 vUv;
    void main() {
      // W5 history sanitise: on this ANGLE/Metal stack a NaN pixel in the
      // feedback loop is otherwise held forever (mix(x, NaN, 0.0) is NaN).
      // Non-finite history is replaced by the current frame; a non-finite
      // blend result flushes to black for one frame. Either way the loop
      // re-converges instead of blacking the composer permanently.
      vec4 c = texture2D(tDiffuse, vUv);
      vec4 h = texture2D(tHistory, vUv);
      float hs = h.r + h.g + h.b + h.a;
      if (isnan(hs) || isinf(hs)) h = c;
      vec4 o = mix(c, h, uW);
      float os = o.r + o.g + o.b + o.a;
      if (isnan(os) || isinf(os)) o = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = o;
    }`;
  taa.blendMat.needsUpdate = true;
  console.info('[journey-lens] TAA history sanitise installed');
  return true;
}

export function createLens(sceneApi) {
  const { composer, renderer, camera } = sceneApi;

  const taaHardened = hardenTAA(composer);

  const pass = new ShaderPass(GradeShader);
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  pass.uniforms.uResolution.value = new THREE.Vector2(db.width, db.height);
  pass.uniforms.uFocusUv.value = new THREE.Vector2(0.5, 0.5);

  // Insert between TAA (index 2) and OutputPass (index 3). Find OutputPass by
  // position rather than assuming: it is the last pass.
  const outIdx = composer.passes.length - 1;
  composer.insertPass(pass, outIdx);

  addEventListener('resize', () => {
    const d = renderer.getDrawingBufferSize(new THREE.Vector2());
    pass.uniforms.uResolution.value.set(d.width, d.height);
  });

  /* ---- reduced motion: grain freezes to a static frame (never removed) ---- */
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {} };
  const GRAIN_FROZEN_SEED = 137.0;   // any fixed frame of the same noise field

  /* ---- tier: 2 keeps grade identity, drops aberration + halation ---- */
  let tier = 1;

  let userEnabled = true;            // [g] raw toggle
  let amount = 1;                    // master crossfade (QA / future scoping)
  const look = { ...LOOK_BASE };
  let progress = 0;

  let focusWorld = null;
  const _fv = new THREE.Vector3();
  sceneApi.addAnimator('journey-lens', (t) => {
    pass.uniforms.uTime.value = t;
    pass.uniforms.uGrainSeed.value = reduceMotion.matches
      ? GRAIN_FROZEN_SEED
      : (t * 97.13) % 1000;
    if (focusWorld) {
      _fv.copy(focusWorld).project(camera);
      pass.uniforms.uFocusUv.value.set((_fv.x + 1) / 2, (_fv.y + 1) / 2);
      pass.uniforms.uFocusOn.value = 1.0;
    } else {
      pass.uniforms.uFocusOn.value = 0.0;
    }
  });

  function applyLook() {
    const u = pass.uniforms;
    u.uGain.value = look.gain;
    u.uGrainAmt.value = look.grain;
    u.uVignette.value = look.vig;
    u.uHalation.value = tier >= 2 ? 0.0 : look.hal;
    u.uAberration.value = tier >= 2 ? 0.0 : 1.0;
    u.uLift.value.lerpVectors(LIFT_BASE, LIFT_WARM, look.warm).multiplyScalar(look.lift);
  }
  applyLook();

  function syncEnabled() {
    pass.enabled = userEnabled && amount > 0.002;
    document.body.classList.toggle('graded', pass.enabled);
  }
  syncEnabled();

  return {
    pass,
    taaHardened,
    /** [g]: raw (pre-grade, post-bloom hero baseline) vs finished. */
    setEnabled(on) { userEnabled = !!on; syncEnabled(); },
    get enabled() { return pass.enabled; },
    /** Per-frame: journey progress -> the per-leg finishing curve. */
    update(p) {
      progress = p;
      lookAt(p, look);
      applyLook();
    },
    get progress() { return progress; },
    get look() { return { ...look, tier }; },
    /** 0..1 crossfade to the untouched frame (QA affordance; the unified
     *  grade holds this at 1 across the whole journey). */
    setAmount(a) {
      amount = a < 0 ? 0 : a > 1 ? 1 : a;
      pass.uniforms.uAmount.value = amount;
      syncEnabled();
    },
    get amount() { return amount; },
    /** Tier identity: 2 keeps LUT/lift/roll-off/grain/vignette, drops
     *  aberration + halation (streak-class effects are Tier-1 only). */
    setTier(t) { tier = t; applyLook(); },
    get tier() { return tier; },
    /** Warm halation bias toward the active focal source (world pos or null). */
    setFocusHint(pos) {
      if (!pos) { focusWorld = null; return; }
      (focusWorld || (focusWorld = new THREE.Vector3())).copy(pos);
    },
  };
}
