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
// REVEAL (D16, absolute). Every vertex carries aReveal on the SAME uPull the
// bodies kindle on, so the canopy is camera-pure: dark at arm, growing with
// the pullback, retracting stroke-for-stroke on a reverse scrub, nothing
// fading in over open view. A node's threshold is its own body's, LESS a
// small lead (CANOPY_LEAD) so the ground under a mushroom is already alight
// when the mushroom itself comes up — the canopy puts the body there, not the
// other way round. Waypoint nodes take an inverse-distance blend of the
// nearest seats, and an edge's vertices LERP between its two endpoints. So
// the light does not switch on along a strand: it travels down it, from the
// body that kindled first to the one that has not yet, which is the front the
// bodies already use, seen in the ground.
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

// How far AHEAD of its own body a seat kindles. Small on purpose: at 0.04 of
// uPull the ground under a member lights roughly a fifth of a reveal width
// before the member does, which reads as the body rising out of lit soil. Any
// larger and the canopy arrives as its own separate event.
const CANOPY_LEAD = 0.04;

// Distance luminance — ring.js's cloneLum device, re-banded for the floor.
// The canopy runs from the hero's own foot out to the hint band at 46 units,
// so it needs a longer ramp than a body does, and a deeper floor: a far
// strand is a suggestion of continuation, not a stroke.
const lumOf = (d) => 1 - 0.66 * smoothstep(5, 34, d);

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
  // Its threshold is under every member's, so the canopy leaves the hero's
  // own foot first and travels outward from there.
  nodes.push({ x: 0, z: 0, gy: groundY(0, 0), rev: 0.02, body: true, r: 0.62 });

  // every other fruiting body in the chapter, seated exactly where it stands
  for (const s of seats) {
    nodes.push({
      x: s.x, z: s.z, gy: s.gy,
      rev: Math.max(0.03, (s.reveal ?? 0.5) - CANOPY_LEAD),
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
      nodes.push({ x, z, gy: groundY(x, z), rev: 0, body: false, r: 0 });
    }
  }

  // a waypoint kindles with its neighbourhood: an inverse-distance blend of
  // the three nearest SEATS. That keeps the front one front — the ground
  // between two members lights as those members light, not on a clock.
  for (let i = nBody; i < nodes.length; i++) {
    const n = nodes[i];
    const near = [];
    for (let j = 0; j < nBody; j++) {
      const dx = nodes[j].x - n.x, dz = nodes[j].z - n.z;
      near.push({ d2: dx * dx + dz * dz, rev: nodes[j].rev });
    }
    near.sort((a, b) => a.d2 - b.d2);
    let w = 0, acc = 0;
    for (let k = 0; k < Math.min(3, near.length); k++) {
      const wt = 1 / (0.6 + Math.sqrt(near[k].d2));
      w += wt; acc += wt * near[k].rev;
    }
    n.rev = Math.max(0.03, acc / w - 0.02);
  }

  /* ================================================================
     2. THE GRAPH — spanning tree first, then the web
     ================================================================ */
  const N = nodes.length;
  const d2Of = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z;
    return dx * dx + dz * dz;
  };
  const edges = [];                    // { a, b, spine }
  const seen = new Set();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const addEdge = (a, b, spine) => {
    const k = key(a, b);
    if (a === b || seen.has(k)) return false;
    seen.add(k);
    edges.push({ a, b, spine });
    return true;
  };

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
      addEdge(from[pick], pick, true);
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
      if (addEdge(i, near[k].j, false)) made++;
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
    if (bj >= 0 && addEdge(i, bj, true)) bodyLinks++;
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
  let dropped = 0;
  function strand(e) {
    const A = nodes[e.a], B = nodes[e.b];
    const dx = B.x - A.x, dz = B.z - A.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) return;
    const ux = dx / d, uz = dz / d;
    // leave each node at its own seat radius, so a strand starts at the edge
    // of the stipe's footprint and not inside the flesh
    const s0 = Math.min(A.r, d * 0.3), s1 = Math.min(B.r, d * 0.3);
    const ax = A.x + ux * s0, az = A.z + uz * s0;
    const bx = B.x - ux * s1, bz = B.z - uz * s1;
    const ex = bx - ax, ez = bz - az;
    const len = Math.hypot(ex, ez);
    if (len < 0.18) return;
    const SEG = Math.max(4, Math.min(14, Math.round(len / 0.46)));
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
    // spine strands (the tree, and every foot-to-foot run) carry the canopy;
    // cross-links are the fabric between them and sit under
    const t0 = (e.spine ? 0.20 + rand() * 0.10 : 0.115 + rand() * 0.055) * lum;
    const tw = rand() * TAU;
    const arc = arcOf(mid[0], mid[1]);
    const meta = {
      arc, tw,
      // the growth-front pulse and the CTA wave breathe through the ground
      // as well as through the bodies — this IS the colony, and terrain.js's
      // own front carriers already established the reading
      boost: e.spine ? 0.45 : 0.22,
      // rhizomorph cords carry slow outward waves (terrain.js §4). A spine
      // strand is the same organ at the surface, so it carries the same.
      wave: e.spine ? 0.40 : 0,
    };
    // THE FRONT, TRAVELLING. makeBatch carries ONE meta per segment, so the
    // threshold is per-SEGMENT rather than per-vertex — evaluated at each
    // segment's own midpoint of the A->B lerp. At ~0.58 world units a segment
    // that is a step of at most (|revB - revA| / SEG) of uPull, against the
    // shader's own 0.16 reveal width: the ramp is fifteen to thirty times
    // wider than the step, so what a viewer sees is a soft front running down
    // the strand, not twelve panels switching. Pure in uPull either way, so a
    // reverse scrub un-lights it exactly as it lit (D16).
    let prev = null, prevT = 0;
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const p = sample(t, amp);
      const y = groundY(p[0], p[1]) + LIFT_MIN + rand() * LIFT_SPAN;
      // a taper: brightest at the two feet, thinnest in the middle of the run
      const shade = 0.62 + 0.38 * Math.abs(2 * t - 1);
      if (prev) {
        const rm = A.rev + (B.rev - A.rev) * (t - 0.5 / SEG);
        lines.seg(prev[0], prev[1], prev[2], p[0], y, p[1],
          Math.min(0.9, t0 * prevT), Math.min(0.9, t0 * shade),
          { ...meta, reveal: rm });
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
       batch, at a third of the tone. They inherit the strand's own threshold
       at the point they leave it, so they arrive with the run they belong to
       and retract with it. ---- */
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
      const rev = A.rev + (B.rev - A.rev) * t;
      const tone = t0 * (0.42 + rand() * 0.22);
      for (let k = 0; k < HS; k++) {
        a += gauss() * 0.42;
        const step = hl / HS;
        const qx = hx + Math.cos(a) * step, qz = hz + Math.sin(a) * step;
        if (cutVal(qx, qz) < KEPT * 0.75) break;
        const qy = groundY(qx, qz) + LIFT_MIN + rand() * LIFT_SPAN;
        const f0 = 1 - k / HS, f1 = 1 - (k + 1) / HS;
        lines.seg(hx, hy, hz, qx, qy, qz,
          Math.min(0.9, tone * f0), Math.min(0.9, tone * f1),
          { arc: meta.arc, reveal: rev, tw: rand() * TAU, boost: 0.18 });
        hx = qx; hy = qy; hz = qz;
      }
    }
  }
  for (const e of edges) strand(e);

  /* ================================================================
     4. JUNCTIONS — glints, hubs, and the pools that carry the mass
     ================================================================ */
  // Junction glints: "many small bright nodes where threads cross" (OWNED's
  // reference, CONNECT's bead points). One per node that actually got wired,
  // sized by how much of the network passes through it.
  let hubs = 0;
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    if (!degree[i]) continue;
    const lum = lumOf(dCam(n.x, n.z));
    const hot = Math.min(1, (degree[i] - 1) / 4);
    glows.pt(n.x, n.gy + 0.035, n.z,
      Math.min(0.9, (0.24 + 0.20 * hot) * lum),
      (0.045 + 0.055 * hot) * (0.6 + 0.6 * lum),
      { arc: arcOf(n.x, n.z), reveal: n.rev, tw: rand() * TAU, boost: 0.4 });

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
        lines.seg(n.x, n.gy + 0.03, n.z, qx, groundY(qx, qz) + 0.025, qz,
          Math.min(0.9, 0.34 * lum), Math.min(0.9, 0.10 * lum),
          { arc: arcOf(n.x, n.z), reveal: n.rev, tw: rand() * TAU, boost: 0.8 });
      }
      glows.pt(n.x, n.gy + 0.05, n.z, Math.min(0.9, 0.52 * lum), 0.22 + rand() * 0.10,
        { arc: arcOf(n.x, n.z), reveal: n.rev, tw: rand() * TAU, boost: 1 });
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
        { arc: arcOf(n.x, n.z), reveal: n.rev, tw: rand() * TAU, boost: 0.3 });
      placed++;
    }
    counts.pools = placed;
  }

  /* ================================================================
     5. TWO DRAWS
     ================================================================ */
  // Strand opacity 0.62 against the lip's 0.72 and the ring's 1.15: the
  // canopy is the ground the subject stands on, and it is levelled to say so.
  const strandMat = makeStrandMat(uniforms, 0.62);
  const strandLines = new THREE.LineSegments(lines.geo(), strandMat);
  strandLines.frustumCulled = false;
  group.add(strandLines);

  const glowMat = makePointsMat(uniforms, 0.85, makeGlowTexture());
  const glowPts = new THREE.Points(glows.geo(true), glowMat);
  glowPts.frustumCulled = false;
  group.add(glowPts);

  counts.canopyNodes = N;
  counts.canopyBodies = nBody;
  counts.canopyEdges = edges.length;
  counts.canopyBodyLinks = bodyLinks;
  counts.canopyDropped = dropped;
  counts.canopyHubs = hubs;
  counts.canopySegs = lines.segCount;
  counts.canopyPts = glows.ptCount;

  return { group, counts };
}
