// journey-v6 — the DOM layer: persistent nav, chapter copy, detail cards and
// hotspot proxies. Everything is BUILT AT BOOT, i.e. after the hero's entry
// choreography has finished and journey.js has been lazy-loaded, so the hero's
// own first paint, TTI and Mission screenshot are untouched by construction:
// none of these nodes exist while the hero is settling.
//
// Copy comes from content/content.js and nowhere else (13-content-ops.md
// CO-2.2: one content source governs everything). The Mission chapter is the
// exception by design - its copy is the hero's OWN DOM (06-mission-
// preservation.md), so this module fades that block rather than duplicating it.

import { CONTENT } from '../content/content.js';
import { createFooter } from './ui-footer.js';
import { claimInput, releaseInput } from './scroll.js';
import { CHAPTERS, navChapterAt } from './route.js';
import {
  COPY_BANDS, COPY_FADE_P,
  COPY_OUT_K, COPY_IN_K, COPY_SETTLE_LO, COPY_SETTLE_HI,
  COPY_TRAVEL_LO, COPY_TRAVEL_HI,
  HOTSPOT_STAGGER_MS, HOTSPOT_IN_K, HOTSPOT_OUT_K,
} from './constants.js';

/* --------------------------------------------------------------------------
   NOTE (a11y debt #1, closed): W4-E shipped a module-scope keydown guard here
   that listed `.j-nav, .j-hot, .j-card, .j-footer, .j-foot-cue` and stole
   Space back from core/scroll.js's travel binding by registering ahead of it.
   It worked, and it was a symptom fix: a hard-coded list of class names in
   this module about a decision made in that one, silently order-dependent on
   scroll.attach() running later, and wrong for every control it did not name.

   It is gone. core/scroll.js now dispatches keys CONTROLS-FIRST using platform
   semantics (a focused <button> owns Space, a scrollable ancestor owns the
   scrolling keys, text entry owns everything) and honours an input-ownership
   registry — `claimInput` / `releaseInput`, imported above — for regions that
   handle their own wheel/touch/keys. The dialog card registers itself while
   open; that one call replaces the guard AND is what lets a bottom sheet
   scroll internally under a window-capture preventDefault.
   -------------------------------------------------------------------------- */

const reduceMotion = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener() {} };

/* Bottom-sheet condition (PL-1.3): a coarse pointer, or a viewport too narrow
   for the desktop side card. Live — a hybrid laptop that starts a session with
   a mouse and continues with a finger re-evaluates on the next open, and an
   orientation change re-evaluates immediately. */
const sheetQuery = typeof matchMedia === 'function'
  ? matchMedia('(pointer: coarse), (max-width: 720px)')
  : { matches: false, addEventListener() {} };

// Must outlast the .j-card opacity transition in journey/site.css (0.3s) so the
// fade can actually play before the element is pulled out of the box tree.
const CARD_FADE_MS = 340;

const CHAPTER_POSITION = {
  inspire: 'pos-bottom',
  connect: 'pos-left',
  owned: 'pos-topcentre',
  final: 'pos-upperleft',
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function smoothA(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/* --------------------------------------------------------------------------
   LABEL POLICY (hotspot registration contract, W4-F)

   By default a hotspot's chip — dot + text — is part of the resting
   composition: it is visible whenever the hotspot is, and hover/focus only
   brighten it. That is right for page furniture (Inspire's three callouts,
   Connect's structures, Owned's three ownership pods carrying the claims).

   It is wrong for a FIELD of people. Sixteen contributor chips standing over
   sixteen faces is a tag cloud, not a colony; the faces, embers and strands
   are the composition and the tag is the answer to a question the visitor
   asked by pointing at someone. So a registration may ask for a chip that
   only exists while the node is HOT:

       ui.addHotspot({ id, chapter, world, label, labelOnHover: true })

   and — because a chapter does not always own its own registrar (journey.js
   registers from `nodeIds` and is read-only in this lane) — the identical
   per-node flag is reachable from the CHAPTER CONTRACT:

       chapterModule.labelPolicy(nodeId)
         -> { labelOnHover: true, label: 'Name · Role' }   // hover-only chip
         -> null | undefined                               // default, untouched

   Resolved lazily (window.journey publishes its chapter modules after
   registration), per node, once. No chapter or node id appears in this file:
   any chapter can adopt it, and a chapter that never grows the method keeps
   exactly the behaviour it has today.

   `hot` is already the union of hover, keyboard focus and the touch-armed
   state (see the touch-model note below), so keying the chip off it gives
   focus/touch parity for free — the same rule that lights the dot reveals
   the label.
   -------------------------------------------------------------------------- */
const LABEL_POLICY_STYLE_ID = 'j-hot-label-policy';

function ensureLabelPolicyStyles() {
  if (typeof document === 'undefined' || document.getElementById(LABEL_POLICY_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = LABEL_POLICY_STYLE_ID;
  // Injected rather than authored in the page stylesheet so the behaviour ships with
  // the contract that defines it. Specificity is one class above the base
  // `.j-hot:is(:hover, .hot, :focus-visible)` treatment, so the hot state
  // wins in both directions. The chip's chrome (pill, dot, text) fades as
  // ONE object on the same 0.3s the rest of the hotspot uses; the button box
  // itself keeps its size and hit area, so a hover target never moves or
  // resizes as its label arrives.
  s.textContent = [
    '.j-hot.label-hover { background: transparent; }',
    '.j-hot.label-hover > * { opacity: 0; transition: opacity 0.3s; }',
    '.j-hot.label-hover:is(:hover, .hot, :focus-visible) { background: rgba(18, 12, 4, 0.6); }',
    '.j-hot.label-hover:is(:hover, .hot, :focus-visible) > * { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) { .j-hot.label-hover > * { transition: none; } }',
  ].join('\n');
  document.head.appendChild(s);
}

function bandOpacity(p, band) {
  if (!band) return 0;
  const { lo, hi } = band;
  if (p <= lo - COPY_FADE_P || p >= hi + COPY_FADE_P) return 0;
  const inLo = lo <= -1 ? 1 : Math.min(1, Math.max(0, (p - (lo - COPY_FADE_P)) / COPY_FADE_P));
  const inHi = hi >= 2 ? 1 : Math.min(1, Math.max(0, ((hi + COPY_FADE_P) - p) / COPY_FADE_P));
  const a = Math.min(inLo, inHi);
  return a * a * (3 - 2 * a);
}

export function createUI({ onNav, onOpen, onClose, isDetailOpen }) {
  /* ---------------- persistent nav ---------------- */
  // Rendered into the hero's own <nav>, between the wordmark and the 2RP /
  // Discord pair, and styled like it. Hidden at p = 0 so the Mission
  // composition is byte-identical to the hero; it fades in with the first
  // travel and is then persistent for the rest of the journey.
  // It is a real <nav> landmark with its own label (PL-2.1): nesting inside
  // the hero's <nav> is valid and means the journey's chapter list is named
  // and reachable by landmark navigation without editing any hero markup.
  const navHost = document.querySelector('.ui nav');
  const navWrap = el('nav', 'j-nav');
  navWrap.setAttribute('aria-label', 'Journey chapters');
  // Hidden at the Mission pose is an OPACITY state, and opacity 0 is still
  // focusable — before W4-E the very first Tab on the untouched hero landed on
  // four invisible chapter links. `inert` makes the visual and the hit/tab
  // model agree; it is released the moment the nav fades in.
  navWrap.inert = true;
  const navLinks = {};
  for (const c of CHAPTERS) {
    if (!c.nav) continue;                       // Final has no nav entry (v6)
    const a = el('a', 'j-navlink', c.nav);
    a.href = `#/${c.id}`;
    a.dataset.chapter = c.id;
    a.addEventListener('click', (e) => { e.preventDefault(); onNav(c.id); });
    navWrap.appendChild(a);
    navLinks[c.id] = a;
  }
  if (navHost) navHost.insertBefore(navWrap, navHost.querySelector('.nav-cta'));

  // The canvas is presentational: every word it carries also exists in the DOM
  // built by this module (PL-2.1 / PS-5.2). Set at journey boot rather than in
  // the hero markup, which is frozen — and it has no visual effect at all.
  const stage = document.getElementById('stage');
  if (stage) stage.setAttribute('aria-hidden', 'true');

  // The hero's world-tracked callouts are a Mission-pose composition that
  // journey.js fades to opacity 0 as travel starts (its `heroFurniture` loop).
  // Their <a class="tag"> tags stayed tabbable at every chapter, so the tab
  // order carried three invisible links everywhere. Mirror the fade the same
  // way the nav does — visual state and tab order agree, nothing moves.
  const calloutsEl = document.querySelector('.callouts');

  /* ---------------- chapter copy ---------------- */
  const copyHost = el('div', 'j-copy');
  document.body.appendChild(copyHost);
  const blocks = {};
  for (const c of CHAPTERS) {
    const data = CONTENT.chapters[c.id];
    if (!data || c.id === 'mission') continue;   // Mission is the hero's own DOM
    const b = el('div', `j-block ${CHAPTER_POSITION[c.id] || 'pos-left'}`);
    b.dataset.chapter = c.id;
    b.appendChild(el('h2', 'j-h', data.heading));
    if (data.sub) b.appendChild(el('p', 'j-sub', data.sub));
    if (data.claims) {
      const ul = el('ul', 'j-claims');
      // Ride-through #2: the in-scene ownership pods are gone — the DOM claim
      // blocks are now the single home of the claims, and they host the
      // handoff's claim pulses: hovering the primary sends one broad slow wave
      // through the whole colony, the secondaries answer locally.
      const TRIG = ['claimPrimary', 'claimMonthly', 'claimSplit'];
      data.claims.forEach((cl, ci) => {
        const li = el('li', `j-claim ${cl.tier}`);
        li.appendChild(el('span', 'j-claim-t', cl.text));
        if (cl.detail) li.appendChild(el('span', 'j-claim-d', cl.detail));
        li.addEventListener('pointerenter', () => {
          const mod = window.journey && window.journey.chapters && window.journey.chapters[c.id];
          if (mod && typeof mod.trigger === 'function') mod.trigger(TRIG[ci] || 'claimPrimary');
        });
        ul.appendChild(li);
      });
      b.appendChild(ul);
    }
    copyHost.appendChild(b);
    blocks[c.id] = b;
  }
  const heroBlock = document.querySelector('.ui .hero');

  /* ---------------- hotspot proxies ---------------- */
  const hotHost = el('div', 'j-hotspots');
  document.body.appendChild(hotHost);
  const hotspots = [];

  /* ---- the touch model (PL-1.2 / handoff) ----------------------------------
     "On touch, first tap focuses a node and reveals the desktop hover state;
     second tap opens the detail state."

     A mouse has a hover state to reveal before you commit; a finger does not,
     so on touch the FIRST tap buys that state and the second acts on it. The
     branch is decided per INTERACTION from the live pointerType, never from a
     capability sniff at boot — a laptop with a touchscreen must give its mouse
     the one-click behaviour and its finger the two-tap behaviour in the same
     session, sometimes seconds apart.

     `click` carries no pointerType, so the type is recorded on the pointerdown
     that precedes it and consumed by the click. A keyboard activation has no
     preceding pointerdown, so it reads as null and opens immediately — Enter
     and Space stay one-press, as PL-2.2 requires.

     The armed node keeps its lit state even though a touch pointer fires
     pointerleave the moment the finger lifts; hover, focus and arm are three
     independent reasons for the same visual, OR'd together. */
  let armed = null;                 // the touch-focused hotspot, or null

  function clearArmed(except = null) {
    if (armed && armed !== except) { armed.armed = false; armed.refresh(); }
    if (armed !== except) armed = null;
  }

  // Tap anywhere that is not a hotspot clears the focus state — including the
  // canvas, whose tap handling (organism.js, journey input policy) is unaffected (this listener
  // observes, never cancels).
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !armed) return;
    if (e.target instanceof Node && hotHost.contains(e.target)) return;
    clearArmed();
    if (document.activeElement && hotHost.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, { capture: true });

  /* ---- label policy plumbing (see the note at module scope) ---- */
  let policyPending = false;

  function applyLabelPolicy(h, pol) {
    if (!pol) return;
    if (typeof pol.label === 'string' && pol.label) {
      h.label = pol.label;
      h.labelEl.textContent = pol.label;
    }
    h.labelOnHover = !!pol.labelOnHover;
    h.btn.classList.toggle('label-hover', h.labelOnHover);
    // AT parity (the whole point): the chip may be invisible for most of its
    // life, the ACCESSIBLE NAME never is. A screen reader hears the same
    // "Name · Role" a pointer reveals, at rest and while hot alike. Set for
    // every policied node, hover-only or not, so the name is stated rather
    // than inherited from text whose visibility this file is now changing.
    h.btn.setAttribute('aria-label', h.label);
    if (h.labelOnHover) ensureLabelPolicyStyles();
  }

  /** Ask each chapter module, once, what it wants for its own nodes.
   *  window.journey (and with it the chapter modules) is published AFTER
   *  registration, so this runs from the frame loop until it can succeed. */
  function resolveLabelPolicies() {
    const mods = (typeof window !== 'undefined' && window.journey) ? window.journey.chapters : null;
    if (!mods) return;                       // not published yet — try next frame
    let left = false;
    for (const h of hotspots) {
      if (h.policyDone) continue;
      const mod = mods[h.chapter];
      if (!mod) { left = true; continue; }   // chapter not mounted yet
      h.policyDone = true;
      if (typeof mod.labelPolicy === 'function') applyLabelPolicy(h, mod.labelPolicy(h.id));
    }
    policyPending = left;
  }

  /** Register a named node. `world()` returns a THREE.Vector3 or null.
   *  Registration order within a chapter is the label stagger order.
   *  `labelOnHover` (optional) opts this node into the hover-only chip — see
   *  the LABEL POLICY note above; a chapter can set the same flag per node
   *  through its own `labelPolicy(id)`. */
  function addHotspot({ id, chapter, label, world, labelOnHover }) {
    const stagger = hotspots.filter(h => h.chapter === chapter).length;
    const btn = el('button', 'j-hot');
    btn.type = 'button';
    btn.dataset.node = id;
    btn.dataset.chapter = chapter;
    btn.setAttribute('aria-haspopup', 'dialog');
    // a11y debt #5: the hotspot is the disclosure control for its card, so it
    // must say whether that card is currently showing. Set here so the state
    // exists from the first render, not only after the first open.
    btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(el('i', 'j-hot-dot'));
    const labelEl = el('span', 'j-hot-label', label);
    btn.appendChild(labelEl);

    const h = {
      id, chapter, btn, world, stagger, a: 0, armAt: null, sup: false,
      hover: false, focused: false, armed: false, hot: false,
      pointer: null,      // pointerType of the gesture in flight
      label, labelEl,
      labelOnHover: false,
      // a registration that states the flag outright is already resolved; one
      // that says nothing asks its chapter, once, on the next frame.
      policyDone: labelOnHover !== undefined,
    };
    if (labelOnHover !== undefined) applyLabelPolicy(h, { labelOnHover });
    else policyPending = true;
    // one visual, three reasons — see the touch-model note above
    h.refresh = () => {
      const on = h.hover || h.focused || h.armed;
      if (on === h.hot) return;
      h.hot = on;
      btn.classList.toggle('hot', on);
      if (h.onHot) h.onHot(on);
    };

    btn.addEventListener('pointerdown', (e) => { h.pointer = e.pointerType || 'mouse'; });
    btn.addEventListener('click', () => {
      const via = h.pointer;
      h.pointer = null;
      if (via === 'touch' && armed !== h) {
        // first tap: take the focus state, show it, and stop.
        clearArmed(h);
        armed = h;
        h.armed = true;
        h.refresh();
        btn.focus({ preventScroll: true });
        return;
      }
      // Enter and Space are a <button>'s NATIVE activation keys — Enter has
      // always synthesised a click here, so the old explicit keydown handler
      // fired onOpen twice for it. Space now arrives here too, because
      // scroll.js's controls-first dispatch leaves it to the focused button.
      onOpen(id, btn);
    });

    // A touch pointerenter fires at finger-down and pointerleave at lift, so
    // these are the mouse's channel; `armed` is the finger's.
    btn.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      h.hover = true; h.refresh();
    });
    btn.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      h.hover = false; h.refresh();
    });
    btn.addEventListener('focus', () => { h.focused = true; h.refresh(); });
    btn.addEventListener('blur', () => {
      h.focused = false;
      if (h.armed) { h.armed = false; if (armed === h) armed = null; }
      h.refresh();
    });
    hotHost.appendChild(btn);
    hotspots.push(h);
    return h;
  }

  /* ---------------- detail card ---------------- */
  // A real modal dialog: role + aria-modal + a title that labels it, focus
  // moved in on open, TRAPPED while open, and returned to the trigger on close
  // (PL-2.2). aria-modal only tells the truth if the trap exists, which is why
  // W3-A left it 'false'; the trap below is what earns the 'true'.
  const card = el('aside', 'j-card');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.hidden = true;
  // The grab handle for the bottom-sheet form (PL-1.3). Purely a pointer
  // affordance — the keyboard's route out is Escape and the close button — so
  // it is hidden from AT rather than announced as a mystery control.
  const cardGrip = el('div', 'j-card-grip');
  cardGrip.setAttribute('aria-hidden', 'true');
  const cardClose = el('button', 'j-card-x', '✕');
  cardClose.type = 'button';
  cardClose.setAttribute('aria-label', 'Close');
  const cardBody = el('div', 'j-card-body');
  card.appendChild(cardGrip);
  card.appendChild(cardClose);
  card.appendChild(cardBody);
  document.body.appendChild(card);
  cardClose.addEventListener('click', () => onClose());
  let returnFocus = null;
  let cardIsOpen = false;       // the TRUTH; `card.hidden` lags it by one fade
  let fadeTimer = null;

  /* a11y debt #5: a polite live region. Retargeting an open card (one hotspot
     straight to the next) replaces the dialog's contents while focus is
     already inside it — no focus move, so nothing is announced and a screen
     reader user is silently reading the wrong node. This says what happened.
     It is only used for the retarget/no-trigger cases; a normal open moves
     focus into the dialog, which announces itself. */
  const live = el('div', 'j-live');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  document.body.appendChild(live);
  let liveTimer = null;
  function announce(msg) {
    if (liveTimer) clearTimeout(liveTimer);
    live.textContent = '';           // a repeat of identical text is silent
    liveTimer = setTimeout(() => { live.textContent = msg; liveTimer = null; }, 60);
  }

  // Focus trap. The card's own controls are the whole world while it is open,
  // so Tab cycles inside it instead of walking out into a nav the dialog has
  // just declared inert. Shift+Tab wraps the other way.
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !cardIsOpen) return;
    const items = [...card.querySelectorAll('a[href], button:not([disabled])')]
      .filter(n => n.offsetParent !== null || n === cardClose);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || !card.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !card.contains(at))) { e.preventDefault(); first.focus(); }
  });

  /* ---------------- bottom sheet: drag to dismiss (PL-1.3) ----------------
     Pointer-driven, so it is one code path for finger, pen and (on a hybrid
     machine) mouse. The sheet follows the pointer 1:1 while dragging — direct
     manipulation, not decorative motion — and the RELEASE is where
     prefers-reduced-motion is honoured: the spring back / slide out becomes an
     instant snap, because that is the part that is animation rather than the
     visitor's own hand.

     Dismissal is distance OR flick velocity, so a short sharp swipe works and
     a slow drag that changes its mind does not. */
  let drag = null;

  function endDrag(dismiss) {
    card.classList.remove('dragging');
    card.style.transform = '';
    drag = null;
    if (dismiss) onClose();
  }

  cardGrip.addEventListener('pointerdown', (e) => {
    if (!card.classList.contains('sheet') || !cardIsOpen) return;
    if (e.button != null && e.button > 0) return;
    drag = {
      id: e.pointerId, y0: e.clientY, dy: 0,
      t0: performance.now(), h: card.getBoundingClientRect().height || 1,
    };
    card.classList.add('dragging');
    try { cardGrip.setPointerCapture(e.pointerId); } catch { /* not captured: the window listeners below still see it */ }
    e.preventDefault();
  });
  cardGrip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y0);      // downward only
    card.style.transform = `translateY(${drag.dy.toFixed(1)}px)`;
  });
  const finishDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = Math.max(1, performance.now() - drag.t0);
    const flick = drag.dy / dt;                       // px per ms
    endDrag(drag.dy > drag.h * 0.28 || (flick > 0.55 && drag.dy > 44));
  };
  cardGrip.addEventListener('pointerup', finishDrag);
  cardGrip.addEventListener('pointercancel', (e) => {
    if (drag && e.pointerId === drag.id) endDrag(false);
  });

  /* ---------------- chapter SELECTION hook (W4-E) ----------------
     Hover already reaches the geometry: journey.js gives every hotspot an
     `onHot` that calls the owning chapter's setHot(id, on), so a pointer or a
     focus lights the real node. Selection had no such path — chapters
     implement a selected state (Owned's ember-rim treatment, via
     owned-portraits' setSelected) and nothing in the live journey ever called
     it. This is the symmetric half of setHot.

     One pair of calls covers every path because journey.js funnels ALL opens
     through openCard() and ALL closes through closeCard(): pointer click,
     Enter/Space, deep link (placeAt -> openDetail), hashchange/Back
     (handleRoute), Escape, and the scroll-intent close. Nothing else needs to
     know about selection.

     Chapter modules are reached the same way the footer reaches travel —
     through window.journey's public handle — because journey.js is read-only
     in this lane and does not pass them to createUI(). */
  let selectedNode = null;

  function chapterModuleFor(nodeId) {
    const h = hotspots.find(x => x.id === nodeId);
    const mods = (typeof window !== 'undefined' && window.journey) ? window.journey.chapters : null;
    return h && mods ? mods[h.chapter] || null : null;
  }

  function notifySelect(nodeId, on) {
    const mod = chapterModuleFor(nodeId);
    if (!mod) return;
    // Preferred: the chapter contract's own per-node setter, exactly mirroring
    // setHot(id, on). Chapters should grow this.
    if (typeof mod.setSelected === 'function') { mod.setSelected(nodeId, on); return; }
    // Bridge, until they do: chapters/owned.js already returns its `portraits`
    // field, and that field implements an index-based setSelected that had no
    // caller. This branch retires itself the moment the contract method lands.
    const pf = mod.portraits;
    if (pf && typeof pf.setSelected === 'function' && typeof pf.indexOf === 'function') {
      const idx = pf.indexOf(nodeId);
      if (idx >= 0) pf.setSelected(on ? idx : -1);
    }
  }

  /** a11y debt #5: exactly the hotspot whose card is showing reports expanded.
   *  Driven off `selectedNode`, so it is correct for every open path — click,
   *  key, deep link, hashchange — not just the ones that pass a trigger. */
  function syncExpanded() {
    for (const h of hotspots) {
      h.btn.setAttribute('aria-expanded', h.id === selectedNode ? 'true' : 'false');
    }
  }

  function openCard(nodeId, trigger) {
    const node = CONTENT.nodes[nodeId]
      || CONTENT.contributors.find(c => c.id === nodeId);
    if (!node) return false;
    const retarget = cardIsOpen;
    const d = node.spotlight || node.card
      // contributor rows have no card block: everyone is the anonymous ember
      // fallback until the consent pipeline lands (CO-1.4 / OW-4.4)
      || (node.role ? { title: node.name, body: [node.role, node.blurb] } : null)
      || { title: node.label, body: [node.short] };
    cardBody.textContent = '';
    const h = el('h3', 'j-card-h', d.title || node.label);
    h.id = 'j-card-h';
    cardBody.appendChild(h);
    card.setAttribute('aria-labelledby', 'j-card-h');
    if (d.claim) cardBody.appendChild(el('p', 'j-card-claim', d.claim + (d.claimDetail ? ' — ' + d.claimDetail : '')));
    for (const para of (d.body || [])) cardBody.appendChild(el('p', 'j-card-p', para));
    if (d.status) cardBody.appendChild(el('p', 'j-card-status', d.status));
    if (d.link) {
      const a = el('a', 'j-card-link', d.link.label);
      a.href = d.link.href || '#';
      cardBody.appendChild(a);
    }
    // A close that is still fading owns neither the DOM nor the input.
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    // The bottom-sheet decision is taken per OPEN, from the live pointer /
    // viewport condition — the same per-interaction rule as the touch model.
    card.classList.toggle('sheet', sheetQuery.matches);
    card.classList.remove('dragging');
    card.style.transform = '';
    if (cardBody.scrollTop) cardBody.scrollTop = 0;
    card.hidden = false;
    card.inert = false;
    cardIsOpen = true;
    // A card arriving from `hidden` (display:none) has no rendered start state
    // for the opacity transition to run FROM. Force ONE synchronous style
    // flush, then add `.open` in the same tick — deferring to rAF instead
    // would make the card's visibility depend on the frame loop, and a
    // throttled or background tab would open a dialog that never paints.
    void card.offsetHeight;
    card.classList.add('open');
    // While it is open the card owns its own wheel, touch and travel keys:
    // internal scrolling works despite scroll.js's window-capture
    // preventDefault, a finger on the sheet can never scrub the journey, and
    // arrows neither travel nor close it (a11y debt #1).
    claimInput(card, { modal: true });
    // a touch-armed hotspot has been acted on; the frame belongs to the card
    clearArmed();
    // retargeting an open card (one hotspot straight to the next) must release
    // the previous node before lighting the new one
    if (selectedNode && selectedNode !== nodeId) notifySelect(selectedNode, false);
    selectedNode = nodeId;
    notifySelect(nodeId, true);
    syncExpanded();
    // a retarget keeps the ORIGINAL trigger as the focus return only if the
    // new open supplied none (a deep link / hashchange); an explicit trigger
    // always wins, so Escape lands on the control the visitor last used.
    returnFocus = trigger || returnFocus;
    cardClose.focus();
    // Focus does not MOVE on a retarget (it was already inside the dialog) and
    // there is nothing to move it from on a deep link, so neither case
    // announces itself. Say what is now showing (a11y debt #5).
    if (retarget || !trigger) announce(`${d.title || node.label}. Details.`);
    return true;
  }

  /* a11y debt #4: closeCard used to remove `.open` and set `hidden` in the
     same tick. `[hidden]` is display:none, so the element left the box tree
     before a single frame of the 0.3s opacity transition could run — the fade
     was authored, paid for in CSS, and never once seen. The visual close is
     now allowed to play, and `hidden` follows it. Everything that makes the
     card FUNCTIONALLY closed (input ownership, tab order, a11y tree,
     selection, focus return) still happens on the same tick, so nothing can
     ever interact with a ghost. */
  function finishClose() {
    fadeTimer = null;
    if (cardIsOpen) return;                 // reopened mid-fade: leave it alone
    card.hidden = true;
    card.style.transform = '';
    card.classList.remove('sheet', 'dragging');
  }

  function closeCard() {
    if (!cardIsOpen) return;
    cardIsOpen = false;
    card.classList.remove('open');
    releaseInput(card);
    if (drag) { drag = null; card.classList.remove('dragging'); }
    if (selectedNode) { notifySelect(selectedNode, false); selectedNode = null; }
    syncExpanded();
    // inert BEFORE the focus return: a fading card is out of the tab order and
    // out of the a11y tree from the first frame of the fade.
    card.inert = true;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
    // Reduced motion has no fade to protect (journey/site.css drops the transition),
    // so it closes on the tick, exactly as before.
    if (reduceMotion.matches) finishClose();
    else fadeTimer = setTimeout(finishClose, CARD_FADE_MS);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cardIsOpen) { e.preventDefault(); onClose(); }
  });

  /* ---------------- post-epilogue footer (PS-5.1) ---------------- */
  const footer = createFooter({
    focusNav: (id) => { const a = navLinks[id]; if (a && !navWrap.inert) a.focus(); },
  });

  /* ---------------- per-frame ---------------- */
  let navShown = false;

  // W3-B (gap e): copy choreography. The COPY_BANDS say WHERE copy may live;
  // this layer decides WHEN. Copy releases the moment travel begins (fast
  // temporal fade driven by scrub speed, even inside its own band) and
  // re-anchors only once the camera has settled — a slow breathe-in gated on
  // |dp/dt|, so a fast pass through a rest never flashes its copy, and a
  // deliberate arrival gets its text only after the composition has made its
  // negative space. dt === 0 (deep-link placement / hidden-tab capture) snaps
  // straight to the target so captures are deterministic.
  const eased = { mission: 0 };
  for (const id in COPY_BANDS) eased[id] = 0;
  let lastP = null;
  let pSpeed = 0;             // smoothed |dp/dt|, p per second

  function update(p, chapterId, camera, dt = 0) {
    // one-shot, on the first frame the chapter modules are reachable
    if (policyPending) resolveLabelPolicies();
    // nav: hidden at the hero rest, persistent from the first travel on
    const show = p > 0.004;
    if (show !== navShown) { navWrap.classList.toggle('on', show); navShown = show; }
    // A nav-less chapter (the Final epilogue) keeps the last nav'd chapter
    // lit — derived from the manifest, not a hardcoded id pair (route.js).
    const active = navChapterAt(p);
    for (const id in navLinks) {
      const on = id === active;
      navLinks[id].classList.toggle('active', on);
      // the class is the paint; aria-current is what a screen reader hears
      if (on) navLinks[id].setAttribute('aria-current', 'true');
      else navLinks[id].removeAttribute('aria-current');
    }
    const detailNow = isDetailOpen();
    // invisible nav, or a modal dialog claiming the frame: out of the tab order
    const navLive = show && !detailNow;
    if (navWrap.inert === navLive) navWrap.inert = !navLive;
    // hero callouts follow journey.js's own fade of them (see construction)
    if (calloutsEl) {
      const cLive = p <= 0.01;
      if (calloutsEl.inert === cLive) calloutsEl.inert = !cLive;
    }

    if (dt > 0 && lastP !== null) {
      pSpeed += (Math.abs(p - lastP) / dt - pSpeed) * Math.min(1, dt * 5);
    } else if (dt === 0) {
      pSpeed = 0;             // placed, not travelled
    }
    lastP = p;
    // moving fast releases copy even inside its band; arriving slow lets it in
    const travelHold = 1 - smoothA((pSpeed - COPY_TRAVEL_LO) / (COPY_TRAVEL_HI - COPY_TRAVEL_LO));
    const settled = 1 - smoothA((pSpeed - COPY_SETTLE_LO) / (COPY_SETTLE_HI - COPY_SETTLE_LO));

    for (const id in eased) {
      const target = bandOpacity(p, COPY_BANDS[id]) * travelHold;
      let s = eased[id];
      if (dt === 0) s = target;
      else if (target < s) s += (target - s) * Math.min(1, dt * COPY_OUT_K);
      else s += (target - s) * Math.min(1, dt * COPY_IN_K * settled);
      if (s < 0.001 && target === 0) s = 0;
      eased[id] = s;
      if (id === 'mission') {
        if (heroBlock) {
          heroBlock.style.opacity = s;
          heroBlock.style.pointerEvents = s > 0.5 ? '' : 'none';
          // pointer-events already left; visibility is the same statement for
          // the keyboard and for AT (the hero CTA was focusable and readable at
          // every chapter). '' at the Mission pose = the untouched hero.
          heroBlock.style.visibility = s > 0.002 ? '' : 'hidden';
        }
      } else if (blocks[id]) {
        blocks[id].style.opacity = s;
        blocks[id].style.visibility = s > 0.002 ? 'visible' : 'hidden';
      }
    }

    // hotspots: they belong to the RESTING composition, so they follow the
    // eased copy state (never the raw band), arrive AFTER the copy has
    // re-anchored, one per HOTSPOT_STAGGER_MS in narrative order (gap g),
    // and never show while a detail is open (the frame belongs to the detail)
    const detail = detailNow;
    const now = performance.now();
    for (const h of hotspots) {
      const gate = eased[h.chapter] || 0;
      let want = gate > 0.72 && !detail;
      let w = want ? h.world() : null;
      let sx = 0, sy = 0;
      if (w) {
        const v = w.clone().project(camera);
        // behind the camera, or too near the frame edge to carry a readable
        // label without clipping
        if (v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.9) {
          w = null;
        } else {
          sx = (v.x * 0.5 + 0.5) * window.innerWidth;
          sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
          // The chapter's editorial copy owns its area of the frame: a
          // hotspot that projects into it is suppressed rather than drawn on
          // top of the text. Hit model stays honest - a suppressed hotspot is
          // also removed from the tab order, so keyboard and pointer agree.
          // W3-B: the test has HYSTERESIS (enter at +8 px, leave at +26 px) —
          // the organism's ambient sway moves projections a few px per
          // second, and a single margin made borderline labels strobe.
          const cb = blocks[h.chapter];
          if (cb && cb.style.visibility === 'visible') {
            const r = cb.getBoundingClientRect();
            const m = h.sup ? 26 : 8;
            h.sup = sx > r.left - m && sx < r.right + m && sy > r.top - m && sy < r.bottom + m;
            if (h.sup) w = null;
          } else h.sup = false;
        }
      }
      want = want && !!w;
      if (want) {
        if (h.armAt === null) h.armAt = now + h.stagger * HOTSPOT_STAGGER_MS;
        if (dt === 0) h.a = 1;
        else if (now >= h.armAt) h.a += (1 - h.a) * Math.min(1, dt * HOTSPOT_IN_K);
        h.btn.style.transform = `translate(${sx}px, ${sy}px)`;
      } else {
        h.armAt = null;
        if (dt === 0) h.a = 0;
        else { h.a += (0 - h.a) * Math.min(1, dt * HOTSPOT_OUT_K); if (h.a < 0.02) h.a = 0; }
      }
      const vis = h.a > 0.015;
      h.btn.style.opacity = h.a;
      h.btn.classList.toggle('vis', vis);
      // Roving tab order: exactly the hotspots of the chapter at rest, in
      // narrative registration order, are tabbable. Off-chapter, suppressed
      // (behind copy), off-frame, mid-fade or detail-open hotspots all leave.
      // tabIndex is the live half; `.j-hot:not(.vis)` is visibility:hidden, so
      // a faded hotspot is out of the a11y tree as well as out of Tab.
      h.btn.tabIndex = want && vis ? 0 : -1;
      if (want && vis) h.btn.removeAttribute('aria-hidden');
      else h.btn.setAttribute('aria-hidden', 'true');
    }

    // the footer belongs to the end-hold; the cue rides the epilogue copy
    footer.update(p, eased.final || 0);
  }

  // An orientation change or a window resize across the 720px line while a
  // card is open re-forms it in place rather than leaving a side card on a
  // phone-width viewport until the next open.
  if (typeof sheetQuery.addEventListener === 'function') {
    sheetQuery.addEventListener('change', () => {
      if (cardIsOpen) card.classList.toggle('sheet', sheetQuery.matches);
    });
  }

  return {
    update, addHotspot, openCard, closeCard, footer,
    get cardOpen() { return cardIsOpen; },
    /** QA: is the card currently in its bottom-sheet form? */
    get cardIsSheet() { return card.classList.contains('sheet'); },
    /** QA: the touch-armed (first-tap) hotspot id, or null. */
    get armedNode() { return armed ? armed.id : null; },
    card,
    hotspots,
  };
}
