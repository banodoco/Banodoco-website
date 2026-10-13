import { settledPurposeRowMarks } from './rail-geometry.js';

/** Preserve Purpose's type and bottom-left seat, lifting only the ink that
 * would meet the settled navigator. No animation-frame geometry is read. */
export function createPurposeCopyFit(block) {
  let key = '';
  return function fit() {
    if (!block) return;
    const w = window.innerWidth, h = window.innerHeight;
    const next = `${w}|${h}|${document.fonts?.status}`;
    if (next === key) return;
    key = next;
    block.style.removeProperty('--purpose-copy-lift');
    if (w <= 900) return;
    const marks = settledPurposeRowMarks(w, h);
    let lift = 0;
    for (const element of block.querySelectorAll('.j-h, .j-sub, .j-actions')) {
      const range = document.createRange();
      range.selectNodeContents(element);
      for (const rect of range.getClientRects()) {
        for (const mark of marks) {
          if (rect.right < mark.x - mark.radius - 12 || rect.left > mark.x + mark.radius + 12) continue;
          lift = Math.max(lift, rect.bottom - (mark.y - mark.radius - 30));
        }
      }
    }
    block.style.setProperty('--purpose-copy-lift', `${Math.ceil(lift)}px`);
  };
}
