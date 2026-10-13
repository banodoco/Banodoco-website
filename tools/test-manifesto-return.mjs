import assert from 'node:assert/strict';
import { manifestoPose, descentU, CAMERA_SECONDS, smoother, ascentAt } from '../journey/manifesto/pose.js';
const from = { position: { x: -15.4864, y: 5.2453, z: 3.4893 },
  target: { x: -3.023, y: 1.3933, z: -1.8471 }, fov: 53.5004, roll: -5 * Math.PI / 180 };
for (const aspect of [390 / 844, 430 / 932]) {
  for (const start of [0.06, 0.5, 1]) {
    const top = manifestoPose(from, start * CAMERA_SECONDS, aspect);
    let previousY = top.position.y;
    for (let i = 0; i <= 120; i++) {
      const k = i / 120;
      const pose = manifestoPose(from, descentU(start, k, aspect, from.position.y) * CAMERA_SECONDS, aspect);
      assert.ok(pose.position.y <= previousY + 1e-6, 'return descends monotonically');
      previousY = pose.position.y;
      if (k >= 0.9) {
        assert.ok((pose.position.y - from.position.y) / (top.position.y - from.position.y) < 0.01,
          'final tenth is a settle, not a second downward flight');
        assert.ok(Math.abs(pose.fov - from.fov) < 0.8, 'lens has substantially reached Purpose before the final settle');
        assert.ok(Math.abs(pose.roll - from.roll) < 0.009, 'five-degree bank returns with the flight');
      }
    }
    const landing = manifestoPose(from, descentU(start, 1, aspect, from.position.y) * CAMERA_SECONDS, aspect);
    assert.deepEqual(landing.position, from.position);
    assert.deepEqual(landing.target, from.target);
    assert.equal(landing.fov, from.fov);
    assert.equal(landing.roll, from.roll);
  }
}
// The desktop's original inverse remains unchanged, including early returns.
for (const start of [0.06, 0.5, 1]) for (const k of [0, 0.25, 0.5, 0.75, 0.99]) {
  const top = start * CAMERA_SECONDS;
  const goal = ascentAt(top, 1.6) * (1 - smoother(k));
  let lo = 0, hi = top;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ascentAt(mid, 1.6) < goal) lo = mid; else hi = mid;
  }
  assert.equal(descentU(start, k, 1.6, from.position.y), (lo + hi) / 2 / CAMERA_SECONDS);
}
console.log('PASS mobile early/late return: monotone descent, no final dip, lens/bank settle, exact landing; desktop unchanged');

// Real camera quaternions catch a smooth-position/abrupt-heading return.
const THREE = await import('../vendor/three/three.module.js');
const { applyCameraRoll } = await import('../journey/camera-roll.js');
const { awaySecondsFrom } = await import('../journey/manifesto/pose.js');
const { createReturnFlight, sampleReturnFlight, returnVelocity, returnChannels } =
  await import('../journey/manifesto/return-flight.js');
const origin = { ...from, fieldCenter: { x: .251658, z: -1.823989 } };
const home = { position: { x: -.10953, y: 3.575, z: 11.67944 },
  target: { x: -.25953, y: 3.655816, z: 0 }, fov: 46, roll: 0 };
const camera = new THREE.PerspectiveCamera(), target = new THREE.Vector3();
let fullPeak = 0;
for (const seconds of [.2, 1, 2, 3, 4, 4.5, 5, 15, CAMERA_SECONDS]) {
  const start = manifestoPose(origin, seconds, .462);
  const velocity = returnVelocity(manifestoPose(origin, Math.max(0, seconds - 1/60), .462), start, 1/60);
  const duration = awaySecondsFrom(seconds / CAMERA_SECONDS);
  const flight = createReturnFlight(start, home, duration, velocity);
  const first = sampleReturnFlight(flight, 0), last = sampleReturnFlight(flight, 1);
  assert.deepEqual(first.position, start.position); assert.deepEqual(first.target, start.target);
  assert.deepEqual(last.position, home.position); assert.deepEqual(last.target, home.target);
  const epsilon = .00001;
  const actualVelocity = returnVelocity(first, sampleReturnFlight(flight, epsilon/duration), epsilon);
  for (const key of Object.keys(velocity)) assert.ok(Math.abs(actualVelocity[key] - velocity[key]) < .001,
    `return preserves presented ${key} velocity at ${seconds}s`);
  let previous = null, priorSpeed = null, peak = 0;
  const step = 1/240;
  for (let time = 0; time <= duration; time += step) {
    const pose = sampleReturnFlight(flight, time/duration);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.up.set(pose.up.x, pose.up.y, pose.up.z);
    camera.lookAt(target.set(pose.target.x, pose.target.y, pose.target.z));
    assert.ok(camera.quaternion.toArray().every(Number.isFinite));
    if (previous) {
      const speed = camera.quaternion.angleTo(previous) / step;
      peak = Math.max(peak, speed);
      if (priorSpeed !== null) assert.ok(Math.abs(speed-priorSpeed) < .025,
        'angular velocity changes continuously, including the straight-down pole');
      priorSpeed = speed;
    }
    previous = camera.quaternion.clone();
  }
  assert.ok(peak < 1.2, `no mid-flight yaw spike at ${seconds}s (${peak}rad/s)`);
  if (seconds === CAMERA_SECONDS) fullPeak = peak;
  const endCamera = new THREE.PerspectiveCamera();
  endCamera.position.set(home.position.x,home.position.y,home.position.z);
  applyCameraRoll(endCamera,target.set(home.target.x,home.target.y,home.target.z),home.roll);
  camera.position.copy(endCamera.position); camera.up.set(last.up.x,last.up.y,last.up.z);camera.lookAt(target);
  assert.ok(camera.quaternion.angleTo(endCamera.quaternion)<1e-6,'exact landing orientation survives handoff');

  const middle = sampleReturnFlight(flight,.43);
  const middleVelocity = returnVelocity(sampleReturnFlight(flight,.43-epsilon/duration),middle,epsilon);
  const changed = createReturnFlight(middle,origin,2.2,middleVelocity);
  assert.deepEqual(returnChannels(sampleReturnFlight(changed,0)),returnChannels(middle),'retarget starts on the displayed pose');
  const changedVelocity = returnVelocity(sampleReturnFlight(changed,0),sampleReturnFlight(changed,epsilon/2.2),epsilon);
  for(const key of Object.keys(middleVelocity)) assert.ok(Math.abs(changedVelocity[key]-middleVelocity[key])<.001,
    'retarget preserves the displayed velocity');
}
console.log(`PASS continuous mobile away flight: early/late/retarget velocity, pole-safe orientation, exact landing; full-return peak ${(fullPeak*180/Math.PI).toFixed(1)}°/s`);

// Inspire lies across the overhead heading from Purpose. The old desktop
// blend of independently rewound targets nearly cancelled its horizontal
// direction and spun >1000 degrees/s. Use the authored rests on both sizes.
const { installVendorResolver } = await import('./render-report-lib.mjs');
installVendorResolver();
const { poseAt } = await import('../journey/director.js');
const { restProgress } = await import('../journey/route.js');
for (const [aspect, width] of [[390/844, 390], [1.6, 1280]]) {
  const rest = id => {
    const p = poseAt(restProgress(id), { pos: new THREE.Vector3(), target: new THREE.Vector3() }, undefined, aspect, width);
    return { position: { ...p.pos }, target: { ...p.target }, fov: p.fov, roll: p.roll || 0 };
  };
  const purpose = rest('final'), inspire = rest('inspire');
  for (const seconds of [.3, 1, 2, 4, 12, CAMERA_SECONDS]) {
    const start = manifestoPose(purpose, seconds, aspect);
    const velocity = returnVelocity(manifestoPose(purpose, seconds - 1/240, aspect), start, 1/240);
    const duration = awaySecondsFrom(seconds / CAMERA_SECONDS);
    const flight = createReturnFlight(start, inspire, duration, velocity);
    let previous = null;
    for (let i = 0; i <= 1000; i++) {
      const pose = sampleReturnFlight(flight, i/1000);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.up.set(pose.up.x, pose.up.y, pose.up.z);
      camera.lookAt(target.set(pose.target.x, pose.target.y, pose.target.z));
      if (previous) assert.ok(camera.quaternion.angleTo(previous) / (duration/1000) < 1.6,
        `Inspire return has no pole flip (${width}px, ${seconds}s departure)`);
      previous = camera.quaternion.clone();
    }
    const end = new THREE.PerspectiveCamera();
    end.position.set(inspire.position.x, inspire.position.y, inspire.position.z);
    applyCameraRoll(end, target, inspire.roll);
    assert.ok(camera.quaternion.angleTo(end.quaternion) < 1e-6, 'Inspire handoff keeps exact rest orientation');
  }
}
console.log('PASS authored desktop/mobile Inspire returns: early/late heading continuity and exact landing');
