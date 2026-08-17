// journey-v6 — every tunable number the journey shares, in one file.
//
// Nothing here is final. The scroll ranges, rest band, and threshold
// hysteresis are explicitly the numbers the grey-box prototype (P3) exists to
// settle; they live together so tuning is one file, one diff, one review.
//
// Chapter ORDER is v6-canonical: Mission -> Inspire -> Connect -> Owned ->
// Final. Equip is deferred: it has no range, no route, no nav entry, and no
// scroll space (see adr-d2-harvest-map.md and adr-d6-routes.md).

/* ------------------------------------------------------------------ */
/* Journey progress p in [0,1] -> chapters                             */
/* ------------------------------------------------------------------ */
// M4: the chapter table LIVES IN route.js now — one ordered manifest that
// every global number (p-ranges, rest stops, snap anchors, nav entries,
// scroll allocations, seam positions) derives from. This file keeps only
// the feel/motion constants that are not per-chapter route data; the
// seam/fog tables below are computed against the manifest so a re-timed
// route carries them along.
import { startOf, restProgress } from './route.js';

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

// Absolute-p windows in which each chapter's DOM copy is shown. Authored as
// offsets from each chapter's REST (route.js) — the copy belongs to the rest
// composition, so a re-timed route carries its window along. -1 / 2 are the
// open-ended sentinels bandOpacity() understands (no fade at that edge).
// Shipped values unchanged: mission hi 0.042; inspire 0.248..0.338; connect
// 0.476..0.548; owned 0.716..0.792; final lo 0.914.
export const COPY_BANDS = {
  mission: { lo: -1, hi: restProgress('mission') + 0.042 },
  inspire: { lo: restProgress('inspire') - 0.012, hi: restProgress('inspire') + 0.078 },
  connect: { lo: restProgress('connect') - 0.014, hi: restProgress('connect') + 0.058 },
  owned:   { lo: restProgress('owned') - 0.009,   hi: restProgress('owned') + 0.067 },
  final:   { lo: restProgress('final') - 0.011,   hi: 2 },
};
export const COPY_FADE_P = 0.020;      // fade width at each edge of a band

/* ------------------------------------------------------------------ */
/* Copy fade choreography (W3-B, gap e)                                */
/* ------------------------------------------------------------------ */
// The p-bands above say WHERE copy may live; these constants say WHEN it
// actually shows. Copy releases the moment travel begins (fast fade-out) and
// re-anchors only once the camera has actually settled (slow fade-in, gated
// on scrub speed) — "reappears only when the next camera composition has
// created appropriate negative space" (handoff, Travel layer).
export const COPY_OUT_K     = 7.0;   // 1/s — release as travel begins (~0.15 s)
export const COPY_IN_K      = 2.4;   // 1/s — breathe back in (~0.9 s)
export const COPY_SETTLE_LO = 0.012; // p/s below which the camera counts as settled
export const COPY_SETTLE_HI = 0.062; // p/s above which fade-in is fully held
export const COPY_TRAVEL_LO = 0.030; // p/s at which visible copy starts releasing
export const COPY_TRAVEL_HI = 0.090; // p/s at which it is fully released
/* ------------------------------------------------------------------ */
/* Copy entry on a NAV JUMP (Hannah, 2026-08-07)                       */
/* ------------------------------------------------------------------ */
// "When I jump between sections, the text for the new section INSTANTLY
// appears, but we should have some nice intro animation and proper timing."
//
// The constants above choreograph copy against SCROLL SPEED, which is the
// right instrument for a scrub and the wrong one for a jump: a jump snaps
// progress in a single dt = 0 tick, so |dp/dt| never rises, `settled` reads 1,
// and the destination's copy is simply written at full opacity on the frame
// the visitor clicked — a full second before the camera gets there.
//
// A jump therefore gets its own envelope, and the thing it is timed against
// is the CAMERA ARRIVAL, not the click. journey.js hands ui.js the live
// duration of the cylindrical blend it just armed (0.85 s plus up to 0.35 s of
// path length — see directJumpTo), and the copy is placed inside that window:
//
//     start = dur * COPY_JUMP_LEAD      the words wait out the first ~55% of
//                                       the move, so they arrive into a frame
//                                       that is already recognisably the
//                                       destination rather than racing it
//     end   = dur + COPY_JUMP_TAIL      and finish a beat AFTER the camera
//                                       stops, so the last thing that settles
//                                       on screen is the sentence
//
// The entry's own duration falls out of those two (dur * 0.45 + TAIL, i.e.
// 0.53 s on the shortest hop and 0.69 s on the longest) — a longer flight
// buys a longer settle for free, which is what keeps the pair feeling like
// one movement at both extremes.
export const COPY_JUMP_LEAD   = 0.55;  // fraction of the camera blend spent waiting
export const COPY_JUMP_TAIL_S = 0.15;  // s after the camera lands that the copy finishes

// Hotspot labels arrive AFTER the copy has re-anchored, one at a time, in the
// chapter's narrative reveal order — never as a simultaneous pop.
export const HOTSPOT_STAGGER_MS = 150;
export const HOTSPOT_IN_K       = 3.2;
export const HOTSPOT_OUT_K      = 9.0;

// A HOT chip holds its world anchor still (ui.js, THE HOVER HOLD): the thing a
// chip annotates rides the scene's own motion, and a target that moves under
// the pointer is a target you cannot rest on. When the chip goes cold the held
// anchor does not snap back — it glides home at this rate, so releasing a hover
// is a movement and not a jump. 6.0 puts it inside ~0.4 s from the worst
// measured departure, comfortably under the 9.0 the chip's own fade runs at.
export const HOTSPOT_HOLD_HOME_K = 6.0;

// PILL COLLISION DODGE (2026-08-10). Two resting pills that overlap raise the
// upper one just clear of the lower — the DOT stays pinned on its node via a
// compensating CSS translate (--j-dot-dy), so the label moves and the marker
// does not lie. Exists for Inspire at phone widths: the three lip anchors
// project 125 px apart there and Arca's full label is 168 px, so Arca's tail
// crossed ArtCompute's dot (measured 43 x 11 px of pill overlap at 375x812).
// GAP is the cleared daylight between the two pill rects; MAX matches the
// horizontal nudge's own "past ~26 px the label stops reading as attached".
export const HOTSPOT_DODGE_GAP = 4;
export const HOTSPOT_DODGE_MAX = 26;

/* ------------------------------------------------------------------ */
/* Documentary handheld layer (W3-B, gap a)                            */
/* ------------------------------------------------------------------ */
// A very-low-amplitude, low-frequency wander on the analytic camera — the
// difference between a motion-control move and an observed one. Deterministic
// (seeded sine bank, no Math.random) so audits reproduce; ?steady=1 disables
// it entirely; amplitude goes to EXACTLY zero within restFadeP of every rest
// anchor so rest poses stay byte-identical, and it fades out under fast
// scrub so it can never read as shake.
export const HANDHELD = {
  ampDeg:    0.34,   // peak angular wander, degrees (~0.9% of frame at fov 38)
  posAmp:    0.016,  // translational component, world units (rotation dominates)
  restFadeP: 0.018,  // zero within this p-distance of any rest anchor
  scrubLo:   0.06,   // p/s: full amplitude below this scrub speed
  scrubHi:   0.16,   // p/s: fully suppressed above
};

/* ------------------------------------------------------------------ */
/* Orbit breathing (W3-B, gap b)                                       */
/* ------------------------------------------------------------------ */
// The trapezoid killed the 145 deg/s whip but left the plateau conveyor-
// constant. This adds a barely-perceptible ease variation along the swing:
// +/- ~9% of the plateau rate, 1.7 slow cycles, windowed to zero inside the
// ramps so the endpoints and their zero-velocity joins are untouched. Peak
// rate rises ~39 -> ~42 deg/s; monotonicity is preserved (0.107 << 1.22).
export const ORBIT_BREATH = { amp: 0.010, cycles: 1.7 };

/* ------------------------------------------------------------------ */
/* Seam crossings read as passing THROUGH something (W3-B, gap d)      */
/* ------------------------------------------------------------------ */
// Brief, pure-in-p fog thickenings centred on the physical crossings the
// path makes: the cap's shadow band (the camera drops past the rim's height
// on the Connect descent — OUTSIDE it since the D16 ground restage, same p)
// and T3 (substrate swallows the frame on the soil crossing).
// Multiplicative dips on near/far; zero at every rest anchor, perfectly
// reversible. T1 stays purely a streaming trigger (ADR: no visual), T4's
// crossing is carried by the fog ramp opening below.
// Centres are authored as leg-relative offsets from the manifest, so a
// re-timed route carries the crossings with it. Shipped values: rim-shadow
// at connect.start + 0.056 = 0.436, T3 at owned.start + 0.093 = 0.693.
//
// T3 0.093 -> 0.088 (2026-08-12, with the Connect rest rebalance). The offset
// is not a taste value: it PINS the murk's peak to the frame where the camera
// physically passes through y = 0, and owned/camera.js says so ("the 0.91 /
// 0.925 pair is what pins the soil crossing"). Dropping the Connect rest's eye
// to 2.0 shortened the dive's whole sink (D0.y 2.647 -> 2.0 against the same
// D1.y -1.18), so the SAME easeY reaches y = 0 earlier: the crossing moved
// p 0.69318 -> 0.68805. Left at 0.093 the camera entered the soil at 90.9% of
// the murk's depth (fog.far 10.556 against the peak's 9.602) and the murk then
// peaked after it was already under — the swallow arriving a beat late. 0.088
// puts the peak back ON the crossing. Re-pinning HERE rather than reshaping
// easeY is deliberate: easeY carries the "one continuous arc" the dive was
// rebuilt for (86883b9), and this is a one-number registration fix that leaves
// the arc untouched. No rest anchor is inside either band, so no reference
// still moves.
export const SEAM_FOG_DIPS = [
  { c: startOf('connect') + 0.056, w: 0.035, near: 0.26, far: 0.34 },  // rim-shadow drop
  { c: startOf('owned') + 0.088,   w: 0.026, near: 0.46, far: 0.52 },  // T3 soil crossing
];

/* ------------------------------------------------------------------ */
/* Fog re-parameterisation (adr-d3 section 4, seam T4)                 */
/* ------------------------------------------------------------------ */
// The hero ships Fog(bg, 7, 20), which fully obscures anything past ~20
// units - the Final pullback would render as flat black. The ramp is a pure
// function of p, so reverse scrubbing restores the hero fog exactly.
//
// W3-B retiming (gap c): near and far open on STAGGERED schedules instead of
// one shared smoothstep, so the reveal breathes open rather than popping.
// The far plane starts easing out during the rise (0.78, before the camera
// crests the soil at ~0.858) and is still opening as the recession begins;
// the near plane holds the substrate's thickness longer and releases late.
// Both are fully open just after the Final rest so dwelling there reads calm.
// Schedule endpoints are route-relative (the ramp belongs to the Owned->Final
// legs): far opens from owned.start+0.18 (=0.78, during the rise) to the
// final rest +0.02 (=0.945); near holds until final.start-0.015 (=0.835) and
// is fully open at rest +0.03 (=0.955).
export const FOG_RAMP = {
  far:  62, farFromP:  startOf('owned') + 0.18,   farToP:  restProgress('final') + 0.02,
  near: 15, nearFromP: startOf('final') - 0.015,  nearToP: restProgress('final') + 0.03,
};

// Streaming seam windows live in seams.js — the single source.

// Hysteresis so a shaky scrub cannot strobe the streamer.
export const THRESHOLD_HYSTERESIS_WORLD = 0.15;  // world units
export const THRESHOLD_HYSTERESIS_DEG   = 8;     // degrees, for the azimuth seam
export const THRESHOLD_MIN_DWELL_MS     = 250;   // before a reverse crossing retires anything

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

/* ------------------------------------------------------------------ */
/* Hero handshake                                                      */
/* ------------------------------------------------------------------ */
// Kept in sync with the ENTRY choreography in hero.css (and main.js's own
// HERO_INTRO_MS, which the page uses before this module ever loads).
export const HERO_INTRO_MS = 7600;
export const DEEP_LINK_DETAIL_DELAY_MS = 600; // settle at the pose, then open
