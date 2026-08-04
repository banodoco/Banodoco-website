// journey-v6 — FINAL epilogue: FIELD PICKING.
//
// Hannah, with the clone step-back: "the mushrooms in the field should react
// when you hover or click them, the way the main one does." The hero's own
// answer to a pointer is §11's region glow (organism/furniture.js
// createHighlights) — an eased hot value with a slow breathing pulse riding
// on top of the materials' base opacities — and, for a TAP, §10c's four-part
// poke. This module is only the POINTING half: what is under the pointer, was
// it a tap, and WHERE on the body did the finger land. The answers are
// ring.js's; the glow half is clones.js's easeHover(), which is furniture.js's
// own math.
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
// AND WHY A NARROW PHASE ON TOP OF IT (Hannah: "we could only switch it on
// once hovered if it's an efficiency issue")
// ------------------------------------------------------------------------
// A cone tells you WHICH body. It does not tell you WHERE, and §10c's whole
// character is where: the lever arm is a cross product about the base, so a
// tap on the cap tips a body about four times as far as one low on the stem,
// and pressing one edge of the cap tips it toward that edge. The ripple wants
// the same point — it is planted at the fingertip and dies within about a
// unit of it. A collider axis would give every poke the same nod.
//
// So a tap that lands on a body with real geometry runs a SECOND raycast,
// against that ONE body's own opaque shells. Measured on this machine at the
// Final rest: 2.96 ms — far too expensive at hover rates (14 Hz would cost
// ~4% of a core doing nothing), which is exactly Hannah's worry, and entirely
// free once per tap. So the split is: broad phase every hover poll, narrow
// phase only for the one body a tap actually landed on. Batched species
// bodies have no shells to cast against and keep the cone's own hit point,
// which is a real point on a real surface at the right height.
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
//
// Hover is still throttled — pointermove only records a position, and the
// broad-phase intersection runs at most every RAY_S from the chapter's
// animator. A TAP is not throttled at all: it resolves inside the event.

import * as THREE from 'three';

const RAY_S = 0.07;          // ~14 Hz — well under a hover's perceptual floor
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

  let px = -1, py = -1, dirty = false, acc = 0;
  let downX = 0, downY = 0, downT = -1e9, tapPending = null, tapTouch = false;
  let hover = null;
  let narrowMs = 0, narrowN = 0;      // QA: measured narrow-phase cost

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

  const onMove = (e) => { px = e.clientX; py = e.clientY; dirty = true; };
  const onLeave = () => { px = -1; py = -1; dirty = true; };
  const onDown = (e) => { downX = e.clientX; downY = e.clientY; downT = performance.now(); };

  const onUp = (e) => {
    if (performance.now() - downT > TAP_MS) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_PX) return;
    px = e.clientX; py = e.clientY;
    dirty = true;
    if (!gate.armed()) return;
    if (!aim(px, py)) return;
    const b = broad();
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
    tapPending = b.ref;
    tapTouch = e.pointerType === 'touch';
    gate.onTap({ ref: b.ref, point, dir: ray.ray.direction, touch: tapTouch });
  };

  const OPT = { passive: true };
  el.addEventListener('pointermove', onMove, OPT);
  el.addEventListener('pointerleave', onLeave, OPT);
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

  /** Advance the hover throttle and return { hover, tap }. `active` false
   *  drops the hover on the floor (chapter retiring, or scrubbed out of the
   *  pull band), so nothing is left glowing behind the camera. The TAP has
   *  already been resolved and answered inside the event; what comes back
   *  here is only its glow half. */
  function poll(dt, active) {
    if (!active) { hover = null; tapPending = null; return { hover: null, tap: null }; }
    acc += dt;
    let tap = null;
    if (tapPending) {
      tap = tapPending;
      tapPending = null;
      hover = tapTouch ? null : tap;
      // a finger leaves no pointer behind it: the poke's own answer is the
      // feedback, and a stuck hover glow after a tap reads as a bug
      acc = 0; dirty = false;
    } else if (dirty && acc >= RAY_S) {
      acc = 0; dirty = false;
      if (px < 0 || !aim(px, py)) hover = null;
      else { const b = broad(); hover = b ? b.ref : null; }
    }
    return { hover, tap };
  }

  function dispose() {
    el.removeEventListener('pointermove', onMove, OPT);
    el.removeEventListener('pointerleave', onLeave, OPT);
    el.removeEventListener('pointerdown', onDown, OPT);
    el.removeEventListener('pointerup', onUp, OPT);
  }

  return {
    add, poll, dispose,
    get count() { return targets.length; },
    /** QA: mean measured cost of one narrow-phase cast, in ms. */
    get narrowMs() { return narrowN ? +(narrowMs / narrowN).toFixed(3) : null; },
    get narrowN() { return narrowN; },
  };
}
