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
import { CAPTURE, NOINTRO, INTROAT, HL, LIT, BODY_SERIF, FREE_CAM, DEBUG_OVERLAY } from './flags.js';
// The journey's film grade, created at scene init rather than at journey boot
// — see THE GRADE IS ON FROM THE FIRST FRAME below. Static import: the module
// graph behind it (route/constants/ease) is small shared infrastructure.
import { createLens } from './journey/lens.js';
// The baked-geometry fetch starts the moment this import evaluates — early in
// the intro, so it has ~7s of runway before the chapter builds could want it.
// Awaited (bounded) in loadJourney below.
import { ready as bakedGeomReady } from './journey/lib/baked.js';
// Fetch/parse the full journey graph during the quiet preparation frame. The
// previous late import began only after the 7.6s hero timer and moved a whole
// module waterfall into the settled scene.
const journeyModuleP = import('./journey/journey.js');

// --- failure story ---
// Three ways this page used to die mid-boot — WebGL missing, the journey
// import failing, or the GPU context being lost on a mobile tab — each left
// a dead or inert page with only a console.error: body is overflow:hidden
// so there is no scroll, and the static tier's only link is built by the
// journey rail at boot. showSceneNote() is the visitor-facing fallback: one
// fixed note built lazily, so the happy path never touches it.
let _sceneNote = null;
function showSceneNote(html) {
  if (!_sceneNote) {
    _sceneNote = document.createElement('div');
    _sceneNote.setAttribute('role', 'status');
    _sceneNote.setAttribute('aria-live', 'polite');
    const s = _sceneNote.style;
    s.position = 'fixed';
    s.left = '50%';
    s.bottom = '1.5rem';
    s.transform = 'translateX(-50%)';
    s.maxWidth = '44ch';
    s.padding = '0.75rem 1.15rem';
    s.background = 'rgba(12, 9, 4, 0.86)';
    s.color = 'var(--parchment, #f2ebdd)';
    s.fontSize = '0.85rem';
    s.lineHeight = '1.5';
    s.borderRadius = '10px';
    s.zIndex = '10';
    s.textAlign = 'center';
    document.body.appendChild(_sceneNote);
  }
  _sceneNote.style.display = '';
  _sceneNote.innerHTML = html;
  return _sceneNote;
}
function hideSceneNote() {
  if (_sceneNote) _sceneNote.style.display = 'none';
}

// QA reads __pageErrors; the visitor-facing story is the specific handlers above.
const _seenErrors = new Set();

// ?debug=1 field overlay: venue staff load /?debug=1 and read failures on
// screen (registered in flags.js like every other flag).
function renderErrorOverlay() {
  if (!DEBUG_OVERLAY) return;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  showSceneNote([..._seenErrors].map(esc).join('<br>'));
}

addEventListener('error', (e) => {
  window.__pageErrors = (window.__pageErrors || 0) + 1;
  const msg = String((e && e.message) || 'window error');
  if (!_seenErrors.has(msg)) { _seenErrors.add(msg); console.error(msg); }
  renderErrorOverlay();
});
addEventListener('unhandledrejection', (e) => {
  window.__pageErrors = (window.__pageErrors || 0) + 1;
  const r = e && e.reason;
  const msg = String((r && r.message) || r || 'unhandled rejection');
  if (!_seenErrors.has(msg)) { _seenErrors.add(msg); console.error(msg); }
  renderErrorOverlay();
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

// --- responsive camera compositions, keyed by mode ---
const VIEWS = {
  // Composition restage (2026-08-19): pan the organism + its projected
  // annotations left by roughly 5-8vw, while the DOM hero copy stays put.
  // Lowering camera and target together preserves the viewing angle/scale
  // and lifts the specimen slightly in frame. Anchors remain anatomy-owned.
  desktop: { panX: -1.65, camY: 2.07, camZ: 10.4, targetY: 2.42, fov: 38 },
  compact: { panX: -1.82, camY: 2.12, camZ: 11.2, targetY: 2.52, fov: 38 },  // short landscape (phones)
  deskNarrow: { panX: -1.27, camY: 2.12, camZ: 11.6, targetY: 2.47, fov: 38 }, // landscape aspect < 1.55 (iPads)
  // Prior optical centring pass (ending at panX +0.45): the earlier
  // +0.33 landed the ensemble's geometric bounds on centre, but the bright
  // spore plume and the label column both weight the right side. Another
  // ~11px of leftward screen travel centres the visible energy of the set,
  // not merely its outer box. (2026-08-17, Hannah: "the way on mobile we hide the
  // main button and centre align the mushroom with the labels — do the same
  // on tablet"). Same pass as mobile's below: the CTA is gone (hero.css ≤900
  // portrait block), the labels ride runs (RAIL.tablet), and the pan walks
  // the specimen left until the ENSEMBLE reads centred — measured
  // at 768x1024: cap left rim 142, INSPIRE tag right 640, midpoint 391 at
  // panX 0.25; ~91.5 px/unit at this framing puts the optical centre at 0.45.
  tablet:  { panX: 1.00, camY: 2.72, camZ: 12.0, targetY: 3.82, fov: 50 },
  // Prior optical centring pass (ending at panX +0.40): the previous
  // comment described a +0.55 centring target, but the value below had only
  // moved to +0.20. Closing part of that gap shifts the unified composition
  // left by roughly the same visible amount as tablet, without making the
  // cap feel left-biased on narrow phones. (2026-08-17, Hannah: the specimen read centred but
  // specimen+labels together sat right-heavy — "they should be centred
  // together"). The pan walks the mushroom left so the ENSEMBLE's bounding
  // box centres; the labels follow because mobile now carries runs (RAIL).
  mobile:  { panX: 0.83, camY: 2.95, camZ: 11.5, targetY: 4.50, fov: 64 },
};

// --- per-mode world anchors for the HUD callouts (tuned against screenshots) ---
const ANCHORS = {
  desktop: {
    // inspire raised back up the plume's sweep (2026-08-16, Hannah: the
    // leader should point "higher into the spores, like similar angle to
    // the connect one"): from here the dot sits up-RIGHT of the label's
    // top centre by roughly its drop distance, so the leader reads as one
    // 45° diagonal — CONNECT's angle, mirrored top-down.
    inspire: [3.63, 3.97, -0.50],
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  compact: {
    inspire: [2.37, 3.20, -1.09], // measured in-plume, clear of the nav
    equip:   [0.05, 0.50, 0.25],
    connect: [0.50, 0.04, 1.60],
  },
  deskNarrow: {
    inspire: [3.50, 3.90, -0.47], // up the plume sweep, same reasoning as desktop
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  tablet: {
    inspire: [2.52, 3.50, -0.17], // measured in-plume (tablet portrait)
    equip:   [0.06, 1.30, 0.22],
    connect: [0.30, 0.04, 1.30],
  },
  mobile: {
    // raised off the rim exit into the plume's MIDDLE (2026-08-17, Hannah:
    // the tag "should be pointing into the middle of the spores and have a
    // nice angle to it") — the label holds its slot under the side rail
    // (tuckSep in RAIL below), so the anchor alone sets the leader's angle;
    // this projection aims for ~45° at 375x812.
    inspire: [3.20, 4.45, -1.60],
    // equip 1.55 -> 1.25 (2026-08-17, Hannah: "push all the labels down a
    // little bit"): EQUIP's label sits ON its stem row (riseEquip 0), so the
    // whole balanced column is slid by sliding this anchor down the stem —
    // INSPIRE hangs tuckSep above it and CONNECT's rise (RAIL below) came
    // down in step, so the 74px beat survives the shift.
    equip:   [0.06, 1.25, 0.22],
    connect: [-0.12, 0.04, 1.15],
  },
};

// --- breakpoint detection: portrait phones/tablets get their own compositions ---
function getMode() {
  const w = innerWidth, h = innerHeight;
  const portrait = h > w;
  if (w <= 620 && portrait) return 'mobile';
  if (w <= 900 && portrait) return 'tablet';
  if (!portrait && h <= 560) return 'compact';
  if (!portrait && w / h < 1.55) return 'deskNarrow';
  return 'desktop';
}

// deskNarrow spans aspects 1.25–1.55: interpolate the framing with aspect so
// the right-side callouts keep edge clearance all the way down to 4:3 iPads
function viewFor(mode) {
  const v = { ...VIEWS[mode] };
  if (mode === 'deskNarrow') {
    const t = Math.min(1, Math.max(0, (1.55 - innerWidth / innerHeight) / 0.3));
    v.panX = -1.27 + 0.3 * t;
    v.camZ = 11.6 + 0.9 * t;
  }
  if (mode === 'mobile') {
    const t = Math.min(1, Math.max(0, (innerWidth / innerHeight - 0.44) / 0.16));
    // base 4.75 -> 4.50 (2026-08-17, Hannah's vertical rebalance: "too much
    // deadspace between the mushroom and text") — LOWERING the look-at
    // lifts the specimen on screen (measured ~55px per unit, and the sign
    // is the trap: a higher target renders the scene lower). ~25px of lift
    // meets the copy's ~16px drop (hero.css mobile padding-top), splitting
    // the frame's air roughly evenly above and below the text block.
    v.targetY = 3.85 + 1.2 * t;
    v.camZ = 11.5 + 1.3 * t;
  }
  return v;
}

let currentMode = getMode();

// live tracker state the scene projects to screen space every frame
const TRACKS = {
  connect: { pos: ANCHORS[currentMode].connect.slice(), el: document.getElementById('co-connect') },
  inspire: { pos: ANCHORS[currentMode].inspire.slice(), el: document.getElementById('co-inspire') },
  // STABLE CALLOUTS (Hannah, 2026-08-05): all three are static world anchors.
  //
  // equip used to carry `sway: true`, which pinned it to swayGroup.matrixWorld
  // so it rode the breeze with the stalk — measured at 7.4-12.6 px of
  // horizontal travel, and the one callout that visibly moved. Hannah asked for
  // all three to hold still, so the flag is gone and this is now the anchor's
  // REST position, which (swayGroup being rotation-only, at the origin) is also
  // its sway pivot. The leader still lands on the stalk at every phase of the
  // breeze — the stalk's own excursion at this height is ~0.054 world units,
  // far narrower than the stalk. Full reasoning, measurements and the rejected
  // alternatives are in organism/furniture.js registerTrackers.
  equip:   { pos: ANCHORS[currentMode].equip.slice(),   el: document.getElementById('co-equip') },
};

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
    ...viewFor(currentMode),
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
  showSceneNote(`This page's live scene could not start on this browser. <a href="./static/" style="color: inherit; text-decoration: underline;">The static journey</a> carries every chapter and link.`);
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
      showSceneNote(`The scene's graphics context was lost. <a href="./static/" style="color: inherit; text-decoration: underline;">The static journey</a> carries every chapter — or reload to restart the scene.`);
    }, 2500);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    clearTimeout(restoreTimer);
    hideSceneNote();
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

document.body.classList.add('mode-' + currentMode);

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
  const rises = RAIL[currentMode];
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

  // --- mode switching: re-frame the camera and re-anchor the trackers on breakpoint change ---
  function applyMode(mode) {
    sceneApi.setView(viewFor(mode), 0.6); // ease the camera between breakpoints instead of snapping
    for (const key of ['inspire', 'equip', 'connect']) {
      const a = ANCHORS[mode][key];
      TRACKS[key].pos[0] = a[0];
      TRACKS[key].pos[1] = a[1];
      TRACKS[key].pos[2] = a[2];
    }
    document.body.classList.remove('mode-desktop', 'mode-tablet', 'mode-mobile', 'mode-compact', 'mode-deskNarrow');
    document.body.classList.add('mode-' + mode);
  }

  // rail layout: the hidden settled clone supplies final metrics before the
  // intro; the animator keeps projected geometry current every frame.
  railRefresh();
  sceneApi.addAnimator('rail', railApply);

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const mode = getMode();
      if ((mode === 'deskNarrow' || mode === 'mobile') && mode === currentMode) sceneApi.setView(viewFor(mode), 0.6);
      if (mode !== currentMode) {
        currentMode = mode;
        applyMode(mode);
      }
      // re-measure the rail metrics (nav inset, tag widths, .co scale
      // may all have changed with the breakpoint); the animator follows
      // the easing camera on its own
      railRefresh();
    }, 150);
  });
}

// A hero callout pressed before the journey module has booted. The browser
// used to record this intent for us — the tag was a plain `#/<chapter>` link,
// so a click wrote the hash and boot read it back as a deep link. Nothing
// writes the URL any more (Hannah, 2026-08-11), so the intent is held here and
// handed to boot() instead. See journey/journey.js's `entry`.
let pendingEntry = null;
let requestEarlyEntry = null;

// The left CTA remains live while the right side is the empty WebGL frame.
// Capture it before journey.js's later bubble listener so an early click is a
// queued normal jump, never a temporary #/inspire URL write or a lost press.
const exploreCta = document.querySelector('.ui .cta');
if (exploreCta) {
  exploreCta.addEventListener('click', (e) => {
    if (window.journey) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    pendingEntry = 'inspire';
    if (requestEarlyEntry) requestEarlyEntry();
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
    else pendingEntry = 'mission';
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
        else {
          pendingEntry = chapter;
          if (requestEarlyEntry) requestEarlyEntry();
        }
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
   ============================================================ */

// Input policy: the journey owns scroll and pointer gestures, so user
// orbit/zoom/pan are disabled at the source (organism/organism.js
// setInputPolicy — the DOM event shield this replaces is gone). Taps still
// reach the organism's own tap handler; DOM links/nav are untouched.
// ?free=1 keeps the hero's fully interactive camera (and the grab cursor,
// via body.free-cam in journey/site.css).
if (sceneApi) {
  const freeCam = FREE_CAM;
  if (freeCam) document.body.classList.add('free-cam');
  else sceneApi.setInputPolicy('journey');

  const HERO_INTRO_MS = 7600; // scene 5.4s + the three callouts settling
  // (skipIntro is computed in the scene-init section above and already
  // includes ?nointro, ?capture and reduced motion.)
  const frozen = introAt !== null;

  let journeyInputRequested = false;
  let journeyLoadP = null;
  let readyState = null;
  let journeyActive = false;
  let introReleased = false;
  let fastHandoffStarted = false;
  let activationTimer = null;
  let bootInput = null;
  let pendingTouch = null;
  let introCaptureLive = false;
  let onIntroInput = null;
  const INTRO_INPUT_EVENTS = ['wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'keydown'];

  function stopIntroInputCapture() {
    if (!introCaptureLive) return;
    introCaptureLive = false;
    for (const type of INTRO_INPUT_EVENTS) removeEventListener(type, onIntroInput, true);
  }

  function touchById(list, id) {
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === id) return list[i];
    }
    return null;
  }

  /* Buffer input independently from module loading. The journey listeners do
     not exist while an early gesture is asking the intro to finish, so boot
     consumes this one observed physical input only after scroll.attach(). */
  function collectBootInput(e) {
    // Event timestamps stay on the browser's physical input clock. The intro
    // deliberately skews performance.now() while fast-forwarding, so using it
    // after the first move would falsely add several seconds to the finger's
    // duration and erase the real swipe rate.
    const now = Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now();
    if (e.type === 'touchstart') {
      if (!bootInput && e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        pendingTouch = { identifier: touch.identifier,
          startY: touch.clientY, latestY: touch.clientY,
          startedAt: now, latestAt: now, active: true };
      }
      return false;
    }
    if (e.type === 'touchmove') {
      if (!pendingTouch || !e.touches || e.touches.length !== 1) return false;
      const touch = touchById(e.touches, pendingTouch.identifier);
      if (!touch) return false;
      pendingTouch.latestY = touch.clientY;
      pendingTouch.latestAt = now;
      if (!bootInput) {
        bootInput = { kind: 'touch', contact: pendingTouch };
        return true;
      }
      return false;
    }
    if (e.type === 'touchend' || e.type === 'touchcancel') {
      if (pendingTouch) {
        const touch = touchById(e.changedTouches, pendingTouch.identifier);
        if (touch) pendingTouch.latestY = touch.clientY;
        pendingTouch.latestAt = now;
        pendingTouch.active = false;
      }
      return false;
    }
    if (e.type === 'wheel') {
      if (bootInput && bootInput.kind === 'wheel') {
        bootInput.samples.push({ deltaY: e.deltaY, deltaMode: e.deltaMode });
        return false;
      }
      if (!bootInput) {
        bootInput = { kind: 'wheel', samples: [{ deltaY: e.deltaY, deltaMode: e.deltaMode }] };
        return true;
      }
      return false;
    }
    if (e.type === 'keydown' && !bootInput) {
      bootInput = { kind: 'key', key: e.key };
      return true;
    }
    return false;
  }

  function clearIntroDeparture(restore = false) {
    if (!document.body.classList.contains('intro-depart')) return;
    if (restore) {
      document.body.classList.add('intro-restore');
      setTimeout(() => {
        document.body.classList.remove('intro-depart', 'intro-restore');
      }, 220);
    } else {
      document.body.classList.remove('intro-depart', 'intro-restore');
    }
  }

  function replayBootInput(state) {
    const input = bootInput;
    bootInput = null;
    pendingTouch = null;
    const scroll = state && state.scroll;
    if (!input || !scroll) {
      clearIntroDeparture(true);
      return;
    }
    if (input.kind === 'wheel' && scroll.primeBootWheel) {
      if (scroll.primeBootWheelStream) scroll.primeBootWheelStream(input.samples);
      else {
        const first = input.samples[0];
        scroll.primeBootWheel(first.deltaY, first.deltaMode);
      }
    } else if (input.kind === 'touch' && scroll.primeBootTouch) {
      scroll.primeBootTouch(input.contact);
    } else if (input.kind === 'key' && state.flyTo) {
      state.flyTo('inspire');
      clearIntroDeparture(false);
      return;
    }
    // Hold the immediate visual acknowledgement only until the journey's own
    // Mission-copy envelope has genuinely taken over. A jitter that never
    // earns travel restores the hero instead of leaving it blank.
    if (document.body.classList.contains('intro-depart')) {
      const started = Date.now();
      const handoff = () => {
        const hero = document.querySelector('.ui .hero');
        const journeyOpacity = hero ? parseFloat(hero.style.opacity) : NaN;
        const journeyOwnsExit = scroll.progress > 0
          && Number.isFinite(journeyOpacity) && journeyOpacity <= 0.02;
        const stayedHome = Date.now() - started > 900
          && scroll.progress < 0.002 && !scroll.resolving;
        if (journeyOwnsExit || stayedHome) {
          clearIntroDeparture(stayedHome);
          return;
        }
        requestAnimationFrame(handoff);
      };
      requestAnimationFrame(handoff);
    }
  }

  function releaseIntro() {
    if (introReleased) return;
    introReleased = true;
    document.body.classList.remove('scene-preparing');
    document.body.classList.add('scene-intro-live');
    sceneApi.intro.start();
    performance.mark('hero-intro-start');
  }

  function activateJourney() {
    if (journeyActive || !readyState) return;
    journeyActive = true;
    clearTimeout(activationTimer);
    const entry = pendingEntry;
    pendingEntry = null;
    readyState.activate({ entry });
    stopIntroInputCapture();
    performance.mark('journey-interactive');
    if (entry && entry !== 'mission') {
      bootInput = null;
      pendingTouch = null;
      clearIntroDeparture(false);
    } else {
      replayBootInput(readyState);
    }
  }

  function beginFastHandoff() {
    journeyInputRequested = true;
    if (!readyState || fastHandoffStarted) return;
    fastHandoffStarted = true;
    clearTimeout(activationTimer);
    const departMs = window.innerWidth <= 620 ? 220 : 480;
    document.body.classList.add('intro-fast');
    releaseIntro();
    const accelerated = sceneApi.intro.accelerate({
      totalMs: HERO_INTRO_MS + 900,
      rampMs: departMs,
    });
    document.body.classList.add('intro-depart');
    setTimeout(activateJourney, accelerated ? departMs : 80);
  }
  requestEarlyEntry = beginFastHandoff;

  function loadJourney() {
    if (journeyLoadP) return journeyLoadP;
    journeyLoadP = (async () => {
      try {
        performance.mark('journey-prepare-start');
        // Give the DOM copy one paint, then construct one chapter per task.
        // The scene is blank, but the button remains responsive between slices.
        const nextTask = () => new Promise(resolve =>
          requestAnimationFrame(() => setTimeout(resolve, 0)));
        await nextTask();
        const [m] = await Promise.all([journeyModuleP, bakedGeomReady]);
        let remaining = m.prepareChapter ? m.prepareChapter(sceneApi) : 0;
        while (remaining > 0) {
          await nextTask();
          remaining = m.prepareChapter ? m.prepareChapter(sceneApi) : 0;
        }
        await nextTask();
        const state = m.boot({ heroIntroSkipped: !!skipIntro,
          heroFrozen: frozen, deferActivation: true,
          onEntry: (chapter) => {
            pendingEntry = chapter;
            beginFastHandoff();
          } });
        if (!state) throw new Error('Journey boot returned no state');
        await state.ready;
        readyState = state;

        if (skipIntro || frozen) {
          document.body.classList.remove('scene-preparing');
          document.body.classList.add('scene-static');
          sceneApi.intro.finish();
          activateJourney();
        } else if (journeyInputRequested || pendingEntry) {
          beginFastHandoff();
        } else {
          releaseIntro();
          activationTimer = setTimeout(activateJourney, HERO_INTRO_MS);
        }
        return state;
      } catch (err) {
        stopIntroInputCapture();
        clearIntroDeparture(true);
        document.body.classList.remove('scene-preparing');
        document.body.classList.add('scene-intro-live');
        sceneApi.intro.start();
        performance.mark('journey-fallback');
        console.error('[journey-v6] failed to load', err);
        // the hero scene is still live but was left holding the journey's
        // input policy (set above) — hand the orbit camera back and point the
        // visitor at the static tier.
        if (sceneApi) sceneApi.setInputPolicy('free');
        showSceneNote(`The interactive journey could not load. The hero scene above is still live, and <a href="./static/" style="color: inherit; text-decoration: underline;">the static journey</a> carries every chapter.`);
        return null;
      }
    })();
    return journeyLoadP;
  }

  onIntroInput = (e) => {
    if (e.type === 'keydown') {
      if (!['ArrowDown', 'PageDown', ' '].includes(e.key)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    }
    if (collectBootInput(e)) beginFastHandoff();
  };
  introCaptureLive = true;
  for (const type of INTRO_INPUT_EVENTS) {
    addEventListener(type, onIntroInput, { capture: true, passive: true });
  }

  // Preparation begins now, not after the old 7.6s timer. Its first heavy
  // slice is still held until the left-hand DOM has painted once.
  loadJourney();
}
