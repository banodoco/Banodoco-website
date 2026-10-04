/* ==================================================================== *
 * organism/hero-spores.js — THE PRELUDE: a through-current of spores,
 * a few that take root, and the ground that answers them.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IMPORTS NOTHING HEAVY.
 * The hero copy and the navigation are legible about one animation frame
 * after the parser reaches index.html's entry barrier. The mushroom is
 * not: `three.module.js` alone is 1.27 MB, and until the whole static
 * graph behind main.js has arrived and evaluated there is nothing in the
 * right-hand half of the frame but an empty WebGL clear. Measured on a
 * 6x-CPU / slow-network cold load that gap runs to tens of seconds.
 *
 * So the atmosphere is decoupled from the organism. Every import in this
 * module is a LEAF with no imports of its own — journey/boot/hero-mode.js
 * for the viewport modes, organism/performance.js and flags.js for the one
 * number sizeCanvas() needs, organism/network-skeleton.js for the ground
 * data — and it is loaded by its OWN <script type="module"> in
 * index.html, ahead of main.js. It therefore paints as soon as its own
 * graph has arrived, in parallel with — not behind — the 1.8 MB the
 * scene needs. THE RULE THIS GRAPH LIVES UNDER: nothing that imports
 * `three`, and nothing that imports something that does.
 *
 * THE CHOREOGRAPHY (hero-loading v3), in the order a visitor reads it:
 *
 *   STREAM    a broad current of spores is already crossing the page on
 *             first paint: in from off-screen top-left, through the upper
 *             and middle hero — at reduced brightness behind the copy —
 *             and OUT past the right edge. Most spores belong to that
 *             larger world and simply pass through. Three depth bands,
 *             ONE WIND — a coherent gust field with gusts and lulls that
 *             the whole river breathes with — gentle per-particle curl,
 *             and a few brighter HERO spores riding inside the flow, the
 *             same grain as the mushroom's own shed, only lit harder.
 *   SETTLING  during a lull, a hero spore riding low in the current loses
 *             lift and FLUTTERS down — a slow falling-leaf descent with
 *             lateral sway, decelerating into a soft settle at one of the
 *             real ground network's own points (site 0 IS the mushroom
 *             origin). Its glow swells as it settles — ignition is a
 *             landing, not a strike — and the warmth pools under it. The
 *             rest of the current keeps travelling right past it: the
 *             landings are chance, not a schedule the sky obeys.
 *   NETWORK   each landing wakes an island of the PreNetwork — a sparse,
 *             dim skeleton of the REAL ground web (network-skeleton.js),
 *             filaments creeping outward from the impact while the
 *             stream still moves above. Once two islands are awake,
 *             faint pulses run the spine paths between them.
 *   HANDOFF   when the journey is prepared, a brightness pulse runs the
 *             spine paths inward and the intro is released as it reaches
 *             the origin — the real ground web radiates out from under the
 *             fading skeleton (organism/intro.js draws it outward over the
 *             same beat) and the mushroom grows from the same spot. One
 *             continuous event, not a crossfade between two worlds.
 *
 *   The machine is elastic, not a five-second movie. sceneReady can
 *   arrive at any time: landings compress rather than skip, causality
 *   (cloud -> landing -> ground -> convergence) is always preserved, and
 *   a slow load holds gracefully — the current keeps flowing (every
 *   recycle is a fresh draw, so it never reads as a loop), occasional
 *   extra spores peel away and land, and the woken network breathes.
 *
 * WHAT THIS SUPERSEDES (R4's overture), stated per piece:
 *   - the converging land-at-the-spot stream: the biggest correction —
 *     the current no longer terminates at the mushroom site. Most of it
 *     exits off-screen right; one ordinary stream spore can land.
 *   - the traveling amber light: replaced by the hero-spore landings.
 *     A repeating light aimed at the spot both pre-marked the target
 *     ("no ghost") and read as a finished loop waiting on a slow load.
 *   - the pre-lit breathing pool: the ground is earned by impact now.
 *     The pools exist but stay dark until a spore lands on them.
 *   - the ambient washes: the general back/right warmth is now the
 *     page's own constant `.spill` (hero.css), lit from the first paint
 *     ("meaningful darkness, never dead" — it marks nothing); the
 *     landing-zone ground wash fades in WITH the network's activation
 *     instead of preceding it.
 *   - the ignition contract survives with new semantics: handoff.js asks
 *     preludeMsUntilStrike() when the journey is ready, the convergence
 *     pulse is armed to arrive exactly then, and preludeStrike() fires
 *     as the intro releases.
 *
 * THE TWO HALVES, AND THE ONE LAW BETWEEN THEM.
 *
 *   heroSpores              a dependency-free WebGL layer on its own
 *                           canvas, above #stage — the singleton this
 *                           module exports and self-starts. Draws the
 *                           stream (points) and the PreNetwork (lines).
 *                           The stream half lives until the scene exists
 *                           and crossfades to the scene's own Points; the
 *                           network half lives on until the strike, then
 *                           the canvas releases its context: there is no
 *                           permanent second renderer.
 *   createHeroSporeField()  the SAME particles, rebuilt as a THREE.Points
 *                           inside the organism's scene through ctx's own
 *                           makePoints — so they inherit the bloom, the
 *                           film grade, the tap pulse and the fog that the
 *                           mushroom's own shed has. Called by
 *                           organism.js. Takes no `three` import: the
 *                           builder comes down on `ctx`.
 *
 * Both run `advance()` over the same `(a, b, d)` state in the same frozen
 * camera frame, so the handoff moves no particle — and because the
 * landing choreography lives INSIDE advance(), on the field itself, a
 * spore that is mid-peel across the seam keeps its arc to the pixel.
 *
 * THE FRAME IS CAMERA-RELATIVE AND THEN FROZEN, and that is the whole
 * trick. A particle is stored as `(a, b, d)`: two offsets across the hero
 * camera's view plane and one depth along its forward axis. At handoff
 * the basis is FROZEN at the hero pose and every later position is
 * derived through it, so the field is world-static from then on: the
 * journey's camera flies away from it and finds it again on the way
 * back, exactly as it does the mushroom's own shed. The landing sites
 * and the skeleton are WORLD points (network-skeleton.js) pushed through
 * the same camera, which is what makes the prelude's ground and the
 * loaded scene's ground the same place on screen.
 *
 * WHAT IS DELIBERATELY THE SAME AS organism/spores.js, one for one:
 *   size draw      Math.pow(rand(), 1.8) * 0.072 + 0.019
 *   tone draw      0.64 + Math.pow(rand(), 1.9) * 0.36   (through heat())
 *   base speed     0.028 + rand() * 0.055
 *   sprite         the 64px radial gradient makeGlowTexture() bakes,
 *                  evaluated analytically from its four stops
 *   size law       psize * twinkle * (300 / depth) * (1 + 1.35 * blur),
 *                  with the MIN_PT 1.7 floor and its area dimming. Both
 *                  sides state it in DEVICE pixels, so when the two
 *                  renderers are on different device grids this layer
 *                  re-expresses the floored size on its own — same CSS
 *                  size, same subset floored (§ sizeCanvas)
 *   twinkle        0.85 + 0.15 * sin(time * 1.4 + seed * 7)
 *   depth-of-field blur = |depth - 9.5| / 8, swelling the sprite and
 *                  dimming it by 1 - 0.55 * blur
 *   fog            the scene's own FOG_NEAR 7.0 / FOG_FAR 20
 *   blending       additive, no depth write
 *
 * WHAT IS DELIBERATELY DIFFERENT: direction (a through-current riding
 * the same left-to-right wind with a gentle descent, entering off the
 * top-left and leaving past the right edge), restraint (opacity 1.05
 * against the shed's 2.4 — "the headline remains dominant and calm" —
 * plus a measured extra dimming where the current crosses the hero
 * copy's own box), and the landing choreography above, which the shed
 * does not have.
 * ==================================================================== */

import { createHeroMode } from '../journey/boot/hero-mode.js';
// Both leaves, both import-free, and both here for ONE number: the pixel ratio
// the scene's renderer will be built with. See sizeCanvas() for why this layer
// has to know it. (PIN_PR is parsed once, in ../flags.js — THE flag registry.)
import { createPixelRatioPolicy } from './performance.js';
import { PIN_PR, CAPTURE, INTROAT, NOINTRO, PRELUDE_THREAD } from '../flags.js';
// The PreNetwork's shared ground data — world-space polylines extracted from
// the REAL ground web, and the three points the hero spores land on. A leaf.
import { LANDING_SITES, SKELETON } from './network-skeleton.js';

/* ---------------------------------------------------------------- *
 * COMPOSITION — the through-current. One aim per viewport mode.
 * ---------------------------------------------------------------- *
 * THE SPEC'S FIRST LAW (hero-loading v3 §2): the first frame must read
 * as a living current passing THROUGH the world, not particles aimed at
 * a target. The stream is authored in the streamline coordinate: every
 * particle travels a near-shared NDC slope (`fall` x aspect — the depth
 * cancels, because a world step scales x and y by the same 1/depth), so
 * a particle is identified for all time by `q`: the NDC height it will
 * have when it reaches `xOut`. Both edges of the run are OFF-SCREEN —
 * xIn past the left edge, xOut past the right — so the current enters
 * already in motion, exits still in motion, and the recycle teleport
 * happens where nobody can see it. Every respawn takes fresh draws, so
 * however long the scene takes, the field never reads as a loop.
 *
 *   nA     ambient spore count — the current's tiny bodies. Above the
 *          spec's ~300-700 desktop STARTING point, deliberately: judged
 *          against the reference renders, 700 still read as a starfield,
 *          and the spec's own words are "the exact count is secondary to
 *          the perception of a continuous moving volume". Two draw
 *          calls, no textures — the budget holds.
 *   nH     reserved midground stream slots, drawn from the same size and
 *          light family as ambient spores; landing selection reads the whole
 *          stream so no separate visible landing cast is introduced.
 *   land   how many of the hero spores peel away and land.
 *   xIn    NDC x a particle enters at (off-frame upper-left)
 *   xOut   NDC x the recycle fires at (off-frame right)
 *   e      [lo, hi] NDC y ENTRY window, measured AT xIn. The current is
 *          authored as a fan: it pours in through this window off the
 *          top-left, and each particle's own `fall` spreads the body as
 *          it crosses — dense and coherent upstream, feathered and wide
 *          downstream, the way the reference cloud reads. Both draws are
 *          bell-shaped, so the current has a body and no rims.
 *   fall   [lo, hi] world descent per unit of rightward travel (NDC
 *          slope is fall x aspect), drawn per particle. Shallow on
 *          landscape — a drift, not a dive; steeper on portrait so the
 *          diagonal still reads on a frame taller than it is wide.
 *   depth  [near, far] view depth in world units, split into three
 *          bands by BANDS below.
 *   gain   speed multiplier over the shed's own base draw. Far above the
 *          shed's own 2.2: a CURRENT has to read as travel, not twinkle
 *          — the near band crosses at ~60 px/s at 1440x900, the far band
 *          drifts, and the spread is most of the depth cue.
 *   dpr    pixel-ratio ceiling for THIS layer
 *   lum    per-mode light scale on the ambient bodies. 1 on desktop —
 *          the full weather — and under 1 on the portrait modes, whose
 *          narrower sky puts the same current much closer to the copy.
 *
 * Every aim below was set by shooting the mode and looking.
 */
const COMPOSITION = {
  // 1440x900. The current pours in over the headline's shoulder, fans
  // across the upper and middle of the frame, and leaves at the right
  // edge. The lower-right quarter — where the mushroom will stand —
  // stays meaningfully dark until the landings light it.
  // Counts were raised again (1450 -> 2900 on desktop) when the grain was
  // brought down to the scene's own size family: the weather the owner
  // approved is carried by NUMBER and LIGHT now, not by oversized bodies
  // — the reference river is dense and fine-grained, and so is the shed
  // this current must read as one species with.
  desktop: {
    nA: 2900, nH: 8, land: 1, xIn: -1.42, xOut: 1.42, e: [0.50, 1.14],
    fall: [0.10, 0.28], depth: [6.2, 15.5], gain: 6.0, dpr: 2, lum: 1,
  },
  // Landscape under aspect 1.55 — iPads on their side, narrow laptop
  // windows. Same reading, a shade steeper for the shorter frame.
  deskNarrow: {
    nA: 2600, nH: 8, land: 1, xIn: -1.42, xOut: 1.42, e: [0.50, 1.12],
    fall: [0.12, 0.32], depth: [6.2, 15.5], gain: 6.0, dpr: 2, lum: 1,
  },
  // Short landscape (a phone on its side; a very shallow window).
  compact: {
    nA: 850, nH: 5, land: 1, xIn: -1.40, xOut: 1.40, e: [0.46, 1.06],
    fall: [0.08, 0.26], depth: [6.2, 15.0], gain: 5.2, dpr: 1.5, lum: 0.9,
  },
  // iPad portrait, 744x1133. Steeper: from the upper-left edge across
  // the copy column's shoulder and out the right side above the specimen.
  // Portrait has less sky, so the weather is scaled back (`lum`): full
  // desktop light over a narrower band would swamp the column of copy.
  tablet: {
    nA: 950, nH: 6, land: 1, xIn: -1.36, xOut: 1.38, e: [0.58, 1.16],
    fall: [0.35, 0.80], depth: [6.5, 15.5], gain: 4.8, dpr: 1.5, lum: 0.85,
  },
  // Phone portrait, 430x932. The steepest and sparsest — the current
  // crosses the copy column (few dots, dimmed by the corridor) and exits
  // right at mid-height. Never snowfall.
  mobile: {
    nA: 620, nH: 5, land: 1, xIn: -1.34, xOut: 1.36, e: [0.58, 1.18],
    fall: [0.50, 1.05], depth: [6.5, 15.5], gain: 4.4, dpr: 1.5, lum: 0.8,
  },
};

/* The three depth bands (spec §2: "at least three depth bands"). Fractions
 * of the ambient population, each with its own slice of the composition's
 * depth range and its own light/speed scale — tiny dim distant bodies, a
 * denser midground flow, and a few blurred foreground passers-by. `d0/d1`
 * are fractions of [depth.near, depth.far]; `lum` scales the seeded colour
 * (not the draw — same dust, carrying less light); `vel` scales speed. */
const BANDS = [
  // `size` scales the size draw — and it is now a PARITY knob, not a
  // weather knob. Measured off the loaded scene at 1440x900 (thr-40 blob
  // sweep over the shed's own drift grain): the scene's dust bodies sit
  // at ~1.1 px median equivalent diameter, p90 ~3.5-4.4 px. The previous
  // multipliers (far 2.05 / mid 1.35) rendered this current at a 5.35 px
  // MEDIAN — the owner's "way larger than the ones coming from the
  // mushroom", and a size discontinuity at the adoption seam, since these
  // are the very particles the scene inherits. The far multiplier below
  // is depth compensation only: psize x 1.28 x (300 / ~12.9) lands the
  // far band's rendered pixels on the shed's own family; the midground
  // rides the shed draw untouched; the near passers-by are allowed to
  // render modestly larger through nothing but their closeness (300/d and
  // the DOF swell — no multiplier). The weather that the bigger bodies
  // used to carry is restored by COUNT (nA) and LIGHT (`lum`), which is
  // how the reference river reads: dense and fine-grained, never chunky.
  // The far band's floored sprites pay the 1.7-px area dimming, so its
  // luminance leads — many dim fine bodies summing into a cloud.
  { share: 0.50, d0: 0.52, d1: 0.92, lum: 2.60, vel: 0.80, size: 1.28 }, // far haze
  { share: 0.38, d0: 0.18, d1: 0.52, lum: 2.30, vel: 1.00, size: 1.0 },  // the body
  { share: 0.12, d0: 0.00, d1: 0.18, lum: 1.25, vel: 1.20, size: 1.0 },  // near, blurred
];
// Reserved midground stream slots use the same particle family as the shed.
const HERO_DEPTH = [0.20, 0.40];    // fractions of the depth range: midground
// The current dims as it travels: brightness eases off across the run so
// the upstream body reads denser than the feathered downstream fan — the
// reference cloud's own falloff — while every particle still visibly
// crosses the right edge at well over half its light. Applied in
// advance(). (0.45 on the first pass; the reference river stays bright
// through most of its run, so the falloff was gentled with the bands.)
const TRAVEL_DIM = 0.32;
// A gentle curl — the transverse ripple that keeps the body of the
// current from reading as ruled lines.
const WOB_AMP = 0.055;              // world units of transverse ripple
const WOB_FREQ = [0.35, 1.0];       // Hz range, drawn per particle
// The coherent gust field (see advance's header): the wave's depth over
// the shared gust, and the lift the whole river breathes with. 0.72 is
// the gust functions' own working mean on both sides of the seam.
const GUST_WAVE = 0.24;             // spatial gust wave over the shared gust
const GUST_LIFT = 0.30;             // world units/s of lift at full gust swing

// The scene's own fog, from organism/renderer.js's createRendererSetup.
// Named here rather than imported because importing it would pull `three`
// and this module's whole reason to exist is that it does not.
const FOG_NEAR = 7.0, FOG_FAR = 20;
// organism/organism.js builds the shed with makePoints(..., 2.4). The
// brief's words are "the headline remains dominant and calm", and one
// global gain is the honest knob for that.
const OPACITY = 1.05;
// Extra dimming where the current crosses the hero copy's own box —
// spec §2: travel BEHIND the text at reduced alpha rather than cutting a
// hole around it. The box is measured off the live .hero element
// (readCopyBox), the falloff is soft, and the factor keeps the dots
// legible as weather while the words stay unmistakably in front.
const QUIET_DIM = 0.55;

/* ---- the wind-settle choreography's clock table (field seconds) ------
 * Nominal windows from the spec §5: arrival 0.2-1.2, landings 0.8-2.2,
 * ground response 1.6-3.5, handoff 2.5-5.0 — read as targets for the
 * FIRST SETTLE, not for a scheduled dive. `PEEL_AT` opens each settle's
 * window; the settle itself waits for the wind: it begins at the next
 * LULL of the gust field (bounded by LULL_WAIT so the elastic clock
 * still holds), because a spore that loses lift when the wind drops is
 * CHANCE, and a spore that departs on a timer is a stunt. When
 * sceneReady arrives early the remaining settles COMPRESS (RATE_FAST)
 * rather than skip — "accelerate the next landing rather than hard-cut". */
const PEEL_AT = [0.65, 1.85, 3.15];
/* THE SETTLE IS UNHURRIED (2026-10-04, Hannah: the spore that travels to the
 * ground should come "from closer and move a little slower, it currently
 * feels too hectic"). It was picked up to 0.85 NDC upwind of its site and up
 * to 1.3 above it, then hauled in over ~1.1 s on a ready scene (the
 * compression divided its flutter by 1.6) with 2.4 sway swings — a long,
 * fast, wagging arc. It is now picked from just upwind and not far above
 * (UPWIND below), floats down over ~2 s whatever the scene is doing, and
 * sways one and a half times: a seed being set down, not thrown. */
const FLUT_S = [2.05, 2.25, 2.40];  // base flutter durations, priced by drop
const FLUT_MIN_S = 1.85;        // the shortest a settle may be, compressed or not
const LULL_THR = 0.60;          // the wind is a lull below this gust value
const LULL_WAIT = 0.9;          // longest a ripe settle waits for its lull
const SWAY_CYC = 1.5;           // falling-leaf sway cycles per descent
const SWAY_AMP = 0.13;          // world units of lateral sway at the widest
const BLOOM_IN_U = 0.74;        // the settling spore's glow swells from here
/* THE CHOSEN SPORE IS SEEN BEFORE IT FALLS (2026-10-03 — Hannah: the spore
 * that plants the mushroom "is supposed to light up... but it doesn't light
 * up in a visual way"). It used to jump from stream light to 1.45x in ONE
 * frame as its descent began — on a ~2 px sprite, inside a current of
 * hundreds — so the eye never found it, and its light then stepped down
 * again (2.4 -> 1.62) on the impact frame. Now it is chosen a beat early and
 * KINDLES while still riding the current: its light rises and its tone warms
 * toward white-hot, so the visitor has picked it out of the river before it
 * loses lift. It carries that light down, swells as it settles, and its
 * collapse starts from exactly the light it arrived with. Light and tone
 * only — size and motion stay the shed's own, so the handoff seam and the
 * "no bespoke cast member" rule both hold. */
const KINDLE_S = 0.80;          // the chosen spore catches the light in the stream
const KINDLE_FAST_S = 0.45;     // ...shorter when a ready scene compresses the settle
const KINDLE_LIGHT = 2.4;       // the light it carries through its descent
const LAND_LIGHT = 3.3;         // ...swelling to this as it settles
const KINDLE_HEAT = 0.55;       // how far its tone warms toward white-hot
const LAND_HEAT = 0.80;         // ...and how far by the moment it lands
const HOT_TONE = 0.99;          // the heat() stop "white-hot" means
const LAND_COLLAPSE_S = 0.55;   // the landed spore's light sinks into the ground
const RESPAWN_S = 2.6;          // then the spent hero slot retires permanently
const RATE_FAST = 1.9;          // compression when the scene is already ready
const EXTRA_PEEL_S = 5.4;       // elastic hold: occasional extra landings
// The settle glow: a landing swells a soft bloom at the site and the
// ground around it glimmers awake outward at the filaments' own creeping
// pace — an ignition, never a strike. (These slots were the impact
// flash + spark ring; same parked banks, same draw call, re-timed.)
const RING_N = 9;               // 1 bloom + 8 ground glimmers per settle
const RING_BANKS = 2;           // two settles may overlap in the elastic hold
const RING_S = 0.90;            // seconds of settle-glow life
const RING_R = 0.62;            // world radius the glimmers reach
// The descent carries NO comet trail. The v3 intensity pass strung
// embers along the peel bezier because a 1-second dive needed a tail to
// be legible; a 2-second flutter is followable on its own, and a comet
// grammar fights the weightless read the settle now lives on. The parked
// slots STAY — same points buffer, same draw call, dark — so the
// draw-call and uniform pins hold without accounting games; a future
// shimmer wake can light them again if the film asks for one.
const TRAIL_N = 12;             // parked slots per bank (dark; see above)
const TRAIL_BANKS = 3;          // concurrent descents (compression overlaps)
// The ground's own tempo: how fast a woken island's filaments creep
// outward, and the handoff pulse's run to the origin.
const NET_GROW_V = 1.15;        // world units / second of filament creep
const NET_MIN_S = 0.15;         // brief ground response before growth starts
const CONV_S = 0.35;             // short handoff pulse; the web keeps growing
const POOL_FADE_S = 0.80;       // one landing pulse fades when growth starts
const NET_EXIT_S = 1.35;        // skeleton fade under the real web's draw-on

/* ---------------------------------------------------------------- *
 * THE PALETTE, IN THE WORKING COLOR SPACE.
 * ---------------------------------------------------------------- *
 * organism/random.js's heat() lerps five THREE.Colors. three r169 has
 * ColorManagement enabled, so `new THREE.Color(0x421c05)` converts
 * sRGB -> Linear-sRGB on construction and lerpColors() interpolates in
 * linear. Reproducing that here — rather than lerping the hexes — is
 * what makes a preload spore and a scene spore the same colour.
 */
const PALETTE_SRGB = [0x421c05, 0xb96b1c, 0xf5a63c, 0xffdfae, 0xfff3e0];
const HEAT_STOPS = [0, 0.35, 0.65, 0.88, 1];

function srgbToLinear(c) {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

const PALETTE_LINEAR = PALETTE_SRGB.map((hex) => [
  srgbToLinear(((hex >> 16) & 255) / 255),
  srgbToLinear(((hex >> 8) & 255) / 255),
  srgbToLinear((hex & 255) / 255),
]);

/** organism/random.js heat(), in linear space, writing into `out`. */
function heatLinear(t, out, at) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  let i = 0;
  while (i < 3 && x >= HEAT_STOPS[i + 1]) i++;
  const lo = PALETTE_LINEAR[i], hi = PALETTE_LINEAR[i + 1];
  const f = (x - HEAT_STOPS[i]) / (HEAT_STOPS[i + 1] - HEAT_STOPS[i]);
  out[at] = lo[0] + (hi[0] - lo[0]) * f;
  out[at + 1] = lo[1] + (hi[1] - lo[1]) * f;
  out[at + 2] = lo[2] + (hi[2] - lo[2]) * f;
}

/* ---------------------------------------------------------------- *
 * THE FIELD — construction and integration. One law, both renderers.
 * ---------------------------------------------------------------- */

/** The same LCG family as the hero's own rand (organism/random.js) on its
 *  own seed, so this field can never consume a draw from the scene's
 *  deterministic stream. Every geometry in organism.js is positioned off
 *  that stream in construction order; one extra draw would move all of it. */
function makeRng(seed) {
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  // Read or restore the generator's position, so a field that crosses a
  // thread (fieldSnapshot / adoptSnapshot) keeps drawing the same future.
  rand.state = (v) => { if (v !== undefined) s = v >>> 0; return s; };
  return rand;
}

/** Resolve the hero camera's view-plane geometry for a mode. Reads
 *  journey/boot/hero-mode.js's own tables — never a second copy of them.
 *  `createHeroMode()` is a pure factory: `viewFor` and `resolve` are the
 *  only things touched here, and neither mount() nor adopt() is called,
 *  so nothing is published to <body> from this module. */
function readView(heroMode) {
  const mode = heroMode.resolve();
  const v = heroMode.viewFor(mode);
  return {
    mode,
    // organism/renderer.js: position (0.15 + panX, camY, camZ), target
    // (panX, targetY, 0), and the hero's camAzimuth is 0.
    camX: 0.15 + v.panX, camY: v.camY, camZ: v.camZ,
    tgtX: v.panX, tgtY: v.targetY,
    tanHalfFov: Math.tan(v.fov * Math.PI / 360),
    aspect: innerWidth / innerHeight,
  };
}

/** The camera's orthonormal basis at the hero pose: forward, right, up. */
function basisOf(view) {
  let fx = view.tgtX - view.camX, fy = view.tgtY - view.camY, fz = -view.camZ;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  /* right = normalize(forward x worldUp), AND THE SIGN IS THE WHOLE FILE.
     This shipped as (fz, 0, -fx) — the NEGATED cross product — and because
     `up` below is derived from `right`, both axes came out flipped and the
     adopted field was POINT-REFLECTED THROUGH THE SCREEN CENTRE. Measured
     on the seam frame at 1440x900: the on-screen band jumped 87px DOWN and
     98px right, individual particles moved a median 974px, and the drift
     reversed from +21.2px/1.5s (left to right) to -21.2px (right to left)
     — the owner's report, both halves of it, from one minus sign. Corrected,
     the two projections of the same particle agree to 0.000px at desktop,
     430x932 and 744x1133 alike. See the parity note in project(). */
  let rx = -fz, ry = 0, rz = fx;          // cross(f, (0,1,0)) = (-fz, 0, fx)
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  // up = right x forward
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  return { fx, fy, fz, rx, ry, rz, ux, uy, uz };
}

/** WORLD -> the camera's view-plane frame `(a, b, d)`. The exact inverse
 *  of project() in createHeroSporeField — same basis, same origin — which
 *  is what makes a landing site or a skeleton vertex authored in world
 *  coordinates land on the same pixel in both renderers. */
function worldToFrame(view, B, x, y, z, out, at) {
  const px = x - view.camX, py = y - view.camY, pz = z - view.camZ;
  out[at] = px * B.rx + py * B.ry + pz * B.rz;
  out[at + 1] = px * B.ux + py * B.uy + pz * B.uz;
  out[at + 2] = px * B.fx + py * B.fy + pz * B.fz;
}

/** Seed (or re-seed) one STREAM particle — ambient or hero. `atEntry`
 *  places it on the inflow edge (the recycle case); otherwise it is
 *  scattered along the stream, which is what makes the composition
 *  complete on the very first painted frame instead of sweeping in from
 *  the corner while somebody reads it. Ring slots never come through
 *  here after construction; their light is choreography (advance). */
function seedOne(F, i, c, rand, atEntry) {
  const i3 = i * 3;
  const hero = i >= F.nA && i < F.nA + F.nH;
  const ring = i >= F.nA + F.nH;
  const x = atEntry ? c.xIn : c.xIn + (c.xOut - c.xIn) * rand();
  // THE STREAM HAS NO EDGE. A uniform draw across [lo, hi] gives it two
  // visible rims and reads as a beam; three summed draws give an
  // Irwin-Hall bell, so occupancy tapers to nothing at the band's limits
  // and the current has a body and no boundary. Same trick, same reason,
  // as the release arc's single-peaked density in organism/spores.js.
  const bell = (rand() + rand() + rand() - 1.5) / 1.5;
  // THE FAN: entry height and descent are two independent bell draws — the
  // current pours through a coherent window at the top-left and spreads as
  // it crosses, dense upstream and feathered downstream. `q` stores the
  // ENTRY height: with `fallJ` it is the particle's streamline identity.
  // A CORE within the fan: 62% of the bodies draw from a tighter window
  // high in the entry band, so the current has a legible river running
  // its middle with haze feathered around it — a moving volume with a
  // spine, not an even wash.
  const core = rand() < 0.62;
  const eMid = core ? c.e[0] + (c.e[1] - c.e[0]) * 0.62 : (c.e[0] + c.e[1]) / 2;
  const eHalf = (c.e[1] - c.e[0]) * (core ? 0.19 : 0.5);
  const e0 = eMid + bell * eHalf;
  const bell2 = (rand() + rand() + rand() - 1.5) / 1.5;
  const fMid = core ? c.fall[0] + (c.fall[1] - c.fall[0]) * 0.45 : (c.fall[0] + c.fall[1]) / 2;
  const fHalf = (c.fall[1] - c.fall[0]) * (core ? 0.22 : 0.5);
  const fallJ = fMid + bell2 * fHalf;
  // band assignment: hero spores ride the midground; ambient spores draw
  // their band from BANDS' shares. Ring slots sit parked at depth 10.
  let dLo, dHi, lum = 1, vel = 1, szMul = 1, band = 3;
  if (hero) {
    dLo = HERO_DEPTH[0]; dHi = HERO_DEPTH[1];
  } else if (ring) {
    dLo = 0.3; dHi = 0.3;
  } else {
    const r = rand();
    band = r < BANDS[0].share ? 0 : r < BANDS[0].share + BANDS[1].share ? 1 : 2;
    ({ d0: dLo, d1: dHi, lum, vel, size: szMul } = BANDS[band]);
  }
  const span = c.depth[1] - c.depth[0];
  const depth = c.depth[0] + span * (dLo + (dHi - dLo) * rand());
  const y = e0 - fallJ * F.aspect * (x - c.xIn);
  const halfH = depth * F.tanHalfFov;
  F.frame[i3] = x * halfH * F.aspect;
  F.frame[i3 + 1] = y * halfH;
  F.frame[i3 + 2] = depth;
  F.q[i] = e0;
  F.fallJ[i] = fallJ;
  F.band[i] = ring ? 4 : band;
  F.fade[i] = ring ? 0 : 1;
  // Every stream slot uses the shed's own size, tone, and speed family. A
  // landing becomes followable through its descent light, never by growing
  // a bespoke cast member or changing its motion.
  F.size[i] = ring ? 0.030 : (Math.pow(rand(), 1.8) * 0.072 + 0.019) * szMul;
  F.tone[i] = ring ? 0.78 + rand() * 0.14 : 0.64 + Math.pow(rand(), 1.9) * 0.36;
  F.speed[i] = (0.028 + rand() * 0.055) * c.gain * vel;
  F.seed[i] = rand() * Math.PI * 2;
  F.wobF[i] = WOB_FREQ[0] + (WOB_FREQ[1] - WOB_FREQ[0]) * rand();
  heatLinear(F.tone[i], F.color, i3);
  // The river carries more light than its haze: core bodies get a lift
  // over their band's own luminance, so the spine of the current is what
  // the eye reads first. Landing light is applied during descent, so the
  // ordinary stream particle remains continuous until it peels away.
  const lg = ring ? 1 : lum * (c.lum || 1) * (core ? 1.25 : 1);
  F.color[i3] *= lg; F.color[i3 + 1] *= lg; F.color[i3 + 2] *= lg;
  F.attrsDirty = true;
}

/** Settle-glow slot construction: the bloom is a larger, warm sprite;
 *  the ground glimmers are small embers. All parked dark until a settle
 *  claims them. */
function seedRings(F, rand) {
  for (let b = 0; b < RING_BANKS; b++) {
    for (let k = 0; k < RING_N; k++) {
      const i = F.nA + F.nH + b * RING_N + k;
      const i3 = i * 3;
      F.size[i] = k === 0 ? 0.115 : 0.032 + rand() * 0.018;
      F.tone[i] = k === 0 ? 0.97 : 0.78 + rand() * 0.14;
      F.seed[i] = rand() * Math.PI * 2;
      F.fade[i] = 0;
      F.band[i] = 4;
      heatLinear(F.tone[i], F.color, i3);
      F.frame[i3] = 0; F.frame[i3 + 1] = 0; F.frame[i3 + 2] = 10;
    }
  }
}

/** Trail slot construction: parked ember slots, dark for the whole run —
 *  the flutter descent carries no comet tail (see the TRAIL_N note). They
 *  are still seeded with real sizes and tones so the buffers, the draw
 *  call and the attribute census stay exactly as the pins expect. */
function seedTrails(F, rand) {
  for (let b = 0; b < TRAIL_BANKS; b++) {
    for (let k = 0; k < TRAIL_N; k++) {
      const i = F.nA + F.nH + RING_BANKS * RING_N + b * TRAIL_N + k;
      const i3 = i * 3;
      F.size[i] = 0.130 - k * 0.0070 + rand() * 0.010;
      F.tone[i] = 0.80 + rand() * 0.12;
      F.seed[i] = rand() * Math.PI * 2;
      F.fade[i] = 0;
      F.band[i] = 4;
      heatLinear(F.tone[i], F.color, i3);
      F.frame[i3] = 0; F.frame[i3 + 1] = 0; F.frame[i3 + 2] = 10;
    }
  }
}

/** The landing sites and each site's ring-spark end points, in frame
 *  coordinates. Recomputed on reframe: world -> frame is affine, so a
 *  spark's flight can interpolate between two projected endpoints. */
function frameAnchors(F, view) {
  const B = basisOf(view);
  for (let s = 0; s < LANDING_SITES.length; s++) {
    const [x, y, z] = LANDING_SITES[s];
    worldToFrame(view, B, x, y, z, F.sites, s * 3);
    for (let k = 0; k < RING_N - 1; k++) {
      const a = (k / (RING_N - 1)) * Math.PI * 2 + s * 0.7;
      worldToFrame(view, B,
        x + Math.cos(a) * RING_R, y, z + Math.sin(a) * RING_R * 0.8,
        F.ringEnds, (s * (RING_N - 1) + k) * 3);
    }
  }
}

/** Build the field for the current composition. */
function createField(view, seed) {
  const c = COMPOSITION[view.mode] || COMPOSITION.desktop;
  const rand = makeRng(seed);
  const n = c.nA + c.nH + RING_BANKS * RING_N + TRAIL_BANKS * TRAIL_N;
  const F = {
    n, nA: c.nA, nH: c.nH, comp: c, rand,
    tanHalfFov: view.tanHalfFov,
    aspect: view.aspect,
    frame: new Float32Array(n * 3),      // (a, b, d) in the camera's view plane
    color: new Float32Array(n * 3),      // linear working-space rgb (unfaded base)
    size: new Float32Array(n),
    tone: new Float32Array(n),
    speed: new Float32Array(n),
    seed: new Float32Array(n),
    q: new Float32Array(n),
    // Each particle's world descent per unit of rightward travel. A world
    // step of (1, -fallJ) becomes (1 / (halfH * aspect), -fallJ / halfH)
    // in NDC, so the on-screen slope is fallJ * aspect and the depth
    // cancels — one aim at every depth, breathed by SLOPE_JIT.
    fallJ: new Float32Array(n),
    // The choreography's light multiplier: 1 for the stream, the collapse
    // ramp for a landed spore, the burst envelope for ring slots. Both
    // renderers multiply it into the light, so the seam carries it too.
    fade: new Float32Array(n),
    wobF: new Float32Array(n),
    band: new Uint8Array(n),
    // frame-space anchors: the three landing sites and their spark ends
    sites: new Float32Array(LANDING_SITES.length * 3),
    ringEnds: new Float32Array(LANDING_SITES.length * (RING_N - 1) * 3),
    // ---- the elastic choreography's state, ON the field, so whichever
    // renderer is integrating carries it forward ----
    t: 0,
    sceneReady: false,
    released: false,
    retired: new Uint8Array(n),
    landings: [],          // {hi, site, tPeel, dur, state, p0, p3, swayA, phase, impactAt}
    rings: [],             // {site, bank, t0}
    ringBank: 0,
    lastImpactAt: -1,
    firstImpactAt: -1,
    nextExtraAt: -1,
    attrsDirty: true,
    cutoffApplied: false,
  };
  frameAnchors(F, view);
  for (let i = 0; i < c.nA + c.nH; i++) seedOne(F, i, c, rand, false);
  seedRings(F, rand);
  seedTrails(F, rand);
  frameAnchors(F, view);
  planLandings(F);
  return F;
}

/** The initial landing plan: one ordinary stream spore peels at PEEL_AT
 *  (site 0 — the mushroom origin). */
function planLandings(F) {
  F.landings.length = 0;
  for (let k = 0; k < F.comp.land; k++) {
    F.landings.push({
      hi: F.nA + k, site: k % LANDING_SITES.length,
      tPeel: PEEL_AT[k], dur: FLUT_S[k],
      state: 0, impactAt: 0, swayA: SWAY_AMP, phase: 0,
      p0: [0, 0, 0], p3: [0, 0, 0],
    });
  }
}

/** Re-frame an existing field for a new viewport without re-seeding it:
 *  the particles keep their identity and their streamline, the aim is
 *  re-read for the new mode, and the composition follows the frame. */
function reframe(F, view) {
  const c = COMPOSITION[view.mode] || COMPOSITION.desktop;
  const oldAspect = F.aspect;
  const oldTanHalfFov = F.tanHalfFov;
  // Crossing a breakpoint re-aims the whole field: each particle's own
  // descent survives, rescaled onto the new mode's fan, and its streamline
  // identity is re-derived so it still pours through the new entry window.
  const fallScale = (c.fall[0] + c.fall[1]) / (F.comp.fall[0] + F.comp.fall[1]);
  F.comp = c;
  F.tanHalfFov = view.tanHalfFov;
  F.aspect = view.aspect;
  for (let i = 0; i < F.nA + F.nH; i++) {
    const i3 = i * 3;
    const d = F.frame[i3 + 2];
    const halfH = d * oldTanHalfFov;
    const xPrev = F.frame[i3] / (halfH * oldAspect);
    // hold each particle on its own streamline, re-derived in the new frame
    const e0 = Math.min(c.e[1], Math.max(c.e[0], F.q[i]));
    const x = Math.min(c.xOut, Math.max(c.xIn, xPrev));
    F.q[i] = e0;
    F.fallJ[i] *= fallScale;
    F.frame[i3] = x * halfH * F.aspect;
    F.frame[i3 + 1] = (e0 - F.fallJ[i] * F.aspect * (x - c.xIn)) * halfH;
  }
  frameAnchors(F, view);
  // a spore mid-flutter re-aims at the site's new frame: the descent
  // restarts from where the spore is, over the time it had left
  for (const L of F.landings) {
    if (L.state === 1 && L.aimed) {
      aimFlutter(F, L, F.frame, L.hi * 3);
      L.dur = Math.max(0.5, L.dur - (F.t - L.t0));
      L.t0 = F.t;
    }
  }
}

/** Claim a visible spore riding UPSTREAM of this patch of ground — to its
 *  left, in the wind's own direction (2026-10-03 — Hannah: the spore "should
 *  be from the left side, it should feel like it's been blown down by the
 *  wind"). The wind keeps carrying it right while it loses lift, so the
 *  settle reads as weather delivering it, not a drop from overhead. If the
 *  river has nothing upstream right now, a spore nearly overhead will do;
 *  a missing candidate delays the settle and never recruits a distant one. */
const UPWIND = [0.10, 0.48];    // NDC x the spore rides left of its site
const UPWIND_AIM = 0.26;        // ...preferring about this far
function pickPeeler(F, site) {
  const s3 = site * 3;
  const sxN = F.sites[s3] / (F.sites[s3 + 2] * F.tanHalfFov * F.aspect);
  const syN = F.sites[s3 + 1] / (F.sites[s3 + 2] * F.tanHalfFov);
  // three tiers, best first: upwind; overhead (never downwind of the site
  // unless nothing else is in the sky — a spore drifting LEFT onto its site
  // is flying against the wind every other particle rides); then anything.
  const best = [-1, -1, -1], bestScore = [Infinity, Infinity, Infinity];
  const offer = (tier, i, score) => {
    if (score < bestScore[tier]) { bestScore[tier] = score; best[tier] = i; }
  };
  for (let i = 0; i < F.nA + F.nH; i++) {
    if (F.retired[i] || heldByLanding(F, i)) continue;
    const i3 = i * 3;
    const halfH = F.frame[i3 + 2] * F.tanHalfFov;
    const xN = F.frame[i3] / (halfH * F.aspect);
    const yN = F.frame[i3 + 1] / halfH;
    const drop = yN - syN;
    if (xN < -0.92 || xN > 1 || Math.abs(yN) > 1 || drop < 0.03) continue;
    // Prefer the current's own body: a far-haze spore is fogged and
    // area-dimmed, a near one is a defocused blur — either makes the one
    // particle the visitor is meant to follow the hardest one to see.
    const bandCost = F.band[i] === 0 || F.band[i] === 2 ? 0.35 : 0;
    const lead = sxN - xN;
    // the stream runs high on the left (it descends as it travels), so an
    // upwind settle is allowed a longer fall than an overhead one
    if (lead >= UPWIND[0] && lead <= UPWIND[1] && drop >= 0.12 && drop <= 0.85) {
      offer(0, i, Math.abs(lead - UPWIND_AIM) + 0.6 * Math.abs(drop - 0.45) + bandCost);
    } else if (lead >= -0.10 && lead < UPWIND[0] && drop <= 0.80) {
      offer(1, i, Math.hypot(lead, drop) + bandCost);
    } else if (Math.abs(lead) <= 0.45 && drop <= 0.80) {
      offer(2, i, Math.hypot(lead, drop) + bandCost);
    }
  }
  return best[0] >= 0 ? best[0] : best[1] >= 0 ? best[1] : best[2];
}

/** The flutter: aim a settle from the spore's current position down to
 *  its site. There is no dive and no bezier any more — the descent is a
 *  falling leaf: the spore loses lift, sinks with a decaying lateral
 *  sway, and decelerates into the settle. The path is authored, not
 *  steered: the sway envelope is zero at both ends, so the spore leaves
 *  exactly from its streamline and arrives exactly at the site, and the
 *  wind's remaining carry (p0 -> site, eased off as it descends) is what
 *  closes the horizontal gap — which stays small, because pickPeeler
 *  chooses a spore already hanging nearly above the site. Returns the
 *  descent's frame-space drop, which prices the flutter's duration. */
function aimFlutter(F, L, src, srcAt) {
  const s3 = L.site * 3;
  L.p0[0] = src[srcAt]; L.p0[1] = src[srcAt + 1]; L.p0[2] = src[srcAt + 2];
  L.p3[0] = F.sites[s3]; L.p3[1] = F.sites[s3 + 1]; L.p3[2] = F.sites[s3 + 2];
  // the sway plane scales with the drop: a short settle sways narrow
  L.swayA = SWAY_AMP * Math.min(1.25, Math.max(0.55,
    (L.p0[1] - L.p3[1]) / (0.55 * L.p0[2] * F.tanHalfFov)));
  L.phase = F.seed[L.hi];
  // the velocity the current was carrying it at (frame units / s, at the
  // wind's working mean) — the descent leaves with it, so there is no kink
  // where the spore stops being stream and starts being settle
  const v = F.speed[L.hi] * 0.72;
  L.v0x = v;
  L.v0y = -v * F.fallJ[L.hi];
  // the PATH prices the flutter now: an upwind settle travels as well as falls
  return Math.max(0.001, Math.hypot((L.p3[0] - L.p0[0]) * 0.6, L.p0[1] - L.p3[1]));
}

/** Where a settling spore is at descent parameter u — one closed form,
 *  evaluated by both renderers through advance(). Blown down, not dropped:
 *  each axis is a cubic Hermite that LEAVES at the stream velocity the spore
 *  was riding (v0, scaled by the duration) and ARRIVES at rest on its site.
 *  Horizontally the wind's carry leads — it keeps drifting right and eases
 *  off; vertically the lift dies late, so the fall gathers as the carry
 *  fades — the curve of a seed the wind sets down. On top rides the
 *  falling-leaf sway, zero at both ends, with a small vertical bob at each
 *  swing's end. */
const FLUT_POS = [0, 0, 0];   // flutterAt's per-frame scratch
function hermite(p0, p1, m0, u) {
  const u2 = u * u, u3 = u2 * u;
  return p0 * (2 * u3 - 3 * u2 + 1) + p1 * (3 * u2 - 2 * u3) + m0 * (u3 - 2 * u2 + u);
}
function flutterAt(F, L, u, out) {
  const ph = SWAY_CYC * 6.2832 * u + L.phase;
  const env = Math.sin(Math.PI * u);
  const sway = L.swayA * 0.6 * Math.sin(ph) * Math.pow(env, 0.7);
  const dx = L.p3[0] - L.p0[0];
  // tangent = velocity x duration; capped so a short carry never overshoots
  const mx = Math.min((L.v0x || 0) * L.dur, Math.max(0, 1.6 * dx));
  const my = Math.max((L.v0y || 0) * L.dur, -0.5 * Math.abs(L.p0[1] - L.p3[1]));
  out[0] = hermite(L.p0[0], L.p3[0], mx, u) + sway;
  out[1] = hermite(L.p0[1], L.p3[1], my, u)
    + L.swayA * 0.22 * Math.cos(2 * ph) * env;
  const s = u * u * (3 - 2 * u);
  out[2] = L.p0[2] + (L.p3[2] - L.p0[2]) * s;
}

/** Advance the whole field by `dt` seconds under `gust`. This is the one
 *  integrator; the preload canvas and the scene-side Points both call it,
 *  which is why the handoff cannot move a particle — and why a landing
 *  that happens across the seam is the same landing on both sides.
 *
 *  THE WIND IS ONE WIND. `gust` is the frame's shared gust value
 *  (preloadGust before the scene, the organism's breeze after), and it
 *  reaches every particle through the same local law: a slow wave
 *  traveling with the flow (GUST_WAVE) so a gust visibly MOVES through
 *  the river, and a lift term (GUST_LIFT) so the whole current rises a
 *  little under a gust and sags in a lull. That shared breath is what
 *  lets a settle read as CAUSED: the river slackens, and a spore that
 *  was riding low happens to lose its lift. */
function advance(F, dt, gust) {
  const c = F.comp;
  const step = Math.min(dt, 0.05);
  F.t += step;
  const rate = F.sceneReady ? RATE_FAST : 1;

  // Apply the release cutoff once, at the release boundary. Any stream
  // particle already outside the viewport cannot be allowed to drift back
  // into view; particles currently visible are left alone to finish their
  // natural path. Active landing particles are excluded so an in-progress
  // visible settle keeps its causality.
  if (F.released && !F.cutoffApplied) {
    for (let i = 0; i < F.nA + F.nH; i++) {
      if (F.retired[i] || heldByLanding(F, i)) continue;
      const i3 = i * 3;
      const halfH = F.frame[i3 + 2] * F.tanHalfFov;
      const xNdc = F.frame[i3] / (halfH * F.aspect);
      const yNdc = F.frame[i3 + 1] / halfH;
      if (xNdc < -1 || xNdc > 1 || yNdc < -1 || yNdc > 1) {
        F.retired[i] = 1;
        F.fade[i] = 0;
      }
    }
    F.cutoffApplied = true;
  }

  // ---- the stream: ambient + hero spores not currently settling ----
  for (let i = 0; i < F.nA + F.nH; i++) {
    const i3 = i * 3;
    if (F.retired[i] || (F.band[i] === 3 && pinnedByLanding(F, i))) continue;
    const d = F.frame[i3 + 2];
    const halfH0 = d * F.tanHalfFov;
    const xN0 = F.frame[i3] / (halfH0 * F.aspect);
    // the local wind: the shared gust, waved through the current
    const wind = gust * (1 + GUST_WAVE * Math.sin(xN0 * 1.9 - F.t * 0.55 + d * 0.20));
    const v = F.speed[i] * wind * step;
    F.frame[i3] += v;
    F.frame[i3 + 1] -= v * F.fallJ[i];
    // the river breathes with the wind: lift under gusts, sag in lulls —
    // one coherent swell, not per-particle noise
    F.frame[i3 + 1] += (wind - 0.72) * GUST_LIFT * step;
    // gentle curl: a bounded transverse ripple (the derivative of a sine,
    // so it never walks a particle off its streamline's neighbourhood)
    F.frame[i3 + 1] += Math.cos(F.t * F.wobF[i] * 6.28 + F.seed[i]) * WOB_AMP * F.speed[i] * step * 9;
    // The shed's wind carries 0.17 of z per unit of x, toward the viewer.
    // Keeping it here is what stops the stream reading as a flat plane.
    F.frame[i3 + 2] = Math.max(c.depth[0] * 0.8, d - v * 0.17);
    const halfH = F.frame[i3 + 2] * F.tanHalfFov;
    const xNdc = F.frame[i3] / (halfH * F.aspect);
    // The current dims across its run — upstream body, downstream feather
    // (TRAVEL_DIM) — but never below half light: every ambient spore is
    // still visibly travelling when it crosses the right edge. Hero spores
    // keep full light; the eye is meant to hold onto them.
    if (F.band[i] < 3) {
      const u = Math.min(1, Math.max(0, (xNdc - c.xIn) / (c.xOut - c.xIn)));
      F.fade[i] = 1 - TRAVEL_DIM * u * u * (3 - 2 * u);
    }
    // Once growth begins this is a finite cloud: departing spores stay gone.
    if (xNdc > c.xOut) {
      if (F.released) {
        F.retired[i] = 1;
        F.fade[i] = 0;
      } else seedOne(F, i, c, F.rand, true);
    }
  }

  // ---- the settles ----
  for (const L of F.landings) {
    if (L.state === 3) continue;
    if (L.state === 0) {
      // compression: a ready scene pulls the remaining settles forward
      if (rate > 1 && L.tPeel > F.t + 0.15) L.tPeel = F.t + 0.15;
      // A RIPE SETTLE WAITS FOR ITS LULL. tPeel opens the window; the
      // descent begins when the shared gust actually drops (LULL_THR) —
      // the wind slackens, the river sags, and one low-riding spore
      // happens to lose its lift. The wait is bounded (LULL_WAIT) so the
      // elastic clock holds, and compression skips it entirely: a ready
      // scene gets its causality at pace, not a meteorology lesson.
      if (F.t >= L.tPeel
          && (rate > 1 || gust < LULL_THR || F.t >= L.tPeel + LULL_WAIT)) {
        // THE SETTLE CHOOSES ITS SPORE AT THE LAST MOMENT: whichever free
        // stream spore is riding low, close to the site — the one
        // for whom losing lift RIGHT NOW would deliver it here. A fixed
        // cast member could be anywhere, and a spore hauled in from the
        // far corner is a meteor, exactly the grammar the spec rules out.
        const peeler = pickPeeler(F, L.site);
        if (peeler < 0 || F.released) continue;
        L.hi = peeler;
        L.state = 1;
        // claimed now, falling after the kindle: t0 is when the descent
        // starts, and until then the stream keeps carrying the spore
        L.kAt = F.t;
        L.t0 = F.t + (rate > 1 ? KINDLE_FAST_S : KINDLE_S);
        L.aimed = false;
        kindleBegin(F, L);
      }
      continue;
    }
    const hi3 = L.hi * 3;
    if (L.state === 1 && F.t < L.t0) {
      // KINDLING: the stream loop above has already moved it and written
      // its ordinary light; rise from that light, so the pick is seamless
      const k = smooth01((F.t - L.kAt) / (L.t0 - L.kAt));
      F.fade[L.hi] += (KINDLE_LIGHT - F.fade[L.hi]) * k;
      kindleTint(F, L, KINDLE_HEAT * k);
      continue;
    }
    if (L.state === 1) {
      if (!L.aimed) {
        // the descent leaves from wherever the current has carried it
        L.aimed = true;
        const drop = aimFlutter(F, L, F.frame, hi3);
        const halfH = F.frame[hi3 + 2] * F.tanHalfFov;
        // priced by the DROP, not the arc: a flutter is mostly descent
        L.dur = L.dur * Math.min(1.25, Math.max(0.85, (drop / halfH) / 0.45));
        if (rate > 1) L.dur = L.dur / 1.15;
        L.dur = Math.max(FLUT_MIN_S, L.dur);
      }
      const u = Math.min(1, (F.t - L.t0) / L.dur);
      flutterAt(F, L, u, FLUT_POS);
      F.frame[hi3] = FLUT_POS[0];
      F.frame[hi3 + 1] = FLUT_POS[1];
      F.frame[hi3 + 2] = FLUT_POS[2];
      // it carries the kindled light down with a soft shimmer on its own
      // sway beat (a leaf catching the light as it turns), and the glow
      // swells AS it settles — ignition is a landing, not a strike
      const sb = u > BLOOM_IN_U ? (u - BLOOM_IN_U) / (1 - BLOOM_IN_U) : 0;
      const sw = sb * sb;
      F.fade[L.hi] = KINDLE_LIGHT
        + 0.22 * Math.sin(2 * (SWAY_CYC * 6.2832 * u + L.phase)) * Math.sin(Math.PI * u)
        + (LAND_LIGHT - KINDLE_LIGHT) * sw;
      kindleTint(F, L, KINDLE_HEAT + (LAND_HEAT - KINDLE_HEAT) * sw);
      if (u >= 1) {
        L.state = 2;
        L.impactAt = F.t;
        L.landFade = F.fade[L.hi];
        F.lastImpactAt = F.t;
        if (F.firstImpactAt < 0) F.firstImpactAt = F.t;
        spawnRing(F, L.site);
        if (ground && !ground.gone) ground.wake(L.site, F.t);
      }
      continue;
    }
    // state 2: the light sinks slowly into the ground it just woke —
    // from the swollen brightness the settle arrived at — and then the
    // The selected stream slot retires with its light spent in the soil.
    const since = F.t - L.impactAt;
    // from exactly the light it landed with — no step on the impact frame
    const sink = Math.max(0, 1 - since / LAND_COLLAPSE_S);
    F.fade[L.hi] = (L.landFade || LAND_LIGHT) * sink * sink;
    if (since > RESPAWN_S) {
      L.state = 3;
      F.retired[L.hi] = 1;
      F.fade[L.hi] = 0;
    }
  }

  // ---- the elastic hold: occasional extra peels while nothing releases —
  // the world stays alive on a slow load without ever restarting ----
  if (!F.released && F.firstImpactAt >= 0
      && F.landings.every((L) => L.state >= 2)) {
    if (F.nextExtraAt < 0) {
      F.nextExtraAt = F.t + EXTRA_PEEL_S * (0.8 + 0.4 * F.rand());
    } else if (F.t >= F.nextExtraAt) {
      F.nextExtraAt = -1;
      F.landings.push({
        hi: F.nA, site: (F.landings.length) % LANDING_SITES.length,
        tPeel: F.t + 0.1, dur: 2.2, t0: 0, state: 0, impactAt: 0,
        swayA: SWAY_AMP, phase: 0,
        p0: [0, 0, 0], p3: [0, 0, 0],
      });
    }
  }

  // ---- the settle glows ----
  for (let r = F.rings.length - 1; r >= 0; r--) {
    const R = F.rings[r];
    const u = (F.t - R.t0) / RING_S;
    const base = F.nA + F.nH + R.bank * RING_N;
    if (u >= 1) {
      for (let k = 0; k < RING_N; k++) F.fade[base + k] = 0;
      F.rings.splice(r, 1);
      continue;
    }
    const s3 = R.site * 3;
    // the bloom: a soft swell of warmth under the settled spore —
    // rising as the light sinks in, breathing back down. No flash: its
    // attack is slower than the collapse it answers, so the eye reads
    // one continuous handing-down of light, not an impact.
    F.frame[base * 3] = F.sites[s3];
    F.frame[base * 3 + 1] = F.sites[s3 + 1];
    F.frame[base * 3 + 2] = F.sites[s3 + 2];
    const swell = u < 0.24
      ? Math.sin((u / 0.24) * Math.PI / 2)
      : Math.cos(((u - 0.24) / 0.76) * Math.PI / 2);
    F.fade[base] = 1.05 * swell * swell;
    // the ground answers at its own pace: fixed glimmer points scattered
    // to RING_R light up in sequence as the filaments' creeping front
    // (NET_GROW_V — the same law the skeleton wakes under) passes them,
    // then sink with the bloom. Nothing flies: the ground is waking, not
    // being sprayed.
    const creep = (F.t - R.t0) * NET_GROW_V;
    const sink = Math.pow(1 - u, 1.2);
    for (let k = 1; k < RING_N; k++) {
      const i3 = (base + k) * 3;
      const e3 = (R.site * (RING_N - 1) + (k - 1)) * 3;
      const fk = 0.35 + 0.65 * ((k - 1) / (RING_N - 2));
      F.frame[i3] = F.sites[s3] + (F.ringEnds[e3] - F.sites[s3]) * fk;
      F.frame[i3 + 1] = F.sites[s3 + 1] + (F.ringEnds[e3 + 1] - F.sites[s3 + 1]) * fk;
      F.frame[i3 + 2] = F.sites[s3 + 2] + (F.ringEnds[e3 + 2] - F.sites[s3 + 2]) * fk;
      const litK = Math.min(1, Math.max(0, (creep - fk * RING_R) / 0.30));
      F.fade[base + k] = 0.60 * litK * sink;
    }
  }
}

function heldByLanding(F, i) {
  for (const L of F.landings) {
    if (L.hi === i && (L.state === 1 || L.state === 2)) return true;
  }
  return false;
}

/** Held in place by its landing — descending or landed. A kindling spore is
 *  claimed (heldByLanding) but still rides the stream, so it is not pinned. */
function pinnedByLanding(F, i) {
  for (const L of F.landings) {
    if (L.hi === i && ((L.state === 1 && F.t >= L.t0) || L.state === 2)) return true;
  }
  return false;
}

const KINDLE_SCRATCH = [0, 0, 0];
/** Remember the claimed spore's own colour, and the white-hot it warms
 *  toward at the same luminance scale (its band's light). The slot retires
 *  after its landing and is never reseeded, so the tint never leaks. */
function kindleBegin(F, L) {
  const i3 = L.hi * 3;
  L.c0 = [F.color[i3], F.color[i3 + 1], F.color[i3 + 2]];
  heatLinear(F.tone[L.hi], KINDLE_SCRATCH, 0);
  const lg = KINDLE_SCRATCH[1] > 0 ? L.c0[1] / KINDLE_SCRATCH[1] : 1;
  heatLinear(HOT_TONE, KINDLE_SCRATCH, 0);
  L.cHot = KINDLE_SCRATCH.map((v) => v * lg);
}
function kindleTint(F, L, h) {
  const i3 = L.hi * 3;
  for (let c = 0; c < 3; c++) F.color[i3 + c] = L.c0[c] + (L.cHot[c] - L.c0[c]) * h;
}
function smooth01(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function spawnRing(F, site) {
  F.rings.push({ site, bank: F.ringBank, t0: F.t });
  F.ringBank = (F.ringBank + 1) % RING_BANKS;
}

/** The gust the shed rides, in the transitional layer only.
 *  organism/organism.js's `breeze()` IS the wind of this site and the
 *  migrated field below reads it directly off ctx. This is a stand-in for
 *  the seconds before that module exists — same working mean (0.72), and
 *  it stops being consulted the moment the scene does.
 *  Reshaped for the wind-settle grammar: two slow incommensurate cycles
 *  beat against each other under a light flutter, so the wind has real
 *  GUSTS (cresting ~1.06) and real LULLS (sagging ~0.38) every several
 *  seconds instead of a shallow shimmer — the lulls are when settling
 *  spores lose their lift (LULL_THR), and the crests are when the whole
 *  river visibly quickens and lifts (GUST_WAVE / GUST_LIFT). */
function preloadGust(t) {
  return 0.72 + 0.30 * Math.sin(t * 0.82 + 2.9) * Math.sin(t * 0.31 + 0.4)
    + 0.04 * Math.sin(t * 1.61);
}

/* ---------------------------------------------------------------- *
 * HALF ONE — the preload layer. No three, no post-processing, no
 * textures, two draw calls (the stream's points, the PreNetwork's lines).
 * ---------------------------------------------------------------- */

/* THE MISSING PASS IS THE BLOOM, AND IT HAS TO BE ANSWERED FOR.
   Measured: with the shed's numbers reproduced exactly — same size draw,
   same MIN_PT 1.7 floor, same area dimming — a sparse field renders as
   1-2px pinpricks and reads as a STARFIELD, which is the "snowfall or
   glitter" the brief rules out. The mushroom's own 4,200 dots carry the
   identical numbers and do not read that way for two reasons: they are
   dense enough to sum into a cloud, and they pass through
   UnrealBloomPass(0.62, 0.45, 0.1), which spreads every bright core into
   a soft halo. This layer has neither, and post-processing is exactly
   what the budget forbids in the preload path.

   So the halo is folded into the sprite instead of being a pass: the
   quad is drawn BLOOM_SPREAD times the sprite's own diameter, the
   gradient still occupies the inner 1/BLOOM_SPREAD of it (unchanged,
   which is the part that has to match), and a wide gaussian at
   BLOOM_GAIN carries the light the composer would have spread. One draw
   call, no target, no second pass — and the migrated field drops it
   because by then the real bloom is doing the work. */
const BLOOM_SPREAD = 5.0;
// Halo knobs retuned with the size-parity pass: at GAIN 0.21 / SIGMA 1.60
// the stand-in halo was most of a dot's rendered FOOTPRINT — the blob
// sweep showed the current's bodies at ~3x the scene grain even after the
// sprite sizes matched, because the composer's real bloom (radius 0.45)
// is far tighter than the halo stood in for. The weather lost with the
// tighter halo came back as count (COMPOSITION nA) and light (BANDS lum).
const BLOOM_GAIN = 0.14;
const BLOOM_SIGMA = 1.45;

/* THE GRADE'S TWO TERMS THAT TOUCH AN EMPTY FRAME, mirrored from
   journey/lens.js (GradeShader's uLift, its low-light `gain` and LOOK_BASE's
   vig) because this file may not import `three`. The scene never shows its
   raw clear colour: from its first frame it shows that colour LIFTED and
   amber-gained by the grade, then darkened toward the corners by the grade's
   vignette. This layer has to sit on that same frame — hero.css paints it as
   the page background (--scene-bg + the body vignette) and the shaders below
   add their light against it — or the scene's arrival re-tints the whole
   page in one step: the reported "filter that switches on a second after
   load" (2026-10-03: measured -2/-4/-3 per channel across the frame at the
   handoff). Change one of these in lens.js, change it here and in hero.css. */
const GRADE_LIFT = [0.0060, 0.0037, 0.0017];
const GRADE_LOW_GAIN = [1.055, 1.015, 0.945];
const GRADE_VIGNETTE = 0.34;
/** The scene's clear colour as the grade hands it to the tonemap (linear). */
function gradedBgLinear(srgbHex) {
  const lin = srgbHex.map((v) => srgbToLinear(v / 255));
  const lifted = lin.map((v, i) => GRADE_LIFT[i] + v * (1 - GRADE_LIFT[0]));
  const lum = 0.2126 * lifted[0] + 0.7152 * lifted[1] + 0.0722 * lifted[2];
  const k = 1 - Math.min(1, Math.max(0, lum * 1.6));
  return lifted.map((v, i) => v * (1 + (GRADE_LOW_GAIN[i] - 1) * k));
}
// The grade's vignette, evaluated per vertex on the NDC position: the same
// smoothstep over the same centred-uv radius lens.js uses, as a light factor.
const VIGNETTE_GLSL = `(1.0 - ${GRADE_VIGNETTE.toFixed(2)} * smoothstep(0.42, 0.95, length(gl_Position.xy * 0.5)))`;

const VERT = `
precision highp float;
attribute vec3 aFrame;   // (a, b, depth) in the hero camera's view plane
attribute vec3 aColor;
attribute vec2 aMeta;    // (size, seed)
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTime;
// This layer's device grid over the scene's — 1 when they agree. See
// sizeCanvas(): it is applied AFTER the floor, so the sprite this layer draws
// is the one the scene will draw, floored on the scene's grid and then
// re-expressed on this one.
uniform float uPxScale;
// The hero copy's box in NDC (x0, y0, x1, y1), measured off the live DOM.
// The current travels BEHIND the copy at reduced brightness — a soft dim,
// not a hole (spec §2). Degenerate box = no dimming.
uniform vec4 uQuiet;
varying vec3 vColor;
varying float vTw;
varying float vFog;
varying float vBlur;
varying float vShrink;
void main() {
  float depth = aFrame.z;
  float halfH = depth * uTanHalfFov;
  vColor = aColor;
  vTw = 0.85 + 0.15 * sin(uTime * 1.4 + aMeta.y * 7.0);
  vFog = clamp((${FOG_FAR.toFixed(1)} - depth) / ${(FOG_FAR - FOG_NEAR).toFixed(1)}, 0.0, 1.0);
  vBlur = clamp(abs(depth - 9.5) / 8.0, 0.0, 1.0);
  float sz = aMeta.x * vTw * (300.0 / depth) * (1.0 + 1.35 * vBlur);
  vShrink = 1.0;
  if (sz < 1.7) { vShrink = (sz * sz) / (1.7 * 1.7); sz = 1.7; }
  // The quad is enlarged to carry the halo the composer's bloom would put
  // around this sprite (see BLOOM_SPREAD in the fragment). The SPRITE is
  // unchanged: it occupies the inner 1/BLOOM_SPREAD of the quad, and the
  // fragment rescales gl_PointCoord back so the gradient is identical.
  gl_PointSize = sz * uPxScale * ${BLOOM_SPREAD.toFixed(1)};
  gl_Position = vec4(aFrame.x / (halfH * uAspect), aFrame.y / halfH, 0.0, 1.0);
  // the copy-corridor dim rides vShrink — it is a light multiplier too
  float S = 0.16;
  vec2 p = gl_Position.xy;
  float inQ = smoothstep(uQuiet.x - S, uQuiet.x + S, p.x)
            * (1.0 - smoothstep(uQuiet.z - S, uQuiet.z + S, p.x))
            * smoothstep(uQuiet.y - S, uQuiet.y + S, p.y)
            * (1.0 - smoothstep(uQuiet.w - S, uQuiet.w + S, p.y));
  vShrink *= 1.0 - ${QUIET_DIM.toFixed(2)} * inQ;
  // ...and so does the grade's vignette, which the scene applies to these
  // same spores the moment they migrate into it
  vShrink *= ${VIGNETTE_GLSL};
}`;

/* THE LIGHT IS ADDED AS A DELTA, NOT AS A COLOUR, and that is what keeps
   the seam invisible. The scene renders spores into a linear HDR target
   over its own background and tone-maps the SUM once. Tone-mapping a
   spore on its own and adding the result to an already-encoded page would
   over-report it — ACES lifts small values hard. So this shader computes
   what the real pipeline would produce for background+spore, subtracts
   what it produces for the background alone, and contributes exactly that
   difference through plus-lighter. A spore here lands on the pixel value
   it will land on after the migration. */
const FRAG = `
precision highp float;
varying vec3 vColor;
varying float vTw;
varying float vFog;
varying float vBlur;
varying float vShrink;
uniform float uOpacity;
uniform vec3 uBgLinear;
uniform vec3 uBgEncoded;
vec3 rrtAndOdtFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 encode(vec3 color) {
  // organism/renderer.js: ACESFilmicToneMapping, exposure 0.95, then the
  // renderer's sRGB output conversion. Both verbatim from three r169.
  const mat3 inMat = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 outMat = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602));
  color *= 0.95 / 0.6;
  color = outMat * rrtAndOdtFit(inMat * color);
  color = clamp(color, 0.0, 1.0);
  return mix(color * 12.92,
             1.055 * pow(max(color, 1e-5), vec3(0.41666)) - 0.055,
             step(vec3(0.0031308), color));
}
void main() {
  // organism/organism.js makeGlowTexture(): a 64px radial gradient with
  // stops at 0.00/1.0, 0.25/0.6, 0.60/0.12, 1.00/0.0. Evaluated rather
  // than sampled — same curve, no texture in the preload path. The radius
  // is rescaled by BLOOM_SPREAD so r <= 1 is the sprite proper and the
  // rest of the enlarged quad is the stand-in bloom halo.
  float r = length(gl_PointCoord - 0.5) * 2.0 * ${BLOOM_SPREAD.toFixed(1)};
  float a = r < 0.25 ? mix(1.0, 0.6, r / 0.25)
          : r < 0.60 ? mix(0.6, 0.12, (r - 0.25) / 0.35)
          : r < 1.00 ? mix(0.12, 0.0, (r - 0.60) / 0.40)
          : 0.0;
  a += ${BLOOM_GAIN.toFixed(3)} * exp(-(r * r) / ${(BLOOM_SIGMA * BLOOM_SIGMA).toFixed(3)});
  vec3 lin = vColor * a * vTw * uOpacity * vFog * vShrink * (1.0 - 0.55 * vBlur);
  vec3 delta = max(encode(uBgLinear + lin) - uBgEncoded, 0.0);
  gl_FragColor = vec4(delta, max(delta.r, max(delta.g, delta.b)));
}`;

/* The PreNetwork's own pair: thin additive lines, the same fog and the
   same delta-encode as the points so a skeleton strand lands on the pixel
   value the real web's strand will land on. All choreography — reveal,
   breath, pulses, the convergence run — is CPU-lit into aColor per frame
   (a few hundred vertices), so the shader stays this small. */
const LINE_VERT = `
precision highp float;
attribute vec3 aFrame;
attribute vec3 aColor;
uniform float uTanHalfFov;
uniform float uAspect;
varying vec3 vColor;
void main() {
  float halfH = aFrame.z * uTanHalfFov;
  float fog = clamp((${FOG_FAR.toFixed(1)} - aFrame.z) / ${(FOG_FAR - FOG_NEAR).toFixed(1)}, 0.0, 1.0);
  vColor = aColor * fog;
  gl_Position = vec4(aFrame.x / (halfH * uAspect), aFrame.y / halfH, 0.0, 1.0);
  vColor *= ${VIGNETTE_GLSL};
}`;

const LINE_FRAG = `
precision highp float;
varying vec3 vColor;
uniform vec3 uBgLinear;
uniform vec3 uBgEncoded;
vec3 rrtAndOdtFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 encode(vec3 color) {
  const mat3 inMat = mat3(
    vec3(0.59719, 0.07600, 0.02840),
    vec3(0.35458, 0.90834, 0.13383),
    vec3(0.04823, 0.01566, 0.83777));
  const mat3 outMat = mat3(
    vec3(1.60475, -0.10208, -0.00327),
    vec3(-0.53108, 1.10813, -0.07276),
    vec3(-0.07367, -0.00605, 1.07602));
  color *= 0.95 / 0.6;
  color = outMat * rrtAndOdtFit(inMat * color);
  color = clamp(color, 0.0, 1.0);
  return mix(color * 12.92,
             1.055 * pow(max(color, 1e-5), vec3(0.41666)) - 0.055,
             step(vec3(0.0031308), color));
}
void main() {
  vec3 delta = max(encode(uBgLinear + vColor) - uBgEncoded, 0.0);
  gl_FragColor = vec4(delta, max(delta.r, max(delta.g, delta.b)));
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('hero-spores shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function linkProgram(gl, vertSrc, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('hero-spores link: ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

/* The graceful static hero. If WebGL is refused — a blocked context,
   a driver the browser will not trust, a machine with no GPU left — the
   visitor gets a restrained painted atmosphere rather than an empty
   rectangle or a spinner: one low amber haze where the ground will be and
   one soft warm pool where the specimen will stand. It is also what stays
   on screen if the SCENE fails later, because nothing ever tells this
   layer to leave in that case. */
const STATIC_HAZE =
  'radial-gradient(ellipse 66% 30% at 62% 104%, rgba(214,142,58,0.085), transparent 72%),'
  + 'radial-gradient(ellipse 40% 44% at 64% 52%, rgba(226,160,74,0.045), transparent 74%)';

/** The stream's ENTRY ramp, in ms. Named because handOff() has to know it:
 *  the crossfade out of this layer is only complementary if the ramp INTO it
 *  has finished, so the number belongs to both and can drift out of neither. */
const ENTRY_MS = 900;
/** ...and its delay, which is the hero copy's own (hero.css: fade-on 0.9s
 *  ease 0.15s). index.html releases the copy in the same task as reveal()
 *  starts this ramp, so with the same duration, easing and delay the words
 *  and the weather are one fade, not two. */
const ENTRY_DELAY_MS = 150;

/** The field's seed — one number for the page, its worker and the scene, so
 *  every copy of the field is the same field. */
const PRELUDE_SEED = 0x5be1;

const LAYER_CSS = 'position:fixed;inset:0;z-index:0;pointer-events:none;'
  // The stream has to add light to the frame the way the shed does, not
  // paint over it. plus-lighter IS addition; screen is the fallback for
  // engines that lack it and is close enough on a field this dim.
  + 'mix-blend-mode:screen;mix-blend-mode:plus-lighter;'
  + `opacity:0;transition:opacity ${ENTRY_MS}ms ease ${ENTRY_DELAY_MS}ms;`;

/* ---------------------------------------------------------------- *
 * THE GROUND — the PreNetwork singleton: skeleton choreography, the
 * landing pools, and the ambient warmth. Module-scope because advance()
 * reports impacts into it from EITHER integrator, the way the old
 * overture took ticks from both drivers.
 * ---------------------------------------------------------------- *
 * The GL half (the skeleton lines) draws on the preload canvas; the DOM
 * half is the soft glows that CSS rasterises better than a shader
 * would (the general warmth across the frame is the page's constant
 * `.spill`, not part of this layer): a ground wash under the landing
 * zone that fades in WITH the
 * network's activation, and one pool per landing site that lights when
 * a spore strikes it. Nothing here marks the mushroom's spot before a
 * landing has earned it: no pre-lit pool, no traveling light, no
 * skeleton ink. The ground is earned by impact.
 */
const NET_ALPHA = 1.55;
const GROUND_FADE_S = 0.35;

let ground = null;

function createGround(view, reduced) {
  // ---- geometry: skeleton polylines -> line-segment buffers ----
  let segCount = 0;
  for (const pl of SKELETON) segCount += pl.p.length / 3 - 1;
  const nV = segCount * 2;
  const pos = new Float32Array(nV * 3);      // frame coords, refreshed on reframe
  const base = new Float32Array(nV * 3);     // heat(h) per vertex
  const lit = new Float32Array(nV * 3);      // per-frame choreographed light
  const dSite = new Float32Array(nV);        // world distance from the island's site
  const dOrig = new Float32Array(nV);        // world distance from site 0
  const island = new Uint8Array(nV);
  const spine = new Uint8Array(nV);
  {
    let v = 0;
    const c = [0, 0, 0];
    for (const pl of SKELETON) {
      const s = LANDING_SITES[pl.i];
      const npt = pl.p.length / 3;
      for (let k = 0; k < npt - 1; k++) {
        for (const kk of [k, k + 1]) {
          const x = pl.p[kk * 3], z = pl.p[kk * 3 + 2];
          heatLinear(pl.h * (0.85 + 0.3 * (kk / npt)), c, 0);
          base[v * 3] = c[0]; base[v * 3 + 1] = c[1]; base[v * 3 + 2] = c[2];
          dSite[v] = Math.hypot(x - s[0], z - s[2]);
          dOrig[v] = Math.hypot(x - LANDING_SITES[0][0], z - LANDING_SITES[0][2]);
          island[v] = pl.i;
          spine[v] = pl.s;
          v++;
        }
      }
    }
  }
  function projectAll(vw) {
    const B = basisOf(vw);
    let v = 0;
    for (const pl of SKELETON) {
      const npt = pl.p.length / 3;
      for (let k = 0; k < npt - 1; k++) {
        for (const kk of [k, k + 1]) {
          worldToFrame(vw, B,
            pl.p[kk * 3], pl.p[kk * 3 + 1], pl.p[kk * 3 + 2], pos, v * 3);
          v++;
        }
      }
    }
  }
  projectAll(view);

  // ---- the glows ----
  /* THE GLOWS ARE DRAWN, NOT STYLED (2026-10-04 — Hannah: "an occasional
     frame or two of lag at the beginning ... ZERO lag on the initial load").
     They were DOM: a ground wash and one pool per landing site, each a
     radial-gradient <div> whose opacity relight() wrote every frame, inside
     a plus-lighter wrapper. That made the prelude's most important beat —
     a spore settling and the ground answering it — a MAIN-THREAD paint,
     exactly the thread the scene and the journey are being built on while
     the prelude plays. Now each glow is the same gradient evaluated in
     GLOW_FRAG and added into this layer's own canvas, which is what lets the
     whole prelude run in a worker (preludeWorker below) where no build task
     can stall it. The numbers are the CSS ones, read the way CSS reads them:
     `ellipse W% H% at X% Y%` is a centre and two radii as fractions of the
     frame, the stops are positions along that ellipse's ray, colours are
     interpolated premultiplied, and plus-lighter is plain addition of the
     premultiplied colour — which is the canvas's own blend (ONE, ONE). The
     general back/right warmth is not here: that light is the page's
     constant `.spill` (hero.css), which no longer fades in after load. */
  // [cx, cy, rx, ry] per glow (wash first, then one pool per site), its
  // stops as premultiplied rgba, and its stop positions [s1, end]
  const glowEll = new Float32Array(4 * 4);
  const glowC0 = new Float32Array(4 * 4);
  const glowC1 = new Float32Array(4 * 4);
  const glowStops = new Float32Array(4 * 2);
  const glowO = new Float32Array(4);   // the per-frame opacity, as the divs had
  const premul = (out, at, r, g, b, a) => {
    out[at] = (r / 255) * a; out[at + 1] = (g / 255) * a; out[at + 2] = (b / 255) * a; out[at + 3] = a;
  };

  const state = {
    wakeAt: [-1, -1, -1],
    poolLit: [0, 0, 0],
    convStartAt: -1,     // choreography-clock time the pulse leaves the islands
    struckAt: -1,        // wall-clock ms of the strike (releaseIntro's frame)
    exitAt: -1,          // choreography-clock time the skeleton fade began
    lightFadeAt: -1,     // choreography-clock time navigation began its fade
    lightFadeRequested: false,
    poolFadeAt: -1,       // one landing pulse fades when the mushroom starts
    gone: false,
    // The whole layer's exit, which was the wrapper's CSS opacity
    // transition: wall-clock ms it begins and how long it runs.
    layerFadeFrom: Infinity,
    layerFadeMs: 1,
  };

  /** Screen anchors derive from the SAME landing sites the spores aim at
   *  — projected per mode, so the glow sits under the impacts with no
   *  second aim table to drift. */
  function reframeGlow(vw) {
    const B = basisOf(vw);
    const out = [0, 0, 0];
    const px = [];
    for (const s of LANDING_SITES) {
      worldToFrame(vw, B, s[0], s[1], s[2], out, 0);
      const halfH = out[2] * vw.tanHalfFov;
      px.push([
        ((out[0] / (halfH * vw.aspect)) + 1) / 2,
        (1 - out[1] / halfH) / 2,
      ]);
    }
    // the wash: ellipse 52% 20%, rgba(224,152,66,0.10) -> transparent 70%
    glowEll.set([px[0][0], Math.min(1.04, px[0][1] + 0.09), 0.52, 0.20], 0);
    premul(glowC0, 0, 224, 152, 66, 0.10);
    premul(glowC1, 0, 0, 0, 0, 0);
    glowStops.set([0, 0.70], 0);
    for (let s = 0; s < LANDING_SITES.length; s++) {
      // Compact and hot, not broad and washy: the reference's impact
      // pools are concentrated orbs of warmth the size of the strike,
      // and spreading the same light across a third of the frame is what
      // made the first cut read as fog instead of a glowing pool.
      // ...and tighter again at the mushroom's own site (2026-10-04): at
      // 18% x 7.5% of the frame the landing bloomed a soft oval lens over
      // the ground the stalk then grew through — a flare, not a point of
      // contact. The entrance reads as precise light now (the techno half
      // of "organic, but not adhering to its principles"): a small hot
      // core where the spore touched, and the filaments carry the rest.
      const w = s === 0 ? 0.085 : 0.11;
      const h = s === 0 ? 0.034 : 0.048;
      const a = s === 0 ? 0.62 : 0.5;
      const k = s + 1;
      glowEll.set([px[s][0], px[s][1], w, h], k * 4);
      premul(glowC0, k * 4, 255, 196, 106, a);
      premul(glowC1, k * 4, 224, 146, 60, 0.10);
      glowStops.set([0.48, 0.72], k * 2);
    }
  }
  reframeGlow(view);

  if (reduced) {
    // the still ground: a gentle resting ground illumination, painted
    // once — no wake fronts, no pulses, no loop
    glowO[0] = 0.4;
  }

  function wake(site, t) {
    if (state.wakeAt[site] < 0) state.wakeAt[site] = t;
    else state.poolLit[site] = Math.min(1.6, state.poolLit[site] + 0.8); // a re-landing re-pulses
  }

  const awakeCount = () => state.wakeAt.filter((w) => w >= 0).length;

  /** The layer's exit multiplier at wall time `nowMs` — the old wrapper's
   *  CSS opacity transition, run on the clock of whoever draws. */
  function layerAlpha(nowMs) {
    const u = (nowMs - state.layerFadeFrom) / state.layerFadeMs;
    return u <= 0 ? 1 : Math.max(0, 1 - u);
  }
  function fadeLayer(delayMs, ms) {
    const from = performance.now() + delayMs;
    // a fade already running finishes on whichever clock ends first
    if (from + ms < state.layerFadeFrom + state.layerFadeMs) {
      state.layerFadeFrom = from;
      state.layerFadeMs = ms;
    }
  }

  /** The per-frame choreography, CPU-lit into `lit` (the skeleton) and
   *  `glowO` (the glows). `t` is the FIELD's clock (advance's), so a hidden
   *  tab freezes the ground exactly as it freezes the stream. Returns true
   *  when any skeleton vertex carries light — the caller skips that draw
   *  call entirely on a dark network. */
  function relight(t) {
    if (state.gone) return false;
    if (state.lightFadeRequested && state.lightFadeAt < 0) state.lightFadeAt = t;
    const lightFade = state.lightFadeAt < 0
      ? 1 : Math.max(0, 1 - (t - state.lightFadeAt) / GROUND_FADE_S);
    let any = false;
    // convergence front: distance-from-origin sweeping DMAX -> 0
    let convFront = -1;
    if (state.convStartAt >= 0 && t >= state.convStartAt) {
      convFront = 3.4 * (1 - Math.min(1, (t - state.convStartAt) / CONV_S));
    }
    // the exit: after the strike the real web is drawing itself in
    // underneath (organism/intro.js's radiating ground windows), and the
    // skeleton hands its light down over the same beat
    let exitK = 1;
    if (state.exitAt >= 0) {
      exitK = Math.max(0, 1 - (t - state.exitAt) / NET_EXIT_S);
    }
    // spine pulses once two islands are joined: quiet energy running the
    // shared paths toward the origin every few seconds
    const joined = awakeCount() >= 2;
    const pulseU = joined ? (t * 0.38) % 1.6 : -1;
    for (let v = 0; v < nV; v++) {
      const w = state.wakeAt[island[v]];
      if (w < 0) { lit[v * 3] = 0; lit[v * 3 + 1] = 0; lit[v * 3 + 2] = 0; continue; }
      // filaments creep outward from the impact: a soft-edged front
      const R = (t - w) * NET_GROW_V;
      let k = Math.max(0, Math.min(1, (R - dSite[v]) / 0.45));
      if (k <= 0) { lit[v * 3] = 0; lit[v * 3 + 1] = 0; lit[v * 3 + 2] = 0; continue; }
      // the woken network breathes — low amplitude, never a beacon
      k *= 0.82 + 0.18 * Math.sin(t * 0.9 + island[v] * 2.1 + dSite[v] * 1.7);
      if (spine[v] && pulseU >= 0) {
        const d = dOrig[v] * 0.28 - pulseU + 0.45;
        k *= 1 + 1.2 * Math.exp(-(d * d) / 0.012);
      }
      if (convFront >= 0) {
        const d = dOrig[v] - convFront;
        k *= 1 + 1.5 * Math.exp(-(d * d) / 0.11);
      }
      // Navigation retires the landing glow, while the earned network keeps
      // its outward geometry and natural light handoff.
      k *= NET_ALPHA * exitK;
      lit[v * 3] = base[v * 3] * k;
      lit[v * 3 + 1] = base[v * 3 + 1] * k;
      lit[v * 3 + 2] = base[v * 3 + 2] * k;
      any = true;
    }
    // the glows follow the same clock
    const nowMs = performance.now();
    for (let s = 0; s < LANDING_SITES.length; s++) {
      const w = state.wakeAt[s];
      if (w < 0) continue;
      state.poolLit[s] = Math.max(state.poolLit[s], Math.min(1, (t - w) / 0.3));
      let o = state.poolLit[s] * (0.85 + 0.08 * Math.sin(nowMs / 1000 * 1.1 + s));
      if (s === 0 && state.struckAt >= 0) {
        // THE STRIKE: one larger swell breathing under the growth's start
        o += 0.9 * Math.exp(-(nowMs - state.struckAt) / 800);
      }
      const poolFade = state.poolFadeAt < 0 ? 1
        : Math.max(0, 1 - (t - state.poolFadeAt) / POOL_FADE_S);
      o *= lightFade * poolFade;
      glowO[s + 1] = Math.min(1, o);
      state.poolLit[s] *= Math.pow(0.5, ((t - w) > 0.3 ? 0.016 : 0) / 3.5); // slow settle of re-pulses
    }
    const act = Math.max(
      state.wakeAt[0] < 0 ? 0 : Math.min(1, (t - state.wakeAt[0]) / 1.2),
      state.wakeAt[1] < 0 ? 0 : Math.min(0.8, (t - state.wakeAt[1]) / 1.5),
      state.wakeAt[2] < 0 ? 0 : Math.min(0.8, (t - state.wakeAt[2]) / 1.5));
    const washFade = state.poolFadeAt < 0 ? 1
      : Math.max(0, 1 - (t - state.poolFadeAt) / POOL_FADE_S);
    glowO[0] = 0.72 * act * exitK * lightFade * washFade;
    return any;
  }

  /** The glows to draw this frame: opacity already multiplied by the
   *  layer's exit. Empty once the layer has finished leaving. */
  function glowFrame(nowMs) {
    const a = layerAlpha(nowMs);
    if (a <= 0) { state.gone = true; return 0; }
    return a;
  }

  return {
    pos, lit, nV, projectAll, reframeGlow, relight, wake, state,
    glowEll, glowC0, glowC1, glowStops, glowO, glowFrame,
    get gone() { return state.gone; },
    /** True while the glows still have light to give — the layer can only
     *  be taken down after this goes false. */
    get glowing() { return layerAlpha(performance.now()) > 0; },
    awakeCount,
    /** Navigation retires the earned ground light without touching the
     * stream or the one-shot landing clock. The request is latched, so a
     * loop back to the hero cannot bring the pool or wake back. */
    fadeLights() {
      state.lightFadeRequested = true;
      // relight() fades the skeleton and the pools on the field clock; the
      // layer as a whole leaves on the wall clock, which still runs when
      // the field has handed ownership to the scene and stopped ticking.
      fadeLayer(0, GROUND_FADE_S * 1000);
    },
    /** Arm the convergence pulse so it ARRIVES at the origin in
     *  `needSeconds` of field time. */
    armConvergence(t, needSeconds) {
      if (state.convStartAt < 0) {
        state.convStartAt = t + Math.max(0, needSeconds - CONV_S);
      }
    },
    /** The strike: the intro is releasing on this frame. The origin pool
     *  swells under the stalk's draw-on, the skeleton begins handing its
     *  light to the real web, and the whole layer leaves once the growth
     *  carries the warmth itself. */
    strike(t) {
      if (state.gone || state.struckAt >= 0) return;
      state.struckAt = performance.now();
      state.poolFadeAt = t;
      if (state.convStartAt < 0 || state.convStartAt > t) {
        state.convStartAt = t - CONV_S * 0.6; // un-armed strike: pulse mostly arrived
      }
      state.exitAt = t;
      // Its hold and fade are kept just long enough to hand the warmth to
      // the scene (1.0 s + 2.0 s), and then the layer is done.
      fadeLayer(1000, 2000);
    },
    /** The no-ceremony exit for paths with no intro to strike under —
     *  ?nointro, ?capture, reduced motion. Fast but not a pop, and gone
     *  long before any capture's readiness gate opens its shutter. */
    dismiss() {
      if (state.gone) return;
      state.lightFadeRequested = true;
      fadeLayer(0, 250);
    },
  };
}

/* The ground's glows, evaluated (see createGround's "THE GLOWS ARE DRAWN").
   One full-frame triangle per glow, scissored to the glow's own extent, so
   a pool costs the pixels it lights and not the whole frame. */
const GLOW_VERT = `
precision highp float;
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const GLOW_FRAG = `
precision highp float;
uniform vec2 uSize;     // drawing buffer, device px
uniform vec4 uEll;      // centre (x, y) and radii (rx, ry) as fractions of the frame, y down
uniform vec4 uC0;       // first stop, premultiplied
uniform vec4 uC1;       // middle stop, premultiplied (only when uStops.x > 0)
uniform vec3 uStops;    // middle stop's position (0 = none), the end stop's, opacity
void main() {
  vec2 p = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  float t = length((p - uEll.xy) / uEll.zw);
  vec4 c = uStops.x > 0.0
    ? (t < uStops.x ? mix(uC0, uC1, t / uStops.x)
                    : mix(uC1, vec4(0.0), clamp((t - uStops.x) / (uStops.y - uStops.x), 0.0, 1.0)))
    : mix(uC0, vec4(0.0), clamp(t / uStops.y, 0.0, 1.0));
  gl_FragColor = c * uStops.z;
}`;

/** THE DRAWING CORE: every GL call the prelude makes, over a context it is
 *  handed. It touches no DOM, so the same code draws on the page's main
 *  thread (the fallback) and inside preludeWorker (the normal path). */
function createPreludeCore(gl, F) {
  const progPoints = linkProgram(gl, VERT, FRAG);
  const progLines = linkProgram(gl, LINE_VERT, LINE_FRAG);
  const progGlow = linkProgram(gl, GLOW_VERT, GLOW_FRAG);
  const attribs = {
    frame: gl.getAttribLocation(progPoints, 'aFrame'),
    color: gl.getAttribLocation(progPoints, 'aColor'),
    meta: gl.getAttribLocation(progPoints, 'aMeta'),
  };
  const lineAttribs = {
    frame: gl.getAttribLocation(progLines, 'aFrame'),
    color: gl.getAttribLocation(progLines, 'aColor'),
  };
  const glowPos = gl.getAttribLocation(progGlow, 'aPos');
  const uniforms = {
    time: gl.getUniformLocation(progPoints, 'uTime'),
    tanHalfFov: gl.getUniformLocation(progPoints, 'uTanHalfFov'),
    aspect: gl.getUniformLocation(progPoints, 'uAspect'),
    // Set from setPxScale() rather than per frame: it changes only when a
    // device grid does, which is a resize and nothing else.
    pxScale: gl.getUniformLocation(progPoints, 'uPxScale'),
    quiet: gl.getUniformLocation(progPoints, 'uQuiet'),
  };
  const lineUniforms = {
    tanHalfFov: gl.getUniformLocation(progLines, 'uTanHalfFov'),
    aspect: gl.getUniformLocation(progLines, 'uAspect'),
  };
  const glowUniforms = {
    size: gl.getUniformLocation(progGlow, 'uSize'),
    ell: gl.getUniformLocation(progGlow, 'uEll'),
    c0: gl.getUniformLocation(progGlow, 'uC0'),
    c1: gl.getUniformLocation(progGlow, 'uC1'),
    stops: gl.getUniformLocation(progGlow, 'uStops'),
  };
  const buffers = { frame: gl.createBuffer(), color: gl.createBuffer(), meta: gl.createBuffer() };
  const lineBuffers = { frame: gl.createBuffer(), color: gl.createBuffer() };
  const glowBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  // organism/renderer.js clears to bg 0x1c160b, and the grade lifts it
  // before the tonemap ever sees it (see GRADE_LIFT): the delta has to be
  // taken against the frame the scene actually shows, not its raw clear.
  const bgLin = gradedBgLinear([0x1c, 0x16, 0x0b]);
  const enc = encodeOnCpu(bgLin);
  gl.useProgram(progPoints);
  gl.uniform1f(gl.getUniformLocation(progPoints, 'uOpacity'), OPACITY);
  gl.uniform3f(gl.getUniformLocation(progPoints, 'uBgLinear'), bgLin[0], bgLin[1], bgLin[2]);
  gl.uniform3f(gl.getUniformLocation(progPoints, 'uBgEncoded'), enc[0], enc[1], enc[2]);
  gl.useProgram(progLines);
  gl.uniform3f(gl.getUniformLocation(progLines, 'uBgLinear'), bgLin[0], bgLin[1], bgLin[2]);
  gl.uniform3f(gl.getUniformLocation(progLines, 'uBgEncoded'), enc[0], enc[1], enc[2]);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  const meta = new Float32Array(F.n * 2);
  const lit = new Float32Array(F.n * 3);   // per-frame colour scratch: F.color x F.fade x gain
  // Three programs, three attribute layouts: each draw enables exactly its
  // own arrays, so no array is ever left enabled without a buffer behind it.
  let enabled = [];
  function useArrays(list) {
    for (const a of enabled) if (!list.includes(a)) gl.disableVertexAttribArray(a);
    for (const a of list) if (!enabled.includes(a)) gl.enableVertexAttribArray(a);
    enabled = list;
  }

  /** One frame: the stream at `gain`, the woken skeleton, the glows.
   *  `still` is the reduced-motion paint, which never relights. */
  function draw(now, gain, nowMs, still) {
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (gain > 0) {
      gl.useProgram(progPoints);
      useArrays([attribs.frame, attribs.color, attribs.meta]);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.frame);
      gl.bufferData(gl.ARRAY_BUFFER, F.frame, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(attribs.frame, 3, gl.FLOAT, false, 0, 0);
      // The choreography's fade and the crossfade's gain ride the colour,
      // so the light — never the base palette — is what reaches the pixel.
      // Uploaded per frame because both move per frame; at this count it
      // is ~6 KB.
      for (let i = 0; i < F.n; i++) {
        const i3 = i * 3, f = F.fade[i] * gain;
        lit[i3] = F.color[i3] * f;
        lit[i3 + 1] = F.color[i3 + 1] * f;
        lit[i3 + 2] = F.color[i3 + 2] * f;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
      gl.bufferData(gl.ARRAY_BUFFER, lit, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(attribs.color, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.meta);
      if (F.attrsDirty) {
        for (let i = 0; i < F.n; i++) { meta[i * 2] = F.size[i]; meta[i * 2 + 1] = F.seed[i]; }
        gl.bufferData(gl.ARRAY_BUFFER, meta, gl.DYNAMIC_DRAW);
        F.attrsDirty = false;
      }
      gl.vertexAttribPointer(attribs.meta, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uniforms.time, now);
      gl.uniform1f(uniforms.tanHalfFov, F.tanHalfFov);
      gl.uniform1f(uniforms.aspect, F.aspect);
      gl.drawArrays(gl.POINTS, 0, F.n);
    }
    if (!ground) return;
    // the PreNetwork — only ever lit after a landing has woken an island.
    // The reduced-motion still never calls relight: its ground illumination
    // is createGround's own painted-once wash, and relight would overwrite it.
    if (!ground.gone && !still && ground.relight(F.t)) {
      gl.useProgram(progLines);
      useArrays([lineAttribs.frame, lineAttribs.color]);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.frame);
      gl.bufferData(gl.ARRAY_BUFFER, ground.pos, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(lineAttribs.frame, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.color);
      gl.bufferData(gl.ARRAY_BUFFER, ground.lit, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(lineAttribs.color, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(lineUniforms.tanHalfFov, F.tanHalfFov);
      gl.uniform1f(lineUniforms.aspect, F.aspect);
      gl.drawArrays(gl.LINES, 0, ground.nV);
    }
    // the glows, after the layer's own exit has been applied
    const layer = ground.glowFrame(nowMs);
    if (layer <= 0) return;
    let first = true;
    for (let k = 0; k < 4; k++) {
      const o = ground.glowO[k] * layer;
      if (!(o > 0.001)) continue;
      const e = ground.glowEll, k4 = k * 4, end = ground.glowStops[k * 2 + 1];
      // the glow's extent, in device px (CSS y runs down, GL's up)
      const x0 = Math.floor((e[k4] - e[k4 + 2] * end) * W);
      const x1 = Math.ceil((e[k4] + e[k4 + 2] * end) * W);
      const y0 = Math.floor((1 - (e[k4 + 1] + e[k4 + 3] * end)) * H);
      const y1 = Math.ceil((1 - (e[k4 + 1] - e[k4 + 3] * end)) * H);
      const sx = Math.max(0, x0), sy = Math.max(0, y0);
      const sw = Math.min(W, x1) - sx, sh = Math.min(H, y1) - sy;
      if (sw <= 0 || sh <= 0) continue;
      if (first) {
        first = false;
        gl.useProgram(progGlow);
        useArrays([glowPos]);
        gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
        gl.vertexAttribPointer(glowPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(glowUniforms.size, W, H);
        gl.enable(gl.SCISSOR_TEST);
      }
      gl.scissor(sx, sy, sw, sh);
      gl.uniform4f(glowUniforms.ell, e[k4], e[k4 + 1], e[k4 + 2], e[k4 + 3]);
      const c0 = ground.glowC0, c1 = ground.glowC1;
      gl.uniform4f(glowUniforms.c0, c0[k4], c0[k4 + 1], c0[k4 + 2], c0[k4 + 3]);
      gl.uniform4f(glowUniforms.c1, c1[k4], c1[k4 + 1], c1[k4 + 2], c1[k4 + 3]);
      gl.uniform3f(glowUniforms.stops, ground.glowStops[k * 2], end, o);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!first) gl.disable(gl.SCISSOR_TEST);
  }

  return {
    draw,
    setPxScale(s) { gl.useProgram(progPoints); gl.uniform1f(uniforms.pxScale, s); },
    /** The hero copy's box in NDC (x0, y0, x1, y1) -> VERT's uQuiet. */
    setQuiet(q) { gl.useProgram(progPoints); gl.uniform4f(uniforms.quiet, q[0], q[1], q[2], q[3]); },
  };
}

/** The ignition arithmetic, over the field's landing state — shared by the
 *  page (reading the worker's posted mirror of it) and the main-thread
 *  path (reading the field itself). Returns seconds until the convergence
 *  pulse can arrive at the origin. See preludeMsUntilStrike(). */
function strikeNeed(S) {
  if (S.firstImpactAt >= 0) {
    return Math.max(0, NET_MIN_S - (S.t - S.firstImpactAt)) + CONV_S;
  }
  // earliest settle under compression: the nearest landing, pulled
  // forward (no lull wait when the scene is ready) and fluttered
  // at the compressed duration (mirrors advance() exactly)
  let eta = Infinity;
  for (const L of S.landings) {
    if (L.state === 2) continue;
    const peelIn = L.state === 1
      ? Math.max(0, L.t0 - S.t)
        + (L.aimed ? Math.max(0, L.dur - Math.max(0, S.t - L.t0)) : Math.max(FLUT_MIN_S, L.dur / 1.15))
      : Math.max(0.15, Math.min(L.tPeel - S.t, 0.15)) + KINDLE_FAST_S
        + Math.max(FLUT_MIN_S, L.dur / 1.15);
    eta = Math.min(eta, peelIn);
  }
  if (!Number.isFinite(eta)) eta = 0.8;
  return eta + NET_MIN_S + CONV_S;
}

/** Wall-clock milliseconds since the epoch, comparable across the page
 *  and its worker (each has its own performance.timeOrigin). */
const epochMs = () => performance.timeOrigin + performance.now();

/** The field, as a message: everything but its random source, whose state
 *  travels as a number so the copy draws the same future. */
function fieldSnapshot(F) {
  const snap = { ...F, rand: undefined, rngState: F.rand.state() };
  delete snap.rand;
  return snap;
}
function adoptSnapshot(F, snap) {
  for (const k of Object.keys(snap)) {
    if (k === 'rngState') continue;
    const v = snap[k];
    if (ArrayBuffer.isView(v) && ArrayBuffer.isView(F[k]) && F[k].length === v.length) F[k].set(v);
    else F[k] = v;
  }
  F.rand.state(snap.rngState);
  F.attrsDirty = true;
}

/* ---------------------------------------------------------------- *
 * THE WORKER HALF. organism/hero-spores-worker.js is a two-line module
 * that hands its global scope to this function; everything it runs is the
 * code above — the same field, the same integrator, the same ground and
 * the same drawing core the main-thread path uses.
 *
 * WHY THE PRELUDE RUNS OFF THE PAGE'S THREAD (2026-10-04, Hannah: "an
 * occasional frame or two of lag at the beginning ... we need to have ZERO
 * lag on the initial load, no excuses are acceptable"). The prelude is the
 * only thing moving while the scene and the journey are built, and every
 * one of those builds is a long main-thread task: createScene's stages
 * (85-470 ms each on a loaded machine), each chapter (up to ~565 ms), the
 * journey's boot. On the main thread, every one of them froze the current
 * mid-flight. Slicing them all below a frame is not a realistic contract;
 * moving the one animation that has to survive them is. An OffscreenCanvas
 * transferred to a worker commits its frames straight to the compositor, so
 * the stream, the landings, the waking network and its glows keep their
 * frame rate whatever the page's thread is doing — and the copy's entrance
 * is CSS opacity, also composited. The page only posts it the view, the
 * size, the copy's box and the choreography's commands, and reads back a
 * small mirror of the landing state (preludeLandingStatus / MsUntilStrike).
 * ---------------------------------------------------------------- */
export function preludeWorker(scope) {
  let F = null, core = null, gl = null, canvas = null;
  let live = false, visible = true, timer = null;
  let epoch0 = 0, last = 0;
  let fadeFrom = Infinity, fadeMs = 0;   // the stream's crossfade, epoch ms
  const hasRaf = typeof scope.requestAnimationFrame === 'function';
  const raf = hasRaf ? (fn) => scope.requestAnimationFrame(fn) : (fn) => setTimeout(fn, 16);
  const cancelRaf = hasRaf ? (id) => scope.cancelAnimationFrame(id) : (id) => clearTimeout(id);

  function gain(nowEpoch) {
    if (fadeFrom === Infinity) return 1;
    const p = (nowEpoch - fadeFrom) / fadeMs;
    return p <= 0 ? 1 : p >= 1 ? 0 : 1 - p;
  }
  let frameMs = 0;   // this thread's last frame interval, for the page's QA probes
  function status() {
    const S = ground ? ground.state : null;
    scope.postMessage({
      type: 'status', t: F.t, firstImpactAt: F.firstImpactAt, released: F.released, frameMs,
      landings: F.landings.map((L) => ({ state: L.state, t0: L.t0, tPeel: L.tPeel,
        dur: L.dur, aimed: !!L.aimed })),
      struck: !!S && S.struckAt >= 0,
      groundGone: !ground || ground.gone,
      glowing: !!ground && ground.glowing,
    });
  }
  // After adoption the page's scene paces this layer: one frame per scene
  // frame, on its 'tick', instead of this thread's own clock (see 'adopt').
  let driven = false;
  function frame() {
    timer = null;
    if (!live || !visible || !F) return;
    const nowEpoch = epochMs();
    const now = (nowEpoch - epoch0) / 1000;
    frameMs = last === 0 ? 0 : (now - last) * 1000;
    const dt = last === 0 ? 0 : Math.min(0.05, now - last);
    last = now;
    advance(F, dt, preloadGust(now));
    core.draw(now, gain(nowEpoch), performance.now(), false);
    status();
    if (!driven) timer = raf(frame);
  }
  function size(m) {
    canvas.width = m.width;
    canvas.height = m.height;
    core.setPxScale(m.pxScale);
    core.setQuiet(m.quiet);
  }

  scope.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'init') {
      canvas = m.canvas;
      epoch0 = m.epoch0;
      try {
        gl = canvas.getContext('webgl', {
          alpha: true, antialias: false, depth: false, stencil: false,
          premultipliedAlpha: true, powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
        });
        if (!gl) throw new Error('no webgl in worker');
        F = createField(m.view, m.seed);
        F.preloadDriven = true;
        ground = createGround(m.view, false);
        core = createPreludeCore(gl, F);
        size(m);
      } catch (err) {
        scope.postMessage({ type: 'failed', message: String(err && err.message) });
        return;
      }
      live = true;
      core.draw(0, 1, performance.now(), false);
      status();
      timer = raf(frame);
      return;
    }
    if (!live) return;
    switch (m.type) {
      case 'resize':
        reframe(F, m.view);
        if (ground && !ground.gone) { ground.projectAll(m.view); ground.reframeGlow(m.view); }
        size(m);
        break;
      case 'visible':
        visible = m.visible;
        if (visible && timer === null && !driven) { last = 0; timer = raf(frame); }
        break;
      case 'sceneReady': F.sceneReady = true; break;
      case 'arm': if (ground) ground.armConvergence(m.at, m.need); break;
      case 'adopt':
        scope.postMessage({ type: 'snapshot', field: fieldSnapshot(F), epoch: epochMs() });
        /* FROM HERE THE SCENE SETS THE PACE (2026-10-04). Until adoption this
           thread's own clock is the point: the page's thread is busy building
           and the prelude must not wait for it. After it, the page's thread is
           drawing the growth every frame, and a second canvas committing on
           an unrelated cadence made the two contend for each frame —
           measured in an interleaved A/B, 3-9 dropped scene frames through
           the growth against 0-3 with the prelude on the page's thread. So
           the remaining seconds of this layer (the stream's half of the
           crossfade, the skeleton's and the glows' exits) are drawn once per
           scene frame, on the scene's 'tick' (from the first one on). */
        break;
      case 'tick':
        // the first tick hands the pace over (this thread keeps its own
        // until then, so the stream never waits on the snapshot's trip)
        if (!driven) {
          driven = true;
          if (timer !== null) { cancelRaf(timer); timer = null; }
        }
        if (timer === null) frame();
        break;
      case 'fade': fadeFrom = m.from; fadeMs = m.ms; break;
      case 'strike': if (ground) ground.strike(F.t); F.released = true; break;
      case 'dismiss': if (ground) ground.dismiss(); F.released = true; break;
      case 'fadeLights': if (ground && !ground.gone) ground.fadeLights(); break;
      case 'stop': {
        // The context goes on THIS thread: shrink, then lose it. Nothing here
        // can stall the page.
        live = false;
        try {
          canvas.width = 1; canvas.height = 1;
          const lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        } catch { /* already gone */ }
        F = null; core = null; gl = null;
        break;
      }
      default: break;
    }
  };
}

function createPreload() {
  const state = {
    live: false, failed: false, handedOff: false,
    field: null, view: null, heroMode: null,
    wrap: null, el: null, gl: null, reduced: false,
    // 'worker' (the normal path) or 'main' (no OffscreenCanvas, reduced
    // motion, or a capture/QA path that pins the old single-thread timing)
    mode: null,
  };
  let rafId = null;
  let t0 = 0;
  let last = 0;
  let onVisibility = null;
  let onResize = null;
  let core = null;
  // the worker path's handle, its posted mirror of the landing state, and
  // the scene-side adopter waiting for the field (see handOff / adopt)
  let worker = null;
  let mirror = null;
  let adopter = null;
  let adoptAsked = false;
  let adoptWanted = false;
  let retiredWorker = null;   // see stop(): kept, idle, never terminated
  const TICK = { type: 'tick' };
  let releasedEarly = false;
  // See sizeCanvas(): the ratio between THIS layer's device grid and the one
  // the scene's renderer will draw the same particles on. 1 whenever they
  // agree, which is every capture and every first visit to a retina desktop.
  let pxScale = 1;
  // When the ENTRY_MS ramp began. -Infinity until it has, so a handOff() that
  // somehow precedes boot() waits for nothing.
  let entryAt = -Infinity;
  // The stream's half of the crossfade (see handOff): linear on the wall
  // clock, complementary to the scene-side Points' own linear ramp. The
  // canvas itself STAYS — the PreNetwork keeps drawing on it until the
  // strike — so the fade rides the per-frame colour upload, not the wrap.
  let fadeFrom = Infinity;
  let fadeMs = 0;

  /** ONE requestAnimationFrame site in this module, deliberately. The
   *  hidden-tab gate parks the loop by clearing `rafId` and comes
   *  back through this same door, so the file keeps a single request and
   *  a single matching cancel. (The worker path's frames are the worker's
   *  own; this loop runs only on the main-thread path.) */
  function schedule() {
    if (rafId === null && !state.reduced && state.mode === 'main') rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function streamGain() {
    if (fadeFrom === Infinity) return 1;
    const p = (performance.now() - fadeFrom) / fadeMs;
    return p <= 0 ? 1 : p >= 1 ? 0 : 1 - p;
  }

  function draw(now) {
    core.draw(now, streamGain(), performance.now(), state.reduced);
  }

  function tick(ms) {
    rafId = null;
    if (!state.live) return;
    const now = (ms - t0) / 1000;
    const dt = last === 0 ? 0 : Math.min(0.05, now - last);
    last = now;
    // Through the crossfade this layer stays the INTEGRATOR while the
    // scene-side Points is only a second view of the same buffer — one
    // advance per frame, two projections of it, so the two pictures are
    // pixel-identical for as long as both are on screen. Ownership
    // transfers when this layer stops, not when the scene arrives.
    advance(state.field, dt, preloadGust(now));
    draw(now);
    // the stream may be long gone; the glows decide when the layer is done
    schedule();
  }

  /* THE TWO DEVICE GRIDS, AND THE ONLY THING THAT EVER CROSSED THE SEAM.
   *
   * Both halves of this field write `gl_PointSize` in DEVICE pixels, from the
   * identical law and through the identical 1.7-device-pixel floor. That is
   * deliberate — a sub-pixel sprite has to be floored on the grid it is drawn
   * to — but it means the ON-SCREEN size of a spore is `sz / pixelRatio`, and
   * the two halves choose their pixel ratio independently:
   *
   *   this layer   min(devicePixelRatio, COMPOSITION[mode].dpr)  — 2 on
   *                desktop, 1.5 on phone and tablet, a cost ceiling for a
   *                layer that exists to be cheap.
   *   the scene    createPixelRatioPolicy().initial — `?pr=`, else the
   *                verdict REMEMBERED for this display, else min(dPR, 2).
   *
   * On a first visit to a retina desktop both are 2 and nothing shows. Every
   * other case they differ, and at the instant the scene adopts the field
   * every spore in the stream changes size by their ratio, in one frame:
   *
   *   returning desktop visitor, remembered 1.5   2 / 1.5 = 1.33x coarser
   *   returning desktop visitor, remembered 1     2 / 1   = 2x coarser
   *   any phone or tablet, first visit            1.5 / 2 = 0.75x finer
   *
   * Measured at 1440x900 with 1 remembered, flagless, over the seam: the dots
   * in the corridor above the headline go from 3.3 px^2 to 5.7 px^2 of area
   * and from 12 to 35 px of light per frame — 2.9x more light in one frame,
   * on a frame where nothing else has arrived yet to distract from it.
   *
   * That is the "reset when the main animation starts" — and it is invisible
   * to a probe, because a probe runs in a fresh profile where the display has
   * no remembered verdict and both sides happen to land on 2.
   *
   * So this layer keeps its cost ceiling and compensates for it. `pxScale` is
   * this grid over the scene's, and VERT applies it AFTER the 1.7 floor: the
   * sprite is sized and floored exactly as the scene will size and floor it,
   * then re-expressed on whatever grid this layer could afford. Both the size
   * and the area dimming the floor causes therefore match, which is stronger
   * than scaling the size law would be — flooring on two different grids
   * dims a different subset of the smallest sprites, and those are most of
   * this field.
   *
   * `pxScale` is exactly 1 whenever the two ratios agree, which is every
   * capture (tools/capture.py shoots at device scale 1, where both resolve to
   * 1) and every first visit to a retina desktop — so no shot frame moves.
   *
   * WHAT THIS DOES NOT FIX, stated because it is the same root: the scene's
   * OWN sprites are in device pixels too, so when the resolution governor
   * steps the ratio mid-visit (organism/performance.js) every point cloud on
   * the page changes size in one frame. That is a scene-wide question with
   * every golden behind it, not a seam, and it does not fire at all for a
   * visitor whose display already has a remembered verdict — which is the
   * visitor this seam was breaking for.
   *
   * Returns the numbers rather than applying them, because on the worker
   * path the canvas and the uniform live on the other thread. */
  function measureCanvas() {
    const cap = (COMPOSITION[state.view.mode] || COMPOSITION.desktop).dpr || 2;
    const pr = Math.min(devicePixelRatio || 1, cap);
    // The number the scene's renderer will be constructed with. Read through
    // performance.js's own policy rather than re-derived here: the storage key
    // encodes the calibration RULE, and a second copy of that derivation is
    // exactly the drift the key was introduced to prevent.
    const scenePr = createPixelRatioPolicy(PIN_PR).initial;
    pxScale = scenePr > 0 ? pr / scenePr : 1;
    return {
      width: Math.max(1, Math.round(innerWidth * pr)),
      height: Math.max(1, Math.round(innerHeight * pr)),
      pxScale,
    };
  }
  function sizeCanvas() {
    const m = measureCanvas();
    state.el.width = m.width;
    state.el.height = m.height;
    if (core) core.setPxScale(m.pxScale);
  }

  /** The hero copy's live box -> the corridor-dim uniform (VERT's uQuiet).
   *  Measured off the DOM so every viewport gets its own corridor and no
   *  mode table can drift from a layout change. */
  function measureCopyBox() {
    const hero = document.querySelector('.hero');
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    if (hero) {
      const r = hero.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        x0 = (r.left / innerWidth) * 2 - 1;
        x1 = (r.right / innerWidth) * 2 - 1;
        y0 = 1 - (r.bottom / innerHeight) * 2;
        y1 = 1 - (r.top / innerHeight) * 2;
      }
    }
    return [x0, y0, x1, y1];
  }

  /** index.html holds the hero copy until this layer has a first frame
   *  (its ENTRY BARRIER); this lets it go, in the caller's task. */
  function releaseCopy() {
    const go = typeof window !== 'undefined' ? window.__heroEntryRelease : null;
    if (typeof go === 'function') go();
  }

  function showStatic() {
    releaseCopy();
    state.failed = true;
    state.live = false;
    stopLoop();
    if (!state.wrap) return;
    state.wrap.style.mixBlendMode = 'normal';
    state.wrap.style.background = STATIC_HAZE;
    state.wrap.style.opacity = '1';
  }

  /** Which thread draws the prelude. The worker whenever the platform can
   *  hand a canvas to one; the page itself for reduced motion (one still
   *  frame, nothing to protect), for the capture / frozen / no-intro paths
   *  (the render goldens were shot against the single-thread timing and
   *  must not move), and when `?prelude=main` asks for the A/B. */
  function chooseMode() {
    if (state.reduced || CAPTURE !== null || INTROAT !== null || NOINTRO !== null
        || PRELUDE_THREAD === 'main') return 'main';
    if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function'
        || typeof HTMLCanvasElement === 'undefined'
        || typeof HTMLCanvasElement.prototype.transferControlToOffscreen !== 'function') return 'main';
    return 'worker';
  }

  /** The entry ramp, run once, from the frame the stream first has
   *  something on screen. The forced reflow — journey/boot/handoff.js's own
   *  trick at the preboot rail swap — is what makes the transition run from 0
   *  rather than being collapsed into the same style recalculation.
   *  Deliberately NOT a second requestAnimationFrame: this file keeps exactly
   *  one request site and one matching cancel, which is what holds M8's
   *  per-file pin and M19's zero-slack ceiling flat. */
  function reveal() {
    if (entryAt !== -Infinity || !state.wrap || state.failed) return;
    void state.wrap.offsetWidth;
    state.wrap.style.opacity = '1';
    releaseCopy();
    // WHEN the entry ramp starts, because handOff() needs to know whether it
    // is still running. Taken after the reflow above, which is the point the
    // transition is armed from 0, plus the shared delay before it moves.
    entryAt = performance.now() + ENTRY_DELAY_MS;
    // The sequencing this module exists for is only a claim until somebody
    // can measure it. This mark sits beside index.html's 'hero-entry-start'
    // and journey/boot/handoff.js's 'hero-intro-start', so a cold-load trace
    // reads copy -> atmosphere -> mushroom off one timeline.
    performance.mark('hero-spores-live');
  }

  /** The prelude thread, started as early as the page can start it:
   *  index.html's head creates it (window.__preludeWorker) before the
   *  parser reaches main.js, so the thread's own module fetches are not
   *  queued behind the organism's whole graph — that queue, not WebGL setup
   *  (~60 ms), was most of the measured delay before its first frame. A
   *  thread the page did not start early is started here, as before. */
  function takeWorker() {
    const early = typeof window !== 'undefined' ? window.__preludeWorker : null;
    if (early) {
      window.__preludeWorker = null;
      return early;
    }
    return new Worker(new URL('./hero-spores-worker.js', import.meta.url), { type: 'module' });
  }

  /** An early thread this page then decided not to use (a QA flag or a
   *  platform check that index.html's head does not repeat exactly). It has
   *  loaded code and nothing else — no context — so letting it go is cheap. */
  function dropEarlyWorker() {
    const early = typeof window !== 'undefined' ? window.__preludeWorker : null;
    if (!early) return;
    window.__preludeWorker = null;
    early.terminate();
  }

  function bootWorker(canvas) {
    let off;
    try {
      off = canvas.transferControlToOffscreen();
      worker = takeWorker();
    } catch {
      return false;
    }
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'status') {
        mirror = m;
        reveal();
      }
      else if (m.type === 'snapshot') installSnapshot(m);
      else if (m.type === 'failed') workerFailed(m.message);
    };
    worker.onerror = (e) => workerFailed(e && e.message);
    const box = measureCanvas();
    entryEpoch0 = epochMs();
    worker.postMessage({
      type: 'init', canvas: off, view: state.view, seed: PRELUDE_SEED,
      epoch0: entryEpoch0, quiet: measureCopyBox(), ...box,
    }, [off]);
    return true;
  }

  /** The worker's field arrives: copy it into the scene's own, catch it up
   *  to this frame on the same gust the worker is integrating with, and
   *  start the complementary pair of fades on one wall clock. */
  function installSnapshot(m) {
    if (!adopter) return;
    const F = adopter.field;
    adoptSnapshot(F, m.field);
    F.preloadDriven = false;
    if (releasedEarly) F.released = true;
    const nowEpoch = epochMs();
    // the worker kept integrating while the message crossed: so does this copy
    let behind = Math.max(0, (nowEpoch - m.epoch) / 1000);
    let t = (m.epoch - entryEpoch0) / 1000;
    while (behind > 1e-4) {
      const step = Math.min(0.05, behind);
      t += step;
      advance(F, step, preloadGust(t));
      behind -= step;
    }
    const wait = Math.max(0, Math.round(ENTRY_MS - (performance.now() - entryAt)));
    const from = nowEpoch + wait;
    worker.postMessage({ type: 'fade', from, ms: fadeMs });
    fadeFrom = performance.now() + wait;
    adopter.begin({ fadeFromEpoch: from, fadeMs, epoch0: entryEpoch0 });
    adopter = null;
  }
  // the worker's clock origin, so the scene-side copy can ride the same gust
  let entryEpoch0 = 0;

  /** The worker could not draw. The page keeps the static haze (the same
   *  answer as a refused context on the main thread), and a scene that is
   *  already waiting on the worker's field takes its own seeded copy at
   *  once rather than waiting for a snapshot that will never come. */
  function workerFailed(message) {
    console.error('[hero-spores] worker prelude failed:', message);
    // an error path, never the normal one: a failed worker is let go
    if (worker) { worker.terminate(); worker = null; }
    mirror = null;
    showStatic();
    if (adopter) {
      const begin = adopter.begin;
      adopter = null;
      begin({ fadeFromEpoch: epochMs(), fadeMs: Math.max(1, fadeMs), epoch0: entryEpoch0 });
    }
  }

  function boot() {
    if (state.live || state.failed) return;
    const stage = document.getElementById('stage');
    if (!stage || !stage.parentNode) return;
    state.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.heroMode = createHeroMode();
    state.view = readView(state.heroMode);
    state.mode = chooseMode();
    if (state.mode !== 'worker') dropEarlyWorker();

    // Immediately after #stage, so .spill / .scrim / .vignette / .grain
    // sit over this layer exactly as they sit over the scene.
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = LAYER_CSS;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    el.appendChild(canvas);
    stage.parentNode.insertBefore(el, stage.nextSibling);
    state.el = canvas;
    state.wrap = el;

    if (state.mode === 'worker' && !bootWorker(canvas)) {
      // a canvas that has been transferred cannot come back; one that has
      // not can still serve the main-thread path
      state.mode = 'main';
      dropEarlyWorker();
    }
    if (state.mode === 'worker') {
      state.live = true;
    } else {
      state.field = createField(state.view, PRELUDE_SEED);
      let gl = null;
      try {
        gl = canvas.getContext('webgl', {
          alpha: true, antialias: false, depth: false, stencil: false,
          premultipliedAlpha: true, powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false,
        });
      } catch { /* a refused context is the static-hero path below, not an error */ }
      if (!gl) {
        showStatic();
        return;
      }
      state.gl = gl;
      // The ground rides the live path only: the static hero already
      // composes its own haze, and a page with no working WebGL has no
      // landings to answer.
      ground = createGround(state.view, state.reduced);
      try {
        core = createPreludeCore(gl, state.field);
      } catch (err) {
        console.error('[hero-spores] preload layer failed to start', err);
        showStatic();
        return;
      }
      sizeCanvas();
      core.setQuiet(measureCopyBox());
      state.live = true;
      // While this layer is on screen it is the field's integrator; the
      // scene-side animator reads the flag and only projects. See tick().
      state.field.preloadDriven = true;
      t0 = performance.now();
      draw(0);
    }
    // The main-thread path has drawn its first frame above, so its entry
    // ramp starts now. The worker's starts on that thread's first frame
    // (bootWorker's first 'status'), never before: a ramp that ran while the
    // worker was still loading faded in an empty canvas and the spores then
    // popped in partway through it (measured 0.33-0.96 s late, 2026-10-04).
    if (state.mode !== 'worker') reveal();

    onResize = () => {
      if (!state.live) return;
      state.view = readView(state.heroMode);
      if (state.mode === 'worker') {
        worker.postMessage({ type: 'resize', view: state.view, quiet: measureCopyBox(), ...measureCanvas() });
        return;
      }
      reframe(state.field, state.view);
      if (ground && !ground.gone) {
        ground.projectAll(state.view);
        ground.reframeGlow(state.view);
      }
      sizeCanvas();
      core.setQuiet(measureCopyBox());
      if (state.reduced) draw(0);
    };
    addEventListener('resize', onResize);
    // A hidden tab pays for nothing. rAF is already suspended by
    // every current engine when the document is hidden; parking the loop
    // explicitly also covers the cases where it is not (an occluded but
    // "visible" window, a restored bfcache entry) and makes the intent
    // reviewable rather than inherited from the platform. The field's own
    // clock (F.t) advances only in ticks, so the choreography — landings,
    // wake fronts, the armed convergence — freezes with the pixels.
    onVisibility = () => {
      if (state.mode === 'worker') {
        if (worker) worker.postMessage({ type: 'visible', visible: !document.hidden });
        return;
      }
      if (document.hidden) stopLoop();
      else if (state.live) { last = 0; schedule(); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Reduced motion gets the composed field, painted once, and no loop
    // at all. A few slow ambient spores' worth of light, the gentle
    // ground illumination (createGround's reduced path), then the
    // crossfade when the scene arrives — no trajectories, no flashes.
    if (!state.reduced) schedule();
  }

  /** Release everything this layer attached, and take its canvas off the
   *  page. Idempotent, and safe before boot() ever ran.
   *
   *  NOTHING SYNCHRONOUS WITH THE GPU HAPPENS HERE (2026-10-04 — load lag).
   *  This runs a second or so into the growth, so it must cost the page's
   *  thread nothing it can see. It used to shrink the canvas to 1x1 here
   *  (a synchronous reallocation: 92 ms measured in one task) and call
   *  loseContext() from an idle callback (77 ms more — an idle callback is
   *  still a task, and it blocked the frame after it). On the worker path
   *  the worker releases its own context on its own thread; on the
   *  main-thread path the context goes with its canvas when the collector
   *  takes it. */
  function stop() {
    stopLoop();
    state.live = false;
    // hand integration to whoever else holds this field
    if (state.field) state.field.preloadDriven = false;
    if (onResize) { removeEventListener('resize', onResize); onResize = null; }
    if (onVisibility) {
      document.removeEventListener('visibilitychange', onVisibility);
      onVisibility = null;
    }
    if (state.wrap && state.wrap.parentNode) state.wrap.parentNode.removeChild(state.wrap);
    if (worker) {
      // NOT terminate(): the page's thread pays for tearing a worker down
      // (DidTerminateWorkerThread — 53 ms measured, three seconds into the
      // growth). The worker releases its own context and then idles, which
      // costs nothing; it is kept referenced so the collector never tears it
      // down at some later moment instead.
      worker.postMessage({ type: 'stop' });
      worker.onmessage = null;
      retiredWorker = worker;
      worker = null;
    }
    core = null;
    state.gl = null;
  }

  /** How long the layer must stay up after the strike: the skeleton's
   *  hand-down, the stream's crossfade if it is still running, and the
   *  glows' own hold and fade (createGround's strike: 1.0 s + 2.0 s). */
  function stopDelayAfterStrike() {
    const fadeLeft = fadeFrom === Infinity ? 0
      : Math.max(0, fadeFrom + fadeMs - performance.now());
    return Math.max((NET_EXIT_S + 0.25) * 1000, 3050, fadeLeft + 100);
  }

  return {
    boot,
    stop,
    /* THE IGNITION CONTRACT, one consumer: journey/boot/handoff.js asks
       preludeMsUntilStrike() when the journey is prepared, delays its
       normal releaseIntro() by exactly that long, and calls
       preludeStrike() as it starts the intro. The number is the earliest
       moment the causal chain can deliver a convergence pulse to the
       mushroom origin: if a landing has already happened, that is the
       remainder of NET_MIN_S plus the pulse's travel; if not — a very
       fast load — the remaining flutter is compressed (advance's
       RATE_FAST is already running by then, because handOff set
       sceneReady, and compression skips the lull wait) and the wait is
       first-settle + response + travel. Bounded by construction to
       ~2.8 s worst case; a load slower than ~4 s (nearly
       all of them) has settled already and waits only for the pulse. A
       gesture never waits — beginFastHandoff() releases immediately and
       the strike fires with the pulse mostly arrived.
       On the worker path the arithmetic reads the worker's posted mirror
       of the landing state, and the arming crosses as a message stamped
       with the mirror's own field time, so the pulse still arrives at the
       moment this returns. */
    preludeMsUntilStrike() {
      if (state.reduced || !state.live) return 0;
      if (state.mode === 'worker') {
        if (!mirror || mirror.groundGone || mirror.struck) return 0;
        const need = strikeNeed(mirror);
        worker.postMessage({ type: 'arm', at: mirror.t, need });
        return Math.round(need * 1000);
      }
      if (!ground || ground.gone) return 0;
      const F = state.field;
      if (ground.state.struckAt >= 0) return 0;
      const need = strikeNeed(F);
      ground.armConvergence(F.t, need);
      return Math.round(need * 1000);
    },
    /** Read-only landing truth for the boot handoff. The ETA above is a
     * bounded scheduling hint, but only this state says that a real visible
     * particle has reached the origin. Consumers that want causal release
     * should wait for firstImpactAt rather than treating the ETA as proof. */
    preludeLandingStatus() {
      const S = state.mode === 'worker' ? mirror : state.field;
      if (!S) return { firstImpact: false, firstImpactAt: -1, pending: false };
      return {
        firstImpact: S.firstImpactAt >= 0,
        firstImpactAt: S.firstImpactAt,
        pending: S.landings.some((L) => L.state < 2),
        released: S.released,
      };
    },
    preludeStrike() {
      if (state.mode === 'worker') {
        if (worker) worker.postMessage({ type: 'strike' });
        releasedEarly = true;
        if (state.field) state.field.released = true;
      } else {
        if (ground) ground.strike(state.field ? state.field.t : 0);
        if (state.field) state.field.released = true;
      }
      // the canvas carries the skeleton and the glows through their fades —
      // and a strike that arrives inside the stream's own crossfade (a
      // gesture on a fast machine) must not cut that fade's preload half
      // short either
      if (state.live) setTimeout(stop, stopDelayAfterStrike());
    },
    preludeDismiss() {
      if (state.mode === 'worker') {
        if (worker) worker.postMessage({ type: 'dismiss' });
        releasedEarly = true;
      } else if (ground) ground.dismiss();
      if (state.field) state.field.released = true;
      if (state.live && state.handedOff) setTimeout(stop, 400);
    },
    /** Fade earned landing light when an accepted navigation intent leaves
     * the hero, while preserving the ordinary intro and stream handoff. */
    preludeFadeGround() {
      if (state.mode === 'worker') { if (worker) worker.postMessage({ type: 'fadeLights' }); return; }
      if (ground && !ground.gone) ground.fadeLights();
    },
    /** THE ADOPTION, on the worker path (journey/boot/handoff.js calls it
     *  once the journey is prepared — the first moment the page's thread is
     *  guaranteed to stay light). The worker sends its field; the scene's
     *  copy takes it and the two halves crossfade exactly as handOff()
     *  describes. Idempotent, and a no-op on the main-thread path, where
     *  the scene adopts at handOff() itself. */
    adopt() {
      adoptWanted = true;
      if (state.mode !== 'worker' || adoptAsked || !worker || !adopter) return;
      adoptAsked = true;
      worker.postMessage({ type: 'adopt' });
    },
    get failed() { return state.failed; },
    get field() { return state.field; },
    get view() { return state.view; },
    get reduced() { return state.reduced; },
    get mode() { return state.mode; },
    /** THE HANDOFF. The scene-side field takes this exact state, so the
     *  first frame it draws is the frame this layer was showing.
     *
     *  THE TWO FADES ARE LINEAR AND COMPLEMENTARY, and they have to be.
     *  Both layers add light, so through the crossfade the frame carries
     *  `p * scene + (1 - p) * preload` of the same spore; with an eased
     *  pair the sum bulges in the middle and the stream visibly flares. On
     *  a linear pair it is flat, and the only thing that changes across
     *  the seam is that the light acquires the composer's bloom. The
     *  preload's half rides the per-frame colour upload (streamGain) so
     *  the canvas can stay behind for the PreNetwork; it is the same
     *  linear wall-clock ramp the wrap's CSS fade used to be.
     *
     *  ...AND THEY ARE ONLY COMPLEMENTARY IF THE ENTRY RAMP IS DONE, which
     *  is a RACE this file used to lose silently. The wrap enters on its own
     *  ENTRY_MS transition; the scene arrives whenever `three` does. Hand off
     *  at entry opacity `a` and the pair carries `a(1 - p) + p`, which is not
     *  flat at all — it climbs from `a` to 1 across the crossfade, so the
     *  whole stream BRIGHTENS over 0.9 s at the exact moment its light also
     *  acquires the composer's bloom. Together those read as a filter being
     *  switched on over spores that had already arrived, about a second in.
     *  Nobody saw it in a probe because losing the race needs a machine fast
     *  enough to build the scene inside 900 ms.
     *
     *  So the crossfade WAITS OUT the remainder of the entry ramp — on a
     *  timer here, and as the same number handed to the scene side in
     *  `fadeDelay` so both halves start on the same frame. Through the wait
     *  this layer is still the only one drawing and is still the integrator,
     *  so what is on screen is exactly the entry the visitor was already
     *  watching; nothing is held back but the swap. The wait is zero whenever
     *  the ramp has already finished — every capture, and every load that
     *  takes longer than ENTRY_MS to reach a scene.
     *
     *  ON THE WORKER PATH THE SWAP IS DEFERRED, not performed here. The
     *  scene exists at this call, but the journey is about to be built on
     *  the page's thread, and a stream drawn by the scene would freeze with
     *  every build task. So this returns a DEFERRED carry: a field of the
     *  right shape for the scene's Points, held dark, and a `whenAdopted`
     *  door the scene side registers through. The crossfade runs when
     *  adopt() fetches the worker's live field, which journey/boot/
     *  handoff.js asks for once preparation is done.
     *
     *  Called only when a scene exists to hand to. If the scene never
     *  builds, nothing calls this, and the layer — stream, landings,
     *  network and all, or the static haze if WebGL was refused — simply
     *  stays as the hero. sceneReady is the choreography's compression
     *  signal: from here the remaining landings accelerate rather than
     *  waiting out their nominal windows. */
    handOff(seconds) {
      if (state.handedOff) return null;
      state.handedOff = true;
      const ms = Math.max(1, Math.round(seconds * 1000));
      if (state.mode === 'worker' && state.live && worker) {
        worker.postMessage({ type: 'sceneReady' });
        fadeMs = ms;
        const field = createField(state.view, PRELUDE_SEED);
        state.field = field;
        return {
          field, view: state.view, fadeDelay: 0, deferred: true,
          /** The scene side's door: `begin` is called once the worker's
           *  field has been copied into `field`. */
          /** Called by the scene once per frame after adoption: paces the
           *  worker's remaining frames to the scene's (see 'adopt'). */
          tick() { if (worker && adoptAsked) worker.postMessage(TICK); },
          whenAdopted(begin) {
            adopter = { field, begin };
            if (!worker) workerFailed('worker gone before the scene arrived');
            else if (adoptWanted) { adoptAsked = true; worker.postMessage({ type: 'adopt' }); }
          },
        };
      }
      if (state.field) state.field.sceneReady = true;
      const wait = state.wrap
        ? Math.max(0, Math.round(ENTRY_MS - (performance.now() - entryAt)))
        : 0;
      const carried = state.field
        ? { field: state.field, view: state.view, fadeDelay: wait / 1000 }
        : null;
      if (!state.live || state.reduced) {
        // The paths with no frame loop to carry a per-frame gain — the
        // reduced-motion still and the no-WebGL static haze — cross over
        // on the wrap's own CSS fade instead, exactly the old contract:
        // CSS transitions run without rAF, so the still fades under the
        // arriving scene and the canvas (or haze) then leaves entirely.
        // Restyling the property would replace a still-running entry
        // transition at once, so the fade is armed on a timer, after it.
        const fadeOut = () => {
          if (!state.wrap) return;
          state.wrap.style.transition = `opacity ${ms}ms linear`;
          state.wrap.style.opacity = '0';
        };
        if (wait > 0) setTimeout(fadeOut, wait);
        else fadeOut();
        setTimeout(stop, wait + ms + 60);
        return carried;
      }
      fadeMs = ms;
      fadeFrom = performance.now() + wait;
      return carried;
    },
  };
}

/** ACES + sRGB on the CPU, matching `encode()` in FRAG exactly — the
 *  background's encoded value is a constant and does not belong in the
 *  inner loop. */
function encodeOnCpu(lin) {
  const c = lin.map((v) => v * (0.95 / 0.6));
  const m = [
    0.59719 * c[0] + 0.35458 * c[1] + 0.04823 * c[2],
    0.07600 * c[0] + 0.90834 * c[1] + 0.01566 * c[2],
    0.02840 * c[0] + 0.13383 * c[1] + 0.83777 * c[2],
  ].map((v) => {
    const a = v * (v + 0.0245786) - 0.000090537;
    const b = v * (0.983729 * v + 0.432951) + 0.238081;
    return a / b;
  });
  const o = [
    1.60475 * m[0] - 0.53108 * m[1] - 0.07367 * m[2],
    -0.10208 * m[0] + 1.10813 * m[1] - 0.00605 * m[2],
    -0.00327 * m[0] - 0.07276 * m[1] + 1.07602 * m[2],
  ].map((v) => Math.min(1, Math.max(0, v)));
  return o.map((v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
}

/* ---------------------------------------------------------------- *
 * THE SINGLETON. index.html loads this module ahead of main.js, so the
 * current is crossing the frame before the scene's graph has finished
 * arriving; main.js imports the same specifier and therefore the same
 * instance (ESM module cache), and hands the field over when the scene
 * exists.
 * ---------------------------------------------------------------- */
export const heroSpores = createPreload();

// A module script is deferred by definition, so the parser has already
// reached </body> and #stage exists. boot() is guarded and idempotent
// either way; the `document` test is only so the tools that PARSE this
// tree in node can also import it without a DOM.
if (typeof document !== 'undefined') heroSpores.boot();

/* ---------------------------------------------------------------- *
 * HALF TWO — the same field inside the organism's scene.
 * ---------------------------------------------------------------- */

/**
 * Rebuild the preload stream as a THREE.Points in the hero scene, at the
 * exact state the preload layer is holding, and keep advancing it under
 * the organism's OWN wind.
 *
 * THE BASIS IS FROZEN HERE and never re-read. Before this call the view
 * plane follows the viewport, because composing is what that phase is
 * for; after it the field is world-static, so the journey's camera can
 * leave the hero and come back to find the same air. That is the same
 * contract the mushroom's shed has, and it is why a chapter boundary
 * moves nothing.
 *
 * @param ctx  organism.js's shared context — `makePoints`, `pushC`,
 *             `scene`, `addAnimator` and `breeze` come down on it, which
 *             is what lets this module stay free of `three`.
 * @param carried  the preload's live field + view + `fadeDelay` (seconds to
 *             hold before the crossfade begins — handOff() sets it to the
 *             remainder of that layer's entry ramp), or null (the scene
 *             booted without a preload: seed a fresh one off the same law)
 * @param fadeSeconds  the crossfade beat, matched to handOff()'s own
 */
export function createHeroSporeField(ctx, carried, fadeSeconds = 0) {
  const { makePoints, pushC, scene, addAnimator, breeze } = ctx;
  const heroMode = carried ? null : createHeroMode();
  const view = carried ? carried.view : readView(heroMode);
  const F = carried ? carried.field : createField(view, PRELUDE_SEED);
  const B = basisOf(view);
  const origin = [view.camX, view.camY, view.camZ];

  const pos = [], col = [], siz = [];
  for (let i = 0; i < F.n; i++) {
    pos.push(0, 0, 0);
    pushC(col, F.tone[i]);
    siz.push(F.size[i]);
  }
  const pts = makePoints(pos, col, siz, OPACITY);
  // Nothing keys a draw window onto this object, so it keeps makePoints'
  // parked default (-2, -1) and is fully inked from the first frame. That
  // is the point: this air was already here when the visitor arrived, and
  // the intro draws the MUSHROOM into it.
  pts.frustumCulled = false;
  const buf = pts.geometry.attributes.position;
  const colAttr = pts.geometry.attributes.color;

  /** The scene-side half of the choreography's light: the same
   *  F.color x F.fade the preload canvas uploads, written into this
   *  Points' own colour attribute — one brightness law, two renderers,
   *  so a landing collapse or a ring burst is identical on both sides of
   *  the seam. (This also keeps a recycled particle's fresh tone, which
   *  the build-time colours alone would not.) */
  function inkFades() {
    const carr = colAttr.array;
    for (let i = 0; i < F.n; i++) {
      const i3 = i * 3, f = F.fade[i];
      carr[i3] = F.color[i3] * f;
      carr[i3 + 1] = F.color[i3 + 1] * f;
      carr[i3 + 2] = F.color[i3 + 2] * f;
    }
    colAttr.needsUpdate = true;
  }
  inkFades();

  /* THE PARITY THIS FUNCTION OWES, stated because nothing else states it and
     it failed silently once. `basisOf` returns the camera's OWN axes, so a
     particle at view-plane offsets (a, b) and depth d lands in camera space
     at exactly (a, b, -d) — and the scene's perspective camera then divides
     by d * tanHalfFov, which is the preload VERT's own `halfH`. The two
     renderers therefore put the same particle on the same pixel, and the
     seam moves nothing. Break the basis (a sign, a swapped axis, a stale
     fov) and NOTHING ERRORS: the field simply re-composes somewhere else the
     instant the mushroom arrives. The invariant to check after any edit here
     is per-particle screen parity, not that the stream still looks composed. */
  function project() {
    const arr = buf.array;
    for (let i = 0; i < F.n; i++) {
      const i3 = i * 3;
      const a = F.frame[i3], b = F.frame[i3 + 1], d = F.frame[i3 + 2];
      arr[i3] = origin[0] + B.fx * d + B.rx * a + B.ux * b;
      arr[i3 + 1] = origin[1] + B.fy * d + B.ry * a + B.uy * b;
      arr[i3 + 2] = origin[2] + B.fz * d + B.rz * a + B.uz * b;
    }
    buf.needsUpdate = true;
  }
  project();
  scene.add(pts);

  /* The complementary half of handOff()'s linear fade — and it is priced
     on the WALL CLOCK, not on the frame loop's `t`, because the thing it
     has to stay level with is the preload's own wall-clock ramp. Two
     consequences, both wanted: ?capture= freezes the scene clock at t = 0
     with dt = 0 and this ramp still completes, so a frozen frame is shot
     at full brightness rather than at nothing; and the ramp is over
     inside a second, long before organism/intro.js's fast-forward skews
     performance.now(), so it never reads that skew. */
  const gain = pts.material.uniforms.uOpacity;
  const fadeMs = fadeSeconds * 1000;
  /* handOff()'s own wait, carried across so BOTH halves of the crossfade start
     on the same frame. It is the remainder of the preload layer's entry ramp,
     and it is non-zero only when the scene beat that ramp to the screen;
     through it the preload is still the only thing drawing this field, so
     holding the gain at 0 shows exactly the entry already in progress. Zero on
     every capture (?capture= waits for readiness, by which time the ramp is
     long finished), which is what keeps the note above true: a frozen frame is
     still shot at full brightness. */
  const delayMs = (carried && carried.fadeDelay > 0) ? carried.fadeDelay * 1000 : 0;
  let fadeFrom = performance.now() + delayMs;
  let fadeLen = fadeMs;
  let fading = fadeMs > 0;
  if (fading) gain.value = 0;

  /* THE DEFERRED CARRY (the worker path; see heroSpores.handOff). The field
     handed in is the right shape but not yet the live one: the live field
     is in the prelude's worker, which keeps drawing the stream while the
     journey is built on this thread. Until adoption this object is held
     dark and still — nothing to integrate, nothing to draw. When the worker's
     field lands (adoptSnapshot has already copied it in), the pair of linear
     fades starts on the wall-clock instant both halves were given, and for
     the length of that crossfade this copy rides the worker's own gust
     (preloadGust on the worker's clock), so the two pictures of each spore
     stay on top of each other until the worker's half is gone. */
  let adopted = !(carried && carried.deferred);
  let gustEpoch0 = 0;
  let gustUntil = -Infinity;
  if (!adopted) {
    gain.value = 0;
    fading = false;
    // nothing in the scene moves until this field is adopted and the growth
    // begins, so its composer holds a finished frame instead of redrawing it
    // (organism/animation.js holdRender — the worker shares this GPU)
    if (typeof ctx.holdRender === 'function') ctx.holdRender(true);
    carried.whenAdopted(({ fadeFromEpoch, fadeMs: ms, epoch0 }) => {
      if (typeof ctx.holdRender === 'function') ctx.holdRender(false);
      adopted = true;
      fadeFrom = fadeFromEpoch - performance.timeOrigin;
      fadeLen = ms;
      fading = ms > 0;
      gustEpoch0 = epoch0;
      gustUntil = fadeFrom + ms;
      if (!fading) gain.value = OPACITY;
      project();
      inkFades();
    });
  }

  // Registered after 'spore-drift' so the two sheds are integrated in one
  // pass, before any journey-layer animator reads positions. The gust is
  // the organism's own breeze() — from here on there is one wind and one
  // copy of it, and the transitional stand-in above is out of the picture.
  addAnimator('hero-spore-drift', (t, dt) => {
    if (!adopted) return;
    if (carried && carried.deferred) carried.tick();
    if (fading) {
      const p = Math.min(1, Math.max(0, (performance.now() - fadeFrom) / fadeLen));
      gain.value = OPACITY * p;
      if (p >= 1) fading = false;
    }
    if (!F.preloadDriven) {
      const nowMs = performance.now();
      const gust = nowMs < gustUntil
        ? preloadGust((performance.timeOrigin + nowMs - gustEpoch0) / 1000)
        : 0.72 + 0.28 * breeze(t);
      advance(F, dt, gust);
    }
    project();
    inkFades();
  });

  return { points: pts, field: F };
}
