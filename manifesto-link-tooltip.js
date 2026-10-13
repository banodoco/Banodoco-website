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
  const show = () => {
    if (link.getAttribute('aria-disabled') === 'true') return;
    if (closeActive && closeActive !== close) closeActive();
    closeActive = close;
    tip.hidden = false;
    const r = link.getBoundingClientRect();
    tip.style.left = `${Math.max(12, Math.min(r.left, innerWidth - tip.offsetWidth - 12))}px`;
    tip.style.top = `${r.top > tip.offsetHeight + 20 ? r.top - tip.offsetHeight - 10 : r.bottom + 10}px`;
  };
  listen(link, 'pointerenter', e => { if (e.pointerType !== 'touch') show(); });
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
