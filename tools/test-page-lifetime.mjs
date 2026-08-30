#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-page-lifetime.mjs — order J05, the page-lifetime register.
 *
 *   node tools/test-page-lifetime.mjs
 *   node tools/test-page-lifetime.mjs --prove-failure
 *
 * SUBJECT — the runbook's J05 row: "document and test page-lifetime
 * singleton handlers separately from journey recreation", acceptance "one
 * install per page module; no journey accumulation".
 *
 *   flags.js                  the import-time migrateTransformStorage IIFE
 *                             (coordinator D18), whose disposition this order
 *                             decides. It is CLASSIFIED as an accepted
 *                             page-lifetime singleton and area A is the
 *                             evidence for that decision, not a decoration
 *                             on top of it.
 *   main.js                   fourteen listener sites, one removal site, and
 *                             the page-lifetime register the file now carries
 *                             in its own header block.
 *   journey/transport.js      onWheel — READ ONLY, and the reason it is here
 *                             is in area C.
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   That every page-lifetime registration in this tree installs exactly once
 *   per page — with the ONE INSTALL claim resting on a measured antecedent
 *   (no module is named under two specifier forms) rather than on the ESM
 *   spec being quoted at it.
 *
 *   THE OTHER HALF OF J05'S ROW — "no journey accumulation across a
 *   build/dispose/build cycle" — WAS RETIRED WITH THE DISPOSAL MACHINERY on
 *   2026-08-25. There is no cycle: this page boots one journey and keeps it
 *   until the tab closes. See area E below and
 *   docs/code-health/DISPOSAL-REMOVED.md.
 *
 * THE FIVE AREAS
 *   S  the eight slices this suite compiles are whole statement runs.
 *   A  flags.js's IIFE. Compiled from its own text and EXECUTED against a
 *      fake store, plus the REAL module imported four times in a CHILD
 *      PROCESS with a recording store on that child's global.
 *   B  main.js's register, STATIC. main.js cannot be instantiated in node
 *      (it imports three.js, builds DOM and starts a scene), so every claim
 *      here is a claim about what the source says. Every zero stands beside
 *      a non-empty set the same scanner found in the same call (D102).
 *   C  the three regions that CAN be driven out of a browser, sliced from
 *      production text under refusing, ambiguity-checked anchors, compiled
 *      and executed.
 *   D  one install per page module — the specifier census over the shipped
 *      graph, whose mechanism control is A5.
 *
 * EXPECTATIONS WERE WRITTEN DOWN FIRST, in
 *   docs/code-health/evidence/2026-08-21-elegance-run-01/j05/expectations.md,
 *   before this file existed. Two corrections were needed and both are
 *   recorded there with what was wrong.
 *
 * D88, THE REGISTRY'S DECLARED BLIND SPOTS. `inputCanon` hashes String(fn),
 *   so every mutant here perturbs SOURCE TEXT which the reader then compiles;
 *   none swaps an already-built closure. Where a property cannot be expressed
 *   through canonicalisation at all — listener IDENTITY on removal, and the
 *   DOM's capture-flag matching rule — the check is EXECUTED INSIDE THE
 *   READER and the pin reads the world's verdict rather than a digest.
 *
 * D105 — every reader BUILDS ITS WORLD FROM A SPEC on each call. Nothing is
 *   registered pre-built and mutated.
 *
 * THE TWO HARNESS TRAPS THIS ORDER WAS WARNED ABOUT, and how each is
 * avoided rather than survived:
 *   1. A world installed on the real globalThis and not taken away turns
 *      every later reader into a measurement of the harness. The one row
 *      that needs a store on the global (A5) runs in a CHILD PROCESS, so
 *      THIS process's global is never written at all. `F6` compares the
 *      four slots' accessor identity from before the first area to after
 *      the last one, which is the check a `finally` nobody reads is not.
 *
 * A THIRD TRAP, FOUND HERE RATHER THAN INHERITED: this registry's readers
 *   are SYNCHRONOUS BY CONTRACT — `pin()` hands `reader(input)` straight to
 *   the ledger. An `async` reader returns a Promise, `canon()` flattens it
 *   to `{}`, and gate 1 then passes against any expectation at all. The
 *   first draft of A5 was async. See runChild() for what replaced it.
 *
 * WHAT THIS SUITE DOES NOT PROVE — stated with the code:
 *   * It never runs a browser and never runs the capture pipeline. The 11
 *     hashed capture entries are NOT TOUCHED by this order; that is the
 *     claim, not "still correct".
 *   * main.js is never executed as a module. Three regions are sliced from
 *     its text and compiled; the surrounding ~1,300 lines are not, so nothing
 *     here says the page still boots. Same standing limitation J04c, J04d and
 *     J04e recorded for journey/journey.js, now recorded for main.js too.
 *   * Nothing calls dispose() in production. Area E's three cycles run in a
 *     scenario this suite constructs. The whole Wave-3 family's limitation.
 *   * The live registration COUNT on a real page is not measured. Three of
 *     main.js's fourteen sites sit inside a loop over three callouts, so the
 *     site count and the live count differ and only the site count is
 *     asserted here. A live count needs an instrumented browser and belongs
 *     to the G1 gate owner.
 *   * `journey/transport.js`, `journey/scroll.js` and `journey/state.js` are
 *     READ, never written. Their eight unowned registrations are still
 *     unowned when this order closes; area C proves what the neutralisation
 *     does, not that the listeners were detached.
 * ==================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, statSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';

import {
  literalPredicateRe, literalPredicateHits, literalPredicateProbe,
  maskedToken, selfSiteSet, foreignSiteSet, scanTautologyAst,
} from './self-controls.mjs';
import {
  HarnessFault, fault, mutateText, sliceBetween, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import { stripComments } from './strip-comments.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

/* D84 — the global's shape BEFORE any area runs, so F6 can compare rather
   than guess. The first draft of F6 asserted that `localStorage` is absent
   from globalThis in node and it is NOT: node 26 provides it as a built-in
   accessor. An absence asserted over a world you have not looked at is the
   error D102 names, and it arrived here in this suite's own controls. */
const slotOf = (k) => {
  /* getOwnPropertyDescriptor ALLOCATES a fresh object on every call, so the
     descriptors themselves can never be compared by identity — the first
     draft of F6 did exactly that and reported localStorage as MOVED against
     an untouched global. What IS stable is the accessor or the value the
     descriptor carries, so that is what gets held. */
  const d = Object.getOwnPropertyDescriptor(globalThis, k);
  return d ? (d.get ?? d.value) : undefined;
};
const GLOBAL_AT_START = ['localStorage', 'addEventListener', 'removeEventListener', 'document']
  .map((k) => [k, slotOf(k)]);
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-page-lifetime', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');
/* HYGIENE-01's treatment, applied by DIET-02 2026-08-26 — THE LAST OF THE
   ELEVEN. This suite was the one exclusion from that sweep because DEFECT-01
   held the file; it has long since released it, and 46 trees were standing.

   AN EXIT HOOK AND NOT A `try/finally`, for HYGIENE-01's two measured reasons,
   both of which hold here: the root is created at MODULE TOP LEVEL, so there
   is no enclosing `try` to attach a finally to, and this suite terminates via
   `process.exit()` on both of its paths — the finally would never run.

   Removal is best effort by design: a suite must not fail because a temp tree
   was already gone. The children this scratch holds are ES modules spawned
   with execFileSync, which have all returned by the time the process exits. */
const scratch = mkdtempSync(join(tmpdir(), 'j05-page-'));
process.on('exit', () => {
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ }
});

/** Code lines only, through the ONE shared stripper (S-3 / D67). String
 *  CONTENTS are kept: every row below quotes an event type, and blanking
 *  them would pin rows of empty quotes that agree with each other whatever
 *  the types become. */
const code = (src) => stripComments(src);

/** sliceBetween with J02's ambiguity refusal in front of it: a text slicer
 *  that silently takes the first of two matches is D85's family.
 *
 *  ONLY THE START ANCHOR CAN BE CHECKED FOR UNIQUENESS, and the first draft
 *  of this helper got that wrong. It also required the END anchor to occur
 *  exactly once after the head, which sounds stricter and is unusable: real
 *  tails are `];`, `\n  }`, `;`, and every one of them recurs a hundred
 *  times further down the file. sliceBetween already searches for the tail
 *  AFTER the head, so the first match is the right one whenever the head is
 *  unique — flags.js's `\n})();`, which occurs twice in the file, resolves
 *  correctly for exactly that reason. What a drifting tail actually needs is
 *  a STRUCTURAL check on the result, and that is `S1`. */
function uniqueSlice(src, tag, startAnchor, endAnchor) {
  const nStart = src.split(startAnchor).length - 1;
  if (nStart !== 1) fault(`ambiguous slice (${tag}): start anchor occurs ${nStart} times, expected exactly 1`);
  return sliceBetween(src, tag, startAnchor, endAnchor);
}

/** A slice's structural verdict: `balanced` if every bracket class closes,
 *  plus the ONE closing character. Strings are blanked first so a bracket
 *  inside a literal is not counted. A fragment shows up as unbalanced, and a
 *  tail that drifted past its statement shows up as the wrong closer. */
function shape(text) {
  const t = stripComments(text, { blankStrings: true });
  const n = (ch) => (t.split(ch).length - 1);
  const balanced = n('{') === n('}') && n('(') === n(')') && n('[') === n(']');
  return `${balanced ? 'balanced' : 'UNBALANCED'}:${t.trim().slice(-1)}`;
}

const SRC = {
  flags: read('flags.js'),
  main: read('main.js'),
  /* B01, 2026-08-23 — THE REGISTER IS NOW TWO FILES. main.js kept every PAGE
     and GATED registration, because page wiring is what that file is for. The
     ONE BOUNDED registration — the intro input capture, six event types
     attached and taken back off — went with the machine that bounds it,
     journey/boot/handoff.js. A lifecycle split from its owner is how a leak
     gets written, so the pair travelled together and this suite followed it.

     Nothing about the classification changed. Section B below reads the UNION
     of the two files and requires the same site set it always required, now
     carrying the file each site lives in — which makes it strictly stronger,
     since a site that MOVED between the two would red where a bare count
     would not. The three C-slices resolve against this text instead of
     main.js's; their anchors are unchanged, character for character, because
     the code they name is unchanged. That is D93 working: a text-keyed anchor
     survives a move, and would have refused (as it did, once) rather than
     silently take the wrong slice. */
  handoff: read('journey/boot/handoff.js'),
  transport: read('journey/transport.js'),
  journey: read('journey/journey.js'),
  backdrop: read('journey/backdrop.js'),
};

/** The page's listener register, as the files that hold it. Section B reads
 *  the union; nothing else may add a file here without a note saying which
 *  class of registration moved and why. */
const REGISTER = (i) => [['main.js', i.main], ['journey/boot/handoff.js', i.handoff]];

/** Every line in the register matching `re`, as `file :: trimmed code`. */
const registerSites = (i, re) => REGISTER(i).flatMap(([rel, src]) =>
  code(src).split('\n').map((l) => l.trim()).filter((l) => re.test(l))
    .map((l) => `${rel} :: ${l}`)).sort();

/* ------------------------------------------------------------------ *
 * THE SLICES. Every anchor refuses on a miss AND on ambiguity.         *
 * ------------------------------------------------------------------ */

const A_FLAGS_HEAD = '(function migrateTransformStorage() {';
const A_FLAGS_TAIL = '\n})();';
const C_EVENTS = "  const INTRO_INPUT_EVENTS = ['wheel',";
const C_STOP_HEAD = '  function stopIntroInputCapture() {';
const C_STOP_TAIL = 'removeEventListener(type, onIntroInput, true);\n  }';
const C_REG_HEAD = '  introCaptureLive = true;\n  for (const type of INTRO_INPUT_EVENTS) {';
const C_REG_TAIL = '\n  }';
const C_SERIF_HEAD = "addEventListener('keydown', (e) => {\n  if (e.key !== 'b' && e.key !== 'B') return;";
const C_SERIF_TAIL = "  document.body.classList.toggle('body-serif');\n});";
const C_WHEEL_HEAD = '  function onWheel(e) {';
const C_WHEEL_TAIL = "    host.push(d, 'wheel');\n  }";
const SLICE = {
  migrate: uniqueSlice(SRC.flags, 'flags-migrate', A_FLAGS_HEAD, A_FLAGS_TAIL),
  events: uniqueSlice(SRC.handoff, 'intro-events', C_EVENTS, '];'),
  stop: uniqueSlice(SRC.handoff, 'intro-stop', C_STOP_HEAD, C_STOP_TAIL),
  register: uniqueSlice(SRC.handoff, 'intro-register', C_REG_HEAD, C_REG_TAIL),
  serif: uniqueSlice(SRC.main, 'serif-key', C_SERIF_HEAD, C_SERIF_TAIL),
  wheel: uniqueSlice(SRC.transport, 'on-wheel', C_WHEEL_HEAD, C_WHEEL_TAIL),
};

/* ------------------------------------------------------------------ *
 * WORLDS — built from nothing but their own function on every call.    *
 * ------------------------------------------------------------------ */

/** A localStorage that records every operation in call order. `throwing`
 *  makes every method throw, which is privacy mode. */
function makeStore(seed = {}, { throwing = false } = {}) {
  const data = { ...seed };
  const ops = [];
  const guard = (label, fn) => {
    if (throwing) { ops.push(`${label} -> THREW`); throw new Error('storage unavailable'); }
    return fn();
  };
  return {
    ops,
    snapshot: () => ({ ...data }),
    getItem(k) {
      return guard(`get:${k}`, () => {
        ops.push(`get:${k}`);
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      });
    },
    setItem(k, v) { return guard(`set:${k}`, () => { ops.push(`set:${k}=${v}`); data[k] = String(v); }); },
    removeItem(k) { return guard(`remove:${k}`, () => { ops.push(`remove:${k}`); delete data[k]; }); },
  };
}

const capOf = (opts) => (opts === true ? true : !!(opts && opts.capture));

/** A listener table that matches removals the way the DOM does: on
 *  (type, capture-flag, callback identity) and NOT on the options OBJECT.
 *  main.js registers the intro capture with `{ capture: true, passive: true }`
 *  and removes it with a bare `true`; a world that compared option shapes
 *  would call correct production code a leak. */
function makeDom() {
  const ops = [];
  const table = new Map();
  const key = (target, type, opts) => `${target}|${type}|${capOf(opts) ? 'cap' : 'bub'}`;
  const rec = (target) => ({
    add(type, fn, opts) {
      ops.push(`+${target}:${type}:${capOf(opts) ? 'cap' : 'bub'}:${opts === true ? 'true' : JSON.stringify(opts ?? null)}`);
      table.set(key(target, type, opts), fn);
    },
    remove(type, fn, opts) {
      const held = table.get(key(target, type, opts));
      const same = held !== undefined && held === fn;
      ops.push(`-${target}:${type}:${capOf(opts) ? 'cap' : 'bub'}:${same ? 'sameFn' : 'MISS'}`);
      if (same) table.delete(key(target, type, opts));
    },
  });
  const view = rec('window');
  const body = { classList: { set: new Set(),
    add(c) { this.set.add(c); ops.push(`+class:${c}`); },
    remove(c) { this.set.delete(c); ops.push(`-class:${c}`); },
    toggle(c) { if (this.set.has(c)) this.remove(c); else this.add(c); },
    contains(c) { return this.set.has(c); } } };
  return {
    ops,
    body,
    document: { body },
    add: (t, f, o) => view.add(t, f, o),
    remove: (t, f, o) => view.remove(t, f, o),
    live: () => [...table.keys()].sort(),
    fire(type, event, cap = true) {
      const fn = table.get(`window|${type}|${cap ? 'cap' : 'bub'}`);
      if (!fn) return 'no-listener';
      fn(event);
      return 'dispatched';
    },
  };
}

/* ------------------------------------------------------------------ *
 * COMPILERS — text in, runnable out, so a mutant is always a text      *
 * perturbation the reader then compiles (D88).                         *
 * ------------------------------------------------------------------ */

/** flags.js's IIFE, with the two key constants declared exactly as the
 *  module declares them and `localStorage` arriving as a PARAMETER, so the
 *  compiled body cannot reach the real global. */
function runMigrate(text, store) {
  const body = `'use strict';
const TRANSFORM_KEY = 'journey.transform';
const TRANSFORM_KEY_OLD = 'journey-v6.transform';
${text}`;
  new Function('localStorage', body)(store);
}

/** main.js's intro input capture: the event list, the registration block and
 *  stopIntroInputCapture, verbatim. `onIntroInput` is STUBBED — this row is
 *  about the attach/detach pair's identity and option shapes, not about what
 *  the handler decides, and the suite says so rather than pretending. */
function compileIntroCapture(eventsText, registerText, stopText, dom) {
  const body = `'use strict';
${eventsText}
let introCaptureLive = false;
const seen = [];
const onIntroInput = (e) => { seen.push(e && e.type); };
${registerText}
${stopText}
return { stop: stopIntroInputCapture, seen, types: INTRO_INPUT_EVENTS };`;
  return new Function('addEventListener', 'removeEventListener', body)(dom.add, dom.remove);
}

/** main.js's serif keydown, verbatim. */
function compileSerif(text, dom) {
  return new Function('addEventListener', 'document', `'use strict';\n${text}`)(dom.add, dom.document);
}

/** journey/transport.js's onWheel, verbatim. `WHEEL_LINE_PX` is the shipped
 *  16 (journey/constants/scroll.js) and `window` is a two-field stand-in for
 *  the one field the body reads. */
function compileWheel(text) {
  const body = `'use strict';\n${text}\nreturn onWheel;`;
  return new Function('host', 'window', 'WHEEL_LINE_PX', body);
}

/** THE CHILD ORACLE. `import()` is asynchronous and this registry's readers
 *  are synchronous by contract — `pin()` hands `reader(input)` straight to
 *  the ledger, so an async reader would deliver a Promise and `canon()`
 *  would flatten it to `{}`, passing gate 1 against every expectation on
 *  earth. So the module-evaluation rows run in a CHILD PROCESS, driven with
 *  execFileSync, and the child's source is the reader's INPUT — which keeps
 *  the D88 shape intact: a mutant perturbs text, and the reader executes it.
 *
 *  A non-zero exit, or stdout that does not parse, is a HARNESS FAULT and
 *  never a comparison. */
function runChild(source, tag) {
  const file = join(scratch, `child-${tag}.mjs`);
  writeFileSync(file, source);
  let out;
  try {
    out = execFileSync(process.execPath, [file, REPO], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
    });
  } catch (e) {
    fault(`child oracle (${tag}) exited non-zero: ${String(e.stderr || e.message).slice(0, 300)}`);
  }
  const line = out.trim().split('\n').filter(Boolean).pop();
  try { return JSON.parse(line); } catch {
    return fault(`child oracle (${tag}) printed no parsable result: ${String(line).slice(0, 300)}`);
  }
}

/* ------------------------------------------------------------------ *
 * S — the slices themselves.                                           *
 * ------------------------------------------------------------------ */
console.log('\nS — the eight slices are whole statement runs, not fragments');

pin('S1', 'every slice this suite compiles is BALANCED and closes on its own statement — the check that a drifting end anchor actually needs, since a tail like `];` or `\\n  }` can never be unique in a file this size',
  (i) => Object.fromEntries(Object.entries(i.slice).map(([k, v]) => [k, shape(v)])),
  { slice: SLICE },
  {
    migrate: 'balanced:;',
    events: 'balanced:;',
    stop: 'balanced:}',
    register: 'balanced:}',
    serif: 'balanced:;',
    wheel: 'balanced:}',
  },
  'J04c\'s D1 is the same row for the same reason: an anchor pair that refuses on a miss still cannot tell you it took HALF a statement');

/* ------------------------------------------------------------------ *
 * A — flags.js's migration IIFE.                                       *
 * ------------------------------------------------------------------ */
console.log('\nA — flags.js: the import-time migration, classified and executed');

const STORAGE_RE = /\blocalStorage\b/;

pin('A1', 'D102 — every localStorage touch in flags.js, split by whether it is inside the migration IIFE: five inside, two in the exported accessors, and BOTH halves non-empty so a blind scanner cannot report a clean zero',
  (i) => {
    /* Runs of whitespace collapse: `stripComments` blanks a comment IN PLACE
       rather than deleting it, so `catch { /* … *\/ }` comes back as a catch
       with forty spaces in it and the key would encode a comment's LENGTH. */
    const lines = (src) => code(src).split('\n')
      .map((l) => l.trim().replace(/\s+/g, ' ')).filter((l) => STORAGE_RE.test(l));
    const inside = new Set(lines(i.slice));
    return {
      inside: [...inside].sort(),
      outside: lines(i.flags).filter((l) => !inside.has(l)).sort(),
    };
  },
  { flags: SRC.flags, slice: SLICE.migrate },
  {
    inside: [
      'if (localStorage.getItem(TRANSFORM_KEY) === null) {',
      'if (localStorage.getItem(TRANSFORM_KEY_OLD) !== null) {',
      'if (old !== null) localStorage.setItem(TRANSFORM_KEY, old);',
      'localStorage.removeItem(TRANSFORM_KEY_OLD);',
      'const old = localStorage.getItem(TRANSFORM_KEY_OLD);',
    ].sort(),
    outside: [
      'try { return localStorage.getItem(TRANSFORM_KEY); } catch { return null; }',
      'try { localStorage.setItem(TRANSFORM_KEY, String(v)); } catch { }',
    ].sort(),
  },
  'the classification in flags.js says the IIFE is the module\'s only import-time storage touch; this is that sentence as a set, and the two accessors are the control that proves the scanner ran');

const MIGRATE_ROWS = Object.freeze([
  { what: 'old set, new absent', seed: { 'journey-v6.transform': '0.7' } },
  { what: 'both set', seed: { 'journey-v6.transform': '0.7', 'journey.transform': '0.2' } },
  { what: 'neither set', seed: {} },
  { what: 'old absent, new set', seed: { 'journey.transform': '0.2' } },
]);

pin('A2', 'the migration truth table, EXECUTED from the shipped text: what it reads, what it writes, and what the store holds afterwards',
  (i) => MIGRATE_ROWS.map((row) => {
    const store = makeStore(row.seed);
    runMigrate(i.slice, store);
    return `${row.what} | ${store.ops.join(' ')} | ${JSON.stringify(store.snapshot())}`;
  }),
  { slice: SLICE.migrate },
  ['old set, new absent | get:journey.transform get:journey-v6.transform set:journey.transform=0.7 get:journey-v6.transform remove:journey-v6.transform | {"journey.transform":"0.7"}',
    'both set | get:journey.transform get:journey-v6.transform remove:journey-v6.transform | {"journey.transform":"0.2"}',
    'neither set | get:journey.transform get:journey-v6.transform get:journey-v6.transform | {}',
    'old absent, new set | get:journey.transform get:journey-v6.transform | {"journey.transform":"0.2"}'],
  'row 2 is the one that carries the decision: an ALREADY-MIGRATED page still removes the stale old key, which is what makes a second evaluation a no-op');

pin('A3', 'IDEMPOTENT — a second evaluation performs ZERO writes, which is why "page-lifetime singleton" is a classification here and not a requirement the code depends on',
  (i) => {
    const store = makeStore({ 'journey-v6.transform': '0.7' });
    runMigrate(i.slice, store);
    const mark = store.ops.length;
    runMigrate(i.slice, store);
    const second = store.ops.slice(mark);
    return { second, writes: second.filter((o) => o.startsWith('set:') || o.startsWith('remove:')), store: store.snapshot() };
  },
  { slice: SLICE.migrate },
  { second: ['get:journey.transform', 'get:journey-v6.transform'], writes: [], store: { 'journey.transform': '0.7' } });

pin('A4', 'PRIVACY MODE — a storage whose every method throws is a silent no-op: the IIFE does not throw and nothing escapes the catch',
  (i) => {
    const store = makeStore({}, { throwing: true });
    let threw = false;
    try { runMigrate(i.slice, store); } catch { threw = true; }
    return { threw, ops: store.ops, store: store.snapshot() };
  },
  { slice: SLICE.migrate },
  { threw: false, ops: ['get:journey.transform -> THREW'], store: {} });

/* THE SINGLETON PROPERTY, ON THE REAL MODULE, WITH THE STORE AS THE
   EVALUATION COUNTER. flags.js has no counter to read and none can be added
   to it, so the fake store's op log IS the count: one evaluation writes the
   five-op migration sequence exactly once. Three imports on one specifier
   must therefore record five ops in total; a fourth under a DIFFERENT
   specifier is a second module and records the idempotent two-op no-op —
   which is A3's property, arriving here on the real module rather than on a
   compiled slice. */
const A5_CHILD = `import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const REPO = process.argv[2];
const ops = [];
const data = { 'journey-v6.transform': '0.55' };
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(k) { ops.push('get:' + k); return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
  setItem(k, v) { ops.push('set:' + k + '=' + v); data[k] = String(v); },
  removeItem(k) { ops.push('remove:' + k); delete data[k]; },
} });
const url = pathToFileURL(join(REPO, 'flags.js')).href;
const a = await import(url);
const b = await import(url);
const c = await import(url);
const oneSpecifier = ops.slice();
const d = await import(url + '?j05second=1');
const secondSpecifier = ops.slice(oneSpecifier.length);
console.log(JSON.stringify({
  oneSpecifier, secondSpecifier,
  sameModule: a === b && b === c,
  secondIsAnother: d !== a,
  migrated: a.getTransformStorage(),
  store: data,
}));
`;

pin('A5', 'ONE INSTALL PER PAGE MODULE, on the REAL flags.js: three imports under one specifier record the five-op migration exactly ONCE, and a fourth under a query-busted specifier is a second module whose evaluation is the harmless two-op no-op A3 predicts',
  (i) => runChild(i.child, 'a5'),
  { child: A5_CHILD },
  {
    oneSpecifier: ['get:journey.transform', 'get:journey-v6.transform',
      'set:journey.transform=0.55', 'get:journey-v6.transform', 'remove:journey-v6.transform'],
    secondSpecifier: ['get:journey.transform', 'get:journey-v6.transform'],
    sameModule: true,
    secondIsAnother: true,
    migrated: '0.55',
    store: { 'journey.transform': '0.55' },
  },
  'the query-busted twin is deliberately manufactured here: D1 proves the shipped graph has no such twin, while this row proves a second specifier would create another module instance.');

/* ------------------------------------------------------------------ *
 * B — main.js's register, statically.                                  *
 * ------------------------------------------------------------------ */
console.log('\nB — the register: the fourteen sites, the one removal, and the ungated QA key');

const ADD_RE = /\baddEventListener\s*\(/;
const ANY_LISTENER_RE = /\b(?:add|remove)EventListener\s*\(/;

pin('B1', 'the page register\'s listener SITES, keyed by file and trimmed code text — FOURTEEN, thirteen of them page wiring in main.js and the one BOUNDED capture beside its own remover in journey/boot/handoff.js — and the same scanner returns journey/backdrop.js\'s eight in the same call (D102)',
  (i) => ({
    register: registerSites(i, ADD_RE),
    control: foreignSiteSet('journey/backdrop.js', i.backdrop, ANY_LISTENER_RE, { blankStrings: false })
      .map((r) => r.replace(/ :: \d+ :: /, ' :: ')).sort(),
  }),
  { main: SRC.main, handoff: SRC.handoff, backdrop: SRC.backdrop },
  {
    /* RE-KEYED from a bare main.js text list to `file :: text` by order B01,
       2026-08-23. THE TEXTS WERE UNCHANGED by that move, character for
       character; what each gained is the file it lives in, and that is the
       half of this pin that got STRONGER. The old form could not have told a
       site that moved from main.js to another file from a site that vanished;
       this one names both halves of such a move.

       SIXTEEN -> FOURTEEN, 2026-08-30, and the two that left are the whole
       of the Equip promotion's cost to this register:

         el.querySelector('.tag').addEventListener('click', (e) => e.preventDefault());
         tag.addEventListener('click', (e) => {

       The first was the EQUIP tag's refusal to navigate; the second the
       hoverless-device toggle that lit the stem and revealed "coming soon"
       instead. Both existed only because Equip was deferred, and both are
       deleted now that it is a chapter — the EQUIP tag takes the same
       `el.querySelector('.tag')` click site the other two callouts already
       shared, which is why that entry does NOT gain a duplicate. Note the
       shape this pin's key gives the change: a REMOVED pair with no
       corresponding ADDED pair, which is what a deletion looks like here and
       is exactly what a site quietly relocating would NOT look like. */
    register: [
      "main.js :: addEventListener('error', (e) => {",
      "main.js :: addEventListener('keydown', (e) => {",
      "main.js :: addEventListener('load', () => {",
      "main.js :: addEventListener('resize', () => {",
      "main.js :: addEventListener('unhandledrejection', (e) => {",
      'journey/boot/handoff.js :: addEventListener(type, onIntroInput, { capture: true, passive });',
      "main.js :: canvas.addEventListener('webglcontextlost', (e) => {",
      "main.js :: canvas.addEventListener('webglcontextrestored', () => {",
      "main.js :: el.addEventListener('mouseenter', () => sceneApi.setHighlight(region, true));",
      "main.js :: el.addEventListener('mouseleave', () => sceneApi.setHighlight(region, false));",
      "main.js :: el.querySelector('.tag').addEventListener('click', (e) => {",
      "main.js :: exploreCta.addEventListener('click', (e) => {",
      "main.js :: logoLink.addEventListener('click', (e) => {",
      "main.js :: skipLink.addEventListener('click', (e) => {",
    ].sort(),
    control: [
      "journey/backdrop.js :: backdrop.addEventListener('lostpointercapture', clear);",
      "journey/backdrop.js :: backdrop.addEventListener('pointercancel', clear);",
      "journey/backdrop.js :: backdrop.addEventListener('pointerdown', onPointerDown);",
      "journey/backdrop.js :: backdrop.addEventListener('pointerup', onPointerUp);",
      "journey/backdrop.js :: backdrop.removeEventListener('lostpointercapture', clear);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointercancel', clear);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointerdown', onPointerDown);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointerup', onPointerUp);",
    ].sort(),
  },
  'three of the fourteen sit inside a loop over three callouts, so the LIVE registration count on a real page is larger than fourteen. That count is not asserted anywhere in this suite and the header says why');

pin('B2', 'the page register has exactly ONE removal site across BOTH its files, and it is the intro capture\'s loop, in the module that owns the capture — the register\'s single BOUNDED registration, everything else being page-lifetime by design',
  (i) => registerSites(i, /\bremoveEventListener\s*\(/),
  { main: SRC.main, handoff: SRC.handoff },
  ['journey/boot/handoff.js :: for (const type of INTRO_INPUT_EVENTS) removeEventListener(type, onIntroInput, true);'],
  'RE-KEYED by B01, 2026-08-23. The site text is unchanged; it is now read out of journey/boot/handoff.js and named with its file. main.js STAYS in this reader\'s inputs on purpose — the claim is about the register, not about one file, so a removal appearing in the page wiring must red here too.');

pin('B3', 'THE FINDING, PINNED SO IT CANNOT DRIFT SILENTLY: the serif A/B keydown is registered UNCONDITIONALLY — `if (BODY_SERIF)` guards only the class add on the line after it, and the registration that follows is a top-level statement',
  (i) => uniqueSlice(code(i.main), 'serif-gate', 'if (BODY_SERIF)', C_SERIF_HEAD).trim().split('\n').map((l) => l.trim()),
  { main: SRC.main },
  ['if (BODY_SERIF)',
    "document.body.classList.add('body-serif');",
    "addEventListener('keydown', (e) => {",
    "if (e.key !== 'b' && e.key !== 'B') return;"],
  'journey/dial.js was moved the other way by J04c — gated at REGISTRATION so a plain load registers nothing (J-H19). The two are the same kind of QA affordance and are now inconsistent. Wave 3 records it; moving a registration is a behaviour change.');

/* ------------------------------------------------------------------ *
 * C — the three executable regions.                                    *
 * ------------------------------------------------------------------ */
console.log('\nC — executed: the one bounded pair, the ungated key, and the wheel guard');

pin('C1', 'the intro input capture attaches six capture-phase listeners and takes all six back off — wheel, touchmove and keydown are non-passive so blocked navigation attempts can be cancelled, while the removal\'s BARE `true` still matches capture identity',
  (i) => {
    const dom = makeDom();
    const h = compileIntroCapture(i.events, i.register, i.stop, dom);
    const afterRegister = { ops: [...dom.ops], live: dom.live() };
    dom.ops.length = 0;
    h.stop();
    const afterStop = { ops: [...dom.ops], live: dom.live() };
    dom.ops.length = 0;
    h.stop();
    return { afterRegister, afterStop, secondStop: [...dom.ops], types: h.types };
  },
  { events: SLICE.events, register: SLICE.register, stop: SLICE.stop },
  {
    afterRegister: {
      ops: ['+window:wheel:cap:{"capture":true,"passive":false}',
        '+window:touchstart:cap:{"capture":true,"passive":true}',
        '+window:touchmove:cap:{"capture":true,"passive":false}',
        '+window:touchend:cap:{"capture":true,"passive":true}',
        '+window:touchcancel:cap:{"capture":true,"passive":true}',
        '+window:keydown:cap:{"capture":true,"passive":false}'],
      live: ['window|keydown|cap', 'window|touchcancel|cap', 'window|touchend|cap',
        'window|touchmove|cap', 'window|touchstart|cap', 'window|wheel|cap'],
    },
    afterStop: {
      ops: ['-window:wheel:cap:sameFn', '-window:touchstart:cap:sameFn',
        '-window:touchmove:cap:sameFn', '-window:touchend:cap:sameFn',
        '-window:touchcancel:cap:sameFn', '-window:keydown:cap:sameFn'],
      live: [],
    },
    secondStop: [],
    types: ['wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'keydown'],
  });

const SERIF_ROWS = Object.freeze([
  { what: 'b', ev: { key: 'b' } },
  { what: 'B', ev: { key: 'B' } },
  { what: 'another key', ev: { key: 'x' } },
  { what: 'meta chord', ev: { key: 'b', metaKey: true } },
  { what: 'ctrl chord', ev: { key: 'b', ctrlKey: true } },
  { what: 'alt chord', ev: { key: 'b', altKey: true } },
  { what: 'composing', ev: { key: 'b', isComposing: true } },
  { what: 'into an input', ev: { key: 'b', target: { tagName: 'INPUT' } } },
  { what: 'into a textarea', ev: { key: 'b', target: { tagName: 'TEXTAREA' } } },
  { what: 'into contenteditable', ev: { key: 'b', target: { isContentEditable: true } } },
]);

pin('C2', 'the serif key installs for EVERY visitor and then decides at dispatch: ten rows, two toggles, and the eight refusals are the guard doing the work the registration declines to do',
  (i) => {
    const dom = makeDom();
    compileSerif(i.serif, dom);
    const installed = dom.ops.filter((o) => o.startsWith('+window:'));
    const rows = SERIF_ROWS.map((row) => {
      const before = dom.body.classList.contains('body-serif');
      const verdict = dom.fire('keydown', { target: null, ...row.ev }, false);
      return `${row.what}: ${verdict} ${before} -> ${dom.body.classList.contains('body-serif')}`;
    });
    return { installed, rows };
  },
  { serif: SLICE.serif },
  {
    installed: ['+window:keydown:bub:null'],
    rows: [
      'b: dispatched false -> true',
      'B: dispatched true -> false',
      'another key: dispatched false -> false',
      'meta chord: dispatched false -> false',
      'ctrl chord: dispatched false -> false',
      'alt chord: dispatched false -> false',
      'composing: dispatched false -> false',
      'into an input: dispatched false -> false',
      'into a textarea: dispatched false -> false',
      'into contenteditable: dispatched false -> false',
    ],
  });

const WHEEL_ROWS = Object.freeze([
  { what: 'DISABLED — what dispose() leaves behind', enabled: false, owned: false, ev: { deltaY: 100, deltaMode: 0, cancelable: true } },
  { what: 'enabled, an owner covers the target', enabled: true, owned: true, ev: { deltaY: 100, deltaMode: 0, cancelable: true } },
  { what: 'enabled, unowned, deltaMode 0', enabled: true, owned: false, ev: { deltaY: 100, deltaMode: 0, cancelable: true } },
  { what: 'deltaMode 1 (lines)', enabled: true, owned: false, ev: { deltaY: 100, deltaMode: 1, cancelable: true } },
  { what: 'deltaMode 2 (pages)', enabled: true, owned: false, ev: { deltaY: 100, deltaMode: 2, cancelable: true } },
  { what: 'not cancelable', enabled: true, owned: false, ev: { deltaY: 100, deltaMode: 0, cancelable: false } },
]);

pin('C3', 'journey/transport.js onWheel — the DISABLED row is the whole of what journey.js\'s dispose() relies on: the enabled guard sits ABOVE preventDefault, so a disposed journey stops cancelling wheel events and the page scrolls natively again',
  (i) => {
    const make = compileWheel(i.wheel);
    return WHEEL_ROWS.map((row) => {
      const pushes = [];
      let prevented = false;
      const onWheel = make({
        enabled: () => row.enabled,
        ownerOf: () => (row.owned ? { id: 'sheet' } : null),
        push: (d, kind) => pushes.push(`${d}:${kind}`),
      }, { innerHeight: 800 }, 16);
      onWheel({ ...row.ev, target: {}, preventDefault() { prevented = true; } });
      return `${row.what}: prevented=${prevented} push=${pushes.join(',') || 'none'}`;
    });
  },
  { wheel: SLICE.wheel },
  ['DISABLED — what dispose() leaves behind: prevented=false push=none',
    'enabled, an owner covers the target: prevented=false push=none',
    'enabled, unowned, deltaMode 0: prevented=true push=100:wheel',
    'deltaMode 1 (lines): prevented=true push=1600:wheel',
    'deltaMode 2 (pages): prevented=true push=80000:wheel',
    'not cancelable: prevented=false push=100:wheel'],
  'journey/transport.js is READ here and never written. J04a moved these five registrations out of scroll.js and converted none of them, so they are still unowned when Wave 3 closes; this row proves the NEUTRALISATION, not a detachment.');

/* ------------------------------------------------------------------ *
 * D — one install per page module.                                     *
 * ------------------------------------------------------------------ */
console.log('\nD — one install per page module: the specifier census');

/** Every production .js the page graph can reach, off the disk (D94), so a
 *  file that lands tomorrow is scanned tomorrow. */
function pageSources() {
  const out = [];
  const skip = new Set(['node_modules', 'vendor', 'archive', 'docs', 'static', 'deploy',
    '.git', 'journey-v6', 'journey-v6-plan', 'tools', 'content', 'ownership']);
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      if (skip.has(e)) continue;
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e.endsWith('.js') && !e.includes('.fixture.') && !e.includes('.test.')) out.push(p);
    }
  };
  walk(join(REPO, 'journey'));
  walk(join(REPO, 'organism'));
  for (const e of ['main.js', 'flags.js', 'inspire-exits.js']) out.push(join(REPO, e));
  return out.sort();
}

const SPECIFIER_RE = /(?:from|import)\s*\(?\s*'(\.[^']+)'/g;

pin('D1', 'THE ANTECEDENT: every module in the shipped graph has one bare specifier form, so ESM\'s per-specifier cache really does mean one evaluation per page',
  (i) => {
    const groups = new Map();
    for (const [rel, src] of i.files) {
      for (const m of src.matchAll(SPECIFIER_RE)) {
        const spec = m[1];
        const key = relative(REPO, resolve(dirname(join(REPO, rel)), spec.split('?')[0])).split(sep).join('/');
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key).add(spec.includes('?') ? `query:${spec.split('?')[1]}` : 'bare');
      }
    }
    const fmt = ([k, v]) => `${k} :: ${[...v].sort().join('|')}`;
    return {
      referenced: groups.size,
      multiForm: [...groups].filter(([, v]) => v.size > 1).map(fmt).sort(),
      cacheBusted: [...groups].filter(([, v]) => [...v].some((x) => x !== 'bare')).map(fmt).sort(),
      scanned: i.files.length,
    };
  },
  { files: pageSources().map((f) => [relative(REPO, f).split(sep).join('/'), readFileSync(f, 'utf8')]) },
  {
    /* RE-BASELINED referenced 114 -> 115, scanned 113 -> 114 by order U01b,
       2026-08-22, on the protocol tools/test-frame-publication.mjs's C5
       documents for its own disk-derived cardinality. WAS (pre-U01b):
       referenced 114, scanned 113.

       U01b added journey/cards/registry.js and pointed
       journey/cards/index.js at it. `scanned` is the page source count, so it
       gains the file itself (+1); `referenced` is the count of distinct
       resolved specifier targets, so it gains exactly one new group key,
       `journey/cards/registry.js` (+1) — registry.js's own six builder
       specifiers and its ./runtime.js specifier all resolve to keys
       journey/cards/index.js already referenced before the move.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty and
       `cacheBusted` still names organism/organism.js alone. Those two are
       what this pin exists to hold; the two cardinalities are pinned beside
       them so a scan that read nothing reports 0/0 (D102), and they move by
       construction whenever a page module is added.

       NOTE FOR THE COORDINATOR: this file is not on U01b's allowlist. Same
       call, and same reversibility, as the C5 note in
       tools/test-frame-publication.mjs.

       RE-BASELINED referenced 115 -> 116, scanned 114 -> 115 by order U01c,
       2026-08-22, on the same protocol. WAS (pre-U01c): referenced 115,
       scanned 114.

       U01c added journey/cards/icons.js and pointed journey/cards/index.js at
       it. `scanned` is the page source count, so it gains the file itself
       (+1); `referenced` is the count of distinct resolved specifier targets,
       so it gains exactly one new group key, `journey/cards/icons.js` (+1) —
       icons.js has NO imports of its own, so it contributes no other
       specifier, which is the arithmetic reason both numbers move by exactly
       one and not by more.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty and
       `cacheBusted` still names organism/organism.js alone. Those two are what
       this pin exists to hold; the two cardinalities are pinned beside them so
       a scan that read nothing reports 0/0 (D102).

       This file IS on U01c's allowlist — D124 was recorded between the two
       orders and the allowlist anticipated all three pins this time.

       RE-BASELINED referenced 116 -> 117, scanned 115 -> 116 by order U02,
       2026-08-22, on the same protocol and for the same reason. WAS (pre-U02):
       referenced 116, scanned 115. U02 added journey/ui/hot-state.js — the
       hotspot/hover-zone registry and hot-state owner, lifted out of
       journey/ui.js, which imports it under exactly one specifier. `scanned`
       is the page source count, so it gains the file itself; `referenced`
       gains its single specifier, which is the arithmetic reason both numbers
       move by exactly one and not by more.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty and
       `cacheBusted` still names organism/organism.js alone — the suite's own
       failure output printed both cells byte-identical and only the two
       cardinalities moved. This file is on U02's allowlist.

       RE-BASELINED referenced 117 -> 121, scanned 116 -> 119 by order U03,
       2026-08-22, and THIS ONE DOES NOT DECOMPOSE CLEANLY — read the split
       before believing the number.

         scanned  116 -> 119   +3, all U03's: journey/ui/{popover-tier,
                               card-tier,selection}.js, the two disclosure
                               vessels and the owner of the selected light,
                               the committed disclosure and the focus return.
         referenced 117 -> 121 +4. THREE are U03's — journey/ui.js imports
                               each new module under exactly one specifier.
                               THE FOURTH IS NOT U03'S.

       THE FOURTH, NAMED (D62's whole point: an entry no order claims is the
       finding). `content/connect-nodes.js`, referenced from exactly one place,
       `journey/chapters/connect/tendrils.js:87`. That import does not exist at
       426dd44 and is not U03's: tendrils.js is outside U03's allowlist and
       untouched by it. It arrived with a concurrent, uncommitted Connect
       change. MEASURED, not inferred — with U03's three modules moved aside
       and journey/ui.js restored to its pre-U03 bytes, this pin still reports
       `referenced: 118` against the recorded 117, with `scanned: 116` matching
       exactly. So the pin was ALREADY one over on the tree U03 received, and
       folding that silently into U03's re-baseline would have charged this
       order for someone else's row. It is folded LOUDLY instead.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty and
       `cacheBusted` still names organism/organism.js alone.

       NOTE FOR THE COORDINATOR: this file is NOT on U03's allowlist. It is
       taken on D124's disclosed-excursion precedent (U01b). One token;
       reversible in one token. The concurrent Connect row above should be
       re-attributed to its own lane at the next wave seam.

       RE-BASELINED 121/119 -> 122/120 by order U04, 2026-08-22, on the same
       protocol and for the same reason. WAS (pre-U04): referenced 121,
       scanned 119. U04 added journey/ui/copy-arrival.js — the copy
       choreography and the arrival envelope, lifted out of journey/ui.js.
       BOTH HALVES MOVED BY EXACTLY ONE, which is the signature of a single new
       module that is imported under a single specifier: `scanned` +1 because
       the file exists, `referenced` +1 because journey/ui.js imports it, and
       the delta between them is unchanged at 2.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty — the new
       module is named under ONE specifier form, `./ui/copy-arrival.js`, from
       its one importer — and `cacheBusted` still names organism/organism.js
       alone. Those two are the claim; the counts beside them are the D102
       not-vacuous guard, and only the guard moved.

       U03's note above records a row that was already one over on the tree it
       received. That row is still folded in here and is still not U04's: this
       re-baseline adds exactly one to each half and claims nothing about the
       inherited offset. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/u04/d1-scanned-delta.txt

       NOTE FOR THE COORDINATOR: this file is NOT on U04's allowlist either,
       and is taken on the same D124 precedent.

       RE-BASELINED 122/120 -> 124/122 by order U05, 2026-08-22, on the same
       protocol and for the same reason. WAS (pre-U05): referenced 122, scanned
       120. U05 added journey/layout/rail-geometry.js — the rail's one
       measurement owner — and journey/ui/card-layout.js. BOTH HALVES MOVED BY
       EXACTLY TWO and the delta between them is unchanged at 2.

       THE INVARIANT HALVES ARE UNCHANGED, and for this order that is the half
       worth reading rather than a formality. `rail-geometry.js` has TWO
       importers under two different relative spellings — `./layout/
       rail-geometry.js` from journey/rail.js and `../../layout/
       rail-geometry.js` from journey/chapters/connect/index.js — which is
       precisely the shape this pin exists to catch. `multiForm` is still empty
       because the census resolves specifiers to paths before comparing them,
       so the two spellings are one module with one evaluation and one
       published snapshot. A module with page-scoped state read from two
       directories is exactly the thing that must not be loaded twice, and this
       pin is the standing proof that it is not. `cacheBusted` still names
       organism/organism.js alone.

       U03's inherited offset above is still folded in and is still not this
       order's. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/u05/d1-scanned-delta.txt

       RE-BASELINED 124 -> 129 referenced and 122 -> 127 scanned by order U06,
       2026-08-23, on the same protocol. Both halves move by EXACTLY FIVE, and
       the five are named: journey/ui/hotspot-frame.js, hover-zone.js,
       rail-mask.js, frame-projection.js and label-policies.js — the owners
       `createUI`'s 480-line `update()` and its eighteen mutable bindings left
       for. Every one is imported by `journey/ui.js` under exactly one
       specifier, which is why the two numbers move together and by the same
       amount: a module referenced but not scanned, or scanned but not
       referenced, would move them apart and is the shape worth noticing here.

       THE INVARIANT HALVES ARE AGAIN UNCHANGED, and that is what this pin is
       for. `multiForm` is still empty and `cacheBusted` still names
       organism/organism.js alone. U06 published a per-frame snapshot from
       `journey/ui/frame-projection.js` and a mask from `rail-mask.js`, both of
       which hold page-scoped state across a frame — precisely the class of
       module that must be evaluated once per page. The empty `multiForm` is
       the standing proof that each is.

       U03's and U05's inherited offsets above are still folded in and are
       still not this order's. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/u06/d1-scanned-delta.txt

       NOTE FOR THE COORDINATOR: this file IS on U06's allowlist — D124 names
       X3, C5 and D1 as the three pins a new module under journey/ moves by
       construction, and this is D1. One token per half; reversible in two.

       RE-BASELINED referenced 129 -> 133, scanned 127 -> 131 by order B01,
       2026-08-23, on the same protocol. WAS (pre-B01): referenced 129,
       scanned 127.

       B01 added FOUR modules under journey/boot/ — scene-note.js,
       hero-mode.js, entry-queue.js and handoff.js — and pointed main.js at
       all four. `scanned` gains the four files themselves (+4). `referenced`
       gains exactly four new group keys, one per new module (+4): the only
       other specifiers the four contribute are handoff.js -> ./scene-note.js
       and two -> ../../flags.js, and BOTH resolve to keys main.js already
       referenced. The added-key set was computed rather than inferred and is
       exactly those four, with nothing removed.

       AND THIS PIN CAUGHT SOMETHING, which is the reason to read the
       arithmetic instead of nodding at it. The first measurement came back
       +5, not +4, with a fifth key `journey/boot/journey/journey.js` — a path
       that does not exist. SPECIFIER_RE scans RAW TEXT with no comment
       filter, and a line of B01's own prose in handoff.js quoted a relative
       specifier, minting a module out of a sentence. It is the first phantom
       in this tree (checked: every other resolved key is on disk) and the
       comment was reworded rather than the number re-baselined. A commented
       specifier is not an import, and this reader cannot tell — recorded so
       the next order that writes one knows why its arithmetic looks wrong.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` is still empty and
       `cacheBusted` still names organism/organism.js alone. Evidence:
       docs/code-health/evidence/2026-08-21-elegance-run-01/b01/d1-scanned-delta.txt */
    /* hero-ground-dim.js is one new real graph member and one new resolved key.

       RE-BASELINED referenced 135 -> 137 and scanned 133 -> 135 at the
       2026-08-28 release wave, on the same protocol. The exact two accepted
       graph members are journey/layout/final-composition.js and
       journey/navigation-timing.js. The former is shared by portrait,
       rail-geometry and Final's Purpose-pocket owners but resolves to one
       target key; the latter is imported once by journey.js at the existing
       route-duration seam. Each therefore contributes one scanned file and
       one distinct resolved target, so both cardinalities move together by
       exactly two.

       The root-level Inspire exit contract adds one scanned file; its direct
       imports replace the old chapter-local wrapper, so referenced stays 137
       while scanned moves 135 -> 136.

       THE INVARIANT HALVES ARE UNCHANGED: `multiForm` remains empty. The old
       fixed query suffix on organism/organism.js is gone too, so `cacheBusted`
       is now empty rather than preserving a permanently stale pseudo-version.

       The intro-local clock extraction adds organism/intro-clock.js as one
       real runtime graph member and one newly resolved target key. No existing
       specifier changes form, so both discovered cardinalities rise by exactly
       one while the two invariant sets remain empty.

       RE-BASELINED referenced 138 -> 139 and scanned 137 -> 138 by Lane B
       (2B), on the same protocol. The one accepted graph member is
       organism/hero-spores.js — the text-side descending spore band, a
       dependency-free WebGL layer plus the same field rebuilt inside the
       scene. It contributes one scanned file and one distinct resolved
       target key, so both cardinalities move together by exactly one.

       AND IT IS NAMED FROM TWO PLACES, which is the case this area exists to
       police, so it is stated: index.html carries `<script type="module"
       src="./organism/hero-spores.js">` and organism/organism.js imports the
       same path. Both resolve to ONE URL, so ESM's cache evaluates it once
       and the module's singleton is genuinely single. index.html is not in
       pageSources() and contributes nothing to either count; `multiForm`
       stays empty because the two names are the same specifier form, which
       is precisely what it is asserting.

       RE-BASELINED again 139 -> 141 and 138 -> 140 at the 2026-08-30 Equip
       wave, on the same protocol (the two campaigns integrated on one
       branch, so both accountings above sum). The two new modules are
       journey/chapters/equip/index.js and journey/chapters/equip/camera.js,
       each referenced under exactly one bare specifier form — which is the
       property this row asserts, and both zeros beside it are unchanged. */
    referenced: 141,
    multiForm: [],
    cacheBusted: [],
    scanned: 140,
  },
  'the empty multiForm set is a zero over a DISCOVERED world, not over a string: `referenced` and `scanned` are pinned beside it so a scan that read nothing reports 0/0 rather than a clean empty set (D102)');

/* ------------------------------------------------------------------ *
 * E — RETIRED BY THE DISPOSAL REMOVAL, 2026-08-25.
 * ------------------------------------------------------------------ *
 * E1/E2/E3 were "no journey accumulation": three boot/dispose cycles run
 * against journey/journey.js's two owner registrations — the page-built
 * rail's `navigate` restore and the cascade into `ui.destroy()` — compiled
 * from production text and executed under the real createOwner.
 *
 * BOTH REGISTRATIONS ARE GONE, and so is the disposal that drained them.
 * There is no cycle to run: this page boots one journey and keeps it until
 * the tab closes, which is the answer to the question E was asking.
 *
 * The half of the runbook's J05 row that survives is the one that was never
 * about recreation — "one install per page module", which is area D's
 * specifier census, and the page-lifetime register itself, which is area B.
 * Neither needed a disposal and neither moved.
 *
 * docs/code-health/DISPOSAL-REMOVED.md.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * F — this suite's controls over itself.                               *
 * ------------------------------------------------------------------ */
console.log('\nF — self-controls');

const PIN_TOKEN = maskedToken('pin');
const LIT_RE = literalPredicateRe(['L.same', 'pin'], 2);
const LIT = literalPredicateHits(SRC_SELF, LIT_RE);

L.same('F1', 'D44 — no assertion in this file has a bare literal where its actual should be',
  LIT.hits, []);
L.same('F2', 'D46 — the three controls on that scan: a bare literal IS a hit, a real comparison is NOT, and a commented-out one is NOT',
  [literalPredicateProbe(LIT_RE, "pin('X', 'what', true, true);"),
    literalPredicateProbe(LIT_RE, "pin('X', 'what', read(F), 3);"),
    literalPredicateProbe(LIT_RE, "// pin('X', 'what', true, true);")],
  [true, false, false]);

const TAUT = scanTautologyAst(SRC_SELF, new Map([['L.same', 2], ['pin', PIN_RECEIVER]]));
L.same('F3', 'D86 — the AST pass found no tautology, and it REACHED this file\'s call sites (a zero over zero sites is the zero of not looking)',
  [TAUT.hits, TAUT.sites > 0], [[], true]);
L.same('F4', 'D86 — control: the pass DOES fire on the shape a text scan cannot see',
  scanTautologyAst("L.same('X', 'what', 8, 8);", new Map([['L.same', 2]])).hits.length, 1);
L.same('F5', 'D76 — pin() call sites counted in this file equal the registry size',
  selfSiteSet('tools/test-page-lifetime.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);
L.same('F6', 'D84 — THIS PROCESS\'S GLOBAL IS UNTOUCHED, descriptor for descriptor. The one row that needs a store on the global runs it in a CHILD, so the trap this order was warned about — a world installed on the real global and never taken away, which turns every later reader into a measurement of the harness — is closed by construction rather than by a finally nobody checks',
  GLOBAL_AT_START.map(([k, v]) => `${k}:${slotOf(k) === v ? 'same' : 'MOVED'}`),
  ['localStorage:same', 'addEventListener:same', 'removeEventListener:same', 'document:same'],
  'descriptor IDENTITY, not presence: node 26 ships localStorage as a built-in, so "absent" would have been an absence asserted over a world nobody looked at');

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a real pin
     (B2) and perturbs a part of that reader's input the reader does not
     read: B2 scans the register — main.js AND journey/boot/handoff.js — for
     removal sites, and journey/backdrop.js is not among its inputs at all,
     so adding a whole removal site to a THIRD file's text moves nothing B2
     reports. Registry must score CANNOT FAIL. (B01 widened B2's inputs from
     one file to two; backdrop.js is still neither of them, which is why this
     control survived the widening unchanged.) */
  const CTL = sweep([
    M('B2', 'D88 NULL CONTROL — a removal site is added to a file B2\'s reader does not scan', null,
      (i) => ({ ...i, backdrop: `${i.backdrop}\nx.removeEventListener('y', f);\n` })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['B2']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  const MUTANTS = [
    M('S1', 'the wheel slice takes a FRAGMENT — the tail drifts to an earlier line and half a function body is compiled as if it were the whole one', ['wheel'],
      (i) => ({ ...i, slice: { ...i.slice, wheel: i.slice.wheel.split('\n').slice(0, 4).join('\n') } })),
    M('A1', 'the migration reaches storage through a helper, so one of the five inside-sites stops naming localStorage and the classification\'s "only import-time touch" claim silently narrows — and the line then reappears in the OUTSIDE set, which is why both halves are the declared axis', ['inside', 'outside'],
      (i) => ({ ...i, slice: mutateText(i.slice, 'A1', '      const old = localStorage.getItem(TRANSFORM_KEY_OLD);', '      const old = readOld();') })),
    M('A2', 'the stale old key stops being removed when the new one already exists — the branch that makes a repeat load a no-op. It is the SECOND read of the old key, so it moves every row, not only the one the branch is named for', [0, 1, 2, 3],
      (i) => ({ ...i, slice: mutateText(i.slice, 'A2', '    if (localStorage.getItem(TRANSFORM_KEY_OLD) !== null) {', '    if (false && localStorage.getItem(TRANSFORM_KEY_OLD) !== null) {') })),
    M('A3', 'the copy branch stops checking whether the new key is already set. Measured rather than assumed: on the SECOND run the old key is already gone, so no write happens and only the op TRACE moves — which is the whole reason this row reads ops and not just the store', ['second'],
      (i) => ({ ...i, slice: mutateText(i.slice, 'A3', '    if (localStorage.getItem(TRANSFORM_KEY) === null) {', '    if (true) {') })),
    M('A4', 'the try/catch is dropped, so privacy mode throws out of module evaluation and takes the whole page graph with it', ['ops', 'threw'],
      (i) => ({ ...i, slice: mutateText(i.slice, 'A4', '  try {', '  if (true) {') })),
    M('A5', 'the fourth import drops its query, so a row that claims to measure a SECOND module instance actually measures the cache — and the two-op no-op it reports would be nothing at all', ['secondIsAnother', 'secondSpecifier'],
      (i) => ({ ...i, child: mutateText(i.child, 'A5', "await import(url + '?j05second=1')", 'await import(url)') })),
    M('B1', 'a seventeenth listener site appears in main.js with nobody claiming it', ['register'],
      (i) => ({ ...i, main: `${i.main}\naddEventListener('scroll', onScroll);\n` })),
    /* B01 — THE SAME MUTANT, AIMED AT THE FILE THE CODE IS NOW IN. The
       anchor text is unchanged; only the input key it perturbs moved, from
       `main` to `handoff`, because that is where the removal loop went. If
       this had been left pointing at `main` it would have missed its anchor
       and reported BROKEN rather than red — which is the failure mode D93
       exists to name, and the reason this line was checked rather than
       assumed to still work. */
    M('B2', 'the intro capture stops removing its listeners, so the register\'s one BOUNDED registration becomes page-lifetime by accident', null,
      (i) => ({ ...i, handoff: mutateText(i.handoff, 'B2', '    for (const type of INTRO_INPUT_EVENTS) removeEventListener(type, onIntroInput, true);', '    void INTRO_INPUT_EVENTS;') })),
    M('B3', 'the serif keydown is BRACED into the BODY_SERIF gate — the J-H19 move, which this row exists to notice in either direction', null,
      (i) => ({ ...i, main: mutateText(i.main, 'B3', "if (BODY_SERIF)\n  document.body.classList.add('body-serif');", "if (BODY_SERIF) {\n  document.body.classList.add('body-serif');\n}") })),
    M('C1', 'the removal loses its capture argument, so every removal misses and six window listeners survive stopIntroInputCapture()', ['afterStop'],
      (i) => ({ ...i, stop: mutateText(i.stop, 'C1', 'removeEventListener(type, onIntroInput, true);', 'removeEventListener(type, onIntroInput);') })),
    M('C2', 'the modified-chord guard drops meta, ctrl and alt, so browser shortcuts toggle the body font', ['rows'],
      (i) => ({ ...i, serif: mutateText(i.serif, 'C2', '  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;', '  if (e.isComposing) return;') })),
    M('C3', 'the enabled guard moves BELOW preventDefault — a disposed journey keeps cancelling every wheel event and the page stops scrolling. The exact inversion journey.js\'s dispose() is written around', [0],
      (i) => ({ ...i, wheel: mutateText(i.wheel, 'C3', '    if (!host.enabled()) return;\n', '')
        .replace('    if (e.cancelable) e.preventDefault();', '    if (e.cancelable) e.preventDefault();\n    if (!host.enabled()) return;') })),
    M('D1', 'a second importer names organism/organism.js WITH a cache-buster, so the page evaluates that module twice and gets two of every module-global in it', ['cacheBusted', 'multiForm'],
      (i) => ({
        ...i,
        files: i.files.map(([rel, src]) => (rel === 'journey/journey.js'
          ? [rel, `import { createScene } from '../organism/organism.js?d1-mutant=1';\n${src}`]
          : [rel, src])),
      })),
  ];

  const res = sweep(MUTANTS);
  L.discard();
  L.same('P1', 'D50 — mutants exercised', res.total, MUTANTS.length);
  L.same('P2', 'D50 — every mutant drove its named assertion red, on the axis it declared', res.bad, 0);
  /* D88 — THE DECLARED-EQUIVALENCE SET IS EMPTY. Every mutation above moves a
     quantity some pin reads; none is a refactoring that leaves behaviour
     intact. So the survivor set must be empty, and P0a is the separate proof
     that an empty survivor set is a finding rather than an instrument that
     cannot report one. */
  L.same('P3', 'D88 — the survivor set EQUALS the declared-equivalence set, which for this list is empty',
    res.gates.outputStill, []);
  L.same('P4', 'D74 — no mutant reported BROKEN (a rotted anchor is never a silent kill)',
    Object.entries(res.gates).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.join(',')}`), []);
  L.same('P5', 'D70 — harness faults during the sweep (re-raised after the report, never scored)', res.faults, []);
  L.same('P6', 'D58 — registered pins carrying no mutant', res.uncovered, []);
  L.same('P7', 'D58 — every registered pin is mutated exactly once; the null control is the only extra mutant and it ran separately',
    [REGISTRY.size, MUTANTS.length, CTL.total], [MUTANTS.length, MUTANTS.length, 1]);
  SENTINEL.reach('prove');
  exitCode = L.report() || exitCode;
  if (res.faults.length) {
    throw new HarnessFault(`${res.faults.length} harness fault(s) during the sweep:\n  ${res.faults.join('\n  ')}`);
  }
}

process.exit(exitCode);
