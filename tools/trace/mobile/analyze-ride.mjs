// tools/trace/mobile/analyze-ride.mjs — QA-ONLY analyzer for the mobile probes
// beside it. Adopted 2026-08-24 (PHONE-01) with the probes; see
// posefield.mjs's header for why this instrument set is kept.
// analyze3.mjs — ride trace analysis.
import { readFileSync } from 'node:fs';

const ids = ['ados', 'hivemind', 'discord'];
const FILE = process.argv[2];
const D = JSON.parse(readFileSync(FILE));
const R = D.rec;
const t0 = R[0].t;
const s = (t) => ((t - t0) / 1000).toFixed(2);
console.log(`== ${D.scen} (${D.preset}) frames=${R.length} span=${s(R[R.length - 1].t)}s`);
for (const [t, m] of D.gest || []) console.log(`  gesture ${s(t)}s ${m}`);

// dt stats
const dts = R.map((r) => r.dt).filter((d) => d > 0 && d < 5000);
dts.sort((a, b) => a - b);
const q = (f) => dts[Math.floor(f * (dts.length - 1))].toFixed(1);
console.log(`  dt ms: p50=${q(0.5)} p90=${q(0.9)} p99=${q(0.99)} max=${q(1)} stalls>50ms=${dts.filter((d) => d > 50).length} stalls>100ms=${dts.filter((d) => d > 100).length}`);

// p timeline: intent transitions and arrivals
let lastKey = '';
const events = [];
for (const r of R) {
  const key = `${r.rt === null ? '-' : r.rt.toFixed(3)}|${r.aw === null ? '-' : r.aw.toFixed(3)}`;
  if (key !== lastKey) { events.push(`  t=${s(r.t)} p=${r.p.toFixed(4)} target=${r.rt === null ? '-' : r.rt.toFixed(4)} answered=${r.aw === null ? '-' : r.aw.toFixed(4)} cruise=${r.rc ? r.rc.toFixed(0) : 0}`); lastKey = key; }
}
console.log(events.slice(0, 40).join('\n'));
if (events.length > 40) console.log(`  ...(${events.length - 40} more transitions)`);

// direction reversals of displayed p (rocky candidate #1)
let revs = 0, lastDir = 0, revList = [];
for (let i = 1; i < R.length; i++) {
  const dp = R[i].p - R[i - 1].p;
  if (Math.abs(dp) < 3e-5) continue;
  const d = Math.sign(dp);
  if (lastDir && d !== lastDir) { revs++; if (revList.length < 12) revList.push(`${s(R[i].t)}@p${R[i].p.toFixed(4)}`); }
  lastDir = d;
}
console.log(`  displayed-p direction reversals: ${revs}${revs ? '  at: ' + revList.join(' ') : ''}`);

// camera pitch rate over time (deg/s) — wobble detection between p 0.36..0.53
const wob = [];
for (let i = 2; i < R.length - 2; i++) {
  const r = R[i];
  if (r.p < 0.30 || r.p > 0.55) continue;
  const dt = (R[i + 2].t - R[i - 2].t) / 1000;
  if (dt <= 0) continue;
  const gaze = (x) => Math.asin(Math.max(-1, Math.min(1, x.fy))) * 180 / Math.PI;
  wob.push({ t: r.t, p: r.p, rate: (gaze(R[i + 2]) - gaze(R[i - 2])) / dt });
}
let flips = 0, flipAt = [];
for (let i = 1; i < wob.length; i++) {
  if (Math.sign(wob[i].rate) !== Math.sign(wob[i - 1].rate) && Math.abs(wob[i].rate) > 0.7) {
    flips++; if (flipAt.length < 10) flipAt.push(`${s(wob[i].t)}@p${wob[i].p.toFixed(3)} ${wob[i - 1].rate.toFixed(1)}->${wob[i].rate.toFixed(1)}deg/s`);
  }
}
console.log(`  gaze-rate sign flips (>0.7deg/s) while p in 0.30..0.55: ${flips}${flips ? '\n    ' + flipAt.join('\n    ') : ''}`);

// scene-event vs icon onsets in TIME
const firstT = (fn) => { const r = R.find(fn); return r ? +s(r.t) : null; };
ids.forEach((id, k) => {
  const dot = firstT((r) => r.g[k] > 0.02);
  const dotFull = firstT((r) => r.g[k] > 0.6);
  const chip = firstT((r) => r.vis[k] === 1);
  const lblHalf = firstT((r) => r.li[k] >= 0.5);
  const lblDone = firstT((r) => r.li[k] >= 0.98);
  console.log(`  ${id.padEnd(8)} dotStir=${dot}s dot60%=${dotFull}s chipVis=${chip}s label50%=${lblHalf}s labelDone=${lblDone}s  (chip lags its dot by ${chip !== null && dot !== null ? (chip - dot).toFixed(2) : '?'}s)`);
});
const copy = firstT((r) => r.cop > 0.5);
console.log(`  copy>50% at ${copy}s`);
const arrive = firstT((r) => Math.abs(r.p - 0.523) < 0.0005);
console.log(`  camera arrives at connect rest: ${arrive}s; end state: p=${R[R.length - 1].p.toFixed(4)} gates=[${R[R.length - 1].g.map((g) => g.toFixed(3))}] labels=[${R[R.length - 1].li.map((l) => l.toFixed(2))}]`);

/* ==== --assert (MOBILE-GATE-01) ===================================== *
 * The live touch ride. This is the tier no pure check can replace: A1 proves
 * the SCHEDULE is right; this proves a finger travelling it gets the schedule.
 * Per-scenario, because each scenario is a different fault's witness.
 *
 * WHAT IS NOT ASSERTED HERE, deliberately. Frame times (`dt`) are the obvious
 * thing to gate and are the wrong thing: this machine's own harness header
 * records CDP touchmove gaps of 0.6-1.3 s under load, so a stall threshold
 * would be measuring the runner, not the page. It stays a printed measurement.
 * ==================================================================== */
if (process.argv.includes('--assert')) {
  const { A, finish } = await import('./gate-assert.mjs');
  const GAZE_HI = -0.0209, GAZE_LO = -0.1253;   // connect/index.js:408, as probe1
  const s01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const REST = 0.523;
  const gStart = (D.gest || []).length ? D.gest[0][0] : R[0].t;
  const RIDE = R.filter((r) => r.t >= gStart);    // the placement snap is not a ride
  /* THE SPLIT (2026-08-26, docs/code-health/2026-08-26-a7-ruling.md Ruling 1).
     `jitterflick2` grows a THIRD flick, delivered after the second one's
     landing has come to rest, and the two halves are different experiments
     over one trace: before the marker, a gesture born mid-flight that must buy
     NOTHING; after it, a gesture born at a rest that must buy its section. A
     scenario with no marker is one window and behaves exactly as before. */
  const f3 = (D.gest || []).find((g) => /^flick3-start/.test(g[1]));
  const V = f3 ? RIDE.filter((r) => r.t < f3[0]) : RIDE;
  const AFTER = f3 ? RIDE.filter((r) => r.t >= f3[0]) : [];
  const last = V[V.length - 1];

  // A1-live — the nod. A sign flip in the gaze rate IS the visible nod; the
  // pure sweep cannot see it because the pure sweep has no clock.
  A(flips === 0, 'A1/no-nod', `${flips} gaze-rate sign flips over p 0.30..0.55 === 0`,
    'phone-01 §2: 19 upward frames / +0.324 deg lift before, 0 after');
  const leg = V.filter((r) => r.p >= 0.30 && r.p <= REST);
  let peak = -1, dip = 0;
  for (const r of leg) { const v = s01((r.fy - GAZE_HI) / (GAZE_LO - GAZE_HI)); if (v > peak) peak = v; else dip = Math.max(dip, peak - v); }
  A(dip <= 0.001, 'A1/no-resolve-dip', `peak-to-trough ${(dip * 100).toFixed(2)}% <= 0.1%`,
    'phone-01 §2: 7.4% dip before, 0.0% after');
  A(s01((last.fy - GAZE_HI) / (GAZE_LO - GAZE_HI)) === 1, 'A1/live-equals-pure',
    `resolve on the last recorded frame ${s01((last.fy - GAZE_HI) / (GAZE_LO - GAZE_HI)).toFixed(6)} === 1`,
    'phone-01 §2: 0.9267 before / 1.0000 after — the live camera agreeing with poseAt');

  // A4 — the ride settles where it aimed, and aimed once. `resolveTarget` is
  // the section the gesture bought; a set with more than one member on a
  // single-flick scenario is the one-frame target flip that made two flicks
  // buy one section.
  const targets = [...new Set(V.map((r) => r.rt).filter((x) => x !== null && x !== undefined))];
  let mx = -Infinity, back = 0;
  for (const r of V) { if (r.p > mx) mx = r.p; else back = Math.max(back, mx - r.p); }
  A(back <= 2e-3, 'A4/no-oscillation', `max backward excursion ${back.toExponential(2)} <= 2e-3`,
    'measured 2.2e-4 (flick1) / 2.4e-4 (subflick) at HEAD, all of it settle dither at the rest');
  /* `jitterflick2` RE-ANCHORED 2026-08-26 from [REST, 0.725] to [REST] by
     docs/code-health/2026-08-26-a7-ruling.md Ruling 1. The second flick is
     delivered 700 ms into a LIVE transit, and by the amended law — "one
     REST-BORN gesture, one leg, each leg shown" — it buys nothing: it feeds
     the flight it was born into and is spent at that flight's landing. It is
     REFUSED BY RULING, not swallowed by defect. The scenario's own third
     flick, asserted below off the `flick3-start` marker, is what keeps this
     from being a gate that merely stopped asking. */
  const WANT = { flick1: [REST], subflick: [REST], jitterflick2: [REST] };
  const want = WANT[D.scen];
  if (want) {
    A(JSON.stringify(targets) === JSON.stringify(want), `A4/targets ${D.scen}`,
      `${JSON.stringify(targets)} === ${JSON.stringify(want)}`,
      D.scen === 'jitterflick2'
        ? 'a7-ruling §1: a gesture born mid-flight is spent at that flight\'s landing and re-aims nothing — a second target here is owner report #26\'s skip returning'
        : 'one gesture buys exactly one section and does not re-aim on the glide');
    A(Math.abs(last.p - want[want.length - 1]) <= 5e-4, `A4/arrival ${D.scen}`,
      `end p ${last.p.toFixed(4)} ~= ${want[want.length - 1]}`,
      'the ride must come to rest ON a rest, not stranded between sections');

    /* A7/no-departure — THE UNATTENDED TAIL, and it is owner report #26's own
       side of the ruling. Once the ride has landed, nobody is touching the
       screen for the rest of this window. It must still be standing on that
       rest when the window ends. A departure here is the machine spending
       distance the visitor never earned — "NOT auto scroll to the next
       section would be nice when I haven't made any gesture to do so", and,
       on being shown a longer beat, "So you didn't fix it? This is when
       scrolling through" (2026-08-26). The floor of 10 s is a VALIDITY
       condition, not a threshold: a window shorter than that measured no tail,
       and a green over it would be an absence asserted with no observation
       behind it (D63).

       SCOPED TO THE SCENARIO THAT DECLARES A POST-LANDING FLICK, because that
       marker is what makes the tail a measured window rather than whatever
       sleep the scenario happened to end on: `flick1` sleeps 12 s and
       `subflick` 9 s, both sized for the chip chain, and asserting a 10 s
       unattended tail over those would be reading a number the scenario never
       set out to produce. */
    if (f3) {
      const rest = want[want.length - 1];
      const arr = V.findIndex((r) => Math.abs(r.p - rest) <= 5e-4);
      const held = arr >= 0 ? V.slice(arr) : [];
      const heldS = held.length > 1 ? (held[held.length - 1].t - held[0].t) / 1000 : 0;
      const drift = held.length ? Math.max(...held.map((r) => Math.abs(r.p - rest))) : Infinity;
      A(heldS >= 10 && drift <= 5e-4, `A7/no-departure ${D.scen}`,
        `${heldS.toFixed(1)} s unattended at the rest (>= 10 s), max drift ${drift.toExponential(1)} <= 5e-4`,
        'owner report #26, 2026-08-26: the ride must not leave a rest it was put at while the visitor\'s hands are still');
    }

    /* A7/recovery — THE OTHER SIDE, IN THE SAME SCENARIO, and this is the
       load-bearing half of the re-anchor. Refusing a mid-flight gesture is
       only correct if a gesture born AT THE REST is still honoured; a gate
       that dropped the 0.725 assertion and stopped there would have been
       relaxed, not re-aimed. So the third flick is delivered after the tail
       above, from a standstill, and it must buy exactly its own section. The
       from-rest release path is the ordinary one and is unchanged by the #26
       fix — tools/test-rest-authority.mjs L1 pins it at 304 ms on the pure
       rig; this pins it on a real touch stream at the end of a real ride. */
    if (AFTER.length) {
      const lastA = AFTER[AFTER.length - 1];
      const tA = [...new Set(AFTER.map((r) => r.rt).filter((x) => x !== null && x !== undefined))];
      A(tA.length > 0 && tA[tA.length - 1] === 0.725, `A7/recovery-target ${D.scen}`,
        `targets after the post-landing flick ${JSON.stringify(tA)} end at 0.725`,
        'a gesture born at a rest buys its leg through the ordinary from-rest arming path — the path the #26 fix never touched');
      A(Math.abs(lastA.p - 0.725) <= 5e-4, `A7/recovery-arrival ${D.scen}`,
        `end p ${lastA.p.toFixed(4)} ~= 0.725`,
        'the post-landing flick must actually deliver the section it bought, not merely aim at it');
    }

    // A3-live — the chips a finger actually leaves behind. gatesweep asserts
    // the same thing off placeAt; this asserts it off a released flick, the
    // path the owner was actually describing. ONLY for a ride that comes to
    // rest at Connect — where jitterflick2 now also ends its first window,
    // since the mid-flight flick buys nothing and the trace is split at the
    // post-landing flick's own marker.
    if (want[want.length - 1] === REST) {
      A(last.g.every((g) => g >= 0.9999), 'A3/gates-at-ride-end', `[${last.g.map((g) => g.toFixed(4))}] all >= 0.9999`,
        'phone-01 §3(d) ride column');
      A(last.li.every((l) => l === 1), 'A3/labels-at-ride-end', `[${last.li}] all === 1`,
        'phone-01 §3(d): on every recorded ride before the fix the label never completed inside 12.9 s');
      A(last.vis.every((v) => v === 1), 'A3/chips-visible-at-ride-end', `[${last.vis}] all === 1`,
        'phone-01 §3(d): the chip must be on screen at the rest, not only formed');
    }
  }
  finish(`ride ${D.scen}`);
}
