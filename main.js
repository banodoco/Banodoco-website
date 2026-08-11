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
import { CAPTURE, NOINTRO, INTROAT, HL, LIT, BODY_SERIF, FREE_CAM } from './flags.js';

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
// scene's 3.4s grow-in; honor reduced-motion, and let ?nointro=1 skip the
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
if (introAt !== null) {
  addEventListener('load', () => {
    const ms = Math.min(1, Math.max(0, parseFloat(introAt) || 0)) * 5400;
    for (const a of document.getAnimations()) { a.currentTime = ms; a.pause(); }
  });
}

const sceneApi = createScene({
  ...viewFor(currentMode),
  container: document.getElementById('stage'),
  tiltX: -0.14,
  bg: 0x1c160b,
  quiet: { x: -5.2, z: 4.2, rx: 4.8, rz: 3.4, strength: 0.7 },
  trackers: [TRACKS.connect, TRACKS.inspire, TRACKS.equip],
  intro: skipIntro ? 0 : 5.4,
});

document.body.classList.add('mode-' + currentMode);

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

// A hero callout pressed before the journey module has booted. The browser
// used to record this intent for us — the tag was a plain `#/<chapter>` link,
// so a click wrote the hash and boot read it back as a deep link. Nothing
// writes the URL any more (Hannah, 2026-08-11), so the intent is held here and
// handed to boot() instead. See journey/journey.js's `entry`.
let pendingEntry = null;

// hovering a callout gently lights its region of the specimen
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
   Loads ./journey/journey.js only AFTER the hero entry
   choreography has finished (scene grow-in 5.4s, callouts boot
   through ~7.55s — see the ENTRY comment in hero.css), so the
   journey can never compete with the intro for frame time.
   ============================================================ */

// Input policy: the journey owns scroll and pointer gestures, so user
// orbit/zoom/pan are disabled at the source (organism/organism.js
// setInputPolicy — the DOM event shield this replaces is gone). Taps still
// reach the organism's own tap handler; DOM links/nav are untouched.
// ?free=1 keeps the hero's fully interactive camera (and the grab cursor,
// via body.free-cam in journey/site.css).
const freeCam = FREE_CAM;
if (freeCam) document.body.classList.add('free-cam');
else sceneApi.setInputPolicy('journey');

const HERO_INTRO_MS = 7600; // scene 5.4s + the three callouts settling
// (skipIntro is computed in the scene-init section above and already
// includes ?nointro, ?capture and reduced motion.)
const frozen = introAt !== null;

function loadJourney() {
  import('./journey/journey.js')
    .then(m => m.boot({ heroIntroSkipped: !!skipIntro, heroFrozen: frozen, entry: pendingEntry }))
    .catch(err => console.error('[journey-v6] failed to load', err));
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
