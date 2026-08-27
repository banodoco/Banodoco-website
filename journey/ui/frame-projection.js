/* ==================================================================== *
 * journey/ui/frame-projection.js — the frame's projection slot (U06).
 *
 * ONE PUBLISHER, ONE WRITE, MANY READERS — the shape U05 established for
 * the rail's silhouette (`journey/layout/rail-geometry.js`) and the same
 * reasoning. This is PIPELINE DATA, not machine state: the target is not
 * "one owner binding" but a published immutable snapshot, so no two
 * consumers can disagree about where the camera was on a given frame.
 *
 * WHAT IS ON IT: the frame's projection and the two scalars every screen-
 * space size in the UI is derived from.
 *
 *   project(v)     the scene's jitter-free projection, camera already bound
 *   projectRaw(v)  THREE's own projection, camera already bound, WITH the TAA
 *                  jitter left in. Exactly one consumer — the hover zones —
 *                  and it is golden-pinned: a zone paints nothing, so steadying
 *                  it buys nothing visible while measurably moving
 *                  owned@430x932. See `hover-zone.js frame()` for the bisect.
 *   tanHalf        tan(fov/2) — the vertical half-extent at unit depth
 *   viewDepth(v)   VIEW-SPACE depth, not radial distance. An off-axis node
 *                  is nearer the image plane than its distance suggests
 *                  (cos 38 deg at |ndc x| 0.9), and sizing a hit pad by
 *                  distance would make it ~20% too small at exactly the
 *                  edge of the frame where it matters most.
 *
 * WHAT IS DELIBERATELY NOT ON IT: THE CAMERA. Both projections are already
 * bound to the camera `update()` read, so every consumer receives a projection
 * and never learns that a camera exists — which is the only way there can go
 * on being exactly one projection path.
 *
 * THAT IS ALSO A DESIGN BOUNDARY WITH A GATE ON IT. `boundaries.md` §B.7
 * pins the FILE-LEVEL allow-list of modules that name the camera in code, and
 * `tools/test-frame-publication.mjs` C5 enforces it. U06's four new UI owners
 * each took a `camera` parameter on their first draft and C5 went red — four
 * files added to an eleven-file design boundary to suit one order's layering.
 * The right answer was not to widen the list: it was to bind the camera HERE,
 * once, and hand the owners a projection. This module is the only UI file
 * below `journey/ui.js` that names it, which is the shape §B.7 describes.
 *
 * THE CONSUMER CONTRACT, four points, unchanged from U05's:
 *   1. The snapshot is FROZEN. A consumer property-write throws in strict
 *      mode rather than silently succeeding.
 *   2. A new frame is a NEW OBJECT. Never patched in place.
 *   3. A stale snapshot means ASK AGAIN, never patch.
 *   4. `snapshot()` may return null — before the first frame, nothing has
 *      been published and there is no honest answer to give.
 *
 * WHY A CONSUMER MAY HOLD THE REFERENCE ACROSS THE FRAME. `openCard()`
 * places the card on the tick it opens, BEFORE the first paint, using the
 * last frame's geometry: sub-pixel stale at worst, and the next frame
 * corrects it. That is the whole reason this is published rather than
 * passed — a caller outside the frame loop needs the last known answer.
 *
 * ---- G3: NAME THE MACHINE -------------------------------------------
 *
 * There is no mode. `latest` is a SLOT, not a state: one write site
 * (`publish`), no reads by this module, no transitions. Naming it here is
 * the point — an owner with no state machine should say so, because the
 * alternative is a reader assuming there is one.
 * ==================================================================== */

/**
 *  @param {object}   io
 *  @param {Function} io.projectStable  the scene's jitter-free projection,
 *                                      `(v, camera) => ndc`.
 */
export function createFrameProjection({ projectStable }) {
  let latest = null;

  /** THE ONE WRITE SITE. Called once per frame, from `update()`'s fixed
   *  composition, after the camera for that frame is settled. */
  function publish(camera) {
    const cm = camera.matrixWorld.elements;
    const cpx = cm[12], cpy = cm[13], cpz = cm[14];
    const fx = -cm[8], fy = -cm[9], fz = -cm[10];
    latest = Object.freeze({
      project: (v) => projectStable(v, camera),
      projectRaw: (v) => v.project(camera),
      tanHalf: Math.tan(camera.fov * Math.PI / 360),
      viewDepth: (v) => (v.x - cpx) * fx + (v.y - cpy) * fy + (v.z - cpz) * fz,
    });
    return latest;
  }

  return {
    publish,
    /** The last published frame, or null before the first one. */
    snapshot() { return latest; },
  };
}
