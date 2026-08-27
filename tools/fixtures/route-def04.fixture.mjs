// F03 (2026-08-21-elegance-run-01) — DEF-04 removal fixture.
//
// journey/route.js's SEGMENTS derivation used to carry two `console.error`
// guards (formerly ~line 580 and ~line 585): a segVh/stops count-mismatch
// check and a segVh/scrollVh sum-mismatch check. Both were genuinely dead
// under the current wiring — proved out-of-repo in
// docs/code-health/evidence/2026-08-21-elegance-run-01/f03/def04-reachability/
// by importing isolated copies of route.js + the current (S01, hard-validating)
// structure.js with a deliberately malformed chapter: structure.js's own
// validateJourneyStructure() throws during ITS module body, which ES module
// import-evaluation order guarantees completes before route.js's own module
// body (including the SEGMENTS flatMap that held these guards) ever runs.
// The two branches could not have fired in the running system; they are
// removed, not "fixed into a throw" (that would be a behavior change).
//
// This fixture pins the two invariants those guards used to check, computed
// HERE independently of route.js's internals, against the CURRENT live
// CHAPTERS export — proving the manifest that ships today never falls into
// either branch, so the removal changes no observable output. (The
// unmodified S02 fixture, journey/route.compat-fixture.mjs, separately pins
// SEGMENTS's full contents byte-for-byte — this fixture is not a substitute
// for that, it is the DEF-04-specific reachability/invariant proof.)

import assert from 'node:assert/strict';

// Capture any console.error call made while route.js's module body first
// evaluates in THIS process, so this run itself also serves as a live
// (not just isolated-copy) witness that no console.error fires on the
// real, current manifest.
const seenErrors = [];
const realError = console.error;
console.error = (...args) => { seenErrors.push(args.join(' ')); realError(...args); };

const { CHAPTERS } = await import('../../journey/route.js');

console.error = realError;
assert.deepEqual(seenErrors, [],
  '[route-def04 fixture] route.js logged a console.error while loading — ' +
  'the DEF-04 guards would have had something to catch; do not remove them');

// Independently recompute what route.js's SEGMENTS derivation checks, for
// every chapter that declares segVh, from the live CHAPTERS export.
//
// QA-01 Engine 3 (R1 review, MAJOR 2): a predicate looped over a discovered
// collection is vacuously true if the collection is empty — this loop would
// have printed "ok" and exited 0 even if NO chapter declared segVh, which is
// fully valid under structure.js's own validateJourneyStructure() (segVh is
// an optional field; see journey/structure.js REQUIRED_CHAPTER_KEYS, which
// does not include it). Pin the cardinality to a literal so that regressing
// to zero segVh-bearing chapters is a loud failure, not a silent 0-iteration
// pass. Today: mission has no segVh; inspire, connect, owned and final do —
// 4 of structure.js's 5 chapters (journey/structure.js's `chapters` array).
const segVhChapters = CHAPTERS.filter((c) => c.segVh);
assert.equal(segVhChapters.length, 4,
  `[route-def04 fixture] expected exactly 4 of CHAPTERS' 5 entries to declare ` +
  `segVh (mission is the one exception), found ${segVhChapters.length} — either ` +
  'the manifest changed and this pin needs a deliberate update, or the segVh ' +
  'invariant loop below is about to run zero times and prove nothing');
for (const c of segVhChapters) {
  const expectedSubSegments = (c.stopsLocal.length || 1) + 1;
  assert.equal(c.segVh.length, expectedSubSegments,
    `[route-def04 fixture] ${c.id}: segVh has ${c.segVh.length} entries, ` +
    `expected ${expectedSubSegments} (stops + 1) — this is exactly what the ` +
    'removed count-mismatch guard checked');
  const sum = c.segVh.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - c.scrollVh) <= 1e-9,
    `[route-def04 fixture] ${c.id}: segVh sums to ${sum}, scrollVh is ` +
    `${c.scrollVh} — this is exactly what the removed sum-mismatch guard checked`);
}

console.log('route DEF-04 (dead console.error guards) removal fixture: ok');
