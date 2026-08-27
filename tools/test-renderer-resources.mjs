// R04 — organism/renderer.js's WebGLRenderer + OrbitControls, and
// journey/chapters/owned/portrait-textures.js's texture-retirement policy,
// each get one named owner and idempotent disposal.
// Run with: node tools/test-renderer-resources.mjs
// Prove every comparison below can actually fail: node tools/test-renderer-resources.mjs --prove-failure
//
// Method, mirroring R01's tools/test-animation-lifecycle.mjs, R02's
// tools/test-intro-lifecycle.mjs and R03's tools/test-spores-lifecycle.mjs:
// load the pre-change implementation (`git show <RUN_START_SHA>:<path>`,
// this run's starting point) and the current working-tree implementation
// into their own temp copies OUTSIDE the repo, rewriting only the
// unresolvable-in-Node specifiers, and drive both with identical injected
// doubles. No browser, no real WebGL context, no jsdom.
//
// `organism/renderer.js` imports `'three'` and
// `'three/addons/controls/OrbitControls.js'`, bare specifiers a page
// resolves only through index.html's importmap. Its WebGLRenderer
// construction needs a real GL context (a canvas + getContext('webgl'))
// which plain Node has none of, and OrbitControls needs a DOM element with
// working pointer-event listener methods — exactly the "no browser, no
// WebGL" case the brief calls out. So both specifiers are rewritten to
// INJECTED DOUBLES (below) rather than the real vendored files: a
// WebGLRenderer double and an OrbitControls double, each recording every
// call it receives. Scene/Color/Fog/PerspectiveCamera need no GL context —
// they are plain data/math classes — so the double's `export * from`
// forwards those (and Vector3, used by the OrbitControls double's `target`)
// straight from the real vendored three.module.js; only WebGLRenderer is
// locally overridden (a local named export wins over a star re-export of
// the same name in ES modules — verified with a throwaway probe before
// relying on it here). `./performance.js` (createPixelRatioPolicy) needs no
// double: it is real, unmodified, browser-optional code already wrapped in
// try/catch around every global it touches (screen/devicePixelRatio/
// localStorage) — this suite stubs those globals so its live-calibration
// branch is genuinely exercised, not just its fallback.
//
// SECTIONS
//   1  renderer.js: construction-value identity (HEAD vs current), across
//      four parameter/global combinations, with a positive control proving
//      the comparator can fail
//   2  renderer.js: resource-class census — proves by grep, not assertion,
//      that this file constructs none of the four tracked resource classes
//      (geometries/materials/textures/renderTargets) and exactly one
//      WebGLRenderer + one OrbitControls per call
//   3  renderer.js: disposal parity + idempotence (double dispose) +
//      two-instance isolation
//   4  portrait-textures.js: disposal policy identity (HEAD vs current,
//      T1-T3-equivalent scenarios), the NEW disposed-owner guard, and an
//      in-flight-async-continuation-after-dispose scenario mirroring the
//      shape of the C04 tickSwap defect class (built as a failing case
//      first, on an unguarded double, then shown caught on the real file)
//   5  portrait-deal.js: a resource/async census proving the "nothing to
//      compose ownership around" finding is falsifiable, not asserted
//   --prove-failure  re-runs every load-bearing comparison above against
//      targeted mutants of the CURRENT source (anchor-checked string
//      substitution) and confirms each one is actually caught

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { auditLiteralPredicates } from './self-controls.mjs';
import { armSentinel } from './instrument-ledger.mjs';

/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: this suite minted THREE families of       *
 * staging directory - r04-doubles (once), r04-renderer and r04-textures  *
 * (one per module load) - and removed none of them: 6 directories per    *
 * run.                                                                   *
 *                                                                        *
 * All three prefixes are KEPT rather than consolidated under one root.   *
 * They are the vocabulary the leak was attributed with in this run's     *
 * evidence, and a rename would silently break that attribution. What     *
 * changes is that r04-renderer and r04-textures are now minted ONCE and  *
 * their per-load directories nested inside, so three removals reclaim    *
 * everything.                                                            *
 *                                                                        *
 * WHY AN EXIT HOOK AND NOT try/finally: the root is created at module    *
 * top level, where there is no enclosing try to attach a finally to -    *
 * and this suite terminates through process.exit(), which does NOT run   *
 * finally blocks.                                                        *
 *                                                                        *
 * Both halves of that are measured rather than assumed. The positive     *
 * control in this order's evidence directory (hygiene-01/control-exit-   *
 * hook.mjs) shows a finally whose try calls process.exit leaking its     *
 * directory, while the exit hook fires on a normal end, on               *
 * process.exit(), AND on an uncaught throw.                              *
 *                                                                        *
 * Removal is best effort by design: a suite must not fail because a temp *
 * tree was already gone.                                                 *
 * ====================================================================== */
const DOUBLE_ROOT = mkdtempSync(join(tmpdir(), 'r04-doubles-'));
const RENDERER_ROOT = mkdtempSync(join(tmpdir(), 'r04-renderer-'));
const TEXTURES_ROOT = mkdtempSync(join(tmpdir(), 'r04-textures-'));
process.on('exit', () => {
  for (const root of [DOUBLE_ROOT, RENDERER_ROOT, TEXTURES_ROOT]) {
    try { rmSync(root, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

/* D57/D73 — the abort sentinel. QA-07: this suite shipped with NONE, so a
 * crash in it was byte-identical to a clean pass under `grep '^FAIL'`. One
 * shared implementation (tools/instrument-ledger.mjs), not a fourteenth local
 * one. TWO phases, because the ledger reports before the sweep runs: D57's
 * own addendum is that a crash AFTER the ledger but BEFORE the sweep leaves a
 * log whose last line is a reassuring total. A phase never REQUESTED stays
 * silent. It does NOT replace reading the exit code in the producing command
 * — a sentinel is installed by code that must first parse (D73). */
const SENT = armSentinel('test-renderer-resources',
  ['ledger', ...(process.argv.includes('--prove-failure') ? ['prove'] : [])]);

/* QA-06: the audit scans THIS file. When the audit lived here it read
   import.meta.url; shared, that would read the module instead of the caller —
   D45's shape manufactured by consolidation. The path is now explicit. */
const SELF_PATH = fileURLToPath(import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const THREE_REAL_URL = pathToFileURL(join(REPO_ROOT, 'vendor/three/three.module.js')).href;
const PERFORMANCE_URL = pathToFileURL(join(REPO_ROOT, 'organism/performance.js')).href;
const RENDERER_PATH = join(REPO_ROOT, 'organism/renderer.js');
const TEXTURES_PATH = join(REPO_ROOT, 'journey/chapters/owned/portrait-textures.js');
const DEALER_PATH = join(REPO_ROOT, 'journey/chapters/owned/portrait-deal.js');

// This run's starting commit, pinned explicitly — HEAD is a moving ref in
// this shared tree (see R01's README for why that matters: once this
// order's own edits land, HEAD would advance past the pre-change file and
// BASELINE_SOURCE would silently become byte-identical to CURRENT_SOURCE).
const RUN_START_SHA = '6967a36ab309af7057336be64d6f0f9dd3c41b21';

/* ------------------------------------------------------------------ *
 * Minimal self-contained ledger — no dependency on another order's    *
 * test infrastructure (R02/R03 precedent).                            *
 * ------------------------------------------------------------------ */
function createLedger(title) {
  const rows = [];
  return {
    check(name, pass, detail) {
      rows.push({ name, pass: !!pass, detail });
      return !!pass;
    },
    same(name, value, expected, detail) {
      const a = JSON.stringify(value);
      const b = JSON.stringify(expected);
      const pass = a === b;
      rows.push({ name, pass, detail: detail !== undefined ? detail : { got: a, expected: b } });
      return pass;
    },
    report() {
      let failed = 0;
      for (const row of rows) {
        const mark = row.pass ? 'PASS' : 'FAIL';
        if (!row.pass) failed++;
        console.log(`[${mark}] ${title} — ${row.name}`);
        if (!row.pass) console.log('       ', row.detail);
      }
      console.log(`${title}: ${rows.length - failed}/${rows.length} passed`);
      return failed;
    },
  };
}
const L = createLedger('renderer + portrait-texture-owner resources');

/* ------------------------------------------------------------------ *
 * Anchor-checked string substitution — QA-01's rule (patterns.md): a  *
 * substitution that does not match, or would be a no-op, throws       *
 * rather than silently producing a mutant identical to the original.  *
 * ------------------------------------------------------------------ */
function mutate(source, label, edits) {
  let out = source;
  for (const [from, to, expectedCount = 1] of edits) {
    const count = out.split(from).length - 1;
    if (count !== expectedCount) {
      throw new Error(
        `mutant '${label}': anchor mismatch — expected ${expectedCount} occurrence(s) of\n  ${JSON.stringify(from)}\nfound ${count}. The source moved; update the anchor.`
      );
    }
    if (from === to) throw new Error(`mutant '${label}': edit is a no-op (from === to)`);
    out = out.split(from).join(to);
  }
  if (out === source) throw new Error(`mutant '${label}': produced byte-identical output — not a mutant`);
  return out;
}

/* ------------------------------------------------------------------ *
 * Resource-class census — the same four classes C03a's M11-M15 track  *
 * (geometries/materials/textures/renderTargets), applied here as a    *
 * falsifiable claim about SOURCE TEXT rather than an assertion with   *
 * nothing to corrupt. Also counts WebGLRenderer/OrbitControls/        *
 * fetch/Image/addEventListener/.then( so the "no async, no listeners" *
 * findings in CHARACTERIZATION.md are checked, not just written down. *
 * ------------------------------------------------------------------ */
const RESOURCE_PATTERNS = {
  geometries: /new\s+(?:THREE\.)?(?:BufferGeometry|PlaneGeometry|BoxGeometry|SphereGeometry|CylinderGeometry|ConeGeometry|CircleGeometry|RingGeometry|TorusGeometry|TubeGeometry|LatheGeometry|ShapeGeometry|ExtrudeGeometry|InstancedBufferGeometry|EdgesGeometry|WireframeGeometry)\s*\(/g,
  materials: /new\s+(?:THREE\.)?(?:ShaderMaterial|RawShaderMaterial|MeshBasicMaterial|MeshStandardMaterial|MeshPhysicalMaterial|MeshLambertMaterial|MeshPhongMaterial|MeshNormalMaterial|MeshDepthMaterial|MeshMatcapMaterial|MeshToonMaterial|LineBasicMaterial|LineDashedMaterial|PointsMaterial|SpriteMaterial)\s*\(/g,
  textures: /new\s+(?:THREE\.)?(?:CanvasTexture|DataTexture|Texture|TextureLoader|VideoTexture|DepthTexture|CompressedTexture|FramebufferTexture)\s*\(/g,
  renderTargets: /new\s+(?:THREE\.)?(?:WebGLRenderTarget|WebGLMultipleRenderTargets|WebGLArrayRenderTarget)\s*\(/g,
  webglRenderer: /new\s+(?:THREE\.)?WebGLRenderer\s*\(/g,
  orbitControls: /new\s+OrbitControls\s*\(/g,
  fetchCalls: /\bfetch\s*\(/g,
  imageConstructs: /new\s+Image\s*\(/g,
  addEventListener: /\baddEventListener\s*\(/g,
  thenCalls: /\.then\s*\(/g,
  disposeCalls: /\.dispose\s*\(/g,
};
function census(source) {
  const out = {};
  for (const [name, re] of Object.entries(RESOURCE_PATTERNS)) {
    const m = source.match(re);
    out[name] = m ? m.length : 0;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Global DOM/browser doubles, installed once. appendChild/removeChild *
 * mirror real Node/parentNode semantics closely enough for dispose()  *
 * removal to be provably correct: parentNode is set on attach and     *
 * cleared on detach, and a node can only be attached to one parent.   *
 * ------------------------------------------------------------------ */
function makeDomElement(tagName) {
  return { tagName, parentNode: null };
}
function makeContainer(tagName = 'DIV') {
  const node = makeDomElement(tagName);
  node.children = [];
  node.appendChild = (child) => {
    if (child.parentNode && child.parentNode !== node) {
      const i = child.parentNode.children.indexOf(child);
      if (i >= 0) child.parentNode.children.splice(i, 1);
    }
    child.parentNode = node;
    if (!node.children.includes(child)) node.children.push(child);
  };
  node.removeChild = (child) => {
    const i = node.children.indexOf(child);
    if (i < 0) throw new Error('removeChild: not a child of this node');
    node.children.splice(i, 1);
    child.parentNode = null;
  };
  return node;
}

globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;
globalThis.devicePixelRatio = 2;
globalThis.screen = { width: 1440, height: 900 };
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => { storage.set(k, String(v)); },
};

/* ------------------------------------------------------------------ *
 * Fake `three` and fake OrbitControls modules — written once to temp   *
 * files, imported by every rewritten copy of renderer.js. Static      *
 * `.instances` arrays give the census in section 2 something to count *
 * that is not just "did the double get constructed" but "how many     *
 * times, across which module load."                                   *
 * ------------------------------------------------------------------ */
const doubleDir = DOUBLE_ROOT;

const FAKE_THREE_SOURCE = `
export * from ${JSON.stringify(THREE_REAL_URL)};

export class WebGLRenderer {
  constructor(opts) {
    this.__opts = opts;
    this.domElement = { tagName: 'CANVAS', parentNode: null };
    this.__sizeCalls = [];
    this.__pixelRatioCalls = [];
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this.disposeCalls = 0;
    WebGLRenderer.instances.push(this);
  }
  setSize(w, h) { this.__sizeCalls.push([w, h]); }
  setPixelRatio(r) { this.__pixelRatioCalls.push(r); }
  dispose() { this.disposeCalls++; }
}
WebGLRenderer.instances = [];
`;
const FAKE_THREE_FILE = join(doubleDir, 'fake-three.mjs');
writeFileSync(FAKE_THREE_FILE, FAKE_THREE_SOURCE);
const FAKE_THREE_URL = pathToFileURL(FAKE_THREE_FILE).href;

const FAKE_CONTROLS_SOURCE = `
import { Vector3 } from ${JSON.stringify(FAKE_THREE_URL)};

export class OrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new Vector3(0, 0, 0);
    this.enableDamping = false;
    this.dampingFactor = 0;
    this.minDistance = 0;
    this.maxDistance = 0;
    this.maxPolarAngle = 0;
    this.updateCalls = 0;
    this.disposeCalls = 0;
    OrbitControls.instances.push(this);
  }
  update() { this.updateCalls++; }
  dispose() { this.disposeCalls++; }
}
OrbitControls.instances = [];
`;
const FAKE_CONTROLS_FILE = join(doubleDir, 'fake-orbit-controls.mjs');
writeFileSync(FAKE_CONTROLS_FILE, FAKE_CONTROLS_SOURCE);
const FAKE_CONTROLS_URL = pathToFileURL(FAKE_CONTROLS_FILE).href;

/* ------------------------------------------------------------------ *
 * Module loader — write a source string into a temp dir OUTSIDE the   *
 * repo, with only the three unresolvable-in-Node specifiers rewritten,*
 * and import it.                                                      *
 * ------------------------------------------------------------------ */
let loadSeq = 0;
async function loadRenderer(source, label) {
  for (const marker of ["from 'three'", "from 'three/addons/controls/OrbitControls.js'", "from './performance.js'"]) {
    if (!source.includes(marker)) {
      throw new Error(`${label}: expected to find ${marker} in source — rewrite target missing`);
    }
  }
  const rewritten = source
    .replace("from 'three'", `from '${FAKE_THREE_URL}'`)
    .replace("from 'three/addons/controls/OrbitControls.js'", `from '${FAKE_CONTROLS_URL}'`)
    .replace("from './performance.js'", `from '${PERFORMANCE_URL}'`);
  const dir = mkdtempSync(join(RENDERER_ROOT, 'load-'));
  const file = join(dir, `renderer-${loadSeq++}-${label.replace(/[^a-z0-9]+/gi, '_')}.mjs`);
  writeFileSync(file, rewritten);
  return import(pathToFileURL(file).href);
}

async function loadTextures(source, label) {
  // portrait-textures.js has zero imports (confirmed by CHARACTERIZATION.md
  // §2) — no rewrite needed, matching C04's own precedent for this file.
  const dir = mkdtempSync(join(TEXTURES_ROOT, 'load-'));
  const file = join(dir, `textures-${loadSeq++}-${label.replace(/[^a-z0-9]+/gi, '_')}.mjs`);
  writeFileSync(file, source);
  return import(pathToFileURL(file).href);
}

/* ==================================================================== *
 * SECTION 1 — renderer.js construction-value identity (HEAD vs         *
 * current), across four parameter/global combinations.                 *
 * ==================================================================== */
function snapRenderer(result, rendererDouble, controlsDouble) {
  return {
    hasDispose: typeof result.dispose === 'function',
    cameraPos: [result.camera.position.x, result.camera.position.y, result.camera.position.z],
    cameraFov: result.camera.fov,
    cameraAspect: result.camera.aspect,
    cameraNear: result.camera.near,
    cameraFar: result.camera.far,
    bgColorHex: result.scene.background.getHex(),
    fogNear: result.scene.fog.near,
    fogFar: result.scene.fog.far,
    fogColorHex: result.scene.fog.color.getHex(),
    FOG_NEAR: result.FOG_NEAR,
    FOG_FAR: result.FOG_FAR,
    rendererOpts: rendererDouble.__opts,
    rendererSizeCalls: rendererDouble.__sizeCalls,
    rendererPixelRatioCalls: rendererDouble.__pixelRatioCalls,
    toneMapping: rendererDouble.toneMapping,
    toneMappingExposure: rendererDouble.toneMappingExposure,
    controlsTarget: [controlsDouble.target.x, controlsDouble.target.y, controlsDouble.target.z],
    enableDamping: controlsDouble.enableDamping,
    dampingFactor: controlsDouble.dampingFactor,
    minDistance: controlsDouble.minDistance,
    maxDistance: controlsDouble.maxDistance,
    maxPolarAngle: controlsDouble.maxPolarAngle,
    updateCalls: controlsDouble.updateCalls,
    pixelRatioPolicyInitial: result.pixelRatioPolicy.initial,
    attachedToContainer: rendererDouble.domElement.parentNode !== null,
  };
}

const SCENARIOS = [
  { name: 'desktop, no pin, no container (document.body fallback)',
    args: { panX: 0, container: null, camY: 2.05, camZ: 8.8, targetY: 2.5, camAzimuth: 0, bg: 0x000000, fov: 38, pinPr: null } },
  { name: 'panned + azimuth + explicit container + pinned pr',
    args: { panX: -1.4, container: 'CONTAINER', camY: 1.6, camZ: 6.2, targetY: 1.1, camAzimuth: 27, bg: 0x1a0e05, fov: 44, pinPr: 1.5 } },
  { name: 'negative azimuth, different bg/fov',
    args: { panX: 0.6, container: null, camY: 3.0, camZ: 12.0, targetY: 3.4, camAzimuth: -18, bg: 0x0a0a12, fov: 32, pinPr: null } },
  { name: 'pr pinned at the ceiling (3)',
    args: { panX: 0, container: 'CONTAINER', camY: 2.05, camZ: 8.8, targetY: 2.5, camAzimuth: 0, bg: 0x000000, fov: 38, pinPr: 3 } },
];

// Both HEAD and CURRENT are loaded from the SAME fake-three/fake-controls
// module URLs (constructed above), so `result.renderer`/`result.controls`
// ARE the double instances directly — no separate lookup needed anywhere
// below.

const CURRENT_RENDERER_SOURCE = readFileSync(RENDERER_PATH, 'utf8');
const HEAD_RENDERER_SOURCE = execFileSync('git', ['show', `${RUN_START_SHA}:organism/renderer.js`], { cwd: REPO_ROOT, encoding: 'utf8' });

L.check('pre-flight: HEAD renderer.js and current renderer.js are NOT byte-identical (this order has edited the file)',
  HEAD_RENDERER_SOURCE !== CURRENT_RENDERER_SOURCE);
L.check('pre-flight: HEAD renderer.js has no dispose machinery (confirms it is the true pre-change baseline)',
  !HEAD_RENDERER_SOURCE.includes('function dispose()'));

const headMod = await loadRenderer(HEAD_RENDERER_SOURCE, 'head');
const currentMod = await loadRenderer(CURRENT_RENDERER_SOURCE, 'current');

for (const scenario of SCENARIOS) {
  const container = scenario.args.container === 'CONTAINER' ? makeContainer() : null;
  globalThis.document = { body: makeContainer('BODY') };
  const headResult = headMod.createRendererSetup({ ...scenario.args, container });
  const headSnap = snapRenderer(headResult, headResult.renderer, headResult.controls);

  const container2 = scenario.args.container === 'CONTAINER' ? makeContainer() : null;
  globalThis.document = { body: makeContainer('BODY') };
  const currentResult = currentMod.createRendererSetup({ ...scenario.args, container: container2 });
  const currentSnap = snapRenderer(currentResult, currentResult.renderer, currentResult.controls);

  L.check(`1.${scenario.name}: HEAD has no dispose(), current does`,
    headSnap.hasDispose === false && currentSnap.hasDispose === true);

  // Compare everything EXCEPT hasDispose (an intentional, expected
  // difference — the whole point of this order) — every other observable
  // construction value must be byte-identical.
  const { hasDispose: _h1, ...headRest } = headSnap;
  const { hasDispose: _h2, ...currentRest } = currentSnap;
  L.check(`1.${scenario.name}: every other construction value is byte-identical (HEAD vs current)`,
    JSON.stringify(headRest) === JSON.stringify(currentRest),
    { head: headRest, current: currentRest });
}

// Positive control on the identity comparator itself: perturb HEAD's
// FOG_NEAR constant by 1e-4 and confirm the SAME comparator now reports a
// mismatch against the real HEAD trace.
{
  const perturbed = mutate(HEAD_RENDERER_SOURCE, 'identity-positive-control', [
    ['const FOG_NEAR = 7.0, FOG_FAR = 20;', 'const FOG_NEAR = 7.0001, FOG_FAR = 20;'],
  ]);
  const perturbedMod = await loadRenderer(perturbed, 'head-perturbed');
  const container = null;
  globalThis.document = { body: makeContainer('BODY') };
  const realHead = headMod.createRendererSetup({ ...SCENARIOS[0].args, container });
  globalThis.document = { body: makeContainer('BODY') };
  const perturbedHead = perturbedMod.createRendererSetup({ ...SCENARIOS[0].args, container: null });
  L.check('1 (positive control): a 1e-4-perturbed FOG_NEAR is NOT byte-identical to the real HEAD trace — the comparator can fail',
    realHead.FOG_NEAR !== perturbedHead.FOG_NEAR);
}

/* ==================================================================== *
 * SECTION 2 — resource-class census (renderer.js).                     *
 * ==================================================================== */
{
  const c = census(CURRENT_RENDERER_SOURCE);
  L.same('2a: renderer.js constructs zero geometries', c.geometries, 0);
  L.same('2b: renderer.js constructs zero materials', c.materials, 0);
  L.same('2c: renderer.js constructs zero textures', c.textures, 0);
  L.same('2d: renderer.js constructs zero render targets', c.renderTargets, 0);
  L.same('2e: renderer.js constructs exactly one WebGLRenderer per call site', c.webglRenderer, 1);
  L.same('2f: renderer.js constructs exactly one OrbitControls per call site', c.orbitControls, 1);
  L.same('2g: renderer.js has zero async call sites (fetch/Image/.then)', c.fetchCalls + c.imageConstructs + c.thenCalls, 0);
  L.same('2h: renderer.js has zero addEventListener call sites of its own', c.addEventListener, 0);
  L.same('2i: renderer.js now has exactly two .dispose( call sites (controls.dispose(); renderer.dispose();)', c.disposeCalls, 2);
  const cHead = census(HEAD_RENDERER_SOURCE);
  L.same('2j: HEAD had zero .dispose( call sites — confirms "nothing disposed anything before this order"', cHead.disposeCalls, 0);
}

/* ==================================================================== *
 * SECTION 3 — disposal parity, idempotence, two-instance isolation.    *
 * ==================================================================== */
{
  globalThis.document = { body: makeContainer('BODY') };
  const container = makeContainer();
  const result = currentMod.createRendererSetup({ ...SCENARIOS[1].args, container });
  L.check('3a: before dispose(), the renderer double has not been disposed', result.renderer.disposeCalls === 0);
  L.check('3b: before dispose(), the controls double has not been disposed', result.controls.disposeCalls === 0);
  L.check('3c: before dispose(), the canvas is attached to the container this call was given',
    result.renderer.domElement.parentNode === container);

  result.dispose();
  L.same('3d: dispose() disposes the controls double exactly once', result.controls.disposeCalls, 1);
  L.same('3e: dispose() disposes the renderer double exactly once', result.renderer.disposeCalls, 1);
  L.check('3f: dispose() detaches the canvas from its container', result.renderer.domElement.parentNode === null);
  L.check('3g: the container no longer lists the canvas as a child', !container.children.includes(result.renderer.domElement));

  let threw = false;
  try { result.dispose(); } catch { threw = true; }
  L.check('3h: calling dispose() a second time does not throw', !threw);
  L.same('3i: two dispose() calls dispose the controls double exactly once (not twice)', result.controls.disposeCalls, 1);
  L.same('3j: two dispose() calls dispose the renderer double exactly once (not twice)', result.renderer.disposeCalls, 1);

  // document.body fallback path + dispose() removal from document.body.
  globalThis.document = { body: makeContainer('BODY') };
  const resultBody = currentMod.createRendererSetup({ ...SCENARIOS[0].args, container: null });
  L.check('3k: with no container, the canvas is attached to document.body', resultBody.renderer.domElement.parentNode === globalThis.document.body);
  resultBody.dispose();
  L.check('3l: dispose() detaches the canvas from document.body too', resultBody.renderer.domElement.parentNode === null);
}

// Two-instance isolation.
{
  globalThis.document = { body: makeContainer('BODY') };
  const containerA = makeContainer();
  const a = currentMod.createRendererSetup({ ...SCENARIOS[1].args, container: containerA });
  const containerB = makeContainer();
  const b = currentMod.createRendererSetup({ ...SCENARIOS[1].args, container: containerB });

  L.check('3m: two instances get distinct scene objects', a.scene !== b.scene);
  L.check('3n: two instances get distinct camera objects', a.camera !== b.camera);
  L.check('3o: two instances get distinct renderer doubles', a.renderer !== b.renderer);
  L.check('3p: two instances get distinct controls doubles', a.controls !== b.controls);

  a.dispose();
  L.same('3q: disposing instance A leaves instance B\'s renderer undisposed', b.renderer.disposeCalls, 0);
  L.same('3r: disposing instance A leaves instance B\'s controls undisposed', b.controls.disposeCalls, 0);
  L.check('3s: disposing instance A leaves B\'s canvas still attached to B\'s container', b.renderer.domElement.parentNode === containerB);
  L.check('3t: instance A\'s own container no longer holds A\'s canvas', !containerA.children.includes(a.renderer.domElement));
}

/* ==================================================================== *
 * SECTION 4 — portrait-textures.js.                                    *
 * ==================================================================== */
function fakeTexture(name) {
  let disposeCalls = 0;
  return { name, dispose() { disposeCalls++; }, get disposeCalls() { return disposeCalls; } };
}
function makeUniforms(uMapAValue = null) {
  return {
    uMapA: { value: uMapAValue }, uMapP: { value: null }, uMapA2: { value: null },
    uMapP2: { value: null }, uMapH: { value: null }, uMapH2: { value: null },
  };
}

const CURRENT_TEXTURES_SOURCE = readFileSync(TEXTURES_PATH, 'utf8');
const HEAD_TEXTURES_SOURCE = execFileSync('git', ['show', `${RUN_START_SHA}:journey/chapters/owned/portrait-textures.js`], { cwd: REPO_ROOT, encoding: 'utf8' });

L.check('pre-flight: HEAD portrait-textures.js and current are NOT byte-identical (this order has edited the file)',
  HEAD_TEXTURES_SOURCE !== CURRENT_TEXTURES_SOURCE);
L.check('pre-flight: HEAD portrait-textures.js has no dispose() method (confirms it is the true pre-change baseline)',
  !HEAD_TEXTURES_SOURCE.includes('dispose() {'));
L.check('pre-flight: portrait-textures.js\'s pinned dispose-site line ("texture.dispose();") is still present verbatim — C03a M16 floor',
  CURRENT_TEXTURES_SOURCE.split('\n').some((l) => l.trim() === 'texture.dispose();'));

const headTexMod = await loadTextures(HEAD_TEXTURES_SOURCE, 'head');
const currentTexMod = await loadTextures(CURRENT_TEXTURES_SOURCE, 'current');

// 4a-4c — behavior identity for the three core policy outcomes (mirrors
// C04's own T1/T2/T3), HEAD vs current, proving the guard added in this
// order changes nothing for an owner nobody has disposed.
{
  for (const [label, mod] of [['HEAD', headTexMod], ['current', currentTexMod]]) {
    const protectedTex = fakeTexture('protected');
    const ownerP = mod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [protectedTex] });
    ownerP.retire(protectedTex);
    L.same(`4a.${label}: a permanent texture survives retire()`, protectedTex.disposeCalls, 0);

    const wiredTex = fakeTexture('wired');
    const ownerW = mod.createPortraitTextureOwner({ uniforms: makeUniforms(wiredTex), permanent: [] });
    ownerW.retire(wiredTex);
    L.same(`4b.${label}: a wired texture survives retire()`, wiredTex.disposeCalls, 0);

    const freeTex = fakeTexture('free');
    const ownerF = mod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [] });
    ownerF.retire(freeTex);
    L.same(`4c.${label}: an unwired, unprotected texture is disposed exactly once`, freeTex.disposeCalls, 1);
  }
}

// 4d — T5 parity check: on an owner that is NEVER dispose()-d, double-retire
// still disposes twice, unchanged by this order — the exact pinned
// behavior tools/test-portrait-textures.mjs T5 (C04's, forbidden to touch)
// asserts. Verified directly here so a future edit that broke it would be
// caught by THIS file too, not just discovered by running C04's suite.
{
  const tex = fakeTexture('double-retire');
  const owner = currentTexMod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [] });
  owner.retire(tex);
  owner.retire(tex);
  L.same('4d: on an owner never dispose()-d, retire() twice still disposes twice (parity with C04\'s pinned T5 — unchanged)', tex.disposeCalls, 2);
}

// 4e-4h — the NEW capability: owner.dispose() exists, is idempotent, and
// permanently seals retire() — including for a texture that would
// otherwise have been freely eligible.
{
  L.check('4e: HEAD\'s createPortraitTextureOwner has no dispose() method', typeof headTexMod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [] }).dispose === 'undefined');
  const owner = currentTexMod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [] });
  L.check('4f: current\'s createPortraitTextureOwner has a dispose() method', typeof owner.dispose === 'function');
  let threw = false;
  try { owner.dispose(); owner.dispose(); } catch { threw = true; }
  L.check('4g: calling owner.dispose() twice does not throw (idempotent)', !threw);

  const tex = fakeTexture('post-owner-dispose');
  owner.retire(tex);
  L.same('4h: retire() after owner.dispose() is a permanent no-op — the texture is NOT disposed', tex.disposeCalls, 0);
}

// 4i-4k — in-flight-async-continuation-after-dispose, the shape of the
// hazard C04 found unguarded in portraits.tickSwap(): BUILD THE FAILING
// CASE FIRST. A hand-built "owner" reproducing pre-guard retire() (no
// `disposed` check at all — i.e. exactly HEAD's logic) demonstrates a late
// promise continuation CAN still dispose a texture after the surrounding
// system considers itself torn down; the real current owner, driven
// through the identical scenario, is then shown NOT to.
async function lateContinuationScenario(ownerFactory) {
  const wiredTex = fakeTexture('was-wired-when-async-started');
  const uniforms = makeUniforms(wiredTex);
  const owner = ownerFactory({ uniforms, permanent: [] });
  // The async work "starts" while wiredTex is still current...
  const pendingRetire = new Promise((resolve) => {
    setTimeout(() => { owner.retire(wiredTex); resolve(); }, 0);
  });
  // ...then, before it resolves, the surrounding system tears everything
  // down: the uniform slot is cleared (so isWired() would no longer
  // protect it) AND, if the owner supports it, the owner itself is
  // disposed — exactly the moment C04's tickSwap scenario reaches
  // `promoteSwap()` after `portraits.dispose()` has already run.
  uniforms.uMapA.value = null;
  if (typeof owner.dispose === 'function') owner.dispose();
  await pendingRetire;
  return wiredTex.disposeCalls;
}
{
  // Failing case first: a hand-built pre-guard owner (HEAD's exact
  // retire() logic, no disposed check, no dispose() method at all) DOES
  // let the late continuation dispose the texture, because by the time it
  // runs the uniform has already been cleared and there is no owner-level
  // seal to stop it.
  function preGuardOwnerFactory({ uniforms, permanent }) {
    const protectedTextures = new Set(permanent);
    const isWired = (t) => t === uniforms.uMapA.value || t === uniforms.uMapP.value
      || t === uniforms.uMapA2.value || t === uniforms.uMapP2.value
      || t === uniforms.uMapH.value || t === uniforms.uMapH2.value;
    return { retire(t) { if (!t || protectedTextures.has(t) || isWired(t)) return; t.dispose(); } };
  }
  const preGuardDisposals = await lateContinuationScenario(preGuardOwnerFactory);
  L.same('4i (failing case, built first): a pre-guard owner (HEAD\'s logic) DOES let a late async continuation dispose a texture after teardown',
    preGuardDisposals, 1);

  const currentDisposals = await lateContinuationScenario(currentTexMod.createPortraitTextureOwner);
  L.same('4j: the current owner\'s dispose() seal stops the SAME late continuation from disposing the texture',
    currentDisposals, 0);

  const headDisposals = await lateContinuationScenario(headTexMod.createPortraitTextureOwner);
  L.same('4k: HEAD (no dispose() method at all) behaves like the failing case — confirms 4j is the fix, not a pre-existing property',
    headDisposals, 1);
}

/* ==================================================================== *
 * SECTION 5 — portrait-deal.js: resource/async census.                 *
 * ==================================================================== */
{
  const source = readFileSync(DEALER_PATH, 'utf8');
  const c = census(source);
  const total = c.geometries + c.materials + c.textures + c.renderTargets + c.webglRenderer
    + c.orbitControls + c.fetchCalls + c.imageConstructs + c.addEventListener + c.thenCalls + c.disposeCalls;
  L.same('5a: portrait-deal.js has zero resource-construction, listener, or async call sites of any tracked kind',
    total, 0, { byPattern: c });

  /* 5b — PIN-C8. THIS WAS `source === pinned`, A WHOLE-FILE BYTE PIN.
   *
   * The claim is kept; the instrument was wrong. Measured over nine edits —
   * three provably harmless (a comment, a local rename, a trailing space) and
   * six genuine resource defects (a leaked listener, an unretired
   * CanvasTexture, a ShaderMaterial, a stray `.then`, a setInterval, a `new
   * THREE.Points`) — the byte pin returned RED nine times out of nine. A
   * constant verdict carries no information about which of the nine happened.
   * That is C8's defect: red identically whether the subject is broken or
   * repaired, the shape that let E4 block a user-visible fix.
   *
   * NOT the same as the two pre-flight rows above, which assert the INVERSE
   * ("HEAD and current are NOT byte-identical — this order edited the file").
   * Those are instrument-validity and stay untouched. The asymmetry is in how
   * they age: "NOT identical" stays true under every later edit; "IS
   * identical" goes red at the first one, forever.
   *
   * WHAT IT IS NOW — the module-edge manifest against the same pinned commit
   * (the S12/S13 move test-render-baseline.mjs made yesterday). Not a
   * restatement of 5a: 5a counts CALL SITES against a fixed pattern table and
   * is blind to any class the table omits, while this says the file cannot
   * REACH one — portrait-deal.js does not import THREE at all. On the same
   * nine edits the census misses two, `setInterval` and `new THREE.Points`;
   * this row catches the second. `setInterval` is caught by neither and is
   * recorded rather than fixed by widening the pattern table, which the
   * renderer and textures sections share and whose numbers would move.
   *
   * The pinned side is an immutable commit, not this run. */
  const PIN = RUN_START_SHA;
  const pinned = execFileSync('git', ['show', `${PIN}:journey/chapters/owned/portrait-deal.js`], { cwd: REPO_ROOT, encoding: 'utf8' });
  const moduleEdges = (text) => ({
    imports: text.split('\n').map((l) => (l.match(/^import\s+.*?\s+from\s+'([^']+)';/) || [])[1]).filter(Boolean),
    exports: text.split('\n').map((l) => (l.match(/^export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/) || [])[1]).filter(Boolean),
  });
  const pinnedEdges = moduleEdges(pinned);
  // D45/D94 — a manifest read back empty is not evidence of agreement. The
  // pinned side is the one that can rot silently (a `git show` that returned
  // something unparseable still returns a string), so its arity is pinned to
  // literals before either side is compared.
  if (pinnedEdges.imports.length !== 3 || pinnedEdges.exports.length !== 1) {
    throw new Error(`5b: the pinned commit's module edges no longer parse — got ${JSON.stringify(pinnedEdges)}`);
  }
  L.same('5b: portrait-deal.js\'s module edges are the pinned starting commit\'s — same three imports, same one export. It still cannot reach anything that owns a GPU resource (it does not import THREE), so there is nothing to compose ownership around',
    moduleEdges(source), pinnedEdges);

  /* 5-CTL — the direction --prove-failure cannot test. The sweep below shows
   * 5b CAN go red (mutant h). Nothing in a sweep shows that it STAYS GREEN
   * through an edit it is supposed to permit, and a converted pin that reds
   * on any edit at all is the byte pin it replaced under a new name. So a
   * permitted edit is performed here, in memory, and both halves asserted:
   * the edges hold, and `source === pinned` — the retired predicate — does
   * not. Both sides are run-produced, which is what makes this a control and
   * not a pin; 5b's own expectation comes from the commit. */
  const CTL_FROM = '/** Owns one session\'s random salt';
  if (!source.includes(CTL_FROM)) throw new Error(`5-CTL: anchor miss on ${JSON.stringify(CTL_FROM)}`);
  const refactored = source.replace(CTL_FROM, '/** PIN-C8 control edit. Owns one session\'s random salt');
  L.same('5-CTL: the conversion is real, not a relabelling — a comment-only edit leaves the module edges standing, and the byte-identity predicate that used to be 5b would have gone red on it',
    [JSON.stringify(moduleEdges(refactored)) === JSON.stringify(pinnedEdges), refactored === pinned],
    [true, false]);
}

/* ================================================================== *
 * NON-TAUTOLOGY DISCIPLINE (D44) — a hardcoded boolean standing in  *
 *    for a real comparison, scanned mechanically across this file      *
 *    itself. Such a site is invisible to the --prove-failure sweep     *
 *    above: a comparison-site harness only sees comparisons, and a     *
 *    bare literal predicate is not one.                                *
 *                                                                      *
 *    D47/F-2 + D46: this scan DID run, but the suite it lives in was   *
 *    an orphan no gate invoked, and its match loop had never been      *
 *    entered anywhere in the tree. "0 hits" from a scan that has never *
 *    matched anything cannot distinguish a clean file from a stale     *
 *    anchor or a renamed helper. It now carries the two controls D46   *
 *    requires, plus P16-style synthetic positives:                     *
 *                                                                      *
 *      PC-1  POSITIVE CONTROL — a census of the assertion call sites    *
 *            the scan's own pattern can see, pinned to a literal.      *
 *      PC-2  FILES-READ pin — the number of INPUTS, not of matches.    *
 *      PC-3  synthetic positives modelled on P16 in                    *
 *            tools/test-render-perturbation.mjs:275 — MANUFACTURE the  *
 *            shapes the scan exists to catch and feed them to the same *
 *            scanner, so "0 hits" is only reported by a scanner just   *
 *            shown to return non-zero on what it is looking for.       *
 *                                                                      *
 *    The pattern is wider than D44's original, which QA-02 replayed    *
 *    verbatim and measured blind to: an escaped quote in the label, a  *
 *    bare unqualified call, a numeric predicate, a negated-numeric     *
 *    predicate, and the identity comparison of D44's addendum.         *
 *                                                                      *
 *    NOTE when editing: keep the bare token naming an assertion call   *
 *    out of STRING literals here. Comments are stripped before         *
 *    scanning, strings are not, so a string carrying it would inflate  *
 *    the PC-1 census with a site that is not a call.                    *
 * ================================================================== */

// Block comments become an equal count of newlines (line numbers survive);
// line comments are blanked. A comment that merely NAMES the pattern —
// including this one — is not a hit; fixtures PC3-24/PC3-25 prove it both ways.
// QA-04 / S-3: this was two regexes with no string, template or
// regex-literal state — the D67 defect. A `/*` inside a string constant
// opened a phantom comment and blanked live code, and because "0 hits" is
// the passing answer for this scan (D46) the loss was silent. Now the one
// shared implementation in tools/strip-comments.mjs, which is both
// length-preserving and line-preserving, so the line arithmetic below is
// unchanged and the offsets are now valid as well.
/* QA-06: the D44 scan kit — SCAN_CALL, the three patterns, the 31-row
   synthetic-positive table and scanLiteralPredicateText() — is now the ONE
   shared implementation in tools/self-controls.mjs. Four byte-identical
   copies shipped; this file carried one of them. The PC-1 literal below is
   per-subject data and stays here. */

/* QA-06: the 31-row synthetic-positive table and its `SK` interpolation
   guard are now the ONE shared table in tools/self-controls.mjs. The rows
   still interpolate the assertion token so no row is itself counted as a
   call site, and PC-3a/PC-3b/PC-3c still pin 31/31/19 here. */


// D44 requires this scan in every suite that ships a --prove-failure mode.
// This one shipped the mode and no scan at all — a fourth instance of F-1,
// beyond the three QA-02 measured. Added here, in the GATED path.
// PIN-C8: 28 -> 27. This census counts `check(` sites only, which is the shape
// D44 polices — a boolean expression that can collapse to a literal. The old
// 5b was one of them (`L.check('…', source === pinned)`); its replacement and
// the new control are both `L.same(actual, expected)`, which reports got and
// expected on failure and has no predicate position for a literal to hide in.
// The census falling by one here is that move, not lost coverage.
const RENDERER_RESOURCES_SCAN_SITES = 27;
{
  const problems = auditLiteralPredicates('tools/test-renderer-resources.mjs', RENDERER_RESOURCES_SCAN_SITES, SELF_PATH);
  L.check('D44/D46: the literal-predicate scan and both of its controls hold', problems.length === 0, problems);
}

SENT.reach('ledger');
const mainFailures = L.report();

/* ==================================================================== *
 * --prove-failure — targeted mutants of the CURRENT sources, each        *
 * re-run through the ONE check that should catch it. Exits 1 if any      *
 * check turns out to be a tautology (passes even against the mutant it   *
 * was built for).                                                        *
 * ==================================================================== */
if (process.argv.includes('--prove-failure')) {
  console.log('\n--prove-failure — targeted mutants, each fed to the one check built to catch it');
  let bad = 0, proved = 0;
  const prove = (id, what, goodValue, mutantValue) => {
    const g = JSON.stringify(goodValue);
    const m = JSON.stringify(mutantValue);
    if (m !== g) {
      proved++;
      console.log(`  PROVED     ${id}  ${what}`);
      console.log(`             good: ${g}   mutant: ${m}  -> the real check (asserting === good) would FAIL here`);
    } else {
      bad++;
      console.log(`  TAUTOLOGY  ${id}  ${what} — the mutant produced the SAME value as good code. This check cannot fail.`);
    }
  };

  // renderer.js mutants
  async function disposeControlsSkipped(source) {
    const mutated = mutate(source, 'renderer-no-controls-dispose', [
      ['    controls.dispose();\n    renderer.dispose();', '    renderer.dispose();'],
    ]);
    const mod = await loadRenderer(mutated, 'mutant-no-controls-dispose');
    globalThis.document = { body: makeContainer('BODY') };
    const r = mod.createRendererSetup({ ...SCENARIOS[1].args, container: makeContainer() });
    r.dispose();
    return r.controls.disposeCalls;
  }
  prove('a', 'dispose() must dispose the controls double (3d)', 1, await disposeControlsSkipped(CURRENT_RENDERER_SOURCE));

  async function disposeRendererSkipped(source) {
    const mutated = mutate(source, 'renderer-no-renderer-dispose', [
      ['    controls.dispose();\n    renderer.dispose();', '    controls.dispose();'],
    ]);
    const mod = await loadRenderer(mutated, 'mutant-no-renderer-dispose');
    globalThis.document = { body: makeContainer('BODY') };
    const r = mod.createRendererSetup({ ...SCENARIOS[1].args, container: makeContainer() });
    r.dispose();
    return r.renderer.disposeCalls;
  }
  prove('b', 'dispose() must dispose the renderer double (3e)', 1, await disposeRendererSkipped(CURRENT_RENDERER_SOURCE));

  async function domRemovalSkipped(source) {
    const mutated = mutate(source, 'renderer-no-dom-removal', [
      [
        '    if (renderer.domElement && renderer.domElement.parentNode) {\n      renderer.domElement.parentNode.removeChild(renderer.domElement);\n    }\n',
        '',
      ],
    ]);
    const mod = await loadRenderer(mutated, 'mutant-no-dom-removal');
    globalThis.document = { body: makeContainer('BODY') };
    const container = makeContainer();
    const r = mod.createRendererSetup({ ...SCENARIOS[1].args, container });
    r.dispose();
    return r.renderer.domElement.parentNode !== null;
  }
  prove('c', 'dispose() must detach the canvas from its container (3f)', false, await domRemovalSkipped(CURRENT_RENDERER_SOURCE));

  async function idempotenceGuardDropped(source) {
    const mutated = mutate(source, 'renderer-no-idempotence-guard', [
      ['  let disposed = false;\n  function dispose() {\n    if (disposed) return;\n    disposed = true;\n',
        '  function dispose() {\n'],
    ]);
    const mod = await loadRenderer(mutated, 'mutant-no-idempotence-guard');
    globalThis.document = { body: makeContainer('BODY') };
    const r = mod.createRendererSetup({ ...SCENARIOS[1].args, container: makeContainer() });
    r.dispose();
    r.dispose();
    return r.controls.disposeCalls;
  }
  prove('d', 'a second dispose() must not dispose the controls double again (3i)', 1, await idempotenceGuardDropped(CURRENT_RENDERER_SOURCE));

  // portrait-textures.js mutants
  function textureOwnerNoDisposedGuard(source) {
    return mutate(source, 'textures-no-disposed-guard-in-retire', [
      ['    retire(texture) {\n      if (disposed) return;\n      if (!texture', '    retire(texture) {\n      if (!texture'],
    ]);
  }
  {
    const mutated = textureOwnerNoDisposedGuard(CURRENT_TEXTURES_SOURCE);
    const mod = await loadTextures(mutated, 'mutant-no-disposed-guard');
    const disposals = await lateContinuationScenario(mod.createPortraitTextureOwner);
    prove('e', 'retire() after owner.dispose() must not dispose a texture (4h/4j)', 0, disposals);
  }

  function textureOwnerDisposeDoesNothing(source) {
    return mutate(source, 'textures-dispose-noop', [
      ['    dispose() {\n      disposed = true;\n    },', '    dispose() {\n    },'],
    ]);
  }
  {
    const mutated = textureOwnerDisposeDoesNothing(CURRENT_TEXTURES_SOURCE);
    const mod = await loadTextures(mutated, 'mutant-dispose-noop');
    const owner = mod.createPortraitTextureOwner({ uniforms: makeUniforms(), permanent: [] });
    owner.dispose();
    const tex = fakeTexture('after-noop-dispose');
    owner.retire(tex);
    prove('f', 'retire() must be sealed by dispose() (4h)', 0, tex.disposeCalls);
  }

  // portrait-deal.js census sensitivity: prove the "zero resource sites"
  // census (5a) is a real comparison — good (unmutated) source sums to 0,
  // and injecting one tracked call site must move the SAME sum off zero.
  {
    const dealerSource = readFileSync(DEALER_PATH, 'utf8');
    const sumOf = (c) => c.geometries + c.materials + c.textures + c.renderTargets + c.webglRenderer
      + c.orbitControls + c.fetchCalls + c.imageConstructs + c.addEventListener + c.thenCalls + c.disposeCalls;
    const goodTotal = sumOf(census(dealerSource));
    const mutated = mutate(dealerSource, 'dealer-inject-listener', [
      ["export function createPortraitDealer({ nodes, contributors, nodeCount }) {\n",
        "export function createPortraitDealer({ nodes, contributors, nodeCount }) {\n  if (typeof addEventListener === 'function') addEventListener('x', () => {});\n"],
    ]);
    const mutantTotal = sumOf(census(mutated));
    prove('g', 'the portrait-deal.js census must move off zero when a tracked call site is injected (5a)', goodTotal, mutantTotal);

    /* PIN-C8 — 5b had NO mutant while it was a byte pin, which is easy to
     * overlook precisely because a byte pin is trivially failable: any edit
     * at all reds it, so "can it fail" was never the question. Now that the
     * row makes a specific claim, the mutant has to move that specific axis.
     * This is the class 5a is blind to: a resource that arrives through an
     * IMPORT rather than through a call site the pattern table names. */
    const edgesOf = (text) => ({
      imports: text.split('\n').map((l) => (l.match(/^import\s+.*?\s+from\s+'([^']+)';/) || [])[1]).filter(Boolean),
      exports: text.split('\n').map((l) => (l.match(/^export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/) || [])[1]).filter(Boolean),
    });
    const reaching = mutate(dealerSource, 'dealer-import-three', [
      ["import * as H from '../../lib/helpers.js';\n",
        "import * as THREE from '../../../vendor/three/three.module.js';\nimport * as H from '../../lib/helpers.js';\n"],
    ]);
    prove('h', 'importing THREE into portrait-deal.js must move its module-edge manifest (5b) — the reach the call-site census cannot see',
      edgesOf(dealerSource), edgesOf(reaching));
  }

  SENT.reach('prove');
  console.log(`\n--prove-failure: ${proved} proved failable, ${bad} tautology(ies)`);
  if (bad > 0) process.exit(1);
  process.exit(0);
}

process.exit(mainFailures > 0 ? 1 : 0);
