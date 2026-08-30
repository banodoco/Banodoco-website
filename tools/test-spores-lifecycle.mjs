// R03 — organism/spores.js lifecycle: registerDrift()'s listeners and its
// 'spore-drift' animator get one named owner (dispose()) and idempotent
// teardown. Run with: node tools/test-spores-lifecycle.mjs
// Prove every comparison below can actually fail: node tools/test-spores-lifecycle.mjs --prove-failure
//
// Method, mirroring R01's tools/test-animation-lifecycle.mjs and R02's
// tools/test-intro-lifecycle.mjs: load the pre-change implementation
// (`git show <RUN_START_SHA>:organism/spores.js`, this run's starting
// point) and the current working-tree implementation into their own temp
// copies OUTSIDE the repo, rewriting only the `three` and `../flags.js`
// specifiers so they resolve in plain Node, and drive both with identical
// injected `addEventListener`/`document`/`innerWidth`/`innerHeight` doubles
// and an animator registry that mirrors organism/animation.js's accepted
// (R01) addAnimator contract verbatim. No browser, no jsdom.
//
// SECTIONS
//   1  construction + shedSpores() + drift-integrator identity (HEAD vs
//      current), with a positive control proving the comparator can fail
//   2  attach/detach parity (current only)
//   3  idempotence — double dispose, dispose-before-start, dispose-during-
//      a-frame (both directions), registerDrift() after dispose
//   4  no post-dispose mutation — the C04 tickSwap defect class, with an
//      inline positive control (ticking DOES move positions pre-dispose)
//   5  two-instance isolation, via a B-alone control vs B-after-A-disposed
//      comparison sharing one module namespace and one animator registry
//      (the realistic shape: organism/animation.js is a page-level
//      singleton in production)
//   --prove-failure  runs every check above again against ten targeted
//      mutants of the CURRENT source (string substitution with an
//      anchor-miss guard, per docs/code-health/evidence/2026-08-21-elegance-run-01/qa-01/patterns.md)
//      and confirms each check that should catch that mutant's break
//      actually does — exits 1 if any comparison cannot be made to fail.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../vendor/three/three.module.js';
import { SCAN_FIXTURES, scanLiteralPredicateText } from './self-controls.mjs';
import { armSentinel } from './instrument-ledger.mjs';

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite staged into a fresh            *
 * os.tmpdir() directory per module load - 3 per run - and removed none   *
 * of them.                                                               *
 *                                                                        *
 * The per-load directories are now minted INSIDE a single root, so one   *
 * removal reclaims all of them however many loads ran.                   *
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
const STAGE_ROOT = mkdtempSync(join(tmpdir(), 'r03-spores-'));
process.on('exit', () => {
  try { rmSync(STAGE_ROOT, { recursive: true, force: true }); } catch { /* best effort */ }
});

/* D57/D73 — the abort sentinel. QA-07: this suite shipped with NONE, so a
 * crash in it was byte-identical to a clean pass under `grep '^FAIL'`. One
 * shared implementation (tools/instrument-ledger.mjs), not a fourteenth local
 * one. TWO phases, because the ledger reports before the sweep runs: D57's
 * own addendum is that a crash AFTER the ledger but BEFORE the sweep leaves a
 * log whose last line is a reassuring total. A phase never REQUESTED stays
 * silent. It does NOT replace reading the exit code in the producing command
 * — a sentinel is installed by code that must first parse (D73). */
const SENT = armSentinel('test-spores-lifecycle',
  ['ledger', ...(process.argv.includes('--prove-failure') ? ['prove'] : [])]);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const THREE_URL = pathToFileURL(join(REPO_ROOT, 'vendor/three/three.module.js')).href;
const FLAGS_URL = pathToFileURL(join(REPO_ROOT, 'flags.js')).href;
const INSPIRE_EXITS_URL = pathToFileURL(join(REPO_ROOT, 'inspire-exits.js')).href;
const SPORES_PATH = join(REPO_ROOT, 'organism/spores.js');

// This run's starting commit, pinned explicitly — see R01's
// tools/test-animation-lifecycle.mjs for why `HEAD` (a moving ref) is
// wrong here: the moment this order's own edits are committed, `HEAD`
// would advance past the pre-change file and BASELINE_SOURCE would
// silently become byte-identical to CURRENT_SOURCE.
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

/* ------------------------------------------------------------------ *
 * Minimal self-contained ledger — no dependency on other orders' test *
 * infrastructure.                                                     *
 * ------------------------------------------------------------------ */
function createLedger(title) {
  const rows = [];
  return {
    check(name, pass, detail) {
      rows.push({ name, pass: !!pass, detail });
      return !!pass;
    },
    same(name, value, expected, detail) {
      const a = JSON.stringify(value);
      const b = JSON.stringify(expected);
      const pass = a === b;
      rows.push({ name, pass, detail: detail !== undefined ? detail : { got: a, expected: b } });
      return pass;
    },
    report() {
      let failed = 0;
      for (const row of rows) {
        const mark = row.pass ? 'PASS' : 'FAIL';
        if (!row.pass) failed++;
        console.log(`[${mark}] ${title} — ${row.name}`);
        if (!row.pass) console.log('       ', row.detail);
      }
      console.log(`${title}: ${rows.length - failed}/${rows.length} passed`);
      return failed;
    },
  };
}

const L = createLedger('spores lifecycle');

/* ------------------------------------------------------------------ *
 * Anchor-checked string substitution — QA-01's rule: a substitution   *
 * that does not match, or would be a no-op, throws rather than        *
 * silently producing a mutant identical to the original.              *
 * ------------------------------------------------------------------ */
function mutate(source, label, edits) {
  let out = source;
  for (const [from, to, expectedCount = 1] of edits) {
    const count = out.split(from).length - 1;
    if (count !== expectedCount) {
      throw new Error(
        `mutant '${label}': anchor mismatch — expected ${expectedCount} occurrence(s) of\n  ${JSON.stringify(from)}\nfound ${count}. The source moved; update the anchor.`
      );
    }
    if (from === to) throw new Error(`mutant '${label}': edit is a no-op (from === to)`);
    out = out.split(from).join(to);
  }
  if (out === source) throw new Error(`mutant '${label}': produced byte-identical output — not a mutant`);
  return out;
}

/* ------------------------------------------------------------------ *
 * Source census — a mechanical scan for every attachment-introducing  *
 * API this file (or any future defect injected into it) could call:   *
 * addEventListener, addAnimator, setTimeout/setInterval,              *
 * requestAnimationFrame, the three Observer constructors,             *
 * requestIdleCallback, new Worker, new WebSocket. This is what makes  *
 * "registerDrift() attaches nothing beyond what 2b/2c/2d/2e/2f/2g      *
 * already cover" a falsifiable claim about the SOURCE rather than an  *
 * assertion with no actual to corrupt: if a fourth attachment call is *
 * ever added without updating this file's teardown, the census total  *
 * moves off its pinned literal and the check goes red BEFORE anyone   *
 * has to notice the gap by inspection. (Prompted by review: the       *
 * original check 2h was `L.check(..., true)` — unfalsifiable by       *
 * construction, invisible to --prove-failure because it has no        *
 * comparison site to corrupt. See the "tooling blind spot" note in    *
 * docs/code-health/evidence/2026-08-21-elegance-run-01/r03/README.md.) *
 * ------------------------------------------------------------------ */
const ATTACHMENT_PATTERNS = [
  /\baddEventListener\(/g,
  /\baddAnimator\(/g,
  /\bsetTimeout\(/g,
  /\bsetInterval\(/g,
  /\brequestAnimationFrame\(/g,
  /\bnew\s+ResizeObserver\(/g,
  /\bnew\s+MutationObserver\(/g,
  /\bnew\s+IntersectionObserver\(/g,
  /\brequestIdleCallback\(/g,
  /\bnew\s+Worker\(/g,
  /\bnew\s+WebSocket\(/g,
];
function countAttachmentSites(source) {
  let total = 0;
  const byPattern = [];
  for (const re of ATTACHMENT_PATTERNS) {
    const m = source.match(re);
    const n = m ? m.length : 0;
    if (n > 0) byPattern.push([re.source, n]);
    total += n;
  }
  return { total, byPattern };
}

/* ------------------------------------------------------------------ *
 * Module loader — write a source string into a temp dir OUTSIDE the   *
 * repo, with browser import specifiers rewritten, and import it.      *
 * ------------------------------------------------------------------ */
let loadSeq = 0;
async function loadSpores(source, label) {
  for (const marker of ["from 'three'", "from '../flags.js'"]) {
    if (!source.includes(marker)) {
      throw new Error(`${label}: expected to find ${marker} in source — rewrite target missing`);
    }
  }
  const rewritten = source
    .replace("from 'three'", `from '${THREE_URL}'`)
    .replace("from '../flags.js'", `from '${FLAGS_URL}'`)
    // The accepted Inspire exit-identity refactor added this dependency to
    // current spores.js; the pinned HEAD source predates it, so this rewrite
    // is deliberately conditional rather than a required baseline marker.
    .replace("from '../inspire-exits.js'", `from '${INSPIRE_EXITS_URL}'`);
  const dir = mkdtempSync(join(STAGE_ROOT, 'load-'));
  const file = join(dir, `spores-${loadSeq++}-${label.replace(/[^a-z0-9]+/gi, '_')}.mjs`);
  writeFileSync(file, rewritten);
  return import(pathToFileURL(file).href);
}

/* ------------------------------------------------------------------ *
 * Global doubles: addEventListener / document / innerWidth /          *
 * innerHeight. Installed ONCE, process-wide (mirroring the single      *
 * real window/document a page has) — every assertion below reads      *
 * COUNT DELTAS around a specific action, never absolute totals, so    *
 * leftover attachments from an earlier section (in particular: the    *
 * baseline HEAD implementation, which never detaches anything) can    *
 * never corrupt a later section's measurement.                        *
 * ------------------------------------------------------------------ */
const windowListeners = new Map(); // type -> Set<fn>
const docListeners = new Map();
const winAddCounts = new Map(), winRemoveCounts = new Map();
const docAddCounts = new Map(), docRemoveCounts = new Map();
function bump(map, key) { map.set(key, (map.get(key) || 0) + 1); }
function addTo(map, type, fn) { if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); }
function removeFromSet(map, type, fn) { const s = map.get(type); if (s) s.delete(fn); }

globalThis.addEventListener = (type, fn) => { bump(winAddCounts, type); addTo(windowListeners, type, fn); };
globalThis.removeEventListener = (type, fn) => { bump(winRemoveCounts, type); removeFromSet(windowListeners, type, fn); };
globalThis.document = {
  addEventListener: (type, fn) => { bump(docAddCounts, type); addTo(docListeners, type, fn); },
  removeEventListener: (type, fn) => { bump(docRemoveCounts, type); removeFromSet(docListeners, type, fn); },
};
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;

function fireWindow(type, evt) {
  const s = windowListeners.get(type);
  let n = 0;
  if (s) for (const fn of [...s]) { fn(evt); n++; }
  return n;
}
function fireDoc(type, evt) {
  const s = docListeners.get(type);
  let n = 0;
  if (s) for (const fn of [...s]) { fn(evt); n++; }
  return n;
}
function pmEvent(clientX, clientY, extra = {}) {
  return { pointerType: 'mouse', buttons: 0, clientX, clientY, ...extra };
}

/* ------------------------------------------------------------------ *
 * Animator registry double — mirrors organism/animation.js's accepted *
 * (R01) addAnimator contract verbatim (read at                        *
 * docs/code-health/evidence/2026-08-21-elegance-run-01/r01/README.md; *
 * reproduced here rather than imported, per R02's "this file owns its *
 * own reporting" precedent — no dependency on another order's infra). *
 * `removalCallCounts` counts every invocation of ANY handle issued     *
 * under a name, whether or not it actually deletes — the instrument   *
 * idempotence checks below need.                                      *
 * ------------------------------------------------------------------ */
function createAnimatorRegistry() {
  const animators = new Map();
  const removalCallCounts = new Map();
  function addAnimator(name, fn) {
    animators.set(name, fn);
    return function removeAnimator() {
      removalCallCounts.set(name, (removalCallCounts.get(name) || 0) + 1);
      if (animators.get(name) === fn) animators.delete(name);
    };
  }
  function tickAll(t, dt) {
    for (const [, fn] of animators) fn(t, dt);
  }
  return { animators, addAnimator, tickAll, removalCallCounts };
}

/* ------------------------------------------------------------------ *
 * Deterministic ctx factory. Every field spores.js reads from ctx     *
 * (grepped exhaustively — see CHARACTERIZATION.md): rand, gauss,      *
 * pushC, makePoints, capUnderPt, tiltX, leanZ, scene, rimRad,         *
 * rimYoff, breeze, camera, addAnimator, swayCos, swaySin, LEAN_DIR,   *
 * CAP_Y. rand()/gauss() are a plain LCG + Box-Muller pair, freshly    *
 * seeded per ctx — construction consumes draws from these, so two     *
 * ctx's built with the same seed and driven through the same call     *
 * order produce byte-identical geometry.                              *
 * ------------------------------------------------------------------ */
function makeRandGauss(seed) {
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let spare = null;
  const gauss = () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u1 = 0;
    while (u1 === 0) u1 = rand();
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  };
  return { rand, gauss };
}

const sharedCamera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 100);
sharedCamera.position.set(0.4, 3.1, 9.6);
sharedCamera.lookAt(0, 2, 0);
sharedCamera.updateMatrixWorld(true);
sharedCamera.updateProjectionMatrix();

function makeCtx({ registry, seed, camera = sharedCamera }) {
  const { rand, gauss } = makeRandGauss(seed);
  const scene = { children: [], add(o) { this.children.push(o); } };
  return {
    rand, gauss,
    pushC: (arr, v) => { arr.push(v, v * 0.92, v * 0.81); },
    makePoints: (pp, pc, ps) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pp), 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pc), 3));
      geometry.setAttribute('psize', new THREE.BufferAttribute(new Float32Array(ps), 1));
      return { geometry };
    },
    capUnderPt: (u, a) => new THREE.Vector3(
      Math.cos(a) * u * 2.1, 0.4 + Math.sin(a) * u * 1.2, Math.sin(a * 0.5) * u * 1.7
    ),
    tiltX: 0.045, leanZ: 0.021,
    scene,
    rimRad: (az) => 3.15 + 0.12 * Math.sin(az * 1.7),
    rimYoff: (az) => 0.04 * Math.cos(az * 0.9),
    LEAN_DIR: 0.31, CAP_Y: 4.52,
    breeze: (t) => Math.sin(t * 0.47) * 0.31,
    camera,
    addAnimator: registry.addAnimator,
    swayCos: 1, swaySin: 0,
  };
}

function snap(sys) {
  const g = sys.sporePts.geometry;
  return {
    pos: Array.from(g.attributes.position.array),
    col: Array.from(g.attributes.color.array),
    siz: Array.from(g.attributes.psize.array),
  };
}
const sameSnap = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A deterministic tick script shared by every scenario below: sway state,
// dt, and (at two indices) mouse events. Exercises windOn=true, windOn=
// false-after-drag, and a mouseleave, over a mix of dt (including one
// stall clamp and one dt=0) — the same set of branches identity checks 1a
// and the ownership checks in sections 2-5 all pass through.
const TICKS = [
  { dt: 1 / 60, event: null },
  { dt: 1 / 60, event: ['pm', 812, 340] },
  { dt: 1 / 60, event: null },
  { dt: 1 / 60, event: null },
  { dt: 0.05, event: null },              // stall clamp
  { dt: 1 / 60, event: ['pm', 900, 200, { buttons: 1 }] }, // drag: mw.on -> false
  { dt: 1 / 60, event: null },
  { dt: 0, event: null },                 // frozen frame
  { dt: 1 / 60, event: ['ml'] },
  { dt: 1 / 60, event: null },
];

function runTicks(registry, ctx, n = TICKS.length) {
  let t = 0;
  for (let i = 0; i < n; i++) {
    const step = TICKS[i];
    if (step.event) {
      if (step.event[0] === 'pm') fireWindow('pointermove', pmEvent(step.event[1], step.event[2], step.event[3]));
      else if (step.event[0] === 'ml') fireDoc('mouseleave', {});
    }
    ctx.swayCos = Math.cos(0.021 * i);
    ctx.swaySin = Math.sin(0.021 * i);
    t += step.dt;
    registry.tickAll(t, step.dt);
  }
  return t;
}

/* ==================================================================== *
 * SECTION 1 — construction + shedSpores() + drift-integrator identity   *
 * (HEAD vs current), plus a positive control on the comparator itself.  *
 * ==================================================================== */
async function traceModule(mod, seed) {
  const registry = createAnimatorRegistry();
  const ctx = makeCtx({ registry, seed });
  const sys = mod.createSpores(ctx);
  const afterConstruct = snap(sys);
  sys.shedSpores(28);
  const afterShed = snap(sys);
  sys.registerDrift();
  runTicks(registry, ctx);
  const afterDrift = snap(sys);
  return { afterConstruct, afterShed, afterDrift };
}

async function runIdentitySuite(headMod, currentMod) {
  const SEED = 20260821;
  const head = await traceModule(headMod, SEED);
  const current = await traceModule(currentMod, SEED);

  L.check('1a: construction position/color/psize byte-identical (HEAD vs current)',
    sameSnap(head.afterConstruct, current.afterConstruct),
    { headLen: head.afterConstruct.pos.length, currentLen: current.afterConstruct.pos.length });
  L.check('1b: shedSpores(28) result byte-identical (HEAD vs current)',
    sameSnap(head.afterShed, current.afterShed));
  L.check('1c: drift integrator over 10 ticks (mixed dt, pointermove, drag, mouseleave) byte-identical (HEAD vs current)',
    sameSnap(head.afterDrift, current.afterDrift));

  // 1d (the positive control on this comparator) runs after this
  // function returns — see the call site below, right after
  // runIdentitySuite(): it needs headMod's ORIGINAL source text, which
  // this function does not have in scope.
  return head;
}

/* ==================================================================== *
 * SECTION 2 — attach/detach parity (current implementation only).       *
 * ==================================================================== */
async function scenarioParity(mod, seed = 1, source = CURRENT_SOURCE) {
  const registry = createAnimatorRegistry();
  const ctx = makeCtx({ registry, seed });
  const sys = mod.createSpores(ctx);

  const before = {
    winAddPM: winAddCounts.get('pointermove') || 0,
    winRemPM: winRemoveCounts.get('pointermove') || 0,
    docAddML: docAddCounts.get('mouseleave') || 0,
    docRemML: docRemoveCounts.get('mouseleave') || 0,
  };
  L.check('2a: before registerDrift(), the animator is not registered', !registry.animators.has('spore-drift'));

  sys.registerDrift();
  const afterRegister = {
    winAddPM: (winAddCounts.get('pointermove') || 0) - before.winAddPM,
    docAddML: (docAddCounts.get('mouseleave') || 0) - before.docAddML,
    hasAnimator: registry.animators.has('spore-drift'),
  };
  L.same('2b: registerDrift() attaches exactly one pointermove listener', afterRegister.winAddPM, 1);
  L.same('2c: registerDrift() attaches exactly one mouseleave listener', afterRegister.docAddML, 1);
  L.check('2d: registerDrift() registers the spore-drift animator', afterRegister.hasAnimator);

  sys.dispose();
  const afterDispose = {
    winRemPM: (winRemoveCounts.get('pointermove') || 0) - before.winRemPM,
    docRemML: (docRemoveCounts.get('mouseleave') || 0) - before.docRemML,
    hasAnimator: registry.animators.has('spore-drift'),
  };
  L.same('2e: dispose() removes exactly one pointermove listener (parity with 2b)', afterDispose.winRemPM, 1);
  L.same('2f: dispose() removes exactly one mouseleave listener (parity with 2c)', afterDispose.docRemML, 1);
  L.check('2g: dispose() removes the spore-drift animator', !afterDispose.hasAnimator);
  // 2h — replaces an earlier `L.check(..., true)` (unfalsifiable by
  // construction, flagged in review as invisible to --prove-failure
  // because it has no comparison site to corrupt). This version scans
  // the SOURCE this mod was built from for every attachment-introducing
  // API call and pins the total at the literal 3 CHARACTERIZATION.md
  // found (2 addEventListener + 1 addAnimator). A 4th attachment site —
  // added without updating 2b-2g and dispose() to match — moves this
  // count and turns the check red, which is the property "nothing is
  // left undetachable" actually needs to mean.
  const census = countAttachmentSites(source);
  L.same('2h: organism/spores.js has exactly 3 attachment-introducing call sites (2 addEventListener + 1 addAnimator) — 2b/2c/2d/2e/2f/2g are the whole inventory, not a subset of it',
    census.total, 3, { byPattern: census.byPattern });

  return { registry, ctx, sys };
}

/* ==================================================================== *
 * SECTION 3 — idempotence.                                              *
 * ==================================================================== */
async function scenarioIdempotence(mod) {
  // 3a/3b/3c — double dispose: no throw, and every removal path fires
  // EXACTLY once total, not twice.
  {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 2 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    const winRemBefore = winRemoveCounts.get('pointermove') || 0;
    const docRemBefore = docRemoveCounts.get('mouseleave') || 0;
    sys.dispose();
    let threw = false;
    try { sys.dispose(); } catch { threw = true; }
    const winRemDelta = (winRemoveCounts.get('pointermove') || 0) - winRemBefore;
    const docRemDelta = (docRemoveCounts.get('mouseleave') || 0) - docRemBefore;
    const handleCalls = registry.removalCallCounts.get('spore-drift') || 0;
    L.check('3a: calling dispose() a second time does not throw', !threw);
    L.same('3b: two dispose() calls remove the pointermove listener exactly once (not twice)', winRemDelta, 1);
    L.same('3c: two dispose() calls remove the mouseleave listener exactly once (not twice)', docRemDelta, 1);
    L.same('3d: two dispose() calls invoke the animator removal handle exactly once (not twice)', handleCalls, 1);
  }

  // 3e — dispose() before registerDrift() ever ran: no throw, nothing to
  // remove (counts stay at their pre-action values).
  {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 3 });
    const sys = mod.createSpores(ctx);
    const winRemBefore = winRemoveCounts.get('pointermove') || 0;
    let threw = false;
    try { sys.dispose(); } catch { threw = true; }
    const winRemDelta = (winRemoveCounts.get('pointermove') || 0) - winRemBefore;
    L.check('3e: dispose() before registerDrift() does not throw', !threw);
    L.same('3f: dispose() before registerDrift() removes nothing (there is nothing to remove)', winRemDelta, 0);
  }

  // 3g — registerDrift() after dispose() stays a permanent no-op (no
  // resurrection).
  {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 4 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    const winAddBefore = winAddCounts.get('pointermove') || 0;
    sys.registerDrift();
    const winAddDelta = (winAddCounts.get('pointermove') || 0) - winAddBefore;
    L.same('3g: registerDrift() after dispose() attaches nothing (permanent no-op)', winAddDelta, 0);
    L.check('3h: registerDrift() after dispose() does not re-register the animator', !registry.animators.has('spore-drift'));
  }

  // 3i/3j — dispose() called mid-frame, from a DIFFERENT animator in the
  // same registry. Case A: the trigger runs BEFORE 'spore-drift' in
  // iteration order (registered first) — per R01's documented, reviewed
  // caveat, removing a not-yet-visited animator mid-frame silently skips
  // it for that tick; that is the expected, safe outcome, not a throw.
  {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 5 });
    const sys = mod.createSpores(ctx);
    registry.addAnimator('zzz-trigger-before', () => sys.dispose());
    sys.registerDrift(); // 'spore-drift' now AFTER the trigger in Map order
    const before = snap(sys);
    let threw = false;
    try { registry.tickAll(0.016, 0.016); } catch { threw = true; }
    const after = snap(sys);
    L.check('3i: dispose() from an earlier same-frame animator does not throw', !threw);
    L.check('3i-b: spore-drift, removed before it was visited, does not run that frame (R01\'s documented caveat)',
      sameSnap(before, after));
    L.check('3i-c: the animator is gone after the frame', !registry.animators.has('spore-drift'));
  }
  // Case B: the trigger runs AFTER 'spore-drift' (registered second) —
  // spore-drift runs its normal tick, THEN gets disposed mid-frame.
  {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 6 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    registry.addAnimator('zzz-trigger-after', () => sys.dispose());
    let threw = false;
    try { registry.tickAll(0.016, 0.016); } catch { threw = true; }
    L.check('3j: dispose() from a later same-frame animator does not throw', !threw);
    L.check('3j-b: the animator is gone after the frame it disposed itself in', !registry.animators.has('spore-drift'));
  }
}

/* ==================================================================== *
 * SECTION 4 — no post-dispose mutation (the C04 tickSwap defect class), *
 * with an inline positive control.                                      *
 * ==================================================================== */
async function scenarioNoPostDisposeMutation(mod) {
  const registry = createAnimatorRegistry();
  const ctx = makeCtx({ registry, seed: 7 });
  let capturedRawFn = null;
  const spyRegistry = {
    animators: registry.animators,
    addAnimator(name, fn) {
      if (name === 'spore-drift') capturedRawFn = fn;
      return registry.addAnimator(name, fn);
    },
    tickAll: registry.tickAll,
    removalCallCounts: registry.removalCallCounts,
  };
  ctx.addAnimator = spyRegistry.addAnimator;
  const sys = mod.createSpores(ctx);
  sys.registerDrift();

  const beforeAnyTick = snap(sys);
  registry.tickAll(0.5, 1 / 60);
  const afterOneTick = snap(sys);
  const changedBeforeDispose = !sameSnap(beforeAnyTick, afterOneTick);
  L.check('4a (positive control): ticking BEFORE dispose() does change spore positions — proves 4b/4c are not vacuous',
    changedBeforeDispose);

  sys.dispose();
  const beforePostDisposeTick = snap(sys);
  fireWindow('pointermove', pmEvent(500, 500));
  fireDoc('mouseleave', {});
  registry.tickAll(0.516, 1 / 60);
  const afterPostDisposeTick = snap(sys);
  L.check('4b: firing pointermove/mouseleave and ticking the (now-empty) registry after dispose() mutates nothing',
    sameSnap(beforePostDisposeTick, afterPostDisposeTick));

  // 4c: the defense-in-depth guard, tested directly — invoke the RAW
  // callback addAnimator captured at registration time, bypassing the
  // registry's Map entirely (simulating "something re-registered this
  // name without going through this file's own dispose/register pair",
  // the scenario the in-callback `if (driftDisposed) return;` guards
  // against — the same defect class C04 found unguarded in
  // portraits.tickSwap()).
  const beforeRawInvoke = snap(sys);
  capturedRawFn(0.6, 1 / 60);
  const afterRawInvoke = snap(sys);
  L.check('4c: invoking the disposed instance\'s raw callback directly still mutates nothing (in-callback guard)',
    sameSnap(beforeRawInvoke, afterRawInvoke));

  return { capturedRawFn };
}

/* ==================================================================== *
 * SECTION 5 — two-instance isolation. Realistic shape: ONE module        *
 * namespace, ONE shared animator registry (organism/animation.js is a    *
 * page-level singleton in production), TWO createSpores() calls.         *
 * Isolation is proved by a control: instance B's trajectory, driven      *
 * through an identical event/tick script, must be IDENTICAL whether or   *
 * not instance A ever existed and disposed.                              *
 * ==================================================================== */
async function scenarioIsolation(mod) {
  const SEED_B = 999;

  // Control: B alone, nothing else ever registered against this registry.
  const controlRegistry = createAnimatorRegistry();
  const controlCtx = makeCtx({ registry: controlRegistry, seed: SEED_B });
  const controlSys = mod.createSpores(controlCtx);
  controlSys.registerDrift();
  runTicks(controlRegistry, controlCtx);
  const controlTrace = snap(controlSys);

  // Experiment: A registers first (and gets evicted from the Map by B's
  // same-name registration — R01's documented, unchanged, characterized
  // behavior — see CHARACTERIZATION.md), then A disposes, then B runs the
  // identical script.
  const sharedRegistry = createAnimatorRegistry();
  const ctxA = makeCtx({ registry: sharedRegistry, seed: 111 });
  const sysA = mod.createSpores(ctxA);
  sysA.registerDrift();
  const winPMAfterA = winAddCounts.get('pointermove') || 0;
  L.check('5a: instance A alone has registered the shared animator slot', sharedRegistry.animators.has('spore-drift'));

  const ctxB = makeCtx({ registry: sharedRegistry, seed: SEED_B });
  const sysB = mod.createSpores(ctxB);
  sysB.registerDrift();
  const winPMAfterB = winAddCounts.get('pointermove') || 0;
  L.same('5b (characterized, inherited from R01 — not this order\'s defect): the shared registry still holds exactly ONE \'spore-drift\' slot after both register',
    sharedRegistry.animators.size >= 1 && sharedRegistry.animators.has('spore-drift'), true);
  L.same('5c: B\'s registration attaches its OWN pointermove listener alongside A\'s (2 total, not a replacement)',
    winPMAfterB - winPMAfterA, 1);

  const winRemBeforeADispose = winRemoveCounts.get('pointermove') || 0;
  sysA.dispose(); // A's stale handle for 'spore-drift' is a no-op (R01); A's OWN listeners ARE removed
  const winRemAfterADispose = (winRemoveCounts.get('pointermove') || 0) - winRemBeforeADispose;
  L.same('5d: A.dispose() removes exactly A\'s own pointermove listener (1), leaving B\'s attached', winRemAfterADispose, 1);
  L.check('5e: A.dispose() does NOT remove B\'s live \'spore-drift\' registration (R01\'s identity-scoped handle)',
    sharedRegistry.animators.has('spore-drift'));

  runTicks(sharedRegistry, ctxB);
  const experimentTrace = snap(sysB);
  L.check('5f: B\'s trajectory after A existed and disposed is BYTE-IDENTICAL to B running alone (A leaked nothing into B)',
    sameSnap(controlTrace, experimentTrace));

  return { controlTrace, experimentTrace, controlRegistry, sharedRegistry, sysA, sysB };
}

/* ==================================================================== *
 * MAIN — load HEAD + current, run the functional suite.                 *
 * ==================================================================== */
const CURRENT_SOURCE = readFileSync(SPORES_PATH, 'utf8');
const HEAD_SOURCE = execFileSync('git', ['show', `${RUN_START_SHA}:organism/spores.js`], { cwd: REPO_ROOT, encoding: 'utf8' });

L.check('pre-flight: HEAD source and current source are NOT byte-identical (this order has edited the file)',
  HEAD_SOURCE !== CURRENT_SOURCE);
L.check('pre-flight: HEAD source has no dispose()/driftDisposed machinery (confirms it is the true pre-change baseline)',
  !HEAD_SOURCE.includes('driftDisposed') && !HEAD_SOURCE.includes('dispose: disposeDrift'));

const headMod = await loadSpores(HEAD_SOURCE, 'head');
const currentMod = await loadSpores(CURRENT_SOURCE, 'current');

await runIdentitySuite(headMod, currentMod);

// 1d — positive control on the identity comparator itself: perturb ONE
// named constant in the HEAD source (BREEZE_DIR's BZY term, which every
// spore's construction and every drift tick reads) and confirm the SAME
// comparator now reports a mismatch against the real HEAD trace.
{
  const perturbedHeadSource = mutate(HEAD_SOURCE, 'identity-positive-control', [
    ['const BZX = 1.0, BZY = 0.62, BZZ = 0.17;', 'const BZX = 1.0, BZY = 0.6200001, BZZ = 0.17;'],
  ]);
  const perturbedMod = await loadSpores(perturbedHeadSource, 'head-perturbed');
  const SEED = 20260821;
  const realHead = await traceModule(headMod, SEED);
  const perturbedHead = await traceModule(perturbedMod, SEED);
  L.check('1d (positive control): a 1e-7-perturbed BREEZE_DIR is NOT byte-identical to the real HEAD trace — the comparator can fail',
    !sameSnap(realHead.afterDrift, perturbedHead.afterDrift));
}

await scenarioParity(currentMod);
await scenarioIdempotence(currentMod);
await scenarioNoPostDisposeMutation(currentMod);
await scenarioIsolation(currentMod);

/* ==================================================================== *
 * LITERAL-PREDICATE SCAN (D44) — now in the GATED invocation.           *
 *                                                                       *
 * D47/F-1: this scan used to live inside the --prove-failure block, and  *
 * no gate passes that flag, so it executed in 0 of the 22 gated suites   *
 * and its match loop had never been entered anywhere in the tree. It is  *
 * unconditional from here, and it carries the two controls D46 requires, *
 * because an assert-zero check with neither cannot tell a clean file     *
 * from a file it never read:                                            *
 *                                                                       *
 *   PC-1  POSITIVE CONTROL — a census of the assertion call sites this   *
 *         scan's own pattern can see, pinned to a literal. A moved file, *
 *         an empty read or a renamed assertion helper drives it to 0 and *
 *         fails the suite; a genuinely clean file does not.              *
 *   PC-2  FILES-READ pin — the number of INPUTS, not of matches.         *
 *   PC-3  synthetic-positive fixtures, modelled on P16 in               *
 *         tools/test-render-perturbation.mjs:275: MANUFACTURE the shapes *
 *         the scan exists to catch and feed them to the same scanner, so *
 *         "0 hits" is only ever reported by a scanner just demonstrated  *
 *         to return non-zero on the things it is looking for. P16 is the *
 *         pattern QA-02 accepted for a zero-match grep, and this is the  *
 *         same shape.                                                    *
 *                                                                       *
 * The pattern is also wider than D44's original, which QA-02 replayed    *
 * verbatim and measured blind to: an escaped quote in the label, a bare  *
 * unqualified assertion call (this file ships 2 of those beside its      *
 * qualified ones, so one apostrophe in a label silenced the scan for     *
 * that line), a numeric predicate, a negated-numeric predicate, and the  *
 * identity comparison of D44's addendum. All five are fixtured below.    *
 *                                                                       *
 * NOTE for anyone editing this block: keep the bare token that names an  *
 * assertion call out of STRING literals here. Comments are stripped      *
 * before scanning, strings are not, so a string carrying it would        *
 * inflate the PC-1 census with a site that is not a call.                *
 * ==================================================================== */
console.log('\nliteral-predicate scan (D44/D46) — unfalsifiable predicates, with positive controls');

// Block comments become an equal count of newlines (so line numbers survive)
// and line comments are blanked. A comment that merely MENTIONS the pattern —
// including this one — is therefore not a hit; fixtures PC3-24 and PC3-25
// prove that in both directions.
// QA-04 / S-3: this was two regexes with no string, template or
// regex-literal state — the D67 defect. A `/*` inside a string constant
// opened a phantom comment and blanked live code, and because "0 hits" is
// the passing answer for this scan (D46) the loss was silent. Now the one
// shared implementation in tools/strip-comments.mjs, which is both
// length-preserving and line-preserving, so the line arithmetic below is
// unchanged and the offsets are now valid as well.
/* QA-06: SCAN_CALL, the three patterns, the 31-row synthetic-positive table
   and scanLiteralPredicateText() are now the ONE shared implementation in
   tools/self-controls.mjs — this file carried the fourth byte-equivalent
   copy. The ASSERTION WIRING below is NOT shared and must not be: it runs
   through this suite's own ledger, and its PC-1 literal is per-subject
   data. A shared kit drives a reader; it does not replace one. */

/* QA-06: the 31-row synthetic-positive table and its `SK` interpolation
   guard are now the ONE shared table in tools/self-controls.mjs. The rows
   still interpolate the assertion token so no row is itself counted as a
   call site, and PC-3a/PC-3b/PC-3c still pin 31/31/19 here. */

let scanFixtureRuns = 0;
let scanFixturesAsExpected = 0;
let scanFixturesYieldingHits = 0;
for (const [id, what, snippet, want] of SCAN_FIXTURES) {
  scanFixtureRuns++;
  const got = scanLiteralPredicateText(snippet).hits.length;
  if (got === want) scanFixturesAsExpected++;
  else console.log(`  FIXTURE MISS  ${id}  ${what} — expected ${want} hit(s), scanner returned ${got}`);
  if (got > 0) scanFixturesYieldingHits++;
}
// D45: the loop's iteration count is a primary assertion, pinned to a
// non-zero literal, so an empty fixture table cannot pass silently.
L.same('PC-3a: the synthetic-positive fixture table ran over every row (iteration pin)', scanFixtureRuns, 31);
L.same('PC-3b: every fixture row returned exactly the hit count it was built for', scanFixturesAsExpected, 31);
L.same('PC-3c: the scanner returned NON-ZERO on every row manufactured to be caught', scanFixturesYieldingHits, 19);

// PC-2 — the files-read pin. Inputs, not matches.
const SCAN_INPUTS = [fileURLToPath(import.meta.url)];
const scanTexts = SCAN_INPUTS.map((p) => readFileSync(p, 'utf8'));
L.same('PC-2a: the scan read exactly 1 input file (files-read pin, not a match count)', scanTexts.length, 1);
L.check('PC-2b: the input file read back non-empty', scanTexts[0].length > 0, { bytes: scanTexts[0].length });

const selfScan = scanLiteralPredicateText(scanTexts[0]);
// PC-1 — the positive control. If this census reads 0, the scan is looking
// at the wrong bytes or the assertion helper was renamed; either way its
// "0 hits" below would be meaningless. Bump the literal deliberately when
// assertion call sites are added or removed.
L.same('PC-1: the scan pattern still sees this file’s assertion call sites (census; 0 means a moved file or a renamed helper, NOT a clean one)', selfScan.sites, 26);
L.check('D44 scan: 0 unfalsifiable literal-predicate assertions in this file', selfScan.hits.length === 0, selfScan.hits);
for (const h of selfScan.hits) console.log(`  HIT  tools/test-spores-lifecycle.mjs:${h.lineNo}  [${h.shape}]  ${h.text}`);
console.log(`  ${selfScan.hits.length} hit(s) across ${scanTexts[0].split('\n').length} lines; ${selfScan.sites} assertion call site(s) seen; ${scanFixtureRuns} fixtures replayed`);

SENT.reach('ledger');
const mainFailures = L.report();

/* ==================================================================== *
 * --prove-failure — ten targeted mutants of the CURRENT source,         *
 * each built by anchor-checked string substitution, each re-run through *
 * the ONE check that should catch it. Exits 1 if any check turns out to *
 * be a tautology (passes even against the mutant it was built for).     *
 * ==================================================================== */
if (process.argv.includes('--prove-failure')) {
  console.log('\n--prove-failure — ten mutants, each fed to the one check built to catch it');
  let bad = 0;
  const prove = async (id, what, goodValue, mutantValuePromise) => {
    const mutantValue = await mutantValuePromise;
    const g = JSON.stringify(goodValue);
    const m = JSON.stringify(mutantValue);
    if (m !== g) {
      console.log(`  PROVED     ${id}  ${what}`);
      console.log(`             good: ${g}   mutant: ${m}  -> the real check (asserting === good) would FAIL here`);
    } else {
      bad++;
      console.log(`  TAUTOLOGY  ${id}  ${what} — the mutant produced the SAME value as good code. This check cannot fail.`);
    }
  };

  async function pointermoveRemoveDelta(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 202 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    const before = winRemoveCounts.get('pointermove') || 0;
    sys.dispose();
    return (winRemoveCounts.get('pointermove') || 0) - before;
  }
  async function mouseleaveRemoveDelta(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 203 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    const before = docRemoveCounts.get('mouseleave') || 0;
    sys.dispose();
    return (docRemoveCounts.get('mouseleave') || 0) - before;
  }
  async function animatorRemainsAfterDispose(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 204 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    return registry.animators.has('spore-drift');
  }
  async function postDisposeTickMutates(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 205 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    const before = snap(sys);
    registry.tickAll(1, 1 / 60);
    const after = snap(sys);
    return !sameSnap(before, after); // true = mutated post-dispose (bad)
  }
  async function doubleDisposeHandleCalls(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 206 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    sys.dispose();
    return registry.removalCallCounts.get('spore-drift') || 0;
  }
  async function disposeBeforeStartThrows(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 207 });
    const sys = mod.createSpores(ctx);
    let threw = false;
    try { sys.dispose(); } catch { threw = true; }
    return threw;
  }
  async function resurrectionReattaches(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 208 });
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    const before = winAddCounts.get('pointermove') || 0;
    sys.registerDrift();
    return (winAddCounts.get('pointermove') || 0) - before;
  }
  async function isolationHolds(mod) {
    const SEED_B = 909;
    const controlRegistry = createAnimatorRegistry();
    const controlCtx = makeCtx({ registry: controlRegistry, seed: SEED_B });
    const controlSys = mod.createSpores(controlCtx);
    controlSys.registerDrift();
    runTicks(controlRegistry, controlCtx);
    const controlTrace = snap(controlSys);

    const sharedRegistry = createAnimatorRegistry();
    const ctxA = makeCtx({ registry: sharedRegistry, seed: 808 });
    const sysA = mod.createSpores(ctxA);
    sysA.registerDrift();
    const ctxB = makeCtx({ registry: sharedRegistry, seed: SEED_B });
    const sysB = mod.createSpores(ctxB);
    sysB.registerDrift();
    sysA.dispose();
    runTicks(sharedRegistry, ctxB);
    const experimentTrace = snap(sysB);
    return sameSnap(controlTrace, experimentTrace);
  }
  async function rawCallbackMutatesAfterDispose(mod) {
    const registry = createAnimatorRegistry();
    const ctx = makeCtx({ registry, seed: 210 });
    let capturedRawFn = null;
    ctx.addAnimator = (name, fn) => { if (name === 'spore-drift') capturedRawFn = fn; return registry.addAnimator(name, fn); };
    const sys = mod.createSpores(ctx);
    sys.registerDrift();
    sys.dispose();
    const before = snap(sys);
    capturedRawFn(1, 1 / 60);
    const after = snap(sys);
    return !sameSnap(before, after); // true = mutated (bad)
  }

  const mutantA = await loadSpores(mutate(CURRENT_SOURCE, 'a-noOffPointerMove', [
    ['      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n',
      '      offMouseLeave();\n      offDriftAnimator();\n'],
  ]), 'mutant-a2');
  await prove('a', 'dispose() must remove the pointermove listener (2e)', 1, pointermoveRemoveDelta(mutantA));

  const mutantB = await loadSpores(mutate(CURRENT_SOURCE, 'b-noOffMouseLeave', [
    ['      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n',
      '      offPointerMove();\n      offDriftAnimator();\n'],
  ]), 'mutant-b');
  await prove('b', 'dispose() must remove the mouseleave listener (2f)', 1, mouseleaveRemoveDelta(mutantB));

  const mutantC = await loadSpores(mutate(CURRENT_SOURCE, 'c-noOffDriftAnimator', [
    ['      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n',
      '      offPointerMove();\n      offMouseLeave();\n'],
  ]), 'mutant-c');
  await prove('c1', 'dispose() must remove the spore-drift animator (2g)', false, animatorRemainsAfterDispose(mutantC));

  // c2 — 4b is protected by TWO independent mechanisms (the structural
  // removal AND the in-callback disposed-guard mutant h targets), so
  // dropping only offDriftAnimator() (mutant c) does NOT make 4b
  // observably fail — the in-callback guard still catches it. Proving 4b
  // properly requires knocking out BOTH: this compound mutant drops
  // offDriftAnimator() from dispose() AND the in-callback guard, the
  // scenario "the removal failed silently, and there is no defense in
  // depth" that 4b actually exists to catch.
  const mutantC2 = await loadSpores(mutate(CURRENT_SOURCE, 'c2-noOffDriftAnimator-noCallbackGuard', [
    ['      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n',
      '      offPointerMove();\n      offMouseLeave();\n'],
    ['      if (driftDisposed) return;\n      // Seat watchdog', '      // Seat watchdog'],
  ]), 'mutant-c2');
  await prove('c2', 'a post-dispose tick must not mutate positions (4b) — C04 tickSwap defect class, both layers removed', false, postDisposeTickMutates(mutantC2));

  // d — the driftAttached reset ALSO idempotence-guards the removal calls
  // (a second call sees driftAttached===false and skips the block even
  // without the driftDisposed early-return), so dropping only the top
  // guard (leaving driftAttached's own reset intact) does not make 3d
  // observably fail either. This mutant drops every idempotence guard in
  // disposeDrift() at once — the early return, the driftDisposed flag
  // set, and the driftAttached reset — so a second call genuinely
  // re-invokes every removal handle.
  const mutantD = await loadSpores(mutate(CURRENT_SOURCE, 'd-noIdempotenceGuardsAtAll', [
    ['  function disposeDrift() {\n    if (driftDisposed) return;\n    driftDisposed = true;\n    if (driftAttached) {\n      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n      offPointerMove = null;\n      offMouseLeave = null;\n      offDriftAnimator = null;\n      driftAttached = false;\n    }\n  }',
      '  function disposeDrift() {\n    if (driftAttached) {\n      offPointerMove();\n      offMouseLeave();\n      offDriftAnimator();\n    }\n  }'],
  ]), 'mutant-d');
  await prove('d', 'a second dispose() must not invoke the animator handle again (3d)', 1, doubleDisposeHandleCalls(mutantD));

  const mutantE = await loadSpores(mutate(CURRENT_SOURCE, 'e-noDriftAttachedGuard', [
    ['    if (driftAttached) {\n      offPointerMove();', '    if (true) {\n      offPointerMove();'],
  ]), 'mutant-e');
  await prove('e', 'dispose() before registerDrift() must not throw (3e)', false, disposeBeforeStartThrows(mutantE));

  const mutantF = await loadSpores(mutate(CURRENT_SOURCE, 'f-noRegisterGuard', [
    ['    if (driftAttached || driftDisposed) return;\n    const { breeze, camera, addAnimator } = ctx;',
      '    const { breeze, camera, addAnimator } = ctx;'],
  ]), 'mutant-f');
  await prove('f', 'registerDrift() after dispose() must attach nothing (3g)', 0, resurrectionReattaches(mutantF));

  const mutantG = await loadSpores(mutate(CURRENT_SOURCE, 'g-moduleGlobalLeak', [
    ["import { TKDBG } from '../flags.js';\n",
      "import { TKDBG } from '../flags.js';\n\nlet driftAttached = false, driftDisposed = false;\nlet offPointerMove = null, offMouseLeave = null, offDriftAnimator = null;\n"],
    ['  let driftAttached = false, driftDisposed = false;\n  let offPointerMove = null, offMouseLeave = null, offDriftAnimator = null;\n\n  // ---- mouse wind + the drift integrator ----',
      '  // ---- mouse wind + the drift integrator ----'],
  ]), 'mutant-g');
  await prove('g', 'a second instance\'s trajectory must be unaffected by another instance disposing (5f) — module-global leak', true, isolationHolds(mutantG));

  const mutantH = await loadSpores(mutate(CURRENT_SOURCE, 'h-noCallbackGuard', [
    ['      if (driftDisposed) return;\n      // Seat watchdog', '      // Seat watchdog'],
  ]), 'mutant-h');
  await prove('h', 'the raw callback must not mutate positions when invoked directly after dispose (4c)', false, rawCallbackMutatesAfterDispose(mutantH));

  // i — a fourth attachment site, added without touching 2b-2g or
  // dispose(): proves check 2h's replacement (a source census pinned at
  // the literal 3) is a real comparison site, not the unfalsifiable
  // `L.check(..., true)` it replaced. registerDrift() still only removes
  // three things in this mutant — the new setTimeout is never cancelled
  // — so this is exactly the "undetachable" scenario 2h exists to catch.
  const mutantI = mutate(CURRENT_SOURCE, 'i-untrackedFourthAttachment', [
    ['    driftAttached = true;\n  }', '    setTimeout(() => {}, 0);\n    driftAttached = true;\n  }'],
  ]);
  await prove('i', 'the attachment-site census must read 3, not more (2h)', 3, countAttachmentSites(mutantI).total);

  /* ================================================================ *
   * The literal-predicate scan that used to live HERE has moved out    *
   * from behind this flag — see the LITERAL-PREDICATE SCAN block above *
   * `L.report()`. D47/F-1: no gate passes --prove-failure, so a scan    *
   * sited here executes in zero gated runs. It is one implementation,   *
   * now unconditional, and its result reaches the exit code through the *
   * main ledger rather than through this branch.                        *
   * ================================================================ */

  SENT.reach('prove');
  console.log(`\n--prove-failure: ${bad === 0 ? 'PASS' : 'FAIL'} — ${10 - bad}/10 assertions correctly caught`);
  if (bad > 0) process.exitCode = 1;
}

if (mainFailures > 0 && process.exitCode !== 1) process.exitCode = 1;
