// journey-v6 — OWNED substrate: THE COMMITTED-BYTES READ.
//
// Extracted from substrate.js by order H01 (2026-08-21 elegance run) as the
// "resources" leg of the build/resources/runtime triad. The region moved
// VERBATIM: the two guards, their order, the fifteen geometry() calls, their
// attribute layouts, the payload validation and the single try/catch are the
// bytes that stood at substrate.js:176-228 at 6967a36, with one change —
// the unused `catch (e)` binding is dropped (`catch { … }`), which is
// behaviour-neutral by inspection and closes Q04's INTENTIONAL-SAFE warning
// at substrate.js:225:14.
//
// WHY THIS IS A SEAM AND THE BATCH BUILDERS ARE NOT: this region draws no
// random number, evaluates no noise, constructs no BufferGeometry, writes no
// attribute, sets no renderOrder and holds no GLSL. It acquires bytes that
// already exist. Everything else in substrate.js either consumes one of the
// thirteen seeded streams or writes a buffer, which is why the rest of the
// file stays one build sequence.
//
// The original note, kept because it states the contract this file owns:
//
//   The shipped path skips the geometry math below and rebuilds every
//   BufferGeometry from static/geom bytes (baked once at commit time in the
//   goldens' own headless Chrome; see journey/lib/baked.js). Materials,
//   uniforms, closures and the live `rndA` ambient stream stay computed on
//   both paths — only geometry is skipped. ONE try/catch wraps the WHOLE
//   read: any missing key or shape mismatch throws and the chapter falls
//   back to the live builders in full, never a half-baked mix.
import { isBaked, geometry, payload } from '../../lib/baked.js';

/** The substrate's baked read. Returns `{ g, counts }` on the shipped path,
 *  or `null` — meaning "build live, in full" — on a portrait-field build, on
 *  an unbaked chapter, or on any missing key, shape mismatch or payload
 *  mismatch. `null` is the fallback contract, not an error path. */
export function readBakedSubstrate(leg) {
  // Portrait builds rebuild live (leg.portraitField — see portraits.js's
  // REST_SITES_PORTRAIT): the substrate's own geometry is aspect-blind and
  // would re-derive bit-identically, but the web's baked aOwner encodes the
  // LANDSCAPE faces' positions, and assignOwners() can only re-walk it on
  // the live path where the graph arrays exist. Half-baked mixes are the
  // one thing this wiring promises never to ship.
  if (leg.portraitField) return null;
  if (!isBaked('owned')) return null;
  try {
    const line = [['position', 3], ['aAlong', 1], ['aStrand', 1]];
    const point = [['position', 3], ['aSize', 1], ['aSeed', 1]];
    const pos = [['position', 3]];
    return {
      g: {
        fan: geometry('owned/fan', line),
        hair: geometry('owned/hair', line),
        web: geometry('owned/web', [['position', 3], ['aAlong', 1], ['aStrand', 1], ['aOwner', 1]]),
        glints: geometry('owned/glints', point),
        crown: geometry('owned/crown', line),
        hubs: geometry('owned/hubs', line),
        hubCores: geometry('owned/hubCores', point),
        hubHalos: geometry('owned/hubHalos', point),
        ceiling: geometry('owned/ceiling', pos),
        lid: geometry('owned/lid', line),
        felt: geometry('owned/felt', line),
        grain: geometry('owned/grain', pos),
        fill: geometry('owned/fill', line),
        aggregateFar: geometry('owned/aggregateFar', pos),
        aggregateNear: geometry('owned/aggregateNear', pos),
      },
      counts: (() => {
        const s = payload('owned')?.substrate;
        if (!s || typeof s.primaries !== 'number' || typeof s.netNodes !== 'number'
            || typeof s.netLinks !== 'number' || typeof s.hubs !== 'number'
            || typeof s.voids !== 'number') {
          throw new Error('owned substrate payload mismatch');
        }
        return s;
      })(),
    };
  } catch {
    return null;
  }
}
