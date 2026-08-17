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
