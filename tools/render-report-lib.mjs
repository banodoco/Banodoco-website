// C03a — the deterministic rendering report: derivation library.
//
// NOT A TEST FILE. It derives the baseline report that later gates diff
// against, and it changes NOTHING. Every value it emits is produced one of
// three ways, and every field says which:
//
//   executed      the shipped module was imported into Node and called; the
//                 value is what the code really returned. No WebGL involved.
//   file-bytes    the value is read out of a committed artifact on disk
//                 (static/geom/*), read-only.
//   static-source the value is extracted from source TEXT. It proves "the
//                 source still says this", NOT "the program still does this".
//                 Any consumer citing one of these fields as runtime evidence
//                 is misreading it — see limitations.md §2.
//   unmeasured    the value genuinely needs a live WebGL context. It is null
//                 and carries a `reason`. It is never guessed.
//
// The report is CANONICAL: keys are emitted sorted, no wall-clock time and no
// absolute path appears anywhere inside the compared payload, so two runs are
// byte-identical. `tools/test-render-determinism.mjs` proves that.
//
// No production source was modified and NO TEST SEAM was added. The two
// environment shims below (a vendor-three resolver and a disk-backed `fetch`)
// live entirely in this file; the modules under characterization are imported
// unmodified and are unaware of them.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* The dispose-site census PARSES. See `disposeCallSites` below for why a
   pattern could not do that job. Same parser the other AST censuses in
   tools/ use (ESLint's own, already a devDependency). */
import { parse } from 'espree';

/* S-3 / D67 — the ONE shared comment stripper, aliased because this file
   already carries a private one of its own (see `stripComments` below, and the
   note on it). Only `grepSites` uses the shared module today; converting the
   brace scanners is a separate change with its own baselines to move. */
import { stripComments as sharedStripComments } from './strip-comments.mjs';

export const SCHEMA_VERSION = '1.0.0';
export const REPORT_KIND = 'deterministic-rendering-baseline';
export const RUN_ID = '2026-08-21-elegance-run-01';
export const ORDER_ID = 'C03a';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT_URL = pathToFileURL(ROOT + sep);

/** Repo-relative, forward-slashed. Absolute paths never enter the payload. */
export const rel = (abs) => relative(ROOT, abs).split(sep).join('/');
export const abs = (p) => join(ROOT, ...p.split('/'));

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');
export const sha256File = (p) => sha256(readFileSync(abs(p)));
export const readText = (p) => readFileSync(abs(p), 'utf8');

/* ------------------------------------------------------------------ *
 * Canonical JSON — sorted keys, stable number formatting.            *
 * ------------------------------------------------------------------ */

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortDeep(value[k]);
    return out;
  }
  return value;
}

/** Stable text for the report. Trailing newline so the file is line-clean. */
export function canonical(value) {
  return JSON.stringify(sortDeep(value), null, 2) + '\n';
}

/** A float64 pinned so it survives JSON exactly and reads unambiguously. */
const pinFloat = (x) => (Object.is(x, -0) ? '0' : String(x));

/* ------------------------------------------------------------------ *
 * Environment shims. Neither one is a production seam: they exist    *
 * only in this file and the imported modules are unmodified.         *
 * ------------------------------------------------------------------ */

let hooksInstalled = false;

/** Resolve the page's import-map specifiers ("three", "three/addons/…") to
 *  the vendored copies index.html points at. This is the import map, in Node. */
export function installVendorResolver() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  registerHooks({
    resolve(spec, ctx, next) {
      if (spec === 'three') {
        return { url: new URL('vendor/three/three.module.js', ROOT_URL).href, shortCircuit: true };
      }
      if (spec.startsWith('three/addons/')) {
        const tail = spec.slice('three/addons/'.length);
        return { url: new URL('vendor/three/addons/' + tail, ROOT_URL).href, shortCircuit: true };
      }
      return next(spec, ctx);
    },
  });
}

/** A `fetch` that serves the repo's own committed files off disk, so
 *  journey/lib/baked.js can run its REAL shipped read path in Node. It is
 *  installed on globalThis before that module is imported and is removed
 *  again afterwards. baked.js is not aware of it and is not modified. */
function installDiskFetch() {
  globalThis.fetch = async (url) => {
    const buf = readFileSync(abs(String(url)));
    return {
      ok: true,
      async json() { return JSON.parse(buf.toString('utf8')); },
      async arrayBuffer() { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); },
    };
  };
}

/** Swallow the two `console.info` lines baked.js prints on load so stdout
 *  stays canonical. Returns the captured lines for the report. */
function captureConsoleInfo() {
  const lines = [];
  const original = console.info;
  console.info = (...args) => { lines.push(args.map(String).join(' ')); };
  return { lines, restore() { console.info = original; } };
}

/* ------------------------------------------------------------------ *
 * Source inventory — the files this report reasons about.            *
 * ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** Every renderer-owning source file, sorted. `main.js` and `flags.js` are
 *  included as READ-ONLY inputs; C03a never writes them. */
export function renderSources() {
  return [
    ...walk(join(ROOT, 'organism')),
    ...walk(join(ROOT, 'journey')),
    join(ROOT, 'main.js'),
    join(ROOT, 'flags.js'),
  ].map(rel).filter((p) => !p.endsWith('.test.mjs')).sort();
}

/* ------------------------------------------------------------------ *
 * Section 1 — RNG streams.                                           *
 * ------------------------------------------------------------------ */

const PREFIX_N = 16;      // exact draws pinned inline
const DIGEST_N = 4096;    // draws folded into the stream digest

/** Pin a generator: the first PREFIX_N draws verbatim, plus a digest over
 *  DIGEST_N draws so a divergence anywhere in the stream is caught. */
export function pinStream(make) {
  const prefix = [];
  const gen = make();
  for (let i = 0; i < PREFIX_N; i++) prefix.push(pinFloat(gen()));
  const gen2 = make();
  const parts = [];
  for (let i = 0; i < DIGEST_N; i++) parts.push(pinFloat(gen2()));
  return { prefix, digestDraws: DIGEST_N, digest: sha256(parts.join(',')) };
}

/** How many base draws one derived call consumes, measured from OUTSIDE:
 *  advance a twin generator by k base draws until the two agree again. */
export function measureDrawCost(make, derived, maxK = 64) {
  const a = make();
  derived(a);
  const after = a();
  for (let k = 0; k <= maxK; k++) {
    const b = make();
    for (let i = 0; i < k; i++) b();
    if (b() === after) return k;
  }
  return null;
}

/** Pin exact source lines that could not be executed. Each entry records the
 *  text, whether it is REALLY PRESENT in the file (searched, not assumed),
 *  how many times, and at which lines. A pin whose `present` is false is a
 *  pin that has silently stopped describing the tree — which is precisely the
 *  failure a tautological "expected === the literal I wrote" check misses. */
export function pinSourceLines(file, lines) {
  const src = readText(file);
  const all = src.split('\n').map((l) => l.trim());
  return {
    file,
    fileSha256: sha256File(file),
    lines: lines.map((text) => {
      const at = [];
      all.forEach((l, i) => { if (l === text) at.push(i + 1); });
      return { text, present: at.length > 0, occurrences: at.length, atLines: at };
    }),
    allPresent: lines.every((text) => all.includes(text)),
  };
}

async function rngSection() {
  const random = await import(new URL('organism/random.js', ROOT_URL).href);
  const anatomy = await import(new URL('journey/anatomy.js', ROOT_URL).href);
  const helpers = await import(new URL('journey/lib/helpers.js', ROOT_URL).href);

  const LCG = 'lcg32: s = (s * 1664525 + 1013904223) >>> 0; return s / 2**32';
  const M32 = 'mulberry32: a += 0x6D2B79F5; t = imul(a ^ a>>>15, 1|a); t = (t + imul(t ^ t>>>7, 61|t)) ^ t; return (t ^ t>>>14)>>>0 / 2**32';

  const streams = [
    {
      id: 'organism.random.rand',
      module: 'organism/random.js',
      accessor: 'createRandomGeometryHelpers().rand',
      algorithm: LCG,
      seed: 1337,
      seedSource: 'module-private literal (organism/random.js:5)',
      derivation: 'executed',
      ...pinStream(() => random.createRandomGeometryHelpers().rand),
    },
    {
      id: 'journey.anatomy.makeRng.default',
      module: 'journey/anatomy.js',
      accessor: 'makeRng()',
      algorithm: LCG,
      seed: 20260802,
      seedSource: 'exported default parameter (journey/anatomy.js:15)',
      derivation: 'executed',
      ...pinStream(() => anatomy.makeRng()),
    },
    {
      id: 'journey.helpers.rng.seed1',
      module: 'journey/lib/helpers.js',
      accessor: 'rng(1)',
      algorithm: M32,
      seed: 1,
      seedSource: 'strandLines default seed (journey/lib/helpers.js:245)',
      derivation: 'executed',
      ...pinStream(() => helpers.rng(1)),
    },
    {
      id: 'journey.helpers.rng.seed1337',
      module: 'journey/lib/helpers.js',
      accessor: 'rng(1337)',
      algorithm: M32,
      seed: 1337,
      seedSource: 'noise permutation seed (journey/lib/helpers.js:25)',
      derivation: 'executed',
      ...pinStream(() => helpers.rng(1337)),
    },
    {
      id: 'organism.spores.makeRng.9127',
      module: 'organism/spores.js',
      accessor: 'module-private makeRng(9127) inside createSpores()',
      algorithm: LCG,
      seed: 9127,
      seedSource: 'closure-local literal (organism/spores.js)',
      derivation: 'static-source',
      prefix: null,
      digest: null,
      digestDraws: 0,
      unreachableReason:
        'The generator is created inside createSpores() and never exported, and '
        + 'createSpores() needs a live THREE scene plus canvas textures. Its seed and '
        + 'algorithm are pinned from source text instead; the stream itself is not '
        + 'executed here.',
      sourcePin: pinSourceLines('organism/spores.js', [
        'const randT = makeRng(9127);',
        'return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };',
      ]),
    },
  ];

  // Derived-generator draw costs, measured externally (no seam, no wrapper
  // inside the module): how many base draws one call of the derived helper
  // consumes. This IS the "draw order" of the stream — a change here shifts
  // every downstream value even when the base algorithm is untouched.
  const drawCosts = [];

  // gauss() and randRange() share one helper instance's stream, so measure
  // them against that same instance.
  const gaussCost = (() => {
    const h = random.createRandomGeometryHelpers();
    h.gauss();
    const after = h.rand();
    for (let k = 0; k <= 64; k++) {
      const t = random.createRandomGeometryHelpers();
      for (let i = 0; i < k; i++) t.rand();
      if (t.rand() === after) return k;
    }
    return null;
  })();
  const randRangeCost = (() => {
    const h = random.createRandomGeometryHelpers();
    h.randRange(0, 1);
    const after = h.rand();
    for (let k = 0; k <= 64; k++) {
      const t = random.createRandomGeometryHelpers();
      for (let i = 0; i < k; i++) t.rand();
      if (t.rand() === after) return k;
    }
    return null;
  })();
  const gaussOfCost = measureDrawCost(() => anatomy.makeRng(), (r) => anatomy.gaussOf(r));

  drawCosts.push(
    { id: 'organism.random.gauss', over: 'organism.random.rand', consumesBaseDraws: gaussCost },
    { id: 'organism.random.randRange', over: 'organism.random.rand', consumesBaseDraws: randRangeCost },
    { id: 'journey.anatomy.gaussOf', over: 'journey.anatomy.makeRng.default', consumesBaseDraws: gaussOfCost },
  );

  // The noise permutation is built at module load from rng(1337) and is not
  // exported. It is pinned through its only public consequence: noise3/fbm3
  // on a fixed lattice. A different permutation moves these numbers.
  const lattice = [];
  for (let i = 0; i < 12; i++) {
    const x = i * 0.37, y = 1.13 - i * 0.21, z = 2.5 + i * 0.11;
    lattice.push({ at: [pinFloat(x), pinFloat(y), pinFloat(z)], noise3: pinFloat(helpers.noise3(x, y, z)), fbm3: pinFloat(helpers.fbm3(x, y, z)) });
  }

  return {
    derivation: 'executed (except organism.spores.makeRng.9127 — see its unreachableReason)',
    streams: streams.sort((a, b) => (a.id < b.id ? -1 : 1)),
    derivedDrawCosts: drawCosts.sort((a, b) => (a.id < b.id ? -1 : 1)),
    noisePermutationWitness: {
      derivation: 'executed',
      note: 'journey/lib/helpers.js builds a 256-entry permutation at module load '
        + 'from rng(1337) via a Fisher-Yates shuffle. The table is module-private; '
        + 'these samples are its only public consequence and pin it indirectly.',
      samples: lattice,
      digest: sha256(lattice.map((s) => s.noise3 + '|' + s.fbm3).join(',')),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Section 2 — shader sources and uniform names.                      *
 * ------------------------------------------------------------------ */

/** Scan a template literal starting at the opening backtick index; returns
 *  { text, end } where text is the RAW source between the backticks,
 *  interpolations included. Handles escapes and nested ${ … `…` … }. */
function readTemplate(src, openIdx) {
  let i = openIdx + 1;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (depth === 0 && c === '`') return { text: src.slice(openIdx + 1, i), end: i };
    if (c === '$' && src[i + 1] === '{') { depth++; i += 2; continue; }
    if (depth > 0 && c === '{') { depth++; i++; continue; }
    if (depth > 0 && c === '}') { depth--; i++; continue; }
    if (depth > 0 && c === '`') { const inner = readTemplate(src, i); i = inner.end + 1; continue; }
    i++;
  }
  return null;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

/** Every `<keyword> T a, b[2];` declaration in a GLSL string, names only.
 *  Not line-anchored: `uniform sampler2D a; uniform float b;` on one line is
 *  two declarations and both are collected. */
export function declNames(glsl, keyword) {
  const names = [];
  const re = new RegExp(`(?:^|[;{}\\s])${keyword}[ \\t]+\\w+[ \\t]+([^;]+);`, 'gm');
  let m;
  while ((m = re.exec(glsl)) !== null) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/\[[^\]]*\]$/, '').trim();
      if (/^\w+$/.test(name)) names.push(name);
    }
    re.lastIndex = m.index + m[0].length - 1;   // allow the next decl on the same line
  }
  return names;
}

/** Every `uniform T a, b;` declaration in a GLSL string, names only. */
export function uniformNames(glsl) {
  return declNames(glsl, 'uniform');
}

/** Blank out JS comments while preserving byte offsets and newlines, so the
 *  brace scanners below cannot be derailed by a brace or paren inside a
 *  comment. String and template literals are left intact.
 *
 *  D67 — THIS IS A PRIVATE, STRING-BLIND STRIPPER AND IT IS NOT THE SHARED
 *  ONE. It tracks no string, template or regex-literal state, so a `/*` or a
 *  `//` inside a string constant opens a PHANTOM COMMENT and blanks live code
 *  — the exact defect tools/strip-comments.mjs exists to end, surviving here
 *  because QA-04's conversion order enumerated its consumers by hand and this
 *  file was not among them. It is left in place by the instrument diet, whose
 *  allowlist covers it but whose budget does not: swapping it changes what the
 *  brace scanners see and therefore what several wave baselines read, which
 *  wants a measurement of its own rather than a drive-by. NOT USED by
 *  `grepSites`, which takes the shared module above. RECORDED, not fixed. */
function stripComments(src) {
  const out = src.split('');
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      let j = i;
      while (j < src.length && src[j] !== '\n') j++;
      blank(i, j); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const j = src.indexOf('*/', i + 2);
      const end = j === -1 ? src.length : j + 2;
      blank(i, end); i = end; continue;
    }
    if (c === '`') { const t = readTemplate(src, i); i = t ? t.end + 1 : i + 1; continue; }
    if (c === '\'' || c === '"') { const t = readQuoted(src, i); i = t ? t.end + 1 : i + 1; continue; }
    i++;
  }
  return out.join('');
}

/** Scan a quoted string literal starting at its opening quote; returns
 *  { text, end } with escapes left as written (raw source form). */
function readQuoted(src, openIdx) {
  const q = src[openIdx];
  let i = openIdx + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === q) return { text: src.slice(openIdx + 1, i), end: i };
    if (src[i] === '\n') return null;
    i++;
  }
  return null;
}

/** Every `uniforms: { … }` object literal in a file, with the top-level keys
 *  it binds. This is the JS half of the uniform contract — the names three.js
 *  will look up in the linked program; the GLSL `uniform` declarations are the
 *  other half. Each block is reported at its own line, NOT associated with a
 *  particular shader slot: a source-text scanner cannot tell which slot a
 *  block belongs to without parsing, and a wrong association would be worse
 *  than none. See limitations.md §2c. */
function uniformBlocksIn(file, rawSrc) {
  const src = stripComments(rawSrc);
  const blocks = [];
  // Three shapes carry a uniform binding list in this tree:
  //   `uniforms: { … }`                    the inline literal,
  //   `const someUniforms = { … }`         a hoisted object passed by name,
  //   `function makeUniforms(…) { return {` a factory that returns one.
  // The latter two are accepted only when the NAME ends in "uniform(s)" AND
  // the body binds `value:`. Both tests together keep material descriptors
  // (which also contain `value:`, via their own nested uniforms) out.
  const re = /\buniforms\s*:\s*\{|\bconst\s+[A-Za-z_$][\w$]*[Uu]niforms?\s*=\s*\{|\bfunction\s+[A-Za-z_$][\w$]*[Uu]niforms?\s*\([^)]*\)\s*\{\s*return\s*\{/g;
  let hit;
  while ((hit = re.exec(src)) !== null) {
    const hoisted = !hit[0].startsWith('uniforms');
    const form = hit[0].startsWith('uniforms') ? 'inline-literal'
      : hit[0].startsWith('const') ? 'hoisted-const' : 'factory-return';
    const start = re.lastIndex - 1;
    let i = start;
    let depth = 0;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      else if (c === '`') { const t = readTemplate(src, i); if (t) i = t.end; }
      else if (c === '\'' || c === '"') { const t = readQuoted(src, i); if (t) i = t.end; }
    }
    const body = src.slice(start + 1, i);
    const keys = [];
    let d = 0;
    let token = '';
    for (let j = 0; j < body.length; j++) {
      const c = body[j];
      if (c === '{' || c === '[' || c === '(') { d++; token = ''; continue; }
      if (c === '}' || c === ']' || c === ')') { d--; token = ''; continue; }
      if (d === 0) {
        if (c === ':') { const t = token.trim().replace(/^['"]|['"]$/g, ''); if (/^\w+$/.test(t)) keys.push(t); token = ''; continue; }
        if (c === ',') { token = ''; continue; }
        token += c;
      }
    }
    re.lastIndex = hoisted ? start + 1 : i;
    if (hoisted && !/\bvalue\s*:/.test(body)) continue;
    blocks.push({
      file,
      line: lineOf(src, hit.index),
      form,
      keys: [...new Set(keys)].sort(),
      keyCount: new Set(keys).size,
    });
  }
  return blocks;
}

function shaderSitesIn(file) {
  const src = readText(file);
  const sites = [];
  // Named GLSL chunks: `const NAME = `…`;` and `const name = '…';`.
  const named = new Map();
  const constRe = /(?:^|\n)[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:\/\*\s*glsl\s*\*\/\s*)?(`|'|")/g;
  let cm;
  while ((cm = constRe.exec(src)) !== null) {
    const open = cm.index + cm[0].length - 1;
    const t = cm[2] === '`' ? readTemplate(src, open) : readQuoted(src, open);
    if (t && !named.has(cm[1])) named.set(cm[1], t.text);
  }
  // `vertexShader:` / `fragmentShader:` — either a literal or a reference.
  const slotRe = /\b(vertexShader|fragmentShader)\s*:\s*(?:\/\*\s*glsl\s*\*\/\s*)?(`|[A-Za-z_$][\w$]*)/g;
  let sm;
  while ((sm = slotRe.exec(src)) !== null) {
    const slot = sm[1];
    const line = lineOf(src, sm.index);
    if (sm[2] === '`') {
      const tick = sm.index + sm[0].length - 1;
      const t = readTemplate(src, tick);
      if (!t) continue;
      sites.push({ file, line, slot, form: 'inline-template', source: t.text });
    } else {
      const ref = sm[2];
      sites.push({ file, line, slot, form: 'identifier', identifier: ref, source: named.has(ref) ? named.get(ref) : null });
    }
  }
  // Named GLSL chunks that LOOK like shader source. Some are injected into a
  // slot through `${…}`, so their `uniform` declarations belong to the
  // program even though they never appear in the slot's raw text.
  const chunks = [];
  for (const [name, text] of named) {
    if (!/\b(uniform|varying|attribute|gl_Position|gl_FragColor|void\s+main)\b/.test(text)) continue;
    chunks.push({ file, name, text });
  }
  return { sites, chunks };
}

async function shaderSection() {
  const shaders = await import(new URL('organism/shaders.js', ROOT_URL).href);

  // (a) The two exported GLSL chunks — imported, so this is EXECUTED: the
  //     hash is of the string the program actually concatenates into its
  //     materials, not of a source-text approximation.
  const exported = Object.keys(shaders).sort().map((name) => {
    const glsl = shaders[name];
    return {
      name,
      module: 'organism/shaders.js',
      derivation: 'executed',
      length: glsl.length,
      sha256: sha256(glsl),
      uniforms: uniformNames(glsl).sort(),
      attributes: declNames(glsl, 'attribute').sort(),
      varyings: declNames(glsl, 'varying').sort(),
    };
  });

  // (b) Every ShaderMaterial slot in the tree — STATIC SOURCE. The hash is of
  //     the template's raw text, interpolations unexpanded, so a `${…}` whose
  //     VALUE changes elsewhere does not move this hash. See limitations §2b.
  const files = renderSources().filter((f) => {
    const s = readText(f);
    return s.includes('vertexShader') || s.includes('fragmentShader');
  });
  // Slots live only in files that mention a slot name; named GLSL chunks can
  // live anywhere (journey/chapters/final/variation.js exports one and never
  // mentions a slot), so chunks are scanned across the whole inventory.
  const inline = [];
  const chunks = [];
  for (const f of renderSources()) {
    const found = shaderSitesIn(f);
    for (const c of found.chunks) {
      chunks.push({
        file: c.file,
        name: c.name,
        derivation: 'static-source',
        length: c.text.length,
        sha256: sha256(c.text),
        interpolated: c.text.includes('${'),
        uniforms: uniformNames(c.text).sort(),
        attributes: declNames(c.text, 'attribute').sort(),
        varyings: declNames(c.text, 'varying').sort(),
      });
    }
    for (const site of found.sites) {
      inline.push({
        file: site.file,
        line: site.line,
        slot: site.slot,
        form: site.form,
        identifier: site.identifier || null,
        derivation: 'static-source',
        resolved: site.source !== null,
        length: site.source === null ? null : site.source.length,
        sha256: site.source === null ? null : sha256(site.source),
        interpolated: site.source === null ? null : site.source.includes('${'),
        uniforms: site.source === null ? null : uniformNames(site.source).sort(),
        attributes: site.source === null ? null : declNames(site.source, 'attribute').sort(),
        varyings: site.source === null ? null : declNames(site.source, 'varying').sort(),
      });
    }
  }
  inline.sort((a, b) => (a.file + ':' + String(a.line).padStart(6, '0') + a.slot
    < b.file + ':' + String(b.line).padStart(6, '0') + b.slot ? -1 : 1));

  // (c) The JS-side `uniforms: { … }` binding blocks.
  const blocks = [];
  for (const f of renderSources()) {
    const s = readText(f);
    if (s.includes('uniforms')) blocks.push(...uniformBlocksIn(f, s));
  }
  blocks.sort((a, b) => (a.file + ':' + String(a.line).padStart(6, '0') < b.file + ':' + String(b.line).padStart(6, '0') ? -1 : 1));

  chunks.sort((a, b) => (a.file + ':' + a.name < b.file + ':' + b.name ? -1 : 1));

  const allUniforms = new Set();
  for (const e of exported) for (const u of e.uniforms) allUniforms.add(u);
  for (const s of inline) for (const u of s.uniforms || []) allUniforms.add(u);
  for (const c of chunks) for (const u of c.uniforms) allUniforms.add(u);
  const allBindings = new Set();
  for (const b of blocks) for (const k of b.keys) allBindings.add(k);

  return {
    exportedChunks: exported,
    materialSlots: inline,
    materialSlotCount: inline.length,
    glslChunks: chunks,
    glslChunkCount: chunks.length,
    unresolvedSlotCount: inline.filter((s) => !s.resolved).length,
    fileDigests: files.map((f) => ({ file: f, sha256: sha256File(f) })),
    uniformNameUnion: [...allUniforms].sort(),
    uniformNameUnionCount: allUniforms.size,
    uniformBindingBlocks: blocks,
    uniformBindingBlockCount: blocks.length,
    uniformBindingNameUnion: [...allBindings].sort(),
    uniformBindingNameUnionCount: allBindings.size,
    declaredButNeverBound: [...allUniforms].filter((u) => !allBindings.has(u)).sort(),
    boundButNeverDeclared: [...allBindings].filter((u) => !allUniforms.has(u)).sort(),
    compiledProgram: {
      derivation: 'unmeasured',
      value: null,
      reason: 'The GLSL three.js actually compiles is the slot text plus three\'s '
        + 'own prologue (precision, built-in uniforms, defines, WebGL2 mangling) and '
        + 'any onBeforeCompile rewrite. Producing it requires a live WebGLRenderer, '
        + 'which C03a is forbidden to start.',
    },
    activeUniformLocations: {
      derivation: 'unmeasured',
      value: null,
      reason: 'Which declared uniforms survive as ACTIVE after GLSL dead-code '
        + 'elimination is a driver-side fact readable only from a linked program.',
    },
  };
}

/* ------------------------------------------------------------------ *
 * Section 3 — geometry: the committed bake, and a live builder.      *
 * ------------------------------------------------------------------ */

/** The manifest-vs-bytes analysis for ONE chapter, as a pure function of a
 *  manifest record and the bytes it describes. Exported so the perturbation
 *  suite can hand it a mutated record and prove the checks bite. */
export function analyzeChapter(id, ch, bytes) {
  let cursor = 0;
  let contiguous = true;
  let aligned = true;
  const keys = [];
  for (const rec of ch.keys) {
    const attrs = rec.attrs.map((a) => {
      if (a.byteOffset !== cursor) contiguous = false;
      if (a.byteOffset % 4 !== 0) aligned = false;
      cursor = a.byteOffset + a.byteLength;
      const elements = a.byteLength / 4;
      return {
        name: a.name,
        itemSize: a.itemSize,
        kind: a.kind,
        byteOffset: a.byteOffset,
        byteLength: a.byteLength,
        elementCount: elements,
        itemCount: elements / a.itemSize,
      };
    });
    keys.push({ key: rec.key, attrs, attrNames: attrs.map((a) => a.name) });
  }
  const actual = sha256(bytes);
  return {
    chapter: id,
    file: 'static/geom/' + ch.file,
    declaredSha256: ch.sha256,
    actualSha256: actual,
    sha256Matches: actual === ch.sha256,
    byteLength: bytes.length,
    coveredBytes: cursor,
    coversFileExactly: cursor === bytes.length,
    attrsContiguous: contiguous,
    allOffsets4Aligned: aligned,
    keyCount: keys.length,
    keys,
    payloadKeys: ch.payload ? Object.keys(ch.payload).sort() : [],
  };
}

function bakedFromDisk() {
  const manifest = JSON.parse(readText('static/geom/manifest.json'));
  const chapters = [];
  for (const id of Object.keys(manifest.chapters).sort()) {
    const ch = manifest.chapters[id];
    chapters.push(analyzeChapter(id, ch, readFileSync(abs('static/geom/' + ch.file))));
  }
  return {
    derivation: 'file-bytes',
    manifestVersion: manifest.version,
    manifestSha256: sha256File('static/geom/manifest.json'),
    chapterCount: chapters.length,
    totalKeyCount: chapters.reduce((n, c) => n + c.keyCount, 0),
    totalAttrCount: chapters.reduce((n, c) => n + c.keys.reduce((m, k) => m + k.attrs.length, 0), 0),
    totalBakedBytes: chapters.reduce((n, c) => n + c.byteLength, 0),
    chapters,
  };
}

/** Run journey/lib/baked.js's REAL shipped read path over the committed
 *  bytes and record what the BufferGeometry it hands a chapter actually is. */
// journey/lib/baked.js loads ONCE per process — its fetch and its console
// line are module-evaluation side effects. They are captured on that first
// load and reused, so a second buildReport() in the same process reports the
// same load record rather than an empty one. The GEOMETRY below is genuinely
// rebuilt on every call; only the one-shot load record is remembered.
let bakedLoad = null;

async function loadBaked() {
  if (bakedLoad) return bakedLoad;
  installDiskFetch();
  const cap = captureConsoleInfo();
  const baked = await import(new URL('journey/lib/baked.js', ROOT_URL).href);
  await baked.ready;
  cap.restore();
  delete globalThis.fetch;
  bakedLoad = { baked, consoleOnLoad: cap.lines };
  return bakedLoad;
}

async function bakedRebuilt() {
  const manifest = JSON.parse(readText('static/geom/manifest.json'));
  const { baked, consoleOnLoad } = await loadBaked();

  const rebuilt = [];
  for (const id of Object.keys(manifest.chapters).sort()) {
    for (const rec of manifest.chapters[id].keys) {
      const layout = rec.attrs.filter((a) => a.name !== 'index').map((a) => [a.name, a.itemSize]);
      const g = baked.geometry(rec.key, layout);
      const attrs = Object.keys(g.attributes).sort().map((name) => {
        const a = g.attributes[name];
        return {
          name,
          itemSize: a.itemSize,
          count: a.count,
          arrayLength: a.array.length,
          arrayByteLength: a.array.byteLength,
          arrayType: a.array.constructor.name,
          normalized: a.normalized,
          usage: a.usage,
        };
      });
      rebuilt.push({
        key: rec.key,
        chapter: id,
        attrs,
        attrNames: attrs.map((a) => a.name),
        indexed: g.index !== null,
        indexCount: g.index ? g.index.count : null,
        drawRange: { start: g.drawRange.start, count: g.drawRange.count === Infinity ? 'Infinity' : g.drawRange.count },
        groupCount: g.groups.length,
      });
    }
  }
  rebuilt.sort((a, b) => (a.key < b.key ? -1 : 1));
  return {
    derivation: 'executed',
    note: 'journey/lib/baked.js imported unmodified; its fetch was answered from '
      + 'disk by this file. isBaked() true for every chapter below.',
    isBaked: Object.keys(manifest.chapters).sort().map((id) => ({ chapter: id, baked: baked.isBaked(id) })),
    consoleOnLoad,
    geometries: rebuilt,
    totalAttrCount: rebuilt.reduce((n, g) => n + g.attrs.length, 0),
    totalArrayByteLength: rebuilt.reduce((n, g) => n + g.attrs.reduce((m, a) => m + a.arrayByteLength, 0), 0),
  };
}

/** The two geometry views must agree, and where they differ the difference
 *  must be exactly the index buffers — `geometry()` sets those through
 *  setIndex(), so they leave `attributes` and land on `index`. Any other
 *  difference means the manifest and the read path disagree. */
function reconcile(disk, rebuilt) {
  let indexAttrs = 0;
  let indexBytes = 0;
  const diskKeys = [];
  for (const c of disk.chapters) {
    for (const k of c.keys) {
      diskKeys.push(k.key);
      for (const a of k.attrs) {
        if (a.name === 'index') { indexAttrs++; indexBytes += a.byteLength; }
      }
    }
  }
  const rebuiltKeys = rebuilt.geometries.map((g) => g.key);
  return {
    derivation: 'executed + file-bytes',
    diskKeyCount: diskKeys.length,
    rebuiltKeyCount: rebuiltKeys.length,
    keySetsEqual: [...diskKeys].sort().join('|') === [...rebuiltKeys].sort().join('|'),
    diskAttrCount: disk.totalAttrCount,
    rebuiltAttrCount: rebuilt.totalAttrCount,
    indexAttrCount: indexAttrs,
    attrCountDifferenceIsIndexOnly: disk.totalAttrCount - rebuilt.totalAttrCount === indexAttrs,
    diskAttrBytes: disk.chapters.reduce((n, c) => n + c.keys.reduce((m, k) => m + k.attrs.reduce((q, a) => q + a.byteLength, 0), 0), 0),
    rebuiltAttrBytes: rebuilt.totalArrayByteLength,
    indexBytes,
    byteDifferenceIsIndexOnly:
      disk.chapters.reduce((n, c) => n + c.keys.reduce((m, k) => m + k.attrs.reduce((q, a) => q + a.byteLength, 0), 0), 0)
      - rebuilt.totalArrayByteLength === indexBytes,
    indexedGeometries: rebuilt.geometries.filter((g) => g.indexed).map((g) => ({ key: g.key, indexCount: g.indexCount })),
  };
}

/** A live builder invoked headlessly. strandLines is pure math over a
 *  BufferGeometry — no WebGL — so its attribute counts and byte lengths are
 *  a real executed baseline, not a source reading. */
async function builderFixtures() {
  const helpers = await import(new URL('journey/lib/helpers.js', ROOT_URL).href);
  const THREE = await import(new URL('vendor/three/three.module.js', ROOT_URL).href);

  const cases = [];
  for (const [count, seed, pts] of [[7, 1, 2], [7, 20260802, 4], [23, 1337, 8]]) {
    const { geometry, count: returned } = helpers.strandLines({
      count,
      seed,
      generator: (i, rand) => {
        const out = [];
        for (let j = 0; j < pts; j++) {
          out.push(new THREE.Vector3(rand() + i, rand() - j, rand() * 2));
        }
        return out;
      },
    });
    const attrs = Object.keys(geometry.attributes).sort().map((name) => {
      const a = geometry.attributes[name];
      return { name, itemSize: a.itemSize, count: a.count, arrayLength: a.array.length, arrayByteLength: a.array.byteLength, arrayType: a.array.constructor.name };
    });
    cases.push({
      builder: 'journey/lib/helpers.js#strandLines',
      input: { count, seed, pointsPerStrand: pts },
      returnedCount: returned,
      attrs,
      attrNames: attrs.map((a) => a.name),
      indexed: geometry.index !== null,
      drawRange: { start: geometry.drawRange.start, count: geometry.drawRange.count === Infinity ? 'Infinity' : geometry.drawRange.count },
      positionDigest: sha256(Buffer.from(geometry.attributes.position.array.buffer, geometry.attributes.position.array.byteOffset, geometry.attributes.position.array.byteLength)),
    });
  }
  return {
    derivation: 'executed',
    note: 'The chapter builders in journey/chapters/**/*.js are NOT invoked here — '
      + 'they need a live scene, canvas textures and a renderer. strandLines is the '
      + 'shared packing primitive underneath several of them and is pure, so it is '
      + 'the one builder C03a can pin by execution. See limitations.md §3.',
    cases,
  };
}

/* ------------------------------------------------------------------ *
 * The dispose-site census, and why this one parses.                   *
 * ------------------------------------------------------------------ */

/** Every node of an ESTree tree, parents before children. */
function walkAst(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const value = node[key];
    if (Array.isArray(value)) { for (const child of value) walkAst(child, visit); }
    else walkAst(value, visit);
  }
}

/** Every `x.dispose(…)` CALL SITE, derived from the syntax tree.
 *
 *  WHY THIS ONE IS NOT A PATTERN, when every other census here is. The
 *  pattern it replaces was `\.dispose\s*\(`, and it cannot see
 *  `chapter?.dispose?.()` — the optional call puts `?.` between the name and
 *  the parenthesis. That is not a corner case: it is the spelling a reader
 *  reaches for first when a member may be absent, which is exactly the
 *  situation a teardown cascade is in. A census blind to it does not report a
 *  smaller number; it reports the same number while a real disposer stands
 *  outside its view, and `M16` — the floor whose whole job is noticing
 *  teardown that disappears — cannot notice teardown it never saw.
 *
 *  It also read a `.dispose(` inside a string literal as a call, which the
 *  comment stripper cannot help with because a string is not a comment.
 *
 *  D123 says that when a census cannot see your syntax you change the code,
 *  not the census. That rule assumes the census is right. Here it was not,
 *  and the production spelling in `journey/chapter-registry.js` had been
 *  bent to suit it — so the census moved instead.
 *
 *  IDENTITY IS UNCHANGED, deliberately: `file :: trimmed RAW source line`,
 *  at most one site per line, which is what the pattern scan yielded and what
 *  `M16`'s recorded manifest is keyed on. A site spread over several lines is
 *  reported at the line carrying the member name, where a reader will find it. */
function disposeCallSites(files) {
  const hits = [];
  for (const f of files) {
    const raw = readText(f);
    const lines = raw.split('\n');
    let ast;
    try {
      ast = parse(raw, { ecmaVersion: 'latest', sourceType: 'module', loc: true });
    } catch (e) {
      throw new Error(`dispose census REFUSES: ${f} does not parse — ${e.message}`, { cause: e });
    }
    const seen = new Set();
    walkAst(ast, (node) => {
      if (node.type !== 'CallExpression') return;
      const callee = node.callee;
      if (!callee || callee.type !== 'MemberExpression') return;
      const prop = callee.property;
      const name = callee.computed
        ? (prop.type === 'Literal' && typeof prop.value === 'string' ? prop.value : null)
        : (prop.type === 'Identifier' ? prop.name : null);
      if (name !== 'dispose') return;
      const line = prop.loc.start.line;
      if (seen.has(line)) return;
      seen.add(line);
      hits.push({ file: f, line, text: (lines[line - 1] || '').trim() });
    });
  }
  return hits.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
}

/* ------------------------------------------------------------------ *
 * Section 4 — draw ranges and draw order.                            *
 * ------------------------------------------------------------------ */

/** The one text primitive every static-source count is built on: the first
 *  match of `pattern` per line. Exported so the perturbation suite can attack
 *  it with synthetic text instead of editing the tree. */
export function scanText(text, pattern) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    const m = new RegExp(pattern).exec(line);
    if (m) hits.push({ line: i + 1, match: m[0], text: line.trim() });
  });
  return hits;
}

/** The comment filter every static count applies: a hit whose line begins a
 *  comment is not a call site. Exported for the same reason as scanText.
 *
 *  IT IS A HEURISTIC AND IT IS WRONG ON ONE SHAPE (D101/D143). This codebase
 *  indents block-comment CONTINUATION lines without a leading `*`, so a line
 *  inside a block comment that names a call with its parenthesis passes this
 *  filter and is counted as a call site. Measured: FOUR of `M16`'s recorded
 *  "new dispose sites" were comments, and a fifth in the `setTimeout` census;
 *  the count fell when E01 reworded one line of prose. Two orders have already
 *  had to reword production prose to make a census come out right, which is
 *  D137's "style chosen for greppability" inside the instrument that measures
 *  it.
 *
 *  THE REPAIR IS IN `grepSites` BELOW, not here: the discrimination cannot be
 *  made from a trimmed line in isolation, only from the file. This predicate
 *  is kept and still applied, unchanged, because it is EXPORTED and
 *  tools/test-render-perturbation.mjs's P16-P21 drive it directly over
 *  synthetic snippets where it is adequate and where P21 documents it as a
 *  declared blind spot. After the repair below it is a second, redundant
 *  filter over already-blanked text — which costs nothing and keeps those
 *  callers' behaviour byte-identical. */
export const isCode = (h) => !h.text.startsWith('//') && !h.text.startsWith('*');

/** Every line of every file matching `pattern`, as call SITES.
 *
 *  D143 — the scan runs over the COMMENT-STRIPPED text and reports the RAW
 *  line. `stripComments` is length- AND line-preserving by construction, so
 *  line `n` of the stripped text is line `n` of the original and the reported
 *  `text` is still exactly what a reader will find at that line. What changes
 *  is that a call named inside a comment cannot match, however the comment is
 *  indented — which is the whole of the D101/D143 defect, fixed at the level
 *  where the file is still available. */
function grepSites(pattern, files) {
  const hits = [];
  for (const f of files) {
    const raw = readText(f);
    const lines = raw.split('\n');
    for (const h of scanText(sharedStripComments(raw), pattern)) {
      hits.push({ file: f, line: h.line, match: h.match, text: (lines[h.line - 1] || '').trim() });
    }
  }
  return hits;
}

function drawRangeSection(files, rebuilt) {
  const setSites = grepSites('\\.setDrawRange\\s*\\(', files);
  return {
    setDrawRangeSites: setSites,
    setDrawRangeSiteCount: setSites.length,
    setDrawRangeDerivation: 'static-source',
    invariant: setSites.length === 0
      ? 'No source site narrows a draw range. Every geometry in the tree therefore '
        + 'draws its full attribute count, and three.js\'s default drawRange '
        + '{ start: 0, count: Infinity } is the shipped value everywhere.'
      : 'At least one site narrows a draw range; see setDrawRangeSites.',
    observedDefaults: {
      derivation: 'executed',
      note: 'Every geometry journey/lib/baked.js rebuilds from the committed bytes, '
        + 'read back after construction.',
      allStartZero: rebuilt.geometries.every((g) => g.drawRange.start === 0),
      allCountInfinity: rebuilt.geometries.every((g) => g.drawRange.count === 'Infinity'),
      geometryCount: rebuilt.geometries.length,
    },
    runtimeDrawRange: {
      derivation: 'unmeasured',
      value: null,
      reason: 'The range the driver is handed per frame also depends on instancing '
        + 'counts and on any per-frame mutation a chapter performs on a LIVE geometry. '
        + 'Reading it needs a running scene.',
    },
  };
}

function drawOrderSection(files) {
  const sites = grepSites('\\.renderOrder\\s*=', files)
    .filter((h) => !h.text.startsWith('//'));
  const parsed = sites.map((h) => {
    const m = /\.renderOrder\s*=\s*(-?\d+(?:\.\d+)?)\s*;/.exec(h.text);
    return {
      file: h.file,
      line: h.line,
      text: h.text,
      value: m ? Number(m[1]) : null,
      literal: !!m,
    };
  });
  const literals = parsed.filter((p) => p.literal).map((p) => p.value);
  return {
    derivation: 'static-source',
    warning: 'This is SOURCE order, not GPU submission order. three.js sorts each '
      + 'render list by renderOrder, then by material/program and by depth for '
      + 'transparents. Only a live renderer can report the order actually submitted. '
      + 'No downstream gate may cite this section as proof of submission order.',
    renderOrderSites: parsed,
    renderOrderSiteCount: parsed.length,
    literalAssignmentCount: literals.length,
    nonLiteralAssignmentCount: parsed.length - literals.length,
    distinctLiteralValues: [...new Set(literals)].sort((a, b) => a - b),
    minLiteral: literals.length ? Math.min(...literals) : null,
    maxLiteral: literals.length ? Math.max(...literals) : null,
    submissionOrder: {
      derivation: 'unmeasured',
      value: null,
      reason: 'Needs WebGLRenderer.info plus a render-list dump from a live frame.',
    },
  };
}

/* ------------------------------------------------------------------ *
 * Section 5 — material flags.                                        *
 * ------------------------------------------------------------------ */

const MATERIAL_FLAGS = [
  'alphaTest', 'blendDst', 'blendEquation', 'blendSrc', 'blending', 'clipping',
  'colorWrite', 'depthTest', 'depthWrite', 'dithering', 'flatShading', 'fog',
  'forceSinglePass', 'opacity', 'polygonOffset', 'polygonOffsetFactor',
  'polygonOffsetUnits', 'premultipliedAlpha', 'side', 'toneMapped',
  'transparent', 'vertexColors', 'visible', 'wireframe',
];

function materialFlagSection(files) {
  const perFlag = [];
  for (const flag of MATERIAL_FLAGS) {
    const hits = grepSites(`\\b${flag}\\s*[:=][^=]`, files).filter((h) => !h.text.startsWith('//') && !h.text.startsWith('*'));
    const byFile = {};
    for (const h of hits) byFile[h.file] = (byFile[h.file] || 0) + 1;
    perFlag.push({
      flag,
      siteCount: hits.length,
      files: Object.keys(byFile).sort().map((f) => ({ file: f, count: byFile[f] })),
    });
  }
  return {
    derivation: 'static-source',
    warning: 'Occurrence counts of flag names in source, not the resolved value on '
      + 'any live material. A flag set through a variable, a spread, or three\'s own '
      + 'default is invisible here. Use this to detect that a flag site appeared or '
      + 'vanished, never to assert what a material is.',
    flagsTracked: MATERIAL_FLAGS,
    perFlag,
    totalFlagSiteCount: perFlag.reduce((n, f) => n + f.siteCount, 0),
    resolvedMaterialState: {
      derivation: 'unmeasured',
      value: null,
      reason: 'The effective flags on the materials a frame binds — including '
        + 'three\'s defaults and any per-frame mutation — need a live scene.',
    },
  };
}

/* ------------------------------------------------------------------ *
 * Section 6 — listener / rAF lifecycle.                              *
 * ------------------------------------------------------------------ */

const LIFECYCLE_CALLS = [
  'addEventListener', 'removeEventListener',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver',
];

function lifecycleSection(files) {
  // The CLEANUP calls additionally carry a per-SITE identity, so a gate can
  // pin the SET of teardown sites rather than just how many there are. A count
  // floor passes when one site is deleted and another added elsewhere; a set
  // does not. Identity is `file :: trimmed source line`, deliberately NOT the
  // line NUMBER — a line number shifts whenever anything above it changes, and
  // a manifest that thrashes on unrelated edits is a manifest nobody keeps.
  const WITH_SITES = new Set(['removeEventListener', 'cancelAnimationFrame']);
  const per = LIFECYCLE_CALLS.map((call) => {
    const hits = grepSites(`\\b${call}\\s*\\(`, files).filter(isCode);
    const byFile = {};
    for (const h of hits) byFile[h.file] = (byFile[h.file] || 0) + 1;
    const entry = { call, siteCount: hits.length, files: Object.keys(byFile).sort().map((f) => ({ file: f, count: byFile[f] })) };
    if (WITH_SITES.has(call)) entry.sites = hits.map((h) => `${h.file} :: ${h.text}`).sort();
    return entry;
  });
  const get = (name) => per.find((p) => p.call === name).siteCount;
  return {
    derivation: 'static-source',
    warning: 'Call SITES, not live registrations. One site inside a loop registers '
      + 'many listeners; one site behind a guard may register none.',
    perCall: per,
    addRemoveBalance: {
      addEventListenerSites: get('addEventListener'),
      removeEventListenerSites: get('removeEventListener'),
      requestAnimationFrameSites: get('requestAnimationFrame'),
      cancelAnimationFrameSites: get('cancelAnimationFrame'),
    },
    liveCounts: {
      derivation: 'unmeasured',
      value: null,
      reason: 'Live listener and rAF counts need an instrumented browser page; that '
        + 'measurement belongs to the G1 gate owner, not to C03a.',
    },
  };
}

/* ------------------------------------------------------------------ *
 * Section 7 — resource owners.                                       *
 * ------------------------------------------------------------------ */

const RESOURCE_CLASSES = {
  geometries: ['BufferGeometry', 'PlaneGeometry', 'BoxGeometry', 'SphereGeometry',
    'CylinderGeometry', 'ConeGeometry', 'CircleGeometry', 'RingGeometry',
    'TorusGeometry', 'TubeGeometry', 'LatheGeometry', 'ShapeGeometry',
    'ExtrudeGeometry', 'InstancedBufferGeometry', 'EdgesGeometry', 'WireframeGeometry'],
  materials: ['ShaderMaterial', 'RawShaderMaterial', 'MeshBasicMaterial',
    'MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshLambertMaterial',
    'MeshPhongMaterial', 'MeshNormalMaterial', 'MeshDepthMaterial',
    'MeshMatcapMaterial', 'MeshToonMaterial', 'LineBasicMaterial',
    'LineDashedMaterial', 'PointsMaterial', 'SpriteMaterial'],
  textures: ['CanvasTexture', 'DataTexture', 'Texture', 'TextureLoader',
    'VideoTexture', 'DepthTexture', 'CompressedTexture', 'FramebufferTexture'],
  renderTargets: ['WebGLRenderTarget', 'WebGLMultipleRenderTargets', 'WebGLArrayRenderTarget'],
};

function resourceSection(files) {
  const groups = {};
  for (const group of Object.keys(RESOURCE_CLASSES).sort()) {
    const classes = [];
    for (const cls of [...RESOURCE_CLASSES[group]].sort()) {
      const hits = grepSites(`new\\s+(?:THREE\\.)?${cls}\\s*\\(`, files).filter((h) => !h.text.startsWith('//') && !h.text.startsWith('*'));
      const byFile = {};
      for (const h of hits) byFile[h.file] = (byFile[h.file] || 0) + 1;
      if (hits.length) classes.push({ class: cls, siteCount: hits.length, files: Object.keys(byFile).sort().map((f) => ({ file: f, count: byFile[f] })) });
    }
    groups[group] = { classes, constructionSiteCount: classes.reduce((n, c) => n + c.siteCount, 0) };
  }
  const disposeHits = disposeCallSites(files);
  const byFile = {};
  for (const h of disposeHits) byFile[h.file] = (byFile[h.file] || 0) + 1;
  const disposeSites = disposeHits.map((h) => `${h.file} :: ${h.text}`).sort();
  return {
    derivation: 'static-source',
    warning: 'CONSTRUCTION SITES, not live instances. A site inside a loop owns many '
      + 'resources; a site in dead code owns none. This detects a new or vanished '
      + 'owner, not a leak.',
    groups,
    totalConstructionSiteCount: Object.values(groups).reduce((n, g) => n + g.constructionSiteCount, 0),
    disposeSiteCount: disposeHits.length,
    disposeSites,
    disposeSitesByFile: Object.keys(byFile).sort().map((f) => ({ file: f, count: byFile[f] })),
    liveResourceCounts: {
      derivation: 'unmeasured',
      value: null,
      reason: 'WebGLRenderer.info.memory.{geometries,textures} and the program cache '
        + 'size are the real owner counts, and all three need a live renderer.',
    },
  };
}

/* ------------------------------------------------------------------ *
 * The report.                                                        *
 * ------------------------------------------------------------------ */

export async function buildReport() {
  installVendorResolver();
  const files = renderSources();

  const rng = await rngSection();
  const shaders = await shaderSection();
  const disk = bakedFromDisk();
  const rebuilt = await bakedRebuilt();
  const builders = await builderFixtures();

  return {
    schemaVersion: SCHEMA_VERSION,
    reportKind: REPORT_KIND,
    run: RUN_ID,
    order: ORDER_ID,
    canonicalization: 'keys sorted recursively; no wall-clock time and no absolute '
      + 'path in the payload; floats pinned as their exact JS string form',
    sourceInventory: {
      derivation: 'file-bytes',
      fileCount: files.length,
      files: files.map((f) => ({ file: f, sha256: sha256File(f) })),
    },
    rng,
    shaders,
    geometry: {
      bakedOnDisk: disk,
      bakedRebuilt: rebuilt,
      builders,
      diskVsRebuiltReconciliation: reconcile(disk, rebuilt),
    },
    drawRanges: drawRangeSection(files, rebuilt),
    drawOrder: drawOrderSection(files),
    materialFlags: materialFlagSection(files),
    lifecycle: lifecycleSection(files),
    resourceOwners: resourceSection(files),
  };
}
