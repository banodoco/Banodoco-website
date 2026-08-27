// journey/symbols.js — THE SECTION SYMBOLS.
//
// F02 (2026-08-21): this file used to hold both the symbol geometry AND the
// DOM-building code together. It is now a compatibility FACADE. The pure
// data (geometry, viewBox, key order, the signature() reducer) lives in
// journey/symbols/data.js, which has no dependency on `document` and is
// importable in bare Node. The DOM-rendering half (buildSymbol(), which
// calls document.createElementNS) lives in journey/symbols/render.js. Every
// name this file exported before the split is re-exported here unchanged
// (same value, same type, same identity), so no importer needs to change —
// see each module's own header for the full design rationale.

export { SYMBOLS, VIEW_BOX, signature } from './symbols/data.js';
export { buildSymbol } from './symbols/render.js';
