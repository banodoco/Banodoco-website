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
import { CARD_BUILDERS, CARD_ICONS } from './cards/index.js';
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
  // `:not(.bare)` throughout (2026-08-14): a BARE chip has no label to reveal
  // and no pill to light — ui.js has deleted both from the DOM. Without the
  // guard the lit-background rule still applies to it, and only fails to paint
  // because the box happens to be empty; that is a rule waiting to reappear the
  // first time anything is put back inside the button. The chip is bare here
  // too, not merely bare in the stylesheet.
  s.textContent = [
    '.j-hot.label-hover { background: transparent; }',
    '.j-hot.label-hover:not(.bare) > * { opacity: 0; transition: opacity 0.3s; }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) { background: rgba(18, 12, 4, 0.6); }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) > * { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) { .j-hot.label-hover:not(.bare) > * { transition: none; } }',
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

/** `project` is the scene's `steadyProject` — a `Vector3.project(camera)` that
 *  has the renderer's per-frame TAA jitter taken back out. Every world-to-
 *  screen step in here goes through it rather than through `project()`: this
 *  module PINS DOM to world points, and it runs during the animator phase,
 *  which is a frame before taaFrame() rewrites the offset. Reading the raw
 *  matrix therefore fed a stale sub-pixel Halton offset straight into the chip
 *  transforms — measured 0.650 x 0.622 px of period-8 tremor on a bit-static
 *  camera, which is Hannah's "shuddering/shivering in place" (2026-08-12).
 *  Optional so an isolated harness can still construct the UI; without it the
 *  chips fall back to the jittering projection they had before. */
export function createUI({ onNav, onOpen, onClose, isDetailOpen, project }) {
  const projectStable = project
    ? (v) => project(v)                 // scene-owned, jitter-free
    : (v, cam) => v.project(cam);       // harness fallback: THREE's own
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

  // THE HERO CALLOUTS ARE NOT OURS (2026-08-12). Their tab order used to be
  // decided here, from a second threshold on raw `p` — which is how three
  // invisible links stayed tabbable for the whole length of a nav jump, the
  // a11y half of the flash Hannah reported. The whole Mission composition
  // (callouts, scrim, spill: opacity, hit tree AND tab order) now has one
  // owner, journey.js's paintHeroFurniture — see THE HERO FURNITURE block
  // there. Nothing about the callouts is written from this module any more.

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
     THE CHAPTER ACTION ROW (Hannah, 2026-08-07; halved 2026-08-13)

     "there should be a button that says 'Learn more', and then next to it
      there should be like a remix button ... make them work nicely together"
                                                            — 2026-08-07

     "remove the visible Remix button ... that existing [crown light-flash]
      interaction should take over the Remix behaviour ... integrated into the
      scene rather than exposed as a separate UI control."
                                                            — 2026-08-13

     So the row that shipped as a PAIR is a row of one. What went is the whole
     `kind: 'button'` limb: the in-copy button, its three-node glyph, and the
     busy/announce plumbing that served it. None of it is orphaned here — the
     trigger contract it was written around moved WHOLESALE to addHoverZone
     below, which is now the only thing in the build that pulls a chapter's
     `trigger()` from a control. Keeping a second, clientless copy of it in
     this function would be dead code pretending to be generality.

     What remains: a chapter that declares `actions` in content/content.js
     gets a row of destinations under its copy. Nothing here names a chapter:
     the content says WHAT the controls are, this says HOW they are built,
     journey/site.css says how they look.

     ---- semantics ----

     A spec is a real <a href>, never a div, so "open in new tab" comes for
     free. They sit in the DOM in the order content declares, which is
     therefore the tab order, and they are inside the copy block so Tab
     reaches them straight after the prose they belong to and before the
     scene's own controls (the crown zone, then the hotspot layer) that follow
     the block in the DOM.

     ---- reachability ----

     `.j-copy` is pointer-events:none wholesale, so the row opts back in — and
     only the PILLS do, not the row's box, which is why the space around them
     is not a live surface sitting over the portrait field. The row is also
     `inert` unless its block is more than half faded in (see paintCopy): a
     block at opacity 0.08 mid-travel must not be clickable or tabbable, and
     `visibility:hidden` alone only covers the last 0.2% of that fade.
     ========================================================================== */

  function buildActions(chapterId, specs) {
    const row = el('div', 'j-actions');
    // The row is furniture around named controls, not a landmark and not a
    // list — it carries no role. Its children carry the whole meaning.
    for (const spec of specs) {
      // Anything that is not a destination belongs in the SCENE now, not in
      // the copy — see the 2026-08-13 section of 20-owned-root-network.md.
      if (spec.kind !== 'link') continue;
      const node = el('a', `j-act j-act-${spec.weight || 'primary'}`);
      node.href = spec.href || '#';
      if (spec.id) node.dataset.action = spec.id;
      node.appendChild(el('span', 'j-act-t', spec.label));
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
     model whole — journey.js still funnels this through openCard(), and still
     closes on Escape / a press outside / scroll-intent. A deep link therefore
     lands on the same thing a click produces, which the split-vessel option
     could not offer. (It USED to write #/chapter/node and push a history entry
     the close would spend with Back. Neither happens as of 2026-08-11: the
     ride writes nothing to the URL, so every close is direct — journey.js
     closeDetail.)

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

  function stageFor(nodeId) {
    if (stageCache.has(nodeId)) return stageCache.get(nodeId);
    const builder = CARD_BUILDERS[nodeId];
    if (!builder) { stageCache.set(nodeId, null); return null; }
    const stageEl = el('div', 'j-pop-stage');
    builder.build(stageEl, CONTENT.nodes[nodeId]);
    const entry = { el: stageEl, builder };
    stageCache.set(nodeId, entry);
    return entry;
  }

  function setStage(nodeId) {
    const next = stageFor(nodeId);
    if (activeStage === next) return;
    if (activeStage) {
      activeStage.builder.deactivate();
      activeStage.el.remove();
    }
    activeStage = next;
    if (next) {
      pop.prepend(next.el);
      pop.classList.add('j-pop-rich');
      pop.dataset.node = nodeId;
    } else {
      pop.classList.remove('j-pop-rich');
      delete pop.dataset.node;
    }
  }
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

  /** hottest()'s twin for the CARD (2026-08-14). Same tie-break — the
   *  visitor's last action is the one they are waiting on — and the same
   *  content-derived eligibility, read the other way round: a chip with no
   *  `short` line has no popover to show, so what it discloses is its card.
   *  That selects Owned's sixteen contributors and nothing else in this build,
   *  without naming a chapter or a node id. */
  function hottestCard() {
    let best = null;
    for (const h of hotspots) {
      if (!h.hot || h.preview) continue;
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
    // Place BEFORE arming the entry: the unfurl's direction comes from
    // `data-side`, so the side has to be decided while the animation is still
    // absent, or the first frame wipes the wrong way and corrects itself.
    placePop();
    if (fresh) runPopEntry();
    // fresh reveal -> let the stage run its motion (no-op when reduced)
    if (fresh && activeStage) activeStage.builder.activate();
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
    if (activeStage) activeStage.builder.deactivate();
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
    popExitTimer = setTimeout(() => {
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
    // besides Escape). Routed through onClose() so journey.js unwinds its own
    // detail state with it.
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
      if (h.labelEl) h.labelEl.textContent = pol.label;
    }
    /* `chip: 'none'` — THE CHIP PAINTS NOTHING, EVER (2026-08-14, Hannah:
       "there are now two things that show on the orbs upon hover, can you
       please delete the smaller ones, we should only keep the black one
       above").

       The smaller of the two was this chip: a dark pill carrying a gold dot
       and "CONTRIBUTOR · RESEARCHER", revealed on hover by `labelOnHover`.
       It long predates the card's transient tier — it is the label policy this
       function has always applied — but the two only ever showed TOGETHER as
       of 2026-08-14, and the panel says both of the things the pill did.

       DELETED, not hidden: the label and the dot come out of the DOM, so there
       is no invisible text left in the a11y tree and no element left painting
       zero pixels. What stays is everything that was never visible in the
       first place — the button (the tab stop), its `aria-label` (the whole
       accessible name, which never depended on the label being drawn), and the
       hit pad, which IS the target and always was (696e95d). The chip is now
       what a hover zone is: a control with no pixels of its own, answering for
       a thing the scene draws.

       Per-node, through the policy a chapter already owns, so this is an
       OWNED-ONLY removal: Inspire's and Connect's chips declare no policy at
       all, keep their resting pills, and are untouched — verified by their
       label boxes still measuring their full width. */
    if (pol.chip === 'none') {
      h.chipBare = true;
      h.btn.classList.add('bare');
      if (h.labelEl) { h.labelEl.remove(); h.labelEl = null; }
      if (h.dotEl) { h.dotEl.remove(); h.dotEl = null; }
    }
    // A bare chip draws nothing at rest either, so it is `labelOnHover` in
    // every sense the rest of this file uses the flag for — the collision
    // dodge skips it, and the arrival stagger does not queue it.
    h.labelOnHover = !!pol.labelOnHover || h.chipBare;
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
  function addHotspot({ id, chapter, label, world, labelOnHover, radius, reveal }) {
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
    const dotEl = el('i', 'j-hot-dot');
    // initiative chips carry their own pictograph in the dot's slot (same
    // footprint, same --j-dot-dy pin — see cards/index.js CARD_ICONS);
    // everything else keeps the plain ember dot
    if (CARD_ICONS[id]) {
      dotEl.classList.add('j-hot-ico');
      dotEl.innerHTML = CARD_ICONS[id];
    }
    btn.appendChild(dotEl);
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
      // Per-node scene gate (2026-08-16): when a chapter supplies one, this
      // chip arrives with what the scene DRAWS for its node (Connect: the
      // hub's own light landing) instead of with the chapter's eased copy.
      // The copy band keeps only its close edge for these — see the gate in
      // the placement loop.
      reveal: typeof reveal === 'function' ? reveal : null,
      // ...and the band that close edge is read from, built once — the
      // placement loop runs per frame and COPY_BANDS never moves after load.
      revealBand: COPY_BANDS[chapter]
        ? { lo: -1, hi: COPY_BANDS[chapter].hi } : { lo: -1, hi: 2 },
      hitEl, hitR: 0, padLast: 0, dotEl, chipBare: false,
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
      // ...and the same for the card's own dismissal (2026-08-14). A close is
      // of that one reveal, not of the person. A dismissal the POINTER is
      // parked on is exempt — it is re-armed by a real pointer move off the
      // chip instead; see cardDismissBtn.
      if (!on && cardDismissed === h.id && !cardDismissBtn) cardDismissed = null;
      // The popover keys off the SAME `hot` state that lights the chip, which
      // is what buys hover / keyboard-focus / touch-armed parity for free.
      syncPop();
      // The card now does too. Which of the two answers is decided by content
      // (a `short` line or not), never by chapter — see hottestCard().
      syncCard();
    };

    btn.addEventListener('pointerdown', (e) => { h.pointer = e.pointerType || 'mouse'; });
    btn.addEventListener('click', () => {
      const via = h.pointer;
      h.pointer = null;
      /* THE FIRST TAP, and what it is for (amended 2026-08-14).

         The arm-then-commit dance exists to give a finger the transient reveal
         a mouse gets from hovering: tap once to SEE the popover, tap again to
         commit it. That is worth two taps when the first one shows you
         something you could otherwise never see.

         A CARD chip's transient tier is now the hover tier (see THE CARD'S TWO
         TIERS above), and it is switched off on a coarse pointer — so on touch
         the first tap would arm a state with nothing to show, and the panel
         would still cost a second tap. Worse, the committed card is a bottom
         sheet on a phone: it fills the lower third, and on a 375-wide frame
         where only two to four faces are placed at all, the sheet can land
         over the very chip you would have to tap again.

         So a tap on a card chip goes STRAIGHT to the commit. Popover chips
         keep the two-tap model exactly as shipped — their first tap still
         earns its keep. */
      if (via === 'touch' && armed !== h && h.preview) {
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

  /* ==========================================================================
     HOVER ZONES (report C, 2026-08-06) — and the crown's COMMIT (2026-08-13)

     A piece of the SCENE that answers the visitor directly, with no chip and
     no label. The crown of Owned's root network is the first and only one:
     hovering it runs the wave through the whole system, which is the response
     that used to fire off a prose line in the middle of the frame every time
     a pointer crossed it on the way somewhere else.

     Still not a hotspot: a hotspot is a named node with a card behind it and
     a place in the narrative registration order. A zone is a place.

     ---- WHAT CHANGED, AND WHY THE MODEL IS WHAT IT IS -------------------

     Hannah, 2026-08-13: "remove the visible Remix button ... that existing
     [light-flash] interaction should take over the Remix behaviour ... so it
     feels integrated into the scene rather than exposed as a separate UI
     control."

     A zone may now declare an `action`. When it does it is a real control and
     gets three things it did not have: a <button> element, an accessible
     name, and the trigger contract the retired copy-level button used —
     `{ announce?, busyMs? }`, where `announce` goes to the polite live region
     (a scene change with no focus move is otherwise silent) and `busyMs`
     refuses a second commit for exactly as long as the field is turning over.

     THE LIGHT AND THE COMMIT ARE NOT THE SAME EVENT, and that is the one real
     judgement in here. The literal reading — re-deal on `pointerenter` — was
     measured and rejected: the crown zone is a 246 px circle pinned to the
     TOP-CENTRE of the frame (y -87..159 at 1440x900), i.e. exactly the band a
     pointer crosses on its way to the window chrome, the wordmark, or the
     rail, and a 1250 ms sixteen-face swap fired by every idle pass over the
     top of the page is a page that will not sit still. So:

       · ENTER lights the colony immediately, unchanged. That is the answer
         to the hover and it stays instant and free.
       · STAYING commits the re-deal, after `ZONE_DWELL_MS` inside the zone.
         A pointer crossing the top of the page is gone long before that; a
         pointer still on the crown has chosen it.

         THE STILLNESS TEST WAS REMOVED (Hannah, 2026-08-16: the switcher
         "doesn't seem to work consistently ... it should just be one hover per
         switch"). It required 260 ms with under 3 px of movement, and 3 px is
         less than a resting hand — so whether a hover committed depended on
         how steady the visitor's grip was, which is exactly the inconsistency
         she is describing. Worse, it fails SILENTLY: an unsteady pointer sits
         on a lit crown while nothing happens, so the light says yes and the
         field says no. A dwell floor alone rejects pass-throughs just as well
         and has one outcome per visit that the visitor can predict.
       · A PRESS commits it at once, and that is the whole touch story: there
         is no hover on a finger, so a tap is enter+commit in one gesture —
         it fires the colony light itself and then the swap. The retired pill
         was the only route on touch; the crown replaces it one-for-one.
       · ENTER / SPACE commit it from the keyboard, for free, because it is a
         real <button>. Focus lights the colony exactly as hover does, so the
         keyboard's feedback is the pointer's feedback.

     ONE COMMIT PER VISIT. After a re-deal the zone will not fire again until
     the pointer leaves and returns (or the visitor presses). A pointer parked
     on the crown watching the wave land must not be handed a second wave.

     ---- stacking ----

     Zones live in their OWN fixed host, at z-index 0, deliberately BELOW the
     hero's `.ui` layer (z-index 1). The chips' host is also z-index 1, so a
     chip still outranks the zone. This matters: the crown zone is 246 px
     across at 1440x900 and page furniture sits inside it. In the hotspot host
     it swallowed the links it covered (measured — elementFromPoint over
     "Connect" returned the zone). Anything the page offers you outranks the
     scenery, and that is still true now that the scenery has a job.

     ---- tab order ----

     The host is inserted BEFORE the hotspot host so the crown lands where the
     Remix pill landed: after the chapter copy it belongs to, ahead of the
     sixteen contributors. Stacking is by explicit z-index, not DOM order, so
     moving it changes nothing about what paints over what.
     ========================================================================== */
  /** Time inside the zone before a hover commits. The only test there is:
   *  340 ms is longer than a pointer crossing the top of the frame on its way
   *  somewhere else, and short enough that a visitor who meant it does not
   *  wonder whether the control is broken. (Was 380 ms plus a stillness test;
   *  see the note above for why the stillness half is gone.) */
  const ZONE_DWELL_MS = 340;
  const zoneHost = el('div', 'j-hotzones');
  document.body.insertBefore(zoneHost, hotHost);
  const hoverZones = [];
  function addHoverZone({ id, chapter, world, radius, onHot, action, label, announce: fallback }) {
    const act = typeof action === 'function' ? action : null;
    const zEl = el(act ? 'button' : 'i', 'j-hotzone');
    if (act) {
      zEl.type = 'button';
      zEl.setAttribute('aria-label', label || id);
    } else {
      // scenery: never in the a11y tree, never in the tab order
      zEl.setAttribute('aria-hidden', 'true');
    }
    zoneHost.appendChild(zEl);
    const z = { id, chapter, world, radius: radius || 0.3, onHot, el: zEl, live: false, hot: false, r: 0 };

    /** The light. Idempotent per visit — `hot` is the latch. */
    function light(on) {
      if (z.hot === on) return;
      z.hot = on;
      z.onHot(on);
    }

    if (act) {
      let busyUntil = 0;
      let busyTimer = null;
      let dwellTimer = null;
      let enteredAt = 0;
      let spent = false;              // one commit per visit — see above
      let lastPointerType = '';

      const stopDwell = () => {
        if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
      };

      function fire() {
        stopDwell();
        // BUSY IS CHECKED BEFORE THE VISIT IS SPENT (2026-08-16). It used to
        // spend first, so a hover arriving during the 1250 ms swap burned the
        // visit and did nothing — the visitor then had to leave and come back
        // to get any response at all, which read as the control ignoring them
        // at random. Refusing without spending means the gesture simply has no
        // effect while a swap is already running, which is the truth: a switch
        // is in flight. Nothing reschedules, so this cannot fire late either.
        if (performance.now() < busyUntil) return;
        spent = true;
        const res = act();
        // The chapter refuses while its own transition is running; that is
        // its call to make, and it is not an error.
        if (!res) return;
        const msg = (res && typeof res.announce === 'string') ? res.announce : fallback;
        if (msg) announce(msg);
        const ms = (res && typeof res.busyMs === 'number') ? res.busyMs : 0;
        if (ms > 0) {
          busyUntil = performance.now() + ms;
          // aria-disabled, NOT the `disabled` attribute. A real `disabled`
          // blurs the element the instant it is set, so a keyboard visitor
          // who pressed Enter would be thrown back to <body>. This keeps
          // focus where the visitor put it and says "not now" to AT; the
          // guard above is what actually refuses the second commit.
          zEl.setAttribute('aria-disabled', 'true');
          if (busyTimer) clearTimeout(busyTimer);
          busyTimer = setTimeout(() => {
            busyTimer = null;
            zEl.removeAttribute('aria-disabled');
          }, ms);
        }
      }

      /** Poll rather than one timer: "still for N ms" is a moving deadline,
       *  and re-arming a timeout on every pointermove would be a timer per
       *  mouse event. 90 ms is far below the windows it is testing. */
      function watch() {
        dwellTimer = null;
        if (!z.hot || spent) return;
        if (performance.now() - enteredAt >= ZONE_DWELL_MS) {
          fire();
          return;
        }
        dwellTimer = setTimeout(watch, 90);
      }

      zEl.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        light(true);
        enteredAt = performance.now();
        spent = false;
        stopDwell();
        dwellTimer = setTimeout(watch, 90);
      });
      zEl.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        stopDwell();
        spent = false;                   // leaving re-arms the next visit
        light(false);
      });
      zEl.addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType; });
      // click covers mouse, pen, tap AND Enter/Space on the <button>.
      zEl.addEventListener('click', () => {
        // A finger has no hover, so the tap has to bring the light with it —
        // and the crown's own response is a one-shot wave, so firing it here
        // is exactly the gesture a mouse gets on entry. Keyboard gets its
        // light from focus (below), so only touch needs this.
        if (lastPointerType === 'touch') { z.hot = false; light(true); }
        lastPointerType = '';
        // ONE COMMIT PER VISIT INCLUDES THE CLICK (2026-08-16). This used to
        // call fire() unconditionally, so a mouse visitor whose hover had
        // already committed got a SECOND re-deal the moment they clicked the
        // thing they were looking at — two swaps from one gesture, the
        // "contradictory effects" in Hannah's report. `spent` is false on
        // touch (no hover ever happened) and false for a keyboard press that
        // did not dwell, so both of those still commit exactly once.
        if (spent) return;
        fire();
      });
      // Focus is hover's equal (PL-2.2): the colony lights for a keyboard
      // exactly as it does for a pointer, which is also this control's
      // visible focus response out in the scene. The ring on the zone itself
      // (journey/site.css) is the DOM half of the same statement.
      zEl.addEventListener('focus', () => { light(true); });
      zEl.addEventListener('blur', () => { stopDwell(); spent = false; light(false); });
      // A zone that goes off-frame or off-chapter mid-commit must not leave a
      // timer running against an element nobody can reach.
      z.dismiss = () => { stopDwell(); spent = false; };
    } else {
      zEl.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        light(true);
      });
      zEl.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        light(false);
      });
    }

    hoverZones.push(z);
    return z;
  }

  /* ==========================================================================
     THE DETAIL CARD (W3-A) — ANCHORED TO ITS NODE (Hannah, 2026-08-13)

     "When clicking a contributor in Owned by the Ecosystem, the associated
      information box currently appears far off to the right. Instead, the box
      should feel spatially connected to the person the user clicked ...
      directly above or very close to that specific contributor, with sensible
      collision handling ... The user should immediately understand which
      contributor the information belongs to without having to visually
      connect two distant parts of the screen."

     The card was pinned at `right: 3.4vw; top: 50%` — a fixed slab on the far
     flank, 400 px wide, with no relationship to the face that opened it. On a
     field of SIXTEEN people whose card headings all read "Contributor" (every
     one anonymous until the consent pipeline lands, CO-1.4 / OW-4.4),
     position was never a nicety: it is the ONLY thing on screen that says
     which of the sixteen you are reading about.

     ---- this is placePop's job, not a new one ----

     e20f7ff already solved "anchor a panel beside a world-tracked chip,
     flip rather than clip, never cover the thing it belongs to" for the
     popover. `placeCard()` below is that function's shape with three
     differences, each forced by what a card is:

       1. IT ANCHORS TO THE NODE, NOT TO THE CHIP'S BOX. A popover hangs off a
          live chip rect. While a card is open every chip is faded out and
          non-placeable by design ("the frame belongs to the detail"), so
          there is no rect to read — and the pill's box was never the right
          anchor anyway (696e95d: the pill is a 300 px bar lying beside an
          18-50 px disc). So the card is placed against the NODE'S OWN
          PROJECTION and its drawn radius, through `steadyProject` — the
          jitter-free projection the chips use (851c77a / 7e256aa / d46e6bb),
          because anything pinned to a node that reads the raw matrix inherits
          a 0.65 px period-8 tremor.
       2. ABOVE IS PREFERRED, NOT BESIDE. Hannah asked for above; it is also
          the right default for a 400 px panel over a face in an arc that
          spreads horizontally — a card beside an edge face has nowhere to go,
          a card above one usually does.
       3. THE FALLBACK LADDER IS FOUR DEEP, not three: above -> below ->
          right -> left, each admitted only if it FITS whole, then a last
          resort that takes the roomier of above/below and clamps. Every one
          of the first four is disjoint from the node's disc by construction,
          so the "never covers its own subject" guarantee survives the clamp
          exactly as it does for the popover.

     ---- what is NOT changed ----

     Everything that makes this a modal disclosure: `role="dialog"` +
     `aria-modal`, the focus trap, focus moved in on open and RETURNED to the
     trigger on close, Escape, `aria-expanded` on the chip, the polite live
     region, and `claimInput(card, { modal: true })` so the sheet scrolls
     natively instead of being scrubbed. Placement is a transform; none of it
     knows or cares where the box is.

     And the BOTTOM SHEET (PL-1.3) is untouched. On a coarse pointer or a
     narrow viewport the card is still a sheet from the bottom edge with a
     grab handle, and `placeCard()` declines outright when `.sheet` is set.
     That is not an omission: a sheet on a phone is already unambiguous —
     it fills the frame's bottom third the instant you tap, there is no "far
     off to the right" to fix — and it carries the drag-to-dismiss gesture,
     the 44 px handle and the internal scroll that a 315 px floating panel
     would have to give up. Hannah's report is about the desktop side card,
     and so is the fix.
     ========================================================================== */
  /** Clearance between the node's own disc and the card's box. Wider than
   *  POP_GAP (12) because the thing being cleared here is a lit face with an
   *  ember ring and a fray, not a 9 px dot. */
  const CARD_GAP = 16;
  /** Hard minimum from any viewport edge. */
  const CARD_MARGIN = 12;
  /** The entry runs while `.j-card-enter` is set and no longer — same
   *  reasoning as POP_ENTER_MS: `data-side` is re-decided every frame from
   *  live geometry, and a card drifting across a flip threshold with the
   *  class still on would replay the whole wipe at rest. Covers the 0.62 s
   *  filament with air. */
  const CARD_ENTER_MS = 700;

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
       · `aria-expanded`. It tracks the COMMITTED state only (see pinnedNode
         below), exactly as it does for the popover — a hover reveal is not a
         disclosure the visitor has opened.

     WHAT DID move onto hover, beyond the panel itself: the chapter's own
     SELECTED treatment (notifySelect -> portraits.setSelected, the ember-rim
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
     Enter/Space, deep link (placeAt -> openDetail), an inbound route
     (handleRoute), Escape, a press outside, and the scroll-intent close.
     Nothing else needs to know about selection.

     Chapter modules are reached through window.journey's public handle,
     because journey.js is read-only in this lane and does not pass them to
     createUI(). */
  let selectedNode = null;
  /* The COMMITTED disclosure — a pinned popover or a pinned card — as opposed
     to `selectedNode`, which is the node currently wearing the chapter's
     selected LIGHT and is set by a transient hover reveal too. The two were
     one variable until the card grew its transient tier (2026-08-14): the
     visual selection follows the reveal, `aria-expanded` follows the commit,
     and conflating them would have announced every passing mouse as an opened
     disclosure. */
  let pinnedNode = null;

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

  /** a11y debt #5: exactly the hotspot whose disclosure is COMMITTED reports
   *  expanded. Driven off `pinnedNode`, so it is correct for every commit path
   *  — click, key, deep link, inbound route — and stays false through a
   *  transient hover/focus reveal, which is not a disclosure the visitor has
   *  opened. (It read `selectedNode` until 2026-08-14, when that variable
   *  became the visual selection and started following hover.) */
  function syncExpanded() {
    for (const h of hotspots) {
      h.btn.setAttribute('aria-expanded', h.id === pinnedNode ? 'true' : 'false');
    }
  }

  /** Commit the popover for `h`: it stays until Escape, a scroll intent,
   *  another node, or a press outside. journey.js drives this through
   *  openCard() below, so every close behaves exactly as it does for the
   *  card. */
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
    pinnedNode = h.id;
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

  /* ---------------- the card's anchor ----------------
     `frameGeom` is the one thing placeCard() cannot work out for itself: the
     camera and the frame's projection scale. update() owns both and rewrites
     this closure every frame, which also means the card is placed from
     EXACTLY the geometry the chips were placed from on the same frame — one
     source of truth, no second projection path to drift out of step.
     openCard() can therefore place the card on the tick it opens, before the
     first paint, using the last frame's geometry (sub-pixel stale at worst,
     and the next frame corrects it). */
  let frameGeom = null;
  let cardAnchor = null;        // the hotspot whose node the card belongs to
  let cardEnterTimer = null;

  /** Where the card's subject is on screen this frame, and how big it draws.
   *  null when there is no anchor at all; `behind` when the node is on the
   *  far side of the lens, which is the one case with no honest direction to
   *  point in. Off-frame but in front is NOT null — the point is clamped to
   *  the frame edge, so the card meets the visitor at the edge the person is
   *  beyond rather than jumping back to a corner that means nothing. */
  function anchorPoint() {
    if (!cardAnchor || !frameGeom || typeof cardAnchor.world !== 'function') return null;
    const w = cardAnchor.world();
    if (!w) return null;
    const g = frameGeom;
    const v = projectStable(w.clone(), g.camera);
    if (v.z > 1) return { behind: true };
    let r = 24;
    if (cardAnchor.radius) {
      const wr = cardAnchor.radius() || 0;
      if (wr > 0) r = wr * (window.innerHeight * 0.5) / (Math.max(0.05, g.viewDepth(w)) * g.tanHalf);
    }
    // The same ceiling the hit pads take: a foreground face that fills a
    // sixth of the frame does not get to push the card a sixth of the frame
    // away from itself.
    r = Math.max(14, Math.min(56, r));
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = (v.x * 0.5 + 0.5) * vw;
    const y = (-v.y * 0.5 + 0.5) * vh;
    const cx = Math.min(Math.max(x, CARD_MARGIN + r), Math.max(CARD_MARGIN + r, vw - CARD_MARGIN - r));
    const cy = Math.min(Math.max(y, CARD_MARGIN + r), Math.max(CARD_MARGIN + r, vh - CARD_MARGIN - r));
    return { x: cx, y: cy, r, offFrame: cx !== x || cy !== y };
  }

  /** Place the card against its node. A no-op for the sheet, which owns its
   *  own geometry (PL-1.3), and for a card with no anchor to speak of, which
   *  keeps the pre-2026-08-13 flank position as its honest fallback. */
  function placeCard() {
    if (!cardIsOpen || card.classList.contains('sheet')) return;
    const a = anchorPoint();
    if (!a || a.behind) {
      // No direction to point in. Sit on the flank exactly where the card sat
      // before this pass — a deep link to a node the current pose does not
      // show has nothing to be near, and pretending otherwise would put the
      // card at an arbitrary edge.
      const p0 = card.getBoundingClientRect();
      card.dataset.side = 'flank';
      card.style.transform = `translate(${Math.round(window.innerWidth * 0.966 - p0.width)}px, ${Math.round((window.innerHeight - p0.height) / 2)}px)`;
      card.style.removeProperty('--j-card-fx');
      card.style.removeProperty('--j-card-fy');
      return;
    }
    const p = card.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const xCentred = clamp(a.x - p.width / 2, CARD_MARGIN,
      Math.max(CARD_MARGIN, vw - CARD_MARGIN - p.width));
    const yCentred = clamp(a.y - p.height / 2, CARD_MARGIN,
      Math.max(CARD_MARGIN, vh - CARD_MARGIN - p.height));

    // The ladder. Each rung is admitted only if the whole box fits, and each
    // of the four is DISJOINT from the node's disc by construction — so the
    // clamp on the other axis can never slide the card over its own subject.
    const aboveY = a.y - a.r - CARD_GAP - p.height;
    const belowY = a.y + a.r + CARD_GAP;
    const rightX = a.x + a.r + CARD_GAP;
    const leftX = a.x - a.r - CARD_GAP - p.width;
    let side, x, y;
    if (aboveY >= CARD_MARGIN) {
      side = 'above'; x = xCentred; y = aboveY;
    } else if (belowY + p.height <= vh - CARD_MARGIN) {
      side = 'below'; x = xCentred; y = belowY;
    } else if (rightX + p.width <= vw - CARD_MARGIN) {
      side = 'right'; x = rightX; y = yCentred;
    } else if (leftX >= CARD_MARGIN) {
      side = 'left'; x = leftX; y = yCentred;
    } else {
      // Nowhere fits whole — a card taller than the room above AND below and
      // wider than the room either side. Take the roomier of above/below and
      // clamp into the frame: staying READABLE and on-screen outranks staying
      // clear, and this is the only rung that can overlap.
      const roomAbove = a.y - a.r, roomBelow = vh - (a.y + a.r);
      side = roomAbove >= roomBelow ? 'above' : 'below';
      x = xCentred;
      y = clamp(side === 'above' ? aboveY : belowY, CARD_MARGIN,
        Math.max(CARD_MARGIN, vh - CARD_MARGIN - p.height));
    }

    card.dataset.side = side;
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    // Where the node is IN THE CARD'S OWN BOX, so the contact filament can be
    // a short segment pointing at the person rather than a rule along the
    // whole edge. It matters most in exactly the case the edge rule would
    // fail: a node near a frame edge whose card has been clamped sideways, so
    // the card's centre is no longer over its subject.
    card.style.setProperty('--j-card-fx', `${clamp(a.x - x, 12, Math.max(12, p.width - 12)).toFixed(1)}px`);
    card.style.setProperty('--j-card-fy', `${clamp(a.y - y, 12, Math.max(12, p.height - 12)).toFixed(1)}px`);
  }

  /** The entry, in the popover's motion family (e20f7ff / d1ecc23): the
   *  vessel's LIGHT and its EXTENT as two statements, plus the contact
   *  filament on the edge that faces the node. Armed only on a FRESH open —
   *  a retarget from one contributor straight to the next re-arms it,
   *  because that IS a fresh subject. */
  function runCardEntry() {
    if (cardEnterTimer) clearTimeout(cardEnterTimer);
    if (card.classList.contains('j-card-enter')) {
      card.classList.remove('j-card-enter');
      void card.offsetWidth;
    }
    card.classList.add('j-card-enter');
    cardEnterTimer = setTimeout(() => {
      cardEnterTimer = null;
      card.classList.remove('j-card-enter');
    }, CARD_ENTER_MS);
  }

  function stopCardEntry() {
    if (cardEnterTimer) { clearTimeout(cardEnterTimer); cardEnterTimer = null; }
    card.classList.remove('j-card-enter');
  }

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
    // Nodes that carry a popover are disclosed BESIDE their chip, never in the
    // card — see the POPOVER block above for why the card is not also offered.
    const ph = hotspots.find(x => x.id === nodeId && x.preview);
    if (ph) return pinned ? pinPop(ph, trigger) : false;
    // anything still using the card (contributor profiles) takes the frame back
    if (pinned && popPinned) unpinPop({ restoreFocus: false });
    const node = CONTENT.nodes[nodeId]
      || CONTENT.contributors.find(c => c.id === nodeId);
    if (!node) return false;
    const retarget = cardIsOpen && cardNodeId !== nodeId;
    // A reveal is FRESH when the box is landing on a node it was not already
    // showing, or when it was shut — showPop()'s own test, so a tier change on
    // the same subject (hover, then click to pin) re-uses the panel in place
    // instead of replaying the unfurl at rest.
    const fresh = !cardIsOpen || cardNodeId !== nodeId;
    const d = node.spotlight || node.card
      // contributor rows have no card block: everyone is the anonymous ember
      // fallback until the consent pipeline lands (CO-1.4 / OW-4.4)
      || (node.role ? { title: node.name, body: [node.role, node.blurb] } : null)
      || { title: node.label, body: [node.short] };
    if (fresh) {
      cardBody.textContent = '';
      const h = el('h3', 'j-card-h', d.title || node.label);
      h.id = 'j-card-h';
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
    // Place BEFORE the flush and before `.open`, exactly as showPop() places
    // before arming its entry: the unfurl's direction comes from `data-side`,
    // so the side has to be decided while the animation is still absent, or
    // the first frame wipes the wrong way and corrects itself.
    placeCard();
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
    // NOT for the sheet — its entry is the shipped PL-1.3 one, and an unfurl
    // with a contact filament on a panel that is anchored to the bottom edge
    // rather than to a face would be pointing at nothing.
    if (fresh && !card.classList.contains('sheet')) runCardEntry();
    // retargeting an open card (one hotspot straight to the next) must release
    // the previous node before lighting the new one. BOTH tiers do this: the
    // chapter's selected light is the visual half of the reveal, and Hannah
    // asked for the full click-state treatment on hover.
    if (selectedNode && selectedNode !== nodeId) notifySelect(selectedNode, false);
    selectedNode = nodeId;
    notifySelect(nodeId, true);
    pinnedNode = pinned ? nodeId : null;
    syncExpanded();
    if (!pinned) return true;
    // ---- everything below is the COMMITTED tier only ----
    // While it is open the card owns its own wheel, touch and travel keys:
    // internal scrolling works despite scroll.js's window-capture
    // preventDefault, a finger on the sheet can never scrub the journey, and
    // arrows neither travel nor close it (a11y debt #1).
    claimInput(card, { modal: true });
    // a touch-armed hotspot has been acted on; the frame belongs to the card
    clearArmed();
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

  /** The committed open. journey.js's only door, unchanged in signature and
   *  in everything it promises. */
  function openCard(nodeId, trigger) {
    return mountCard(nodeId, { pinned: true, trigger });
  }

  /** The single place that decides what the TRANSIENT card shows —
   *  popTarget()/syncPop() folded into one, because this tier has only one
   *  question to ask and no deferred hide to re-ask it after.
   *
   *  Deliberately WITHOUT the popover's POP_HIDE_MS: that delay exists so a
   *  pointer can cross the POP_GAP from chip to popover and reach its link,
   *  and a transient card has no link to reach and is `pointer-events: none`.
   *  The answer here is immediate in both directions, which is what "available
   *  immediately… return immediately to the default state" asks for. */
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
  document.addEventListener('pointermove', (e) => {
    lastPointer = { x: e.clientX, y: e.clientY };
    if (!cardDismissBtn) return;
    const at = document.elementFromPoint(e.clientX, e.clientY);
    if (at && cardDismissBtn.contains(at)) return;
    cardDismissBtn = null;
    cardDismissed = null;
    syncCard();
  }, { passive: true });

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
    card.hidden = true;
    card.style.transform = '';
    card.style.removeProperty('--j-card-fx');
    card.style.removeProperty('--j-card-fy');
    card.removeAttribute('data-side');
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
    if (pinnedNode && popNode && pinnedNode === popNode.id) pinnedNode = null;
    syncExpanded();
    // A card opening right behind this one is about to take focus itself, so
    // handing it back to the chip first would be a visible flicker to nowhere.
    if (restoreFocus) {
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      returnFocus = null;
    }
    syncPop();
  }

  /** Take the box away, in whichever tier it is showing. The VISUAL close —
   *  it says nothing about who dismissed it or where focus should land, which
   *  is what lets the transient tier reuse it wholesale. */
  function hideCard() {
    if (!cardIsOpen) return;
    cardIsOpen = false;
    cardPinned = false;
    // The entry is dropped BEFORE `.open`, so the animation is never holding
    // opacity down when the close transition needs to take it — the same
    // ordering hidePop() keeps for the popover.
    stopCardEntry();
    cardAnchor = null;
    card.classList.remove('open');
    releaseInput(card);
    if (drag) { drag = null; card.classList.remove('dragging'); }
    if (selectedNode) { notifySelect(selectedNode, false); selectedNode = null; }
    pinnedNode = null;
    syncExpanded();
    applyCardTier();            // drops the chip's aria-describedby with it
    cardNodeId = null;
    cardDescIds = '';
    // Reduced motion has no fade to protect (journey/site.css drops the transition),
    // so it closes on the tick, exactly as before.
    if (reduceMotion.matches) finishClose();
    else fadeTimer = setTimeout(finishClose, CARD_FADE_MS);
  }

  function closeCard() {
    // journey.js closes "the detail" without caring which vessel it was; this
    // is the popover's half of that one call.
    unpinPop();
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
    if (wasPinned) {
      if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
      returnFocus = null;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // A TRANSIENT card is nobody's route state, exactly as a transient popover
    // is not: Escape takes the reveal away without unwinding journey.js's
    // detail (there is none), and remembers not to re-show it while the chip
    // stays hot. Leaving the chip re-arms it.
    if (cardIsOpen && !cardPinned) {
      e.preventDefault();
      dismissCard();
      hideCard();
      return;
    }
    if (cardIsOpen) { e.preventDefault(); onClose(); return; }
    // A PINNED popover unwinds through journey.js like the card does, so the
    // detail state stays consistent. Escape must also suppress the TRANSIENT
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
    // THE DEPARTURE IS TIMED AGAINST THE MOVE TOO (2026-08-13 — the loop's
    // seam). The arrival has been placed inside the blend since d1ecc23; the
    // release was left on the ordinary COPY_OUT_K scrub rate, which is
    // proportionate to an ordinary 1.2 s jump and is not proportionate to the
    // wrap's 4.00 s lap: measured, the Final block was at 0 by 530 ms, with
    // the camera 0.3 units into a 68-unit move — the words evaporated off a
    // frame that had not moved, and 2.1 s of empty copy layer followed before
    // the hero's arrived. `from` is the last TRAVELLED frame's opacity, and
    // the block now releases across `lead` — the same window the incoming one
    // spends waiting — so the two are one handover rather than two animations
    // with a hole between them. It ends at 0, which is the value the scroll
    // rule is already heading for, so the hand-back is a no-op exactly as the
    // entry's is.
    const from = {};
    for (const k in easedPrev) if (k !== id) from[k] = easedPrev[k];
    arrive = { id, t: 0, lead, dur, own: true, from, play: 1 };
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

  /** The wrap's lap has been steered (journey.js steerWrapBlend): the entry
   *  runs on the same clock as the lap — armed on its frame, stepped by its
   *  same dt — so it REVERSES with it rather than being dropped. Backwards,
   *  the one envelope plays the whole handover in reverse: the arriving
   *  block backs out along its own curve, the departed blocks rise home
   *  along theirs, and both reach exactly the pre-wrap frame as the rewound
   *  lap lands (the two clocks hit zero together, so the landing snap is a
   *  no-op). Dropping it instead (cancelCopyEntry) hands opacity to the
   *  scroll rule, and the scroll rule reads p — which a wrap parks at the
   *  DESTINATION for the whole lap — so it painted the copy of the section
   *  the camera was flying AWAY from and held it up through the entire
   *  retrace (Hannah, 2026-08-16: "the text shows up even before I've
   *  actually scrolled to that section, and then it stays"). */
  function setCopyEntryPlay(play) { if (arrive) arrive.play = play < 0 ? -1 : 1; }

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
        arrive.t += dt * (arrive.play || 1);
        if (arrive.t >= arrive.lead + arrive.dur) endArrive();
        // ...or rewound past its own start (a steered wrap): the handover has
        // fully unwound and the from-state is back on screen, so it retires
        // there exactly as it retires at the other end.
        else if (arrive.t <= 0) endArrive();
      }
    }
    // The camera blend runs on smootherstep (journey.js); the copy uses the
    // same C2 ease so the two read as one movement rather than two.
    let arriveE = 0, leaveE = 0;
    if (arrive && arrive.own) {
      const f = clamp01((arrive.t - arrive.lead) / arrive.dur);
      arriveE = f * f * f * (f * (f * 6 - 15) + 10);
      // the release runs across the lead — same C2 ease, same clock
      const g = clamp01(arrive.t / Math.max(arrive.lead, 1e-6));
      leaveE = g * g * g * (g * (g * 6 - 15) + 10);
    }

    for (const id in eased) {
      const target = bandOpacity(p, COPY_BANDS[id]) * travelHold;
      let s = eased[id];
      if (arrive && arrive.own && id === arrive.id) s = target * arriveE;
      // a block the jump is LEAVING: released on the move's clock, but only
      // while it is still above where the scroll rule would have it — so this
      // can lower a block and never raise one, and a block whose band is
      // already open (the destination's neighbours during a scrub-interrupted
      // jump) is untouched.
      else if (arrive && arrive.own && arrive.from[id] > 0 &&
               arrive.from[id] * (1 - leaveE) > target) s = arrive.from[id] * (1 - leaveE);
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
    // Published for placeCard(), which pins a DOM box to a world point and so
    // must read the SAME camera and the same projection scale the chips read
    // on this frame, through the same jitter-free projection.
    frameGeom = { camera, tanHalf, viewDepth };
    for (const h of hotspots) {
      /* A chip with its own `reveal` follows the SCENE, not the copy: the
         chapter reports 0..1 for this node (Connect: the hub's own ignition,
         pure in p, so a reverse scrub withdraws the label with its light) and
         the chip stands up with it — mid-band, mid-scrub, long before the
         copy re-anchors, which is exactly what the eased-copy gate exists to
         prevent for resting-composition chips and exactly wrong for a label
         naming an event the visitor is watching. The copy band keeps one
         duty: its CLOSE edge (lo opened to the -1 sentinel) still takes the
         chip down into the next chapter, so departure matches the copy-gated
         chips' byte for byte. travelHold is deliberately absent from this
         path — a label that waits for the wheel to stop has already missed
         its light. */
      const gate = h.reveal
        ? Math.min(h.reveal(), bandOpacity(p, h.revealBand))
        : (eased[h.chapter] || 0);
      let want = gate > 0.72 && !detail;
      let w = want ? h.world() : null;
      w = holdAnchor(h, w, dt);
      let sx = 0, sy = 0;
      h.hitRaw = 0;
      if (w) {
        const v = projectStable(w.clone(), camera);
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
        /* THE ARRIVAL STAGGER, and why a hover-only chip is not in it
           (2026-08-14, Hannah: "no ~5-second delay before it becomes active").

           The stagger is a REVEAL choreography: the chapter's labels arrive one
           per HOTSPOT_STAGGER_MS in narrative order, so a frame does not gain
           five pills at once. It is authored for chips that DRAW something at
           rest — Inspire's three, Connect's three — and for those it is exactly
           right and is untouched below.

           A `labelOnHover` chip draws NOTHING at rest. The injected label-policy
           rule is `.j-hot.label-hover > * { opacity: 0 }` — dot, label and pad
           alike — so for Owned's sixteen faces the staggered `h.a` ramp is an
           opacity envelope on an object with nothing visible inside it. What it
           does have is consequences: `h.a` gates `.vis` (visibility and
           pointer-events), the hit pad's SIZE (the second pass below skips any
           chip at a <= 0.015), and `tabIndex`. So on this chapter the stagger
           was choreographing nothing and delaying everything.

           Measured before, nav jump into Owned at 1440x900: first chip live at
           996 ms (the copy gate, which is the chapter's arrival and is correct),
           LAST chip live at 3253 ms — 15 x 150 ms of stagger on top, and longer
           on a scroll entry, which is the delay Hannah is describing. It was
           harmless while hover only lit a node; it is the difference between
           a live section and a dead one now that hover is the disclosure.

           So the fix is not to the constant — 150 ms is right for the chips it
           was written for — but to WHO IS IN THE QUEUE. A chip with no resting
           mark has no arrival to stage, so it arms on the frame it becomes
           placeable. Owned's sixteen come up together, which is also what the
           picture already does: the sixteen FACES are drawn by the chapter's
           own fade, all at once, and never were staggered. */
        // A `reveal` chip is likewise not in the queue: its cadence is the
        // scene's own (Connect's lights land seconds apart), and 150 ms of
        // stagger on top of that is noise — worse, it is ORDERED by
        // registration (importance), which is not the order the lights land.
        if (h.armAt === null) h.armAt = now + ((h.labelOnHover || h.reveal) ? 0 : h.stagger * HOTSPOT_STAGGER_MS);
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
      // The last LIVE pad radius, kept after the pad is torn down. dismissCard()
      // needs to ask "is the pointer on that face?" while the chip is hidden
      // under a pinned card, which is exactly when `hitR` has been zeroed.
      h.padLast = h.hitR;
      h.hitEl.style.setProperty('--j-hit', `${(h.hitR * 2).toFixed(1)}px`);
    }
    for (const h of hotspots) {
      if (h.hitRaw > 0 && h.a > 0.015) continue;
      if (h.hitR !== 0) { h.hitR = 0; h.hitEl.style.setProperty('--j-hit', '0px'); }
    }

    /* HOVER ZONES: scene-owned hover targets with no chip (report C). Same
       gate, none of the chip machinery — and deliberately NOT the steady
       projection the chips above use.

       2026-08-12: a zone is a pointer target with no pixels (`.j-hotzone` sets
       geometry, visibility and pointer-events, and paints nothing at all), so
       taking the TAA jitter out of it buys nothing anyone can see — while
       measurably costing a frozen golden. Owned's crown zone is a 203.8 px
       circle in `.j-hotzones`, a position:fixed inset:0 layer stacked over the
       canvas; steadying it moved that layer's child by 0.2 px
       (translate(113px, -5.1px) -> -4.9px) and shifted owned@430x932 by MAE
       0.13/255 spread over the WHOLE frame — a compositor rounding artifact,
       not a scene change (camera matrices, fog, pose and every lens uniform
       were dumped in both builds and are bit-identical). Bisected to exactly
       this line: chips steady + zones raw restores all ten goldens to 0.00.

       So the zone keeps the raw projection and keeps its sub-pixel tremor. It
       is a 0.65 px wobble on a 204 px target, which cannot flicker a hover in
       practice, and it is invisible by construction. If a zone ever grows
       something that paints, this is the line that has to change — and the
       golden it moves is the reason it did not change today. */
    for (const z of hoverZones) {
      const gate = eased[z.chapter] || 0;
      let live = gate > 0.72 && !detail;
      if (live) {
        const w = z.world();
        const v = w ? w.clone().project(camera) : null;
        if (!v || v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) live = false;
        else {
          const d = Math.max(0.05, viewDepth(w));
          // The floor carries PL-1.4's 44 px touch minimum under the same
          // media query the hit pads use, now that a zone can be pressed.
          // Measured, it never binds: the crown projects to r 123 (1440x900),
          // 109 (1280x800), 89 (375x812) and the 140 cap (430x932).
          const zFloor = sheetQuery.matches ? 22 : 18;
          const r = Math.max(zFloor, Math.min(140, z.radius * (window.innerHeight * 0.5) / (d * tanHalf)));
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
        if (!live) {
          // A zone leaving the frame takes its commit state with it: no timer
          // left running against an element nobody can reach, and no half-
          // spent visit waiting for a pointer that has gone.
          if (z.dismiss) z.dismiss();
          if (z.hot) { z.hot = false; z.onHot(false); }
        }
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

    // The card is anchored to a node that is itself world-tracked, so it is
    // re-placed every frame for the same reason the popover is: the organism
    // sways, and a box pinned to a face has to sway with it or the two come
    // apart. Unlike the popover it is NEVER hidden when its subject leaves
    // the frame — the card is a modal disclosure with a focus trap and a
    // route state behind it, and taking it away from under a visitor's
    // keyboard because the camera drifted would be a far worse fault than a
    // card that has run out of things to point at. anchorPoint() clamps to
    // the frame edge instead, and falls back to the flank only when the node
    // is behind the lens entirely.
    //
    // A TRANSIENT card is the exception, and for the popover's reason rather
    // than against it (2026-08-14): it holds no focus, owns no input and is
    // nobody's route state, so it IS an annotation, and an annotation whose
    // subject has left the frame has nothing to annotate. A chip that goes
    // non-`.vis` mid-hover — travel, suppression behind the copy block, a
    // chapter change — does not reliably fire `pointerleave` on the way out,
    // so without this the panel could outlive the face it points at.
    if (cardIsOpen) {
      if (!cardPinned && cardAnchor && !cardAnchor.btn.classList.contains('vis')) {
        if (cardAnchor.hot) { cardAnchor.hover = false; cardAnchor.refresh(); }
        else hideCard();
      } else placeCard();
    }
  }

  // An orientation change or a window resize across the 720px line while a
  // card is open re-forms it in place rather than leaving a side card on a
  // phone-width viewport until the next open.
  if (typeof sheetQuery.addEventListener === 'function') {
    sheetQuery.addEventListener('change', () => {
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
  }

  return {
    update, addHotspot, addHoverZone, openCard, closeCard, rail,
    armCopyEntry, cancelCopyEntry, setCopyEntryPlay,
    /** A chapter's live eased copy opacity (0..1) — the one signal that
     *  means "the intro is playing": settle-gated on a scroll arrival, the
     *  armCopyEntry envelope on a nav jump, fast release when travel
     *  begins. Read by journey.js as Inspire's landing-cascade gate (the
     *  chapter's 5c block), never written from outside. */
    copyEase: (id) => eased[id] || 0,
    /** QA: the chapter whose copy is mid-entry, or null. */
    get arrivingChapter() { return arrive ? arrive.id : null; },
    get cardOpen() { return cardIsOpen; },
    /** QA: is that card COMMITTED (click / key / route), or a transient
     *  hover-and-focus reveal? — the card's half of `popPinned`. */
    get cardPinned() { return cardPinned; },
    /** QA: whose card the box is currently showing, or null. */
    get cardNode() { return cardIsOpen ? cardNodeId : null; },
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
