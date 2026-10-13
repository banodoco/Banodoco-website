// journey-v6 — FINAL epilogue: PER-BODY VARIATION.
// (journey-v6-plan/18-one-species.md, "Individuals, not copies" — 2026-08-05)
//
// THE COMPLAINT, AND WHY IT WAS BUILT IN
// --------------------------------------
// Hannah, on the shipped field: "the mushrooms at the end seem too similar to
// one another... make them each their own unique thing and make the whole
// piece work cohesively."
//
// She is describing the exact price of the round-3 step-back. The near field
// members are LITERAL CLONES — the hero organism's own BufferGeometry objects
// re-drawn under another matrix. That is why they finally read as the right
// creature (rounds 1 and 2 rebuilt the silhouette and were rejected twice),
// and it is why they are all one shape: they ARE the same vertices, differing
// only by a uniform scale, a yaw and a few degrees of lean.
//
// So variation cannot come from the build. The vertices are shared and must
// stay shared. It has to be a DEFORMATION — one smooth map from the body
// frame to itself, seeded per individual, evaluated in the vertex shader for
// the clones and on the CPU for the batched species bodies.
//
// THE ONE LAW THIS FILE EXISTS TO KEEP
// ------------------------------------
// **Every layer of a body sees the same map.** A mushroom here is fifteen
// drawables — five dense-line layers, five point layers, the overlay net and
// four opaque occlusion shells — and they are separate draw calls with
// separate materials. Deform the lattice and not the shell and the body's
// outline stops agreeing with its solid interior: a lit rim floating off a
// black cap. So the map is defined ONCE, here, in ONE frame (the body frame:
// origin at the soil point, +y up, hero units — the frame the root node's
// scale converts to world), and every consumer applies THAT function to its
// own vertices. The GLSL and the JS below are line-for-line the same
// function. The map keeps the two fixed points the whole design rests on —
// the soil seat and the rim plane — for every individual, to 1e-10.
//
// WHAT IT MUST NOT BECOME
// -----------------------
// A menagerie. These are one species at different ages and in different
// weather, not seven kinds of mushroom. Every axis below is a modest,
// smoothly-varying scalar on a form that is otherwise the hero's, and the
// silhouette invariant of doc 18 §1 survives in the only sense that still
// means anything once bodies are allowed to differ: the profile LAW is
// unchanged (one cap dome curve, one stem taper, one rim line), and what
// varies is the proportions that law is evaluated at.
//
// FRAMES AND UNITS. The map is written in HERO UNITS — the same numbers
// organism.js §4 uses (CAP_Y 3.15, CAP_R 2.35, CAP_H 1.22, STEM_TOP 3.9).
// A clone's leaf geometry is already in those units (its root node carries
// the only scale), so the shader applies the map directly. A species body's
// emitted points have already been multiplied by `scale`, so ring.js divides
// out, maps, and multiplies back. Same function, same numbers, both bands.

import { makeRng, CAP_Y, CAP_R, CAP_H } from '../../anatomy.js';

const TAU = Math.PI * 2;

/* ================================================================== */
/* 1. THE AXES                                                         */
/* ================================================================== */
/**
 * Seven axes, chosen because they are what the eye actually sorts bodies by
 * at the Final rest, and because each one is expressible as a smooth map (a
 * build-time knob is not available to us — see the header).
 *
 * | axis        | uniform slot | range          | what it reads as          |
 * |-------------|--------------|----------------|---------------------------|
 * | capW        | A.x          | 0.84 .. 1.16   | broad parasol / tight bell |
 * | capH        | A.y          | 0.73 .. 1.27   | flat plate / high dome     |
 * | stemH       | A.z          | 0.84 .. 1.16   | squat / long-stalked       |
 * | stemW       | A.w          | 0.80 .. 1.20   | thick / slender stipe      |
 * | flare       | B.x          | 0.05 .. 0.29   | bulbous base / clean foot  |
 * | twist       | B.y          | -0.32 .. 0.32  | helical shear up the stalk |
 * | rimAmp      | B.z          | 0.035 .. 0.105 | wavy margin, in plan       |
 * | rimDrop     | B.w          | 0.030 .. 0.110 | ...and in height           |
 * | crumpAmp    | D.x          | 0.055 .. 0.190 | the squiggles on the cap   |
 *
 * plus two integer harmonics: rimLobes 3..7 and crumpLobes 3..9, each with a
 * free phase. Low counts on purpose — a high-frequency ripple on a cap this
 * size reads as noise on the mesh rather than as the shape of the mushroom.
 *
 * capW and capH are ANTI-CORRELATED off one `broad` draw, and stemH/stemW off
 * one `lanky` draw. That correlation is the difference between variation and
 * noise: in a real colony a cap that spreads wide is also flatter, and a stalk
 * that runs tall runs thinner. Rolling the four independently produced tall
 * fat caps on tall fat stalks next to tiny thin ones, which is a menagerie.
 * A jitter term on the second of each pair keeps the correlation from reading
 * as a rule.
 *
 * `leanK` is not part of the map — it is a multiplier ring.js applies to the
 * member's existing whole-body lean, widening doc 18's deliberately-trimmed
 * band by ~x0.8..x1.6 (to about 9.5 deg worst case, against the 11 deg that
 * round's screenshots rejected for opening the rim ellipse into a saucer).
 */
export function bodyVariation(seed) {
  // Its OWN seeded stream (like scaleFor's ^0x9e37 and ring.js's sway ^0x51a7),
  // so adding these draws cannot shift a single value the placement, the
  // species build or the sway already draw from their own streams.
  const r = makeRng(seed ^ 0x2b1e);

  // one draw decides the whole cap's character; the second only softens it
  const broad = 2 * r() - 1;
  const capW = 1 + 0.160 * broad;
  const capH = 1 - 0.200 * broad + 0.070 * (2 * r() - 1);

  // and one decides the stalk's
  const lanky = 2 * r() - 1;
  const stemH = 1 + 0.160 * lanky;
  const stemW = 1 - 0.140 * lanky + 0.060 * (2 * r() - 1);

  // base flare: skewed low, so most bodies have a clean foot and a few sit on
  // a swollen one. A flat draw made every body look like it had a volva.
  const flare = 0.05 + 0.24 * Math.pow(r(), 1.4);

  // twist: the whole cap ends up rotated relative to the foot, and the stem's
  // lattice shears helically getting there. Doubles as a second "no two
  // present the same face" term on top of azFacing — that one turns the whole
  // rigid body, this one turns the head against its own stalk.
  const twist = 0.32 * (2 * r() - 1);

  // the rim: a low harmonic in plan (rimAmp, radial) and in height (rimDrop,
  // vertical) at the same lobe count and phase, so the margin scallops rather
  // than merely wobbling — one wave, seen two ways.
  const rimLobes = 3 + Math.floor(r() * 5);          // 3..7
  const rimAmp = 0.035 + 0.070 * r();                // fraction of radius
  const rimDrop = 0.030 + 0.080 * r();               // fraction of CAP_H
  const rimPhase = r() * TAU;

  // "the squiggles on the top of the cap": an angular ripple across the dome,
  // peaking mid-slope and vanishing at both the apex and the rim (where the
  // rim wave takes over). The hero's own capLump() already crumples the dome;
  // this gives each body its own count and phase of crumple.
  const crumpLobes = 3 + Math.floor(r() * 7);        // 3..9
  const crumpAmp = 0.055 + 0.135 * r();              // hero units
  const crumpPhase = r() * TAU;

  const leanK = 0.80 + 0.80 * r();

  return { capW, capH, stemH, stemW, flare, twist,
           rimLobes, rimAmp, rimDrop, rimPhase,
           crumpLobes, crumpAmp, crumpPhase, leanK };
}

/** The identity individual — every axis parked. Used by the guard path (if
 *  organism's shaders ever drift out from under the injection, the whole set
 *  falls back to this rather than deforming some layers and not others) and
 *  by the self test. */
export const IDENTITY = {
  capW: 1, capH: 1, stemH: 1, stemW: 1, flare: 0, twist: 0,
  rimLobes: 3, rimAmp: 0, rimDrop: 0, rimPhase: 0,
  crumpLobes: 4, crumpAmp: 0, crumpPhase: 0, leanK: 1,
};

/* ================================================================== */
/* 2. THE MAP                                                          */
/* ================================================================== */
/*
   MASKS — the part that took the thinking.

   The obvious formulation, "stretch the stem below y=CAP_Y and scale the dome
   above it", SHEARS THE CAP. Stem and cap overlap heavily in height: the stem
   runs to STEM_TOP 3.9 (buried in the cap on purpose, so the joint is not
   butted) while the cap's margin droops down past 2.9. Any mask that is a
   function of HEIGHT alone therefore gives the drooping margin a different
   map from the rim 0.25 units above it, and pinches the cap edge. Caught on
   paper, before it was ever drawn.

   So the two masks are geometric, not vertical:

     mr  RADIAL, for the radial factor.  smoothstep(0.55, 1.20, r).
         The stem never exceeds r ~ 0.56; the cap's own inner region is the
         only thing in the blend band, and a radial factor is a no-op near
         the axis anyway, so a purely radial mask is exactly right here: the
         margin at (r 2.3, y 2.9) and the rim at (r 2.35, y 3.15) get the
         SAME factor, which is what stops the pinch.

     mv  RADIAL **or** HIGH, for the vertical map.  max(mr', smoothstep(3.55,
         3.95, y)). The second term exists for the dome's centre, which is at
         r = 0 and would otherwise be handed the stalk's map and lose the cap
         height axis entirely. Above 3.95 both terms saturate, so the stem's
         buried top and the dome's apex share one map and the stalk can never
         grow out through the cap.

   PINNING. At y = CAP_Y the stem map (y*stemH) and the cap map (CAP_Y*stemH +
   (y-CAP_Y)*capH) are EQUAL by construction, whatever the two factors are. So
   the rim plane is a fixed point of the blend and no mask value can move it.
   At y = 0 the map is the identity, so every body stays seated on its soil
   point and the ground-merge stubs still meet the stipe.
*/

const RIM_INV = 1 / CAP_R;
const CAPH_INV = 1 / CAP_H;

/** GLSL half of the map. Byte-parallel with varyPoint() below — if you edit
 *  one, edit the other, and selfTest() will tell you if you didn't.
 *  Declares its own uniforms, so injecting it is a single string splice. */
export const VARY_GLSL = /* glsl */ `
  uniform vec4 uVarA;   // capW, capH, stemH, stemW
  uniform vec4 uVarB;   // flare, twist, rimAmp, rimDrop
  uniform vec4 uVarC;   // rimLobes, rimPhase, crumpLobes, crumpPhase
  uniform vec4 uVarD;   // crumpAmp, -, -, -
  uniform mat4 uVarM;   // this layer's geometry frame -> the BODY frame
  uniform mat4 uVarMI;  // and back
  vec3 varyBody(vec3 p) {
    float r = length(p.xz);
    float a = atan(p.z, p.x + 1e-9);
    float mr = smoothstep(0.55, 1.20, r);
    float mv = max(mr, smoothstep(3.55, 3.95, p.y));
    // vertical: stalk stretch below, dome scale above, pinned at the rim
    float yS = p.y * uVarA.z;
    float yC = ${CAP_Y.toFixed(4)} * uVarA.z + (p.y - ${CAP_Y.toFixed(4)}) * uVarA.y;
    float y2 = mix(yS, yC, mv);
    // radial: stipe thickness + base flare below, cap width above
    float rS = uVarA.w + uVarB.x * exp(-p.y * 1.9);
    float rk = mix(rS, uVarA.x, mr);
    // the rim wave — one harmonic, radial and vertical together, windowed on
    // to the outer cap so the top and the underside scallop as one edge
    float edge = smoothstep(0.35, 1.00, r * ${RIM_INV.toFixed(6)});
    float wav = sin(uVarC.x * a + uVarC.y);
    float r2 = r * rk * (1.0 + uVarB.z * wav * edge);
    y2 += ${CAP_H.toFixed(4)} * uVarB.w * wav * edge;
    // the squiggles: an angular ripple over the dome, zero at apex and rim
    float u = clamp((p.y - ${CAP_Y.toFixed(4)}) * ${CAPH_INV.toFixed(6)}, 0.0, 1.0);
    y2 += uVarD.x * sin(uVarC.z * a + uVarC.w) * sin(3.14159265 * u);
    // and a gentle twist up the stalk, carried rigidly into the cap
    float t = clamp(p.y * ${(1 / CAP_Y).toFixed(6)}, 0.0, 1.0);
    float aa = a + uVarB.y * t * t * (3.0 - 2.0 * t);
    return vec3(r2 * cos(aa), y2, r2 * sin(aa));
  }
  // THE FRAME HOP, and why it is not optional. The clone walk copies the
  // hero's spine verbatim, and that spine is NOT flat: the mushroom group
  // carries the
  // authored cap tilt and a throat offset, so a cap leaf's vertices live in a
  // tilted, translated frame while a stem leaf's live in the body frame. A map
  // applied to raw local coordinates would therefore mean two different things
  // on the two halves of one mushroom — the exact outline-vs-solid disagreement
  // this whole design exists to prevent. Each layer instead carries the exact
  // matrix from ITS geometry frame to the body frame, hops in, deforms, and
  // hops back. Identity for the stem side, the cap's own pose for the cap side.
  vec3 varyPt(vec3 p) {
    return (uVarMI * vec4(varyBody((uVarM * vec4(p, 1.0)).xyz), 1.0)).xyz;
  }
`;

const sstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** CPU half of the map — the species batch's path, and the reference the
 *  GLSL is tested against. Writes into `out` (a 3-array) and returns it. */
export function varyPoint(V, x, y, z, out) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x + 1e-9);
  const mr = sstep(0.55, 1.20, r);
  const mv = Math.max(mr, sstep(3.55, 3.95, y));
  const yS = y * V.stemH;
  const yC = CAP_Y * V.stemH + (y - CAP_Y) * V.capH;
  let y2 = yS + (yC - yS) * mv;
  const rS = V.stemW + V.flare * Math.exp(-y * 1.9);
  const rk = rS + (V.capW - rS) * mr;
  const edge = sstep(0.35, 1.00, r * RIM_INV);
  const wav = Math.sin(V.rimLobes * a + V.rimPhase);
  const r2 = r * rk * (1 + V.rimAmp * wav * edge);
  y2 += CAP_H * V.rimDrop * wav * edge;
  const u = Math.max(0, Math.min(1, (y - CAP_Y) * CAPH_INV));
  y2 += V.crumpAmp * Math.sin(V.crumpLobes * a + V.crumpPhase) * Math.sin(Math.PI * u);
  const t = Math.max(0, Math.min(1, y / CAP_Y));
  const aa = a + V.twist * t * t * (3 - 2 * t);
  out[0] = r2 * Math.cos(aa);
  out[1] = y2;
  out[2] = r2 * Math.sin(aa);
  return out;
}

/* ================================================================== */
/* 3. UNIFORMS + DERIVED EXTENTS                                       */
/* ================================================================== */
/** One body's uniform set. Created once per body and SHARED by every one of
 *  that body's materials — which is the mechanical guarantee behind the law
 *  in the header: fifteen drawables, one object, so a layer cannot drift out
 *  of agreement with its neighbours even for a frame. */
export function varyUniforms(V) {
  return {
    uVarA: { value: [V.capW, V.capH, V.stemH, V.stemW] },
    uVarB: { value: [V.flare, V.twist, V.rimAmp, V.rimDrop] },
    uVarC: { value: [V.rimLobes, V.rimPhase, V.crumpLobes, V.crumpPhase] },
    uVarD: { value: [V.crumpAmp, 0, 0, 0] },
  };
}

/** Widest the deformed cap reaches, as a factor on CAP_R — the pick proxy's
 *  radius and nothing else. Deliberately the WORST case (rim crest), so a
 *  cone always brackets the body it stands for. */
export const capRadiusK = (V) => V.capW * (1 + V.rimAmp);

/** Apex height as a factor on HERO_H (= CAP_Y + CAP_H): the stalk stretch
 *  carries the rim, the dome scale carries the rest. */
export const heightK = (V) => (CAP_Y * V.stemH + CAP_H * V.capH) / (CAP_Y + CAP_H);

/** Radius factor at the soil line — where the ground-merge stubs seat. */
export const baseRadiusK = (V) => V.stemW + V.flare;

