// chapters/final/camera.js — FINAL's camera leg (M4: chapters own their
// legs; the director composes them per route.js).
//
// Keys are authored in LEG-LOCAL t over the chapter's route span (0.85..1.00
// on the shipped route; global p in comments) — never in global p, so
// re-timing or inserting chapters never invalidates them (merge doc §5).
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const CAMERA = {
  keys: [
    // --- the rise continues (from owned/camera.js's T4 keys) into the
    //     pullback. RE-AIMED 2026-08-07 pass 1 and RE-PATHED in pass 2, with
    //     the Owned post-rest keys — the 141-deg gaze reversal the two rests
    //     mandate finishes underground, so these two keys are a SETTLE, not a
    //     pan: yaw is already ~88% of the way home at p 0.878 and only eases
    //     the rest of the way in (peak 1064 deg/p across the whole leg,
    //     against 1334 originally shipped).
    //
    //     Pass 2 carries the Owned leg's lateral swing home. z rises to match
    //     the corridor (1.800 -> 2.850, 2.250 -> 2.780) and eases into the
    //     frozen 2.700 at the rest, and y at p 0.905 lifts 1.75 -> 1.85 so
    //     the climb stays strictly monotone through the settle. THE x VALUES
    //     ARE BIT-EXACT (-10.200, -12.300) and so are both hold keys: the
    //     reveal front is pullOf(camera.position.x) and the rise mask is
    //     riseOf(the same), so the whole reveal schedule is held by holding
    //     x, and the ring/field are built from the 'final-rest' key below,
    //     which does not move. Gaze is pass 1's, carried: yaw and pitch at
    //     both keys are unchanged to 0.1 deg. See 17-final-field.md. ---
    { t: 0.18666666666666681, pos: V(-10.200, 1.05, 2.850), tgt: V(-3.976, 0.912, -2.013), fov: 50 },   // p 0.878, pitch -1.0 yaw +128
    { t: 0.3666666666666669,  pos: V(-12.300, 1.85, 2.780), tgt: V(-3.329, 1.058, -1.791), fov: 47.2 }, // p 0.905, pitch -4.5 yaw +117
    // --- FINAL rest: oblique cutaway recession from OUTSIDE the ring's west
    //     arc, gaze cutting across the ring chord. Shallow ~8.8 deg
    //     down-pitch puts the soil-line across the frame on a diagonal:
    //     fairy ring and spore sky above it, the colony in section below,
    //     the hero organism ~12.6 deg right of centre at 14.8 units — in
    //     family with the mature members, never the centre of the
    //     composition. The near arc passes behind the camera (members
    //     cleared > 3 units off the path, Spike B's clearance rule). Tilt is
    //     PITCH ONLY, never roll.
    { t: 0.5000000000000003,  pos: V(-14.72, 2.73, 2.700),  tgt: V(-3.06, 0.83, -1.94), fov: 45.5, hold: true, note: 'final-rest' },   // p 0.925
    // --- THE LEG ENDS HERE. There used to be a second hold key at t = 1.0
    //     ('final-recede', pos -17.73/3.95/3.260, tgt -5.44/2.08/-0.97, fov
    //     44) that kept pulling the camera back across the whole second half
    //     of the chapter — radius 14.97 -> 18.03 and y +1.22 over ~1,575 px
    //     of scroll. It was the FOOTER's framing key: the "Site Information"
    //     band rose over the composition through p 0.955..1 and the recede
    //     backed the field off to make room for it (17-final-field.md,
    //     2026-08-03 residual: "the near-right field bodies sit a touch hot
    //     behind the footer"). The footer was deleted in the navigation redux
    //     (26ca8d3, 25-navigation-redux.md §2) and the recede was not — so a
    //     stale, more zoomed-out framing of the epilogue stayed reachable at
    //     the very bottom of the ride, with nothing in it to frame.
    //
    //     With the key gone, keyedPose() clamps to the last key, so every
    //     p >= 0.925 renders the Final rest EXACTLY: the epilogue rest is the
    //     resting composition, and the end-hold is a true hold of it. That is
    //     what the redux already declared ("the epilogue now simply holds its
    //     composition there") — this file was the last place it wasn't true.
    //
    //     What remains past the rest is therefore intentional and small: the
    //     fog finishes its settle (near 13.75 -> 15, far 60.3 -> 62, done by
    //     p ~0.96) over a camera that no longer moves, and then the route
    //     holds to its full stop at TERMINAL_P. Both p = 0.925 and p = 1 are
    //     snap-commit anchors and now render the same frame, so a scroll into
    //     the tail resolves to the resting composition whichever way it goes.
    //
    //     Nothing before the rest moved: the p 0.905 key's Catmull-Rom
    //     tangent reads KEYS[i-1]/KEYS[i+1] = the p 0.878 and p 0.925 keys,
    //     neither of which changed, and the rest key's own tangent was
    //     already zero (hold: true). Camera parity p <= 0.925 is bit-exact,
    //     and the `final` golden — shot at restProgress('final') = 0.925 —
    //     is byte-identical. Also held by holding the pose: uPull/uPullRaw
    //     (functions of camera.x), so the reveal schedule no longer keeps
    //     running past the resting frame either.
  ],
};
