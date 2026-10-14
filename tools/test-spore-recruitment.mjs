import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const url = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(url, 'utf8').replace(/from\s+'(\.[^']+)'/g,
  (_, path) => `from '${new URL(path, url).href}'`);
const { createField, advance } = await import('data:text/javascript;base64,' +
  Buffer.from(source + '\nexport { createField, advance };').toString('base64'));
for (const mode of ['desktop', 'deskNarrow', 'compact', 'tablet']) {
  for (const ready of [false, true]) for (const seed of [123, 0x5be1, 9876]) {
    const view = { mode, camX: .15, camY: 2, camZ: 9, tgtX: 0, tgtY: 1,
      tanHalfFov: .5, aspect: 1.6 };
    const field = createField(view, seed), stream = createField(view, seed);
    field.sceneReady = stream.sceneReady = ready; stream.landings = [];
    let previous = null, selected = false, fell = false, complete = false;
    for (let frame = 0; frame < 1800; frame++) {
      advance(field, 1 / 240, .72); advance(stream, 1 / 240, .72);
      const landing = field.landings[0];
      if (landing.state !== 1) continue;
      const i = landing.hi, age = field.t - landing.kAt;
      if (!selected) {
        for (const key of ['size', 'fade']) assert.equal(field[key][i], stream[key][i], 'selection keeps stream photometry');
        assert.deepEqual(field.color.slice(i * 3, i * 3 + 3), stream.color.slice(i * 3, i * 3 + 3));
        assert.deepEqual(field.frame.slice(i * 3, i * 3 + 3), stream.frame.slice(i * 3, i * 3 + 3), 'selection keeps its actual stream position');
        selected = true;
      }
      if (landing.aimed && age > 0) fell = true;
      if (previous) {
        assert.ok(Math.abs(field.fade[i] - previous.fade) < .035, 'light is continuous, including first fall frame');
        assert.ok(Math.abs(field.size[i] - previous.size) < .0015, 'core size is continuous, including first fall frame');
        assert.ok(field.size[i] >= previous.size, 'core recruitment never restarts');
      }
      previous = { fade: field.fade[i], size: field.size[i] };
      if (age >= 1.2) {
        assert.ok(field.size[i] <= Math.max(landing.size0, .075), 'desktop core stays within its smaller peak');
        if (landing.size0 < .075) assert.ok(field.size[i] < .075 - .001, 'slower fade is still resolving the core at 1.2 seconds');
        complete = true; break;
      }
    }
    assert.ok(selected && fell && complete, 'selection and early descent exercised');
  }
}
console.log('PASS 24 desktop recruitment cases: stream identity, continuous size/light through first fall, smaller final core');
