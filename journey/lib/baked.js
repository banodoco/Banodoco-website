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
//   - Fallback: any fetch failure, wrong manifest version, or missing key
//     throws from geometry(); the chapter's caller catches it and builds
//     live. The live builders remain as the automatic fallback AND as the
//     ?livebuild=1 tuning path (LIVEBUILD skips the fetch entirely).
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

// ---- baked state (filled by the background fetch; null/absent means
//      "build live", which is how the fallback is expressed) ------------

let manifest = null;      // parsed manifest.json, or null until it arrives
                          // AND its version matches MANIFEST_VERSION
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
  let m;
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return;                 // no bake present -> live everywhere
    m = await res.json();
  } catch {
    // Manifest fetch/parse failure (network error, malformed JSON): every
    // chapter's isBaked() stays false and they all build live, same as the
    // !res.ok branch above. Visitor-safe by construction — the live
    // builders are the automatic fallback, not a degraded state.
    // (F06/D4: INTENTIONAL-SAFE. Proven by tools/test-portrait-baked.mjs B2
    // [C04] and this order's own tools/test-baked-lifecycle.mjs; no
    // behavior change here — documentation only.)
    return;                              // network/JSON error -> live everywhere
  }
  if (!m || m.version !== MANIFEST_VERSION) return;   // wrong schema -> live
  manifest = m;
  await Promise.all(Object.entries(m.chapters || {}).map(async ([id, ch]) => {
    try {
      const res = await fetch('static/geom/' + ch.file);
      if (!res.ok) return;
      bins.set(id, await res.arrayBuffer());
    } catch {
      /* absorbed: isBaked(id) stays false; that chapter builds live */
      // Per-chapter .bin fetch failure. isBaked() is per-chapter (this
      // Promise.all entry only), so a failure here never affects sibling
      // chapters whose own fetch succeeded. Visitor-safe: that one chapter
      // falls back to its live builder, same as every "no bake present"
      // path. (F06/D4: INTENTIONAL-SAFE. Proven by
      // tools/test-portrait-baked.mjs B3 [C04] and this order's own
      // tools/test-baked-lifecycle.mjs; no behavior change here —
      // documentation only.)
    }
  }));
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
