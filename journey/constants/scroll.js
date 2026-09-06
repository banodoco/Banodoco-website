// journey-v6 constants — scroll/commit domain.
//
// Split out of journey/constants.js (F01, 2026-08-21): the virtual-scroll
// physics and commit-resolution tunables, verbatim (values, names, types,
// and their original comments unchanged) plus the progress-smoothing
// constant scroll.js consumes alongside them. journey/constants.js
// re-exports every name below unchanged; see that file for the
// compatibility facade.

// Virtual scroll (no native scroll surface: the hero page stays
// overflow:hidden, so nothing about hero layout or rendering changes).
export const SNAP_ENGAGE_MS   = 160;   // input-idle after which a gesture is
                                       // over. It no longer gates any MOTION:
                                       // the resolution that runs the
                                       // visitor's way is armed DURING the
                                       // gesture, so nothing is frozen while
                                       // this elapses (scroll.js, `live`). It
                                       // decides only two things — when a
                                       // gesture's peak rate stops being the
                                       // speed floor and the latched cruise
                                       // takes over, and when a resolution
                                       // that OPPOSES the visitor may arm.
                                       // It no longer decides the third thing
                                       // it briefly did (2026-08-12): how long
                                       // the arrival wall holds. That is
                                       // ARRIVAL_HOLD_MS below, and the split
                                       // matters in BOTH directions — a reader
                                       // notching at 100-140 ms relies on this
                                       // window staying 160 ms (inside it the
                                       // resolution that would drag them back
                                       // to the rest they are leaving cannot
                                       // arm, so their notches accumulate),
                                       // while the wall wants to come down long
                                       // before that.
export const ARRIVAL_HOLD_MS  = 90;    // THE INTERACTION THRESHOLD (2026-08-12,
                                       // Hannah: "make this extremely short —
                                       // potentially only a tiny fraction of a
                                       // second... it should feel like a subtle
                                       // interaction threshold, not like the
                                       // site has temporarily stopped
                                       // responding").
                                       //
                                       // b0227bd made the anchor a gesture is
                                       // answered at a WALL until that gesture
                                       // ends, and read "ends" off the only
                                       // idle constant there was —
                                       // SNAP_ENGAGE_MS, 160 ms. That is much
                                       // more stillness than the job needs. The
                                       // wall has exactly one duty: separate a
                                       // gesture that never stopped from one
                                       // that did. It does not need to agree
                                       // with when a gesture's PEAK stops being
                                       // the speed floor, which is what 160 ms
                                       // is actually for and what the flick
                                       // (90920fa) and the notch reader are
                                       // tuned against — so it no longer
                                       // borrows it.
                                       //
                                       // THE FLOOR IS MEASURED, not guessed.
                                       // Chrome coalesces wheel events to about
                                       // one per frame for a non-passive
                                       // listener, so the delivered spacing of
                                       // a continuous gesture is the SITE'S OWN
                                       // FRAME TIME, whatever the device emits.
                                       // 3630 delivered gaps over 49 Chrome-
                                       // paced streams (7 speeds x 7 places on
                                       // the route, live site, headful): p50
                                       // 22.4, p90 29.4, p95 32.2, p99 40.1 ms.
                                       // On the contended headless cadence,
                                       // 3370 gaps: p50 24.3, p95 33.0.
                                       // Exceedance is FLAT from 90 ms up — the
                                       // only gaps above it are >200 ms frame
                                       // hitches, which break a gesture at
                                       // 160 ms exactly as they do at 90, so
                                       // this costs nothing that 160 was buying
                                       // (0.055% of gaps at both).
                                       //
                                       // THE MARGIN IS STRUCTURAL, not fitted:
                                       // 90 is 2x COMMIT_STREAM_GAP_MS, the
                                       // model's OWN ceiling on the mean
                                       // spacing of a gesture that is allowed
                                       // to carry. A gesture that cannot hold a
                                       // 45 ms mean cannot buy a second section
                                       // at all, so the wall never has to hold
                                       // against one; and a gesture that can
                                       // would have to throw a single gap at
                                       // twice its own permitted mean to slip
                                       // through. Against the measurement that
                                       // is 2.24x the p99 real gap and 2.7x the
                                       // p95 on the slower cadence.
export const SNAP_K           = 3.4;   // spring constant, 1/s, toward the rest
export const SNAP_BAND        = 0.30;  // capture band, x chapter scroll length
export const SNAP_DEAD_P      = 0.0015;// closer than this, settle exactly
export const WHEEL_LINE_PX    = 16;    // deltaMode 1 -> px
export const TOUCH_GAIN       = 1.35;  // touch drag feels shorter than wheel
export const KEY_STEP_PX      = 110;   // arrow keys
export const STALL_FRAME_MS   = 34;    // ~2 frames at 60 Hz; above this a frame overran
export const STALL_MAX_MS     = 400;   // ...and past this it is a stopped tab, not a frame
// Commit resolution (G3 motion note): idling anywhere must resolve to a rest —
// there is no p where stopping leaves you parked between chapters. A gesture
// that is going somewhere arms its resolution WHILE IT IS STILL RUNNING, so
// the resolution's speed is already the floor under the motion before the
// gesture's momentum tail decays; a resolution that opposes the visitor waits
// out SNAP_ENGAGE_MS, because a reversal has nothing to continue. Scrubbing
// itself is untouched and stays exact. See scroll.js `update`.
// Travelling BACKWARD, the position rule's 35%-of-the-road ask is additionally
// capped at this many viewport heights of absolute scrolling (2026-08-17,
// Hannah: "it waits for those 3 animations (the ground ones) to play out
// before going properly"). The fraction is already direction-fair in px
// (pickTarget, 2026-08-11) — but fair shares of a huge road are still huge:
// the Inspire<->Connect leg owns ~14.7 vh, so 35% asked ~4,600 px of wheel,
// and a measured ten-notch backward ride from the Connect rest (1,200 px of
// deliberate scrolling, the three ground lights un-playing one by one) was
// still answered with a glide BACK to Connect. Forward that road is the
// content being read — the ground-light reveal plays under the finger, and a
// real departure is a flick the stream rule carries anyway. Backward nothing
// plays (lights un-play by position wherever the camera is), so past a firm
// pull's worth of road the grind measures nothing but patience. ~0.9 of a
// viewport — six-to-eight wheel notches, half a trackpad swipe — is a
// deliberate act no stray notch fakes, and legs whose 35% is already smaller
// than it (every leg but this one) are untouched by construction.
export const COMMIT_BACK_CAP_VH = 0.9;  // viewport heights

// ---- RETIRED (2026-08-26): THE WRAP'S LANDING BEAT --------------------
//
// `COMMIT_REST_BEAT_MS` and its one reader, `restBeatUntil`
// (journey/scroll.js), are gone. Authored at 300 ms on 2026-08-23 for a
// QUEUED DEPARTURE that took a landed rest away from the visitor on a timer;
// retimed 300 -> 900 by owner decision on the morning of 2026-08-26; the
// queued departure itself removed the same day (owner report #26 — "So you
// didn't fix it? This is when scrolling through"), which left the WRAP as the
// beat's only subject; re-derived on the wrap's own arithmetic to 0; retired.
//
// WHY IT HAD NOTHING LEFT TO BUY, in the four figures the gate still reads out
// of this block. A beat is spent BEFORE the wrap fires and the wrap's whole
// copy handover is keyed to the lap's own phase after it, so no hold can
// advance the destination by a millisecond: re-measured 2026-09-01 on the
// ceremonial seam (+/-426.9 deg, 5333 ms laps; 1280x800, 6 down + 3 up clean
// trials, banodoco-brief-v16/evidence/r4-grammar/loop-ceremony/), the
// destination at copyEase 0.90 4234 ms forward (the crossfade model's figure;
// the page's own crossing measured ~4290 ms), while the rest the wrap leaves
// is still on screen for 2077 ms after the wrap fires — 1028 ms LONGER than a
// whole scroll arrival takes. (The 2026-08-21 figures these replaced: 3894 and
// 1526, on the pre-conversion 3904 ms lap.)
// And the 900's price was not a delay but the gesture: with the
// wrap shut the only road ahead is the end-hold, so the refused ask resolved
// onto p 1.0 and was DESTROYED on 14 of 14 trials at a 150 ms ask. What the
// beat reached for is held by the ARRIVAL WALL, already a conjunct of the wrap
// block and set at every delivering landing: with no beat at all the shortest
// landing -> wrap measured anywhere was 363 ms, over 24 clean trials.
//
// The sweeps, the traces and the whole derivation are kept:
// docs/code-health/evidence/2026-08-21-elegance-run-01/wrap-beat/.
// tools/test-rest-composition.mjs still recomputes the wrap's side of it, and
// pins the retirement itself so the mechanism cannot come back unnoticed.

export const COMMIT_THRESHOLD  = 0.35; // fraction of the inter-rest span,
                                       // measured from the rest being LEFT (in
                                       // the direction of travel), past which
                                       // idle commits onward instead of back.
                                       // 0.35 < 0.5 is the deliberate forward
                                       // bias: "push forward most of the time".
                                       // Fraction OF THE SCROLL SURFACE, not of
                                       // p (2026-08-11): the Owned<->Final span
                                       // costs ~2.5 vh of wheel on one side of
                                       // the allocation boundary and ~9.6 vh on
                                       // the other, so a p-fraction asked one
                                       // direction for 4x the physical scroll
                                       // (measured: 1.6 vh forward vs 6.9 vh
                                       // backward to the same 35%). In px both
                                       // directions pay the same share of the
                                       // same road. See scroll.js pickTarget.
// FLICK CARRY — WHICH rest a gesture resolves to (scroll.js pickTarget).
//
// COMMIT_THRESHOLD alone is a POSITION rule: it asks how far into the span you
// got and ignores that you were going somewhere. A gesture released short of
// it is sent BACKWARD, and a backward resolution after forward motion cannot
// be velocity-continuous by construction — the on-screen rate has to pass
// through zero to change sign. So velocity joined position in deciding where.
//
// The rule was right; its CURRENCY was wrong. It used to read the rate at the
// gesture's LAST delta, and on a real trackpad the last delta is the smallest
// one of the momentum tail, by construction — the tail decays to nothing
// before it stops arriving. Measured at 1280x800 through the real listeners,
// peak rate vs rate-at-last-delta, in milli-p/s:
//
//     gesture              peak     at last delta
//     weak flick + tail      30              12
//     mid  flick + tail     109              19
//     hard flick + tail     305              31
//
// A 0.305 p/s fling and a 0.030 p/s dribble hand over the same ~0.02-0.03 p/s.
// No threshold on that number can separate them, which is why the release-rate
// carry test fired essentially at random and why every fix denominated in it
// was inert on real input.
//
// So the test is no longer a rate at an instant. It asks what the gesture IS:
//
//   STREAM — a continuous delta stream (COMMIT_STREAM_MIN events, mean spacing
//            within COMMIT_STREAM_GAP_MS). Every trackpad gesture and every
//            spun wheel is one; a notch-by-notch reader never is, at any
//            speed, because the notches are 100 ms+ apart. This is what keeps
//            the reader judged purely by position, exactly as before.
//   INTENT — the stream reached at least COMMIT_CARRY_RATE at its peak, so a
//            stray two-frame twitch cannot buy a whole transition.
//
// Measured peaks (milli-p/s): 1 notch 0, 3 notches @120ms 23, 6 notches
// @250ms 26, 1.0 s slow drag 30, 1.4 s slow drag 53, weak flick 30, mid 109,
// hard 305. The stream test — not this number — is what excludes the notch
// rows; 0.02 only has to sit under the weakest real gesture.
export const COMMIT_CARRY_RATE = 0.02;  // p/s, the gesture's PEAK rate (see
                                        // scroll.js gPeak), signed against the
                                        // visitor's own last delta direction.
                                        // The peak is MEASURED in surface px/s
                                        // and converted at the resolution
                                        // span's own mean slope (2026-08-11):
                                        // at the local slope, one finger read
                                        // 9x weaker leaving the Final rest
                                        // backward than leaving Owned forward
                                        // (15,460 vs 143,670 px/p), so real
                                        // backward flicks landed under this
                                        // floor and were resolved BACK to the
                                        // rest they were leaving. At the span
                                        // slope the two directions read one
                                        // finger identically.

// The carry ask, capped in ROAD (2026-08-19). COMMIT_CARRY_RATE converts to
// px/s at the span's mean slope, so a leg that owns a lot of road asks for
// an unfair share of a swipe — Owned->Final owns 17.0 vh and demanded
// ~1,388 px/s per viewport-height of gesture peak (measured through the real
// listeners at 375x812: the flip sat between 700 and 1,000 px/s) against
// ~1,118 (Inspire->Connect) and ~0.54/0.51 vh/s on the two short legs. That
// is the same unfair-share defect the backward side already caps
// (COMMIT_BACK_CAP_VH above), so it gets the same cure, denominated the same
// way: a gesture is never asked to peak harder than this many viewport
// heights per second. 1.17 sits between the next-hardest leg's demand
// (Inspire->Connect ~1.118 vh/s) and Owned->Final's (~1.388), so ONLY
// Owned->Final's threshold moves — at EVERY viewport height, which an
// absolute px cap cannot promise (at a 900 px-tall viewport Owned->Final
// asks ~1,249 px/s and Inspire->Connect ~1,006, so a 950 px cap would start
// moving the ground-lighting leg too). The stream test (COMMIT_STREAM_MIN /
// COMMIT_STREAM_GAP_MS) still excludes notch readers. See scroll.js
// carrying().
export const COMMIT_CARRY_PEAK_VH = 1.17;  // vh per second, surface
export const COMMIT_STREAM_GAP_MS = 45; // mean inter-delta spacing at or below
                                        // which a gesture counts as a stream.
                                        // Trackpads and momentum tails run
                                        // 8-16 ms; a reader's notches run
                                        // 100-250 ms. ~2.5x margin either side.
export const COMMIT_STREAM_MIN = 4;     // events. Below this there is no stream
                                        // to measure and no gesture to carry.
// THE GLIDE IS DENOMINATED IN ROAD, NOT IN p (2026-08-14). It used to be
// `COMMIT_GLIDE_RATE = 0.10` p/s, and that one unit is the whole reason five
// consecutive passes on the Connect ground lighting bought nothing.
//
// The defect. `scrollVh`/`segVh` exist so a chapter can buy WALL-CLOCK: more
// scroll for the same p means the same progression takes longer to read
// (route.js). That contract holds while the visitor is scrubbing — the servo
// tracks the surface, and the surface is denominated in px. It did NOT hold
// the moment the gesture ended: the commit glide drove p at a fixed rate in
// p/s, so it crossed a chapter in a time proportional to its SPAN and utterly
// blind to its ROAD. Connect's ground-lighting arrival is 0.1341 of p, so it
// played in ~1.3 s however much road it owned — measured on the shipped tree,
// one ordinary trackpad gesture from the Inspire rest ran the whole three-hub
// arrival in 1.70 s. Connect's scrollVh had been raised 4.5 -> 10.0 -> 10.15
// across two passes (+5.65 vh of page) explicitly to slow that arrival, and
// for a visitor who scrolls and lets go it bought EXACTLY ZERO. Every pass
// that verified the slowdown verified it under a continuous 600 px/s scrub —
// the one input that never engages the glide (measured control: the cruise
// never latches, and the same arrival runs 2.5-3x longer).
//
// The fix. The glide's speed is now px of scroll per second, converted to p at
// the LOCAL slope of the scroll spline every frame. Road bought is road spent,
// in both input modes, for every chapter — and the arithmetic gets simpler,
// because `gPeak` is already px/s and no longer needs converting through a
// span's mean slope at all. That conversion is also what made the same finger
// worth different amounts of p at the two ends of a leg (the direction
// asymmetry recorded as a residual in 16-connect-ground-restage.md,
// 2026-08-11: 2.50 s forward against 2.90 s backward on one span); it is gone
// by construction, not by tuning.
export const COMMIT_GLIDE_PX   = 1500; // px/s NOMINAL cruise. FLOOR, not speed:
                                       // a resolution running with the visitor
                                       // cruises at max(the gesture's own peak,
                                       // this), so it only ever speeds a gentle
                                       // gesture UP, never brakes a brisk one.
                                       // It is the flat cruise only for a
                                       // reversal and a standing start, where
                                       // there is no motion to continue.
                                       // ~1.7 vh/s at a 900 px viewport.
export const COMMIT_BLEND_K    = 6.0;  // 1/s — how fast the resolution's speed
                                       // FLOOR eases from the gesture's own
                                       // peak rate up to the latched cruise,
                                       // once the gesture is over. It is the
                                       // only ramp left in the model, it only
                                       // ever runs upward, and it starts from
                                       // the speed already on screen — so it
                                       // can add speed and can never take any
                                       // away. ~63% in 165 ms, ~95% by 0.5 s.

// Fast scroll must take the SAME accelerated path, never a cut: the smoothed
// progress is speed-limited, so a flung trackpad still traverses every frame
// of the route (just quickly). An ordinary scroll runs at ~0.05 p/s against
// the allocations above, so this leaves ~9x headroom - fast reads as fast,
// never as a jump, and the limiter never engages during normal reading.
// Full journey minimum traverse ~= 2.2 s.
export const MAX_SCRUB_RATE   = 0.45;  // p units per second

// Ceiling on a resolution's latched cruise (scroll.js, intent.cruise), in the
// same px/s the glide is now denominated in. A transition that carries a fling
// must keep that speed, not brake to nominal — but it must not inherit the
// whole scrub limiter either, or a hard fling would cross a whole leg at
// teleport speed with no sense of travel.
//
// It matters far more than it used to, and that is deliberate. Under the old
// p/s denomination this ceiling was ~10,000 px/s on the Inspire->Connect leg
// and ~28,000 on Owned->Final — so high that it never bound, and what actually
// governed every released gesture was the FLOOR. Now the ceiling is the thing
// that decides how fast a reveal may be autoplayed past the visitor, which is
// exactly the decision that was being made by accident before. 2200 px/s is
// ~2.4 vh/s: the fast end of comfortable reading, and still ~3.7x a deliberate
// scrub. It cannot make the site feel sluggish, because the glide is a FLOOR
// under the servo — a visitor who keeps scrolling always overrides it.
//
// Chosen against the legs rather than in the abstract. At a 900 px viewport it
// leaves Connect->Owned at 2.09 s of autoplay against the shipped 2.08 and
// Mission->Inspire at 2.86 against 2.58, i.e. the transitions nobody has
// complained about stay where they were; the two that move are Inspire->
// Connect (the ground lighting, which is the request) and Owned->Final (which
// owns 17.0 vh and is now bounded by COMMIT_GLIDE_MAX_S below).
export const COMMIT_CRUISE_MAX_PX = 2200;   // px/s

// No single resolution autoplays for longer than this. The glide is road-
// denominated now, so a leg that owns a lot of road would otherwise commit the
// visitor to a very long ride from one flick — Owned->Final is 17.0 vh and would
// run 7.8 s at nominal. One gesture buys one transition, and a transition has to
// stay a transition: above this duration the leg's own rate scales up to fit.
// Legs shorter than CRUISE_MAX x this are unaffected, which today is every leg
// except Owned->Final.
export const COMMIT_GLIDE_MAX_S = 7.5;      // seconds

// The landing-brake tail budget for a BACKWARD glide. The brake
// (|target - p| * SNAP_K, scroll.js) is an exponential creep whose duration is
// ~ln(engage/dead)/K — a CONSTANT ~0.7-0.9 s regardless of how fast the leg
// cruises, because SNAP_K is global. Forward that constant hides inside the
// arrival's own content (the camera ramp and the ground lights are still
// playing through it); backward there is no arrival content — the leg is
// gesture-paced (scroll.js spanSlope drive, 2026-08-17) — so the tail is pure
// dead time and reads as the ride going mushy at the end. Backward glides
// solve their brake constant so the tail fits this budget (never softer than
// SNAP_K). 0.35 s keeps the ease visible — the camera trapezoid is already
// below 40% slope everywhere the brake operates, so the firmer pull never
// shows as a hit.
export const COMMIT_BRAKE_TAIL_S = 0.35;    // seconds

/* ------------------------------------------------------------------ */
/* Motion / state smoothing                                            */
/* ------------------------------------------------------------------ */
// SMOOTH_K is the scrub servo's constant and it lives in ONE place: the scroll
// controller (scroll.js), which owns the displayed position. state.js used to
// smooth p a SECOND time on top of it, and that second filter is what made the
// stop Hannah kept feeling structurally unavoidable: a first-order lag carries
// no velocity state, so the instant its target stopped moving the on-screen
// rate decayed as e^(-SMOOTH_K t) toward zero — every commit began by watching
// the motion die, whatever the scroll model did next. state.js now smooths
// nothing at all: the flight tween (its last motion) retired with the footer
// cue in the 2026-08-09 navigation redux.
export const SMOOTH_K       = 6.5;  // progress smoothing, free scrubbing
