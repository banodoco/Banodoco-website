// journey-v6 — FINAL epilogue, shared world model (W4-D production build).
//
// One source of truth for the fairy ring, the cutaway line, and the reveal /
// pulse shader language, shared by final-ring.js / final-terrain.js /
// final-sky.js. Everything here is deterministic and pure in world
// coordinates, so the three modules agree without talking to each other.
//
// CREATIVE DIRECTION (Hannah, W4-D): the HERO ORGANISM IS PART OF THE RING.
// The ring is centred at RING_C so the hero (world origin) sits ON its arc —
// one mature body among the others, never the centre and never the parent.
// The reveal is an "undarken": the other fruiting bodies were always there,
// unlit; as the camera pulls back they kindle in sequence around the arc.
//
// The reveal driver is the CAMERA, not journey progress: uPull is derived
// from camera.position.x, which is strictly monotonic along the re-keyed
// Final leg (x -3.3 -> -17.0). That keeps the reveal a pure function of the
// pose — ?p= sampling, reverse scrubbing and nav flights all agree — without
// this module ever reading journey state.

import * as THREE from 'three';
import { makeRng, gaussOf, heat, groundY } from '../../anatomy.js';
import { CAP_R_OVER_H } from './species.js';

export const TAU = Math.PI * 2;
export { makeRng, gaussOf, heat, groundY };

/* ------------------------------------------------------------------ */
/* The ring                                                            */
/* ------------------------------------------------------------------ */
// Ring centre in plan. Hero at origin: az ~7.6 deg about C, r ~6.05 — on the
// inner edge of the irregular band (fairy rings are never true circles).
export const RING_C = { x: -6.0, z: -0.8 };
export const HERO_AZ = Math.atan2(0.0 - RING_C.z, 0.0 - RING_C.x); // ~0.1326

/** Arc coordinate about RING_C: 0 at the hero, increasing CCW, wrapped 0..1.
 *  This is the coordinate the reveal order, the growth-front pulse and the
 *  CTA wave all travel along. */
export function arcOf(x, z) {
  let a = Math.atan2(z - RING_C.z, x - RING_C.x) - HERO_AZ;
  a = ((a % TAU) + TAU) % TAU;
  return a / TAU;
}

// The eleven built members (the hero is the twelfth body). Authored, not
// random: azimuths leave a gap at az ~130-200 where the arc passes the
// camera/cutaway side ("the ring continues" reading), r pinched there.
// dRev = single-direction (CCW) arc distance from the hero -> the reveal
// travels ONE way around the ring and closes beside the hero, so no two
// members ever brighten simultaneously.
//   az (deg about C), r, h (height), m (maturity 0..1)
// The az ~140-275 sector is deliberately empty: the cutaway SLICES THROUGH
// THE RING — that arc is below the soil-line, its colony exposed in section,
// and the ring visibly continues beyond the lip (m9/m10 stand right on it).
const MEMBER_SPEC = [
  // m1 raised with the near pair (declutter round): at h 1.6 the rest
  // camera looked down onto it and it read as a floating rim ellipse
  { az: 38,  r: 7.2, h: 2.0, m: 0.55 },
  { az: 62,  r: 8.2, h: 2.8, m: 1.00 },   // mature
  { az: 84,  r: 7.8, h: 2.1, m: 0.75 },
  // The two near members (declutter round): raised so the rest camera
  // (y 2.73) sees them side-on like every other body, not down into an
  // open bowl — Hannah's "the first mushroom looks different" was partly
  // these two reading as lit cups from above.
  { az: 104, r: 7.3, h: 2.0, m: 0.55 },
  { az: 123, r: 7.9, h: 1.85, m: 0.40 },  // near-right, on the lip
  // az 279 -> 273 and az 303 -> 311 (2026-08-16, Hannah: "some of the
  // mushrooms feel a bit cluttered and overlapping"). The 17-final-field
  // pass separated 291 from 279 by six degrees and the SAME pancake
  // re-formed one neighbour over: measured at the rest pose, the far-lip
  // trio stood at screen-x 22.0 / 26.2 / 31.6 (% of frame) with caps
  // ~9% wide each — three mature silhouettes summing into one blob on
  // the frame-left band. Widening the trio to ~17 / 26 / 38 gives each
  // cap its own column; arc order (and so the CCW reveal order) is
  // unchanged, and the walk-in guard still owns the soil margin.
  { az: 273, r: 8.3, h: 2.5, m: 0.95 },   // mature — stands on the far lip
  { az: 297, r: 8.6, h: 2.6, m: 0.90 },   // mature
  { az: 311, r: 7.4, h: 2.2, m: 0.80 },
  { az: 327, r: 6.6, h: 1.3, m: 0.35 },   // young, closes the ring by the hero
];

/* ------------------------------------------------------------------ */
/* The cutaway                                                         */
/* ------------------------------------------------------------------ */
// An IRREGULAR cut line in plan (never a clean diagram edge): base line
// n.(x,z) = d, wobbled along its tangent. kept side (soil + surface survive)
// is cutVal > 0; the Final camera leg lives on the removed side.
//
// The line is authored OBLIQUE to the rest gaze (derived from lip-distance =
// 6 - 0.9 * screen-right in camera coords at the rest pose), so in frame the
// soil-line enters at mid-height on the LEFT edge and falls diagonally to
// below the bottom-right corner — FN-1.1's diagonal, with the cut face and
// the exposed colony filling the lower-left wedge. The hero, the ring
// centre and the az 279-123 arc all sit on the kept side; the near-left arc
// is sliced away with the soil.
export const CUT_N = { x: 0.944, z: 0.331 }; // ~unit, toward the kept side
const CUT_D = -7.82;
function wob(s) { return 0.9 * Math.sin(s * 0.30 + 1.2) + 0.55 * Math.sin(s * 0.12 + 4.0); }

export function cutVal(x, z) {
  const s = -CUT_N.z * x + CUT_N.x * z;
  return (CUT_N.x * x + CUT_N.z * z) - CUT_D + wob(s);
}

/** Point on the cut edge at tangent parameter s (world units along the lip). */
export function cutEdgePoint(s) {
  const off = CUT_D - wob(s);
  return {
    x: CUT_N.x * off - CUT_N.z * s,
    z: CUT_N.z * off + CUT_N.x * s,
  };
}
// Tangent span of the lip that can appear in frame from the Final leg.
export const CUT_S_MIN = -14;
export const CUT_S_MAX = 10;

/* ------------------------------------------------------------------ */
/* Members, resolved                                                   */
/* ------------------------------------------------------------------ */
// Build-time nudge: any member that lands off the kept side (the wobble is
// authored, but authored blind) walks inward until it stands on soil with a
// real margin; a member that cannot keep ring radius >= 4.6 is dropped (it
// belongs to the sliced-away arc). Deterministic — same result every boot.
export const MEMBERS = MEMBER_SPEC.flatMap((s, i) => {
  const a = (s.az * Math.PI) / 180;
  let r = s.r;
  let x = RING_C.x + Math.cos(a) * r;
  let z = RING_C.z + Math.sin(a) * r;
  let guard = 0;
  while (cutVal(x, z) < 0.35 && r > 4.6 && guard++ < 30) {
    r -= 0.15;
    x = RING_C.x + Math.cos(a) * r;
    z = RING_C.z + Math.sin(a) * r;
  }
  if (cutVal(x, z) < 0.35) return [];
  const arc = arcOf(x, z);
  // Per-member spore-shed strength (D14 axis): mature bodies shed, each with
  // its own seeded intensity; immature bodies not at all. Deterministic —
  // seeded from the member index, no shared-stream order dependence.
  const shed = s.m >= 0.55 ? 0.35 + 0.65 * makeRng(0x5eed + i * 7919)() : 0;
  return [{
    i, x, z, r, az: a,
    gy: groundY(x, z),
    h: s.h,
    // Rim radius. 18-one-species.md: this was `h * (0.40 + 0.10 * maturity)`
    // — an independent cap-width law that made every member's cap up to 26%
    // too narrow for its height (the hero's own ratio is CAP_R / apex height
    // = 0.5378) and made maturity a SHAPE axis. It is now the species' one
    // cap-width law. Read by sky.js (spore emission disc) and by anything
    // that needs a body's plan footprint; the bodies themselves get their
    // rim from the form functions, never from this.
    capR: s.h * CAP_R_OVER_H,
    m: s.m,
    shed,
    arc,
    // reveal threshold on uPull: single-direction CCW sweep from the hero.
    // Assigned in the ladder pass below (order from arc, spacing from the
    // authored ladder) — a placeholder here so the shape of the record is
    // complete either way.
    reveal: 0.08 + 0.80 * arc,
  }];
});

/* ---- THE RING'S ARRIVAL LADDER (2026-08-09) --------------------------
   Hannah: "the mushrooms should light up a lot more gradually... one at a
   time — like a town of Christmas trees lighting up."

   `reveal = 0.08 + 0.80 * arc` was affine in arc, but the members' arcs are
   clumped (five on the near lip inside a third of a turn, four on the far
   lip, the sliced-away arc empty between them) — so the near five kindled
   0.053 of uPull apart while the camera was crossing that range at ~12
   units of uPull per unit p: five arrivals inside a quarter second at a
   deliberate scroll. Same disease ring.js's rank pass cured in the field
   (18-one-species.md §12), same cure: ORDER stays the single-direction CCW
   sweep from the hero — members sorted by arc keep exactly the order the
   old line gave them — but SPACING comes from an authored ladder, laid out
   in p (what the wheel and the eye actually traverse) and converted to
   uPull through the measured camera curve of the Owned→Final leg
   (§13 of 18-one-species.md has the curve and the derivation).

   The ladder opens sparse and tightens: the first members are singles a
   beat apart — each one its own event — and the far-lip four close the
   show just before the rest. Members are the FIRST rungs of the merged
   24-slot ladder (ring.js's field ladder fills the rest), so the whole
   chapter arrives on one authored timeline.

   RE-DERIVED 2026-08-09 second pass ("charging up", §14): the Final rest
   moved p 0.925 -> 0.97 (route.js + camera.js, same commit) and the leg's
   x -12.3 -> -14.72 approach now takes 0.065 of p where it took 0.020, so
   every rung was re-laid on the NEW measured curve (sample scrollTo(p) ->
   camera.x; §14 has the table). Slots are authored in p — starts
   p 0.856 -> 0.933, gaps 7.0 -> 2.0 millip, same accelerando shape, same
   nine slots of the same merged 24 — and converted to uPull through that
   curve. The late rungs now stand past the OLD 0.84 light ceiling, which
   is exactly what PULL_MAX (below) makes legal: the last rung 0.9511
   finishes its light at 1.1111, inside the 1.1200 the rest delivers.

   sweepReveal() interpolates the same re-timed sweep for every non-member
   consumer of the old formula (the continuation glow pools), so an
   arc-keyed pool still kindles exactly between the members it sits
   between. Piecewise-linear and monotone in arc: cord vertices between two
   members still light strictly member-to-member, only on the new clock. */
/* RE-CUT EVEN IN SCROLL (2026-08-16, Hannah's SEVENTH pass, the first
   asking for LESS: "uneven and lasts too long... slick and elegant" like
   the landing view's own startup). The accelerando is gone. The shipped
   24-slot ladder was even in neither axis — gaps 0.0867 pull at the head
   to 0.0137 at the tail, played over a camera that accelerates into the
   rest — so the town opened at 176 ms a body and closed at 32 ms, and all
   24 arrivals fit inside 44% of the leg's road while the last kindles
   crawled through the rest of it. The new rungs are authored EVEN IN
   SCROLL: 24 slots equally spaced in wheel px between the first rung
   (0.0966, unchanged — dark at arm is a fact of the pierce, not of
   taste) and 0.95, converted to pull through the §14-style measured
   curve of the RE-SHORTENED leg (route.js segVh [10.0, 0.6], k1 0.70 —
   same commit). One body every ~190 px-normalised beat, start to finish,
   the same interleave of slots as before: members keep slots 0-3 (the
   four opening singles), 6, and the four closers 18/21/22/23; the field
   keeps the other fifteen (ring.js FIELD_LADDER, same PERM scatter). The
   last rung finishes its light at pull ~1.03, while the frame still
   visibly moves — never in the old post-brake crawl. */
const RING_LADDER = [0.0966, 0.1445, 0.1909, 0.2365, 0.3728,
                     0.8290, 0.9042, 0.9276, 0.9500];
// The guard: the ladder is authored against today's nine members. If the
// build ever drops one (the inward-walk can), the rank map would silently
// hand every later member the wrong rung — so the whole sweep, members and
// interpolated consumers alike, falls back to the affine law instead of a
// half-applied ladder.
const SWEEP_PTS = MEMBERS.length === RING_LADDER.length
  ? MEMBERS.map(m => m.arc).sort((a, b) => a - b)
      .map((a, i) => [a, RING_LADDER[i]])
  : null;
export function sweepReveal(arc) {
  const pts = SWEEP_PTS;
  if (!pts) return 0.08 + 0.80 * arc;
  if (arc <= pts[0][0]) return pts[0][1];
  if (arc >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (arc <= pts[i][0]) {
      const [a0, r0] = pts[i - 1], [a1, r1] = pts[i];
      return r0 + (r1 - r0) * ((arc - a0) / (a1 - a0));
    }
  }
  return pts[pts.length - 1][1];
}
for (const m of MEMBERS) m.reveal = sweepReveal(m.arc);

// Members that shed spores (mature bodies only — and NEVER the hero: the hero
// keeps its own ambient shed, and no stream may read as hero -> others).
// Weighted by per-member shed strength via repetition: the sky's uniform
// source pick then samples strong shedders more often, with no sky changes.
export const SPORE_SOURCES = MEMBERS.filter(m => m.shed > 0)
  .flatMap(m => Array(1 + Math.round(m.shed * 2)).fill(m));

/* ------------------------------------------------------------------ */
/* Reveal driver                                                       */
/* ------------------------------------------------------------------ */
// The clamp ceiling. It used to be 1.0 — an arbitrary normalisation that
// quietly imposed a LIGHT CEILING of 1 − REVEAL_W = 0.84 on every threshold
// in the chapter: a body keyed past it could never finish brightening,
// because the driver saturated before its smoothstep did. 2026-08-09
// (Hannah's "charging up", 18-one-species.md §14) the Final rest moved to
// p 0.97 and the arrival ladder spread across the road that bought — and
// the ladder's late rungs need thresholds up to ~0.95. The ceiling is now
// the value the camera-pure driver actually reaches at the rest
// (x −14.72 -> 1.1200), so "fully revealed at the rest" is a property of
// the pose again, not of a clamp. Safe by inspection: every consumer of
// uPull is a saturating smoothstep (world.js STRAND/POINT_VERT, sky.js
// aGate/bandGate, canopy vertices) or a low-threshold gate (PICK_PULL 0.55,
// reach 0.25..0.70, dwell 0.88), so for every SHIPPED threshold (all
// <= 0.84) the values 1.0 and 1.12 are indistinguishable — behaviour below
// u = 1.0 is bit-identical, and above it only the new late rungs differ.
export const PULL_MAX = 1.12;
/** Camera-x -> pull in [0, PULL_MAX]. 0 while underground / at the crest,
 *  exactly PULL_MAX at the Final rest. Monotone along the leg. */
export function pullOf(camX) {
  const u = pullRawOf(camX);
  return u < 0 ? 0 : u > PULL_MAX ? PULL_MAX : u;
}
/** The same map, UNCLAMPED. Negative while the camera is still below the
 *  surface pierce (x > −8). The clones' entry draw runs on THIS rather than on
 *  the clamped value so the front can never be flattened by the clamp — see
 *  clones.js DRAW_W_HI/LO. */
export function pullRawOf(camX) { return (-camX - 8.0) / 6.0; }
export const REVEAL_W = 0.16;   // smoothstep width used by every shader

/* ------------------------------------------------------------------ */
/* Shared shader language                                              */
/* ------------------------------------------------------------------ */
// Every lit element carries the same five per-vertex channels:
//   aArc    arc coordinate (or along-cord coordinate for aWave pieces)
//   aReveal reveal threshold on uPull; < 0 = always lit
//   aTw     twinkle phase
//   aBoost  how strongly the growth-front pulse + CTA wave light this vertex
//   aWave   cord-wave participation (slow outward traveling wave)
// and every material shares one uniform set, ticked once per frame by the
// orchestrator. Fog fades to BLACK (additive), tracking the director's
// re-parameterised scene fog by manual copy — robust against hidden-tab
// capture bursts and any renderer fog-flag quirks.

/** The hero's OWN tap-pulse uniform objects, harvested out of its live
 *  materials (organism/organism.js §"tap pulse" shares one `pulseC`/`pulseT`/
 *  `pulseP` trio across every glowing material it builds). organism/* is
 *  read-only and does not export the trio, so we reach it the same way
 *  clones.js does: off a material that already carries it.
 *
 *  Sharing the OBJECTS rather than copying the values is the whole point —
 *  one write plants a wave that the hero, the clones, the batched species
 *  bodies, the colony floor and the horizon all answer in the same tick, and
 *  organism's own `tap-pulse` animator does the per-frame `uPulseT += dt` for
 *  all of them. If the hero's shaders ever drift out from under this, the
 *  fallback is an inert local trio parked at uPulseT = 1e3, where pulseAt()
 *  is exactly 1.0 — the batch simply stops answering taps rather than
 *  throwing. */
export function heroPulse(sceneApi) {
  let found = null;
  const sway = sceneApi && sceneApi.groups && sceneApi.groups.sway;
  if (sway) {
    sway.traverse((o) => {
      const u = o.material && o.material.uniforms;
      if (!found && u && u.uPulseC && u.uPulseT && u.uPulseP) found = u;
    });
  }
  return found
    ? { uPulseC: found.uPulseC, uPulseT: found.uPulseT, uPulseP: found.uPulseP }
    : {
        uPulseC: { value: new THREE.Vector3() },
        uPulseT: { value: 1e3 },
        uPulseP: { value: new THREE.Vector3(2.6, 0.33, 1.4) },
      };
}

// Idle value for the WOBBLE slot IDs. NOT -1: `aBody` defaults to -1 for every
// vertex that is not a fruiting body (terrain, trees, root stubs, the ground
// glows), so an idle slot parked at -1 would MATCH all of them — and a wobble
// slot carries a ROTATION, so one stale radian on the terrain is a whole floor
// sliding sideways. That bug was found and fixed once; the discipline outlived
// the pointer glow that used to share the channel and is now the ONLY reason
// this constant exists. No member ID is ever -999.
export const WOB_IDLE = -999;

export function makeUniforms(sceneApi) {
  return {
    // the hero's own tap-pulse trio, shared by object — see heroPulse()
    ...heroPulse(sceneApi),
    uAmount:  { value: 0 },     // chapter fade (T4 arm/retire)
    uPull:    { value: 0 },     // camera-derived reveal driver
    // The same driver UNCLAMPED below 0, for the clone entry-draw front only
    // (clones.js, part B). Never reaches a shader — the draw is a CPU-side
    // per-body uniform write — but it lives here because it is the same
    // camera-pure quantity and belongs beside the one it is derived from.
    uPullRaw: { value: 0 },
    uFront:   { value: -1 },    // growth-front pulse phase along arc
    uFrontOn: { value: 0 },
    uCta:     { value: -1 },    // CTA wave phase along arc
    uCtaOn:   { value: 0 },
    uTime:    { value: 0 },
    uFogNear: { value: 7 },
    uFogFar:  { value: 20 },
    // ---- the poke, for batched bodies (ring.js §POKE) ----
    // A clone owns a scene-graph node and gets organism §10c's cantilever
    // ring-down applied to its own sway pivot. A batched species body has no
    // node — it is a few hundred vertices inside a shared draw — so its body
    // rotation has to happen in the vertex shader, per tapped member, against
    // the aBody ID its vertices carry. A geometry with no aBody attribute at
    // all reads the WebGL generic default 0.0, which is why member IDs start
    // at 1 and never at 0.
    //
    // TWO SLOTS, not one. A stolen wobble snaps a body back to rest
    // mid-ring-down, which reads as a glitch. Two slots cover poking a second
    // body while the first still rings (the ring-down runs ~3 s), and ring.js
    // always steals the QUIETER slot, so a third poke inside three seconds
    // cuts off the wobble that had least left to say.
    uWobId:   { value: new THREE.Vector2(WOB_IDLE, WOB_IDLE) },
    uWobA:    { value: new THREE.Vector3() },   // slot 0 pivot (world, at the soil)
    uWobB:    { value: new THREE.Vector3() },   // slot 1 pivot (world, at the soil)
    uWobR:    { value: new THREE.Vector4() },   // (rx0, rz0, rx1, rz1) radians
  };
}

// organism/organism.js's PULSE_GLSL, VERBATIM. A tap plants uPulseC at the
// touched point and rewinds uPulseT to 0; every glowing vertex answers by
// distance — an expanding ring that BROADENS and dims as it travels, with a
// range falloff so only the tapped neighbourhood responds. uPulseP shapes the
// wave per tap: (2.6, 0.33, 1.4) is the floor ping's far-carrying swell,
// (1.4, 1.5, 1.2) is a body poke's slow, short-range, gentle shiver.
//
// Parked at uPulseT = 1e3 the ring has long since died: exp(-1.15 * 1e3)
// underflows to 0, so pulseAt() returns EXACTLY 1.0 and the rest frame is
// untouched. That is what keeps this addition golden-safe.
const PULSE_GLSL = /* glsl */ `
  uniform vec3 uPulseC;
  uniform float uPulseT;
  uniform vec3 uPulseP; // x: wave speed, y: range falloff, z: amplitude
  float pulseAt(vec3 wp) {
    float d = distance(wp, uPulseC);
    float w = uPulseP.x * (0.15 + 0.21 * uPulseT);
    float ring = exp(-pow((d - uPulseP.x * uPulseT) / w, 2.0));
    return 1.0 + uPulseP.z * ring * exp(-1.15 * uPulseT) * exp(-d * uPulseP.y);
  }
`;

// The batched body's cantilever ring-down (see uWobId in makeUniforms).
// organism §10c rotates the whole stalk about its root by (tap.x, tap.z) — a
// small-angle rotation vector w = (rx, 0, rz) applied to the offset from the
// base, so the displacement is the cross product w x r:
//     (-rz*r.y,  rz*r.x - rx*r.z,  rx*r.y)
// At the amplitudes this ring-down reaches (the saturating clamp's own
// ceiling is |tap| ~ 0.039 rad) the small-angle form is accurate to under a
// thousandth of a world unit, which at these distances is a ten-thousandth of
// a pixel. Two unrolled slots, branch-free: `1.0 - step(0.5, |a - b|)` is an
// equality test on IDs that are whole numbers. An idle slot costs one step()
// and a multiply by zero.
//
// aBody is declared HERE because the wobble is the only thing left that reads
// it. It used to be shared with a pointer-hover glow; that glow is gone (see
// this file's makeBatch note and 18-one-species.md, 2026-08-05).
const WOBBLE_GLSL = /* glsl */ `
  attribute float aBody;
  uniform vec2 uWobId;
  uniform vec3 uWobA, uWobB;
  uniform vec4 uWobR;
  vec3 wobbled(vec3 wp) {
    vec3 d = vec3(0.0);
    float m0 = 1.0 - step(0.5, abs(aBody - uWobId.x));
    vec3 r0 = wp - uWobA;
    d += m0 * vec3(-uWobR.y * r0.y, uWobR.y * r0.x - uWobR.x * r0.z, uWobR.x * r0.y);
    float m1 = 1.0 - step(0.5, abs(aBody - uWobId.y));
    vec3 r1 = wp - uWobB;
    d += m1 * vec3(-uWobR.w * r1.y, uWobR.w * r1.x - uWobR.z * r1.z, uWobR.z * r1.y);
    return wp + d;
  }
`;

// WHY modelMatrix AND viewMatrix INSTEAD OF modelViewMatrix
// ---------------------------------------------------------
// Both halves of the poke are WORLD-space: the ripple measures distance from
// a world point, and the wobble rotates about a world pivot. So the world
// position has to exist before the view transform, and the view transform
// then consumes the wobbled one. Every batch this shader serves hangs at
// IDENTITY (the chapter group, the ring/terrain/sky groups and the meshes
// inside them are never positioned), so modelMatrix is the identity matrix
// and `viewMatrix * (I * p)` is bit-for-bit `modelViewMatrix * p` — the
// goldens cannot move on this change alone.
const STRAND_VERT = /* glsl */ `
  attribute float aArc, aReveal, aTw, aBoost, aWave;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
  ${PULSE_GLSL}
  ${WOBBLE_GLSL}
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  void main() {
    float reveal = aReveal < -0.5 ? 1.0
                 : smoothstep(aReveal, aReveal + ${REVEAL_W.toFixed(2)}, uPull);
    // unlit bodies keep a 7% ember whisper — "they were always there"
    float b = mix(0.07, 1.0, reveal);
    // the growth-front pulse travelling the arc (narrow: ~one member wide)
    float df = aArc - uFront;
    b += aBoost * uFrontOn * exp(-df * df * 260.0) * (0.30 + 0.60 * reveal);
    // CTA wave: hero -> part of the ring
    float dc = aArc - uCta;
    b += aBoost * uCtaOn * exp(-dc * dc * 200.0) * 1.1;
    // rhizomorph cords: slow outward waves
    b += aWave * (0.28 + 0.28 * sin(aArc * 12.6 - uTime * 0.42 + aTw)) * reveal;
    // slow twinkle, phase-scattered
    b *= 0.88 + 0.12 * sin(uTime * 0.9 + aTw);
    vColor = color;
    // the poke, both halves: the body swings about its own root (wobbled),
    // and the light ripples out from under the fingertip (pulseAt) — the
    // hero's own two answers, in the hero's own maths.
    vec3 wp = wobbled((modelMatrix * vec4(position, 1.0)).xyz);
    b *= pulseAt(wp);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    // near-camera fade: the lens travels through clean air (Spike A G2a) —
    // strokes brushing the camera during the rise soften instead of flaring
    b *= smoothstep(1.2, 2.8, length(mv.xyz));
    vB = b;
    vFog = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const STRAND_FRAG = /* glsl */ `
  uniform float uOpacity, uAmount, uFogNear, uFogFar;
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  void main() {
    float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
    gl_FragColor = vec4(vColor * vB * uOpacity * uAmount * fogF, 1.0);
  }
`;

export function makeStrandMat(uniforms, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uOpacity: { value: opacity } }, uniforms),
    vertexShader: STRAND_VERT,
    fragmentShader: STRAND_FRAG,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

const POINT_VERT = /* glsl */ `
  #define MIN_PT 1.7
  attribute float aArc, aReveal, aTw, aBoost, aWave, psize;
  uniform float uPull, uFront, uFrontOn, uCta, uCtaOn, uTime;
  ${PULSE_GLSL}
  ${WOBBLE_GLSL}
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  varying float vShrink;
  void main() {
    float reveal = aReveal < -0.5 ? 1.0
                 : smoothstep(aReveal, aReveal + ${REVEAL_W.toFixed(2)}, uPull);
    float b = mix(0.05, 1.0, reveal);
    float df = aArc - uFront;
    b += aBoost * uFrontOn * exp(-df * df * 260.0) * (0.30 + 0.60 * reveal);
    float dc = aArc - uCta;
    b += aBoost * uCtaOn * exp(-dc * dc * 200.0) * 1.1;
    b *= 0.86 + 0.14 * sin(uTime * 1.3 + aTw);
    vColor = color;
    vec3 wp = wobbled((modelMatrix * vec4(position, 1.0)).xyz);
    b *= pulseAt(wp);
    vB = b;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vFog = -mv.z;
    float sz = psize * (0.4 + 0.6 * reveal) * (300.0 / -mv.z);
    vShrink = 1.0;
    if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
    gl_PointSize = sz;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity, uAmount, uFogNear, uFogFar;
  varying vec3 vColor;
  varying float vB;
  varying float vFog;
  varying float vShrink;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
    gl_FragColor = vec4(vColor * t.a * vB * uOpacity * uAmount * fogF * vShrink, 1.0);
  }
`;

export function makePointsMat(uniforms, opacity, map) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uOpacity: { value: opacity }, uMap: { value: map } }, uniforms),
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/* ------------------------------------------------------------------ */
/* Batched-geometry builder                                            */
/* ------------------------------------------------------------------ */
/** Accumulates line segments / points with the five shared channels and
 *  emits one BufferGeometry — one draw call per batch, however many
 *  mushrooms/strands/trees it holds.
 *  meta.mul (default 1) is a build-time color multiplier: it scales the
 *  heat-ramp RGB after lookup, which under additive blending is exactly a
 *  per-segment material opacity. It lets one merged batch carry several of
 *  the hero's per-system opacities (cap lattice 0.28 vs rim 0.55, etc. —
 *  D15) without splitting into more draw calls. Callers that omit it are
 *  unchanged. */
export function makeBatch() {
  const pos = [], col = [], arc = [], rev = [], tw = [], boost = [], wave = [], size = [];
  const body = [];
  const c = new THREE.Color();
  return {
    seg(ax, ay, az, bx, by, bz, ta, tb, meta) {
      const mul = meta.mul ?? 1;
      pos.push(ax, ay, az, bx, by, bz);
      heat(ta, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      heat(tb, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      for (let k = 0; k < 2; k++) {
        arc.push(meta.arc ?? 0);
        rev.push(meta.reveal ?? -1);
        tw.push(meta.tw ?? 0);
        boost.push(meta.boost ?? 0);
        wave.push(meta.wave ?? 0);
        body.push(meta.body ?? -1);
      }
    },
    pt(x, y, z, tone, psize, meta) {
      const mul = meta.mul ?? 1;
      pos.push(x, y, z);
      heat(tone, c); col.push(c.r * mul, c.g * mul, c.b * mul);
      arc.push(meta.arc ?? 0);
      rev.push(meta.reveal ?? -1);
      tw.push(meta.tw ?? 0);
      boost.push(meta.boost ?? 0);
      wave.push(meta.wave ?? 0);
      body.push(meta.body ?? -1);
      size.push(psize);
    },
    geo(withSize = false) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('aArc', new THREE.Float32BufferAttribute(arc, 1));
      g.setAttribute('aReveal', new THREE.Float32BufferAttribute(rev, 1));
      g.setAttribute('aTw', new THREE.Float32BufferAttribute(tw, 1));
      g.setAttribute('aBoost', new THREE.Float32BufferAttribute(boost, 1));
      g.setAttribute('aWave', new THREE.Float32BufferAttribute(wave, 1));
      // Per-member body ID (-1 = not a fruiting body), read by the poke's
      // wobble slots and nothing else. Costs 4 bytes a vertex and no draws:
      // the alternative was splitting the batch.
      g.setAttribute('aBody', new THREE.Float32BufferAttribute(body, 1));
      if (withSize) g.setAttribute('psize', new THREE.Float32BufferAttribute(size, 1));
      return g;
    },
    get segCount() { return pos.length / 6; },
    get ptCount() { return size.length; },
  };
}
