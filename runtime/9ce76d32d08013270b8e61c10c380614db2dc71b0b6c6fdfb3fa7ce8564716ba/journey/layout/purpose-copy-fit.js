import { settledPurposeRowMarks } from './rail-geometry.js';

/** Preserve Purpose's type and bottom-left seat, lifting only the ink that
 * would meet the settled navigator. No animation-frame geometry is read. */
export function createPurposeCopyFit(block) {
  let key = '';
  return function fit(force = false) {
    if (!block) return;
    const w = window.innerWidth, h = window.innerHeight;
    const next = `${w}|${h}|${document.fonts?.status}`;
    if (!force && next === key) return;
    key = next;
    block.style.removeProperty('--purpose-copy-lift');
    if (w <= 900) return;
    const marks = settledPurposeRowMarks(w, h);
    const footprints = marks.map(mark => ({ left: mark.x - mark.radius,
      right: mark.x + mark.radius, top: mark.y - mark.radius }));
    // Label dimensions and local offsets are intrinsic layout, unaffected by
    // the travelling ancestor transforms. Place them on the settled child
    // centres, so the words reserve space before the fork unfolds.
    for (const mark of marks.filter(mark => mark.chapter)) {
      const label = document.querySelector(`.j-rail-purpose-${mark.chapter} .j-rail-name`);
      const item = label?.offsetParent;
      if (!item) continue;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(label).transform);
      const left = mark.x - item.offsetWidth / 2 + label.offsetLeft + matrix.m41;
      footprints.push({ left, right: left + label.offsetWidth,
        top: mark.y - item.offsetHeight / 2 + label.offsetTop + matrix.m42 });
    }
    let lift = 0;
    for (const element of block.querySelectorAll('.j-h, .j-sub, .j-actions')) {
      const range = document.createRange();
      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        for (const footprint of footprints) {
          if (rect.right < footprint.left - 12 || rect.left > footprint.right + 12) continue;
          lift = Math.max(lift, rect.bottom - (footprint.top - 30));
        }
      }
    }
    block.style.setProperty('--purpose-copy-lift', `${Math.ceil(lift)}px`);
  };
}
