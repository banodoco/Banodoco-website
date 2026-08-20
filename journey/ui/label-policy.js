const STYLE_ID = 'j-hot-label-policy';

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '.j-hot.label-hover { background: transparent; }',
    '.j-hot.label-hover:not(.bare) > * { opacity: 0; transition: opacity 0.3s; }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) { background: rgba(18, 12, 4, 0.6); }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) > * { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) { .j-hot.label-hover:not(.bare) > * { transition: none; } }',
  ].join('\n');
  document.head.appendChild(style);
}

/** Applies a chapter-owned visual label policy to an existing hotspot record. */
export function applyHotspotLabelPolicy(hotspot, policy) {
  if (!policy) return;
  if (typeof policy.label === 'string' && policy.label) {
    hotspot.label = policy.label;
    if (hotspot.labelEl) hotspot.labelEl.textContent = policy.label;
  }
  if (policy.chip === 'none') {
    hotspot.chipBare = true;
    hotspot.btn.classList.add('bare');
    if (hotspot.labelEl) { hotspot.labelEl.remove(); hotspot.labelEl = null; }
    if (hotspot.dotEl) { hotspot.dotEl.remove(); hotspot.dotEl = null; }
  }
  hotspot.labelOnHover = !!policy.labelOnHover || hotspot.chipBare;
  hotspot.btn.classList.toggle('label-hover', hotspot.labelOnHover);
  hotspot.btn.setAttribute('aria-label', hotspot.label);
  if (hotspot.labelOnHover) ensureStyles();
}
