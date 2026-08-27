/* ==================================================================== *
 * tools/test-hot-state.mjs — order U02's instrument.
 *
 *   node tools/test-hot-state.mjs
 *
 * WHAT U02 DID, so this file's shape is legible:
 *   · journey/ui/hot-state.js is new — the hotspot and hover-zone registry
 *     and the ONE owner of the three-channel hot state: the two registry
 *     arrays, the recency counter, the hover/focus/arm union latch, and the
 *     touch-arm, which is now DERIVED from the records instead of stored in
 *     a module-global beside them.
 *   · journey/ui.js: `hotSeq`, `armed`, `clearArmed`, the two `hottest`
 *     scans and the union inside `refresh` all move; every DOM, popover and
 *     card effect stays exactly where it was.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SUITE IS BLIND TO — read this before believing any number.
 * ---------------------------------------------------------------------
 * 1. `journey/ui.js` CANNOT BE INSTANTIATED IN NODE (it builds live DOM at
 *    construction; C01 limitations.md §1). So every claim here ABOUT ui.js
 *    is TEXTUAL. The EXECUTED half runs journey/ui/hot-state.js, which has
 *    no DOM — that is exactly why U02 put the seam there (D72: prefer a seam
 *    your strongest instrument can see).
 * 2. THE TOUCH PATH IS EXERCISED AT THE STATE SEAM, NOT THROUGH A FINGER.
 *    `arm`/`disarm`/`armed` ARE the finger's channel (ui.js: "hover, focus
 *    and arm are three independent reasons for the same visual"), and §3
 *    drives them directly. That the touch LISTENERS still reach them is a
 *    textual claim (§5, T-TOUCH), and the end-to-end reading — a real
 *    trusted tap in a `hasTouch` browser, pre-tree against post-tree — is
 *    in this order's evidence directory, not in this file: nothing in
 *    test:contracts launches a browser.
 * 3. CLEANUP IS COUNTED AT THE REGISTRY, NOT AT THE DOM. §4 counts records
 *    and refresh calls. Listener teardown is journey/ui/owner.js's, already
 *    gated by tools/test-ui-lifecycle.mjs (UIL-T1 pins ui.js's listener and
 *    timer cardinality, and U02 moves neither); the real-DOM listener count
 *    across destroy() is likewise in the evidence directory.
 *
 * ---------------------------------------------------------------------
 * LITERAL ANCHOR DECLARATION (D120, and R08's standing recommendation that
 * this program record which suites freeze which production lines). U03–U06
 * all edit journey/ui.js after this order, so an undeclared anchor here
 * would become a silent immovable line for them.
 *
 * THIS SUITE HOLDS NO COPY OF ANY MOVED BODY. "Behaviour exact" was proven
 * by executing the shipped module and by a REVERSE APPLICATION (§6) that
 * rebuilt the pre-order journey/ui.js from the enumerated edit set and
 * reproduced its sha256 — so no production line is frozen against a retyped
 * literal. §6 IS RETIRED as of U03, 2026-08-22, on the expiry this
 * declaration wrote for it; the reason is at §6's own headstone. The
 * literals this file DOES hold, and the lines they pin:
 *
 *   * `import { createHotState } from './ui/hot-state.js';`
 *     -> journey/ui.js's import stanza. Structural; a rename SHOULD red.
 *   * `const hotspots = hotState.nodes;` / `const hoverZones = hotState.zones;`
 *     -> the two alias declarations. These ARE the ownership invariant in
 *        journey/ui.js's own bytes: replacing either with a copy is the
 *        defect this order exists to prevent, and it must red.
 *   * ~~the fourteen reverse-application edit pairs (§6)~~ — RETIRED
 *     2026-08-22 by U03, which rewrote five of the fourteen regions by moving
 *     the popover and card state machines into journey/ui/{popover-tier,
 *     card-tier}.js. The clause above said a later order "must retire the
 *     corresponding pair rather than work around it"; retiring five of
 *     fourteen leaves no pre-order file to rebuild, so the section went as a
 *     whole. It REFUSED before it was removed — `reverse application refused
 *     (hotSeq): anchor occurs 0 times` — which is D120's failure mode caught
 *     by design rather than a `.replace()` no-op going green.
 *   * `hotState.` / `armed` / `clearArmed` / `hotSeq` as TOKENS (§5)
 *     -> negative site-set scans over journey/ui.js. A later order may add
 *        `hotState.` sites freely; it may not reintroduce the three retired
 *        names, which is the assertion, not an accident.
 *   * `hotState.arm(` / `hotState.disarm(` / `hotState.armed()` as TOKENS
 *     (T-TOUCH, §7) -> counted at 4 and 3 over the whole UI SURFACE, i.e.
 *        journey/ui.js plus every journey/ui/*.js, discovered off the disk.
 *        U03 widened this from journey/ui.js alone when two of the four sites
 *        moved into the vessels; the numbers did not change and the claim did
 *        not weaken. A later order may move these sites between files on that
 *        surface freely; it may not change how many there are.
 *
 * ANCHORS THIS ORDER FOUND AND DID NOT MOVE (they bind journey/ui.js from
 * outside U02's allowlist, and U03–U06 inherit them):
 *   * ~~tools/test-chapter-contract.mjs pins THREE ui.js lines by text~~ —
 *     CLOSED 2026-08-22 by the instrument-diet order. `M14` no longer names
 *     those lines: it PARSES every production module and requires every
 *     `onHot` call to be in STATEMENT position, wherever it lives. The three
 *     calls may now move to another file, be renamed, be re-wrapped, or become
 *     four. U02 recorded that this anchor "forced the seam — state moved,
 *     effects could not"; the seam is no longer forced, and the hover zone's
 *     state machine is free to follow the registry. This file's own
 *     `T-ANCHOR` row, which restated the same requirement, went with it.
 *   * tools/test-ui-lifecycle.mjs:499 pins ui.js's `return {` member order
 *     by regex; :668 (UIL-T1) pins its listener/timer cardinality at 25/8.
 *     STILL LIVE.
 *   * tools/test-ui-closure.mjs slices `resolveLabelPolicies`, `notifySelect`
 *     and the `setExcludedNodes` loop out of ui.js under refusing anchors,
 *     and mutates named lines inside them. STILL LIVE. Neither of these two
 *     was in the instrument-diet order's scope: they bind CODE, not comment
 *     text, and neither is a one-shot move proof. A later U-order that needs
 *     them moved should say so and move them, as this one did with M14.
 *
 * Run directly: node tools/test-hot-state.mjs
 * Wired into package.json's test:contracts by this order (D49/D103).
 * ==================================================================== */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './strip-comments.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const MOD_REL = 'journey/ui/hot-state.js';
const UI_REL = 'journey/ui.js';

const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex');

/* THE PRE-U02 DIGEST STOOD HERE. RETIRED 2026-08-22 BY U03, on the expiry
 * this file's own anchor declaration wrote for it: "a later order that
 * rewrites one of those regions must retire the corresponding pair rather
 * than work around it." U03 rewrote five of the fourteen — `hottest`,
 * `hottestCard`, `popCommit`, `cardCommit` and `hotSeq`'s anchor line — by
 * moving the popover and card state machines into journey/ui/popover-tier.js
 * and journey/ui/card-tier.js. §6 refused on the first missing anchor, which
 * is exactly what it was built to do and is why this is a retirement and not
 * a re-baseline: there is no pre-U02 file left for the shipped bytes to be
 * rebuilt into. U02's own acceptance carries the green run of it.
 * Recorded in docs/code-health/evidence/2026-08-21-elegance-run-01/u03/. */

let fails = 0;
let checks = 0;
function check(ok, what, extra) {
  checks += 1;
  if (ok) { console.log(`PASS ${what}`); return true; }
  fails += 1;
  console.log(`FAIL ${what}${extra === undefined ? '' : `\n     ${extra}`}`);
  return false;
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ==================================================================== *
 * 1. THE ORACLE — compile the SHIPPED bytes and drive the real factory.
 * ==================================================================== */
const MOD_SRC = read(MOD_REL);

/** Compile a module's shipped text with `new Function`, so what runs is the
 *  file the page loads and not a re-typed copy. Refuses if the export marker
 *  it must strip is absent or ambiguous. */
function compileFactory(src, marker) {
  const n = src.split(marker).length - 1;
  if (n !== 1) throw new Error(`compile refused: '${marker}' occurs ${n} times, not once`);
  const body = src.replace(marker, marker.replace('export ', ''));
  return new Function(`'use strict';\n${body}\nreturn createHotState;`)();
}
const createHotState = compileFactory(MOD_SRC, 'export function createHotState');

/** A hotspot record with only the cells hot-state.js reads, plus a refresh
 *  counter so §3/§4 can count teardown work rather than assert it happened. */
function node(id, opts = {}) {
  const h = {
    id,
    hover: false, focused: false, armed: false, hot: false, hotSeq: 0,
    preview: opts.preview === undefined ? null : opts.preview,
    refreshes: 0,
  };
  h.refresh = () => { h.refreshes += 1; };
  return h;
}

/* ==================================================================== *
 * 2. HAND-DERIVED EXPECTATIONS — written out BEFORE any comparison.
 * ==================================================================== */

/* The union is `hover || focused || armed`, and `latch` reports only whether
 * `hot` MOVED. Enumerated by hand from those two sentences, in the binary
 * order (hover, focused, armed) 000..111, each row applied to a FRESH cold
 * record — so `latch` is true exactly when the union is true. */
const HAND = {
  unionHot: [false, true, true, true, true, true, true, true],
  unionLatch: [false, true, true, true, true, true, true, true],
  /* Then every channel is cleared and the record latched again. Row 000 was
   * never lit, so it does not move; rows 001..111 were lit and go hot->cold,
   * so they latch exactly once each.
   *
   * THIS ROW WAS HAND-DERIVED WRONG THE FIRST TIME and the suite said so on
   * its first run: I wrote [true, false * 7], having read the sequence as if
   * row 000 were the lit one. Recorded rather than quietly corrected — a
   * hand-derivation that is checked is the point of deriving it by hand. */
  reLatchFromHot: [false, true, true, true, true, true, true, true],
  /* §3's script, derived by hand from "newest hot chip wins":
   *   a goes hot (seq 1), b goes hot (seq 2)  -> hottest is b
   *   a goes hot AGAIN without going cold     -> no move, so no bump: b
   *   a goes cold then hot (seq 3)            -> a
   * `preview` splits the two selectors: a has one, b does not. */
  recency: ['b', 'b', 'a'],
  hottestPreviewed: ['a', 'a', 'a'],
  /* The arm is a singleton and it is DERIVED. Reading, after each step:
   *   arm(a)             -> armed a; a.armed true; nobody refreshed by arm
   *   arm(b)             -> armed b; a disarmed AND refreshed exactly once
   *   disarm(b)          -> armed b still (b is `except`); no new refresh
   *   disarm()           -> armed null; b refreshed exactly once
   *   disarm() again     -> armed null; no further refresh (idempotent) */
  armIds: ['a', 'b', 'b', null, null],
  armFlags: [[true, false], [false, true], [false, true], [false, false], [false, false]],
  armRefreshes: [[0, 0], [1, 0], [1, 0], [1, 1], [1, 1]],
};

/* ==================================================================== *
 * 3. THE READINGS — union, recency, and the touch arm.
 * ==================================================================== */
console.log('-- 1. provenance --');
console.log(`   ${MOD_REL}  sha256 ${sha(MOD_SRC)}  (${MOD_SRC.length} bytes)`);
check(MOD_SRC.length > 0, 'the shipped module was read and is non-empty (inputs-read pin, D46)');

console.log('\n-- 2. the union of the three channels, and the latch --');
{
  const reg = createHotState();
  const hot = [];
  const latch = [];
  const reLatch = [];
  for (let m = 0; m < 8; m += 1) {
    const h = reg.add(node(`u${m}`));
    h.hover = !!(m & 4); h.focused = !!(m & 2); h.armed = !!(m & 1);
    latch.push(reg.latch(h));
    hot.push(h.hot);
    // second application over the SAME record, its channels untouched
    h.hover = false; h.focused = false; h.armed = false;
    reLatch.push(reg.latch(h));
  }
  check(eq(hot, HAND.unionHot), 'hot is exactly hover||focused||armed over all eight channel combinations',
    `expected ${JSON.stringify(HAND.unionHot)} actual ${JSON.stringify(hot)}`);
  check(eq(latch, HAND.unionLatch), 'latch reports true exactly when hot MOVED, from cold',
    `expected ${JSON.stringify(HAND.unionLatch)} actual ${JSON.stringify(latch)}`);
  check(eq(reLatch, HAND.reLatchFromHot), 'and clearing every channel latches back exactly once per lit record',
    `expected ${JSON.stringify(HAND.reLatchFromHot)} actual ${JSON.stringify(reLatch)}`);
}

console.log('\n-- 3. recency: the visitor\'s LAST action wins a tie --');
{
  const reg = createHotState();
  const a = reg.add(node('a', { preview: { short: 'a' } }));
  const b = reg.add(node('b'));
  const anyNode = () => true;
  const seen = [];
  const previewed = [];
  const light = (h, on) => { h.hover = on; if (reg.latch(h)) reg.rank(h); };
  light(a, true); light(b, true);
  seen.push(reg.hottest(anyNode).id); previewed.push(reg.hottest((h) => !!h.preview).id);
  light(a, true);                       // already hot: no move, so no bump
  seen.push(reg.hottest(anyNode).id); previewed.push(reg.hottest((h) => !!h.preview).id);
  light(a, false); light(a, true);       // cold then hot: a takes the newest seq
  seen.push(reg.hottest(anyNode).id); previewed.push(reg.hottest((h) => !!h.preview).id);
  check(eq(seen, HAND.recency), 'hottest() follows the most recent COLD->HOT transition, and a re-light that does not move hot does not re-rank',
    `expected ${JSON.stringify(HAND.recency)} actual ${JSON.stringify(seen)}`);
  check(eq(previewed, HAND.hottestPreviewed), 'and the `want` predicate splits the two selectors ui.js keeps (popover vs card) without renaming a chapter or a node',
    `expected ${JSON.stringify(HAND.hottestPreviewed)} actual ${JSON.stringify(previewed)}`);
  check(reg.hottest((h) => h.id === 'nobody') === null, 'a predicate that admits nothing yields null, not undefined — ui.js branches on it');
}

console.log('\n-- 4. the TOUCH channel: arm is a derived singleton --');
{
  const reg = createHotState();
  const a = reg.add(node('a'));
  const b = reg.add(node('b'));
  const ids = [];
  const flags = [];
  const refreshes = [];
  const snap = () => {
    const cur = reg.armed();
    ids.push(cur ? cur.id : null);
    flags.push([a.armed, b.armed]);
    refreshes.push([a.refreshes, b.refreshes]);
  };
  reg.arm(a); snap();
  reg.arm(b); snap();
  reg.disarm(b); snap();
  reg.disarm(); snap();
  reg.disarm(); snap();
  check(eq(ids, HAND.armIds), 'armed() tracks the singleton arm through arm/arm/disarm(except)/disarm/disarm',
    `expected ${JSON.stringify(HAND.armIds)} actual ${JSON.stringify(ids)}`);
  check(eq(flags, HAND.armFlags), 'at most ONE record carries the arm at any step — the invariant the module exists to hold',
    `expected ${JSON.stringify(HAND.armFlags)} actual ${JSON.stringify(flags)}`);
  check(eq(refreshes, HAND.armRefreshes), 'and each disarm runs the outgoing record\'s own refresh exactly once, never twice and never zero times',
    `expected ${JSON.stringify(HAND.armRefreshes)} actual ${JSON.stringify(refreshes)}`);
  // hover, focus and arm are INDEPENDENT reasons: dropping the arm must not
  // take a lit hover with it, which is the OR ui.js's touch note describes.
  const c = reg.add(node('c'));
  c.hover = true; reg.latch(c);
  reg.arm(c); reg.latch(c);
  reg.disarm(); reg.latch(c);
  check(c.hot === true && c.hover === true && c.armed === false,
    'dropping the arm leaves a lit hover lit — the three channels are independent reasons for one visual');
}

/* ==================================================================== *
 * 4. CLEANUP, BY COUNTING.
 * ==================================================================== */
console.log('\n-- 5. cleanup: counted, not asserted --');
{
  const reg = createHotState();
  const all = [];
  for (let i = 0; i < 5; i += 1) all.push(reg.add(node(`n${i}`)));
  const zones = [];
  for (let i = 0; i < 3; i += 1) zones.push(reg.addZone({ id: `z${i}`, hot: false }));
  check(reg.nodes.length === 5 && reg.zones.length === 3,
    'the registry holds exactly what was registered — 5 nodes, 3 zones (a zero here is a scan that read nothing, D102)');
  // Light every channel on every node, then tear the state down the way
  // ui.js's outside-press and blur paths do, and COUNT what is left.
  for (const h of all) { h.hover = true; h.focused = true; reg.latch(h); reg.rank(h); }
  reg.arm(all[2]); reg.latch(all[2]);
  const litBefore = reg.nodes.filter((h) => h.hot).length;
  const refreshesBefore = reg.nodes.reduce((n, h) => n + h.refreshes, 0);
  reg.disarm();
  for (const h of all) { h.hover = false; h.focused = false; reg.latch(h); }
  const litAfter = reg.nodes.filter((h) => h.hot).length;
  const armedAfter = reg.armed();
  const channelResidue = reg.nodes.filter((h) => h.hover || h.focused || h.armed).length;
  check(litBefore === 5, 'all five records were lit before teardown — the branch-entry witness (D75): a teardown over nothing passes forever',
    `lit before: ${litBefore}`);
  check(litAfter === 0, 'no record is left hot after teardown', `lit after: ${litAfter}`);
  check(channelResidue === 0, 'and no record is left holding ANY of the three channels', `residue: ${channelResidue}`);
  check(armedAfter === null, 'the arm is gone, and because it is derived there is no second copy that could survive it');
  check(reg.nodes.reduce((n, h) => n + h.refreshes, 0) === refreshesBefore + 1,
    'teardown ran exactly ONE record\'s refresh — the armed one; the rest were latched by their own listeners, as ui.js does it');
}

/* ==================================================================== *
 * 5. OWNERSHIP, AND THE TEXTUAL PINS OVER journey/ui.js.
 * ==================================================================== */
console.log('\n-- 6. ownership: the registry hands out its own arrays --');
const OWNERSHIP = (() => {
  const reg = createHotState();
  const h = node('own');
  const returned = reg.add(h);
  const z = { id: 'zone' };
  const zReturned = reg.addZone(z);
  const alias = reg.nodes;
  reg.arm(h);
  return {
    addReturnsTheSameObject: returned === h,
    addZoneReturnsTheSameObject: zReturned === z,
    storedIsTheSameObject: reg.nodes[0] === h,
    storedZoneIsTheSameObject: reg.zones[0] === z,
    aliasIsTheSameArray: alias === reg.nodes,
    /* THE GATE-4 OBSERVABLE (D50, U01c's finding). Every cell in a record is
       a PRIMITIVE, so a per-entry `===` over ids and flags is green over a
       spread copy — two equal booleans are the same value. Only a reading
       that follows IDENTITY can see a second owner: the arm was set through
       the registry, so it must be visible on the caller's own reference. */
    armIsVisibleOnTheCallersOwnReference: h.armed === true,
    armedIsTheCallersOwnObject: reg.armed() === h,
  };
})();
const OWNERSHIP_EXPECTED = {
  addReturnsTheSameObject: true,
  addZoneReturnsTheSameObject: true,
  storedIsTheSameObject: true,
  storedZoneIsTheSameObject: true,
  aliasIsTheSameArray: true,
  armIsVisibleOnTheCallersOwnReference: true,
  armedIsTheCallersOwnObject: true,
};
check(eq(OWNERSHIP, OWNERSHIP_EXPECTED), 'the registry stores and returns the caller\'s own objects — a spread copy anywhere is a second owner, and no comparison of VALUES could see it',
  `actual ${JSON.stringify(OWNERSHIP)}`);

console.log('\n-- 7. journey/ui.js: the wiring, and the three retired names --');
const UI_SRC = read(UI_REL);
const UI_CODE = stripComments(UI_SRC, { blankStrings: true });
const siteSet = (code, pred) => code.split('\n')
  .map((l, i) => [i + 1, l.trim()])
  .filter(([, l]) => l.length > 0 && pred(l))
  .map(([, l]) => l);

check(UI_SRC.includes("import { createHotState } from './ui/hot-state.js';"),
  'journey/ui.js imports the registry under exactly the shipped specifier');
check(UI_CODE.includes('  const hotspots = hotState.nodes;'),
  'T-ALIAS-1 `hotspots` is an ALIAS for the registry\'s array, not a copy');
/* THE RETIRED NAMES. Negative site sets, each with the positive control that
   D46 requires beside it: the scan must be shown able to SEE a site at all,
   or a zero is the zero of not looking. */
const retired = {
  clearArmed: siteSet(UI_CODE, (l) => /\bclearArmed\b/.test(l)),
  hotSeqGlobal: siteSet(UI_CODE, (l) => /\blet hotSeq\b/.test(l)),
  armedGlobal: siteSet(UI_CODE, (l) => /\blet armed\b/.test(l)),
};
const hotStateSites = siteSet(UI_CODE, (l) => /\bhotState\./.test(l));
check(eq(retired, { clearArmed: [], hotSeqGlobal: [], armedGlobal: [] }),
  'T-RETIRED journey/ui.js holds no `clearArmed`, no `let hotSeq` and no `let armed` — the second copy of the arm is gone',
  `actual ${JSON.stringify(retired)}`);
check(hotStateSites.length > 0,
  'T-RETIRED control (D46): the same scan DOES find the registry\'s own call sites, so the three zeros above are a reading and not a blindness',
  `hotState. sites: ${hotStateSites.length}`);
/* T-TOUCH. The finger's channel reaches the registry. WRITERS and READERS are
   counted separately, because they are different claims: the writers are the
   whole arm state machine, the readers are guards and the QA surface. (Written
   as one number first; the suite reported 7 against the declared 6 on its
   first run, because the QA getter reads the arm without transitioning it.
   Splitting the count is the honest repair, not raising the number.) */
/* SCANNED OVER THE WHOLE UI SURFACE, not over journey/ui.js alone (U03).
   The four sites are unchanged in meaning and in number, but two of them —
   the popover commit and the card commit — now live in the vessels' own
   modules. Narrowing the scan to journey/ui.js would have re-baselined a
   real invariant down to two out of a habit of counting one file; widening
   it keeps the claim ("every arm transition goes through the registry")
   exactly as strong and lets the vessels live where they belong. This is
   `M14`'s lesson applied here: pin the property over every production
   module, not the address. */
const UI_SURFACE = [UI_REL, ...fs.readdirSync(path.join(REPO_ROOT, 'journey/ui'))
  .filter((f) => f.endsWith('.js')).sort().map((f) => `journey/ui/${f}`)];
const SURFACE_CODE = UI_SURFACE.map((rel) => stripComments(read(rel), { blankStrings: true })).join('\n');

/* U06 MOVED THIS SITE, AND THE HEADER ABOVE SAID IT WOULD. The hover zone's
   state machine and its per-frame pass are now journey/ui/hover-zone.js's, so
   the binding reads `const zones = hotState.zones;` there instead of
   `const hoverZones = hotState.zones;` here. The CLAIM is unchanged and is not
   about a name or a file: the zone array is taken BY IDENTITY, so a caller
   iterating it sees the very array the registry publishes into.

   Scanned over the discovered UI surface on exactly the U03 precedent this
   file records for T-TOUCH — "a later order may move these sites between
   files on that surface freely; it may not change how many there are." One
   site, before and after. The name is dropped from the pattern because the
   name was never the property; `= hotState.zones;` is. */
const zoneAliases = siteSet(SURFACE_CODE, (l) => /=\s*hotState\.zones;/.test(l));
check(zoneAliases.length === 1,
  'T-ALIAS-2 the zone array is an ALIAS for the registry\'s array, not a copy — exactly one site on the surface',
  zoneAliases.join(' | ') || '(none)');
const armWriters = siteSet(SURFACE_CODE, (l) => /hotState\.(arm|disarm)\(/.test(l));
const armReaders = siteSet(SURFACE_CODE, (l) => /hotState\.armed\(\)/.test(l));
check(armWriters.length === 4,
  'T-TOUCH-W every arm TRANSITION on the UI surface goes through the registry — four sites: the first tap arms, and the outside press, the popover commit and the card commit each disarm',
  `actual ${armWriters.length}: ${JSON.stringify(armWriters)}`);
check(armReaders.length === 3,
  'T-TOUCH-R and every READ of the arm goes through it too — the outside-press guard, the first-tap guard, and the QA surface',
  `actual ${armReaders.length}: ${JSON.stringify(armReaders)}`);
check(UI_SURFACE.length > 1 && SURFACE_CODE.length > read(UI_REL).length / 2,
  'T-TOUCH control (D46): the widened scan really does read more than journey/ui.js, so the two counts above are a reading and not a narrower file wearing a wider name',
  `${UI_SURFACE.length} files`);
/* `T-ANCHOR` STOOD HERE AND IS DROPPED, 2026-08-22.
   ------------------------------------------------
   It read: "the three `onHot` call sites another suite pins by text are still
   in journey/ui.js and still in statement position", with the count pinned at
   three. It was a RESTATEMENT — U02 wrote it so that a dependency on
   tools/test-chapter-contract.mjs's `M14` site set would be loud here rather
   than a surprise for U03 — and it was the right thing to write at the time.

   THE DEPENDENCY IT RESTATED NO LONGER EXISTS. `M14` no longer pins those
   three lines by text. It PARSES every production module and requires every
   `onHot` call to be in STATEMENT POSITION, wherever it lives and however it
   is spelled. So the calls need not stay in journey/ui.js, need not be three,
   and need not be one line each — and this row, which required all three,
   would have gone on fencing journey/ui.js after the fence it mirrored was
   taken down. That is the specific way a restatement outlives its subject.

   U02's own not-proved list is what this unblocks: the hover zone's state
   machine — `z.hot`, `spent`, `enteredAt` and the dwell/busy timers — stayed
   in journey/ui.js because the anchored `z.onHot(on)` lines fenced the latch
   it belongs to. Nothing fences it now.

   The LITERAL ANCHOR DECLARATION at the head of this file is amended in the
   same change; the other two anchor families it names are UNTOUCHED and still
   bind journey/ui.js. */

/* ==================================================================== *
 * 6. REVERSE APPLICATION — RETIRED 2026-08-22 BY U03.
 *
 * WHAT STOOD HERE. Fourteen POST -> PRE pairs reproducing U02's whole edit
 * set, applied through a `swap()` that THROWS on a miss and on ambiguity,
 * rebuilding the pre-order journey/ui.js and asserting its sha256. Plus two
 * controls: one perturbed byte in the shipped file had to break the digest,
 * and `swap()` itself had to refuse both a missing and an ambiguous anchor.
 *
 * WHY IT IS GONE, and why this is a retirement rather than a re-baseline.
 * The LITERAL ANCHOR DECLARATION at the head of this file wrote its own
 * expiry: "they pin the SHAPE of U02's edit, and a later order that rewrites
 * one of those regions must retire the corresponding pair rather than work
 * around it." U03 moved the popover and card state machines out of
 * journey/ui.js entirely, which rewrites five of the fourteen regions
 * (`hottest`, `hottestCard`, `popCommit`, `cardCommit`, and the
 * `let popHideTimer = null;` line the `hotSeq` pair anchored on). There is no
 * longer a pre-U02 shape for the shipped bytes to be rebuilt into: the file
 * the digest describes is now four files.
 *
 * IT REFUSED RATHER THAN PASSING. On U03's first `npm run check` it threw
 * `reverse application refused (hotSeq): anchor occurs 0 times, not once` —
 * D120's failure mode caught by design instead of a `.replace()` no-op going
 * silently green. That refusal is the last thing it did and the best evidence
 * that it was worth having.
 *
 * WHAT IS LOST, stated plainly. The claim "U02's extraction added no content
 * and lost none, byte-exactly". It was green at U02's acceptance and that run
 * is U02's evidence; nothing re-proves it here, and U03 does not pretend to.
 * What replaces it for THIS order is a different and weaker-in-kind claim of
 * the same family: 27/27 byte-identical recorded traces across the frozen
 * deck, which proves behaviour rather than bytes.
 *
 * Sections 1-5 and 7 are untouched and still execute the shipped registry.
 * ==================================================================== */

console.log(`\n${checks} assertions — ${checks - fails} PASS, ${fails} FAIL`);
assert.equal(fails, 0, `${fails} assertion(s) failed`);
