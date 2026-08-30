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
// chapter entries, exactly as they stood in the removed comment.
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

assert.deepEqual(ROUTE, DOCUMENTED_ROUTE_FINAL,
  '[route-legacy fixture] the live canonical ROUTE (from structure.js\'s ' +
  'JOURNEY_SCHEMA.chapters) no longer matches the removed DOCUMENTED_ROUTE ' +
  'array\'s final values — the F03 removal is no longer proven equivalent');

console.log('route legacy (DOCUMENTED_ROUTE removal) equivalence fixture: ok');
