// journey-v6 constants — copy & hotspot choreography domain.
//
// Split out of journey/constants.js (F01, 2026-08-21): where/when chapter
// DOM copy is shown, its fade choreography, its nav-jump entry envelope, and
// the hotspot label timing/collision-dodge tunables — verbatim (values,
// names, types, and their original comments unchanged). COPY_BANDS is a
// computed export (depends on route.js's restProgress and structure.js's
// JOURNEY_SCHEMA, exactly as before the split); every other export here is a
// plain literal. journey/constants.js re-exports every name below unchanged;
// see that file for the compatibility facade.
import { restProgress } from '../route.js';
import { JOURNEY_SCHEMA } from '../structure.js';

// Absolute-p windows in which each chapter's DOM copy is shown. Authored as
// offsets from each chapter's REST (route.js) — the copy belongs to the rest
// composition, so a re-timed route carries its window along. -1 / 2 are the
// open-ended sentinels bandOpacity() understands (no fade at that edge).
// The ABSOLUTE values are derived, not authored, so they are deliberately not
// written down here: they move whenever route.js re-times a rest, and a
// transcribed copy of them silently goes stale (it did — the list that used to
// sit on this line still claimed connect 0.476..0.548 and final lo 0.914 long
// after a rest move made them 0.509..0.581 and 0.959). What IS authored, and
// therefore reviewable, is each chapter's copyBand offset pair in
// structure.js. To see the live absolutes, print COPY_BANDS.
export const COPY_BANDS = Object.fromEntries(JOURNEY_SCHEMA.chapters.map(({ id, copyBand }) => [id, {
  lo: copyBand.lo === null ? -1 : restProgress(id) + copyBand.lo,
  hi: copyBand.hi === null ? 2 : restProgress(id) + copyBand.hi,
}]));
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
//     end   = dur + COPY_JUMP_COPY_TAIL and finish with the same unhurried
//                                       breathe the scroll arrival gets, after
//                                       the camera has made the negative space
//
// The entry's own duration falls out of those two (dur * 0.45 + TAIL, i.e.
// 0.93 s on the shortest hop and 1.09 s on the longest). That now matches the
// ordinary COPY_IN_K scroll breathe instead of rushing the heading and body
// through a half-second flourish. A longer flight still buys a longer settle
// for free, which keeps the pair feeling like one movement at both extremes.
export const COPY_JUMP_LEAD   = 0.55;  // fraction of the camera blend spent waiting
export const COPY_JUMP_TAIL_S = 0.15;  // hero furniture's existing post-camera beat
export const COPY_JUMP_COPY_TAIL_S = 0.55; // copy's scroll-paced post-camera breathe

/* ------------------------------------------------------------------ */
/* THE INTRO BLOCK'S ARRIVAL IS PERFORMED (owner report #36, 2026-08-26:
   "could you also make it so that the intro block text, when it appears
   and reappears, that happens gradually and nicely rather than it just
   popping up as it does now?")                                        */
/* ------------------------------------------------------------------ */
// Report #31 fixed the intro copy's WRAP arrival and recorded, without
// acting on it, that the ordinary ones were untouched: scrolling back up to
// the intro painted 0 -> 0.8 in 33-50 ms with a 0.39-0.46 SINGLE-FRAME step,
// and a rail click home did it in 183 ms with 0.21. Re-measured under the
// injected clock (evidence .../intro-copy-fade/): 50 ms / 0.4587 and
// 183 ms / 0.2153, identical to 4 dp across repeats.
//
// NEITHER OF THOSE IS A CLOCK. Both are the rail's hero gate, and the gate
// is authored in ROUTE POSITION — `1 - smoothstep(u / 0.05)` over the
// docking coordinate `u`, i.e. the whole fade lives in the last 5% of a
// span the visitor crosses at whatever speed they like. On a scroll that
// gate opens across ~3 frames and the arrival SHELF (`heroGate * 0.8`)
// ratchets with it; on a click the flight envelope has already raised the
// chapter's own opacity to 0.73 behind the shut gate and the paint's
// `min(gate, ...)` ceiling lifts in one step. Two surfaces, one defect, and
// it is CONTRIBUTING.md §5's: a beat priced in a coordinate whose exchange
// rate to visible motion is the gesture's own speed is not a beat.
//
// THE GATE IS RIGHT AND IS NOT TOUCHED. "Mission copy may arrive only with
// the strip's final approach" is a real law (DEFECT-01 #2 is what happens
// without it) and it belongs to the rail. What is added is a FLOOR under
// it, in seconds — the doctrine HOTSPOT_ARRIVAL already carries for a
// named beat, applied to the one copy surface that has a scene gate:
//
//     the painted intro copy may arrive LATER than the strip it docks
//     with, never faster than a performance.
//
// Denominated as the seconds a full 0 -> 1 traverse of the PAINTED opacity
// may not beat. 1.10 s puts 0 -> 0.8 at 880 ms, which is the family every
// other authored arrival at this surface already sits in — the nav jump's
// own envelope is 930-1090 ms (COPY_JUMP_* above), the COPY_IN_K breathe
// reaches 0.8 in 671 ms, and the wrap's repaired entrance measures 1431 ms.
// It is a CEILING ON THE RISE and nothing else: an arrival already slower
// than this passes through untouched (which is why the wrap's entrance and
// R4 cannot move), a fall is never limited (a departure is a release, and
// the intro copy must not linger over the chapter it is handing to), and
// dt === 0 snaps, so a capture and a `?p=` deep link stay settled by
// construction.
export const HERO_COPY_ARRIVAL_S = 1.10;

// THE SCENE OWNS THE CADENCE; THIS QUEUE IS THE FALLBACK (corrected
// TIMING-01, 2026-08-23). This comment used to describe HOTSPOT_STAGGER_MS as
// the mechanism by which chapter labels arrive one at a time, and it sent
// everyone who wanted to re-time a chapter's chips to the wrong file.
//
// No shipped chip is in this queue. Every chapter that registers hotspots
// opts out of it in hotspot-frame.js's advanceReveal(): Inspire is
// `revealDirect` and mirrors its own landing cascade, Connect is `revealScrub`
// and rides each hub's ignition, and Owned's contributor faces are
// `labelOnHover`, which draws nothing at rest and so has no arrival to stage.
// The scene that draws the thing a chip annotates is the only clock that can
// know when that thing has actually landed, and it is where a chapter's
// arrival cadence is authored — Inspire's LAND_* in chapters/inspire/index.js,
// Connect's hub ignition in chapters/connect/index.js.
//
// What survives here is the queue for a chip with a resting mark and NO scene
// reveal: it would otherwise pop in with its siblings on one frame, so it
// arms one per this interval in registration order. Nothing takes that branch
// today. Keep the export — hotspot-frame.js still reads it, constants.js
// re-exports it, and the compat fixture pins the name and value — but do not
// reach for it to fix how a chapter's labels feel arriving.
export const HOTSPOT_STAGGER_MS = 150;
export const HOTSPOT_IN_K       = 3.2;
export const HOTSPOT_OUT_K      = 9.0;

/* THE PERFORMED ARRIVAL FOR A NAMED BEAT (DEFECT-01 #3 gave a beat's ONSET a
   tempo floor; ICON-ARRIVAL, 2026-08-23, extends the same doctrine to the
   beat's whole DURATION — Hannah: the six initiative markers "still show up
   really fast … make that feel delightful while also getting this timing
   really right").

   THE SCENE IS CONDUCTED; THE BEATS ARE PERFORMED. Continuous transformation
   belongs to `p` at whatever speed the visitor chooses, and that doctrine is
   untouched — nothing here slows the camera, the copy, the fog, a hub's own
   light or an ember's kindle. What this governs is the discrete event of an
   initiative MARKER landing, and it now governs both halves of it:

     · beatGapMs — a marker's onset may not follow its sibling's by less than
       this. DEFECT-01's floor, carried forward: a flick cannot collapse three
       landings into one pop (measured then: 67/66 ms gaps on a hard flick).
       Since CONNECT-SYNC (2026-08-23) this number also paces Connect's WHOLE
       arrival: the chapter derives a floor on its travelling light such that
       the closest pair of hub landings is exactly beatGapMs apart when the
       visitor outruns the show (chapters/connect, THE ARRIVAL IS PERFORMED),
       and its chips ride that light directly — one clock for dot and label,
       which is what the owner's "misaligned when I scroll in" was about.
     · formMs — the marker's formation (the condense / unfold / settle gesture
       hotspot-frame.js's paintIconTab draws) takes this long, at any scroll
       speed. Before this, the gesture's clock was whatever the scene gate
       happened to do: Inspire's first ember saturates its gate in ~80 ms on
       a settled arrival, so a designed entrance played as a pop. A gesture
       is a performance in seconds — you cannot scrub a handshake.
       AMENDED 2026-08-26 (CONV-02). This line read "~116 ms" from when it was
       written until now, and 116.5 ms was right at b711a0a, where Inspire's
       LAND_ON and LAND_GATE_RISE were 0.18 and 0.20. TIMING-01 retimed them
       to 0.20 and 0.14 and the figure did not travel with them. On those
       constants the gate ran 1 - e^(-COPY_IN_K t) with COPY_IN_K above, so
       the first ember's onset was at -ln(1 - 0.20)/2.4 = 93.0 ms and its
       full bloom at -ln(1 - 0.34)/2.4 = 173.1 ms: 80.2 ms of saturation.
       AMENDED AGAIN 2026-08-26 (INSPIRE-ONSET, owner report #35), and this
       time the figure DID travel, because the retiming was built to carry
       it. Inspire's sequence was moved 49.1 ms earlier by scaling every gate
       COMPLEMENT by λ = 1.125 — LAND_ON 0.20 -> 0.10, LAND_GATE_RISE 0.14 ->
       0.1575 — which on an exponential gate is a rigid translation in time
       and therefore leaves every DURATION alone. The onset is now
       -ln(1 - 0.10)/2.4 = 43.9 ms and the full bloom -ln(1 - 0.2575)/2.4 =
       124.1 ms: 80.2 ms of saturation, the same span between two earlier
       instants. So the "~80 ms" four lines above stands, and it stands for a
       reason rather than by luck — had RISE been left at 0.14 while LAND_ON
       moved, which is the obvious way to make a sequence start sooner, this
       would now read 70.4 ms and the sentence would have gone stale for the
       second time in one week.
       THE ARGUMENT FOR formMs IS UNAFFECTED, and if anything stronger — 80 ms
       is MORE of a pop than 116, not less, so the case for performing the
       formation in seconds is made by the smaller number. Recomputed on every
       run by tools/test-declared-conversions.mjs (EM-SATURATE); nothing else
       in the tree computes this quantity, which is why it could go stale in
       silence. formMs
       governs `revealDirect` chips (Inspire's three); a `revealScrub` chip's
       formation is its hub's own kindle swell, paced by the same beatGapMs
       floor in the chapter.

   Both are FLOORS under `min(scene, performed)` in advanceReveal (for the
   chips that keep the envelope — see above): a marker may arrive LATER than
   the scene event it annotates, never earlier; its departure is scene-locked
   at any speed (the `min` takes the falling gate); and dt = 0 snaps the
   performance to its end, so a frozen capture, a `?p=` deep link and a
   `?capture=` still are settled by construction.

   THE TEMPO IS CHOSEN (2026-08-24). Three candidates lived here as a tasting
   flag (`?arrival=swift|paced|grand`, ICON-ARRIVAL) with a standing order to
   collapse the table once the owner decided. The owner chose `grand` — the
   ceremonial reading: 540 ms between onsets, 700 ms of formation on Inspire
   (three deliberate acts, the third still settling as the copy finishes
   breathing in), and a hard pass through Connect playing its light window in
   ~2.3 s — the nav replay's own pace, hubs landing with their labels ON
   them. The URL read is deleted with the table, so every visitor, fixture
   and capture URL now gets this one tempo. The other two candidates and the
   measured onsets that separated them are preserved in docs/code-health/
   evidence/2026-08-21-elegance-run-01/icon-arrival/README.md.

   DEPARTURES DO NOT READ THIS TABLE, deliberately (LABEL-EXIT, 2026-08-24).
   An arrival is a performance; a departure is a release. Every departure a
   visitor can cause is gate-locked (the label leaves under its scene
   ceiling — see hotspot-frame.js, THE RELEASED DEPARTURE), and the only
   clock a gate-open departure gets is HOTSPOT_OUT_K above — NOT a number
   derived from this tempo, because a marker that took `grand`'s 700 ms to
   leave would linger over the copy it is suppressed behind and outstay the
   frame a modal detail has claimed. The asymmetry is the house's own:
   COPY_OUT_K releases in ~0.15 s what copy arrival takes seconds to breathe
   in. */
export const HOTSPOT_ARRIVAL = { beatGapMs: 540, formMs: 700 };

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
