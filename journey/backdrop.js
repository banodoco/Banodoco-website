// A backdrop closes a drawer only when the same primary pointer both starts
// and ends on the visible backdrop, without turning into a drag. Touch
// pointers are implicitly captured by their pointerdown target, so checking
// the pointerup target alone is insufficient: a gesture can begin outside,
// cross into the panel, and still report its release to the backdrop.

export const BACKDROP_TAP_SLOP = 12;

export function isBackdropTap(start, end, panelRect) {
  if (!start || !end || start.pointerId !== end.pointerId) return false;
  const dx = end.clientX - start.clientX;
  const dy = end.clientY - start.clientY;
  if ((dx * dx) + (dy * dy) > BACKDROP_TAP_SLOP * BACKDROP_TAP_SLOP) return false;
  return end.clientX < panelRect.left
    || end.clientX > panelRect.right
    || end.clientY < panelRect.top
    || end.clientY > panelRect.bottom;
}

export function installBackdropDismiss(backdrop, panel, dismiss) {
  let press = null;

  const clear = () => { press = null; };
  const onPointerDown = (event) => {
    press = event.target === backdrop && event.isPrimary !== false && event.button === 0
      ? { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY }
      : null;
    if (press) {
      // Touch receives implicit capture, but a mouse does not. Capture the
      // initiating pointer explicitly so a release over the panel still
      // reaches onPointerUp and clears this gesture instead of leaving a stale
      // mouse pointerId that a later cross-boundary release could reuse.
      try { backdrop.setPointerCapture(event.pointerId); } catch {}
    }
  };
  const onPointerUp = (event) => {
    const start = press;
    press = null;
    if (isBackdropTap(start, event, panel.getBoundingClientRect())) dismiss(event);
  };

  backdrop.addEventListener('pointerdown', onPointerDown);
  backdrop.addEventListener('pointerup', onPointerUp);
  backdrop.addEventListener('pointercancel', clear);
  backdrop.addEventListener('lostpointercapture', clear);

  return () => {
    backdrop.removeEventListener('pointerdown', onPointerDown);
    backdrop.removeEventListener('pointerup', onPointerUp);
    backdrop.removeEventListener('pointercancel', clear);
    backdrop.removeEventListener('lostpointercapture', clear);
  };
}
