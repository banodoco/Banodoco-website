// journey-v6 — FINAL epilogue: PER-BODY CAP FIGURE.
// (journey-v6-plan/18-one-species.md §20, "The figure is not the tissue" —
// 2026-08-14)
//
// THE COMPLAINT
// -------------
// Hannah, on the shipped field: "there's a mushroom in the right foreground
// where you can really make out the details — the squiggles at the top. But
// those squiggles match the main mushroom's. The same patterns... it looks
// lazy. Could you randomise all the other mushrooms — the triangles on them,
// the squiggles, the things that basically make the cap feel unique?"
//
// She is naming ONE layer, precisely. organism.js §5's cap-top block draws
// three things on the dome: a fine 26x110 crumpled lattice, a sparse bright
// OVERLAY NETWORK (190 nodes, each wired to its two nearest neighbours), and
// a point cloud (those same 190 nodes as dots, plus 420 speckles). The
// overlay network is the only one of the three that makes a FIGURE — its
// two-nearest rule closes triangles and strings long zigzags, and at the
// Final rest those chevrons are the most legible marks on any near cap. The
// lattice is a regular grid and reads as tissue; the network reads as a
// drawing, and a drawing repeated twenty-five times is the thing the eye
// catches.
//
// WHY THE EXISTING VARIATION COULD NOT FIX IT
// -------------------------------------------
// variation.js (66d1bed) already gives every body its own crumple lobe count,
// phase and amplitude, its own rim harmonic, its own proportions — and it is
// a DEFORMATION of shared vertices. A deformation moves where the figure
// sits; it cannot change which node is wired to which. Warp a chevron and it
// is a warped chevron: same node count, same adjacency, same triangles, in
// the same order round the dome. That is exactly what the shipped frame
// shows, and it is why "push the existing axes harder" was not an option —
// the axes were never addressing this.
//
// THE SPLIT THIS FILE DRAWS
// -------------------------
//   FIGURE layers  the overlay net and its node dots — a graph, whose
//                  identity is its adjacency. A per-body warp is a no-op on
//                  adjacency, so these need real per-body GEOMETRY.
//                  Rebuilt here, per body, from a per-body seed.
//   TISSUE layers  the fine lattice, the bead cloud, gills, rim, stem mesh
//                  and fibres — regular families whose read is "what surface
//                  am I flowing over". A deformation genuinely re-patterns
//                  those, and variation.js already applies one. They stay
//                  SHARED, which is what keeps 9493fcc's bargain: the tissue
//                  is the identity, and 24 bodies still cost one body's
//                  tissue.
//
// The split is also where the money is. Measured off the live buffers, one
// body's cap layers are: fine lattice 606.6 KB, overlay net 20.8 KB, cap
// points 23.8 KB. Rebuilding the two figure layers for all 24 clones costs
// ~1.05 MB against the scene's 8.7 MB (+12%); rebuilding the lattice too
// would cost 14.6 MB (+167%) to re-pattern the layer that reads as texture.
//
// WHY THIS IS STILL ONE SPECIES — the argument, not the hope
// ----------------------------------------------------------
// A rebuilt figure is not a second parameterisation of the cap. It is the
// HERO'S OWN construction, run again:
//
//   * the nodes are sampled from `capTopPt` — anatomy.js's byte-faithful
//     mirror of organism.js §4 — so every node lands on the hero's own dome
//     surface, under the hero's own rim line and margin droop;
//   * the wiring rule is the hero's (each node to its two nearest), so the
//     node degree, the triangle statistics and the stroke-length
//     distribution are the hero's;
//   * the counts are READ OFF the hero's live buffers, never hardcoded, so
//     if organism.js ever re-densifies its cap the clones follow;
//   * the colours are `heat()` over the hero's own brightness draws, and
//   * `makeRng` here is bit-for-bit organism.js's own LCG (1664525 /
//     1013904223 / 2^32). The hero's figure IS a draw from this generator.
//
// So the hero's cap and every clone's cap are samples from ONE distribution
// under ONE construction, differing in seed alone — which is what "the same
// kind of thing" means when the thing is generated. d0ff2b3's silhouette
// invariant is untouched (no vertex here leaves the dome surface) and
// 9493fcc's tissue invariant is untouched (the tissue is still literally the
// hero's buffers).
//
// THE CONSISTENCY LAW, INHERITED FROM variation.js
// ------------------------------------------------
// The net and the node dots are built from ONE node array in organism.js —
// `pp.push(n.x, n.y, n.z)` walks the very nodes the net was wired from. So
// they must be rebuilt TOGETHER or a body wears its dots at the old nodes
// and its strokes at the new ones: 190 bright dots floating off the network
// they are supposed to be the vertices of. `analyseHeroFigure()` therefore
// refuses to identify one without the other, and `add()` swaps both or
// neither. Half a re-figured body is not a degraded outcome, it is a bug —
// the same reasoning `probeVary()` is built on.

import * as THREE from 'three';
import { makeRng, heat, capTopPt } from '../../anatomy.js';

const TAU = Math.PI * 2;
const _c = new THREE.Color();
/** organism.js's own pushC — heat() over a brightness scalar. */
function pushC(arr, t) { heat(t, _c); arr.push(_c.r, _c.g, _c.b); }

/* ================================================================== */
/* 1. IDENTIFY THE TWO LAYERS — structurally, never by index           */
/* ================================================================== */
/**
 * Find the hero's overlay net and its companion point cloud among the
 * `mushroom` group's children, and recover the two counts the rebuild needs.
 *
 * Identification is by CONSTRUCTION SIGNATURE, not by position in the child
 * list, because that list is not ours: chapters/inspire parents its own
 * decoration group onto `mushroom`, and organism.js may add a layer tomorrow.
 * Three signatures, each of which is a fact about how §5 builds the pair:
 *
 *   1. The net is the only LineSegments under `mushroom` drawn with a stock
 *      (non-Shader) material — everything else dense uses makeDenseLines.
 *   2. Its buffer is groups of four vertices `[n, m1, n, m2]`, because the
 *      builder emits both of a node's edges from the node itself. So
 *      vertex 4k and vertex 4k+2 are bitwise equal, for every k. That both
 *      proves the two-nearest rule and hands us the node count.
 *   3. The point cloud is the Points layer whose FIRST `nodes` positions are
 *      bitwise those same node coordinates — because §5 pushes the node dots
 *      before the speckles, off the same array. That is the shared-node fact
 *      the consistency law depends on, asserted rather than assumed.
 *
 * @returns {{netGeo, ptsGeo, nodes, speckles}|null} null if ANY signature
 *          fails, in which case the caller shares the hero's buffers exactly
 *          as it did before this module existed.
 */
export function analyseHeroFigure(mushroom) {
  const kids = mushroom.children;

  // --- (1) the net: the one stock-material LineSegments -------------------
  const netCands = kids.filter(o =>
    o.isLineSegments && o.material && !o.material.isShaderMaterial &&
    o.geometry && o.geometry.attributes.position &&
    o.geometry.attributes.color && o.geometry.attributes.aDraw);
  if (netCands.length !== 1) return null;
  const netGeo = netCands[0].geometry;
  const np = netGeo.attributes.position;
  if (np.count < 32 || np.count % 4 !== 0) return null;
  const nodes = np.count / 4;

  // --- (2) the [n, m1, n, m2] grouping ------------------------------------
  const na = np.array;
  for (let k = 0; k < nodes; k++) {
    const a = k * 12, b = a + 6;                    // vertex 4k and 4k+2
    if (na[a] !== na[b] || na[a + 1] !== na[b + 1] || na[a + 2] !== na[b + 2]) return null;
  }

  // --- (3) the point cloud that shares those nodes ------------------------
  const ptCands = kids.filter(o => {
    if (!o.isPoints || !o.geometry) return false;
    const at = o.geometry.attributes;
    if (!at.position || !at.color || !at.psize || !at.pseed || !at.pdist || !at.aDraw) return false;
    if (at.position.count <= nodes) return false;
    const pa = at.position.array;
    for (let k = 0; k < nodes; k++) {
      const s = k * 12, d = k * 3;                  // net vertex 4k vs point k
      if (pa[d] !== na[s] || pa[d + 1] !== na[s + 1] || pa[d + 2] !== na[s + 2]) return false;
    }
    return true;
  });
  if (ptCands.length !== 1) return null;
  const ptsGeo = ptCands[0].geometry;

  return { netGeo, ptsGeo, nodes, speckles: ptsGeo.attributes.position.count - nodes };
}

/* ================================================================== */
/* 2. BUILD ONE BODY'S FIGURE                                          */
/* ================================================================== */
/**
 * One individual's cap figure: the same drawing the hero made, made again.
 *
 * The draw sequence below is organism.js §5's, term for term and in order —
 * node placement, then the wiring pass with its per-edge brightness, then the
 * node dots, then the speckles. Keeping the ORDER matters as much as keeping
 * the terms: it is what makes the two outputs the same random variable, so
 * "different seed" is the only difference between this body and the hero.
 *
 * Two channels are COPIED from the source buffers rather than redrawn, and
 * both for the same reason — they are not part of the figure:
 *
 *   aDraw  the per-vertex entry-draw ORDER (organism.js `drawAttr`, i/(n-1)).
 *          The vertex count is identical and the build order is identical, so
 *          the hero's own array is exactly the right one — and copying it
 *          makes the swap provably invisible to §8.7's draw-on choreography
 *          instead of merely equivalent to it.
 *   pdist  the network-distance channel, all zero on a cap layer (makePoints
 *          fills it with zeros when no dists are passed). Copied so it stays
 *          exactly zero rather than by re-deriving a constant.
 *
 * `pseed` IS redrawn: it is the per-point twinkle phase, and at the frozen
 * clock it sets each mote's resting brightness (0.85 + 0.15 sin(pseed*7)).
 * That is part of how an individual's dome sparkles, so it individuates.
 *
 * @param {object} spec  from analyseHeroFigure()
 * @param {number} seed  the body's own seed (ring.js memberParams)
 */
export function buildCapFigure(spec, seed) {
  // Its OWN stream, keyed off the body seed like bodyVariation's ^0x2b1e and
  // the sway's ^0x51a7, so adding this draw cannot shift one value the
  // placement, the shape or the species build already draw.
  const rand = makeRng(seed ^ 0x3f9d);
  const randRange = (a, b) => a + (b - a) * rand();
  const N = spec.nodes, SP = spec.speckles;

  // --- nodes on the hero's own dome (organism.js §5: sqrt(rand)*0.99) ------
  const nodes = [];
  for (let k = 0; k < N; k++) {
    const p = capTopPt(Math.sqrt(rand()) * 0.99, rand() * TAU);
    p.y += 0.012;
    nodes.push(p);
  }

  // --- the net: every node to its two nearest -----------------------------
  // O(N^2) at N=190 is ~36k distance tests per body, 24 bodies: under 1 M
  // operations for the whole set, once, at chapter construction. The hero
  // itself pays the identical cost at page boot.
  // Two-nearest via a linear scan (2026-08-17): the filter/map/sort/slice
  // form allocated ~N objects + three arrays per node (~862k objects across
  // the 24 bodies), pure garbage feeding the post-load GC sweep. The scan
  // keeps the two strictly-smallest distances; strict `<` (never `<=`)
  // reproduces the stable sort's tie order exactly — among equal distances
  // the earliest-enumerated node wins, same as before, so the emitted edges
  // and the per-edge rand() draws are byte-identical in sequence.
  const olp = [], olc = [];
  for (const n of nodes) {
    let m1 = null, d1 = Infinity, m2 = null, d2 = Infinity;
    for (const m of nodes) {
      if (m === n) continue;
      const d = m.distanceTo(n);
      if (d < d1) { m2 = m1; d2 = d1; m1 = m; d1 = d; }
      else if (d < d2) { m2 = m; d2 = d; }
    }
    for (const m of [m1, m2]) {
      if (!m) continue;
      olp.push(n.x, n.y, n.z, m.x, m.y, m.z);
      const b = 0.35 + rand() * 0.15;
      pushC(olc, b); pushC(olc, b);
    }
  }

  // --- the point cloud: those nodes as dots, then the speckles ------------
  const pp = [], pc = [], ps = [];
  for (const n of nodes) {
    pp.push(n.x, n.y, n.z);
    pushC(pc, 0.5 + rand() * 0.3);
    ps.push(randRange(0.03, 0.07));
  }
  for (let k = 0; k < SP; k++) {
    const p = capTopPt(Math.sqrt(rand()), rand() * TAU);
    pp.push(p.x, p.y + 0.01, p.z);
    pushC(pc, 0.3 + rand() * 0.3);
    ps.push(randRange(0.015, 0.045));
  }

  // --- into buffers, with the source's own vertex counts ------------------
  // A count mismatch would change what the frame submits, so it is asserted
  // rather than trusted: the caller drops the whole figure if this throws.
  if (olp.length !== spec.netGeo.attributes.position.count * 3 ||
      pp.length !== spec.ptsGeo.attributes.position.count * 3) return null;

  const net = new THREE.BufferGeometry();
  net.setAttribute('position', new THREE.Float32BufferAttribute(olp, 3));
  net.setAttribute('color', new THREE.Float32BufferAttribute(olc, 3));
  net.setAttribute('aDraw', new THREE.BufferAttribute(
    new Float32Array(spec.netGeo.attributes.aDraw.array), 1));

  const pts = new THREE.BufferGeometry();
  pts.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
  pts.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
  pts.setAttribute('psize', new THREE.Float32BufferAttribute(ps, 1));
  pts.setAttribute('pseed', new THREE.Float32BufferAttribute(
    ps.map(() => rand() * TAU), 1));
  pts.setAttribute('pdist', new THREE.BufferAttribute(
    new Float32Array(spec.ptsGeo.attributes.pdist.array), 1));
  pts.setAttribute('aDraw', new THREE.BufferAttribute(
    new Float32Array(spec.ptsGeo.attributes.aDraw.array), 1));

  return { net, pts };
}
