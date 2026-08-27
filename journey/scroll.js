// Virtual scroll surface for the journey (GB-3.1, GB-3.2, GB-3.4).
//
// WHY VIRTUAL, not a native scroll spacer:
//   * the hero page is `overflow: hidden` and must stay that way - adding a
//     spacer changes document height, can mint a scrollbar, and therefore
//     changes the canvas aspect the hero regression screenshot was taken at;
//   * OrbitControls never competes for these gestures: in journey mode the
//     organism's input policy (organism.js setInputPolicy, M5 — replacing
//     the old DOM event shield) turns off user orbit/zoom/pan at the
//     source, so this window-level capture listener sees every delta and
//     nothing downstream claims it;
//   * soft snap magnetism has to be able to move the position at any moment.
//     Fighting native momentum scrolling with window.scrollTo() is the
//     classic way to get a stuttering, non-reversible scrub.
//
// The model is scrubbed travel: a virtual position v (in px) maps piecewise
// linearly onto journey progress p through the per-chapter allocations in
// constants.js. Every input is a delta on v; nothing is ever a discrete step
// to a chapter, so the path is reversible at any point and at any speed.
//
// THE CLOCK THIS FILE READS IS SKEWED, and it never un-skews. Every
// `performance.now()` below (`sinceInputMs`, the stall bank, `lastFrameAt`,
// the boot replay's `bootNow`) runs on a clock that organism/intro.js's
// fast-forward pushes forward by ~8.3 s in production and then deliberately
// leaves there — its header says why un-skewing is worse. It stays monotonic, so
// the DIFFERENCES this file takes are all sound. What breaks is mixing
// sources: a `performance.now()` compared against an event's `timeStamp`, a
// `Date.now()`, or any stamp minted before the intro finished is off by the
// skew. main.js's boot input capture already had to route around this by
// staying on `e.timeStamp`. Take differences on one clock; never compare two.

// CHAPTERS and SEGMENTS are NO LONGER IMPORTED HERE. They were read by the
// road and by nothing else in this file, so the whole route-array dependency
// left with it (A05a) — which is the cleanest single piece of evidence that
// the seam A05 measured is the real one. They are `journey/road.js`'s imports
// now; `REST_STOPS` and `TERMINAL_P` are the anchors the policy still needs.
import {
  REST_STOPS, TERMINAL_P,
  transitSeconds, desktopTransitCapSeconds, forwardBrakeTailSeconds,
} from './route.js';
import { NOSNAP } from '../flags.js';
import { createRoad } from './road.js';
import { createTransport } from './transport.js';
import { ownerOf, modalLive, targetOwnsKey } from './ownership.js';
import {
  SNAP_ENGAGE_MS, ARRIVAL_HOLD_MS, SNAP_K, SNAP_BAND, SNAP_DEAD_P,
  COMMIT_THRESHOLD, COMMIT_CARRY_RATE, COMMIT_CARRY_PEAK_VH, COMMIT_GLIDE_PX, COMMIT_BLEND_K,
  COMMIT_STREAM_GAP_MS, COMMIT_STREAM_MIN, COMMIT_CRUISE_MAX_PX,
  COMMIT_GLIDE_MAX_S, COMMIT_BRAKE_TAIL_S, COMMIT_BACK_CAP_VH,
  WHEEL_LINE_PX, TOUCH_GAIN, KEY_STEP_PX, MAX_SCRUB_RATE, SMOOTH_K, STALL_FRAME_MS,
} from './constants.js';
// The freshness half of the manual-input claim, named beside the thresholds
// above rather than inlined, and carrying its own rationale (boundaries.md
// §A.9). `journey/constants.js` would be its natural home; it belongs to a
// concurrent lane, so the claim's type, threshold and port live together in
// ./claim.js instead. Declared in the slice README.
import {
  MANUAL_CLAIM_FRESH_MS, manualClaim, publishInputPort,
} from './claim.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

// Capability, not width: an iPad can be wider than a small laptop, but the
// user explicitly wants touch/mobile pacing left alone. Reading `.matches`
// when the band is built also follows a convertible changing input mode.
const DESKTOP_PACING = typeof matchMedia === 'function'
  ? matchMedia('(hover: hover) and (pointer: fine)')
  : null;

/* ==========================================================================
   INPUT OWNERSHIP lives in ./ownership.js — the registration policy
   (`claimInput`/`releaseInput`/`ownerOf`/`modalLive`) and the controls-first
   key semantics (`targetOwnsKey` and its helpers), along the seam that block
   declared for itself: "Nothing below this block touches the snap/commit
   model, the scroll->p spline, or any threshold. This is routing only."

   `claimInput` and `releaseInput` stay importable FROM THIS MODULE: two
   production modules and three tool suites name `./scroll.js` for them, and
   the public entry contract is this file's wherever the code sits.
   ========================================================================== */
export { claimInput, releaseInput } from './ownership.js';

export function createScrollModel({ onIntent = null, onWrap = null } = {}) {
  /* ========================================================================
     THE ROAD — the pure, clock-free pixel<->route mapping — is ./road.js.
     `segLens`, `kx`, `ky`, `km`, `invX`, `invY` and the four functions over
     them (`buildSpline`, `pAt`, `scrollFor`, `lengthAtP`) are all there.

     `measure()` did NOT move — it writes `v` and `carry`, which are the
     visitor's surface. Its middle is now `road.resize(h)`, and the height
     stays a caller-side read (see `measure()` below).

     WHY `total` IS STILL A BINDING HERE. It is a READ-ONLY MIRROR of
     `road.total`, not a second source of truth: `measure()` copies it in the
     one place that has ever assigned it, immediately after the one call that
     can change it, and nothing else in this file writes it. Four sites read
     it — `measure()`, `push()`, `slopeAtP()` and `update()`. One of those is
     `push()`, which `tools/test-road.mjs` `E4` pins BYTE-IDENTICAL to base
     commit 6967a36, so rewriting the reads to `road.total` reds a live pin
     for a reason that has nothing to do with `push()`. `E1` pins the mirror's
     single writer and `E2` that it equals `road.total` after every rebuild,
     so it cannot silently drift.
     ======================================================================== */
  const road = createRoad();
  const { pAt, scrollFor, lengthAtP } = road;
  let total = 0;        // read-only mirror of road.total — see the note above
  let v = 0;            // virtual scroll position, px — the visitor's own
                        // surface: the exact running sum of their deltas.
  let lastInput = -1e9; // performance.now() of the last manual input
  /* TIME THE MAIN THREAD WAS BLOCKED SINCE THE LAST DELTA (2026-08-13).
     A FRAME THE SITE SPENT RENDERING IS NOT THE VISITOR PAUSING, and the
     idle constants cannot tell the two apart on their own: Chrome coalesces
     wheel events to about one per frame for a non-passive listener, so — as
     ARRIVAL_HOLD_MS's own derivation says — "the delivered spacing of a
     continuous gesture is the SITE'S OWN FRAME TIME, whatever the device
     emits". The constant is therefore a statement about frame time, and when
     frame time spikes the delivered gap spikes with it and a gesture that
     never stopped is read as one that did.
       f2bd1cd measured that as a 0.055% tail and accepted it. The scroll loop
     then made it systematic: the wrap's own frame is the most expensive on
     the site (placeAt's two dt = 0 applyFrame passes, every seam re-armed,
     the destination chapter's geometry touched, a 4 s blend armed, and then
     that frame still has to render the destination world), so the flick that
     wrapped reliably had its NEXT delta land outside the window — dropping
     the arrival wall and buying a second section with the same gesture.
     Measured on R5, the battery's hardest flick (18 frames x 240 px):
     `fling past last -> 0.259988` instead of `0.000000` on roughly half of
     runs, i.e. Final -> Mission -> Inspire on one gesture. b0227bd's
     guarantee, lost to the site's own cost.
       So the idle clock stops while the thread is blocked. Only the EXCESS
     over a generous frame budget is discounted, so an ordinary frame
     contributes exactly nothing and every measured constant keeps its
     meaning; a visitor who genuinely stops still crosses ARRIVAL_HOLD_MS and
     SNAP_ENGAGE_MS at exactly the same wall-clock moment, because no time
     is discounted unless a frame actually overran.
       OBSERVED FROM WHICHEVER CALLBACK RUNS FIRST. Input normally precedes rAF,
     so push() can see the overrun of the frame in flight. On a cold-load frame,
     however, Chrome can run rAF first and deliver the coalesced wheel event
     afterward; overwriting lastFrameAt there used to erase the stall and turn
     one flick's tail into an apparent pause/new gesture. `stallBank` preserves
     overruns reported by update() until the next input. `stallClaimed` records
     how much of the current frame push() already saw, so the following update
     banks only the remainder rather than counting the same blocked frame twice. */
  let lastFrameAt = -1e9;
  let stallBank = 0;     // blocked ms observed since the last delivered input
  let stallClaimed = 0;  // portion of the current frame already banked/consumed
  let backgroundGap = typeof document !== 'undefined' && document.hidden;
  let lastDir = 0;      // sign of the last manual delta (+1 fwd / -1 back / 0 none)
  let enabled = false;

  /* ---- the controller's state (see `update`) ---------------------------
     p is the DISPLAYED progress — the number the camera reads. It used to be
     computed one module downstream, by smoothing pAt(v) a second time in
     journey/state.js, and that is where the stop came from: a first-order lag
     has no velocity state, so the moment its target stopped moving the rate on
     screen decayed to zero on its own. Here the rate IS state, so nothing
     about stopping the input can make it collapse. */
  let p = 0;            // displayed progress
  // Is the RESOLUTION the thing moving the picture this frame — i.e. is the
  // machine carrying the visitor rather than the visitor's own finger? True
  // only when the glide's drive term actually beats the servo, which is the
  // distinction a chapter with a camera-paced reveal needs: an intent EXISTS
  // through most of a live gesture, so `resolving` would arm a reveal limiter
  // over ordinary brisk scrolling (chapters/final/index.js says what that cost
  // the first time it was tried). See the `gliding` getter.
  let driving = false;
  let vel = 0;          // p/s, the rate on screen this frame. It is not
                        // integrated and never needs to be: it is the max of
                        // two CONTINUOUS terms (the scrub servo and the
                        // resolution's floor), so it is continuous wherever
                        // they are, and they cross exactly where they are
                        // equal. Continuity is a property of the expression,
                        // not of a seed anyone has to remember to set.
  let gPeak = 0;        // SURFACE px/s, SIGNED high-water mark of inRate this
                        // gesture — THE GESTURE'S STRENGTH. Its peak and never
                        // its last value: a momentum tail's final delta is its
                        // smallest by construction, so the rate at release is
                        // the same whether the flick was hard or feeble, and
                        // every earlier fix that read it was reading a corpse.
                        //
                        // PX, NOT p (2026-08-11, Hannah: "scrolling back from
                        // Final to Owned is far slower than forward"). The
                        // p-rate was the local spline slope times the finger,
                        // and the slope at the two ends of a re-allocated span
                        // is not the same number: measured at the shipped
                        // route, 15,460 px/p leaving the Owned rest forward
                        // against 143,670 px/p leaving the Final rest backward
                        // — the identical finger measured 9x weaker one way.
                        // A brisk backward flick peaked 0.018 p/s, under the
                        // 0.02 carry floor, so backward gestures were never
                        // credited as flicks, and the resolution answered them
                        // with a glide BACK to the rest they were leaving. The
                        // gesture is now measured in the visitor's own unit —
                        // the pixels they scrolled — and converted to p at the
                        // RESOLUTION SPAN'S mean slope where it is spent
                        // (pickTarget / the intent latch), so both directions
                        // of one span read one finger identically.
  let inRate = 0;       // surface px/s, EMA of THE VISITOR'S OWN rate, measured
                        // on the input clock in push() — see there for why not
                        // here
  let gapEma = 0;       // ms, EMA of this gesture's inter-delta spacing
  let gCount = 0;       // deltas in this gesture — with gapEma, the stream test
  // A touch contact collected before attach has an exact physical boundary
  // but only one aggregate sample. Its real travel proves the same stream
  // shape that several delivered touchmoves normally prove; its real elapsed
  // time still supplies the rate. This flag is boot-handoff-only and retires
  // with the gesture like every other shape measurement.
  let bootTouchQualified = false;
  let gSerial = 0;      // WHICH gesture. A resolution is armed by one gesture
                        // and can outlive it: these transitions are seconds
                        // long (a 2500 px/s flick on the Mission span measures
                        // 3.4 s), so the visitor can easily begin a second
                        // gesture while the first one's move is still flying.
                        // "One gesture buys one transition" has to mean the
                        // gesture that ARMED this resolution — spending
                        // whatever gPeak happens to be current at the arrival
                        // would eat the newer gesture's strength and answer it
                        // with the older gesture's destination.
  // Wheel/trackpad has no wheelstart event, so remember the SHAPE of its pulse.
  // A momentum tail falls away from its peak; a second physical push begins a
  // new acceleration ramp. This is only used to separate a repeat that starts
  // before the idle clock can see it — it never contributes motion or strength.
  let wheelPeak = 0;
  let wheelTrough = Infinity;
  let wheelPrev = 0;
  let wheelPrevDelta = 0;
  let wheelRise = 0;
  let wheelTail = false;
  let wheelQuiet = false;
  // The initiating wheel sample replayed after a synchronous intro boot and
  // Chrome's delayed tail are one physical gesture. While that first ask is
  // still in flight, do not reinterpret the tail as a rapid repeat merely
  // because boot/render stalls changed its delivered shape. A real pause,
  // reversal, or the first landing releases this boot-only guard.
  let bootGuardDir = 0;
  let bootGuardSerial = -1;
  let bootGuardReason = 'inactive';
  let intent = null;    // the latched resolution:
                        // { target, lo, hi, dir, floor, cruise|null }
  let answeredP = null; // THE ANCHOR THIS GESTURE HAS ALREADY BEEN ANSWERED AT
  let answeredDir = 0;  // (2026-08-12, Hannah: "sometimes when I scroll into
                        // Owned it shifts left as if immediately progressing to
                        // the next section. Any way to make it settle there
                        // unless the user has done an additional scroll?")
                        //
                        // One gesture buys one transition. That invariant used
                        // to be enforced in exactly one place — spending gPeak
                        // when the resolution LANDED on its target — and that
                        // place was unreachable in the case that needed it. The
                        // landing ran only while the resolution was the faster
                        // of the two terms, and it stops being the faster the
                        // moment the visitor's own surface passes the anchor:
                        // the brake is |target - p| * SNAP_K while the servo is
                        // (surf - p) * SMOOTH_K, so with surf past the target
                        // the servo wins by construction, all the way in. The
                        // controller then took the undriven branch, p sailed
                        // THROUGH the rest with the gesture's strength intact,
                        // and the momentum tail — deltas the finger stopped
                        // producing a second ago — re-earned gPeak within one
                        // frame and bought the next section too. Measured at
                        // the shipped route: crossing Owned at t = 1.550 s with
                        // gPeak zeroed, and gPeak back to 1875 px/s at t =
                        // 1.567 s against a 1763 px/s carry threshold — 1.06x,
                        // which is why it was intermittent.
                        //
                        // So the anchor a gesture is answered at becomes a WALL
                        // on the surface until the visitor moves again, and the
                        // gesture cannot be credited with a flick until they
                        // do. What counts as moving again is a PAUSE of
                        // ARRIVAL_HOLD_MS, a reversal, or a placement. That
                        // pause was SNAP_ENGAGE_MS (160 ms) as first shipped
                        // and is now 90 ms (2026-08-12, Hannah: "the current
                        // pause is too noticeable... it should feel like a
                        // subtle interaction threshold"); the constant carries
                        // the measurement that sets the floor, and dropWall()
                        // carries why only the wall may come down that early.
                        // Distance already scrolled is not banked against the
                        // next section: the driven landing has always absorbed
                        // its surplus this way (`ns` clamped, then folded), and
                        // this only extends that to the case where the servo
                        // happens to be the faster term.
  let carry = 0;        // p the RESOLUTION has contributed on top of v. Held
                        // apart from v, rather than written into it every
                        // frame, for one reason: scrollFor() is a sampled
                        // inverse of the spline, so p -> px -> p is lossy at
                        // ~1e-4, and a per-frame round-trip accumulates that
                        // into real drift — measured, an out-and-back inside
                        // one gesture came back 2.6e-3 short, an order of
                        // magnitude more than the model's actual contribution.
                        // v therefore stays the visitor's exact delta sum and
                        // the surface is v PLUS this, folded back exactly once
                        // when the resolution ends.

  // ?nosnap=1 disables commit-resolution entirely (restores the band-limited
  // W3-A soft snap) so ?p= deep-scrub QA can park at arbitrary positions.
  // (parsed once, in ../flags.js — THE flag registry)

  /** Re-lay the road for the current viewport and keep the visitor where
   *  they were on it.
   *
   *  THE VIEWPORT READ STAYS HERE, deliberately (design.md §4.4, D9,
   *  A05 D-A05-1). `road.resize()` takes the height as a parameter, so the
   *  road module reads no viewport at all and J02/U05 have nothing in it to
   *  unify into `frame.viewport`.
   *
   *  The order of these five statements is load-bearing: `keepP` must be
   *  sampled off the OLD road, `carry` cleared because it has just been
   *  folded into `keepP`, and `v` re-derived off the NEW one. That is why
   *  `measure()` did not move — `v` and `carry` are the surface, not the
   *  road, and A05 measured them as the only non-road state it writes. */
  function measure() {
    const h = Math.max(320, window.innerHeight);
    const keepP = total > 0 ? clamp01(pAt(v) + carry) : 0;
    carry = 0;
    road.resize(h);
    total = road.total;
    v = scrollFor(keepP);
  }

  /* ---------------- input ---------------- */
  /** Begin a fresh gesture: forget everything measured about the last one. */
  function newGesture() {
    gapEma = 0; gCount = 0; gPeak = 0; inRate = 0;
    bootTouchQualified = false; gSerial++;
    resetWheelPulse();
    // ...and the wall, which a reversal or a placement always clears outright.
    // A PAUSE clears it far sooner than this — see dropWall().
    dropWall();
  }

  /** RELEASE THE ARRIVAL WALL. Split out of newGesture() on 2026-08-12: the
   *  wall was being held for SNAP_ENGAGE_MS because that was the only idle
   *  constant in the model, and 160 ms of enforced stillness reads as the site
   *  having stopped responding rather than as a threshold. The wall's whole
   *  duty is to tell a gesture that never stopped from one that did, and
   *  ARRIVAL_HOLD_MS is the measured floor for that and nothing else.
   *
   *  Deliberately the ONLY boundary the short window changes. An in-flight
   *  resolution has no answered wall yet, so its gPeak, stream measurement and
   *  gSerial keep their SNAP_ENGAGE_MS semantics; its speed floor therefore
   *  cannot collapse under a delta in the 90-160 ms window. Once the resolution
   *  HAS landed, however, releasing its wall must also retire that answered
   *  gesture. Keeping the old gCount/inRate/gPeak there lets a browser-delayed
   *  momentum tail reuse the first gesture's stream credit and buy the next
   *  section. The input path therefore calls restartGesture() at an answered
   *  wall once the input type has proved a fresh ask: it rebases the absorbed
   *  surface at the visible anchor, clears stale measurements, and applies the
   *  arriving delta as sample one of the new gesture. Wheel input additionally
   *  needs a full idle or a genuine raw-delta re-acceleration; a coalesced
   *  momentum tail cannot prove a second ask on the short pause alone.
   *    · an in-flight resolution has no wall to release, so the short boundary
   *      leaves gSerial untouched. It is still ANSWERED by the gesture that
   *      armed it when it lands (b0227bd part 3); a frame hitch cannot disarm
   *      the arrival while it is travelling.
   *  The surplus the wall absorbed stays absorbed: it lives in `carry` as a
   *  negative offset against v, so releasing the clamp moves nothing on its
   *  own — there is still nothing banked to jump. */
  function dropWall() { answeredP = null; answeredDir = 0; }

  /** Milliseconds since the last manual input. THE ONE PLACE this subtraction
   *  and its clock read exist: the `sinceInput` getter and claimNow() below
   *  both call it, so the semantic question and the QA number can never come
   *  to disagree about what "since" means — and design.md §12's clock-read
   *  count for this file does not move, because nothing was added. */
  function sinceInputMs() { return performance.now() - lastInput; }

  /** IS THE VISITOR'S HAND ON THIS MOTION RIGHT NOW?  -> ManualClaim
   *
   *  THE DECISION PORT (boundaries.md §A.8/§A.9, J04a-3). This is the answer
   *  journey.js's blendCancelled() has been assembling for itself out of two
   *  raw diagnostic getters and a threshold that lived nowhere in this file:
   *
   *      scroll.sinceInput < 50 && scroll.answeredAt === null
   *
   *  Both halves are the model's own state, so the model is where the question
   *  gets answered. A consumer asks; it never reads a clock, a wall, or a
   *  direction to find out. `null` and `{dir}` are discriminated, so there is
   *  no scalar to truthiness-test and `dir === 0` cannot be mistaken for "no
   *  claim" (J-H2) the way `answeredAt === 0` — the Mission anchor — can be
   *  mistaken for "no wall".
   *
   *  THE WALL HALF is dropWall()'s, above, and unchanged: input the model is
   *  currently REFUSING is not the visitor taking control, it is the gesture
   *  that asked for this move still finishing. THE FRESHNESS HALF is
   *  MANUAL_CLAIM_FRESH_MS, relocated into ./claim.js with the whole of the
   *  reasoning that bought it.
   *
   *  CALL IT WHERE THE QUESTION IS ASKED, ONCE PER SITE, AND NEVER HOIST IT.
   *  The clock read is here, at the caller's instant, exactly as `sinceInput`
   *  reads it today from blendCancelled()'s own two sites — of which at most
   *  ONE runs on any frame (boundaries.md §A.8's five-row table; endCamBlend
   *  nulls chapterEntry on the drop path). Evaluating this once at the top of
   *  applyFrame and reusing it therefore MOVES the read on the camBlend-falsy
   *  path, across the whole cancellation block. That is design.md §12's class
   *  of change, and the frozen-clock harness cannot see it. */
  function claimNow() {
    const fresh = sinceInputMs() < MANUAL_CLAIM_FRESH_MS;
    if (!fresh) return null;
    if (answeredP !== null) return null;
    return manualClaim(lastDir);
  }

  function clearBootGuard(reason = 'cleared') {
    if (bootGuardDir) bootGuardReason = reason;
    bootGuardDir = 0;
    bootGuardSerial = -1;
  }

  /** Start another ask without letting unprocessed tail deltas through the wall.
   *  Ordinarily update() has already balanced every refused delta with `carry`.
   *  Two input bursts can, however, arrive inside one render frame. Rebase an
   *  answered surface to its wall before releasing it so only the NEW sample
   *  moves; keep an in-flight resolution as-is because there is no wall yet. */
  function restartGesture() {
    if (answeredP !== null) {
      v = scrollFor(answeredP);
      carry = answeredP - pAt(v);
    }
    clearBootGuard('new-input-boundary');
    newGesture();
  }

  function resetWheelPulse(rate = 0, delta = 0) {
    wheelPeak = rate;
    wheelTrough = rate || Infinity;
    wheelPrev = rate;
    wheelPrevDelta = delta;
    wheelRise = 0;
    wheelTail = false;
    wheelQuiet = false;
  }

  /** Does this wheel sample begin a second physical pulse before the idle clock
   *  can separate it from the first one?
   *
   *  A single flick is allowed to accelerate once and then decay. Only after
   *  it has fallen well off its peak do we look for a sustained, substantial
   *  acceleration ramp. That keeps an uneven momentum tail retired at the
   *  arrival wall, while a fast repeat gets a new gSerial soon enough that the
   *  first resolution cannot spend it when it lands. Rate makes the strength
   *  comparison tolerant of timing variation; a matching raw-delta rise keeps
   *  a post-coalescing tail from impersonating that second pulse. */
  function wheelPulseRestart(rate, delta, idleGapMs, stallDiscountMs) {
    if (!wheelPeak) { resetWheelPulse(rate, delta); return false; }

    wheelPeak = Math.max(wheelPeak, rate);
    if (!wheelTail && rate <= wheelPeak * 0.65) {
      wheelTail = true;
      wheelTrough = rate;
      wheelRise = 0;
    }

    let restart = false;
    if (wheelTail) {
      if (rate < wheelTrough) wheelTrough = rate;
      // Require the delivered delta to rise too. After a coalesced quiet gap,
      // normalising its accumulated sample by the long interval makes the
      // next ordinary tail sample look like a huge rate rebound even while
      // its raw deltas are still monotonically decaying. A deliberate second
      // push ramps in both measures; a momentum tail does not.
      const rising = rate > wheelPrev * 1.12 && delta > wheelPrevDelta * 1.12;
      wheelRise = rising ? wheelRise + 1 : 0;
      // A second acceleration hump inside one uninterrupted trackpad stream is
      // still the SAME gesture. Require a short VISITOR quiet beat (after the
      // frame-stall discount) before the rebound; continued decay without one
      // clears any older candidate. The threshold is deliberately below
      // ARRIVAL_HOLD_MS, so a rapid deliberate repeat remains immediate rather
      // than waiting for the arrival wall.
      // A coalesced post-stall sample can still leave > one normal frame after
      // discount, and its raw-gap-normalised rate becomes an artificial trough.
      // Do not let a site-owned long frame supply the quiet beat as well.
      const quiet = idleGapMs > STALL_FRAME_MS
        && stallDiscountMs < STALL_FRAME_MS;
      if (quiet) wheelQuiet = true;
      else if (!rising) wheelQuiet = false;
      const gain = rate - wheelTrough;
      const rebound = rate >= wheelTrough * 1.75 && gain >= 0.35;
      const decisive = rate >= wheelTrough * 2.5 && gain >= 0.9;
      const firstAskStillOwnsArrival = answeredP !== null
        || (intent && intent.g === gSerial);
      restart = firstAskStillOwnsArrival && wheelQuiet && rebound
        && (wheelRise >= 2 || decisive);
    }
    wheelPrev = rate;
    wheelPrevDelta = delta;
    return restart;
  }

  /** How much of the interval ending at `now` was the main thread overrunning
   *  a frame rather than the visitor waiting (see lastFrameAt). */
  function stallOf(now) {
    if (lastFrameAt < 0) return 0; // attach has not established a frame epoch
    // Duration cannot distinguish a long visible compile from a tab that was
    // suspended. Visibility can: visible frame work is entirely site-owned,
    // however long it takes; a hidden/resumed interval is genuine gesture idle
    // and must never be forgiven into a continuation.
    if (backgroundGap || (typeof document !== 'undefined' && document.hidden)) return 0;
    const inFlight = now - lastFrameAt;
    if (inFlight <= STALL_FRAME_MS) return 0;
    return inFlight - STALL_FRAME_MS;
  }

  /** Bank only the newly observed part of this frame's overrun. The bank stays
   *  live across later ordinary rAFs so both update()'s idle test and the next
   *  input gap discount the same site-owned time. */
  function bankStall(now) {
    const observed = stallOf(now);
    const fresh = Math.max(0, observed - stallClaimed);
    stallBank += fresh;
    stallClaimed = observed;
    return stallBank;
  }

  function push(dpx, kind, repeat = false, { exactContact = false } = {}) {
    if (!enabled) return;
    // An open detail state consumes the first scroll intent: travel resumes
    // only once the frame is clear (GB-3.6).
    if (onIntent && onIntent(kind) === false) {
      const consumedAt = performance.now();
      if (backgroundGap || (typeof document !== 'undefined' && document.hidden)) newGesture();
      bankStall(consumedAt); stallBank = 0; lastInput = consumedAt;
      backgroundGap = false;
      return;
    }
    const now = performance.now();
    const resumedFromBackground = backgroundGap
      || (typeof document !== 'undefined' && document.hidden);
    // ...discounting whatever of that interval the main thread spent blocked
    // in a frame that overran (see lastFrameAt). Exactly zero whenever the
    // frame in flight is inside its budget, which is every ordinary frame.
    const rawGapMs = Math.max(0, now - lastInput);
    const stallDiscountMs = bankStall(now);
    const gapMs = Math.max(0, rawGapMs - stallDiscountMs);
    let restartedAtAnsweredWall = false;
    // THE INTERACTION THRESHOLD. For discrete inputs a pause this long is the
    // "additional scroll" the arrival is waiting for. A wheel momentum stream
    // can itself contain that pause after event coalescing, so wheel requires
    // either the full gesture timeout here or wheelPulseRestart's independent
    // raw-delta re-acceleration proof below.
    /* A boot-flush stall is uniquely dangerous here: Chrome can deliver the
       initiating sample, spend seconds compiling/building, then deliver the
       SAME physical wheel tail. The generic idle clock discounts most of that
       site time, but its residual cannot prove a second physical gesture. A
       boot-primed stream therefore ignores the time-only boundary until its
       first landing. Before then, only wheelPulseRestart's quiet + decay +
       re-acceleration shape (with zero stall discount), an exact touch contact,
       or a reversal can prove a new ask. */
    if (resumedFromBackground) {
      clearBootGuard('background');
      newGesture();
    }
    else if (gapMs > ARRIVAL_HOLD_MS && !bootGuardDir && !exactContact
        && answeredP !== null && (kind !== 'wheel' || gapMs > SNAP_ENGAGE_MS)) {
      // Rebase before releasing an answered wall so the old gesture's refused
      // tail and rate cannot leak into the new ask (restartGesture handles both
      // in that order). Wheel reaches here only after the full idle timeout.
      restartGesture();
      restartedAtAnsweredWall = true;
    }
    // Deltas further apart than SNAP_ENGAGE_MS are not one gesture by the
    // model's own definition of idle: start the measurement over rather than
    // average across the pause, so a flick is only ever as strong, and only
    // ever as much of a stream, as ITS OWN deltas make it.
    if (!resumedFromBackground && !restartedAtAnsweredWall && gapMs > SNAP_ENGAGE_MS
        && !bootGuardDir && !exactContact) newGesture();
    if (kind !== 'wheel') resetWheelPulse();
    gapEma = gapEma ? gapEma + (gapMs - gapEma) * 0.35 : (gCount ? gapMs : 0);
    gCount++;
    lastInput = now;
    stallBank = 0;
    backgroundGap = false;
    if (dpx) {
      const dir = dpx > 0 ? 1 : -1;
      if (bootGuardDir && dir !== bootGuardDir) clearBootGuard('reversal');
      // A turn mid-stream is a new gesture: the strength of the half you have
      // abandoned must not be spent on the half you are now making. The first
      // delta of a touch contact is exempt because onTouchMove has already
      // minted that exact physical gesture immediately before calling push().
      const atTouchBoundary = kind === 'touch' && touchFresh;
      if (dir !== lastDir && !resumedFromBackground && !atTouchBoundary) {
        newGesture(); gCount = 1;
      }
      else if (kind === 'wheel' && !repeat) {
        // There is no standard wheelstart event. Infer only the one shape a
        // passive momentum tail cannot produce: a pronounced re-acceleration
        // after it has already decayed. This lets a rapid second trackpad push
        // cross the arrival immediately even when its gap is under 90 ms.
        // Use the PHYSICAL event gap, uncapped: gapMs deliberately subtracts a
        // frame stall for the idle model, but Chrome coalesces the delta across
        // that full frame. Dividing that larger delta by the discounted/capped
        // interval fabricates the exact acceleration this test is looking for.
        const rate = Math.abs(dpx) / Math.max(8, rawGapMs || 8);
        const delta = Math.abs(dpx);
        const pulseRestart = wheelPulseRestart(rate, delta, gapMs, stallDiscountMs);
        // During the cold-boot guard, timing alone is not evidence: require
        // both the pulse shape and a completely stall-free interval. Outside
        // boot this is the unchanged desktop repeat rule.
        const provenBootRepeat = bootGuardDir && pulseRestart
          && stallDiscountMs === 0;
        if (pulseRestart && (!bootGuardDir || provenBootRepeat)) {
          if (bootGuardDir) clearBootGuard('wheel-repeat');
          restartGesture();
          resetWheelPulse(rate, delta);
          gCount = 1;
        }
      }
      if (atTouchBoundary) touchFresh = false;
      lastDir = dir;
      // Apply the sample only after a fresh-pulse rebase. Otherwise two wheel
      // events delivered inside one rAF would release the first gesture's
      // not-yet-clamped tail along with the second physical push.
      v = Math.max(0, Math.min(total, v + dpx));
      /* THE GESTURE'S OWN RATE, measured HERE — on the input clock, from the
         deltas, and from nothing else.
           * not from the servo or the surface: a running resolution ADDS to
             the surface, so reading the rate there feeds the model's own
             motion back into the number that sets the model's speed. Measured
             while building this, a steady 40-delta drag ran 9% long on that
             loop alone. It is the same trap 90920fa hit from the other side,
             where the model's backward glide was read as a forward flick;
           * not per FRAME: the deltas arrive on the input clock, so dividing a
             frame's worth by that frame's own dt makes the estimate jitter
             with the frame timer, and the high-water mark below records the
             jitter rather than the gesture — measured at 7-23% above the rate
             the visitor was actually sustaining, which lengthened every drag
             by that much. Each delta divided by its OWN gap has no such term.
         The first delta of a gesture is skipped: its gap belongs to whatever
         came before, so a lone notch measures zero and is not a flick.

         Measured in SURFACE PX (the applied delta — clamped at the route's
         ends, so leaning on an edge measures zero), not in p: the p-rate
         carried the local spline slope inside it, which is what made one
         finger read 9x weaker leaving the Final rest backward than leaving
         the Owned rest forward (see gPeak above). No clamp here — the old
         clampRate bounded the p-rate; the px peak is bounded where it is
         SPENT (the cruise clamp, the brake, and the final clampRate on
         vel), and the carry test only asks "at least", where an outlier
         high reading is indistinguishable from a hard fling. */
      // A held key auto-repeats as DISCRETE STEPS, not a delta stream. The
      // ~30-50 ms repeat gap is far under the gesture gap, so the OS repeat
      // clock would otherwise read as a stream and build gPeak fling-class
      // strength, tripping commit-carry like a fling. A lone step contributes
      // zero flick credit (the first-delta skip below), so zeroing the peak —
      // and the EMA it is drawn from — keeps a held key judged purely by
      // position, exactly like a notch-by-notch reader.
      if (repeat) { gPeak = 0; inRate = 0; }
      else if (gCount > 1 && gapMs > 0) {
        // A boot-collected touch delta is an aggregate of one exact contact,
        // not a callback delivered late. Its full physical duration is the
        // denominator; capping it to the generic idle window would fabricate
        // a faster swipe. Ordinary input keeps the shipped cap unchanged.
        // A wheel callback delivered after a visible frame overrun commonly
        // coalesces the deltas generated across that WHOLE interval. The idle
        // model discounts site-owned stall time, but the rate measurement must
        // not: dividing the aggregate by the discounted sliver fabricates a
        // fling and lets the post-stall tail roll through another arrival.
        // This is the same physical-clock rule wheelPulseRestart uses above.
        const coalescedWheel = kind === 'wheel' && stallDiscountMs > 0;
        const sampleGapMs = coalescedWheel
          ? rawGapMs
          : (exactContact ? gapMs : Math.min(gapMs, SNAP_ENGAGE_MS));
        const gs = sampleGapMs / 1000;
        /* THE RAW DELTA, NOT THE APPLIED ONE (2026-08-12, the loop). This read
           the APPLIED delta — clamped at v = 0 and v = total — so that leaning
           on a dead edge measured zero. With the route closed into a loop
           those two positions are the only places the clamp ever bites, and
           they are no longer dead: they are where the wrap happens. Measuring
           the applied delta there would make the wrap the one transition the
           visitor could never build enough gesture for, which is the opposite
           of the threshold parity it is supposed to have. Everywhere else on
           the route the two numbers are the same number. */
        const inst = dpx / gs;
        inRate += (inst - inRate) * Math.min(1, gs * SMOOTH_K);
        if (inRate * dir > gPeak * dir) gPeak = inRate;
      }
      // CONTROL RETURNS WITHIN ONE FRAME. A delta against a latched resolution
      // drops it on the spot. A NEWER gesture going the same way is NOT a
      // second ask (owner report #26, 2026-08-26): it rides out the flight it
      // arrived into and is spent at that landing, so there is nothing to
      // remember here. This branch used to latch `repeatAnchor` for the queue;
      // both are gone — see the resolution step and the arrival block.
      //
      // A CONTACT THAT HAS NOT TRAVELLED YET HAS NOT SAID WHICH WAY IT IS
      // GOING (see contactSettling), AND THIS CONJUNCT IS DEFECT-02's FIX —
      // still load-bearing, and the one "two flicks buy one section" case that
      // is a genuine defect rather than the design. A finger settling onto the
      // glass routinely gives a pixel or two the wrong way before it gives the
      // flick, and read as a reversal that settle dropped the in-flight
      // resolution and armed a BACKWARD return against the visitor's own
      // forward flick — measured at 430x932: 2 px of settle, latched target
      // 0.5230 -> 0.2600 for one frame, the second flick then spent re-arming
      // the leg the first one had already bought, and two deliberate forward
      // flicks delivered one section NET. Without the conjunct the settle
      // still destroys the first flick's leg, which is why it stays: it
      // protects a leg already bought, and buys no extra one.
      if (intent && dir !== intent.dir && !contactSettling(kind)) {
        releaseIntent();
      }
    }
  }

  /** Drop the latched resolution and hand the surface back to the visitor at
   *  exactly the displayed position, so the scrub resumes from what they can
   *  see rather than from wherever the raw surface had been left. */
  /** Fold the resolution's accumulated contribution into the virtual surface.
   *  Exactly one spline round-trip per resolution, at the moment it ends. */
  function fold() {
    if (!carry) return;
    v = scrollFor(clamp01(pAt(v) + carry));
    carry = 0;
  }

  /** Drop the latched resolution and hand the surface back to the visitor. */
  function releaseIntent() { fold(); intent = null; }

  let touchY = null;
  let touchOwned = false;   // this gesture began inside a registered owner
  let touchPending = false; // contact exists, but has not moved yet
  let touchFresh = false;   // first non-zero delta after the exact boundary
  let touchTravel = 0;      // delivered surface px in this contact
  let touchStartedAt = 0;
  function beginTouchContact(y, startedAt, owned = false) {
    touchOwned = !!owned;
    touchY = !touchOwned && Number.isFinite(y) ? y : null;
    touchPending = touchY !== null;
    touchFresh = false;
    touchTravel = 0;
    touchStartedAt = Number.isFinite(startedAt) ? startedAt : performance.now();
  }

  function moveTouchContact(y, { exactContact = false } = {}) {
    if (!enabled || touchOwned || touchY === null || !Number.isFinite(y)) return false;
    const d = (touchY - y) * TOUCH_GAIN;
    touchY = y;
    if (d && touchPending) {
      // Unlike wheel, touch gives us an exact physical gesture boundary. Do
      // this on the first MOVE rather than touchstart so a tap cannot retire a
      // resolution that was already in flight. A quick second swipe is a new
      // ask even when it starts before either idle window; advancing the serial
      // here prevents the first arrival from spending the second swipe.
      const resumedFromBackground = backgroundGap;
      restartGesture();
      backgroundGap = false;
      lastInput = touchStartedAt;
      if (resumedFromBackground) {
        lastFrameAt = touchStartedAt;
        stallBank = 0;
        stallClaimed = 0;
      }
      touchPending = false;
      touchFresh = true;
    }
    touchTravel += Math.abs(d);
    /* A touch contact is already a physically bounded gesture, so event count
       is not what distinguishes it from a wheel notch. Under mobile WebGL
       load Safari/Chrome may coalesce a whole fast swipe into 1-3 touchmoves;
       requiring COMMIT_STREAM_MIN delivered callbacks then throws away the
       swipe even though its distance and rate are intact. Once this contact
       has travelled one discrete-step's worth, credit only the missing SHAPE
       samples. Distance and rate remain entirely real: a tap/jitter stays
       below this gate, and one contact still buys only one transition. */
    if (d && touchTravel >= KEY_STEP_PX && gCount < COMMIT_STREAM_MIN - 1) {
      gCount = COMMIT_STREAM_MIN - 1;
      gapEma = 0;
    }
    push(d, 'touch', false, { exactContact });
    if (exactContact && touchTravel >= KEY_STEP_PX) bootTouchQualified = true;
    return true;
  }

  /** IS THIS CONTACT STILL LANDING RATHER THAN TRAVELLING? The model already
   *  draws exactly this line, one function up and for exactly this reason:
   *  KEY_STEP_PX is where moveTouchContact stops calling a contact "a
   *  tap/jitter" and starts crediting it as a swipe. Nothing new is declared
   *  here — the same threshold, the same meaning, now also answering the one
   *  other question that must not be decided from a landing sample: which way
   *  is this contact going. Below it, a contact may not reverse a resolution
   *  it did not arm; at or above it, it reverses on that very delta, so a hard
   *  backward flick (one 130 px sample is already past the gate) is answered
   *  as immediately as it always was, and a slower one within a step's worth
   *  of travel. Wheel and key input are not contacts and never settle. */
  function contactSettling(kind) {
    return kind === 'touch' && touchY !== null && touchTravel < KEY_STEP_PX;
  }

  function endTouchContact() {
    touchY = null; touchOwned = false; touchPending = false;
    touchFresh = false; touchTravel = 0;
  }

  /** Is a live touch contact the JOURNEY's to feed? The transport asks before
   *  it preventDefault()s a touchmove, which is why this is a predicate on the
   *  contact rather than a check inside moveTouchContact: a contact that began
   *  inside a registered owner must scroll natively, so the event must reach
   *  the browser untouched. Same three terms, same order, as the guard that
   *  opened onTouchMove before J04a split the transport out. */
  function touchContactLive() {
    return enabled && !touchOwned && touchY !== null;
  }

  /* The DOM event handlers and their window listener registrations live in
     journey/transport.js (J04a). It gets exactly these ten capabilities and no
     other view of the model — see that file's header for the seam. */
  const transport = createTransport({
    enabled: () => enabled,
    push,
    jump,
    beginTouchContact,
    moveTouchContact,
    endTouchContact,
    touchContactLive,
    ownerOf,
    modalLive,
    targetOwnsKey,
  });

  /** Home / End: TRAVEL to a named anchor (not placement — the picture rides
   *  the whole way, at the scrub limiter, exactly as a very long scroll would).
   *
   *  The destination is latched as the resolution up front, and that is not
   *  decoration. The incremental rule reads the DISPLAYED position, so left to
   *  itself it would re-decide every frame of the trip and, for the first third
   *  of it, correctly conclude that the nearest thing in the visitor's
   *  direction is the rest they just left — and pull back to it. (The old model
   *  never met this because it resolved from the raw SURFACE, which a jump
   *  moved instantly, so the question never arose. Measured on the way in:
   *  End from p = 0 travelled 0.002 and came home.) Latching the destination
   *  states the intent once, which is what a jump means. */
  function jump(target, kind) {
    if (onIntent && onIntent(kind || 'jump') === false) return;
    const from = v;
    v = scrollFor(target);
    lastDir = v > from ? 1 : v < from ? -1 : lastDir;
    carry = 0;
    clearBootGuard('jump');
    newGesture();
    const now = performance.now();
    bankStall(now); stallBank = 0; lastInput = now;
    backgroundGap = false;
    const dir = target > p ? 1 : target < p ? -1 : 0;
    // floor stays nominal: the servo is at the limiter and outruns it the whole
    // way, so this only ever supplies the SNAP_K landing.
    intent = dir === 0 ? null : (() => {
      const lo = Math.min(p, target), hi = Math.max(p, target);
      const band = glideBand(lo, hi, dir);
      return { target, dir, from: p, g: gSerial, band,
        cruisePx: band.nominal, floorPx: band.nominal, lo, hi,
        snapK: brakeK(band, lo, hi, dir) };
    })();
  }

  /* ================= RESOLUTION + MOTION: ONE CONTROLLER =================

     Hannah: "as soon as you've gone past the point where you're leaving the
     current section, it should snap-scroll to the next one... you can get
     stuck in no man's land. That shouldn't be possible." And then, three
     fixes later: "it still slows down when you don't have enough momentum in
     your scroll to reach the next section — it stops and starts again."

     THE STOP WAS ARCHITECTURAL. The model used to be two motions in series
     with a gap between them: a scrub, then — after an idle window — a commit
     glide that took over. Everything the visitor saw came from journeyState
     smoothing pAt(v) through a first-order lag, and a first-order lag holds no
     velocity: its output rate is k * (target - shown), so the instant the
     surface stopped moving the rate on screen decayed as e^(-k t) toward zero.
     The wait was therefore not neutral. It was a scheduled deceleration, run
     before every single commit, and no property of the glide that followed
     could undo it — measured, a moderate flick went 81 px/s -> 8 px/s across
     the window, then climbed back to 76. Stop, pause, restart.

     Three fixes tried to buy that back and all three missed for one shared
     reason: each was denominated in the rate at the LAST DELTA of the gesture,
     and on a real trackpad the last delta is the smallest one of the momentum
     tail, by construction. Measured peak vs last-delta rate, milli-p/s:
     weak flick 30/12, mid 109/19, hard 305/31. A fling and a dribble hand over
     the same number, so the early-handoff gate (needing 0.02) mostly never
     opened, the flick-carry test (needing 0.04) fired at random, and the
     "carry the release rate" cruise clamped every transition to nominal. All
     three repairs were live code that real input could not reach.

     SO THERE IS NO HANDOFF ANY MORE, because there are no longer two motions.

     One controller runs every frame. It owns the DISPLAYED position p and its
     rate `vel`, and it eases nothing into anything: each frame it picks ONE
     desired rate, as the faster of two terms along the resolution's direction,

         desired = max( servo , floor )

     where `servo` is the classic first-order pull toward the visitor's own
     virtual surface — the scrub, with the same SMOOTH_K and the same limiter
     it always had, unchanged and still exact — and `floor` is the speed the
     resolution insists on. These are two terms of one max, not two modes: they
     cross over at the instant they are EQUAL, so the moment control passes
     from the gesture to the transition is, by construction, the moment at
     which doing so changes the on-screen rate by nothing at all. Velocity
     continuity is a property of the structure. There is no constant to tune
     for it and no way to regress it.

     The second half of the fix is WHEN the floor exists. A resolution that
     runs the visitor's own way is armed WHILE THE GESTURE IS STILL RUNNING —
     as soon as position or the stream rule says where this is going — and its
     floor is the gesture's own peak rate. That floor can never outrun the
     finger (it is a high-water mark of what the finger already did), and it
     means the momentum tail's decay is simply never displayed: the tail falls
     below the floor and the floor holds the speed. Waiting for the tail to
     finish, as every previous version did, was waiting for the only thing
     worth continuing to disappear.

     A resolution that OPPOSES the visitor is the one case that still waits out
     SNAP_ENGAGE_MS, and should: there is nothing to continue, the move has to
     turn around, and a rate that must change sign has to pass through zero.
     After the stream rule below, that case is reached only from a genuine
     near-standstill — a wheel notch, a placement — where a "stop" is a
     standing start and not an interruption.

     WHICH rest, unchanged in intent (pickTarget):
       travelling forward:  the next rest once >= COMMIT_THRESHOLD of the span
                            is behind you, OR the gesture was a stream going
                            that way (flick-carry); else back;
       travelling backward: mirrored (the rest being LEFT is the upper one);
       no direction yet (programmatic placement): nearest rest.

     The landing is unchanged and still overshoot-free by construction: the
     toward-target rate is capped by the critically-damped SNAP_K pull and the
     step can never pass the target, so arrival is asymptotic — no overshoot,
     no bounce, ever, and SNAP_DEAD_P settles exactly on the anchor.

     p = 1 is a resolution anchor too (the authored end-hold): a fling to the
     end must settle where it landed, never be tugged back to the Final rest. */
  // Every declared rest stop on the route is a resolution anchor (route.js —
  // a chapter adding a mid-leg stop is picked up here with no edits).
  const ANCHORS = REST_STOPS;
  const RESOLVE_P = [...ANCHORS, TERMINAL_P].filter((a, i, arr) => i === 0 || a > arr[i - 1] + 1e-6);

  /** The pair of resolution anchors bracketing p. */
  function bracketAt(q) {
    let lo = RESOLVE_P[0], hi = RESOLVE_P[RESOLVE_P.length - 1];
    for (let i = 0; i < RESOLVE_P.length - 1; i++) {
      if (q >= RESOLVE_P[i] && q <= RESOLVE_P[i + 1]) {
        lo = RESOLVE_P[i]; hi = RESOLVE_P[i + 1]; break;
      }
    }
    return [lo, hi];
  }

  /** A span's mean slope, p per surface px — THE conversion between the
   *  gesture's own unit (the pixels the visitor scrolled, gPeak) and the p
   *  the resolution spends. One number per span, identical from both ends,
   *  which is the whole point: the local slope at a span's two rests can
   *  differ 9x (the Owned/Final re-allocation), and every threshold that was
   *  denominated in the LOCAL p-rate silently asked one direction for 9x the
   *  finger. Uniform-allocation spans have spanSlope ~= local slope, so their
   *  behaviour is unchanged. */
  function spanSlope(lo, hi) {
    const d = scrollFor(hi) - scrollFor(lo);
    return d > 1e-6 ? (hi - lo) / d : 0;
  }

  /** dp/dpx where the visitor actually IS — the spline's LOCAL gain, not a
   *  span average. This is what makes the glide road-denominated: a px/s cruise
   *  converts to p/s here, every frame, so the rate follows the road the way a
   *  scrubbing finger already does. A span average would re-introduce exactly
   *  the defect this replaces at one level up, because the whole point of
   *  `segVh`/`shape` is that the gain is deliberately NOT uniform across a leg
   *  (route.js). Two-sided difference so the value is centred on the sample;
   *  8 px is well inside the inverse table's resolution and comfortably above
   *  its quantisation. */
  function slopeAtP(q) {
    const x = scrollFor(q), h = 8;
    const a = Math.max(0, x - h), b = Math.min(total, x + h);
    return b - a > 1e-6 ? (pAt(b) - pAt(a)) / (b - a) : 0;
  }

  /** The px/s band a resolution across [lo, hi] may cruise in.
   *  `nominal` is the floor a gentle gesture is lifted to, `ceil` the cap a
   *  fling is held under — both raised, if necessary, to the rate that finishes
   *  this leg inside COMMIT_GLIDE_MAX_S, so one gesture can never buy a ride
   *  longer than a transition. */
  function glideBand(lo, hi, dir = 0) {
    const spanPx = Math.abs(scrollFor(hi) - scrollFor(lo));
    // A DECLARED TRANSIT wins outright (route.js TRANSIT_S): this span is
    // authored to take a stated number of seconds rest to rest, so its nominal
    // IS that speed rather than the global floor. The ceiling still allows a
    // hard fling to beat it — a declared transit is the natural velocity, not a
    // speed limit — but every ordinary released gesture lands on the number.
    // `dir` is the travel direction in p: a transit declared as {fwd, back}
    // (route.js, 2026-08-17) answers differently by direction.
    const declared = transitSeconds(lo, hi, dir);
    if (declared) {
      const rate = spanPx / declared;
      return { nominal: rate, ceil: Math.max(COMMIT_CRUISE_MAX_PX, rate) };
    }
    const fit = spanPx / COMMIT_GLIDE_MAX_S;
    return { nominal: Math.max(COMMIT_GLIDE_PX, fit),
             ceil: Math.max(COMMIT_CRUISE_MAX_PX, fit) };
  }

  /** The landing-brake constant for a resolution across [lo, hi] heading in
   *  `dir`. Forward normally keeps the global SNAP_K: the brake window sits
   *  inside the arrival's own content (camera ramp, ground lights). A route
   *  may declare a shorter forward tail where those authored slowdowns stack
   *  into a visible stall. Backward the leg is gesture-paced (the
   *  spanSlope drive below) and nothing plays under the brake, so the creep's
   *  ~constant ln(engage/dead)/K duration is pure dead time — measured 2026-08-17,
   *  0.5-0.9 s of visually-stopped ride on the Connect -> Inspire leg. Solve K
   *  so the tail fits COMMIT_BRAKE_TAIL_S instead: ONE fixed-point iteration
   *  from SNAP_K, never softer than SNAP_K, and still overshoot-free by the
   *  same construction — the rate goes to zero at the anchor and the
   *  integrator is position-capped there.
   *
   *  ONE ITERATION IS NOT CONVERGENCE, AND THE TAIL IS SHORT BECAUSE OF IT
   *  (CONV-02, 2026-08-26, measured on a DOM-free fixed-step rig). This
   *  comment used to say "the log is flat, a second changes nothing". It is
   *  not flat: the engage point is taken at SNAP_K and the brake then runs at
   *  the solved K, so the delivered tail is tailS - ln(K/SNAP_K)/K — ~30%
   *  shorter than the budget on every leg that declares one (0.35 buys 242 ms
   *  of its 350 on inspire>connect, 246 / 245 on the other two; route.js's own
   *  estimator, which starts at the K_eff plateau, reads 183 ms). A second
   *  iteration moves K by a third and OVERSHOOTS — 8.648 -> 5.981, a 412 ms
   *  tail — and the raw iteration oscillates rather than converging; the true
   *  fixed point is 6.707, at which the tail would be the declared 350 ms
   *  exactly. The budget is a DIAL, not a delivered time: route.js's
   *  FORWARD_BRAKE_TAIL_S comment is correct and this one was not. Pinned by
   *  tools/test-declared-conversions.mjs, whose BR-REGIME reds if the solve is
   *  ever converged. */
  function brakeK(band, lo, hi, dir) {
    const tailS = dir >= 0
      ? forwardBrakeTailSeconds(lo, hi, dir)
      : COMMIT_BRAKE_TAIL_S;
    if (!tailS) return SNAP_K;
    const pRate = band.nominal * spanSlope(lo, hi);
    const engage = Math.max(pRate / SNAP_K, SNAP_DEAD_P * Math.E);
    return Math.max(SNAP_K, Math.log(engage / SNAP_DEAD_P) / tailS);
  }

  /** Is the visitor's current gesture a STREAM going somewhere — i.e. a thing
   *  that should carry to the next rest whatever fraction of the span it
   *  reached?
   *
   *  This replaces a threshold on the rate at release, which could not work:
   *  a momentum tail ends at ~0.03 p/s however hard it was thrown, so that
   *  test could not tell a fling from a dribble (see constants.js). What DOES
   *  separate the cases is not an instant but the shape of the whole gesture.
   *
   *    a trackpad flick, a drag, a spun wheel — deltas 8-16 ms apart, dozens
   *      of them: a stream, and a stream means one gesture, so it carries;
   *    a notch-by-notch reader — notches 100-250 ms apart, one or two at a
   *      time: never a stream at any speed, so it is judged purely by
   *      position and is never flung onward by a rate it did not ask for.
   *
   *  COMMIT_CARRY_RATE survives only as an anti-twitch floor on the gesture's
   *  PEAK rate: a two-frame stray cannot buy a whole transition. It is not
   *  what excludes the notches — the stream test is. */
  function carrying(slope) {
    // Already answered: this gesture has had its transition. Its remaining
    // deltas are a momentum tail, not an ask.
    if (answeredP !== null) return false;
    if (gCount < COMMIT_STREAM_MIN) return false;
    // A pre-attach touch is represented by one aggregate sample. The exact
    // contact boundary plus KEY_STEP_PX of real travel proves its shape; the
    // ordinary callback-cadence test cannot, because those callbacks happened
    // before this model existed. Its peak below still comes from real distance
    // over real contact time.
    if (!bootTouchQualified && (!gapEma || gapEma > COMMIT_STREAM_GAP_MS)) return false;
    // The px peak, converted at the span it would be spent on. One finger,
    // one answer, both directions — COMMIT_CARRY_RATE keeps its p/s meaning
    // at the span's own scale.
    //
    // THE ASK IS CAPPED IN ROAD (2026-08-19): the p/s floor converts to
    // px/s at the span's mean slope, so a leg that owns a lot of road asks
    // for an unfair share of a swipe — Owned->Final (17.0 vh) demanded
    // ~1,130 px/s of peak against ~410-910 on every other leg, measured.
    // Same defect the backward side already caps (COMMIT_BACK_CAP_VH), so
    // the same cure: never ask more than COMMIT_CARRY_PEAK_PX px/s. On
    // every leg whose slope already meets the floor at or under that peak
    // the test is bit-identical; only the oversized leg's bar moves.
    return slope > 0
      ? gPeak * lastDir >= Math.min(COMMIT_CARRY_RATE / slope, COMMIT_CARRY_PEAK_VH * Math.max(320, window.innerHeight))
      : false;
  }

  /** The rest of [lo, hi] this position must resolve to, per the direction
   *  rule: POSITION (you got COMMIT_THRESHOLD of the span behind you) or
   *  VELOCITY (you were making a real gesture that way — carrying()).
   *
   *  The position fraction is measured on the SCROLL SURFACE, not in p
   *  (2026-08-11, the same directional audit as gPeak above): the span
   *  between the Owned and Final rests costs ~2.5 vh of wheel on the Owned
   *  side of the boundary and ~9.6 vh on the Final side, so 35% of the
   *  p-span was ~1.6 vh of scrolling forward but ~6.9 vh backward — the
   *  backward reader ground through 4x the physical scroll before idle
   *  would stop resolving them BACK to the rest they were leaving (and a
   *  measured eight-notch backward ride never escaped at all). In px the
   *  rule asks both directions for the same 35% of the same road. For a
   *  placement (no direction) "nearest" becomes px-nearest — the rest the
   *  visitor is fewer wheel-turns from, which is what nearest feels like. */
  function pickTarget(q, lo, hi) {
    if (hi - lo < 1e-9) return lo;
    const pxLo = scrollFor(lo), pxHi = scrollFor(hi);
    const span = pxHi - pxLo;
    const f = span > 1e-6 ? (scrollFor(q) - pxLo) / span : 0.5;
    const flick = carrying(span > 1e-6 ? (hi - lo) / span : 0);
    if (lastDir > 0) return (flick || f >= COMMIT_THRESHOLD) ? hi : lo;
    if (lastDir < 0) {
      // Backward the fractional ask is capped in absolute road
      // (COMMIT_BACK_CAP_VH — see the constant's note): a fair share of a
      // huge leg is still a grind, and backward there is no content under
      // the finger to make the road worth reading.
      const need = Math.min(COMMIT_THRESHOLD * span,
        COMMIT_BACK_CAP_VH * Math.max(320, window.innerHeight));
      return (flick || pxHi - scrollFor(q) >= need) ? lo : hi;
    }
    return f >= 0.5 ? hi : lo;               // placed, never scrolled: nearest
  }

  function commitTarget(q) {
    const [lo, hi] = bracketAt(q);
    return pickTarget(q, lo, hi);
  }

  /** The final displayed-rate limit. The global ceiling remains the fallback;
   *  a fine-pointer desktop moving forward across one of the authored spans
   *  gets a lower ceiling derived from that span's relative distance and its
   *  minimum transit time. This is intentionally the final clamp: limiting
   *  only the released glide still lets a hard live scrub punch through.
   *  Reverse and touch paths have no declaration and remain bit-identical. */
  function clampRate(r, q = p) {
    let limit = MAX_SCRUB_RATE;
    if (r > 0 && DESKTOP_PACING && DESKTOP_PACING.matches) {
      // At a shared anchor bracketAt() quite reasonably returns the span that
      // ENDS there. A forward rate belongs to the one that STARTS there, so
      // look an epsilon ahead only for this directional pacing lookup.
      const [lo, hi] = bracketAt(Math.min(TERMINAL_P, q + 1e-9));
      const seconds = desktopTransitCapSeconds(lo, hi, 1);
      if (seconds) limit = Math.min(limit, (hi - lo) / seconds);
    }
    return r > limit ? limit : r < -limit ? -limit : r;
  }

  /** Legacy W3-A soft snap, for ?nosnap=1 only: band-limited magnetism on the
   *  surface, parking anywhere outside the band, so ?p= deep-scrub QA can sit
   *  at arbitrary positions. It nudges v and lets the servo follow, exactly as
   *  a slow scroll would — it never touches the controller's rate. */
  function softSnap(dt) {
    let best = null, bestD = Infinity;
    for (const a of ANCHORS) {
      const d = Math.abs(scrollFor(a) - v);
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best === null) return;
    if (bestD > SNAP_BAND * lengthAtP(p)) return;
    const targetV = scrollFor(best);
    if (Math.abs(best - pAt(v)) < SNAP_DEAD_P) v = targetV;
    else v += (targetV - v) * Math.min(1, dt * SNAP_K);
  }

  function update(dt) {
    if (!enabled || total <= 0) return null;
    if (dt <= 0) return p;
    const nowF = performance.now();
    const idle = Math.max(0, nowF - lastInput - bankStall(nowF));
    lastFrameAt = nowF;
    stallClaimed = 0;
    // A gesture is over once its deltas have stopped for SNAP_ENGAGE_MS. This
    // no longer freezes anything — it only decides when the gesture's own peak
    // stops being the speed floor and the latched cruise takes over.
    const live = idle < SNAP_ENGAGE_MS;

    if (NOSNAP && !live) softSnap(dt);

    /* 1. THE SCRUB SERVO — the visitor's own surface, pulled at SMOOTH_K and
       speed-limited. Bit-for-bit the law that used to live in state.js; it is
       still the only thing that moves the picture while anyone is scrubbing,
       so scrubbing is unchanged, exact and reversible. */
    let surf = clamp01(pAt(v) + carry);
    /* THE WALL. Once this gesture has been answered at an anchor, its own
       surface may not pass that anchor — the leftover deltas are folded into
       `carry` instead, exactly as the driven landing has always folded its
       surplus, so v never runs away behind the picture and there is nothing
       stored up to jump when the wall is released. */
    if (answeredP !== null) {
      const w = answeredDir > 0 ? Math.min(surf, answeredP) : Math.max(surf, answeredP);
      if (w !== surf) { carry += w - surf; surf = w; }
    } else if (intent && intent.g !== gSerial) {
      /* THE PENDING ANCHOR IS A WALL FOR A GESTURE THAT DID NOT ARM THE
         FLIGHT (DEF-SKIP, fixed 2026-08-23 — the second half of the fix; the
         queue latch below is the first). A resolution folds its own surplus
         into `carry` as it flies, so mid-flight the surface already holds
         most of the transit's distance — and a NEWER gesture's deltas then
         landed on top of that bank, letting an ordinary second scroll drag
         the picture straight across the rest the flight was delivering.
         That scrub-past-on-banked-distance was the larger share of the
         measured 98.4% in-flight sweep rate; the retarget was the rest.

         So a gesture that did not arm this flight may not carry the surface
         past the flight's own anchor: the surplus folds into `carry`,
         identically to the answered wall above — spent, never stored, so
         nothing jumps when the flight lands. Its strength still registers
         (gPeak reads the raw deltas in push()), which is what earns the
         QUEUED leg, so the gesture still buys exactly one additional
         section — delivered after the rest composes.

         A reversal never reaches this line — push() releases the intent on
         the turning delta. The one exception is a touch contact still inside
         KEY_STEP_PX of travel (contactSettling): a pixel or two of
         finger-settle arrives here against a forward intent, sits on the far
         side of the anchor, and so is not clamped at all — it is ordinary
         scrub the servo absorbs, and the contact reverses for real the moment
         it has travelled a step's worth.

         THE ARMING GESTURE IS EXEMPT, deliberately: a single continuous
         drag keeps `intent.g === gSerial`, scrubs through its own
         resolution's span freely, and "a long scroll crosses as many
         transitions as it earns" is untouched. */
      const w = intent.dir > 0 ? Math.min(surf, intent.target) : Math.max(surf, intent.target);
      if (w !== surf) { carry += w - surf; surf = w; }
    }
    const servo = clampRate((surf - p) * Math.min(1, dt * SMOOTH_K) / dt);

    /* 2. THE RESOLUTION. Armed the moment it is known — which, when it runs
       the visitor's way, is DURING the gesture. (The gesture's own strength,
       gPeak, is measured in push() — on the input clock, from the deltas.) */
    if (NOSNAP) intent = null;
    else {
      /* THE ROUTE IS A LOOP (2026-08-12, Hannah: "scrolling up from the first
         section wraps to the last; scrolling down from the last wraps to the
         first"). It is resolved HERE, in the model's own resolution step,
         rather than bolted on as an edge handler — that is what makes the
         wrap trigger on the same gesture threshold as any section change,
         with no edge resistance and no second scroll. Past the last rest going
         forward, or at the first going back, the thing the gesture resolves to
         is simply the anchor on the other side of the seam.

         THE LAST *REST*, not the terminal anchor. p 0.97..1.0 is the authored
         end-hold and it is a HELD FRAME — measured, the camera pose at p 1 is
         identical to the pose at p 0.97 in position, target and fov; only the
         fog moves, 14.3/60.9 -> 15/62. Requiring a gesture to cross it before
         the wrap could fire would spend a whole scroll on a move with nothing
         on screen to show for it, which is exactly the "second scroll at the
         edge" the brief rules out. The end-hold keeps its anchor for scrub,
         ?p= and Home/End; it is simply no longer something a FLICK stops at.

         The threshold is the span's own, by the same rule every other
         resolution uses: the road immediately beyond the rest being left —
         [0.97, 1] going forward (363 px/s) and [0, 0.26] going back (485
         px/s). So the gesture that used to carry Final -> end-hold is exactly
         the gesture that now wraps, and nothing got harder. */
      const lastRest = ANCHORS[ANCHORS.length - 1];
      const term = RESOLVE_P[RESOLVE_P.length - 1];
      if (onWrap && answeredP === null && lastDir !== 0) {
        const fwd = lastDir > 0 && p >= lastRest - SNAP_DEAD_P;
        const back = lastDir < 0 && p <= ANCHORS[0] + SNAP_DEAD_P;
        /* A resolution already heading for the END-HOLD does not block the
           wrap, and that exception is load-bearing. The end-hold is 545 px
           wide, so COMMIT_THRESHOLD of it is 191 px: a hard flick carries the
           displayed position across that in three frames, while the stream
           test cannot qualify until it has seen COMMIT_STREAM_MIN = 4 deltas.
           The position rule therefore latched first and the HARDER the flick
           the more reliably it did — measured, 110 px/frame wrapped and
           240 px/frame stopped dead on the held frame. Nothing else is let
           through: a gesture that is not a stream still cannot wrap, so the
           notch reader keeps the end-hold exactly as before. */
        // WHAT HOLDS THIS SEAM OFF A LANDING FRAME IS `answeredP === null`
        // ABOVE, and nothing else. A second conjunct used to sit on the line
        // below, refusing a wrap while the rest just landed on was inside a
        // beat; measured on the wrap it bought nothing and cost the gesture,
        // and it was retired with its constant on 2026-08-26. The arrival wall
        // is set at EVERY delivering landing, so a fresh gesture is required
        // and the shortest landing -> wrap measured anywhere was 363 ms.
        const free = !intent || (fwd && intent.target === term);
        if ((fwd || back) && free) {
          const [lo, hi] = fwd ? [lastRest, term] : [RESOLVE_P[0], RESOLVE_P[1]];
          if (carrying(spanSlope(lo, hi))) {
            const dir = lastDir;
            intent = null;
            // The jump places the surface at the destination (setProgress ->
            // newGesture), so the wall has to be re-stated AFTER it: one
            // gesture buys one section change, and a wrap is a section change.
            onWrap(dir);
            gPeak = 0;
            // ...and the gesture is still the same gesture, still going the
            // same way. setProgress() clears lastDir because a PLACEMENT
            // carries no motion — true of a deep link, false of a wrap, which
            // is a placement performed in the middle of a live gesture. Left
            // at 0 the visitor's very next delta reads as a direction change,
            // mints a fresh gesture, and releases the wall the line below just
            // set: measured, one flick wrapped 0 -> 0.97 and then carried
            // straight on to the Owned rest.
            lastDir = dir;
            /* ...AND THE TIME THE WRAP ITSELF TOOK IS NOT THE VISITOR BEING
               IDLE (2026-08-13). Same sentence as the one above, applied to
               the other clock. `lastInput` is the timestamp of the last
               DELIVERED delta, and push() drops the wall whenever the next
               one arrives more than ARRIVAL_HOLD_MS after it. The wrap runs
               inside update(), and the frame it runs on is the most
               expensive frame on the site: placeAt's two dt = 0 applyFrame
               passes, every seam re-armed, the destination chapter's
               geometry touched and a 4 s blend armed. When that frame costs
               more than 90 ms — which it does under load, and Task B's added
               field geometry made it do so far more often — the NEXT delta of
               the very same flick reads as a pause, drops the wall, and the
               remainder of the gesture buys a second section.
                 Measured on the R5 gate (18 frames of 240 px, the hardest
               flick in the battery): intermittent, `fling past last ->
               0.259988` instead of `0.000000` on roughly half of runs, i.e.
               one gesture buying Final -> Mission -> Inspire. b0227bd's
               guarantee, lost to the wrap's own cost. A gentler flick never
               showed it, which is why it survived 2c22844's gates and the
               loop's residual note recorded only the symptom ("after a wrap
               the visitor must pause before the next section change").
                 Charging the visitor for the frame we spent is the bug. The
               idle clock restarts at the END of the placement, so a real
               pause after a wrap still drops the wall on its own merits at
               exactly the same 90 ms — only the wrap's own execution is
               excluded from it. */
            const placedAt = performance.now();
            bankStall(placedAt); stallBank = 0; lastInput = placedAt;
            answeredP = p; answeredDir = dir;
            return clamp01(p);
          }
        }
      }
      // A gesture that carries p out of the latched span has outgrown this
      // resolution: re-decide from where it now is, so a long scroll crosses
      // as many transitions as it earns.
      //
      // Crossing an anchor SPENDS the gesture, exactly as arriving at one does
      // (below). Without it, a scrub that drifts a hair past the rest it just
      // came back to re-brackets against the span BEYOND, finds the same hot
      // gPeak, and carries onward: measured, an out-and-back at the Inspire
      // rest overshot it by 0.004 and was answered by a trip to p = 0. A
      // gesture that is genuinely still delivering deltas re-earns its strength
      // from them within a frame or two, so a long scroll is not slowed by
      // this — it only stops one finished gesture buying a second transition.
      if (intent && (p < intent.lo - 1e-9 || p > intent.hi + 1e-9)) {
        intent = null;
        gPeak = 0;
      }

      /* THE IN-FLIGHT REPEAT QUEUE IS GONE (owner report #26, 2026-08-26).
         A second same-direction gesture arriving while the first one's
         multi-second resolution was still flying used to latch
         `intent.queuedNext` here, and the landing armed that leg and left the
         rest by itself. Under the design's law — "one gesture, one leg, each
         leg shown" — that was correct, and it is what DEF-SKIP built on
         2026-08-23 to replace an outright retarget that was worse. The owner
         has since ruled that a gesture which BEGAN MID-FLIGHT is not a
         request for another section at all, so there is no ask to queue: its
         deltas complete the arrival and the landing spends them. See the
         arrival block in step 4.

         What used to guard this state — `repeatAnchor` (set in push() when a
         delta reached an intent it did not arm) and `intent.depart` (the
         queued leg's own span exemption) — went with it; neither had another
         reader. The exemption `beforeRepeatDeparture` above is likewise gone:
         it existed only so a queued leg sitting exactly ON its departure
         anchor was not immediately dropped for being outside its own span. */
      if (!intent) {
        const [lo, hi] = bracketAt(p);
        const target = pickTarget(p, lo, hi);
        const dir = target > p ? 1 : target < p ? -1 : 0;
        const onward = dir !== 0 && dir === lastDir;
        if (onward) {
          // With the motion: arm NOW, floored at the gesture's own peak — which
          // is ALREADY px/s and needs no conversion at all now that the glide
          // is road-denominated — so the floor is under the motion before the
          // momentum tail decays.
          const band = glideBand(lo, hi, dir);
          intent = { target, lo, hi, dir, from: p, g: gSerial, band,
            floorPx: Math.abs(gPeak), cruisePx: null,
            snapK: brakeK(band, lo, hi, dir) };
        } else if (!live && dir !== 0) {
          // Against the motion (or from a placement): nothing to continue, so
          // this one does wait out the idle window and starts from rest at the
          // flat nominal cruise. Decelerating through zero is the one place
          // where slowing down IS the correct motion.
          //
          // A rejected gesture is a RETURN, not a committed reverse transit.
          // Giving it brakeK's abbreviated backward landing tail made a soft
          // mobile Owned -> Final swipe pause and then jump home in 0.07-0.4 s.
          // Let that small correction use the ordinary spring. A genuine
          // onward Final -> Owned transition still receives the authored fast
          // backward brake in the branch above.
          const band = glideBand(lo, hi, dir);
          const returning = lastDir !== 0 && dir !== lastDir;
          intent = { target, lo, hi, dir, from: p, g: gSerial, band,
            floorPx: 0, cruisePx: band.nominal,
            snapK: returning ? SNAP_K : brakeK(band, lo, hi, dir) };
          gPeak = 0;
        }
      }
      if (intent && intent.cruisePx === null) {
        if (live) {
          // Still going: the floor tracks the gesture's peak, so it can never
          // exceed what one finger's strength is worth and can never run away.
          // It is monotone within an in-flight retarget: a young second
          // gesture may add speed, never erase speed already being delivered.
          intent.floorPx = Math.max(Math.abs(gPeak), intent.floorPx);
        } else {
          // THE GESTURE IS OVER. Its peak — or the preserved floor of a flight
          // it extended — becomes the transition's cruise: at least nominal,
          // so a gentle gesture still completes the move at a readable speed;
          // at most the leg's ceil, so a fling still reads as travel. Spending
          // gPeak here is what keeps one gesture worth
          // exactly one transition — a velocity rule is not self-stabilising
          // at a rest the way a position rule is, so the velocity has to be
          // consumed where it is used, or one flick buys the whole route.
          intent.cruisePx = Math.min(
            Math.max(Math.abs(gPeak), intent.floorPx, intent.band.nominal),
            intent.band.ceil,
          );
          gPeak = 0;
        }
      }
    }

    /* 3. ONE DESIRED RATE. */
    let rate = servo;
    driving = false;
    if (intent) {
      if (intent.cruisePx !== null) {
        // The only ramp in the model, and it only ever runs UP: from the speed
        // already on screen toward the latched cruise. It can add speed and it
        // cannot take any away, so it cannot make a trough. Ramping in px/s
        // rather than p/s is what keeps that true across a shaped segment —
        // ramping in p would fight the spline's own gain curve.
        intent.floorPx += (intent.cruisePx - intent.floorPx) * Math.min(1, dt * COMMIT_BLEND_K);
      }
      // ROAD -> p, at the local gain. This one multiply is the whole change:
      // the glide now spends the scroll a chapter actually owns, so `scrollVh`
      // and `segVh`/`shape` mean the same thing to a released gesture that they
      // already meant to a scrubbing finger.
      //
      // FORWARD ONLY (2026-08-17, Hannah: "its actually nice going INTO the
      // section but feels super sluggish going out"). Road allocation is
      // authored for the ROUTE ORDER — the dense stretch into a rest is where
      // the chapter's content plays (ground lights, kindle), so a forward
      // glide riding the local gain is content pacing. A BACKWARD glide rides
      // the same profile mirror-imaged: it departs the rest through the dense
      // road (crawl, exactly where the eye expects acceleration) and crosses
      // the light road at the far end in one burst. Measured leaving Connect
      // for Inspire: 1.35 s after release to reach HALF its eventual visual
      // speed, then the whole swing in ~0.4 s — a wind-up, not a departure —
      // while the forward dive out of the same rest reads 50% of peak in one
      // frame. So a backward resolution converts at the span's MEAN slope
      // (spanSlope — the same fix carrying()'s thresholds already needed for
      // the same reason): total ride time is untouched (the integral is the
      // same spanPx at the same cruise), the brake still lands it, and the
      // visual profile falls to the camera gesture's own trapezoid, which is
      // the "one motion" every leg was built to read as. Content un-plays
      // by POSITION when scrubbing back, exactly as before — this touches
      // only what a released gesture's clock does with the road.
      const floorP = intent.floorPx *
        (intent.dir < 0 ? spanSlope(intent.lo, intent.hi) : slopeAtP(p));
      // The landing: never faster than the critically-damped pull toward the
      // rest, which is what makes the arrival asymptotic and overshoot-free.
      // The constant is per-intent (brakeK above): normally global SNAP_K
      // forward, optionally route-budgeted, and always budgeted backward.
      const brake = Math.abs(intent.target - p) * (intent.snapK || SNAP_K);
      const drive = intent.dir * Math.min(floorP, brake);
      if (drive * intent.dir > servo * intent.dir) { rate = drive; driving = true; }
    }
    vel = clampRate(rate);

    /* 4. INTEGRATE.
       THE ANCHOR IS A WALL WHENEVER A RESOLUTION IS LATCHED — not only while
       the resolution happens to be the faster of the two terms. That gate used
       to be `driven`, and it is exactly wrong: the servo overtakes the brake
       precisely when the visitor's surface has run past the anchor, i.e. in the
       one case where the arrival most needs to be noticed. Nothing else changes
       — when the servo is the driver, `vel === servo` exactly, so `extra` is 0
       and this block reduces to what the plain-scrub branch used to do. */
    let np = p + vel * dt;
    if (intent) {
      // Never past the anchor, and settle exactly on it.
      if (intent.dir > 0 ? np >= intent.target : np <= intent.target) np = intent.target;
      if (Math.abs(intent.target - np) < SNAP_DEAD_P) np = intent.target;
      // THE RESOLUTION IS A SCROLL, NOT AN ANIMATION: it carries the visitor's
      // own surface along, so a delta arriving mid-transition is applied from
      // where the picture actually is, and the servo does not spend the rest of
      // the move trying to drag the picture back.
      //
      // What it adds is EXACTLY its own contribution — the distance the
      // resolution moved beyond what the scrub asked for — and never more. It
      // must not be written `v = scrollFor(p)`: p trails the surface by the
      // servo's lag, so assigning it would silently discard that lag, which is
      // real scrolling the visitor performed. Measured when it did: a steady
      // 40-delta drag lost 30% of its distance, and an out-and-back inside one
      // gesture came back 3.8e-3 short instead of exactly where it started.
      const extra = (vel - servo) * dt;
      let ns = surf + extra;
      // The surface may not run past the anchor this resolution is going to —
      // that is what keeps the landing asymptotic once the servo takes the last
      // of it, and (since 2026-08-12) what stops a gesture whose own surface
      // has already overtaken the anchor from carrying its strength straight
      // through the rest. Surplus scroll is absorbed into `carry`, never banked.
      ns = intent.dir > 0 ? Math.min(ns, intent.target) : Math.max(ns, intent.target);
      carry += ns - surf;
      p = np;
      if (p === intent.target) {
        // ARRIVED. ONE GESTURE BUYS ONE TRANSITION — spend its strength here.
        // A rest is its own resolution under the POSITION rule, so that rule is
        // self-stabilising and needs no such step; a velocity rule is not. Left
        // unspent, the very next frame brackets the rest against the one BEYOND
        // it, finds the same hot gPeak, carries again, and departs — measured,
        // an out-and-back at the Inspire rest ran 0.26 -> 0.2798 -> 0.26 and
        // straight on to 0. (This is the same trap 90920fa fell into; it spent
        // its rate when the glide ENGAGED, which is a moment that does not
        // exist here, and spending it when the cruise latches is not enough
        // because a short transition can complete before the gesture is over.)
        // ZEROING gPeak IS NOT ENOUGH ON ITS OWN, and that is the 2026-08-12
        // finding: gPeak is drawn from `inRate`, which a still-running gesture
        // does not reset, so a momentum tail refilled it the very next frame
        // (measured 0 -> 1875 px/s in 17 ms). The gesture has to be RETIRED,
        // not just de-rated — hence the wall, which holds until dropWall().
        //
        // ONLY IF THIS RESOLUTION ACTUALLY DELIVERED A TRANSITION. A resolution
        // can be armed to an anchor the visitor is already standing on:
        // scrollFor() is a SAMPLED inverse, so a placement's own p -> px -> p
        // round-trip lands ~3e-6 below the anchor, and the position rule then
        // quite correctly resolves that hair forward. Answering a gesture with
        // a 3e-6 move would retire it before it had moved at all — measured,
        // it pinned a 2500 px/s flick to the Final rest and the End anchor
        // became unreachable. A real transition is at least 0.03 of p (the
        // shortest span on the route), so SNAP_DEAD_P separates the two by 20x
        // and the float artefact by 500x.
        /* THE LANDING ABSORBS EVERY GESTURE ON THE BOOKS, NOT ONLY THE ONE
           THAT ARMED THE FLIGHT (owner report #26, 2026-08-26 — "NOT auto
           scroll to the next section would be nice when I haven't made any
           gesture to do so", and, on being shown a longer beat: "So you
           didn't fix it? This is when scrolling through").

           This conjunct used to read `intent.g === gSerial &&`, exempting a
           gesture that began WHILE THE RESOLUTION WAS FLYING so that its
           strength could be spent on a leg of its own after the landing (the
           queue latch, DEF-SKIP 2026-08-23). The design's law was "one
           gesture, one leg, each leg shown", and by that law the exemption is
           correct — which is why three rounds of measurement kept reporting
           correct-by-design while the owner kept reporting a bug.

           THE OWNER HAS OVERRULED THE LAW. A gesture that began mid-flight is
           not a request for another section. On a trackpad a continuous
           scroll is a STREAM of deltas and clampRate pins a transit at
           1.3-1.8 s, so "a second gesture arrived mid-flight" is the ordinary
           case, not an edge one: measured at quiet load, Connect departed its
           rest unattended on 8 of 8 two-gesture rides, and lengthening the
           beat 300 -> 900 only moved the departure later. A rest the visitor
           is put at and then taken away from without asking is the defect,
           at any delay.

           So the discrimination is the serial itself, read the other way
           round: at the landing frame the model already knows whether the
           current gesture is the one that armed the flight, and if it is NOT
           then that gesture necessarily began before this landing. Either
           way its deltas have already done their work — they scrubbed the
           surface and helped complete this arrival — and here they are
           SPENT. Nothing is banked into a departure.

           WHAT MAKES THIS NOT THE DUAL (DEFECT-02, "two flicks buy one
           section"): this sets the ordinary arrival wall, the one a
           single-gesture landing has always set, so a gesture that begins
           AFTER the landing is released by exactly the paths that already
           release it — push()'s ARRIVAL_HOLD_MS idle boundary, a reversal, a
           fresh touch contact, or wheelPulseRestart's re-acceleration proof.
           No new wall, no new constant, and no new latency. The wall-RELEASE
           machinery — push()'s gapMs boundary, restartGesture(), newGesture()
           and wheelPulseRestart() — is byte-identical to what shipped; this
           change only widened which landings SET the wall, from "the arming
           gesture's" to "every delivering landing", and a wall that was always
           released by a fresh gesture is still released by one. Measured on
           the pure rig at all eight boundaries in both directions and both
           input kinds: a deliberate gesture 304 ms after the landing is
           honoured in 144 ms on touch and 176 ms on wheel, identical figures
           before and after this change. The dual would be a wall a fresh
           gesture cannot open; this one opens on the same first delta as
           before. tools/test-rest-authority.mjs pins both sides. */
        if (Math.abs(intent.target - intent.from) > SNAP_DEAD_P) {
          gPeak = 0;
          answeredP = intent.target; answeredDir = intent.dir;
        }
        if (bootGuardDir && intent.g === bootGuardSerial) clearBootGuard('landing');
        /* NOTHING DEPARTS FROM THIS LANDING (owner report #26, 2026-08-26).
           A queued leg used to be armed here from `intent.queuedNext` and to
           leave the rest by itself after a timed beat. That is the
           unattended advance the owner is reporting, and the latch that fed
           it is gone with it — see the wall above for why the mid-flight
           gesture's strength is now spent at this arrival instead.

           The journey now stands still until a gesture that BEGAN AFTER THIS
           LANDING asks it to move, and that gesture departs through the
           ordinary from-rest arming path with no delay of its own. */
        // NOTHING IS STAMPED HERE EITHER (2026-08-26). This landing used to
        // stamp a wrap beat — `restBeatUntil = nowF + COMMIT_REST_BEAT_MS` —
        // and both are retired: the beat was re-derived to zero on the wrap's
        // own arithmetic, and the guard it implemented is the arrival wall's,
        // set immediately above at every delivering landing. The tombstone and
        // the measurements are in constants/scroll.js; the retirement itself is
        // pinned by tools/test-rest-composition.mjs.
        fold(); intent = null; vel = 0;
      }
    } else {
      p = np;
      // Settle exactly, as state.js used to at the end of every scrub.
      if (Math.abs(surf - p) < 0.00004) p = surf;
    }
    return clamp01(p);
  }

  function attach() {
    // The five travel listeners, in their shipped order (journey/transport.js).
    transport.attach();
    window.addEventListener('resize', measure);
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        // Latch through the return-to-visible event. The next actual input
        // consumes it as a real pause/new gesture, then normal visible-frame
        // stall accounting resumes from this fresh epoch.
        backgroundGap = true;
        stallBank = 0;
        stallClaimed = 0;
        lastFrameAt = performance.now();
      });
    }
    measure();
    // Input can arrive before the first journey rAF (notably the wheel that
    // fast-forwards a cold intro). Give stall accounting a real epoch now;
    // the -1e9 sentinel must never masquerade as a claimed 400 ms overrun.
    lastFrameAt = performance.now();
    stallBank = 0;
    stallClaimed = 0;
  }

  const model = {
    attach,
    get enabled() { return enabled; },
    set enabled(on) { enabled = !!on; },
    /** The DISPLAYED progress — smoothed and speed-limited here, once. */
    get progress() { return p; },
    /** The virtual surface, unsmoothed (QA / diagnostics). */
    get surface() { return clamp01(pAt(v) + carry); },
    /** Place the position with no travel at all: surface, picture and rate all
        land together. Clears travel direction and the gesture measurement — a
        placement is not a scroll and carries no motion, so idle resolution
        falls back to the nearest rest from standstill (rests resolve to
        themselves — deep links / ?p= / ?capture= are not disturbed). */
    setProgress(q) {
      p = clamp01(q); v = scrollFor(p); carry = 0;
      vel = 0; intent = null; lastDir = 0;
      clearBootGuard('placement'); newGesture();
    },
    /** Milliseconds since the last manual input (QA). The raw number behind
        claimNow()'s freshness half; journey.js:1131 still reads it until J01
        switches blendCancelled()'s two sites to the port. */
    get sinceInput() { return sinceInputMs(); },
    /** QA: the rest idle would resolve to from here (null under ?nosnap=1). */
    get commitP() { return NOSNAP ? null : commitTarget(p); },
    /** QA: sign of the last manual delta. */
    get lastDir() { return lastDir; },
    /** QA: the on-screen rate (p/s). Persistent controller state — this is the
        number whose continuity across the end of a gesture is the whole point
        of the design. */
    get rate() { return vel; },
    /** QA: the SIGNED high-water mark of the rate this gesture has asked for,
        converted to p/s at the CURRENT bracket's span slope, with the same
        road cap carrying() applies (COMMIT_CARRY_PEAK_VH — the raw
        conversion can exceed the bar on a leg that owns a lot of road).
        This is exactly what pickTarget tests. The RAW surface px/s peak is
        what becomes the transition's cruise floor. Zero once a resolution
        has spent it. */
    get gesturePeak() {
      const [lo, hi] = bracketAt(p);
      const slope = spanSlope(lo, hi);
      const raw = gPeak * slope;
      if (slope <= 0) return raw;
      const cap = slope * COMMIT_CARRY_PEAK_VH * Math.max(320, window.innerHeight);
      return Math.abs(raw) > cap ? Math.sign(raw) * cap : raw;
    },
    /** QA: is this gesture a delta STREAM (a trackpad/drag/spun wheel rather
        than discrete notches)? The flick-carry test. */
    get streaming() {
      return gCount >= COMMIT_STREAM_MIN
        && (bootTouchQualified || (!!gapEma && gapEma <= COMMIT_STREAM_GAP_MS));
    },
    /** QA: is a resolution latched and driving? */
    get resolving() { return !!intent; },
    /** Is the commit glide ACTUALLY carrying the picture this frame — the
     *  resolution's drive term beating the visitor's own servo?
     *
     *  NOT QA-only: chapters whose reveal is PACED by the camera rather than
     *  merely gated by it read this to know the motion is machine-driven, the
     *  same way they already read a camera blend. A glide and a blend are the
     *  same kind of thing from a reveal's point of view — the visitor is not
     *  metering this motion with their hand — and a reveal that is honest
     *  about one should be honest about the other. `resolving` is deliberately
     *  NOT that test: an intent is latched through most of a live gesture. */
    get gliding() { return driving; },
    /** The anchor this gesture has already been answered at — the wall its
        remaining deltas cannot pass, released only by an additional scroll
        (dropWall: an ARRIVAL_HOLD_MS pause, a reversal, or a placement). null
        while the gesture still has a transition to spend.

        NOT QA-only as of 2026-08-14: journey.js's stepCamBlend reads this to
        tell input the model ACTS ON from input it is refusing, which is what
        stops a wrap cancelling the very camera blend its own gesture just
        armed. Note it can legitimately be 0 (the Mission anchor) — every
        reader must test it against null, never for truthiness. */
    get answeredAt() { return answeredP; },
    /** QA for the cold-intro wheel replay: whether its one-transition guard is
        still authoritative, plus the most recent arm/release reason. */
    get bootGuardState() {
      return { active: !!bootGuardDir, dir: bootGuardDir,
        serial: bootGuardSerial, reason: bootGuardReason };
    },
    /** Cold intro bridge (main.js only). Apply the wheel that triggered the
     *  synchronous boot exactly once, then credit the two event opportunities
     *  that boot is known to hide through browser coalescing. This is SHAPE
     *  credit only: no extra distance, rate, or gap is invented. With no real
     *  tail gPeak/gapEma stay zero, so one notch cannot buy a section; one
     *  coalesced tail sample supplies the fourth event and its own measured
     *  strength. Normal wheel and all touch input never use this path. */
    primeBootWheel(deltaY, deltaMode = 0) {
      let d = deltaY;
      if (deltaMode === 1) d *= WHEEL_LINE_PX;
      else if (deltaMode === 2) d *= window.innerHeight;
      if (!d) return;
      clearBootGuard('reprime');
      push(d, 'wheel');
      bootGuardDir = d > 0 ? 1 : -1;
      bootGuardSerial = gSerial;
      bootGuardReason = 'armed';
      gCount = Math.max(gCount, COMMIT_STREAM_MIN - 1);
      gapEma = 0;
      // boot() attaches scroll before it finishes the rest of its synchronous
      // wiring. That work is site time preceding this replay, not part of the
      // physical gap to the next tail sample; begin the frame epoch here.
      lastFrameAt = performance.now();
      stallBank = 0;
      stallClaimed = 0;
    },
    /** Replay the complete physical wheel stream captured while GPU readiness
     *  was pending. The first sample uses the cold-boot bridge above; every
     *  remaining sample is its real delivered delta, in order — no distance
     *  or event is synthesized. */
    primeBootWheelStream(samples) {
      if (!enabled || !Array.isArray(samples) || !samples.length) return false;
      const first = samples[0];
      this.primeBootWheel(first.deltaY, first.deltaMode);
      for (let i = 1; i < samples.length; i++) {
        let d = samples[i].deltaY;
        if (samples[i].deltaMode === 1) d *= WHEEL_LINE_PX;
        else if (samples[i].deltaMode === 2) d *= window.innerHeight;
        if (d) push(d, 'wheel');
      }
      return true;
    },
    /** Cold intro touch bridge (main.js only). The scroll listeners did not
     *  exist for this contact's touchstart or collected movement, so restore
     *  that one exact physical contact after boot.
     *
     *  Every value is observed by the pre-boot collector: no displacement,
     *  callback, or rate is synthesized. Absolute event timestamps are
     *  rebased onto the boot clock while preserving their exact elapsed time;
     *  otherwise module/build latency would be mistaken for a slow finger.
     *  An active contact keeps its latest Y so later native touchmoves continue
     *  the same gesture. A contact that already ended is replayed and closed.
     *
     *  @param {{startY:number, latestY:number, startedAt:number,
     *    latestAt:number, active:boolean}} contact
     *  @returns {boolean} whether a valid contact was consumed
     */
    primeBootTouch(contact) {
      if (!enabled || !contact || typeof contact.active !== 'boolean') return false;
      const { startY, latestY, startedAt, latestAt, active } = contact;
      if (![startY, latestY, startedAt, latestAt].every(Number.isFinite)
          || latestAt < startedAt) return false;
      const bootNow = performance.now();
      const elapsed = latestAt - startedAt;
      // Establish the replay epoch BEFORE push(): any time since attach/reset
      // belongs to module/build work, while `elapsed` below is the contact's
      // measured physical time. Letting bankStall see the former would subtract
      // it from the latter and erase the swipe's real rate.
      lastFrameAt = bootNow;
      stallBank = 0;
      stallClaimed = 0;
      beginTouchContact(startY, bootNow - elapsed);
      moveTouchContact(latestY, { exactContact: true });
      if (!active) endTouchContact();
      return true;
    },
    /** Journey-side (journey.js steerWrapBlend — the wrap lap follows the
     *  scroll): re-raise the wall at the displayed position. The input that
     *  REDIRECTS a wrap in flight has been answered — by the lap itself
     *  changing play direction — so it gets the same retirement the wrap
     *  performs when it fires (the wrap block in update()): its remaining
     *  deltas buy nothing — carrying() refuses them, and blendCancelled()
     *  stops reading them as the visitor taking the camera back — until the
     *  visitor genuinely starts again (dropWall's three events). Without
     *  this, the tail of the reversing gesture cancels on the very next
     *  frame the rewind it just asked for. */
    retire(dir) {
      if (!dir) return;
      answeredP = p;
      answeredDir = dir > 0 ? 1 : -1;
      gPeak = 0;
    },
    /** QA: the cruise (px/s) this resolution latched when the gesture ended —
        the gesture's own peak clamped to the leg's [nominal, ceil] band
        (COMMIT_GLIDE_PX / COMMIT_CRUISE_MAX_PX, both raised if needed to finish
        inside COMMIT_GLIDE_MAX_S), or flat nominal for a reversal / standing
        start. The final displayed p-rate can be lower on a desktop span with
        a DESKTOP_TRANSIT_CAP_S declaration. null while the gesture is still
        running. */
    get resolveCruise() { return intent ? intent.cruisePx : 0; },
    /** QA: where the latched resolution is going (null if none). */
    get resolveTarget() { return intent ? intent.target : null; },
    get nosnap() { return NOSNAP; },
    update,
    pAt,
    scrollFor,
    get total() { return total; },
  };

  /* THE DECISION PORT, published rather than mounted (./claim.js explains
     why it is not a twenty-seventh member). `retire` is the model's own
     function object, not a wrapper: its body touches no `this`, so calling it
     through the port is the same call — the receiver hazard J04a's F5 named,
     checked rather than assumed (tools/test-input-claim.mjs B4). J01 reaches
     this with inputPortOf(scroll) and injects it as `input`; nothing under
     journey/transition/** ever needs a `scroll` identifier. */
  publishInputPort(model, { claimNow, retire: model.retire });
  return model;
}
