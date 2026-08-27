// journey-v6 — FINAL epilogue: THE ROOT CANOPY, its AUTHORING LAW.
//
// Split out of canopy.js by order H04 (2026-08-21). Nothing here is new and
// nothing here is different: every constant, every table and every pure
// function below is the byte-identical text canopy.js carried at
// 6967a36a, in the order it carried it.
//
// WHAT THIS FILE IS. The canopy has no material factory of its own — its two
// draws run on world.js's makeStrandMat/makePointsMat — so its RESOURCES are
// not shaders, they are NUMBERS: how bright a stroke of each tier is, how
// far above the soil every vertex sits, how much soil margin a long thing
// needs, and the rest camera all of that is composed against. Those numbers
// carry more argument than code (the two essays below are 123 of this file's
// lines and justify eleven constants), and they are read from three places:
// canopy.js's own strand and node emission, and canopy-routes.js's two
// authored passes.
//
// WHY IT IS A FILE AND NOT AN EXPORT OF canopy.js. canopy.js's export surface
// is exactly `createFinalCanopy` and the H-series contract freezes it (HB1),
// so a sibling cannot read the hierarchy off the facade. The law has to sit
// where both sides can import it, and this is that place.
//
// EVERYTHING HERE IS PURE. No closure captures, no module-level side effect
// beyond reading the chapter's own camera leg, and no THREE.

import { CAMERA } from './camera.js';

// The rest camera, read from the chapter's own leg (never mirrored — the
// declutter round's stale copy of these numbers was exactly this bug class).
export const REST_CAM = (() => {
  const k = CAMERA.keys.find(k => k.note === 'final-rest');
  return {
    x: k.pos.x, y: k.pos.y, z: k.pos.z,
    head: Math.atan2(k.tgt.z - k.pos.z, k.tgt.x - k.pos.x),
  };
})();

export const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const wrapPi = (d) => Math.atan2(Math.sin(d), Math.cos(d));

// THE CANOPY DOES NOT KINDLE ON uPull ANY MORE (2026-08-14). Every vertex is
// authored ALWAYS-LIT — world.js's own `aReveal < -0.5` escape hatch — and the
// whole network is gated instead by ONE camera-pure term, SURFACING, written
// on the two materials' own uOpacity by index.js. See §REVEAL below.
export const ALWAYS_LIT = -1;

// Distance luminance — ring.js's cloneLum device, re-banded for the floor.
// The canopy runs from the hero's own foot out to the hint band at 46 units,
// so it needs a longer ramp than a body does, and a deeper floor: a far
// strand is a suggestion of continuation, not a stroke.
export const lumOf = (d) => 1 - 0.66 * smoothstep(5, 34, d);

/* ================================================================
   THE BRIGHTNESS HIERARCHY (2026-08-14, Hannah's fairy-ring brief)
   ================================================================
   > "Introduce hierarchy in brightness. Maybe ~70% extremely faint hairline
   >  mycelium, ~20% slightly brighter secondary routes, and only ~10%
   >  genuinely luminous strands/nodes. Make the brighter routes organic and
   >  directional rather than random."

   Before this pass the canopy had two levels and they were assigned by
   GRAPH ROLE: every spanning-tree edge got 0.20-0.30, every cross-link got
   0.115-0.17. That is a two-tier ramp with ~45% of the segments in the top
   one, and — the part that matters for "random" — a tree edge out at the
   hint band was lit exactly like the artery running into the hero's foot.
   The eye had no way to tell which strokes were carrying the network.

   The fix for the SECONDARY tier is not a third constant, it is a QUANTITY
   THE GRAPH ALREADY HAS. Prim's walk is rooted at the hero, so the tree is a
   rooted tree, and every edge has a LOAD: the number of fruiting bodies in
   the subtree hanging off it. Load is how many mushrooms' paths back to the
   hero run through this strand. Sort by it and the middle tier becomes FLOW —
   faint everywhere in the capillaries, brighter where routes merge — and the
   Y-shaped confluences she asks for happen on their own, because that is what
   a rooted tree does at every branch point. Nothing is random and nothing is
   authored per-strand.

   THE LUMINOUS TIER IS NOT DRAWN FROM THE GRAPH AT ALL, and finding that out
   cost this pass its first candidate. Filling the top 10% with the highest-
   load tree edges is the obvious extension of the idea and it is wrong on the
   frame: a graph edge is a CHORD — a point-to-point run with a modest bow —
   so lighting the busiest of them puts the brightest strokes in the frame on
   the most angular geometry in the file. Rendered with the two faint tiers
   muted, that candidate's top tier read as a bright triangulation across the
   floor: precisely the "miscellaneous angular lines" the brief opens by
   asking to remove, re-emitted at four times the tone. Load says which
   strands MATTER; it says nothing about which are worth looking at.

   So the top tier is spent only on geometry authored to deserve it — the
   arteries (§3b) and the arcs (§3c), both of them long, curved, directional
   and going somewhere — plus the nodes. The graph's own contribution stops at
   SECONDARY. Her sentence says this outright and it is worth reading twice:
   "Little Y-shaped branches, convergences, and occasional glowing nodes will
   work much better than more line density."

   The two lower tiers are then filled to her fractions by BUDGET rather than
   by a threshold guess: the top of the load ordering is taken until the
   secondary tier reaches SEC_SHARE of the whole canopy's segment count, and
   everything left — every cross-link, every hairline, every low-load twig of
   the tree — is hairline. The budget counts the arteries and the arcs, so
   they spend out of the same total rather than sitting on top of it.

   The distance-luminance floor is also tiered, and this is what stops the
   hierarchy dissolving with depth: a hairline takes lumOf() raw and so
   vanishes into the fog as it should, while a luminous artery keeps 45% of
   its tone at any distance and stays legible to the horizon. Near and far
   read as the same three levels. */
export const T_HAIR = 0, T_SEC = 1, T_LUM = 2;
export const LUM_SHARE = 0.10, SEC_SHARE = 0.20;

/* WEIGHT IS NOT A TIER (2026-08-14, later — Hannah: "the final scene redesign
   seems to have added these really thick lines that are way too thick coming
   out of each mushroom. Could you make them a lot thinner, similar to the
   other lines? Right now they stand out like a sore thumb.")

   The first cut of this tier read as THICK, and the reason is one number that
   does not live in this file: organism.js's UnrealBloomPass runs at threshold
   0.1. A strand's contribution to the frame is its tone times the batch's
   STRAND_OP (0.62), so the three tiers landed either side of that knee —

       hairline   0.050-0.082  ->  0.031-0.051   BELOW the knee: no halo at all
       secondary  0.146-0.205  ->  0.091-0.127   at the knee: a trace
       luminous   0.440-0.555  ->  0.273-0.344   2.7-3.4x the knee: a wide halo

   — so the top tier was not a brighter line, it was a line wearing a bloom
   skirt, and a skirt is WIDTH. Measured on the rest frame at 1440x900, the
   floor's own lines never cleared luma 90 at all (median peak 69) while an
   artery presented 3-14 px of continuous >90 band with a peak of 135-178.
   That is the sore thumb, stated as pixels: it was the only thing on the
   floor thick enough to be measured as a band rather than as a stroke.

   So the STRAND band comes down to sit just past the knee — the old spine
   band this pass had retired, which is a weight this composition already
   knows how to hold — and the luminous claim moves to the channel that can
   carry it without width. A GLINT IS A POINT: it has an authored size, it
   does not run anywhere, and a halo on it reads as a node rather than as a
   thicker route. That is Hannah's own brief taken literally — "little
   Y-shaped branches, convergences, and occasional glowing nodes will work
   much better than more line density" — with the corollary this pass had
   missed, that it works much better than more line WEIGHT too. */
const TONE = [
  { lo: 0.050, hi: 0.082, floor: 0.00 },   // T_HAIR — extremely faint
  { lo: 0.146, hi: 0.205, floor: 0.38 },   // T_SEC  — slightly brighter
  { lo: 0.225, hi: 0.295, floor: 0.55 },   // T_LUM  — the routes, not the ribbons
];
// THE NODES keep the band the strands have given up. The ceiling is still the
// terrain LIP's own tone (0.55), this composition's brightest ground feature
// and the line the whole frame hangs on: a node may reach it and never pass
// it, so nothing on the floor outranks the soil-line and nothing on the floor
// comes near the caps. Split out of TONE because it is no longer a tier of
// the same quantity — the strands are graded on WEIGHT and the nodes on
// PUNCTUATION, and holding both on one row is what let a 3x tone step turn
// into a 3-14 px band without anything in the file saying so.
const TONE_NODE = { lo: 0.440, hi: 0.555, floor: 0.55 };
export const toneOf = (tier, r, lum) => {
  const b = TONE[tier];
  return (b.lo + (b.hi - b.lo) * r) * (b.floor + (1 - b.floor) * lum);
};
export const nodeToneOf = (r, lum) => {
  const b = TONE_NODE;
  return (b.lo + (b.hi - b.lo) * r) * (b.floor + (1 - b.floor) * lum);
};
// the front pulse / CTA wave respect the same hierarchy, so an interaction
// cannot flatten it back out
export const BOOST = [0.16, 0.40, 0.58];
export const WAVE = [0, 0.30, 0.45];

// Terrain law, one place.
export const LIFT_MIN = 0.020, LIFT_SPAN = 0.030;
// Kept-soil margin. The bodies use 0.4 and the surface strokes 0.25; a strand
// is a long thing and one sample landing in the void reads as a line hanging
// off the lip, so it takes the bodies' margin.
export const KEPT = 0.40;

// The rest camera is what "how far away" means in this file, so the distance
// every luminance and every selection rule is measured with belongs beside
// it. Moved here from inside createFinalCanopy by H04 — same expression,
// same result, now readable by the two authored passes as well.
export const dCam = (x, z) => Math.hypot(x - REST_CAM.x, z - REST_CAM.z);
