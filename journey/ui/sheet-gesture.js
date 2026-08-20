/** Owns the bottom sheet's pointer gesture, release timer, and inline transform. */
export function createSheetGesture({ card, grip, reduceMotion, isOpen, onClose }) {
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
      releaseTimer = setTimeout(() => {
        releaseTimer = null;
        if (!isOpen()) return;
        onClose();
      }, 20);
      return;
    }

    card.classList.remove('dragging');
    card.style.transform = '';
  }

  grip.addEventListener('pointerdown', (e) => {
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
  grip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y0);
    card.style.transform = `translateY(${drag.dy.toFixed(1)}px)`;
  });
  grip.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = Math.max(1, performance.now() - drag.t0);
    const flick = drag.dy / dt;
    end(drag.dy > drag.h * 0.28 || (flick > 0.55 && drag.dy > 44));
  });
  grip.addEventListener('pointercancel', (e) => {
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
