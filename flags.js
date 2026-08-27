// flags.js — THE flag registry, at the site root (M5 debt burn-down,
// journey-v6-plan/15-merge-and-architecture.md M5 row + §1 rule 1).
//
// Before this file: five-plus modules each parsed `location.search` (or
// `localStorage`) independently for their own flag — main.js, journey/
// scroll.js, journey/director.js, journey/chapters/inspire/index.js,
// journey/journey.js, organism/organism.js, organism/spores.js,
// organism/intro.js. This module is the one and only place that touches
// `location.search` / `URLSearchParams` / the flag-related `localStorage`
// keys. It parses ONCE at load (module-level, not per-call) and exports
// named, documented accessors. Every scattered parse site now imports from
// here instead.
//
// WHY IT LIVES AT THE SITE ROOT, not journey/flags.js: organism/
// modules read flags too (organism.js, spores.js, intro.js), and the merge
// doc's ownership rule (§1 rule 1: "organism is a library, journey extends
// it") means organism must never import FROM journey. Sitting the registry
// one level above both — at the site root, beside main.js — lets
// main.js, organism/*, and journey/* all import it without either layer
// depending on the other.
//
// Each accessor documents: what it does, who reads it, QA-only or shipped.
// "QA-only" means a real visitor never sets it; it exists for design
// review, debugging, or capture tooling. Zero behaviour change from the
// pre-registry code: every flag is reproduced with its EXACT original
// parse expression (including two quirks worth flagging explicitly —
// see NOINTRO and LIT below, and the .includes()-substring group at the
// bottom, which matches on raw location.search rather than a parsed key).

const _search = typeof location !== 'undefined' ? location.search : '';
const _qs = new URLSearchParams(_search);

/** ?capture=<p 0..1 | chapterId> — freeze pipeline for capture.py stills
 *  (M5). Implies ?nointro. Read by: main.js (freezes the organism's shared
 *  clock at t=0, skips the intro choreography), journey.js (places the
 *  journey at exactly p, or a named chapter's rest progress). QA/tooling
 *  only — a real visitor never sets this. */
export const CAPTURE = _qs.get('capture'); // string | null

/** ?nointro=<truthy> — skip the hero's entry choreography entirely (design
 *  review stills of the settled page). Read by: main.js. QA-only.
 *  QUIRK PRESERVED: `?nointro` with no value parses to `""`, which is
 *  falsy — the original code required a truthy value (e.g. `?nointro=1`),
 *  and this export reproduces that exactly rather than "fixing" it, per
 *  the zero-behaviour-change rule. */
export const NOINTRO = _qs.get('nointro'); // string | null, "" is falsy

/** ?introat=<p 0..1> — freeze the entry choreography (both the page's CSS
 *  half and the organism's own draw progress) at a fixed point, for frame
 *  inspection. Read by: main.js (pauses the CSS Web Animations at the
 *  matching wall-clock ms), organism/intro.js (parks drawU + shellsAt at
 *  p instead of running the live intro). QA-only. */
export const INTROAT = _qs.get('introat'); // string | null

/** ?hl=spores|stem|ground — force a hero region into its highlighted
 *  state at boot, bypassing hover. Read by: main.js. Design-review/QA. */
export const HL = _qs.get('hl'); // string | null

/** ?lit=<truthy> — force every hero callout into its hover ("lit") state,
 *  with transitions snapped so the forced state renders instantly. Read
 *  by: main.js. Design-review/QA. Same blank-value quirk as NOINTRO:
 *  `?lit` alone is falsy; `?lit=1` is truthy. Preserved as-is. */
export const LIT = _qs.get('lit'); // string | null, "" is falsy

/** ?body=serif — serif body-copy A/B variant (same effect as pressing the
 *  B key at runtime). Read by: main.js. Design-review/QA. */
export const BODY_SERIF = _qs.get('body') === 'serif'; // boolean

/** ?free=<truthy> — keep the hero's fully interactive orbit camera (grab
 *  cursor, free zoom/pan/rotate) instead of handing input to the journey.
 *  Read by: main.js. QA/demo escape hatch. */
export const FREE_CAM = _qs.get('free'); // string | null

/** ?nosnap=1 — disable commit-resolution (the snap-to-rest behaviour),
 *  restoring the band-limited soft snap so ?p= deep-scrub QA can park at
 *  arbitrary positions without the ride pulling it to a rest. Read by:
 *  journey/scroll.js. QA-only. */
export const NOSNAP = _qs.get('nosnap') === '1'; // boolean

/** ?aspect=portrait|landscape|<number> — force the camera composition's
 *  aspect ratio, overriding the real viewport (capture tooling + desktop
 *  review of phone/tablet framing). 'portrait' -> 0.55, 'landscape' -> 1.6,
 *  a finite number -> that exact aspect, anything else -> null (real
 *  viewport aspect). Read by: journey/director.js. QA/capture-only. */
export const ASPECT = (() => {
  const q = _qs.get('aspect');
  if (q === 'portrait') return 0.55;
  if (q === 'landscape') return 1.6;
  if (q !== null && isFinite(parseFloat(q))) return parseFloat(q);
  return null;
})(); // number | null

/** ?t[=<0..1>] — activates TRANSFORM-dial QA mode (see journey/dial.js /
 *  journey/chapters/inspire/index.js). Presence alone (no value) recalls
 *  the last persisted QA value; a parseable value sets T at load. Shipped
 *  path never reads this (T_QA_ACTIVE gates it out). Read by: the Inspire
 *  chapter's dial. QA-only. */
export const T_QA_ACTIVE = _qs.has('t'); // boolean
export const T_QS_VALUE = _qs.get('t'); // string | null

/** ?debug=1 — render collected page errors on screen (the deduped set the
 *  window error listeners keep) via the scene-note element. Field/QA-only:
 *  venue staff load /?debug=1 to read failures without devtools. Read by:
 *  main.js. */
export const DEBUG_OVERLAY = _qs.get('debug') === '1'; // boolean

/** ?photos=0 — hold the Owned portrait field on its procedural busts instead
 *  of promoting it to the real contributor photographs.
 *
 *  THE DEFAULT INVERTED 2026-08-16, and the flag's whole reason for existing
 *  changed with it. It was an opt-IN (`?photos=1`) because the only image set
 *  in the repo was randomuser.me/pravatar stock faces marked "never ship" —
 *  auto-promoting those would have presented strangers as Banodoco
 *  contributors. That set is gone; the field now loads each contributor's own
 *  avatar from Banodoco's published sprite (assets/contributor-portraits).
 *  Real faces are the shipped state, so the flag is now an opt-OUT, kept for
 *  A/B against the procedural look and for a fast answer to "is that the
 *  photos or the scene?" in the field. Read by:
 *  journey/chapters/owned/index.js. */
export const PHOTOS = _qs.get('photos') !== '0'; // boolean

/** ?steady=1 — kill the documentary handheld camera layer, for QA that
 *  needs pose sampling to be reproducible frame-to-frame (no seeded
 *  jitter). Read by: journey/journey.js (passed into createDirector).
 *  QA-only. */
export const STEADY = _qs.get('steady') === '1'; // boolean

/** ?p=<0..1> — deep-link the journey straight to a raw progress value on
 *  boot (no travel, no replay). Read by: journey/journey.js. QA/deep-link
 *  tooling; takes priority under ?pose but under ?capture. */
export const P = _qs.get('p'); // string | null

/** ?pose=<chapterId> — deep-link the journey to a named chapter's rest
 *  progress on boot, and writes that chapter into the route (unlike ?p,
 *  which is a raw number with no route write). Read by: journey/journey.js.
 *  QA/deep-link tooling. */
export const POSE = _qs.get('pose'); // string | null

/** ?livebuild=1 — force the journey to build its chapter geometry from
 *  the live procedural builders, skipping the baked-geometry fetch (see
 *  journey/lib/baked.js). The bake is the shipped fast path; livebuild is
 *  the tuning/QA path AND the automatic fallback whenever the bake is
 *  missing or stale. Read by: journey/lib/baked.js. QA/tooling-only — a
 *  real visitor never sets this. */
export const LIVEBUILD = _qs.get('livebuild') === '1'; // boolean

/** ?bakedump=1 — record the live builders' output instead of reading a
 *  bake: every registerGeometry/registerPayload call writes the chapter's
 *  geometry attributes and metadata into window.__bake.chapters, for the
 *  commit-time bake tool (tools/bake-geom.py) to harvest. Read by:
 *  journey/lib/baked.js. Capture-tooling-only — a real visitor never
 *  sets this. */
export const BAKEDUMP = _qs.get('bakedump') === '1'; // boolean

/** ?pr=<number> — pin the renderer's pixel ratio and disable the adaptive
 *  governor entirely (no calibration step, no catastrophic backstop). The
 *  discriminator for "did the resolution system cause what I just saw":
 *  ?pr=2 holds full retina forever; if an artifact survives it, the governor
 *  is innocent. Read by: organism/organism.js. QA-only. */
const _pr = parseFloat(_qs.get('pr'));
export const PIN_PR = Number.isFinite(_pr) && _pr > 0 ? Math.min(_pr, 3) : null; // number | null

/** ?notaa=<truthy, substring match> — disable the TAA accumulation pass,
 *  for A/B measuring its cost/quality. Read by: organism/organism.js.
 *  QA-only. SUBSTRING MATCH, not a parsed key (see note at bottom). */
export const NOTAA = _search.includes('notaa'); // boolean

/** ?nofade=<truthy, substring match> — disable the ground/gill coverage
 *  fade shader term, for A/B measuring it. Read by: organism/organism.js.
 *  QA-only. SUBSTRING MATCH (see note at bottom). */
export const NOFADE = _search.includes('nofade'); // boolean

/** ?dbg=<truthy, substring match> — print the organism's live motion
 *  values (sway etc.) to an on-page debug readout. Read by:
 *  organism/organism.js. QA-only. SUBSTRING MATCH (see note at bottom). */
export const DBG = _search.includes('dbg'); // boolean

/** ?tkdbg=<truthy, substring match> — perf + animator-order probe hooks
 *  on the spore-system driver seat (takeover steering). Read by:
 *  organism/spores.js. QA-only. SUBSTRING MATCH (see note at bottom). */
export const TKDBG = _search.includes('tkdbg'); // boolean

// NOTE on the four substring-matched flags above (NOTAA/NOFADE/DBG/TKDBG):
// their original call sites used `location.search.includes('name')` rather
// than `new URLSearchParams(location.search).get('name')` — a check against
// the RAW query string, not a parsed key. That means e.g. `?xnotaay=1` or
// `?foo=notaadebug` would also flip them on. This is almost certainly
// unintentional laxness in the donor code, but "zero behaviour change" is
// the M5 rule for this pass, so the registry reproduces it exactly rather
// than tightening it to a proper key match. Flagged here for a future,
// separately-reviewed tightening pass.

// [g] — raw (post-bloom hero baseline) vs finished grade, everywhere. This
// is a KEYBOARD shortcut (journey/journey.js), not a URL flag: it never
// reads location.search or localStorage, so there is nothing to migrate it
// to. Listed here only so the inventory is complete — not exported.

/* ================================================================
   STORAGE — the TRANSFORM dial's persisted QA value.
   ================================================================
   Old key: 'journey-v6.transform' (dev-era directory name, pre-merge).
   New key: 'journey.transform' (the directory rename to journey/ already
   happened; the storage key had not caught up).
   Migration runs ONCE at module load: if the new key is unset and the old
   key has a value, copy it forward; then remove the old key regardless
   (so a stale copy never lingers once migrated, and repeat loads are
   no-ops). Wrapped in try/catch: privacy mode / no storage must be a
   silent no-op, matching every other localStorage touch in this codebase.
   ================================================================ */
const TRANSFORM_KEY = 'journey.transform';
const TRANSFORM_KEY_OLD = 'journey-v6.transform';

/* ================================================================
   AN ACCEPTED PAGE-LIFETIME SINGLETON — THE THREE REASONS.
   ================================================================
   `tools/test-page-lifetime.mjs` area A executes all three of these
   against this file's real text and against the imported module.

   1. IT RUNS EXACTLY ONCE PER PAGE, BY THE LANGUAGE. ES modules are cached
      by RESOLVED SPECIFIER, so every importer of `./flags.js` shares one
      evaluation. The census in `tools/test-page-lifetime.mjs` area D proves
      the antecedent that makes that guarantee bite on THIS page: every
      importer in the shipped graph names this module under one specifier
      form. A `?v=` cache-buster on one importer and a bare path on another
      would be two modules, two evaluations, and two of every module-global
      in this file — and `main.js` already imports one module that way, so
      the hazard is live rather than theoretical.

   2. A SECOND EVALUATION WOULD STILL BE HARMLESS. The body is idempotent
      by construction: after the first run the old key is gone, so the copy
      branch cannot be taken again and the removal branch is a no-op. That
      is the property that makes "singleton" a classification rather than a
      requirement — the code does not DEPEND on running once.

   3. CONVERTING IT WOULD TRADE A GUARANTEE FOR A CONVENTION, and Wave 3 is
      behaviour-preserving. The migration must complete before the first
      `getTransformStorage()` read, and that read is NOT in `main.js`: it is
      `journey/chapters/inspire/index.js`, which reaches it through the dial
      it builds during chapter construction. Today the ordering is enforced
      by ESM — a module body runs to completion before any importer's body —
      and no call site can get it wrong. An explicit init call moves the
      ordering into a caller's hands and makes a new class of bug possible
      for no gain, because (1) and (2) already deliver everything the
      conversion would.

   THE RESIDUAL, STATED. This runs at import time, so it touches
   localStorage before any consent surface the page might ever grow. That is
   pre-existing and unchanged by J05; it is recorded here because it is the
   only real argument for the explicit-call form and it is a privacy
   question, not a lifecycle one.
   ================================================================ */
(function migrateTransformStorage() {
  try {
    if (localStorage.getItem(TRANSFORM_KEY) === null) {
      const old = localStorage.getItem(TRANSFORM_KEY_OLD);
      if (old !== null) localStorage.setItem(TRANSFORM_KEY, old);
    }
    if (localStorage.getItem(TRANSFORM_KEY_OLD) !== null) {
      localStorage.removeItem(TRANSFORM_KEY_OLD);
    }
  } catch { /* privacy mode / no storage: nothing to migrate, shipped default stands */ }
})();

/** Read the TRANSFORM dial's persisted QA value. null if unset or storage
 *  is unavailable. QA-only (the shipped path never calls this). */
export function getTransformStorage() {
  try { return localStorage.getItem(TRANSFORM_KEY); } catch { return null; }
}

/** Write the TRANSFORM dial's persisted QA value. Silent no-op in privacy
 *  mode. QA-only — called only from an interactive [ / ] adjustment. */
export function setTransformStorage(v) {
  try { localStorage.setItem(TRANSFORM_KEY, String(v)); } catch { /* privacy mode: session-only */ }
}
