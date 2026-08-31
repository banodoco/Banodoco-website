/* ==================================================================== *
 * journey/ui/hotspot-frame.js — the hotspot PLACEMENT machine (order U06).
 *
 * WHAT IT OWNS: everything a registered chip does between one frame and the
 * next — whether it is revealed at all, where on the screen it lands, how
 * big its hit pad is, and whether it is in the tab order. It owns none of
 * registration, none of the DOM construction, and none of the hover/focus/
 * touch state; those are `journey/ui.js` and `journey/ui/hot-state.js`.
 *
 * WHY IT EXISTS. This was ~330 lines in the belly of `createUI`'s
 * `update()`, and it was the reason `update()` was a 480-line body with
 * `composed: false` and depth 5 rather than a composition. Seven of the
 * eight mutable bindings `update()` owned lived in here, including both of
 * the tree's last two `WIDE` bindings — `w` and `tx`, which passed G2 only
 * because "all writes in one named transition function" and that function
 * was 480 lines long. A 480-line transition is the clause being satisfied
 * rather than met (D159). Here they are locals of 40- and 20-line functions.
 *
 * ---- THE FRAME IS TWO PHASES, AND THE SPLIT IS LOAD-BEARING ---------
 *
 * `measure()` reads the DOM. `place()` writes it. Nothing in between, and
 * never the other way round.
 *
 * Interleaving a read with the writes would force a reflow PER CHIP. That
 * was already true when both phases sat inside one function, but it was
 * true by the discipline of whoever edited next; here it is true because
 * `update()` calls two things in an order it can see. The rail's own
 * measurement (`rail-mask.js`) lands between them, deliberately: it is a
 * read, so it belongs on the read side of the barrier, and it must happen
 * after `rail.update()` has painted.
 *
 * ---- G3: NAME THE MACHINE -------------------------------------------
 *
 * One machine per chip, all of them stepped together. There is no
 * module-level mutable state at all — every binding below is a local of one
 * function, and the per-chip state lives on the chip record (see OWNERSHIP).
 *
 *   states   ABSENT -> ARMING -> PRESENT -> LEAVING -> ABSENT
 *   mode     `h.a`, the chip's single reveal clock, 0..1. It is the ONE
 *            truthful arrival value: it begins after the chapter stagger,
 *            follows the SLOWER of a scene-supplied reveal and its own
 *            performed beat when the chapter offers one (see beatEnvelope),
 *            reverses on departure, and snaps on a dt=0 placement. `.vis`,
 *            the tab index, the hit-pad size and the icon-tab's inner
 *            entry sequence are all DERIVED from it and never from a timer
 *            or a CSS animation — which is what keeps hover out of the
 *            lifecycle entirely: a hover cannot replay an entry.
 *   events   the gate opening (copy ease, or the chapter's own `reveal`)
 *            -> ARMING; `h.armAt` elapsing -> PRESENT; the gate closing,
 *            a detail opening, the node leaving the frame, the copy block
 *            covering it, or the rail masking it -> LEAVING.
 *   clock    `dt` only. `h.armAt` is a deadline on the shared frame clock,
 *            not a timer; this module arms nothing and cancels nothing, so
 *            it contributes zero to the destroy census by construction.
 *
 * ---- OWNERSHIP OF THE CHIP RECORD (D153: one property, one owner) ---
 *
 * The record is created by `addHotspot` in `journey/ui.js`. Its fields split
 * cleanly in two, and the split is the seam this module draws:
 *
 *   IDENTITY + DOM, written by ui.js at registration and never after:
 *     id chapter btn world radius reveal revealDirect revealScrub
 *     revealBand stagger iconTab soon label labelEl dotEl hitEl chipBare
 *     preview policyDone labelOnHover
 *   PER-FRAME, written by THIS MODULE and by nothing else:
 *     a armAt sup pillW pillH placeable layoutPlaceable pendX sx sy
 *     dodgeY dodgePrev hitRaw hitR padLast flipped holdAt holdOff
 *     beatAt beatA          — the performed beat's slot and phase; see
 *                             beatEnvelope
 *
 * `h.hot` is a third thing and belongs to neither: `hot-state.js` owns it,
 * this module only reads it (in `holdAnchor`). That is the ONE cross-module
 * property write on this record, it predates this order, and it is the blind
 * spot U04 named — the census's six flow forms do not include
 * return-through-import plus member call, so G1 = 0 does not testify about
 * it either way. Recorded here rather than left implicit.
 * ==================================================================== */

import { bandOpacity, clamp01, smoothA } from './bands.js';
import {
  HOTSPOT_STAGGER_MS, HOTSPOT_IN_K, HOTSPOT_OUT_K, HOTSPOT_HOLD_HOME_K,
  HOTSPOT_DODGE_GAP, HOTSPOT_DODGE_MAX,
} from '../constants.js';
/* FROM THE DOMAIN MODULE, NOT THE FACADE, AND ON PURPOSE (DEFECT-01 #3).
   `journey/constants.js` is a COMPATIBILITY facade: its job is that every name
   it exported before the F01 split still resolves there. `HOTSPOT_ARRIVAL`
   did not exist before the split, so it has no compatibility to keep — and
   `tools/fixtures/constants.compat-fixture.mjs` pins the facade's export set by
   membership AND length, so widening it would move a pin (and force a
   regeneration of a fixture that also covers route, symbols, structure and
   navigation) to buy nothing. New constants belong to their domain module. */
import { HOTSPOT_ARRIVAL } from '../constants/copy.js';

/** Carry a visible initiative marker through a direct-navigation departure.
 *
 * A route click makes the destination semantic immediately, which retires the
 * source chapter's scene reveal in the synchronous placement frame. Copy does
 * not retire there: copy-arrival.js preserves its painted source snapshot and
 * fades it over the opening camera-flight phase. Without this carry, the item
 * heading follows the now-zero scene gate and disappears under the click.
 *
 * The snapshot is proportional rather than assumed to be one. Interrupting a
 * half-arrived marker therefore starts its exit at the opacity actually on
 * screen and can only decrease from there. Returning `null` means the ordinary
 * scene/copy gate remains authoritative. */
export function hotspotDepartureOpacity(h, {
  currentChapterId, railFlight, copyGate,
}) {
  const continuing = !!railFlight && h.departureTicket === railFlight;
  /* `soon` chips carry too (R3): their reveal is the chapter's own ring
     ladder, and a route click snaps journey state — and with it the band the
     ladder's gate is read against — to the destination in the placement
     frame, which would take a standing pill to zero on the click. The same
     one-authority exit the initiative markers get is the fix: fade on the
     source copy envelope, from the opacity actually painted. */
  const starting = !!railFlight && (h.iconTab || h.soon)
    && h.chapter !== currentChapterId && h.a > 0.015;

  if (!continuing && !starting) {
    h.departureTicket = null;
    h.departureA = 0;
    h.departureCopy = 0;
    return null;
  }
  if (!continuing) {
    h.departureTicket = railFlight;
    h.departureA = clamp01(h.a);
    h.departureCopy = Math.max(1e-6, clamp01(copyGate));
  }
  const copyRatio = clamp01(copyGate / h.departureCopy);
  return Math.min(h.departureA, h.departureA * copyRatio);
}

/** The initiative marker's three inner opacity channels.
 *
 * Arrival keeps the authored staged formation. During a direct departure the
 * button itself is already fading on the source copy envelope, so applying
 * these curves again would multiply one fade by another: the label reached
 * effective zero while the chapter copy was still nearly half visible. Keep
 * the inner pieces opaque on that path and let the same formation values keep
 * driving their rise/scale in reverse underneath the one shared outer fade. */
export function hotspotIconTabOpacity(u, departing = false) {
  const icon = smoothA(clamp01(u / 0.62));
  const shell = smoothA(clamp01((u - 0.10) / 0.62));
  const label = smoothA(clamp01((u - 0.14) / 0.78));
  return departing
    ? { icon: 1, shell: 1, label: 1 }
    : { icon, shell, label };
}

/**
 *  @param {object}   io
 *  @param {Array}    io.hotspots       the registry array, BY IDENTITY.
 *  @param {object}   io.blocks         chapter id -> copy block element.
 *  @param {object}   io.sheetQuery     the coarse-pointer media query.
 */
export function createHotspotFrame({ hotspots, blocks, sheetQuery }) {
  /** Hold a hovered chip's anchor still, and glide it home on release.
   *
   *  IT CANNOT DRIFT OUT OF ALIGNMENT WITH A LONG HOVER. The anchor's motion
   *  is a bounded oscillation, not a drift: traced over 24 s the live anchor's
   *  distance from a fixed one runs 0 -> 39 px -> 0 with a ~5 s period and
   *  returns to under 1 px four times. So the held chip's error is bounded by
   *  the swing, never accumulates, and the node keeps coming back to it.
   *
   *  RELEASE IS A MOVEMENT, NOT A JUMP. Going cold does not restore the live
   *  anchor in one frame. The hold becomes an OFFSET — where the chip is minus
   *  where its node now is — and that offset decays geometrically to zero, so
   *  the chip glides back onto its node and is then dropped entirely.
   *
   *  The offset, and not a lerp of the held point toward the live one, because
   *  the live one is MOVING: a first-order lag chasing a moving target settles
   *  at a nonzero steady-state error (measured here: the anchor's typical
   *  0.27 px/frame against a 0.1/frame gain parks the chip ~2.7 px behind its
   *  node, forever). Decaying the offset instead converges on zero whatever
   *  the node is doing, and the hold is released outright below 0.001 world
   *  units (~0.14 px).
   *
   *  dt === 0 is the placement path (deep link, ?p=, the ?capture= freeze):
   *  nothing is hot there and any hold is dropped outright, so every frozen
   *  golden is bit-identical by construction.
   *
   *  2026-08-10 ADDENDUM: the fix landed at the SOURCE — Inspire's nodeWorld()
   *  anchors each chip to its release lip at the mushroom's REST pose, and
   *  Connect's hubs and Owned's faces were static world points all along. So
   *  every live anchor this loop reads is now constant and this hold is a
   *  GUARD: it costs nothing against a static anchor and keeps the hot state
   *  honest if any future chapter registers a moving one. */
  function holdAnchor(h, live, dt) {
    if (!live) { h.holdAt = h.holdOff = null; return null; }
    if (h.hot) {
      h.holdOff = null;
      if (!h.holdAt) h.holdAt = live.clone();
      return h.holdAt;
    }
    // the frame the hover ends, the held POINT becomes a held OFFSET
    if (h.holdAt) { h.holdOff = h.holdAt.sub(live); h.holdAt = null; }
    if (!h.holdOff) return live;
    if (dt === 0) { h.holdOff = null; return live; }
    h.holdOff.multiplyScalar(Math.max(0, 1 - dt * HOTSPOT_HOLD_HOME_K));
    if (h.holdOff.lengthSq() < 1e-6) { h.holdOff = null; return live; }
    return h.holdOff.clone().add(live);
  }

  /** PHASE ONE — every DOM read this module makes, in one pass, before any
   *  transform is written this frame.
   *
   *  A chip is only measured while it is NOT flipped (the flip is a mirror,
   *  not a resize — row-reverse plus swapped padding is the same width — so
   *  the measurement is valid in either state). It is re-measured every frame
   *  rather than cached because a width taken on the first frame, before the
   *  stylesheet and the webfont have settled, reads short, and a flip computed
   *  from a short width puts the DOT off the frame instead of the label. */
  function measure() {
    for (const h of hotspots) { h.pillW = h.btn.offsetWidth; h.pillH = h.btn.offsetHeight; }
  }

  /** May this chip be drawn at the point it projects to? Three refusals, in
   *  the order they have always been tested.
   *
   *  IT WRITES `h.sup` AND NOTHING ELSE. The suppression latch is the reason
   *  this is a named function rather than a nested block: it carries
   *  HYSTERESIS (enter at +8 px, leave at +26 px) because the organism's
   *  ambient sway moves projections a few px per second and a single margin
   *  made borderline labels strobe — so it has memory, and a thing with
   *  memory deserves a name. */
  function admits(h, v, sx, sy, excluded) {
    // Behind the camera, or too near the frame edge to be placeable.
    // A chip with a HIT PAD gets the wider bound: the old 0.92/0.90 was
    // sized for a pill that had to carry a readable label from its dot,
    // but a pad chip's target is the dot's own circle and the pill flips
    // or nudges around it. It mattered — Owned's arc reaches |ndc x| 0.912
    // by construction, 0.008 from silently having no hotspot at all.
    const bx = h.radius ? 0.97 : 0.92;
    const by = h.radius ? 0.94 : 0.9;
    if (v.z > 1 || Math.abs(v.x) > bx || Math.abs(v.y) > by) return false;
    // The WebGL portrait layers and their DOM control share the mask
    // calculated by rail-mask.js. Keeping this lookup here (instead of
    // repeating the geometry test) makes their visibility atomic within the
    // rAF. Node ids are globally unique (structure.js validates it), so the
    // union test is the same test the `h.chapter === 'owned' &&` guard
    // performed — and the set only ever contains nodes whose own chapter
    // declared a hit radius. §5.5.
    const masked = excluded.has(h.id);
    // The chapter's editorial copy owns its area of the frame: a hotspot that
    // projects into it is suppressed rather than drawn on top of the text.
    // Hit model stays honest — a suppressed hotspot is also removed from the
    // tab order, so keyboard and pointer agree.
    const cb = blocks[h.chapter];
    if (!masked && cb && cb.style.visibility === 'visible') {
      const r = cb.getBoundingClientRect();
      const m = h.sup ? 26 : 8;
      h.sup = sx > r.left - m && sx < r.right + m && sy > r.top - m && sy < r.bottom + m;
      if (h.sup) return false;
    } else h.sup = false;
    return !masked;
  }

  /** Where one chip's world anchor lands on screen this frame, and whether it
   *  may be drawn there at all. Returns `{ want, w, sx, sy }`. */
  function resolvePlacement(h, { geom, dt, gate, detail, reserveLayout, excluded }) {
    let want = gate > (h.revealDirect ? 0 : 0.72) && !detail;
    let w = (want || reserveLayout) ? h.world() : null;
    w = want ? holdAnchor(h, w, dt) : w;
    let sx = 0, sy = 0;
    h.hitRaw = 0;
    if (w) {
      const v = geom.project(w.clone());
      sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (!admits(h, v, sx, sy, excluded)) { w = null; sx = 0; sy = 0; }
    }
    want = want && !!w;
    return { want, w, sx, sy };
  }

  /** Step one chip's reveal clock. THE ARRIVAL STAGGER, and why a hover-only
   *  chip is not in it (2026-08-14, Hannah: "no ~5-second delay before it
   *  becomes active").
   *
   *  The stagger is a REVEAL choreography: the chapter's labels arrive one per
   *  HOTSPOT_STAGGER_MS in narrative order, so a frame does not gain five
   *  pills at once. It is authored for chips that DRAW something at rest —
   *  Inspire's three, Connect's three — and for those it is exactly right.
   *
   *  A `labelOnHover` chip draws NOTHING at rest. The injected label-policy
   *  rule is `.j-hot.label-hover > * { opacity: 0 }` — dot, label and pad alike
   *  — so for Owned's sixteen faces the staggered `h.a` ramp is an opacity
   *  envelope on an object with nothing visible inside it. What it does have
   *  is consequences: `h.a` gates `.vis` (visibility and pointer-events), the
   *  hit pad's SIZE, and `tabIndex`. So on this chapter the stagger was
   *  choreographing nothing and delaying everything.
   *
   *  Measured before, nav jump into Owned at 1440x900: first chip live at
   *  996 ms (the copy gate, which is the chapter's arrival and is correct),
   *  LAST chip live at 3253 ms — 15 x 150 ms of stagger on top. It was
   *  harmless while hover only lit a node; it is the difference between a live
   *  section and a dead one now that hover is the disclosure.
   *
   *  So the fix is not to the constant — 150 ms is right for the chips it was
   *  written for — but to WHO IS IN THE QUEUE. A chip with no resting mark has
   *  no arrival to stage, so it arms on the frame it becomes placeable.
   *
   *  A `reveal` chip is likewise not in the queue: its cadence is the scene's
   *  own (Connect's lights land seconds apart), and 150 ms of stagger on top
   *  of that is noise — worse, it is ORDERED by registration (importance),
   *  which is not the order the lights land. */
  /** THE PERFORMED ARRIVAL, as an envelope this chip may not outrun.
   *
   *  Returns 0..1. `advanceReveal` takes the `min` of it and the scene gate,
   *  and that `min` IS the design (DEFECT-01 #3 for the onset; ICON-ARRIVAL
   *  2026-08-23 for the duration). Since CONNECT-SYNC this envelope belongs
   *  to `revealDirect` chips alone: a `revealScrub` chip's marker is one
   *  object with the scene event it annotates, so its tempo floor lives in
   *  the chapter's own light drive and the chip follows the gate whole —
   *  two clocks on one object was the owner's misalignment report.
   *
   *    · Forward, slow — the scene may still be the slower of the two at any
   *      moment, and wherever it is, it is the whole of the answer.
   *    · Forward, fast — the visitor outruns the choreography, the envelope
   *      becomes the authority: the beats keep their spacing (beatGapMs) and
   *      each marker's formation keeps its length (formMs). The formation
   *      floor is the ICON-ARRIVAL addition — before it, the gesture's clock
   *      was the scene gate itself, and Inspire's first ember saturates its
   *      gate in ~116 ms on a settled arrival, so the entrance played as a
   *      pop however it was drawn.
   *    · REVERSE — the `min` takes the FALLING scene gate, so a label
   *      withdraws with its own light on the same frame. The bug that
   *      motivated "the reveal is a position" cannot recur here by
   *      construction: nothing this function returns can raise `h.a`.
   *    · dt === 0 — snaps to 1, so `min` is the scene value exactly and a
   *      capture, a `?p=` deep link and a `?capture=` still stay bit-identical.
   *
   *  THE PHASE IS A POSITION ON THE BEAT CLOCK, not an eased chase:
   *  `(now - beatAt) / formMs`, latched monotonic through `Math.max` so the
   *  dt = 0 snap above cannot be un-snapped by the next live frame. A dropped
   *  frame therefore cannot compress the performance, and two machines of
   *  different frame rates perform it in the same wall time.
   *
   *  SLOTS ARE ASSIGNED IN GATE-OPENING ORDER, not from a per-chapter table.
   *  This is only called once a chip's gate has actually opened, so the order
   *  chips arm in IS the order their lights land — which is what the visitor
   *  is watching, and is not necessarily registration order. The chapter's
   *  latest armed beat is read off the sibling records rather than held in a
   *  binding, which keeps this module's "no module-level mutable state at all"
   *  true (see the header) and costs one pass over at most a chapter's chips,
   *  once, on the frame a beat arms. */
  function beatEnvelope(h, dt, now) {
    if (dt === 0) { h.beatAt = now; h.beatA = 1; return 1; }
    if (h.beatAt === null) {
      let latest = null;
      for (const o of hotspots) {
        if (o === h || o.chapter !== h.chapter || o.beatAt === null) continue;
        if (latest === null || o.beatAt > latest) latest = o.beatAt;
      }
      h.beatAt = latest === null ? now : Math.max(now, latest + HOTSPOT_ARRIVAL.beatGapMs);
    }
    h.beatA = Math.max(h.beatA,
      Math.min(1, (now - h.beatAt) / HOTSPOT_ARRIVAL.formMs));
    return smoothA(h.beatA);
  }

  function advanceReveal(h, { want, gate, departureOpacity, dt, now }) {
    /* A click departure has one opacity authority: the source copy that is
       visibly fading beside it. Feeding that value through paintIconTab()
       below plays the initiative's existing condense-in gesture backward —
       name, housing, then pictograph — on the same complete flight interval
       as the chapter heading and paragraph. */
    if (departureOpacity !== null) {
      h.armAt = null;
      h.a = departureOpacity < 0.002 ? 0 : departureOpacity;
      return;
    }
    if (want) {
      if (h.revealDirect) {
        /* Inspire owns its per-item cadence (the landing cascade), and the
           `min` mirrors that source — which keeps reverse scrubs truthful —
           while the performed envelope puts a floor under the beat's spacing
           and its formation. Before ICON-ARRIVAL this branch was `h.a = gate`
           outright; the ember's own gate remains the ceiling, so a marker
           still cannot lead the light it condenses out of, and departure is
           the gate alone (beatEnvelope cannot raise h.a). */
        h.armAt = null;
        h.a = Math.min(gate, beatEnvelope(h, dt, now));
      } else if (h.revealScrub) {
        /* Preserve Connect's authored 72% readiness floor while making the
           marker above it a PURE function of the same node-light envelope.
           No independent dt tail may outlive the core it annotates — and no
           independent clock may trail it either (CONNECT-SYNC, 2026-08-23:
           "when I navigate in, it's perfectly aligned, but when I scroll in,
           it is misaligned"). DEFECT-01 #3's beat floor sat here as
           `min(gate, beatEnvelope)` and ICON-ARRIVAL widened it to the whole
           formation; on this chapter that separated the label from the dot
           it is authored to be ONE OBJECT with. The tempo floor those
           orders wanted still exists — it moved into the chapter's own
           light drive (chapters/connect THE ARRIVAL IS PERFORMED), where it
           paces dot and label together off one clock. So a scrubbed chip is
           the gate, whole: up, down, at any speed, and dt = 0 needs no
           special case because the gate itself is settled there. */
        h.armAt = null;
        h.a = smoothA(clamp01((gate - 0.72) / 0.28));
      } else {
        if (h.armAt === null) h.armAt = now + ((h.labelOnHover || h.reveal) ? 0 : h.stagger * HOTSPOT_STAGGER_MS);
        if (dt === 0) h.a = 1;
        else if (now >= h.armAt) h.a += (1 - h.a) * Math.min(1, dt * HOTSPOT_IN_K);
      }
    } else {
      h.armAt = null;
      /* The beat is disarmed WITH THE GATE — not with `want` — so re-entering
         the chapter starts a fresh set of slots in whatever order the lights
         land THAT time, while a chip hidden by an open card (or a transient
         placement refusal) KEEPS its performance: the landing was already
         performed, and a re-emergence is not a second landing — closing a
         card restores the frame outright instead of replaying a 1.4 s
         cascade at every dismissal (ICON-ARRIVAL; with the formation floor,
         the pre-existing whole-branch reset would have turned every card
         close into a ceremony). It is tested for every chip, not only the
         scrubbed ones: a field with one owner is cleared in one place. */
      if (gate <= (h.revealDirect ? 0 : 0.72)) {
        h.beatAt = null;
        h.beatA = 0;
      }
      /* THE RELEASED DEPARTURE (LABEL-EXIT, 2026-08-24). A `revealDirect` or
         `revealScrub` chip used to snap to 0 here in ONE frame — correct when
         the gate itself had closed (the label leaves with its light, and the
         `min` above already walked h.a down to the gate's own value), but the
         same snap also fired on every departure where the gate was still
         OPEN: a placement refusal (off the frame bound, behind the copy
         block, under the rail mask) and a modal detail claiming the frame.
         Those departures have no scene clock — the light is still lit — so
         the one-frame vanish was a switch nobody authored.

         Now the fall gets the release every ordinary chip has always had
         (HOTSPOT_OUT_K, the same family as HOTSPOT_HOLD_HOME_K's "releasing
         a hover is a movement and not a jump") — and because the whole
         gesture in paintIconTab is derived from h.a, the release IS the
         entrance played backwards: the name lets go first, the housing folds
         to the centre line, the mark condenses back toward its node under
         the falling opacity.

         THE CEILING KEEPS THE PROOF. The released value is min'ed with the
         same gate mapping the arrival used, so `h.a <= scene ceiling` stays
         true on EVERY frame by construction, not by luck: a departure whose
         gate has closed still meets a ceiling of 0 — byte-for-byte the old
         snap — and only a departure whose light still stands gets the
         ~110 ms of shaped leave-taking. Nothing here can raise h.a (min of
         a decay and a ceiling), so a label still cannot outlive its light,
         forward or reverse, at any speed. dt = 0 stays the placement path:
         a frozen capture or ?p= deep link lands with the chip gone outright. */
      if (dt === 0) h.a = 0;
      else {
        const released = h.a + (0 - h.a) * Math.min(1, dt * HOTSPOT_OUT_K);
        if (h.revealDirect) h.a = Math.min(released, gate);
        else if (h.revealScrub) h.a = Math.min(released, smoothA(clamp01((gate - 0.72) / 0.28)));
        else h.a = released;
        if (h.a < 0.02) h.a = 0;
      }
    }
  }

  /** This chip's resolved translate-x, before the collision dodge. `tx` is
   *  the second of the two bindings that used to be `WIDE`; it is a local of
   *  twenty lines here. */
  function resolveX(h, sx) {
    let tx;
    if (h.iconTab) {
      /* A centred tab changes the truthful local anchor from x=11 to the
         marker's midpoint. Re-derive translate-x from the measured width
         so the icon — not merely the button box — still lands exactly on
         the projected world node. The shape is symmetric, so edge-flip
         has no visual or geometric job here. */
      if (h.flipped) {
        h.flipped = false;
        h.btn.classList.remove('flip');
      }
      tx = sx + 11 - h.pillW * 0.5;
    } else {
      // Edge flip: the ordinary pill runs RIGHT of its dot, so a node near
      // the right edge mirrors the label while leaving the dot on the node.
      const over = sx + h.pillW - 11 - (window.innerWidth - 12);
      const flip = (h.flipped ? over > -14 : over > 0) && sx - h.pillW + 21 > 0;
      if (flip !== h.flipped) { h.flipped = flip; h.btn.classList.toggle('flip', flip); }
      tx = flip ? sx + 21 - h.pillW : sx;
    }
    // Narrow viewports can leave a pill that fits on NEITHER side (a
    // 232px label anchored at x 160 of 375). Nudge it in, but never far:
    // past ~26px the dot stops reading as sitting on its node, and a
    // truthful dot with a clipped tail beats a chip pointing at nothing.
    const lo = 15, hi = window.innerWidth - 4 - h.pillW + 11;
    const want2 = hi >= lo ? Math.min(Math.max(tx, lo), hi) : tx;
    tx += Math.max(-26, Math.min(26, want2 - tx));
    return tx;
  }

  /** THE INITIATIVE MARKER'S INNER ARRIVAL — the condense (ICON-ARRIVAL,
   *  2026-08-23, from the owner's own sketch: "it starts from the middle and
   *  then both the lines and the icon kind of expand out while the icon kind
   *  of grows and then shrinks back down to size").
   *
   *  WHAT IT SAYS. The marker does not pop beside its node; it condenses out
   *  of it. Three movements, in the order the eye needs them:
   *
   *    1. the MARK takes shape first — the pictograph fades up at the node's
   *       centre, small (0.55), and takes ONE BREATH: past itself to ~1.15
   *       near mid-gesture, settled back to exactly 1.0 by the end. The whole
   *       back half of the gesture is the settle, which is what keeps it
   *       patient rather than springy — a spring crosses 1.0 and comes back;
   *       this never crosses, it only arrives.
   *    2. the HOUSING unfolds around it — the capsule and the tab backing
   *       scale out horizontally from the centre line ("the lines expand
   *       out"), completing at ~3/4 of the gesture.
   *    3. the NAME rises with the unfolding housing after a short icon lead,
   *       then settles just before the pictograph finishes its breath.
   *
   *  Derived from `h.a` — whose pace is now the performed envelope, see
   *  beatEnvelope — rather than from a CSS animation or a timer started when
   *  `.vis` changes. That keeps hover completely out of the lifecycle (it
   *  cannot replay the entry), runs the same curve backwards on a reverse
   *  scrub, and leaves the button's own transform exclusively available to
   *  the world-placement and collision-dodge pass. The CSS side of the seam:
   *  cards.css owns which element each variable lands on; the two ICON-
   *  ARRIVAL variables (--j-hot-shell-sx, --j-hot-ico-s) land through
   *  site.css on the individual `scale` property, which composes with
   *  cards.css's `transform` templates without touching them.
   *
   *  WHAT WOULD BREAK IT. Every curve must return EXACTLY its identity value
   *  at h.a = 1 — sin(π) is exactly 0, the smoothA args all clamp to 1 —
   *  because dt = 0 snaps h.a to the settled gate and ten protected goldens
   *  freeze that frame. An overshoot term that does not vanish at u = 1, or
   *  a lead that leaves a ramp unfinished there, moves every capture. */
  function paintIconTab(h, departing = false) {
    const u = h.a;
    // 1. the mark: opacity and rise finish at u = 0.62 …
    const iconIn = smoothA(clamp01(u / 0.62));
    // … while its size takes the whole gesture: condense from 0.55, one
    // sin²-shaped breath of +0.16 peaking near u = 0.54, zero again at u = 1.
    const breath = Math.sin(Math.PI * clamp01((u - 0.08) / 0.92));
    const markS = 0.55 + 0.45 * smoothA(clamp01(u / 0.55)) + 0.16 * breath * breath;
    // 2. the housing: unfolds from the centre line, done by u = 0.80.
    const shellIn = smoothA(clamp01((u - 0.10) / 0.62));
    const shellSx = 0.24 + 0.76 * smoothA(clamp01((u - 0.10) / 0.70));
    // 3. the name follows the housing after one short beat, rather than
    // waiting until the icon is almost complete. The former 0.44 onset left
    // it fully absent for 308 ms of this 700 ms formation, then double-eased
    // its appearance through the parent opacity — an icon followed by a text
    // pop instead of one joined marker assembling. 0.14 buys a ~98 ms lead
    // for the pictograph and lets the name settle just before the final icon
    // breath, so all three movements overlap without becoming simultaneous.
    const labelIn = smoothA(clamp01((u - 0.14) / 0.78));
    const opacity = hotspotIconTabOpacity(u, departing);
    h.btn.style.setProperty('--j-hot-shell-in', opacity.shell.toFixed(3));
    h.btn.style.setProperty('--j-hot-shell-y', `${((1 - shellIn) * 1.5).toFixed(2)}px`);
    h.btn.style.setProperty('--j-hot-shell-sx', shellSx.toFixed(3));
    h.btn.style.setProperty('--j-hot-icon-in', opacity.icon.toFixed(3));
    h.btn.style.setProperty('--j-hot-icon-y', `${((1 - iconIn) * 2.5).toFixed(2)}px`);
    h.btn.style.setProperty('--j-hot-icon-scale', (0.92 + iconIn * 0.08).toFixed(3));
    h.btn.style.setProperty('--j-hot-ico-s', markS.toFixed(3));
    h.btn.style.setProperty('--j-hot-label-in', opacity.label.toFixed(3));
    h.btn.style.setProperty('--j-hot-label-y', `${((1 - labelIn) * 2.5).toFixed(2)}px`);
  }

  /** THE SOON CHIP'S ARRIVAL IS A RISE (R3, the owner's direction: "the items
   *  should appear going UP"). A plain-pill chip in the third state drifts in
   *  from 10 px below its resting seat as its reveal clock climbs, riding the
   *  individual `translate` property for exactly the reason ICON-ARRIVAL's
   *  gesture rides `scale`: it composes with the placement/dodge `transform`
   *  without touching it. Derived from `h.a` — the beat-enveloped arrival
   *  clock — so the two chips rise one beatGapMs apart, a reverse scrub plays
   *  the drift backwards, and dt = 0 (h.a snapped to the settled gate) lands
   *  the chip seated with the property removed, byte-identical to a chip
   *  nobody painted. A direct DEPARTURE keeps the seat: the source copy fade
   *  owns that exit, and a chip sliding downward under a fade it does not own
   *  would read as a second, unauthored movement. */
  function paintSoonRise(h, departing = false) {
    const rise = departing ? 0 : (1 - smoothA(h.a)) * 10;
    if (rise < 0.01) h.btn.style.removeProperty('--j-hot-rise');
    else h.btn.style.setProperty('--j-hot-rise', `${rise.toFixed(2)}px`);
  }

  /* PILL COLLISION DODGE (2026-08-10). With every anchor now a static world
     point, two resting pills can sit in permanent overlap: at 375x812
     Inspire's lip anchors project 125 px apart while Arca's pill runs 168 px,
     so its tail lay across ArtCompute's dot (measured 43 x 11 px of rect
     overlap, the label text passing ~1 px above the dot). For ordinary ember
     pills the LABEL moves while the dot is pinned back onto its node by the
     compensating --j-dot-dy translate. A joined icon-tab is deliberately
     indivisible: its tab rises with its capsule while the invisible hit pad
     alone uses --j-dot-dy to remain on the world node. Chips are processed
     bottom-of-frame first, each resolved against the already-final pills
     below it, which makes the pass exact in one sweep for any chain that
     raises upward. Pure in this frame's geometry — no eased state, so dt = 0
     places the dodged frame outright and a ?p= deep link is bit-stable. It
     applies in every state — hover included — because with static anchors the
     dodge is itself static, so nothing ever shifts under a pointer;
     labelOnHover chips (Owned's faces) carry no resting pill, so they neither
     dodge nor cause one, and cross-chapter pairs never co-place (the copy gate
     is exclusive). */
  function resolveDodge() {
    const placed = hotspots.filter(h => h.layoutPlaceable && !h.labelOnHover);
    placed.sort((a, b) => b.sy - a.sy);          // bottom of the frame first
    const resolved = [];
    for (const h of placed) {
      let dy = 0;
      const x0 = h.pendX - 11, x1 = x0 + h.pillW;
      for (const f of resolved) {
        if (f.chapter !== h.chapter) continue;
        const fx0 = f.pendX - 11, fx1 = fx0 + f.pillW;
        if (x1 <= fx0 || fx1 <= x0) continue;
        const fTop = f.sy - 11 - f.dodgeY;
        const myBot = h.sy - 11 - dy + h.pillH;
        const need = myBot + HOTSPOT_DODGE_GAP - fTop;
        if (need > 0) dy = Math.min(dy + need, HOTSPOT_DODGE_MAX);
      }
      h.dodgeY = dy;
      resolved.push(h);
    }
    for (const h of hotspots) {
      if (!h.placeable) continue;
      h.btn.style.transform = `translate(${h.pendX}px, ${(h.sy - h.dodgeY).toFixed(1)}px)`;
      if (h.dodgeY !== h.dodgePrev) {
        h.dodgePrev = h.dodgeY;
        if (h.dodgeY) h.btn.style.setProperty('--j-dot-dy', `${h.dodgeY.toFixed(1)}px`);
        else h.btn.style.removeProperty('--j-dot-dy');
      }
    }
  }

  /* HIT PAD SIZING, second pass — writes only, so it costs no reflow.
     A pad is as big as its node draws, with two limits:
       · it may never reach more than 48% of the way to the nearest other
         live pad, or two neighbours would fight over the same pixels and
         the answer would depend on DOM order rather than on aim;
       · a floor of 15 px, because a far node still has to be catchable —
         22 px (a 44 px target) under the same media query PL-1.4 uses, so
         the pad carries the touch minimum the pill no longer does there —
         and a ceiling of 56 px, because a foreground face that fills a
         sixth of the frame does not get to own a sixth of the pointer. */
  function resizePads() {
    const padFloor = sheetQuery.matches ? 22 : 15;
    const padded = hotspots.filter(h => h.hitRaw > 0 && h.a > 0.015);
    for (const h of padded) {
      let cap = 56;
      for (const o of padded) {
        if (o === h) continue;
        cap = Math.min(cap, Math.hypot(o.sx - h.sx, o.sy - h.sy) * 0.48);
      }
      h.hitR = Math.max(padFloor, Math.min(h.hitRaw, cap));
      // The last LIVE pad radius, kept after the pad is torn down. dismissCard()
      // needs to ask "is the pointer on that face?" while the chip is hidden
      // under a pinned card, which is exactly when `hitR` has been zeroed.
      h.padLast = h.hitR;
      h.hitEl.style.setProperty('--j-hit', `${(h.hitR * 2).toFixed(1)}px`);
    }
    for (const h of hotspots) {
      if (h.hitRaw > 0 && h.a > 0.015) continue;
      if (h.hitR !== 0) { h.hitR = 0; h.hitEl.style.setProperty('--j-hit', '0px'); }
    }
  }

  /** PHASE TWO — every DOM write this module makes, in the order it made
   *  them before: the per-chip pass, then the collision dodge over the whole
   *  frame, then the pad resize over the whole frame. The last two are
   *  whole-frame passes by necessity — a dodge needs every pill's rect and a
   *  pad cap needs every other pad's centre — which is exactly why they are
   *  named functions here rather than trailing blocks of a long body. */
  function place({
    p, dt, detail, chapterId, railFlight, copyEase, excluded, geom, now,
  }) {
    const { viewDepth, tanHalf } = geom;

    /* Reserve collision space for a chapter's full scene-timed label set
       before its first label becomes visible. Without this, each later
       sibling joined the collision pass only when its own reveal crossed the
       visibility gate, so an already-visible label (notably Arca on mobile)
       jumped upward to make room. The copy ease starts before any node label
       is allowed to appear, giving the pass a quiet frame in which to settle
       the complete layout. Keep the reservation until every sibling has
       faded out so departure cannot reflow either. */
    const reservedLabelChapters = new Set();
    for (const h of hotspots) {
      if (h.reveal && !detail && (copyEase(h.chapter) > 0.015 || h.a > 0.015)) {
        reservedLabelChapters.add(h.chapter);
      }
    }

    for (const h of hotspots) {
      /* A chip with its own `reveal` follows the SCENE, not the copy: the
         chapter reports 0..1 for this node (Connect: the hub's own ignition,
         pure in p, so a reverse scrub withdraws the label with its light) and
         the chip stands up with it — mid-band, mid-scrub, long before the
         copy re-anchors, which is exactly what the eased-copy gate exists to
         prevent for resting-composition chips and exactly wrong for a label
         naming an event the visitor is watching. The copy band keeps one
         duty: its CLOSE edge (lo opened to the -1 sentinel) still takes the
         chip down into the next chapter, so departure matches the copy-gated
         chips' byte for byte. travelHold is deliberately absent from this
         path — a label that waits for the wheel to stop has already missed
         its light. */
      const copyGate = copyEase(h.chapter);
      const gate = h.reveal
        ? Math.min(h.reveal(), bandOpacity(p, h.revealBand))
        : copyGate;
      const departureOpacity = hotspotDepartureOpacity(h, {
        currentChapterId: chapterId, railFlight, copyGate,
      });
      // A carried marker keeps its last truthful world anchor until the copy
      // fade completes. Connect's normal 72% arrival floor must not truncate
      // this exit; departureOpacity itself is the visibility clock here.
      const placementGate = departureOpacity !== null
        ? (departureOpacity > 0.002 ? 1 : 0)
        : gate;
      const reserveLayout = reservedLabelChapters.has(h.chapter) && !h.labelOnHover;
      const { want, w, sx, sy } = resolvePlacement(h, {
        geom, dt, gate: placementGate, detail, reserveLayout, excluded,
      });

      // What the FRAME can place, cached for the index's reachability rule.
      // Deliberately `want` and not `vis`: `vis` is still climbing through the
      // arrival stagger for a second after a landing, and counting that would
      // have latched an index open on a desktop that places everything
      // perfectly well.
      h.placeable = want;
      h.layoutPlaceable = (want || reserveLayout) && !!w;

      advanceReveal(h, { want, gate, departureOpacity, dt, now });

      if (h.layoutPlaceable) {
        const tx = resolveX(h, sx);
        // The transform itself is written AFTER the loop, once every placed
        // pill's rect is known — see resolveDodge().
        h.pendX = tx;
        // The pad is placed against the NODE, in the button's own coordinates,
        // so the flip above and the nudge above it move the label and leave
        // the target where the thing is drawn. (`margin: -11px 0 0 -11px` on
        // .j-hot is why the node sits at local (sx - tx + 11, 11).)
        if (h.radius) {
          const worldR = h.radius() || 0;
          if (worldR > 0) {
            const d = Math.max(0.05, viewDepth(w));
            h.hitRaw = worldR * (window.innerHeight * 0.5) / (d * tanHalf);
          }
          h.hitEl.style.setProperty('--j-hit-x', `${(sx - tx + 11).toFixed(1)}px`);
        }
        h.sx = sx; h.sy = sy;
      }
      const vis = departureOpacity !== null ? h.a > 0 : h.a > 0.015;
      if (h.iconTab) paintIconTab(h, departureOpacity !== null);
      else if (h.soon) paintSoonRise(h, departureOpacity !== null);
      h.btn.style.opacity = h.a;
      h.btn.style.pointerEvents = departureOpacity !== null ? 'none' : '';
      h.btn.classList.toggle('vis', vis);
      // Roving tab order: exactly the hotspots of the chapter at rest, in
      // narrative registration order, are tabbable. Off-chapter, suppressed
      // (behind copy), off-frame, mid-fade or detail-open hotspots all leave.
      // tabIndex is the live half; `.j-hot:not(.vis)` is visibility:hidden, so
      // a faded hotspot is out of the a11y tree as well as out of Tab.
      const interactive = departureOpacity === null && want && vis;
      h.btn.tabIndex = interactive ? 0 : -1;
      if (interactive) h.btn.removeAttribute('aria-hidden');
      else h.btn.setAttribute('aria-hidden', 'true');
    }

    resolveDodge();
    resizePads();
  }

  return { measure, place };
}
