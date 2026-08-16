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
// The journey fetch warms during the intro; boot still waits for its cue
// (loadJourney() below consumes this promise at HERO_INTRO_MS).
const journeyModuleP = import('./journey/journey.js');
journeyModuleP.catch(() => {}); // absorb a pre-boot rejection -> no unhandledrejection during the intro

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
  desktop: { panX: -2.4, camY: 2.25, camZ: 10.4, targetY: 2.6,  fov: 38 },
  compact: { panX: -2.9, camY: 2.3,  camZ: 11.2, targetY: 2.7,  fov: 38 },  // short landscape (phones)
  deskNarrow: { panX: -2.0, camY: 2.3, camZ: 11.6, targetY: 2.65, fov: 38 }, // landscape aspect < 1.55 (iPads)
  tablet:  { panX: -0.7,  camY: 2.9, camZ: 12.0, targetY: 4.0,  fov: 50 },
  mobile:  { panX: -0.15, camY: 3.2, camZ: 11.5, targetY: 4.75, fov: 64 },
};

// --- per-mode world anchors for the HUD callouts (tuned against screenshots) ---
const ANCHORS = {
  desktop: {
    inspire: [3.24, 3.97, -0.50], // measured centre of the visible spore plume
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  compact: {
    inspire: [2.37, 3.20, -1.09], // measured in-plume, clear of the nav
    equip:   [0.05, 0.50, 0.25],
    connect: [0.50, 0.04, 1.60],
  },
  deskNarrow: {
    inspire: [3.10, 3.85, -0.45],
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  tablet: {
    inspire: [2.52, 3.50, -0.17], // measured in-plume (tablet portrait)
    equip:   [0.06, 1.30, 0.22],
    connect: [0.30, 0.04, 1.30],
  },
  mobile: {
    inspire: [2.52, 3.48, -1.59], // measured in-plume (phone portrait)
    equip:   [0.06, 1.55, 0.22],
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
    v.panX = -2.0 + 0.3 * t;
    v.camZ = 11.6 + 0.9 * t;
  }
  if (mode === 'mobile') {
    const t = Math.min(1, Math.max(0, (innerWidth / innerHeight - 0.44) / 0.16));
    v.targetY = 4.75 + 1.2 * t;
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
  });
} catch (err) {
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

document.body.classList.add('mode-' + currentMode);

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
    }, 150);
  });
}

// A hero callout pressed before the journey module has booted. The browser
// used to record this intent for us — the tag was a plain `#/<chapter>` link,
// so a click wrote the hash and boot read it back as a deep link. Nothing
// writes the URL any more (Hannah, 2026-08-11), so the intent is held here and
// handed to boot() instead. See journey/journey.js's `entry`.
let pendingEntry = null;

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
    if (!isTouch && (id === 'co-inspire' || id === 'co-connect')) {
      const chapter = id.slice(3);
      el.querySelector('.tag').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.journey) window.journey.flyTo(chapter);
        else pendingEntry = chapter;
      });
    }

    if (isTouch) {
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
   JOURNEY BOOTSTRAP — additive, and deliberately inert at p = 0.
   Boots ./journey/journey.js only AFTER the hero entry
   choreography has finished (scene grow-in 5.4s, callouts boot
   through ~7.55s — see the ENTRY comment in hero.css), so the
   journey can never compete with the intro for frame time. The
   fetch itself is hoisted to module scope (journeyModuleP) so it
   warms during the intro.
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

  function loadJourney() {
    journeyModuleP
      .then(m => m.boot({ heroIntroSkipped: !!skipIntro, heroFrozen: frozen, entry: pendingEntry }))
      .catch(err => {
        console.error('[journey-v6] failed to load', err);
        // the hero scene is still live but was left holding the journey's
        // input policy (set above) — hand the orbit camera back and point the
        // visitor at the static tier.
        if (sceneApi) sceneApi.setInputPolicy('free');
        showSceneNote(`The interactive journey could not load. The hero scene above is still live, and <a href="./static/" style="color: inherit; text-decoration: underline;">the static journey</a> carries every chapter.`);
      });
  }

  const delay = skipIntro || frozen ? 0 : HERO_INTRO_MS;
  const bootTimer = setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(loadJourney, { timeout: 1200 });
    else loadJourney();
  }, delay);

  /* ============================================================
     INTRO FAST-FORWARD (ride-through #4, Hannah): scrolling during
     the entry choreography must never be a locked door. The
     clock-skew that fast-forwards the scene's grow-in through its
     own real math is the intro's own API now — organism/intro.js
     accelerate() (M5 shell move). This block only wires the
     trigger events, compresses the page's CSS half (body.intro-fast
     in hero.css keeps a quick 1-2-3 callout sequence), and boots
     journey.js immediately so the scroll takes over the moment the
     ramp ends.
     ============================================================ */
  if (!skipIntro && !frozen) {
    let armed = true;
    const fastForward = () => {
      if (!armed) return;
      armed = false;
      for (const t of ['wheel', 'touchmove', 'keydown']) removeEventListener(t, onInput, true);
      // false = nothing to accelerate (< 200 ms left: intro basically done
      // anyway) — then the CSS half must not compress and the normal boot
      // timer stands, exactly as shipped.
      if (!sceneApi.intro.accelerate({ totalMs: HERO_INTRO_MS + 900 })) return;
      document.body.classList.add('intro-fast');
      clearTimeout(bootTimer);
      loadJourney();                                   // scroll model takes over now
    };
    const onInput = (e) => {
      if (e.type === 'keydown' && !['ArrowDown', 'PageDown', ' '].includes(e.key)) return;
      fastForward();
    };
    for (const t of ['wheel', 'touchmove', 'keydown']) addEventListener(t, onInput, { capture: true, passive: true });
    setTimeout(() => { armed = false; for (const t of ['wheel', 'touchmove', 'keydown']) removeEventListener(t, onInput, true); }, HERO_INTRO_MS);
  }
}
