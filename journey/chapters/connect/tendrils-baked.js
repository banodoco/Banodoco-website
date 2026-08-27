// journey-v6 — CONNECT restage: the committed-bytes read.
//
// Extracted from `tendrils.js` by elegance order H02 (2026-08-21). This module
// is the other half of the chapter's RESOURCE leg: it validates the baked
// payload and rebuilds both meshes from `static/geom` bytes, or returns null so
// the chapter falls back to its live builders in full.
//
// It closes over nothing. It takes no argument, reads no local of
// `buildTendrils`, draws no random numbers, and computes no attribute value —
// `geometry()` copies committed bytes. That is why moving it cannot perturb the
// RNG contract or the byte contract: there is nothing here to perturb.
//
// It publishes nothing and registers nothing. Connect is baked ATOMICALLY
// (`connect/index.js:603-614`): `buildTendrils` is the chapter's single
// geometry producer and its output is final the instant it returns. This module
// is called from INSIDE `buildTendrils`, so that stays true — the split does
// not create a cross-module post-pass.
import * as THREE from 'three';
import { isBaked, geometry, payload } from '../../lib/baked.js';

const V3 = THREE.Vector3;

/* ---- baked read path (2026-08-17) -----------------------------------
   ("below" in the sentence that follows meant the emission block that
   still sits in tendrils.js, under `if (baked) { … } else { … }`. That
   branch was NOT split by H02; only this reader moved.)
   The whole emission block below is ONE skip unit, never split: pushGlint
   interleaves with pushSeg across the shared streams B and C, so the two
   geometries cannot be skipped independently. When the manifest + this
   chapter's bin are present we rebuild both meshes from static/geom bytes
   and pull routes / hubMeta / counts / uLitMax from the payload. partData
   ROUND-TRIPS — it is NEVER recomputed here, because recomputing it after
   skipping the geometry loops would re-run stream B out of sync and drift
   the particle field against the goldens. ONE try/catch wraps the WHOLE
   read: any missing key or shape mismatch throws and the chapter falls
   back to the live builders in full, never a half-baked mix. */
export function readBakedTendrils() {
  if (!isBaked('connect')) return null;
  try {
    const P = payload('connect');
    if (!P || !P.counts || typeof P.counts.totalSegs !== 'number'
        || !Array.isArray(P.routes) || !Array.isArray(P.hubMeta)
        || !Array.isArray(P.particles) || !Array.isArray(P.uLitMax)) {
      throw new Error('connect payload mismatch');
    }
    const routes = P.routes.map((r) => ({
      id: r.id,
      poly: r.poly.map((q) => new V3(q[0], q[1], q[2])),
      arcs: r.arcs.slice(),
      len: r.len,
    }));
    return {
      routes,
      hubMeta: P.hubMeta.map((hm) => ({
        id: hm.id,
        pos: new V3(hm.pos[0], hm.pos[1], hm.pos[2]),
        along: hm.along,
        route: hm.route,
      })),
      counts: P.counts,
      particles: P.particles.map((p) => ({
        route: p.route, phase: p.phase, speed: p.speed, seed: p.seed,
      })),
      uLitMax: P.uLitMax.slice(),
      strands: geometry('connect/strands', [['position', 3], ['aA', 4], ['aB', 4]]),
      points: geometry('connect/points', [['position', 3], ['aP', 4], ['aR', 1], ['aLife', 1]]),
    };
  } catch {
    return null;
  }
}
