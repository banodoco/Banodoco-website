import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { COPY_BANDS } from './constants.js';
import { CHAPTERS, CHAPTER_IDS, REST_STOPS, ROUTE, SEGMENTS } from './route.js';
import { SYMBOLS } from './symbols.js';
import { JOURNEY_SCHEMA, JOURNEY_CHAPTER_IDS, deepFreeze, validateJourneyStructure } from './structure.js';
import '../tools/fixtures/structure.compat-fixture.mjs';
// S02 (2026-08-21-elegance-run-01): route/copy/symbol/constant compatibility
// fixtures, pinning current exported values before the F-series removes
// competing sources of them. Each import runs its own assertions as a
// side effect; see docs/code-health/evidence/2026-08-21-elegance-run-01/s02/.
//
// DIET-01 (2026-08-22) moved the five fixture files out of journey/ into
// tools/fixtures/. Production directories hold production; a fixture is an
// instrument. Only these specifiers changed — the fixtures' own assertions
// and this file's are byte-identical.
import '../tools/fixtures/route.compat-fixture.mjs';
import '../tools/fixtures/symbols.compat-fixture.mjs';
import '../tools/fixtures/constants.compat-fixture.mjs';
import '../tools/fixtures/aliases.compat-fixture.mjs';

assert.deepEqual(ROUTE, [
  { id: 'mission', span: 14, nav: 'Intro', scrollVh: 3.5, stops: [0] },
  { id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 6.7, segVh: [3.5, 3.2] },
  { id: 'connect', span: 22, nav: 'Connect', scrollVh: 10.85, stops: [0.65], segVh: [8, 2.85], shape: { seg: 0, k: [1.1, 1] } },
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
  ['connect', 0.523, 8, [1.1, 1]], ['connect', 0.6, 2.85, null],
  ['owned', 0.725, 2.27, null], ['owned', 0.85, 7, [1.6, 0.877]],
  ['final', 0.97, 10, [1.305, 0.7]], ['final', 1, 0.6, null],
]);
assert.deepEqual(COPY_BANDS, {
  mission: { lo: -1, hi: 0.042 }, inspire: { lo: 0.248, hi: 0.338 },
  connect: { lo: 0.509, hi: 0.5810000000000001 }, owned: { lo: 0.716, hi: 0.792 },
  final: { lo: 0.959, hi: 2 },
});
// 'equip' rides after the chapter-derived set: the navigator's one
// non-chapter mark (a placeholder slot, owner's navigation restage
// 2026-08-26). It is declared explicitly in symbols/data.js because the
// schema map cannot reach a mark with no chapter behind it.
assert.deepEqual(Object.keys(SYMBOLS), [...CHAPTER_IDS, 'menu', 'equip']);
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

// ---------------------------------------------------------------------
// RAW MANIFEST VALIDATION — perturbation proof. Every case below is a
// malformed RAW value (not a caller-supplied reference) that must fail
// loudly, naming the offending field. A validator that cannot reject these
// is not a validator.
// ---------------------------------------------------------------------
rejects((s) => { s.chapters[2].segVh.pop(); }, /segVh\/stops count mismatch for connect/); // missing stop's sub-segment
rejects((s) => { s.chapters[1].copyBand.lo = 0.2; }, /non-monotonic copyBand for inspire/); // non-monotonic band
rejects((s) => { s.chapters[1].segVh[0] = 99; }, /segVh does not sum to scrollVh for inspire/); // total that doesn't sum
rejects((s) => { s.chapters[0].span = '14'; }, /invalid span for mission/); // wrong type
rejects((s) => { s.chapters[1].runtime = 'true'; }, /invalid runtime flag for inspire/); // wrong type
rejects((s) => { s.chapters[2].stops[0] = 1.2; }, /invalid stop for connect/); // stop out of [0,1)
rejects((s) => { delete s.chapters[0].copyPosition; }, /missing required field 'copyPosition' for mission/); // gap
rejects((s) => { s.chapters[2].shape.seg = 5; }, /invalid shape\.seg for connect/); // out-of-range sub-segment index
/* copySurface (order U04). Driven, not allowlisted: these four rejections
   arrived with the field, and `tools/test-coverage-floor.mjs` would otherwise
   have banked them as four new rows of recorded debt. A validator whose arms
   have never fired is the thing that suite exists to count, and paying the
   ratchet forward is cheaper here than in any later order. `host` and
   `flightLead` are checked by MEMBERSHIP rather than by type, so the typo case
   — the one that would silently route a chapter to the wrong painter — is the
   case actually covered. */
rejects((s) => { delete s.chapters[0].copySurface; }, /missing required field 'copySurface' for mission/); // gap
rejects((s) => { s.chapters[0].copySurface = 'hero'; }, /invalid copySurface for mission/); // not an object
rejects((s) => { s.chapters[1].copySurface.host = 'blocks'; }, /invalid copySurface\.host for inspire/); // plausible typo
rejects((s) => { s.chapters[1].copySurface.deferred = 'no'; }, /invalid copySurface\.deferred for inspire/); // wrong type
rejects((s) => { s.chapters[2].copySurface.flightLead = 'standard '; }, /invalid copySurface\.flightLead for connect/); // trailing space
rejects((s) => { s.chapters = []; }, /schema\.chapters must be a non-empty array/); // empty manifest
rejects((s) => { s.menuSymbol = ''; }, /invalid menuSymbol/); // empty required string

// ---------------------------------------------------------------------
// IMMUTABILITY — every exported registry is deep-frozen. A write attempt
// anywhere in the tree (top-level field, nested object, nested array) must
// throw in this file's own strict-mode ESM context, exactly as it would in
// any real consumer module.
// ---------------------------------------------------------------------
assert.throws(() => { JOURNEY_SCHEMA.chapters[0].id = 'hacked'; }, TypeError);
assert.throws(() => { JOURNEY_SCHEMA.chapters.push({}); }, TypeError);
assert.throws(() => { JOURNEY_SCHEMA.chapters[1].copyBand.hi = 99; }, TypeError);
assert.throws(() => { JOURNEY_SCHEMA.chapters[1].hotspots.ids[0] = 'x'; }, TypeError);
assert.throws(() => { JOURNEY_SCHEMA.chapters[1].hotspots.ids.push('x'); }, TypeError);
assert.throws(() => { JOURNEY_SCHEMA.aliases.nodes.community = 'hacked'; }, TypeError);
assert.throws(() => { JOURNEY_CHAPTER_IDS.push('ghost'); }, TypeError);
assert.throws(() => { JOURNEY_CHAPTER_IDS[0] = 'hacked'; }, TypeError);

// ---------------------------------------------------------------------
// D32 repair — deepFreeze() must skip RegExp instances. Object.freeze()
// on a RegExp locks its `lastIndex` property; `.test()`/`.exec()` write
// `lastIndex` on every call for a global (`g`) or sticky (`y`) pattern, so
// a frozen global/sticky RegExp throws TypeError on first use. Today's one
// RegExp export (the alias pattern) carries no such flag, so the bug was
// latent. This is the future-hazard case the repair exists to prevent:
// construct a `g`-flagged RegExp, freeze it via the exported deepFreeze(),
// and confirm it stays usable.
// ---------------------------------------------------------------------
const globalPattern = deepFreeze(/^person-(\d+)$/g);
assert.equal(Object.isFrozen(globalPattern), false,
  'deepFreeze must leave a RegExp UNFROZEN — freezing it is exactly the latent break this repair removes');
assert.doesNotThrow(() => globalPattern.test('person-0'), 'a frozen global RegExp must not throw on .test()');
assert.equal(globalPattern.lastIndex, 8, '.test() should still advance lastIndex normally (source has 8 chars before the match end)');
globalPattern.lastIndex = 0; // reset for a second pass, proving lastIndex is genuinely still writable
assert.doesNotThrow(() => globalPattern.exec('person-3'), 'a frozen global RegExp must not throw on .exec()');

// ---------------------------------------------------------------------
// ONE ALIAS TABLE, TWO DOORS.
//
// A node alias reaches the visitor through two doors: a deep link read once
// at boot (journey.js -> normaliseNode), and a hash that arrives afterwards
// (state.js parseHash -> the hashchange handler). state.js used to spell two
// of the schema's rules out by hand, so an alias ADDED to the table was
// honoured by the first door and ignored by the second — a divergence no
// assertion over today's table could see, because both doors agree on the
// rules that are already written twice.
//
// So this adds one. The schema is deep-frozen, and deliberately: the probe
// injects the alias into a SECOND copy of the module graph through a loader
// hook, drives both doors against it, and then drives them against the real
// modules as the negative control. Line 3 is the positive control D120 asks
// for — a `.replace()` whose anchor moved would no-op and leave a probe that
// silently agrees with everything.
// ---------------------------------------------------------------------
const PROBE = 'e02-alias-probe';
const PROBE_ALIAS = 'e02-probe-alias';
const PROBE_TARGET = 'tworp';            // a real node, so the schema still validates
let patchLanded = false;

registerHooks({
  resolve(spec, ctx, next) {
    const r = next(spec, ctx);
    // Inside the probe graph every relative import keeps the query, so
    // navigation.js and state.js close over the PATCHED structure.js.
    if (!ctx.parentURL?.includes(PROBE) || !spec.startsWith('.') || r.url.includes(PROBE)) return r;
    return { ...r, url: `${r.url}?${PROBE}=1` };
  },
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (!url.includes(PROBE) || !url.includes('/structure.js')) return r;
    const src = String(r.source);
    const patched = src.replace(/(aliases:\s*\{\s*\n\s*nodes:\s*\{)/,
      `$1 '${PROBE_ALIAS}': '${PROBE_TARGET}',`);
    patchLanded = patched !== src;
    return { ...r, source: patched };
  },
});

const probeSchema = (await import(`./structure.js?${PROBE}=1`)).JOURNEY_SCHEMA;
const probeNav = await import(`./navigation.js?${PROBE}=1`);
const probeState = await import(`./state.js?${PROBE}=1`);
const realNav = await import('./navigation.js');
const realState = await import('./state.js');

assert.equal(patchLanded, true,
  'the probe must actually inject its alias — a no-op replace would leave a test that agrees with anything');
assert.equal(probeSchema.aliases.nodes[PROBE_ALIAS], PROBE_TARGET,
  'the injected alias must be visible in the probe graph\'s schema');
assert.equal(JOURNEY_SCHEMA.aliases.nodes[PROBE_ALIAS], undefined,
  'and must NOT be visible in the real one — the probe is a second graph, not a mutation');

/** parseHash() with a hash on the address bar. Both globals are restored below. */
const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const priorLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
globalThis.window = { addEventListener() {} };
globalThis.location = { hash: '' };
const nodeFromHash = (mod, hash) => {
  globalThis.location.hash = hash;
  return mod.createJourneyState().parseHash().node;
};

// Door 1 — normaliseNode. Door 2 — parseHash. Both must honour the new alias.
assert.equal(probeNav.normaliseNode('inspire', PROBE_ALIAS), PROBE_TARGET,
  'door 1 (normaliseNode) must honour an alias added to the schema');
assert.equal(nodeFromHash(probeState, `#/inspire/${PROBE_ALIAS}`), PROBE_TARGET,
  'door 2 (parseHash) must honour the SAME alias — this is the row that was red before E02');

// The negative control: without the injection neither door invents the rule.
assert.equal(realNav.normaliseNode('inspire', PROBE_ALIAS), PROBE_ALIAS,
  'the real graph has no such alias, so door 1 passes the id through unchanged');
assert.equal(nodeFromHash(realState, `#/inspire/${PROBE_ALIAS}`), PROBE_ALIAS,
  'and door 2 agrees — the probe is measuring the table, not a coincidence');

// The rules parseHash used to spell out itself, now read through the table.
assert.equal(nodeFromHash(realState, '#/inspire/2rp'), 'tworp');
assert.equal(nodeFromHash(realState, '#/owned/person-7'), 'contributor-7');
assert.equal(nodeFromHash(realState, '#/connect/community'), 'discord');
assert.equal(nodeFromHash(realState, '#/final/anything-at-all'), null,
  'the epilogue has no detail state, and that rule lives in navigation.js with the rest');
assert.equal(realState.createJourneyState().parseHash().unknown, null);

if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow); else delete globalThis.window;
if (priorLocation) Object.defineProperty(globalThis, 'location', priorLocation); else delete globalThis.location;

console.log('journey structure invariants: ok');
