// Outside the reading column so its soft clipped edges never cut off the hint.
let nextId = 0;
let closeActive = null;
export function attachManifestoLinkTooltip(link, text) {
  const tip = document.createElement('div');
  tip.id = `manifesto-link-tip-${++nextId}`;
  tip.className = 'manifesto-link-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  tip.hidden = true;
  document.body.appendChild(tip);
  link.setAttribute('aria-describedby', tip.id);
  const listeners = [];
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options);
    listeners.push(() => target.removeEventListener(event, fn, options));
  };
  const close = () => { tip.hidden = true; if (closeActive === close) closeActive = null; };
  const position = event => {
    // An inline link can occupy the end of one line and start of the next.
    // Its bounding box includes the empty space between; anchor to the
    // fragment under the pointer instead (first fragment for keyboard focus).
    const rects = [...link.getClientRects()].filter(r => r.width && r.height);
    const distance = r => Math.hypot(
      Math.max(r.left - event.clientX, 0, event.clientX - r.right),
      Math.max(r.top - event.clientY, 0, event.clientY - r.bottom));
    const r = event?.type.startsWith('pointer')
      ? rects.reduce((best, rect) => !best || distance(rect) < distance(best) ? rect : best, null)
      : rects[0];
    if (!r) return;
    tip.style.left = `${Math.max(12, Math.min(r.left, innerWidth - tip.offsetWidth - 12))}px`;
    tip.style.top = `${r.top > tip.offsetHeight + 20 ? r.top - tip.offsetHeight - 10 : r.bottom + 10}px`;
  };
  const show = event => {
    if (link.getAttribute('aria-disabled') === 'true') return;
    if (closeActive && closeActive !== close) closeActive();
    closeActive = close;
    tip.hidden = false;
    position(event);
  };
  listen(link, 'pointerenter', e => { if (e.pointerType !== 'touch') show(e); });
  listen(link, 'pointermove', e => { if (!tip.hidden && e.pointerType !== 'touch') position(e); });
  listen(link, 'pointerleave', close);
  listen(link, 'focus', show);
  listen(link, 'blur', close);
  listen(link, 'click', close);
  listen(window, 'scroll', close, true);
  listen(window, 'resize', close);
  listen(window, 'keydown', e => { if (e.key === 'Escape') close(); });
  return { close, destroy() { close(); listeners.forEach(remove => remove()); tip.remove(); } };
}
if (typeof document !== 'undefined') {
  for (const link of document.querySelectorAll('[data-manifesto-link]')) {
    attachManifestoLinkTooltip(link, link.getAttribute('data-manifesto-link'));
  }
}
