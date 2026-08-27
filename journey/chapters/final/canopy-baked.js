// journey-v6 — FINAL epilogue: THE ROOT CANOPY, its COMMITTED-BYTES READ.
//
// Split out of canopy.js by order H04 (2026-08-21). The region below is the
// byte-identical text canopy.js carried at 6967a36a, with exactly one
// character edit and one comment edit. The character edit: the unused
// `catch (e)` binding is now `catch` (eslint
// no-unused-vars, h-series-contract.md §6.3 INTENTIONAL-SAFE). No expression
// changed and NO console.warn was added — the visitor-facing fallback path
// is the one thing this file must not make noisier (D9). The comment edit:
// "the ENTIRE graph build below" now reads "in canopy.js", because the graph
// is no longer below this text. Comment-only, invisible to a token stream.
//
// The IIFE is kept exactly as it was rather than being unwrapped into the
// function body, so every moved line keeps its original indentation and the
// move is provable character for character against the vendored oracle.

import { BATCH_LINE, BATCH_POINT } from './world.js';
import { isBaked, geometry, payload } from '../../lib/baked.js';

/** The canopy's two merged batches, read from static/geom bytes — or null,
 *  which is how "build live" is expressed everywhere in this pipeline.
 *  Returns { g: { canopyLines, canopyGlows }, counts } or null. */
export function readBakedCanopy() {
  // ---- baked-read wiring (2026-08-17) --------------------------------
  // The shipped path skips the ENTIRE graph build in canopy.js (nodes, waypoints,
  // Prim's + web + body links, strands/hairlines, arteries, arcs, junctions,
  // hubs, pools) and rebuilds the two merged batches from static/geom bytes.
  // The two materials, the always-lit shader language and the setPresence
  // closure stay live either way — the network is gated whole by one
  // camera-pure uOpacity, never kindled per-vertex. ONE try/catch wraps the
  // WHOLE read: any missing key or shape mismatch throws and the chapter
  // falls back to the live builders in full, never a half-baked mix.
  const baked = (() => {
    if (!isBaked('final')) return null;
    try {
      const C = payload('final')?.canopy;
      if (!C || typeof C.canopyNodes !== 'number' || typeof C.canopySegs !== 'number'
          || !Array.isArray(C.arteryLinks)) {
        throw new Error('final canopy payload mismatch');
      }
      return {
        g: {
          canopyLines: geometry('final/canopyLines', BATCH_LINE),
          canopyGlows: geometry('final/canopyGlows', BATCH_POINT),
        },
        counts: C,
      };
    } catch {
      return null;
    }
  })();
  return baked;
}
