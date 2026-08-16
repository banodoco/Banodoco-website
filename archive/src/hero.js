import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import {
  Field, buildMushroom, buildNetwork, buildRootLinks, buildSpores,
  groundHeight, MAX_PULSES, CAP_Y,
} from './netshroom.js';

const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
renderer.toneMapping = THREE.NoToneMapping;   // OutputPass handles it
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.082);

// The hero sits right-of-centre so the headline owns the left half.
const HERO_OFFSET = -1.05;
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 90);
const CAM_HOME = new THREE.Vector3(HERO_OFFSET - 0.10, 0.66, 5.45);
const CAM_TARGET = new THREE.Vector3(HERO_OFFSET, 0.90, 0);
camera.position.copy(CAM_HOME);
camera.lookAt(CAM_TARGET);

// ---------------------------------------------------------------------------
const field = new Field();

const network = buildNetwork(field, { radius: 15, minDist: 0.125, growth: 3.2 });
scene.add(network.group);

const shroom = buildMushroom(field);
shroom.group.scale.setScalar(1.24);
scene.add(shroom.group);

scene.add(buildRootLinks(field, network, shroom.base, { count: 30, reach: 2.2, seed: 8 }));
scene.add(buildRootLinks(field, network, shroom.base, { count: 16, minReach: 4.0, reach: 9.5, seed: 21 }));

const spores = buildSpores(field);
scene.add(spores);

// ---------------------------------------------------------------------------
// Post
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.90, 0.24, 0.70);
composer.addPass(bloom);

const grade = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.85 },
    uGrain: { value: 0.030 },
    uSat: { value: 1.16 },
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
      c *= clamp(1.0 - uVignette * dot(q, q) * 1.25, 0.0, 1.0);
      // Grain only in the shadows, so the huge black areas never band.
      float g = h21(vUv * 1024.0 + fract(uTime) * 91.7) - 0.5;
      c += g * uGrain * (0.30 + 0.70 * (1.0 - smoothstep(0.0, 0.5, length(c))));
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }
  `,
});
composer.addPass(grade);

const outputPass = new OutputPass();
outputPass.toneMapping = THREE.NeutralToneMapping;   // holds amber hue in highlights
composer.addPass(outputPass);

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

  // On narrow screens the copy stacks above the art, so recentre the hero and
  // pull the camera back rather than cropping the mushroom out of frame.
  const narrow = w / h < 1.05;
  const off = narrow ? 0 : HERO_OFFSET;
  CAM_TARGET.set(off, narrow ? 1.00 : 0.90, 0);
  CAM_HOME.set(off - (narrow ? 0 : 0.10), narrow ? 0.80 : 0.66, narrow ? 6.6 : 5.45);
  camera.updateProjectionMatrix();

  const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
  field.set('uPxPerUnit', 0.5 * buf.y / Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5));
  for (const m of field.materials) {
    if (m.uniforms.uResolution) m.uniforms.uResolution.value.set(buf.x, buf.y);
  }
}
new ResizeObserver(resize).observe(stage);
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------------
// Interaction: the cursor drags a pool of light through the mycelium, and a
// click sends a pulse racing out through the network.
const pulseOrigins = Array.from({ length: MAX_PULSES }, () => new THREE.Vector3());
const pulseAges = new Float32Array(MAX_PULSES).fill(-1);
let nextPulse = 0;

function emitPulse(x, z) {
  pulseOrigins[nextPulse].set(x, 0, z);
  pulseAges[nextPulse] = 0;
  nextPulse = (nextPulse + 1) % MAX_PULSES;
}

const pointer = new THREE.Vector2(-10, -10);
const parallax = new THREE.Vector2(0, 0);
const parallaxTarget = new THREE.Vector2(0, 0);
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const cursorWorld = new THREE.Vector3(0, -99, 0);
let cursorStrength = 0;
let pointerInside = false;

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  parallaxTarget.set(pointer.x, pointer.y);
  pointerInside = true;
}, { passive: true });

addEventListener('pointerleave', () => { pointerInside = false; });

addEventListener('pointerdown', () => {
  if (cursorWorld.y > -50) emitPulse(cursorWorld.x, cursorWorld.z);
});

// A slow heartbeat from the mushroom itself, so the piece is alive when idle.
let nextIdle = 2.5;

// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let reveal = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  // Fade the whole organism up on load.
  reveal = Math.min(1, reveal + dt * 0.55);
  const eased = reveal * reveal * (3 - 2 * reveal);
  field.set('uReveal', eased);
  shroom.shellMat.uniforms.uReveal.value = eased;

  // Where is the cursor on the soil?
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.ray.intersectPlane(groundPlane, cursorWorld);
  if (hit) cursorWorld.y = groundHeight(cursorWorld.x, cursorWorld.z);
  else cursorWorld.set(0, -99, 0);
  cursorStrength += ((pointerInside && hit ? 1 : 0) - cursorStrength) * Math.min(1, dt * 5);

  // Idle heartbeat radiating from the stem base.
  if (t > nextIdle) {
    emitPulse(shroom.base.x, shroom.base.z);
    nextIdle = t + 5.5 + Math.random() * 3.0;
  }
  for (let i = 0; i < MAX_PULSES; i++) {
    if (pulseAges[i] >= 0) {
      pulseAges[i] += dt;
      if (pulseAges[i] > 9) pulseAges[i] = -1;
    }
  }

  field.set('uTime', t);
  field.set('uCursor', cursorWorld);
  field.set('uCursorStrength', cursorStrength * 0.9);
  field.setPulses(pulseOrigins, pulseAges);
  grade.uniforms.uTime.value = t;
  shroom.shellMat.uniforms.uTime.value = t;

  // Camera: a breath of drift plus a little pointer parallax. Never enough to
  // break the composition the copy is laid out against.
  parallax.lerp(pointerInside ? parallaxTarget : new THREE.Vector2(0, 0), Math.min(1, dt * 1.6));
  camera.position.set(
    CAM_HOME.x + Math.sin(t * 0.13) * 0.10 + parallax.x * 0.22,
    CAM_HOME.y + Math.sin(t * 0.09 + 1.3) * 0.045 + parallax.y * 0.10,
    CAM_HOME.z
  );
  camera.lookAt(CAM_TARGET.x + parallax.x * 0.05, CAM_TARGET.y + parallax.y * 0.03, 0);

  if (globalThis.HERO_FREEZE) { composer.render(); requestAnimationFrame(tick); return; }

  // Very slow rotation so the cap's mesh keeps catching new angles.
  shroom.group.rotation.y = Math.sin(t * 0.045) * 0.10;
  shroom.capGroup.position.y = CAP_Y + Math.sin(t * 0.4) * 0.006;

  composer.render();
  requestAnimationFrame(tick);
}
tick();

// Reveal the copy once the first frame is on screen.
requestAnimationFrame(() => document.body.classList.add('ready'));

globalThis.HERO = { scene, camera, renderer, composer, bloom, grade, field, shroom, network };
