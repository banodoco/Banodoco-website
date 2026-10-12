import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';

const url = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(url, 'utf8').replace(/from\s+'(\.[^']+)'/g,
  (_, specifier) => `from '${new URL(specifier, url).href}'`);
const { cameraFrameMatrix, basisOf } = await import('data:text/javascript;base64,' +
  Buffer.from(source + '\nexport { cameraFrameMatrix, basisOf };').toString('base64'));
const view = { camX: -1.5, camY: 2.1, camZ: 9, tgtX: -1.65, tgtY: 2.5 };
const b = basisOf(view);
const camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 100);
const origin = new THREE.Vector3(view.camX, view.camY, view.camZ);
const samples = [[-4, 2, 7], [2, 1, 12], [-1, -2, 9], [0, 0, 15]];
for (const [position, target] of [
  [origin, new THREE.Vector3(view.tgtX, view.tgtY, 0)],
  [new THREE.Vector3(4, 3, 6), new THREE.Vector3(0, 1, 0)],
  [new THREE.Vector3(-3, 6, 13), new THREE.Vector3(1, 0, -1)],
]) {
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  const frame = new THREE.Matrix4().fromArray(cameraFrameMatrix(view, camera.matrixWorldInverse.elements));
  for (const [a, c, d] of samples) {
    const world = origin.clone().addScaledVector(new THREE.Vector3(b.rx, b.ry, b.rz), a)
      .addScaledVector(new THREE.Vector3(b.ux, b.uy, b.uz), c)
      .addScaledVector(new THREE.Vector3(b.fx, b.fy, b.fz), d);
    const overlay = new THREE.Vector3(a, c, d).applyMatrix4(frame).applyMatrix4(camera.projectionMatrix);
    const scene = world.project(camera);
    assert.ok(overlay.distanceTo(scene) < 0.000002, 'overlay and scene must project the same world point');
  }
}
console.log('prelude camera: hero, orbit and zoom projection parity passed');
