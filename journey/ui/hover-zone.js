/* ==================================================================== *
 * journey/ui/hover-zone.js — the hover ZONE owner (order U06).
 *
 * A zone is a piece of the SCENE that answers the visitor directly: no
 * chip, no label, no card. Owned's crown is the only one. It is not a
 * hotspot — a hotspot is a named node with content behind it and a place in
 * the narrative registration order; a zone is a PLACE.
 *
 * WHAT MOVED HERE, AND WHY THE TWO HALVES BELONG TOGETHER. `journey/ui.js`
 * held the zone's commit machine (six mutable bindings inside `addHoverZone`)
 * in one place and the zone's per-frame projection in another, 700 lines
 * apart inside `update()`. They are one machine: the frame pass is what
 * takes a zone OUT of the commit machine when it leaves the frame
 * (`z.dismiss()`), and it was reaching across the file to do it. Splitting
 * a state machine from its lifecycle is what made `update()` a 480-line
 * body that reached into everything.
 *
 * ---- G3: NAME THE MACHINE -------------------------------------------
 *
 * There are two machines here, one per zone, and they are deliberately
 * separate because they answer to different clocks.
 *
 * MACHINE 1 — THE VISIT (the commit machine). Only actionable zones have
 * one; scenery zones light and go dark and that is all.
 *
 *   states    IDLE -> DWELLING -> COMMITTED -> (BUSY) -> IDLE
 *   mode      `spent` is the mode binding. false = this visit may still
 *             commit; true = it has, and will not again until the visitor
 *             leaves. `busyUntil` is a REFUSAL WINDOW layered over it, not
 *             a state: it is the chapter saying "a swap is already in
 *             flight", and it refuses WITHOUT spending (2026-08-16).
 *   events    pointerenter / focus  -> IDLE, dwell poll armed
 *             the 340 ms dwell expiring -> COMMITTED
 *             click -> COMMITTED, unless already spent
 *             pointerleave / blur -> IDLE, re-armed
 *             the frame pass losing the zone -> IDLE, timers dropped
 *   clocks    `dwellTimer` polls at 90 ms (a moving deadline is cheaper
 *             polled than re-armed per pointermove); `busyTimer` is the
 *             chapter's own refusal window expiring.
 *
 * MACHINE 2 — THE LIGHT. `z.hot` is the mode, `light()` is the only
 * transition, and it is idempotent per visit by construction. Hover, focus
 * and touch are three doors into the same one state, which is what buys
 * pointer/keyboard parity for free.
 *
 * MACHINE 3 — PRESENCE. `z.live` is the mode: is this zone placeable in
 * the frame at all? Owned by `frame()` below, and its falling edge is what
 * drives machines 1 and 2 back to rest.
 * ==================================================================== */

/** The zone owner.
 *
 *  @param {object}   io
 *  @param {object}   io.hotState  the U02 registry; `zones` is handed out BY
 *                                 IDENTITY and this module publishes into it.
 *  @param {object}   io.owner     the `zones` child of the UI owner tree.
 *                                 Every listener and timer below is its own,
 *                                 so `destroy()` drains them with no help
 *                                 from this module.
 *  @param {Function} io.announce  the polite live region.
 *  @param {Element}  io.host      the `.j-hotzones` layer.
 *  @param {Function} io.el        the element factory.
 *  @param {object}   io.sheetQuery  the coarse-pointer media query, for the
 *                                 touch-minimum radius floor.
 */
export function createHoverZones({ hotState, owner, announce, host, el, sheetQuery }) {
  /** Time inside the zone before a hover commits. The only test there is:
   *  340 ms is longer than a pointer crossing the top of the frame on its way
   *  somewhere else, and short enough that a visitor who meant it does not
   *  wonder whether the control is broken. (Was 380 ms plus a stillness test.) */
  const ZONE_DWELL_MS = 340;

  const zones = hotState.zones;

  function add({ id, chapter, world, radius, onHot, action, label, announce: fallback }) {
    const act = typeof action === 'function' ? action : null;
    const zEl = el(act ? 'button' : 'i', 'j-hotzone');
    if (act) {
      zEl.type = 'button';
      zEl.setAttribute('aria-label', label || id);
    } else {
      // scenery: never in the a11y tree, never in the tab order
      zEl.setAttribute('aria-hidden', 'true');
    }
    host.appendChild(zEl);
    const z = { id, chapter, world, radius: radius || 0.3, onHot, el: zEl, live: false, hot: false, r: 0 };

    /** The light. Idempotent per visit — `hot` is the latch. */
    function light(on) {
      if (z.hot === on) return;
      z.hot = on;
      z.onHot(on);
    }

    if (act) {
      let busyUntil = 0;
      let busyTimer = null;
      let dwellTimer = null;
      let enteredAt = 0;
      let spent = false;              // one commit per visit — see above
      let lastPointerType = '';

      const stopDwell = () => {
        if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
      };

      function fire() {
        stopDwell();
        // BUSY IS CHECKED BEFORE THE VISIT IS SPENT (2026-08-16). It used to
        // spend first, so a hover arriving during the 1250 ms swap burned the
        // visit and did nothing — the visitor then had to leave and come back
        // to get any response at all, which read as the control ignoring them
        // at random. Refusing without spending means the gesture simply has no
        // effect while a swap is already running, which is the truth: a switch
        // is in flight. Nothing reschedules, so this cannot fire late either.
        if (performance.now() < busyUntil) return;
        spent = true;
        const res = act();
        // The chapter refuses while its own transition is running; that is
        // its call to make, and it is not an error.
        if (!res) return;
        const msg = (res && typeof res.announce === 'string') ? res.announce : fallback;
        if (msg) announce(msg);
        const ms = (res && typeof res.busyMs === 'number') ? res.busyMs : 0;
        if (ms > 0) {
          busyUntil = performance.now() + ms;
          // aria-disabled, NOT the `disabled` attribute. A real `disabled`
          // blurs the element the instant it is set, so a keyboard visitor
          // who pressed Enter would be thrown back to <body>. This keeps
          // focus where the visitor put it and says "not now" to AT; the
          // guard above is what actually refuses the second commit.
          zEl.setAttribute('aria-disabled', 'true');
          if (busyTimer) clearTimeout(busyTimer);
          busyTimer = owner.timer(() => {
            busyTimer = null;
            zEl.removeAttribute('aria-disabled');
          }, ms);
        }
      }

      /** Poll rather than one timer: "still for N ms" is a moving deadline,
       *  and re-arming a timeout on every pointermove would be a timer per
       *  mouse event. 90 ms is far below the windows it is testing. */
      function watch() {
        dwellTimer = null;
        if (!z.hot || spent) return;
        if (performance.now() - enteredAt >= ZONE_DWELL_MS) {
          fire();
          return;
        }
        dwellTimer = owner.timer(watch, 90);
      }

      owner.listen(zEl, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        light(true);
        enteredAt = performance.now();
        spent = false;
        stopDwell();
        dwellTimer = owner.timer(watch, 90);
      });
      owner.listen(zEl, 'pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        stopDwell();
        spent = false;                   // leaving re-arms the next visit
        light(false);
      });
      owner.listen(zEl, 'pointerdown', (e) => { lastPointerType = e.pointerType; });
      // click covers mouse, pen, tap AND Enter/Space on the <button>.
      owner.listen(zEl, 'click', () => {
        // A finger has no hover, so the tap has to bring the light with it —
        // and the crown's own response is a one-shot wave, so firing it here
        // is exactly the gesture a mouse gets on entry. Keyboard gets its
        // light from focus (below), so only touch needs this.
        if (lastPointerType === 'touch') { z.hot = false; light(true); }
        lastPointerType = '';
        // ONE COMMIT PER VISIT INCLUDES THE CLICK (2026-08-16). This used to
        // call fire() unconditionally, so a mouse visitor whose hover had
        // already committed got a SECOND re-deal the moment they clicked the
        // thing they were looking at — two swaps from one gesture, the
        // "contradictory effects" in Hannah's report. `spent` is false on
        // touch (no hover ever happened) and false for a keyboard press that
        // did not dwell, so both of those still commit exactly once.
        if (spent) return;
        fire();
      });
      // Focus is hover's equal (PL-2.2): the colony lights for a keyboard
      // exactly as it does for a pointer, which is also this control's
      // visible focus response out in the scene. The ring on the zone itself
      // (journey/site.css) is the DOM half of the same statement.
      owner.listen(zEl, 'focus', () => { light(true); });
      owner.listen(zEl, 'blur', () => { stopDwell(); spent = false; light(false); });
      // A zone that goes off-frame or off-chapter mid-commit must not leave a
      // timer running against an element nobody can reach.
      z.dismiss = () => { stopDwell(); spent = false; };
    } else {
      owner.listen(zEl, 'pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        light(true);
      });
      owner.listen(zEl, 'pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        light(false);
      });
    }

    return hotState.addZone(z);
  }

  /** The presence pass. One frame, every zone.
   *
   *  DELIBERATELY NOT THE STEADY PROJECTION THE CHIPS USE — `geom.projectRaw`,
 *  not `geom.project`. The camera is bound into both by
 *  `journey/ui/frame-projection.js`, so this module never names it (§B.7).
   *
   *  2026-08-12: a zone is a pointer target with no pixels (`.j-hotzone` sets
   *  geometry, visibility and pointer-events, and paints nothing at all), so
   *  taking the TAA jitter out of it buys nothing anyone can see — while
   *  measurably costing a frozen golden. Owned's crown zone is a 203.8 px
   *  circle in `.j-hotzones`, a position:fixed inset:0 layer stacked over the
   *  canvas; steadying it moved that layer's child by 0.2 px
   *  (translate(113px, -5.1px) -> -4.9px) and shifted owned@430x932 by MAE
   *  0.13/255 spread over the WHOLE frame — a compositor rounding artifact,
   *  not a scene change (camera matrices, fog, pose and every lens uniform
   *  were dumped in both builds and are bit-identical). Bisected to exactly
   *  this line: chips steady + zones raw restores all ten goldens to 0.00.
   *
   *  So the zone keeps the raw projection and keeps its sub-pixel tremor. It
   *  is a 0.65 px wobble on a 204 px target, which cannot flicker a hover in
   *  practice, and it is invisible by construction. If a zone ever grows
   *  something that paints, this is the line that has to change — and the
   *  golden it moves is the reason it did not change today.
   */
  function frame({ detail, copyEase, geom }) {
    const { projectRaw, viewDepth, tanHalf } = geom;
    for (const z of zones) {
      const gate = copyEase(z.chapter);
      let live = gate > 0.72 && !detail;
      if (live) {
        const w = z.world();
        const v = w ? projectRaw(w.clone()) : null;
        if (!v || v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) live = false;
        else {
          const d = Math.max(0.05, viewDepth(w));
          // The floor carries PL-1.4's 44 px touch minimum under the same
          // media query the hit pads use, now that a zone can be pressed.
          // Measured, it never binds: the crown projects to r 123 (1440x900),
          // 109 (1280x800), 89 (375x812) and the 140 cap (430x932).
          const zFloor = sheetQuery.matches ? 22 : 18;
          const r = Math.max(zFloor, Math.min(140, z.radius * (window.innerHeight * 0.5) / (d * tanHalf)));
          const zx = (v.x * 0.5 + 0.5) * window.innerWidth;
          const zy = (-v.y * 0.5 + 0.5) * window.innerHeight;
          z.el.style.transform = `translate(${(zx - r).toFixed(1)}px, ${(zy - r).toFixed(1)}px)`;
          z.el.style.width = z.el.style.height = `${(r * 2).toFixed(1)}px`;
          z.r = r;
        }
      }
      if (live !== z.live) {
        z.live = live;
        z.el.classList.toggle('vis', live);
        if (!live) {
          // A zone leaving the frame takes its commit state with it: no timer
          // left running against an element nobody can reach, and no half-
          // spent visit waiting for a pointer that has gone.
          if (z.dismiss) z.dismiss();
          if (z.hot) { z.hot = false; z.onHot(false); }
        }
      }
    }
  }

  return { add, frame };
}
