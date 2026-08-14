// journey-v6 — FINAL epilogue: THE ROOT CANOPY.
//
// Hannah, 2026-08-07: "in the final section, can you make it so all mushrooms
// have roots like the main ones have — it should feel like they all exist on
// this giant interconnected canopy similar to the one that surrounds the main
// one. It should be an extension of the one that surrounds the main mushroom,
// like literally a canopy."
//
// WHAT THIS IS NOT
// ----------------
// It is not sixty small root systems that happen to stand near each other.
// That reading was available and cheap — ring.js already gives every body a
// couple of ground-merge stubs (§8 base) — and it is the wrong answer to the
// sentence above, twice over: per-body roots say "sixty organisms", and
// scattering more short strokes across the floor is exactly the countable-
// stroke carpet the declutter round spent a whole pass deleting ("messy lines
// that go all over the place, ESPECIALLY ALONG THE FOREST FLOOR").
//
// It is ONE NETWORK, and its structure is what carries the reading. Every
// fruiting body in the chapter — the hero at the origin, the nine ring
// members, the forty-three field bodies, the twenty far hints — is a NODE of
// a single connected graph, and the strands are its EDGES. A body does not
// have roots; the canopy has bodies. The graph is built so that:
//
//   · it is CONNECTED BY CONSTRUCTION. A Euclidean minimum spanning tree over
//     every node is laid first, so there is exactly one component and no
//     island anywhere in the field — you cannot author that with proximity
//     scatter, and it is the difference between "a canopy" and "some roots".
//   · it is ROOTED AT THE HERO. Prim's walk starts at node 0, the hero's own
//     stipe base, so every strand in the field traces back to the organism
//     the visitor has been looking at for the whole ride. It is literally an
//     extension of the canopy around the main mushroom, in the strong sense:
//     one graph, one root.
//   · it is a WEB, not a tree. The spanning tree alone reads as a river
//     system; a second pass adds short nearest-neighbour cross-links (and a
//     direct body-to-body link wherever two bodies are close enough), which
//     puts cycles in and makes the eye read mesh.
//   · strands visibly run BETWEEN BODIES. Body seats are graph nodes, so an
//     edge that joins two of them is a strand running from one mushroom's
//     foot to another's — the connection Hannah's sentence is about.
//
// The vocabulary is the house's, not a third one. The EDGE is CONNECT's
// ground tendril (chapters/connect/tendrils.js, 16-connect-ground-restage.md):
// a meandering surface strand on the terrain law, never a straight run and
// never a right angle. The GRAPH is OWNED's root web (chapters/owned/
// substrate.js, 20-owned-root-network.md §4): its own nodes, wired to nearest
// neighbours, with the bodies wired in so "the fan and the mesh are one
// structure". The junction GLINTS and the convergence HUBS are both files'
// shared grammar. Nothing here invents a fourth network language.
//
// TERRAIN LAW. Every vertex sits at groundY(x, z) + a 0.02-0.05 lift — the
// same law CONNECT's network and the hero's own §8 ground web obey. Nothing
// floats and nothing sinks, so a body placed at gy = groundY(x, z) meets the
// canopy at its foot for free, at every body, without a single per-body
// adjustment. And every vertex is tested against cutVal(): the cutaway wedge
// stays void, exactly as the soil, the surface strokes and the bodies do.
//
// REVEAL (D16, absolute) — RE-KEYED TO THE SOIL LINE, 2026-08-14.
//
// Hannah, on the Owned -> Final transit: "there's this kind of network or web
// thing visible halfway through, but it only appears when I'm halfway there.
// Can you make it so it's always there and we just zoom into it?"
//
// She is describing THIS FILE, and "halfway" is not an impression — it is the
// number. The canopy used to carry aReveal on the SAME uPull the bodies kindle
// on, and uPull is pullOf(camera.x) = (-x - 8)/6: exactly zero until the lens
// passes x -8.0. Measured on the shipped build through REAL WHEEL EVENTS
// (17-final-field.md, 2026-08-14): the camera reaches x -8.09 at p 0.8497,
// which is 45.3% of the transit's wheel — the network is absent for the whole
// first half of the leg and then DRAWS ITSELF IN over open view across the
// next 40%, finishing at p 0.940 (85.3%). That is the fade-in-over-open-view
// this project has now removed three times: CONNECT's ground paths (f9e8317)
// and OWNED's colony (fc1e151) are the same fault and the same fix.
//
// WHAT THE WORLD ALREADY DOES FOR US. The fix OWNED found was not to fade
// earlier, it was to hand the reveal to GEOMETRY: key it to the camera's
// depth relative to the soil, so the ground itself does the hiding and no
// nav jump can outrun it. That is available here, and it was measured before
// it was used. Forcing the canopy fully lit and A/B-toggling it against the
// frozen frame, its contribution is:
//
//     lens 0.4-1.1 units UNDER the soil    MAE 0.003 - 0.139  (max 86)
//     lens at or above the soil line       MAE 1.50 - 1.98    (max 211)
//
// — a ~17x step across the surface, because the soil, the fog and the grazing
// angle occlude it from below. So the canopy can be brought to FULL PRESENCE
// while the lens is still buried and the visitor cannot see it happen.
//
// THE LAW. Every vertex is ALWAYS_LIT, so nothing in this file kindles at all.
// The network's presence is one camera-pure scalar — surfacedOf(camera) in
// index.js, a smoothstep on (camera.y - groundY) that is 0 at 1.10 under the
// soil and 1 at 0.30 under it — multiplied into the two materials' own
// uOpacity. Consequences, all of them the reveal laws:
//   · DARK AT ARM. The chapter arms at p 0.800 with the lens 1.08 under; the
//     term is 0.002 there. Nothing is lit at the arm.
//   · COMPLETE BEFORE IT CAN BE SEEN. The term saturates at 0.30 under the
//     soil (p ~0.848), BEFORE the pierce at p 0.8536 — so by the time the
//     ground is visible at all, the network is already whole, to the horizon.
//     Everything after that is approach: the visitor zooms into a world that
//     was already there, which is the sentence at the top of this block.
//   · REVERSE MIRRORS EXACTLY. It is a pure function of the pose, with no
//     state and no clock, so a reverse scrub retires it through the identical
//     values and a jump lands on the honest one.
//   · IT COSTS NOTHING. Both batches are frustumCulled = false and were
//     already drawn every frame the chapter is visible — dark, but drawn. The
//     change moves a multiply, not a draw call. (fc1e151 made the same point.)
//
// WHAT WAS GIVEN UP, deliberately: the light no longer TRAVELS down a strand
// from the body that kindled first, and CANOPY_LEAD's "the ground under a
// mushroom is already alight when the mushroom comes up" is no longer a lead
// of 0.04 — it is total. The canopy is simply there first, always, which is a
// stronger form of the same claim ("the canopy has bodies"), and the bodies'
// own arrival ladder is untouched: they still kindle one at a time on uPull,
// out of ground that is already lit.
//
// LEVELS. The field's bodies stay the subject. The canopy is authored a good
// stop under the terrain lip (its brightest strand tone is 0.30 against the
// lip's 0.55) and carries the field's own distance-luminance device, so it
// recedes into the fog with everything else instead of laying a bright mat
// under the frame. Most of its MASS is soft ground pools, not strokes — the
// declutter round's own lesson about what a floor should be made of.
//
// BUDGET. Two draw calls: one LineSegments (every strand, every hub spoke)
// and one Points (every glint and pool). Shared geometry is not available
// here — no two strands are the same shape — so the saving is made where it
// is actually available, in the batch: world.js's makeBatch merges the lot
// into two buffers on the chapter's own two shared materials, which means the
// canopy costs the frame two draws however many thousand segments it holds.

import * as THREE from 'three';
import {
  TAU, RING_C, arcOf, cutVal,
  makeRng, gaussOf, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './world.js';
import { makeGlowTexture } from '../../anatomy.js';
import { CAMERA } from './camera.js';

// The rest camera, read from the chapter's own leg (never mirrored — the
// declutter round's stale copy of these numbers was exactly this bug class).
const REST_CAM = (() => {
  const k = CAMERA.keys.find(k => k.note === 'final-rest');
  return {
    x: k.pos.x, y: k.pos.y, z: k.pos.z,
    head: Math.atan2(k.tgt.z - k.pos.z, k.tgt.x - k.pos.x),
  };
})();

const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const wrapPi = (d) => Math.atan2(Math.sin(d), Math.cos(d));

// THE CANOPY DOES NOT KINDLE ON uPull ANY MORE (2026-08-14). Every vertex is
// authored ALWAYS-LIT — world.js's own `aReveal < -0.5` escape hatch — and the
// whole network is gated instead by ONE camera-pure term, SURFACING, written
// on the two materials' own uOpacity by index.js. See §REVEAL below.
const ALWAYS_LIT = -1;

// Distance luminance — ring.js's cloneLum device, re-banded for the floor.
// The canopy runs from the hero's own foot out to the hint band at 46 units,
// so it needs a longer ramp than a body does, and a deeper floor: a far
// strand is a suggestion of continuation, not a stroke.
const lumOf = (d) => 1 - 0.66 * smoothstep(5, 34, d);

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
const T_HAIR = 0, T_SEC = 1, T_LUM = 2;
const LUM_SHARE = 0.10, SEC_SHARE = 0.20;
// tone bands, pre-distance. The old spine band (0.20-0.30) now sits between
// SEC and LUM: the bulk of the network dropped about two thirds, and only the
// trunks went up.
const TONE = [
  { lo: 0.050, hi: 0.082, floor: 0.00 },   // T_HAIR — extremely faint
  { lo: 0.146, hi: 0.205, floor: 0.38 },   // T_SEC  — slightly brighter
  { lo: 0.440, hi: 0.555, floor: 0.55 },   // T_LUM  — genuinely luminous
];
// The luminous band's ceiling is the terrain LIP's own tone (0.55), which is
// this composition's brightest ground feature and the line the whole frame
// hangs on. An artery is allowed to reach it and never to pass it: the ground
// may have a few bright routes running through it, but nothing on the floor
// outranks the soil-line, and nothing on the floor comes near the caps. The
// first cut of this tier stopped at 0.425 and measured well while reading as
// nothing in particular — at 12-25 units, against caps four times brighter,
// that is simply below the frame's threshold for "unmistakable".
const toneOf = (tier, r, lum) => {
  const b = TONE[tier];
  return (b.lo + (b.hi - b.lo) * r) * (b.floor + (1 - b.floor) * lum);
};
// the front pulse / CTA wave respect the same hierarchy, so an interaction
// cannot flatten it back out
const BOOST = [0.16, 0.40, 0.58];
const WAVE = [0, 0.30, 0.45];

// Terrain law, one place.
const LIFT_MIN = 0.020, LIFT_SPAN = 0.030;
// Kept-soil margin. The bodies use 0.4 and the surface strokes 0.25; a strand
// is a long thing and one sample landing in the void reads as a line hanging
// off the lip, so it takes the bodies' margin.
const KEPT = 0.40;

/**
 * @param {object} uniforms  the chapter's shared uniform set (world.js)
 * @param {Array}  seats     one entry per fruiting body in the chapter, from
 *                           ring.js's placement pass:
 *                           { x, z, gy, s, reveal, tier }
 */
export function createFinalCanopy(uniforms, seats) {
  const rand = makeRng(0xCA0BE);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const counts = {};

  const lines = makeBatch();
  const glows = makeBatch();

  const dCam = (x, z) => Math.hypot(x - REST_CAM.x, z - REST_CAM.z);

  /* ================================================================
     1. THE NODES
     ================================================================ */
  // node: { x, z, gy, rev, body, r }   body: is this a fruiting body's seat
  const nodes = [];

  // node 0 IS THE HERO. Everything Prim's walk lays hangs off this one, which
  // is the whole of "an extension of the one that surrounds the main
  // mushroom" expressed as a data structure rather than as a resemblance.
  //
  // Nodes no longer carry a `rev` threshold: the network does not kindle, it
  // is gated whole (see §REVEAL). Nothing else read the field, and dropping it
  // touches no rand() call, so the graph — every node, every edge, every
  // wander — is bit-identical to the shipped one.
  nodes.push({ x: 0, z: 0, gy: groundY(0, 0), body: true, r: 0.62 });

  // every other fruiting body in the chapter, seated exactly where it stands
  for (const s of seats) {
    nodes.push({
      x: s.x, z: s.z, gy: s.gy,
      body: true,
      // the strand leaves the stipe's own footprint rather than starting
      // inside the flesh — the same seat rule ring.js's §8 stubs obey
      r: Math.max(0.10, s.s * 0.42),
    });
  }
  const nBody = nodes.length;

  /* ---- waypoints: the canopy's own vertices ----------------------------
     A graph over bodies alone is a constellation: its edges are 4-12 units
     long and every one of them is a single unbroken run. Real mycelium
     branches at points that are not fruiting bodies, and the eye needs those
     points, because they are what turns a set of connections into a fabric.
     So the network carries its own nodes (OWNED's substrate.js §WEB makes
     exactly this argument for exactly this reason), authored where the frame
     can see them: about the rest gaze, out to the hint band, on kept soil,
     minimum-spaced so they never clot. ---- */
  const WAY_N = 96, WAY_SEP = 1.45;
  {
    let guard = 0;
    while (nodes.length - nBody < WAY_N && guard++ < WAY_N * 60) {
      let x, z;
      if (rand() < 0.30) {
        // the ring band itself — the canopy is densest where the colony is
        const a = rand() * TAU, r = 4.6 + rand() * 5.0;
        x = RING_C.x + Math.cos(a) * r;
        z = RING_C.z + Math.sin(a) * r;
      } else {
        // and out through the field, authored in the rest frame like the
        // bodies it has to knit together
        const rel = -0.62 + rand() * 1.30;
        const dist = 4.0 + Math.pow(rand(), 1.15) * 34;
        const th = REST_CAM.head + rel;
        x = REST_CAM.x + Math.cos(th) * dist + gauss() * 1.1;
        z = REST_CAM.z + Math.sin(th) * dist + gauss() * 1.1;
      }
      if (cutVal(x, z) < KEPT) continue;
      let ok = true;
      for (const n of nodes) {
        const dx = n.x - x, dz = n.z - z;
        if (dx * dx + dz * dz < WAY_SEP * WAY_SEP) { ok = false; break; }
      }
      if (!ok) continue;
      nodes.push({ x, z, gy: groundY(x, z), body: false, r: 0 });
    }
  }

  // (A waypoint used to take an inverse-distance blend of the three nearest
  // seats' thresholds, so the ground between two members lit as those members
  // lit. There are no thresholds now — the network is whole before the lens
  // clears the soil — so the blend is gone with them. It called no rand().)

  /* ================================================================
     2. THE GRAPH — spanning tree first, then the web
     ================================================================ */
  const N = nodes.length;
  const d2Of = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z;
    return dx * dx + dz * dz;
  };
  const edges = [];                    // { a, b, spine, kind }
  const seen = new Set();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  // `kind` distinguishes the three passes below. It carries no geometry — it
  // is what the load hierarchy reads: only a TREE edge has a parent/child
  // orientation and therefore a load, and b is always the child.
  const addEdge = (a, b, spine, kind) => {
    const k = key(a, b);
    if (a === b || seen.has(k)) return false;
    seen.add(k);
    edges.push({ a, b, spine, kind });
    return true;
  };
  // the rooted tree, recorded as Prim's lays it: parent[] and the insertion
  // order, which is all a subtree accumulation needs (a reverse walk of the
  // insertion order visits every child before its parent, by construction).
  const parent = new Int32Array(N).fill(-1);
  const order = [];

  // ---- Prim's, from the hero. O(N^2) on ~180 nodes: 32k comparisons at
  // build, once. What it buys is the only structural guarantee this file
  // makes — ONE component, so there is no orphan strand anywhere in the
  // field and no body standing on ground that leads nowhere.
  {
    const inTree = new Uint8Array(N);
    const best = new Float64Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(0);
    inTree[0] = 1;
    for (let j = 1; j < N; j++) best[j] = d2Of(0, j);
    for (let it = 1; it < N; it++) {
      let pick = -1, pd = Infinity;
      for (let j = 0; j < N; j++) if (!inTree[j] && best[j] < pd) { pd = best[j]; pick = j; }
      if (pick < 0) break;
      inTree[pick] = 1;
      parent[pick] = from[pick];
      order.push(pick);
      addEdge(from[pick], pick, true, 'tree');
      for (let j = 0; j < N; j++) {
        if (inTree[j]) continue;
        const d = d2Of(pick, j);
        if (d < best[j]) { best[j] = d; from[j] = pick; }
      }
    }
  }

  // ---- the web: short nearest-neighbour cross-links. A spanning tree has no
  // cycles, and a network with no cycles reads as drainage. These are what
  // make it mesh — and they are capped SHORT (4.6 units), because a long
  // cross-link is a line across the floor rather than a piece of fabric.
  const CROSS_R2 = 4.6 * 4.6;
  for (let i = 0; i < N; i++) {
    const near = [];
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const d = d2Of(i, j);
      if (d < CROSS_R2) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    const want = 1 + (rand() < 0.42 ? 1 : 0);
    for (let k = 0, made = 0; k < near.length && made < want; k++) {
      if (addEdge(i, near[k].j, false, 'cross')) made++;
    }
  }

  // ---- and the link the brief is actually about: BODY TO BODY. The two
  // passes above join bodies through waypoints most of the time, which reads
  // as connection but does not state it. Every body also reaches its nearest
  // neighbouring BODY directly whenever one is close enough to make a strand
  // rather than a cable, so the frame carries unbroken foot-to-foot runs.
  const BODY_R2 = 7.2 * 7.2;
  let bodyLinks = 0;
  for (let i = 0; i < nBody; i++) {
    let bj = -1, bd = BODY_R2;
    for (let j = 0; j < nBody; j++) {
      if (j === i) continue;
      const d = d2Of(i, j);
      if (d < bd) { bd = d; bj = j; }
    }
    if (bj >= 0 && addEdge(i, bj, true, 'body')) bodyLinks++;
  }

  /* ---- LOAD: how many fruiting bodies route through each tree edge.
     One reverse walk of Prim's insertion order. No rand(), no geometry. ---- */
  const load = new Float64Array(N);
  for (let i = 0; i < N; i++) if (nodes[i].body) load[i] = 1;
  for (let k = order.length - 1; k >= 0; k--) {
    const v = order[k], p = parent[v];
    if (p >= 0) load[p] += load[v];
  }

  /* ================================================================
     3. THE STRANDS
     ================================================================ */
  // One edge, drawn as CONNECT's ground tendril: a meandering surface run,
  // two harmonics of lateral wander windowed to zero at both ends so the
  // strand meets its nodes EXACTLY (a root that misses the foot it grows from
  // is the whole failure this file exists to avoid), every vertex on the
  // terrain law, every sample tested against the cutaway.
  const degree = new Int32Array(N);
  const lumNode = new Uint8Array(N);   // this node has a luminous strand on it
  const tierSegs = [0, 0, 0];          // the reported hierarchy, counted as built
  let dropped = 0;
  /** The trimmed run of an edge — pulled out of strand() so the tier
   *  pre-pass can size every edge in segments WITHOUT drawing it, and
   *  without touching the rng. Returns null for an edge too short to draw,
   *  which is exactly strand()'s own two early returns. */
  function trimOf(e) {
    const A = nodes[e.a], B = nodes[e.b];
    const dx = B.x - A.x, dz = B.z - A.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) return null;
    const ux = dx / d, uz = dz / d;
    // leave each node at its own seat radius, so a strand starts at the edge
    // of the stipe's footprint and not inside the flesh
    const s0 = Math.min(A.r, d * 0.3), s1 = Math.min(B.r, d * 0.3);
    const ax = A.x + ux * s0, az = A.z + uz * s0;
    const bx = B.x - ux * s1, bz = B.z - uz * s1;
    const ex = bx - ax, ez = bz - az;
    const len = Math.hypot(ex, ez);
    if (len < 0.18) return null;
    return { ax, az, ex, ez, len, SEG: Math.max(4, Math.min(14, Math.round(len / 0.46))) };
  }
  function strand(e, tier) {
    const t = trimOf(e);
    if (!t) return;
    const { ax, az, ex, ez, len, SEG } = t;
    const px = -ez / len, pz = ex / len;
    // WANDER. The first cut of this file used a third of this amplitude and
    // one harmonic, and the result was legible but wrong: at the rest the
    // canopy read as a TRIANGULATION — long straight chords meeting at
    // vertices, which is a diagram of a network rather than a network. Two
    // things fix it and both are CONNECT's own ("no straight runs, no right
    // angles"): enough amplitude that no run reads as a chord, and a second
    // harmonic at an incommensurate phase so the wander does not resolve into
    // a single clean bow. It still saturates — a 12-unit strand that wanders
    // two units is a river, not a root.
    let amp = Math.min(1.50, len * 0.235) * (0.45 + rand() * 0.95);
    const k2 = 0.32 + rand() * 0.55, ph = rand() * TAU;
    const k3 = 0.16 + rand() * 0.22, ph3 = rand() * TAU;

    const sample = (t, a) => {
      const w = Math.sin(Math.PI * t);
      const off = a * w * (1 + k2 * Math.sin(TAU * t + ph)
                             + k3 * Math.sin(TAU * 2.3 * t + ph3));
      return [ax + ex * t + px * off, az + ez * t + pz * off];
    };
    // a strand that would cross the lip straightens first and is dropped only
    // if even the straight run leaves the soil
    for (let pass = 0; pass < 2; pass++) {
      let ok = true;
      for (let j = 0; j <= SEG; j++) {
        const p = sample(j / SEG, amp);
        if (cutVal(p[0], p[1]) < KEPT * 0.75) { ok = false; break; }
      }
      if (ok) break;
      if (pass === 0) amp = 0;
      else { dropped++; return; }
    }

    degree[e.a]++; degree[e.b]++;
    const mid = sample(0.5, amp);
    const lum = lumOf(dCam(mid[0], mid[1]));
    // TONE IS THE TIER (see §HIERARCHY at the head of the file). This used to
    // be `e.spine ? 0.20 + rand()*0.10 : 0.115 + rand()*0.055`, i.e. graph
    // role. It is load rank now — but it still draws EXACTLY ONE rand(), in
    // exactly this position, so the rng stream and therefore every vertex
    // position in the graph is bit-identical to the shipped canopy. This pass
    // moves levels, not geometry.
    const t0 = toneOf(tier, rand(), lum);
    tierSegs[tier] += SEG;
    const tw = rand() * TAU;
    const arc = arcOf(mid[0], mid[1]);
    const meta = {
      arc, tw,
      // the growth-front pulse and the CTA wave breathe through the ground
      // as well as through the bodies — this IS the colony, and terrain.js's
      // own front carriers already established the reading. Tiered, so an
      // interaction cannot flatten the hierarchy back out.
      boost: BOOST[tier],
      // rhizomorph cords carry slow outward waves (terrain.js §4). A spine
      // strand is the same organ at the surface, so it carries the same.
      wave: WAVE[tier],
    };
    if (tier === T_LUM) { lumNode[e.a] = 1; lumNode[e.b] = 1; }
    // There used to be a TRAVELLING FRONT here: one threshold per segment,
    // lerped along the A->B run, so light ran down a strand from the body that
    // kindled first to the one that had not. The strand is simply present now
    // (§REVEAL), so every segment is ALWAYS_LIT and the run appears whole.
    let prev = null, prevT = 0;
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const p = sample(t, amp);
      const y = groundY(p[0], p[1]) + LIFT_MIN + rand() * LIFT_SPAN;
      // a taper: brightest at the two feet, thinnest in the middle of the run
      const shade = 0.62 + 0.38 * Math.abs(2 * t - 1);
      if (prev) {
        lines.seg(prev[0], prev[1], prev[2], p[0], y, p[1],
          Math.min(0.9, t0 * prevT), Math.min(0.9, t0 * shade),
          { ...meta, reveal: ALWAYS_LIT });
      }
      prev = [p[0], y, p[1]];
      prevT = shade;
    }

    /* ---- HAIRLINES. The hero's own §8 ground network is not a graph of
       cords: it is cords WITH FINE THREAD around them (organism.js's mycelium
       threads, CONNECT's "hairline fill knitting the sector together"). Two
       or three short offshoots leaving a spine at an oblique angle and dying
       out are what stop the canopy reading as a wireframe of itself, and they
       are the cheapest density in the file — three segments each, on the same
       batch, at a third of the tone.

       HIERARCHY: a hairline is ALWAYS the faint tier, whatever it grows off.
       It used to be a fraction of its parent's tone, which meant a hairline
       leaving a trunk was brighter than a whole cross-link elsewhere and the
       three levels smeared together at every junction. It keeps a small
       parent bonus (a thread off an artery is a touch warmer than one off a
       capillary) and nothing more. ---- */
    if (!e.spine || len < 1.2) return;
    const nH = rand() < 0.55 ? 2 : 1;
    for (let h = 0; h < nH; h++) {
      const t = 0.2 + rand() * 0.6;
      const root = sample(t, amp);
      const side = rand() < 0.5 ? 1 : -1;
      // oblique, never square to the parent — fungal branching, not dendritic
      const base = Math.atan2(ez, ex) + side * (0.42 + rand() * 0.55);
      let hx = root[0], hz = root[1], a = base;
      let hy = groundY(hx, hz) + LIFT_MIN;
      const HS = 3;
      const hl = 0.34 + rand() * 0.95;
      // one rand(), same position in the stream as the old
      // `t0 * (0.42 + rand()*0.22)` — the hairline's geometry is untouched.
      const tone = toneOf(T_HAIR, rand(), lum) * (1 + 0.16 * tier);
      for (let k = 0; k < HS; k++) {
        a += gauss() * 0.42;
        const step = hl / HS;
        const qx = hx + Math.cos(a) * step, qz = hz + Math.sin(a) * step;
        if (cutVal(qx, qz) < KEPT * 0.75) break;
        const qy = groundY(qx, qz) + LIFT_MIN + rand() * LIFT_SPAN;
        const f0 = 1 - k / HS, f1 = 1 - (k + 1) / HS;
        lines.seg(hx, hy, hz, qx, qy, qz,
          Math.min(0.9, tone * f0), Math.min(0.9, tone * f1),
          { arc: meta.arc, reveal: ALWAYS_LIT, tw: rand() * TAU, boost: BOOST[T_HAIR] });
        tierSegs[T_HAIR]++;
        hx = qx; hy = qy; hz = qz;
      }
    }
  }
  /* ================================================================
     3b. THE ARTERIES — the connections you are meant to actually see
     ================================================================
     > "Redistribute some of that detail between the mushroom bases. Have
     >  subtle strands visibly originate underneath one mushroom, branch,
     >  disappear into the terrain, and resurface near another."
     >  ... "I'd make maybe 5-8 specific connections between mushrooms more
     >  legible. That would make it feel richer and more 3D while
     >  paradoxically using fewer lines."

     The canopy already ran a strand between every pair of neighbouring feet
     — §2's body-to-body pass is exactly that — and it was not legible,
     because it was drawn at the same level as the eight hundred other
     strands around it. Legibility here is not a connection that EXISTS, it
     is a connection that OUTRANKS its surroundings. So an artery is not new
     connectivity dressed up; it is the same organ given the top tier, a
     branch, and a passage under the soil.

     THE DIP IS THE WHOLE POINT, and it is what makes the frame read as 3D
     rather than as a floor plan. A strand that runs unbroken from foot to
     foot is a line on a plane. A strand that leaves one mushroom, sinks out
     of sight, and comes back up near another states that the ground has a
     volume and that the network is inside it — the eye supplies the buried
     middle for free, and supplying it is what makes it feel like one
     organism rather than one drawing. Two mechanisms carry the sink,
     deliberately both: the strand descends BEHIND terrain.js's §0 soil slab
     (opaque, depth-written, drawn first) so it is genuinely occluded, and
     its tone independently tapers to nothing over the last 0.11 of that
     descent so the disappearance is right even on the metres where the
     slab's coarse depth rows interpolate under the true ground.

     SELECTION IS MEASURED IN THE FRAME, NOT IN PLAN. This is 60c7370's
     finding applied forward: a rule that bounds things on the ground says
     nothing about what the lens sees. A pair is a candidate only if it is
     ACROSS the view (|sin| of the run against the sight line >= 0.42 — a
     route pointing at the lens foreshortens to a dot however long it is),
     inside the frame's bearing, at a readable depth, and standing on soil
     with room to submerge. Then the picks are spread: no two arteries may
     share a bearing and a depth, so the seven land across the composition
     instead of stacking in the one sector that scores best.

     PAIRS THE GRAPH HAS NOT ALREADY WIRED are preferred (`seen`), so an
     artery is never a second stroke laid over an existing one — no rails,
     and the connectivity is genuinely added rather than doubled.

     A FRESH RNG, and this block draws into the same two batches AFTER the
     graph is complete but BEFORE the strand loop, so it costs no draw call,
     changes no node, and does not touch the main rng stream: every vertex
     of the shipped canopy is where it was. */
  const arteries = [];
  {
    const cand = [];
    for (let i = 0; i < nBody; i++) {
      const A = nodes[i];
      const dA = dCam(A.x, A.z);
      if (dA < 6.5 || dA > 27) continue;
      for (let j = i + 1; j < nBody; j++) {
        const B = nodes[j];
        const dB = dCam(B.x, B.z);
        if (dB < 6.5 || dB > 27) continue;
        const dx = B.x - A.x, dz = B.z - A.z;
        const d = Math.hypot(dx, dz);
        // long enough to be a journey, short enough to be a strand
        if (d < 2.6 || d > 8.6) continue;
        if (seen.has(key(i, j))) continue;
        const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
        if (cutVal(mx, mz) < 1.2) continue;         // room to submerge
        const vx = mx - REST_CAM.x, vz = mz - REST_CAM.z;
        const dm = Math.hypot(vx, vz);
        // ACROSS the view, not along it
        const across = Math.abs((dx / d) * (vz / dm) - (dz / d) * (vx / dm));
        if (across < 0.42) continue;
        const rel = wrapPi(Math.atan2(vz, vx) - REST_CAM.head);
        if (Math.abs(rel) > 0.62) continue;          // inside the frame
        const size = Math.min(A.r, B.r);
        if (size < 0.09) continue;                   // two real mushrooms
        cand.push({ i, j, mx, mz, rel, dm,
                    score: across * (1 + size * 2.2) * (1 - dm / 40) });
      }
    }
    cand.sort((a, b) => b.score - a.score);
    const ROUTES = 8;   // the top of her stated 5-8, and what lands the
                        // luminous tier on its share (see canopyLumTarget)
    for (const c of cand) {
      if (arteries.length >= ROUTES) break;
      let ok = true;
      for (const p of arteries) {
        if (Math.abs(p.rel - c.rel) < 0.115 && Math.abs(p.dm - c.dm) < 9) { ok = false; break; }
        if (Math.hypot(p.mx - c.mx, p.mz - c.mz) < 3.2) { ok = false; break; }
      }
      if (ok) arteries.push(c);
    }
  }

  let artSegs = 0, artNodes = 0, artBranches = 0, artConverge = 0;
  {
    const ar = makeRng(0x0A47E71E);          // 'artery'
    for (const c of arteries) {
      const A = nodes[c.i], B = nodes[c.j];
      degree[c.i]++; degree[c.j]++;
      lumNode[c.i] = 1; lumNode[c.j] = 1;
      const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
      const ux = dx / d, uz = dz / d;
      const s0 = Math.min(A.r, d * 0.26), s1 = Math.min(B.r, d * 0.26);
      const ax = A.x + ux * s0, az = A.z + uz * s0;
      const ex = (B.x - ux * s1) - ax, ez = (B.z - uz * s1) - az;
      const len = Math.hypot(ex, ez);
      if (len < 1.0) continue;
      const px = -ez / len, pz = ex / len;
      // one confident bow, not the graph strand's two-harmonic meander: an
      // artery is a route, and a route has a direction
      const amp = Math.min(2.0, len * 0.24) * (0.70 + ar() * 0.60) * (ar() < 0.5 ? -1 : 1);
      const k2 = 0.28 + ar() * 0.46, ph = ar() * TAU;
      const sample = (t) => {
        const w = Math.sin(Math.PI * t);
        const off = amp * w * (1 + k2 * Math.sin(TAU * t + ph));
        return [ax + ex * t + px * off, az + ez * t + pz * off];
      };
      // the submerged passage: a fast dive, a flat floor, a fast rise
      const t1 = 0.30 + ar() * 0.09, t2 = 0.60 + ar() * 0.12;
      const DEEP = 0.75 + ar() * 0.55;
      const dipOf = (t) => {
        if (t <= t1 || t >= t2) return 0;
        const u = (t - t1) / (t2 - t1);
        return -DEEP * smoothstep(0, 0.26, u) * smoothstep(0, 0.26, 1 - u);
      };
      const SEG = Math.max(14, Math.min(52, Math.round(len / 0.28)));
      const lum = lumOf(c.dm);
      const t0 = toneOf(T_LUM, ar(), lum);
      const arc = arcOf(c.mx, c.mz);
      const meta = { arc, tw: ar() * TAU, boost: BOOST[T_LUM], wave: WAVE[T_LUM],
                     reveal: ALWAYS_LIT };

      /* THE TWIN STROKE. A single polyline at any tone is a THREAD, and the
         first cut of this block proved it: seven of them at the top tier were
         legible only if you already knew where to look. terrain.js §4 solved
         the same problem for the rhizomorph cords and this borrows its answer
         whole — a companion stroke a breathing gap to one side at 0.62 of the
         tone, the gap running on two incommensurate harmonics so the pair
         never resolves into two machined rails. What the eye gets is one cord
         with a lit core: an ARTERY, which is a different kind of object from
         the hairlines around it rather than a brighter one. It is also why
         these can be legible without being loud — the reading is carried by
         the doubling, not by luminance, which is what keeps them inside a
         composition whose whole brief is "quieter". */
      const gapPh = ar() * TAU, gapPh2 = ar() * TAU;
      const gapAt = (t) => 0.030 + 0.021 * Math.sin(TAU * 1.7 * t + gapPh)
                                 + 0.014 * Math.sin(TAU * 3.1 * t + gapPh2);
      const meta2 = { ...meta, tw: ar() * TAU };
      let prev = null, prevF = 0, prevShade = 0, prevC = null;
      let sank = null, rose = null;
      for (let j = 0; j <= SEG; j++) {
        const t = j / SEG;
        const p = sample(t);
        const dip = dipOf(t);
        const y = groundY(p[0], p[1]) + LIFT_MIN + 0.014 + dip;
        // dissolve into the soil over the last 0.11 of the descent
        const f = Math.max(0, Math.min(1, 1 + dip / 0.11));
        const shade = (0.70 + 0.30 * Math.abs(2 * t - 1)) * f;
        const on = f > 0.02 && cutVal(p[0], p[1]) >= KEPT * 0.75;
        const g = gapAt(t) * 1.6;
        const cx = p[0] + px * g, cz = p[1] + pz * g;
        const cy = groundY(cx, cz) + LIFT_MIN + 0.010 + dip;
        if (prev && (on || prevF > 0.02)) {
          lines.seg(prev[0], prev[1], prev[2], p[0], y, p[1],
            Math.min(0.9, t0 * prevShade), Math.min(0.9, t0 * shade), meta);
          lines.seg(prevC[0], prevC[1], prevC[2], cx, cy, cz,
            Math.min(0.9, t0 * 0.70 * prevShade), Math.min(0.9, t0 * 0.70 * shade), meta2);
          artSegs += 2; tierSegs[T_LUM] += 2;
        }
        if (prevF > 0.02 && !on && !sank) sank = prev;      // the surface break
        if (prevF <= 0.02 && on && sank && !rose) rose = [p[0], y, p[1]];
        prev = [p[0], y, p[1]]; prevF = on ? f : 0; prevShade = shade;
        prevC = [cx, cy, cz];
      }

      /* THE Y-BRANCH. A route that forks and whose fork ARRIVES SOMEWHERE is
         the difference between a network and a diagram — she asks for "little
         Y-shaped branches, convergences" by name. The fork is placed clear of
         the submerged passage (a branch nobody can see is not a branch), and
         if a third mushroom stands within reach the fork goes to ITS foot,
         which is a three-body convergence for the price of one strand. */
      const tb = ar() < 0.5 ? 0.10 + ar() * (t1 - 0.16)
                            : t2 + 0.06 + ar() * (0.86 - t2);
      const rp = sample(tb);
      let tgt = -1, td2 = 4.4 * 4.4;
      for (let n = 0; n < nBody; n++) {
        if (n === c.i || n === c.j) continue;
        const q = nodes[n];
        const q2 = (q.x - rp[0]) ** 2 + (q.z - rp[1]) ** 2;
        if (q2 < td2 && q2 > 0.6) { td2 = q2; tgt = n; }
      }
      {
        const conv = tgt >= 0;
        let gx, gz;
        if (conv) {
          const q = nodes[tgt];
          const bl = Math.hypot(q.x - rp[0], q.z - rp[1]);
          gx = q.x - ((q.x - rp[0]) / bl) * Math.min(q.r, bl * 0.3);
          gz = q.z - ((q.z - rp[1]) / bl) * Math.min(q.r, bl * 0.3);
          artConverge++;
        } else {
          // oblique off the parent, never square — the file's own branch rule
          const bang = Math.atan2(ez, ex) + (ar() < 0.5 ? 1 : -1) * (0.55 + ar() * 0.55);
          const bl = 1.3 + ar() * 1.5;
          gx = rp[0] + Math.cos(bang) * bl; gz = rp[1] + Math.sin(bang) * bl;
        }
        const bex = gx - rp[0], bez = gz - rp[1];
        const blen = Math.hypot(bex, bez);
        const bpx = -bez / blen, bpz = bex / blen;
        const bamp = Math.min(0.75, blen * 0.20) * (ar() < 0.5 ? -1 : 1);
        const BS = Math.max(4, Math.min(20, Math.round(blen / 0.30)));
        const bt = toneOf(conv ? T_SEC : T_HAIR, ar(), lum) * (conv ? 1.25 : 1.5);
        const bmeta = { arc, tw: ar() * TAU, boost: BOOST[conv ? T_SEC : T_HAIR],
                        wave: WAVE[conv ? T_SEC : T_HAIR], reveal: ALWAYS_LIT };
        let bp = null, bpt = 0;
        let bOk = true;
        for (let j = 0; j <= BS; j++) {
          const t = j / BS;
          const w = Math.sin(Math.PI * t);
          const qx = rp[0] + bex * t + bpx * bamp * w;
          const qz = rp[1] + bez * t + bpz * bamp * w;
          if (cutVal(qx, qz) < KEPT * 0.75) { bOk = false; break; }
          const qy = groundY(qx, qz) + LIFT_MIN + 0.010;
          // a fork that converges holds its level; one that does not dies out
          const sh = conv ? (0.72 + 0.28 * t) : Math.max(0, 1 - t) ** 1.3;
          if (bp) {
            lines.seg(bp[0], bp[1], bp[2], qx, qy, qz,
              Math.min(0.9, bt * bpt), Math.min(0.9, bt * sh), bmeta);
            artSegs++; tierSegs[conv ? T_SEC : T_HAIR]++;
          }
          bp = [qx, qy, qz]; bpt = sh;
        }
        if (bOk && bp) {
          artBranches++;
          // the fork itself is a node — the confluence the eye looks for
          glows.pt(rp[0], groundY(rp[0], rp[1]) + 0.045, rp[1],
            Math.min(0.9, toneOf(T_LUM, 0.35, lum) * 0.92), 0.085 + ar() * 0.045,
            { arc, reveal: ALWAYS_LIT, tw: ar() * TAU, boost: 0.7 });
          artNodes++;
          if (conv) {
            degree[tgt]++; lumNode[tgt] = 1;
          }
        }
      }

      // NODES. Both feet, and the two places the strand meets the soil line —
      // the surface breaks are marked, so "it went under here and came up
      // there" is stated rather than left to be noticed.
      for (const [nx, nz, sz] of [[A.x, A.z, 0.15], [B.x, B.z, 0.15]]) {
        glows.pt(nx, groundY(nx, nz) + 0.048, nz,
          Math.min(0.9, toneOf(T_LUM, 0.85, lumOf(dCam(nx, nz)))),
          sz + ar() * 0.055,
          { arc, reveal: ALWAYS_LIT, tw: ar() * TAU, boost: 0.9 });
        artNodes++;
      }
      for (const q of [sank, rose]) {
        if (!q) continue;
        glows.pt(q[0], groundY(q[0], q[2]) + 0.038, q[2],
          Math.min(0.9, toneOf(T_LUM, 0.20, lum) * 0.80), 0.070 + ar() * 0.030,
          { arc, reveal: ALWAYS_LIT, tw: ar() * TAU, boost: 0.55 });
        artNodes++;
      }
    }
  }

  /* ================================================================
     3c. THE SWEEPING ARCS — one organism, stated as a curve
     ================================================================
     > "Give the fairy ring 2-3 partially visible sweeping arcs underneath it.
     >  Not an obvious glowing circle, but enough curved connectivity that
     >  your brain subconsciously understands that these mushrooms belong to
     >  one organism/network."

     Everything else in this file is a CHORD: the graph's edges run point to
     point, and a hundred chords between scattered nodes read as a mesh, which
     is a texture, not a body. A fairy ring is the visible rim of an organism
     that grew outward from one point, and the only mark that says so is
     curvature that agrees with the ring. Three arcs concentric with RING_C —
     one inside the member band, one through it, one outside — give the eye
     three samples of the same circle, and three samples are enough to infer
     the circle without ever drawing it.

     WHY IT IS NOT A GLOWING CIRCLE, which she rules out explicitly, in four
     separate ways:
       · each arc covers only the azimuth span that is actually IN FRAME at
         the rest, found by scanning for the longest contiguous run that is on
         kept soil, at a readable depth and inside the bearing — never
         authored, so it survives any reseed of the field;
       · each is broken by two or three SUBMERGED wells on the arteries' own
         dip mechanism, so it surfaces in three or four separate passages;
       · its radius wobbles on two incommensurate harmonics, because world.js
         says it in the ring's own header — "fairy rings are never true
         circles";
       · only ONE window of each arc is luminous. The rest is the secondary
         tier, and the two ends fade out rather than stopping.

     ATTACHMENT: an arc is not floating furniture. It is drawn on the terrain
     law like every other vertex here, and wherever it passes within 1.15 of a
     fruiting body's seat it takes that body as a node — a luminous glint on
     the foot, and the body's degree goes up. That is the arc visibly running
     THROUGH the mushrooms rather than past them, which is the reading the
     brief is asking for. */
  let arcSegs = 0, arcNodes = 0, arcsMade = 0, arcTouch = 0;
  {
    const rr = makeRng(0x5717A2C5);          // 'arcs'
    for (const r0 of [5.65, 7.70, 9.85]) {
      const p1 = rr() * TAU, p2 = rr() * TAU;
      const at = (a) => {
        const r = r0 * (1 + 0.050 * Math.sin(3 * a + p1) + 0.032 * Math.sin(5.3 * a + p2));
        return [RING_C.x + Math.cos(a) * r, RING_C.z + Math.sin(a) * r];
      };
      const okAt = (a) => {
        const p = at(a);
        if (cutVal(p[0], p[1]) < KEPT) return false;
        const dm = dCam(p[0], p[1]);
        if (dm < 5.5 || dm > 27) return false;
        return Math.abs(wrapPi(Math.atan2(p[1] - REST_CAM.z, p[0] - REST_CAM.x)
          - REST_CAM.head)) < 0.66;
      };
      // longest contiguous frame-valid run, scanned twice round so a run that
      // straddles a = 0 is not split by the seam
      const STEPS = 360;
      let bestA = 0, bestN = 0, curA = 0, curN = 0;
      for (let k = 0; k < STEPS * 2; k++) {
        const a = ((k % STEPS) / STEPS) * TAU;
        if (okAt(a)) {
          if (curN === 0) curA = a;
          curN++;
          if (curN > bestN && curN <= STEPS) { bestN = curN; bestA = curA; }
        } else curN = 0;
      }
      if (bestN < 26) continue;                       // nothing worth drawing
      const run = (bestN / STEPS) * TAU;
      // a SWEEP, not a segment: the span takes as much of the frame-valid run
      // as it can get. The first cut capped it at 1.55 rad and the arcs were
      // not findable in the frame at all — too short to read as curvature,
      // which is the only thing they are here to supply.
      const span = Math.min(run * 0.90, 2.30);
      const a0 = bestA + (run - span) * 0.5;
      const NS = Math.max(10, Math.min(150, Math.round((r0 * span) / 0.24)));

      // two or three submerged wells
      const wells = 2 + ((rr() * 2) | 0);
      const W = [];
      for (let w = 0; w < wells; w++)
        W.push({ c: (w + 0.5 + (rr() - 0.5) * 0.55) / wells,
                 hw: 0.055 + rr() * 0.075, d: 0.70 + rr() * 0.60 });
      const dipAt = (u) => {
        let y = 0;
        for (const w of W) {
          const t = Math.abs(u - w.c) / w.hw;
          if (t < 1) y -= w.d * smoothstep(0, 1, 1 - t);
        }
        return y;
      };
      const lumC = 0.18 + rr() * 0.60, lumHw = 0.10 + rr() * 0.08;
      const rBase = rr(), tw = rr() * TAU;

      let prev = null, prevF = 0, prevTone = 0, drew = 0;
      for (let k = 0; k <= NS; k++) {
        const u = k / NS;
        const a = a0 + span * u;
        const p = at(a);
        const dip = dipAt(u);
        const y = groundY(p[0], p[1]) + LIFT_MIN + 0.012 + dip;
        const f = Math.max(0, Math.min(1, 1 + dip / 0.11));
        // ends fade out rather than stopping dead
        const endF = smoothstep(0, 0.12, u) * smoothstep(0, 0.12, 1 - u);
        const tier = Math.abs(u - lumC) < lumHw ? T_LUM : T_SEC;
        const lum = lumOf(dCam(p[0], p[1]));
        const tone = toneOf(tier, rBase, lum) * f * endF;
        const on = f > 0.02 && endF > 0.02 && cutVal(p[0], p[1]) >= KEPT * 0.75;
        if (prev && (on || prevF > 0.02)) {
          lines.seg(prev[0], prev[1], prev[2], p[0], y, p[1],
            Math.min(0.9, prevTone), Math.min(0.9, tone),
            { arc: arcOf(p[0], p[1]), reveal: ALWAYS_LIT, tw,
              boost: BOOST[tier], wave: WAVE[tier] });
          arcSegs++; tierSegs[tier]++; drew++;
        }
        // the arc takes any foot it runs through as a node
        if (on) {
          for (let n = 0; n < nBody; n++) {
            const q = nodes[n];
            if (Math.hypot(q.x - p[0], q.z - p[1]) > 1.15) continue;
            if (lumNode[n]) continue;
            lumNode[n] = 1; degree[n]++; arcTouch++;
            glows.pt(q.x, q.gy + 0.046, q.z,
              Math.min(0.9, toneOf(T_LUM, 0.55, lumOf(dCam(q.x, q.z))) * 0.9),
              0.10 + rr() * 0.05,
              { arc: arcOf(q.x, q.z), reveal: ALWAYS_LIT, tw: rr() * TAU, boost: 0.75 });
            arcNodes++;
            break;
          }
        }
        prev = [p[0], y, p[1]]; prevF = on ? f : 0; prevTone = tone;
      }
      if (drew) arcsMade++;
    }
  }

  /* ================================================================
     3d. THE TIER BUDGET — filling her three fractions from the load order
     ================================================================
     Sized against the WHOLE canopy, arteries and arcs included, so those
     spend out of the luminous 10% instead of sitting on top of it. The
     estimate for the graph's own segments is exact (trimOf is deterministic
     and SEG draws no rand); the hairline term is the expected value of the
     `rand() < 0.55 ? 2 : 1` draw, which is the only approximate figure here
     and is worth ~1% of the total. The achieved counts are measured as built
     and reported in `counts` — the budget aims, the counter tells the truth. */
  const edgeTier = new Uint8Array(edges.length);
  {
    const segEst = new Int32Array(edges.length);
    let edgeTotal = 0, hairEst = 0;
    for (let i = 0; i < edges.length; i++) {
      const t = trimOf(edges[i]);
      if (!t) continue;
      segEst[i] = t.SEG;
      edgeTotal += t.SEG;
      if (edges[i].spine && t.len >= 1.2) hairEst += 3 * 1.55;
    }
    const HUB_EST = 8 * 9;                       // hub spokes — SECONDARY
    const TOTAL = edgeTotal + hairEst + artSegs + arcSegs + HUB_EST;
    // The luminous tier is already spent — the arteries and the arcs ARE it.
    // Nothing here can promote a graph edge into it (see §HIERARCHY: that
    // candidate was built, rendered and rejected). LUM_SHARE is therefore a
    // TARGET THE ORGANS ARE SIZED AGAINST, not a budget this loop fills, and
    // the achieved figure is reported from the counter either way.
    let secLeft = SEC_SHARE * TOTAL - tierSegs[T_SEC] - HUB_EST;

    const rank = [];
    for (let i = 0; i < edges.length; i++) {
      if (!segEst[i]) continue;
      const e = edges[i];
      if (e.kind === 'tree') rank.push({ i, load: load[e.b] });
      else if (e.kind === 'body') { edgeTier[i] = T_SEC; secLeft -= segEst[i]; }
      // cross-links are the fabric and stay hairline by definition
    }
    // BRIGHTNESS FOLLOWS FLOW: most bodies behind this edge first.
    rank.sort((a, b) => b.load - a.load || a.i - b.i);
    for (const r of rank) {
      if (secLeft <= 0) break;
      edgeTier[r.i] = T_SEC; secLeft -= segEst[r.i];
    }
  }

  for (let i = 0; i < edges.length; i++) strand(edges[i], edgeTier[i]);

  /* ================================================================
     4. JUNCTIONS — glints, hubs, and the pools that carry the mass
     ================================================================ */
  // Junction glints: "many small bright nodes where threads cross" (OWNED's
  // reference, CONNECT's bead points). One per node that actually got wired,
  // sized by how much of the network passes through it.
  let hubs = 0, lumPts = 0;
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    if (!degree[i]) continue;
    const lum = lumOf(dCam(n.x, n.z));
    const hot = Math.min(1, (degree[i] - 1) / 4);
    // HIERARCHY, on the points as well as the lines. Two hundred glints all
    // at one level is two hundred nodes and therefore no nodes: "occasional
    // glowing nodes" only reads if most junctions are NOT one. An ordinary
    // junction is now a little under half its old tone — present, uncountable
    // — and the ones an artery or an arc actually runs through keep the top
    // tier. The size channel carries the same split, so the difference is
    // there at a glance and not only in the luminance.
    const isLum = !!lumNode[i];
    glows.pt(n.x, n.gy + 0.035, n.z,
      Math.min(0.9, (isLum ? 0.30 + 0.24 * hot : 0.105 + 0.085 * hot) * lum),
      (isLum ? 0.075 + 0.075 * hot : 0.038 + 0.040 * hot) * (0.6 + 0.6 * lum),
      { arc: arcOf(n.x, n.z), reveal: ALWAYS_LIT, tw: rand() * TAU,
        boost: isLum ? 0.6 : 0.28 });
    if (isLum) lumPts++;

    // CONVERGENCE HUBS — the house's hub grammar (CONNECT's radial spokes
    // into a bright core, OWNED's starbursts), kept RARE: only where the
    // graph itself already converges. They are the canopy's own punctuation,
    // and there are six or seven of them, not sixty.
    if (!n.body && degree[i] >= 5 && hubs < 8 && dCam(n.x, n.z) < 26) {
      hubs++;
      const spokes = 7 + Math.floor(rand() * 5);
      for (let k = 0; k < spokes; k++) {
        const a = (k / spokes) * TAU + rand() * 0.3;
        const rr = 0.28 + rand() * 0.42;
        const qx = n.x + Math.cos(a) * rr, qz = n.z + Math.sin(a) * rr;
        if (cutVal(qx, qz) < KEPT * 0.75) continue;
        // a hub's spokes are a quarter of a unit long — they are a mark, not
        // a route, so they sit at SECONDARY and let the hub's own glint carry
        // the punctuation. (They were briefly luminous; eight starbursts at
        // the top tone competed with the seven arteries for the same job.)
        lines.seg(n.x, n.gy + 0.03, n.z, qx, groundY(qx, qz) + 0.025, qz,
          Math.min(0.9, toneOf(T_SEC, 0.85, lum)), Math.min(0.9, 0.10 * lum),
          { arc: arcOf(n.x, n.z), reveal: ALWAYS_LIT, tw: rand() * TAU, boost: 0.8 });
        tierSegs[T_SEC]++;
      }
      glows.pt(n.x, n.gy + 0.05, n.z, Math.min(0.9, 0.52 * lum), 0.22 + rand() * 0.10,
        { arc: arcOf(n.x, n.z), reveal: ALWAYS_LIT, tw: rand() * TAU, boost: 1 });
      lumPts++;
    }
  }

  // SOFT POOLS. The declutter round's own finding: a floor made of strokes is
  // a carpet you can count, and a floor made of broad soft light is ground.
  // So most of the canopy's MASS is here rather than in the batch above —
  // wide, dim, warm pools sitting on the network's own junctions, which is
  // what stops a thousand thin strands from having to be bright enough to
  // read on their own.
  {
    let placed = 0, guard = 0;
    while (placed < 54 && guard++ < 900) {
      const i = Math.floor(rand() * N);
      const n = nodes[i];
      if (!degree[i]) continue;
      const dd = dCam(n.x, n.z);
      if (dd > 30) continue;
      const lum = lumOf(dd);
      glows.pt(n.x + gauss() * 0.25, n.gy + 0.03, n.z + gauss() * 0.25,
        Math.min(0.9, (0.16 + rand() * 0.09) * lum),
        0.85 + rand() * 1.35,
        { arc: arcOf(n.x, n.z), reveal: ALWAYS_LIT, tw: rand() * TAU, boost: 0.3 });
      placed++;
    }
    counts.pools = placed;
  }

  /* ================================================================
     5. TWO DRAWS
     ================================================================ */
  // Strand opacity 0.62 against the lip's 0.72 and the ring's 1.15: the
  // canopy is the ground the subject stands on, and it is levelled to say so.
  const STRAND_OP = 0.62, GLOW_OP = 0.85;
  const strandMat = makeStrandMat(uniforms, STRAND_OP);
  const strandLines = new THREE.LineSegments(lines.geo(), strandMat);
  strandLines.frustumCulled = false;
  group.add(strandLines);

  const glowMat = makePointsMat(uniforms, GLOW_OP, makeGlowTexture());
  const glowPts = new THREE.Points(glows.geo(true), glowMat);
  glowPts.frustumCulled = false;
  group.add(glowPts);

  /** THE ONE GATE (§REVEAL). `v` is index.js's camera-pure surfacedOf().
   *
   *  It rides uOpacity and not a new shared uniform on purpose: makeStrandMat/
   *  makePointsMat build uOpacity as each material's OWN object and merge the
   *  chapter's shared set around it, so writing here reaches the canopy's two
   *  batches and provably nothing else — no other system in the chapter can
   *  see this value. At v = 1 both materials hold the authored constants
   *  above, so the resting composition is the shipped one exactly. */
  function setPresence(v) {
    strandMat.uniforms.uOpacity.value = STRAND_OP * v;
    glowMat.uniforms.uOpacity.value = GLOW_OP * v;
  }
  setPresence(0);          // dark until the orchestrator says otherwise

  counts.canopyNodes = N;
  counts.canopyBodies = nBody;
  counts.canopyEdges = edges.length;
  counts.canopyBodyLinks = bodyLinks;
  counts.canopyDropped = dropped;
  counts.canopyHubs = hubs;
  counts.canopySegs = lines.segCount;
  counts.canopyPts = glows.ptCount;
  // THE HIERARCHY, MEASURED AS BUILT (not as budgeted). Every segment this
  // file emits is counted into exactly one tier at the moment it is emitted,
  // so these three numbers are the frame's own answer to "70 / 20 / 10" and
  // not a restatement of the constants above.
  counts.canopyHair = tierSegs[T_HAIR];
  counts.canopySec = tierSegs[T_SEC];
  counts.canopyLum = tierSegs[T_LUM];
  // What the arteries and the arcs were SIZED against, reported beside what
  // they achieved. The secondary tier is filled to its share by a budget loop
  // and cannot miss; the luminous tier is a fixed amount of authored geometry,
  // so this is the one number in the hierarchy that has to be checked rather
  // than assumed — if a future pass changes the route count or the arc spans,
  // this pair is where it will show.
  counts.canopyLumTarget = Math.round(
    LUM_SHARE * (tierSegs[T_HAIR] + tierSegs[T_SEC] + tierSegs[T_LUM]));
  counts.canopyLumPts = lumPts + artNodes + arcNodes;
  counts.arteries = arteries.length;
  // The routes themselves, as world-space foot pairs. Reported because "5-8
  // specific connections between mushrooms, more legible" is a claim about the
  // FRAME, and a claim about the frame has to be checkable in the frame — this
  // is what a review pass projects to find them. Compact: two points each.
  counts.arteryLinks = arteries.map(c => [
    +nodes[c.i].x.toFixed(2), +nodes[c.i].z.toFixed(2),
    +nodes[c.j].x.toFixed(2), +nodes[c.j].z.toFixed(2),
  ]);
  counts.arterySegs = artSegs;
  counts.arteryNodes = artNodes;
  counts.arteryBranches = artBranches;
  counts.arteryConverge = artConverge;
  counts.ringArcs = arcsMade;
  counts.ringArcSegs = arcSegs;
  counts.ringArcTouch = arcTouch;

  return { group, counts, setPresence };
}
