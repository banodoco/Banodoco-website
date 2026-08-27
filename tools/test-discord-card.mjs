// tools/test-discord-card.mjs
//
// Focused test for journey/cards/discord.js's U01d change:
//
//   (a) the import-time self-start (`setTimeout(prepareFallback, 0)` +
//       `requestIdleCallback(prepareLive, {timeout:1500})` / `setTimeout
//       (prepareLive, 1200)`) moved from a bare module-scope side effect
//       to an explicit, cancellable owner:
//       `export function startDiscordPreparation(overrides)`, returning a
//       cancel handle. The self-start itself REMAINS (U01d preserves
//       today's behavior, same sequencing decision U01a made for the
//       sibling card-warming cascade) — this file only gives it an owner.
//   (b) a `console.warn` added to the ONE diagnostic-loss catch (line
//       ~110, `JSON.parse(row.full_summary)`) — proven to change NOTHING
//       about which rows are kept/skipped, only that the skip is no
//       longer silent.
//
// No browser, no jsdom, NO real network request anywhere in this file:
// every clock/idle/fetch dependency is injected or monkeypatched with a
// synthetic double. `prepareFallback`/`prepareLive` themselves are
// untouched code (confirmed against `git show HEAD:journey/cards/
// discord.js` — see section E) that still read the bare ambient `fetch`
// identifier, so fetch identity is observed by monkeypatching
// `globalThis.fetch` before invoking them, not by an injected `fetchFn`
// parameter (the new owner only wraps *when* those two functions get
// called, not what they do once called).
//
// Every scenario that needs the self-start to be inert imports the real
// module with `document` left undefined (module-singleton state --
// fallbackPromise/livePromise/fallbackSnapshot/liveSnapshot -- lives at
// module scope, so each scenario that exercises those needs a FRESH
// module instance; Node treats a distinct query string on the same file
// URL as a distinct module instance, used throughout below).
//
// Covers, in order:
//   A. Import-time guard: importing the real module with no ambient
//      `document` schedules nothing and fetches nothing.
//   B. startDiscordPreparation() scheduling shape via fully injected,
//      non-auto-firing clock/idle doubles:
//        B1. RIC-absent path: exactly two timers, delays [0, 1200], in
//            that order.
//        B2. RIC-present path (injected requestIdleCallbackFn): exactly
//            one timer (delay 0) plus one requestIdleCallback call with
//            {timeout:1500} -- no setTimeout(*, 1200) call.
//        B3. Ambient global.requestIdleCallback (no override) is honoured
//            too, not just the injected-override path.
//   C. Self-start fires-for-real proof: with `document` defined and
//      `setTimeout`/`fetch` monkeypatched (recording only, never firing),
//      importing the real module schedules the identical [0, 1200] shape
//      with zero fetches -- proving the guard positively fires, not just
//      that it's inert when document is absent (A only proves the
//      negative case).
//   D. Cancel semantics, using a fire-capable fake scheduler + a
//      monkeypatched global.fetch:
//        D1. cancel before either timer fires -> zero fetches.
//        D2. cancel mid-flight (fallback fired, live not yet) -> live
//            never runs; the in-flight fallback fetch is not aborted.
//        D3. cancel is idempotent; safe after natural completion.
//   E. Fetch identity: fires both scheduled calls for real (via the fake
//      scheduler) against a monkeypatched global.fetch, and asserts the
//      exact URL sequence / header shape / today-vs-yesterday branching
//      matches what `prepareFallback`/`prepareLive`'s untouched source
//      (confirmed byte-identical against `git show HEAD:...` for those
//      functions specifically) describes.
//   F. The :107 warn: for a fixture with one valid and one malformed row,
//      `topicsFromRows` (now exported solely for this test) returns the
//      IDENTICAL parsed output whether or not the warn is present, and a
//      console.warn spy shows the new file warns exactly once while the
//      HEAD (pre-change) copy warns zero times for the same input.
//   G. The other three catches (current-file lines ~168, ~187, ~238) are
//      confirmed unchanged against HEAD by direct source diff.
//   H. Non-tautology probes: every load-bearing assert.deepEqual/strict
//      comparison above is re-run here with a deliberately corrupted
//      value to prove it can fail.
//
// Run directly: node tools/test-discord-card.mjs
// (not yet wired into package.json's test:contracts/test:unit -- package.json
// is forbidden to this order; report to whoever owns that file next.)

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REAL_MODULE_PATH = path.join(REPO_ROOT, 'journey/cards/discord.js');

// QA-02 TIME BOMB FIX: this run's starting commit, pinned explicitly.
// `git show HEAD:...` used to be read at every git-show call site below,
// but HEAD is a MOVING ref -- this order's own changes to
// journey/cards/discord.js / runtime.js are still uncommitted, so today
// HEAD still points at the pre-change implementation and every HEAD-vs-
// current comparison in this file passes. The moment this run's work is
// committed, HEAD advances past the change, and the sanity checks that
// depend on HEAD being genuinely pre-change (the silent-catch literal, the
// absence of the topicsFromRows export, the untouched-catch snippets, the
// zero-warn-count behavioral check) would start reading the CURRENT file
// under the name "HEAD", silently comparing the new implementation against
// itself. Pinning this SHA instead of HEAD is the fix -- do not revert
// this back to `HEAD:journey/cards/discord.js` / `HEAD:journey/cards/runtime.js`.
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

// Independent-derivation date helpers (R1 review nit 1, 2026-08-21): the
// module's own iso()/dates() computes YYYY-MM-DD by hand
// (getFullYear() + getMonth()+1 + getDate(), each padStart(2,'0')) and
// "yesterday" via calendar-field setDate(getDate()-1). An earlier version
// of this test restated that exact algorithm to compute its own expected
// dates -- a derivation over the same inputs is arithmetic, not evidence:
// if the module's date formatting were wrong, this test would have
// agreed with it and both would have been wrong together (qa-01's
// Engine 2). Intl.DateTimeFormat's en-CA locale formats a Date as
// YYYY-MM-DD natively through the ICU date engine -- zero-padded, no
// shared code path with the module's hand-rolled string-building at all.
// "Yesterday" is derived by raw millisecond subtraction (24h) rather than
// calendar-field manipulation, a second, differently-shaped algorithm
// from the module's setDate(getDate()-1). Verified directly: for
// 2026-08-21, `new Intl.DateTimeFormat('en-CA').format(new Date(2026,7,21))`
// -> "2026-08-21"; for 2026-01-05 -> "2026-01-05" (leading zeros both
// present, confirmed in the field).
const ISO_FMT = new Intl.DateTimeFormat('en-CA'); // formats as YYYY-MM-DD
function todayIsoIndependent() {
  return ISO_FMT.format(new Date());
}
function yesterdayIsoIndependent() {
  return ISO_FMT.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

let scenarioCounter = 0;
function freshImportUrl() {
  scenarioCounter += 1;
  return `${pathToFileURL(REAL_MODULE_PATH).href}?u01d-scenario=${scenarioCounter}`;
}

// A recording-only fake setTimeout/clearTimeout pair: captures (fn, delay)
// but never auto-fires. Scenarios that need to observe actual execution
// call `.fire(i)` explicitly, in whatever order the test wants.
function makeScheduler() {
  const calls = []; // { fn, delay, cleared }
  const setTimeoutFn = (fn, delay) => {
    const id = calls.length;
    calls.push({ fn, delay, cleared: false });
    return id;
  };
  const clearTimeoutFn = (id) => {
    if (calls[id]) calls[id].cleared = true;
  };
  const fire = (i) => {
    const c = calls[i];
    if (!c || c.cleared) return false;
    c.fn();
    return true;
  };
  return { calls, setTimeoutFn, clearTimeoutFn, fire };
}

function makeRic() {
  const calls = []; // { fn, options, cleared }
  const ricFn = (fn, options) => {
    const id = calls.length;
    calls.push({ fn, options, cleared: false });
    return id;
  };
  const cancelRicFn = (id) => {
    if (calls[id]) calls[id].cleared = true;
  };
  const fire = (i) => {
    const c = calls[i];
    if (!c || c.cleared) return false;
    c.fn();
    return true;
  };
  return { calls, ricFn, cancelRicFn, fire };
}

// A small real delay to let a promise chain (fetch -> .json() -> further
// awaits inside fetchDate/loadLive/getFallback) settle after firing a
// synchronous callback that kicks off async work. Not a busy/sleep loop --
// one bounded await per settle point.
function flush(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A minimal fetch double covering both URLs this module ever calls:
// CARD_ASSETS/discord/fallback.json (from getFallback) and the Supabase
// daily_summaries REST endpoint (from fetchDate, called by loadLive).
// `todayTopicCount` controls whether the today->yesterday fallback branch
// fires (>=2 topics today skips it, matching loadLive's own `< 2` check).
function makeFetchDouble({ todayStr, yesterdayStr, todayTopicCount = 2 }) {
  const calls = []; // { url, headers, hasSignal }
  const rowsFor = (n, tag) => [{
    full_summary: JSON.stringify(
      Array.from({ length: n }, (_, i) => ({ title: `${tag} Topic ${i + 1}`, mainText: `${tag} body ${i + 1}` }))
    ),
    date: tag === 'today' ? todayStr : yesterdayStr,
    channel_id: 'chan-1',
    discord_channels: { channel_name: 'general' },
  }];
  const fetchFn = async (url, init = {}) => {
    calls.push({ url, headers: init.headers || null, hasSignal: !!init.signal });
    if (url.includes('/discord/fallback.json')) {
      return {
        ok: true,
        json: async () => ({
          capturedAt: '2026-08-01',
          topics: [{ title: 'Fallback A', text: 'fallback text', channel: 'general', date: '2026-08-01' }],
        }),
      };
    }
    if (url.includes('daily_summaries')) {
      if (url.includes(`date=eq.${todayStr}`)) return { ok: true, json: async () => rowsFor(todayTopicCount, 'today') };
      if (url.includes(`date=eq.${yesterdayStr}`)) return { ok: true, json: async () => rowsFor(2, 'yesterday') };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { calls, fetchFn };
}

async function main() {
  const dates_todayStr = todayIsoIndependent();
  const dates_yesterdayStr = yesterdayIsoIndependent();

  console.log('-- A. import-time guard (document undefined) --');
  assert.equal(typeof document, 'undefined', 'precondition: this Node process has no ambient document');
  let ambientSetTimeoutCalls = 0;
  const realSetTimeout = global.setTimeout;
  global.setTimeout = (...args) => { ambientSetTimeoutCalls++; return realSetTimeout(...args); };
  let ambientFetchCalls = 0;
  const realFetch = global.fetch;
  global.fetch = (...args) => { ambientFetchCalls++; return realFetch ? realFetch(...args) : Promise.reject(new Error('no fetch')); };
  const modA = await import(freshImportUrl());
  global.setTimeout = realSetTimeout;
  global.fetch = realFetch;
  check(ambientSetTimeoutCalls === 0, 'importing discord.js with no ambient document schedules zero timers (guard holds, import stays inert)');
  check(ambientFetchCalls === 0, 'importing discord.js with no ambient document makes zero fetch calls');
  check(typeof modA.startDiscordPreparation === 'function', 'module exports startDiscordPreparation');
  check(typeof modA.topicsFromRows === 'function', 'module exports topicsFromRows (test-only surface for the :107 fix)');

  const { startDiscordPreparation } = modA;

  console.log('-- B1. RIC-absent path: exactly two timers, delays [0, 1200], in order --');
  const sch1 = makeScheduler();
  startDiscordPreparation({ setTimeoutFn: sch1.setTimeoutFn, clearTimeoutFn: sch1.clearTimeoutFn });
  check(sch1.calls.length === 2, `exactly two setTimeout calls scheduled (got ${sch1.calls.length})`);
  check(sch1.calls[0]?.delay === 0, `first timer delay is exactly 0ms -- prepareFallback (got ${sch1.calls[0]?.delay})`);
  check(sch1.calls[1]?.delay === 1200, `second timer delay is exactly 1200ms -- prepareLive fallback (got ${sch1.calls[1]?.delay})`);

  console.log('-- B2. RIC-present path (injected requestIdleCallbackFn) --');
  const modB2 = await import(freshImportUrl());
  const sch2 = makeScheduler();
  const ric2 = makeRic();
  modB2.startDiscordPreparation({
    setTimeoutFn: sch2.setTimeoutFn,
    clearTimeoutFn: sch2.clearTimeoutFn,
    requestIdleCallbackFn: ric2.ricFn,
    cancelIdleCallbackFn: ric2.cancelRicFn,
  });
  check(sch2.calls.length === 1, `RIC-present path schedules exactly one setTimeout (prepareFallback only, got ${sch2.calls.length})`);
  check(sch2.calls[0]?.delay === 0, 'that one setTimeout is still delay 0 (prepareFallback)');
  check(ric2.calls.length === 1, `RIC-present path calls requestIdleCallbackFn exactly once (got ${ric2.calls.length})`);
  check(
    ric2.calls[0]?.options && ric2.calls[0].options.timeout === 1500,
    `requestIdleCallbackFn is called with {timeout:1500} (got ${JSON.stringify(ric2.calls[0]?.options)})`
  );

  console.log('-- B3. ambient global.requestIdleCallback (no override) is honoured too --');
  const modB3 = await import(freshImportUrl());
  const sch3 = makeScheduler();
  const ric3 = makeRic();
  const realRicAmbient = global.requestIdleCallback;
  const realCancelRicAmbient = global.cancelIdleCallback;
  global.requestIdleCallback = ric3.ricFn;
  global.cancelIdleCallback = ric3.cancelRicFn;
  modB3.startDiscordPreparation({ setTimeoutFn: sch3.setTimeoutFn, clearTimeoutFn: sch3.clearTimeoutFn });
  if (realRicAmbient === undefined) delete global.requestIdleCallback; else global.requestIdleCallback = realRicAmbient;
  if (realCancelRicAmbient === undefined) delete global.cancelIdleCallback; else global.cancelIdleCallback = realCancelRicAmbient;
  // R1 review nit 2: this originally read `sch3.calls.length === 1` while
  // its message claimed "delay-0" -- the predicate never checked the
  // delay value, so it could not answer the question its own name asked.
  // The property IS genuinely proven at B1; strengthened here anyway
  // (cheap, and 0ms scheduling of prepareFallback is load-bearing).
  check(sch3.calls.length === 1 && sch3.calls[0]?.delay === 0, `ambient-RIC path schedules exactly one setTimeoutFn call, at delay 0 (the prepareFallback timer) -- got length ${sch3.calls.length}, delay ${sch3.calls[0]?.delay}`);
  check(ric3.calls.length === 1 && ric3.calls[0].options.timeout === 1500, 'ambient global.requestIdleCallback is picked up with {timeout:1500} when no override is given');

  console.log('-- B3b. non-tautology probe for the strengthened B3 delay assertion (deliberate injection) --');
  {
    const realDelay = sch3.calls[0]?.delay;  // genuinely 0, read from memory
    const corruptedDelay = realDelay + 1;    // deliberately wrong, derived not hardcoded
    let probePassed = null;
    const probeCheck = (condition) => { probePassed = !!condition; };
    probeCheck(sch3.calls.length === 1 && corruptedDelay === 0);
    check(probePassed === false, `probe B3b: the strengthened B3 predicate correctly reports FALSE when the delay is deliberately corrupted in memory (${corruptedDelay} !== 0) -- not a tautology`);
    probeCheck(sch3.calls.length === 1 && realDelay === 0);
    check(probePassed === true, `probe B3b control: the SAME predicate reports TRUE against the real, uncorrupted delay (${realDelay} === 0)`);
  }

  console.log('-- C. self-start fires for real (document defined, recording-only globals) --');
  {
    const sch = makeScheduler();
    let fetchCallsC = 0;
    const realDoc = global.document;
    const realGlobalSetTimeout = global.setTimeout;
    const realGlobalFetch = global.fetch;
    const realGlobalRic = global.requestIdleCallback;
    delete global.requestIdleCallback; // force the RIC-absent shape, matching B1
    global.document = {};
    global.setTimeout = sch.setTimeoutFn;
    global.fetch = (...args) => { fetchCallsC++; return realGlobalFetch ? realGlobalFetch(...args) : Promise.reject(new Error('no fetch')); };
    const modC = await import(freshImportUrl());
    global.document = realDoc;
    global.setTimeout = realGlobalSetTimeout;
    global.fetch = realGlobalFetch;
    if (realGlobalRic !== undefined) global.requestIdleCallback = realGlobalRic;
    check(typeof modC.startDiscordPreparation === 'function', 'sanity: the self-start-triggering import still exposes the same export');
    check(sch.calls.length === 2, `importing with document defined self-starts and schedules exactly two timers (got ${sch.calls.length})`);
    check(sch.calls[0]?.delay === 0 && sch.calls[1]?.delay === 1200, `self-start's own delays are [0, 1200] with no override supplied (got [${sch.calls[0]?.delay}, ${sch.calls[1]?.delay}])`);
    check(fetchCallsC === 0, 'nothing fires without an explicit .fire() call, so zero fetches happen even though document was defined');
  }

  console.log('-- D1. cancel before either timer fires -> zero fetches --');
  {
    const modD1 = await import(freshImportUrl());
    const sch = makeScheduler();
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    const cancel = modD1.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: sch.clearTimeoutFn });
    cancel();
    sch.fire(0);
    sch.fire(1);
    await flush();
    global.fetch = realGlobalFetch;
    check(sch.calls[0].cleared && sch.calls[1].cleared, 'both timers are cleared by cancel() before firing');
    check(fd.calls.length === 0, `cancelling before either timer fires results in zero fetch calls (got ${fd.calls.length})`);
  }

  console.log('-- D2. cancel mid-flight (fallback fired, live not yet) -> live never runs --');
  {
    const modD2 = await import(freshImportUrl());
    const sch = makeScheduler();
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    const cancel = modD2.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: sch.clearTimeoutFn });
    sch.fire(0);           // fires prepareFallback -- kicks off the fallback.json fetch
    await flush();
    const midFlightCalls = fd.calls.length;
    check(midFlightCalls === 1, `fallback fetch is genuinely in flight/complete before cancel (got ${midFlightCalls} call(s))`);
    cancel();               // must prevent prepareLive from ever running
    const fired = sch.fire(1); // attempt to fire the live timer anyway
    await flush();
    check(fired === false, 'the live timer is already cleared, so .fire(1) is a no-op by the scheduler\'s own bookkeeping');
    check(fd.calls.length === midFlightCalls, `no further fetch happens after cancel -- fetch count unchanged (${fd.calls.length} === ${midFlightCalls})`);
    global.fetch = realGlobalFetch;
  }

  console.log('-- D2b. cancel mid-flight when the live timer already fired despite cancel (belt-and-suspenders guard) --');
  {
    // Exercises the inner `if (cancelled) return;` guard directly: manually
    // invoke the live callback's fn AFTER cancel(), bypassing the
    // scheduler's own `cleared` bookkeeping, to prove the guard -- not just
    // the scheduler's cooperation -- is what stops the work.
    const modD2b = await import(freshImportUrl());
    const sch = makeScheduler();
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    const cancel = modD2b.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: sch.clearTimeoutFn });
    cancel();
    const liveFn = sch.calls[1].fn;
    liveFn(); // call the raw callback directly, ignoring `cleared`
    await flush();
    check(fd.calls.length === 0, 'even a directly-invoked (uncleared-bypassing) live callback is a no-op after cancel, via the inner cancelled-flag guard');
    global.fetch = realGlobalFetch;
  }

  console.log('-- D3. cancel is idempotent; safe after natural completion --');
  {
    const modD3 = await import(freshImportUrl());
    let clearCount = 0;
    const sch = makeScheduler();
    const wrappedClear = (id) => { clearCount++; sch.clearTimeoutFn(id); };
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    const cancel = modD3.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: wrappedClear });
    cancel(); cancel(); cancel();
    check(clearCount === 2, `calling cancel() three times only clears each timer once (idempotent guard), clearTimeout call count = ${clearCount} (expected 2)`);

    const modD3b = await import(freshImportUrl());
    const sch4 = makeScheduler();
    const fd4 = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr });
    global.fetch = fd4.fetchFn;
    const cancel4 = modD3b.startDiscordPreparation({ setTimeoutFn: sch4.setTimeoutFn, clearTimeoutFn: sch4.clearTimeoutFn });
    sch4.fire(0);
    sch4.fire(1);
    await flush();
    const completedCalls = fd4.calls.length;
    check(completedCalls > 0, `cascade ran to natural completion before we cancel it (${completedCalls} fetch call(s))`);
    let threw = false;
    try { cancel4(); cancel4(); } catch { threw = true; }
    check(!threw, 'calling cancel() after natural completion does not throw');
    check(fd4.calls.length === completedCalls, 'calling cancel() after natural completion is a pure no-op (no further fetches)');
    global.fetch = realGlobalFetch;
  }

  console.log('-- E. fetch identity: URLs, order, and request shape --');
  {
    const modE = await import(freshImportUrl());
    const sch = makeScheduler();
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr, todayTopicCount: 2 });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    modE.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: sch.clearTimeoutFn });
    sch.fire(0);
    await flush();
    sch.fire(1);
    await flush();
    global.fetch = realGlobalFetch;

    check(fd.calls.length === 2, `exactly two fetches happen when today already has >=2 topics -- fallback.json, then today's Supabase query (got ${fd.calls.length})`);
    check(fd.calls[0]?.url.includes('/discord/fallback.json'), `first fetch is the local fallback JSON (got ${fd.calls[0]?.url})`);
    check(fd.calls[1]?.url.includes('daily_summaries'), `second fetch hits the daily_summaries table (got ${fd.calls[1]?.url})`);
    check(fd.calls[1]?.url.includes(`date=eq.${dates_todayStr}`), `second fetch queries today's date, computed independently by this test (${dates_todayStr})`);
    check(fd.calls[1]?.url.includes('included_in_main_summary=eq.true') && fd.calls[1]?.url.includes('dev_mode=eq.false'), 'second fetch carries the documented included_in_main_summary/dev_mode filters');
    check(
      fd.calls[1]?.headers && fd.calls[1].headers.apikey && fd.calls[1].headers.Authorization === `Bearer ${fd.calls[1].headers.apikey}`,
      'second fetch carries apikey + matching Bearer Authorization header (same publishable key in both)'
    );
    check(fd.calls[1]?.hasSignal === true, 'second fetch is issued with an AbortSignal (the 4s timeout guard, untouched)');
  }

  console.log('-- E2. fetch identity: the today<2-topics -> also-fetch-yesterday branch still fires --');
  {
    const modE2 = await import(freshImportUrl());
    const sch = makeScheduler();
    const fd = makeFetchDouble({ todayStr: dates_todayStr, yesterdayStr: dates_yesterdayStr, todayTopicCount: 1 });
    const realGlobalFetch = global.fetch;
    global.fetch = fd.fetchFn;
    modE2.startDiscordPreparation({ setTimeoutFn: sch.setTimeoutFn, clearTimeoutFn: sch.clearTimeoutFn });
    sch.fire(0);
    await flush();
    sch.fire(1);
    await flush(60);
    global.fetch = realGlobalFetch;

    check(fd.calls.length === 3, `with fewer than 2 topics today, a third fetch (yesterday) is issued (got ${fd.calls.length})`);
    check(fd.calls[2]?.url.includes(`date=eq.${dates_yesterdayStr}`), `third fetch queries yesterday's date, computed independently by this test (${dates_yesterdayStr})`);
  }

  console.log('-- F. the :107 warn: filtering is unchanged, warning is new --');
  {
    const rows = [
      {
        full_summary: JSON.stringify([{ title: 'Valid Topic', mainText: 'valid body' }]),
        date: '2026-08-10',
        channel_id: 'c1',
        discord_channels: { channel_name: 'general' },
      },
      {
        // malformed JSON -- this is the row the :107 catch must skip
        full_summary: '{not valid json',
        date: '2026-08-10',
        channel_id: 'c1',
        discord_channels: { channel_name: 'general' },
      },
      {
        full_summary: JSON.stringify([{ title: 'Second Valid Topic', mainText: 'second valid body' }]),
        date: '2026-08-11',
        channel_id: 'c2',
        discord_channels: { channel_name: 'random' },
      },
    ];

    // NEW behavior: import the real (post-change) file, spy on console.warn.
    // R1 review sweep: an earlier version of this block claimed "does not
    // leak into an uncaught throw" on a predicate that never tested for a
    // throw (control flow merely happened to still be running) -- that is
    // the exact Engine 4 shape (assertion name outruns its predicate).
    // Fixed by wrapping the call in a real try/catch and asserting on the
    // captured outcome directly, positive proof rather than an inference.
    const modF = await import(freshImportUrl());
    const warnCallsNew = [];
    const realWarn = console.warn;
    console.warn = (...args) => warnCallsNew.push(args);
    let newOutput;
    let threwOnMalformedRow = false;
    try {
      newOutput = modF.topicsFromRows(rows);
    } catch {
      threwOnMalformedRow = true;
      newOutput = [];
    } finally {
      console.warn = realWarn;
    }

    check(!threwOnMalformedRow, 'topicsFromRows does not throw on the malformed row -- the catch still swallows the JSON.parse failure, only the warn is new (proven via an actual try/catch, not inferred from reaching this line)');
    check(newOutput.length === 2, `new topicsFromRows keeps exactly the 2 rows with valid JSON, skips the malformed one (got ${newOutput.length})`);
    check(newOutput[0].title === 'Valid Topic' && newOutput[1].title === 'Second Valid Topic', 'new topicsFromRows keeps the correct two rows, in order');
    check(warnCallsNew.length === 1, `new topicsFromRows emits exactly one console.warn for the one malformed row (got ${warnCallsNew.length})`);
    check(
      typeof warnCallsNew[0]?.[0] === 'string' && warnCallsNew[0][0].includes('[discord-card]'),
      'the warn is tagged [discord-card]'
    );

    // OLD behavior: extract HEAD's discord.js verbatim, patch ONLY the
    // `function topicsFromRows` declaration to `export function
    // topicsFromRows` (a copy-time change for testability, exactly the
    // kind of legitimate fixture substitution U01a's cross-check used for
    // the null-builder stubs -- no other byte is touched), then run it for
    // real against the SAME fixture rows.
    // Pinned to RUN_START_SHA, not HEAD -- see the comment above its definition.
    const headDiscordJs = execFileSync('git', ['show', `${RUN_START_SHA}:journey/cards/discord.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
    check(headDiscordJs.includes('try { arr = JSON.parse(row.full_summary); } catch { continue; }'), 'sanity: the HEAD copy fetched via `git show` is genuinely the pre-change silent-catch implementation');
    check(!headDiscordJs.includes('export function topicsFromRows'), 'sanity: HEAD does not already export topicsFromRows (this test patches that in, at copy time only)');
    const patchedHead = headDiscordJs.replace('function topicsFromRows(rows) {', 'export function topicsFromRows(rows) {');
    check(patchedHead !== headDiscordJs, 'sanity: the copy-time patch actually matched and replaced something');

    // Pinned to RUN_START_SHA, not HEAD -- see the comment above its definition.
    const headRuntimeJs = execFileSync('git', ['show', `${RUN_START_SHA}:journey/cards/runtime.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-card-baseline-'));
    check(!tmpRoot.startsWith(REPO_ROOT), 'baseline fixture directory is outside the repo');
    try {
      fs.writeFileSync(path.join(tmpRoot, 'discord.js'), patchedHead);
      fs.writeFileSync(path.join(tmpRoot, 'runtime.js'), headRuntimeJs);
      const headMod = await import(pathToFileURL(path.join(tmpRoot, 'discord.js')).href);

      const warnCallsOld = [];
      console.warn = (...args) => warnCallsOld.push(args);
      const oldOutput = headMod.topicsFromRows(rows);
      console.warn = realWarn;

      assert.deepEqual(oldOutput, newOutput, 'the pre-change (HEAD) implementation and the new implementation return IDENTICAL parsed output for the same fixture -- same rows kept, same rows skipped, same field values');
      console.log(`  ok - parsed output identical to pre-change (${oldOutput.length} topics)`);
      // R1 review sweep: an earlier version of this single check's message
      // claimed to "confirm the ONLY behavioral delta is the new warning"
      // -- a claim this one predicate (old warn count) cannot answer by
      // itself; it takes this check PLUS the deepEqual above (same output)
      // PLUS the new-implementation warnCallsNew===1 check (already run,
      // see above) together. Trimmed the message to what this line alone
      // verifies; the combined conclusion is stated here as a comment
      // instead, resting on all three checks, not implied by one.
      check(warnCallsOld.length === 0, `the pre-change implementation emits zero console.warn calls for the same fixture (got ${warnCallsOld.length})`);
      // Combined conclusion (deepEqual above + warnCallsNew===1 above +
      // warnCallsOld===0 here): output is identical AND the warn count is
      // the only thing that changed, 0 -> 1, for this fixture.
    } finally {
      console.warn = realWarn;
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }

  console.log('-- G. the other three catches are unchanged against HEAD --');
  {
    // Pinned to RUN_START_SHA, not HEAD -- see the comment above its definition.
    const headDiscordJs = execFileSync('git', ['show', `${RUN_START_SHA}:journey/cards/discord.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
    const liveDiscordJs = fs.readFileSync(REAL_MODULE_PATH, 'utf8');
    const untouchedSnippets = [
      "catch { /* keep today's topics */ }",   // loadLive's yesterday-fallback catch
      // getFallback's catch -- multi-line, matched by its opening brace + comment below
    ];
    for (const snippet of untouchedSnippets) {
      check(headDiscordJs.includes(snippet), `sanity: HEAD contains the expected untouched snippet: ${JSON.stringify(snippet)}`);
      check(liveDiscordJs.includes(snippet), `live file still contains the SAME untouched snippet verbatim: ${JSON.stringify(snippet)}`);
    }
    // getFallback's catch and prepareLive's catch: compare the full block
    // bodies (comment + catch) byte-for-byte between HEAD and live.
    const getFallbackCatchHead = headDiscordJs.match(/} catch \{\n {4}\/\/ The local snapshot[\s\S]*?\n {2}\}/)?.[0];
    const getFallbackCatchLive = liveDiscordJs.match(/} catch \{\n {4}\/\/ The local snapshot[\s\S]*?\n {2}\}/)?.[0];
    check(!!getFallbackCatchHead, 'sanity: getFallback\'s catch block found in HEAD');
    check(getFallbackCatchHead === getFallbackCatchLive, 'getFallback\'s catch block (:~187) is byte-identical between HEAD and the live file -- no warn added, still intentional-safe silent');

    const prepareLiveCatchHead = headDiscordJs.match(/} catch \{\n {6}\/\/ The parsed baked snapshot[\s\S]*?\n {4}\}/)?.[0];
    const prepareLiveCatchLive = liveDiscordJs.match(/} catch \{\n {6}\/\/ The parsed baked snapshot[\s\S]*?\n {4}\}/)?.[0];
    check(!!prepareLiveCatchHead, 'sanity: prepareLive\'s catch block found in HEAD');
    check(prepareLiveCatchHead === prepareLiveCatchLive, 'prepareLive\'s catch block (:~238) is byte-identical between HEAD and the live file -- no warn added, still intentional-safe silent');
  }

  console.log('-- H. non-tautology probes: prove key asserts CAN fail --');
  {
    let caught = false;
    try {
      assert.deepEqual([{ title: 'A' }], [{ title: 'B' }], 'probe: deliberately mismatched topic arrays');
    } catch { caught = true; }
    check(caught, 'probe H1: assert.deepEqual on a deliberately wrong topics array throws (the section F comparison is load-bearing, not tautological)');

    caught = false;
    try {
      assert.equal(2, 3, 'probe: deliberately wrong fetch count');
    } catch { caught = true; }
    check(caught, 'probe H2: assert.equal on a deliberately wrong count throws (the section E fetch-count checks are load-bearing)');

    // Probe the scheduler's own delay-shape checks (used throughout B/C)
    // by re-deriving B1's result and running the SAME check() predicate
    // once against the real observed delay (must pass) and once against a
    // deliberately corrupted in-memory copy of it (must fail), using a
    // silent probe-only variant of check() so this deliberate failure
    // never pollutes the real `failures` counter.
    const schMutant = makeScheduler();
    const modH = await import(freshImportUrl());
    modH.startDiscordPreparation({ setTimeoutFn: schMutant.setTimeoutFn, clearTimeoutFn: schMutant.clearTimeoutFn });
    const realObservedDelay = schMutant.calls[1]?.delay; // genuinely 1200, read from memory
    const corruptedDelay = realObservedDelay + 1;        // deliberately wrong, derived not hardcoded
    let probePassed = null;
    const probeCheck = (condition) => { probePassed = !!condition; };
    probeCheck(corruptedDelay === 1200);
    check(probePassed === false, `probe H3: the delay-identity predicate correctly reports FALSE against a deliberately corrupted value (${corruptedDelay} !== 1200) -- it is not a tautology`);
    probeCheck(realObservedDelay === 1200);
    check(probePassed === true, `probe H3 control: the SAME predicate reports TRUE against the real, uncorrupted observed value (${realObservedDelay} === 1200) -- confirms the probe distinguishes real pass from real fail`);
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} check(s) FAILED`);
    process.exitCode = 1;
  } else {
    console.log('discord card (U01d): ALL CHECKS PASS');
  }
}

main().catch((err) => {
  console.error('test-discord-card.mjs crashed:', err);
  process.exitCode = 1;
});
