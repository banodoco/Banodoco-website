// tools/trace/mobile/analyze-posefield.mjs — QA-ONLY analyzer for the mobile probes
// beside it. Adopted 2026-08-24 (PHONE-01) with the probes; see
// posefield.mjs's header for why this instrument set is kept.
// analyze1.mjs — derivatives + landmarks from posefield.json
import { readFileSync } from 'node:fs';
const scratchOr = (name) => (process.env.PHONE_SCRATCH
  ? `${process.env.PHONE_SCRATCH}/${name}`
  : new URL(`./out/${name}`, import.meta.url).pathname);

const D = JSON.parse(readFileSync(scratchOr('posefield.json')));
const L = D.landmarks;
console.log('landmarks', L);

function ang(a, b) { // angle between two forward dirs (deg)
  const [ax, ay, az] = a, [bx, by, bz] = b;
  const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz);
  const dot = (ax * bx + ay * by + az * bz) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}
const fwd = (r) => [r.tgt[0] - r.pos[0], r.tgt[1] - r.pos[1], r.tgt[2] - r.pos[2]];

for (const [name, rows] of Object.entries(D.rows)) {
  // resolve landmarks
  let firstNZ = null, fully = null;
  for (const r of rows) {
    if (firstNZ === null && r.resolve > 1e-4 && r.p > 0.30) firstNZ = r.p;
    if (fully === null && r.resolve > 0.9999 && r.p > 0.30) fully = r.p;
  }
  const atRest = rows.reduce((best, r) => Math.abs(r.p - L.connectRest) < Math.abs(best.p - L.connectRest) ? r : best);
  // resolve monotonicity over the leg 0.26..rest
  let dips = [];
  let prev = null;
  for (const r of rows) {
    if (r.p < 0.30 || r.p > L.connectRest) continue;
    if (prev && r.resolve < prev.resolve - 1e-6) dips.push([prev.p, prev.resolve, r.resolve]);
    prev = r;
  }
  console.log(`\n== ${name}`);
  console.log(` resolve: firstNonZero p=${firstNZ?.toFixed(4)} fully p=${fully ? fully.toFixed(4) : 'NEVER'} atRest=${atRest.resolve.toFixed(4)} gazeAtRest=${atRest.gazeDeg.toFixed(2)}deg`);
  if (dips.length) {
    const worst = dips.reduce((w, d) => (d[1] - d[2] > w[1] - w[2] ? d : w));
    console.log(` resolve NON-MONOTONE: ${dips.length} falling samples; worst drop ${(worst[1] - worst[2]).toExponential(2)} at p~${worst[0].toFixed(4)}; span p ${dips[0][0].toFixed(4)}..${dips[dips.length - 1][0].toFixed(4)}`);
    // total peak-to-trough over the dipping region
    let peak = -1, troughAfterPeak = 2, peakP = 0, troughP = 0;
    for (const r of rows) {
      if (r.p < 0.30 || r.p > L.connectRest) continue;
      if (r.resolve > peak) { peak = r.resolve; peakP = r.p; troughAfterPeak = r.resolve; troughP = r.p; }
      else if (r.resolve < troughAfterPeak) { troughAfterPeak = r.resolve; troughP = r.p; }
    }
    console.log(` resolve peak ${peak.toFixed(4)} @p${peakP.toFixed(4)} then trough ${troughAfterPeak.toFixed(4)} @p${troughP.toFixed(4)}`);
  } else console.log(' resolve monotone over leg');

  // angular speed of view dir + gaze rate, sampled coarsely at key p's
  const speedAt = (p) => {
    const i = rows.findIndex((r) => r.p >= p);
    if (i < 1 || i >= rows.length - 1) return null;
    const dp = rows[i + 1].p - rows[i - 1].p;
    return {
      angVel: ang(fwd(rows[i - 1]), fwd(rows[i + 1])) / dp,           // deg per p
      posVel: Math.hypot(...[0, 1, 2].map(k => rows[i + 1].pos[k] - rows[i - 1].pos[k])) / dp,
      gazeVel: (rows[i + 1].gazeDeg - rows[i - 1].gazeDeg) / dp,
      fovVel: (rows[i + 1].fov - rows[i - 1].fov) / dp,
      tgtYvel: (rows[i + 1].tgt[1] - rows[i - 1].tgt[1]) / dp,
    };
  };
  const KP = [0.30, 0.34, 0.37, 0.379, 0.381, 0.40, 0.42, 0.430, 0.4315, 0.433, 0.45, 0.47, 0.49, 0.51, 0.52, 0.5228];
  console.log('    p    angV(deg/p) posV(u/p) gazeV fovV tgtYv  resolve');
  for (const p of KP) {
    const s = speedAt(p);
    const r = rows.find((x) => x.p >= p);
    if (s) console.log(`  ${p.toFixed(4)} ${s.angVel.toFixed(1).padStart(8)} ${s.posVel.toFixed(1).padStart(8)} ${s.gazeVel.toFixed(1).padStart(7)} ${s.fovVel.toFixed(0).padStart(5)} ${s.tgtYvel.toFixed(2).padStart(6)} ${r.resolve.toFixed(3).padStart(7)}`);
  }
  // angular-velocity curve extrema over the leg (local minima/maxima)
  const av = [];
  for (let i = 2; i < rows.length - 2; i += 2) {
    const dp = rows[i + 2].p - rows[i - 2].p;
    av.push({ p: rows[i].p, v: ang(fwd(rows[i - 2]), fwd(rows[i + 2])) / dp });
  }
  const inLeg = av.filter((x) => x.p > 0.27 && x.p < L.connectRest);
  let ext = [];
  for (let i = 1; i < inLeg.length - 1; i++) {
    const a = inLeg[i - 1].v, b = inLeg[i].v, c = inLeg[i + 1].v;
    if ((b > a && b > c) || (b < a && b < c)) ext.push({ p: +inLeg[i].p.toFixed(4), v: +inLeg[i].v.toFixed(1), kind: b > a ? 'max' : 'min' });
  }
  // merge adjacent noise
  console.log(' angVel extrema in leg:', JSON.stringify(ext.filter((e, i, arr) => i === 0 || Math.abs(e.v - arr[i - 1].v) > 0.5)));
}

/* ==== --assert (MOBILE-GATE-01) ===================================== *
 * Tier 2's cheapest gate, and the only one that re-checks in a real browser
 * what REST-01 checks in node: the resolve is read off the SHIPPED module
 * graph as the page loads it, not off a node import with a vendor shim. If the
 * two ever disagree, the disagreement is the finding.
 * Thresholds are PHONE-01's measured values, cited per check.
 * ==================================================================== */
if (process.argv.includes('--assert')) {
  const { A, finish } = await import('./gate-assert.mjs');
  const rest = L.connectRest;
  const at = (rows) => rows.reduce((b, r) => (Math.abs(r.p - rest) < Math.abs(b.p - rest) ? r : b));
  for (const [name, rows] of Object.entries(D.rows)) {
    const r = at(rows).resolve;
    A(r === 1, `A1/resolve-at-rest ${name}`, `${r.toFixed(6)} === 1`,
      'phone-01 §1: 0.9267 before / 1.0000 after at 430x932');
    let dips = 0, prev = null;
    for (const q of rows) {
      if (q.p < 0.30 || q.p > rest) continue;
      if (prev && q.resolve < prev.resolve - 1e-12) dips++;
      prev = q;
    }
    A(dips === 0, `A1/monotone ${name}`, `${dips} falling samples === 0`,
      'phone-01 §1: 74 falling samples before, 0 after');
  }
  // The ablation trick, as a gate: the phone must be the 621-wide frame to
  // float precision. This is the check that would have caught 1fa145f on the
  // day, at any composition, without knowing which one was wrong.
  for (const ph of ['phone430', 'phone375']) {
    let worst = 0;
    for (let i = 0; i < D.rows[ph].length; i++) {
      worst = Math.max(worst, Math.abs(D.rows[ph][i].resolve - D.rows['p430-nopitch'][i].resolve));
    }
    A(worst <= 1e-12, `A1/ablation-agreement ${ph}`, `max |dResolve| ${worst.toExponential(2)} <= 1e-12`,
      'phone-01 §1: max |d resolve| 6.66e-16 against the 621 ablation');
  }
  finish('posefield');
}
