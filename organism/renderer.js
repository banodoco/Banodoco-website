import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPixelRatioPolicy } from './performance.js';

export function createRendererSetup({ panX, container, camY, camZ, targetY, camAzimuth, bg, fov, pinPr }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  const FOG_NEAR = 7.0, FOG_FAR = 20;
  scene.fog = new THREE.Fog(bg, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.1, 100);
  const az = camAzimuth * Math.PI / 180;
  camera.position.set(0.15 + panX + Math.sin(az) * camZ, camY, Math.cos(az) * camZ);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  const pixelRatioPolicy = createPixelRatioPolicy(pinPr);
  renderer.setPixelRatio(pixelRatioPolicy.initial);
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

  // R04 — this file constructs exactly two disposable resources: the
  // WebGLRenderer's GPU context and the OrbitControls' DOM listeners
  // (see docs/code-health/evidence/2026-08-21-elegance-run-01/r04/
  // CHARACTERIZATION.md — Scene/Color/Fog/PerspectiveCamera hold no GPU
  // handle and three.js gives them no dispose()). Nothing disposed either
  // one before this. `dispose()` is the one named, idempotent owner of
  // both, plus the one DOM mutation this file itself performs (the
  // appendChild two lines above `controls` — reversed symmetrically here,
  // only if the canvas is still where this file put it). Not yet called by
  // any caller (organism/organism.js is forbidden to this order) — same
  // posture as R01's addAnimator handle and R02's teardown(): the capability
  // is built and proven safe: idempotent, safe before any call.
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }

  return { scene, camera, renderer, controls, pixelRatioPolicy, FOG_NEAR, FOG_FAR, dispose };
}

/**
 * Own the one invariant that keeps a resolution change from tearing: the
 * window, the renderer, and every size-dependent consumer agree, in that
 * order, on every event that can move any of them.
 *
 * TWO SIZE SPACES, AND MIXING THEM IS THE HAZARD. `innerWidth/innerHeight`
 * are CSS pixels; the drawing buffer is those times the pixel ratio. A
 * consumer tuned in CSS pixels (a bloom radius is a perceived glow width)
 * must be given the CSS size, and a consumer indexing real texels (a render
 * target, a TAA history, a shader's `uRes`) must be given the buffer size.
 * The buffer size is therefore read back FROM the renderer after `setSize`
 * rather than computed here — the renderer applies its own clamping, so its
 * answer is the only authoritative one — and handed to `onSize` alongside the
 * CSS size, so no consumer has to re-derive either and get the space wrong.
 *
 * `sync()` DELIBERATELY DOES NOT TOUCH THE CAMERA. Its two callers want
 * different things: a window resize genuinely changes the aspect ratio, while
 * a pixel-ratio change (the adaptive governor in ./performance.js) re-allocates
 * every buffer at the SAME aspect. Folding `camera.aspect` into `sync()` would
 * make the governor rebuild a projection matrix that did not move — and doing
 * that mid-flight is how a TAA history gets invalidated for no reason. So the
 * camera update lives on the resize path only, above `sync()`, where the aspect
 * has actually changed.
 *
 * @param {object}   deps
 * @param {object}   deps.renderer  The WebGLRenderer to size.
 * @param {object}   deps.camera    Perspective camera whose aspect tracks the window.
 * @param {function} deps.onSize    Called with `(drawingBuffer, cssWidth, cssHeight)`
 *        after the renderer is sized, to bring every other size-dependent
 *        consumer into agreement. Runs on both paths, always after `setSize`.
 * @returns {{sync: function, resize: function}} `sync` for a pixel-ratio change,
 *        `resize` for a window change. THIS FACTORY ATTACHES NO LISTENER: the
 *        window hook is page-lifetime and belongs where the page-lifetime
 *        register can see it, so the caller registers `resize` itself (see the
 *        createScene lifetime classification in ./organism.js). Sizing policy
 *        lives here; the registration decision does not.
 */
export function createViewportSync({ renderer, camera, onSize }) {
  function sync() {
    renderer.setSize(innerWidth, innerHeight);
    onSize(renderer.getDrawingBufferSize(new THREE.Vector2()), innerWidth, innerHeight);
  }
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    sync();
  }
  return { sync, resize };
}
