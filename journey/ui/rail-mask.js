/* ==================================================================== *
 * journey/ui/rail-mask.js — the profile-rail exclusion owner (order U06).
 *
 * WHAT IT DECIDES: which named nodes project UNDER the persistent
 * navigator's painted silhouette this frame, and therefore must vanish from
 * BOTH the DOM hit model and the chapter's own portrait layer — atomically,
 * within one rAF, so neither can trail the other by a paint.
 *
 * WHY IT IS ITS OWN OWNER. It was ~60 lines in the middle of `update()`,
 * sandwiched between the camera setup it reads and the placement loop it
 * feeds, and it owned `profileRailDebug` — a `createUI` binding written
 * here and read by a QA getter 500 lines away. The decision is one thing:
 * a rectangle, a set of discs, and the intersection.
 *
 * ---- G3: NAME THE MACHINE -------------------------------------------
 *
 * There is no mode here — this owner is a PURE FUNCTION OF THE FRAME with
 * one published record beside it, and that is worth saying out loud because
 * it is the reason it is safe to call once per frame from a fixed position.
 *
 *   state    `debug` — the last frame's classifier inputs, published for QA
 *            and for nothing else. One write site (`refresh`), many readers,
 *            never read back by this module. It is a RECORDING, not a mode.
 *   events   `refresh(frame)` — the only one. Idempotent in the sense that
 *            calling it twice on one frame yields the same answer and costs
 *            a second layout read, which is precisely why `update()` calls
 *            it exactly once, at the instant the rail has finished painting.
 *   order    WRITE -> MEASURE -> PUBLISH. `rail.update()` has just written
 *            the navigator's layout for this frame; this is the one instant
 *            its painted geometry is settled and the one instant it is read.
 * ==================================================================== */

import { railBox } from '../layout/rail-geometry.js';

/** Profile controls need 24 px of honest air outside the complete painted
 *  silhouette, not merely outside `.j-rail-list`.
 *
 *  A PAD IS THE ASKER'S POLICY, not a property of the navigator: how much
 *  room this thing needs beside that thing. The silhouette it is measured
 *  from — including the 22 px the active marker paints outside its own box —
 *  belongs to journey/layout/rail-geometry.js and is not restated here. */
const PROFILE_RAIL_CLEARANCE_PX = 24;

/**
 *  @param {object}   io
 *  @param {Array}    io.hotspots       the registry array, BY IDENTITY.
 *  @param {object}   io.railGeom       the rail's exclusion slot (U05).
 *  @param {object}   io.chapters       the injected chapter map.
 *  @param {string[]} io.chapterIds     RUNTIME_CHAPTER_IDS, in order.
 */
export function createRailMask({ hotspots, railGeom, chapters, chapterIds }) {
  /** QA: exact screen-space classifier inputs from the most recent frame. */
  let debug = null;

  function refresh({ geom }) {
    const { project, viewDepth, tanHalf } = geom;
    /* WRITE -> MEASURE -> PUBLISH, once. `rail.update()` has just docked the
       navigator for this very frame; this is the instant its painted geometry
       is settled and the only instant it is read. Both consumers — this mask
       and the card's placement — take their box off this one snapshot. */
    const box = railBox(railGeom.refresh(), PROFILE_RAIL_CLEARANCE_PX, true);
    const excluded = new Set();
    const nodes = [];
    if (box) {
      for (const h of hotspots) {
        /* CAPABILITY-DRIVEN, NOT CHAPTER-NAMED (C05 slice D, design.md §5.5).
           The test used to read `h.chapter !== 'owned' || !h.radius`. The
           chapter half was redundant: chapter-interactions.js only forwards
           `radius` when the chapter declares `visibility.nodeRadius`, and
           owned is the only chapter that declares one — so membership is
           unchanged today. It is also the correct rule going forward: a
           chapter that grows a hit-radius model joins the collision pass,
           which is what the pass is for. */
        if (!h.radius || typeof h.world !== 'function') continue;
        const ow = h.world();
        if (!ow) continue;
        const ov = project(ow.clone());
        if (ov.z > 1) continue;
        const ox = (ov.x * 0.5 + 0.5) * window.innerWidth;
        const oy = (-ov.y * 0.5 + 0.5) * window.innerHeight;
        const wr = h.radius() || 0;
        const rr = wr > 0
          ? wr * (window.innerHeight * 0.5) / (Math.max(0.05, viewDepth(ow)) * tanHalf)
          : 0;
        const cx = Math.max(box.left, Math.min(ox, box.right));
        const cy = Math.max(box.top, Math.min(oy, box.bottom));
        const distance = Math.hypot(ox - cx, oy - cy);
        if (rr > 0 && distance < rr) excluded.add(h.id);
        nodes.push({ id: h.id, x: ox, y: oy, r: rr, distance });
      }
    }
    debug = {
      box: box ? { ...box } : null,
      colliding: [...excluded],
      excluded: [...excluded],
      nodes,
    };
    /* Hand every chapter that owns a node-exclusion model ITS OWN ids, every
       frame (C05 slice D, design.md §6.4). This used to be
       `window.journey.chapters.owned.portraits.setRailExcluded(...)` — a named
       chapter AND a private field, the one genuine private-internals reach in
       the tree. This module no longer knows that owned has a `portraits`
       field, an index-based node model, or a rail-exclusion concept: it hands
       over a set of node ids, which is the only vocabulary it has.

       Per chapter, not the union: today owned declares the only `nodeRadius`,
       so every member of `excluded` is owned's and `mine` has exactly the
       membership the old call passed. `setExcludedNodes` is unconditional per
       frame, as the old call was, and portraits.js keys its upload off the
       mask CONTENT (`railMaskKey`), so a fresh Set of the same ids no-ops
       exactly as the retained one did. */
    for (const id of chapterIds) {
      const vis = chapters[id] && chapters[id].visibility;
      if (!vis || typeof vis.setExcludedNodes !== 'function') continue;
      const mine = new Set();
      for (const h of hotspots) if (h.chapter === id && excluded.has(h.id)) mine.add(h.id);
      vis.setExcludedNodes(mine);
    }
    return excluded;
  }

  return {
    refresh,
    /** QA: exact screen-space classifier inputs from the most recent frame. */
    get debug() { return debug; },
  };
}
