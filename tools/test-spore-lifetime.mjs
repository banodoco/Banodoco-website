import assert from 'node:assert/strict';
import { sporeBoundaryDistance, sporeLifetimeOpacity } from '../organism/spore-lifetime.js';
for (const [x, y, origin] of [[6.8, 4, 0], [0, 7.6, 0], [0, .2, 0], [-2.5, 4, 0]]) {
  assert.equal(sporeLifetimeOpacity(sporeBoundaryDistance(x, y, origin), 1), 0,
    'every recycle boundary is completely dark before a particle moves');
}
assert.equal(sporeLifetimeOpacity(-.01, 1), 0);
assert.equal(sporeLifetimeOpacity(3, 0), 0, 'newly recycled particles start dark');
assert.equal(sporeLifetimeOpacity(3, 1), 1, 'settled middle of the cloud keeps original light');
let before = 1, at90 = null, at10 = null;
for (let t = 0; t < 25; t += 1 / 60) {
  const value = sporeLifetimeOpacity(1.4 - .06 * t, 1);
  assert.ok(value <= before && before - value < .002, 'departure is smooth and monotone');
  if (value < .9 && at90 === null) at90 = t;
  if (value < .1 && at10 === null) at10 = t;
  before = value;
}
assert.ok(at10 - at90 > 10, 'normal drift fades over many seconds, not a brief wink');
let previous = 0;
for (let age = 0; age <= 1; age += .01) {
  const value = sporeLifetimeOpacity(3, age);
  assert.ok(value >= previous && value - previous < .016, 'fresh shed has a smooth birth');
  previous = value;
}
console.log(`spore recycling: all four boundaries dark, ${(at10 - at90).toFixed(1)}s gentle 90–10% departure, smooth birth`);
