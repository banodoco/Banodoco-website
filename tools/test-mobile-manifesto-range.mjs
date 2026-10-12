import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONTENT } from '../content/content.js';
import { manifestoPose, mobileReadingSchedule, lineSecondsFor, WORD_STAGGER_SECONDS, WORD_REVEAL_SECONDS, WORD_VISIBLE_SECONDS, WORD_VISIBLE_FRACTION, ascentAt, descentU, smoother, CAMERA_SECONDS, aerialPlacements, planAerialReveals } from '../journey/manifesto/pose.js';
const makeRng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const groundY = () => 0;
const from = { position: { x: 8, y: 3, z: 9 }, target: { x: 0, y: 2, z: 0 }, fov: 46 };
const aspect = 390 / 844;
const counts = CONTENT.manifesto.lines.map(line => line.trim().split(/\s+/).length);
const beats = counts.map((count, i) => i === 0 ? count : count - 1);
const reading = mobileReadingSchedule(lineSecondsFor(counts), beats);
for (let i = 1; i < counts.length; i++) {
  const previousVisible = reading.reveal[i - 1] + beats[i - 1] * WORD_STAGGER_SECONDS + WORD_VISIBLE_SECONDS;
  assert.ok(reading.admit[i] >= previousVisible, 'prior copy is visibly readable when scroll begins');
  assert.equal(reading.admit[i], Math.max(previousVisible, reading.reveal[i] - 2));
  assert.ok(reading.reveal[i] - reading.admit[i] > 1.8, 'scroll has a clear lead before incoming copy');
}
assert.deepEqual(reading.reveal, lineSecondsFor(counts), 'original text reveal beats are unchanged');
const inkKeys = readFileSync(new URL('../journey/site.css', import.meta.url), 'utf8').split('@keyframes j-manifesto-ink {')[1];
assert.match(inkKeys, new RegExp(`${Math.round(WORD_VISIBLE_FRACTION * 100)}%\\s*\\{\\s*opacity:\\s*1;`), 'readability clock follows the actual CSS opacity key');
assert.equal(reading.seconds, reading.reveal.at(-1) + beats.at(-1) * WORD_STAGGER_SECONDS + WORD_REVEAL_SECONDS,
  'mobile camera endpoint is the last complete word fade');
const end = manifestoPose(from, CAMERA_SECONDS, aspect);
assert.equal(end.position.y, 38);
assert.ok(Math.hypot(end.position.x, end.position.z) < 40);
assert.deepEqual(manifestoPose(from, 0, aspect).position, from.position);
for (let t = 2; t < CAMERA_SECONDS; t += 1) {
  assert.ok(manifestoPose(from, t, aspect).position.y > manifestoPose(from, t - 0.5, aspect).position.y,
    `mobile camera continues climbing at ${t}s`);
}
assert.deepEqual(end, manifestoPose(from, CAMERA_SECONDS + 5, aspect));
for (const view of [aspect, 1.6]) {
  for (const start of [0.2, 0.6, 1]) {
    for (const progress of [0, 0.1, 0.5, 0.9, 1]) {
      const u = descentU(start, progress, view, from.position.y);
      // Phone return inverts the COMPLETE authored height, including the
      // opening lift; desktop keeps its original normalized ascent law.
      const height = seconds => view === aspect
        ? manifestoPose(from, seconds, view).position.y - from.position.y
        : ascentAt(seconds, view);
      const expected = height(start * CAMERA_SECONDS) * (1 - smoother(progress));
      assert.ok(Math.abs(height(u * CAMERA_SECONDS) - expected) < 1e-6,
        'return retraces its viewport height, including the phone opening lift');
    }
  }
}
assert.equal(ascentAt(10, aspect), smoother(10 / CAMERA_SECONDS),
  'mobile navigation and camera use the same gradual ascent');
assert.ok(ascentAt(10, 1.6) > ascentAt(10, aspect), 'desktop retains its earlier lift');

const bodies = aerialPlacements([], makeRng(0x41e21a), groundY);
const mobilePlan = planAerialReveals(bodies, from, aspect, new Float32Array(bodies.length * 2));
const desktopPlan = planAerialReveals(bodies, from, 1.6, new Float32Array(bodies.length * 2));
const count = plan => bodies.filter((_, i) => plan[i * 2] <= CAMERA_SECONDS).length;
assert.ok(count(mobilePlan) > 30, 'nearby field still has organic detail');
assert.ok(count(mobilePlan) <= 140, 'phone never draws the full aerial field');
assert.equal(count(desktopPlan), bodies.length, 'desktop full field preserved');
console.log(`Mobile manifesto: 38-unit elevation, <40-unit radius, full ${reading.seconds.toFixed(2)}s reading motion; ${count(mobilePlan)}/${count(desktopPlan)} scheduled bodies.`);
