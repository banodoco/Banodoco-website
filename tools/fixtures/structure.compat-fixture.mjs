// COMPATIBILITY FIXTURE — S01 (2026-08-21-elegance-run-01).
//
// Proves, on every test run, that two intentional divergences in the
// journey manifest continue to coexist rather than silently converging.
// This file is READ-ONLY evidence: it imports the live exports, asserts the
// divergence/distinction, and changes no value anywhere.
//
// ------------------------------------------------------------------------
// 1. Owned / Ownership — a DELIBERATE label divergence, not a bug.
// ------------------------------------------------------------------------
// journey/structure.js's 'owned' chapter carries `nav: 'Owned'` — the raw
// manifest label, which feeds route.js's ROUTE and is rail.js's fallback
// name. content/content.js's `chapters.owned.nav` carries `nav: 'Ownership'`
// — the LOCKED, user-visible label that actually wins at render time:
//
//   journey/rail.js:551
//   (CONTENT.chapters[c.id] || {}).nav || c.nav || 'Purpose'
//
// content/content.js is protected, locked copy (Hannah's copy authority —
// see its own file header and the "LOCK OVERRIDE" comments around
// `chapters.owned`). journey/structure.js's `nav` is raw manifest metadata
// that predates/parallels it. S01's reconciliation (2026-08-21) found this
// discrepancy and was directed to record it as compatibility evidence, NOT
// to normalize it — making the two values agree would edit user-visible
// content and is exactly the failure this order was written to prevent.
//
// If this fixture ever fails because the two values became EQUAL, that is a
// regression of this guarantee, not a bug fix. Stop and ask before touching
// either side.
//
// ------------------------------------------------------------------------
// 2. Seeded build order vs. visible menu order — must stay distinct.
// ------------------------------------------------------------------------
// JOURNEY_CHAPTER_IDS is the manifest's seeded BUILD order: every chapter,
// in the array order journey/structure.js declares them, including the
// nav-less 'final' chapter (route.js, CHAPTER_IDS, SEGMENTS and every other
// derived index all walk this same order).
//
// The VISIBLE MENU order is a strict subset: only chapters with a real
// `nav` label. 'final' declares `nav: null` and rail.js renders it as a
// quieter, unnamed `.j-rail-echo` link ("The nav-less chapter keeps the
// echo's quieter voice, as a style only" — journey/rail.js:539) rather than
// a named menu entry.
//
// Collapsing these into one sequence would either promote 'final' into a
// phantom named menu item, or drop it from the build manifest entirely.
// Both are regressions this fixture exists to catch.

import assert from 'node:assert/strict';
import { JOURNEY_SCHEMA, JOURNEY_CHAPTER_IDS } from '../../journey/structure.js';
import { CONTENT } from '../../content/content.js';

const ownedChapter = JOURNEY_SCHEMA.chapters.find((c) => c.id === 'owned');

export const OWNED_NAV_DIVERGENCE = Object.freeze({
  structureNav: ownedChapter.nav,
  contentNav: CONTENT.chapters.owned.nav,
});

assert.equal(OWNED_NAV_DIVERGENCE.structureNav, 'Owned',
  '[compat fixture] structure.js owned.nav drifted off its recorded raw value');
assert.equal(OWNED_NAV_DIVERGENCE.contentNav, 'Ownership',
  '[compat fixture] content.js owned.nav drifted off its recorded locked value');
assert.notEqual(OWNED_NAV_DIVERGENCE.structureNav, OWNED_NAV_DIVERGENCE.contentNav,
  '[compat fixture] Owned/Ownership divergence was normalized away — see file header, ' +
  'this must stay a deliberate divergence, not be made to agree');

export const BUILD_ORDER = JOURNEY_CHAPTER_IDS;
export const VISIBLE_MENU_ORDER = Object.freeze(JOURNEY_SCHEMA.chapters
  .filter((c) => c.nav !== null)
  .map((c) => c.id));

assert.deepEqual(BUILD_ORDER, ['mission', 'inspire', 'connect', 'owned', 'final'],
  '[compat fixture] seeded build order drifted off its recorded value');
assert.deepEqual(VISIBLE_MENU_ORDER, ['mission', 'inspire', 'connect', 'owned'],
  '[compat fixture] visible menu order drifted off its recorded value');
assert.notDeepEqual(BUILD_ORDER, VISIBLE_MENU_ORDER,
  '[compat fixture] build order and visible menu order collapsed into the same ' +
  'sequence — see file header, they must stay distinct');
assert.ok(BUILD_ORDER.length > VISIBLE_MENU_ORDER.length,
  '[compat fixture] build order should carry at least one chapter the visible menu omits');

console.log('journey structure compat fixture: ok');
