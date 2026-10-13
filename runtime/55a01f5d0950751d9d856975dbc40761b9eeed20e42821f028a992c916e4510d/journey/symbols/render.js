// journey/symbols/render.js — THE SECTION SYMBOLS, BUILT AS DOM.
//
// F02 (2026-08-21): split out of journey/symbols.js. This is the thin
// DOM-rendering half: it turns the pure geometry in journey/symbols/data.js
// into a detached <svg> element. It is the only module in the symbols split
// that touches `document`. journey/symbols.js re-exports buildSymbol()
// unchanged as part of its compatibility facade.

import { SYMBOLS, VIEW_BOX } from './data.js';

const NS = 'http://www.w3.org/2000/svg';

/** Build a symbol as a detached <svg>. Presentational everywhere it is used —
 *  every control that carries one also carries its own accessible name — so it
 *  is aria-hidden and unfocusable by construction, not by the caller
 *  remembering. */
export function buildSymbol(id) {
  const spec = SYMBOLS[id];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `j-sym j-sym-${id}`);
  svg.setAttribute('viewBox', VIEW_BOX);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (!spec) return svg;
  for (const part of spec.parts) {
    if (part.p) {
      const n = document.createElementNS(NS, 'path');
      n.setAttribute('d', part.p);
      svg.appendChild(n);
    } else if (part.c) {
      const n = document.createElementNS(NS, 'circle');
      n.setAttribute('cx', String(part.c[0]));
      n.setAttribute('cy', String(part.c[1]));
      n.setAttribute('r', String(part.c[2]));
      svg.appendChild(n);
    }
  }
  return svg;
}
