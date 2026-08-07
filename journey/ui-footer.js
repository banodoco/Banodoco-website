// journey-v6 — the post-epilogue footer (11-product-systems.md PS-5.1, and
// 10-chapter-final.md FN-3.2: "a conventional footer follows: plain-text
// links, social, contact, legal, crawlable index").
//
// WHERE IT LIVES IN THE JOURNEY
// -----------------------------
// The epilogue rest is p = 0.925 (Final spans 0.85..1.00, rest at mid-chapter).
// p = 1 is the authored END-HOLD, and core/scroll.js already treats it as a
// resolution anchor of its own — RESOLVE_P = [...rests, 1] — so idling anywhere
// past the epilogue rest commits either back to 0.925 or forward to 1.0 and
// never parks between them. That gives the footer a free, honest mechanic:
//
//   * at the epilogue rest (0.925) the footer does not exist — no DOM in the
//     a11y tree, nothing in the tab order, nothing over the composition;
//   * the reveal band 0.955..0.992 is only ever a TRAVEL state, because the
//     commit rule cannot leave you idle inside it (COMMIT_THRESHOLD 0.35 of
//     the 0.925..1.0 span = 0.951, so any forward idle from there resolves to
//     1.0). The footer is therefore either absent or fully present at rest.
//   * so "scroll past the final rest" lands you on the footer, and Home/End
//     (core/scroll.js key model) reach it too.
//
// Discoverability is not left to that alone: a small plain-text cue rides in
// with the epilogue copy and is the keyboard-reachable route to the footer.
// It flies (never jumps) to the end-hold, then hands focus to the footer's
// first link — so a keyboard visitor who has read the epilogue can Tab once
// and press Enter to arrive in the document, rather than having to guess that
// the End key exists.
//
// Everything here is REAL DOM built from content/content.js (CO-2.2: one
// content source). '#' placeholder hrefs are carried through as-is per D10.
//
// FILE BOUNDARY: this module owns only .j-footer and .j-foot-cue. It reaches
// the journey through window.journey's PUBLIC handle (journey.js is read-only
// in this lane) and never touches the hero region.

import { CONTENT } from '../content/content.js';
import { claimInput, releaseInput } from './scroll.js';
import { CHAPTERS, TERMINAL_P, restProgress } from './route.js';

// Reveal band, in absolute journey progress — anchored to the route's final
// rest and the terminal end-hold (M4), shipped values 0.955 / 0.992. Both
// edges sit above the commit threshold (0.951) so the band is unreachable as
// an idle state.
export const FOOTER_LO = restProgress('final') + 0.030;
export const FOOTER_HI = TERMINAL_P - 0.008;

// Above this the footer is a live document: focusable, exposed to AT.
// Below it the element is inert, so a footer caught mid-travel can never
// swallow a Tab press or be announced while it is a ghost.
const FOOTER_LIVE = 0.6;
const RISE_PX = 18;

const reduceMotion = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/** How much of the footer is present at `p`, 0..1. Pure in p — no state, no
 *  time — so a reverse scrub retires it through exactly the values it arrived
 *  on, which is the house law for anything the camera can be scrubbed past.
 *
 *  Exported because the epilogue COPY has to know: the footer rises over the
 *  same lower band of the frame the `pos-bottomleft` block occupies, and until
 *  the 2026-08-07 mobile pass the two simply overlapped — the block stayed at
 *  full opacity underneath a 0.95-alpha panel and read through it as ghost
 *  text. journey/ui.js multiplies the epilogue block by the same retirement
 *  curve the CUE already used (see `update`), so the copy, its cue and the
 *  footer are one composition handing over to another rather than two layers
 *  competing for the same pixels. */
export function footerAmountAt(p) {
  if (p <= FOOTER_LO) return 0;
  if (p >= FOOTER_HI) return 1;
  const t = (p - FOOTER_LO) / (FOOTER_HI - FOOTER_LO);
  // reduced motion: a state change, not a rise
  return reduceMotion.matches ? (t >= 0.5 ? 1 : 0) : smooth01(t);
}

/** The factor the epilogue copy (and its cue) are scaled by as the footer
 *  arrives. One expression, one home: the cue has always used it and the
 *  block now shares it, so they can never retire at different rates. */
export function epilogueRetire(p) { return 1 - smooth01(footerAmountAt(p) * 2.5); }

function linkList(cls, label, items) {
  const ul = el('ul', cls);
  ul.setAttribute('aria-label', label);
  for (const it of items || []) {
    const li = el('li');
    const a = el('a', null, it.label);
    a.href = it.href || '#';
    li.appendChild(a);
    ul.appendChild(li);
  }
  return ul;
}

/**
 * @param {object} o
 * @param {(chapterId: string) => void} o.focusNav  hand focus back to the
 *        persistent chapter nav when a footer deep link takes the camera away
 *        (the footer goes inert under it, and a silently lost focus is a
 *        keyboard dead end).
 */
export function createFooter({ focusNav = null } = {}) {
  const F = CONTENT.footer || {};

  /* ---------------- the footer itself ---------------- */
  const root = el('footer', 'j-footer');
  root.setAttribute('aria-label', 'Site footer');
  root.hidden = true;
  root.inert = true;

  const wrap = el('div', 'j-foot-wrap');
  root.appendChild(wrap);

  const h = el('h2', 'j-foot-h', 'Banodoco');
  h.id = 'j-foot-h';
  root.setAttribute('aria-labelledby', 'j-foot-h');
  wrap.appendChild(h);

  const cols = el('div', 'j-foot-cols');
  wrap.appendChild(cols);

  // 1. chapter deep links. Real hrefs: #/<chapter> is the journey's own route
  // scheme (adr-d6), so these work with JS routing AND as plain anchors.
  const chapNav = el('nav', 'j-foot-nav');
  chapNav.setAttribute('aria-label', 'Journey chapters');
  const chapList = el('ul', 'j-foot-links');
  for (const c of CHAPTERS) {
    if (!c.nav) continue;                       // Final has no nav entry (v6)
    const li = el('li');
    const a = el('a', null, (CONTENT.chapters[c.id] || {}).nav || c.nav);
    a.href = `#/${c.id}`;
    a.dataset.chapter = c.id;
    a.addEventListener('click', () => {
      // The hashchange router takes the camera off the end-hold, which makes
      // this very element inert a frame later. Move focus to the persistent
      // nav entry for the chapter we just asked for.
      if (focusNav) setTimeout(() => focusNav(c.id), 0);
    });
    li.appendChild(a);
    chapList.appendChild(li);
  }
  chapNav.appendChild(chapList);
  cols.appendChild(chapNav);

  // 2. ecosystem / contact, 3. social — straight from content.js
  cols.appendChild(linkList('j-foot-links', 'Banodoco links', F.links));
  cols.appendChild(linkList('j-foot-links', 'Community', F.social));

  // 4. the accessible, crawlable index (PS-5.1 / PL-2.1). NOT a reduced-motion
  // redirect — automatic routing to the static tier is decision D11 and is
  // deliberately not wired here. This is a link a person chooses to follow.
  const note = el('p', 'j-foot-note');
  note.appendChild(document.createTextNode('Every chapter, every node and every link on this page also exists as a plain HTML document with no WebGL: '));
  const staticLink = el('a', null, 'the static journey');
  // Page-relative, not module-relative: this <a href> resolves against the
  // DOCUMENT's URL when a user clicks it, not against this module's URL. The
  // module lives in journey-v6/core/ but the page it renders into is the
  // promoted site root (see journey-v6-plan/15-merge-and-architecture.md M1),
  // so a bare 'static/' would resolve to /static/ instead of
  // /journey-v6/static/. Resolve it off import.meta.url instead, which
  // survives future directory renames the way a hand-written prefix would not.
  staticLink.href = new URL('../static/', import.meta.url).href;
  note.appendChild(staticLink);
  note.appendChild(document.createTextNode('.'));
  wrap.appendChild(note);

  // 5. legal
  if (F.legal) wrap.appendChild(el('p', 'j-foot-legal', F.legal));

  document.body.appendChild(root);

  /* ---------------- the rest-side cue ---------------- */
  const cue = el('button', 'j-foot-cue');
  cue.type = 'button';
  cue.hidden = true;
  cue.inert = true;
  cue.appendChild(el('span', 'j-foot-cue-t', 'Site information'));
  cue.appendChild(el('i', 'j-foot-cue-arr'));
  document.body.appendChild(cue);

  let pendingFocus = false;

  function reveal() {
    const j = typeof window !== 'undefined' ? window.journey : null;
    pendingFocus = true;
    if (!j) return;
    // Reduced motion gets the end-hold placed, not travelled.
    if (reduceMotion.matches || !j.journey || !j.journey.flyTo) j.scrollTo(1);
    else j.journey.flyTo(1);
  }
  cue.addEventListener('click', reveal);

  /* ---------------- per-frame ---------------- */
  let shown = null;        // footer: hidden?
  let live = null;         // footer: interactive?
  let cueShown = null;
  let cueLive = null;
  let lastA = 0;

  const amountFor = footerAmountAt;      // module scope; see the note there

  function firstFocusable() {
    return root.querySelector('a[href], button:not([disabled])');
  }

  /**
   * @param {number} p        journey progress
   * @param {number} finalCopy eased opacity of the epilogue copy block — the
   *                          cue belongs to that composition, so it arrives and
   *                          leaves with it rather than on a band of its own.
   */
  function update(p, finalCopy = 0) {
    const a = amountFor(p);
    lastA = a;
    root.style.opacity = a;
    root.style.transform = reduceMotion.matches || a >= 1
      ? '' : `translateY(${((1 - a) * RISE_PX).toFixed(2)}px)`;

    const wantShown = a > 0.002;
    if (wantShown !== shown) { root.hidden = !wantShown; shown = wantShown; }

    // The cue is settled BEFORE the footer, so that a footer retiring under
    // the visitor's own focus has somewhere real to hand it to in the same
    // frame — the cue is the way back in, and landing there beats landing on
    // <body> at the top of the document.
    // `epilogueRetire` is this expression's home now — the epilogue COPY is
    // scaled by the identical factor in journey/ui.js, so the cue can never
    // outlive the block it belongs to.
    const ca = finalCopy * epilogueRetire(p);
    cue.style.opacity = ca;
    const cueWant = ca > 0.02;
    if (cueWant !== cueShown) { cue.hidden = !cueWant; cueShown = cueWant; }
    const cueWantLive = ca > 0.6;
    if (cueWantLive !== cueLive) {
      if (!cueWantLive && document.activeElement === cue) cue.blur();
      cue.inert = !cueWantLive;
      cueLive = cueWantLive;
    }

    const wantLive = a >= FOOTER_LIVE;
    if (wantLive !== live) {
      if (!wantLive && root.contains(document.activeElement)) {
        // going inert under the visitor's own focus: hand it somewhere real
        if (!cue.hidden && !cue.inert) cue.focus();
        else if (document.activeElement) document.activeElement.blur();
      }
      root.inert = !wantLive;
      live = wantLive;
    }
    if (!wantLive) pendingFocus = pendingFocus && a > 0.002;
    else if (pendingFocus) {
      const t = firstFocusable();
      if (t) t.focus();
      pendingFocus = false;
    }

    syncOwnership();
  }

  /* ---------------- internal scrolling on short viewports ----------------
     `max-height: 62vh` plus `overflow-y: auto` says the footer scrolls itself
     when the document does not fit — and it could not. core/scroll.js takes
     wheel and touch at WINDOW CAPTURE and preventDefault()s them, so on a
     short viewport (a small phone, a landscape phone, a half-height window)
     the legal line and the last row of links were simply unreachable: the
     gesture did nothing at all, because at the end-hold there is nowhere left
     to travel either.

     The fix is the same input-ownership registry the dialog card uses, with
     one deliberate difference: this is claimed NON-modal, and only while the
     footer actually has somewhere to scroll. Non-modal keeps Home/End/arrows
     working as journey controls inside the footer (it is a region of the
     page, not a dialog), and the overflow test means that when the footer
     fits — the common case — a gesture over it still belongs to the journey
     and can travel back out of the end-hold. */
  let owns = false;
  function syncOwnership() {
    const need = !!live && !root.hidden && root.scrollHeight - root.clientHeight > 1;
    if (need === owns) return;
    if (need) claimInput(root); else releaseInput(root);
    owns = need;
  }

  return {
    update, reveal, el: root, cue,
    get amount() { return lastA; },
    get live() { return !!live; },
  };
}
