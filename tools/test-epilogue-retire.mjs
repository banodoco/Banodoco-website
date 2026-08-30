/* ==================================================================== *
 * tools/test-epilogue-retire.mjs — THE MID-ARRIVAL WRAP GATE.
 *
 * THE LAW (the epilogue race, 2026-08-26): a departure choreography must
 * be fitted to the state it actually departs from, not to the finished
 * state it assumes — a retire scaled to the full band is a step and a
 * rush wearing a schedule.
 *
 * Hannah: "when I scroll DOWN from the bottom BEFORE all the mushrooms
 * in the epilogue section have fully loaded, the ROOT of the main
 * mushroom becomes visible and the spores from the other mushrooms
 * reappear." Nothing asynchronous is outstanding at that moment — every
 * chapter is built, baked bytes fetched and GPU-warmed before input
 * activates. The "loading" is the ARRIVE limiter's kindle ladder
 * (~3.4 s), and the fault was the wrap's retire being fitted to the FULL
 * band (BAND_S / window) while the driver stood mid-band: the whole
 * departure — lights-out, bed, sky, hero ground-web/root restore, mote
 * visibility flip, chapter close — compressed into the first third of
 * the lap, over open view, and the bed/sky spread armed with a one-frame
 * step against the eff it took over from.
 *
 * WHAT THIS GATE STAGES: a real wheel-driven wrap fired while the Final
 * arrival ladder is mid-flight — park just past the pierce, gesture into
 * the rest, let it LAND, hold LAND_HOLD_FRAMES, then gesture again (see the
 * trigger's own note: one unbroken stream lands and can never wrap, and
 * the shipped single-gesture trigger only ever fired because contention
 * broke the stream for it). QA hooks journey.wrap()/flyTo() are NOT the
 * input path and are not used for the behavioural claim.
 *
 * ASSERTIONS, per valid trial:
 *   R1  ARM CONTINUITY — across the wrap's arm (first 4 wrap frames), no
 *       Final uAmount uniform (body/bed/sky) steps DOWN by more than 0.10
 *       in one frame. (Unfixed: the bed stepped 1 -> 0.7989 at pull
 *       0.626; the step grows the earlier the wrap.)
 *   R2  THE WINDOW IS SPENT — the reveal driver reaches 0 no sooner than
 *       R2_MIN_FRACTION of the retire window (RETIRE_SPAN x the wrap's
 *       own measured duration). (Unfixed at pull 0.626: 1633 ms of a
 *       2480 ms window = 0.66. Fixed: the window, by construction.)
 *   R3  THE OCCLUDER LEADS THE LIGHT IT HIDES (report #32, 2026-08-26 —
 *       Hannah: "some of the underground networks become visible
 *       temporarily during the transition through the loop from end to
 *       beginning and vice versa"). A DIFFERENT mechanism sharing this
 *       lap: the soil slab that hides Final's buried colony is not
 *       blended, it is an opaque mesh with a hashed stipple
 *       (`if (h > uSoilOn) discard`), so uSoilOn is a fraction of its
 *       PIXELS while the same float is an AMPLITUDE for the strokes
 *       behind it. Driven by one scalar, the buried network leaks through
 *       the holes at (1 - bed) x bed of full — peak 0.25 at bed 0.5,
 *       measured over the whole floor in both lap directions. Asserted on
 *       every frame the chapter is drawing:
 *
 *           (1 - uSoilOn) * bed  <=  R3_MAX_LEAK
 *
 *       Unfixed this reaches 0.25 on every wrap in either direction (the
 *       retire crosses bed 0.5 by construction). Fixed it is bounded by
 *       SOIL_LEAD / 4 = 0.05. Re-taken on the injected clock, 2026-08-26:
 *       0.25 unfixed and 0.05 fixed, 2/2 trials each, IDENTICAL across
 *       trials where the wall-clock proof drifted with the pull it caught.
 *       Independent of R1/R2's mid-arrival trigger — it holds on any wrap —
 *       but it rides the same valid trials rather than adding a second
 *       instrument.
 *
 *   R4  THE ENTRANCE IS SPENT WHERE IT CAN BE SEEN (report #31, 2026-08-26 —
 *       Hannah: "when I do a loop from the end to the beginning, the hero
 *       text at the beginning shows up REALLY quickly too — no entry
 *       animation"). A THIRD mechanism riding this same lap. The hero is the
 *       one DEFERRED copy surface and the rail holds a gate shut over it
 *       until the section strip's final approach, while the wrap's copy
 *       envelope ran on the lap's wall clock from the wrap frame — so the
 *       entrance began behind a closed gate and was 3% spent when the surface
 *       first became visible, at which point the arrival SHELF ratcheted past
 *       it and swept the words in. Asserted on the hero's PAINTED opacity,
 *       the one value that reaches the DOM:
 *
 *           hero paint 0.001 -> 0.8  >=  R4_MIN_ENTRANCE_MS
 *           max single-frame rise    <=  R4_MAX_PAINT_STEP
 *
 *       Unfixed: 185-192 ms and 0.179-0.199 (4/4 clean trials, quiet host).
 *       Fixed: 1432-1455 ms and 0.0147-0.0153 (4/4). Like R3 it holds on any
 *       wrap and rides these trials rather than firing a second one.
 *       Re-taken on the injected clock, 2026-08-26, on a BUSY host: unfixed
 *       184 ms / 0.1515 and fixed 1450 ms / 0.0136, both 2/2 and both bit-
 *       identical across trials. The worst-frame figure is the one the wall
 *       clock had been inflating — its proof spread 0.176 to 0.427 on pacing
 *       alone, and 0.1515 is what the fault actually does.
 *
 *   R5  AND SO IS THE ORDINARY ONE (report #36, 2026-08-26 — Hannah: "could
 *       you also make it so that the intro block text, when it appears and
 *       reappears, that happens gradually and nicely rather than it just
 *       popping up as it does now?"). R4's law, on the arrival the visitor
 *       actually makes most often. Report #31 measured the ordinary arrivals
 *       at this same surface and deliberately left them alone as out of its
 *       scope; #36 is the owner asking for them, so the trial now CONTINUES
 *       past the wrap it already fires — down out of the intro and back up
 *       into it — and asserts the same two figures over that return:
 *
 *           max single-frame rise    <=  R5_MAX_PAINT_STEP
 *
 *       ONE CLAUSE, not R4's two: R4's fault was a SHORT entrance, this one
 *       is a step inside a long one, and a duration clause here was measured
 *       unable to go red (see R5_MAX_PAINT_STEP for the reading).
 *
 *       IT IS A DIFFERENT MECHANISM FROM R4's AND THAT IS WHY IT IS A
 *       SEPARATE LAW. R4's fault was an authored envelope spending itself
 *       behind a shut gate; here there is no envelope at all — the rail's
 *       gate is authored in ROUTE POSITION (`1 - smoothstep(u / 0.05)`), so
 *       a brisk wheel crosses the whole fade in about three frames and the
 *       arrival shelf ratchets in with it. On a continuous wheel stream,
 *       unfixed: 0.001 -> 0.8 in 50 ms with a 0.4587 single frame; fixed:
 *       867 ms and 0.0152. On THIS trial's own return, unfixed 0.4161 and
 *       fixed 0.0152. All 2/2 and bit-identical across trials on the injected
 *       clock (.../intro-copy-fade/).
 *
 * ------------------------------------------------------------------
 * THE INJECTED CLOCK — why this gate no longer measures wall time
 * ------------------------------------------------------------------
 * This suite has now been the blind gate in BOTH directions, and both
 * times the cause was the same: it was denominated in WALL time.
 *
 *   · On a CALM host its original single-gesture trigger could not fire
 *     at all — it had only ever fired because contention broke the input
 *     stream for it. Repaired 2026-08-26 by authoring the break (land,
 *     hold, gesture again).
 *   · On a BUSY host — the owner's ordinary desktop, their own Chrome
 *     plus Spotify plus mediaanalysisd, load 50-86 — every trial was
 *     excluded on the p95 pacing criterion: 0 of 2 valid, 8 excluded, at
 *     p95 frame gaps of 63.9-82.8 ms against a 50 ms limit. Measured on
 *     2026-08-26 against a STAGED PRE-CHANGE tree in the same minute and
 *     it read the identical 0/2 and 8 exclusions, so this was the
 *     instrument, not a regression.
 *
 * Both are one fault. A gate that reads the wall clock treats the
 * machine's other work as measurement error, and there is no discipline
 * that makes an ordinary desktop quiet. So this gate is migrated onto the
 * rig `tools/tempo-oracle.mjs` already proved, which is
 * `tools/trace/brake-tail.py`'s recipe moved into the browser ring:
 * `performance.now` is replaced BEFORE the document loads (`VT_INJECT`,
 * imported from that oracle rather than restated here — one rig, not two)
 * and the DRIVER advances it by exactly one frame per real rAF.
 * `organism/animation.js` takes `dt` from a `THREE.Clock`, which reads
 * `performance.now`, so the whole spine follows: measured dt is 0.016667
 * on every rendered frame, min = max, under the same load that gave the
 * wall-clock trial 63.9-82.8 ms gaps.
 *
 * WHAT THAT CHANGES AND WHAT IT DOES NOT. Every millisecond figure below
 * is now VIRTUAL, and every one of them was already measuring a DESIGNED
 * duration — a retire window, a copy envelope — not a wall interval, so
 * R1-R4's laws and thresholds are UNCHANGED by the migration. What moves
 * is the trigger's own calibration, which is denominated in frames now
 * because the driver issues them: see LAND_HOLD_FRAMES.
 *
 * TRIAL VALIDITY (the connect-skip trust criterion, D196 discipline):
 *   - the wrap fired, and departed at pull in [0.35, 0.85] — genuinely
 *     mid-arrival; outside that band the unfixed tree can pass R2 by
 *     accident, so the trial proves nothing and is retried.
 *   - CLOCK FIDELITY, in the seat pacing used to hold: every rendered
 *     frame carried the frame the driver paid for (`clockVerdict`, the
 *     oracle's own, imported). A trial the page did not take from the
 *     injected clock is excluded and counted, never asserted on —
 *     exactly as a stalled trial was. What is gone is the criterion that
 *     could be spoiled by the machine being busy.
 * The gate needs MIN_VALID valid trials out of MAX_ATTEMPTS; if the
 * machine cannot produce them it FAILS AS UNMEASURABLE rather than
 * passing over a blind spot.
 *
 * RED-PROOF: run against a tree without the fix (e.g. --origin= a served
 * checkout of the pre-fix HEAD): R1 and R2 both go red at mid-band
 * departure. Recorded in docs/code-health/evidence/
 * 2026-08-21-elegance-run-01/epilogue-race/. R3's own red-proof is a served
 * tree carrying `terrain.setAmount(bed)` (one float for both roles) —
 * recorded in .../hero-wrap-entry/gate-redproof.txt. R4's is a served tree
 * carrying the pre-#31 `journey/ui/copy-arrival.js` (envelope clock free-
 * running behind the gate, shelf ratcheting over it) — recorded in
 * .../hero-wrap-entry/gate-redproof-r4.txt.
 *
 * Usage: node tools/test-epilogue-retire.mjs [--origin=http://...]
 * With no --origin it starts its own serve.py on a free port.
 * ==================================================================== */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* THE RIG, NOT A SECOND COPY OF IT. `VT_INJECT` is the pre-load clock
 * swap and `clockVerdict` is the trust criterion that stands where p95
 * pacing used to; both live in tools/tempo-oracle.mjs, which is a gated
 * subject of tools/test-instrument-layer.mjs (`TO-P`, nine mutants) at
 * position 2 of every `npm run check`. Importing them means the mutant
 * that stops the driver advancing the clock reds this gate's rig too. */
import { DEFAULT_CONTRACT, VT_INJECT, clockVerdict } from './tempo-oracle.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const arg = (k, d) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${k}=`));
  return hit === undefined ? d : hit.slice(k.length + 3);
};

const RETIRE_SPAN = 0.62;        // mirrors journey/chapters/final/index.js
const R1_MAX_DOWN_STEP = 0.10;   // one-frame uAmount drop across the arm
const R2_MIN_FRACTION = 0.80;    // of RETIRE_SPAN x wrap duration
/* (1 - uSoilOn) * bed, the buried colony's leak through the occluder's
 * stipple holes. Shipped-unfixed it is (1 - bed) * bed and peaks at 0.25;
 * with SOIL_LEAD = 0.20 (journey/chapters/final/index.js) it is bounded by
 * SOIL_LEAD / 4 = 0.05. 0.08 sits clear of both, so the gate is red on the
 * fault and cannot go red on a lead tightened or loosened by a little. */
const R3_MAX_LEAK = 0.08;
/* R4 (report #31, 2026-08-26): the hero's copy entrance, measured on the lap
 * these trials already fire. Shipped-unfixed, the rail's hero gate opened at
 * 2.47 s of a 3.87 s lap with the wrap envelope only 3% spent behind it, and
 * the arrival SHELF then swept the words 0 -> 0.8 in 185-192 ms with a worst
 * single frame of 0.185-0.199 (3/3 clean trials). Fixed: 1432 ms and 0.0147.
 * 700 ms sits 3.7x above the fault and 2x below the fix; 0.08 is 2.3x under
 * the fault and, on the injected 16.667 ms frame this suite now issues, 3.6x
 * above the fixed envelope's steepest possible frame (smootherstep's
 * 1.875/dur peak slope x 0.016667 s = 0.022 at dur 1.43 s). NEITHER NUMBER
 * MOVED IN THE CLOCK MIGRATION — only their margin did, and it widened: the
 * old derivation had to allow for the 50 ms pacing limit the wall-clock trial
 * enforced, and an exact frame is 3x tighter than that worst case. */
const R4_MIN_ENTRANCE_MS = 700;
const R4_MAX_PAINT_STEP = 0.08;
/* R5 (report #36, 2026-08-26): ONE clause, over the ordinary return to the
 * intro that this trial now makes after its wrap. Shipped-unfixed, the rail's
 * position-authored gate opened across about three frames and the arrival
 * shelf came in with it — a 0.4161 single frame on this trigger, and 0.4587
 * on a continuous wheel stream. Fixed (the performed floor in
 * journey/constants/copy.js's HERO_COPY_ARRIVAL_S): 0.0152. 0.05 is 8x under
 * the fault and 3.3x above the fix, and it is a statement in the gate's own
 * terms about the floor itself: the fixed worst frame IS the floor's ceiling
 * (0.016667 / 1.10 = 0.01515), so HERO_COPY_ARRIVAL_S cannot be loosened past
 * a third of a second's worth of pacing without coming here to say so.
 *
 * THERE IS NO DURATION CLAUSE, AND THAT IS A MEASURED DECISION rather than an
 * omission. R4 has one because on the wrap the fault WAS a short entrance
 * (185 ms against 1431). Here it is not: the first cut of R5 carried
 * `entrance >= 400 ms` beside the step, and the red-proof showed the unfixed
 * tree passing it — 1333 ms on BOTH trees, because on this approach the paint
 * begins creeping up under a slowly-rising gate at 517 ms and only THEN jumps
 * 0.42 in one frame. A pop in the middle of a long rise is still a pop, and a
 * duration is blind to it. The clause could not be driven red, so it is not an
 * assertion; the figure is still printed on every trial. */
const R5_MAX_PAINT_STEP = 0.05;
/* [0.35, 0.85]: mid-arrival enough that the UNFIXED tree is red on R1 at
 * the band's top (arm step 1 - smoothstep(0.85/1.12) = 0.13 > 0.10) and on
 * both R1 and R2 lower down — while the FIXED tree passes at any pull by
 * construction. Above 0.85 a trial proves nothing and is retried. */
const PULL_LO = 0.35, PULL_HI = 0.85;
const MAX_ATTEMPTS = 8;
const MIN_VALID = 2;

const CHROME = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean).find((c) => existsSync(c));

async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/* ---- in-page trial (serialised) -------------------------------------- *
 * THE DRIVER OWNS THE CLOCK. `tick(n)` pays for n frames of the page's
 * timeline and waits for n real rAFs; nothing here waits on `setTimeout`,
 * because a timeout is a wall-clock instrument and a busy machine is
 * allowed to be late for it. Every `await` below is denominated in frames
 * the driver issued, so what the page did is the same on any host.
 * ---------------------------------------------------------------------- */
async function runTrial({ contract }) {
  const J = window.journey;
  const S = J.hero;
  const FRAME = contract.frameMs;
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const tick = async (n = 1) => { for (let i = 0; i < n; i++) { window.__vt.now += FRAME; await raf(); } };

  const finalG = J.chapters.final.group;
  let uPull = null;
  const uAmounts = [];
  finalG.traverse((o) => {
    const u = o.material && o.material.uniforms;
    if (!u) return;
    if (u.uPull && !uPull) uPull = u.uPull;
    if (u.uAmount && !uAmounts.some((e) => e.u === u.uAmount)) uAmounts.push({ u: u.uAmount });
  });
  if (!uPull || uAmounts.length < 3) return { error: 'final uniforms not found' };

  /* R3's pair, found by the coupling itself rather than by traverse order:
     the slab is the ONLY uSoilOn in the chapter, and `bed` is the uAmount the
     strokes standing on that slab's own terrain group actually carry. Read
     that way, a re-ordered scene graph cannot silently point the assertion at
     the wrong float. */
  let soilU = null, soilGroup = null;
  finalG.traverse((o) => {
    const u = o.material && o.material.uniforms;
    if (u && u.uSoilOn && !soilU) { soilU = u.uSoilOn; soilGroup = o.parent; }
  });
  let bedU = null;
  if (soilGroup) {
    soilGroup.traverse((o) => {
      const u = o.material && o.material.uniforms;
      if (u && u.uAmount && !u.uSoilOn && !bedU) bedU = u.uAmount;
    });
  }
  if (!soilU || !bedU) return { error: 'soil slab / bed uniform pair not found' };

  const rows = [];
  let sampling = true;
  S.addAnimator('zz-epilogue-retire-gate', (t, dt) => {
    if (!sampling) return;
    const f = S.frame();
    const ph = f && f.transitionPhase;
    /* R4's channels. `copyDebug` is one atomic read of the copy authorities
       the same rAF used, so gate and paint cannot be sampled a frame apart. */
    const cd = J.ui.copyDebug;
    rows.push({
      /* VIRTUAL ms, read off the clock the driver is paying into — not
         `performance.now()`, which under VT_INJECT returns the same number
         but reads to a stranger as wall time. `dt` is what the SPINE
         published for this frame, and is the whole evidence that the spine
         took the injected frame rather than a wall one; `clockVerdict`
         judges it. */
      t: window.__vt.now,
      dt: +dt.toFixed(6),
      kind: ph ? ph.kind : '',
      pull: uPull.value,
      amt: uAmounts.map((e) => e.u.value),
      vis: finalG.visible ? 1 : 0,
      soilOn: soilU.value,
      bed: bedU.value,
      heroGate: cd ? cd.heroGate : -1,
      heroPaint: cd ? cd.heroPaint : -1,
    });
  });

  /* ONE NOTCH PER FRAME, which is the only rate a driver that owns the
     clock can honestly deliver: the wheel is dispatched, then the frame it
     is meant to be seen on is paid for. The wall-clock trial fired 16
     notches at a 10 ms timer and let the machine decide how many frames
     that landed across — the same gesture read as a different gesture on a
     different host. */
  const wrapNow = () => {
    const f = S.frame();
    return !!(f && f.transitionPhase && f.transitionPhase.kind === 'wrap');
  };
  const burst = async (n, dy) => {
    for (let i = 0; i < n; i++) {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, deltaMode: 0, cancelable: true, bubbles: true }));
      await tick(1);
      /* Stop ON the wrap frame. The wall-clock trial ran the whole burst
         out and read `pullAtWrap` afterwards, which was tolerable only
         because the machine decided how long that was; a driver that owns
         the clock would be choosing to read the departure pull sixteen
         frames into the retire. */
      if (wrapNow()) return true;
    }
    return false;
  };

  // Park just past the pierce; the driver holds that pose's small
  // camera-pure pull. The gesture into the rest then arrives through the
  // real limiter with most of the ladder still dark, and the continued
  // stream fires the wrap mid-arrival.
  /* LAND, THEN ASK AGAIN — and that is what makes this measurable on a QUIET
     machine (report #32, 2026-08-26). One unbroken stream from p 0.87 reaches
     the last rest and then cannot wrap, forever: the arrival wall
     (`answeredP`) is set at every delivering landing and the resolution's own
     `intent` is not free, so the wrap block refuses. Measured on a calm host,
     25 consecutive bursts sat at p 0.97 and never fired, and the shipped
     trigger printed "wrap never fired" on 5 of 5 attempts. It used to fire
     only because CONTENTION broke the stream for it — the load-direction trap
     MEASUREMENT-STATE.md names, living in the TRIGGER rather than in the
     fault, and the reason this gate's red-proof stayed owed.

     So the gesture is now two gestures, which is also what a visitor does:
     stream into the rest, let it land, then stream again. The HOLD is the
     whole calibration and it buys the departure pull directly.

     IT IS NOW COUNTED IN FRAMES, NOT MILLISECONDS, and that is the one
     calibration the clock migration moved. Under the wall clock the hold was
     a `setTimeout` and the machine decided how many frames of arrival ladder
     it covered — measured on a quiet host, 400 ms -> pull 0.512, 900 ms ->
     0.673, 1500 ms -> 0.864, and on a busy one those readings were whatever
     the busy machine felt like. The driver now pays for the hold, so it is
     the same hold everywhere: LAND_HOLD_FRAMES frames of no wheel, i.e. the
     ladder advances exactly that far. Re-measured under the injected clock on
     2026-08-26, on this tree, while the machine carried the owner's ordinary
     desktop (load average 124 at the sweep) — and the readings are
     DETERMINISTIC, identical to 4 dp across repeats, which the wall-clock
     hold never was:

         hold 12 frames (200 ms) -> pull 0.554    42 frames (700 ms)  -> 0.736
              24 frames (400 ms) -> 0.631         60 frames (1000 ms) -> 0.802
              30 frames (500 ms) -> 0.667         90 frames (1500 ms) -> 0.903 (out of band)

     24 is chosen: it lands at 0.631, inside [0.35, 0.85] with room on both
     sides, and it reproduces the 0.546-0.623 departure the recorded
     red-proofs were taken at — so the evidence on disk and the gate that
     ships still describe the same wrap. `pullAtWrap` is asserted into that
     band regardless, so a tree whose ladder is re-timed is EXCLUDED rather
     than believed: the calibration is not load-bearing for a verdict. */
  const LAND_HOLD_FRAMES = 24;   // 400 ms of the arrival ladder, paid for
  const BURST_GAP_FRAMES = 9;    // the release between asks; ~140 ms, as before
  const SETTLE_FRAMES = 150;     // the park, off the wheel; 2500 ms as before
  const TAIL_FRAMES = 390;       // 6500 ms of lap, as before
  J.scrollTo(0.87);
  await tick(SETTLE_FRAMES);
  let fired = wrapNow();
  for (let tries = 0; tries < 20 && !fired && J.scroll.progress < 0.965; tries++) {
    fired = await burst(16, 260);
  }
  if (!fired) await tick(LAND_HOLD_FRAMES);
  for (let tries = 0; tries < 40 && !fired; tries++) {
    fired = await burst(16, 260);
    if (!fired) await tick(BURST_GAP_FRAMES);
  }
  const pullAtWrap = uPull.value;
  await tick(TAIL_FRAMES);

  /* R5's gesture — THE ORDINARY RETURN, on the page this trial already has.
     The lap above lands at the intro's rest, so the visitor is standing
     exactly where the report is about: wheel down out of the intro, pause,
     wheel back up into it. One notch per paid frame, the same convention as
     `burst`. A second suite for this would have been a second browser, a
     second serve.py and a second wrap to get here; the arrival is three
     hundred frames past one this file already fires.

     `reMark` is the frame the RETURN begins on — everything R5 reads is
     after it, so the wrap's own entrance (R4's subject, and still on screen
     as a settled 1.0 when this starts) cannot be mistaken for it. */
  const RE_LEAVE_P = 0.14;      // clear of the gate's whole docking span
  const RE_PAUSE_FRAMES = 60;   // 1000 ms parked away from the intro
  const RE_TAIL_FRAMES = 300;   // 5000 ms for the arrival to finish breathing
  const stream = async (dy, frames, done) => {
    for (let i = 0; i < frames; i++) {
      window.dispatchEvent(new WheelEvent('wheel',
        { deltaY: dy, deltaMode: 0, cancelable: true, bubbles: true }));
      await tick(1);
      if (done()) return true;
    }
    return false;
  };
  await stream(260, 400, () => J.scroll.progress >= RE_LEAVE_P);
  await tick(RE_PAUSE_FRAMES);
  const leftP = J.scroll.progress;
  const reMark = window.__vt.now;
  await stream(-260, 400, () => J.scroll.progress <= 0.0005);
  await tick(RE_TAIL_FRAMES);

  sampling = false;
  return { fired, pullAtWrap, rows, reMark, leftP, backP: J.scroll.progress,
    hidden: document.hidden };
}

/* ---- trial verdict ---------------------------------------------------- */
function judge(res) {
  if (res.error) return { valid: false, why: res.error };
  if (!res.fired) return { valid: false, why: 'wrap never fired' };
  const { rows } = res;
  const iw = rows.findIndex((r) => r.kind === 'wrap');
  if (iw < 1) return { valid: false, why: 'no wrap frame sampled' };
  const wrapT = rows[iw].t;
  const lastWrap = rows.map((r) => r.kind).lastIndexOf('wrap');
  const wrapDurS = Math.max(0.5, (rows[lastWrap].t - wrapT) / 1000);
  /* CLOCK FIDELITY, where p95 pacing stood. The oracle's own verdict, over
     the WHOLE trial rather than the lap alone — a frame the page did not
     take from the injected clock is a frame outside this instrument's
     control wherever it falls, and the settle is where a boot-time stall
     would land. A trial that cannot show it reports no figure (D63). */
  const clock = clockVerdict({ rows, hidden: res.hidden }, DEFAULT_CONTRACT);
  if (!clock.trusted) {
    return { valid: false, why: `clock untrusted — ${clock.causes.join('; ')}` };
  }
  if (res.pullAtWrap < PULL_LO || res.pullAtWrap > PULL_HI) {
    return { valid: false, why: `wrap departed at pull ${res.pullAtWrap.toFixed(3)} (need ${PULL_LO}..${PULL_HI})` };
  }

  // R1: no one-frame uAmount down-step over the arm (frames iw-1 .. iw+3)
  let worstDown = 0;
  for (let k = iw; k < Math.min(rows.length, iw + 4); k++) {
    for (let j = 0; j < rows[k].amt.length; j++) {
      const d = rows[k - 1].amt[j] - rows[k].amt[j];
      if (d > worstDown) worstDown = d;
    }
  }
  const r1ok = worstDown <= R1_MAX_DOWN_STEP;

  // R2: the driver reaches 0 no sooner than the fraction of the window
  const windowMs = RETIRE_SPAN * wrapDurS * 1000;
  let zeroMs = null;
  for (let k = iw; k < rows.length; k++) {
    if (rows[k].pull === 0) { zeroMs = rows[k].t - wrapT; break; }
  }
  const r2ok = zeroMs !== null && zeroMs >= R2_MIN_FRACTION * windowMs;

  /* R3: the occluder leads the light it hides. Every frame the chapter is
     drawing, on the whole trial rather than only the lap — the retire crosses
     the band either way, and a leak parked outside the wrap window would be
     the same defect. `bedSeen` is reported so a trial that never lit the bed
     at all cannot look green by having nothing to say. */
  let worstLeak = 0, leakAt = null, bedSeen = 0;
  for (const r of rows) {
    if (!r.vis) continue;
    if (r.bed > bedSeen) bedSeen = r.bed;
    const leak = (1 - r.soilOn) * r.bed;
    if (leak > worstLeak) {
      worstLeak = leak;
      leakAt = { bed: +r.bed.toFixed(3), soilOn: +r.soilOn.toFixed(3),
        msFromWrap: Math.round(r.t - wrapT) };
    }
  }
  const r3ok = bedSeen >= 0.5 && worstLeak <= R3_MAX_LEAK;

  /* R4: the hero's entrance is spent where it can be seen. This lap IS the
     down-wrap of report #31, so the assertion rides it rather than paying for
     a second wrap of its own. Two clauses, one law: the entrance takes an
     entrance's worth of time, and no single frame carries a jump of it.

     THE WINDOW ENDS AT R5's MARK, and that boundary is what keeps the two
     laws separable. Until report #36 this loop ran to the last row because
     the last row was the end of the wrap's own tail; the trial now continues
     into an ordinary return, and a #36 fault landing in R4's numbers would
     report the wrong mechanism and take R4 red for something R4 does not
     govern. `iRe` is the first frame of that return, so R4 reads exactly the
     rows it always read. */
  const iRe = Number.isFinite(res.reMark)
    ? rows.findIndex((r) => r.t >= res.reMark) : -1;
  const iR4End = iRe > iw ? iRe : rows.length;
  let heroGoMs = null, hero80Ms = null, heroPaintMax = 0;
  let worstPaintStep = 0, paintStepAt = null;
  for (let k = iw; k < iR4End; k++) {
    const p = rows[k].heroPaint;
    if (p > heroPaintMax) heroPaintMax = p;
    if (heroGoMs === null && p > 0.001) heroGoMs = Math.round(rows[k].t - wrapT);
    if (hero80Ms === null && p >= 0.8) hero80Ms = Math.round(rows[k].t - wrapT);
    const d = p - rows[k - 1].heroPaint;
    if (k > iw && d > worstPaintStep) {
      worstPaintStep = d;
      paintStepAt = { ms: Math.round(rows[k].t - wrapT),
        from: +rows[k - 1].heroPaint.toFixed(3), to: +p.toFixed(3),
        gate: +rows[k].heroGate.toFixed(3) };
    }
  }
  const entranceMs = (heroGoMs !== null && hero80Ms !== null)
    ? hero80Ms - heroGoMs : null;
  const r4ok = heroPaintMax >= 0.8 && entranceMs !== null
    && entranceMs >= R4_MIN_ENTRANCE_MS && worstPaintStep <= R4_MAX_PAINT_STEP;

  /* R5: the ORDINARY return to the intro is performed too. Same two figures
     as R4, read over the return gesture instead of the lap. The trial must
     actually have LEFT the intro and come back for this to mean anything —
     `leftP` past the gate's whole docking span and `backP` at the rest — so a
     trial that never got out of the intro is EXCLUDED rather than believed. */
  let reGoMs = null, re80Ms = null, rePaintMax = 0;
  let reWorstStep = 0, reStepAt = null;
  if (iRe > iw) {
    for (let k = iRe; k < rows.length; k++) {
      const p = rows[k].heroPaint;
      if (p > rePaintMax) rePaintMax = p;
      if (reGoMs === null && p > 0.001) reGoMs = Math.round(rows[k].t - res.reMark);
      if (re80Ms === null && p >= 0.8) re80Ms = Math.round(rows[k].t - res.reMark);
      const d = p - rows[k - 1].heroPaint;
      if (k > iRe && d > reWorstStep) {
        reWorstStep = d;
        reStepAt = { ms: Math.round(rows[k].t - res.reMark),
          from: +rows[k - 1].heroPaint.toFixed(3), to: +p.toFixed(3),
          gate: +rows[k].heroGate.toFixed(3) };
      }
    }
  }
  const reEntranceMs = (reGoMs !== null && re80Ms !== null)
    ? re80Ms - reGoMs : null;
  if (iRe <= iw || !(res.leftP >= 0.13) || !(res.backP <= 0.0015)) {
    return { valid: false,
      why: `the return gesture did not run (left at ${res.leftP}, back at ${res.backP})` };
  }
  const r5ok = rePaintMax >= 0.8 && reWorstStep <= R5_MAX_PAINT_STEP;

  return {
    valid: true,
    pullAtWrap: +res.pullAtWrap.toFixed(3),
    dtMin: clock.dtMin, dtMax: clock.dtMax, frames: clock.frames,
    wrapDurS: +wrapDurS.toFixed(2),
    worstDown: +worstDown.toFixed(4),
    zeroMs: zeroMs === null ? null : Math.round(zeroMs),
    windowMs: Math.round(windowMs),
    worstLeak: +worstLeak.toFixed(4), leakAt, bedSeen: +bedSeen.toFixed(3),
    heroGoMs, hero80Ms, entranceMs, heroPaintMax: +heroPaintMax.toFixed(3),
    worstPaintStep: +worstPaintStep.toFixed(4), paintStepAt,
    leftP: +res.leftP.toFixed(3), backP: +res.backP.toFixed(4),
    reGoMs, re80Ms, reEntranceMs, rePaintMax: +rePaintMax.toFixed(3),
    reWorstStep: +reWorstStep.toFixed(4), reStepAt,
    r1ok, r2ok, r3ok, r4ok, r5ok,
    pass: r1ok && r2ok && r3ok && r4ok && r5ok,
  };
}

async function main() {
  if (!CHROME) { console.log('FAIL epilogue-retire — no Chrome executable'); process.exit(1); }

  let origin = arg('origin', '');
  let server = null;
  if (!origin) {
    const port = await freePort();
    server = spawn('python3', ['serve.py'], {
      cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
    });
    origin = `http://127.0.0.1:${port}`;
    await new Promise((r) => setTimeout(r, 800));
  }

  const { chromium } = await import(
    join(ROOT, 'node_modules/playwright-core/index.mjs'));
  const browser = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--use-angle=metal'],
  });

  const verdicts = [];
  let valid = 0, passed = 0;
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && valid < MIN_VALID; attempt++) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      /* BEFORE THE DOCUMENT LOADS, so THREE.Clock reads the injected
         `performance.now` from the very first frame. Anything installed
         after boot would leave the spine's first seconds on wall time,
         which is the half-measure this migration exists to avoid. */
      await ctx.addInitScript(VT_INJECT);
      const page = await ctx.newPage();
      let consoleErrors = 0;
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
      await page.goto(origin, { waitUntil: 'load' });
      await page.waitForFunction(
        () => window.journey && window.journey.scroll && window.journey.scroll.enabled,
        null, { timeout: 90000 });
      /* No wall-clock settle here any more. Under the injected clock the
         page's timeline does not advance until the driver pays for it, so a
         `waitForTimeout` would buy nothing but wall seconds; the trial's own
         SETTLE_FRAMES is the settle, and it is the same settle everywhere. */
      const res = await page.evaluate(runTrial, { contract: DEFAULT_CONTRACT });
      const v = judge(res);
      v.consoleErrors = consoleErrors;
      verdicts.push(v);
      if (v.valid) {
        valid++;
        if (v.pass) passed++;
        console.log(`  trial ${attempt}: pull@wrap ${v.pullAtWrap}  clock ${v.dtMin}..${v.dtMax}s over ${v.frames} frames  `
          + `R1 worstDown ${v.worstDown} ${v.r1ok ? 'ok' : 'FAIL'}  `
          + `R2 zero ${v.zeroMs}ms of window ${v.windowMs}ms ${v.r2ok ? 'ok' : 'FAIL'}  `
          + `R3 leak ${v.worstLeak} (bed ${v.leakAt ? v.leakAt.bed : '-'}, soil `
          + `${v.leakAt ? v.leakAt.soilOn : '-'}, bedSeen ${v.bedSeen}) ${v.r3ok ? 'ok' : 'FAIL'}  `
          + `R4 entrance ${v.entranceMs}ms (paint ${v.heroGoMs}->${v.hero80Ms}ms, max `
          + `${v.heroPaintMax}), worst frame ${v.worstPaintStep} ${v.r4ok ? 'ok' : 'FAIL'}  `
          + `R5 return ${v.reEntranceMs}ms (paint ${v.reGoMs}->${v.re80Ms}ms, max `
          + `${v.rePaintMax}, left ${v.leftP} back ${v.backP}), worst frame `
          + `${v.reWorstStep} ${v.r5ok ? 'ok' : 'FAIL'}`);
      } else {
        console.log(`  trial ${attempt}: excluded — ${v.why}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  const excluded = verdicts.filter((v) => !v.valid).length;
  if (valid < MIN_VALID) {
    console.log(`FAIL epilogue-retire — UNMEASURABLE: only ${valid}/${MIN_VALID} valid trials `
      + `(${excluded} excluded). No verdict is not a green.`);
    process.exit(1);
  }
  if (passed < valid) {
    /* Name the law the red trials actually broke — the two live here are
       different faults that happen to share a lap. */
    const red = verdicts.filter((v) => v.valid && !v.pass);
    const laws = [];
    if (red.some((v) => !v.r1ok || !v.r2ok)) {
      laws.push('A retire fitted to the full band is a step and a rush wearing a schedule.');
    }
    if (red.some((v) => !v.r3ok)) {
      laws.push('An occluder and the light it hides must not share one scalar '
        + 'unless they share one meaning.');
    }
    if (red.some((v) => !v.r4ok)) {
      laws.push('An entrance choreography must be scheduled from the moment its '
        + 'surface can be seen — an envelope run behind a closed gate spends its '
        + 'animation where nobody is, and hands the audience a pop.');
    }
    if (red.some((v) => !v.r5ok)) {
      laws.push('An arrival priced in a coordinate the visitor crosses at a speed '
        + 'of their own choosing is not a beat — a performance is owed a floor '
        + 'in seconds, and an entrance the gesture can outrun is a pop.');
    }
    console.log(`FAIL epilogue-retire — ${valid - passed}/${valid} valid trials red. `
      + laws.join(' '));
    process.exit(1);
  }
  console.log(`PASS epilogue-retire — ${valid} valid mid-arrival wraps: arm continuous, `
    + `window spent, occluder ahead of the buried colony, hero entrance spent in `
    + `view, ordinary return performed (${excluded} excluded).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
