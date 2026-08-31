/* ==================================================================== *
 * The POPOVER vessel: the disclosure that stands BESIDE its chip.
 *
 * Two tiers, and the whole file is about keeping them apart:
 *
 *   TRANSIENT — pointer hover, keyboard focus, or the touch arm. Driven by
 *   the same `hot` union that lights the chip, so all three reveals are the
 *   identical entry with nothing said about pointer type. Its link is out of
 *   the tab order; Escape takes it away and remembers not to re-show it while
 *   the chip stays hot.
 *
 *   PINNED — click / Enter / Space / a deep link. Route state (journey.js
 *   reports a detail open) but NOT modal: it sits beside a chip that must
 *   stay on screen under it, focus never leaves that chip, and the CTA
 *   becomes the next Tab stop because the panel is placed directly after its
 *   chip in the DOM.
 *
 * WHAT THIS OWNS, and what that buys. Every `let` below is declared here and
 * written by this module alone. Before U03 the seven of them lived in
 * `createUI`'s body, where `popNode` was written by thirteen sibling closures
 * and `popPinned` by twelve; sibling closures cannot see each other, so the
 * only way one reached another's state was through the common parent, and the
 * common parent was a 1,400-line factory. The vessel is now answerable for
 * its own state and reachable only through the interface at the bottom.
 *
 * WHAT IT DELIBERATELY DOES NOT OWN:
 *
 *   · THE DOM SHELL. `createUI` builds it and hands it in. Construction ORDER
 *     is observable — it decides the document order the golden captures and
 *     the trace oracle both read — so the page's DOM is built in one place,
 *     in one sequence, and the state machines are handed the nodes.
 *   · THE OTHER VESSEL. `requireVesselFree` is "one vessel at a time" as a
 *     request to the composition root, not a call into the card. The card
 *     machine and this one do not import each other; `journey/ui.js` routes
 *     between them, which is where the content-derived choice (a `short` line
 *     or not) already lives.
 *   · SELECTION AND FOCUS RETURN. Both vessels write them, so neither may own
 *     them — see `journey/ui/selection.js`.
 * ==================================================================== */

import { CONTENT } from '../../content/content.js';
import { CARD_BUILDERS } from '../cards/index.js';
import { el } from './dom.js';

/**
 * @param {object}   deps
 * @param {object}   deps.shell         `createPopover()`'s nodes, built by createUI
 * @param {object}   deps.owner         this vessel's owner-tree child (J04b)
 * @param {object}   deps.hotState      the hotspot registry — `hottest` reads it
 * @param {object}   deps.reduceMotion  the live `prefers-reduced-motion` query
 * @param {object}   deps.selection     shared: the selected light + the commit
 * @param {object}   deps.focusReturn   shared: where focus goes back to
 * @param {Function} deps.announce      the polite live region
 * @param {Function} deps.onOpen        journey.js's open door (touch commits)
 * @param {Function} deps.requireVesselFree  close the card if one is showing
 */
export function createPopoverTier({ shell, owner, hotState, reduceMotion,
  selection, focusReturn, announce, onOpen, requireVesselFree }) {
  const {
    pop,
    title: popTitle,
    short: popShort,
    link: popLink,
  } = shell;
  const POP_GAP = 12;        // clearance between chip box and popover box
  const POP_MARGIN = 10;     // hard minimum from any viewport edge
  /* The popover stands POP_GAP away from its chip, so a pointer travelling
     from one to the other crosses bare canvas — and the chip's pointerleave
     lands BEFORE the popover's pointerenter. Hiding on that leave would pull
     the popover out from under the pointer mid-journey and, because a shut
     popover has pointer-events:none, make its link unreachable by mouse
     entirely. So a hover-out schedules the hide instead of doing it, and
     anything that re-opens cancels it. Long enough to cross 12px, short
     enough not to feel sticky. */
  const POP_HIDE_MS = 160;
  /* `.j-pop-enter` owns the card-specific interior and filament sequence.
     The shared shell gesture has its own `.j-detail-enter` lifetime, ended by
     animationend, so a cold rendering frame cannot spend it offscreen. This
     timer only covers the slowest interior part (the 0.62 s filament) with a
     little air. */
  const POP_ENTER_MS = 700;
  /* ---- rich stages (2026-08-17, "show, don't tell" previews) ----------
     Six nodes carry a builder in journey/cards/ that fills a media stage
     with that project's own assets and motion. The stage is built lazily,
     ONCE per node, and cached here — switching nodes swaps stage elements
     rather than rebuilding, so a hover replays instantly. Everything else
     about the popover (shell, entry, placement, a11y) is untouched; a node
     without a builder renders exactly the pre-2026-08-17 popover.
     NB 2026-08-18: this block was lost once to a concurrent session's
     ui.js write — if the cards ever render as plain popovers again, check
     that this wiring (import, this block, the showPop/hidePop hooks, and
     index.html's cards.css link) is still present before debugging cards/. */
  const stageCache = new Map();   // nodeId -> { el, builder }
  let activeStage = null;         // the { el, builder } currently in the pop

  /* A THIRD STATE: THE WINDOW WITH NOTHING BEHIND IT YET (2026-08-30).
     Until Equip shipped there were two: a node with a builder got the rich
     shell and its own interior, and a node without one got the plain popover.
     Equip's two initiatives are neither. They are real destinations with real
     names and real one-line descriptions, and their interiors do not exist —
     so the honest preview is the SHELL, complete, with the interior visibly
     unbuilt: an abstract field where the artwork will be, the description
     present but out of focus, and a door shape that is a shape and not a door.

     THERE IS NO MODULE FOR IT, DELIBERATELY. journey/cards/ is a registry of
     built things; adding two members that draw nothing would say the opposite
     of what this state means, and journey/cards/registry.js's own comment
     ("A module still under construction exports null") is the rule this
     follows rather than the one it breaks. The interior is entirely
     journey/cards/cards.css's, keyed off the class this sets, which is what
     lets a stage with no owner still be a stage.

     THE NODE DECLARES IT — `preview: 'under-construction'` in
     content/content.js. This file names no node and no chapter, exactly as
     before; what it reads is a property of the content, so any future node
     can be in this state and no node is in it by accident. */
  function unbuiltStage(nodeId) {
    const node = CONTENT.nodes[nodeId];
    return !!(node && node.preview === 'under-construction');
  }

  function stageFor(nodeId) {
    if (stageCache.has(nodeId)) return stageCache.get(nodeId);
    const builder = CARD_BUILDERS[nodeId];
    if (!builder && !unbuiltStage(nodeId)) { stageCache.set(nodeId, null); return null; }
    const stageEl = el('div', builder ? 'j-pop-stage' : 'j-pop-stage j-pop-unbuilt');
    if (builder) builder.build(stageEl, CONTENT.nodes[nodeId]);
    // One organism, six interiors: every project keeps complete ownership of
    // its stage while this shared, non-interactive frame supplies the site's
    // mycelial edge language around it. The wrapper is cached with the stage,
    // so switching nodes never rebuilds or re-parents a builder's own DOM.
    const frameEl = el('div', 'j-pop-frame');
    frameEl.appendChild(stageEl);
    const entry = { el: frameEl, stage: stageEl, builder: builder || null };
    stageCache.set(nodeId, entry);
    return entry;
  }

  function setStage(nodeId) {
    const next = stageFor(nodeId);
    if (activeStage === next) return;
    if (activeStage) {
      if (activeStage.builder) activeStage.builder.deactivate();
      activeStage.el.remove();
    }
    activeStage = next;
    if (next) {
      pop.prepend(next.el);
      pop.classList.add('j-pop-rich');
      pop.classList.toggle('j-pop-unbuilt', !next.builder);
      pop.dataset.node = nodeId;
    } else {
      pop.classList.remove('j-pop-rich');
      pop.classList.remove('j-pop-unbuilt');
      delete pop.dataset.node;
    }
  }
  // The description is the SHORT LINE only, not the whole popover: the title
  // duplicates the chip's accessible name and the link is a control, and
  // neither belongs in a description string.
  // Out of the tab order until a popover is actually PINNED — it gains an href
  // on first reveal, and an <a href> is tabbable by default.

  let popNode = null;        // the hotspot the popover currently belongs to
  let popPinned = false;     // committed (click / Enter / Space / deep link)
  let popHover = false;      // pointer is inside the popover itself
  let popDismissed = null;   // node id whose TRANSIENT popover Escape dismissed
  let popHideTimer = null;

  function cancelPopHide() {
    if (popHideTimer) { clearTimeout(popHideTimer); popHideTimer = null; }
  }

  /* Which chip the popover should follow when several are hot at once.
     They genuinely can be: keyboard focus sits on one chip while the pointer
     rests on another, and both are `hot` by the same OR that lights them.
     Registration order would hand it to whichever was declared first, which
     is arbitrary and usually wrong — the visitor's LAST action is the one
     they are waiting on an answer for. */
  const hottest = () => hotState.hottest((h) => !!h.preview);

  /** hottest()'s twin for the CARD (2026-08-14). Same tie-break — the
  /** The popover's content for a node, or null if this node doesn't get one.
   *  `short` is the qualifier — see the eligibility note above. */
  function previewFor(nodeId) {
    const node = CONTENT.nodes[nodeId];
    if (!node || !node.short) return null;
    const d = node.spotlight || node.card || {};
    return { title: d.title || node.label, short: node.short, link: d.link || null };
  }

  /* Anchored beside the chip, flipping rather than clipping.

     Horizontal is the real decision and it is made first: right of the chip by
     default, LEFT if the popover would cross the right edge, and only if
     neither side fits does it drop BELOW (a viewport narrower than chip +
     popover + margins). Vertical is then just centring plus a clamp.

     Why that order matters for "never covers its own chip": the two side
     placements are horizontally DISJOINT from the chip by construction, so the
     vertical clamp — which is what handles a chip near the top or bottom edge,
     and is what makes a top-edge chip open downwards — can never slide the
     popover over the chip it belongs to. Only the below/above fallback shares
     the chip's columns, and that one is placed past the chip's own edge. */
  function placePop() {
    if (!popNode) return;
    const c = popNode.btn.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

    let x = c.right + POP_GAP;
    let side = 'right';
    if (x + p.width > vw - POP_MARGIN) {
      x = c.left - POP_GAP - p.width;
      side = 'left';
      if (x < POP_MARGIN) side = 'below';
    }

    let y;
    if (side === 'below') {
      x = clamp(c.left, POP_MARGIN, Math.max(POP_MARGIN, vw - POP_MARGIN - p.width));
      y = c.bottom + POP_GAP;
      // no room under it either — go above, still clear of the chip
      if (y + p.height > vh - POP_MARGIN) y = c.top - POP_GAP - p.height;
    } else {
      y = c.top + c.height / 2 - p.height / 2;
      y = clamp(y, POP_MARGIN, Math.max(POP_MARGIN, vh - POP_MARGIN - p.height));
    }

    pop.dataset.side = side;
    pop.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  let popEnterTimer = null;

  /** Start (or restart) the entry choreography. Called only on a FRESH reveal
   *  — a pointer that leaves a chip and comes back inside POP_HIDE_MS, or a
   *  syncPop that re-asserts an already-open popover, must not re-play it. */
  function runPopEntry() {
    if (popEnterTimer) clearTimeout(popEnterTimer);
    if (pop.classList.contains('j-pop-enter') || pop.classList.contains('j-detail-enter')) {
      // chip-to-chip hop inside the entry window: the keyframes only restart
      // if the class is genuinely absent for a style resolution, so force one
      pop.classList.remove('j-pop-enter', 'j-detail-enter');
      void pop.offsetWidth;
    }
    pop.classList.add('j-pop-enter');
    // The shell owns its own completion signal. Keeping this separate from
    // j-pop-enter means a cold WebGL frame cannot let the 700ms interior timer
    // remove the fast shell animation before Chrome has painted frame one.
    if (!reduceMotion.matches) pop.classList.add('j-detail-enter');
    popEnterTimer = owner.timer(() => {
      popEnterTimer = null;
      pop.classList.remove('j-pop-enter');
    }, POP_ENTER_MS);
  }

  function stopPopEntry() {
    if (popEnterTimer) { clearTimeout(popEnterTimer); popEnterTimer = null; }
    pop.classList.remove('j-pop-enter', 'j-detail-enter');
  }

  const finishPopShellEntry = (e) => {
    if (e.target === pop && e.animationName === 'j-detail-arrive') {
      pop.classList.remove('j-detail-enter');
    }
  };
  owner.listen(pop, 'animationend', finishPopShellEntry);

  /** Point the popover at a hotspot and show it. */
  function showPop(h) {
    const d = h.preview;
    if (!d) return;
    // A reveal is fresh when the popover is landing on a node it was not
    // already showing, or when it was shut. Hover, keyboard focus and the
    // touch arm all arrive here through the same `hot` state, so all three
    // get the identical entry with nothing said about pointer type.
    const fresh = popNode !== h || !pop.classList.contains('open');
    // a reveal mid-exit cancels the exit and takes the panel back live
    if (popExitTimer) {
      clearTimeout(popExitTimer);
      popExitTimer = null;
      pop.classList.remove('j-pop-exit');
    }
    if (popNode !== h) {
      setStage(h.id);
      popTitle.textContent = d.title;
      popShort.textContent = d.short;
      if (d.link) {
        popLink.textContent = d.link.label;
        popLink.href = d.link.href || '#';
        popLink.hidden = false;
      } else {
        popLink.hidden = true;
      }
      if (popNode) popNode.btn.removeAttribute('aria-describedby');
      popNode = h;
      // DOM order IS the tab order: sitting immediately after its chip means a
      // pinned popover's link is simply the next Tab stop. The element is
      // absolutely positioned, so moving it costs no layout.
      h.btn.after(pop);
    }
    h.btn.setAttribute('aria-describedby', popShort.id);
    pop.classList.add('open');
    // rich stages reveal their in-world CTA while pinned (cards.css keys
    // this class alongside :hover and :focus-within)
    pop.classList.toggle('j-pop-pinned', popPinned);
    // a transient popover's link is reachable by pointer but stays out of the
    // tab order — Tab belongs to the chips until the visitor commits
    popLink.tabIndex = popPinned ? 0 : -1;
    // same rule for any controls a rich stage carries (ADOS's event toggle):
    // pointer-reachable while transient, tabbable only once pinned
    if (activeStage) {
      const ti = popPinned ? 0 : -1;
      for (const b of activeStage.el.querySelectorAll('button, a')) b.tabIndex = ti;
    }
    // Place before arming the entry so the contact filament's side is correct
    // on its first painted frame.
    placePop();
    if (fresh) runPopEntry();
    // fresh reveal -> let the stage run its motion (no-op when reduced)
    if (fresh && activeStage && activeStage.builder) activeStage.builder.activate();
  }

  /* The exit is choreographed, not cut (Hannah, 2026-08-18: "a nice exit
     animation for when we dehover") — `.j-pop-exit` plays the interiors'
     settle (cards.css) over POP_EXIT_MS while `.open` keeps the panel on
     screen, and only then does the real teardown run. A pointer that comes
     back mid-exit is caught at the top of showPop, which cancels the timer
     and simply re-opens — the panel never blinks. Reduced motion tears
     down immediately, as before. */
  const POP_EXIT_MS = 230;
  let popExitTimer = null;

  function teardownPop() {
    if (activeStage && activeStage.builder) activeStage.builder.deactivate();
    pop.classList.remove('open', 'j-pop-pinned');
    popLink.tabIndex = -1;
    if (popNode) popNode.btn.removeAttribute('aria-describedby');
    popNode = null;
    popHover = false;
  }

  function hidePop() {
    cancelPopHide();
    stopPopEntry();
    if (popExitTimer) return;   // exit already playing; teardown will land
    if (!pop.classList.contains('open') || reduceMotion.matches) {
      teardownPop();
      return;
    }
    pop.classList.add('j-pop-exit');
    popExitTimer = owner.timer(() => {
      popExitTimer = null;
      pop.classList.remove('j-pop-exit');
      teardownPop();
    }, POP_EXIT_MS);
  }

  /** Which hotspot the popover SHOULD be showing, or null for none.
   *  One function so the deferred hide below re-asks exactly the question
   *  syncPop asked — an earlier version re-tested only `hottest()` there and
   *  silently ignored `popDismissed`, which made Escape a no-op whenever focus
   *  stayed on the chip (which is always, for a non-modal disclosure). */
  function popTarget() {
    if (popPinned && popNode) return popNode;
    const hot = hottest();
    if (hot && popDismissed !== hot.id) return hot;
    return null;
  }

  /** The single place that decides what the popover shows. Pinned wins;
   *  otherwise the hot chip; otherwise a pointer resting on the popover itself
   *  holds it open, so a mouse can travel from the chip to the link. */
  function syncPop() {
    cancelPopHide();
    const want = popTarget();
    if (want) { showPop(want); return; }
    if (popHover && popNode) return;           // pointer is in the popover
    // Not an immediate hide — see POP_HIDE_MS. The decision is re-asked when
    // the timer fires, so a pointer that has since landed on the popover (or
    // on another chip) keeps it.
    if (pop.classList.contains('open')) {
      popHideTimer = owner.timer(() => {
        popHideTimer = null;
        if (!popTarget() && !popHover) hidePop();
      }, POP_HIDE_MS);
    } else hidePop();
  }

  owner.listen(pop, 'pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    popHover = true;
  });
  owner.listen(pop, 'pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    popHover = false;
    syncPop();
  });
  /* A first mobile tap leaves the popover in its transient, hotspot-owned
     state. Pressing one of the popover's own controls then moves focus off
     that hotspot before `click`, which used to tear the popover down before
     the control could act. Commit through the normal disclosure path on
     pointerdown, while the hotspot still owns focus; the ensuing click keeps
     its native button/link behavior, and the pinned popover retains the
     standard outside-tap, scroll and Escape exits. */
  owner.listen(pop, 'pointerdown', (e) => {
    if (e.pointerType !== 'touch' || popPinned || !popNode) return;
    const control = e.target instanceof Element
      ? e.target.closest('button, a[href], input, select, textarea')
      : null;
    if (control && pop.contains(control)) onOpen(popNode.id, popNode.btn);
  });

  /** Commit the popover for `h`: it stays until Escape, a scroll intent,
   *  another node, or a press outside. journey.js drives this through
   *  openCard() below, so every close behaves exactly as it does for the
   *  card. */
  function pinPop(h, trigger) {
    requireVesselFree();                  // one vessel at a time
    const retarget = popPinned && popNode !== h;
    popPinned = true;
    popDismissed = null;
    showPop(h);
    // an armed chip has been acted on — the second tap was the commit
    hotState.disarm();
    selection.reveal(h.id);
    selection.setCommitted(h.id);
    focusReturn.remember(trigger);
    // Focus STAYS on the chip. It is the disclosure control, it is still on
    // screen, and the popover sits next to it in the DOM — so Tab reaches the
    // link without a focus move to unwind on close. This is the non-modal
    // counterpart of the card's focus trap, not an omission of one.
    if (trigger) trigger.focus({ preventScroll: true });
    else announce(`${h.preview.title}. ${h.preview.short}`);
    if (retarget) announce(`${h.preview.title}. ${h.preview.short}`);
    return true;
  }

  /** Release the pinned popover. The visual may live on as a transient reveal
   *  if the pointer or focus is still on the chip — closing the DISCLOSURE and
   *  hiding the box are different statements, and syncPop() settles which. */
  function unpinPop({ restoreFocus = true } = {}) {
    if (!popPinned) return;
    popPinned = false;
    popLink.tabIndex = -1;
    selection.clearReveal();
    selection.dropCommittedIf(popNode && popNode.id);
    // A card opening right behind this one is about to take focus itself, so
    // handing it back to the chip first would be a visible flicker to nowhere.
    if (restoreFocus) {
      focusReturn.restore();
    }
    syncPop();
  }

  return {
    /** The shell, for the QA surface `createUI` returns. */
    element: pop,
    previewFor,
    /** Is this node in the third state — a real destination whose interior
     *  does not exist yet? Same qualifier the stage uses (unbuiltStage), so
     *  the chip's own "soon" dress and the unbuilt preview can never disagree
     *  about which nodes are in it. */
    unbuiltFor: unbuiltStage,
    /** Is a panel actually on screen, in either tier? Both halves of the
     *  question, because `popNode` outlives the `.open` class through the
     *  choreographed exit. */
    isShowing: () => !!popNode && pop.classList.contains('open'),
    /** ...and whose, for the QA surface journey.js reads. */
    shownId() { return popNode && pop.classList.contains('open') ? popNode.id : null; },
    /** Is it COMMITTED rather than a hover/focus reveal? */
    isPinned: () => popPinned,
    pin: pinPop,
    unpin: unpinPop,
    hide: hidePop,
    sync: syncPop,
    /** Escape's half, and the outside press's: suppress whatever reveal is
     *  showing until its chip goes cold. Three callers used to ask for the
     *  node, null-check it and reach for its id; the question all three were
     *  asking is this one. */
    dismissShown() { if (popNode) popDismissed = popNode.id; },
    /** The chip going cold is what re-arms it, so the next hover works again
     *  — the dismissal is of that one reveal, not of the node. */
    rearm(nodeId) { if (popDismissed === nodeId) popDismissed = null; },
    /** The per-frame half. The panel is anchored to a chip that is itself
     *  world-tracked, so it has to be re-placed every frame or it would lag
     *  the organism's sway. If its chip has left the frame (travel,
     *  suppression behind copy, a modal card) the panel goes with it — an
     *  annotation with nothing to annotate. */
    frame() {
      if (!popNode) return;
      if (!popNode.btn.classList.contains('vis')) hidePop();
      else placePop();
    },
  };
}
