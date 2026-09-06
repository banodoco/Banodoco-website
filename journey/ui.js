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
import { CARD_ICONS } from './cards/index.js';
import { createRail } from './rail.js';
import { createRailExclusion, railBox } from './layout/rail-geometry.js';
import { createFrameProjection } from './ui/frame-projection.js';
import { createHotspotFrame } from './ui/hotspot-frame.js';
import { createHoverZones } from './ui/hover-zone.js';
import { createRailMask } from './ui/rail-mask.js';
import {
  anchorPoint, resolveCardPlacement, filamentOffset,
} from './ui/card-layout.js';
import { CHAPTERS } from './route.js';
import { JOURNEY_SCHEMA, RUNTIME_CHAPTER_IDS } from './structure.js';
import { createLabelPolicies } from './ui/label-policies.js';
import { buildActions, createCard, createPopover, el } from './ui/dom.js';
import { createCopyArrival, COPY_SURFACES } from './ui/copy-arrival.js';
import { createLiveRegion } from './ui/live-region.js';
import { createPopoverTier } from './ui/popover-tier.js';
import { createCardTier } from './ui/card-tier.js';
import { createSelection, createFocusReturn } from './ui/selection.js';
import { createOwner } from './ui/owner.js';
import { createHotState } from './ui/hot-state.js';
import { mediaQuery, REDUCE_MOTION } from './ui/media.js';
import { COPY_BANDS } from './constants.js';

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
   registry — `claimInput` / `releaseInput` in core/scroll.js — for regions
   that handle their own wheel/touch/keys. The dialog card registers itself
   while open (journey/ui/card-tier.js); that one call replaces the guard AND
   is what lets a bottom sheet scroll internally under a window-capture
   preventDefault.
   -------------------------------------------------------------------------- */

const reduceMotion = mediaQuery(REDUCE_MOTION);

/* Bottom-sheet condition (PL-1.3): a coarse pointer, or a viewport too narrow
   for the desktop side card. Live — a hybrid laptop that starts a session with
   a mouse and continues with a finger re-evaluates on the next open, and an
   orientation change re-evaluates immediately. */
const sheetQuery = mediaQuery('(pointer: coarse), (max-width: 720px)');

const CHAPTER_POSITION = Object.fromEntries(JOURNEY_SCHEMA.chapters
  .filter(({ copyPosition }) => copyPosition)
  .map(({ id, copyPosition }) => [id, copyPosition]));
/*
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
}; */

/* THE COPY SUB-PULSE IS GONE (C05 slice D, design.md §6.1). What stood here
   was `const CHAPTER_SUB_PULSE = {}` plus, in the copy builder below, a
   `pointerenter` listener that reached `window.journey.chapters[c.id].trigger`.
   The table had been empty since 2026-08-06 and was never written, so `pulse`
   was always `undefined`: the `.j-pulse` class was never added and the
   listener was never attached. Zero DOM nodes and zero listeners change.

   THE HISTORY, kept because the deletion retires an authored decision rather
   than an oversight. Ride-through #2 gave the Owned claims list a job beyond
   copy: each <li> pulsed the colony through the chapter's trigger(). Hannah's
   2026-08-05 direction turned that list into one prose line
   (content/content.js), so the behaviour moved with it — the whole sentence
   became the claim, and it fired the whole-colony wave. RETIRED for Owned,
   2026-08-06 (Hannah, report C): measured, that prose line is a 416x77 px box
   at the dead centre of the frame, between the crown at the top and the
   portrait arc below it — i.e. squarely on the route a pointer takes to reach
   a face. Every crossing fired substrate.surge() and a 30-unit colony wave, so
   the whole root system lit at moments that felt arbitrary: "the roots ALL
   light up when I'm hovering over below randomly, but this should only happen
   when I hover over the TOP root thing." The response moved to the crown, as a
   HOVER ZONE (see addHoverZone below and chapters/owned/index.js hoverZones()).

   THE DECISION THAT WAS OVERRULED, quoted so it is visibly discarded rather
   than silently lost: "The mechanism stays: it is keyed by chapter, so a
   chapter that wants one says so here and every other chapter is untouched.
   Nothing asks for one today." It is overruled because the extension point's
   only cost was the `window.journey` read this slice exists to close, and
   because there is now a better-owned door for the same want: a chapter that
   wants a copy-hover response declares `interaction.trigger`
   (journey/chapter-contract.js), which the registrar already dispatches
   without naming a chapter. Reach for that, not for a second global read. */

/* `smoothA`, `clamp01` and `bandOpacity` moved to ./ui/bands.js (J04b).
   Verbatim; they are the pure part of this module and the only part a node
   harness can execute. */

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

   and — because a chapter does not always own its own registrar
   (chapter-interactions.js registers from `visibility.nodeIds`) — the
   identical per-node flag is reachable from the CHAPTER CONTRACT:

       chapter.visibility.labelPolicy(nodeId)
         -> { labelOnHover: true, label: 'Name · Role' }   // hover-only chip
         -> null | undefined                               // default, untouched

   Read off the `chapters` map createUI is handed (C05 slice D), per node,
   once. No chapter or node id appears in this file: any chapter can adopt it,
   and a chapter that never declares the member keeps exactly the behaviour it
   has today.

   `hot` is already the union of hover, keyboard focus and the touch-armed
   state (see the touch-model note below), so keying the chip off it gives
   focus/touch parity for free — the same rule that lights the dot reveals
   the label.
   -------------------------------------------------------------------------- */
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
export function createUI({ onNav, onOpen, onClose, isDetailOpen, project,
  rail: preparedRail = null, chapters = {} }) {
  const projectStable = project
    ? (v) => project(v)                 // scene-owned, jitter-free
    : (v, cam) => v.project(cam);       // harness fallback: THREE's own

  /* ==========================================================================
     THE OWNER TREE (lifecycle.md §6.3, minus the lifecycle)

     Every listener and every timer this module attaches is registered against
     one of these, so "what does the UI own?" is answered by reading an object
     instead of by grepping 3,000 lines, and the raw registration sites in this
     subtree stay countable (tools/test-render-baseline.mjs's manifest). There
     is no teardown behind them any more — see
     docs/code-health/DISPOSAL-REMOVED.md — so the children are a naming
     scheme, not a disposal graph.

     WHY THE CHILDREN ARE THESE FIVE. They are five of the six construction
     phases below, in the order they run. The rail is not among them: on the
     shipped path the PAGE builds the rail (main.js -> journey.js prepareRail
     -> createRail) and hands it in as `preparedRail`, so it was never this
     module's to own. */
  const owner = createOwner('ui');
  const popoverOwner = owner.child('popover');
  const hotspotsOwner = owner.child('hotspots');
  const zonesOwner = owner.child('zones');
  const cardOwner = owner.child('card');
  /* `lifecycle.md` §6.3 lists a sixth child, `copy`. IT IS NOT CREATED HERE:
     the copy subsystem (armCopyEntry / paintCopy / the arrival envelope)
     attaches no listener and arms no timer — it is driven entirely from
     update(). */

  /* ---------------- the side navigator ---------------- */
  // Hannah, 2026-08-07 / redux 2026-08-09: the chapter list left the hero's
  // <nav> row and became a side rail with a site-map panel behind it — now on
  // the RIGHT flank, carrying the removed footer's whole job (journey/rail.js
  // owns the component: its three states, its symbols, its dialog). This
  // module keeps exactly one relationship with it: it drives its per-frame
  // update from inside the one update() the frame loop already calls.
  // The hero's own <nav> — wordmark, 2RP, Discord — is no longer touched at
  // all by this module; the rail is a sibling landmark on <body>.
  const rail = preparedRail || createRail({ onNav });
  if (preparedRail && rail.setOnNav) rail.setOnNav(onNav);

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
    // A chapter whose copy is hosted anywhere but a `j-block` does not get one
    // built here. Mission is the only such chapter today — its copy is the
    // hero's own DOM — but that is now the manifest's statement rather than an
    // id test in this loop (order U04, N01's dispatch route).
    if (!data || COPY_SURFACES[c.id].host !== 'block') continue;
    const b = el('div', `j-block ${CHAPTER_POSITION[c.id] || 'pos-left'}`);
    b.dataset.chapter = c.id;
    b.appendChild(el('h2', 'j-h', data.heading));
    if (data.sub) b.appendChild(el('p', 'j-sub', data.sub));
    if (Array.isArray(data.actions) && data.actions.length) {
      // cached on the element: paintCopy reaches for it every frame, for every
      // chapter, and a per-frame querySelector for a node we already hold is a
      // reflow risk for nothing.
      actionRows[c.id] = b.appendChild(buildActions(data.actions));
      /* AN ACTION MAY POINT BACK INTO THE JOURNEY (the Epilogue's Ownership
         button, owner's navigation restage 2026-08-26). A `#/<chapter>` href
         is a real deep link for the keyboard and for "open in new tab", but
         a same-document click must travel through the journey's own handle —
         the same interception the logo's #/mission link gets in main.js —
         rather than writing the hash and going nowhere. External links are
         untouched: only hrefs in the journey's own hash namespace divert. */
      for (const a of actionRows[c.id].querySelectorAll('a[href^="#/"]')) {
        const dest = a.getAttribute('href').slice(2);
        owner.listen(a, 'click', (e) => {
          e.preventDefault();
          onNav(dest);
        });
      }
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

  /* ---------------- hotspot proxies ---------------- */
  const hotHost = el('div', 'j-hotspots');
  document.body.appendChild(hotHost);
  /* `hotspots` and `hoverZones` are ALIASES for the registry's own arrays,
     never copies (U02, journey/ui/hot-state.js). */
  const hotState = createHotState();
  const hotspots = hotState.nodes;

  /* The two facts BOTH disclosure vessels need and neither may own: which
     node wears the chapter's selected LIGHT, and which node's disclosure is
     COMMITTED — plus the control a committed close hands focus back to. All
     three were `let`s in this closure that five sub-owners wrote directly.
     See journey/ui/selection.js. */
  const selection = createSelection({ hotspots, chapters });
  const focusReturn = createFocusReturn();
  /* ---------------- the two disclosure vessels ----------------
     WHICH vessel a node uses is decided by CONTENT and by nothing else: a node
     with a `short` line discloses BESIDE its chip in the popover; a node
     without one (Owned's sixteen contributors, whose whole content is a name,
     a role and a blurb) discloses in the card. No chapter and no node id
     appears in that choice. `mountDisclosure` below is the only place it is
     made, and journey/ui/popover-tier.js records why this build gives the
     popover the WHOLE disclosure for its nodes rather than making it a preview
     of a card it would then have to be worse than.

     THE SHELLS ARE BUILT HERE, in one place and in one sequence, because DOM
     construction order is observable — it is the document order the captures
     read and the record order the trace oracle compares. That is also why the
     live region is built between the card's shell and the card's listeners
     rather than beside the vessel that announces most through it. */
  const popShell = createPopover(hotHost);
  const popover = createPopoverTier({
    shell: popShell, owner: popoverOwner, hotState, reduceMotion,
    selection, focusReturn, onOpen,
    /* Two forward references, and they are forced rather than chosen: the live
       region and the card's own state are built further down this function, at
       the positions their DOM has always occupied. Neither is read until a
       visitor commits a disclosure, which is many frames later. */
    announce: (message) => announce(message),
    requireVesselFree: () => { if (cardTier.isOpen()) closeCard(); },
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
     independent reasons for the same visual, OR'd together.

     WHICH node is armed is not stored here: it is read off the records by
     journey/ui/hot-state.js, so the arm cannot disagree with itself. */

  // Tap anywhere that is not a hotspot clears the focus state — including the
  // canvas, whose tap handling (organism.js, journey input policy) is unaffected (this listener
  // observes, never cancels).
  owner.listen(document, 'pointerdown', (e) => {
    const outside = !(e.target instanceof Node) || !hotHost.contains(e.target);
    if (!outside) return;
    // A pinned popover is non-modal, so pressing anywhere else dismisses it —
    // for EVERY pointer type, not just touch (a mouse has no other way out
    // besides Escape). Routed through onClose() so journey.js unwinds its own
    // detail state with it.
    if (popover.isPinned()) {
      // Closing returns focus to the hotspot. Remember the dismissal BEFORE
      // that focus move, exactly as Escape does below, or the popover's sync
      // sees the newly-hot chip and immediately recreates the transient one.
      popover.dismissShown();
      onClose();
    }
    // The pinned CARD closes on a press outside it too (2026-08-18, Hannah —
    // the mobile sheet had no outside-tap exit; older comments claimed this
    // path existed, and now it does). Presses INSIDE hotHost never reach
    // here, so tapping another face retargets the card through that chip's
    // own handler instead of closing-then-reopening; the grip, the body and
    // the close button are all card.contains and keep their own semantics.
    if (cardTier.isOpen() && cardTier.isPinned() && !card.contains(e.target)) onClose();
    if (e.pointerType !== 'touch' || !hotState.armed()) return;
    hotState.disarm();
    if (document.activeElement && hotHost.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, { capture: true });

  /* LABEL POLICY moved to journey/ui/label-policies.js (order U06). It held
     `policyPending` — the last mutable binding in this closure shared across
     more than one sub-owner, and the reason `update()`'s first statement was
     a conditional rather than a call. */
  const policies = createLabelPolicies({ hotspots, chapters });

  /** Register a named node. `world()` returns a THREE.Vector3 or null.
   *  Registration order within a chapter is the label stagger order.
   *  `labelOnHover` (optional) opts this node into the hover-only chip — see
   *  the LABEL POLICY note above; a chapter can set the same flag per node
   *  through its own `labelPolicy(id)`. */
  function addHotspot({ id, chapter, label, world, labelOnHover, radius, reveal,
    revealDirect = false, revealScrub = false }) {
    const stagger = hotspots.filter(h => h.chapter === chapter).length;
    const btn = el('button', 'j-hot');
    btn.type = 'button';
    btn.dataset.node = id;
    btn.dataset.chapter = chapter;
    const preview = popover.previewFor(id);
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
    // Initiative chips carry their own pictograph in the dot's slot. Their
    // joined tab moves with the capsule during a collision dodge; only the
    // invisible hit pad keeps the generic --j-dot-dy node compensation.
    // Everything else keeps the plain ember dot and its visual pin.
    const iconTab = !!CARD_ICONS[id];
    if (iconTab) {
      // The pictograph is not a bullet beside the name: together they form a
      // small node marker, with the icon centred in a raised tab and the name
      // in the joined body below. An explicit class keeps this treatment
      // scoped to the six initiative labels; plain ember dots and Owned's
      // invisible contributor controls retain the shared hotspot geometry.
      btn.classList.add('j-hot--icon-tab');
      dotEl.classList.add('j-hot-ico');
      dotEl.innerHTML = CARD_ICONS[id];
    }
    btn.appendChild(dotEl);
    const labelEl = el('span', 'j-hot-label', label);
    btn.appendChild(labelEl);
    // THE THIRD-STATE CHIP (R3): a node whose interior is unbuilt wears the
    // state on the chip itself — the NAME blurred to a shape (site.css,
    // .j-hot--soon) and a strong housing so it reads clearly against the lit
    // gill fan. The qualifier is the popover tier's own (content.js `preview:
    // 'under-construction'`), so chip, preview and panel can never disagree.
    //
    // THE WORD IS GONE (owner, 2026-09-01: "remove 'Soon' from the visible
    // Equip labels"). The chip used to carry a "Soon" pill beside the name,
    // and — because a blurred name is a design statement to a sighted visitor
    // and a garbled one to AT — an `aria-label` of "<name>, soon" that stated
    // the same thing to a screen reader. Both are removed: the pill was the
    // word, and the aria-label existed only to voice it, so leaving it would
    // have kept the word for exactly the visitors who cannot see the blur.
    // With neither, the accessible name falls back to the label element's own
    // text, which is the name the sighted visitor sees the shape of. What the
    // third state still says is WITHHELD, not "not yet": the blur, the housing
    // and the unbuilt preview card ("IN DEVELOPMENT", cards.css j-pop-unbuilt).
    // The class, the `soon` record flag and the ring-rise arrival stay — they
    // dress and land the whole chip, name included, and are not the word.
    const soon = popover.unbuiltFor(id);
    if (soon) btn.classList.add('j-hot--soon');
    /* MARKER ABOVE NAME (2026-08-31, the owner on the two soon chips: "those
       labels seem different to the rest too — e.g. the icon isn't above the
       text like on the others"). Every other NAMED chip on the site is an
       initiative marker, and those stack: pictograph in a raised tab, name in
       the joined body below (cards.css, .j-hot--icon-tab). The soon pair were
       the only named chips left in the older dot-beside-name row, because the
       stacking arrived attached to the pictograph and Quark and Brötchen have
       no CARD_ICONS entry. So the geometry is stated on its own here rather
       than inferred from the icon: `stacked` means THE MARKER SITS OVER THE
       NAME, which is the one thing hotspot-frame's placement needs to know —
       such a chip anchors on its own midpoint instead of 11 px in, and the
       edge-flip that mirrors a side-set label has no job on a symmetric one.
       It is deliberately NOT `iconTab`: the soon chips keep their own housing,
       their blurred name and their rise-on-ring entrance, and only the
       skeleton is shared. */
    const stacked = iconTab || soon;
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
      id, chapter, btn, world, stagger, a: 0, armAt: null, sup: false, iconTab,
      soon, stacked,
      // The tempo floor's per-chip state (DEFECT-01 #3). Written only by
      // journey/ui/hotspot-frame.js; initialised here for the same reason
      // `a`, `armAt` and `sup` are — the record states its whole shape at
      // registration, so no reader ever meets an `undefined` field.
      beatAt: null, beatA: 0,
      radius: typeof radius === 'function' ? radius : null,
      // Per-node scene gate (2026-08-16): when a chapter supplies one, this
      // chip arrives with what the scene DRAWS for its node (Connect: the
      // hub's own light landing) instead of with the chapter's eased copy.
      // The copy band keeps only its close edge for these — see the gate in
      // the placement loop.
      reveal: typeof reveal === 'function' ? reveal : null,
      revealDirect: !!revealDirect,
      // Connect keeps its 72% scene-readiness floor, but the visible portion
      // above that floor is the scene gate itself rather than a second UI
      // clock. Reverse scrubs therefore withdraw the marker in the same frame
      // as its core instead of leaving a fading pill behind a moving node.
      revealScrub: !!revealScrub,
      // A direct navigation retires the source scene synchronously, but its
      // copy remains on the camera-flight crossfade. The hotspot frame uses
      // these three fields to carry an already-visible initiative marker on
      // that exact outgoing copy envelope instead of losing it on the click.
      departureTicket: null, departureA: 0, departureCopy: 0,
      // ...and the band that close edge is read from, built once — the
      // placement loop runs per frame and COPY_BANDS never moves after load.
      revealBand: COPY_BANDS[chapter]
        ? { lo: -1, hi: COPY_BANDS[chapter].hi } : { lo: -1, hi: 2 },
      hitEl, hitR: 0, padLast: 0, dotEl, chipBare: false,
      holdAt: null,       // world anchor held still while hot — see holdAnchor()
      holdOff: null,      // ...decaying back to zero once it goes cold
      pendX: 0,           // this frame's resolved translate-x, written post-loop
      dodgeY: 0,          // pill raise from the collision dodge
      dodgePrev: 0,       // plain dots + every hit pad compensate via --j-dot-dy
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
    policies.register(h, labelOnHover);
    // one visual, three reasons — see the touch-model note above
    h.refresh = () => {
      if (!hotState.latch(h)) return;   // the union of the three, and the latch
      const on = h.hot;
      btn.classList.toggle('hot', on);
      if (h.onHot) h.onHot(on);
      hotState.rank(h);                 // newest hot chip wins — see hottest()
      // Leaving the chip re-arms a popover Escape dismissed, so the next hover
      // works again — the dismissal is of that one reveal, not of the node.
      if (!on) popover.rearm(h.id);
      // ...and the same for the card's own dismissal (2026-08-14). A close is
      // of that one reveal, not of the person. A dismissal the POINTER is
      // parked on is exempt — it is re-armed by a real pointer move off the
      // chip instead; see cardDismissBtn.
      if (!on) cardTier.rearm(h.id);
      // The popover keys off the SAME `hot` state that lights the chip, which
      // is what buys hover / keyboard-focus / touch-armed parity for free.
      popover.sync();
      // The card now does too. Which of the two answers is decided by content
      // (a `short` line or not), never by chapter — see the router below.
      cardTier.sync();
    };

    hotspotsOwner.listen(btn, 'pointerdown', (e) => { h.pointer = e.pointerType || 'mouse'; });
    hotspotsOwner.listen(btn, 'click', () => {
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
      if (via === 'touch' && hotState.armed() !== h && h.preview) {
        // first tap: take the focus state, show it, and stop.
        hotState.arm(h);
        h.refresh();
        btn.focus({ preventScroll: true });
        return;
      }
      /* A mouse/pen click on an ownership orb must not upgrade the card that
         hover already opened into the committed modal tier. That upgrade is
         what made the panel survive pointerleave and feel stuck. Keep the
         pointer reveal transient, and drop the click-acquired button focus so
         hover remains its only owner; moving away will then close it normally.

         Touch still commits directly because it has no hover tier, and a
         keyboard activation still commits so the disclosure remains usable
         without a pointer. Popover nodes keep their existing click-to-pin
         behaviour because their pinned tier makes the CTA keyboard-reachable. */
      const clickedOpenHoverCard = (via === 'mouse' || via === 'pen')
        && h.hover && !h.preview && cardTier.isOpen() && !cardTier.isPinned()
        && cardTier.nodeId() === h.id;
      if (clickedOpenHoverCard) {
        btn.blur();
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
    hotspotsOwner.listen(btn, 'pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      h.hover = true; h.refresh();
    });
    hotspotsOwner.listen(btn, 'pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      h.hover = false; h.refresh();
    });
    hotspotsOwner.listen(btn, 'focus', () => { h.focused = true; h.refresh(); });
    hotspotsOwner.listen(btn, 'blur', () => {
      h.focused = false;
      h.armed = false;             // the arm is the record's; nothing else holds it
      h.refresh();
    });
    hotHost.appendChild(btn);
    return hotState.add(h);
  }

  /* THE HOVER HOLD moved to journey/ui/hotspot-frame.js (order U06), with the
     whole placement machine it guards. It is a per-frame concern and it reads
     `h.hot`; keeping it here while its only caller left would have been a
     helper stranded on the far side of the seam. */

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
  /* THE ZONE'S COMMIT MACHINE AND ITS FRAME PASS BOTH MOVED (order U06) to
     journey/ui/hover-zone.js. They were 700 lines apart in this file — the
     six-binding dwell/commit machine here, the per-frame projection inside
     `update()` — and they are one machine: the frame pass is what takes a
     zone out of the commit machine when it leaves the frame. What stayed is
     this file's job: building the host, and composing the owner. */
  const zoneHost = el('div', 'j-hotzones');
  document.body.insertBefore(zoneHost, hotHost);
  const zones = createHoverZones({
    hotState,
    owner: zonesOwner,
    /* Indirected, not passed: the live region is constructed further down
       (it is a DOM concern and belongs with the other hosts), and this owner
       is built HERE because the host's insertion point is what fixes the
       crown's place in the tab order. The same wrapper the hotspot registry
       uses for the same reason. */
    announce: (message) => announce(message),
    host: zoneHost,
    el,
    sheetQuery,
  });
  const addHoverZone = zones.add;

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
  /** Air around the persistent navigator, including its active-ring glow.
   *  A PAD IS THE ASKER'S POLICY, not a property of the navigator: how much
   *  room this thing needs beside that thing. The silhouette it is measured
   *  from — including the 22 px the active marker paints outside its own box
   *  — belongs to journey/layout/rail-geometry.js and is not restated here. */
  const RAIL_EXCLUSION_PAD = 14;

  // A real modal dialog: role + aria-modal + a title that labels it, focus
  // moved in on open, TRAPPED while open, and returned to the trigger on close
  // (PL-2.2). aria-modal only tells the truth if the trap exists, which is why
  // W3-A left it 'false'; the trap below is what earns the 'true'.
  // The grab handle for the bottom-sheet form (PL-1.3). Purely a pointer
  // affordance — the keyboard's route out is Escape and the close button — so
  // it is hidden from AT rather than announced as a mystery control.
  const cardShell = createCard();
  const { card } = cardShell;
  cardOwner.listen(cardShell.close, 'click', () => onClose());

  /* a11y debt #5: a polite live region. Retargeting an open card (one hotspot
     straight to the next) replaces the dialog's contents while focus is
     already inside it — no focus move, so nothing is announced and a screen
     reader user is silently reading the wrong node. This says what happened.
     It is only used for the retarget/no-trigger cases; a normal open moves
     focus into the dialog, which announces itself. */
  const { announce } = createLiveRegion({ owner });

  const cardTier = createCardTier({
    shell: cardShell, owner: cardOwner, hotspots, hotState, reduceMotion,
    sheetQuery, rail, selection, focusReturn, popover, announce,
    /* Placement stays in this module: where a box goes on screen is a question
       about the frame's projection and the navigator's measured exclusion
       zone, and the vessel knows only WHICH node it belongs to and WHEN to
       ask. */
    place: placeCard,
    onClose, isDetailOpen,
  });

  /* ---------------- the frame's projection ----------------
     The one thing the placement solve cannot work out for itself: the
     frame's projection, bound to the settled camera, and the scale that
     turns a world radius into pixels. Published once per frame by
     journey/ui/frame-projection.js, so the card is placed from EXACTLY the
     geometry the chips were placed from on the same frame — one source of
     truth, no second projection path to drift out of step. It was a mutable
     `createUI` binding rewritten by `update()`; it is now a frozen snapshot
     with one write site, which is U05's shape and for U05's reason. */
  const projection = createFrameProjection({ projectStable });

  /* The navigator's measured silhouette, owned by one module and published
     once per repaint (journey/layout/rail-geometry.js). Nothing below this
     line queries rail DOM or reads its geometry: update() refreshes the
     snapshot at the one instant the rail has finished painting itself for
     the frame, and both consumers — the profile mask and the card's
     placement — derive their own padded box from that one measurement.

     Built from `rail.root` rather than taken off the rail object because the
     rail handed in by a harness is a hand-built double, exactly as the
     `rail.destroy` guard above allows for. */
  const railGeom = createRailExclusion({ root: rail.root });

  /* The two per-frame owners `update()` composes. They are constructed here,
     beside the snapshot they read, and they are handed the registry arrays BY
     IDENTITY — `hotspots` is `hotState.nodes`, and both owners iterate the
     very array `addHotspot` publishes into. */
  const railMask = createRailMask({
    hotspots, railGeom, chapters, chapterIds: RUNTIME_CHAPTER_IDS,
  });
  const chips = createHotspotFrame({ hotspots, blocks, sheetQuery });

  /** Place the card against its node. A no-op for the sheet, which owns its
   *  own geometry (PL-1.3), and for a card with no anchor to speak of, which
   *  keeps the pre-2026-08-13 flank position as its honest fallback. */
  function placeCard(cardAnchor) {
    if (card.classList.contains('sheet')) return;
    const view = { w: window.innerWidth, h: window.innerHeight };
    const a = anchorPoint(cardAnchor, projection.snapshot(), view);
    if (!a || a.behind) {
      // No direction to point in. Sit on the flank exactly where the card sat
      // before this pass — a deep link to a node the current pose does not
      // show has nothing to be near, and pretending otherwise would put the
      // card at an arbitrary edge.
      const p0 = card.getBoundingClientRect();
      card.dataset.side = 'flank';
      card.style.transform = `translate(${Math.round(view.w * 0.966 - p0.width)}px, ${Math.round((view.h - p0.height) / 2)}px)`;
      card.style.removeProperty('--j-card-fx');
      card.style.removeProperty('--j-card-fy');
      return;
    }
    const p = card.getBoundingClientRect();
    const placed = resolveCardPlacement(a, p, view,
      railBox(railGeom.snapshot(), RAIL_EXCLUSION_PAD));
    const { fx, fy } = filamentOffset(a, placed, p);
    card.dataset.side = placed.side;
    card.style.transform = `translate(${Math.round(placed.x)}px, ${Math.round(placed.y)}px)`;
    card.style.setProperty('--j-card-fx', `${fx.toFixed(1)}px`);
    card.style.setProperty('--j-card-fy', `${fy.toFixed(1)}px`);
  }
  /** WHICH vessel discloses `nodeId`, and the rule that only one may.
   *
   *  Nodes that carry a popover are disclosed beside their chip and never in
   *  the card. Anything still using the card (contributor profiles) takes the
   *  frame back from a pinned popover on the way in — without restoring focus,
   *  because the card opening behind it is about to take focus itself and
   *  handing it to the chip first would be a visible flicker to nowhere.
   *
   *  This is the whole of what the two vessels know about each other, and it
   *  lives here because the choice is about CONTENT — this module's subject,
   *  and neither vessel's. */
  function mountDisclosure(nodeId, { pinned, trigger }) {
    const ph = hotspots.find(x => x.id === nodeId && x.preview);
    if (ph) return pinned ? popover.pin(ph, trigger) : false;
    if (pinned && popover.isPinned()) popover.unpin({ restoreFocus: false });
    return cardTier.mount(nodeId, { pinned, trigger });
  }

  /** The committed open. journey.js's only door, unchanged in signature and
   *  in everything it promises. */
  function openCard(nodeId, trigger) {
    return mountDisclosure(nodeId, { pinned: true, trigger });
  }

  /** The committed close, and journey.js's only door for it. journey.js closes
   *  "the detail" without caring which vessel it was, so both are told and
   *  each declines if it was not the one showing. */
  function closeCard() {
    popover.unpin();
    cardTier.close();
  }

  owner.listen(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    // A TRANSIENT reveal is nobody's route state, in either vessel: Escape
    // takes it away without unwinding journey.js's detail (there is none), and
    // remembers not to re-show it while the chip stays hot. Leaving the chip
    // re-arms it; see refresh().
    if (cardTier.isOpen() && !cardTier.isPinned()) {
      e.preventDefault();
      cardTier.dismiss();
      cardTier.hide();
      return;
    }
    if (cardTier.isOpen()) { e.preventDefault(); onClose(); return; }
    // A PINNED popover unwinds through journey.js like the card does, so the
    // detail state stays consistent. Escape must also suppress the TRANSIENT
    // reveal on the way out: focus is still on the chip (that is where a
    // non-modal disclosure leaves it), so without this the popover would unpin
    // and immediately re-appear as a hover/focus reveal — an Escape that
    // visibly does nothing.
    if (popover.isPinned()) {
      e.preventDefault();
      popover.dismissShown();
      onClose();
      return;
    }
    if (popover.isShowing()) {
      e.preventDefault();
      popover.dismissShown();
      popover.hide();
    }
  });

  /* ---------------- per-frame ---------------- */

  /* THE COPY CHOREOGRAPHY AND THE ARRIVAL ENVELOPE now live in
     journey/ui/copy-arrival.js (order U04). What moved is the whole machine:
     the eased opacities, the travel-speed signal, the direct-navigation
     ticket, the jump-entry envelope, the hero's arrival shelf, and the two
     painters. What stayed is this file's job — composing it and handing it
     its frame.

     `step()` is given every input it uses. It reads no ambient state from
     this closure, which is the point: `update()` was the "transition
     function" that six of this region's mutable bindings were passing G2 on,
     and a 653-line transition is the clause being satisfied rather than met
     (D159). Each of those bindings now has a named transition of its own,
     or two writes. */
  const copy = createCopyArrival({ blocks, actionRows, heroBlock, rail, reduceMotion });
  const { prepareCopyEntry, armCopyEntry, cancelCopyEntry, setCopyEntryPlay } = copy;

  /* ==========================================================================
     update() — THE FIXED-ORDER COMPOSITION (order U06)

     This was a 480-line body, 36 statements, depth 5, `composed: false`, and
     it owned eight mutable bindings including the tree's last two `WIDE`
     ones. It is now a sequence of sub-owner calls, and the ORDER IS THE
     SUBJECT — every line below is here rather than there for a reason a
     reader can check.

     ---- WHY THIS ORDER ----

     1. POLICY, once, on the first frame the chapter modules are reachable.
     2. DETAIL, because everything after it asks whether the frame belongs to
        something else. A pinned popover makes journey.js report a detail open
        — it is route state either way — but it is NOT modal: it sits beside a
        chip that must stay on screen under it, and it never claims the frame.
        So everything below that means "a dialog owns the page" asks for the
        MODAL detail, not merely an open one. The `&&` is load-bearing: with
        no detail open, `popover.isPinned()` is never called.
     3. RAIL, which PAINTS the navigator for this frame. Everything that
        measures the rail must come after it, and nothing that writes may come
        between it and the measurement in step 6.
     4. COPY, which owns the eased opacities every gate below reads.

     Then the frame's DOM work, and the read/write barrier that governs it:

     5. MEASURE — every DOM read, one pass. Interleaving a read with the
        writes in step 8 would force a reflow per chip.
     6. PROJECT and MASK — pure arithmetic, then the ONE rail measurement, at
        the one instant the navigator's painted geometry is settled. Still on
        the read side of the barrier.
     7. PLACE, DODGE, PAD — every DOM write.
     8. ZONES, then the two disclosure vessels.

     Steps 5 and 6 are separated for that barrier alone: `hotspots.measure()`
     and `hotspots.place()` are one owner's two phases, and the rail's read
     sits between them because it, too, is a read. */
  function update(p, chapterId, camera, dt = 0,
    {
      cameraStateDisagree = false,
      railWrap = null,
      railFlight = null,
      travelP = p,
    } = {}) {
    policies.resolve();
    /* TWO LINES, NOT ONE, AND THE SPELLING IS PINNED. U06 collapsed these
       into a single expression — same calls, same short-circuit, same value —
       and `tools/test-detail-close-focus.mjs` D8 went red: it asserts this
       predicate TEXTUALLY, here and in the card's synchronous rail release,
       so that the close path can never land on a state the next frame would
       undo. The spelling was restored rather than the assertion rewritten,
       because that suite is another order's and the contract it guards is
       real. It is nonetheless a D144-class pin — a spelling no gate owns
       semantically — and it should become one regex over one expression when
       its owner next touches it.

       THE RELEASE FUNCTION IS NOT NAMED ABOVE, DELIBERATELY. That same suite
       counts the token's textual occurrences to prove the release has exactly
       one call site, so a comment that spells it lands in the count as a
       third one. Naming it here cost two D4 assertions on the first attempt.
       Same measured hazard `destroy()` records at the bottom of this file. */
    const detailNow = isDetailOpen();
    const modalDetail = detailNow && !popover.isPinned();
    const detail = modalDetail;

    rail.update(p, { modalDetail, cameraStateDisagree, railWrap, railFlight });
    // The sheet's visual withholding of the rail — one writer, shared with the
    // close path so the two can never disagree (syncRailVisibility, above).
    cardTier.syncRailVisibility();
    copy.step({ chapterId, dt, travelP, railWrap, railFlight });

    chips.measure();
    const geom = projection.publish(camera);
    const excluded = railMask.refresh({ geom });

    chips.place({
      p, dt, detail, chapterId, railFlight,
      copyEase: copy.ease, excluded, geom, now: performance.now(),
    });
    zones.frame({ detail, copyEase: copy.ease, geom });

    popover.frame();
    cardTier.frame();
  }

  cardTier.watchViewport();


  return {
    update, addHotspot, addHoverZone, openCard, closeCard, rail, announce,
    prepareCopyEntry, armCopyEntry, cancelCopyEntry, setCopyEntryPlay,
    /** A chapter's live eased copy opacity (0..1) — the one signal that
     *  means "the intro is playing": settle-gated on a scroll arrival, the
     *  armCopyEntry envelope on a nav jump, fast release when travel
     *  begins. Read by journey.js as Inspire's landing-cascade gate (the
     *  chapter's 5c block), never written from outside. */
    copyEase: copy.ease,
    /** QA: the chapter whose copy is mid-entry, or null. */
    get arrivingChapter() { return copy.arrivingChapter; },
    /** QA: the existing scroll-style smoothed |dp/dt| travel signal. Direct
     *  clicks feed it their camera-phase coordinate, never parked route p. */
    get travelSpeed() { return copy.travelSpeed; },
    /** QA: exact screen-space classifier inputs from the most recent frame. */
    get profileRailDebug() { return railMask.debug; },
    /** QA: one atomic read of the copy authorities used in the latest rAF. */
    get copyDebug() { return copy.debug; },
    get cardOpen() { return cardTier.isOpen(); },
    /** QA: is that card COMMITTED (click / key / route), or a transient
     *  hover-and-focus reveal? — the card's half of `popPinned`. */
    get cardPinned() { return cardTier.isPinned(); },
    /** QA: whose card the box is currently showing, or null. */
    get cardNode() { return cardTier.isOpen() ? cardTier.nodeId() : null; },
    /** QA: is the card currently in its bottom-sheet form? */
    get cardIsSheet() { return cardTier.isSheet(); },
    /** QA: the touch-armed (first-tap) hotspot id, or null. */
    get armedNode() { const a = hotState.armed(); return a ? a.id : null; },
    /** QA: the node whose popover is showing, or null. */
    get popNode() { return popover.shownId(); },
    /** QA: is that popover pinned (committed) rather than a hover reveal? */
    get popPinned() { return popover.isPinned(); },
    card,
    pop: popover.element,
    hotspots,
  };
}
