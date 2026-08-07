// journey/symbols.js — THE SECTION SYMBOLS.
//
// One hairline mark per chapter, for the side navigator (journey/rail.js) and
// for the static tier's copy of it (static/index.html). This file is the ONLY
// place the geometry is authored; the static page authors the same markup by
// hand (it must render with scripting disabled) and its drift guard imports
// `SYMBOLS` + `signature()` from here and asserts the two agree — exactly the
// arrangement content.js already has with the static page's copy
// (13-content-ops.md CO-2.2, "no duplicated strings", applied to drawings).
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

const NS = 'http://www.w3.org/2000/svg';

/** `p` = a hairline path (fill none, stroke currentColor).
 *  `c` = [cx, cy, r], a filled point of light. */
export const SYMBOLS = {
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
      { p: 'M1.6 17.6 L6.2 14.8 L12.4 17.2 L17.8 13.2 L20.4 14.2' }, // strand
      // The branches climb almost to the horizon: they are what ties the line
      // at the top to the network below it, so the horizon reads as this
      // ground's own edge rather than as a rule floating over a node graph.
      { p: 'M6.2 14.8 L9.4 10.0' },                              // branch
      { p: 'M17.8 13.2 L15.2 9.6' },                             // branch
      { c: [6.2, 14.8, 1.2] },                                   // the three hubs
      { c: [12.4, 17.2, 1.0] },
      { c: [17.8, 13.2, 1.15] },
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

export const VIEW_BOX = '0 0 22 22';

/** Build a symbol as a detached <svg>. Presentational everywhere it is used —
 *  every control that carries one also carries its own accessible name — so it
 *  is aria-hidden and unfocusable by construction, not by the caller
 *  remembering. */
export function buildSymbol(id) {
  const spec = SYMBOLS[id];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `j-sym j-sym-${id}`);
  svg.setAttribute('viewBox', VIEW_BOX);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (!spec) return svg;
  for (const part of spec.parts) {
    if (part.p) {
      const n = document.createElementNS(NS, 'path');
      n.setAttribute('d', part.p);
      svg.appendChild(n);
    } else if (part.c) {
      const n = document.createElementNS(NS, 'circle');
      n.setAttribute('cx', String(part.c[0]));
      n.setAttribute('cy', String(part.c[1]));
      n.setAttribute('r', String(part.c[2]));
      svg.appendChild(n);
    }
  }
  return svg;
}

/** A canonical string for a rendered symbol's geometry, computed from the DOM
 *  so it can be taken of an authored <svg> and of a built one with the same
 *  function. The static page's drift guard compares the two; nothing else
 *  needs this. */
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
