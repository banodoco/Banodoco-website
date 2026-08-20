export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/** Builds chapter destination controls in declaration order. */
export function buildActions(specs) {
  const row = el('div', 'j-actions');
  for (const spec of specs) {
    if (spec.kind !== 'link') continue;
    const node = el('a', `j-act j-act-${spec.weight || 'primary'}`);
    node.href = spec.href || '#';
    if (spec.id) node.dataset.action = spec.id;
    node.appendChild(el('span', 'j-act-t', spec.label));
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
