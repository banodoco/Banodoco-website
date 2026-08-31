/* ==================================================================== *
 * organism/hero-spores.js — THE TEXT-SIDE SPORES: one particle law,
 * rendered twice.
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
 * number sizeCanvas() needs — and it is loaded by its OWN <script
 * type="module"> in index.html, ahead of main.js. It therefore paints as
 * soon as its own graph has arrived, in parallel with — not behind — the
 * 1.8 MB the scene needs. That graph is 24.9 KB with comments stripped as
 * the public build strips them (20.3 this file, 3.8 hero-mode, 2.5
 * performance, 2.3 flags); the two leaves added for the seam fix cost
 * 4.8 KB of it, and buy a stream that does not change size the instant the
 * scene adopts it. THE RULE THIS GRAPH LIVES UNDER: nothing that imports
 * `three`, and nothing that imports something that does.
 *
 * AND THAT WEIGHT IS NOT FREE, so it is stated here rather than discovered.
 * Measured on a 6x CPU / 400 kbps cold load it puts first paint 1.25 s
 * later, because this page's three render-blocking stylesheets are 330 KB
 * and everything in the first batch shares the pipe. At 2 Mbps the same
 * cost is 0.25 s. What it buys is the whole of the rest of that load: on
 * the same 2 Mbps trace the spores are on screen at 2.2 s and the mushroom
 * at 56.5 s, so the right-hand half of the frame stops being an empty
 * rectangle for fifty-four seconds.
 *
 * THE TWO HALVES, AND THE ONE LAW BETWEEN THEM.
 *
 *   heroSpores              a dependency-free WebGL point-sprite layer on
 *                           its own canvas, above #stage — the singleton
 *                           this module exports and self-starts. Lives only
 *                           until the scene exists, then releases its
 *                           context: there is no permanent second renderer.
 *   createHeroSporeField()  the SAME particles, rebuilt as a THREE.Points
 *                           inside the organism's scene through ctx's own
 *                           makePoints — so they inherit the bloom, the
 *                           film grade, the tap pulse and the fog that the
 *                           mushroom's own shed has. Called by
 *                           organism.js. Takes no `three` import: the
 *                           builder comes down on `ctx`.
 *
 * Both run `advance()` over the same `(a, b, d)` state in the same frozen
 * camera frame, so the handoff moves no particle. The preload canvas
 * cross-fades out while the scene-side Points fades in over the same beat;
 * the only thing that changes across the seam is that the light acquires
 * bloom. THE SCENE GAINS THE MUSHROOM — it does not swap particle systems.
 *
 * THE FRAME IS CAMERA-RELATIVE AND THEN FROZEN, and that is the whole
 * trick. A particle is stored as `(a, b, d)`: two offsets across the hero
 * camera's view plane and one depth along its forward axis. Authoring the
 * composition there is what lets 2B.1 say "narrower, between the text and
 * the mushroom on a phone" in terms a designer can set. At handoff the
 * basis is FROZEN at the hero pose and every later position is derived
 * through it, so the field is world-static from then on: the journey's
 * camera flies away from it and finds it again on the way back, exactly
 * as it does the mushroom's own shed.
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
 * WHAT IS DELIBERATELY DIFFERENT, and it is four things and no more:
 *   1. VERTICAL DIRECTION. The mushroom's shed rides BREEZE_DIR upward
 *      (1, 0.62, 0.17). These settle: the same left-to-right wind with
 *      gravity in it. `fall` is a per-mode composition parameter because
 *      the descent has to read at aspect 1.6 and at aspect 0.46, and the
 *      NDC slope a world ratio buys is multiplied by the aspect.
 *   2. REGION. The shed is emitted from the gills; this field is the
 *      OTHER END of the same wind — a stream that falls in from off the
 *      upper-left and lands at the mushroom's own ground (§ COMPOSITION).
 *   3. RESTRAINT. Opacity 1.05 against the shed's 2.4. The brief's words
 *      are "the headline remains dominant and calm", and one global gain
 *      is the honest knob for that — the draws above are untouched, so it
 *      is the same dust carrying less light, not different dust.
 *   4. LANDING. The shed's dots ride the wind out of frame; these are
 *      absorbed. Over the last stretch of its streamline a particle's
 *      light ramps to zero — seeding the ground, not bouncing off it —
 *      and it re-enters at the origin under the same law (§ the fade
 *      note in advance()).
 * ==================================================================== */

import { createHeroMode } from '../journey/boot/hero-mode.js';
// Both leaves, both import-free, and both here for ONE number: the pixel ratio
// the scene's renderer will be built with. See sizeCanvas() for why this layer
// has to know it. (PIN_PR is parsed once, in ../flags.js — THE flag registry.)
import { createPixelRatioPolicy } from './performance.js';
import { PIN_PR } from '../flags.js';

/* ---------------------------------------------------------------- *
 * COMPOSITION — the seeding stream. One aim per viewport mode.
 * ---------------------------------------------------------------- *
 * THE OWNER'S DIRECTION, and the whole shape of this table: the spores
 * come in from the top-left of the screen and land where the mushroom
 * is — "a stream of them that just happened to be landing there ...
 * like they're the ones that are actually SEEDING the mushroom."
 * During preload there IS no mushroom, and that is the point: the
 * stream lands on the spot the specimen will stand, so when the intro
 * draws it in, it materialises under an arrival that was already
 * feeding that ground.
 *
 * The stream is authored in the streamline coordinate, not as a
 * rectangle. Every particle travels its own near-shared NDC slope
 * (`fall` x aspect — the depth cancels, because a world step scales x
 * and y by the same 1/depth), so a particle is identified for all time
 * by `q`: the NDC height it will have when it reaches `xOut`. And
 * because `xOut` now SITS AT THE MUSHROOM, q is the LANDING interval:
 * "where does the stream land" is written directly below, in the same
 * numbers the anatomy was measured in. Particles cannot leave the
 * stream, the density along it cannot drift, and re-entry after
 * absorption is at `xIn` with a fresh q from the same interval — the
 * stationary distribution is the seeded one, so the field neither
 * thins nor densifies however long the scene takes (2D), and because
 * every draw is fresh it never reads as a loop.
 *
 *   n      particle count. Sparse on purpose; see the cap note in 2D.
 *   xIn    NDC x a particle enters at (off-frame upper-left)
 *   xOut   NDC x the stream lands at — set just past the stalk, so the
 *          absorption tail (advance()) dies across the stem's own air
 *   q      [lo, hi] NDC y landing band, measured AT xOut: the ground/
 *          stem zone. Aim lives here, from live anatomy projections
 *          (evidence/fb-seed/aim-before/aim-report.json):
 *            mode        stalk x   ground y   stem-mid y
 *            desktop      +0.42     -0.68      -0.34
 *            deskNarrow   +0.43     -0.60      -0.31   (at 1280x900)
 *            compact      +0.36     -0.66      -0.34   (at 900x520)
 *            tablet       -0.02     -0.70      -0.47
 *            mobile       +0.05     -0.45      -0.28
 *   depth  [near, far] view depth in world units. The stem stands
 *          10.8-12.4 from the hero camera by mode, so the far end lands
 *          the stream in the mushroom's own air while the near end
 *          brings some of it forward for parallax.
 *   fall   THE ON-SCREEN DESCENT, IN ITS OWN UNIT. It is authored as
 *          world descent per unit of world travel to the right, and that
 *          happens to be exactly `tan(the angle a reviewer sees)`: NDC
 *          slope is fall x aspect, screen pixels re-divide by that same
 *          aspect, and the two cancel. So 0.56 IS 29 degrees on every
 *          frame it is read on. The portrait values are steep because
 *          the frames are: from the upper-left edge to a centred stem
 *          there is far more screen height to spend than width, and a
 *          shallow slope would arrive from the LEFT, not the TOP-left.
 *   gain   speed multiplier over the shed's own base draw
 *   dpr    pixel-ratio ceiling for THIS layer (2D)
 *   gx     [lo, hi] NDC x range of the GROUND MOTES only — the stand-in
 *          ground keeps its full width while the stream above it aims;
 *          motes are placement, not travel, so they do not follow xOut.
 *
 * Every aim below was set by shooting the mode and looking; the landing
 * bands are the measured anatomy plus soft width, not a series.
 */
const COMPOSITION = {
  // 1440x900. The specimen stands right of centre, so the diagonal runs
  // the long way: in off the top-left corner, under the cap's left rim,
  // dissolving across the stem base and root flare. A few streamlines
  // cross the headline's upper-right shoulder on the way down; at this
  // brightness they read as air, and the copy stays dominant.
  desktop: {
    n: 150, xIn: -1.30, xOut: 0.58, q: [-0.80, -0.46],
    depth: [6.0, 12.4], fall: 0.56, gain: 2.2, dpr: 2, gx: [-1.05, 1.15],
  },
  // Landscape under aspect 1.55 — iPads on their side, narrow laptop
  // windows. Same reading as desktop, a shade steeper because the frame
  // is shorter for its width and the stalk sits a touch higher.
  deskNarrow: {
    n: 140, xIn: -1.30, xOut: 0.58, q: [-0.74, -0.40],
    depth: [6.2, 12.6], fall: 0.62, gain: 2.2, dpr: 2, gx: [-1.05, 1.15],
  },
  // Short landscape (a phone on its side; a very shallow window). The
  // same aim with almost no vertical room: the shallowest descent here,
  // and the count comes down with the frame.
  compact: {
    n: 100, xIn: -1.28, xOut: 0.52, q: [-0.76, -0.42],
    depth: [6.0, 12.0], fall: 0.50, gain: 2.0, dpr: 1.5, gx: [-1.0, 1.1],
  },
  // iPad portrait, 744x1133. The specimen is centred and low, so the
  // stream enters high on the left edge, drops steeply past the cap's
  // left rim and lands down the stem's visible length. Steep is honest
  // here: this is the angle at which a line from the upper-left actually
  // reaches a centred stem base on a frame this tall.
  tablet: {
    n: 110, xIn: -1.24, xOut: 0.14, q: [-0.80, -0.52],
    depth: [6.5, 13.0], fall: 1.65, gain: 1.7, dpr: 1.5, gx: [-1.0, 1.1],
  },
  // Phone portrait, 430x932. The steepest and sparsest: in at the upper
  // left beside the headline's first line, down across the copy column
  // (few dots, dim — the copy keeps dominance), landing on the short
  // visible stem between cap and ground. Well under desktop's count over
  // a much smaller frame — never snowfall.
  mobile: {
    n: 100, xIn: -1.22, xOut: 0.16, q: [-0.64, -0.36],
    depth: [6.5, 12.6], fall: 1.9, gain: 1.6, dpr: 1.5, gx: [-1.0, 1.1],
  },
};

// THE LANDING, in the streamline's own parameter. u is the fraction of
// the xIn -> xOut span a particle has travelled; from LAND_U onward its
// light ramps smoothly to zero, reaching exactly 0 at xOut — where the
// recycle teleports it back to xIn invisibly. Authored as a fraction so
// every mode's absorption occupies the same last stretch of its own
// approach: the stream dims INTO the ground/stem zone rather than
// stopping at a curtain.
const LAND_U = 0.88;
// Per-particle descent jitter (multiplicative, ±10%). The shed is
// turbulent; a strictly parallel ribbon aimed at a point reads drawn.
// A tenth of slope of scatter keeps every streamline aimed at the same
// landing band while the body of the stream breathes like weather.
const SLOPE_JIT = 0.10;

// The scene's own fog, from organism/renderer.js's createRendererSetup.
// Named here rather than imported because importing it would pull `three`
// and this module's whole reason to exist is that it does not.
const FOG_NEAR = 7.0, FOG_FAR = 20;
// organism/organism.js builds the shed with makePoints(..., 2.4). See
// RESTRAINT in the header for why this field carries less.
const OPACITY = 1.05;
// A few dim points low in the frame stand in for the ground while the
// real mycelial network is still a download (2C: "only a faint low amber
// haze or a few dim ground points" — never a duplicate network). They are
// the same particles parked under the stream's landing, nearly still and
// at the dark end of the palette, and they do not migrate: the real
// ground arrives underneath them and this layer fades off it. Their x
// placement is `gx`, not the stream's span — the ground keeps its full
// width while the stream above it aims at the stem.
const GROUND_MOTES = 26;

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

/** The absorption ramp (§ LAND_U): full light through most of the
 *  approach, then a smoothstep down to exactly zero at xOut, so the
 *  recycle teleport is invisible even in mid-frame. Ground motes never
 *  pass through here — they are placement, not travel. */
function landFade(c, xNdc) {
  const u = (xNdc - c.xIn) / (c.xOut - c.xIn);
  if (u <= LAND_U) return 1;
  const t = Math.min(1, (u - LAND_U) / (1 - LAND_U));
  return 1 - t * t * (3 - 2 * t);
}

/** Seed (or re-seed) one particle. `atEntry` places it on the inflow edge
 *  — the recycle case; otherwise it is scattered along the stream, which
 *  is what makes the composition complete on the very first painted frame
 *  instead of sweeping in from the corner while somebody reads it. */
function seedOne(F, i, c, rand, atEntry) {
  const i3 = i * 3;
  const ground = i >= F.n - GROUND_MOTES;
  const x = ground
    ? (atEntry ? c.gx[0] : c.gx[0] + (c.gx[1] - c.gx[0]) * rand())
    : (atEntry ? c.xIn : c.xIn + (c.xOut - c.xIn) * rand());
  // THE STREAM HAS NO EDGE. A uniform draw across [lo, hi] gives it two
  // visible rims and reads as a beam; three summed draws give an
  // Irwin-Hall bell, so occupancy tapers to nothing at the landing band's
  // limits and the stream has a body and no boundary. Same trick, same
  // reason, as the release arc's single-peaked density in organism/spores.js.
  const bell = (rand() + rand() + rand() - 1.5) / 1.5;
  const q = (c.q[0] + c.q[1]) / 2 + bell * (c.q[1] - c.q[0]) / 2;
  const depth = c.depth[0] + (c.depth[1] - c.depth[0]) * rand();
  // Each particle's own descent, the shared slope breathed by SLOPE_JIT.
  const fallJ = c.fall * (1 + SLOPE_JIT * (rand() * 2 - 1));
  // Ground motes hang low, deep, and barely move: a handful of dim
  // points where the network will be, not a picture of the network.
  const y = ground ? -0.62 - 0.30 * rand() : q + fallJ * F.aspect * (c.xOut - x);
  const d = ground ? c.depth[1] * (0.86 + 0.14 * rand()) : depth;
  const halfH = d * F.tanHalfFov;
  F.frame[i3] = x * halfH * F.aspect;
  F.frame[i3 + 1] = y * halfH;
  F.frame[i3 + 2] = d;
  F.q[i] = ground ? y : q;
  F.fallJ[i] = fallJ;
  F.fade[i] = ground ? 1 : landFade(c, x);
  // The shed's own draws, one for one (see the header).
  F.size[i] = Math.pow(rand(), 1.8) * 0.072 + 0.019;
  F.tone[i] = ground
    ? 0.20 + Math.pow(rand(), 1.6) * 0.22   // the dark end of heat(): soil, not light
    : 0.64 + Math.pow(rand(), 1.9) * 0.36;
  F.speed[i] = (0.028 + rand() * 0.055) * c.gain * (ground ? 0.10 : 1);
  F.seed[i] = rand() * Math.PI * 2;
  heatLinear(F.tone[i], F.color, i3);
  F.attrsDirty = true;
}

/** Build the field for the current composition. */
function createField(view, seed) {
  const c = COMPOSITION[view.mode] || COMPOSITION.desktop;
  const rand = makeRng(seed);
  const n = c.n;
  const F = {
    n, comp: c, rand,
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
    // The landing absorption, 1 -> 0 over the approach (landFade). Both
    // renderers multiply it into the light, so the seam carries it too.
    fade: new Float32Array(n),
    attrsDirty: true,
  };
  for (let i = 0; i < n; i++) seedOne(F, i, c, rand, false);
  return F;
}

/** Re-frame an existing field for a new viewport without re-seeding it:
 *  the particles keep their identity and their streamline, the aim is
 *  re-read for the new mode, and the composition follows the frame. */
function reframe(F, view) {
  const c = COMPOSITION[view.mode] || COMPOSITION.desktop;
  const oldAspect = F.aspect;
  // Crossing a breakpoint re-aims the whole field: each particle's jitter
  // survives, rescaled onto the new mode's descent.
  const fallScale = c.fall / F.comp.fall;
  F.comp = c;
  F.tanHalfFov = view.tanHalfFov;
  F.aspect = view.aspect;
  for (let i = 0; i < F.n; i++) {
    const i3 = i * 3;
    const ground = i >= F.n - GROUND_MOTES;
    const d = F.frame[i3 + 2];
    const halfH = d * F.tanHalfFov;
    const xPrev = F.frame[i3] / (halfH * oldAspect);
    if (ground) {
      const x = Math.min(c.gx[1], Math.max(c.gx[0], xPrev));
      F.frame[i3] = x * halfH * F.aspect;
      F.frame[i3 + 1] = F.q[i] * halfH;
      continue;
    }
    // hold each particle on its own streamline, re-derived in the new frame
    const q = Math.min(c.q[1], Math.max(c.q[0], F.q[i]));
    const x = Math.min(c.xOut, Math.max(c.xIn, xPrev));
    F.q[i] = q;
    F.fallJ[i] *= fallScale;
    F.frame[i3] = x * halfH * F.aspect;
    F.frame[i3 + 1] = (q + F.fallJ[i] * F.aspect * (c.xOut - x)) * halfH;
    F.fade[i] = landFade(c, x);
  }
}

/** Advance the whole field by `dt` seconds under `gust`. This is the one
 *  integrator; the preload canvas and the scene-side Points both call it,
 *  which is why the handoff cannot move a particle — and why the landing
 *  fade written here is the same brightness on both sides of the seam. */
function advance(F, dt, gust) {
  const c = F.comp;
  const step = Math.min(dt, 0.05);
  for (let i = 0; i < F.n; i++) {
    const i3 = i * 3;
    const ground = i >= F.n - GROUND_MOTES;
    const d = F.frame[i3 + 2];
    const v = F.speed[i] * gust * step;
    F.frame[i3] += v;
    F.frame[i3 + 1] -= v * (ground ? c.fall : F.fallJ[i]);
    // The shed's wind carries 0.17 of z per unit of x, toward the viewer.
    // Keeping it here is what stops the stream reading as a flat plane.
    F.frame[i3 + 2] = Math.max(c.depth[0] * 0.8, d - v * 0.17);
    const halfH = F.frame[i3 + 2] * F.tanHalfFov;
    const xNdc = F.frame[i3] / (halfH * F.aspect);
    if (ground) {
      // motes hold their light and idle across their own full-width range
      if (xNdc > c.gx[1]) seedOne(F, i, c, F.rand, true);
      continue;
    }
    // THE SEEDING ITSELF: light ramps out across the approach to the
    // ground/stem zone, hits exactly zero at xOut, and the streamline
    // respawn (2D) carries the particle back to the origin. Absorbed and
    // re-blown, never bounced, never piled.
    F.fade[i] = landFade(c, xNdc);
    if (xNdc > c.xOut) seedOne(F, i, c, F.rand, true);
  }
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
 * textures, one draw call.
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
   what 2B forbids in the preload path.

   So the halo is folded into the sprite instead of being a pass: the
   quad is drawn BLOOM_SPREAD times the sprite's own diameter, the
   gradient still occupies the inner 1/BLOOM_SPREAD of it (unchanged,
   which is the part that has to match), and a wide gaussian at
   BLOOM_GAIN carries the light the composer would have spread. One draw
   call, no target, no second pass — and the migrated field drops it
   because by then the real bloom is doing the work. */
const BLOOM_SPREAD = 5.0;
const BLOOM_GAIN = 0.115;
const BLOOM_SIGMA = 1.45;

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

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('hero-spores shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

/* The graceful static hero (2D). If WebGL is refused — a blocked context,
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
  let meta = null;
  let lit = null;   // per-frame colour scratch: F.color x F.fade (draw())
  // See sizeCanvas(): the ratio between THIS layer's device grid and the one
  // the scene's renderer will draw the same particles on. 1 whenever they
  // agree, which is every capture and every first visit to a retina desktop.
  let pxScale = 1;
  // When the ENTRY_MS ramp began. -Infinity until it has, so a handOff() that
  // somehow precedes boot() waits for nothing.
  let entryAt = -Infinity;

  /** ONE requestAnimationFrame site in this module, deliberately. The
   *  hidden-tab gate (2D) parks the loop by clearing `rafId` and comes
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

  function draw(now) {
    const gl = state.gl, F = state.field;
    gl.viewport(0, 0, state.el.width, state.el.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.frame);
    gl.bufferData(gl.ARRAY_BUFFER, F.frame, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attribs.frame, 3, gl.FLOAT, false, 0, 0);
    // The landing fade rides the colour, so the light — never the base
    // palette — is what carries F.fade to the pixel. Uploaded per frame
    // because the fade moves per frame; at this count it is ~2 KB.
    for (let i = 0; i < F.n; i++) {
      const i3 = i * 3, f = F.fade[i];
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
    // transfers when this layer leaves, not when the scene arrives.
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
    if (state.gl && uniforms) state.gl.uniform1f(uniforms.pxScale, pxScale);
    state.el.width = Math.max(1, Math.round(innerWidth * pr));
    state.el.height = Math.max(1, Math.round(innerHeight * pr));
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
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error('hero-spores link: ' + gl.getProgramInfoLog(prog));
      }
      gl.useProgram(prog);
      attribs = {
        frame: gl.getAttribLocation(prog, 'aFrame'),
        color: gl.getAttribLocation(prog, 'aColor'),
        meta: gl.getAttribLocation(prog, 'aMeta'),
      };
      for (const a of Object.values(attribs)) gl.enableVertexAttribArray(a);
      uniforms = {
        time: gl.getUniformLocation(prog, 'uTime'),
        tanHalfFov: gl.getUniformLocation(prog, 'uTanHalfFov'),
        aspect: gl.getUniformLocation(prog, 'uAspect'),
        // Set from sizeCanvas() rather than per frame: it changes only when a
        // device grid does, which is a resize and nothing else.
        pxScale: gl.getUniformLocation(prog, 'uPxScale'),
      };
      buffers = { frame: gl.createBuffer(), color: gl.createBuffer(), meta: gl.createBuffer() };
      // organism/renderer.js clears to bg 0x1c160b; see the delta note above.
      const bgLin = [0x1c, 0x16, 0x0b].map((v) => srgbToLinear(v / 255));
      gl.uniform1f(gl.getUniformLocation(prog, 'uOpacity'), OPACITY);
      gl.uniform3f(gl.getUniformLocation(prog, 'uBgLinear'), bgLin[0], bgLin[1], bgLin[2]);
      const enc = encodeOnCpu(bgLin);
      gl.uniform3f(gl.getUniformLocation(prog, 'uBgEncoded'), enc[0], enc[1], enc[2]);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
    } catch (err) {
      console.error('[hero-spores] preload layer failed to start', err);
      showStatic();
      return;
    }

    sizeCanvas();
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
      sizeCanvas();
      if (state.reduced) draw(0);
    };
    addEventListener('resize', onResize);
    // 2D — a hidden tab pays for nothing. rAF is already suspended by
    // every current engine when the document is hidden; parking the loop
    // explicitly also covers the cases where it is not (an occluded but
    // "visible" window, a restored bfcache entry) and makes the intent
    // reviewable rather than inherited from the platform.
    onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (state.live) { last = 0; schedule(); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Reduced motion gets the composed field, painted once, and no loop
    // at all (2D). It is the same picture the moving layer rests at.
    if (!state.reduced) schedule();
  }

  /** Release everything this layer attached, and take its canvas off the
   *  page. Idempotent, and safe before boot() ever ran. */
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
     *  the seam is that the light acquires the composer's bloom.
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
     *  builds, nothing calls this, and the layer — spores, or the static
     *  haze if WebGL was refused — simply stays as the hero (2D). */
    handOff(seconds) {
      if (state.handedOff) return null;
      state.handedOff = true;
      const wait = state.wrap
        ? Math.max(0, Math.round(ENTRY_MS - (performance.now() - entryAt)))
        : 0;
      const carried = state.field
        ? { field: state.field, view: state.view, fadeDelay: wait / 1000 }
        : null;
      const ms = Math.round(seconds * 1000);
      if (state.wrap) {
        // A transition-DELAY would not do here, and the difference is the whole
        // point: restyling the property replaces the running entry transition
        // at once, so the layer would freeze at whatever opacity it had reached
        // and sit there for the delay. Leaving the entry transition alone and
        // arming the fade-out on a timer instead lets the stream finish
        // arriving, which is what the visitor was already watching.
        const fadeOut = () => {
          if (!state.wrap) return;
          state.wrap.style.transition = `opacity ${ms}ms linear`;
          state.wrap.style.opacity = '0';
        };
        if (wait > 0) setTimeout(fadeOut, wait);
        else fadeOut();
      }
      setTimeout(stop, wait + ms + 60);
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
 * stream is composed before the scene's graph has finished arriving;
 * main.js imports the same specifier and therefore the same instance
 * (ESM module cache), and hands the field over when the scene exists.
 * ---------------------------------------------------------------- */
export const heroSpores = createPreload();

// A module script is deferred by definition, so the parser has already
// reached </body> and #stage exists. boot() is guarded and idempotent
// either way; the `document` test is only so the tools that PARSE this
// tree in node can also import it without a DOM.
if (typeof document !== 'undefined') heroSpores.boot();

/* ---------------------------------------------------------------- *
 * HALF TWO — the same field inside the organism's scene (2C).
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

  /** The scene-side half of the landing fade: the same F.color x F.fade
   *  the preload canvas uploads, written into this Points' own colour
   *  attribute — one brightness law, two renderers, so the absorption at
   *  the stem is identical on both sides of the seam. (This also keeps a
   *  recycled particle's fresh tone, which the build-time colours alone
   *  would not.) */
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
     has to stay level with is a CSS transition and CSS transitions are
     wall-clock. Two consequences, both wanted: ?capture= freezes the
     scene clock at t = 0 with dt = 0 and this ramp still completes, so a
     frozen frame is shot at full brightness rather than at nothing; and
     the ramp is over inside a second, long before organism/intro.js's
     fast-forward skews performance.now(), so it never reads that skew. */
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
