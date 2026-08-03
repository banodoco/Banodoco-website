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
// `rest` is the chapter-local position of the resting pose. It is REST_POSE
// (mid-chapter) everywhere except Mission, whose rest is the frozen hero pose
// at the very start of the range - the camera must not have moved at all when
// a #/mission deep link or a cold load settles (06-mission-preservation.md).
export const CHAPTERS = [
  { id: 'mission', start: 0.00, end: 0.14, nav: 'Mission', rest: 0.00 },
  { id: 'inspire', start: 0.14, end: 0.38, nav: 'Inspire' },
  { id: 'connect', start: 0.38, end: 0.60, nav: 'Connect' },
  { id: 'owned',   start: 0.60, end: 0.85, nav: 'Owned'   },
  // The epilogue is not a sixth peer chapter: it keeps a route (#/final) but
  // Owned stays the highlighted nav entry throughout the pullback (v6).
  { id: 'final',   start: 0.85, end: 1.00, nav: null      },
];

export const CHAPTER_IDS = CHAPTERS.map(c => c.id);

// Chapter-local progress band in which copy and node labels are shown, and
// within which a chapter counts as "at rest" for deep links and captures.
export const REST_LO = 0.20;
export const REST_HI = 0.80;

// Where a deep link or nav click lands inside a chapter.
export const REST_POSE = 0.50;

export function chapterAt(p) {
  for (const c of CHAPTERS) if (p <= c.end) return c;
  return CHAPTERS[CHAPTERS.length - 1];
}

export function localProgress(p, c) {
  const t = (p - c.start) / (c.end - c.start);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export function restProgress(id) {
  const c = CHAPTERS.find(c => c.id === id);
  return c ? c.start + (c.end - c.start) * (c.rest ?? REST_POSE) : 0;
}

/* ------------------------------------------------------------------ */
/* Scroll model (GB-3) - settled by the grey-box, logged at the motion */
/* review. See GREYBOX-DECISIONS.md for the reasoning behind each.     */
/* ------------------------------------------------------------------ */
// Scroll distance ALLOCATED PER CHAPTER, in viewport heights. This is the
// felt length of each chapter and is deliberately decoupled from the p spans
// above (which parameterise MOTION, not effort): scroll -> p is piecewise
// linear across these allocations, so re-timing a camera leg never changes
// how far the visitor has to scroll, and vice versa.
// Sized from the ORBIT, which is the slowest thing in the journey: Spike A
// played it over 20 s and the review note was "slower, constant angular feel".
// In a scrub the visitor sets the pace, so the allocation has to make an
// ordinary scroll (~800 px/s) produce roughly a 4-5 s, ~40 deg/s orbit. That
// fixes Inspire at 7.5 vh, and the other chapters are scaled to it by how much
// camera work each one carries.
//
// Mission is deliberately NOT the shortest allocation even though it holds a
// static pose for its first ~30%: the orbit starts inside the Mission range
// (p 0.04), so a tight Mission allocation makes the first third of the orbit
// travel faster than the rest. Measured: 3.5 vh keeps the whole swing within
// ~10% of one angular rate.
export const SCROLL_VH = {
  mission: 3.5,   // ~1 vh of hero hold, then the restrained flow toward the cap
  inspire: 7.5,   // the longest single move - the ~172 deg orbit
  connect: 4.5,   // slip-under, the chamber, the lateral to the junction
  owned:   5.0,   // stipe descent, soil crossing, the glide
  final:   3.5,   // rise + recession
};                // total ~24 vh

// Virtual scroll (no native scroll surface: the hero page stays
// overflow:hidden, so nothing about hero layout or rendering changes).
export const SNAP_ENGAGE_MS   = 160;   // input-idle before magnetism engages
export const SNAP_K           = 3.4;   // spring constant, 1/s, toward the rest
export const SNAP_BAND        = 0.30;  // capture band, x chapter scroll length
export const SNAP_DEAD_P      = 0.0015;// closer than this, settle exactly
export const WHEEL_LINE_PX    = 16;    // deltaMode 1 -> px
export const TOUCH_GAIN       = 1.35;  // touch drag feels shorter than wheel
export const KEY_STEP_PX      = 110;   // arrow keys
// Commit resolution (G3 motion note): idling anywhere must resolve to a rest —
// there is no p where stopping leaves you parked between chapters. While input
// is live the model stays fully scrubbed and reversible; only on idle does the
// position glide (through the SAME smoothing/limiter pipeline as a real
// scroll) to the rest the direction rule picks. See scroll.js `commitTarget`.
export const COMMIT_THRESHOLD  = 0.35; // fraction of the inter-rest p-span,
                                       // measured from the rest being LEFT (in
                                       // the direction of travel), past which
                                       // idle commits onward instead of back.
                                       // 0.35 < 0.5 is the deliberate forward
                                       // bias: "push forward most of the time".
export const COMMIT_GLIDE_RATE = 0.10; // p/s cruise — ~2x a calm read scroll,
                                       // ~4.5x under MAX_SCRUB_RATE, so the
                                       // glide is assured but never a fling
export const COMMIT_BLEND_K    = 6.0;  // 1/s — the glide's rate eases from the
                                       // INHERITED gesture rate toward cruise
                                       // (exponential blend). The glide does not
                                       // ramp from standstill: it seeds with the
                                       // perceived rate at engage, so the commit
                                       // carries the visitor's own motion to
                                       // completion instead of stop-then-restart.
                                       // ~63% of the gap closed in 165 ms, ~95%
                                       // by 0.5 s — same felt attack as the old
                                       // 0.35 s smoothstep ramp, minus the pause.

// Fast scroll must take the SAME accelerated path, never a cut: the smoothed
// progress is speed-limited, so a flung trackpad still traverses every frame
// of the route (just quickly). An ordinary scroll runs at ~0.05 p/s against
// the allocations above, so this leaves ~9x headroom - fast reads as fast,
// never as a jump, and the limiter never engages during normal reading.
// Full journey minimum traverse ~= 2.2 s.
export const MAX_SCRUB_RATE   = 0.45;  // p units per second

// Absolute-p windows in which each chapter's DOM copy is shown. These are
// NOT the constants.js rest band: copy may only appear once the composition
// has come to rest and created its negative space (GB-3.3), which happens
// later inside a chapter than the generic REST_LO.
export const COPY_BANDS = {
  mission: { lo: -1,    hi: 0.042 },
  inspire: { lo: 0.248, hi: 0.338 },
  connect: { lo: 0.476, hi: 0.548 },
  owned:   { lo: 0.716, hi: 0.792 },
  final:   { lo: 0.914, hi: 2 },
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
// Hotspot labels arrive AFTER the copy has re-anchored, one at a time, in the
// chapter's narrative reveal order — never as a simultaneous pop.
export const HOTSPOT_STAGGER_MS = 150;
export const HOTSPOT_IN_K       = 3.2;
export const HOTSPOT_OUT_K      = 9.0;

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
// Brief, pure-in-p fog thickenings centred on the two physical crossings the
// path makes: T2 (the rim shadow closes over the lens as the camera slips
// under the cap) and T3 (substrate swallows the frame on the soil crossing).
// Multiplicative dips on near/far; zero at every rest anchor, perfectly
// reversible. T1 stays purely a streaming trigger (ADR: no visual), T4's
// crossing is carried by the fog ramp opening below.
export const SEAM_FOG_DIPS = [
  { c: 0.436, w: 0.035, near: 0.26, far: 0.34 },  // T2 slip-under
  { c: 0.693, w: 0.026, near: 0.46, far: 0.52 },  // T3 soil crossing
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
export const FOG_RAMP = {
  far:  62, farFromP:  0.78,  farToP:  0.945,
  near: 15, nearFromP: 0.835, nearToP: 0.955,
};

/* ------------------------------------------------------------------ */
/* Streaming seams (adr-d3-world-layout.md section 4)                  */
/* ------------------------------------------------------------------ */
// Predicates are evaluated against the HERO's coordinate space. The world
// measurements themselves are never duplicated here - they are read at
// runtime from sceneApi.consts, because mushroom-scene.js owns them.
export const THRESHOLDS = [
  { id: 'rear-cap',      arms: 'inspire', kind: 'azimuth', deltaDeg: 100 },
  { id: 'cap-occludes',  arms: 'connect', kind: 'under-cap' },
  { id: 'soil-line',     arms: 'owned',   kind: 'below-ground' },
  { id: 'rise-cutaway',  arms: 'final',   kind: 'above-ground-outbound', minP: 0.85 },
];

// Hysteresis so a shaky scrub cannot strobe the streamer.
export const THRESHOLD_HYSTERESIS_WORLD = 0.15;  // world units
export const THRESHOLD_HYSTERESIS_DEG   = 8;     // degrees, for the azimuth seam
export const THRESHOLD_MIN_DWELL_MS     = 250;   // before a reverse crossing retires anything

/* ------------------------------------------------------------------ */
/* Motion / state smoothing                                            */
/* ------------------------------------------------------------------ */
export const SMOOTH_K       = 6.5;  // progress smoothing, free scrubbing
export const SMOOTH_K_FLIGHT = 10;  // during a nav-triggered flight
export const FLIGHT_BASE_S   = 1.4; // flight duration = BASE + SPAN * distance
export const FLIGHT_SPAN_S   = 4.0;

/* ------------------------------------------------------------------ */
/* Hero handshake                                                      */
/* ------------------------------------------------------------------ */
// Kept in sync with the ENTRY choreography in index.html's CSS.
export const HERO_INTRO_MS = 7600;
export const DEEP_LINK_DETAIL_DELAY_MS = 600; // settle at the pose, then open
