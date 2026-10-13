// journey/plume-fade.js — the spore plume steps back while a chapter's own
// items are on screen (2026-10-05). Connect first (the aerial camera put the
// plume across its headline), then Equip (Hannah: "can we do something
// similar in the equip view? Currently they kinda DOMINATE the actual items
// here").
//
// ONE OWNER FOR ONE UNIFORM. Both chapters fade the same `uOpacity`, and they
// are neighbours: a move between them has both partly present. Two private
// fades would each capture a base and write base * g, last writer wins, and
// the plume would brighten mid-move and dim again. So the base is captured
// once per scene here, each chapter holds a CLAIM (its presence times how
// much it takes away, 1 - keep), and the plume is drawn at 1 - the SUM of the
// claims. The envelopes are complementary across a shared leg — Equip's is
// 1 - Connect's, both eased by the same smoothstep, and sm(t) + sm(1 - t) = 1
// — so the hand-over between the two walks straight from one chapter's level
// to the other's, never brightening in between.
//
// THE FADE TAKES THE WHOLE MOVE (Hannah: "when i click into and out of the
// section could you make the spore light up or light down also take the time
// the entire transition takes"). On a click the transition broadcasts its
// duration through each chapter's setBlending(on, x, durS); while a blend is
// up the claim walks to the destination's value at 1/durS, so it starts on
// the click frame and lands as the camera lands. Otherwise — scroll, and the
// route-faithful flights that carry p along the route — the claim is a pure
// function of p: full at the chapter's rest, none at its neighbours' rests,
// so a move between neighbours spends its whole length on it. SCROLL_S
// rate-limits that path so a cut-short blend hands back without a step.
//
// ?plume=dim|off (flags.js) chooses how far it fades; 'off' installs nothing
// and every chapter sees the plume exactly as shipped.

import { CONNECT_PLUME } from '../flags.js';

const SCROLL_S = 0.8;
const KEEP = CONNECT_PLUME === 'off' ? 1 : CONNECT_PLUME === 'dim' ? 0.55 : 0.30;

const sm = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

const shared = new WeakMap();

function plumeFor(sceneApi) {
  if (shared.has(sceneApi)) return shared.get(sceneApi);
  const mats = [];
  const pts = sceneApi && sceneApi.spores && sceneApi.spores.sporePts;
  if (pts) {
    pts.traverse((o) => {
      const u = o.material && o.material.uniforms && o.material.uniforms.uOpacity;
      if (u) mats.push({ u, base: u.value });
    });
  }
  const claims = new Map();
  let handedBack = true;
  const plume = {
    ok: mats.length > 0,
    set(id, a) {
      claims.set(id, a);
      let sum = 0;
      for (const v of claims.values()) sum += v;
      // Written every frame WHILE A CLAIM IS UP, not only on change:
      // anything else that writes this uniform (furniture.js's hover
      // highlight captures the same base) is corrected on the next frame
      // instead of standing until our own value next moves. With no claim up
      // the base is written once and the uniform is left alone, so the
      // hero's own highlight keeps working there.
      if (sum <= 0) {
        if (handedBack) return;
        handedBack = true;
        for (const e of mats) e.u.value = e.base;
        return;
      }
      handedBack = false;
      const g = Math.max(0, 1 - Math.min(1, sum));
      for (const e of mats) e.u.value = e.base * g;
    },
  };
  shared.set(sceneApi, plume);
  return plume;
}

const NOOP = { drive() {}, enter() {}, setBlending() {}, dispose() {} };

/** A chapter's claim on the plume fade.
 *  @param {object} sceneApi
 *  @param {object} o
 *  @param {string} o.id     claim name (and animator name suffix)
 *  @param {number} o.from   p where the claim is 0 on the way in (previous rest)
 *  @param {number} o.rest   p where the claim is full (this chapter's rest)
 *  @param {number} o.to     p where the claim is 0 on the way out (next rest)
 *  @param {number} [o.keep]   brightness kept at full presence (default per
 *                   ?plume: 0.30, dim 0.55); a chapter may ask for more or less
 *  @param {function} [o.onAmount]  called each frame with the eased 0..1
 *                   presence (journey/cap-occlusion.js rides it on Equip)
 *  @returns {{ drive(p), enter(), setBlending(on, durS), dispose() }} */
export function createPlumeFade(sceneApi, { id, from, rest, to, keep = KEEP, onAmount = null }) {
  if (KEEP >= 1) return NOOP;
  const plume = plumeFor(sceneApi);
  if (!plume.ok) return NOOP;
  let p = -Infinity;     // the destination/conducted p (drive, entry)
  let w = 0;             // linear 0..1; eased on the way out
  let rate = 1 / SCROLL_S;
  const target = () => {
    const t = p <= rest ? (p - from) / (rest - from) : (to - p) / (to - rest);
    return t < 0 ? 0 : t > 1 ? 1 : t;
  };
  const name = `plume-fade-${id}`;
  const remove = sceneApi.addAnimator(name, (t, dt) => {
    const tg = target();
    if (dt === 0) w = tg;
    else {
      const d = tg - w, m = dt * rate;
      w += d > m ? m : d < -m ? -m : d;
    }
    const a = sm(w);
    plume.set(id, a * (1 - keep));
    if (onAmount) onAmount(a);
  });
  return {
    /** The conducted p, every frame (frame-application.js). */
    drive(nextP) { p = nextP; },
    /** A nav entry lands on this chapter's rest; driveEntry carries no p. */
    enter() { p = rest; },
    /** The transition's blend broadcast: pace the walk to the move. */
    setBlending(on, durS) { rate = 1 / (on && durS > 0 ? durS : SCROLL_S); },
    /** Remove the animator and give back this claim. */
    dispose() {
      if (typeof remove === 'function') remove();
      plume.set(id, 0);
    },
  };
}
