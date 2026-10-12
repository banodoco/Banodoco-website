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
