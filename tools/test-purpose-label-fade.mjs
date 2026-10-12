import assert from 'node:assert/strict';
import { createPurposeLabelFade } from '../journey/ui/purpose-label-fade.js';
const fade = createPurposeLabelFade();
let now = 0;
const tick = (show, dt = 1000 / 60, extra = {}) => fade.step({ now: now += dt, show, ...extra });
assert.equal(tick(false), 0, 'cold mount is transparent');
assert.equal(tick(true, 8000), 0, 'first visible frame cannot spend cold stall time');
let previous = 0;
for (let i = 0; i < 70; i++) {
  const value = tick(true);
  assert.ok(value >= previous && value - previous < .03, 'bounded monotone reveal');
  previous = value;
}
assert.equal(previous, 1);
assert.equal(tick(false), 1, 'departure begins at the painted opacity');
for (let i = 0; i < 5; i++) previous = tick(false);
assert.equal(tick(true), previous, 'interrupted fade reverses without a jump');
for (let i = 0; i < 70; i++) tick(true);
assert.equal(tick(false, 100, { concealed: true }), 0, 'hidden geometry resets all state');
assert.equal(tick(true, 8000), 0, 'warm entrance also starts transparent');
assert.ok(tick(true, 8000) < .003, 'dropped frame advances at most one displayed-frame budget');
fade.reset();
assert.equal(tick(true), 0, 'viewport ownership reset has no stale opacity');
assert.ok(tick(true, 16) < .01, 'opacity-only entrance never snaps, including reduced-motion pages');
console.log('purpose label controller: cold/warm, stalls, interruption, hidden geometry and resize reset pass');
