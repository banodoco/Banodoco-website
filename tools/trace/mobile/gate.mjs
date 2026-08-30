/* ====================================================================
 * tools/trace/mobile/gate.mjs — THE PHONE RING (MOBILE-GATE-01).
 *
 *   PORT=8177 npm run test:mobile          (needs `PORT=8177 python3 serve.py`)
 *
 * WHAT THIS IS FOR. Until 2026-08-21 no instrument in this repository
 * measured anything about phone rendering. Every time one was pointed at a
 * phone afterwards it found a fault — a camera regression blessed into a
 * golden in the same commit, 15 contributor faces where the golden showed 16,
 * three rail glyphs 2px low, two flicks buying one section. The instruments
 * that found them are the files beside this one. Until now they were things a
 * human ran and read; this file is what makes them FAIL.
 *
 * WHY IT IS NOT IN `npm run check`. The probes need real Chrome and
 * playwright, and `tools/check.sh` refuses capture work above load 8. A gate
 * wired there is a gate people learn to skip. It is in `check:browser`,
 * beside browser-smoke, and the cadence is written in tools/README.md.
 *
 * WHAT IT DOES NOT DO — and this is the design, not a gap. It never compares
 * a rendered image. The ten goldens cannot be reproduced on this machine by
 * any tree (a pristine pre-refactor checkout misses them by the same MAE as
 * today's, because they were shot on other hardware), so a pixel gate here
 * would be measuring the GPU. Everything below is a PROPERTY: a resolve at a
 * rest, a formation variable, a beat gap, an ink centroid against its own
 * housing, a face count. Those are true or false regardless of hardware.
 *
 * D118, which has bitten this program eleven times: every exit code below is
 * read from `spawnSync` on the invocation itself. Never a backgrounded
 * wrapper, never `timeout` (which does not exist on macOS and returns 127).
 * ==================================================================== */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8177';
// Staged by name under the caller's scratch, never os.tmpdir() (D97/D127), and
// removed by that name at the end whether the run passed or failed.
const SCRATCH = process.env.PHONE_SCRATCH || join(HERE, 'out');
mkdirSync(SCRATCH, { recursive: true });
const env = { ...process.env, PORT, PHONE_SCRATCH: SCRATCH };

/* A HARD WALL-CLOCK CAP PER STAGE, and it is not belt-and-braces. Playwright's
   own timeouts cover goto and waitForFunction but NOT `page.evaluate`, and the
   rides drive their touch streams from inside one: measured on this machine at
   load 57, `ride.mjs flick1` hung in its rAF loop for 15 minutes with 0.01 s of
   CPU and no timeout to end it. A gate that hangs is a gate people switch off,
   so a stage that overruns is a FAILED stage — never a stalled run. `timeout`
   makes spawnSync return status null, which is not 0, so it fails on its own. */
const CAP_MS = Number(process.env.MOBILE_GATE_CAP_MS || 240000);
const run = (file, args = []) => {
  const r = spawnSync(process.execPath, [join(HERE, '..', file), ...args],
    { env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: CAP_MS, killSignal: 'SIGKILL' });
  const code = r.status === null ? (r.signal ? 124 : 125) : r.status;
  return { code, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
};
/* One retry per PROBE only. Measured on this machine: the live journey's WebGL
   boot under a shared dev server flakes past its 90 s waitForFunction roughly
   one run in eight (rail-centre.mjs carries the same retry for the same
   reason). An ANALYZER never retries — it is pure arithmetic over a file, so a
   second attempt could only hide a real red. */
const probe = (file, args = []) => {
  let r = run(file, args);
  if (r.code !== 0) { console.log(`  (${file} ${args.join(' ')} flaked: exit ${r.code}; retrying once)`); r = run(file, args); }
  return r;
};

const server = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', `http://localhost:${PORT}/`], { encoding: 'utf8' });
if (server.stdout !== '200') {
  console.error(`test:mobile: no server on ${PORT} (got "${server.stdout}"). Start it with: PORT=${PORT} python3 serve.py`);
  process.exit(2);
}

const results = [];
const stage = (name, r) => {
  results.push({ name, code: r.code });
  const tail = r.out.split('\n').filter((l) => /^\s{2}(ok|FAIL)\s|pass$|^rail-centre:|^faces:/.test(l));
  console.log(`\n=== ${name} — exit ${r.code}${r.err ? ` (${r.err.message})` : ''}`);
  console.log(tail.length ? tail.join('\n') : r.out.trim().split('\n').slice(-12).join('\n'));
};

// 1. The pure camera field, read off the SHIPPED module graph in a browser.
stage('posefield', probe('mobile/posefield.mjs'));
stage('posefield/assert', run('mobile/analyze-posefield.mjs', ['--assert']));

// 2. The live chip chain, phone against a desktop control from the same run.
stage('gatesweep phone', probe('mobile/gatesweep.mjs', ['phone']));
stage('gatesweep desktop', probe('mobile/gatesweep.mjs', ['desktop']));
stage('gatesweep/assert', run('mobile/analyze-gatesweep.mjs', ['--assert']));

// 3. Real touch. flick1 = the plain arrival; subflick = the soft swipe whose
//    return was the oscillation suspect; jitterflick2 = the 2px backward
//    finger-settle, re-anchored 2026-08-26 under
//    docs/code-health/2026-08-26-a7-ruling.md Ruling 1 and now two-sided in
//    TIME: a flick born mid-flight buys nothing and the ride stands unattended
//    on the rest for 14 s, then a flick born AT that rest buys its section.
for (const scen of ['flick1', 'subflick', 'jitterflick2']) {
  stage(`ride ${scen}`, probe('mobile/ride.mjs', [scen]));
  stage(`ride ${scen}/assert`, run('mobile/analyze-ride.mjs', [join(SCRATCH, `ride-${scen}.json`), '--assert']));
}

// 4. The two things the capture set structurally cannot see: the rail (hidden
//    before every shutter, so it appears in none of the ten goldens) and the
//    face count (the mask latches in frozen capture mode).
stage('rail-centre', probe('rail-centre.mjs', ['--assert']));
/* …and the rail's OTHER blind spot, which rail-centre could not see either:
   it runs a coarse phone and a fine desktop, and the retired half moon's
   per-frame recycle offset only paints where the two overlap — narrow enough
   for the mobile file, still reporting `(hover: hover)`. Always with
   `--prove-failure`: the mutant is the pre-fix rule, and a run that cannot
   red is not evidence. */
stage('rail-recycle', probe('rail-recycle.mjs', ['--assert', '--prove-failure']));
stage('faces', probe('mobile/faces.mjs'));

if (!process.env.PHONE_SCRATCH) rmSync(SCRATCH, { recursive: true, force: true });
const bad = results.filter((r) => r.code !== 0);
console.log(`\ntest:mobile: ${results.length - bad.length}/${results.length} stages green`);
if (bad.length) console.log(`FAILED: ${bad.map((b) => `${b.name} (exit ${b.code})`).join(', ')}`);
process.exit(bad.length ? 1 : 0);
