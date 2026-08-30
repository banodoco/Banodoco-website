// journey-v6 — OWNED substrate: STRAND OWNERSHIP.
//
// Extracted from substrate.js by order H01 (2026-08-21 elegance run). The
// region moved VERBATIM from substrate.js:567-568 and :1571-1708 at 6967a36:
// the four constants, the multi-source graph walk, the link claim pass, the
// per-face cap, setActiveNode and ownershipStats are byte-for-byte what stood
// there, re-indented into a factory and nothing else.
//
// WHY THIS IS A SEAM. It is a POST-PASS, not a build step: owned/index.js
// calls it after buildSubstrate has returned, and only then registers the
// chapter's geometry (substrate.js's `geometries` note, owned/index.js:103
// then :195). It draws no random number, evaluates no noise, constructs no
// THREE object, and — see the absent import list above — imports nothing at
// all. Its only writes are into the Float32Array the web block already
// allocated and attached as `aOwner`, and that attribute's needsUpdate flag.
// That is what makes moving it safe for the byte contract, and it is also
// what makes it the one part of this chapter that can be executed and
// checked offline against a hand-built graph.
//
// THE CALLER STILL OWNS ORDER. This module publishes nothing and registers
// nothing; the cross-module post-pass contract ("no geometry is registered
// until assignOwners has written aOwner") is unchanged, because the call site
// in owned/index.js is unchanged.
/* ================================================================
   STRAND OWNERSHIP — which filaments belong to which person
   (Hannah, 2026-08-06, report C)
   ================================================================
   The root response used to have exactly one setting: ALL. Hovering the
   chapter's prose line fired surge(), which runs a wave through crown ->
   fan -> hubs -> web -> hairs, i.e. the entire root system, and hovering a
   FACE did nothing to the roots at all. Hannah's model is the other way
   round and has two settings: the crown lights everything (it is the point
   every root leaves from, so a wave from there is the only honest
   whole-system gesture), and a face lights the filaments that are actually
   ITS OWN.

   "Actually its own" is answerable here because the build already knows
   what joins what. Three facts, in order:

     1. portraits.js grows each face's local strands from real points on
        the fan — `nearestCordPoint` returns a sample from `rootPool`, so
        the strand starts ON a root rather than near one. Those points are
        recorded as the face's ANCHORS.
     2. The web's root->mesh links are built from those same rootPool
        samples: `link(rootSample, netNodes[j])`. So an anchor identifies a
        mesh vertex the face is genuinely wired to.
     3. netNode -> netNode links give `webAdj`, a graph.

   So: seed a walk at the mesh vertices the face's own strands reach, spread
   it MAX_HOPS along the graph, and let the faces compete — the first to
   reach a vertex, at the lowest hop count, owns it. That is a Voronoi in
   GRAPH distance over a graph the chapter built, not a radius search. The
   only distances involved are the anchor->link-end match (which is an
   identity test with slack for the jitter nearestCordPoint adds) and a
   hard MAX_R cap so a single long link cannot drag one face's response
   across the frame. */

/** Build the substrate's ownership pass over the web graph the caller just
 *  built. Every field is a reference the caller keeps: this module mutates
 *  `webOwner` in place and never reassigns anything it was handed.
 *
 *  @param {object}       graph
 *  @param {object|null}  graph.baked        the baked read's result; truthy means
 *                                           aOwner arrived already-assigned and the
 *                                           walk must not run (the graph arrays are
 *                                           empty on that path).
 *  @param {object|null}  graph.webGeo       the web BufferGeometry (carries aOwner).
 *  @param {Float32Array} graph.webOwner     one entry per web vertex, or null when baked.
 *  @param {object[]}     graph.netNodes     the network's own vertices (V3).
 *  @param {number[][]}   graph.webAdj       netNode index -> [netNode index].
 *  @param {object[]}     graph.webLinkMeta  { v0, vN, a, b, mid, root } per drawn link.
 *  @param {object}       graph.webMat       the web material (carries uOwner/uOwnerAmt).
 */
export function createStrandOwnership({
  baked, webGeo, webOwner, netNodes, webAdj, webLinkMeta, webMat,
}) {
  let ownedLinkCount = [];    // per face: how many web links it owns
  let ownedExtent = [];       // per face: world radius of the lit set
  const OWN_MAX_HOPS = 3;
  const OWN_MAX_R = 4.5;         // world units from the face
  const ANCHOR_R2 = 0.9 * 0.9;   // nearestCordPoint jitters by up to ~0.45
  // A ceiling on how much of the mesh one person may light. The walk alone
  // gave a 4-to-160 spread across the sixteen — a face standing in a dense
  // patch of web lit 11% of the whole network, which stops reading as "these
  // are mine" and starts reading as the global flash this change exists to
  // retire. Past the cap a face keeps its NEAREST links, so what is dropped
  // is always the outermost.
  const OWN_MAX_LINKS = 55;

  function assignOwners(faces) {
    // Baked read path: the web's aOwner was captured AFTER assignOwners ran at
    // commit time, so re-running the walk here would only wipe it (the graph
    // arrays are empty on this path). The baked attribute IS the result.
    if (baked) return;
    if (!webGeo || !faces.length) return;
    const N = netNodes.length;
    const owner = new Int32Array(N).fill(-1);
    const facePos = faces.map(f => f.pos);
    // 1. seeds, from real connectivity
    let frontier = [];
    faces.forEach((f, fi) => {
      const seeds = new Set();
      for (let li = 0; li < webLinkMeta.length; li++) {
        const lm = webLinkMeta[li];
        if (!lm.root || lm.b < 0) continue;
        for (let ai = 0; ai < f.anchors.length; ai++) {
          if (lm.root.distanceToSquared(f.anchors[ai]) < ANCHOR_R2) { seeds.add(lm.b); break; }
        }
      }
      // A face whose strands all rolled a free-space start has no anchor on
      // the fan. It is still embedded in the mesh — take the single nearest
      // vertex as its one seed and let the same walk do the rest.
      if (!seeds.size) {
        let best = -1, bd = OWN_MAX_R * OWN_MAX_R;
        for (let j = 0; j < N; j++) {
          const d2 = netNodes[j].distanceToSquared(f.pos);
          if (d2 < bd) { bd = d2; best = j; }
        }
        if (best >= 0) seeds.add(best);
      }
      for (const s of seeds) frontier.push([s, fi]);
    });
    // 2. multi-source walk, level by level: lowest hop wins, ties to the
    //    lower face index (deterministic — the frontier is built in order)
    for (let h = 0; h <= OWN_MAX_HOPS && frontier.length; h++) {
      const next = [];
      for (const [j, fi] of frontier) {
        if (owner[j] !== -1) continue;
        if (netNodes[j].distanceToSquared(facePos[fi]) > OWN_MAX_R * OWN_MAX_R) continue;
        owner[j] = fi;
        if (h < OWN_MAX_HOPS) for (const k of webAdj[j]) if (owner[k] === -1) next.push([k, fi]);
      }
      frontier = next;
    }
    // 3. links: a mesh link belongs to a face when BOTH its ends do; a
    //    root->mesh link belongs to whoever owns the mesh end, because that
    //    link IS the fan reaching that vertex.
    const claims = faces.map(() => []);
    for (const lm of webLinkMeta) {
      let o = -1;
      if (lm.a >= 0 && lm.b >= 0) {
        if (owner[lm.a] >= 0 && owner[lm.a] === owner[lm.b]) o = owner[lm.a];
      } else if (lm.b >= 0) {
        o = owner[lm.b];
      }
      if (o < 0) continue;
      const d = lm.mid.distanceTo(facePos[o]);
      if (d > OWN_MAX_R) continue;
      claims[o].push({ lm, d });
    }
    ownedLinkCount = new Array(faces.length).fill(0);
    const ext = new Array(faces.length).fill(0);
    webOwner.fill(-1);
    claims.forEach((list, o) => {
      list.sort((a, b) => a.d - b.d);
      const keep = list.slice(0, OWN_MAX_LINKS);
      for (const { lm, d } of keep) {
        for (let v = lm.v0; v < lm.vN; v++) webOwner[v] = o;
        ext[o] = Math.max(ext[o], d);
      }
      ownedLinkCount[o] = keep.length;
    });
    ownedExtent = ext;
    webGeo.attributes.aOwner.needsUpdate = true;
  }

  /** Which face the mesh is currently answering, and how strongly. -1 / 0 is
   *  the resting network: no link is lit above ambient. */
  function setActiveNode(idx, amt) {
    if (!webMat.uniforms.uOwner) return;
    webMat.uniforms.uOwner.value = idx == null ? -1 : idx;
    webMat.uniforms.uOwnerAmt.value = amt || 0;
  }

  /** QA (report C gate): links owned per face, and the world extent of each
   *  face's lit set, against the mesh total. */
  function ownershipStats() {
    return {
      totalLinks: webLinkMeta.length,
      perFace: ownedLinkCount.map((c, i) => ({ face: i, links: c, extent: +ownedExtent[i].toFixed(2) })),
      owned: ownedLinkCount.reduce((a, b) => a + b, 0),
    };
  }
  return { assignOwners, setActiveNode, ownershipStats };
}
