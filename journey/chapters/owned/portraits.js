// journey-v6 — OWNED contributor portrait field (W4-C).
// Port of the APPROVED Spike B treatment (spike-b/portraits.js) into the
// live journey. Copied + adapted, never imported from spike-b/.
//
// Carried verbatim from the approved spike:
//   - the per-photo treatment: 62% desaturation -> 0.90 amber multiply ->
//     warm-black lift -> hard edge burn -> unify/grain -> mask feather 0.76
//     -> ember rim arcs + outward fibre ticks;
//   - procedural painted busts + anonymous spore-print glyphs, 3-way
//     crossfade in the shader (procedural / photo / anonymous);
//   - REAL strand geometry terminating exactly at each node (local strands,
//     node-to-node links, cord attachments) — hover lights ONLY the active
//     node's strands;
//   - 3D rim fibres, ember cores + halos, defocus band 2.2->5.0;
//   - the two hard placement rules from rev 2, verbatim: >=3.0 world units
//     of camera-path clearance from EVERY point of the leg (descent + rise
//     included), and frame-cell stratification (home moment on the path +
//     3x3 frustum cell + near/mid/far depth pattern).
//
// New for the journey:
//   - placement is authored against the REAL leg (owned-leg.js poseAt
//     samples), stratified against the REST pose frustum primarily (the 16
//     routable contributors) with glide coverage second (32 ambient nodes)
//     — this is the fix for the grey-box reachability gap;
//   - size/spacing jitter rule against "row of coins" chains at density;
//   - underground clamps (whole disc below the soil);
//   - uFade on every layer for the T3 streaming seam;
//   - consent hook: aAnon per-node attribute forces the anonymous glyph for
//     any contributor with consent !== true when enforcement is on. Photos
//     here are real contributors' own avatars, dealt at random out of
//     assets/contributor-portraits/ (see content/contributors.js);
//     anonymous mode stays one call away (setMode('anonymous')).
import * as THREE from 'three';
import * as H from '../../lib/helpers.js';
import { isBaked, geometry, payload } from '../../lib/baked.js';
import { PORTRAIT_SPRITE } from '../../../assets/contributor-portraits/manifest.js';
import { CONTRIBUTOR_POOL, ROLE_BLURB } from '../../../content/contributors.js';
import { REST_P } from './leg.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* ================================================================== */
/* atlas painting (spike verbatim)                                     */
/* ================================================================== */

const SKIN_RAMP = [
  [78, 50, 34], [102, 66, 44], [130, 86, 56], [158, 110, 74],
  [184, 138, 98], [206, 164, 124],
];
const CLOTH = [[40, 30, 22], [54, 40, 27], [32, 27, 31], [62, 46, 31], [46, 35, 41]];
const HAIR = [[36, 24, 17], [52, 36, 22], [76, 53, 30], [30, 27, 30], [96, 70, 40], [160, 138, 114]];

function lerpC(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rampPick(ramp, t) {
  const f = clamp(t, 0, 0.999) * (ramp.length - 1);
  const i = Math.floor(f);
  return lerpC(ramp[i], ramp[i + 1], f - i);
}
function css(c, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function scaleC(c, f) { return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)]; }

// Shared edge language: irregular ember rim arcs + outward fibre ticks,
// drawn AFTER the circular soft mask so they fray past the disc edge.
function drawEmbedEdge(g, cx, cy, R, r) {
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 88; k++) {
    const a0 = (k / 88) * TAU + (r() - 0.5) * 0.05;
    const a1 = a0 + (TAU / 88) * (1.05 + r() * 0.6);
    const rr = R * (0.90 + (r() - 0.5) * 0.09);
    g.strokeStyle = `rgba(255,${185 + ((r() * 45) | 0)},${115 + ((r() * 55) | 0)},${(0.07 + r() * 0.24).toFixed(3)})`;
    g.lineWidth = (0.8 + r() * 1.8) * 2;
    g.beginPath(); g.arc(cx, cy, rr, a0, a1); g.stroke();
  }
  for (let k = 0; k < 44; k++) {
    const a = r() * TAU;
    const r0 = R * 0.93, r1 = R * (1.02 + r() * 0.26);
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const bend = (r() - 0.5) * 0.20;
    const x1 = cx + Math.cos(a + bend) * r1, y1 = cy + Math.sin(a + bend) * r1;
    const gl = g.createLinearGradient(x0, y0, x1, y1);
    gl.addColorStop(0, `rgba(255,190,120,${(0.10 + r() * 0.28).toFixed(3)})`);
    gl.addColorStop(1, 'rgba(255,190,120,0)');
    g.strokeStyle = gl;
    g.lineWidth = (0.6 + r() * 1.1) * 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

// `unify` is the strength of the amber wash. It stays 0.33 for the procedural
// busts and the anonymous glyphs — they are PAINTED in the palette already, so
// the wash only seasons them, and the frozen goldens render exactly those two
// paths. Only the photo cell passes a lower figure (PHOTO_GRADE.unify): a
// source-atop fill is a straight lerp toward ONE colour, so at 0.33 it is the
// single largest hue-collapsing term in the photo pipeline. See PHOTO_GRADE.
function grainAndGrade(g, ox, oy, CELL, cx, cy, R, r, unify = 0.33) {
  // amber unify — everything drawn so far pulls toward the palette
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(196,124,48,${unify})`;
  g.fillRect(ox, oy, CELL, CELL);
  // upper-left key bloom
  const bloom = g.createRadialGradient(cx - R * 0.55, cy - R * 0.65, R * 0.05, cx - R * 0.55, cy - R * 0.65, R * 1.4);
  bloom.addColorStop(0, 'rgba(255,200,140,0.13)');
  bloom.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = bloom;
  g.fillRect(ox, oy, CELL, CELL);
  // photographic speckle
  for (let k = 0; k < 340; k++) {
    const a = r() * TAU, rr = R * Math.sqrt(r());
    const lum = r() < 0.5;
    g.fillStyle = lum
      ? `rgba(255,214,160,${(0.02 + r() * 0.05).toFixed(3)})`
      : `rgba(8,5,2,${(0.03 + r() * 0.07).toFixed(3)})`;
    g.beginPath();
    g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.5 + r() * 1.2, 0, TAU);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

function softMask(g, ox, oy, CELL, cx, cy, R, feather = 0.86) {
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(feather, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(ox, oy, CELL, CELL);
  g.globalCompositeOperation = 'source-over';
}

/* THE PHOTO GRADE, IN ONE PLACE (Hannah, 2026-08-11 — "the colour is sapped
   too much from them; could you put the colour in a little bit more").

   WHY SATURATION WAS THE WRONG NUMBER TO CHASE. Measured at the Owned rest
   before this pass (1440x900, frozen frame with uPhoto forced to 1, sampled
   over the inner 0.62 of each of the sixteen drawn discs), luminance-weighted
   HSV saturation was already 0.569 and Lab chroma already 41.4 — HIGH. The
   faces were not short of saturation. They were short of DIFFERENT colours:
   within-face Lab hue circular variance measured 0.0050, and across the
   sixteen the mean hues spanned 3.4 degrees. Skin, hair, cloth and backdrop
   had all landed on one 66-79 degree amber, which is the definition of a sepia
   print. That is also why ride-through #2 (0.62/0.90 -> 0.40/0.72) did not fix
   the read: it lightened the cast without giving anything back its own hue.

   So the number this grade is tuned against is a RATIO — the common amber cast
   over the colour variation around it, both luminance-weighted, per face:

     cast       mean Lab chroma
     variation  RMS distance of each pixel's (a*,b*) from the face's own mean

   The source photographs run about 1.9:1. The shipped grade turned that into
   7.9:1, measured across all sixteen baked atlas cells. This pass lands 5.4:1.

   WHAT ACTUALLY COLLAPSED IT. Instrumenting the chain stage by stage on four
   source images showed one step doing nearly all of the damage: the step-2
   amber MULTIPLY took hue variance from 0.106 to 0.0046 on m11 and from 0.494
   to 0.0070 on w44, a 20-70x collapse in a single operation. Not because it
   destroys the photo's chroma — because it INDUCES about 25-35 chroma of its
   own, in one fixed direction, on top of source images that only carry 11-22.
   The photo's colour is swamped, not removed.

   The obvious move — weaken the multiply — was tried and rejected by eye. At
   amber 0.36 the discs lost their ember glow and read as cool photographic
   cut-outs pasted onto the field, which is the exact failure this treatment
   exists to prevent. The multiply IS the palette tie, so it barely moves.
   What moves instead are the terms that were throwing the photo's own colour
   away BEFORE and AFTER the multiply, where the cost is variation and the
   benefit was never the glow:

     desat     the step-1 saturation-blend fill. Pure loss: it removes source
               chroma outright, and the multiply then supplies far more amber
               than it took out. 0.40 -> 0.06.
     amber     alpha of the step-2 amber multiply — the palette tie. Left
               nearly alone on purpose. 0.72 -> 0.64.
     burnMute  how far the step-5 edge-burn gradient is pulled toward its own
               luma. The burn's job is DARKENING; it was also toning, and a
               multiply by an amber factor is precisely a sepia operation.
               0 (the original stops) -> 0.70.
     unify     alpha of grainAndGrade's source-atop wash — a straight lerp
               toward one solid colour. 0.33 -> 0.16 FOR PHOTOS ONLY; the
               procedural busts and the anonymous glyphs keep 0.33, so the
               frozen goldens are byte-identical (see grainAndGrade).

   Result across the sixteen baked cells: cast 41.9 -> 40.8 (-2.7%, i.e. the
   warmth stays), variation 5.27 -> 7.59 (+44%), within-face hue variance
   0.0015 -> 0.0050 (+233%), HSV saturation 0.630 -> 0.591 (it FALLS, and that
   is the point — less of one colour, more of several).

   Deliberately NOT touched: the burn's luminance profile, the warm-black lift,
   the ember rim arcs, the face key light, the grain, the mask feather, and
   every shader term. The faces have to stay inside near-black / deep-brown /
   amber-gold and read as nodes in the network, not as photographs pasted on
   top — this is a correction, not a reversal. */
const PHOTO_GRADE = Object.freeze({
  desat: 0.06,
  amber: 0.64,
  unify: 0.16,
  burnMute: 0.70,
  /* THE HOVER GRADE (2026-08-14, Hannah: "upon hover can you greatly reduce
     the sepia effect on the image").

     This is a HOVER state, not a retune. Everything above is the resting grade
     `45f600b` was approved against and not one of those four numbers moves —
     the resting frame, and the still it was signed off on, are untouched by
     construction, because this term is multiplied by the node's own `vH` and
     `vH` is 0 at rest.

     WHAT IT DOES, and why it is not a desaturation. F.2 of
     20-owned-root-network.md instrumented the bake stage by stage and found
     the collapse is not diffuse: STEP 2, the amber multiply, drops within-face
     hue variance 20-70x on its own, and it does it by SWAMPING rather than by
     removing — "It induces roughly 25-35 chroma of its own in one fixed
     direction, on top of source images that only carry 11-22. Everything the
     photograph had to say about colour is still in there, drowned."

     Still in there is the operative phrase. Step 2 is a multiply by a constant
     colour, so it has an inverse: divide by the same factor and the
     photograph's own chroma comes back up out of the cast. That is what this
     does, weighted by hover — a partial inverse of the ONE named term, not a
     saturation slider. Desaturating would take colour AWAY, and what she is
     asking to see is the colour the multiply is sitting on top of.

     Luminance is preserved through it (the shader rescales the result to the
     texel's own Rec.709 luma), so a hovered face changes HUE and not
     brightness — brightness on hover is already spoken for by the 0.30 * boost
     on the image term two hundred lines below, and doubling up there is how a
     near face blooms into a featureless orb under UnrealBloom (see the levels
     note in the fragment shader).

     PHOTOS ONLY. It is applied to `tP` before the bust/photo/glyph mix, on
     exactly F.4's reasoning: the procedural busts are painted in the palette
     already, there is no photograph underneath them to recover, and they are
     what the frozen goldens render. */
  hoverDeSepia: 1.0,
  /* THE OTHER HALF, and the bigger one — see the `pg` block in the portrait
     fragment shader. These pull back the amber the HOVER RESPONSE adds over a
     photographed face, which measurement showed is where most of the sepia she
     is reacting to actually comes from: the core lamp goes 0.07 -> 0.31 and the
     image term 1.12 -> 1.42 on hover, before UnrealBloom. Both are multiplied
     by `uPhoto * vH`, so the resting frame, the frozen goldens and the
     procedural busts are all untouched by construction.
     1 = the hover growth of that term is removed entirely on a photo. */
  hoverCoreMute: 1.0,
  hoverImgMute: 0.70,
  /* THE THIRD HALF (2026-08-16, Hannah: "when you hover it makes it so the
     actual colour of the profile picture becomes way more clear").

     `hoverDeSepia` above divides the amber multiply back out, which recovers
     the picture's HUE — but the resting grade also spends `unify` (0.16)
     collapsing every cell toward one colour, and that term is baked into the
     atlas by canvas compositing, so no shader inverse exists for it. Undoing
     the amber alone therefore lands on the right hue at the wrong strength:
     correct, and still washed.

     So the hover additionally EXPANDS chroma about the texel's own luma. At 1.0
     the hovered face carries twice the chroma the graded cell holds, which is
     roughly where these avatars — flat, saturated, mostly illustration rather
     than photography — read as themselves again. Luma is the pivot, so like
     every other term here it moves colour and not brightness.

     Multiplied by `uPhoto * vH` in the shader, so: zero at rest, zero on the
     procedural busts, zero in the frozen goldens. Turn it to 0 to get exactly
     the 2026-08-14 hover back. */
  hoverSat: 1.0,
});

/* Step 2's multiply colour, at the MIDPOINT of the per-node warmth ramp —
   `rgba(226, 150 + warmth*22, 86 + warmth*20, amber)` in drawPhotoCell below,
   evaluated at warmth 0.5. The shader needs the same factor to divide by, and
   this is the one place it is written down so the two cannot drift.

   Per-node warmth moves G by ±11 and B by ±10 out of 255 around this, which is
   an order of magnitude under the correction itself (the inverse lifts blue by
   ~66% relative to red) — so the midpoint is used rather than plumbing a
   per-vertex warmth attribute through three shaders for a residual nobody can
   see. If warmth's range ever widens, that trade is the line to revisit. */
const PHOTO_AMBER_MUL = Object.freeze([226 / 255, 161 / 255, 96 / 255]);

// Real-photo treatment (assets/contributor-portraits — contributors' own
// avatars out of Banodoco's published sprite; this is the SHIPPED path).
// Spike-calibrated pipeline: desaturation -> amber multiply -> warm-black
// lift -> edge burn -> unify/grain -> mask feather 0.76 -> edge. The four
// grade strengths live in PHOTO_GRADE above.
function drawPhotoCell(g, ox, oy, CELL, spec) {
  const { img, mirror, exposure, warmth, seed } = spec;
  // No sheet (it failed to load): draw the slot's procedural bust into the
  // photo cell instead, so the atlas stays complete and correctly indexed.
  if (!img) return drawBust(g, ox, oy, CELL, spec.bustSeed);
  const r = H.rng(((seed * 3319 + 811) | 0) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  g.save();
  g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  const D = R * 2.06;
  g.save();
  g.translate(cx, cy);
  if (mirror) g.scale(-1, 1);
  // One tile out of the published sheet. The 96px source is drawn straight to
  // the cell's disc diameter rather than being pre-upscaled: the grade below
  // (desaturate, amber, edge burn, grain) is doing far more to legibility than
  // the resample would, and the discs are small on screen at the rest pose.
  g.drawImage(img, spec.sx, spec.sy, spec.sw, spec.sh, -D / 2, -D / 2, D, D);
  g.restore();

  // 1. partial desaturation — kill the cool studio colour cast
  //    (0.62 -> 0.40 at ride-through #2, -> PHOTO_GRADE.desat now)
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = `rgba(128,128,128,${PHOTO_GRADE.desat})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 2. amber multiply — the main push into the palette
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(226,${(150 + warmth * 22) | 0},${(86 + warmth * 20) | 0},${PHOTO_GRADE.amber})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 3. deterministic exposure trim (density variation)
  if (exposure < 1) {
    const k = (exposure * 255) | 0;
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(ox, oy, CELL, CELL);
  }
  // 4. warm-black lift — ties the photo's blacks to the field's near-black
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(58,30,12,${exposure > 1 ? 0.26 : 0.16})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 5. edge burn — crush bright studio backgrounds so only the person holds
  // light and the disc melts into the dark substrate before the ember arcs.
  //
  // The burn was doing TWO jobs and only one of them was wanted. Darkening is
  // the job: that is the vignette, and it is untouched below. But it darkened
  // through a strongly amber gradient, and a multiply by an amber factor is
  // exactly the sepia-toning operation — it scales blue down about three times
  // harder than red, so a neutral becomes orange and a cool tone becomes a
  // warm one. Stacked on the amber multiply in step 2, that is what flattened
  // sixteen different people onto one hue. `burnMute` pulls each stop toward
  // its own Rec.709 luma, which holds the gradient's DARKNESS constant to
  // within a value or two while taking the hue rotation out of it. The face
  // still warms — steps 2, 4 and 6 and the ember rim all still run — it just
  // no longer warms by destroying the blue channel. (1 = the original stops.)
  g.globalCompositeOperation = 'multiply';
  const burn = g.createRadialGradient(cx, cy - R * 0.08, R * 0.30, cx, cy, R);
  const mute = (c) => {
    const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const k = PHOTO_GRADE.burnMute;
    return `rgba(${(c[0] + (y - c[0]) * k) | 0},${(c[1] + (y - c[1]) * k) | 0},${(c[2] + (y - c[2]) * k) | 0},1)`;
  };
  burn.addColorStop(0, 'rgba(255,255,255,1)');
  burn.addColorStop(0.58, mute([206, 172, 140]));
  burn.addColorStop(0.85, mute([96, 62, 32]));
  burn.addColorStop(1, mute([34, 20, 10]));
  g.fillStyle = burn;
  g.fillRect(ox, oy, CELL, CELL);
  // and give the face itself back a touch of ember key light
  g.globalCompositeOperation = 'lighter';
  const faceKey = g.createRadialGradient(cx, cy - R * 0.12, R * 0.05, cx, cy - R * 0.08, R * 0.55);
  faceKey.addColorStop(0, 'rgba(255,196,130,0.16)');
  faceKey.addColorStop(1, 'rgba(255,196,130,0)');
  g.fillStyle = faceKey;
  g.fillRect(ox, oy, CELL, CELL);
  g.globalCompositeOperation = 'source-over';
  g.restore();   // circle clip off

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r, PHOTO_GRADE.unify);
  softMask(g, ox, oy, CELL, cx, cy, R, 0.76);   // wider feather than the busts
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function drawBust(g, ox, oy, CELL, seed) {
  const r = H.rng((seed * 7919 + 4111) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  // --- dark warm chamber behind the person ---
  const bg = g.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.1, cx, cy, R * 1.05);
  bg.addColorStop(0, 'rgba(68,41,19,0.96)');
  bg.addColorStop(0.6, 'rgba(34,20,9,0.97)');
  bg.addColorStop(1, 'rgba(12,7,3,0.98)');
  g.fillStyle = bg;
  g.beginPath(); g.arc(cx, cy, R * 1.02, 0, TAU); g.fill();

  const skin = rampPick(SKIN_RAMP, r());
  const cloth = CLOTH[(r() * CLOTH.length) | 0];
  const hair = HAIR[(r() * HAIR.length) | 0];

  const hx = cx + (r() - 0.5) * R * 0.10;
  const hy = cy - R * 0.22 + (r() - 0.5) * R * 0.06;
  const rx = R * (0.40 + r() * 0.05);
  const ry = rx * (1.20 + r() * 0.10);

  // --- neck (deep shadow — never brighter than the face) ---
  g.fillStyle = css(scaleC(skin, 0.48));
  g.beginPath();
  g.rect(hx - rx * 0.32, hy + ry * 0.50, rx * 0.64, ry * 0.85);
  g.fill();

  // --- shoulders: a full bust filling the lower disc ---
  const shTop = cy + R * (0.30 + r() * 0.07);
  const shW = R * (1.10 + r() * 0.15);
  const shGrad = g.createLinearGradient(cx - shW, shTop, cx + shW * 0.5, cy + R);
  shGrad.addColorStop(0, css(scaleC(cloth, 1.9)));
  shGrad.addColorStop(0.45, css(cloth));
  shGrad.addColorStop(1, css(scaleC(cloth, 0.55)));
  g.fillStyle = shGrad;
  g.beginPath();
  g.moveTo(cx - shW, cy + R * 1.1);
  g.bezierCurveTo(cx - shW * 0.96, shTop + R * 0.12, cx - rx * 1.4, shTop, cx - rx * 0.60, shTop - R * 0.02);
  g.lineTo(cx + rx * 0.60, shTop - R * 0.02);
  g.bezierCurveTo(cx + rx * 1.4, shTop, cx + shW * 0.96, shTop + R * 0.12, cx + shW, cy + R * 1.1);
  g.closePath();
  g.fill();

  // --- head, key-lit from upper-left ---
  const key = g.createRadialGradient(
    hx - rx * 0.42, hy - ry * 0.42, rx * 0.12,
    hx, hy, ry * 1.25,
  );
  key.addColorStop(0, css(scaleC(skin, 1.26)));
  key.addColorStop(0.42, css(scaleC(skin, 0.98)));
  key.addColorStop(1, css(scaleC(skin, 0.44)));
  g.fillStyle = key;
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.fill();

  // --- warm bounce from BELOW: the mycelium's own light on the jaw ---
  g.save();
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.clip();
  g.globalCompositeOperation = 'lighter';
  const up = g.createRadialGradient(hx, hy + ry * 1.15, ry * 0.1, hx, hy + ry * 1.15, ry * 1.2);
  up.addColorStop(0, 'rgba(255,179,107,0.16)');
  up.addColorStop(1, 'rgba(255,179,107,0)');
  g.fillStyle = up;
  g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2.2);
  g.globalCompositeOperation = 'source-over';
  g.restore();

  // shade the far side of the face
  g.save();
  g.beginPath(); g.ellipse(hx, hy, rx, ry, 0, 0, TAU); g.clip();
  const sh = g.createLinearGradient(hx - rx * 0.2, hy, hx + rx, hy + ry * 0.6);
  sh.addColorStop(0, 'rgba(18,9,4,0)');
  sh.addColorStop(1, 'rgba(18,9,4,0.52)');
  g.fillStyle = sh;
  g.fillRect(hx - rx, hy - ry, rx * 2, ry * 2);
  // abstract feature shadows: brow line + eye sockets + under-nose, all soft
  g.shadowColor = 'rgba(15,8,4,0.7)';
  g.shadowBlur = CELL * 0.04;
  g.fillStyle = 'rgba(24,12,6,0.17)';
  g.beginPath(); g.ellipse(hx - rx * 0.36, hy - ry * 0.05, rx * 0.19, ry * 0.062, 0.08, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(hx + rx * 0.34, hy - ry * 0.05, rx * 0.19, ry * 0.062, -0.08, 0, TAU); g.fill();
  g.fillStyle = 'rgba(24,12,6,0.10)';
  g.beginPath(); g.ellipse(hx - rx * 0.02, hy + ry * 0.22, rx * 0.10, ry * 0.055, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(24,12,6,0.13)';
  g.beginPath(); g.ellipse(hx, hy + ry * 0.44, rx * 0.24, ry * 0.045, 0, 0, TAU); g.fill();
  g.shadowBlur = 0;
  g.restore();

  // chin/jaw shadow onto neck
  g.fillStyle = 'rgba(12,6,3,0.38)';
  g.beginPath(); g.ellipse(hx, hy + ry * 0.72, rx * 0.42, ry * 0.16, 0, 0, TAU); g.fill();

  // optional facial hair
  if (r() < 0.32) {
    g.fillStyle = css(scaleC(hair, 0.85), 0.62);
    g.beginPath(); g.ellipse(hx, hy + ry * 0.42, rx * 0.52, ry * 0.30, 0, 0, Math.PI); g.fill();
  }

  // --- hair / head-covering variants ---
  const hv = (r() * 5) | 0;
  g.fillStyle = css(hair, 0.96);
  if (hv === 0) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.42, rx * 1.06, ry * 0.52, 0, Math.PI, TAU); g.fill();
  } else if (hv === 1) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.40, rx * 1.12, ry * 0.55, 0, Math.PI, TAU); g.fill();
    g.beginPath();
    g.ellipse(hx - rx * 1.02, hy + ry * 0.34, rx * 0.30, ry * 0.85, 0.12, 0, TAU); g.fill();
    g.beginPath();
    g.ellipse(hx + rx * 1.02, hy + ry * 0.34, rx * 0.30, ry * 0.85, -0.12, 0, TAU); g.fill();
  } else if (hv === 2) {
    g.beginPath(); g.ellipse(hx, hy - ry * 0.44, rx * 1.04, ry * 0.48, 0, Math.PI, TAU); g.fill();
    g.beginPath(); g.arc(hx + rx * 0.15, hy - ry * 1.06, rx * 0.34, 0, TAU); g.fill();
  } else if (hv === 3) {
    for (let k = 0; k < 11; k++) {
      const a = Math.PI + (k / 10) * Math.PI;
      const rr = rx * (1.02 + r() * 0.22);
      g.beginPath();
      g.arc(hx + Math.cos(a) * rr, hy - ry * 0.30 + Math.sin(a) * ry * 0.62, rx * (0.24 + r() * 0.14), 0, TAU);
      g.fill();
    }
  } else {
    // hood / head-wrap (like the approved still's hooded figures)
    g.strokeStyle = css(scaleC(cloth, 1.35), 0.95);
    g.lineWidth = rx * 0.46;
    g.beginPath(); g.ellipse(hx, hy - ry * 0.06, rx * 1.22, ry * 1.02, 0, Math.PI * 1.06, TAU - Math.PI * 0.06); g.stroke();
  }

  // lit edge of hair (key side)
  g.strokeStyle = css(scaleC(hair, 2.6), 0.75);
  g.lineWidth = CELL * 0.012;
  g.beginPath(); g.ellipse(hx, hy - ry * 0.40, rx * 1.02, ry * 0.52, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();

  // --- ember rim light on the shadow side (the mycelium lights them) ---
  g.shadowColor = 'rgba(255,179,107,0.9)';
  g.shadowBlur = CELL * 0.03;
  g.strokeStyle = 'rgba(255,185,118,0.62)';
  g.lineWidth = CELL * 0.011;
  g.beginPath(); g.ellipse(hx, hy, rx * 1.01, ry * 1.01, 0, -Math.PI * 0.22, Math.PI * 0.38); g.stroke();
  g.shadowBlur = 0;

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r);
  softMask(g, ox, oy, CELL, cx, cy, R);
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function drawAnonGlyph(g, ox, oy, CELL, seed) {
  const r = H.rng((seed * 6011 + 977) >>> 0);
  const cx = ox + CELL / 2, cy = oy + CELL / 2;
  const R = CELL * 0.36;
  g.save();
  g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

  const bg = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 1.05);
  bg.addColorStop(0, 'rgba(58,34,14,0.96)');
  bg.addColorStop(0.55, 'rgba(28,16,7,0.97)');
  bg.addColorStop(1, 'rgba(10,6,3,0.98)');
  g.fillStyle = bg;
  g.beginPath(); g.arc(cx, cy, R * 1.02, 0, TAU); g.fill();

  g.globalCompositeOperation = 'lighter';
  // spore-print glyph: fine radiating filaments, like a gill print
  const N = 46 + ((r() * 10) | 0);
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU + (r() - 0.5) * 0.05;
    const r0 = R * (0.14 + r() * 0.05);
    const r1 = R * (0.52 + r() * 0.30);
    const bend = (r() - 0.5) * 0.16;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
    const x1 = cx + Math.cos(a + bend) * r1, y1 = cy + Math.sin(a + bend) * r1;
    const gl = g.createLinearGradient(x0, y0, x1, y1);
    gl.addColorStop(0, `rgba(255,196,128,${(0.16 + r() * 0.26).toFixed(3)})`);
    gl.addColorStop(1, `rgba(255,180,110,${(0.02 + r() * 0.06).toFixed(3)})`);
    g.strokeStyle = gl;
    g.lineWidth = (0.5 + r() * 0.9) * 2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(
      cx + Math.cos(a + bend * 0.5) * (r0 + r1) * 0.5,
      cy + Math.sin(a + bend * 0.5) * (r0 + r1) * 0.5,
      x1, y1);
    g.stroke();
  }
  // two broken concentric rings
  for (const rr of [0.34, 0.58]) {
    const segs = 7 + ((r() * 4) | 0);
    for (let k = 0; k < segs; k++) {
      const a0 = (k / segs) * TAU + r() * 0.3;
      const a1 = a0 + (TAU / segs) * (0.45 + r() * 0.35);
      g.strokeStyle = `rgba(255,200,135,${(0.10 + r() * 0.16).toFixed(3)})`;
      g.lineWidth = (0.7 + r() * 0.8) * 2;
      g.beginPath(); g.arc(cx, cy, R * (rr + (r() - 0.5) * 0.03), a0, a1); g.stroke();
    }
  }
  // warm core — a held place, not a missing image
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.18);
  core.addColorStop(0, 'rgba(255,214,158,0.60)');
  core.addColorStop(0.5, 'rgba(255,190,120,0.26)');
  core.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = core;
  g.beginPath(); g.arc(cx, cy, R * 0.19, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r);
  softMask(g, ox, oy, CELL, cx, cy, R);
  drawEmbedEdge(g, cx, cy, R, r);
  g.restore();
}

function makeAtlas(cells, cols, CELL, drawFn, seeds) {
  const c = document.createElement('canvas');
  c.width = cols * CELL;
  c.height = Math.ceil(cells / cols) * CELL;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < cells; i++) {
    drawFn(g, (i % cols) * CELL, Math.floor(i / cols) * CELL, CELL, seeds[i]);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/* ================================================================== */
/* node-strand material: one draw call for every node's LOCAL strands  */
/* ================================================================== */
function makeNodeStrandMat(baseColor, pulseColor, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: -1 },
      uPulseOn: { value: 0 },
      uActive: { value: -999 },
      uActiveAmt: { value: 0 },
      uFade: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.135 },
      uWidth: { value: opts.pulseWidth ?? 0.13 },
      uFogDensity: { value: opts.fogDensity ?? 0.016 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(pulseColor) },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      attribute float aNode;
      uniform float uActive, uActiveAmt, uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vS, vSel, vFog, vWv;
      void main() {
        vA = aAlong; vS = aStrand;
        vSel = step(abs(aNode - uActive), 0.5) * uActiveAmt;
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uBase, uWidth, uFogDensity, uFade;
      uniform vec3 uColor, uPulseColor;
      varying float vA, vS, vSel, vFog, vWv;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.41 + vS * 1.55) + vS * 51.3);
        float amb = uBase * (0.66 + 0.34 * tw) * (0.65 + 0.55 * vA);
        float d = vA - uPulse;
        float p = exp(-d * d / (uWidth * uWidth)) * uPulseOn * vSel;
        float trail = 0.26 * exp(min(d, 0.0) * 6.0) * step(d, 0.0) * uPulseOn * vSel;
        vec3 col = uColor * amb * (1.0 + 2.90 * vSel + 2.1 * vWv)
          + uPulseColor * (p + trail) * 1.25 + uPulseColor * vWv * amb * 1.4;
        col *= exp(-uFogDensity * uFogDensity * vFog * vFog);
        col *= smoothstep(1.1, 2.9, vFog);    // near-fade (see substrate note)
        gl_FragColor = vec4(col * uFade, 1.0);
      }`,
  });
}

/* ================================================================== */
export function buildPortraitField({
  leg, contributors, substrate, palette: P, nodeCount = 48, exposure = 1,
}) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  const NODE_COUNT = nodeCount;
  const C_COUNT = contributors.length;          // routable, hoverable nodes
  group.name = 'owned-portraits-' + NODE_COUNT;
  const {
    camDist, nearestCamPt, restFrame, projectInto, clampUnder, groundY,
    portraitField, portraitAspect, restFramePortrait,
  } = leg;
  const { nearestCordPoint, inVoid } = substrate;

  // ---- baked-read wiring (2026-08-17) --------------------------------
  // The shipped path skips placement and the strand/plane/rim/core/halo
  // geometry math below, rebuilding every BufferGeometry from static/geom
  // bytes (baked once at commit time in the goldens' own headless Chrome; see
  // journey/lib/baked.js). Materials, uniforms, the two atlases, the photo /
  // remix machinery and the runtime closures all stay computed on both paths
  // — only placement and geometry are skipped. ONE try/catch wraps the WHOLE
  // read: any missing key or shape mismatch throws and the field falls back
  // to the live builders in full, never a half-baked mix.
  const baked = (() => {
    // Portrait builds place the field from their own authored table (see
    // REST_SITES_PORTRAIT below); the bake is harvested in a landscape
    // window, so its bytes ARE the landscape arc and a portrait build must
    // rebuild live. leg.js decides the predicate once, at build time.
    if (portraitField) return null;
    if (!isBaked('owned')) return null;
    try {
      const p = payload('owned');
      const P = p && p.portraits;
      if (!P || !Array.isArray(P.nodeIds) || !Array.isArray(P.nodePos)
          || !Array.isArray(P.nodeContentKeys) || !Array.isArray(P.nodeRoutable)
          || !Array.isArray(P.nodeSize) || !Array.isArray(P.nodeAnchors)
          || typeof P.swapMaxR !== 'number' || typeof P.strandCurves !== 'number') {
        return null;
      }
      return {
        g: {
          planes: geometry('owned/planes', [
            ['position', 3], ['aCorner', 2], ['aCellA', 2], ['aCellB', 2],
            ['aNode', 1], ['aSeed', 1], ['aSize', 1], ['aTilt', 1],
            ['aAnonF', 1], ['aSwapD', 1],
          ]),
          rim: geometry('owned/rim', [['position', 3], ['aOff', 2], ['aNode', 1], ['aSeed', 1], ['aAlong', 1]]),
          cores: geometry('owned/cores', [['position', 3], ['aSize', 1], ['aSeed', 1], ['aNode', 1]]),
          halos: geometry('owned/halos', [['position', 3], ['aSize', 1], ['aSeed', 1], ['aNode', 1]]),
          strands: geometry('owned/strands', [['position', 3], ['aAlong', 1], ['aStrand', 1], ['aNode', 1]]),
        },
        portraits: p.portraits,
      };
    } catch (e) {
      return null;
    }
  })();

  /* ---------------- placement: AUTHORED IN THE REST FRAME ----------------
     ROOT-NETWORK RESTAGE (2026-08-06, 20-owned-root-network.md).

     The shipped build placed 48 nodes by frame-cell stratification across the
     whole leg — 16 routable ones biased to the rest, 32 ambient ones for
     glide coverage. Under the new composition that is the wrong instrument
     twice over. First, the reference is explicit about the count: "roughly
     14-16 PORTRAIT FACES", distributed "in a broad arc/oval across the
     field, denser toward the lower half, with clear dark breathing room
     between them" — 48 faces is a crowd, not a constellation, and the old
     frame read as a wall of glowing lanterns. Second, a 3x3 grid cannot
     author an arc; it authors a grid, and at this density that is exactly
     what it looked like.

     So the sixteen contributors ARE the field, and their positions are
     authored one by one in the REST FRAME (ndcX, ndcY, depth, size) — the
     house rule from the CONNECT restage: the frame is the spec. Read the
     table as the picture it is:

       · two far arms sweep up and outward at ndcY ~ +0.30, flanking the copy;
       · the sides fill at ndcY ~ 0;
       · the lower half carries nine of the sixteen, in two loose ranks;
       · the three nearest sit lowest and read largest.

     Depth falls as the row falls (13.0 at the top of the arc, 5.2 at the
     bottom), which is what makes "larger and lower reads as nearer" true in
     perspective rather than by drawing bigger sprites. Nothing is placed
     inside the copy block's box (|ndcX| < 0.5, ndcY in +0.15..+0.80) at any
     of the three review sizes.

     The 3.0-unit camera-path clearance rule from Spike B rev 2 SURVIVES
     unchanged below, and is now nearly free by construction: the camera
     glides just under the soil and the whole network hangs below it, so
     every site is already 3+ units under the flight line. The old build had
     to fight that rule; this one satisfies it. */
  const REST_SITES = [
    // ndcX, ndcY, depth, size
    [-0.70, 0.30, 12.4, 0.38],
    [0.72, 0.28, 11.8, 0.38],
    [-0.88, -0.03, 10.6, 0.39],
    [0.88, -0.06, 10.2, 0.39],
    [-0.58, 0.11, 11.6, 0.38],
    [0.56, 0.09, 11.2, 0.38],
    [-0.74, -0.32, 8.8, 0.42],
    [0.76, -0.30, 8.4, 0.42],
    [-0.26, -0.19, 9.8, 0.40],
    [0.21, -0.24, 9.4, 0.41],
    [-0.58, -0.47, 7.2, 0.44],
    [0.56, -0.45, 7.0, 0.44],
    [-0.05, -0.50, 8.0, 0.43],
    [-0.84, -0.68, 6.2, 0.46],
    [0.82, -0.64, 6.0, 0.46],
    [0.28, -0.76, 5.6, 0.47],
  ];

  /* PORTRAIT ARC (2026-08-17; revised the same day). The table above is the
     landscape picture, and a ~0.46-aspect phone sees barely a fifth of its
     width: only the four central sites projected into the tall frame, and
     the chapter read as five faces and a lot of dark. This is the SAME
     sixteen slots authored again for the tall frame — in the PORTRAIT rest
     frame (leg.js restFramePortrait: the portrait.js re-composed pose,
     fov 64) at the BUILD aspect, so a tablet's wider tall frame spreads the
     same NDC picture across its own width instead of inheriting a
     phone-squeezed middle (the first cut fixed the aspect at 430/932 and
     tablets read as a cluttered centre column).

     The first cut also ran the arc too high: two flankers at ndcY +0.30 sat
     BEHIND the paragraph, and the top rank at -0.04 crowded the button. The
     revision is one intention — THE COPY OWNS THE TOP, THE NETWORK RISES TO
     MEET IT AND STOPS:

       · the crown holds the top edge, the copy block runs to ndcY ~ +0.05;
       · a clear dark band (~0.16 of frame height) separates the button from
         the first face — the composition breathes where the eye enters;
       · two flankers peek in AT THE BUTTON LINE from the far edges
         (y ~ +0.10, |x| ~0.83, depth 13+): beside the button the edges are
         empty at every review size, so they read as the network continuing
         past the frame, not as glow behind the words;
       · four ranks descend from there — 3 / 4 / 3 / 4, alternating so no
         face sits directly above another — with rank gaps of ~0.20 frame
         heights and depth falling 11.8 -> 5.5, so lower IS nearer and the
         size hierarchy (0.34 far, 0.47 near) does the de-cluttering: the
         far ranks recede to accents, the near rank carries the weight.

     Nothing sits inside the copy's box (|ndcX| < 0.75, ndcY in
     +0.14..+0.85) at either phone size or at 768x1024. */
  const REST_SITES_PORTRAIT = [
    // ndcX, ndcY, depth, size
    [-0.82, 0.12, 13.6, 0.34],
    [0.84, 0.08, 13.2, 0.34],
    [-0.55, -0.20, 11.8, 0.37],
    [0.02, -0.26, 11.4, 0.37],
    [0.60, -0.21, 11.0, 0.37],
    [-0.85, -0.44, 9.6, 0.40],
    [-0.30, -0.47, 9.2, 0.41],
    [0.36, -0.48, 9.0, 0.41],
    [0.87, -0.43, 9.4, 0.40],
    [-0.58, -0.64, 7.4, 0.43],
    [0.04, -0.68, 7.0, 0.44],
    [0.62, -0.65, 7.2, 0.43],
    [-0.84, -0.80, 6.0, 0.45],
    [-0.28, -0.87, 5.6, 0.46],
    [0.32, -0.84, 5.5, 0.47],
    [0.82, -0.79, 5.9, 0.45],
  ];

  // The frame, aspect and table every placement read below composes against.
  // One trio, chosen once — a landscape build is bit-identical to what this
  // file always produced (siteFrame IS restFrame), and a portrait build is
  // the authored tall-frame arc through the same placement law, separation
  // pass, clearance rule and repair loop.
  const SITES = portraitField ? REST_SITES_PORTRAIT : REST_SITES;
  const siteFrame = portraitField ? restFramePortrait : restFrame;
  const siteAspect = portraitField ? portraitAspect : 1.6;

  // Rest reachability repair (the grey-box gap, fixed by construction and
  // then VERIFIED here): every routable node must project into the rest
  // frame with margin for the hotspot layer (|ndc| <= 0.97 in x, 0.90 in y —
  // the arc deliberately runs wide, and a chip whose dot is at |x| 0.96 is
  // still fully placeable because ui.js flips the pill inboard) at a workable
  // depth. A failure is pulled straight back toward its authored site along
  // the rest gaze rather than re-rolled somewhere else: the arc is authored,
  // so the repair must preserve it. `restOk` stays defined on both paths: it
  // is also the runtime `restVisible()` QA gate.
  function restOk(nd) {
    const pr = projectInto(siteFrame, nd.pos, siteAspect);
    return pr.z > 2.6 && pr.z < 16.5 && Math.abs(pr.x) <= 0.97 && Math.abs(pr.y) <= 0.90;
  }

  // Baked read path: reconstruct the runtime-read node fields from the
  // payload in index order, and re-resolve each content reference through
  // the SAME `contributors` array the live placement read (store the id, not
  // the object — see baked.js). seed/tilt/strandCount/rand are bake-time only
  // and already folded into the baked attributes, so they are inert here;
  // anchors are restored for completeness (the commit pipeline's assignOwners
  // is their only reader, and it is skipped on the baked path).
  let nodes;
  if (baked) {
    const P = baked.portraits;
    nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      id: P.nodeIds[i] ?? null,
      i,
      pos: new V3(P.nodePos[i * 3], P.nodePos[i * 3 + 1], P.nodePos[i * 3 + 2]),
      content: contributors.find(c => c.id === P.nodeContentKeys[i]) || contributors[i % C_COUNT],
      routable: !!P.nodeRoutable[i],
      homeP: REST_P,
      size: P.nodeSize[i],
      seed: 0, tilt: 0, strandCount: 0, rand: null,
      anchors: (P.nodeAnchors[i] || []).map(([x, y, z]) => new V3(x, y, z)),
    }));
  } else {
    nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
      const c = contributors[i % C_COUNT];
      const routable = i < C_COUNT;
      const rand = H.rng((((c.seed ?? (i + 1)) * 7919 + 17 + i * 977) | 0) >>> 0);
      const site = SITES[i % SITES.length];
      const f = siteFrame;
      const TANV = Math.tan(0.5 * f.fov * Math.PI / 180);
      const ASPECT = siteAspect;
      // a hair of authored-position jitter so the arc never reads as a plotted
      // curve, small enough that the composition above is what ships
      const cx = site[0] + (rand() - 0.5) * 0.045;
      const cy = site[1] + (rand() - 0.5) * 0.040;
      const d = site[2] * (0.96 + rand() * 0.08);
      const pos = f.pos.clone()
        .addScaledVector(f.fwd, d)
        .addScaledVector(f.right, cx * TANV * ASPECT * d)
        .addScaledVector(f.up, cy * TANV * d);
      pos.x = clamp(pos.x, -16.5, 5.0);
      pos.z = clamp(pos.z, -9.0, 9.0);
      clampUnder(pos, 0.9);
      // a site that lands in an authored void is nudged SIDEWAYS out of it,
      // never re-rolled and never dropped: the arc is the composition and the
      // void is only seasoning. (The first pass pushed down 0.45 per iteration
      // and moved two nodes half a frame south of where they were authored —
      // measured NDC y -0.45 -> -0.88. Lateral, small, and capped.)
      for (let guard = 0; guard < 4 && inVoid(pos.x, pos.y, pos.z); guard++) {
        // INWARD, toward frame centre — an outward nudge walks edge sites off
        // the frame (measured: authored 0.78 -> 0.96 ndc, past the chip layer's
        // placeable margin).
        pos.addScaledVector(f.right, (cx >= 0 ? -1 : 1) * 0.34)
           .addScaledVector(f.up, -0.10);
        clampUnder(pos, 0.9);
      }
      return {
        id: routable ? c.id : null, i, pos, content: c, routable, homeP: REST_P,
        // size/spacing jitter (rev-2 rule, kept): a spread wide enough that
        // density never reads as a "row of coins". The base size now comes
        // from the authored table so scale tracks the arc.
        size: site[3] * (0.92 + rand() * 0.20),
        seed: rand(),
        tilt: (rand() - 0.5) * 0.16,
        strandCount: 4 + Math.floor(rand() * 3),
        rand,
      };
    });

    // gentle separation pass — per-pair jittered minimum so spacing never
    // settles into an even chain. The authored arc already spaces them; this
    // only catches the jitter's worst case.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].pos, b = nodes[j].pos;
          const d = a.distanceTo(b);
          const min = 1.7 + ((i * 31 + j * 17) % 7) * 0.07;
          if (d < min && d > 0.001) {
            const push = a.clone().sub(b).normalize().multiplyScalar((min - d) * 0.5);
            a.add(push); b.sub(push);
            clampUnder(a, 0.9); clampUnder(b, 0.9);
          }
        }
      }
    }

    // HARD RULE (rev 2, verbatim): every portrait node keeps >=3.0 world units
    // of clearance from ANY point of the camera path — descent and rise
    // included — or its defocused plane can swallow the whole frame on a
    // different pass. If the push breaches the soil, it is redirected along
    // the horizontal component.
    function enforceClearance(nd) {
      for (let it = 0; it < 4; it++) {
        const cd = camDist(nd.pos.x, nd.pos.y, nd.pos.z);
        if (cd >= 3.0) return;
        const nearest = nearestCamPt(nd.pos);
        const away = nd.pos.clone().sub(nearest);
        if (away.lengthSq() < 0.001) away.set(0, -1, 0);
        away.normalize();
        const lid = groundY(nd.pos.x, nd.pos.z) - (0.35 + nd.size);
        if (nd.pos.y + away.y * (3.0 - cd) > lid) {
          away.y = Math.min(away.y, 0);
          if (away.lengthSq() < 0.05) away.set(0, -1, 0);
          away.normalize();
        }
        nd.pos.addScaledVector(away, 3.05 - cd);
        clampUnder(nd.pos, 0.35 + nd.size);
      }
    }
    for (const nd of nodes) enforceClearance(nd);

    for (const nd of nodes) {
      if (!nd.routable || restOk(nd)) continue;
      const site = SITES[nd.i % SITES.length];
      const TANV_R = Math.tan(0.5 * siteFrame.fov * Math.PI / 180);
      for (let attempt = 0; attempt < 8; attempt++) {
        const shrink = 1 - attempt * 0.06;
        const d = site[2] * (1 - attempt * 0.05);
        const p = siteFrame.pos.clone()
          .addScaledVector(siteFrame.fwd, d)
          .addScaledVector(siteFrame.right, site[0] * shrink * TANV_R * siteAspect * d)
          .addScaledVector(siteFrame.up, site[1] * shrink * TANV_R * d);
        clampUnder(p, 0.35 + nd.size);
        if (camDist(p.x, p.y, p.z) < 3.0) continue;
        nd.pos.copy(p);
        if (restOk(nd)) break;
      }
      enforceClearance(nd);
    }
  }

  /* ---------------- atlases (8 columns; flipY-correct cell coords) ------ */
  const CELL = 256;
  const COLS = 8;
  const ROWS = Math.ceil(NODE_COUNT / COLS);
  const cellUV = (i) => [(i % COLS) / COLS, 1 - (Math.floor(i / COLS) + 1) / ROWS];

  // arrangement 0 (`bustSeedsFor` lives with the remix machinery below, so the
  // seed rule has one home and the build-time atlas is simply its first call)
  const atlasA = makeAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeedsFor(0));
  const anonSeeds = [11, 23, 37, 53];
  const atlasB = makeAtlas(4, 2, CELL, drawAnonGlyph, anonSeeds);

  /* ---------------- local strands that TERMINATE at each node ----------- */
  const nodeStrandSpecs = [];   // empty on the baked path; strandCurves comes from the payload
  if (!baked) {
    function addStrandCurve(startPt, target, nodeIdx, strandVal, seedA, seedB, amp) {
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const e = H.easings.smooth(t);
        const p = startPt.clone().lerp(target, e);
        const hump = Math.sin(Math.PI * t);
        p.x += H.fbm3(seedA * 2.3, t * 3.3, 1.7, 3) * amp * hump;
        p.y += H.fbm3(3.9, t * 3.1 + seedA * 1.4, seedB * 0.0005, 3) * amp * 0.75 * hump;
        p.z += H.fbm3(1.1, 2.6, t * 2.8 + seedA * 1.9, 3) * amp * hump;
        clampUnder(p, 0.16);
        pts.push(p);
      }
      pts[segs].copy(target);   // terminate exactly at the node
      nodeStrandSpecs.push({ pts, node: nodeIdx, strand: strandVal });
    }
    function addLocalStrands(target, nodeIdx, count, seed, minLen, maxLen, cordBias, anchors) {
      const rand = H.rng(seed >>> 0);
      for (let k = 0; k < count; k++) {
        let start = null;
        if (rand() < cordBias) start = nearestCordPoint(target, rand);
        // WHERE THIS FACE IS WIRED INTO THE ROOT WORLD (2026-08-06, report C).
        // `nearestCordPoint` returns a point ON the substrate's own root pool —
        // i.e. this strand does not merely end near a root, it starts on one.
        // Recording those points is what lets substrate.assignOwners() find the
        // face's LOCAL filaments by walking the network graph out from them,
        // instead of guessing by distance. Strands that rolled a free-space
        // start (55% of them) are not anchors and are not recorded.
        if (start && anchors) anchors.push(start.clone());
        if (!start) {
          const a = rand() * TAU;
          const b = (rand() - 0.5) * Math.PI * 0.85;
          const rr = minLen + rand() * (maxLen - minLen);
          start = V(
            target.x + Math.cos(a) * Math.cos(b) * rr,
            target.y + Math.sin(b) * rr * 0.75,
            target.z + Math.sin(a) * Math.cos(b) * rr,
          );
          clampUnder(start, 0.16);
        }
        addStrandCurve(start, target, nodeIdx, (k + 1) / (count + 1), k + seed * 0.0007, seed, 0.95);
      }
    }
    for (const n of nodes) {
      n.anchors = [];
      addLocalStrands(n.pos, n.i, n.strandCount, 8100 + n.i * 173, 1.7, 4.2, 0.45, n.anchors);
    }
    // node-to-node links: people are woven into EACH OTHER's networks —
    // each node reaches its nearest neighbour(s), endpoints exact at both.
    for (const n of nodes) {
      const byDist = nodes
        .filter(m => m.i !== n.i)
        .sort((a, b) => a.pos.distanceToSquared(n.pos) - b.pos.distanceToSquared(n.pos));
      const linkCount = n.rand() < 0.45 ? 2 : 1;
      for (let k = 0; k < linkCount; k++) {
        const m = byDist[k];
        if (!m || m.pos.distanceTo(n.pos) > 8.5) continue;
        addStrandCurve(m.pos.clone(), n.pos, n.i, 0.9 - k * 0.25, n.i * 1.7 + k * 3.1, 7700 + n.i, 1.35);
      }
    }
  }

  const nodeStrands = (() => {
    const mat = makeNodeStrandMat(P.gold, P.goldBright, {
      baseOpacity: 0.14 * exposure, pulseWidth: 0.13, fogDensity: 0.016,
    });
    let geo, verts;
    if (baked) {
      geo = baked.g.strands;
      verts = geo.attributes.position.count;
    } else {
      const pos = [], along = [], strand = [], nodeA = [];
      const N = 8;
      for (const s of nodeStrandSpecs) {
        const curve = H.catmull(s.pts);
        let prev = curve.getPointAt(0);
        for (let j = 1; j <= N; j++) {
          const t = j / N;
          const p = curve.getPointAt(t);
          pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          along.push((j - 1) / N, t);
          strand.push(s.strand, s.strand);
          nodeA.push(s.node, s.node);
          prev = p;
        }
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
      geo.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
      geo.setAttribute('aNode', new THREE.Float32BufferAttribute(nodeA, 1));
      verts = pos.length / 3;
    }
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -3;
    group.add(lines);
    return { lines, mat, geo, driver: H.pulseDriver(1.35), verts };
  })();

  /* ---------------- portrait planes (one draw call) ---------------- */
  const portraitMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMapA: { value: atlasA },
      uMapP: { value: atlasA },     // becomes the photo atlas when it lands
      uMapB: { value: atlasB },
      // REMIX (Hannah, 2026-08-07). The *2 slots hold the INCOMING arrangement
      // during a swap; uSwap is the one clock that drives the whole field, and
      // aSwapD is each node's place in the wave. At rest uSwap is 0 and the *2
      // slots are never sampled — which is also why a frozen capture is
      // untouched by any of this.
      uMapA2: { value: atlasA },
      uMapP2: { value: atlasA },
      uSwap: { value: 0 },
      uSwapSpan: { value: 0.34 },   // each node's own crossfade, as a fraction
      // The flare's GATE, and it starts at 0 for a reason worth recording. The
      // per-node flare is a Gaussian on the distance from the node's own
      // crossing, and a Gaussian is never exactly zero: at uSwap = 0 the node
      // whose delay is 0 sits one sigma out and evaluates to exp(-2.4) = 0.091.
      // Left ungated that is a permanent 9% ember lift on one contributor at
      // the resting composition — enough to move a frozen golden and, worse,
      // to make one face quietly hotter than its neighbours forever. The
      // uniform is 0 whenever no swap is running (see promoteSwap), 1 during
      // one, and 0 under prefers-reduced-motion.
      uSwapFlare: { value: 0 },
      uAnon: { value: 0 },
      uPhoto: { value: 0 },
      uCellAP: { value: new THREE.Vector2(1 / COLS, 1 / ROWS) },
      uRim: { value: new THREE.Color(P.ember) },
      uCore: { value: new THREE.Color(P.goldBright) },
      uHaze: { value: new THREE.Color(P.deepGold) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      // THE HOVER GRADE (2026-08-14) — see PHOTO_GRADE.hoverDeSepia. uAmberMul
      // and uAmberA are step 2 of drawPhotoCell's bake, handed to the shader so
      // it can divide by exactly what the bake multiplied by.
      uDeSepia: { value: PHOTO_GRADE.hoverDeSepia },
      uHovSat: { value: PHOTO_GRADE.hoverSat },
      uAmberMul: { value: new THREE.Vector3(PHOTO_AMBER_MUL[0], PHOTO_AMBER_MUL[1], PHOTO_AMBER_MUL[2]) },
      uAmberA: { value: PHOTO_GRADE.amber },
      uCoreMute: { value: PHOTO_GRADE.hoverCoreMute },
      uImgMute: { value: PHOTO_GRADE.hoverImgMute },
      uOpacity: { value: 0 },       // == chapter fade
      uExposure: { value: exposure },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aCorner;
      attribute vec2 aCellA;
      attribute vec2 aCellB;
      attribute float aNode;
      attribute float aSeed;
      attribute float aSize;
      attribute float aTilt;
      attribute float aAnonF;
      attribute float aSwapD;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform float uSwap, uSwapSpan, uSwapFlare;
      uniform vec3 uWaveC;
      uniform vec2 uCellAP;
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare;
      void main() {
        vQ = aCorner;
        // THE WAVE. aSwapD is this node's normalised place in the order the
        // swap travels (distance out from the crown, see SWAP ORDER below), so
        // every node's crossfade is the same uSwapSpan-long window, opened at
        // a different moment by the one clock. Span 1 = the whole field turns
        // over together, which is the reduced-motion setting.
        float span = max(uSwapSpan, 0.001);
        float d0 = aSwapD * (1.0 - span);
        vSwap = smoothstep(d0, d0 + span, uSwap);
        // …and a flare centred on the node's own crossing, so the change
        // happens INSIDE a flush of ember rather than being watched happening.
        float fq = (uSwap - (d0 + span * 0.5)) / (span * 0.5);
        vFlare = exp(-fq * fq * 2.4) * uSwapFlare;
        vec2 half01 = aCorner * 0.5 + 0.5;
        vUvA = half01 * uCellAP + aCellA;
        vUvB = half01 * 0.5 + aCellB;
        vSeed = aSeed;
        vAnonF = aAnonF;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // HOVER STAYS IN PLACE (Hannah, 2026-08-06 — report B, and the cause
        // of report A). This line used to read "mv.z += vH * 0.62": the plane
        // stepped 0.62 view units toward the lens on hover. A view-space step
        // toward the camera is not a translation on screen of zero — it is a
        // RADIAL magnification about the frame centre, so the node slid
        // OUTWARD from where it was drawn, by an amount proportional to its
        // eccentricity: measured 13 px at ndc x 0.05 and 87 px at ndc x 0.89,
        // 1440x900. The hit target never moved with it, so the further out a
        // face sat the further the picture disagreed with the pointer — which
        // is exactly why the EDGE faces were the worst ones to hover.
        // The emphasis is now entirely in place: a centred scale (below), the
        // ember ring and the image/core terms in the fragment shader, and the
        // node's own local strands. Nothing about hover moves a node.
        float dist = max(-mv.z, 0.05);
        // defocus band (rev-2 retune): only true near passes (< ~5) soften;
        // the mid field reads crisp like the approved still
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur;
        // grown, not pinned: slight per-node tilt + slow micro-sway + breath
        float ang = aTilt + sin(uTime * (0.05 + fract(aSeed) * 0.06) + aSeed * 3.0) * 0.02;
        float ca = cos(ang), sa = sin(ang);
        vec2 c = vec2(aCorner.x * ca - aCorner.y * sa, aCorner.x * sa + aCorner.y * ca);
        float breath = 1.0 + 0.010 * sin(uTime * (0.14 + fract(aSeed) * 0.21) + aSeed * 7.0);
        // 0.13 -> 0.20: the retired depth step bought 8-12% of apparent growth
        // on its own (a node 0.62 nearer at depth 5.6-12.4). Folding that into
        // the CENTRED scale keeps the hover reading as strong as it was while
        // leaving the node's centre exactly where it is drawn at rest.
        float size = aSize * breath * (1.0 + 0.20 * vH) * (1.0 + nearBlur * 1.0);
        mv.xy += c * size;
        vDepth = dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMapA, uMapP, uMapB, uMapA2, uMapP2;
      uniform vec3 uRim, uCore, uHaze;
      uniform float uTime, uOpacity, uAnon, uPhoto, uExposure;
      uniform float uDeSepia, uAmberA, uCoreMute, uImgMute, uHovSat;
      uniform vec3 uAmberMul;
      const vec3 LUMA709 = vec3(0.2126, 0.7152, 0.0722);
      varying vec2 vUvA, vUvB;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWv, vAnonF, vSwap, vFlare;
      void main() {
        float r = length(vQ);
        if (r > 1.30) discard;
        // foreground defocus is a REAL blur: force lower mips as vSoft rises
        float lod = vSoft * 5.5;
        // and the swap dissolves THROUGH soft focus: both the outgoing and the
        // incoming image lose definition together at the middle of the node's
        // crossfade and the new one comes back sharp. A straight A/B mix of two
        // sharp faces reads as a jump cut; this reads as a focus pull.
        float slod = lod + vFlare * 1.7;
        // three-way content: procedural bust -> real photo -> anonymous glyph
        // (vAnonF is the per-node consent gate: it forces the glyph even in
        // photo mode when enforcement is on)
        float anon = max(uAnon, vAnonF);
        vec4 tA = mix(texture2D(uMapA, vUvA, slod), texture2D(uMapA2, vUvA, slod), vSwap);
        vec4 tP = mix(texture2D(uMapP, vUvA, slod), texture2D(uMapP2, vUvA, slod), vSwap);
        // THE HOVER GRADE (2026-08-14) — a partial inverse of the bake's step-2
        // amber multiply, so a hovered face comes back toward the photograph.
        // See PHOTO_GRADE.hoverDeSepia for why this is an inverse and not a
        // desaturation. PHOTOS ONLY: applied to tP before the mix, so the
        // procedural busts (which the frozen goldens render) never see it.
        // Rides vH, which is 0 at rest and eased in both directions by
        // hoverAmt/selAmt — so this cannot pop on the way in or out.
        {
          vec3 f = mix(vec3(1.0), uAmberMul, uAmberA);
          vec3 unc = tP.rgb / max(f, vec3(1e-3));
          // rescale to the texel's own luma: hue moves, brightness does not
          float y0 = dot(tP.rgb, LUMA709);
          float y1 = dot(unc, LUMA709);
          unc *= y1 > 1e-4 ? y0 / y1 : 1.0;
          tP.rgb = mix(tP.rgb, clamp(unc, 0.0, 1.0), uDeSepia * vH);
          // ...then open the chroma back up around the same luma pivot. The
          // amber is gone by here but the baked unify collapse is not, and
          // cannot be inverted — this is the term that makes the picture read
          // as its own colour rather than merely the right hue. See
          // PHOTO_GRADE.hoverSat. (No backticks in this block: the whole
          // shader is a JS template literal.)
          float yh = dot(tP.rgb, LUMA709);
          tP.rgb = clamp(mix(vec3(yh), tP.rgb, 1.0 + uHovSat * vH), 0.0, 1.0);
        }
        vec4 tAP = mix(tA, tP, uPhoto);
        // the anonymous glyph is identity, not arrangement — a remix never
        // touches it, so it keeps the plain lod
        vec4 t = mix(tAP, texture2D(uMapB, vUvB, lod), anon);
        float soft = exp(-r * r * 1.7);
        float mask = mix(t.a, soft * 0.72, vSoft * 0.88);
        // independent flicker — two incommensurate rates, no shared loop
        float flick = 0.86 + 0.14 * (
            0.62 * sin(uTime * (0.29 + vSeed * 0.61) + vSeed * 17.3)
          + 0.38 * sin(uTime * (0.163 + vSeed * 0.37) + vSeed * 5.1));
        float rq = (r - 0.72) / 0.115;
        float rim = exp(-rq * rq);
        float boost = vH;
        // 0.88 -> 1.12 on the image term and 0.07 -> 0.20 on the resting rim
        // (root-network restage): the reference's people are "softly
        // ringed/haloed with light", i.e. the ring is part of the RESTING
        // read, not only the hover response. The hover deltas are unchanged,
        // so hover still moves the same distance from a higher floor.
        // The swap's own light: the ember RING answers first and hardest (it
        // is the node's edge, so the change reads as arriving from the network
        // around the face) with a much smaller lift in the core and almost
        // none in the image.
        //
        // These levels were cut from a first pass (0.22 / 0.85 / 0.26) after
        // shooting the swap at 375x812. The flare and the colony wave the
        // chapter fires are deliberately SIMULTANEOUS, so their contributions
        // add on the same pixels — and at phone size the only faces on screen
        // are the three or four NEAREST, which are already the largest and
        // brightest things in the frame. Measured on that shot, the image term
        // ran 1.12 -> 1.89 and the near faces bloomed to featureless orbs under
        // UnrealBloom: exactly the failure EXPOSURE_PLANES was tuned against
        // (see index.js). The RING is what should carry a swap anyway — the
        // face has to stay a face while it is being exchanged.
        // THE HOVER GRADE, second half (2026-08-14). pg is "this is a
        // photograph AND it is hovered" — 0 at rest and 0 on a bust, so the
        // resting frame and the procedural path are untouched by construction.
        //
        // What Hannah is looking at when she says the hovered image is sepia is
        // NOT mostly the bake: it is the two terms below that quadruple over a
        // face on hover. Measured at the Owned rest with the test photos loaded,
        // hovering the nearest contributor takes the CORE — uCore is goldBright,
        // and exp(-r*r*8) puts it straight over the middle of the head — from
        // 0.07 to 0.31, and the image term from 1.12 to 1.42, and then
        // UnrealBloom works on the result. The photograph that reads clearly at
        // rest becomes an amber lamp. So the pullback is applied where the amber
        // is actually arriving.
        //
        // THE RIM IS DELIBERATELY NOT TOUCHED. It still runs 0.20 -> 1.00 on
        // hover, it sits at r ~ 0.72 (the disc's EDGE, not the face), and it is
        // the whole of the "these discs read as lit nodes in the network rather
        // than as photographs laid over it" contract that 45f600b's §F.3 refused
        // to trade away. The node still answers, and answers as hard as it did;
        // it just stops answering ON the person's face.
        float pg = uPhoto * vH;
        vec3 col = t.rgb * (1.12 + 0.30 * boost * (1.0 - uImgMute * pg) + 0.55 * vWv + 0.10 * vFlare)
          + uRim * rim * (0.20 + 0.80 * boost + 0.60 * vWv + 0.62 * vFlare) * (1.0 - vSoft * 0.85)
          + uCore * exp(-r * r * 8.0) * (0.07 + 0.24 * boost * (1.0 - uCoreMute * pg) + 0.30 * vWv + 0.15 * vFlare);
        // distant nodes emerge from amber haze rather than vanishing to black
        float haze = exp(-0.00135 * vDepth * vDepth);
        col = mix(uHaze * 0.38, col, clamp(haze + 0.14, 0.0, 1.0)) * flick;
        float alpha = mask * (1.0 - vSoft * 0.85) * (0.35 + 0.75 * haze) * uOpacity * uExposure;
        alpha = clamp(alpha * (1.0 + 0.22 * vWv + 0.12 * vFlare), 0.0, 1.0);
        gl_FragColor = vec4(col, alpha);
      }`,
  });

  /* ---------------- SWAP ORDER: the wave the remix travels on -------------
     A remix that cut all sixteen faces at once would read as a page reload of
     the field. This orders it as a wave OUT FROM THE CROWN, which is the one
     epicentre the chapter already recognises: every root leaves the crown, so
     a change that starts there and runs outward is the network redistributing
     rather than the browser repainting (chapters/owned/index.js setHot fires
     the same gesture from the same point on a crown hover, and substrate
     surge() runs crown -> out along the roots underneath it).

     Measured IN THE REST FRAME, not in world space, and that is the decision
     worth recording. In world space the nodes nearest the crown are the
     NEAR-CAMERA ones — the crown sits 1.85 units off the lens — so a
     world-space order starts the wave on the three big foreground faces at the
     BOTTOM of the picture. Shot and compared: the visitor presses a button at
     top-centre and the answer begins at the far bottom edge, running back up
     the frame while the substrate's own surge runs the other way down the
     roots. Two waves crossing reads as noise. Ordered by distance from the
     crown AS DRAWN, the wave starts under the button, sweeps out along both
     arms and settles at the low corners — one direction, the same one the
     roots and the copy already establish. The house rule from the CONNECT and
     root-network restages, again: the frame is the spec.

     A small deterministic jitter keeps it off a clean expanding ring:
     near-equidistant nodes turn over a beat apart, so the field reads as
     thinking rather than counting. */
  const swapEpicentre = (leg.CROWN ? leg.CROWN.clone() : nodes[0].pos.clone());
  const swapDelays = baked ? null : (() => {
    const crownNdc = projectInto(siteFrame, swapEpicentre, siteAspect);
    const d = nodes.map((nd) => {
      const p = projectInto(siteFrame, nd.pos, siteAspect);
      // x by the same aspect the placement table uses, so "distance" is the
      // distance the eye sees rather than the one the NDC cube reports
      return Math.hypot((p.x - crownNdc.x) * siteAspect, p.y - crownNdc.y);
    });
    const lo = Math.min(...d), hi = Math.max(...d);
    const spread = (hi - lo) || 1;
    return nodes.map((nd, i) => clamp((d[i] - lo) / spread + (nd.seed - 0.5) * 0.11, 0, 1));
  })();
  // World radius for the colony wave index.js fires alongside the swap — that
  // one IS a spherical wave in the world, so it keeps world units.
  const swapMaxR = baked ? baked.portraits.swapMaxR : Math.max(...nodes.map(nd => nd.pos.distanceTo(swapEpicentre)));

  const portraits = (() => {
    let geo;
    if (baked) {
      geo = baked.g.planes;
    } else {
      const n = NODE_COUNT;
      const pos = new Float32Array(n * 4 * 3);
      const corner = new Float32Array(n * 4 * 2);
      const cellA = new Float32Array(n * 4 * 2);
      const cellB = new Float32Array(n * 4 * 2);
      const nodeA = new Float32Array(n * 4);
      const seedA = new Float32Array(n * 4);
      const sizeA = new Float32Array(n * 4);
      const tiltA = new Float32Array(n * 4);
      const anonF = new Float32Array(n * 4);
      const swapD = new Float32Array(n * 4);
      const idx = new Uint16Array(n * 6);
      const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      nodes.forEach((nd, i) => {
        const [ax, ay] = cellUV(i);
        const bcell = i % 4;
        const bx = (bcell % 2) * 0.5, by = 1 - (Math.floor(bcell / 2) + 1) * 0.5;
        for (let k = 0; k < 4; k++) {
          const v = i * 4 + k;
          pos[v * 3 + 0] = nd.pos.x; pos[v * 3 + 1] = nd.pos.y; pos[v * 3 + 2] = nd.pos.z;
          corner[v * 2 + 0] = CORNERS[k][0]; corner[v * 2 + 1] = CORNERS[k][1];
          cellA[v * 2 + 0] = ax; cellA[v * 2 + 1] = ay;
          cellB[v * 2 + 0] = bx; cellB[v * 2 + 1] = by;
          nodeA[v] = i; seedA[v] = nd.seed * 9.7 + i * 1.31;
          sizeA[v] = nd.size; tiltA[v] = nd.tilt;
          anonF[v] = 0;    // consent enforcement writes 1s via setConsentEnforced
          swapD[v] = swapDelays[i];
        }
        const o = i * 4;
        idx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
      });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
      geo.setAttribute('aCellA', new THREE.BufferAttribute(cellA, 2));
      geo.setAttribute('aCellB', new THREE.BufferAttribute(cellB, 2));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aTilt', new THREE.BufferAttribute(tiltA, 1));
      geo.setAttribute('aAnonF', new THREE.BufferAttribute(anonF, 1));
      geo.setAttribute('aSwapD', new THREE.BufferAttribute(swapD, 1));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    const mesh = new THREE.Mesh(geo, portraitMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    return { mesh, geo, planes: NODE_COUNT };
  })();

  /* ---------------- real 3D fibre rim: strands radiating off each disc --- */
  const RIM_FIBRES = 12;
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.ember) },
      uHot: { value: new THREE.Color(P.goldBright) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uBase: { value: 0.30 * exposure },
      uFade: { value: 0 },
      uWaveC: { value: new THREE.Vector3(0, 0, 0) },
      uWaveR: { value: -100 },
      uWaveW: { value: 2.5 },
      uWaveAmt: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute vec2 aOff;
      attribute float aNode;
      attribute float aSeed;
      attribute float aAlong;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      uniform float uWaveR, uWaveW, uWaveAmt;
      uniform vec3 uWaveC;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv;
      void main() {
        vA = aAlong; vSeed = aSeed;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        float wd = distance(position, uWaveC) - uWaveR;
        vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // in place, like the plane it rings — see the portrait shader's note
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(2.2, 5.0, dist)) * (1.0 - vH * 0.45);
        vSoft = nearBlur; vDepth = dist;
        // moisture/substrate sway: per-fibre phase, tiny amplitude
        float ang = sin(uTime * (0.20 + aSeed * 0.47) + aSeed * 11.3) * 0.05;
        float ca = cos(ang), sa = sin(ang);
        vec2 o = vec2(aOff.x * ca - aOff.y * sa, aOff.x * sa + aOff.y * ca);
        mv.xy += o * (1.0 + 0.18 * vH) * (1.0 + nearBlur * 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uHot;
      uniform float uTime, uBase, uFade;
      varying float vA, vSeed, vH, vSoft, vDepth, vWv;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.37 + vSeed * 0.9) + vSeed * 23.1);
        float fall = 1.0 - vA;                    // hot at the rim, fading outward
        float a = uBase * fall * fall * (0.62 + 0.38 * tw) * (1.0 - vSoft * 0.9);
        a *= exp(-0.0013 * vDepth * vDepth) * (1.0 + 1.5 * vH + 1.7 * vWv);
        vec3 col = mix(uColor, uHot, clamp(vH * 0.7 + 0.15 + vWv * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, clamp(a * uFade, 0.0, 1.0));
      }`,
  });

  const rimFibres = (() => {
    let geo, verts;
    if (baked) {
      geo = baked.g.rim;
      verts = geo.attributes.position.count;
    } else {
      const SEGS = 3;
      const total = NODE_COUNT * RIM_FIBRES * SEGS * 2;
      const pos = new Float32Array(total * 3);
      const off = new Float32Array(total * 2);
      const nodeA = new Float32Array(total);
      const seedA = new Float32Array(total);
      const alongA = new Float32Array(total);
      let w = 0;
      nodes.forEach((nd, i) => {
        const rand = H.rng((3300 + i * 97) >>> 0);
        for (let f = 0; f < RIM_FIBRES; f++) {
          const a0 = (f / RIM_FIBRES) * TAU + (rand() - 0.5) * 0.42;
          const r0 = nd.size * (0.66 + rand() * 0.10);
          const len = nd.size * (0.34 + rand() * 0.72);
          const bend = (rand() - 0.5) * 0.9;
          const sd = rand();
          const pts = [];
          for (let s = 0; s <= SEGS; s++) {
            const t = s / SEGS;
            const a = a0 + bend * t * t;
            const rr = r0 + len * t;
            const jit = (H.noise3(i * 2.1 + f * 0.7, t * 4.0, sd * 9.0)) * nd.size * 0.10 * t;
            pts.push([Math.cos(a) * rr + jit, Math.sin(a) * rr - jit * 0.6, t]);
          }
          for (let s = 0; s < SEGS; s++) {
            for (const q of [pts[s], pts[s + 1]]) {
              pos[w * 3 + 0] = nd.pos.x; pos[w * 3 + 1] = nd.pos.y; pos[w * 3 + 2] = nd.pos.z;
              off[w * 2 + 0] = q[0]; off[w * 2 + 1] = q[1];
              nodeA[w] = i; seedA[w] = sd * 7.3 + f * 0.53; alongA[w] = q[2];
              w++;
            }
          }
        }
      });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aOff', new THREE.BufferAttribute(off, 2));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aAlong', new THREE.BufferAttribute(alongA, 1));
      verts = total;
    }
    const lines = new THREE.LineSegments(geo, rimMat);
    lines.frustumCulled = false;
    lines.renderOrder = 1;
    group.add(lines);
    return { lines, geo, verts };
  })();

  /* ---------------- ember cores + broad halos (Points, 2 draws) --------- */
  function makeGlowPoints(map, color, sizeMul, baseA, hoverA, order, bakedGeo) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: map },
        uColor: { value: new THREE.Color(color) },
        uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
        uScale: { value: 220 },
        uBaseA: { value: baseA * exposure }, uHoverA: { value: hoverA },
        uFade: { value: 0 },
        uWaveC: { value: new THREE.Vector3(0, 0, 0) },
        uWaveR: { value: -100 },
        uWaveW: { value: 2.5 },
        uWaveAmt: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aSeed;
        attribute float aNode;
        uniform float uHoverIdx, uHoverAmt, uScale;
        uniform float uWaveR, uWaveW, uWaveAmt;
        uniform vec3 uWaveC;
        varying float vSeed, vH, vWv;
        void main() {
          vSeed = aSeed;
          vH = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
          float wd = distance(position, uWaveC) - uWaveR;
          vWv = exp(-wd * wd / (uWaveW * uWaveW)) * uWaveAmt;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // in place — the core and halo grow about the node, they do not
          // travel toward the lens (see the portrait shader's note)
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize * (1.0 + 0.42 * vH + 0.18 * vWv) / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uBaseA, uHoverA, uFade;
        varying float vSeed, vH, vWv;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          // HELD STILL (2026-08-11): this used to be a live flicker,
          // 0.80 + 0.20 sin(uTime * (0.33 + vSeed * 0.71) + vSeed * 13.7) —
          // a 12-28% brightness swing measured ON THE DOTS at the rest. The
          // clock is gone; the SAME expression at its t = 0 phase keeps every
          // node's individual level (no army of identical dots, and the frozen
          // goldens — which always rendered uTime = 0 — are byte-identical).
          float flick = 0.80 + 0.20 * sin(vSeed * 13.7);
          float a = t.a * (uBaseA + uHoverA * vH) * flick * (1.0 + 1.3 * vWv);
          gl_FragColor = vec4(uColor, clamp(a * uFade, 0.0, 1.0));
        }`,
    });
    let geo = bakedGeo || null;
    if (!geo) {
      const n = NODE_COUNT;
      const pos = new Float32Array(n * 3);
      const sizeA = new Float32Array(n);
      const seedA = new Float32Array(n);
      const nodeA = new Float32Array(n);
      nodes.forEach((nd, i) => {
        pos[i * 3] = nd.pos.x; pos[i * 3 + 1] = nd.pos.y; pos[i * 3 + 2] = nd.pos.z;
        sizeA[i] = nd.size * sizeMul;
        seedA[i] = nd.seed * 11.3 + i * 0.77;
        nodeA[i] = i;
      });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    }
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order;
    group.add(pts);
    return { pts, mat, geo };
  }
  // the halo each face sits inside; the core is the ember at its centre
  const cores = makeGlowPoints(H.softDisc(64), P.goldBright, 0.5, 0.085, 0.30, 3, baked?.g.cores);
  const halos = makeGlowPoints(H.glowSprite(P.ember, 64), P.ember, 2.7, 0.058, 0.18, -2, baked?.g.halos);

  /* ---------------- photo pipeline (async; never blocks boot) -------------
     REAL CONTRIBUTORS since 2026-08-16. This used to load assets/test-portraits
     — randomuser.me/pravatar stock faces, marked LOOK-DEV ONLY and barred from
     shipping. It now loads each contributor's OWN avatar, as published by
     Banodoco on its own front page; see assets/contributor-portraits/
     manifest.js for provenance.

     ONE PORTRAIT PER PERSON, BY IDENTITY. The old loader fetched a POOL of 26
     images and dealt them to nodes by a stride permutation, because with
     anonymous placeholder rows it did not matter which face landed where. It
     matters completely now: the popover beside a face prints that node's
     `content.name`, so a mis-dealt image captions a real person with someone
     else's name. Each node therefore loads the file named by its own row's
     `avatar` field and no other, and the deal is gone rather than reseeded.

     A MISSING FILE IS SURVIVABLE, per node. One failed image no longer rejects
     the whole set (the old Promise.all did, dropping the entire field back to
     procedural over a single 404) — that node keeps its procedural bust and the
     other fifteen still show. Only a wholesale failure leaves the field as it
     was, which is the same graceful outcome as before. */
  function loadPhotos() {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res({ sheet: im });
      im.onerror = () => rej(new Error('portrait sprite failed to load'));
      im.src = PORTRAIT_SPRITE.url;
    });
  }
  /* ---------------- ARRANGEMENTS: what a remix actually re-deals ----------
     REMIX (Hannah, 2026-08-07) — see 20-owned-root-network.md.

     THE PORTRAIT-SET SITUATION, stated where the code lives — and resolved
     2026-08-16. This block used to record a constraint: the repo's only image
     set was 26 stock faces barred from shipping, so a remix could re-light the
     field but never honestly re-cast it. That is over. The set is now
     Banodoco's own published avatar sheet and the pool is 120 real people
     (content/contributors.js), so a re-deal genuinely changes WHO is in the
     field — sixteen out of 120, which is what the mechanism was always built
     general for.

     The prediction in the retired note was right about the shape and wrong
     about the seam: it expected a second manifest to be swapped in behind
     `variantSpecs`. What actually changed is that the arrangement index now
     selects PEOPLE as well as treatment, because identity turned out to be
     the thing that has to move — and the thing that has to move atomically
     with the name beside it.

     Arrangement 0 is byte-identical to what shipped before this feature (the
     stride/offset pair at v=0 is the old `i * 7 + 3`, and every other term
     reduces to its old form), so nothing about the resting composition, the
     goldens or the look-dev calibration moves.

     Strides are all coprime with the 20-image small pool, so each is a
     different permutation rather than a rotation of the last. */
  const V_STRIDE = [7, 9, 3, 11, 13, 17, 19];
  const V_OFFSET = [3, 11, 5, 17, 2, 13, 8];

  let photosAvailable = false;
  let photoSet = null;        // { images, wanted } once loaded

  /* WHO IS IN THE FIELD, AND WHAT A RE-DEAL ACTUALLY CHANGES.

     Sixteen positions, 120 people (content/contributors.js). An arrangement `v`
     deals sixteen DISTINCT people into the sixteen slots and writes each one's
     name, role and blurb onto that slot's content row, so the popover, the
     hotspot's accessible name and the face are the same person by construction
     — there is no path that moves one without the others.

     THE DEAL IS SEEDED, THE SESSION IS NOT. `dealFor(v)` is a pure function of
     v and `dealSalt`, so the same arrangement always re-bakes identically (the
     atlas is baked more than once — the prepare-ahead path in schedulePrepare
     re-derives v before the visitor ever sees it, and it must not produce a
     different sixteen the second time). `dealSalt` is randomised ONCE per page
     load, which is what makes two visitors see different people while keeping
     any single visit self-consistent.

     A Fisher-Yates prefix, not sixteen independent draws: with 120 people and
     sixteen slots, independent draws collide about 65% of the time, and one
     face appearing twice in a field of sixteen is the single most obvious way
     this could look broken.

     MIRRORING IS GONE, not merely unused. It existed to stop a small pool of
     stock faces from looking repeated, and it is actively wrong here: these
     avatars include wordmarks and lettering (THE DOR BROTHERS, Kosinkadink's
     JK), which a horizontal flip renders backwards.

     Everything that is not identity still varies with `v` — exposure, warmth,
     grain seed — so a re-deal re-lights the field as well as re-casting it.
     V_STRIDE/V_OFFSET survive as generators for those. */
  const dealSalt = (Math.random() * 0x7fffffff) | 0;

  function dealFor(v) {
    const rnd = H.rng((((v + 1) * 2654435761) ^ dealSalt) >>> 0);
    const order = CONTRIBUTOR_POOL.map((_, i) => i);
    for (let i = 0; i < NODE_COUNT && i < order.length; i++) {
      const j = i + Math.floor(rnd() * (order.length - i));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return order.slice(0, NODE_COUNT).map((i) => CONTRIBUTOR_POOL[i]);
  }

  /** Move the dealt people onto the slots. Name, role, blurb and face travel
   *  together, in one assignment, for the reason in content/content.js. */
  function seatPeople(people) {
    nodes.forEach((nd, i) => {
      const p = people[i % people.length];
      if (!p) return;
      nd.content.name = p[0];
      nd.content.role = p[1];
      nd.content.blurb = ROLE_BLURB[p[1]] || nd.content.blurb;
    });
  }

  function photoSpecs(v) {
    const st = V_STRIDE[v % V_STRIDE.length];
    const of = V_OFFSET[v % V_OFFSET.length];
    const people = dealFor(v);
    const T = PORTRAIT_SPRITE.tile;
    return nodes.map((nd, i) => {
      const k = i * st + of;
      const p = people[i % people.length];
      return {
        img: photoSet.sheet,
        // the person's own tile in the published sheet
        sx: p[2] * T, sy: p[3] * T, sw: T, sh: T,
        bustSeed: (nd.content.seed ?? i + 1) * 131 + i * 7 + v * 9973,
        mirror: false,
        exposure: 0.90 + ((i * 29 + v * 7 + k) % 13) / 13 * 0.26,
        warmth: ((i * 17 + v * 3) % 11) / 11,
        seed: 5000 + i * 37 + v * 911,
      };
    });
  }
  function bustSeedsFor(v) {
    return nodes.map((nd, i) => (nd.content.seed ?? i + 1) * 131 + i * 7 + v * 9973);
  }
  function bakeBusts(v) {
    return v === 0 ? atlasA : makeAtlas(NODE_COUNT, COLS, CELL, drawBust, bustSeedsFor(v));
  }
  function bakePhotos(v) {
    return photoSet ? makeAtlas(NODE_COUNT, COLS, CELL, drawPhotoCell, photoSpecs(v)) : null;
  }

  const photosReady = loadPhotos().then((photos) => {
    photoSet = photos;
    // The nearest-node/large-source ranking retired with the mixed-resolution
    // stock pool: every tile in the published sheet is the same 96px, so there
    // is no sharper variant to reserve for the faces closest to camera.
    //
    // Seat arrangement 0's people at the same moment its atlas becomes the
    // resting one. Until this line the rows still carry their opening
    // occupants from content.js, which is the correct thing to show while the
    // sheet is in flight.
    seatPeople(dealFor(0));
    portraitMat.uniforms.uMapP.value = bakePhotos(0);
    photosAvailable = true;
    // and start the NEXT arrangement warming — but NOT in the load window
    // (2026-08-16, the post-settle stall hunt): this bake is two 2048x512
    // canvas atlases (~tens of ms of shadowBlur + grain loops) whose only
    // purpose is to precede a REMIX PRESS, an interaction unreachable until
    // the visitor has scrolled all the way down into Owned. Scheduled from
    // here it landed ~10s in, on the settled hero, stacking with the shader
    // warm slices into the one stall Hannah kept seeing. First input is the
    // earliest moment the press can even start approaching; the idle
    // scheduler then finds a quiet beat (a scroll rest) long before Owned,
    // and remix() still bakes inline if the visitor somehow outruns it.
    const armPrepare = () => {
      for (const t of ['wheel', 'touchmove', 'keydown']) removeEventListener(t, armPrepare, true);
      schedulePrepare();
    };
    for (const t of ['wheel', 'touchmove', 'keydown']) addEventListener(t, armPrepare, { capture: true, passive: true });
    return true;
  }).catch((e) => {
    console.warn('[owned] test photos unavailable — staying procedural:', e.message);
    return false;
  });

  /* ---------------- state + frame update ---------------- */
  let hoverIdx = -999, selIdx = -999;
  let hoverAmt = 0, selAmt = 0;
  let anonTarget = 0, photoTarget = 0;
  let wave = null;
  let fade = 0;

  /* ---------------- the remix swap ----------------
     One clock (uSwap 0 -> 1) opened at a different moment per node by aSwapD.
     While it runs, uMap*2 hold the incoming arrangement; when it lands, the
     incoming becomes current, uSwap drops back to 0 and the retired atlases
     are released. Nothing here touches placement, size, strands or camera —
     the field is exactly the field it was, wearing different faces. */
  const SWAP_MS = 1250;
  const SWAP_MS_REDUCED = 320;
  const SWAP_SPAN = 0.34;          // each node's own crossfade, as a fraction
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let variant = 0;
  let pending = null;              // { v, bust, photo } — warmed ahead of the press
  let prepareTimer = null;
  let swap = null;                 // { t, dur }

  /** Bake the arrangement after the current one. Called on an idle beat after
   *  the photos land and again after every completed swap, so a press is never
   *  waiting on two canvas atlases; called inline from remix() only if the
   *  visitor got there first. */
  function prepareNext() {
    const v = variant + 1;
    if (pending && pending.v === v && (!photoSet || pending.photo)) return;
    if (pending) { retire(pending.bust); retire(pending.photo); }
    pending = { v, bust: bakeBusts(v), photo: bakePhotos(v) };
  }
  function schedulePrepare() {
    if (prepareTimer) return;
    const run = () => { prepareTimer = null; prepareNext(); };
    prepareTimer = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(run, { timeout: 1500 })
      : setTimeout(run, 400);
  }

  /** Release a canvas texture, unless it is still wired to something. The two
   *  build-time atlases are never released: atlasA is arrangement 0's busts and
   *  is also uMapP's stand-in until the photos land, and atlasB is the
   *  anonymous glyph sheet, which a remix has no business touching. */
  function retire(tex) {
    if (!tex || tex === atlasA || tex === atlasB) return;
    const u = portraitMat.uniforms;
    if (tex === u.uMapA.value || tex === u.uMapP.value
      || tex === u.uMapA2.value || tex === u.uMapP2.value) return;
    tex.dispose();
  }

  /** The incoming arrangement becomes the resting one. */
  function promoteSwap() {
    const u = portraitMat.uniforms;
    // NAMES CHANGE HERE, not when the incoming atlas was baked. prepareNext()
    // bakes the next arrangement minutes ahead, while the visitor is still
    // looking at the current one — reseating on bake would rename sixteen
    // people under faces that have not turned over yet, and a popover opened
    // in that window would caption the wrong person. The swap wave is the
    // moment the field genuinely becomes the new cast, so it is the moment the
    // rows do too.
    seatPeople(dealFor(variant));
    const oldBust = u.uMapA.value, oldPhoto = u.uMapP.value;
    u.uMapA.value = u.uMapA2.value;
    u.uMapP.value = u.uMapP2.value;
    u.uSwap.value = 0;
    u.uSwapFlare.value = 0;    // back to an exactly-unlit resting field
    swap = null;
    if (oldBust !== u.uMapA.value) retire(oldBust);
    if (oldPhoto !== u.uMapP.value) retire(oldPhoto);
    schedulePrepare();
  }

  // HELD STILL (2026-08-11, Hannah: the node dots must not pulse): the glow
  // points (cores + halos — the per-face ember DOTS) left timeMats. Their
  // flick is frozen at its own t = 0 phase in the shader (see makeGlowPoints),
  // so no clock reaches them any more; they still answer the remix wave and
  // hover, which are events, not cycles. The faces, rims and strands keep
  // their living light — the life stays in the surround, the marker holds.
  const timeMats = [portraitMat, rimMat, nodeStrands.mat];
  const waveMats = [portraitMat, rimMat, cores.mat, halos.mat, nodeStrands.mat];   // every node layer answers the wave

  const api = {
    group, nodes,
    photosReady,
    get photosAvailable() { return photosAvailable; },
    counts: {
      nodeCount: NODE_COUNT,
      routable: C_COUNT,
      planes: portraits.planes,
      strandVerts: nodeStrands.verts,
      rimVerts: rimFibres.verts,
      strandCurves: baked ? baked.portraits.strandCurves : nodeStrandSpecs.length,
      atlasPx: `${atlasA.image.width}x${atlasA.image.height} ×2 + ${atlasB.image.width}x${atlasB.image.height}`,
    },
    // The bake recording site (owned/index.js) reads these AFTER assignOwners
    // so the substrate's aOwner is final. Keys match baked.js geometry() keys;
    // the payload is the runtime-read node data the baked path rebuilds
    // (content round-trips as its id and is re-resolved against `contributors`).
    geometries: {
      planes: portraits.geo,
      rim: rimFibres.geo,
      cores: cores.geo,
      halos: halos.geo,
      strands: nodeStrands.geo,
    },
    bakePayload: {
      portraits: {
        nodeIds: nodes.map(n => n.id),
        nodeRoutable: nodes.map(n => n.routable),
        nodeContentKeys: nodes.map(n => (n.content ? n.content.id : null)),
        nodePos: nodes.flatMap(n => [n.pos.x, n.pos.y, n.pos.z]),
        nodeSize: nodes.map(n => n.size),
        nodeAnchors: nodes.map(n => n.anchors.map(a => [a.x, a.y, a.z])),
        swapMaxR,
        strandCurves: nodeStrandSpecs.length,
      },
    },

    indexOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.i : -1;
    },
    worldOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.pos.clone() : null;
    },
    /** World-space radius of the DRAWN face — the ember ring, not the quad.
     *  The quad's half-extent is `size`; the atlas draws its disc at 0.36 of
     *  the cell, i.e. 0.72 of the half-extent, and the shader's rim ring sits
     *  at the same 0.72. 0.80 takes in the ring itself and the fray just
     *  outside it. ui.js turns this into the chip's hit radius, which is the
     *  whole point: the thing you can hover is the thing you can see. */
    radiusOf(id) {
      const nd = nodes.find(n => n.id === id);
      return nd ? nd.size * 0.80 : 0;
    },
    /** QA: routable nodes that frame at the rest pose (the reachability audit). */
    restVisible() {
      return nodes.filter(n => n.routable && restOk(n)).map(n => n.id);
    },

    setHover(idx) {
      if (idx === hoverIdx) return;
      hoverIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    setSelected(idx) {
      if (idx === selIdx) return;
      selIdx = idx;
      if (idx >= 0) nodeStrands.driver.fire();
    },
    // mode: 'procedural' | 'photo' | 'anonymous'
    setMode(m) {
      photoTarget = m === 'photo' ? 1 : 0;
      anonTarget = m === 'anonymous' ? 1 : 0;
    },
    get mode() {
      return anonTarget ? 'anonymous' : (photoTarget ? 'photo' : 'procedural');
    },
    /** OW-4.4 consent gate: when on, any contributor without consent:true
     *  renders the anonymous glyph regardless of the global mode. With the
     *  current all-placeholder content this blanks every real image — which
     *  is exactly the rule. */
    setConsentEnforced(on) {
      const attr = portraits.geo.attributes.aAnonF;
      nodes.forEach((nd, i) => {
        const v = on && nd.content.consent !== true ? 1 : 0;
        for (let k = 0; k < 4; k++) attr.setX(i * 4 + k, v);
      });
      attr.needsUpdate = true;
    },
    // pod-hover responses (OW-3): an expanding spherical wave in WORLD space.
    wavePulse(center, { speed = 3.6, width = 2.8, maxR = 30, amp = 1 } = {}) {
      wave = { c: center.clone(), r: -width * 0.6, speed, width, maxR, amp };
    },

    /** REMIX: re-deal the field's faces (Hannah, 2026-08-07).
     *
     *  Returns the shape the caller needs to answer in the scene and in the
     *  DOM — { arrangement, ms, epicentre, maxR, speed } — or null if a swap
     *  is already running. `speed` is the world-units/sec a wave must travel
     *  to keep pace with the node order, so the strand/rim/halo response the
     *  chapter fires arrives at each face as that face turns over.
     *
     *  Under prefers-reduced-motion the span opens to 1: every node's window
     *  is the whole clock, so the field cross-fades as one over a third of a
     *  second, with the per-node ember flare off. Same start state, same end
     *  state, no travelling motion. */
    remix() {
      if (swap) return null;
      const reduced = !!reduceMotion.matches;
      if (!pending || pending.v !== variant + 1 || (photoSet && !pending.photo)) {
        if (prepareTimer) {
          if (typeof cancelIdleCallback === 'function') cancelIdleCallback(prepareTimer);
          else clearTimeout(prepareTimer);
          prepareTimer = null;
        }
        prepareNext();
      }
      const u = portraitMat.uniforms;
      u.uMapA2.value = pending.bust;
      // With no photo set the material's two channels are the same sheet, the
      // way they are at boot before the photos land — so a procedural-only
      // build still genuinely remixes (different busts) instead of no-oping.
      u.uMapP2.value = pending.photo || pending.bust;
      u.uSwapSpan.value = reduced ? 1 : SWAP_SPAN;
      u.uSwapFlare.value = reduced ? 0 : 1;
      u.uSwap.value = 0;
      variant = pending.v;
      pending = null;
      const dur = (reduced ? SWAP_MS_REDUCED : SWAP_MS) / 1000;
      swap = { t: 0, dur };
      return {
        arrangement: variant,
        ms: Math.round(dur * 1000),
        epicentre: swapEpicentre.clone(),
        maxR: swapMaxR,
        // the wave has to cross the field in the stretch of the clock the node
        // order actually occupies (1 - span), or it outruns its own faces
        speed: swapMaxR / Math.max(0.12, dur * (reduced ? 1 : 1 - SWAP_SPAN)),
      };
    },

    /** Advance the swap clock. Deliberately NOT inside update(): the chapter
     *  stops calling update the moment the group goes invisible, and a visitor
     *  who presses Remix and immediately scrolls out would otherwise come back
     *  to a field frozen half-way between two arrangements. Called from the
     *  chapter animator ahead of its own visibility gate. */
    tickSwap(dt) {
      if (!swap) return;
      swap.t += dt;
      const f = swap.t / swap.dur;
      portraitMat.uniforms.uSwap.value = f < 1 ? f : 1;
      if (f >= 1) promoteSwap();
    },
    get swapping() { return !!swap; },
    get arrangement() { return variant; },
    /** Jump the eased UI channels to their targets — the dt = 0 path (deep
     *  links, hidden-tab and frozen capture), reached through the chapter's
     *  snap().
     *
     *  uPhoto is DELIBERATELY not snapped. Under freezeTime(0) the photo
     *  crossfade never advances, so the frozen captures render the PROCEDURAL
     *  painted busts. That is kept on purpose — but the ORIGINAL reason for it
     *  expired on 2026-08-16 and the real one is different, so it is written
     *  out here rather than left to be re-derived.
     *
     *  It used to be a consent argument: the only images were stock faces that
     *  must never ship, and static/captures/*.png is committed, so snapping
     *  would have baked strangers' likenesses into checked-in files. The
     *  portraits are now contributors' own published avatars and that argument
     *  is gone.
     *
     *  What replaces it is DETERMINISM. The gate's whole value is that a
     *  frozen pose renders byte-identically every run; the photo path depends
     *  on a 384 KB network fetch, a canvas bake and a timed crossfade, none of
     *  which are frame-deterministic, and the field now deals a RANDOM sixteen
     *  out of 120 people per load, which is not deterministic by design. A
     *  golden that included any of that would flake for reasons unrelated to
     *  the scene, and the first response to a flaky gate is to stop trusting
     *  it. The busts are a stable baseline that still exercises the geometry,
     *  the lighting and the substrate.
     *
     *  THE COST, stated plainly: the ten goldens do not cover the photo
     *  pipeline. Changes to the grade, the atlas bake or the deal have to be
     *  checked by eye on the live page. */
    snap() {
      const u = portraitMat.uniforms;
      u.uAnon.value = anonTarget;
      hoverAmt = hoverIdx >= 0 ? 1 : 0;
      selAmt = selIdx >= 0 ? 1 : 0;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
    },
    setFade(a) {
      fade = a;
      portraitMat.uniforms.uOpacity.value = a;
      rimMat.uniforms.uFade.value = a;
      cores.mat.uniforms.uFade.value = a;
      halos.mat.uniforms.uFade.value = a;
      nodeStrands.mat.uniforms.uFade.value = a;
    },
    get hoverIdx() { return hoverIdx; },
    get selIdx() { return selIdx; },
    // The node the field is currently answering, and how strongly — the same
    // pair `update()` feeds its own layers, exposed so the substrate's local
    // strand lighting can answer the identical node at the identical strength
    // (chapters/owned/index.js).
    get activeIdx() { return hoverIdx >= 0 ? hoverIdx : selIdx; },
    get activeAmt() { return Math.max(hoverAmt, selAmt * 0.85); },

    update(dt, time) {
      if (fade <= 0 && !wave) return;
      for (const m of timeMats) m.uniforms.uTime.value = time;

      // colony wave: expand, fade out over the last quarter, then rest
      if (wave) {
        wave.r += dt * wave.speed;
        const fadeW = 1 - clamp((wave.r / wave.maxR - 0.72) / 0.28, 0, 1);
        const amt = wave.amp * fadeW;
        for (const m of waveMats) {
          m.uniforms.uWaveC.value.copy(wave.c);
          m.uniforms.uWaveR.value = wave.r;
          m.uniforms.uWaveW.value = wave.width;
          m.uniforms.uWaveAmt.value = amt;
        }
        if (wave.r > wave.maxR) {
          wave = null;
          for (const m of waveMats) m.uniforms.uWaveAmt.value = 0;
        }
      }

      hoverAmt += ((hoverIdx >= 0 ? 1 : 0) - hoverAmt) * Math.min(dt * 5.0, 1);
      selAmt += ((selIdx >= 0 ? 1 : 0) - selAmt) * Math.min(dt * 3.2, 1);
      const u = portraitMat.uniforms;
      u.uHoverIdx.value = hoverIdx; u.uHoverAmt.value = hoverAmt;
      u.uSelIdx.value = selIdx; u.uSelAmt.value = selAmt;
      u.uAnon.value += (anonTarget - u.uAnon.value) * Math.min(dt * 2.6, 1);
      u.uPhoto.value += (photoTarget - u.uPhoto.value) * Math.min(dt * 2.6, 1);
      rimMat.uniforms.uHoverIdx.value = hoverIdx;
      rimMat.uniforms.uHoverAmt.value = hoverAmt;
      rimMat.uniforms.uSelIdx.value = selIdx;
      rimMat.uniforms.uSelAmt.value = selAmt;
      const activeIdx = hoverIdx >= 0 ? hoverIdx : selIdx;
      const activeAmt = Math.max(hoverAmt, selAmt * 0.85);
      cores.mat.uniforms.uHoverIdx.value = activeIdx;
      cores.mat.uniforms.uHoverAmt.value = activeAmt;
      halos.mat.uniforms.uHoverIdx.value = activeIdx;
      halos.mat.uniforms.uHoverAmt.value = activeAmt;

      // only the LOCAL strands of the active node illuminate
      nodeStrands.driver.update(dt);
      nodeStrands.mat.uniforms.uActive.value = activeIdx;
      nodeStrands.mat.uniforms.uActiveAmt.value = Math.max(hoverAmt, selAmt * 0.9);
      nodeStrands.mat.uniforms.uPulse.value = nodeStrands.driver.value;
      nodeStrands.mat.uniforms.uPulseOn.value = nodeStrands.driver.active ? 1 : 0;
    },
  };
  return api;
}
