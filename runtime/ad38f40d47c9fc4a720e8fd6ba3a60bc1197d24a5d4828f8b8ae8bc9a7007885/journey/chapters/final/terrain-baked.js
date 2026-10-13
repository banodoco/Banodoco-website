// journey-v6 — FINAL epilogue: THE TERRAIN CUTAWAY, its COMMITTED-BYTES READ.
//
// Split out of terrain.js by order H05 (2026-08-21). The region below is the
// byte-identical text terrain.js carried at 6967a36a, with exactly one
// character edit and one comment edit. The character edit: the unused
// `catch (e)` binding is now `catch` (eslint no-unused-vars,
// h-series-contract.md §6.3 INTENTIONAL-SAFE). No expression changed and NO
// console.warn was added — the visitor-facing fallback path is the one thing
// this file must not make noisier (D9). The comment edit: "every emission
// block below" now reads "every emission block in terrain.js", because those
// blocks are no longer below this text. Comment-only, invisible to a token
// stream.
//
// The IIFE is kept exactly as it was rather than being unwrapped into the
// function body, so every moved line keeps its original indentation and the
// move is provable character for character against the vendored oracle. This
// is the FOURTH instance of the same construction in this series
// (tendrils-baked.js, ring-baked.js, canopy-baked.js), which is what makes it
// a seam rather than a coincidence.

import { BATCH_LINE, BATCH_POINT } from './world.js';
import { isBaked, geometry, payload } from '../../lib/baked.js';

/** The terrain's nine geometries, its twelve mask/segment counts and the six
 *  haze pairs, read from static/geom bytes — or null, which is how "build
 *  live" is expressed everywhere in this pipeline.
 *  Returns { g: { soil … conn }, counts, haze } or null. */
export function readBakedTerrain() {
  // ---- baked-read wiring (2026-08-17) --------------------------------
  // The shipped path skips every emission block in terrain.js (soil slab, surface,
  // cut, aggr, cords, hyph, ends, front, conn) and rebuilds each
  // BufferGeometry from static/geom bytes (baked once at commit time; see
  // journey/lib/baked.js). Materials, the soil uniforms, the haze sprites
  // and the setAmount/setBuried closures stay live either way — only
  // geometry is skipped. ONE try/catch wraps the WHOLE read: any missing
  // key or shape mismatch throws and the chapter falls back to the live
  // builders in full, never a half-baked mix.
  const baked = (() => {
    if (!isBaked('final')) return null;
    try {
      const T = payload('final')?.terrain;
      if (!T || typeof T.soilTris !== 'number' || typeof T.hyphSegs !== 'number'
          || !Array.isArray(T.haze)) {
        throw new Error('final terrain payload mismatch');
      }
      return {
        g: {
          soil: geometry('final/soil', [['position', 3]]),
          surface: geometry('final/surface', BATCH_LINE),
          cut: geometry('final/cut', BATCH_LINE),
          aggr: geometry('final/aggr', BATCH_POINT),
          cords: geometry('final/cords', BATCH_LINE),
          hyph: geometry('final/hyph', BATCH_LINE),
          ends: geometry('final/ends', BATCH_POINT),
          front: geometry('final/front', BATCH_LINE),
          conn: geometry('final/conn', BATCH_LINE),
        },
        counts: {
          soilTris: T.soilTris, surfaceStrokes: T.surfaceStrokes,
          surfaceSegs: T.surfaceSegs, lipRootlets: T.lipRootlets,
          lipStrata: T.lipStrata, cutSegs: T.cutSegs, aggrPts: T.aggrPts,
          cordSegs: T.cordSegs, hyphSegs: T.hyphSegs, frontSegs: T.frontSegs,
          connSegs: T.connSegs, pitStrands: T.pitStrands,
        },
        haze: T.haze,
      };
    } catch {
      return null;
    }
  })();
  return baked;
}
