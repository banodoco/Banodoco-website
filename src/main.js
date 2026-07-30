import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMushroom, buildSoil, makeGlowSprite } from './mushroom.js';

const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping; // handled by OutputPass
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Low camera, mild telephoto — the reference is shot from just above soil
// level with a compressed perspective.
const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);
camera.position.set(0.10, 0.78, 12.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.02, 1.97, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 2.5;
controls.maxDistance = 22;
controls.update();

// ---------------------------------------------------------------------------
const uTime = { value: 0 };

const shroom = buildMushroom(uTime, renderer);
shroom.group.position.x = 0.06;
scene.add(shroom.group);

const soil = buildSoil(uTime);
scene.add(soil);

// Volumetric stand-ins around the two hot zones.
const gillHalo = makeGlowSprite(0xff8a20, 2.8, 3.4);
gillHalo.material.uniforms.uColor.value.multiplyScalar(0.030);
gillHalo.position.copy(shroom.gillCenter).add(new THREE.Vector3(0, -0.10, 0));
scene.add(gillHalo);

const baseHalo = makeGlowSprite(0xff7714, 1.5, 3.4);
baseHalo.material.uniforms.uColor.value.multiplyScalar(0.022);
baseHalo.position.set(-0.08, 0.10, 0);
scene.add(baseHalo);

// ---------------------------------------------------------------------------
// Post: bloom does the heavy lifting for the "lit from within" read.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.50, 0.80);
composer.addPass(bloom);

// Gentle vignette + a trace of chromatic warmth toward the edges, then film
// grain so the large black areas don't band.
const GradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime: uTime,
    uVignette: { value: 1.05 },
    uGrain: { value: 0.028 },
    uSat: { value: 1.30 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uSat;
    varying vec2 vUv;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      vec2 q = vUv - 0.5;
      float vig = 1.0 - uVignette * dot(q, q) * 1.15;
      c *= clamp(vig, 0.0, 1.0);
      float g = h21(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      c += g * uGrain * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.6, length(c))));
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `,
});
composer.addPass(GradePass);

const outputPass = new OutputPass();
// Neutral (Khronos PBR) holds hue in the highlights; ACES pushes
// saturated orange toward cream.
outputPass.toneMapping = THREE.NeutralToneMapping;
composer.addPass(outputPass);
renderer.toneMappingExposure = 1.0;

// ---------------------------------------------------------------------------
let lastW = 0, lastH = 0;
function resize() {
  const w = Math.max(1, Math.round(stage.clientWidth));
  const h = Math.max(1, Math.round(stage.clientHeight));
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
// The stage is sized by aspect-ratio + vh/vw, so its box can settle after the
// first script tick. Observing it is more reliable than a one-shot measure.
new ResizeObserver(resize).observe(stage);
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
let autoDrift = true;
const home = camera.position.clone();
addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    camera.position.copy(home);
    controls.target.set(-0.02, 1.97, 0);
    autoDrift = true;
  }
  if (e.key === 'h' || e.key === 'H') {
    document.getElementById('hud').classList.toggle('hidden');
  }
});
controls.addEventListener('start', () => { autoDrift = false; });

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  uTime.value = t;

  if (autoDrift) {
    // Barely-there parallax so the render feels alive without losing the
    // reference framing.
    camera.position.x = home.x + Math.sin(t * 0.11) * 0.30;
    camera.position.y = home.y + Math.sin(t * 0.077 + 1.4) * 0.10;
    camera.lookAt(controls.target);
  }

  // Slow respiration through the whole fruiting body.
  const breath = 1.0 + Math.sin(t * 0.42) * 0.006;
  shroom.capGroup.scale.set(breath, 1.0 + Math.sin(t * 0.42 + 0.8) * 0.004, breath);
  shroom.capGroup.rotation.y = Math.sin(t * 0.05) * 0.02;

  gillHalo.quaternion.copy(camera.quaternion);
  baseHalo.quaternion.copy(camera.quaternion);

  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}
tick();

// Expose for live tuning from the console while iterating.
globalThis.SHROOM = { scene, camera, controls, bloom, renderer, shroom, GradePass, composer };
