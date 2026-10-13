import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installVendorResolver } from './render-report-lib.mjs';
import { applyChapterFrame } from '../journey/frame-application.js';

installVendorResolver();
const THREE = await import('../vendor/three/three.module.js');
const { createSeams } = await import('../journey/seams.js');
const { createFramePublisher } = await import('../journey/frame/publication.js');
globalThis.window = { innerWidth: 1280, innerHeight: 800 };
const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 500);
camera.position.set(10, 40, 0);
const publisher = createFramePublisher({ camera, controls: { target: new THREE.Vector3() },
  scene: { fog: { near: 10, far: 200 } } });
const source = readFileSync(new URL('../journey/journey.js', import.meta.url), 'utf8');
const expression = source.match(/scenePresentedP: ([\s\S]*?),\n\s+transition,/);
assert.ok(expression, 'read the real scoped presentation expression');
const resolveScene = new Function('manifestoPassage', 'p', 'travelP', `return ${expression[1]};`);
const stateP = 0.2, presentedP = 0.7;
const args = { dt: 1 / 60, stateP, routeP: stateP, presentedP, transition: {}, gliding: false };
for (const passage of [null, { kind: 'open', target: 'inspire' }, { kind: 'leave', target: 'connect' }]) {
  assert.equal(resolveScene(passage, stateP, presentedP), presentedP);
}
const scenePresentedP = resolveScene({ kind: 'leave', target: 'inspire' }, stateP, presentedP);
const ordinary = publisher.publish(args);
const aerial = publisher.publish({ ...args, scenePresentedP });
assert.equal(ordinary.scenePresentedP, presentedP);
assert.equal(aerial.presentedP, presentedP, 'UI/camera travel remains continuous');
assert.equal(aerial.scenePresentedP, stateP);
assert.ok(Object.isFrozen(aerial));

function exercise(frame) {
  const states = {}, drives = {};
  const chapters = Object.fromEntries(['inspire', 'equip', 'connect', 'owned', 'final'].map(id => [id, {
    setArmed(on) { states[id] = on; },
    drive(p, shown) { drives[id] = [p, shown]; },
  }]));
  createSeams({ camera, chapters }).update(frame.routeP, frame.scenePresentedP);
  applyChapterFrame(chapters, null, frame.routeP, frame.dt, false, (_name, fn) => fn(), frame.scenePresentedP);
  return { states, drives };
}
const old = exercise(ordinary), next = exercise(aerial);
assert.equal(old.states.inspire, false, 'ordinary route retirement still hides Inspire here');
assert.equal(next.states.inspire, true, 'aerial destination can resolve before final route window');
assert.deepEqual(next.drives.inspire, [stateP, stateP]);
for (const id of ['equip', 'connect', 'owned', 'final']) assert.equal(next.states[id], old.states[id], `${id} streaming unchanged`);
assert.match(source, /seams\.update\(frame\.routeP, frame\.scenePresentedP\)/);
assert.match(source, /frame\.gliding, guarded, frame\.scenePresentedP\)/);
console.log('PASS: aerial Inspire admission, ordinary defaults, common seam/drive coordinate, bounded chapter streaming');
