// The note lives outside the clipped, animated reading column.
let nextNoteId = 0;
export function attachManifestoNote(button, text) {
  const tooltip = document.createElement('div');
  tooltip.className = 'manifesto-note-tooltip';
  tooltip.id = `manifesto-note-${++nextNoteId}`;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  tooltip.textContent = text;
  document.body.appendChild(tooltip);
  button.setAttribute('aria-describedby', tooltip.id);
  button.setAttribute('aria-expanded', 'false');
  let pinned = false;
  let closeTimer;
  const listeners = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }
  function close() {
    clearTimeout(closeTimer);
    pinned = false;
    tooltip.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  function show() {
    clearTimeout(closeTimer);
    tooltip.hidden = false;
    const rect = button.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const x = Math.max(12, Math.min(rect.left, innerWidth - width - 12));
    const y = rect.bottom + height + 10 <= innerHeight - 12
      ? rect.bottom + 10 : Math.max(12, rect.top - height - 10);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    button.setAttribute('aria-expanded', 'true');
  }
  function leave() {
    if (!pinned) closeTimer = setTimeout(close, 160);
  }
  listen(button, 'pointerenter', event => { if (event.pointerType !== 'touch') show(); });
  listen(button, 'pointerleave', leave);
  listen(button, 'focus', show);
  listen(button, 'blur', () => { if (!pinned) close(); });
  listen(button, 'click', event => {
    event.stopPropagation();
    if (pinned) close();
    else { pinned = true; show(); }
  });
  listen(tooltip, 'pointerenter', () => clearTimeout(closeTimer));
  listen(tooltip, 'pointerleave', leave);
  listen(document, 'pointerdown', event => {
    if (!button.contains(event.target) && !tooltip.contains(event.target)) close();
  }, true);
  listen(window, 'keydown', event => {
    if (event.key === 'Escape' && !tooltip.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  listen(window, 'resize', close);
  listen(window, 'scroll', close, true);
  return { close, destroy() { close(); listeners.forEach(remove => remove()); tooltip.remove(); } };
}

// The generated static fallback shares the same note interaction.
if (typeof document !== 'undefined') {
  for (const button of document.querySelectorAll('[data-manifesto-note]')) {
    attachManifestoNote(button, button.getAttribute('data-manifesto-note'));
  }
}
