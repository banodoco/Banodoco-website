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

import {
  THRESHOLD_HYSTERESIS_WORLD as HYS_W,
  THRESHOLD_HYSTERESIS_DEG as HYS_DEG,
  THRESHOLD_MIN_DWELL_MS as DWELL,
} from '../constants.js';
import { capUnderPt, rimRad, groundY } from './anatomy.js';

const DEG = Math.PI / 180;

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

    // T1 - rear-cap reveal: azimuth passes ~100 deg from the Mission azimuth
    // while above the rim. The journey's own progress is an equally valid
    // driver, but the ADR specifies the camera predicate, so that is what
    // runs; p only supplies the "above the rim" relaxation once the path has
    // dropped under the cap on its way to Connect.
    {
      const d = Math.abs(((az - missionAz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / DEG;
      const inside = d > 100 - HYS_DEG && p < 0.44;
      const outside = d < 100 - HYS_DEG * 2 || p > 0.46;
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
      chapters.connect.setArmed(on || (p > 0.40 && p < 0.63));
    }

    // T3 - soil crossing
    {
      const g = groundY(x, z);
      const inside = y < g - HYS_W;
      const outside = y > g + HYS_W;
      const on = gate('soil-line', inside, outside, now);
      // keep the volume armed through the Final rise so the colony below the
      // cutaway is still there when the camera looks back down at it
      chapters.owned.setArmed(on || (p > 0.63 && p < 0.97));
    }

    // T4 - rise / cutaway: above the ground line while travelling outward
    {
      const g = groundY(x, z);
      const outward = p >= lastP - 1e-6;
      const inside = y > g + 0.5 && p > 0.85 && outward;
      const outside = y < g + 0.5 - HYS_W || p < 0.83;
      const on = gate('rise-cutaway', inside, outside, now);
      chapters.final.setArmed(on || p > 0.845);
    }

    lastP = p;
    return state;
  }

  return { update, state };
}
