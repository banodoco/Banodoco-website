// journey-v6 — threshold streamer (adr-d3-world-layout.md section 4).
//
// Each seam is a PREDICATE ON THE CAMERA evaluated every frame, with
// hysteresis so a shaky scrub cannot strobe the streamer, plus a minimum
// dwell before a reverse crossing retires anything. Crossing arms the next
// chapter's assets and retires the previous chapter's high-detail geometry.
//
// T1 has no visual expression at all - it is a pure streaming trigger. T3/T4
// are natural occlusions the camera path already produces; nothing is drawn
// over the frame to hide them (no veils - that is the retired donor model).
// T2 (D16 ground restage) is a pure p-window whose visible reveal is growth
// choreography — the camera stays outside the rim on the Connect leg, so
// there is no cap occlusion to predicate on; the network is dark at arm and
// fully grown before the window's high edge (see the block below).

import { startOf, endOf } from './route.js';
import {
  THRESHOLD_HYSTERESIS_WORLD as HYS_W,
  THRESHOLD_HYSTERESIS_DEG as HYS_DEG,
  THRESHOLD_MIN_DWELL_MS as DWELL,
} from './constants.js';
import { groundY } from './anatomy.js';

const DEG = Math.PI / 180;

// p-windows that back the camera predicates up, expressed against the route
// manifest so a re-timed route carries them along (M4). Values are the
// shipped literals; each offset is authored against the camera path.
const EQUIP_HOLD_LO = startOf('equip') - 0.06;    // 0.20 — the Inspire rest, where the fly-around starts
const EQUIP_HOLD_HI = endOf('equip') + 0.02;      // 0.40 — just past the chapter, before Connect's lights
const T1_RELAX_IN = startOf('connect') + 0.06;    // 0.44 — path has dropped past the rim
                                                  // (D16 ground restage: outside it, same p)
const T1_RELAX_OUT = startOf('connect') + 0.08;   // 0.46
// 0.32 (was startOf('connect') + 0.02 = 0.40). The paths must PRE-EXIST the
// chapter's reveal (2026-08-05: the network is no longer grown, it is lit),
// so the group has to be armed well before anything can be seen. What makes
// the earlier arm invisible — and free — is that the chapter's own visibility
// is now CAMERA-PURE (connect/index.js resolveNow()): its resolve is exactly
// 0 until the gaze has dropped past ~1.2 deg below level, which the path does
// not reach until p ~0.372. Between 0.32 and 0.372 the chapter is armed,
// group.visible is false and it costs no draws.
const CONNECT_HOLD_LO = startOf('connect') - 0.06; // 0.32 — paths armed before they can resolve
// 0.705 (M5 ignition audit, D16 — value kept through the ground restage):
// retire and re-arm both happen inside the Owned soil-crossing murk (camera
// inside the lid material, p 0.692–0.712), i.e. behind genuine occlusion.
// The surface network persists through the whole stipe descent and only
// releases underground.
const CONNECT_HOLD_HI = startOf('owned') + 0.105;  // 0.705
const OWNED_HOLD_LO = startOf('owned') + 0.03;     // 0.63 — colony held through the Final rise
// past-the-end (M5 ignition audit, D16): was endOf('final') − 0.03 = 0.97,
// which retired the colony DURING the end-hold — its faint glow in the
// cutaway wedge faded out in view at 0.97 and re-ignited there on the way
// back. The colony does not cease to exist while the visitor sits at the
// end-hold; the hold now covers the whole tail (p never exceeds 1).
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
    const az = Math.atan2(x, z);                     // same convention as the director

    // T1 - stream-side reveal (D16 restage: the orbit is now a ~90 deg swing
    // toward the visible stream, so the old ~100 deg rear threshold would
    // never be crossed). The journey's own progress is an equally valid
    // driver, but the ADR specifies the camera predicate, so that is what
    // runs; p only supplies the relaxation once the path has dropped under
    // the cap on its way to Connect.
    //
    // THE THRESHOLD IS 25, AND IT IS DERIVED, NOT CHOSEN (2026-08-07; it was
    // 34 against the pre-2026-08-07 ramps, by this same derivation). Arming
    // must land where the chapter's own CAMERA-PURE reveal is exactly zero —
    // the same law T2 states below, and the only thing that makes a seam
    // invisible rather than merely small.
    //
    // Inspire's reveal is a PRODUCT, `master(az) * arrOf(az, ARR[i])`
    // (chapters/inspire/index.js). The master is max(a, b, c, band) and `band`
    // is the steepest of the four above az -37.7, so the master is sm(5, 28);
    // the earliest ARR onset is az 5. Both factors are therefore identically
    // zero for az <= 5 — which is d <= 17.2, with Mission at az -12.2076.
    //
    // Solve the gate's own edges against that bound, with HYS_DEG = 8:
    //   arm     d > T - 8    ->  az > T - 20.2076   must be <= 5  ->  T <= 25.21
    //   release d < T - 16   ->  az < T - 28.2076   must be > -12.2076 (the
    //                            hero pose, d = 0) or it can never release
    //                                                          ->  T > 16
    // T = 25 is the top of that window rounded down to the integer the
    // shipped numbers are written in, and it leaves the arm edge 0.21 deg
    // below the bound — the same margin 34 left against its own bound of 14.
    // Arms at d > 17 (az 4.79), releases at d < 9 (az -3.21). BOTH edges sit
    // on exact zero with both factors of the product zero, so a shaky scrub
    // cannot strobe anything visible either way, in either direction.
    //
    // It used to be 48, which armed at d = 40 (az 28.1) — TEN DEGREES INSIDE an
    // already-open ramp. 48 was correct when it was written: the ramps then
    // began at az 36, exactly where it armed. Commit c6bbbab pulled them in to
    // (18,48)/(38,62)/(54,78) to make the three streams resolve and did not
    // move this number with them, so the gate started opening onto a reveal
    // that was already ~15% up. Measured on the live buffer either side of that
    // crossing: converted dots 0 -> 1975 in one gate, total shed luminance
    // -22.2%, dots above 0.60 luminance -47%. That step is the "different
    // stream of particles that appears" Hannah reported. Anything that re-keys
    // those ramps must re-derive this number from them again.
    {
      const d = Math.abs(((az - missionAz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / DEG;
      const inside = d > 25 - HYS_DEG && p < T1_RELAX_IN;
      const outside = d < 25 - HYS_DEG * 2 || p > T1_RELAX_OUT;
      const on = gate('rear-cap', inside, outside, now);
      chapters.inspire.setArmed(on);
    }

    // EQUIP — a p-window, and the only seam here that streams nothing.
    // The chapter builds no geometry (chapters/equip/index.js: its subject is
    // the specimen itself), so what `armed` gates is the right to SPEAK: the
    // arrival ripple through the mycelium, and the ring a hovered hotspot
    // answers with. The window opens at the Inspire rest — where the
    // fly-around begins, so a ripple can never fire while the camera is still
    // outside on the rim — and closes just past the chapter's own end, before
    // Connect's ground arrival owns the light. No hysteresis: both edges sit
    // on a state that draws nothing at all, so a shaky scrub cannot strobe
    // anything visible either way.
    chapters.equip.setArmed(p > EQUIP_HOLD_LO && p < EQUIP_HOLD_HI);

    // T2 - a PURE p-window (D16 ground restage, doc §6). The old
    // "cap-occludes" camera predicate is dead: the camera never goes under
    // the cap any more — the Connect leg descends OUTSIDE the rim to the
    // ground panorama. Arming is invisible by construction: at the window's
    // low edge the chapter's CAMERA-PURE resolve is exactly zero (2026-08-05;
    // it used to be a zero-extent network — same "dark at arm" law, now
    // keyed to the camera instead of to leg progress), and the high edge sits
    // inside the Owned soil-crossing murk exactly as the M5 ignition audit
    // placed it. No hysteresis needed: both edges are behind zero-visibility
    // states, so a shaky scrub cannot strobe anything visible.
    chapters.connect.setArmed(p > CONNECT_HOLD_LO && p < CONNECT_HOLD_HI);

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
