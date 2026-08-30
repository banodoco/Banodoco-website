/* ==================================================================== *
 * journey/transition/controller.js — ONE OWNER FOR THE TRANSITION.
 *
 * J01 (runbook :689; runtime-design/slices.md §1). Everything about a
 * journey transition that is STATE — the camera blend, the wrap's lap and
 * its rail ticket, an ordinary click's rail flight, the navigation-only
 * chapter entry clock, the state/camera disagreement flag, and the hero
 * furniture's arrival and departure terms — lived as eleven `let`s in
 * journey.js's boot() closure, written from six places and read from
 * thirty. They are here now, and every write goes through a named method.
 *
 * WHAT THIS FILE IS NOT ALLOWED TO SEE, AND WHY THAT IS THE POINT.
 * boundaries.md §A.6 E-A2: the controller is constructed with an `input`
 * port and NO `scroll` parameter, so there is no identifier in this scope
 * to reach a diagnostic getter through. The cancellation question — "has
 * manual input taken the camera back?" — used to be assembled HERE, out of
 * `scroll.sinceInput < 50 && scroll.answeredAt === null`: a clock read, a
 * private wall, and a 50 ms threshold that existed nowhere in the model.
 * It is now ONE call to the model's own decision port (journey/claim.js,
 * journey/scroll.js `claimNow`), which answers with a discriminated
 * `null | Readonly<{dir}>`. There is no scalar here to truthiness-test and
 * no raw sample to re-derive a heuristic from.
 *
 * THE PORT IS CALLED WHERE THE QUESTION IS ASKED, ONCE PER SITE, AND NEVER
 * HOISTED. journey/scroll.js's claimNow() block is explicit that hoisting
 * the call to the top of applyFrame would MOVE the clock read across the
 * whole cancellation block on the camBlend-falsy path — design.md §12's
 * class of change, invisible to the frozen-clock harness. blendCancelled()
 * below is therefore called from inside applyFrame's own guards, exactly
 * as the expression it replaces was, and at most one of its two sites runs
 * on any frame.
 *
 * WHAT STAYED IN journey.js, DELIBERATELY.
 *   * directJumpTo()  — the PATH: arc length, azimuth turn, the duration
 *     law, the fog and grade endpoints. It reads the scene and computes; it
 *     no longer owns a byte of the state it starts. It calls beginFlight()
 *     and beginBlend() here.
 *   * paintHeroFurniture() — the DOM write, and `heroShown`, the painter's
 *     own memo of what it last put up. This file owns WHEN the furniture
 *     moves and to WHAT value; the page owns the elements.
 *   * scroll.retire() at applyFrame's steering site. The retirement of the
 *     visitor's gesture is the MODEL's business and the composition root's
 *     to sequence; `input.retire` exists on the port and is deliberately
 *     unused from here. It is also pinned as a literal token of applyFrame
 *     by tools/test-frame-order.mjs S2, which J01 was not given.
 * ==================================================================== */

import { createCameraBlendStepper } from '../camera-blend.js';
import { snapChapterLandings } from '../chapter-entry.js';
import { COPY_JUMP_LEAD, COPY_JUMP_TAIL_S, COPY_IN_K } from '../constants.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** @typedef {import('../claim.js').ManualClaim} ManualClaim */

/**
 * @param {object} deps
 * @param {{ claimNow: () => ManualClaim }} deps.input  the model's decision
 *        port (journey/claim.js `inputPortOf`). NOT the model.
 * @param {object} deps.sceneApi
 * @param {object} deps.director
 * @param {object} deps.lens
 * @param {object} deps.ui
 * @param {object} deps.chapters
 * @param {(label: string, fn: Function) => any} deps.guarded
 * @param {(p: number) => {id: string}} deps.chapterAt
 * @param {(p: number) => void} deps.placeAt  late-bound: landWrapHome()
 *        composes a whole frame at the home rest.
 * @param {(a: number) => void} deps.paintHero  the DOM write.
 * @param {() => number} deps.heroShownNow  what the painter last put up.
 * @param {() => number} deps.heroPresenceNow  presence at the live progress.
 */
export function createTransitionController({
  input, sceneApi, director, lens, ui, chapters, guarded,
  chapterAt, placeAt, paintHero, heroShownNow, heroPresenceNow,
}) {
  /* ---------------------------------------------------------------- *
   * THE STATE. Eleven `let`s, one owner.
   * ---------------------------------------------------------------- */
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
  // A wrap parks p at its destination before the four-second lap begins, so
  // p cannot tell the rail where that visible move is. This small ticket is
  // created before placeAt's synchronous frames and follows the camera clock.
  let railWrap = null;          // { dir, homeP, targetP, phase } while a wrap flies
  // Ordinary clicks have the same destination-progress disagreement. Carry
  // their visible origin and destination separately so the horizontal rail
  // can scrub between them on the camera blend's exact eased phase.
  let railFlight = null;        // { fromP, targetP, phase } for non-wrap clicks

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

  /* ---------------------------------------------------------------- *
   * THE DECISION. One call to the port, and nothing else.
   * ---------------------------------------------------------------- */
  /** Has manual input taken the camera back?  -> ManualClaim
   *
   *  The model's own answer, asked at this instant. `null` means no — either
   *  nothing is fresh, or the model is REFUSING the visitor's current input
   *  (an answered gesture's momentum tail, the arrival wall). A `{dir}` means
   *  yes, and carries the model's own travel direction so the steering branch
   *  below needs no second question.
   *
   *  WAS, until J01 (journey.js:1131 at the base commit):
   *      return scroll.sinceInput < 50 && scroll.answeredAt === null;
   *  — two raw diagnostic getters and a threshold that lived in no model.
   *  The fifty-one-line rationale that bought that rule moved with the
   *  threshold into journey/claim.js (boundaries.md §A.9); it is not
   *  duplicated here, and journey/scroll.js's claimNow() is where the rule
   *  is now applied. The name is kept because it is what applyFrame's writer
   *  order is pinned on (tools/test-frame-order.mjs S2).
   *
   *  Read once per frame, at the TOP of applyFrame — see the block there for
   *  why the answer must be acted on before the director decides ownership. */
  function blendCancelled() {
    return input.claimNow();
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

  /** Route a bookend control through the wrap ticket that is already visible.
   * The controller owns both endpoints and the playback direction, so this is
   * the only layer that can answer atomically: true means the click changed
   * (or confirmed) this exact lap; false means it names some other chapter
   * and the caller may begin a replacement flight. Keeping the decision here
   * prevents a control reversal from dropping through to directJumpTo() and
   * replacing a non-zero rail phase with a new opposite ticket at phase 0. */
  function steerWrapTo(targetP) {
    if (!camBlend || !railWrap || !camBlend.wrapDir || !Number.isFinite(targetP))
      return false;
    const at = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-4;
    let dir = 0;
    if (at(targetP, railWrap.homeP)) dir = -camBlend.wrapDir;
    else if (at(targetP, railWrap.targetP)) dir = camBlend.wrapDir;
    else return false;
    steerWrapBlend(dir);
    return true;
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
    railWrap = null;
    railFlight = null;
    chapterEntry = null;
    cameraStateDisagree = false;
    director.setTransitioning(false);
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

  /** The blend is over — landed, cancelled, or abandoned. The camera and the
   *  journey's state agree again from here, so this is where the eased arming
   *  snap directJumpTo deferred happens. A naturally landed chapter entry may
   *  keep its own visible reveal clock; cancellation/placement clears it. */
  function endCamBlend(keepEntry = false) {
    camBlend = null;
    railWrap = null;
    railFlight = null;
    if (!keepEntry) chapterEntry = null;
    cameraStateDisagree = false;
    director.setTransitioning(false);
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
    snapChapterLandings(chapters, guarded);
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

  /* ---------------------------------------------------------------- *
   * THE HERO FURNITURE'S TWO TERMS. The values are here; the DOM write
   * is journey.js's paintHeroFurniture, injected as `paintHero`.
   * ---------------------------------------------------------------- */

  /** Arm the DEPARTURE term (see heroExit above). Called from directJumpTo
   *  BEFORE placeAt — the two dt = 0 placement passes inside placeAt are what
   *  used to ship the snap, so arming afterwards (in armHeroEntry, where the
   *  arrival is armed) is exactly one placement too late. `holdSnaps` lets
   *  the term survive those two passes and nothing else: a REAL placement
   *  (deep link, ?capture=, QA scrollTo) never has an exit armed, and one
   *  that lands mid-fade spends the two held snaps and then kills it, which
   *  is the snap a placement is owed. */
  function armHeroExit(wrap) {
    if (heroShownNow() <= 0.05) return;
    // 0.35 s reads as a fade on the shortest jumps; the wrap's 4 s lap gets
    // 0.6 s so the furniture is gone before the camera swings through it.
    heroExit = { from: heroShownNow(), t: 0, dur: wrap ? 0.6 : 0.35, holdSnaps: 2 };
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
    paintHero(Math.max(heroPresenceNow() * heroGate,
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

  /* ---------------------------------------------------------------- *
   * THE JUMP'S TWO WRITES. directJumpTo computes the path and calls
   * these; it holds none of the state they set.
   * ---------------------------------------------------------------- */

  /** A jump overtakes a jump: drop the old blend BEFORE placing, so the
   *  placement's own dt = 0 frames are not stepped by it (the blend runs
   *  inside applyFrame — see the frame-order block there). The new blend
   *  starts from where the old one had actually reached, which directJumpTo's
   *  `pos0` has already captured off the live camera. */
  function abandonForJump() {
    camBlend = null;
    railWrap = null;
    railFlight = null;
    chapterEntry = null;
  }

  /** An ordinary click now presents a real continuous progress coordinate
   *  over the camera flight. Hero presence can therefore use the same pure
   *  p envelope as scroll; retire the legacy click-only timer so it cannot
   *  race or soften that authoritative signal. */
  function clearHeroTerms() {
    heroExit = null;
    heroEntry = null;
    heroGate = 1;
  }

  /** The tickets the jump installs BEFORE placeAt runs its two synchronous
   *  dt = 0 passes: they must see the beginning of the entry, not one
   *  transient fully-arrived drive(p) state. */
  function beginFlight({ railWrap: wrapTicket, railFlight: flightTicket, chapterEntry: entry }) {
    // Destination state is placed synchronously below, so a flight into
    // Mission makes director.owned false before the camera has arrived. The
    // flight is still the camera authority: bracket it explicitly so a resize
    // cannot install the hero's later-running view tween over the compositor.
    director.setTransitioning(true);
    cameraStateDisagree = true;
    railWrap = wrapTicket;
    railFlight = flightTicket;
    chapterEntry = entry;
  }

  /** The blend itself, after placeAt has let the director write the
   *  destination pose (which is what makes the duration and both grade
   *  endpoints knowable). Taken as authored rather than re-assembled here:
   *  the stepper reads twenty-two named fields off it, and a spread would
   *  put this file in the business of knowing which.
   *
   *  ONE FIELD IS SET RATHER THAN READ, and it is the lap's own odometer.
   *  `advanced` answers "has this lap put any of its clock behind it?" — the
   *  question rewoundHome below has to ask before it may land one. A lap
   *  handed a clock that is already running has, by construction; a lap
   *  authored at its own first frame (every jump directJumpTo builds) has
   *  not, until stepCamBlend says so. */
  function beginBlend(blend) {
    camBlend = blend;
    camBlend.advanced = camBlend.t > 0;
  }

  /* ---------------------------------------------------------------- *
   * THE PER-FRAME STEP.
   * ---------------------------------------------------------------- */
  const stepper = createCameraBlendStepper(sceneApi, director, lens, guarded, endCamBlend);

  /** One step of the direct-jump camera blend. Runs INSIDE applyFrame, right
   *  after the director has written the destination pose and before anything
   *  reads the camera — see the frame-order block above applyFrame. State is
   *  already AT the destination; the camera glides straight from where it was
   *  onto that pose. A blend manual input has cancelled never reaches here:
   *  applyFrame drops it at the top of the frame.
   *
   *  Not guarded() by name: a latched-dead blend would strand `camBlend` and
   *  leave the chapters detached for the rest of the session, so a throw
   *  abandons the blend instead — the camera keeps the destination pose the
   *  director just wrote, which is where the jump was going anyway. */
  function stepCamBlend(dt) {
    // The lap's odometer (see beginBlend). A dt of 0 is a PLACEMENT, not a
    // frame of travel — it composes the same pose twice and moves the clock
    // nowhere — so it may not buy the lap the right to land.
    if (camBlend && dt > 0) camBlend.advanced = true;
    try { stepper(camBlend, railWrap || railFlight, dt); }
    catch (err) {
      console.error('[journey] camera blend threw — the jump lands directly:', err);
      endCamBlend();
    }
  }

  return {
    /* Reads. The blend object itself is exposed because directJumpTo reads
       its `routeFaithful` flag and applyFrame reads its `presentedP` and
       `wrapDir`; the stepper mutates it in place, so a copy would lie. */
    get blend() { return camBlend; },
    get railWrap() { return railWrap; },
    get railFlight() { return railFlight; },
    get cameraStateDisagree() { return cameraStateDisagree; },
    get heroExiting() { return !!heroExit; },
    /** A fully rewound wrap: the lap has run back past its own first frame.
     *
     *  ...AND IT MUST HAVE HAD A FIRST FRAME TO RUN BACK PAST (2026-08-30 —
     *  the rapid-bookend report: the view resets, and the move that should
     *  have transitioned arrives already finished). Two bookend controls
     *  pressed between two animation frames — Purpose, then Intro — reach
     *  steerWrapTo() while the lap they name is still standing on t = 0.
     *  steerWrapBlend sets play = -1, and without the odometer below this
     *  getter was true on the spot, so the very next spineFrame landed a lap
     *  that had flown NOTHING: placeAt(homeP) with the placement snap, every
     *  chapter thrown to its home target, the camera handed back to the hero
     *  — the heaviest reset in this file, fired in the middle of an
     *  interaction, with no travel to unwind and no frame of it drawn.
     *
     *  `advanced` delays a genuine landing by at most one frame (the next
     *  stepCamBlend arms it, and that step composes the lap's own first frame
     *  — which is the home pose, so nothing jumps). What it buys is that the
     *  ticket stays LIVE across a reversal that arrived too early: a third
     *  press steers the same lap, as steerWrapTo was written to, instead of
     *  meeting a journey that has already been re-placed underneath it. */
    get rewoundHome() {
      return !!camBlend && camBlend.advanced
        && camBlend.play < 0 && camBlend.t <= 0;
    },
    get chapterEntry() { return chapterEntry; },
    set chapterEntry(v) { chapterEntry = v; },

    blendCancelled,
    dropCamBlend,
    steerWrapBlend,
    steerWrapTo,
    landWrapHome,
    endCamBlend,
    setBlending,
    stepCamBlend,

    armHeroExit,
    armHeroEntry,
    cancelHeroEntry,
    setHeroEntryPlay,
    stepHeroExit,
    stepHeroEntry,

    abandonForJump,
    clearHeroTerms,
    beginFlight,
    beginBlend,
  };
}
