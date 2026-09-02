// Canonical identity and cross-module metadata for the journey. Scene geometry
// and chapter-local animation data remain owned by their chapter modules.
//
// EQUIP, 2026-08-30. The sixth row below is new, and the three numbers it moved
// on its neighbours are the whole of what a reviewer needs to check:
//
//   · SPAN. Equip's 12 units come ENTIRELY out of Inspire's 24. Nothing at or
//     above p 0.38 renormalises, which is deliberate rather than tidy —
//     journey/portrait.js and chapters/owned/leg.js hang absolute-p literals
//     off the spans above that boundary, and chapters/connect/index.js's light
//     schedule is leg-local to a span that has not moved. route.js's LEGACY
//     table carries the full statement.
//   · REST. Inspire's rest moves 0.26 -> 0.20 and the copy system is what
//     bought it: COPY_BANDS are rest-relative offsets with a 0.020 fade skirt
//     at each edge, so two rests closer than ~0.10 of p cross-fade over each
//     other. Inspire at 0.20 and Equip at 0.32 both close cleanly. No camera
//     pose moves with it — every leg is authored in leg-local time.
//   · ROAD. `scrollVh` is re-split three times, and each is a separate answer.
//     mission 3.5 -> 4.9 with inspire seg 0 3.5 -> 2.1 keeps the hero arrival's
//     viewport-heights-per-GESTURE flat now that the mission/inspire knot falls
//     at gesture u 0.70 instead of 0.538. Equip's own 6.0 is a new chapter's
//     road. connect seg 0 8.00 -> 13.00 is compensation, not appetite: Equip's
//     rest looks UP, Connect's ground reveal is camera-pure in forward.y, and
//     the network's first draw slides 0.351 -> 0.431 of p as that unwinds — so
//     the light schedule's front bound had to move, and the road is what keeps
//     the pre-existence lead and the light travel where six "slower" passes put
//     them. The arithmetic is in chapters/connect/index.js at LIGHT_LO.
//
// The page grows 40.92 -> 51.32 vh: 6.0 of it a chapter that did not exist,
// 5.0 of it Connect's compensation, 1.4 of it the arrival re-split. That is a
// number worth stating rather than discovering.

const chapters = [
  {
    id: 'mission', span: 14, nav: 'Intro', stops: [0.0], scrollVh: 4.9,
    symbol: 'mission', copyPosition: null, copyBand: { lo: null, hi: 0.042 },
    copySurface: { host: 'hero', deferred: true, flightLead: 'hero' },
    runtime: false, hotspots: { kind: 'none' },
  },
  {
    id: 'inspire', span: 12, nav: 'Inspire', scrollVh: 4.7,
    segVh: [2.1, 2.6], symbol: 'inspire', copyPosition: 'pos-bottom',
    copyBand: { lo: -0.012, hi: 0.058 }, runtime: true,
    copySurface: { host: 'block', deferred: false, flightLead: 'standard' },
    hotspots: { kind: 'fixed', cardinality: 3, ids: ['artcompute', 'arca', 'tworp'] },
  },
  {
    id: 'equip', span: 12, nav: 'Equip', stops: [0.5], scrollVh: 6.0,
    segVh: [2.6, 3.4], symbol: 'equip', copyPosition: 'pos-bottomleft',
    copyBand: { lo: -0.012, hi: 0.058 }, runtime: true,
    copySurface: { host: 'block', deferred: false, flightLead: 'standard' },
    hotspots: { kind: 'fixed', cardinality: 2, ids: ['quark', 'brotchen'] },
  },
  {
    id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 15.85,
    segVh: [13.00, 2.85], shape: { seg: 0, k: [1.10, 1.00] },
    symbol: 'connect', copyPosition: 'pos-topright', runtime: true,
    copyBand: { lo: -0.014, hi: 0.058 },
    copySurface: { host: 'block', deferred: false, flightLead: 'standard' },
    hotspots: { kind: 'fixed', cardinality: 3, ids: ['ados', 'hivemind', 'discord'] },
  },
  {
    id: 'owned', span: 25, nav: 'Owned', scrollVh: 9.27,
    segVh: [2.27, 7.00], shape: { seg: 1, k: [1.6, 0.877] },
    symbol: 'owned', copyPosition: 'pos-topcentre', runtime: true,
    copyBand: { lo: -0.009, hi: 0.067 },
    copySurface: { host: 'block', deferred: false, flightLead: 'standard' },
    hotspots: { kind: 'dynamic', source: 'contributors', cardinality: 16 },
  },
  {
    id: 'final', span: 15, nav: null, stops: [0.8], scrollVh: 10.6,
    segVh: [10.0, 0.6], shape: { seg: 0, k: [1.305, 0.70] },
    symbol: 'final', copyPosition: 'pos-bottomleft', runtime: true,
    copyBand: { lo: -0.011, hi: null },
    copySurface: { host: 'block', deferred: false, flightLead: 'standard' },
    hotspots: { kind: 'none' },
  },
];

export const JOURNEY_SCHEMA = {
  chapters,
  menuSymbol: 'menu',
  aliases: {
    nodes: { '2rp': 'tworp', community: 'discord' },
    patterns: [{ pattern: /^person-(\d+)$/, replacement: 'contributor-$1', example: 'person-0' }],
  },
};

export const JOURNEY_CHAPTER_IDS = chapters.map(({ id }) => id);
export const RUNTIME_CHAPTER_IDS = chapters.filter(({ runtime }) => runtime).map(({ id }) => id);
export const FIXED_HOTSPOTS = Object.fromEntries(chapters
  .filter(({ hotspots }) => hotspots.kind === 'fixed')
  .map(({ id, hotspots }) => [id, [...hotspots.ids]]));

function fail(message) { throw new Error(`[journey structure] ${message}`); }

function isFiniteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }

/** Every chapter must declare these, whether or not their value is null —
 * the KEY must exist. (`stops`, `segVh` and `shape` are legitimately absent
 * on some chapters — see below — so they are not in this list.) */
const REQUIRED_CHAPTER_KEYS = ['id', 'span', 'nav', 'scrollVh', 'symbol', 'copyPosition', 'copyBand', 'copySurface', 'runtime', 'hotspots'];

/** `copySurface.host` — WHERE a chapter's DOM copy lives, and therefore which
 *  painter owns it. `'hero'` is the Mission exception the file header has
 *  described since v6: its copy is the hero's own markup, not a `j-block`
 *  this UI builds. Declaring it makes that a chapter PROPERTY instead of an
 *  `id === 'mission'` test repeated down `journey/ui.js` (order U04, on N01's
 *  dispatch route). */
const COPY_HOSTS = new Set(['hero', 'block']);

/** `copySurface.flightLead` — which authored entry envelope a direct
 *  navigation flight uses for this chapter's copy. A return to the hero leads
 *  earlier and lands brighter than an ordinary chapter arrival; the two curves
 *  live in `journey/ui/copy-arrival.js` and the chapter names the one it
 *  wants. */
const COPY_FLIGHT_LEADS = new Set(['hero', 'standard']);

/** Built-ins whose own instance methods rely on mutating internal state as
 * ordinary, required machinery — not on exposing mutable configuration a
 * consumer could abuse. Freezing these disables that machinery instead of
 * protecting anything. RegExp is the case in point: its meaningful state
 * (`source`, `flags`) is already immutable by construction, so freezing buys
 * no protection there — but `.test()`/`.exec()` write `lastIndex` on every
 * call for a global (`g`) or sticky (`y`) pattern, and a frozen RegExp
 * throws TypeError the first time that write happens. Today's one RegExp
 * export (JOURNEY_SCHEMA's alias pattern) carries no such flag, so nothing
 * breaks yet — but a future edit that adds one would fail far from this
 * file, in a path tests may not reach. Checked and NOT present anywhere in
 * this module's exported graph: Date, Map, Set, typed arrays. Map/Set are
 * deliberately excluded from this exemption even though they are "mutable
 * built-ins" in the same general sense — their mutator methods (`.set()`,
 * `.add()`) are configuration, not required machinery, so freezing them to
 * block those calls is correct immutability, not a footgun. Extend the
 * check below (not the recursion in deepFreeze) if that ever changes. */
function hasRequiredMutableState(value) {
  return value instanceof RegExp;
}

/** Freeze an exported registry all the way down, so a consumer holding a
 * reference cannot mutate shared state — including through a nested object
 * or array (e.g. a `copyBand`, a `hotspots.ids` list). Strict-mode ESM
 * throws on an attempted write to a frozen property, so this turns a silent
 * cross-module mutation into a loud one at the write site. Skips instances
 * whose own required internal state freezing would break — see
 * `hasRequiredMutableState` — recursing past them unfrozen instead. Exported
 * only so a focused test can prove the RegExp exemption directly. */
export function deepFreeze(value) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
  if (hasRequiredMutableState(value)) return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) deepFreeze(value[key]);
  return value;
}

/** Validate the schema's own shape — independent of any chapter. */
function validateRawSchema(schema) {
  if (!schema || !Array.isArray(schema.chapters) || schema.chapters.length === 0) {
    fail('schema.chapters must be a non-empty array');
  }
  if (typeof schema.menuSymbol !== 'string' || !schema.menuSymbol) {
    fail(`invalid menuSymbol: ${JSON.stringify(schema.menuSymbol)}`);
  }
  const aliases = schema.aliases || {};
  const nodeAliases = aliases.nodes || {};
  if (typeof nodeAliases !== 'object' || Array.isArray(nodeAliases)) fail('aliases.nodes must be an object');
  for (const [alias, target] of Object.entries(nodeAliases)) {
    if (typeof alias !== 'string' || !alias) fail(`invalid alias key: ${JSON.stringify(alias)}`);
    if (typeof target !== 'string' || !target) fail(`invalid alias target for ${alias}: ${JSON.stringify(target)}`);
  }
  const patterns = aliases.patterns || [];
  if (!Array.isArray(patterns)) fail('aliases.patterns must be an array');
  for (const p of patterns) {
    if (!p || !(p.pattern instanceof RegExp)) fail(`invalid alias pattern for ${(p && p.example) || '<pattern>'}`);
    if (typeof p.replacement !== 'string') fail(`invalid alias pattern replacement for ${p.example || '<pattern>'}`);
    if (typeof p.example !== 'string' || !p.example) fail('invalid alias pattern example');
  }
}

/** Validate one chapter's RAW manifest fields — independent of any
 * caller-supplied cross-reference. Every total, band and stop the manifest
 * declares is checked here: types, ranges, monotonicity, and (for chapters
 * that split their scroll budget across sub-segments) that the split sums
 * back to the whole. Hotspot-registry shape stays below, unchanged — this
 * only covers the fields hotspot validation does not touch. */
function validateRawChapter(chapter) {
  const label = chapter.id || '<empty>';
  for (const key of REQUIRED_CHAPTER_KEYS) {
    if (!Object.hasOwn(chapter, key)) fail(`missing required field '${key}' for ${label}`);
  }
  if (!Number.isInteger(chapter.span) || chapter.span <= 0) {
    fail(`invalid span for ${label}: ${JSON.stringify(chapter.span)}`);
  }
  if (chapter.nav !== null && typeof chapter.nav !== 'string') fail(`invalid nav for ${label}: ${JSON.stringify(chapter.nav)}`);
  if (typeof chapter.runtime !== 'boolean') fail(`invalid runtime flag for ${label}: ${JSON.stringify(chapter.runtime)}`);
  if (typeof chapter.symbol !== 'string' || !chapter.symbol) fail(`invalid symbol for ${label}: ${JSON.stringify(chapter.symbol)}`);
  if (chapter.copyPosition !== null && (typeof chapter.copyPosition !== 'string' || !chapter.copyPosition)) {
    fail(`invalid copyPosition for ${label}: ${JSON.stringify(chapter.copyPosition)}`);
  }
  if (!isFiniteNumber(chapter.scrollVh) || chapter.scrollVh <= 0) {
    fail(`invalid scrollVh for ${label}: ${JSON.stringify(chapter.scrollVh)}`);
  }

  const band = chapter.copyBand;
  if (!band || typeof band !== 'object' || !Object.hasOwn(band, 'lo') || !Object.hasOwn(band, 'hi')) {
    fail(`invalid copyBand for ${label}`);
  }
  if (band.lo !== null && !isFiniteNumber(band.lo)) fail(`invalid copyBand.lo for ${label}: ${JSON.stringify(band.lo)}`);
  if (band.hi !== null && !isFiniteNumber(band.hi)) fail(`invalid copyBand.hi for ${label}: ${JSON.stringify(band.hi)}`);
  if (band.lo !== null && band.hi !== null && !(band.lo < band.hi)) {
    fail(`non-monotonic copyBand for ${label}: lo ${band.lo} >= hi ${band.hi}`);
  }

  /* copySurface. Checked field by field rather than by shape alone: a typo in
     `host` would otherwise fall through to the block painter and silently give
     Mission a second copy block on top of the hero's own. */
  const surface = chapter.copySurface;
  if (!surface || typeof surface !== 'object') fail(`invalid copySurface for ${label}`);
  if (!COPY_HOSTS.has(surface.host)) {
    fail(`invalid copySurface.host for ${label}: ${JSON.stringify(surface.host)}`);
  }
  if (typeof surface.deferred !== 'boolean') {
    fail(`invalid copySurface.deferred for ${label}: ${JSON.stringify(surface.deferred)}`);
  }
  if (!COPY_FLIGHT_LEADS.has(surface.flightLead)) {
    fail(`invalid copySurface.flightLead for ${label}: ${JSON.stringify(surface.flightLead)}`);
  }

  const stops = chapter.stops || [];
  if (!Array.isArray(stops)) fail(`invalid stops for ${label}: ${JSON.stringify(chapter.stops)}`);
  let prevStop = -Infinity;
  for (const stop of stops) {
    if (!isFiniteNumber(stop) || stop < 0 || stop >= 1) fail(`invalid stop for ${label}: ${JSON.stringify(stop)}`);
    if (stop <= prevStop) fail(`non-monotonic stops for ${label}: ${JSON.stringify(stops)}`);
    prevStop = stop;
  }

  // No explicit `stops` means route.js's own derivation treats the chapter
  // as having exactly one implicit rest (DEFAULT_STOP) — so a chapter that
  // splits scroll with `segVh` always owes stops.length-or-1, plus one,
  // sub-segments (journey/route.js SEGMENTS, "stops delimit n + 1
  // sub-segments"). This mirrors that arithmetic on the RAW manifest so a
  // missing/extra sub-segment fails loudly here instead of only logging a
  // runtime console.error downstream.
  if (Object.hasOwn(chapter, 'segVh')) {
    const segVh = chapter.segVh;
    if (!Array.isArray(segVh) || segVh.length === 0) fail(`invalid segVh for ${label}: ${JSON.stringify(segVh)}`);
    const expectedSegments = (stops.length || 1) + 1;
    if (segVh.length !== expectedSegments) {
      fail(`segVh/stops count mismatch for ${label}: ${segVh.length} segVh entries for ${stops.length || 1} stop(s) (expected ${expectedSegments})`);
    }
    let sum = 0;
    for (const vh of segVh) {
      if (!isFiniteNumber(vh) || vh <= 0) fail(`invalid segVh entry for ${label}: ${JSON.stringify(vh)}`);
      sum += vh;
    }
    if (Math.abs(sum - chapter.scrollVh) > 1e-9) {
      fail(`segVh does not sum to scrollVh for ${label}: ${sum} != ${chapter.scrollVh}`);
    }
  }

  if (Object.hasOwn(chapter, 'shape') && chapter.shape !== null) {
    const shape = chapter.shape;
    const segCount = (Object.hasOwn(chapter, 'segVh') && Array.isArray(chapter.segVh)) ? chapter.segVh.length : 1;
    if (!Number.isInteger(shape.seg) || shape.seg < 0 || shape.seg >= segCount) {
      fail(`invalid shape.seg for ${label}: ${JSON.stringify(shape && shape.seg)}`);
    }
    if (!shape || !Array.isArray(shape.k) || shape.k.length !== 2 || !shape.k.every(isFiniteNumber)) {
      fail(`invalid shape.k for ${label}: ${JSON.stringify(shape && shape.k)}`);
    }
  }
}

/** Validate a schema and its externally-authored registries. Exported so
 * focused tests can prove malformed additions fail before boot. Validates
 * every RAW manifest field (types, ranges, monotonicity, totals) as well as
 * any caller-supplied cross-references (`refs`). */
export function validateJourneyStructure(schema = JOURNEY_SCHEMA, refs = {}) {
  validateRawSchema(schema);
  const ids = new Set();
  const nodes = new Map();
  const supportedCardinalities = refs.supportedCardinalities || { contributors: 16 };
  for (const chapter of schema.chapters || []) {
    if (!chapter.id || ids.has(chapter.id)) fail(`duplicate chapter id: ${chapter.id || '<empty>'}`);
    ids.add(chapter.id);
    validateRawChapter(chapter);
    const hot = chapter.hotspots || { kind: 'none' };
    if (!['none', 'fixed', 'dynamic'].includes(hot.kind)) fail(`unsupported hotspot kind for ${chapter.id}: ${hot.kind}`);
    if (hot.kind === 'fixed') {
      if (!Array.isArray(hot.ids) || !Number.isInteger(hot.cardinality) ||
          hot.ids.length !== hot.cardinality) fail(`unsupported fixed cardinality for ${chapter.id}`);
      const local = new Set();
      for (const node of hot.ids) {
        if (!node || local.has(node) || nodes.has(node)) fail(`duplicate node id: ${node || '<empty>'}`);
        local.add(node); nodes.set(node, chapter.id);
      }
    }
    if (hot.kind === 'dynamic') {
      if (!hot.source || !Number.isInteger(hot.cardinality) || hot.cardinality < 1 ||
          supportedCardinalities[hot.source] !== hot.cardinality) {
        fail(`unsupported fixed cardinality for ${chapter.id}: ${hot.cardinality}`);
      }
    }
    if (chapter.runtime && refs.builders && !refs.builders[chapter.id]) fail(`missing builder reference: ${chapter.id}`);
    if (refs.symbols && !refs.symbols[chapter.symbol]) fail(`missing symbol reference: ${chapter.id} -> ${chapter.symbol}`);
  }
  if (refs.nodes) {
    const actualNodes = new Set();
    for (const actual of Object.values(refs.nodes)) for (const id of actual) {
      if (!id || actualNodes.has(id)) fail(`duplicate node id: ${id || '<empty>'}`);
      actualNodes.add(id);
    }
    for (const chapter of schema.chapters) {
      if (chapter.hotspots.kind !== 'none' && !Object.hasOwn(refs.nodes, chapter.id)) {
        fail(`missing node registry reference: ${chapter.id}`);
      }
    }
    for (const [chapterId, actual] of Object.entries(refs.nodes)) {
      const chapter = schema.chapters.find(({ id }) => id === chapterId);
      if (!chapter) fail(`missing chapter reference: ${chapterId}`);
      const hot = chapter.hotspots;
      if (hot.kind === 'fixed' && (actual.length !== hot.ids.length || actual.some((id, i) => id !== hot.ids[i]))) {
        fail(`unsupported fixed cardinality/order for ${chapterId}`);
      }
      if (hot.kind === 'dynamic' && actual.length !== hot.cardinality) fail(`unsupported fixed cardinality for ${chapterId}: ${actual.length}`);
    }
    for (const [alias, target] of Object.entries((schema.aliases && schema.aliases.nodes) || {})) {
      if (alias === target || !actualNodes.has(target)) fail(`alias points nowhere: ${alias} -> ${target}`);
    }
    for (const alias of (schema.aliases && schema.aliases.patterns) || []) {
      if (!(alias.pattern instanceof RegExp) || !alias.example ||
          !actualNodes.has(alias.example.replace(alias.pattern, alias.replacement))) {
        fail(`alias points nowhere: ${alias.example || '<pattern>'}`);
      }
    }
  } else {
    for (const [alias, target] of Object.entries((schema.aliases && schema.aliases.nodes) || {})) {
      if (alias === target || !nodes.has(target)) fail(`alias points nowhere: ${alias} -> ${target}`);
    }
  }
  if (refs.symbols && !refs.symbols[schema.menuSymbol]) fail(`missing symbol reference: menu -> ${schema.menuSymbol}`);
  return true;
}

validateJourneyStructure();

// IMMUTABILITY. Every exported registry is deep-frozen after it validates —
// a consumer can read chapters, hotspots and ids, but any attempted write
// (top-level or nested: a chapter object, its copyBand, its hotspots.ids
// array) throws in strict-mode ESM instead of silently corrupting shared
// state for every other module that imported the same reference. No
// exported VALUE changes here — only writability.
deepFreeze(JOURNEY_SCHEMA);
deepFreeze(JOURNEY_CHAPTER_IDS);
deepFreeze(RUNTIME_CHAPTER_IDS);
deepFreeze(FIXED_HOTSPOTS);
