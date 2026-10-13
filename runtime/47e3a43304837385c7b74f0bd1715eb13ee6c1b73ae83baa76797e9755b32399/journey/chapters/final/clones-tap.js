// journey-v6 — FINAL epilogue: THE CLONE TAP OSCILLATOR.
//
// H06 seam A. Lifted VERBATIM from clones.js (:122-179 at 6967a36a): the
// damped-spring integrator organism §10c gives a poked body, its four
// constants and its four operations. Not a utility drawer — a state machine
// with one shape, `{tx, tz, tvx, tvz}`, that TWO chapters run: clones.js
// integrates it per clone body and ring.js:94-96 integrates it for the
// batched species bodies, so that a species body and a clone body ring down
// on the SAME integrator. It lived in clones.js only because that is where
// it was first written.
//
// It touches nothing else in this chapter: no THREE, no imports at all, no
// scene graph, no uniform, and none of the clone set's census counters. That
// is why it is seam A — it carries all of its own state across the boundary
// and can shift nothing left behind (see h06/reconnaissance.md §2).
//
// clones.js re-exports all four operations and TAP_W/TAP_ZETA unchanged, so
// ring.js's import is untouched by this order.
/* ---- THE POKE, MECHANICAL HALF (organism/organism.js §10c) --------------
   Hannah: "why is the touch-interaction on the new mushrooms different to the
   OG one?" The hero's answer to a poke is not a brightness ramp — it is a
   CANTILEVER. The stalk stands on an elastic root; a tap is an impulse at the
   hit point; the torque r x F about the base kicks the body's angular
   velocity, which then rings down as a lightly damped oscillator at the
   stalk's own flutter frequency, riding ON TOP of the breeze rather than
   replacing it.

   These are §10c's numbers, unchanged. They are copied rather than imported
   because organism/* is read-only and keeps them in a closure — the same
   arrangement this file's breeze() already lives under.

   The lever arm falls out of the cross product and is the whole character of
   the move: a tap on the cap (r.y ~ 4) tips a body four times as far as one
   low on the stem, and pressing one edge of the cap tips it toward that side.
   That is why the hit point has to be REAL and not the axis of a proxy
   collider — see interact.js's narrow phase.

   UNITS. For a clone, r and F are taken in the body's OWN frame (root-local,
   which is hero units because root.scale carries the clone's only scale), so
   the impulse constant, the saturation clamp and the resulting ANGLE are
   identical for every body whatever its size. A poked field mushroom leans by
   the same number of degrees as the poked hero — which is what "the same way
   the hero does" has to mean when the bodies are different sizes. */
export const TAP_W = 2.3;      // ring frequency (rad/s) — the stalk's fine-flutter mode
export const TAP_ZETA = 0.14;  // light damping: a few visible wobbles, settled in ~3s
const TAP_IMP = 0.008;         // impulse -> angular velocity
const TAP_MAX = 0.09;          // flesh, not a bell: repeated pokes saturate

/** Advance one body's tap ring-down by dt. Shared with ring.js so the batched
 *  species bodies ring down on the SAME integrator (semi-implicit Euler on the
 *  damped spring — stable at these frequencies and frame rates, and it
 *  conserves the impulse's feel). `st` is any object with {tx,tz,tvx,tvz}. */
export function stepTap(st, dt) {
  st.tvx += (-TAP_W * TAP_W * st.tx - 2 * TAP_ZETA * TAP_W * st.tvx) * dt;
  st.tvz += (-TAP_W * TAP_W * st.tz - 2 * TAP_ZETA * TAP_W * st.tvz) * dt;
  st.tx += st.tvx * dt;
  st.tz += st.tvz * dt;
}

/** The impulse itself: hit point `r` and push direction `F`, both already in
 *  the body's own frame and in hero units. organism §10c, line for line. */
export function kickTap(st, r, F) {
  st.tvx += TAP_IMP * (r.y * F.z - r.z * F.y);
  st.tvz += TAP_IMP * (r.x * F.y - r.y * F.x);
  const v = Math.hypot(st.tvx, st.tvz);
  if (v > TAP_MAX) { st.tvx *= TAP_MAX / v; st.tvz *= TAP_MAX / v; }
}

/** True while a body is still ringing — lets a caller skip still bodies and
 *  lets ring.js hand a wobble slot back the moment it has nothing to say. */
export const isRinging = (st) =>
  Math.abs(st.tx) > 1e-5 || Math.abs(st.tz) > 1e-5 ||
  Math.abs(st.tvx) > 1e-5 || Math.abs(st.tvz) > 1e-5;

/** Zero a tap state (retire, or a slot being reclaimed). */
export function clearTap(st) { st.tx = 0; st.tz = 0; st.tvx = 0; st.tvz = 0; }
