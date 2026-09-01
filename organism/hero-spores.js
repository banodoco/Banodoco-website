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
 *             a shared wind with gentle per-particle curl, and a few
 *             larger, brighter HERO spores riding inside the flow.
 *   LANDING   two or three of those hero spores peel out of the current,
 *             arc down to the real ground network's own points — site 0
 *             IS the mushroom origin — and land: a point of light, a
 *             small burst of sparks, a soft pool of warmth. The rest of
 *             the current keeps travelling right past them.
 *   NETWORK   each landing wakes an island of the PreNetwork — a sparse,
 *             dim skeleton of the REAL ground web (network-skeleton.js),
 *             filaments creeping outward from the impact while the
 *             stream still moves above. Once two islands are awake,
 *             faint pulses run the spine paths between them.
 *   HANDOFF   when the journey is prepared, a brightness pulse runs the
 *             spine paths inward and the intro is released as it reaches
 *             the origin — the real ground web converges in under the
 *             fading skeleton (organism/intro.js draws it inward over the
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
 *     exits off-screen right; only the hero spores land.
 *   - the traveling amber light: replaced by the hero-spore landings.
 *     A repeating light aimed at the spot both pre-marked the target
 *     ("no ghost") and read as a finished loop waiting on a slow load.
 *   - the pre-lit breathing pool: the ground is earned by impact now.
 *     The pools exist but stay dark until a spore lands on them.
 *   - the ambient washes: partially kept. The general back/right warmth
 *     survives ("meaningful darkness, never dead" — it marks nothing);
 *     the landing-zone ground wash now fades in WITH the network's
 *     activation instead of preceding it.
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
import { PIN_PR } from '../flags.js';
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
 *   nH     hero spores: larger, brighter, riding inside the flow. The
 *          landing choreography draws its 2-3 landing spores from these.
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
  desktop: {
    nA: 1450, nH: 8, land: 3, xIn: -1.42, xOut: 1.42, e: [0.50, 1.14],
    fall: [0.10, 0.28], depth: [6.2, 15.5], gain: 6.0, dpr: 2, lum: 1,
  },
  // Landscape under aspect 1.55 — iPads on their side, narrow laptop
  // windows. Same reading, a shade steeper for the shorter frame.
  deskNarrow: {
    nA: 1280, nH: 8, land: 3, xIn: -1.42, xOut: 1.42, e: [0.50, 1.12],
    fall: [0.12, 0.32], depth: [6.2, 15.5], gain: 6.0, dpr: 2, lum: 1,
  },
  // Short landscape (a phone on its side; a very shallow window).
  compact: {
    nA: 470, nH: 5, land: 2, xIn: -1.40, xOut: 1.40, e: [0.46, 1.06],
    fall: [0.08, 0.26], depth: [6.2, 15.0], gain: 5.2, dpr: 1.5, lum: 0.9,
  },
  // iPad portrait, 744x1133. Steeper: from the upper-left edge across
  // the copy column's shoulder and out the right side above the specimen.
  // Portrait has less sky, so the weather is scaled back (`lum`): full
  // desktop light over a narrower band would swamp the column of copy.
  tablet: {
    nA: 540, nH: 6, land: 2, xIn: -1.36, xOut: 1.38, e: [0.58, 1.16],
    fall: [0.35, 0.80], depth: [6.5, 15.5], gain: 4.8, dpr: 1.5, lum: 0.85,
  },
  // Phone portrait, 430x932. The steepest and sparsest — the current
  // crosses the copy column (few dots, dimmed by the corridor) and exits
  // right at mid-height. Never snowfall.
  mobile: {
    nA: 340, nH: 5, land: 2, xIn: -1.34, xOut: 1.36, e: [0.58, 1.18],
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
  // `size` scales the size draw: the far band's sprites would otherwise
  // all land under the 1.7-device-pixel floor and its area dimming, and a
  // band that is 50% of the population would carry almost none of the
  // light — measured on the first shot of this composition, which read as
  // a starfield for exactly that reason.
  // These luminances were retuned a second time against the reference
  // renders: the first pass (far 0.95 / mid 1.18) still read as a
  // starfield beside the reference's river of light. The current has to
  // read as WEATHER at a glance from normal viewing distance — the far
  // band is the cloud's body and carries most of its glow, the midground
  // is the legible flow, and the near passers-by stay sparse.
  { share: 0.50, d0: 0.52, d1: 0.92, lum: 1.70, vel: 0.80, size: 2.05 }, // far haze
  { share: 0.38, d0: 0.18, d1: 0.52, lum: 1.85, vel: 1.00, size: 1.35 }, // the body
  { share: 0.12, d0: 0.00, d1: 0.18, lum: 1.45, vel: 1.20, size: 1.0 },  // near, blurred
];
// Hero spores: bigger and warmer, but from the same families — the size
// and tone draws below are the shed's own with the exponents relaxed.
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

/* ---- the landing choreography's clock table (seconds of field time) --
 * Nominal windows from the spec §5: arrival 0.2-1.2, landings 0.8-2.2,
 * ground response 1.6-3.5, handoff 2.5-5.0. `PEEL_AT` staggers the 2-3
 * landing spores; `PEEL_S` is each arc's flight time. When sceneReady
 * arrives early the remaining peels COMPRESS (RATE_FAST) rather than
 * skip — "accelerate the next landing rather than hard-cut". */
const PEEL_AT = [1.05, 1.85, 2.65];
const PEEL_S = [1.00, 1.10, 1.15];
const LAND_COLLAPSE_S = 0.24;   // the landed spore's light sinks into the ground
const RESPAWN_S = 2.6;          // then the hero slot re-enters with the current
const RATE_FAST = 1.9;          // compression when the scene is already ready
const EXTRA_PEEL_S = 5.4;       // elastic hold: occasional extra landings
// Ring burst: an impact throws a small ring of sparks along the ground —
// restrained; a point of light and a faint ring, never fireworks.
const RING_N = 9;               // 1 flash + 8 sparks per impact
const RING_BANKS = 2;           // two impacts may overlap in the elastic hold
const RING_S = 0.85;            // seconds of ring life
const RING_R = 0.62;            // world radius the sparks reach
// Comet trail: a short string of fading embers behind each descending
// hero spore. The reference's landing bodies read as luminous comets —
// a core with a tail — not as dots changing rows; the tail is what makes
// the peel legible at arm's length. The embers are parked slots (like
// the ring banks), strung along the live arc each frame, so a reframe
// mid-flight re-aims them with the bezier for free.
const TRAIL_N = 12;             // embers per descent
const TRAIL_BANKS = 3;          // concurrent descents (compression overlaps)
const TRAIL_GAP = 0.045;        // arc-parameter spacing between embers
// The ground's own tempo: how fast a woken island's filaments creep
// outward, and the handoff pulse's run to the origin.
const NET_GROW_V = 1.15;        // world units / second of filament creep
const NET_MIN_S = 0.35;         // ground response legible before convergence
const CONV_S = 0.85;            // the convergence pulse's travel time
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
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
  // The shed's own draws (see the header); hero spores relax the size
  // exponent and lift the tone floor — bigger and warmer, same families,
  // and prominent enough that the eye can pick one out of the flow and
  // follow it (the spec's "what the eye will follow next").
  F.size[i] = hero
    ? 0.235 + Math.pow(rand(), 1.3) * 0.130
    : ring ? 0.030 : (Math.pow(rand(), 1.8) * 0.072 + 0.019) * szMul;
  F.tone[i] = hero ? 0.88 + rand() * 0.12 : 0.64 + Math.pow(rand(), 1.9) * 0.36;
  F.speed[i] = (0.028 + rand() * 0.055) * c.gain * vel * (hero ? 1.05 : 1);
  F.seed[i] = rand() * Math.PI * 2;
  F.wobF[i] = WOB_FREQ[0] + (WOB_FREQ[1] - WOB_FREQ[0]) * rand();
  heatLinear(F.tone[i], F.color, i3);
  // The river carries more light than its haze: core bodies get a lift
  // over their band's own luminance, so the spine of the current is what
  // the eye reads first. Hero spores outrank everything — they are the
  // ones that will peel, and the reference's descending bodies GLOW.
  const lg = hero ? 3.1 : lum * (c.lum || 1) * (core ? 1.25 : 1);
  F.color[i3] *= lg; F.color[i3 + 1] *= lg; F.color[i3 + 2] *= lg;
  F.attrsDirty = true;
}

/** Ring slot construction: the flash is a larger, hotter sprite; the
 *  sparks are small embers. All parked dark until an impact claims them. */
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

/** Trail slot construction: small warm embers, brightest sizes at the
 *  head of the string. Parked dark until a peel claims a bank. */
function seedTrails(F, rand) {
  for (let b = 0; b < TRAIL_BANKS; b++) {
    for (let k = 0; k < TRAIL_N; k++) {
      const i = F.nA + F.nH + RING_BANKS * RING_N + b * TRAIL_N + k;
      const i3 = i * 3;
      // sized to survive the 300/depth divide at the arc's ~8-10 world
      // units: the head embers draw at ~4-5 px, the tail tapers off. The
      // first cut used 0.05 draws, which floored out at under 2 px and
      // made the tail invisible at any distance.
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
    landings: [],          // {hi, site, tPeel, dur, state, p0..p3, impactAt}
    rings: [],             // {site, bank, t0}
    ringBank: 0,
    trailBank: 0,
    lastImpactAt: -1,
    firstImpactAt: -1,
    nextExtraAt: -1,
    attrsDirty: true,
  };
  for (let i = 0; i < c.nA + c.nH; i++) seedOne(F, i, c, rand, false);
  seedRings(F, rand);
  seedTrails(F, rand);
  frameAnchors(F, view);
  planLandings(F);
  return F;
}

/** The initial landing plan: `land` of the hero spores, staggered per
 *  PEEL_AT, one per site in order (site 0 — the mushroom origin — first). */
function planLandings(F) {
  F.landings.length = 0;
  for (let k = 0; k < F.comp.land; k++) {
    F.landings.push({
      hi: F.nA + k, site: k % LANDING_SITES.length,
      tPeel: PEEL_AT[k], dur: PEEL_S[k],
      state: 0, impactAt: 0,
      p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0], p3: [0, 0, 0],
    });
  }
}

/** Re-frame an existing field for a new viewport without re-seeding it:
 *  the particles keep their identity and their streamline, the aim is
 *  re-read for the new mode, and the composition follows the frame. */
function reframe(F, view) {
  const c = COMPOSITION[view.mode] || COMPOSITION.desktop;
  const oldAspect = F.aspect;
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
    const halfH = d * F.tanHalfFov;
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
  // a spore mid-arc re-aims its remaining flight at the site's new frame
  for (const L of F.landings) {
    if (L.state === 1) aimBezier(F, L, F.frame, L.hi * 3);
  }
}

/** The hero spore a peel claims: whichever free hero is riding the
 *  current upwind of the site and nearest to it, so every arc is a short
 *  local departure from the flow. Falls back to the plain nearest if
 *  nothing is upwind (they recycle within seconds anyway). */
function pickPeeler(F, site) {
  const s3 = site * 3;
  const sxN = F.sites[s3] / (F.sites[s3 + 2] * F.tanHalfFov * F.aspect);
  let best = -1, bestScore = Infinity, fall = -1, fallD = Infinity;
  for (let i = F.nA; i < F.nA + F.nH; i++) {
    if (heldByLanding(F, i)) continue;
    const i3 = i * 3;
    const halfH = F.frame[i3 + 2] * F.tanHalfFov;
    const xN = F.frame[i3] / (halfH * F.aspect);
    const yN = F.frame[i3 + 1] / halfH;
    const syN = F.sites[s3 + 1] / (F.sites[s3 + 2] * F.tanHalfFov);
    const d = Math.hypot(xN - sxN, yN - syN);
    if (d < fallD) { fallD = d; fall = i; }
    if (xN > sxN - 0.05 || xN < -1.0) continue;   // upwind of the site, on screen
    if (d < bestScore) { bestScore = d; best = i; }
  }
  return best >= 0 ? best : fall >= 0 ? fall : F.nA;
}

/** The peel arc: a cubic from the spore's current position and travel
 *  direction down to its site. P1 continues the current's own tangent —
 *  the spore is first legible as a member of the flow and visibly LEAVES
 *  it — and P2 hangs above the site so the arc arrives from the air,
 *  not from the side. Returns the arc's frame-space span, which prices
 *  the flight time. */
function aimBezier(F, L, src, srcAt) {
  const s3 = L.site * 3;
  L.p0[0] = src[srcAt]; L.p0[1] = src[srcAt + 1]; L.p0[2] = src[srcAt + 2];
  L.p3[0] = F.sites[s3]; L.p3[1] = F.sites[s3 + 1]; L.p3[2] = F.sites[s3 + 2];
  const D = Math.hypot(L.p3[0] - L.p0[0], L.p3[1] - L.p0[1]);
  L.p1[0] = L.p0[0] + 0.40 * D;             // ride the wind a beat longer
  L.p1[1] = L.p0[1] - 0.10 * D * F.fallJ[L.hi] * F.aspect;
  L.p1[2] = L.p0[2];
  L.p2[0] = L.p3[0] + 0.02 * D;             // then drop, nearly from above
  L.p2[1] = L.p3[1] + 0.46 * D;
  L.p2[2] = L.p3[2];
  return D;
}

/** Advance the whole field by `dt` seconds under `gust`. This is the one
 *  integrator; the preload canvas and the scene-side Points both call it,
 *  which is why the handoff cannot move a particle — and why a landing
 *  that happens across the seam is the same landing on both sides. */
function advance(F, dt, gust) {
  const c = F.comp;
  const step = Math.min(dt, 0.05);
  F.t += step;
  const rate = F.sceneReady ? RATE_FAST : 1;

  // ---- the stream: ambient + hero spores not currently peeling ----
  for (let i = 0; i < F.nA + F.nH; i++) {
    const i3 = i * 3;
    if (F.band[i] === 3 && heldByLanding(F, i)) continue;
    const d = F.frame[i3 + 2];
    const v = F.speed[i] * gust * step;
    F.frame[i3] += v;
    F.frame[i3 + 1] -= v * F.fallJ[i];
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
    // THE RECYCLE — off-screen right, back to off-screen left, with fresh
    // draws. The current continues past the frame on both edges, so most
    // spores visibly pass through and leave (the spec's hard world-building
    // requirement), and the stationary distribution never thins or loops.
    if (xNdc > c.xOut) seedOne(F, i, c, F.rand, true);
  }

  // ---- the landings ----
  for (const L of F.landings) {
    if (L.state === 0) {
      // compression: a ready scene pulls the remaining peels forward
      if (rate > 1 && L.tPeel > F.t + 0.15) L.tPeel = F.t + 0.15;
      if (F.t >= L.tPeel) {
        L.state = 1;
        // THE PEEL CHOOSES ITS SPORE AT THE LAST MOMENT: whichever free
        // hero spore is currently riding the current upwind of the site,
        // nearest to it. A fixed cast member could be anywhere — a spore
        // picked from the far corner crosses half the frame in a second
        // and reads as a meteor, which is exactly the grammar the spec
        // rules out. Nearby, the peel reads as a choice, and the flight
        // time scales with the actual arc so the pace stays constant.
        L.hi = pickPeeler(F, L.site);
        const D = aimBezier(F, L, F.frame, L.hi * 3);
        const halfH = F.frame[L.hi * 3 + 2] * F.tanHalfFov;
        L.dur = L.dur * Math.min(1.5, Math.max(0.7, (D / halfH) / 0.85));
        if (rate > 1) L.dur = Math.max(0.55, L.dur / 1.5);
        L.t0 = F.t;
        // claim a trail bank for the descent's comet tail
        L.bank = F.trailBank;
        F.trailBank = (F.trailBank + 1) % TRAIL_BANKS;
      }
      continue;
    }
    const hi3 = L.hi * 3;
    if (L.state === 1) {
      const u = Math.min(1, (F.t - L.t0) / L.dur);
      // ease-in, land with a little pace left — an arrival, not a hover
      const e = u * u * (2.05 - 1.05 * u);
      const m0 = (1 - e) * (1 - e) * (1 - e), m1 = 3 * (1 - e) * (1 - e) * e,
        m2 = 3 * (1 - e) * e * e, m3 = e * e * e;
      for (let k = 0; k < 3; k++) {
        F.frame[hi3 + k] = m0 * L.p0[k] + m1 * L.p1[k] + m2 * L.p2[k] + m3 * L.p3[k];
      }
      // the descending core swells as it commits — the reference's
      // landing bodies are the brightest things in the sky
      F.fade[L.hi] = 1 + 0.4 * e;
      // the comet tail: embers strung back along the arc behind the
      // body, head-weighted and faint, each lighting only once the body
      // is far enough along that it has an arc to trail
      const tb = F.nA + F.nH + RING_BANKS * RING_N + (L.bank || 0) * TRAIL_N;
      for (let k = 0; k < TRAIL_N; k++) {
        const ek = e - (k + 1) * TRAIL_GAP;
        const ti3 = (tb + k) * 3;
        if (ek <= 0) { F.fade[tb + k] = 0; continue; }
        const n0 = (1 - ek) * (1 - ek) * (1 - ek), n1 = 3 * (1 - ek) * (1 - ek) * ek,
          n2 = 3 * (1 - ek) * ek * ek, n3 = ek * ek * ek;
        F.frame[ti3] = n0 * L.p0[0] + n1 * L.p1[0] + n2 * L.p2[0] + n3 * L.p3[0];
        F.frame[ti3 + 1] = n0 * L.p0[1] + n1 * L.p1[1] + n2 * L.p2[1] + n3 * L.p3[1];
        F.frame[ti3 + 2] = n0 * L.p0[2] + n1 * L.p1[2] + n2 * L.p2[2] + n3 * L.p3[2];
        F.fade[tb + k] = 0.9 * (1 - (k + 1) / (TRAIL_N + 1));
      }
      if (u >= 1) {
        L.state = 2;
        L.impactAt = F.t;
        F.lastImpactAt = F.t;
        if (F.firstImpactAt < 0) F.firstImpactAt = F.t;
        spawnRing(F, L.site);
        if (ground && !ground.gone) ground.wake(L.site, F.t);
      }
      continue;
    }
    // state 2: the light sinks into the ground it just woke — from the
    // swollen brightness the descent arrived at — and the comet tail
    // dies behind it; then the hero slot re-enters the current upstream
    // with fresh draws.
    const since = F.t - L.impactAt;
    F.fade[L.hi] = Math.max(0, 1.4 * (1 - since / LAND_COLLAPSE_S));
    const tb2 = F.nA + F.nH + RING_BANKS * RING_N + (L.bank || 0) * TRAIL_N;
    const tk = Math.max(0, 1 - since / 0.30);
    for (let k = 0; k < TRAIL_N; k++) {
      F.fade[tb2 + k] = 0.9 * (1 - (k + 1) / (TRAIL_N + 1)) * tk;
    }
    if (since > RESPAWN_S) {
      L.state = 3;
      seedOne(F, L.hi, c, F.rand, true);
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
        tPeel: F.t + 0.1, dur: 1.1, t0: 0, state: 0, impactAt: 0,
        p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0], p3: [0, 0, 0],
      });
    }
  }

  // ---- the ring bursts ----
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
    // the flash: a concentrated point of light, briefly brighter than the
    // spore that carried it, decaying fast
    F.frame[base * 3] = F.sites[s3];
    F.frame[base * 3 + 1] = F.sites[s3 + 1];
    F.frame[base * 3 + 2] = F.sites[s3 + 2];
    F.fade[base] = 2.3 * Math.exp(-u * 5.2);
    // the sparks: a faint ring expanding along the ground, dying as it goes
    const eu = 1 - (1 - u) * (1 - u);
    for (let k = 1; k < RING_N; k++) {
      const i3 = (base + k) * 3;
      const e3 = (R.site * (RING_N - 1) + (k - 1)) * 3;
      F.frame[i3] = F.sites[s3] + (F.ringEnds[e3] - F.sites[s3]) * eu;
      F.frame[i3 + 1] = F.sites[s3 + 1] + (F.ringEnds[e3 + 1] - F.sites[s3 + 1]) * eu;
      F.frame[i3 + 2] = F.sites[s3 + 2] + (F.ringEnds[e3 + 2] - F.sites[s3 + 2]) * eu;
      F.fade[base + k] = 1.35 * Math.pow(1 - u, 1.6);
    }
  }
}

function heldByLanding(F, i) {
  for (const L of F.landings) {
    if (L.hi === i && (L.state === 1 || L.state === 2)) return true;
  }
  return false;
}

function spawnRing(F, site) {
  F.rings.push({ site, bank: F.ringBank, t0: F.t });
  F.ringBank = (F.ringBank + 1) % RING_BANKS;
}

/** The gust the shed rides, in the transitional layer only.
 *  organism/organism.js's `breeze()` IS the wind of this site and the
 *  migrated field below reads it directly off ctx. This is a stand-in for
 *  the seconds before that module exists — same shape, same period, and
 *  it stops being consulted the moment the scene does. */
function preloadGust(t) {
  return 0.72 + 0.28 * (0.55 + 0.45 * Math.sin(t * 0.13 + 0.6))
    * (0.62 * Math.sin(t * 1.20) + 0.26 * Math.sin(t * 1.83 + 1.3));
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
const BLOOM_GAIN = 0.21;
const BLOOM_SIGMA = 1.60;

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

const LAYER_CSS = 'position:fixed;inset:0;z-index:0;pointer-events:none;'
  // The stream has to add light to the frame the way the shed does, not
  // paint over it. plus-lighter IS addition; screen is the fallback for
  // engines that lack it and is close enough on a field this dim.
  + 'mix-blend-mode:screen;mix-blend-mode:plus-lighter;'
  + `opacity:0;transition:opacity ${ENTRY_MS}ms ease;`;

/* ---------------------------------------------------------------- *
 * THE GROUND — the PreNetwork singleton: skeleton choreography, the
 * landing pools, and the ambient warmth. Module-scope because advance()
 * reports impacts into it from EITHER integrator, the way the old
 * overture took ticks from both drivers.
 * ---------------------------------------------------------------- *
 * The GL half (the skeleton lines) draws on the preload canvas; the DOM
 * half is three soft glows that CSS rasterises better than a shader
 * would: a general warmth across the back and right of the frame
 * (present from boot — "meaningful darkness, never dead" — and aimed at
 * nothing), a ground wash under the landing zone that fades in WITH the
 * network's activation, and one pool per landing site that lights when
 * a spore strikes it. Nothing here marks the mushroom's spot before a
 * landing has earned it: no pre-lit pool, no traveling light, no
 * skeleton ink. The ground is earned by impact.
 */
const NET_ALPHA = 1.55;

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

  // ---- the DOM glows ----
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = LAYER_CSS; // same shell as the spores: fixed, additive, entry fade
  const warmth = document.createElement('div');
  const groundWash = document.createElement('div');
  for (const d of [warmth, groundWash]) {
    d.style.cssText = 'position:absolute;inset:0;';
    el.appendChild(d);
  }
  groundWash.style.opacity = '0';
  const pools = LANDING_SITES.map(() => {
    const p = document.createElement('div');
    p.style.cssText = 'position:absolute;inset:0;opacity:0;';
    el.appendChild(p);
    return p;
  });

  const state = {
    wakeAt: [-1, -1, -1],
    poolLit: [0, 0, 0],
    convStartAt: -1,     // choreography-clock time the pulse leaves the islands
    struckAt: -1,        // wall-clock ms of the strike (releaseIntro's frame)
    exitAt: -1,          // choreography-clock time the skeleton fade began
    gone: false,
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
        ((out[0] / (halfH * vw.aspect)) + 1) / 2 * 100,
        (1 - out[1] / halfH) / 2 * 100,
      ]);
    }
    warmth.style.background =
      `radial-gradient(ellipse 46% 44% at ${Math.min(94, px[0][0] + 10).toFixed(1)}% 56%, rgba(214,142,58,0.05), transparent 74%),`
      + 'radial-gradient(ellipse 30% 58% at 103% 60%, rgba(226,160,74,0.042), transparent 76%)';
    groundWash.style.background =
      `radial-gradient(ellipse 52% 20% at ${px[0][0].toFixed(1)}% ${Math.min(104, px[0][1] + 9).toFixed(1)}%, rgba(224,152,66,0.16), transparent 70%)`;
    pools.forEach((p, s) => {
      // Compact and hot, not broad and washy: the reference's impact
      // pools are concentrated orbs of warmth the size of the strike,
      // and spreading the same light across a third of the frame is what
      // made the first cut read as fog instead of a glowing pool.
      const w = s === 0 ? 18 : 11;
      const h = s === 0 ? 7.5 : 4.8;
      const a = s === 0 ? 0.68 : 0.5;
      p.style.background =
        `radial-gradient(ellipse ${w}% ${h}% at ${px[s][0].toFixed(1)}% ${px[s][1].toFixed(1)}%, rgba(255,196,106,${a}), rgba(224,146,60,0.10) 48%, transparent 72%)`;
    });
  }
  reframeGlow(view);

  if (reduced) {
    // the still ground: general warmth plus a gentle resting ground
    // illumination, painted once — no wake fronts, no pulses, no loop
    groundWash.style.opacity = '0.4';
  }

  function wake(site, t) {
    if (state.wakeAt[site] < 0) state.wakeAt[site] = t;
    else state.poolLit[site] = Math.min(1.6, state.poolLit[site] + 0.8); // a re-landing re-pulses
  }

  const awakeCount = () => state.wakeAt.filter((w) => w >= 0).length;

  /** The per-frame choreography, CPU-lit into `lit`. `t` is the FIELD's
   *  clock (advance's), so a hidden tab freezes the ground exactly as it
   *  freezes the stream. Returns true when any vertex carries light —
   *  the caller skips the draw call entirely on a dark network. */
  function relight(t) {
    if (state.gone) return false;
    let any = false;
    // convergence front: distance-from-origin sweeping DMAX -> 0
    let convFront = -1;
    if (state.convStartAt >= 0 && t >= state.convStartAt) {
      convFront = 3.4 * (1 - Math.min(1, (t - state.convStartAt) / CONV_S));
    }
    // the exit: after the strike the real web is drawing itself in
    // underneath (organism/intro.js's converging ground windows), and the
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
      k *= NET_ALPHA * exitK;
      lit[v * 3] = base[v * 3] * k;
      lit[v * 3 + 1] = base[v * 3 + 1] * k;
      lit[v * 3 + 2] = base[v * 3 + 2] * k;
      any = true;
    }
    // DOM glows follow the same clock
    const nowMs = performance.now();
    for (let s = 0; s < pools.length; s++) {
      const w = state.wakeAt[s];
      if (w < 0) continue;
      state.poolLit[s] = Math.max(state.poolLit[s], Math.min(1, (t - w) / 0.3));
      let o = state.poolLit[s] * (0.85 + 0.08 * Math.sin(nowMs / 1000 * 1.1 + s));
      if (s === 0 && state.struckAt >= 0) {
        // THE STRIKE: one larger swell breathing under the growth's start
        o += 0.9 * Math.exp(-(nowMs - state.struckAt) / 800);
      }
      pools[s].style.opacity = Math.min(1, o).toFixed(3);
      state.poolLit[s] *= Math.pow(0.5, ((t - w) > 0.3 ? 0.016 : 0) / 3.5); // slow settle of re-pulses
    }
    const act = Math.max(
      state.wakeAt[0] < 0 ? 0 : Math.min(1, (t - state.wakeAt[0]) / 1.2),
      state.wakeAt[1] < 0 ? 0 : Math.min(0.8, (t - state.wakeAt[1]) / 1.5),
      state.wakeAt[2] < 0 ? 0 : Math.min(0.8, (t - state.wakeAt[2]) / 1.5));
    groundWash.style.opacity = (0.72 * act * exitK).toFixed(3);
    return any;
  }

  function remove() {
    state.gone = true;
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  return {
    el, pos, lit, nV, projectAll, reframeGlow, relight, wake, state,
    get gone() { return state.gone; },
    awakeCount,
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
      if (state.convStartAt < 0 || state.convStartAt > t) {
        state.convStartAt = t - CONV_S * 0.6; // un-armed strike: pulse mostly arrived
      }
      state.exitAt = t;
      setTimeout(() => {
        if (state.gone) return;
        el.style.transition = 'opacity 2600ms linear';
        el.style.opacity = '0';
        setTimeout(remove, 2700);
      }, 1500);
    },
    /** The no-ceremony exit for paths with no intro to strike under —
     *  ?nointro, ?capture, reduced motion. Fast but not a pop, and gone
     *  long before any capture's readiness gate opens its shutter. */
    dismiss() {
      if (state.gone) return;
      state.gone = true;
      el.style.transition = 'opacity 250ms linear';
      el.style.opacity = '0';
      setTimeout(remove, 350);
    },
  };
}

function createPreload() {
  const state = {
    live: false, failed: false, handedOff: false,
    field: null, view: null, heroMode: null,
    wrap: null, el: null, gl: null, reduced: false,
  };
  let rafId = null;
  let t0 = 0;
  let last = 0;
  let onVisibility = null;
  let onResize = null;
  let buffers = null;
  let uniforms = null;
  let attribs = null;
  let lineBuffers = null;
  let lineUniforms = null;
  let lineAttribs = null;
  let progPoints = null;
  let progLines = null;
  let meta = null;
  let lit = null;   // per-frame colour scratch: F.color x F.fade x streamGain
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
   *  a single matching cancel. */
  function schedule() {
    if (rafId === null && !state.reduced) rafId = requestAnimationFrame(tick);
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
    const gl = state.gl, F = state.field;
    gl.viewport(0, 0, state.el.width, state.el.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const gain = streamGain();
    if (gain > 0) {
      gl.useProgram(progPoints);
      gl.enableVertexAttribArray(attribs.meta);
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
      if (F.attrsDirty) {
        for (let i = 0; i < F.n; i++) { meta[i * 2] = F.size[i]; meta[i * 2 + 1] = F.seed[i]; }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.meta);
        gl.bufferData(gl.ARRAY_BUFFER, meta, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attribs.meta, 2, gl.FLOAT, false, 0, 0);
        F.attrsDirty = false;
      }
      gl.uniform1f(uniforms.time, now);
      gl.uniform1f(uniforms.tanHalfFov, F.tanHalfFov);
      gl.uniform1f(uniforms.aspect, F.aspect);
      gl.drawArrays(gl.POINTS, 0, F.n);
    }
    // the PreNetwork — only ever lit after a landing has woken an island.
    // The reduced-motion still never calls relight: its ground illumination
    // is createGround's own painted-once wash, and relight would overwrite it.
    if (ground && !ground.gone && !state.reduced && ground.relight(F.t)) {
      gl.useProgram(progLines);
      gl.disableVertexAttribArray(attribs.meta);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.frame);
      gl.bufferData(gl.ARRAY_BUFFER, ground.pos, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(lineAttribs.frame, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.color);
      gl.bufferData(gl.ARRAY_BUFFER, ground.lit, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(lineAttribs.color, 3, gl.FLOAT, false, 0, 0);
      gl.uniform1f(lineUniforms.tanHalfFov, state.field.tanHalfFov);
      gl.uniform1f(lineUniforms.aspect, state.field.aspect);
      gl.drawArrays(gl.LINES, 0, ground.nV);
    }
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
   * visitor this seam was breaking for. */
  function sizeCanvas() {
    const cap = (state.field && state.field.comp.dpr) || 2;
    const pr = Math.min(devicePixelRatio || 1, cap);
    // The number the scene's renderer will be constructed with. Read through
    // performance.js's own policy rather than re-derived here: the storage key
    // encodes the calibration RULE, and a second copy of that derivation is
    // exactly the drift the key was introduced to prevent.
    const scenePr = createPixelRatioPolicy(PIN_PR).initial;
    pxScale = scenePr > 0 ? pr / scenePr : 1;
    if (state.gl && uniforms) {
      state.gl.useProgram(progPoints);
      state.gl.uniform1f(uniforms.pxScale, pxScale);
    }
    state.el.width = Math.max(1, Math.round(innerWidth * pr));
    state.el.height = Math.max(1, Math.round(innerHeight * pr));
  }

  /** The hero copy's live box -> the corridor-dim uniform (VERT's uQuiet).
   *  Measured off the DOM so every viewport gets its own corridor and no
   *  mode table can drift from a layout change. */
  function readCopyBox() {
    if (!state.gl || !uniforms) return;
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
    state.gl.useProgram(progPoints);
    state.gl.uniform4f(uniforms.quiet, x0, y0, x1, y1);
  }

  function showStatic() {
    state.failed = true;
    state.live = false;
    stopLoop();
    if (!state.wrap) return;
    state.wrap.style.mixBlendMode = 'normal';
    state.wrap.style.background = STATIC_HAZE;
    state.wrap.style.opacity = '1';
  }

  function boot() {
    if (state.live || state.failed) return;
    const stage = document.getElementById('stage');
    if (!stage || !stage.parentNode) return;
    state.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.heroMode = createHeroMode();
    state.view = readView(state.heroMode);
    state.field = createField(state.view, 0x5be1);

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
    meta = new Float32Array(state.field.n * 2);
    lit = new Float32Array(state.field.n * 3);

    try {
      progPoints = linkProgram(gl, VERT, FRAG);
      progLines = linkProgram(gl, LINE_VERT, LINE_FRAG);
      gl.useProgram(progPoints);
      attribs = {
        frame: gl.getAttribLocation(progPoints, 'aFrame'),
        color: gl.getAttribLocation(progPoints, 'aColor'),
        meta: gl.getAttribLocation(progPoints, 'aMeta'),
      };
      for (const a of Object.values(attribs)) gl.enableVertexAttribArray(a);
      uniforms = {
        time: gl.getUniformLocation(progPoints, 'uTime'),
        tanHalfFov: gl.getUniformLocation(progPoints, 'uTanHalfFov'),
        aspect: gl.getUniformLocation(progPoints, 'uAspect'),
        // Set from sizeCanvas() rather than per frame: it changes only when a
        // device grid does, which is a resize and nothing else.
        pxScale: gl.getUniformLocation(progPoints, 'uPxScale'),
        quiet: gl.getUniformLocation(progPoints, 'uQuiet'),
      };
      buffers = { frame: gl.createBuffer(), color: gl.createBuffer(), meta: gl.createBuffer() };
      // organism/renderer.js clears to bg 0x1c160b; see the delta note above.
      const bgLin = [0x1c, 0x16, 0x0b].map((v) => srgbToLinear(v / 255));
      gl.uniform1f(gl.getUniformLocation(progPoints, 'uOpacity'), OPACITY);
      gl.uniform3f(gl.getUniformLocation(progPoints, 'uBgLinear'), bgLin[0], bgLin[1], bgLin[2]);
      const enc = encodeOnCpu(bgLin);
      gl.uniform3f(gl.getUniformLocation(progPoints, 'uBgEncoded'), enc[0], enc[1], enc[2]);
      gl.useProgram(progLines);
      lineAttribs = {
        frame: gl.getAttribLocation(progLines, 'aFrame'),
        color: gl.getAttribLocation(progLines, 'aColor'),
      };
      lineUniforms = {
        tanHalfFov: gl.getUniformLocation(progLines, 'uTanHalfFov'),
        aspect: gl.getUniformLocation(progLines, 'uAspect'),
      };
      gl.uniform3f(gl.getUniformLocation(progLines, 'uBgLinear'), bgLin[0], bgLin[1], bgLin[2]);
      gl.uniform3f(gl.getUniformLocation(progLines, 'uBgEncoded'), enc[0], enc[1], enc[2]);
      lineBuffers = { frame: gl.createBuffer(), color: gl.createBuffer() };
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    } catch (err) {
      console.error('[hero-spores] preload layer failed to start', err);
      showStatic();
      return;
    }

    // The ground rides the live path only: the static hero already
    // composes its own haze, and a page with no working WebGL has no
    // landings to answer. Inserted BEFORE the spore wrap, so the DOM
    // reads background -> glow -> stream, whatever addition thinks of it.
    ground = createGround(state.view, state.reduced);
    stage.parentNode.insertBefore(ground.el, state.wrap);

    sizeCanvas();
    readCopyBox();
    state.live = true;
    // While this layer is on screen it is the field's integrator; the
    // scene-side animator reads the flag and only projects. See tick().
    state.field.preloadDriven = true;
    t0 = performance.now();
    draw(0);
    // The stream arrives on the hero copy's own beat rather than snapping on.
    // The forced reflow — journey/boot/handoff.js's own trick at the preboot
    // rail swap — is what makes the transition run from 0 rather than being
    // collapsed into the same style recalculation. Deliberately NOT a second
    // requestAnimationFrame: this file keeps exactly one request site and one
    // matching cancel, which is what holds M8's per-file pin and M19's
    // zero-slack ceiling flat.
    void el.offsetWidth;
    el.style.opacity = '1';
    // the glows arrive on the stream's own beat: same reflow, same ramp
    ground.el.style.opacity = '1';
    // WHEN the entry ramp started, because handOff() needs to know whether it
    // is still running. Taken after the reflow above, which is the point the
    // transition actually begins from 0.
    entryAt = performance.now();
    // The sequencing this module exists for is only a claim until somebody
    // can measure it. This mark sits beside index.html's 'hero-entry-start'
    // and journey/boot/handoff.js's 'hero-intro-start', so a cold-load trace
    // reads copy -> atmosphere -> mushroom off one timeline.
    performance.mark('hero-spores-live');

    onResize = () => {
      if (!state.live) return;
      state.view = readView(state.heroMode);
      reframe(state.field, state.view);
      if (ground && !ground.gone) {
        ground.projectAll(state.view);
        ground.reframeGlow(state.view);
      }
      sizeCanvas();
      readCopyBox();
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
   *  page. Idempotent, and safe before boot() ever ran. THE GROUND'S DOM
   *  GLOW IS DELIBERATELY NOT TOUCHED HERE: its exit is strike() or
   *  dismiss(), on CSS transitions that need no further ticks — the
   *  warmth holds under the growth's first beats and hands off to the
   *  scene's own spill. */
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
    const gl = state.gl;
    if (gl) {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      state.gl = null;
    }
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
       fast load — the remaining peel is compressed (advance's RATE_FAST
       is already running by then, because handOff set sceneReady) and
       the wait is first-impact + response + travel. Bounded by
       construction to ~2.3 s worst case; a load slower than ~3 s (nearly
       all of them) has landed already and waits only for the pulse. A
       gesture never waits — beginFastHandoff() releases immediately and
       the strike fires with the pulse mostly arrived. */
    preludeMsUntilStrike() {
      if (state.reduced || !state.live || !ground || ground.gone) return 0;
      const F = state.field;
      if (ground.state.struckAt >= 0) return 0;
      let need;
      if (F.firstImpactAt >= 0) {
        need = Math.max(0, NET_MIN_S - (F.t - F.firstImpactAt)) + CONV_S;
      } else {
        // earliest impact under compression: the nearest landing, pulled
        // forward and flown at the compressed rate (mirrors advance())
        let eta = Infinity;
        for (const L of F.landings) {
          if (L.state === 2) continue;
          const peelIn = L.state === 1
            ? Math.max(0, L.dur - (F.t - L.t0))
            : Math.max(0.15, Math.min(L.tPeel - F.t, 0.15)) + Math.max(0.55, L.dur / 1.5);
          eta = Math.min(eta, peelIn);
        }
        if (!Number.isFinite(eta)) eta = 0.8;
        need = eta + NET_MIN_S + CONV_S;
      }
      ground.armConvergence(F.t, need);
      return Math.round(need * 1000);
    },
    preludeStrike() {
      if (ground) ground.strike(state.field ? state.field.t : 0);
      if (state.field) state.field.released = true;
      // the skeleton needs its canvas through the fade — and a strike that
      // arrives inside the stream's own crossfade (a gesture on a fast
      // machine) must not cut that fade's preload half short either
      if (state.live) {
        const fadeLeft = fadeFrom === Infinity ? 0
          : Math.max(0, fadeFrom + fadeMs - performance.now());
        setTimeout(stop, Math.max((NET_EXIT_S + 0.25) * 1000, fadeLeft + 100));
      }
    },
    preludeDismiss() {
      if (ground) ground.dismiss();
      if (state.field) state.field.released = true;
      if (state.live && state.handedOff) setTimeout(stop, 400);
    },
    get failed() { return state.failed; },
    get field() { return state.field; },
    get view() { return state.view; },
    get reduced() { return state.reduced; },
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
     *  Called only when a scene exists to hand to. If the scene never
     *  builds, nothing calls this, and the layer — stream, landings,
     *  network and all, or the static haze if WebGL was refused — simply
     *  stays as the hero. sceneReady is the choreography's compression
     *  signal: from here the remaining landings accelerate rather than
     *  waiting out their nominal windows. */
    handOff(seconds) {
      if (state.handedOff) return null;
      state.handedOff = true;
      if (state.field) state.field.sceneReady = true;
      const wait = state.wrap
        ? Math.max(0, Math.round(ENTRY_MS - (performance.now() - entryAt)))
        : 0;
      const carried = state.field
        ? { field: state.field, view: state.view, fadeDelay: wait / 1000 }
        : null;
      const ms = Math.max(1, Math.round(seconds * 1000));
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
  const F = carried ? carried.field : createField(view, 0x5be1);
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
  const fadeFrom = performance.now() + delayMs;
  let fading = fadeMs > 0;
  if (fading) gain.value = 0;

  // Registered after 'spore-drift' so the two sheds are integrated in one
  // pass, before any journey-layer animator reads positions. The gust is
  // the organism's own breeze() — from here on there is one wind and one
  // copy of it, and the transitional stand-in above is out of the picture.
  addAnimator('hero-spore-drift', (t, dt) => {
    if (fading) {
      const p = Math.min(1, Math.max(0, (performance.now() - fadeFrom) / fadeMs));
      gain.value = OPACITY * p;
      if (p >= 1) fading = false;
    }
    if (!F.preloadDriven) advance(F, dt, 0.72 + 0.28 * breeze(t));
    project();
    inkFades();
  });

  return { points: pts, field: F };
}
