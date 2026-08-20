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

  return { scene, camera, renderer, controls, pixelRatioPolicy, FOG_NEAR, FOG_FAR };
}
