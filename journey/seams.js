// journey-v6 — threshold streamer (adr-d3-world-layout.md section 4).
//
// Each seam is a PREDICATE ON THE CAMERA evaluated every frame, with
// hysteresis so a shaky scrub cannot strobe the streamer, plus a minimum
// dwell before a reverse crossing retires anything. Crossing arms the next
// chapter's assets and retires the previous chapter's high-detail geometry.
//
// T1 has no visual expression at all - it is a pure streaming trigger. T2/T3/
// T4 are natural occlusions the camera path already produces; nothing is drawn
// over the frame to hide them (no veils - that is the retired donor model).

import { startOf, endOf } from './route.js';
import {
  THRESHOLD_HYSTERESIS_WORLD as HYS_W,
  THRESHOLD_HYSTERESIS_DEG as HYS_DEG,
  THRESHOLD_MIN_DWELL_MS as DWELL,
} from './constants.js';
import { capUnderPt, rimRad, groundY } from './anatomy.js';

const DEG = Math.PI / 180;

// p-windows that back the camera predicates up, expressed against the route
// manifest so a re-timed route carries them along (M4). Values are the
// shipped literals; each offset is authored against the camera path.
const T1_RELAX_IN = startOf('connect') + 0.06;    // 0.44 — path has dropped under the rim
const T1_RELAX_OUT = startOf('connect') + 0.08;   // 0.46
const CONNECT_HOLD_LO = startOf('connect') + 0.02; // 0.40 — chamber armed through the leg
// 0.705 (M5 ignition audit, D16): was startOf('owned')+0.03 = 0.63. The T2
// floor predicate drops the chamber at y≈0.65 (~p 0.675) — in OPEN AIR above
// the soil, with the blade tissue still framed overhead. Forward that is a
// legal dim, but a REVERSE scrub re-armed there, and the tissue faded back in
// from nothing on screen. The hold now covers to the soil-crossing murk
// (camera inside the Owned lid material, p 0.692–0.712), so retire and
// re-arm both happen behind genuine occlusion.
const CONNECT_HOLD_HI = startOf('owned') + 0.105;  // 0.705
const OWNED_HOLD_LO = startOf('owned') + 0.03;     // 0.63 — colony held through the Final rise
// past-the-end (M5 ignition audit, D16): was endOf('final') − 0.03 = 0.97,
// which retired the colony DURING the end-hold — its faint glow in the
// cutaway wedge faded out in view at 0.97 and re-ignited there on the way
// back. The colony does not cease to exist while the visitor reads the
// footer; the hold now covers the whole tail (p never exceeds 1).
const OWNED_HOLD_HI = endOf('final') + 0.01;       // 1.01 — never releases at the top
const FINAL_MIN = startOf('final');                // 0.85 — rise/cutaway can only arm past here
const FINAL_RELEASE = startOf('final') - 0.02;     // 0.83
// 0.80 (M5 ignition audit, D16): was startOf('final') − 0.005 = 0.845 — the
// camera was 0.17 under the soil and surfaced 0.005p later, so the opaque
// soil slab POPPED over the visible colony and the epilogue's additive
// content was still time-fading in view after the surface crossing. Arming
// at 0.80 gives the chapter the whole underground rise: its camera-keyed
// rise mask (final/index.js) dissolves the slab in and completes every fade
// before the camera pierces the surface. The chapter is dark at arm (mask 0)
// so the earlier arm has no visible edge of its own.
const FINAL_HOLD = startOf('final') - 0.05;        // 0.80

export function createSeams({ camera, chapters, missionAz = -0.213 }) {
  const state = {
    'rear-cap': { on: false, t: 0 },
    'cap-occludes': { on: false, t: 0 },
    'soil-line': { on: false, t: 0 },
    'rise-cutaway': { on: false, t: 0 },
  };
  let lastP = 0;

  // hysteresis + dwell wrapper: `raw` is the bare predicate, `margin` is how
  // far past the boundary we are (positive = inside)
  function gate(id, inside, outside, now) {
    const s = state[id];
    if (!s.on && inside) { s.on = true; s.t = now; return true; }
    if (s.on && outside && now - s.t > DWELL) { s.on = false; s.t = now; return false; }
    return s.on;
  }

  function update(p) {
    const now = performance.now();
    const { x, y, z } = camera.position;
    const rad = Math.hypot(x, z);
    const az = Math.atan2(x, z);                     // same convention as the director
    const capAz = Math.atan2(z, x);                  // anatomy convention (cos a, ., sin a)

    // T1 - stream-side reveal (D16 restage: the orbit is now a ~90 deg swing
    // toward the visible stream, so the old ~100 deg rear threshold would
    // never be crossed). Arms once the azimuth passes ~48 deg from the
    // Mission azimuth — comfortably before the reveal ramps begin (az ~34 in
    // desktop-absolute terms = ~46 deg past Mission) and far outside the
    // orbit-breath wobble. The journey's own progress is an equally valid
    // driver, but the ADR specifies the camera predicate, so that is what
    // runs; p only supplies the relaxation once the path has dropped under
    // the cap on its way to Connect.
    {
      const d = Math.abs(((az - missionAz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / DEG;
      const inside = d > 48 - HYS_DEG && p < T1_RELAX_IN;
      const outside = d < 48 - HYS_DEG * 2 || p > T1_RELAX_OUT;
      const on = gate('rear-cap', inside, outside, now);
      chapters.inspire.setArmed(on);
    }

    // T2 - the cap occludes the sky: under the gill surface AND inside the rim.
    // The ADR's two clauses are not sufficient on their own: "below the cap and
    // within the rim radius" is ALSO true of every point underground, which
    // kept the gill chamber armed through the whole Owned glide. The chamber
    // has a floor as well as a ceiling, so the predicate gets one.
    {
      const under = capUnderPt(1, capAz).y;
      const floor = groundY(x, z) + 0.8;
      const inside = y < under - HYS_W && y > floor + HYS_W && rad < rimRad(capAz);
      const outside = y > under + HYS_W || y < floor - HYS_W || rad > rimRad(capAz) + 0.35;
      const on = gate('cap-occludes', inside, outside, now);
      chapters.connect.setArmed(on || (p > CONNECT_HOLD_LO && p < CONNECT_HOLD_HI));
    }

    // T3 - soil crossing
    {
      const g = groundY(x, z);
      const inside = y < g - HYS_W;
      const outside = y > g + HYS_W;
      const on = gate('soil-line', inside, outside, now);
      // keep the volume armed through the Final rise so the colony below the
      // cutaway is still there when the camera looks back down at it
      chapters.owned.setArmed(on || (p > OWNED_HOLD_LO && p < OWNED_HOLD_HI));
    }

    // T4 - rise / cutaway: above the ground line while travelling outward
    {
      const g = groundY(x, z);
      const outward = p >= lastP - 1e-6;
      const inside = y > g + 0.5 && p > FINAL_MIN && outward;
      const outside = y < g + 0.5 - HYS_W || p < FINAL_RELEASE;
      const on = gate('rise-cutaway', inside, outside, now);
      chapters.final.setArmed(on || p > FINAL_HOLD);
    }

    lastP = p;
    return state;
  }

  return { update, state };
}
