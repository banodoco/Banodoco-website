import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const loaderUrl = new URL('../journey/lib/baked.js', import.meta.url);
const manifestUrl = new URL('../static/geom/manifest.json', import.meta.url);

// The site resolves Three through its browser import map. Replace only the two
// browser imports so this Node test executes the real validator/loader source.
const loaderSource = (await readFile(loaderUrl, 'utf8'))
  .replaceAll('import.meta.url', JSON.stringify(loaderUrl.href))
  .replace("import * as THREE from 'three';", 'const THREE = {};')
  .replace(
    "import { LIVEBUILD, BAKEDUMP } from '../../flags.js';",
    'const LIVEBUILD = false; const BAKEDUMP = false;',
  );
const baked = await import(`data:text/javascript;base64,${Buffer.from(loaderSource).toString('base64')}`);
await baked.ready;

const valid = JSON.parse(await readFile(manifestUrl, 'utf8'));
assert.equal(baked.validateBakedManifest(valid), valid);

// Independently verify that the committed artifact satisfies the producer's
// packed-window and digest contract, rather than deriving expected values from
// the runtime validator under test.
for (const [chapterId, chapter] of Object.entries(valid.chapters)) {
  const bytes = await readFile(new URL(`../static/geom/${chapter.file}`, import.meta.url));
  let packedOffset = 0;
  for (const { attrs } of chapter.keys) {
    for (const attr of attrs) {
      assert.equal(attr.byteOffset, packedOffset, `${chapterId}.${attr.name} packed offset`);
      packedOffset += attr.byteLength;
    }
  }
  assert.equal(packedOffset, bytes.byteLength, `${chapterId} declared byte length`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), chapter.sha256, `${chapterId} digest`);
}

function changed(change) {
  const manifest = structuredClone(valid);
  change(manifest);
  return manifest;
}

function rejectsManifest(label, change, pattern) {
  assert.throws(
    () => baked.validateBakedManifest(changed(change)),
    (error) => {
      assert.equal(error.name, 'BakedManifestError', label);
      assert.match(error.message, pattern, label);
      return true;
    },
  );
}

rejectsManifest('missing version', (m) => { delete m.version; }, /at \$\.version: expected 1/);
rejectsManifest('missing chapters', (m) => { delete m.chapters; }, /at \$\.chapters: expected an object/);
rejectsManifest('wrong chapters type', (m) => { m.chapters = []; }, /at \$\.chapters: expected an object/);
rejectsManifest('extra chapter', (m) => { m.chapters.mystery = {}; }, /unexpected mystery/);
rejectsManifest('wrong file type', (m) => { m.chapters.owned.file = 7; }, /owned\.file: expected a non-empty string/);
rejectsManifest('non-local file', (m) => { m.chapters.owned.file = '../owned.bin'; }, /expected a local \.bin filename/);
rejectsManifest('duplicate file', (m) => { m.chapters.final.file = m.chapters.owned.file; }, /duplicate filename/);
rejectsManifest('wrong sha type', (m) => { m.chapters.owned.sha256 = null; }, /owned\.sha256: expected a 64-character/);
rejectsManifest('wrong keys type', (m) => { m.chapters.owned.keys = {}; }, /owned\.keys: expected a non-empty array/);
rejectsManifest('empty keys', (m) => { m.chapters.owned.keys = []; }, /owned\.keys: expected a non-empty array/);
rejectsManifest('wrong payload type', (m) => { m.chapters.owned.payload = []; }, /owned\.payload: expected an object/);
rejectsManifest('wrong key prefix', (m) => { m.chapters.owned.keys[0].key = 'final/fan'; }, /expected owned\/ prefix/);
rejectsManifest('duplicate key', (m) => { m.chapters.owned.keys[1].key = m.chapters.owned.keys[0].key; }, /duplicate geometry key/);
rejectsManifest('duplicate attribute', (m) => {
  m.chapters.owned.keys[0].attrs[1].name = m.chapters.owned.keys[0].attrs[0].name;
}, /duplicate attribute/);
rejectsManifest('wrong attr kind', (m) => { m.chapters.owned.keys[0].attrs[0].kind = 'f64'; }, /expected f32 or u32/);
rejectsManifest('wrong offset type', (m) => { m.chapters.owned.keys[0].attrs[0].byteOffset = '0'; }, /finite non-negative integer/);
rejectsManifest('NaN offset', (m) => { m.chapters.owned.keys[0].attrs[0].byteOffset = NaN; }, /finite non-negative integer/);
rejectsManifest('negative length', (m) => { m.chapters.owned.keys[0].attrs[0].byteLength = -4; }, /finite non-negative integer/);
rejectsManifest('non-integer itemSize', (m) => { m.chapters.owned.keys[0].attrs[0].itemSize = 1.5; }, /finite positive integer/);
rejectsManifest('length not divisible by item size', (m) => {
  m.chapters.owned.keys[0].attrs[0].itemSize = 5;
}, /not divisible by itemSize 5/);
rejectsManifest('unaligned offset', (m) => { m.chapters.owned.keys[0].attrs[0].byteOffset = 2; }, /4-byte alignment/);
rejectsManifest('overlapping window', (m) => {
  m.chapters.owned.keys[0].attrs[1].byteOffset -= 4;
}, /expected packed offset/);
rejectsManifest('gapped window', (m) => {
  m.chapters.owned.keys[0].attrs[1].byteOffset += 4;
}, /expected packed offset/);
rejectsManifest('unsafe byte window', (m) => {
  const attr = m.chapters.owned.keys[0].attrs[0];
  attr.byteOffset = Number.MAX_SAFE_INTEGER - 3;
  attr.byteLength = 12;
}, /safe integer range/);
rejectsManifest('wrong index representation', (m) => {
  const index = m.chapters.owned.keys.flatMap((key) => key.attrs).find((attr) => attr.name === 'index');
  index.kind = 'f32';
}, /index must use kind u32 and itemSize 1/);

const partial = changed((m) => {
  m.chapters = { owned: m.chapters.owned };
});
assert.equal(baked.validateBakedManifest(partial), partial);
assert.equal(baked.validateBakedManifest({ version: 1, chapters: {} }).version, 1);

const requests = [];
const loaded = await baked.fetchBakedAssets(async (url) => {
  requests.push(url);
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => structuredClone(valid) };
  const bytes = await readFile(new URL(url));
  return {
    ok: true,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
});
assert.equal(loaded.manifest.version, 1);
assert.equal(loaded.bins.size, 4);
assert.equal(requests.length, 5);

const partialRequests = [];
const partialLoaded = await baked.fetchBakedAssets(async (url) => {
  partialRequests.push(url);
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => structuredClone(partial) };
  const bytes = await readFile(new URL(url));
  return {
    ok: true,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
});
assert.deepEqual(partialRequests, [manifestUrl.href, new URL('owned.bin', manifestUrl).href]);
assert.deepEqual([...partialLoaded.bins.keys()], ['owned']);

const invalidRequests = [];
assert.equal(await baked.fetchBakedAssets(async (url) => {
  invalidRequests.push(url);
  const manifest = changed((m) => { delete m.chapters.connect.payload; });
  return { ok: true, json: async () => manifest };
}), null);
assert.deepEqual(invalidRequests, [manifestUrl.href]);

const jsonRequests = [];
assert.equal(await baked.fetchBakedAssets(async (url) => {
  jsonRequests.push(url);
  return { ok: true, json: async () => { throw new SyntaxError('bad JSON'); } };
}), null);
assert.deepEqual(jsonRequests, [manifestUrl.href]);

for (const manifest of [null, { version: 2, chapters: {} }]) {
  const unsupportedRequests = [];
  assert.equal(await baked.fetchBakedAssets(async (url) => {
    unsupportedRequests.push(url);
    return { ok: true, json: async () => manifest };
  }), null);
  assert.deepEqual(unsupportedRequests, [manifestUrl.href]);
}

for (const unavailableManifest of [
  async () => { throw new Error('offline'); },
  async () => ({ ok: false }),
]) {
  assert.equal(await baked.fetchBakedAssets(unavailableManifest), null);
}

for (const unavailableBin of [
  { ok: false },
  { ok: true, arrayBuffer: async () => { throw new Error('unreadable'); } },
  { ok: true, arrayBuffer: async () => ({ byteLength: 0 }) },
]) {
  const result = await baked.fetchBakedAssets(async (url) => (
    url.endsWith('manifest.json')
      ? { ok: true, json: async () => structuredClone(partial) }
      : unavailableBin
  ));
  assert.equal(result.bins.size, 0);
  assert.deepEqual(result.manifest, partial);
}

const shortBinLoaded = await baked.fetchBakedAssets(async (url) => {
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => structuredClone(valid) };
  const entry = Object.values(valid.chapters).find((chapter) => url.endsWith(chapter.file));
  const byteLength = url.endsWith('owned.bin') ? 4 : Math.max(
    ...entry.keys.flatMap((key) => key.attrs.map((attr) => attr.byteOffset + attr.byteLength)),
  );
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(byteLength) };
});
assert.equal(shortBinLoaded.bins.has('owned'), false);
assert.deepEqual([...shortBinLoaded.bins.keys()].sort(), ['connect', 'final', 'inspire']);

// A deadline covers the response AND its body, even for a fetch double
// which ignores AbortSignal. Delayed arrivals must never mutate the result.
for (const stage of ['manifest-fetch', 'manifest-body', 'bin-fetch', 'bin-body']) {
  let release;
  let signal;
  const stalled = new Promise(resolve => { release = resolve; });
  const body = new ArrayBuffer(8);
  const small = {
    version: 1, chapters: {
      owned: { file: 'owned.bin', sha256: '0'.repeat(64), payload: {}, keys: [
        { key: 'owned/fixture', attrs: [
          { name: 'position', itemSize: 1, byteOffset: 0, byteLength: 8, kind: 'f32' },
        ] },
      ] },
      final: { file: 'final.bin', sha256: '0'.repeat(64), payload: {}, keys: [
        { key: 'final/fixture', attrs: [
          { name: 'position', itemSize: 1, byteOffset: 0, byteLength: 8, kind: 'f32' },
        ] },
      ] },
    },
  };
  const manifestResponse = { ok: true, json: async () => small };
  const binResponse = { ok: true, arrayBuffer: async () => body };
  const started = performance.now();
  const result = await baked.fetchBakedAssets(async (url, options) => {
    signal = options.signal;
    if (url.endsWith('manifest.json')) {
      if (stage === 'manifest-fetch') return stalled;
      if (stage === 'manifest-body') return { ok: true, json: () => stalled };
      return manifestResponse;
    }
    if (url.endsWith('final.bin')) return binResponse;
    if (stage === 'bin-fetch') return stalled;
    return { ok: true, arrayBuffer: () => stalled };
  }, { timeoutMs: 20 });
  assert(performance.now() - started < 1000, `${stage} settles without waiting for the asset`);
  assert.equal(signal.aborted, true, `${stage} cancels the underlying request`);
  if (stage.startsWith('manifest')) assert.equal(result, null);
  else assert.deepEqual([...result.bins.keys()], ['final'], `${stage} keeps a usable sibling`);
  release(stage === 'manifest-fetch' ? manifestResponse
    : stage === 'manifest-body' ? small
      : stage === 'bin-fetch' ? binResponse : body);
  await new Promise(resolve => setTimeout(resolve, 0));
  if (result) assert.deepEqual([...result.bins.keys()], ['final'], `${stage} cannot commit late bytes`);
}

console.log('baked manifest contract: PASS');
