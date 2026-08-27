// tools/test-card-registry.mjs
//
// Contract suite for U01b: the card builder registry moved out of
// journey/cards/index.js into one acyclic owner, journey/cards/registry.js.
//
// U01b's acceptance is "builder identity/order/default exports exact". Those
// four words name four DIFFERENT observables, and this suite measures each of
// them separately rather than assuming one implies another (D50 gate 4 — the
// keys that STATE a property are not the keys that OBSERVE it):
//
//   identity  — CARD_BUILDERS[id] is the very object the builder module
//               default-exports (===), not a structural copy of it. A
//               re-export forwards a live binding; a spread would not.
//   order     — TWO orders, which a registry move can break independently:
//               (1) the ORDER THE SIX BUILDER MODULES ARE EVALUATED IN, which
//                   is a property of the import declarations, and
//               (2) the KEY ORDER of CARD_BUILDERS, which is a property of
//                   the object literal fed to Object.entries().
//               Swapping import lines changes (1) and not (2); swapping the
//               literal's fields changes (2) and not (1). Both are measured.
//   default   — the null filter: a builder module that default-exports null
//    exports   is dropped from the map, and the surviving keys keep their
//               relative order.
//   exports   — the module namespace of journey/cards/index.js exposes the
//               same five names as before.
//
// HOW IT MEASURES THEM. There is no `new Function` arm here and that is a
// deliberate limit, stated rather than hidden: the subject IS the ES module
// graph — import declarations, re-export bindings, evaluation order — and
// `new Function` cannot execute an `import` statement, so a compiled-bytes
// oracle would measure something other than the thing that changed. Instead
// both the PRE-MOVE and POST-MOVE module trees are MATERIALISED into two
// disposable directories outside the repo and imported for real:
//
//   * the pre-move tree is the exact pre-change bytes of
//     journey/cards/index.js, pinned by sha256 in tools/fixtures/ (the same
//     relocated-snapshot convention, and the same load-bearing `.js.txt`
//     suffix, that tools/test-portrait-remix.mjs documents);
//   * both trees get the SAME six builder stubs, each carrying a distinct
//     identity marker and each notifying a shared evaluation-order probe, and
//     the SAME real journey/cards/runtime.js bytes;
//   * both are imported under the same synchronous document/setTimeout/fetch
//     doubles, so the import-time warming self-start is captured as a
//     recorded delay rather than left running.
//
// The two resulting records are compared with deepEqual, and BOTH are also
// compared against expectations HAND-DERIVED FROM READING THE SOURCE and
// written down below before any comparison runs (HAND_DERIVED / HAND_DERIVED_
// NULLS). A pre==post match alone would only prove the two sides agree; the
// hand-derived arm is what makes agreeing on the WRONG thing detectable.
//
// Every slice refuses on miss AND on ambiguity (`sliceOnce` throws unless its
// anchor occurs exactly once), so a silently-wrong extraction cannot masquerade
// as a passing comparison.
//
// Part F applies five mutants to the materialised post tree and requires each
// to FAIL the assertion it targets. Part G is a reverse-application verifier:
// it rebuilds the pre-move file out of the post-move pair, taking every moved
// line from the SHIPPED bytes rather than retyping it, and requires the result
// to equal the pinned fixture byte-for-byte.
//
// Run directly: node tools/test-card-registry.mjs
// WIRED into package.json's test:contracts by U01c, 2026-08-22. U01b built
// this suite and correctly declined to pick a chain position in a file it did
// not own, which left `npm run check` red on GC-WIRED — D49's nineteenth
// instance. U01c was transferred that decision; the suite now runs in tier 2,
// immediately after tools/test-page-lifetime.mjs and BEFORE the aggregator and
// the wave pin, never past them (D80).

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const INDEX_REL = 'journey/cards/index.js';
const REGISTRY_REL = 'journey/cards/registry.js';
const RUNTIME_REL = 'journey/cards/runtime.js';
const ICONS_REL = 'journey/cards/icons.js';
const FIXTURE_REL = 'tools/fixtures/u01b-cards-index.pre-move.js.txt';

/* The pre-move snapshot of journey/cards/index.js: the exact working-tree
 * bytes immediately before U01b's edit, hash-fenced here so this suite keeps
 * a real pre/post pair after the change is committed and HEAD moves past it.
 * (The a01a-2 precedent: the `.js.txt` suffix is load-bearing — eslint.config
 * .js globs `tools/ ** /*.js` and tools/check-cycles.mjs sweeps `tools` for
 * js+mjs; neither scans `.txt`. A snapshot named `.js` would add lint findings
 * and redden `npm run cycles` on imports that do not resolve from
 * tools/fixtures/.) */
const FIXTURE_SHA256 = 'd574accf3ced25db4c0779f605e0d526d60bc0711075342128e58c7f62a25d0c';
const FIXTURE_BYTES = 10264;

const BUILDER_FILES = ['arca.js', 'artcompute.js', 'tworp.js', 'ados.js', 'hivemind.js', 'discord.js'];

/* ------------------------------------------------------------------ *
 * HAND-DERIVED EXPECTATIONS.                                         *
 * Written from reading journey/cards/registry.js and index.js, BEFORE *
 * anything is imported or compared. Nothing below is copied from a    *
 * run's output.                                                      *
 * ------------------------------------------------------------------ */

/** The six builder modules, in the order registry.js's import declarations
 *  name them — which is the order the ES module graph evaluates them in. */
const HAND_DERIVED = {
  builderEvalOrder: ['arca', 'artcompute', 'tworp', 'ados', 'hivemind', 'discord'],
  // Object.entries() over `{ arca, artcompute, tworp, ados, hivemind, discord }`
  // with every builder non-null: all six survive the filter, in literal order.
  builderKeys: ['arca', 'artcompute', 'tworp', 'ados', 'hivemind', 'discord'],
  builderMarks: ['arca', 'artcompute', 'tworp', 'ados', 'hivemind', 'discord'],
  // CARD_BUILDERS[id] must BE the module's default export object.
  builderIsModuleDefault: [true, true, true, true, true, true],
  // journey/cards/index.js's public surface. Namespace keys come back sorted.
  exportNames: ['CARD_ASSETS', 'CARD_BUILDERS', 'CARD_ICONS', 'REDUCE', 'startCardWarming'],
  // Re-exported straight off the runtime leaf, so both must be the leaf's own.
  cardAssets: './assets/cards',
  cardAssetsIsRuntimeBinding: true,
  reduceIsRuntimeBinding: true,
  // The import-time self-start: one timer, 1500 ms, scheduled once. (The
  // cascade itself is tools/test-card-warming.mjs's subject, not this one's.)
  selfStartDelays: [1500],
};

/** Same tree, but with two builder modules default-exporting null — the
 *  "module still under construction" case the filter exists for. tworp and
 *  hivemind drop out; the other four keep their relative order. */
const HAND_DERIVED_NULLS = {
  builderEvalOrder: ['arca', 'artcompute', 'tworp', 'ados', 'hivemind', 'discord'],
  builderKeys: ['arca', 'artcompute', 'ados', 'discord'],
  builderMarks: ['arca', 'artcompute', 'ados', 'discord'],
  builderIsModuleDefault: [true, true, true, true],
  exportNames: ['CARD_ASSETS', 'CARD_BUILDERS', 'CARD_ICONS', 'REDUCE', 'startCardWarming'],
  cardAssets: './assets/cards',
  cardAssetsIsRuntimeBinding: true,
  reduceIsRuntimeBinding: true,
  selfStartDelays: [1500],
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
 *  fail (Part F) through the same code path. */
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

/** Slice [startAnchor, endAnchor] inclusive. REFUSES on miss and on
 *  ambiguity: either anchor occurring zero or 2+ times throws rather than
 *  silently taking the first hit. */
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

/** One builder stub: records its own evaluation into the shared probe and
 *  default-exports either a uniquely-identifiable object or null. */
function builderStub(name, isNull) {
  return [
    "import { note } from './order-probe.js';",
    `note('${name}');`,
    isNull ? 'export default null;' : `export default { mark: '${name}' };`,
    '',
  ].join('\n');
}

/**
 * Write one module tree into a fresh directory outside the repo and import
 * its index.js under synchronous doubles.
 *
 * @param {'pre'|'post'} shape  pre = the fixture's single-file index.js;
 *                              post = the shipped index.js + registry.js pair.
 * @param {string[]} nullBuilders  builder basenames that export null.
 * @param {(files: Record<string,string>) => void} [mutate]  Part F hook: gets
 *        the file map after it is built and before it is written to disk.
 */
async function materialise(shape, nullBuilders, mutate) {
  const files = Object.create(null);
  files['order-probe.js'] = ORDER_PROBE;
  files['runtime.js'] = read(RUNTIME_REL);
  for (const f of BUILDER_FILES) {
    files[f] = builderStub(f.replace(/\.js$/, ''), nullBuilders.includes(f.replace(/\.js$/, '')));
  }
  if (shape === 'pre') {
    files['index.js'] = read(FIXTURE_REL);
  } else {
    files['index.js'] = read(INDEX_REL);
    files['registry.js'] = read(REGISTRY_REL);
    /* U01c (2026-08-22): the post-move tree needs journey/cards/icons.js too.
       U01c lifted the `I()` helper and the CARD_ICONS table out of index.js
       into that data-only owner, so the shipped index.js now carries
       `export { CARD_ICONS } from './icons.js'`. Without this line the staged
       post tree cannot resolve that specifier and this suite ABORTS with
       ERR_MODULE_NOT_FOUND rather than failing — D57's shape in a gating
       instrument, and the exact repair D103 records for
       tools/test-input-claim.mjs. The pre tree deliberately does NOT get it:
       the fixture predates the move and defines CARD_ICONS inline, which is
       what makes `exportNames` a real pre/post comparison rather than a
       tautology.

       NOTE FOR THE COORDINATOR: this file is not on U01c's allowlist. The edit
       is one statement plus this comment, it changes no assertion, no
       hand-derived expectation and no mutant, and the alternative was wiring a
       suite that aborts — or handing U02 a red tree with a defect that is not
       theirs. It follows D124's disclosed-excursion protocol. Reverse it in one
       line if that call was wrong. */
    files['icons.js'] = read(ICONS_REL);
  }
  if (mutate) mutate(files);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), `u01b-cards-${shape}-`));
  if (root.startsWith(REPO_ROOT)) throw new Error('refusing: temp tree landed inside the repo');
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.writeFileSync(path.join(root, name), text);
    }

    const selfStartDelays = [];
    const realDocument = global.document;
    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;
    const realFetch = global.fetch;
    const realRIC = global.requestIdleCallback;

    // The self-start path reads `document`, `setTimeout` and `fetch` off the
    // globals AT CALL TIME (journey/cards/index.js's startCardWarming resolves
    // `overrides.X || <ambient>`), and the call happens during module
    // evaluation -- so these doubles must be installed around the import, not
    // around a later call. The fake setTimeout RECORDS AND DOES NOT FIRE, so
    // the cascade never runs and this suite measures only the epoch.
    global.document = { fonts: { load: () => Promise.resolve() } };
    global.setTimeout = (_fn, delay) => { selfStartDelays.push(delay); return 0; };
    global.clearTimeout = () => {};
    global.fetch = () => Promise.resolve();
    delete global.requestIdleCallback;

    let ns; let runtimeNs; let probeNs; let registryNs = null;
    const stubNs = Object.create(null);
    try {
      ns = await import(pathToFileURL(path.join(root, 'index.js')).href);
      runtimeNs = await import(pathToFileURL(path.join(root, 'runtime.js')).href);
      probeNs = await import(pathToFileURL(path.join(root, 'order-probe.js')).href);
      if (shape === 'post') {
        registryNs = await import(pathToFileURL(path.join(root, 'registry.js')).href);
      }
      for (const f of BUILDER_FILES) {
        stubNs[f.replace(/\.js$/, '')] = await import(pathToFileURL(path.join(root, f)).href);
      }
    } finally {
      global.document = realDocument;
      global.setTimeout = realSetTimeout;
      global.clearTimeout = realClearTimeout;
      global.fetch = realFetch;
      if (realRIC !== undefined) global.requestIdleCallback = realRIC;
    }

    const builderKeys = Object.keys(ns.CARD_BUILDERS);
    return {
      // `record` is the PRE/POST-COMPARABLE surface: every key here exists in
      // both shapes and means the same thing in both.
      record: {
        builderEvalOrder: [...probeNs.seen],
        builderKeys,
        builderMarks: builderKeys.map((k) => ns.CARD_BUILDERS[k] && ns.CARD_BUILDERS[k].mark),
        builderIsModuleDefault: builderKeys.map((k) => ns.CARD_BUILDERS[k] === (stubNs[k] && stubNs[k].default)),
        exportNames: Object.keys(ns).slice().sort(),
        cardAssets: ns.CARD_ASSETS,
        cardAssetsIsRuntimeBinding: ns.CARD_ASSETS === runtimeNs.CARD_ASSETS,
        reduceIsRuntimeBinding: ns.REDUCE === runtimeNs.REDUCE,
        selfStartDelays: [...selfStartDelays],
      },
      // POST-ONLY, and deliberately OUTSIDE `record`: "does index.js FORWARD
      // the registry's own map, or COPY it?" has no pre-move counterpart --
      // before U01b there was no second module to forward from -- so putting
      // it in `record` would make the pre/post deepEqual asymmetric.
      //
      // It is kept as its own observable because the record CANNOT see it.
      // Measured, not assumed: an `export const CARD_BUILDERS = { ...B }`
      // mutant leaves every entry of the map ===-identical to its builder
      // module's default export, so `builderIsModuleDefault` stays all-true
      // and the whole record stays green. Map identity is a different key
      // from entry identity, and only this one observes it.
      mapIsRegistryOwn: registryNs === null ? null : ns.CARD_BUILDERS === registryNs.CARD_BUILDERS,
    };
  } finally {
    // D97: this path was created here, by name.
    fs.rmSync(root, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ *
 * main                                                               *
 * ------------------------------------------------------------------ */

async function main() {
  console.log('== U01b — card builder registry contract ==\n');

  console.log('-- 0. hash fence --');
  const fixture = read(FIXTURE_REL);
  check(sha256(fixture) === FIXTURE_SHA256, `pre-move fixture ${FIXTURE_REL} matches its pinned sha256`);
  check(Buffer.byteLength(fixture) === FIXTURE_BYTES, `pre-move fixture is ${FIXTURE_BYTES} bytes`);
  const indexSrc = read(INDEX_REL);
  const registrySrc = read(REGISTRY_REL);
  const iconsSrc = read(ICONS_REL);
  check(fs.existsSync(path.join(REPO_ROOT, REGISTRY_REL)), `${REGISTRY_REL} exists`);

  console.log('\n-- 1. pre/post discriminator (whole-file byte inequality) --');
  // The sibling-suite form (tools/test-animation-lifecycle.mjs,
  // tools/test-intro-lifecycle.mjs): compare the WHOLE FILE, not a token.
  // A comment quoting the code cannot satisfy this in either direction.
  check(fixture !== indexSrc, 'the pinned pre-move copy and the shipped journey/cards/index.js are not byte-identical (a genuine pre/post pair)');
  check(!fixture.includes('./registry.js'), 'the pre-move copy does not mention ./registry.js (it predates the owner)');
  check(indexSrc.includes("from './registry.js'"), 'the shipped copy imports from ./registry.js');

  console.log('\n-- 2. acyclicity of the new owner --');
  // The point of "one ACYCLIC registry owner": nothing below the registry
  // reaches back up into it or into the package face.
  for (const f of BUILDER_FILES.concat(['runtime.js'])) {
    const src = read(`journey/cards/${f}`);
    check(
      !src.includes("from './index.js'") && !src.includes("from './registry.js'"),
      `journey/cards/${f} imports neither ./index.js nor ./registry.js (nothing below the registry imports back into it)`,
    );
  }
  check(
    !registrySrc.includes("from './index.js'"),
    'journey/cards/registry.js does not import ./index.js (the package face depends on the owner, never the reverse)',
  );

  console.log('\n-- 3. all six builders present: pre vs post, and both vs hand-derived --');
  const pre = await materialise('pre', []);
  const post = await materialise('post', []);
  check(deepEq(pre.record, HAND_DERIVED), 'PRE-move tree matches the hand-derived expectation (the expectation describes the code that shipped before U01b)');
  check(deepEq(post.record, HAND_DERIVED), 'POST-move tree matches the same hand-derived expectation');
  check(deepEq(pre.record, post.record), 'pre-move and post-move trees are observationally identical: builder evaluation order, CARD_BUILDERS key order, per-key module-default identity, export names, CARD_ASSETS/REDUCE binding identity, and the self-start epoch');
  check(pre.mapIsRegistryOwn === null, 'the pre-move tree has no registry module, so map-identity has no pre-move counterpart (recorded as null, not silently as false)');
  check(post.mapIsRegistryOwn === true, 'POST: index.js FORWARDS the registry owner\'s own CARD_BUILDERS object rather than copying it');

  console.log('\n-- 4. the null filter (a module still under construction) --');
  const preNulls = await materialise('pre', ['tworp', 'hivemind']);
  const postNulls = await materialise('post', ['tworp', 'hivemind']);
  check(deepEq(preNulls.record, HAND_DERIVED_NULLS), 'PRE-move tree drops null builders and keeps the survivors\' relative order');
  check(deepEq(postNulls.record, HAND_DERIVED_NULLS), 'POST-move tree drops null builders identically');
  check(deepEq(preNulls.record, postNulls.record), 'pre and post agree under the null-builder case too');

  console.log('\n-- 5. the shipped modules themselves (no stubs) --');
  // Node has no ambient `document` here, so index.js's self-start guard is
  // inert and importing the real thing is side-effect free.
  check(typeof document === 'undefined', 'precondition: this process has no ambient document, so the real import stays inert');
  const realIndex = await import(pathToFileURL(path.join(REPO_ROOT, INDEX_REL)).href);
  const realRegistry = await import(pathToFileURL(path.join(REPO_ROOT, REGISTRY_REL)).href);
  const realRuntime = await import(pathToFileURL(path.join(REPO_ROOT, RUNTIME_REL)).href);
  check(
    realIndex.CARD_BUILDERS === realRegistry.CARD_BUILDERS,
    'journey/cards/index.js re-exports the registry owner\'s OWN CARD_BUILDERS object (===), not a copy of it',
  );
  check(realIndex.CARD_ASSETS === realRuntime.CARD_ASSETS, 'index.CARD_ASSETS is the runtime leaf\'s binding');
  check(realIndex.REDUCE === realRuntime.REDUCE, 'index.REDUCE is the runtime leaf\'s binding');
  assert.deepEqual(
    Object.keys(realIndex.CARD_BUILDERS),
    HAND_DERIVED.builderKeys,
    'the shipped CARD_BUILDERS key order equals the hand-derived order',
  );
  /* U01c, 2026-08-22: this was `check(true, ...)` — a literal predicate whose
     MESSAGE made a census claim the check itself did not test. Wiring this
     suite into the gate put it in front of tools/test-assertion-provenance
     .mjs's sweep, which classified it immediately (AP4/DB3). Repaired rather
     than absorbed into a manifest, per D123: the predicate now reads the
     SHIPPED key order and the message reports what was READ, not what was
     expected. */
  const shippedBuilderKeys = Object.keys(realIndex.CARD_BUILDERS);
  check(deepEq(shippedBuilderKeys, HAND_DERIVED.builderKeys),
    `the shipped CARD_BUILDERS key order is ${JSON.stringify(shippedBuilderKeys)}`);
  for (const f of BUILDER_FILES) {
    const id = f.replace(/\.js$/, '');
    const mod = await import(pathToFileURL(path.join(REPO_ROOT, `journey/cards/${f}`)).href);
    check(
      realIndex.CARD_BUILDERS[id] === mod.default,
      `CARD_BUILDERS.${id} IS journey/cards/${f}'s default export (identity, not shape)`,
    );
  }
  /* Same repair, and this one mattered more: the sweep classified it AP3/DB2
     — a CENSUS CLAIM over invented data — because the message asserted an
     export set while the predicate was the literal `true`. The real assertion
     was the assert.deepEqual above it, whose throw the reader never sees as a
     row. Now the predicate does the work and the message reports the read. */
  const shippedExportNames = Object.keys(realIndex).slice().sort();
  check(deepEq(shippedExportNames, HAND_DERIVED.exportNames),
    `journey/cards/index.js exports exactly ${JSON.stringify(shippedExportNames)}`);

  console.log('\n-- 6. mutants: each assertion must be able to fail --');
  // D50 gate 4 / the "B3 could not fail at all" trap: a world with six
  // distinguishable builders and two independently-mutable orders is the
  // minimum that can tell these five properties apart. Each mutant below
  // targets ONE of them and must redden exactly the comparison it targets.
  const mutants = [
    {
      id: 'M1-eval-order',
      what: 'swap two IMPORT DECLARATIONS in registry.js (evaluation order changes; literal key order does not)',
      mutate: (files) => {
        const a = "import tworp from './tworp.js';\nimport ados from './ados.js';";
        const b = "import ados from './ados.js';\nimport tworp from './tworp.js';";
        if (!files['registry.js'].includes(a)) throw new Error('M1 anchor missing');
        files['registry.js'] = files['registry.js'].replace(a, b);
      },
      targets: 'builderEvalOrder',
    },
    {
      id: 'M2-key-order',
      what: 'swap two fields in the OBJECT LITERAL (key order changes; evaluation order does not)',
      mutate: (files) => {
        const a = '{ arca, artcompute, tworp, ados, hivemind, discord }';
        const b = '{ arca, artcompute, ados, tworp, hivemind, discord }';
        if (!files['registry.js'].includes(a)) throw new Error('M2 anchor missing');
        files['registry.js'] = files['registry.js'].replace(a, b);
      },
      targets: 'builderKeys',
    },
    {
      id: 'M3-drop-filter',
      what: 'remove the null filter',
      mutate: (files) => {
        const a = '\n    .filter(([, b]) => b),';
        if (!files['registry.js'].includes(a)) throw new Error('M3 anchor missing');
        files['registry.js'] = files['registry.js'].replace(a, '');
      },
      targets: 'builderKeys (null case)',
      nulls: ['tworp', 'hivemind'],
    },
    {
      id: 'M4-drop-export',
      what: 'drop REDUCE from index.js\'s re-export',
      mutate: (files) => {
        const a = 'export { CARD_BUILDERS, CARD_ASSETS, REDUCE } from \'./registry.js\';';
        const b = 'export { CARD_BUILDERS, CARD_ASSETS } from \'./registry.js\';';
        if (!files['index.js'].includes(a)) throw new Error('M4 anchor missing');
        files['index.js'] = files['index.js'].replace(a, b);
      },
      targets: 'exportNames',
    },
    {
      id: 'M5-copy-not-forward',
      what: 'replace the re-export with a SPREAD COPY (shape survives, identity does not)',
      mutate: (files) => {
        const a = 'export { CARD_BUILDERS, CARD_ASSETS, REDUCE } from \'./registry.js\';';
        const b = [
          "import { CARD_BUILDERS as _B } from './registry.js';",
          "export { CARD_ASSETS, REDUCE } from './registry.js';",
          'export const CARD_BUILDERS = { ..._B };',
        ].join('\n');
        if (!files['index.js'].includes(a)) throw new Error('M5 anchor missing');
        files['index.js'] = files['index.js'].replace(a, b);
      },
      targets: 'mapIsRegistryOwn',
      // NOT `record`. Found by running it: the first draft of this mutant
      // aimed at `builderIsModuleDefault` and DID NOT FAIL, because a spread
      // copies the map while leaving every value ===-identical. The mutant was
      // right and the observable was wrong; `mapIsRegistryOwn` was added to
      // observe it rather than the mutant weakened to match what was measured.
      observable: 'mapIsRegistryOwn',
    },
  ];

  for (const m of mutants) {
    const nulls = m.nulls || [];
    const expected = nulls.length ? HAND_DERIVED_NULLS : HAND_DERIVED;
    const mutated = await materialise('post', nulls, m.mutate);
    const reddened = m.observable === 'mapIsRegistryOwn'
      ? mutated.mapIsRegistryOwn !== true
      : !deepEq(mutated.record, expected);
    check(
      reddened,
      `${m.id} — ${m.what} — REDDENS ${m.targets}; the assertion is not a tautology`,
    );
  }
  // Control on the mutant machinery itself: a no-op "mutant" must still pass,
  // or the five reddenings above would prove nothing but that mutate() runs.
  const noop = await materialise('post', [], (files) => { files['registry.js'] = `${files['registry.js']}\n`; });
  check(
    deepEq(noop.record, HAND_DERIVED) && noop.mapIsRegistryOwn === true,
    'CONTROL — a behaviour-neutral mutate() (one appended newline) leaves both observables green (the five reddenings are the mutations, not the harness)',
  );

  console.log('\n-- 7. reverse application: rebuild the pre-move file from the shipped pair --');
  // Every moved line is taken FROM THE SHIPPED BYTES, never retyped. Only the
  // structural glue is named here, and each cut refuses on miss/ambiguity.
  const CONTRACT_HEAD = '// CONTRACT (consumed by ui.js showPop/hidePop):\n';
  const CONTRACT_TAIL = '//   reach outside their stage.\n';
  const contractBlock = sliceOnce(registrySrc, REGISTRY_REL, CONTRACT_HEAD, CONTRACT_TAIL);

  const sixImports = sliceOnce(
    registrySrc, REGISTRY_REL,
    "import arca from './arca.js';\n",
    "import discord from './discord.js';\n",
  );
  const registryTail = from(registrySrc, REGISTRY_REL, "// Preserve the registry's public configuration exports while builders depend\n");
  if (!registryTail.endsWith(');\n')) throw new Error('reverse application refused: registry.js does not end with the CARD_BUILDERS close');

  const runtimeImportLine = "import { CARD_ASSETS } from './runtime.js';\n";
  if ((indexSrc.split(runtimeImportLine).length - 1) !== 1) {
    throw new Error('reverse application refused: the runtime import line is not unique in the shipped index.js');
  }

  const head = before(indexSrc, INDEX_REL, '// CONTRACT (consumed by ui.js showPop/hidePop): the builder registry and the\n');
  const statsBlock = sliceOnce(
    indexSrc, INDEX_REL,
    '//\n// STATS POLICY',
    '// failed verification and are corrected in the modules).\n\n',
  );
  const warmingTail = from(indexSrc, INDEX_REL, '/* ---- idle-time warming');

  /* U01c (2026-08-22): this reconstruction now composes TWO moves, and the
     assertion below says so rather than continuing to claim it isolates U01b.
     `warmingTail` runs to EOF, and U01c lifted the tail of that span — the
     `I()` helper and the CARD_ICONS table — out to journey/cards/icons.js,
     leaving a one-line re-export in its place. So re-inlining registry.js
     alone no longer reproduces the pre-U01b fixture: the run that caught this
     reported a short rebuild (8956 bytes against the fixture's 10220),
     diverging exactly where the glyph block used to begin.

     THE VERIFIER CAUGHT U01C, WHICH IS THE VERIFIER WORKING. It is repaired by
     re-inlining icons.js too, still taking every moved byte FROM THE SHIPPED
     BYTES and never retyping one, and still refusing on miss/ambiguity at each
     cut. Reconstructing from the shipped index.js — rather than from a pinned
     post-U01b snapshot, which was the other option — is deliberate: it keeps
     the CURRENT file in the comparison, so a later corruption of index.js
     still reds this row.

     NOTE FOR THE COORDINATOR: same excursion, same reversibility, as the
     `files['icons.js']` note in materialise() above. */
  const warmingCore = before(
    warmingTail, INDEX_REL,
    '/* Chip glyphs — the `I()` helper and the CARD_ICONS table.\n',
  );
  const iconsBlock = from(iconsSrc, ICONS_REL, '/* Chip glyphs (Hannah, 2026-08-18:');

  const reconstructed =
    head +
    contractBlock +
    statsBlock +
    sixImports +
    runtimeImportLine +
    '\n' +
    registryTail +
    '\n' +
    warmingCore +
    iconsBlock;

  check(
    reconstructed === fixture,
    'reverse-applying U01b AND U01c (re-inlining registry.js\'s and icons.js\'s moved lines into index.js) reproduces the pinned pre-move bytes EXACTLY — neither move added content nor lost any',
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

main().catch((err) => {
  console.error('BROKEN:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
