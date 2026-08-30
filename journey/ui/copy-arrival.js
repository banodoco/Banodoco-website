/* ==================================================================== *
 * journey/ui/copy-arrival.js — the copy choreography and the arrival
 * envelope: WHEN a chapter's DOM copy is visible, and how it hands over
 * during a direct navigation. (Order U04.)
 *
 * The COPY_BANDS say WHERE copy may live; this module decides WHEN.
 *
 * ---------------------------------------------------------------------
 * THE MACHINE (G3 — states, events, and which binding encodes the mode)
 * ---------------------------------------------------------------------
 *
 * There are two machines here and they are deliberately separate, because
 * they are driven by different clocks and can overlap.
 *
 * 1. THE DIRECT-NAVIGATION TICKET.  Mode binding: `nav`.
 *
 *      states   null  ->  { kind: 'flying' }  ->  { kind: 'carrying' }  ->  null
 *      events   a wrap lap begins            (railWrap)
 *               a new camera flight begins   (railFlight !== the held ticket)
 *               the flight ends              (railFlight gone)
 *               the scroll rule catches the carried floor, or the visitor
 *               travels away from the landing coordinate
 *
 *    `flying` holds the ticket, the chapter it is flying to, the visual
 *    departure snapshot and its slower chapter-owned landing gate.
 *    `carrying` holds the completed visual floor while that gate catches up,
 *    at the coordinate where both are valid. THE TWO ARE ONE MODE, NOT TWO
 *    VARIABLES: this shipped as
 *    four correlated bindings (`directCopyFlight`, `directCopyId`,
 *    `directCopyFrom`, `directCopyCarry`) that were written together in every
 *    arm and read as a unit, which is the `card-tier.js` correlated-boolean
 *    smell G3 names — with the difference that here the states are genuinely
 *    exclusive, so collapsing them is a rename and not a semantic rewrite.
 *    Every write to `nav` is in `advanceNavTicket`, which is the whole
 *    transition and nothing else.
 *
 * 2. THE JUMP-ENTRY ENVELOPE.  Mode binding: `arrive`.
 *
 *      states   null -> preparing -> flight -> null
 *                              \-> { own: false } -> null
 *      events   prepare/arm(id, blendDur) — a cyclic wrap starts
 *               live wrap ticket gone     — the reached endpoint has settled
 *               cancel()                  — another authority took over
 *               setPlay(±1)               — direction changes without repaint
 *               end                       — spent, abandoned or overtaken
 *
 *    `phase` is the state, and `own` is the opacity authority. During
 *    `flight`, all chapter copy converges to zero and direction changes do
 *    crossfades the two real endpoints directly from camera phase. An
 *    envelope that has been disowned still exists (its inner keyframes are
 *    left to finish) but no longer drives `eased`.
 *
 * A THIRD, SMALLER ONE: the hero's arrival shelf (`heroShelf`), a
 * progress-derived floor that lets Mission's copy arrive with the rail's
 * section strip. All of its writes are in `advanceHeroShelf`.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS MODULE DOES NOT READ
 * ---------------------------------------------------------------------
 * `step()` is handed its frame — `{ chapterId, dt, travelP, railWrap,
 * railFlight }` — rather than reaching for ambient state. That is the U04
 * requirement in Amendment 2 and it is also what makes the module testable:
 * every input to a frame is an argument, and the only things held across
 * frames are the three mode bindings above plus the eased opacities.
 *
 * S-1 APPLIES HERE: the production frame loop swallows throws, so a fault in
 * this module is silent permanent state loss rather than a visible error.
 * Nothing below may throw on a frame path; the two derivations that DO throw
 * are at module scope, where an import-time failure is loud.
 * ==================================================================== */

import { JOURNEY_SCHEMA } from '../structure.js';
import { bandOpacity, clamp01, smoothA } from './bands.js';
import { createArrivalMotion } from './arrival-motion.js';
import {
  COPY_BANDS,
  COPY_OUT_K, COPY_IN_K, COPY_SETTLE_LO, COPY_SETTLE_HI,
  COPY_TRAVEL_LO, COPY_TRAVEL_HI,
  COPY_JUMP_LEAD, COPY_JUMP_COPY_TAIL_S,
} from '../constants.js';
/* Direct from the copy domain rather than through the facade, which is the
   edge HOTSPOT_ARRIVAL already takes: journey/constants.js re-exports the
   names that predate the F01 split, and a performance tempo authored after
   it does not need a second spelling to be found. */
import { HERO_COPY_ARRIVAL_S } from '../constants/copy.js';

/** chapter id -> its declared `copySurface`. The manifest is the one place
 *  that says where a chapter's copy lives; this file asks it instead of
 *  testing ids. */
export const COPY_SURFACES = Object.fromEntries(
  JOURNEY_SCHEMA.chapters.map(({ id, copySurface }) => [id, copySurface]));

/** The one chapter whose copy is the hero's OWN DOM. Derived rather than
 *  declared twice: a second literal naming Mission is a second place to
 *  forget. Throws at import if the table ever carries none or more than one,
 *  because a journey with no hero surface has nothing to fade and one with
 *  two has a silent winner. (The pattern, and this comment's shape, are
 *  `content/connect-nodes.js`'s `CONNECT_FOCAL_ID` — copied deliberately so
 *  the two read as one idiom.) */
export const HERO_CHAPTER_ID = (() => {
  const hero = Object.keys(COPY_SURFACES).filter((id) => COPY_SURFACES[id].host === 'hero');
  if (hero.length !== 1) {
    throw new Error(`[copy surfaces] exactly one chapter must be hero-hosted; found ${hero.length}`);
  }
  return hero[0];
})();

/* A DEFERRED surface is painted after the per-chapter loop, once the rail has
   returned the gate derived from the very docking coordinate it painted this
   frame. Exactly one chapter defers today and it is the hero's, which is not
   a coincidence — the gate comes from `rail.setHeroEase`, so a second
   deferred chapter would have nowhere to get one. Asserted rather than
   assumed: a loop over a set this code cannot actually generalise over would
   be the wrapper cheat in another coat (D152), so the invariant is checked at
   import and the trailing paint is written as what it is. */
const DEFERRED_IDS = Object.keys(COPY_SURFACES).filter((id) => COPY_SURFACES[id].deferred);
if (DEFERRED_IDS.length !== 1 || DEFERRED_IDS[0] !== HERO_CHAPTER_ID) {
  throw new Error('[copy surfaces] the only deferred copy surface must be the hero '
    + `chapter; found [${DEFERRED_IDS.join(', ')}] against hero '${HERO_CHAPTER_ID}'`);
}

/* Every button-led camera move uses one balanced crossfade: departure over
   the opening third, arrival over the closing third. Because both sides read
   the same presented camera phase, a slower route automatically gives both
   sides the same slower breath instead of keeping a short wall-clock pop. */
const NAV_COPY_FADE_PHASE = 0.32;

/* Visual copy may complete with the camera without forcing chapter-owned
   landing cascades to complete in flight. This is the chapter gate's ceiling;
   after landing it keeps breathing to one on COPY_IN_K while the already-
   visible words remain steady. */
const FLIGHT_ENVELOPES = {
  standard: { onset: 0.76, land: 0.38 },
  hero: { onset: 0.64, land: 0.74 },
};

export function createCopyArrival({ blocks, actionRows, heroBlock, rail, reduceMotion }) {
  /* ---------------- the eased opacities ---------------- */
  // Copy releases the moment travel begins (fast temporal fade driven by
  // scrub speed, even inside its own band) and re-anchors only once the
  // camera has settled — a slow breathe-in gated on |dp/dt|, so a fast pass
  // through a rest never flashes its copy, and a deliberate arrival gets its
  // text only after the composition has made its negative space. dt === 0
  // (deep-link placement / hidden-tab capture) snaps straight to the target
  // so captures are deterministic.
  const eased = { [HERO_CHAPTER_ID]: 0 };
  for (const id in COPY_BANDS) eased[id] = 0;
  let lastP = null;
  let pSpeed = 0;             // smoothed |dp/dt|, p per second

  /* ---------------- the nav-jump copy entry (Hannah, 2026-08-07) ----------
     Route progress still snaps in one dt = 0 tick, but journey.js now passes
     the camera flight's continuously presented progress as `travelP`, so the
     ordinary scroll speed/settle rule below sees the flight. The dedicated
     arrival envelope remains responsible for the cyclic wrap, whose hidden
     seam has no honest continuous `travelP`. The wrap ticket's camera phase
     is its clock: source and destination use equal opening/closing thirds.

     The fix is NOT a second opacity channel laid over the first. Two writers
     on one style is exactly how a jump ends up leaving a block half-faded by
     the scroll rule, so the envelope below drives `eased` ITSELF and is
     defined to finish at the same value the scroll rule was heading for. When
     it lets go, `eased[id]` has met its resting target, so the scroll rule
     resumes on the next frame with nothing to correct or re-animate.

     `easedPrev` is what makes the OUTGOING copy behave too. placeAt() runs a
     dt = 0 frame before journey.js can tell us anything, and dt = 0 means
     "snap" — correctly, for a deep link or a capture. arm() undoes that one
     snap by restoring the last TRAVELLED frame's values, which leaves the
     chapter we are leaving at the opacity it actually had. Once armed, every
     button-led narrative surfaces now read the camera-phase crossfade, so the
     source and destination spend equal portions of the same journey. */
  const easedPrev = { ...eased };
  // A wrap's duration is known only after its synchronous placeAt(), but its
  // transition must own those dt=0 frames too. This is the prepared state:
  // the visible departure snapshot plus an unpriced envelope installed before
  // placement. armCopyEntry() prices that same envelope afterwards.
  let preparedEntry = null;
  let arrive = null;   // { id, phase, t, lead, dur, own, holdSnaps, motions }
  const arrivalMotion = createArrivalMotion({ blocks, reduceMotion });

  /** The direct-navigation ticket. `null`, or a `flying` visual crossfade with
   *  its independent chapter gate, or a `carrying` landing floor while that
   *  gate catches up. See the machine note at the top of the file;
   *  `advanceNavTicket` owns every write. */
  let nav = null;
  let copyFrameDebug = null;
  let heroGatePrev = null;
  let heroShelf = 0;
  /** The intro copy's last PAINTED opacity, and the whole state the
   *  performed floor needs. `null` means nothing has been painted yet, which
   *  is a snap. Written only by `performHeroArrival`. */
  let heroPaintPrev = null;

  /** The ticket only while it is in the air. Reads as `directCopyFlight` did:
   *  null whenever a flight is not the current mode. */
  const flying = () => (nav && nav.kind === 'flying' ? nav : null);
  const gateEase = (id) => {
    const value = eased[id] || 0;
    return nav && nav.id === id && Number.isFinite(nav.gate) ? nav.gate : value;
  };

  /** Is an owned entry envelope the authority on the HERO's copy this frame?
   *  Both of report #31's rules turn on this one question and each asks it at
   *  a different point in the frame — once before the envelope's clock
   *  advances (and may retire), once after — so it is a question, not a
   *  binding. `arrive` has exactly one arm site and it is the wrap's
   *  (journey.js's `if (wrap) ui.armCopyEntry(...)`), so scroll and click
   *  arrivals answer `false` here by construction rather than by test. */
  const heroEnvelopeLive = () =>
    !!arrive && arrive.own && arrive.id === HERO_CHAPTER_ID;

  /* ---------------- painting ---------------- */

  /* The block envelope already owns copy opacity. Giving the heading, body
     and action row their own opacity keyframes multiplies two fades together:
     on mobile the authored rise is almost over before the product becomes
     visible, so the words read as a late pop. Keep one opacity authority and
     drive only the child rise here, from the SAME capped scene clock as the
     envelope/camera. Paused WAAPI effects are a compact way to retain the
     authored easing without allowing CSS wall time to run ahead during a
     first-draw stall. The pseudo-element's quiet bed-light remains CSS-owned;
     it carries no text and cannot mask the choreography. */
  function startArriveMotion(a) {
    arrivalMotion.start(a);
  }

  function syncArriveMotion(a) {
    arrivalMotion.sync(a);
  }

  function clearArriveMotion(a) {
    arrivalMotion.clear(a);
  }

  /** Keep the chapter copy's quiet line-rise on the same reversible value as
   *  its scroll-authored block opacity. This is deliberately not an animation
   *  clock: a stopped, reversed or interrupted journey freezes/retraces these
   *  transforms with the opacity that is already on screen. The lead fractions
   *  are the existing `.j-arrive` order (heading, sub, action); opacity remains
   *  owned only by the block envelope, so the fades are never multiplied. */
  const copyRiseNodes = new WeakMap();
  function paintCopyRise(block, s) {
    let stages = copyRiseNodes.get(block);
    if (!stages) {
      stages = [
        [block.querySelector('.j-h'), 0.12],
        [block.querySelector('.j-sub'), 0.26],
        ...[...block.querySelectorAll('.j-act')].map((node) => [node, 0.40]),
      ];
      copyRiseNodes.set(block, stages);
    }
    for (const [node, lead] of stages) {
      if (!node) continue;
      const phase = smoothA((s - lead) / Math.max(1e-6, 1 - lead));
      const rise = 0.16 * (1 - phase);
      if (rise < 0.0005) node.style.removeProperty('transform');
      else node.style.transform = `translateY(${rise.toFixed(4)}em)`;
    }
  }

  /** One painter per `copySurface.host`. This was an `id === 'mission'` test;
   *  it is a two-entry lookup now, so the answer to "where does this
   *  chapter's copy live" is read off the manifest instead of matched against
   *  a name (order U04, on N01's dispatch route). */
  const PAINTERS = {
    hero(id, s) {
      if (!heroBlock) return;
      heroBlock.style.opacity = s;
      heroBlock.style.pointerEvents = s > 0.5 ? '' : 'none';
      // pointer-events already left; visibility is the same statement for the
      // keyboard and for AT (the hero CTA was focusable and readable at every
      // chapter). '' at the Mission pose = the untouched hero.
      heroBlock.style.visibility = s > 0.002 ? '' : 'hidden';
    },
    block(id, s) {
      if (!blocks[id]) return;
      blocks[id].style.opacity = s;
      blocks[id].style.visibility = s > 0.002 ? 'visible' : 'hidden';
      paintCopyRise(blocks[id], s);
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
    },
  };

  /** The one place a copy block's eased opacity reaches the DOM.
      (Until the 2026-08-09 navigation redux this multiplied the epilogue's
      block by `epilogueRetire` so it could hand the lower frame to the
      arriving footer. The footer is gone — its content lives in the rail's
      site-map panel — so the epilogue copy now simply holds through the
      end-hold, which its own band (hi: 2) always said it could.) */
  function paintCopy(id, s) {
    const surface = COPY_SURFACES[id];
    if (!surface) return;
    PAINTERS[surface.host](id, s);
  }

  /* ---------------- the jump entry ---------------- */

  function prepareCopyEntry(id) {
    if (!(id in eased)) {
      preparedEntry = null;
      return;
    }
    const departure = { ...eased };
    endArrive();
    const from = {};
    for (const k in departure) if (k !== id) from[k] = departure[k];
    // Install the envelope before placeAt() runs its synchronous dt=0 frames.
    // Those frames now see one transition owner and therefore preserve the
    // departure copy instead of painting destination state and undoing it.
    arrive = { id, t: 0, lead: 1, dur: 1, own: true, from, play: 1,
      phase: 'preparing', started: false, hold: 0, holdSnaps: 0, motions: [] };
    preparedEntry = { id, departure };
  }

  /** Copy entry for a chapter the camera is currently blending onto.
   *  `blendDur` prices the prepared flight ticket and its child motion. */
  function armCopyEntry(id, blendDur) {
    if (!(id in eased)) {
      preparedEntry = null;
      return;
    }
    const prepared = preparedEntry && preparedEntry.id === id
      ? preparedEntry : null;
    const departure = prepared ? prepared.departure : easedPrev;
    preparedEntry = null;
    const lead = blendDur * COPY_JUMP_LEAD;
    const dur = blendDur + COPY_JUMP_COPY_TAIL_S - lead;
    if (!prepared) {
      endArrive();                                 // a jump can overtake a jump
      for (const k in departure) eased[k] = departure[k];
      eased[id] = 0;
    }
    // Capture the last TRAVELLED frame for the transition owner. Flight does
    // not advance this envelope; chooseEase releases all narrative surfaces
    // toward the same hidden state while the live wrap ticket exists.
    const from = {};
    for (const k in departure) if (k !== id) from[k] = departure[k];
    // `hold`: seconds this entrance has waited at its lead for the hero's gate
    // to open, and owed back to a rewind. See the hold block in step().
    if (prepared && arrive && arrive.id === id) {
      arrive.lead = lead;
      arrive.dur = dur;
      arrive.phase = 'flight';
    } else {
      arrive = { id, t: 0, lead, dur, own: true, from, play: 1, started: false,
        phase: 'flight', hold: 0, holdSnaps: 0, motions: [] };
    }
    const b = blocks[id];
    if (b) {
      /* The child choreography must not start on CSS wall time while the
         shared scene-clock envelope is still waiting. Mobile first-draw
         stalls advance CSS but cap scene dt, which previously let the words
         finish behind an opacity-zero parent. step() adds `.j-arrive` when
         the envelope itself crosses `lead`; startArriveMotion then keeps the
         text rise phase-locked to that same clock. */
      b.style.setProperty('--j-in-wait', '0ms');
      b.style.setProperty('--j-in', `${Math.round(dur * 1000)}ms`);
      // Leave it unstarted until the scene clock reaches the visible phase.
      b.classList.remove('j-arrive');
    }
  }

  /** The visitor took the wheel: journey.js has dropped the camera blend, so
   *  the copy stops being timed against an arrival that is no longer coming.
   *  Only the OPACITY authority is handed back — the block's inner keyframes
   *  are left to finish, because every one of them ends at its resting style
   *  and cutting them short is the only way to make them visible as a cut. */
  function cancelCopyEntry() { if (arrive) arrive.own = false; }

  /** Steering changes the camera/rail ticket, never copy on the input event.
   *  The wrap's phase-derived crossfade is naturally reversible; the value is
   *  still retained as part of the controller's one direction contract. */
  function setCopyEntryPlay(play) { if (arrive) arrive.play = play < 0 ? -1 : 1; }

  /** The entry is over — spent, abandoned, or overtaken. Drops the class as
   *  well as the state: `both` fill means a stale `.j-arrive` would leave
   *  three elements holding a finished animation for the rest of the session.
   *  Harmless to look at (every keyframe ends at the resting style, which is
   *  the whole contract) and still wrong to leave lying around. */
  function endArrive() {
    if (!arrive) return;
    clearArriveMotion(arrive);
    arrive = null;
  }

  /* ---------------- the transitions ---------------- */

  /** THE DIRECT-NAVIGATION TICKET, and the only writer of `nav`.
   *
   *  Detect the authoritative ticket by identity. A replacement click gets a
   *  fresh phase=0 ticket and captures the opacity already painted for its new
   *  destination; nothing is reset in the click task. When an ordinary flight
   *  lands, retain only its partial-opacity floor until the existing scroll
   *  target rises to meet it. That prevents a lead-in from dipping back out
   *  while pSpeed's settle tail decays. A hero ticket means a direct RETURN and
   *  gets the stronger hero curve; boot has no railFlight, so its authored
   *  entrance remains entirely untouched.
   *
   *  Returns the carried floor to apply on THIS frame, or null. The floor is
   *  published rather than applied here because the band loop owns `target`
   *  — and it is returned rather than left on the ticket because the ticket
   *  may retire on the very frame its last floor is used: `floor` can exceed
   *  the scroll target by up to the 0.001 tolerance, so that final frame is a
   *  real 0.001 of opacity and the retirement must not run before it.
   */
  function advanceNavTicket({
    chapterId, railWrap, railFlight, travelP, travelHold, dt, settled,
  }) {
    const inAir = flying();
    if (railWrap) {
      // The cyclic seam has its own reversible copy ticket. A carried floor
      // from a preceding ordinary click must not hold the wrap's outgoing
      // chapter above zero.
      nav = null;
    } else if (railFlight && railFlight !== (inAir ? inAir.ticket : null)) {
      nav = {
        kind: 'flying',
        ticket: railFlight,
        id: chapterId,
        from: chapterId ? eased[chapterId] || 0 : 0,
        gateFrom: chapterId ? gateEase(chapterId) : 0,
        gate: chapterId ? gateEase(chapterId) : 0,
        departure: { ...eased },
      };
    } else if (!railFlight && inAir) {
      /* The last presented flight sample can land a few 1e-5 short of the
         exact rest before endCamBlend retires its ticket. Anchoring carry to
         that sample made the next exact destination frame look like fresh
         travel: the floor cleared, copy fell with the still-hot speed tail,
         then rose again. The ticket's target is the semantic landing
         coordinate and therefore the only stable handoff point. */
      nav = inAir.id ? {
        kind: 'carrying',
        id: inAir.id,
        floor: eased[inAir.id] || 0,
        gate: Number.isFinite(inAir.gate) ? inAir.gate : eased[inAir.id] || 0,
        atP: Number.isFinite(inAir.ticket.targetP) ? inAir.ticket.targetP : travelP,
      } : null;
    }
    if (!nav || nav.kind !== 'carrying') return null;
    // Hold only while still at the destination composition. Real travel away
    // must restore the ordinary outgoing fade immediately—even while still
    // inside the hero's wide fully-open band—rather than carrying this floor
    // into another chapter.
    const bandTarget = bandOpacity(travelP, COPY_BANDS[nav.id]);
    if (Math.abs(travelP - nav.atP) > 1e-4 || bandTarget < 0.995) { nav = null; return null; }
    nav.gate += (nav.floor - nav.gate) * Math.min(1, dt * COPY_IN_K * settled);
    const carried = { id: nav.id, floor: nav.floor };
    if (bandTarget * travelHold >= nav.floor - 0.001
        && nav.gate >= nav.floor - 0.001) nav = null;
    return carried;
  }

  /** THE HERO'S ARRIVAL SHELF, and the only writer of `heroShelf`.
   *
   *  The hero's section strip and copy are one composition. The rail returns a
   *  pure arrival gate from its live --nav-y coordinate: the copy remains
   *  internally continuous, but cannot become visible before the strip is
   *  making its final approach under either scroll or direct navigation. */
  /** @param {boolean} gating  is the rail gating the hero at all this frame?
   *  @param {boolean} envelope  does an owned entry envelope hold the hero? */
  function advanceHeroShelf(heroGate, heroEased, gating, envelope) {
    /* A CHANGE OF AUTHORITY IS NOT AN ARRIVAL (DEFECT-01 #2, 2026-08-23,
       Hannah: "in the ownership section, if I reduce the size, it shows the
       hero text and the ownership text at the same time").

       The shelf latches on a RISING gate, because a rising gate means the
       section strip is docking and Mission's copy should arrive with it. But
       the rail stops gating the hero entirely at phone widths — there is no
       docking strip there to arrive with. It used to say so by returning 1,
       which is indistinguishable from "docked, show it": on the frame a
       desktop window was dragged under the boundary the gate stepped 0 -> 1,
       the shelf read a rise and latched `1 * 0.8`, and nothing could lower it
       again — `heroEased` is 0 all through Inspire and Ownership, so the
       release below never fired. Measured at 375x812 after a scale-down from
       1440x900: hero copy pinned at opacity 0.8 OVER the chapter's own copy,
       permanently, on every chapter. That is also why Inspire's ArtCompute and
       2RP labels "weren't appearing" — the hero block is drawn across them.

       So the rail now returns `null` when it is not the authority, the call
       site tells us which it was, and a frame with no gate holds no shelf.
       Crossing back up is equally safe: `heroGatePrev` is left null while
       ungated, so the first gated frame has nothing to compare against and
       cannot read the restored gate as a rise either. */
    if (!gating) { heroShelf = 0; return 0; }
    /* AN ARRIVAL SHELF AND AN ARRIVAL ENVELOPE ARE TWO ANSWERS TO ONE
       QUESTION (report #31, 2026-08-26). The shelf exists for the arrival
       that has NO envelope: under scroll the hero's copy has only its band
       and the strip's approach to arrive with, so the rising gate carries it
       most of the way in. A wrap DOES have an envelope, authored against the
       lap, and on the gate's rise the shelf ratcheted straight past it —
       `max(eased 0.027, gate x 0.8)` handed the paint to the shelf and swept
       the words 0 -> 0.8 in 185 ms while the envelope was still at 3%
       (measured, quiet host, 3/3 trials). Two entrances for one arrival is
       one entrance too many, and the shelf is the one that is not authored.
       So while an owned envelope holds the hero, the shelf yields to it
       entirely. Scroll and click never arm one (`heroEnvelopeLive`), so both
       keep the shelf exactly as before. */
    if (envelope) { heroShelf = 0; return 0; }
    if (heroGatePrev !== null) {
      if (heroGate > heroGatePrev + 1e-5) {
        // Arrive substantially with the strip, then let the ordinary copy
        // breathe supply the final 20%. This is a progress-derived shelf, not
        // a timer, so reversal lowers it on the same frame.
        heroShelf = Math.max(heroShelf, heroGate * 0.8);
      } else if (heroGate < heroGatePrev - 1e-5) {
        heroShelf = 0;
      }
    }
    if (heroEased >= heroShelf - 0.001) heroShelf = 0;
    return heroShelf;
  }

  /** THE INTRO'S ARRIVAL IS PERFORMED, and the only writer of
   *  `heroPaintPrev` (owner report #36, 2026-08-26: "could you also make it
   *  so that the intro block text, when it appears and reappears, that
   *  happens gradually and nicely rather than it just popping up as it does
   *  now?").
   *
   *  `scene` is the composed authority this frame — `min(gate, max(eased,
   *  shelf))`, the expression that has always reached the DOM, unchanged and
   *  computed by its own owners. This is a FLOOR under how fast that value
   *  may RISE, in seconds, and it is the only thing added.
   *
   *  WHY A FLOOR AND NOT A CURVE. Report #31 fixed the wrap's arrival at this
   *  surface and left the ordinary ones measured but untouched: scrolling
   *  back up painted 0 -> 0.8 in 50 ms with a 0.4587 single-frame step, and a
   *  rail click did it in 183 ms with 0.2153 (re-measured under the injected
   *  clock; identical to 4 dp across repeats). Neither number is a clock.
   *  Both are the rail's hero gate, which is authored in ROUTE POSITION —
   *  `1 - smoothstep(u / 0.05)`, a fade living in the last 5% of a docking
   *  span the visitor crosses at whatever speed they like. Three frames of a
   *  brisk wheel and it is fully open; the shelf ratchets to `gate * 0.8`
   *  with it, or on a click the flight envelope's already-earned 0.73 is
   *  released in one step by the `min`. That is CONTRIBUTING.md §5's defect:
   *  a beat priced in a coordinate whose exchange rate to visible motion is
   *  the gesture's own speed.
   *
   *  THE GATE IS READ, NOT RESTATED — the second time this module has had to
   *  say so. No docking phase, no `0.05` and no `0.8` is copied here; `scene`
   *  arrives already composed and this function cannot disagree with it,
   *  because the only thing it may do is hold it back.
   *
   *  EXEMPTIONS, every one of them an arrival that already has a clock:
   *    · `dt === 0` — a placement, a `?p=` deep link, a capture. Snap, for
   *      the same reason every other rule here snaps.
   *    · the first paint — nothing to rise from.
   *    · an owned entry envelope holding the hero (`heroEnvelopeLive`) — the
   *      wrap's `armCopyEntry` window, which report #31 authored in seconds
   *      against the lap. A rate cap over the top of it would be the second
   *      entrance that report exists to remove, and it is why R4 cannot move:
   *      on that path this function returns `scene` untouched.
   *    · a frame the rail is NOT the hero's gate on (`gating` false — the
   *      phone tier, DEFECT-01 #2). There is no position-authored gate there
   *      and therefore no fault: the copy is already on the COPY_IN_K breathe,
   *      which is a clock in seconds, reaching 0.8 in 671 ms. Its peak frame
   *      (0.04 at the foot of the exponential) is above this floor's ceiling,
   *      so an unscoped floor would have quietly re-timed a path nobody
   *      reported and nothing measured as broken. The phone tier is
   *      bit-identical to before.
   *    · reduced motion — the rail steps its gate there deliberately
   *      (`u <= 0.001 ? 1 : 0`) and that step is the answer that setting
   *      asked for, so the floor stays out of it.
   *
   *  A FALL IS NEVER LIMITED. An arrival is a performance and a departure is
   *  a release — the house's own asymmetry (constants/copy.js, THE RELEASED
   *  DEPARTURE), and here it is also load-bearing: intro copy that outstayed
   *  its falling gate is DEFECT-01 #2, the hero block drawn over the
   *  chapter's own words. So the whole exit path is bit-identical to before. */
  function performHeroArrival(scene, dt, gating) {
    if (!(dt > 0) || heroPaintPrev === null || !gating || reduceMotion.matches
        || heroEnvelopeLive() || scene <= heroPaintPrev) {
      heroPaintPrev = scene;
      return scene;
    }
    heroPaintPrev = Math.min(scene, heroPaintPrev + dt / HERO_COPY_ARRIVAL_S);
    return heroPaintPrev;
  }

  /** Which rule owns this chapter's opacity on this frame, and what it says.
   *  PURE — every arm RETURNS, where the shipped code accumulated into a
   *  mutable `s` through seven assignments. The arms are in their original
   *  order and that order is the priority: a live flight outranks the jump
   *  envelope, which outranks the snap, which outranks the scroll rule. */
  function chooseEase(id, prev, target,
      { dt, railWrap, railFlight, arriveE, leaveE, settled }) {
    const inAir = flying();
    if (railFlight && inAir) {
      const phase = Math.max(0, Math.min(1, Number(inAir.ticket.phase) || 0));
      if (inAir.id === id) {
        const arrival = smoothA((phase - (1 - NAV_COPY_FADE_PHASE))
          / NAV_COPY_FADE_PHASE);
        const env = FLIGHT_ENVELOPES[COPY_SURFACES[id].flightLead];
        const gateLead = smoothA((phase - env.onset) / (1 - env.onset));
        const gateLanding = Math.max(inAir.gateFrom, env.land);
        inAir.gate = inAir.gateFrom + (gateLanding - inAir.gateFrom) * gateLead;
        return inAir.from + (1 - inAir.from) * arrival;
      }
      const departure = Number(inAir.departure[id]) || 0;
      return departure * (1 - smoothA(phase / NAV_COPY_FADE_PHASE));
    }
    /* A cyclic wrap has no meaningful intermediate section coordinate. Keep
       every narrative surface on one camera-phase answer while its ticket is
       live: the departure fades across the opening third of the lap and the
       destination rises across the closing third. Reversing the same phase
       retraces that crossfade, so neither endpoint can flash in the middle. */
    if (arrive && arrive.own && arrive.phase === 'flight') {
      if (dt === 0) return prev;
      const phase = clamp01(Number(railWrap && railWrap.phase) || 0);
      if (id === arrive.id) {
        return smoothA((phase - (1 - NAV_COPY_FADE_PHASE)) / NAV_COPY_FADE_PHASE);
      }
      const departure = id === arrive.id ? 0 : Number(arrive.from[id]) || 0;
      return departure * (1 - smoothA(phase / NAV_COPY_FADE_PHASE));
    }
    if (arrive && arrive.own && id === arrive.id) return target * arriveE;
    // a block the jump is LEAVING: released on the move's clock, but only
    // while it is still above where the scroll rule would have it — so this
    // can lower a block and never raise one, and a block whose band is
    // already open (the destination's neighbours during a scrub-interrupted
    // jump) is untouched.
    if (arrive && arrive.own && arrive.from[id] > 0 &&
        arrive.from[id] * (1 - leaveE) > target) return arrive.from[id] * (1 - leaveE);
    // A real placement/capture snaps. A nav click also invokes two dt=0
    // passes, but railFlight means the visible coordinate has not moved;
    // preserve the opacity/transform already on screen through that task.
    if (dt === 0 && !railFlight) return target;
    if (target < prev) {
      return prev + (target - prev) * Math.min(1, dt * COPY_OUT_K);
    }
    return prev + (target - prev) * Math.min(1, dt * COPY_IN_K * settled);
  }

  /** `chooseEase` plus the resting floor: a block on its way out is parked at
   *  exactly 0 rather than left at a denormal, so "faded out" is a value the
   *  next frame can compare against. */
  function nextEase(id, prev, target, frame) {
    const s = chooseEase(id, prev, target, frame);
    return s < 0.001 && target === 0 ? 0 : s;
  }

  /* ---------------- the frame ---------------- */

  /** One frame of copy choreography. Everything it needs is an argument. */
  function step({ chapterId, dt, travelP, railWrap = null, railFlight = null }) {
    if (dt > 0 && lastP !== null) {
      const inst = Math.abs(travelP - lastP) / dt;
      /* THE LANDING ENDS THE TRAVEL CLOCK (copy stutter, 2026-08-25 —
         Hannah: "there's a brief lag in the text as it appears, like it
         stutters"). On the frame a nav flight's ticket retires, the smoothed
         tail below still averages the whole flight, so the copy that ignited
         during the approach parked dead-flat at the flight arm's 0.38
         ceiling for the ~230 ms it took travelHold to forget a move that
         was already over — measured on every ordinary jump (0.38 held
         185–270 ms past the landing; the hero's return froze at the 0.8
         shelf for ~600 ms). A parked camera with copy waiting on a decaying
         average is a clock denominated in a proxy spending time that buys no
         visible motion. So the landing frame re-reads the speed the eye
         actually sees: clamp to this frame's instantaneous |dp|/dt, which on
         a completed flight is the C2 envelope's own terminal speed (~1e-3
         p/s — the blend ends at zero velocity), so the ordinary COPY_IN_K
         breathe resumes on the very frame the flight arm lets go and the
         gate is monotone through the handoff by construction. The clamp is
         `min`, not assignment, because a CANCELLED flight retires its ticket
         on the same signature while the presented coordinate teleports back
         to the parked p — inst is then huge, min keeps the smoothed value,
         and the interrupted-jump path behaves exactly as before. */
      if (!railFlight && flying()) pSpeed = Math.min(pSpeed, inst);
      pSpeed += (inst - pSpeed) * Math.min(1, dt * 5);
    } else if (dt === 0 && !railFlight) {
      // True placements have no travel. A direct click also performs two
      // synchronous placement passes, but its railFlight already identifies
      // the continuous coordinate that the next painted frame will resume;
      // keep the live speed through an interruption instead of inventing a
      // one-frame stop between two camera/rail flights.
      pSpeed = 0;
    }
    lastP = travelP;
    // moving fast releases copy even inside its band; arriving slow lets it in
    const travelHold = 1 - smoothA((pSpeed - COPY_TRAVEL_LO) / (COPY_TRAVEL_HI - COPY_TRAVEL_LO));
    const settled = 1 - smoothA((pSpeed - COPY_SETTLE_LO) / (COPY_SETTLE_HI - COPY_SETTLE_LO));

    const carried = advanceNavTicket({
      chapterId, railWrap, railFlight, travelP, travelHold, dt, settled,
    });

    /* The wrap ticket is the camera/section agreement signal and the copy
       clock. Its opening and closing thirds crossfade the two real endpoints;
       retirement therefore hands off at exactly the opacity the resting rule
       expects. A replacement ordinary flight is an abandonment, not a
       landing, and receives its own railFlight authority instead. */
    if (arrive && arrive.own && arrive.phase === 'flight' && !railWrap) {
      if (railFlight) endArrive();
      else endArrive();
    }

    // Advance the jump entry before the loop reads it. It dies on a placement
    // frame (a capture or deep link must still snap), and when the visitor has
    // scrolled somewhere else entirely — the arrival it was timed against is
    // then over in both cases.
    /* The cyclic entrance begins only after the camera ticket has retired.
       Mission remains the one DEFERRED surface: even after settlement, its
       clock holds at zero until the rail's own docking gate opens. The gate is
       read through `heroGatePrev`, never re-authored here. */
    const heroHeld = heroEnvelopeLive()
      && heroGatePrev !== null && heroGatePrev <= 0;
    if (arrive) {
      if ((dt === 0 && !preparedEntry
            && !(arrive.phase === 'settling' && arrive.holdSnaps > 0))
          || (chapterId !== arrive.id && arrive.own)) endArrive();
      else if (arrive.phase !== 'flight') {
        if (dt === 0 && arrive.holdSnaps > 0) arrive.holdSnaps--;
        const advance = dt * (arrive.play || 1);
        if (advance >= 0) {
          // forward: spend what the gate allows, bank the rest
          const room = heroHeld ? Math.max(0, arrive.lead - arrive.t) : advance;
          const spend = Math.min(advance, room);
          arrive.t += spend;
          arrive.hold += advance - spend;
        } else {
          // rewind: repay the bank first, then retrace the clock itself
          const repay = Math.min(-advance, arrive.hold);
          arrive.hold -= repay;
          arrive.t += advance + repay;
        }
        if (arrive.t >= arrive.lead + arrive.dur) endArrive();
        // ...or rewound past its own start (a steered wrap): the handover has
        // fully unwound and the from-state is back on screen, so it retires
        // there exactly as it retires at the other end.
        else if (arrive.play < 0 && arrive.t <= 0) endArrive();
      }
    }
    // ...and the child rise starts with the envelope it is phase-locked to,
    // which for a held hero is the gate-open frame, not the lead frame: a
    // `.j-arrive` added here would put the authored CSS beat behind the same
    // closed gate the envelope was just taken out from behind.
    if (arrive && arrive.own && !arrive.started && !heroHeld
        && arrive.play > 0 && arrive.t >= arrive.lead) {
      startArriveMotion(arrive);
    }
    if (arrive) syncArriveMotion(arrive);
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

    const copyBandsDebug = {};
    for (const id in eased) {
      // `p` is parked at the destination during a direct click. `travelP` is
      // the coordinate the camera and horizontal rail are actually presenting
      // on this frame, and is identical to p for real scroll and placements.
      // Reading the bands from it prevents destination copy from appearing on
      // the click frame and gives click travel the exact same reversible
      // release/settle choreography as scrolling.
      const bandTarget = bandOpacity(travelP, COPY_BANDS[id]);
      const scrollTarget = bandTarget * travelHold;
      const target = carried && carried.id === id
        ? Math.max(scrollTarget, carried.floor) : scrollTarget;
      const s = nextEase(id, eased[id], target,
        { dt, railWrap, railFlight, arriveE, leaveE, settled });
      eased[id] = s;
      copyBandsDebug[id] = { bandTarget, scrollTarget, target, eased: s };
      // The snapshot the next arm() restores from is the last frame that
      // actually TRAVELLED — a dt = 0 placement must not overwrite it, since
      // undoing that very snap is the whole point of keeping it.
      if (dt > 0) easedPrev[id] = s;
      // A deferred surface is painted once, below, after the rail has returned
      // the gate derived from the very docking coordinate it painted this
      // frame.
      if (!COPY_SURFACES[id].deferred) paintCopy(id, s);
    }
    const railHeroGate = rail.setHeroEase(eased[HERO_CHAPTER_ID]);
    /* The existing `Number.isFinite` fallback is now load-bearing rather than
       defensive: it is how the rail says "I am not the hero's gate here"
       (DEFECT-01 #2). The PAINTED value is unchanged — an ungated frame still
       shows the hero at its own band opacity — but the shelf can now tell an
       absent authority from a permissive one. */
    const gating = Number.isFinite(railHeroGate);
    const heroGate = gating ? railHeroGate : 1;
    const shelf = advanceHeroShelf(heroGate, eased[HERO_CHAPTER_ID], gating,
      heroEnvelopeLive());
    const heroScene = Math.min(heroGate, Math.max(eased[HERO_CHAPTER_ID], shelf));
    const heroPaint = performHeroArrival(heroScene, dt, gating);
    paintCopy(HERO_CHAPTER_ID, heroPaint);
    heroGatePrev = gating ? heroGate : null;
    copyFrameDebug = {
      travelP, pSpeed, travelHold, settled,
      flightPhase: railFlight
        ? Math.max(0, Math.min(1, Number(railFlight.phase) || 0))
        : null,
      directId: flying() ? flying().id : null,
      directFrom: flying() ? flying().from : 0,
      carry: nav && nav.kind === 'carrying'
        ? { id: nav.id, floor: nav.floor, atP: nav.atP } : null,
      heroGate,
      /** What the composed scene authority asked for, before the performed
       *  floor. Published beside `heroPaint` so an instrument can tell a
       *  slow arrival from a held one without inferring it (report #36). */
      heroScene,
      heroPaint,
      heroCarry: shelf,
      bands: copyBandsDebug,
    };
  }

  return {
    step,
    prepareCopyEntry,
    armCopyEntry,
    cancelCopyEntry,
    setCopyEntryPlay,
    /** A chapter's live landing gate (0..1); visual copy may lead it in flight. */
    ease: gateEase,
    /** QA: the chapter whose copy is mid-entry, or null. */
    get arrivingChapter() { return arrive ? arrive.id : null; },
    /** QA: the existing scroll-style smoothed |dp/dt| travel signal. */
    get travelSpeed() { return pSpeed; },
    /** QA: one atomic read of the copy authorities used in the latest rAF. */
    get debug() { return copyFrameDebug; },
  };
}
