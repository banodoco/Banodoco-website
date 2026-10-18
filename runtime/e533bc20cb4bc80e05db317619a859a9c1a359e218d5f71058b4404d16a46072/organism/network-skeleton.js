/* ==================================================================== *
 * organism/network-skeleton.js — the PreNetwork's shared ground data.
 *
 * WHAT THIS IS. A sparse skeleton of the REAL ground network: 24 of the
 * mycelium web's own polylines and the three points the prelude's hero
 * spores land on, in the same world coordinates organism/organism.js
 * builds the full network in. The prelude (organism/hero-spores.js)
 * projects these through the same hero camera the scene will use, so the
 * filaments a landing wakes are the same threads — same positions, same
 * horizon — the full scene draws minutes or milliseconds later. The
 * handoff can therefore read as added detail on one structure instead of
 * one network being swapped for another.
 *
 * WHY IT IS BAKED AND NOT GENERATED. The full network is positioned off
 * the scene's one deterministic RNG stream, in construction order, after
 * every geometry built before it — reproducing the stream here would mean
 * reproducing the whole build, and consuming a single draw from it would
 * move every geometry in the scene (see makeRng in hero-spores.js). So
 * the skeleton is EXTRACTED from the live groundGroup instead: the web's
 * line segments chained back into their wiggly polylines, deduplicated,
 * and selected around the three landing sites — plus the hub-graph paths
 * between the sites, which the handoff pulse travels. The extraction and
 * selection scripts, and the raw dump they read, are kept at
 * evidence/r5-prelude/ (bake-skeleton.mjs, the final inline selector in
 * the ledger); re-run them if the ground build's RNG consumption ever
 * changes upstream, and the parity probe there will say if this file has
 * drifted from the geometry it claims to be.
 *
 * WHAT THE FIELDS MEAN.
 *   LANDING_SITES  [x, y, z] world points the 2-3 hero spores arc down
 *                  to. Site 0 IS the mushroom origin — world (0, groundY
 *                  (0,0), 0), the exact spot the stalk grows from; its
 *                  projection reproduces the per-mode anatomy pairs that
 *                  used to be measured by hand (desktop NDC 0.42, -0.67
 *                  against the measured 0.42, -0.68). Sites 1 and 2 are
 *                  two of the network's own star hubs, left and right of
 *                  the stalk.
 *   SKELETON       polylines. `i` names the island (which landing wakes
 *                  it), `s` marks the spine paths the convergence pulse
 *                  runs along toward site 0, `h` is the mean heat() tone
 *                  the real strand carries, `p` is [x0,y0,z0, x1,y1,z1,…]
 *                  world points, quantized to 0.01 world units (~1.3 px
 *                  at desktop framing — under the visible width of the
 *                  strands themselves).
 *
 * This module is a LEAF with no imports, loaded by hero-spores.js's own
 * pre-main.js graph. THE RULE THAT GRAPH LIVES UNDER applies here too:
 * nothing that imports `three`, and nothing that imports anything at all.
 * ==================================================================== */

export const LANDING_SITES = [
  [0, 0.031, 0],
  [-1.4, 0.01, 0.37],
  [2.53, 0.04, -0.99],
];

export const SKELETON = [
  { i: 1, s: 1, h: 0.33, p: [-0.47, 0.03, 0.3, -0.47, 0.04, 0.28, -0.44, 0.03, 0.24, -0.5, 0.03, 0.2, -0.43, 0.04, 0.17, -0.46, 0.03, 0.14, -0.44, 0.03, 0.12, -0.49, 0.03, 0.06, -0.43, 0.03, 0.05] },
  { i: 1, s: 1, h: 0.28, p: [-0.82, 0.02, 0.32, -0.78, 0.02, 0.31, -0.72, 0.03, 0.37, -0.69, 0.03, 0.29, -0.63, 0.03, 0.33, -0.6, 0.03, 0.31, -0.57, 0.03, 0.3, -0.5, 0.04, 0.3, -0.47, 0.04, 0.3] },
  { i: 1, s: 1, h: 0.38, p: [-1.14, 0, 0.19, -1.11, 0, 0.21, -1.06, 0.01, 0.24, -1.02, 0.01, 0.25, -0.96, 0.02, 0.26, -0.93, 0.02, 0.26, -0.9, 0.02, 0.27, -0.85, 0.02, 0.31, -0.82, 0.03, 0.34] },
  { i: 2, s: 1, h: 0.23, p: [2.71, 0.04, -1.62, 2.24, 0.02, -1.32, 1.99, 0.02, -1.17, 1.44, 0.01, -0.75, 1.3, 0.02, -0.7, 0.95, 0.02, -0.38, 0.84, 0.03, -0.23, 0.55, 0.04, 0.25, 0.45, 0.05, 0.5] },
  { i: 0, s: 0, h: 0.68, p: [0.65, 0.04, 0.35, 0.63, 0.05, 0.36, 0.58, 0.05, 0.38, 0.55, 0.05, 0.36, 0.52, 0.05, 0.39, 0.51, 0.05, 0.44, 0.47, 0.05, 0.4, 0.43, 0.05, 0.44, 0.43, 0.06, 0.5] },
  { i: 0, s: 0, h: 0.68, p: [0.41, 0.06, 0.45, 0.43, 0.05, 0.43, 0.47, 0.05, 0.41, 0.5, 0.05, 0.42, 0.54, 0.05, 0.4, 0.57, 0.05, 0.39, 0.6, 0.05, 0.41, 0.63, 0.05, 0.36, 0.65, 0.04, 0.35] },
  { i: 0, s: 0, h: 0.65, p: [0.71, 0.04, 0.11, 0.67, 0.04, 0.13, 0.63, 0.04, 0.2, 0.6, 0.04, 0.23, 0.56, 0.05, 0.3, 0.49, 0.05, 0.3, 0.51, 0.05, 0.37, 0.44, 0.05, 0.42, 0.43, 0.05, 0.47] },
  { i: 0, s: 0, h: 0.62, p: [0.65, 0.04, 0.35, 0.65, 0.04, 0.33, 0.69, 0.04, 0.29, 0.61, 0.05, 0.25, 0.66, 0.05, 0.22, 0.71, 0.04, 0.2, 0.67, 0.04, 0.17, 0.7, 0.04, 0.13, 0.71, 0.04, 0.11] },
  { i: 0, s: 0, h: 0.51, p: [1.21, 0.02, -0.73, 1.18, 0.02, -0.71, 1.12, 0.02, -0.68, 1.09, 0.02, -0.69, 1.03, 0.02, -0.67, 0.98, 0.02, -0.72, 0.96, 0.03, -0.67, 0.89, 0.02, -0.66, 0.87, 0.02, -0.64] },
  { i: 0, s: 0, h: 0.64, p: [-0.49, 0.03, 0.2, -0.51, 0.03, 0.19, -0.54, 0.03, 0.17, -0.54, 0.03, 0.16, -0.53, 0.03, 0.12, -0.53, 0.03, 0.1, -0.54, 0.02, 0.09, -0.56, 0.02, 0.07, -0.57, 0.02, 0.06] },
  { i: 0, s: 0, h: 0.51, p: [0.87, 0.02, -0.65, 0.83, 0.02, -0.58, 0.82, 0.02, -0.44, 0.83, 0.03, -0.37, 0.78, 0.03, -0.23, 0.77, 0.03, -0.16, 0.75, 0.03, -0.1, 0.75, 0.03, 0.05, 0.71, 0.04, 0.11] },
  { i: 1, s: 0, h: 0.6, p: [-1.88, 0.04, 1.62, -1.9, 0.04, 1.58, -1.95, 0.03, 1.49, -2.01, 0.03, 1.47, -2.05, 0.02, 1.38, -2.07, 0.01, 1.33, -2.09, 0.01, 1.29, -2.14, 0, 1.2, -2.17, 0.01, 1.16] },
  { i: 1, s: 0, h: 0.59, p: [-0.68, 0.07, 1.23, -0.66, 0.07, 1.24, -0.63, 0.08, 1.28, -0.59, 0.07, 1.23, -0.56, 0.08, 1.27, -0.55, 0.08, 1.28, -0.52, 0.08, 1.27, -0.48, 0.08, 1.28, -0.46, 0.08, 1.28] },
  { i: 1, s: 0, h: 0.55, p: [-0.47, 0.08, 1.3, -0.51, 0.08, 1.33, -0.61, 0.08, 1.33, -0.65, 0.08, 1.34, -0.75, 0.07, 1.36, -0.79, 0.08, 1.36, -0.84, 0.07, 1.37, -0.93, 0.07, 1.39, -0.98, 0.07, 1.4] },
  { i: 1, s: 0, h: 0.58, p: [-2.37, -0.03, 0.72, -2.36, -0.02, 0.76, -2.31, -0.02, 0.84, -2.31, -0.01, 0.88, -2.26, -0.01, 0.96, -2.22, -0.01, 0.99, -2.23, 0, 1.04, -2.18, 0, 1.12, -2.15, 0, 1.15] },
  { i: 1, s: 0, h: 0.81, p: [-1.43, 0.01, 0.67, -1.4, 0.01, 0.65, -1.4, 0.01, 0.59, -1.42, 0.01, 0.56, -1.41, 0, 0.51, -1.41, 0.01, 0.48, -1.42, 0, 0.45, -1.41, 0, 0.4, -1.4, 0, 0.37] },
  { i: 2, s: 0, h: 0.58, p: [1.21, 0.02, -0.73, 1.23, 0.02, -0.77, 1.2, 0.02, -0.88, 1.25, 0.01, -0.92, 1.25, 0.01, -1.03, 1.28, 0.01, -1.07, 1.28, 0.02, -1.12, 1.31, 0.02, -1.22, 1.37, 0.01, -1.26] },
  { i: 2, s: 0, h: 0.5, p: [3.32, 0.02, 0.45, 3.28, 0.03, 0.41, 3.18, 0.02, 0.39, 3.11, 0.02, 0.43, 3.03, 0.02, 0.37, 2.98, 0.02, 0.37, 2.94, 0.02, 0.32, 2.84, 0.03, 0.31, 2.8, 0.02, 0.28] },
  { i: 2, s: 0, h: 0.57, p: [2.79, 0.02, 0.28, 2.81, 0.02, 0.25, 2.83, 0.03, 0.19, 2.84, 0.02, 0.16, 2.87, 0.02, 0.1, 2.89, 0.03, 0.07, 2.89, 0.02, 0.04, 2.92, 0.03, -0.02, 2.9, 0.03, -0.06] },
  { i: 2, s: 0, h: 0.47, p: [1.33, 0.01, -1.27, 1.3, 0.01, -1.24, 1.23, 0.01, -1.24, 1.2, 0.01, -1.21, 1.13, 0.01, -1.2, 1.09, 0.01, -1.2, 1.06, 0.01, -1.2, 1.01, 0.02, -1.11, 0.97, 0.01, -1.14] },
  { i: 2, s: 0, h: 0.43, p: [0.81, 0.01, -1.42, 0.86, 0.01, -1.42, 0.94, 0.01, -1.33, 1.01, 0.01, -1.39, 1.09, 0.01, -1.34, 1.14, 0.01, -1.33, 1.2, 0.01, -1.34, 1.28, 0.02, -1.28, 1.33, 0.01, -1.27] },
  { i: 0, s: 0, h: 0.47, p: [-0.1, 0.16, -0.3, -0.18, 0.1, -0.71, -0.25, 0.02, -0.95, -0.32, -0.01, -1.21, -0.42, -0.01, -1.51, -0.51, -0.01, -1.81, -0.57, -0.01, -1.97, -0.61, -0.01, -2.14] },
  { i: 0, s: 0, h: 0.48, p: [-0.17, 0.11, -0.27, -0.33, 0.02, -0.45, -0.47, 0, -0.62, -0.55, -0.01, -0.8, -0.71, -0.02, -1.07, -0.84, -0.02, -1.36, -0.89, -0.02, -1.5] },
  { i: 0, s: 0, h: 0.32, p: [-0.47, 0, -0.62, -0.66, -0.01, -0.79, -0.96, -0.03, -1.08, -1.14, -0.03, -1.25, -1.52, -0.05, -1.63, -1.76, -0.05, -1.74, -1.92, -0.06, -1.81, -2.22, -0.06, -1.97, -2.4, -0.06, -2.02] },
];
