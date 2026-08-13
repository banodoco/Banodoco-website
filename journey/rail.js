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
// RESTING — ONE control, hugging the right edge: the menu button, wearing the
//   current section as a small circular bubble on its upper-left shoulder.
//   "When the navigation is not being hovered, the control should remain very
//   compact. There should be a small circular current-section icon associated
//   with the menu button ... so there is still some indication of the current
//   section without exposing the whole navigation." The bubble is that
//   indication and nothing more: in ring geometry it is not a pointer target,
//   and the compact control answers a pointer as one 56px button.
//
// EXPANDED — hover anywhere on the control, keyboard focus, or a first touch.
//   IT IS A SEQUENCE, NOT AN EXPAND (the brief is explicit about the order):
//
//     1. the bubble PEELS AWAY to the left, growing to full size as it goes,
//        and lands in the one position it will hold from then on — the slot
//        immediately left of the button;
//     2. only ONCE IT HAS ARRIVED do the others emerge from it, fading up as
//        they travel out of the spot it now occupies;
//     3. they settle around it on a loose circle, curving above and below.
//
//   The stages are one clock: stage 2 is stage 1's duration written as a
//   transition-delay (site.css), so "once it reaches that position" is a
//   structural fact rather than a number tuned to look like one.
//
//   The ring OPENS FROM THE WHOLE CONTROL's hover, after a dwell. The first
//   build opened from the list alone, because the fan used to slide the menu
//   button down to hold the foot of a stack and pointing at the button moved
//   it out from under its own click. Nothing slides the button any more — it
//   is the fixed hub — so the separation has no job left, and the brief asks
//   for the broader trigger ("when the navigation is not being HOVERED").
//   The 120ms dwell is kept: it is what stops a pointer merely crossing the
//   flank from unfolding anything.
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
   THE RING (Hannah, 2026-08-13) — the current section is a SLOT, not an item
   ===========================================================================
   "The current section must always end up immediately to the left of the menu
    button ... the current section icon should first move smoothly out to the
    left of the menu button. Once it reaches that position, the other section
    icons should emerge from around/below it ... Previous/upcoming sections
    should then arrange themselves around the current item in a loose circular
    or ring-like structure, flowing above and below it. As the user scrolls
    through sections, this ring should rotate/update smoothly, while the
    current section continues to occupy the fixed position immediately left of
    the menu."

   This SUPERSEDES the L-shaped cluster of 2026-08-12 (`e5bdc69`): that
   geometry hung the sections off the button in a 3x3 block, and the active
   one sat directly ABOVE the button. Here the active one sits immediately
   LEFT of it and never moves again — everything else turns around it.

   THE GEOMETRY IS ONE CIRCLE, and the whole component is two numbers on it.

     the hub      is the menu button, pinned to the right edge of the
                  viewport. It does not move in any state — not on unfold,
                  not on fold, not on a chapter change.

     the slot     is the fixed position immediately left of the hub. It is a
                  POSITION, not an item: whichever chapter is current occupies
                  it, and a chapter change is the ring turning underneath it.

     the ring     is the circle whose RIGHTMOST POINT IS THAT SLOT — i.e. its
                  centre is one radius further left. So `angle 0` is the slot,
                  and every other section sits at a multiple of 360/n around
                  the same circle: at five chapters, +-72deg and +-144deg,
                  which reads as two above and two below, curving away to the
                  left. Nothing is ever placed to the RIGHT of the current
                  item, which is what keeps the ring clear of the hub.

   Positions are therefore polar and the ONE animated quantity is the angle:

     x = rad * cos(ang) - rad     relative to the slot (so ang 0 -> x 0)
     y = rad * sin(ang)           positive is DOWN

   Advancing a chapter subtracts one step from every item's angle, so the ring
   turns as one body: the upcoming section rises from below into the slot and
   the outgoing one lifts away above it — the same direction of travel as the
   scroll that caused it. The item at the slot has angle 0 and is the turn's
   fixed point by construction; it is not special-cased anywhere.

   The angles rail.js writes are UNWRAPPED (see `writeAngles`), which is what
   makes each step take the short way round instead of unwinding across the
   middle of the ring. */
const N = CHAPTERS.length;
const STEP = 360 / N;

/** The signed ring offset of the slot `k` places past the current one:
 *  0, +-1, +-2 ... so the manifest's order reads as "two before, two after"
 *  around the circle rather than as a one-way queue. */
function signedRing(k) { return k > N / 2 ? k - N : k; }

/* ---- the radius, derived from the tile and the manifest --------------------
   Neighbours on the ring are `2 rad sin(180/n)` apart, so the radius that
   keeps a given amount of air between two tiles falls straight out of the
   chapter count. AIR is generous on purpose — "a LOOSE circular or ring-like
   structure" — and RAD_MIN is the floor the five-chapter ring actually ships
   at, chosen by eye (see 25-navigation-redux.md) and not by this formula:
   at n = 5 the formula asks for 63px and the ring reads better at 68.

   RAD_MIN is also load-bearing for the NAMES. The current item's pill hangs
   directly off its own mark (see PILLX), and the tiles nearest its row are
   the +-2 ones at `sin(144deg) * rad` above and below; the pill is ~11px
   half-height and the tile 24px, so the pill only clears them while
   `0.588 * rad > 35`, i.e. rad > 60. Shrinking the ring below that would
   silently put the label the visitor sees most back on top of a drawing. */
const TILE = 48;
const AIR = 26;
const RAD_MIN = 68;
const RAD_MAX = 120;      // past this the ring is wider than a phone: fall back
const RAD = Math.max(RAD_MIN, (TILE + AIR) / (2 * Math.sin(Math.PI / N)));

/** A ring index's x, relative to the current slot (0 for the current one). */
function ringX(k) {
  return RAD * Math.cos(signedRing(k) * STEP * Math.PI / 180) - RAD;
}

/* ---- how far each NAME PILL has to be held off -----------------------------
   A pill hangs off the LEFT of the tile it names, so on a ring it would be
   drawn straight over whatever sits further round. Two rules, and the second
   is the one the 2026-08-12 pass paid for:

     every other item   is held off to the ring's own left edge, so the pills
                        land on ONE vertical line rather than following the
                        curve — a list of names, which is what they are.

     the current item   is NOT, because nothing on the ring shares its row
                        (that is what RAD_MIN buys) and it is the pill a
                        visitor sees most: it is the active section, and it is
                        the mark the pointer is nearest when the ring opens.
                        Pushed out to the ring edge it read as floating in the
                        frame rather than as belonging to its own drawing.

   In px, and derived, so a sixth chapter needs no edit here. */
const PILLX = (() => {
  const xs = [];
  for (let k = 0; k < N; k++) xs.push(ringX(k));
  const xMin = Math.min(...xs);
  return xs.map((x, k) => (k === 0 ? 0 : x - xMin));
})();

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
  // ...and the RING geometry is the same statement in polar form. The radius
  // is derived from the chapter count (see RAD), so a sixth chapter widens the
  // circle rather than crowding it, and only a manifest big enough to make the
  // ring wider than a phone falls back to the column the component already
  // knows how to be. At the shipped tile and air that is eleven chapters.
  root.style.setProperty('--cl-rad', RAD.toFixed(2) + 'px');
  if (RAD > RAD_MAX) root.classList.add('j-rail-column');
  const isColumn = root.classList.contains('j-rail-column');

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

       hover     JS-managed (`.j-rail-hot`), not the container's `:hover`,
                 because the DWELL is the point: entering opens only after
                 HOT_INTENT_MS, so a pointer merely crossing the flank on its
                 way somewhere else never unfolds anything. That guard is
                 kept exactly as it shipped.
                 WHAT CHANGED (2026-08-13): the trigger is the whole control
                 (`.j-rail-inner`), not the section list alone. The list-only
                 trigger existed because the opening fan slid the menu button
                 down to hold the foot of the stack, and a pointer transiting
                 the current mark on its way to the button moved the button
                 out from under the aimed click (measured 2026-08-09). In ring
                 geometry the button is the hub and does not move in any
                 state, so that failure cannot happen and the separation has
                 no job left — while the brief asks for the broader reading,
                 "when the navigation is not being HOVERED". Leaving the whole
                 control closes; an open ring survives the pointer travelling
                 anywhere across it, the button included.
                 On the COLUMN fallback the old trigger is kept verbatim: that
                 geometry still slides its button, so it still needs it.
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

  /* The expanded rail is announced on <body> (2026-08-07 mobile pass):
     journey/site.css steps the chapter copy and the hotspot chips back while
     the rail is held open over them — and that rule lives inside
     `@media (pointer: coarse), (max-width: 720px)`, so it can only ever fire
     on a frame narrow enough for the control to be standing on the copy.

     IT NOW FOLLOWS THE HOVER STATE AS WELL AS THE TOUCH ONE (2026-08-13).
     It was touch-only because the geometry it was written for was a 52px
     column, which at a phone width is the only way the rail is ever open —
     hover does not exist there. The ring changed that: a hover-capable window
     at 375 opens a 184px circle straight across the frame, and shot at that
     size the chapter copy and the action row ran right through it. (That row
     was the Learn-more / Remix pair when this was written; Remix left the
     copy for the crown on 2026-08-13 — the row is still there and the rule
     still reaches it.) Same mechanism, same 0.14, same transition; the only
     change is that
     the class now tracks BOTH the states JS owns. Above 720px there is no
     rule for it to reach, so nothing on a desktop moves. */
  function announceOpen() {
    document.body.classList.toggle('j-rail-on', touchOpen || hotOpen);
  }

  function collapseTouch() {
    if (!touchOpen) return;
    touchOpen = false;
    root.classList.remove('j-rail-open');
    announceOpen();
  }

  function collapse() {
    collapseTouch();
    clearTimeout(hotTimer);
    if (hotOpen) {
      hotOpen = false;
      root.classList.remove('j-rail-hot');
    }
    announceOpen();
  }

  /* THE FOLD NEEDS NO RE-CANONICALISATION any more, and that is a property of
     the ring rather than an omission. The cluster pinned every folded slot's
     angle to 0 (they stacked behind one mark, where an angle had no meaning),
     so an accumulated turn had to be spent on the fold or the next unfold
     would animate through whole revolutions the visitor never saw wound up.
     Here the angle is never pinned: it is multiplied by `--u`, the unfold
     amount, so at rest it is simply not in the picture, and it is already
     correct when `--u` leaves zero. Unfolding therefore animates ONE thing —
     the travel and the unfurl — with the ring already reading true, and
     `writeAngles` is free to keep accumulating for as long as the page lives.
     (Deleted with it: `foldedSync`, and the focusout tick it needed.) */

  // The whole control opens the ring — but only the list does on the column
  // fallback, whose button still slides. See EXPANSION above.
  const hotZone = isColumn ? list : inner;
  hotZone.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || hotOpen) return;
    // Dwell before unfolding — see the header note. A pointer that is only
    // crossing the flank is gone well inside HOT_INTENT_MS.
    clearTimeout(hotTimer);
    hotTimer = setTimeout(() => {
      hotOpen = true;
      root.classList.add('j-rail-hot');
      announceOpen();
    }, HOT_INTENT_MS);
  });
  hotZone.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
  });
  // Leaving the whole control folds an open ring. (On the column fallback this
  // is the second listener it has always had: the list cancels a pending
  // unfold, the control folds an open one.)
  inner.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
    lastPt = null;
    syncAt();
    if (!hotOpen) return;
    hotOpen = false;
    root.classList.remove('j-rail-hot');
    announceOpen();
  });

  /* ===================================================================== */
  /* THE POINTER'S OWN TRUTH — `.at`                                        */
  /* ===================================================================== */
  /* `:hover` CANNOT BE TRUSTED IN THIS GEOMETRY, and that is a property of
     the ring, not a browser bug. Every mark is placed by `transform`, and a
     transform-only move does not make Chrome re-run its hit test: the hover
     state is recomputed from a pointer EVENT, and a rotation produces none.
     So when the ring turns under a stationary pointer, `:hover` stays on the
     element that has travelled AWAY and never lands on the one that has
     arrived.

     MEASURED 2026-08-13, pointer parked on the slot at (1352, 450), Connect
     -> Owned, no mouse movement at any point:

       before   connect  now=1  hover=1  at (1352,450)   pill 1.00
       after    connect  now=0  hover=1  at (1305,385)   pill 1.00   <- 80px away
                owned    now=1  hover=0  at (1352,450)   pill 0.00   <- under the cursor
       elementFromPoint(1352, 450) === owned

     i.e. the label CONNECT is drawn on a mark the pointer is nowhere near,
     while the mark it is actually on has none — and it stays that way until
     the pointer moves (a 1px nudge corrects it instantly: hover -> owned,
     pill 1.00).

     THIS CORRECTS THE RECORD. The 2026-08-12 cluster pass wrote the opposite
     down as a measured finding ("Chrome does re-hit-test :hover when the
     layout moves under a stationary pointer ... the pill went out, and came
     back reading OWNED"). What that measurement actually caught was the `.now`
     CLASS moving to Owned — a JS write, so `.j-rail-slot.now .j-rail-name`
     did read "Owned" — and not the pill being revealed. Its opacity was 0.
     The suppression that pass kept as "cosmetic cover for the transit" was
     therefore covering a real fault, not decorating one.

     THE FIX: the position of the pointer is a fact JS can read, so JS reads
     it. `.at` marks the slot the pointer is genuinely over, resolved by
     `elementFromPoint` from the last pointer position, and the stylesheet
     drives the name from `.at` rather than from `:hover` for the ring. It is
     re-resolved on every pointer move (where it simply agrees with `:hover`)
     and once more when a turn settles (where it does not). Nothing else about
     the hover model changes, and the column — whose `:hover` the touch path
     never consults — is untouched. */
  let lastPt = null;
  let atSlot = null;

  function syncAt() {
    let want = null;
    if (lastPt && expanded()) {
      const hit = document.elementFromPoint(lastPt.x, lastPt.y);
      const li = hit instanceof Element ? hit.closest('.j-rail-slot') : null;
      if (li && root.contains(li)) want = li;
    }
    if (want === atSlot) return;
    if (atSlot) atSlot.classList.remove('at');
    atSlot = want;
    if (atSlot) atSlot.classList.add('at');
  }

  inner.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPt = { x: e.clientX, y: e.clientY };
    syncAt();
  });

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || touchOpen) return;
    // The menu mark is the OTHER resting control: its first tap opens the
    // panel (see the menu's own pointerdown below), so it must not spend the
    // tap on arming the fan — and arming would slide the button out from
    // under the very tap that pressed it (measured 2026-08-09).
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    touchOpen = true;
    root.classList.add('j-rail-open');
    announceOpen();
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

  /* ---- the ring's angles ---------------------------------------------------
     One UNWRAPPED angle per slot, in degrees. Unwrapped is the whole point:
     the stylesheet interpolates `--ang` linearly, so the number written here
     is what decides WHICH WAY ROUND THE CIRCLE an item travels, and a value
     folded back into (-180, 180] every time would make that choice for us —
     and make it wrong exactly once per rotation, sending the item that leaves
     the bottom of the ring back up across the face of it instead of on round.

     Each step takes the SHORT way, which for a chapter change is also the
     consistent way: every item's ring index drops by one, so every item turns
     by exactly one step (72deg at five chapters) in the same direction, and
     the one wrapping from the tail to the head keeps going the same way. One
     rotation, nothing crossing the middle.

     The direction is not arbitrary. Advancing a chapter turns the ring so
     that the UPCOMING section rises from below into the slot and the outgoing
     one lifts away above it — the same direction of travel as the scroll that
     caused it, so the instrument agrees with the hand that moved it. */
  const angleOf = CHAPTERS.map(() => 0);
  let curIndex = 0;
  let turnTimer = 0;

  function writeAngles(cur) {
    curIndex = cur;
    const n = CHAPTERS.length;
    const live = expanded();
    slots.forEach((s, i) => {
      const k = ((i - cur) % n + n) % n;
      const to = signedRing(k) * STEP;
      let d = (to - angleOf[i]) % 360;
      if (d > 180) d -= 360;
      else if (d <= -180) d += 360;
      angleOf[i] += d;
      s.li.style.setProperty('--ang-to', angleOf[i].toFixed(2) + 'deg');
      s.li.style.setProperty('--ring', String(k));
      // Distance along the ring from the current item, for the stagger: the
      // pair either side of the slot emerges first, the pair beyond it next.
      s.li.style.setProperty('--step', String(Math.abs(signedRing(k))));
      s.li.style.setProperty('--pillx', PILLX[k].toFixed(1) + 'px');
    });

    /* THE NAMES SIT OUT THE TURN. A pill names the mark it hangs off, and for
       the length of a rotation no mark is anywhere in particular — every one
       of them is mid-flight around the circle, and a label tracking a glyph
       across the face of the ring is reading out a position rather than
       naming a thing. So the pills are simply out while the ring turns.
       What this is NOT (measured 2026-08-12, and worth recording because the
       first build claimed the opposite): Chrome does re-hit-test :hover when
       the layout moves under a stationary pointer. Held still on slot 1
       through connect -> owned, the pill went out and came back reading a
       stale CONNECT — carried round to the far side of the ring, 80px from
       the pointer, while the mark that had arrived under the cursor showed
       nothing. See THE POINTER'S OWN TRUTH above for the measurement that
       corrects the 2026-08-12 record. The suppression is therefore covering a
       real fault and not merely the transit: it holds the labels off for the
       whole turn, and `syncAt()` re-resolves which mark the pointer is on at
       the moment they are allowed back. The 500ms is sized to outlast the
       460ms angle transition and nothing more. */
    if (live) {
      root.classList.add('j-rail-turn');
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        root.classList.remove('j-rail-turn');
        // The marks have finished moving; the pointer has not. Re-read which
        // one it is over before the names are allowed back on screen.
        syncAt();
      }, 500);
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
