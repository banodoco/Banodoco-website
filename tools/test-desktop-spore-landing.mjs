import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const url = new URL('../organism/hero-spores.js', import.meta.url);
const source = readFileSync(url, 'utf8').replace(/from\s+'(\.[^']+)'/g,
  (_, path) => `from '${new URL(path, url).href}'`);
const load = text => import('data:text/javascript;base64,' + Buffer.from(text
  + '\nexport { createField, advance, strikeNeed, createGround };').toString('base64'));
const actual = await load(source);
// Ablate only the new duration factor; both runs execute the real field.
const unscaled = await load(source.replace('const DESKTOP_FALL_SCALE = 1.15', 'const DESKTOP_FALL_SCALE = 1.0'));
for (const mode of ['desktop', 'deskNarrow', 'compact', 'tablet', 'mobile']) {
  for (const ready of [false, true]) {
    const view = { mode, camX: .15, camY: 2, camZ: 9, tgtX: 0, tgtY: 1,
      tanHalfFov: .5, aspect: mode === 'mobile' ? .46 : 1.6 };
    const a = unscaled.createField(view, 0x5be1), b = actual.createField(view, 0x5be1);
    a.sceneReady = b.sceneReady = ready;
    let aimed = false;
    for (let frame = 0; frame < 900; frame++) {
      unscaled.advance(a, 1 / 120, .72); actual.advance(b, 1 / 120, .72);
      const x = a.landings[0], y = b.landings[0];
      if (mode === 'mobile') {
        for (const key of ['frame', 'size', 'fade', 'color']) assert.deepEqual(b[key], a[key]);
        assert.equal(actual.strikeNeed(b), unscaled.strikeNeed(a));
      }
      if (!aimed && x.aimed && y.aimed) {
        aimed = true;
        assert.equal(y.t0, x.t0, 'selection and descent start stay unchanged');
        assert.ok(Math.abs(y.dur / x.dur - (mode === 'mobile' ? 1 : 1.15)) < 1e-12);
      }
      if (y.aimed && y.state === 1) {
        const remaining = Math.max(0, y.t0 + y.dur - b.t);
        assert.ok(actual.strikeNeed(b) >= remaining, 'growth estimate cannot precede impact');
        const mirror = { t: b.t, firstImpactAt: b.firstImpactAt,
          desktopFallScale: mode === 'mobile' ? 1 : 1.15, landings: b.landings };
        assert.equal(actual.strikeNeed(mirror), actual.strikeNeed(b), 'worker and main share the duration law');
      }
      if (b.firstImpactAt >= 0) {
        assert.ok(aimed);
        assert.equal(actual.strikeNeed(b), .5, 'the existing post-impact interval is unchanged');
        break;
      }
      assert.ok(frame < 899, 'landing completes');
    }
  }
}
console.log('PASS all desktop modes fall 15% slower; mobile exact; worker/main handoff cannot precede impact and adds no post-impact pause');

const desktopView = { mode: 'desktop', camX: .15, camY: 2, camZ: 9,
  tgtX: 0, tgtY: 1, tanHalfFov: .5, aspect: 1.6 };
for (const strikeAt of [.2, .4, .55, 2]) {
  const ground = actual.createGround(desktopView, false);
  assert.equal(ground.glowWave[0], 0, 'background wash keeps its original shader');
  assert.equal(ground.glowWave[1], 1, 'desktop contact uses a hollow moving wave');
  const normal = ground.glowEll.slice();
  ground.wake(0, 0); ground.relight(strikeAt);
  const before = ground.glowEll.slice();
  const beforeOpacity = ground.glowO[1];
  ground.strike(strikeAt); ground.relight(strikeAt);
  assert.deepEqual(ground.glowEll, before, 'fast or slow growth handoff cannot jump the pulse footprint');
  assert.equal(ground.glowO[1], beforeOpacity, 'strike cannot restart or brighten contact light');
  let previous = beforeOpacity;
  for (let age = strikeAt + .01; age < strikeAt + 2; age += .01) {
    ground.relight(age);
    assert.ok(ground.glowO[1] <= previous, 'contact only fades through and after growth handoff');
    if (age >= .5) assert.equal(ground.glowO[1], 0, 'spent contact light never reappears');
    previous = ground.glowO[1];
  }
  ground.relight(strikeAt + .3);
  assert.deepEqual(ground.glowEll, normal, 'baseline footprint is restored only while dark');
}
const contact = actual.createGround(desktopView, false);
contact.wake(0, 0); contact.relight(.5);
assert.equal(contact.glowO[1], 0, 'contact pulse has spent its light before a delayed growth handoff');
console.log('PASS single contact light fades continuously through early or late growth; no second start');

const mobileGround = actual.createGround({ ...desktopView, mode: 'mobile' }, false);
assert.ok(mobileGround.glowWave.every(value => value === 0), 'mobile retains its original filled-glow shader');
