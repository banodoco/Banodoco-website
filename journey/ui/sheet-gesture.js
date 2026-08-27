/** Owns the bottom sheet's pointer gesture, release timer, and inline transform.
 *
 *  IT REGISTERS THROUGH THE OWNER TREE (order U06). It did not, and that was
 *  the one real leak U06's gate found: four raw `grip.addEventListener` calls
 *  and one raw `setTimeout`, none of them known to `destroy()`. The owner
 *  census reported `[["ui/card",0]]` after a teardown while the DOM still
 *  carried all four, which is precisely why the acceptance reading is taken by
 *  COUNTING ON THE REAL DOM and not by asking a disposer whether it ran (D75).
 *
 *  Measured against the predecessor tree, both origins: 4 listeners survived
 *  `destroy()` at `2a3407d` and 0 survive now. `owner.listen` is
 *  behaviourally identical to `addEventListener` until `dispose()` is called,
 *  and `owner.timer` returns the same `setTimeout` id, so nothing about the
 *  gesture changes on any path that does not tear the UI down — and nothing
 *  in production tears it down yet.
 *
 *  @param {object} deps.owner  the card vessel's owner-tree child. */
export function createSheetGesture({ card, grip, reduceMotion, isOpen, onClose, owner }) {
  let drag = null;
  let releaseTimer = null;

  function cancelRelease() {
    if (releaseTimer === null) return;
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }

  function end(dismiss) {
    const released = drag;
    drag = null;
    if (!released) return;

    if (dismiss) {
      if (reduceMotion.matches) {
        card.classList.remove('dragging');
        card.style.transform = '';
        onClose();
        return;
      }
      card.style.transform = `translateY(${released.dy.toFixed(1)}px)`;
      void card.offsetHeight;
      card.classList.remove('dragging');
      card.style.transform = `translateY(${Math.ceil(released.h + 24)}px)`;
      releaseTimer = owner.timer(() => {
        releaseTimer = null;
        if (!isOpen()) return;
        onClose();
      }, 20);
      return;
    }

    card.classList.remove('dragging');
    card.style.transform = '';
  }

  owner.listen(grip, 'pointerdown', (e) => {
    if (!card.classList.contains('sheet') || !isOpen()) return;
    if (e.button != null && e.button > 0) return;
    cancelRelease();
    drag = {
      id: e.pointerId, y0: e.clientY, dy: 0,
      t0: performance.now(), h: card.getBoundingClientRect().height || 1,
    };
    card.classList.add('dragging');
    try { grip.setPointerCapture(e.pointerId); } catch { /* window delivery remains available */ }
    e.preventDefault();
  });
  owner.listen(grip, 'pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y0);
    card.style.transform = `translateY(${drag.dy.toFixed(1)}px)`;
  });
  owner.listen(grip, 'pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = Math.max(1, performance.now() - drag.t0);
    const flick = drag.dy / dt;
    end(drag.dy > drag.h * 0.28 || (flick > 0.55 && drag.dy > 44));
  });
  owner.listen(grip, 'pointercancel', (e) => {
    if (drag && e.pointerId === drag.id) end(false);
  });

  return {
    cancelRelease,
    reset() {
      cancelRelease();
      if (!drag) return;
      drag = null;
      card.classList.remove('dragging');
    },
  };
}
