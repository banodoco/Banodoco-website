// tools/test-card-warming.mjs
//
// Focused test for journey/cards/index.js's U01a change: the idle-time card
// warming cascade (fonts -> light images -> heavy video) moved from a bare
// import-time `setTimeout(warmCardAssets, 1500)` to an explicit, cancellable
// owner: `export function startCardWarming(overrides)`, returning a cancel
// handle. No browser, no jsdom -- every clock/idle/fetch/document dependency
// is injected via `overrides`, and the module's own import-time self-start
// (which U01a deliberately preserves) is proven inert in a plain Node
// process where `document` is genuinely undefined.
//
// Covers, in order:
//   A. Import-time guard: importing the real module with no ambient
//      `document` schedules nothing (the pre-existing guard still holds).
//   B. Behavior of startCardWarming() via a fully deterministic fake
//      clock/idle scheduler:
//        B1. the RIC-absent / setTimeout(400) fallback path (delay, order,
//            pacing, asset set)
//        B2. the RIC-present path (an injected requestIdleCallbackFn),
//            proving the same order/pacing when the real browser API would
//            be used
//        B3. cancel-before-fire: zero fetches ever happen
//        B4. cancel-mid-cascade: remaining slices stop; already-issued
//            fetches are not required to (and are not) aborted
//        B5. cancel is idempotent (double-cancel, cancel-after-completion)
//   C. Cross-check against the PRE-CHANGE implementation: the exact bytes
//      of journey/cards/index.js and journey/cards/runtime.js at HEAD
//      (fetched via `git show`, not retyped) are written into a directory
//      OUTSIDE this repo, alongside null-builder stubs for the other five
//      card modules (a legitimate substitution under this file's own
//      documented contract: "A module still under construction exports
//      null"). That pre-change module is executed for real, with the same
//      kind of synchronous global doubles, and its captured delay sequence
//      and font/fetch call sequence are compared byte-for-byte against the
//      new module's B1 run.
//
// Run directly: node tools/test-card-warming.mjs
// (not yet wired into package.json's test:contracts -- a concurrent order
// owns that file; see the report for the reviewer.)

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REAL_MODULE_PATH = path.join(REPO_ROOT, 'journey/cards/index.js');

// QA-02 TIME BOMB FIX: this run's starting commit, pinned explicitly.
// `git show HEAD:...` used to be read below, but HEAD is a MOVING ref --
// this order's own changes to journey/cards/index.js are still uncommitted,
// so today HEAD still points at the pre-change bare-setTimeout
// implementation and the cross-check passes. The moment this run's work is
// committed, HEAD advances past the change, the "sanity" check that the
// fetched HEAD copy is genuinely pre-change would start failing, and the
// Part C cross-check would be diffing the new implementation against
// itself. Pinning this SHA instead of HEAD is the fix -- do not revert this
// back to `HEAD:journey/cards/index.js` / `HEAD:journey/cards/runtime.js`.
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

let failures = 0;
function check(condition, msg) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`  ok - ${msg}`);
  }
}

// A fully deterministic fake setTimeout/clearTimeout pair. This module's
// warming logic only ever has 0 or 1 timer pending at a time (each step
// schedules the next only once the previous has fired), so `fireAll` just
// drains whatever is pending, recursively, until nothing is left.
function makeFakeScheduler() {
  let nextId = 1;
  const pending = new Map(); // id -> fn
  const calls = []; // { id, delay } in schedule order
  const setTimeoutFn = (fn, delay) => {
    const id = nextId++;
    pending.set(id, fn);
    calls.push({ id, delay });
    return id;
  };
  const clearTimeoutFn = (id) => {
    pending.delete(id);
  };
  const fireAll = () => {
    while (pending.size > 0) {
      const [id, fn] = pending.entries().next().value;
      pending.delete(id);
      fn();
    }
  };
  const fireOne = () => {
    const entry = pending.entries().next().value;
    if (!entry) return false;
    const [id, fn] = entry;
    pending.delete(id);
    fn();
    return true;
  };
  return { setTimeoutFn, clearTimeoutFn, calls, pending, fireAll, fireOne };
}

function makeDoubles() {
  const fontsLoaded = [];
  const fetchCalls = [];
  const doc = {
    fonts: {
      load: (spec) => {
        fontsLoaded.push(spec);
        return Promise.resolve();
      },
    },
  };
  const fetchFn = (url) => {
    fetchCalls.push(url);
    return Promise.resolve();
  };
  return { fontsLoaded, fetchCalls, doc, fetchFn };
}

async function main() {
  console.log('-- A. import-time guard (document undefined) --');
  assert.equal(typeof document, 'undefined', 'precondition: this Node process has no ambient document');
  let ambientSetTimeoutCalls = 0;
  const realSetTimeout = global.setTimeout;
  global.setTimeout = (...args) => {
    ambientSetTimeoutCalls++;
    return realSetTimeout(...args);
  };
  const realModule = await import(pathToFileURL(REAL_MODULE_PATH).href);
  global.setTimeout = realSetTimeout;
  check(
    ambientSetTimeoutCalls === 0,
    'importing journey/cards/index.js with no ambient document schedules zero timers (guard holds, import stays inert)'
  );
  check(typeof realModule.startCardWarming === 'function', 'module exports startCardWarming');

  const { startCardWarming } = realModule;

  console.log('-- B1. RIC-absent fallback path: delay, order, pacing, asset set --');
  const sch1 = makeFakeScheduler();
  const d1 = makeDoubles();
  startCardWarming({
    setTimeoutFn: sch1.setTimeoutFn,
    clearTimeoutFn: sch1.clearTimeoutFn,
    fetchFn: d1.fetchFn,
    doc: d1.doc,
    // requestIdleCallbackFn intentionally omitted -- exercises the ambient
    // `typeof requestIdleCallback === 'function'` check, which is false in
    // plain Node, so the module must fall back to setTimeoutFn(fn, 400).
  });
  check(sch1.calls.length === 1, 'exactly one timer scheduled at start()');
  check(sch1.calls[0].delay === 1500, `start timer delay is exactly 1500ms (got ${sch1.calls[0]?.delay})`);
  sch1.fireAll();

  const fontsCount = d1.fontsLoaded.length;
  const fetchCount = d1.fetchCalls.length;
  // QA-02 P3: the warmed asset-set size was pinned nowhere -- only
  // `> 0` -- so halving the set (e.g. 21 -> 10 assets) still satisfied
  // every check downstream, including the derived expectedTimerCount
  // relation below (Part C's cross-check is differential against HEAD, so
  // both sides shrink together and would not catch it either). Absolute
  // literal pins anchor the relation to the actual current values.
  check(fontsCount === 6, `fonts were warmed -- exactly 6 (got ${fontsCount})`);
  check(fetchCount === 20, `assets were fetched -- exactly 20 (got ${fetchCount})`);

  // fonts -> light -> heavy: once a .mp4 URL appears, every URL after it
  // must also be .mp4 (heavy strictly follows light; nothing interleaves).
  let sawHeavy = false;
  let orderOk = true;
  for (const url of d1.fetchCalls) {
    const isHeavy = url.endsWith('.mp4');
    if (isHeavy) sawHeavy = true;
    else if (sawHeavy) orderOk = false;
  }
  check(orderOk, 'no light asset is fetched after the first heavy (.mp4) asset -- light strictly precedes heavy');
  check(sawHeavy, 'at least one heavy (.mp4) asset was fetched');
  check(
    d1.fontsLoaded.every((spec) => typeof spec === 'string' && spec.startsWith("1em '")),
    'all font warms use the documented `1em \'<family>\'` spec'
  );

  // Exactly one timer per job in the queue (fonts-job counts as one job,
  // even though it loops over every font internally), plus the initial
  // 1500ms timer, plus one final "queue empty" timer that runs and returns
  // without scheduling further.
  const totalJobs = 1 /* fonts job */ + d1.fetchCalls.length;
  const expectedTimerCount = 1 /* initial 1500ms */ + totalJobs /* one per job, each schedules the next */ + 1 /* final empty check */;
  check(
    sch1.calls.length === expectedTimerCount,
    `total scheduled timers (${sch1.calls.length}) matches 1 job-runner per queued job + the initial timer + the final empty check (expected ${expectedTimerCount})`
  );
  check(
    sch1.calls.slice(1).every((c) => c.delay === 400),
    'every idle-fallback slice is paced at exactly setTimeout(fn, 400) -- identical to the pre-change fallback'
  );

  console.log('-- B2. RIC-present path: same order/pacing when requestIdleCallback exists --');
  const sch2 = makeFakeScheduler();
  const d2 = makeDoubles();
  const ricCalls = [];
  const fakeRic = (fn) => {
    // A minimal requestIdleCallback double: schedule via the same fake
    // timer so we can drive it deterministically, but record that THIS
    // path (not the setTimeout(400) fallback) was used.
    ricCalls.push(fn);
    return sch2.setTimeoutFn(fn, 0); // real RIC has no fixed "delay"; 0 here is just a marker
  };
  startCardWarming({
    setTimeoutFn: sch2.setTimeoutFn,
    clearTimeoutFn: sch2.clearTimeoutFn,
    fetchFn: d2.fetchFn,
    doc: d2.doc,
    requestIdleCallbackFn: fakeRic,
  });
  check(sch2.calls[0].delay === 1500, 'RIC-present path still starts exactly 1500ms after start()');
  sch2.fireAll();
  // One ric(step) call per queued job, plus one final call whose step()
  // finds the queue empty and returns without doing work -- same shape as
  // the setTimeout-fallback timer count in B1 (expectedTimerCount - 1,
  // since RIC-present has no separate "initial 1500ms" entry in ricCalls).
  check(
    ricCalls.length === totalJobs + 1,
    `requestIdleCallbackFn (not the setTimeout fallback) drove all ${totalJobs} job slices plus the final empty-queue check (expected ${totalJobs + 1}, got ${ricCalls.length})`
  );
  assert.deepEqual(d2.fontsLoaded, d1.fontsLoaded, 'RIC-present path warms the identical font set/order as the fallback path');
  assert.deepEqual(d2.fetchCalls, d1.fetchCalls, 'RIC-present path fetches the identical asset set/order as the fallback path');
  console.log('  ok - RIC-present path matches the fallback path exactly');

  console.log('-- B3. cancel before the 1500ms timer fires --');
  const sch3 = makeFakeScheduler();
  const d3 = makeDoubles();
  const cancel3 = startCardWarming({
    setTimeoutFn: sch3.setTimeoutFn,
    clearTimeoutFn: sch3.clearTimeoutFn,
    fetchFn: d3.fetchFn,
    doc: d3.doc,
  });
  cancel3();
  check(sch3.pending.size === 0, 'cancelling before the start timer fires removes it from the scheduler (clearTimeout called)');
  sch3.fireAll(); // no-op: nothing pending
  check(d3.fontsLoaded.length === 0 && d3.fetchCalls.length === 0, 'no fetch and no font warm ever happens when cancelled before the 1500ms timer fires');

  console.log('-- B4. cancel mid-cascade --');
  const sch4 = makeFakeScheduler();
  const d4 = makeDoubles();
  const cancel4 = startCardWarming({
    setTimeoutFn: sch4.setTimeoutFn,
    clearTimeoutFn: sch4.clearTimeoutFn,
    fetchFn: d4.fetchFn,
    doc: d4.doc,
  });
  sch4.fireOne(); // fires the 1500ms timer -> schedules the fonts-job slice
  sch4.fireOne(); // runs the fonts job, schedules the first fetch slice
  sch4.fireOne(); // runs the first fetch job, schedules the second
  sch4.fireOne(); // runs the second fetch job, schedules the third
  const snapshotFonts = d4.fontsLoaded.length;
  const snapshotFetches = d4.fetchCalls.length;
  check(snapshotFonts > 0 && snapshotFetches > 0, `cascade is genuinely mid-flight before cancel (${snapshotFonts} font warm(s), ${snapshotFetches} fetch(es) so far)`);
  cancel4();
  // The currently-pending idle slice (already scheduled by the last step())
  // is NOT individually tracked/cleared by cancel() -- only the initial
  // 1500ms timerId is. Cancellation instead works via the `cancelled` flag
  // checked at the top of every step(), so that pending slice, once fired,
  // is a guaranteed no-op. Draining it here proves exactly that: it fires,
  // but produces no further side effects.
  check(sch4.pending.size === 1, 'the one already-scheduled idle slice is still pending immediately after cancel (not force-removed)');
  sch4.fireAll();
  check(
    d4.fontsLoaded.length === snapshotFonts && d4.fetchCalls.length === snapshotFetches,
    'after cancel, the pending slice fires as a no-op -- no further fetch or font warm happens; remaining slices are stopped'
  );
  check(sch4.pending.size === 0, 'no further timer is scheduled after the cancelled no-op slice runs');

  console.log('-- B5. cancel is idempotent --');
  let clearCount5 = 0;
  const sch5 = makeFakeScheduler();
  const d5 = makeDoubles();
  const wrappedClear = (id) => { clearCount5++; sch5.clearTimeoutFn(id); };
  const cancel5 = startCardWarming({
    setTimeoutFn: sch5.setTimeoutFn,
    clearTimeoutFn: wrappedClear,
    fetchFn: d5.fetchFn,
    doc: d5.doc,
  });
  cancel5();
  cancel5();
  cancel5();
  check(clearCount5 === 1, `calling cancel() three times only clears the timer once (idempotent guard), clearTimeout call count = ${clearCount5}`);

  const sch6 = makeFakeScheduler();
  const d6 = makeDoubles();
  const cancel6 = startCardWarming({
    setTimeoutFn: sch6.setTimeoutFn,
    clearTimeoutFn: sch6.clearTimeoutFn,
    fetchFn: d6.fetchFn,
    doc: d6.doc,
  });
  sch6.fireAll(); // run the cascade to natural completion
  const completedFonts = d6.fontsLoaded.length;
  const completedFetches = d6.fetchCalls.length;
  check(completedFonts > 0 && completedFetches > 0, 'cascade 6 ran to natural completion before we cancel it');
  let threw = false;
  try {
    cancel6();
    cancel6();
  } catch {
    threw = true;
  }
  check(!threw, 'calling cancel() after natural completion does not throw');
  check(
    d6.fontsLoaded.length === completedFonts && d6.fetchCalls.length === completedFetches,
    'calling cancel() after natural completion is a pure no-op (no state changes)'
  );

  console.log('-- C. cross-check against the pre-change implementation at HEAD --');
  // Pinned to RUN_START_SHA, not HEAD -- see the comment above its definition.
  const headIndexJs = execFileSync('git', ['show', `${RUN_START_SHA}:journey/cards/index.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
  const headRuntimeJs = execFileSync('git', ['show', `${RUN_START_SHA}:journey/cards/runtime.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
  // QA-02 R1 BLOCKER FIX: the previous sanity check was
  // `headIndexJs.includes('setTimeout(warmCardAssets, 1500)')` -- HOLLOW.
  // That literal string also survives, verbatim, into the CURRENT file's
  // own prose (see the "idle-time warming" block comment and the
  // startCardWarming() doc comment in journey/cards/index.js, which both
  // quote the old bare-setTimeout shape while explaining what replaced
  // it). So `.includes` matched whichever version was fetched -- reverting
  // the RUN_START_SHA pin back to the moving `HEAD` ref did NOT make this
  // suite fail, which is exactly what a time-bomb fix must do.
  //
  // The genuinely discriminating property is STRUCTURAL, not textual: the
  // identifier `startCardWarming` does not appear ANYWHERE in the
  // pre-change file -- not as code, not in a comment -- because U01a's
  // change is what introduces that name. (Verified: zero matches for
  // `startCardWarming` against the RUN_START_SHA copy, including
  // comments.) The current file both defines `export function
  // startCardWarming` and calls it from the self-start guard. Anchoring on
  // that export is something a comment describing the OLD behavior cannot
  // accidentally satisfy, because the old behavior never had this name.
  // ANCHOR CONVERTED (U01b, 2026-08-22). The recorded debt from QA-02's
  // closure review said: this suite and tools/test-discord-card.mjs anchor
  // their pre/post pair on a TEXTUAL match, where
  // tools/test-animation-lifecycle.mjs and tools/test-intro-lifecycle.mjs use
  // whole-file byte inequality; "if either file is touched again in this
  // program, its anchor should be converted to the whole-file byte-inequality
  // form the other two use." U01b touched journey/cards/index.js (it moved the
  // builder registry out to journey/cards/registry.js), so the trigger fired
  // and the conversion is done here.
  //
  // PRIMARY ANCHOR, structural: the whole file, byte for byte. No comment
  // anyone writes in either copy can make this true or false by accident --
  // the only way it holds is that the two copies genuinely differ, and the
  // only way it breaks is that they genuinely do not. This is what makes
  // reverting RUN_START_SHA back to the moving `HEAD` ref fail once this run
  // is committed.
  const CURRENT_INDEX_JS = fs.readFileSync(REAL_MODULE_PATH, 'utf8');
  check(
    headIndexJs !== CURRENT_INDEX_JS,
    'sanity (whole-file byte inequality): the copy fetched via `git show` and the working journey/cards/index.js are not the same bytes -- a genuine pre/post pair, provable without reading a single token'
  );
  // SUPPLEMENTARY, and kept only because it says something the byte
  // comparison does not: WHICH side is the pre-change one. Byte inequality is
  // symmetric; this names the direction. U01a's narrowing still holds -- the
  // regex requires `export function` ADJACENT to the identifier, so a comment
  // merely naming startCardWarming cannot satisfy it.
  const HEAD_EXPORTS_START_CARD_WARMING = /\bexport\s+function\s+startCardWarming\b/.test(headIndexJs);
  const CURRENT_EXPORTS_START_CARD_WARMING = /\bexport\s+function\s+startCardWarming\b/.test(CURRENT_INDEX_JS);
  check(
    !HEAD_EXPORTS_START_CARD_WARMING,
    'direction: the `git show` copy is the PRE-change side -- it does NOT export startCardWarming (the identifier appears nowhere in the pre-change file, comments included)'
  );
  check(
    CURRENT_EXPORTS_START_CARD_WARMING,
    'direction: the current journey/cards/index.js DOES export startCardWarming -- so the pair is oriented pre -> post, not post -> pre'
  );

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'card-warming-baseline-'));
  // tmpRoot lives under the OS temp dir, never under REPO_ROOT.
  check(!tmpRoot.startsWith(REPO_ROOT), 'baseline fixture directory is outside the repo');
  try {
    fs.writeFileSync(path.join(tmpRoot, 'index.js'), headIndexJs);
    fs.writeFileSync(path.join(tmpRoot, 'runtime.js'), headRuntimeJs);
    // The other five card builders are irrelevant to warming; stub them as
    // null builders, which is this very file's own documented contract
    // ("A module still under construction exports null; a null builder
    // means the node simply keeps the plain popover") -- not a rewrite of
    // their behavior, just standing in for modules the warming code never
    // touches, so we don't have to execute unrelated builder internals
    // outside their real directory.
    for (const name of ['arca.js', 'artcompute.js', 'tworp.js', 'ados.js', 'hivemind.js', 'discord.js']) {
      fs.writeFileSync(path.join(tmpRoot, name), 'export default null;\n');
    }

    const baselineFontsLoaded = [];
    const baselineFetchCalls = [];
    const baselineDelays = [];

    const realDoc = global.document;
    const realFetch = global.fetch;
    const realSetTimeout2 = global.setTimeout;
    const realRIC = global.requestIdleCallback;
    delete global.requestIdleCallback; // ensure the fallback path is exercised, matching B1
    global.document = {
      fonts: {
        load: (spec) => {
          baselineFontsLoaded.push(spec);
          return Promise.resolve();
        },
      },
    };
    global.fetch = (url) => {
      baselineFetchCalls.push(url);
      return Promise.resolve();
    };
    // Fire every setTimeout synchronously and immediately (recording the
    // delay first) so the entire 1500ms + 21*400ms cascade drains inline
    // during import, with no real waiting.
    global.setTimeout = (fn, delay) => {
      baselineDelays.push(delay);
      fn();
      return 0;
    };

    try {
      // tmpRoot is freshly minted per run (mkdtempSync), so the module URL
      // is already unique -- no cache-busting query needed.
      await import(pathToFileURL(path.join(tmpRoot, 'index.js')).href);
    } finally {
      global.document = realDoc;
      global.fetch = realFetch;
      global.setTimeout = realSetTimeout2;
      if (realRIC !== undefined) global.requestIdleCallback = realRIC;
    }

    assert.deepEqual(
      baselineDelays,
      sch1.calls.map((c) => c.delay),
      'the pre-change implementation schedules the exact same delay sequence (1500, then 400 per slice) as the new startCardWarming()'
    );
    console.log('  ok - delay sequence identical to pre-change (length ' + baselineDelays.length + ')');

    assert.deepEqual(
      baselineFontsLoaded,
      d1.fontsLoaded,
      'the pre-change implementation warms the identical font set, in the identical order'
    );
    console.log(`  ok - font warm sequence identical to pre-change (${baselineFontsLoaded.length} fonts)`);

    assert.deepEqual(
      baselineFetchCalls,
      d1.fetchCalls,
      'the pre-change implementation fetches the identical asset set, in the identical order (fonts -> light -> heavy)'
    );
    console.log(`  ok - fetch sequence identical to pre-change (${baselineFetchCalls.length} assets)`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} check(s) FAILED`);
    process.exitCode = 1;
  } else {
    console.log('card warming: ALL CHECKS PASS');
  }
}

main().catch((err) => {
  console.error('test-card-warming.mjs crashed:', err);
  process.exitCode = 1;
});
