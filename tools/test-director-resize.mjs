#!/usr/bin/env node
/* Focused regression: a responsive hero resize may be interrupted by a
 * journey flight, and another resize may arrive while the return flight owns
 * the camera. Neither intermediate pose may become the permanent Intro rest. */

import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStager } from './stage-tree.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = mkdtempSync(join(tmpdir(), 'director-resize-'));
const stage = createStager({
  scratchRoot: scratch,
  threePath: join(REPO, 'vendor/three/three.module.js'),
  label: 'director resize regression',
});
process.on('exit', () => stage.cleanup());

globalThis.location = { search: '' };
globalThis.matchMedia = () => ({ matches: false });
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

const THREE = await import('file://' + join(REPO, 'vendor/three/three.module.js'));
const { createDirector } = await import(stage(join(REPO, 'journey/director.js')));

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(-2.25, 2.25, 10.4);
const controls = { target: new THREE.Vector3(-2.4, 2.6, 0), enabled: true };
const scene = { fog: { near: 7, far: 20 } };

let viewTween = null;
let rawSetViewCalls = 0;
const poseFor = (v) => ({
  pos: new THREE.Vector3(0.15 + (v.panX ?? 0), v.camY ?? 2.25, v.camZ ?? 10.4),
  target: new THREE.Vector3(v.panX ?? 0, v.targetY ?? 2.6, 0),
  fov: v.fov ?? 38,
});
const writePose = (p) => {
  camera.position.copy(p.pos);
  controls.target.copy(p.target);
  camera.fov = p.fov;
  camera.updateProjectionMatrix();
};

const sceneApi = {
  camera, controls, scene,
  setView(v, seconds = 0) {
    rawSetViewCalls++;
    const to = poseFor(v);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (seconds > 0) {
      viewTween = {
        from: { pos: camera.position.clone(), target: controls.target.clone(), fov: camera.fov },
        to,
      };
    } else {
      viewTween = null;
      writePose(to);
    }
  },
  cancelViewTransition() {
    if (!viewTween) return false;
    viewTween = null;
    return true;
  },
};

const director = createDirector(sceneApi, { steady: true });
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9,
  `${message}: expected ${b}, got ${a}`);
const samePose = (actual, expected, label) => {
  near(actual.position.x, expected.pos.x, `${label} position.x`);
  near(actual.position.y, expected.pos.y, `${label} position.y`);
  near(actual.position.z, expected.pos.z, `${label} position.z`);
  near(controls.target.x, expected.target.x, `${label} target.x`);
  near(controls.target.y, expected.target.y, `${label} target.y`);
  near(controls.target.z, expected.target.z, `${label} target.z`);
  near(actual.fov, expected.fov, `${label} fov`);
};

// Resize at Intro and let the hero's own 0.6 s ease reach an intermediate
// frame. This is the pose the old setOwned(true) permanently captured.
const resized = { panX: 0.9, camY: 2.8, camZ: 12.1, targetY: 3.7, fov: 50 };
sceneApi.setView(resized, 0.6);
assert.ok(viewTween, 'the fixture must have a live responsive tween');
const mid = {
  pos: viewTween.from.pos.clone().lerp(viewTween.to.pos, 0.42),
  target: viewTween.from.target.clone().lerp(viewTween.to.target, 0.42),
  fov: viewTween.from.fov + (viewTween.to.fov - viewTween.from.fov) * 0.42,
};
writePose(mid);

// beginFlight() brackets camera authority before placeAt() takes ownership.
director.setTransitioning(true);
assert.equal(viewTween, null, 'navigation cancels the competing hero tween');
director.setOwned(true);
director.apply(0, 0);
samePose(camera, mid, 'outbound flight begins at the visible resize sample');

// Landing away from Intro commits the final responsive target without moving
// the live chapter camera. A later return must restore that target, not `mid`.
camera.position.set(8, 6, -4);
controls.target.set(1, 2, 3);
director.setTransitioning(false);
director.setTransitioning(true);
director.setOwned(false);
samePose(camera, poseFor(resized), 'return uses the completed responsive target');

// Now resize while the return flight is still active and destination state is
// already Intro (`owned === false`). The resize must be deferred: no raw hero
// tween may become a second camera writer, and landing replays the latest view.
camera.position.set(3, 9, -7); // a synthetic mid-flight compositor pose
controls.target.set(-1, 4, 2);
const resizedAgain = { panX: -0.7, camY: 2.2, camZ: 11.3, targetY: 2.9, fov: 42 };
const callsBeforeMidFlightResize = rawSetViewCalls;
sceneApi.setView(resizedAgain, 0.6);
assert.equal(rawSetViewCalls, callsBeforeMidFlightResize,
  'resize during a return flight is deferred instead of installing view-tween');
assert.equal(viewTween, null, 'no competing hero tween exists during the flight');

// endCamBlend() clears transition authority, then restores when un-owned.
director.setTransitioning(false);
director.restoreHero();
samePose(camera, poseFor(resizedAgain), 'Intro landing uses the latest resized composition');
assert.equal(director.transitioning, false);
assert.equal(director.owned, false);

console.log('test-director-resize: PASS — resize tween interruption and mid-flight Intro return');
