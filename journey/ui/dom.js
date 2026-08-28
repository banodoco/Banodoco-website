export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/** Builds chapter destination controls in declaration order.
 *
 *  Two families of control come out of this: the pill/CTA family
 *  (`j-act-primary` etc., styled as buttons), and editorial links. Purpose's
 *  links are intentionally data-shaped here so their icon/title/descriptor
 *  remain one accessible anchor while CSS can make the descriptors a quiet
 *  hover/focus reveal. */
import { buildSymbol } from '../symbols.js';

export function buildActions(specs) {
  const row = el('div', 'j-actions');
  for (const spec of specs) {
    if (spec.kind !== 'link') continue;
    // Purpose's editorial doors intentionally do not carry `.j-act`: that
    // class is the hook for the chapter-arrival rise in arrival-motion.js and
    // copy-arrival.js. Their own class lets them fade with the Purpose copy
    // envelope without inheriting the existing navigation animation.
    const node = el('a', spec.weight === 'purpose'
      ? 'j-purpose-cta j-act-purpose'
      : `j-act j-act-${spec.weight || 'primary'}`);
    node.href = spec.href || '#';
    if (spec.id) node.dataset.action = spec.id;
    if (spec.weight === 'purpose') {
      // Purpose uses the existing Owned scene mark, reduced to a quiet
      // editorial scale rather than inventing a second icon vocabulary.
      const icon = el('span', 'j-purpose-icon');
      icon.setAttribute('aria-hidden', 'true');
      if (spec.glyph) icon.appendChild(buildSymbol(spec.glyph));
      else if (spec.icon) icon.textContent = spec.icon;
      node.appendChild(icon);
      const copy = el('span', 'j-purpose-copy');
      copy.appendChild(el('span', 'j-act-t', spec.label));
      if (spec.sub) copy.appendChild(el('span', 'j-act-sub', spec.sub));
      node.appendChild(copy);
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
