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
// CONTRACT (consumed by ui.js showPop/hidePop): the builder registry and the
// shape every builder must satisfy now live in ONE owner, ./registry.js
// (U01b, 2026-08-22). This module re-exports it; read the contract there.
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

// Warming reads the asset base straight off the acyclic runtime leaf; it does
// not depend on the registry.
import { CARD_ASSETS } from './runtime.js';

// U01b (2026-08-22): the six builder imports, the null-filtered CARD_BUILDERS
// map and the CARD_ASSETS/REDUCE configuration re-exports moved to
// ./registry.js — one acyclic owner for the registry, unchanged in content.
// They are re-exported here so ./cards/index.js remains the single import
// site ui.js sees, with identical binding identities (a re-export forwards
// the live binding; it does not copy it).
export { CARD_BUILDERS, CARD_ASSETS, REDUCE } from './registry.js';

/* ---- idle-time warming (Hannah, 2026-08-18: assets "always loaded before
   we need them but not in a silly way where they'll slow down the site").
   This module is imported when the journey tier lazily boots — after the
   hero's first paint, which is the budget that must not move. From there,
   everything a first hover needs is warmed ONE ASSET PER IDLE SLICE,
   lightest first: fonts (~60KB, so no swap-flash on first reveal), then
   the still images (~370KB), then the heavy hover media (ADOS trailer
   loops, Arca videos — ~1.6MB) last, so they are usually cached before
   anyone reaches Connect. fetch() primes the HTTP cache (a no-op under
   the dev server's no-store, real caching in production); fonts warm
   through document.fonts so the faces are genuinely parsed. Slow
   connections simply stop warming when hovers start competing — idle
   slices yield to real work by construction.

   U01a (2026-08-21): this used to fire purely as an import-time side
   effect (`setTimeout(warmCardAssets, 1500)` sitting bare at module scope)
   with no way to stop it short of never importing the module. It now has
   one named owner, `startCardWarming`, which does exactly what that timer
   did and hands back a cancel handle. The module STILL starts warming on
   import when `document` exists — behavior preservation is the point of
   this change, not removing the self-start — it just now routes through
   the owner so a later caller (main.js / the journey facade) can adopt an
   explicit call site and actually stop it. See tools/test-card-warming.mjs
   for the ordering/pacing/asset-set/cancel proof. */
const WARM_FONTS = ['Eubergine', 'Geosans Light', 'Pilowlava', 'Monoton', 'Sixtyfour', 'Rubik Glitch'];
const WARM_LIGHT = [
  'arca/poster-1.jpg', 'arca/poster-2.jpg', 'arca/poster-3.jpg', 'arca/poster-4.jpg',
  'ados/paris-2026-thumb.jpg', 'ados/la-2025-thumb.jpg', 'ados/paris-2025-thumb.jpg',
  'artcompute/loreweavr.jpg', 'artcompute/ashmotv.jpg', 'artcompute/persoon.jpg',
  'tworp/cover.jpg', 'hivemind/mascot.png', 'discord/fallback.json',
];
const WARM_HEAVY = [
  'ados/paris-2026-preview.mp4', 'ados/la-2025-preview.mp4', 'ados/paris-2025-preview.mp4',
  'arca/video-1.mp4', 'arca/video-2.mp4', 'arca/video-3.mp4', 'arca/video-4.mp4',
];

// startCardWarming() — the sole owner of the warming cascade. Behavior is
// byte-for-byte identical to the old bare `setTimeout(warmCardAssets, 1500)`:
// same 1500ms delay, same fonts -> light -> heavy order, same one-job-per-
// idle-slice pacing, same requestIdleCallback/setTimeout(400) fallback, same
// asset set. `overrides` exists ONLY so tests can inject clock/idle/fetch/
// document doubles without a browser; every default resolves to the real
// ambient global, so a call with no arguments (the only way this is called
// today) is indistinguishable from the old code.
//
// Returns cancelCardWarming(): idempotent, safe to call before the 1500ms
// timer fires (no fetch ever happens), mid-cascade (remaining idle slices
// stop; whatever fetch was already in flight for the current slice is left
// to finish/abort on its own -- this does not attempt to abort in-flight
// requests), or after the cascade has already finished (no-op).
export function startCardWarming(overrides = {}) {
  const setTimeoutFn = overrides.setTimeoutFn || setTimeout;
  const clearTimeoutFn = overrides.clearTimeoutFn || clearTimeout;
  const fetchFn = overrides.fetchFn || fetch;
  const doc = overrides.doc || document;

  let cancelled = false;

  function warmCardAssets() {
    const ric = typeof overrides.requestIdleCallbackFn === 'function'
      ? overrides.requestIdleCallbackFn
      : (typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn) => setTimeoutFn(fn, 400));
    const queue = [
      () => { for (const f of WARM_FONTS) doc.fonts.load(`1em '${f}'`).catch(() => {}); },
      ...[...WARM_LIGHT, ...WARM_HEAVY].map((path) => () =>
        fetchFn(`${CARD_ASSETS}/${path}`).catch(() => {})),
    ];
    const step = () => {
      if (cancelled) return;
      const job = queue.shift();
      if (!job) return;
      job();
      ric(step);
    };
    ric(step);
  }

  const timerId = setTimeoutFn(() => {
    if (cancelled) return;
    warmCardAssets();
  }, 1500);

  return function cancelCardWarming() {
    if (cancelled) return;
    cancelled = true;
    clearTimeoutFn(timerId);
  };
}

if (typeof document !== 'undefined') {
  // let the journey's own boot work land first; warming is strictly surplus.
  // Self-start by design (U01a preserves today's behavior) -- a later order
  // (U01c/B-series) replaces this with an explicit call site from main.js
  // or the journey facade so the cascade can actually be cancelled.
  startCardWarming();
}

/* Chip glyphs — the `I()` helper and the CARD_ICONS table.
   U01c (2026-08-22): moved to ./icons.js, one data-only owner, unchanged in
   content. Re-exported here so ./cards/index.js remains the single import site
   ui.js and rail.js see, with an identical binding identity (a re-export
   forwards the live binding; it does not copy it) and an unchanged export
   surface. The move is deliberately inert with respect to the warming cascade
   above: ./icons.js imports nothing and schedules nothing, so the self-start's
   epoch — evaluation of THIS module — has not moved. */
export { CARD_ICONS } from './icons.js';
