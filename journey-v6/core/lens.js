// journey-v6 — extension lens. Adapted from spike-a/lens.js (approved at
// G2a), with ONE grey-box change: a master uAmount so the grade can be
// crossfaded rather than switched.
//
// SCOPE FOR THE GREY-BOX (BUDGETS.md finding): Spike B's grade ran without
// OutputPass, i.e. its additive calibration was display-space. Full optics
// reconciliation across all five chapters is a PRODUCTION task and is
// explicitly not solved here - so the grade runs on the Mission/Inspire leg
// only (where it was actually reviewed) and fades out before Connect. Every
// chapter past Inspire renders raw.
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
// in the chain is the untouched hero, so "raw" IS the approved hero look.
import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  name: 'SpikeGradePass',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: null },
    uGrainSeed: { value: 0 },
    uGrainAmt: { value: 0.030 },     // linear-space grain amplitude
    uLift: { value: new THREE.Vector3(0.0060, 0.0037, 0.0017) }, // warm near-black
    uHalation: { value: 1.0 },
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
      if (uHalation > 0.5) {
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
        halation = excess * vec3(1.0, 0.42, 0.15) * 0.55 * focusBoost;
      }

      vec3 color = base + halation;

      // --- grade: lifted warm near-black, warm gain in the lows ---
      color = uLift + color * (1.0 - uLift.r);
      float lum = luma(color);
      vec3 gain = vec3(1.055, 1.015, 0.945); // amber-led, restrained cool
      color *= mix(vec3(1.0), gain, 1.0 - clamp(lum * 1.6, 0.0, 1.0));

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

export function createLens(sceneApi) {
  const { composer, renderer, camera } = sceneApi;

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

  let focusWorld = null;
  const _fv = new THREE.Vector3();
  sceneApi.addAnimator('journey-lens', (t) => {
    pass.uniforms.uTime.value = t;
    pass.uniforms.uGrainSeed.value = (t * 97.13) % 1000;
    if (focusWorld) {
      _fv.copy(focusWorld).project(camera);
      pass.uniforms.uFocusUv.value.set((_fv.x + 1) / 2, (_fv.y + 1) / 2);
      pass.uniforms.uFocusOn.value = 1.0;
    } else {
      pass.uniforms.uFocusOn.value = 0.0;
    }
  });

  function setEnabled(on) {
    pass.enabled = !!on;
    document.body.classList.toggle('graded', !!on);
  }
  setEnabled(true);

  return {
    pass,
    setEnabled,
    /** 0..1 crossfade between the untouched hero frame and the graded one.
     *  Disables the pass entirely at 0 so it costs nothing outside its leg. */
    setAmount(a) {
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      pass.uniforms.uAmount.value = a;
      pass.enabled = a > 0.002;
    },
    get amount() { return pass.uniforms.uAmount.value; },
    get enabled() { return pass.enabled; },
    /** Warm halation bias toward the active exit (world position or null). */
    setFocusHint(pos) { focusWorld = pos ? pos.clone() : null; },
  };
}
