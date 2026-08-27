export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

import { buildSymbol } from '../symbols.js';

/** Builds chapter destination controls in declaration order.
 *
 *  Two weights of control come out of this: the pill/CTA family
 *  (`j-act-primary` etc., styled as buttons) and the DOOR — the editorial
 *  text link the Epilogue carries (owner, 2026-08-27: "more like
 *  editorial links than buttons... deeper reading"). A door is a bare
 *  anchor: a small glyph from the site's own symbol set, the label in the
 *  body's sans, a trailing arrow, and a hairline rule drawn by CSS. */
export function buildActions(specs) {
  const row = el('div', 'j-actions');
  for (const spec of specs) {
    if (spec.kind !== 'link') continue;
    const node = el('a', `j-act j-act-${spec.weight || 'primary'}`);
    node.href = spec.href || '#';
    if (spec.id) node.dataset.action = spec.id;
    if (spec.weight === 'door') {
      // No trailing arrow (owner, 2026-08-27): an outward arrow claims
      // "leaves this page", and this door is an in-page destination. The
      // small glyph carries the affordance; label + glyph is the whole
      // grammar.
      if (spec.glyph) {
        const g = el('span', 'j-door-g');
        g.setAttribute('aria-hidden', 'true');
        g.appendChild(buildSymbol(spec.glyph));
        node.appendChild(g);
      }
      node.appendChild(el('span', 'j-act-t', spec.label));
    } else {
      node.appendChild(el('span', 'j-act-t', spec.label));
    }
    row.appendChild(node);
  }
  return row;
}

export function createPopover(host) {
  const pop = el('aside', 'j-pop');
  const title = el('strong', 'j-pop-t');
  const short = el('span', 'j-pop-s');
  short.id = 'j-pop-s';
  const link = el('a', 'j-pop-link');
  link.tabIndex = -1;
  pop.appendChild(title);
  pop.appendChild(short);
  pop.appendChild(link);
  host.appendChild(pop);
  return { pop, title, short, link };
}

export function createCard() {
  const card = el('aside', 'j-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.hidden = true;
  const grip = el('div', 'j-card-grip');
  grip.setAttribute('aria-hidden', 'true');
  const close = el('button', 'j-card-x', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  const body = el('div', 'j-card-body');
  card.appendChild(grip);
  card.appendChild(close);
  card.appendChild(body);
  document.body.appendChild(card);
  return { card, grip, close, body };
}
