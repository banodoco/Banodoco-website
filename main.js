// main.js — THE page entry (M5 shell step: index.html is markup + this one
// module). Everything that lived in index.html's two inline <script type=
// "module"> blocks is here, in the order it ran: the hero scene init
// (responsive compositions, callout trackers, QA params), then the journey
// bootstrap (input policy, delayed boot, intro fast-forward wiring). The
// old DOM input shield is GONE — replaced by the organism's input-policy
// API (organism.js setInputPolicy, item 6); the intro fast-forward's
// clock-skew mechanism moved into organism/intro.js accelerate(), and this
// file merely wires its trigger events. Styles moved to hero.css +
// journey/site.css. Zero behaviour change intended anywhere in this move.

import { createScene } from './organism/organism.js?v=1785427900';
import { CAPTURE, NOINTRO, INTROAT, HL, LIT, BODY_SERIF } from './flags.js';
// The journey's film grade, created at scene init rather than at journey boot
// — see THE GRADE IS ON FROM THE FIRST FRAME below. Static import: the module
// graph behind it (route/constants/ease) is small shared infrastructure.
import { createLens } from './journey/lens.js';
// The baked-geometry fetch starts the moment this import evaluates — early in
// the intro, so it has ~7s of runway before the chapter builds could want it.
// Awaited (bounded) in journey/boot/handoff.js's loadJourney, which is handed
// the promise rather than starting its own — see the note in its header.
import { ready as bakedGeomReady } from './journey/lib/baked.js';
/* THE FOUR OWNERS THIS FILE COMPOSES (B01). Everything that is left below is
   the page's own wiring — listeners, query params, the hero's furniture — and
   every machine this file used to inline now has a name and a header:

     boot/scene-note.js   the failure story: one visitor-facing note with a
                          working exit, and the ?debug=1 error channel.
     boot/hero-mode.js    the viewport mode and the five tables keyed by it —
                          compositions, the Mission truck, world anchors, the
                          live trackers, the `mode-*` class on <body>.
     boot/entry-queue.js  the chapter a control queued before the journey
                          booted, and the one place it is drained.
     boot/handoff.js      journey preparation -> intro release -> activation,
                          including the protected preboot -> live rail swap.

   WHAT DID NOT MOVE, and why, because "then why is this file still 300 lines"
   is a fair question. The annotation rail below is 130 lines of hero furniture
   geometry whose every constant carries a measurement; its only automated eye
   is the capture set, which hides `.callouts` by design, so a render check
   cannot see it at all. It is also the page's own hero rather than the
   journey's. Moving it would have bought a shorter file and no proof. */
import { createSceneNote, NOTE } from './journey/boot/scene-note.js';
import { createHeroMode } from './journey/boot/hero-mode.js';
import { createEntryQueue } from './journey/boot/entry-queue.js';
import { createJourneyHandoff } from './journey/boot/handoff.js';
// Fetch/parse the full journey graph during the quiet preparation frame. The
// previous late import began only after the 7.6s hero timer and moved a whole
// module waterfall into the settled scene.
const journeyModuleP = import('./journey/journey.js');

const note = createSceneNote();
const entryQueue = createEntryQueue();

/* ================================================================
   J05 — THE PAGE-LIFETIME REGISTER. Read this before adding a listener,
   a timer or an observer to this file.
   ================================================================
   Order J05 ("document and test page-lifetime singleton handlers separately
   from journey recreation") classifies every registration in this module.
   The classification is the deliverable; almost nothing here is converted,
   because a page-lifetime listener legitimately never detaches
   (`runtime-design/lifecycle.md` §5.3). The executable half is
   `tools/test-page-lifetime.mjs`, which scans this file's text and drives
   the two regions that can be driven out of a browser.

   B01 MOVED ONE SITE OUT OF THIS FILE AND NOT THE OTHER FIFTEEN, and the
   line it drew is the one this register already describes. Every PAGE and
   GATED registration below is page wiring and stayed here, because that is
   what this file is for. The single BOUNDED registration — the intro input
   capture — went with the machine that takes it back off,
   `journey/boot/handoff.js`, since a lifecycle split from its owner is
   exactly how a leak gets written. Section B of the suite now scans BOTH
   files and requires the union to be the same site set it always was: the
   register did not lose a site, it gained a file.

   THE THREE CLASSES, and the rule that separates them:

     PAGE      installed once when this module evaluates, lives until the
               document does, and is never taken back off. Legitimate. The
               property that matters is ONE INSTALL PER PAGE MODULE, which
               ESM's module cache delivers as long as no importer names a
               module under a second specifier form — see the note on the
               `?v=` import at the head of this file, and area D of the
               suite, which is the row that would notice.
     GATED     PAGE, but behind a QA flag, so an ordinary visitor installs
               nothing. `?introat` is the only one.
     BOUNDED   installed and later taken back off by the module that owns
               it. There is exactly ONE, and it is the intro input capture,
               now in journey/boot/handoff.js beside its own remover.

   THE REGISTER — 16 listener sites, by class:

     PAGE      window error / unhandledrejection — the error CHANNEL is
               journey/boot/scene-note.js's; these two sites hand it each
               event's message and are registered here because they are
               page-lifetime window listeners like every other line below.
     PAGE      the skip link's click
     GATED     the `?introat` load hook — inside `if (introAt !== null)`
     PAGE      the canvas's webglcontextlost / webglcontextrestored pair,
               and the 2.5s grace timer the first one arms
     PAGE      the window resize hook and its debounce timer
     PAGE      the explore CTA's capture-phase click
     PAGE      the logo link's click
     PAGE      the three callouts' mouseenter / mouseleave, the EQUIP tag's
               preventDefault, the INSPIRE / CONNECT tag navigation, and the
               hoverless-device EQUIP toggle. FIVE SITES, but they sit
               inside a loop over three callouts, so the live registration
               count is larger than the site count and a census that
               conflates the two is wrong in this file specifically.
     PAGE      the `b` serif-A/B keydown. SEE THE FINDING BELOW.
     BOUNDED   the intro input capture — one site, six event types, taken
               back off by stopIntroInputCapture() on every exit path. IN
               journey/boot/handoff.js, which carries this same note.

   FINDING, RECORDED NOT FIXED: the serif keydown is the shipped page's only
   UNGATED QA key hook. It is installed for every visitor and then decides
   at dispatch time, where `journey/dial.js` was moved the other way by J04c
   — gated at REGISTRATION so a plain load registers nothing (J-H19). The
   two are the same kind of QA affordance and they are now inconsistent.
   Making them consistent moves a registration, which is a behaviour change,
   so Wave 3 records it and does not take it.

   AND WHAT IS PAGE-LIFETIME BUT IS NOT A LISTENER:

     `readyState` (journey/boot/handoff.js) holds the journey's public
     handle and `state.ready` is its un-awaited preparation promise. Both
     are written once, for the one journey this page ever builds, and both
     live until the document does. THIS USED TO BE RECORDED AS A HAZARD —
     "a disposed journey stays reachable from readyState" — against a
     recreation nobody had ordered. The disposal machinery it was a hazard
     to is gone (docs/code-health/DISPOSAL-REMOVED.md) and the hazard is
     gone with it: this page boots one journey and the visitor's teardown
     is the tab closing.
   ================================================================ */
addEventListener('error', (e) => {
  note.recordError(String((e && e.message) || 'window error'));
});
addEventListener('unhandledrejection', (e) => {
  const r = e && e.reason;
  note.recordError(String((r && r.message) || r || 'unhandled rejection'));
});

// --- a11y: skip link (M5) ---
// The journey owns the ENTIRE hash namespace, and as of 2026-08-11 it owns it
// by EMPTYING it: any hash that arrives is read once and stripped
// (journey/state.js clearRoute + its hashchange listener). So a plain native
// `href="#site-nav"` fragment jump would get stomped mid-flight — the
// browser's own "focus the fragment target" behaviour races the strip, and
// the visitor is left with neither the focus nor the fragment. Move focus
// programmatically instead; the href stays real markup (works with JS
// disabled, and is a correct fallback if this listener ever fails to attach)
// but a normal click never lets the browser touch location.hash.
const skipLink = document.querySelector('.skip-link');
if (skipLink) {
  skipLink.addEventListener('click', (e) => {
    const target = document.querySelector(skipLink.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.focus();
  });
}

/* The hero's composition, its world anchors and its live tracker set are
   all keyed by one thing — which breakpoint band this viewport is in — so
   they are one owner now. journey/boot/hero-mode.js carries the five tables
   and their measurement provenance verbatim, plus the two functions that
   read them and the single write site `current` has.

   THE ORDER BELOW IS LOAD-BEARING and is the order this file always used:
   construct (resolve the mode, build the three trackers off its anchors) ->
   build the scene from viewFor(current) with those trackers -> mount(),
   which publishes the `mode-*` class to <body> AFTER the scene exists. */
const heroMode = createHeroMode();
const TRACKS = heroMode.tracks;

// --- scene init ---
// The entry choreography (see the ENTRY comment in hero.css) hangs off the
// scene's 5.4s grow-in; honor reduced-motion, and let ?nointro=1 skip the
// whole sequence for design-review screenshots of the settled page.
// ?capture=<p> (M5) implies nointro: a frozen still has no choreography.
const captureQ = CAPTURE;
const skipIntro = matchMedia('(prefers-reduced-motion: reduce)').matches
  || NOINTRO
  || captureQ !== null;
if (skipIntro) {
  const st = document.createElement('style');
  st.textContent = '#stage, .spill, nav, h1 .hl, .sub, .cta, .co, .co * { animation: none !important; }';
  document.head.appendChild(st);
}

// ?introat=P freezes the page half of the choreography at progress P (0..1);
// the scene half freezes itself off the same param (see introStateAt)
const introAt = INTROAT;
const INTRO_S = 5.4; // the hero entry choreography length; the ?introat freeze maps 0..1 onto it
if (introAt !== null) {
  addEventListener('load', () => {
    const ms = Math.min(1, Math.max(0, parseFloat(introAt) || 0)) * INTRO_S * 1000;
    for (const a of document.getAnimations()) { a.currentTime = ms; a.pause(); }
  });
}

let sceneApi = null;
try {
  sceneApi = createScene({
    ...heroMode.viewFor(heroMode.current()),
    container: document.getElementById('stage'),
    tiltX: -0.14,
    bg: 0x1c160b,
    quiet: { x: -5.2, z: 4.2, rx: 4.8, rz: 3.4, strength: 0.7 },
    trackers: [TRACKS.connect, TRACKS.inspire, TRACKS.equip],
    intro: skipIntro ? 0 : INTRO_S,
    deferIntro: !skipIntro && introAt === null,
  });
} catch (err) {
  document.body.classList.remove('scene-preparing');
  console.error('[glowshroom] scene failed to start', err);
  note.show(NOTE.sceneFailed);
}

if (sceneApi) {
  // A mobile tab can drop its WebGL context without warning and never restore
  // it (mobile Safari especially). Hold the fallback note behind a 2.5s grace
  // window: a restore inside it is invisible; a loss that outlives it gets the
  // static-tier fallback.
  const canvas = sceneApi.renderer.domElement;
  let restoreTimer = null;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // tell the browser it should attempt a restore
    restoreTimer = setTimeout(() => {
      note.show(NOTE.contextLost);
    }, 2500);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(restoreTimer);
    note.hide();
  });
}

/* THE GRADE IS ON FROM THE FIRST FRAME (2026-08-16 — Hannah: "a weird shift
   like a filter has been added after the whole thing loads"). The film grade
   (journey/lens.js) used to arrive with journey boot, 7.6s+ after load, so
   the hero played its whole intro RAW and the approved graded look — every
   golden is shot with it — snapped on in one frame when the module landed
   (measured: a +2.2/255 warm step across the entire frame, the reported
   "filter"). The lens is a singleton now; creating it here puts the grade on
   the first painted frame, and boot's own createLens() call receives this
   same instance. Guarded like the scene itself: a lens that fails must not
   take the page down, and on a throw the singleton stays unset, so boot's
   call simply retries — the old arrive-with-the-journey path as fallback. */
if (sceneApi) {
  // FRAME-ORDER GUARD: the journey's contract is spine-animator-first (see
  // "THE SPINE'S ANIMATOR IS REGISTERED FIRST" in journey.js) — every later
  // registration (the lens's focus projection, the prebuilt chapters') must
  // read the camera AFTER the spine has written it. Creating the lens here,
  // before boot, would put its animator ahead of that slot, so the slot is
  // parked first: addAnimator with the same name replaces IN PLACE
  // (organism.js's documented semantics), so boot's real spine inherits this
  // position ahead of everything journey-side.
  sceneApi.addAnimator('journey', () => {});
  try { createLens(sceneApi); }
  catch (err) { console.error('[glowshroom] lens failed to start — the grade will arrive with the journey instead', err); }
}

heroMode.mount();

// --- annotation rail: the three callout tags are ONE typographic system ---
// (2026-08-16) The old approach placed each tag with hand-tuned per-breakpoint
// CSS offsets, which is why the three labels never shared an edge, a leader
// length, or a vertical rhythm — and why CONNECT sat down in the root
// network's brightest noise. Now: every tag right-aligns to a single rail
// (the nav's content inset — the same edge the Discord control hangs from),
// every label floats in the dark band ABOVE its node, and every leader speaks
// one language: dot at the node, a 45° diagonal rise, then a horizontal run
// into the label at row height. INSPIRE's node sits at/right of the rail, so
// its diagonal rises until it clears the label's left edge and the horizontal
// runs back INTO it — same terminal, mirrored approach.
// The hero camera is bit-exact static (organism/furniture.js), so node screen
// positions are deterministic per viewport: this runs at boot / resize / mode
// change, never per frame.
const RAIL = {
  // rise: how far each label floats above its node (px, pre-.co-scale),
  // chosen so INSPIRE and CONNECT land in dark negative space. EQUIP has no
  // rise entry: its label hugs its node (a small 40px lift), because a label
  // pushed high "for rhythm" drags a huge empty bracket across the void —
  // seen and rejected on a 14" frame. `sep` is the floor on the EQUIP->
  // CONNECT label spacing (screen px): on short viewports where the stem
  // node and CONNECT's label crowd together, EQUIP lifts just enough to
  // keep that daylight, and no more.
  // `run` (2026-08-16, Hannah: "the labels generally feel too far right...
  // sloppy engineering"): on wide frames each label now sits a SHORT run
  // from its own node instead of right-railing to the nav inset — the
  // shared right rail dragged EQUIP's tag 370px from its stem, into the
  // viewport corner. One run length across the tags IS the shared system;
  // modes without `run` keep the nav-inset rail (narrow frames, where the
  // inset is already close to everything).
  // rise sign: positive floats the label ABOVE its node, negative hangs it
  // BELOW (INSPIRE on wide frames: dot at the plume's origin, label tucked
  // under it — Hannah's reference). `runs` caps each leader's node->end
  // horizontal reach per label; modes without it rail to the nav ceiling.
  // THE RAIL'S FLANK IS FURNITURE TOO (2026-08-17, Hannah: INSPIRE "overlaps
  // with the side thing on mobile" and "seems to point off screen"): the side
  // navigator (journey/rail.js) is fixed to the right edge, vertically
  // centred, and boots into exactly the band the narrow modes railed
  // INSPIRE's label to. Measured at 375x812: tag 278-362 x 422-446 vs rail
  // tiles 323-375 x 384-480 — the label sat ON the tiles, and the rail's
  // divider rule beside it read as a leader running off the frame. Tablet
  // (768x1024) and compact (844x390) overlapped the tile band by 5-12px.
  //   mobile: inspireColumn — the dot stays at the plume's origin and the
  //     label tucks UNDER it (the desktop reference, same branch), which
  //     lands it below the rail's whole column instead of on it (tag
  //     505-529 vs tiles ending 480, measured after).
  //   tablet 72->100: the riser lifts the label clear of the tile band's
  //     top (444-472 vs tiles starting 484, measured after).
  // Compact is deliberately NOT retuned: its bend clamps to 16px of rise
  // whatever this table says (the endX-24 cap in railApply), and measured
  // at 844x390 only the tags' invisible padding boxes cross the tile edge —
  // every stroke of ink clears. The current restage adds compact runs and
  // shortens every mode's reach so annotations sit closer to their anatomy.
  desktop:    { inspire: -32, inspireColumn: true, connect: 72, sep: 120, runs: { inspire: 76, equip: 150, connect: 120 } },
  deskNarrow: { inspire: -32, inspireColumn: true, connect: 72, sep: 120, runs: { inspire: 72, equip: 136, connect: 112 } },
  compact:    { inspire: 56, connect: 44, sep: 84, runs: { inspire: 48, equip: 100, connect: 80 } },
  // tablet runs joined with ITS centring pass (2026-08-17, Hannah: "the way
  // on mobile we hide the main button and centre align the mushroom with the
  // labels — do the same on tablet"): railed to the nav inset the labels were
  // pinned to the viewport's right edge and VIEWS.tablet's pan could only
  // stretch their leaders. equip 176 / connect 123 are the reaches measured
  // at 768x1024 in the rail era, so the layout is unchanged except that the
  // ensemble now pans as one. inspire 8 sits under railApply's endX<18
  // riser threshold on purpose: it LOCKS the label onto its centered
  // vertical riser (the branch it already took), where before the lock the
  // pan would have grown maxRailX past the threshold and bent the leader
  // toward the nav inset. equalSpacing now derives INSPIRE's row from the
  // live EQUIP -> CONNECT gap, while leaving that riser language intact.
  // The current restage preserves the riser and shortens the two side runs.
  tablet:     { inspire: 100, connect: 84, sep: 120, equalSpacing: true, runs: { inspire: 8, equip: 140, connect: 98 } },
  // mobile rebalance (2026-08-17, Hannah: "equip should be mid distance
  // between inspire and connect and inspire maybe should be a tiny bit
  // lower"): one 74px beat through the whole column. connect 66->42 brings
  // its label down to where the midpoint lands on EQUIP's OWN row (the
  // stem node, riseEquip 0 — a clean unbroken rule, no wobble-bend), sep 74
  // is exactly the E->C gap so the crowding guard binds at zero, and
  // INSPIRE used to carry a fixed tuckSep 74. That was exact at 375x812 but
  // drifted at other phone heights as the projected E->C gap changed.
  // equalSpacing mirrors the LIVE E->C row-centre gap above EQUIP instead,
  // so all three rows keep one beat at every portrait size.
  // runs joined mobile with the centring pass (2026-08-17, Hannah: "move the
  // mushrooms/labels so together they feel in the middle horizontally"):
  // railed to the nav inset, the labels were PINNED to the viewport's right
  // edge and the camera pan below could only stretch their leaders. On runs
  // they hang off their own nodes — the measured rail-era offsets, so the
  // whole ensemble can pan as one. The current restage shortens those runs.
  mobile:     { inspire: 60, inspireColumn: true, connect: 22, sep: 74, equalSpacing: true, runs: { equip: 70, connect: 80 } },
};
const RAIL_GAP = 8; // leader end -> tag box left edge
const RAIL_VGAP = 5; // vertical-drop leader end -> tag box bottom edge

// The camera is static AT REST, but the pointer-driven quiet drift moves it a
// few pixels, and each anchor shifts by a DIFFERENT parallax amount — a
// one-shot layout measured at boot drifts out of alignment (up to ~13px
// between right edges, measured). So the geometry splits in two:
//   railRefresh() — the layout-forcing reads (rects, computed styles,
//     offsetWidth). Boot / resize / mode change / post-intro only.
//   railApply()   — pure arithmetic from the cached metrics + each frame's
//     projected node x. Registered as a scene animator AFTER 'trackers'
//     (registration order is frame order), so it reads same-frame
//     projections; it writes nothing when a node hasn't moved.
const _rail = { railRight: 0, tags: null, last: '' };

function railRefresh() {
  const cta = document.querySelector('.nav-cta');
  // the nav content inset is the CEILING for the rail, not its home — see
  // railApply: the rail itself derives from the plume node
  _rail.navRight = cta ? cta.getBoundingClientRect().right : innerWidth - 54;
  /* MEASURE THE SETTLED TRUTH, NEVER THE ENTRANCE (2026-08-18 — Hannah: "a
     stutter and then they shift to the left a little bit"). The callout
     entrance animates letter-spacing (measured 4.224px -> 3.168px), so a
     boot-time measure catches the tags ~7px WIDER than they will rest, the
     rail seats everything against that lie, and the post-intro re-measure —
     a setTimeout that a busy main thread can stretch from 7.7s to 12s+ —
     then corrects it in plain view: the reported stutter-and-shift, landing
     in dead stillness. Measuring the live elements with animations
     suppressed is not safe either (toggling animation-name RESTARTS a CSS
     animation — a timer/resize refresh would replay the entrance). So the
     metrics come from a hidden CLONE of .callouts: same classes, so every
     stylesheet rule applies; inline `animation/transition: none` on every
     cloned node beats the entrance keyframes, so the clone stands in its
     resting geometry no matter when this runs; removed the same tick, never
     painted. The live elements keep their choreography untouched — and
     because boot now measures the same numbers the post-intro pass will,
     that pass becomes the no-op it was always meant to be. */
  const ghost = document.querySelector('.callouts').cloneNode(true);
  ghost.style.cssText = 'position:absolute; visibility:hidden; pointer-events:none; inset:0;';
  for (const el of ghost.querySelectorAll('*')) {
    el.style.animation = 'none';
    el.style.transition = 'none';
    el.style.opacity = '';        // entrance may have inlined mid-fade values
  }
  document.body.appendChild(ghost);
  try {
    _rail.tags = {};
    for (const key of ['inspire', 'equip', 'connect']) {
      const liveCo = TRACKS[key].el.querySelector('.co');
      const gCo = ghost.querySelector('#' + TRACKS[key].el.id + ' .co') || liveCo;
      const gTag = gCo.querySelector('.tag');
      const gRow = gTag.querySelector('.row');
      // mobile scales .co 0.88 (hero.css) — work in the pre-scale space
      const t = getComputedStyle(gCo).transform;
      _rail.tags[key] = {
        tag: liveCo.querySelector('.tag'),           // railApply writes the LIVE tag
        paths: liveCo.querySelectorAll('path'),
        s: t && t !== 'none' ? new DOMMatrix(t).a : 1,
        padR: parseFloat(getComputedStyle(gTag).paddingRight) || 0,
        padL: parseFloat(getComputedStyle(gTag).paddingLeft) || 0,
        w: gTag.offsetWidth,
        h: gTag.offsetHeight, // the column tuck's room guard reads it (railApply)
        rowMid: gRow.offsetTop + gRow.offsetHeight / 2,
      };
    }
  } finally {
    ghost.remove();
  }
  _rail.last = ''; // force a rewrite on the next frame
}

function railApply() {
  if (!_rail.tags) return;
  /* FREEZE DURING DEPARTURE (2026-08-16, Hannah: "when I press on 'inspire'
     or the other hero labels there's a weird visual glitch"): a hero-label
     press jumps the journey; the camera flies, the trackers keep projecting,
     and re-deriving the rail from those swinging projections stretched
     half-faded leaders across the frame. journey.js owns the callouts'
     opacity/inert during any jump (paintHeroFurniture) — while it does,
     hold the last hero-pose geometry and let the set fade as one. */
  const co = document.querySelector('.callouts');
  if (co && (co.inert || (co.style.opacity !== '' && +co.style.opacity < 0.999))) {
    /* ...and holding the GEOMETRY is not enough (2026-08-16, Hannah: "the
       glitch with the labels persisting seems to maybe have recurred"):
       the trackers still translate each callout with its flying node, so
       over heroExit's 0.35s fade the whole set visibly chased the world.
       Re-assert the last hero-pose transforms — rail runs AFTER 'trackers'
       in the frame order, so this wins the frame — and the set fades out
       exactly where it stood. */
    if (_rail.pin) for (const key of ['inspire', 'equip', 'connect']) {
      TRACKS[key].el.style.transform = _rail.pin[key];
    }
    return;
  }
  const rises = RAIL[heroMode.current()];
  const pos = {};
  let sig = '';
  for (const key of ['inspire', 'equip', 'connect']) {
    const tf = TRACKS[key].el.style.transform || '';
    const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(tf);
    if (!m) return; // not projected yet
    pos[key] = [+m[1], +m[2]];
    sig += tf + '|';
  }
  // the last live hero pose — reasserted, not recomputed, while frozen
  _rail.pin = {
    inspire: TRACKS.inspire.el.style.transform,
    equip: TRACKS.equip.el.style.transform,
    connect: TRACKS.connect.el.style.transform,
  };
  if (_rail.last === sig) return; // nothing moved — nothing to write
  _rail.last = sig;
  /* LABELS SIT A SHORT RUN FROM THEIR OWN NODE (2026-08-16, Hannah: "the
     labels generally feel too far right... the label[s] become disconnected
     from the line. It feels like sloppy engineering"). The shared right
     rail at the nav inset dragged every tag into the viewport corner —
     EQUIP's leader crossed 370px of void. Now `rises.run` caps each
     leader's horizontal reach, so a label hangs just off its own anatomy;
     the nav inset survives only as the CEILING no label may pass. The
     shared system is the leader LANGUAGE: one run length, one gap, one
     rise vocabulary.
     AND THE LEADER ALWAYS TOUCHES ITS LABEL. The run ends a fixed breath
     from the TEXT (the box's invisible padding used to double the gap),
     and the no-room fallback centers the label ON its riser and drops the
     line into its underside — never the old offset drop that left a label
     floating a label-width beside its own line. */
  /* LEADER LANGUAGE v3 (2026-08-16, Hannah's reference image: "make it more
     like this... I mean the label positioning and bend"): a short 45° bend
     off the node, then a horizontal run into the label at row height —
     labels hang just off their own anatomy.
       INSPIRE — dot at the plume's origin off the cap rim; the bend dips
         DOWN-right (negative rise), label just below dot height.
       EQUIP   — no bend at all: one unbroken rule from the stem dot
         straight into the label (lifts on a 45° bend only when a short
         frame would crowd it into CONNECT).
       CONNECT — the bend climbs up-right out of the root network.
     Narrow modes keep the centered vertical riser for INSPIRE (positive
     rise + no room for a run), where a below-the-plume label would land on
     the cap. */
  // CONNECT's label height (screen) — EQUIP's crowding guard reads it
  const cyConnect = pos.connect[1] - rises.connect * _rail.tags.connect.s;
  let riseEquip = Math.min(160, Math.max(0, (rises.sep - (cyConnect - pos.equip[1])) / _rail.tags.equip.s));
  // a lift under ~34px would read as a wobble, not a bend — snap the label
  // onto the line instead: one unbroken rule from the stem dot
  if (riseEquip < 34) riseEquip = 0;
  /* INSPIRE ON THE COLUMN, ON THE BEAT (2026-08-16, Hannah: "inspire needs
     to be roughly equally distant from equip to connect... must also
     continue to point at the spores... same kinda line horizontally to
     connect, think of the feng shui"): on wide frames INSPIRE's label
     shares CONNECT's column and its height completes the even cascade
     (I->E gap = E->C gap), while the dot stays at the spore plume's
     origin. That dot lands almost directly over the column here, so the
     leader is a plain riser dropping into the label's top — the bend with
     nowhere left to bend. */
  const cyEquip = pos.equip[1] - riseEquip * _rail.tags.equip.s;
  // Portrait rows share one vertical beat. Derive INSPIRE from the actual
  // projected EQUIP -> CONNECT gap rather than maintaining a second tuned
  // offset that only agrees at one viewport height.
  const cyInspire = rises.equalSpacing ? 2 * cyEquip - cyConnect : null;
  const tC = _rail.tags.connect;
  const colRight = pos.connect[0] + Math.min(
    ((rises.runs && rises.runs.connect) ?? Infinity) + RAIL_GAP - tC.padL + tC.w,
    (_rail.navRight - pos.connect[0]) / tC.s + tC.padR) * tC.s;
  for (const key of ['inspire', 'equip', 'connect']) {
    const [nx, ny] = pos[key];
    const c = _rail.tags[key];
    const run = (rises.runs && rises.runs[key]) ?? Infinity; // node -> leader-end reach
    const maxRailX = (_rail.navRight - nx) / c.s + c.padR; // box right edge ceiling
    let railX = Math.min(run + RAIL_GAP - c.padL + c.w, maxRailX);
    let endX = railX - c.w - RAIL_GAP + c.padL; // leader end: RAIL_GAP short of the text
    let rise = key === 'equip'
      ? riseEquip
      : key === 'inspire' && cyInspire != null
        ? (ny - cyInspire) / c.s
        : rises[key];
    let d;
    /* THE TUCK NEEDS ROOM (2026-08-17): inspireColumn hangs the label BELOW
       its dot, and on squat mobile aspects (360x640: viewFor's zoom-out
       interp) the cap-rim node projects nearly onto EQUIP's own label row —
       the tucked label landed on EQUIP's text. The column is taken only
       when the tucked label's bottom clears EQUIP's label top by a breath;
       otherwise fall through to the mode's plain rise (the riser branch),
       which is the pre-tuck arrangement. Wide frames never trip this — their
       cascade puts 100+px between the plume dot and EQUIP's row. */
    let column = key === 'inspire' && rises.inspireColumn;
    let dropPx = 0;
    if (column) {
      /* Three ways to set the tucked label's height (screen px):
         - equalSpacing (portrait): its row mirrors the live E->C interval.
         - tuckSep: a legacy fixed-beat option for any future mode that needs
           the label pinned to a particular furniture slot.
         - even-cascade (wide frames): I->E mirrors E->C, unchanged. */
      dropPx = rises.equalSpacing
        ? cyInspire - ny
        : rises.tuckSep != null
          ? Math.max(30, cyEquip - rises.tuckSep - ny)
        : Math.max(30, 2 * cyEquip - cyConnect - ny);
      const tuckBottom = ny + dropPx - c.rowMid * c.s + c.h * c.s;
      const equipTop = cyEquip - (_rail.tags.equip.h * _rail.tags.equip.s) / 2;
      if (tuckBottom + 8 > equipTop) column = false;
    }
    if (column) {
      // even-cascade height, CONNECT's column — the leader is ONE 45°
      // diagonal from the dot up in the spores down-left into the label's
      // TOP CENTRE (2026-08-16, Hannah: the chevron "looks weird, make it
      // less shape, pointing higher into the spores, similar angle to the
      // connect one"). The anchor sits up the plume's sweep so the dot
      // lands up-right of the top centre by ~its drop distance; where a
      // frame bends that, the diagonal keeps 45° and finishes with a short
      // vertical step into the label.
      // Non-equal modes retain a 30px floor above. Portrait keeps the exact
      // row rhythm; its room guard reroutes the leader if that would crowd
      // EQUIP instead of silently changing the spacing.
      const drop = dropPx / c.s;
      rise = -drop;
      railX = Math.min((colRight - nx) / c.s, maxRailX);
      const ex = railX - c.w / 2;             // label top-centre (local)
      const ey = drop - c.rowMid - RAIL_VGAP; // a breath above the box top
      d = (ex < -8 && -ex < ey - 4)
        ? `M0,0 L${ex.toFixed(1)},${(-ex).toFixed(1)} V${ey.toFixed(1)}`
        : `M0,0 L${ex.toFixed(1)},${ey.toFixed(1)}`;
    } else if (endX < 18 && rise > 0) {
      // no room for a horizontal run — the label centres on its riser and
      // the leader rises INTO its underside
      railX = Math.min(c.w / 2, maxRailX);
      d = `M0,0 V${(-(rise - c.rowMid - RAIL_VGAP)).toFixed(1)}`;
    } else if (rise === 0) {
      d = `M0,0 H${endX.toFixed(1)}`; // the unbroken rule
    } else {
      // 45° bend toward the label, then the horizontal run. |rise| is the
      // bend's reach; shrink it rather than let the run vanish.
      let bend = Math.min(Math.abs(rise), Math.max(16, endX - 24));
      if (rise < 0) rise = -bend; else rise = bend;
      d = `M0,0 L${bend.toFixed(1)},${(-rise).toFixed(1)} H${endX.toFixed(1)}`;
    }
    for (const p of c.paths) p.setAttribute('d', d);
    c.tag.style.left = railX.toFixed(1) + 'px';
    c.tag.style.top = (-rise - c.rowMid).toFixed(1) + 'px';
    c.tag.style.transform = 'translateX(-100%)';
  }
}

if (sceneApi) {
  // ?capture=<p> (M5): freeze the organism's shared clock at the t = 0 phase
  // before the journey boots — every time-driven system (sway, drift, shimmer,
  // TAA jitter) parks deterministically so capture.py gets pixel-stable
  // frames. The journey half (jumping to exactly p) is in journey.js.
  if (captureQ !== null) sceneApi.freezeTime(0);

  // rail layout: the hidden settled clone supplies final metrics before the
  // intro; the animator keeps projected geometry current every frame.
  railRefresh();
  sceneApi.addAnimator('rail', railApply);

  /* RESIZE HAS TWO ANSWERS, AND ONLY ONE OF THEM IS A BREAKPOINT CROSSING.
     `reframesWithinMode` names what used to be an inline triple here: three
     of the five modes keep moving their composition INSIDE the band, so a
     drag that never crosses a breakpoint still has to re-frame for them and
     must not for the other two. The crossing case eases the camera FIRST and
     adopts SECOND — the order the old applyMode() ran in, kept deliberately,
     since adopt() re-anchors the trackers the easing camera is about to
     project. */
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const mode = heroMode.resolve();
      if (heroMode.reframesWithinMode(mode) && mode === heroMode.current()) {
        sceneApi.setView(heroMode.viewFor(mode), 0.6);
      }
      if (mode !== heroMode.current()) {
        // ease the camera between breakpoints instead of snapping
        sceneApi.setView(heroMode.viewFor(mode), 0.6);
        heroMode.adopt(mode);
      }
      // re-measure the rail metrics (nav inset, tag widths, .co scale
      // may all have changed with the breakpoint); the animator follows
      // the easing camera on its own
      railRefresh();
    }, 150);
  });
}

// The left CTA remains live while the right side is the empty WebGL frame.
// Capture it before journey.js's later bubble listener so an early click is a
// queued normal jump, never a temporary #/inspire URL write or a lost press.
// A press before the journey module has booted goes to the entry queue
// (journey/boot/entry-queue.js), which holds the intent the browser used to
// hold for us in the URL and asks boot to start departing at once.
const exploreCta = document.querySelector('.ui .cta');
if (exploreCta) {
  exploreCta.addEventListener('click', (e) => {
    if (window.journey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    entryQueue.request('inspire');
  }, true);
}

/* THE LOGO IS A HOME CONTROL (2026-08-12, Hannah: "Make clicking the logo in
   the top left also travel to the hero view.")

   THROUGH THE JOURNEY, NOT THROUGH THE URL. 239d6c7 removed hash routing
   outright — the ride writes nothing and the visitor's first Back still leaves
   the site — so this cannot be an href that navigates. It goes through
   window.journey.flyTo, the same handle the rail's tiles and the two hero
   callouts above already use, which means it inherits the whole jump for free
   and by construction rather than by re-implementation: the cylindrical arc
   (043a1f2), the destination copy keyed off the arrival (d1ecc23), the
   destination chapter suppressed through the blend (a8d4518), and the rail's
   active mark following chapterAt(p) on the next frame.

   NO isTouch GATE, unlike the callouts. Those two are gated because on touch
   their tags do something else entirely (they arm the region highlight); the
   logo has no second job. A home control is a home control on every device,
   and the keyboard gets it for nothing — this is a real <a> and Enter fires
   `click`, so pointer, touch and keyboard all arrive down this one path.

   ALREADY AT THE HERO — nothing extra is guarded here, and it took measuring
   to be sure of that rather than assuming it either way.
   The worry is real in principle: a jump hides the destination chapter's copy
   for the whole camera blend (a8d4518) and fades it in on arrival (d1ecc23),
   so a jump that travels almost nowhere would blank the hero copy you are
   already reading and hand it back a second later. Shot with the hero block's
   opacity sampled every 40ms, that is exactly what a click at p = 0.02 does:
   1.00 straight to 0.00, still 0.00 two seconds later.
   It is also not a state this site can be in. The scroll surface RESTS ONLY AT
   CHAPTER POSES — wheeled in from a cold load it settles at 0.0000 (10 and 16
   notches, hero copy still 1.00) or at 0.2600 in Inspire (24 notches and up),
   with nothing in between; p = 0.02 exists only under the QA ?p= flag, and the
   surface was actively settling out of it while it was being measured. So
   "already at the hero" always means p = 0 exactly, where directJumpTo's own
   1e-4 refusal fires first. Measured at the hero: camera position unchanged to
   four decimals with zero spread across the whole window, fov unchanged, hero
   copy pinned at 1.000, URL still clean. The press is a true no-op — which is
   the right answer for a home control you are already home in, and it costs no
   special case. If the ride ever gains free scrolling, this is the note to
   come back to. */
const logoLink = document.querySelector('.logo');
if (logoLink) {
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.journey) window.journey.flyTo('mission');
    else entryQueue.request('mission', { fast: false });
  });
}

// hovering a callout gently lights its region of the specimen
if (sceneApi) {
  const isTouch = matchMedia('(hover: none)').matches;
  for (const [id, region] of [['co-inspire', 'spores'], ['co-equip', 'stem'], ['co-connect', 'ground']]) {
    const el = document.getElementById(id);
    el.addEventListener('mouseenter', () => sceneApi.setHighlight(region, true));
    el.addEventListener('mouseleave', () => sceneApi.setHighlight(region, false));

    // EQUIP has no chapter yet (deferred) — its tag keeps the "coming soon"
    // reveal but must never navigate.
    if (id === 'co-equip') {
      el.querySelector('.tag').addEventListener('click', (e) => e.preventDefault());
    }

    // INSPIRE / CONNECT enter the journey at that chapter. Until 2026-08-11 the
    // NAVIGATION WAS THE HREF: these two tags were made real `#/<chapter>` links
    // in a089e40 and the hash router picked the resulting hashchange up — which
    // is precisely the URL write Hannah asked to remove. They navigate through
    // the journey's own handle now, exactly as the rail's tiles do (a direct
    // camera jump, not a placement), and the href stays in the markup: it costs
    // nothing, it keeps the control a real link for the keyboard and for
    // "open in new tab", and a tab opened that way arrives as an inbound deep
    // link — placed on arrival, then cleaned.
    //
    // ONE TAP ON EVERY DEVICE (2026-08-19): these two used to ride a touch-only
    // "tap twice to travel" model — the first tap was the hover (light +
    // reveal via .force), the second the click. That read as two taps where a
    // tap should act, so INSPIRE/CONNECT now navigate on the FIRST tap exactly
    // as the desktop click does; no isTouch gate. EQUIP keeps its toggle
    // below — it has no chapter yet, so its tap has nothing to commit to and
    // lights + reveals "coming soon" instead.
    if (id === 'co-inspire' || id === 'co-connect') {
      const chapter = id.slice(3);
      el.querySelector('.tag').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.journey) window.journey.flyTo(chapter);
        else entryQueue.request(chapter);
      });
    }

    // EQUIP (touch): no chapter, so a tap toggles the lit state — the only way
    // a finger reaches the "coming soon" reveal on a hoverless device.
    if (isTouch && id === 'co-equip') {
      const co = el.querySelector('.co');
      const tag = el.querySelector('.tag');
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        const willForce = !co.classList.contains('force');
        for (const other of document.querySelectorAll('.co')) other.classList.remove('force');
        for (const [oid, oregion] of [['co-inspire', 'spores'], ['co-equip', 'stem'], ['co-connect', 'ground']]) {
          sceneApi.setHighlight(oregion, oid === id && willForce);
        }
        if (willForce) co.classList.add('force');
      });
    }
  }

  /* THE HERO'S ACTIVATION ENDS WHEN THE HERO LEAVES (2026-08-19).
     The journey owns the callout container's presence and hit model: on a
     departure paintHeroFurniture makes `.callouts` inert, and on a return it
     removes inert once the set is genuinely live again. The touch-only EQUIP
     affordance above owns a different piece of state, `.force`, plus the
     corresponding specimen highlight. Neither was cleared by opacity/inert,
     so a tap made before travelling could survive several chapters and
     reappear as an already-open "coming soon" label on the next Mission
     arrival. Mobile Safari can likewise retain focus on an element as an
     ancestor becomes inert.

     Observe the lifecycle boundary already authored by journey.js rather than
     infer it from scroll position or animation timing. Clear on departure and
     again on re-entry (belt-and-braces for a tab restored mid-journey); blur
     only while becoming inert, so real keyboard focus while the hero is live
     is untouched. QA's ?lit and ?hl states remain authoritative. */
  const calloutsEl = document.querySelector('.callouts');
  const clearHeroCalloutActivation = ({ leaving = false } = {}) => {
    if (!LIT) {
      for (const co of calloutsEl.querySelectorAll('.co.force')) co.classList.remove('force');
    }
    for (const region of ['spores', 'stem', 'ground']) {
      sceneApi.setHighlight(region, region === HL);
    }
    if (leaving && document.activeElement && calloutsEl.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  };
  if (calloutsEl && typeof MutationObserver === 'function') {
    new MutationObserver((records) => {
      if (!records.some((r) => r.attributeName === 'inert')) return;
      clearHeroCalloutActivation({ leaving: calloutsEl.inert });
    }).observe(calloutsEl, { attributes: true, attributeFilter: ['inert'] });
  }

  // --- design-review / QA query params ---
  // ?hl=spores|stem|ground forces a region highlight (design review / QA)
  const hlq = HL;
  if (hlq) sceneApi.setHighlight(hlq, true);

  // The journey extension needs the scene handle (groups, consts, addAnimator,
  // setView) — adr-d3 section 2. Promoting the hero's ?dbg=1 hook to an
  // unconditional one is visually inert and applies to THIS PAGE only; the
  // archived archive/golden-mushroom-page.html (frozen, non-runnable — see
  // tag v6-prepromote for the last runnable copy) keeps the ?dbg gate.
  window.sceneApi = sceneApi;
}

// ?lit=1 forces all callouts into their hover state (design review / QA);
// transitions are snapped so the forced state renders instantly
if (LIT) {
  const st = document.createElement('style');
  st.textContent = '.co * { transition: none !important; }';
  document.head.appendChild(st);
  document.querySelectorAll('.co').forEach(el => el.classList.add('force'));
}

// serif body A/B for design review: press B, or load with ?body=serif
if (BODY_SERIF)
  document.body.classList.add('body-serif');
addEventListener('keydown', (e) => {
  if (e.key !== 'b' && e.key !== 'B') return;
  // same guard as every raw-listener key seam (M5 key-routing pass)
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  document.body.classList.toggle('body-serif');
});
/* ============================================================
   JOURNEY PREPARATION — the canvas stays on the organism's own empty frame.
   The left copy and CTA are already live; chapter construction, portrait
   atlases, shader compilation and real first GPU draws finish before the
   mushroom's visible clock starts. There is no fixed loading duration.

   The machine that runs all of that is journey/boot/handoff.js: preparation
   -> intro release -> activation, the buffered first gesture, the two
   timers, and the protected preboot -> live rail swap. It is the one region
   of this file that was a state machine rather than wiring, which is why it
   is the one region that left. Read its header before changing anything
   here — the arguments below are the whole of its dependency on the page.

   THE PROMISES ARE STARTED HERE AND HANDED DOWN, not started inside. Both
   fetches are timed against the intro's runway by the comments at the head
   of this file, and a module-scope import inside the machine would begin
   during import resolution instead — earlier, and no longer what those
   comments say.
   ============================================================ */
if (sceneApi) {
  createJourneyHandoff({
    scene: sceneApi,
    entryQueue,
    note,
    journeyModule: journeyModuleP,
    bakedGeomReady,
    // already includes ?nointro, ?capture and reduced motion
    skipIntro,
    // ?introat — the choreography is pinned at a progress and must not run
    frozen: introAt !== null,
    introSeconds: INTRO_S,
  });
}
