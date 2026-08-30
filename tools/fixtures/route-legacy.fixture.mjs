// F03 (2026-08-21-elegance-run-01) — canonical-equivalence fixture for the
// commented-out `DOCUMENTED_ROUTE` array removed from journey/route.js.
//
// journey/route.js used to carry (lines 72-354, pre-removal) a fully
// commented-out `const DOCUMENTED_ROUTE = [ ... ];` literal: a dead
// alternative construction of the route table, interleaved with a long
// per-chapter tuning changelog (dates, "Hannah asked for X", before/after
// vh measurements). That changelog is NOT the only copy of that history —
// every dated entry names the design doc that already carries the full
// version (16-connect-ground-restage.md, 17-final-field.md,
// 18-one-species.md, 26-scroll-loop.md, 06-mission-preservation.md, all
// under journey-v6-plan/), so removing the in-file mirror loses no
// information a reader can no longer find. What this fixture pins is the
// narrower, checkable claim: the FINAL per-chapter object literals that
// closed out that changelog — the numbers DOCUMENTED_ROUTE actually
// declared once every dated revision had landed — are exactly what the
// live, canonical ROUTE (derived from journey/structure.js's
// JOURNEY_SCHEMA.chapters) produces today. If a future edit to
// structure.js ever drifted a chapter's span/nav/stops/scrollVh/segVh/shape
// away from the value this dead array last recorded, this fixture is what
// would catch it — the removal is safe because this equivalence holds, not
// because nobody is looking.
//
// Transcribed by hand from the removed comment block (not generated), so
// this is checked directly against git history: `git show
// 4b02a6a:journey/route.js` (the last commit before this removal) still has
// the source text this was copied from, lines 73-353.

import assert from 'node:assert/strict';
import { ROUTE } from '../../journey/route.js';

// The last-declared object literal for each of DOCUMENTED_ROUTE's five
// chapter entries, exactly as they stood in the removed comment. This array is
// HISTORY and is not re-baselined: it is the transcription the F03 removal was
// checked against, and rewriting it would delete the very record the removal
// leans on.
const DOCUMENTED_ROUTE_FINAL = [
  { id: 'mission', span: 14, nav: 'Intro', stops: [0.0], scrollVh: 3.5 },
  { id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 6.7, segVh: [3.5, 3.2] },
  {
    id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 10.85,
    segVh: [8.00, 2.85], shape: { seg: 0, k: [1.10, 1.00] },
  },
  {
    id: 'owned', span: 25, nav: 'Owned', scrollVh: 9.27,
    segVh: [2.27, 7.00], shape: { seg: 1, k: [1.6, 0.877] },
  },
  {
    id: 'final', span: 15, nav: null, stops: [0.8], scrollVh: 10.6,
    segVh: [10.0, 0.6], shape: { seg: 0, k: [1.305, 0.70] },
  },
];

/* WHAT THIS FIXTURE ASSERTS CHANGED ON 2026-08-30, AND WHY IT STILL CATCHES
   SOMETHING. Until Equip landed, the whole of ROUTE was provably identical to
   the transcription above and the assertion was a plain deepEqual. Equip is a
   deliberate re-timing of the ride's first half — a sixth chapter between
   Inspire and Connect, Inspire's span halved to make room, Mission's and
   Inspire's road re-split to keep the hero arrival's pacing flat, and Connect's
   first segment given road to compensate for a reveal bound that moved
   (journey/structure.js's header carries the full statement). Four of the six
   rows therefore CANNOT match a table transcribed before that decision, and a
   fixture that asserted they did would only ever be re-baselined.

   So the fixture is demoted rather than deleted, and it is demoted along a
   line that keeps it useful: 'owned' and 'final' were NOT touched by that
   re-timing and are still asserted verbatim against the transcription. They
   are the two chapters furthest from the change and the two whose absolute-p
   literals elsewhere (chapters/owned/leg.js, journey/portrait.js) depend on
   their spans staying put — exactly the drift the original assertion existed
   to catch, on the rows where catching it still matters.

   The four changed rows are recorded below with their new values, so a LATER
   unintended drift on them still reds. That list is the thing to update if the
   route is deliberately re-timed again; the transcription above is not. */
const UNTOUCHED_BY_EQUIP = ['owned', 'final'];
const byId = Object.fromEntries(ROUTE.map((c) => [c.id, c]));
for (const id of UNTOUCHED_BY_EQUIP) {
  assert.deepEqual(byId[id], DOCUMENTED_ROUTE_FINAL.find((c) => c.id === id),
    `[route-legacy fixture] '${id}' drifted off the removed DOCUMENTED_ROUTE array's ` +
    'final values — this chapter was untouched by the 2026-08-30 Equip re-timing, ' +
    'so nothing should have moved it');
}

// The post-Equip values for the rows the re-timing DID move, plus the row it
// added. Recorded here so a later unintended drift on them still reds.
const EQUIP_ERA = [
  { id: 'mission', span: 14, nav: 'Intro', stops: [0.0], scrollVh: 4.9 },
  { id: 'inspire', span: 12, nav: 'Inspire', scrollVh: 4.7, segVh: [2.1, 2.6] },
  { id: 'equip', span: 12, nav: 'Equip', stops: [0.5], scrollVh: 6.0, segVh: [2.6, 3.4] },
  {
    id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 15.85,
    segVh: [13.00, 2.85], shape: { seg: 0, k: [1.10, 1.00] },
  },
];
for (const row of EQUIP_ERA) {
  assert.deepEqual(byId[row.id], row,
    `[route-legacy fixture] '${row.id}' drifted off its recorded post-Equip value`);
}
assert.deepEqual(ROUTE.map((c) => c.id),
  ['mission', 'inspire', 'equip', 'connect', 'owned', 'final'],
  '[route-legacy fixture] the route order drifted off its recorded value');

console.log('route legacy (DOCUMENTED_ROUTE removal) equivalence fixture: ok');
