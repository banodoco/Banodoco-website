import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the production field integrator; expose internals only in this
// in-memory module so the browser API stays unchanged.
const moduleUrl = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(moduleUrl, 'utf8').replace(
  /from\s+'(\.[^']+)'/g,
  (_, specifier) => `from '${new URL(specifier, moduleUrl).href}'`,
);
const { createField, advance } = await import('data:text/javascript;base64,' +
  Buffer.from(source + '\nexport { createField, advance };').toString('base64'));
const view = { mode: 'desktop', camX: 0.15, camY: 2, camZ: 9,
  tgtX: 0, tgtY: 1, tanHalfFov: 0.5, aspect: 1.6 };
const field = createField(view, 123);
field.landings = [];
function place(i, x, y) {
  const depth = 10;
  field.frame.set([x * depth * view.tanHalfFov * view.aspect,
    y * depth * view.tanHalfFov, depth], i * 3);
}
place(0, -1.1, 0); place(1, 1.1, 0);
place(2, 0, -1.1); place(3, 0, 1.1);
place(4, 0, 0); place(5, 0.4, -0.5);
field.landings.push({ hi: 5, site: 0, state: 2, impactAt: 0 });
const control = structuredClone({ ...field, rand: undefined });
control.rand = field.rand;
field.released = true;
advance(field, 0, 0.72);
for (let i = 0; i < 4; i++) {
  assert.equal(field.retired[i], 1, `offscreen particle ${i} must retire`);
  assert.equal(field.fade[i], 0);
}
assert.equal(field.retired[4], 0, 'visible particle survives');
assert.equal(field.retired[5], 0, 'active landing survives');
for (let frame = 0; frame < 30; frame++) {
  advance(field, 1 / 60, 0.72);
  advance(control, 1 / 60, 0.72);
  assert.deepEqual(field.frame.slice(12, 15), control.frame.slice(12, 15),
    'visible survivor retains its natural path');
  for (let i = 0; i < 4; i++) assert.equal(field.fade[i], 0, 'retired particles stay dark');
}
// A survivor can move outside the visible rectangle without the release
// cutoff running again: its natural xOut retirement still owns its exit.
place(4, 0, 1.1);
advance(field, 0, 0.72);
assert.equal(field.retired[4], 0, 'cutoff is one-shot');
place(4, 1.5, 0);
advance(field, 0, 0.72);
assert.equal(field.retired[4], 1, 'survivor retires at the natural exit');
console.log('hero spore cutoff: behavioral regression passed');
