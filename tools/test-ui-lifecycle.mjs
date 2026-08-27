/* ==================================================================== *
 * tools/test-ui-lifecycle.mjs — order J04b's instrument.
 *
 *   node tools/test-ui-lifecycle.mjs
 *   node tools/test-ui-lifecycle.mjs --prove-failure
 *
 * WHAT THIS SUITE IS FOR, AFTER THE DISPOSAL REMOVAL (2026-08-25)
 * ---------------------------------------------------------------------
 * `journey/ui/owner.js` is no longer a lifecycle primitive. It is a NAMED
 * REGISTRATION FUNNEL: every listener, timer and animation-frame request in
 * `journey/ui.js`, `journey/rail.js`, `journey/dial.js` and the
 * `journey/ui/*` tier modules goes through it, which is what makes the raw
 * registration sites in this subtree countable. THE T ROWS BELOW ARE THAT
 * COUNT, and they are the most valuable thing in this file: `UIL-T1`'s
 * surface census is what caught `journey/ui/sheet-gesture.js`'s four
 * unfunnelled pointer registrations, and `UIL-T2` did the same job for
 * `rail.js`. Neither needs a teardown to work, and neither lost anything.
 *
 * WHAT THIS FILE LOST, so nobody looks for it: the whole disposal half.
 * `dispose()` had no production caller, was removed with the rest of the
 * machinery, and the pins that measured its behaviour went with it — the
 * removal-identity pin, the live-timer and pending-frame cancellations, the
 * child cascade, `alive()`, the generation counter and the early release.
 * The per-suite account is in docs/code-health/DISPOSAL-REMOVED.md.
 *
 * `own()` AND `dispose()` SURVIVE AS RESIDUE for exactly one caller —
 * `journey/chapters/connect/index.js`, which was under a live order and off
 * limits to the removal. UIL-L3/L4/L5/L6/L11 are what still covers them, and
 * they are the rows to delete when Connect's disposer goes.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SUITE IS BLIND TO — read this before believing any number.
 * ---------------------------------------------------------------------
 * 1. `journey/ui.js` and `journey/rail.js` CANNOT BE INSTANTIATED IN NODE.
 *    Both build live DOM at construction (C01 limitations.md §1). So every
 *    claim about them here is TEXTUAL: it is a claim about what the source
 *    says, not about what a browser does with it. The EXECUTED half of this
 *    suite runs journey/ui/owner.js — which has no DOM (D72: prefer a seam
 *    your strongest instrument can see).
 * 2. THE RESIDUE'S ONE CALLER NEVER RUNS. Connect's `dispose()` has no
 *    caller either, so every executed disposal assertion below runs only in
 *    a scenario this file constructs, and D75 applies with full force: each
 *    scenario carries a BRANCH-ENTRY WITNESS.
 * 3. NO BROWSER, NO CAPTURES. "the funnelled listeners still fire in a real
 *    page" is NOT proved here by anything. The argument is structural:
 *    owner.listen(x,t,f,o) calls x.addEventListener(t,f,o) and nothing else,
 *    and owner.timer returns the raw setTimeout id. UIL-L1, UIL-L7 and
 *    UIL-L9 pin those by execution; the rest is the reviewer's.
 *
 * ---------------------------------------------------------------------
 * INSTRUMENT CONTRACT (D74) — the mutant REGISTRY, not a mutant table.
 * ---------------------------------------------------------------------
 * pin() stores an assertion's own READER, its own INPUT and its own EXPECTED
 * literal. A mutant may supply only a perturbed INPUT; the harness drives the
 * registered reader and compares against the registered expected. Five gates
 * fire per mutant: the baseline reproduces the expectation; the perturbation
 * moves the reader's input; it moves the reader's output; the observed moved
 * set equals the declared set; the comparison goes red. A rotted anchor
 * reports BROKEN, never a silent [red] (D70). And the registry IS the D58
 * contract: a pin added later without a mutant fails UIL-X6.
 *
 * D70 is additionally closed by TYPE: every guard throw below is a
 * HarnessFault, and HarnessFault is re-raised OUTSIDE the catch, so a harness
 * failure can never be scored as evidence.
 *
 * D57 / D73: two abort sentinels, one per reporting phase, silent on clean
 * runs. And read this suite's exit code in the command that produced it,
 * joined with && — a sentinel is installed by code that must first parse, so
 * it cannot fire on a syntax error.
 *
 * S-3 / D67: comment stripping is tools/strip-comments.mjs, the single shared
 * character-level implementation. UIL-X3 proves this file is using it and not
 * a re-derived regex.
 * ==================================================================== */

import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { stripComments } from './strip-comments.mjs';
/* QA-06 / D84 — the ledger, the abort sentinel, the harness-fault type and
 * the mutant registry are now the ONE shared implementation of each. This
 * file keeps every reader, every input and every expectation it earned; only
 * the plumbing they travel through moved out. */
import {
  HarnessFault, fault, mutateText, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import {
  literalPredicateRe, literalPredicateHits, maskedToken, selfSiteSet,
  scanTautologyAst, TAUTOLOGY_FIXTURES,
} from './self-controls.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rootFlag = argv.indexOf('--root');
const REPO = rootFlag >= 0 && argv[rootFlag + 1] ? resolve(argv[rootFlag + 1]) : join(HERE, '..');
const SELF = fileURLToPath(import.meta.url);

const P = {
  owner: join(REPO, 'journey/ui/owner.js'),
  media: join(REPO, 'journey/ui/media.js'),
  bands: join(REPO, 'journey/ui/bands.js'),
  ui: join(REPO, 'journey/ui.js'),
  rail: join(REPO, 'journey/rail.js'),
  backdrop: join(REPO, 'journey/backdrop.js'),
};

/* ================================================================== *
 * D70 / D57 / D73 / D74 — all four now come from the shared modules.  *
 *                                                                     *
 * D70: harness faults carry a TYPE and are re-raised outside the catch *
 * (tools/instrument-ledger.mjs). D57/D73: one abort sentinel PER       *
 * REPORTING PHASE, silent on a clean run, loud through a `grep '^FAIL'` *
 * filter — and the exit code is still the only thing that can catch a  *
 * parse failure, because a sentinel is installed by code that parses.  *
 * D74: the registry, its five gates, and the D58 coverage contract.    *
 * ================================================================== */
const PROVE_MODE = argv.includes('--prove-failure');
const SENTINEL = armSentinel('test-ui-lifecycle', ['ledger', 'sweep'],
  (phase) => phase !== 'sweep' || PROVE_MODE);

const LEDGER = createLedger();
const L = LEDGER;
const { REGISTRY, pin, sweep } = createRegistry({ ledger: LEDGER, fault });

/** Faults collected during the sweep, re-raised AFTER the report (D70). */
let HARNESS_FAULTS = [];

/* ================================================================== *
 * Source access, with anchor-miss guards on every transformation.     *
 * ================================================================== */
const read = (p) => readFileSync(p, 'utf8');
const SRC = {
  owner: read(P.owner), media: read(P.media), bands: read(P.bands),
  ui: read(P.ui), rail: read(P.rail), backdrop: read(P.backdrop),
  popoverTier: read('journey/ui/popover-tier.js'),
  cardTier: read('journey/ui/card-tier.js'),
};

/* U03 split the UI's two disclosure state machines into their own vessels.
   The listener/timer census below is a claim about the SUBSYSTEM — "nothing
   here attaches a raw listener or arms a raw timeout" — so it reads the
   surface rather than one address. Narrowing it to journey/ui.js would have
   dropped 25/8 to 17/3 and called a relocation an improvement.

   U06: THE SURFACE IS NOW DISCOVERED, NOT LISTED, AND THAT IS THE FIX.
   U03's hand-written list named four files. `journey/ui/sheet-gesture.js`
   was not one of them and carried FOUR raw `addEventListener` calls;
   `journey/ui/live-region.js` was not one of them and armed a raw
   `setTimeout`. So this pin asserted "zero raw addEventListener sites on the
   UI surface" and was GREEN while five raw sites sat just outside its
   window — and U06's browser probe then measured four listeners surviving
   `destroy()` on the real DOM, in the predecessor tree and this one alike.

   A hand-maintained surface list is the same defect class as a hand-maintained
   count (D120/D144/D154/D169): it is a fact about the code pinned somewhere
   the code cannot reach, so it rots silently. The list is now READ FROM THE
   DIRECTORY, so a new UI module joins the census by existing.

   `owner.js` is excluded and must be: it IS the primitive, so it holds the one
   raw `addEventListener` and the one raw `setTimeout` that every other site
   delegates to. Excluding it is the one honest exception and it is named. */
const UI_SURFACE_FILES = ['journey/ui.js',
  ...readdirSync(new URL('../journey/ui/', import.meta.url))
    .filter((f) => f.endsWith('.js') && f !== 'owner.js')
    .sort()
    .map((f) => `journey/ui/${f}`)];
SRC.uiSurface = UI_SURFACE_FILES.map((f) => read(f)).join('\n');

/** Replace `from` with `to`, or declare a harness fault. Never a silent no-op:
 *  an inert edit reported as a mutation is D70's second demonstrated shape.
 *  QA-06: the ONE implementation, in tools/instrument-ledger.mjs. */
const mutate = mutateText;

/** Code lines only, through the ONE shared stripper (S-3 / D67). */
const code = (src) => stripComments(src);
const countCode = (src, re) => (code(src).match(re) || []).length;

/* ================================================================== *
 * The executed half: journey/ui/owner.js against DOM doubles.         *
 * ================================================================== */
/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite minted ONE staging root and    *
 * removed it never - 1 directory per run, 49 standing on this machine    *
 * when the measurement was taken.                                        *
 *                                                                        *
 * WHY AN EXIT HOOK AND NOT try/finally: the root is created at module    *
 * top level, where there is no enclosing try to attach a finally to -    *
 * and this suite terminates through process.exit(), which does NOT run   *
 * finally blocks.                                                        *
 *                                                                        *
 * Both halves of that are measured rather than assumed. The positive     *
 * control in this order's evidence directory (hygiene-01/control-exit-   *
 * hook.mjs) shows a finally whose try calls process.exit leaking its     *
 * directory, while the exit hook fires on a normal end, on               *
 * process.exit(), AND on an uncaught throw.                              *
 *                                                                        *
 * Removal is best effort by design: a suite must not fail because a temp *
 * tree was already gone.                                                 *
 * ====================================================================== */
const scratch = mkdtempSync(join(tmpdir(), 'j04b-ui-'));
process.on('exit', () => {
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ }
});
const loaded = new Map();
async function loadOwner(src) {
  const key = createHash('sha256').update(src).digest('hex').slice(0, 16);
  if (loaded.has(key)) return loaded.get(key);
  const f = join(scratch, `owner-${key}.mjs`);
  writeFileSync(f, src);
  const mod = await import(pathToFileURL(f).href);
  if (typeof mod.createOwner !== 'function') fault('loaded module exports no createOwner');
  loaded.set(key, mod);
  return mod;
}

/** A DOM double. `removeEventListener` matches on OPTIONS IDENTITY, which is
 *  what makes UIL-L2 a real claim: it proves owner.listen handed the same
 *  object back, not an equal-looking one. */
function target(name, log) {
  return {
    name,
    listeners: [],
    addEventListener(type, fn, opts) {
      log.push(`add:${name}:${type}:${opts === undefined ? 'undef' : String(opts && opts.__tag || opts)}`);
      this.listeners.push({ type, fn, opts });
    },
    removeEventListener(type, fn, opts) {
      const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn && l.opts === opts);
      log.push(`remove:${name}:${type}:${i >= 0 ? 'matched' : 'MISS'}`);
      if (i >= 0) this.listeners.splice(i, 1);
    },
    fire(type, ev) { for (const l of this.listeners.slice()) if (l.type === type) l.fn(ev); },
  };
}

/** A deterministic clock installed on globalThis for the length of one
 *  scenario. Ids start at 1 and are numbers, so a truthiness guard reads the
 *  same thing it reads in a browser. */
function withClock(fn) {
  const saved = {
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
    raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame,
  };
  let next = 1;
  const timers = new Map();
  const frames = new Map();
  globalThis.setTimeout = (f, ms) => { const id = next++; timers.set(id, { f, ms }); return id; };
  globalThis.clearTimeout = (id) => { timers.delete(id); };
  globalThis.requestAnimationFrame = (f) => { const id = next++; frames.set(id, f); return id; };
  globalThis.cancelAnimationFrame = (id) => { frames.delete(id); };
  const clock = {
    get liveTimers() { return [...timers.keys()]; },
    get liveFrames() { return [...frames.keys()]; },
    runTimer(id) { const t = timers.get(id); if (!t) fault(`runTimer(${id}): no such timer`); timers.delete(id); t.f(); },
    runFrame(id, t = 0) { const f = frames.get(id); if (!f) fault(`runFrame(${id}): no such frame`); frames.delete(id); f(t); },
  };
  try { return fn(clock); } finally { Object.assign(globalThis, { setTimeout: saved.setTimeout, clearTimeout: saved.clearTimeout, requestAnimationFrame: saved.raf, cancelAnimationFrame: saved.caf }); }
}

/* Every executed reader takes `{ src, ... }` so a mutant can perturb the
   OWNER'S OWN SOURCE and the harness reloads it. That is D58: falsify with a
   mutant of the shipped subject, not a poison of its double. */
const OWNERS = new Map();      // src -> module, resolved before the sweep
function ownerModuleFor(src) {
  const m = OWNERS.get(src);
  if (!m) fault('owner source variant was not pre-loaded (see PRELOAD)');
  return m;
}

/* ---------------- scenario readers ---------------- */

/** SCENARIO A — listen() attaches to the TARGET it was handed, with the TYPE,
 *  the HANDLER and the OPTIONS OBJECT it was handed, and does nothing else.
 *  Witness: the exact add log plus the handler actually firing, which a
 *  registration that reached the wrong target could not produce. */
const readAttach = ({ src, opts }) => {
  const log = [];
  const { createOwner } = ownerModuleFor(src);
  const a = target('a', log); const b = target('b', log);
  const o = createOwner('t');
  let fired = 0;
  o.listen(a, 'click', () => { fired++; }, opts);
  o.listen(b, 'keydown', () => {}, opts);
  a.fire('click', {});
  return { log: log.join('|'), counts: [a.listeners.length, b.listeners.length], fired };
};

/** SCENARIO B — LIFO. Witness: the drain order, which cannot be produced
 *  without entering the reverse-iteration branch of dispose(). */
const readLifo = ({ src }) => {
  const { createOwner } = ownerModuleFor(src);
  const order = [];
  const o = createOwner('t');
  o.own(() => order.push(1)); o.own(() => order.push(2)); o.own(() => order.push(3));
  o.dispose();
  return order;
};

/** SCENARIO C — a throwing cleanup does not strand its siblings.
 *  BRANCH-ENTRY WITNESS: `caught` is only ever true if the catch inside
 *  dispose()'s loop executed, and `after` can only be non-empty if the loop
 *  continued past it. A digest of "the other cleanups ran" would be stable
 *  and reproducible even if no cleanup ever threw (D75). */
const readThrowingCleanup = ({ src }) => {
  const { createOwner } = ownerModuleFor(src);
  const ran = [];
  let caught = false;
  let escaped = false;
  const err = console.error;
  console.error = (...a) => { if (String(a[0]).includes('cleanup threw')) caught = true; };
  try {
    const o = createOwner('t');
    o.own(() => ran.push('first'));            // drained LAST
    o.own(() => { throw new Error('boom'); });
    o.own(() => ran.push('third'));            // drained FIRST
    try { o.dispose(); } catch { escaped = true; }
    return { caught, escaped, ran: ran.join(','), pending: o.pending, disposed: o.disposed };
  } finally { console.error = err; }
};

/** SCENARIO D — dispose is idempotent, and the SECOND call drains nothing.
 *  BRANCH-ENTRY WITNESS: `secondDrain` is the count of cleanups that ran on
 *  the second call. A test that only asserted "no throw" would pass on an
 *  implementation that drained twice. */
const readDisposeTwice = ({ src }) => {
  const { createOwner } = ownerModuleFor(src);
  let runs = 0;
  let reentrantRan = 0;
  const o = createOwner('t');
  o.own(() => { runs++; });
  // The §4.1 re-entrancy case: a cleanup that registers MORE work while the
  // drain is running. `disposed` is set FIRST, so own() takes its
  // already-disposed arm and runs the new work immediately. If `disposed`
  // were set after the loop, this would push onto an array the downward loop
  // has already passed and the work would be stranded — silently.
  o.own(() => { o.own(() => { reentrantRan++; }); });
  o.dispose();
  const firstDrain = runs;
  o.dispose();
  return { firstDrain, secondDrain: runs - firstDrain, reentrantRan, disposed: o.disposed };
};

/** SCENARIO E — own() on an ALREADY-DISPOSED owner (RESIDUE).
 *  BRANCH-ENTRY WITNESS: `immediate` proves the `if (disposed)` arm of own()
 *  ran; `laterDrain` proves the work was not ALSO queued and re-run. */
const readPostDisposeOwn = ({ src }) => {
  const { createOwner } = ownerModuleFor(src);
  const o = createOwner('t');
  let ran = 0;
  o.dispose();
  o.own(() => { ran++; });
  const immediate = ran === 1;
  o.dispose();
  return { immediate, laterDrain: ran - 1 };
};

/** SCENARIO F — timer() returns the RAW id, not a release function
 *  (lifecycle.md §2.1: `if (popHideTimer)` must keep its meaning).
 *  BRANCH-ENTRY WITNESS: `firedThenPending` is the cleanup census AFTER the
 *  timer fired, which can only be 0 if the fire path called release() and
 *  release() spliced. That is the property that keeps a per-frame timer site
 *  from growing `cleanups` without bound. */
const readTimerId = ({ src }) => withClock((clock) => {
  const { createOwner } = ownerModuleFor(src);
  const o = createOwner('t');
  let ran = 0;
  const id = o.timer(() => { ran++; }, 90);
  const armed = { type: typeof id, truthy: !!id, live: clock.liveTimers.length };
  // Fire by whatever the CLOCK holds, not by the returned value: a mutant that
  // makes timer() return something else must move `type`/`isFunction`, not
  // blow the harness up (D70 — a guard firing is not evidence).
  const pending = clock.liveTimers;
  if (pending.length) clock.runTimer(pending[0]);
  return { ...armed, ran, isFunction: typeof id === 'function' };
});

/** SCENARIO H — raf() is the same shape: the RAW request id, and the callback
 *  reached by the clock. */
const readRaf = ({ src }) => withClock((clock) => {
  const { createOwner } = ownerModuleFor(src);
  const o = createOwner('t');
  let ran = 0;
  const id = o.raf(() => { ran++; });
  const armed = { type: typeof id, truthy: !!id, live: clock.liveFrames.length };
  const o2 = createOwner('u');
  const id2 = o2.raf(() => { ran++; });
  // Fire by whatever the CLOCK holds, never by the returned value — a mutant
  // that stops returning the raw id must move `type`/`sameId`, not blow the
  // harness up (D70).
  const live = clock.liveFrames;
  if (live.length) clock.runFrame(live[live.length - 1]);
  return { ...armed, ran, sameId: id === id2, isFunction: typeof id === 'function' };
});

/** SCENARIO J — two owners share no cleanup array, and a child is an
 *  INDEPENDENT owner that merely inherits a name prefix (lifecycle.md pin
 *  L-I6, what is left of it). BRANCH-ENTRY WITNESS: `aRan` must be 1 — the
 *  root's own cleanup ran and the child's did not — and `bRan` must be 0. A
 *  shared array would drain all four. */
const readIsolation = ({ src }) => {
  const { createOwner } = ownerModuleFor(src);
  const A = createOwner('A'); const B = createOwner('B');
  let aRan = 0; let bRan = 0;
  A.own(() => { aRan++; });
  A.child('x').own(() => { aRan++; });   // NOT drained by A — child() is naming only
  B.own(() => { bRan++; }); B.own(() => { bRan++; });
  A.dispose();
  return { aRan, bRan, names: [A.child('x').name, B.child('y').name] };
};

/* ================================================================== *
 * Textual readers over the three production files.                    *
 * ================================================================== */
const RE = {
  /* THE DOT IS LOAD-BEARING (U06). `\baddEventListener\s*\(` also matches a
     METHOD DEFINITION, and the moment the surface became directory-discovered
     it swept up `journey/ui/media.js:52` — `{ matches: false,
     addEventListener() {}, removeEventListener() {} }`, the inert stand-in for
     a platform with no `matchMedia`. That is a definition of a no-op, not a
     registration, and counting it as a raw listener site would have made this
     pin red for a stub that attaches nothing to anything.
     A registration always has a receiver; requiring one is exact, and both
     other consumers of these two patterns (`journey/backdrop.js`'s deliberate
     4/4 balance) call them on `backdrop`. */
  addListener: /\.addEventListener\s*\(/g,
  removeListener: /\.removeEventListener\s*\(/g,
  setTimeout: /\bsetTimeout\s*\(/g,
  raf: /\brequestAnimationFrame\s*\(/g,
  ownerListen: /\b\w*[Oo]wner\.listen\s*\(/g,
  ownerTimer: /\b\w*[Oo]wner\.timer\s*\(/g,
  ownerRaf: /\b\w*[Oo]wner\.raf\s*\(/g,
  // VERBATIM from tools/test-frame-order.mjs:294. The negative lookahead is
  // load-bearing and this instrument shipped without it for one run: rail.js's
  // `if (root.inert === want)` at :1881 counted as a fifth WRITER and reddened
  // UIL-T5 against healthy source. A pin that disagrees with the pin it claims
  // to mirror is worse than no pin.
  inertWrite: /root\.inert\s*=(?!=)/g,
};

const readSiteCensus = ({ src }) => [
  countCode(src, RE.addListener),
  countCode(src, RE.ownerListen),
  countCode(src, RE.setTimeout),
  countCode(src, RE.ownerTimer),
];

const readRailRaf = ({ src }) => [countCode(src, RE.raf), countCode(src, RE.ownerRaf)];

const readBackdrop = ({ src }) => [countCode(src, RE.addListener), countCode(src, RE.removeListener)];

/** DEF-01's frozen shape (design.md J-H17, test-frame-order.mjs S4). */
function bodyOf(src, name) {
  const at = src.indexOf(`function ${name}(`);
  if (at === -1) fault(`bodyOf: no declaration for ${name}`);
  let i = src.indexOf('{', at); if (i === -1) fault(`bodyOf: no body for ${name}`);
  let d = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  return fault(`bodyOf: unbalanced body for ${name}`);
}
const readInertWriters = ({ src }) => {
  const c = code(src);
  return [countCode(src, RE.inertWrite), (bodyOf(c, 'releaseModal').match(RE.inertWrite) || []).length];
};

/** bodyOf() finds a body by searching `function <name>(`; C01 §1a records that
 *  an arrow conversion makes it THROW, taking S2 and S4 down with it. These
 *  five must stay declarations. */
/* The four functions test-frame-order.mjs's bodyOf() extracts, each named
   with the file it now lives in: U03 moved the card's half into its vessel,
   and a pin that kept looking in journey/ui.js would have gone quietly
   unsatisfiable rather than red. */
const DECLS = [['ui', 'update'], ['ui', 'closeCard'],
  ['cardTier', 'releaseRailAfterDetail'], ['cardTier', 'syncRailVisibility']];
const readDeclarations = ({ uiSrc, railSrc, cardTierSrc }) => [
  ...DECLS.map(([where, n]) =>
    code(where === 'ui' ? uiSrc : cardTierSrc).includes(`function ${n}(`)),
  code(railSrc).includes('function releaseModal('),
  code(railSrc).includes('function update('),
  /\breleaseModal,/.test(code(railSrc)),
];

/** J-H12 — the two Escape handlers' PHASE establishes modal priority: the
 *  rail's is CAPTURE, the card's is BUBBLE. J04b did not hoist either (an
 *  owner.listen closure holds the reference itself, so hoisting is not needed
 *  for removability — lifecycle.md §6.1 is wrong about that), so the only
 *  thing that could have moved is the options argument. */
const readEscapePhases = ({ uiSrc, railSrc }) => [
  /globalOwner\.listen\(document, 'keydown', \(e\) => \{[\s\S]*?\}, true\);/.test(code(railSrc)),
  /owner\.listen\(document, 'keydown', \(e\) => \{/.test(code(uiSrc)),
  code(uiSrc).includes("owner.listen(document, 'keydown', (e) => {\n    if (e.key !== 'Escape') return;"),
];

/* ================================================================== *
 * PRELOAD — every owner-source variant a mutant will need, resolved   *
 * before the sweep, because `import()` is async and the registry's    *
 * readers are synchronous by contract.                                *
 * ================================================================== */
const OWNER_VARIANTS = {
  base: SRC.owner,
  wrongOpts: mutate(SRC.owner, 'v-wrongOpts',
    'listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); },',
    'listen(target, type, fn) { target.addEventListener(type, fn); },'),
  fifo: mutate(SRC.owner, 'v-fifo',
    'for (let i = cleanups.length - 1; i >= 0; i--) {',
    'for (let i = 0; i < cleanups.length; i++) {'),
  noCatch: mutate(SRC.owner, 'v-noCatch',
    '        try { cleanups[i](); }\n        catch (err) {\n          console.error(`[lifecycle] \'${name}\' cleanup threw; disposal continues:`, err);\n        }',
    '        cleanups[i]();'),
  // `disposed` moves from BEFORE the drain to after it — lifecycle.md §4.1's
  // exact ordering requirement. Everything else is untouched, so the only
  // reading that can move is the re-entrant registration's.
  disposedLast: mutate(
    mutate(SRC.owner, 'v-disposedLast-a',
      '      if (disposed) return;\n      disposed = true;\n      for (let i = cleanups.length - 1;',
      '      if (disposed) return;\n      for (let i = cleanups.length - 1;'),
    'v-disposedLast-b', '      cleanups.length = 0;\n    },', '      disposed = true;\n      cleanups.length = 0;\n    },'),
  ownIgnoresDisposed: mutate(SRC.owner, 'v-ownIgnores',
    'own(fn) { if (disposed) fn(); else cleanups.push(fn); },',
    'own(fn) { cleanups.push(fn); },'),
  timerReturnsFn: mutate(SRC.owner, 'v-timerFn',
    'timer(fn, ms) { return setTimeout(fn, ms); },',
    'timer(fn, ms) { const id = setTimeout(fn, ms); return () => clearTimeout(id); },'),
  // Returns a STRING rather than a function, so the mutant moves `type` and
  // `isFunction` without handing the clock something it cannot run (D70 — a
  // harness fault is not evidence). The property under test is "the raw id
  // comes back", and any non-id return falsifies it.
  rafReturnsTag: mutate(SRC.owner, 'v-rafTag',
    'raf(fn) { return requestAnimationFrame(fn); },',
    'raf(fn) { requestAnimationFrame(fn); return \'armed\'; },'),
  sharedCleanups: mutate(
    mutate(SRC.owner, 'v-shared-a', 'export function createOwner(name) {', 'let _sharedForTest = null;\nexport function createOwner(name) {'),
    'v-shared-b', '  const cleanups = [];', '  const cleanups = (_sharedForTest ||= []);'),
};
for (const [, src] of Object.entries(OWNER_VARIANTS)) OWNERS.set(src, await loadOwner(src));

/* ================================================================== *
 * THE ASSERTIONS.                                                     *
 * ================================================================== */
console.log('\nJ04b — tools/test-ui-lifecycle.mjs');
console.log(`repo: ${REPO}`);

console.log('\nL — the funnel, EXECUTED (journey/ui/owner.js, real module, DOM doubles)');

pin('UIL-L1', 'listen() attaches to the given target, with the given type, handler and options OBJECT — and the handler fires',
  readAttach, { src: SRC.owner, opts: { __tag: 'OPT', capture: true } },
  { log: 'add:a:click:OPT|add:b:keydown:OPT', counts: [1, 1], fired: 1 },
  'THE OPTIONS OBJECT IS PART OF THE CLAIM: a funnel that dropped `opts` would silently move every capture-phase registration in journey/ui.js and journey/rail.js to the bubble phase — J-H12 is exactly that hazard, and UIL-T7 reads it textually while this row runs it.');

/* L3-L6 and L11 cover own()/dispose(), which are RESIDUE — see this file's
   header. They exist for journey/chapters/connect/index.js and for nothing
   else, and no production caller reaches them. Delete these five rows on the
   day Connect's disposer goes. */
pin('UIL-L3', 'RESIDUE — cleanups drain LIFO, reverse registration order',
  readLifo, { src: SRC.owner }, [3, 2, 1]);

pin('UIL-L4', 'RESIDUE — a throwing cleanup is caught, logged, and its SIBLINGS still run',
  readThrowingCleanup, { src: SRC.owner },
  { caught: true, escaped: false, ran: 'third,first' });

pin('UIL-L5', 'RESIDUE — dispose() is idempotent, and the second call drains NOTHING',
  readDisposeTwice, { src: SRC.owner },
  { firstDrain: 1, secondDrain: 0, reentrantRan: 1 },
  'reentrantRan===1 is the branch-entry witness: it can only be 1 if `disposed` was set BEFORE the drain (D75)');

pin('UIL-L6', 'RESIDUE — own() on an already-disposed owner runs fn immediately and does not also queue it',
  readPostDisposeOwn, { src: SRC.owner }, { immediate: true, laterDrain: 0 });

pin('UIL-L7', 'timer() returns the RAW setTimeout id — truthy, a number, not a function — and the callback runs',
  readTimerId, { src: SRC.owner },
  { type: 'number', truthy: true, live: 1, ran: 1, isFunction: false },
  "lifecycle.md §2.1's hazard, and it survives the removal intact: journey/ui.js stores timer ids in eight places and truthiness-tests the stored id in several (`if (popHideTimer) …`), so a release function — always truthy — would change those guards' meaning.");

pin('UIL-L9', 'raf() returns the raw request id, one per call, and the callback runs',
  readRaf, { src: SRC.owner },
  { type: 'number', truthy: true, live: 1, ran: 1, sameId: false, isFunction: false });

pin('UIL-L11', 'RESIDUE — two owners share no cleanup array, and a child is INDEPENDENT: it takes its parent\'s name and nothing else',
  readIsolation, { src: SRC.owner }, { aRan: 1, bRan: 0, names: ['A/x', 'B/y'] },
  'aRan===1 rather than 2 is the point: child() used to register `own(() => c.dispose())` on its parent, so a parent drain cascaded into every child. It does not any more — the cascade was teardown and went with the teardown. A child owner is now a NAME, and code that expects the cascade is wrong.');

console.log('\nT — the funnelled surfaces, TEXTUAL (they cannot be built in node — see "blind to")');

/* U06 MOVED BOTH POSITIVE LITERALS, AND BOTH MOVES ARE REAL WORK, NOT DRIFT.
   25 -> 29 owner.listen: the surface gained `sheet-gesture.js`'s four grip
   registrations, which were raw `addEventListener` calls outside the old
   four-file window and survived `destroy()` on the real DOM.
   8 -> 10 owner.timer: `sheet-gesture.js`'s release timer and
   `live-region.js`'s announcement debounce, both previously raw `setTimeout`.
   The two zeros are unchanged and are now asserted over a surface that can
   actually see the whole subsystem. */
/* 29 -> 30 owner.listen, navigation restage (2026-08-26). The added site is
   ui.js's in-journey action interception — a copy-block action whose href is
   a `#/<chapter>` deep link (the Epilogue's Ownership button) diverts its
   same-document click through the journey's own nav handle. Registered
   through `owner.listen` like the rest, so both zeros hold. */
pin('UIL-T1', 'the UI surface: zero raw addEventListener sites, 30 owner.listen; zero raw setTimeout, 10 owner.timer',
  readSiteCensus, { src: SRC.uiSurface }, [0, 30, 0, 10],
  'the 30 and the 10 are POSITIVE literals, not a zero over a discovered set (qa-01 Engine 3)');

/* 19 -> 20 owner.listen, DEFECT-01 (2026-08-23). The added site is the rail's
   own `mobileRail` media-query `change` subscription — the owner of the
   mobile/desktop crossing that used to have none, which is what left the dock's
   inline styles and the hover-open state stranded on a scale-down. It is
   registered through `owner.listen` like the other nineteen, so it is drained
   by destroy() and the ZERO on either side of it — the numbers this pin
   actually defends — is unchanged. Re-baselined by counting, not by reading:
   the suite reported [0,20,0,6] and the delta is the one site added here. */
/* 20 -> 21 owner.listen and 6 -> 7 owner.timer, navigation restage
   (2026-08-26). The added pair is the Equip placeholder's touch answer: a
   `pointerdown` listener on the one non-navigating row item and the timed
   removal of its "Coming soon" flash. Both funnelled; both zeros hold. */
pin('UIL-T2', 'journey/rail.js: zero raw addEventListener sites, 21 owner.listen; zero raw setTimeout, 7 owner.timer',
  readSiteCensus, { src: SRC.rail }, [0, 21, 0, 7]);

pin('UIL-T3', 'journey/rail.js: both requestAnimationFrame sites went through owner.raf',
  readRailRaf, { src: SRC.rail }, [0, 2]);

pin('UIL-T4', 'journey/backdrop.js is UNCONVERTED and still balanced 4/4 — M7 pins all four removals by text',
  readBackdrop, { src: SRC.backdrop }, [4, 4]);

pin('UIL-T5', 'DEF-01 preserved: root.inert has exactly 4 writers in rail.js and exactly 1 in releaseModal (J-H17)',
  readInertWriters, { src: SRC.rail }, [4, 1],
  'test-frame-order.mjs S4 pins the same two numbers; J04b must not move either');

pin('UIL-T6', "the five functions test-frame-order.mjs's bodyOf() extracts are still DECLARATIONS, and releaseModal is still exported by shorthand",
  readDeclarations, { uiSrc: SRC.ui, railSrc: SRC.rail, cardTierSrc: SRC.cardTier },
  [true, true, true, true, true, true, true]);

pin('UIL-T7', "the two Escape handlers keep their phases — rail CAPTURE, card BUBBLE (J-H12)",
  readEscapePhases, { uiSrc: SRC.ui, railSrc: SRC.rail }, [true, true, true]);

/* UIL-T8 / T9 / T10 / T10b / T11 ARE GONE, and their subjects with them.
   T8 read `destroy()`'s body in both files; T9 read the conditional rail
   child; T10 and T10b were the no-production-caller census over the whole of
   journey/ — the rows that said, in machine form, "nothing calls this."
   Nothing calls it because it no longer exists. The property T9 defended —
   that a page-built rail is never torn down by the UI that borrowed it — is
   now structural: journey/ui.js has no teardown to reach it with. See
   docs/code-health/DISPOSAL-REMOVED.md. */

console.log('\nX — controls over this suite itself');

/* D76 — a self-scanning site set MUST mask its own token, or every pinned row
   is itself an occurrence. A01a-2 measured a census doubling 50 -> 100 for
   exactly this. The token is assembled so this file's own rows are not hits. */
const PIN_TOKEN = maskedToken('p' + 'in(');
const selfCode = code(read(SELF));
const PIN_SITE_RE = /^\s*(?:const\s+\w+\s*=\s*)?pin\(/;
const selfPinSites = selfSiteSet('tools/test-ui-lifecycle.mjs', read(SELF), PIN_SITE_RE,
  PIN_TOKEN.whole, { blankStrings: false }).length;
L.same('UIL-X1', `D76 — the self-scan masks its own token (${PIN_TOKEN.whole.length} chars, assembled)`,
  selfCode.includes(`'p' + 'in('`), true);
L.same('UIL-X2', 'D76 — pin() call sites counted in this file equal the registry size',
  selfPinSites, REGISTRY.size);

/* S-3 / D67 — this suite must be using the ONE shared stripper. */
L.same('UIL-X3', 'S-3 — comment stripping is tools/strip-comments.mjs, not a re-derived regex',
  read(SELF).includes("import { stripComments } from './strip-comments.mjs';"), true);
L.same('UIL-X4', 'S-3 — control: a `//` inside a string constant is NOT blanked',
  code("const s = 'http://x'; addEventListener('a');").includes('addEventListener'), true);
L.same('UIL-X4b', 'S-3 — control: a real line comment IS blanked',
  code("// addEventListener('a');").includes('addEventListener'), false);
L.same('UIL-X4c', 'the stripper is length- and line-preserving (offsets and line numbers hold)',
  [code(SRC.ui).length === SRC.ui.length, code(SRC.ui).split('\n').length === SRC.ui.split('\n').length],
  [true, true]);

/* D44 — no assertion in this file may be a bare literal predicate.
 * QA-06: the ONE scan (tools/self-controls.mjs), built for THIS suite's own
 * ledger shape — two labels before the predicate. D59 is exactly this
 * parameter: a receiver-agnostic widening reddened four healthy suites
 * because it assumed a different arity. */
const LITERAL_RE = literalPredicateRe(['L.same', 'pin'], 2);
const literalHits = literalPredicateHits(read(SELF), LITERAL_RE).hits;
L.same('UIL-X5', 'D44 — bare-literal-predicate assertions in this suite', literalHits.length, 0,
  literalHits.length ? literalHits.join('\n        ') : null);

/* D86 — the shape a regex cannot reach. `HRING110` shipped unfalsifiable in a
   gated suite because its predicate was a CALL, and every pattern above looks
   for a bare literal or a self-identity between identifiers. The AST pass in
   tools/self-controls.mjs reaches arbitrary expressions instead; the residual
   limit — a tautology knowable only by EVALUATING — is stated there and is not
   closed by anything. */
/* QA-08 / D88: `pin` was declared with the ADJACENT actual/expected arity,
   which pin(id, what, reader, input, expected) does not have — T2 compared a
   reader against an input and no registry-pinned assertion in this suite was
   T2-scanned at all. PIN_RECEIVER is the registry's own statement of its
   signature; a numeric declaration for `pin` is now REFUSED. */
const AST_RECEIVERS = new Map([['L.same', 2], ['pin', PIN_RECEIVER]]);
const tauFixtureMisses = TAUTOLOGY_FIXTURES
  .filter(([, , snippet, want]) => scanTautologyAst(snippet, AST_RECEIVERS).hits.length !== want)
  .map(([id]) => id);
L.same('UIL-X5b', 'D46 — every D86 fixture row returns the hit count it was built for (the reader for X5c\'s zero)',
  tauFixtureMisses, []);
const tau = scanTautologyAst(read(SELF), AST_RECEIVERS);
L.same('UIL-X5c', 'D86 — syntactic tautologies in this suite', tau.hits.length, 0,
  tau.hits.length ? tau.hits.join('\n        ') : null);
/* D85's hazard, and it is this order's own: a consolidation that changes a
   call shape RETIRES the scans that key on the old one, silently, because an
   assert-zero scan that reaches nothing returns the passing answer. So the
   reach is pinned by AGREEMENT BETWEEN TWO INDEPENDENT READERS — the AST walk
   and the comment-stripped site set — rather than against a hand-typed number
   that a maintainer could bump. Convert a call site to a shape either reader
   misses and this goes red immediately. */
const selfSameSites = selfSiteSet('tools/test-ui-lifecycle.mjs', read(SELF),
  /^\s*L\.same\(/, null, { blankStrings: false }).length;
L.same('UIL-X5d', 'D85 — the AST scan reaches every assertion call site the text scan sees (two readers, no literal)',
  tau.sites, selfPinSites + selfSameSites);

/* ================================================================== *
 * --prove-failure — the D74 registry sweep.                           *
 * ================================================================== */
if (PROVE_MODE) {
  console.log('\n--prove-failure — every registered pin, driven red by a mutant of its own subject');

  /* M() is the shared mutant declaration (tools/mutant-registry.mjs). */
  const V = (k) => { const s = OWNER_VARIANTS[k]; if (!s) fault(`no owner variant ${k}`); return s; };

  const MUTANTS = [
    M('UIL-L1', 'listen() drops the options object, so every capture-phase registration silently becomes bubble-phase', ['log'],
      (i) => ({ ...i, src: V('wrongOpts') })),
    M('UIL-L3', 'the drain becomes FIFO', [0, 2], (i) => ({ ...i, src: V('fifo') })),
    M('UIL-L4', 'the per-cleanup catch is removed, so one throwing cleanup strands its siblings', ['caught', 'escaped', 'ran'],
      (i) => ({ ...i, src: V('noCatch') })),
    M('UIL-L5', '`disposed` moves to AFTER the drain, stranding a re-entrant registration (lifecycle.md §4.1)', ['reentrantRan'],
      (i) => ({ ...i, src: V('disposedLast') })),
    M('UIL-L6', 'own() stops running fn immediately on a disposed owner, so the work is queued into an array nothing will drain again', ['immediate', 'laterDrain'],
      (i) => ({ ...i, src: V('ownIgnoresDisposed') })),
    M('UIL-L7', "timer() returns a FUNCTION instead of the id — lifecycle.md §2.1's exact hazard: `if (popHideTimer)` would enter a branch it skips today",
      ['isFunction', 'type'], (i) => ({ ...i, src: V('timerReturnsFn') })),
    M('UIL-L9', 'raf() stops returning the raw request id', ['sameId', 'type'],
      (i) => ({ ...i, src: V('rafReturnsTag') })),
    M('UIL-L11', 'the cleanup array becomes module-scoped, so two owners share it', ['aRan', 'bRan'],
      (i) => ({ ...i, src: V('sharedCleanups') })),

    M('UIL-T1', 'one funnelled site on the UI surface reverts to a raw addEventListener', [0, 1],
      (i) => ({ src: mutate(i.src, 'm', "owner.listen(pop, 'animationend'", "pop.addEventListener('animationend'") })),
    M('UIL-T2', 'one funnelled rail.js timer reverts to a raw setTimeout', [2, 3],
      (i) => ({ src: mutate(i.src, 'm', 'hotTimer = hoverOwner.timer(', 'hotTimer = setTimeout(') })),
    M('UIL-T3', 'one rail rAF reverts to a raw requestAnimationFrame', [0, 1],
      (i) => ({ src: mutate(i.src, 'm', '      owner.raf(() => root.classList.remove', '      requestAnimationFrame(() => root.classList.remove') })),
    M('UIL-T4', 'backdrop.js loses one of its four teardown sites', [1],
      (i) => ({ src: mutate(i.src, 'm', "    backdrop.removeEventListener('pointercancel', clear);\n", '') })),
    M('UIL-T5', 'a fifth root.inert writer appears in rail.js — J-H17, the re-centralisation', [0],
      (i) => ({ src: mutate(i.src, 'm', '  function releaseModal(', '  function _extraInertWriter() { root.inert = false; }\n  function releaseModal(') })),
    M('UIL-T6', "ui.update() becomes an arrow, which makes test-frame-order's bodyOf() throw", [0],
      (i) => ({ ...i, uiSrc: mutate(i.uiSrc, 'm', '  function update(p, chapterId, camera, dt = 0,', '  const update = (p, chapterId, camera, dt = 0,') })),
    M('UIL-T7', "the rail's Escape handler loses its CAPTURE phase", [0],
      (i) => ({ ...i, railSrc: mutate(i.railSrc, 'm', "    if (!keptOpen() && (touchOpen || hotOpen)) {\n      e.preventDefault();\n      collapse();\n    }\n  }, true);", "    if (!keptOpen() && (touchOpen || hotOpen)) {\n      e.preventDefault();\n      collapse();\n    }\n  });") })),
  ];

  /* D74 gate (4)'s subject. J04b EXTENDED H02's implementation here: H02's
     version returned null for anything that was not a same-length array, so
     every object-shaped reader fell through to `movedIndices: null` and gate
     (4) went UNCHECKED for it — which is most of this suite's executed half.
     QA-06 promoted that extension into the shared `movedPositions`, so this
     suite no longer carries its own copy and no other suite has to re-derive
     it. Plain objects with an identical key set yield the moved KEY NAMES,
     so a mutant here declares `['ran','escaped']` and is held to it. */

  const R = sweep(MUTANTS);
  HARNESS_FAULTS = R.faults;

  L.same('UIL-X6a', 'D50 — mutants exercised', R.total, 15);
  L.same('UIL-X6b', 'D50 — every mutant drove the assertion it names, on the axis it declared', R.bad, 0);
  L.same('UIL-X6e', 'D70 — harness faults during the sweep (each is re-raised after the report, never scored)',
    R.faults, []);
  L.same('UIL-X6c', 'D58 — registered pins carrying no mutant', R.uncovered, []);
  L.same('UIL-X6d', 'D58 — registered pins total (every one mutated: UIL-X6c)', REGISTRY.size, 15);
  SENTINEL.reach('sweep');
}

/* ================================================================== */
const EXIT = LEDGER.report();
SENTINEL.reach('ledger');
// D70 — the re-raise, OUTSIDE the catch that recorded it and AFTER the
// report, so the fault is both visible in the ledger (UIL-X6e) and fatal.
// A harness failure can never be read as evidence about the subject.
if (HARNESS_FAULTS.length) throw new HarnessFault(`harness fault(s) during the sweep: ${HARNESS_FAULTS.join('; ')}`);
process.exit(EXIT);
