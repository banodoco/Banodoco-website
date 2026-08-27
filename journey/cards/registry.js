// journey/cards/registry.js — the single owner of the card builder registry.
//
// U01b (2026-08-22): the six builder imports, the `CARD_BUILDERS` map and the
// registry's public configuration re-exports used to sit in
// journey/cards/index.js, interleaved with the idle-warming scheduler and the
// chip glyph data. They are lifted here whole, byte-for-byte, so the registry
// has one owner and index.js is left as the package face that re-exports it.
// Nothing about what the registry CONTAINS changed: same six modules, same
// import order (so the module-evaluation order of the builders is unchanged),
// same null filter, same identities. See tools/test-card-registry.mjs for the
// identity/order/export-name proof against the pre-move bytes.
//
// ACYCLIC BY CONSTRUCTION: this module imports the six builder leaves and the
// runtime leaf, and nothing imports back into it from below — the builders
// depend on ./runtime.js, never on this file or on ./index.js.
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
//   still under prefers-reduced-motion (REDUCE is live), and must not
//   reach outside their stage.

import arca from './arca.js';
import artcompute from './artcompute.js';
import tworp from './tworp.js';
import ados from './ados.js';
import hivemind from './hivemind.js';
import discord from './discord.js';

// Preserve the registry's public configuration exports while builders depend
// on the acyclic runtime leaf rather than importing back through this module.
export { CARD_ASSETS, REDUCE } from './runtime.js';

// A module still under construction exports null; a null builder means the
// node simply keeps the plain popover, so the site is shippable mid-build.
export const CARD_BUILDERS = Object.fromEntries(
  Object.entries({ arca, artcompute, tworp, ados, hivemind, discord })
    .filter(([, b]) => b),
);
