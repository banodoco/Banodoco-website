import assert from 'node:assert/strict';
import { COPY_BANDS } from './constants.js';
import { CHAPTERS, CHAPTER_IDS, REST_STOPS, ROUTE, SEGMENTS } from './route.js';
import { SYMBOLS } from './symbols.js';
import { JOURNEY_SCHEMA, validateJourneyStructure } from './structure.js';

assert.deepEqual(ROUTE, [
  { id: 'mission', span: 14, nav: 'Intro', scrollVh: 3.5, stops: [0] },
  { id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 6.7, segVh: [3.5, 3.2] },
  { id: 'connect', span: 22, nav: 'Connect', scrollVh: 14.35, stops: [0.65], segVh: [11.5, 2.85], shape: { seg: 0, k: [1.6, 0.95] } },
  { id: 'owned', span: 25, nav: 'Owned', scrollVh: 9.27, segVh: [2.27, 7], shape: { seg: 1, k: [1.6, 0.877] } },
  { id: 'final', span: 15, nav: null, scrollVh: 10.6, stops: [0.8], segVh: [10, 0.6], shape: { seg: 0, k: [1.305, 0.7] } },
]);
assert.deepEqual(CHAPTER_IDS, ['mission', 'inspire', 'connect', 'owned', 'final']);
assert.deepEqual(CHAPTERS.map(({ start, end, stops }) => [start, end, ...stops]), [
  [0, 0.14, 0], [0.14, 0.38, 0.26], [0.38, 0.6, 0.523],
  [0.6, 0.85, 0.725], [0.85, 1, 0.97],
]);
assert.deepEqual(REST_STOPS, [0, 0.26, 0.523, 0.725, 0.97]);
assert.deepEqual(SEGMENTS.map(({ id, end, vh, k }) => [id, end, vh, k]), [
  ['mission', 0.14, 3.5, null], ['inspire', 0.26, 3.5, null], ['inspire', 0.38, 3.2, null],
  ['connect', 0.523, 11.5, [1.6, 0.95]], ['connect', 0.6, 2.85, null],
  ['owned', 0.725, 2.27, null], ['owned', 0.85, 7, [1.6, 0.877]],
  ['final', 0.97, 10, [1.305, 0.7]], ['final', 1, 0.6, null],
]);
assert.deepEqual(COPY_BANDS, {
  mission: { lo: -1, hi: 0.042 }, inspire: { lo: 0.248, hi: 0.338 },
  connect: { lo: 0.509, hi: 0.5810000000000001 }, owned: { lo: 0.716, hi: 0.792 },
  final: { lo: 0.959, hi: 2 },
});
assert.deepEqual(Object.keys(SYMBOLS), [...CHAPTER_IDS, 'menu']);
assert.deepEqual(JOURNEY_SCHEMA.chapters.filter((c) => c.hotspots.kind === 'fixed')
  .map((c) => [c.id, c.hotspots.ids]), [
  ['inspire', ['artcompute', 'arca', 'tworp']],
  ['connect', ['ados', 'hivemind', 'discord']],
]);

const clone = () => structuredClone(JOURNEY_SCHEMA);
const rejects = (mutate, pattern) => {
  const candidate = clone(); mutate(candidate);
  assert.throws(() => validateJourneyStructure(candidate), pattern);
};
rejects((s) => { s.chapters[1].id = 'mission'; }, /duplicate chapter id/);
rejects((s) => { s.chapters[2].hotspots.ids[1] = 'ados'; }, /duplicate node id/);
rejects((s) => { s.aliases.nodes.community = 'missing'; }, /alias points nowhere/);
rejects((s) => { s.chapters[3].hotspots.cardinality = 15; }, /unsupported fixed cardinality/);
rejects((s) => { s.chapters[1].hotspots.ids.pop(); }, /unsupported fixed cardinality/);
assert.throws(() => validateJourneyStructure(JOURNEY_SCHEMA, { builders: {} }), /missing builder reference/);
assert.throws(() => validateJourneyStructure(JOURNEY_SCHEMA, { symbols: {} }), /missing symbol reference/);
const runtimeNodes = {
  inspire: ['artcompute', 'arca', 'tworp'], connect: ['ados', 'hivemind', 'discord'],
  owned: Array.from({ length: 16 }, (_, i) => `contributor-${i}`),
};
assert.equal(validateJourneyStructure(JOURNEY_SCHEMA, { nodes: runtimeNodes }), true);
const missingNodes = { ...runtimeNodes }; delete missingNodes.inspire;
assert.throws(() => validateJourneyStructure(JOURNEY_SCHEMA, { nodes: missingNodes }), /missing node registry reference/);
assert.throws(() => validateJourneyStructure(JOURNEY_SCHEMA, { nodes: { ...runtimeNodes, owned: Array(16).fill('contributor-0') } }), /duplicate node id/);
const badPattern = clone(); badPattern.aliases.patterns[0].replacement = 'nobody-$1';
assert.throws(() => validateJourneyStructure(badPattern, { nodes: runtimeNodes }), /alias points nowhere/);

console.log('journey structure invariants: ok');
