import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the actual ring setter with its material-owned slots. The
// regression was a visibility switch at full light, not a changed shader.
const source = readFileSync(new URL('../journey/chapters/final/ring.js', import.meta.url), 'utf8');
const method = source.match(/setAerial\(amount\) \{([\s\S]*?)\n {4}\},/);
assert.ok(method, 'ring exposes its continuous representation handoff');
const bodyAmount = { value: .63 };
const strandMat = { uniforms: { uOpacity: { value: 1.15 }, uAmount: bodyAmount } };
const glowMat = { uniforms: { uOpacity: { value: 1.5 }, uAmount: bodyAmount } };
const ringLines = { visible: true }, ringGlows = { visible: true };
const setAerial = new Function('strandMat', 'glowMat', 'ringLines', 'ringGlows',
  `return function(amount) {${method[1]}\n};`)(strandMat, glowMat, ringLines, ringGlows);
for (const amount of [0, .2, .5, .8, .9999, 1, .8, .2, 0]) {
  setAerial(amount);
  assert.ok(Math.abs(strandMat.uniforms.uOpacity.value / 1.15 + amount - 1) < 1e-12,
    'old and aerial body light make one continuous handoff');
  assert.ok(Math.abs(glowMat.uniforms.uOpacity.value / 1.5 + amount - 1) < 1e-12,
    'ring glow follows the same handoff as its tissue');
  assert.equal(ringLines.visible, amount < 1, 'hide the batch only after its light reaches zero');
  assert.equal(ringGlows.visible, amount < 1);
  assert.equal(bodyAmount.value, .63, 'handoff cannot change near clones or shared chapter presence');
}
setAerial(true);
assert.equal(ringLines.visible, false, 'mobile retains its fully aerial representation');
setAerial(false);
assert.equal(strandMat.uniforms.uOpacity.value, 1.15, 'ordinary Purpose retains authored brightness');
assert.equal(glowMat.uniforms.uOpacity.value, 1.5);
const owner = readFileSync(new URL('../journey/chapters/final/index.js', import.meta.url), 'utf8');
assert.match(owner, /ring\.setAerial\(mobile \? 1 : ringSeatLevel\)/,
  'the live branch passes its fractional handoff, not a three-second boolean switch');
const expression = owner.match(/ringSeatLevel = (normalSeatLevel[^;]+);/)[1];
const level = new Function('normalSeatLevel', 'ringSeatHold', 'seatRetirement', `return ${expression}`);
assert.equal(level(.4, 1, 0), .4, 'ascent keeps the live seat fraction');
assert.equal(level(.4, 1, 1), 1, 'away retirement holds old proxies hidden');
assert.equal(level(.4, 1, .5), .7, 'Purpose retarget releases the hold continuously');
assert.match(owner, /sky\.setOriginalRingPresence\(mobile \? 0 : 1 - ringSeatLevel\)/,
  'far spores see the actual original ring representation');
console.log('PASS ring handoff: continuous tissue/glow amplitude, zero-light hide, reversible/mobile endpoints, shared ownership preserved.');
