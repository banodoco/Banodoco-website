// journey/rail.js — THE RIGHT-SIDE NAVIGATOR (Hannah, 2026-08-09 redux;
// first built left-side 2026-08-07).
//
//   "Create a small, persistent navigation control attached to the right side
//    of the viewport ... At rest, it contains two symbols/icons: the symbol
//    representing whichever section the user is currently viewing, and a
//    separate menu symbol positioned beside it. When the user hovers over the
//    current-section symbol, it should expand to reveal the symbols for all
//    major sections ... Hovering an individual symbol reveals the name of
//    that section ... Clicking the menu symbol should open a larger
//    navigation panel that slides in from the right side of the screen. This
//    replaces the existing Site Information section entirely."
//
// This module owns the whole thing: the rail, its three states, and the
// site-map panel. It replaced the hero-nav `.j-nav` row in the first build;
// this redux additionally replaces `journey/ui-footer.js` (the bottom "Site
// Information" band and its epilogue cue) — everything that footer carried is
// in the PANEL now: the chapter deep links, the outbound links, the static-
// journey pointer, and the legal line. The static tier carries a hand-
// authored twin of all of it (static/index.html), checked by its drift guard.
//
// ===========================================================================
// DERIVED, NOT LISTED
// ===========================================================================
// Nothing here names a chapter or a node. The rail's slots come from
// route.js's CHAPTERS in manifest order; every one is a LINK (every chapter
// has a route — see THE EPILOGUE); which one reads current is `chapterAt(p)`.
// The panel's per-section item lists come from
// CONTENT.nodes, grouped by each node's own `chapter` field in insertion
// (= narrative) order. A chapter added to ROUTE, or a node added to CONTENT,
// appears here without an edit to this file.
//
// ===========================================================================
// THE THREE STATES
// ===========================================================================
// RESTING — ONE control, hugging the right edge, and it is ONE THING: the menu
//   button. Nothing else is drawn, nothing else is hit-testable.
//   "We should remove the little circle version that shows — the one at the
//   opening of both the menu and the top left — it's obviously crap ... let's
//   just remove that other thing entirely — the little circle." (Hannah,
//   2026-08-13, later.) The resting current-section BUBBLE of the pass before
//   this one is retired: the compact state is the button and nothing else, and
//   the current section is stated the moment the control opens rather than by a
//   badge riding on it. What that costs — a resting read of where you are — is
//   named in the residuals and was hers to spend.
//
// EXPANDED — hover anywhere on the control, keyboard focus, or a first touch.
//   THE HALF MOON FORMS AROUND THE BUTTON. It is ONE gesture, cascaded by
//   distance along the arc, and nothing about it is staged in series:
//
//     · every mark leaves the BUTTON on a single curved path and lands on its
//       own point of the arc, growing as it goes — the radius and the angle
//       are scaled by one clock with one duration, so a mark travels out and
//       round in one movement rather than walking to a slot and then setting
//       off from it;
//     · the paths are offset by `--step`, the mark's distance along the arc
//       from the current section: the apex goes first, its neighbours a
//       cascade later, the tips a cascade after that. The moon opens OUTWARD
//       FROM WHERE THE VISITOR IS;
//     · and the arc itself DRAWS, two arms from the apex, so the line the
//       marks sit on comes into being with them rather than fading up under
//       them.
//
//   "The entry animation right now is a little bit janky ... we should have a
//   more elegant version of that. So it's just like the half moon kind of
//   forms around it." (Hannah, 2026-08-13, later still.) What was janky was
//   two-stage-plus-a-lurch: the control stepped sideways off the wall, the
//   current mark walked out, and only THEN — after a wait as long as the walk
//   — did anything else move. The lurch is gone with the step (THE EDGE) and
//   the wait is gone with the serial staging; what is kept is the ORDER,
//   which is the part that carried the meaning.
//
//   It OPENS FROM THE WHOLE CONTROL's hover, after a dwell. The first build
//   opened from the list alone, because the fan used to slide the menu button
//   down to hold the foot of a stack and pointing at the button moved it out
//   from under its own click. Nothing slides the button any more — it is the
//   fixed hub — so the separation has no job left, and the brief asks for the
//   broader trigger ("when the navigation is not being HOVERED").
//   The 120ms dwell is kept: it is what stops a pointer merely crossing the
//   flank from unfolding anything.
//
// MENU OPEN — a real modal dialog sliding in from the right: the site map.
//   Every section with its heading, every section's nodes with their one-line
//   descriptions and primary links, the outbound links, the static-tier
//   pointer, the legal line. Someone who opens it understands what the site
//   contains without riding the journey.
//
// ===========================================================================
// THE EPILOGUE
// ===========================================================================
// The Final chapter has a route and no nav entry (route.js, 10-chapter-
// final.md). The first redux rendered its slot as an aria-hidden <span> echo
// — and that echo was a 44px hole in the fan: it never matched the
// `a.j-rail-item` pointer-events rules, so a pointer crossing it left the
// control (collapsing the fan) and a click on it fell through to whatever
// stood behind (measured 2026-08-09: the resting menu button — Hannah's
// "the Epilogue button isn't clickable, and it closes when I hover").
//
// It is now a REAL LINK, like every other slot: the chapter has a route, the
// panel already navigates to it, and a tile you can see and point at must be
// a tile you can press. `nav: null` still keeps it out of nowhere else; here
// it only means the slot speaks with the echo's quieter voice
// (`.j-rail-echo`). `aria-current` follows `chapterAt(p)` — with all five
// slots linked, the rail can finally say "you are in the epilogue" itself,
// exactly as the panel always could.
//
// ===========================================================================
// p = 0 AND THE MISSION REFERENCE
// ===========================================================================
// The rail is invisible through Mission's leg and fades in as Inspire begins
// (or when a direct jump lands), so static/captures/mission@* does not move
// and the transition itself belongs to the chapter handoff. The reveal used to
// LATCH (returning to p = 0 kept the rail); since 2026-08-17 it RELEASES
// instead — riding back toward the Mission pose puts the rail out again,
// UNLESS the pointer is on the control, the fan is open, or the menu is up
// (Hannah: "make it so that disappears when I reenter the top section unless
// I'm hovering over it"). The rail is still NOT inert at p = 0 — its own
// `:focus-within` brings it up, so the first Tab lands on something that is
// on screen by the time it is focused (23-side-navigator.md §9), and
// `expanded()` covers that focus in the release rule too.

import { CONTENT } from '../content/content.js';
import { CHAPTERS, chapterAt, restProgress, startOf } from './route.js';
import { buildSymbol } from './symbols.js';
import { claimInput, releaseInput } from './scroll.js';

/* The exact Mission pose stays useful for placements and capture hygiene. */
const SHOW_P = 0.004;
/* The first non-Mission chapter boundary is the handoff while scrolling: the
   rail should join as Inspire begins, not wait until Inspire's late rest pose.
   Direct jumps still use cameraStateDisagree below, so they reveal only when
   their camera has actually landed. Derived from the route so retiming moves
   the threshold with the chapter. */
const FIRST_OUTSIDE_P = CHAPTERS[1] ? startOf(CHAPTERS[1].id) : SHOW_P;

/* ===========================================================================
   THE HALF MOON (Hannah, 2026-08-13 later still)
   ===========================================================================
   "Can you switch the right side navigator to be more like this — a half moon.
    You may have to rethink how the entry animation and how it moves. It should
    stay in the side on hover. And it should be like a half moon ... so it's
    just like the half moon kind of forms around it, with the current one
    highlighted on the left side."

   This SUPERSEDES the full ring of `d9da652`. That build drew the whole circle
   around the button, and a whole circle around a button 2px from the frame
   does not fit: its right-hand arc is off screen, so the control had to STEP
   IN off the wall by 46.93px every time it opened and settle back when it
   closed. That step is the thing "it should stay in the side on hover"
   forbids, and it is also the largest single movement in the old entry — the
   whole instrument lurching sideways before anything else happened.

   A HALF MOON REMOVES THE PROBLEM RATHER THAN MANAGING IT. Keep the same
   circle and the same centre, and put the marks on its LEFT HALF only: the
   extreme marks then sit directly above and below the button, at the button's
   own x, and the open control's rightmost tile edge (hub + tile/2) lands
   INSIDE the closed button's own box. Measured at 1440x900: open extent
   1434 against a closed button box of 1382..1438. So the control does not
   move, in any state, ever again — no step-in, no pad to answer for a vacated
   footprint, and nothing for a press to fall through.

   THE GEOMETRY IS ONE CIRCLE, ITS CENTRE IS THE BUTTON, AND ONLY ITS LEFT
   HALF IS INHABITED.

     the hub      is the menu button. It is the moon's centre and it is
                  MOTIONLESS in every state — at rest, through the formation,
                  and through a chapter change.

     the slot     is the circle's LEFTMOST point: the apex of the moon,
                  pointing into the frame. It is a POSITION, not an item —
                  whichever chapter is current occupies it, and a chapter
                  change is the moon turning underneath it. "The current one
                  highlighted on the left side."

     the moon     is the 180deg arc of radius `rad` about the hub, from
                  straight up, through the apex, to straight down. The five
                  marks sit on it at a pitch of 180/(n-1), so at five chapters
                  they land ABOVE / upper-left / APEX / lower-left / BELOW and
                  read top-to-bottom in manifest order with "you are here" at
                  the point.

   Positions are polar about the HUB and the ONE animated quantity is still
   the angle. Relative to the hub (positive y is DOWN):

     x = -rad * cos(ang)          ang 0 -> -rad, i.e. the apex
     y =  rad * sin(ang)

   so the five points at n = 5, in units of rad, are

     ang  -90deg   -> ( 0.000, -1.000)   straight ABOVE the button
     ang  -45deg   -> (-0.707, -0.707)   upper left
     ang    0deg   -> (-1.000,  0.000)   THE APEX — the current section
     ang  +45deg   -> (-0.707, +0.707)   lower left
     ang  +90deg   -> ( 0.000, +1.000)   straight BELOW the button

   Every x is <= 0: nothing is ever drawn to the right of the button's centre,
   which is the whole of why the moon fits where the ring could not.

   THE WINDOW, AND THE ONE ITEM THAT LEAVES IT. A full ring is a cycle and
   wraps invisibly; an arc is a WINDOW onto that cycle, and on every chapter
   change one item runs off the end of it. It does not cut across the face of
   the moon to get back: it keeps turning THE SAME WAY as everything else, out
   past the tip, round the hidden half of the circle — which is behind the
   frame's own edge — and back in at the other tip. Advancing a chapter turns
   every mark 45deg towards the top (the upcoming section rises from below into
   the apex, the same direction of travel as the scroll that caused it), and
   the mark leaving the top tip keeps going, 180deg through the back, to arrive
   at the bottom tip. One rotation, one direction, nothing crossing the middle.
   `writeAngles` is what makes that true — see THE DIRECTION IS NOT A SHORTEST
   PATH there. */
const N = CHAPTERS.length;
const RAIL_RESTS = CHAPTERS.map(c => restProgress(c.id));
/* The arc the marks inhabit. 180deg is the half moon itself, and it is the
   number the whole geometry is derived from: the pitch, the radius and the
   fact that the extreme marks land on the button's own x are all consequences
   of it. */
const ARC = 180;
const STEP = ARC / (N - 1);

/** The signed offset of the slot `k` places past the current one: 0, +-1,
 *  +-2 ... so the manifest's order reads as "two before, two after" along the
 *  arc — top to bottom — rather than as a one-way queue. */
function signedRing(k) { return k > N / 2 ? k - N : k; }

/* ---- the radius, derived from the tile, the manifest and the arc -----------
   Neighbours on the moon are `2 rad sin(STEP/2)` apart, so the radius that
   keeps a given amount of air between two tiles falls straight out of the
   chapter count and the arc. AIR is generous on purpose — the marks should
   read as arranged on a curve, not as a chain of touching boxes.

   A HALF MOON IS A LOOSER PACKING THAN A RING, and the radius says so: five
   marks over 180deg sit at a 45deg pitch where five over 360deg sat at 72deg,
   so the same 74px chord now asks for 96.70px instead of 62.95. The moon is
   the bigger drawing vertically and the SMALLER one horizontally — it reaches
   `rad + TILE/2` = 120.7px into the frame where the ring reached its own
   120.7 PLUS the 46.93px it had to step in to get it, which is the whole of
   why this one can stay at the wall.

   RAD_MIN is the same geometric floor as before: `HUB/2 + GAP + TILE/2` = 58
   is the smallest circle on which the apex mark is not sitting on the button.
   At n = 5 the AIR formula asks for 96.70 and wins.

   RAD_MAX is a real ceiling now rather than a formality. The moon's HEIGHT is
   `2 rad + TILE`, so 120 caps it at 288px — past six chapters the arc would be
   taller than a small laptop's flank and the component falls back to the
   column it already knows how to be (n = 6 asks 119.7 and just fits; n = 7
   asks 142.9 and does not). The ring fell back at eleven; a half moon spends
   its circle twice as fast, and that is the honest cost of the shape. */
const TILE = 48;
const AIR = 26;
const HUB = 56;           // the button's box — site.css `--cl-hub`
const GAP = 6;            // hub box to apex box, at the floor
const RAD_MIN = HUB / 2 + GAP + TILE / 2;
const RAD_MAX = 120;      // past this the moon is taller than the flank: fall back
const RAD = Math.max(RAD_MIN, (TILE + AIR) / (2 * Math.sin(Math.PI / 180 * STEP / 2)));

/** A slot's x RELATIVE TO THE HUB (the moon's centre). `-rad` is the apex and
 *  0 — the button's own x — is the most either tip ever reaches. */
function ringX(k) {
  return -RAD * Math.cos(signedRing(k) * STEP * Math.PI / 180);
}

/* ---- THE EDGE — and why the half moon simply does not have this problem ----
   The ring this replaces could not fit: its rightmost marks sat `0.809 * rad`
   = 51px right of the button and carried 24px of tile, so the open control
   needed 75px to the right of the hub where an edge-hugging button has 30. No
   radius fixed it and no squashing fixed it, so `d9da652` bought the room by
   STEPPING THE WHOLE CONTROL IN off the wall by 46.93px as it opened.

   Hannah: "It should stay in the side on hover." The step is exactly what that
   forbids, and the half moon does not need it. Every inhabited angle has
   `cos(ang) >= 0`, so every mark's x is `<= 0` relative to the hub, and the
   two extreme marks — straight above and straight below — sit at the hub's own
   x. The open control's rightmost tile edge is therefore `HUB/2`... no:
   `TILE/2` = 24px right of the hub centre, against the closed button's own
   28px half-box. THE OPEN CONTROL IS NARROWER THAN THE CLOSED BUTTON, so it
   fits inside the footprint it already had, at any radius, for any manifest.

   What that deletes, rather than manages: `--cl-shift` and every rule that
   carried it; `.j-rail-menu::before`, the pad that existed only to answer for
   the footprint the stepping button vacated; and the ~47px lurch that opened
   and closed every interaction. The button is now motionless in every state,
   which is also the strongest possible form of `48b7795`'s guarantee — a
   press cannot be lost by a control that never moves. (The `pointerdown`
   opening stays regardless: it is the right behaviour for a menu button and it
   costs nothing.) */

/** A slot's y RELATIVE TO THE HUB. Negative is up the frame, matching the
 *  `translate(…, t·rad·sin(ae))` the stylesheet places the mark with. */
function ringY(k) {
  return RAD * Math.sin(signedRing(k) * STEP * Math.PI / 180);
}

/* ---- WHICH SIDE OF ITS OWN MARK EACH NAME PILL SITS ON — 2026-08-14 --------
   "See the buttons that are at the top and bottom — they show to the left.
    They should just show above or below, because there's space right there for
    them. And all the buttons should in general probably hug their current
    setting a little bit more." — Hannah

   WHAT WAS HERE, AND WHY IT WENT. Every pill was held off to the moon's own
   leftmost point — the apex — so they all landed on one vertical line. That is
   the tidy picture, and it is bought by moving four of the five pills AWAY from
   the things they name: measured on `b079f84` at 1440x900 with the moon open,
   the apex's pill sits 23.5px from its mark, the two at +-45deg sit 51.8px
   away, and the two tips sit **120.2px** away — a fifth of the viewport's
   width, out over open scene, labelling a mark at the far end of a long empty
   gap. Her two sentences are one observation: a label belongs to its mark, and
   these had been arranged into a list instead.

   THE RULE IS KEPT AND ITS MEASURE IS TIGHTENED. The holdoff was never
   decoration — a pill hangs off the LEFT of its tile, so on a curve it can be
   drawn straight over whatever sits further round, and `d9da652` refined the
   rule from "clear the whole cluster" to "clear the OCCUPIED CELLS". This is
   the same refinement taken one step further: a pill is held off nothing at
   all, and the one case where that would put it over a neighbour is answered
   by taking the pill OUT OF THE ROW rather than by pushing every pill out of
   the drawing. So the rule now reads:

     a pill hangs left of its own tile, unless another occupied tile shares
     its row and reaches into the corridor left of it — in which case it
     leaves the row, going ABOVE its mark in the arc's upper half and BELOW
     in the lower.

   Which is exactly Hannah's "there's space right there for them", derived
   rather than asserted: the marks that fail the row test on a half moon are
   the two tips, because the tips are the only marks sitting at the HUB's own
   x, where anything hanging left must clear a full radius to get past the
   +-45deg pair — and they are also the two marks with nothing beyond them, so
   the row above and the row below are free.

   Measured at n = 5 (1440x900, all five chapters): apex and the +-45deg pair
   pass the row test and hang left at the hug; the two tips fail it against
   their +-45deg neighbour (rows 28.3px apart against 24 + 14 of tile and pill)
   and go above and below. No position needs a holdoff, so none is written —
   `--pillx` and its `margin-right` arithmetic are gone with it.

   PILL_H is the pill's own box (0.34rem of padding either side of a 0.6rem
   line = 27.63px measured, at both font sizes — the padding, not the type, is
   what sets it). It is the ROW WIDTH for the test and nothing else, and the
   test is not delicate in it: at n = 5 the tips fail on 9.5px of overlap and
   would keep failing anywhere down to ~11px of pill height. */
const PILL_H = 28;
const HUG = 9;                             // site.css `--cl-hug`, 0.56rem

const PILL_SIDE = (() => {
  const out = [];
  for (let k = 0; k < N; k++) {
    const x = ringX(k), y = ringY(k);
    // where this pill's own right edge would land if it hung left
    const edge = x - TILE / 2 - HUG;
    let crowded = false;
    for (let j = 0; j < N && !crowded; j++) {
      if (j === k) continue;
      const sharesRow = Math.abs(ringY(j) - y) < TILE / 2 + PILL_H / 2;
      const reachesIn = ringX(j) - TILE / 2 < edge;
      crowded = sharesRow && reachesIn;
    }
    out.push(crowded ? (y <= 0 ? 'up' : 'dn') : null);
  }
  return out;
})();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** The reticle: four corner brackets that lock in clockwise around the current
 *  symbol. Lifted wholesale from the hero's `.co .ck` treatment (hero.css) —
 *  same four elements, same clockwise delays, same overshoot — because "this
 *  is the one you are on" and "this is the label you are pointing at" are the
 *  same statement and should not have two drawings. */
function reticle() {
  const wrap = el('i', 'j-rail-ret');
  wrap.setAttribute('aria-hidden', 'true');
  for (const c of ['tl', 'tr', 'br', 'bl']) wrap.appendChild(el('b', `j-rck ${c}`));
  return wrap;
}

export function createRail({ onNav } = {}) {
  // Navigation iteration: make the rail the hero's persistent navigation
  // surface instead of revealing it only after the first chapter departure.
  const ALWAYS_OPEN = true;
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------ */
  /* THE RAIL                                                            */
  /* ------------------------------------------------------------------ */
  // A real <nav> landmark with its own label, a sibling of the hero's <nav>
  // on <body>. The hero's wordmark and its Discord pill are untouched
  // (2RP left that row 2026-08-10; the Inspire node keeps it).
  const root = el('nav', 'j-rail');
  root.setAttribute('aria-label', 'Journey sections');
  // The fan geometry: every slot's position is (--i - --cur) tiles from the
  // anchor, so the whole choreography lives in the stylesheet and JS only
  // states where the visitor is.
  root.style.setProperty('--n', String(CHAPTERS.length));
  // ...and the HALF MOON's geometry is the same statement in polar form. The
  // radius is derived from the chapter count and the 180deg arc (see RAD), so a
  // sixth chapter widens the moon rather than crowding it, and only a manifest
  // big enough to make the arc taller than the flank falls back to the column
  // the component already knows how to be. At the shipped tile and air that is
  // seven chapters.
  root.style.setProperty('--cl-rad', RAD.toFixed(2) + 'px');
  if (RAD > RAD_MAX) root.classList.add('j-rail-column');
  const isColumn = root.classList.contains('j-rail-column');

  const inner = el('div', 'j-rail-inner');
  root.appendChild(inner);

  const list = el('ul', 'j-rail-list');
  inner.appendChild(list);

  /* ---- THE MOON ITSELF, and it DRAWS -----------------------------------
     "It's just like the half moon kind of forms around it."

     The ring this replaces stated its geometry with a `border-radius: 50%`
     div that faded and scaled up — a circle that ARRIVED. A half moon can do
     better than arrive, because this site already has a vocabulary for a line
     coming into being: `lead-draw`, the hero callouts' leaders and the menu
     mark's own filaments, a stroke revealed by walking its dash offset to
     zero. So the moon is a real arc, and it draws itself.

     TWO ARMS, BOTH STARTING AT THE APEX. The upper arm runs from the apex to
     straight-above and the lower one from the apex to straight-below, so the
     drawing front leaves the current section in both directions at once and
     the moon closes around the button symmetrically. That is the whole
     sentence — "the half moon forms around it, with the current one
     highlighted on the left side" — stated as geometry rather than as a fade.

     `pathLength="100"` normalises both arms, exactly as the hero's leaders do,
     so the dash geometry in site.css is a percentage and cannot go stale
     behind a radius change. The marks ride the same clock: each one arrives as
     the front passes its own angle (site.css, THE FORMATION). */
  const R = RAD;
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arc.setAttribute('class', 'j-rail-arc');
  arc.setAttribute('aria-hidden', 'true');
  arc.setAttribute('focusable', 'false');
  arc.setAttribute('viewBox', `${-R - 1} ${-R - 1} ${2 * (R + 1)} ${2 * (R + 1)}`);
  for (const [cls, d] of [
    ['up', `M ${-R} 0 A ${R} ${R} 0 0 1 0 ${-R}`],
    ['dn', `M ${-R} 0 A ${R} ${R} 0 0 0 0 ${R}`],
  ]) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', `j-rail-arc-${cls}`);
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '100');
    arc.appendChild(p);
  }
  inner.appendChild(arc);

  const slots = [];      // { id, li, item }
  const links = {};      // chapterId -> <a> — all five; see THE EPILOGUE

  CHAPTERS.forEach((c, i) => {
    const li = el('li', 'j-rail-slot');
    li.dataset.chapter = c.id;
    li.style.setProperty('--i', String(i));

    // Every slot is a real link: every chapter has a route, and a tile a
    // pointer can reach must be a tile a pointer can press (THE EPILOGUE).
    const item = el('a', 'j-rail-item');
    item.href = `#/${c.id}`;
    item.dataset.chapter = c.id;
    // Collapse the TOUCH state only: a second tap acted, the arming is spent.
    // The hover fan deliberately stays — the pointer is still on the control,
    // and it folds on pointer-leave (Hannah, 2026-08-09: close on de-hover,
    // not on click-elsewhere).
    item.addEventListener('click', (e) => {
      e.preventDefault();
      // The touch second tap is the one that acts (see the pointerdown
      // arming below); `touchOpen` is still true at this moment, so it is
      // the per-interaction touch signal without a pointerType on click.
      const viaTouch = touchOpen;
      collapseTouch();
      onNav(c.id);
      // A touch tap leaves focus on the tile it travelled with, and the
      // rail's expanded state keys on :has(:focus-visible) — on devices
      // where a tapped link matches :focus-visible (Android), the fan and
      // the name pill persist after arrival even though the arming is
      // spent. Drop focus on the touch second tap only: keyboard
      // activation keeps its focus and the deliberate focus-fan.
      if (viaTouch && document.activeElement === item) item.blur();
    });
    links[c.id] = item;
    // The nav-less chapter keeps the echo's quieter voice, as a style only.
    if (!c.nav) li.classList.add('j-rail-echo');

    const mark = el('span', 'j-rail-mark');
    mark.appendChild(buildSymbol(c.id));
    mark.appendChild(reticle());
    item.appendChild(mark);
    item.appendChild(el('span', 'j-rail-name',
      (CONTENT.chapters[c.id] || {}).nav || c.nav || 'Epilogue'));

    li.appendChild(item);
    list.appendChild(li);
    slots.push({ id: c.id, li, item });
  });

  /* ---- the menu control: the second resting symbol ---- */
  const menuBtn = el('button', 'j-rail-menu');
  menuBtn.type = 'button';
  /* THE BUTTON CARRIES ITS OWN NAME. Until 2026-08-14 it had none: the
     accessible name came entirely from the "Menu" span below, which is a
     VISIBLE label and therefore a thing a geometry is allowed to hide. The
     half moon now does hide it (see THE HUB HAS NO PILL, site.css), and
     `display: none` takes an element out of the accessibility tree as well as
     out of the picture — so without this the button would have been an unnamed
     button on every hover-capable machine. Stated here rather than in the
     stylesheet's gift: the name is a property of the control, not of the
     geometry it happens to be drawn in. (With `aria-label` set, the span is
     purely visual in BOTH tiers — the column's own label is now decoration
     over a named button, which is the correct relationship.) */
  menuBtn.setAttribute('aria-label', 'Menu');
  menuBtn.setAttribute('aria-haspopup', 'dialog');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-controls', 'j-menu');
  const menuMark = el('span', 'j-rail-mark');
  menuMark.appendChild(buildSymbol('menu'));
  menuBtn.appendChild(menuMark);
  menuBtn.appendChild(el('span', 'j-rail-name', 'Menu'));
  inner.appendChild(menuBtn);

  document.body.appendChild(root);

  /* ------------------------------------------------------------------ */
  /* THE SITE-MAP PANEL                                                  */
  /* ------------------------------------------------------------------ */
  /* CONTENT SOURCE. Every string below comes out of content/content.js and
     nothing is written here:

       lede         chapters.mission.sub — the site's one-line summary of
                    itself (also static/index.html's <meta description>).
       section name chapters.<id>.nav (the epilogue: the structural word
                    "Epilogue", route.js's own word for it — not new copy)
       section line chapters.<id>.heading — one short statement per section.
       item title   nodes.<id>.label
       item line    nodes.<id>.short — the same sentence the node's own
                    popover shows, [PLACEHOLDER] tokens and all.
       item link    nodes.<id>.spotlight.link / .card.link, where one exists.
                    Every href is '#' per D10 — no external URL on this site
                    is confirmed yet (including the hero's own Discord
                    pill). The panel carries the authored labels and waits.
       elsewhere    site.links + site.social (the renamed footer content)
       static note  the sentence ui-footer.js shipped, verbatim
       legal        site.legal */
  const scrim = el('div', 'j-menu-scrim');
  scrim.hidden = true;
  document.body.appendChild(scrim);

  const menu = el('aside', 'j-menu');
  menu.id = 'j-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');
  menu.setAttribute('aria-labelledby', 'j-menu-h');
  menu.hidden = true;
  menu.inert = true;

  const menuClose = el('button', 'j-menu-x', '✕');
  menuClose.type = 'button';
  menuClose.setAttribute('aria-label', 'Close menu');
  menu.appendChild(menuClose);

  const menuH = el('h2', 'j-menu-h', 'Banodoco');
  menuH.id = 'j-menu-h';
  menu.appendChild(menuH);
  menu.appendChild(el('p', 'j-menu-lede', CONTENT.chapters.mission.sub));

  /** A chapter's nodes, in content.js insertion (= narrative) order. */
  function itemsFor(chapterId) {
    return Object.entries(CONTENT.nodes)
      .filter(([, n]) => n.chapter === chapterId)
      .map(([id, n]) => {
        const d = n.spotlight || n.card || {};
        return { id, label: n.label, short: n.short || '', link: d.link || null };
      });
  }

  const menuNav = el('nav', 'j-menu-nav');
  menuNav.setAttribute('aria-label', 'All sections');
  const menuList = el('ol', 'j-menu-list');
  const menuLinks = {};
  CHAPTERS.forEach((c, i) => {
    const data = CONTENT.chapters[c.id] || {};
    const li = el('li');
    const a = el('a', 'j-menu-item');
    a.href = `#/${c.id}`;
    a.dataset.chapter = c.id;
    const mark = el('span', 'j-menu-mark');
    mark.appendChild(buildSymbol(c.id));
    a.appendChild(mark);
    const txt = el('span', 'j-menu-txt');
    // "01 — Mission": the hero callouts number themselves the same way, and so
    // does the static tier's eyebrow. Derived from manifest order.
    txt.appendChild(el('span', 'j-menu-no', String(i + 1).padStart(2, '0')));
    txt.appendChild(el('span', 'j-menu-name', data.nav || 'Epilogue'));
    txt.appendChild(el('span', 'j-menu-line', data.heading || ''));
    a.appendChild(txt);
    a.addEventListener('click', (e) => { e.preventDefault(); closeMenu({ focusBack: false }); onNav(c.id); });
    li.appendChild(a);

    // The section's own contents: label — one sentence → primary link.
    const items = itemsFor(c.id);
    if (items.length) {
      const sub = el('ul', 'j-menu-sub');
      for (const it of items) {
        const row = el('li', 'j-menu-row');
        row.appendChild(el('span', 'j-menu-il', it.label));
        if (it.short) row.appendChild(el('span', 'j-menu-is', it.short));
        if (it.link) {
          const la = el('a', 'j-menu-ia', it.link.label);
          la.href = it.link.href || '#';
          row.appendChild(la);
        }
        sub.appendChild(row);
      }
      li.appendChild(sub);
    }

    menuList.appendChild(li);
    menuLinks[c.id] = a;
  });
  menuNav.appendChild(menuList);
  menu.appendChild(menuNav);

  const elsewhere = el('div', 'j-menu-else');
  const eh = el('h3', 'j-menu-eh', 'Elsewhere');
  eh.id = 'j-menu-eh';
  elsewhere.appendChild(eh);
  const eul = el('ul', 'j-menu-links');
  eul.setAttribute('aria-labelledby', 'j-menu-eh');
  for (const link of [...CONTENT.site.links, ...CONTENT.site.social]) {
    const li = el('li');
    const a = el('a', null, link.label);
    a.href = link.href || '#';
    li.appendChild(a);
    eul.appendChild(li);
  }
  elsewhere.appendChild(eul);
  menu.appendChild(elsewhere);

  // The accessible, crawlable static tier (PS-5.1 / PL-2.1) — the footer's
  // sentence, verbatim, now living where the site information lives. NOT a
  // reduced-motion redirect (decision D11): a link a person chooses to follow.
  const note = el('p', 'j-menu-note');
  note.appendChild(document.createTextNode('Every chapter, every node and every link on this page also exists as a plain HTML document with no WebGL: '));
  const staticLink = el('a', null, 'the static journey');
  // Resolved off import.meta.url so a directory rename cannot break it — the
  // reasoning is inherited from ui-footer.js (see 25-navigation-redux.md).
  staticLink.href = new URL('../static/', import.meta.url).href;
  note.appendChild(staticLink);
  note.appendChild(document.createTextNode('.'));
  menu.appendChild(note);

  if (CONTENT.site.legal) menu.appendChild(el('p', 'j-menu-legal', CONTENT.site.legal));

  document.body.appendChild(menu);

  /* ------------------------------------------------------------------ */
  /* EXPANSION                                                           */
  /* ------------------------------------------------------------------ */
  /* Three ways in, one state out:

       hover     JS-managed (`.j-rail-hot`), not the container's `:hover`,
                 because the DWELL is the point: entering opens only after
                 HOT_INTENT_MS, so a pointer merely crossing the flank on its
                 way somewhere else never unfolds anything. That guard is
                 kept exactly as it shipped.
                 WHAT CHANGED (2026-08-13): the trigger is the whole control
                 (`.j-rail-inner`), not the section list alone. The list-only
                 trigger existed because the opening fan slid the menu button
                 down to hold the foot of the stack, and a pointer transiting
                 the current mark on its way to the button moved the button
                 out from under the aimed click (measured 2026-08-09). Closed,
                 the ring's whole control IS the button, so a list-only
                 trigger would have nothing to open from — and the brief asks
                 for the broader reading anyway, "when the navigation is not
                 being HOVERED". Leaving the whole control closes; an open
                 ring survives the pointer travelling anywhere across it, the
                 button included.
                 AND THE BUTTON DOES NOT MOVE AT ALL any more (2026-08-13
                 later still). `d9da652`'s ring had to step the whole control
                 in off the frame to fit its right-hand arc, which brought the
                 2026-08-09 hazard back and needed a hit pad left behind in the
                 vacated footprint to answer it. The half moon puts nothing to
                 the right of the button, so nothing steps, the pad is gone,
                 and the hazard is absent rather than defended — measured
                 open-vs-closed, the button's box is identical to the pixel.
                 (`pointerdown` stays: it is simply the right behaviour for a
                 menu button.)
                 On the COLUMN fallback the old trigger is kept verbatim: that
                 geometry still slides its button, so it still needs it.
       keyboard  the root's `:has(:focus-visible)`, in CSS. NOT
                 `:focus-within`: a mouse click focuses what it presses, and
                 that focus must neither expand the fan (it moved the menu
                 button between mousedown and mouseup — the first click
                 never landed) nor hold the fan open after the pointer has
                 left (Hannah's "doesn't go away until I click somewhere
                 else"). `:focus-visible` is exactly the keyboard half.
       touch     `.j-rail-open`: first tap expands, second acts — the model
                 this site already uses for its hotspot chips, decided per
                 INTERACTION from the live pointerType, never a boot sniff.
                 A tap on the MENU mark never arms the fan: the menu is the
                 other resting control, and its first tap opens the panel. */
  const HOT_INTENT_MS = 120;
  let touchOpen = false;
  let swallowClick = false;
  let hotOpen = false;
  let hotTimer = 0;
  /* The pointer is ON the control right now — tracked on the same enter/leave
     pair that arms and folds the fan, so its truth is the fan's own. It is
     wider than `hotOpen` (true through the dwell, and on the resting button
     with no fan up at all) and it is what the reveal's release rule reads:
     a rail the visitor is touching must not go out under their hand. */
  let hovering = false;
  let formTimer = 0;
  let pinnedRevealed = false;
  let followReadyAt = Infinity;

  /** Release the persistent rail only after the hero intro has landed. Adding
   *  the existing open classes one painted frame after `.on` reuses the moon's
   *  authored line-draw + cascading formation instead of inventing an entry. */
  function reveal() {
    if (pinnedRevealed) return;
    pinnedRevealed = true;
    root.classList.add('on');
    void root.offsetWidth;
    requestAnimationFrame(() => {
      hotOpen = true;
      root.classList.add('j-rail-hot');
      document.body.classList.add('j-rail-on');
      // The longest existing desktop formation is ~660ms. Only after it lands
      // does progress take direct ownership of the rail's angle.
      followReadyAt = reduceMotion.matches ? Date.now() : Date.now() + 720;
    });
  }

  function expanded() {
    return touchOpen || hotOpen || !!root.querySelector(':focus-visible');
  }

  /* The expanded rail is announced on <body> (2026-08-07 mobile pass):
     journey/site.css steps the chapter copy and the hotspot chips back while
     the rail is held open over them — and that rule lives inside
     `@media (pointer: coarse), (max-width: 720px)`, so it can only ever fire
     on a frame narrow enough for the control to be standing on the copy.

     IT NOW FOLLOWS THE HOVER STATE AS WELL AS THE TOUCH ONE (2026-08-13).
     It was touch-only because the geometry it was written for was a 52px
     column, which at a phone width is the only way the rail is ever open —
     hover does not exist there. The ring changed that: a hover-capable window
     at 375 opens a 174px circle straight across the frame, and shot at that
     size the chapter copy and the action row ran right through it. (That row
     was the Learn-more / Remix pair when this was written; Remix left the
     copy for the crown on 2026-08-13 — the row is still there and the rule
     still reaches it.) Same mechanism, same 0.14, same transition; the only
     change is that
     the class now tracks BOTH the states JS owns. Above 720px there is no
     rule for it to reach, so nothing on a desktop moves. */
  function announceOpen() {
    document.body.classList.toggle('j-rail-on', touchOpen || hotOpen);
  }

  function collapseTouch() {
    if (!touchOpen) return;
    touchOpen = false;
    root.classList.remove('j-rail-open');
    announceOpen();
  }

  function collapse() {
    if (ALWAYS_OPEN && pinnedRevealed) {
      collapseTouch();
      hotOpen = true;
      root.classList.add('on', 'j-rail-hot');
      announceOpen();
      return;
    }
    collapseTouch();
    clearTimeout(hotTimer);
    if (hotOpen) {
      hotOpen = false;
      root.classList.remove('j-rail-hot');
    }
    announceOpen();
  }

  /* THE FOLD STILL NEEDS RE-CANONICALISATION — CORRECTED 2026-08-14.
     What stood here was: "the angle is never pinned: it is multiplied by
     `--u`, the unfold amount, so at rest it is simply not in the picture, and
     it is already correct when `--u` leaves zero… `writeAngles` is free to
     keep accumulating for as long as the page lives." The first clause is
     true and the conclusion is the exact opposite of what follows from it.
     Multiplying by `--u` does not take the angle out of the picture; it makes
     the FORMATION traverse the whole of it, from 0 to whatever is stored. So
     an accumulated -405deg is not a harmless alias for -45deg, it is a mark
     spiralling one and an eighth turns across the face of the moon on its way
     out. The cluster's `foldedSync` was solving the same problem from the
     other side, and deleting it brought the problem back.
     It is reinstated as `atRest` + `j-rail-recentre`; the reasoning, the
     measurement and the reason the fold's own frames must NOT be treated as
     "home" are in the block above `writeAngles`. */

  // The whole control opens the ring — but only the list does on the column
  // fallback, whose button still slides. See EXPANSION above.
  const hotZone = isColumn ? list : inner;
  // Entering the CONTROL (not just the hot zone — on the column the two
  // differ) marks the pointer as on it, and seeds `lastPt`: the dwell can
  // open the fan without a single further pointermove, and syncAt needs a
  // position to resolve from when it does.
  inner.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hovering = true;
    lastPt = { x: e.clientX, y: e.clientY };
  });
  hotZone.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || hotOpen) return;
    // Dwell before unfolding — see the header note. A pointer that is only
    // crossing the flank is gone well inside HOT_INTENT_MS.
    clearTimeout(hotTimer);
    hotTimer = setTimeout(() => {
      hotOpen = true;
      root.classList.add('j-rail-hot');
      announceOpen();
      /* THE FAN HAS OPENED UNDER A POINTER THAT MAY NEVER MOVE AGAIN. The
         dwell is a timer, not an event: nothing re-resolves `.at` when it
         fires, and `:hover` is not re-hit-tested for marks that arrive by
         transform (THE POINTER'S OWN TRUTH below). So a mark the visitor had
         moved onto mid-formation showed no hovered state until the mouse
         moved again (Hannah, 2026-08-17). Resolve it when the formation has
         landed — the same settle the turn already performs; the formation is
         the fold run forward, so it shares the fold's length. NOT on the
         open's first frame: every mark is still stacked on the hub there,
         and elementFromPoint would tag whichever of them is topmost under a
         pointer that is actually on the button (measured — the Epilogue's
         pill flashed on every dwell). */
      clearTimeout(formTimer);
      formTimer = setTimeout(syncAt, FOLD_HOME_MS);
    }, HOT_INTENT_MS);
  });
  hotZone.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
  });
  // Leaving the whole control folds an open ring. (On the column fallback this
  // is the second listener it has always had: the list cancels a pending
  // unfold, the control folds an open one.)
  inner.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    hovering = false;
    clearTimeout(hotTimer);
    clearTimeout(formTimer);
    lastPt = null;
    syncAt();
    if (ALWAYS_OPEN && pinnedRevealed) return;
    if (!hotOpen) return;
    hotOpen = false;
    root.classList.remove('j-rail-hot');
    announceOpen();
  });

  /* ===================================================================== */
  /* THE POINTER'S OWN TRUTH — `.at`                                        */
  /* ===================================================================== */
  /* `:hover` CANNOT BE TRUSTED IN THIS GEOMETRY, and that is a property of
     the ring, not a browser bug. Every mark is placed by `transform`, and a
     transform-only move does not make Chrome re-run its hit test: the hover
     state is recomputed from a pointer EVENT, and a rotation produces none.
     So when the ring turns under a stationary pointer, `:hover` stays on the
     element that has travelled AWAY and never lands on the one that has
     arrived.

     RE-MEASURED 2026-08-13 (later) ON THE RING CENTRED ON THE BUTTON, whose
     slot is at (1300, 450) at 1440x900. Pointer parked on the slot, the ring
     turned ONE STEP by writing `--ang-to` and nothing else — a pure transform
     move, no scroll, no reflow, no pointer event of any kind:

       before   connect  hover=1  .at=1  pill 1.00
       after    connect  hover=1                      <- STALE: it left the slot
                owned                                 <- genuinely under the cursor
       elementFromPoint(1300, 450) === owned

     So the premise survives the new geometry unchanged: Chrome does not
     re-hit-test a stationary pointer when the layout under it moves by
     transform, and `:hover` alone would draw CONNECT against a mark 80px up
     the ring while the one under the cursor went unlabelled.

     (On the REAL chapter-change path this Chrome was additionally seen to
     correct `:hover` on its own — the navigation does more than move the
     marks. That is not something this component controls or can rely on, and
     the isolated measurement above is what the rule is written against.)

     THIS CORRECTS THE RECORD. The 2026-08-12 cluster pass wrote the opposite
     down as a measured finding ("Chrome does re-hit-test :hover when the
     layout moves under a stationary pointer ... the pill went out, and came
     back reading OWNED"). What that measurement actually caught was the `.now`
     CLASS moving to Owned — a JS write, so `.j-rail-slot.now .j-rail-name`
     did read "Owned" — and not the pill being revealed. Its opacity was 0.
     The suppression that pass kept as "cosmetic cover for the transit" was
     therefore covering a real fault, not decorating one.

     THE FIX: the position of the pointer is a fact JS can read, so JS reads
     it. `.at` marks the slot the pointer is genuinely over, resolved by
     `elementFromPoint` from the last pointer position, and the stylesheet
     drives the name from `.at` rather than from `:hover` for the ring. It is
     re-resolved on every pointer move (where it simply agrees with `:hover`)
     and once more when a turn settles (where it does not). Nothing else about
     the hover model changes, and the column — whose `:hover` the touch path
     never consults — is untouched. */
  let lastPt = null;
  let atSlot = null;

  function syncAt() {
    let want = null;
    if (lastPt && expanded()) {
      const hit = document.elementFromPoint(lastPt.x, lastPt.y);
      const li = hit instanceof Element ? hit.closest('.j-rail-slot') : null;
      if (li && root.contains(li)) want = li;
    }
    if (want === atSlot) return;
    if (atSlot) atSlot.classList.remove('at');
    atSlot = want;
    if (atSlot) atSlot.classList.add('at');
  }

  inner.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPt = { x: e.clientX, y: e.clientY };
    syncAt();
  });

  root.addEventListener('pointerdown', (e) => {
    if (ALWAYS_OPEN && pinnedRevealed) return;
    if (e.pointerType !== 'touch' || touchOpen) return;
    // The menu mark is the OTHER resting control: its first tap opens the
    // panel (see the menu's own pointerdown below), so it must not spend the
    // tap on arming the fan — and arming would slide the button out from
    // under the very tap that pressed it (measured 2026-08-09).
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    touchOpen = true;
    root.classList.add('j-rail-open');
    announceOpen();
    // The tap that opened the rail must not also follow the link under it.
    swallowClick = true;
    setTimeout(() => { swallowClick = false; }, 500);
  }, true);

  root.addEventListener('click', (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    // The menu mark is live at rest — it is one of the two resting symbols —
    // so the arming tap swallows section-fan clicks only; a first tap on the
    // menu button opens the menu, as a persistent control should.
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  // A press anywhere else puts the rail back to two symbols. Passive observer —
  // it never cancels, so the canvas's own tap handling is untouched.
  document.addEventListener('pointerdown', (e) => {
    if (!touchOpen) return;
    if (e.target instanceof Node && root.contains(e.target)) return;
    collapse();
  }, { capture: true });

  /* ------------------------------------------------------------------ */
  /* THE MENU: open, trap, close                                         */
  /* ------------------------------------------------------------------ */
  let menuIsOpen = false;
  let menuReturn = null;

  function focusables() {
    return [...menu.querySelectorAll('a[href], button:not([disabled])')]
      .filter(n => n.offsetParent !== null || n === menuClose);
  }

  function openMenu(trigger) {
    if (menuIsOpen) return;
    menuIsOpen = true;
    menuReturn = trigger || menuBtn;
    scrim.hidden = false;
    menu.hidden = false;
    menu.inert = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    // One synchronous style flush so the opacity/transform transition has a
    // rendered start state to run FROM — a panel arriving out of `hidden`
    // (display:none) has none, and would otherwise appear finished. Same
    // reasoning, and the same fix, as the detail card's open (journey/ui.js).
    void menu.offsetHeight;
    menu.classList.add('open');
    scrim.classList.add('open');
    // The panel is tall and scrolls. Registering it means wheel and touch
    // inside it are never travel and are never preventDefault()ed, so it
    // scrolls natively; `modal` additionally takes the travel KEYS off the
    // table, so the journey cannot be scrubbed out from under the reader.
    // (journey/scroll.js, INPUT OWNERSHIP.)
    claimInput(menu, { modal: true });
    // The rail is behind the panel and belongs to nobody while it is open.
    root.inert = true;
    collapse();
    menuClose.focus();
  }

  function closeMenu({ focusBack = true } = {}) {
    if (!menuIsOpen) return;
    menuIsOpen = false;
    menu.classList.remove('open');
    scrim.classList.remove('open');
    releaseInput(menu);
    menuBtn.setAttribute('aria-expanded', 'false');
    // inert BEFORE the focus return: a fading panel is out of the tab order
    // and out of the a11y tree from the first frame of the fade.
    menu.inert = true;
    root.inert = false;
    if (focusBack && menuReturn && document.contains(menuReturn)) menuReturn.focus();
    menuReturn = null;
    // Let the fade play, then leave the box tree. Reduced motion has no fade
    // to protect (the stylesheet drops the transition), so it goes on the tick.
    if (reduceMotion.matches) finishMenuClose();
    else setTimeout(finishMenuClose, 320);
  }

  function finishMenuClose() {
    if (menuIsOpen) return;                 // reopened mid-fade
    menu.hidden = true;
    scrim.hidden = true;
  }

  /* The menu opens on POINTERDOWN, not on click — the way an OS menu bar
     does. The button is a control that can be in motion (it slides down to
     hold the foot of an opening fan), and a click needs press and release to
     land on the same node: any motion in between loses it (measured
     2026-08-09 — the first click opened nothing). The press is the intent;
     acting on it makes the button clickable throughout its motion. The
     preventDefault keeps the press from also focusing the button, so focus
     goes where openMenu sends it (the close control) and stays there.
     The click listener remains for the keyboard: Enter/Space synthesise a
     click with no pointerdown before it, and openMenu() itself is guarded
     against running twice. */
  menuBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // A press is an answer, so the question stops being asked. This also
    // guarantees the gesture can never run under an opening panel.
    clearTimeout(nudgeTimer);
    openMenu(menuBtn);
  });
  menuBtn.addEventListener('click', () => openMenu(menuBtn));

  /* ===================================================================== */
  /* THE BUTTON SAYS IT IS A BUTTON — the dwell gesture                     */
  /* ===================================================================== */
  /* "Remove the MENU text that shows when you hover over the actual menu
      button, because it just doesn't really fit in. But can you make it so
      that when you hover over that button, it gently suggests that it's
      clickable? Maybe something like its entry animation — maybe if you hover
      over it for over a second, it does that again." — Hannah, 2026-08-14

     The label is gone from this geometry (site.css, THE HUB HAS NO PILL) and
     this is what stands in for it. It is NOT a borrowed keyframe: the button
     already has an entry of its own — `.j-rail-menu .j-sym path` carries
     `stroke-dasharray: 12` and is drawn to `stroke-dashoffset: 0` when the
     rail powers on, which is the hero's `lead-draw` in transition form. The
     gesture replays THAT, on the button's own glyph, in the shape it already
     arrived in. (`b079f84` retired a keyframe that was wearing one reference's
     name over another's shape; the check that matters is the drawing, and the
     drawing here is the same three filaments writing themselves in.)

     WHY A SECOND, AND WHY IT CANNOT FIRE ON TRANSIT. The rail's own 120ms
     dwell exists precisely because a pointer crossing the flank must not open
     anything; a gesture that answers "is this clickable?" is a reply to a
     question only a pointer that has STOPPED can be asking. NUDGE_MS is an
     order of magnitude past the crossing time, and the timer is armed on
     `pointerenter` of the button alone and cleared on `pointerleave`, on a
     press, and on touch — where there is no hover to read intent from.

     ONCE PER ARRIVAL, not on a loop. A repeat every second is a control
     asking for attention rather than answering for itself, and the whole of
     the brief is "gently". The class is dropped on `animationend` so the next
     arrival can re-arm it, and re-arming is what a fresh hover means. */
  const NUDGE_MS = 1000;
  let nudgeTimer = null;

  menuBtn.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch' || menuIsOpen) return;
    // Reduced motion has no gesture to give: the glyph's resting state IS the
    // drawn one, so replaying the draw would be motion for its own sake. The
    // hover colour lift (`.j-rail-menu:hover`) carries the affordance there,
    // and it is not motion.
    if (reduceMotion.matches) return;
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => {
      if (menuIsOpen) return;
      menuBtn.classList.remove('j-rail-nudge');
      void menuBtn.offsetWidth;               // restart, not merely re-assert
      menuBtn.classList.add('j-rail-nudge');
    }, NUDGE_MS);
  });
  menuBtn.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(nudgeTimer);
  });
  menuBtn.addEventListener('animationend', (e) => {
    if (e.animationName === 'j-menu-rewrite') menuBtn.classList.remove('j-rail-nudge');
  });
  menuClose.addEventListener('click', () => closeMenu());
  scrim.addEventListener('click', () => closeMenu());

  // Focus trap. While the dialog is open its own controls are the whole world,
  // so Tab cycles inside it; Shift+Tab wraps the other way.
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !menuIsOpen) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    if (e.shiftKey && (at === first || !menu.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !menu.contains(at))) { e.preventDefault(); first.focus(); }
  });

  /* Escape, in priority order: the menu first (it is modal and it is the thing
     in front of you), then an expanded rail. Registered in the CAPTURE phase
     so a menu Escape is settled before journey/ui.js's own Escape handler can
     act on a popover or card behind it. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuIsOpen) { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if (!(ALWAYS_OPEN && pinnedRevealed) && (touchOpen || hotOpen)) {
      e.preventDefault();
      collapse();
    }
  }, true);

  /* ------------------------------------------------------------------ */
  /* PER FRAME                                                           */
  /* ------------------------------------------------------------------ */
  let revealed = false;          // the releasing reveal — see the header note
  let shown = null;
  let nowId = null;
  let activeId = null;
  let dimmed = null;
  let wasCameraStateDisagree = false;
  let wasBetweenRests = false;

  /* ---- the moon's angles ---------------------------------------------------
     One UNWRAPPED angle per slot, in degrees. Unwrapped is the whole point:
     the stylesheet interpolates `--ang` linearly, so the number written here
     is what decides WHICH WAY ROUND THE CIRCLE an item travels.

     THE DIRECTION IS NOT A SHORTEST PATH, and on an arc it cannot be.
     A full ring is a cycle: every item steps one pitch the same way and the
     wrap is invisible, so "shortest" and "consistent" happen to agree and the
     old code could take the short way and be right. A HALF MOON IS A WINDOW
     onto that cycle, and on every chapter change exactly one mark runs off the
     end of it — from the top tip to the bottom tip, or back. Between those two
     points the short way is 180deg STRAIGHT ACROSS THE FACE OF THE MOON,
     through every other mark and over the button. That is the one path this
     shape must never take.

     So the direction is chosen by the ROTATION, not by the distance: whichever
     way the moon is turning, every mark turns that way, and the one leaving
     the window simply has further to go — 180deg, out past the tip, round the
     hidden half of the circle (which is behind the frame's own edge, see the
     geometry note at the top of this file) and back in at the other tip. Four
     marks move one pitch, one moves four, all five move the same way round.

     `dir` is that rotation, in signed steps, read off the chapter change
     itself: advancing turns the moon so the UPCOMING section rises from below
     into the apex and the outgoing one lifts away above it — the same
     direction of travel as the scroll that caused it, so the instrument agrees
     with the hand that moved it. Going back runs it the other way. */
  const angleOf = CHAPTERS.map(() => 0);
  let curIndex = 0;
  let prevCur = null;
  let turnTimer = 0;
  /* IS THE MOON HOME? Not `!expanded()` — that is already true on the first
     frame of a fold, with every mark still out on the arc and still owed its
     unwrapped angle to travel back along. This is the stricter statement:
     folded, AND the fold has finished, so `--u` is 0 and nothing the angle
     controls is on screen. See the block above writeAngles. */
  let atRest = true;
  let wasOpen = false;
  let restTimer = 0;
  /* The fold's own length: the tips-in cascade (2 * `--cl-cascade`) plus one
     mark's travel (`--cl-travel`) is 0.66s, and this is that with a frame of
     margin. Deliberately a constant rather than a `transitionend` listener —
     the fold ends in five separate transitions on four properties, and the
     question being asked is "has the picture settled", not "did that one
     property finish". */
  const FOLD_HOME_MS = 700;

  /* THE TURN NEEDS AN UNWRAPPED ANGLE; THE FORMATION NEEDS A CANONICAL ONE
     (2026-08-14 — Hannah: "when I'm down at the bottom sections, the intro
     animation feels weird and overlapping, like things go to the wrong place
     to start. When I'm at the top it's effectively perfect").

     Both are true at once because `--ae` is `--u * --ang`, and the two states
     move DIFFERENT variables:

       · a TURN happens with the moon open. `--u` is pinned at 1 and `--ang`
         transitions from its old value to its new one. The unwrapped number
         is what carries the direction rule — four marks one pitch, one mark
         four, all the same way round behind the frame's edge. It must stay.
       · a FORMATION happens with the moon home. `--ang` is fixed and `--u`
         runs 0 -> 1, so the mark sweeps from angle ZERO to whatever number is
         stored. It walks the WHOLE of it.

     So a stored angle of -405deg renders identically to -45deg at rest and is
     a mark spiralling one and an eighth turns on the way out. The angles
     accumulate one pitch per chapter change, which is why this was invisible
     at the top and got monotonically worse going down. Measured on the live
     page, riding down section by section and then opening the moon — the five
     `--ang-to` values, and how many of them sweep more than the moon's own
     90deg half-width:

       mission  0 / 45 / 90 / -90 / -45           0 marks the long way
       inspire  -45 / 0 / 45 / -270 / -90         1
       connect  -90 / -45 / 0 / -315 / -270       2
       owned    -270 / -90 / -45 / -360 / -315    3
       final    -315 / -270 / -90 / -405 / -360   4

     — against an on-screen path of up to 3.63x the straight-line distance to
     the mark's own resting point, and lit marks passing within 0.2px of each
     other mid-formation. That is exactly "things go to the wrong place to
     start", and exactly "at the top it's effectively perfect".

     THE DELETED RE-CANONICALISATION WAS LOAD-BEARING. The half-moon pass
     removed the cluster's `foldedSync` on the reasoning that "the angle is
     never pinned: it is multiplied by `--u`, so at rest it is simply not in
     the picture, and it is already correct when `--u` leaves zero". The first
     half is right and the second does not follow — multiplying by `--u` does
     not take the angle out of the picture, it makes the formation TRAVERSE
     it. The cluster pinned folded slots to 0 and therefore had to spend the
     accumulated turn on the fold; this shape does not pin, and therefore has
     to spend it too, just for a different reason.

     WHEN THE MOON IS HOME THE ANGLE IS A FACT, NOT AN ANIMATION. `atRest`
     below is "folded AND the fold has finished" — not merely "not expanded",
     which is also true for the whole 0.66s of a fold with every mark still on
     screen and still needing its unwrapped value to get home. While it holds,
     the angle is written canonically and with the transition switched off for
     the frame (`j-rail-recentre`), because there is nothing on screen for a
     460ms interpolation to show and a visitor who opens the moon mid-way
     through one would catch the angle between two values. */
  function writeAngles(cur) {
    curIndex = cur;
    const n = CHAPTERS.length;
    const live = expanded();
    /* Which way the moon turns for THIS change, in signed steps. Advancing a
       chapter (dir < 0) lifts every mark towards the top tip. On the very
       first write there is no previous chapter and nothing is on screen yet,
       so the angles are simply stated (`dir === 0` takes the plain shortest
       representative, which from a standing start is the value itself). */
    const dir = prevCur === null ? 0 : -signedRing(((cur - prevCur) % n + n) % n);
    prevCur = cur;
    if (atRest) root.classList.add('j-rail-recentre');
    slots.forEach((s, i) => {
      const k = ((i - cur) % n + n) % n;
      const to = signedRing(k) * STEP;
      if (atRest) {
        // Home: state the angle. There is no motion here to be continuous
        // with, and the next formation starts from exactly this number.
        angleOf[i] = to;
      } else {
        let d = (to - angleOf[i]) % 360;
        if (dir < 0) { if (d > 0) d -= 360; }
        else if (dir > 0) { if (d < 0) d += 360; }
        else if (d > 180) d -= 360;
        else if (d <= -180) d += 360;
        angleOf[i] += d;
      }
      s.li.style.setProperty('--ang-to', angleOf[i].toFixed(2) + 'deg');
      s.li.style.setProperty('--ring', String(k));
      // Distance along the ring from the current item, for the stagger: the
      // pair either side of the slot emerges first, the pair beyond it next.
      s.li.style.setProperty('--step', String(Math.abs(signedRing(k))));
      // …and which side of its own mark this slot's name hangs on, which is a
      // property of the RING POSITION and so is restated with the angle (see
      // WHICH SIDE OF ITS OWN MARK). The switch is invisible: a slot only
      // changes position by turning, and the names sit out the turn.
      s.li.classList.toggle('j-pill-up', PILL_SIDE[k] === 'up');
      s.li.classList.toggle('j-pill-dn', PILL_SIDE[k] === 'dn');
    });
    if (atRest) {
      // Land the new values with the transition still off, then give it back
      // on the next frame — so the angle is simply true from here, and the
      // formation that opens next starts where it means to.
      void root.offsetWidth;
      requestAnimationFrame(() => root.classList.remove('j-rail-recentre'));
    }

    /* THE NAMES SIT OUT THE TURN. A pill names the mark it hangs off, and for
       the length of a rotation no mark is anywhere in particular — every one
       of them is mid-flight around the circle, and a label tracking a glyph
       across the face of the ring is reading out a position rather than
       naming a thing. So the pills are simply out while the ring turns.
       What this is NOT (measured 2026-08-12, and worth recording because the
       first build claimed the opposite): Chrome does re-hit-test :hover when
       the layout moves under a stationary pointer. Held still on slot 1
       through connect -> owned, the pill went out and came back reading a
       stale CONNECT — carried round to the far side of the ring, 80px from
       the pointer, while the mark that had arrived under the cursor showed
       nothing. See THE POINTER'S OWN TRUTH above for the measurement that
       corrects the 2026-08-12 record. The suppression is therefore covering a
       real fault and not merely the transit: it holds the labels off for the
       whole turn, and `syncAt()` re-resolves which mark the pointer is on at
       the moment they are allowed back. The 500ms is sized to outlast the
       460ms angle transition and nothing more. */
    if (live) {
      root.classList.add('j-rail-turn');
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => {
        root.classList.remove('j-rail-turn');
        // The marks have finished moving; the pointer has not. Re-read which
        // one it is over before the names are allowed back on screen.
        syncAt();
      }, 500);
    }
  }

  /** A continuous chapter coordinate: integer values are authored chapter
   *  rests, fractions are the visitor's real progress between them. */
  function progressIndex(p) {
    if (p <= RAIL_RESTS[0]) return 0;
    for (let i = 0; i < RAIL_RESTS.length - 1; i++) {
      if (p <= RAIL_RESTS[i + 1]) {
        return i + (p - RAIL_RESTS[i])
          / Math.max(1e-6, RAIL_RESTS[i + 1] - RAIL_RESTS[i]);
      }
    }
    return RAIL_RESTS.length - 1;
  }

  /** During real scroll, put the moon directly on that coordinate. One mark
   *  fades round the hidden back at either tip; the other four move exactly
   *  with p. Direct nav flights retain writeAngles()'s authored timed turn. */
  function followProgress(p) {
    const pos = progressIndex(p);
    const nearest = Math.max(0, Math.min(N - 1, Math.round(pos)));
    curIndex = nearest;
    prevCur = nearest;
    root.style.setProperty('--cur', pos.toFixed(4));
    slots.forEach((s, i) => {
      let d = i - pos;
      while (d > N / 2) d -= N;
      while (d <= -N / 2) d += N;
      const edge = Math.abs(d);
      const opacity = edge <= 2 ? 1 : Math.max(0, (N / 2 - edge) / 0.5);
      angleOf[i] = d * STEP;
      s.li.style.setProperty('--ang-to', angleOf[i].toFixed(3) + 'deg');
      s.li.style.setProperty('--rail-follow-opacity', opacity.toFixed(3));
      const k = ((Math.round(d) % N) + N) % N;
      s.li.classList.toggle('j-pill-up', PILL_SIDE[k] === 'up');
      s.li.classList.toggle('j-pill-dn', PILL_SIDE[k] === 'dn');
    });
    const between = Math.abs(pos - nearest) > 0.002;
    root.classList.toggle('j-rail-between', between);
    if (between !== wasBetweenRests) {
      wasBetweenRests = between;
      if (between) clearTimeout(turnTimer);
      else syncAt();
    }
  }

  function update(p, {
    modalDetail = false,
    cameraStateDisagree = false,
  } = {}) {
    /* THE HERO OWNS ITS WHOLE ARRIVAL, IN BOTH DIRECTIONS (2026-08-19).

       The old SHOW_P latch was pose-aligned: it stayed visible almost all the
       way home (until p 0.004), then appeared almost as soon as the camera left
       (at p 0.004). On a phone that put the journey control over nearly the
       whole hero transition in both directions — disappearing too late on the
       way in and returning too early on the way out.

       The first outside chapter boundary is the scrolling handoff. Crossing
       below it means the camera is heading into the hero, so release; crossing
       up to it means Inspire has begun, so reveal instead of waiting for its
       late rest point. A direct jump places p at its destination before the
       camera travels; cameraStateDisagree therefore delays only a FRESH reveal
       until that camera arrives, while a rail that was already visible for an
       outside-to-outside jump stays visible. A jump HOME still hides on its
       first destination-progress frame, exactly when the travel starts.

       A live control never vanishes under a hand: hover, an open fan, focus
       (`expanded()` carries it), and the modal menu keep the existing hold.
       Letting go while inside the hero leg is itself the hide moment. */
    const held = hovering || expanded() || menuIsOpen;
    if (p < FIRST_OUTSIDE_P) {
      if (revealed && !held) revealed = false;
    } else if (!cameraStateDisagree) {
      revealed = true;
    }

    const show = ALWAYS_OPEN ? pinnedRevealed : revealed;
    if (show !== shown) { root.classList.toggle('on', show); shown = show; }

    const jumpStarted = cameraStateDisagree && !wasCameraStateDisagree;
    wasCameraStateDisagree = cameraStateDisagree;
    const following = pinnedRevealed && Date.now() >= followReadyAt && !cameraStateDisagree;
    root.classList.toggle('j-rail-following', following);
    let wroteJumpAngles = false;
    if (jumpStarted) {
      const target = CHAPTERS.findIndex(c => c.id === chapterAt(p).id);
      root.classList.remove('j-rail-between');
      wasBetweenRests = false;
      root.style.setProperty('--cur', String(target));
      writeAngles(target);
      wroteJumpAngles = true;
    }

    /* THE MOON GOING HOME IS THE MOMENT TO RESTATE ITS ANGLES. Watched here,
       per frame, off `expanded()` itself rather than hooked onto each of the
       ways it can close — the dwell, a pointerleave, a touch collapse,
       Escape, focus leaving the control — because `expanded()` is already the
       one authority on the question and a new listener per path is a new path
       to miss. Opening again before the fold has finished cancels it: those
       marks never went home, so their angles are still the ones they are
       travelling on. */
    const openNow = expanded();
    if (openNow !== wasOpen) {
      wasOpen = openNow;
      clearTimeout(restTimer);
      if (openNow) atRest = false;
      else restTimer = setTimeout(() => {
        atRest = true;
        writeAngles(curIndex);   // canonical, and with no transition to show
      }, FOLD_HOME_MS);
    }

    // Which scene is on screen (the resting symbol, and the fan's anchor) and
    // which nav entry reads current (the marked one). They differ only in a
    // nav-less chapter.
    const nowNext = chapterAt(p).id;
    if (nowNext !== nowId) {
      nowId = nowNext;
      const cur = CHAPTERS.findIndex(c => c.id === nowId);
      // The fan is anchored on the current slot: --cur positions every other
      // slot relative to it, --d is each slot's distance for the stagger.
      if (!following) root.style.setProperty('--cur', String(cur));
      slots.forEach((s, i) => {
        s.li.classList.toggle('now', s.id === nowId);
        s.li.style.setProperty('--d', String(Math.abs(i - cur)));
      });
      // ...and the same move stated as a rotation, for the cluster geometry.
      if (!following && !wroteJumpAngles) writeAngles(cur);
      // The PANEL's list marks the chapter you are actually in — it follows
      // `now`, not `active`, because it is the one surface that can name the
      // epilogue, and Owned -> Final changes `now` without changing `active`.
      for (const id in menuLinks) {
        if (id === nowId) menuLinks[id].setAttribute('aria-current', 'true');
        else menuLinks[id].removeAttribute('aria-current');
      }
    }
    if (following) followProgress(p);
    // With all five slots linked (THE EPILOGUE), the marked entry and the
    // scene on screen are the same statement: `aria-current` and the reticle
    // follow chapterAt(p) — the rail itself can now say "you are in the
    // epilogue", as the panel always could. (navChapterAt, which held the
    // last NAV'D chapter current through the epilogue, served the four-link
    // rail; nothing here needs it any more.)
    if (nowNext !== activeId) {
      activeId = nowNext;
      for (const s of slots) {
        const on = s.id === activeId;
        s.li.classList.toggle('active', on);
        if (on) s.item.setAttribute('aria-current', 'true');
        else s.item.removeAttribute('aria-current');
      }
    }

    // A modal detail claims the frame: the rail leaves the tab order and the
    // a11y tree until it is closed — and, because the detail CARD stands on
    // this same right flank, it steps back visually too. Not while the MENU
    // is open — the menu sets root.inert itself, and it is the rail's own
    // dialog.
    if (!menuIsOpen) {
      const want = !modalDetail;
      if (root.inert === want) root.inert = !want;
    }
    if (modalDetail !== dimmed) {
      dimmed = modalDetail;
      root.classList.toggle('dim', modalDetail);
    }
  }

  return {
    root, menu, update, reveal,
    /** QA */
    get menuOpen() { return menuIsOpen; },
    get expanded() { return expanded(); },
    get resting() { return nowId; },
    get current() { return activeId; },
    openMenu, closeMenu, collapse,
  };
}
