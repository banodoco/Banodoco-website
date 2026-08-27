// DEF-01-FIX — the rail is focusable again on the SAME TICK the detail closes.
// Run with: node tools/test-detail-close-focus.mjs
//           node tools/test-detail-close-focus.mjs --root <other-checkout>
//
// WHY IT IS SHAPED LIKE THIS. journey/ui.js and journey/rail.js build live DOM
// at construction and journey/journey.js imports `three` through the page's
// import map, so none of the three can be instantiated in node (C01
// limitations.md §1). This test therefore does what C01 established as the
// achievable ceiling, and then one step better: it EXTRACTS the real source
// text of the four functions that decide the rail's focusability —
// rail.releaseModal(), the `!menuIsOpen` / `dimmed` blocks of rail.update(),
// ui.releaseRailAfterDetail() and ui.syncRailVisibility() — and RUNS that text
// against DOM doubles. The bodies are not paraphrased; if they change, this
// test runs the changed code.
//
// `--root` points the extraction at another checkout. That is how the pre-fix
// failure is demonstrated without touching the working tree:
//   git --work-tree=... show HEAD:journey/rail.js > <tmp>/journey/rail.js  (etc.)
//   node tools/test-detail-close-focus.mjs --root <tmp>      -> exits 1
//
// WHAT IS PINNED
//   D1  a synchronous release exists at all, and closeCard() reaches it
//   D2  after a synchronous detail close the rail is focusable IN THE SAME TICK
//   D3  idempotence: the next frame — and the one after — write nothing
//   D4  the OPEN path is untouched: update() still claims inert, on its frame
//   D5  the release can only ever release; it never claims
//   D6  the popover tier (detail && popPinned) never made the rail inert and
//       is not disturbed
//   D7  the menu still owns root.inert for its whole lifetime
//   D8  the release is gated on the frame's OWN predicate, so it can never
//       diverge from what the next update() would compute
//   D9  the focus RETURN is untouched — the release runs after it (DEF-02 is
//       a separate, deferred defect and this must not move it)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const rootFlag = argv.indexOf('--root');
const ROOT = rootFlag >= 0 && argv[rootFlag + 1]
  ? resolve(argv[rootFlag + 1])
  : join(dirname(fileURLToPath(import.meta.url)), '..');

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/* ------------------------------------------------------------------ *
 * A very small ledger. Self-contained on purpose: this test must be   *
 * runnable against a checkout that does not have C01's harness.       *
 * ------------------------------------------------------------------ */
let passed = 0;
const failures = [];
function check(id, what, ok, detail = '') {
  if (ok) { passed++; console.log(`PASS [${id}] ${what}${detail ? ` — ${detail}` : ''}`); }
  else { failures.push(`[${id}] ${what}${detail ? ` — ${detail}` : ''}`); console.log(`FAIL [${id}] ${what}${detail ? ` — ${detail}` : ''}`); }
}
/* Extraction failures are recorded as FAILURES, never crashes: on the pre-fix
   source the functions this test needs do not exist, and "they do not exist" is
   exactly the result this test is here to report. */

/* ------------------------------------------------------------------ *
 * Source extraction. Brace-matching runs over a MASKED copy (comments  *
 * and string/template literals blanked, length preserved) so a brace   *
 * inside a comment or a string cannot end a body early; the slice is   *
 * then taken from the ORIGINAL text, so what we compile is real code.  *
 * ------------------------------------------------------------------ */
function mask(src) {
  const out = src.split('');
  let i = 0;
  const blank = (from, to) => { for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '; };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; blank(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      blank(i, j); i = j; continue;
    }
    i++;
  }
  return out.join('');
}

function balancedFrom(masked, open) {
  let depth = 0;
  for (let i = open; i < masked.length; i++) {
    if (masked[i] === '{') depth++;
    else if (masked[i] === '}' && --depth === 0) return i;
  }
  throw new Error('unbalanced block');
}

/** The body text (braces excluded) of the one `function <name>(` in `src`. */
function bodyOf(src, name) {
  const m = mask(src);
  const needle = `function ${name}(`;
  const hits = [];
  for (let i = m.indexOf(needle); i >= 0; i = m.indexOf(needle, i + 1)) hits.push(i);
  if (hits.length === 0) throw new Error(`no function ${name}() in this source`);
  if (hits.length > 1) throw new Error(`function ${name}() is not unique (${hits.length} declarations)`);
  const open = m.indexOf('{', m.indexOf(')', hits[0]));
  return src.slice(open + 1, balancedFrom(m, open));
}

/** The whole statement beginning at the literal `head`, braces included. */
function blockFrom(src, head) {
  const m = mask(src);
  const at = m.indexOf(head);
  if (at < 0) throw new Error(`no \`${head}\` in this source`);
  const open = m.indexOf('{', at);
  return src.slice(at, balancedFrom(m, open) + 1);
}

const railSrc = read('journey/rail.js');
const uiSrc = read('journey/ui.js');
/* U03 moved the card's state machine — and with it syncRailVisibility,
   releaseRailAfterDetail and the body of the close — into its own vessel, and
   the focus return into a single owner. Every claim below is unchanged in what
   it asserts; what changed is which file it reads it from, and in two places
   the claim is now pinned across the hop as well. */
const cardSrc = read('journey/ui/card-tier.js');
const selSrc = read('journey/ui/selection.js');
const journeySrc = read('journey/journey.js');

/* ------------------------------------------------------------------ *
 * DOM doubles. `root` counts its own writes, so "the frame wrote      *
 * nothing" is a measurement and not an inference.                     *
 * ------------------------------------------------------------------ */
function makeRoot() {
  const classes = new Set();
  const writes = { inert: 0, className: 0, visibility: 0 };
  let inert = false;
  let visibility = '';
  return {
    get inert() { return inert; },
    set inert(v) { writes.inert++; inert = v; },
    style: {
      get visibility() { return visibility; },
      set visibility(v) { writes.visibility++; visibility = v; },
    },
    classList: {
      add(c) { writes.className++; classes.add(c); },
      remove(c) { writes.className++; classes.delete(c); },
      toggle(c, on) { writes.className++; if (on) classes.add(c); else classes.delete(c); },
      contains(c) { return classes.has(c); },
    },
    has: (c) => classes.has(c),
    writes,
    resetWrites() { writes.inert = 0; writes.className = 0; writes.visibility = 0; },
  };
}

const soft = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

/* THE MODEL IS BUILT FROM WHATEVER THE SOURCE ACTUALLY HAS. It is not
   conditioned on the fix being present: on the PRE-fix source it faithfully
   models a close path that touches the rail not at all, which is precisely
   what pre-fix closeCard() does — so D2 below reports the defect as a
   MEASUREMENT (`inert=true` after the close tick), not as "a function is
   missing". That is what makes this a regression test rather than a
   presence check. */

/** The rail's real focusability code, running in a closure of its own. */
function compileRail() {
  const railUpdate = bodyOf(railSrc, 'update');
  const inertBlock = blockFrom(railUpdate, 'if (!menuIsOpen) {');
  const dimBlock = blockFrom(railUpdate, 'if (modalDetail !== dimmed) {');
  const releaseBody = soft(() => bodyOf(railSrc, 'releaseModal'));
  const make = new Function('root', `
    let menuIsOpen = false;
    let dimmed = null;
    function update(modalDetail) {
      ${inertBlock}
      ${dimBlock}
    }
    function releaseModal() {
      ${releaseBody === null ? '/* this source has no synchronous release */' : releaseBody}
    }
    return {
      root, update, releaseModal,
      setMenuOpen(v) { menuIsOpen = v; },
      get dimmed() { return dimmed; },
    };
  `);
  return {
    hasRelease: releaseBody !== null,
    make: () => make(makeRoot()),
  };
}

/** ui.js's close-path half, running against that rail. The visibility writer
 *  is taken from wherever THIS source keeps it: its own function once the fix
 *  extracts one, otherwise the `if (rail.root) {` block still inlined in
 *  ui.update(). Either way it is the real text. */
function compileClosePath() {
  const uiUpdate = bodyOf(uiSrc, 'update');
  const closeBody = soft(() => bodyOf(cardSrc, 'close')) ?? bodyOf(uiSrc, 'closeCard');
  const syncBody = soft(() => bodyOf(cardSrc, 'syncRailVisibility'))
    ?? soft(() => bodyOf(uiSrc, 'syncRailVisibility'))
    ?? blockFrom(uiUpdate, 'if (rail.root) {');
  const releaseBody = soft(() => bodyOf(cardSrc, 'releaseRailAfterDetail'))
    ?? soft(() => bodyOf(uiSrc, 'releaseRailAfterDetail'));
  // Does the close path hand the rail back at all? Pre-fix: no. Post-U03 the
  // close is the vessel's and journey.js reaches it through ui.js's one-line
  // door, so BOTH hops are required before this reads true.
  const closeReleases = /\breleaseRailAfterDetail\(\);/.test(closeBody)
    && /\bcardTier\.close\(\);/.test(bodyOf(uiSrc, 'closeCard'));
  const make = new Function('rail', 'card', 'seed', `
    let popPinned = seed.popPinned;
    let cardIsOpen = seed.cardIsOpen;
    let detailOpen = seed.detailOpen;
    const isDetailOpen = () => detailOpen;
    /* The vessel asks its sibling rather than reading a variable it shares
       with it; the double answers from the same seed the variable held. */
    const popover = { isPinned: () => popPinned };
    function syncRailVisibility() {
      ${syncBody}
    }
    function releaseRailAfterDetail() {
      ${releaseBody === null ? '/* this source has no close-path release */' : releaseBody}
    }
    // The rail-facing content of ui.closeCard(), as this source has it.
    function closeTick() {
      ${closeReleases ? 'releaseRailAfterDetail();' : '/* pre-fix: closeCard() does not touch the rail */'}
    }
    return {
      releaseRailAfterDetail, syncRailVisibility, closeTick,
      set popPinned(v) { popPinned = v; },
      set cardIsOpen(v) { cardIsOpen = v; },
      set detailOpen(v) { detailOpen = v; },
    };
  `);
  return {
    hasRelease: releaseBody !== null && closeReleases,
    open: (rail, card, seed) => make(rail, card, seed),
  };
}

const sheetCard = { classList: { contains: (c) => c === 'sheet' } };
const deskCard = { classList: { contains: () => false } };

const railKit = compileRail();
const closeKit = compileClosePath();
const makeRail = railKit.make;
const openClose = (rail, card, seed) => closeKit.open(rail, card, seed);

check('D1', 'rail.js has a synchronous release (releaseModal)', railKit.hasRelease,
  railKit.hasRelease ? 'extracted and compiled' : 'no function releaseModal() in journey/rail.js');
check('D1', 'releaseModal is on the rail\'s public API and ui.js calls it',
  /\breleaseModal,/.test(railSrc) && /\brail\.releaseModal\(\)/.test(cardSrc),
  'returned from createRail, called from ui.js');
check('D1', 'closeCard() reaches a synchronous release', closeKit.hasRelease,
  closeKit.hasRelease ? 'closeCard -> releaseRailAfterDetail -> rail.releaseModal'
    : 'closeCard() completes without touching the rail — DEF-01');

/* ------------------------------------------------------------------ *
 * D2 — THE DEFECT ITSELF.                                             *
 * A committed contributor card is up; the rail is inert, dimmed and   *
 * (on the sheet profile) visibility:hidden. The visitor presses ✕.     *
 * journey.js clears detailNode and calls closeCard() in one tick.      *
 * NO FRAME RUNS. The rail must already be focusable.                   *
 * ------------------------------------------------------------------ */
{
  const rail = makeRail();
  const close = openClose(rail, sheetCard, { popPinned: false, cardIsOpen: true, detailOpen: true });

  // The frame that put the card up.
  rail.update(true);
  close.syncRailVisibility();
  check('D2', 'setup: a modal detail leaves the rail inert, dimmed and withheld',
    rail.root.inert === true && rail.root.has('dim') && rail.root.style.visibility === 'hidden',
    `inert=${rail.root.inert} dim=${rail.root.has('dim')} vis="${rail.root.style.visibility}"`);

  // The close tick — exactly what journey.js closeDetail() + ui.closeCard() do,
  // and nothing else. No rAF, no frame, no settle.
  close.detailOpen = false;      // journey.js: detailNode = null
  close.cardIsOpen = false;      // ui.js hideCard(): cardIsOpen = false
  close.closeTick();             // whatever closeCard() does to the rail — here, all of it

  check('D2', 'the rail is focusable in the SAME TICK the detail closed',
    rail.root.inert === false && rail.root.style.visibility === '',
    `inert=${rail.root.inert} vis="${rail.root.style.visibility}" (no frame ran)`);
  check('D2', 'and it is no longer dimmed',
    !rail.root.has('dim') && rail.dimmed === false, `dim=${rail.root.has('dim')}`);

  /* ---------------------------------------------------------------- *
   * D3 — IDEMPOTENCE. The per-frame reconciler remains the authority; *
   * it simply has nothing left to do. Two frames in a row change      *
   * nothing, and neither performs a single write.                     *
   * ---------------------------------------------------------------- */
  rail.root.resetWrites();
  rail.update(false);            // the frame that would have released it
  const afterOne = { inert: rail.root.inert, dim: rail.root.has('dim'), w: { ...rail.root.writes } };
  rail.update(false);            // and again
  const afterTwo = { inert: rail.root.inert, dim: rail.root.has('dim'), w: { ...rail.root.writes } };
  check('D3', 'the next frame lands in the same state',
    afterOne.inert === false && afterOne.dim === false,
    `inert=${afterOne.inert} dim=${afterOne.dim}`);
  check('D3', 'the next frame writes nothing at all',
    afterOne.w.inert === 0 && afterOne.w.className === 0,
    `inert writes=${afterOne.w.inert} class writes=${afterOne.w.className}`);
  check('D3', 'running the frame twice changes nothing further',
    afterTwo.inert === afterOne.inert && afterTwo.dim === afterOne.dim
      && afterTwo.w.inert === 0 && afterTwo.w.className === 0,
    'stable');
  close.syncRailVisibility();
  close.syncRailVisibility();
  check('D3', 'the visibility writer is idempotent too',
    rail.root.style.visibility === '', `vis="${rail.root.style.visibility}"`);
}

/* ------------------------------------------------------------------ *
 * D4 — THE OPEN PATH IS UNCHANGED. Opening a modal detail still makes *
 * the rail inert inside update(), on its frame, in one write — and no *
 * part of the open path calls the release.                            *
 * ------------------------------------------------------------------ */
{
  const rail = makeRail();
  rail.root.resetWrites();
  rail.update(true);
  check('D4', 'opening a modal detail still makes the rail inert on its frame',
    rail.root.inert === true && rail.root.has('dim'),
    `inert=${rail.root.inert} dim=${rail.root.has('dim')}`);
  check('D4', 'and still costs exactly one inert write and one class write',
    rail.root.writes.inert === 1 && rail.root.writes.className === 1,
    `inert=${rail.root.writes.inert} class=${rail.root.writes.className}`);
  rail.root.resetWrites();
  rail.update(true);
  check('D4', 'a second frame with the detail still open writes nothing',
    rail.root.writes.inert === 0 && rail.root.writes.className === 0 && rail.root.inert === true,
    'the open path was already idempotent and still is');

  const openBody = bodyOf(uiSrc, 'openCard');
  check('D4', 'nothing on the OPEN path calls the release',
    !/releaseRailAfterDetail|releaseModal/.test(openBody)
      && !/releaseRailAfterDetail|releaseModal/.test(bodyOf(uiSrc, 'update')),
    'openCard() and ui.update() never call it');
  check('D4', 'the release is called from exactly one place, inside the card\'s close()',
    (cardSrc.match(/releaseRailAfterDetail\(\)/g) || []).length === 2   // 1 declaration + 1 call
      && /\breleaseRailAfterDetail\(\);/.test(bodyOf(cardSrc, 'close'))
      && (uiSrc.match(/releaseRailAfterDetail/g) || []).length === 0,
    `${(cardSrc.match(/releaseRailAfterDetail\(\)/g) || []).length} occurrences (declaration + call)`);
}

/* ------------------------------------------------------------------ *
 * D5 — THE RELEASE CAN ONLY RELEASE. Over every reachable start state *
 * it never sets inert true and never adds `dim`. It cannot open.      *
 * ------------------------------------------------------------------ */
{
  const seen = [];
  for (const startModal of [true, false]) {
    const rail = makeRail();
    rail.update(startModal);
    rail.releaseModal();
    rail.releaseModal();                                  // and again
    seen.push(`modalDetail=${startModal} -> inert=${rail.root.inert} dim=${rail.root.has('dim')}`);
  }
  check('D5', 'releaseModal() only ever releases — never claims, from any start state',
    seen.every(r => r.includes('inert=false') && r.includes('dim=false')), seen.join('; '));
}

/* ------------------------------------------------------------------ *
 * D6 — THE POPOVER TIER IS UNAFFECTED. ui.update() computes           *
 * modalDetail = detailNow && !popPinned, so a pinned popover           *
 * (detail === 'ados') never made the rail inert; the release must not  *
 * disturb that, and closeCard()'s early return keeps it out entirely.  *
 * ------------------------------------------------------------------ */
{
  const rail = makeRail();
  const close = openClose(rail, deskCard, { popPinned: true, cardIsOpen: false, detailOpen: true });
  const detailNow = true, popPinned = true;      // detail === 'ados', pinned
  rail.update(detailNow && !popPinned);          // ui.js: modalDetail === false
  check('D6', 'a pinned popover leaves the rail non-inert and undimmed',
    rail.root.inert === false && !rail.root.has('dim'), 'as before the fix');
  rail.root.resetWrites();
  close.releaseRailAfterDetail();
  check('D6', 'the release leaves the popover tier exactly where it found it',
    rail.root.inert === false && !rail.root.has('dim')
      && rail.root.writes.inert === 0 && rail.root.writes.className === 0,
    'no writes');
  check('D6', 'the popover close never enters the release at all',
    /if \(!cardIsOpen\) return;/.test(bodyOf(cardSrc, 'close')),
    'the vessel\'s close() returns early before it when no card is open');
}

/* ------------------------------------------------------------------ *
 * D7 — THE MENU STILL OWNS root.inert while it is up.                 *
 * ------------------------------------------------------------------ */
{
  const rail = makeRail();
  rail.update(true);
  rail.setMenuOpen(true);
  rail.root.resetWrites();
  rail.releaseModal();
  check('D7', 'the release defers to an open menu, exactly as update() does',
    rail.root.inert === true && rail.root.writes.inert === 0, 'menu keeps the rail inert');
  check('D7', 'and the menu still writes inert synchronously itself',
    (bodyOf(railSrc, 'openMenu').match(/root\.inert\s*=(?!=)/g) || []).length === 1
      && (bodyOf(railSrc, 'closeMenu').match(/root\.inert\s*=(?!=)/g) || []).length === 1,
    'openMenu 1, closeMenu 1 — the precedent this fix follows');
}

/* ------------------------------------------------------------------ *
 * D8 — NON-DIVERGENCE. The release asks the frame's own predicate, so *
 * it can never land on a state the next update() would undo. Proved   *
 * the hard way: a close that hands the frame straight to another      *
 * modal detail must leave the rail inert.                             *
 * ------------------------------------------------------------------ */
{
  const rail = makeRail();
  const close = openClose(rail, deskCard, { popPinned: false, cardIsOpen: true, detailOpen: true });
  rail.update(true);
  close.cardIsOpen = false;
  // detailOpen stays TRUE: journey.js has not cleared detailNode, so the next
  // update() would compute modalDetail === true and re-assert inert.
  rail.root.resetWrites();
  close.closeTick();
  check('D8', 'a close that leaves a modal detail standing releases NOTHING',
    rail.root.inert === true && rail.root.writes.inert === 0,
    'the gate is the frame\'s own predicate');
  rail.update(true);
  check('D8', 'and the next frame agrees — no flicker, no re-assert',
    rail.root.inert === true && rail.root.writes.inert === 0, 'still zero writes');

  check('D8', 'the gate is textually the frame\'s predicate',
    /isDetailOpen\(\) && !popover\.isPinned\(\)/.test(soft(() => bodyOf(cardSrc, 'releaseRailAfterDetail'), ''))
      && /const detailNow = isDetailOpen\(\);/.test(bodyOf(uiSrc, 'update'))
      && /const modalDetail = detailNow && !popover\.isPinned\(\);/.test(bodyOf(uiSrc, 'update')),
    'isDetailOpen() && !popover.isPinned(), both places');
  check('D8', 'the rail\'s visibility has exactly one writer on the UI surface',
    (uiSrc.match(/rail\.root\.style\.visibility\s*=(?!=)/g) || []).length
      + (cardSrc.match(/rail\.root\.style\.visibility\s*=(?!=)/g) || []).length === 1
      && /rail\.root\.style\.visibility/.test(soft(() => bodyOf(cardSrc, 'syncRailVisibility'), '')),
    'syncRailVisibility(), called by both update() and the close path');
}

/* ------------------------------------------------------------------ *
 * D9 — DEF-02 IS NOT TOUCHED. The focus return still runs first, in   *
 * the DOM it always ran in. This fix changes where the RAIL stands,   *
 * not where focus lands.                                              *
 * ------------------------------------------------------------------ */
{
  const body = bodyOf(cardSrc, 'close');
  const ret = body.indexOf('focusReturn.restore();');
  const rel = body.indexOf('releaseRailAfterDetail();');
  const hide = body.indexOf('hideCard();');
  check('D9', 'the focus return still precedes the release',
    ret > 0 && rel > ret, `focusReturn.restore() at ${ret}, release at ${rel}`);
  check('D9', 'and hideCard() still precedes both',
    hide > 0 && hide < ret && hide < rel, `hideCard() at ${hide}`);
  /* U03 gave the focus return ONE owner. The two lines this used to pin
     inside closeCard() are now the whole body of `restore()`, so the same
     bytes are pinned where they now live — and, because there is only one
     copy of them left, the pin cannot go stale by mirroring a second. */
  check('D9', 'the focus return itself is unchanged',
    /if \(wasPinned\) focusReturn\.restore\(\);/.test(body)
      && /if \(trigger && document\.contains\(trigger\)\) trigger\.focus\(\);\s*trigger = null;/
        .test(bodyOf(selSrc, 'createFocusReturn')),
    'byte-for-byte the pre-fix return, in its one owner');
  check('D9', 'journey.js still clears detailNode synchronously before closeCard()',
    /function closeDetail\(\)\s*\{\s*if \(!detailNode\) return;\s*detailNode = null;\s*ui\.closeCard\(\);/
      .test(journeySrc), 'the close path\'s shape is unchanged');
}

console.log('');
console.log(`detail-close focus handoff: ${passed}/${passed + failures.length} PASS`);
if (failures.length) {
  console.log(`${failures.length} FAILURE(S):`);
  for (const f of failures) console.log(`  ${f}`);
}
process.exitCode = failures.length ? 1 : 0;
