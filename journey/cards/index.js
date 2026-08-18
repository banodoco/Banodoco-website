// journey/cards — rich hover-preview internals for the six initiative nodes
// (Hannah, 2026-08-17: "Replace Project Hover Cards with Dynamic 'Show,
// Don't Tell' Previews" — each popover becomes a tiny living window into the
// project it names, visual first, text second).
//
// THE SPLIT THE BRIEF ASKS FOR, and where each half lives:
//
//   OUTSIDE the card — one building. The shell is still ui.js's single
//   `.j-pop` aside: same panel, same gold hairline, same unfurl + filament
//   entry, same placement, same a11y contract (the chip is the disclosure
//   control, the `short` line is still the accessible description, Escape
//   still dismisses, click still pins). Nothing here touches any of that.
//
//   INSIDE the card — six worlds. Each module below owns one node's stage
//   and speaks that project's own visual language with that project's own
//   assets (assets/cards/, see PROVENANCE.md there): Arca Gidan's four hero
//   posters under real Eubergine; ArtCompute's terminal ledger; 2RP's
//   editorial cover; ADOS's trailers in real Pilowlava; Hivemind's replayed
//   query; the Discord's own daily summaries, fetched live. Do NOT extract a
//   shared "stat pill"/"media strip" component from these: convergence here
//   is exactly the flattening the brief forbids.
//
// CONTRACT (consumed by ui.js showPop/hidePop):
//   CARD_BUILDERS[nodeId] = {
//     build(stage, node)  — called ONCE per node, lazily, on first reveal.
//                           `stage` is an empty div.j-pop-stage owned by this
//                           builder from then on; ui.js never writes into it.
//     activate()          — fresh reveal: start motion, timers, fetches.
//     deactivate()        — hide or node-switch: stop everything started.
//   }
//   Builders must be idempotent under activate/deactivate cycling, must park
//   still under prefers-reduced-motion (REDUCE below is live), and must not
//   reach outside their stage.
//
// STATS POLICY (amends content/content.js's NO LIVE MODULES note, CO-3.1,
// deliberately — per the 2026-08-17 brief, which asks for verified figures
// and prefers dynamically-derived ones): a number may ship here only as
//   (a) a dated fact of a COMPLETED artefact (an edition's final tally, a
//       ledger sum, an inventory snapshot), carrying its as-of date in a
//       provenance comment where it is defined, or
//   (b) a LIVE fetch from the project's own source of record, with a baked,
//       date-labeled fallback (the Discord card).
// Never a hand-maintained "current" counter. Every figure below was verified
// against its source on 2026-08-17 (four research passes; two of the brief's
// own assumed numbers — Arca "208 entries", Hivemind "4,000 workflows" —
// failed verification and are corrected in the modules).

import arca from './arca.js';
import artcompute from './artcompute.js';
import tworp from './tworp.js';
import ados from './ados.js';
import hivemind from './hivemind.js';
import discord from './discord.js';

// A module still under construction exports null; a null builder means the
// node simply keeps the plain popover, so the site is shippable mid-build.
export const CARD_BUILDERS = Object.fromEntries(
  Object.entries({ arca, artcompute, tworp, ados, hivemind, discord })
    .filter(([, b]) => b),
);

/** Live reduced-motion query, shared by builders. */
export const REDUCE = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener() {} };

/** Root-relative asset base — index.html is served from glowshroom/. */
export const CARD_ASSETS = './assets/cards';

/* Chip glyphs (Hannah, 2026-08-18: "imagine if we had minimalistic icons
   instead [of the white dots], one custom to each … all the same colour and
   elegant but minimalistic"). One hairline pictograph per initiative, all
   drawn in the same hand: 12-unit grid, single stroke weight, round joins,
   currentColor (the chip paints them house-gold, cards.css .j-hot-ico).
   ui.js drops one into the chip's dot slot when the node has an entry here;
   every other hotspot keeps the plain dot. */
const I = (paths) =>
  `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">${paths}</svg>`;

export const CARD_ICONS = {
  // a torch — the mark arcagidan.com puts above its own wordmark; the
  // flame tapers to a point so it cannot read as a keyhole
  arca: I('<path d="M6 1c.95 1.25 1.4 2.25 1.4 3.05a1.4 1.4 0 0 1-2.8 0C4.6 3.25 5.05 2.25 6 1Z"/><path d="M4.55 6.2h2.9M6 6.2v4.3"/>'),
  // a bare die — compute, pins out
  artcompute: I('<rect x="3.4" y="3.4" width="5.2" height="5.2" rx="0.8"/><path d="M5 3.4V1.8M7 3.4V1.8M5 10.2V8.6M7 10.2V8.6M3.4 5H1.8M3.4 7H1.8M10.2 5H8.6M10.2 7H8.6"/>'),
  // an open spread — the publication
  tworp: I('<path d="M6 3.1C5.05 2.25 3.75 1.95 2.3 2.05v7.1c1.45-.1 2.75.2 3.7 1.05.95-.85 2.25-1.15 3.7-1.05v-7.1C8.25 1.95 6.95 2.25 6 3.1Z"/><path d="M6 3.1v7.1"/>'),
  // a place pin — gatherings in the real world
  ados: I('<path d="M6 1.7a3.2 3.2 0 0 1 3.2 3.2C9.2 7.1 6 10.3 6 10.3S2.8 7.1 2.8 4.9A3.2 3.2 0 0 1 6 1.7Z"/><circle cx="6" cy="4.9" r="1.05"/>'),
  // a hive cell holding one point of light
  hivemind: I('<path d="M6 1.45 9.85 3.7v4.6L6 10.55 2.15 8.3V3.7Z"/><circle cx="6" cy="6" r="1.1"/>'),
  // a speech bubble — the room where the talk happens
  discord: I('<path d="M2.1 3.5C2.1 2.7 2.75 2.05 3.55 2.05h4.9c.8 0 1.45.65 1.45 1.45v3.2c0 .8-.65 1.45-1.45 1.45H5.7L3.55 9.95V8.15C2.75 8.15 2.1 7.5 2.1 6.7Z"/>'),
};
