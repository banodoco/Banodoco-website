// journey/rail.js — THE RIGHT-SIDE NAVIGATOR (Hannah, 2026-08-09 redux;
// first built left-side 2026-08-07).
//
//   "Create a small, persistent navigation control attached to the right side
//    of the viewport ... At rest, it contains two symbols/icons: the symbol
//    representing whichever section the user is currently viewing, and a
//    separate menu symbol positioned beside it. When the user hovers over the
//    current-section symbol, it should expand to reveal the symbols for all
//    major sections ... Hovering an individual symbol reveals the name of
//    that section ... Clicking the menu symbol should open a larger
//    navigation panel that slides in from the right side of the screen. This
//    replaces the existing Site Information section entirely."
//
// This module owns the whole thing: the rail, its three states, and the
// site-map panel. It replaced the hero-nav `.j-nav` row in the first build;
// this redux additionally replaces `journey/ui-footer.js` (the bottom "Site
// Information" band and its epilogue cue) — everything that footer carried is
// in the PANEL now: the chapter deep links, the outbound links, the static-
// journey pointer, and the legal line. The static tier carries a hand-
// authored twin of all of it (static/index.html), checked by its drift guard.
//
// ===========================================================================
// DERIVED, NOT LISTED
// ===========================================================================
// Nothing here names a chapter or a node. The rail's slots come from
// route.js's CHAPTERS in manifest order; every one is a LINK (every chapter
// has a route — see THE EPILOGUE); which one reads current is `chapterAt(p)`.
// The panel's per-section item lists come from
// CONTENT.nodes, grouped by each node's own `chapter` field in insertion
// (= narrative) order. A chapter added to ROUTE, or a node added to CONTENT,
// appears here without an edit to this file.
//
// ===========================================================================
// THE THREE STATES
// ===========================================================================
// RESTING — two symbols on the right flank, vertically centred: the mark for
//   `chapterAt(p)` (the scene actually on screen), and the menu mark directly
//   below it. The current mark is ALWAYS at the same place — the fan is
//   anchored on it, not on the top of a fixed stack — so the control is a
//   persistent instrument, not a cursor wandering down a band.
//
// EXPANDED — hover on the section symbol, keyboard focus, or a first touch.
//   The other sections' marks fan OUT from behind the current one to their
//   manifest positions (section i sits at (i - current) tiles from the
//   anchor), and the menu mark slides down to hold the foot of the stack.
//   The mark the visitor was pointing at does not move by a pixel — the
//   expansion happens around it. Hovering (or focusing) an individual mark
//   reveals that section's name on a small scrim pill to its left; the
//   current one wears the reticle brackets the hero's callouts use.
//
//   The fan opens from the LIST's hover only — the menu mark is a separate
//   control and pointing at it must not unfold the sections. Once open, the
//   fan stays open while the pointer is anywhere over the control (so a
//   pointer can travel the stack), and folds back when it leaves.
//
// MENU OPEN — a real modal dialog sliding in from the right: the site map.
//   Every section with its heading, every section's nodes with their one-line
//   descriptions and primary links, the outbound links, the static-tier
//   pointer, the legal line. Someone who opens it understands what the site
//   contains without riding the journey.
//
// ===========================================================================
// THE EPILOGUE
// ===========================================================================
// The Final chapter has a route and no nav entry (route.js, 10-chapter-
// final.md). The first redux rendered its slot as an aria-hidden <span> echo
// — and that echo was a 44px hole in the fan: it never matched the
// `a.j-rail-item` pointer-events rules, so a pointer crossing it left the
// control (collapsing the fan) and a click on it fell through to whatever
// stood behind (measured 2026-08-09: the resting menu button — Hannah's
// "the Epilogue button isn't clickable, and it closes when I hover").
//
// It is now a REAL LINK, like every other slot: the chapter has a route, the
// panel already navigates to it, and a tile you can see and point at must be
// a tile you can press. `nav: null` still keeps it out of nowhere else; here
// it only means the slot speaks with the echo's quieter voice
// (`.j-rail-echo`). `aria-current` follows `chapterAt(p)` — with all five
// slots linked, the rail can finally say "you are in the epilogue" itself,
// exactly as the panel always could.
//
// ===========================================================================
// p = 0 AND THE MISSION REFERENCE
// ===========================================================================
// The rail is invisible at the Mission pose and fades in with the first
// travel, so static/captures/mission@* does not move. The reveal LATCHES
// (returning to p = 0 keeps the rail), and the rail is NOT inert at p = 0 —
// its own `:focus-within` brings it up, so the first Tab lands on something
// that is on screen by the time it is focused. Both decisions carried over
// from the first build; the reasoning lives in 23-side-navigator.md §9.

import { CONTENT } from '../content/content.js';
import { CHAPTERS, chapterAt } from './route.js';
import { buildSymbol } from './symbols.js';
import { claimInput, releaseInput } from './scroll.js';

/* Below this progress the page is the Mission pose and the rail stays dark.
   Same threshold the old nav used, kept so the fade-in reads identically. */
const SHOW_P = 0.004;

/* ===========================================================================
   THE CLUSTER (Hannah, 2026-08-12) — the fan stops being a column
   ===========================================================================
   "the items should wrap around the menu button in an L shape. Slot order,
    following a continuous path around the button: (1) directly above the
    button — always the active section; (2) to the left; (3) bottom-left
    diagonal; (4) directly below; (5) bottom-right diagonal ... If there are
    more sections than slots, continue the path clockwise past slot 5 to the
    right and top-right positions."

   The seven named positions are the eight cells of a 3x3 grid around the
   button, minus the top-left one — which the path never rests in and only
   ever passes THROUGH (see the leg from slot 1 to slot 2). Written here as
   polar coordinates rather than as a (col, row) table, because the geometry
   the brief describes is a RING and everything the component has to do with
   it — unfurl, rotate, fold — is an angle:

     angle   0deg is straight up from the button; it increases clockwise, the
             convention CSS's own `ray()` and conic gradients use. The path
             the brief names therefore runs NEGATIVE, and the whole ring is
             one monotone sweep: 0, -90, -135, -180, -225, -270, -315, and
             -360 is slot 1 again. Any two consecutive slots are one step
             apart on that sweep, so "shifts along the path" is a subtraction.

     radius   is NOT stored: it is derived in the stylesheet from the angle by
             the square law (see `--rad` in site.css), which is what puts the
             axis cells one pitch out and the diagonal cells a pitch and a
             half — and, more importantly, makes travel between any two cells
             follow the SQUARE'S OWN PERIMETER. An item shifting more than one
             slot therefore tracks through the cells in between instead of
             cutting the chord across the button.

   `col`/`row` are carried only so the name pills can clear their neighbours;
   nothing positions a tile with them. */
const RING = [
  // [col, row, angle]         slot  position
  [0, -1, 0],                // 1    directly above the button — the active one
  [-1, 0, -90],              // 2    to the left
  [-1, 1, -135],             // 3    bottom-left diagonal
  [0, 1, -180],              // 4    directly below
  [1, 1, -225],              // 5    bottom-right diagonal
  [1, 0, -270],              // 6    right          } the overflow continuation,
  [1, -1, -315],             // 7    top-right      } unused at five chapters
];

/* ---- how far each cell's NAME PILL has to be held off ---------------------
   A pill hangs off the LEFT of the tile it names, so in a block three cells
   wide it would be drawn straight over whatever shares its row. The first
   cluster build paid for that with one flat offset — every pill pushed out to
   the cluster's left edge — which cleared the collision and cost slot 1, the
   pill a visitor sees most (it is the active section, and it is the mark the
   pointer is on when the cluster opens), a whole empty cell of separation from
   its own mark. Shot 2026-08-12 at 1440 and at 375: the label read as floating
   in the frame rather than as belonging to the drawing beside it.

   The real constraint is per ROW, not per cluster: a pill only has to clear
   what is actually to its left in its own row. The top row's left cell is the
   one the path never rests in — always empty, at five chapters or at seven —
   so slot 1's pill can sit directly against its mark, and every other pill
   still lands on the cluster's left edge because their rows really are full.

   Derived, so it stays true if the manifest grows: `pill` counts the cells
   between this one and the leftmost OCCUPIED cell of its row (the button
   included — it occupies the middle of row 0). At five chapters this is
   [0, 0, 0, 1, 2] and the menu's is 1; at seven, slots 6 and 7 come out 2 and
   1, each clearing exactly the neighbours it has grown. */
function pillClearance(n) {
  const cells = RING.slice(0, Math.min(n, RING.length));
  const minCol = new Map([[0, 0]]);          // the button: row 0, col 0
  for (const [c, r] of cells) {
    minCol.set(r, Math.min(minCol.has(r) ? minCol.get(r) : c, c));
  }
  return {
    slot: RING.map(([c, r]) => c - (minCol.has(r) ? minCol.get(r) : c)),
    menu: 0 - minCol.get(0),
  };
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** The reticle: four corner brackets that lock in clockwise around the current
 *  symbol. Lifted wholesale from the hero's `.co .ck` treatment (hero.css) —
 *  same four elements, same clockwise delays, same overshoot — because "this
 *  is the one you are on" and "this is the label you are pointing at" are the
 *  same statement and should not have two drawings. */
function reticle() {
  const wrap = el('i', 'j-rail-ret');
  wrap.setAttribute('aria-hidden', 'true');
  for (const c of ['tl', 'tr', 'br', 'bl']) wrap.appendChild(el('b', `j-rck ${c}`));
  return wrap;
}

export function createRail({ onNav } = {}) {
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------ */
  /* THE RAIL                                                            */
  /* ------------------------------------------------------------------ */
  // A real <nav> landmark with its own label, a sibling of the hero's <nav>
  // on <body>. The hero's wordmark and its Discord pill are untouched
  // (2RP left that row 2026-08-10; the Inspire node keeps it).
  const root = el('nav', 'j-rail');
  root.setAttribute('aria-label', 'Journey sections');
  // The fan geometry: every slot's position is (--i - --cur) tiles from the
  // anchor, so the whole choreography lives in the stylesheet and JS only
  // states where the visitor is.
  root.style.setProperty('--n', String(CHAPTERS.length));
  // ...and the CLUSTER geometry is the same statement in polar form. The ring
  // holds seven cells; a manifest that outgrew it would have two chapters
  // resting in one cell, so the component says so and the stylesheet keeps the
  // column for every context. Derived, like everything else here — a sixth
  // chapter needs no edit, an eighth needs no bug report.
  if (CHAPTERS.length > RING.length) root.classList.add('j-rail-column');

  const inner = el('div', 'j-rail-inner');
  root.appendChild(inner);

  const list = el('ul', 'j-rail-list');
  inner.appendChild(list);

  const slots = [];      // { id, li, item }
  const links = {};      // chapterId -> <a> — all five; see THE EPILOGUE

  CHAPTERS.forEach((c, i) => {
    const li = el('li', 'j-rail-slot');
    li.dataset.chapter = c.id;
    li.style.setProperty('--i', String(i));

    // Every slot is a real link: every chapter has a route, and a tile a
    // pointer can reach must be a tile a pointer can press (THE EPILOGUE).
    const item = el('a', 'j-rail-item');
    item.href = `#/${c.id}`;
    item.dataset.chapter = c.id;
    // Collapse the TOUCH state only: a second tap acted, the arming is spent.
    // The hover fan deliberately stays — the pointer is still on the control,
    // and it folds on pointer-leave (Hannah, 2026-08-09: close on de-hover,
    // not on click-elsewhere).
    item.addEventListener('click', (e) => { e.preventDefault(); collapseTouch(); onNav(c.id); });
    links[c.id] = item;
    // The nav-less chapter keeps the echo's quieter voice, as a style only.
    if (!c.nav) li.classList.add('j-rail-echo');

    const mark = el('span', 'j-rail-mark');
    mark.appendChild(buildSymbol(c.id));
    mark.appendChild(reticle());
    item.appendChild(mark);
    item.appendChild(el('span', 'j-rail-name',
      (CONTENT.chapters[c.id] || {}).nav || c.nav || 'Epilogue'));

    li.appendChild(item);
    list.appendChild(li);
    slots.push({ id: c.id, li, item });
  });

  /* ---- the menu control: the second resting symbol ---- */
  const menuBtn = el('button', 'j-rail-menu');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-haspopup', 'dialog');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-controls', 'j-menu');
  const menuMark = el('span', 'j-rail-mark');
  menuMark.appendChild(buildSymbol('menu'));
  menuBtn.appendChild(menuMark);
  menuBtn.appendChild(el('span', 'j-rail-name', 'Menu'));
  inner.appendChild(menuBtn);

  document.body.appendChild(root);

  /* ------------------------------------------------------------------ */
  /* THE SITE-MAP PANEL                                                  */
  /* ------------------------------------------------------------------ */
  /* CONTENT SOURCE. Every string below comes out of content/content.js and
     nothing is written here:

       lede         chapters.mission.sub — the site's one-line summary of
                    itself (also static/index.html's <meta description>).
       section name chapters.<id>.nav (the epilogue: the structural word
                    "Epilogue", route.js's own word for it — not new copy)
       section line chapters.<id>.heading — one short statement per section.
       item title   nodes.<id>.label
       item line    nodes.<id>.short — the same sentence the node's own
                    popover shows, [PLACEHOLDER] tokens and all.
       item link    nodes.<id>.spotlight.link / .card.link, where one exists.
                    Every href is '#' per D10 — no external URL on this site
                    is confirmed yet (including the hero's own Discord
                    pill). The panel carries the authored labels and waits.
       elsewhere    site.links + site.social (the renamed footer content)
       static note  the sentence ui-footer.js shipped, verbatim
       legal        site.legal */
  const scrim = el('div', 'j-menu-scrim');
  scrim.hidden = true;
  document.body.appendChild(scrim);

  const menu = el('aside', 'j-menu');
  menu.id = 'j-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-labelledby', 'j-menu-h');
  menu.hidden = true;
  menu.inert = true;

  const menuClose = el('button', 'j-menu-x', '✕');
  menuClose.type = 'button';
  menuClose.setAttribute('aria-label', 'Close menu');
  menu.appendChild(menuClose);

  const menuH = el('h2', 'j-menu-h', 'Banodoco');
  menuH.id = 'j-menu-h';
  menu.appendChild(menuH);
  menu.appendChild(el('p', 'j-menu-lede', CONTENT.chapters.mission.sub));

  /** A chapter's nodes, in content.js insertion (= narrative) order. */
  function itemsFor(chapterId) {
    return Object.entries(CONTENT.nodes)
      .filter(([, n]) => n.chapter === chapterId)
      .map(([id, n]) => {
        const d = n.spotlight || n.card || {};
        return { id, label: n.label, short: n.short || '', link: d.link || null };
      });
  }

  const menuNav = el('nav', 'j-menu-nav');
  menuNav.setAttribute('aria-label', 'All sections');
  const menuList = el('ol', 'j-menu-list');
  const menuLinks = {};
  CHAPTERS.forEach((c, i) => {
    const data = CONTENT.chapters[c.id] || {};
    const li = el('li');
    const a = el('a', 'j-menu-item');
    a.href = `#/${c.id}`;
    a.dataset.chapter = c.id;
    const mark = el('span', 'j-menu-mark');
    mark.appendChild(buildSymbol(c.id));
    a.appendChild(mark);
    const txt = el('span', 'j-menu-txt');
    // "01 — Mission": the hero callouts number themselves the same way, and so
    // does the static tier's eyebrow. Derived from manifest order.
    txt.appendChild(el('span', 'j-menu-no', String(i + 1).padStart(2, '0')));
    txt.appendChild(el('span', 'j-menu-name', data.nav || 'Epilogue'));
    txt.appendChild(el('span', 'j-menu-line', data.heading || ''));
    a.appendChild(txt);
    a.addEventListener('click', (e) => { e.preventDefault(); closeMenu({ focusBack: false }); onNav(c.id); });
    li.appendChild(a);

    // The section's own contents: label — one sentence → primary link.
    const items = itemsFor(c.id);
    if (items.length) {
      const sub = el('ul', 'j-menu-sub');
      for (const it of items) {
        const row = el('li', 'j-menu-row');
        row.appendChild(el('span', 'j-menu-il', it.label));
        if (it.short) row.appendChild(el('span', 'j-menu-is', it.short));
        if (it.link) {
          const la = el('a', 'j-menu-ia', it.link.label);
          la.href = it.link.href || '#';
          row.appendChild(la);
        }
        sub.appendChild(row);
      }
      li.appendChild(sub);
    }

    menuList.appendChild(li);
    menuLinks[c.id] = a;
  });
  menuNav.appendChild(menuList);
  menu.appendChild(menuNav);

  const elsewhere = el('div', 'j-menu-else');
  const eh = el('h3', 'j-menu-eh', 'Elsewhere');
  eh.id = 'j-menu-eh';
  elsewhere.appendChild(eh);
  const eul = el('ul', 'j-menu-links');
  eul.setAttribute('aria-labelledby', 'j-menu-eh');
  for (const link of [...CONTENT.site.links, ...CONTENT.site.social]) {
    const li = el('li');
    const a = el('a', null, link.label);
    a.href = link.href || '#';
    li.appendChild(a);
    eul.appendChild(li);
  }
  elsewhere.appendChild(eul);
  menu.appendChild(elsewhere);

  // The accessible, crawlable static tier (PS-5.1 / PL-2.1) — the footer's
  // sentence, verbatim, now living where the site information lives. NOT a
  // reduced-motion redirect (decision D11): a link a person chooses to follow.
  const note = el('p', 'j-menu-note');
  note.appendChild(document.createTextNode('Every chapter, every node and every link on this page also exists as a plain HTML document with no WebGL: '));
  const staticLink = el('a', null, 'the static journey');
  // Resolved off import.meta.url so a directory rename cannot break it — the
  // reasoning is inherited from ui-footer.js (see 25-navigation-redux.md).
  staticLink.href = new URL('../static/', import.meta.url).href;
  note.appendChild(staticLink);
  note.appendChild(document.createTextNode('.'));
  menu.appendChild(note);

  if (CONTENT.site.legal) menu.appendChild(el('p', 'j-menu-legal', CONTENT.site.legal));

  document.body.appendChild(menu);

  /* ------------------------------------------------------------------ */
  /* EXPANSION                                                           */
  /* ------------------------------------------------------------------ */
  /* Three ways in, one state out:

       hover     JS-managed (`.j-rail-hot`), NOT the container's `:hover`,
                 because the brief separates the two resting controls: the fan
                 opens from the SECTION symbol, and pointing at the menu mark
                 must not unfold the sections. A bare :hover on the root could
                 not tell them apart. Entering the list opens — after a short
                 DWELL (HOT_INTENT_MS): the fan slides the menu mark down to
                 hold the foot of the stack, so a pointer merely TRANSITING
                 the current mark on its way to the menu must not unfold it
                 (measured 2026-08-09: the transit expansion moved the menu
                 out from under the aimed click). Leaving the whole control
                 closes — an open fan survives the pointer travelling across
                 it, including down to the menu mark.
       keyboard  the root's `:has(:focus-visible)`, in CSS. NOT
                 `:focus-within`: a mouse click focuses what it presses, and
                 that focus must neither expand the fan (it moved the menu
                 button between mousedown and mouseup — the first click
                 never landed) nor hold the fan open after the pointer has
                 left (Hannah's "doesn't go away until I click somewhere
                 else"). `:focus-visible` is exactly the keyboard half.
       touch     `.j-rail-open`: first tap expands, second acts — the model
                 this site already uses for its hotspot chips, decided per
                 INTERACTION from the live pointerType, never a boot sniff.
                 A tap on the MENU mark never arms the fan: the menu is the
                 other resting control, and its first tap opens the panel. */
  const HOT_INTENT_MS = 120;
  let touchOpen = false;
  let swallowClick = false;
  let hotOpen = false;
  let hotTimer = 0;

  function expanded() {
    return touchOpen || hotOpen || !!root.querySelector(':focus-visible');
  }

  /* The touch-expanded rail is announced on <body> (2026-08-07 mobile pass):
     journey/site.css steps the chapter copy back while the rail is held open
     over it at phone widths. Touch path only — hover and keyboard focus on a
     desktop are completely unaffected. */
  function announceOpen(on) {
    document.body.classList.toggle('j-rail-on', on);
  }

  function collapseTouch() {
    if (!touchOpen) return;
    touchOpen = false;
    root.classList.remove('j-rail-open');
    announceOpen(false);
  }

  function collapse() {
    collapseTouch();
    clearTimeout(hotTimer);
    if (hotOpen) {
      hotOpen = false;
      root.classList.remove('j-rail-hot');
    }
    foldedSync();
  }

  /* A folded cluster has no angles — the stylesheet stacks every slot behind
     the current mark and stops reading `--ang-to` at all — so the moment the
     control folds, the accumulated turn is spent and the ring goes back to its
     canonical reading. Without this a cluster that had been rotated would
     unfurl the way it last turned rather than the way it always unfurls: the
     same picture, arrived at backwards. Cheap, and it only runs on a fold. */
  function foldedSync() {
    if (!expanded()) writeAngles(curIndex);
  }

  list.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || hotOpen) return;
    // Dwell before unfolding — see the header note. A pointer that is only
    // passing through the current mark on its way to the menu mark is gone
    // well inside HOT_INTENT_MS, and the menu stays where it was aimed at.
    clearTimeout(hotTimer);
    hotTimer = setTimeout(() => {
      hotOpen = true;
      root.classList.add('j-rail-hot');
    }, HOT_INTENT_MS);
  });
  // Leaving the LIST cancels a pending unfold (the pointer went on to the
  // menu mark, or away); leaving the whole CONTROL folds an open fan.
  list.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
  });
  inner.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
    if (!hotOpen) return;
    hotOpen = false;
    root.classList.remove('j-rail-hot');
    foldedSync();
  });
  // The keyboard's own fold: `:has(:focus-visible)` holds the cluster open in
  // CSS with nothing for JS to clear, so the ring is re-read when focus leaves
  // the control. Deferred one tick because focusout fires BEFORE the focus has
  // landed anywhere, and a Tab from one tile to the next would otherwise look
  // like a fold.
  root.addEventListener('focusout', () => { setTimeout(foldedSync, 0); });

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || touchOpen) return;
    // The menu mark is the OTHER resting control: its first tap opens the
    // panel (see the menu's own pointerdown below), so it must not spend the
    // tap on arming the fan — and arming would slide the button out from
    // under the very tap that pressed it (measured 2026-08-09).
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    touchOpen = true;
    root.classList.add('j-rail-open');
    announceOpen(true);
    // The tap that opened the rail must not also follow the link under it.
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 500);
  }, true);

  root.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    // The menu mark is live at rest — it is one of the two resting symbols —
    // so the arming tap swallows section-fan clicks only; a first tap on the
    // menu button opens the menu, as a persistent control should.
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // A press anywhere else puts the rail back to two symbols. Passive observer —
  // it never cancels, so the canvas's own tap handling is untouched.
  document.addEventListener('pointerdown', (e) => {
    if (!touchOpen) return;
    if (e.target instanceof Node && root.contains(e.target)) return;
    collapse();
  }, { capture: true });

  /* ------------------------------------------------------------------ */
  /* THE MENU: open, trap, close                                         */
  /* ------------------------------------------------------------------ */
  let menuIsOpen = false;
  let menuReturn = null;

  function focusables() {
    return [...menu.querySelectorAll('a[href], button:not([disabled])')]
      .filter(n => n.offsetParent !== null || n === menuClose);
  }

  function openMenu(trigger) {
    if (menuIsOpen) return;
    menuIsOpen = true;
    menuReturn = trigger || menuBtn;
    scrim.hidden = false;
    menu.hidden = false;
    menu.inert = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    // One synchronous style flush so the opacity/transform transition has a
    // rendered start state to run FROM — a panel arriving out of `hidden`
    // (display:none) has none, and would otherwise appear finished. Same
    // reasoning, and the same fix, as the detail card's open (journey/ui.js).
    void menu.offsetHeight;
    menu.classList.add('open');
    scrim.classList.add('open');
    document.body.classList.add('j-menu-on');
    // The panel is tall and scrolls. Registering it means wheel and touch
    // inside it are never travel and are never preventDefault()ed, so it
    // scrolls natively; `modal` additionally takes the travel KEYS off the
    // table, so the journey cannot be scrubbed out from under the reader.
    // (journey/scroll.js, INPUT OWNERSHIP.)
    claimInput(menu, { modal: true });
    // The rail is behind the panel and belongs to nobody while it is open.
    root.inert = true;
    collapse();
    menuClose.focus();
  }

  function closeMenu({ focusBack = true } = {}) {
    if (!menuIsOpen) return;
    menuIsOpen = false;
    menu.classList.remove('open');
    scrim.classList.remove('open');
    document.body.classList.remove('j-menu-on');
    releaseInput(menu);
    menuBtn.setAttribute('aria-expanded', 'false');
    // inert BEFORE the focus return: a fading panel is out of the tab order
    // and out of the a11y tree from the first frame of the fade.
    menu.inert = true;
    root.inert = false;
    if (focusBack && menuReturn && document.contains(menuReturn)) menuReturn.focus();
    menuReturn = null;
    // Let the fade play, then leave the box tree. Reduced motion has no fade
    // to protect (the stylesheet drops the transition), so it goes on the tick.
    if (reduceMotion.matches) finishMenuClose();
    else setTimeout(finishMenuClose, 320);
  }

  function finishMenuClose() {
    if (menuIsOpen) return;                 // reopened mid-fade
    menu.hidden = true;
    scrim.hidden = true;
  }

  /* The menu opens on POINTERDOWN, not on click — the way an OS menu bar
     does. The button is a control that can be in motion (it slides down to
     hold the foot of an opening fan), and a click needs press and release to
     land on the same node: any motion in between loses it (measured
     2026-08-09 — the first click opened nothing). The press is the intent;
     acting on it makes the button clickable throughout its motion. The
     preventDefault keeps the press from also focusing the button, so focus
     goes where openMenu sends it (the close control) and stays there.
     The click listener remains for the keyboard: Enter/Space synthesise a
     click with no pointerdown before it, and openMenu() itself is guarded
     against running twice. */
  menuBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    openMenu(menuBtn);
  });
  menuBtn.addEventListener('click', () => openMenu(menuBtn));
  menuClose.addEventListener('click', () => closeMenu());
  scrim.addEventListener('click', () => closeMenu());

  // Focus trap. While the dialog is open its own controls are the whole world,
  // so Tab cycles inside it; Shift+Tab wraps the other way.
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !menuIsOpen) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || !menu.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !menu.contains(at))) { e.preventDefault(); first.focus(); }
  });

  /* Escape, in priority order: the menu first (it is modal and it is the thing
     in front of you), then an expanded rail. Registered in the CAPTURE phase
     so a menu Escape is settled before journey/ui.js's own Escape handler can
     act on a popover or card behind it. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuIsOpen) { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if (touchOpen || hotOpen) { e.preventDefault(); collapse(); }
  }, true);

  /* ------------------------------------------------------------------ */
  /* PER FRAME                                                           */
  /* ------------------------------------------------------------------ */
  let revealed = false;          // the one-way latch — see the header note
  let shown = null;
  let nowId = null;
  let activeId = null;
  let dimmed = null;

  /* ---- the cluster's angles ----------------------------------------------
     One UNWRAPPED angle per slot, in degrees. Unwrapped is the whole point:
     the stylesheet interpolates `--ang` linearly, so the number written here
     is what decides WHICH WAY ROUND THE BUTTON an item travels, and a value
     folded back into [-360, 0) every time would make that choice for us — and
     make it wrong exactly once per rotation, sending the slot that leaves the
     head of the path back across the button instead of on round it.

     Each shift takes the SHORT way to the new cell, which is also the
     consistent way: when the active section advances by one, every item's
     ring index drops by one, so slot 2 -> slot 1 is +90, every other
     neighbour step is +45, and the item leaving slot 1 wraps to the tail —
     +135 through the two overflow cells, clockwise, the same direction as
     everything else. One rotation, no item crossing the middle.

     While the cluster is FOLDED the stylesheet pins `--ang` to 0 for every
     slot (they are all stacked behind the current mark, where an angle has no
     meaning), so the value written here is invisible and is re-canonicalised
     instead of accumulated. That is what keeps an unfold from spinning
     through whole revolutions a visitor never saw wound up. */
  const angleOf = CHAPTERS.map(() => 0);
  const PILL = pillClearance(CHAPTERS.length);
  // The button sits in the middle of row 0 and its own pill has to clear
  // whatever grew to its left, exactly as a slot's does. Constant — the hub is
  // the one cell that never changes row — so it is written once.
  menuBtn.style.setProperty('--pill', String(PILL.menu));
  let curIndex = 0;
  let turnTimer = 0;

  function writeAngles(cur) {
    curIndex = cur;
    const n = CHAPTERS.length;
    const live = expanded();
    slots.forEach((s, i) => {
      const k = ((i - cur) % n + n) % n;
      const cell = RING[k] || RING[RING.length - 1];
      if (!live) angleOf[i] = cell[2];
      else {
        let d = (cell[2] - angleOf[i]) % 360;
        if (d > 180) d -= 360;
        else if (d <= -180) d += 360;
        angleOf[i] += d;
      }
      s.li.style.setProperty('--ang-to', angleOf[i] + 'deg');
      s.li.style.setProperty('--ring', String(k));
      s.li.style.setProperty('--col', String(cell[0]));
      s.li.style.setProperty('--row', String(cell[1]));
      s.li.style.setProperty('--pill', String(PILL.slot[k] || 0));
    });

    /* THE NAMES SIT OUT THE TURN. A pill names the mark it hangs off, and for
       the length of a rotation no mark is anywhere in particular — every one
       of them is mid-flight between two cells, and a label tracking a glyph
       across the face of the button is reading out a position rather than
       naming a thing. So the pills are simply out while the ring turns.
       What this is NOT (measured 2026-08-12, and worth recording because the
       first build claimed the opposite): Chrome does re-hit-test :hover when
       the layout moves under a stationary pointer. Held still on slot 1
       through connect -> owned, the pill went out, and came back reading
       OWNED — the section that had arrived under the cursor — not a stale
       CONNECT carried round to the far side. The suppression is therefore
       cosmetic, covering the transit, not a correctness fix; the 460ms is
       sized to outlast the 420ms angle transition and nothing more. */
    if (live) {
      root.classList.add('j-rail-turn');
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => root.classList.remove('j-rail-turn'), 460);
    }
  }

  function update(p, { modalDetail = false } = {}) {
    if (p > SHOW_P) revealed = true;

    const show = revealed;
    if (show !== shown) { root.classList.toggle('on', show); shown = show; }

    // Which scene is on screen (the resting symbol, and the fan's anchor) and
    // which nav entry reads current (the marked one). They differ only in a
    // nav-less chapter.
    const nowNext = chapterAt(p).id;
    if (nowNext !== nowId) {
      nowId = nowNext;
      const cur = CHAPTERS.findIndex(c => c.id === nowId);
      // The fan is anchored on the current slot: --cur positions every other
      // slot relative to it, --d is each slot's distance for the stagger.
      root.style.setProperty('--cur', String(cur));
      slots.forEach((s, i) => {
        s.li.classList.toggle('now', s.id === nowId);
        s.li.style.setProperty('--d', String(Math.abs(i - cur)));
      });
      // ...and the same move stated as a rotation, for the cluster geometry.
      writeAngles(cur);
      // The PANEL's list marks the chapter you are actually in — it follows
      // `now`, not `active`, because it is the one surface that can name the
      // epilogue, and Owned -> Final changes `now` without changing `active`.
      for (const id in menuLinks) {
        if (id === nowId) menuLinks[id].setAttribute('aria-current', 'true');
        else menuLinks[id].removeAttribute('aria-current');
      }
    }
    // With all five slots linked (THE EPILOGUE), the marked entry and the
    // scene on screen are the same statement: `aria-current` and the reticle
    // follow chapterAt(p) — the rail itself can now say "you are in the
    // epilogue", as the panel always could. (navChapterAt, which held the
    // last NAV'D chapter current through the epilogue, served the four-link
    // rail; nothing here needs it any more.)
    if (nowNext !== activeId) {
      activeId = nowNext;
      for (const s of slots) {
        const on = s.id === activeId;
        s.li.classList.toggle('active', on);
        if (on) s.item.setAttribute('aria-current', 'true');
        else s.item.removeAttribute('aria-current');
      }
    }

    // A modal detail claims the frame: the rail leaves the tab order and the
    // a11y tree until it is closed — and, because the detail CARD stands on
    // this same right flank, it steps back visually too. Not while the MENU
    // is open — the menu sets root.inert itself, and it is the rail's own
    // dialog.
    if (!menuIsOpen) {
      const want = !modalDetail;
      if (root.inert === want) root.inert = !want;
    }
    if (modalDetail !== dimmed) {
      dimmed = modalDetail;
      root.classList.toggle('dim', modalDetail);
    }
  }

  return {
    root, menu, update,
    /** QA */
    get menuOpen() { return menuIsOpen; },
    get expanded() { return expanded(); },
    get resting() { return nowId; },
    get current() { return activeId; },
    openMenu, closeMenu, collapse,
  };
}
