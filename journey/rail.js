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
// in the PANEL now: the chapter deep links, the social links, and the legal
// line. The static tier carries a hand-
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
//   descriptions and primary links, the social links, and the legal line.
//   Someone who opens it understands what the site
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
import { CHAPTERS, chapterAt, restProgress, HERO_END_P } from './route.js';
import { buildSymbol } from './symbols.js';
import { CARD_ICONS } from './cards/index.js';
import { installBackdropDismiss } from './backdrop.js';
import { claimInput, releaseInput } from './scroll.js';
import { createOwner } from './ui/owner.js';
import { mediaQuery, REDUCE_MOTION } from './ui/media.js';
import {
  RAIL_HANDOFF,
  applyRailHandoffState,
  railGatherX,
  railHandoffRest,
  railHandoffState,
  railHandoffVisual,
  railHandoffWrapVisual,
  railOwnershipIndicatorVisibility,
  railPurposeWrapPresence,
  railWrapNavigationProgress,
  railWrapCoreLabelPresence,
  railWrapVisualChapter,
  railPurposeLabelStage,
  PURPOSE_LABEL_TOP_AT,
} from './ui/rail-handoff.js';
import { NAV_ROW_ITEMS, rowLayout } from './layout/rail-geometry.js';

/* The panel reuses the initiative pictographs already drawn for the in-scene
   chips. Social marks are local to this panel: they replace the former text
   list while their links retain visible-on-hover titles and accessible names. */
const SOCIAL_ICONS = {
  Discord: '<svg viewBox="0 0 127.14 96.36" aria-hidden="true" focusable="false"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>',
  GitHub: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.75 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.83 1.19 3.08 0 4.41-2.71 5.38-5.29 5.67.42.36.78 1.07.78 2.16v3.23c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .7Z"/></svg>',
  X: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.25-8.29L2.97 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.43 4.05H6.58L17.8 19.84Z"/></svg>',
};
const SOCIAL_ORDER = ['X', 'Discord', 'GitHub'];
const CLOSE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5 5 15"/></svg>';
const MANIFESTO_ICON = '<svg class="j-menu-dot-disc" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="2.1" r=".72"/><circle cx="4.7" cy="4" r=".72"/><circle cx="8" cy="4" r=".72"/><circle cx="11.3" cy="4" r=".72"/><circle cx="2.6" cy="6.7" r=".72"/><circle cx="5.3" cy="6.7" r=".72"/><circle cx="8" cy="6.7" r=".72"/><circle cx="10.7" cy="6.7" r=".72"/><circle cx="13.4" cy="6.7" r=".72"/><circle cx="2.6" cy="9.3" r=".72"/><circle cx="5.3" cy="9.3" r=".72"/><circle cx="8" cy="9.3" r=".72"/><circle cx="10.7" cy="9.3" r=".72"/><circle cx="13.4" cy="9.3" r=".72"/><circle cx="4.7" cy="12" r=".72"/><circle cx="8" cy="12" r=".72"/><circle cx="11.3" cy="12" r=".72"/><circle cx="8" cy="13.9" r=".72"/></svg>';

/* THE END OF THE HERO'S LEG is the handoff while scrolling: the rail should
   join as the first chapter proper begins, not wait until that chapter's late
   rest pose. Direct jumps still use cameraStateDisagree below, so they reveal
   only when their camera has actually landed.

   IT IS THE HERO'S OWN BOUNDARY, NOT AN INDEX. This read `CHAPTERS[1] ?
   startOf(CHAPTERS[1].id) : SHOW_P` — derived from the route, but positionally:
   "chapter one" means "the one after the hero" only while the hero is chapter
   zero, which is the same undeclared assumption the p-literals in journey.js
   carried. HERO_END_P says the thing itself, and route.js's CHAPTERS builds
   one chapter's `end` and the next one's `start` from a single accumulated
   `acc / TOTAL`, so it is the identical double, not merely an equal one.

   AND THE FALLBACK IS GONE, WHICH IS THE POINT. `SHOW_P = 0.004` was the
   alternate of that conditional — reachable only on a route with no second
   chapter, and even there wrong: it was a fossil of the retired pose-aligned
   latch described further down, a value near the hero's POSE standing in for
   a boundary at the end of the hero's LEG. A hero always has an end, so the
   expression that needed a stand-in no longer exists. */
const FIRST_OUTSIDE_P = HERO_END_P;

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

/* ===========================================================================
   THE ROW IS NOT THE CHAPTER LIST (owner's navigation restage, 2026-08-26)
   ===========================================================================
   "In the middle, we should have Inspire, Connect, and Equip with Equip
    showing Coming Soon when you hover over it. Intro and Epilogue should be
    smaller. ... Ownership should become a button in the Epilogue section."

   This ends the one-to-one derivation the header above describes: the
   navigator's items are now DECLARED (content/content.js `navigator.items`,
   re-exported frozen by layout/rail-geometry.js so painting and the dock
   consumers share one object) rather than being CHAPTERS in manifest order.
   Two divergences exist, both authored:

     · `equip` is an item with NO chapter — a placeholder whose whole
       behaviour is its answer ("Coming soon"). It is not a link, it never
       reads active, and it is absent from the site-map panel.
     · `owned` is a chapter with NO item — reached from the Epilogue's
       Ownership action and from the panel. While the visitor rides through
       it, the ring travels the Connect->Epilogue connector and NO item
       reads active, which is the honest statement of "you are somewhere
       the menu does not list".

   The route itself is untouched: CHAPTERS keeps its five entries, its
   p-ranges and its cardinality guard. The validation below is loud on
   purpose — a row item naming an unknown chapter is a content bug and must
   not fail silently into a dead link. */
const ROW = NAV_ROW_ITEMS.map((it) => {
  if (it.chapter) {
    const ci = CHAPTERS.findIndex(c => c.id === it.chapter);
    if (ci < 0) {
      throw new Error(`[rail] navigator row names unknown chapter '${it.chapter}'`);
    }
    return { kind: 'chapter', id: it.chapter, ci, size: it.size || 'major' };
  }
  return {
    kind: 'placeholder', id: it.placeholder || 'soon', ci: null,
    label: it.label || '', note: it.note || '', size: it.size || 'major',
  };
});
const ROW_N = ROW.length;
{
  const seen = new Set();
  for (const r of ROW) {
    if (seen.has(r.id)) throw new Error(`[rail] navigator row repeats '${r.id}'`);
    seen.add(r.id);
  }
}

/** Chapter index -> row index, or -1 for a chapter with no row item. */
const ROW_OF_CHAPTER = CHAPTERS.map((c) => ROW.findIndex(r => r.id === c.id));
/* The horizontal map speaks status through colour, continuously: future is a
   legible neutral grey, completed chapters are a slightly brighter warm grey,
   and proximity blends either base into the one gold arrival. Keeping these
   values here also lets the live rail start in the exact state authored by
   the first-paint shell in index.html. */
/* RE-WARMED FOR THE CENTRED ROW (owner's navigation restage, 2026-08-26).
   The reference renders draw every item's ink in the scene's own gold —
   inactive rings ~rgb(160,125,72), inactive glyph strokes brighter warm
   gold — where the strip's future tier was a neutral grey that read as
   disabled against the lit ground. The STATUS LANGUAGE IS KEPT: future is
   still the dimmest tier, past sits brighter, and the one saturated gold
   arrival stays the active voice; only the greys' hue moves into the
   scene's palette. */
/* THE WEIGHTS (owner, 2026-08-26, third pass): active core = 100%,
   inactive core = 60-70% (these alphas), bookends = 35-45% (the minors'
   extra opacity step lives in site.css so it covers glyph and label
   together). Warm gold throughout — the neutral-grey future tier died
   with the first restage pass. */
const GLYPH_COLOURS = Object.freeze({
  future: Object.freeze({ rgb: [226, 190, 122], alpha: 0.66 }),
  past: Object.freeze({ rgb: [232, 200, 142], alpha: 0.72 }),
  active: Object.freeze({ rgb: [246, 208, 126], alpha: 1 }),
});
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

   RETIRED WITH THE PILLS (owner's navigation restage, 2026-08-26): the
   centred row seats every name below its own circle, so the side test and
   its PILL_H/HUG constants are gone; the two paint sites now REMOVE the
   pill classes instead of restating them (see the note at the first
   removal site for the label-hiding fault re-toggling them caused). */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* WHO OWNS A CHAPTER'S VISIBLE NAME: content/content.js, and only it. Said
   here because the name had three claimants and no decision — `chapters.<id>
   .nav` in content.js, `nav:` in journey/structure.js, and a `|| 'Purpose'`
   literal that used to sit inline below. It is content's: the site-map panel
   already declares that source ("section name chapters.<id>.nav"), and a
   layout file is the wrong place to keep a word a visitor reads.

   structure.js's `nav` is NOT a second copy of this and must not be collapsed
   into it — it is a TREATMENT FLAG. `nav: null` is the whole of how Final
   asks for the echo voice (see the j-rail-echo line in the item builder). It
   is read for its nullness, never for its text.

   The fallback is the chapter id on purpose: a missing label is a content
   bug, and it should read as one on screen rather than be papered over with a
   plausible word that is right for exactly one chapter.

   RESOLVED 2026-08-23 (NAV-01). The rail used to override `mission` to
   "Mission" while this returned content's "Intro", so the rail and the
   site-map panel printed different names for the same chapter. Both were
   shipped copy, so settling it was a copy decision, not a cleanup: the site
   owner chose "Intro". The override is gone and every surface now reads
   through content/content.js. */
function chapterName(id) {
  return (CONTENT.chapters[id] || {}).nav || id;
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
  let navigate = typeof onNav === 'function' ? onNav : () => {};
  // Navigation iteration: make the rail the hero's persistent navigation
  // surface instead of revealing it only after the first chapter departure.
  const ALWAYS_OPEN = true;
  /* ------------------------------------------------------------------ *
   * THE OWNER TREE (J04b, lifecycle.md §6.2/§6.3)
   *
   * 24 listeners, 9 timers and 2 rAFs, all of which the rail attaches at
   * construction and none of which it has ever removed. They now go through
   * an owner, so `destroy()` can.
   *
   * INERT ON THE SHIPPED PATH: `owner.listen` is `addEventListener` plus a
   * stored remover; `owner.timer` and `owner.raf` return the raw ids the
   * platform calls return, so every stored-id site and every truthiness
   * guard below reads exactly what it read before. Nothing calls
   * `destroy()` in production.
   *
   * THE FOUR CHILDREN, and what `lifecycle.md` §6.2 asks A02 to decide.
   * A02 — the read-only page-versus-journey ownership map — HAS NOT RUN.
   * The rail is page-lifetime on the shipped path (`main.js:1189` ->
   * `journey.js:48` `prepareRail`) and journey-lifetime on the fallback,
   * and §6.2 poses the `document`-scoped keydown (`global` below) and
   * `document` pointerdown as open questions. THIS SPLIT ANSWERS NEITHER.
   * All four children hang off one root, so `destroy()` drains all of them
   * together and the grouping is descriptive, not a disposal policy. When
   * A02 lands, re-parenting a child is a one-line edit and changes no
   * behaviour. Recorded as J04b's single unverified ownership call.
   * ------------------------------------------------------------------ */
  const owner = createOwner('rail');
  const itemsOwner = owner.child('items');    // the per-chapter slot + menu links
  const hoverOwner = owner.child('hover');    // the hover fan and its fold timers
  const menuOwner = owner.child('menu');      // the menu dialog's own controls
  const globalOwner = owner.child('global');  // listeners on `document`

  const reduceMotion = mediaQuery(REDUCE_MOTION);
  /* The horizontal map is a desktop instrument. The previous mobile
     navigator remains the authored touch/portrait model: a fixed current
     mark, a separate Menu mark, and a deliberate first tap that unfolds the
     five-section file. Keep this query identical to the stylesheet boundary
     below so interaction and geometry can never disagree. */
  const mobileRail = mediaQuery('(pointer: coarse), (max-width: 900px)');

  /* ------------------------------------------------------------------ */
  /* THE RAIL                                                            */
  /* ------------------------------------------------------------------ */
  // A real <nav> landmark with its own label, a sibling of the hero's <nav>
  // on <body>. The hero's wordmark and its Discord pill are untouched
  // (2RP left that row 2026-08-10; the Inspire node keeps it).
  const root = el('nav', 'j-rail');
  root.setAttribute('aria-label', 'Journey sections');
  root.dataset.layout = 'mission';
  root.dataset.handoff = RAIL_HANDOFF.JOURNEY;
  root.classList.add('j-rail-handoff-journey');
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

  // One ring follows the continuous journey coordinate. Keeping it separate
  // from the links prevents chapter-state class changes from flashing or
  // restarting an animation mid-scrub.
  const activeRing = el('li', 'j-rail-active-ring');
  activeRing.setAttribute('aria-hidden', 'true');
  list.appendChild(activeRing);

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

  const slots = [];      // { id, li, item } — one per ROW entry, in row order
  const links = {};      // chapterId -> <a> — every chapter WITH a row item

  ROW.forEach((r, i) => {
    const li = el('li', 'j-rail-slot');
    li.dataset.chapter = r.id;
    li.style.setProperty('--i', String(i));
    // The two circle sizes ("Intro and Epilogue should be smaller"). The
    // class picks which of the root's published diameters this slot reads.
    li.classList.add(r.size === 'minor' ? 'j-rail-minor' : 'j-rail-major');
    const isBootCurrent = r.id === 'mission';
    const initialColour = isBootCurrent ? GLYPH_COLOURS.active : GLYPH_COLOURS.future;
    li.style.setProperty('--glyph-r', String(initialColour.rgb[0]));
    li.style.setProperty('--glyph-g', String(initialColour.rgb[1]));
    li.style.setProperty('--glyph-b', String(initialColour.rgb[2]));
    li.style.setProperty('--glyph-alpha', String(initialColour.alpha));
    li.style.setProperty('--glyph-scale', isBootCurrent ? '1.05' : '1');
    li.style.setProperty('--glyph-glow', isBootCurrent ? '0.34' : '0.02');

    let item;
    if (r.kind === 'chapter') {
      // A chapter's slot is a real link: the chapter has a route, and a tile
      // a pointer can reach must be a tile a pointer can press.
      item = el('a', 'j-rail-item');
      item.href = `#/${r.id}`;
      item.dataset.chapter = r.id;
      // createRail() is mounted before the journey's first update. Match the
      // preboot shell's Mission state at construction time so replacing that
      // shell cannot briefly drop its gold current-state treatment. update()
      // remains the authority as soon as progress exists and will move both
      // classes and aria-current together for every later chapter.
      if (isBootCurrent) {
        li.classList.add('now', 'active');
        item.setAttribute('aria-current', 'true');
      }
      // Collapse the TOUCH state only: a second tap acted, the arming is
      // spent. (The arming itself is dormant while the row is permanently
      // formed — see the pointerdown listener below — but the contract is
      // kept for the day ALWAYS_OPEN is retired.)
      itemsOwner.listen(item, 'click', (e) => {
        e.preventDefault();
        const viaTouch = mobileRail.matches && touchOpen;
        if (viaTouch) collapseTouch();
        navigate(r.id);
        if (viaTouch && document.activeElement === item) item.blur();
      });
      links[r.id] = item;
    } else {
      /* THE PLACEHOLDER IS NOT A LINK, and is deliberately not focusable:
         it has no destination, so putting it in the tab order would promise
         one. Its answer is visual — the label swaps to `note` while the
         pointer is on it (CSS, driven by :hover and `.at`), and a touch
         flashes the same answer through the timed class below. The note
         text also sits in the DOM for assistive tech, so the item reads
         "Equip Soon" rather than as an unexplained dead control. (The word
         is "Soon", not "Coming Soon" — owner, 2026-08-27 — and it is
         content/content.js's `navigator.items[].note`, never a literal
         here. Halving the width is what let the phone row keep its
         spacing.) */
      item = el('span', 'j-rail-item j-rail-soon-item');
      itemsOwner.listen(item, 'pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        li.classList.add('j-rail-note');
        itemsOwner.timer(() => li.classList.remove('j-rail-note'), 1600);
      });
    }

    const mark = el('span', 'j-rail-mark');
    mark.appendChild(buildSymbol(r.id));
    mark.appendChild(reticle());
    item.appendChild(mark);
    // Name from content (see chapterName above for who owns it and why).
    // No overrides: content/content.js is the sole owner of the visible
    // chapter name, and the rail reads through it like every other surface.
    // The placeholder's label and note are content's too (navigator.items).
    item.appendChild(el('span', 'j-rail-name', r.kind === 'chapter' ? chapterName(r.id) : r.label));
    if (r.kind === 'placeholder' && r.note) {
      item.appendChild(el('span', 'j-rail-soon-note', r.note));
    }
    // No PER-SLOT active marker: the owner's design review (2026-08-26)
    // retired the underline that used to be built into each item ("no huge
    // glow and no underline"). What states the active chapter is (a) the
    // item's own brighter ring and ink and (b) the ONE travelling node —
    // `.j-rail-active-ring`, built once above the loop, which hangs at label
    // depth and glides along the row. Do not read this comment as "the row
    // has no dot": it has exactly one, and it belongs to the row rather than
    // to any slot, which is why it can travel and cannot flash on a state
    // change. It is also pinned to opacity 0 in the mission layout — the
    // node is chrome, and chrome arrives with the detachment.
    li.appendChild(item);
    list.appendChild(li);
    slots.push({ id: r.id, li, item });
  });

  /* PURPOSE'S SUBTREE. It stays mounted in all states, but is exposed only
     when the semantic destination has landed on Purpose or is travelling to
     Ownership. The ordinary row's Purpose item is always the parent: during
     Ownership the five row slots gather into the centre, its four peers are
     absorbed, and Purpose remains full-size as the way back. The duplicate
     parent retained below is permanently hidden for DOM compatibility.

     Manifesto deliberately reuses Equip's exact unavailable-item contract:
     a non-link span, not in the tab order, whose label swaps to Soon on hover
     and whose touch answer is the same timed `.j-rail-note` state. */
  const purposeTree = el('div', 'j-rail-purpose-tree');
  purposeTree.setAttribute('role', 'group');
  purposeTree.setAttribute('aria-label', 'Purpose sections');
  purposeTree.setAttribute('aria-hidden', 'true');
  purposeTree.inert = true;

  const purposeParent = el('a', 'j-rail-purpose-parent j-rail-purpose-node');
  purposeParent.href = '#/final';
  purposeParent.dataset.chapter = 'final';
  purposeParent.setAttribute('aria-label', `Return to ${chapterName('final')}`);
  purposeParent.setAttribute('aria-hidden', 'true');
  purposeParent.inert = true;
  const purposeParentMark = el('span', 'j-rail-purpose-mark');
  purposeParentMark.appendChild(buildSymbol('final'));
  purposeParent.appendChild(purposeParentMark);
  purposeParent.appendChild(el('span', 'j-rail-purpose-label', chapterName('final')));
  itemsOwner.listen(purposeParent, 'click', (e) => {
    e.preventDefault();
    navigate('final');
  });
  purposeTree.appendChild(purposeParent);

  const purposeChildren = el('div', 'j-rail-purpose-children');
  const ownershipSlot = el('div', 'j-rail-slot j-rail-minor j-rail-purpose-child j-rail-purpose-ownership');
  const ownershipLink = el('a', 'j-rail-item');
  ownershipLink.href = '#/owned';
  ownershipLink.dataset.chapter = 'owned';
  ownershipLink.setAttribute('aria-label', 'Ownership');
  const ownershipMark = el('span', 'j-rail-mark');
  ownershipMark.appendChild(buildSymbol('owned'));
  ownershipMark.appendChild(reticle());
  ownershipLink.appendChild(ownershipMark);
  ownershipLink.appendChild(el('span', 'j-rail-name', 'Ownership'));
  itemsOwner.listen(ownershipLink, 'click', (e) => {
    e.preventDefault();
    navigate('owned');
  });
  ownershipSlot.appendChild(ownershipLink);
  purposeChildren.appendChild(ownershipSlot);

  const manifestoSlot = el('div', 'j-rail-slot j-rail-minor j-rail-purpose-child j-rail-purpose-manifesto');
  /* Manifesto is unavailable, not unlit. Give it Ownership's resting branch
     colour explicitly so its specimen remains warm and legible before hover;
     the Soon swap changes the answer, not whether the icon exists. */
  const manifestoBase = GLYPH_COLOURS.future;
  manifestoSlot.style.setProperty('--glyph-r', String(manifestoBase.rgb[0]));
  manifestoSlot.style.setProperty('--glyph-g', String(manifestoBase.rgb[1]));
  manifestoSlot.style.setProperty('--glyph-b', String(manifestoBase.rgb[2]));
  manifestoSlot.style.setProperty('--glyph-alpha', String(manifestoBase.alpha));
  manifestoSlot.style.setProperty('--glyph-scale', '1');
  manifestoSlot.style.setProperty('--glyph-glow', '0.02');
  const manifestoItem = el('span', 'j-rail-item j-rail-soon-item');
  manifestoItem.setAttribute('aria-label', 'Manifesto, Soon');
  const manifestoMark = el('span', 'j-rail-mark');
  // The whole-specimen mark is appropriate here: the manifesto describes
  // the purpose as a whole, while its unavailable semantics remain Equip's.
  manifestoMark.appendChild(buildSymbol('mission'));
  manifestoMark.appendChild(reticle());
  manifestoItem.appendChild(manifestoMark);
  manifestoItem.appendChild(el('span', 'j-rail-name', 'Manifesto'));
  manifestoItem.appendChild(el('span', 'j-rail-soon-note', 'Soon'));
  manifestoSlot.appendChild(manifestoItem);
  purposeChildren.appendChild(manifestoSlot);
  purposeTree.appendChild(purposeChildren);

  const purposeIndicator = el('span', 'j-rail-purpose-indicator');
  purposeIndicator.setAttribute('aria-hidden', 'true');
  purposeTree.appendChild(purposeIndicator);
  inner.appendChild(purposeTree);

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

  /* Scroll is no longer a journey input. A wheel, one-finger vertical drag,
     or scroll key points back to this navigator instead: one throttled wave
     across the five marks, never a camera move. A physical gesture emits a
     stream of events, so the cooldown owns the whole stream rather than
     restarting the animation on every trackpad sample. */
  let lastNavigationCueAt = -Infinity;
  let navigationCueTimer = null;
  function stopNavigationCue() {
    if (navigationCueTimer) clearTimeout(navigationCueTimer);
    navigationCueTimer = null;
    root.classList.remove('j-rail-wave');
  }
  function cueNavigation() {
    const now = performance.now();
    if (now - lastNavigationCueAt < 1000) return false;
    lastNavigationCueAt = now;
    stopNavigationCue();
    void root.offsetWidth;
    root.classList.add('j-rail-wave');
    navigationCueTimer = owner.timer(() => {
      root.classList.remove('j-rail-wave');
      navigationCueTimer = null;
    }, 980);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* THE SITE-MAP PANEL                                                  */
  /* ------------------------------------------------------------------ */
  /* CONTENT SOURCE. The section and initiative copy below comes out of
     content/content.js; only the panel-specific ownership CTA is local:

       section name chapters.<id>.nav
       boundary line chapters.mission/final.heading — retained only at the
                    beginning and end of the journey
       item title   nodes.<id>.label
       item line    nodes.<id>.short — the same sentence the node's own
                    popover shows, [PLACEHOLDER] tokens and all.
       item link    nodes.<id>.spotlight.link / .card.link, where one exists
       social       site.social, rendered as accessible icon links
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

  const menuHead = el('div', 'j-menu-head');
  const menuH = el('h2', 'j-menu-h', 'Banodoco');
  menuH.id = 'j-menu-h';
  menuH.tabIndex = -1;
  menuHead.appendChild(menuH);

  const menuSocial = el('ul', 'j-menu-links');
  menuSocial.setAttribute('aria-label', 'Social links');
  for (const label of SOCIAL_ORDER) {
    const link = CONTENT.site.social.find((item) => item.label === label);
    if (!link) continue;
    const li = el('li');
    const a = el('a');
    a.href = link.href || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', link.label);
    a.title = link.label;
    a.innerHTML = SOCIAL_ICONS[link.label] || '';
    li.appendChild(a);
    menuSocial.appendChild(li);
  }
  menuHead.appendChild(menuSocial);

  const menuCloseZone = el('div', 'j-menu-close-zone');
  const menuClose = el('button', 'j-menu-x');
  menuClose.type = 'button';
  menuClose.setAttribute('aria-label', 'Close menu');
  menuClose.title = 'Close menu';
  menuClose.innerHTML = CLOSE_ICON;
  menuCloseZone.appendChild(menuClose);
  menuHead.appendChild(menuCloseZone);
  menu.appendChild(menuHead);

  /** A chapter's nodes, in content.js insertion (= narrative) order. */
  function itemsFor(chapterId) {
    return Object.entries(CONTENT.nodes)
      .filter(([, n]) => n.chapter === chapterId)
      .map(([id, n]) => {
        const d = n.spotlight || n.card || {};
        return { id, label: n.label, short: n.short || '', badge: n.badge || '', link: d.link || null };
      });
  }

  const menuNav = el('nav', 'j-menu-nav');
  menuNav.setAttribute('aria-label', 'All sections');
  const menuList = el('ol', 'j-menu-list');
  const menuLinks = {};
  const menuSections = [
    {
      id: 'mission', route: 'mission', symbol: 'mission',
      thesis: 'We’re working to help the open-source AI art ecosystem thrive',
    },
    {
      id: 'inspire', route: 'inspire', symbol: 'inspire', number: 1, heading: 'By inspiring:',
      items: itemsFor('inspire'),
    },
    {
      id: 'equip', symbol: 'equip', number: 2, heading: 'By equipping:',
      items: [
        {
          id: 'equip-teaser-one', label: 'Quark',
          short: 'Creative tools for everyone',
          symbol: 'equip', badge: 'Soon', teaser: true,
        },
        {
          id: 'equip-teaser-two', label: 'Brötchen',
          short: 'Shared workflows for agents',
          symbol: 'connect', badge: 'Soon', teaser: true,
        },
      ],
    },
    {
      id: 'connect', route: 'connect', symbol: 'connect', number: 3, heading: 'By connecting:',
      items: itemsFor('connect'),
    },
    {
      id: 'final', route: 'final', symbol: 'final',
      thesis: 'The open source ecosystem can accelerate a second renaissance',
      items: [
        {
          id: 'manifesto', label: 'Manifesto',
          short: 'Action at a pivotal moment',
          icon: MANIFESTO_ICON, badge: 'Soon',
        },
        {
          id: 'ownership', label: 'Ownership',
          short: 'equity rewards collaboration',
          symbol: 'owned', internal: 'owned',
        },
      ],
    },
  ];

  menuSections.forEach((section) => {
    const li = el('li');
    const a = el(section.route ? 'a' : 'span', 'j-menu-item');
    a.dataset.menuSection = section.id;
    if (section.route) {
      a.href = `#/${section.route}`;
      a.dataset.chapter = section.route;
    }
    const mark = el('span', 'j-menu-mark');
    mark.appendChild(buildSymbol(section.symbol));
    a.appendChild(mark);
    const txt = el('span', 'j-menu-txt');
    if (section.number) txt.appendChild(el('span', 'j-menu-no', `${section.number}.`));
    if (section.heading) txt.appendChild(el('span', 'j-menu-name', section.heading));
    if (section.thesis) txt.appendChild(el('span', 'j-menu-line j-menu-thesis', section.thesis));
    a.appendChild(txt);
    if (section.route) {
      itemsOwner.listen(a, 'click', (e) => {
        e.preventDefault();
        closeMenu({ focusBack: false });
        navigate(section.route);
      });
      menuLinks[section.route] = a;
    }
    li.appendChild(a);

    const items = section.items || [];
    if (items.length) {
      const sub = el('ul', 'j-menu-sub');
      for (const it of items) {
        const row = el('li', 'j-menu-row');
        let label = null;
        if (it.label) {
          label = el('span', 'j-menu-il');
          const icon = el('span', 'j-menu-pict');
          if (it.icon) {
            icon.classList.add('j-menu-pict-dots');
            icon.innerHTML = it.icon;
          }
          else if (it.symbol) icon.appendChild(buildSymbol(it.symbol));
          else if (CARD_ICONS[it.id]) icon.innerHTML = CARD_ICONS[it.id];
          if (icon.childNodes.length) label.appendChild(icon);
          label.appendChild(document.createTextNode(it.label));
        }
        if (it.link || it.internal) {
          const link = el('a', 'j-menu-row-link');
          if (it.internal) {
            link.href = `#/${it.internal}`;
            link.dataset.chapter = it.internal;
            itemsOwner.listen(link, 'click', (e) => {
              e.preventDefault();
              closeMenu({ focusBack: false });
              navigate(it.internal);
            });
            menuLinks[it.internal] = link;
          } else {
            link.href = it.link.href || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
          if (label) link.appendChild(label);
          if (it.short) link.appendChild(el('span', 'j-menu-is', it.short));
          const arrow = el('span', 'j-menu-ia', it.internal ? '→' : '↗');
          arrow.setAttribute('aria-hidden', 'true');
          link.appendChild(arrow);
          row.appendChild(link);
        } else {
          const surface = el('span', 'j-menu-row-link');
          if (it.teaser) {
            surface.classList.add('j-menu-teaser');
            surface.setAttribute('aria-label', 'Coming soon');
          }
          if (label) surface.appendChild(label);
          const short = it.short ? el('span', 'j-menu-is', it.short) : null;
          if (short) surface.appendChild(short);
          if (it.teaser) {
            if (label) label.setAttribute('aria-hidden', 'true');
            if (short) short.setAttribute('aria-hidden', 'true');
          }
          if (it.badge) {
            const badge = el('span', 'j-menu-badge', it.badge);
            surface.appendChild(badge);
          }
          row.appendChild(surface);
        }
        sub.appendChild(row);
      }
      li.appendChild(sub);
    }

    menuList.appendChild(li);
  });
  menuNav.appendChild(menuList);
  menu.appendChild(menuNav);

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

  /** The centred row is permanently formed on EVERY tier once revealed —
   *  the touch first-tap arming model belonged to the retired edge file,
   *  whose slots were hidden at rest and needed an unfold before a tap
   *  could mean anything. A row that is always visible has nothing to
   *  unfold, so a first tap is a navigation on phones exactly as a first
   *  click is on desktops. */
  function keptOpen() {
    return ALWAYS_OPEN && pinnedRevealed;
  }

  /** Release the persistent rail only after the hero intro has landed. Adding
   *  the existing open classes one painted frame after `.on` reuses the moon's
   *  authored line-draw + cascading formation instead of inventing an entry. */
  function reveal() {
    if (pinnedRevealed) return;
    pinnedRevealed = true;
    root.classList.add('on');
    void root.offsetWidth;
    owner.raf(() => {
      // Every tier keeps the row formed (see keptOpen). The old mobile guard
      // is gone with the edge file it protected; the two copy-dimming rules
      // `body.j-rail-on` used to reach on narrow frames are overridden by
      // the centred-row block in site.css, which is always-present chrome
      // and never stands over the copy.
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
    if (keptOpen()) {
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
  hoverOwner.listen(inner, 'pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hovering = true;
    lastPt = { x: e.clientX, y: e.clientY };
  });
  hoverOwner.listen(hotZone, 'pointerenter', (e) => {
    if (e.pointerType === 'touch' || hotOpen) return;
    // Dwell before unfolding — see the header note. A pointer that is only
    // crossing the flank is gone well inside HOT_INTENT_MS.
    clearTimeout(hotTimer);
    hotTimer = hoverOwner.timer(() => {
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
      formTimer = hoverOwner.timer(syncAt, FOLD_HOME_MS);
    }, HOT_INTENT_MS);
  });
  hoverOwner.listen(hotZone, 'pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    clearTimeout(hotTimer);
  });
  // Leaving the whole control folds an open ring. (On the column fallback this
  // is the second listener it has always had: the list cancels a pending
  // unfold, the control folds an open one.)
  hoverOwner.listen(inner, 'pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    hovering = false;
    clearTimeout(hotTimer);
    clearTimeout(formTimer);
    lastPt = null;
    syncAt();
    if (keptOpen()) return;
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

  hoverOwner.listen(inner, 'pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    lastPt = { x: e.clientX, y: e.clientY };
    syncAt();
  });

  /* Restore the pre-redesign mobile contract verbatim: the first touch on a
     section mark unfolds the fixed file and is swallowed; the second touch
     acts. Desktop keeps the horizontal strip's one-click links. */
  owner.listen(root, 'pointerdown', (e) => {
    // Dormant while the row is permanently formed: there is nothing for a
    // first tap to unfold, so it must not be swallowed as an arming tap.
    // (ALWAYS_OPEN is checked directly, not keptOpen(), so a tap BEFORE the
    // reveal cannot arm either.)
    if (ALWAYS_OPEN) return;
    if (!mobileRail.matches || keptOpen()) return;
    if (e.pointerType !== 'touch' || touchOpen) return;
    // Menu is the other resting control and opens its panel on its first tap.
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    touchOpen = true;
    root.classList.add('j-rail-open');
    announceOpen();
    swallowClick = true;
    owner.timer(() => { swallowClick = false; }, 500);
  }, true);

  owner.listen(root, 'click', (e) => {
    if (!mobileRail.matches || !swallowClick) return;
    swallowClick = false;
    if (e.target instanceof Node && menuBtn.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  globalOwner.listen(document, 'pointerdown', (e) => {
    if (!mobileRail.matches || !touchOpen) return;
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

  function openMenu(trigger, { keyboard = false } = {}) {
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
    // Keyboard entry lands on the explicit close control and keeps its visible
    // focus ring. Pointer/touch entry lands on the dialog heading instead: it
    // announces the panel without painting the close control as preselected.
    (keyboard ? menuClose : menuH).focus({ preventScroll: true });
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
    else menuOwner.timer(finishMenuClose, 320);
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
  menuOwner.listen(menuBtn, 'pointerdown', (e) => {
    if (e.isPrimary === false || e.button !== 0) return;
    e.preventDefault();
    openMenu(menuBtn, { keyboard: false });
  });
  menuOwner.listen(menuBtn, 'click', (e) => openMenu(menuBtn, { keyboard: e.detail === 0 }));

  /* ===================================================================== */
  /* THE BUTTON SAYS IT IS A BUTTON — immediate hover/focus gesture         */
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

     The section rail's 120ms dwell still guards its retired expansion state,
     but this detached top-right button answers for itself on the first hover
     frame. Touch still does not replay the gesture, and reduced motion keeps
     the already-drawn resting mark.

     ONCE PER ARRIVAL, not on a loop. A repeat every second is a control
     asking for attention rather than answering for itself, and the whole of
     the brief is "gently". The class is dropped on `animationend` so the next
     arrival can re-arm it, and re-arming is what a fresh hover means. */
  function replayMenuGlyph() {
    if (menuIsOpen || reduceMotion.matches) return;
    menuBtn.classList.remove('j-rail-nudge');
    void menuBtn.offsetWidth;                 // restart, not merely re-assert
    menuBtn.classList.add('j-rail-nudge');
  }

  menuOwner.listen(menuBtn, 'pointerenter', (e) => {
    if (e.pointerType === 'touch' || menuIsOpen) return;
    replayMenuGlyph();
  });
  menuOwner.listen(menuBtn, 'focus', () => {
    if (menuBtn.matches(':focus-visible')) replayMenuGlyph();
  });
  menuOwner.listen(menuBtn, 'animationend', (e) => {
    if (e.animationName === 'j-menu-rewrite') menuBtn.classList.remove('j-rail-nudge');
  });
  // Prevent pointer focus from landing on the close button before dismissal;
  // keyboard/screen-reader activation still arrives as a click with detail 0
  // and returns focus to the opener.
  menuOwner.listen(menuClose, 'pointerdown', (e) => {
    if (e.isPrimary === false || e.button !== 0) return;
    e.preventDefault();
    closeMenu({ focusBack: false });
  });
  menuOwner.listen(menuClose, 'click', (e) => {
    if (menuIsOpen) closeMenu({ focusBack: e.detail === 0 });
  });
  // backdrop.js returns a matching uninstall for all four of its listeners.
  // Nothing tears this rail down, so the handle is discarded; its listeners
  // are pinned by name in tools/test-render-baseline.mjs's M7 floor.
  installBackdropDismiss(scrim, menu, () => closeMenu({ focusBack: false }));

  // Focus trap. While the dialog is open its own controls are the whole world,
  // so Tab cycles inside it; Shift+Tab wraps the other way.
  menuOwner.listen(menu, 'keydown', (e) => {
    if (e.key !== 'Tab' || !menuIsOpen) return;
    const items = focusables();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    const atControl = items.includes(at);
    if (e.shiftKey && (at === first || !atControl)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !atControl)) { e.preventDefault(); first.focus(); }
  });

  /* Escape, in priority order: the menu first (it is modal and it is the thing
     in front of you), then an expanded rail. Registered in the CAPTURE phase
     so a menu Escape is settled before journey/ui.js's own Escape handler can
     act on a popover or card behind it. */
  globalOwner.listen(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuIsOpen) { e.preventDefault(); e.stopPropagation(); closeMenu(); return; }
    if (!keptOpen() && (touchOpen || hotOpen)) {
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
  let semanticId = null;   // aria-current's owner — rides p, not railP
  let handoffState = RAIL_HANDOFF.JOURNEY;
  let dimmed = null;
  let wasCameraStateDisagree = false;
  let wasBetweenRests = false;
  let horizontalPosition = 0;
  let horizontalWrap = null;
  let horizontalFlight = null;
  let dockingProgress = 0;
  let dockingU = 0;
  let dockingFlight = null;
  let dockingFlightFrom = 0;
  let dockingFlightTarget = 0;
  let handoffFlight = null;
  let handoffFrom = railHandoffRest('mission');
  let handoffVisual = railHandoffRest('mission');

  /* THE CROSSING, GIVEN AN OWNER — and only this one crossing (DEFECT-01 #2).
     The centred row no longer writes ANY inline geometry (the DOCK_INLINE
     list and releaseDock() retired with the travelling dock — position is
     the stylesheet's alone, at every tier), so the scale-down hazard that
     fix answered cannot recur. What the crossing still owns is the resting
     STATE: collapse() re-forms the permanently open row on both sides of
     the boundary. */
  owner.listen(mobileRail, 'change', () => {
    collapse();
  });

  /* THE HERO GATE, WITHOUT THE DOCK. setHeroEase() used to paint the
     strip's whole Mission-to-dock journey — left/top, --nav-x/y, gap and
     scale — and the hero copy's gate fell out of the same docking
     coordinate `u`. The centred row DOES NOT MOVE: it is fixed
     bottom-centre from the first frame, so every inline write is gone and
     `u` survives only as what it always really was — "how far has the
     visitor left the intro", the reversible coordinate the hero copy's
     fade reads. The flight interpolation is kept exactly: a nav jump still
     fades the hero copy with the camera's own smootherstep phase, and an
     interrupted or reversed flight still starts from the value already on
     screen. */
  function setHeroEase() {
    let u;
    if (horizontalWrap) {
      // Let the navigation breathe from its hero pose to its persistent pose
      // across the whole orbital lap. Purpose's branch still owns its late
      // endpoint reveal; coupling the two made the nav wait, then do half a
      // journey's movement during only the final approach.
      u = railWrapNavigationProgress(horizontalWrap);
    } else if (horizontalFlight) {
      /* A non-adjacent click traverses several semantic rail positions in one
         camera move. Deriving the dock from that coordinate compressed the
         whole 196px Mission move into the final fraction of a return flight:
         Final -> Mission visibly moved 72px, then 116px, in two frames. The
         flight already carries the camera's authoritative smootherstep phase,
         so interpolate the dock from its currently painted value to the
         destination dock with that exact phase. Capturing dockingFlightFrom
         when the ticket changes also makes an interrupted/reversed click start
         at the pixel that is already on screen. */
      const phase = Math.max(0, Math.min(1, Number(horizontalFlight.phase) || 0));
      /* Returning to Mission should spend a little more of the camera move in
         the lower dock, then arrive without a late snap. This is still a pure
         transform of the camera's authoritative flight phase: interruption
         captures the pixel already on screen and reversal starts there. */
      const returnPhase = dockingFlightTarget === 0 ? Math.pow(phase, 1.14) : phase;
      const travel = reduceMotion.matches ? (phase >= 0.5 ? 1 : 0) : returnPhase;
      u = dockingFlightFrom
        + (dockingFlightTarget - dockingFlightFrom) * travel;
    } else {
      // Real scrolling remains position-authored. A slightly wider interval
      // makes the return from the lower dock breathe instead of racing the
      // last part of the Mission camera leg.
      const travel = Math.max(0, Math.min(1, (dockingProgress - 0.18) / 0.56));
      u = reduceMotion.matches
        ? (travel >= 0.5 ? 1 : 0)
        : travel * travel * (3 - 2 * travel);
    }
    dockingU = u;
    /* CONTENT AT THE TOP, NAVIGATION BELOW (owner, 2026-08-26, fourth
       pass: "it feels more part of the content when you're at the top,
       and then when I scroll down it shrinks down"). The row's scale is a
       pure function of this same reversible coordinate — content-sized at
       the hero rest, easing to navigation scale as the visitor leaves the
       intro. Published as 1-u ("how much content pose remains"): the
       stylesheet turns it into a scale with each band's own --nav-content-max,
       so the growth is responsive without a second table here. No clock
       and no conversion: u is already priced across the actual
       mission-to-inspire span (scroll) or the camera flight's own phase
       (nav jumps), which is exactly the tempo law's ask — and it is why
       the change cannot pop: it is continuous in the same coordinate
       every other painted quantity here rides. Written for EVERY tier;
       only the hero-copy GATE below stays desktop-only. */
    root.style.setProperty('--nav-content-u', (1 - u).toFixed(4));
    /* The phone tier keeps its own hero-copy timing (copy-arrival treats
       `null` as "the rail is not gating here") — see DEFECT-01 #2 for why
       stepping this gate on a resize crossing latched the hero copy over
       a chapter's. The bail sits AFTER the scale write on purpose: the
       content-to-navigation breathing belongs to phones too. */
    if (mobileRail.matches) return null;
    /* Mission copy fades against this same reversible coordinate, so
       scroll, direct return and an interrupted/reversed flight cannot
       disagree about which of the pair arrived first. Cold boot is
       u=0 -> gate=1. */
    const heroGateX = Math.max(0, Math.min(1, u / 0.05));
    const heroGate = reduceMotion.matches
      ? (u <= 0.001 ? 1 : 0)
      : 1 - heroGateX * heroGateX * (3 - 2 * heroGateX);
    return heroGate;
  }

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
      // A direct jump can interrupt a progress-followed edge handoff. Its
      // authored turn owns the slot from here, so retire that local offset.
      s.li.classList.remove('j-rail-recycle');
      s.li.style.setProperty('--rail-recycle-y', '0px');
      s.li.style.setProperty('--ring', String(k));
      // Distance along the ring from the current item, for the stagger: the
      // pair either side of the slot emerges first, the pair beyond it next.
      s.li.style.setProperty('--step', String(Math.abs(signedRing(k))));
      // The half moon hung each name off a SIDE of its mark (PILL_SIDE) and
      // restated that side with the angle. The centred row seats every name
      // BELOW its own circle, so the pill-side classes are retired — and must
      // not be re-toggled here: the old side-fan label rules key on them at
      // higher specificity than the row's, and a slot carrying one had its
      // label silently hidden (measured 2026-08-26: Equip and Connect lost
      // their Intro-chapter labels to exactly this).
      s.li.classList.remove('j-pill-up', 'j-pill-dn');
    });
    if (atRest) {
      // Land the new values with the transition still off, then give it back
      // on the next frame — so the angle is simply true from here, and the
      // formation that opens next starts where it means to.
      void root.offsetWidth;
      owner.raf(() => root.classList.remove('j-rail-recentre'));
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
      /* THE ROW'S NAMES DO NOT SIT OUT THE TURN (2026-08-27; owner: the
         bookend labels "just JUMP in" on nav clicks while scroll is
         elegant). The moon added `j-rail-turn` here, whose rule blanks
         every name with `transition: none` for the turn plus this 500ms —
         honest for a ring where mid-turn nothing is anywhere in
         particular, and MEASURED as the exact suppressor of the row's one
         label envelope on the click path: the flip landed while the class
         was up, computed transition-property `none`, and the label
         stepped 0 -> 0.62 in a single frame in both directions. The row's
         marks never leave their seats, so a name never stops being true
         and the class is simply not applied any more; the 0.25s opacity
         ease that already serves the scroll path now serves clicks, which
         is the "one owner, one envelope, reached by every route" ask.
         The pointer re-resolution KEEPS its beat: the row's state still
         changes under a parked cursor on arrival, so syncAt() still runs
         when the move has settled. */
      clearTimeout(turnTimer);
      turnTimer = owner.timer(() => {
        // The marks have finished changing state; the pointer has not.
        // Re-read which one it is over.
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

  /* ---- THE ROW'S PIXEL FRAME --------------------------------------------
     The retired strip was uniform — five 48px slots, one gap — so "chapter
     coordinate x step" was its whole geometry. The centred row is not: two
     circle sizes, and a placeholder standing between Inspire and Connect
     with no p of its own. So the paint works in the row's own pixel frame,
     published once per viewport by layout/rail-geometry.js (rowLayout —
     the same numbers the dock consumers read):

       · every ROW item has a fixed centre-x;
       · every CHAPTER anchors at its own item's centre — and a chapter
         with no item (Owned) anchors between its neighbours' centres, at
         its index fraction, so the ring rides the Connect->Epilogue
         connector while the visitor rides the Owned leg;
       · the continuous chapter coordinate maps to px piecewise-linearly
         between those anchors, so the ring crosses Equip's circle on the
         Inspire->Connect leg without ever resting on it.

     The same numbers are republished as custom properties on the root, so
     the stylesheet lays the circles out in exactly the frame JS paints in
     — one table, no drift. */
  let rowPx = null;
  function rowFrame() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (rowPx && rowPx.w === w && rowPx.h === h) return rowPx;
    const L = rowLayout(w, h);
    // Chapter anchors: centre-x and diameter per chapter index.
    const chX = new Array(N);
    const chD = new Array(N);
    for (let ci = 0; ci < N; ci++) {
      const ri = ROW_OF_CHAPTER[ci];
      if (ri >= 0) { chX[ci] = L.centres[ri]; chD[ci] = L.dia[ri]; continue; }
      let lo = ci - 1; while (lo >= 0 && ROW_OF_CHAPTER[lo] < 0) lo--;
      let hi = ci + 1; while (hi < N && ROW_OF_CHAPTER[hi] < 0) hi++;
      if (lo < 0 || hi >= N) {
        // A rowless chapter at either end of the route has no pair to sit
        // between; pin it on its one neighbour.
        const near = lo >= 0 ? ROW_OF_CHAPTER[lo] : ROW_OF_CHAPTER[hi];
        chX[ci] = L.centres[near]; chD[ci] = L.dia[near];
        continue;
      }
      const f = (ci - lo) / (hi - lo);
      const a = ROW_OF_CHAPTER[lo], b = ROW_OF_CHAPTER[hi];
      chX[ci] = L.centres[a] + (L.centres[b] - L.centres[a]) * f;
      chD[ci] = L.dia[a] + (L.dia[b] - L.dia[a]) * f;
    }
    const purposeRowIndex = ROW.findIndex(entry => entry.id === 'final');
    const purposeX = purposeRowIndex >= 0
      ? L.centres[purposeRowIndex] - L.width / 2
      : 0;
    rowPx = { w, h, L, chX, chD, purposeX };
    root.style.setProperty('--nav-major', `${L.major}px`);
    root.style.setProperty('--nav-minor', `${L.minor}px`);
    root.style.setProperty('--nav-ring-d', `${L.majorRingD}px`);
    root.style.setProperty('--nav-minor-ring-d', `${L.minorRingD}px`);
    root.style.setProperty('--nav-connector-air', `${L.connectorAir}px`);
    root.style.setProperty('--nav-gap', `${L.gap}px`);
    root.style.setProperty('--nav-centre-bottom', `${h - L.centreY}px`);
    root.style.setProperty('--purpose-rail-lift-max', `${L.purposeLift}px`);
    root.style.setProperty('--nav-fit-major', String(L.majorFit));
    root.style.setProperty('--nav-fit-minor', String(L.minorFit));
    slots.forEach((slot, index) => {
      if (index >= slots.length - 1) return;
      const slotLeft = L.centres[index] - L.dia[index] / 2;
      const segmentStart = L.centres[index]
        + L.ringDia[index] / 2 + L.connectorAir;
      const segmentEnd = L.centres[index + 1]
        - L.ringDia[index + 1] / 2 - L.connectorAir;
      slot.li.style.setProperty(
        '--connector-left',
        `${(segmentStart - slotLeft).toFixed(3)}px`,
      );
      slot.li.style.setProperty(
        '--connector-width',
        `${Math.max(0, segmentEnd - segmentStart).toFixed(3)}px`,
      );
    });
    if (purposeRowIndex >= 0) {
      root.style.setProperty(
        '--purpose-x',
        `${purposeX.toFixed(3)}px`,
      );
    }
    return rowPx;
  }

  /** A continuous chapter coordinate -> the row's px frame, piecewise
   *  between the chapter anchors. Returns centre-x and the diameter the
   *  travelling ring should carry there. */
  function rowPoint(frame, q) {
    const c = Math.max(0, Math.min(N - 1, q));
    const i = Math.min(N - 2, Math.floor(c));
    const f = Math.max(0, Math.min(1, c - i));
    return {
      x: frame.chX[i] + (frame.chX[i + 1] - frame.chX[i]) * f,
      d: frame.chD[i] + (frame.chD[i + 1] - frame.chD[i]) * f,
    };
  }

  /** Paint the row directly from real journey progress.
   *  No transition or timer sits between input and output: reverse scrolling
   *  reverses immediately, and a stopped scrub leaves every pixel frozen. */
  function paintHorizontalProgress(pos, wrap = null) {
    const frame = rowFrame();
    const { L } = frame;
    const phase = wrap
      ? Math.max(0, Math.min(1, Number(wrap.phase) || 0))
      : 0;
    horizontalPosition = wrap
      ? (wrap.dir > 0 ? (N - 1) * (1 - phase) : (N - 1) * phase)
      : Math.max(0, Math.min(N - 1, Number(pos) || 0));
    const at = rowPoint(frame, horizontalPosition);
    let ringX = at.x;
    let ringOpacity = 1;
    if (wrap) {
      /* The row has a toroidal seam just beyond its two ends. A forward
         Final -> Mission wrap exits to the RIGHT, resets while one
         ring-radius-plus-air beyond the visible row, then enters from the
         LEFT; reverse mirrors that exact path. Keeping the visible legs to
         the first/last fifth preserves the old travel speed without leaving
         the compass detached in empty space. The reset is hidden only while
         both possible coordinates are outside the map, so reversing phase at
         any point retraces the same pixels immediately. Opacity is another
         direct function of that same phase: smoothstep fades the compass out
         over the exit fifth and back in over the entry fifth, with no CSS
         clock left chasing a reversed scrub. Glyph and connector progress
         deliberately keep using horizontalPosition above. */
      const first = frame.chX[0];
      const last = frame.chX[N - 1];
      const outside = 24 + Math.min(12, L.gap / 2);
      const exitEnd = 0.2;
      const enterStart = 0.8;
      if (phase <= exitEnd) {
        const local = phase / exitEnd;
        const eased = local * local * (3 - 2 * local);
        ringOpacity = 1 - eased;
        ringX = wrap.dir > 0
          ? last + outside * local
          : first - outside * local;
      } else if (phase >= enterStart) {
        const local = (phase - enterStart) / (1 - enterStart);
        ringOpacity = local * local * (3 - 2 * local);
        ringX = wrap.dir > 0
          ? first - outside + outside * local
          : last + outside * (1 - local);
      } else {
        ringOpacity = 0;
        ringX = wrap.dir > 0
          ? (phase < 0.5 ? last + outside : first - outside)
          : (phase < 0.5 ? first - outside : last + outside);
      }
    }
    activeRing.style.setProperty('--active-x', `${ringX.toFixed(3)}px`);
    activeRing.style.setProperty('--ring-d', `${at.d.toFixed(2)}px`);
    /* The node is CHROME, and chrome arrives with the detachment (owner,
       fifth pass): embedded in the hero the instrument is scenery and
       marks nothing, so the node's presence rides dockingU — the same
       coordinate the scale, the drop and the scrim ride. dockingU is last
       frame's value when the paint runs first in a frame; both are
       continuous in p, so the seam is invisible. */
    activeRing.style.opacity = (ringOpacity * dockingU).toFixed(6);
    root.style.setProperty('--nav-position', horizontalPosition.toFixed(4));
    root.classList.toggle('j-rail-wrap-progress', !!wrap);
    root.style.setProperty(
      '--wrap-core-label-u',
      (wrap ? railWrapCoreLabelPresence(wrap) : 1).toFixed(5),
    );

    slots.forEach((s, i) => {
      const entry = ROW[i];
      let proximity = 0;
      let past = false;
      if (entry.ci != null) {
        if (wrap) {
          const source = wrap.dir > 0 ? N - 1 : 0;
          const target = wrap.dir > 0 ? 0 : N - 1;
          proximity = entry.ci === source ? 1 - phase
            : entry.ci === target ? phase : 0;
          past = entry.ci === source;
        } else {
          proximity = Math.max(0, 1 - Math.abs(entry.ci - horizontalPosition));
          past = entry.ci < horizontalPosition - 0.001;
        }
      }
      // The placeholder keeps proximity 0 by construction: it can be
      // CROSSED (the ring rides over its circle mid-leg) but never lit —
      // gold is the journey's own colour and Equip has no journey yet.
      const base = past ? GLYPH_COLOURS.past : GLYPH_COLOURS.future;
      const target = GLYPH_COLOURS.active;
      const rgb = base.rgb.map((channel, channelIndex) =>
        channel + (target.rgb[channelIndex] - channel) * proximity);
      const alpha = base.alpha + (target.alpha - base.alpha) * proximity;
      // "+5% scale, no huge glow" — the owner's design review. The scale
      // and glow are the ACTIVE statement now (with the halo); keep both
      // small enough that the mark reads as a lit node, not a button.
      const scale = 1 + 0.05 * proximity;
      const glow = 0.02 + 0.26 * proximity;
      s.li.style.setProperty('--glyph-r', rgb[0].toFixed(2));
      s.li.style.setProperty('--glyph-g', rgb[1].toFixed(2));
      s.li.style.setProperty('--glyph-b', rgb[2].toFixed(2));
      s.li.style.setProperty('--glyph-alpha', alpha.toFixed(3));
      s.li.style.setProperty('--glyph-scale', scale.toFixed(4));
      s.li.style.setProperty('--glyph-glow', glow.toFixed(3));

      if (i < ROW_N - 1) {
        // The connector runs between THIS circle's edge and the next one's.
        // Its bright fill follows the ring's own pixel, so completion is
        // continuous across Equip and across the itemless Owned leg alike.
        // The same responsive optical air used by every visible connector.
        const a = L.centres[i] + L.ringDia[i] / 2 + L.connectorAir;
        const b = L.centres[i + 1] - L.ringDia[i + 1] / 2 - L.connectorAir;
        const fill = Math.max(0, Math.min(b - a, ringX - a));
        s.li.style.setProperty('--connector-fill', `${fill.toFixed(3)}px`);
      }
    });
  }

  /** During real scroll, put the moon directly on that coordinate. One mark
   *  fades round the hidden back at either tip; the other four move exactly
   *  with p. Direct nav flights retain writeAngles()'s authored timed turn. */
  function followCoordinate(pos) {
    const nearestStep = Math.round(pos);
    const nearest = ((nearestStep % N) + N) % N;
    curIndex = nearest;
    prevCur = nearest;
    root.style.setProperty('--cur', pos.toFixed(4));
    /* THE MOON'S PER-SLOT FOLLOW WRITES ARE RETIRED (2026-08-26, owner:
       "when I scroll between sections the labels disappear"). This loop
       used to restate every slot's angle, its edge-fade opacity and the
       recycle drop — the half moon's own choreography, where the mark
       furthest round the ring fades through the hidden back. On the row
       those writes were pure hazard: at the exact midpoint between two
       rests the wrap arithmetic put one ROW item at opacity 0 through the
       legacy `.j-rail-following` rule, and the `!important` between-rests
       name-blanking rule (now deleted in site.css) hid every label with
       it. The row's own follow paint is paintHorizontalProgress(), which
       update() has already run this frame; nothing per-slot is left for
       the follower to say. */
    for (const slot of slots) {
      slot.li.classList.remove('j-pill-up', 'j-pill-dn', 'j-rail-recycle');
    }
    const between = Math.abs(pos - nearestStep) > 0.002;
    root.classList.toggle('j-rail-between', between);
    if (between !== wasBetweenRests) {
      wasBetweenRests = between;
      if (between) clearTimeout(turnTimer);
      else syncAt();
    }
  }

  function followProgress(p) {
    followCoordinate(progressIndex(p));
  }

  /** A wrap is one cyclic step around the moon, paced by the long camera lap
   *  instead of the destination p that was placed before that lap began. */
  function followWrapProgress({ dir, phase }) {
    followCoordinate(dir > 0 ? (N - 1) + phase : -phase);
  }

  /* THE PURPOSE TREE RIDES THE CAMERA, NOT A CSS TIMER. The ordinary row,
     tree reveal, recentering, parent/child current handoff and five-pixel
     indicator are all projected from one eased value each frame. A new
     ticket captures the values already painted, so a reversal begins at the
     current pixels. With no ticket, the selected rest is exact: the current
     transport is button-led and tiny settling residue in p must not keep the
     tree trembling after the camera has landed. Purpose <-> Connect flights
     use their explicit endpoints here; merely crossing Owned's p-band can
     never summon its subtree. */
  function paintPurposeHandoff(selectedChapterId, flight, wrap) {
    const ticket = flight || wrap;
    if (ticket) {
      if (handoffFlight !== ticket) {
        handoffFlight = ticket;
        handoffFrom = { ...handoffVisual };
      }
      handoffVisual = wrap
        ? railHandoffWrapVisual({
          from: handoffFrom,
          targetChapterId: selectedChapterId,
          phase: ticket.phase,
        })
        : railHandoffVisual({
          from: handoffFrom,
          targetChapterId: chapterAt(flight.targetP).id,
          phase: ticket.phase,
        });
    } else {
      handoffFlight = null;
      handoffVisual = railHandoffRest(selectedChapterId);
    }

    const treeU = Math.max(0, Math.min(1, handoffVisual.tree));
    const navPoseU = wrap
      ? railWrapNavigationProgress({ targetChapterId: selectedChapterId, phase: wrap.phase })
      : treeU;
    const ownershipU = Math.max(0, Math.min(1, handoffVisual.ownership));
    const { L, purposeX } = rowFrame();
    /* The children are a viewport-centred pair, not a cluster hanging from
       the rightmost Purpose slot. Purpose remains the physical parent while
       the row is open, so the connector needs two anchors: its root follows
       Purpose as it gathers, while its junction stays on the viewport axis.
       The tree's late Ownership grow scales around its root; divide by that
       scale below so the painted junction (and therefore the pair) remains
       exactly centred even during that grow. */
    const childOffset = (L.minor + 52) / 2;
    const childGap = Math.max(2, childOffset * 2 - L.minor);
    const childX = -childOffset;
    const ownershipGrowthX = Math.max(0, Math.min(1, (ownershipU - 0.52) / 0.48));
    const ownershipGrowth = ownershipGrowthX * ownershipGrowthX * (3 - 2 * ownershipGrowthX);
    const treeScale = 1 + 0.10 * ownershipGrowth;
    /* A quiet L-pipe locates the branch without turning it into a flowchart:
       down from Purpose's lower ring edge, then left to the viewport axis.
       The junction itself has only two short diagonal arms into the child
       centres. Lengths and angles are recomputed in the same scaled tree
       frame on every camera tick, so gathering and reversal do not detach
       the strokes from either endpoint. */
    const connectorAir = L.connectorAir;
    const dotRadius = 2.5;
    const connectorStartY = L.minorRingD / 2 + connectorAir;
    /* The elbow sits eight pixels above the ordinary active-dot seat. The
       ordinary dot follows this same camera-paced lift through
       --purpose-active-node-lift, so when Ownership takes over both dots
       still occupy the raised elbow's exact pixel; reversal hands it back at
       that same pixel too. */
    const ELBOW_LIFT_PX = 8;
    const splitY = L.major / 2 + 26 - ELBOW_LIFT_PX;
    const dotClearance = dotRadius + connectorAir;
    const trunkLength = Math.max(0, splitY - dotClearance - connectorStartY);
    /* Drop both children from the junction by one shared amount. The branch
       ray is aimed at each child centre, but its painted length stops at the
       minor hit-box edge. That leaves exactly the same ring-to-connector air
       as the top row: (minor hit box - minor ring) / 2. */
    const childDrop = 10;
    const childTopY = splitY + childDrop;
    const branchDrop = L.major / 2 + childDrop;
    const branchCentreLength = Math.hypot(childOffset, branchDrop);
    const childEndClearance = L.minorRingD / 2 + connectorAir;
    const branchLength = Math.max(
      0,
      branchCentreLength - connectorAir - childEndClearance,
    );
    const branchAngle = Math.atan2(branchDrop, childOffset) * 180 / Math.PI;
    /* The pack has one horizontal front. Previously the Purpose tree moved
       toward centre while the indicator also traversed left inside that
       moving tree, so the dot visibly outran the contracting line. Pace the
       entire row, Purpose root and its hairlines with the horizontal leg's
       share of the dot path, and keep the dot at that moving root until the
       diagonal begins. It now reads as one point physically pushing the
       cards and line into their centred stack. */
    const indicatorHorizontalLength = Math.abs(purposeX);
    const indicatorVerticalLength = L.major / 2 + 26;
    const indicatorTotalLength = indicatorHorizontalLength
      + branchCentreLength + indicatorVerticalLength;
    const indicatorJunctionAt = indicatorHorizontalLength / indicatorTotalLength;
    const indicatorIconAt = (indicatorHorizontalLength + branchCentreLength)
      / indicatorTotalLength;
    const horizontalGatherU = Math.max(0, Math.min(1,
      ownershipU / indicatorJunctionAt));
    const indicatorDiagonalU = Math.max(0, Math.min(1,
      (ownershipU - indicatorJunctionAt) / (indicatorIconAt - indicatorJunctionAt)));
    const indicatorVerticalU = Math.max(0,
      (ownershipU - indicatorIconAt) / (1 - indicatorIconAt));
    const treeX = purposeX * (1 - horizontalGatherU);
    const junctionX = -treeX / treeScale;
    // The long reach terminates on the pair's exact midpoint axis. Keeping
    // its endpoint at the junction (rather than inset toward Manifesto)
    // makes the parent line visually neutral; the two diagonal branches own
    // their own equal connectorAir offsets away from that centred endpoint.
    const reachStartX = junctionX;
    const reachLength = Math.max(
      0,
      Math.abs(junctionX) - dotClearance,
    );
    const trunkU = Math.max(0, Math.min(1, treeU / 0.34));
    const reachU = Math.max(0, Math.min(1, (treeU - 0.18) / 0.44));
    const forkU = Math.max(0, Math.min(1, (treeU - 0.50) / 0.36));
    const childU = Math.max(0, Math.min(1, (treeU - 0.64) / 0.36));
    const childScale = 0.34 + 0.66 * childU;
    /* Ownership is a branch destination, but it must speak the same selected
       language as every top-row chapter.  Drive its ink, halo and 5% arrival
       scale from the branch's own camera-paced coordinate using the exact
       palette/function used by writeAngles() for Inspire.  At the endpoint
       the ordinary `.active` rules take over, so this is one navigation
       grammar with a different path — not a bespoke Ownership state. */
    const ownershipBase = GLYPH_COLOURS.future;
    const ownershipTarget = GLYPH_COLOURS.active;
    const ownershipRgb = ownershipBase.rgb.map((channel, channelIndex) =>
      channel + (ownershipTarget.rgb[channelIndex] - channel) * ownershipU);
    const ownershipAlpha = ownershipBase.alpha
      + (ownershipTarget.alpha - ownershipBase.alpha) * ownershipU;
    ownershipSlot.style.setProperty('--glyph-r', ownershipRgb[0].toFixed(2));
    ownershipSlot.style.setProperty('--glyph-g', ownershipRgb[1].toFixed(2));
    ownershipSlot.style.setProperty('--glyph-b', ownershipRgb[2].toFixed(2));
    ownershipSlot.style.setProperty('--glyph-alpha', ownershipAlpha.toFixed(3));
    ownershipSlot.style.setProperty('--glyph-scale', (1 + 0.05 * ownershipU).toFixed(4));
    ownershipSlot.style.setProperty('--glyph-glow', (0.02 + 0.26 * ownershipU).toFixed(3));
    ownershipSlot.classList.toggle(
      'active',
      selectedChapterId === 'owned' && ownershipU >= 0.9999,
    );
    const labelStage = railPurposeLabelStage({ tree: treeU, ownership: ownershipU });
    const labelFade = labelStage === 'leaving'
      ? Math.max(0, Math.min(1, 1 - treeU / PURPOSE_LABEL_TOP_AT))
      : 1;

    root.classList.toggle('j-rail-purpose-visible', treeU > 0.001);
    root.classList.toggle('j-rail-purpose-gathering', ownershipU > 0.001);
    /* A stationary pointer can cross a moving icon during a direct arrival.
       Do not let that incidental :hover expose Purpose's above-seat labels
       before the camera has actually landed. */
    root.classList.toggle(
      'j-rail-purpose-arriving',
      !!ticket && selectedChapterId === 'final',
    );
    for (const stage of ['below', 'leaving', 'above', 'gathering']) {
      root.classList.toggle(`j-rail-purpose-labels-${stage}`, labelStage === stage);
    }
    root.style.setProperty('--purpose-label-fade', labelFade.toFixed(5));
    // Hairline and row packing share the indicator's horizontal front. CSS
    // consumes this open fraction directly; no wall clock chases the dot.
    root.style.setProperty('--purpose-gather-open-u', (1 - horizontalGatherU).toFixed(5));
    /* The broad row scrim must gather with the row too. At Ownership it keeps
       the list's natural width (rather than the five-item +340px footprint),
       with just a modest vertical tightening around the three visible marks. */
    root.style.setProperty(
      '--nav-scrim-extra',
      `${(340 * (1 - ownershipU)).toFixed(3)}px`,
    );
    root.style.setProperty(
      '--nav-scrim-height',
      `${(260 - 20 * ownershipU).toFixed(3)}px`,
    );
    root.style.setProperty(
      '--purpose-peer-open-u',
      (1 - Math.min(1, ownershipU / 0.82)).toFixed(5),
    );
    root.style.setProperty('--purpose-rail-lift', `${(L.purposeLift * navPoseU).toFixed(3)}px`);
    root.style.setProperty('--purpose-tree-x', `${treeX.toFixed(3)}px`);
    root.style.setProperty('--purpose-junction-x', `${junctionX.toFixed(3)}px`);
    root.style.setProperty('--purpose-tree-opacity', treeU.toFixed(5));
    root.style.setProperty('--purpose-tree-blur', `${(3 * (1 - treeU)).toFixed(3)}px`);
    root.style.setProperty('--purpose-trunk-u', trunkU.toFixed(5));
    root.style.setProperty('--purpose-trunk-length', `${trunkLength.toFixed(3)}px`);
    root.style.setProperty('--purpose-reach-u', reachU.toFixed(5));
    root.style.setProperty('--purpose-reach-start-x', `${reachStartX.toFixed(3)}px`);
    root.style.setProperty('--purpose-reach-length', `${reachLength.toFixed(3)}px`);
    root.style.setProperty('--purpose-connector-start-y', `${connectorStartY.toFixed(3)}px`);
    root.style.setProperty('--purpose-split-y', `${splitY.toFixed(3)}px`);
    root.style.setProperty('--purpose-child-top-y', `${childTopY.toFixed(3)}px`);
    root.style.setProperty('--purpose-branch-origin-y', `${(-childDrop).toFixed(3)}px`);
    root.style.setProperty(
      '--purpose-active-node-lift',
      `${(ELBOW_LIFT_PX * treeU).toFixed(3)}px`,
    );
    root.style.setProperty('--purpose-fork-u', forkU.toFixed(5));
    root.style.setProperty('--purpose-branch-start', `${connectorAir.toFixed(3)}px`);
    root.style.setProperty('--purpose-branch-length', `${branchLength.toFixed(3)}px`);
    root.style.setProperty('--purpose-branch-angle', `${branchAngle.toFixed(4)}deg`);
    root.style.setProperty('--purpose-child-u', childU.toFixed(5));
    root.style.setProperty('--purpose-child-scale', childScale.toFixed(5));
    root.style.setProperty('--purpose-tree-scale', treeScale.toFixed(5));
    root.style.setProperty('--purpose-parent-scale', treeScale.toFixed(5));
    root.style.setProperty('--purpose-child-gap', `${childGap.toFixed(3)}px`);
    root.style.setProperty('--purpose-child-shift-x', `${(childX * (1 - childU)).toFixed(3)}px`);
    root.style.setProperty('--purpose-child-shift-y', `${(-22 * (1 - childU)).toFixed(3)}px`);
    root.style.setProperty('--purpose-mark-clip-radius', `${(50 * childU).toFixed(3)}%`);
    const dedicatedIndicator = selectedChapterId === 'owned'
      || (flight && chapterAt(flight.fromP).id === 'owned')
      || ownershipU > 0.001;
    /* Pace the dot by the three visible path lengths. Its horizontal leg is
       the moving Purpose root above; it then follows the Ownership ray
       through the icon centre and takes the standard vertical label-depth
       leg to its resting seat. */
    /* The complete tree grows 10% at settled Ownership, but the selected dot
       is navigation chrome and must keep Inspire's exact screen-space offset
       below its icon. Divide only that icon-to-dot leg by the tree scale so
       the painted distance remains L.major / 2 + 26 at every phase. */
    const indicatorEndY = childTopY + L.major / 2 + (L.major / 2 + 26) / treeScale;
    const ownershipIconY = childTopY + L.major / 2;
    const indicatorX = ownershipU <= indicatorJunctionAt
      ? 0
      : ownershipU <= indicatorIconAt
        ? junctionX + childX * indicatorDiagonalU
        : junctionX + childX;
    const indicatorY = ownershipU <= indicatorJunctionAt
      ? splitY
      : ownershipU <= indicatorIconAt
        ? splitY + branchDrop * indicatorDiagonalU
        : ownershipIconY + (indicatorEndY - ownershipIconY) * indicatorVerticalU;
    const indicatorVisibility = railOwnershipIndicatorVisibility({
      diagonal: indicatorDiagonalU,
      vertical: indicatorVerticalU,
    });
    root.style.setProperty(
      '--purpose-indicator-opacity',
      (dedicatedIndicator ? treeU * indicatorVisibility : 0).toFixed(5),
    );
    root.style.setProperty('--purpose-indicator-x', `${indicatorX.toFixed(3)}px`);
    root.style.setProperty('--purpose-indicator-y', `${indicatorY.toFixed(3)}px`);

    slots.forEach((slot, index) => {
      const gatherX = railGatherX({
        centre: L.centres[index],
        width: L.width,
        phase: horizontalGatherU,
      });
      slot.li.style.setProperty('--purpose-gather-x', `${gatherX.toFixed(3)}px`);
      const gatheredAway = slot.id !== 'final' && ownershipU >= 0.9999;
      slot.li.style.visibility = gatheredAway ? 'hidden' : '';
      slot.item.inert = gatheredAway;
      slot.item.setAttribute('aria-hidden', String(gatheredAway));
    });
  }

  function update(p, {
    modalDetail = false,
    cameraStateDisagree = false,
    railWrap = null,
    railFlight = null,
  } = {}) {
    let railP = p;
    // Every tier paints the same row now — the phone no longer keeps a
    // separate edge file, so it takes the same wrap/flight/position paths.
    if (railWrap) {
      horizontalFlight = null;
      dockingFlight = null;
      const phase = Math.max(0, Math.min(1, Number(railWrap.phase) || 0));
      horizontalWrap = {
        dir: railWrap.dir,
        phase,
        targetChapterId: chapterAt(p).id,
      };
      dockingProgress = railWrapNavigationProgress(horizontalWrap);
      paintHorizontalProgress(0, horizontalWrap);
    } else {
      horizontalWrap = null;
      if (railFlight) {
        horizontalFlight = railFlight;
        if (dockingFlight !== railFlight) {
          dockingFlight = railFlight;
          dockingFlightFrom = dockingU;
          dockingFlightTarget = railFlight.targetP < FIRST_OUTSIDE_P ? 0 : 1;
        }
        const phase = Math.max(0, Math.min(1, Number(railFlight.phase) || 0));
        railP = railFlight.fromP
          + (railFlight.targetP - railFlight.fromP) * phase;
      } else {
        horizontalFlight = null;
        dockingFlight = null;
      }
      const position = progressIndex(railP);
      dockingProgress = Math.min(1, position);
      paintHorizontalProgress(position);
    }
    /* THE HERO OWNS ITS WHOLE ARRIVAL, IN BOTH DIRECTIONS (2026-08-19).

       The old SHOW_P latch (p 0.004; the constant itself is gone, see
       FIRST_OUTSIDE_P above) was pose-aligned: it stayed visible almost all the
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
    const following = pinnedRevealed && Date.now() >= followReadyAt
      && (!cameraStateDisagree || (!!railWrap && !isColumn));
    root.classList.toggle('j-rail-following', following);
    let wroteJumpAngles = false;
    if (jumpStarted && !(railWrap && !isColumn)) {
      const target = CHAPTERS.findIndex(c => c.id === chapterAt(railP).id);
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
      else restTimer = owner.timer(() => {
        atRest = true;
        writeAngles(curIndex);   // canonical, and with no transition to show
      }, FOLD_HOME_MS);
    }

    /* TWO COORDINATES, TWO KINDS OF STATE — THE CONTRACT (2026-08-26,
       refined 2026-08-27 after the owner's "Intro and Epilogue just JUMPS
       in" on nav clicks).

       `p` is the journey's TRUTH: a direct nav click places it at the
       destination before the camera travels. `railP` is the PICTURE: it
       rides the flight's own phase, which is the pace the visitor is
       actually watching.

       SEMANTICS follow p. aria-current — the rail's and the panel's — must
       say where the journey IS, immediately; and under ?capture='s frozen
       clock a flight phase never completes, so semantics keyed to railP
       left aria-current on nothing after a landed navigation (measured
       2026-08-26, browser-smoke live-journey: null !== 'true').

       VISIBLE STAGING follows railP. The layout flag (which stages the
       bookend labels), the `now`/`active` classes (ring brightening, gold
       word, halo) flip as the FLIGHT crosses the chapter boundary — the
       same moment a scroll crosses it — so every route into a chapter
       reaches the one label envelope (the 0.25s opacity ease in site.css)
       mid-picture rather than at click time. Keying these to p made the
       bookend labels pop the moment a click was pressed, two seconds
       before the picture arrived: one owner, one envelope, reached by
       every route. */
    const visNow = railWrap
      ? railWrapVisualChapter({
        homeChapterId: chapterAt(railWrap.homeP).id,
        targetChapterId: chapterAt(railWrap.targetP).id,
        phase: railWrap.phase,
      })
      : chapterAt(railP).id;
    const nowNext = chapterAt(p).id;
    const nextLayout = visNow === 'mission' ? 'mission' : 'chapter';
    if (root.dataset.layout !== nextLayout) root.dataset.layout = nextLayout;

    paintPurposeHandoff(nowNext, railFlight, railWrap);

    /* THE PURPOSE -> OWNERSHIP SUBTREE IS SEMANTIC, NOT GEOMETRIC.
       `railP` / `visNow` are intentionally absent from railHandoffState():
       Purpose <-> Connect flights pass through Owned's numeric band and must
       remain the ordinary journey row throughout. An explicit Ownership
       selection does get its own transit state, so the subtree node begins
       travelling as soon as the route is chosen; only the landed state hides
       the five-item row and exposes the tree's Purpose parent. */
    const nextHandoffState = railHandoffState({
      selectedChapterId: nowNext,
      cameraStateDisagree,
      flightFromId: railFlight ? chapterAt(railFlight.fromP).id : null,
      flightTargetId: railFlight ? chapterAt(railFlight.targetP).id : null,
    });
    if (nextHandoffState !== handoffState) {
      handoffState = nextHandoffState;
      applyRailHandoffState({
        root,
        journeySurface: list,
        treeSurface: purposeTree,
        purposeSurface: purposeParent,
        ownershipSurface: ownershipLink,
      }, handoffState);
    }
    if (visNow !== nowId) {
      nowId = visNow;
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
    }
    if (following) {
      if (railWrap && !isColumn) followWrapProgress(railWrap);
      else followProgress(p);
    }
    // The visual current mark — ring, halo, gold word — arrives with the
    // picture (visNow), exactly as the layout flag above does.
    if (visNow !== activeId) {
      activeId = visNow;
      for (const s of slots) {
        s.li.classList.toggle('active', s.id === activeId);
      }
    }
    // The SEMANTIC current mark arrives with the journey (nowNext): the
    // rail's own aria-current and the panel's. The panel follows `now`'s
    // truth, not `active`'s, because it is the one surface that can name
    // the epilogue — Owned -> Final changes it without changing `active`.
    if (nowNext !== semanticId) {
      semanticId = nowNext;
      for (const s of slots) {
        if (s.id === semanticId) s.item.setAttribute('aria-current', 'true');
        else s.item.removeAttribute('aria-current');
      }
      for (const id in menuLinks) {
        if (id === semanticId) menuLinks[id].setAttribute('aria-current', 'true');
        else menuLinks[id].removeAttribute('aria-current');
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

  /* THE DETAIL'S SYNCHRONOUS RELEASE — the same courtesy the MENU has always
     had. openMenu() and closeMenu() write `root.inert` themselves, on the tick
     of the gesture, and let the next update() agree with them afterwards; the
     detail card had no such writer, so its close completed with the rail still
     inert and dimmed until the next RENDERED frame. Between those two moments
     the application publicly reported the card closed (journey.js closeDetail
     clears `detailNode` before ui.closeCard() returns) while the navigator it
     was guarding still swallowed focus() silently — measured at 9.4 ms; see
     the DEF-01 evidence.

     RELEASE ONLY, never the claim. Opening a modal detail still makes the rail
     inert exactly where it always did, inside update(). And the caller is
     required to have already established that the next update() would compute
     modalDetail === false, so this can only ever land on the state the frame
     is about to reconcile to — never ahead of it, never against it. update()
     then finds nothing to write and stays idempotent. */
  function releaseModal() {
    // The menu owns root.inert for its whole lifetime; the same guard update()
    // uses. A detail cannot be up while the menu is, but say it once here too.
    if (menuIsOpen) return;
    if (root.inert) root.inert = false;
    if (dimmed) { dimmed = false; root.classList.remove('dim'); }
  }

  /* THERE IS NO destroy() HERE. This rail lives as long as the document
     does — on the shipped boot the PAGE owns it (main.js -> journey.js
     prepareRail) — and the teardown that used to stand here had no caller on
     either path. See docs/code-health/DISPOSAL-REMOVED.md.

     Note for anyone tempted to add one: it must write no DOM and no
     `root.inert`. DEF-01 gave `root.inert` exactly four writers and
     tools/test-frame-order.mjs S4 pins that count. */

  return {
    root, menu, update, releaseModal, reveal, setHeroEase,
    cueNavigation, stopNavigationCue,
    setOnNav(fn) { navigate = typeof fn === 'function' ? fn : () => {}; },
    /** QA */
    get menuOpen() { return menuIsOpen; },
    get expanded() { return expanded(); },
    get resting() { return nowId; },
    get current() { return activeId; },
    get docking() { return dockingU; },
    openMenu, closeMenu, collapse,
  };
}
