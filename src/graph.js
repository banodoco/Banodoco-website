import { makeRng } from './geometry.js';

/**
 * Blue-noise-ish point set over a disc, with density falling off from the
 * centre. Plain random sampling clumps, and a regular lattice reads as CG;
 * grid-accelerated dart throwing with a radius that grows outward gives the
 * organic-but-even spacing a mycelial network needs.
 */
export function sampleDisc({ radius, minDist, growth, tries = 22, seed = 1337 }) {
  const rng = makeRng(seed);
  // Conservative cell size: the smallest spacing anywhere in the field.
  // `growth` may be negative (spacing tightening outward), so take the min of
  // both ends rather than assuming minDist is the floor.
  const minSpacing = minDist * Math.max(0.05, Math.min(1, 1 + growth));
  const cell = minSpacing / Math.SQRT2;
  const dim = Math.ceil((radius * 2) / cell) + 1;
  const grid = new Int32Array(dim * dim).fill(-1);
  const pts = [];

  const cellOf = (x, z) => {
    const cx = Math.floor((x + radius) / cell);
    const cz = Math.floor((z + radius) / cell);
    return cx >= 0 && cz >= 0 && cx < dim && cz < dim ? cz * dim + cx : -1;
  };

  // Local spacing grows with distance so the network thins toward the horizon.
  const spacingAt = (r) => minDist * (1 + growth * (r / radius));

  const fits = (x, z) => {
    const want = spacingAt(Math.hypot(x, z));
    const reach = Math.ceil(want / cell);
    const cx = Math.floor((x + radius) / cell);
    const cz = Math.floor((z + radius) / cell);
    for (let j = -reach; j <= reach; j++) {
      for (let i = -reach; i <= reach; i++) {
        const gx = cx + i, gz = cz + j;
        if (gx < 0 || gz < 0 || gx >= dim || gz >= dim) continue;
        const idx = grid[gz * dim + gx];
        if (idx < 0) continue;
        const p = pts[idx];
        const d = Math.hypot(p[0] - x, p[1] - z);
        if (d < Math.min(want, spacingAt(Math.hypot(p[0], p[1])))) return false;
      }
    }
    return true;
  };

  const push = (x, z) => {
    const c = cellOf(x, z);
    if (c < 0) return false;
    pts.push([x, z]);
    grid[c] = pts.length - 1;
    return true;
  };

  push(0, 0);
  const active = [0];
  while (active.length) {
    const ai = Math.floor(rng() * active.length);
    const [px, pz] = pts[active[ai]];
    let placed = false;
    const base = spacingAt(Math.hypot(px, pz));
    for (let t = 0; t < tries; t++) {
      const ang = rng() * Math.PI * 2;
      const d = base * (1.0 + rng() * 1.0);
      const x = px + Math.cos(ang) * d;
      const z = pz + Math.sin(ang) * d;
      if (Math.hypot(x, z) > radius) continue;
      if (!fits(x, z)) continue;
      if (push(x, z)) { active.push(pts.length - 1); placed = true; break; }
    }
    if (!placed) active.splice(ai, 1);
  }
  return pts;
}

/**
 * Connect each node to its k nearest neighbours, deduplicated. A handful of
 * longer "trunk" links are added on top — real mycelium has a few thick runners
 * spanning the mesh, and without them the graph reads as uniform gauze.
 */
export function knnEdges(pts, { k = 3, trunkChance = 0.05, trunkSpan = 3, seed = 99 }) {
  const rng = makeRng(seed);
  const n = pts.length;

  // Spatial hash so this stays linear rather than O(n^2).
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const span = Math.max(maxX - minX, maxZ - minZ);
  const cells = Math.max(1, Math.floor(Math.sqrt(n / 2)));
  const cell = span / cells + 1e-6;
  const buckets = new Map();
  const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;
  for (let i = 0; i < n; i++) {
    const cx = Math.floor((pts[i][0] - minX) / cell);
    const cz = Math.floor((pts[i][1] - minZ) / cell);
    const kk = key(cx, cz);
    let b = buckets.get(kk);
    if (!b) buckets.set(kk, (b = []));
    b.push(i);
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (a, b) => {
    if (a === b) return;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const kk = lo * n + hi;
    if (seen.has(kk)) return;
    seen.add(kk);
    edges.push([lo, hi]);
  };

  const cand = [];
  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i];
    const cx = Math.floor((x - minX) / cell);
    const cz = Math.floor((z - minZ) / cell);
    cand.length = 0;
    for (let r = 1; r <= 3 && cand.length < k + 6; r++) {
      cand.length = 0;
      for (let j = -r; j <= r; j++) {
        for (let ii = -r; ii <= r; ii++) {
          const b = buckets.get(key(cx + ii, cz + j));
          if (b) for (const idx of b) if (idx !== i) cand.push(idx);
        }
      }
    }
    cand.sort((a, b) => {
      const da = (pts[a][0] - x) ** 2 + (pts[a][1] - z) ** 2;
      const db = (pts[b][0] - x) ** 2 + (pts[b][1] - z) ** 2;
      return da - db;
    });
    const kk = k + (rng() < 0.25 ? 1 : 0);
    for (let m = 0; m < Math.min(kk, cand.length); m++) addEdge(i, cand[m]);
    // Occasional long trunk to a mid-range neighbour.
    if (rng() < trunkChance && cand.length > trunkSpan * k) {
      addEdge(i, cand[Math.min(cand.length - 1, k * trunkSpan + Math.floor(rng() * k))]);
    }
  }
  return edges;
}
