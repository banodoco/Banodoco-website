/* ==================================================================== *
 * tools/tempo-oracle.mjs — TEMPO-01. The third browser-ring oracle,
 * beside pose (PAGE-02) and dwell (PAGE-01).
 *
 * WHAT IT ASSERTS. Three laws over one per-rendered-frame sample stream,
 * each the generalisation of a landed fix that had no standing gate:
 *
 *   TL1 CONTINUITY      ASSERTED. No observed reveal channel IGNITES by
 *                       more than its class's Dmax between two consecutive
 *                       rendered frames.  Generalises the ROOTS FLASH: a
 *                       reveal keyed to a folded circular coordinate
 *                       stepped -90 -> +270 and eleven uFade materials
 *                       went 0 -> 1 in ONE frame.
 *                       Evidence: evidence/.../wrap-flash/
 *
 *   TL2 REALISED FLOOR  ASSERTED as of 2026-08-26, on the day the residual
 *                       its first cut reported was cured — see `evaluate`
 *                       for the four-tree table. A channel that is dark
 *                       when a machine-owned envelope arms, and lights
 *                       during it, may not light before `onsetFloorFrac`
 *                       of that envelope has been spent.  Generalises the
 *                       EPILOGUE RACE (#29): the ambient mote cloud
 *                       flipped visible at 546 ms of a 4.0 s lap against a
 *                       designed ~1400.
 *                       Evidence: evidence/.../epilogue-race/
 *
 *   TL3 DEAD TAIL       ASSERTED. A released machine-owned glide may not spend more
 *                       than its declared forward-brake budget with
 *                       presented motion below `deadVFrac` of that
 *                       episode's own peak.  Generalises the MISSION TAIL
 *                       (#18): 0.7 s of envelope that bought 0.09% of the
 *                       leg's path.  Evidence: evidence/.../mission-tail/
 *
 * WHY ONE INSTRUMENT AND NOT THREE. The three faults are different laws —
 * a step, an early onset, a dead stretch — but they are three predicates
 * over ONE observation: the value of a named channel on each consecutively
 * RENDERED frame of a driven episode. Every one of the five one-shot
 * probes this class produced re-implemented that observation and threw it
 * away afterwards. The observation is the reusable part; the predicates
 * are twelve lines each.
 *
 * ------------------------------------------------------------------
 * THE VIRTUAL CLOCK, AND WHY THIS ORACLE DOES NOT MEASURE FRAME PACING
 * ------------------------------------------------------------------
 * Its two siblings judge a trial by its p95 inter-frame gap and discard
 * the trials a loaded host spoiled. That criterion exists because they
 * measure the page against the WALL clock, so contention is a measurement
 * error. It cost this programme a blind gate: the epilogue suite's trigger
 * only ever fired because load broke the input stream, and on a calm host
 * it could not fire at all.
 *
 * This oracle takes `tools/trace/brake-tail.py`'s recipe instead —
 * `performance.now` is replaced before the document loads, and the driver
 * advances it by exactly one frame per real rAF. `organism/animation.js`
 * takes its `dt` from a `THREE.Clock`, which reads `performance.now`, so
 * the WHOLE SPINE runs on the injected clock: measured on this host, the
 * published `dt` is 0.01667 on every frame of a 374-frame lap, min = max.
 * Contention then makes a run take longer in wall time and changes
 * NOTHING about what the page did. The trust criterion is therefore not
 * pacing but CLOCK FIDELITY (`clockVerdict`): every rendered frame carried
 * the frame the driver paid for. A run that cannot show that reports no
 * figure at all (D63), exactly as its siblings refuse on pacing.
 *
 * The direction of the old trap is worth keeping on the record because it
 * is not uniform: contention MANUFACTURES the TL1 and TL3 faults and HIDES
 * the TL2 one (a loaded machine delays the wrap past the arrival ladder,
 * so the mid-band trigger silently degrades into the full-band control).
 * Under the injected clock neither happens, because the gesture is
 * denominated in frames the driver issues.
 *
 * ------------------------------------------------------------------
 * WHERE EVERY CONSTANT COMES FROM — none of them is a knob
 * ------------------------------------------------------------------
 * TL3's ceiling is PRODUCTION'S OWN DECLARATION: the entry point injects
 * `forwardBrakeTailSeconds` from `journey/route.js` and the gate holds a
 * leg to the budget the route declares for it. A leg with no declared
 * entry is held to `deadTailMaxMs`, which is the value all three declared
 * entries share — so the ceiling cannot be escaped by DELETING a
 * declaration, which is precisely how the mission tail shipped.
 *
 * TL1's Dmax is the shipped worst DESIGNED single-frame rise on the ONE
 * class it judges, with headroom, taken from the record before this order
 * ran: reveal 0.35 — the ARR ramps' own 0.244/frame and the post-fix worst
 * of 0.299 on the Final -> Inspire nav path (wrap-flash README). The fault
 * it must see is 1.0, and the current tree's worst is 0.1667. The other
 * three classes are observed and printed but NOT judged here, each for a
 * stated reason; see CHANNEL_CLASSES.
 *
 * TL2's floor is deliberately SLACK against the design's own claim. The
 * epilogue's derivation says the restoration is timed to land "as the
 * colony leaves frame (~2.4 s into the 4.0 s lap)" — 0.60 of the lap. The
 * reading asks for 0.25. It is set low on purpose: it must separate gross
 * compression (measured here at 0.138-0.164 on the pre-fix tree) and must
 * never be able to fire on tempo taste. THE FLOOR HAS NEVER MOVED — 0.25
 * at the first cut, when the tree read 0.216-0.259 and the law was carried
 * as a finding rather than lowered to meet it, and 0.25 now that the tree
 * reads 0.362-0.388 on both departures. See `evaluate`.
 *
 * NOTHING HERE MAY BE WIDENED TO MAKE A TREE GREEN. CONTRIBUTING.md §5:
 * "Never widen a tolerance to close a gap. Re-measure on the page and
 * rewrite the declaration."
 *
 * ------------------------------------------------------------------
 * WHERE THIS FILE IS GATED
 * ------------------------------------------------------------------
 * It is a SHARED INSTRUMENT in `tools/test-instrument-layer.mjs`'s sense
 * — it holds decisions and two files import it — so it is a subject
 * there: `TO-P` probes every decision function plus the page-side halves
 * read as source, and NINE mutants of its own shipped text drive that pin
 * red under `--prove-failure`. That runs at position 2 of `test:contracts`
 * on every `npm run check`.
 *
 * No separate `test-tempo-oracle.mjs` was written, deliberately. It would
 * have re-stated `TO-P`'s fixtures in a second file, and — because every
 * gate script feeds `tools/test-assertion-provenance.mjs`'s derived set —
 * it could not have been wired without editing files another lane holds.
 * The decisions are gated today, inside a chain, at no new file's cost.
 *
 * `tools/tempo-run.mjs` is the entry point that owns the launch. It is
 * plumbing (nothing imports it; every decision it makes is here) and is
 * declared as such on `NOT_SHARED_INSTRUMENTS`, the dwell-run/pose-run
 * precedent.
 * ==================================================================== */

import { fault } from './instrument-ledger.mjs';

/** THE CLOCK SWAP ITSELF, installed with `addInitScript` — i.e. BEFORE the
 *  document loads, so `THREE.Clock` reads it from the very first frame.
 *  `__vt.real` keeps the true clock so a run can still report its own wall
 *  duration.
 *
 *  IT LIVES HERE, IN THE ORACLE, RATHER THAN IN AN ENTRY POINT, because it
 *  now has two callers: `tools/tempo-run.mjs` and
 *  `tools/test-epilogue-retire.mjs`, which was migrated off wall-clock
 *  pacing onto this rig on 2026-08-26 after an ordinary desktop excluded
 *  8 of 8 of its trials. Two copies of a clock swap is two rigs, and the
 *  second one rots. It is a page-side function like `runEpisode` and
 *  `positiveControl`, and like them it decides nothing. */
export const VT_INJECT = () => {
  window.__vt = { now: 0, real: performance.now.bind(performance) };
  performance.now = () => window.__vt.now;
};

/** Channel classes. The key is the series prefix the page-side harvest
 *  emits. `dmax` is TL1's ignition ceiling for the class, or `null` for a
 *  class this oracle OBSERVES AND REPORTS but does not judge; `onset`
 *  marks the classes TL2 watches for a light-up inside a machine-owned
 *  envelope.
 *
 *  ONE CLASS PER LAW, AND THE CLASS IS THE ONE ITS RED-PROOF NAMES. The
 *  first cut of this file judged all four classes under all three laws and
 *  went red on the current tree in three places, none of them its subject:
 *
 *  · `amount` — Final's uAmount floats — is ALREADY OWNED, by
 *    `tools/test-epilogue-retire.mjs` R1, at the ceiling 0.10 and over the
 *    window that ceiling was derived for (the wrap's arm, frames iw-1 to
 *    iw+3). Judging the same channel here over the WHOLE lap is a second
 *    gate disagreeing with the first about one thing; the numbers it
 *    produces are printed instead, and R1 is named beside them.
 *  · `ground` and `mote` are TL2's subject, not TL1's. What the epilogue
 *    fix moved is WHEN they light, not how fast — see TL2's note.
 *
 *  Scoping a law to the subject its red-proof names is not the same move
 *  as widening a ceiling to fit, and it must not be allowed to become one:
 *  every unjudged number above is printed on every run, so a class that
 *  drifts cannot do it quietly. */
export const CHANNEL_CLASSES = Object.freeze({
  reveal: Object.freeze({ dmax: 0.35, onset: false, owner: null }),
  amount: Object.freeze({ dmax: null, onset: false, owner: 'tools/test-epilogue-retire.mjs R1 (at the wrap arm, ceiling 0.10)' }),
  ground: Object.freeze({ dmax: null, onset: true, owner: null }),
  mote: Object.freeze({ dmax: null, onset: true, owner: null }),
});

export const DEFAULT_CONTRACT = Object.freeze({
  /** The frame the driver pays for, in ms. One per real rAF. */
  frameMs: 1000 / 60,
  /** CLOCK FIDELITY (not pacing): every rendered frame's published `dt`
   *  must equal `frameMs` to within this fraction. A frame that does not
   *  is a frame the page did not take from the injected clock, and the
   *  episode it belongs to is not measured. */
  dtTolFrac: 0.02,
  /** Fewest rendered frames an episode must carry to be measured. */
  minFrames: 90,
  /** Fewest episodes a law must keep to report a figure. Below half the
   *  attempted episodes, the run reports NO figure for that law. */
  keptFrac: 0.5,
  /** TL2 — fraction of a machine-owned envelope that must be spent before
   *  a dark channel may light. Slack by design; see the header. */
  onsetFloorFrac: 0.25,
  /** TL2 — the value at which a channel counts as lit. The epilogue
   *  probe's own tell for the mote cloud. */
  onsetLitAt: 0.12,
  /** TL3 — presented motion below this fraction of the episode's own peak
   *  per-frame camera translation counts as dead. `tail-analysis.py`'s
   *  criterion, unchanged, so the figures stay on one scale. */
  deadVFrac: 0.02,
  /** TL3 — the ceiling for a leg the route declares no brake budget for.
   *  The value all three shipped `FORWARD_BRAKE_TAIL_S` entries carry. */
  deadTailMaxMs: 350,
});

/* ==================================================================== *
 * THE DECK. Six driven episodes, each naming the law it feeds and the
 * defect it descends from. `kind` selects the page-side driver.
 * ==================================================================== */
export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: 'wrap-fwd', kind: 'wrap', laws: ['TL1', 'TL2'], bootP: 0.97, deltaY: 140,
    burstFrames: 60, gapFrames: 12, bursts: 6, tailFrames: 300,
    why: 'the reported path — Final rest, forward wrap, the lap that sweeps the whole circle and crosses the azimuth fold. '
      + "TL2's CONTROL: the same lap departing a settled field, where the restoration is timed as designed",
  }),
  Object.freeze({
    id: 'wrap-rewound', kind: 'wrap', laws: ['TL1'], bootP: 0.97, deltaY: 140,
    burstFrames: 60, gapFrames: 12, bursts: 6, tailFrames: 300, rewindAfter: 54,
    why: 'the same wrap steered back mid-lap — pre-fix this crossed the fold TWICE and flashed on the way out and the way back',
  }),
  Object.freeze({
    id: 'nav-final-inspire', kind: 'nav', laws: ['TL1'], bootP: 0.97, navTo: 'inspire', tailFrames: 420,
    why: 'the latent member: the short-way azimuth turn on a nav jump crosses the same fold, and nobody had reported it',
  }),
  Object.freeze({
    id: 'epilogue-early', kind: 'wrap', laws: ['TL1', 'TL2'], bootP: 0.87, deltaY: 260,
    burstFrames: 60, gapFrames: 12, bursts: 8, tailFrames: 300,
    why: "TL2's SUBJECT — a wrap fired while the Final arrival ladder is still mid-band, the state the retire was not fitted to",
  }),
  Object.freeze({
    id: 'glide-flick', kind: 'glide', laws: ['TL3'], from: 'mission', to: 'inspire', notches: 12, deltaY: 260, tailFrames: 540,
    why: 'a 12-notch flick released into the commit glide — the gesture class that rides the forward brake, and the only one that does',
  }),
  Object.freeze({
    id: 'glide-gentle', kind: 'glide', laws: ['TL3'], from: 'mission', to: 'inspire', notches: 12, deltaY: 120, tailFrames: 540,
    why: 'the gentle release of the same leg — the second gesture class the mission-tail order measured, kept so the two are comparable',
  }),
]);

/* ==================================================================== *
 * THE PAGE SIDE. Two functions, serialised into the page by the entry
 * point. They OBSERVE and DRIVE; they decide nothing.
 * ==================================================================== */

/** Installs the sampler and runs one scenario. Registered LAST as an
 *  animator, i.e. after journey-owned has written its uniforms and before
 *  the renderer draws, so every row is a frame the visitor saw.
 *
 *  The clock is advanced by the DRIVER, one frame per real rAF, so the
 *  page's whole timeline is this function's to spend. Wheel events go
 *  through the window capture listeners — `journey.wrap()` is never used
 *  for a behavioural claim, and `flyTo` only where the scenario IS a nav
 *  jump. */
export async function runEpisode({ sc, contract }) {
  const J = window.journey;
  const S = J.hero;
  const cam = S.camera;
  const FRAME = contract.frameMs;
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const tick = async (n = 1) => { for (let i = 0; i < n; i++) { window.__vt.now += FRAME; await raf(); } };
  const wheel = (dy) => window.dispatchEvent(new WheelEvent('wheel', {
    deltaY: dy, deltaMode: 0, cancelable: true, bubbles: true,
  }));

  /* ---- the channels, gathered once ------------------------------- */
  const fadesUnder = (g) => {
    const out = [];
    if (g) {
      g.traverse((o) => {
        const m = o.material;
        if (m && m.uniforms && m.uniforms.uFade && !out.some((e) => e.m === m)) out.push({ m, o });
      });
    }
    return out;
  };
  const chapterIds = Object.keys(J.chapters);
  /* One REVEAL series per chapter: the brightest uFade under its group.
     Per-material series would be eleven copies of one number on the fault
     this exists for (all eleven stepped together) and would say nothing
     more than the max does. */
  const reveal = chapterIds.map((id) => ({
    tag: `reveal:${id}`, g: J.chapters[id].group, mats: fadesUnder(J.chapters[id].group),
  })).filter((e) => e.mats.length);

  const amount = [];
  let uPull = null;
  const finalG = J.chapters.final && J.chapters.final.group;
  if (finalG) {
    finalG.traverse((o) => {
      const u = o.material && o.material.uniforms;
      if (!u) return;
      if (u.uPull && !uPull) uPull = u.uPull;
      if (u.uAmount && !amount.some((e) => e.u === u.uAmount)) {
        amount.push({ tag: `amount:${amount.length}:${o.name || o.type}`, u, o });
      }
    });
  }

  const ground = [];
  const gg = S.groups && S.groups.ground;
  if (gg) {
    gg.children.forEach((o, i) => {
      const m = o.material;
      if (!m) return;
      ground.push({ tag: `ground:${i}:${o.name || o.type}`, m, o, u: m.uniforms && m.uniforms.uOpacity });
    });
  }
  const mote = S.scene.children
    .filter((o) => o.isPoints && o !== (S.groups && S.groups.spores))
    .map((o, i) => ({ tag: `mote:${i}:${o.name || o.type}`, m: o.material, o }));

  const val = {
    reveal: (e) => Math.max(0, ...e.mats.map((x) => x.m.uniforms.uFade.value)),
    amount: (e) => e.u.uAmount.value,
    ground: (e) => (e.u ? e.u.value : (e.m.opacity ?? 0)),
    mote: (e) => ((e.m.uniforms && e.m.uniforms.uOpacity) ? e.m.uniforms.uOpacity.value : (e.m.opacity ?? 0)),
  };
  const series = { reveal, amount, ground, mote };
  const tags = {};
  for (const k of Object.keys(series)) tags[k] = series[k].map((e) => e.tag);

  const rows = [];
  let sampling = false;
  S.addAnimator('zz-tempo-oracle', (t, dt) => {
    if (!sampling) return;
    const f = S.frame();
    const ph = f && f.transitionPhase;
    const row = {
      vt: window.__vt.now,
      dt: +dt.toFixed(6),
      seq: f ? f.seq : -1,
      kind: ph ? ph.kind : '',
      e: ph ? +ph.e.toFixed(5) : -1,
      p: +J.scroll.progress.toFixed(7),
      cx: +cam.position.x.toFixed(5), cy: +cam.position.y.toFixed(5), cz: +cam.position.z.toFixed(5),
    };
    for (const k of Object.keys(series)) {
      row[k] = series[k].map((e) => +val[k](e).toFixed(5));
      row[`${k}Vis`] = series[k].map((e) => ((e.g || e.o).visible ? 1 : 0));
    }
    rows.push(row);
  });

  /* ---- park, then drive ------------------------------------------- */
  const marks = {};
  if (typeof sc.bootP === 'number') J.scrollTo(sc.bootP);
  await tick(150);                       // settle the park OFF the record
  sampling = true;
  await tick(4);                         // four quiet frames before anything moves
  marks.armIdx = -1;

  const phaseNow = () => {
    const f = S.frame();
    return (f && f.transitionPhase) ? f.transitionPhase.kind : '';
  };

  if (sc.kind === 'nav') {
    J.flyTo(sc.navTo);
    await tick(sc.tailFrames);
  } else if (sc.kind === 'glide') {
    for (let i = 0; i < sc.notches; i++) { wheel(sc.deltaY); await tick(1); }
    marks.releaseIdx = rows.length - 1;
    /* Free-run to the settle. The target is the arriving rest, injected;
       the run stops 90 frames after p first lands on it exactly. */
    let settled = -1;
    for (let f = 0; f < sc.tailFrames; f++) {
      await tick(1);
      if (settled < 0 && Math.abs(J.scroll.progress - sc.targetP) < 1e-9) settled = rows.length - 1;
      if (settled >= 0 && rows.length - 1 - settled > 90) break;
    }
    marks.settleIdx = settled;
  } else {
    /* THE STREAM IS BROKEN BETWEEN BURSTS, ON PURPOSE, AND THIS IS THE
       BLIND SPOT THE EPILOGUE SUITE SHIPPED WITH. One unbroken stream
       lands at the rest and can then never wrap — the ride "must never
       leave a rest without a gesture the visitor made in order to leave
       it" — so a driver that never lets go asks for a wrap it cannot get.
       That suite's trigger only ever fired because CONTENTION broke its
       stream for it, which is why it could not fire on a calm host at all.
       Under an injected clock there is no contention to borrow, so the gap
       has to be authored: `gapFrames` of no wheel is the release, and the
       next burst is a gesture the model will take. */
    let fired = phaseNow() === 'wrap';
    marks.burstsUsed = 0;
    for (let b = 0; b < sc.bursts && !fired; b++) {
      marks.burstsUsed = b + 1;
      for (let f = 0; f < sc.burstFrames && !fired; f++) {
        wheel(sc.deltaY);
        await tick(1);
        fired = phaseNow() === 'wrap';
      }
      if (!fired) await tick(sc.gapFrames);
    }
    if (fired) marks.pullAtWrap = uPull ? +uPull.value.toFixed(4) : -1;
    marks.wrapFired = fired;
    if (sc.rewindAfter && fired) {
      await tick(sc.rewindAfter);
      for (let i = 0; i < 40; i++) { wheel(-sc.deltaY); await tick(1); }
    }
    await tick(sc.tailFrames);
  }
  sampling = false;

  return {
    id: sc.id, tags, marks, rows,
    endP: J.scroll.progress,
    hidden: document.hidden,
    chapterIds,
  };
}

/** The per-origin positive control, run once before any measurement.
 *  Proves three things the siblings learned to prove the hard way: that a
 *  dispatched wheel really moves `scroll.surface`, that the INJECTED CLOCK
 *  is the one the spine reads, and that rendered frames are actually
 *  arriving. A sweep without this measured nothing and said so. */
export async function positiveControl({ contract }) {
  const J = window.journey;
  const S = J.hero;
  const FRAME = contract.frameMs;
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const dts = [];
  const stop = S.addAnimator('zz-tempo-posctl', (t, dt) => dts.push(+dt.toFixed(6)));
  const before = J.scroll.surface;
  const vt0 = window.__vt.now;
  for (let i = 0; i < 24; i++) {
    window.__vt.now += FRAME;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaMode: 0, cancelable: true, bubbles: true }));
    await raf();
  }
  if (typeof stop === 'function') stop();
  else if (S.removeAnimator) S.removeAnimator('zz-tempo-posctl');
  const moved = dts.filter((d) => d > 0);
  return {
    before, after: J.scroll.surface, frames: dts.length,
    vtSpent: window.__vt.now - vt0,
    dtMin: moved.length ? Math.min(...moved) : 0,
    dtMax: moved.length ? Math.max(...moved) : 0,
    hidden: document.hidden,
    fine: matchMedia('(pointer:fine)').matches,
  };
}

/* ==================================================================== *
 * THE DECISIONS. Everything below is pure and is gated by
 * tools/test-tempo-oracle.mjs.
 * ==================================================================== */

/** CLOCK FIDELITY — this oracle's trust criterion, in place of its
 *  siblings' frame pacing. Every rendered frame must carry the frame the
 *  driver paid for. Returns the verdict AND the evidence, because a
 *  refusal that does not say what it saw is not a refusal, it is a
 *  shrug. */
export function clockVerdict(ep, contract = DEFAULT_CONTRACT) {
  if (!ep || !Array.isArray(ep.rows)) fault('clockVerdict: episode has no rows array');
  const dts = ep.rows.map((r) => r.dt).filter((d) => Number.isFinite(d) && d > 0);
  const want = contract.frameMs / 1000;
  const tol = want * contract.dtTolFrac;
  const off = dts.filter((d) => Math.abs(d - want) > tol);
  const causes = [];
  if (ep.rows.length < contract.minFrames) {
    causes.push(`only ${ep.rows.length} rendered frame(s) (contract needs ${contract.minFrames})`);
  }
  if (!dts.length) causes.push('no frame carried a positive dt — the spine did not run');
  if (off.length) {
    causes.push(`${off.length} of ${dts.length} frame(s) did not carry the injected frame `
      + `(want ${want.toFixed(5)} s +/- ${(contract.dtTolFrac * 100).toFixed(0)}%, `
      + `saw ${Math.min(...off).toFixed(5)}..${Math.max(...off).toFixed(5)})`);
  }
  if (ep.hidden) causes.push('document.hidden was true — a hidden tab throttles the driver');
  return {
    trusted: causes.length === 0,
    causes,
    frames: ep.rows.length,
    dtMin: dts.length ? Math.min(...dts) : 0,
    dtMax: dts.length ? Math.max(...dts) : 0,
  };
}

/** Where the machine takes the wheel. For a wrap or a nav jump it is the
 *  first frame carrying a transition phase; for a released glide it is the
 *  frame after the last gesture. Everything before it is parking, and no
 *  law is evaluated there. */
export function episodeWindow(ep) {
  const rows = ep.rows;
  if (!rows || !rows.length) fault(`episodeWindow: ${ep && ep.id} has no rows`);
  if (Number.isInteger(ep.marks.releaseIdx)) {
    return { from: Math.min(ep.marks.releaseIdx + 1, rows.length - 1), to: rows.length - 1 };
  }
  const from = rows.findIndex((r) => r.kind !== '');
  if (from < 0) return null;                 // the machine never took it
  let to = from;
  while (to + 1 < rows.length && rows[to + 1].kind !== '') to++;
  return { from, to: Math.min(rows.length - 1, to) };
}

/** TL1 — CONTINUITY OF IGNITION. The largest single-frame RISE of every
 *  channel inside the window, against its class's Dmax.
 *
 *  A group flipping VISIBLE is itself a rise, from nothing to whatever the
 *  uniform already holds: the roots flash lit eleven materials and turned
 *  the group on in the same frame. A rule reading only the uniform would
 *  still have caught that one, but it could be walked around by holding a
 *  value high behind `visible = false` — a shape this tree does use — so
 *  the series value is the RENDERED one: the uniform when the object is
 *  drawn, zero when it is not.
 *
 *  IGNITION, NOT EXTINCTION, AND THE REASON IS ON THE RECORD. The law
 *  being generalised is the FLASH family: "the roots flash up and appear
 *  for a second". A reveal that ignites between two frames is that defect.
 *  A reveal that goes dark between two frames at a departure's arm is
 *  `keepGate` — `journey/chapters/owned/index.js:584-596`, a latch that
 *  "may only FALL while a blend is in flight" — which the wrap-flash order
 *  examined on this exact path and ruled designed ("the 1 -> 0 retirement
 *  over the first ~0.2 s is the designed keepGate departure"). It is
 *  present on every machine-owned departure in this tree and measures
 *  0.25-0.63 in one frame on the CURRENT tree. Asserting over it would red
 *  the tree on a shape its own order adjudicated as correct.
 *
 *  Nothing is lost on the named mechanism: the rewound lap crossed the
 *  fold twice and its first crossing is an IGNITION, so the episode still
 *  reds. Every fall is printed under REPORTED, NOT ASSERTED so it cannot
 *  rot unseen. */
/* eslint-disable-next-line no-unused-vars -- the parameter is kept for
   symmetry with TL2/TL3 and for `evaluate`'s uniform call; TL1's ceilings
   are per-CLASS and live in CHANNEL_CLASSES, not in the contract. */
export function evaluateTL1(ep, contract = DEFAULT_CONTRACT) {
  const win = episodeWindow(ep);
  const worst = [];
  const violations = [];
  const closes = [];
  if (!win) return { worst, violations, closes, window: null };
  for (const cls of Object.keys(CHANNEL_CLASSES)) {
    const dmax = CHANNEL_CLASSES[cls].dmax;
    const tags = ep.tags[cls] || [];
    for (let s = 0; s < tags.length; s++) {
      const rendered = (r) => (r[`${cls}Vis`][s] ? r[cls][s] : 0);
      let up = 0, upAt = null, down = 0, downAt = null;
      for (let k = win.from + 1; k <= win.to; k++) {
        const a = ep.rows[k - 1], b = ep.rows[k];
        const d = rendered(b) - rendered(a);
        if (a[`${cls}Vis`][s] === 1 && b[`${cls}Vis`][s] === 0 && rendered(a) > 0.02) {
          closes.push({ tag: tags[s], at: b.vt - ep.rows[win.from].vt, from: +rendered(a).toFixed(4) });
        }
        if (d > up) { up = d; upAt = k; }
        if (-d > down) { down = -d; downAt = k; }
      }
      const mk = (k) => (k === null ? null : {
        idx: k, msIntoWindow: Math.round(ep.rows[k].vt - ep.rows[win.from].vt),
        from: +((ep.rows[k - 1][`${cls}Vis`][s] ? ep.rows[k - 1][cls][s] : 0)).toFixed(4),
        to: +((ep.rows[k][`${cls}Vis`][s] ? ep.rows[k][cls][s] : 0)).toFixed(4),
      });
      worst.push({
        tag: tags[s], cls, dmax, owner: CHANNEL_CLASSES[cls].owner,
        up: +up.toFixed(4), upAt: mk(upAt), down: +down.toFixed(4), downAt: mk(downAt),
      });
      if (dmax !== null && up > dmax) {
        violations.push(`TL1 ${ep.id}: ${tags[s]} IGNITED ${up.toFixed(4)} in ONE rendered frame `
          + `(class ceiling ${dmax}) at +${mk(upAt).msIntoWindow} ms into the window`);
      }
    }
  }
  return { worst, violations, closes, window: win };
}

/** TL2 — REALISED FLOOR. A channel that is dark when the envelope arms and
 *  lights during it must not light before `onsetFloorFrac` of the envelope
 *  has been spent. */
export function evaluateTL2(ep, contract = DEFAULT_CONTRACT) {
  const win = episodeWindow(ep);
  const onsets = [];
  const violations = [];
  if (!win) return { onsets, violations, window: null };
  const spanMs = ep.rows[win.to].vt - ep.rows[win.from].vt;
  const floorMs = spanMs * contract.onsetFloorFrac;
  for (const cls of Object.keys(CHANNEL_CLASSES)) {
    if (!CHANNEL_CLASSES[cls].onset) continue;
    const tags = ep.tags[cls] || [];
    for (let s = 0; s < tags.length; s++) {
      const lit = (r) => (r[`${cls}Vis`][s] === 1 && r[cls][s] > contract.onsetLitAt);
      if (lit(ep.rows[win.from])) continue;               // not dark at the arm — not an onset
      let at = null;
      for (let k = win.from + 1; k <= win.to; k++) if (lit(ep.rows[k])) { at = k; break; }
      if (at === null) continue;                          // never lit — nothing to judge
      const ms = ep.rows[at].vt - ep.rows[win.from].vt;
      const frac = spanMs > 0 ? ms / spanMs : 0;
      onsets.push({ tag: tags[s], cls, ms: Math.round(ms), frac: +frac.toFixed(3), spanMs: Math.round(spanMs) });
      if (ms < floorMs) {
        violations.push(`TL2 ${ep.id}: ${tags[s]} lit ${Math.round(ms)} ms into a ${Math.round(spanMs)} ms `
          + `machine-owned envelope (${(frac * 100).toFixed(1)}% — floor ${(contract.onsetFloorFrac * 100).toFixed(0)}%)`);
      }
    }
  }
  return { onsets, violations, window: win, spanMs: Math.round(spanMs) };
}

/** TL3 — DEAD TAIL. Over a released glide: the span from the last frame
 *  carrying `deadVFrac` of the episode's own peak per-frame camera
 *  translation, to the frame the model settles on the rest.
 *
 *  `declaredMs` is `journey/route.js`'s own budget for the leg, injected
 *  by the entry point. `null` means the route declares nothing for it, and
 *  the class's shipped budget applies instead — the mission tail shipped
 *  as a MISSING entry, so a gate that only checks declared legs is a gate
 *  that cannot see the defect it was built for. */
export function evaluateTL3(ep, declaredMs, contract = DEFAULT_CONTRACT) {
  const rows = ep.rows;
  const win = episodeWindow(ep);
  const violations = [];
  const settle = Number.isInteger(ep.marks.settleIdx) ? ep.marks.settleIdx : -1;
  if (!win) return { measured: null, violations, why: 'no machine-owned window' };
  if (settle < 0) {
    return { measured: null, violations, why: 'the model never settled on the rest — nothing to measure a tail against' };
  }
  const step = [];
  for (let k = win.from; k <= settle; k++) {
    const a = rows[Math.max(win.from, k - 1)], b = rows[k];
    step.push(Math.hypot(b.cx - a.cx, b.cy - a.cy, b.cz - a.cz));
  }
  const peak = Math.max(...step, 0);
  if (!(peak > 0)) return { measured: null, violations, why: 'the camera did not move — this episode measured nothing' };
  let last = 0;
  for (let i = 0; i < step.length; i++) if (step[i] >= contract.deadVFrac * peak) last = i;
  const deadMs = rows[settle].vt - rows[win.from + last].vt;
  const bought = step.slice(last + 1).reduce((a, b) => a + b, 0);
  const total = step.reduce((a, b) => a + b, 0);
  const ceiling = Number.isFinite(declaredMs) ? declaredMs : contract.deadTailMaxMs;
  const measured = {
    deadMs: Math.round(deadMs), ceilingMs: Math.round(ceiling),
    declared: Number.isFinite(declaredMs),
    peakPerFrame: +peak.toFixed(6),
    pathBought: +bought.toFixed(4), pathTotal: +total.toFixed(3),
    sharePct: total > 0 ? +(100 * bought / total).toFixed(3) : 0,
  };
  if (deadMs > ceiling) {
    violations.push(`TL3 ${ep.id}: the released glide spent ${Math.round(deadMs)} ms below `
      + `${(contract.deadVFrac * 100).toFixed(0)}% of its own peak motion — buying ${measured.sharePct}% of the `
      + `leg's ${measured.pathTotal} u — against a ceiling of ${Math.round(ceiling)} ms `
      + `(${measured.declared ? "the route's declared budget for this leg" : "the class's shipped budget; this leg declares none"})`);
  }
  return { measured, violations };
}

/** Fold every episode's laws into one verdict. `declaredMs` maps a
 *  scenario id to the route's own budget, or null. */
export function evaluate(episodes, declaredMs = {}, contract = DEFAULT_CONTRACT) {
  if (!Array.isArray(episodes)) fault('evaluate: episodes is not an array');
  const rows = [];
  const violations = [];
  const reported = [];
  const attempted = { TL1: 0, TL2: 0, TL3: 0 };
  const kept = { TL1: 0, TL2: 0, TL3: 0 };
  for (const ep of episodes) {
    const sc = SCENARIOS.find((s) => s.id === ep.id);
    if (!sc) fault(`evaluate: no scenario named ${ep.id}`);
    for (const law of sc.laws) attempted[law]++;
    const trust = clockVerdict(ep, contract);
    const row = { id: ep.id, laws: sc.laws, trusted: trust.trusted, causes: trust.causes, frames: trust.frames };
    if (!trust.trusted) { rows.push(row); continue; }
    for (const law of sc.laws) kept[law]++;
    if (sc.laws.includes('TL1')) {
      row.tl1 = evaluateTL1(ep, contract);
      violations.push(...row.tl1.violations);
    }
    /* TL2 IS ASSERTED, AND THE FLOOR IT IS ASSERTED AT IS THE ONE IT WAS
       FIRST MEASURED AGAINST. Its first cut carried this law as a printed
       FINDING because the tree failed it and the only way to green it was
       to move the floor down onto the tree's own reading — the widening
       CONTRIBUTING.md §5 forbids. That refusal stood; the residual was
       cured instead, and this is the one-line change the refusal
       pre-registered.
       Measured 2026-08-26 over four trees, one scenario, one 3867 ms
       envelope, at matched departure pull:
         channel        pre-fix    fitted retire   + fitted FLOOR   full band
                        (0.8146)   (0.8168)        (0.8168)         (1.11)
         mote:0          567  14.7%   883  22.8%    1433  37.1%    1433  37.1%
         ground:5:Mesh   533  13.8%   833  21.6%    1400  36.2%    1400  36.2%
       Column three is journey/chapters/final/index.js's `floorPullOf`. The
       epilogue fix normalised the retire's CLOCK and reached everything on
       Final's own uniforms; the hero ground web and the ambient mote cloud
       are `sceneApi.groups.ground` and a scene-level Points cloud, driven
       through a ramp whose thresholds were an ABSOLUTE slice of the band,
       so they kept crossing it earlier the less light the departure
       carried. Fitting that ramp's coordinate to the departure's own cost
       makes the mid-band departure reproduce the full-band control EXACTLY,
       row for row — which is the law's real statement (the schedule is not
       a function of the state it departs from) holding with no constant in
       it at all, not merely a number clearing a floor.
       `reported` stays in this roll-up, and empty. It is a declared empty
       channel in this repo's sense: a reading that is TAKEN every run and
       judged, so the day a second law arrives that is honestly measurable
       before it is assertable, it has a place to land that is not silence.
       The safeguard against THIS becoming a silencer is mutant TO9: if the
       reading stops being taken, TL2 stops producing violations and TO-P
       reds on `splitAsserted` and `splitTl2ReachesExit`. */
    if (sc.laws.includes('TL2')) {
      row.tl2 = evaluateTL2(ep, contract);
      violations.push(...row.tl2.violations);
    }
    if (sc.laws.includes('TL3')) {
      row.tl3 = evaluateTL3(ep, declaredMs[ep.id], contract);
      violations.push(...row.tl3.violations);
    }
    rows.push(row);
  }
  /* REFUSE, DO NOT REPORT. A law that kept fewer than half its episodes
     reports NO figure — and a law that kept none of them is a law this
     run did not exercise, which is a failure of the run and not a pass. */
  const refusals = [];
  for (const law of ['TL1', 'TL2', 'TL3']) {
    if (!attempted[law]) continue;
    if (kept[law] === 0) refusals.push(`${law}: 0 of ${attempted[law]} episode(s) were measurable — no verdict`);
    else if (kept[law] / attempted[law] < contract.keptFrac) {
      refusals.push(`${law}: only ${kept[law]} of ${attempted[law]} episode(s) were measurable `
        + `(contract needs ${Math.ceil(attempted[law] * contract.keptFrac)}) — no figure is reported`);
    }
  }
  return { rows, violations, reported, refusals, attempted, kept };
}

export function parseArgs(argv) {
  const get = (k, d) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit === undefined ? d : hit.slice(k.length + 3);
  };
  return {
    origin: get('origin', `http://127.0.0.1:${process.env.PORT || 8177}`),
    width: Number(get('width', 1440)),
    height: Number(get('height', 900)),
    only: get('only', ''),
    record: get('record', ''),
    proveFailure: argv.includes('--prove-failure'),
  };
}
