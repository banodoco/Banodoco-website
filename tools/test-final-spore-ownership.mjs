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
const farGate = new Function('reveal', 'uBodyAmount', 'uAerialSeatAmount', 'max', `return ${farExpression}`);
for (const skyAlpha of [0, .25, 1]) for (const reveal of [0, .4, 1]) {
  assert.equal(nearGate(0, skyAlpha, 0, mix), 0, 'dead near parent cannot leave a plume');
  assert.equal(farGate(reveal, 0, 0, Math.max), 0, 'both dead far parents cannot leave a plume');
  assert.equal(nearGate(0, skyAlpha, 1, mix), skyAlpha, 'ambient band retains its independent clock');
}
assert.equal(farGate(1, 0, .6, Math.max), .6, 'living aerial replacement carries its plume');
assert.equal(farGate(.5, .8, 0, Math.max), .4, 'original ring owns its reveal and retirement');
assert.ok(1 * 1 > farGate(1, 0, 0, Math.max), 'old reveal*skyAmount stays lit after both parents die');
sky.setAerialSeatAmount(.7);
assert.equal(far.material.uniforms.uAerialSeatAmount.value, .7);
sky.setAerialSeatAmount(0);
assert.equal(far.material.uniforms.uAerialSeatAmount.value, 0);
sky.setPurposeAerial(true);
assert.equal(far.material.uniforms.uPurposeAerial.value, 1);
sky.setPurposeAerial(false);
assert.equal(far.material.uniforms.uPurposeAerial.value, 0);
assert.equal(far.material.uniforms.uPullRaw, body.uPullRaw);
assert.match(far.material.vertexShader, /smoothstep\(aGate\.x, aGate\.x \+ 0\.14, uPullRaw\)/);
const owner = readFileSync(new URL('../journey/chapters/final/index.js', import.meta.url), 'utf8');
assert.match(owner, /aerial\.setSeatLight\(seatAmount\);[\s\S]*?sky\.setAerialSeatAmount\(progress === null \? 0 : seatAmount\)/);
assert.match(owner, /ring\.setAerial\(mobile\);\s+sky\.setPurposeAerial\(mobile\)/);
console.log('PASS real sky materials: parent lifecycle, aerial handoff/reset, independent ambient band, old-formula counterexample.');
