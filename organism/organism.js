import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { createSpores } from './spores.js';
import { setupIntro } from './intro.js';
import { createHighlights, registerTrackers } from './furniture.js';

// =====================================================================
// TABLE OF CONTENTS (order as they appear below; M2 split the marked
// sections into sibling modules — they are still CALLED at their original
// positions, so construction order, the deterministic RNG stream, and
// animator registration order are unchanged)
//   1. RNG / palette utils
//   2. Engine            — scene, camera, renderer, composer, controls
//   3. Builders           — glow texture, makePoints, makeLines
//   4. Cap                — form language, mushroom group, cap surface, rim
//   5. Occlusion shells   — opaque shells that occlude far-side wires
//   6. Gills              — dense radial filaments under the cap
//   7. Stem                — fibrous tapering mesh
//   8. Ground network     — mycelium web, moss, roots, ribbons
//   9. Ambient motes      — faint dust in the air volume
//  10. Spore cloud        — ./spores.js (creation, drift, shed, driver seat)
//  10b. Breeze            — one air current: sways the body, carries the spores
//  10c. Tap               — a poke tips the stalk with a local shiver of
//                           light; a floor tap pulses the mycelium web
//  11. Region highlights  — ./furniture.js (with the tracker projection)
//  12. Frame loop         — animator registry + render loop
//      Entry choreography — ./intro.js (draw windows, shells, 'intro-draw')
//  13. Public API         — the object returned by createScene()
// =====================================================================

/**
 * Build the glowing mycelium-mushroom scene: engine, mushroom, stem, ground
 * network, motes, and spores, plus a small public API for driving it (see
 * the returned object's JSDoc at the bottom of this file).
 *
 * @param {object} [opts]
 * @param {number} [opts.panX=0]         World-space X the camera/target are offset by (frames the specimen off-center).
 * @param {HTMLElement|null} [opts.container=null] Element the renderer's canvas is appended to (defaults to document.body).
 * @param {number} [opts.camY=2.05]      Initial camera height.
 * @param {number} [opts.camZ=8.8]       Initial camera distance from the origin.
 * @param {number} [opts.targetY=2.5]    Initial OrbitControls target height (what the camera looks at).
 * @param {number} [opts.tiltX=-0.05]    Cap/stem group tilt about X (frames the gill fan).
 * @param {number} [opts.camAzimuth=0]   Camera orbit angle in degrees, for a 3/4 view.
 * @param {number} [opts.leanZ=-0.03]    Cap/stem group lean about Z.
 * @param {?{x:number,z:number,rx:number,rz:number,strength:number}} [opts.quiet=null]
 *        Elliptical world-space zone where the ground web is dimmed, so UI text over it stays readable.
 * @param {number} [opts.bg=0x000000]    Background/fog color.
 * @param {number} [opts.fov=38]         Initial camera vertical field of view.
 * @param {Array<{pos:[number,number,number], el:HTMLElement, sway?:boolean}>} [opts.trackers=[]]
 *        HUD annotations: each frame the world point is projected to screen space and `el` gets
 *        `translate(sx, sy)`, so annotations stay glued to the mushroom through orbit/zoom.
 * @param {number} [opts.intro=0]        Seconds for the entry reveal: the organism grows out of the
 *        soil, bottom to top (web -> stalk -> cap -> plume). 0 skips it — the scene starts complete.
 * @returns {object} See the public API JSDoc near the bottom of this file.
 */
export function createScene({ panX = 0, container = null,
                              camY = 2.05, camZ = 8.8, targetY = 2.5,
                              tiltX = -0.05, camAzimuth = 0, leanZ = -0.03,
                              quiet = null, bg = 0x000000,
                              fov = 38, trackers = [], intro = 0 } = {}) {

// =====================================================================
// 1. RNG / PALETTE UTILS
// =====================================================================
// ---------- deterministic RNG ----------
let seed = 1337;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function randRange(a, b) { return a + (b - a) * rand(); }
function gauss() { return (rand() + rand() + rand() + rand() - 2) / 2; }

// ---------- palette: deep orange -> amber -> hot near-white ----------
const C_DARK  = new THREE.Color(0x421c05);
const C_MID   = new THREE.Color(0xb96b1c);
const C_AMBER = new THREE.Color(0xf5a63c);
const C_HOT   = new THREE.Color(0xffdfae);
const C_WHITE = new THREE.Color(0xfff3e0);
function heat(t, out) {
  t = Math.max(0, Math.min(1, t));
  const c = out || new THREE.Color();
  if (t < 0.35)      c.lerpColors(C_DARK, C_MID,  t / 0.35);
  else if (t < 0.65) c.lerpColors(C_MID, C_AMBER, (t - 0.35) / 0.3);
  else if (t < 0.88) c.lerpColors(C_AMBER, C_HOT, (t - 0.65) / 0.23);
  else               c.lerpColors(C_HOT, C_WHITE, (t - 0.88) / 0.12);
  return c;
}

// =====================================================================
// 2. ENGINE — scene, camera, renderer, composer, controls
// =====================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(bg);
// Depth attenuation: glowing geometry dims with distance so near/far reads
// unambiguously (the far rim, far gills, and deep floor recede properly).
const FOG_NEAR = 7.0, FOG_FAR = 20;
scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);

const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 100);
{
  const az = camAzimuth * Math.PI / 180;
  camera.position.set(0.15 + panX + Math.sin(az) * camZ, camY, Math.cos(az) * camZ);
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
(container || document.body).appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(panX, targetY, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.5;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.58;
controls.update();

// EffectComposer renders offscreen, which bypasses the canvas's own antialiasing
// entirely — so the target has to be multisampled itself. Without this the fine
// gill lines crawl across the pixel grid as the mushroom sways.
const _dbSize = renderer.getDrawingBufferSize(new THREE.Vector2());
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(
  // 4x; measured, 8x buys no further smoothness here and costs twice the fill
  _dbSize.width, _dbSize.height, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.45, 0.1);
composer.addPass(bloom);

// Temporal accumulation (TAA). MSAA and the coverage fade can't fully stop
// near-parallel lines a couple of pixels apart from beating against the pixel
// grid (moiré) — and the sway makes the fringes crawl. So the projection is
// jittered by a subpixel offset each frame and the frames are averaged: the
// moiré pattern lands somewhere different every frame and integrates away,
// exactly like supersampling spread over time. Blending happens here in
// linear HDR space, before the OutputPass tonemaps.
class TemporalAccumulatePass extends Pass {
  constructor(width, height) {
    super();
    this.history = new THREE.WebGLRenderTarget(width, height,
      { type: THREE.HalfFloatType, depthBuffer: false });
    this.validHistory = false;
    this.weight = 0; // share of history in the blend; driven per-frame below
    const vsh = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    this.blendMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tHistory: { value: null }, uW: { value: 0 } },
      vertexShader: vsh,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform sampler2D tHistory; uniform float uW;
        varying vec2 vUv;
        void main() { gl_FragColor = mix(texture2D(tDiffuse, vUv), texture2D(tHistory, vUv), uW); }`,
      depthTest: false, depthWrite: false,
    });
    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: vsh,
      fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.blendMat);
  }
  render(renderer, writeBuffer, readBuffer) {
    this.blendMat.uniforms.tDiffuse.value = readBuffer.texture;
    this.blendMat.uniforms.tHistory.value = this.history.texture;
    this.blendMat.uniforms.uW.value = this.validHistory ? this.weight : 0;
    this.quad.material = this.blendMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
    // the blended frame becomes next frame's history
    this.copyMat.uniforms.tDiffuse.value = writeBuffer.texture;
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.history);
    this.quad.render(renderer);
    this.validHistory = true;
  }
  setSize(width, height) {
    this.history.setSize(width, height);
    this.validHistory = false; // stale-size history would smear a resize
  }
  dispose() { this.history.dispose(); this.quad.dispose(); }
}
const taaPass = new TemporalAccumulatePass(_dbSize.width, _dbSize.height);
// ?notaa=1 disables the accumulation, for A/B measuring it
if (location.search.includes('notaa')) taaPass.enabled = false;
composer.addPass(taaPass);
composer.addPass(new OutputPass());

// Halton(2,3) offsets: a low-discrepancy walk over the pixel, so even a short
// history covers the pixel area evenly instead of clumping like random would
function _halton(i, b) {
  let f = 1, r = 0;
  while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); }
  return r;
}
const _jitterSeq = Array.from({ length: 8 }, (_, i) => [_halton(i + 1, 2) - 0.5, _halton(i + 1, 3) - 0.5]);
let _jitterI = 0;
const _taaDb = new THREE.Vector2();
const _taaPrevPos = new THREE.Vector3();
const _taaPrevQuat = new THREE.Quaternion();
function taaFrame() {
  // rebuild the clean projection, then push it off-centre by a subpixel step
  camera.updateProjectionMatrix();
  const db = renderer.getDrawingBufferSize(_taaDb);
  const j = _jitterSeq[_jitterI++ % _jitterSeq.length];
  // ±0.4px, not the full ±0.5: accumulated jitter is a blur kernel over the
  // whole image, and the last tenth of a pixel buys almost no extra moiré
  // suppression while visibly softening static detail
  camera.projectionMatrix.elements[8] += j[0] * 1.6 / db.width;
  camera.projectionMatrix.elements[9] += j[1] * 1.6 / db.height;
  // History weight backs off with CAMERA motion so orbit drags stay crisp
  // instead of smearing. The sway is object motion and keeps full weight —
  // its couple-px-per-frame drift reads as gentle motion blur, not ghosting.
  const dPos = camera.position.distanceTo(_taaPrevPos);
  const dAng = _taaPrevQuat.angleTo(camera.quaternion);
  const motion = dPos + dAng * camera.position.distanceTo(controls.target);
  // ~2.5 frames of history: the lightest touch that still holds the moiré
  // down, keeping the sway's motion trail well under a pixel
  taaPass.weight = 0.6 * Math.exp(-motion * 150);
  _taaPrevPos.copy(camera.position);
  _taaPrevQuat.copy(camera.quaternion);
}

// =====================================================================
// 3. BUILDERS — glow texture, makePoints, makeLines
// =====================================================================
// ---------- glow sprite for points ----------
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();

// ---------- entry draw: the scene inks itself in, stroke by stroke ---------
// Geometry buffers are filled in construction order — thread by thread, fibre
// by fibre — so a per-vertex `aDraw` (0..1 through the buffer) IS the drawing
// order. One master progress (drawU) sweeps 0..1; each object claims a window
// [uWin.x, uWin.y] of it and strokes itself in during that slice, with a hot
// ember riding the stroke tip while it draws. Parked at 2, everything is
// fully drawn and the ember term is switched off.
const drawU = { value: 2 };
const DRAW_GLSL = `
      uniform float uProg;
      uniform vec2 uWin;
      uniform float uClampY;
      attribute float aDraw;
      varying float vDraw;
      float drawAt(vec3 p) {
        float dp = clamp((uProg - uWin.x) / (uWin.y - uWin.x), 0.0, 1.0);
        float head = smoothstep(0.0, 0.012, dp - aDraw);
        float tip = smoothstep(0.03, 0.0, abs(dp - aDraw)) * smoothstep(0.0, 0.01, dp) * (1.0 - step(0.999, dp));
        // intro-only lid: strokes stop below uClampY while drawing (the artist
        // doesn't ink what the cap will bury); parked (uProg=2) it lifts, and
        // by then the shells occlude the joint, so nothing visibly changes
        vec4 wp = modelMatrix * vec4(p, 1.0);
        float lid = 1.0 - smoothstep(uClampY - 0.2, uClampY, wp.y) * (1.0 - smoothstep(1.05, 1.6, uProg));
        return (head + tip * 1.7) * lid;
      }
`;
function drawAttr(geo, n) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = i / (n - 1);
  geo.setAttribute('aDraw', new THREE.BufferAttribute(a, 1));
}

// ---------- tap pulse: one radial wave shared by every glowing material ------
// A tap plants uPulseC at the touched point and rewinds uPulseT to zero;
// every strand and mote then answers by distance: an expanding ring that
// BROADENS and dims as it travels (diffusion, not a hard wavefront), with a
// range falloff so only the tapped neighbourhood responds. uPulseP shapes
// the wave per tap: a floor tap sends a far-travelling swell through the
// web; a tap on the mushroom itself makes a tiny local shiver of the same
// family. Parked at a large uPulseT the ring has long since died — the
// standing cost is a few vertex ops.
const pulseC = { value: new THREE.Vector3(0, 0, 0) };
const pulseT = { value: 1e3 };
const pulseP = { value: new THREE.Vector3(2.6, 0.33, 1.4) };
const PULSE_GLSL = `
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
// Handle for setting an object's draw window whether its material is a
// ShaderMaterial (uniforms live on the material) or a built-in one (uniforms
// are grafted at compile time, so the shared object lives in userData).
function drawWin(obj) {
  const m = obj.material;
  return (m.uniforms && m.uniforms.uWin) || m.userData.uWin;
}

// Built-in materials (the plain-line webs, the glowing root ribbons) get the
// same stroke-in fade injected into their stock shaders.
function injectDraw(mat) {
  const uWin = { value: new THREE.Vector2(-2, -1) };
  mat.userData.uWin = uWin;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uProg = drawU;
    sh.uniforms.uWin = uWin;
    sh.uniforms.uPulseC = pulseC;
    sh.uniforms.uPulseT = pulseT;
    sh.uniforms.uPulseP = pulseP;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>',
        '#include <common>\n' +
        'uniform float uProg;\nuniform vec2 uWin;\n' +
        'attribute float aDraw;\nvarying float vDraw;\n' +
        PULSE_GLSL + 'varying float vPulse;')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        '{ float dp = clamp((uProg - uWin.x) / (uWin.y - uWin.x), 0.0, 1.0);\n' +
        '  float head = smoothstep(0.0, 0.012, dp - aDraw);\n' +
        '  float tip = smoothstep(0.03, 0.0, abs(dp - aDraw)) * smoothstep(0.0, 0.01, dp) * (1.0 - step(0.999, dp));\n' +
        '  vDraw = head + tip * 1.7;\n' +
        '  vPulse = pulseAt((modelMatrix * vec4(transformed, 1.0)).xyz); }');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDraw;\nvarying float vPulse;')
      .replace('#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= vDraw * vPulse;');
  };
  mat.customProgramCacheKey = () => 'draw-injected';
}

// ---------- point cloud builder (per-point size + color, additive) ----------
function makePoints(positions, colors, sizes, opacity = 1.0, dists = null) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('psize', new THREE.Float32BufferAttribute(sizes, 1));
  geo.setAttribute('pseed', new THREE.Float32BufferAttribute(
    sizes.map(() => rand() * Math.PI * 2), 1));
  geo.setAttribute('pdist', new THREE.Float32BufferAttribute(
    dists && dists.length ? dists : sizes.map(() => 0), 1));
  drawAttr(geo, sizes.length);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: glowTex },
      time: { value: 0 },
      uOpacity: { value: opacity },
      uProg: drawU,
      uWin: { value: new THREE.Vector2(-2, -1) },
      uClampY: { value: 1e3 },
      uPulseC: pulseC,
      uPulseT: pulseT,
      uPulseP: pulseP,
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      #define MIN_PT 1.7
      attribute float psize;
      attribute float pseed;
      attribute float pdist;
      varying vec3 vColor;
      varying float vShrink;
      varying float vTw;
      varying float vFogDepth;
      varying float vBlur;
      uniform float time;
      ${DRAW_GLSL}
      ${PULSE_GLSL}
      void main() {
        vColor = color;
        vDraw = drawAt(position);
        vTw = 0.85 + 0.15 * sin(time * 1.4 + pseed * 7.0);
        // energy pulses travel outward along the network from the mushroom
        if (pdist > 0.01) {
          float w = sin(time * 1.25 - pdist * 0.85 + pseed * 0.3);
          vTw *= 1.0 + 0.45 * max(0.0, w) * max(0.0, w);
        }
        // a root tap answers here too: motes glint as the wave passes them
        vTw *= pulseAt((modelMatrix * vec4(position, 1.0)).xyz);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        // fake depth of field: outside the focal band, points grow soft and dim
        vBlur = clamp(abs(vFogDepth - 9.5) / 8.0, 0.0, 1.0);
        // A sprite smaller than a pixel cannot be drawn faithfully — it just
        // blinks on and off as it crosses the sample grid, which is what makes
        // a drifting, swaying particle field sparkle. Hold every sprite at a
        // floor size and dim it by the area it lost, so the light it carries
        // stays the same while the flicker goes away.
        float sz = psize * vTw * (300.0 / -mv.z) * (1.0 + 1.35 * vBlur);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float uOpacity;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vColor;
      varying float vTw;
      varying float vFogDepth;
      varying float vBlur;
      varying float vShrink;
      varying float vDraw;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vTw * uOpacity * fogF * vShrink * (1.0 - 0.55 * vBlur) * vDraw, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  return new THREE.Points(geo, mat);
}

// ---------- line builder ----------
function makeLines(positions, colors, opacity = 1.0) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  drawAttr(geo, positions.length / 3);
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  injectDraw(mat);
  return new THREE.LineSegments(geo, mat);
}

// ---------- dense line builder: coverage-faded so packed lines can't flicker --
// Where a family of parallel lines (gills, stem fibres, cap mesh) turns edge-on,
// neighbours pack closer than one pixel and no amount of MSAA can resolve them —
// they beat against the pixel grid and crawl. Each vertex therefore carries
// `tang`, the offset to the SAME point on the neighbouring line, and the shader
// dims the line by how far apart the two land on screen. Below a pixel of
// spacing each line contributes proportionally less, so N lines sharing a pixel
// still sum to the brightness of one — steady instead of sparkling.
const _denseMats = [];
function makeDenseLines(positions, colors, tangents, opacity = 1.0, tangents2 = null) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('tang', new THREE.Float32BufferAttribute(tangents, 3));
  geo.setAttribute('tang2', new THREE.Float32BufferAttribute(tangents2 || tangents, 3));
  drawAttr(geo, positions.length / 3);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: opacity },
      uRes: { value: renderer.getDrawingBufferSize(new THREE.Vector2()) },
      // ?nofade=1 disables the coverage fade, for A/B measuring it
      uFadeOn: { value: location.search.includes('nofade') ? 0 : 1 },
      uProg: drawU,
      uWin: { value: new THREE.Vector2(-2, -1) },
      uClampY: { value: 1e3 },
      uPulseC: pulseC,
      uPulseT: pulseT,
      uPulseP: pulseP,
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      attribute vec3 tang;
      attribute vec3 tang2;
      uniform vec2 uRes;
      uniform float uFadeOn;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vFade;
      ${DRAW_GLSL}
      ${PULSE_GLSL}
      void main() {
        vColor = color * pulseAt((modelMatrix * vec4(position, 1.0)).xyz);
        vDraw = drawAt(position);
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        vec4 c0 = projectionMatrix * mv;
        vec2 s0 = c0.xy / max(abs(c0.w), 1e-4) * uRes * 0.5;
        vec4 c1 = projectionMatrix * (modelViewMatrix * vec4(position + tang, 1.0));
        vec4 c2 = projectionMatrix * (modelViewMatrix * vec4(position + tang2, 1.0));
        vec2 s1 = c1.xy / max(abs(c1.w), 1e-4) * uRes * 0.5;
        vec2 s2 = c2.xy / max(abs(c2.w), 1e-4) * uRes * 0.5;
        // the tighter of the two neighbour families is what decides coverage
        float gap = min(length(s1 - s0), length(s2 - s0));
        // saturate smoothly rather than clamping at one pixel: lines spaced
        // 1–3px still beat against the pixel grid (MSAA can't resolve a
        // quasi-periodic family there), so the fade must tail off through
        // that band — and the old clamp's kink at exactly 1px made the
        // brightness pop as sway carried a line family across it
        vFade = mix(1.0, 1.0 - exp(-gap), uFadeOn);
        gl_Position = c0;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vFade;
      varying float vDraw;
      void main() {
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * uOpacity * fogF * vFade * vDraw, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  _denseMats.push(mat);
  return new THREE.LineSegments(geo, mat);
}

const tmpC = new THREE.Color();
function pushC(arr, t) { heat(t, tmpC); arr.push(tmpC.r, tmpC.g, tmpC.b); }

// ---- shared context for the extracted modules (merge step M2) ----
// Before M2 the whole organism was one closure; spores.js / intro.js /
// furniture.js closed over these very references. `ctx` hands them the same
// objects, so behaviour is unchanged. Function declarations hoist, so
// forward references (capUnderPt §4, groundY §8, breeze §10b) are safe here;
// TDZ-bound consts (groups, animators) are assigned onto ctx right after
// their declarations below. Mutable per-frame sway state lives ON ctx: the
// 'breeze' animator writes swayCos/swaySin, 'spore-drift' and shedSpores
// read them — same frame, breeze first (registration order, load-bearing).
const ctx = {
  rand, randRange, gauss, heat, pushC,
  makePoints, makeLines, makeDenseLines,
  drawU, drawWin,
  capUnderPt, groundY, breeze,
  // cap form language the spore system's braid modes are authored against:
  // the organism's OWN functions — the journey's anatomy.js mirror exists
  // for chapter geometry, but spore behaviour reads the one truth here.
  // (rimRad/rimYoff are hoisted function declarations; the TDZ-bound consts
  // LEAN_DIR/CAP_Y are assigned onto ctx right after §4 declares them.)
  rimRad, rimYoff, LEAN_DIR: 0, CAP_Y: 0,
  scene, camera, renderer, controls,
  tiltX, leanZ, trackers, intro,
  swayCos: 1, swaySin: 0,
  // assigned when they come into existence below:
  mushroom: null, stemGroup: null, groundGroup: null, swayGroup: null,
  sporePts: null, animators: null, addAnimator: null,
};

// =====================================================================
// 4. CAP — organic, asymmetric mushroom cap (form language, group, beads)
// =====================================================================
const CAP_Y = 3.15;      // nominal rim height
const CAP_R = 2.35;      // nominal rim radius
const CAP_H = 1.22;      // dome height above rim
const STEM_TOP = 3.9; // extends into the cap interior so the joint is buried, not butted

// Cap form language — one deliberate gesture, not uniform noise:
// the cap leans and droops toward the front-left, lifts at the back-right
// (exposing the gills there), the margin rolls downward like a real cap
// edge, and there is exactly one sharper fold accent. Every part of the
// cap (wires, gills, rim, occlusion shell) reads these same functions,
// so the asymmetry stays coherent.
const LEAN_DIR = 3.6; // azimuth the cap droops toward (back-left, so the front fan stays visible)
function angWrap(d) { return Math.atan2(Math.sin(d), Math.cos(d)); }
function rimRad(a) {
  const lean = Math.cos(a - LEAN_DIR);
  return CAP_R * (1 + 0.09 * lean
                    + 0.045 * Math.cos(2 * a - 1.1)
                    + 0.018 * Math.sin(3 * a + 4.1));
}
function rimYoff(a) {
  const lean = Math.cos(a - LEAN_DIR);
  const fold = Math.exp(-Math.pow(angWrap(a - 5.3) / 0.35, 2)); // one crisp fold
  return -0.16 * lean
       + 0.05 * Math.cos(2 * a + 0.7)
       - 0.13 * fold;
}
function marginDroop(u, a) { // the edge rolls down, harder on the lean side
  const m = Math.max(0, (u - 0.78) / 0.22);
  return -(0.11 + 0.05 * Math.cos(a - LEAN_DIR)) * m * m;
}
function capLump(u, a) { // faint dents and swells — alive, not crumpled
  return (0.038 * Math.sin(u * 6.3 + a * 2.1 + 1.0)
        + 0.026 * Math.sin(u * 9.7 - a * 3.3 + 2.0)) * Math.sin(Math.PI * Math.min(u, 1));
}
function capTopPt(u, a) { // u in [0,1] from apex to rim
  const uc = Math.min(u, 1);
  const r = u * rimRad(a);
  const dome = CAP_H * Math.pow(Math.cos(uc * Math.PI / 2), 1.15); // soft bell
  const y = CAP_Y + dome + rimYoff(a) * Math.pow(uc, 1.6) + marginDroop(uc, a) + capLump(u, a);
  const x = Math.cos(a) * r - 0.15 * (1 - uc * uc); // apex nudged off-center
  return new THREE.Vector3(x, y, Math.sin(a) * r);
}
function capUnderPt(u, a) { // gill skirt underside — shallow, so the cap keeps its flesh
  const r = Math.max(u * rimRad(a), 0.2);
  const edge = Math.pow(Math.max(0, (u - 0.8) / 0.2), 2);
  const y = CAP_Y + 0.5 * Math.pow(Math.max(0, 1 - u), 1.8) + 0.03
          + rimYoff(a) * Math.pow(u, 1.6) + marginDroop(u, a)
          - 0.11 * edge; // gill edge sits below the cap lip: the margin has thickness
  const x = Math.cos(a) * r - 0.075 * (1 - u * u);
  return new THREE.Vector3(x, y, Math.sin(a) * r);
}

// form-language consts for the extracted spore system (see the ctx note)
ctx.LEAN_DIR = LEAN_DIR;
ctx.CAP_Y = CAP_Y;

const mushroom = new THREE.Group();
scene.add(mushroom);
ctx.mushroom = mushroom;

// bead collector: the mushroom's surfaces are studded with light-motes so
// particles, not lines, carry the form (lines recede to connective tissue)
const mbP = [], mbC = [], mbS = [];
function beadM(x, y, z, h, s) {
  mbP.push(x, y, z);
  heat(h, tmpC);
  mbC.push(tmpC.r, tmpC.g, tmpC.b);
  mbS.push(s);
}

// =====================================================================
// 5. OCCLUSION SHELLS — opaque shells that occlude far-side wires
// =====================================================================
// ---- opaque black shells: occlude far-side wires like the reference ----
{
  const mat = new THREE.MeshBasicMaterial({
    color: 0x040100, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8,
  });
  function shellGrid(ptFn, uMin, uMax, yOff, uSteps, aSteps) {
    const pos = [];
    const idx = [];
    for (let i = 0; i <= uSteps; i++) {
      const u = uMin + (uMax - uMin) * (i / uSteps);
      for (let j = 0; j < aSteps; j++) {
        const a = (j / aSteps) * Math.PI * 2;
        const p = ptFn(u, a);
        pos.push(p.x, p.y + yOff, p.z);
      }
    }
    for (let i = 0; i < uSteps; i++) {
      for (let j = 0; j < aSteps; j++) {
        const j2 = (j + 1) % aSteps;
        const a0 = i * aSteps + j, a1 = i * aSteps + j2;
        const b0 = (i + 1) * aSteps + j, b1 = (i + 1) * aSteps + j2;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    return new THREE.Mesh(geo, mat);
  }
  mushroom.add(shellGrid(capTopPt, 0.0, 1.0, -0.045, 30, 96));
  mushroom.add(shellGrid(capUnderPt, 0.09, 0.995, 0.03, 24, 96));

  // margin wall — the visible thickness of the cap's edge
  {
    const pos = [], idx = [];
    const SEG = 96;
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const t = capTopPt(1.0, a);
      const u = capUnderPt(1.0, a);
      pos.push(t.x, t.y - 0.02, t.z, u.x, u.y + 0.02, u.z);
    }
    for (let j = 0; j < SEG; j++) {
      const j2 = (j + 1) % SEG;
      idx.push(j * 2, j * 2 + 1, j2 * 2, j2 * 2, j * 2 + 1, j2 * 2 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    mushroom.add(new THREE.Mesh(geo, mat));
  }
}

// ---- cap top: fine crumpled mesh ----
{
  const lp = [], lc = [], lt = [], lr = [];
  const RINGS = 26, SEGS = 110;
  const grid = [], tGrid = [], rGrid = [];
  const dA = Math.PI * 2 / SEGS; // azimuthal step to the neighbouring mesh line
  const dU = 1 / RINGS;          // radial step to the next ring
  for (let i = 0; i <= RINGS; i++) {
    const row = [], tRow = [], rRow = [];
    const u = i / RINGS;
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2;
      const ju = Math.max(0, u + gauss() * 0.02 * (i > 0 ? 1 : 0));
      const ja = a + gauss() * 0.028;
      const p = capTopPt(ju, ja);
      p.y += gauss() * 0.04;
      row.push(p);
      tRow.push(capTopPt(ju, ja + dA).sub(capTopPt(ju, ja)));
      rRow.push(capTopPt(ju + dU, ja).sub(capTopPt(ju, ja)));
    }
    grid.push(row);
    tGrid.push(tRow);
    rGrid.push(rRow);
  }
  for (let i = 0; i <= RINGS; i++) {
    for (let j = 0; j < SEGS; j++) {
      const p = grid[i][j], tp = tGrid[i][j];
      const t = i / RINGS;
      const bright = 0.14 + 0.26 * t + rand() * 0.08;
      if (rand() < 0.3) {
        beadM(p.x, p.y + 0.01, p.z, bright * 1.7 + rand() * 0.15,
              0.016 + Math.pow(rand(), 2) * 0.05);
      }
      if (i > 2 || rand() < 0.4) {
        const q = grid[i][(j + 1) % SEGS], tq = tGrid[i][(j + 1) % SEGS];
        const rp = rGrid[i][j], rq = rGrid[i][(j + 1) % SEGS];
        lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
        lt.push(tp.x, tp.y, tp.z, tq.x, tq.y, tq.z);
        lr.push(rp.x, rp.y, rp.z, rq.x, rq.y, rq.z);
        pushC(lc, bright); pushC(lc, bright);
      }
      if (i < RINGS && rand() < 0.85) {
        const q = grid[i + 1][j], tq = tGrid[i + 1][j];
        const rp = rGrid[i][j], rq = rGrid[i + 1][j];
        lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
        lt.push(tp.x, tp.y, tp.z, tq.x, tq.y, tq.z);
        lr.push(rp.x, rp.y, rp.z, rq.x, rq.y, rq.z);
        pushC(lc, bright); pushC(lc, bright + 0.03);
      }
      if (i < RINGS && rand() < 0.25) {
        const q = grid[i + 1][(j + 1) % SEGS], tq = tGrid[i + 1][(j + 1) % SEGS];
        const rp = rGrid[i][j], rq = rGrid[i + 1][(j + 1) % SEGS];
        lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
        lt.push(tp.x, tp.y, tp.z, tq.x, tq.y, tq.z);
        lr.push(rp.x, rp.y, rp.z, rq.x, rq.y, rq.z);
        pushC(lc, bright * 0.8); pushC(lc, bright * 0.8);
      }
    }
  }
  mushroom.add(makeDenseLines(lp, lc, lt, 0.28, lr));

  // sparse bright overlay network + node dots on the dome
  const nodes = [];
  for (let k = 0; k < 190; k++) {
    const u = Math.sqrt(rand()) * 0.99;
    const aa = rand() * Math.PI * 2;
    const p = capTopPt(u, aa);
    p.y += 0.012;
    nodes.push(p);
  }
  const olp = [], olc = [];
  for (const n of nodes) {
    const near = nodes
      .filter(m => m !== n)
      .map(m => ({ m, d: m.distanceTo(n) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { m } of near) {
      olp.push(n.x, n.y, n.z, m.x, m.y, m.z);
      const b = 0.35 + rand() * 0.15;
      pushC(olc, b); pushC(olc, b);
    }
  }
  mushroom.add(makeLines(olp, olc, 0.3));

  const pp = [], pc = [], ps = [];
  for (const n of nodes) {
    pp.push(n.x, n.y, n.z);
    pushC(pc, 0.5 + rand() * 0.3);
    ps.push(randRange(0.03, 0.07));
  }
  for (let k = 0; k < 420; k++) {
    const u = Math.sqrt(rand());
    const aa = rand() * Math.PI * 2;
    const p = capTopPt(u, aa);
    pp.push(p.x, p.y + 0.01, p.z);
    pushC(pc, 0.3 + rand() * 0.3);
    ps.push(randRange(0.015, 0.045));
  }
  mushroom.add(makePoints(pp, pc, ps, 0.9));
}

// =====================================================================
// 6. GILLS — dense radial filaments under the cap
// =====================================================================
// ---- gills: dense radial filaments under the cap ----
{
  const lp = [], lc = [], lt = [];
  const N_GILLS = 230, SUB = 12;
  const dG = Math.PI * 2 / N_GILLS; // azimuth to the neighbouring gill
  for (let g = 0; g < N_GILLS; g++) {
    const a0 = (g / N_GILLS) * Math.PI * 2 + gauss() * 0.004;
    const wig = gauss() * 0.02;
    const boost = rand() < 0.08 ? 0.18 : 0;
    const u0 = 0.06 + rand() * 0.09; // feathered inner attach — no hard ring
    let prev = null, prevT = null;
    for (let s = 0; s <= SUB; s++) {
      const t = s / SUB;
      const u = u0 + t * (1 - u0);
      const a = a0 + wig * Math.sin(t * Math.PI);
      const p = capUnderPt(u, a);
      const tg = capUnderPt(u, a + dG).sub(capUnderPt(u, a));
      p.y += gauss() * 0.008;
      if (prev) {
        lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        lt.push(prevT.x, prevT.y, prevT.z, tg.x, tg.y, tg.z);
        // cavity shading: warm core, shadowed mid interior, bright rim fringe
        const tp = (s - 1) / SUB;
        const b0 = 0.38 - 0.55 * tp + 0.85 * tp * tp + boost;
        const b1 = 0.38 - 0.55 * t + 0.85 * t * t + boost;
        pushC(lc, b0); pushC(lc, b1);
        if (boost > 0) { // hero gills: doubled stroke reads as a thicker vein
          lp.push(prev.x, prev.y - 0.007, prev.z, p.x, p.y - 0.007, p.z);
          lt.push(prevT.x, prevT.y, prevT.z, tg.x, tg.y, tg.z);
          pushC(lc, b0 * 0.85); pushC(lc, b1 * 0.85);
        }
        if (rand() < 0.05) beadM(p.x, p.y, p.z, b1 * 1.2, 0.011 + rand() * 0.018);
      }
      prev = p; prevT = tg;
    }
  }
  mushroom.add(makeDenseLines(lp, lc, lt, 0.33));

  // hot core where the gills meet the stem apex
  const cp = [], cc = [], cs = [];
  for (let k = 0; k < 80; k++) {
    const a = rand() * Math.PI * 2;
    const u = randRange(0.06, 0.2);
    const p = capUnderPt(u, a);
    cp.push(p.x, p.y + gauss() * 0.02, p.z);
    pushC(cc, 0.48 + rand() * 0.15);
    cs.push(randRange(0.035, 0.075));
  }
  mushroom.add(makePoints(cp, cc, cs, 0.85));
}

// ---- rim: the hottest ring, following the wavy edge ----
{
  const lp = [], lc = [], lt = [];
  const SEG = 340;
  // the rim is three stacked rings plus a doubled front arc: a line's nearest
  // neighbour is the ring above it, ~0.023 up and a hair further out
  const ringT = (du, a) => capTopPt(du + 0.012, a).add(new THREE.Vector3(0, 0.023, 0))
                             .sub(capTopPt(du, a));
  for (let ring = 0; ring < 3; ring++) {
    const dy = [0, 0.035, -0.012][ring];
    const du = [1.005, 1.0, 1.012][ring];
    const b = [0.8, 0.52, 0.57][ring];
    let prev = null, prevT = null;
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const p = capTopPt(du, a);
      p.y += dy + gauss() * 0.008;
      const tR = ringT(du, a);
      if (prev) {
        lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        lt.push(prevT.x, prevT.y, prevT.z, tR.x, tR.y, tR.z);
        pushC(lc, b + gauss() * 0.05); pushC(lc, b + gauss() * 0.05);
      }
      prev = p; prevT = tR;
    }
  }
  // weighted front arc: doubled strokes thicken the rim where it faces the
  // viewer, thinning to nothing as it turns away — width follows depth
  for (let pass = 0; pass < 2; pass++) {
    let prevF = null, prevFT = null;
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const w = Math.max(0, Math.cos(a - Math.PI / 2)); // front = +z
      const p = capTopPt(1.004, a);
      p.y += (pass ? 0.012 : -0.008) + gauss() * 0.006;
      const tF = ringT(1.004, a);
      if (prevF) {
        const b = 0.55 * w * w;
        if (b > 0.04) {
          lp.push(prevF.x, prevF.y, prevF.z, p.x, p.y, p.z);
          lt.push(prevFT.x, prevFT.y, prevFT.z, tF.x, tF.y, tF.z);
          pushC(lc, b); pushC(lc, b);
        }
      }
      prevF = p; prevFT = tF;
    }
  }
  // bottom lip of the margin
  let prevB = null, prevBT = null;
  for (let j = 0; j <= SEG; j++) {
    const a = (j / SEG) * Math.PI * 2;
    const p = capUnderPt(1.0, a);
    p.y += gauss() * 0.008;
    const tB = capUnderPt(0.985, a).sub(capUnderPt(1.0, a));
    if (prevB) {
      lp.push(prevB.x, prevB.y, prevB.z, p.x, p.y, p.z);
      lt.push(prevBT.x, prevBT.y, prevBT.z, tB.x, tB.y, tB.z);
      pushC(lc, 0.6 + gauss() * 0.05); pushC(lc, 0.6 + gauss() * 0.05);
    }
    prevB = p; prevBT = tB;
  }
  // fringe ticks across the flesh band between lip and gill edge.
  // The ticks land at random azimuths, so the mean spacing lies about the
  // close pairs — two ticks that happen to fall almost together were never
  // faded and shimmered against each other as the cap swayed. Draw every
  // tick's randomness first (keeping the RNG stream identical), then sort,
  // so each tick can carry its ACTUAL nearest neighbour as the fade tangent.
  const ticks = [];
  for (let k = 0; k < 430; k++) {
    const tick = { a: rand() * Math.PI * 2, b: 0.3 + rand() * 0.2, bead: null };
    if (rand() < 0.35) tick.bead = { h: 0.55 + rand() * 0.25, s: 0.016 + rand() * 0.028 };
    ticks.push(tick);
  }
  ticks.sort((p, q) => p.a - q.a);
  for (let k = 0; k < ticks.length; k++) {
    const { a, b, bead } = ticks[k];
    const dNext = angWrap(ticks[(k + 1) % ticks.length].a - a);
    const dPrev = angWrap(a - ticks[(k + ticks.length - 1) % ticks.length].a);
    // nearest real neighbour on either side; guard coincident angles so a
    // zero-length tangent can't drive the fade to permanent invisibility
    const dTick = (Math.abs(dNext) < Math.abs(dPrev) ? dNext : -dPrev) || 1e-3;
    const t = capTopPt(1.0, a);
    const u = capUnderPt(1.0, a);
    lp.push(t.x, t.y, t.z, u.x, u.y, u.z);
    const tT = capTopPt(1.0, a + dTick).sub(capTopPt(1.0, a));
    const tU = capUnderPt(1.0, a + dTick).sub(capUnderPt(1.0, a));
    lt.push(tT.x, tT.y, tT.z, tU.x, tU.y, tU.z);
    pushC(lc, b); pushC(lc, b * 0.9);
    if (bead) beadM(u.x, u.y, u.z, bead.h, bead.s);
  }
  mushroom.add(makeDenseLines(lp, lc, lt, 0.55));

  const pp = [], pc = [], ps = [];
  for (let k = 0; k < 110; k++) {
    const a = rand() * Math.PI * 2;
    const p = capTopPt(1.0, a);
    pp.push(p.x, p.y + gauss() * 0.02, p.z);
    pushC(pc, 0.72 + rand() * 0.18);
    ps.push(randRange(0.03, 0.08));
  }
  mushroom.add(makePoints(pp, pc, ps));
}

mushroom.add(makePoints(mbP, mbC, mbS, 0.9));

// ---- cap tilt ----
mushroom.rotation.x = tiltX; // asymmetry lives in the geometry; tilt frames the gill fan
mushroom.rotation.z = leanZ;
mushroom.position.z = -tiltX * 3.2; // compensate the tilt pivot being at the origin

// =====================================================================
// 7. STEM — fibrous tapering mesh
// =====================================================================
// ---- stem: fibrous tapering mesh ----
// The cap's throat (the hole the gills radiate from) in WORLD space, after the
// cap's tilt and lean — the stem's axis converges onto this point so the two
// always meet, whatever the framing parameters are.
const capThroat = new THREE.Vector3(-0.075, 3.66, 0)
  .applyEuler(new THREE.Euler(tiltX, 0, leanZ))
  .add(new THREE.Vector3(0, 0, -tiltX * 3.2));

const stemGroup = new THREE.Group();
scene.add(stemGroup);
ctx.stemGroup = stemGroup;
{
  function stemAxis(y) { // organic curve low down, converging on the cap throat
    const w = Math.pow(Math.min(y / 3.6, 1), 2);
    return new THREE.Vector2(
      (0.1 * Math.sin(y * 0.85 + 0.6) - 0.01 * y) * (1 - w) + capThroat.x * w,
      (0.045 * Math.sin(y * 0.7 + 1.7)) * (1 - w) + capThroat.z * w
    );
  }
  function stemR(y) {
    const t = y / STEM_TOP;
    return 0.27 - 0.07 * t + 0.42 * Math.exp(-y / 0.26)
         + 0.05 * Math.exp((y - STEM_TOP) / 0.35); // slight flare into the cap
  }
  // opaque core: a tube tracking the curved axis, so the silhouette bends with it
  {
    const pos = [], idx = [];
    const R = 30, S = 24;
    for (let i = 0; i <= R; i++) {
      const y = (i / R) * (STEM_TOP - 0.02);
      const ax = stemAxis(y);
      const r = Math.max(stemR(y) * 0.82, 0.02);
      for (let j = 0; j < S; j++) {
        const a = (j / S) * Math.PI * 2;
        pos.push(ax.x + Math.cos(a) * r, y, ax.y + Math.sin(a) * r);
      }
    }
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < S; j++) {
        const j2 = (j + 1) % S;
        idx.push(i * S + j, (i + 1) * S + j, i * S + j2,
                 i * S + j2, (i + 1) * S + j, (i + 1) * S + j2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    stemGroup.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x040100,
      polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 8,
    })));
  }
  const lp = [], lc = [], lt = [], pp = [], pc = [], ps = [];
  const RINGS = 46, SEGS = 34;
  const grid = [], tGrid = [];
  for (let i = 0; i <= RINGS; i++) {
    const y = (i / RINGS) * STEM_TOP;
    const ax = stemAxis(y);
    const r = stemR(y);
    const row = [], tRow = [];
    const dS = Math.PI * 2 / SEGS; // azimuth to the neighbouring mesh line
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * Math.PI * 2 + (i % 2) * (Math.PI / SEGS) + gauss() * 0.05;
      const jr = r * (1 + gauss() * 0.09);
      row.push(new THREE.Vector3(ax.x + Math.cos(a) * jr, y + gauss() * 0.015, ax.y + Math.sin(a) * jr));
      tRow.push(new THREE.Vector3((Math.cos(a + dS) - Math.cos(a)) * jr, 0,
                                  (Math.sin(a + dS) - Math.sin(a)) * jr));
    }
    grid.push(row);
    tGrid.push(tRow);
  }
  for (let i = 0; i <= RINGS; i++) {
    const yT = i / RINGS;
    for (let j = 0; j < SEGS; j++) {
      const p = grid[i][j], tp = tGrid[i][j];
      const base = 0.22 + 0.15 * Math.abs(Math.sin((j / SEGS) * Math.PI * 2 - 0.3)) + rand() * 0.07;
      const b = base + (yT > 0.85 ? 0.15 : 0) + (yT < 0.12 ? 0.08 : 0);
      if (rand() < 0.5) {
        const q = grid[i][(j + 1) % SEGS], tq = tGrid[i][(j + 1) % SEGS];
        lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
        lt.push(tp.x, tp.y, tp.z, tq.x, tq.y, tq.z);
        pushC(lc, b * 0.75); pushC(lc, b * 0.75);
      }
      if (i < RINGS && rand() < 0.9) {
        const q = grid[i + 1][j], tq = tGrid[i + 1][j];
        lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
        lt.push(tp.x, tp.y, tp.z, tq.x, tq.y, tq.z);
        pushC(lc, b); pushC(lc, b);
      }
      if (rand() < 0.22) {
        pp.push(p.x, p.y, p.z);
        pushC(pc, 0.5 + rand() * 0.3);
        ps.push(randRange(0.015, 0.055));
      }
    }
  }
  // long vertical fiber strands — the stem's striated texture. They get
  // their own buffer so the entry can draw them as a FIRST wave, with the
  // wavier lattice mesh above following as a second wave.
  const flp = [], flc = [], flt = [];
  const dF = Math.PI * 2 / 48; // azimuth to the neighbouring fibre
  for (let f = 0; f < 48; f++) {
    const a0 = (f / 48) * Math.PI * 2 + gauss() * 0.1;
    const b = 0.26 + rand() * 0.18;
    let prev = null, prevT = null;
    for (let i = 0; i <= 40; i++) {
      const y = (i / 40) * STEM_TOP;
      const ax = stemAxis(y);
      const a = a0 + 0.11 * Math.sin(y * 1.7 + f);
      const r = stemR(y) * (1 + gauss() * 0.04) * 1.01;
      const p = new THREE.Vector3(ax.x + Math.cos(a) * r, y, ax.y + Math.sin(a) * r);
      const tf = new THREE.Vector3(Math.cos(a + dF) * r - Math.cos(a) * r, 0,
                                   Math.sin(a + dF) * r - Math.sin(a) * r);
      if (prev) {
        flp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        flt.push(prevT.x, prevT.y, prevT.z, tf.x, tf.y, tf.z);
        pushC(flc, b + gauss() * 0.04); pushC(flc, b + gauss() * 0.04);
        if (f % 5 === 0) { // every fifth fiber is a heavier structural strand
          flp.push(prev.x + 0.009, prev.y, prev.z, p.x + 0.009, p.y, p.z);
          flt.push(prevT.x, prevT.y, prevT.z, tf.x, tf.y, tf.z);
          pushC(flc, b * 0.8); pushC(flc, b * 0.8);
        }
        if (rand() < 0.09) {
          pp.push(p.x, p.y, p.z);
          pushC(pc, b + 0.18);
          ps.push(randRange(0.012, 0.035));
        }
      }
      prev = p; prevT = tf;
    }
  }
  stemGroup.add(makeDenseLines(flp, flc, flt, 0.32)); // wave 1: vertical strands
  stemGroup.add(makeDenseLines(lp, lc, lt, 0.32));    // wave 2: lattice mesh
  stemGroup.add(makePoints(pp, pc, ps, 0.7));
}

// =====================================================================
// 8. GROUND NETWORK — mycelium web, moss, roots, ribbons
// =====================================================================
function groundY(x, z) {
  return 0.02 * Math.sin(x * 1.3 + 2) + 0.03 * Math.sin(z * 0.9 + 5) + 0.02 * Math.sin((x + z) * 0.7)
       + 0.05 * Math.sin(x * 0.4 + z * 0.5 + 1);
}

// all ground-network geometry (web/moss lines, hub/dust points, root
// arteries, floor ribbons, floor beads) lives under one group so it can be
// targeted as a unit — for highlight collection now, and later for things
// like a scroll-driven camera dive past/through the network.
const groundGroup = new THREE.Group();
scene.add(groundGroup);
ctx.groundGroup = groundGroup;

{
  function nearFade(z) {
    const t = Math.min(1, Math.max(0, (z - 3.8) / 3.8));
    return 1 - 0.62 * t * t;
  }
  function quietMul(x, z) {
    if (!quiet) return 1;
    const dx = (x - quiet.x) / quiet.rx;
    const dz = (z - quiet.z) / quiet.rz;
    return 1 - quiet.strength * Math.exp(-(dx * dx + dz * dz));
  }
  // the web radiates from the mushroom: bright at the source, dimming outward
  function radFall(x, z) {
    const d = Math.hypot(x, z);
    // radiant near the organism, but calmed directly beneath the stem so the
    // cap stays the focal point
    return (0.42 + 0.58 * Math.exp(-d / 7.5)) * (1 - 0.22 * Math.exp(-(d * d) / 3.24));
  }
  // beads: light-motes strung along every strand — particles carry the floor
  const gbP = [], gbC = [], gbS = [], gbD = [];
  function beadG(x, y, z, h, s) {
    gbP.push(x, y, z);
    heat(h, tmpC);
    gbC.push(tmpC.r, tmpC.g, tmpC.b);
    gbS.push(s);
    gbD.push(Math.hypot(x, z)); // radial distance drives the outward pulse
  }
  // density patches — clumps of life with sparse gaps between.
  // Half are seeded inside the camera's visible wedge so the foreground
  // always has texture; the rest scatter wide.
  const patches = [];
  for (let k = 0; k < 5; k++) {
    patches.push({
      x: randRange(-6, 6),
      z: randRange(1.5, 7),
      r: randRange(1.6, 3.0),
      gain: randRange(0.5, 0.9),
    });
  }
  for (let k = 0; k < 5; k++) {
    const ang = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.7) * 10 + 2;
    patches.push({
      x: Math.cos(ang) * dist * 1.25,
      z: Math.sin(ang) * dist * 0.7 + 2.0,
      r: randRange(1.6, 3.2),
      gain: randRange(0.5, 1.0),
    });
  }
  patches.push({ x: 0, z: 0.5, r: 2.4, gain: 0.5 });  // life around the stem
  patches.push({ x: -1.2, z: 4.6, r: 2.6, gain: 0.65 }); // guaranteed mid-foreground
  patches.push({ x: -5.5, z: 4.0, r: 2.8, gain: 0.6 });  // and to the left, under hero text
  function density(x, z) {
    let d = 0.25;
    for (const p of patches) {
      const dx = x - p.x, dz = z - p.z;
      d += p.gain * Math.exp(-(dx * dx + dz * dz) / (p.r * p.r));
    }
    return Math.min(d, 1.15);
  }

  const hubs = [];
  for (let k = 0; k < 1500; k++) {
    const ang = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.62) * 13.5 + 0.4;
    const x = Math.cos(ang) * dist * 1.25;
    const z = Math.sin(ang) * dist * 0.75 + 2.2;
    if (z < -5.5 || z > 8.2) continue;
    const den = density(x, z);
    if (rand() > den) continue; // clumpy acceptance
    const falloff = Math.max(0, 1 - dist / 15);
    const h = Math.pow(rand(), 1.6) * (0.55 + 0.45 * falloff);
    hubs.push({
      p: new THREE.Vector3(x, groundY(x, z), z),
      h: (0.22 + h * 0.78) * (0.45 + 0.55 * den) * nearFade(z) * quietMul(x, z) * radFall(x, z) * 0.85,
    });
  }
  // stars live near the organism, where the network is most alive
  const central = [];
  hubs.forEach((hub, i) => { if (Math.hypot(hub.p.x, hub.p.z) < 9) central.push(i); });
  const starIdx = [];
  for (let k = 0; k < 14 && central.length; k++) {
    const i = central[Math.floor(rand() * central.length)];
    hubs[i].h = (0.95 + rand() * 0.05) * nearFade(hubs[i].p.z) * quietMul(hubs[i].p.x, hubs[i].p.z);
    hubs[i].star = true;
    starIdx.push(i);
  }

  const lp = [], lc = [];
  function wigglyLine(a, b, ha, hb, segs = 11, amp = 0.09) {
    const dir = b.clone().sub(a);
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    let prev = null;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const p = a.clone().lerp(b, t);
      const off = Math.sin(t * Math.PI * randRange(1, 2.4)) * amp * gauss();
      p.add(perp.clone().multiplyScalar(off));
      p.y = groundY(p.x, p.z) + Math.abs(gauss()) * 0.015;
      if (prev) {
        lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        const b0 = ha + (hb - ha) * ((s - 1) / segs);
        const b1 = ha + (hb - ha) * t;
        pushC(lc, b0 * 0.85); pushC(lc, b1 * 0.85);
        if (rand() < 0.5) {
          beadG(p.x, p.y + 0.01, p.z, b1 * 1.9, 0.016 + Math.pow(rand(), 2) * 0.055);
        }
      }
      prev = p;
    }
  }

  for (const hub of hubs) {
    const near = hubs
      .filter(m => m !== hub)
      .map(m => ({ m, d: m.p.distanceTo(hub.p) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { m, d } of near) {
      if (d > 2.3) continue;
      wigglyLine(hub.p, m.p, hub.h, m.h);
    }
  }
  for (const i of starIdx) {
    const hub = hubs[i];
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const end = hub.p.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(randRange(0.4, 1.4)));
      end.y = groundY(end.x, end.z);
      wigglyLine(hub.p, end, hub.h * 0.9, hub.h * 0.35, 6, 0.08);
    }
  }
  // fine rootlets wandering off hubs
  for (const hub of hubs) {
    if (rand() > 0.8) continue;
    let p = hub.p.clone();
    let dir = new THREE.Vector2(gauss(), gauss()).normalize();
    let h = hub.h * 0.75;
    const steps = 6 + Math.floor(rand() * 9);
    for (let s = 0; s < steps; s++) {
      dir.rotateAround(new THREE.Vector2(), gauss() * 0.7);
      const q = p.clone().add(new THREE.Vector3(dir.x, 0, dir.y).multiplyScalar(randRange(0.12, 0.4)));
      q.y = groundY(q.x, q.z);
      lp.push(p.x, p.y, p.z, q.x, q.y, q.z);
      pushC(lc, h); pushC(lc, h * 0.8);
      if (rand() < 0.45) beadG(q.x, q.y + 0.01, q.z, h * 1.8, 0.014 + Math.pow(rand(), 2) * 0.05);
      p = q; h *= 0.82;
    }
  }
  groundGroup.add(makeLines(lp, lc, 0.36));

  // "moss": very short fine segments carpeting the dense patches
  const mlp = [], mlc = [];
  for (const patch of patches) {
    const count = Math.floor(150 * patch.gain);
    for (let k = 0; k < count; k++) {
      const x = patch.x + gauss() * patch.r * 0.8;
      const z = patch.z + gauss() * patch.r * 0.8;
      if (z < -5.5 || z > 8.2) continue;
      const y = groundY(x, z) + 0.005;
      const a = rand() * Math.PI * 2;
      const len = randRange(0.04, 0.16);
      const b = (0.13 + rand() * 0.19) * density(x, z) * nearFade(z) * quietMul(x, z) * radFall(x, z);
      mlp.push(x, y, z, x + Math.cos(a) * len, y + Math.abs(gauss()) * 0.02, z + Math.sin(a) * len);
      pushC(mlc, b); pushC(mlc, b * 0.7);
    }
  }
  groundGroup.add(makeLines(mlp, mlc, 0.35));

  // hub node points
  const pp = [], pc = [], ps = [];
  for (const hub of hubs) {
    pp.push(hub.p.x, hub.p.y + 0.01, hub.p.z);
    pushC(pc, hub.h);
    ps.push(hub.star ? randRange(0.15, 0.22) : randRange(0.05, 0.15) * (0.5 + hub.h));
  }
  // faint scatter dust + micro-specks in the moss patches
  for (let k = 0; k < 1100; k++) {
    const ang = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.6) * 14;
    const x = Math.cos(ang) * dist * 1.25;
    const z = Math.sin(ang) * dist * 0.75 + 2.0;
    if (z < -5.5 || z > 8.2) continue;
    pp.push(x, groundY(x, z) + 0.01, z);
    pushC(pc, (0.25 + Math.pow(rand(), 2) * 0.5) * (0.4 + 0.6 * density(x, z)) * nearFade(z) * quietMul(x, z) * radFall(x, z));
    ps.push(randRange(0.02, 0.055));
  }
  for (const patch of patches) {
    for (let k = 0; k < 120; k++) {
      const x = patch.x + gauss() * patch.r * 0.7;
      const z = patch.z + gauss() * patch.r * 0.7;
      if (z < -5.5 || z > 8.2) continue;
      pp.push(x, groundY(x, z) + 0.012, z);
      pushC(pc, (0.3 + rand() * 0.4) * nearFade(z) * quietMul(x, z));
      ps.push(randRange(0.012, 0.035));
    }
  }
  groundGroup.add(makePoints(pp, pc, ps, 0.95));

  // soft diffuse light pools
  const gp = [], gc = [], gs = [];
  for (let k = 0; k < 26; k++) {
    const hub = hubs[Math.floor(rand() * hubs.length)];
    gp.push(hub.p.x, hub.p.y + 0.05, hub.p.z);
    pushC(gc, (0.12 + rand() * 0.1) * quietMul(hub.p.x, hub.p.z) * radFall(hub.p.x, hub.p.z));
    gs.push(randRange(0.6, 1.4));
  }
  gp.push(0, 0.1, 0.3); pushC(gc, 0.08); gs.push(1.6);
  gp.push(0.6, 0.08, 1.2); pushC(gc, 0.07); gs.push(1.2);
  groundGroup.add(makePoints(gp, gc, gs, 0.5));

  // roots: bright strands from stem base out into the network
  const rlp = [], rlc = [];
  for (let k = 0; k < 14; k++) {
    const a = rand() * Math.PI * 2;
    let p = new THREE.Vector3(Math.cos(a) * 0.32, 0.10 + rand() * 0.14, Math.sin(a) * 0.32);
    let dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    let h = 0.56 + rand() * 0.15;
    const steps = 9 + Math.floor(rand() * 5);
    for (let s = 0; s < steps; s++) {
      dir.rotateAround(new THREE.Vector2(), gauss() * 0.35);
      const len = randRange(0.2, 0.45);
      const q = p.clone().add(new THREE.Vector3(dir.x, 0, dir.y).multiplyScalar(len));
      q.y = Math.max(groundY(q.x, q.z), p.y - randRange(0.04, 0.1));
      rlp.push(p.x, p.y, p.z, q.x, q.y, q.z);
      pushC(rlc, h * 0.85); pushC(rlc, h * 0.8);
      if (rand() < 0.55) beadG(q.x, q.y + 0.008, q.z, h * 1.5, 0.016 + Math.pow(rand(), 2) * 0.05);
      p = q; h *= 0.93;
      if (rand() < 0.25) {
        let bd = dir.clone().rotateAround(new THREE.Vector2(), gauss() * 1.1);
        let bp = p.clone(); let bh = h * 0.8;
        for (let t = 0; t < 4; t++) {
          const bq = bp.clone().add(new THREE.Vector3(bd.x, 0, bd.y).multiplyScalar(randRange(0.15, 0.35)));
          bq.y = Math.max(groundY(bq.x, bq.z), bp.y - 0.06);
          rlp.push(bp.x, bp.y, bp.z, bq.x, bq.y, bq.z);
          pushC(rlc, bh); pushC(rlc, bh * 0.85);
          bp = bq; bh *= 0.8;
          bd.rotateAround(new THREE.Vector2(), gauss() * 0.5);
        }
      }
    }
  }
  groundGroup.add(makeLines(rlp, rlc, 0.42));

  // ---- thick tapered strands: WebGL lines can't vary width, so weight
  // comes from real geometry — flat ribbons on the ground that taper from
  // artery to capillary, giving the web a coarse structural layer.
  {
    const rpos = [], rcol = [], ridx = [];
    function ribbon(path, w0, w1, h0, h1) {
      const base = rpos.length / 3;
      for (let i = 0; i < path.length; i++) {
        const t = i / (path.length - 1);
        const q = path[Math.min(i + 1, path.length - 1)];
        const pr = path[Math.max(i - 1, 0)];
        const dx = q.x - pr.x, dz = q.z - pr.z;
        const len = Math.hypot(dx, dz) || 1;
        const px = -dz / len, pz = dx / len;
        const p = path[i];
        const nf = nearFade(p.z);
        // ribbons thin out near the camera so they never project as wide bars
        const w = ((w0 + (w1 - w0) * t) / 2) * (0.3 + 0.7 * nf);
        const y = groundY(p.x, p.z) + 0.012;
        rpos.push(p.x + px * w, y, p.z + pz * w, p.x - px * w, y, p.z - pz * w);
        // attenuate per vertex, so a strand wandering near the camera or into
        // the quiet zone dims along its actual course
        const hv = (h0 + (h1 - h0) * t) * Math.pow(nf, 1.6) * quietMul(p.x, p.z);
        heat(hv, tmpC);
        rcol.push(tmpC.r, tmpC.g, tmpC.b, tmpC.r, tmpC.g, tmpC.b);
        if (rand() < 0.6) beadG(p.x, y + 0.012, p.z, hv * 2.0, 0.018 + Math.pow(rand(), 2) * 0.055);
      }
      for (let i = 0; i < path.length - 1; i++) {
        const a0 = base + i * 2;
        ridx.push(a0, a0 + 1, a0 + 2, a0 + 2, a0 + 1, a0 + 3);
      }
    }
    function walkPath(x, z, ang, steps, step0, zMax = 8) {
      const path = [{ x, z }];
      let a = ang;
      for (let s = 0; s < steps; s++) {
        a += gauss() * 0.45;
        const len = step0 * randRange(0.75, 1.25);
        x += Math.cos(a) * len; z += Math.sin(a) * len;
        if (z > zMax) { a = -a; z = zMax; } // stay out of the extreme foreground
        path.push({ x, z });
      }
      return path;
    }
    // root arteries: shortish trunks that always fork into thinner branches —
    // never one long cable running to the frame edge
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + gauss() * 0.3;
      const sx = Math.cos(a) * 0.42, sz = Math.sin(a) * 0.42;
      const path = walkPath(sx, sz, a, 4 + Math.floor(rand() * 3), 0.45, 3.8);
      const hb = 0.31 + rand() * 0.09;
      ribbon(path, randRange(0.06, 0.085), 0.02, hb, hb * 0.55);
      const end = path[path.length - 1];
      const nBranch = 2 + (rand() < 0.4 ? 1 : 0);
      for (let b = 0; b < nBranch; b++) {
        const bp = walkPath(end.x, end.z, a + gauss() * 0.9, 4 + Math.floor(rand() * 3), 0.4, 4.2);
        ribbon(bp, 0.035, 0.007, hb * 0.6, hb * 0.25);
      }
      if (rand() < 0.6) { // plus a midpoint fork
        const m = path[Math.floor(path.length / 2)];
        const bp = walkPath(m.x, m.z, a + gauss() * 1.2, 4, 0.35, 4.2);
        ribbon(bp, 0.04, 0.007, hb * 0.65, hb * 0.28);
      }
    }
    // floor highways: long coarse strands the fine net hangs off
    for (let k = 0; k < 5; k++) {
      const a0 = rand() * Math.PI * 2;
      const d0 = randRange(2, 6);
      const x = Math.cos(a0) * d0 * 1.2, z = Math.sin(a0) * d0 * 0.7 + 2;
      const path = walkPath(x, z, rand() * Math.PI * 2, 12 + Math.floor(rand() * 5), 0.7, 5.0);
      const hb = 0.33 * (0.5 + 0.5 * density(x, z));
      ribbon(path, randRange(0.035, 0.055), 0.008, hb, 0.12);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(rcol, 3));
    geo.setIndex(ridx);
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    drawAttr(geo, rpos.length / 3); // ribbons stroke in along their length too
    injectDraw(mat);
    groundGroup.add(new THREE.Mesh(geo, mat));
  }

  // all floor beads in one cloud — they twinkle, pulse outward, and defocus
  groundGroup.add(makePoints(gbP, gbC, gbS, 0.95, gbD));
}

// =====================================================================
// 9. AMBIENT MOTES — faint dust hanging in the whole air volume
// =====================================================================
{
  const pp = [], pc = [], ps = [];
  for (let k = 0; k < 850; k++) {
    const x = randRange(-13, 13);
    const y = Math.pow(rand(), 1.4) * 7 + 0.15;
    const z = randRange(-6, 7);
    pp.push(x, y, z);
    pushC(pc, 0.08 + Math.pow(rand(), 2) * 0.25);
    ps.push(0.012 + Math.pow(rand(), 2.2) * 0.045);
  }
  scene.add(makePoints(pp, pc, ps, 0.7));
}

// =====================================================================
// 10. SPORE CLOUD — moved to organism/spores.js at M2 (creation, drift
// integrator, shedSpores, and the driver seat). Called here at the exact
// position the inline block held, so the deterministic RNG stream — and with
// it every spore position/color/size — is byte-identical.
// =====================================================================
const sporeSys = createSpores(ctx);
const sporePts = sporeSys.sporePts;
ctx.sporePts = sporePts;

// =====================================================================
// 10b. BREEZE — one air current, shared by the body and the spores
// =====================================================================
// The wind runs left-to-right: it is what carries the spores that way, so the
// stalk must lean downwind on the same gusts. Sharing one signal is what makes
// the motion read as air rather than as two unrelated animations.
const swayGroup = new THREE.Group();
scene.add(swayGroup);
swayGroup.add(stemGroup);
ctx.swayGroup = swayGroup;

// The cap hangs off a second pivot placed exactly at the stem's throat, so it
// can bend a little further than the stalk (a cantilever bends most where it is
// thinnest) while that shared point stays pinned — the junction cannot shear.
const capBend = new THREE.Group();
capBend.position.copy(capThroat);
swayGroup.add(capBend);
capBend.add(mushroom);
mushroom.position.sub(capThroat); // keep the cap's world placement unchanged

// A stalk this size has a natural period of a few seconds, so the sway has to
// live in that range to read as movement at all — slower than this and the eye
// sees only shimmer. Gusts swell over a much longer cycle on top.
function breeze(t) {
  const gust = 0.55 + 0.45 * Math.sin(t * 0.13 + 0.6); // ~48s swell and lull
  return gust * (0.62 * Math.sin(t * 1.20)             // primary sway, ~5.2s
               + 0.26 * Math.sin(t * 1.83 + 1.3)       // second mode, ~3.4s
               + 0.07 * Math.sin(t * 2.60 + 2.7));     // fine flutter, ~2.4s
}

// =====================================================================
// 10c. TAP — a fingertip poke, resolved as actual mechanics
// =====================================================================
// The stalk is a cantilever on an elastic root. A tap is an impulse at the
// hit point: torque r x F about the base kicks the body's angular velocity,
// and it rings down as a damped oscillator at the stalk's own flutter
// frequency. The lever arm falls out of the cross product — a tap on the
// cap (r.y ~ 4) tips the body four times as far as one low on the stem,
// and pressing down on one edge of the cap tips it toward that side.
// The result rides ON TOP of the breeze (integrated in the breeze
// animator below), so a poked mushroom keeps swaying while it recovers.
const tap = { x: 0, z: 0, vx: 0, vz: 0 };
const TAP_W = 2.3;     // ring frequency (rad/s) — the stalk's fine-flutter mode
const TAP_ZETA = 0.14; // light damping: a few visible wobbles, settled in ~3s
{
  // hit-test against the opaque body shells — they ARE the solid mushroom
  const targets = [];
  for (const root of [mushroom, stemGroup]) {
    root.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) targets.push(o); });
  }
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0, downY = 0, downT = 0;

  // (shedSpores moved into organism/spores.js at M2 — the spore system owns
  // its own buffers; the tap below still triggers it.)

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX; downY = e.clientY; downT = performance.now();
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    // a tap, not an orbit drag: barely moved, quickly released
    if (performance.now() - downT > 400) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // one soft haptic tick where the platform offers one (Android; iOS
    // exposes no vibration API to the web, so it quietly does nothing there)
    const tick = () => { if (e.pointerType === 'touch' && navigator.vibrate) navigator.vibrate(6); };
    const hit = ray.intersectObjects(targets, false)[0];
    if (hit) {
      // the finger pushes along the view ray; the root sits at the origin
      const r = hit.point, F = ray.ray.direction;
      tap.vx += 0.008 * (r.y * F.z - r.z * F.y);
      tap.vz += 0.008 * (r.x * F.y - r.y * F.x);
      // flesh, not a bell: repeated pokes saturate instead of winding up
      const v = Math.hypot(tap.vx, tap.vz);
      if (v > 0.09) { tap.vx *= 0.09 / v; tap.vz *= 0.09 / v; }
      // the touch answers in light too: a tiny shiver of the same wave the
      // floor carries, spreading through the wires from under the fingertip
      // and dying within about a unit of it
      pulseC.value.copy(hit.point);
      pulseT.value = 0;
      pulseP.value.set(1.4, 1.5, 1.2); // slow, short-range, gentle
      if (hit.point.y > 2.8) sporeSys.shedSpores(28); // cap taps rattle a few spores loose
      tick();
      return;
    }
    // missed the body: a tap on the floor pings the mycelium instead — the
    // wave starts under the finger and diffuses out through the nearby web
    const gt = -ray.ray.origin.y / ray.ray.direction.y; // meet the y=0 plane
    if (!(gt > 0)) return;
    const gp = ray.ray.origin.clone().addScaledVector(ray.ray.direction, gt);
    if (Math.hypot(gp.x, gp.z - 2) > 14) return; // beyond the network's reach
    gp.y = groundY(gp.x, gp.z);
    pulseC.value.copy(gp);
    pulseT.value = 0;
    pulseP.value.set(2.6, 0.33, 1.4); // fast, far-carrying swell through the web
    tick();
  });
}

// =====================================================================
// 11. REGION HIGHLIGHTS — moved to organism/furniture.js at M2. Called at
// this exact position: base opacities are captured here, after every
// material exists and before any animator has touched them.
// =====================================================================
const highlights = createHighlights(ctx);

// =====================================================================
// 12. FRAME LOOP — animator registry + render loop
// =====================================================================
// Per-frame behaviors are registered by name instead of hardcoded inline,
// so new behaviors (e.g. a scroll-driven camera dive) can be plugged in or
// removed from outside without touching this loop. Execution order is the
// Map's insertion order — behaviors that were in the original monolithic
// animate() keep the same relative order they always ran in.
const animators = new Map(); // name -> fn(t, dt)
/** Register a per-frame callback `fn(t, dt)`, run in insertion order every
 *  frame before the composer renders. Returns a function that removes it —
 *  call that to unregister (e.g. when a scroll-driven effect ends). A
 *  second addAnimator with the same name replaces the callback in place. */
function addAnimator(name, fn) { animators.set(name, fn); return () => animators.delete(name); }
ctx.animators = animators;
ctx.addAnimator = addAnimator;

// Collected once — a full scene.traverse() per frame just to poke a uniform
// is pure overhead once the graph is final.
const _timeUniforms = [];
scene.traverse(o => {
  if (o.material && o.material.uniforms && o.material.uniforms.time) {
    _timeUniforms.push(o.material.uniforms.time);
  }
});
addAnimator('uniform-time', (t) => {
  for (const u of _timeUniforms) u.value = t;
});

// the body leans downwind: negative z-rotation tips the cap toward +x, the
// direction the same gust is pushing the spores.
// (swayCos/swaySin live on ctx since M2 — written here, read by spores.js.)
// ?dbg=1 prints the live motion values — handy when tuning sway or a camera move
const _dbg = location.search.includes('dbg')
  ? (document.body.appendChild(Object.assign(document.createElement('div'), {
      style: 'position:fixed;left:8px;bottom:8px;z-index:9;color:#7f7;font:12px monospace' })))
  : null;
addAnimator('breeze', (t, dt) => {
  // tap ringdown: semi-implicit Euler on the damped spring — stable at
  // these frequencies and frame rates, and it conserves the impulse's feel
  tap.vx += (-TAP_W * TAP_W * tap.x - 2 * TAP_ZETA * TAP_W * tap.vx) * dt;
  tap.vz += (-TAP_W * TAP_W * tap.z - 2 * TAP_ZETA * TAP_W * tap.vz) * dt;
  tap.x += tap.vx * dt;
  tap.z += tap.vz * dt;
  const b = breeze(t);
  const z = -b * 0.034 + tap.z;
  swayGroup.rotation.z = z;
  swayGroup.rotation.x =  b * 0.007 + tap.x; // a slight nod, so the sway isn't flat
  // the head trails the stalk: same signals, delayed, so the cap whips a beat
  // late (the tap's delay is a first-order Taylor step back along its motion)
  capBend.rotation.z = -breeze(t - 0.30) * 0.013 + (tap.z - 0.30 * tap.vz) * 0.38;
  swayGroup.updateMatrixWorld(true); // trackers read this matrix later in the frame
  ctx.swayCos = Math.cos(z);
  ctx.swaySin = Math.sin(z);
  if (_dbg) _dbg.textContent =
    `t ${t.toFixed(2)}s  sway ${(z * 57.3).toFixed(2)}deg  bend ${(capBend.rotation.z * 57.3).toFixed(2)}deg` +
    `  tap ${(Math.hypot(tap.x, tap.z) * 57.3).toFixed(3)}deg  pulse ${pulseT.value.toFixed(2)}s`;
});

// ---- mouse wind + spore drift: moved to organism/spores.js at M2 ----
// ORDERING (load-bearing): registered here, between 'breeze' (whose sway
// state it reads) and 'highlights' — and therefore before any journey-layer
// animator, whose spore-position takeover must run AFTER this integrator.
sporeSys.registerDrift();

addAnimator('highlights', (t) => highlights.update(t));
// the root-tap wave rides on elapsed time; parked well past its decay it
// contributes nothing, so the counter just stops advancing there
addAnimator('tap-pulse', (t, dt) => { if (pulseT.value < 8) pulseT.value += dt; });
addAnimator('controls', () => controls.update());

// trackers animator — moved to organism/furniture.js at M2; registered here
// so it keeps its slot in the frame order (after 'controls', before the
// intro's 'intro-draw' and any journey animator).
registerTrackers(ctx);

// ---- entry draw: moved to organism/intro.js at M2 ----
// Runs at this exact position: after every group is fully populated (the
// destructuring of groundGroup/stemGroup/mushroom/scene children is
// order-sensitive) and after all animator registrations above, so the
// 'intro-draw' animator lands last in the hero's registration order.
setupIntro(ctx);

const clock = new THREE.Clock();
let _prevT = 0;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(0.05, Math.max(0, t - _prevT));
  _prevT = t;

  for (const fn of animators.values()) fn(t, dt);

  taaFrame(); // jitter last, after controls/tweens have settled the camera
  composer.render();
}
animate();

function syncRenderSizes() {
  renderer.setSize(innerWidth, innerHeight);
  const db = renderer.getDrawingBufferSize(new THREE.Vector2());
  composer.renderTarget1.setSize(db.width, db.height);
  composer.renderTarget2.setSize(db.width, db.height);
  taaPass.setSize(db.width, db.height);
  bloom.setSize(innerWidth, innerHeight); // bloom's spread is tuned in CSS pixels
  for (const m of _denseMats) m.uniforms.uRes.value.set(db.width, db.height);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  syncRenderSizes();
});

// ---- adaptive resolution: keep weak GPUs smooth ----
// The pipeline (4x MSAA + bloom + TAA at up to 2x DPR) is heavy for older
// hardware. If the frame budget is blown for a sustained window, step the
// pixel ratio down a notch and re-check. One-way ratchet — it never steps
// back up, so there is no visible resolution flicker; on machines that hold
// 60fps it never engages at all.
let _perfTime = 0, _perfFrames = 0;
addAnimator('perf-governor', (t, dt) => {
  _perfTime += dt;
  _perfFrames++;
  if (_perfTime < 2.5) return;
  const avgMs = (_perfTime / _perfFrames) * 1000;
  _perfTime = 0;
  _perfFrames = 0;
  const pr = renderer.getPixelRatio();
  if (avgMs > 24 && pr > 1) {
    renderer.setPixelRatio(Math.max(1, pr - 0.25));
    syncRenderSizes();
  }
});

// ---- easing used by the view tween below ----
function _cubicInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

/** Recompose the camera for a different viewport regime (responsive
 *  breakpoints), or as the starting point for any future scripted camera
 *  move. `seconds = 0` (default) snaps immediately, exactly as before.
 *  `seconds > 0` eases camera.position, controls.target, and camera.fov
 *  from their current values to the new ones via a temporary 'view-tween'
 *  animator (cubic in-out), which removes itself when the tween finishes.
 *  Calling setView again — snap or tween — always cancels a tween already
 *  in flight, so the last call wins. */
function setView({ panX: p = 0, camY: cy = 2.05, camZ: cz = 8.8, targetY: ty = 2.5, fov: f = 38 } = {}, seconds = 0) {
  animators.delete('view-tween'); // a fresh call always supersedes an in-flight tween

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  const targetPos = new THREE.Vector3(0.15 + p, cy, cz);
  const targetTgt = new THREE.Vector3(p, ty, 0);

  if (seconds <= 0) {
    camera.fov = f;
    camera.updateProjectionMatrix();
    camera.position.copy(targetPos);
    controls.target.copy(targetTgt);
    controls.update();
    return;
  }

  const startPos = camera.position.clone();
  const startTgt = controls.target.clone();
  const startFov = camera.fov;
  const fovChanged = startFov !== f;
  let elapsed = 0;

  addAnimator('view-tween', (t, dt) => {
    elapsed += dt;
    const e = _cubicInOut(Math.min(1, elapsed / seconds));
    camera.position.lerpVectors(startPos, targetPos, e);
    controls.target.lerpVectors(startTgt, targetTgt, e);
    if (fovChanged) {
      camera.fov = startFov + (f - startFov) * e;
      camera.updateProjectionMatrix();
    }
    controls.update();
    if (e >= 1) animators.delete('view-tween');
  });
}

// =====================================================================
// 13. PUBLIC API — the object returned by createScene()
// =====================================================================
return {
  /** The THREE.Scene root — everything else here is also reachable through it. */
  scene,
  /** The THREE.PerspectiveCamera driving the view. */
  camera,
  /** The THREE.WebGLRenderer attached to `container` (or document.body). */
  renderer,
  /** The THREE.EffectComposer (render pass + bloom + output) — render through this, not `renderer`. */
  composer,
  /** The OrbitControls instance attached to `camera`. */
  controls,
  /** Top-level scene-graph groups, for anything that wants to target one part of the specimen —
   *  e.g. a scroll-driven dive that moves the camera through `groups.ground` toward the roots. */
  groups: { mushroom, stem: stemGroup, sway: swayGroup, ground: groundGroup, spores: sporePts },
  /** Key measurements of the cap/stem geometry (world units), useful for framing a camera move
   *  against the specimen's actual shape rather than guessed constants. */
  consts: { CAP_Y, CAP_R, CAP_H, STEM_TOP, FOG_NEAR, FOG_FAR },
  /** Ease a highlighted region ('spores' | 'stem' | 'ground') toward on/off; unknown names are ignored. */
  setHighlight: highlights.setHighlight,
  /** Recompose the camera (panX/camY/camZ/targetY/fov). seconds=0 snaps; seconds>0 eases via a
   *  cancellable 'view-tween' animator — see the setView JSDoc above for full behavior. */
  setView,
  /** Register a per-frame callback `fn(t, dt)` run every frame before the composer renders;
   *  returns an unregister function. This is the hook a scroll-driven camera dive should use. */
  addAnimator,
  /** The spore SYSTEM handle (merge doc §3) — the same dots as
   *  `groups.spores`, plus `shedSpores` and the driver seat: a journey
   *  chapter claims it with `setDriver({ exits })` and passes per-frame
   *  intent through the returned handle's `drive()`. Unclaimed
   *  (driver: null) the seat does nothing by construction and the ambient
   *  drift is byte-identical to the frozen hero. */
  spores: sporeSys,
};

} // end createScene
