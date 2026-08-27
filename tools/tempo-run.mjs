/* ==================================================================== *
 * tools/tempo-run.mjs — TEMPO-01's entry point. `npm run test:tempo`.
 *
 * Everything that DECIDES anything is in tools/tempo-oracle.mjs and is
 * gated there by tools/test-instrument-layer.mjs's `TO-P` pin and its
 * nine mutants, at position 2 of every `npm run check`. This file owns
 * only what needs a browser: the launch, the injected clock, the
 * per-origin positive control, one fresh page per episode, and the D63
 * refusal.
 *
 * WHY IT IS A SEPARATE FILE — the dwell-run/pose-run precedent.
 * `playwright-core` costs 2.0 s to import and the oracle is imported by a
 * gated suite. It is also why this is an ENTRY POINT and not a shared
 * instrument, in the sense `tools/test-instrument-layer.mjs`'s COV-1
 * means: nothing imports this file, and it decides nothing.
 *
 * THE INJECTED CLOCK is installed with `addInitScript`, i.e. before the
 * document loads, so `THREE.Clock` reads it from the very first frame.
 * `tools/trace/brake-tail.py` established the recipe; this is the same
 * one, moved into the browser ring where it can run as a gate instead of
 * by hand. Verified on this host: dt is 0.01667 on every rendered frame of
 * a 374-frame lap, min = max. The swap itself is `VT_INJECT` and it lives
 * in the ORACLE, not here — `tools/test-epilogue-retire.mjs` was migrated
 * onto this same rig on 2026-08-26 and imports it from there, so there is
 * one clock swap in the tree rather than one per entry point.
 *
 * ONE FRESH PAGE PER EPISODE. The scenarios boot at different rests and
 * one of them fires a wrap; sharing a page would let an episode inherit
 * the state its predecessor left, which is the exact class of fault this
 * oracle exists to catch.
 *
 * Run:
 *   PORT=8177 node tools/tempo-run.mjs
 *   node tools/tempo-run.mjs --origin=http://127.0.0.1:8263      — a staged tree
 *   node tools/tempo-run.mjs --only=wrap-fwd,epilogue-early
 *   node tools/tempo-run.mjs --record=<path>                     — write the rows
 * ==================================================================== */

import { existsSync, writeFileSync } from 'node:fs';

import { HarnessFault, fault, armSentinel } from './instrument-ledger.mjs';
import {
  DEFAULT_CONTRACT, SCENARIOS, CHANNEL_CLASSES, VT_INJECT,
  runEpisode, positiveControl, evaluate, clockVerdict, parseArgs,
} from './tempo-oracle.mjs';
/** THE ROUTE IS THE AUTHORITY FOR TL3's CEILING and for where the rests
 *  are, and the oracle takes both by INJECTION so that it stays free of
 *  any journey import. This entry point already imports a browser, so it
 *  is the right place to close the loop — the dwell-run precedent.
 *
 *  ONE STATED LIMIT. The declaration is read from THIS repo, not from the
 *  origin being driven. In normal use they are the same bytes. On a
 *  `--origin` pointed at a STAGED tree they need not be, so a red-proof
 *  run must say which tree supplied the ceiling. No flag is added for it:
 *  a knob that exists only for red-proofs rots between them, and the
 *  fallback it would exercise is already gated in the pure ring by
 *  test-instrument-layer's TO8. */
import { restProgress, forwardBrakeTailSeconds } from '../journey/route.js';

const CHROME_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

async function main() {
  const SENT = armSentinel('tempo-run', ['inputs', 'contract']);
  const opts = parseArgs(process.argv.slice(2));
  const chrome = CHROME_CANDIDATES.find((c) => existsSync(c));
  if (!chrome) fault('no Chrome/Chromium executable found — this instrument cannot report without one');

  const only = opts.only ? new Set(opts.only.split(',').map((s) => s.trim())) : null;
  const deck = SCENARIOS.filter((s) => !only || only.has(s.id));
  if (!deck.length) fault(`--only=${opts.only} selected no scenario`);

  console.log('tools/tempo-run.mjs — the tempo oracle: continuity, realised floors, dead tail\n');
  console.log(`  origin ${opts.origin}   viewport ${opts.width}x${opts.height}   `
    + `episodes ${deck.length}   clock INJECTED at ${DEFAULT_CONTRACT.frameMs.toFixed(4)} ms/frame\n`);
  const judged = Object.entries(CHANNEL_CLASSES).filter(([, v]) => v.dmax !== null);
  const watched = Object.entries(CHANNEL_CLASSES).filter(([, v]) => v.dmax === null).map(([k]) => k);
  console.log(`  TL1  ASSERTED over ${judged.map(([k, v]) => `${k} (ignition <= ${v.dmax})`).join(', ')}`);
  console.log(`       observed but not judged here: ${watched.join(', ')} — see CHANNEL_CLASSES for why, per class`);
  console.log(`  TL2  ASSERTED — a channel dark at the arm may not light before `
    + `${DEFAULT_CONTRACT.onsetFloorFrac} of the machine-owned envelope is spent`);
  console.log(`  TL3  ASSERTED — the route's declared brake budget per leg, or ${DEFAULT_CONTRACT.deadTailMaxMs} ms `
    + 'where the route declares none\n');

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal'] });
  const episodes = [];
  const declaredMs = {};
  let consoleErrors = 0;
  const wall0 = Date.now();
  try {
    /* THE POSITIVE CONTROL, on its own page, before any measurement.
       It gets its own page rather than riding the first episode's because
       the deck's first boot is the FINAL rest, where 24 forward notches
       fire a wrap and land the model back at p = 0 — a control that read
       "surface went down" there would have failed while the event path was
       working perfectly. It is parked mid-route instead, where forward is
       unambiguously forward.
       It proves two things: that a dispatched wheel really moves the
       model (the coordinator's own sweep reported "Mission" at every p for
       want of one), and that the SPINE reads the injected clock — without
       which every figure below is a wall-clock figure wearing a virtual
       name. */
    {
      const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height } });
      await ctx.addInitScript(VT_INJECT);
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
      const url = `${opts.origin}/?nointro=1&steady=1&p=${restProgress('inspire')}`;
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 90_000 });
      if (!resp || resp.status() !== 200) fault(`${url} answered ${resp ? resp.status() : 'nothing'}`);
      await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled,
        null, { timeout: 90_000 });
      const posctl = await page.evaluate(positiveControl, { contract: DEFAULT_CONTRACT });
      await ctx.close();
      const moved = posctl.after > posctl.before;
      const clockOk = posctl.frames > 0
        && Math.abs(posctl.dtMin - DEFAULT_CONTRACT.frameMs / 1000) < 1e-4
        && Math.abs(posctl.dtMax - DEFAULT_CONTRACT.frameMs / 1000) < 1e-4;
      console.log(`  POSCTL  wheel advanced scroll.surface ${posctl.before} -> ${posctl.after}  [${moved ? 'PASS' : 'FAIL'}]`);
      console.log(`  POSCTL  the spine read the injected clock: ${posctl.frames} frame(s), `
        + `dt ${posctl.dtMin}..${posctl.dtMax} s over ${posctl.vtSpent.toFixed(1)} ms of virtual time  `
        + `[${clockOk ? 'PASS' : 'FAIL'}]`);
      console.log(`  pointer:fine ${posctl.fine}   document.hidden ${posctl.hidden}\n`);
      if (!moved || !clockOk) {
        console.log('FAIL tempo-run INCONCLUSIVE — the positive control did not hold, so nothing below would mean anything (D63)');
        await browser.close();
        SENT.reach('inputs'); SENT.reach('contract');
        process.exit(1);
      }
    }

    for (const sc of deck) {
      /* The glide scenarios take their boot and their target from the
         route, and their CEILING from the route's own declaration. */
      const bootP = sc.kind === 'glide' ? restProgress(sc.from) : sc.bootP;
      const targetP = sc.kind === 'glide' ? restProgress(sc.to) : null;
      if (sc.kind === 'glide') {
        const s = forwardBrakeTailSeconds(bootP, targetP, 1);
        declaredMs[sc.id] = Number.isFinite(s) && s > 0 ? s * 1000 : null;
      }

      const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height } });
      await ctx.addInitScript(VT_INJECT);
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') { consoleErrors++; console.log(`  [console.error] ${m.text()}`); } });
      const url = `${opts.origin}/?nointro=1&steady=1&p=${bootP}`;
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 90_000 });
      if (!resp || resp.status() !== 200) fault(`${url} answered ${resp ? resp.status() : 'nothing'}`);
      await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled,
        null, { timeout: 90_000 });

      const ep = await page.evaluate(runEpisode, { sc: { ...sc, bootP, targetP }, contract: DEFAULT_CONTRACT });
      const v = clockVerdict(ep, DEFAULT_CONTRACT);
      console.log(`  EPISODE ${sc.id.padEnd(18)} frames ${String(ep.rows.length).padStart(4)}  `
        + `dt ${v.dtMin}..${v.dtMax}  ${v.trusted ? 'measurable' : `NOT MEASURABLE — ${v.causes.join('; ')}`}`);
      console.log(`          ${sc.why}`);
      if (ep.marks.wrapFired === false) console.log('          NOTE the wrap never fired in this episode');
      if (Number.isFinite(ep.marks.pullAtWrap)) console.log(`          pull at the wrap: ${ep.marks.pullAtWrap}`);
      episodes.push(ep);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  SENT.reach('inputs');

  const out = evaluate(episodes, declaredMs, DEFAULT_CONTRACT);
  console.log(`\n  INPUTS  episodes ${episodes.length}   console errors ${consoleErrors}   `
    + `wall ${(Date.now() - wall0) / 1000}s   kept ${JSON.stringify(out.kept)} of ${JSON.stringify(out.attempted)}`);

  for (const r of out.rows) {
    if (!r.trusted) continue;
    if (r.tl1) {
      const judged = r.tl1.worst.filter((x) => x.dmax !== null);
      if (!judged.length) {
        console.log(`\n  TL1  ${r.id}: NO FIGURE — the machine never took the ride in this episode, so there was no window to judge`);
      } else {
        const worst = judged.reduce((a, b) => (b.up > a.up ? b : a));
        console.log(`\n  TL1  ${r.id}: worst IGNITION ${worst.up.toFixed(4)} on ${worst.tag} (ceiling ${worst.dmax})`);
      }
      for (const w of r.tl1.worst.filter((x) => Math.max(x.up, x.down) > 0.02)) {
        console.log(`         ${w.dmax === null ? '(reported)' : '(judged)  '} ${w.tag.padEnd(24)} `
          + `up ${w.up.toFixed(4)}${w.upAt ? ` @+${w.upAt.msIntoWindow}ms ${w.upAt.from}->${w.upAt.to}` : ''}`
          + `   down ${w.down.toFixed(4)}${w.downAt ? ` @+${w.downAt.msIntoWindow}ms` : ''}`
          + `${w.owner ? `   [owned by ${w.owner}]` : ''}`);
      }
      if (r.tl1.closes.length) {
        console.log(`         REPORTED, NOT ASSERTED  ${r.tl1.closes.length} group(s) went dark while still lit: `
          + `${r.tl1.closes.map((c) => `${c.tag}@+${Math.round(c.at)}ms from ${c.from}`).join(', ')}`);
      }
    }
    if (r.tl2) {
      console.log(`\n  TL2  ${r.id}: envelope ${r.tl2.spanMs} ms, floor `
        + `${Math.round(r.tl2.spanMs * DEFAULT_CONTRACT.onsetFloorFrac)} ms`);
      for (const o of r.tl2.onsets) {
        console.log(`         ${o.tag.padEnd(24)} lit at +${o.ms} ms  (${(o.frac * 100).toFixed(1)}% of the envelope)`);
      }
      if (!r.tl2.onsets.length) console.log('         no channel was dark at the arm and lit during the envelope');
    }
    if (r.tl3) {
      const m = r.tl3.measured;
      if (!m) console.log(`\n  TL3  ${r.id}: NO FIGURE — ${r.tl3.why}`);
      else {
        console.log(`\n  TL3  ${r.id}: dead tail ${m.deadMs} ms against a ceiling of ${m.ceilingMs} ms `
          + `(${m.declared ? "route.js's declared budget for this leg" : "the class's shipped budget — this leg declares NONE"})`);
        console.log(`         the dead window bought ${m.pathBought} u of the leg's ${m.pathTotal} u (${m.sharePct}%)`);
      }
    }
  }

  if (opts.record) {
    writeFileSync(opts.record, JSON.stringify({ origin: opts.origin, episodes, declaredMs }, null, 1));
    console.log(`\n  recorded ${episodes.length} episode(s) to ${opts.record}`);
  }

  SENT.reach('contract');
  if (out.refusals.length) {
    console.log('\nFAIL tempo-run INCONCLUSIVE — no tempo figure is reported (D63)');
    for (const c of out.refusals) console.log(`     ${c}`);
    for (const r of out.rows.filter((x) => !x.trusted)) console.log(`     ${r.id}: ${r.causes.join('; ')}`);
    process.exit(1);
  }
  /* A LAW THAT IS MEASURABLE BUT NOT YET ASSERTABLE PRINTS HERE INSTEAD OF
     FAILING. TL2 used this channel until 2026-08-26 and no longer does: its
     residual was cured rather than its floor lowered, so it moved into the
     exit code at the floor it was first measured against (tempo-oracle.mjs's
     `evaluate` has the four-tree table). The block stays because a printed
     deficit is the right home for the NEXT such reading — the alternative to
     printing it is silence, and silence is what this instrument exists
     against. It is empty today, deliberately and visibly. */
  if (out.reported.length) {
    console.log('\n  FINDING — REPORTED, NOT ASSERTED (this does not fail the run; see tempo-oracle.mjs `evaluate`):');
    for (const v of out.reported) console.log(`  ${v}`);
  }

  if (out.violations.length) {
    console.log('\nFAIL tempo-run — the tempo contract is violated:');
    for (const v of out.violations) console.log(`  ${v}`);
    process.exit(1);
  }
  console.log(`\n  the tempo contract holds across every episode: `
    + `TL1 ${out.kept.TL1}/${out.attempted.TL1}, TL2 ${out.kept.TL2}/${out.attempted.TL2}, TL3 ${out.kept.TL3}/${out.attempted.TL3}.`);
  process.exit(0);
}

main().catch((e) => {
  console.log(`FAIL tempo-run ${e instanceof HarnessFault ? 'HARNESS FAULT' : 'THREW'} — ${e.message}`);
  process.exit(1);
});
