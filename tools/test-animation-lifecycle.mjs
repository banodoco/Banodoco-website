// R01 — organism/animation.js lifecycle: addAnimator's removal handle and
// start()'s new stop handle. Run with: node tools/test-animation-lifecycle.mjs
//
// This is a behavior-preservation order: the frame loop's per-frame logic
// (animator invocation order, dt computation/clamping, rAF scheduling
// cadence) must be byte-for-byte identical to what shipped at the run's
// starting HEAD. Rather than trust a read of the diff, this file loads BOTH
// the pre-change implementation (via `git show HEAD:organism/animation.js`,
// i.e. this run's starting point, before R01 touched the file) and the
// current working-tree implementation, each into its own temp copy OUTSIDE
// the repo (so neither can accidentally resolve the other's sibling files),
// rewrites only the `from 'three'` bare specifier to the real vendored
// module (mirroring the technique C01/C04 used for journey.js/portraits.js
// — see their READMEs), and runs both side by side against the exact same
// injected requestAnimationFrame/cancelAnimationFrame/performance.now
// doubles. No browser, no jsdom: organism/animation.js only ever touches
// three globals (`requestAnimationFrame`, `cancelAnimationFrame`,
// `performance.now` via THREE.Clock) and this file supplies deterministic
// fakes for all three.
//
// Checks 1-2 (order, dt) run BOTH implementations and diff their traces.
// Checks 3-7 exercise only the current implementation's new surface
// (removal handle identity-scoping, stop handle) since that surface did not
// exist before this order — check 4 additionally re-runs the classic-bug
// scenario against the BASELINE implementation to show the bug is real
// there and fixed here (a genuine perturbation-style contrast).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite staged into a fresh            *
 * os.tmpdir() directory per module load - 2 per run - and removed none   *
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
const STAGE_ROOT = mkdtempSync(join(tmpdir(), 'r01-animation-'));
process.on('exit', () => {
  try { rmSync(STAGE_ROOT, { recursive: true, force: true }); } catch { /* best effort */ }
});
const THREE_URL = pathToFileURL(join(REPO_ROOT, 'vendor/three/three.module.js')).href;

// QA-02 TIME BOMB FIX: this run's starting commit, pinned explicitly.
// `git show HEAD:...` used to be read here, but HEAD is a MOVING ref — the
// moment this run's own changes are committed, HEAD advances to include
// them, BASELINE_SOURCE and CURRENT_SOURCE become byte-identical, the line
// 95 sanity check flips to false, and check4c's BASELINE half stops
// reproducing the classic stale-handle bug entirely (it would load the
// FIXED implementation on both sides). Pinning this SHA instead of HEAD is
// the fix — do not revert this back to `HEAD:organism/animation.js`.
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

/* ------------------------------------------------------------------ *
 * Minimal self-contained ledger (no dependency on other orders' test  *
 * infra — this file owns its own reporting).                         *
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

const L = createLedger('animation lifecycle');

/* ------------------------------------------------------------------ *
 * Load a copy of organism/animation.js from an arbitrary text source  *
 * (working tree or `git show HEAD:...`) into a temp dir OUTSIDE the   *
 * repo, with only the 'three' bare specifier rewritten to the real    *
 * vendored file. Returns the imported module's                       *
 * `createAnimationLifecycle` export.                                 *
 * ------------------------------------------------------------------ */
async function loadImplementation(source, label) {
  const marker = "from 'three'";
  if (!source.includes(marker)) {
    throw new Error(`${label}: expected to find ${marker} in source — rewrite target missing`);
  }
  const rewritten = source.replace(marker, `from '${THREE_URL}'`);
  const dir = mkdtempSync(join(STAGE_ROOT, 'load-'));
  const file = join(dir, `animation-${label}.mjs`);
  writeFileSync(file, rewritten, 'utf8');
  const mod = await import(pathToFileURL(file).href);
  return mod.createAnimationLifecycle;
}

const CURRENT_SOURCE = execFileSync('cat', [join(REPO_ROOT, 'organism/animation.js')], { encoding: 'utf8' });
// Pinned to RUN_START_SHA, not HEAD — see the comment above its definition.
const BASELINE_SOURCE = execFileSync('git', ['show', `${RUN_START_SHA}:organism/animation.js`], { cwd: REPO_ROOT, encoding: 'utf8' });

L.check('baseline source differs from current (sanity: the diff is real)',
  BASELINE_SOURCE !== CURRENT_SOURCE);

const createCurrent = await loadImplementation(CURRENT_SOURCE, 'current');
const createBaseline = await loadImplementation(BASELINE_SOURCE, 'baseline');

/* ------------------------------------------------------------------ *
 * Fakes: rAF/cAF double and a controllable performance.now() clock.   *
 * ------------------------------------------------------------------ */
function installRafDouble() {
  let nextId = 1;
  const pending = new Map(); // id -> callback
  const rafCalls = [];
  const cafCalls = [];
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (cb) => {
    const id = nextId++;
    pending.set(id, cb);
    rafCalls.push(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cafCalls.push(id);
    pending.delete(id);
  };
  return {
    rafCalls, cafCalls, pending,
    /** Fire the earliest still-pending frame, as a real rAF would. Returns
     *  the id fired, or null if nothing is pending (e.g. cancelled). */
    fireNext() {
      const ids = [...pending.keys()].sort((a, b) => a - b);
      if (ids.length === 0) return null;
      const id = ids[0];
      const cb = pending.get(id);
      pending.delete(id);
      cb();
      return id;
    },
    restore() {
      globalThis.requestAnimationFrame = prevRaf;
      globalThis.cancelAnimationFrame = prevCaf;
    },
  };
}

/** Installs a performance.now() that yields exactly the given ms sequence,
 *  one value per call, in order. Throws if exhausted (so a test that reads
 *  more frames than it planned for fails loudly instead of silently
 *  reusing stale values). */
function installClockDouble(msSequence) {
  const prevNow = globalThis.performance.now;
  let i = 0;
  globalThis.performance.now = () => {
    if (i >= msSequence.length) {
      throw new Error(`clock double exhausted after ${msSequence.length} calls`);
    }
    return msSequence[i++];
  };
  return {
    callsMade: () => i,
    restore() { globalThis.performance.now = prevNow; },
  };
}

/** Runs `frames` animate() cycles (the first via start()'s own synchronous
 *  first call, the rest via the raf double's fireNext()) and returns the
 *  stop handle plus whatever the caller's animators recorded. */
function runFrames(lifecycle, raf, frames) {
  const stop = lifecycle.start();
  for (let i = 1; i < frames; i++) raf.fireNext();
  return stop;
}

/* ==================================================================== *
 * 1 & 2. ORDER PRESERVATION and dt IDENTITY — baseline vs. current      *
 * ==================================================================== */
{
  // Same ms sequence for both runs: frame1's reading is discarded by
  // THREE.Clock (elapsedTime starts at 0 regardless of the value read), so
  // its value is arbitrary; frames 2-5 are spaced to exercise the normal
  // case, the 0.05s clamp (a stall), and the 0-clamp (clock stepping
  // backward) in the same run.
  const MS = [
    1000,      // frame 1 (discarded by Clock.start())
    1016.667,  // frame 2: dt = 0.016667s (normal 60fps step)
    1033.333,  // frame 3: dt = 0.016667s
    1300,      // frame 4: dt = (1300-1033.333)/1000 = 0.266667s -> clamped to 0.05
    1290,      // frame 5: dt = (1290-1300)/1000 = -0.01s -> clamped to 0
  ];

  function traceOneImplementation(createFn) {
    const raf = installRafDouble();
    const clock = installClockDouble(MS);
    const order = [];
    const dts = [];
    const ts = [];
    const beforeRenderCalls = [];
    const renderCalls = [];
    const lifecycle = createFn({
      beforeRender: () => beforeRenderCalls.push(true),
      render: () => renderCalls.push(true),
    });
    lifecycle.addAnimator('A', (t, dt) => { order.push('A'); dts.push(dt); ts.push(t); });
    lifecycle.addAnimator('B', () => { order.push('B'); });
    lifecycle.addAnimator('C', () => { order.push('C'); });
    runFrames(lifecycle, raf, MS.length);
    raf.restore();
    clock.restore();
    return { order, dts, ts, beforeRenderCalls: beforeRenderCalls.length, renderCalls: renderCalls.length, rafCalls: raf.rafCalls.length };
  }

  const baselineTrace = traceOneImplementation(createBaseline);
  const currentTrace = traceOneImplementation(createCurrent);

  // ---- Check 1: order preservation, pinned exact sequence ----
  const expectedPerFrameOrder = ['A', 'B', 'C'];
  const expectedOrder = Array(MS.length).fill(expectedPerFrameOrder).flat();
  L.same('check1: baseline invocation order matches pinned A,B,C-per-frame sequence',
    baselineTrace.order, expectedOrder);
  L.same('check1: current invocation order matches pinned A,B,C-per-frame sequence',
    currentTrace.order, expectedOrder);
  L.same('check1: baseline and current invocation order are identical to each other',
    currentTrace.order, baselineTrace.order);

  // ---- Check 2: dt identity ----
  const expectedDts = [0, 0.016667, 0.016667, 0.05, 0];
  // float tolerance for the two 1/60s steps (0.016667 has rounding), exact
  // for the clamped values.
  function closeEnough(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; }
  // QA-02 P2: `.every()` alone passes for any PREFIX of expectedDts and is
  // vacuously true on `[]` — length must be pinned alongside it, or a
  // truncated/empty dts array would slip through unnoticed.
  L.check('check2: baseline dt sequence matches expected (incl. 0.05 clamp and 0-floor)',
    baselineTrace.dts.length === expectedDts.length
      && baselineTrace.dts.every((d, i) => closeEnough(d, expectedDts[i])),
    { got: baselineTrace.dts, expected: expectedDts });
  L.check('check2: current dt sequence matches expected (incl. 0.05 clamp and 0-floor)',
    currentTrace.dts.length === expectedDts.length
      && currentTrace.dts.every((d, i) => closeEnough(d, expectedDts[i])),
    { got: currentTrace.dts, expected: expectedDts });
  L.check('check2: baseline and current dt sequences are byte-identical (JSON compare)',
    JSON.stringify(currentTrace.dts) === JSON.stringify(baselineTrace.dts),
    { current: currentTrace.dts, baseline: baselineTrace.dts });
  L.check('check2: baseline and current t (elapsed) sequences are byte-identical',
    JSON.stringify(currentTrace.ts) === JSON.stringify(baselineTrace.ts),
    { current: currentTrace.ts, baseline: baselineTrace.ts });

  // ---- rAF cadence + beforeRender/render call counts unchanged ----
  L.same('rAF scheduling cadence unchanged (one requestAnimationFrame call per animate())',
    currentTrace.rafCalls, baselineTrace.rafCalls);
  L.same('rAF calls made == frame count', currentTrace.rafCalls, MS.length);
  L.same('beforeRender()/render() called once per frame, current == baseline',
    [currentTrace.beforeRenderCalls, currentTrace.renderCalls],
    [baselineTrace.beforeRenderCalls, baselineTrace.renderCalls]);
}

/* ==================================================================== *
 * 3. HANDLE REMOVES EXACTLY ONE                                        *
 * ==================================================================== */
{
  const raf = installRafDouble();
  const clock = installClockDouble([0, 16.667, 33.333]);
  const order = [];
  const lifecycle = createCurrent({ beforeRender() {}, render() {} });
  lifecycle.addAnimator('A', () => order.push('A'));
  const handleB = lifecycle.addAnimator('B', () => order.push('B'));
  lifecycle.addAnimator('C', () => order.push('C'));

  runFrames(lifecycle, raf, 1); // frame 1: all three present
  handleB();                    // remove B between frame 1 and frame 2
  raf.fireNext();                // frame 2: A, C only

  raf.restore();
  clock.restore();

  L.same('check3: frame 1 runs A, B, C in registration order',
    order.slice(0, 3), ['A', 'B', 'C']);
  L.same('check3: after removing B, frame 2 runs only A, C, in the same relative order',
    order.slice(3), ['A', 'C']);
  L.check('check3: B never appears again after removal', !order.slice(3).includes('B'));
}

/* ==================================================================== *
 * 4. IDEMPOTENT REMOVAL + STALE-HANDLE / SAME-NAME SAFETY               *
 * ==================================================================== */
{
  // 4a. Calling a handle twice is safe (no throw, no double-effect since
  // the animator is simply gone after the first call).
  {
    const lifecycle = createCurrent({ beforeRender() {}, render() {} });
    lifecycle.addAnimator('A', () => {});
    const handle = lifecycle.addAnimator('X', () => {});
    L.check('check4a: animator X present before removal', lifecycle.animators.has('X'));
    handle();
    L.check('check4a: animator X gone after first removal', !lifecycle.animators.has('X'));
    let threw = false;
    try { handle(); } catch { threw = true; }
    L.check('check4a: calling the handle a second time does not throw', !threw);
    L.check('check4a: second call has no further effect (still gone, A untouched)',
      !lifecycle.animators.has('X') && lifecycle.animators.has('A'));
  }

  // 4b. A stale handle after the scheduler has stopped is safe.
  {
    const raf = installRafDouble();
    const clock = installClockDouble([0, 16.667]);
    const lifecycle = createCurrent({ beforeRender() {}, render() {} });
    const handle = lifecycle.addAnimator('Y', () => {});
    const stop = runFrames(lifecycle, raf, 1);
    stop();
    raf.restore();
    clock.restore();
    let threw = false;
    try { handle(); } catch { threw = true; }
    L.check('check4b: calling a removal handle after stop() does not throw', !threw);
    L.check('check4b: it still removed its own animator (Y gone)', !lifecycle.animators.has('Y'));
  }

  // 4c. THE CLASSIC BUG: a handle from an OLDER registration under the same
  // name must not remove a NEWER registration that replaced it. Proven two
  // ways — first showing the baseline implementation actually has this bug
  // (contrast), then showing the current implementation does not.
  {
    const orderCalls = [];
    const lifecycleBaseline = createBaseline({ beforeRender() {}, render() {} });
    const staleHandle = lifecycleBaseline.addAnimator('Z', () => orderCalls.push('old-Z'));
    // Re-register 'Z' under the same name with a different callback — this
    // is the documented "second addAnimator with the same name replaces
    // the callback in place" behavior (see organism.js/journey.js comments).
    lifecycleBaseline.addAnimator('Z', () => orderCalls.push('new-Z'));
    staleHandle(); // the OLD handle, obtained before the re-registration
    L.check('check4c BASELINE reproduces the classic bug: stale handle removed the NEWER registration',
      !lifecycleBaseline.animators.has('Z'),
      { note: 'this is the defect pattern R01 is fixing in the current implementation, not a regression — baseline behavior only, unmodified' });

    // Distinguishable callbacks, exactly as the BASELINE half above uses
    // old-Z/new-Z — QA-02 T1: the previous version used two anonymous
    // no-ops here, so "identity" was unobservable and the check below only
    // ever tested presence (already covered by the `.has('Z')` check).
    // Asymmetric contrast pair (patterns.md Engine 4): whatever makes the
    // negative case (BASELINE, above) legible must be applied to the
    // positive case too.
    const orderCallsCurrent = [];
    const lifecycleCurrent = createCurrent({ beforeRender() {}, render() {} });
    const staleHandle2 = lifecycleCurrent.addAnimator('Z', () => orderCallsCurrent.push('old-Z'));
    lifecycleCurrent.addAnimator('Z', () => orderCallsCurrent.push('new-Z'));
    staleHandle2();
    L.check('check4c CURRENT fixes the classic bug: stale handle leaves the NEWER registration intact',
      lifecycleCurrent.animators.has('Z'));
    // Actually invoke the live callback and observe which one ran — this is
    // the identity check the name promises, not a presence check restated.
    lifecycleCurrent.animators.get('Z')();
    L.same('check4c CURRENT: the live callback under Z is still the newer one (identity, not just presence)',
      orderCallsCurrent, ['new-Z']);
  }
}

/* ==================================================================== *
 * 5. STOP CANCELS rAF (genuinely — cancelAnimationFrame called with the *
 *    correct pending id, and no further frames are delivered)          *
 * ==================================================================== */
{
  const raf = installRafDouble();
  const clock = installClockDouble([0, 16.667, 33.333, 50]);
  const frameLog = [];
  const lifecycle = createCurrent({ beforeRender() {}, render() {} });
  lifecycle.addAnimator('A', () => frameLog.push('A'));

  const stop = lifecycle.start(); // frame 1 runs synchronously; schedules id 1 for frame 2
  const pendingIdAfterFrame1 = raf.rafCalls[raf.rafCalls.length - 1];
  L.same('check5: exactly one rAF id pending after frame 1', pendingIdAfterFrame1, 1);

  stop();
  L.same('check5: cancelAnimationFrame was called exactly once', raf.cafCalls.length, 1);
  L.same('check5: cancelAnimationFrame was called with the pending frame-2 id',
    raf.cafCalls[0], pendingIdAfterFrame1);
  L.check('check5: the pending frame is actually gone from the scheduler (double\'s pending map)',
    !raf.pending.has(pendingIdAfterFrame1));

  const firedAfterStop = raf.fireNext();
  L.same('check5: no further frame can be delivered after stop (fireNext returns null)', firedAfterStop, null);
  L.same('check5: animator A only ran once (frame 1), never again after stop', frameLog, ['A']);

  raf.restore();
  clock.restore();
}

/* ==================================================================== *
 * 6. IDEMPOTENT STOP                                                    *
 * ==================================================================== */
{
  const raf = installRafDouble();
  const clock = installClockDouble([0, 16.667]);
  const lifecycle = createCurrent({ beforeRender() {}, render() {} });
  lifecycle.addAnimator('A', () => {});
  const stop = lifecycle.start();

  stop();
  const cafCountAfterFirstStop = raf.cafCalls.length;
  let threw = false;
  try { stop(); } catch { threw = true; }
  raf.restore();
  clock.restore();

  L.check('check6: calling stop() a second time does not throw', !threw);
  L.same('check6: calling stop() a second time makes no further cancelAnimationFrame call',
    raf.cafCalls.length, cafCountAfterFirstStop);
}

/* ==================================================================== *
 * 7. EXISTING CALLERS UNAFFECTED — ignoring the return values changes   *
 *    nothing about the frame loop's behavior.                          *
 * ==================================================================== */
{
  const MS = [0, 16.667, 33.333];
  function traceIgnoringReturnValues(createFn) {
    const raf = installRafDouble();
    const clock = installClockDouble(MS);
    const order = [];
    const dts = [];
    const lifecycle = createFn({ beforeRender() {}, render() {} });
    // Deliberately discard addAnimator's return value, exactly as every
    // real caller in the repo does today (organism.js, journey.js,
    // journey/chapters/**, organism/intro.js, organism/spores.js,
    // organism/furniture.js, tools/scrollprobe.js — grepped, none capture
    // it).
    lifecycle.addAnimator('A', (t, dt) => { order.push('A'); dts.push(dt); });
    lifecycle.addAnimator('B', () => order.push('B'));
    // Deliberately discard start()'s return value too, exactly as
    // organism.js's `animationLifecycle.start();` does today (organism.js
    // line ~1834 — no assignment).
    runFrames(lifecycle, raf, MS.length);
    raf.restore();
    clock.restore();
    return { order, dts };
  }

  const baselineTrace = traceIgnoringReturnValues(createBaseline);
  const currentTrace = traceIgnoringReturnValues(createCurrent);
  L.same('check7: order is identical whether or not the caller uses the return values',
    currentTrace.order, baselineTrace.order);
  L.same('check7: dt sequence is identical whether or not the caller uses the return values',
    currentTrace.dts, baselineTrace.dts);
}

/* ==================================================================== *
 * 8. DUPLICATE-NAME REGISTRATION SEMANTICS — documented today, must     *
 *    stay unchanged: a second addAnimator(name, fn) call replaces the   *
 *    callback IN PLACE (same Map key => same insertion-order slot),     *
 *    it does not move to the end and does not create a second entry.    *
 * ==================================================================== */
{
  function traceDuplicateName(createFn) {
    const order = [];
    const lifecycle = createFn({ beforeRender() {}, render() {} });
    lifecycle.addAnimator('first', () => order.push('first'));
    lifecycle.addAnimator('dup', () => order.push('dup-v1'));
    lifecycle.addAnimator('last', () => order.push('last'));
    lifecycle.addAnimator('dup', () => order.push('dup-v2')); // re-register mid-list, same name
    for (const [, fn] of lifecycle.animators) fn();
    return { order, size: lifecycle.animators.size, keys: [...lifecycle.animators.keys()] };
  }
  const baselineDup = traceDuplicateName(createBaseline);
  const currentDup = traceDuplicateName(createCurrent);
  const expectedKeys = ['first', 'dup', 'last']; // 'dup' keeps its ORIGINAL slot (2nd), not moved to the end
  L.same('check8: baseline — duplicate name replaces in place, keeps its original slot',
    baselineDup.keys, expectedKeys);
  L.same('check8: current — duplicate name replaces in place, keeps its original slot (unchanged)',
    currentDup.keys, expectedKeys);
  L.same('check8: baseline — only the NEW callback for "dup" runs, not the old one',
    baselineDup.order, ['first', 'dup-v2', 'last']);
  L.same('check8: current — only the NEW callback for "dup" runs, not the old one (unchanged)',
    currentDup.order, ['first', 'dup-v2', 'last']);
  L.same('check8: registry never grows past the number of distinct names (no leak from re-registration)',
    currentDup.size, 3);
}

process.exitCode = L.report() === 0 ? 0 : 1;
