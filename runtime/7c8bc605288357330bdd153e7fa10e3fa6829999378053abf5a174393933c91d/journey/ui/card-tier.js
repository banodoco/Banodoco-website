/* ==================================================================== *
 * The CARD vessel: the disclosure that takes the frame.
 *
 * Same two tiers as the popover, one vessel up, and for the same reasons —
 * see `journey/ui/popover-tier.js`. The differences are the ones a bigger
 * box forces: the committed tier is a REAL modal (role, aria-modal, a focus
 * trap, `claimInput`), it is a bottom SHEET on a coarse pointer or a narrow
 * viewport, and its close is a fade the visitor is allowed to see.
 *
 * WHAT THIS OWNS. Eleven `let`s, all declared here, all written by this
 * module alone. `cardIsOpen` was the worst binding in the tree — nineteen
 * sibling closures of `createUI` wrote or read it — and it is the reason this
 * order exists: "is the card open" is one fact, and a fact with nineteen
 * authors is not owned by anyone.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN:
 *
 *   · THE DOM SHELL AND THE LIVE REGION. `createUI` builds both and hands
 *     them in. DOM construction order is observable — it is the document
 *     order the captures read and the record order the trace oracle compares
 *     — so the page's nodes are built in one place, in one sequence.
 *   · PLACEMENT. `place` is injected. Where a box goes on screen is a
 *     question about the frame's projection and the navigator's exclusion
 *     zone, which is layout's subject and not this vessel's; this module
 *     only knows WHICH node the box belongs to and WHEN to ask.
 *   · THE OTHER VESSEL, except to ask `popover.isPinned()` — the one
 *     question the rail release genuinely has to ask, because a pinned
 *     popover is route state that is NOT modal.
 *   · SELECTION AND FOCUS RETURN — see `journey/ui/selection.js`.
 *   · WHICH VESSEL A NODE USES. The content-derived choice (a `short` line or
 *     not) is the router's, in `journey/ui.js`. `mount` is reached only once
 *     that choice has been made, which is why it no longer begins by asking.
 * ==================================================================== */

import { CONTENT } from '../../content/content.js';
import { claimInput, releaseInput } from '../scroll.js';
import { createSheetGesture } from './sheet-gesture.js';
import { el } from './dom.js';

// The shared detail-surface exit is 170ms. Keep the vessel in the box tree a
// little longer so its last painted frame lands before teardown.
const CARD_FADE_MS = 190;
// A drag-dismissed sheet is also completing its existing 280ms direct-
// manipulation release. Let that physical slide finish even though the new
// shell fade has already gone dark.
const CARD_DRAG_FADE_MS = 320;

/**
 * @param {object}   deps
 * @param {object}   deps.shell        `createCard()`'s nodes, built by createUI
 * @param {object}   deps.owner        this vessel's owner-tree child (J04b)
 * @param {Array}    deps.hotspots     the live hotspot records
 * @param {object}   deps.hotState     the registry — `hottestCard` reads it
 * @param {object}   deps.reduceMotion live `prefers-reduced-motion`
 * @param {object}   deps.sheetQuery   live coarse-pointer / narrow-viewport
 * @param {object}   deps.rail         the side navigator (visibility + modal)
 * @param {object}   deps.selection    shared: the selected light + the commit
 * @param {object}   deps.focusReturn  shared: where focus goes back to
 * @param {object}   deps.popover      the sibling vessel — asked, never driven
 * @param {Function} deps.announce     the polite live region
 * @param {Function} deps.place        layout: put the box against this anchor
 * @param {Function} deps.onClose      journey.js's close door
 * @param {Function} deps.isDetailOpen journey.js's own detail predicate
 */
export function createCardTier({ shell, owner, hotspots, hotState, reduceMotion,
  sheetQuery, rail, selection, focusReturn, popover, announce, place: placeCard,
  onClose, isDetailOpen }) {
  const { card, grip: cardGrip, close: cardClose, body: cardBody } = shell;

  /** Ask layout for a placement against whichever node the box belongs to.
   *  The open test is the vessel's, the geometry is layout's. */
  function place() {
    if (!cardIsOpen) return;
    placeCard(cardAnchor);
  }
  /** The card-specific words and contact filament run while `.j-card-enter`
   *  is set. The shared shell's shorter `.j-detail-enter` lifetime ends from
   *  its own animationend, independently of this 0.62 s filament window. */
  const CARD_ENTER_MS = 700;

  let cardIsOpen = false;       // the TRUTH; `card.hidden` lags it by one fade
  let fadeTimer = null;

  /* ==========================================================================
     THE CARD'S TWO TIERS (2026-08-14, Hannah)
     ==========================================================================
     > "Remove the current separate hover state. The existing click state
     >  should become the hover state instead… available immediately when
     >  entering the section… On de-hover, return immediately to the default
     >  state. Clicking should no longer be required to reveal this state."

     The card was a single, MODAL tier: click to open, focus moved in and
     TRAPPED, `claimInput(card, { modal: true })`, and journey.js's `detail`
     state faded every chip out ("the frame belongs to the detail"). None of
     that can survive contact with a pointer: a panel that steals focus every
     time a mouse crosses a face is unusable, and a reveal that hides the
     sixteen chips would hide the very chip holding it open — the hover would
     destroy its own cause, one frame later, forever.

     So the card grows exactly the two tiers the POPOVER has had since e20f7ff,
     and for the same reasons. Nothing here is a new idea; it is the popover's
     contract applied one vessel up.

       TRANSIENT — pointer hover or keyboard focus. Driven by the same `hot`
       state that lights the chip, through syncCard(), so hover and focus get
       the identical reveal with nothing said about pointer type. It is NOT a
       dialog and does not claim to be one: `role`/`aria-modal`/`aria-labelledby`
       come off, the chip points at the panel's prose with `aria-describedby`
       (the popover's own mechanism), the box is `pointer-events: none` so it
       can never be the thing you are hovering, and it carries no controls at
       all — the ✕ is hidden, because de-hover is the close. Focus does not
       move. Input is not claimed, so the wheel still scrubs the journey
       underneath it. `journey.detail` is NOT set, which is what keeps the
       chips alive and the field hoverable.

       PINNED — click / Enter / Space / a deep link / an inbound route. The
       shipped modal contract, unchanged to the letter: `role="dialog"` +
       `aria-modal="true"`, focus to the ✕, the trap, `claimInput` modal,
       `aria-expanded` true on its chip, Escape closing and returning focus.

     WHICH NODES get the card at all is decided by CONTENT, not by id — the
     same split previewFor() already draws. A node with a `short` line
     discloses BESIDE its chip in the popover; a node without one (Owned's
     sixteen contributors, whose whole content is a name, a role and a blurb)
     discloses in the card. No chapter or node id appears in this file.

     WHAT DID NOT MOVE ONTO HOVER, and why:

       · `journey.detail` / `modalDetail`. See above — it is self-cancelling,
         and "the frame belongs to the detail" is a statement a transient
         reveal has no business making.
       · The focus trap, the focus move and the modal input claim. A trap with
         no deliberate act behind it is a trap the visitor never asked for and
         cannot predict; and a hover that claimed input would stop the page
         scrolling under a resting mouse.
       · `aria-expanded`. It tracks the COMMITTED state only (see `selection.setCommitted`
         in ui/selection.js), exactly as it does for the popover — a hover reveal is not a
         disclosure the visitor has opened.

     WHAT DID move onto hover, beyond the panel itself: the chapter's own
     SELECTED treatment (selection.reveal -> the chapter's setSelected, the ember-rim
     and strand response). Hannah asked for "the full current click-state
     treatment", and that light is part of it. It is the visual half of
     selection, so it rides the visual tier; `aria-expanded` is the semantic
     half, so it rides the committed one. */
  let cardPinned = false;       // committed, vs. a transient hover/focus reveal
  let cardNodeId = null;        // whose content is rendered in the box
  let cardDismissed = null;     // node whose card Escape (or a close) took away
  let cardDescIds = '';         // the prose ids the chip points `aria-describedby` at
  /* WHAT RE-ARMS A DISMISSED CARD, and why it is not simply "the chip goes
     cold" (which is the whole of the popover's rule).

     Closing a PINNED card hands the sixteen chips back on the same tick — they
     were `visibility: hidden` while the dialog owned the frame. Chrome
     recomputes pointer boundary events after that, so a pointer resting on the
     face it just closed receives a synthetic `pointerleave` + `pointerenter`
     pair with no movement behind it. Under the popover's rule that leave reads
     as "the visitor left the chip", clears the dismissal, and the enter one
     frame later puts the panel straight back: Escape closes a dialog and a
     hover reveal appears in its place, which is the same "Escape that visibly
     does nothing" popDismissed exists to prevent. The popover never meets this
     because its chips are never hidden.

     So a POINTER dismissal is re-armed by the pointer actually leaving the
     chip — tested against live hit geometry on a real `pointermove`, which a
     visibility change does not produce. A KEYBOARD dismissal has no pointer to
     test and is re-armed by the chip going cold, exactly as the popover's is. */
  let cardDismissBtn = null;    // the chip a POINTER dismissal is parked on, or null

  /** The CARD's own eligibility selector (2026-08-14) — the twin of the
   *  popover's `hottest()`, which stays with the popover. Same tie-break —
   *  the visitor's last action is the one they are waiting on — and the same
   *  content-derived eligibility, read the other way round: a chip with no
   *  `short` line has no popover to show, so what it discloses is its card.
   *  That selects Owned's sixteen contributors and nothing else in this build,
   *  without naming a chapter or a node id. */
  const hottestCard = () => hotState.hottest((h) => !h.preview);


  // Focus trap. The card's own controls are the whole world while it is open,
  // so Tab cycles inside it instead of walking out into a nav the dialog has
  // just declared inert. Shift+Tab wraps the other way.
  owner.listen(card, 'keydown', (e) => {
    // Only a COMMITTED card traps. A transient reveal holds no focus and has
    // no controls to cycle, so there is nothing here to trap and trapping it
    // would strand a keyboard visitor inside a panel they never opened.
    if (e.key !== 'Tab' || !cardIsOpen || !cardPinned) return;
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
  const sheetGesture = createSheetGesture({
    card,
    grip: cardGrip,
    reduceMotion,
    isOpen: () => cardIsOpen,
    onClose,
    owner,
  });

  let cardAnchor = null;        // the hotspot whose node the card belongs to
  let cardEnterTimer = null;

  /** The entry uses the shared shell lamp plus the contact filament on the
   *  edge that faces the node. Armed only on a FRESH open —
   *  a retarget from one contributor straight to the next re-arms it,
   *  because that IS a fresh subject. */
  function runCardEntry() {
    if (cardEnterTimer) clearTimeout(cardEnterTimer);
    if (card.classList.contains('j-card-enter') || card.classList.contains('j-detail-enter')) {
      card.classList.remove('j-card-enter', 'j-detail-enter');
      void card.offsetWidth;
    }
    card.classList.add('j-card-enter');
    if (!reduceMotion.matches) card.classList.add('j-detail-enter');
    cardEnterTimer = owner.timer(() => {
      cardEnterTimer = null;
      card.classList.remove('j-card-enter');
    }, CARD_ENTER_MS);
  }

  function stopCardEntry() {
    if (cardEnterTimer) { clearTimeout(cardEnterTimer); cardEnterTimer = null; }
    card.classList.remove('j-card-enter', 'j-detail-enter');
  }

  const finishCardShellEntry = (e) => {
    if (e.target === card && e.animationName === 'j-detail-arrive') {
      card.classList.remove('j-detail-enter');
    }
  };
  owner.listen(card, 'animationend', finishCardShellEntry);

  /** Set the panel's ARIA and its controls to match the tier it is currently
   *  showing in. One place, so the two tiers cannot disagree — and so the
   *  downgrade path (a pinned card released while its chip is still hot, which
   *  leaves a transient reveal behind) is the same code as a fresh reveal. */
  function applyCardTier() {
    card.classList.toggle('transient', !cardPinned);
    if (cardPinned) {
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      if (cardBody.querySelector('#j-card-h')) card.setAttribute('aria-labelledby', 'j-card-h');
    } else {
      // A transient panel is an annotation, not a dialog, and saying otherwise
      // would be a lie to AT — the same statement `.j-pop` makes by having no
      // role at all and describing its chip instead.
      card.removeAttribute('role');
      card.removeAttribute('aria-modal');
      card.removeAttribute('aria-labelledby');
    }
    // A transient card carries no controls: the ✕ is hidden by CSS (de-hover
    // is the close), and a link — which no contributor has, but a deep-linked
    // node without a `short` could — leaves the tab order exactly as the
    // popover's does until the visitor commits.
    const link = cardBody.querySelector('.j-card-link');
    if (link) link.tabIndex = cardPinned ? 0 : -1;
    // The chip describes itself with the panel's prose while that panel is
    // transient — popShort's mechanism, one vessel up. Guarded by value so it
    // can never clobber the popover's own describedby on some other chip.
    for (const h of hotspots) {
      const want = !cardPinned && cardIsOpen && h.id === cardNodeId && cardDescIds;
      if (want) h.btn.setAttribute('aria-describedby', cardDescIds);
      else if (h.btn.getAttribute('aria-describedby') === cardDescIds) h.btn.removeAttribute('aria-describedby');
    }
  }

  /** Show the card for `nodeId` in the given tier. `openCard` (pinned) and
   *  `revealCard` (transient) are the two doors; everything they share is
   *  here, so a hover reveal and a click open are the same box, the same
   *  placement, the same entry and the same content by construction. */
  function mountCard(nodeId, { pinned, trigger }) {
    const node = CONTENT.nodes[nodeId]
      || CONTENT.contributors.find(c => c.id === nodeId);
    if (!node) return false;
    const retarget = cardIsOpen && cardNodeId !== nodeId;
    // A reveal is FRESH when the box is landing on a node it was not already
    // showing, or when it was shut — showPop()'s own test, so a tier change on
    // the same subject (hover, then click to pin) re-uses the panel in place
    // instead of replaying the shell entry at rest.
    const fresh = !cardIsOpen || cardNodeId !== nodeId;
    const d = node.spotlight || node.card
      // Contributor rows have no card block; they are label material, not
      // prose. The role rides as `tag` (2026-08-18, Hannah: "the artist/core
      // thing should feel more like a tag") — a pill under the name rather
      // than a paragraph pretending the role is a sentence.
      || (node.role ? { title: node.name, tag: node.role, avatar: node.avatar, body: [node.blurb].filter(Boolean) } : null)
      || { title: node.label, body: [node.short] };
    if (fresh) {
      cardBody.textContent = '';
      const h = el('h3', 'j-card-h', d.title || node.label);
      h.id = 'j-card-h';
      // The person's avatar, left of the name (2026-08-18, Hannah — mobile).
      // Decorative and aria-hidden: the name IS the accessible identity. CSS
      // shows it only in the sheet form — the side card already stands next
      // to the real face, so a thumbnail there would say it twice.
      if (d.avatar && d.avatar.url) {
        const av = el('i', 'j-card-ava');
        av.setAttribute('aria-hidden', 'true');
        av.style.backgroundImage = `url("${d.avatar.url}")`;
        av.style.backgroundSize = `${d.avatar.cols * 100}% ${d.avatar.rows * 100}%`;
        av.style.backgroundPosition =
          `${(d.avatar.col / (d.avatar.cols - 1)) * 100}% ${(d.avatar.row / (d.avatar.rows - 1)) * 100}%`;
        h.prepend(av);
      }
      cardBody.appendChild(h);
      // The prose, and only the prose, is what the chip points at while the
      // panel is transient: the title duplicates the chip's own accessible
      // name, exactly the reason `.j-pop`'s description is its short line
      // alone. Ids are assigned here so the set is rebuilt with the content.
      const ids = [];
      const addProse = (cls, text) => {
        const p = el('p', cls, text);
        p.id = `j-card-d${ids.length}`;
        ids.push(p.id);
        cardBody.appendChild(p);
      };
      // The role tag, right under the name. It joins the describedby prose —
      // "Knowledge Sharer" is exactly what a chip's description should open
      // with — but as a pill, not a paragraph.
      if (d.tag) {
        const tg = el('span', 'j-card-tag', d.tag);
        tg.id = `j-card-d${ids.length}`;
        ids.push(tg.id);
        cardBody.appendChild(tg);
      }
      if (d.claim) addProse('j-card-claim', d.claim + (d.claimDetail ? ' — ' + d.claimDetail : ''));
      for (const para of (d.body || [])) addProse('j-card-p', para);
      if (d.status) addProse('j-card-status', d.status);
      cardDescIds = ids.join(' ');
      if (d.link) {
        const a = el('a', 'j-card-link', d.link.label);
        a.href = d.link.href || '#';
        cardBody.appendChild(a);
      }
      cardNodeId = nodeId;
    }
    // A close that is still fading owns neither the DOM nor the input.
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    card.classList.remove('j-card-exit');
    // The bottom-sheet decision is taken per OPEN, from the live pointer /
    // viewport condition — the same per-interaction rule as the touch model.
    // Only a PINNED card can be a sheet: the transient tier is hover-and-focus
    // only and never reached on a coarse pointer (see cardTarget), so a sheet
    // form for it would be an unreachable state.
    card.classList.toggle('sheet', pinned && sheetQuery.matches);
    card.classList.remove('dragging');
    if (fresh) card.style.transform = '';
    if (fresh && cardBody.scrollTop) cardBody.scrollTop = 0;
    card.hidden = false;
    card.inert = false;
    cardIsOpen = true;
    cardPinned = pinned;
    cardDismissBtn = null;
    // WHOSE card this is, for placeCard(). A node with no hotspot (a deep
    // link into a chapter that is not the current one) anchors to nothing and
    // takes the flank fallback.
    cardAnchor = hotspots.find(x => x.id === nodeId) || null;
    applyCardTier();
    // Place before arming the entry so the contact filament's data-side and
    // coordinates are correct on its first painted frame.
    place();
    // A card arriving from `hidden` (display:none) has no rendered start state
    // for the opacity transition to run FROM. Force ONE synchronous style
    // flush, then add `.open` in the same tick — deferring to rAF instead
    // would make the card's visibility depend on the frame loop, and a
    // throttled or background tab would open a dialog that never paints.
    void card.offsetHeight;
    card.classList.add('open');
    // A retarget is a fresh SUBJECT, so it gets a fresh entry: the card has
    // just travelled across the frame to a different person, and arriving
    // silently at the new one is the thing this pass exists to prevent.
    // The shared entry never translates the shell, so the bottom sheet can
    // use it too without fighting its drag-to-dismiss transform. Its contact
    // filament remains suppressed because a sheet is not node-anchored.
    if (fresh) runCardEntry();
    // retargeting an open card (one hotspot straight to the next) must release
    // the previous node before lighting the new one. BOTH tiers do this: the
    // chapter's selected light is the visual half of the reveal, and Hannah
    // asked for the full click-state treatment on hover.
    selection.reveal(nodeId);
    selection.setCommitted(pinned ? nodeId : null);
    if (!pinned) return true;
    // ---- everything below is the COMMITTED tier only ----
    // While it is open the card owns its own wheel, touch and travel keys:
    // internal scrolling works despite scroll.js's window-capture
    // preventDefault, a finger on the sheet can never scrub the journey, and
    // arrows neither travel nor close it (a11y debt #1).
    claimInput(card, { modal: true });
    // a touch-armed hotspot has been acted on; the frame belongs to the card
    hotState.disarm();
    // a retarget keeps the ORIGINAL trigger as the focus return only if the
    // new open supplied none (a deep link / hashchange); an explicit trigger
    // always wins, so Escape lands on the control the visitor last used.
    focusReturn.remember(trigger);
    cardClose.focus();
    // Focus does not MOVE on a retarget (it was already inside the dialog) and
    // there is nothing to move it from on a deep link, so neither case
    // announces itself. Say what is now showing (a11y debt #5).
    if (retarget || !trigger) announce(`${d.title || node.label}. Details.`);
    return true;
  }

  /** The committed open. journey.js's only door, unchanged in signature and

  /** Remember that THIS reveal was dismissed, and what has to happen before
   *  the node may reveal again.
   *
   *  The question is "what is still holding this panel open?", and there are
   *  exactly three answers. A POINTER on the face: park the dismissal on that
   *  chip, re-armed by a real move off it. KEYBOARD focus on the chip: re-armed
   *  by the chip going cold, which is the popover's rule. NEITHER — Escape on a
   *  card that was opened by Enter and moved focus into the dialog — and then
   *  there is nothing to suppress at all, because the reveal's own cause is
   *  already gone; recording a dismissal there would strand the node, since the
   *  cold transition that clears it has already been and gone.
   *
   *  The pointer test is GEOMETRY, not `h.hover` and not `elementFromPoint`:
   *  while a pinned card is open its chip is `visibility: hidden`, so the hover
   *  flag has already been dropped by a synthetic leave and the element is not
   *  hit-testable — yet the pointer is physically still on the face and will
   *  get a synthetic enter the moment the chips come back. `sx`/`sy` hold the
   *  last placed position and `padLast` the last live pad radius, so the pad
   *  the visitor is aiming at answers even while nothing is drawn there. */
  function dismissCard() {
    cardDismissBtn = null;
    cardDismissed = null;
    if (!cardNodeId) return;
    const h = hotspots.find(x => x.id === cardNodeId);
    if (!h) return;
    const onIt = !!(lastPointer && h.padLast > 0
      && Math.hypot(lastPointer.x - h.sx, lastPointer.y - h.sy) <= h.padLast);
    if (!onIt && !h.focused) return;
    cardDismissed = cardNodeId;
    cardDismissBtn = onIt ? h.btn : null;
  }

  /* The pointer half of that re-arm. A `pointermove` is the one signal a
     visibility change cannot fake, and the test is the live hit model itself —
     `elementFromPoint`, so the chip's own hit pad decides, exactly as it does
     for every other pointer question in this file. */
  let lastPointer = null;
  owner.listen(document, 'pointermove', (e) => {
    lastPointer = { x: e.clientX, y: e.clientY };
    if (!cardDismissBtn) return;
    const at = document.elementFromPoint(e.clientX, e.clientY);
    if (at && cardDismissBtn.contains(at)) return;
    cardDismissBtn = null;
    cardDismissed = null;
    syncCard();
  }, { passive: true });

  /** The single place that decides what the TRANSIENT card shows —
   *  popTarget()/syncPop() folded into one, because this tier has only one
   *  question to ask and no deferred hide to re-ask it after.
   *
   *  Deliberately WITHOUT the popover's POP_HIDE_MS: that delay exists so a
   *  pointer can cross the POP_GAP from chip to popover and reach its link,
   *  and a transient card has no link to reach and is `pointer-events: none`.
   *  The answer here is immediate in both directions, which is what "available
   *  immediately… return immediately to the default state" asks for. */
  function syncCard() {
    // A COMMITMENT is never re-asserted, and never taken away, by a hover. The
    // guard is not just precedence: re-running the committed mount would take
    // focus and re-announce the dialog every time a pointer moved.
    if (cardPinned) return;
    // TOUCH HAS NO HOVER. On a coarse pointer or a phone-width viewport there
    // is no transient tier at all — a tap goes straight to the committed card
    // (the PL-1.3 bottom sheet). See the click handler in addHotspot().
    const hot = sheetQuery.matches ? null : hottestCard();
    // A dismissed reveal stays dismissed while its chip is still hot; leaving
    // the chip re-arms it (refresh()).
    if (hot && cardDismissed !== hot.id) { mountCard(hot.id, { pinned: false }); return; }
    if (cardIsOpen) hideCard();
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
    card.classList.remove('open', 'j-card-exit');
    card.hidden = true;
    card.style.transform = '';
    card.style.removeProperty('--j-card-fx');
    card.style.removeProperty('--j-card-fy');
    card.removeAttribute('data-side');
    card.classList.remove('sheet', 'dragging');
  }

  /** Take the box away, in whichever tier it is showing. The VISUAL close —
   *  it says nothing about who dismissed it or where focus should land, which
   *  is what lets the transient tier reuse it wholesale. */
  function hideCard() {
    if (!cardIsOpen) return;
    sheetGesture.cancelRelease();
    cardIsOpen = false;
    cardPinned = false;
    // The entry is dropped before the shared exit is armed, so the two shell
    // animations can never compete for opacity or border colour.
    stopCardEntry();
    cardAnchor = null;
    card.inert = true;
    releaseInput(card);
    sheetGesture.reset();
    selection.clearReveal();
    selection.setCommitted(null);
    applyCardTier();            // drops the chip's aria-describedby with it
    cardNodeId = null;
    cardDescIds = '';
    // Reduced motion has no fade to protect (journey/site.css drops the transition),
    // so it closes on the tick, exactly as before.
    if (reduceMotion.matches) finishClose();
    else {
      card.classList.add('j-card-exit');
      const closeMs = card.classList.contains('sheet') && card.style.transform
        ? CARD_DRAG_FADE_MS : CARD_FADE_MS;
      fadeTimer = owner.timer(finishClose, closeMs);
    }
  }

  /* A mobile profile disclosure is a translucent bottom sheet. Leaving the
     navigator painted beneath it makes the active halo and glyphs show through
     the card even though modalDetail has correctly removed their pointer
     access. Withhold the rail visually for exactly the sheet's open lifetime;
     desktop cards remain alongside the live navigator and use the measured
     placement exclusion in update().

     THE SOLE WRITER of the rail's visibility, so the per-frame reconciler and
     the close path below cannot compute it differently: both call this, and it
     reads `cardIsOpen` — which hideCard() has already cleared by the time the
     close path asks. */
  function syncRailVisibility() {
    if (!rail.root) return;
    rail.root.style.visibility = cardIsOpen && card.classList.contains('sheet')
      ? 'hidden' : '';
  }

  /* THE CLOSE PATH'S HALF OF ui.update(). update() is the sole reconciler of
     "who is focusable right now", and the detail card's close completed
     without it: journey.js clears `detailNode` and calls closeCard() in one
     tick, so `journey.detail` read null while the rail was still inert and
     `visibility: hidden` for one more rendered frame, silently swallowing any
     focus() in between (DEF-01).

     This asks the frame's OWN predicate — the `detailNow && !popover.isPinned()` of
     update() — and releases only when the answer is already "no modal detail".
     A close that hands the frame straight on to another detail therefore
     changes nothing here and is left to the frame, exactly as before. The
     release never claims: making the rail inert remains update()'s alone. */
  function releaseRailAfterDetail() {
    if (isDetailOpen() && !popover.isPinned()) return;
    rail.releaseModal();
    syncRailVisibility();
  }

  function close() {
    if (!cardIsOpen) return;
    const wasPinned = cardPinned;
    /* A deliberate close must not be undone by a pointer that never left the
       face. Without this, Escape (or the ✕, or a press outside) would drop the
       card and syncCard would put it straight back as a hover reveal on the
       very next call — "an Escape that visibly does nothing", the exact fault
       popDismissed was added to prevent. Cleared when the chip goes cold, so
       moving off the face and back works again; see refresh(). */
    dismissCard();
    // inert BEFORE the focus return: a fading card is out of the tab order and
    // out of the a11y tree from the first frame of the fade.
    card.inert = true;
    hideCard();
    // Only a committed card ever took focus, so only a committed card has any
    // to give back.
    if (wasPinned) focusReturn.restore();
    // LAST, deliberately: the focus return above runs against exactly the DOM
    // it always did, so nothing about where focus lands is changed here. This
    // only hands the navigator back on the same tick the card left.
    releaseRailAfterDetail();
  }

  return {
    /** The shell, for the QA surface `createUI` returns. */
    element: card,
    isOpen: () => cardIsOpen,
    /** COMMITTED (click / key / route), or a transient hover-and-focus
     *  reveal? — the card's half of `popover.isPinned()`. */
    isPinned: () => cardPinned,
    isSheet: () => card.classList.contains('sheet'),
    nodeId: () => cardNodeId,
    mount: mountCard,
    sync: syncCard,
    hide: hideCard,
    close,
    dismiss: dismissCard,
    /** A close is of that one reveal, not of the person. A dismissal the
     *  POINTER is parked on is exempt — it is re-armed by a real pointer move
     *  off the chip instead; see `cardDismissBtn`. */
    rearm(nodeId) {
      if (cardDismissed === nodeId && !cardDismissBtn) cardDismissed = null;
    },
    syncRailVisibility,
    /** The per-frame half. The card is anchored to a node that is itself
     *  world-tracked, so it is re-placed every frame for the reason the
     *  popover is: the organism sways, and a box pinned to a face has to sway
     *  with it or the two come apart. Unlike the popover it is NEVER hidden
     *  when its subject leaves the frame — the card is a modal disclosure
     *  with a focus trap and a route state behind it, and taking it away from
     *  under a visitor's keyboard because the camera drifted would be a far
     *  worse fault than a card that has run out of things to point at.
     *  Layout clamps to the frame edge instead.
     *
     *  A TRANSIENT card is the exception, and for the popover's reason rather
     *  than against it (2026-08-14): it holds no focus, owns no input and is
     *  nobody's route state, so it IS an annotation, and an annotation whose
     *  subject has left the frame has nothing to annotate. A chip that goes
     *  non-`.vis` mid-hover — travel, suppression behind the copy block, a
     *  chapter change — does not reliably fire `pointerleave` on the way out,
     *  so without this the panel could outlive the face it points at. */
    frame() {
      if (!cardIsOpen) return;
      if (!cardPinned && cardAnchor && !cardAnchor.btn.classList.contains('vis')) {
        if (cardAnchor.hot) { cardAnchor.hover = false; cardAnchor.refresh(); }
        else hideCard();
      } else place();
    },
    /** An orientation change or a window resize across the 720px line while a
     *  card is open re-forms it in place rather than leaving a side card on a
     *  phone-width viewport until the next open.
     *
     *  CALLED FROM `createUI`, not run at construction: listener registration
     *  ORDER is part of the behaviour stream this order is graded on, and this
     *  one has always been registered after the document-level Escape key
     *  handler that `createUI` still owns. */
    watchViewport() {
      if (typeof sheetQuery.addEventListener !== 'function') return;
      owner.listen(sheetQuery, 'change', () => {
        if (!cardIsOpen) return;
        // A transient card has no sheet form to re-form INTO — the tier is
        // switched off on a coarse pointer / narrow viewport — so crossing the
        // line simply takes the reveal away. The next hover on the wider side
        // brings it back.
        if (!cardPinned) { if (sheetQuery.matches) hideCard(); return; }
        card.classList.toggle('sheet', sheetQuery.matches);
        // The anchored form writes its placement as an INLINE transform, which
        // outranks `.j-card.sheet { transform: none }`. Re-forming into a sheet
        // therefore has to hand the transform back, or the sheet arrives
        // wearing the side card's translate. (The other direction needs
        // nothing: the next frame's placeCard() writes one.)
        if (sheetQuery.matches) {
          card.style.transform = '';
          card.style.removeProperty('--j-card-fx');
          card.style.removeProperty('--j-card-fy');
          card.removeAttribute('data-side');
        }
      });
    },
  };
}
