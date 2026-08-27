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
// The committed-bytes read (canopy-baked.js) sits in the import slot
// ../../lib/baked.js used to occupy, and the authoring law (canopy-levels.js)
// in ./camera.js's, so the first evaluation of both is where it was.
import { readBakedCanopy } from './canopy-baked.js';
import {
  REST_CAM, ALWAYS_LIT, lumOf, T_HAIR, T_SEC, T_LUM, LUM_SHARE, SEC_SHARE,
  toneOf, BOOST, WAVE, LIFT_MIN, LIFT_SPAN, KEPT, dCam,
} from './canopy-levels.js';
import { layArteries, layArcs } from './canopy-routes.js';

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

  // The committed-bytes read (canopy-baked.js). Its full rationale — what is
  // skipped, what stays live either way, and the ONE try/catch that wraps the
  // whole read — travels with the reader it documents.
  const baked = readBakedCanopy();

  const lines = makeBatch();
  const glows = makeBatch();

  if (!baked) {

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

  /* §3b THE ARTERIES and §3c THE SWEEPING ARCS — the two passes that are
     authored rather than derived from the graph, each on its own generators.
     Both are canopy-routes.js's; their arguments and their rationale travel
     with them. They run here, in this order, exactly where they ran when
     they were inline: after the graph is complete and before the tier
     budget, so every vertex of the shipped canopy is where it was. */
  const { arteries, artSegs, artNodes, artBranches, artConverge } =
    layArteries({ nodes, nBody, seen, key, lines, glows, degree, lumNode, tierSegs });
  const { arcSegs, arcNodes, arcsMade, arcTouch } =
    layArcs({ nodes, nBody, lines, glows, degree, lumNode, tierSegs });

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
  } else {
    // Baked: the graph build never ran, so every count (including the
    // world-space arteryLinks pairs) round-trips from the payload (2026-08-17).
    Object.assign(counts, baked.counts);
  }

  /* ================================================================
     5. TWO DRAWS
     ================================================================ */
  // Strand opacity 0.62 against the lip's 0.72 and the ring's 1.15: the
  // canopy is the ground the subject stands on, and it is levelled to say so.
  const STRAND_OP = 0.62, GLOW_OP = 0.85;
  const strandMat = makeStrandMat(uniforms, STRAND_OP);
  const strandLines = new THREE.LineSegments(baked ? baked.g.canopyLines : lines.geo(), strandMat);
  strandLines.frustumCulled = false;
  group.add(strandLines);

  const glowMat = makePointsMat(uniforms, GLOW_OP, makeGlowTexture());
  const glowPts = new THREE.Points(baked ? baked.g.canopyGlows : glows.geo(true), glowMat);
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


  return {
    group, counts, setPresence,
    // The bake recording site (final/index.js) reads these AFTER every
    // cross-module write is final. Keys match baked.js geometry() keys.
    geometries: {
      canopyLines: strandLines.geometry,
      canopyGlows: glowPts.geometry,
    },
    bakePayload: {
      canopyNodes: counts.canopyNodes,
      canopyBodies: counts.canopyBodies,
      canopyEdges: counts.canopyEdges,
      canopyBodyLinks: counts.canopyBodyLinks,
      canopyDropped: counts.canopyDropped,
      canopyHubs: counts.canopyHubs,
      canopySegs: counts.canopySegs,
      canopyPts: counts.canopyPts,
      canopyHair: counts.canopyHair,
      canopySec: counts.canopySec,
      canopyLum: counts.canopyLum,
      canopyLumTarget: counts.canopyLumTarget,
      canopyLumPts: counts.canopyLumPts,
      arteries: counts.arteries,
      arteryLinks: counts.arteryLinks,
      arterySegs: counts.arterySegs,
      arteryNodes: counts.arteryNodes,
      arteryBranches: counts.arteryBranches,
      arteryConverge: counts.arteryConverge,
      ringArcs: counts.ringArcs,
      ringArcSegs: counts.ringArcSegs,
      ringArcTouch: counts.ringArcTouch,
      pools: counts.pools,
    },
  };
}
