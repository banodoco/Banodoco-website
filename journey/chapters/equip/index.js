// chapters/equip/index.js — EQUIP.
//
// THE CHAPTER THAT BUILDS NOTHING, AND WHY THAT IS THE DESIGN.
//
// Every other runtime chapter brings a world with it: Inspire's plumes and
// exits, Connect's ground network, Owned's colony, Final's field. Equip brings
// none, and the absence is the point rather than an unfinished edge. Its
// subject is the specimen the visitor has been looking at for three chapters,
// seen from underneath for the first time — the stalk that carries everything
// up, and the gills the spores leave from. Adding geometry there would put
// something between the camera and the two things the chapter exists to show.
//
// So what this module owns is small and exact:
//
//   · TWO HOTSPOTS on the organism's own anatomy, declared through the
//     `visibility` capability. They are placed in the SWAY group's local frame
//     and transformed per call, so they ride the breeze with the specimen
//     instead of sitting on a fixed world point the mushroom leans away from.
//   · THE ARRIVAL RIPPLE. The organism already answers a touch with a wave of
//     brightness travelling out through the mycelium (organism/shaders.js
//     PULSE_GLSL, driven by the 'tap-pulse' animator). This chapter speaks the
//     same language rather than inventing a second one: arriving at the rest
//     rings the STALK, and one beat later the GILLS, and hovering either
//     hotspot rings that one again. Nothing new is drawn; the specimen simply
//     answers, in the vocabulary a visitor who has tapped it already knows.
//   · NOTHING ELSE. There is no `interaction` capability (no hover zone, no
//     committed action) and no scene state to snap, which is why `counts`
//     reports what was registered rather than what was built.
//
// The camera leg — the arc around and in under the cap, and the rest pose it
// settles on — is chapters/equip/camera.js.
import * as THREE from 'three';
import { FIXED_HOTSPOTS } from '../../structure.js';

/* ------------------------------------------------------------------ */
/* The two anatomical anchors                                          */
/* ------------------------------------------------------------------ */
// Both are authored in the SWAY group's local frame — the frame the cap and
// the stipe are both children of — so `localToWorld` returns the point the
// specimen is actually at this frame, breeze and tap-ringdown included. A
// world literal would have been correct only in a still frame.
//
// STALK. On the stipe's axis, in the clear band of column between the cap's
// underside and the copy block. The stipe occupies y 0..3.91 with radius <= 0.69
// (measured on the live scene), and the geometric middle of that is 1.95 — which
// is where this anchor started and where it does not work: measured at the rest,
// 1440x900, world (0, 1.95, 0) projects to (715, 669) against a copy block whose
// padded box is x 67..723, y 630..814, so the chip landed INSIDE it and
// ui/hotspot-frame.js suppressed the label outright. (That suppression is
// correct and is not something to route around — the chapter's copy owns its
// area of the frame — but a chip that is always suppressed is a chip that does
// not exist.) 2.30 clears the block's top edge by 21 px at the rest and reads as
// the same thing: bare stipe, well below the throat, well above the root flare.
//
// The anchor is on the AXIS rather than on the near surface because the camera
// orbits it: a surface point would swing across the column as the arc comes
// round, and the chip would appear to slide off the thing it names.
const STALK_LOCAL = new THREE.Vector3(0, 2.30, 0);

// GILLS. On the cap's underside, out along the view-right axis of the Equip
// rest so the two chips separate across the frame instead of stacking on the
// stipe. Radius 1.60 against a rim radius of ~2.35 puts it two thirds of the
// way out the gill fan — past the throat's crowded hub, inside the margin's
// droop. Its height is the gill surface at that radius (anatomy.js
// capUnderPt: CAP_Y 3.15 plus the skirt's own shallow rise), not the rim line.
const GILL_LOCAL = new THREE.Vector3(-1.504, 3.15, 0.547);

/* ------------------------------------------------------------------ */
/* The arrival ripple                                                  */
/* ------------------------------------------------------------------ */
// THE TWO BEATS ARE AUTHORED IN SECONDS, and the gate that starts them is
// dimensionless. That split is deliberate and it is the conversion this file
// declares (CONTRIBUTING.md §5): the ARRIVAL GATE decides WHEN the sequence may
// begin — it is the chapter's own eased copy opacity while scrolling and the
// nav entry's 0..1 clock while flying, both of which mean "how far this arrival
// has come" and neither of which is a duration — and the GAP between the two
// rings is a wall-clock interval, because what it buys is a viewer reading one
// ring before the next one starts. Priced in gate units it would have run at
// whatever rate the wheel happened to turn.
const RIPPLE_GATE_ON = 0.30;    // arrival gate at which the stalk rings
const RIPPLE_GAP_S = 0.75;      // seconds from the stalk ring to the gills ring
// A ring may not be re-triggered faster than this. The wave itself decays over
// about 8 s (organism.js's 'tap-pulse' parks pulseT there) and there is exactly
// ONE wave in the shader, so a hover that re-armed on every enter would let a
// wobbling pointer restart the same ring forever and it would read as a strobe
// rather than as an answer.
const RIPPLE_REARM_S = 1.10;
// Wave profiles, in the shader's own three numbers: (speed, range falloff,
// amplitude) — uPulseP, organism/shaders.js. The STALK borrows the hero's
// BODY-hit profile verbatim (organism.js: "slow, short-range, gentle"), because
// a hotspot on the stipe is the same event as a finger on the stipe and a
// second dialect of the same answer is the thing this chapter exists not to
// invent. The GILLS answer in the same family, one notch quieter: the same slow
// speed, a shorter reach because the margin is thin flesh with no web under it,
// and 0.85 of the amplitude — the second point of interest is deliberately the
// softer of the two ("softly activated", the brief's own word).
const RIPPLE_STALK = [1.4, 1.5, 1.2];
const RIPPLE_GILLS = [1.5, 1.9, 0.85];

export function createEquip(sceneApi) {
  const group = new THREE.Group();
  group.name = 'equip';
  // Declared and parented like every other chapter root even though nothing is
  // ever added to it. A chapter whose `group` were a detached object would be
  // the one chapter the scene graph could not account for, and the contract's
  // "never null" would be satisfied by an object that is not in the scene.
  sceneApi.scene.add(group);

  const swayGroup = sceneApi.groups.sway;
  const camera = sceneApi.camera;
  const _w = new THREE.Vector3();

  function worldOf(local) {
    _w.copy(local);
    return swayGroup ? swayGroup.localToWorld(_w) : _w;
  }

  const NODES = FIXED_HOTSPOTS.equip;          // ['quark', 'brotchen']
  const LOCAL_OF = { quark: STALK_LOCAL, brotchen: GILL_LOCAL };
  const PROFILE_OF = { quark: RIPPLE_STALK, brotchen: RIPPLE_GILLS };

  let armed = false;
  // NOT `blending`. tools/render-report-lib.mjs's material-flag census greps
  // `\bblending\s*[:=]` across the source, and a local of that name lands two
  // non-material sites in a count that exists to notice a THREE material flag
  // appearing or vanishing. The lifecycle member keeps its declared name;
  // only the local it writes is spelled for what it means.
  let blendOwned = false;
  let gliding = false;
  let copyEase = () => 0;
  let hot = null;
  let selected = null;

  // The arrival ladder. `stage` counts rings already spent (0 = none, 1 = the
  // stalk has rung, 2 = both). THE CLOCK IS READ, NOT ACCUMULATED: neither
  // `drive` nor `driveEntry` is handed a dt (frame-application.js passes p and
  // the entry fraction and nothing else), so the gap between the two rings is
  // measured off the wall clock the wave itself already runs on rather than
  // off a dt this seat does not receive.
  let stage = 0;
  let stalkRangAt = -Infinity;
  let lastRingAt = -Infinity;

  const seconds = () => performance.now() / 1000;

  function ring(id) {
    const now = seconds();
    if (now - lastRingAt < RIPPLE_REARM_S) return false;
    const local = LOCAL_OF[id];
    if (!local || typeof sceneApi.pulseFrom !== 'function') return false;
    lastRingAt = now;
    sceneApi.pulseFrom(worldOf(local), PROFILE_OF[id]);
    return true;
  }

  /** Advance the arrival ladder against one dimensionless gate. Called from
   *  both drive() (scrolled arrival, gate = the copy ease) and driveEntry()
   *  (nav landing, gate = the entry clock) so the two arrivals ring
   *  identically — the whole reason the gate is a parameter. */
  function advanceIntro(gate) {
    if (!armed || blendOwned) return;
    if (gate < RIPPLE_GATE_ON * 0.5) {
      // Left the arrival: re-arm so coming back rings again. Half the onset,
      // not the onset itself, so a gate hovering on the threshold cannot
      // ring-reset-ring.
      stage = 0;
      return;
    }
    if (stage === 0) {
      if (gate < RIPPLE_GATE_ON) return;
      stage = 1;
      stalkRangAt = seconds();
      ring('quark');
      return;
    }
    if (stage === 1 && seconds() - stalkRangAt >= RIPPLE_GAP_S) {
      // The second ring is allowed to wait out the re-arm interval rather than
      // being dropped: an arrival that spent its first ring is still
      // mid-introduction, and losing the gills beat would leave the chapter
      // introducing one of its two subjects.
      if (ring('brotchen')) stage = 2;
    }
  }

  return {
    /* ---- core (journey/chapter-contract.js) ---- */
    id: 'equip',
    group,
    counts: { nodes: NODES.length, meshes: 0 },
    setArmed(on) {
      on = !!on;
      if (on === armed) return;
      armed = on;
      if (!on) stage = 0;
    },
    get armed() { return armed; },

    /** The dt = 0 PLACEMENT settle. A deep link, a capture or a QA scrollTo
     *  must render the chapter's finished state in one frame, and the finished
     *  state of the arrival ladder is "both rings already spent" — NOT "ring
     *  twice right now". Firing here would put a travelling wave into a frame
     *  that is supposed to be still, and every capture of this pose would catch
     *  the wave at whatever radius the frozen clock happened to hold. */
    snap() { stage = 2; stalkRangAt = -Infinity; },

    /** NO LANDING SETTLE, AND IT MUST STAY null.
     *
     *  snapChapterLandings (chapter-entry.js) runs at EVERY camera landing. If
     *  this settled the ladder it would spend both rings the instant the camera
     *  stopped — which is exactly the state beginEntry() zeroes so the rings
     *  can play AFTER the arrival, in their authored order, with the gap
     *  between them a viewer can read. The introduction would die on every nav
     *  landing and no capture could see it, because captures are taken at
     *  dt = 0 with the ladder already settled by snap() above. */
    snapLanding: null,

    /* ---- the duck-typed entry/drive lifecycle (chapter-entry.js,
       frame-application.js — deliberately outside the declared contract) ---- */

    /** Scrolled arrival. The gate is the chapter's own eased copy opacity,
     *  which is already the site's answer to "has the camera settled here":
     *  copy-arrival.js holds it down while |dp/dt| is high and breathes it in
     *  once the ride is inside COPY_SETTLE_LO. Gating the rings on it means the
     *  ripple cannot fire past a scrubbing finger. */
    drive() { advanceIntro(copyEase()); },

    /** A nav landing replays the introduction from the top. */
    beginEntry() { stage = 0; },
    /** The nav entry's own 0..1 clock, smootherstepped by frame-application. */
    driveEntry(f) { advanceIntro(f); },
    /** CAMERA-PURE, and it has to be: the entry clock must not start while the
     *  flight is still out at Inspire's radius, or the stalk would ring into a
     *  frame the stipe is barely in. "Under the cap" is a place, and the two
     *  numbers below say so without naming a chapter or reading p — the eye is
     *  inside 8.0 of the stipe axis (the Inspire rest stands at 11.0 and the
     *  Connect rest at 9.01, so neither neighbour's rest can satisfy it) and
     *  below 2.6, under the lowest cap geometry at 2.47. Both hold across the
     *  portrait fold at 744x1133 and 430x932 — checked, because journey/
     *  portrait.js's dolly is what could have lifted the eye back out. */
    entryReady() {
      const p = camera.position;
      return Math.hypot(p.x, p.z) < 8.0 && p.y < 2.6;
    },
    /** Seconds. Long enough to carry both rings and the gap between them with
     *  room after the second, so the entry does not finish mid-answer. */
    entryDuration: 2.2,
    /** A camera blend owns the frame; the ripple waits for it. */
    setBlending(on) { blendOwned = !!on; },
    setGliding(on) { gliding = !!on; },
    get gliding() { return gliding; },

    /* ---- capabilities ---- */

    /** The lens focal source. journey.js's pickChapterFocus asks the armed
     *  chapter that owns the frame, and from p 0.28 that is this one; without
     *  it the grade would lose its focal hint for the whole leg. The hovered
     *  node when there is one, the stalk otherwise — the stalk is the column
     *  the composition is built around. */
    focus: {
      world() { return worldOf(LOCAL_OF[hot] || STALK_LOCAL).clone(); },
    },

    interaction: null,

    selection: {
      /** HOVER / FOCUS / TOUCH-ARM, all three through `hot` (ui/hot-state.js
       *  unions them before this is called). The ring on entry is the whole
       *  "softly activated in the same hotspot family" behaviour: the specimen
       *  answers where the pointer is, in the wave language it already speaks.
       *  The release is unconditional — any OFF clears — matching Inspire's
       *  own setHot rather than the guarded form Owned uses. */
      setHot(id, on) {
        if (on) {
          hot = id;
          if (armed && !blendOwned) ring(id);
        } else if (hot === id) hot = null;
        else hot = on ? id : hot;
      },
      setSelected(id, on) { selected = on ? id : (selected === id ? null : selected); },
    },

    visibility: {
      /** Registration order is tab order and label stagger, authored once in
       *  structure.js. Spread, not the frozen export: structure.js deep-freezes
       *  FIXED_HOTSPOTS and a registrar must not be handed an array it might
       *  sort. */
      nodeIds: [...NODES],
      nodeWorld(id) { return worldOf(LOCAL_OF[id] || STALK_LOCAL).clone(); },
      /** NO SCENE REVEAL, deliberately — and this is what makes the brief's
       *  "interactive only once the camera settles" true without a second
       *  clock. With `nodeReveal` null the frame falls back to the chapter's
       *  eased copy opacity (ui/hotspot-frame.js: `gate = h.reveal ? ... :
       *  copyGate`), which is already held down through travel and released on
       *  settle; `h.a` then gates opacity, pointer-events AND the hit pad
       *  together, so pointer and keyboard cannot disagree about when the
       *  preview becomes reachable. Connect declares a reveal because its
       *  labels name an event the visitor is watching mid-scrub; Equip's two
       *  name a resting composition, which is exactly the case the copy gate
       *  exists for. It must reach addHotspot as `undefined`, never as a
       *  function. */
      nodeReveal: null,
      nodeRadius: null,
      labelPolicy: null,
      /** The flag lives here because it describes THIS chapter: two chips that
       *  form with the copy on a beat stagger rather than waiting out Connect's
       *  0.72 arrival floor. */
      revealDirect: true,
      revealScrub: false,
      setExcludedNodes: null,
      /** What this receives is `() => ui.copyEase('equip')` — the arrival gate
       *  drive() reads above. */
      bindCopyEase(fn) { copyEase = typeof fn === 'function' ? fn : (() => 0); },
    },

    /* ---- QA surface (unknown root keys are deliberately allowed) ---- */
    get introStage() { return stage; },
    get hot() { return hot; },
    get selected() { return selected; },
    nodeWorldLocal: LOCAL_OF,
  };
}
