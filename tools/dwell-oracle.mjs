/* ==================================================================== *
 * tools/dwell-oracle.mjs — PAGE-01.
 *
 * THE FIRST INSTRUMENT IN THIS PROGRAM THAT DELIVERS AN EVENT TO THE PAGE.
 *
 * S-4 named the blind spot and this module is its remedy:
 *
 *   > Nothing in the tree measures DWELL. Every instrument checks a POSE at
 *   > a `p` the harness chose, which structurally cannot observe that a
 *   > visitor never arrived at that `p`.
 *
 * Forty-three gated suite invocations did not see what one person saw in one
 * pass. All 21 captures, verify-j04a's 44 sites, the trace matrix and every
 * golden sample the ride at a progress the harness set with `setProgress`.
 * A ride that never STOPS where it was going is invisible to all of them.
 *
 * WHAT THIS DRIVES, AND WHY IT MATTERS THAT IT IS NOT setProgress
 * --------------------------------------------------------------
 * Synthetic `WheelEvent`s dispatched on `window`, which journey/transport.js
 * `onWheel` receives — the same entry point a trackpad reaches. The
 * coordinator's own earlier sweep sat on `scroll.setProgress(p)` and read
 * the rail; the rail never updated, so the sweep reported "Mission" at every
 * `p` and measured nothing. EVERY run here therefore carries a per-origin
 * POSITIVE CONTROL asserting that a dispatched wheel advances
 * `journey.scroll.surface` (D46: an assertion of absence is only trustworthy
 * beside an assertion of presence — and "no violations" is an absence).
 *
 * THE HIDDEN-TAB TRAP, INHERITED FROM DEF-OWNED AND HONOURED HERE
 * --------------------------------------------------------------
 * A hidden tab BOTH throttles `setTimeout` AND trips `push()`'s
 * `resumedFromBackground` branch, so a comparison run concurrently produces
 * garbage. Origins are driven ONE AT A TIME, in one page, and
 * `document.hidden` / `visibilityState` are recorded per trial and asserted
 * (`trustVerdict`). A trial that ran hidden yields NO number.
 *
 * WHAT IS EXACT AND WHAT IS A BOUND — read this before quoting anything
 * --------------------------------------------------------------------
 * EXACT (arithmetic on shipped literals, reproducible to the last digit):
 *   · `restRoadTable` — where each chapter's rest sits within its own road,
 *     derived from journey/structure.js's manifest. `owned` is 2.27/9.27.
 *   · `gestureConfigs` — the LCG's output for a given seed.
 *   · every classification this module computes FROM A GIVEN TRACE.
 *
 * A BOUND (a measured timing on real hardware, restated as an inequality):
 *   · every millisecond in `DEFAULT_CONTRACT`.
 *   · `sweptPerWindow <= 1` and `sweptUnderLongPause === 0`.
 * A bound is never a pin. One order in this run labelled a floor as an exact
 * pin and had to retract it; the vocabulary is kept separate here on purpose.
 *
 * WHERE THE PIECES LIVE
 *   tools/dwell-oracle.mjs      this file — every decision, no browser.
 *   tools/dwell-run.mjs         the entry point that launches Chrome.
 *                               `npm run test:dwell`.
 *   tools/test-dwell-oracle.mjs the gate: this module's readers over a
 *                               recorded trace and over the live manifest.
 *                               In `npm run check`.
 *
 * The live run is not in `npm run check` for the same reason
 * tools/browser-smoke.mjs is not: it needs a browser and a served tree.
 * ==================================================================== */

import { fault } from './instrument-ledger.mjs';

/* ==================================================================== *
 * THE CONTRACT. Every number is per-subject data; nothing here is derived
 * from the thing it judges (QA-01 Engine 1/2/3).
 * ==================================================================== */

/** The five rest anchors, in route order. Recomputed under node from both
 *  trees by DEF-OWNED and identical on both; `restAnchors()` below derives
 *  them from the shipped manifest so this literal is checked, not trusted. */
export const ANCHORS = Object.freeze([
  Object.freeze({ id: 'mission', p: 0 }),
  Object.freeze({ id: 'inspire', p: 0.26 }),
  Object.freeze({ id: 'connect', p: 0.523 }),
  Object.freeze({ id: 'owned', p: 0.725 }),
  Object.freeze({ id: 'final', p: 0.97 }),
]);

export const DEFAULT_CONTRACT = Object.freeze({
  /** |p - anchor| inside which the ride counts as AT the anchor. DEF-OWNED's
   *  value, kept so its dwell table and this one are comparable. */
  tol: 0.004,
  /** How far past an anchor the ride must reach before "it passed here" is
   *  a claim about travel rather than about sampling noise. */
  passMargin: 0.02,
  /** BOUND. Contiguous ms at an anchor below which a visitor did not
   *  experience a stop. DEF-OWNED's threshold, unchanged. */
  dwellFloorMs: 250,
  /** REPORTED, NEVER ASSERTED — and this is a correction to S-4's own
   *  characterisation, reached by building the assertion and measuring it.
   *
   *  S-4 reads the dwell/pause table as a threshold: "0..114 ms for pauses
   *  under ~1.1 s and 371..1,952 ms for pauses over ~1.7 s". PAGE-01 wrote
   *  exactly that assertion — "no rest is swept past under a pause >= 2,000
   *  ms" — and it FAILED ON THE LIVE PAGE at trial 4: a 2,652 ms pause, and
   *  `connect` swept past anyway. The trace says why. Trial 4's gesture is
   *  weak (deltaY 68 x 9), so ~2.87 s after it began the ride had reached
   *  p 0.512 and was still ~0.1 s short of the 0.523 rest. The next gesture
   *  arrived into a resolution STILL IN FLIGHT, which is precisely
   *  `repeatAnchor`'s trigger.
   *
   *  So the pause is a PROXY for "the resolution had landed", not the cause,
   *  and the proxy loses whenever a glide is slower than the pause. Shipping
   *  the threshold as a gate would have shipped a rule that is red on the
   *  page it describes. It is kept as a REPORTING column so the correlation
   *  stays visible, and DW-C2 asserts the mechanism instead. */
  longPauseMs: 2000,
  /** SUPERSEDED 2026-08-25 (DWELL-G1), AND THE FACT THAT IT NEEDED
   *  SUPERSEDING IS THE FINDING THIS ORDER EXISTS FOR.
   *
   *  When PAGE-01 wrote this line it was the design's own sentence — "one
   *  gesture / one additional section" — and the additional section was a
   *  DELIBERATE skip. On 2026-08-23 the owner overruled that design and the
   *  queue fix landed: the intermediate rest now COMPOSES, and the second
   *  gesture's leg is delivered after the landing beat rather than instead of
   *  the landing. From that day this line licensed exactly the behaviour the
   *  owner had just called a bug, and the browser ring would have stayed
   *  green through her fourth report of it — except that the ring was wired
   *  into nothing and never ran at all (OPEN-ITEMS E1).
   *
   *  It is kept, at the same value, for ONE reason: DW-C1/DW-C2 and their
   *  historical tables (DEF-OWNED's base-vs-current comparison, the recorded
   *  fixture's per-trial rows) are denominated in it, and a bound that
   *  changes its number stops being comparable to the measurements taken
   *  under it. It is no longer THE LAW. `machineOwnedMax` below is. C3
   *  strictly dominates C1/C2: every window C1 would flag contains at least
   *  one crossing C3 flags, and C3 flags crossings C1 cannot see. */
  sweptPerWindowMax: 1,
  /** THE POST-FIX LAW, AND THE THRESHOLD IS ZERO.
   *
   *  A crossing of a rest anchor is the visitor's to spend only when it is
   *  their own live scrub, or a landing that composes for its beat. Every
   *  other crossing is distance the machine banked and the visitor never
   *  earned — the in-flight authority class, all four owner reports.
   *  `classifyCrossings` names the mechanism of each one; this is how many
   *  machine-owned ones a trial may contain.
   *
   *  WHY A MECHANISM COUNT AND NOT A RATE, which is the whole reason this
   *  gate can fail where a rate gate could not: the residual measured in
   *  def-skip/ is a ~1.1% event. Over ~40 trials a rate gate reds about 30%
   *  of the time, which is a coin flip, and a coin-flip gate is a dead gate —
   *  the first green run is read as proof. Per-crossing classification turns
   *  each single event into a deterministic violation, so a full traverse
   *  run (~300 crossings) yields ~3 named reds rather than one lucky pass. */
  machineOwnedMax: 0,
  /** THE DUAL, and it is an INTEGER, not a bound. A second stream delivered
   *  into a LIVE resolution buys exactly this many additional legs — and
   *  since 2026-08-26 that number is ZERO.
   *
   *  RE-ANCHORED FROM 1 BY docs/code-health/2026-08-26-a7-ruling.md, Ruling 1.
   *  The old value asserted that a mid-flight second stream buys a leg of its
   *  own. It does not, and it must not: shown that exact behaviour with a
   *  longer beat, the owner said *"So you didn't fix it? This is when
   *  scrolling through"* (report #26). The leg a mid-flight gesture buys is
   *  delivered later, from a rest, under no live input — which is the defect
   *  itself, at any delay. The amended law: **legs are bought only from rest**;
   *  a gesture born in flight feeds the flight it was born into and is SPENT
   *  at that flight's landing. On wheel, deltas inside `SNAP_ENGAGE_MS`
   *  (160 ms) are the arming gesture itself and merge into the flight; past
   *  it, and for any mid-flight touch contact, the strength dies at the
   *  landing.
   *
   *  IT IS STILL TWO-SIDED OFF ONE NUMBER, and the two sides are different
   *  faults that must never be confused for one another:
   *
   *    legs > 1 + dualLegs   THE SKIP — a second stream delivered mid-flight
   *                          bought a section the visitor never asked for.
   *                          Owner reports 1-4, the in-flight authority class,
   *                          #26's words above. This is the direction restoring
   *                          `intent.g === gSerial &&` in journey/scroll.js
   *                          drives, and the direction the red-proof uses.
   *    legs < 1 + dualLegs   THE REFUSAL — flick A, delivered FROM REST with
   *                          nothing in flight, bought nothing. That is the
   *                          wall over-refusing (DEFECT-02's true class), and
   *                          it is a defect on the other side: a from-rest
   *                          gesture is always the visitor's to spend.
   *
   *  A gate asserting only one direction invites the next fix to trade one
   *  owner complaint for the other in silence, so both come off this number.
   *  Note what did NOT change: `dualDelaysMs`'s 0.25/0.5/0.75 sampling of each
   *  boundary's own transit. That window was never the error — it is exactly
   *  the exposure window, and it now pins the REFUSAL side right across it. */
  dualLegs: 0,
  /** A p drop larger than this is the route WRAPPING (p 0.97 -> 0), not
   *  travel. The trace is truncated there; see `truncateAtWrap`. */
  wrapDropP: 0.5,
  /** D63 inputs floor. A trial with fewer samples than this measured
   *  nothing, whatever its dwell table says. */
  minSamples: 40,
  /** THE PER-TRIAL TRUST CRITERION — CONNECT-SKIP's, not a load average.
   *  A trial whose p95 frame gap exceeded this was measured through a stall
   *  and is excluded from the figures (see `trustVerdict`). 50 ms is three
   *  missed frames at 60 Hz: comfortably above ordinary jitter, comfortably
   *  below the multi-hundred-millisecond stalls that contention produces. */
  frameGapBudgetMs: 50,
});

/* ==================================================================== *
 * ROUTE GEOMETRY — the second structural gap S-4 named.
 *
 *   > Nothing asserts where a chapter's rest sits within its own road.
 *
 * `owned` is the only chapter whose single rest sits near the START of its
 * road. Skipping Connect's rest costs 26% of Connect; skipping Owned's costs
 * 76% of Ownership — 5,600 px inside one 13,600 px glide. Same uniform
 * `repeatAnchor` rule, and only here does it read as "it scrolled through
 * the section". That asymmetry is a one-line `segVh` value with no guard
 * anywhere in the tree, and THIS is the guard.
 * ==================================================================== */

/** Where each chapter's canonical rest sits within its own scroll road.
 *
 *  `segVh` splits a chapter's scroll across its own stops (journey/route.js
 *  `SEGMENTS`): sub-segment 0 runs from the chapter start to stop 0, so the
 *  road BEFORE the canonical rest is exactly `segVh[0]`. A chapter with no
 *  `segVh` is one segment, and its canonical rest is `stops[0]` in LEG TIME
 *  — for `mission` that is 0, i.e. the chapter's own opening knot, which is
 *  the route origin and therefore 0 road either way.
 *
 *  RETURNS EXACT RATIONALS OF THE SHIPPED LITERALS. No rounding, so a
 *  comparison here cannot pass on a coincidence of two decimal places.
 *
 *  D63 — a chapter this function cannot read yields a typed refusal, never a
 *  zero. A chapter with `segVh` but no `stops` rests at its first split; a
 *  chapter with neither, and a `stops[0]` that is not 0, is a shape this
 *  reader has never seen and it says so rather than guessing. */
export function restRoadTable(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) fault('restRoadTable: chapters is not a non-empty array');
  return chapters.map((c) => {
    if (typeof c.id !== 'string' || typeof c.scrollVh !== 'number' || !(c.scrollVh > 0)) {
      fault(`restRoadTable: chapter ${JSON.stringify(c && c.id)} has no positive scrollVh`);
    }
    let beforeVh;
    if (Array.isArray(c.segVh) && c.segVh.length > 1) {
      beforeVh = c.segVh[0];
    } else if (Array.isArray(c.stops) && c.stops.length && c.stops[0] === 0) {
      beforeVh = 0;
    } else {
      fault(`restRoadTable: chapter ${c.id} declares neither segVh nor a zero first stop — `
        + 'its rest position within its own road is not derivable by this reader');
    }
    return {
      id: c.id,
      scrollVh: c.scrollVh,
      beforeVh,
      afterVh: Math.round((c.scrollVh - beforeVh) * 1e9) / 1e9,
      /* The fraction as an exact pair, not a rounded percentage. */
      restAt: `${beforeVh}/${c.scrollVh}`,
    };
  });
}

/** The rest anchors in absolute route `p`, derived from the manifest the
 *  same way journey/route.js derives CHAPTERS.stops — so the `ANCHORS`
 *  literal above is a checked claim rather than a copied one. */
export function restAnchors(chapters) {
  if (!Array.isArray(chapters) || chapters.length === 0) fault('restAnchors: chapters is not a non-empty array');
  const total = chapters.reduce((a, c) => a + c.span, 0);
  if (!(total > 0)) fault('restAnchors: chapter spans do not sum to a positive total');
  let acc = 0;
  return chapters.map((c) => {
    const start = acc / total; acc += c.span; const end = acc / total;
    const rest = (c.stops && c.stops.length) ? c.stops[0] : 0.5;
    return { id: c.id, p: start + (end - start) * rest };
  });
}

/* ==================================================================== *
 * THE GESTURE GENERATOR — DEF-OWNED's LCG, unchanged.
 *
 * Kept bit-for-bit so PAGE-01's trials and DEF-OWNED's are the same trials
 * for the same seed, and its base-vs-current table stays comparable to
 * anything measured here. `Math.round` on a scaled unit float is EXACT for
 * these ranges, so this is a pin and not a bound.
 * ==================================================================== */

export function gestureConfigs(seed, trials) {
  if (!Number.isInteger(seed) || seed <= 0) fault(`gestureConfigs: seed must be a positive integer, got ${seed}`);
  if (!Number.isInteger(trials) || trials <= 0) fault(`gestureConfigs: trials must be a positive integer, got ${trials}`);
  let rnd = seed;
  const rand = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; };
  const out = [];
  for (let t = 1; t <= trials; t++) {
    out.push({
      t,
      delta: 60 + Math.round(rand() * 260),
      count: 6 + Math.round(rand() * 40),
      iv: 6 + Math.round(rand() * 26),
      pause: 250 + Math.round(rand() * 2600),
      gestures: 4 + Math.round(rand() * 3),
    });
  }
  return out;
}

/* ==================================================================== *
 * THE ORACLE. Pure, browser-free, and every one of these is driven by a
 * registry pin and a mutant in tools/test-dwell-oracle.mjs.
 * ==================================================================== */

/** A route wrap (p 0.97 -> 0) is legitimate page behaviour and NOT travel.
 *  Everything after it is a second lap, so dwell measured across it is
 *  nonsense — DEF-OWNED's probe recorded 4,785 ms of "mission dwell" from
 *  exactly this. The trace is cut at the first wrap and the cut is
 *  REPORTED, never silently absorbed. */
export function truncateAtWrap(samples, drop = DEFAULT_CONTRACT.wrapDropP) {
  if (!Array.isArray(samples)) fault('truncateAtWrap: samples is not an array');
  for (let i = 1; i < samples.length; i++) {
    if (samples[i][1] - samples[i - 1][1] < -drop) return { samples: samples.slice(0, i), wrapped: true };
  }
  return { samples, wrapped: false };
}

/** Longest contiguous milliseconds spent within `tol` of each anchor.
 *  Contiguity is measured between CONSECUTIVE IN-TOLERANCE SAMPLES, so a gap
 *  in the sampler ends the run rather than being credited to it.
 *
 *  THE ARRIVAL EDGE IS NOT DWELL, and the first draft of this reader
 *  credited it. It carried `prev` across the boundary, so every run that
 *  began after the ride was OUTSIDE tolerance was charged one whole sample
 *  interval of TRAVEL time — 25 ms at this sampler, on every arrival. Small,
 *  systematic, and biased in the wrong direction: it inflates dwell, which
 *  is the direction that reports a skip as a stop. Found by writing DW-W3's
 *  expectation by hand and disagreeing with the code (200 against 300),
 *  which is the whole argument for hand-derived expectations. */
export function dwellTable({ samples, anchors, tol = DEFAULT_CONTRACT.tol }) {
  if (!Array.isArray(samples)) fault('dwellTable: samples is not an array');
  const out = {};
  for (const a of anchors) {
    let best = 0; let cur = 0; let prev = null;
    for (const [t, p] of samples) {
      if (Math.abs(p - a.p) < tol) {
        if (prev !== null) cur += t - prev;
        if (cur > best) best = cur;
        prev = t;
      } else { cur = 0; prev = null; }
    }
    out[a.id] = best;
  }
  return out;
}

/** The anchors this trial's travel actually reached.
 *
 *  Every anchor AT OR BEHIND the departure point is excluded, and the first
 *  draft of this reader got that wrong in a way worth recording: it excluded
 *  only the departure anchor itself, by absolute distance. `mission` sits at
 *  p 0 and every trial departs from p 0.26, so `mission` read as "passed,
 *  never dwelt at" in all eleven trials and manufactured three contract
 *  violations out of a rest the ride is BEHIND and never travels through.
 *  Caught by running the instrument against the live page, not by reading
 *  it. The filter is now directional.
 *
 *  The DEPARTURE anchor is excluded because the ride is already parked
 *  there, so "dwell" at it is an artefact of when the clock started. The TERMINAL
 *  anchor is excluded too, and that is a real limit of this oracle rather
 *  than a convenience — the ride cannot be carried past the last rest, and
 *  dwell there is bounded by when the trial stopped watching, not by the
 *  travel model. So the contract below judges `connect` and `owned` when
 *  departing from `inspire`, and `inspire` too when departing from
 *  `mission`. That is where the defect lives, and it is all this measures. */
export function passedAnchors({ samples, anchors, fromP, margin = DEFAULT_CONTRACT.passMargin, tol = DEFAULT_CONTRACT.tol }) {
  if (!Array.isArray(samples) || samples.length === 0) fault('passedAnchors: samples is empty');
  const maxP = samples.reduce((m, s) => (s[1] > m ? s[1] : m), samples[0][1]);
  const terminal = anchors[anchors.length - 1].id;
  return anchors
    .filter((a) => a.id !== terminal && a.p > fromP + tol && maxP > a.p + margin)
    .map((a) => a.id);
}

/** A route wrap in the MARK list. Marks are `{ t, p, kind }` records rather
 *  than sample pairs, so they need their own truncation; sharing one reader
 *  by index would be a reader that means two things. */
export function truncateMarksAtWrap(marks, drop = DEFAULT_CONTRACT.wrapDropP) {
  if (!Array.isArray(marks)) fault('truncateMarksAtWrap: marks is not an array');
  for (let i = 1; i < marks.length; i++) {
    if (marks[i].p - marks[i - 1].p < -drop) return marks.slice(0, i);
  }
  return marks;
}

/** The rests crossed inside a span of the route, and not stopped at.
 *  `p` is monotone within a truncated forward trace, so "the anchors inside
 *  (lo, hi]" is exactly "the anchors this span advanced across". */
function sweptBetween({ lo, hi, anchors, dwell, judged, floorMs }) {
  const judgedSet = new Set(judged);
  return anchors
    .filter((a) => judgedSet.has(a.id) && a.p > lo && a.p <= hi && (dwell[a.id] || 0) < floorMs)
    .map((a) => a.id);
}

/** DW-C1 — per-gesture-window sweeps: the design's own sentence, measurable.
 *
 *  A window runs from one gesture's first dispatched event to the next
 *  gesture's first, and the last window runs to the end of the settle.
 *  "One gesture / one additional section" is therefore `<= 1` here, and TWO
 *  in one window is the regression this exists to catch. */
export function sweptByWindow({ marks, anchors, dwell, judged, floorMs = DEFAULT_CONTRACT.dwellFloorMs }) {
  const starts = marks.filter((m) => m.kind !== 'gesture-end');
  if (starts.length < 2) fault('sweptByWindow: fewer than two gesture marks — nothing was driven');
  const windows = [];
  for (let i = 0; i + 1 < starts.length; i++) {
    windows.push(sweptBetween({ lo: starts[i].p, hi: starts[i + 1].p, anchors, dwell, judged, floorMs }));
  }
  return windows;
}

/** DW-C2 — THE FROM-REST BOUND: the hands-off stretch, isolated.
 *
 *  THE STRONGER CLAIM WAS WRITTEN AND FALSIFIED ON THE PAGE, and the
 *  falsification is the useful part. The first draft asserted that a gesture
 *  beginning with the ride parked at a rest sweeps past NOTHING — the
 *  reasoning being that `repeatAnchor` needs an in-flight resolution to
 *  retarget, and from a standstill there is none. Measured, trial 2: a
 *  41-event, 1,230 ms stream from the `inspire` rest, then 444 ms of silence
 *  in which the ride crossed `connect` (p 0.523) without stopping and
 *  arrived at 0.562. ONE STREAM IS ENOUGH: `COMMIT_STREAM_MIN` is 4 and
 *  `COMMIT_STREAM_GAP_MS` is 45, so a long unbroken stream earns
 *  `carrying()` on its own and the "one additional section" is spent inside
 *  a single gesture. The guarantee is therefore not zero; it is ONE, and it
 *  is the same one DW-C1 counts — measured over the visitor's hands-off
 *  stretch alone, where "it scrolled through the section" is experienced.
 *
 *  The QUIET PHASE is the stretch from a gesture's LAST dispatched event to
 *  the next gesture's first. Rests crossed during the gesture's own INPUT
 *  phase are a continuous scrub, which is a visitor scrolling and seeing the
 *  page move, not a ride running away from them — trial 2's 41-event,
 *  1,230 ms stream crosses `connect` that way and is correctly not counted.
 *
 *  Returns one row per gesture that BEGAN AT REST; a gesture that began
 *  mid-flight is outside this guarantee by construction and says so. */
export function sweptFromRest({ marks, anchors, dwell, judged, floorMs = DEFAULT_CONTRACT.dwellFloorMs, tol = DEFAULT_CONTRACT.tol }) {
  const atRest = (p) => anchors.some((a) => Math.abs(a.p - p) < tol);
  const rows = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].kind !== 'gesture-start' || !atRest(marks[i].p)) continue;
    const end = marks[i + 1];
    const next = marks[i + 2];
    if (!end || end.kind !== 'gesture-end' || !next) continue;
    rows.push({
      from: marks[i].p,
      swept: sweptBetween({ lo: end.p, hi: next.p, anchors, dwell, judged, floorMs }),
    });
  }
  return rows;
}

/* ==================================================================== *
 * DW-C3 — EVERY CROSSING, CLASSIFIED BY MECHANISM.
 *
 * DW-C1 and DW-C2 count sweeps per WINDOW and compare the count to a bound.
 * That shape cannot express the post-fix law, because the law is not about
 * how many rests a window crossed — it is about WHO SPENT THE DISTANCE.
 *
 * The law, in the register wrap-flash/ used:
 *
 *   > The presented position crosses a rest only under the visitor's own
 *   > live deltas or at a landing that composes it for its beat; distance
 *   > the machine has banked is never the visitor's to spend.
 *
 * So each crossing gets a NAME, and four names exhaust the space:
 *
 *   landing         the ride held within `tol` of the anchor for at least
 *                   the dwell floor. LEGITIMATE however it arrived — the
 *                   visitor saw the rest, which is the whole subject.
 *   scrub           the crossing happened during the INPUT phase of a
 *                   gesture that began from a landed state. The visitor's
 *                   own deltas are arriving, there is no earlier flight to
 *                   inherit banked distance from, and the page is moving
 *                   under their hand. LEGITIMATE. (DW-C2's own header
 *                   already exempted this case and for the same reason: a
 *                   continuous scrub is a visitor scrolling, not a ride
 *                   running away from them.)
 *   inflight-carry  the crossing belongs to a gesture that began while a
 *                   resolution was still in flight, and the anchor was not
 *                   dwelt at. MACHINE-OWNED. This is the 98.4% cell of
 *                   def-skip/'s table and the larger of reports 1-3's two
 *                   expressions — a second gesture's deltas landing on the
 *                   transit's banked surplus in `carry`.
 *   quiet-carry     the gesture began landed, spent its own strength, and
 *                   the ride then ran past a rest during the HANDS-OFF
 *                   stretch without composing it. MACHINE-OWNED. This is
 *                   the 1.0%-from-LANDED cell, and it is precisely the skip
 *                   `sweptPerWindowMax: 1` used to license.
 *
 * THE ARMING DISCRIMINATION IS DERIVED FROM THE TRACE, NOT FROM A GETTER.
 * "Was a resolution armed before this gesture's first event" is read as
 * "was the ride at a rest when this gesture began" — def-skip/inflight.mjs's
 * derivation, over 628 driven trials at all eight boundaries, which is where
 * the 1.0%-vs-98.4% split was measured. The alternative (a QA getter for the
 * gesture serial on the model) is a PRODUCTION edit that reds the F3
 * 26-member pin, and the design says prefer the trace derivation. New
 * recordings additionally carry `resolving`/`answered` on each mark so the
 * proxy can be CORROBORATED against the model's own state (reported by
 * `proxyDisagreement` below, never asserted on) — but the classification
 * itself has exactly one behaviour, on every trace old and new.
 * ==================================================================== */

/** The mechanism of every anchor crossing in a trial, in trace order.
 *
 *  A "crossing" is an anchor strictly inside the span a mark-to-mark segment
 *  advanced across, restricted to the anchors `passedAnchors` judged — so the
 *  departure anchor, the terminal anchor and everything behind the trial's
 *  start are excluded here exactly as they are everywhere else in this file.
 *
 *  D63 — a trial with fewer than two marks drove nothing, and reporting
 *  "zero machine-owned crossings" over it would be an assertion of absence
 *  with no observation behind it. It refuses instead. */
export function classifyCrossings({ marks, anchors, dwell, judged, floorMs = DEFAULT_CONTRACT.dwellFloorMs, tol = DEFAULT_CONTRACT.tol }) {
  if (!Array.isArray(marks) || marks.length < 2) fault('classifyCrossings: fewer than two marks — nothing was driven');
  const judgedSet = new Set(judged);
  const atRest = (p) => anchors.some((a) => Math.abs(a.p - p) < tol);
  const out = [];
  for (let i = 0; i + 1 < marks.length; i++) {
    const lo = marks[i].p; const hi = marks[i + 1].p;
    /* The phase is a property of the SEGMENT: a segment that opens on a
       gesture-start is that gesture's input phase, and one that opens on a
       gesture-end is the hands-off stretch that follows it. */
    const phase = marks[i].kind === 'gesture-start' ? 'input' : 'quiet';
    /* The owning gesture is the most recent gesture-start at or before this
       segment; its p is what says whether the previous ask had landed. */
    let g = i;
    while (g >= 0 && marks[g].kind !== 'gesture-start') g--;
    const startState = (g >= 0 && atRest(marks[g].p)) ? 'LANDED' : 'IN-FLIGHT';
    for (const a of anchors) {
      if (!judgedSet.has(a.id)) continue;
      if (!(a.p > lo && a.p <= hi)) continue;
      const held = dwell[a.id] || 0;
      let mechanism;
      if (held >= floorMs) mechanism = 'landing';
      else if (startState === 'LANDED' && phase === 'input') mechanism = 'scrub';
      else if (startState === 'IN-FLIGHT') mechanism = 'inflight-carry';
      else mechanism = 'quiet-carry';
      out.push({
        anchor: a.id,
        phase,
        startState,
        dwell: held,
        mechanism,
        machineOwned: mechanism === 'inflight-carry' || mechanism === 'quiet-carry',
      });
    }
  }
  return out;
}

/** REPORTED, NEVER ASSERTED — how often the p-proxy for "a resolution was in
 *  flight when this gesture began" disagrees with the model's own
 *  `resolving`, on recordings new enough to carry it.
 *
 *  D88: this classifier has no sibling to disagree with it, so it carries its
 *  own second opinion. A recording made before DWELL-G1 has no state on its
 *  marks and yields `null` — an honest "not observed", never a 0 that would
 *  read as agreement. */
export function proxyDisagreement({ marks, anchors, tol = DEFAULT_CONTRACT.tol }) {
  const starts = marks.filter((m) => m.kind === 'gesture-start');
  const observed = starts.filter((m) => typeof m.resolving === 'boolean');
  if (!observed.length) return null;
  const atRest = (p) => anchors.some((a) => Math.abs(a.p - p) < tol);
  let disagree = 0;
  for (const m of observed) if (atRest(m.p) === m.resolving) disagree++;
  return { observed: observed.length, disagree };
}

/** DW-C4 — the anchors this trial actually LANDED ON, and how long each held.
 *
 *  A landing is an anchor the ride came within `tol` of AND HELD AT ALL —
 *  two or more contiguous samples inside tolerance, i.e. `dwell > 0`. The
 *  single-sample case is a SWEEP: the ride passed through the anchor's
 *  tolerance band between two frames and never stopped, which is DW-C3's
 *  subject and only DW-C3's. Drawing the line here is what keeps the two
 *  rules from double-reporting one event: C3 names crossings the visitor
 *  never earned, C4 names landings that were delivered and then abandoned.
 *  A gate whose two rules fire together on the same crossing inflates its
 *  own counts, and the whole reason this contract classifies per crossing is
 *  that the COUNT is the signal (§5.1 — a residual must name itself once per
 *  event). Every landing so defined must hold for at least the dwell floor:
 *  a landing that is delivered
 *  and then departed inside 250 ms is not a rest the visitor experienced, it
 *  is a skip with a frame of politeness on it. Returns both sides so the
 *  MARGIN is reportable and not only the failures — an instrument that prints
 *  only its violations cannot show a bound being approached. */
export function landings({ samples, anchors, judged, dwell, floorMs = DEFAULT_CONTRACT.dwellFloorMs, tol = DEFAULT_CONTRACT.tol }) {
  if (!Array.isArray(samples) || samples.length === 0) fault('landings: samples is empty');
  const judgedSet = new Set(judged);
  const held = [];
  const short = [];
  for (const a of anchors) {
    if (!judgedSet.has(a.id)) continue;
    if (!samples.some(([, p]) => Math.abs(p - a.p) < tol)) continue;
    /* The sweep/landing line — see the header. `dwell` is CONTIGUOUS time
       inside tolerance, so a ride that passed through between two frames
       scores 0 and is not a landing at all. */
    if (!(dwell[a.id] > 0)) continue;
    (dwell[a.id] >= floorMs ? held : short).push({ id: a.id, ms: dwell[a.id] });
  }
  return { held, short };
}

/** Everything the oracle knows about one trial. */
export function analyseTrial(trial, contract = DEFAULT_CONTRACT) {
  const { samples, wrapped } = truncateAtWrap(trial.samples, contract.wrapDropP);
  const marks = truncateMarksAtWrap(trial.marks, contract.wrapDropP);
  const anchors = trial.anchors || ANCHORS;
  const dwell = dwellTable({ samples, anchors, tol: contract.tol });
  const judged = passedAnchors({ samples, anchors, fromP: trial.fromP, margin: contract.passMargin, tol: contract.tol });
  const swept = judged.filter((id) => dwell[id] < contract.dwellFloorMs);
  const windows = sweptByWindow({ marks, anchors, dwell, judged, floorMs: contract.dwellFloorMs });
  const fromRest = sweptFromRest({ marks, anchors, dwell, judged, floorMs: contract.dwellFloorMs, tol: contract.tol });
  const crossings = classifyCrossings({ marks, anchors, dwell, judged, floorMs: contract.dwellFloorMs, tol: contract.tol });
  const land = landings({ samples, anchors, judged, dwell, floorMs: contract.dwellFloorMs, tol: contract.tol });
  return {
    crossings,
    /* THE POST-FIX LAW's own number: crossings the visitor never earned. */
    machineOwned: crossings.filter((c) => c.machineOwned),
    mechanisms: crossings.map((c) => `${c.anchor}:${c.mechanism}`),
    landed: land.held,
    shortLandings: land.short,
    minLandingMs: land.held.length ? Math.min(...land.held.map((l) => l.ms)) : null,
    proxy: proxyDisagreement({ marks, anchors, tol: contract.tol }),
    t: trial.cfg.t,
    pause: trial.cfg.pause,
    gestures: marks.filter((m) => m.kind === 'gesture-start').length,
    sampleCount: samples.length,
    wrapped,
    dwell,
    judged,
    swept,
    /* A trial whose ride never moved measured nothing, whatever its dwell
       table says — trial 6 of the recorded sweep dispatched 36 wheel events
       and travelled 0.000. D63: that is a named cause, not a data point. */
    travelled: Math.round((samples.reduce((m2, s) => (s[1] > m2 ? s[1] : m2), 0) - samples[0][1]) * 1e6) / 1e6,
    maxSweptPerWindow: windows.reduce((m, w) => (w.length > m ? w.length : m), 0),
    fromRestGestures: fromRest.length,
    maxSweptFromRest: fromRest.reduce((m, r) => (r.swept.length > m ? r.swept.length : m), 0),
    sweptFromRest: [...new Set(fromRest.flatMap((r) => r.swept))].sort(),
    longPause: trial.cfg.pause >= contract.longPauseMs,
  };
}

/* ==================================================================== *
 * D63 — REFUSE RATHER THAN REPORT A NUMBER THE INPUTS DO NOT SUPPORT.
 *
 * "When an instrument's inputs are untrustworthy, emitting a QUALIFIED
 * number is worse than emitting none. A reader takes the number and
 * discards the qualification. Refuse, name the cause, and exit non-zero."
 *
 * A browser harness has more untrustworthy-input modes than any node suite
 * (D63 as PAGE-01 extends it): a tab that lost focus, a frame that never
 * rendered, a server that 404'd, a page that booted without `window.journey`.
 * Each is a NAMED cause here, and any one of them means no dwell number is
 * printed at all.
 * ==================================================================== */

export function trustVerdict(evidence) {
  const causes = [];
  if (!evidence.httpOk) causes.push(`the origin did not serve index.html (HTTP ${evidence.httpStatus})`);
  if (!evidence.booted) causes.push('window.journey never appeared — the page did not boot');
  if (!evidence.positiveControl) {
    causes.push('POSITIVE CONTROL FAILED: a dispatched wheel did not advance scroll.surface, '
      + 'so nothing below measured the travel model (this is the exact failure the coordinator\'s '
      + 'setProgress sweep reported "Mission" at every p from)');
  }
  if (evidence.hiddenTrials > 0) {
    causes.push(`${evidence.hiddenTrials} trial(s) ran with document.hidden — setTimeout is throttled `
      + 'and push() takes its resumedFromBackground branch, so their timings are garbage');
  }
  if (evidence.framesRendered === 0) causes.push('no frame was rendered during the run');
  if (evidence.thinTrials > 0) causes.push(`${evidence.thinTrials} trial(s) produced fewer than ${evidence.minSamples} samples`);
  if (evidence.consoleErrors > 0) causes.push(`${evidence.consoleErrors} console error(s) on the page under test`);
  if (evidence.stillTrials > 0) {
    causes.push(`${evidence.stillTrials} trial(s) dispatched their wheel events and the ride did not move at all — `
      + 'a trial that did not travel measured nothing, whatever its dwell table says');
  }
  if (evidence.trialCount === 0) causes.push('no trial completed');
  /* THE PACING CAUSE — CONNECT-SKIP's discipline, adopted whole.
   *
   * D196 recorded a coordinator running five agents on eight cores at load
   * average 240, and nearly taking four timing measurements through it. The
   * obvious guard is to refuse above a load threshold, and CONNECT-SKIP
   * showed why that guard does not work on this host: it observed load 30 at
   * 40% CPU IDLE. macOS load average counts threads blocked on I/O, so it is
   * a poor contention proxy here and a run gated on it is gated on noise.
   *
   * So the trust criterion is the thing actually at stake — WHETHER THE PAGE
   * GOT ITS FRAMES. A trial whose p95 frame gap exceeded the budget was
   * measured through a stall, and every dwell number in it is a measurement
   * of the machine rather than of the page. Those trials are EXCLUDED and
   * COUNTED, never silently dropped; and when fewer than half a run's trials
   * survive, the run reports NO FIGURE AT ALL rather than a figure over the
   * lucky half. A number computed from whichever trials happened to get
   * their frames is a survivorship artefact wearing a measurement's clothes.
   *
   * `pacedOutTrials` is how many were excluded, `trialCount` how many were
   * kept. The half is a floor, not a target: a run that keeps six of eleven
   * is trusted and says so. */
  if (evidence.pacedOutTrials > 0 && evidence.trialCount <= evidence.pacedOutTrials) {
    causes.push(`${evidence.pacedOutTrials} trial(s) exceeded the ${evidence.frameGapBudgetMs} ms p95 frame-gap `
      + `budget and only ${evidence.trialCount} survived — fewer than half the run got its frames, so every `
      + 'timing below would be a measurement of this machine under contention rather than of the page');
  }
  return { trusted: causes.length === 0, causes };
}

/* ==================================================================== *
 * THE CONTRACT EVALUATION — RETUNED 2026-08-25 BY DWELL-G1.
 *
 * WHAT STOOD HERE, VERBATIM, AND WHY IT HAD TO GO:
 *
 *   > CRITICAL, AND THE WHOLE REASON THIS ORACLE IS USABLE: the skip is
 *   > DELIBERATE. ... So this does NOT assert "every anchor is dwelt at".
 *   > That assertion is red at base and red at every commit since, and a
 *   > gate that is red for pre-existing intended behaviour is disabled by
 *   > the first person it inconveniences.
 *
 * Every clause of that was TRUE WHEN WRITTEN. `repeatAnchor` was documented,
 * uniform, and present at the base commit on the same trials; refusing to
 * gate a deliberate behaviour was correct instrument discipline.
 *
 * It stopped being true on 2026-08-23, when the owner overruled the design
 * and the queue fix landed: the intermediate rest now composes, so "every
 * anchor the ride crosses is either scrubbed through by the visitor or dwelt
 * at" is no longer red at base — it is the shipped behaviour, and the
 * paragraph above had become a licence for the exact defect she reported for
 * the fourth time on 2026-08-25. The gate for this category existed and was
 * structurally incapable of failing.
 *
 * SO THE CONTRACT NOW ASSERTS THE LAW ITSELF, in four rules of two kinds:
 *
 *   DW-C1  BOUND, HISTORICAL — at most one section swept per gesture window.
 *   DW-C2  BOUND, HISTORICAL — the same, over the hands-off stretch alone.
 *          Both are kept for continuity with DEF-OWNED's base-vs-current
 *          tables; C3 strictly dominates them.
 *   DW-C3  LAW — machine-owned crossings, classified PER CROSSING BY
 *          MECHANISM (`classifyCrossings`). Threshold ZERO.
 *   DW-C4  LAW — every landing composes for at least the dwell floor.
 *
 * and the DUAL (DW-C5, `evaluateDual`) is asserted on its own driven probe,
 * because a one-sided gate would let the next fix trade skips for swallows.
 * ==================================================================== */

export function evaluateContract(trials, contract = DEFAULT_CONTRACT) {
  if (!Array.isArray(trials) || trials.length === 0) fault('evaluateContract: no trials');
  const rows = trials.map((t) => analyseTrial(t, contract));
  const violations = [];
  for (const r of rows) {
    if (r.maxSweptPerWindow > contract.sweptPerWindowMax) {
      violations.push(`DW-C1 trial ${r.t}: one gesture swept past ${r.maxSweptPerWindow} rests `
        + `(contract: at most ${contract.sweptPerWindowMax} — "one gesture / one additional section")`);
    }
    if (r.maxSweptFromRest > contract.sweptPerWindowMax) {
      violations.push(`DW-C2 trial ${r.t}: one gesture from a standstill carried the ride past `
        + `${r.maxSweptFromRest} rests during its quiet phase (contract: at most `
        + `${contract.sweptPerWindowMax}) — swept [${r.sweptFromRest.join(', ')}]`);
    }
    /* DW-C3. ONE VIOLATION PER CROSSING, deliberately — a residual that
       fires once in a hundred crossings must name itself once per event
       rather than be averaged into a rate that can pass by luck.

       THE THRESHOLD IS COMPARED, NOT MERELY QUOTED. It shipped interpolated
       into the message and read by no branch: `machineOwnedMax: 1` would
       have relaxed nothing, and — worse in this program's own terms — a
       reader of the violation text would have believed a number that was
       enforcing nothing. A knob that cannot be turned is the same defect as
       a gate that cannot fail, wearing the other glove. It is compared here
       so that DO29 (the mutant that relaxes it from zero to one) has
       something to move; at the shipped `0` the behaviour is unchanged. */
    if (r.machineOwned.length > contract.machineOwnedMax) for (const c of r.machineOwned) {
      violations.push(`DW-C3 trial ${r.t}: the ride crossed \`${c.anchor}\` with ${c.dwell} ms of dwell `
        + `by mechanism ${c.mechanism} — the gesture owning that ${c.phase} phase began ${c.startState}, `
        + `so this distance was banked by a resolution the visitor's deltas did not arm `
        + `(contract: machine-owned crossings <= ${contract.machineOwnedMax})`);
    }
    /* DW-C4. */
    for (const s of r.shortLandings) {
      violations.push(`DW-C4 trial ${r.t}: the ride reached \`${s.id}\` and held it for ${s.ms} ms, `
        + `below the ${contract.dwellFloorMs} ms floor — a landing that does not compose is a skip `
        + 'with a frame of politeness on it');
    }
  }
  const everSwept = [...new Set(rows.flatMap((r) => r.swept))].sort();
  const longRows = rows.filter((r) => r.longPause);
  const longDwells = longRows.flatMap((r) => r.judged.map((id) => r.dwell[id]));
  const longSkips = longRows.filter((r) => r.swept.length).map((r) => r.t);
  return {
    rows,
    violations,
    everSwept,
    /* Reported so the BOUNDS above can be seen approaching, not only crossed. */
    margin: {
      longPauseTrials: longRows.length,
      minDwellUnderLongPause: longDwells.length ? Math.min(...longDwells) : null,
      /* REPORTED, NOT ASSERTED — see DEFAULT_CONTRACT.longPauseMs. A
         non-empty list here is the measured counterexample to the threshold
         reading of S-4's dwell/pause table, not a failure. */
      longPauseTrialsThatSwept: longSkips,
      floorMs: contract.dwellFloorMs,
      maxSweptPerWindow: rows.reduce((m, r) => (r.maxSweptPerWindow > m ? r.maxSweptPerWindow : m), 0),
      fromRestGestures: rows.reduce((a, r) => a + r.fromRestGestures, 0),
      maxSweptFromRest: rows.reduce((m, r) => (r.maxSweptFromRest > m ? r.maxSweptFromRest : m), 0),
      stillTrials: rows.filter((r) => r.travelled === 0).map((r) => r.t),
      /* --- DW-C3/DW-C4's own margins ------------------------------- */
      crossings: rows.reduce((a, r) => a + r.crossings.length, 0),
      machineOwned: rows.reduce((a, r) => a + r.machineOwned.length, 0),
      mechanismCensus: rows.flatMap((r) => r.crossings.map((c) => c.mechanism))
        .reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {}),
      /* THE MARGIN, REPORTED ON EVERY RUN. `dwellFloorMs` is what this
         instrument calls a stop and `minLandingMs` is what the page ACTUALLY
         delivered. `restBeatMs`/`beatOverFloorMs` were a third column here —
         what the page was AUTHORED to hold for, against the floor — and both
         retired on 2026-08-26 with journey/constants/scroll.js's
         `COMMIT_REST_BEAT_MS`: the page authors no hold on the scroll path at
         all, so there is no authored figure left for a realized landing to be
         measured against. `minLandingMs` now measures what the ride does
         unaided, which is all it ever measured. */
      minLandingMs: (() => {
        const all = rows.map((r) => r.minLandingMs).filter((v) => v !== null);
        return all.length ? Math.min(...all) : null;
      })(),
      landings: rows.reduce((a, r) => a + r.landed.length, 0),
      shortLandings: rows.reduce((a, r) => a + r.shortLandings.length, 0),
      /* REPORTED, NOT ASSERTED — D88's second opinion on the p-proxy. */
      proxy: rows.reduce((acc, r) => {
        if (!r.proxy) return acc;
        return { observed: acc.observed + r.proxy.observed, disagree: acc.disagree + r.proxy.disagree };
      }, { observed: 0, disagree: 0 }),
    },
  };
}

/* ==================================================================== *
 * DW-C5 — THE DUAL, AND IT IS AN INTEGER.
 *
 * DEFECT-02 is this category's dual and the record contains it: a wall built
 * for exactly this class — the reversal release meeting `contactSettling` —
 * OVER-refused and swallowed a leg the visitor had bought FROM REST. "Two
 * flicks buy one section." MOBILE-OBSERVE called it "the new defect wearing
 * the old one's clothes".
 *
 * So the dual is measured off ONE number, both directions at once:
 *
 *   park at a rest  ->  flick A  ->  wait a delay drawn INSIDE the declared
 *   transit window  ->  flick B  ->  let everything land  ->  how many rest
 *   anchors did the ride advance?
 *
 *   1  THE CONTRACT. A was born at a rest and buys its leg. B was born in
 *      flight, so it feeds A's flight and is spent at A's landing. It buys
 *      nothing of its own.
 *   2+ A SECTION SWEPT PAST — the in-flight authority class, owner reports
 *      1-4, and #26 in the owner's own words: "So you didn't fix it? This is
 *      when scrolling through". This is the SKIP red.
 *   0  FLICK A ITSELF WAS REFUSED, from a rest, with nothing in flight —
 *      the wall over-refusing, DEFECT-02's true class. This is the REFUSAL
 *      red, and it is NOT the same fault as the row above it.
 *
 * RE-ANCHORED 2026-08-26 from `2` to `1` by docs/code-health/2026-08-26-a7-ruling.md,
 * Ruling 1: the owner rejected the queued-departure shape at any delay, and
 * the distinction a `2` would need does not exist in the model (26 of 29
 * landing-frame fields bit-identical at 700 vs 750 ms). What changed is the
 * expected integer. What did NOT change is `dualDelaysMs`'s sampling at
 * 0.25/0.5/0.75 of each boundary's own transit: that is the exposure window,
 * it was always right, and it now pins the REFUSAL side across all of it.
 *
 * The from-standstill control is def-skip/flick-probe.mjs's, which scored
 * 400/400 at 1 leg; this is its in-flight variant, which is the state the
 * whole category lives in — and the two now agree on the same integer,
 * because a mid-flight second stream buys what a standstill one does: the
 * one leg its from-rest predecessor paid for, and no more.
 * ==================================================================== */

/** How many rest anchors the ride advanced, in its own direction, on a
 *  LOOPED route. `null` when the ride stopped somewhere that is not a rest —
 *  reported as its own outcome rather than rounded into a neighbour.
 *  def-skip/flick-probe.mjs's arithmetic, unforked. */
export function stepsAdvanced(startIdx, endP, dir, anchors = ANCHORS, tol = DEFAULT_CONTRACT.tol) {
  if (!Number.isInteger(startIdx) || startIdx < 0 || startIdx >= anchors.length) {
    fault(`stepsAdvanced: startIdx ${startIdx} is not an index into ${anchors.length} anchors`);
  }
  const n = anchors.length;
  let endIdx = -1;
  for (let i = 0; i < n; i++) if (Math.abs(anchors[i].p - endP) < tol) { endIdx = i; break; }
  if (endIdx < 0) return null;
  return ((endIdx - startIdx) * dir % n + n) % n;
}

/** THE CADENCE, DERIVED FROM THE ROUTE RATHER THAN FROM A REMEMBERED
 *  MILLISECOND — the piece that keeps this probe's coverage true by
 *  construction.
 *
 *  The class fires while a resolution is in flight, so the exposure window
 *  IS the transit duration. A probe with hard-coded delays keeps its coverage
 *  only while `TRANSIT_S` happens not to move; the day someone lengthens a
 *  leg (which WIDENS the window the defect lives in) the probe would quietly
 *  start delivering its second flick after the landing and measure the
 *  standstill case instead — a coverage loss that reads as a green.
 *
 *  `transitOf(lo, hi, dir)` is INJECTED rather than imported: journey/route.js
 *  is the authority for the table, and this module must stay importable with
 *  no journey dependency at all (tools/test-instrument-layer.mjs stages it,
 *  and a staged copy that reached into journey/ would drag the whole tree).
 *  tools/dwell-run.mjs passes route.js's `transitSeconds`; the gate passes a
 *  fixture table.
 *
 *  A boundary with no DECLARED transit falls back to `bandS` — the global
 *  band scroll.js uses for exactly those legs — and says which it used, so a
 *  reader can never mistake a fallback for a declaration. */
export function transitWindows({ anchors, transitOf, bandS = 1.8 }) {
  if (typeof transitOf !== 'function') fault('transitWindows: transitOf must be a function (route.js transitSeconds, or a fixture)');
  if (!Array.isArray(anchors) || anchors.length < 2) fault('transitWindows: fewer than two anchors');
  const out = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const declared = transitOf(anchors[i].p, anchors[i + 1].p, 1);
    out.push({
      from: anchors[i].id,
      to: anchors[i + 1].id,
      declared: declared > 0 ? declared : null,
      ms: Math.round(1000 * (declared > 0 ? declared : bandS)),
    });
  }
  return out;
}

/** The delays at which a second gesture is delivered into a live transit,
 *  as fractions of that boundary's own window. Every value is strictly
 *  inside the window by construction, so a `TRANSIT_S` edit moves the probe
 *  with it instead of stranding it past the landing. */
export function dualDelaysMs({ anchors, transitOf, bandS = 1.8, fractions = [0.25, 0.5, 0.75] }) {
  if (!Array.isArray(fractions) || !fractions.length) fault('dualDelaysMs: no fractions');
  for (const f of fractions) if (!(f > 0 && f < 1)) fault(`dualDelaysMs: fraction ${f} is not strictly inside the transit window`);
  return transitWindows({ anchors, transitOf, bandS }).map((w) => ({
    ...w,
    delays: fractions.map((f) => Math.round(w.ms * f)),
  }));
}

/** DW-C1/DW-C2's sweep, re-drawn so its inter-gesture pauses land INSIDE the
 *  declared windows rather than in a fixed 250..2850 ms range that predates
 *  the table. `gestureConfigs` itself is untouched and bit-identical — its
 *  eleven trials are the unit of comparison with DEF-OWNED's base tree and
 *  must not move — so the transit-derived cadence is a SECOND generator. */
export function transitGestureConfigs(seed, trials, windowMs) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) fault(`transitGestureConfigs: windowMs must be a positive integer, got ${windowMs}`);
  return gestureConfigs(seed, trials).map((c, i) => ({
    ...c,
    /* Sweep the whole window in equal steps, offset per trial so the set
       covers early, mid and late flight at every boundary rather than one
       phase everywhere. */
    pause: Math.max(60, Math.round(windowMs * ((i % 4) + 1) / 5)),
  }));
}

/** DW-C5 over a set of driven dual runs. Two-sided off one integer. */
export function evaluateDual(runs, contract = DEFAULT_CONTRACT) {
  if (!Array.isArray(runs) || runs.length === 0) fault('evaluateDual: no dual runs');
  const want = 1 + contract.dualLegs;
  const rows = runs.map((r) => ({
    ...r,
    legs: stepsAdvanced(r.startIdx, r.endP, r.dir, r.anchors || ANCHORS, contract.tol),
    /* The mirror of flick-probe.mjs's standstill assertion: a second flick
       that arrived AFTER the resolution landed measured the from-standstill
       case, which is the other experiment. Proved per run, never assumed. */
    midFlightProved: !!(r.midFlight && r.midFlight.resolving),
  }));
  const judged = rows.filter((r) => r.midFlightProved);
  /* D63 — if no run reached the state this probe exists to measure, it
     measured nothing, and "no violations" over it would be an assertion of
     absence with no observation behind it. */
  if (!judged.length) {
    fault(`evaluateDual: none of the ${rows.length} run(s) delivered their second stream while a resolution `
      + 'was still in flight — every one measured the from-standstill case, which is a different experiment');
  }
  const violations = [];
  for (const r of judged) {
    if (r.legs === null) {
      violations.push(`DW-C5 ${r.from}->${r.to} delay ${r.delayMs} ms: the ride came to rest at p ${r.endP}, `
        + 'which is not a rest anchor — an outcome reported rather than rounded into a neighbour');
    } else if (r.legs > want) {
      /* THE SKIP SIDE — owner report #26's class, returning. Named so a
         reader can never mistake it for the row below: this is a section the
         MACHINE took while the visitor's hands were still. */
      violations.push(`DW-C5 SKIP ${r.from}->${r.to} delay ${r.delayMs} ms: a second stream delivered `
        + `${r.delayMs} ms into a LIVE transit bought ${r.legs - 1} additional leg(s) (contract: exactly `
        + `${contract.dualLegs} — a gesture born in flight is spent at that flight's landing). `
        + 'This is the in-flight authority class, all four owner reports, and #26 in the owner\'s '
        + 'words: "So you didn\'t fix it? This is when scrolling through". See '
        + 'docs/code-health/2026-08-26-a7-ruling.md Ruling 1');
    } else if (r.legs < want) {
      /* THE REFUSAL SIDE — a DIFFERENT fault from the one above. Nothing
         about the mid-flight stream is at issue here: flick A was born at a
         REST, with nothing in flight, and a from-rest gesture is always the
         visitor's to spend. */
      violations.push(`DW-C5 REFUSED ${r.from}->${r.to} delay ${r.delayMs} ms: the ride advanced `
        + `${r.legs} leg(s), not ${want} — the FROM-REST flick that opened this run bought nothing, `
        + 'so the wall is over-refusing (DEFECT-02\'s class, "two flicks buy one section"). This is '
        + 'NOT the skip above it: no section was taken, one the visitor paid for was withheld. A gate '
        + 'watching only for skips would have traded one owner complaint for the other in silence');
    }
  }
  return { rows, violations, legs: rows.map((r) => r.legs) };
}

/* ==================================================================== *
 * THE §5.4 WIRING — THE GOVERNED PATHS, AND WHY THE LIST IS HERE.
 *
 * THE RECURRENCE THIS ORDER EXISTS TO STOP IS A WIRING FAILURE, NOT A
 * CODING ONE. The four owner reports were each diagnosed correctly and each
 * fix landed and held. What never existed was anything that RAN the check:
 * this oracle was wired into no required ring at all (OPEN-ITEMS E1 — it had
 * literally never run since the rail-geometry restructure), so its contract
 * being stale cost nothing, because a stale contract and a contract nobody
 * evaluates are the same object.
 *
 * A browser run cannot go inside `npm run check` — it needs Chrome and a
 * served tree, and a check people cannot run at their desk gets bypassed
 * within a week, which is how this category got here. So the ring is made
 * REQUIRED FOR THE PATHS THAT OWN THE CLASS instead: a commit touching one
 * of these files must carry a receipt from a green run against those exact
 * bytes. tools/pre-commit enforces it, in the shape the capture gate
 * already uses.
 *
 * The list lives in this module rather than in the hook so that the hook and
 * the receipt writer read ONE list. Two copies of a path list is how a file
 * quietly stops being governed.
 *
 * `route.js` is here for its pacing tables — `TRANSIT_S`/`transitSeconds` —
 * because the exposure window this class lives in IS the transit duration,
 * so lengthening a leg widens the window without touching scroll.js at all.
 * ==================================================================== */

/** The files whose edits require a fresh green browser-ring receipt. */
export const GOVERNED_PATHS = Object.freeze([
  'journey/scroll.js',
  'journey/transport.js',
  'journey/claim.js',
  'journey/constants/scroll.js',
  'journey/route.js',
]);

/* ==================================================================== *
 * THE PAGE-SIDE HALF.
 *
 * `parkAt` and `drivenTrial` are serialised by Playwright and executed
 * INSIDE the page, so they take no import and touch nothing in this
 * process. They live here, in the module the gate stages and mutates,
 * rather than in the runner — tools/test-instrument-layer.mjs reads their
 * function SOURCE, so a mutant that makes the driver set progress instead
 * of dispatching an event is killed by a control.
 *
 * THE CHROMIUM LAUNCH AND THE CLI ARE NOT HERE. They are tools/dwell-run.mjs.
 * That split is not tidiness: `playwright-core` costs 2.0 s to import, and
 * this module is imported by a suite inside `npm run check`. Writing the
 * launch as a DYNAMIC import instead was tried and is worse — tools/
 * stage-tree.mjs refuses `import('` outright, because a specifier it cannot
 * rewrite would resolve against the scratch directory and silently load the
 * REAL module in place of the staged copy. So the browser lives behind an
 * entry point and this module stays stageable, cheap and pure.
 * ==================================================================== */

export function parseArgs(argv) {
  const get = (k, d) => {
    const hit = argv.find((a) => a.startsWith(`--${k}=`));
    return hit === undefined ? d : hit.slice(k.length + 3);
  };
  return {
    origin: get('origin', 'http://localhost:8177'),
    seed: Number(get('seed', '7')),
    trials: Number(get('trials', '11')),
    fromP: Number(get('from', '0.26')),
    width: Number(get('width', '1280')),
    height: Number(get('height', '800')),
    record: get('record', null),
  };
}

/** SETUP, and it is deliberately OUTSIDE the driven region below.
 *
 *  Parking the ride at the trial's start point is the one place a progress
 *  setter is legitimate: it is not travel, no measurement is running, and
 *  the clock has not started. It lives here, in its own function, so that
 *  the driven region can be scanned for progress setters and honestly
 *  contain none — and so that this call is the POSITIVE CONTROL proving
 *  that scan's pattern is not blind (D46). */
export const parkAt = async (arg) => {
  const { fromP, settleMs } = arg;
  window.journey.scrollTo(fromP);
  await new Promise((r) => setTimeout(r, settleMs));
  return window.journey.p;
};

/* --- THE DRIVEN REGION ---------------------------------------------- *
 * Everything between this marker and END OF DRIVEN REGION runs INSIDE the
 * page and is the only code that moves the ride. tools/test-dwell-oracle.mjs
 * slices exactly this span, strips its comments, and asserts that what is
 * left contains NO progress setter at all — the ride is moved by dispatched
 * events or it is not measured. (The delimiters are comments, so they are
 * found in raw source and the CONTENT is scanned stripped; a scan that read
 * stripped bytes for its own anchors would be looking for text it had just
 * blanked.)
 * -------------------------------------------------------------------- */
/** @param {object} arg */
export const drivenTrial = async (arg) => {
  const { cfg, sampleMs, tailMs, stopP } = arg;
  const j = window.journey;
  const t0 = performance.now();
  const samples = []; const marks = [];
  let frames = 0; let hidden = document.hidden;
  /* FRAME PACING, MEASURED IN THE PAGE AND SUMMARISED THERE. The gaps
     between consecutive rendered frames are what says whether this trial got
     its frames or was measured through a stall; `trustVerdict` excludes the
     stalled ones. Only the summary crosses the bridge — a per-frame array
     over an eleven-trial sweep is tens of thousands of numbers to serialise
     for three statistics. */
  const gaps = []; let lastFrame = 0;
  const raf = (ts) => {
    frames++;
    if (lastFrame) gaps.push(ts - lastFrame);
    lastFrame = ts;
    if (!stop) requestAnimationFrame(raf);
  };
  let stop = false;
  const now = () => Math.round(performance.now() - t0);
  const at = () => Number(j.p.toFixed(6));
  /* `resolving` and `answered` ride on the MARK, not on the sample stream:
     the classifier needs the model's state at the moment a gesture BEGINS,
     which is exactly where a mark already is, and leaving `samples` a stream
     of [t, p] pairs keeps every recording this instrument has ever made
     readable by every reader in this file. They are the D88 second opinion on
     the p-proxy (`proxyDisagreement`), reported and never asserted on. */
  const mark = (kind) => marks.push({
    t: now(), p: at(), kind,
    resolving: !!j.scroll.resolving, answered: j.scroll.answeredAt,
  });
  const sampler = () => { if (stop) return; samples.push([now(), at()]); setTimeout(sampler, sampleMs); };
  requestAnimationFrame(raf);
  sampler();
  for (let g = 0; g < cfg.gestures; g++) {
    if (j.p >= stopP) break;
    mark('gesture-start');
    for (let i = 0; i < cfg.count; i++) {
      if (j.p >= stopP) break;
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: cfg.delta, cancelable: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, cfg.iv));
    }
    mark('gesture-end');
    if (document.hidden) hidden = true;
    await new Promise((r) => setTimeout(r, cfg.pause));
  }
  await new Promise((r) => setTimeout(r, tailMs));
  stop = true;
  mark('settle-end');
  if (document.hidden) hidden = true;
  gaps.sort((a, b) => a - b);
  const pct = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))]) : 0);
  return {
    cfg, samples, marks, frames, hidden,
    /* p95, not max: one long frame is a garbage-collection pause and every
       real run has some. A p95 above the budget is a trial that was stalling
       throughout, which is the state whose timings cannot be trusted. */
    pacing: { count: gaps.length, p50: pct(0.5), p95: pct(0.95), max: pct(1) },
  };
};

/** DW-C5's driven half — two flicks, the second delivered into a live
 *  transit, and the integer that comes out.
 *
 *  THE MID-FLIGHT ASSERTION IS THE WHOLE VALIDITY OF THE EXPERIMENT, and it
 *  is the mirror of flick-probe.mjs's standstill assertion. That probe
 *  REFUSED any trial where the ride was not idle before its single flick,
 *  because a flick into a live resolution is the other experiment. This is
 *  that other experiment, so it refuses the opposite way: `midFlight` records
 *  `resolving` and `rate` at the instant flick B is delivered, and a run in
 *  which the ride had already landed measured the standstill case and is
 *  discarded by the reader rather than pooled.
 *
 *  Parking is `parkAt`'s job and happens OUTSIDE the driven region, for the
 *  reason the region markers exist: DW-EVT-1 scans these bytes for progress
 *  setters and must find none. Every metre this function moves the ride is
 *  moved by a dispatched event. */
export const dualTrial = async (arg) => {
  const { delayMs, burst, tailMs, sampleMs } = arg;
  const j = window.journey;
  const s = j.scroll;
  const t0 = performance.now();
  const now = () => Math.round(performance.now() - t0);
  const samples = [];
  let stop = false;
  let frames = 0;
  const raf = () => { frames++; if (!stop) requestAnimationFrame(raf); };
  const sampler = () => { if (stop) return; samples.push([now(), Number(j.p.toFixed(6))]); setTimeout(sampler, sampleMs); };
  requestAnimationFrame(raf);
  sampler();
  const flick = async () => {
    for (let i = 0; i < burst.count; i++) {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: burst.delta, cancelable: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, burst.iv));
    }
  };
  const startedAt = { p: Number(j.p.toFixed(6)), resolving: !!s.resolving, rate: s.rate };
  await flick();
  await new Promise((r) => setTimeout(r, delayMs));
  const midFlight = { p: Number(j.p.toFixed(6)), resolving: !!s.resolving, rate: s.rate, answered: s.answeredAt };
  await flick();
  await new Promise((r) => setTimeout(r, tailMs));
  stop = true;
  return {
    startedAt, midFlight, samples, frames,
    endP: Number(j.p.toFixed(6)),
    hidden: document.hidden,
  };
};
/* --- END OF DRIVEN REGION ------------------------------------------- */
