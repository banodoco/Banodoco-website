// glowshroom/journey/lib/baked.js — the runtime half of the commit-time
// geometry bake (the other half is tools/bake-geom.py, which drives the
// site under ?bakedump=1 and writes static/geom/). Dated 2026-08-17.
//
// WHY A BAKE AT ALL: chapter geometry is a pure function of seeds. The live
// builders (anatomy.js + each chapter's index.js) are deterministic — the
// same seed stream yields the same BufferGeometry, bit for bit, on every
// run. That means geometry can be baked ONCE at commit time, in the same
// headless Chrome that shoots the pixel goldens, and it is bit-identical
// to a live build by construction, not by approximation. At load the
// shipped path fetches those bytes instead of running the builders.
//
// HOW IT FLOWS:
//   - Shipped path (no flag): this module fetches static/geom/manifest.json
//     and each chapter's .bin as raw ArrayBuffers in the background.
//     geometry(key, layout) rebuilds a THREE.BufferGeometry from those
//     bytes. Attributes are wrapped over COPIES (slice of the typed-array
//     view), never shared views: owned's aAnonF/aOwner are mutated at
//     runtime, and a runtime write must never corrupt the shared bin buffer.
//   - Fallback: an absent/unreadable/unsupported manifest leaves every chapter
//     live. A missing, unreadable or malformed bin leaves that chapter live,
//     as does a missing geometry key caught by its chapter. A recognised
//     version-1 manifest with a malformed schema is rejected before any bin
//     fanout and likewise leaves every chapter live. ?livebuild=1 remains the
//     explicit all-live tuning path.
//   - Capture path (?bakedump=1): registerGeometry/registerPayload RECORD
//     instead of read — the bake tool polls bakeDumpDone and harvests
//     window.__bake.chapters into static/geom/.
//
// STALENESS FAILS LOUDLY: the pre-commit hook byte-diffs the bake, so a
// seed change that doesn't regenerate static/geom/ is a hard commit
// failure, never a silent drift between the builders and the bytes.
//
// BINARY FORMAT (produced by tools/bake-geom.py):
//   static/geom/manifest.json = {
//     version: 1,
//     chapters: { <id>: {
//       file, sha256,
//       keys: [{ key: "<id>/<siteName>",
//                attrs: [{ name, itemSize, byteOffset, byteLength, kind }] }],
//       payload: { ...arbitrary JSON... },
//     } }
//   }
//   static/geom/<file> = raw little-endian bytes; each attr lives at
//   [byteOffset, byteOffset + byteLength). kind is 'f32' or 'u32' — 'u32'
//   is used for index buffers; both are 4 bytes per element.

import * as THREE from 'three';
import { LIVEBUILD, BAKEDUMP } from '../../flags.js';

const MANIFEST_URL = 'static/geom/manifest.json';
const MANIFEST_VERSION = 1;
const EXPECTED_CHAPTERS = ['owned', 'final', 'connect', 'inspire'];
const ATTRIBUTE_KINDS = new Set(['f32', 'u32']);

// ---- baked state (filled by the background fetch; null/absent means
//      "build live", which is how the fallback is expressed) ------------

let manifest = null;      // parsed + fully validated manifest, or null until
                          // its available chapter bins have been checked
const bins = new Map();   // chapterId -> ArrayBuffer (that chapter's .bin)

// ---- shared helpers ---------------------------------------------------

// key is "<chapterId>/<siteName>" (registerGeometry's key format).
const chapterIdOf = (key) => key.split('/')[0];

const arrayCtor = (kind) => (kind === 'u32' ? Uint32Array : Float32Array);

// A typed-array VIEW over the chapter's bin buffer at attr's byte window.
// Callers .slice() it before attaching — see geometry() below.
function viewOf(chapterId, attr) {
  const Ctor = arrayCtor(attr.kind);
  return new Ctor(bins.get(chapterId), attr.byteOffset, attr.byteLength / 4);
}

// ---- manifest boundary ------------------------------------------------

export class BakedManifestError extends Error {
  constructor(path, detail) {
    super(`baked manifest invalid at ${path}: ${detail}`);
    this.name = 'BakedManifestError';
  }
}

const invalid = (path, detail) => { throw new BakedManifestError(path, detail); };
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function record(value, path) {
  if (!isRecord(value)) invalid(path, 'expected an object');
  return value;
}

function string(value, path) {
  if (typeof value !== 'string' || value.length === 0) invalid(path, 'expected a non-empty string');
  return value;
}

function nonNegativeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    invalid(path, 'expected a finite non-negative integer');
  }
  return value;
}

/** Validate the concrete format emitted by tools/bake-geom.py.
 *  Throws the first precise schema error so no bin fetch can begin from a
 *  partially trusted manifest. Returns the original object when valid. */
export function validateBakedManifest(value) {
  const root = record(value, '$');
  if (root.version !== MANIFEST_VERSION) {
    invalid('$.version', `expected ${MANIFEST_VERSION}`);
  }
  const chapters = record(root.chapters, '$.chapters');
  const chapterIds = Object.keys(chapters);
  const extra = chapterIds.filter((id) => !EXPECTED_CHAPTERS.includes(id));
  if (extra.length) {
    invalid('$.chapters', `unexpected ${extra.join(', ')}; expected a subset of ${EXPECTED_CHAPTERS.join(', ')}`);
  }

  const files = new Set();
  for (const chapterId of chapterIds) {
    const path = `$.chapters.${chapterId}`;
    const chapter = record(chapters[chapterId], path);
    const file = string(chapter.file, `${path}.file`);
    if (!/^[^/\\]+\.bin$/.test(file)) invalid(`${path}.file`, 'expected a local .bin filename');
    if (files.has(file)) invalid(`${path}.file`, `duplicate filename ${file}`);
    files.add(file);
    if (typeof chapter.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(chapter.sha256)) {
      invalid(`${path}.sha256`, 'expected a 64-character lowercase hex string');
    }
    if (!Array.isArray(chapter.keys) || chapter.keys.length === 0) {
      invalid(`${path}.keys`, 'expected a non-empty array');
    }
    record(chapter.payload, `${path}.payload`);

    const keys = new Set();
    let packedOffset = 0;
    for (let keyIndex = 0; keyIndex < chapter.keys.length; keyIndex += 1) {
      const keyPath = `${path}.keys[${keyIndex}]`;
      const keyRecord = record(chapter.keys[keyIndex], keyPath);
      const key = string(keyRecord.key, `${keyPath}.key`);
      if (!key.startsWith(`${chapterId}/`)) {
        invalid(`${keyPath}.key`, `expected ${chapterId}/ prefix`);
      }
      if (keys.has(key)) invalid(`${keyPath}.key`, `duplicate geometry key ${key}`);
      keys.add(key);
      if (!Array.isArray(keyRecord.attrs) || keyRecord.attrs.length === 0) {
        invalid(`${keyPath}.attrs`, 'expected a non-empty array');
      }

      const names = new Set();
      for (let attrIndex = 0; attrIndex < keyRecord.attrs.length; attrIndex += 1) {
        const attrPath = `${keyPath}.attrs[${attrIndex}]`;
        const attr = record(keyRecord.attrs[attrIndex], attrPath);
        const name = string(attr.name, `${attrPath}.name`);
        if (names.has(name)) invalid(`${attrPath}.name`, `duplicate attribute ${name}`);
        names.add(name);
        if (!ATTRIBUTE_KINDS.has(attr.kind)) invalid(`${attrPath}.kind`, 'expected f32 or u32');
        if (!Number.isSafeInteger(attr.itemSize) || attr.itemSize <= 0) {
          invalid(`${attrPath}.itemSize`, 'expected a finite positive integer');
        }
        const byteOffset = nonNegativeInteger(attr.byteOffset, `${attrPath}.byteOffset`);
        const byteLength = nonNegativeInteger(attr.byteLength, `${attrPath}.byteLength`);
        if (byteOffset % 4 !== 0) invalid(`${attrPath}.byteOffset`, 'expected 4-byte alignment');
        if (byteLength % 4 !== 0) invalid(`${attrPath}.byteLength`, 'expected 4-byte alignment');
        if ((byteLength / 4) % attr.itemSize !== 0) {
          invalid(`${attrPath}.byteLength`, `not divisible by itemSize ${attr.itemSize}`);
        }
        if (!Number.isSafeInteger(byteOffset + byteLength)) {
          invalid(attrPath, 'byte window exceeds the safe integer range');
        }
        if (byteOffset !== packedOffset) {
          invalid(`${attrPath}.byteOffset`, `expected packed offset ${packedOffset}`);
        }
        packedOffset = byteOffset + byteLength;
        if (name === 'index' && (attr.kind !== 'u32' || attr.itemSize !== 1)) {
          invalid(attrPath, 'index must use kind u32 and itemSize 1');
        }
      }
    }
  }
  return value;
}

function validateBinWindows(chapterId, chapter, bin) {
  const path = `$.chapters.${chapterId}`;
  if (!(bin instanceof ArrayBuffer)) invalid(`${path}.file`, 'response was not an ArrayBuffer');
  for (let keyIndex = 0; keyIndex < chapter.keys.length; keyIndex += 1) {
    const attrs = chapter.keys[keyIndex].attrs;
    for (let attrIndex = 0; attrIndex < attrs.length; attrIndex += 1) {
      const attr = attrs[attrIndex];
      if (attr.byteOffset + attr.byteLength > bin.byteLength) {
        invalid(
          `${path}.keys[${keyIndex}].attrs[${attrIndex}]`,
          `byte window ends at ${attr.byteOffset + attr.byteLength}, beyond ${bin.byteLength}-byte file`,
        );
      }
    }
  }
  const attrs = chapter.keys.flatMap((key) => key.attrs);
  const declaredLength = attrs.length
    ? attrs[attrs.length - 1].byteOffset + attrs[attrs.length - 1].byteLength
    : 0;
  if (declaredLength !== bin.byteLength) {
    invalid(`${path}.file`, `declares ${declaredLength} bytes but response has ${bin.byteLength}`);
  }
}

export async function fetchBakedAssets(fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(MANIFEST_URL);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    return null;
  }
  // Unknown versions are unsupported rather than corrupt: preserve the
  // original all-live compatibility path. Once a manifest claims version 1,
  // however, its complete schema is our contract and malformed data fails
  // before any bin request can fan out.
  if (!isRecord(parsed) || parsed.version !== MANIFEST_VERSION) return null;
  let checkedManifest;
  try {
    checkedManifest = validateBakedManifest(parsed);
  } catch (error) {
    if (error instanceof BakedManifestError) return null; // invalid optimisation -> all-live
    throw error;
  }
  const loadedBins = new Map();
  await Promise.all(Object.entries(checkedManifest.chapters).map(async ([id, chapter]) => {
    let binResponse;
    try {
      binResponse = await fetchImpl('static/geom/' + chapter.file);
    } catch { /* absorbed: isBaked(id) stays false; that chapter builds live */ }
    if (!binResponse || !binResponse.ok) return;
    let bin;
    try {
      bin = await binResponse.arrayBuffer();
    } catch {
      return;                            // unreadable bin -> this chapter builds live
    }
    try {
      validateBinWindows(id, chapter, bin);
    } catch (error) {
      if (error instanceof BakedManifestError) return; // malformed bin -> chapter builds live
      throw error;
    }
    loadedBins.set(id, bin);
  }));
  return { manifest: checkedManifest, bins: loadedBins };
}

// ---- the background fetch (shipped path, module-load time) ------------
//
// F06/D4 CLASSIFICATION (2026-08-21): this IIFE is a PAGE-LIFETIME SINGLETON,
// not a journey-owned cancellable loader. It runs exactly once at module-load
// time, takes no per-caller identity, and is never restarted or aborted —
// `manifest`/`bins` below are bare module-top-level state, the same shared
// cache for every importer for the life of the page (there is one journey
// per page load here; nothing in this codebase unmounts and remounts the
// journey within a single page lifetime the way a chapter mounts/unmounts).
// Evidence: `tools/test-portrait-baked.mjs` B5/B5-neg (C04) proves two
// separate `import()` call sites resolving the same specifier receive the
// IDENTICAL module namespace object and share exactly ONE manifest fetch +
// ONE bin fetch — real singleton semantics, not merely equal values. A
// cancellable-loader shape would need a factory/instantiation point and an
// abort/dispose hook; this module exposes neither, and adding either now
// would be the structural change this order is forbidden from making.
// Precedent: U01a/U01d classified their own import-time self-starts as KEPT
// (not retired) for the same reason — no requirement forces the other
// verdict here either. See journey/lib/baked.js's block comment above for
// the "how it flows" design this classification is consistent with, and
// tools/test-baked-lifecycle.mjs for this order's own standalone proof.
export const ready = (async () => {
  if (LIVEBUILD) {
    // The one console line that answers "which am I looking at?" (2026-08-17,
    // Hannah: a visible local toggle between live and baked). The flag IS the
    // toggle; this line makes the active side legible.
    console.info('[baked] ?livebuild=1 — live builders forced for every chapter');
    return;                              // tuning path: never touch the bake
  }
  const loaded = await fetchBakedAssets();
  if (!loaded) return;                   // no bake present -> live everywhere
  manifest = loaded.manifest;
  for (const [id, bin] of loaded.bins) bins.set(id, bin);
  // Which-path legibility (2026-08-17): one line naming every chapter that
  // will build from bytes; anything unnamed builds live. ?livebuild=1 logs
  // its own line above.
  const baked = [...bins.keys()];
  console.info(baked.length
    ? `[baked] serving from bytes: ${baked.join(', ')} — everything else builds live (?livebuild=1 forces all-live)`
    : '[baked] no usable bake fetched — all chapters build live');
})();

/** True only when the manifest arrived (and matched version) AND this
 *  chapter's .bin bytes arrived. Callers treat false as "build live". */
export function isBaked(chapterId) {
  return manifest !== null && !!manifest.chapters[chapterId] && bins.has(chapterId);
}

// ---- baked-mode API (read path) ---------------------------------------

/** Rebuild a THREE.BufferGeometry from the fetched bytes. layout =
 *  [[attrName, itemSize], ...] asserts the expected shape; a disagreement
 *  throws (caught by the chapter's caller, which falls back to live). */
export function geometry(key, layout) {
  const chapterId = chapterIdOf(key);
  const chapter = manifest && manifest.chapters[chapterId];
  const bin = bins.get(chapterId);
  if (!chapter || !bin) throw new Error(`baked: no geometry for ${key}`);
  const rec = chapter.keys.find((k) => k.key === key);
  if (!rec) throw new Error(`baked: no geometry record for ${key}`);

  const g = new THREE.BufferGeometry();
  for (const [name, itemSize] of layout) {
    const attr = rec.attrs.find((a) => a.name === name);
    if (!attr || attr.itemSize !== itemSize) {
      throw new Error(
        `baked: shape mismatch for ${key}.${name}` +
        ` (baked itemSize ${attr ? attr.itemSize : 'missing'}, live wants ${itemSize})`,
      );
    }
    // COPY, never a shared view: some attributes are mutated at runtime
    // (owned's aAnonF/aOwner) and a write must not corrupt the shared bin.
    g.setAttribute(name, new THREE.BufferAttribute(viewOf(chapterId, attr).slice(), itemSize));
  }
  const index = rec.attrs.find((a) => a.name === 'index');
  if (index) {
    g.setIndex(new THREE.BufferAttribute(viewOf(chapterId, index).slice(), 1));
  }
  return g;
}

/** The manifest's payload for a chapter, or null when not baked. */
export function payload(chapterId) {
  const chapter = manifest && manifest.chapters[chapterId];
  return chapter ? chapter.payload : null;
}

// ---- live-mode API (record path; all no-ops unless BAKEDUMP is set) ----

const dump = () => {
  if (!window.__bake) window.__bake = { chapters: {} };
  return window.__bake;
};

function chapterOf(chapterId) {
  const bake = dump();
  if (!bake.chapters[chapterId]) {
    bake.chapters[chapterId] = { keys: [], payload: {}, done: false };
  }
  return bake.chapters[chapterId];
}

const kindOf = (array) => (array instanceof Float32Array ? 'f32' : 'u32');

/** Record a live-built geometry into the dump for the bake tool. Every
 *  attribute (name, itemSize, a COPY of its array, kind by array type) and,
 *  if present, the index (kind 'u32') is appended under key. */
export function registerGeometry(key, geometry) {
  if (!BAKEDUMP) return;
  const attrs = [];
  for (const name of Object.keys(geometry.attributes)) {
    const attr = geometry.attributes[name];
    attrs.push({
      name,
      itemSize: attr.itemSize,
      kind: kindOf(attr.array),
      array: attr.array.slice(),          // copy, not the live buffer
    });
  }
  if (geometry.index) {
    attrs.push({
      name: 'index',
      itemSize: 1,
      kind: 'u32',
      array: Uint32Array.from(geometry.index.array),   // u32 + copy
    });
  }
  chapterOf(chapterIdOf(key)).keys.push({ key, attrs });
}

/** Merge JSON-serializable metadata into a chapter's payload. */
export function registerPayload(chapterId, obj) {
  if (!BAKEDUMP) return;
  Object.assign(chapterOf(chapterId).payload, obj);
}

/** Signal the chapter is done dumping; the bake tool polls for it. */
export function bakeDumpDone(chapterId) {
  if (!BAKEDUMP) return;
  chapterOf(chapterId).done = true;
}
