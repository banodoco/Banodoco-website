// R02 — organism/intro.js lifecycle: the intro fast-forward's rAF ownership
// and its performance.now patch. Run with: node tools/test-intro-lifecycle.mjs
//
// This is a behavior-preservation order. `accelerate()` fast-forwards the
// entry choreography by SKEWING the global clock; the skew curve, the frame
// on which each value lands, and everything the intro-draw animator writes
// (drawU, the shell opacities, the stem clip plane) must be byte-for-byte
// identical to what shipped at this run's starting HEAD. What changes is
// ownership: the recursive rAF is now cancellable, and the clock patch has a
// named owner with an idempotent install/restore.
//
// Method, mirroring R01's tools/test-animation-lifecycle.mjs: load BOTH the
// pre-change implementation (`git show HEAD:organism/intro.js`) and the
// current working-tree implementation into their own temp copies OUTSIDE the
// repo, rewriting only the two bare/relative specifiers (`three` and
// `../flags.js`) so they resolve, and drive both with the exact same injected
// requestAnimationFrame / cancelAnimationFrame / performance.now doubles and
// the exact same fake scene. No browser, no jsdom: organism/intro.js touches
// only those three globals plus a plain-object scene graph.
//
// Checks 1-2  run BOTH implementations and diff their traces (timing identity).
// Checks 3-8  exercise the current implementation's new ownership surface.
// Check  9    is the non-tautology transcript: every assertion above is
//             re-run against a deliberately BROKEN copy of the current
//             implementation, to show the assertion can actually fail.
//
// NOTE ON WIRING: package.json's `test:contracts` is owned by a concurrent
// order this run, so this file is NOT wired into it yet. Run it directly.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const THREE_URL = pathToFileURL(join(REPO_ROOT, 'vendor/three/three.module.js')).href;
const FLAGS_URL = pathToFileURL(join(REPO_ROOT, 'flags.js')).href;

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite staged into a fresh            *
 * os.tmpdir() directory per module load and removed none of them. It was *
 * the heaviest leaker in the gate by COUNT - 16 directories per run, 656 *
 * standing on this machine when the measurement was taken.               *
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
const STAGE_ROOT = mkdtempSync(join(tmpdir(), 'r02-intro-'));
process.on('exit', () => {
  try { rmSync(STAGE_ROOT, { recursive: true, force: true }); } catch { /* best effort */ }
});

// QA-02 TIME BOMB FIX: this run's starting commit, pinned explicitly.
// `git show HEAD:organism/intro.js` used to be read below, but HEAD is a
// MOVING ref -- the moment this run's own changes are committed, HEAD
// advances to include them, BASELINE_SOURCE and CURRENT_SOURCE become
// byte-identical, the "diff is real" sanity check flips to false, and the
// BASELINE-side classic-bug/pre-change-shape checks stop reproducing the
// pre-change behavior entirely (they would load the FIXED implementation
// on both sides). Pinning this SHA instead of HEAD is the fix -- do not
// revert this back to `HEAD:organism/intro.js`.
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

/* ------------------------------------------------------------------ *
 * Minimal self-contained ledger. This file owns its own reporting;    *
 * it deliberately depends on no other order's test infrastructure.    *
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

const L = createLedger('intro lifecycle');

/* ------------------------------------------------------------------ *
 * Load a copy of organism/intro.js from arbitrary source text into a  *
 * temp dir OUTSIDE the repo, with only the two import specifiers      *
 * rewritten. Returns the whole module namespace.                      *
 * ------------------------------------------------------------------ */
let loadSeq = 0;
async function loadIntro(source, label) {
  for (const marker of ["from 'three'", "from '../flags.js'"]) {
    if (!source.includes(marker)) {
      throw new Error(`${label}: expected to find ${marker} in source — rewrite target missing`);
    }
  }
  const rewritten = source
    .replace("from 'three'", `from '${THREE_URL}'`)
    .replace("from '../flags.js'", `from '${FLAGS_URL}'`);
  const dir = mkdtempSync(join(STAGE_ROOT, 'load-'));
  const file = join(dir, `intro-${label}-${loadSeq++}.mjs`);
  writeFileSync(file, rewritten, 'utf8');
  return import(pathToFileURL(file).href);
}

const CURRENT_SOURCE = readFileSync(join(REPO_ROOT, 'organism/intro.js'), 'utf8');
// Pinned to RUN_START_SHA, not HEAD -- see the comment above its definition.
const BASELINE_SOURCE = execFileSync('git', ['show', `${RUN_START_SHA}:organism/intro.js`],
  { cwd: REPO_ROOT, encoding: 'utf8' });

L.check('baseline source differs from current (sanity: the diff is real)',
  BASELINE_SOURCE !== CURRENT_SOURCE);
L.check('baseline patches performance.now with an uncancellable recursive rAF (sanity)',
  BASELINE_SOURCE.includes('performance.now = () => orig() + skew;')
  && /if \(f < 1\) requestAnimationFrame\(ramp\);/.test(BASELINE_SOURCE)
  && !BASELINE_SOURCE.includes('cancelAnimationFrame'));

const current = await loadIntro(CURRENT_SOURCE, 'current');
const baseline = await loadIntro(BASELINE_SOURCE, 'baseline');

/* ------------------------------------------------------------------ *
 * Injected globals: a controllable wall clock and an rAF/cAF double.  *
 * ------------------------------------------------------------------ */
function makeEnv() {
  const state = { t: 0, bomb: null };
  // THE pristine reference. Every restore assertion checks identity against
  // this exact function object — not "a function that returns the same
  // number", which a re-wrapped equivalent would also satisfy.
  const baseNow = function now() {
    if (state.bomb !== null) {
      state.bomb -= 1;
      if (state.bomb === 0) { state.bomb = null; throw new Error('clock bomb'); }
    }
    return state.t;
  };
  const prevPerfNow = globalThis.performance.now;
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;
  globalThis.performance.now = baseNow;

  let nextId = 1;
  const pending = new Map();
  const cancelled = [];
  let rafInvocations = 0;
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; pending.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { cancelled.push(id); pending.delete(id); };

  return {
    state, baseNow, pending, cancelled,
    get rafInvocations() { return rafInvocations; },
    /** One display frame: advance real time, run the shared loop's animators
     *  (that is what invokes 'intro-draw'), then drain the rAF queue (that is
     *  what invokes the intro's ramp). Order mirrors the browser: the shared
     *  loop registered first at boot, the ramp second. */
    frame(animators, dtMs) {
      state.t += dtMs;
      for (const [, fn] of animators) fn(0, 0);
      const due = [...pending.values()];
      pending.clear();
      for (const cb of due) { rafInvocations += 1; cb(); }
    },
    dispose() {
      globalThis.performance.now = prevPerfNow;
      globalThis.requestAnimationFrame = prevRaf;
      globalThis.cancelAnimationFrame = prevCaf;
    },
  };
}

/* ------------------------------------------------------------------ *
 * A fake scene graph shaped exactly the way setupIntro() reads it.    *
 * ------------------------------------------------------------------ */
function makeGeometry(n, seed) {
  const xs = [], ys = [], zs = [], drawn = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    xs.push(((i * 7 + seed * 13) % 11) * 0.31);
    ys.push(((i * 5 + seed * 3) % 9) * 0.47);
    zs.push(((i * 3 + seed * 17) % 13) * 0.23);
  }
  return {
    attributes: {
      position: { count: n, getX: (i) => xs[i], getY: (i) => ys[i], getZ: (i) => zs[i] },
      aDraw: { needsUpdate: false, drawn, setX(i, v) { drawn[i] = v; } },
    },
  };
}

/** A drawable: has a uWin uniform, so setupIntro's `filt` picks it up, and
 *  isMesh:false so the occluder-shell filters never claim it. */
function makeDrawable(seed) {
  return {
    isMesh: false, visible: true, geometry: makeGeometry(6, seed),
    material: {
      userData: { uWin: true },
      uniforms: {
        uWin: { value: { a: 0, b: 0, set(a, b) { this.a = a; this.b = b; } } },
        uClampY: { value: 0 },
      },
      transparent: false, opacity: 1, clippingPlanes: null,
    },
  };
}

/** An occluder shell: isMesh, no uWin anywhere. */
function makeShell() {
  return {
    isMesh: true, visible: true, geometry: makeGeometry(4, 1),
    material: { userData: {}, transparent: false, opacity: 1, clippingPlanes: null },
  };
}

function makeScene({ intro = 5.4, deferIntro = false } = {}) {
  const ground = [0, 1, 2, 3, 4, 5, 6].map(makeDrawable);          // 7 windows
  const stemDraw = [10, 11, 12].map(makeDrawable);                  // 3 windows
  const stemShells = [makeShell()];
  const capDraw = [20, 21, 22, 23, 24, 25, 26, 27].map(makeDrawable); // 8 windows
  const capShells = [makeShell(), makeShell()];
  const sceneDraw = [30, 31].map(makeDrawable);                     // motes, spores
  const animators = new Map();
  const renderer = {};
  const drawU = { value: -1 };
  const ctx = {
    scene: { children: sceneDraw },
    renderer,
    mushroom: { children: [...capDraw, ...capShells] },
    stemGroup: { children: [...stemDraw, ...stemShells] },
    groundGroup: { children: ground },
    drawU,
    drawWin: (o) => o.material.uniforms.uWin,
    animators,
    addAnimator(name, fn) {
      animators.set(name, fn);
      return function removeAnimator() { if (animators.get(name) === fn) animators.delete(name); };
    },
    intro, deferIntro,
  };
  return { ctx, animators, drawU, stemShells, capShells, stemDraw, ground, capDraw, sceneDraw, renderer };
}

/** Everything observable that the intro writes, sampled once per frame. Raw
 *  float64 values — no rounding — so "identical" means identical.
 *  [0] real time, [1] the (possibly skewed) clock, [2] drawU, [3..7] shells,
 *  [8] stem clip constant, [9] is 'intro-draw' still registered. */
function sample(env, scene) {
  const clip = scene.stemShells[0].material.clippingPlanes;
  let pn;
  try { pn = globalThis.performance.now(); } catch { pn = 'threw'; }
  return [
    env.state.t,
    pn,
    scene.drawU.value,
    scene.stemShells[0].material.opacity,
    scene.stemShells[0].material.transparent ? 1 : 0,
    scene.stemShells[0].visible ? 1 : 0,
    scene.capShells[0].material.opacity,
    scene.capShells[1].material.opacity,
    clip ? clip[0].constant : null,
    scene.animators.has('intro-draw') ? 1 : 0,
  ];
}

const DEFAULTS = {
  intro: 5.4,
  dtMs: 16.6667,
  frames: 420,
  startT: 1000,
  accelAtFrame: 10,
  totalMs: 5400 + 900,   // main.js:1161 passes HERO_INTRO_MS + 900
  rampMs: 480,           // main.js:1162 desktop departMs
  teardownAtFrame: null,
  bombAtFrame: null,
  bombAfterCalls: 2,     // 1 = inside intro-draw, 2 = inside the ramp
};

/** Drive one implementation through a full scenario, returning the frame
 *  trace plus an event log and the final global-clock state. */
function runScenario(setupIntro, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const env = makeEnv();
  const scene = makeScene({ intro: o.intro });
  env.state.t = o.startT;
  const events = [];
  try {
    const api = setupIntro(scene.ctx);
    scene.trace = [sample(env, scene)];   // the pre-first-frame state setupIntro left behind
    for (let i = 0; i < o.frames; i++) {
      if (i === o.accelAtFrame) {
        try { events.push(['accelerate', api.accelerate({ totalMs: o.totalMs, rampMs: o.rampMs })]); }
        catch (e) { events.push(['accelerate-threw', i, e.message]); }
      }
      if (i === o.teardownAtFrame) {
        events.push(['teardown', typeof api.teardown === 'function' ? api.teardown() : 'ABSENT']);
      }
      if (i === o.bombAtFrame) env.state.bomb = o.bombAfterCalls;
      try { env.frame(scene.animators, o.dtMs); }
      catch (e) { events.push(['frame-threw', i, e.message]); env.state.bomb = null; }
      scene.trace.push(sample(env, scene));
    }
    // Post-run global-clock inspection, taken while the doubles are still live.
    const nowIsBase = globalThis.performance.now === env.baseNow;
    env.state.t = 424242.5;
    let readingAfter = null;
    try { readingAfter = globalThis.performance.now(); } catch { readingAfter = 'threw'; }
    return {
      trace: scene.trace, events, api, scene,
      nowIsBase, readingAfter, leak: readingAfter === 424242.5 ? 0 : readingAfter - 424242.5,
      rafInvocations: env.rafInvocations, cancelled: [...env.cancelled],
      pendingAfter: env.pending.size,
      // drawWin(obj) returns the uWin UNIFORM; the intro writes through
      // `.value.set(a, b)`, so the values live one level down. (Reading
      // `uWin.a` here made CHECK 1b compare undefined-to-undefined — a real
      // tautology, caught by the windowShift mutant below.)
      windows: scene.ground.concat(scene.stemDraw, scene.capDraw, scene.sceneDraw)
        .map((d) => [d.material.uniforms.uWin.value.a, d.material.uniforms.uWin.value.b]),
      clampY: scene.stemDraw.map((d) => d.material.uniforms.uClampY.value),
      aDraw: scene.ground.concat(scene.stemDraw).map((d) => d.geometry.attributes.aDraw.drawn.slice()),
      localClipping: scene.renderer.localClippingEnabled,
    };
  } finally {
    env.dispose();
  }
}

/* ================================================================== *
 * CHECK 1-2 — TIMING IDENTITY (the core safety property)             *
 * ================================================================== */
const runCur = runScenario(current.setupIntro);
const runBase = runScenario(baseline.setupIntro);

L.check('scenario is non-trivial: accelerate() engaged in both runs',
  runCur.events[0][1] === true && runBase.events[0][1] === true,
  { current: runCur.events[0], baseline: runBase.events[0] });
L.check('scenario is non-trivial: the trace actually moves (drawU sweeps 0 -> 2 through many intermediates)',
  runCur.trace[0][2] === 0 && runCur.trace[runCur.trace.length - 1][2] === 2
  && new Set(runCur.trace.map((r) => r[2])).size > 25,
  { first: runCur.trace[0][2], last: runCur.trace[runCur.trace.length - 1][2],
    distinctDrawU: new Set(runCur.trace.map((r) => r[2])).size });
L.check('scenario is non-trivial: the ramp really ran on rAF',
  runCur.rafInvocations > 20 && runCur.rafInvocations === runBase.rafInvocations,
  { current: runCur.rafInvocations, baseline: runBase.rafInvocations });

L.same('CHECK 1 — frame-by-frame trace (skewed clock, drawU, shell opacities, stem clip, animator liveness) is byte-identical to HEAD',
  runCur.trace, runBase.trace,
  { frames: runCur.trace.length,
    firstDiff: runCur.trace.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(runBase.trace[i])) });
// Cardinality pins. Without these, an empty or truncated collection would
// compare "identical" to an equally empty one and 1b/1c/1d would assert
// nothing — the same failure mode that made 1b vacuous before the
// windowShift mutant caught it. Pin the counts to what the scene actually
// contains: 20 drawables get a window (7 ground + 3 stem + 8 cap + 2 scene),
// 3 stem drawables get uClampY, 10 objects get re-keyed (7 converge + 3 rise)
// with 6 vertices each.
L.check('CHECK 1b/1c/1d cardinality — the compared collections are fully populated, not empty',
  runCur.windows.length === 20 && runBase.windows.length === 20
  && runCur.windows.every((w) => Number.isFinite(w[0]) && Number.isFinite(w[1]))
  && runCur.clampY.length === 3 && runCur.clampY.every((v) => v === 3.65)
  && runCur.aDraw.length === 10 && runCur.aDraw.every((a) => a.length === 6)
  && runCur.aDraw.some((a) => a.some((v) => v !== 0)),
  { windows: runCur.windows.length, clampY: runCur.clampY, aDrawRows: runCur.aDraw.length,
    aDrawWidths: runCur.aDraw.map((a) => a.length) });
L.same('CHECK 1b — draw windows set on every object are identical to HEAD',
  runCur.windows, runBase.windows);
L.same('CHECK 1c — stem uClampY values are identical to HEAD', runCur.clampY, runBase.clampY);
L.same('CHECK 1d — re-keyed aDraw attributes (convergeDraw/riseDraw) are identical to HEAD',
  runCur.aDraw, runBase.aDraw);
L.check('CHECK 1e — renderer.localClippingEnabled set identically',
  runCur.localClipping === true && runBase.localClipping === true);

// R02_DUMP=1 prints the compared sequences themselves (for the evidence
// write-up), rather than only the verdict.
if (process.env.R02_DUMP) {
  const from = DEFAULTS.accelAtFrame, to = from + 34;
  console.log('--- frames %d..%d, current || HEAD  [realT, clock, drawU, stemOpacity, capOpacity, stemClipC] ---', from, to);
  for (let i = from; i <= to; i++) {
    const c = runCur.trace[i], b = runBase.trace[i];
    const fmt = (r) => `${r[0].toFixed(3)} ${String(r[1]).padStart(20)} ${String(r[2]).padStart(22)} ${String(r[3]).padStart(22)} ${String(r[5]).padStart(22)} ${String(r[8]).padStart(22)}`;
    console.log(`f${String(i).padStart(3)} | ${fmt(c)}\n     | ${fmt(b)}   ${JSON.stringify(c) === JSON.stringify(b) ? '== identical' : '!! DIFFERS'}`);
  }
  console.log('--- end excerpt (full traces: %d frames each, all identical) ---\n', runCur.trace.length);
}

// The same identity, at the mobile ramp (departMs = 220) and with the
// default totalMs, to show it is not an artifact of one parameter set.
for (const variant of [
  { label: 'mobile ramp 220ms', rampMs: 220 },
  { label: 'default totalMs (intro*1000)', totalMs: undefined },
  { label: 'ramp floor (rampMs 10 -> RAMP_MS 80)', rampMs: 10 },
  { label: 'late accelerate, under 200ms left -> declines', accelAtFrame: 380 },
  { label: 'accelerate on the very first frame', accelAtFrame: 0 },
]) {
  const opts = { ...variant };
  delete opts.label;
  if ('totalMs' in opts && opts.totalMs === undefined) delete opts.totalMs;
  const a = runScenario(current.setupIntro, opts);
  const b = runScenario(baseline.setupIntro, opts);
  L.same(`CHECK 2 — trace identical to HEAD (${variant.label})`, a.trace, b.trace,
    { engaged: a.events[0], firstDiff: a.trace.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(b.trace[i])) });
}

// Deferred/frozen paths, where accelerate() must decline and never patch.
{
  const a = runScenario(current.setupIntro, { intro: 0 });
  const b = runScenario(baseline.setupIntro, { intro: 0 });
  L.same('CHECK 2b — intro=0: trace identical to HEAD', a.trace, b.trace);
  L.check('CHECK 2c — intro=0: accelerate() declined and the clock was never patched',
    a.events[0][1] === false && a.nowIsBase === true && a.leak === 0,
    { events: a.events, nowIsBase: a.nowIsBase, leak: a.leak });
}

/* ================================================================== *
 * CHECK 3 — THE PRE-EXISTING DEFECT: HEAD never restores the clock   *
 * ================================================================== */
L.check('CHECK 3 — HEAD leaks the patch: performance.now is NOT the original after the run',
  runBase.nowIsBase === false && runBase.leak !== 0,
  { nowIsBase: runBase.nowIsBase, leakMs: runBase.leak });
L.check('CHECK 3b — and the leak is exactly the settled skew (remaining ms)',
  Math.abs(runBase.leak - (DEFAULTS.totalMs - (DEFAULTS.accelAtFrame * DEFAULTS.dtMs))) < 1e-6,
  { leak: runBase.leak });
L.check('CHECK 3c — HEAD offers no teardown at all',
  typeof runBase.api.teardown === 'undefined' && typeof runCur.api.teardown === 'function');
// HONESTY PIN (R1 review, M2). The success path is the ONLY path that fires
// in production today, because nothing calls teardown() yet. On that path the
// CURRENT build leaks exactly as HEAD does — by design (see the settled-skew
// rationale in intro.js) and, for the interruption path, for want of a caller.
// R02-D1 is therefore only PARTIALLY closed; this pins the open remainder so
// it cannot be quietly overstated in prose.
L.check('CHECK 3d — success path (no teardown): the CURRENT build leaks identically to HEAD — D1 partially open',
  runCur.nowIsBase === false && runBase.nowIsBase === false
  && runCur.leak === runBase.leak && runCur.leak > 0,
  { currentLeakMs: runCur.leak, headLeakMs: runBase.leak,
    note: 'closed on the throw path; open on the success path until teardown() has a caller' });

/* ================================================================== *
 * CHECK 4 — RESTORE ON EVERY EXIT PATH (current only)                *
 * ================================================================== */
// 4a — normal completion: the ramp settles, then teardown().
{
  const r = runScenario(current.setupIntro, { teardownAtFrame: 200 });
  L.check('CHECK 4a — normal completion then teardown(): performance.now is the ORIGINAL function object',
    r.nowIsBase === true, { nowIsBase: r.nowIsBase });
  L.check('CHECK 4a — and reads exactly as an untouched global (zero residual offset)',
    r.leak === 0 && r.readingAfter === 424242.5, { readingAfter: r.readingAfter });
  L.check('CHECK 4a — teardown() reported it undid something, and retired intro-draw',
    r.events.some((e) => e[0] === 'teardown' && e[1] === true)
    && r.trace[201][9] === 0, { events: r.events.filter((e) => e[0] === 'teardown') });
  // runScenario's `finally` already restored the real globals, so the
  // pristine value a second teardown() must not disturb is Node's own
  // performance.now — captured here rather than asserted to be "not
  // undefined", which was vacuous and did not support the assertion's name.
  const nativeNow = globalThis.performance.now;
  const secondCall = r.api.teardown();
  L.check('CHECK 4a — teardown() is idempotent: a second call is a no-op and leaves the original in place',
    secondCall === false && globalThis.performance.now === nativeNow,
    { secondCall, nowUnchanged: globalThis.performance.now === nativeNow });
}
// 4b — interruption partway through the ramp.
{
  const r = runScenario(current.setupIntro, { teardownAtFrame: 13 });
  // The skew at the last sample before teardown must be strictly between 0
  // and `remaining` — i.e. the smoothstep was genuinely mid-ramp, not settled.
  const remaining = DEFAULTS.totalMs - DEFAULTS.accelAtFrame * DEFAULTS.dtMs;
  const skewAtCut = r.trace[13][1] - r.trace[13][0];
  L.check('CHECK 4b — interruption mid-ramp: the ramp was genuinely mid-flight when torn down',
    skewAtCut > 0 && skewAtCut < remaining, { skewAtCut, remaining });
  L.check('CHECK 4b — performance.now restored to the ORIGINAL function object',
    r.nowIsBase === true && r.leak === 0, { nowIsBase: r.nowIsBase, leak: r.leak });
  L.check('CHECK 4b — the pending ramp frame was cancelled, not merely abandoned',
    r.cancelled.length === 1 && r.pendingAfter === 0,
    { cancelled: r.cancelled, pending: r.pendingAfter });
}
// 4c — an exception thrown mid-intro, from inside the ramp.
{
  const r = runScenario(current.setupIntro, { bombAtFrame: 14, bombAfterCalls: 2 });
  const threw = r.events.find((e) => e[0] === 'frame-threw');
  L.check('CHECK 4c — the ramp really threw', !!threw && threw[2] === 'clock bomb', { events: r.events });
  L.check('CHECK 4c — the throw propagated (it was not swallowed)', !!threw);
  L.check('CHECK 4c — performance.now restored to the ORIGINAL function object despite the throw',
    r.nowIsBase === true && r.leak === 0, { nowIsBase: r.nowIsBase, leak: r.leak });
}
// 4d — an exception on the FIRST, synchronous ramp() call inside accelerate().
{
  // Calls to the real clock inside accelerate(): 1 = `lived`, 2 = `rampT0`,
  // 3 = the ramp's own `f`. Arm the bomb for the 3rd so it fires synchronously.
  const env = makeEnv();
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = current.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  env.state.bomb = 3;
  let caught = null;
  try { api.accelerate({ totalMs: 6300, rampMs: 480 }); } catch (e) { caught = e.message; }
  const restored = globalThis.performance.now === env.baseNow;
  env.state.bomb = null;
  env.state.t = 999999;
  const reading = globalThis.performance.now();
  env.dispose();
  L.check('CHECK 4d — a synchronous throw inside accelerate() propagates', caught === 'clock bomb', { caught });
  L.check('CHECK 4d — and still restores the ORIGINAL performance.now',
    restored === true && reading === 999999, { restored, reading });
}

/* ================================================================== *
 * CHECK 5 — IDEMPOTENT INSTALL / RESTORE (createIntroClock directly) *
 * ================================================================== */
{
  const env = makeEnv();
  env.state.t = 500;
  const clock = current.createIntroClock();
  L.check('CHECK 5a — restore() before any install is a safe no-op',
    clock.restore() === false && globalThis.performance.now === env.baseNow);
  L.check('CHECK 5b — install() returns true and takes over performance.now',
    clock.install() === true && globalThis.performance.now !== env.baseNow && clock.installed === true);
  const firstPatch = globalThis.performance.now;
  clock.skew = 100;
  const oneWrap = globalThis.performance.now();
  L.check('CHECK 5c — second install() returns false and does not replace the patch',
    clock.install() === false && globalThis.performance.now === firstPatch);
  L.check('CHECK 5d — no double-wrap: the skew is applied exactly ONCE (600, not 700)',
    globalThis.performance.now() === 600 && oneWrap === 600,
    { after: globalThis.performance.now(), before: oneWrap });
  L.check('CHECK 5e — now() still reports TRUE wall time while patched',
    clock.now() === 500, { got: clock.now() });
  L.check('CHECK 5f — restore() returns true and puts the ORIGINAL function object back',
    clock.restore() === true && globalThis.performance.now === env.baseNow && clock.installed === false);
  L.check('CHECK 5g — restore() a second time is a safe no-op',
    clock.restore() === false && globalThis.performance.now === env.baseNow);
  L.check('CHECK 5h — skew is reset by restore()', clock.skew === 0);
  // A stranger overwrote performance.now while we were installed: drop our
  // state, but do NOT clobber theirs.
  clock.install();
  const foreign = () => 7;
  globalThis.performance.now = foreign;
  L.check('CHECK 5i — restore() does not clobber a foreign patch installed over ours',
    clock.restore() === true && globalThis.performance.now === foreign && clock.installed === false);
  globalThis.performance.now = env.baseNow;
  env.dispose();
}

/* ================================================================== *
 * CHECK 6 — rAF CANCELLATION: no frames after teardown               *
 * ================================================================== */
{
  const env = makeEnv();
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = current.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  api.accelerate({ totalMs: 6300, rampMs: 480 });
  for (let i = 0; i < 4; i++) env.frame(scene.animators, 16.6667);
  const pendingIds = [...env.pending.keys()];
  const before = env.rafInvocations;
  api.teardown();
  for (let i = 0; i < 60; i++) env.frame(scene.animators, 16.6667);
  const after = env.rafInvocations;
  L.check('CHECK 6a — there WAS a pending ramp frame at teardown', pendingIds.length === 1, { pendingIds });
  L.check('CHECK 6b — it was passed to cancelAnimationFrame (genuinely cancelled, not abandoned)',
    env.cancelled.length === 1 && env.cancelled[0] === pendingIds[0],
    { cancelled: env.cancelled, pendingIds });
  L.check('CHECK 6c — ZERO further ramp frames delivered across 60 frames after teardown',
    after === before && env.pending.size === 0, { before, after, pending: env.pending.size });
  L.check('CHECK 6d — and no further intro frames either (intro-draw retired)',
    scene.animators.has('intro-draw') === false);
  env.dispose();
}

/* ================================================================== *
 * CHECK 7 — NO GLOBAL LEAK vs a pristine reference                   *
 * ================================================================== */
{
  const env = makeEnv();
  const pristine = globalThis.performance.now;
  const readings = [];
  for (const t of [0, 1, 1234.5, 99999.125]) { env.state.t = t; readings.push(pristine()); }
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = current.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  api.accelerate({ totalMs: 6300, rampMs: 480 });
  for (let i = 0; i < 120; i++) env.frame(scene.animators, 16.6667);
  api.teardown();
  const after = [];
  for (const t of [0, 1, 1234.5, 99999.125]) { env.state.t = t; after.push(globalThis.performance.now()); }
  L.check('CHECK 7a — performance.now is identical (===) to the reference captured BEFORE install',
    globalThis.performance.now === pristine && globalThis.performance.now === env.baseNow);
  L.same('CHECK 7b — and returns exactly the untouched-global readings', after, readings);
  L.check('CHECK 7c — performance.now is a plain own data property again (not an accessor)',
    (() => { const d = Object.getOwnPropertyDescriptor(globalThis.performance, 'now');
      return !!d && 'value' in d && d.value === pristine; })());
  env.dispose();
}

/* ================================================================== *
 * CHECK 8 — the settled-skew invariant is deliberate, and holds      *
 * ================================================================== */
{
  // Documented design decision: on the SUCCESS path the offset stays. Prove
  // the clock never steps backward across the whole run (monotonic), which is
  // the property that makes keeping it correct.
  let backwards = 0;
  for (let i = 1; i < runCur.trace.length; i++) {
    if (runCur.trace[i][1] < runCur.trace[i - 1][1]) backwards += 1;
  }
  L.check('CHECK 8 — the skewed clock never steps backward during the accelerated run',
    backwards === 0, { backwards });
}

/* ================================================================== *
 * CHECK 9 — NON-TAUTOLOGY TRANSCRIPT                                 *
 * Every assertion above is re-run against a copy of the CURRENT       *
 * implementation with the underlying behavior deliberately broken.    *
 * An assertion that still passes against its mutant is worthless.     *
 * ================================================================== */
function mutate(from, to, label) {
  if (!CURRENT_SOURCE.includes(from)) {
    throw new Error(`mutant "${label}": pattern not found in current source:\n${from}`);
  }
  const out = CURRENT_SOURCE.replace(from, to);
  if (out === CURRENT_SOURCE) throw new Error(`mutant "${label}": replacement was a no-op`);
  return out;
}

const MUTANTS = {
  // M1: perturb the smoothstep. Should break CHECK 1/2 timing identity.
  curve: mutate('remaining * (f * f * (3 - 2 * f))', 'remaining * (f * f * (3 - 2.0001 * f))', 'curve'),
  // M2: restore a RE-WRAPPED equivalent instead of the original object.
  // Numerically indistinguishable — only an identity check catches it.
  rewrap: mutate(
    '      if (performance.now === patch) performance.now = original;',
    '      if (performance.now === patch) { const o = original; performance.now = () => o(); }',
    'rewrap'),
  // M3: drop the install guard, so a second install double-wraps.
  doubleWrap: mutate(
    '      if (patch !== null) return false;\n      original = performance.now;',
    '      original = performance.now;',
    'doubleWrap'),
  // M4: teardown forgets to cancel the pending rAF.
  noCancel: mutate(
    '      cancelAnimationFrame(rampRaf);\n      rampRaf = null;\n      undid = true;',
    '      rampRaf = null;\n      undid = true;',
    'noCancel'),
  // M5: the ramp's catch rethrows without releasing (i.e. HEAD's behavior).
  noReleaseOnThrow: mutate(
    '        // The clock patch must never outlive the loop that drives it.\n        releaseAcceleration();\n        throw err;',
    '        throw err;',
    'noReleaseOnThrow'),
  // M6: teardown restores the clock but leaves intro-draw registered.
  keepAnimator: mutate(
    "    animators.delete('intro-draw');\n    return releaseAcceleration();",
    '    return releaseAcceleration();',
    'keepAnimator'),
  // M7: install BEFORE the `remaining < 200` gate, so a declining
  // accelerate() still patches the global. Should break the
  // "declined => never patched" assertions.
  earlyInstall: mutate(
    '    if (remaining < 200) return false;\n    accelerated = true;\n    introClock.install();',
    '    introClock.install();\n    if (remaining < 200) return false;\n    accelerated = true;',
    'earlyInstall'),
  // M8: restore() loses its not-installed guard, so restoring without
  // installing reports success and assigns a null `original`.
  restoreNoGuard: mutate(
    '      if (patch === null) return false;\n      if (performance.now === patch) performance.now = original;',
    '      if (performance.now === patch) performance.now = original;',
    'restoreNoGuard'),
  // M9: restore() clobbers whatever is installed, including a stranger's.
  clobberForeign: mutate(
    '      if (performance.now === patch) performance.now = original;',
    '      performance.now = original;',
    'clobberForeign'),
  // M10: restore() forgets to clear `patch`, so it is no longer idempotent.
  restoreNotIdempotent: mutate(
    '      real = null;\n      patch = null;\n',
    '      real = null;\n',
    'restoreNotIdempotent'),
  // M14: composite — restore() neither clears `patch` NOR guards the
  // assignment, so a REPEAT teardown reaches in and clobbers the live global
  // with the already-nulled `original`. Needed to show the second conjunct of
  // the CHECK 4a idempotence assertion (…"leaves the original in place") can
  // fail; restoreNotIdempotent alone only breaks the first conjunct.
  restoreRepeatClobbers: (() => {
    const s = mutate('      real = null;\n      patch = null;\n', '      real = null;\n',
      'restoreRepeatClobbers/step1');
    const from = '      if (performance.now === patch) performance.now = original;';
    if (!s.includes(from)) throw new Error('restoreRepeatClobbers/step2: pattern not found');
    return s.replace(from, '      performance.now = original;');
  })(),
  // M11/M12/M13: perturb scene state the identity checks compare, to show
  // CHECK 1b/1c/1d are not comparing constants.
  windowShift: mutate('[capBeads, 0.776, 0.885]', '[capBeads, 0.777, 0.885]', 'windowShift'),
  clampShift: mutate('uClampY.value = 3.65;', 'uClampY.value = 3.6500001;', 'clampShift'),
  aDrawShift: mutate('a.setX(i, (rMax - r) / span);', 'a.setX(i, (rMax - r) / span + 1e-9);', 'aDrawShift'),
};

const loaded = {};
for (const [name, src] of Object.entries(MUTANTS)) loaded[name] = await loadIntro(src, name);

const NT = createLedger('non-tautology (assertion must FAIL against a broken build)');
/** Assert that `fn()` — the same predicate the real check uses — is FALSE for
 *  the mutant. If it is true, the real assertion is a tautology. */
function mustFail(assertionName, mutantName, fn) {
  let passedAgainstMutant;
  try { passedAgainstMutant = !!fn(loaded[mutantName]); }
  catch (e) { passedAgainstMutant = `threw: ${e.message}`; }
  NT.check(`${assertionName}  ⟂  mutant:${mutantName}`, passedAgainstMutant === false,
    { assertionStillPassedAgainstBrokenBuild: passedAgainstMutant });
}

mustFail('CHECK 1 trace identity', 'curve', (m) => {
  const a = runScenario(m.setupIntro);
  return JSON.stringify(a.trace) === JSON.stringify(runBase.trace);
});
mustFail('CHECK 2 trace identity (mobile ramp)', 'curve', (m) => {
  const a = runScenario(m.setupIntro, { rampMs: 220 });
  const b = runScenario(baseline.setupIntro, { rampMs: 220 });
  return JSON.stringify(a.trace) === JSON.stringify(b.trace);
});
mustFail('CHECK 4a original-function-IDENTITY after teardown', 'rewrap', (m) => {
  const r = runScenario(m.setupIntro, { teardownAtFrame: 200 });
  return r.nowIsBase === true;
});
NT.check('…and the rewrap mutant is otherwise numerically perfect (so only the identity check catches it)',
  (() => { const r = runScenario(loaded.rewrap.setupIntro, { teardownAtFrame: 200 });
    return r.leak === 0 && r.readingAfter === 424242.5; })(),
  'if this fails, the rewrap mutant was too crude to prove the point');
mustFail('CHECK 4b restore after interruption', 'rewrap', (m) => {
  const r = runScenario(m.setupIntro, { teardownAtFrame: 13 });
  return r.nowIsBase === true;
});
mustFail('CHECK 4c restore after a throw', 'noReleaseOnThrow', (m) => {
  const r = runScenario(m.setupIntro, { bombAtFrame: 14, bombAfterCalls: 2 });
  return r.nowIsBase === true && r.leak === 0;
});
mustFail('CHECK 4d restore after a synchronous throw', 'noReleaseOnThrow', (m) => {
  const env = makeEnv();
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = m.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  env.state.bomb = 3;
  try { api.accelerate({ totalMs: 6300, rampMs: 480 }); } catch { /* expected */ }
  const restored = globalThis.performance.now === env.baseNow;
  env.state.bomb = null;
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return restored === true;
});
mustFail('CHECK 5d no-double-wrap', 'doubleWrap', (m) => {
  const env = makeEnv();
  env.state.t = 500;
  const clock = m.createIntroClock();
  clock.install();
  clock.install();
  clock.skew = 100;
  const reading = globalThis.performance.now();
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return reading === 600;
});
mustFail('CHECK 6b/6c rAF genuinely cancelled + zero further frames', 'noCancel', (m) => {
  const env = makeEnv();
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = m.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  api.accelerate({ totalMs: 6300, rampMs: 480 });
  for (let i = 0; i < 4; i++) env.frame(scene.animators, 16.6667);
  const before = env.rafInvocations;
  const cancelledBefore = env.cancelled.length;
  api.teardown();
  for (let i = 0; i < 60; i++) env.frame(scene.animators, 16.6667);
  const ok = env.cancelled.length === cancelledBefore + 1 && env.rafInvocations === before;
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return ok;
});
mustFail('CHECK 6d intro-draw retired by teardown', 'keepAnimator', (m) => {
  const env = makeEnv();
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = m.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  api.accelerate({ totalMs: 6300, rampMs: 480 });
  for (let i = 0; i < 4; i++) env.frame(scene.animators, 16.6667);
  api.teardown();
  const ok = scene.animators.has('intro-draw') === false;
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return ok;
});
mustFail('CHECK 7a pristine-reference identity', 'rewrap', (m) => {
  const env = makeEnv();
  const pristine = globalThis.performance.now;
  const scene = makeScene({ intro: 5.4 });
  env.state.t = 1000;
  const api = m.setupIntro(scene.ctx);
  for (let i = 0; i < 5; i++) env.frame(scene.animators, 16.6667);
  api.accelerate({ totalMs: 6300, rampMs: 480 });
  for (let i = 0; i < 120; i++) env.frame(scene.animators, 16.6667);
  api.teardown();
  const ok = globalThis.performance.now === pristine;
  globalThis.performance.now = pristine;
  env.dispose();
  return ok;
});
mustFail('CHECK 2c declined accelerate() never patches the clock', 'earlyInstall', (m) => {
  // A late call (under 200 ms of choreography left) must decline AND leave the
  // global untouched. The mutant declines but patches anyway.
  const r = runScenario(m.setupIntro, { accelAtFrame: 380 });
  return r.events[0][1] === false && r.nowIsBase === true && r.leak === 0;
});
mustFail('CHECK 5a restore() before install is a safe no-op', 'restoreNoGuard', (m) => {
  const env = makeEnv();
  env.state.t = 500;
  const clock = m.createIntroClock();
  const ok = clock.restore() === false && globalThis.performance.now === env.baseNow;
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return ok;
});
mustFail('CHECK 5i restore() does not clobber a foreign patch', 'clobberForeign', (m) => {
  const env = makeEnv();
  env.state.t = 500;
  const clock = m.createIntroClock();
  clock.install();
  const foreign = () => 7;
  globalThis.performance.now = foreign;
  const ok = clock.restore() === true && globalThis.performance.now === foreign;
  globalThis.performance.now = env.baseNow;
  env.dispose();
  return ok;
});
mustFail('CHECK 4a teardown() idempotence — first conjunct (returns false)', 'restoreNotIdempotent', (m) => {
  // runScenario's finally already disposed the doubles, so this second
  // teardown() runs against the real global — and must be a pure no-op.
  const r = runScenario(m.setupIntro, { teardownAtFrame: 200 });
  const nativeNow = globalThis.performance.now;
  const ok = r.api.teardown() === false && globalThis.performance.now === nativeNow;
  globalThis.performance.now = nativeNow;
  return ok;
});
mustFail('CHECK 4a teardown() idempotence — second conjunct (leaves the original in place)',
  'restoreRepeatClobbers', (m) => {
    const r = runScenario(m.setupIntro, { teardownAtFrame: 200 });
    const nativeNow = globalThis.performance.now;
    const secondCall = r.api.teardown();
    const ok = secondCall === false && globalThis.performance.now === nativeNow;
    globalThis.performance.now = nativeNow;   // undo the mutant's clobber
    return ok;
  });
// The cardinality pin guards the HARNESS, not the subject, so its injection
// proof perturbs the collected result rather than the source: an empty or
// truncated collection must fail the pin (that is precisely how CHECK 1b was
// silently vacuous before windowShift caught it).
NT.check('CHECK 1b/1c/1d cardinality pin  ⟂  emptied collections',
  (() => {
    const pin = (w, c, a) => w.length === 20 && w.every((x) => Number.isFinite(x[0]))
      && c.length === 3 && a.length === 10 && a.every((r) => r.length === 6);
    const realPasses = pin(runCur.windows, runCur.clampY, runCur.aDraw);
    const emptyFails = !pin([], [], []);
    const truncatedFails = !pin(runCur.windows.slice(0, 5), runCur.clampY, runCur.aDraw);
    const undefinedFails = !pin(runCur.windows.map(() => [undefined, undefined]),
      runCur.clampY, runCur.aDraw);
    return realPasses && emptyFails && truncatedFails && undefinedFails;
  })(),
  'the pin must accept the real collections and reject empty/truncated/undefined ones');
mustFail('CHECK 1b draw-window identity', 'windowShift', (m) => {
  const a = runScenario(m.setupIntro);
  return JSON.stringify(a.windows) === JSON.stringify(runBase.windows);
});
mustFail('CHECK 1c uClampY identity', 'clampShift', (m) => {
  const a = runScenario(m.setupIntro);
  return JSON.stringify(a.clampY) === JSON.stringify(runBase.clampY);
});
mustFail('CHECK 1d aDraw re-keying identity', 'aDrawShift', (m) => {
  const a = runScenario(m.setupIntro);
  return JSON.stringify(a.aDraw) === JSON.stringify(runBase.aDraw);
});
// The HEAD implementation is a natural mutant for the leak assertions.
mustFail('CHECK 4a restore-on-completion (vs HEAD, which never restores)', 'curve', () => {
  const r = runScenario(baseline.setupIntro, { teardownAtFrame: 200 });
  return r.nowIsBase === true;
});
mustFail('CHECK 3/7 no-leak (vs HEAD, the natural mutant)', 'curve', () => {
  const r = runScenario(baseline.setupIntro);
  return r.nowIsBase === true && r.leak === 0;
});

const ntFailed = NT.report();
console.log('');
const failed = L.report();
console.log('');
if (ntFailed) console.log(`${ntFailed} assertion(s) survived their mutant — those assertions are tautological.`);
process.exit(failed + ntFailed ? 1 : 0);
