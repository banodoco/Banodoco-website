// journey-v6 — OWNED contributor portrait field: the CANVAS PAINTING LIBRARY.
//
// Extracted verbatim from journey/chapters/owned/portraits.js:45-632 by order
// A01a-1 of the elegance program (evidence:
// docs/code-health/evidence/2026-08-21-elegance-run-01/a01a-1/). Behaviour
// preserving: the block below is byte-identical to the lines it came from.
//
// WHY THIS IS ITS OWN FILE — and it is not primarily about line count.
// A01's decision.md §2 Seam 1 rejects the "these helpers are only used once"
// objection with a hard mechanical reason: the next extraction, A01a-2's
// portrait-remix.js, takes three of the seven paint call sites with it
// (portraits.js:1828 bakeBusts, :1831 bakePhotos, :1850 bakePhotosHover). If
// the painters stayed in portraits.js, portrait-remix.js would import them
// FROM portraits.js while portraits.js imported createPortraitRemix BACK from
// portrait-remix.js — a module cycle, which `npm run cycles`
// (tools/check-cycles.mjs, run inside `npm run check`) makes a hard failure.
// A01a-1 is therefore a precondition of A01a-2, not an independent tidy-up.
//
// WHAT IS PUBLIC. Five names: the two frozen grade records and the three
// painters that exist to be makePortraitAtlas()'s `draw` argument. The other
// ten declarations here — the three colour ramps, lerpC, rampPick, css,
// scaleC, drawEmbedEdge, grainAndGrade, softMask — have zero references
// outside this block and stay module-private.
//
// SEEDED RANDOMNESS: NOTHING CROSSES THIS SEAM. Each painter opens its OWN
// H.rng stream from a scalar its caller hands it (drawPhotoCell :337 in the
// original, drawBust :424, drawAnonGlyph :572, all preserved below), and
// drawEmbedEdge / grainAndGrade / softMask take that stream as a PARAMETER
// rather than opening one. Cell order is fixed by makePortraitAtlas's index
// loop in portrait-atlas.js, which was already a separate module. There is no
// construction order here to obscure: these are pure functions of
// (ctx, ox, oy, CELL, spec).
//
// COVERAGE. drawBust and drawAnonGlyph are covered byte-for-byte by the D16
// golden captures (snap() deliberately does not snap uPhoto, so every frozen
// capture renders the procedural busts). drawPhotoCell is covered by no golden
// at all — portraits.js says so itself — so tools/test-portrait-paint.mjs pins
// all three painters against digests captured BEFORE this move, out of commit
// 6967a36ab309af7057336be64d6f0f9dd3c41b21, and written there as literals.
import * as THREE from 'three';
import * as H from '../../lib/helpers.js';

// DELIBERATE TWO-LINE DUPLICATION — a decision, not a defect. TAU and clamp
// are declared at portraits.js:42-43, OUTSIDE the :45-632 range this file was
// lifted from, and both are used on BOTH sides of the seam: TAU at 28 sites in
// the painting code against 2 in the factory (portraits.js:1064, :1615), clamp
// at 1 against 4 (:926, :927, :1472, :2252). Minting a third shared-leaf
// module for two one-line aliases would cost more than it saves, and importing
// them from portraits.js would recreate the very cycle this file exists to
// prevent. Recorded in A01's decision.md §3 and in the elegance ledger's A01
// acceptance entry; tools/test-portrait-paint.mjs pins both declarations on
// both sides so a later reader who "dedups" one gets a red check pointing here.
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
function grainAndGrade(g, ox, oy, CELL, cx, cy, R, r, unify = 0.33, veil = 1) {
  // amber unify — everything drawn so far pulls toward the palette
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(196,124,48,${unify})`;
  g.fillRect(ox, oy, CELL, CELL);
  // upper-left key bloom + speckle, scaled by `veil` — the hover cells bake
  // these at 0 (HOVER_GRADE.veil): gauze over a picture reads as blur, and
  // the hover cell's whole job is the picture. Busts/glyphs keep the default.
  if (veil > 0) {
    const bloom = g.createRadialGradient(cx - R * 0.55, cy - R * 0.65, R * 0.05, cx - R * 0.55, cy - R * 0.65, R * 1.4);
    bloom.addColorStop(0, `rgba(255,200,140,${(0.13 * veil).toFixed(3)})`);
    bloom.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = bloom;
    g.fillRect(ox, oy, CELL, CELL);
  }
  // photographic speckle
  for (let k = 0; k < 340 * veil; k++) {
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
  /* THE HOVER GRADE, third attempt (2026-08-18, Hannah: "when I hover over an
     individual I want it to GREATLY reduce the sepia effect on their
     particular image so it shows its proper colours" — the same ask as
     2026-08-14 and 2026-08-16, still not landing).

     WHY THE FIRST TWO ATTEMPTS CANCELLED EACH OTHER, measured this time
     rather than reasoned. A CDP probe (rest vs held hover, same node, each
     term toggled in isolation, Lab cast = luminance-weighted mean chroma over
     the face) on a contributor whose real avatar is neutral grey (cast 0.8):

       rest                              cast 35.4
       shipped hover (divide + expand)   cast 45.5   MORE sepia than rest
       divide alone                      cast 25.1   the only state below rest
       chroma expansion alone            cast 48.1   the saboteur

     The 2026-08-14 divide works exactly as designed. But the 2026-08-16
     chroma expansion pivots each texel about its OWN grey — and after the
     divide the face still carries the unify wash, the warm-black lift, the
     burn residue and the baked ember arcs, all amber. Expanding chroma about
     grey doubles that shared amber remainder along with the picture's own
     colour: the term amplifies precisely the cast the divide just removed,
     and nets the hover MORE sepia than doing nothing. Two correct-sounding
     terms, opposite signs, and the sum was the bug Hannah kept seeing.

     WHAT REPLACES BOTH: stop inverting the bake and stop approximating.
     Every photo arrangement now bakes TWO cells from the same source tile —
     the resting grade above, and a HOVER_GRADE cell that simply never applies
     the colour-collapsing steps (no desat fill, amber multiply at a whisper,
     no unify wash, burn fully hue-muted, lift and key light halved). The
     shader crossfades the sampled texel to the hover cell by `vH`, so a
     hovered face shows the photograph's actual colours because those are the
     bytes in the texture — nothing left to invert, nothing left to expand.
     `hoverDeSepia` survives as the strength of that crossfade.

     PHOTOS ONLY, unchanged by construction: the crossfade is applied to `tP`
     before the bust/photo/glyph mix, `vH` is 0 at rest, and the frozen
     goldens render the procedural busts (uPhoto never advances under
     freezeTime — see snap()). */
  hoverDeSepia: 1.0,
  /* The `pg` terms in the fragment shader: pull back the amber the HOVER
     RESPONSE itself adds over a photographed face — the core lamp used to go
     0.07 -> 0.31 and the image term 1.12 -> 1.42 on hover, before UnrealBloom
     got to work on the result. Both are multiplied by `uPhoto * vH`, so the
     resting frame, the frozen goldens and the procedural busts are untouched.
     1 = that term's hover growth is removed entirely on a photo. imgMute went
     0.70 -> 1.0 with the atlas crossfade (2026-08-18): the hover cell is
     already brighter than the resting one (no amber multiply darkening it),
     and the probe's no-bloom frame showed the leftover x1.21 growth was
     feeding the bloom wash that makes a hovered face read as an amber orb.
     The ember RIM still answers 0.20 -> 1.00, untouched on purpose — it sits
     at the disc's edge, not on the person, and it is the "lit node in a
     network" contract 45f600b's F.3 refused to trade away. */
  hoverCoreMute: 1.0,
  hoverImgMute: 1.0,
  /* SOLIDITY (2026-08-18, Hannah: hovered faces "still seem blurred and
     distorted, maybe because they are transparent"). She is right about the
     cause: the portrait plane blends ADDITIVELY, so a face can only pour
     light on top of the cords, strands and halos behind it — every one of
     them keeps shining through the person, and no colour fix can make an
     image read as an image while the background adds through it.

     The material therefore blends premultiplied (ONE, ONE_MINUS_SRC_ALPHA),
     which is bit-identical to the old additive sum wherever the written
     alpha is 0 — out = rgb*a + dst — and becomes occlusion where it is not.
     This term is that alpha: how completely a hovered photo face covers
     what is behind it. It rides `uPhoto * vH * mask`, so the resting frame,
     the busts, the glyphs and the frozen goldens all still write alpha 0 and
     remain additive by construction. 1 = the disc fully owns its pixels at
     full hover. */
  hoverSolid: 1.0,
});

/* The bake knobs for the hover cell — same pipeline, run gently. Amber stays
   faintly on (0.14) so a hovered face is still lit by the room it hangs in
   rather than cut out of it; the burn keeps its full DARKNESS (vignette) with
   the hue rotation taken out entirely; lift and face key halve rather than
   vanish for the same belonging reason. desat/unify are pure colour-collapse
   with no compositional job, so they go to zero outright. */
const HOVER_GRADE = Object.freeze({
  desat: 0,
  /* 0.14 -> 0 (2026-08-18 round 4, "still quite sepia'd"): the whisper of
     palette tie was still a visible warm film over neutral avatars. The
     hovered face's belonging is carried by the ember ring, the burn's
     vignette and the mask feather — the picture itself now goes untinted. */
  amber: 0,
  unify: 0,
  burnMute: 1.0,
  lift: 0.2,
  /* key and veil go to ZERO here where the resting grade keeps them: the face
     key light, the upper-left key-bloom wash and the speckle are atmosphere
     laid OVER the picture, and the blur probe showed the hovered face's
     problem is precisely veiling — a real image under gauze reads as blur.
     The ring, the burn's darkness and the mask feather still tie the disc
     into the field. */
  key: 0,
  veil: 0,
  /* 0.76 -> 0.92: the hovered disc keeps only a slim feather. The rest
     cell's wide fade melts the disc into the substrate — right for a resting
     node, but under the hover ring's bloom it read as a blurred rim on the
     photograph itself. A near-hard edge is most of perceived sharpness. */
  feather: 0.92,
  /* Luma parity with the resting cell, and it is load-bearing: the resting
     amber multiply darkens (its factor's Rec.709 luma is 0.786 at alpha
     0.64; this cell no longer multiplies at all), so an unlevelled hover
     cell runs ~27% brighter than the one it replaces — and UnrealBloom turns
     exactly that surplus into the amber orb the first two attempts were
     blamed for (the probe's no-bloom frame showed a legible face under the
     wash). The old shader inverse pinned luma per-texel for the same reason.
     Equal to the resting multiply's own luma factor now that amber is 0. */
  level: 0.786,
});

// Real-photo treatment (assets/contributor-portraits — contributors' own
// avatars out of Banodoco's published sprite; this is the SHIPPED path).
// Spike-calibrated pipeline: desaturation -> amber multiply -> warm-black
// lift -> edge burn -> unify/grain -> mask feather 0.76 -> edge. The four
// grade strengths live in PHOTO_GRADE above.
function drawPhotoCell(g, ox, oy, CELL, spec) {
  const { img, mirror, exposure, warmth, seed } = spec;
  // Which strength set to run — the resting grade, or the gentle HOVER_GRADE
  // when this cell is being baked for the hover atlas (photoSpecs threads it).
  const G = spec.grade || PHOTO_GRADE;
  const liftK = G.lift ?? 1, keyK = G.key ?? 1;
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
  g.fillStyle = `rgba(128,128,128,${G.desat})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 2. amber multiply — the main push into the palette
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(226,${(150 + warmth * 22) | 0},${(86 + warmth * 20) | 0},${G.amber})`;
  g.fillRect(ox, oy, CELL, CELL);
  // 3. deterministic exposure trim (density variation), folded together with
  // the hover grade's luma-parity level (1 for the resting grade)
  const trim = (exposure < 1 ? exposure : 1) * (G.level ?? 1);
  if (trim < 1) {
    const k = (trim * 255) | 0;
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(ox, oy, CELL, CELL);
  }
  // 4. warm-black lift — ties the photo's blacks to the field's near-black
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = `rgba(58,30,12,${((exposure > 1 ? 0.26 : 0.16) * liftK).toFixed(3)})`;
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
    const k = G.burnMute;
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
  faceKey.addColorStop(0, `rgba(255,196,130,${(0.16 * keyK).toFixed(3)})`);
  faceKey.addColorStop(1, 'rgba(255,196,130,0)');
  g.fillStyle = faceKey;
  g.fillRect(ox, oy, CELL, CELL);
  g.globalCompositeOperation = 'source-over';
  g.restore();   // circle clip off

  grainAndGrade(g, ox, oy, CELL, cx, cy, R, r, G.unify, G.veil ?? 1);
  // Wider feather than the busts at rest; the hover cell tightens it (G):
  // the disc's own edge is the largest edge in the stimulus, and a 12%-wide
  // fade under the ring's bloom is most of what still read as "blurry".
  softMask(g, ox, oy, CELL, cx, cy, R, G.feather ?? 0.76);
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

export { PHOTO_GRADE, HOVER_GRADE, drawPhotoCell, drawBust, drawAnonGlyph };
