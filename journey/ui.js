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
import { createRail } from './rail.js';
import { claimInput, releaseInput } from './scroll.js';
import { CHAPTERS } from './route.js';
import {
  COPY_BANDS, COPY_FADE_P,
  COPY_OUT_K, COPY_IN_K, COPY_SETTLE_LO, COPY_SETTLE_HI,
  COPY_TRAVEL_LO, COPY_TRAVEL_HI,
  HOTSPOT_STAGGER_MS, HOTSPOT_IN_K, HOTSPOT_OUT_K, HOTSPOT_HOLD_HOME_K,
  HOTSPOT_DODGE_GAP, HOTSPOT_DODGE_MAX,
  COPY_JUMP_LEAD, COPY_JUMP_TAIL_S,
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
  // Connect restage (16-connect-ground-restage.md, Hannah 2026-08-04): the
  // mushroom takes the TOP-LEFT, the copy takes the TOP-RIGHT, and the three
  // hubs spread through the open diagonal band between them. The in-world
  // brightness well the strand shader carves (connect/index.js uWell) moved
  // with the copy — the calm dark zone sits behind the new rect.
  connect: 'pos-topright',
  owned: 'pos-topcentre',
  // Final restage (17-final-field.md, Hannah): the epilogue copy moves to the
  // bottom-left corner — it floats on the dark cutaway wedge while the upper
  // frame belongs to the fairy ring and the field behind it.
  final: 'pos-bottomleft',
};

/* Chapters whose prose `sub` fires a scene response on hover.
   Ride-through #2 gave the Owned claims list a job beyond copy: each <li>
   pulsed the colony through the chapter's trigger(). Hannah's 2026-08-05
   direction turned that list into one prose line (content/content.js), so the
   behaviour moved with it — the whole sentence became the claim, and it fired
   the whole-colony wave.

   RETIRED for Owned, 2026-08-06 (Hannah, report C). Measured, that prose line
   is a 416x77 px box at the dead centre of the frame, between the crown at
   the top and the portrait arc below it — i.e. squarely on the route a
   pointer takes to reach a face. Every crossing fired substrate.surge() and a
   30-unit colony wave, so the whole root system lit at moments that felt
   arbitrary: "the roots ALL light up when I'm hovering over below randomly,
   but this should only happen when I hover over the TOP root thing." The
   response now belongs to the crown, as a HOVER ZONE (see addHoverZone below
   and chapters/owned/index.js hoverZones()).

   The mechanism stays: it is keyed by chapter, so a chapter that wants one
   says so here and every other chapter is untouched. Nothing asks for one
   today. */
const CHAPTER_SUB_PULSE = {};

const NS_SVG = 'http://www.w3.org/2000/svg';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function smoothA(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* --------------------------------------------------------------------------
   LABEL POLICY (hotspot registration contract, W4-F)

   By default a hotspot's chip — dot + text — is part of the resting
   composition: it is visible whenever the hotspot is, and hover/focus only
   brighten it. That is right for page furniture (Inspire's three callouts,
   Connect's network hubs, Owned's three ownership pods carrying the claims).

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
  /* ---------------- the side navigator ---------------- */
  // Hannah, 2026-08-07 / redux 2026-08-09: the chapter list left the hero's
  // <nav> row and became a side rail with a site-map panel behind it — now on
  // the RIGHT flank, carrying the removed footer's whole job (journey/rail.js
  // owns the component: its three states, its symbols, its dialog). This
  // module keeps exactly one relationship with it: it drives its per-frame
  // update from inside the one update() the frame loop already calls.
  // The hero's own <nav> — wordmark, 2RP, Discord — is no longer touched at
  // all by this module; the rail is a sibling landmark on <body>.
  const rail = createRail({ onNav });

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
  const actionRows = {};       // chapterId -> its `.j-actions` row, if it has one
  for (const c of CHAPTERS) {
    const data = CONTENT.chapters[c.id];
    if (!data || c.id === 'mission') continue;   // Mission is the hero's own DOM
    const b = el('div', `j-block ${CHAPTER_POSITION[c.id] || 'pos-left'}`);
    b.dataset.chapter = c.id;
    b.appendChild(el('h2', 'j-h', data.heading));
    if (data.sub) {
      const sub = el('p', 'j-sub', data.sub);
      const pulse = CHAPTER_SUB_PULSE[c.id];
      if (pulse) {
        // pointer-events are off for the whole `.j-copy` layer, so the one
        // line that answers a hover has to opt back in (`.j-sub.j-pulse`).
        sub.classList.add('j-pulse');
        sub.addEventListener('pointerenter', () => {
          const mod = window.journey && window.journey.chapters && window.journey.chapters[c.id];
          if (mod && typeof mod.trigger === 'function') mod.trigger(pulse);
        });
      }
      b.appendChild(sub);
    }
    if (Array.isArray(data.actions) && data.actions.length) {
      // cached on the element: paintCopy reaches for it every frame, for every
      // chapter, and a per-frame querySelector for a node we already hold is a
      // reflow risk for nothing.
      actionRows[c.id] = b.appendChild(buildActions(c.id, data.actions));
    }
    copyHost.appendChild(b);
    blocks[c.id] = b;
  }
  const heroBlock = document.querySelector('.ui .hero');

  /* ==========================================================================
     THE CHAPTER ACTION PAIR (Hannah, 2026-08-07)

     "there should be a button that says 'Learn more', and then next to it
      there should be like a remix button ... make them work nicely together"

     A chapter that declares `actions` in content/content.js gets a row of
     controls under its copy. Nothing here names a chapter or an action: the
     content says WHAT the controls are, this says HOW they are built and
     wired, journey/site.css says how they look, and the chapter module's
     `trigger(name)` says what a button DOES. Same separation the label policy
     and the popover eligibility already keep — a second chapter can grow a
     pair tomorrow without touching this file.

     ---- semantics ----

     `kind: 'link'` is a real <a href>, `kind: 'button'` a real <button
     type="button">. Both, never a div: the link must offer "open in new tab"
     and the button must answer Space as well as Enter, and neither behaviour
     is worth re-implementing. They sit in the DOM in the order content
     declares, which is therefore the tab order, and they are inside the copy
     block so Tab reaches them straight after the prose they belong to and
     before the hotspot layer that follows the block in the DOM.

     ---- reachability ----

     `.j-copy` is pointer-events:none wholesale, so the row opts back in — and
     only the PILLS do, not the row's box, which is why the gap between them
     is not a live surface sitting over the portrait field. The row is also
     `inert` unless its block is more than half faded in (see paintCopy): a
     block at opacity 0.08 mid-travel must not be clickable or tabbable, and
     `visibility:hidden` alone only covers the last 0.2% of that fade.

     ---- the trigger contract ----

     `mod.trigger(name)` may return nothing (every pre-existing caller does),
     or an object:  { announce?: string, busyMs?: number }.
     `announce` goes to the polite live region — a scene change with no focus
     move is otherwise silent to a screen reader. `busyMs` holds the control
     disabled and lit for the length of the response, so the button cannot be
     re-fired into the middle of its own transition.
     ========================================================================== */

  /** The 'nodes' glyph: three points and the filament joining them — the
   *  smallest possible drawing of the thing a remix rearranges. Presentational
   *  (the button's text is its accessible name), so aria-hidden. */
  function nodesGlyph() {
    const svg = document.createElementNS(NS_SVG, 'svg');
    svg.setAttribute('class', 'j-act-glyph');
    svg.setAttribute('viewBox', '0 0 14 14');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const link = document.createElementNS(NS_SVG, 'path');
    link.setAttribute('class', 'j-act-link');
    link.setAttribute('d', 'M2.5 10.2 L7 3.4 L11.5 9.2');
    svg.appendChild(link);
    [[2.5, 10.2], [7, 3.4], [11.5, 9.2]].forEach(([cx, cy], k) => {
      const c = document.createElementNS(NS_SVG, 'circle');
      c.setAttribute('class', `j-act-node n${k + 1}`);
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', '1.55');
      svg.appendChild(c);
    });
    return svg;
  }

  function buildActions(chapterId, specs) {
    const row = el('div', 'j-actions');
    // The row is furniture around two named controls, not a landmark and not a
    // list — it carries no role. Its children carry the whole meaning.
    for (const spec of specs) {
      const isLink = spec.kind === 'link';
      const node = el(isLink ? 'a' : 'button', `j-act j-act-${spec.weight || 'primary'}`);
      if (isLink) {
        node.href = spec.href || '#';
      } else {
        node.type = 'button';
      }
      if (spec.id) node.dataset.action = spec.id;
      if (spec.glyph === 'nodes') node.appendChild(nodesGlyph());
      node.appendChild(el('span', 'j-act-t', spec.label));
      if (!isLink && spec.action) {
        let busyUntil = 0;
        let busyTimer = null;
        node.addEventListener('click', () => {
          if (performance.now() < busyUntil) return;
          const mod = window.journey && window.journey.chapters
            && window.journey.chapters[chapterId];
          const res = (mod && typeof mod.trigger === 'function')
            ? mod.trigger(spec.action) : null;
          const msg = (res && typeof res.announce === 'string') ? res.announce : spec.announce;
          if (msg) announce(msg);
          // The busy window is the SCENE's, reported by the chapter — the
          // button's own lit state is the visitor's receipt that the thing
          // they asked for is happening out in the field.
          const ms = (res && typeof res.busyMs === 'number') ? res.busyMs : 0;
          if (ms > 0) {
            busyUntil = performance.now() + ms;
            node.classList.add('busy');
            // aria-disabled, NOT the `disabled` attribute. A real `disabled`
            // blurs the element the instant it is set, so a keyboard visitor
            // who pressed Enter would be thrown back to <body> and have to
            // Tab in again for a second go. This keeps focus exactly where the
            // visitor put it, announces the control as unavailable, and the
            // guard above is what actually refuses the second press.
            node.setAttribute('aria-disabled', 'true');
            if (busyTimer) clearTimeout(busyTimer);
            busyTimer = setTimeout(() => {
              busyTimer = null;
              node.classList.remove('busy');
              node.removeAttribute('aria-disabled');
            }, ms);
          }
        });
      }
      row.appendChild(node);
    }
    return row;
  }

  /* ---------------- hotspot proxies ---------------- */
  const hotHost = el('div', 'j-hotspots');
  document.body.appendChild(hotHost);
  const hotspots = [];

  /* ==========================================================================
     THE NODE POPOVER (Hannah, 2026-08-05)

     "When I hover over the items (2RP, Discord, etc.), it should reveal the
     details upon hover next to where I'm hovering — right now it takes a click
     and shows way over to the right."

     Hovering a chip now reveals its detail BESIDE the chip. Below is the
     decision that shapes everything else in this block.

     ---- POPOVER vs CARD: the popover REPLACES the card for these nodes ----

     The brief allowed either "popover previews, card details" or "the popover
     is the whole disclosure." This build takes the second, because on this
     content the first is not progressive disclosure — it is a downgrade.

     Look at what each vessel can actually say about a node like 2RP:

       popover:  '2RP' + 'Rigorous research in AI art.' + 'Read the publication'
       card:     the same title, the same link, plus two paragraphs that open
                 'This is placeholder summary copy standing in for the 2RP
                 spotlight until Content/Ops drafts real copy' and a status line
                 reading 'Status: to be confirmed'.

     The popover carries every word of real content the node has. The card adds
     only text that admits it is filler. So "hover to preview, click for more"
     would promise more and deliver less — the weaker surface would win the
     click, which is exactly the "two competing ideas" failure to avoid. One
     gesture, one answer.

     ---- which nodes ----

     Eligibility is by CONTENT, not by id — no chapter or node id appears in
     this file. A node qualifies if it has a `short` line to show. That cleanly
     selects the six STRUCTURE chips Hannah named (Inspire's ArtCompute / Arca
     Gidan Prize / 2RP, Connect's ADOS / Hivemind / Discord) and cleanly
     excludes Owned's sixteen CONTRIBUTORS, who have no `short` — a person's
     row is a name, a role and a blurb, which is a profile, not a caption.

     That split is the LABEL POLICY distinction already drawn above (page
     furniture vs a field of people), and it keeps one rule, not two: EVERY
     chip reveals what it has on hover. A structure chip has a line of prose and
     a link, so that is what appears beside it. A contributor chip's whole
     content is its name and role, and revealing that on hover is precisely
     what `labelOnHover` already does. Clicking a person still opens their
     profile card, which is the only vessel that fits a profile.

     ---- what CLICK does now ----

     Click / Enter / Space PINS the popover instead of opening a card. Pinning
     is what makes the popover usable by everyone rather than mouse-only: it
     survives the pointer leaving, it puts the CTA link in the tab order, and it
     is the second tap of the existing touch model. It also keeps the ROUTE
     model whole — journey.js still funnels this through openCard(), still
     writes #/chapter/node, still pushes one history entry, still closes on
     Back / Escape / scroll-intent. A deep link therefore lands on the same
     thing a click produces, which the split-vessel option could not offer.

     ---- a11y contract ----

     The chip stays the disclosure control. `aria-expanded` tracks the PINNED
     state (via selectedNode/syncExpanded, so it is right on every path
     including deep links). `aria-describedby` points at the short line while
     the popover shows, so hovering and focusing announce the same sentence a
     pointer sees — that is the description, while the chip's own label remains
     its name. `aria-haspopup="dialog"` is dropped for these nodes because what
     opens is no longer a dialog; contributors keep it, because theirs is.
     Escape dismisses. Focus never moves off the chip: this is a non-modal
     disclosure, so the popover is placed directly AFTER its chip in the DOM and
     Tab simply walks into the link.
     ========================================================================== */
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
  /* The popover's entry (journey/site.css, POPOVER ENTRY) runs while
     `.j-pop-enter` is set, and no longer. Scoping it to a class rather than to
     `.open` is not decoration: the unfurl's direction is selected by
     `data-side`, and placePop() re-decides that side every frame from live
     geometry. Left on `.open`, a chip drifting across the flip threshold with
     its popover pinned would swap animation-name on a finished animation and
     replay the whole wipe, at rest, for no reason the visitor can see. The
     class is dropped once the entry is spent, after which a side change is
     inert. Covers the slowest part (the 0.62 s filament) with a little air. */
  const POP_ENTER_MS = 700;

  const pop = el('aside', 'j-pop');
  const popTitle = el('strong', 'j-pop-t');
  // The description is the SHORT LINE only, not the whole popover: the title
  // duplicates the chip's accessible name and the link is a control, and
  // neither belongs in a description string.
  const popShort = el('span', 'j-pop-s');
  popShort.id = 'j-pop-s';
  const popLink = el('a', 'j-pop-link');
  // Out of the tab order until a popover is actually PINNED — it gains an href
  // on first reveal, and an <a href> is tabbable by default.
  popLink.tabIndex = -1;
  pop.appendChild(popTitle);
  pop.appendChild(popShort);
  pop.appendChild(popLink);
  hotHost.appendChild(pop);

  let popNode = null;        // the hotspot the popover currently belongs to
  let popPinned = false;     // committed (click / Enter / Space / deep link)
  let popHover = false;      // pointer is inside the popover itself
  let popDismissed = null;   // node id whose TRANSIENT popover Escape dismissed
  let popHideTimer = null;
  let hotSeq = 0;            // monotonic: which chip went hot most recently

  function cancelPopHide() {
    if (popHideTimer) { clearTimeout(popHideTimer); popHideTimer = null; }
  }

  /* Which chip the popover should follow when several are hot at once.
     They genuinely can be: keyboard focus sits on one chip while the pointer
     rests on another, and both are `hot` by the same OR that lights them.
     Registration order would hand it to whichever was declared first, which
     is arbitrary and usually wrong — the visitor's LAST action is the one
     they are waiting on an answer for. */
  function hottest() {
    let best = null;
    for (const h of hotspots) {
      if (!h.hot || !h.preview) continue;
      if (!best || h.hotSeq > best.hotSeq) best = h;
    }
    return best;
  }

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
    if (pop.classList.contains('j-pop-enter')) {
      // chip-to-chip hop inside the entry window: the keyframes only restart
      // if the class is genuinely absent for a style resolution, so force one
      pop.classList.remove('j-pop-enter');
      void pop.offsetWidth;
    }
    pop.classList.add('j-pop-enter');
    popEnterTimer = setTimeout(() => {
      popEnterTimer = null;
      pop.classList.remove('j-pop-enter');
    }, POP_ENTER_MS);
  }

  function stopPopEntry() {
    if (popEnterTimer) { clearTimeout(popEnterTimer); popEnterTimer = null; }
    pop.classList.remove('j-pop-enter');
  }

  /** Point the popover at a hotspot and show it. */
  function showPop(h) {
    const d = h.preview;
    if (!d) return;
    // A reveal is fresh when the popover is landing on a node it was not
    // already showing, or when it was shut. Hover, keyboard focus and the
    // touch arm all arrive here through the same `hot` state, so all three
    // get the identical entry with nothing said about pointer type.
    const fresh = popNode !== h || !pop.classList.contains('open');
    if (popNode !== h) {
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
    // a transient popover's link is reachable by pointer but stays out of the
    // tab order — Tab belongs to the chips until the visitor commits
    popLink.tabIndex = popPinned ? 0 : -1;
    // Place BEFORE arming the entry: the unfurl's direction comes from
    // `data-side`, so the side has to be decided while the animation is still
    // absent, or the first frame wipes the wrong way and corrects itself.
    placePop();
    if (fresh) runPopEntry();
  }

  function hidePop() {
    cancelPopHide();
    stopPopEntry();
    pop.classList.remove('open');
    popLink.tabIndex = -1;
    if (popNode) popNode.btn.removeAttribute('aria-describedby');
    popNode = null;
    popHover = false;
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
      popHideTimer = setTimeout(() => {
        popHideTimer = null;
        if (!popTarget() && !popHover) hidePop();
      }, POP_HIDE_MS);
    } else hidePop();
  }

  pop.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    popHover = true;
  });
  pop.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    popHover = false;
    syncPop();
  });

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
    const outside = !(e.target instanceof Node) || !hotHost.contains(e.target);
    if (!outside) return;
    // A pinned popover is non-modal, so pressing anywhere else dismisses it —
    // for EVERY pointer type, not just touch (a mouse has no other way out
    // besides Escape). Routed through onClose() so journey.js unwinds the
    // route and the history entry with it.
    if (popPinned) onClose();
    if (e.pointerType !== 'touch' || !armed) return;
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
  function addHotspot({ id, chapter, label, world, labelOnHover, radius }) {
    const stagger = hotspots.filter(h => h.chapter === chapter).length;
    const btn = el('button', 'j-hot');
    btn.type = 'button';
    btn.dataset.node = id;
    btn.dataset.chapter = chapter;
    const preview = previewFor(id);
    // A node that discloses a popover does NOT open a dialog, and saying so
    // would be a lie to AT. `aria-expanded` (set just below) is the whole
    // contract for a non-modal disclosure. Contributors still open a real modal
    // card, so they keep the promise.
    if (!preview) btn.setAttribute('aria-haspopup', 'dialog');
    // a11y debt #5: the hotspot is the disclosure control for its card, so it
    // must say whether that card is currently showing. Set here so the state
    // exists from the first render, not only after the first open.
    btn.setAttribute('aria-expanded', 'false');
    btn.appendChild(el('i', 'j-hot-dot'));
    const labelEl = el('span', 'j-hot-label', label);
    btn.appendChild(labelEl);
    // THE HIT PAD (2026-08-06, report A). A round hit surface the size of the
    // thing the node draws, pinned to the node itself rather than to the pill
    // — the pill flips and nudges to keep a label on frame, and the target you
    // aim at must not move when it does. Zero-sized (and so inert) unless the
    // chapter supplies a radius; the pill is then the whole hit model, exactly
    // as before. It is a CHILD of the button, so every existing listener,
    // :hover rule and focus behaviour keeps working untouched: pointer events
    // on the pad fire enter/leave on the button as its ancestor.
    const hitEl = el('i', 'j-hot-hit');
    hitEl.setAttribute('aria-hidden', 'true');
    btn.appendChild(hitEl);

    const h = {
      id, chapter, btn, world, stagger, a: 0, armAt: null, sup: false,
      radius: typeof radius === 'function' ? radius : null,
      hitEl, hitR: 0,
      holdAt: null,       // world anchor held still while hot — see holdAnchor()
      holdOff: null,      // ...decaying back to zero once it goes cold
      pendX: 0,           // this frame's resolved translate-x, written post-loop
      dodgeY: 0,          // pill raise from the collision dodge (label only —
      dodgePrev: 0,       // the dot is pinned back by --j-dot-dy)
      hover: false, focused: false, armed: false, hot: false,
      pointer: null,      // pointerType of the gesture in flight
      label, labelEl,
      preview,            // popover content, or null — see the POPOVER block
      hotSeq: 0,
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
      if (on) h.hotSeq = ++hotSeq;      // newest hot chip wins — see hottest()
      // Leaving the chip re-arms a popover Escape dismissed, so the next hover
      // works again — the dismissal is of that one reveal, not of the node.
      if (!on && popDismissed === h.id) popDismissed = null;
      // The popover keys off the SAME `hot` state that lights the chip, which
      // is what buys hover / keyboard-focus / touch-armed parity for free.
      syncPop();
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

  /* ---------------- THE HOVER HOLD (2026-08-09) ----------------
     Hannah: "when I'm hovering over an individual item, can you make it so
     that it stays in place… right now they get moved by the wind and stuff,
     and if they're being moved when I hover it causes a weird shudder."

     She is exactly right about the cause, and the measurement says the wind
     is the WHOLE of it. A chip is projected every frame from a world anchor
     that rides the scene — Inspire's three anchor mid-plume, on the streak
     head that the breeze is carrying (chapters/inspire/index.js labelOffsets)
     — so the chip is only as still as the thing it annotates. Traced at the
     Inspire rest over 12 s, 1440x900:

       chip         total wander        of which the CAMERA
       artcompute   29.5 x 41.5 px      0.65 x 0.62 px
       arca         28.3 x 29.0 px      0.65 x 0.62 px
       tworp        14.8 x 12.6 px      0.65 x 0.62 px

     — up to 2.7 px of movement between consecutive frames, and 98% of it is
     the anchor, not the lens. A 41 px target that keeps sliding out from
     under the pointer is not a target; that is the shudder.

     So a HOT chip (hover, keyboard focus or touch-armed — the same `hot` the
     chip's own lit state runs on, so all three channels get the same answer)
     freezes its WORLD ANCHOR, not its screen position. Freezing the anchor is
     what keeps the chip honest: it stops riding the wind but keeps riding the
     LENS, so a wheel scroll or a nav jump under a held hover still carries the
     chip with the scene instead of pinning it to the glass. Everything
     downstream is derived from the same `w` — the dot, the pill's flip and
     nudge, the hit pad's centre AND its projected radius, the copy-rect
     suppression test, and placePop() off the chip's own rect — so all of them
     hold still together, and none of them can disagree about where the node
     is. The pad (696e95d) and the popover (d1ecc23) are untouched: they are
     downstream of this, and a still chip is the condition they were both
     designed for.

     IT CANNOT DRIFT OUT OF ALIGNMENT WITH A LONG HOVER. The anchor's motion
     is a bounded oscillation, not a drift: traced over 24 s the live anchor's
     distance from a fixed one runs 0 -> 39 px -> 0 with a ~5 s period and
     returns to under 1 px four times. So the held chip's error is bounded by
     the swing, never accumulates, and the node keeps coming back to it.

     RELEASE IS A MOVEMENT, NOT A JUMP. Going cold does not restore the live
     anchor in one frame. The hold becomes an OFFSET — where the chip is minus
     where its node now is — and that offset decays geometrically to zero, so
     the chip glides back onto its node and is then dropped entirely.

     The offset, and not a lerp of the held point toward the live one, because
     the live one is MOVING: a first-order lag chasing a moving target settles
     at a nonzero steady-state error (measured here: the anchor's typical
     0.27 px/frame against a 0.1/frame gain parks the chip ~2.7 px behind its
     node, forever). A chip that had been hovered once would then have carried
     a permanent low-pass filter for the rest of the ride. Decaying the offset
     instead converges on zero whatever the node is doing, and the hold is
     released outright below 0.001 world units (~0.14 px).

     dt === 0 is the placement path (deep link, ?p=, the ?capture= freeze):
     nothing is hot there and any hold is dropped outright, so every frozen
     golden is bit-identical by construction.

     2026-08-10 ADDENDUM: Hannah generalised the request — chips and their
     markers should never ride the wind in ANY state — and the fix landed at
     the SOURCE: Inspire's nodeWorld() now anchors each chip to its release
     lip at the mushroom's REST pose (wind rotations zeroed — see the
     mushroomRestMatrix block in chapters/inspire/index.js), and Connect's
     hubs and Owned's faces were static world points all along. So every
     live anchor this loop reads is now constant, all states sit at the
     camera-only floor (measured 0.65 x 0.62 px over 12 s in all three
     chapters), and this hold is a GUARD: it costs nothing against a static
     anchor and keeps the hot state honest if any future chapter registers a
     moving one. */
  function holdAnchor(h, live, dt) {
    if (!live) { h.holdAt = h.holdOff = null; return null; }
    if (h.hot) {
      h.holdOff = null;
      if (!h.holdAt) h.holdAt = live.clone();
      return h.holdAt;
    }
    // the frame the hover ends, the held POINT becomes a held OFFSET
    if (h.holdAt) { h.holdOff = h.holdAt.sub(live); h.holdAt = null; }
    if (!h.holdOff) return live;
    if (dt === 0) { h.holdOff = null; return live; }
    h.holdOff.multiplyScalar(Math.max(0, 1 - dt * HOTSPOT_HOLD_HOME_K));
    if (h.holdOff.lengthSq() < 1e-6) { h.holdOff = null; return live; }
    return h.holdOff.clone().add(live);
  }

  /* ---------------- hover zones (report C) ----------------
     A piece of the SCENE that answers a pointer, with no chip, no label, no
     card and no tab stop. The crown of Owned's root network is the first and
     only one: hovering it runs the wave through the whole system, which is
     the response that used to fire off a prose line in the middle of the
     frame every time a pointer crossed it on the way somewhere else.

     Deliberately not a hotspot. A hotspot is a named node with content behind
     it and a place in the tab order; a zone carries no information at all, so
     it earns neither. It is pointer-only by the same reasoning that made the
     prose-line pulse pointer-only, and it replaces that, so nothing regresses
     for a keyboard: there was never anything there to reach. */
  /* Zones live in their OWN fixed host, at z-index 0, deliberately BELOW the
     hero's `.ui` layer (z-index 1) — and therefore below the chapter nav.
     The chips' host is also z-index 1 but later in the DOM, so a chip still
     wins a tie with the nav exactly as it always has. This matters: the crown
     zone is 246 px across at 1440x900 and the chapter nav sits inside it. In
     the hotspot host it swallowed every nav link (measured — elementFromPoint
     over "Connect" returned the zone). A zone is scenery; anything the page
     actually offers you outranks it. */
  const zoneHost = el('div', 'j-hotzones');
  document.body.appendChild(zoneHost);
  const hoverZones = [];
  function addHoverZone({ id, chapter, world, radius, onHot }) {
    const zEl = el('i', 'j-hotzone');
    zEl.setAttribute('aria-hidden', 'true');
    zoneHost.appendChild(zEl);
    const z = { id, chapter, world, radius: radius || 0.3, onHot, el: zEl, live: false, hot: false, r: 0 };
    zEl.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || z.hot) return;
      z.hot = true; z.onHot(true);
    });
    zEl.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch' || !z.hot) return;
      z.hot = false; z.onHot(false);
    });
    hoverZones.push(z);
    return z;
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

     Chapter modules are reached through window.journey's public handle,
     because journey.js is read-only in this lane and does not pass them to
     createUI(). */
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

  /** Commit the popover for `h`: it stays until Escape, Back, a scroll intent,
   *  another node, or a press outside. journey.js drives this through
   *  openCard() below, so the route, the single history entry and the
   *  scroll-intent close all behave exactly as they do for the card. */
  function pinPop(h, trigger) {
    if (cardIsOpen) closeCard();          // one vessel at a time
    const retarget = popPinned && popNode !== h;
    popPinned = true;
    popDismissed = null;
    showPop(h);
    // an armed chip has been acted on — the second tap was the commit
    clearArmed();
    if (selectedNode && selectedNode !== h.id) notifySelect(selectedNode, false);
    selectedNode = h.id;
    notifySelect(h.id, true);
    syncExpanded();
    returnFocus = trigger || returnFocus;
    // Focus STAYS on the chip. It is the disclosure control, it is still on
    // screen, and the popover sits next to it in the DOM — so Tab reaches the
    // link without a focus move to unwind on close. This is the non-modal
    // counterpart of the card's focus trap, not an omission of one.
    if (trigger) trigger.focus({ preventScroll: true });
    else announce(`${h.preview.title}. ${h.preview.short}`);
    if (retarget) announce(`${h.preview.title}. ${h.preview.short}`);
    return true;
  }

  function openCard(nodeId, trigger) {
    // Nodes that carry a popover are disclosed BESIDE their chip, never in the
    // card — see the POPOVER block above for why the card is not also offered.
    const ph = hotspots.find(x => x.id === nodeId && x.preview);
    if (ph) return pinPop(ph, trigger);
    // anything still using the card (contributor profiles) takes the frame back
    if (popPinned) unpinPop({ restoreFocus: false });
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

  /** Release the pinned popover. The visual may live on as a transient reveal
   *  if the pointer or focus is still on the chip — closing the DISCLOSURE and
   *  hiding the box are different statements, and syncPop() settles which. */
  function unpinPop({ restoreFocus = true } = {}) {
    if (!popPinned) return;
    popPinned = false;
    popLink.tabIndex = -1;
    if (selectedNode) { notifySelect(selectedNode, false); selectedNode = null; }
    syncExpanded();
    // A card opening right behind this one is about to take focus itself, so
    // handing it back to the chip first would be a visible flicker to nowhere.
    if (restoreFocus) {
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      returnFocus = null;
    }
    syncPop();
  }

  function closeCard() {
    // journey.js closes "the detail" without caring which vessel it was; this
    // is the popover's half of that one call.
    unpinPop();
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
    if (e.key !== 'Escape') return;
    if (cardIsOpen) { e.preventDefault(); onClose(); return; }
    // A PINNED popover unwinds through journey.js like the card does, so Back
    // and the route stay consistent. Escape must also suppress the TRANSIENT
    // reveal on the way out: focus is still on the chip (that is where a
    // non-modal disclosure leaves it), so without this the popover would
    // unpin and immediately re-appear as a hover/focus reveal — an Escape
    // that visibly does nothing. Leaving the chip re-arms it; see refresh().
    if (popPinned) {
      e.preventDefault();
      if (popNode) popDismissed = popNode.id;
      onClose();
      return;
    }
    // A TRANSIENT popover is nobody's route state — Escape just takes the
    // reveal away, and remembers not to re-show it while the chip stays hot
    // (otherwise hover/focus would put it straight back and Escape would look
    // broken). Leaving the chip re-arms it; see refresh().
    if (popNode && pop.classList.contains('open')) {
      e.preventDefault();
      popDismissed = popNode.id;
      hidePop();
    }
  });

  /* ---------------- per-frame ---------------- */

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

  /* ---------------- the nav-jump copy entry (Hannah, 2026-08-07) ----------
     A jump is invisible to everything above it. journey.js snaps progress in
     one dt = 0 tick, so |dp/dt| never rises, `settled` reads 1, and the loop
     below writes the destination's copy at full opacity on the click frame —
     a whole second before the camera finishes arriving. That is the pop.

     The fix is NOT a second opacity channel laid over the first. Two writers
     on one style is exactly how a jump ends up leaving a block half-faded by
     the scroll rule, so the envelope below drives `eased` ITSELF and is
     defined to finish at the same value the scroll rule was heading for. When
     it lets go, `eased[id] === target` already, so the scroll rule resumes on
     the next frame with nothing to correct and nothing to re-animate.

     `easedPrev` is what makes the OUTGOING copy behave too. placeAt() runs a
     dt = 0 frame before journey.js can tell us anything, and dt = 0 means
     "snap" — correctly, for a deep link or a capture. arm() undoes that one
     snap by restoring the last TRAVELLED frame's values, which leaves the
     chapter we are leaving at the opacity it actually had. It then releases on
     the ordinary COPY_OUT_K rule (~0.15 s), the same release a scrub gives it.

     See COPY_JUMP_LEAD / COPY_JUMP_TAIL_S for the timing model. */
  const easedPrev = { ...eased };
  let arrive = null;   // { id, t, lead, dur, own }

  /** The one place a copy block's eased opacity reaches the DOM.
      (Until the 2026-08-09 navigation redux this multiplied the epilogue's
      block by `epilogueRetire` so it could hand the lower frame to the
      arriving footer. The footer is gone — its content lives in the rail's
      site-map panel — so the epilogue copy now simply holds through the
      end-hold, which its own band (hi: 2) always said it could.) */
  function paintCopy(id, s) {
    if (id === 'mission') {
      if (!heroBlock) return;
      heroBlock.style.opacity = s;
      heroBlock.style.pointerEvents = s > 0.5 ? '' : 'none';
      // pointer-events already left; visibility is the same statement for the
      // keyboard and for AT (the hero CTA was focusable and readable at every
      // chapter). '' at the Mission pose = the untouched hero.
      heroBlock.style.visibility = s > 0.002 ? '' : 'hidden';
    } else if (blocks[id]) {
      blocks[id].style.opacity = s;
      blocks[id].style.visibility = s > 0.002 ? 'visible' : 'hidden';
      // A chapter's action pair is the only INTERACTIVE thing in the copy
      // layer, so it is the only thing for which "mostly faded out" is not
      // good enough. `visibility` above covers the last 0.2% of the fade; a
      // block sitting at 0.08 through a scrub is still a live click target
      // and still a tab stop without this. Same statement the nav makes about
      // itself: the hit model and the tab order agree with the picture.
      const row = actionRows[id];
      if (row) {
        const rowLive = s > 0.5;
        if (row.inert === rowLive) row.inert = !rowLive;
      }
    }
  }

  /** Copy entry for a chapter the camera is currently blending onto.
   *  `blendDur` is journey.js's live camera-blend duration in seconds — the
   *  entry is placed inside it, not alongside it. */
  function armCopyEntry(id, blendDur) {
    if (!(id in eased)) return;
    for (const k in easedPrev) eased[k] = easedPrev[k];   // undo placeAt's snap
    eased[id] = 0;
    // …and undo it on screen too, in this same task. placeAt() has ALREADY
    // painted the destination at full opacity by the time journey.js can call
    // us, so leaving the correction to the next animator frame ships one
    // rendered frame of exactly the pop this exists to remove. Measured: a
    // 16 ms flash of the whole block at opacity 1 before the envelope took it
    // back to 0.
    for (const k in eased) paintCopy(k, eased[k]);
    const lead = blendDur * COPY_JUMP_LEAD;
    const dur = blendDur + COPY_JUMP_TAIL_S - lead;
    endArrive();                                   // a jump can overtake a jump
    arrive = { id, t: 0, lead, dur, own: true };
    const b = blocks[id];
    if (b) {
      // The parts inside the block run on the CSS clock, started here so they
      // share an origin with the envelope instead of chasing it a frame later.
      // Both delays and durations are expressed against these two customs, so
      // a longer flight stretches the whole choreography rather than opening a
      // gap at the end of it.
      b.style.setProperty('--j-in-wait', `${Math.round(lead * 1000)}ms`);
      b.style.setProperty('--j-in', `${Math.round(dur * 1000)}ms`);
      // restart even when the same block is re-armed mid-entry
      b.classList.remove('j-arrive');
      void b.offsetWidth;
      b.classList.add('j-arrive');
    }
  }

  /** The visitor took the wheel: journey.js has dropped the camera blend, so
   *  the copy stops being timed against an arrival that is no longer coming.
   *  Only the OPACITY authority is handed back — the block's inner keyframes
   *  are left to finish, because every one of them ends at its resting style
   *  and cutting them short is the only way to make them visible as a cut. */
  function cancelCopyEntry() { if (arrive) arrive.own = false; }

  /** The entry is over — spent, abandoned, or overtaken. Drops the class as
   *  well as the state: `both` fill means a stale `.j-arrive` would leave
   *  three elements holding a finished animation for the rest of the session.
   *  Harmless to look at (every keyframe ends at the resting style, which is
   *  the whole contract) and still wrong to leave lying around. */
  function endArrive() {
    if (!arrive) return;
    if (blocks[arrive.id]) blocks[arrive.id].classList.remove('j-arrive');
    arrive = null;
  }

  function update(p, chapterId, camera, dt = 0) {
    // one-shot, on the first frame the chapter modules are reachable
    if (policyPending) resolveLabelPolicies();
    // A pinned popover makes journey.js report a detail open — it is route
    // state either way — but it is NOT modal: it sits beside a chip that must
    // stay on screen under it, and it never claims the frame. So everything
    // below that means "a dialog owns the page" asks for the MODAL detail, not
    // merely an open one.
    const detailNow = isDetailOpen();
    const modalDetail = detailNow && !popPinned;
    // The side navigator: reveal latch, resting symbol, current entry and the
    // tab-order state, all decided in one place (journey/rail.js).
    rail.update(p, { modalDetail });
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

    // Advance the jump entry before the loop reads it. It dies on a placement
    // frame (a capture or deep link must still snap), and when the visitor has
    // scrolled somewhere else entirely — the arrival it was timed against is
    // then over in both cases.
    if (arrive) {
      if (dt === 0 || (chapterId !== arrive.id && arrive.own)) endArrive();
      else {
        arrive.t += dt;
        if (arrive.t >= arrive.lead + arrive.dur) endArrive();
      }
    }
    // The camera blend runs on smootherstep (journey.js); the copy uses the
    // same C2 ease so the two read as one movement rather than two.
    let arriveE = 0;
    if (arrive && arrive.own) {
      const f = clamp01((arrive.t - arrive.lead) / arrive.dur);
      arriveE = f * f * f * (f * (f * 6 - 15) + 10);
    }

    for (const id in eased) {
      const target = bandOpacity(p, COPY_BANDS[id]) * travelHold;
      let s = eased[id];
      if (arrive && arrive.own && id === arrive.id) s = target * arriveE;
      else if (dt === 0) s = target;
      else if (target < s) s += (target - s) * Math.min(1, dt * COPY_OUT_K);
      else s += (target - s) * Math.min(1, dt * COPY_IN_K * settled);
      if (s < 0.001 && target === 0) s = 0;
      eased[id] = s;
      // The snapshot the next arm() restores from is the last frame that
      // actually TRAVELLED — a dt = 0 placement must not overwrite it, since
      // undoing that very snap is the whole point of keeping it.
      if (dt > 0) easedPrev[id] = s;
      paintCopy(id, s);
    }

    // hotspots: they belong to the RESTING composition, so they follow the
    // eased copy state (never the raw band), arrive AFTER the copy has
    // re-anchored, one per HOTSPOT_STAGGER_MS in narrative order (gap g),
    // and never show while a detail is open (the frame belongs to the detail)
    const detail = modalDetail;
    const now = performance.now();
    // Pill widths, measured in ONE pass before any transform is written this
    // frame — interleaving the read with the writes below would force a
    // reflow per chip. A chip is only measured while it is NOT flipped (the
    // flip is a mirror, not a resize — row-reverse plus swapped padding is the
    // same width — so the measurement is valid in either state). It is
    // re-measured every frame rather than cached because a width taken on the
    // first frame, before the stylesheet and the webfont have settled, reads
    // short, and a flip computed from a short width puts the DOT off the
    // frame instead of the label.
    for (const h of hotspots) { h.pillW = h.btn.offsetWidth; h.pillH = h.btn.offsetHeight; }
    // px per world unit at a given depth, for the hit pads below. The
    // denominator is the VIEW-SPACE depth, not the radial distance: an
    // off-axis node is nearer the image plane than its distance suggests
    // (cos 38 deg at |ndc x| 0.9), and sizing a pad by distance would make it
    // ~20% too small at exactly the edge of the frame where it matters most.
    const tanHalf = Math.tan(camera.fov * Math.PI / 360);
    const cm = camera.matrixWorld.elements;
    const cpx = cm[12], cpy = cm[13], cpz = cm[14];
    const fx = -cm[8], fy = -cm[9], fz = -cm[10];
    const viewDepth = (v) => (v.x - cpx) * fx + (v.y - cpy) * fy + (v.z - cpz) * fz;
    for (const h of hotspots) {
      const gate = eased[h.chapter] || 0;
      let want = gate > 0.72 && !detail;
      let w = want ? h.world() : null;
      w = holdAnchor(h, w, dt);
      let sx = 0, sy = 0;
      h.hitRaw = 0;
      if (w) {
        const v = w.clone().project(camera);
        // Behind the camera, or too near the frame edge to be placeable.
        // A chip with a HIT PAD gets the wider bound: the old 0.92/0.90 was
        // sized for a pill that had to carry a readable label from its dot,
        // but a pad chip's target is the dot's own circle and the pill flips
        // or nudges around it. It mattered — Owned's arc reaches |ndc x| 0.912
        // by construction, 0.008 from silently having no hotspot at all.
        const bx = h.radius ? 0.97 : 0.92;
        const by = h.radius ? 0.94 : 0.9;
        if (v.z > 1 || Math.abs(v.x) > bx || Math.abs(v.y) > by) {
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
      // What the FRAME can place, cached for the index's reachability rule
      // below. Deliberately `want` and not `vis`: `vis` is still climbing
      // through the arrival stagger for a second after a landing, and counting
      // that would have latched an index open on a desktop that places
      // everything perfectly well.
      h.placeable = want;
      if (want) {
        if (h.armAt === null) h.armAt = now + h.stagger * HOTSPOT_STAGGER_MS;
        if (dt === 0) h.a = 1;
        else if (now >= h.armAt) h.a += (1 - h.a) * Math.min(1, dt * HOTSPOT_IN_K);
        // Edge flip: the pill normally runs RIGHT of the dot, so a node near
        // the right edge would reveal a clipped label on hover (the dot is
        // placeable long before the label is). Mirror the pill about the dot
        // when it would overrun, compensating the translate so the DOT stays
        // exactly on its node. Hysteresis of 14px so a chip drifting on the
        // organism's sway cannot chatter between the two sides.
        const over = sx + h.pillW - 11 - (window.innerWidth - 12);
        const flip = (h.flipped ? over > -14 : over > 0) && sx - h.pillW + 21 > 0;
        if (flip !== h.flipped) { h.flipped = flip; h.btn.classList.toggle('flip', flip); }
        let tx = flip ? sx + 21 - h.pillW : sx;
        // Narrow viewports can leave a pill that fits on NEITHER side (a
        // 232px label anchored at x 160 of 375). Nudge it in, but never far:
        // past ~26px the dot stops reading as sitting on its node, and a
        // truthful dot with a clipped tail beats a chip pointing at nothing.
        const lo = 15, hi = window.innerWidth - 4 - h.pillW + 11;
        const want2 = hi >= lo ? Math.min(Math.max(tx, lo), hi) : tx;
        tx += Math.max(-26, Math.min(26, want2 - tx));
        // The transform itself is written AFTER the loop, once every placed
        // pill's rect is known — see the PILL COLLISION DODGE pass below.
        h.pendX = tx;
        // The pad is placed against the NODE, in the button's own coordinates,
        // so the flip above and the nudge above it move the label and leave
        // the target where the thing is drawn. (`margin: -11px 0 0 -11px` on
        // .j-hot is why the node sits at local (sx - tx + 11, 11).)
        if (h.radius) {
          const worldR = h.radius() || 0;
          if (worldR > 0) {
            const d = Math.max(0.05, viewDepth(w));
            h.hitRaw = worldR * (window.innerHeight * 0.5) / (d * tanHalf);
          }
          h.hitEl.style.setProperty('--j-hit-x', `${(sx - tx + 11).toFixed(1)}px`);
        }
        h.sx = sx; h.sy = sy;
      } else {
        h.hitRaw = 0;
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

    /* PILL COLLISION DODGE (2026-08-10). With every anchor now a static
       world point (see the 2026-08-10 addendum on the hover hold above), two
       resting pills can sit in permanent overlap: at 375x812 Inspire's lip
       anchors project 125 px apart while Arca's pill runs 168 px, so its tail
       lay across ArtCompute's dot (measured 43 x 11 px of rect overlap, the
       label text passing ~1 px above the dot). The dots are the truth — each
       marks a lit release lip — so the LABEL is what moves: the upper pill of
       an overlapping pair is raised just clear of the lower one, and the dot
       is pinned back onto its node by the compensating --j-dot-dy translate
       (the same one the hit pad's `top` reads, so pad and dot cannot
       disagree). Chips are processed bottom-of-frame first, each resolved
       against the already-final pills below it, which makes the pass exact in
       one sweep for any chain that raises upward. Pure in this frame's
       geometry — no eased state, so dt = 0 places the dodged frame outright
       and a ?p= deep link is bit-stable. It applies in every state — hover
       included — because with static anchors the dodge is itself static, so
       nothing ever shifts under a pointer; labelOnHover chips (Owned's
       faces) carry no resting pill, so they neither dodge nor cause one, and
       cross-chapter pairs never co-place (the copy gate is exclusive). */
    const placed = hotspots.filter(h => h.placeable && !h.labelOnHover);
    placed.sort((a, b) => b.sy - a.sy);          // bottom of the frame first
    const resolved = [];
    for (const h of placed) {
      let dy = 0;
      const x0 = h.pendX - 11, x1 = x0 + h.pillW;
      for (const f of resolved) {
        if (f.chapter !== h.chapter) continue;
        const fx0 = f.pendX - 11, fx1 = fx0 + f.pillW;
        if (x1 <= fx0 || fx1 <= x0) continue;
        const fTop = f.sy - 11 - f.dodgeY;
        const myBot = h.sy - 11 - dy + h.pillH;
        const need = myBot + HOTSPOT_DODGE_GAP - fTop;
        if (need > 0) dy = Math.min(dy + need, HOTSPOT_DODGE_MAX);
      }
      h.dodgeY = dy;
      resolved.push(h);
    }
    for (const h of hotspots) {
      if (!h.placeable) continue;
      h.btn.style.transform = `translate(${h.pendX}px, ${(h.sy - h.dodgeY).toFixed(1)}px)`;
      if (h.dodgeY !== h.dodgePrev) {
        h.dodgePrev = h.dodgeY;
        if (h.dodgeY) h.btn.style.setProperty('--j-dot-dy', `${h.dodgeY.toFixed(1)}px`);
        else h.btn.style.removeProperty('--j-dot-dy');
      }
    }

    /* HIT PAD SIZING, second pass — writes only, so it costs no reflow.
       A pad is as big as its node draws, with two limits:
         · it may never reach more than 48% of the way to the nearest other
           live pad, or two neighbours would fight over the same pixels and
           the answer would depend on DOM order rather than on aim;
         · a floor of 15 px, because a far node still has to be catchable —
           22 px (a 44 px target) under the same media query PL-1.4 uses, so
           the pad carries the touch minimum the pill no longer does there —
           and a ceiling of 56 px, because a foreground face that fills a
           sixth of the frame does not get to own a sixth of the pointer. */
    const padFloor = sheetQuery.matches ? 22 : 15;
    const padded = hotspots.filter(h => h.hitRaw > 0 && h.a > 0.015);
    for (const h of padded) {
      let cap = 56;
      for (const o of padded) {
        if (o === h) continue;
        cap = Math.min(cap, Math.hypot(o.sx - h.sx, o.sy - h.sy) * 0.48);
      }
      h.hitR = Math.max(padFloor, Math.min(h.hitRaw, cap));
      h.hitEl.style.setProperty('--j-hit', `${(h.hitR * 2).toFixed(1)}px`);
    }
    for (const h of hotspots) {
      if (h.hitRaw > 0 && h.a > 0.015) continue;
      if (h.hitR !== 0) { h.hitR = 0; h.hitEl.style.setProperty('--j-hit', '0px'); }
    }

    /* HOVER ZONES: scene-owned hover targets with no chip (report C). Same
       projection, same gate, none of the chip machinery. */
    for (const z of hoverZones) {
      const gate = eased[z.chapter] || 0;
      let live = gate > 0.72 && !detail;
      if (live) {
        const w = z.world();
        const v = w ? w.clone().project(camera) : null;
        if (!v || v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) live = false;
        else {
          const d = Math.max(0.05, viewDepth(w));
          const r = Math.max(18, Math.min(140, z.radius * (window.innerHeight * 0.5) / (d * tanHalf)));
          const zx = (v.x * 0.5 + 0.5) * window.innerWidth;
          const zy = (-v.y * 0.5 + 0.5) * window.innerHeight;
          z.el.style.transform = `translate(${(zx - r).toFixed(1)}px, ${(zy - r).toFixed(1)}px)`;
          z.el.style.width = z.el.style.height = `${(r * 2).toFixed(1)}px`;
          z.r = r;
        }
      }
      if (live !== z.live) {
        z.live = live;
        z.el.classList.toggle('vis', live);
        if (!live && z.hot) { z.hot = false; z.onHot(false); }
      }
    }

    // The popover is anchored to a chip that is itself world-tracked, so it has
    // to be re-placed every frame or it would lag the organism's sway. If its
    // chip has left the frame (travel, suppression behind copy, a modal card),
    // the popover goes with it — an annotation with nothing to annotate.
    if (popNode) {
      if (!popNode.btn.classList.contains('vis')) hidePop();
      else placePop();
    }
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
    update, addHotspot, addHoverZone, openCard, closeCard, rail,
    armCopyEntry, cancelCopyEntry,
    /** QA: the chapter whose copy is mid-entry, or null. */
    get arrivingChapter() { return arrive ? arrive.id : null; },
    get cardOpen() { return cardIsOpen; },
    /** QA: is the card currently in its bottom-sheet form? */
    get cardIsSheet() { return card.classList.contains('sheet'); },
    /** QA: the touch-armed (first-tap) hotspot id, or null. */
    get armedNode() { return armed ? armed.id : null; },
    /** QA: the node whose popover is showing, or null. */
    get popNode() { return popNode && pop.classList.contains('open') ? popNode.id : null; },
    /** QA: is that popover pinned (committed) rather than a hover reveal? */
    get popPinned() { return popPinned; },
    card,
    pop,
    hotspots,
  };
}
