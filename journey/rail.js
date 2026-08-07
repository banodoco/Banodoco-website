// journey/rail.js — THE SIDE NAVIGATOR (Hannah, 2026-08-07).
//
//   "Could you replace the 'Mission / Inspire / Connect / Own' navigation at
//    the top with a more elegant section navigator positioned along the side
//    of the page? By default, it should display a simple symbol representing
//    the section the user is currently viewing ... When the user hovers over
//    it, the navigator should expand to reveal symbols for all of the main
//    sections ... The expanded state should also include a prominent menu
//    button ... It would effectively serve as the simpler, HTML-based version
//    of the journey."
//
// This module owns the whole thing: the rail, its three states, and the side
// menu. It replaces the `.j-nav` row that used to be built inside the hero's
// own <nav> (journey/ui.js), and the static tier carries a hand-authored twin
// of it (static/index.html) built from the same symbol source.
//
// ===========================================================================
// DERIVED, NOT LISTED
// ===========================================================================
// Nothing here names a chapter. The rail's slots come from route.js's CHAPTERS
// in manifest order; which of them is a LINK is decided by whether the
// manifest gave it a `nav`; which one reads current is `navChapterAt(p)`, the
// same derived rule the old nav used. A chapter added to ROUTE appears in the
// rail and in the menu without an edit here — that is the whole reason the
// manifest exists (route.js header).
//
// ===========================================================================
// THE THREE STATES
// ===========================================================================
// RESTING — one symbol, on the left flank, vertically centred: the mark for
//   `chapterAt(p)`, i.e. the scene actually on screen. Everything else in the
//   rail is opacity 0 and pointer-events none, so the only live surface is
//   that one 44px tile.
//
// EXPANDED — hover, keyboard focus, or a first touch. Every slot's symbol and
//   name arrives, the current one wearing the reticle brackets the hero's
//   callouts use, and the menu button arrives last. Nothing MOVES to get
//   there: the slots are laid out in their final positions at all times and
//   the resting state is simply the rest of them turned off, so the symbol the
//   visitor was already pointing at does not shift by a pixel when the rest
//   fade up around it. (See the motion note in journey/site.css.)
//
// MENU OPEN — a real modal dialog holding the overview: the site's own summary
//   line, every section with its heading, and the site's outbound links. All
//   of it out of content/content.js.
//
// ===========================================================================
// THE EPILOGUE
// ===========================================================================
// The Final chapter has a route and no nav entry, deliberately (route.js,
// 10-chapter-final.md); the last nav'd chapter stays current through it. Two
// consequences, both taken on purpose:
//
//   · the rail's LINKS and its `aria-current` are unchanged by the epilogue —
//     four links, Owned current, exactly what navChapterAt(p) says. A fifth
//     link would contradict the manifest.
//   · but the RESTING SYMBOL is `chapterAt(p)`, not the current nav entry, so
//     out in the field the rail shows the field. That is the literal reading
//     of the brief ("a simple symbol representing the section the user is
//     currently viewing"), and it is the one place the two rules differ. The
//     epilogue's slot is a plain <span>, not a link, and is aria-hidden: it is
//     a visual echo of where the camera is, and the a11y statement about the
//     epilogue is made properly in the MENU, which lists it as a real entry
//     and marks it current when you are in it.
//
// ===========================================================================
// p = 0 AND THE MISSION REFERENCE
// ===========================================================================
// The rail is invisible at the Mission pose and fades in with the first
// travel, as the old nav did, so static/captures/mission@* does not move.
// Two deliberate differences:
//
//   · the reveal LATCHES. The old nav keyed purely off `p > 0.004`, so
//     navigating BACK to Mission (whose rest is p = 0) took the whole nav off
//     the page — the visitor arrived somewhere with no way out but the browser.
//     A component whose brief is "always accessible" cannot do that. The latch
//     is set the first time p leaves the Mission pose and never cleared, so a
//     cold load at p = 0 is untouched and a RETURN to p = 0 keeps the rail.
//   · it is NOT inert at p = 0. The old nav was, to keep four invisible links
//     out of the first Tab (a11y debt #1). Here the rail's own `:focus-within`
//     brings it up, so the first Tab lands on something that is on screen by
//     the time it is focused — the skip-link pattern, not the invisible-target
//     bug. The captured frame has no focus, so it is unaffected.

import { CONTENT } from '../content/content.js';
import { CHAPTERS, chapterAt, navChapterAt } from './route.js';
import { buildSymbol } from './symbols.js';
import { claimInput, releaseInput } from './scroll.js';

/* Below this progress the page is the Mission pose and the rail stays dark.
   Same threshold the old nav used, kept so the fade-in reads identically. */
const SHOW_P = 0.004;

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

export function createRail({ onNav, announce = null } = {}) {
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------ */
  /* THE RAIL                                                            */
  /* ------------------------------------------------------------------ */
  // A real <nav> landmark with its own label. It is a sibling of the hero's
  // <nav> rather than a child of it (the old nav nested inside, which is why
  // it had to fight the hero's bare `nav {}` rule for its padding and its
  // entry animation). The hero's wordmark and its 2RP / Discord pair are
  // untouched — they keep the top rule to themselves.
  const root = el('nav', 'j-rail');
  root.setAttribute('aria-label', 'Journey sections');

  const inner = el('div', 'j-rail-inner');
  root.appendChild(inner);

  const list = el('ul', 'j-rail-list');
  inner.appendChild(list);

  const slots = [];      // { id, li, item, isLink }
  const links = {};      // chapterId -> <a>, for the nav'd chapters only

  CHAPTERS.forEach((c, i) => {
    const li = el('li', 'j-rail-slot');
    li.dataset.chapter = c.id;
    // The stagger index: the expansion fans out from the top of the rail on
    // the same per-item delay the hero's callouts boot on. Written as a custom
    // property so the whole choreography lives in the stylesheet.
    li.style.setProperty('--k', String(i));

    const isLink = !!c.nav;
    const item = el(isLink ? 'a' : 'span', 'j-rail-item');
    if (isLink) {
      item.href = `#/${c.id}`;
      item.dataset.chapter = c.id;
      item.addEventListener('click', (e) => { e.preventDefault(); collapse(); onNav(c.id); });
      links[c.id] = item;
    } else {
      // The epilogue echo — see THE EPILOGUE above.
      li.classList.add('j-rail-echo');
      li.setAttribute('aria-hidden', 'true');
    }

    const mark = el('span', 'j-rail-mark');
    mark.appendChild(buildSymbol(c.id));
    if (isLink) mark.appendChild(reticle());
    item.appendChild(mark);
    item.appendChild(el('span', 'j-rail-name',
      (CONTENT.chapters[c.id] || {}).nav || c.nav || 'Epilogue'));

    li.appendChild(item);
    list.appendChild(li);
    slots.push({ id: c.id, li, item, isLink });
  });

  /* ---- the menu button ---- */
  const menuBtn = el('button', 'j-rail-menu');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-haspopup', 'dialog');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-controls', 'j-menu');
  menuBtn.style.setProperty('--k', String(CHAPTERS.length));
  const menuMark = el('span', 'j-rail-mark');
  menuMark.appendChild(buildSymbol('menu'));
  menuBtn.appendChild(menuMark);
  menuBtn.appendChild(el('span', 'j-rail-name', 'Menu'));
  inner.appendChild(menuBtn);

  document.body.appendChild(root);

  /* ------------------------------------------------------------------ */
  /* THE SIDE MENU                                                       */
  /* ------------------------------------------------------------------ */
  /* CONTENT SOURCE. Every string below comes out of content/content.js and
     nothing is written here:

       lede        chapters.mission.sub — the site's own one-line summary. It
                   is the hero's support line and it is already the page's
                   <meta name="description"> in static/index.html, so it is the
                   sentence this site uses when it has to describe itself once.
       item title  chapters.<id>.nav
       item line   chapters.<id>.heading — one short statement per section,
                   which is exactly what an overview wants. The `sub`s are the
                   long form and belong to the chapters themselves.
       links       footer.links + footer.social

     TWO GAPS, FLAGGED RATHER THAN FILLED (see 23-side-navigator.md):
       · content.js has no dedicated site-overview string. mission.sub is
         re-used above; if Content/Ops wants a distinct one, it is one key.
       · chapters.final.nav is null BY DESIGN, so the epilogue's menu entry has
         no authored title. It is titled with the structural word "Epilogue",
         which is route.js's and 10-chapter-final.md's own word for it, not
         invented copy. Its heading and its route are real content. */
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
  for (const link of [...CONTENT.footer.links, ...CONTENT.footer.social]) {
    const li = el('li');
    const a = el('a', null, link.label);
    a.href = link.href || '#';
    li.appendChild(a);
    eul.appendChild(li);
  }
  elsewhere.appendChild(eul);
  menu.appendChild(elsewhere);
  document.body.appendChild(menu);

  /* ------------------------------------------------------------------ */
  /* EXPANSION                                                           */
  /* ------------------------------------------------------------------ */
  /* Hover and keyboard focus are handled in CSS (`:hover`, `:focus-within`),
     because both are states the browser already knows and neither needs a
     listener to be correct. `.j-rail-open` is the THIRD way in, for a pointer
     type that has no hover at all: on touch the first tap expands and the
     second acts, which is the model this site already uses for its hotspot
     chips (journey/ui.js, "the touch model"). Deciding it per INTERACTION from
     the live pointerType — never from a capability sniff at boot — is what
     lets a hybrid laptop give its mouse the one-click behaviour and its finger
     the two-tap behaviour in the same session. */
  let touchOpen = false;
  let swallowClick = false;

  function expanded() {
    return touchOpen || root.matches(':hover') || root.contains(document.activeElement);
  }

  function collapse() {
    if (!touchOpen) return;
    touchOpen = false;
    root.classList.remove('j-rail-open');
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || touchOpen) return;
    touchOpen = true;
    root.classList.add('j-rail-open');
    // The tap that opened the rail must not also follow the link under it.
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 500);
  }, true);

  root.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // A press anywhere else puts the rail back to one symbol. Passive observer —
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
    // The menu is tall and scrolls. Registering it means wheel and touch
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
     in front of you), then a touch-expanded rail. Registered in the CAPTURE
     phase so a menu Escape is settled before journey/ui.js's own Escape
     handler can act on a popover or card behind it. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuIsOpen) { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if (touchOpen) { e.preventDefault(); collapse(); }
  }, true);

  /* ------------------------------------------------------------------ */
  /* PER FRAME                                                           */
  /* ------------------------------------------------------------------ */
  let revealed = false;          // the one-way latch — see the header note
  let shown = null;
  let nowId = null;
  let activeId = null;

  function update(p, { modalDetail = false } = {}) {
    if (p > SHOW_P) revealed = true;

    const show = revealed;
    if (show !== shown) { root.classList.toggle('on', show); shown = show; }

    // Which scene is on screen (the resting symbol) and which nav entry reads
    // current (the marked one). They differ only in a nav-less chapter.
    const nowNext = chapterAt(p).id;
    if (nowNext !== nowId) {
      nowId = nowNext;
      for (const s of slots) s.li.classList.toggle('now', s.id === nowId);
      // The MENU's list marks the chapter you are actually in — it follows
      // `now`, not `active`, because it is the one surface that can name the
      // epilogue, and Owned -> Final changes `now` without changing `active`.
      for (const id in menuLinks) {
        if (id === nowId) menuLinks[id].setAttribute('aria-current', 'true');
        else menuLinks[id].removeAttribute('aria-current');
      }
    }
    const activeNext = navChapterAt(p);
    if (activeNext !== activeId) {
      activeId = activeNext;
      for (const s of slots) {
        if (!s.isLink) continue;
        const on = s.id === activeId;
        s.li.classList.toggle('active', on);
        if (on) s.item.setAttribute('aria-current', 'true');
        else s.item.removeAttribute('aria-current');
      }
    }

    // A modal detail claims the frame: the rail leaves the tab order and the
    // a11y tree until it is closed. Not while the MENU is open — the menu sets
    // root.inert itself, and it is the rail's own dialog.
    if (!menuIsOpen) {
      const want = !modalDetail;
      if (root.inert === want) root.inert = !want;
    }
  }

  return {
    root, menu, update,
    /** Hand focus to a chapter's rail entry (the footer's chapter links do
     *  this after a jump, because the control they were on goes inert). */
    focusChapter(id) {
      const a = links[id];
      if (a && !root.inert) a.focus();
    },
    /** QA */
    get menuOpen() { return menuIsOpen; },
    get expanded() { return expanded(); },
    get resting() { return nowId; },
    get current() { return activeId; },
    openMenu, closeMenu, collapse,
  };
}
