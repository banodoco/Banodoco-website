// journey-v6 — FINAL epilogue: THE ROOT CANOPY, its TWO AUTHORED PASSES.
//
// Split out of canopy.js by order H04 (2026-08-21). Both regions below are
// the byte-identical text canopy.js carried at 6967a36a, at their original
// indentation, in their original order, with nothing between them that was
// not between them before.
//
// WHAT THESE TWO ARE, AND WHY THEY ARE ONE FILE. Everything else the canopy
// draws is DERIVED FROM THE GRAPH: the spanning tree lays the strands and the
// subtree load grades them. These two are not. canopy.js's own §HIERARCHY
// says so outright — "THE LUMINOUS TIER IS NOT DRAWN FROM THE GRAPH AT ALL …
// Load says which strands MATTER; it says nothing about which are worth
// looking at" — and what is left over after that sentence is exactly these
// two passes: eight routes that are AUTHORED to be seen, and three arcs that
// state the organism as a curve. They share the submerged-passage device (the
// arcs borrow the arteries' dip by name), they share the top tier, they both
// draw into the chapter's two shared batches, and they run one after the
// other between the graph's completion and the tier budget.
//
// AND EACH OWNS ITS OWN GENERATORS. `ar`/`ar2`/`ar3` and `rr` are constructed
// inside the regions below and nothing in this file touches canopy.js's
// `rand`. That is h-series-contract.md §2.2's PREFERRED form of a moved
// seeded region — generator construction included — and it is what makes the
// extraction incapable of shifting the main stream rather than merely
// careful not to.
//
// WHAT CROSSES THE BOUNDARY. Five of the arguments below are mutable state
// shared with the facade (`lines`, `glows`, `degree`, `lumNode`, `tierSegs`)
// and are mutated in place here exactly as they were when this was one
// closure. Every one of them reaches the committed bytes or the committed
// payload, so a binding that failed to arrive would be caught by the byte
// proof rather than passing silently.

import { TAU, RING_C, arcOf, cutVal, makeRng, groundY } from './world.js';
import {
  REST_CAM, smoothstep, wrapPi, dCam, lumOf, toneOf, nodeToneOf,
  T_SEC, T_LUM, BOOST, WAVE, LIFT_MIN, KEPT, ALWAYS_LIT,
} from './canopy-levels.js';

/** §3b — the eight arteries: frame-measured selection, then emission.
 *  Mutates `lines`, `glows`, `degree`, `lumNode` and `tierSegs` in place.
 *  Returns the routes themselves (canopy.js reports them as world-space foot
 *  pairs) and the four figures it counted. */
export function layArteries({ nodes, nBody, seen, key, lines, glows, degree, lumNode, tierSegs }) {
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
    const ar2 = makeRng(0x0A47E72E);         // the second fork's own stream
    const ar3 = makeRng(0x0A47E73E);         // the arrival glints', for the same reason
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

      /* THE TWIN STROKE IS GONE, and it is the other half of the thickness.

         It ran a companion stroke a breathing gap to one side at 0.70 of the
         tone, borrowed from terrain.js §4's rhizomorph cords, so that what
         the eye got was "one cord with a lit core" rather than one bright
         thread. That was the right answer to the question this block was
         asked first — seven single polylines were findable only if you knew
         where to look — but the question has changed, and re-read now the
         device is a WIDTH device by construction: two lit strokes a fraction
         of a unit apart, each already wearing a bloom skirt, merge into a lit
         BAND at any depth where the gap projects to less than the two skirts
         together. The near arteries are exactly where that happens, which is
         why A5 and A7 measured 8 and 14 px of >90 band against A3 and A6's 3.
         "Coming out of each mushroom" is the near ones, and the near ones are
         the doubled ones.

         So an artery is one stroke again. What replaces the doubling as the
         thing that makes it a different KIND of object is not luminance and
         not weight — it is the branching below, which the single stroke can
         now afford twice over. Curvature, a fork, a convergence and a node
         are all statements a one-pixel line can make.

         THE RNG DRAWS STAY. `ar` is one stream shared by all eight routes, so
         deleting three draws here would re-lay every artery downstream of the
         first — a different eight connections, dressed up as a tone change.
         The three are still drawn, in the same order, and only the emission
         is gone: every artery is the same route, the same bow and the same
         dip it was, and the diff is provably a subtraction. (terrain.js's
         masks are the same discipline; this is that rule applied to a
         deletion rather than to a thinning.) */
      ar(); ar(); ar();          // was: gapPh, gapPh2, the companion's own tw
      let prev = null, prevF = 0, prevShade = 0;
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
        if (prev && (on || prevF > 0.02)) {
          lines.seg(prev[0], prev[1], prev[2], p[0], y, p[1],
            Math.min(0.9, t0 * prevShade), Math.min(0.9, t0 * shade), meta);
          artSegs++; tierSegs[T_LUM]++;
        }
        if (prevF > 0.02 && !on && !sank) sank = prev;      // the surface break
        if (prevF <= 0.02 && on && sank && !rose) rose = [p[0], y, p[1]];
        prev = [p[0], y, p[1]]; prevF = on ? f : 0; prevShade = shade;
      }

      /* THE Y-BRANCH. A route that forks and whose fork ARRIVES SOMEWHERE is
         the difference between a network and a diagram — she asks for "little
         Y-shaped branches, convergences" by name. The fork is placed clear of
         the submerged passage (a branch nobody can see is not a branch), and
         if a third mushroom stands within reach the fork goes to ITS foot,
         which is a three-body convergence for the price of one strand. */
      /* TWO of them now, one either side of the submerged passage, and that
         is where the legibility the twin stroke used to buy comes from
         instead. A fork is the structural device Hannah's brief names, it
         costs a tenth of what a doubled trunk costs, and — the part that
         matters here — it adds no weight anywhere: a Y is read from its
         SHAPE, so a one-pixel fork states "this route goes somewhere and
         something joins it" exactly as well as a four-pixel one. Two forks
         also say it on both sides of the dip, so the passage under the soil
         is bracketed by structure rather than only by its two break nodes.

         The pair is forced onto opposite sides rather than drawn twice: two
         forks off the same short stretch is a feather, not a confluence.

         THE SECOND FORK DRAWS FROM ITS OWN STREAM. `ar` is shared by all
         eight routes in sequence, so spending draws on a second fork inside
         it would re-lay every artery after the first — new bows, new dips,
         new routes — and the tone change would arrive wearing a field
         reshuffle. `ar2` keeps `ar`'s sequence untouched: every artery, every
         bow, every dip and every first fork is bit-identical to the build
         above this comment, and the diff is the second fork and nothing
         else. (§3b's own header makes the same argument for `ar` itself.)

         TIER. A converging fork is now LUMINOUS — the same band as its
         parent — because with the trunk down at route weight the two are the
         same object and grading them apart made the Y die out at depth: the
         old T_SEC carried a 0.38 distance floor against the artery's 0.55, so
         a far fork faded off a route that did not. One that finds nothing to
         converge on stays a level down and still dies out along its own run,
         which is the difference between a branch and a stub. */
      const forkAt = (rng, forceSide) => {
        const side = forceSide === undefined ? (rng() < 0.5 ? 0 : 1) : forceSide;
        const tb = side === 0 ? 0.10 + rng() * (t1 - 0.16)
                              : t2 + 0.06 + rng() * (0.86 - t2);
        const rp = sample(tb);
        let tgt = -1, td2 = 4.4 * 4.4;
        for (let n = 0; n < nBody; n++) {
          if (n === c.i || n === c.j) continue;
          const q = nodes[n];
          const q2 = (q.x - rp[0]) ** 2 + (q.z - rp[1]) ** 2;
          if (q2 < td2 && q2 > 0.6) { td2 = q2; tgt = n; }
        }
        const conv = tgt >= 0;
        let gx, gz;
        if (conv) {
          const q = nodes[tgt];
          const bl = Math.hypot(q.x - rp[0], q.z - rp[1]);
          gx = q.x - ((q.x - rp[0]) / bl) * Math.min(q.r, bl * 0.3);
          gz = q.z - ((q.z - rp[1]) / bl) * Math.min(q.r, bl * 0.3);
        } else {
          // oblique off the parent, never square — the file's own branch rule
          const bang = Math.atan2(ez, ex) + (rng() < 0.5 ? 1 : -1) * (0.55 + rng() * 0.55);
          const bl = 1.3 + rng() * 1.5;
          gx = rp[0] + Math.cos(bang) * bl; gz = rp[1] + Math.sin(bang) * bl;
        }
        const bex = gx - rp[0], bez = gz - rp[1];
        const blen = Math.hypot(bex, bez);
        const bpx = -bez / blen, bpz = bex / blen;
        const bamp = Math.min(0.75, blen * 0.20) * (rng() < 0.5 ? -1 : 1);
        const BS = Math.max(4, Math.min(20, Math.round(blen / 0.30)));
        const btier = conv ? T_LUM : T_SEC;
        const bt = toneOf(btier, rng(), lum);
        const bmeta = { arc, tw: rng() * TAU, boost: BOOST[btier],
                        wave: WAVE[btier], reveal: ALWAYS_LIT };
        let bp = null, bpt = 0;
        let bOk = true;
        const emitted = [];
        for (let j = 0; j <= BS; j++) {
          const t = j / BS;
          const w = Math.sin(Math.PI * t);
          const qx = rp[0] + bex * t + bpx * bamp * w;
          const qz = rp[1] + bez * t + bpz * bamp * w;
          if (cutVal(qx, qz) < KEPT * 0.75) { bOk = false; break; }
          const qy = groundY(qx, qz) + LIFT_MIN + 0.010;
          // a fork that converges holds its level; one that does not dies out
          const sh = conv ? (0.72 + 0.28 * t) : Math.max(0, 1 - t) ** 1.3;
          if (bp) emitted.push([bp[0], bp[1], bp[2], qx, qy, qz,
                                Math.min(0.9, bt * bpt), Math.min(0.9, bt * sh)]);
          bp = [qx, qy, qz]; bpt = sh;
        }
        // A run that leaves the soil is abandoned WHOLE. Emitting the part
        // drawn before the cut left a stub hanging off the trunk pointing at
        // nothing, which is the one thing a fork must never look like.
        if (bOk && bp) {
          for (const s of emitted) {
            lines.seg(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], bmeta);
            artSegs++; tierSegs[btier]++;
          }
          artBranches++;
          if (conv) artConverge++;
          // the fork itself is a node — the confluence the eye looks for
          glows.pt(rp[0], groundY(rp[0], rp[1]) + 0.045, rp[1],
            Math.min(0.9, nodeToneOf(0.35, lum) * 0.92), 0.085 + rng() * 0.045,
            { arc, reveal: ALWAYS_LIT, tw: rng() * TAU, boost: 0.7 });
          artNodes++;
          if (conv) {
            degree[tgt]++; lumNode[tgt] = 1;
            /* AND THE ARRIVAL IS MARKED TOO. A fork used to light where it
               LEFT and say nothing about where it landed, so the third body
               of a three-body confluence was the only one of the three whose
               foot carried no glint. Marking it closes the figure: the eye
               gets a lit foot, a route, a lit fork, a route and a lit foot,
               which is a connection stated entirely in punctuation and
               direction. This is the trade Hannah's brief asks for, made
               once more — the strand gave up its weight and the arrival got
               a node instead. */
            const q = nodes[tgt];
            glows.pt(q.x, groundY(q.x, q.z) + 0.048, q.z,
              Math.min(0.9, nodeToneOf(0.70, lumOf(dCam(q.x, q.z))) * 0.88),
              0.115 + ar3() * 0.045,
              { arc: arcOf(q.x, q.z), reveal: ALWAYS_LIT, tw: ar3() * TAU, boost: 0.8 });
            artNodes++;
          }
        }
        return side;
      };
      const side1 = forkAt(ar);
      forkAt(ar2, side1 === 0 ? 1 : 0);

      // NODES. Both feet, and the two places the strand meets the soil line —
      // the surface breaks are marked, so "it went under here and came up
      // there" is stated rather than left to be noticed.
      for (const [nx, nz, sz] of [[A.x, A.z, 0.15], [B.x, B.z, 0.15]]) {
        glows.pt(nx, groundY(nx, nz) + 0.048, nz,
          Math.min(0.9, nodeToneOf(0.85, lumOf(dCam(nx, nz)))),
          sz + ar() * 0.055,
          { arc, reveal: ALWAYS_LIT, tw: ar() * TAU, boost: 0.9 });
        artNodes++;
      }
      for (const q of [sank, rose]) {
        if (!q) continue;
        glows.pt(q[0], groundY(q[0], q[2]) + 0.038, q[2],
          Math.min(0.9, nodeToneOf(0.20, lum) * 0.80), 0.070 + ar() * 0.030,
          { arc, reveal: ALWAYS_LIT, tw: ar() * TAU, boost: 0.55 });
        artNodes++;
      }
    }
  }
  return { arteries, artSegs, artNodes, artBranches, artConverge };
}

/** §3c — the three sweeping arcs. Mutates `lines`, `glows`, `degree`,
 *  `lumNode` and `tierSegs` in place; returns the four figures it counted. */
export function layArcs({ nodes, nBody, lines, glows, degree, lumNode, tierSegs }) {
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
              Math.min(0.9, nodeToneOf(0.55, lumOf(dCam(q.x, q.z))) * 0.9),
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
  return { arcSegs, arcNodes, arcsMade, arcTouch };
}
