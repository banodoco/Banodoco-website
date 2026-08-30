#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-global-hooks.mjs — J04c, the dial and chapter-installed
 * global hooks.
 *
 * SUBJECT
 *   journey/dial.js                    one QA-only `keydown` on the global,
 *                                      plus the readout element it appends to
 *                                      document.body.
 *   journey/chapters/final/index.js    two `document` listeners installed by a
 *                                      chapter into the page — the "chapter-
 *                                      installed global hooks" the order is
 *                                      named for (lifecycle.md section 6.4).
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   All three registrations now go through an owner that can take them back
 *   off again, exactly once, and NOTHING ELSE MOVED — proved by executing the
 *   BASE COMMIT's bodies and the shipped bodies in one recording world and
 *   comparing what each registered, what each handler decided, and in what
 *   order.
 *
 * THE ACCEPTANCE ROW, EXECUTED
 *   design.md section 6's J04c row reads "dial registers zero on a plain
 *   load". B1 is that sentence run: a non-QA createDial() registers zero
 *   listeners, creates zero elements, and leaves owner.pending at 0.
 *
 * THE ORACLE, AND WHY THE BASE COMMIT RATHER THAN A FIXTURE
 *   Both subjects are sliced out of TEXT at two revisions — the shipped
 *   working tree, and commit 6967a36, which is this run's base and the same
 *   immutable sha tools/verify-j04b.mjs already reads through `git show`.
 *   J03 embedded its pre-C05 fixture verbatim because a pin over "what HEAD
 *   used to say" stops being true the moment a run is committed; that
 *   objection does not reach a FIXED sha, which says the same thing forever.
 *   Both texts are then compiled and EXECUTED against the same world, so the
 *   comparison is of behaviour and not of diffs.
 *
 *   Measured at the time of writing: journey/dial.js is byte-identical to the
 *   base commit, and journey/chapters/final/index.js differs from it only in
 *   C05 slice B's descriptor region, nowhere near the hook block. A3/A4/D1
 *   are the rows that would notice if that ever stopped being true, because
 *   every slice anchor refuses on a miss AND on ambiguity.
 *
 * THE FOUR KINDS OF ROW
 *   A is STATIC and every assert-zero is a ZERO OF LOOKING (D102): the same
 *     scanner returns the subjects' empty set and journey/backdrop.js's
 *     non-empty one in the same call, so a scanner that had gone blind
 *     reports [] against a pinned non-empty control.
 *   B is EXECUTED, on the IMPORTED module. journey/dial.js needs no DOM and
 *     no WebGL, so unlike J03's subject it can be driven directly; the world
 *     is installed on the real globalThis for the length of the call and
 *     removed in a finally.
 *   C is the ORACLE over the dial: base text and shipped text compiled side
 *     by side, plus the equivalence control that the compiled shipped body
 *     behaves as the imported module does — the control J03's B0 records as
 *     unavailable for its subject and which IS available for this one.
 *   D is the ORACLE over Final's hooks. That module cannot be imported (it
 *     needs three.js, a scene and a document at construction), so both sides
 *     are slices executed in a compiled harness.
 *
 * EXPECTATIONS WERE WRITTEN DOWN FIRST. Every literal below was hand-derived
 *   from the authored law and recorded in
 *   docs/code-health/evidence/2026-08-21-elegance-run-01/j04c/expectations.md
 *   before this file existed. One correction was needed and is recorded there.
 *
 * D105 — every reader BUILDS ITS WORLD FROM A SPEC on each call. Nothing here
 *   registers a pre-built world and mutates it, so the sweep's baseline never
 *   sees a world a previous call moved.
 *
 * D88, THE REGISTRY'S DECLARED BLIND SPOTS. `inputCanon` hashes String(fn),
 *   so every mutant here perturbs SOURCE TEXT which the reader then compiles;
 *   none swaps an already-built closure. No input is a Map. Nothing here is
 *   frozen, so that blind spot does not arise — and where a property could
 *   not be expressed through canonicalisation at all (listener IDENTITY on
 *   removal), the check is EXECUTED INSIDE THE READER: the world records
 *   whether the function handed to removeEventListener is the one that was
 *   registered, and the pin reads that verdict rather than a digest.
 *
 * WHAT THIS SUITE DOES NOT PROVE — stated with the code:
 *   * It never runs a browser. Nothing here shows the readout element looks
 *     right, or that a real 'keydown' reaches the real window. The capture
 *     record was not re-run; the claim about it is "not touched".
 *   * It does not execute journey/chapters/final/index.js. The two hook
 *     statements and the descriptor's `dispose` member are sliced from its
 *     text and run in a harness; the surrounding 1,300 lines are not
 *     compiled, so nothing here says the chapter still builds.
 *   * It says nothing about whether `dispose()` is CALLED. No production
 *     caller disposes a chapter or a dial — journey/chapter-registry.js
 *     deliberately does not cascade — so every disposal assertion here runs
 *     in a scenario this suite constructs. That is J04d's and R07's ground.
 *   * The readout's shared `#j-dial-style` element is deliberately NOT owned
 *     (one sheet serves every dial). Nothing proves that a page which
 *     destroys its only dial is left without a stray stylesheet, because it
 *     is: that is a stated decision, not an unnoticed leak.
 *
 * Usage:
 *   node tools/test-global-hooks.mjs
 *   node tools/test-global-hooks.mjs --prove-failure
 * ==================================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import {
  literalPredicateRe, literalPredicateHits, literalPredicateProbe,
  maskedToken, selfSiteSet, foreignSiteSet, scanTautologyAst, code,
} from './self-controls.mjs';
import {
  HarnessFault, fault, mutateText, sliceBetween, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import { createOwner } from '../journey/ui/owner.js';
import { createDial as IMPORTED_CREATE_DIAL } from '../journey/dial.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-global-hooks', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');

const DIAL = 'journey/dial.js';
const FINAL = 'journey/chapters/final/index.js';
const BACKDROP = 'journey/backdrop.js';

/** The run's base commit — the same immutable sha tools/verify-j04b.mjs
 *  reads. A short or missing blob is a harness fault, never a comparison. */
const BASE_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';
function baseSource(relPath) {
  let out;
  try {
    out = execFileSync('git', ['show', `${BASE_SHA}:${relPath}`], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    fault(`base source for ${relPath} is unreadable at ${BASE_SHA.slice(0, 7)}: ${e.message}`);
  }
  if (!out || out.length < 1000) fault(`base source for ${relPath} is implausibly short`);
  return out;
}

/** sliceBetween with J02's ambiguity refusal in front of it: a text slicer
 *  that silently takes the first of two matches is D85's family. */
function uniqueSlice(src, tag, startAnchor, endAnchor) {
  const n = src.split(startAnchor).length - 1;
  if (n !== 1) fault(`ambiguous slice (${tag}): start anchor occurs ${n} times, expected exactly 1`);
  return sliceBetween(src, tag, startAnchor, endAnchor);
}

const SRC = {
  dial: read(DIAL),
  final: read(FINAL),
  backdrop: read(BACKDROP),
  baseDial: baseSource(DIAL),
  baseFinal: baseSource(FINAL),
};

/* ------------------------------------------------------------------ *
 * THE RECORDING WORLD — built from nothing but its own function, on    *
 * every call (D105). It is a log, a listener table and a fake document *
 * small enough to read in one screen.                                  *
 * ------------------------------------------------------------------ */

const optCanon = (o) => (o === undefined ? 'undefined' : JSON.stringify(o));

function makeWorld() {
  const log = [];
  const table = new Map();          // `${target}:${type}` -> { fn, opts }

  const record = (target) => ({
    add(type, fn, opts) {
      log.push(`+listen ${target}:${type}:${optCanon(opts)}`);
      table.set(`${target}:${type}`, { fn, opts });
    },
    remove(type, fn, opts) {
      const held = table.get(`${target}:${type}`);
      /* IDENTITY IS CHECKED HERE, INSIDE THE READER, and not by comparing
         canonical forms outside it: `inputCanon` digests a function by its
         SOURCE, so two distinct closures over the same body are
         indistinguishable to it. Whether the function handed back is the one
         registered is exactly the property owner.listen exists to guarantee,
         so the world decides it and the pin reads the verdict. */
      const same = !!held && held.fn === fn && optCanon(held.opts) === optCanon(opts);
      log.push(`-listen ${target}:${type}:${optCanon(opts)}:${same ? 'sameFn' : 'WRONG-FN'}`);
      if (same) table.delete(`${target}:${type}`);
    },
  });

  const viewRec = record('globalThis');
  const docRec = record('document');

  const nameOf = (el) => (el.__role || `<${el.tagName}>`);
  const mkEl = (tag) => {
    const el = {
      tagName: String(tag).toUpperCase(),
      id: '', className: '', textContent: '',
      style: {}, attrs: {}, kids: [], parent: null,
      setAttribute(k, v) { this.attrs[k] = String(v); },
      appendChild(n) {
        n.parent = this; this.kids.push(n);
        log.push(`+append ${nameOf(this)}<${n.tagName}>`);
        return n;
      },
      append(...ns) {
        for (const n of ns) {
          if (typeof n === 'string') { this.textContent += n; log.push(`+text ${nameOf(this)}`); }
          else this.appendChild(n);
        }
      },
      remove() {
        log.push(`-remove <${this.tagName}>`);
        if (this.parent) {
          this.parent.kids = this.parent.kids.filter((k) => k !== this);
          this.parent = null;
        }
      },
    };
    return el;
  };

  const head = mkEl('head'); head.__role = 'head';
  const body = mkEl('body'); body.__role = 'body';
  const findById = (el, id) => {
    if (el.id === id) return el;
    for (const k of el.kids) { const hit = findById(k, id); if (hit) return hit; }
    return null;
  };

  const document = {
    head,
    body,
    createElement(tag) { log.push(`+create <${String(tag).toUpperCase()}>`); return mkEl(tag); },
    getElementById(id) { return findById(head, id) || findById(body, id); },
    addEventListener(type, fn, opts) { docRec.add(type, fn, opts); },
    removeEventListener(type, fn, opts) { docRec.remove(type, fn, opts); },
  };

  const view = {
    addEventListener(type, fn, opts) { viewRec.add(type, fn, opts); },
    removeEventListener(type, fn, opts) { viewRec.remove(type, fn, opts); },
  };

  return {
    log,
    document,
    view,
    /** The bare, unqualified `addEventListener(...)` the base dial calls. */
    bareAdd(type, fn, opts) { viewRec.add(type, fn, opts); },
    live: () => [...table.keys()].sort(),
    fire(target, type, event) {
      const held = table.get(`${target}:${type}`);
      if (!held) return 'no-listener';
      held.fn(event);
      return 'dispatched';
    },
    /** The world's own summary — counts derived from the log, never tallied
     *  by the caller, so a pin and a mutant read the same arithmetic. */
    tally() {
      const n = (p) => log.filter((r) => r.startsWith(p)).length;
      return {
        registrations: n('+listen'),
        removals: n('-listen'),
        creates: n('+create'),
        appends: n('+append'),
        removes: n('-remove'),
      };
    },
  };
}

/* ------------------------------------------------------------------ *
 * THE SLICES. Every anchor refuses on a miss and on ambiguity.         *
 * ------------------------------------------------------------------ */

const DIAL_HEAD = 'export function createDial({';
const DIAL_TAIL = '\n  return api;\n}';
const FINAL_BLOCK_HEAD = "  const CTA_SEL = '[data-final-cta], .j-final-cta';";
const FINAL_TAIL = "  document.addEventListener('focusin', onOver);";

const SLICE = {
  dialShipped: uniqueSlice(SRC.dial, 'dial-shipped', DIAL_HEAD, DIAL_TAIL),
  dialBase: uniqueSlice(SRC.baseDial, 'dial-base', DIAL_HEAD, DIAL_TAIL),
  finalShipped: uniqueSlice(SRC.final, 'final-shipped', FINAL_BLOCK_HEAD, FINAL_TAIL),
  finalBase: uniqueSlice(SRC.baseFinal, 'final-base', FINAL_BLOCK_HEAD, FINAL_TAIL),
};

/* ------------------------------------------------------------------ *
 * COMPILERS. `'use strict'` is prepended so the compiled bodies run    *
 * under the same mode the ES modules they came from do.                *
 * ------------------------------------------------------------------ */

/** Compile a createDial factory out of either revision's text. The three
 *  free names the two revisions between them reach for — the bare
 *  `addEventListener`, `document`, `globalThis` — arrive as PARAMETERS, so
 *  the compiled body cannot touch the real global and the base and shipped
 *  bodies are measured against the identical world. */
function compileDial(factoryText, world) {
  /* `_readoutCount` is module state in journey/dial.js — outside the sliced
     factory — so the harness declares it. It is seeded 0 for BOTH revisions,
     which is what the module itself does on load; the only observable it
     reaches is the readout's `bottom` offset, and a divergence there would
     show up in the recorded style writes. */
  const body = `'use strict';\nlet _readoutCount = 0;\n${factoryText.replace('export function', 'function')}\nreturn createDial;`;
  const make = new Function('addEventListener', 'document', 'globalThis', 'createOwner', body);
  return make(
    (type, fn, opts) => world.bareAdd(type, fn, opts),
    world.document, world.view, createOwner,
  );
}

/** The whole path from a file's TEXT to a runnable factory, in one place, so
 *  that every B and C reader takes source text as its input and a mutant is
 *  always a text perturbation the reader then compiles (D88). */
function dialFrom(text, world) {
  return compileDial(uniqueSlice(text, 'dial-from', DIAL_HEAD, DIAL_TAIL), world);
}

/** Compile Final's hook block plus, on the shipped side, the descriptor's
 *  `dispose` member. `amount` and `fireCta()` are the two names the sliced
 *  handler closes over in the real module; they are declared here with the
 *  same shapes and nothing else is supplied. */
function compileFinalHooks(blockText, world, amount0) {
  const body = `'use strict';
let amount = ${JSON.stringify(amount0)};
let fired = 0;
function fireCta() { fired++; }
${blockText}
return {
  get fired() { return fired; },
  setAmount(a) { amount = a; },
};`;
  const make = new Function('document', body);
  return make(world.document);
}

/* ------------------------------------------------------------------ *
 * SCENARIOS — the tables from expectations.md, as data.                *
 * ------------------------------------------------------------------ */

const DIAL_CONFIG = Object.freeze({
  name: 'transform', shipped: 0.5, active: true, qsValue: null,
});

/** The twelve keydown rows. `from` re-seats the dial's value first, through
 *  the public `.set()`, so the row is about the HANDLER and not about how
 *  the value got there. */
const KEY_ROWS = Object.freeze([
  { what: 'increment', ev: { key: ']' } },
  { what: 'decrement', ev: { key: '[' } },
  { what: 'other key', ev: { key: 'x' } },
  { what: 'meta chord', ev: { key: ']', metaKey: true } },
  { what: 'ctrl chord', ev: { key: ']', ctrlKey: true } },
  { what: 'alt chord', ev: { key: ']', altKey: true } },
  { what: 'composing', ev: { key: ']', isComposing: true } },
  { what: 'into an input', ev: { key: ']', target: { tagName: 'INPUT' } } },
  { what: 'into a textarea', ev: { key: ']', target: { tagName: 'TEXTAREA' } } },
  { what: 'into contenteditable', ev: { key: ']', target: { isContentEditable: true } } },
  { what: 'clamped at max', ev: { key: ']' }, from: 1 },
  { what: 'clamped at min', ev: { key: '[' }, from: 0 },
]);

/** Drive one createDial implementation through construction and, when it is
 *  the QA path, the twelve key rows. Returns data, never a verdict. */
function driveDial(createDialFn, world, { active }) {
  const saved = [];
  const dial = createDialFn({
    ...DIAL_CONFIG,
    active,
    loadStored: () => null,
    saveStored: (v) => { saved.push(v); },
  });
  const built = { tally: world.tally(), log: [...world.log], value: dial.value, saved: [...saved] };
  const rows = [];
  for (const row of KEY_ROWS) {
    if (row.from !== undefined) dial.set(row.from);
    const before = dial.value;
    const savedBefore = saved.length;
    const verdict = world.fire('globalThis', 'keydown', { target: null, ...row.ev });
    rows.push(`${row.what}: ${verdict} ${before} -> ${dial.value} saved+${saved.length - savedBefore}`);
  }
  return { dial, built, rows, saved };
}

/** The imported module reaches the REAL globalThis, so its world is
 *  installed there for the length of the call and taken away in a finally.
 *  Nothing else in this suite touches the real global. */
function withInstalledWorld(world, fn) {
  const had = {
    add: Object.getOwnPropertyDescriptor(globalThis, 'addEventListener'),
    rem: Object.getOwnPropertyDescriptor(globalThis, 'removeEventListener'),
    doc: Object.getOwnPropertyDescriptor(globalThis, 'document'),
  };
  globalThis.addEventListener = (t, f, o) => world.view.addEventListener(t, f, o);
  globalThis.removeEventListener = (t, f, o) => world.view.removeEventListener(t, f, o);
  globalThis.document = world.document;
  try {
    return fn();
  } finally {
    for (const [key, d] of [['addEventListener', had.add], ['removeEventListener', had.rem], ['document', had.doc]]) {
      if (d) Object.defineProperty(globalThis, key, d);
      else delete globalThis[key];
    }
  }
}

/** Final's eight handler rows — four decisions, each through both types. */
const CTA_ROWS = Object.freeze([
  { what: 'armed, a CTA under the pointer', amount: 0.9, closest: 'hit' },
  { what: 'not armed', amount: 0.5, closest: 'hit' },
  { what: 'a target with no closest()', amount: 0.9, closest: 'absent' },
  { what: 'armed, nothing matching', amount: 0.9, closest: 'miss' },
]);

function targetFor(kind, seen) {
  if (kind === 'absent') return {};
  return { closest: (sel) => { seen.push(sel); return kind === 'hit' ? { tag: 'a' } : null; } };
}

function driveFinal(blockText, world) {
  const h = compileFinalHooks(blockText, world, 0);
  const built = { tally: world.tally(), log: [...world.log], live: world.live() };
  const seen = [];
  const rows = [];
  for (const type of ['pointerover', 'focusin']) {
    for (const row of CTA_ROWS) {
      h.setAmount(row.amount);
      const before = h.fired;
      const verdict = world.fire('document', type, { target: targetFor(row.closest, seen) });
      rows.push(`${type} ${row.what}: ${verdict} fired+${h.fired - before}`);
    }
  }
  return { h, built, rows, seen };
}

/* ------------------------------------------------------------------ *
 * A — STATIC. Every zero stands beside a non-empty set the same        *
 *     scanner found in the same call (D102).                           *
 * ------------------------------------------------------------------ */
console.log('\nA — static: the raw registrations are gone, and the owner is imported');

/* Comments are blanked, string CONTENTS are not: every row below quotes an
   event type, and `code()`'s default would pin eight rows of blanked quotes
   that agree with each other whatever the types become. */
const KEEP_STRINGS = Object.freeze({ blankStrings: false });
const RAW_RE = /\b(?:add|remove)EventListener\s*\(/;
const LISTEN_RE = /\.listen\s*\(/;
const IMPORT_RE = /import\s*\{\s*createOwner\s*\}/;

/* RE-BASELINED by the DISPOSAL REMOVAL, 2026-08-25. `subjects` WAS `[]` under
   the claim "neither subject contains a raw registration". That is still true
   of journey/dial.js, which still funnels its one QA keydown; it is no longer
   true of Final, whose two chapter-installed document hooks went back to being
   raw `document.addEventListener` calls when the detach path they funnelled
   for was removed. So the row keeps its scanner and its control and changes
   what it expects to FIND: an exact two-entry named set for Final and nothing
   for the dial. That is strictly more specific than the zero it replaces — the
   zero could only see a registration appearing; the named set also sees one
   MOVING or CHANGING TYPE. */
pin('A1', 'D102 — the dial holds no raw registration and Final holds exactly its two named document hooks, with journey/backdrop.js\'s four returned by the SAME scanner in the same call',
  (i) => ({
    subjects: [...foreignSiteSet(DIAL, i.dial, RAW_RE, KEEP_STRINGS),
      ...foreignSiteSet(FINAL, i.final, RAW_RE, KEEP_STRINGS)]
      .map((r) => r.replace(/ :: \d+ :: /, ' :: ')).sort(),
    control: foreignSiteSet(BACKDROP, i.backdrop, RAW_RE, KEEP_STRINGS)
      .map((r) => r.replace(/ :: \d+ :: /, ' :: ')).sort(),
  }),
  { dial: SRC.dial, final: SRC.final, backdrop: SRC.backdrop },
  {
    subjects: [
      "journey/chapters/final/index.js :: document.addEventListener('focusin', onOver);",
      "journey/chapters/final/index.js :: document.addEventListener('pointerover', onOver);",
    ],
    control: [
      "journey/backdrop.js :: backdrop.addEventListener('lostpointercapture', clear);",
      "journey/backdrop.js :: backdrop.addEventListener('pointercancel', clear);",
      "journey/backdrop.js :: backdrop.addEventListener('pointerdown', onPointerDown);",
      "journey/backdrop.js :: backdrop.addEventListener('pointerup', onPointerUp);",
      "journey/backdrop.js :: backdrop.removeEventListener('lostpointercapture', clear);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointercancel', clear);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointerdown', onPointerDown);",
      "journey/backdrop.js :: backdrop.removeEventListener('pointerup', onPointerUp);",
    ],
  },
  'backdrop.js is lifecycle.md section 6.3\'s model file and is DELIBERATELY unconverted (M7 pins its four removals by text), which is what makes it the right non-empty control');

/* RE-BASELINED by the DISPOSAL REMOVAL, 2026-08-25: THREE funnelled sites
   became ONE. Final's two left the funnel with the detach path (see A1). The
   dial's one stayed, because the funnel still does the job the dial needs it
   for — making the registration countable and NAMED, which is what J-H19's
   zero (A4) is read against. */
pin('A2', 'D54/D64 — the one funnelled site, keyed `file :: text`: the dial\'s QA keydown, and nothing else in either subject',
  (i) => [...foreignSiteSet(DIAL, i.dial, LISTEN_RE, KEEP_STRINGS),
    ...foreignSiteSet(FINAL, i.final, LISTEN_RE, KEEP_STRINGS)]
    .map((r) => r.replace(/ :: \d+ :: /, ' :: ')).sort(),
  { dial: SRC.dial, final: SRC.final },
  [
    "journey/dial.js :: owner.listen(globalThis, 'keydown', (e) => {",
  ]);

pin('A3', 'the dial imports createOwner, from the path it actually lives at, and Final no longer imports it at all',
  (i) => [...foreignSiteSet(DIAL, i.dial, IMPORT_RE, KEEP_STRINGS),
    ...foreignSiteSet(FINAL, i.final, IMPORT_RE, KEEP_STRINGS)]
    .map((r) => r.replace(/ :: \d+ :: /, ' :: ')).sort(),
  { dial: SRC.dial, final: SRC.final },
  [
    "journey/dial.js :: import { createOwner } from './ui/owner.js';",
  ],
  'lifecycle.md section 2 calls the module journey/lifecycle/owner.js. It is not there, and J04c could not move it: the relocation rewrites imports in journey/ui.js and journey/rail.js, which this order may not write. Open debt, recorded rather than hidden.');

pin('A4', 'J-H19 — the dial\'s ONLY registration still sits inside a conditional branch, with showDial(), and there is no second one outside it',
  (i) => {
    const src = code(i.dial, KEEP_STRINGS);
    /* The branch is located FROM THE REGISTRATION, never from a fixed guard
       string: an anchor a legitimate widening deletes would abort this row
       instead of reddening it, which is D57's shape in a gate. */
    const at = src.indexOf('owner.listen(globalThis,');
    if (at < 0) fault('A4: journey/dial.js no longer registers through owner.listen — A1/A2 say what happened');
    const head = src.slice(0, at).split('\n');
    const guardAt = head.length - 1 - [...head].reverse().findIndex((l) => /^ {2}if \(.*\) \{$/.test(l));
    if (guardAt >= head.length) fault('A4: the registration is not inside a two-space-indented if branch at all');
    /* The guard's OFFSET, computed from the lines before it — not
       src.indexOf(text), which would take the first of any two identical
       guard lines (J02's first-hit finding). */
    const from = head.slice(0, guardAt).join('\n').length + (guardAt > 0 ? 1 : 0);
    let depth = 0;
    let end = -1;
    for (let k = src.indexOf('{', from); k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}') { depth--; if (depth === 0) { end = k; break; } }
    }
    if (end < 0) fault('A4: the branch never closes');
    const branch = src.slice(from, end + 1);
    return {
      guard: head[guardAt].trim(),
      listensInBranch: (branch.match(/owner\.listen\(/g) || []).length,
      showsDialInBranch: branch.includes('showDial();'),
      registrationsOutsideBranch: (src.split(branch).join('').match(/owner\.listen\(/g) || []).length,
    };
  },
  { dial: SRC.dial },
  {
    guard: "if (qaDial && typeof addEventListener === 'function') {",
    listensInBranch: 1,
    showsDialInBranch: true,
    registrationsOutsideBranch: 0,
  });

/** Top-level member names of an object literal, at brace depth 1 from the
 *  opening brace. Used only to diff Final's descriptor across the two
 *  revisions, so it models exactly what a descriptor literal contains:
 *  `name:` and `name(` members, in source order. */
function literalMembers(src, tag, openAnchor) {
  const at = src.indexOf(openAnchor);
  if (at < 0) fault(`${tag}: descriptor anchor absent`);
  if (src.indexOf(openAnchor, at + 1) !== -1) fault(`${tag}: descriptor anchor is ambiguous`);
  let depth = 0;
  const names = [];
  const from = src.indexOf('{', at);
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return names; }
    else if (c === '\n' && depth === 1) {
      const line = src.slice(i + 1, src.indexOf('\n', i + 1));
      const m = /^ {4}(?:get |set )?([A-Za-z_$][\w$]*)\s*[:(,]/.exec(line);
      if (m) names.push(m[1]);
    }
  }
  fault(`${tag}: descriptor literal never closed`);
  return names;
}

/* RE-BASELINED by the DISPOSAL REMOVAL, 2026-08-25: `dispose` LEFT the list,
   between `snapLanding` and `frontWorld`. Every core key and the one
   capability are in the same relative order they have always been in, which
   is what this row has always actually defended. */
pin('A5', 'D54 — Final\'s descriptor members, in source order: `dispose` is gone and every core key and the one capability are still where they were',
  (i) => literalMembers(code(i.final), 'A5', '\n  return {\n'),
  { final: SRC.final },
  ['id', 'group', 'nodeIds', 'setArmed', 'armed', 'setGliding', 'setBlending',
    'pacing', 'snap', 'snapLanding', 'frontWorld', 'focusWorld',
    'focus', 'trigger', 'counts', 'seats', 'pickStats'],
  'the BASE commit\'s list is deliberately NOT the comparison here: C05 slice B added `id` and `focus` and hoisted `focusWorld` out of the literal, so a base-vs-shipped diff would attribute three of C05\'s edits to J04c. tools/test-chapter-contract.mjs T4 filters this same literal through CORE_KEYS and CAPABILITY_KEYS and is blind to a root member by design; this row is what watches that half');

/* ------------------------------------------------------------------ *
 * B — EXECUTED, on the IMPORTED module.                                *
 * ------------------------------------------------------------------ */
console.log('\nB — executed: the shipped journey/dial.js, imported and driven');

pin('B1', 'THE ACCEPTANCE ROW — a plain (non-QA) load registers ZERO listeners and creates ZERO DOM, and a later .set() on it still registers nothing',
  (i) => {
    const w = makeWorld();
    const make = dialFrom(i.dial, w);
    const d = make({ ...DIAL_CONFIG, active: false, loadStored: () => null, saveStored: () => {} });
    const before = { ...w.tally(), value: d.value };
    /* THE SECOND HALF IS THE BRANCH-ENTRY WITNESS (D75) AND IT REPLACES THE
       destroy() THIS ROW USED TO CALL. A construction that registered nothing
       because it never ran at all would also read zero; driving a real `.set()`
       through it — which reaches showDial(), the one path that could create the
       readout — and reading zero again says the gate is what is holding, not
       an absence. `returned` proves the call did something. */
    const returned = d.set(0.7);
    return { ...before, afterSet: w.tally(), returned, log: w.log };
  },
  { dial: SRC.dial },
  {
    registrations: 0, removals: 0, creates: 0, appends: 0, removes: 0, value: 0.5,
    afterSet: {
      registrations: 0, removals: 0, creates: 0, appends: 0, removes: 0,
    },
    returned: 0.7,
    log: [],
  },
  'design.md section 6\'s J04c acceptance, executed rather than asserted');

pin('B2', 'a QA load registers exactly one keydown on the global and builds the readout — the full construction sequence, in order',
  (i) => {
    const w = makeWorld();
    driveDial(dialFrom(i.dial, w), w, { active: true });
    return w.log.slice(0, 8);
  },
  { dial: SRC.dial },
  [
    '+listen globalThis:keydown:undefined',
    '+create <STYLE>',
    '+append head<STYLE>',
    '+create <DIV>',
    '+text <DIV>',
    '+create <B>',
    '+append <DIV><B>',
    '+append body<DIV>',
  ]);

/* B3, B4 AND B5 ARE GONE WITH `destroy()`. They read the drain order of the
   dial's teardown, its detach-once idempotence, and the behaviour of a `.set()`
   after it — including the TypeError that the `owner.disposed` guard inside
   showDial() existed to prevent. The method, the guard and the hazard are all
   removed; the dial's readout and its one QA keydown now live as long as the
   document does, which on a QA session is the whole point of them.
   docs/code-health/DISPOSAL-REMOVED.md. */

pin('B6', 'the twelve keydown decisions, verbatim from expectations.md',
  (i) => {
    const w = makeWorld();
    return driveDial(dialFrom(i.dial, w), w, { active: true }).rows;
  },
  { dial: SRC.dial },
  [
    'increment: dispatched 0.5 -> 0.55 saved+1',
    'decrement: dispatched 0.55 -> 0.5 saved+1',
    'other key: dispatched 0.5 -> 0.5 saved+0',
    'meta chord: dispatched 0.5 -> 0.5 saved+0',
    'ctrl chord: dispatched 0.5 -> 0.5 saved+0',
    'alt chord: dispatched 0.5 -> 0.5 saved+0',
    'composing: dispatched 0.5 -> 0.5 saved+0',
    'into an input: dispatched 0.5 -> 0.5 saved+0',
    'into a textarea: dispatched 0.5 -> 0.5 saved+0',
    'into contenteditable: dispatched 0.5 -> 0.5 saved+0',
    'clamped at max: dispatched 1 -> 1 saved+1',
    'clamped at min: dispatched 0 -> 0 saved+1',
  ]);

pin('B7', 'every persisted value is the CLAMPED, STEPPED one — the raw sum the clamp exists to tidy never reaches storage',
  (i) => {
    const w = makeWorld();
    return driveDial(dialFrom(i.dial, w), w, { active: true }).saved;
  },
  { dial: SRC.dial },
  [0.55, 0.5, 1, 0]);

/* ------------------------------------------------------------------ *
 * C — THE ORACLE over the dial: base text and shipped text, executed.  *
 * ------------------------------------------------------------------ */
console.log('\nC — oracle: 6967a36\'s createDial and the shipped one, in one world');

pin('C1', 'EQUIVALENCE CONTROL — the compiled SHIPPED slice behaves exactly as the imported module does, so the oracle below is measuring the shipped code and not a lookalike',
  (i) => {
    const w1 = makeWorld();
    const compiled = driveDial(compileDial(i.shipped, w1), w1, { active: true });
    const w2 = makeWorld();
    const imported = withInstalledWorld(w2, () => driveDial(i.make, w2, { active: true }));
    return {
      logsEqual: JSON.stringify(w1.log) === JSON.stringify(w2.log),
      rowsEqual: JSON.stringify(compiled.rows) === JSON.stringify(imported.rows),
      savedEqual: JSON.stringify(compiled.saved) === JSON.stringify(imported.saved),
      logLength: w1.log.length,
    };
  },
  { shipped: SLICE.dialShipped, make: IMPORTED_CREATE_DIAL },
  { logsEqual: true, rowsEqual: true, savedEqual: true, logLength: 8 },
  'J03 recorded that its subject had no such control available (journey/ui.js needs a DOM); this subject does, and it is used');

pin('C2', 'BASE vs SHIPPED — construction registers the identical things, on both the QA path and the plain one',
  (i) => {
    const run = (text, active) => {
      const w = makeWorld();
      driveDial(compileDial(text, w), w, { active });
      return w.log;
    };
    return {
      qa: [run(i.base, true), run(i.shipped, true)],
      plain: [run(i.base, false), run(i.shipped, false)],
    };
  },
  { base: SLICE.dialBase, shipped: SLICE.dialShipped },
  {
    qa: [
      ['+listen globalThis:keydown:undefined', '+create <STYLE>', '+append head<STYLE>',
        '+create <DIV>', '+text <DIV>', '+create <B>', '+append <DIV><B>', '+append body<DIV>'],
      ['+listen globalThis:keydown:undefined', '+create <STYLE>', '+append head<STYLE>',
        '+create <DIV>', '+text <DIV>', '+create <B>', '+append <DIV><B>', '+append body<DIV>'],
    ],
    plain: [[], []],
  },
  'the two arrays are written out in full rather than compared to each other: a pin whose expected side is `a === b` passes when both sides break the same way');

pin('C3', 'BASE vs SHIPPED — the twelve keydown decisions are identical, and identical to the imported module\'s',
  (i) => {
    const run = (text) => {
      const w = makeWorld();
      return driveDial(compileDial(text, w), w, { active: true }).rows.join(' | ');
    };
    return [run(i.base) === run(i.shipped), run(i.shipped).split(' | ').length];
  },
  { base: SLICE.dialBase, shipped: SLICE.dialShipped },
  [true, 12],
  'B6 holds the twelve rows as literals; this row holds the base/shipped agreement, so neither statement rests on the other');

/* RE-BASELINED by the DISPOSAL REMOVAL, 2026-08-25. WAS: "the ONLY difference
   in the public surface is the new detach — base has no destroy() to call at
   all", expecting `shipped` to carry an extra `destroy`. The detach is gone,
   so the two surfaces are IDENTICAL again and this row now says so. A row that
   compares two identical lists is not vacuous here: it is the statement that
   the removal returned the dial's public surface exactly to 6967a36's rather
   than approximately, and any drift in either direction still fails it. */
pin('C4', 'the public surface is IDENTICAL to the base commit\'s — the detach J04c added has been removed exactly, nothing else moved',
  (i) => {
    const keys = (text) => {
      const w = makeWorld();
      const d = compileDial(text, w)({ ...DIAL_CONFIG, active: false, loadStored: () => null });
      return Object.keys(d).sort();
    };
    return { base: keys(i.base), shipped: keys(i.shipped) };
  },
  { base: SLICE.dialBase, shipped: SLICE.dialShipped },
  { base: ['active', 'set', 'value'], shipped: ['active', 'set', 'value'] });

/* ------------------------------------------------------------------ *
 * D — THE ORACLE over Final's document hooks.                          *
 * ------------------------------------------------------------------ */
console.log('\nD — Final\'s two document hooks: reverted to base, and still deciding correctly');

pin('D1', 'both slices are WHOLE statement runs under refusing, ambiguity-checked anchors — not fragments',
  (i) => Object.entries(i.slice).map(([k, v]) => {
    const t = v.trim();
    return `${k}:${t.split('\n').length}:${t.startsWith('const CTA_SEL') ? 'head' : 'FRAGMENT'}:${t.endsWith(';') ? 'closed' : 'OPEN'}`;
  }),
  { slice: { base: SLICE.finalBase, shipped: SLICE.finalShipped } },
  ['base:6:head:closed', 'shipped:12:head:closed']);

/* D2, REPLACED BY THE DISPOSAL REMOVAL, 2026-08-25 — and this is the finding,
   not the repair.
   ===========================================================================
   WAS: a BASE-vs-SHIPPED oracle, compiling both texts in one world and
   comparing what each registered. That oracle existed because J04c had
   CHANGED these two statements — `document.addEventListener(...)` became
   `globalHooks.listen(document, ...)` — and somebody had to show the change
   was behaviour-preserving.

   The removal put them back. Code-stripped, Final's hook block is now
   BYTE-IDENTICAL to 6967a36's, so the two sides of that oracle are the same
   text and comparing them would be D45's shape: a check over a subject that no
   longer differs, reporting green forever.

   So the row now asserts the identity DIRECTLY, which is the strongest thing
   available and cheaper than the oracle it replaces: the conversion was
   reverted EXACTLY, not approximately. A one-character drift in either
   direction fails here. */
pin('D2', 'THE REVERSION IS EXACT — code-stripped, Final\'s hook block is byte-identical to 6967a36\'s, so the J04c conversion was undone and nothing else in the block moved',
  (i) => {
    const strip = (t) => code(t, KEEP_STRINGS).split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).join('\n');
    const b = strip(i.base); const sh = strip(i.shipped);
    return { identical: b === sh, lines: b.split('\n').length, head: b.split('\n')[0].trim() };
  },
  { base: SLICE.finalBase, shipped: SLICE.finalShipped },
  { identical: true, lines: 6, head: "const CTA_SEL = '[data-final-cta], .j-final-cta';" },
  'the LINE COUNT and the HEAD travel with the boolean deliberately: `identical: true` alone would also be produced by two empty strings, which is exactly what a slicer that had silently started returning nothing would give (D75).');

pin('D3', 'the eight delegation decisions of the SHIPPED hooks, and the selector handed to closest() is the shipped literal',
  (i) => {
    const w = makeWorld();
    const r = driveFinal(i.shipped, w);
    return { rows: r.rows, seen: [...new Set(r.seen)], live: w.live() };
  },
  { shipped: SLICE.finalShipped },
  {
    rows: [
      'pointerover armed, a CTA under the pointer: dispatched fired+1',
      'pointerover not armed: dispatched fired+0',
      'pointerover a target with no closest(): dispatched fired+0',
      'pointerover armed, nothing matching: dispatched fired+0',
      'focusin armed, a CTA under the pointer: dispatched fired+1',
      'focusin not armed: dispatched fired+0',
      'focusin a target with no closest(): dispatched fired+0',
      'focusin armed, nothing matching: dispatched fired+0',
    ],
    seen: ['[data-final-cta], .j-final-cta'],
    live: ['document:focusin', 'document:pointerover'],
  },
  'D4 and D5 are gone: they drove `dispose()` and then asserted the chapter could no longer be reached from a document event. There is no dispose(); these two hooks stay on `document` for the life of the page, which is as long as the chapter that installed them lives.');

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
  selfSiteSet('tools/test-global-hooks.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);
L.same('F6', 'D84 — the world this suite installs on the real global is removed again: nothing is left behind',
  ['addEventListener', 'removeEventListener', 'document'].map((k) => typeof globalThis[k]),
  ['undefined', 'undefined', 'undefined']);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a real pin
     (A2) and perturbs a part of that reader's input the reader does not read:
     A2 scans for `.listen(` and journey/backdrop.js is not among its files,
     so adding a whole converted site to a THIRD file's text moves nothing A2
     reports. The registry must score it CANNOT FAIL. */
  const CTL = sweep([
    M('A2', 'D88 NULL CONTROL — a converted site is added to a file A2\'s reader does not scan', null,
      (i) => ({ ...i, backdrop: `${i.backdrop}\nowner.listen(document, 'x', f);\n` })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['A2']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  /* Every body mutant below perturbs SOURCE TEXT, which the reader then
     compiles — never an already-built closure, because inputCanon hashes
     String(fn) and would report the swap as a no-op (D88). D105: every reader
     builds its world from makeWorld() on each call, so no baseline is
     measured over a world a previous call moved. */
  const MUTANTS = [
    M('A1', 'a raw addEventListener comes back into the dial — the conversion reverting', ['subjects'],
      (i) => ({ ...i, dial: mutateText(i.dial, 'A1', '  const qaDial = !!active;',
        "  const qaDial = !!active;\n  addEventListener('blur', () => {});") })),
    M('A2', 'the dial\'s one funnelled site goes raw, so the funnelled set empties — the move that took Final\'s two out of it, applied to the one that stayed', null,
      (i) => ({ ...i, dial: mutateText(i.dial, 'A2', "    owner.listen(globalThis, 'keydown', (e) => {",
        "    globalThis.addEventListener('keydown', (e) => {") })),
    M('A3', 'the dial imports the owner from the path the design says it should live at, which does not exist', [0],
      (i) => ({ ...i, dial: mutateText(i.dial, 'A3', "import { createOwner } from './ui/owner.js';",
        "import { createOwner } from './lifecycle/owner.js';") })),
    M('A4', 'the QA gate is widened so the dial would register on a plain load — J-H19\'s exact forbidden move', ['guard'],
      (i) => ({ ...i, dial: mutateText(i.dial, 'A4', "  if (qaDial && typeof addEventListener === 'function') {",
        "  if (typeof addEventListener === 'function') {") })),
    M('A5', 'Final loses snapLanding — a core key deleted. The member list SHORTENS, so the axis is the shape itself and movedPositions correctly reports null', null,
      (i) => ({ ...i, final: mutateText(i.final, 'A5', '    snapLanding() { amount = amountTarget; },\n', '') })),
    M('B1', 'the QA gate is hard-wired on, so a plain load builds the readout and registers the key', ['afterSet', 'appends', 'creates', 'log', 'registrations'],
      (i) => ({ ...i, dial: mutateText(i.dial, 'B1', '  const qaDial = !!active;', '  const qaDial = true;') })),
    M('B2', 'the dial\'s stylesheet is appended to the body instead of the head, so the construction sequence moves', [2],
      (i) => ({ ...i, dial: mutateText(i.dial, 'B2', '        document.head.appendChild(st);',
        '        document.body.appendChild(st);') })),
    M('B6', 'the modified-chord guard drops meta, ctrl and alt, so browser shortcuts move the dial', [3, 4, 5, 6, 7, 8, 9],
      (i) => ({ ...i, dial: mutateText(i.dial, 'B6', '      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;',
        '      if (e.isComposing) return;') })),
    M('B7', 'the raw sum is persisted instead of the clamped, stepped value', [2, 3],
      (i) => ({ ...i, dial: mutateText(i.dial, 'B7', '      if (persist && qaDial) saveStored(v);',
        '      if (persist && qaDial) saveStored(nv);') })),
    M('C1', 'the compiled slice is no longer the shipped code — its QA path is disabled while the imported module\'s is not', ['logLength', 'logsEqual', 'rowsEqual', 'savedEqual'],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'C1', '  const qaDial = !!active;', '  const qaDial = false;') })),
    M('C2', 'the shipped dial registers a different event type from the one base registered', ['qa'],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'C2', "owner.listen(globalThis, 'keydown', (e) => {",
        "owner.listen(globalThis, 'keyup', (e) => {") })),
    M('C3', 'the shipped increment is doubled, so the key rows stop agreeing with base', [0],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'C3', '      api.set(v + (e.key === keys[1] ? step : -step), { persist: true });',
        '      api.set(v + (e.key === keys[1] ? step * 2 : -step), { persist: true });') })),
    M('C4', 'the shipped dial grows a public member base does not have — the surfaces stop being identical, which is the drift this row now watches in BOTH directions', ['shipped'],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'C4', '  const api = {\n    get value() { return v; },',
        '  const api = {\n    teardown() {},\n    get value() { return v; },') })),
    M('D1', 'the shipped slice takes a FRAGMENT — the anchors drift and half the block is executed as if it were the whole one', [1],
      (i) => ({ ...i, slice: { ...i.slice, shipped: i.slice.shipped.split('\n').slice(0, 5).join('\n') } })),
    M('D2', 'the pointerover hook is installed with capture, so the block stops being byte-identical to base — the reversion becoming approximate rather than exact', ['identical'],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'D2', "  document.addEventListener('pointerover', onOver);",
        "  document.addEventListener('pointerover', onOver, { capture: true });") })),
    M('D3', 'the arming threshold moves, so the delegation fires on a frame it never used to', ['rows'],
      (i) => ({ ...i, shipped: mutateText(i.shipped, 'D3', '    if (amount > 0.5 && e.target.closest && e.target.closest(CTA_SEL)) fireCta();',
        '    if (amount >= 0.5 && e.target.closest && e.target.closest(CTA_SEL)) fireCta();') })),
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
