// Deterministic, renderer-free regressions for the two camera-side causes of
// Connect's perceived stall-then-roll. Run with: node tools/test-connect-motion.mjs
import assert from 'node:assert/strict';
import { CONNECT_APPROACH_RAMP } from '../journey/constants.js';
import { trapEase } from '../journey/lib/ease.js';
import { applyPortrait } from '../journey/portrait.js';
import { restProgress } from '../journey/route.js';

const inspireP = restProgress('inspire');
const connectP = restProgress('connect');
const midP = inspireP + 0.652 * (connectP - inspireP);

// The Connect camera must retain its plateau velocity through the visible
// ground-light intro, then make one short exact landing at the rest.
const derivative = (u, h = 1e-5) => (trapEase(u + h, CONNECT_APPROACH_RAMP)
  - trapEase(u - h, CONNECT_APPROACH_RAMP)) / (2 * h);
const plateauRate = 1 / (1 - CONNECT_APPROACH_RAMP);
const beforeFinaleU = (0.49 - inspireP) / (connectP - inspireP);
assert.ok(derivative(beforeFinaleU) >= plateauRate * 0.99,
  'Connect camera must not begin its landing crawl before the finale');
assert.equal(trapEase(0, CONNECT_APPROACH_RAMP), 0);
assert.equal(trapEase(1, CONNECT_APPROACH_RAMP), 1);

const portraitPose = (p) => {
  const pose = {
    pos: { x: 0, y: 0, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    fov: 40,
  };
  return applyPortrait(pose, p, 0.75, 430);
};
const mid = portraitPose(midP);
const rest = portraitPose(connectP);

// D23's +0.80 vertical taste adjustment and the phone-only Connect pitch-up
// belong to the whole movement, not only its final zero-slope segment. Keep
// the approved eye exact and carry the gaze adjustment by the interior key so
// neither can re-accelerate during the visible landing.
assert.ok(Math.abs(rest.pos.y - 2.30) < 1e-9);
assert.ok(Math.abs(rest.target.y - 2.75) < 1e-9);
assert.ok(rest.pos.y - mid.pos.y <= 1.25,
  'portrait eye must not restart a large truck during the Connect intro');
assert.ok(rest.target.y - mid.target.y <= 1.25,
  'portrait gaze must not restart a large truck during the Connect intro');

console.log('Connect camera motion: PASS');
