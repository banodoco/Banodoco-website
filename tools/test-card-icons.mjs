// tools/test-card-icons.mjs
//
// Contract suite for U01c: the card chip glyphs moved out of
// journey/cards/index.js into one data-only owner, journey/cards/icons.js.
//
// U01c's acceptance is "icon keys/markup/signatures exact; NO WARMING SIDE
// EFFECT". Those are FOUR different observables, and this suite measures each
// separately rather than assuming one implies another (D50 gate 4 — the keys
// that STATE a property are not the keys that OBSERVE it):
//
//   keys       — Object.keys(CARD_ICONS): membership AND order. A table built
//                by a different route can hold the same six entries in a
//                different order, so the order is pinned, not just the set.
//   markup     — the exact `<svg>…</svg>` string behind each key, byte for
//                byte. Both consumers assign it straight to `.innerHTML`
//                (journey/ui.js:914, journey/rail.js:729), so the string IS
//                the contract; there is no parsed form in between.
//   signatures — the private `I()` factory: its arity and the exact wrapper it
//                builds. This is the one part of the subject that is a pure
//                function rather than a module-graph fact, so it gets a
//                `new Function` arm (see HOW IT MEASURES, below).
//   warming    — the acceptance criterion's own qualifier, measured rather
//                than asserted in a comment: evaluating icons.js schedules no
//                timer, starts no fetch and reads no ambient global, and the
//                index.js self-start epoch is UNMOVED at one 1500 ms timer.
//
// GATE 4, AND WHY THIS SUBJECT IS WORSE THAN U01b's. U01b found that a spread
// copy leaves every entry of a map ===-identical while copying the map, so
// per-entry identity cannot see it. HERE THAT HOLE IS TOTAL: CARD_ICONS' values
// are STRINGS — primitives — so per-entry `===` is not merely insensitive to a
// copy, it is incapable of distinguishing one in principle. Two equal strings
// are the same value. `mapIsIconsOwn` is therefore the ONLY observable in this
// file that can see `export const CARD_ICONS = { ...ICONS }`, and it is kept
// deliberately OUTSIDE `record` because it has no pre-move counterpart. Mutant
// N4 asserts both halves: the record stays fully green AND mapIsIconsOwn reds.
//
// HOW IT MEASURES THEM. Two arms, because the subject has two natures:
//
//   [module graph]  Both trees are written to a fresh directory OUTSIDE the
//        repo and imported for real, under recording doubles installed AROUND
//        THE IMPORT (index.js's self-start resolves `overrides.X || <ambient>`
//        at call time, and the call happens during module evaluation, so
//        doubles installed after the import would measure nothing). The fake
//        setTimeout RECORDS AND DOES NOT FIRE, so the warming cascade never
//        runs and this suite measures only the epoch — the cascade itself is
//        tools/test-card-warming.mjs's subject, not this one's.
//
//   [materialised]  The `I()` factory is module-private, so no import can
//        reach it. It is SLICED out of the shipped bytes with a slicer that
//        REFUSES on miss and on ambiguity, compiled with `new Function`, and
//        driven directly. U01b deliberately had no `new Function` arm because
//        its subject WAS the module graph; U01c's subject includes a pure
//        string factory, which is exactly what that arm is for. Every
//        expectation it is compared against is hand-derived below, before
//        anything is compiled.
//
// LITERAL ANCHOR DECLARATION (D120, and R08's standing recommendation that
// this program record which suites freeze which production lines). This suite
// deliberately holds NO copy of the six glyph markup strings. "Markup exact"
// is proven pre/post against tools/fixtures/u01c-cards-index.pre-move.js.txt —
// a hash-fenced snapshot of bytes that already shipped, which is frozen by
// intent and never needs to move again — rather than against retyped literals,
// which would freeze journey/cards/icons.js against every future glyph edit.
// The literals this file DOES hold, and the production lines they pin:
//   * the `I()` wrapper string  -> journey/cards/icons.js, the `const I =`
//     arrow. Editing that wrapper is a deliberate contract change and SHOULD
//     red this suite; that is the assertion, not an accident.
//   * the six key names          -> the CARD_ICONS field names. Same.
//   * `export { CARD_ICONS } from './icons.js'` and the two slice anchors
//     -> journey/cards/index.js's re-export stanza and icons.js's block
//     comment header. These are STRUCTURAL and every one of them goes through
//     sliceOnce/before/from, which THROW on miss — never `.replace()`, which
//     is the silent gate-3 survivor R07 was bitten by.
//
// Run directly: node tools/test-card-icons.mjs
// Wired into package.json's test:contracts by this order (D49/D103).

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const INDEX_REL = 'journey/cards/index.js';
const ICONS_REL = 'journey/cards/icons.js';
const REGISTRY_REL = 'journey/cards/registry.js';
const RUNTIME_REL = 'journey/cards/runtime.js';
const FIXTURE_REL = 'tools/fixtures/u01c-cards-index.pre-move.js.txt';

/* The pre-move snapshot of journey/cards/index.js: the exact working-tree
 * bytes immediately before U01c's edit (i.e. post-U01b), hash-fenced here so
 * this suite keeps a real pre/post pair after the change is committed and HEAD
 * moves past it. The `.js.txt` suffix is load-bearing for the same reason
 * U01b's is: eslint.config.js globs tools/ ** /*.js and tools/check-cycles.mjs
 * sweeps tools for js+mjs; neither scans `.txt`. A snapshot named `.js` would
 * add lint findings and redden `npm run cycles` on imports that do not resolve
 * from tools/fixtures/. */
const FIXTURE_SHA256 = '7d72a4d4e42292a142e8bbc4a31df742145cee326b29d587cae609a502cafe7a';
const FIXTURE_BYTES = 9711;

const BUILDER_FILES = ['arca.js', 'artcompute.js', 'tworp.js', 'ados.js', 'hivemind.js', 'discord.js'];

/* ------------------------------------------------------------------ *
 * HAND-DERIVED EXPECTATIONS.                                         *
 * Written from reading journey/cards/icons.js and index.js, BEFORE   *
 * anything is imported, compiled or compared. Nothing below is       *
 * copied from a run's output.                                        *
 * ------------------------------------------------------------------ */

const HAND_DERIVED = {
  // The CARD_ICONS object literal's field order, top to bottom.
  iconKeys: ['arca', 'artcompute', 'tworp', 'ados', 'hivemind', 'discord'],
  // Every value is a complete element produced by I(): opens with the wrapper
  // and closes with </svg>. Six trues — the shape, not the content.
  iconValuesAreSvgElements: [true, true, true, true, true, true],
  // journey/cards/index.js's public surface, unchanged by this move.
  // Namespace keys come back sorted.
  exportNames: ['CARD_ASSETS', 'CARD_BUILDERS', 'CARD_ICONS', 'REDUCE', 'startCardWarming'],
  // THE ACCEPTANCE CRITERION'S QUALIFIER. The import-time self-start: one
  // timer, 1500 ms, scheduled once, in BOTH trees. If moving the glyphs
  // shifted the warming epoch this array would change length or value.
  selfStartDelays: [1500],
  // Evaluating the glyph owner itself must do nothing observable at all.
  iconsModuleTimers: 0,
  iconsModuleFetches: 0,
  iconsModuleDocumentReads: 0,
};

/** The `I()` factory, hand-derived from its arrow in journey/cards/icons.js.
 *  `paths` is interpolated raw into the element's body. */
const HAND_DERIVED_FACTORY = {
  arity: 1,
  wrapperOf: (paths) => `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">${paths}</svg>`,
  // Driven with three probes, including an empty one and one containing the
  // characters a naive template would mangle.
  probes: ['', '<path d="M0 0"/>', '<a b="&amp;\'\\"/>'],
};

/* ------------------------------------------------------------------ *
 * harness                                                            *
 * ------------------------------------------------------------------ */

let failures = 0;
let passes = 0;
function check(condition, msg) {
  if (condition) {
    passes++;
    console.log(`  ok   - ${msg}`);
  } else {
    failures++;
    console.error(`FAIL: ${msg}`);
  }
}

/** deepEqual as a boolean, so a comparison can be asserted OR required to
 *  fail (the mutant part) through the same code path. */
function deepEq(a, b) {
  try {
    assert.deepEqual(a, b);
    return true;
  } catch {
    return false;
  }
}

const read = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** Slice [startAnchor, endAnchor] inclusive. REFUSES on miss and on ambiguity:
 *  either anchor occurring zero or 2+ times throws rather than silently taking
 *  the first hit. */
function sliceOnce(source, where, startAnchor, endAnchor) {
  const count = (hay, needle) => hay.split(needle).length - 1;
  const sN = count(source, startAnchor);
  const eN = count(source, endAnchor);
  if (sN !== 1) throw new Error(`slice refused in ${where}: start anchor occurs ${sN}x (need exactly 1): ${JSON.stringify(startAnchor.slice(0, 60))}`);
  if (eN !== 1) throw new Error(`slice refused in ${where}: end anchor occurs ${eN}x (need exactly 1): ${JSON.stringify(endAnchor.slice(0, 60))}`);
  const s = source.indexOf(startAnchor);
  const e = source.indexOf(endAnchor);
  if (e < s) throw new Error(`slice refused in ${where}: end anchor precedes start anchor`);
  return source.slice(s, e + endAnchor.length);
}

/** Text before the sole occurrence of `anchor`. Refuses on miss/ambiguity. */
function before(source, where, anchor) {
  const n = source.split(anchor).length - 1;
  if (n !== 1) throw new Error(`cut refused in ${where}: anchor occurs ${n}x (need exactly 1): ${JSON.stringify(anchor.slice(0, 60))}`);
  return source.slice(0, source.indexOf(anchor));
}

/** Text from the sole occurrence of `anchor` to end. Refuses on miss/ambiguity. */
function from(source, where, anchor) {
  const n = source.split(anchor).length - 1;
  if (n !== 1) throw new Error(`cut refused in ${where}: anchor occurs ${n}x (need exactly 1): ${JSON.stringify(anchor.slice(0, 60))}`);
  return source.slice(source.indexOf(anchor));
}

/* ------------------------------------------------------------------ *
 * materialisation                                                    *
 * ------------------------------------------------------------------ */

const ORDER_PROBE = [
  'export const seen = [];',
  'export const note = (name) => { seen.push(name); };',
  '',
].join('\n');

function builderStub(name) {
  return [
    "import { note } from './order-probe.js';",
    `note('${name}');`,
    `export default { mark: '${name}' };`,
    '',
  ].join('\n');
}

/**
 * Write one module tree into a fresh directory outside the repo and import its
 * index.js under synchronous recording doubles.
 *
 * @param {'pre'|'post'} shape  pre = the fixture's index.js, which defines
 *                              CARD_ICONS inline and has no icons.js;
 *                              post = the shipped index.js + icons.js pair.
 * @param {(files: Record<string,string>) => void} [mutate]  mutant hook: gets
 *        the file map after it is built and before it is written to disk.
 */
async function materialise(shape, mutate) {
  const files = Object.create(null);
  files['order-probe.js'] = ORDER_PROBE;
  files['runtime.js'] = read(RUNTIME_REL);
  files['registry.js'] = read(REGISTRY_REL);
  for (const f of BUILDER_FILES) files[f] = builderStub(f.replace(/\.js$/, ''));
  if (shape === 'pre') {
    files['index.js'] = read(FIXTURE_REL);
  } else {
    files['index.js'] = read(INDEX_REL);
    files['icons.js'] = read(ICONS_REL);
  }
  if (mutate) mutate(files);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), `u01c-icons-${shape}-`));
  if (root.startsWith(REPO_ROOT)) throw new Error('refusing: temp tree landed inside the repo');
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, name), text);
    }

    const selfStartDelays = [];
    let documentReads = 0;
    let fetches = 0;
    const realDocument = Object.getOwnPropertyDescriptor(global, 'document');
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;
    const realFetch = global.fetch;
    const realRIC = global.requestIdleCallback;

    // Doubles installed AROUND the import: the self-start runs during module
    // evaluation, so a double installed afterwards would record nothing. The
    // fake setTimeout RECORDS AND DOES NOT FIRE.
    Object.defineProperty(global, 'document', {
      configurable: true,
      get() { documentReads++; return { fonts: { load: () => Promise.resolve() } }; },
    });
    global.setTimeout = (_fn, delay) => { selfStartDelays.push(delay); return 0; };
    global.clearTimeout = () => {};
    global.fetch = () => { fetches++; return Promise.resolve(); };
    delete global.requestIdleCallback;

    // Cache-bust so repeated materialisations in one process really re-evaluate
    // (the temp dir is fresh each time, so the specifier differs by path).
    let ns; let iconsNs = null;
    let iconsOnly = null;
    try {
      // PART 1: the glyph owner ALONE, before anything else touches the
      // globals. Its own evaluation must be observationally inert, which is
      // U01c's "no warming side effect" measured at its source.
      if (shape === 'post') {
        const beforeTimers = selfStartDelays.length;
        const beforeDocs = documentReads;
        const beforeFetches = fetches;
        iconsNs = await import(pathToFileURL(path.join(root, 'icons.js')).href);
        iconsOnly = {
          timers: selfStartDelays.length - beforeTimers,
          fetches: fetches - beforeFetches,
          documentReads: documentReads - beforeDocs,
        };
      }
      // PART 2: the package face, which is what carries the self-start.
      ns = await import(pathToFileURL(path.join(root, 'index.js')).href);
    } finally {
      if (realDocument) Object.defineProperty(global, 'document', realDocument);
      else delete global.document;
      global.setTimeout = realSetTimeout;
      global.clearTimeout = realClearTimeout;
      global.fetch = realFetch;
      if (realRIC !== undefined) global.requestIdleCallback = realRIC;
    }

    /* TOLERANT ON PURPOSE (D57): if a mutant removes the export entirely,
       `ns.CARD_ICONS` is undefined. Reading it through `|| {}` lets the record
       be BUILT and the missing name show up as a red on `exportNames` and
       `iconKeys`, instead of throwing and turning a failed gate into an
       aborted one. A suite that aborts on a legitimate change is the defect
       shape D103 had to repair in tools/test-input-claim.mjs. */
    const iconKeys = Object.keys(ns.CARD_ICONS || {});
    return {
      // `record` is the PRE/POST-COMPARABLE surface: every key here exists in
      // both shapes and means the same thing in both.
      record: {
        iconKeys,
        iconValuesAreSvgElements: iconKeys.map((k) => {
          const v = (ns.CARD_ICONS || {})[k];
          return typeof v === 'string' && v.startsWith('<svg ') && v.endsWith('</svg>');
        }),
        exportNames: Object.keys(ns).slice().sort(),
        selfStartDelays: [...selfStartDelays],
      },
      // The markup itself, compared pre vs post rather than against retyped
      // literals — see the LITERAL ANCHOR DECLARATION at the top of this file.
      markup: Object.fromEntries(iconKeys.map((k) => [k, (ns.CARD_ICONS || {})[k]])),
      // POST-ONLY, and deliberately OUTSIDE `record`: "does index.js FORWARD
      // the owner's own table, or COPY it?" has no pre-move counterpart, and
      // NOTHING IN `record` CAN SEE IT. CARD_ICONS' values are strings, so a
      // spread copy leaves every entry indistinguishable by `===` in
      // principle, not merely by accident. This is the only observable here
      // that reds on mutant N4.
      mapIsIconsOwn: iconsNs === null ? null : ns.CARD_ICONS === iconsNs.CARD_ICONS,
      // POST-ONLY: the inertness counters for the glyph owner's own evaluation.
      iconsOnly,
    };
  } finally {
    // D97: this path was created here, by name.
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ *
 * the [materialised] arm — compile the shipped I() and drive it       *
 * ------------------------------------------------------------------ */

/** Slice the `I()` arrow out of a source and compile it with `new Function`.
 *  The slicer refuses on miss and ambiguity, so a renamed or duplicated helper
 *  aborts loudly rather than silently measuring the wrong function. */
function compileFactory(source, where) {
  const arrow = sliceOnce(
    source, where,
    'const I = (paths) =>\n',
    '${paths}</svg>`;\n',
  );
  const expr = arrow.replace(/^const I =\s*/, '').replace(/;\n$/, '');
  // The house oracle: compile the SHIPPED BYTES rather than a retyped copy,
  // which is the whole point of this arm. (No eslint-disable here — the repo's
  // config does not enable no-new-func, and an unused disable directive is
  // itself a --max-warnings=0 failure.)
  return new Function(`return (${expr});`)();
}

/* ------------------------------------------------------------------ *
 * main                                                               *
 * ------------------------------------------------------------------ */

async function main() {
  console.log('== U01c — card chip glyph metadata contract ==\n');

  console.log('-- 0. hash fence --');
  const fixture = read(FIXTURE_REL);
  check(sha256(fixture) === FIXTURE_SHA256, `pre-move fixture ${FIXTURE_REL} matches its pinned sha256`);
  check(Buffer.byteLength(fixture) === FIXTURE_BYTES, `pre-move fixture is ${FIXTURE_BYTES} bytes`);
  const indexSrc = read(INDEX_REL);
  const iconsSrc = read(ICONS_REL);
  check(fs.existsSync(path.join(REPO_ROOT, ICONS_REL)), `${ICONS_REL} exists`);

  console.log('\n-- 1. pre/post discriminator (whole-file byte inequality) --');
  // The sibling-suite form: compare the WHOLE FILE, not a token. A comment
  // quoting the code cannot satisfy this in either direction.
  check(fixture !== indexSrc, 'the pinned pre-move copy and the shipped journey/cards/index.js are not byte-identical (a genuine pre/post pair)');
  check(!fixture.includes('./icons.js'), 'the pre-move copy does not mention ./icons.js (it predates the owner)');
  check(indexSrc.includes("from './icons.js'"), 'the shipped copy imports from ./icons.js');
  check(fixture.includes('export const CARD_ICONS = {'), 'the pre-move copy DEFINES the table inline — so `exportNames` below is a real comparison, not a tautology');
  check(!indexSrc.includes('export const CARD_ICONS = {'), 'the shipped copy no longer defines the table inline');

  console.log('\n-- 2. the owner is a data-only LEAF (acyclic by construction) --');
  // "Data-only owner" is the runbook's phrase. A module with no imports at all
  // cannot participate in a cycle, which is a stronger property than the
  // registry's "imports nothing above it".
  check(!/^\s*import\s/m.test(iconsSrc), 'journey/cards/icons.js contains no import statement at all (a true leaf)');
  check(!/\brequire\s*\(/.test(iconsSrc), 'journey/cards/icons.js contains no require() either');
  for (const forbidden of ['setTimeout', 'setInterval', 'requestIdleCallback', 'fetch(', 'document.']) {
    check(!iconsSrc.includes(forbidden), `journey/cards/icons.js contains no \`${forbidden}\` — the data-only owner schedules and requests nothing (U01c's "no warming side effect", read statically)`);
  }
  check(
    !read(REGISTRY_REL).includes("from './icons.js'") && !read(RUNTIME_REL).includes("from './icons.js'"),
    'neither registry.js nor runtime.js imports ./icons.js (the glyph owner sits beside them, not under them)',
  );

  console.log('\n-- 3. pre vs post, and both vs hand-derived --');
  const pre = await materialise('pre');
  const post = await materialise('post');
  check(deepEq(pre.record, HAND_DERIVED_RECORD()), 'PRE-move tree matches the hand-derived expectation (the expectation describes the code that shipped before U01c)');
  check(deepEq(post.record, HAND_DERIVED_RECORD()), 'POST-move tree matches the same hand-derived expectation');
  check(deepEq(pre.record, post.record), 'pre-move and post-move trees are observationally identical: icon key order, value shape, index.js export names, and the warming self-start epoch');
  check(pre.mapIsIconsOwn === null, 'the pre-move tree has no icons module, so table-identity has no pre-move counterpart (recorded as null, not silently as false)');
  check(post.mapIsIconsOwn === true, 'POST: index.js FORWARDS the glyph owner\'s own CARD_ICONS object rather than copying it');

  console.log('\n-- 4. markup exact, byte for byte, pre vs post --');
  check(deepEq(Object.keys(pre.markup), Object.keys(post.markup)), 'the same six keys carry markup in both trees');
  let allMarkupEqual = true;
  for (const k of HAND_DERIVED.iconKeys) {
    const same = pre.markup[k] === post.markup[k];
    if (!same) allMarkupEqual = false;
    check(same, `CARD_ICONS.${k} markup is byte-identical pre and post (${(post.markup[k] || '').length} chars)`);
  }
  check(allMarkupEqual, 'ALL six glyphs survived the move with no byte changed — "markup exact"');
  // A positive control on the comparison itself: if it could not tell strings
  // apart, the six rows above would be saying nothing.
  check(pre.markup.arca !== pre.markup.discord, 'CONTROL — two different glyphs are NOT equal, so the byte comparison above is live');

  console.log('\n-- 5. "no warming side effect", measured at the source --');
  check(deepEq(pre.record.selfStartDelays, HAND_DERIVED.selfStartDelays), `PRE: importing index.js schedules exactly ${JSON.stringify(HAND_DERIVED.selfStartDelays)}`);
  check(deepEq(post.record.selfStartDelays, HAND_DERIVED.selfStartDelays), `POST: importing index.js schedules exactly ${JSON.stringify(HAND_DERIVED.selfStartDelays)} — the epoch did not move`);
  check(post.iconsOnly !== null, 'the glyph owner was imported on its own, before the package face, so its evaluation could be measured in isolation');
  check(post.iconsOnly.timers === HAND_DERIVED.iconsModuleTimers, `evaluating journey/cards/icons.js ALONE schedules ${HAND_DERIVED.iconsModuleTimers} timers (got ${post.iconsOnly.timers})`);
  check(post.iconsOnly.fetches === HAND_DERIVED.iconsModuleFetches, `evaluating journey/cards/icons.js ALONE starts ${HAND_DERIVED.iconsModuleFetches} fetches (got ${post.iconsOnly.fetches})`);
  check(post.iconsOnly.documentReads === HAND_DERIVED.iconsModuleDocumentReads, `evaluating journey/cards/icons.js ALONE reads \`document\` ${HAND_DERIVED.iconsModuleDocumentReads} times (got ${post.iconsOnly.documentReads})`);

  console.log('\n-- 6. [materialised] the shipped I() factory, compiled and driven --');
  const Ipost = compileFactory(iconsSrc, ICONS_REL);
  const Ipre = compileFactory(fixture, FIXTURE_REL);
  check(typeof Ipost === 'function', 'the sliced I() from journey/cards/icons.js compiles to a function');
  check(Ipost.length === HAND_DERIVED_FACTORY.arity, `I() takes exactly ${HAND_DERIVED_FACTORY.arity} parameter — "signatures exact" (got ${Ipost.length})`);
  check(Ipre.length === Ipost.length, 'the pre-move I() had the same arity (the signature did not change in the move)');
  for (const probe of HAND_DERIVED_FACTORY.probes) {
    const want = HAND_DERIVED_FACTORY.wrapperOf(probe);
    check(Ipost(probe) === want, `I(${JSON.stringify(probe.slice(0, 24))}) builds the hand-derived wrapper exactly`);
    check(Ipost(probe) === Ipre(probe), `I(${JSON.stringify(probe.slice(0, 24))}) agrees with the pre-move factory`);
  }
  // The table really is built by THAT factory: every shipped value must be
  // reproducible by feeding the factory the body of its own element.
  const BODY = /^<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">([\s\S]*)<\/svg>$/;
  let allRebuilt = true;
  for (const k of HAND_DERIVED.iconKeys) {
    const m = BODY.exec(post.markup[k]);
    const ok = !!m && Ipost(m[1]) === post.markup[k];
    if (!ok) allRebuilt = false;
  }
  check(allRebuilt, 'every shipped glyph is exactly I(<its own paths>) — the table is built by the compiled factory, not merely shaped like it');

  console.log('\n-- 7. mutants: each assertion must be able to fail --');
  const mutants = [
    {
      id: 'N1-key-order',
      what: 'swap two FIELDS of the CARD_ICONS literal (key order changes; markup does not)',
      mutate: (files) => {
        const a = '  hivemind: I(';
        const b = '  discord: I(';
        if (!files['icons.js'].includes(a) || !files['icons.js'].includes(b)) throw new Error('N1 anchor missing');
        // swap the two whole lines
        const lines = files['icons.js'].split('\n');
        const ia = lines.findIndex((l) => l.startsWith(a));
        const ib = lines.findIndex((l) => l.startsWith(b));
        if (ia < 0 || ib < 0) throw new Error('N1 line anchor missing');
        const t = lines[ia]; lines[ia] = lines[ib]; lines[ib] = t;
        files['icons.js'] = lines.join('\n');
      },
      reds: (r) => !deepEq(r.record.iconKeys, HAND_DERIVED.iconKeys),
      axis: 'iconKeys',
    },
    {
      id: 'N2-markup-byte',
      what: 'change ONE coordinate byte inside one glyph path (markup changes; keys do not)',
      mutate: (files) => {
        const a = '<circle cx="6" cy="6" r="1.1"/>';
        if (!files['icons.js'].includes(a)) throw new Error('N2 anchor missing');
        files['icons.js'] = files['icons.js'].replace(a, '<circle cx="6" cy="6" r="1.2"/>');
      },
      reds: (r, base) => r.markup.hivemind !== base.markup.hivemind,
      axis: 'markup.hivemind',
      keysMustHold: true,
    },
    {
      id: 'N3-wrapper',
      what: 'drop focusable="false" from the I() wrapper (the signature\'s OUTPUT changes)',
      mutate: (files) => {
        const a = ' focusable="false"';
        if (!files['icons.js'].includes(a)) throw new Error('N3 anchor missing');
        files['icons.js'] = files['icons.js'].replace(a, '');
      },
      reds: (r) => !deepEq(r.record.iconValuesAreSvgElements, HAND_DERIVED.iconValuesAreSvgElements)
        || HAND_DERIVED.iconKeys.some((k) => !r.markup[k].includes('focusable="false"')),
      axis: 'markup (all six)',
    },
    {
      id: 'N4-copy-not-forward',
      what: 'replace index.js\'s re-export with a SPREAD COPY — the gate-4 case: with STRING values, no per-entry check can see this even in principle',
      mutate: (files) => {
        const a = "export { CARD_ICONS } from './icons.js';";
        if (!files['index.js'].includes(a)) throw new Error('N4 anchor missing');
        files['index.js'] = files['index.js'].replace(
          a,
          "import { CARD_ICONS as _ICONS } from './icons.js';\nexport const CARD_ICONS = { ..._ICONS };",
        );
      },
      reds: (r) => r.mapIsIconsOwn === false,
      axis: 'mapIsIconsOwn',
      recordMustStayGreen: true,
    },
    {
      id: 'N5-drop-export',
      what: 'drop the CARD_ICONS re-export from index.js entirely',
      mutate: (files) => {
        const a = "export { CARD_ICONS } from './icons.js';";
        if (!files['index.js'].includes(a)) throw new Error('N5 anchor missing');
        files['index.js'] = files['index.js'].replace(a, '');
      },
      reds: (r) => !deepEq(r.record.exportNames, HAND_DERIVED.exportNames),
      axis: 'exportNames',
      keysMustDrop: true,
    },
    {
      id: 'N6-warming-side-effect',
      what: 'give the data-only owner a warming side effect — one bare setTimeout at module scope',
      mutate: (files) => {
        files['icons.js'] += '\nsetTimeout(() => {}, 1500);\n';
      },
      reds: (r) => r.iconsOnly.timers !== 0 || !deepEq(r.record.selfStartDelays, HAND_DERIVED.selfStartDelays),
      axis: 'iconsOnly.timers / selfStartDelays',
    },
  ];

  for (const m of mutants) {
    let r = null; let threw = false;
    try {
      r = await materialise('post', m.mutate);
    } catch {
      threw = true;
    }
    /* A positive predicate rather than `check(false, ...)` in a guard branch:
       a literal predicate lands in tools/test-assertion-provenance.mjs's
       data-blind inventory (the class it calls "literally closed"; the bare id
       is deliberately not written here, because that suite's citation sweep
       reads a bare id in prose as a claim that the id exists in THIS file),
       and this one has a real observable behind it anyway — a
       mutant world that cannot even be BUILT proves nothing about the
       assertion it targets (D70: a harness fault must be raised by a guard and
       named separately from a failed gate). */
    check(!threw && !!r, `${m.id} — the mutant tree was constructible and imported`);
    if (threw || !r) continue;
    check(m.reds(r, post), `${m.id} — ${m.what} — REDDENS ${m.axis}; the assertion is not a tautology`);
    if (m.keysMustHold) {
      check(deepEq(r.record.iconKeys, HAND_DERIVED.iconKeys),
        `${m.id} — and leaves iconKeys UNTOUCHED, so the two axes are genuinely independent`);
    }
    if (m.keysMustDrop) {
      // The tolerant reader (see materialise) is what makes this a RED rather
      // than an ABORT: with the export gone, the name is simply absent from
      // the namespace and iconKeys reads empty.
      check(deepEq(r.record.iconKeys, []),
        `${m.id} — and iconKeys reads empty rather than throwing, so this is a failed gate and not an aborted one (D57)`);
    }
    if (m.recordMustStayGreen) {
      // THE POINT OF N4, stated as its own assertion: the record cannot see a
      // spread copy of a string-valued table. If this ever fails, the record
      // gained an observable and mapIsIconsOwn's justification changed.
      check(deepEq(r.record, HAND_DERIVED_RECORD()),
        `${m.id} — and the ENTIRE record stays green, which is why mapIsIconsOwn has to exist as a separate observable`);
      check(deepEq(r.markup, post.markup),
        `${m.id} — and every entry is still byte-equal, because the values are STRINGS: per-entry identity cannot see a copy even in principle`);
    }
  }
  // CONTROL: a behaviour-neutral mutation must leave everything green.
  const ctrl = await materialise('post', (files) => { files['icons.js'] += '\n'; });
  check(deepEq(ctrl.record, HAND_DERIVED_RECORD()) && ctrl.mapIsIconsOwn === true && deepEq(ctrl.markup, post.markup),
    'CONTROL — a behaviour-neutral mutate() (one appended newline) leaves every observable green (the reddenings above are the mutations, not the harness)');

  console.log('\n-- 8. reverse application: rebuild the pre-move file from the shipped pair --');
  // Every moved line is taken FROM THE SHIPPED BYTES, never retyped. Only the
  // structural glue is named here, and each cut refuses on miss/ambiguity.
  const REEXPORT_HEAD = '/* Chip glyphs — the `I()` helper and the CARD_ICONS table.\n';
  const indexHead = before(indexSrc, INDEX_REL, REEXPORT_HEAD);
  const reexportStanza = from(indexSrc, INDEX_REL, REEXPORT_HEAD);
  if (!reexportStanza.endsWith("export { CARD_ICONS } from './icons.js';\n")) {
    throw new Error('reverse application refused: the shipped index.js does not end with the icons re-export');
  }
  const iconsBlock = from(iconsSrc, ICONS_REL, '/* Chip glyphs (Hannah, 2026-08-18:');

  const reconstructed = indexHead + iconsBlock;

  check(
    reconstructed === fixture,
    'reverse-applying U01c (re-inlining icons.js\'s moved lines into index.js) reproduces the pinned pre-move bytes EXACTLY — the move added no content and lost none',
  );
  if (reconstructed !== fixture) {
    const n = Math.min(reconstructed.length, fixture.length);
    let i = 0;
    while (i < n && reconstructed[i] === fixture[i]) i++;
    console.error(`  first divergence at byte ${i} (rebuilt ${reconstructed.length} bytes, fixture ${fixture.length} bytes)`);
    console.error(`  rebuilt: ${JSON.stringify(reconstructed.slice(i, i + 90))}`);
    console.error(`  fixture: ${JSON.stringify(fixture.slice(i, i + 90))}`);
  }
  // Control on the reverse-application verifier: perturb one byte of the
  // reconstruction and it must stop matching. Otherwise "it matched" would be
  // saying nothing about the comparison.
  check(
    (reconstructed + ' ') !== fixture,
    'CONTROL — a one-byte perturbation of the reconstruction does NOT match the fixture (the byte comparison is live)',
  );

  console.log('');
  console.log(`${passes + failures} assertions — ${passes} PASS, ${failures} FAIL`);
  if (failures > 0) process.exitCode = 1;
}

/** The hand-derived record, rebuilt per comparison so no assertion can mutate
 *  the expectation another assertion is about to read. */
function HAND_DERIVED_RECORD() {
  return {
    iconKeys: [...HAND_DERIVED.iconKeys],
    iconValuesAreSvgElements: [...HAND_DERIVED.iconValuesAreSvgElements],
    exportNames: [...HAND_DERIVED.exportNames],
    selfStartDelays: [...HAND_DERIVED.selfStartDelays],
  };
}

main().catch((err) => {
  console.error('BROKEN:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
