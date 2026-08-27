/* ==================================================================== *
 * tools/dwell-run.mjs — PAGE-01.
 *
 * THE ENTRY POINT FOR THE REST-DWELL ORACLE. `npm run test:dwell`.
 *
 * Everything that decides anything is in tools/dwell-oracle.mjs and is
 * gated by tools/test-dwell-oracle.mjs and tools/test-instrument-layer.mjs.
 * This file owns only what needs a browser: the launch, the per-origin
 * positive control, the sequential fronted driving, and the D63 refusal.
 *
 * WHY IT IS A SEPARATE FILE. `playwright-core` costs 2.0 s to import and
 * dwell-oracle.mjs is imported by a suite inside `npm run check`. It is
 * also why this is an ENTRY POINT and not a shared instrument, in the sense
 * tools/test-instrument-layer.mjs's COV-1 means: nothing imports it.
 *
 * THE TWO TRAPS DEF-OWNED RECORDED, HONOURED HERE
 * ----------------------------------------------
 * 1. A HIDDEN TAB both throttles `setTimeout` AND trips `push()`'s
 *    `resumedFromBackground` branch, so a comparison run concurrently
 *    produces garbage. One browser, one page, one trial at a time, and
 *    `document.hidden` is recorded per trial and refused on.
 * 2. EVERY SWEEP CARRIES A PER-ORIGIN POSITIVE CONTROL asserting that a
 *    dispatched wheel really advances `scroll.surface`. The coordinator's
 *    own `setProgress` sweep reported "Mission" at every p and measured
 *    nothing, for exactly the want of this.
 *
 * Run:
 *   node tools/dwell-run.mjs                          — drive :8177
 *   node tools/dwell-run.mjs --origin=http://localhost:8188   — a base tree
 *   node tools/dwell-run.mjs --trials=6 --seed=7 --from=0.26
 *   node tools/dwell-run.mjs --record=<path>          — write the trace
 * ==================================================================== */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HarnessFault, fault, armSentinel } from './instrument-ledger.mjs';
import {
  ANCHORS, DEFAULT_CONTRACT, GOVERNED_PATHS, transitGestureConfigs, evaluateContract, trustVerdict,
  dualDelaysMs, evaluateDual, parseArgs, parkAt, drivenTrial, dualTrial,
} from './dwell-oracle.mjs';
/** THE ROUTE IS THE AUTHORITY FOR THE TRANSIT TABLE, and the oracle takes it
 *  by INJECTION so that the oracle itself stays free of any journey import
 *  (it is staged by tools/test-instrument-layer.mjs, and a staged copy that
 *  reached into journey/ would drag the whole tree). This entry point is not
 *  staged and already imports a browser, so it is the right place to close
 *  the loop. */
import { transitSeconds } from '../journey/route.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
/** THE RECEIPT — §5.4's wiring, in the shape the capture gate already uses.
 *
 *  A green run stamps the SHA-256 of every governed file AS IT STOOD when
 *  the run measured it. tools/pre-commit recomputes those hashes over the
 *  STAGED bytes and refuses a commit whose governed files have moved since
 *  the last green ring. That is the whole mechanism: not "was a browser run
 *  ever done", which is what a timestamp would say, but "was it done against
 *  THESE bytes".
 *
 *  It is written ONLY on a green run. A red run leaving a receipt behind
 *  would let the next commit inherit a pass from a failure. */
const RECEIPT = join(REPO, 'tools', 'dwell-receipt.json');

export function governedHashes(readAt = (rel) => readFileSync(join(REPO, rel))) {
  const out = {};
  for (const rel of GOVERNED_PATHS) out[rel] = createHash('sha256').update(readAt(rel)).digest('hex').slice(0, 16);
  return out;
}

const CHROME_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

async function main() {
  const SENT = armSentinel('dwell-run', ['inputs', 'contract']);
  const opts = parseArgs(process.argv.slice(2));
  const chrome = CHROME_CANDIDATES.find((c) => existsSync(c));
  if (!chrome) fault('no Chrome/Chromium executable found — this instrument cannot report without one');

  console.log('tools/dwell-run.mjs — rest-dwell oracle over the real event path\n');
  console.log(`  origin ${opts.origin}   viewport ${opts.width}x${opts.height}   seed ${opts.seed}   `
    + `trials ${opts.trials}   from p ${opts.fromP}\n`);

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal'] });
  const evidence = {
    httpOk: false, httpStatus: 0, booted: false, positiveControl: false,
    hiddenTrials: 0, thinTrials: 0, stillTrials: 0, framesRendered: 0, consoleErrors: 0,
    trialCount: 0, minSamples: DEFAULT_CONTRACT.minSamples,
    pacedOutTrials: 0, frameGapBudgetMs: DEFAULT_CONTRACT.frameGapBudgetMs,
  };
  const trials = [];
  const pacedOut = [];
  const dualRuns = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height } });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') evidence.consoleErrors++; });
    const resp = await page.goto(`${opts.origin}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    evidence.httpStatus = resp ? resp.status() : 0;
    evidence.httpOk = evidence.httpStatus === 200;
    if (evidence.httpOk) {
      await page.waitForFunction(() => window.journey && window.journey.scroll, null, { timeout: 90_000 })
        .then(() => { evidence.booted = true; }, () => { evidence.booted = false; });
    }

    if (evidence.booted) {
      /* THE POSITIVE CONTROL, per origin, before any measurement. */
      const pc = await page.evaluate(async () => {
        const s = window.journey.scroll;
        const before = s.surface;
        for (let i = 0; i < 10; i++) window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }));
        await new Promise((r) => setTimeout(r, 400));
        return { before, after: s.surface, total: s.total, fine: matchMedia('(pointer:fine)').matches, hidden: document.hidden };
      });
      evidence.positiveControl = pc.after > pc.before;
      console.log(`  POSCTL  dispatched wheel advanced scroll.surface ${pc.before} -> ${pc.after}  `
        + `[${evidence.positiveControl ? 'PASS' : 'FAIL'}]`);
      console.log(`  scroll.total ${pc.total}   pointer:fine ${pc.fine}   document.hidden ${pc.hidden}\n`);

      /* THE CADENCE, DERIVED FROM THE ROUTE. `gestureConfigs`'s eleven
         trials are DEF-OWNED's unit of comparison and are drawn unchanged;
         only their inter-gesture pauses are redrawn to land inside the
         declared transit windows, so the sweep keeps covering the state this
         class lives in even after a TRANSIT_S edit lengthens a leg. The
         window used is the widest declared boundary, because a pause inside
         the widest is inside every narrower one it is applied to. */
      const windows = dualDelaysMs({ anchors: ANCHORS, transitOf: transitSeconds });
      const widestMs = Math.max(...windows.map((w) => w.ms));
      console.log(`  CADENCE  transit windows ${windows.map((w) => `${w.from}->${w.to}:${w.ms}ms`
        + `${w.declared === null ? '(band)' : ''}`).join('  ')}\n`);

      for (const cfg of transitGestureConfigs(opts.seed, opts.trials, widestMs)) {
        await page.evaluate(parkAt, { fromP: opts.fromP, settleMs: 2200 });
        const r = await page.evaluate(drivenTrial, { cfg, tailMs: 4200, sampleMs: 25, stopP: 0.96 });
        r.fromP = opts.fromP;
        r.anchors = ANCHORS.map((a) => ({ id: a.id, p: a.p }));
        evidence.framesRendered += r.frames;
        if (r.hidden) evidence.hiddenTrials++;
        /* THE PACING GATE, BEFORE ANYTHING IS COUNTED. A trial measured
           through a stall is excluded and NAMED — never silently dropped,
           because a run that quietly kept its lucky trials reports a
           survivorship artefact. See trustVerdict's pacing cause. */
        if (r.pacing.p95 > DEFAULT_CONTRACT.frameGapBudgetMs) {
          evidence.pacedOutTrials++;
          pacedOut.push(`trial ${cfg.t}: p95 frame gap ${r.pacing.p95} ms over ${r.pacing.count} frames `
            + `(budget ${DEFAULT_CONTRACT.frameGapBudgetMs} ms, p50 ${r.pacing.p50}, max ${r.pacing.max})`);
          continue;
        }
        trials.push(r);
        evidence.trialCount++;
        if (r.samples.length < DEFAULT_CONTRACT.minSamples) evidence.thinTrials++;
        /* The per-trial travel control. The origin-level POSCTL proves the
           event path works once; this proves it worked for THIS trial. */
        const maxP = r.samples.reduce((m2, x) => (x[1] > m2 ? x[1] : m2), 0);
        if (maxP - r.samples[0][1] === 0) evidence.stillTrials++;
      }

      /* ---- DW-C5, THE DUAL ----------------------------------------- *
       * Park at a rest, flick, wait a delay drawn INSIDE that boundary's
       * own transit window, flick again, and count the legs. Two is the
       * design; three is the owner's four reports; ONE is DEFECT-02. */
      for (const w of windows) {
        const from = ANCHORS.find((a) => a.id === w.from);
        const startIdx = ANCHORS.findIndex((a) => a.id === w.from);
        for (const delayMs of w.delays) {
          await page.evaluate(parkAt, { fromP: from.p, settleMs: 2200 });
          const d = await page.evaluate(dualTrial, {
            delayMs, burst: { delta: 200, count: 8, iv: 16 }, tailMs: 4200, sampleMs: 25,
          });
          if (d.hidden) evidence.hiddenTrials++;
          dualRuns.push({ ...d, from: w.from, to: w.to, delayMs, startIdx, dir: 1, anchors: ANCHORS });
        }
      }
    }
  } finally {
    await browser.close();
  }

  const trust = trustVerdict(evidence);
  console.log(`  INPUTS  trials ${evidence.trialCount}   frames ${evidence.framesRendered}   `
    + `hidden ${evidence.hiddenTrials}   thin ${evidence.thinTrials}   still ${evidence.stillTrials}   `
    + `console errors ${evidence.consoleErrors}   paced out ${evidence.pacedOutTrials}`);
  /* EVERY EXCLUDED TRIAL IS NAMED. CONNECT-SKIP's rule: a trial dropped for
     pacing is a fact about the run and must appear in the report, or the
     next reader cannot tell a clean sweep from a lucky one. */
  for (const line of pacedOut) console.log(`  PACED OUT  ${line}`);
  SENT.reach('inputs');
  if (!trust.trusted) {
    console.log('\nFAIL dwell-run INCONCLUSIVE — no dwell measurement is reported (D63)');
    for (const c of trust.causes) console.log(`     cause: ${c}`);
    SENT.reach('contract');
    process.exit(1);
  }

  const out = evaluateContract(trials);
  console.log('');
  for (const r of out.rows) {
    console.log(`  trial ${String(r.t).padStart(2)}  pause ${String(r.pause).padStart(4)} ms  `
      + `gestures ${r.gestures}  samples ${String(r.sampleCount).padStart(3)}  `
      + `dwell ${JSON.stringify(r.dwell)}  judged [${r.judged}]  swept [${r.swept}]  `
      + `maxSweptPerWindow ${r.maxSweptPerWindow}  fromRest ${r.fromRestGestures}/${r.maxSweptFromRest}`
      + `/[${r.sweptFromRest}]  travelled ${r.travelled}`
      + `${r.wrapped ? '  (trace truncated at a route wrap)' : ''}`);
  }
  console.log(`\n  BOUND  DW-C1 one gesture / one additional section: max swept per window `
    + `${out.margin.maxSweptPerWindow} (contract <= ${DEFAULT_CONTRACT.sweptPerWindowMax})`);
  console.log(`  BOUND  DW-C2 from-rest: ${out.margin.fromRestGestures} gesture(s) began with the ride at rest; `
    + `most sections swept during any one of their quiet phases ${out.margin.maxSweptFromRest} `
    + `(contract <= ${DEFAULT_CONTRACT.sweptPerWindowMax})`);
  console.log(`  SET    DW-C3(set) anchors ever swept past: [${out.everSwept}]`);

  /* ---- THE POST-FIX LAW, AND ITS MARGINS ------------------------------ */
  console.log(`\n  LAW    DW-C3 machine-owned crossings ${out.margin.machineOwned} of ${out.margin.crossings} `
    + `(contract <= ${DEFAULT_CONTRACT.machineOwnedMax}) — census ${JSON.stringify(out.margin.mechanismCensus)}`);
  console.log(`  LAW    DW-C4 landings ${out.margin.landings} composed, ${out.margin.shortLandings} abandoned inside `
    + `the ${DEFAULT_CONTRACT.dwellFloorMs} ms floor`);
  /* THE MARGIN, PRINTED EVERY RUN. It used to lead with the AUTHORED beat and
     the margin by which it cleared the floor; that constant was retired on
     2026-08-26 (journey/constants/scroll.js) and the page authors no hold on
     the scroll path at all, so what is left is what the ride delivers unaided
     against the floor this instrument calls a stop. The floor is still not to
     be lowered to keep anything green. */
  console.log(`  MARGIN dwell floor ${DEFAULT_CONTRACT.dwellFloorMs} ms; shortest composed landing measured `
    + `${out.margin.minLandingMs === null ? 'n/a (no landing composed)' : `${out.margin.minLandingMs} ms`}`);
  console.log(`  REPORTED, NOT ASSERTED  D88 second opinion on the in-flight p-proxy: `
    + `${out.margin.proxy.observed} gesture start(s) carried model state, `
    + `${out.margin.proxy.disagree} disagreed with the proxy`);
  console.log(`  REPORTED, NOT ASSERTED  ${out.margin.longPauseTrials} trial(s) paused >= `
    + `${DEFAULT_CONTRACT.longPauseMs} ms; smallest judged dwell among them ${out.margin.minDwellUnderLongPause} ms; `
    + `trials that paused that long AND still swept past a rest: [${out.margin.longPauseTrialsThatSwept}] `
    + '(a non-empty list is the counterexample to the threshold reading of S-4\'s dwell/pause table, not a failure)');

  if (opts.record) {
    writeFileSync(opts.record, JSON.stringify({
      origin: opts.origin, seed: opts.seed, trials: opts.trials, fromP: opts.fromP,
      viewport: [opts.width, opts.height], evidence, runs: trials, dualRuns,
    }));
    console.log(`\n  recorded ${trials.length} trial(s) to ${opts.record}`);
  }

  /* ---- DW-C5, THE DUAL — evaluated separately because it is a DIFFERENT
   * EXPERIMENT with its own validity condition. `evaluateDual` refuses
   * outright if no run delivered its second stream while a resolution was
   * still in flight, because those runs measured the from-standstill case,
   * which is flick-probe.mjs's experiment and not this one. */
  const dual = dualRuns.length ? evaluateDual(dualRuns) : null;
  if (dual) {
    console.log('');
    for (const r of dual.rows) {
      console.log(`  dual  ${r.from}->${r.to}  delay ${String(r.delayMs).padStart(4)} ms  `
        + `mid-flight ${r.midFlightProved ? 'PROVED' : 'no (discarded — measured the standstill case)'}  `
        + `legs ${r.legs === null ? 'not-a-rest' : r.legs}  end p ${r.endP}`);
    }
    const judged = dual.rows.filter((r) => r.midFlightProved).length;
    console.log(`  LAW    DW-C5 the dual: ${judged} of ${dual.rows.length} run(s) delivered their second `
      + `stream mid-flight; a stream born IN FLIGHT buys exactly ${DEFAULT_CONTRACT.dualLegs} additional leg(s) — `
      + 'it is spent at the landing of the flight it was born into. MORE is the SKIP the owner '
      + 'reported four times (#26); FEWER means the from-rest flick that opened the run was REFUSED');
  }

  SENT.reach('contract');
  const violations = [...out.violations, ...(dual ? dual.violations : [])];
  if (violations.length) {
    console.log('\nFAIL dwell-run — the dwell contract is violated:');
    for (const v of violations) console.log(`  ${v}`);
    process.exit(1);
  }
  /* THE RECEIPT, WRITTEN ONLY HERE — past every violation check, on the
     one path where the ring is green. See RECEIPT's header. */
  const receipt = {
    at: new Date().toISOString(),
    origin: opts.origin,
    seed: opts.seed,
    trials: opts.trials,
    trialsKept: evidence.trialCount,
    trialsPacedOut: evidence.pacedOutTrials,
    machineOwned: out.margin.machineOwned,
    crossings: out.margin.crossings,
    minLandingMs: out.margin.minLandingMs,
    dualRuns: dual ? dual.rows.filter((r) => r.midFlightProved).length : 0,
    governed: governedHashes(),
  };
  writeFileSync(RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`\n  dwell contract holds across every trial.`);
  console.log(`  RECEIPT written to tools/dwell-receipt.json over ${GOVERNED_PATHS.length} governed path(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.log(`FAIL dwell-run ${e instanceof HarnessFault ? 'HARNESS FAULT' : 'THREW'} — ${e.message}`);
  process.exit(1);
});
