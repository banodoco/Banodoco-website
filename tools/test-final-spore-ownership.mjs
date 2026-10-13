import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installVendorResolver } from './render-report-lib.mjs';

installVendorResolver();
// The builder needs only the glow sprite's canvas; no renderer or GPU.
globalThis.document = { createElement: () => ({ getContext: () => ({
  createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
}) }) };
const { makeUniforms } = await import('../journey/chapters/final/world.js');
const { createFinalSky } = await import('../journey/chapters/final/sky.js');
const body = makeUniforms({}), skyAmount = { value: 1 };
const sky = createFinalSky({}, { ...body, uAmount: skyAmount }, body.uAmount);
const far = sky.addHorizonPlumes([{ x: 20, z: 15, gy: 0, s: 1, tier: 4, reveal: .5 }]);
assert.ok(far.geometry.attributes.position.count > 0, 'real horizon source admitted');
const near = sky.group.children.find(object => object.material?.uniforms?.uBodyAmount && object !== far);
assert.ok(near, 'real mixed plume/band material exists');
assert.equal(near.material.uniforms.uBodyAmount, body.uAmount);
assert.equal(far.material.uniforms.uBodyAmount, body.uAmount);
assert.equal(near.material.uniforms.uAmount, skyAmount);
assert.equal(far.material.uniforms.uAmount, undefined, 'far parent-bound spores do not inherit ambient sky fade');

// Execute the ownership expressions extracted from the built GPU shaders.
// The old sky-only formula is an explicit counterexample to the zero-parent
// invariant, rather than a second copy of the new implementation.
const nearExpression = near.material.vertexShader.match(/\* (mix\(uBodyAmount, uAmount, mode\))/)?.[1];
const farExpression = far.material.vertexShader.match(/float owner = ([^;]+);/)?.[1];
assert.ok(nearExpression && farExpression);
const mix = (a, b, t) => a + (b - a) * t;
const nearGate = new Function('uBodyAmount', 'uAmount', 'mode', 'mix', `return ${nearExpression}`);
const presenceSource = far.material.vertexShader.match(/float colonyPresence\(float amount, vec2 foot\) \{([\s\S]*?)\n {2}\}/)[1]
  .replace(/\bfloat\b/g, 'let').replace(/\bsin\(/g, 'Math.sin(').replace(/\bmax\(/g, 'Math.max(');
const presence = new Function('amount', 'foot', 'uColonyRetiring', 'uColonyRetirementStart', 'smoothstep', 'mix', presenceSource);
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
const seatPresence = (amount, foot) => presence(amount, foot,
  far.material.uniforms.uColonyRetiring.value, far.material.uniforms.uColonyRetirementStart.value, smoothstep, mix);
const rawFarGate = new Function('reveal', 'uBodyAmount', 'uAerialSeatAmount', 'max', 'colonyPresence', 'position', 'uOriginalRingPresence', 'uPurposeAerial', `return ${farExpression}`);
const farGate = (reveal, amount, seat, max) => rawFarGate(reveal, amount, seat, max, seatPresence, { xz: { x: 20, y: 15 } },
  far.material.uniforms.uOriginalRingPresence.value, far.material.uniforms.uPurposeAerial.value);
for (const skyAlpha of [0, .25, 1]) for (const reveal of [0, .4, 1]) {
  assert.equal(nearGate(0, skyAlpha, 0, mix), 0, 'dead near parent cannot leave a plume');
  assert.equal(farGate(reveal, 0, 0, Math.max), 0, 'both dead far parents cannot leave a plume');
  assert.equal(nearGate(0, skyAlpha, 1, mix), skyAlpha, 'ambient band retains its independent clock');
}
assert.equal(farGate(1, 0, .6, Math.max), .6, 'living aerial replacement carries its plume');
assert.equal(farGate(.5, .8, 0, Math.max), .4, 'original ring owns its reveal and retirement');
sky.setOriginalRingPresence(0);
assert.equal(farGate(1, 1, 0, Math.max), 0, 'a held-hidden ring cannot keep an orphan plume alive');
sky.setOriginalRingPresence(1);
assert.ok(1 * 1 > farGate(1, 0, 0, Math.max), 'old reveal*skyAmount stays lit after both parents die');
sky.setAerialSeatAmount(.7);
assert.equal(far.material.uniforms.uAerialSeatAmount.value, .7);
sky.setAerialSeatAmount(.69, true);
assert.equal(far.material.uniforms.uColonyRetirementStart.value, .7, 'retirement latches prior displayed seat light');
assert.equal(far.material.uniforms.uColonyRetiring.value, 1);
assert.equal(seatPresence(.7, { x: 20, y: 15 }), .7, 'retirement starts continuously');
assert.equal(seatPresence(0, { x: 20, y: 15 }), 0, 'spores disappear with their retired seat');
const fullRetirement = seatPresence(.35, { x: 20, y: 15 });
sky.setAerialSeatAmount(.35, .25);
assert.equal(far.material.uniforms.uColonyRetirementStart.value, .7, 'retarget retains original normalization');
assert.equal(far.material.uniforms.uColonyRetiring.value, .25, 'retarget mode remains fractional');
assert.ok(Math.abs(seatPresence(.35, { x: 20, y: 15 }) - mix(.35, fullRetirement, .25)) < 1e-12,
  'Purpose retarget continuously blends away the spatial retirement instead of switching it off');
sky.setAerialSeatAmount(0);
assert.equal(far.material.uniforms.uAerialSeatAmount.value, 0);
assert.equal(far.material.uniforms.uColonyRetiring.value, 0, 'Purpose/ascent presentation resets departure mapping');
sky.setPurposeAerial(true);
assert.equal(far.material.uniforms.uPurposeAerial.value, 1);
sky.setPurposeAerial(false);
assert.equal(far.material.uniforms.uPurposeAerial.value, 0);
assert.equal(far.material.uniforms.uPullRaw, body.uPullRaw);
assert.match(far.material.vertexShader, /smoothstep\(aGate\.x, aGate\.x \+ 0\.14, uPullRaw\)/);
const owner = readFileSync(new URL('../journey/chapters/final/index.js', import.meta.url), 'utf8');
assert.match(owner, /aerial\.setSeatLight\(seatAmount, seatRetirement\);[\s\S]*?sky\.setAerialSeatAmount\(progress === null \? 0 : seatAmount, seatRetirement\)/);
assert.match(owner, /ring\.setAerial\(mobile\);\s+sky\.setPurposeAerial\(mobile\)/);
const holdExpression = owner.match(/ringSeatLevel = (normalSeatLevel[^;]+);/)[1];
const ringHold = new Function('normalSeatLevel', 'ringSeatHold', 'seatRetirement', `return ${holdExpression}`);
assert.equal(ringHold(.2, 1, 0), .2, 'Purpose keeps normal inverse handoff');
assert.equal(ringHold(.2, 1, 1), 1, 'away retirement does not restore old proxies');
let previous = ringHold(.2, 1, 1);
for (let step = 99; step >= 0; step--) {
  const current = ringHold(.2, 1, step / 100);
  assert.ok(Math.abs(current - previous) <= .00801, 'retarget releases original-ring hold continuously');
  previous = current;
}
console.log('PASS real sky materials: parent lifecycle, aerial handoff/reset, independent ambient band, old-formula counterexample.');
