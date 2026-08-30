// journey-v6 — THE FRAME PUBLICATION (J02).
//
// One immutable value per frame, taken at the one instant the camera is
// finished, and handed to every reader below it.
//
// WHY THIS EXISTS. applyFrame already documents the rule — the camera is
// composed, and only then is it read (see the frame-order block above
// applyFrame in journey.js, and the measured 210,051-vs-12,829 triangle
// count there). What it lacked was a VALUE. Every reader below the camera
// block re-read the live camera object, so "the camera is finished" was a
// property of statement order alone: correct today, and silently reversible
// by any edit that moves a writer down or a reader up.
//
// The publication makes it a value. After stepCamBlend the pose is copied
// out as numbers, frozen, and published once. A reader handed the frame
// cannot see a pose that is not the presented one, because there is nothing
// live left in its hand to see.
//
// WHAT IT DELIBERATELY DOES NOT CARRY (boundaries.md Part B, section B.8):
//
//   * The projection matrix, or anything derived from it. organism.js's
//     steadyProject() composes the LIVE matrixWorldInverse with the
//     pre-jitter projection snapshotted inside taaFrame(), which runs after
//     every animator. Publishing a projection here, or "unifying" ui.js's
//     frameGeom with it for symmetry, moves two goldens. Pose, never
//     projection.
//   * The lens grade. camera-blend.js mutates its look object in place and
//     hands the same reference to lens.setLookOverride, whose body stores
//     the reference. A frozen copy would stop the grade tracking the blend.
//   * A device pixel ratio. No reader here needs one and the tree's only
//     devicePixelRatio reads belong to the performance governor. A member
//     with no reader and no owner is a pass-through.
//   * Any THREE object, and never sceneApi.camera itself.
//
// ---- D1 (2026-08-25): THE CONSUMERS, AND WHAT THE VALUE NOW ANSWERS -----
//
// J02 built this value; every reader below the publication still took its
// coordinate off a live local in the same frame. They no longer do:
// applyFrame's seams, chapter, lens, chapter-lookup, hero-furniture and UI
// calls all read `frame.routeP` / `frame.presentedP` / `frame.stateP` /
// `frame.dt` / `frame.gliding`. Two properties follow, and both are pinned
// (tools/test-frame-publication.mjs C8..C11):
//
//   1. "WHICH TIME COORDINATE AM I IN?" HAS ONE ANSWER PER FRAME, WITH A
//      `seq` ON IT. The three coordinates and the delta arrive on one object
//      carrying one number. A reader that holds a frame across a boundary
//      still holds THAT frame's seq — `seq` is a copied number, never a
//      getter over the counter, which is C10's mutant.
//   2. THE WRAP'S "NO MONOTONE SECTION COORDINATE" EXCEPTION IS A FIELD.
//      `transitionPhase.kind === 'wrap'` answers it from the frame alone,
//      with no reach into the controller and no second ticket to consult.
//      It is keyed off the WRAP TICKET, not off the blend's direction, so a
//      forward lap answers the same as a rewound one (C11).
//
// WHAT DID NOT MOVE, AND THE ONE MEASUREMENT THAT SAYS WHY.
// `transition.cameraStateDisagree` is still passed to ui.update() as a loose
// parameter, and it is NOT the same value as `transitionPhase.disagree`:
// phaseOf() answers null whenever there is no blend, but beginFlight() raises
// cameraStateDisagree and installs both rail tickets BEFORE beginBlend()
// exists — and placeAt() publishes two dt = 0 frames in exactly that window.
// On those two frames the publication says "no transition" while the
// controller says "a jump is in flight". Nothing reads transitionPhase in
// production today, so this is a gap and not a defect; but journey/rail.js
// EDGE-DETECTS that flag (`jumpStarted = cameraStateDisagree &&
// !wasCameraStateDisagree`), so routing it through the frame would move the
// edge by two frames. That is a behaviour change wearing a plumbing change's
// clothes, and it was refused. Closing the gap — publishing a phase before
// the blend exists — is the transition controller's call, not this file's.
//
// The publication is JOURNEY-SCOPED. frame() answers null until the journey
// has published its first frame, so nothing with page lifetime — the rail's
// annotation pass, the organism's trackers, the lens's focus projection —
// can be rewritten to consult it and then break on a page with no journey.

import * as THREE from 'three';

/** Create the journey's one frame publisher.
 *
 *  @param {object} sceneApi  the hero scene handle; read, never written.
 *  @returns {{ publish: Function, frame: () => object|null }}
 */
export function createFramePublisher(sceneApi) {
  /* The forward vector is read through a module-private scratch, the same
   * shape connect/index.js uses for its own resolve. What goes onto the
   * pose is a COPY of the three components, never the scratch: a scratch on
   * a frozen object would be a live reference wearing a frozen envelope. */
  const _fwd = new THREE.Vector3();

  let latest = null;
  let seq = 0;

  /* The transition, projected. camBlend, railWrap and railFlight are the
   * controller's own mutable state and none of them belongs on an immutable
   * value; this is the presentation of them that readers are entitled to.
   *
   * `e` is the eased magnitude camera-blend.js writes onto whichever rail
   * motion is in flight — the camera's own smootherstep clock, not a
   * re-derivation of it. `fromP`/`targetP` are the blend's authored route
   * endpoints, taken as recorded rather than reconstructed.
   *
   * TWO DEFAULTS HERE ARE NOT REACHED BY THE SHIPPED ROUTE, and are stated
   * rather than left silent: a blend always arrives with exactly one rail
   * motion (directJumpTo installs a wrap ticket or a flight ticket, and
   * dropCamBlend clears blend and both tickets together), so neither the
   * 'blend' kind nor the zero magnitude can occur today. They are the
   * answers this function gives if that ever stops being true. */
  function phaseOf(transition) {
    const blend = transition.blend;
    if (!blend) return null;
    const wrap = transition.railWrap;
    const flight = transition.railFlight;
    const motion = wrap || flight;
    return Object.freeze({
      kind: wrap ? 'wrap' : flight ? 'flight' : 'blend',
      play: blend.play,
      e: motion ? motion.phase : 0,
      fromP: blend.routeFromP,
      targetP: blend.routeTargetP,
      disagree: transition.cameraStateDisagree,
    });
  }

  /** Take the frame. Called ONCE per applyFrame, after the camera is
   *  complete and before the first reader of it.
   *
   *  @param {object}  f
   *  @param {number}  f.dt          the frame's delta, as the spine has it
   *  @param {number}  f.stateP      the journey's own progress
   *  @param {number}  f.routeP      the coordinate readers are driven at
   *  @param {number}  f.presentedP  the coordinate actually being presented
   *  @param {object}  f.transition  the transition controller, read only
   *  @param {boolean} f.gliding     the model's glide state for this frame
   */
  function publish({ dt, stateP, routeP, presentedP, transition, gliding }) {
    const cam = sceneApi.camera;
    const tgt = sceneApi.controls.target;
    const fog = sceneApi.scene.fog;
    const px = cam.position.x;
    const py = cam.position.y;
    const pz = cam.position.z;
    cam.getWorldDirection(_fwd);
    /* az and r are pre-computed because four call sites derive them from
     * the same two doubles today. Math.atan2 and Math.hypot on the same
     * pair are the same double wherever they run, so this is one place to
     * read them rather than a fifth convention. Chapter-local conventions —
     * a degree conversion, a fold past -90 — stay with their chapters. */
    const cameraPose = Object.freeze({
      x: px,
      y: py,
      z: pz,
      tx: tgt.x,
      ty: tgt.y,
      tz: tgt.z,
      fov: cam.fov,
      fwdX: _fwd.x,
      fwdY: _fwd.y,
      fwdZ: _fwd.z,
      az: Math.atan2(px, pz),
      r: Math.hypot(px, pz),
      fogNear: fog.near,
      fogFar: fog.far,
    });
    seq += 1;
    latest = Object.freeze({
      seq,
      at: performance.now(),
      dt,
      stateP,
      routeP,
      presentedP,
      cameraPose,
      viewport: Object.freeze({ w: window.innerWidth, h: window.innerHeight }),
      // The responsive layout authority is not built yet. The key exists so
      // that the reader contract does not change when it arrives; the value
      // is null and its owner is the responsive hero/sidebar/rail order.
      aspectProfile: null,
      transitionPhase: phaseOf(transition),
      gliding,
    });
    return latest;
  }

  /** The frame most recently published, or null before the journey has
   *  published one. Never a live handle: the value is frozen. */
  function frame() { return latest; }

  return { publish, frame };
}
