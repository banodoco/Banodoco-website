// journey-v6 — FINAL epilogue: FIELD PICKING.
//
// Hannah, with the clone step-back: "the mushrooms in the field should react
// when you hover or click them, the way the main one does." The hero's own
// answer to a pointer is §11's region glow (organism/furniture.js
// createHighlights) — an eased hot value with a slow breathing pulse riding
// on top of the materials' base opacities. This module is only the POINTING
// half: what is under the pointer, and was it a tap. The GLOW half is
// clones.js's easeHover(), which is furniture.js's own math, applied by
// ring.js to whichever body this module names.
//
// WHY A DETACHED PROXY TREE
// -------------------------
// The bodies are not pickable as drawn: near ones are a dozen additive line
// and point layers with no solid surface, and every far one is a few hundred
// vertices inside ONE merged batch draw shared with forty other bodies —
// there is no per-body object to intersect. So each member gets one invisible
// 8-sided cone that brackets its cap and stem, and those cones live in a
// group that is NEVER ADDED TO THE SCENE. A detached tree costs nothing to
// render (it is not in the graph the renderer walks), cannot be caught by a
// stray traverse(), and needs no `visible = false` — which would also have
// made it un-raycastable in this THREE build. Members never move, so the
// proxy matrices are computed once at build.
//
// INPUT OWNERSHIP (the journey's rule, scroll.js §top)
// ----------------------------------------------------
// scroll.js listens at WINDOW CAPTURE and preventDefault()s wheel and touch —
// it owns travel. This module therefore:
//   · listens on the CANVAS only, never at window capture;
//   · registers every listener `passive: true` and calls preventDefault()
//     NOWHERE, so a drag across a mushroom still scrubs the journey and a
//     two-finger scroll is never swallowed;
//   · uses the hero's own tap discipline for a click (moved < 7 px, released
//     under 400 ms), so an orbit-ish drag that happens to end on a cap is not
//     a click;
//   · leaves the hotspot DOM (.j-hotspots) and the CTA delegation in
//     index.js completely alone — nothing here touches the DOM.
//
// The raycast itself is throttled: pointermove only records a position, and
// the intersection runs at most every RAY_S from the chapter's animator. A
// tap jumps the throttle so a click is never dropped.

import * as THREE from 'three';

const RAY_S = 0.07;          // ~14 Hz — well under a hover's perceptual floor
const TAP_MS = 400;          // organism §10c's own tap discipline
const TAP_PX = 7;

// Unit proxy: an open cone, wide at the cap, narrow at the soil, base at
// y = 0 so a member's transform is (position = soil point, scale = [r, h, r]).
const PROXY = new THREE.CylinderGeometry(1, 0.34, 1, 8, 1, true);
PROXY.translate(0, 0.5, 0);

export function createPicker(sceneApi) {
  const root = new THREE.Group();     // detached on purpose — see header
  const targets = [];
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const el = sceneApi.renderer.domElement;

  let px = -1, py = -1, dirty = false, acc = 0;
  let downX = 0, downY = 0, downT = -1e9, tapPending = false, tapTouch = false;
  let hover = null;

  const onMove = (e) => { px = e.clientX; py = e.clientY; dirty = true; };
  const onLeave = () => { px = -1; py = -1; dirty = true; };
  const onDown = (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); };
  const onUp = (e) => {
    if (performance.now() - downT > TAP_MS) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_PX) return;
    px = e.clientX; py = e.clientY;
    dirty = true; tapPending = true;
    tapTouch = e.pointerType === 'touch';
  };
  const OPT = { passive: true };
  el.addEventListener('pointermove', onMove, OPT);
  el.addEventListener('pointerleave', onLeave, OPT);
  el.addEventListener('pointerdown', onDown, OPT);
  el.addEventListener('pointerup', onUp, OPT);

  /** One member's collider. `r`/`h` are world units; `ref` comes straight
   *  back out of poll(). */
  function add(x, gy, z, r, h, ref) {
    const m = new THREE.Mesh(PROXY);
    m.position.set(x, gy, z);
    m.scale.set(r, h, r);
    m.updateMatrixWorld(true);
    m.userData.ref = ref;
    root.add(m);
    targets.push(m);
    return m;
  }

  function cast() {
    if (px < 0) return null;
    const r = el.getBoundingClientRect();
    if (px < r.left || px > r.right || py < r.top || py > r.bottom) return null;
    ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, sceneApi.camera);
    const hits = ray.intersectObjects(targets, false);
    return hits.length ? hits[0].object.userData.ref : null;
  }

  /** Advance the throttle and return { hover, tap }. `accept(ref)` lets the
   *  caller veto a body that has not kindled yet — an unlit mushroom is not
   *  yet part of the scene and must not answer a pointer. `active` false
   *  drops the hover on the floor (chapter retiring, or scrubbed out of the
   *  pull band), so nothing is left glowing behind the camera. */
  function poll(dt, active, accept) {
    if (!active) { hover = null; tapPending = false; return { hover: null, tap: null }; }
    acc += dt;
    let tap = null;
    if (tapPending || (dirty && acc >= RAY_S)) {
      acc = 0; dirty = false;
      let h = cast();
      if (h && accept && !accept(h)) h = null;
      hover = h;
      if (tapPending) {
        tapPending = false;
        tap = hover;
        // a finger leaves no pointer behind it: the tap's own pulse is the
        // feedback, and a stuck hover glow after a tap reads as a bug
        if (tapTouch) hover = null;
      }
    }
    return { hover, tap };
  }

  function dispose() {
    el.removeEventListener('pointermove', onMove, OPT);
    el.removeEventListener('pointerleave', onLeave, OPT);
    el.removeEventListener('pointerdown', onDown, OPT);
    el.removeEventListener('pointerup', onUp, OPT);
  }

  return { add, poll, dispose, get count() { return targets.length; } };
}
