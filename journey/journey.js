// journey-v6 entry point — W3-A GREY-BOX PROTOTYPE.
//
// Boots after the hero's entry choreography (see the bootstrap in index.html)
// and turns the settled hero into the full five-chapter journey: ONE camera,
// ONE organism, ONE continuous reversible path (adr-d3-world-layout.md).
//
// Ownership rule that keeps the hero safe: the director does not touch the
// camera until progress leaves zero. At p = 0 the page IS the hero - same
// pose, same fog, same OrbitControls state, same DOM. The journey nav, copy
// blocks and hotspots are all at opacity 0 there.
//
//   scroll model      scroll.js    virtual, per-chapter allocations
//   progress + routes state.js
//   camera path       director.js  Spike A orbit + keyed path
//   streaming seams   seams.js     T1..T4, hysteresis + dwell
//   optics            lens.js      unified grade, full journey (W5)
//   DOM               ui.js        nav, copy, cards, hotspot proxies
//   geometry          chapters/*.js

import * as THREE from 'three';
import { createJourneyState } from './state.js';
import { createScrollModel } from './scroll.js';
import { createDirector, poseAt } from './director.js';
import { createSeams } from './seams.js';
import { createLens } from './lens.js';
import { createUI } from './ui.js';
import { createRail } from './rail.js';
import {
  CHAPTERS, CHAPTER_IDS, chapterAt, restProgress, startOf, HERO_REST_P,
} from './route.js';
import { HERO_INTRO_MS, DEEP_LINK_DETAIL_DELAY_MS } from './constants.js';
import { STEADY, P as P_FLAG, POSE as POSE_FLAG, CAPTURE, ASPECT } from '../flags.js';
import { startChapterEntry, snapChapterPlacements } from './chapter-entry.js';
import { registerChapterInteractions } from './chapter-interactions.js';
import { RUNTIME_CHAPTER_IDS } from './structure.js';
import { createChapterRegistry } from './chapter-registry.js';
import { createFailureGuard } from './failure-guard.js';
import { arcLength, azTurn } from './camera-path.js';
import { controlWrapDirection, normaliseNode } from './navigation.js';
import { navigationDurationSeconds } from './navigation-timing.js';
import { applyChapterFrame } from './frame-application.js';
import { inputPortOf } from './claim.js';
import { createTransitionController } from './transition/controller.js';
import { createFramePublisher } from './frame/publication.js';

const journeyRegistry = createChapterRegistry();
export function prepareChapter(sceneApi) { return journeyRegistry.prepare(sceneApi); }
/* J04e / A02's D-A02-4. The page builds the rail with its OWN intro-handoff
   callback and hands it to boot(); `journey/ui.js` then re-points the rail's
   `navigate` at the journey and nothing ever puts it back, so after a journey
   disposal a page-owned rail would still be calling into a disposed journey.
   `journey/rail.js` has a setter and no getter, so the callback the page
   supplied is recorded HERE, at the one site that knows it, and boot()
   registers the restore. Keyed on the rail object and weak, so a rail the
   page drops is not retained by this map. */
const railPageNav = new WeakMap();
export function prepareRail(onNav) {
  const rail = createRail({ onNav });
  railPageNav.set(rail, onNav);
  return rail;
}
const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* TWO DISTANCES FROM THE HERO'S POSE, AND THEY ARE NOT THE SAME QUANTITY.
 *
 * Both used to be absolute p-literals — `p > 0.0008` down in applyFrame, and
 * `p - 0.006` in heroPresence — which made them look like two spellings of
 * one threshold sitting near each other. They are not. What they share is the
 * ANCHOR, and only the anchor is derived: HERO_REST_P is the frozen hero pose
 * the route declares (journey/route.js), so moving the hero's rest, or giving
 * it a chapter to sit behind, carries both of these with it. This is the same
 * shape journey/seams.js has used since M4 — `startOf('connect') + 0.06`, the
 * anchor from the route and the offset authored against the camera path.
 *
 * HERO_OWNED_P IS A BOUNDARY. It decides who drives the camera: below it the
 * scene is the hero's own frozen composition, above it the director owns it.
 * 0.0008 is a dead-zone hair, sibling to scroll.js's SNAP_DEAD_P — the wheel
 * delta that bought the stuck-hero defect crossed it twenty-eight times over.
 * It is read ONCE per frame and both of applyFrame's former comparisons now
 * read that one value; see the block there.
 *
 * HERO_PRESENCE_* ARE AN ENVELOPE. They are the hero furniture fading out as
 * the camera leaves, and they are composition, not a switch: the lead says
 * when the fade opens, the fade width says how it falls. The width is left
 * exactly as authored and deliberately NOT anchored on anything — it is a
 * distance, not a place, and the three flash bugs the furniture channel was
 * shaped against were fought at that curve. Only the START moves with the
 * hero.
 *
 * A NOTE ON SIDEDNESS, because the derivation makes the assumption visible
 * for the first time. Both are one-sided (`p >`, and a fade that only opens
 * upward), which is complete only while the hero's rest is the route's floor
 * — true today, since HERO_REST_P is 0. A hero placed mid-route would want
 * both to read the DISTANCE from the pose, in either direction. That is a
 * behaviour change, so it is not made here; it is written down here so the
 * next reader inherits the assumption instead of rediscovering it. */
const HERO_OWNERSHIP_EPS   = 0.0008;  // p — dead zone off the pose before the director takes over
const HERO_PRESENCE_LEAD   = 0.006;   // p — how far past the pose the furniture starts to go
const HERO_PRESENCE_FADE   = 0.05;    // p — and how far it takes to go completely (authored)
const HERO_OWNED_P         = HERO_REST_P + HERO_OWNERSHIP_EPS;
const HERO_PRESENCE_START  = HERO_REST_P + HERO_PRESENCE_LEAD;

/** The lens focal source for this frame — the ONE chapter whose leg the
 *  camera is on, asked for its own focal point (C05 slice D/E, design.md
 *  §5.3).
 *
 *  This replaced four legs written out by name, each naming a different
 *  member; they are quoted in full in
 *  docs/code-health/evidence/2026-08-21-elegance-run-01/e01/relocated/journey-journey.md
 *
 *  WHAT IS THE SAME, exactly. The handoff thresholds are ROUTE DATA and stay
 *  here: shortly (+0.02) after each chapter's range begins, `startOf(...)`
 *  (shipped values 0.40 / 0.62 / 0.87). RUNTIME_CHAPTER_IDS is
 *  ['inspire','connect','owned','final'] (structure.js), which is exactly the
 *  order the four branches ran in, and the loop `break`s on the first leg it
 *  does not skip — so at most one chapter is asked, as before. An unarmed
 *  chapter yields null on its own leg, as before.
 *
 *  WHAT MOVED INTO THE CHAPTERS: which point each one offers. Inspire's
 *  `activeWorld()`, connect's `nodeWorld('ados')` and final's `focusWorld()`
 *  are now `focus.world()` on each chapter's own descriptor, bound to the same
 *  hoisted bodies. Owned declares `focus: null` and is not asked at all — it
 *  has been returning null for the whole Owned leg since the ownership pods
 *  were retired ('pod-shared' is content-only and is not among portraits'
 *  node ids, so worldOf() never found it), so the lens keeps receiving
 *  setFocusHint(null) there. The dead string is gone; the behaviour is not.
 *
 *  MODULE SCOPE, AND A PURE FUNCTION OF ITS ARGUMENTS PLUS `startOf` AND
 *  `RUNTIME_CHAPTER_IDS`, deliberately. journey.js cannot be imported under
 *  plain node (`three` resolves through the page's import map), so
 *  tools/test-chapter-contract.mjs's I3(b) reconstitutes THIS body from these
 *  bytes and runs it. A reference copy of this loop used to live in that suite
 *  instead; it is deleted. Keep the free names to those two. */
function pickChapterFocus(chapters, frameP) {
  let focus = null;
  for (let i = 0; i < RUNTIME_CHAPTER_IDS.length; i++) {
    const id = RUNTIME_CHAPTER_IDS[i];
    const next = RUNTIME_CHAPTER_IDS[i + 1];
    if (next && frameP >= startOf(next) + 0.02) continue;
    const ch = chapters[id];
    if (ch.armed && ch.focus) focus = ch.focus.world();
    break;
  }
  return focus;
}

/* ================================================================
   The nav jump's interpolation frame (see directJumpTo)
   ================================================================
   The organism stands ON the world Y axis — measured from the live scene:
   the stipe occupies x = z = 0, y 0..3.9, radius <= 0.69 (anatomy.js
   stemRadius), and the cap sits at y 2.43..4.37 out to r ~ 2.6 (anatomy.js
   rimRad / capUnderPt). So "around the mushroom" is nothing more exotic than
   cylindrical coordinates about that axis, and a camera move authored in
   them is geometry-safe by construction rather than by correction. */
/** a -> b at ease e, interpolated AROUND the axis: azimuth the short way,
 *  horizontal radius and height lerped independently. Two properties fall
 *  straight out and are the whole reason for the form — the path's radius is
 *  never below min(|a|, |b|) horizontally, and its height never leaves
 *  [a.y, b.y]. A move between two poses that both clear the organism
 *  therefore clears it the entire way, with no corrective arc to add.
 *
 *  `az1` overrides the swept azimuth (the loop's wrap sweeps the long way
 *  round); `bow` and `rise` add a symmetric sin(PI e) swell to the radius and
 *  the height. Both swells are driven by the SAME ease the position is on, so
 *  their velocity is zero at both ends — the 2026-08-04 "weird little jump"
 *  was a lift running on linear f under a position running on smootherstep,
 *  and that shape is unreachable here. A positive `bow` only ever moves the
 *  path further from the axis, so the clearance guarantee above survives it. */
/** Length of that path — what a jump's duration is measured against. The
 *  swept arc is taken at the mean radius, which is exact for a pure orbit and
 *  within a few percent of the true spiral otherwise. */
/* The wrap path's three authored numbers (see directJumpTo's WAY HOME block).
   `let`, and reachable through window.journey.wrapTuning, only so the path can
   be swept and re-rendered without a reload — the shipped values are these. */
let WRAP_BOW = 3.2;      // world units of extra radius at mid-lap: r peaks
                         // 16.6 against 15.0 at the Final rest and 11.5 at the
                         // hero. 6.0 was tried and rejected — at r 19.3 the
                         // organism is a speck on an empty field and the move
                         // reads as backing away from the subject, not
                         // circling it.
let WRAP_RISE = 1.9;     // world units of extra height at mid-lap: y peaks 4.4,
                         // just over the cap top (4.37), so the lap gains
                         // elevation while the cap stays silhouetted against
                         // the dark. 3.6 was tried and rejected — at y 6.1 the
                         // horizon leaves frame and the shot becomes a plan
                         // view of the ground network.
let WRAP_EXTRA_S = 2.8;  // seconds added on top of the ordinary duration law,
                         // giving the wrap 4.00 s. NOT a licence to be slow —
                         // the arc is 68 units against 15.6 for the longest
                         // ordinary jump, so this runs it at 17 units/s against
                         // that jump's 13: the same tempo over a longer path.
                         // At the shipped cap it would have been 1.20 s, i.e.
                         // 57 units/s — 4x every other transition on the site.
let WRAP_TURN = 0;       // 0 = the authored sense (continue the ride's own
                         // rotation, closing to a full turn). +/-1 forces a
                         // rotational sense — how the shipped path was chosen
                         // against the short way, and how it can be re-judged.

/* ONE JOURNEY EVER. main.js boots once; a second boot returns the handle the
   first one published rather than building a second generation. */
let booted = false;

/* THE CHAPTERS BUILD ONE PER SLICE (2026-08-16 — Hannah: "still a little
   stagger once it's fully loaded"). boot() used to construct all four
   chapters in its own single task: measured as a 0.35 s frame freeze warm
   (1.6 s with cold GPU shader caches) landing ~10 s in, right as the settled
   hero was breathing — the visible stagger. prepareChapter() lets the loader
   spend geometry construction one chapter per painted slice on the unhurried
   path; an early input deliberately flushes it only after main.js has painted
   the short departure handoff. boot() picks up whatever was prebuilt.
   Ordering note: chapter constructors
   register animators, and the frame-order contract is spine first — the
   loader (main.js) parks a placeholder 'journey' animator before anything
   else registers, and boot's real registration replaces it IN PLACE
   (organism.js addAnimator's documented semantics), so prebuilt chapters
   still run after the spine. A caller that skips prepareChapter entirely
   (flush paths, direct boot) gets the old synchronous build inside boot(). */
export function boot(opts = {}) {
  if (booted) return window.journey;

  const sceneApi = window.sceneApi;
  /* THE LATCH IS TAKEN BEFORE THE sceneApi GUARD. A boot with no scene handle
     therefore still latches the module for good: it returns null, no handle
     escapes, and the next boot returns `window.journey` without logging a
     second time. That is today's behaviour on that path and it is preserved
     deliberately rather than tidied. */
  booted = true;

  if (!sceneApi) {
    console.error('[journey-v6] no hero scene handle — journey not started');
    return null;
  }
  const deferActivation = opts.deferActivation === true;
  let activated = false;


  /* ================================================================
     State, scroll, camera
     ================================================================ */
  const journey = createJourneyState({
    onNavigate: (r) => handleRoute(r),
  });

  /* ================================================================
     THE SPINE'S ANIMATOR IS REGISTERED FIRST, ON PURPOSE
     ================================================================
     Animators run in insertion order (organism.js keeps them in a Map), and
     every chapter registers one of its own the moment it is constructed —
     'journey-final', 'journey-connect', 'journey-owned', 'spike-plumes'.
     Registering the spine here, BEFORE createLens and before `chapters`,
     makes it the first thing to run each frame, which is what lets it be the
     only writer of the camera: by the time any chapter animator (or the
     lens's focus projection) reads `camera.position`, the pose it reads is
     the pose that frame will actually present.

     Before 2026-08-09 the spine went last. On the first frame of a nav jump
     that meant every chapter animator read the DESTINATION pose placeAt had
     just written, computed its reveal against it, and was then overwritten by
     the spine's camera blend — so the frame that rendered composited a
     fully-arrived chapter with a not-yet-arrived camera. See the frame-order
     block above applyFrame for the whole mechanism and the measurements.

     spineFrame is a hoisted function declaration; nothing in it runs until
     the first rAF, long after boot() has finished defining what it closes
     over. */
  /* REPLACES main.js's parked placeholder IN ITS ORIGINAL Map SLOT
     (organism/animation.js's documented semantics), which is what keeps the
     spine ahead of every chapter animator in frame order. */
  sceneApi.addAnimator('journey', (t, dt) => spineFrame(t, dt));

  // ?steady=1 kills the documentary handheld layer (QA: pose sampling at
  // arbitrary p must be reproducible frame-to-frame). (parsed once, in
  // ../flags.js — THE flag registry)
  const director = createDirector(sceneApi, { steady: STEADY });
  const lens = createLens(sceneApi);
  lens.update(0);   // the unified grade covers the full journey; amount stays 1

  // [g] — raw (post-bloom hero baseline) vs finished, everywhere. Same key
  // as the approved spike; the raw reference at p=0 IS the hero's own look.
  // Guarded like every raw-listener key seam (M5): a modified chord is a
  // browser shortcut (Cmd+G = find next), and a key typed into a text-entry
  // control is content — neither may toggle the grade.
  globalThis.addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    lens.setEnabled(!lens.enabled);
  });

  // One chapter per idle slice (prepareChapter below) when the loader had
  // time; anything not prebuilt lands here synchronously, so boot's contract
  // — chapters exist when it returns — is unchanged on every path.
  const chapters = journeyRegistry.build(sceneApi);

  const seams = createSeams({
    camera: sceneApi.camera,
    chapters,
    missionAz: director.heroPose.az,
  });

  let detailNode = null;      // currently open node id, or null
  let ui = null;

  function cueNavigation() {
    // The hint is an answer to a blocked gesture at REST. During a camera
    // flight the moving navigator already explains the active transport, and
    // a second wave laid over it reads as a competing navigation animation.
    if (transition.cameraStateDisagree) return false;
    const fired = !!(ui && ui.rail && ui.rail.cueNavigation
      && ui.rail.cueNavigation());
    if (fired && ui.announce) {
      ui.announce('Use the navigation buttons to move between sections.');
    }
    return fired;
  }

  // The scroll model reports nothing per-EVENT any more. It used to push the
  // raw surface position straight into journeyState on every wheel delta,
  // which only worked because state.js smoothed it afterwards; now that the
  // controller owns the displayed position, the per-frame read below is the
  // one and only path from scroll to state.
  const scroll = createScrollModel({
    // Production is click-only. The scroll model remains the deterministic
    // progress/placement engine used by direct chapter flights and QA, but
    // wheel, vertical touch and scroll keys stop at the transport boundary.
    onScrollAttempt: cueNavigation,
    // GB-3.6: an open detail consumes the first scroll intent; travel resumes
    // once the frame is clear.
    onIntent: () => {
      if (!detailNode) return true;
      closeDetail();
      return false;
    },
    /* THE LOOP CLOSES HERE. The model recognises "past the last rest" and
       "before the first" as wrapping and hands the direction over; the wrap
       itself is the ordinary nav jump, to the chapter on the other side of the
       seam, with its path authored (directJumpTo's WAY HOME block). Because it
       IS that jump, everything the jump already owns comes free: the state
       snaps to the destination this tick, so `chapterAt(p)` — and therefore the
       rail — moves once, directly, with no intermediate chapter to flicker
       through; the destination copy is keyed off the arrival (d1ecc23); the
       destination chapter is suppressed for the blend (a8d4518); and the URL is
       not written (239d6c7). */
    onWrap: (dir) => {
      /* A WRAP ASKED FOR AGAINST A WRAP STILL IN FLIGHT is the same ask the
         steering block answers (applyFrame): follow the scroll. It can only
         be the OPPOSING direction — the lap's own destination anchor is the
         only place the position gate passes while the lap flies — and it
         reaches here rather than the steering block only when a whole
         reversal STREAM lands inside one frame (a synthetic burst, or input
         faster than the steering's once-per-frame look), because the model's
         wrap fires from inside scroll.update(), one line before the steering
         runs. Navigating would be the harsh path with the stuck-hero bug on
         top: directJumpTo -> placeAt -> setOwned(true) captures `hero` from
         a camera the first lap still has mid-flight. Steering the live lap
         instead is exactly what the visitor meant, and the wrap block that
         called us raises the wall itself, so the gesture is retired the same
         way either branch. */
      const flying = transition.blend;
      if (flying && flying.wrapDir && dir === -flying.wrapDir) {
        transition.steerWrapBlend(dir);
        return;
      }
      navigateTo(dir > 0 ? 'mission' : 'final', dir);
    },
  });
  scroll.attach();
  scroll.enabled = false;

  /* ================================================================
     DOM
     ================================================================ */
  /** A prepared rail is live before the journey is activated. Keep its click
   *  on the page's intro-handoff path during that window: main.js owns the
   *  organism clock skew, buffered intent and activation boundary. Wiring the
   *  adopted rail straight to navigateTo() made its callback diverge from both
   *  wheel/touch and the hero CTA as soon as createUI called setOnNav(). */
  function handleNavIntent(id) {
    if (!activated && typeof opts.onEntry === 'function') {
      opts.onEntry(id);
      return;
    }
    navigateFromControl(id);
  }

  ui = createUI({
    rail: opts.rail || null,
    onNav: handleNavIntent,
    onOpen: (nodeId, trigger) => openDetail(nodeId, trigger),
    onClose: () => closeDetail(),
    isDetailOpen: () => !!detailNode,
    // The chips pin DOM to world points, so they measure through the scene's
    // jitter-free lens rather than the raw one the renderer is mid-way through
    // perturbing (organism.js, STEADY PROJECTION).
    project: sceneApi.steadyProject,
    /* C05 slice D. ui.js used to reach the chapter modules through
       `window.journey.chapters` — a global this file publishes inside
       activate(), i.e. AFTER registration, which is why the label-policy pass
       was written as a frame retry. The value has existed since
       the registry build() above; passing it is the whole of §6. ui.js reads only
       DECLARED CAPABILITIES off it (`selection`, `visibility`), never a
       chapter's own fields. The global stays published and still holds these
       same objects — tools/fieldpace.js and tools/revealgates.js read it. */
    chapters,
  });


  // hotspot proxies, one per named node (GB-4.1)
  // registration order = importance (ArtCompute -> Arca -> 2RP, per Plate II)
  // and still drives the tab order. WHEN each chip stands up moved to the
  // chapter's landing cascade (2026-08-16, the Connect precedent): nodeReveal
  // ties each label to its own lip ember, so the three arrive one at a time
  // in SCREEN order (Arca left, ArtCompute centre, 2RP right) as the embers
  // ignite — chapters/inspire/index.js 5c. The gate bound below is ui's eased
  // copy value, so ember + label land timed with the intro.
  const NODE_CHAPTER = registerChapterInteractions(ui, chapters);

  /* ================================================================
     THE HERO FURNITURE — ONE AUTHORITY
     ================================================================
     The world-tracked callouts and the hero scrim / spill are Mission-pose
     compositions, so they release as the journey leaves the hero and come
     back on the way in. Untouched at p = 0.

     ONE CONDITION DECIDES WHETHER THEY ARE THERE (2026-08-12, Hannah: "the
     hero labels currently flash into view immediately and then disappear,
     before later appearing again ... there should be a single authoritative
     condition controlling their visibility"). Before this there were three
     writers with two different clocks, and they disagreed for the whole
     length of a jump:

       1. THIS loop, keyed to `p` alone. `p` is journey STATE, and a nav jump
          snaps state to the destination in one dt = 0 tick (directJumpTo)
          while the camera takes 0.85-4.00 s to get there. So the furniture
          was written to full opacity on the CLICK frame. Measured through the
          logo from each rest, 1440x900: labels reached alpha 1 one frame
          after the click (t = 146-314 ms, the click itself landing at ~120)
          against camera landings at 1178, 1300, 1218 and 1538 ms — and at
          140 ms against 3938 on the scroll wrap, which is 3.8 s of hero
          furniture riding a camera that is somewhere else entirely.
          THIS is the writer that made them appear early.
       2. organism/furniture.js's tracker projection, keyed to the CAMERA:
          `visibility = z < 1`. Honest, and the only one of the three that
          was — but with (1) holding the container open it was doing its
          frustum cull IN FRONT OF THE VISITOR. From the Owned rest the
          INSPIRE anchor sits behind the camera plane, so the trace shows
          exactly the sentence Hannah wrote: visible at 155 ms, gone at 167 ms
          (one frame), back at 461 ms, camera still 700 ms away. THAT is the
          disappear-and-reappear. It is a cull, not a reveal, and it needs no
          change: hold the container shut for the flight and the whole flicker
          happens inside something nobody can see.
       3. ui.js's `calloutsEl.inert = !(p <= 0.01)`, keyed to `p` — the same
          fault in the a11y channel, handing three off-screen links to the tab
          order a second early. It has moved HERE, onto the same scalar, so
          the picture and the tab order can no longer be timed differently.

     The condition is therefore: PRESENCE x ARRIVAL.

       presence(p)  the shipped composition term, byte-for-byte. It owns the
                    scrub in both directions, so leaving the hero releases
                    exactly as before and scrolling back up returns exactly
                    as before — neither route has a camera that disagrees.
       arrival      the missing half. 0 while a jump is flying INTO the hero,
                    easing to 1 from the same lead and with the same C2 ease
                    as the destination copy (d1ecc23 / COPY_JUMP_LEAD). The
                    copy now gets a longer, scroll-paced finish of its own;
                    the furniture keeps its compact post-camera beat. Both
                    remain parts of the same arrival rather than click-time
                    effects. 1 at every other moment,
                    which is why a cold load, a deep link and every ?capture=
                    still are bit-identical to before: none of them has a
                    blend in flight, so this term is not in play.

     AND THE LOAD-TIME CSS ENTRANCE? It stays, and it stays subordinate. The
     1-2-3 instrument power-up in hero.css (`co-on` .. `no-flicker`, --d
     5.55/6.20/6.85 s) is the PAGE's entrance, not the SECTION's, and the two
     systems were never really in competition — they multiply. What made them
     read as independent is that this side had no notion of "the hero has been
     arrived at", so it asserted presence at moments the entrance had never
     sanctioned. Giving it that notion is the whole fix. Re-running the
     power-up on every logo click was considered and rejected: the hero COPY
     does not re-run its ink wipes on arrival either (ui.js builds no
     'mission' block by construction), the callouts are that copy's furniture,
     and a 1.5 s boot sequence every time the home control is pressed would
     make the mark feel heavy. One authority over whether they are there; the
     load choreography stays the load's. */
  const heroFurniture = ['.callouts', '.scrim', '.spill'].map(s => document.querySelector(s)).filter(Boolean);
  const calloutsEl = document.querySelector('.callouts');

  /* THE TWO TRAVEL TERMS ARE THE TRANSITION CONTROLLER'S (J01). The arrival
     gate and the departure fade are transition state — armed by a jump, run
     on the blend's own clock, reversed by a steered lap — so they live in
     journey/transition/controller.js with the rest of it, and the note that
     bought the departure term (the up-wrap scrim flash, 2026-08-16) moved
     with them. What stays here is the PAINTER: the elements, and its own
     memo of what it last put up. */
  let heroShown = 1;      // last painted value — the exit fades from what is actually up

  const heroPresence = (p) => 1 - smooth01((p - HERO_PRESENCE_START) / HERO_PRESENCE_FADE);

  /** The ONE place the hero furniture's visibility reaches the DOM. */
  function paintHeroFurniture(a) {
    heroShown = a;
    // A departing set leaves the hit tree on the CLICK frame, not at the 0.05
    // threshold — the fade is for the eye; a callout must not keep arming
    // region highlights while the lap lifts off through it.
    const inert = a < 0.05 || transition.heroExiting;
    for (const f of heroFurniture) {
      f.style.opacity = a;
      // Swarm census finding (2026-08-03): opacity-0 elements are still
      // hit-testable — a cursor parked over the faded 01-INSPIRE callout kept
      // driving sceneApi.setHighlight('spores') via the hero page's own hover
      // bindings, flaring the old curtain up to ~2x with a breathing pulse at
      // exactly the moment it should cede. Faded furniture must leave the hit
      // tree, not just the eye.
      f.style.pointerEvents = inert ? 'none' : '';
    }
    // ...and the tab order says the same thing, from the same number. It used
    // to be a second threshold on raw `p` over in ui.js, which is how three
    // invisible links stayed tabbable through a whole jump.
    if (calloutsEl) {
      const live = !inert;
      if (calloutsEl.inert === live) calloutsEl.inert = !live;
    }
  }

  // Error isolation for the spine's own subsystem calls (M5). The organism's
  // frame loop already isolates whole animators, but everything below runs
  // INSIDE the one 'journey' animator — an exception in a single chapter's
  // drive() would otherwise disable scroll, nav and copy along with it.
  // guarded() latches per name: first throw logs the error once and disables
  // that subsystem; every later call is skipped; the rest of the frame runs.
  // (Constructed here rather than beside applyFrame: the transition
  // controller below is its first consumer.)
  const guarded = createFailureGuard();

  /* ================================================================
     THE TRANSITION — ONE OWNER (J01)
     ================================================================
     Every piece of state a transition holds — the camera blend, the wrap's
     lap and its rail ticket, an ordinary click's rail flight, the
     navigation-only chapter entry clock, the state/camera disagreement flag,
     and the hero furniture's two travel terms — is inside this object. This
     file reads it and sequences it; it no longer keeps a copy.

     `input` is the model's DECISION PORT, not the model (boundaries.md §A.6
     E-A2). The controller is handed `inputPortOf(scroll)` — a two-member
     frozen surface — so there is no `scroll` identifier in its scope to
     reach `sinceInput`, `answeredAt`, `gesturePeak` or any other diagnostic
     getter through. The cancellation question it used to assemble out of two
     of those getters and a bare 50 is now one call to claimNow(), which
     answers with a discriminated `null | {dir}`.

     `placeAt` and `paintHero` are late-bound on purpose: both are this
     file's, and both are what the controller must call back into when a
     rewound lap lands or a jump arms the furniture. */
  const transition = createTransitionController({
    input: inputPortOf(scroll),
    sceneApi, director, lens, ui, chapters, guarded, chapterAt,
    placeAt: (p) => placeAt(p),
    paintHero: (a) => paintHeroFurniture(a),
    heroShownNow: () => heroShown,
    heroPresenceNow: () => heroPresence(journey.progress),
  });

  /* THE FRAME PUBLICATION (J02). One immutable value per frame, taken where
     the camera is finished, so that "the camera is complete before anything
     reads it" stops being a property of statement order alone and becomes a
     value a reader holds. See journey/frame/publication.js for what it
     carries and, more importantly, for what it must never carry.

     The capability is installed on the scene handle rather than exported,
     because that is how a chapter reaches it: chapters are built with
     sceneApi and nothing else. It is JOURNEY-SCOPED on purpose — the handle
     gains `frame` only when a journey boots, and the accessor answers null
     until the first publication, so a page-lifetime reader (the annotation
     rail, the organism's trackers, the lens's focus projection) can neither
     find it before the journey exists nor be quietly rewritten to depend on
     it. Those three run on pages that have no journey at all. */
  const framePublisher = createFramePublisher(sceneApi);
  /* A journey-scoped accessor written onto a page-lifetime handle. Installed
     exactly once — tools/test-frame-publication.mjs's `C4` is the pin. */
  sceneApi.frame = framePublisher.frame;


  // Explore CTA hands off into the journey (GB-1.1): one restrained flow
  // toward the cap, then the orbit. No reset, no reload.
  const cta = document.querySelector('.ui .cta');
  if (cta) cta.addEventListener('click', (e) => {
    e.preventDefault();
    handleNavIntent('inspire');
  });

  /* ================================================================
     Routes (adr-d6-routes.md)
     ================================================================ */
  function navigateTo(chapterId, wrap = 0) {
    // A cue that began just before the click must not keep waving through the
    // flight. The rail owns its animation class/timer and retires both here.
    if (ui && ui.rail && ui.rail.stopNavigationCue) ui.rail.stopNavigationCue();
    closeDetail();
    directJumpTo(chapterId, wrap);
  }

  /** The two bookend buttons meet across the journey's hidden seam. Reuse the
   * old scroll-loop camera path only for Intro <-> Outro; its hero furniture
   * timing is endpoint-authored, so near-end pairs must remain direct. Read
   * the logical chapter before directJumpTo() snaps state to its destination. */
  function navigateFromControl(chapterId) {
    /* A second bookend click belongs to the lap already on screen. Ask the
       transition that owns that lap to steer its own ticket; reconstructing
       its endpoints here from global journey.progress let an interrupted
       control path miss the live ticket and fall through to directJumpTo(),
       which installed a fresh opposite wrap at phase zero. That is the
       455px -> 356px rail snap (and the hero opacity drop) seen on reversal. */
    if (transition.steerWrapTo(restProgress(chapterId))) {
      if (ui && ui.rail && ui.rail.stopNavigationCue) ui.rail.stopNavigationCue();
      closeDetail();
      return;
    }
    const fromId = chapterAt(journey.progress).id;
    navigateTo(chapterId, controlWrapDirection(fromId, chapterId));
  }

  /* Nav = a DIRECT jump (ride-through #2, Hannah): clicking a chapter must not
     run the camera through every section in between. Journey state snaps to
     the destination immediately (seams, copy, route, scroll surface all land
     there this tick — so a cancelling scroll hands control back exactly where
     the state is, satisfying GB-3.5 trivially), while the CAMERA takes ONE
     short, direct move from where it was onto the destination pose.

     "Direct" used to mean a straight-line lerp of the POSITION with a
     sin(PI * f) vertical lift bowed over it, so the chord would not shave
     through the body. Hannah, 2026-08-04: "it first does a weird little jump
     — the camera should just transition directly." Two separate faults, both
     measured on the live page before this change:

       * the lift ran on LINEAR f while the position ran on smootherstep, so
         its vertical velocity was full at f = 0 and the horizontal velocity
         was zero. The move opened with a pure upward kick. Mission -> Owned
         climbed 0.48 world units ABOVE its own highest endpoint inside the
         first 180 ms, having travelled 0.001 of the way horizontally, then
         came back down. Same discontinuity, mirrored, on landing.
       * the blend moved the position and left the ORIENTATION the director
         had just written for the destination pose. Frame one of every jump
         therefore snapped the framing to the destination's stare while the
         camera still stood at the start: measured 48.5 deg of instant whip on
         Mission -> Connect, unwound over the following second.

     Both are gone. The move is interpolated in the organism's own cylindrical
     frame (arcLerp above) — azimuth the short way round the stipe axis, with
     radius and height carried independently — so it curves AROUND the body
     instead of bowing OVER it, and needs no lift to stay clear: the shipped
     chord could not make that promise (Inspire -> Final passed r = 2.20
     against a 2.18 rim radius, i.e. INSIDE the cap, which is exactly the
     shave the lift existed to cover). Height is now a plain monotone lerp, so
     there is no vertical excursion at all. Target and fov travel on the same
     ease and the camera is re-aimed from where it actually is, so what
     transitions is one continuous POSE rather than a position sliding under a
     fixed stare. Timing is untouched — the same smootherstep and the same
     duration law, now measured along the path actually travelled instead of
     along a chord the camera no longer follows. */
  /* The blend, the two rail tickets, the chapter-entry clock and the
     state/camera disagreement flag were eleven `let`s here. They are the
     transition controller's now (J01); the notes that describe each one
     moved with it. What remains on this side is the frame's own readback and
     the rail's interpolation of a flight ticket. */
  let presentedP = journey.progress; // QA/readback: camera-authoritative route coordinate
  const flightProgress = (flight) => flight.fromP
    + (flight.targetP - flight.fromP) * flight.phase;
  /* THE ROUTE-FAITHFUL FLIGHT IS PACED BY ITS OWN PATH (2026-08-24 — Hannah:
     "Navigating into the Inspire section from the hero moves WAY too quickly
     for some reason").

     The reason, measured: the first-leg flight presented its route coordinate
     UNIFORMLY in p under the blend's ease, but the leg's camera path is
     extremely non-uniform in p — INSPIRE_CAM.arrival holds the hero pose
     exactly through ARRIVAL_DEAD (p 0..0.045, 17% of the leg buys 0.0 world
     units of path) and its trapezoid concentrates the rest. So of the move's
     1.20 s, the first 0.38 s rendered a parked camera, and the whole 24.0-unit
     path — the longest of ANY ordinary jump — was ridden in the remaining
     ~0.7 s: peak 56.6 u/s and 269 deg/s of gaze, 0 -> 47 u/s inside 120 ms,
     against a sibling family of 15.0-45.6 u/s, 77-217 deg/s, and no jump
     opening faster than 147 u/s^2 over any 100 ms (all measured at 1440x900,
     60 fps virtual clock). 56.6 is within 1% of the 57 u/s the WRAP_EXTRA_S
     note above rules un-shippable — "4x every other transition on the site".
     Mirrored on the way home: the camera brakes 47 -> 0 in 120 ms and then
     sits parked for the blend's last 0.35 s before the hero copy breathes in.

     The cure keeps every pose ON the authored route (the point of the
     route-faithful presentation) and re-times only WHEN each p is presented:
     the blend's eased clock now advances along a per-segment METRIC sampled
     from the leg itself at arm time — poseAt is pure, which is what makes the
     sample valid — so equal fractions of eased time buy equal fractions of
     path, and the C2 envelope's zero-velocity promise holds for the move the
     eye actually sees. Re-measured: peak 38.6 u/s / 180 deg/s, opening
     176 u/s^2, motion from 0.18 s — inside the family on every axis.

     ROUTE_PACE_FLOOR is the fraction of uniform-p pace a zero-motion stretch
     of route retains. It exists because a floor of 0 would cross ARRIVAL_DEAD
     in a single frame and snap the hero furniture (presence rides travelP) —
     the exact one-frame-scrim class of a8d4518/2026-08-16. At 0.15 the
     departure fade takes ~0.20 s and the return breathe ~0.14 s, matching the
     0.23 s / 0.15 s the same furniture measures on a generic hero jump
     (mission -> final), so the fade keeps its beat without stalling the
     flight. */
  const ROUTE_PACE_FLOOR = 0.15;
  const ROUTE_PACE_N = 64;
  const _pacePose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };
  const _pacePrev = new THREE.Vector3();
  function buildRoutePace(fromP, toP) {
    const cam = sceneApi.camera;
    const aspect = ASPECT ?? cam.aspect;   // mirror director.apply's composition
    const cum = new Float64Array(ROUTE_PACE_N + 1);
    let pathLen = 0;
    for (let i = 0; i <= ROUTE_PACE_N; i++) {
      poseAt(fromP + (toP - fromP) * (i / ROUTE_PACE_N), _pacePose,
        director.heroPose, aspect, innerWidth);
      if (i) { cum[i] = pathLen += _pacePose.pos.distanceTo(_pacePrev); }
      _pacePrev.copy(_pacePose.pos);
    }
    if (!(pathLen > 1e-6)) return null;    // degenerate leg: linear fallback
    const floor = (ROUTE_PACE_FLOOR * pathLen) / ROUTE_PACE_N;
    let total = 0, prevRaw = 0;
    for (let i = 1; i <= ROUTE_PACE_N; i++) {
      total += Math.max(cum[i] - prevRaw, floor);
      prevRaw = cum[i];
      cum[i] = total;
    }
    return { cum, total, pathLen };
  }
  function directJumpTo(chapterId, wrap = 0) {
    const targetP = restProgress(chapterId);
    if (Math.abs(targetP - journey.progress) < 1e-4) return;
    // The rest this move DEPARTS — read before placeAt moves the state. Only
    // the wrap spends it: a rewound lap lands back on this rest
    // (steerWrapBlend / landWrapHome below).
    const fromP = journey.progress;
    const fromChapterId = chapterAt(fromP).id;
    // A click may overtake another click. Journey state is already at that
    // older flight's destination, while the rail is visibly between rests;
    // start the replacement from the visible coordinate so interruption and
    // reversal cannot produce a second jump.
    const flying = transition.railFlight;
    const overtaken = transition.blend;
    const wasRouteFaithful = !!(overtaken && overtaken.routeFaithful);
    /* A route-faithful blend's camera is at its PRESENTED coordinate, which
       is metric-paced (buildRoutePace) and therefore no longer equal to the
       rail ticket's linear phase mid-flight. A replacement that continues on
       the route must depart from where the camera actually is — starting from
       the linear coordinate would teleport it by the pacing difference. */
    const railFromP = wasRouteFaithful && Number.isFinite(overtaken.presentedP)
      ? overtaken.presentedP
      : flying ? flightProgress(flying) : fromP;
    const inspireP = restProgress('inspire');
    const at = (a, b) => Math.abs(a - b) < 1e-4;
    const onFirstLeg = railFromP >= -1e-4 && railFromP <= inspireP + 1e-4;
    /* The adjacent Mission <-> Inspire move is not a jump in the authored
       ride: it is precisely the first scroll leg. Keep an interrupted return
       on that same leg too, but never claim a generic/non-adjacent camera as
       route-faithful merely because its synthetic rail coordinate happens to
       cross this interval. */
    const routeFaithful = !wrap && onFirstLeg
      && (at(targetP, 0) || at(targetP, inspireP))
      // With no blend, the live camera is director(p); with a first-leg blend,
      // it is director(presentedP). A generic jump may cross the same numeric
      // interval but its live pose is not on the route, so never switch it.
      && (!overtaken || wasRouteFaithful);
    const cam = sceneApi.camera, ctl = sceneApi.controls;
    const fog = sceneApi.scene.fog;
    const pos0 = cam.position.clone(), tgt0 = ctl.target.clone(), fov0 = cam.fov;
    const fogN0 = fog ? fog.near : 0, fogF0 = fog ? fog.far : 0;
    // the LIVE grade, not lookOf(origin p) — a jump overtaking a jump starts
    // from a graded frame that is mid-blend and belongs to no p at all, which
    // is the same reason pos0 above is read off the camera rather than the route
    const look0 = { ...lens.look };
    // A jump overtakes a jump: drop the old blend BEFORE placing, so the
    // placement's own dt = 0 frames are not stepped by it (the blend now runs
    // inside applyFrame — see the frame-order block there). The new blend
    // starts from where the old one had actually reached, which pos0 above
    // has already captured.
    transition.abandonForJump();
    // ...and a jump AWAY from the hero arms its furniture DEPARTURE here,
    // before placeAt's dt = 0 passes can snap the scrim off on the click
    // frame — the up-wrap flash (2026-08-16; see the departure term).
    if (wrap && chapterId !== 'mission') transition.armHeroExit(true);
    else if (!wrap) transition.clearHeroTerms();
    // pos0 is banked, so assert the un-owned invariant before placing: if the
    // director is un-owned the camera may be MID-LAP (a nav click over a
    // flying down-wrap — the blend just dropped without restoring), and
    // placeAt is about to hand the director the camera, whose capture must
    // see the hero pose (director.js captureHero). Idempotent when the
    // camera already is the hero's, which is every ordinary un-owned jump.
    if (!director.owned) guarded('director', () => director.applyHeroPose());
    // Place, arm, never replay — but WITHOUT the eased-state snap. A jump is
    // not a placement: the camera is about to travel, so the chapters' eased
    // arm states must not be thrown to their destination values while it does.
    // Seam/arming settlement is deferred to the landing (endCamBlend), which
    // is the frame the journey's state and camera agree again. Visible intro
    // clocks are deliberately excluded; they may outlive the camera move.
    // This is the WebGL half of what ui.armCopyEntry does for the copy layer.
    // Install before placeAt: its two synchronous dt=0 passes must see the
    // beginning of the entry, not one transient fully-arrived drive(p) state.
    // This first leg already owns a complete progress-authored arrival. A
    // second navigation-only chapter clock would make its scene diverge from
    // an equal-p scroll sample even after the camera path was corrected.
    const wrapTicket = wrap ? {
      dir: wrap,
      homeP: restProgress(fromChapterId),
      targetP,
      phase: 0,
    } : null;
    // The wrap's copy envelope can only be priced after placeAt() reveals the
    // destination camera. Bank the copy that is actually visible before that
    // synchronous placement so the eventual arm fades from screen truth even
    // when the source rest was itself established by a dt === 0 placement.
    if (wrap) guarded('ui', () => ui.prepareCopyEntry(chapterId));
    transition.beginFlight({
      railWrap: wrapTicket,
      railFlight: wrap ? null : { fromP: railFromP, targetP, phase: 0 },
      chapterEntry: routeFaithful
        ? null
        : startChapterEntry(chapterId, chapters[chapterId], guarded),
    });
    placeAt(targetP, { snap: false });
    /* THE WAY HOME (2026-08-12 — the loop). A wrap is the same transition as
       every other nav jump; only its PATH is authored, because the shortest
       one says the wrong thing. Measured on the shipped route, the ride's own
       azimuths are Mission -13.8deg, Inspire +115.0, Connect +61.8, Owned
       +72.1, Final -79.6 — a NET -65.8deg from first rest to last. Final ->
       Mission the short way is therefore +65.8deg: numerically minimal, and it
       reads as the ride's net rotation being UNDONE, which is precisely the
       rewind the brief rules out. Continuing instead in the sense the ride was
       last travelling (Owned -> Final is -151.7deg, the largest leg on the
       route) costs -294.2deg and brings the total to exactly -360: the camera
       arrives at the hero pose having gone around the organism ONCE. That is
       what closing the circle means here, and it is a property of the route's
       own numbers rather than a taste call.
         `bow` swings the lap wide before it draws in — the ride ends far out
       (r 14.97) and begins close (r 11.53), so a plain lerp would tighten
       monotonically the whole way and the return would read as an approach
       rather than a lap. `rise` lifts it over the cap and sets it back down.
       Both are sin(PI e) on the position's own ease, so both start and end at
       zero velocity (see arcLerp).
         The duration is the same law, with the same 0.85 s floor, given the
       reach it needs: the wrap's arc is ~68 units against ~15.6 for the
       longest ordinary jump, so the shipped cap would run it 4x faster than
       any other transition — a whip, not a considered move. */
    const az1 = wrap ? azTurn(pos0, cam.position, WRAP_TURN || -wrap) : null;
    const bow = wrap ? WRAP_BOW : 0, rise = wrap ? WRAP_RISE : 0;
    // A route-faithful flight is priced by the route path it actually rides
    // (buildRoutePace above), not by the cylindrical arc it no longer follows
    // — the same "measured along the path actually travelled" rule the
    // arcLerp rewrite stated for every other jump. Both give the capped
    // 1.20 s on the shipped first leg (arc ~20+, route 24.0), so the shipped
    // duration is unchanged; they differ only for a mid-leg overtake.
    const routePace = routeFaithful ? buildRoutePace(railFromP, targetP) : null;
    const len = routePace ? routePace.pathLen : arcLength(pos0, cam.position, az1);
    const baseDuration = wrap
      ? 0.85 + 0.35 * Math.min(len / 20, 1) + WRAP_EXTRA_S * Math.min(len / 68, 1)
      : 0.85 + 0.35 * Math.min(len / 20, 1);
    const dur = navigationDurationSeconds(baseDuration, fromChapterId, chapterId);
    // THE FOG TRAVELS WITH THE CAMERA (2026-08-09). The director keys fog off
    // p, so a jump threw the whole world's depth to the destination's ramp on
    // the click frame while the camera still stood at the origin: measured on
    // Mission -> Final, the Mission pose rendered 3.6/255 brighter the instant
    // the click landed — the hero's own 7 -> 20 replaced by the epilogue's
    // 13.75 -> 60.3, so everything the Mission composition fogs to black came
    // up out of the dark and then travelled. Same fault as the reveal, in the
    // one parameter that is not geometry. Both ends are read here, not per
    // frame: p does not move during a jump, so the destination ramp is a
    // constant, and reading it live would feed the blend back into itself at
    // p = 0 exactly as the position once did (the M4 stuck camera).
    const fogN1 = fog ? fog.near : 0, fogF1 = fog ? fog.far : 0;
    // ...and so does THE GRADE, for exactly the same reason and read at
    // exactly the same two moments (2026-08-13 — the loop's seam; see the
    // `override` block in lens.js). look0 is captured above, before placeAt,
    // because it is what is on screen; look1 is read here, after placeAt has
    // let lens.update() write the destination's per-leg curve.
    const look1 = lens.lookOf(journey.progress);
    transition.beginBlend({ t: 0, dur, play: 1, pos0, tgt0, fov0, fog, fogN0, fogF0, fogN1, fogF1,
      az1, bow, rise, look0, look1, look: { ...look1 },
      // The lap's reverse gear (wrap only): the scroll direction that asked
      // for this move, the rest it departed — where a rewound lap places the
      // journey when it gets back (steerWrapBlend / landWrapHome) — and the
      // destination pose's camera x, kept so a steer can re-announce the
      // chapters' blend contract with whichever end the lap now lands at.
      wrapDir: wrap, homeP: wrapTicket ? wrapTicket.homeP : 0,
      routeFaithful, routeFromP: railFromP, routeTargetP: targetP, routePace,
      presentedP: routeFaithful ? railFromP : null,
      dstX: cam.position.x });
    // cam.position is the DESTINATION pose here — placeAt above let the
    // director write it, and az1/len are already measured against it. A
    // chapter whose reveal is paced (not merely gated) by the camera needs to
    // know where the move ENDS, not only that a move is running: see Final's
    // BLEND_REVEAL_RATE, which spends the reveal over the move instead of over
    // whatever fraction of it the path happens to spend crossing the band.
    // ...and HOW LONG it has to get there. `dstCamX` alone answers "where does
    // this move end", which is enough to pace an ARRIVAL: the arriving chapter
    // is clamped by the camera on its way up, so the move's own landing sets
    // the deadline. A DEPARTURE has no such clamp — the leaving chapter is
    // free-running downward — so without the duration it can only guess, and
    // the guess it has been making is the ladder's own clock, which spends the
    // whole field in the first third of the lap (26-scroll-loop.md §26).
    // On the route-faithful first leg the chapters already consume frameP,
    // exactly as they do under scroll. Advertising a destination-parked
    // camera disagreement here would reintroduce nav-only reveal behaviour.
    if (!routeFaithful) transition.setBlending(true, cam.position.x, dur);
    // The destination's copy is timed against THIS move, not against the click
    // (Hannah, 2026-08-07 — "the text for the new section INSTANTLY appears").
    // The duration is only knowable here, after placeAt has let the director
    // write the destination pose, which is why the hand-off is one call at the
    // end of the jump rather than a constant in ui.js. See the copy-entry
    // block there, and COPY_JUMP_LEAD / COPY_JUMP_COPY_TAIL_S.
    // Ordinary clicks now expose their camera-authored `travelP` to the copy
    // layer, so its existing scroll bands and speed/settle envelope can own the
    // whole handoff. A cyclic wrap has no monotone section coordinate across
    // its hidden seam and therefore keeps the dedicated reversible ticket.
    if (wrap) guarded('ui', () => ui.armCopyEntry(chapterId, dur));
    // ...and the hero's own furniture is timed against the same move, for the
    // same reason and on the same envelope. It is the third member of the
    // family a8d4518 (chapter geometry) and d1ecc23 (section copy) opened, and
    // the only one that had never been given a ticket.
    if (wrap) transition.armHeroEntry(chapterId, dur);
  }

  /* THE DETAIL NO LONGER HAS A HISTORY ENTRY (2026-08-11 — the URL is not a
     route any more; see state.js). Opening a card used to pushState
     `#/<chapter>/<node>` and closing used to spend that entry with
     history.back(), which needed a `detailPushed` flag to tell "we pushed
     this" from "we arrived on it" — the latter had nothing of ours behind it,
     so Back would have walked the visitor off the page. With nothing pushed
     there is nothing to spend and nothing to distinguish: every close, from
     every path (the X, Escape, a press outside, the scroll intent, a nav
     jump), closes the card DIRECTLY. history.back() is not called anywhere in
     this build. */
  function openDetail(nodeId, trigger) {
    nodeId = normaliseNode(NODE_CHAPTER[nodeId] || chapterAt(journey.progress).id, nodeId);
    if (!nodeId) return;
    if (!ui.openCard(nodeId, trigger)) return;
    detailNode = nodeId;
  }

  function closeDetail() {
    if (!detailNode) return;
    detailNode = null;
    ui.closeCard();
  }

  /** An inbound route — a hash that arrived in the address bar after boot.
   *  state.js has already taken it back out of the URL by the time this runs;
   *  all that is left is to honour it. (The boot chain below handles the
   *  arrival case, which is the common one.) */
  function handleRoute(r) {
    const node = normaliseNode(r.chapter, r.node);
    if (node) {
      if (node !== detailNode) { detailNode = node; ui.openCard(node, null); }
    } else if (detailNode) {
      detailNode = null;
      ui.closeCard();                                  // a chapter route closes the detail first
    }
    if (r.sameChapter) return;
    // Every route-driven chapter change is a DIRECT jump (D16 restage found
    // the legacy adjacent-chapter flight left the camera stuck with runaway y
    // on Back-to-Mission; direct jumps are also what Hannah asked nav to be).
    // The flight system's last caller was the footer cue's fly to the
    // end-hold; the cue went with the footer (navigation redux, 2026-08-09)
    // and the flight system went with it — nothing travels but the scrub and
    // the direct jump's own camera blend.
    directJumpTo(r.chapter);
  }

  /* ================================================================
     Per-frame
     ================================================================ */
  // (`lastChapter` lived here: the edge-detector for the route write applyFrame
  // used to make on every chapter crossing. The write is gone — see the block
  // at the foot of applyFrame — and it had no other reader.)


  /* ================================================================
     FRAME ORDER: THE CAMERA IS FINISHED BEFORE ANYTHING READS IT
     ================================================================
     Everything below the camera block reads the camera — the seams' T1/T3/T4
     predicates, every chapter's drive(), the lens's focus projection, the
     UI's hotspot projection — and so does every chapter's own animator, which
     the registration order at the top of boot() puts after this one. There is
     therefore exactly one place the pose may be written: here, at the top,
     and it must be COMPLETE before the first reader runs.

     That is a new rule as of 2026-08-09, and it is the fix for Hannah's
     "weird flash" on a nav jump (25-navigation-redux.md). A jump is a DIRECT
     jump: placeAt snaps journey state to the destination and the director
     writes the destination POSE, then the camera blend carries the camera
     back to where it actually was and eases it across. The blend used to run
     at the END of this animator, after every one of those readers and after
     every chapter animator. So on the first frame of a jump they all read the
     destination pose — a pose that was about to be overwritten in the same
     frame, and never rendered. Measured on Mission -> Final: 210,051
     triangles submitted on that frame against 12,829 at the Mission rest,
     with Final's reveal fully kindled over a camera still standing at
     Mission. One frame of the arrived epilogue, composited onto the departure
     camera. THAT is the flash.

     Stepping the blend here instead costs nothing and removes the whole
     class: a reader can no longer see a pose that is not the presented one.
     placeAt's own dt = 0 frames run with no blend in flight (directJumpTo
     drops it before placing), so deep links, ?p=, ?pose= and the frozen
     ?capture= path are untouched — they place, and this block does nothing. */
  function applyFrame(p, dt) {
    /* A CANCELLED BLEND DIES BEFORE OWNERSHIP IS DECIDED (2026-08-14 —
       Hannah's stuck hero). The cancellation test used to live at the top of
       stepCamBlend, i.e. AFTER director.setOwned() and director.apply() had
       already run for this frame. That is one line too late in exactly one
       case, and it is the case that bites: when the delta that cancels the
       blend is also the delta that carries p across the ownership boundary
       (HERO_OWNED_P, 0.0008 past the hero's pose — read once, below), then
       setOwned(true) ran first and captured `hero` from a camera
       the dying blend still had mid-lap. Measured on a real wheel-driven
       down-wrap (in-page rAF-timed WheelEvents, ~17 ms apart, one case per
       fresh page) interrupted by a single 500 px delta at 1800 ms: that delta
       buys p = 0.0224, twenty-eight times the threshold, and ONE FRAME later
       `hero` was already 25.68 units and 3.76 deg of fov from the composition
       the page booted with — and stayed there for the rest of the session. A
       120 px delta at 1000 ms (p = 0.0053) does it too: 22.44 units, 6.30 deg.
       Deciding it here costs nothing (same frame, same values, so
       "control returns within one frame" is untouched) and means the camera
       is always the hero's before anyone reads it. The blend that SURVIVES is
       still stepped below, after the director has written the destination
       pose, so the composition order the frame-order block describes is
       unchanged. */
    /* A WRAP FOLLOWS THE SCROLL (2026-08-16 — Hannah: reversing mid-wrap
       "just does a harsh reset... it just goes straight to the other area
       instead of just following the direction of my scroll"). Cancelling a
       CLICK jump hands the camera back with a step, and for a click that step
       is small and earned: any scroll after a click is unambiguously the
       visitor taking over. Cancelling the wrap's lap the same way teleported
       the camera to the destination pose — up to the lap's whole 68-unit arc
       in one frame — because the state was placed at the destination the
       moment the wrap fired. So a wrap blend is never dropped by scroll input
       at all: it is STEERED. Input the model acts on sets the lap's play
       direction to the scroll's own — with the wrap, keep flying; against it,
       retrace the same authored path backwards — and the gesture is retired
       (scroll.retire) exactly as the wrap itself retires the gesture that
       fired it, so the tail of the steering flick cannot re-steer or cancel.
       A rewound lap that reaches its own first frame lands the journey back
       on the rest it departed (landWrapHome, top of spineFrame), and the
       visitor's continued reverse scroll simply carries on from there. */
    /* THE ANSWER IS THE MODEL'S, AND IT ARRIVES DISCRIMINATED (J01). This
       used to be `scroll.sinceInput < 50 && scroll.answeredAt === null`: a
       clock read, a private wall and a threshold that existed in no model.
       transition.blendCancelled() is one call to the model's decision port,
       and it answers `null` or a frozen `{dir}` — so the steering branch
       needs no second question about direction, and there is no scalar here
       to truthiness-test. It is called INSIDE this guard, never hoisted: on
       the no-blend path the model must not read its clock at all. */
    if (transition.blend) {
      const claim = transition.blendCancelled();
      if (claim) {
        if (transition.blend.wrapDir && claim.dir) {
          transition.steerWrapBlend(claim.dir);
          // The steering gesture is retired on the spot — the same retirement
          // the wrap gives the gesture that fires it — so the rest of the same
          // flick cannot re-enter this block, cancel the lap, or buy a wrap of
          // its own while the lap flies. (The onWrap steering path skips this:
          // the wrap block that calls it raises the wall itself.) The model
          // owns its own gesture bookkeeping, so this stays on this side of
          // the seam rather than reaching through the controller.
          scroll.retire(claim.dir);
        } else transition.dropCamBlend();
      }
    }
    // A visible entry may deliberately outlive its camera flight. The first
    // real scroll after landing still owns the scene immediately: retire the
    // synthetic clock so this very frame goes back to the chapter's pure p
    // drive, just as dropCamBlend does while the flight is active.
    if (!transition.blend && transition.chapterEntry && transition.blendCancelled())
      transition.chapterEntry = null;
    /* ONE READ OF THE OWNERSHIP BOUNDARY, USED BY BOTH OF THE FRAME'S
       QUESTIONS ABOUT IT. These were two separate `p > 0.0008` comparisons —
       the mid-lap guard below, and setOwned's own argument — and the comment
       at the head of applyFrame turns on the fact that the delta cancelling a
       blend can be the same delta that carries p across this boundary. Two
       spellings of one boundary is how those two frames drift apart; hoisting
       it to a single evaluation is stronger than keeping the two literals in
       step, because there is now nothing to keep in step. Pure in `p`, which
       nothing between here and setOwned touches, so the frame's observable
       order is unchanged. */
    const owned = p > HERO_OWNED_P;
    /* OWNERSHIP MAY NOT BE TAKEN FROM A CAMERA A BLEND HOLDS MID-LAP
       (2026-08-16). setOwned(true) captures the hero composition from the
       LIVE camera, which is right only while the un-owned camera IS the
       hero's (director.js captureHero). A steered wrap keeps its blend alive
       through input that also moves p: a pause and a fresh same-way delta at
       the down-wrap's destination drop the wall for one frame, p crosses the
       threshold with the camera still mid-lap, and the capture bakes that lap
       frame into `hero` for the rest of the session — measured az -1.390,
       r 14.97 (the Final rest's own radius), fov 45.5 landing as the "hero"
       pose. The cancellation path never met this because dropCamBlend()
       restores the hero BEFORE ownership is decided; the steering path keeps
       the blend, so the restore has to happen here. Synchronous, and both the
       director's apply() and the surviving blend overwrite the camera later
       this same frame, so nothing of the re-asserted pose ever renders. */
    if (transition.blend && !director.owned && owned) {
      guarded('director', () => director.applyHeroPose());
    }
    director.setOwned(owned);
    // A route-faithful first-leg flight is written below by the compositor at
    // its continuously presented coordinate. Writing the parked destination
    // here first would advance handheld state twice and briefly let two camera
    // clocks disagree inside one frame.
    const blendThisFrame = transition.blend;
    const routeFaithfulThisFrame = !!(blendThisFrame && blendThisFrame.routeFaithful);
    if (owned && !routeFaithfulThisFrame) guarded('director', () => director.apply(p, dt));
    // ...and then the jump's blend composes onto that written pose. The
    // throw-abandons-the-blend rule travelled with the stepper into the
    // controller; see stepCamBlend there.
    if (transition.blend) transition.stepCamBlend(dt);

    // Route state is parked at the destination throughout a direct click.
    // Reconstruct the coordinate actually being presented from the camera's
    // own smootherstep phase. This is the same scalar scroll supplies, so the
    // hero envelope and UI speed hold accelerate, reverse and settle with the
    // rail/camera rather than reacting to a destination snap.
    const travelP = routeFaithfulThisFrame && Number.isFinite(blendThisFrame.presentedP)
      ? blendThisFrame.presentedP
      : transition.railFlight ? flightProgress(transition.railFlight) : p;
    presentedP = travelP;
    // State remains parked at the clicked destination for routing and active
    // nav semantics. Only the route-authored adjacent flight presents its
    // synthetic coordinate to scene/chapter/lens readers, exactly as scroll.
    const frameP = routeFaithfulThisFrame ? travelP : p;

    /* THE ONE CAMERA PUBLICATION (J02). Here, and nowhere else: after
       stepCamBlend has finished composing the camera, and above the first
       reader of it. Earlier inverts the fog correction — the blend writes
       fog, and a publication taken at the top of this function would hand
       every reader the departure's ramp while the camera flew the arrival's
       (measured on Mission -> Final: the Mission pose rendered 3.6/255
       brighter the instant the click landed). Later would mean at least one
       reader had already gone to the live object.

       Nothing between stepCamBlend above and this line touches the camera.
       That is the load-bearing property, and it is what makes the frozen
       pose below equal to the pose this frame will actually present.

       `gliding` is taken here rather than at applyChapterFrame's call: the
       model's glide state is written by scroll.update(), which spineFrame
       calls once per frame above applyFrame, and nothing between this line
       and that call reaches the model at all. The value is the same one; it
       is now a member of the frame instead of a second reach for a live
       object halfway down the reader list. */
    const frame = framePublisher.publish({
      dt,
      stateP: p,
      routeP: frameP,
      presentedP: travelP,
      transition,
      gliding: scroll.gliding,
    });

    /* AND FROM HERE DOWN, THE FRAME IS THE ONLY COORDINATE AUTHORITY (D1).
       Every reader below this line takes its progress, its delta and its
       glide state off `frame` — never off `p`, `dt`, `frameP` or `travelP`,
       which are the publication's INPUTS and are not read again. The values
       are identical by construction (`routeP: frameP`, `presentedP: travelP`,
       `stateP: p`, `dt`) so nothing changes; what changes is that the answer
       to "which time coordinate am I in?" is now ONE object with a `seq` on
       it, instead of four live locals a later edit could re-point one at a
       time. tools/test-frame-publication.mjs C6 holds it: it reads the region
       of this function below the publish call and fails on any reappearance
       of the loose names, and it carries an enumerated allow-list of the
       live reaches that legitimately survive (below).

       WHAT DELIBERATELY STAYS LIVE HERE, and why each one cannot be a member:

         * `sceneApi.camera` — ui.js binds a PROJECTION from it
           (ui/frame-projection.js) and the publication refuses to carry a
           projection matrix (see its header, boundaries.md B.8). C5 pins the
           file-level camera allow-list this respects.
         * `transition.railWrap` / `transition.railFlight` — journey/rail.js
           and journey/ui/copy-arrival.js compare these tickets BY IDENTITY
           and read `phase` as it is mutated. A frozen copy would stop the
           rail docking and the copy carry from tracking the lap. The
           publication's own header states this refusal.
         * `transition.cameraStateDisagree` — NOT the same value as
           `frame.transitionPhase.disagree`. beginFlight() raises the flag
           BEFORE beginBlend() exists, and placeAt() publishes two dt=0 frames
           in between, on which phaseOf() answers null. rail.js edge-detects
           this flag (`jumpStarted`), so routing it through the frame would
           move that edge by two frames. Measured by reading the order in
           directJumpTo; see D1's evidence note.
         * `transition.chapterEntry`, `transition.stepHeroEntry/Exit` — the
           controller's own per-frame steppers, called not read. */
    guarded('seams', () => seams.update(frame.routeP));
    /* Advance a navigation-only entry against what is actually visible, not
       against the camera flight's fraction. Connect is camera-gated: spending
       this clock while the gaze still hid the ground made its fronts finish in
       darkness and pop in fully lit at landing. A source pose that already
       looks down still starts at f=0 because the ticket was installed before
       placeAt; entryReady merely decides when frame time may begin accruing. */
    // Chapter-owned choreography (M4): any chapter exposing drive(p) runs it
    // here, after the seams have armed/retired it. Inspire's reveal drive
    // lives in chapters/inspire/index.js now — the spine knows no chapter's
    // internals. Each chapter is guarded individually: one broken chapter is
    // dropped, the others keep driving.
    transition.chapterEntry =
      applyChapterFrame(chapters, transition.chapterEntry, frame.routeP, frame.dt,
        frame.gliding, guarded);

    // Optics (W5): ONE finishing language across the whole journey. The lens
    // owns the per-leg parameter curve; the journey supplies progress and the
    // active chapter's focal source for the halation focus hint (handoff:
    // active Inspire exit, ADOS knot, primary ownership nexus, and on the
    // Final leg the nearest lit ring member — the "selected fairy-ring
    // highlight", since the travelling front has no exposed world position).
    guarded('lens', () => {
      lens.update(frame.routeP);
      // Focal-source handoff points: shortly (+0.02) after each chapter's range
      // begins, route-derived (M4; shipped values 0.40 / 0.62 / 0.87). Each
      // chapter owns its own focal anatomy — Final's is the travelling growth
      // front while it runs, else its own rest-member hint. See
      // pickChapterFocus at module scope.
      lens.setFocusHint(pickChapterFocus(chapters, frame.routeP));
    });

    const ch = chapterAt(frame.stateP);
    // Hero furniture releases as the journey leaves the Mission composition,
    // and comes back only once the camera has actually got here. PRESENCE x
    // ARRIVAL, one writer — see THE HERO FURNITURE block in boot(). max()ed
    // with the DEPARTURE term (heroExit): a jump out of the hero fades what
    // is up over the blend's opening beat instead of stepping it on the
    // click frame — the up-wrap scrim flash (2026-08-16).
    paintHeroFurniture(Math.max(
      heroPresence(frame.presentedP) * transition.stepHeroEntry(frame.dt),
      transition.stepHeroExit(frame.dt)));

    /* THE UI'S FIVE. Four of them are now the frame's own members; the three
       that are not are the enumerated residue named in the block above the
       seams call — a live camera the projection must bind, and the two rail
       tickets two files compare by identity. They are passed as the loose
       parameters they are, so that the ones that ARE frozen cannot be
       mistaken for them. ui.update()'s SIGNATURE is unchanged: its opts bag
       is also the contract tools/trace/deck.mjs drives, which is outside this
       order's allow-list, so the retirement here is of the loose READS, not
       of the parameter names. */
    guarded('ui', () => ui.update(frame.stateP, ch.id, sceneApi.camera, frame.dt,
      { cameraStateDisagree: transition.cameraStateDisagree,
        railWrap: transition.railWrap,
        railFlight: transition.railFlight,
        travelP: frame.presentedP }));

    /* THE RIDE WRITES NOTHING (2026-08-11, Hannah's brief). A chapter change
       used to replaceState `#/<chapter>` from right here, every time the
       scrub crossed a boundary — the visible symptom she reported, and the
       reason the address bar flickered through four routes on one wheel
       gesture. The crossing is still detected where it matters (ui.js's copy
       bands, seams.js, the rail's `chapterAt(p)`); it simply no longer has an
       opinion about the URL. Nothing replaces this block. */
  }

  /* THE SIX TRANSITION OPERATIONS LIVED HERE (J01). blendCancelled,
     dropCamBlend, steerWrapBlend, landWrapHome, endCamBlend and setBlending
     are journey/transition/controller.js's now, with every line of their
     measured rationale, and the state they read and write went with them.
     applyFrame and spineFrame call them through `transition`; the writer
     order this file is pinned on (tools/test-frame-order.mjs S1/S2) is
     unchanged, because a receiver is not a reorder. */

  /** Jump every chapter's eased state to its target (the placeAt contract). */
  function snapChapters() {
    snapChapterPlacements(chapters, guarded);
  }

  function spineFrame(t, dt) {
    // A fully rewound wrap lands before anything else runs, so the whole
    // frame — scroll, state, readers — composes at the home rest (see
    // landWrapHome for why it must not happen mid-applyFrame).
    if (transition.rewoundHome) transition.landWrapHome();
    scroll.update(dt);
    journey.setProgress(scroll.progress);
    const p = journey.update(dt);
    applyFrame(p, dt);
  }

  /* ================================================================
     Deep links (place, never replay) + QA affordances
     ================================================================ */
  /* INBOUND ONLY, AND READ EXACTLY ONCE. The URL is still a way IN — someone
     handed `#/owned/contributor-3` still lands on that card — but it stops
     being a place the site writes to, so it is read here, at boot, and then
     erased (journey.clearRoute() at the foot of this chain). An unknown or
     retired route no longer normalises to `#/mission`: there is no route to
     normalise TO, so it simply falls through to the cold-load branch and the
     hash is dropped with everything else. */
  const route = journey.parseHash();
  // A hero callout pressed before the journey booted (main.js) — the same
  // intent the browser used to record for us by writing the hash.
  const entry = opts.entry && CHAPTER_IDS.includes(opts.entry) ? opts.entry : null;

  /** Place the journey at p in one tick. `snap` is the PLACEMENT contract —
   *  every eased chapter state jumps to its target so a dt = 0 ride (deep
   *  link, ?p=, ?pose=, hidden-tab ?capture= burst) renders the finished
   *  frame. A nav JUMP passes snap: false: there the camera is about to
   *  travel for the best part of a second, and throwing the chapters to their
   *  arrived states while it does is what left the epilogue composed over a
   *  Mission camera. endCamBlend performs only the narrower nav-landing
   *  reconciliation; the full placement snap remains exclusive to this path. */
  function placeAt(p, { detail = null, snap = true } = {}) {
    // A placement is already-arrived by definition. This also keeps a QA
    // placement issued during a flight deterministic rather than inheriting
    // that flight's synthetic chapter-entry position.
    if (snap) transition.chapterEntry = null;
    journey.snapTo(p);
    scroll.setProgress(p);
    // force every seam up to and including the target to arm before anything
    // opens, then place the camera in the same tick so a hidden-tab capture
    // (which only runs frames in bursts) sees the finished frame
    applyFrame(p, 0);
    guarded('seams', () => seams.update(p));
    if (snap) snapChapters();
    applyFrame(p, 0);
    if (detail) setTimeout(() => openDetail(detail, null), DEEP_LINK_DETAIL_DELAY_MS);
  }

  const qp = P_FLAG;
  const qpose = POSE_FLAG;
  const qcapture = CAPTURE;
  let queuedEntry = null;
  if (qcapture !== null) {
    // ?capture=<p> (M5): pixel-stable stills for capture.py. The page
    // bootstrap already froze the organism's clock at the t = 0 phase and
    // skipped the intro; here the journey places itself at exactly p (a
    // chapter id is accepted and means that chapter's rest, so capture
    // tooling can keep speaking pose names). Everything runs the dt = 0
    // deep-link path, so eased states snap and then hold.
    placeAt(CHAPTER_IDS.includes(qcapture)
      ? restProgress(qcapture)
      : clamp01(parseFloat(qcapture) || 0));
  } else if (qp !== null) {
    placeAt(clamp01(parseFloat(qp) || 0));
  } else if (qpose && CHAPTER_IDS.includes(qpose)) {
    // ?pose= places and no longer echoes itself into the hash: the flag is
    // already in the URL, and writing the route beside it was the one QA path
    // that dirtied a clean address bar on purpose.
    placeAt(restProgress(qpose));
  } else if (entry) {
    // A hero callout pressed before the delayed journey boot is a queued
    // interaction, not an inbound placement. Boot the real Mission frame now;
    // once the public handle exists below, replay it through navigateTo() so
    // camera, scene and copy all receive their normal arrival choreography.
    placeAt(0);
    queuedEntry = entry;
  } else if (route.chapter) {
    placeAt(restProgress(route.chapter), { detail: normaliseNode(route.chapter, route.node) });
  } else {
    // cold load, or a legacy/unknown route: p = 0, the director never takes the
    // camera, and one applyFrame settles the DOM state deterministically
    // instead of leaving it to CSS defaults
    placeAt(0);
  }
  // ...and the URL is clean from here on, whichever branch ran. replaceState,
  // so the deep link is not a redirect: no reload, no second history entry,
  // and the visitor's first Back still leaves for wherever they came from.
  // Runs AFTER the placement, so an arriving route is spent before it is
  // erased — including the card a `#/<chapter>/<node>` link opens, which
  // placeAt schedules DEEP_LINK_DETAIL_DELAY_MS later off the value it has
  // already read.
  journey.clearRoute();

  /* ================================================================
     Public handle
     ================================================================ */
  const state = {
    version: 'w3-a-greybox',
    journey, scroll, director, lens, chapters, seams, ui,
    hero: sceneApi,
    heroIntroSkipped: !!opts.heroIntroSkipped,
    heroIntroMs: HERO_INTRO_MS,
    get p() { return journey.progress; },
    get travelP() { return presentedP; },
    get chapter() { return chapterAt(journey.progress).id; },
    get detail() { return detailNode; },
    /** The navigation can enter during the organism's final settle without
     *  enabling journey input yet. reveal() is latched, so activate() can
     *  safely repeat this call for early-input and reduced-motion paths. */
    revealRail() {
      if (ui.rail && ui.rail.reveal) ui.rail.reveal();
      return state;
    },
    /** Publish and enable the already-prepared journey. Safe to call once the
     *  startup readiness promise has resolved; idempotent for QA callers. */
    activate({ entry: activationEntry = null } = {}) {
      const first = !activated;
      activated = true;
      scroll.enabled = true;
      state.revealRail();
      /* THE COMPATIBILITY GLOBAL. Written out here on purpose:
         `tools/test-ui-closure.mjs`'s A6 reads this file's TEXT for every
         site that names the global, and a publication that scan cannot see
         is one nobody guards. `activate()` is idempotent and re-publishes. */
      window.journey = state;
      if (first) {
        const target = activationEntry || queuedEntry;
        queuedEntry = null;
        if (target && target !== 'mission') navigateFromControl(target);
      }
      return state;
    },
    /** A blocked scroll gesture points to the fixed chapter controls. */
    cueNavigation,
    /** QA: jump progress with no travel and no replay. */
    scrollTo(p) { placeAt(clamp01(p)); return journey.progress; },
    /** QA: navigate to a chapter exactly as a nav click does (direct jump
     *  with the camera blend). The name predates the flight system's removal
     *  and is kept so existing QA scripts still run. */
    flyTo(id) { navigateFromControl(id); },
    /** QA: fire a wrap by hand (+1 = past the end to Mission, -1 = before the
     *  start to Final) — the same call the scroll model's onWrap makes. */
    wrap(dir) { navigateTo(dir > 0 ? 'mission' : 'final', dir > 0 ? 1 : -1); },
    /** QA: the wrap path's three authored numbers, so a sweep can re-render
     *  without a reload. Shipped values live at the head of this module. */
    get wrapTuning() {
      return { bow: WRAP_BOW, rise: WRAP_RISE, extra: WRAP_EXTRA_S, turn: WRAP_TURN };
    },
    set wrapTuning(o) {
      if (!o) return;
      if (typeof o.bow === 'number') WRAP_BOW = o.bow;
      if (typeof o.rise === 'number') WRAP_RISE = o.rise;
      if (typeof o.extra === 'number') WRAP_EXTRA_S = o.extra;
      if (typeof o.turn === 'number') WRAP_TURN = o.turn;
    },
    /** QA: a chapter's build-time counts (segments, points, bodies, draws
     *  per body), or null. The budget A/Bs read this rather than counting
     *  scene children by hand. */
    counts(id) { const c = chapters[id]; return (c && c.counts) || null; },
    /** QA: one-line audit of everything a sample point should assert. */
    debugState() {
      const p = journey.progress;
      const c = sceneApi.camera;
      const active = document.querySelector('.j-rail-slot.active .j-rail-item');
      const copy = [];
      for (const b of document.querySelectorAll('.j-block')) {
        if (parseFloat(b.style.opacity || 0) > 0.02) copy.push(b.dataset.chapter);
      }
      const heroCopy = parseFloat((document.querySelector('.ui .hero') || {}).style?.opacity ?? '1');
      if (heroCopy > 0.02) copy.unshift('mission');
      return {
        p: +p.toFixed(4),
        chapter: chapterAt(p).id,
        hash: location.hash,
        pose: [+c.position.x.toFixed(3), +c.position.y.toFixed(3), +c.position.z.toFixed(3)],
        fov: +c.fov.toFixed(2),
        fog: [+sceneApi.scene.fog.near.toFixed(2), +sceneApi.scene.fog.far.toFixed(2)],
        copy,
        nav: active ? active.dataset.chapter : null,
        detail: detailNode,
        armed: Object.keys(chapters).filter(k => chapters[k].armed),
        lens: {
          on: lens.enabled, amount: +lens.amount.toFixed(3),
          ...Object.fromEntries(Object.entries(lens.look)
            .map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(3) : v])),
        },
        hotspots: ui.hotspots.filter(h => h.btn.classList.contains('vis')).map(h => h.id),
        radius: +Math.hypot(c.position.x, c.position.z).toFixed(3),
      };
    },
  };

  /** Wait until commands submitted by the warm draws have actually completed.
   *  Shader compilation alone does not upload buffers/textures or generate
   *  mipmaps, which is why the old compileAsync-only boundary still hitched. */
  async function drainGpu(renderer) {
    const gl = renderer.getContext();
    if (gl.isContextLost()) throw new Error('WebGL context lost during preparation');
    if (gl.fenceSync && gl.clientWaitSync) {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const startedAt = performance.now();
      try {
        for (;;) {
          const result = gl.clientWaitSync(sync, 0, 0);
          if (result === gl.ALREADY_SIGNALED || result === gl.CONDITION_SATISFIED) return true;
          if (result === gl.WAIT_FAILED) throw new Error('GPU readiness fence failed');
          if (performance.now() - startedAt > 8000) {
            /* Warmup is an optimisation, not an availability gate. A busy
               software renderer may keep a valid fence pending well past the
               startup budget; publishing then is safer than replacing the
               whole interactive site with the fallback. Context loss and an
               actual WAIT_FAILED result remain fatal above. */
            console.warn('[journey-v6] GPU warmup fence exceeded 8s; continuing');
            return false;
          }
          await new Promise(resolve => setTimeout(resolve, 8));
        }
      } finally {
        gl.deleteSync(sync);
      }
    }
    gl.finish();
    return true;
  }

  async function prepareGpu() {
    const r = sceneApi.renderer;
    if (!r) throw new Error('No WebGL renderer for journey preparation');
    const gl = r.getContext();
    const debugInfo = gl.getExtension && gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const softwareRenderer = /swiftshader|llvmpipe|software rasterizer/i.test(rendererName);

    // Image decode plus both initial Canvas2D atlas bakes must finish before
    // the visible clock starts. Prepare the first remix here too: its old
    // first-input idle task could otherwise become a new post-intro hitch.
    const portraits = chapters.owned && chapters.owned.portraits;
    if (portraits && portraits.photosReady) await portraits.photosReady;
    if (portraits && portraits.prepareRemix) portraits.prepareRemix(r);

    if (r.compileAsync) {
      try { await r.compileAsync(sceneApi.scene, sceneApi.camera); }
      catch (asyncError) {
        if (!r.compile) throw asyncError;
        r.compile(sceneApi.scene, sceneApi.camera);
      }
    } else if (r.compile) {
      r.compile(sceneApi.scene, sceneApi.camera);
    }

    // Submit every chapter's real draw list to a tiny offscreen target. Every
    // changed scene flag is restored in finally, including descendants that
    // are normally invisible or outside the hero camera's frustum. Software
    // WebGL can spend minutes synchronously rasterising these hidden warmup
    // frames; shader compilation above is sufficient there, and avoids making
    // a performance optimisation an availability gate.
    if (!softwareRenderer) for (const id of Object.keys(chapters)) {
      const g = chapters[id] && chapters[id].group;
      if (!g) continue;
      let anchor = g;
      while (anchor.parent && anchor.parent !== sceneApi.scene) anchor = anchor.parent;
      const saved = new Map();
      const remember = (o) => {
        if (!saved.has(o)) saved.set(o, { visible: o.visible, frustumCulled: o.frustumCulled });
      };
      for (const root of sceneApi.scene.children) {
        remember(root);
        root.visible = root === anchor;
      }
      for (let o = g; o && o !== sceneApi.scene; o = o.parent) {
        remember(o);
        o.visible = true;
      }
      g.traverse((o) => {
        remember(o);
        o.visible = true;
        if (o.isMesh || o.isLine || o.isLineSegments || o.isPoints || o.isSprite) {
          o.frustumCulled = false;
        }
      });

      const rt = new THREE.WebGLRenderTarget(64, 64);
      const prev = r.getRenderTarget();
      try {
        r.setRenderTarget(rt);
        r.render(sceneApi.scene, sceneApi.camera);
      } finally {
        r.setRenderTarget(prev);
        rt.dispose();
        for (const [o, old] of saved) {
          o.visible = old.visible;
          o.frustumCulled = old.frustumCulled;
        }
      }
    }
    if (!softwareRenderer) await drainGpu(r);
    else console.info('[journey-v6] software renderer — hidden GPU warm draws skipped');
    performance.mark('journey-gpu-ready');
    return true;
  }

  state.ready = prepareGpu();
  if (!deferActivation) state.activate();

  console.info(
    '[journey-v6] grey-box ready — %d chapters, p %s, scroll %dpx, route %s',
    CHAPTERS.length, journey.progress.toFixed(3), Math.round(scroll.total), location.hash || '(none)',
  );

  return state;
}
