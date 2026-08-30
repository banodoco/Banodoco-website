/* ======================================================================= *
 * RUN THE CONTRACT CHAIN AND REPORT EVERY RED, NOT JUST THE FIRST.
 *
 *   node tools/run-contracts.mjs
 *
 * THIS IS PLUMBING, NOT AN INSTRUMENT. It asserts nothing, measures nothing
 * and knows nothing about any suite. It reads `package.json`'s `test:contracts`
 * string — the same string, split the same way (' && '), that
 * tools/test-gate-composition.mjs reads — and runs the entries in the pinned
 * order. Every verdict in the output below is the suites' own. Keep it that
 * way: an assertion added here is a gate nobody pinned.
 *
 * WHY IT EXISTS. `test:contracts` is a 48-entry `&&` chain — counted, not
 * assumed, and derived below rather than hard-coded here, because the chain
 * grows — and on 2026-08-26 an early red hid everything downstream three
 * separate times. The sharpest case: the uniform-name pins in
 * test-render-baseline.mjs, which could not see renames at all, sat unnoticed
 * behind a red far above them (they were at position 44 the day it happened;
 * the wave pin is last, wherever last is). The tree looked like it had one
 * problem and had several. D80 already said the quiet part — "an `&&` chain
 * reports the first problem and hides every other" — and a closing pass is
 * exactly when a full red map matters most.
 *
 * WHY TIER 1 STILL FAIL-FASTS. Serial fail-fast is a feature for positions
 * 1-3 and a bug everywhere else. Those three are D80's tier 1: the chain's own
 * shape, the shared instrument layer every other suite imports, and the
 * assertion-provenance sweep over both. If the instrument layer itself is red,
 * every downstream colour is noise, and stopping is the honest report.
 *
 * WHAT IS DELIBERATELY UNCHANGED. `package.json`'s `test:contracts` string is
 * not edited by this file's existence — it stays the canonical, GC-pinned,
 * ordered chain, and remains runnable by hand as the fail-fast invocation.
 * Order is unchanged, the wave pin still runs last, there is no parallelism
 * (serial preserves the pinned order's meaning), and the exit code is
 * identical. Every byte a suite printed still reaches the terminal, in order;
 * the summary is added AFTER it. The report is a superset of the chain's, so
 * no failure is ever less visible than it was.
 * ======================================================================= */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chain = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).scripts?.['test:contracts'];
if (typeof chain !== 'string' || !chain.trim()) {
  console.error('run-contracts: package.json has no test:contracts script — refusing to report green.');
  process.exit(1);
}
const entries = chain.split(' && ').map((s) => s.trim()).filter(Boolean);

/** D80's tier 1 occupies positions 1-3 of the chain; GC-TIERS is what pins
 *  that, and this is the only place the boundary is acted on. */
const TIER1 = 3;
const reds = [];

for (let i = 0; i < entries.length; i++) {
  const r = spawnSync('/bin/sh', ['-c', entries[i]], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status === 0) continue;
  const why = r.error ? `could not start (${r.error.message})`
    : r.signal ? `killed by ${r.signal}` : `exit ${r.status}`;
  const fault = /HarnessFault|\[FAULT\]/.test(`${r.stdout || ''}${r.stderr || ''}`);
  reds.push({ pos: i + 1, entry: entries[i], why, fault });
  console.error(`\n*** RED  [${i + 1}/${entries.length}]  ${entries[i]}  — ${why}`
    + (fault ? '  (HARNESS FAULT)' : '') + '\n');
  if (i < TIER1) {
    console.error(`run-contracts: tier 1 is red, so downstream colours would be noise — STOPPING at `
      + `position ${i + 1} of ${entries.length}. ${entries.length - i - 1} entr`
      + `${entries.length - i - 1 === 1 ? 'y' : 'ies'} not run. Fix the instrument layer, then re-run.`);
    break;
  }
}

if (!reds.length) {
  console.log(`\nrun-contracts: all ${entries.length} contract suites PASS (pinned order, tier 1 fail-fast).`);
  process.exit(0);
}
console.error(`\n=================== ${reds.length} RED of ${entries.length} ===================`);
for (const r of reds) {
  console.error(`  ${String(r.pos).padStart(2)}. ${r.entry}${r.fault ? '  [HARNESS FAULT]' : ''}  — ${r.why}`);
}
console.error('==========================================================\n');
process.exit(1);
