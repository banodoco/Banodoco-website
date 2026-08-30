// journey-v6 — FINAL epilogue: the committed-bytes read.
//
// Extracted from `ring.js` by elegance order H03 (2026-08-21). This is the
// chapter's RESOURCE leg on the read side: it validates the baked `final`
// payload and rebuilds the ring's three geometries from `static/geom` bytes,
// or returns null so the chapter falls back to its live builders in full.
//
// It closes over nothing — it takes no argument and reads no local of
// `createFinalRing`. It computes no attribute value: `geometry()` copies
// committed bytes. It publishes nothing and registers nothing, and it is
// called from INSIDE `createFinalRing`, as its first statement, so the
// chapter's geometry is still final the instant that function returns and the
// split creates no cross-module post-pass.
//
// WHAT THIS MODULE DOES *NOT* CLAIM. It is not "incapable of perturbing the
// RNG contract by construction". `geometry()` constructs a
// `THREE.BufferGeometry`, whose `generateUUID()` draws from `Math.random` —
// three geometries, twelve draws, per read. A direct-site grep cannot see a
// callee two frames down (ledger D55). What the split preserves, and what
// H03's suite asserts, is verbatim-ness with preserved callee order plus a
// measured, transitive draw inventory over the streams C03a actually pins.
import { isBaked, geometry, payload } from '../../lib/baked.js';
import { BATCH_LINE, BATCH_POINT } from './world.js';

// ---- baked-read wiring (2026-08-17) --------------------------------
// The shipped path skips the species-tissue emission below and rebuilds
// the two merged batches + primordia from static/geom bytes (baked once at
// commit time in the goldens' own headless Chrome; see journey/lib/baked.js).
// PLACEMENT stays live either way: clones, picker, seats, pokeMembers and
// the §8 ground-merge stubs are runtime-wired and always computed — only
// buildMushroom/buildCloneSeat tissue and the batch/primordia emission are
// skipped. ONE try/catch wraps the WHOLE read: any missing key or shape
// mismatch throws and the chapter falls back to the live builders in full,
// never a half-baked mix.
// ("below" above means the emission blocks that still sit in ring.js, under
// the `if (!baked)` guards. Those did NOT move; only this reader did.)
export function readBakedRing() {
  if (!isBaked('final')) return null;
  try {
    const P = payload('final');
    if (!P || !P.ring || !Array.isArray(P.ring.memberSegsPts)) {
      throw new Error('final ring payload mismatch');
    }
    return {
      g: {
        ringLines: geometry('final/ringLines', BATCH_LINE),
        ringGlows: geometry('final/ringGlows', BATCH_POINT),
        primordia: geometry('final/primordia',
          [['position', 3], ['color', 3], ['aDelay', 1], ['aTw', 1], ['psize', 1]]),
      },
      counts: {
        ringSegs: P.ring.ringSegs,
        glowPts: P.ring.glowPts,
        primordia: P.ring.primordia,
        // Per-body emission counts are not recoverable from the merged
        // batches, so they round-trip keyed by the member index.
        segsPtsByI: new Map(P.ring.memberSegsPts.map(r => [r.i, r])),
        // ...and the plain array survives too, so bakePayload below can
        // re-emit it verbatim on a baked build (counts-mirror, 2026-08-17).
        memberSegsPts: P.ring.memberSegsPts,
      },
    };
  } catch {
    return null;
  }
}
