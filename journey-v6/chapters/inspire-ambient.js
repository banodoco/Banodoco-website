// journey-v6 — the hero's own ambient spore shed (mushroom-scene §10,
// `sceneApi.groups.spores`, 4,200 CPU-animated particles blown +x off the
// back-side gills) versus the Inspire plume system.
//
// W4-A gap b shipped this as a single corridor dim around the ArtCompute
// plume. Hannah's conceptual-continuity revision (2026-08-02) makes the
// relationship literal: there is ONE spore population. The drift the visitor
// watches during Mission must BECOME the plumes — so as each exit's reveal
// rises, the shed's apparent density is handed over to the plume system
// as-and-where the structured spores brighten (inspire.js seeds those spores
// in the shed's own drift envelope and gathers them onto the braid; see the
// handoff block in its spore vertex shader). This file is the shed's half of
// that exchange: a per-region dim whose strength tracks each exit's effective
// reveal, over capsule regions that cover exactly where the plume population
// is appearing — the under-cap origin wedge, the rise corridor, and the
// downwind drift envelope.
//
// Discipline unchanged from W4-A (ADR D3): scene-STATE manipulation only.
// The hero animator writes positions; the `color` attribute is static
// (verified by grep, §10/10c touch position + age). We keep a byte-exact copy
// of the base colors, modulate while any region is live, and restore the
// whole base array verbatim on exit — the p = 0 hero regression stays
// byte-identical. mushroom-scene.js is never edited.
import * as THREE from 'three';

const MAX_TOTAL_DIM = 0.85; // floor: overlapping regions never fully erase a spore

export function createAmbientShedDimmer(sceneApi) {
  let pts = null, base = null, active = false;

  function collect() {
    const p = sceneApi.groups && sceneApi.groups.spores;
    if (!p || !p.geometry || !p.geometry.attributes.color) return false;
    pts = p;
    base = p.geometry.attributes.color.array.slice();   // exact-restore copy
    return true;
  }

  function restore() {
    const attr = pts.geometry.attributes.color;
    attr.array.set(base);                               // verbatim
    attr.needsUpdate = true;
    active = false;
  }

  // scratch: per-region scalars, rebuilt each update (regions.length is ~9;
  // kept as parallel flat arrays so the 4,200-particle loop touches no objects)
  let ax = [], ay = [], az = [], bx = [], by = [], bz = [], ab2 = [],
      r0 = [], r1 = [], kk = [];

  return {
    /** regions: array of { a, b, r0, r1, k } — world-space capsule from a to b,
     *  full dim inside radius r0, feathered to untouched at r1, strength k
     *  (0..1, already scaled by the exit's effective reveal). The caller keeps
     *  the region objects persistent and updates a/b/k in place each frame.
     *  All k <= ~0 restores the shed exactly. */
    update(regions) {
      let n = 0;
      for (const rg of regions) {
        if (rg.k <= 0.004) continue;
        ax[n] = rg.a.x; ay[n] = rg.a.y; az[n] = rg.a.z;
        const dx = rg.b.x - rg.a.x, dy = rg.b.y - rg.a.y, dz = rg.b.z - rg.a.z;
        bx[n] = dx; by[n] = dy; bz[n] = dz;
        ab2[n] = Math.max(dx * dx + dy * dy + dz * dz, 1e-6);
        r0[n] = rg.r0; r1[n] = rg.r1; kk[n] = rg.k;
        n++;
      }
      if (n === 0) { if (active) restore(); return; }
      if (!pts && !collect()) return;
      active = true;
      const attr = pts.geometry.attributes.color;
      const col = attr.array;
      const pos = pts.geometry.attributes.position.array;
      for (let i = 0; i < col.length; i += 3) {
        const x = pos[i], y = pos[i + 1], z = pos[i + 2];
        let dim = 0;
        for (let j = 0; j < n; j++) {
          const px = x - ax[j], py = y - ay[j], pz = z - az[j];
          let t = (px * bx[j] + py * by[j] + pz * bz[j]) / ab2[j];
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = px - bx[j] * t, dy = py - by[j] * t, dz = pz - bz[j] * t;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < r1[j]) {
            let s = d <= r0[j] ? 1 : 1 - (d - r0[j]) / (r1[j] - r0[j]);
            s = s * s * (3 - 2 * s);
            const v = kk[j] * s;
            if (v > dim) dim = v;   // max, not sum: overlaps must not over-darken
          }
        }
        const f = 1 - (dim > MAX_TOTAL_DIM ? MAX_TOTAL_DIM : dim);
        col[i] = base[i] * f;
        col[i + 1] = base[i + 1] * f;
        col[i + 2] = base[i + 2] * f;
      }
      attr.needsUpdate = true;
    },
    get active() { return active; },
  };
}
