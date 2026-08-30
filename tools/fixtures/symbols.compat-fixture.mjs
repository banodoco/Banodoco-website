// GENERATED FIXTURE — S02 (2026-08-21-elegance-run-01).
//
// This file was produced by IMPORTING journey/route.js, journey/symbols.js,
// journey/constants.js, journey/structure.js and journey/navigation.js and
// serializing exactly what they export/return TODAY — not hand-transcribed
// from reading source. Purpose: pin every symbol's identity, geometry hash and journey/symbols.js's two exported function signatures so a later order that removes
// a competing/duplicate source of route, copy, symbol or constant data (the
// F-series) is caught immediately if it changes a value, rather than at a
// capture gate.
//
// TO REGENERATE DELIBERATELY (only when a value legitimately changed):
//   node docs/code-health/evidence/2026-08-21-elegance-run-01/s02/generate-snapshot.mjs
// Then record the before/after in the run ledger. See the re-baselining
// protocol in docs/code-health/evidence/2026-08-21-elegance-run-01/c01/
// limitations.md §10 (this fixture follows the same convention) and this
// generator's own header. Do NOT hand-edit the assertions below to make them
// pass — regenerate, or transcription error creeps back in.

import assert from 'node:assert/strict';
import { SYMBOLS, VIEW_BOX, buildSymbol, signature } from '../../journey/symbols.js';
import crypto from 'node:crypto';

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// Minimal DOM shim — see the generator's header for why this is sufficient
// for buildSymbol()/signature() (they touch no other DOM surface).
function createElementNS(_ns, tag) {
  return {
    tagName: tag,
    _attrs: {},
    children: [],
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null; },
    appendChild(child) { this.children.push(child); },
  };
}
const savedDocument = globalThis.document;
globalThis.document = { createElementNS };

assert.equal(VIEW_BOX, "0 0 22 22", '[symbols fixture] VIEW_BOX drifted');
assert.deepEqual(Object.keys(SYMBOLS), [
  "mission",
  "inspire",
  "connect",
  "owned",
  "final",
  "menu",
  "equip"
], '[symbols fixture] SYMBOLS key set/order drifted');

assert.deepEqual(
  { name: buildSymbol.name, length: buildSymbol.length },
  {
  "name": "buildSymbol",
  "length": 1
},
  '[symbols fixture] buildSymbol signature drifted',
);
assert.deepEqual(
  { name: signature.name, length: signature.length },
  {
  "name": "signature",
  "length": 1
},
  '[symbols fixture] signature() signature drifted',
);

const EXPECTED = [
  {
    "id": "mission",
    "label": "the specimen, whole",
    "partCount": 5,
    "svgClass": "j-sym j-sym-mission",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 5,
    "signature": "p:M3.4 10.6 Q11 2.9 18.6 10.6|p:M3.4 10.6 H18.6|p:M9.8 10.6 V15.9 Q9.8 18.4 7.1 18.9|p:M12.2 10.6 V15.9 Q12.2 18.4 14.9 18.9|p:M2.2 18.9 H19.8",
    "signatureSha256": "0b83d30050b0ef3c5e892bd3d5b9600c05b09099c6da44393587660a49add0af"
  },
  {
    "id": "inspire",
    "label": "the cap releasing",
    "partCount": 7,
    "svgClass": "j-sym j-sym-inspire",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 7,
    "signature": "p:M3.6 16.4 Q11 1.8 18.4 16.4|p:M3.6 16.4 H18.4|c:15.4,10.4,0.95|c:17.2,8.8,0.82|c:15.4,7.4,0.68|c:18,6,0.7|c:16.2,4.2,0.58",
    "signatureSha256": "2be0501b220d204db4dd696cf38b439f6bcb31eb6f812f42e6ef7dfc53909167"
  },
  {
    "id": "connect",
    "label": "the ground network",
    "partCount": 7,
    "svgClass": "j-sym j-sym-connect",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 7,
    "signature": "p:M1.8 8.4 H20.2|p:M1.6 14.2 L4.2 13.2 L9.6 17.2 L15.8 14.8 L20.4 17.6|p:M15.8 14.8 L12.6 10.0|p:M4.2 13.2 L6.8 9.6|c:15.8,14.8,1.2|c:9.6,17.2,1|c:4.2,13.2,1.15",
    "signatureSha256": "c1be0f0bc786becc0a6e0d0384a3c713bf8860098f3f153b8dddb4cbc39be639"
  },
  {
    "id": "owned",
    "label": "the root crown and the colony",
    "partCount": 9,
    "svgClass": "j-sym j-sym-owned",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 9,
    "signature": "c:11,3.6,1.35|p:M11 3.6 L3.4 15.6|p:M11 3.6 L8.2 17.8|p:M11 3.6 L13.8 17.8|p:M11 3.6 L18.6 15.6|c:3.4,15.6,0.9|c:8.2,17.8,1.05|c:13.8,17.8,1.05|c:18.6,15.6,0.9",
    "signatureSha256": "345b92cf5de8d747277ce7cc6d88be163e5a8350dc7a58c6cf3d45b87e422ee6"
  },
  {
    "id": "final",
    "label": "the field",
    "partCount": 8,
    "svgClass": "j-sym j-sym-final",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 8,
    "signature": "p:M1.6 17.2 H20.4|p:M8.2 11.4 Q12.4 6.2 16.6 11.4|p:M8.2 11.4 H16.6|p:M12.4 11.4 V17.2|p:M2.0 13.8 Q4.8 10.6 7.6 13.8|p:M4.8 13.8 V17.2|p:M16.4 14.6 Q18.4 12.4 20.4 14.6|p:M18.4 14.6 V17.2",
    "signatureSha256": "e73b9362ff560b84ab7b2cc441c1b88cb96fc53905430918dc6095fadcaacda3"
  },
  {
    "id": "menu",
    "label": "the contents",
    "partCount": 6,
    "svgClass": "j-sym j-sym-menu",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 6,
    "signature": "c:4.2,6.4,0.85|p:M7.6 6.4 H18.4|c:4.2,11,0.85|p:M7.6 11 H18.4|c:4.2,15.6,0.85|p:M7.6 15.6 H16.2",
    "signatureSha256": "51a316d8554b562f39064906189cdf31e53868bfe009a1e2fb37af3e2da855ec"
  },
  {
    "id": "equip",
    "label": "the cap from beneath",
    "partCount": 11,
    "svgClass": "j-sym j-sym-equip",
    "svgViewBox": "0 0 22 22",
    "svgAriaHidden": "true",
    "svgFocusable": "false",
    "childCount": 11,
    "signature": "p:M2.4 10 A8.6 4.6 0 1 1 19.6 10 A8.6 4.6 0 1 1 2.4 10|p:M8.7 12.6 A2.3 1.4 0 1 0 13.3 12.6 A2.3 1.4 0 1 0 8.7 12.6|p:M8.8 12.1 L2.4 10|p:M9.2 11.5 L3.55 7.7|p:M10.2 11.25 L6.7 6.0|p:M11 11.2 L11 5.4|p:M11.8 11.25 L15.3 6.0|p:M12.8 11.5 L18.45 7.7|p:M13.2 12.1 L19.6 10|p:M9.2 13.4 L3.55 12.3|p:M12.8 13.4 L18.45 12.3",
    "signatureSha256": "4849ee806414623b8fedbf8c971c2e61558257971ecd93a4f76ababa45af04cb"
  }
];

for (const exp of EXPECTED) {
  const svg = buildSymbol(exp.id);
  const sig = signature(svg);
  assert.equal(SYMBOLS[exp.id].label, exp.label, `[symbols fixture] ${exp.id} label drifted`);
  assert.equal(SYMBOLS[exp.id].parts.length, exp.partCount, `[symbols fixture] ${exp.id} part count drifted`);
  assert.equal(svg._attrs.class, exp.svgClass, `[symbols fixture] ${exp.id} built class drifted`);
  assert.equal(svg._attrs.viewBox, exp.svgViewBox, `[symbols fixture] ${exp.id} built viewBox drifted`);
  assert.equal(svg._attrs['aria-hidden'], exp.svgAriaHidden, `[symbols fixture] ${exp.id} aria-hidden drifted`);
  assert.equal(svg._attrs.focusable, exp.svgFocusable, `[symbols fixture] ${exp.id} focusable drifted`);
  assert.equal(svg.children.length, exp.childCount, `[symbols fixture] ${exp.id} child count drifted`);
  assert.equal(sig, exp.signature, `[symbols fixture] ${exp.id} geometry signature (exact source) drifted`);
  assert.equal(sha256(sig), exp.signatureSha256, `[symbols fixture] ${exp.id} geometry SHA-256 drifted`);
}

// buildSymbol() on an id with no SYMBOL_DEFINITIONS entry: early-return branch.
const unknownSvg = buildSymbol('__unknown_symbol_id__');
assert.equal(unknownSvg._attrs.class, "j-sym j-sym-__unknown_symbol_id__",
  '[symbols fixture] buildSymbol() unknown-id class drifted');
assert.equal(unknownSvg._attrs.viewBox, "0 0 22 22",
  '[symbols fixture] buildSymbol() unknown-id viewBox drifted');
assert.equal(unknownSvg.children.length, 0,
  '[symbols fixture] buildSymbol() unknown-id child count drifted (spec undefined branch)');

globalThis.document = savedDocument;

console.log('symbols compat fixture: ok');
