import { settledPurposeMarks } from '../layout/rail-geometry.js';

/** Fit the complete desktop manuscript, including paragraphs not yet inked.
 * Layout reads happen only when the available box or loaded font changes.
 * No minimum font is imposed: a short desktop must still never scroll. */
export function createManifestoFit(root, panel, lines, paragraphs) {
  let key = '';
  return function fit(force = false) {
    if (window.innerWidth <= 720 || root.hidden) return;
    const panelRect = panel.getBoundingClientRect();
    // Reserve the final circles before the rail gathers. Reading the animated
    // DOM here would make the manuscript shrink after its ink has appeared.
    // A wide viewport whose text ends left of the tree needs no extra reserve.
    const marks = settledPurposeMarks(window.innerWidth, window.innerHeight)
      .filter(mark => mark.x + mark.radius >= panelRect.left
        && mark.x - mark.radius <= panelRect.right);
    const reserve = Math.max(128, ...marks.map(mark =>
      window.innerHeight - (mark.y - mark.radius) + 12));
    root.style.setProperty('--manifesto-desktop-reserve', `${reserve}px`);
    const panelStyle = getComputedStyle(panel);
    const available = Math.max(1, parseFloat(panelStyle.maxHeight)
      - parseFloat(panelStyle.paddingTop) - parseFloat(panelStyle.paddingBottom));
    const next = `${panel.clientWidth}|${available}`;
    if (!force && next === key) return;
    key = next;
    const fits = size => {
      root.style.setProperty('--manifesto-fit-size', `${size}px`);
      const style = getComputedStyle(lines);
      const used = paragraphs.reduce((height, p) => height + p.getBoundingClientRect().height, 0)
        + (paragraphs.length - 1) * (parseFloat(style.rowGap) || 0)
        + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
      return used <= available - 1 && paragraphs.every(p => p.scrollWidth <= lines.clientWidth + 1);
    };
    let low = .25, high = 22;
    if (fits(high)) low = high;
    else for (let i = 0; i < 11; i++) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid; else high = mid;
    }
    root.style.setProperty('--manifesto-fit-size', `${Math.floor(low * 100) / 100}px`);
    lines.style.setProperty('--lift', '0px');
    lines.classList.remove('is-lifted');
  };
}
