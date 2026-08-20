// Canonical identity and cross-module metadata for the journey. Scene geometry
// and chapter-local animation data remain owned by their chapter modules.

const chapters = [
  {
    id: 'mission', span: 14, nav: 'Intro', stops: [0.0], scrollVh: 3.5,
    symbol: 'mission', copyPosition: null, copyBand: { lo: null, hi: 0.042 },
    runtime: false, hotspots: { kind: 'none' },
  },
  {
    id: 'inspire', span: 24, nav: 'Inspire', scrollVh: 6.7,
    segVh: [3.5, 3.2], symbol: 'inspire', copyPosition: 'pos-bottom',
    copyBand: { lo: -0.012, hi: 0.078 }, runtime: true,
    hotspots: { kind: 'fixed', cardinality: 3, ids: ['artcompute', 'arca', 'tworp'] },
  },
  {
    id: 'connect', span: 22, nav: 'Connect', stops: [0.65], scrollVh: 14.35,
    segVh: [11.50, 2.85], shape: { seg: 0, k: [1.60, 0.95] },
    symbol: 'connect', copyPosition: 'pos-topright', runtime: true,
    copyBand: { lo: -0.014, hi: 0.058 },
    hotspots: { kind: 'fixed', cardinality: 3, ids: ['ados', 'hivemind', 'discord'] },
  },
  {
    id: 'owned', span: 25, nav: 'Owned', scrollVh: 9.27,
    segVh: [2.27, 7.00], shape: { seg: 1, k: [1.6, 0.877] },
    symbol: 'owned', copyPosition: 'pos-topcentre', runtime: true,
    copyBand: { lo: -0.009, hi: 0.067 },
    hotspots: { kind: 'dynamic', source: 'contributors', cardinality: 16 },
  },
  {
    id: 'final', span: 15, nav: null, stops: [0.8], scrollVh: 10.6,
    segVh: [10.0, 0.6], shape: { seg: 0, k: [1.305, 0.70] },
    symbol: 'final', copyPosition: 'pos-bottomleft', runtime: true,
    copyBand: { lo: -0.011, hi: null }, hotspots: { kind: 'none' },
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

/** Validate a schema and its externally-authored registries. Exported so
 * focused tests can prove malformed additions fail before boot. */
export function validateJourneyStructure(schema = JOURNEY_SCHEMA, refs = {}) {
  const ids = new Set();
  const nodes = new Map();
  const supportedCardinalities = refs.supportedCardinalities || { contributors: 16 };
  for (const chapter of schema.chapters || []) {
    if (!chapter.id || ids.has(chapter.id)) fail(`duplicate chapter id: ${chapter.id || '<empty>'}`);
    ids.add(chapter.id);
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
