// Documentary optics — "filmed bioluminescence" finishing lens.
// EffectComposer: RenderPass -> UnrealBloomPass (selective, hot-core only) ->
// GradePass (halation + LUT-ish grade + grain + aberration + vignette) -> OutputPass.
//
// export: createOptics(THREE, renderer, scene, camera, opts)
//   opts = { tier, width, height, palette, reducedMotion }
//   -> { render(dt,time), setSize(w,h), setRaw(bool), setTier(tier), setFocusHint(pos|null) }

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- GradePass: halation + LUT-ish grade + grain + aberration + vignette ----
const GradePassShader = {
  name: 'GradePass',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: null }, // set via THREE.Vector2 at build time
    uHalationOn: { value: 1.0 },
    uAberrationOn: { value: 1.0 },
    uGrainScale: { value: 1.0 },
    uGrainSeed: { value: 0.0 },
    uFocusOn: { value: 0.0 },
    uFocusUv: { value: null }, // set via THREE.Vector2 at build time
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uHalationOn;
    uniform float uAberrationOn;
    uniform float uGrainScale;
    uniform float uGrainSeed;
    uniform float uFocusOn;
    uniform vec2 uFocusUv;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float luma(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float dist2 = dot(centered, centered);

      // --- 4. restrained radial chromatic aberration (zero in central ~40%) ---
      vec3 base;
      {
        float amt = uAberrationOn * smoothstep(0.08, 0.5, dist2);
        vec2 dir = (dist2 > 0.0000001) ? normalize(centered) : vec2(0.0);
        // ~1.5px max at corners, expressed in uv space against vertical resolution
        float maxPx = 1.5 / max(uResolution.y, 1.0);
        vec2 off = dir * amt * maxPx;
        float r = texture2D(tDiffuse, uv + off).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - off).b;
        base = vec3(r, g, b);
      }

      // --- 1. warm asymmetric halation around hot cores ---
      vec3 halation = vec3(0.0);
      if (uHalationOn > 0.5) {
        vec2 aspect = vec2(uResolution.y / max(uResolution.x, 1.0), 1.0);
        vec2 bias = vec2(0.002, 0.0); // slight +x asymmetry
        vec3 s0 = texture2D(tDiffuse, uv + vec2( 0.0035, 0.0    ) * aspect + bias).rgb;
        vec3 s1 = texture2D(tDiffuse, uv + vec2(-0.0035, 0.0015) * aspect + bias).rgb;
        vec3 s2 = texture2D(tDiffuse, uv + vec2( 0.0,    0.0035) * aspect + bias).rgb;
        vec3 s3 = texture2D(tDiffuse, uv + vec2( 0.0,   -0.0035) * aspect + bias).rgb;
        vec3 s4 = texture2D(tDiffuse, uv + vec2( 0.0025, 0.0025) * aspect + bias).rgb;
        vec3 s5 = texture2D(tDiffuse, uv + vec2(-0.0025,-0.0025) * aspect + bias).rgb;

        float e0 = max(luma(s0) - 0.6, 0.0);
        float e1 = max(luma(s1) - 0.6, 0.0);
        float e2 = max(luma(s2) - 0.6, 0.0);
        float e3 = max(luma(s3) - 0.6, 0.0);
        float e4 = max(luma(s4) - 0.6, 0.0);
        float e5 = max(luma(s5) - 0.6, 0.0);
        float excess = (e0 + e1 + e2 + e3 + e4 + e5) / 6.0;

        float focusBoost = 1.0;
        if (uFocusOn > 0.5) {
          float fd = distance(uv, uFocusUv);
          focusBoost += smoothstep(0.35, 0.0, fd) * 0.6;
        }

        halation = excess * vec3(1.0, 0.45, 0.18) * 0.9 * focusBoost;
      }

      vec3 color = base + halation;

      // --- 2. LUT-ish colour grade: lifted warm blacks, amber-led, ember roll-off ---
      vec3 lift = vec3(0.040, 0.031, 0.020);
      color = lift + color * (1.0 - lift);

      float lum = luma(color);
      vec3 gain = vec3(1.06, 1.03, 0.93); // gently boost R/G lows, restrain B
      color *= mix(vec3(1.0), gain, 1.0 - clamp(lum, 0.0, 1.0));

      vec3 emberTarget = vec3(1.0, 0.85, 0.6);
      float rolloff = smoothstep(0.55, 1.5, lum);
      vec3 softClipped = color / (1.0 + max(color - 0.9, vec3(0.0)));
      color = mix(color, softClipped, rolloff);
      vec3 emberSoft = emberTarget * max(lum, 0.001);
      emberSoft = emberSoft / (1.0 + max(emberSoft - 0.9, vec3(0.0)));
      color = mix(color, emberSoft, rolloff * 0.35);

      // --- 3. luminance-weighted fine animated grain ---
      float gLum = luma(color);
      float n = hash(uv * uResolution.xy + uGrainSeed) - 0.5;
      float suppress = mix(1.0, 0.15, smoothstep(0.4, 0.6, gLum));
      color += n * 0.055 * suppress * uGrainScale;

      // --- 5. soft vignette ---
      float vd = length(centered);
      float vig = smoothstep(0.35, 0.9, vd);
      color *= (1.0 - vig * 0.28);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `,
};

export function createOptics(THREE, renderer, scene, camera, opts) {
  const tierState = { tier: opts && opts.tier ? opts.tier : 1 };
  const reducedMotion = !!(opts && opts.reducedMotion);
  let width = (opts && opts.width) || 1;
  let height = (opts && opts.height) || 1;
  let raw = false;

  const composer = new EffectComposer(renderer);
  composer.renderToScreen = true;

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.75, 0.6, 0.55);
  composer.addPass(bloomPass);

  const gradePass = new ShaderPass(GradePassShader);
  gradePass.uniforms.uResolution.value = new THREE.Vector2(width, height);
  gradePass.uniforms.uFocusUv.value = new THREE.Vector2(0.5, 0.5);
  gradePass.renderToScreen = false;
  composer.addPass(gradePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  function applyTier(tier) {
    tierState.tier = tier;
    if (tier === 2) {
      bloomPass.strength = 0.55;
      bloomPass.radius = 0.4;
      gradePass.uniforms.uHalationOn.value = 0.0;
      gradePass.uniforms.uAberrationOn.value = 0.0;
      gradePass.uniforms.uGrainScale.value = 0.85;
    } else {
      bloomPass.strength = 0.75;
      bloomPass.radius = 0.6;
      gradePass.uniforms.uHalationOn.value = 1.0;
      gradePass.uniforms.uAberrationOn.value = 1.0;
      gradePass.uniforms.uGrainScale.value = 1.0;
    }
  }
  applyTier(tierState.tier);

  // reduced motion: freeze grain to a single static seed
  if (reducedMotion) {
    gradePass.uniforms.uGrainSeed.value = 13.7;
  }

  function setSize(w, h) {
    width = w;
    height = h;
    // composer caches the pixel ratio it was built with; re-sync so a tier
    // change (renderer.setPixelRatio) can't leave stale-sized render targets
    const pr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    gradePass.uniforms.uResolution.value.set(w * pr, h * pr);
  }

  function setRaw(bool) {
    raw = !!bool;
  }

  function setTier(tier) {
    applyTier(tier);
  }

  function setFocusHint(pos) {
    if (!pos) {
      gradePass.uniforms.uFocusOn.value = 0.0;
      return;
    }
    try {
      const v = new THREE.Vector3(pos.x, pos.y, pos.z).project(camera);
      // NDC [-1,1] -> uv [0,1], flip y (screen-space uv has y up in this pass, vUv from geometry uv)
      const u = (v.x + 1) / 2;
      const vv = (v.y + 1) / 2;
      gradePass.uniforms.uFocusUv.value.set(u, vv);
      gradePass.uniforms.uFocusOn.value = 1.0;
    } catch (e) {
      // safety first: never let focus-hint projection break rendering
      gradePass.uniforms.uFocusOn.value = 0.0;
    }
  }

  function render(dt, time) {
    if (raw) {
      renderer.render(scene, camera);
      return;
    }
    gradePass.uniforms.uTime.value = time;
    if (!reducedMotion) {
      gradePass.uniforms.uGrainSeed.value = time * 97.13;
    }
    composer.render(dt);
  }

  return { render, setSize, setRaw, setTier, setFocusHint };
}
