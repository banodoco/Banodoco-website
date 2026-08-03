// Spike B — documentary optics, adapted from donor journey/core/optics.js
// (GradePass source harvested per adr-d2-harvest-map.md; this spike owns its
// own composer because it is its own underground scene, not the hero page).
// EffectComposer: RenderPass -> UnrealBloomPass -> OutputPass -> GradePass.
// Raw-vs-finished toggle is wired to [g] by main.js from the first build.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const GradePassShader = {
  name: 'GradePass',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: null },
    uHalationOn: { value: 1.0 },
    uAberrationOn: { value: 1.0 },
    uGrainScale: { value: 1.0 },
    uGrainSeed: { value: 0.0 },
    uFocusOn: { value: 0.0 },
    uFocusUv: { value: null },
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

      // restrained radial chromatic aberration (zero in central ~40%)
      vec3 base;
      {
        float amt = uAberrationOn * smoothstep(0.14, 0.55, dist2);
        vec2 dir = (dist2 > 0.0000001) ? normalize(centered) : vec2(0.0);
        float maxPx = 1.0 / max(uResolution.y, 1.0);
        vec2 off = dir * amt * maxPx;
        float r = texture2D(tDiffuse, uv + off).r;
        float g = texture2D(tDiffuse, uv).g;
        float b = texture2D(tDiffuse, uv - off).b;
        base = vec3(r, g, b);
      }

      // warm asymmetric halation around hot cores
      vec3 halation = vec3(0.0);
      if (uHalationOn > 0.5) {
        vec2 aspect = vec2(uResolution.y / max(uResolution.x, 1.0), 1.0);
        vec2 bias = vec2(0.002, 0.0);
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

      // LUT-ish colour grade: lifted warm blacks, amber-led, ember roll-off
      vec3 lift = vec3(0.028, 0.021, 0.013);
      color = lift + color * (1.0 - lift);

      float lum = luma(color);
      vec3 gain = vec3(1.06, 1.03, 0.93);
      color *= mix(vec3(1.0), gain, 1.0 - clamp(lum, 0.0, 1.0));

      vec3 emberTarget = vec3(1.0, 0.85, 0.6);
      float rolloff = smoothstep(0.40, 1.10, lum);
      vec3 softClipped = color / (1.0 + max(color - 0.9, vec3(0.0)));
      color = mix(color, softClipped, rolloff);
      vec3 emberSoft = emberTarget * max(lum, 0.001);
      emberSoft = emberSoft / (1.0 + max(emberSoft - 0.9, vec3(0.0)));
      color = mix(color, emberSoft, rolloff * 0.35);

      // luminance-weighted fine animated grain
      float gLum = luma(color);
      float n = hash(uv * uResolution.xy + uGrainSeed) - 0.5;
      float suppress = mix(1.0, 0.15, smoothstep(0.4, 0.6, gLum));
      color += n * 0.055 * suppress * uGrainScale;

      // soft vignette
      float vd = length(centered);
      float vig = smoothstep(0.35, 0.9, vd);
      color *= (1.0 - vig * 0.28);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `,
};

export function createOptics(renderer, scene, camera, opts = {}) {
  const reducedMotion = !!opts.reducedMotion;
  let width = opts.width || 1;
  let height = opts.height || 1;
  let raw = false;

  const composer = new EffectComposer(renderer);
  composer.renderToScreen = true;

  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.4, 0.5);
  composer.addPass(bloomPass);

  // NO OutputPass: this scene is drawn entirely with raw ShaderMaterials,
  // which bypass three's automatic sRGB encoding when rendered direct.
  // The donor opacities (and the approved reference darkness) are calibrated
  // to that un-encoded look — encoding the linear additive SUM lifts the
  // whole field to an olive wash. The grade therefore runs on the same
  // display-space image the raw path shows, which is exactly the donor note:
  // "the grade operates in display space".
  const gradePass = new ShaderPass(GradePassShader);
  gradePass.uniforms.uResolution.value = new THREE.Vector2(width, height);
  gradePass.uniforms.uFocusUv.value = new THREE.Vector2(0.5, 0.5);
  composer.addPass(gradePass);

  if (reducedMotion) gradePass.uniforms.uGrainSeed.value = 13.7;

  let focusWorld = null;
  const _fv = new THREE.Vector3();

  function setSize(w, h) {
    width = w; height = h;
    const pr = renderer.getPixelRatio ? renderer.getPixelRatio() : 1;
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    gradePass.uniforms.uResolution.value.set(w * pr, h * pr);
  }

  return {
    render(dt, time) {
      if (raw) { renderer.render(scene, camera); return; }
      gradePass.uniforms.uTime.value = time;
      if (!reducedMotion) gradePass.uniforms.uGrainSeed.value = time * 97.13;
      if (focusWorld) {
        _fv.copy(focusWorld).project(camera);
        gradePass.uniforms.uFocusUv.value.set((_fv.x + 1) / 2, (_fv.y + 1) / 2);
        gradePass.uniforms.uFocusOn.value = 1.0;
      } else {
        gradePass.uniforms.uFocusOn.value = 0.0;
      }
      composer.render(dt);
    },
    setSize,
    setRaw(b) { raw = !!b; },
    get raw() { return raw; },
    setFocusHint(pos) {
      focusWorld = pos ? new THREE.Vector3(pos.x, pos.y, pos.z) : null;
    },
    // spike debug access (pass isolation from the console)
    _debug: { composer, bloomPass, gradePass },
  };
}
