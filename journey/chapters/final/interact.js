// journey-v6 — FINAL epilogue: FIELD TAPPING.
//
// A POKE, AND NOTHING ELSE (2026-08-05 — Hannah: "when I hover over the
// mushrooms at the bottom they still light up")
// -----------------------------------------------------------------------
// This module used to answer a hover as well as a tap, and that was a parity
// mistake. The HERO's body has no hover response at all: its region glow is
// driven only by hovering the three HUD callout labels (main.js co-inspire /
// co-equip / co-connect -> organism/furniture.js setHighlight), and a pointer
// raycast against the hero's own body does nothing. The one thing the hero's
// body answers is a POKE — §10c's wobble, light ripple, cap-tap spore shed
// and haptic tick. A field mushroom that lit under the cursor was therefore
// doing something the mushroom it is a copy of has never done.
//
// So there is no hover here now. No pointermove listener, no pointerleave, no
// throttle, no per-poll broad phase, no hovered-body state. This module
// resolves ONE question, once per tap, inside the pointerup event: which body
// did the finger land on, and where on it. The answers are ring.js's.
//
// WHY A DETACHED PROXY TREE (the broad phase)
// -------------------------------------------
// The bodies are not pickable as drawn: near ones are a dozen additive line
// and point layers with no solid surface, and every far one is a few hundred
// vertices inside ONE merged batch draw shared with forty other bodies —
// there is no per-body object to intersect. So each member gets one invisible
// 8-sided cone that brackets its cap and stem, and those cones live in a
// group that is NEVER ADDED TO THE SCENE. A detached tree costs nothing to
// render (it is not in the graph the renderer walks), cannot be caught by a
// stray traverse(), and needs no `visible = false`. Members never move, so
// the proxy matrices are computed once at build.
//
// AND WHY A NARROW PHASE ON TOP OF IT
// ------------------------------------
// A cone tells you WHICH body. It does not tell you WHERE, and §10c's whole
// character is where: the lever arm is a cross product about the base, so a
// tap on the cap tips a body about four times as far as one low on the stem,
// and pressing one edge of the cap tips it toward that edge. The ripple wants
// the same point — it is planted at the fingertip and dies within about a
// unit of it. A collider axis would give every poke the same nod.
//
// So a tap that lands on a body with real geometry runs a SECOND raycast,
// against that ONE body's own opaque shells. Batched species bodies have no
// shells to cast against and keep the cone's own hit point, which is a real
// point on a real surface at the right height.
//
// BOTH PHASES NOW RUN ON THE TAP, back to back, and that is strictly cheaper
// than the arrangement it replaces. The broad phase used to run on a 14 Hz
// pointermove throttle whether or not anything was ever tapped (measured on
// this machine at the Final rest, 52 proxy cones: 0.094 ms per poll, ~11-14
// polls a second for as long as the cursor was moving over the epilogue).
// Now it runs zero times a second while the pointer moves and exactly once
// per tap. The narrow phase's budget is unchanged: it was already once per
// tap, and it was always the expensive half.
//
// THE HERO IS NOT OURS
// --------------------
// organism §10c has its own pointerup on the same canvas and answers for the
// hero. Its hit test runs against the hero's shells only, so a tap that lands
// on the hero must be left alone — but a ray to the hero can also pass
// through a field body's proxy cone standing behind it. Before claiming a
// tap we therefore cast the hero's four shells and yield if the hero is
// nearer. Four meshes, once per tap.
//
// INPUT OWNERSHIP (the journey's rule, scroll.js §top)
// ----------------------------------------------------
// scroll.js listens at WINDOW CAPTURE and preventDefault()s wheel and touch —
// it owns travel. This module therefore:
//   · listens on the CANVAS only, never at window capture, and now only for
//     pointerdown / pointerup — it observes no pointer motion at all;
//   · registers every listener `passive: true` and calls preventDefault()
//     NOWHERE, so a drag across a mushroom still scrubs the journey and a
//     two-finger scroll is never swallowed;
//   · uses the hero's own tap discipline for a click (moved < 7 px, released
//     under 400 ms), so an orbit-ish drag that happens to end on a cap is not
//     a click;
//   · leaves the hotspot DOM (.j-hotspots) and the CTA delegation in
//     index.js completely alone — nothing here touches the DOM.
//
// ORDERING (load-bearing, and the fix for a real bug — see 18-one-species.md).
// organism's pointerup is registered on renderer.domElement when the scene is
// built; ours is registered on the SAME element when the chapter is built,
// which is strictly later, so ours runs SECOND on every tap. That is what
// lets a body tap correct the record: organism, having missed its own shells,
// falls through to its "tapped the floor" branch and plants the far-carrying
// mycelium swell (2.6, 0.33, 1.4) under the pointer. We then re-plant the
// body poke (1.4, 1.5, 1.2) at the real hit point in the same event, before
// the frame renders, and the wrong wave never reaches a pixel. A tap that
// misses every body is left exactly as organism wrote it, because there it is
// right: that IS the floor ping.

import * as THREE from 'three';

const TAP_MS = 400;          // organism §10c's own tap discipline
const TAP_PX = 7;

// Unit proxy: an open cone, wide at the cap, narrow at the soil, base at
// y = 0 so a member's transform is (position = soil point, scale = [r, h, r]).
const PROXY = new THREE.CylinderGeometry(1, 0.34, 1, 8, 1, true);
PROXY.translate(0, 0.5, 0);

/** `gate` is the chapter's own knowledge, injected rather than polled:
 *    armed()      is the epilogue on screen and pulled back far enough to
 *                 answer a pointer at all
 *    accept(ref)  has THIS body kindled (D16 — a pointer may not light a
 *                 member the reveal has not reached)
 *    onTap(hit)   a claimed tap, resolved: { ref, point, dir, touch }
 */
export function createPicker(sceneApi, gate) {
  const root = new THREE.Group();     // detached on purpose — see header
  const targets = [];
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const el = sceneApi.renderer.domElement;

  // the hero's own opaque shells — the only thing in the frame this module
  // must never claim (see "THE HERO IS NOT OURS")
  const heroShells = [];
  for (const r of [sceneApi.groups.stem, sceneApi.groups.mushroom]) {
    if (r) r.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) heroShells.push(o); });
  }

  let downX = 0, downY = 0, downT = -1e9;
  // QA: measured cost of the two phases. Both are per-TAP now, so these are
  // per-tap means — nothing here runs on pointer motion.
  let narrowMs = 0, narrowN = 0;
  let broadMs = 0, broadN = 0;

  /** Aim the shared raycaster at a client point. False if it is off-canvas. */
  function aim(cx, cy) {
    const r = el.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, sceneApi.camera);
    return true;
  }

  /** BROAD PHASE: nearest accepted body under the aimed ray, with its cone
   *  hit. Null when nothing is there or the gate turns it down. */
  function broad() {
    const hits = ray.intersectObjects(targets, false);
    for (const h of hits) {
      const ref = h.object.userData.ref;
      if (gate.accept && !gate.accept(ref)) continue;
      return { ref, point: h.point, distance: h.distance };
    }
    return null;
  }

  const onDown = (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); };

  const onUp = (e) => {
    if (performance.now() - downT > TAP_MS) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_PX) return;
    if (!gate.armed()) return;
    if (!aim(e.clientX, e.clientY)) return;
    // BROAD PHASE, on the tap. It used to run on a pointermove throttle to
    // keep a hovered body up to date; with no hover to keep, the only moment
    // anything needs to know which body is under the pointer is this one.
    const bt0 = performance.now();
    const b = broad();
    broadMs += performance.now() - bt0; broadN++;
    if (!b) return;                          // the floor: organism owns it
    // the hero in front of a field body's cone — organism owns that too
    for (const h of ray.intersectObjects(heroShells, false)) {
      if (h.distance < b.distance) return;
      break;
    }
    // NARROW PHASE: the real point on the real body, if this body has real
    // geometry to hit. Only ever one body's shells, only ever on a tap.
    let point = b.point;
    const shells = b.ref.shells;
    if (shells && shells.length) {
      const t0 = performance.now();
      const h = ray.intersectObjects(shells, false)[0];
      narrowMs += performance.now() - t0; narrowN++;
      if (h) point = h.point;
    }
    gate.onTap({
      ref: b.ref, point, dir: ray.ray.direction,
      touch: e.pointerType === 'touch',
    });
  };

  const OPT = { passive: true };
  el.addEventListener('pointerdown', onDown, OPT);
  el.addEventListener('pointerup', onUp, OPT);

  /** One member's collider. `r`/`h` are world units; `ref` comes straight
   *  back out of poll() and onTap(). */
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

  function dispose() {
    el.removeEventListener('pointerdown', onDown, OPT);
    el.removeEventListener('pointerup', onUp, OPT);
  }

  // No poll(): there is no per-frame pointer work left to do. A tap resolves
  // and is answered synchronously inside pointerup, and the chapter's own
  // gate.armed() is what silences this module when the epilogue is off screen
  // — there is no longer any state here that could be left stale behind the
  // camera, because there is no state here at all.
  return {
    add, dispose,
    get count() { return targets.length; },
    /** QA: mean measured cost of one cast of each phase, in ms — both once
     *  per tap. Null until something has actually been tapped. */
    get narrowMs() { return narrowN ? +(narrowMs / narrowN).toFixed(3) : null; },
    get narrowN() { return narrowN; },
    get broadMs() { return broadN ? +(broadMs / broadN).toFixed(4) : null; },
    get broadN() { return broadN; },
  };
}
