// organism/performance.js — the pixel ratio: what we REMEMBER about a display
// (createPixelRatioPolicy) and how we DECIDE what it can afford
// (createAdaptiveResolution). The two are one story and share one storage key,
// which is why they share a file: the decision below is the thing the policy
// above remembers, and a remembered decision is what stops the decision from
// ever being visible again.

// THE TWO NUMBERS THAT DEFINE WHAT A REMEMBERED VERDICT MEANS. The budget is
// the frame cost (ms) the calibration requires the settled page to clear, and
// the projection is the intro-to-settled overhead factor it multiplies the
// measured average by (both derivations live in the FLUIDITY / UNDERESTIMATES
// comments inside createAdaptiveResolution — these are the same numbers,
// named, not new tuning). They are named at module level because the STORAGE
// KEY below includes them: a remembered verdict is only as good as the rule
// that produced it, and the key is how the memory knows which rule that was.
//
// WHY THE KEY CARRIES THE RULE (2026-08-25, frame-pacing order — Hannah:
// scrolling "feels a little bit stuttery and non-smooth"). A stored verdict
// is applied at the first frame and `calDone = policy.stored !== null` skips
// calibration for the life of the entry — which is the design: a remembered
// decision is what stops the decision from ever being visible again. But the
// entry never said WHICH decision rule produced it, so the day the budget or
// the projection is re-tuned (it has been re-tuned before: the FLUIDITY
// comment below is the 24 ms -> 20 ms tightening, prompted by Hannah's own
// "?pr=1.5 feels noticeably smoother" — the memory happened to ship the same
// day, so no stale verdicts existed THEN), every display already carrying a
// verdict silently keeps the old rule's answer forever. What that costs was
// measured on 2026-08-25 (headless Chrome, Metal, M-series, host load ~3-4):
// pinned pr=2 on a display this pipeline affords 1.5 runs the settled page at
// a flat ~30 fps — raf-dt p50 33.4 ms, 92% of frames over 25 ms, idle and
// scrolling alike — while 1.5 holds p99 = 18.5 ms. A 30 fps plateau clamps
// nothing, so it sits forever below the catastrophic backstop's ~20 fps
// horizon: a permanent mis-calibration no instrument here would ever surface.
// Folding the rule into the key makes any future re-tune re-calibrate each
// display exactly once (masked, during the choreography — the normal path)
// instead of silently resurrecting a verdict the current rule never issued.
// Old-rule entries linger unread in localStorage; a few bytes, harmless.
// NOTE this only re-validates against a changed RULE. A verdict stale against
// a changed WORLD — the page growing costlier per frame, the host slowing —
// is the authored one-way trade above and is deliberately left alone.
const CAL_BUDGET_MS = 20;
const CAL_PROJECTION = 1.35;

/** Resolve and persist the display-specific pixel-ratio calibration. */
export function createPixelRatioPolicy(pinPr) {
  const storeKey = (() => {
    try {
      return 'gs-pr-cal:' + screen.width + 'x' + screen.height + '@' + devicePixelRatio
        + ':' + CAL_BUDGET_MS + 'x' + CAL_PROJECTION; // the rule that gives the verdict its meaning
    }
    catch { return null; } // screen/devicePixelRatio unavailable: no cal key, falls through to live pinPr/default below
  })();
  const stored = (() => {
    try {
      const v = parseFloat(localStorage.getItem(storeKey));
      return Number.isFinite(v) && v >= 1 && v <= 3 ? v : null;
    } catch { return null; } // privacy mode / no storage: no calibration to read, falls through to live pinPr/default below
  })();
  function remember(v) {
    try { localStorage.setItem(storeKey, String(v)); } catch { /* private mode */ }
  }
  return {
    stored,
    initial: pinPr !== null ? pinPr : stored !== null ? stored : Math.min(devicePixelRatio, 2),
    remember,
  };
}

// ---- adaptive resolution: keep weak GPUs smooth ----
// The pipeline (4x MSAA + bloom + TAA at up to 2x DPR) is heavy for older
// hardware. If the frame budget is blown for a sustained window, step the
// pixel ratio down a notch and re-check. One-way ratchet — it never steps
// back up, so there is no visible resolution flicker; on machines that hold
// 60fps it never engages at all.
//
// ...AND ONE-TIME STALLS ARE NOT GPU LOAD (2026-08-16 — Hannah: "a visual
// shift and then a lag... smooth other than that", consistently a few seconds
// after the settled hero). The page's own cold-start work — the journey's
// chapter-build slices and shader warm renders, each a 100-450 ms main-thread
// stall landing 8-13 s in — used to pollute exactly the windows this governor
// judges, so it misread "cold start" as "weak GPU" and stepped the ratchet on
// a machine that holds 60 fps at steady state: measured at DPR 2, 2 -> 1.75
// -> 1.5 -> 1.25 across the 10-22 s window, each step a one-frame sharpness
// snap (the size sync flushes the TAA history) plus a target-reallocation
// hitch — the reported shift-then-lag, made PERMANENT by the one-way ratchet.
// Two guards, both preserving the governor's real job:
//   · a window containing a FEW clamped frames (dt at the 0.05 ceiling —
//     stalls, not sustained load) casts no verdict. A genuinely dying GPU is
//     still caught: sustained sub-20 fps clamps the MAJORITY of its frames,
//     and that window still counts. Sustained 25-40 fps has no clamped
//     frames at all and still counts.
//   · one bad window is a strike, not a verdict — the visible step needs two
//     CONSECUTIVE bad windows (5 s of genuinely missed budget), so a stray
//     spike the clamp test misses still cannot trip it.
// ...AND THE DECISION IS TAKEN ONCE, DURING THE CHOREOGRAPHY (2026-08-17 —
// Hannah, the third round on the same report: a consistent glitch "5 seconds
// after the full hero view is done"). Reactive stepping can never win on a
// machine that genuinely misses budget at full DPR: the cold-start stalls
// void the intro windows (correctly — they are stalls, not load), so the
// ratchet's first honest verdict is forced PAST the settle, and with the
// two-strike guard it lands at exactly settle + ~5 s — a visible sharpness
// snap on a still frame, every load, at the most attentive moment there is.
// So the governor no longer reacts its way down. It CALIBRATES: through the
// intro it samples only clean frames (clamped dt = a one-time stall, skipped),
// and at `calibrateAt` — the callout power-up, the last stretch where the
// whole frame is still visibly in motion — it computes the pixel ratio the
// measured budget actually affords (frame cost ~ pr², so pr * sqrt(20/avg),
// floored to the 0.25 grid — one notch conservative beats a second visible
// step) and applies the WHOLE drop in one masked adjustment. After that the
// windowed ratchet remains only as a drift backstop, always two consecutive
// clean bad windows, so a settled frame is never re-graded on a fluke.
/**
 * Build the per-frame adaptive-resolution governor. Returns the frame function
 * to register as an animator; the caller owns whether to register it at all
 * (a pinned `?pr=` means no governor exists, rather than a governor that
 * declines to act — a governor that runs and always decides nothing is a
 * harder thing to reason about than one that was never built).
 *
 * THE MACHINE. Two states, and the mode is `calDone`:
 *   CALIBRATING — accumulates clean frame costs (`calSum`/`calN`). Leaves on
 *                 one of two events: the deadline passing with a full quota,
 *                 or the grace deadline passing without one (`starved`).
 *                 Entered at most once per page, and skipped entirely when the
 *                 display already has a remembered verdict.
 *   WATCHING    — terminal. Scores 2.5 s windows and needs two consecutive
 *                 majority-clamped ones to step. `perfStrikes` is the only
 *                 binding here with three write sites (increment, reset after
 *                 a step, reset on any good window); that is the two-strike
 *                 counter, inherited verbatim, and collapsing it would be a
 *                 semantic rewrite rather than a reshaping.
 * The transition is one-way and the pixel ratio is a one-way ratchet, so
 * neither state can be re-entered — which is what makes a visible resolution
 * change impossible after the first one.
 *
 * HAZARD: this runs inside the frame loop, which catches and permanently
 * disables an animator that throws (see ./animation.js). A throw in here is
 * therefore silent — the resolution simply stops adapting, with no error
 * anywhere. Keep the body total: arithmetic and renderer calls that cannot
 * reject.
 *
 * @param {object}   deps
 * @param {object}   deps.renderer     WebGLRenderer whose pixel ratio is governed.
 * @param {object}   deps.policy       createPixelRatioPolicy() result — `stored` decides
 *        whether this visit calibrates at all, `remember` records the verdict.
 * @param {function} deps.syncSizes    Re-sync every size-dependent consumer after a
 *        pixel-ratio change (organism/renderer.js createViewportSync's `sync`).
 * @param {number}   deps.calibrateAt  Seconds on the shared clock at which the
 *        one masked calibration decision is taken.
 * @returns {function(number, number): void} `frame(t, dt)`
 */
export function createAdaptiveResolution({ renderer, policy, syncSizes, calibrateAt }) {
  let perfTime = 0, perfFrames = 0, perfClamped = 0, perfStrikes = 0;
  // A remembered calibration (applied at renderer construction) IS the
  // calibration: skip the per-visit measurement entirely so no step can occur —
  // only the catastrophic backstop below stays armed, and its steps update the
  // memory.
  let calSum = 0, calN = 0, calDone = policy.stored !== null;

  return function frame(t, dt) {
    if (!calDone) {
      if (dt > 0 && dt < 0.0499) { calSum += dt; calN++; }
      // A machine where nearly every frame hits the dt clamp (sustained <=20fps)
      // never fills the clean-sample quota — and is exactly the machine that
      // needs the drop most. Past a grace deadline, calibrate from the clamp
      // itself: 50 ms IS the measured floor of what we know.
      const starved = t >= calibrateAt + 2.5 && calN < 30;
      if ((t < calibrateAt || calN < 30) && !starved) return;
      calDone = true;
      /* THE INTRO UNDERESTIMATES THE SETTLED PAGE (2026-08-17 — Hannah, on the
         stubborn residual: "it flashes a TINY bit lighter and stalls just
         before it does", still at settle + ~5 s. That pairing is a resolution
         step at rest: the stall is the size sync reallocating every target,
         and the light flash is the TAA history flush — one un-accumulated
         frame renders the thin bright filaments brighter before the average
         re-converges. It kept firing because calibration measures the INTRO's
         workload, and the settled page runs more per frame: the journey spine,
         four chapter animators and the ui tracker all start at boot. A machine
         that passes the audition can still miss the budget at the show, and
         the old post-settle backstop then stepped it — stall plus flash — at
         the most attentive moment there is. Two changes close it:
           · the calibration decision projects the measured average forward by
             1.25x for the journey's post-boot per-frame overhead, so machines
             near the line take their (masked) step during the choreography;
           · the post-settle ratchet no longer steps for a missed 24 ms budget
             AT ALL. Missing 60 fps at rest on this slow ambient scene is
             invisible; the correction was the only visible artifact. The one
             post-settle step left is the catastrophic case — a majority of
             frames at the 50 ms clamp, i.e. the page is at ~20 fps and
             genuinely unusable — where a one-frame flash is mercy. */
      /* FLUIDITY OVER THE LAST NOTCH OF SHARPNESS (2026-08-17 — Hannah, A/B on
         her own retina machine: "?pr=1.5 feels noticeably smoother" than the
         pr=2 the old 24 ms budget let stand. A machine that misses 60 fps only
         slightly was being held at full resolution and paid in a permanent
         light stutter — the wrong trade for a slow ambient scene whose motion
         is its whole point. The calibration budget is therefore 20 ms (a ~50
         fps floor with headroom, which reads as smooth on this content) and
         the post-boot projection 1.35x, both of which only bite machines that
         were already missing 60: a machine averaging under ~14.8 ms projected
         still clears 20 and keeps full retina untouched. */
      const projected = (starved ? 50 : (calSum / calN) * 1000) * CAL_PROJECTION;
      const pr = renderer.getPixelRatio();
      if (projected > CAL_BUDGET_MS && pr > 1) {
        const afford = pr * Math.sqrt(CAL_BUDGET_MS / projected);
        const target = Math.max(1, Math.floor(afford / 0.25) * 0.25);
        if (target < pr) {
          renderer.setPixelRatio(target);
          syncSizes();
        }
      }
      // Remember the DECISION either way — a machine that cleared the budget
      // remembers full ratio, one that stepped remembers its landing — so every
      // later visit applies it at the first frame and never steps in view.
      policy.remember(renderer.getPixelRatio());
      return;
    }
    perfTime += dt;
    perfFrames++;
    if (dt >= 0.0499) perfClamped++;
    if (perfTime < 2.5) return;
    const clampedShare = perfClamped / perfFrames;
    perfTime = 0;
    perfFrames = 0;
    perfClamped = 0;
    // Post-settle: ONLY the catastrophic escape remains (see the calibration
    // comment above) — a majority-clamped window is ~20 fps, and even that
    // needs two consecutive windows so a single seized-up stretch (another
    // app hogging the GPU for a moment) cannot re-grade a settled frame.
    const pr = renderer.getPixelRatio();
    if (clampedShare > 0.5 && pr > 1) {
      if (++perfStrikes < 2) return;
      perfStrikes = 0;
      renderer.setPixelRatio(Math.max(1, pr - 0.25));
      syncSizes();
      policy.remember(renderer.getPixelRatio());   // the memory follows the machine
    } else {
      perfStrikes = 0;
    }
  };
}
