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
import { createDirector } from './director.js';
import { createSeams } from './seams.js';
import { createLens } from './lens.js';
import { createUI } from './ui.js';
import { createInspire } from './chapters/inspire/index.js';
import { createConnect } from './chapters/connect/index.js';
import { createOwned } from './chapters/owned/index.js';
import { createFinal } from './chapters/final/index.js';
import { CONTENT } from '../content/content.js';
import {
  CHAPTERS, CHAPTER_IDS, chapterAt, restProgress, startOf,
} from './route.js';
import {
  HERO_INTRO_MS, DEEP_LINK_DETAIL_DELAY_MS,
  COPY_JUMP_LEAD, COPY_JUMP_TAIL_S, COPY_IN_K,
} from './constants.js';
import { STEADY, P as P_FLAG, POSE as POSE_FLAG, CAPTURE } from '../flags.js';

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ================================================================
   The nav jump's interpolation frame (see directJumpTo)
   ================================================================
   The organism stands ON the world Y axis — measured from the live scene:
   the stipe occupies x = z = 0, y 0..3.9, radius <= 0.69 (anatomy.js
   stemRadius), and the cap sits at y 2.43..4.37 out to r ~ 2.6 (anatomy.js
   rimRad / capUnderPt). So "around the mushroom" is nothing more exotic than
   cylindrical coordinates about that axis, and a camera move authored in
   them is geometry-safe by construction rather than by correction. */
const azOf = (v) => Math.atan2(v.x, v.z);
const radOf = (v) => Math.hypot(v.x, v.z);

/** Signed azimuth a -> b, always the short way round (|d| <= PI). Both inputs
 *  come from atan2, so their difference is within +/-2PI and one wrap fixes it. */
function azDelta(a, b) {
  const d = azOf(b) - azOf(a);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
}

/** The signed azimuth a -> b taken deliberately THE OTHER WAY: the same
 *  landing, reached by continuing in `turn`'s rotational sense instead of
 *  doubling back. |result| is then >= PI, and result - azDelta is exactly one
 *  whole turn, so a path built on it arrives at the identical pose. Only the
 *  loop's wrap asks for this (see WRAP_TURN in directJumpTo). */
function azTurn(a, b, turn) {
  const d = azDelta(a, b);
  if (turn > 0 && d < 0) return d + 2 * Math.PI;
  if (turn < 0 && d > 0) return d - 2 * Math.PI;
  return d;
}

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
function arcLerp(a, b, e, out, az1, bow, rise) {
  const rA = radOf(a), rB = radOf(b);
  const d = az1 === undefined || az1 === null ? azDelta(a, b) : az1;
  // A pose ON the axis has no azimuth of its own; borrow the other end's, so
  // the move degrades to a pure radial one instead of to NaN. No shipped
  // pose is nearer the axis than r = 0.5 (the Owned rest), but the camera is
  // free geometry and this costs one comparison.
  const az = rA < 1e-3 ? azOf(b) : rB < 1e-3 ? azOf(a) : azOf(a) + d * e;
  const swell = bow || rise ? Math.sin(Math.PI * e) : 0;
  const r = rA + (rB - rA) * e + (bow || 0) * swell;
  const y = a.y + (b.y - a.y) * e + (rise || 0) * swell;
  return out.set(Math.sin(az) * r, y, Math.cos(az) * r);
}

/** Length of that path — what a jump's duration is measured against. The
 *  swept arc is taken at the mean radius, which is exact for a pure orbit and
 *  within a few percent of the true spiral otherwise. */
function arcLength(a, b, az1) {
  const rA = radOf(a), rB = radOf(b);
  const d = az1 === undefined || az1 === null ? azDelta(a, b) : az1;
  return Math.hypot(Math.abs(d) * 0.5 * (rA + rB), rB - rA, b.y - a.y);
}

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

let started = false;

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
const CHAPTER_BUILDERS = {
  inspire: (s) => createInspire(s),
  connect: (s) => createConnect(s),
  owned: (s) => createOwned(s, CONTENT),
  final: (s) => createFinal(s),
};
const _preparedChapters = {};

/** Build the next not-yet-built chapter; returns how many remain. Idempotent
 *  per chapter and safe to interleave from racing loader chains. */
export function prepareChapter(sceneApi) {
  for (const id of Object.keys(CHAPTER_BUILDERS)) {
    if (!_preparedChapters[id]) {
      _preparedChapters[id] = CHAPTER_BUILDERS[id](sceneApi);
      break;
    }
  }
  return Object.keys(CHAPTER_BUILDERS).filter((id) => !_preparedChapters[id]).length;
}

export function boot(opts = {}) {
  if (started) return window.journey;
  started = true;

  const sceneApi = window.sceneApi;
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
  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    lens.setEnabled(!lens.enabled);
  });

  // One chapter per idle slice (prepareChapter below) when the loader had
  // time; anything not prebuilt lands here synchronously, so boot's contract
  // — chapters exist when it returns — is unchanged on every path.
  const chapters = {};
  for (const id of Object.keys(CHAPTER_BUILDERS)) {
    chapters[id] = _preparedChapters[id] || CHAPTER_BUILDERS[id](sceneApi);
  }

  const seams = createSeams({
    camera: sceneApi.camera,
    chapters,
    missionAz: director.heroPose.az,
  });

  let detailNode = null;      // currently open node id, or null

  // The scroll model reports nothing per-EVENT any more. It used to push the
  // raw surface position straight into journeyState on every wheel delta,
  // which only worked because state.js smoothed it afterwards; now that the
  // controller owns the displayed position, the per-frame read below is the
  // one and only path from scroll to state.
  const scroll = createScrollModel({
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
      if (camBlend && camBlend.wrapDir && dir === -camBlend.wrapDir) {
        steerWrapBlend(dir);
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
  const ui = createUI({
    onNav: (id) => navigateTo(id),
    onOpen: (nodeId, trigger) => openDetail(nodeId, trigger),
    onClose: () => closeDetail(),
    isDetailOpen: () => !!detailNode,
    // The chips pin DOM to world points, so they measure through the scene's
    // jitter-free lens rather than the raw one the renderer is mid-way through
    // perturbing (organism.js, STEADY PROJECTION).
    project: sceneApi.steadyProject,
  });

  // hotspot proxies, one per named node (GB-4.1)
  const NODE_CHAPTER = {};
  function registerHotspots(chapterId, ids, mod) {
    for (const id of ids) {
      NODE_CHAPTER[id] = chapterId;
      const label = (CONTENT.nodes[id] && CONTENT.nodes[id].label)
        || (CONTENT.contributors.find(c => c.id === id) || {}).role
        || id;
      const h = ui.addHotspot({
        id, chapter: chapterId, label,
        world: () => mod.nodeWorld(id),
        // Optional (2026-08-06, report A): the world radius of what this node
        // DRAWS, so its chip's hit target can be the node itself rather than
        // the label pill beside it. A chapter that does not implement
        // nodeRadius keeps the pill-only hit model unchanged.
        radius: typeof mod.nodeRadius === 'function' ? () => mod.nodeRadius(id) : undefined,
        // Optional (2026-08-16): a per-node scene gate. A chapter that
        // implements nodeReveal ties each chip's arrival to what the scene
        // draws for that node (Connect: each hub's own light landing) instead
        // of to the chapter's copy block; one that does not keeps the
        // copy-gated arrival unchanged.
        reveal: typeof mod.nodeReveal === 'function' ? () => mod.nodeReveal(id) : undefined,
        // Inspire's nodeReveal is also the light's complete opacity envelope,
        // so its labels mirror it rather than layering on the shared chip
        // threshold/ease. Other reveal chapters retain their shipped UI law.
        revealDirect: mod.revealDirect === true,
      });
      h.onHot = (on) => mod.setHot && mod.setHot(id, on);
    }
  }
  /** Scene-owned hover targets with no chip — see ui.addHoverZone. */
  function registerHoverZones(chapterId, mod) {
    if (typeof mod.hoverZones !== 'function') return;
    for (const z of mod.hoverZones()) {
      ui.addHoverZone({
        id: z.id, chapter: chapterId, world: z.world, radius: z.radius,
        onHot: (on) => mod.setHot && mod.setHot(z.id, on),
        // A zone that declares an `action` is a real control, not scenery:
        // ui.js builds it as a <button> and gives it the same trigger
        // contract the chapter's copy-level buttons use ({announce, busyMs}).
        // The chapter module is in hand here, so the call is direct rather
        // than going back out through window.journey.
        label: z.label,
        announce: z.announce,
        action: z.action && mod.trigger
          ? () => mod.trigger(z.action)
          : null,
      });
    }
  }
  // registration order = importance (ArtCompute -> Arca -> 2RP, per Plate II)
  // and still drives the tab order. WHEN each chip stands up moved to the
  // chapter's landing cascade (2026-08-16, the Connect precedent): nodeReveal
  // ties each label to its own lip ember, so the three arrive one at a time
  // in SCREEN order (Arca left, ArtCompute centre, 2RP right) as the embers
  // ignite — chapters/inspire/index.js 5c. The gate bound below is ui's eased
  // copy value, so ember + label land timed with the intro.
  registerHotspots('inspire', ['artcompute', 'arca', 'tworp'], {
    revealDirect: true,
    nodeWorld: (id) => chapters.inspire.nodeWorld(id),
    nodeReveal: (id) => chapters.inspire.nodeReveal(id),
    setHot: (id, on) => {
      const order = { artcompute: 0, arca: 1, tworp: 2 };
      chapters.inspire.setActive(on ? order[id] : -1);
    },
  });
  chapters.inspire.bindLandingGate(() => ui.copyEase('inspire'));
  registerHotspots('connect', chapters.connect.nodeIds, chapters.connect);
  registerHotspots('owned', chapters.owned.nodeIds, chapters.owned);
  for (const id of ['inspire', 'connect', 'owned', 'final']) {
    if (chapters[id]) registerHoverZones(id, chapters[id]);
  }

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

  let heroEntry = null;   // { t, lead, dur } while a jump is flying INTO the hero
  let heroGate = 1;       // the eased arrival term; 1 = the hero is ours to show
  /* ...AND A DEPARTURE TERM TO MATCH (2026-08-16 — Hannah, the up-wrap:
     "there's a similar flash when I scroll UP from the top section [to] the
     last section"). A jump AWAY from the hero snapped this furniture to
     opacity 0 on the click frame — p jumps to the destination, presence reads
     0, and the repaint below shipped it before the camera had moved an inch.
     The scrim is the heavy member of the set: a 0.55-alpha dark gradient over
     exactly the bottom-left where the ground web's brightest filaments live,
     so its one-frame removal UNVEILED them all at once and the grade's
     halation flared around the newly-hot cores (measured: bottom-left region
     +4.3/255 in one frame; pinning the furniture removes the flash entirely,
     +0.06). Departures were the one member of the a8d4518 family — fog
     (2026-08-09), grade (2026-08-13), chapter geometry — still stepping on
     the click frame. `heroExit` retires the furniture over the blend's
     opening beat instead: armed only by jumps (scroll-driven presence is
     pure in p and untouched), snapped by placements (dt === 0, so deep
     links, ?capture= and the goldens are bit-identical), and composed with
     max() so a lap steered back into the hero hands over cleanly. */
  let heroExit = null;    // { from, t, dur } while a jump is flying OUT of the hero
  let heroShown = 1;      // last painted value — the exit fades from what is actually up

  const heroPresence = (p) => 1 - smooth01((p - 0.006) / 0.05);

  /** The ONE place the hero furniture's visibility reaches the DOM. */
  function paintHeroFurniture(a) {
    heroShown = a;
    // A departing set leaves the hit tree on the CLICK frame, not at the 0.05
    // threshold — the fade is for the eye; a callout must not keep arming
    // region highlights while the lap lifts off through it.
    const inert = a < 0.05 || !!heroExit;
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

  /** Arm the arrival term for a jump. Called for EVERY jump: a jump to
   *  anywhere else has no hero arrival to time, so it simply clears the term
   *  (invisibly — presence is 0 at the destination the same tick).
   *
   *  The repaint is not optional. placeAt() has ALREADY run two dt = 0
   *  applyFrame passes by the time directJumpTo can call us, so the furniture
   *  is sitting at full opacity right now; leaving the correction to the next
   *  animator frame ships one rendered frame of exactly the flash this exists
   *  to remove. Same reasoning, same shape, as ui.js's armCopyEntry. */
  /** Arm the DEPARTURE term (see heroExit above). Called from directJumpTo
   *  BEFORE placeAt — the two dt = 0 placement passes inside placeAt are what
   *  used to ship the snap, so arming afterwards (in armHeroEntry, where the
   *  arrival is armed) is exactly one placement too late. `holdSnaps` lets
   *  the term survive those two passes and nothing else: a REAL placement
   *  (deep link, ?capture=, QA scrollTo) never has an exit armed, and one
   *  that lands mid-fade spends the two held snaps and then kills it, which
   *  is the snap a placement is owed. */
  function armHeroExit(wrap) {
    if (heroShown <= 0.05) return;
    // 0.35 s reads as a fade on the shortest jumps; the wrap's 4 s lap gets
    // 0.6 s so the furniture is gone before the camera swings through it.
    heroExit = { from: heroShown, t: 0, dur: wrap ? 0.6 : 0.35, holdSnaps: 2 };
  }

  function armHeroEntry(chapterId, blendDur) {
    if (chapterId !== 'mission') { heroEntry = null; heroGate = 1; }
    else {
      heroExit = null;
      const lead = blendDur * COPY_JUMP_LEAD;
      heroEntry = { t: 0, lead, dur: blendDur + COPY_JUMP_TAIL_S - lead, play: 1 };
      heroGate = 0;
    }
    // The departure repaint deliberately paints the UNCHANGED value (the click
    // frame moves nothing); the arrival repaint still snaps to 0 — see the
    // "repaint is not optional" note above.
    paintHeroFurniture(Math.max(heroPresence(journey.progress) * heroGate,
      heroExit ? heroExit.from : 0));
  }

  /** The visitor took the wheel: the arrival this was timed against is not
   *  coming. Only the AUTHORITY is dropped, never the value — the gate then
   *  relaxes back on COPY_IN_K below, so the furniture breathes in from
   *  wherever the envelope had reached instead of snapping. (The copy layer
   *  hands back to its scroll rule for the same reason; here there is no
   *  second rule to hand back to, so the relaxation is the handback.) */
  function cancelHeroEntry() { heroEntry = null; }

  /** A steered wrap (steerWrapBlend): the arrival term runs on the lap's own
   *  clock, so it reverses with the lap rather than being cancelled — the
   *  furniture backs out along the same curve it entered on, and the gate is
   *  shut again the frame the rewound lap lands. Same statement the copy
   *  layer makes in ui.setCopyEntryPlay. */
  function setHeroEntryPlay(play) { if (heroEntry) heroEntry.play = play < 0 ? -1 : 1; }

  /** One step of the departure term (see heroExit above): the current value
   *  eased to 0 over the blend's opening beat, 0 whenever no jump is leaving.
   *  Composed with the presence product via max() at the paint site, so a lap
   *  steered back into the hero (presence rising) takes over seamlessly. */
  function stepHeroExit(dt) {
    if (!heroExit) return 0;
    // The jump's own two placement passes are held (see armHeroExit); any
    // further dt === 0 is a real placement and snaps, exactly as the arrival
    // term does.
    if (dt === 0) {
      if (heroExit.holdSnaps > 0) { heroExit.holdSnaps--; return heroExit.from; }
      heroExit = null; return 0;
    }
    heroExit.t += dt;
    const f = clamp01(heroExit.t / heroExit.dur);
    const e = f * f * f * (f * (f * 6 - 15) + 10);   // the blend's own C2 ease
    const v = heroExit.from * (1 - e);
    if (f >= 1) heroExit = null;
    return v;
  }

  /** One step of the arrival term. */
  function stepHeroEntry(dt) {
    // A placement is not an arrival: a deep link, a ?capture= still or a QA
    // scrollTo must snap, exactly as the copy's entry dies on dt === 0.
    if (dt === 0) { heroEntry = null; heroGate = 1; return heroGate; }
    if (heroEntry) {
      heroEntry.t += dt * (heroEntry.play || 1);
      const f = clamp01((heroEntry.t - heroEntry.lead) / heroEntry.dur);
      heroGate = f * f * f * (f * (f * 6 - 15) + 10);   // the blend's own C2 ease
      if (heroEntry.t >= heroEntry.lead + heroEntry.dur) { heroEntry = null; heroGate = 1; }
      // ...or rewound past its own start (a steered wrap): the arrival is not
      // happening, so the gate is shut exactly as it was before the lap.
      else if (heroEntry.t <= 0) { heroEntry = null; heroGate = 0; }
    } else if (heroGate < 1) {
      heroGate += (1 - heroGate) * Math.min(1, dt * COPY_IN_K);
      if (heroGate > 0.999) heroGate = 1;
    }
    return heroGate;
  }

  // Explore CTA hands off into the journey (GB-1.1): one restrained flow
  // toward the cap, then the orbit. No reset, no reload.
  const cta = document.querySelector('.ui .cta');
  if (cta) cta.addEventListener('click', (e) => {
    e.preventDefault();
    if (!activated) {
      if (typeof opts.onEntry === 'function') opts.onEntry('inspire');
      return;
    }
    navigateTo('inspire');
  });

  /* ================================================================
     Routes (adr-d6-routes.md)
     ================================================================ */
  function normaliseNode(chapterId, nodeId) {
    if (!nodeId) return null;
    if (nodeId === '2rp') nodeId = 'tworp';
    if (nodeId === 'community') nodeId = 'discord';  // D16 ground restage: legacy deep links land

    const m = /^person-(\d+)$/.exec(nodeId);        // ADR spells the field person-N
    if (m) nodeId = `contributor-${m[1]}`;
    if (chapterId === 'final') return null;         // the epilogue has no detail state
    return nodeId;
  }

  function navigateTo(chapterId, wrap = 0) {
    closeDetail();
    directJumpTo(chapterId, wrap);
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
  let camBlend = null;
  /* A nav jump snaps global progress before its camera travels. A progress-
     authored chapter may opt into a LOCAL arrival with driveEntry(f), plus an
     optional entryReady()/entryDuration contract. Its clock starts only when
     the chapter says the travelling camera can actually show it and may finish
     after the camera lands. Keeping this separate from drive(p) preserves the
     placement contract: deep links, ?pose/?capture and QA scrollTo never
     receive a synthetic progress value. */
  let chapterEntry = null;
  /* A direct jump places journey progress at its destination before the
     camera starts travelling there. Most visual layers have their own blend
     contract for that disagreement; the rail only needs to preserve the
     visibility it had at departure until the camera and progress agree
     again. This flag starts before placeAt() because that function renders
     two synchronous destination-progress frames before camBlend exists. */
  let cameraStateDisagree = false;
  // Scratch for the live destination pose, read fresh every blend frame.
  const _dstPos = sceneApi.camera.position.clone();
  const _dstTgt = sceneApi.controls.target.clone();

  function directJumpTo(chapterId, wrap = 0) {
    const targetP = restProgress(chapterId);
    if (Math.abs(targetP - journey.progress) < 1e-4) return;
    // The rest this move DEPARTS — read before placeAt moves the state. Only
    // the wrap spends it: a rewound lap lands back on this rest
    // (steerWrapBlend / landWrapHome below).
    const fromP = journey.progress;
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
    camBlend = null;
    chapterEntry = null;
    // ...and a jump AWAY from the hero arms its furniture DEPARTURE here,
    // before placeAt's dt = 0 passes can snap the scrim off on the click
    // frame — the up-wrap flash (2026-08-16; see heroExit).
    if (chapterId !== 'mission') armHeroExit(!!wrap);
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
    // The snap is deferred to the landing (endCamBlend), which is the frame
    // the journey's state and the camera agree again. This is the WebGL half
    // of what ui.armCopyEntry already does for the copy layer.
    cameraStateDisagree = true;
    // Install before placeAt: its two synchronous dt=0 passes must see the
    // beginning of the entry, not one transient fully-arrived drive(p) state.
    const entryChapter = chapters[chapterId];
    chapterEntry = entryChapter && typeof entryChapter.driveEntry === 'function'
      ? { id: chapterId, f: 0, t: 0,
          dur: Math.max(0.001, Number(entryChapter.entryDuration) || 1) }
      : null;
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
    const len = arcLength(pos0, cam.position, az1);
    const dur = wrap
      ? 0.85 + 0.35 * Math.min(len / 20, 1) + WRAP_EXTRA_S * Math.min(len / 68, 1)
      : 0.85 + 0.35 * Math.min(len / 20, 1);
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
    camBlend = { t: 0, dur, play: 1, pos0, tgt0, fov0, fog, fogN0, fogF0, fogN1, fogF1,
      az1, bow, rise, look0, look1, look: { ...look1 },
      // The lap's reverse gear (wrap only): the scroll direction that asked
      // for this move, the rest it departed — where a rewound lap places the
      // journey when it gets back (steerWrapBlend / landWrapHome) — and the
      // destination pose's camera x, kept so a steer can re-announce the
      // chapters' blend contract with whichever end the lap now lands at.
      wrapDir: wrap, homeP: wrap ? restProgress(chapterAt(fromP).id) : 0,
      dstX: cam.position.x };
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
    setBlending(true, cam.position.x, dur);
    // The destination's copy is timed against THIS move, not against the click
    // (Hannah, 2026-08-07 — "the text for the new section INSTANTLY appears").
    // The duration is only knowable here, after placeAt has let the director
    // write the destination pose, which is why the hand-off is one call at the
    // end of the jump rather than a constant in ui.js. See the copy-entry
    // block there, and COPY_JUMP_LEAD / COPY_JUMP_COPY_TAIL_S.
    guarded('ui', () => ui.armCopyEntry(chapterId, dur));
    // ...and the hero's own furniture is timed against the same move, for the
    // same reason and on the same envelope. It is the third member of the
    // family a8d4518 (chapter geometry) and d1ecc23 (section copy) opened, and
    // the only one that had never been given a ticket.
    armHeroEntry(chapterId, dur);
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

  // Error isolation for the spine's own subsystem calls (M5). The organism's
  // frame loop already isolates whole animators, but everything below runs
  // INSIDE the one 'journey' animator — an exception in a single chapter's
  // drive() would otherwise disable scroll, nav and copy along with it.
  // guarded() latches per name: first throw logs the error once and disables
  // that subsystem; every later call is skipped; the rest of the frame runs.
  const deadSystems = new Set();
  function guarded(name, fn) {
    if (deadSystems.has(name)) return;
    try { fn(); }
    catch (err) {
      deadSystems.add(name);
      console.error(`[journey] '${name}' threw and was disabled — the ride continues without it:`, err);
    }
  }

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
       blend is also the delta that carries p across the 0.0008 ownership
       threshold, setOwned(true) ran first and captured `hero` from a camera
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
    if (camBlend && blendCancelled()) {
      if (camBlend.wrapDir && scroll.lastDir) {
        steerWrapBlend(scroll.lastDir);
        // The steering gesture is retired on the spot — the same retirement
        // the wrap gives the gesture that fires it — so the rest of the same
        // flick cannot re-enter this block, cancel the lap, or buy a wrap of
        // its own while the lap flies. (The onWrap steering path skips this:
        // the wrap block that calls it raises the wall itself.)
        scroll.retire(scroll.lastDir);
      } else dropCamBlend();
    }
    // A visible entry may deliberately outlive its camera flight. The first
    // real scroll after landing still owns the scene immediately: retire the
    // synthetic clock so this very frame goes back to the chapter's pure p
    // drive, just as dropCamBlend does while the flight is active.
    if (!camBlend && chapterEntry && blendCancelled()) chapterEntry = null;
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
    if (camBlend && !director.owned && p > 0.0008) {
      guarded('director', () => director.applyHeroPose());
    }
    const owned = p > 0.0008;
    director.setOwned(owned);
    if (owned) guarded('director', () => director.apply(p, dt));
    // ...and then the jump's blend composes onto that written pose. Not
    // guarded() by name: a latched-dead blend would strand `camBlend` and
    // leave the chapters detached for the rest of the session, so a throw
    // abandons the blend instead — the camera keeps the destination pose the
    // director just wrote, which is where the jump was going anyway.
    if (camBlend) {
      try { stepCamBlend(dt); }
      catch (err) {
        console.error('[journey] camera blend threw — the jump lands directly:', err);
        endCamBlend();
      }
    }

    guarded('seams', () => seams.update(p));
    /* Advance a navigation-only entry against what is actually visible, not
       against the camera flight's fraction. Connect is camera-gated: spending
       this clock while the gaze still hid the ground made its fronts finish in
       darkness and pop in fully lit at landing. A source pose that already
       looks down still starts at f=0 because the ticket was installed before
       placeAt; entryReady merely decides when frame time may begin accruing. */
    let finishChapterEntry = false;
    if (chapterEntry) {
      const entryMod = chapters[chapterEntry.id];
      let ready = !entryMod || typeof entryMod.entryReady !== 'function';
      if (entryMod && entryMod.entryReady) {
        guarded(`chapter:${chapterEntry.id}.entryReady`, () => {
          ready = !!entryMod.entryReady();
        });
      }
      if (ready) chapterEntry.t += Math.max(0, dt);
      const ef = Math.min(chapterEntry.t / chapterEntry.dur, 1);
      chapterEntry.f = ef * ef * ef * (ef * (ef * 6 - 15) + 10);
      finishChapterEntry = ef >= 1;
    }

    // Chapter-owned choreography (M4): any chapter exposing drive(p) runs it
    // here, after the seams have armed/retired it. Inspire's reveal drive
    // lives in chapters/inspire/index.js now — the spine knows no chapter's
    // internals. Each chapter is guarded individually: one broken chapter is
    // dropped, the others keep driving.
    for (const id in chapters) {
      const mod = chapters[id];
      if (chapterEntry && chapterEntry.id === id && mod.driveEntry) {
        guarded(`chapter:${id}.driveEntry`, () => mod.driveEntry(chapterEntry.f));
      } else if (mod.drive) guarded(`chapter:${id}.drive`, () => mod.drive(p));
      // ...and any chapter whose reveal is PACED by the camera (rather than
      // merely gated by it) is told whether this frame's motion is the
      // visitor's own hand or the machine's. A commit glide is the machine, in
      // the same sense a camera blend is, so a chapter that rate-limits its
      // reveal on a blend gets the chance to do the same here. Set every frame,
      // never on edges: there is no state to drift.
      if (mod.setGliding)
        guarded(`chapter:${id}.setGliding`, () => mod.setGliding(scroll.gliding));
    }
    if (finishChapterEntry) chapterEntry = null;

    // Optics (W5): ONE finishing language across the whole journey. The lens
    // owns the per-leg parameter curve; the journey supplies progress and the
    // active chapter's focal source for the halation focus hint (handoff:
    // active Inspire exit, ADOS knot, primary ownership nexus, and on the
    // Final leg the nearest lit ring member — the "selected fairy-ring
    // highlight", since the travelling front has no exposed world position).
    guarded('lens', () => {
      lens.update(p);
      let focus = null;
      // Focal-source handoff points: shortly (+0.02) after each chapter's range
      // begins, route-derived (M4; shipped values 0.40 / 0.62 / 0.87).
      if (p < startOf('connect') + 0.02) { if (chapters.inspire.armed) focus = chapters.inspire.activeWorld(); }
      else if (p < startOf('owned') + 0.02) { if (chapters.connect.armed) focus = chapters.connect.nodeWorld('ados'); }
      else if (p < startOf('final') + 0.02) { if (chapters.owned.armed) focus = chapters.owned.nodeWorld('pod-shared'); }
      else if (chapters.final.armed) {
        // the Final chapter owns its focal anatomy (M4): the travelling
        // growth front while it runs, else its own rest-member hint
        focus = chapters.final.focusWorld();
      }
      lens.setFocusHint(focus);
    });

    const ch = chapterAt(p);
    // Hero furniture releases as the journey leaves the Mission composition,
    // and comes back only once the camera has actually got here. PRESENCE x
    // ARRIVAL, one writer — see THE HERO FURNITURE block in boot(). max()ed
    // with the DEPARTURE term (heroExit): a jump out of the hero fades what
    // is up over the blend's opening beat instead of stepping it on the
    // click frame — the up-wrap scrim flash (2026-08-16).
    paintHeroFurniture(Math.max(heroPresence(p) * stepHeroEntry(dt), stepHeroExit(dt)));

    guarded('ui', () => ui.update(p, ch.id, sceneApi.camera, dt,
      { cameraStateDisagree }));

    /* THE RIDE WRITES NOTHING (2026-08-11, Hannah's brief). A chapter change
       used to replaceState `#/<chapter>` from right here, every time the
       scrub crossed a boundary — the visible symptom she reported, and the
       reason the address bar flickered through four routes on one wheel
       gesture. The crossing is still detected where it matters (ui.js's copy
       bands, seams.js, the rail's `chapterAt(p)`); it simply no longer has an
       opinion about the URL. Nothing replaces this block. */
  }

  /** Has manual input taken the camera back? Read once per frame, at the TOP
   *  of applyFrame — see the block there for why the answer must be acted on
   *  before the director decides ownership. */
  function blendCancelled() {
    /* THE GESTURE THAT BOUGHT THE MOVE IS NOT THE VISITOR CANCELLING IT
       (2026-08-14 — Hannah: "it still just jumps DIRECTLY when I scroll up
       from the top, or down from the bottom").

       Manual input drops the blend — and with it the arrival the copy was
       being timed against. Handing the copy back to the scroll rule here
       (rather than letting the envelope play out over a camera that is no
       longer travelling) is what keeps the two from fighting: the scroll
       rule picks the block up at exactly the opacity the envelope had
       reached, so there is no step and no second animation.

       That rule was written for a jump the visitor asks for with a CLICK,
       where any scroll afterwards is unambiguously them taking the camera
       back. A WRAP is asked for with the scroll itself, and it is armed from
       inside scroll.update() — one line before applyFrame() runs in the very
       same frame (see the tick order in boot()). `sinceInput` at that moment
       is the age of the wheel delta that just caused the wrap: measured on a
       real wheel-driven wrap, 1.3 ms forward and 7.1 ms back. So the test
       below fired on the blend's OWN FIRST FRAME and every wrap ran exactly
       ZERO blend frames — the camera stood where placeAt's director pass had
       put it, which is the destination. Measured before this change: the
       camera moved 14.6643 world units in ONE frame and did not move again
       for the next 5 s. A teleport, in both directions, on every wrap.

       Two passes missed it because both measured the wrap through
       `journey.wrap(dir)`, the QA hook — which is navigateTo() with no wheel
       event anywhere near it, so `sinceInput` is ~1e9 and the blend runs in
       full. Same call, same destination, traced side by side: the QA hook
       travels 76.42 units over 3.8 s across 178 frames; the wheel does 14.66
       units in one frame. `2c22844`'s authored 4 s lap and its frame strip
       were real — and unreachable by any visitor. The lesson is that a wrap
       must never be gated from a script that does not deliver the input that
       causes it.

       THE RULE IS NOW: a blend is cancelled by input the model ACTS ON.
       Input the model is currently refusing is not the visitor taking
       control — it is the gesture that asked for this move still finishing.
       `scroll.answeredAt` is exactly that refusal: the arrival wall, which
       the wrap raises at the end of its own placement (scroll.js) and which
       makes `carrying()` refuse every remaining delta of the same gesture.
       While it stands, the tail of the flick buys nothing and moves nothing,
       so cancelling on it could only strand the camera mid-lap.

       It comes down — and the camera goes back to the visitor — on exactly
       the three events that already mean "the visitor is asking for
       something new": an ARRIVAL_HOLD_MS (90 ms) pause, a reversal, or a
       placement (dropWall). Tying the camera hand-back to that same
       threshold is the point rather than a coincidence: the instant a
       visitor has earned another section is the instant they have earned the
       camera back.

       Safe for the click jump it was written for, whose contract is
       unchanged: directJumpTo -> placeAt -> setProgress -> newGesture ->
       dropWall, so the wall is DOWN on every frame of a click blend and the
       first stray delta still cancels it within one frame. (`answeredAt` can
       be 0 — the Mission anchor — so this must be a null test, never a
       truthiness test.) */
    return scroll.sinceInput < 50 && scroll.answeredAt === null;
  }

  /** Cancelled: end the blend and hand back everything it was carrying — the
   *  copy envelope to its scroll rule, the hero furniture's arrival term, and
   *  (inside endCamBlend) the camera itself. */
  function dropCamBlend() {
    endCamBlend(false);
    guarded('ui', () => ui.cancelCopyEntry());
    cancelHeroEntry();
  }

  /** Steer the wrap's lap to the scroll's own direction (see the block at the
   *  top of applyFrame). With the wrap: keep flying — a second same-way
   *  gesture is spent on the ride already under way, never answered with a
   *  teleport. Against it: the lap retraces its own path (stepCamBlend runs t
   *  backwards, so bow, rise and the authored turn all unwind exactly as they
   *  wound). Either caller retires the steering gesture — the applyFrame
   *  block via scroll.retire, the onWrap path via the wrap block's own wall —
   *  so the rest of the same flick buys nothing further. */
  function steerWrapBlend(dir) {
    const play = dir === camBlend.wrapDir ? 1 : -1;
    if (play === camBlend.play) return;
    camBlend.play = play;
    // The copy envelope and the hero furniture's arrival term were armed on
    // this lap's own frame and step by its same dt, so they reverse with it
    // and unwind to exactly the pre-wrap frame as the rewound lap lands.
    // Cancelling them here instead handed the copy to the scroll rule, which
    // reads a p the wrap parks at the DESTINATION — it painted the copy of
    // the section the camera was flying away from, and held it up through
    // the whole retrace (Hannah, 2026-08-16).
    guarded('ui', () => ui.setCopyEntryPlay(play));
    setHeroEntryPlay(play);
    /* AND THE CHAPTERS ARE TOLD THE MOVE'S NEW LANDING (2026-08-16 — Hannah:
       "weirdness with how the group mushrooms show... some kind of
       glitchiness in when and how that appears"). The Final chapter paces its
       whole reveal against the blend contract — destination pull, direction
       (retire vs arrive), and the move's remaining room (setBlending there).
       A steered lap changes all three: a down-wrap that rewinds is no longer
       a departure from the field, it is an arrival back INTO it, and left
       un-announced the driver kept retiring toward the hero's pull — with
       the monotone fade latch holding the chapter dark — while the camera
       flew back to a field that should have been relighting, and the whole
       thing popped on at the landing instead. Same re-announcement a jump
       overtaking a jump already makes; setBlending is written to be
       recomputed from the new arguments. */
    setBlending(true,
      play > 0 ? camBlend.dstX : camBlend.pos0.x,
      Math.max(0.05, play > 0 ? camBlend.dur - camBlend.t : camBlend.t));
  }

  /** A rewound lap has reached its own first frame: the camera stands where
   *  the wrap departed, so place the journey back on that rest and the two
   *  agree again — the same contract endCamBlend keeps for a landing, at the
   *  other end of the path. Runs at the TOP of spineFrame, never from inside
   *  stepCamBlend: placeAt composes a full frame at the home rest, and
   *  landing mid-applyFrame would let the remainder of that frame re-drive
   *  every reader at the stale destination p (exactly the mixed-frame class
   *  the frame-order block above applyFrame exists to rule out). */
  function landWrapHome() {
    const homeP = camBlend.homeP;
    camBlend = null;
    chapterEntry = null;
    cameraStateDisagree = false;
    guarded('lens', () => lens.setLookOverride(null));
    setBlending(false);
    /* Capture hygiene, same invariant restoreHero() guards for endCamBlend:
       placeAt is about to decide ownership, and setOwned(true) captures the
       hero composition from the LIVE camera — which, un-owned mid-rewind,
       holds the lap's first frame rather than the hero's pose. Re-assert the
       hero first (synchronous, placeAt overwrites it in the same tick, so
       nothing of it renders) so the capture can never bake a lap frame into
       `hero`. */
    if (!director.owned) guarded('director', () => director.restoreHero());
    placeAt(homeP);
    // The hero furniture cannot ride the reversed envelope home the way the
    // copy does: an up-wrap ARMS no entry (its destination is not the hero),
    // and presence is keyed to p, which the lap parked at the far end — so a
    // rewound lap would land on the hero with the callouts popping on at
    // full. A zero-length arm gives the landing the COPY_JUMP_TAIL_S breathe
    // the copy's own envelope already ends on; for a non-hero home it clears
    // the term, which is a no-op. (The copy needs nothing here: its envelope
    // unwound to exactly this frame, so placeAt's snap painted it already.)
    armHeroEntry(chapterAt(homeP).id, 0);
  }

  /** One step of the direct-jump camera blend. Runs INSIDE applyFrame, right
   *  after the director has written the destination pose and before anything
   *  reads the camera — see the frame-order block above applyFrame. State is
   *  already AT the destination; the camera glides straight from where it was
   *  onto that pose. A blend manual input has cancelled never reaches here:
   *  applyFrame drops it at the top of the frame. */
  function stepCamBlend(dt) {
    // Signed time: a steered wrap plays its lap backwards (play = -1) along
    // the identical path. Clamped at zero so this frame still composes the
    // lap's first pose; landWrapHome takes it from the top of the next frame.
    camBlend.t += dt * camBlend.play;
    if (camBlend.t < 0) camBlend.t = 0;
    const f = Math.min(camBlend.t / camBlend.dur, 1);
    const e = f * f * f * (f * (f * 6 - 15) + 10);   // smootherstep, C2 ends
    const cam = sceneApi.camera, ctl = sceneApi.controls;
    // The blend composes onto the DESTINATION pose read live from the
    // camera — valid only if something wrote that pose this frame. While
    // the director owns the camera (p past the hero band) its apply()
    // above did; at p = 0 the hero restore is a ONE-SHOT inside
    // setOwned(false), so on every later blend frame the camera still
    // holds the blend's own previous output — lerping toward it fed the
    // blend back into itself and parked the camera near the jump's
    // start pose plus the lift arc (the M4-found stuck camera:
    // end-hold -> Mission froze at ~(-15.9, 16.3, 2.6) fov 44).
    // Re-assert the completed restore first, so the blend lands ON it
    // and can never outlive or overwrite it. Composition order is
    // preserved: destination writer first, blend on top, blend ends.
    if (!director.owned) director.applyHeroPose();
    _dstPos.copy(cam.position);
    _dstTgt.copy(ctl.target);
    const fv = camBlend.fov0 * (1 - e) + cam.fov * e;
    arcLerp(camBlend.pos0, _dstPos, e, cam.position,
      camBlend.az1, camBlend.bow, camBlend.rise);
    ctl.target.lerpVectors(camBlend.tgt0, _dstTgt, e);
    // ONE pose travels. Re-aim from where the camera actually IS — without
    // this the frame keeps the destination's orientation over a start-pose
    // position, which is the whip described above. Same no-roll write the
    // director makes, so the composition order is unchanged: destination
    // writer first, blend on top, blend ends.
    cam.up.set(0, 1, 0);
    cam.lookAt(ctl.target);
    if (fv !== cam.fov) { cam.fov = fv; cam.updateProjectionMatrix(); }
    // ...and the depth of the world travels on the same ease (see directJumpTo).
    if (camBlend.fog) {
      camBlend.fog.near = camBlend.fogN0 + (camBlend.fogN1 - camBlend.fogN0) * e;
      camBlend.fog.far = camBlend.fogF0 + (camBlend.fogF1 - camBlend.fogF0) * e;
    }
    // ...and so does the grade. Written BEFORE lens.update(p) runs (it is
    // further down applyFrame), so the override is in place by the time the
    // lens reads it and there is never a frame of the destination's look on a
    // camera that has not arrived.
    for (const k in camBlend.look) {
      camBlend.look[k] = camBlend.look0[k] + (camBlend.look1[k] - camBlend.look0[k]) * e;
    }
    guarded('lens', () => lens.setLookOverride(camBlend.look));
    if (f >= 1) endCamBlend(true);
  }

  /** The blend is over — landed, cancelled, or abandoned. The camera and the
   *  journey's state agree again from here, so this is where the eased arming
   *  snap directJumpTo deferred happens. A naturally landed chapter entry may
   *  keep its own visible reveal clock; cancellation/placement clears it. */
  function endCamBlend(keepEntry = false) {
    camBlend = null;
    if (!keepEntry) chapterEntry = null;
    cameraStateDisagree = false;
    /* AND THE CAMERA GOES BACK TO THE POSE p IMPLIES (2026-08-14 — Hannah:
       "halfway through the loop I stop the scroll, the hero mushroom can end
       up displaced... and it stays permanently stuck").

       "The camera and the journey's state agree again from here" was true of
       the two endings this comment was written for. It was not true of the
       third. A blend that LANDS has just written the destination pose itself;
       a blend that is cancelled while the director OWNS the camera is
       corrected on the very next line of applyFrame, by director.apply(p) —
       measured on a real wheel-driven UP-wrap interrupted at
       400/1200/2000/3200 ms, the camera is on pose(0.97) within one frame and
       stays there, 0.0000 units of disagreement at all four. But a blend
       cancelled while the director is UN-OWNED — the down-wrap, whose
       destination is p = 0 — had no such writer. setOwned(false)'s restore is
       a one-shot that fired at the start of the lap, applyHeroPose() only ran
       from inside the blend, and the blend is what just stopped. So the camera
       simply stayed wherever the lap had reached: measured 16.11, 24.98, 22.29
       and 1.07 world units from the hero pose (fov out by 7.30, 5.73, 2.97 and
       0.14 deg) at those same four moments, and it never moved again — 5 s of
       trace past the cut, drift 0.0000 on every frame of every case. That is
       the "permanently", and the reason the state was one no scroll position
       described.

       It does not stop at the frame, either. The strand is what the NEXT
       setOwned(true) hands to captureHero(), so `hero` inherits it, and the
       wrap's own destination is `hero`: re-fired from the same page, the lap
       covered 7.97 / 22.84 / 53.77 / 75.67 units over 0.98 / 1.97 / 3.14 /
       3.88 s against the clean 76.43 units over 3.86 s. One interruption
       therefore un-does `e4df4b0` — "the wrap genuinely travels" — for the
       rest of the session, which is the loudest thing the strand costs and
       the reason this is not merely a framing blemish.

       The cure is to make the un-owned half do what the owned half already
       does, rather than to invent a third behaviour for it. p = 0's pose is
       the hero composition, so that is what gets written. Three candidates
       were weighed and this is the only one that keeps the model's contract
       that state is a pure function of scroll position: leaving the camera
       where it is and letting the next gesture take over from there makes the
       view a function of HISTORY (the same class of fault as the M4 stuck
       camera); refusing to be cancelled past some point of the lap would trade
       a bug for a 3.8 s lockout and break "manual input takes control back
       within a frame". A hard hand-back is a step — but it is the step every
       cancelled jump on this site has always made (§15's residual), and it is
       now the SAME step in both directions instead of a step in one and a
       stranding in the other.

       Ordering: this runs while `owned` still reflects the frame's p, before
       director.apply() would write anything, and the assertion is skipped when
       the director owns the camera precisely so it can never fight it. */
    if (!director.owned) guarded('director', () => director.restoreHero());
    // The grade goes back to being a pure function of p. The last override
    // written was look1 — lookOf(destination p) — so the hand-back is a no-op
    // by construction, exactly as the copy envelope's is (d1ecc23).
    guarded('lens', () => lens.setLookOverride(null));
    setBlending(false);
    snapChapters();
  }

  /** Tell every chapter that owns the distinction whether the journey's state
   *  and the camera currently DISAGREE — i.e. a jump has snapped the state to
   *  the destination while the camera is still travelling toward it. A chapter
   *  in that window may trust only its camera-pure terms. Optional: a chapter
   *  whose reveal is a product of camera-pure factors (Connect's
   *  `amount * resolve`, Inspire's `master(az) * arr(az)`) self-corrects on
   *  the first blend frame and does not implement this. */
  function setBlending(on, dstCamX, durS) {
    for (const id in chapters) {
      const mod = chapters[id];
      if (mod.setBlending)
        guarded(`chapter:${id}.setBlending`, () => mod.setBlending(on, dstCamX, durS));
    }
  }

  /** Jump every chapter's eased state to its target (the placeAt contract). */
  function snapChapters() {
    for (const id in chapters) {
      if (chapters[id].snap) guarded(`chapter:${id}.snap`, () => chapters[id].snap());
    }
  }

  function spineFrame(t, dt) {
    // A fully rewound wrap lands before anything else runs, so the whole
    // frame — scroll, state, readers — composes at the home rest (see
    // landWrapHome for why it must not happen mid-applyFrame).
    if (camBlend && camBlend.play < 0 && camBlend.t <= 0) landWrapHome();
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
   *  Mission camera. directJumpTo hands the snap to endCamBlend instead, so
   *  the landing frame is still exactly the placed one. */
  function placeAt(p, { detail = null, snap = true } = {}) {
    // A placement is already-arrived by definition. This also keeps a QA
    // placement issued during a flight deterministic rather than inheriting
    // that flight's synthetic chapter-entry position.
    if (snap) chapterEntry = null;
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
    get chapter() { return chapterAt(journey.progress).id; },
    get detail() { return detailNode; },
    /** Publish and enable the already-prepared journey. Safe to call once the
     *  startup readiness promise has resolved; idempotent for QA callers. */
    activate({ entry: activationEntry = null } = {}) {
      const first = !activated;
      activated = true;
      scroll.enabled = true;
      if (ui.rail && ui.rail.reveal) ui.rail.reveal();
      window.journey = state;
      if (first) {
        const target = activationEntry || queuedEntry;
        queuedEntry = null;
        if (target && target !== 'mission') navigateTo(target);
      }
      return state;
    },
    /** QA: jump progress with no travel and no replay. */
    scrollTo(p) { placeAt(clamp01(p)); return journey.progress; },
    /** QA: navigate to a chapter exactly as a nav click does (direct jump
     *  with the camera blend). The name predates the flight system's removal
     *  and is kept so existing QA scripts still run. */
    flyTo(id) { navigateTo(id); },
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
          if (result === gl.ALREADY_SIGNALED || result === gl.CONDITION_SATISFIED) return;
          if (result === gl.WAIT_FAILED) throw new Error('GPU readiness fence failed');
          if (performance.now() - startedAt > 8000) throw new Error('GPU readiness fence timed out');
          await new Promise(resolve => setTimeout(resolve, 8));
        }
      } finally {
        gl.deleteSync(sync);
      }
    }
    gl.finish();
  }

  async function prepareGpu() {
    const r = sceneApi.renderer;
    if (!r) throw new Error('No WebGL renderer for journey preparation');

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
    // are normally invisible or outside the hero camera's frustum.
    for (const id of Object.keys(chapters)) {
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
    await drainGpu(r);
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
