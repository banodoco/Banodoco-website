// journey-v6 — portrait re-composition field (W4-F / 12-platforms PL-1.1).
//
// A tall frame cannot hold the landscape compositions: the copy blocks own
// more of the frame (Inspire bottom, Connect left-low, Owned top-centre,
// Final top) and the horizontal fov collapses. Plate II's portrait column
// gives each rest a DELIBERATE portrait pose — this module is those poses,
// expressed as an authored OFFSET FIELD blended over the landscape path:
//
//   pose(p, aspect) = poseAt(p) ∘ offset(p) · w(aspect)
//
//   offset(p)  — authored per-rest deltas, interpolated between keys with
//                zero-slope smoothstep, so every leg eases from one portrait
//                intention to the next with no velocity step of its own.
//   w(aspect)  — 0 for aspect >= 1 (landscape is BIT-identical to the
//                un-offset path), 1 for aspect <= 0.75 (phones), smooth
//                between (folded tablets, split windows).
//
// Offsets are FRAME-relative, not world-relative, so they survive the legs:
//
//   back     dolly multiplier along the view axis, about the landscape
//            target (1 = none). Re-aims nothing; buys vertical context.
//   rise     camera world-Y delta — lifts/lowers the eye without re-aiming.
//   truck    camera+target shift along view-right — slides the whole frame
//            sideways, gaze direction unchanged.
//   tgtUp    target world-Y delta — the vertical re-aim (what actually moves
//            the composition up or down the tall frame).
//   tgtRight target-only shift along view-right — the horizontal re-aim.
//   fov      additive vertical-fov delta.
//
// The field is EXACTLY zero at and below the orbit start (p 0.040): below it
// the camera is the hero's pose verbatim, and in portrait the hero's own
// responsive table (index.html VIEWS.mobile / .tablet) already IS the
// approved Mission portrait composition (Plate II row 1: "portrait — live
// mobile pose, cam y 3.2, fov 64"). Mission portrait is the hero's, kept.
//
// Everything here is a pure function of (p, aspect) — no state, no time, no
// DOM reads — so reverse scrubbing is exact and capture tooling can request
// either orientation from any window (?aspect=portrait, wired in director).

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

/* ------------------------------------------------------------------ */
/* Aspect weight                                                       */
/* ------------------------------------------------------------------ */
export const PORTRAIT_FULL_ASPECT = 0.75;   // at or below: full field
export const PORTRAIT_ZERO_ASPECT = 1.00;   // at or above: exactly zero

export function portraitWeight(aspect) {
  if (!(aspect < PORTRAIT_ZERO_ASPECT)) return 0;   // NaN/undefined → landscape
  return 1 - smooth01(
    (aspect - PORTRAIT_FULL_ASPECT) / (PORTRAIT_ZERO_ASPECT - PORTRAIT_FULL_ASPECT),
  );
}

/* ------------------------------------------------------------------ */
/* The authored field                                                  */
/* ------------------------------------------------------------------ */
// Keys at the rests carry the composition; keys on the legs exist only to
// keep the travel honest (the slip-under must still slip UNDER the rim, the
// stipe descent must stay outside the stipe — clearance there is ~0.5 world
// units, so those legs run the field near zero and let it bloom at the rest).
// p values reference director.js: ORBIT_P0 0.040, rests 0.26 / 0.49 / 0.725 /
// 0.925, descent keys 0.622–0.718.
const ZERO = { back: 1, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 0 };

const KEYS = [
  // Mission + orbit head: zero — the hero's own mobile pose is the portrait
  // composition, and the orbit must lift off from it without a step.
  { p: 0.040, ...ZERO },

  // INSPIRE (rest 0.26, D16 stream-side restage) — crown low-left, the
  // stream's release point and the three clustered plumes mid-frame, chips
  // above the copy. The dolly-back pulls the cluster inside the narrow
  // frame; the stronger tgtRight (vs the old rear rest) slides the whole
  // cluster off the right edge so all three chips — Arca's is the widest —
  // land fully inside at 430×932, above the bottom copy block.
  { p: 0.260, back: 1.60, rise: 0.60, truck: 0, tgtUp: 0.10, tgtRight: 1.05, fov: 14 },

  // Ground-descent approach (D16 restage; retuned 2026-08-04 for the
  // monotone Inspire->Connect zoom-out): the landscape leg no longer pushes
  // in toward the stream, so the old light back (1.14) here made the
  // PORTRAIT travel re-approach mid-leg while the landscape widened. The
  // back eases 1.60 -> 1.55 -> 1.62 between the two rests so portrait
  // subject-distance and fov grow monotonically with the landscape's; the
  // tgtUp/tgtRight now lean a third of the way toward the re-composed
  // Connect rest so the last 0.08 of the leg is a settle, not a lurch.
  { p: 0.410, back: 1.55, rise: 0.28, truck: 0, tgtUp: 0.55, tgtRight: -0.12, fov: 11 },

  // CONNECT (rest 0.49, ground panorama) — re-authored 2026-08-04 for the
  // top-left / top-right restage. The landscape frame gives the mushroom the
  // upper-LEFT and the copy the upper-RIGHT; a 375-wide frame has no "beside",
  // so portrait stacks the same three elements instead: copy across the top
  // (pos-topright at 88vw), the mushroom in the middle-left band directly
  // under it, and the three hubs fanned through the lower half. The strong
  // tgtUp is what pushes the whole organism DOWN clear of the copy block, the
  // rise keeps the ground plane open under it, and the dolly-back compresses
  // the 56-deg landscape hub fan into the ~35-deg portrait frustum so all
  // three hub cores stay inside the frame. (Per-orientation hub label anchors
  // are the chapter's own affair — doc §3; only Discord still needs one.)
  { p: 0.490, back: 1.62, rise: 1.50, truck: 0, tgtUp: 2.75, tgtRight: -0.30, fov: 8 },

  // The approach to the trunk + the exterior descent (0.575–0.718):
  // near-zero field — clearance to the stipe is small and the leg's whole
  // job is the convergence itself. A whisper of fov keeps the frame from
  // feeling suddenly narrower than the panorama.
  { p: 0.622, back: 1.04, rise: 0.05, truck: 0, tgtUp: 0.05, tgtRight: 0, fov: 4 },
  { p: 0.700, back: 1.01, rise: 0, truck: 0, tgtUp: 0, tgtRight: 0, fov: 3 },

  // OWNED (rest 0.725) — copy claims the TOP-centre in portrait, so the
  // colony sits in the lower two-thirds: a slight up-tilt from the landscape
  // glide drops the bright cord ceiling toward mid-frame (below the claims)
  // and fills the deep field at the bottom; the dolly-back keeps the pod
  // cluster inside the narrow horizontal field.
  // (tgtRight nudges the pod cluster left of the right edge so the stacked
  // chip labels have room to run at 375px width.)
  { p: 0.725, back: 1.16, rise: 0.28, truck: 0, tgtUp: -0.16, tgtRight: 0.25, fov: 10 },

  // FINAL (rest 0.925 → recede 1.0) — "steeper diagonal; copy top, ring
  // stacked in depth". Lift the eye and drop the gaze so the soil-line cuts
  // a steeper diagonal; the small rightward frame-shift (tgtRight < 0 aims
  // left of the hero, sliding it toward the right edge) keeps the headline
  // clear of the hero's cap. The recede carries the same offsets so the
  // epilogue stays one continuing line.
  { p: 0.925, back: 1.08, rise: 1.35, truck: 0, tgtUp: -0.45, tgtRight: -0.35, fov: 8 },
  { p: 1.000, back: 1.08, rise: 1.35, truck: 0, tgtUp: -0.45, tgtRight: -0.35, fov: 8 },
];

const FIELDS = ['back', 'rise', 'truck', 'tgtUp', 'tgtRight', 'fov'];
const _off = { ...ZERO };

function offsetAt(p) {
  if (p <= KEYS[0].p) { Object.assign(_off, KEYS[0]); return _off; }
  const last = KEYS[KEYS.length - 1];
  if (p >= last.p) { Object.assign(_off, last); return _off; }
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth01((p - a.p) / (b.p - a.p));   // zero slope at every key
  for (const f of FIELDS) _off[f] = a[f] + (b[f] - a[f]) * t;
  return _off;
}

/* ------------------------------------------------------------------ */
/* Application                                                         */
/* ------------------------------------------------------------------ */
// Scratch — plain objects so this module needs no three.js import and stays
// trivially testable. pose.pos / pose.target are THREE.Vector3-compatible.
const _fwd = { x: 0, y: 0, z: 0 }, _right = { x: 0, y: 0, z: 0 };

/** Blend the authored portrait field over a landscape pose, in place.
 *  Pure in (pose, p, aspect); a no-op (bit-identical pose) for aspect >= 1. */
export function applyPortrait(pose, p, aspect) {
  const w = portraitWeight(aspect);
  if (w <= 0) return pose;
  const o = offsetAt(p);

  // view frame of the LANDSCAPE pose
  _fwd.x = pose.target.x - pose.pos.x;
  _fwd.y = pose.target.y - pose.pos.y;
  _fwd.z = pose.target.z - pose.pos.z;
  // right = normalize(fwd × worldUp)  (worldUp = +Y; no roll anywhere)
  _right.x = -_fwd.z; _right.y = 0; _right.z = _fwd.x;
  const rl = Math.hypot(_right.x, _right.z) || 1;
  _right.x /= rl; _right.z /= rl;

  // dolly about the landscape target
  const back = 1 + (o.back - 1) * w;
  pose.pos.x = pose.target.x - _fwd.x * back;
  pose.pos.y = pose.target.y - _fwd.y * back;
  pose.pos.z = pose.target.z - _fwd.z * back;

  // camera lift + truck (truck carries the target with it)
  pose.pos.y += o.rise * w;
  pose.pos.x += _right.x * o.truck * w;
  pose.pos.z += _right.z * o.truck * w;
  pose.target.x += _right.x * o.truck * w;
  pose.target.z += _right.z * o.truck * w;

  // re-aim
  pose.target.y += o.tgtUp * w;
  pose.target.x += _right.x * o.tgtRight * w;
  pose.target.z += _right.z * o.tgtRight * w;

  pose.fov = Math.min(72, Math.max(24, pose.fov + o.fov * w));
  return pose;
}

/** QA hook: the raw field at p (a copy), for the audit tooling. */
export function portraitOffsetAt(p) { return { ...offsetAt(p) }; }
