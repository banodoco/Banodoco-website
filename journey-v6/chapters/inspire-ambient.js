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
    /** globalK (0..1, optional): whole-shed hand-over — ride-through #3
     *  (Hannah): the plumes must not ignite BESIDE a still-visible curtain;
     *  as the exits' reveal saturates, the ENTIRE original drift cedes to the
     *  structured system, not only the capsule corridors. Reversible: falls
     *  back with reveal on the way home.
     *  Delta retime (Hannah's river-delta redesign, third note): the caller
     *  now weights globalK across all three exits' reveals (0.50/0.28/0.22)
     *  instead of keying it to the furthest-along exit, so the source curtain
     *  visibly survives until the last rim current has taken over. */
    /** grad (optional): distance-graded early dim for the DOWNWIND HISTORY —
     *  ride-through #5 (Hannah, "why are there still two sources"): the shed's
     *  far-drifted old spores hang in the sky as a detached cloud while the
     *  braid grows at the rim, reading as a second population. They are the
     *  stream's HISTORY, not its source: they dissolve early (keyed to the
     *  first arrival), while the near-rim live stream follows the slower
     *  weighted hand-over. { sx,sy,sz: cap-centre world; d0,d1: distance
     *  band; k: 0..1 strength of the far dim }.
     *  TAKEOVER FEED (Hannah's fifth note, 2026-08-03): with the same-particle
     *  takeover (inspire-takeover.js) the shed's own dots PERFORM the plumes,
     *  so brightness is handed over per particle, not only per region:
     *    F = f * (1 - cv[i]) + pw[i]
     *  where f is the classic dim factor (capsules / global / history — which
     *  therefore now applies to the UNCONVERTED share only), cv[i] is the
     *  dot's conversion and pw[i] its plume brightness term (path envelope x
     *  gain x (1 - detail fade)), both pure functions of the effective
     *  reveals. tk = { cv, pw, any }. Restore discipline unchanged: base is
     *  still restored byte-exact when every channel goes quiet. */
    update(regions, globalK = 0, grad = null, tk = null) {
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
      const gradOn = grad && grad.k > 0.004;
      const tkOn = tk && tk.any && tk.cv;
      if (n === 0 && globalK <= 0.004 && !gradOn && !tkOn) { if (active) restore(); return; }
      if (!pts && !collect()) return;
      active = true;
      const attr = pts.geometry.attributes.color;
      const col = attr.array;
      const pos = pts.geometry.attributes.position.array;
      const tcv = tkOn ? tk.cv : null, tpw = tkOn ? tk.pw : null;
      let pi = 0;
      for (let i = 0; i < col.length; i += 3, pi++) {
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
        if (dim > MAX_TOTAL_DIM) dim = MAX_TOTAL_DIM;
        // the global hand-over may exceed the capsule cap: at full reveal the
        // old curtain is gone (0.97) — the structured plumes ARE the spores now
        let g = globalK * 0.97;
        if (gradOn) {
          const hx = x - grad.sx, hy = y - grad.sy, hz = z - grad.sz;
          const hd = Math.sqrt(hx * hx + hy * hy + hz * hz);
          let hf = (hd - grad.d0) / (grad.d1 - grad.d0);
          hf = hf < 0 ? 0 : hf > 1 ? 1 : hf;
          hf = hf * hf * (3 - 2 * hf);
          const gh = grad.k * hf * 0.97;   // history dissolves; source survives
          if (gh > g) g = gh;
        }
        let f = 1 - (g > dim ? g : dim);
        // same-particle takeover: a converting dot swaps its ambient look for
        // its plume look; dim/history apply to the unconverted share only
        if (tkOn) {
          const c = tcv[pi];
          if (c > 0.0005) f = f * (1 - c) + tpw[pi];
        }
        col[i] = base[i] * f;
        col[i + 1] = base[i + 1] * f;
        col[i + 2] = base[i + 2] * f;
      }
      attr.needsUpdate = true;
    },
    get active() { return active; },
  };
}
