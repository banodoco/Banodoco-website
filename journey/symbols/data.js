// journey/symbols/data.js — THE SECTION SYMBOLS' DATA.
//
// F02 (2026-08-21): split out of journey/symbols.js, which used to hold this
// geometry AND the DOM-building code together. This module is the pure data
// half: symbol geometry, key order, and the signature() reducer that turns a
// rendered symbol back into a comparable string. It has NO dependency on
// `document` or any DOM global — it is importable and fully exercisable in
// bare Node. journey/symbols/render.js is the DOM-building half (buildSymbol,
// which calls document.createElementNS); journey/symbols.js re-exports both
// unchanged as a compatibility facade so no importer needs to change.
//
// One hairline mark per chapter, for the side navigator (journey/rail.js) and
// for the static tier's copy of it (static/index.html). This file is the ONLY
// place the geometry is authored; the static page authors the same markup by
// hand (it must render with scripting disabled) and its drift guard imports
// `SYMBOLS` + `signature()` from journey/symbols.js and asserts the two
// agree — exactly the arrangement content.js already has with the static
// page's copy (13-content-ops.md CO-2.2, "no duplicated strings", applied to
// drawings).
//
// ---------------------------------------------------------------------------
// THE SYMBOL LANGUAGE
// ---------------------------------------------------------------------------
// Every mark is DERIVED FROM ITS OWN CHAPTER'S SCENE, not chosen from a UI
// icon set. The rule: draw the thing that chapter's camera is actually looking
// at, reduced to the fewest hairlines that still name it. Source of truth for
// each derivation is the shipped still in static/captures/ — if a chapter is
// restaged, its still moves and this mark should be re-derived from the new
// one, not patched.
//
// (The 2026-08-26 navigation restage briefly re-sourced three marks to the
// owner's reference renders; the owner's design review the same day sent the
// section icons BACK to this scene-derived set — the renders stopped being
// authoritative on glyph design. The one mark the restage added for good is
// `equip`, below, which has no chapter and answers to the owner's verbal
// brief instead.)
//
//   mission   THE SPECIMEN, WHOLE. The hero frame is one mushroom standing on
//             the mycelial ground: cap, gill rim, a stipe that flares into the
//             floor, and the ground line under it. The only mark that draws a
//             complete organism, because Mission is the only chapter that
//             frames one.
//
//   inspire   THE CAP RELEASING. inspire@1440x900 is the same cap with a spore
//             plume climbing off it — "push open models beyond their expected
//             limits ... turning breakthrough ideas into a thriving commons."
//             So: the cap, and seven spores ascending away from it, thinning
//             as they go. No stipe and no ground — this chapter's frame has
//             already left both behind.
//
//   connect   THE GROUND NETWORK. connect@1440x900 puts the horizon high and
//             gives the lower frame to a lit ground plane: three bright hubs
//             (ADOS, Hivemind, Discord) strung on a strand that runs away to
//             the edges, with branches leaving it. So: a horizon hairline, one
//             meandering strand with two branches, three filled hubs ON it.
//             The horizon is what keeps this from being a generic node graph —
//             the network here is a PLACE, lying on the ground.
//
//   owned     THE ROOT CROWN AND THE COLONY. owned@1440x900 is a single bright
//             crown at the top of frame with strands raining down from it into
//             an arc of lit bodies — 100% shared, granted downward, split
//             between groups. So: one crown node, four strands, four bodies at
//             their ends. The strands TERMINATE in the bodies rather than
//             stopping short of them, because that adjacency is the claim.
//
//   final     THE FIELD. final@1440x900 is many mushrooms of different sizes
//             standing on one plain — "so one thriving ecosystem becomes
//             many." So: the Mission specimen, three times, at three sizes, on
//             one ground line. It is deliberately Mission's own mark
//             multiplied: the epilogue is the mission having worked.
//
// The menu control's mark is the one glyph here that is NOT a scene: it is a
// contents list, drawn in the site's own vocabulary (a node with a filament
// leaving it, three times) rather than as a hamburger.
//
// All marks share: a 22x22 box, `fill:none` hairline paths at stroke-width 1
// with round caps, and FILLED circles for anything the scene renders as a
// lit point (spores, hubs, bodies, the crown). Colour is `currentColor`
// throughout, so a mark's state is set by the colour of the control it sits
// in and nothing here knows about hover, focus or "current".

import { JOURNEY_SCHEMA, validateJourneyStructure } from '../structure.js';

/** `p` = a hairline path (fill none, stroke currentColor).
 *  `c` = [cx, cy, r], a filled point of light. */
const SYMBOL_DEFINITIONS = {
  mission: {
    label: 'the specimen, whole',
    parts: [
      { p: 'M3.4 10.6 Q11 2.9 18.6 10.6' },            // cap
      { p: 'M3.4 10.6 H18.6' },                        // gill rim
      { p: 'M9.8 10.6 V15.9 Q9.8 18.4 7.1 18.9' },     // stipe, flaring left
      { p: 'M12.2 10.6 V15.9 Q12.2 18.4 14.9 18.9' },  // stipe, flaring right
      { p: 'M2.2 18.9 H19.8' },                        // ground
    ],
  },
  inspire: {
    label: 'the cap releasing',
    parts: [
      // A DEEPER dome than Mission's, because this mark has no stipe under it
      // to say "mushroom" — the silhouette has to carry that alone or it
      // reads as a hill.
      { p: 'M3.6 16.4 Q11 1.8 18.4 16.4' },            // cap
      { p: 'M3.6 16.4 H18.4' },                        // gill rim
      // The plume, thinning as it climbs off the left shoulder — placed just
      // clear of the dome's own curve so the spores read as having LEFT the
      // cap rather than lying on it. Radii are floored near 0.6 for a reason:
      // the mark is DRAWN at 24px, so a unit here is about a pixel, and
      // anything under ~0.55 is a sub-pixel dot the rasteriser turns into a
      // smudge or into nothing. Five carrying dots beat eight that vanish.
      { c: [6.6, 10.4, 0.95] },
      { c: [4.8, 8.8, 0.82] },
      { c: [6.6, 7.4, 0.68] },
      { c: [4.0, 6.0, 0.7] },
      { c: [5.8, 4.2, 0.58] },
    ],
  },
  connect: {
    label: 'the ground network',
    parts: [
      { p: 'M1.8 8.4 H20.2' },                                   // horizon
      // Authored in its final, inward-facing orientation. This used to be
      // mirrored at runtime with CSS, which let the preboot mark paint once
      // in the opposite direction before the live rail styles took over.
      { p: 'M1.6 14.2 L4.2 13.2 L9.6 17.2 L15.8 14.8 L20.4 17.6' }, // strand
      // The branches climb almost to the horizon: they are what ties the line
      // at the top to the network below it, so the horizon reads as this
      // ground's own edge rather than as a rule floating over a node graph.
      { p: 'M15.8 14.8 L12.6 10.0' },                            // branch
      { p: 'M4.2 13.2 L6.8 9.6' },                               // branch
      { c: [15.8, 14.8, 1.2] },                                  // the three hubs
      { c: [9.6, 17.2, 1.0] },
      { c: [4.2, 13.2, 1.15] },
    ],
  },
  owned: {
    label: 'the root crown and the colony',
    parts: [
      { c: [11, 3.6, 1.35] },                          // the crown
      { p: 'M11 3.6 L3.4 15.6' },                      // strands, down to bodies
      { p: 'M11 3.6 L8.2 17.8' },
      { p: 'M11 3.6 L13.8 17.8' },
      { p: 'M11 3.6 L18.6 15.6' },
      { c: [3.4, 15.6, 0.9] },                         // the bodies
      { c: [8.2, 17.8, 1.05] },
      { c: [13.8, 17.8, 1.05] },
      { c: [18.6, 15.6, 0.9] },
    ],
  },
  final: {
    label: 'the field',
    parts: [
      { p: 'M1.6 17.2 H20.4' },                        // one ground
      { p: 'M8.2 11.4 Q12.4 6.2 16.6 11.4' },          // the large specimen
      { p: 'M8.2 11.4 H16.6' },
      { p: 'M12.4 11.4 V17.2' },
      { p: 'M2.0 13.8 Q4.8 10.6 7.6 13.8' },           // and two more, smaller
      { p: 'M4.8 13.8 V17.2' },
      { p: 'M16.4 14.6 Q18.4 12.4 20.4 14.6' },
      { p: 'M18.4 14.6 V17.2' },
    ],
  },
  // Not a chapter's scene — the navigator's one placeholder (Equip, coming
  // soon). Derived from the organism per the owner's brief: "a perspective
  // of the bottom of the mushroom's head looking up from the stalk, like an
  // extreme angle." The first draft drew the view DEAD-ON from under the
  // stalk — rim a near-circle, gills a full radial fan — and read as a
  // ship's wheel, not a cap. The extreme angle is what names the thing, so
  // it is now drawn IN the perspective: the rim a strongly foreshortened
  // ellipse, the stalk seen end-on as a small disc low in the bowl (the
  // viewer is at the stalk, so the far half of the cap shows more of
  // itself), and nine gills radiating from the disc's edge out to the rim,
  // long on the far side, short on the near.
  equip: {
    label: 'the cap from beneath',
    parts: [
      { p: 'M2.4 10 A8.6 4.6 0 1 1 19.6 10 A8.6 4.6 0 1 1 2.4 10' },   // rim
      { p: 'M8.7 12.6 A2.3 1.4 0 1 0 13.3 12.6 A2.3 1.4 0 1 0 8.7 12.6' }, // stalk, end-on
      { p: 'M8.8 12.1 L2.4 10' },                       // gills, radiating
      { p: 'M9.2 11.5 L3.55 7.7' },
      { p: 'M10.2 11.25 L6.7 6.0' },
      { p: 'M11 11.2 L11 5.4' },
      { p: 'M11.8 11.25 L15.3 6.0' },
      { p: 'M12.8 11.5 L18.45 7.7' },
      { p: 'M13.2 12.1 L19.6 10' },
      { p: 'M9.2 13.4 L3.55 12.3' },
      { p: 'M12.8 13.4 L18.45 12.3' },
    ],
  },
  // Not a scene: the contents mark for the menu control. Three filaments
  // leaving three nodes — the site's own vocabulary, used as an index.
  menu: {
    label: 'the contents',
    parts: [
      { c: [4.2, 6.4, 0.85] },
      { p: 'M7.6 6.4 H18.4' },
      { c: [4.2, 11.0, 0.85] },
      { p: 'M7.6 11 H18.4' },
      { c: [4.2, 15.6, 0.85] },
      { p: 'M7.6 15.6 H16.2' },
    ],
  },
};

export const SYMBOLS = Object.fromEntries([
  ...JOURNEY_SCHEMA.chapters.map(({ symbol }) => [symbol, SYMBOL_DEFINITIONS[symbol]]),
  [JOURNEY_SCHEMA.menuSymbol, SYMBOL_DEFINITIONS[JOURNEY_SCHEMA.menuSymbol]],
  // The navigator's placeholder mark rides along explicitly: it has no
  // chapter in the schema to derive it (that is the whole point of a
  // placeholder), so the schema map above can never reach it.
  ['equip', SYMBOL_DEFINITIONS.equip],
]);

validateJourneyStructure(JOURNEY_SCHEMA, { symbols: SYMBOLS });

export const VIEW_BOX = '0 0 22 22';

/** A canonical string for a rendered symbol's geometry, computed from the DOM
 *  so it can be taken of an authored <svg> and of a built one with the same
 *  function. The static page's drift guard compares the two; nothing else
 *  needs this. Despite taking a DOM-shaped `svgEl`, this function itself
 *  touches no DOM global — it only reads the properties (`children`,
 *  `tagName`, `getAttribute`) it is handed, so it runs unmodified against a
 *  plain object built by hand as much as against a real or shimmed element. */
export function signature(svgEl) {
  const out = [];
  for (const n of svgEl.children) {
    if (n.tagName.toLowerCase() === 'path') {
      out.push('p:' + (n.getAttribute('d') || '').replace(/\s+/g, ' ').trim());
    } else if (n.tagName.toLowerCase() === 'circle') {
      out.push(`c:${+n.getAttribute('cx')},${+n.getAttribute('cy')},${+n.getAttribute('r')}`);
    }
  }
  return out.join('|');
}
