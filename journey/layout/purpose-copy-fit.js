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
    block.style.removeProperty('--purpose-copy-measure');
    if (w <= 620 && h > w) {
      const branch = settledPurposeRowMarks(w, h).find(mark => mark.chapter === 'manifesto');
      const sub = block.querySelector('.j-sub'), style = getComputedStyle(block);
      const left = parseFloat(style.paddingLeft);
      // Only lines beside the branch need its narrow pocket. Earlier lines
      // can use the full measure, keeping this invitation to four lines.
      // Compare local ink against the settled bottom seat, never the entry
      // animation's transient transform.
      const range = document.createRange(); range.selectNodeContents(sub);
      const rect = sub.getBoundingClientRect();
      const top = h - parseFloat(style.bottom) - block.offsetHeight + sub.offsetTop;
      const meetsBranch = [...range.getClientRects()].some(line =>
        top + line.bottom - rect.top > branch.y - branch.radius - 8
        && top + line.top - rect.top < branch.y + branch.radius + 8
        && line.right > branch.x - branch.radius - 20);
      if (meetsBranch) block.style.setProperty('--purpose-copy-measure', `${Math.floor(branch.x - branch.radius - left - 20)}px`);
      return;
    }
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
