// State regression: navigation must earn a visible welcome, including a slow
// first frame and a quick return. Exercise the actual chapter clock body.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../journey/chapters/inspire/index.js', import.meta.url), 'utf8');
const start = source.indexOf('  const SURGE_TRAVEL_S');
const end = source.indexOf('\n  }', source.indexOf('  function driveSurge(', start)) + 4;
const make = new Function('landingReveal', `${source.slice(start, end)}; return { driveSurge, surgeT, surgePrev, _surge, duration: SURGE_TRAVEL_S };`);
let reveal = [0, 0, 0];
const clock = make(i => reveal[i]);
clock.driveSurge(1 / 60);
assert.deepEqual(clock.surgeT, [-1, -1, -1], 'invisible rims cannot spend their welcome');
reveal[1] = 1;
clock.driveSurge(1 / 60);
assert.equal(clock.surgeT[1], 0, 'a slow live frame that jumps to full reveal still launches');
for (let n = 0; n < 36; n++) clock.driveSurge(1 / 60);
assert.ok(clock._surge[1].amp > .9, 'light remains pronounced as the icon forms');
assert.equal(clock._surge[0], null, 'other projects do not illuminate together');
reveal[1] = 0;
clock.driveSurge(1 / 60);
assert.equal(clock._surge[1].amp, 0, 'departure removes the welcome with its rim');
for (let n = 0; n < 140; n++) clock.driveSurge(1 / 60);
assert.equal(clock._surge[1], null, 'nothing lingers after the welcome');
const frozen = make(() => 1);
frozen.driveSurge(0);
assert.ok(frozen._surge.every(s => s === null), 'frozen settled placements have no welcome');
// Use the actual entry lifecycle reset, with only its geometry assignments stubbed.
const entry = source.match(/beginEntry\(\) \{([\s\S]*?)\n {4}\},/)[1];
new Function('exits', 'land', 'surgeT', 'surgePrev', '_surge', entry)(
  [{ target: 0, fade: 0 }], [{ a: 1 }], clock.surgeT, clock.surgePrev, clock._surge);
reveal = [0, 1, 0];
clock.driveSurge(1 / 60);
assert.equal(clock.surgeT[1], 0, 'rapid reentry resets and launches instead of inheriting spent light');
console.log('PASS Inspire welcome: effective visibility, slow frames, formation, departure, snap, replay');
